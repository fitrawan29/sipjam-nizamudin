import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function fullScan() {
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

  const allTables = [
    'bank_dokumen',
    'data_guru',
    'data_mapel',
    'data_siswa',
    'guru_mapel',
    'jadwal_pelajaran',
    'jadwal_piket',
    'jurnal_pembelajaran',
    'kalender_pendidikan',
    'laporan_piket',
    'pengaturan',
    'presensi_guru',
    'presensi_siswa',
    'riwayat_backup',
    'users',
    'guru_kelas',
    'wali_kelas',
    'absensi',
    'tujuan_pembelajaran',
    'asesmen_kolom',
    'nilai_siswa',
    'capaian_pembelajaran',
    'push_subscriptions',
    'chat_messages',
    'pengumuman_dibaca',
    'syarat_perangkat_pembelajaran',
    'piket_form_lock'
  ];

  console.log('=== ADVERSARIAL FULL DATABASE SCAN ===');
  const findings: Array<{ table: string; issue: string; row: any }> = [];

  for (const table of allTables) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        // Table may not exist or permission denied
        continue;
      }
      for (const row of data || []) {
        const str = JSON.stringify(row);
        if (str.includes('FITRA SURYAZANA MAMONTO')) {
          findings.push({ table, issue: 'Contains uppercase FITRA SURYAZANA MAMONTO', row });
        }
        if (str.toLowerCase().includes('ahmad dahlan')) {
          findings.push({ table, issue: 'Contains Ahmad Dahlan', row });
        }
      }
    } catch (e: any) {
      console.error(`Error scanning ${table}:`, e.message);
    }
  }

  console.log(`Scan completed. Total findings: ${findings.length}`);
  for (const f of findings) {
    console.log(`[FINDING] Table: ${f.table} | Issue: ${f.issue} | Data:`, JSON.stringify(f.row));
  }
}

fullScan().catch(console.error);
