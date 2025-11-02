import { createClient } from '@supabase/supabase-js';

// Environment variables for server-side
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://msddbiwywzdcgaylshuf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZGRiaXd5d3pkY2dheWxzaHVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDAxNzg2OSwiZXhwIjoyMDY1NTkzODY5fQ.e5f3Z53H5EwrOvHP82lITGYBPQtmKUMFbEg_rR9T1dE';
const ADMIN_SECRET = process.env.VITE_ADMIN_SECRET_KEY || 'admin_wallet_approval_2024';

// Create Supabase client with service role key (server-side only)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-secret');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Check admin authentication
  const adminSecret = req.headers['x-admin-secret'];
  if (adminSecret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        if (req.query.action === 'topup-requests') {
          const { status } = req.query;
          
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
            return res.status(500).json({ error: error.message });
          }

          return res.status(200).json({ success: true, requests: data });
        }

        if (req.query.action === 'stats') {
          const { data, error } = await supabase
            .from('topup_requests')
            .select('status, amount');

          if (error) {
            return res.status(500).json({ error: error.message });
          }

          const stats = {
            totalPending: data.filter(r => r.status === 'pending').length,
            totalApproved: data.filter(r => r.status === 'approved').length,
            totalRejected: data.filter(r => r.status === 'rejected').length,
            pendingAmount: data
              .filter(r => r.status === 'pending')
              .reduce((sum, r) => sum + r.amount, 0)
          };

          return res.status(200).json({ success: true, stats });
        }

        if (req.query.action === 'test-connection') {
          // Test basic connection
          const { data: testData, error: testError } = await supabase
            .from('topup_requests')
            .select('count')
            .limit(1);

          if (testError) {
            return res.status(500).json({ 
              success: false, 
              error: testError.message,
              details: 'Failed to connect to topup_requests table'
            });
          }

          // Get counts
          const { data: topupData, error: topupError } = await supabase
            .from('topup_requests')
            .select('*');

          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*');

          return res.status(200).json({
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
          });
        }

        break;

      case 'PUT':
        if (req.query.action === 'update-status') {
          const { id, status, admin_notes } = req.body;

          if (!id || !status) {
            return res.status(400).json({ error: 'Missing required fields' });
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
            return res.status(500).json({ error: error.message });
          }

          return res.status(200).json({ success: true, request: data[0] });
        }
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}