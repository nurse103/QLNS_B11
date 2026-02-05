import { supabase } from './supabaseClient';
import { LeaveRecord } from '../types';

export const getLeaveRecords = async () => {
    const { data, error } = await supabase
        .from('quan_ly_phep')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching leave records:', error);
        throw error;
    }

    return data as LeaveRecord[];
};

export const createLeaveRecord = async (record: Omit<LeaveRecord, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('quan_ly_phep')
        .insert(record)
        .select()
        .single();

    if (error) {
        console.error('Error creating leave record:', error);
        throw error;
    }

    return data as LeaveRecord;
};

export const updateLeaveRecord = async (id: number, updates: Partial<LeaveRecord>) => {
    const { data, error } = await supabase
        .from('quan_ly_phep')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating leave record:', error);
        throw error;
    }

    return data as LeaveRecord;
};

export const deleteLeaveRecord = async (id: number) => {
    const { error } = await supabase
        .from('quan_ly_phep')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting leave record:', error);
        throw error;
    }
};
