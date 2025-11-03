import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.ADMIN_SECRET_KEY || process.env.VITE_ADMIN_SECRET_KEY;

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ADMIN_SECRET) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Server misconfiguration', 
        details: { has_supabase_url: !!SUPABASE_URL, has_service_key: !!SUPABASE_SERVICE_KEY, has_admin_secret: !!ADMIN_SECRET } 
      })
    };
  }

  const adminSecret = event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'];
  if (adminSecret !== ADMIN_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const pathSegments = (event.path || '').split('/');
    const lastSegment = pathSegments[pathSegments.length - 1] || '';
    const potentialUserId = lastSegment && lastSegment !== 'transactions' ? lastSegment : null;
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit) || 100;

    if (potentialUserId) {
      // Try RPC first
      let txData = [];
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_transactions', { p_user_id: potentialUserId, p_limit: limit });

      if (rpcError) {
        // Fallback to direct table query on balance_transactions
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('balance_transactions')
          .select('id, user_id, transaction_type, amount, balance_before, balance_after, description, reference_id, created_at')
          .eq('user_id', potentialUserId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (fallbackError) {
          console.error('Error fetching user transactions (fallback):', fallbackError);
          return { statusCode: 500, headers, body: JSON.stringify({ error: fallbackError.message }) };
        }
        txData = fallbackData || [];
      } else {
        txData = rpcData || [];
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, transactions: txData }) };
    }

    // Global transactions
    const { data: txData, error: txError } = await supabase
      .from('balance_transactions')
      .select('id, user_id, transaction_type, amount, balance_before, balance_after, description, reference_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (txError) {
      console.error('Global transactions query error:', txError);
      return { statusCode: 500, headers, body: JSON.stringify({ error: txError.message }) };
    }

    // Enrich with minimal profile info
    const userIds = (txData || []).map(t => t.user_id).filter(Boolean);
    let profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', userIds);
      if (!profilesError && profiles) {
        profiles.forEach(p => profilesMap.set(p.id, p));
      }
    }

    const enriched = (txData || []).map(tx => ({
      ...tx,
      full_name: profilesMap.get(tx.user_id)?.full_name || null,
      user_email: `user-${String(tx.user_id).slice(0, 8)}@evenoddpro.com`
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, transactions: enriched }) };
  } catch (error) {
    console.error('Transactions API error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};