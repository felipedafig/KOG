alter table properties enable row level security;
alter table building_components enable row level security;
alter table maintenance_entries enable row level security;
alter table maintenance_photos enable row level security;
alter table quote_requests enable row level security;
alter table quote_photos enable row level security;

-- Staff (any authenticated user — v1 has no public signup) get full CRUD everywhere.
create policy staff_all on properties for all to authenticated using (true) with check (true);
create policy staff_all on building_components for all to authenticated using (true) with check (true);
create policy staff_all on maintenance_entries for all to authenticated using (true) with check (true);
create policy staff_all on maintenance_photos for all to authenticated using (true) with check (true);
create policy staff_all on quote_requests for all to authenticated using (true) with check (true);
create policy staff_all on quote_photos for all to authenticated using (true) with check (true);

-- Public visitors can only insert a quote request + its photos (client generates the id,
-- so no SELECT policy for anon is needed to read the row back).
create policy anon_insert on quote_requests for insert to anon with check (true);
create policy anon_insert on quote_photos for insert to anon with check (true);
