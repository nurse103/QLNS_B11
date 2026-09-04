-- =============================================================
-- Bổ sung cột chuc_vu_dang cho bảng qua_trinh_cong_tac.
--
-- Lưu chức vụ đảng theo từng đợt công tác (Bí thư chi bộ, Phó BTCB,
-- Chi uỷ viên, Đảng viên...). Khi xuất Word lý lịch đảng viên, bảng
-- "21) TÓM TẮT QUÁ TRÌNH HOẠT ĐỘNG VÀ CÔNG TÁC" sẽ lấy chức vụ đảng
-- theo đúng giai đoạn từ tháng/năm - đến tháng/năm.
--
-- Nếu một giai đoạn bỏ trống cột này mà là đảng viên (giai đoạn kết
-- thúc từ ngày vào Đảng trở đi) thì khi xuất sẽ mặc định "Đảng viên".
-- =============================================================

ALTER TABLE qua_trinh_cong_tac
ADD COLUMN IF NOT EXISTS chuc_vu_dang TEXT;

COMMENT ON COLUMN qua_trinh_cong_tac.chuc_vu_dang IS 'Chức vụ đảng theo từng giai đoạn công tác (Bí thư chi bộ, Phó BTCB, Chi uỷ viên, Đảng viên...)';
