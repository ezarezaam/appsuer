import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function setupDatabase() {
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

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    // Read and execute admin_users.sql
    const adminUsersSQL = fs.readFileSync(
      path.join(__dirname, '..', 'database', 'admin_users.sql'), 
      'utf8'
    );

    console.log('Creating admin_users table...');
    await client.query(adminUsersSQL);
    console.log('✅ admin_users table created successfully!');

    // Read and execute wallet_requests.sql if it doesn't exist
    try {
      const walletRequestsSQL = fs.readFileSync(
        path.join(__dirname, '..', 'database', 'wallet_requests.sql'), 
        'utf8'
      );

      console.log('Creating wallet_requests table...');
      await client.query(walletRequestsSQL);
      console.log('✅ wallet_requests table created successfully!');
    } catch (err) {
      console.log('ℹ️  wallet_requests.sql not found or already exists');
    }

    // Verify admin users were created
    const result = await client.query('SELECT name, email, is_active FROM admin_users ORDER BY created_at');
    console.log('\n📋 Admin users created:');
    result.rows.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Active: ${user.is_active}`);
    });

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🎉 Database setup completed!');
  }
}

setupDatabase();