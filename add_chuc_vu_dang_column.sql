-- =============================================================
-- Bổ sung cột chuc_vu_dang cho bảng ho_so_dang_vien.
--
-- Lưu chức vụ đảng đã kê khai (Bí thư chi bộ, Phó BTCB, Chi uỷ viên,
-- Đảng viên, ĐUV/BTCB...). Dùng cho phần đầu cột "Làm gì, chức vụ,
-- đơn vị công tác" của bảng "21) TÓM TẮT QUÁ TRÌNH HOẠT ĐỘNG VÀ
-- CÔNG TÁC" khi xuất Word lý lịch đảng viên.
--
-- Bỏ trống mà là đảng viên (có ngày vào Đảng hoặc số thẻ đảng) thì
-- khi xuất sẽ mặc định là "Đảng viên".
-- =============================================================

ALTER TABLE ho_so_dang_vien
ADD COLUMN IF NOT EXISTS chuc_vu_dang TEXT;

COMMENT ON COLUMN ho_so_dang_vien.chuc_vu_dang IS 'Chức vụ đảng (Bí thư chi bộ, Phó BTCB, Chi uỷ viên, Đảng viên...) - đầu cột quá trình công tác Phiếu đảng viên';
