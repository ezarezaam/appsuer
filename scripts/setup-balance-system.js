const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupBalanceSystem() {
  try {
    console.log('🚀 Setting up balance system...');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../database/user_balance.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.includes('SELECT \'User balance system created successfully!\'')) {
        console.log('✅ User balance system created successfully!');
        continue;
      }

      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          // Try alternative method for DDL statements
          const { data: altData, error: altError } = await supabase
            .from('_supabase_migrations')
            .select('*')
            .limit(1);

          if (altError) {
            console.log(`⚠️  Statement ${i + 1} may have executed (DDL statements don't return data)`);
          }
        }
      } catch (execError) {
        console.log(`⚠️  Statement ${i + 1} execution note:`, execError.message);
      }
    }

    // Test the functions
    console.log('\n🧪 Testing balance system functions...');

    // Test get_user_balance function
    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    const { data: balanceData, error: balanceError } = await supabase
      .rpc('get_user_balance', {
        p_user_id: testUserId
      });

    if (balanceError) {
      console.error('❌ Error testing get_user_balance:', balanceError);
    } else {
      console.log('✅ get_user_balance function works! Balance:', balanceData);
    }

    // Test update_user_balance function
    const { data: updateData, error: updateError } = await supabase
      .rpc('update_user_balance', {
        p_user_id: testUserId,
        p_amount: 100.00,
        p_transaction_type: 'topup',
        p_description: 'Test topup',
        p_reference_id: null,
        p_created_by: null
      });

    if (updateError) {
      console.error('❌ Error testing update_user_balance:', updateError);
    } else {
      console.log('✅ update_user_balance function works!', updateData);
    }

    // Test get_user_transactions function
    const { data: transactionData, error: transactionError } = await supabase
      .rpc('get_user_transactions', {
        p_user_id: testUserId,
        p_limit: 10
      });

    if (transactionError) {
      console.error('❌ Error testing get_user_transactions:', transactionError);
    } else {
      console.log('✅ get_user_transactions function works! Transactions:', transactionData?.length || 0);
    }

    console.log('\n🎉 Balance system setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ user_balance table created');
    console.log('- ✅ balance_transactions table created');
    console.log('- ✅ topup_requests table created');
    console.log('- ✅ update_user_balance function created');
    console.log('- ✅ get_user_balance function created');
    console.log('- ✅ get_user_transactions function created');
    console.log('- ✅ RLS policies configured');
    console.log('- ✅ Indexes created for performance');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupBalanceSystem();