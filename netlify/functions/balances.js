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
    // Fetch all balances
    const { data: balances, error: balancesError } = await supabase
      .from('user_balance')
      .select('id, user_id, balance, created_at, updated_at')
      .order('balance', { ascending: false });

    if (balancesError) {
      console.error('List balances error:', balancesError);
      return { statusCode: 500, headers, body: JSON.stringify({ error: balancesError.message }) };
    }

    if (!balances || balances.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, users: [] }) };
    }

    const userIds = balances.map(b => b.user_id).filter(Boolean);

    let profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, avatar_url, user_email')
        .in('id', userIds);

      if (profilesError) {
        console.warn('Fetch profiles error:', profilesError);
      } else if (profiles) {
        profiles.forEach(p => profilesMap.set(p.id, p));
      }
    }

    const users = balances.map(b => {
      const profile = profilesMap.get(b.user_id) || {};
      return {
        ...b,
        user_email: profile.user_email || `user-${String(b.user_id).slice(0, 8)}@evenoddpro.com`,
        full_name: profile.full_name || 'EvenOddPro User',
        phone: profile.phone || '',
        avatar_url: profile.avatar_url || ''
      };
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, users }) };
  } catch (err) {
    console.error('Unhandled error in balances function:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};