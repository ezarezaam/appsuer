-- Fix: Create function using existing balance_transactions table
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
  FROM balance_transactions t
  WHERE t.user_id = p_user_id
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_transactions(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_transactions(UUID, INTEGER) TO service_role;

-- Test the function with existing data
-- SELECT * FROM get_user_transactions('82eeeb46-e19a-4292-8fa1-fd8c92bdd80e'::UUID, 10);