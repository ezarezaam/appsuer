import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

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

// SMTP config for production emails
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = (process.env.SMTP_SECURE || '').toLowerCase() === 'true' || SMTP_PORT === 465;
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@evenoddpro.com';
const EMAIL_LOCALE = (process.env.EMAIL_LOCALE || 'en').toLowerCase();
const EMAIL_CURRENCY = process.env.EMAIL_CURRENCY || 'USD';

const isUuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const ALLOWED_SUBSCRIPTION_STATUSES = new Set(['PENDING', 'ACTIVE', 'INACTIVE', 'CANCELLED', 'SUSPENDED', 'EXPIRED']);

const normalizeSubscriptionStatus = (rawStatus) => {
  const value = String(rawStatus || '').trim().toUpperCase();
  const aliases = {
    CANCELED: 'CANCELLED'
  };
  return aliases[value] || value;
};

let mailer = null;
try {
  if (SMTP_HOST && SMTP_PORT && SMTP_FROM && (SMTP_USER ? SMTP_PASS : true)) {
    mailer = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      tls: { rejectUnauthorized: false }
    });
    console.log('✅ SMTP transporter initialized');
  } else {
    console.warn('⚠️ SMTP not fully configured; emails will be skipped');
  }
} catch (e) {
  console.warn('⚠️ Failed to initialize SMTP transporter:', e?.message || e);
}

async function sendTopupStatusEmail({ to, name, status, amount, paymentMethod, currency, notes }) {
  if (!mailer) {
    return { success: false, skipped: true, error: 'SMTP not configured' };
  }

  const isIndonesian = EMAIL_LOCALE === 'id' || EMAIL_LOCALE === 'id-id';
  const effectiveCurrency = currency || EMAIL_CURRENCY;
  const amountStr = Number(amount).toLocaleString(isIndonesian ? 'id-ID' : 'en-US');

  const subject = (() => {
    if (isIndonesian) {
      return status === 'approved'
        ? 'Top-up Anda Disetujui'
        : status === 'rejected'
          ? 'Top-up Anda Ditolak'
          : `Status Top-up: ${status}`;
    }
    return status === 'approved'
      ? 'Your Top-up Has Been Approved'
      : status === 'rejected'
        ? 'Your Top-up Has Been Rejected'
        : `Top-up Status: ${status}`;
  })();

  const html = (() => {
    if (isIndonesian) {
      return `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #2c3e50;">${subject}</h2>
          <p>Halo${name ? ` ${name}` : ''},</p>
          <p>Permintaan top-up Anda telah diperbarui dengan status: <strong>${status.toUpperCase()}</strong>.</p>
          <ul>
            <li>Jumlah: <strong>${effectiveCurrency} ${amountStr}</strong></li>
            <li>Metode Pembayaran: <strong>${paymentMethod || '-'}</strong></li>
          </ul>
          ${notes ? `<p>Catatan admin: ${notes}</p>` : ''}
          <p>Terima kasih telah menggunakan EvenOddPro.</p>
        </div>
      `;
    }
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2c3e50;">${subject}</h2>
        <p>Hello${name ? ` ${name}` : ''},</p>
        <p>Your top-up request has been updated with status: <strong>${status.toUpperCase()}</strong>.</p>
        <ul>
          <li>Amount: <strong>${effectiveCurrency} ${amountStr}</strong></li>
          <li>Payment Method: <strong>${paymentMethod || '-'}</strong></li>
        </ul>
        ${notes ? `<p>Admin notes: ${notes}</p>` : ''}
        <p>Thank you for using EvenOddPro.</p>
      </div>
    `;
  })();

  try {
    await mailer.sendMail({ from: SMTP_FROM, to, subject, html });
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
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

        if (queryParams.action === 'subscriptions') {
          console.log('📬 Subscriptions request received');
          const { data: subscriptions, error: subscriptionsError } = await supabase
            .from('user_subscriptions')
            .select('*')
            .order('created_at', { ascending: false });

          if (subscriptionsError) {
            console.error('❌ Error fetching subscriptions:', subscriptionsError.message);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: subscriptionsError.message })
            };
          }
          console.log(`✅ Fetched ${subscriptions?.length || 0} subscriptions`);

          // Fetch user profiles for these subscriptions
          const subUserIds = [...new Set(subscriptions.map(s => s.user_id).filter(Boolean))];
          let subUserData = [];

          if (subUserIds.length > 0) {
            const { data: users, error: userError } = await supabase
              .from('user_profiles')
              .select('id, full_name, user_email')
              .in('id', subUserIds);

            if (!userError) {
              subUserData = users || [];
            }
          }

          const enrichedSubscriptions = subscriptions.map(sub => {
            const profile = subUserData.find(u => u.id === sub.user_id) || {};
            return {
              ...sub,
              full_name: profile.full_name || 'EvenOddPro User',
              user_email: profile.user_email || `user-${String(sub.user_id).slice(0, 8)}@evenoddpro.com`
            };
          });

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, subscriptions: enrichedSubscriptions })
          };
        }

        if (queryParams.action === 'search-users') {
          const { query: searchQuery } = queryParams;
          if (!searchQuery) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Search query is required' })
            };
          }

          console.log(`🔍 Searching for users in profiles with query: ${searchQuery}`);

          const q = String(searchQuery).trim().replaceAll(',', ' ');
          const like = `%${q}%`;
          let queryBuilder = supabase
            .from('user_profiles')
            .select('id, full_name, user_email, email')
            .limit(10);

          if (isUuid(q)) {
            queryBuilder = queryBuilder.eq('id', q);
          } else if (q.includes('@')) {
            queryBuilder = queryBuilder.ilike('user_email', like);
          } else {
            queryBuilder = queryBuilder.ilike('full_name', like);
          }

          const { data: profileMatches, error: profileError } = await queryBuilder;
          if (profileError) {
            console.error('❌ Error searching users:', profileError.message);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: profileError.message })
            };
          }

          const resultsById = new Map();
          for (const u of (profileMatches || [])) {
            resultsById.set(u.id, {
              user_id: u.id,
              full_name: u.full_name ?? null,
              user_email: u.user_email ?? u.email ?? null
            });
          }

          if (resultsById.size < 10) {
            const qLower = q.toLowerCase();
            for (let page = 1; page <= 3 && resultsById.size < 10; page += 1) {
              const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
              if (error) {
                console.error('❌ Error listing auth users:', error.message);
                break;
              }

              const users = data?.users || [];
              for (const user of users) {
                if (resultsById.size >= 10) break;
                const email = (user.email || '').toLowerCase();
                const id = (user.id || '').toLowerCase();
                const name = (user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.fullName || '').toLowerCase();

                if (!email.includes(qLower) && !id.includes(qLower) && !name.includes(qLower)) continue;
                if (resultsById.has(user.id)) continue;

                resultsById.set(user.id, {
                  user_id: user.id,
                  full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.fullName || null,
                  user_email: user.email || null
                });
              }
            }
          }

          const formattedResults = Array.from(resultsById.values()).slice(0, 10);

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, users: formattedResults })
          };
        }

        if (queryParams.action === 'subscription-plans') {
          console.log('📋 Fetching subscription plans');
          const { data: plans, error: plansError } = await supabase
            .from('subscription_plans')
            .select('*')
            .order('price', { ascending: true });

          if (plansError) {
            console.error('❌ Error fetching plans:', plansError.message);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: plansError.message })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, plans: plans || [] })
          };
        }

        // Default fallback for GET
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid or missing action' })
        };

      case 'POST':
        if (queryParams.action === 'update-subscription') {
          const { id, status, current_period_start, current_period_end, plan_id } = body;

          if (!id) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Missing subscription ID' })
            };
          }

          const updateData = {
            updated_at: new Date().toISOString()
          };

          if (status) {
            const normalizedStatus = normalizeSubscriptionStatus(status);
            if (!ALLOWED_SUBSCRIPTION_STATUSES.has(normalizedStatus)) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: `Invalid subscription status: ${status}` })
              };
            }
            updateData.status = normalizedStatus;
          }
          if (current_period_start) updateData.current_period_start = current_period_start;
          if (current_period_end) updateData.current_period_end = current_period_end;
          if (plan_id) updateData.plan_id = plan_id;

          console.log(`📝 Updating subscription ${id}:`, updateData);

          const { data, error } = await supabase
            .from('user_subscriptions')
            .update(updateData)
            .eq('id', id)
            .select();

          if (error) {
            console.error('❌ Error updating subscription:', error.message);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: error.message })
            };
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, subscription: data[0] })
          };
        }

        if (queryParams.action === 'add-subscription') {
          const { user_id, plan_id, status, current_period_start, current_period_end } = body;

          if (!user_id || !plan_id || !status || !current_period_start || !current_period_end) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Missing required fields' })
            };
          }

          let resolvedUserId = String(user_id).trim();
          const resolvedPlanId = String(plan_id).trim();

          if (!isUuid(resolvedUserId) && resolvedUserId.includes('@')) {
            const emailValue = resolvedUserId;

            const profileOrWithEmail = `user_email.ilike.%${emailValue}%,email.ilike.%${emailValue}%`;
            const profileOrWithUserEmailOnly = `user_email.ilike.%${emailValue}%`;
            const profileOrWithEmailOnly = `email.ilike.%${emailValue}%`;

            const profileQueries = [
              () => supabase.from('user_profiles').select('id').or(profileOrWithEmail).limit(1),
              () => supabase.from('user_profiles').select('id').or(profileOrWithUserEmailOnly).limit(1),
              () => supabase.from('user_profiles').select('id').or(profileOrWithEmailOnly).limit(1),
            ];

            for (const run of profileQueries) {
              const { data, error } = await run();
              if (!error) {
                const found = (data || [])[0];
                if (found?.id) resolvedUserId = found.id;
                break;
              }
              const message = String(error.message || '').toLowerCase();
              const isMissingColumn = message.includes('does not exist');
              if (!isMissingColumn) {
                console.error('❌ Error resolving user by email:', error.message);
                return {
                  statusCode: 500,
                  headers,
                  body: JSON.stringify({ error: error.message })
                };
              }
            }
          }

          if (!isUuid(resolvedUserId)) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'User ID harus UUID yang valid' })
            };
          }

          const { data: planExists, error: planCheckError } = await supabase
            .from('subscription_plans')
            .select('id')
            .eq('id', resolvedPlanId)
            .limit(1);

          if (planCheckError) {
            console.error('❌ Error checking plan:', planCheckError.message);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: planCheckError.message })
            };
          }

          if (!planExists || planExists.length === 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Plan ID tidak ditemukan' })
            };
          }

          const { data: profileExists, error: profileCheckError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', resolvedUserId)
            .limit(1);

          if (profileCheckError) {
            console.error('❌ Error checking user profile:', profileCheckError.message);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: profileCheckError.message })
            };
          }

          if (!profileExists || profileExists.length === 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'User UUID tidak ditemukan di user_profiles' })
            };
          }

          console.log(`➕ Adding new subscription for user ${resolvedUserId}:`, { plan_id: resolvedPlanId, status });
          const normalizedStatus = normalizeSubscriptionStatus(status);
          if (!ALLOWED_SUBSCRIPTION_STATUSES.has(normalizedStatus)) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: `Invalid subscription status: ${status}` })
            };
          }

          const { data, error } = await supabase
            .from('user_subscriptions')
            .insert({
              user_id: resolvedUserId,
              plan_id: resolvedPlanId,
              status: normalizedStatus,
              current_period_start,
              current_period_end,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select();

          if (error) {
            console.error('❌ Error adding subscription:', error.message);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: error.message })
            };
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, subscription: data[0] })
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

          // First, get the topup request details
          const { data: topupRequest, error: fetchError } = await supabase
            .from('topup_requests')
            .select('*')
            .eq('id', id)
            .single();

          if (fetchError) {
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: fetchError.message })
            };
          }

          if (!topupRequest) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Topup request not found' })
            };
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
                  p_created_by: null
                });

              if (balanceError) {
                console.error('Balance update error:', balanceError);
                return {
                  statusCode: 500,
                  headers,
                  body: JSON.stringify({
                    error: 'Failed to update user balance: ' + balanceError.message
                  })
                };
              }

              // Check if balance update was successful
              if (!balanceResult || !balanceResult.success) {
                console.error('Balance update failed:', balanceResult);
                return {
                  statusCode: 500,
                  headers,
                  body: JSON.stringify({
                    error: 'Failed to update user balance: ' + (balanceResult?.error || 'Unknown error')
                  })
                };
              }

              console.log('Balance updated successfully:', balanceResult);
            } catch (balanceUpdateError) {
              console.error('Balance update exception:', balanceUpdateError);
              return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                  error: 'Failed to update user balance: ' + balanceUpdateError.message
                })
              };
            }
          }

          // Update the topup request status
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

          // Attempt to send email notification using auth.admin
          let emailResult = { success: false, skipped: true };
          try {
            const updatedRequest = data?.[0] || topupRequest;
            const userId = updatedRequest?.user_id || topupRequest.user_id;

            // Get user full name from profile
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
            } catch (_) { }

            // Get email from auth users via admin API (requires service role)
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
                currency: updatedRequest?.payment_currency ?? topupRequest.payment_currency ?? EMAIL_CURRENCY,
                notes: admin_notes,
              });
            }
          } catch (e) {
            console.warn('⚠️ Email notification failed:', e?.message || e);
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              request: data[0],
              email_sent: !!emailResult?.success,
              email_error: emailResult?.error,
              message: status === 'approved' ? 'Topup approved and balance updated successfully' : 'Status updated successfully'
            })
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
