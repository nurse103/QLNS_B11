import { supabase } from './supabaseClient';

export interface User {
    id: string; // Changed to string for UUID
    username: string;
    role: string;
    full_name?: string;
    // Optional fields that might not be in the base schema but could be added
    dsnv_id?: number;
    avatar?: string;
}

export const login = async (username: string, password: string): Promise<User | null> => {
    try {
        // Use RPC function to bypass RLS recursion issues
        const { data, error } = await supabase
            .rpc('login_user', { p_username: username, p_password: password });

        if (error) {
            console.error("Login error:", error);
            return null;
        }

        // RPC returns an array (SETOF users), take the first item
        if (data && data.length > 0) {
            // Need to cast the result to User type as Supabase might return it slightly differently
            const user = data[0] as unknown as User;
            return user;
        }

        return null;
    } catch (err) {
        console.error("Login exception:", err);
        return null;
    }
};

export const getBackground = async (): Promise<string> => {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'login_background')
            .single();

        if (error || !data) return '';
        return data.value;
    } catch (err) {
        return '';
    }
};

export const updateBackground = async (file: File): Promise<string | null> => {
    try {
        // Sanitize filename to avoid issues with special characters (Vietnamese, spaces, etc.)
        // Convert to ASCII if possible or just strip special chars
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `bg-${Date.now()}-${sanitizedFileName}`;

        const { data, error } = await supabase.storage
            .from('backgrounds')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error("Supabase Storage Upload Error:", error);
            throw error;
        }

        const { data: publicUrlData } = supabase.storage
            .from('backgrounds')
            .getPublicUrl(fileName);

        const publicUrl = publicUrlData.publicUrl;

        // Update setting
        const { error: dbError } = await supabase
            .from('system_settings')
            .upsert({ key: 'login_background', value: publicUrl, updated_at: new Date() });

        if (dbError) throw dbError;

        return publicUrl;
    } catch (err) {
        console.error("Upload background error:", err);
        return null;
    }
};

export const getAuthUser = (): User | null => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    }
    return null;
};
// Alias for consistency
export const getCurrentUser = getAuthUser;
