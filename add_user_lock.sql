-- Khóa / mở tài khoản người dùng
-- Chạy file này trong Supabase SQL Editor. Chạy lại nhiều lần cũng không sao.

-- 1. Cột trạng thái khóa
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- 2. Đăng nhập: tài khoản bị khóa không đăng nhập được.
--    Sai mật khẩu → không trả về dòng nào (như cũ).
--    Đúng mật khẩu nhưng bị khóa → báo lỗi ACCOUNT_LOCKED để giao diện hiện thông báo.
CREATE OR REPLACE FUNCTION login_user(p_username TEXT, p_password TEXT)
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM users
        WHERE LOWER(username) = LOWER(p_username) AND password = p_password AND is_locked
    ) THEN
        RAISE EXCEPTION 'ACCOUNT_LOCKED';
    END IF;

    RETURN QUERY
    SELECT *
    FROM users
    WHERE LOWER(username) = LOWER(p_username) AND password = p_password AND NOT is_locked;
END;
$$;

-- 3. Kiểm tra phiên đang đăng nhập: trả về true nếu tài khoản đã bị khóa (hoặc đã bị xóa)
CREATE OR REPLACE FUNCTION is_user_locked(p_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COALESCE((SELECT is_locked FROM users WHERE id = p_id), true);
$$;

NOTIFY pgrst, 'reload schema';
