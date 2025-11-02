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

async function createRPCFunction() {
  try {
    console.log('🔧 Creating get_user_transactions function...');
    
    // Coba buat fungsi menggunakan query langsung
    const { data, error } = await supabase
      .from('_sql')
      .select('*')
      .eq('query', `
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
        
        GRANT EXECUTE ON FUNCTION public.get_user_transactions(UUID, INTEGER) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.get_user_transactions(UUID, INTEGER) TO service_role;
      `);

    if (error) {
      console.log('❌ Method 1 failed, trying alternative approach...');
      
      // Alternatif: coba buat fungsi sederhana dulu
      console.log('🔄 Creating simple function...');
      
      // Buat fungsi menggunakan pendekatan yang berbeda
      const simpleFunction = `
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
      `;
      
      console.log('📋 Please run this SQL manually in Supabase SQL Editor:');
      console.log('=' .repeat(60));
      console.log(simpleFunction);
      console.log('=' .repeat(60));
      
      return;
    }

    console.log('✅ Function created successfully!');
    
    // Test the function
    console.log('🧪 Testing function...');
    const { data: testData, error: testError } = await supabase
      .rpc('get_user_transactions', {
        p_user_id: '82eeeb46-e19a-4292-8fa1-fd8c92bdd80e',
        p_limit: 1
      });

    if (testError) {
      console.log('⚠️  Function created but test failed:', testError.message);
    } else {
      console.log('✅ Function test successful!');
      console.log('Sample data:', testData);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    
    // Fallback: tampilkan SQL untuk manual execution
    const fallbackSQL = `
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
`;
    
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
    console.log('=' .repeat(60));
    console.log(fallbackSQL);
    console.log('=' .repeat(60));
  }
}

createRPCFunction();