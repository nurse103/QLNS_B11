-- Sửa quyền module "Quản lý đảng viên" (module = 'party-management')
-- Chạy trong Supabase SQL Editor.
--
-- Lý do: create_ho_so_dang_vien.sql chèn quyền bằng ON CONFLICT ... DO NOTHING,
-- nên nếu bảng permissions đã có sẵn dòng 'party-management' (từ expand_permissions.sql
-- hoặc fix_permissions_final.sql) thì các dòng đó KHÔNG được cập nhật.
-- Ngoài ra fix_permissions_final.sql chỉ bật can_add/can_edit cho manager ở danh sách
-- ('personnel', 'p-list', 'cong-van', 'patient-card-management', 'leave', 'duty', 'schedule')
-- - không có 'party-management'. Hậu quả: nút "Sửa phiếu" trong màn xem chi tiết
-- đảng viên bị ẩn vì PartyModule yêu cầu can_edit hoặc can_add.

-- Admin: toàn quyền
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
VALUES ('admin', 'party-management', TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (role, module) DO UPDATE
SET can_view = TRUE, can_add = TRUE, can_edit = TRUE, can_delete = TRUE;

-- Manager: xem, thêm, sửa - không xoá (đúng ý định ban đầu trong create_ho_so_dang_vien.sql)
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
VALUES ('manager', 'party-management', TRUE, TRUE, TRUE, FALSE)
ON CONFLICT (role, module) DO UPDATE
SET can_view = TRUE, can_add = TRUE, can_edit = TRUE, can_delete = FALSE;

-- Nhân viên: chỉ xem.
-- Nếu muốn cho nhân viên sửa phiếu đảng viên, đổi can_edit thành TRUE ở hai câu dưới.
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
VALUES ('staff', 'party-management', TRUE, FALSE, FALSE, FALSE)
ON CONFLICT (role, module) DO UPDATE
SET can_view = TRUE;

INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
VALUES ('user', 'party-management', TRUE, FALSE, FALSE, FALSE)
ON CONFLICT (role, module) DO UPDATE
SET can_view = TRUE;

-- Kiểm tra kết quả
SELECT role, module, can_view, can_add, can_edit, can_delete
FROM permissions
WHERE module = 'party-management'
ORDER BY role;
