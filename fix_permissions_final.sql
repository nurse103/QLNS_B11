-- SQL to FIX and UPDATE permissions for all sidebar items
-- Run this in Supabase SQL Editor

-- 1. ADMIN (Full Access)
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
ON CONFLICT (role, module) 
DO UPDATE SET can_view = true, can_add = true, can_edit = true, can_delete = true;

-- 2. MANAGER (View All, Edit Many, Delete Some)
-- Reset View to TRUE for all modules first
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
ON CONFLICT (role, module) 
DO UPDATE SET can_view = true; -- Minimal update to ensure visibility

-- Specific Manager Overrides (Add/Edit logic)
UPDATE permissions SET can_add = true, can_edit = true WHERE role = 'manager' AND module IN ('personnel', 'p-list', 'cong-van', 'patient-card-management', 'leave', 'duty', 'schedule');
UPDATE permissions SET can_delete = false WHERE role = 'manager'; -- Safety

-- Manager Settings (View Only)
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
VALUES ('manager', 'settings', true, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET can_view = true;


-- 3. STAFF (View Only mostly)
-- Ensure they can VIEW everything by default (except settings/admin stuff)
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
ON CONFLICT (role, module) 
DO UPDATE SET can_view = true;

-- Staff Specifics:
-- Can ADD Leave requests? Usually yes.
UPDATE permissions SET can_add = true WHERE role = 'staff' AND module = 'leave';
-- Can ADD Card Borrowing? Maybe. Let's allow ADD but not DELETE for now if requested.
UPDATE permissions SET can_add = true WHERE role = 'staff' AND module = 'patient-card-management';

-- Staff Settings (No Access)
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
VALUES ('staff', 'settings', false, false, false, false)
ON CONFLICT (role, module) DO UPDATE SET can_view = false;
