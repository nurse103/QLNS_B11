import { supabase } from './supabaseClient';
import { AbsenceRecord } from '../types';

export const getAbsencesByDate = async (date: string) => {
    const { data, error } = await supabase
        .from('quan_so_nghi')
        .select('*')
        .eq('ngay_nghi', date)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching absences:', error);
        throw error;
    }

    return data as AbsenceRecord[];
};

export const createAbsenceRecord = async (record: Omit<AbsenceRecord, 'id' | 'created_at'>) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const { data, error } = await supabase
        .from('quan_so_nghi')
        .insert({ ...record, created_by: user?.id ?? null })
        .select()
        .single();

    if (error) {
        console.error('Error creating absence record:', error);
        throw error;
    }

    return data as AbsenceRecord;
};

export const updateAbsenceRecord = async (id: number, updates: Partial<AbsenceRecord>) => {
    const { data, error } = await supabase
        .from('quan_so_nghi')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating absence record:', error);
        throw error;
    }

    return data as AbsenceRecord;
};

export const deleteAbsenceRecord = async (id: number) => {
    const { error } = await supabase
        .from('quan_so_nghi')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting absence record:', error);
        throw error;
    }
};

export const checkAbsenceExists = async (dsnv_id: number, date: string) => {
    const { data, error } = await supabase
        .from('quan_so_nghi')
        .select('id')
        .eq('dsnv_id', dsnv_id)
        .eq('ngay_nghi', date)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
        console.error('Error checking absence existence:', error);
        throw error;
    }

    return !!data;
};
