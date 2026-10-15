-- Storage-Buckets
--   vehicle-photos     öffentlich lesbar; Besitzer laden in ihren Ordner {user_id}/...
--   secure-documents   privat; nur verschlüsselte Dateien, nur der Server greift zu
--   inspection-photos  privat; Upload und signierte URLs nur über den Server
--   documents          privat; Verträge und Belege (PDF), nur über den Server

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('vehicle-photos', 'vehicle-photos', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('secure-documents', 'secure-documents', false, 10485760, array['application/octet-stream']),
  ('inspection-photos', 'inspection-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "vehicle-photos: eigene hochladen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vehicle-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "vehicle-photos: eigene ändern" on storage.objects
  for update to authenticated
  using (bucket_id = 'vehicle-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'vehicle-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "vehicle-photos: eigene löschen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'vehicle-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Für die privaten Buckets gibt es bewusst keine Policies für anon/authenticated:
-- ohne Policy ist jeder Client-Zugriff verboten, nur der Server (Secret Key) kommt heran.
