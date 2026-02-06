-- 0. Enable Extensions
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;

-- 1. Create User Role Enum if not exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Users Table (Matching User Request)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  full_name character varying(255) NOT NULL,
  username public.citext NOT NULL,
  password text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'user'::user_role,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_username_key UNIQUE (username)
) TABLESPACE pg_default;

-- 3. Indexes (Matching User Request)
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users USING btree (username) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users USING btree (role) TABLESPACE pg_default;

-- 4. Trigger for updated_at (Matching User Request)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- CRITICAL FOR APP VISIBILITY: RLS POLICIES
-- ==========================================

-- 5. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. Create Policies
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.users;

-- Create broad policies for debugging/initial setup
CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.users FOR DELETE USING (true);

-- 7. Insert Initial Admin User (if table is empty)
INSERT INTO public.users (full_name, username, password, role)
SELECT 'Administrator', 'admin', 'admin123', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE username = 'admin');
