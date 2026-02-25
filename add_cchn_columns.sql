-- Thêm cột mới vào bảng cchn
ALTER TABLE public.cchn 
ADD COLUMN noi_cap TEXT,
ADD COLUMN van_bang_chuyen_mon TEXT;
