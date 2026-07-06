insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('quote-photos', 'quote-photos', false, 8388608, array['image/jpeg','image/png','image/webp','image/heic']),
  ('maintenance-photos', 'maintenance-photos', false, 8388608, array['image/jpeg','image/png','image/webp','image/heic']);

-- Public visitors can upload (not read/list) into quote-photos only.
create policy anon_insert_quote_photos on storage.objects
  for insert to anon
  with check (bucket_id = 'quote-photos');

-- Staff get full access to both buckets.
create policy staff_all_quote_photos on storage.objects
  for all to authenticated
  using (bucket_id = 'quote-photos')
  with check (bucket_id = 'quote-photos');

create policy staff_all_maintenance_photos on storage.objects
  for all to authenticated
  using (bucket_id = 'maintenance-photos')
  with check (bucket_id = 'maintenance-photos');
