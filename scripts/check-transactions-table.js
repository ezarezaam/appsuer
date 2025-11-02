import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkTransactionsTable() {
  try {
    console.log('🔍 Checking if user_transactions table exists...');
    
    // Try to query the table
    const { data, error } = await supabase
      .from('user_transactions')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ user_transactions table does not exist or is not accessible');
      console.log('Error:', error.message);
      
      console.log('\n📋 You need to create the user_transactions table first.');
      console.log('Here is the SQL to create it:');
      console.log('=' .repeat(60));
      console.log(`
-- Create user_transactions table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_id ON public.user_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_transactions_created_at ON public.user_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_transactions_type ON public.user_transactions(transaction_type);

-- Enable RLS
ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own transactions" ON public.user_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all transactions" ON public.user_transactions
  FOR ALL USING (auth.role() = 'service_role');
`);
      console.log('=' .repeat(60));
      
    } else {
      console.log('✅ user_transactions table exists!');
      console.log(`Found ${data?.length || 0} records (showing first 1)`);
      
      if (data && data.length > 0) {
        console.log('Sample record:', data[0]);
      }
      
      // Now check if the function exists
      console.log('\n🔍 Checking if get_user_transactions function exists...');
      
      const { data: funcData, error: funcError } = await supabase
        .rpc('get_user_transactions', {
          p_user_id: '00000000-0000-0000-0000-000000000000',
          p_limit: 1
        });

      if (funcError) {
        console.log('❌ get_user_transactions function does not exist');
        console.log('Error:', funcError.message);
        console.log('\n📋 Please run the SQL from create_transactions_function.sql in Supabase SQL Editor');
      } else {
        console.log('✅ get_user_transactions function exists and working!');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTransactionsTable();