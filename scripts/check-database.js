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

async function checkDatabase() {
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check if admin_users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_users'
      );
    `);
    
    console.log('📋 admin_users table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Get all users
      const users = await client.query('SELECT email, is_active, created_at FROM admin_users ORDER BY email');
      console.log('👥 Users in database:', users.rows);
      
      // Get count
      const count = await client.query('SELECT COUNT(*) FROM admin_users');
      console.log('📊 Total users:', count.rows[0].count);
    }

    // List all tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📋 All tables in public schema:');
    tables.rows.forEach(row => console.log('  -', row.table_name));

  } catch (error) {
    console.error('💥 Database error:', error);
  } finally {
    await client.end();
    console.log('🔌 Disconnected from PostgreSQL');
  }
}

checkDatabase();