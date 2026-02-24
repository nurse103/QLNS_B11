import { supabase } from './supabaseClient';

export const getMenuOrder = async (): Promise<string[]> => {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'sidebar_menu_order')
            .single();

        if (error || !data) return [];
        
        try {
            const order = JSON.parse(data.value);
            return Array.isArray(order) ? order : [];
        } catch (e) {
            console.error("Error parsing menu order JSON:", e);
            return [];
        }
    } catch (err) {
        console.error("Error fetching menu order:", err);
        return [];
    }
};

export const updateMenuOrder = async (order: string[]): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('system_settings')
            .upsert({ 
                key: 'sidebar_menu_order', 
                value: JSON.stringify(order), 
                updated_at: new Date() 
            });

        if (error) {
            console.error("Error updating menu order:", error);
            return false;
        }
        return true;
    } catch (err) {
        console.error("Error updating menu order exception:", err);
        return false;
    }
};
