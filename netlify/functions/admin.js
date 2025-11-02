import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// Environment variables for server-side (no hard-coded fallbacks)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_SECRET = process.env.VITE_ADMIN_SECRET_KEY;

// Create Supabase client with service role key (server-side only)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

  // Verify required environment variables are present
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ADMIN_SECRET) {
    console.error('❌ Missing required environment variables for admin API');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server misconfiguration' })
    };
  }

  // Check admin authentication - support both JWT token and x-admin-secret
  let isAuthenticated = false;
  
  // First try JWT token authentication
  const authHeader = event.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, ADMIN_SECRET);
      if (decoded.role === 'admin') {
        isAuthenticated = true;
      }
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
    }
  }
  
  // Fallback to x-admin-secret authentication
  if (!isAuthenticated) {
    const adminSecret = event.headers['x-admin-secret'];
    if (adminSecret === ADMIN_SECRET) {
      isAuthenticated = true;
    }
  }
  
  if (!isAuthenticated) {
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
          
          let query = supabase
            .from('topup_requests')
            .select(`
              *,
              user_profiles (
                full_name,
                id
              )
            `)
            .order('created_at', { ascending: false });

          if (status && status !== 'all') {
            query = query.eq('status', status);
          }

          const { data, error } = await query;

          if (error) {
            console.error('Error fetching topup requests:', error);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: error.message })
            };
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, requests: data })
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
          // Test basic connection
          const { data: testData, error: testError } = await supabase
            .from('topup_requests')
            .select('count')
            .limit(1);

          if (testError) {
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ 
                success: false, 
                error: testError.message,
                details: 'Failed to connect to topup_requests table'
              })
            };
          }

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