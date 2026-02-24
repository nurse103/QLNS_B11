import { supabase } from './supabaseClient';

export interface Employee {
    id: number;
    ho_va_ten: string;
    ngay_sinh: string | null;
    gioi_tinh: string | null;
    cap_bac: string | null;
    chuc_vu: string | null;
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
const sanitizeData = <T>(data: T): T => {
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
    so_dien_thoai?: string;
    ghi_chu?: string;
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
    van_bang_chung_chi?: string;
    xep_loai_tot_nghiep?: string;
    ghi_chu?: string;
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
    // 1. Insert Employee
    const { data: empData, error: empError } = await supabase
        .from('dsnv')
        .insert(sanitizedEmployee)
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
        const records = sanitizedItems.map(item => ({ ...item, dsnv_id: employeeId }));
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

    const syncTable = async (table: string, items: any[]) => {
        // Delete all for this employee
        const { error: delError } = await supabase.from(table).delete().eq('dsnv_id', id);
        if (delError) console.error(`Error deleting from ${table}:`, delError);

        // Insert all fresh
        if (items.length > 0) {
            const sanitizedItems = sanitizeData(items);
            const records = sanitizedItems.map(item => {
                const { id: _, ...rest } = item; // Remove ID to let DB generate new ones
                return { ...rest, dsnv_id: id };
            });
            const { error: insError } = await supabase.from(table).insert(records);
            if (insError) console.error(`Error inserting into ${table}:`, insError);
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

export const uploadPartyCardImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('the_dang')
        .upload(filePath, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage.from('the_dang').getPublicUrl(filePath);
    return data.publicUrl;
};

