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
    created_at?: string;
}

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
    xep_loai_tot_nghiep?: string;
    anh_van_bang?: string;
    ghi_chu?: string;
}

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
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching personnel:', error);
        throw error;
    }


    return data as Employee[];
};

export const bulkCreatePersonnel = async (employees: Omit<Employee, 'id' | 'created_at'>[]) => {
    const { data, error } = await supabase
        .from('dsnv')
        .insert(employees)
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
    // 1. Insert Employee
    const { data: empData, error: empError } = await supabase
        .from('dsnv')
        .insert(employee)
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
        const records = items.map(item => ({ ...item, dsnv_id: employeeId }));
        const { error } = await supabase.from(table).insert(records);
        if (error) console.error(`Error inserting into ${table}:`, error);
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
    // 1. Update Employee
    const { error: empError } = await supabase
        .from('dsnv')
        .update(employee)
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
        await supabase.from(table).delete().eq('dsnv_id', id);

        // Insert all fresh
        if (items.length > 0) {
            const records = items.map(item => {
                const { id: _, ...rest } = item; // Remove ID to let DB generate new ones, or keep if we want (but simpler to regenerate)
                return { ...rest, dsnv_id: id };
            });
            await supabase.from(table).insert(records);
        }
    };

    await Promise.all([
        syncTable('gia_dinh', family),
        syncTable('qua_trinh_cong_tac', workHistory),
        syncTable('qua_trinh_dao_tao', training),
        syncTable('len_luong', salary)
    ]);
};

