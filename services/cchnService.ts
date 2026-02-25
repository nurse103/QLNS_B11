import { supabase } from './supabaseClient';

export interface CCHN {
    id: number;
    dsnv_id: number;
    so_cchn: string | null;
    ngay_cap: string | null;
    pham_vi_hoat_dong: string | null;
    noi_cap: string | null;
    van_bang_chuyen_mon: string | null;
    ngay_het_han: string | null;
    anh_cchn: string | null;
    ghi_chu: string | null;
    created_by: string | null;
    created_at: string;
}

export interface CCHNRecord extends CCHN {
    dsnv?: {
        ho_va_ten: string;
        chuc_vu: string;
    };
}

export const getCCHNRecords = async (): Promise<CCHNRecord[]> => {
    const { data, error } = await supabase
        .from('cchn')
        .select(`
            *,
            dsnv:dsnv_id (
                ho_va_ten,
                chuc_vu
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching CCHN records:', error);
        throw error;
    }
    return data as CCHNRecord[];
};

export const createCCHNRecord = async (record: Partial<CCHN>) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const { data, error } = await supabase
        .from('cchn')
        .insert([{ ...record, created_by: user?.id ?? null }])
        .select()
        .single();

    if (error) {
        console.error('Error creating CCHN record:', error);
        throw error;
    }
    return data;
};

export const updateCCHNRecord = async (id: number, record: Partial<CCHN>) => {
    const { data, error } = await supabase
        .from('cchn')
        .update(record)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating CCHN record:', error);
        throw error;
    }
    return data;
};

export const deleteCCHNRecord = async (id: number) => {
    const { error } = await supabase
        .from('cchn')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting CCHN record:', error);
        throw error;
    }
};

export const bulkCreateCCHNRecords = async (records: Partial<CCHN>[]) => {
    const { data, error } = await supabase
        .from('cchn')
        .insert(records)
        .select();

    if (error) {
        console.error('Error bulk creating CCHN records:', error);
        throw error;
    }
    return data;
};

export const uploadCCHNFile = async (file: File | Blob, originalName: string) => {
    const fileExt = originalName.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('cchn')
        .upload(filePath, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage.from('cchn').getPublicUrl(filePath);
    return data.publicUrl;
};
