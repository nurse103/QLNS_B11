-- Add ghi_chu column to quyet_dinh table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quyet_dinh' AND column_name='ghi_chu') THEN
        ALTER TABLE public.quyet_dinh ADD COLUMN ghi_chu text;
    END IF;
END $$;
