const { createClient } = require('@supabase/supabase-js');

// Environment variables (aligned with admin-lite)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_SECRET = process.env.VITE_ADMIN_SECRET_KEY || process.env.ADMIN_SECRET_KEY;

exports.handler = async (event, context) => {
  // Enable CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // Check admin secret
    const adminSecret = event.headers['x-admin-secret'];
    if (!adminSecret || adminSecret !== ADMIN_SECRET) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ success: false, error: 'Unauthorized' })
      };
    }

    // Initialize Supabase
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing environment variables',
          details: {
            has_supabase_url: !!SUPABASE_URL,
            has_service_key: !!SUPABASE_SERVICE_KEY
          }
        })
      };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get user_id from query params
    const { user_id } = event.queryStringParameters || {};

    if (!user_id) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ success: false, error: 'user_id is required' })
      };
    }

    // Simple query - just get balance, no joins
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_profiles')
      .select('id, balance')
      .eq('id', user_id)
      .single();

    if (balanceError) {
      console.error('Error fetching balance:', balanceError);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch balance',
          details: {
            message: balanceError.message,
            code: balanceError.code,
            details: balanceError.details,
            hint: balanceError.hint
          }
        })
      };
    }

    // Get recent transactions (limited to 10 for performance)
    let transactionsData = [];
    const { data: txData, error: transactionsError } = await supabase
      .from('topup_requests')
      .select('id, amount, status, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      // Don't fail the whole request if transactions fail
      transactionsData = [];
    } else {
      transactionsData = txData || [];
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        balance: balanceData.balance || 0,
        transactions: transactionsData || []
      })
    };

  } catch (error) {
    console.error('Unexpected error in balances-lite:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};