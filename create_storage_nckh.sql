-- 1. Khởi tạo Bucket 'file_nckh'
-- Chèn vào bảng storage.buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('file_nckh', 'file_nckh', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Thiết lập chính sách bảo mật (Storage Policies) cho bucket 'file_nckh'

-- Cho phép mọi người xem tệp (Public Read)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'file_nckh');

-- Cho phép người dùng đã đăng nhập tải lên tệp
CREATE POLICY "Authenticated Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'file_nckh' 
    AND auth.role() = 'authenticated'
);

-- Cho phép chủ sở hữu tệp xóa tệp của mình
CREATE POLICY "Owner Delete" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'file_nckh' 
    AND auth.uid() = owner
);

-- Cho phép quản trị viên xóa bất kỳ tệp nào trong bucket này
CREATE POLICY "Admin Delete Any" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'file_nckh' 
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);
