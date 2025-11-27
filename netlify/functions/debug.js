import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_SECRET = process.env.VITE_ADMIN_SECRET_KEY;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = (process.env.SMTP_SECURE || '').toLowerCase() === 'true' || SMTP_PORT === 465;
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@evenoddpro.com';

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  // Simple auth check
  const adminSecret = event.headers['x-admin-secret'];
  if (adminSecret !== ADMIN_SECRET) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    console.log('🔍 Debug check started');
    
    // Check environment variables
    const envCheck = {
      supabase_url: !!SUPABASE_URL,
      supabase_service_key: !!SUPABASE_SERVICE_KEY,
      admin_secret: !!ADMIN_SECRET,
      supabase_url_value: SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : null,
      smtp_host: !!SMTP_HOST,
      smtp_port: SMTP_PORT,
      smtp_secure: SMTP_SECURE,
      smtp_user: !!SMTP_USER,
      smtp_from: SMTP_FROM
    };

    // Test basic connection without heavy queries
    let connectionTest = null;
    let supabase = null;
    
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      try {
        supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        
        // Simple connection test - just check if we can connect
        const { data, error } = await supabase
          .from('topup_requests')
          .select('id')
          .limit(1);
          
        connectionTest = {
          success: !error,
          error: error ? error.message : null,
          error_code: error ? error.code : null,
          data_count: data ? data.length : 0
        };
        
      } catch (connError) {
        connectionTest = {
          success: false,
          error: connError.message,
          type: 'connection_error'
        };
      }
    }

    // Optional SMTP verification
    let smtpVerify = null;
    const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path}`, 'https://example.com');
    const smtpParam = url.searchParams.get('smtp');
    if (smtpParam === 'verify' && SMTP_HOST && SMTP_FROM && (SMTP_USER ? SMTP_PASS : true)) {
      try {
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_SECURE,
          auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
          tls: { rejectUnauthorized: false }
        });

        const ok = await transporter.verify();
        smtpVerify = { success: true, verify_ok: ok };
      } catch (e) {
        smtpVerify = { success: false, error: e?.message || String(e) };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        environment: envCheck,
        connection_test: connectionTest,
        smtp_verify: smtpVerify,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime()
      })
    };

  } catch (error) {
    console.error('❌ Debug error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Debug failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};
