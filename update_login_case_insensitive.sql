-- Update login_user function to be case-insensitive for username
CREATE OR REPLACE FUNCTION login_user(p_username TEXT, p_password TEXT)
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with creator permissions, bypassing RLS
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM users
    WHERE LOWER(username) = LOWER(p_username) AND password = p_password;
END;
$$;
