-- Phase 3: real role separation. Until now every authenticated user was treated as
-- staff; this migration introduces app_metadata.user_role ('staff' | 'client') and
-- read-only, property-scoped access for clients ("Mijn Pand" portal).

-- Role helper. coalesce(...,'') makes a missing claim evaluate to false (default deny),
-- which covers anon JWTs and any token minted before the role backfill.
create function public.is_staff()
returns boolean language sql stable set search_path = ''
as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'user_role', '') = 'staff' $$;

-- Client <-> property link. email is denormalized for the admin "Toegang" list; rows
-- are only written by staff/the edge function, so there is no drift concern.
create table property_users (
  property_id uuid not null references properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  primary key (property_id, user_id)
);
create index on property_users(user_id);

alter table property_users enable row level security;
create policy staff_all on property_users for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy client_read_own on property_users for select to authenticated
  using (user_id = (select auth.uid()));

-- Membership helper. SECURITY DEFINER is required: policies on other tables that
-- subquery property_users would otherwise evaluate under the client's own RLS on
-- property_users and see nothing.
create function public.client_has_property(pid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.property_users
                     where property_id = pid and user_id = auth.uid()) $$;

-- Replace every authenticated==staff policy with a real staff check.
-- (select public.is_staff()) evaluates once per statement, not per row.
drop policy staff_all on properties;
create policy staff_all on properties for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy staff_all on building_components;
create policy staff_all on building_components for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy staff_all on maintenance_entries;
create policy staff_all on maintenance_entries for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy staff_all on maintenance_photos;
create policy staff_all on maintenance_photos for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy staff_all on quote_requests;
create policy staff_all on quote_requests for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy staff_all on quote_photos;
create policy staff_all on quote_photos for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Client read-only access, scoped to linked properties. No INSERT/UPDATE/DELETE
-- policies for clients anywhere (RLS is default-deny), and no client policies at
-- all on quote_requests/quote_photos.
create policy client_read on properties for select to authenticated
  using (public.client_has_property(id));

create policy client_read on building_components for select to authenticated
  using (public.client_has_property(property_id));

create policy client_read on maintenance_entries for select to authenticated
  using (exists (select 1 from building_components bc
                 where bc.id = component_id
                   and public.client_has_property(bc.property_id)));

create policy client_read on maintenance_photos for select to authenticated
  using (exists (select 1 from maintenance_entries me
                 join building_components bc on bc.id = me.component_id
                 where me.id = entry_id
                   and public.client_has_property(bc.property_id)));

-- Storage-policy support: lets the storage.objects policy check photo access with
-- one index probe per object.
create index on maintenance_photos(storage_path);
create function public.client_can_read_photo(p text)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (
        select 1 from public.maintenance_photos mp
        join public.maintenance_entries me on me.id = mp.entry_id
        join public.building_components bc on bc.id = me.component_id
        join public.property_users pu on pu.property_id = bc.property_id
        where mp.storage_path = p and pu.user_id = auth.uid()) $$;
