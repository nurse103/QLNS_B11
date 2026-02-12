-- Cập nhật tất cả họ tên bệnh nhân sang chữ in hoa trong bảng quản lý thẻ chăm
UPDATE quan_ly_the_cham 
SET ho_ten_benh_nhan = UPPER(ho_ten_benh_nhan);
