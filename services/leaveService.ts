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
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const { data, error } = await supabase
        .from('quan_ly_phep')
        .insert({ ...record, created_by: user?.id ?? null })
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

export const getLeavesOnDate = async (date: string) => {
    // Fetch records where tu_ngay <= date <= den_ngay
    const { data, error } = await supabase
        .from('quan_ly_phep')
        .select('*')
        .lte('tu_ngay', date)
        .gte('den_ngay', date);

    if (error) {
        console.error('Error fetching leaves on date:', error);
        throw error;
    }

    return data as LeaveRecord[];
};
