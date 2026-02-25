-- 1. Create the bucket
insert into storage.buckets (id, name, public)
values ('cchn', 'cchn', true)
on conflict (id) do nothing;

-- 2. Enable RLS on the bucket (usually enabled by default on storage.objects)

-- 3. Create policies to allow public access and authenticated uploads
-- Allow public to read files
create policy "cchn_public_access"
on storage.objects for select
using ( bucket_id = 'cchn' );

-- Allow authenticated users to upload files
create policy "cchn_authenticated_upload"
on storage.objects for insert
with check (
  bucket_id = 'cchn' 
  and auth.role() = 'authenticated'
);

-- Allow authenticated users to update/delete their own files
create policy "cchn_authenticated_update"
on storage.objects for update
using ( bucket_id = 'cchn' and auth.role() = 'authenticated' );

create policy "cchn_authenticated_delete"
on storage.objects for delete
using ( bucket_id = 'cchn' and auth.role() = 'authenticated' );
