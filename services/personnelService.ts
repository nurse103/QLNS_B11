import { supabase } from './supabaseClient';
import { compressImage } from '../utils/imageCompress';

export interface Employee {
    id: number;
    ho_va_ten: string;
    ngay_sinh: string | null;
    gioi_tinh: string | null;
    cap_bac: string | null;
    chuc_vu: string | null;
    trinh_do: string | null;
    cccd: string | null;
    ngay_cap_cccd: string | null;
    cmqd: string | null;
    ngay_cap_cmqd: string | null;
    que_quan: string | null;
    noi_o_hien_nay: string | null;
    dien_thoai: string | null;
    thang_nam_tuyen_dung: string | null;
    thang_nam_nhap_ngu: string | null;
    ngay_ve_khoa_cong_tac: string | null;
    trang_thai: string | null;
    thang_nam_roi_khoa: string | null;
    trang_thai_roi_khoa: string | null;
    noi_den: string | null;
    avatar: string | null;
    ghi_chu: string | null;
    dien_quan_ly: string | null;
    ngay_vao_dang: string | null;
    ngay_chinh_thuc: string | null;
    so_the_dang: string | null;

    ngay_cap_the_dang: string | null;
    noi_cap_the_dang: string | null;
    anh_the_dang: string | null;
    doi_tuong: string | null;
    danh_hieu: string | null;
    don_vi_id: number | null;
    chung_chi_hanh_nghe: string | null;
    created_by?: string | null;
    created_at?: string;
}

// ... existing interfaces ...


// Date formatting helper
const formatDateVN = (dateStr: string | undefined | null) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
};

/**
 * Sanitizes data by converting empty strings to null.
 * This prevents "invalid input syntax for type date" errors in Postgres.
 */
export const sanitizeData = <T>(data: T): T => {
    if (data === null || data === undefined) return data;

    if (typeof data === 'string') {
        return (data.trim() === '' ? null : data) as unknown as T;
    }

    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item)) as unknown as T;
    }

    if (typeof data === 'object') {
        const sanitized = { ...data } as any;
        for (const key in sanitized) {
            sanitized[key] = sanitizeData(sanitized[key]);
        }
        return sanitized as T;
    }

    return data;
};

export const bulkUpdatePersonnel = async (ids: number[], updates: Partial<Employee>) => {
    const sanitizedUpdates = sanitizeData(updates);
    const { error } = await supabase
        .from('dsnv')
        .update(sanitizedUpdates)
        .in('id', ids);

    console.log("Bulk Update Payload:", { ids, updates });

    if (error) {
        console.error('Error bulk updating personnel:', error);
        throw error;
    }
};

export const updatePersonnelStatus = async (ids: number[], status: string) => {
    return bulkUpdatePersonnel(ids, { trang_thai: status });
};

export interface Family {
    id?: number;
    dsnv_id?: number;
    moi_quan_he: string;
    ho_va_ten: string;
    nam_sinh?: number;
    nghe_nghiep?: string;
    /** Quê quán (mục 29 Phiếu đảng viên) */
    que_quan?: string;
    /** Nơi ở hiện nay, trong hoặc ngoài nước (mục 29 Phiếu đảng viên) */
    noi_o_hien_nay?: string;
    /** Chức danh, chức vụ, đơn vị công tác (mục 29 Phiếu đảng viên) */
    chuc_vu_don_vi?: string;
    so_dien_thoai?: string;
    ghi_chu?: string;
    created_by?: string | null;
}

export interface WorkHistory {
    id?: number;
    dsnv_id?: number;
    tu_thang_nam?: string;
    den_thang_nam?: string;
    don_vi_cong_tac?: string;
    cap_bac?: string;
    chuc_vu?: string;
    ghi_chu?: string;
    created_by?: string | null;
}

export interface Training {
    id?: number;
    dsnv_id?: number;
    tu_thang_nam?: string;
    den_thang_nam?: string;
    ten_co_so_dao_tao?: string;
    nganh_dao_tao?: string;
    trinh_do_dao_tao?: string;
    hinh_thuc_dao_tao?: string;
    anh_van_bang?: string;
    xep_loai_tot_nghiep?: string;
    cap_bac?: string;
    chuc_vu?: string;
    ghi_chu?: string;
    created_by?: string | null;
}

export const getAllWorkHistory = async () => {
    const { data, error } = await supabase
        .from('qua_trinh_cong_tac')
        .select(`
            *,
            dsnv:dsnv_id (
                ho_va_ten,
                cmqd
            )
        `)
        .order('tu_thang_nam', { ascending: false });

    if (error) {
        console.error('Error fetching all work history:', error);
        throw error;
    }
    return data;
};

export interface Salary {
    id?: number;
    dsnv_id?: number;
    thang_nam_nhan?: string;
    loai_nhom?: string;
    bac?: string;
    he_so?: number;
    phan_tram_tnvk?: number;
    hsbl?: number;
    quan_ham?: string;
    hinh_thuc?: string;
    file_qd?: string;
    ghi_chu?: string;
    created_by?: string | null;
}

export const getPersonnel = async () => {
    const { data, error } = await supabase
        .from('dsnv')
        .select('*')
        .order('ho_va_ten', { ascending: true });

    if (error) {
        console.error('Error fetching personnel:', error);
        throw error;
    }


    return data as Employee[];
};

export const getAllTraining = async () => {
    const { data, error } = await supabase
        .from('qua_trinh_dao_tao')
        .select(`
            *,
            dsnv:dsnv_id (
                ho_va_ten,
                cmqd
            )
        `)
        .order('tu_thang_nam', { ascending: false });

    if (error) {
        console.error('Error fetching all training:', error);
        throw error;
    }
    return data as Training[];
};

export const bulkCreatePersonnel = async (employees: Omit<Employee, 'id' | 'created_at'>[]) => {
    const sanitizedEmployees = sanitizeData(employees);
    const { data, error } = await supabase
        .from('dsnv')
        .insert(sanitizedEmployees)
        .select();

    if (error) {
        console.error('Error bulk creating personnel:', error);
        throw error;
    }

    return data as Employee[];
};

export const createPersonnel = async (
    employee: Omit<Employee, 'id' | 'created_at'>,
    family: Family[] = [],
    workHistory: WorkHistory[] = [],
    training: Training[] = [],
    salary: Salary[] = []
) => {
    const sanitizedEmployee = sanitizeData(employee);
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const createdBy = user?.id ?? null;
    // 1. Insert Employee
    const { data: empData, error: empError } = await supabase
        .from('dsnv')
        .insert({ ...sanitizedEmployee, created_by: createdBy })
        .select()
        .single();

    if (empError) {
        console.error('Error creating personnel:', empError);
        throw empError;
    }

    const employeeId = empData.id;

    // 2. Insert Related Data
    const insertRelated = async (table: string, items: any[]) => {
        if (items.length === 0) return;
        const sanitizedItems = sanitizeData(items);
        const records = sanitizedItems.map(item => ({ ...item, dsnv_id: employeeId, created_by: createdBy }));
        const { error } = await supabase.from(table).insert(records);
        if (error) {
            console.error(`Error inserting into ${table}:`, error);
            // If it's the family table, alert or throw to make it visible
            if (table === 'gia_dinh') console.error("FAMILY_INSERT_ERROR", error);
        }
    };

    await Promise.all([
        insertRelated('gia_dinh', family),
        insertRelated('qua_trinh_cong_tac', workHistory),
        insertRelated('qua_trinh_dao_tao', training),
        insertRelated('len_luong', salary)
    ]);

    return empData as Employee;
};

export const getEmployeeDetails = async (id: number) => {
    const { data: employee, error: empError } = await supabase
        .from('dsnv')
        .select('*')
        .eq('id', id)
        .single();

    if (empError) throw empError;

    const { data: family } = await supabase.from('gia_dinh').select('*').eq('dsnv_id', id);
    const { data: workHistory } = await supabase.from('qua_trinh_cong_tac').select('*').eq('dsnv_id', id);
    const { data: training } = await supabase.from('qua_trinh_dao_tao').select('*').eq('dsnv_id', id);
    const { data: salary } = await supabase.from('len_luong').select('*').eq('dsnv_id', id);

    return {
        employee: employee as Employee,
        family: family as Family[],
        workHistory: workHistory as WorkHistory[],
        training: training as Training[],
        salary: salary as Salary[]
    };
};

export const updatePersonnel = async (
    id: number,
    employee: Partial<Employee>,
    family: Family[],
    workHistory: WorkHistory[],
    training: Training[],
    salary: Salary[]
) => {
    const sanitizedEmployee = sanitizeData(employee);
    // 1. Update Employee
    const { error: empError } = await supabase
        .from('dsnv')
        .update(sanitizedEmployee)
        .eq('id', id);

    if (empError) throw empError;

    // 2. Sync Related Data (Delete All & Re-insert Strategy for Simplicity, or generic upsert)
    // For simplicity in this iteration, we will delete all old related records and insert new ones
    // This isn't the most efficient for large datasets but works for this scale.
    // A better approach is to handle IDs, but let's stick to safe replacement for "lists".
    // HOWEVER, if we acturally simply delete, we lose IDs. 
    // Let's rely on the inputs having IDs for updates, or no IDs for inserts.
    // Actually, simplest strategy for "lists" like this is often Delete All + Insert All for the related tables 
    // IF the user doesn't care about preserving specific IDs of child records.

    // Đồng bộ bảng con theo thứ tự CHÈN TRƯỚC - XOÁ SAU.
    //
    // Trước đây hàm này xoá hết rồi mới chèn, và lỗi chèn chỉ được console.error.
    // Hậu quả: chỉ cần payload có một cột không tồn tại là toàn bộ dữ liệu cũ
    // bị xoá sạch trong im lặng còn người dùng vẫn thấy báo "Cập nhật thành công".
    // Nay chèn thành công mới xoá dòng cũ, và mọi lỗi đều được ném ra ngoài.
    const syncTable = async (table: string, items: any[]) => {
        const { data: existing, error: readError } = await supabase
            .from(table)
            .select('id')
            .eq('dsnv_id', id);
        if (readError) throw readError;
        const oldIds = (existing ?? []).map((row: any) => row.id);

        if (items.length > 0) {
            const sanitizedItems = sanitizeData(items);
            const records = sanitizedItems.map(item => {
                // Bỏ id và created_at để DB tự sinh
                const { id: _id, created_at: _createdAt, ...rest } = item;
                return { ...rest, dsnv_id: id };
            });
            const { error: insError } = await supabase.from(table).insert(records);
            if (insError) {
                console.error(`Error inserting into ${table}:`, insError);
                throw insError;
            }
        }

        if (oldIds.length > 0) {
            const { error: delError } = await supabase.from(table).delete().in('id', oldIds);
            if (delError) {
                console.error(`Error deleting from ${table}:`, delError);
                throw delError;
            }
        }
    };

    await Promise.all([
        syncTable('gia_dinh', family),
        syncTable('qua_trinh_cong_tac', workHistory),
        syncTable('qua_trinh_dao_tao', training),
        syncTable('len_luong', salary)
    ]);
};

export const deletePersonnel = async (id: number) => {
    const { error } = await supabase
        .from('dsnv')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting personnel:', error);
        throw error;
    }
};

/**
 * Tải ảnh chân dung (ảnh 3x4 dùng cho phiếu đảng viên) lên storage.
 * Dùng chung bucket 'the_dang' đã có sẵn, để trong thư mục con 'avatar/'
 * nên không cần tạo bucket hay policy mới.
 */
export const uploadAvatarImage = async (file: File) => {
    // Ảnh 3x4 in trên phiếu chỉ cần ~600x800px, nén trước cho nhẹ file .docx
    const compressed = await compressImage(file, { maxWidth: 600, maxHeight: 800, quality: 0.82 });
    const fileExt = compressed.name.split('.').pop() || 'jpg';
    const filePath = `avatar/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('the_dang')
        .upload(filePath, compressed, { contentType: compressed.type, upsert: false });

    if (uploadError) {
        console.error('Lỗi tải ảnh chân dung:', uploadError);
        throw uploadError;
    }

    const { data } = supabase.storage.from('the_dang').getPublicUrl(filePath);
    return data.publicUrl;
};

export const uploadPartyCardImage = async (file: File) => {
    // Ảnh thẻ Đảng chỉ để xem lại, 1200px là quá đủ
    const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
    const fileExt = compressed.name.split('.').pop() || 'jpg';
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('the_dang')
        .upload(filePath, compressed, { contentType: compressed.type, upsert: false });

    if (uploadError) {
        console.error('Lỗi tải ảnh thẻ Đảng:', uploadError);
        throw uploadError;
    }

    const { data } = supabase.storage.from('the_dang').getPublicUrl(filePath);
    return data.publicUrl;
};

/**
 * Synchronizes the latest rank and position from history tables to the main dsnv table.
 * @param dsnv_id The ID of the employee to sync.
 */
export const syncPersonnelCurrentStatus = async (dsnv_id: number) => {
    try {
        console.log(`Syncing current status for employee ID: ${dsnv_id}`);
        
        // Use Work History as the primary source for current rank and position
        const { data: workHistory, error: workError } = await supabase
            .from('qua_trinh_cong_tac')
            .select('cap_bac, chuc_vu, tu_thang_nam')
            .eq('dsnv_id', dsnv_id)
            .order('tu_thang_nam', { ascending: false })
            .limit(1);

        if (workError) throw workError;

        const latestWork = workHistory?.[0];

        if (latestWork) {
            const { error: updateError } = await supabase
                .from('dsnv')
                .update({
                    cap_bac: latestWork.cap_bac,
                    chuc_vu: latestWork.chuc_vu
                })
                .eq('id', dsnv_id);

            if (updateError) throw updateError;
            console.log(`Successfully synced for ${dsnv_id}: ${latestWork.cap_bac} - ${latestWork.chuc_vu}`);
        }
    } catch (err) {
        console.error(`Failed to sync status for ${dsnv_id}:`, err);
    }
};
