import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

console.log('🔧 Environment check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
console.log('VITE_SUPABASE_SERVICE_ROLE_KEY:', process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
console.log('SMTP_HOST:', process.env.SMTP_HOST ? 'Set' : 'Not set');
console.log('SMTP_PORT:', process.env.SMTP_PORT ? process.env.SMTP_PORT : 'Not set');
console.log('SMTP_FROM:', process.env.SMTP_FROM ? 'Set' : 'Not set');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Environment variables for server-side
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_SECRET = process.env.VITE_ADMIN_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ADMIN_SECRET) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create Supabase client with service role key (server-side only)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Email (SMTP) configuration
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = (process.env.SMTP_SECURE || '').toLowerCase() === 'true' || SMTP_PORT === 465;
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@evenoddpro.com';

let mailer = null;
try {
  if (SMTP_HOST && SMTP_FROM) {
    mailer = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
    mailer.verify().then(() => {
      console.log('📧 SMTP transporter verified and ready');
    }).catch((err) => {
      console.warn('⚠️ SMTP transporter verification failed:', err?.message || err);
    });
  } else {
    console.warn('⚠️ SMTP not configured (missing SMTP_HOST or SMTP_FROM). Emails will be skipped.');
  }
} catch (e) {
  console.warn('⚠️ Failed to initialize SMTP transporter:', e?.message || e);
}

// Utility to send topup approval/rejection email (English content)
async function sendTopupStatusEmail({ to, name, status, amount, paymentMethod, currency, notes }) {
  if (!mailer) {
    return { success: false, skipped: true, error: 'SMTP not configured' };
  }
  const subject = status === 'approved' ? 'Wallet Top-up Approved' : 'Wallet Top-up Rejected';
  const fmtAmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(Number(amount) || 0);
  const safeName = name || 'User';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.6;">
      <p>Hi ${safeName},</p>
      <p>Your wallet top-up request has been <strong>${status.toUpperCase()}</strong>.</p>
      <ul>
        ${paymentMethod ? `<li>Payment Method: ${paymentMethod}</li>` : ''}
        <li>Amount: ${fmtAmt}</li>
        <li>Status: ${status}</li>
        ${notes ? `<li>Admin Notes: ${notes}</li>` : ''}
      </ul>
      <p>Thank you for using EvenOddPro.</p>
    </div>
  `;
  const text = `Hi ${safeName},\n\nYour wallet top-up request has been ${status.toUpperCase()}.\n\n${paymentMethod ? `Payment Method: ${paymentMethod}\n` : ''}Amount: ${fmtAmt}\nStatus: ${status}\n${notes ? `Admin Notes: ${notes}\n` : ''}\n\nThank you for using EvenOddPro.`;
  try {
    const info = await mailer.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: err?.message || 'Unknown email error' };
  }
}

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const adminSecret = req.headers['x-admin-secret'];
  if (adminSecret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// API Routes
app.get('/api/admin', authenticateAdmin, async (req, res) => {
  try {
    const { action, status } = req.query;

    switch (action) {
      case 'topup-requests':
        let query = supabase
          .from('topup_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (status && status !== 'all') {
          query = query.eq('status', status);
        }

        const { data: topupData, error: topupError } = await query;

        if (topupError) {
          console.error('Error fetching topup requests:', topupError);
          return res.status(500).json({ error: topupError.message });
        }

        // Fetch user profiles separately if needed
        const userIds = [...new Set(topupData.map(req => req.user_id).filter(Boolean))];
        let userData = [];
        
        if (userIds.length > 0) {
          const { data: users, error: userError } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .in('id', userIds);
          
          if (!userError) {
            userData = users || [];
          }
        }

        // Combine the data
        const requestsWithUsers = topupData.map(request => ({
          ...request,
          user_profile: userData.find(user => user.id === request.user_id) || null
        }));

        return res.status(200).json({ success: true, requests: requestsWithUsers });

      case 'stats':
        const { data: statsData, error: statsError } = await supabase
          .from('topup_requests')
          .select('status, amount');

        if (statsError) {
          return res.status(500).json({ error: statsError.message });
        }

        const stats = {
          totalPending: statsData.filter(r => r.status === 'pending').length,
          totalApproved: statsData.filter(r => r.status === 'approved').length,
          totalRejected: statsData.filter(r => r.status === 'rejected').length,
          pendingAmount: statsData
            .filter(r => r.status === 'pending')
            .reduce((sum, r) => sum + r.amount, 0)
        };

        return res.status(200).json({ success: true, stats });

      case 'test-connection':
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
        const { data: testTopupData, error: testTopupError } = await supabase
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
              count: testTopupData?.length || 0,
              sample: testTopupData?.[0] || null
            },
            user_profiles: {
              count: profileData?.length || 0,
              sample: profileData?.[0] || null
            }
          }
        });

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin', authenticateAdmin, async (req, res) => {
  try {
    const { action } = req.query;

    if (action === 'update-status') {
      const { id, status, admin_notes } = req.body;

      if (!id || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // First, get the topup request details
      const { data: topupRequest, error: fetchError } = await supabase
        .from('topup_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        return res.status(500).json({ error: fetchError.message });
      }

      if (!topupRequest) {
        return res.status(404).json({ error: 'Topup request not found' });
      }

      // If status is being changed to 'approved', update user balance
      if (status === 'approved' && topupRequest.status !== 'approved') {
        try {
          // Call the update_user_balance function
          const { data: balanceResult, error: balanceError } = await supabase
            .rpc('update_user_balance', {
              p_user_id: topupRequest.user_id,
              p_amount: topupRequest.amount,
              p_transaction_type: 'topup',
              p_description: `Top-up approved by admin: ${admin_notes || 'No notes'}`,
              p_reference_id: id,
              p_created_by: req.user?.id || null
            });

          if (balanceError) {
            console.error('Balance update error:', balanceError);
            return res.status(500).json({ 
              error: 'Failed to update user balance: ' + balanceError.message 
            });
          }

          // Check if balance update was successful
          if (!balanceResult || !balanceResult.success) {
            console.error('Balance update failed:', balanceResult);
            return res.status(500).json({ 
              error: 'Failed to update user balance: ' + (balanceResult?.error || 'Unknown error')
            });
          }

          console.log('Balance updated successfully:', balanceResult);
        } catch (balanceUpdateError) {
          console.error('Balance update exception:', balanceUpdateError);
          return res.status(500).json({ 
            error: 'Failed to update user balance: ' + balanceUpdateError.message 
          });
        }
      }

      // Update the topup request status
      const { data, error } = await supabase
        .from('topup_requests')
        .update({
          status,
          admin_notes,
          processed_by: req.user?.id || null,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      // Try sending email notification to the user
      let emailResult = { success: false, skipped: true };
      try {
        const updatedRequest = data?.[0] || topupRequest;
        const userId = updatedRequest?.user_id || topupRequest.user_id;

        // Get user full name
        let fullName = null;
        try {
          const { data: profileData, error: profileErr } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', userId)
            .single();
          if (!profileErr) {
            fullName = profileData?.full_name || null;
          }
        } catch (_) {}

        // Get user email from auth.admin
        let userEmail = null;
        try {
          const { data: userResp, error: userErr } = await supabase.auth.admin.getUserById(userId);
          if (!userErr) {
            userEmail = userResp?.user?.email || null;
          }
        } catch (e) {
          console.warn('⚠️ Failed to fetch auth user email:', e?.message || e);
        }

        if (userEmail) {
          emailResult = await sendTopupStatusEmail({
            to: userEmail,
            name: fullName,
            status,
            amount: updatedRequest?.amount ?? topupRequest.amount,
            paymentMethod: updatedRequest?.payment_method ?? topupRequest.payment_method,
            currency: updatedRequest?.payment_currency ?? topupRequest.payment_currency ?? 'USD',
            notes: admin_notes,
          });
        }
      } catch (e) {
        console.warn('⚠️ Email notification failed:', e?.message || e);
      }

      return res.status(200).json({ 
        success: true, 
        request: data[0],
        email_sent: !!emailResult?.success,
        email_error: emailResult?.error,
        message: status === 'approved' ? 'Topup approved and balance updated successfully' : 'Status updated successfully'
      });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user balance endpoint
app.get('/api/balance/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user balance using the function
    const { data: balance, error: balanceError } = await supabase
      .rpc('get_user_balance', {
        p_user_id: userId
      });

    if (balanceError) {
      console.error('Get balance error:', balanceError);
      return res.status(500).json({ error: balanceError.message });
    }

    // Get user balance record with details
    const { data: balanceRecord, error: recordError } = await supabase
      .from('user_balance')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (recordError && recordError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Get balance record error:', recordError);
      return res.status(500).json({ error: recordError.message });
    }

    return res.status(200).json({
      success: true,
      balance: balance || 0,
      balanceRecord: balanceRecord || null
    });
  } catch (error) {
    console.error('Get balance API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Adjust user balance (topup/deduct/refund)
app.post('/api/balance/:userId/adjust', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, transaction_type, description, reference_id } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    const validTypes = ['topup', 'deduct', 'refund'];
    if (!transaction_type || !validTypes.includes(String(transaction_type))) {
      return res.status(400).json({ error: 'Invalid transaction_type. Use topup, deduct, or refund' });
    }

    // Try RPC function first
    const { data: rpcResult, error: rpcError } = await supabase.rpc('update_user_balance', {
      p_user_id: userId,
      p_amount: Number(amount),
      p_transaction_type: String(transaction_type),
      p_description: description || null,
      p_reference_id: reference_id || null,
      p_created_by: null
    });

    if (!rpcError && rpcResult && rpcResult.success) {
      return res.status(200).json({ success: true, ...rpcResult });
    }

    // Fallback when RPC missing: perform direct table updates using service role
    if (rpcError) {
      const msg = rpcError.message || '';
      const isMissingFn = msg.includes('Could not find the function') || msg.includes('not found');
      if (!isMissingFn) {
        console.error('Adjust balance RPC error:', rpcError);
        return res.status(500).json({ error: rpcError.message });
      }
    }

    // Fetch current balance or initialize
    let currentBalance = 0;
    let balanceRecordId = null;
    const { data: balanceRecord, error: balanceFetchError } = await supabase
      .from('user_balance')
      .select('id, balance')
      .eq('user_id', userId)
      .single();

    if (balanceFetchError && balanceFetchError.code !== 'PGRST116') { // not "no rows"
      console.error('Fetch balance error:', balanceFetchError);
      return res.status(500).json({ error: balanceFetchError.message });
    }

    if (balanceRecord) {
      currentBalance = Number(balanceRecord.balance) || 0;
      balanceRecordId = balanceRecord.id;
    } else {
      const { data: created, error: createError } = await supabase
        .from('user_balance')
        .insert({ user_id: userId, balance: 0 })
        .select('id')
        .single();
      if (createError) {
        console.error('Create balance record error:', createError);
        return res.status(500).json({ error: createError.message });
      }
      currentBalance = 0;
      balanceRecordId = created?.id || null;
    }

    // Compute new balance
    const amt = Number(amount);
    let newBalance = currentBalance;
    if (transaction_type === 'topup' || transaction_type === 'refund') {
      newBalance = currentBalance + amt;
    } else if (transaction_type === 'deduct') {
      newBalance = currentBalance - amt;
      if (newBalance < 0) {
        return res.status(400).json({ error: 'Insufficient balance', current_balance: currentBalance, required_amount: amt });
      }
    }

    // Update user balance
    const { error: updateError } = await supabase
      .from('user_balance')
      .update({ balance: newBalance })
      .eq('user_id', userId);
    if (updateError) {
      console.error('Update balance error:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // Insert transaction
    const { data: txInsert, error: txError } = await supabase
      .from('balance_transactions')
      .insert({
        user_id: userId,
        transaction_type: String(transaction_type),
        amount: amt,
        balance_before: currentBalance,
        balance_after: newBalance,
        description: description || null,
        reference_id: reference_id || null,
        created_by: null
      })
      .select('id')
      .single();
    if (txError) {
      console.error('Insert transaction error:', txError);
      return res.status(500).json({ error: txError.message });
    }

    return res.status(200).json({
      success: true,
      balance_before: currentBalance,
      balance_after: newBalance,
      transaction_id: txInsert?.id || null,
      message: 'Balance updated successfully (fallback)'
    });
  } catch (error) {
    console.error('Adjust balance API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user transaction history endpoint
app.get('/api/transactions/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Try RPC first; if missing, fallback to direct table query
    const { data: transactions, error: transactionError } = await supabase
      .rpc('get_user_transactions', {
        p_user_id: userId,
        p_limit: parseInt(limit)
      });

    let txData = transactions || [];
    if (transactionError) {
      const msg = transactionError.message || '';
      const isMissingFn = msg.includes('Could not find the function') || msg.includes('not found');
      if (isMissingFn) {
        // Fallback: query balance_transactions directly using service role (RLS bypass)
        const { data: directData, error: directError } = await supabase
          .from('balance_transactions')
          .select('id, transaction_type, amount, balance_before, balance_after, description, reference_id, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(parseInt(limit));

        if (directError) {
          console.error('Fallback transactions query error:', directError);
          return res.status(500).json({ error: directError.message });
        }

        txData = directData || [];
      } else {
        console.error('Get transactions error:', transactionError);
        return res.status(500).json({ error: transactionError.message });
      }
    }

    return res.status(200).json({
      success: true,
      transactions: txData
    });
  } catch (error) {
    console.error('Get transactions API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  console.log('🔐 Login request received:', req.body);
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('🔍 Searching for admin:', email);

    // Get admin user from database
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    console.log('📊 Database query result:', { admin: admin ? 'found' : 'not found', error });

    if (error || !admin) {
      console.log('❌ Admin not found or error:', error);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('🔒 Comparing passwords...');
    
    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    
    console.log('🔑 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('✅ Login successful, updating last login...');

    // Update last login
    try {
      await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('email', email);
      console.log('✅ Last login updated');
    } catch (updateError) {
      console.warn('⚠️ Failed to update last login:', updateError);
    }

    // Return success with admin data (excluding password)
    const { password: _, ...adminData } = admin;
    console.log('🎉 Sending success response');
    return res.status(200).json({ 
      success: true, 
      admin: adminData,
      message: 'Login successful' 
    });

  } catch (error) {
    console.error('💥 Login API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Admin API server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});