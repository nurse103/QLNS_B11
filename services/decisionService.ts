import { supabase } from './supabaseClient';
import { Decision } from '../types';

export const getDecisions = async (page: number = 1, pageSize: number = 10) => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
        .from('quyet_dinh')
        .select('*', { count: 'exact' })
        .order('ngay_ky', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching decisions:', error);
        throw error;
    }
    return {
        data: (data || []) as Decision[],
        totalCount: count || 0
    };
};

export const createDecision = async (decision: Omit<Decision, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
        .from('quyet_dinh')
        .insert(decision)
        .select()
        .single();

    if (error) {
        console.error('Error creating decision:', error);
        throw error;
    }
    return data as Decision;
};

export const updateDecision = async (id: string, updates: Partial<Decision>) => {
    const { data, error } = await supabase
        .from('quyet_dinh')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating decision:', error);
        throw error;
    }
    return data as Decision;
};

export const deleteDecision = async (id: string) => {
    const { error } = await supabase
        .from('quyet_dinh')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting decision:', error);
        throw error;
    }
};

export const uploadDecisionFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('ktkl')
        .upload(filePath, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage.from('ktkl').getPublicUrl(filePath);
    return data.publicUrl;
};
