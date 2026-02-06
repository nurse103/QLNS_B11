
-- Users Table (Existing)
-- create table public.users (
--   id uuid not null default gen_random_uuid (),
--   full_name character varying(255) not null,
--   username public.citext not null,
--   password text not null,
--   role public.user_role not null default 'user'::user_role,
--   created_at timestamp with time zone null default now(),
--   updated_at timestamp with time zone null default now(),
--   constraint users_pkey primary key (id),
--   constraint users_username_key unique (username)
-- ) TABLESPACE pg_default;

-- System Settings (for Background Image)
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON system_settings FOR ALL USING (true) WITH CHECK (true);

-- Initial Background Setting
INSERT INTO system_settings (key, value) VALUES ('login_background', 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')
ON CONFLICT (key) DO NOTHING;

-- Storage Bucket: backgrounds
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy for backgrounds
CREATE POLICY "Enable all access for backgrounds bucket" ON storage.objects 
FOR ALL USING (bucket_id = 'backgrounds') 
WITH CHECK (bucket_id = 'backgrounds');
