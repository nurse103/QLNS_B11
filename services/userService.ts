import { supabase } from './supabaseClient';
import { SystemUser } from '../types';

export const getUsers = async () => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as SystemUser[];
};

export const createUser = async (user: Partial<SystemUser>) => {
    const { data, error } = await supabase
        .from('users')
        .insert([user])
        .select()
        .single();

    if (error) throw error;
    return data as SystemUser;
};

export const updateUser = async (id: string, user: Partial<SystemUser>) => {
    // Remove password from update if it's empty to avoid overwriting with empty string
    const updateData = { ...user };
    if (!updateData.password) {
        delete updateData.password;
    }

    const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as SystemUser;
};

export const deleteUser = async (id: string) => {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
