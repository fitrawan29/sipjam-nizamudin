/**
 * Database Migration Script:
 * 1. Standardize user name "FITRA SURYAZANA MAMONTO" -> "Fitra Suryazana Mamonto" in users and transaction tables
 * 2. Complete removal of obsolete user/attendance records for "Drs. Ahmad Dahlan, M.Pd."
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials missing');
  process.exit(1);
}

async function getAuthenticatedSuperadminClient() {
  const baseClient = createClient(supabaseUrl, supabaseKey);

  let sessionToken: string | null = null;
  try {
    const { data: loginData } = await baseClient.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'SipjamSuperAdmin2026!'
    });
    if (loginData && loginData[0]?.session_token) {
      sessionToken = loginData[0].session_token;
      console.log('✅ Authenticated as Superadmin with session token');
    }
  } catch (err) {
    console.warn('⚠️ Superadmin login fallback warning:', err);
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        ...(sessionToken ? { 'x-session-token': sessionToken } : {})
      }
    }
  });
}

async function main() {
  console.log('========================================================================');
  console.log('🔄 EKSEKUSI PERBAIKAN DATA USER & PEMBERSIHAN DATA USANG');
  console.log('========================================================================\n');

  const supabase = await getAuthenticatedSuperadminClient();

  // --------------------------------------------------------------------------
  // R1: STANDARISASI FITRA SURYAZANA MAMONTO
  // --------------------------------------------------------------------------
  console.log('--- [R1] Standarisasi Nama: FITRA SURYAZANA MAMONTO -> Fitra Suryazana Mamonto ---');

  // R1.1: Update tabel users
  const { data: userFitraBefore, error: errUserGet } = await supabase
    .from('users')
    .select('*')
    .eq('username', 'Fitra');
  if (errUserGet) throw errUserGet;
  console.log(`Current users record for 'Fitra':`, userFitraBefore);

  const { data: userUpdateRes, error: errUserUpdate } = await supabase
    .from('users')
    .update({ nama: 'Fitra Suryazana Mamonto' })
    .eq('username', 'Fitra')
    .select();
  if (errUserUpdate) throw errUserUpdate;
  console.log(`✅ Updated users table for 'Fitra':`, userUpdateRes);

  // Also check if any other user has FITRA SURYAZANA MAMONTO
  const { error: errUserUpperUpdate } = await supabase
    .from('users')
    .update({ nama: 'Fitra Suryazana Mamonto' })
    .eq('nama', 'FITRA SURYAZANA MAMONTO');
  if (errUserUpperUpdate) console.warn('Warning updating upper nama in users:', errUserUpperUpdate);

  // R1.2: Update tabel presensi_guru
  const { data: presensiBefore } = await supabase
    .from('presensi_guru')
    .select('id, nama_guru')
    .eq('nama_guru', 'FITRA SURYAZANA MAMONTO');
  console.log(`Found ${presensiBefore?.length || 0} presensi_guru records with 'FITRA SURYAZANA MAMONTO'`);

  const { data: presensiUpdateRes, error: errPresensiUpdate } = await supabase
    .from('presensi_guru')
    .update({ nama_guru: 'Fitra Suryazana Mamonto' })
    .eq('nama_guru', 'FITRA SURYAZANA MAMONTO')
    .select();
  if (errPresensiUpdate) throw errPresensiUpdate;
  console.log(`✅ Updated ${presensiUpdateRes?.length || 0} presensi_guru records to 'Fitra Suryazana Mamonto'`);

  // R1.3: Update tabel jurnal_pembelajaran
  const { data: jurnalBefore } = await supabase
    .from('jurnal_pembelajaran')
    .select('id, nama_guru')
    .eq('nama_guru', 'FITRA SURYAZANA MAMONTO');
  console.log(`Found ${jurnalBefore?.length || 0} jurnal_pembelajaran records with 'FITRA SURYAZANA MAMONTO'`);

  const { data: jurnalUpdateRes, error: errJurnalUpdate } = await supabase
    .from('jurnal_pembelajaran')
    .update({ nama_guru: 'Fitra Suryazana Mamonto' })
    .eq('nama_guru', 'FITRA SURYAZANA MAMONTO')
    .select();
  if (errJurnalUpdate) throw errJurnalUpdate;
  console.log(`✅ Updated ${jurnalUpdateRes?.length || 0} jurnal_pembelajaran records to 'Fitra Suryazana Mamonto'`);

  // R1.4: Update tabel laporan_piket
  const { data: allPiket, error: errPiketGet } = await supabase
    .from('laporan_piket')
    .select('*');
  if (errPiketGet) throw errPiketGet;

  let piketUpdatedCount = 0;
  for (const piket of allPiket || []) {
    let needsUpdate = false;
    let newKehadiran = piket.kehadiran_guru_piket;
    let newPelapor = piket.guru_pelapor;

    if (typeof newKehadiran === 'string' && newKehadiran.includes('FITRA SURYAZANA MAMONTO')) {
      newKehadiran = newKehadiran.replace(/FITRA SURYAZANA MAMONTO/g, 'Fitra Suryazana Mamonto');
      needsUpdate = true;
    }
    if (typeof newPelapor === 'string' && newPelapor.includes('FITRA SURYAZANA MAMONTO')) {
      newPelapor = newPelapor.replace(/FITRA SURYAZANA MAMONTO/g, 'Fitra Suryazana Mamonto');
      needsUpdate = true;
    }

    if (needsUpdate) {
      const { error: errPiketUpdate } = await supabase
        .from('laporan_piket')
        .update({
          kehadiran_guru_piket: newKehadiran,
          guru_pelapor: newPelapor
        })
        .eq('id', piket.id);
      if (errPiketUpdate) throw errPiketUpdate;
      piketUpdatedCount++;
      console.log(`✅ Updated laporan_piket record ${piket.id}`);
    }
  }
  console.log(`Total laporan_piket records updated: ${piketUpdatedCount}`);

  // R1.5: Verifikasi relasi data_guru
  const { data: guruRecord, error: errGuru } = await supabase
    .from('data_guru')
    .select('*')
    .eq('nip', 'Fitra');
  if (errGuru) throw errGuru;
  console.log(`Verified data_guru for NIP 'Fitra':`, guruRecord);

  // --------------------------------------------------------------------------
  // R2: PEMBERSIHAN DRS. AHMAD DAHLAN, M.PD.
  // --------------------------------------------------------------------------
  console.log('\n--- [R2] Pembersihan Data Usang: Drs. Ahmad Dahlan, M.Pd. ---');

  // R2.1: Hapus rekaman di presensi_guru
  const { data: delPresensi, error: errDelPresensi } = await supabase
    .from('presensi_guru')
    .delete()
    .or('id.eq.e1144f72-2ec4-43f2-aebb-10a59063a906,nama_guru.eq."Drs. Ahmad Dahlan, M.Pd.",nama_guru.ilike.%Ahmad Dahlan%')
    .select();
  if (errDelPresensi) throw errDelPresensi;
  console.log(`✅ Deleted presensi_guru records for 'Drs. Ahmad Dahlan, M.Pd.':`, delPresensi);

  // R2.2: Periksa dan hapus jika ada di tabel lain
  const otherTables = ['users', 'data_guru', 'jurnal_pembelajaran', 'data_siswa'];
  for (const table of otherTables) {
    let col = 'nama';
    if (table === 'data_guru' || table === 'jurnal_pembelajaran') col = 'nama_guru';
    if (table === 'data_siswa') col = 'nama_siswa';

    const { data: delOther, error: errDelOther } = await supabase
      .from(table)
      .delete()
      .ilike(col, '%Ahmad Dahlan%')
      .select();
    if (errDelOther) console.warn(`Note checking delete on ${table}:`, errDelOther.message);
    if (delOther && delOther.length > 0) {
      console.log(`Deleted ${delOther.length} rows from ${table}`);
    }
  }

  // --------------------------------------------------------------------------
  // VERIFIKASI AKHIR DATABASE
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('🔍 VERIFIKASI AKHIR DATABASE (ACCEPTANCE CRITERIA)');
  console.log('========================================================================\n');

  // Criteria 1: Query users for FITRA SURYAZANA MAMONTO returns 0 rows, Fitra is Fitra Suryazana Mamonto
  const { data: vUsersUpper } = await supabase
    .from('users')
    .select('*')
    .eq('nama', 'FITRA SURYAZANA MAMONTO');
  console.log(`users where nama = 'FITRA SURYAZANA MAMONTO': count = ${vUsersUpper?.length || 0} (Expected: 0)`);

  const { data: vUsersFitra } = await supabase
    .from('users')
    .select('*')
    .eq('username', 'Fitra');
  console.log(`users where username = 'Fitra': nama = '${vUsersFitra?.[0]?.nama}' (Expected: 'Fitra Suryazana Mamonto')`);

  // Criteria 2: Query presensi_guru, jurnal_pembelajaran, laporan_piket for FITRA SURYAZANA MAMONTO returns 0 rows
  const { data: vPresensiUpper } = await supabase
    .from('presensi_guru')
    .select('*')
    .eq('nama_guru', 'FITRA SURYAZANA MAMONTO');
  console.log(`presensi_guru where nama_guru = 'FITRA SURYAZANA MAMONTO': count = ${vPresensiUpper?.length || 0} (Expected: 0)`);

  const { data: vPresensiTitle } = await supabase
    .from('presensi_guru')
    .select('*')
    .eq('nama_guru', 'Fitra Suryazana Mamonto');
  console.log(`presensi_guru where nama_guru = 'Fitra Suryazana Mamonto': count = ${vPresensiTitle?.length || 0}`);

  const { data: vJurnalUpper } = await supabase
    .from('jurnal_pembelajaran')
    .select('*')
    .eq('nama_guru', 'FITRA SURYAZANA MAMONTO');
  console.log(`jurnal_pembelajaran where nama_guru = 'FITRA SURYAZANA MAMONTO': count = ${vJurnalUpper?.length || 0} (Expected: 0)`);

  const { data: vJurnalTitle } = await supabase
    .from('jurnal_pembelajaran')
    .select('*')
    .eq('nama_guru', 'Fitra Suryazana Mamonto');
  console.log(`jurnal_pembelajaran where nama_guru = 'Fitra Suryazana Mamonto': count = ${vJurnalTitle?.length || 0}`);

  const { data: vAllPiket } = await supabase
    .from('laporan_piket')
    .select('*');
  const vPiketUpper = vAllPiket?.filter(p => JSON.stringify(p).includes('FITRA SURYAZANA MAMONTO')) || [];
  console.log(`laporan_piket containing 'FITRA SURYAZANA MAMONTO': count = ${vPiketUpper.length} (Expected: 0)`);

  // Criteria 3: Query all tables for "Drs. Ahmad Dahlan, M.Pd." returns exactly 0 rows
  const checkTables = ['users', 'data_guru', 'presensi_guru', 'jurnal_pembelajaran', 'laporan_piket', 'data_siswa'];
  let totalAhmadDahlan = 0;
  for (const t of checkTables) {
    let col = 'nama';
    if (t === 'data_guru' || t === 'presensi_guru' || t === 'jurnal_pembelajaran') col = 'nama_guru';
    if (t === 'laporan_piket') col = 'guru_piket';
    if (t === 'data_siswa') col = 'nama_siswa';

    const { data: rows } = await supabase
      .from(t)
      .select('*')
      .ilike(col, '%Ahmad Dahlan%');
    console.log(`Table ${t} (${col} ilike %Ahmad Dahlan%): count = ${rows?.length || 0}`);
    totalAhmadDahlan += (rows?.length || 0);
  }

  // Also check laporan_piket full json for Ahmad Dahlan
  const piketAhmad = vAllPiket?.filter(p => JSON.stringify(p).toLowerCase().includes('ahmad dahlan')) || [];
  console.log(`laporan_piket full json containing 'ahmad dahlan': count = ${piketAhmad.length}`);
  totalAhmadDahlan += piketAhmad.length;

  console.log(`\nTotal remaining records for 'Ahmad Dahlan': ${totalAhmadDahlan} (Expected: 0)`);

  if (
    (vUsersUpper?.length || 0) === 0 &&
    vUsersFitra?.[0]?.nama === 'Fitra Suryazana Mamonto' &&
    (vPresensiUpper?.length || 0) === 0 &&
    (vJurnalUpper?.length || 0) === 0 &&
    vPiketUpper.length === 0 &&
    totalAhmadDahlan === 0
  ) {
    console.log('\n🎉 ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!');
  } else {
    console.error('\n❌ SOME ACCEPTANCE CRITERIA FAILED!');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
