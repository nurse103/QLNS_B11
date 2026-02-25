import { supabase } from './supabaseClient';
import { Reward } from '../types';

export const getRewards = async (page: number = 1, pageSize: number = 10) => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
        .from('khen_thuong')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching rewards:', error);
        throw error;
    }
    return {
        data: (data || []) as Reward[],
        totalCount: count || 0
    };
};

export const createReward = async (reward: Omit<Reward, 'id' | 'created_at'>) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const { data, error } = await supabase
        .from('khen_thuong')
        .insert({ ...reward, created_by: user?.id ?? null })
        .select()
        .single();

    if (error) {
        console.error('Error creating reward:', error);
        throw error;
    }
    return data as Reward;
};

export const updateReward = async (id: string, updates: Partial<Reward>) => {
    const { data, error } = await supabase
        .from('khen_thuong')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating reward:', error);
        throw error;
    }
    return data as Reward;
};

export const deleteReward = async (id: string) => {
    const { error } = await supabase
        .from('khen_thuong')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting reward:', error);
        throw error;
    }
};

export const getUniqueCapKT = async () => {
    // Supabase doesn't have a direct DISTINCT, so we fetch the column and filter in JS
    // or we can use a select and limit. For small datasets, this is fine.
    const { data, error } = await supabase
        .from('khen_thuong')
        .select('capkt');

    if (error) {
        console.error('Error fetching unique capkt:', error);
        return [];
    }
    
    const uniqueValues = Array.from(new Set(data.map(item => item.capkt).filter(Boolean)));
    return uniqueValues as string[];
};

export const uploadRewardFile = async (file: File) => {
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

export const bulkCreateRewards = async (rewards: Omit<Reward, 'id' | 'created_at'>[]) => {
    const { data, error } = await supabase
        .from('khen_thuong')
        .insert(rewards)
        .select();

    if (error) {
        console.error('Error bulk creating rewards:', error);
        throw error;
    }
    return data as Reward[];
};



