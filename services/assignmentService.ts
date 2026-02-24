import { supabase } from './supabaseClient';
import { Assignment } from '../types';

export const getAssignments = async (page = 1, pageSize = 10) => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
        .from('phan_cong')
        .select('*', { count: 'exact' })
        .order('ngay_thang', { ascending: false })
        .range(from, to);

    if (error) throw error;
    return { data: data as Assignment[], totalCount: count || 0 };
};

export const createAssignment = async (assignment: Partial<Assignment>) => {
    const { data, error } = await supabase
        .from('phan_cong')
        .insert([assignment])
        .select()
        .single();

    if (error) throw error;
    return data as Assignment;
};

export const updateAssignment = async (id: string, assignment: Partial<Assignment>) => {
    const { data, error } = await supabase
        .from('phan_cong')
        .update(assignment)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Assignment;
};

export const deleteAssignment = async (id: string) => {
    const { error } = await supabase
        .from('phan_cong')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

export const getAssignmentByDate = async (date: string) => {
    const { data, error } = await supabase
        .from('phan_cong')
        .select('*')
        .eq('ngay_thang', date)
        .maybeSingle();

    if (error) throw error;
    return data as Assignment | null;
};
