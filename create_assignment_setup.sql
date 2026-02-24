-- Create phan_cong table
CREATE TABLE IF NOT EXISTS public.phan_cong (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    ngay_thang date NOT NULL UNIQUE,
    buong_1 text,
    buong_2 text,
    buong_3 text,
    buong_4 text,
    chay_ngoai text,
    chup_phim text,
    lam_so text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT phan_cong_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.phan_cong ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.phan_cong;
CREATE POLICY "Enable read access for all users" ON public.phan_cong
FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON public.phan_cong;
CREATE POLICY "Enable insert for all users" ON public.phan_cong
FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON public.phan_cong;
CREATE POLICY "Enable update for all users" ON public.phan_cong
FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON public.phan_cong;
CREATE POLICY "Enable delete for all users" ON public.phan_cong
FOR DELETE TO public USING (true);
