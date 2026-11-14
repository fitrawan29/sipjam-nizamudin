import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveTeacherAttendancePolicy,
  resolveSchoolAturanKehadiran,
  resolveSchoolLegacyGhmList,
} from '../src/lib/workflow';

const root = process.cwd();
let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✘ FAIL: ${name}:`, err?.message || err);
    failed++;
  }
}

console.log('========================================================================');
console.log('🧪 TEST SUITE: AUDIT 3 FITUR (EDIT JURNAL, KEBIJAKAN GURU, JAM KERJA)');
console.log('========================================================================\n');

// -----------------------------------------------------------------------------
// FITUR 1: EDIT JURNAL STRUKTUR KOLOM SESUAI PENGISIAN JURNAL
// -----------------------------------------------------------------------------
console.log('--- [Fitur 1] Struktur Kolom Edit Jurnal (RekapJurnalView.tsx) ---');
const rekapJurnalPath = path.join(root, 'src', 'components', 'RekapJurnalView.tsx');
const rekapJurnalSrc = fs.readFileSync(rekapJurnalPath, 'utf8');

check('1.1: Modal Edit Jurnal mendukung deteksi Jurnal Kegiatan vs Jurnal KBM (isEditingJurnalKegiatan)', () => {
  assert.ok(
    rekapJurnalSrc.includes('isEditingJurnalKegiatan'),
    'RekapJurnalView harus mendeteksi apakah jurnal yang diedit adalah Jurnal Kegiatan atau Jurnal KBM'
  );
});

check('1.2: Kolom 1 pada Modal Edit Jurnal KBM adalah Nomor / Pertemuan ke- (editPertemuanKe), bukan UUID hash', () => {
  const modalIdx = rekapJurnalSrc.indexOf('id="modal-edit-jurnal"');
  assert.ok(modalIdx !== -1, 'Modal edit jurnal harus ada');
  const modalSlice = rekapJurnalSrc.slice(modalIdx);
  const col1Idx = modalSlice.indexOf('1. Nomor');
  const col2Idx = modalSlice.indexOf('2. Hari/Tanggal');
  assert.ok(col1Idx !== -1 && col2Idx !== -1 && col1Idx < col2Idx, 'Urutan Kolom 1 dan Kolom 2 harus berurutan');
  const col1Block = modalSlice.slice(col1Idx, col2Idx);
  assert.ok(
    col1Block.includes('editPertemuanKe'),
    'Kolom 1 (Nomor) harus mengikat input editPertemuanKe (Pertemuan ke-)'
  );
  assert.ok(
    !col1Block.includes('editingJurnal.id?.substring(0, 8)'),
    'Kolom 1 tidak boleh menampilkan potongan UUID database sebagai Nomor Jurnal'
  );
});

check('1.3: Kolom 4 (Kelas/JP) terdiri dari 3 kolom (Kelas, JP, Mata Pelajaran) sesuai GuruJurnal.tsx', () => {
  const modalIdx = rekapJurnalSrc.indexOf('id="modal-edit-jurnal"');
  const modalSlice = rekapJurnalSrc.slice(modalIdx);
  const col4Idx = modalSlice.indexOf('4. Kelas/JP');
  const col5Idx = modalSlice.indexOf('5. Keadaan Siswa');
  assert.ok(col4Idx !== -1 && col5Idx !== -1 && col4Idx < col5Idx, 'Kolom 4 dan Kolom 5 harus berurutan');
  const col4Block = modalSlice.slice(col4Idx, col5Idx);
  assert.ok(col4Block.includes('sm:grid-cols-3'), 'Kolom 4 harus menggunakan grid 3 kolom (Kelas, JP, Mata Pelajaran)');
  assert.ok(!col4Block.includes('editPertemuanKe'), 'editPertemuanKe tidak boleh lagi diselipkan di Kolom 4');
});

check('1.4: Kolom 5 (Keadaan Siswa) menyertakan Catatan Khusus Siswa (editCatatanKhususSiswa / catatan_khusus_siswa)', () => {
  assert.ok(
    rekapJurnalSrc.includes('editCatatanKhususSiswa') && rekapJurnalSrc.includes('catatan_khusus_siswa'),
    'Modal Edit Jurnal harus memuat dan menyimpan catatan_khusus_siswa pada Kolom 5'
  );
});

check('1.5: Mode Edit Jurnal Kegiatan menampilkan Nama Kegiatan & Uraian Deskripsi (editKegiatan terlihat, tidak hidden)', () => {
  const modalIdx = rekapJurnalSrc.indexOf('id="modal-edit-jurnal"');
  const modalSlice = rekapJurnalSrc.slice(modalIdx);
  assert.ok(
    modalSlice.includes('Nama Kegiatan') && modalSlice.includes('Uraian / Deskripsi'),
    'Modal Edit Jurnal harus menampilkan field Nama Kegiatan dan Uraian / Deskripsi saat mengedit Jurnal Kegiatan'
  );
});

// -----------------------------------------------------------------------------
// FITUR 2: KEBIJAKAN KEHADIRAN GURU (WAJIB SETIAP HARI VS BEBAS HADIR)
// -----------------------------------------------------------------------------
console.log('\n--- [Fitur 2] Kebijakan Kehadiran Guru ---');
const adminConfigPath = path.join(root, 'src', 'components', 'AdminConfigView.tsx');
const adminConfigSrc = fs.readFileSync(adminConfigPath, 'utf8');
const homeAdminPath = path.join(root, 'src', 'components', 'HomeViewAdmin.tsx');
const homeAdminSrc = fs.readFileSync(homeAdminPath, 'utf8');

check('2.1: Tombol "Set Semua Hanya Hari KBM" di AdminConfigView hanya memilih guru KBM (mengecualikan TU, Kepsek, & 0-KBM)', () => {
  assert.ok(
    !adminConfigSrc.includes('setExemptTeacherIds(guruList.map(g => g.id).filter(Boolean))'),
    'Tombol Set Semua Hanya Hari KBM tidak boleh memasukkan seluruh guruList mentah (termasuk Kepsek/TU) ke exemptTeacherIds'
  );
  assert.ok(
    adminConfigSrc.includes('!isTuStaff(g) && !isKepsekStaff(g) && getTeacherKbmCount(g, jadwalList) > 0'),
    'Tombol Set Semua Hanya Hari KBM harus memfilter !isTuStaff(g) && !isKepsekStaff(g) && getTeacherKbmCount > 0'
  );
});

check('2.2: HomeViewAdmin menghitung isExemptNonTeaching berdasarkan jadwal KBM aktif yang tidak diblokir Sistem Blok', () => {
  assert.ok(
    homeAdminSrc.includes('const activeTargetCount = targetClasses.filter((jk: any) => !jk.isBlocked).length;') &&
    homeAdminSrc.includes('const isExemptNonTeaching = isTeacherExempt && activeTargetCount === 0;'),
    'HomeViewAdmin harus mengevaluasi isExemptNonTeaching dengan activeTargetCount === 0'
  );
});

check('2.3: resolveTeacherAttendancePolicy mengutamakan daftar guru_hanya_mengajar jika DB terkena default false tetapi ada di daftar aktif', () => {
  const sampleJadwal = [
    { id: 'j1', hari: 'Senin', kelas: 'X A', mata_pelajaran: 'Matematika', nama_guru: 'Ahmad Dahlan', user_id: 'u-ahmad' }
  ];
  // Guru ada di daftar guru_hanya_mengajar aktif sekolah, namun kolom wajib_hadir_hanya_mengajar belum tersinkron (masih false dari migrasi default)
  const policyInGhmList = resolveTeacherAttendancePolicy({
    teacher: { id: 'g-ahmad', user_id: 'u-ahmad', nama_guru: 'Ahmad Dahlan', wajib_hadir_hanya_mengajar: false },
    weeklySchedules: sampleJadwal,
    aturanGlobal: 'Hari_Mengajar_Saja',
    guruHanyaMengajarList: ['g-ahmad'],
    preferLegacyListWhenGlobalKbm: true,
  } as any);
  assert.strictEqual(policyInGhmList.isTeacherExempt, true, 'Jika preferLegacyListWhenGlobalKbm aktif dan ada di daftar GHM, harus exempt');

  // Sebaliknya jika explicitSetting = false dan TIDAK diaktifkan preferLegacyListWhenGlobalKbm, tetap false (backward compatible)
  const policyExplicitFalse = resolveTeacherAttendancePolicy({
    teacher: { id: 'g-ahmad', user_id: 'u-ahmad', nama_guru: 'Ahmad Dahlan', wajib_hadir_hanya_mengajar: false },
    weeklySchedules: sampleJadwal,
    aturanGlobal: 'Hari_Mengajar_Saja',
    guruHanyaMengajarList: ['g-ahmad'],
  });
  assert.strictEqual(policyExplicitFalse.isTeacherExempt, false);
});

// -----------------------------------------------------------------------------
// FITUR 3: PENGATURAN JAM KERJA TIDAK HILANG & ATURAN SESUAI KOLOM
// -----------------------------------------------------------------------------
console.log('\n--- [Fitur 3] Pengaturan Jam Kerja & Konsistensi Aturan ---');
const presensiIntervensiPath = path.join(root, 'src', 'lib', 'presensiIntervensi.ts');
const presensiIntervensiSrc = fs.readFileSync(presensiIntervensiPath, 'utf8');
const adminRekapPath = path.join(root, 'src', 'components', 'AdminRekapView.tsx');
const adminRekapSrc = fs.readFileSync(adminRekapPath, 'utf8');
const guruPresensiPath = path.join(root, 'src', 'components', 'GuruPresensi.tsx');
const guruPresensiSrc = fs.readFileSync(guruPresensiPath, 'utf8');

check('3.1: AdminConfigView tidak membiarkan key UPPERCASE menimpa key lowercase kanonik yang sudah ada', () => {
  assert.ok(
    adminConfigSrc.includes('canonicalKeysSeen'),
    'AdminConfigView harus melacak canonicalKeysSeen agar baris UPPERCASE legacy tidak menimpa baris lowercase baru'
  );
});

check('3.2: AdminConfigView tidak membiarkan kolom fisik jam_pulang_jumat pada baris lain menimpa baris key === "jam_pulang_jumat"', () => {
  assert.ok(
    adminConfigSrc.includes("const jpjKeyRow = data.find((r: any) => r.key === 'jam_pulang_jumat' && r.value);"),
    'AdminConfigView harus memprioritaskan baris key === "jam_pulang_jumat" di atas kolom fisik baris lain'
  );
});

check('3.3: GuruPresensi memprioritaskan baris key === "jam_pulang_jumat" di atas kolom fisik baris lain', () => {
  assert.ok(
    guruPresensiSrc.includes("const jpjKeyRow = data.find((r: any) => r.key === 'jam_pulang_jumat' && r.value);"),
    'GuruPresensi harus memprioritaskan baris key === "jam_pulang_jumat"'
  );
});

check('3.4: presensiIntervensi.ts menghormati kolom jam_batas_intervensi_siswa dari pengaturan', () => {
  assert.ok(
    presensiIntervensiSrc.includes('configMap.jam_batas_intervensi_siswa'),
    'presensiIntervensi.ts harus menggunakan configMap.jam_batas_intervensi_siswa pada perhitungan batasPagi'
  );
  assert.ok(
    !presensiIntervensiSrc.includes("batasPagi: '12:00', // Wali Kelas batas pagi diperpanjang hingga pk. 12:00 WITA"),
    'presensiIntervensi.ts tidak boleh mengabaikan jam_batas_intervensi_siswa yang diisi di pengaturan'
  );
});

check('3.5: AdminRekapView tidak melakukan double-penalty (memotong hadir sekaligus menambah alpa dari hadir yang terpotong)', () => {
  assert.ok(
    adminRekapSrc.includes('const alpa = Math.max(0, totalHariKerja - hadir - dinasLuar - sakit - izin) + alpaOtomatis;') ||
    adminRekapSrc.includes('const alpaMurni = Math.max(0, totalHariKerja - hadir - dinasLuar - sakit - izin);'),
    'AdminRekapView harus menghitung alpa dari hadir aktual ditambah alpaOtomatis tanpa memotong hadir dua kali'
  );
});

console.log(`\n========================================================================`);
console.log(`HASIL: ${passed} LULUS, ${failed} GAGAL`);
console.log(`========================================================================`);
if (failed > 0) process.exit(1);
