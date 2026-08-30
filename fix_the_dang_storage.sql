-- =============================================================
-- Sửa lỗi "new row violates row-level security policy" khi tải ảnh
-- đảng viên (ảnh 3x4 và ảnh thẻ Đảng) lên bucket 'the_dang'.
--
-- Nguyên nhân: setup_dang_vien.sql tạo policy TO authenticated, nhưng app
-- đăng nhập bằng bảng users tự quản (RPC login_user) chứ không dùng
-- Supabase Auth, nên mọi request đều mang role 'anon' -> không policy nào
-- cấp quyền INSERT -> bị chặn.
--
-- Chỉ THÊM một policy cho phép thao tác trong đúng bucket the_dang.
-- Không xoá policy cũ: policy trên storage.objects dùng chung cho MỌI bucket,
-- xoá theo tên (vd "Public Access") có thể làm hỏng bucket khác. Các policy
-- được cộng dồn theo OR nên chỉ cần thêm là đủ.
-- =============================================================

-- 1. Bảo đảm bucket tồn tại và public (để <img src> đọc được)
INSERT INTO storage.buckets (id, name, public)
VALUES ('the_dang', 'the_dang', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Thêm policy cho bucket the_dang (chạy lại được nhiều lần)
DROP POLICY IF EXISTS "the_dang_all_access" ON storage.objects;
CREATE POLICY "the_dang_all_access" ON storage.objects
FOR ALL
USING (bucket_id = 'the_dang')
WITH CHECK (bucket_id = 'the_dang');

-- Kiểm tra:
-- SELECT policyname, cmd FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects' ORDER BY policyname;
