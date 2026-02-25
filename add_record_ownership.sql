-- Migration: Add record ownership (created_by) to all operational tables
-- This allows enforcing "user who created can edit/delete, admin has full access"

-- 1. Helper to add column if not exists and link to users
DO $$ 
DECLARE
    t text;
    admin_id uuid;
    tables_to_update text[] := ARRAY[
        'dsnv', 
        'cchn', 
        'len_luong', 
        'qua_trinh_cong_tac', 
        'qua_trinh_dao_tao', 
        'gia_dinh', 
        'quan_ly_phep',
        'quan_so_nghi', 
        'quan_ly_the_cham', 
        'cong_van', 
        'khen_thuong',
        'quyet_dinh',
        'phan_cong',
        'lich_truc',
        'lich_cong_tac'
    ];
BEGIN
    -- Get the first admin user to assign existing records to
    SELECT id INTO admin_id FROM public.users WHERE role = 'admin' LIMIT 1;
    
    FOREACH t IN ARRAY tables_to_update LOOP
        -- Add column if not exists
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id)', t);
        
        -- Assign existing records to admin if created_by is null
        IF admin_id IS NOT NULL THEN
            EXECUTE format('UPDATE public.%I SET created_by = %L WHERE created_by IS NULL', t, admin_id);
        END IF;
    END LOOP;
END $$;
