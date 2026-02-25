import { supabase } from './supabaseClient';

export interface DutySchedule {
    id: number;
    ngay_truc: string; // YYYY-MM-DD
    bac_sy: string | null;
    noi_tru: string | null;
    sau_dai_hoc: string | null;
    dieu_duong: string | null;
    phu_dieu_duong: string | null;
    ghi_chu: string | null;
    created_at?: string;
}

export const getDutySchedules = async (month?: number, year?: number) => {
    let query = supabase
        .from('lich_truc')
        .select('*')
        .order('ngay_truc', { ascending: true });

    if (month && year) {
        // Construct date range for the month
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        // Calculate end date (first day of next month)
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        query = query.gte('ngay_truc', startDate).lt('ngay_truc', endDate);
    } else if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year + 1}-01-01`;
        query = query.gte('ngay_truc', startDate).lt('ngay_truc', endDate);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching duty schedules:', error);
        throw error;
    }

    return data as DutySchedule[];
};

export const createDutySchedule = async (schedule: Omit<DutySchedule, 'id'>) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const { data, error } = await supabase
        .from('lich_truc')
        .insert({ ...schedule, created_by: user?.id ?? null })
        .select()
        .single();

    if (error) {
        console.error('Error creating duty schedule:', error);
        throw error;
    }

    return data as DutySchedule;
};

export const updateDutySchedule = async (id: number, updates: Partial<DutySchedule>) => {
    const { data, error } = await supabase
        .from('lich_truc')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating duty schedule:', error);
        throw error;
    }

    return data as DutySchedule;
};

export const deleteDutySchedule = async (id: number) => {
    const { error } = await supabase
        .from('lich_truc')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting duty schedule:', error);
        throw error;
    }
};

export const bulkCreateDutySchedules = async (schedules: Omit<DutySchedule, 'id'>[]) => {
    const { data, error } = await supabase
        .from('lich_truc')
        .insert(schedules)
        .select();

    if (error) {
        console.error('Error bulk creating duty schedules:', error);
        throw error;
    }

    return data as DutySchedule[];
};
