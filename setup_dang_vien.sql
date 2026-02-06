-- 1. Add new columns to dsnv table
ALTER TABLE dsnv 
ADD COLUMN IF NOT EXISTS noi_cap_the_dang TEXT,
ADD COLUMN IF NOT EXISTS anh_the_dang TEXT;

-- 2. Create storage bucket 'the_dang' if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('the_dang', 'the_dang', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up RLS policies for storage objects in 'the_dang'
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'the_dang' );

-- Allow authenticated users to upload/insert
CREATE POLICY "Authenticated Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'the_dang' );

-- Allow authenticated users to update
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'the_dang' );

-- Allow authenticated users to delete
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'the_dang' );
