import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_SECRET = process.env.VITE_ADMIN_SECRET_KEY;

// Create Supabase client
let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
} catch (error) {
  console.error('Failed to create Supabase client:', error);
  supabase = null;
}

export const handler = async (event, context) => {
  const headers = {
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

  // Verify admin authentication
  const adminSecret = event.headers['x-admin-secret'];
  if (adminSecret !== ADMIN_SECRET) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  // Check if Supabase client is initialized
  if (!supabase) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Database connection failed' })
    };
  }

  try {
    const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path}`, 'https://example.com');
    const action = url.searchParams.get('action');
    const statsParam = url.searchParams.get('stats');

    // Handle different actions
    if (action === 'test-connection') {
      const { data, error } = await supabase
        .from('topup_requests')
        .select('id')
        .limit(1);

      if (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: error.message 
          })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'Connection successful',
          records: data?.length || 0
        })
      };
    }

    // Lightweight stats endpoint
    if (action === 'stats' || statsParam === 'true') {
      const { data, error } = await supabase
        .from('topup_requests')
        .select('status, amount');

      if (error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: 'Failed to fetch stats',
            details: error.message
          })
        };
      }

      const totals = { totalPending: 0, totalApproved: 0, totalRejected: 0, pendingAmount: 0 };
      for (const row of data || []) {
        if (row.status === 'pending') {
          totals.totalPending++;
          totals.pendingAmount += Number(row.amount) || 0;
        } else if (row.status === 'approved') {
          totals.totalApproved++;
        } else if (row.status === 'rejected') {
          totals.totalRejected++;
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, stats: totals })
      };
    }

    // Default action: get all topup requests - LIGHTWEIGHT VERSION
    console.log('📋 Fetching topup requests (lite version)...');
    
    // Get only basic data first, without user join
    const { data: requests, error: requestsError } = await supabase
      .from('topup_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50); // Limit to prevent timeout

    if (requestsError) {
      console.error('Error fetching requests:', requestsError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to fetch requests',
          details: requestsError.message 
        })
      };
    }

    // Get unique user IDs
    const userIds = [...new Set(requests.map(r => r.user_id))];
    
    // Fetch user data separately for better performance
    let users = [];
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, user_email, full_name')
        .in('id', userIds);
      
      if (!usersError) {
        users = usersData || [];
      }
    }

    // Combine data using UI-compatible key: user_profile
    const requestsWithUsers = requests.map(request => ({
      ...request,
      user_profile: users.find(u => u.id === request.user_id) || {
        id: request.user_id,
        email: `user-${String(request.user_id).slice(0, 8)}@evenoddpro.com`,
        full_name: 'EvenOddPro User'
      }
    }));

    console.log(`✅ Successfully fetched ${requestsWithUsers.length} requests`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        requests: requestsWithUsers,
        total: requestsWithUsers.length
      })
    };

  } catch (error) {
    console.error('❌ Admin API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};