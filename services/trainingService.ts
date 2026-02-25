import { supabase } from './supabaseClient';
import { Training, sanitizeData, syncPersonnelCurrentStatus } from './personnelService';

export interface TrainingRecord extends Training {
    dsnv?: {
        ho_va_ten: string;
        cmqd?: string;
    };
}

export const getTrainingRecords = async () => {
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
        console.error('Error fetching training records:', error);
        throw error;
    }

    return data as TrainingRecord[];
};

export const createTrainingRecord = async (record: Training) => {
    const sanitizedRecord = sanitizeData(record) as any;
    // Brute force removal of ghost column
    delete sanitizedRecord.van_bang_chung_chi;
    
    console.log('Create Training Payload Keys:', Object.keys(sanitizedRecord));

    const { data, error } = await supabase
        .from('qua_trinh_dao_tao')
        .insert(sanitizedRecord)
        .select()
        .single();

    if (error) {
        console.error('Error creating training record:', error);
        throw error;
    }

    if (data.dsnv_id) {
        await syncPersonnelCurrentStatus(data.dsnv_id);
    }

    return data;
};

export const updateTrainingRecord = async (id: number, updates: Partial<Training>) => {
    const sanitizedUpdates = sanitizeData(updates) as any;
    // Brute force removal of ghost column
    delete sanitizedUpdates.van_bang_chung_chi;
    
    console.log('Update Training Payload Keys:', Object.keys(sanitizedUpdates));

    const { data, error } = await supabase
        .from('qua_trinh_dao_tao')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating training record:', error);
        throw error;
    }

    if (data.dsnv_id) {
        await syncPersonnelCurrentStatus(data.dsnv_id);
    }

    return data;
};

export const deleteTrainingRecord = async (id: number) => {
    // Get the record before deleting to know the dsnv_id
    const { data: record } = await supabase
        .from('qua_trinh_dao_tao')
        .select('dsnv_id')
        .eq('id', id)
        .single();

    const { error } = await supabase
        .from('qua_trinh_dao_tao')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting training record:', error);
        throw error;
    }

    if (record?.dsnv_id) {
        await syncPersonnelCurrentStatus(record.dsnv_id);
    }
};
