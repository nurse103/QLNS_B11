import { useState, useEffect } from 'react';
import { getPermissionsByRole, Permission } from '../services/permissionService';
import { getAuthUser } from '../services/authService';

export const usePermissions = (moduleName: string) => {
    const [permissions, setPermissions] = useState<Permission>({
        id: 0,
        role: '',
        module: moduleName,
        can_view: false, // Default to strict (no access)
        can_add: false,
        can_edit: false,
        can_delete: false
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPerms = async () => {
            const user = getAuthUser();
            if (!user) {
                setLoading(false);
                return;
            }

            // If admin, give full access immediately client-side for better UX
            // (Server-side RLS should still force checks if strictly needed, but for UI hiding this is fine)
            if (user.role === 'admin') {
                setPermissions({
                    id: -1,
                    role: 'admin',
                    module: moduleName,
                    can_view: true,
                    can_add: true,
                    can_edit: true,
                    can_delete: true
                });
                setLoading(false);
                return;
            }

            try {
                // Fetch all permissions for this role and find the specific module
                // Optimization: Could cache all permissions in a context instead of fetching per component.
                // For now, simple fetch is safer to avoid stale state.
                const perms = await getPermissionsByRole(user.role);
                const modulePerm = perms.find(p => p.module === moduleName);

                if (modulePerm) {
                    setPermissions(modulePerm);
                } else {
                    // If no explicit permission row exists, assume restricted (false)
                    // or maybe default View for 'overview'?
                    // Let's stick to false for safety.
                }
            } catch (err) {
                console.error("Error in usePermissions:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchPerms();
    }, [moduleName]);

    return { ...permissions, loading };
};
