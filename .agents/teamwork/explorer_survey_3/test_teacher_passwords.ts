import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function testTeacherLogins() {
  const client = createClient(supabaseUrl, supabaseKey);

  const usernames = ['Riski', 'Adnan', 'Fitra', 'Saskia', 'Ambar', 'Venda', 'Assyfa', 'Rohani', 'Susana', 'Fitri', 'Fitrawan', 'Tika', 'Dinda'];
  const commonPasswords = ['password', '123456', 'guru123', 'Password123!', '12345678', 'admin', 'Riski', 'Adnan', 'Fitra'];

  for (const u of usernames) {
    let found = false;
    for (const p of [u, u.toLowerCase(), '123456', 'password', 'guru123', 'admin', 'Password123!']) {
      const { data } = await client.rpc('verify_login', { p_username: u, p_password: p });
      if (data && data.length > 0) {
        console.log(`FOUND password for ${u}: "${p}" -> role: ${data[0].role}`);
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`Could not find password for ${u} in quick dictionary`);
    }
  }

  process.exit(0);
}

testTeacherLogins();
