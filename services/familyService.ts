import { supabase } from './supabaseClient';
import { Family } from './personnelService';

export interface FamilyRecord extends Family {
    dsnv?: {
        ho_va_ten: string;
        chuc_vu?: string;
    };
}

export const getFamilyRecords = async () => {
    const { data, error } = await supabase
        .from('gia_dinh')
        .select(`
            *,
            dsnv:dsnv_id (
                ho_va_ten,
                chuc_vu
            )
        `)
        .order('dsnv_id', { ascending: true }); // Group by employee vaguely by ID sort

    if (error) {
        console.error('Error fetching family records:', error);
        throw error;
    }

    return data as FamilyRecord[];
};

export const createFamilyRecord = async (record: Family) => {
    const { data, error } = await supabase
        .from('gia_dinh')
        .insert(record)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateFamilyRecord = async (id: number, updates: Partial<Family>) => {
    const { data, error } = await supabase
        .from('gia_dinh')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteFamilyRecord = async (id: number) => {
    const { error } = await supabase
        .from('gia_dinh')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
