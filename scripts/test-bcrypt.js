import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBcrypt() {
  try {
    console.log('🧪 Testing bcrypt functionality...');
    
    // Test password
    const testPassword = '090909';
    
    // Get all users from database first
    const { data: allUsers, error: allError } = await supabase
      .from('admin_users')
      .select('email, password, is_active');
    
    console.log('👥 All users:', allUsers);
    console.log('❌ All users error:', allError);
    
    if (allUsers && allUsers.length > 0) {
      const user = allUsers.find(u => u.email === 'asd@mail.com');
      
      if (!user) {
        console.error('❌ User asd@mail.com not found');
        return;
      }
      
      console.log('👤 User found:', user.email);
      console.log('🔐 Stored hash:', user.password);
      console.log('🔑 Test password:', testPassword);
      console.log('✅ Is active:', user.is_active);
      
      // Test bcrypt compare
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log('✅ Password match:', isValid);
      
      // Test with wrong password
      const isInvalid = await bcrypt.compare('wrongpassword', user.password);
      console.log('❌ Wrong password match:', isInvalid);
      
      // Test hash generation
      const newHash = await bcrypt.hash(testPassword, 12);
      console.log('🆕 New hash:', newHash);
      
      const newHashValid = await bcrypt.compare(testPassword, newHash);
      console.log('✅ New hash valid:', newHashValid);
    }
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
}

testBcrypt();