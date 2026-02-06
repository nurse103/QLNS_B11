-- Fix Storage Bucket and Policies
-- Run this in Supabase SQL Editor

-- 1. Ensure bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable all access for backgrounds bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;

-- 3. Create a permissive policy for ALL operations (Select, Insert, Update, Delete)
CREATE POLICY "Enable all access for backgrounds bucket" ON storage.objects 
FOR ALL 
USING (bucket_id = 'backgrounds') 
WITH CHECK (bucket_id = 'backgrounds');

-- 4. Verify System Settings permissions again
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access Settings" ON system_settings;
CREATE POLICY "Public Access Settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);
