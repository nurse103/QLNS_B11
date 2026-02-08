-- SQL to insert expanded permissions for all sidebar items

-- Define the list of all module keys and default access
-- We will use a temporary table or just simple inserts with ON CONFLICT DO NOTHING

-- List of new modules
-- Parent: personnel
-- Children: p-dashboard, p-list, p-salary, p-family, p-training, p-work, p-cert, p-insurance
-- Parent: research
-- Children: r-topics, r-articles, r-sports, r-conference
-- Parent: assets
-- Children: a-medical-equip, a-it-equip, a-medical-tools, a-uniforms
-- Others: dashboard, leave, cong-van, rewards, party-management, patient-card-management, absence, reports, combat, duty, schedule, settings

-- 1. Insert for ADMIN (Full Access)
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
SELECT 'admin', m, true, true, true, true
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
    'assets', 'a-medical-equip', 'a-it-equip', 'a-medical-tools', 'a-uniforms',
    'settings'
]) AS m
ON CONFLICT (role, module) DO NOTHING;

-- 2. Insert for MANAGER (View All, Edit Many, Delete Some)
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
SELECT 'manager', m, true, true, true, false
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

-- Manager Settings (View Only)
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
VALUES ('manager', 'settings', true, false, false, false)
ON CONFLICT (role, module) DO NOTHING;


-- 3. Insert for STAFF (View Only mostly)
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
SELECT 'staff', m, true, false, false, false
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

-- Staff Settings (No Access)
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
VALUES ('staff', 'settings', false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;
