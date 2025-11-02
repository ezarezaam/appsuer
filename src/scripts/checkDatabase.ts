import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Read env vars only; do not hard-code secrets
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

// Use service role key for admin access (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkDatabase() {
  console.log('🔍 Starting comprehensive database check...');
  console.log('📍 Supabase URL:', SUPABASE_URL);
  
  try {
    // 1. Check if we can connect to Supabase
    console.log('\n1️⃣ Testing basic connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('topup_requests')
      .select('count', { count: 'exact', head: true });
    
    if (healthError) {
      console.error('❌ Connection failed:', healthError);
      return;
    }
    console.log('✅ Connection successful');

    // 2. Check topup_requests table structure
    console.log('\n2️⃣ Checking topup_requests table...');
    const { data: topupData, error: topupError, count: topupCount } = await supabase
      .from('topup_requests')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (topupError) {
      console.error('❌ topup_requests error:', topupError);
    } else {
      console.log(`✅ topup_requests table found with ${topupCount} records`);
      if (topupData && topupData.length > 0) {
        console.log('📋 Sample record structure:');
        console.log(JSON.stringify(topupData[0], null, 2));
      } else {
        console.log('📋 Table is empty');
      }
    }

    // 3. Check user_profiles table structure  
    console.log('\n3️⃣ Checking user_profiles table...');
    const { data: profileData, error: profileError, count: profileCount } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (profileError) {
      console.error('❌ user_profiles error:', profileError);
    } else {
      console.log(`✅ user_profiles table found with ${profileCount} records`);
      if (profileData && profileData.length > 0) {
        console.log('📋 Sample record structure:');
        console.log(JSON.stringify(profileData[0], null, 2));
      } else {
        console.log('📋 Table is empty');
      }
    }

    // 4. Try to list all tables (if possible)
    console.log('\n4️⃣ Attempting to list all tables...');
    try {
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_table_names'); // This might not work depending on RLS
      
      if (tablesError) {
        console.log('⚠️ Cannot list tables (this is normal due to security)');
      } else {
        console.log('📋 Available tables:', tables);
      }
    } catch (e) {
      console.log('⚠️ Table listing not available');
    }

    // 5. Check for common table variations
    console.log('\n5️⃣ Checking for table variations...');
    const tableVariations = [
      'topup_requests',
      'topup_request', 
      'top_up_requests',
      'wallet_topup_requests',
      'user_topup_requests'
    ];

    for (const tableName of tableVariations) {
      try {
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        console.log(`✅ Found table: ${tableName} (${count} records)`);
      } catch (error) {
        console.log(`❌ Table not found: ${tableName}`);
      }
    }

    // 6. Check authentication status
    console.log('\n6️⃣ Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log('⚠️ Not authenticated (using anon key)');
    } else {
      console.log('✅ Authenticated as:', user?.email || 'Anonymous');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the check
checkDatabase().then(() => {
  console.log('\n🏁 Database check completed');
}).catch(error => {
  console.error('💥 Script failed:', error);
});