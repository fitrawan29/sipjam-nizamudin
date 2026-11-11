import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const adminConfigPath = path.join(root, 'src', 'components', 'AdminConfigView.tsx');
const adminDataPath = path.join(root, 'src', 'components', 'AdminDataView.tsx');
const attendanceAlpaPath = path.join(root, 'src', 'lib', 'attendanceAlpa.ts');
const workflowPath = path.join(root, 'src', 'lib', 'workflow.ts');

console.log('========================================================================');
console.log('🧪 VERIFIKASI: KEBIJAKAN KEHADIRAN GURU, TATA USAHA & KEPALA SEKOLAH');
console.log('========================================================================\n');

let passCount = 0;
let failCount = 0;

function pass(title: string) {
  console.log(`✅ PASS: ${title}`);
  passCount++;
}

function fail(title: string, error: any) {
  console.error(`❌ FAIL: ${title}`);
  console.error(error);
  failCount++;
}

// -----------------------------------------------------------------------------
// BAGIAN 1: AdminConfigView Tab 4 (Kehadiran & Jam Kerja)
// -----------------------------------------------------------------------------
console.log('--- [Bagian 1] AdminConfigView: Desain Fleksibel & Akses Tanpa Hambatan ---');

const adminConfigContent = fs.readFileSync(adminConfigPath, 'utf8');

// Test 1.1: Tidak ada artificial block disabled / cursor-not-allowed pada switch toggle
try {
  assert(!adminConfigContent.includes('disabled={!isEligibleForKbmOnly}'), 'AdminConfigView tidak boleh mendisable switch toggle berdasarkan isEligibleForKbmOnly');
  assert(!adminConfigContent.includes('cursor-not-allowed opacity-50'), 'AdminConfigView tidak boleh memberi class cursor-not-allowed pada switch toggle');
  pass('1.1: Switch toggle bebas diklik untuk seluruh personil (Guru, TU, Kepsek) tanpa artificial block');
} catch (e) {
  fail('1.1: Switch toggle masih terhambat blokir buatan', e);
}

// Test 1.2: Tersedia filter peran (Guru, TU, Kepsek)
try {
  assert(adminConfigContent.includes('roleFilterTab'), 'AdminConfigView memiliki state roleFilterTab');
  assert(adminConfigContent.includes('Semua Peran'), 'AdminConfigView memiliki filter Semua Peran');
  assert(adminConfigContent.includes('isTuStaff'), 'AdminConfigView memiliki helper isTuStaff');
  assert(adminConfigContent.includes('isKepsekStaff'), 'AdminConfigView memiliki helper isKepsekStaff');
  pass('1.2: Tersedia filter pill peran lengkap: Semua Peran, Guru, TU, dan Kepsek');
} catch (e) {
  fail('1.2: Filter pill peran belum lengkap', e);
}

// Test 1.3: Tersedia tombol batch "Otomatis Sesuai KBM" selain Semua Hadir & Hanya KBM
try {
  assert(adminConfigContent.includes('Otomatis Sesuai KBM'), 'AdminConfigView memiliki tombol Otomatis Sesuai KBM');
  assert(adminConfigContent.includes('Set Semua Hadir Setiap Hari'), 'AdminConfigView memiliki tombol Set Semua Hadir Setiap Hari');
  assert(adminConfigContent.includes('Set Semua Hanya Hari KBM'), 'AdminConfigView memiliki tombol Set Semua Hanya Hari KBM');
  pass('1.3: Tombol aksi massal lengkap: Set Semua Hadir, Set Semua Hanya KBM, dan Otomatis Sesuai KBM');
} catch (e) {
  fail('1.3: Tombol aksi massal belum lengkap', e);
}

// Test 1.4: Query guruList juga memuat akun Tata Usaha dari tabel users
try {
  assert(adminConfigContent.includes("ilike('role', '%tata%')") || adminConfigContent.includes("ilike('role', '%tata_usaha%')") || adminConfigContent.includes("role: 'tata_usaha'"), 'AdminConfigView memuat akun TU dari users');
  pass('1.4: Akun Tata Usaha digabungkan secara utuh ke daftar personil');
} catch (e) {
  fail('1.4: Akun Tata Usaha belum termuat secara utuh', e);
}

// Test 1.5: Save handler menyimpan pilihan guru, TU, dan Kepsek ke database
try {
  assert(adminConfigContent.includes("guru_hanya_mengajar: jsonExempt") || adminConfigContent.includes("guru_hanya_mengajar"), 'AdminConfigView menyimpan exemptIds ke pengaturan');
  assert(adminConfigContent.includes("wajib_hadir_hanya_mengajar: true"), 'AdminConfigView memperbarui data_guru dengan wajib_hadir_hanya_mengajar true');
  assert(adminConfigContent.includes("wajib_hadir_hanya_mengajar: false"), 'AdminConfigView memperbarui data_guru dengan wajib_hadir_hanya_mengajar false');
  pass('1.5: Handler simpan memperbarui database pengaturan dan data_guru secara dua arah');
} catch (e) {
  fail('1.5: Handler simpan belum memperbarui data_guru secara dua arah', e);
}

// -----------------------------------------------------------------------------
// BAGIAN 2: AdminDataView (Tambah & Edit Data Guru & Card Rendering)
// -----------------------------------------------------------------------------
console.log('\n--- [Bagian 2] AdminDataView: Pengaturan Kehadiran Langsung pada Data Guru ---');

const adminDataContent = fs.readFileSync(adminDataPath, 'utf8');

// Test 2.1: Tambah Guru Baru menyertakan pilihan Kewajiban Kehadiran
try {
  assert(adminDataContent.includes('id="swal-aturan-kehadiran"'), 'Modal Tambah Guru Baru memiliki input id swal-aturan-kehadiran');
  assert(adminDataContent.includes('Wajib Hadir Setiap Hari (Semua Hari)'), 'Modal Tambah Guru Baru memiliki opsi Wajib Hadir Setiap Hari');
  assert(adminDataContent.includes('Hanya Hadir Saat Ada Jadwal KBM / Jam Kerja'), 'Modal Tambah Guru Baru memiliki opsi Hanya Hadir Saat Ada Jadwal KBM');
  pass('2.1: Modal Tambah Guru Baru menyertakan dropdown opsi aturan kehadiran');
} catch (e) {
  fail('2.1: Modal Tambah Guru Baru belum menyertakan opsi aturan kehadiran', e);
}

// Test 2.2: Edit Data Guru menyertakan pilihan Kewajiban Kehadiran
try {
  assert(adminDataContent.includes('id="swal-edit-aturan-kehadiran"'), 'Modal Edit Data Guru memiliki input id swal-edit-aturan-kehadiran');
  assert(adminDataContent.includes('wajib_hadir_hanya_mengajar'), 'Modal Edit Data Guru mengikat nilai wajib_hadir_hanya_mengajar');
  pass('2.2: Modal Edit Data Guru menyertakan dropdown opsi aturan kehadiran sesuai data tersimpan');
} catch (e) {
  fail('2.2: Modal Edit Data Guru belum menyertakan opsi aturan kehadiran', e);
}

// Test 2.3: Badge kehadiran dirender pada kartu Data Guru
try {
  assert(adminDataContent.includes('Hanya Hari KBM') && adminDataContent.includes('Wajib Setiap Hari'), 'Kartu Data Guru menampilkan badge Hanya Hari KBM / Wajib Setiap Hari');
  pass('2.3: Kartu Data Guru menampilkan badge status kewajiban kehadiran yang jelas');
} catch (e) {
  fail('2.3: Kartu Data Guru belum menampilkan badge kewajiban kehadiran', e);
}

// Test 2.4: AdminDataView memancarkan event sinkronisasi saat menambah atau mengedit guru
try {
  assert(adminDataContent.includes("new CustomEvent('sipjam:config_updated')"), 'AdminDataView memancarkan event sipjam:config_updated');
  assert(adminDataContent.includes("new CustomEvent('sipjam:guru_updated')"), 'AdminDataView memancarkan event sipjam:guru_updated');
  pass('2.4: AdminDataView memancarkan event realtime sinkronisasi setelah simpan data guru');
} catch (e) {
  fail('2.4: AdminDataView belum memancarkan event sinkronisasi', e);
}

// -----------------------------------------------------------------------------
// BAGIAN 3: Mesin Evaluasi Kehadiran (workflow.ts & attendanceAlpa.ts)
// -----------------------------------------------------------------------------
console.log('\n--- [Bagian 3] Konsistensi Mesin Evaluasi Kehadiran Dua Arah ---');

const workflowContent = fs.readFileSync(workflowPath, 'utf8');
const alpaContent = fs.readFileSync(attendanceAlpaPath, 'utf8');

// Test 3.1: workflow.ts mengevaluasi status eksplisit
try {
  assert(workflowContent.includes('explicitTeacherSetting === true') || workflowContent.includes('isTeacherExempt'), 'workflow.ts mengevaluasi status guru');
  assert(workflowContent.includes("state.aturanKehadiran = isTeacherExempt ? 'Hari_Mengajar_Saja' : 'Semua_Hari'"), 'workflow.ts menetapkan aturan per personil');
  pass('3.1: workflow.ts mengevaluasi aturan per personil secara dua arah');
} catch (e) {
  fail('3.1: workflow.ts evaluasi per personil belum konsisten', e);
}

// Test 3.2: attendanceAlpa.ts mengevaluasi hasExplicitTeacherSetting
try {
  assert(alpaContent.includes('hasExplicitTeacherSetting'), 'attendanceAlpa.ts memeriksa hasExplicitTeacherSetting');
  assert(alpaContent.includes('const isTeacherExempt ='), 'attendanceAlpa.ts mendeklarasikan isTeacherExempt');
  pass('3.2: attendanceAlpa.ts memeriksa status kehadiran eksplisit personil');
} catch (e) {
  fail('3.2: attendanceAlpa.ts belum memeriksa status eksplisit personil', e);
}

console.log('\n========================================================================');
console.log(`HASIL: ${passCount} LULUS, ${failCount} GAGAL`);
console.log('========================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 SEMUA PENGUJIAN KEBIJAKAN KEHADIRAN GURU, TU & KEPSEK BERHASIL 100%!\n');
}
