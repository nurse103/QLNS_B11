import { supabase } from './supabaseClient';
import { WorkHistory, sanitizeData, syncPersonnelCurrentStatus } from './personnelService';

export interface WorkHistoryRecord extends WorkHistory {
    dsnv?: {
        ho_va_ten: string;
        cmqd?: string;
    };
}

export const getWorkHistoryRecords = async () => {
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
        console.error('Error fetching work history records:', error);
        throw error;
    }

    return data as WorkHistoryRecord[];
};

export const createWorkHistoryRecord = async (record: WorkHistory) => {
    const sanitizedRecord = sanitizeData(record);
    const { data, error } = await supabase
        .from('qua_trinh_cong_tac')
        .insert(sanitizedRecord)
        .select()
        .single();

    if (error) {
        console.error('Error creating work history record:', error);
        throw error;
    }

    if (data.dsnv_id) {
        await syncPersonnelCurrentStatus(data.dsnv_id);
    }

    return data;
};

export const updateWorkHistoryRecord = async (id: number, updates: Partial<WorkHistory>) => {
    const sanitizedUpdates = sanitizeData(updates);
    const { data, error } = await supabase
        .from('qua_trinh_cong_tac')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating work history record:', error);
        throw error;
    }

    if (data.dsnv_id) {
        await syncPersonnelCurrentStatus(data.dsnv_id);
    }

    return data;
};

export const deleteWorkHistoryRecord = async (id: number) => {
    // Get the record before deleting to know the dsnv_id
    const { data: record } = await supabase
        .from('qua_trinh_cong_tac')
        .select('dsnv_id')
        .eq('id', id)
        .single();

    const { error } = await supabase
        .from('qua_trinh_cong_tac')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting work history record:', error);
        throw error;
    }

    if (record?.dsnv_id) {
        await syncPersonnelCurrentStatus(record.dsnv_id);
    }
};
