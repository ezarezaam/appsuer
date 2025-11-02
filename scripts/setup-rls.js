import pkg from 'pg';
import dotenv from 'dotenv';

const { Client } = pkg;

// Load environment variables
dotenv.config();

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupRLS() {
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check current RLS status
    const rlsCheck = await client.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relname = 'admin_users';
    `);
    
    console.log('🔒 Current RLS status:', rlsCheck.rows[0]);

    // Disable RLS for admin_users table (for now, to allow access)
    console.log('🔓 Disabling RLS for admin_users table...');
    await client.query('ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;');
    
    // Or alternatively, create a policy that allows all access
    console.log('📝 Creating permissive policy...');
    
    // Drop existing policies if any
    try {
      await client.query('DROP POLICY IF EXISTS "Allow all access" ON admin_users;');
    } catch (e) {
      // Policy might not exist, that's ok
    }
    
    // Enable RLS
    await client.query('ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;');
    
    // Create policy that allows all operations
    await client.query(`
      CREATE POLICY "Allow all access" ON admin_users
      FOR ALL
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
    `);

    console.log('✅ RLS setup completed');

    // Test access
    console.log('🧪 Testing access...');
    const testQuery = await client.query('SELECT email FROM admin_users LIMIT 1;');
    console.log('✅ Test query successful:', testQuery.rows[0]);

  } catch (error) {
    console.error('💥 RLS setup error:', error);
  } finally {
    await client.end();
    console.log('🔌 Disconnected from PostgreSQL');
  }
}

setupRLS();