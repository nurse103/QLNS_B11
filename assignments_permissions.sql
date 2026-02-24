-- SQL to insert permissions for the 'assignments' module
-- Run this in Supabase SQL Editor

-- 1. ADMIN (Full Access)
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
VALUES ('admin', 'assignments', true, true, true, true)
ON CONFLICT (role, module) 
DO UPDATE SET can_view = true, can_add = true, can_edit = true, can_delete = true;

-- 2. MANAGER (View, Add, Edit)
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
VALUES ('manager', 'assignments', true, true, true, false)
ON CONFLICT (role, module) 
DO UPDATE SET can_view = true, can_add = true, can_edit = true;

-- 3. STAFF / USER (View Only)
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
VALUES ('staff', 'assignments', true, false, false, false)
ON CONFLICT (role, module) 
DO UPDATE SET can_view = true;

-- Note: If your system uses 'user' role instead of 'staff', also add it:
INSERT INTO permissions (role, module, can_view, can_add, can_edit, can_delete)
VALUES ('user', 'assignments', true, false, false, false)
ON CONFLICT (role, module) 
DO UPDATE SET can_view = true;
