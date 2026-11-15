import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { resolveTeacherAttendancePolicy } from '../src/lib/workflow';

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
// BAGIAN 1: AdminConfigView Sub-menu Kebijakan Kehadiran Guru di Pengaturan Sistem (R1)
// -----------------------------------------------------------------------------
console.log('--- [Bagian 1] AdminConfigView: Kebijakan Kehadiran Guru di Pengaturan Sistem (R1) ---');

const adminConfigContent = fs.readFileSync(adminConfigPath, 'utf8');

// Test 1.1: Tab 'kehadiran' tersedia pada tabs array dan antarmuka pengaturan
try {
  assert(adminConfigContent.includes("id: 'kehadiran'"), 'AdminConfigView harus memuat tab id kehadiran');
  assert(adminConfigContent.includes("activeTab === 'kehadiran'"), 'AdminConfigView harus merender tab kehadiran');
  pass('1.1: Tab kebijakan kehadiran guru tersedia di menu pengaturan');
} catch (e) {
  fail('1.1: Tab kebijakan kehadiran belum ditemukan di menu pengaturan', e);
}

// Test 1.2: Filter peran dan tombol massal kehadiran guru tersedia pada menu pengaturan
try {
  assert(adminConfigContent.includes('roleFilterTab'), 'AdminConfigView harus memiliki state roleFilterTab');
  assert(adminConfigContent.includes('Set Semua Hadir Setiap Hari'), 'AdminConfigView harus memiliki tombol Set Semua Hadir Setiap Hari');
  pass('1.2: Filter peran dan tombol massal kehadiran guru tersedia di AdminConfigView');
} catch (e) {
  fail('1.2: Filter atau tombol massal kehadiran belum ada di AdminConfigView', e);
}

// Test 1.3: Save handler AdminConfigView memperbarui wajib_hadir_hanya_mengajar pada data_guru
try {
  assert(adminConfigContent.includes("wajib_hadir_hanya_mengajar: true"), 'AdminConfigView harus mengupdate wajib_hadir_hanya_mengajar true');
  assert(adminConfigContent.includes("wajib_hadir_hanya_mengajar: false"), 'AdminConfigView harus mengupdate wajib_hadir_hanya_mengajar false');
  pass('1.3: Save handler AdminConfigView memperbarui pengaturan guru secara mengikat');
} catch (e) {
  fail('1.3: AdminConfigView belum mengupdate wajib_hadir_hanya_mengajar pada data_guru', e);
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
// BAGIAN 2: AdminDataView: Bersih dari Kebijakan Kehadiran Guru (R1)
// -----------------------------------------------------------------------------
console.log('\n--- [Bagian 2] AdminDataView: Kebijakan Kehadiran Bersih dari Master Data Bagian Guru (R1) ---');

const adminDataContent = fs.readFileSync(adminDataPath, 'utf8');

// Test 2.1: Tambah Guru Baru bersih dari pilihan Kewajiban Kehadiran
try {
  assert(!adminDataContent.includes('id="swal-aturan-kehadiran"'), 'Modal Tambah Guru Baru tidak boleh memiliki input id swal-aturan-kehadiran');
  pass('2.1: Modal Tambah Guru Baru bersih dari opsi aturan kehadiran');
} catch (e) {
  fail('2.1: Modal Tambah Guru Baru masih menyertakan opsi aturan kehadiran', e);
}

// Test 2.2: Edit Data Guru bersih dari pilihan Kewajiban Kehadiran
try {
  assert(!adminDataContent.includes('id="swal-edit-aturan-kehadiran"'), 'Modal Edit Data Guru tidak boleh memiliki input id swal-edit-aturan-kehadiran');
  pass('2.2: Modal Edit Data Guru bersih dari opsi aturan kehadiran');
} catch (e) {
  fail('2.2: Modal Edit Data Guru masih menyertakan opsi aturan kehadiran', e);
}

// Test 2.3: Badge kehadiran bersih dari kartu Data Guru
try {
  assert(!adminDataContent.includes('Hanya Hari KBM') && !adminDataContent.includes('Wajib Setiap Hari'), 'Kartu Data Guru tidak boleh menampilkan badge Hanya Hari KBM / Wajib Setiap Hari');
  pass('2.3: Kartu Data Guru bersih dari badge status kewajiban kehadiran');
} catch (e) {
  fail('2.3: Kartu Data Guru masih menampilkan badge kewajiban kehadiran', e);
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

// Test 3.3: resolveTeacherAttendancePolicy kebal terhadap eksploitasi TU atau guru non-KBM
try {
  const tuPolicy = resolveTeacherAttendancePolicy({
    teacher: { role: 'tatausaha', wajib_hadir_hanya_mengajar: true },
    weeklySchedules: [],
  });
  assert.strictEqual(tuPolicy.isNonKbmOrTu, true, 'TU staff harus teridentifikasi isNonKbmOrTu = true');
  assert.strictEqual(tuPolicy.isTeacherExempt, false, 'TU staff tidak boleh isTeacherExempt = true meskipun wajib_hadir_hanya_mengajar: true');
  assert.strictEqual(tuPolicy.aturanKehadiran, 'Semua_Hari', 'Aturan kehadiran TU staff harus Semua_Hari');

  const zeroKbmPolicy = resolveTeacherAttendancePolicy({
    teacher: { nama_guru: 'Guru Tanpa KBM', wajib_hadir_hanya_mengajar: true },
    weeklySchedules: [],
    totalTeacherKbmCount: 0,
  });
  assert.strictEqual(zeroKbmPolicy.isNonKbmOrTu, true, 'Guru 0-KBM harus teridentifikasi isNonKbmOrTu = true');
  assert.strictEqual(zeroKbmPolicy.isTeacherExempt, false, 'Guru 0-KBM tidak boleh isTeacherExempt = true meskipun wajib_hadir_hanya_mengajar: true');
  assert.strictEqual(zeroKbmPolicy.aturanKehadiran, 'Semua_Hari', 'Aturan kehadiran guru 0-KBM harus Semua_Hari');

  const kbmPolicy = resolveTeacherAttendancePolicy({
    teacher: { id: 'g-1', nama_guru: 'Guru KBM', wajib_hadir_hanya_mengajar: true },
    weeklySchedules: [{ guru_id: 'g-1', mata_pelajaran: 'Matematika' }],
    totalTeacherKbmCount: 4,
  });
  assert.strictEqual(kbmPolicy.isNonKbmOrTu, false, 'Guru KBM aktif isNonKbmOrTu = false');
  assert.strictEqual(kbmPolicy.isTeacherExempt, true, 'Guru KBM aktif dengan flag true harus isTeacherExempt = true');
  assert.strictEqual(kbmPolicy.aturanKehadiran, 'Hari_Mengajar_Saja', 'Aturan kehadiran guru KBM aktif harus Hari_Mengajar_Saja');

  pass('3.3: resolveTeacherAttendancePolicy memprioritaskan isNonKbmOrTu di atas explicitSetting');
} catch (e) {
  fail('3.3: resolveTeacherAttendancePolicy gagal melindungi TU atau 0-KBM dari false exemption', e);
}

console.log('\n========================================================================');
console.log(`HASIL: ${passCount} LULUS, ${failCount} GAGAL`);
console.log('========================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 SEMUA PENGUJIAN KEBIJAKAN KEHADIRAN GURU, TU & KEPSEK BERHASIL 100%!\n');
}
