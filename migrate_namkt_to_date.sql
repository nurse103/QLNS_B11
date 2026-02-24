-- Migration to change namkt from integer to date
-- and rename/adjust labels in the UI.

-- Update khen_thuong.namkt to date
-- We assume existing data is just years (e.g. 2024)
-- We'll convert them to 'YYYY-01-01' during migration to preserve data

DO $$ 
BEGIN
    -- Check if column exists and its type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'khen_thuong' 
        AND column_name = 'namkt' 
        AND data_type = 'integer'
    ) THEN
        -- Safely convert integer years to dates
        ALTER TABLE public.khen_thuong 
        ALTER COLUMN namkt TYPE date 
        USING (namkt::text || '-01-01')::date;
        
        RAISE NOTICE 'Converted namkt to date type.';
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'khen_thuong' 
        AND column_name = 'namkt' 
        AND data_type = 'text'
    ) THEN
        -- If it was text, attempt cast or fallback
        ALTER TABLE public.khen_thuong 
        ALTER COLUMN namkt TYPE date 
        USING (CASE WHEN namkt ~ '^\d{4}$' THEN (namkt || '-01-01')::date ELSE namkt::date END);
        
        RAISE NOTICE 'Converted namkt (text) to date type.';
    END IF;
END $$;
