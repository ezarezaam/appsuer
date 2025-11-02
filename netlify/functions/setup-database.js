import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Verify admin authentication
  const ADMIN_SECRET = process.env.VITE_ADMIN_SECRET_KEY;
  const adminSecret = event.headers['x-admin-secret'];
  if (adminSecret !== ADMIN_SECRET) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  // Check environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Missing environment variables',
        details: {
          supabase_url: !!SUPABASE_URL,
          service_key: !!SUPABASE_SERVICE_KEY
        }
      })
    };
  }

  try {
    console.log('🚀 Starting database setup...');
    
    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // SQL untuk membuat tabel topup_requests
    const createTableSQL = `
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

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_topup_requests_user_id ON topup_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_topup_requests_status ON topup_requests(status);
      CREATE INDEX IF NOT EXISTS idx_topup_requests_created_at ON topup_requests(created_at DESC);

      -- Enable RLS
      ALTER TABLE topup_requests ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies
      CREATE POLICY "Users can insert their own topup requests" ON topup_requests
        FOR INSERT WITH CHECK (auth.uid() = user_id);

      CREATE POLICY "Users can view their own topup requests" ON topup_requests
        FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can update their own pending requests" ON topup_requests
        FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

      CREATE POLICY "Service role can manage all topup requests" ON topup_requests
        FOR ALL USING (auth.role() = 'service_role');

      -- Create trigger for updated_at
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_topup_requests_updated_at 
        BEFORE UPDATE ON topup_requests 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    // Execute SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    });

    // If rpc doesn't work, try direct query
    if (error) {
      console.log('Trying alternative method...');
      
      // Check if table exists
      const { data: tableExists } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'topup_requests');

      if (!tableExists || tableExists.length === 0) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Table creation failed',
            details: 'Please run the SQL manually in Supabase dashboard',
            sql: createTableSQL
          })
        };
      }
    }

    // Verify table was created
    const { data: verifyData, error: verifyError } = await supabase
      .from('topup_requests')
      .select('id')
      .limit(1);

    if (verifyError) {
      console.error('❌ Table verification failed:', verifyError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Table verification failed',
          details: verifyError.message
        })
      };
    }

    console.log('✅ Database setup completed successfully');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Database setup completed successfully',
        table: 'topup_requests',
        verified: verifyData !== null
      })
    };

  } catch (error) {
    console.error('❌ Database setup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Database setup failed',
        details: error.message
      })
    };
  }
};