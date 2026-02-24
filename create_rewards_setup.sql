-- ==========================================
-- FINAL SETUP & FIX FOR REWARDS & DECISIONS
-- ==========================================

-- 1. Setup khen_thuong Table
-- Ensure table exists (optional, depends on initial setup)
-- ALTER TABLE public.khen_thuong ENABLE ROW LEVEL SECURITY;

-- 2. Idempotent Policies for khen_thuong
DROP POLICY IF EXISTS "Enable read access for all users" ON public.khen_thuong;
CREATE POLICY "Enable read access for all users" ON public.khen_thuong
AS PERMISSIVE FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON public.khen_thuong;
CREATE POLICY "Enable insert for all users" ON public.khen_thuong
AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON public.khen_thuong;
CREATE POLICY "Enable update for all users" ON public.khen_thuong
AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON public.khen_thuong;
CREATE POLICY "Enable delete for all users" ON public.khen_thuong
AS PERMISSIVE FOR DELETE TO public USING (true);

-- 3. Storage Setup (Bucket ktkl)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ktkl', 'ktkl', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Access to ktkl files for all" ON storage.objects;
CREATE POLICY "Access to ktkl files for all" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'ktkl');

DROP POLICY IF EXISTS "Allow upload to ktkl for all" ON storage.objects;
CREATE POLICY "Allow upload to ktkl for all" ON storage.objects
FOR INSERT TO public WITH CHECK (bucket_id = 'ktkl');

DROP POLICY IF EXISTS "Allow update in ktkl for all" ON storage.objects;
CREATE POLICY "Allow update in ktkl for all" ON storage.objects
FOR UPDATE TO public USING (bucket_id = 'ktkl');

DROP POLICY IF EXISTS "Allow delete in ktkl for all" ON storage.objects;
CREATE POLICY "Allow delete in ktkl for all" ON storage.objects
FOR DELETE TO public USING (bucket_id = 'ktkl');

-- 4. Setup and Fix for quyet_dinh Table
-- a. Create table if not exists with correct types
CREATE TABLE IF NOT EXISTS public.quyet_dinh (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    loai_qd text, -- Using text to avoid enum character encoding issues
    so_quyet_dinh text NOT NULL,
    ngay_ky date NOT NULL,
    cap_quyet_dinh text NOT NULL,
    noi_dung text NOT NULL,
    file_quyet_dinh text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT quyet_dinh_pkey PRIMARY KEY (id)
);

-- b. Ensure column is TEXT (in case it was created as enum before)
ALTER TABLE public.quyet_dinh ALTER COLUMN loai_qd TYPE text;

-- c. Enable RLS
ALTER TABLE public.quyet_dinh ENABLE ROW LEVEL SECURITY;

-- d. Idempotent Policies for quyet_dinh (TO public covers anon and authenticated)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.quyet_dinh;
CREATE POLICY "Enable read access for all users" ON public.quyet_dinh
AS PERMISSIVE FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON public.quyet_dinh;
CREATE POLICY "Enable insert for all users" ON public.quyet_dinh
AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON public.quyet_dinh;
CREATE POLICY "Enable update for all users" ON public.quyet_dinh
AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON public.quyet_dinh;
CREATE POLICY "Enable delete for all users" ON public.quyet_dinh
AS PERMISSIVE FOR DELETE TO public USING (true);
