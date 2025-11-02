-- User Balance System
-- This file creates the complete balance system with tables and functions

-- 1. Create user_balance table
CREATE TABLE IF NOT EXISTS user_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_balance_positive CHECK (balance >= 0)
);

-- 2. Create balance_transactions table
CREATE TABLE IF NOT EXISTS balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('topup', 'deduct', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT balance_transactions_amount_positive CHECK (amount > 0)
);

-- 3. Create topup_requests table (if not exists)
CREATE TABLE IF NOT EXISTS topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_proof_url TEXT,
  payment_details JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT topup_requests_amount_positive CHECK (amount > 0)
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_balance_user_id ON user_balance(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_user_id ON balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_created_at ON balance_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_reference_id ON balance_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_topup_requests_user_id ON topup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_topup_requests_status ON topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_topup_requests_created_at ON topup_requests(created_at DESC);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE user_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE topup_requests ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for user_balance
CREATE POLICY "Users can view their own balance" ON user_balance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all balances" ON user_balance
  FOR ALL USING (auth.role() = 'service_role');

-- 7. Create RLS policies for balance_transactions
CREATE POLICY "Users can view their own transactions" ON balance_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all transactions" ON balance_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- 8. Create RLS policies for topup_requests
CREATE POLICY "Users can insert their own topup requests" ON topup_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own topup requests" ON topup_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending requests" ON topup_requests
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Service role can manage all topup requests" ON topup_requests
  FOR ALL USING (auth.role() = 'service_role');

-- 9. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Create triggers for updated_at
CREATE TRIGGER update_user_balance_updated_at 
    BEFORE UPDATE ON user_balance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topup_requests_updated_at 
    BEFORE UPDATE ON topup_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Create the main function: update_user_balance
CREATE OR REPLACE FUNCTION update_user_balance(
    p_user_id UUID,
    p_amount DECIMAL(10,2),
    p_transaction_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_current_balance DECIMAL(10,2) := 0.00;
    v_new_balance DECIMAL(10,2);
    v_transaction_id UUID;
BEGIN
    -- Validate transaction type
    IF p_transaction_type NOT IN ('topup', 'deduct', 'refund') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid transaction type. Must be topup, deduct, or refund'
        );
    END IF;

    -- Validate amount
    IF p_amount <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Amount must be greater than 0'
        );
    END IF;

    -- Get current balance or create new balance record
    SELECT balance INTO v_current_balance 
    FROM user_balance 
    WHERE user_id = p_user_id;

    -- If user doesn't have balance record, create one
    IF NOT FOUND THEN
        INSERT INTO user_balance (user_id, balance) 
        VALUES (p_user_id, 0.00);
        v_current_balance := 0.00;
    END IF;

    -- Calculate new balance based on transaction type
    CASE p_transaction_type
        WHEN 'topup', 'refund' THEN
            v_new_balance := v_current_balance + p_amount;
        WHEN 'deduct' THEN
            v_new_balance := v_current_balance - p_amount;
            -- Check for insufficient balance
            IF v_new_balance < 0 THEN
                RETURN json_build_object(
                    'success', false,
                    'error', 'Insufficient balance',
                    'current_balance', v_current_balance,
                    'required_amount', p_amount
                );
            END IF;
    END CASE;

    -- Update user balance
    UPDATE user_balance 
    SET balance = v_new_balance, updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Insert transaction record
    INSERT INTO balance_transactions (
        user_id, 
        transaction_type, 
        amount, 
        balance_before, 
        balance_after, 
        description, 
        reference_id, 
        created_by
    ) VALUES (
        p_user_id,
        p_transaction_type,
        p_amount,
        v_current_balance,
        v_new_balance,
        p_description,
        p_reference_id,
        p_created_by
    ) RETURNING id INTO v_transaction_id;

    -- Return success response
    RETURN json_build_object(
        'success', true,
        'balance_before', v_current_balance,
        'balance_after', v_new_balance,
        'transaction_id', v_transaction_id,
        'message', 'Balance updated successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create helper function to get user balance
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_balance DECIMAL(10,2) := 0.00;
BEGIN
    SELECT balance INTO v_balance 
    FROM user_balance 
    WHERE user_id = p_user_id;
    
    -- If user doesn't exist, return 0
    IF NOT FOUND THEN
        RETURN 0.00;
    END IF;
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create function to get user transaction history
CREATE OR REPLACE FUNCTION get_user_transactions(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    transaction_type TEXT,
    amount DECIMAL(10,2),
    balance_before DECIMAL(10,2),
    balance_after DECIMAL(10,2),
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bt.id,
        bt.transaction_type,
        bt.amount,
        bt.balance_before,
        bt.balance_after,
        bt.description,
        bt.reference_id,
        bt.created_at
    FROM balance_transactions bt
    WHERE bt.user_id = p_user_id
    ORDER BY bt.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Success message
SELECT 'User balance system created successfully!' as message;