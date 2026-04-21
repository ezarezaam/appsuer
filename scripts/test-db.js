
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function test() {
  console.log('Testing subscription_plans...');
  const { data: plans, error: plansError } = await supabase.from('subscription_plans').select('*');
  if (plansError) {
    console.error('Error fetching plans:', plansError);
  } else {
    console.log('Plans found:', plans.length);
    console.log(plans);
  }

  console.log('\nTesting user_profiles...');
  const { data: profiles, error: profilesError } = await supabase.from('user_profiles').select('*').limit(5);
  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  } else {
    console.log('Profiles found:', profiles.length);
    console.log(profiles);
  }
}

test();
