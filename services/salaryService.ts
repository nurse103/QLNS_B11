import { supabase } from './supabaseClient';
import { Salary } from './personnelService'; // Reuse existing interface or redefine if needed, let's extend it for display

export interface SalaryRecord extends Salary {
    dsnv?: {
        ho_va_ten: string;
        chuc_vu?: string;
    };
    // Helper to flatten name for easier table display if needed, but we can access dsnv.ho_va_ten
}

export const getSalaryRecords = async () => {
    const { data, error } = await supabase
        .from('len_luong')
        .select(`
            *,
            dsnv:dsnv_id (
                ho_va_ten,
                chuc_vu
            )
        `)
        .order('thang_nam_nhan', { ascending: false });

    if (error) {
        console.error('Error fetching salary records:', error);
        throw error;
    }

    return data as SalaryRecord[];
};

export const createSalaryRecord = async (record: Salary) => {
    const { data, error } = await supabase
        .from('len_luong')
        .insert(record)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateSalaryRecord = async (id: number, updates: Partial<Salary>) => {
    const { data, error } = await supabase
        .from('len_luong')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteSalaryRecord = async (id: number) => {
    const { error } = await supabase
        .from('len_luong')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
