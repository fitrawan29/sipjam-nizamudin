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
// BAGIAN 1: AdminConfigView Pemindahan Kebijakan Kehadiran ke Master Data (R2)
// -----------------------------------------------------------------------------
console.log('--- [Bagian 1] AdminConfigView: Kebijakan Guru Bersih dari Menu Pengaturan (R2) ---');

const adminConfigContent = fs.readFileSync(adminConfigPath, 'utf8');

// Test 1.1: Tab 'kehadiran' telah dihapus dari tabs array dan antarmuka pengaturan
try {
  assert(!adminConfigContent.includes("id: 'kehadiran'"), 'AdminConfigView tidak boleh memuat tab id kehadiran');
  assert(!adminConfigContent.includes("activeTab === 'kehadiran'"), 'AdminConfigView tidak boleh merender tab kehadiran');
  pass('1.1: Tab kebijakan kehadiran guru bersih dari menu pengaturan');
} catch (e) {
  fail('1.1: Tab kebijakan kehadiran masih ditemukan di menu pengaturan', e);
}

// Test 1.2: Tidak ada lagi filter peran atau switch kehadiran massal pada menu pengaturan
try {
  assert(!adminConfigContent.includes('roleFilterTab'), 'AdminConfigView tidak lagi memiliki state roleFilterTab');
  assert(!adminConfigContent.includes('Set Semua Hadir Setiap Hari'), 'AdminConfigView tidak lagi memiliki tombol Set Semua Hadir Setiap Hari');
  pass('1.2: Filter peran dan tombol massal kehadiran guru bersih dari AdminConfigView');
} catch (e) {
  fail('1.2: Filter atau tombol massal kehadiran masih ada di AdminConfigView', e);
}

// Test 1.3: Save handler AdminConfigView tidak lagi menimpa (bulk clobber) data_guru
try {
  assert(!adminConfigContent.includes("wajib_hadir_hanya_mengajar: true"), 'AdminConfigView tidak boleh bulk update wajib_hadir_hanya_mengajar true');
  assert(!adminConfigContent.includes("wajib_hadir_hanya_mengajar: false"), 'AdminConfigView tidak boleh bulk update wajib_hadir_hanya_mengajar false');
  pass('1.3: Save handler AdminConfigView tidak menimpa pengaturan guru secara massal');
} catch (e) {
  fail('1.3: AdminConfigView masih melakukan bulk update pada data_guru', e);
}

// Test 1.4: AdminConfigView tetap memelihara komentar resiliensi schema cache
try {
  assert(adminConfigContent.includes('Schema cache missing wajib_hadir_hanya_mengajar on data_guru'), 'AdminConfigView memelihara resiliensi schema cache');
  pass('1.4: Resiliensi schema cache tetap terpelihara');
} catch (e) {
  fail('1.4: Penanganan schema cache hilang', e);
}

// Test 1.5: AdminConfigView tetap menyimpan konfigurasi waktu efektif dan pengaturan umum sekolah
try {
  assert(adminConfigContent.includes('hari_sekolah'), 'AdminConfigView menyimpan hari_sekolah');
  assert(adminConfigContent.includes('waktu_efektif_mulai') || adminConfigContent.includes('waktuEfektifMulai'), 'AdminConfigView memelihara waktu efektif');
  pass('1.5: Konfigurasi waktu efektif dan pengaturan umum sekolah tetap terjaga');
} catch (e) {
  fail('1.5: Konfigurasi pengaturan sekolah mengalami regresi', e);
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
