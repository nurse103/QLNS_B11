-- =============================================================
-- Tách cột que_quan_noi_o của bảng gia_dinh thành 2 cột riêng:
--   que_quan       - Quê quán
--   noi_o_hien_nay - Nơi ở hiện nay (trong, ngoài nước)
--
-- Mục 29 Phiếu đảng viên sẽ ghép lại theo đúng thứ tự của mẫu:
--   "Quê quán, nơi ở hiện nay, nghề nghiệp, chức danh/chức vụ/đơn vị công tác"
--
-- Script CHẠY LẠI ĐƯỢC NHIỀU LẦN: bước di trú nằm trong khối DO có kiểm tra
-- cột cũ còn tồn tại hay không, nên chạy lần thứ hai sẽ không báo lỗi
-- "column que_quan_noi_o does not exist".
-- =============================================================

-- 1. Thêm 2 cột mới
ALTER TABLE gia_dinh
ADD COLUMN IF NOT EXISTS que_quan TEXT,
ADD COLUMN IF NOT EXISTS noi_o_hien_nay TEXT;

-- 2. Di trú dữ liệu đang gõ chung trong một ô, rồi xoá cột gộp cũ.
--    Dữ liệu cũ theo dạng "Quê quán; Nơi ở hiện nay".
--    Không có dấu ';' thì coi toàn bộ là quê quán.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'gia_dinh'
          AND column_name = 'que_quan_noi_o'
    ) THEN
        UPDATE gia_dinh
        SET que_quan       = NULLIF(BTRIM(SPLIT_PART(que_quan_noi_o, ';', 1)), ''),
            noi_o_hien_nay = NULLIF(BTRIM(SPLIT_PART(que_quan_noi_o, ';', 2)), '')
        WHERE que_quan_noi_o IS NOT NULL
          AND que_quan IS NULL
          AND noi_o_hien_nay IS NULL;

        ALTER TABLE gia_dinh DROP COLUMN que_quan_noi_o;

        RAISE NOTICE 'Đã tách que_quan_noi_o thành que_quan + noi_o_hien_nay và xoá cột cũ.';
    ELSE
        RAISE NOTICE 'Cột que_quan_noi_o không còn - script đã chạy trước đó, bỏ qua.';
    END IF;
END $$;

COMMENT ON COLUMN gia_dinh.que_quan IS 'Quê quán của người thân - mục 29 Phiếu đảng viên';
COMMENT ON COLUMN gia_dinh.noi_o_hien_nay IS 'Nơi ở hiện nay (trong, ngoài nước) - mục 29 Phiếu đảng viên';

-- Kiểm tra kết quả:
-- SELECT id, ho_va_ten, que_quan, noi_o_hien_nay, chuc_vu_don_vi FROM gia_dinh ORDER BY id;
