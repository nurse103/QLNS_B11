import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Testing connection...');
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error('Error connecting to database:', error.message, error.code, error.details);
  } else {
    console.log('Successfully connected. Data:', data);
  }
}

check();
