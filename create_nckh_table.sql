-- Create nckh table
CREATE TABLE IF NOT EXISTS public.nckh (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dsnv_id BIGINT REFERENCES public.dsnv(id) ON DELETE CASCADE,
    ten_de_tai TEXT NOT NULL,
    cap_quan_ly TEXT, -- VD: Cấp cơ sở, Cấp Bộ, Cấp Nhà nước
    ngay_bat_dau DATE,
    ngay_ket_thuc DATE,
    trang_thai TEXT CHECK (trang_thai IN ('Đang thực hiện', 'Đã nghiệm thu')),
    ket_qua TEXT,
    vai_tro TEXT, -- VD: Chủ nhiệm, Thư ký, Thành viên
    minh_chung JSONB DEFAULT '[]'::jsonb, -- Array of file URLs
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.nckh ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for NCKH files
-- Note: This usually needs to be done via Supabase Dashboard or API, 
-- but we can provide the SQL for permissions if the bucket is created.
/*
INSERT INTO storage.buckets (id, name, public) 
VALUES ('file_nckh', 'file_nckh', true)
ON CONFLICT (id) DO NOTHING;
*/

-- Policies for nckh table
CREATE POLICY "Enable read access for all users" ON public.nckh
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.nckh
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for owners and admins" ON public.nckh
    FOR UPDATE USING (
        auth.uid() = created_by OR 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Enable delete for owners and admins" ON public.nckh
    FOR DELETE USING (
        auth.uid() = created_by OR 
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Storage policies for file_nckh bucket
-- Assuming bucket 'file_nckh' is created
/*
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'file_nckh');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'file_nckh' AND auth.role() = 'authenticated');
CREATE POLICY "Owner Delete" ON storage.objects FOR DELETE USING (bucket_id = 'file_nckh' AND auth.uid() = owner);
*/
