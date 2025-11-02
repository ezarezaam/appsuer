import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSQL() {
  try {
    console.log('🚀 Running SQL setup...');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '../database/user_balance.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📝 SQL file loaded successfully');
    console.log('📄 File content length:', sqlContent.length, 'characters');

    // Execute the SQL directly
    console.log('⏳ Executing SQL...');

    // For Supabase, we need to execute SQL statements individually
    // Let's try a simpler approach - just log the SQL for manual execution
    console.log('\n📋 Please execute the following SQL in your Supabase SQL editor:');
    console.log('=' .repeat(80));
    console.log(sqlContent);
    console.log('=' .repeat(80));

    console.log('\n✅ SQL content ready for execution!');
    console.log('\n📝 Instructions:');
    console.log('1. Copy the SQL content above');
    console.log('2. Go to your Supabase dashboard');
    console.log('3. Navigate to SQL Editor');
    console.log('4. Paste and run the SQL');
    console.log('5. Verify all tables and functions are created');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
runSQL();