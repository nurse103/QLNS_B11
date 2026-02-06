-- Fix DSNV Table Schema and Permissions
-- Run this in Supabase SQL Editor

-- 1. Ensure columns exist and are TEXT type (to avoid Enum mismatches)
ALTER TABLE dsnv ADD COLUMN IF NOT EXISTS trang_thai TEXT;
ALTER TABLE dsnv ADD COLUMN IF NOT EXISTS doi_tuong TEXT;

-- 2. Ensure RLS is enabled
ALTER TABLE dsnv ENABLE ROW LEVEL SECURITY;

-- 3. Create permissive policies for DSNV (Upsert/Select/Delete)
DROP POLICY IF EXISTS "Enable all access for dsnv" ON dsnv;
CREATE POLICY "Enable all access for dsnv" ON dsnv FOR ALL USING (true) WITH CHECK (true);

-- 4. Verify Users Table (just in case)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON users;
CREATE POLICY "Public Access" ON users FOR ALL USING (true) WITH CHECK (true);
