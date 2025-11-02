-- Simple RPC function for get_user_transactions
-- Copy and paste this to Supabase SQL Editor, then click "Run"

CREATE OR REPLACE FUNCTION public.get_user_transactions(p_user_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS SETOF balance_transactions
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM balance_transactions 
  WHERE user_id = p_user_id 
  ORDER BY created_at DESC 
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_transactions(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_transactions(UUID, INTEGER) TO service_role;