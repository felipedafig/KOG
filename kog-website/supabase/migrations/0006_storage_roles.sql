-- Phase 3: storage policies get the same staff/client role split as the tables.
-- anon_insert_quote_photos stays unchanged (public quote form uploads).

drop policy staff_all_quote_photos on storage.objects;
create policy staff_all_quote_photos on storage.objects for all to authenticated
  using (bucket_id = 'quote-photos' and (select public.is_staff()))
  with check (bucket_id = 'quote-photos' and (select public.is_staff()));

drop policy staff_all_maintenance_photos on storage.objects;
create policy staff_all_maintenance_photos on storage.objects for all to authenticated
  using (bucket_id = 'maintenance-photos' and (select public.is_staff()))
  with check (bucket_id = 'maintenance-photos' and (select public.is_staff()));

-- Clients may read (and therefore sign URLs for) exactly the maintenance photos
-- that belong to entries on their linked properties.
create policy client_read_maintenance_photos on storage.objects for select to authenticated
  using (bucket_id = 'maintenance-photos' and public.client_can_read_photo(name));
