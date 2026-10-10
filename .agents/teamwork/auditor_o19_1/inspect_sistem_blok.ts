import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

async function main() {
  const { supabase, setServerTenantContext } = await import('../../../src/lib/supabaseClient');
  
  const defaultSekolahId = 'a0000000-0000-0000-0000-000000000001';
  let sessionToken = 'deb40d1b-ce7f-4424-9d58-b98d47d62edf';
  try {
    const { data: loginData } = await supabase.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: process.env.SUPERADMIN_API_PASSWORD || 'SipjamSuperAdmin2026!'
    });
    if (loginData && loginData[0]?.session_token) {
      sessionToken = loginData[0].session_token;
    }
  } catch (err) {
    console.warn('verify_login warning:', err);
  }

  setServerTenantContext({
    sekolahId: defaultSekolahId,
    role: 'Admin',
    userId: 'd23141e4-2116-4946-8094-895ef21a50e5',
    sessionToken
  });

  const { data, error } = await supabase.from('sistem_blok').select('*');
  console.log('Error:', error);
  console.log('Total sistem_blok records in remote DB:', data?.length);
  console.log('Records:', JSON.stringify(data, null, 2));
}

main();
