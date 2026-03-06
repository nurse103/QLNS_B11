-- Seed default permissions for NCKH Module
-- Manager Role
INSERT INTO public.permissions (role, module, can_view, can_add, can_edit, can_delete)
SELECT 'manager', 'r-topics', true, true, true, true
ON CONFLICT (role, module) DO UPDATE 
SET can_view = EXCLUDED.can_view, 
    can_add = EXCLUDED.can_add, 
    can_edit = EXCLUDED.can_edit, 
    can_delete = EXCLUDED.can_delete;

INSERT INTO public.permissions (role, module, can_view, can_add, can_edit, can_delete)
SELECT 'manager', 'research', true, true, true, true
ON CONFLICT (role, module) DO UPDATE 
SET can_view = EXCLUDED.can_view;

-- User/Staff Role
INSERT INTO public.permissions (role, module, can_view, can_add, can_edit, can_delete)
SELECT 'user', 'r-topics', true, true, false, false
ON CONFLICT (role, module) DO UPDATE 
SET can_view = EXCLUDED.can_view, 
    can_add = EXCLUDED.can_add;

INSERT INTO public.permissions (role, module, can_view, can_add, can_edit, can_delete)
SELECT 'user', 'research', true, true, true, true
ON CONFLICT (role, module) DO UPDATE 
SET can_view = EXCLUDED.can_view;
