-- 1. Tạo Bucket 'file_nckh' (Public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('file_nckh', 'file_nckh', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Xóa các policies cũ nếu đã tồn tại (an toàn khi chạy lại)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Any" ON storage.objects;

-- 3. Cho phép MỌI NGƯỜI xem tệp trong bucket này (Public Read)
CREATE POLICY "nckh_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'file_nckh');

-- 4. Cho phép MỌI NGƯỜI tải lên tệp 
-- (ứng dụng dùng service key, không dùng Supabase Auth thông thường)
CREATE POLICY "nckh_public_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'file_nckh');

-- 5. Cho phép MỌI NGƯỜI cập nhật tệp trong bucket này
CREATE POLICY "nckh_public_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'file_nckh');

-- 6. Cho phép MỌI NGƯỜI xóa tệp trong bucket này
CREATE POLICY "nckh_public_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'file_nckh');
