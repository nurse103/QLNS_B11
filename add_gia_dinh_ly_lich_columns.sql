-- =============================================================
-- Bổ sung 2 cột cho bảng gia_dinh để đủ dữ liệu mục 29 của
-- PHIẾU ĐẢNG VIÊN: "Quê quán, nơi ở hiện nay (trong, ngoài nước),
-- nghề nghiệp, chức danh, chức vụ, đơn vị công tác".
--
-- Bảng gia_dinh dùng chung cho cả Hồ sơ nhân sự và Phiếu đảng viên,
-- nên 2 cột này được thêm trực tiếp vào bảng gốc (không tạo bảng riêng).
-- =============================================================

ALTER TABLE gia_dinh
ADD COLUMN IF NOT EXISTS que_quan_noi_o TEXT,
ADD COLUMN IF NOT EXISTS chuc_vu_don_vi TEXT;

COMMENT ON COLUMN gia_dinh.que_quan_noi_o IS 'Quê quán, nơi ở hiện nay (trong/ngoài nước) - mục 29 Phiếu đảng viên';
COMMENT ON COLUMN gia_dinh.chuc_vu_don_vi IS 'Chức danh, chức vụ, đơn vị công tác - mục 29 Phiếu đảng viên';
