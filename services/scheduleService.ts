import { supabase } from './supabaseClient';
import { Schedule } from '../types';

const TABLE_NAME = 'lich_cong_tac';
const BUCKET_NAME = 'lich_cong_tac';

export const getSchedules = async (): Promise<Schedule[]> => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('ngay_bat_dau', { ascending: false });

    if (error) throw error;

    // Parse JSONB back to array if needed (though Supabase JS client usually handles JSON columns automatically)
    return data.map(item => ({
        ...item,
        nguoi_thuc_hien: typeof item.nguoi_thuc_hien === 'string'
            ? JSON.parse(item.nguoi_thuc_hien)
            : item.nguoi_thuc_hien || []
    })) as Schedule[];
};

export const createSchedule = async (schedule: Omit<Schedule, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([schedule])
        .select();

    if (error) throw error;
    return data[0];
};

export const updateSchedule = async (id: number, schedule: Partial<Schedule>) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(schedule)
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
};

export const deleteSchedule = async (id: number) => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

    if (error) throw error;
};

export const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

    return data.publicUrl;
};
