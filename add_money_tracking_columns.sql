-- Add columns for tracking money handover details
ALTER TABLE quan_ly_the_cham
ADD COLUMN IF NOT EXISTS nguoi_ban_giao_tien_muon TEXT,
ADD COLUMN IF NOT EXISTS ngay_ban_giao_tien_muon TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trang_thai_tien_muon TEXT DEFAULT 'Chưa bàn giao',
ADD COLUMN IF NOT EXISTS nguoi_ban_giao_tien_tra TEXT,
ADD COLUMN IF NOT EXISTS ngay_ban_giao_tien_tra TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trang_thai_tien_tra TEXT DEFAULT 'Chưa bàn giao';
