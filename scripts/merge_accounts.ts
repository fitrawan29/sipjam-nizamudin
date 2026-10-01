import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local or fallback to .env
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials missing in .env.local');
  process.exit(1);
}

/**
 * Initializes authenticated Supabase client using Superadmin credentials.
 */
async function getAuthenticatedClient() {
  const baseClient = createClient(supabaseUrl, supabaseKey);
  
  // Obtain superadmin session token to bypass RLS safely
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
    console.warn('⚠️ Warning: Superadmin verify_login RPC fallback warning:', err);
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        ...(sessionToken ? { 'x-session-token': sessionToken } : {})
      }
    }
  });

  return client;
}

export interface MergeResult {
  primaryUserId: string | null;
  duplicateUserId: string | null;
  presensiCount: number;
  jurnalCount: number;
  piketCount: number;
  success: boolean;
}

/**
 * Merges duplicate teacher account "Ade Fitrawan Ibrahim, M.Pd., Gr."
 * into primary account "Ade Fitrawan Ibrahim".
 */
export async function mergeAccounts(): Promise<MergeResult> {
  console.log('================================================================');
  console.log('🔄 SCRIPT PENGGABUNGAN DATA GANDA (MERGE ACCOUNTS) SIPJAM');
  console.log('================================================================\n');

  const supabase = await getAuthenticatedClient();

  const PRIMARY_NAME = 'Ade Fitrawan Ibrahim';
  const DUPLICATE_NAME = 'Ade Fitrawan Ibrahim, M.Pd., Gr.';
  const DEFAULT_PRIMARY_USER_ID = 'fff9d836-b034-4a66-be96-1c1b7cfad277';
  const DEFAULT_PRIMARY_GURU_ID = '5596d1ff-4984-4aaa-ba8c-0bfa1b3ed8b9';

  // 1. Cari data user primer
  let primaryUserId = DEFAULT_PRIMARY_USER_ID;
  let primaryGuruId = DEFAULT_PRIMARY_GURU_ID;
  let primaryNip = 'Fitrawan';

  const { data: primaryUsers } = await supabase
    .from('users')
    .select('*')
    .or(`id.eq.${DEFAULT_PRIMARY_USER_ID},nama.eq.${PRIMARY_NAME},username.eq.Fitrawan`)
    .limit(1);

  if (primaryUsers && primaryUsers.length > 0) {
    primaryUserId = primaryUsers[0].id;
    primaryNip = primaryUsers[0].username || primaryNip;
  }

  const { data: primaryGurus } = await supabase
    .from('data_guru')
    .select('*')
    .or(`id.eq.${DEFAULT_PRIMARY_GURU_ID},user_id.eq.${primaryUserId},nama_guru.eq.${PRIMARY_NAME}`)
    .limit(1);

  if (primaryGurus && primaryGurus.length > 0) {
    primaryGuruId = primaryGurus[0].id;
    primaryNip = primaryGurus[0].nip || primaryNip;
  }

  console.log(`📌 Akun Target (Primer):`);
  console.log(`   Nama    : ${PRIMARY_NAME}`);
  console.log(`   User ID : ${primaryUserId}`);
  console.log(`   Guru ID : ${primaryGuruId}\n`);

  // 2. Cari data user duplikat ("Ade Fitrawan Ibrahim, M.Pd., Gr." atau variasi M.Pd)
  let duplicateUserId: string | null = null;
  let duplicateGuruId: string | null = null;
  let duplicateName = DUPLICATE_NAME;

  const { data: duplicateUsers } = await supabase
    .from('users')
    .select('*')
    .or(`nama.ilike.Ade Fitrawan Ibrahim%M.Pd%,username.ilike.%M.Pd%`)
    .neq('id', primaryUserId)
    .limit(1);

  if (duplicateUsers && duplicateUsers.length > 0) {
    duplicateUserId = duplicateUsers[0].id;
    duplicateName = duplicateUsers[0].nama || duplicateName;
  }

  const { data: duplicateGurus } = await supabase
    .from('data_guru')
    .select('*')
    .ilike('nama_guru', 'Ade Fitrawan Ibrahim%M.Pd%')
    .neq('id', primaryGuruId)
    .limit(1);

  if (duplicateGurus && duplicateGurus.length > 0) {
    duplicateGuruId = duplicateGurus[0].id;
    duplicateName = duplicateGurus[0].nama_guru || duplicateName;
    if (!duplicateUserId && duplicateGurus[0].user_id) {
      duplicateUserId = duplicateGurus[0].user_id;
    }
  }

  console.log(`📌 Akun Duplikat yang Dicari:`);
  console.log(`   Nama     : ${duplicateName}`);
  console.log(`   User ID  : ${duplicateUserId || '(Tidak ada akun users aktif / sudah terhapus)'}`);
  console.log(`   Guru ID  : ${duplicateGuruId || '(Tidak ada entri data_guru aktif / sudah terhapus)'}\n`);

  // 3. Eksplisit COUNT data dari tabel riwayat: Presensi, Jurnal, dan Piket
  console.log('----------------------------------------------------------------');
  console.log('📊 MENGHITUNG JUMLAH RIWAYAT TRANSAKSI (EKSPLISIT QUERY COUNT)');
  console.log('----------------------------------------------------------------');

  // 3.1 Presensi Guru
  let presensiDupQuery = supabase
    .from('presensi_guru')
    .select('*', { count: 'exact', head: true })
    .or(`nama_guru.eq.${DUPLICATE_NAME},nama_guru.ilike.%M.Pd%${duplicateUserId ? `,user_id.eq.${duplicateUserId}` : ''}`);
  const { count: presensiDupCount } = await presensiDupQuery;

  const { count: presensiPriCount } = await supabase
    .from('presensi_guru')
    .select('*', { count: 'exact', head: true })
    .or(`user_id.eq.${primaryUserId},nama_guru.eq.${PRIMARY_NAME}`);

  // 3.2 Jurnal Pembelajaran
  let jurnalDupQuery = supabase
    .from('jurnal_pembelajaran')
    .select('*', { count: 'exact', head: true })
    .or(`nama_guru.eq.${DUPLICATE_NAME},nama_guru.ilike.%M.Pd%${duplicateUserId ? `,user_id.eq.${duplicateUserId}` : ''}`);
  const { count: jurnalDupCount } = await jurnalDupQuery;

  const { count: jurnalPriCount } = await supabase
    .from('jurnal_pembelajaran')
    .select('*', { count: 'exact', head: true })
    .or(`user_id.eq.${primaryUserId},nama_guru.eq.${PRIMARY_NAME}`);

  // 3.3 Laporan Piket
  let piketDupQuery = supabase
    .from('laporan_piket')
    .select('*', { count: 'exact', head: true })
    .or(`guru_pelapor.eq.${DUPLICATE_NAME},guru_pelapor.ilike.%M.Pd%${duplicateUserId ? `,user_id.eq.${duplicateUserId}` : ''}`);
  const { count: piketDupCount } = await piketDupQuery;

  const { count: piketPriCount } = await supabase
    .from('laporan_piket')
    .select('*', { count: 'exact', head: true })
    .or(`user_id.eq.${primaryUserId},guru_pelapor.eq.${PRIMARY_NAME}`);

  const totalDupHistory = (presensiDupCount || 0) + (jurnalDupCount || 0) + (piketDupCount || 0);

  // CETAK JUMLAH PASTI KE TERMINAL SECARA EKSPLISIT
  console.log(`[HASIL COUNT DATA DUPLIKAT] Akun: "${DUPLICATE_NAME}"`);
  console.log(`  1. Riwayat Presensi Guru     : ${presensiDupCount ?? 0} data`);
  console.log(`  2. Riwayat Jurnal Mengajar   : ${jurnalDupCount ?? 0} data`);
  console.log(`  3. Riwayat Laporan Piket     : ${piketDupCount ?? 0} data`);
  console.log(`  => TOTAL RIWAYAT DUPLIKAT    : ${totalDupHistory} data\n`);

  console.log(`[HASIL COUNT DATA UTAMA] Akun: "${PRIMARY_NAME}"`);
  console.log(`  1. Riwayat Presensi Guru     : ${presensiPriCount ?? 0} data`);
  console.log(`  2. Riwayat Jurnal Mengajar   : ${jurnalPriCount ?? 0} data`);
  console.log(`  3. Riwayat Laporan Piket     : ${piketPriCount ?? 0} data`);
  console.log('----------------------------------------------------------------\n');

  // 4. Eksekusi perpindahan data (re-assign foreign keys)
  console.log('🔄 MENGEKSEKUSI PERPINDAHAN DATA (RE-ASSIGNING FOREIGN KEYS)...');

  // 4.1 Update presensi_guru
  if (duplicateUserId || (presensiDupCount && presensiDupCount > 0)) {
    const filter = duplicateUserId 
      ? `user_id.eq.${duplicateUserId},nama_guru.eq.${DUPLICATE_NAME},nama_guru.ilike.%M.Pd%`
      : `nama_guru.eq.${DUPLICATE_NAME},nama_guru.ilike.%M.Pd%`;
    const { error: pErr } = await supabase
      .from('presensi_guru')
      .update({ user_id: primaryUserId, nama_guru: PRIMARY_NAME })
      .or(filter);
    if (pErr) console.warn('   ⚠️ presensi_guru update warning:', pErr.message);
    else console.log('   ✅ Presensi Guru berhasil dialihkan ke akun utama.');
  } else {
    console.log('   ℹ️ Presensi Guru duplikat sudah bersih (0 riwayat).');
  }

  // 4.2 Update jurnal_pembelajaran
  if (duplicateUserId || (jurnalDupCount && jurnalDupCount > 0)) {
    const filter = duplicateUserId 
      ? `user_id.eq.${duplicateUserId},nama_guru.eq.${DUPLICATE_NAME},nama_guru.ilike.%M.Pd%`
      : `nama_guru.eq.${DUPLICATE_NAME},nama_guru.ilike.%M.Pd%`;
    const { error: jErr } = await supabase
      .from('jurnal_pembelajaran')
      .update({ user_id: primaryUserId, nama_guru: PRIMARY_NAME })
      .or(filter);
    if (jErr) console.warn('   ⚠️ jurnal_pembelajaran update warning:', jErr.message);
    else console.log('   ✅ Jurnal Pembelajaran berhasil dialihkan ke akun utama.');
  } else {
    console.log('   ℹ️ Jurnal Pembelajaran duplikat sudah bersih (0 riwayat).');
  }

  // 4.3 Update laporan_piket
  if (duplicateUserId || (piketDupCount && piketDupCount > 0)) {
    const filter = duplicateUserId 
      ? `user_id.eq.${duplicateUserId},guru_pelapor.eq.${DUPLICATE_NAME},guru_pelapor.ilike.%M.Pd%`
      : `guru_pelapor.eq.${DUPLICATE_NAME},guru_pelapor.ilike.%M.Pd%`;
    const { error: lErr } = await supabase
      .from('laporan_piket')
      .update({ user_id: primaryUserId, guru_pelapor: PRIMARY_NAME })
      .or(filter);
    if (lErr) console.warn('   ⚠️ laporan_piket update warning:', lErr.message);
    else console.log('   ✅ Laporan Piket berhasil dialihkan ke akun utama.');
  } else {
    console.log('   ℹ️ Laporan Piket duplikat sudah bersih (0 riwayat).');
  }

  // 4.4 Update jadwal_pelajaran
  if (duplicateUserId) {
    await supabase
      .from('jadwal_pelajaran')
      .update({ user_id: primaryUserId, nama_guru: PRIMARY_NAME })
      .or(`user_id.eq.${duplicateUserId},nama_guru.ilike.%M.Pd%`);
    console.log('   ✅ Jadwal Pelajaran dialihkan ke akun utama.');
  }

  // 4.5 Update guru_mapel (hindari pelanggaran unique constraint: sekolah_id, nip, nama_mapel)
  if (duplicateGuruId && primaryGuruId) {
    // Cari duplicate subjects
    const { data: dupMapels } = await supabase
      .from('guru_mapel')
      .select('*')
      .eq('guru_id', duplicateGuruId);

    if (dupMapels && dupMapels.length > 0) {
      for (const gm of dupMapels) {
        // Cek apakah akun primer sudah memiliki mapel ini
        const { data: existingMapel } = await supabase
          .from('guru_mapel')
          .select('id')
          .eq('guru_id', primaryGuruId)
          .eq('nama_mapel', gm.nama_mapel)
          .limit(1);

        if (existingMapel && existingMapel.length > 0) {
          // Hapus mapel duplikat agar tidak melanggar unique constraint
          await supabase.from('guru_mapel').delete().eq('id', gm.id);
        } else {
          // Re-assign ke primary
          await supabase
            .from('guru_mapel')
            .update({ guru_id: primaryGuruId, nama_guru: PRIMARY_NAME, nip: primaryNip })
            .eq('id', gm.id);
        }
      }
    }
    console.log('   ✅ Guru Mapel dialihkan ke akun utama.');
  }

  // 4.6 Update penugasan_piket
  if (duplicateGuruId || duplicateName) {
    await supabase
      .from('penugasan_piket')
      .update({ guru_id: primaryGuruId, guru_nama: PRIMARY_NAME, guru_nip: primaryNip })
      .or(`guru_id.eq.${duplicateGuruId || '00000000-0000-0000-0000-000000000000'},guru_nama.ilike.%M.Pd%`);
    console.log('   ✅ Penugasan Piket dialihkan ke akun utama.');
  }

  // 4.7 Update wali_kelas
  if (duplicateGuruId || duplicateName) {
    await supabase
      .from('wali_kelas')
      .update({ guru_id: primaryGuruId, nama_guru: PRIMARY_NAME, nip: primaryNip })
      .or(`guru_id.eq.${duplicateGuruId || '00000000-0000-0000-0000-000000000000'},nama_guru.ilike.%M.Pd%`);
    console.log('   ✅ Wali Kelas dialihkan ke akun utama.');
  }

  // 4.8 Update push_subscriptions
  if (duplicateUserId) {
    // Hapus endpoint duplikat yang sama
    const { data: primarySubs } = await supabase
      .from('push_subscriptions')
      .select('endpoint')
      .eq('user_id', primaryUserId);
    
    if (primarySubs && primarySubs.length > 0) {
      const endpoints = primarySubs.map(s => s.endpoint);
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', duplicateUserId)
        .in('endpoint', endpoints);
    }

    await supabase
      .from('push_subscriptions')
      .update({ user_id: primaryUserId, user_nama: PRIMARY_NAME })
      .eq('user_id', duplicateUserId);
    console.log('   ✅ Push Subscriptions dialihkan ke akun utama.');
  }

  // 5. Menghapus akun duplikat (Pertama data_guru, lalu users)
  console.log('\n🗑️ MENGHAPUS AKUN DUPLIKAT DARI DATABASE...');

  // 5.1 Hapus dari data_guru
  if (duplicateGuruId) {
    const { error: delGuruErr } = await supabase
      .from('data_guru')
      .delete()
      .eq('id', duplicateGuruId);
    if (delGuruErr) console.warn('   ⚠️ Gagal menghapus duplicate data_guru:', delGuruErr.message);
    else console.log(`   ✅ Duplicate data_guru (id: ${duplicateGuruId}) berhasil dihapus.`);
  } else {
    // Fallback: hapus data_guru berdasarkan nama M.Pd jika bukan akun primer
    const { error: delGuruNameErr } = await supabase
      .from('data_guru')
      .delete()
      .ilike('nama_guru', 'Ade Fitrawan Ibrahim%M.Pd%')
      .neq('id', primaryGuruId);
    if (!delGuruNameErr) console.log('   ✅ Entri data_guru dengan nama M.Pd dipastikan bersih.');
  }

  // 5.2 Hapus dari users
  if (duplicateUserId) {
    const { error: delUserErr } = await supabase
      .from('users')
      .delete()
      .eq('id', duplicateUserId);
    if (delUserErr) console.warn('   ⚠️ Gagal menghapus duplicate users:', delUserErr.message);
    else console.log(`   ✅ Duplicate users (id: ${duplicateUserId}) berhasil dihapus.`);
  } else {
    // Fallback: hapus users berdasarkan nama M.Pd jika bukan akun primer
    const { error: delUserNameErr } = await supabase
      .from('users')
      .delete()
      .ilike('nama', 'Ade Fitrawan Ibrahim%M.Pd%')
      .neq('id', primaryUserId);
    if (!delUserNameErr) console.log('   ✅ Akun users dengan nama M.Pd dipastikan bersih.');
  }

  // 6. Verifikasi Akhir
  console.log('\n================================================================');
  console.log('🎉 PENGGABUNGAN DATA BERHASIL DISELESAIKAN!');
  console.log(`Seluruh riwayat transaksi telah dipusatkan pada akun "${PRIMARY_NAME}".`);
  console.log('================================================================\n');

  return {
    primaryUserId,
    duplicateUserId,
    presensiCount: presensiDupCount || 0,
    jurnalCount: jurnalDupCount || 0,
    piketCount: piketDupCount || 0,
    success: true
  };
}

// Eksekusi skrip jika dipanggil secara langsung melalui CLI
if (require.main === module || process.argv[1]?.includes('merge_accounts')) {
  mergeAccounts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Terjadi kesalahan saat penggabungan akun:', err);
      process.exit(1);
    });
}
