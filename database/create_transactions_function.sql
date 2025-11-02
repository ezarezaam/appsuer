-- Create function to get user transactions
-- Run this SQL in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.get_user_transactions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  transaction_type TEXT,
  amount NUMERIC,
  balance_before NUMERIC,
  balance_after NUMERIC,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.transaction_type,
    t.amount,
    t.balance_before,
    t.balance_after,
    t.description,
    t.reference_id,
    t.created_at
  FROM user_transactions t
  WHERE t.user_id = p_user_id
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_transactions(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_transactions(UUID, INTEGER) TO service_role;

-- Test the function (optional)
-- SELECT * FROM get_user_transactions('your-user-id-here'::UUID, 10);