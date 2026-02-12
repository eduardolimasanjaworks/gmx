-- Public bucket + public policies for uploads/downloads
-- Goal: allow anyone (anon) to upload photos/PDFs without fighting permissions.

-- 1) Ensure bucket exists and is public
insert into storage.buckets (id, name, public)
values ('gmx-uploads', 'gmx-uploads', true)
on conflict (id) do update
set public = true, name = excluded.name;

-- 2) Ensure RLS is enabled (usually already enabled in Supabase)
alter table storage.objects enable row level security;

-- 3) Public read
drop policy if exists "Public read gmx-uploads" on storage.objects;
create policy "Public read gmx-uploads"
on storage.objects
for select
using (bucket_id = 'gmx-uploads');

-- 4) Public insert (upload)
drop policy if exists "Public insert gmx-uploads" on storage.objects;
create policy "Public insert gmx-uploads"
on storage.objects
for insert
with check (bucket_id = 'gmx-uploads');

-- 5) Public update (optional; keeps it fully public)
drop policy if exists "Public update gmx-uploads" on storage.objects;
create policy "Public update gmx-uploads"
on storage.objects
for update
using (bucket_id = 'gmx-uploads')
with check (bucket_id = 'gmx-uploads');

-- 6) Public delete (optional; keeps it fully public)
drop policy if exists "Public delete gmx-uploads" on storage.objects;
create policy "Public delete gmx-uploads"
on storage.objects
for delete
using (bucket_id = 'gmx-uploads');

