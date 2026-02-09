-- Fix mismatch between 'user' role (in users table) and 'staff' role (in permissions table)

-- 1. Copy all 'staff' permissions to 'user' role
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
SELECT 'user', module, can_view, can_add, can_edit, can_delete
FROM permissions
WHERE role = 'staff'
ON CONFLICT (role, module) 
DO UPDATE SET 
    can_view = EXCLUDED.can_view,
    can_add = EXCLUDED.can_add,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete;

-- 2. Ensure 'user' has access to all basic modules if 'staff' was missing
-- (Re-run the Staff logic but for 'user')
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
SELECT 'user', m, true, false, false, false
FROM unnest(ARRAY[
    'dashboard', 
    'personnel', 'p-dashboard', 'p-list', 'p-salary', 'p-family', 'p-training', 'p-work', 'p-cert', 'p-insurance',
    'leave', 
    'cong-van', 
    'research', 'r-topics', 'r-articles', 'r-sports', 'r-conference',
    'rewards', 
    'party-management', 
    'patient-card-management', 
    'absence', 
    'reports', 
    'combat', 
    'duty', 
    'schedule', 
    'assets', 'a-medical-equip', 'a-it-equip', 'a-medical-tools', 'a-uniforms'
]) AS m
ON CONFLICT (role, module) DO NOTHING;

-- Allow 'user' to add leave and card borrowing
UPDATE permissions SET can_add = true WHERE role = 'user' AND module = 'leave';
UPDATE permissions SET can_add = true WHERE role = 'user' AND module = 'patient-card-management';

-- Hide settings for 'user'
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
VALUES ('user', 'settings', false, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET can_view = false;
