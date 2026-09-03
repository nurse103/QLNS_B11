-- Thêm cột trình độ (học vấn/chuyên môn) vào hồ sơ nhân viên
ALTER TABLE public.dsnv
ADD COLUMN IF NOT EXISTS trinh_do TEXT;
