import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function testRoleRetrieval() {
  console.log('Testing Supabase Data Retrieval for Admin and Guru...');
  
  // 1. Raw anon client (no headers)
  const anonClient = createClient(supabaseUrl, supabaseKey);
  const { data: anonGuru, error: anonGuruErr } = await anonClient.from('data_guru').select('id, nama_guru');
  console.log('1. Anon Client (No Headers):', { rowCount: anonGuru?.length, error: anonGuruErr });

  // 2. School A Admin with only legacy headers (x-sekolah-id, x-user-role, x-user-id)
  const legacyAdminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': 'a0000000-0000-0000-0000-000000000001',
        'x-user-role': 'Admin',
        'x-user-id': 'd23141e4-2116-4946-8094-895ef21a50e5'
      }
    }
  });
  const { data: legAdminGuru, error: legAdminGuruErr } = await legacyAdminClient.from('data_guru').select('id, nama_guru');
  console.log('2. Legacy Admin (No session token, only x-user-role/x-sekolah-id):', { rowCount: legAdminGuru?.length, error: legAdminGuruErr });

  // 3. School A Guru with only legacy headers
  const legacyGuruClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': 'a0000000-0000-0000-0000-000000000001',
        'x-user-role': 'Guru',
        'x-user-id': 'f1bbf742-988a-42c4-a880-39b132ffbe4f'
      }
    }
  });
  const { data: legGuruData, error: legGuruDataErr } = await legacyGuruClient.from('data_guru').select('id, nama_guru');
  console.log('3. Legacy Guru (No session token, only x-user-role/x-sekolah-id):', { rowCount: legGuruData?.length, error: legGuruDataErr });

  // 4. Admin with x-session-token header
  // Admin session_token: b5011ca3-15b6-4edc-b467-d1b98fb4fb08
  const sessionAdminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-session-token': 'b5011ca3-15b6-4edc-b467-d1b98fb4fb08',
        'x-sekolah-id': 'a0000000-0000-0000-0000-000000000001',
        'x-user-role': 'Admin'
      }
    }
  });
  const { data: sessAdminGuru, error: sessAdminGuruErr } = await sessionAdminClient.from('data_guru').select('id, nama_guru');
  console.log('4. Session Admin (With x-session-token):', { rowCount: sessAdminGuru?.length, error: sessAdminGuruErr });

  // 5. Guru with x-session-token header
  // Guru Fitra session_token: 92b91d32-8d61-4155-b718-705de1d98f89
  const sessionGuruClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-session-token': '92b91d32-8d61-4155-b718-705de1d98f89',
        'x-sekolah-id': 'a0000000-0000-0000-0000-000000000001',
        'x-user-role': 'Guru'
      }
    }
  });
  const { data: sessGuruData, error: sessGuruDataErr } = await sessionGuruClient.from('data_guru').select('id, nama_guru');
  console.log('5. Session Guru (With x-session-token):', { rowCount: sessGuruData?.length, error: sessGuruDataErr });

  process.exit(0);
}

testRoleRetrieval();
