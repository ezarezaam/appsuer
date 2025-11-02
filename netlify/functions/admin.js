import { createClient } from '@supabase/supabase-js';

// Environment variables for server-side (no hard-coded fallbacks)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_SECRET = process.env.VITE_ADMIN_SECRET_KEY;

// Debug logging for production
console.log('🔍 Netlify Function Debug:');
console.log('SUPABASE_URL exists:', !!SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY exists:', !!SUPABASE_SERVICE_KEY);
console.log('ADMIN_SECRET exists:', !!ADMIN_SECRET);

// Create Supabase client with service role key (server-side only)
let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log('✅ Supabase client created successfully');
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error);
  supabase = null;
}

export const handler = async (event, context) => {
  // Basic safety: prevent indexing
  const headers = {
    'X-Robots-Tag': 'noindex, nofollow',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-secret',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Log request info for debugging
  console.log('📡 Incoming request:', {
    method: event.httpMethod,
    path: event.path,
    query: event.queryStringParameters,
    headers: event.headers
  });

  // Verify required environment variables are present
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ADMIN_SECRET) {
    console.error('❌ Missing environment variables:', {
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!SUPABASE_SERVICE_KEY,
      ADMIN_SECRET: !!ADMIN_SECRET
    });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Server misconfiguration - missing environment variables',
        details: {
          supabase_url: !!SUPABASE_URL,
          service_key: !!SUPABASE_SERVICE_KEY,
          admin_secret: !!ADMIN_SECRET
        }
      })
    };
  }

  // Verify Supabase client is created
  if (!supabase) {
    console.error('❌ Supabase client is not initialized');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Database connection failed',
        details: 'Supabase client could not be initialized. Check environment variables.'
      })
    };
  }

  // Check admin authentication
  const adminSecret = event.headers['x-admin-secret'];
  if (adminSecret !== ADMIN_SECRET) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const { httpMethod } = event;
    const queryParams = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    switch (httpMethod) {
      case 'GET':
        if (queryParams.action === 'topup-requests') {
          const { status } = queryParams;
          
          console.log('📋 Fetching topup requests, status filter:', status);
          
          let query = supabase
            .from('topup_requests')
            .select(`
              *,
              user:user_profiles!user_id (
                id,
                user_email,
                full_name
              )
            `)
            .order('created_at', { ascending: false });

          if (status && status !== 'all') {
            query = query.eq('status', status);
          }

          const { data, error } = await query;

          if (error) {
            console.error('❌ Error fetching topup requests:', error);
            console.error('Error details:', {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
            
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ 
                error: error.message, 
                details: error.details,
                code: error.code,
                hint: error.hint || 'Check if topup_requests table and user_profiles table exist'
              })
            };
          }

          console.log(`✅ Successfully fetched ${data?.length || 0} topup requests`);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, requests: data || [] })
          };
        }

        if (queryParams.action === 'stats') {
          const { data, error } = await supabase
            .from('topup_requests')
            .select('status, amount');

          if (error) {
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: error.message })
            };
          }

          const stats = {
            totalPending: data.filter(r => r.status === 'pending').length,
            totalApproved: data.filter(r => r.status === 'approved').length,
            totalRejected: data.filter(r => r.status === 'rejected').length,
            pendingAmount: data
              .filter(r => r.status === 'pending')
              .reduce((sum, r) => sum + r.amount, 0)
          };

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, stats })
          };
        }

        if (queryParams.action === 'test-connection') {
          try {
            console.log('🧪 Testing database connection...');
            
            // Test database connection
            const { data: testData, error: testError } = await supabase
              .from('topup_requests')
              .select('id')
              .limit(1);

            if (testError) {
              console.error('❌ Database connection test failed:', testError);
              console.error('Error details:', {
                message: testError.message,
                code: testError.code,
                details: testError.details,
                hint: testError.hint
              });
              
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                  success: false, 
                  error: 'Database connection failed',
                  details: testError.message,
                  code: testError.code,
                  hint: 'Check if topup_requests table exists in Supabase'
                })
              };
            }

            console.log('✅ Database connection test successful');
            
            // Get counts
            const { data: topupData, error: topupError } = await supabase
              .from('topup_requests')
              .select('*');

            const { data: profileData, error: profileError } = await supabase
              .from('user_profiles')
              .select('*');

            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                connection: 'Connected successfully',
                table_exists: testData !== null,
                records_found: testData ? testData.length : 0,
                tables: {
                  topup_requests: {
                    count: topupData?.length || 0,
                    sample: topupData?.[0] || null
                  },
                  user_profiles: {
                    count: profileData?.length || 0,
                    sample: profileData?.[0] || null
                  }
                }
              })
            };
          } catch (error) {
            console.error('❌ Connection test error:', error);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ 
                success: false, 
                error: 'Connection test failed',
                details: error.message 
              })
            };
          }
        }

        break;

      case 'PUT':
        if (queryParams.action === 'update-status') {
          const { id, status, admin_notes } = body;

          if (!id || !status) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Missing required fields' })
            };
          }

          const { data, error } = await supabase
            .from('topup_requests')
            .update({
              status,
              admin_notes,
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

          if (error) {
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: error.message })
            };
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, request: data[0] })
          };
        }
        break;

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};