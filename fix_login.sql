-- 1. Create a Secure Login Function (Bypasses RLS Recursion)
CREATE OR REPLACE FUNCTION login_user(p_username TEXT, p_password TEXT)
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with creator permissions, bypassing RLS
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM users
    WHERE username = p_username AND password = p_password;
END;
$$;

-- 2. Ensure System Settings Table Exists (Fixing 404)
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Fix Settings Permissions
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting policies on settings
DROP POLICY IF EXISTS "Enable all access for all users" ON system_settings;
DROP POLICY IF EXISTS "Public Read Access" ON system_settings;
DROP POLICY IF EXISTS "Public Write Access" ON system_settings;

-- Create simple Allow-All policy for settings (for development)
CREATE POLICY "Public Access Settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);

-- 4. Initial Background (Safe Insert)
INSERT INTO system_settings (key, value) 
VALUES ('login_background', 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')
ON CONFLICT (key) DO NOTHING;

-- 5. Create Storage Bucket (Safe Insert)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage Policies
DROP POLICY IF EXISTS "Enable all access for backgrounds bucket" ON storage.objects;
CREATE POLICY "Enable all access for backgrounds bucket" ON storage.objects 
FOR ALL USING (bucket_id = 'backgrounds') 
WITH CHECK (bucket_id = 'backgrounds');
