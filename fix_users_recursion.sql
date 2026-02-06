/* 1. Temporarily Disable RLS to stop recursion immediately */
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

/* 2. Drop FORCEFULLY ALL existing policies on the users table */
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY %I ON public.users', pol.policyname);
    END LOOP;
END $$;

/* 3. Re-Enable RLS */
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

/* 4. Create Simple, Non-Recursive Policies */
CREATE POLICY "policy_allow_select_all" ON public.users FOR SELECT USING (true);
CREATE POLICY "policy_allow_insert_all" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "policy_allow_update_all" ON public.users FOR UPDATE USING (true);
CREATE POLICY "policy_allow_delete_all" ON public.users FOR DELETE USING (true);

/* 5. Ensure Login Function is Safe */
CREATE OR REPLACE FUNCTION login_user(p_username TEXT, p_password TEXT)
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM users
    WHERE username = p_username AND password = p_password;
END;
$$;
