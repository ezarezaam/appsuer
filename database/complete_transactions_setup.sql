-- Complete setup for user transactions system
-- Run this SQL in Supabase SQL Editor

-- 1. Create user_transactions table
CREATE TABLE IF NOT EXISTS public.user_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('topup', 'deduct', 'refund')),
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_id ON public.user_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_transactions_created_at ON public.user_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_transactions_type ON public.user_transactions(transaction_type);

-- 3. Enable RLS
ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can view their own transactions" ON public.user_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all transactions" ON public.user_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- 5. Create function to get user transactions
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

-- 6. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_transactions(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_transactions(UUID, INTEGER) TO service_role;

-- 7. Insert some sample data for testing (optional)
-- You can uncomment and modify these if you want sample data
/*
INSERT INTO public.user_transactions (user_id, transaction_type, amount, balance_before, balance_after, description, reference_id)
VALUES 
  ('your-user-id-here', 'topup', 100000, 0, 100000, 'Initial topup', 'REF001'),
  ('your-user-id-here', 'deduct', 25000, 100000, 75000, 'Game purchase', 'REF002'),
  ('your-user-id-here', 'topup', 50000, 75000, 125000, 'Additional topup', 'REF003');
*/

-- 8. Test the function (optional)
-- SELECT * FROM get_user_transactions('your-user-id-here'::UUID, 10);