import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function fixJadwalPiket() {
  const baseClient = createClient(supabaseUrl, supabaseKey);

  let sessionToken: string | null = null;
  try {
    const { data: loginData } = await baseClient.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'SipjamSuperAdmin2026!'
    });
    if (loginData && loginData[0]?.session_token) {
      sessionToken = loginData[0].session_token;
    }
  } catch (err) {
    console.warn('Superadmin auth warning:', err);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        ...(sessionToken ? { 'x-session-token': sessionToken } : {})
      }
    }
  });

  console.log('--- FIXING JADWAL_PIKET TABLE IN SUPABASE ---');

  const { data: rows, error: getErr } = await supabase.from('jadwal_piket').select('*');
  if (getErr) throw getErr;

  for (const row of rows || []) {
    if (typeof row.daftar_guru === 'string' && row.daftar_guru.includes('FITRA SURYAZANA MAMONTO')) {
      const updatedDaftar = row.daftar_guru.replace(/FITRA SURYAZANA MAMONTO/g, 'Fitra Suryazana Mamonto');
      console.log(`Updating row ${row.id} (${row.hari}): "${row.daftar_guru}" -> "${updatedDaftar}"`);

      const { data: updateRes, error: updErr } = await supabase
        .from('jadwal_piket')
        .update({ daftar_guru: updatedDaftar })
        .eq('id', row.id)
        .select();

      if (updErr) {
        console.error(`Error updating row ${row.id}:`, updErr);
        throw updErr;
      }
      console.log(`Successfully updated row ${row.id}:`, updateRes);
    }
  }

  // Verify
  const { data: afterRows } = await supabase.from('jadwal_piket').select('*');
  console.log('Updated jadwal_piket rows:');
  console.log(afterRows);
}

fixJadwalPiket().catch(console.error);
