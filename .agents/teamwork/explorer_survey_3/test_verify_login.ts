import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function testVerifyLogin() {
  const client = createClient(supabaseUrl, supabaseKey);

  // Test admin login
  const { data: adminData, error: adminErr } = await client.rpc('verify_login', {
    p_username: 'admin',
    p_password: 'QWerty1334#'
  });
  console.log('admin verify_login result:', JSON.stringify(adminData), adminErr);

  // What about user already logged in with OLD session stored in localStorage?
  // Old sipjam_user in localStorage before recent update had:
  // { id: '...', username: 'admin', nama: '...', role: 'Admin', sekolah_id: '...' }
  // WITHOUT session_token!
  
  process.exit(0);
}

testVerifyLogin();
