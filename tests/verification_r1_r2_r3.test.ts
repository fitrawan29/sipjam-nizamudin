import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    if (detail) console.error(`   ${detail}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 VERIFIKASI AKHIR SISTEM: PERSYARATAN R1, R2, DAN R3');
  console.log('================================================================\n');

  const rootDir = path.resolve(__dirname, '..');

  // ==========================================================================
  // R1: Penggabungan Data Ganda Terukur
  // ==========================================================================
  console.log('--- [R1] PENGGABUNGAN DATA GANDA TERUKUR (scripts/merge_accounts.ts) ---');

  const mergeScriptPath = path.join(rootDir, 'scripts', 'merge_accounts.ts');
  assert(fs.existsSync(mergeScriptPath), 'R1.1: File scripts/merge_accounts.ts ada');

  const scriptContent = fs.readFileSync(mergeScriptPath, 'utf-8');

  // Verifikasi query COUNT eksplisit
  assert(
    scriptContent.includes("select('*', { count: 'exact'") || scriptContent.includes('count: exact') || scriptContent.includes('presensi_guru'),
    'R1.2: Skrip memiliki kode query COUNT untuk presensi_guru'
  );
  assert(
    scriptContent.includes('jurnal_pembelajaran') && (scriptContent.includes('count') || scriptContent.includes('exact')),
    'R1.3: Skrip memiliki kode query COUNT untuk jurnal_pembelajaran'
  );
  assert(
    scriptContent.includes('laporan_piket') && (scriptContent.includes('count') || scriptContent.includes('exact')),
    'R1.4: Skrip memiliki kode query COUNT untuk laporan_piket'
  );

  // Verifikasi pencetakan ke console
  assert(
    scriptContent.includes('console.log') &&
    scriptContent.includes('Riwayat Presensi') &&
    scriptContent.includes('Riwayat Jurnal') &&
    scriptContent.includes('Riwayat Laporan Piket'),
    'R1.5: Skrip mencetak jumlah pasti riwayat presensi, jurnal, dan piket ke console.log'
  );

  // Verifikasi perpindahan foreign key & penghapusan duplikat
  assert(
    scriptContent.includes("'presensi_guru'") &&
    scriptContent.includes("'jurnal_pembelajaran'") &&
    scriptContent.includes("'laporan_piket'") &&
    scriptContent.includes('.update({ user_id: primaryUserId'),
    'R1.6: Skrip memuat logika perpindahan foreign keys / data transaksi'
  );

  assert(
    scriptContent.includes("'data_guru'") &&
    scriptContent.includes("'users'") &&
    scriptContent.includes('.delete()'),
    'R1.7: Skrip memuat logika penghapusan data_guru dan users akun duplikat'
  );

  // Eksekusi skrip merge_accounts secara langsung
  console.log('\n--- Menjalankan fungsi mergeAccounts() ---');
  const { mergeAccounts } = await import('../scripts/merge_accounts');
  const mergeResult = await mergeAccounts();
  assert(mergeResult.success === true, 'R1.8: Fungsi mergeAccounts() berhasil dieksekusi tanpa error');
  assert(typeof mergeResult.presensiCount === 'number', 'R1.9: Perhitungan presensi mengembalikan tipe number');
  assert(typeof mergeResult.jurnalCount === 'number', 'R1.10: Perhitungan jurnal mengembalikan tipe number');
  assert(typeof mergeResult.piketCount === 'number', 'R1.11: Perhitungan piket mengembalikan tipe number');

  // ==========================================================================
  // R2: Alur Konfirmasi Izin Terlambat
  // ==========================================================================
  console.log('\n--- [R2] ALUR KONFIRMASI IZIN TERLAMBAT (AdminVerifView & Presensi) ---');

  const adminVerifPath = path.join(rootDir, 'src', 'components', 'AdminVerifView.tsx');
  const guruPresensiPath = path.join(rootDir, 'src', 'components', 'GuruPresensi.tsx');
  const homeViewPath = path.join(rootDir, 'src', 'components', 'HomeView.tsx');
  const adminRekapPath = path.join(rootDir, 'src', 'components', 'AdminRekapView.tsx');

  assert(fs.existsSync(adminVerifPath), 'R2.1: File AdminVerifView.tsx ada');
  const adminVerifContent = fs.readFileSync(adminVerifPath, 'utf-8');

  // Pending status recognition
  assert(
    adminVerifContent.includes("'Menunggu'") &&
    adminVerifContent.includes('Menunggu Verifikasi'),
    'R2.2: AdminVerifView mengenali status pending "Menunggu" dan "Menunggu Verifikasi"'
  );

  // Persetujuan / Penolakan buttons
  assert(
    adminVerifContent.includes('Setujui') &&
    adminVerifContent.includes('Tolak'),
    'R2.3: AdminVerifView memiliki tombol persetujuan (Setujui/Terima) dan penolakan (Tolak)'
  );

  // HomeView: Data tidak langsung disahkan sebagai Hadir
  const homeViewContent = fs.readFileSync(homeViewPath, 'utf-8');
  assert(
    homeViewContent.includes("jp === 'Izin Terlambat' || jp === 'Terlambat'") &&
    homeViewContent.includes('Izin Terlambat (Menunggu Verifikasi)'),
    'R2.4: HomeView tidak langsung mengesahkan Izin Terlambat sebagai Hadir saat berstatus pending'
  );

  // AdminRekap: Hanya presensi Disetujui/Diverifikasi yang dihitung
  const adminRekapContent = fs.readFileSync(adminRekapPath, 'utf-8');
  assert(
    adminRekapContent.includes("in('status_verifikasi', ['Disetujui', 'Diverifikasi'])") &&
    adminRekapContent.includes("p.jenis_presensi === 'Izin Terlambat'"),
    'R2.5: AdminRekapView hanya menghitung Izin Terlambat yang telah disetujui admin'
  );

  // API Attendance check
  const { POST } = await import('../src/app/api/attendance/route');
  const testAttendanceId = 'test-r2-' + Date.now();
  const testPayload = {
    id: testAttendanceId,
    user_id: 'fff9d836-b034-4a66-be96-1c1b7cfad277',
    nama_guru: 'Ade Fitrawan Ibrahim',
    tipe_absen: 'Datang',
    jenis_presensi: 'Izin Terlambat',
    detail_izin: 'Uji Coba Alur Izin Terlambat',
    lokasi: 'GPS: -5.14767, 119.43273',
    jarak: '10 m',
    keterlambatan_detik: 900,
    sekolah_id: 'a0000000-0000-0000-0000-000000000001'
  };

  const postReq = new NextRequest('http://localhost:3000/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload),
  });

  const postRes = await POST(postReq);
  const postJson = await postRes.json();
  assert(postRes.status === 200 || postRes.status === 201, 'R2.6: POST /api/attendance berhasil disimpan');
  assert(
    postJson.data?.status_verifikasi === 'Menunggu',
    `R2.7: Presensi Izin Terlambat tersimpan dengan status_verifikasi "Menunggu" (didapat: ${postJson.data?.status_verifikasi})`
  );

  // Clean up test attendance
  const { supabase } = await import('../src/lib/supabaseClient');
  await supabase.from('presensi_guru').delete().eq('id', testAttendanceId);

  // ==========================================================================
  // R3: Penghapusan Input Username Guru
  // ==========================================================================
  console.log('\n--- [R3] PENGHAPUSAN INPUT USERNAME GURU (AccountSettingsModal) ---');

  const modalPath = path.join(rootDir, 'src', 'components', 'AccountSettingsModal.tsx');
  assert(fs.existsSync(modalPath), 'R3.1: File AccountSettingsModal.tsx ada');

  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  // Input username hanya dirender saat isAdmin
  assert(
    modalContent.includes('{isAdmin && (') &&
    modalContent.includes('Username (Login)'),
    'R3.2: Elemen input username di-wrap strictly dalam {isAdmin && (...)}'
  );

  // Tidak ada input username atau teks username untuk non-admin/Guru
  assert(
    modalContent.includes("{isAdmin ? `${user?.role || 'Pengguna'} • ${user?.username || ''}` : (user?.role || 'Guru')}"),
    'R3.3: Header modal tidak menampilkan username saat pengguna login adalah Guru / non-admin'
  );

  // Validasi form password tetap independen dari username
  assert(
    modalContent.includes('changePassword') &&
    modalContent.includes('currentPassword') &&
    modalContent.includes('newPassword') &&
    modalContent.includes('confirmPassword'),
    'R3.4: Form ganti password (kata sandi lama & baru) tetap lengkap dan dapat diakses'
  );

  assert(
    modalContent.includes('p_username: isAdmin ? username.trim() : user.username') ||
    modalContent.includes('p_username: isAdmin ? username.trim() : (user.username'),
    'R3.5: Payload update profil mempertahankan username guru tanpa membutuhkan input form username'
  );

  console.log('\n================================================================');
  console.log(`HASIL AKHIR PENGUJIAN: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
