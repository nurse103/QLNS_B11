-- ============================================================
-- FIX RLS POLICIES CHO BẢNG nckh
-- Ứng dụng không dùng Supabase Auth nên dùng anon key trực tiếp
-- => Cần cho phép anon role thực hiện mọi thao tác
-- ============================================================

-- Bước 1: Tạo bảng nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS public.nckh (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dsnv_id BIGINT REFERENCES public.dsnv(id) ON DELETE CASCADE,
    ten_de_tai TEXT NOT NULL,
    cap_quan_ly TEXT,
    ngay_bat_dau DATE,
    ngay_ket_thuc DATE,
    trang_thai TEXT CHECK (trang_thai IN ('Đang thực hiện', 'Đã nghiệm thu')),
    ket_qua TEXT,
    vai_tro TEXT,
    minh_chung JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bước 2: Bật RLS
ALTER TABLE public.nckh ENABLE ROW LEVEL SECURITY;

-- Bước 3: Xóa tất cả policies cũ (an toàn khi chạy lại)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.nckh;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.nckh;
DROP POLICY IF EXISTS "Enable update for owners and admins" ON public.nckh;
DROP POLICY IF EXISTS "Enable delete for owners and admins" ON public.nckh;
DROP POLICY IF EXISTS "nckh_select_all" ON public.nckh;
DROP POLICY IF EXISTS "nckh_insert_all" ON public.nckh;
DROP POLICY IF EXISTS "nckh_update_all" ON public.nckh;
DROP POLICY IF EXISTS "nckh_delete_all" ON public.nckh;

-- Bước 4: Tạo mới policies mở cho anon key
-- (App dùng supabase-js với anon key, không có JWT Auth)

CREATE POLICY "nckh_select_all"
    ON public.nckh FOR SELECT
    USING (true);

CREATE POLICY "nckh_insert_all"
    ON public.nckh FOR INSERT
    WITH CHECK (true);

CREATE POLICY "nckh_update_all"
    ON public.nckh FOR UPDATE
    USING (true);

CREATE POLICY "nckh_delete_all"
    ON public.nckh FOR DELETE
    USING (true);
