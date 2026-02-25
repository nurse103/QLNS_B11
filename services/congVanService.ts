import { supabase } from './supabaseClient';

export interface CongVan {
    id: number;
    created_at: string;
    loai_cong_van: string; // 'CV Đi' | 'CV Đến'
    so_hieu: string;
    ten_cong_van: string;
    noi_dung: string;
    co_quan_ban_hanh: string;
    ngay_ban_hanh: string; // Date string YYYY-MM-DD
    phan_nhom: string;
    file_dinh_kem: string | null;
    ghi_chu: string | null;
    created_by?: string | null;
}

export const getCongVanList = async () => {
    const { data, error } = await supabase
        .from('cong_van')
        .select('*')
        .order('ngay_ban_hanh', { ascending: false });

    if (error) {
        console.error('Error fetching cong van:', error);
        throw error;
    }
    return data as CongVan[];
};

export const createCongVan = async (congVan: Omit<CongVan, 'id' | 'created_at'>) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const { data, error } = await supabase
        .from('cong_van')
        .insert({ ...congVan, created_by: user?.id ?? null })
        .select()
        .single();

    if (error) {
        console.error('Error creating cong van:', error);
        throw error;
    }
    return data as CongVan;
};

export const updateCongVan = async (id: number, congVan: Partial<CongVan>) => {
    const { data, error } = await supabase
        .from('cong_van')
        .update(congVan)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating cong van:', error);
        throw error;
    }
    return data as CongVan;
};

export const deleteCongVan = async (id: number) => {
    const { error } = await supabase
        .from('cong_van')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting cong van:', error);
        throw error;
    }
};

export const uploadCongVanFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('cong_van_file')
        .upload(filePath, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage.from('cong_van_file').getPublicUrl(filePath);
    return data.publicUrl;
};
