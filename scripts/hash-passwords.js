import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function hashExistingPasswords() {
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

    // Get all admin users with plain text passwords
    const result = await client.query('SELECT id, email, password FROM admin_users');
    
    console.log(`Found ${result.rows.length} admin users to update...`);

    for (const user of result.rows) {
      // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
      if (user.password.startsWith('$2')) {
        console.log(`✓ Password for ${user.email} is already hashed, skipping...`);
        continue;
      }

      // Hash the plain text password
      const hashedPassword = await bcrypt.hash(user.password, 12);
      
      // Update the password in database
      await client.query(
        'UPDATE admin_users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, user.id]
      );
      
      console.log(`✅ Updated password for ${user.email}`);
    }

    console.log('\n🎉 All passwords have been hashed successfully!');

  } catch (error) {
    console.error('❌ Password hashing failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

hashExistingPasswords();