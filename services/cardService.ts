import { supabase } from './supabaseClient';
import { Card, CardRecord } from '../types';

// --- DM_THE_CHAM (Card Catalog) ---

export const getCards = async () => {
    const { data, error } = await supabase
        .from('dm_the_cham')
        .select('*')
        .order('so_the', { ascending: true });

    if (error) {
        console.error('Error fetching cards:', error);
        throw error;
    }
    return (data || []) as Card[];
};

export const createCard = async (card: Omit<Card, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('dm_the_cham')
        .insert(card)
        .select()
        .single();

    if (error) {
        console.error('Error creating card:', error);
        throw error;
    }
    return data as Card;
};

export const updateCard = async (id: number, updates: Partial<Card>) => {
    const { data, error } = await supabase
        .from('dm_the_cham')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating card:', error);
        throw error;
    }
    return data as Card;
};

export const deleteCard = async (id: number) => {
    const { error } = await supabase
        .from('dm_the_cham')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting card:', error);
        throw error;
    }
};

// --- QUAN_LY_THE_CHAM (Borrowing Records) ---

export const getCardRecords = async () => {
    const { data, error } = await supabase
        .from('quan_ly_the_cham')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching card records:', error);
        throw error;
    }
    return data as CardRecord[];
};

export const getActiveCardRecords = async () => {
    const { data, error } = await supabase
        .from('quan_ly_the_cham')
        .select('*')
        .eq('trang_thai', 'Đang mượn thẻ')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching active card records:', error);
        throw error;
    }
    return data as CardRecord[];
};

export const createCardRecord = async (record: Omit<CardRecord, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('quan_ly_the_cham')
        .insert(record)
        .select()
        .single();

    if (error) {
        console.error('Error creating card record:', error);
        throw error;
    }
    return data as CardRecord;
};

export const updateCardRecord = async (id: number, updates: Partial<CardRecord>) => {
    const { data, error } = await supabase
        .from('quan_ly_the_cham')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating card record:', error);
        throw error;
    }
    return data as CardRecord;
};


export const checkPatientBorrowing = async (patientName: string) => {
    const { data, error } = await supabase
        .from('quan_ly_the_cham')
        .select('*')
        .ilike('ho_ten_benh_nhan', `%${patientName}%`)
        .eq('trang_thai', 'Đang mượn thẻ');

    if (error) {
        console.error('Error checking patient borrowing:', error);
        return [];
    }
    return data as CardRecord[];
};

export const deleteCardRecord = async (id: number) => {
    const { error } = await supabase
        .from('quan_ly_the_cham')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting card record:', error);
        throw error;
    }
};
