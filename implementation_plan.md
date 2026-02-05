# Expand Employee Creation Form

## Goal Description
Expand the "Create Personnel" feature to allow inputting data for related tables: Family, Work History, Training History, and Salary/Rank Promotion.

## Proposed Changes
### Services
#### [MODIFY] [personnelService.ts](file:///d:/OneDrive/Code webapp/QLNS_B11/services/personnelService.ts)
- Define interfaces for `Family`, `WorkHistory`, `Training`, `Salary`.
- Update `createPersonnel` to accept an object containing `Employee` data and arrays of related data.
- Implement sequential insertion:
    1. Insert `dsnv` -> get `id`.
    2. Insert records into `gia_dinh` with `dsnv_id`.
    3. Insert records into `qua_trinh_cong_tac` with `dsnv_id`.
    4. Insert records into `qua_trinh_dao_tao` with `dsnv_id`.
    5. Insert records into `len_luong` with `dsnv_id`.

### UI Components
#### [MODIFY] [App.tsx](file:///d:/OneDrive/Code webapp/QLNS_B11/App.tsx)
- **State Management**: Update `formData` to include arrays for related data: `family: []`, `workHistory: []`, `training: []`, `salary: []`.
- **UI Layout**: Refactor the Modal to use **Tabs** for better organization:
    - Tab 1: **Thông tin chung** (Existing Basic & Party Info)
    - Tab 2: **Quan hệ gia đình** (List + Add Form)
    - Tab 3: **Quá trình công tác** (List + Add Form)
    - Tab 4: **Quá trình đào tạo** (List + Add Form)
    - Tab 5: **Lên lương / Quân hàm** (List + Add Form)
- **Sub-forms**: Create mini-forms within tabs to add items to the temporary lists in state.

## Verification Plan
### Manual Verification
- Open "Thêm mới" modal.
- Fill Basic Info.
- Switch to "Gia đình" tab, add 1-2 family members.
- Switch to "QT Công tác", add a history record.
- Switch to "QT Đào tạo", add a training record.
- Switch to "Lên lương", add a salary record.
- Click "Lưu".
- Verify all data is saved in Supabase (check via Supabase dashboard or by viewing details if implemented, currently check logs/alert success).
