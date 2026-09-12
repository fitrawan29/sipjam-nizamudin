import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function testSchoolSpoofing() {
  console.log('Testing whether a client can impersonate School A just by passing x-sekolah-id...');

  const schoolAId = 'a0000000-0000-0000-0000-000000000001'; // SMA Nizamudin

  // Attacker client with NO credentials, NO auth, just header x-sekolah-id
  const attackerClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': schoolAId,
        'x-user-role': 'Admin'
      }
    }
  });

  const { data: guru, error: errGuru } = await attackerClient.from('data_guru').select('id, nama_guru');
  console.log('Attacker reading School A data_guru with just x-sekolah-id and x-user-role headers:', {
    count: guru?.length,
    sample: guru?.[0],
    error: errGuru
  });

  const { data: siswa, error: errSiswa } = await attackerClient.from('data_siswa').select('id, nama_siswa');
  console.log('Attacker reading School A data_siswa with just x-sekolah-id and x-user-role headers:', {
    count: siswa?.length,
    sample: siswa?.[0],
    error: errSiswa
  });
}

testSchoolSpoofing().catch(console.error);
