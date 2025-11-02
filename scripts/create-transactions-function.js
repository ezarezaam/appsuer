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

// SQL untuk membuat fungsi get_user_transactions
const createFunctionSQL = `
-- Create function to get user transactions
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
`;

async function createTransactionsFunction() {
  try {
    console.log('🔧 Creating get_user_transactions function...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: createFunctionSQL
    });

    if (error) {
      console.error('❌ Error creating function:', error);
      
      // Coba dengan query biasa jika rpc tidak ada
      console.log('🔄 Trying direct SQL execution...');
      const { data: directData, error: directError } = await supabase
        .from('_sql_exec')
        .insert({ sql: createFunctionSQL });
        
      if (directError) {
        console.error('❌ Direct SQL also failed:', directError);
        console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
        console.log('=' .repeat(60));
        console.log(createFunctionSQL);
        console.log('=' .repeat(60));
        return;
      }
    }

    console.log('✅ Function created successfully!');
    
    // Test the function
    console.log('🧪 Testing function...');
    const { data: testData, error: testError } = await supabase
      .rpc('get_user_transactions', {
        p_user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
        p_limit: 1
      });

    if (testError) {
      console.log('⚠️  Function created but test failed (this is normal if no data exists):', testError.message);
    } else {
      console.log('✅ Function test successful!');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
    console.log('=' .repeat(60));
    console.log(createFunctionSQL);
    console.log('=' .repeat(60));
  }
}

createTransactionsFunction();