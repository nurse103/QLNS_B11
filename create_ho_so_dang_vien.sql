-- =============================================================
-- PHIẾU ĐẢNG VIÊN (mẫu 2-HSĐV) - hồ sơ mở rộng cho Đảng viên
-- Quan hệ 1-1 với bảng dsnv. Các trường đã có trong dsnv
-- (họ tên, giới tính, ngày sinh, quê quán, nơi ở, CCCD, ngày vào Đảng,
--  ngày chính thức, số thẻ đảng, ngày nhập ngũ, ngày tuyển dụng...)
-- KHÔNG lặp lại ở đây mà lấy trực tiếp từ dsnv.
-- =============================================================

CREATE TABLE IF NOT EXISTS ho_so_dang_vien (
    id              BIGSERIAL PRIMARY KEY,
    dsnv_id         BIGINT NOT NULL UNIQUE REFERENCES dsnv(id) ON DELETE CASCADE,

    -- Phần đầu phiếu
    dang_bo_tinh            TEXT,
    dang_bo_xa              TEXT,
    dang_bo_chi_bo_co_so    TEXT,
    dang_bo_bo_phan         TEXT,
    chi_bo                  TEXT,
    so_ly_lich              TEXT,   -- 10 ô

    -- 03) Tên gọi khác, 05) Nơi đăng ký khai sinh, 07) Nơi tạm trú
    ten_goi_khac            TEXT,
    noi_dang_ky_khai_sinh   TEXT,
    noi_tam_tru             TEXT,

    -- 08) 09) 10) 11)
    dan_toc                 TEXT,
    ton_giao                TEXT,
    thanh_phan_gia_dinh     TEXT,
    nghe_nghiep_hien_nay    TEXT,

    -- 12) Ngày vào Đảng
    chi_bo_ket_nap              TEXT,
    nguoi_gioi_thieu_1          TEXT,
    chuc_vu_nguoi_gt_1          TEXT,
    nguoi_gioi_thieu_2          TEXT,
    chuc_vu_nguoi_gt_2          TEXT,
    ngay_qd_ket_nap             DATE,
    chi_bo_chinh_thuc           TEXT,

    -- 13) 14) 15) 16)
    co_quan_tuyen_dung      TEXT,
    ngay_vao_doan           DATE,
    to_chuc_xa_hoi_khac     TEXT,
    ngay_xuat_ngu           DATE,

    -- 17) Trình độ hiện nay
    giao_duc_pho_thong      TEXT,
    chuyen_mon_nghiep_vu    TEXT,
    hoc_vi                  TEXT,
    hoc_ham                 TEXT,
    ly_luan_chinh_tri       TEXT,
    ngoai_ngu               TEXT,
    tin_hoc                 TEXT,

    -- 18)
    tinh_trang_suc_khoe     TEXT,
    thuong_binh_loai        TEXT,
    gia_dinh_liet_sy        TEXT,
    gia_dinh_co_cong        TEXT,

    -- 20)
    ngay_mien_cong_tac_shd  DATE,

    -- 23) 24) 25) 26)
    khen_thuong             TEXT,
    huy_hieu_dang           TEXT[] DEFAULT '{}',   -- 30,40,45,50,55,60,65,70,75,80,85,90
    danh_hieu_duoc_phong    TEXT,
    ky_luat                 TEXT,

    -- 27) Đặc điểm lịch sử bản thân
    ls_khai_tru_thoi_gian       TEXT,
    ls_khai_tru_chi_bo          TEXT,
    ngay_vao_dang_lan_2         DATE,
    chi_bo_ket_nap_lan_2        TEXT,
    nguoi_gioi_thieu_1_lan_2    TEXT,
    chuc_vu_nguoi_gt_1_lan_2    TEXT,
    nguoi_gioi_thieu_2_lan_2    TEXT,
    chuc_vu_nguoi_gt_2_lan_2    TEXT,
    ngay_chinh_thuc_lan_2       DATE,
    chi_bo_chinh_thuc_lan_2     TEXT,
    ngay_khoi_phuc_dang_tich    DATE,
    chi_bo_khoi_phuc            TEXT,
    bi_xu_ly_phap_luat          TEXT,
    lam_viec_che_do_cu          TEXT,

    -- 28) Quan hệ với nước ngoài
    da_di_nuoc_ngoai            TEXT,
    quan_he_to_chuc_nuoc_ngoai  TEXT,
    nguoi_than_nuoc_ngoai       TEXT,

    -- 30) Hoàn cảnh kinh tế
    tong_thu_nhap           TEXT,
    binh_quan_dau_nguoi     TEXT,
    nha_duoc_cap_loai       TEXT,
    nha_duoc_cap_dien_tich  TEXT,
    nha_tu_mua_loai         TEXT,
    nha_tu_mua_dien_tich    TEXT,
    dat_duoc_cap            TEXT,
    dat_tu_mua              TEXT,
    hoat_dong_kinh_te       TEXT,
    dien_tich_trang_trai    TEXT,
    so_lao_dong_thue        TEXT,
    tai_san_gia_tri         TEXT,
    gia_tri_tai_san         TEXT,

    -- Ký phiếu
    noi_khai                TEXT,
    ngay_khai               DATE,

    created_by  UUID,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ho_so_dang_vien_dsnv ON ho_so_dang_vien(dsnv_id);

-- Tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION set_ho_so_dang_vien_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ho_so_dang_vien_updated_at ON ho_so_dang_vien;
CREATE TRIGGER trg_ho_so_dang_vien_updated_at
BEFORE UPDATE ON ho_so_dang_vien
FOR EACH ROW EXECUTE FUNCTION set_ho_so_dang_vien_updated_at();

-- RLS: theo cùng mô hình các bảng khác trong app (anon key + phân quyền ở tầng app)
ALTER TABLE ho_so_dang_vien ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ho_so_dang_vien_all" ON ho_so_dang_vien;
CREATE POLICY "ho_so_dang_vien_all" ON ho_so_dang_vien
FOR ALL USING (true) WITH CHECK (true);

-- Quyền cho module quản lý đảng viên (bảng permissions dùng UNIQUE(role, module))
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
VALUES
    ('admin',   'party-management', TRUE, TRUE,  TRUE,  TRUE),
    ('manager', 'party-management', TRUE, TRUE,  TRUE,  FALSE),
    ('user',    'party-management', TRUE, FALSE, FALSE, FALSE)
ON CONFLICT (role, module) DO NOTHING;
