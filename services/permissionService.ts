import { supabase } from './supabaseClient';

export interface Permission {
    id: number;
    role: string;
    module: string;
    can_view: boolean;
    can_add: boolean;
    can_edit: boolean;
    can_delete: boolean;
}

export const getPermissions = async (): Promise<Permission[]> => {
    const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module', { ascending: true });

    if (error) {
        console.error("Error fetching permissions:", error);
        return [];
    }
    return data as Permission[];
};

export const getPermissionsByRole = async (role: string): Promise<Permission[]> => {
    const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('role', role);

    if (error) {
        console.error(`Error fetching permissions for role ${role}:`, error);
        return [];
    }
    return data as Permission[];
};

export const updatePermission = async (id: number, updates: Partial<Permission>) => {
    const { data, error } = await supabase
        .from('permissions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error("Error updating permission:", error);
        throw error;
    }
    return data as Permission;
};

// Initialize or Check permissions (helper to ensure data exists)
export const checkAndInitPermissions = async () => {
    // This could be used to re-seed if needed, but SQL script should handle it.
    // Keeping it empty for now unless dynamic module registration is needed.
};
