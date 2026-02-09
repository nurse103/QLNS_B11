-- Revoke modification permissions for 'user' role on 'p-list' module
UPDATE permissions 
SET can_add = false, 
    can_edit = false, 
    can_delete = false 
WHERE role = 'user' AND module = 'p-list';

-- Verification: Select to confirm
SELECT * FROM permissions WHERE role = 'user' AND module = 'p-list';
