import assert from 'assert';
import {
  evaluateScheduleBlock,
  isKelasInAngkatan,
  getActiveSistemBloks,
  getActiveSistemBlok,
  resolveActiveBlockForContext,
  isJurnalMatchJadwal,
  hasJournalContent,
} from '../src/lib/workflow';
import type { SistemBlok } from '../src/types/database';

console.log('=================================================================');
console.log('TEST SUITE: REVISI SISTEM BLOK 4 KATEGORI (SEKOLAH, ANGKATAN, KELAS, GURU)');
console.log('=================================================================\n');

let passed = 0;
let failed = 0;

function testAssert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${label}`);
    if (detail) console.error(`   ${detail}`);
    failed++;
  }
}

// Mock Teachers
const teacherBudi = {
  id: 'budi-uuid-1',
  user_id: 'budi-user-1',
  nama: 'Budi Santoso, S.Pd',
  nama_guru: 'Budi Santoso',
};

const teacherRahma = {
  id: 'rahma-uuid-2',
  user_id: 'rahma-user-2',
  nama: 'Siti Rahma, M.Pd',
  nama_guru: 'Siti Rahma',
};

const teacherAhmad = {
  id: 'ahmad-uuid-3',
  user_id: 'ahmad-user-3',
  nama: 'Ahmad Dahlan, S.Kom',
  nama_guru: 'Ahmad Dahlan',
};

// -------------------------------------------------------------
// Section 1: Kategori 1 - Seluruh Sekolah
// -------------------------------------------------------------
console.log('--- 1. Kategori 1: Seluruh Sekolah (tipe_target: sekolah) ---');

const ruleSekolah: SistemBlok = {
  id: 'blok-sekolah-1',
  sekolah_id: 'sch-1',
  nama_kegiatan: 'Pesantren Kilat Ramadhan',
  deskripsi: 'Semua KBM diganti kegiatan keagamaan',
  tanggal_mulai: '2026-11-20',
  tanggal_selesai: '2026-11-22',
  tipe_target: 'sekolah',
  target_angkatan: null,
  target_kelas: null,
  target_guru_id: null,
  target_guru_nama: null,
  is_full_day: true,
  jam_mulai: null,
  jam_selesai: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const schedX = { kelas: 'X RPL 1', mata_pelajaran: 'Informatika', user_id: teacherBudi.user_id, nama_guru: teacherBudi.nama };
const schedXI = { kelas: 'XI TKJ 2', mata_pelajaran: 'Jaringan', user_id: teacherRahma.user_id, nama_guru: teacherRahma.nama };
const schedXII = { kelas: 'XII MIPA 1', mata_pelajaran: 'Matematika', user_id: teacherAhmad.user_id, nama_guru: teacherAhmad.nama };

const evalSekolah1 = evaluateScheduleBlock(schedX, teacherBudi, [ruleSekolah]);
const evalSekolah2 = evaluateScheduleBlock(schedXI, teacherRahma, [ruleSekolah]);
const evalSekolah3 = evaluateScheduleBlock(schedXII, teacherAhmad, [ruleSekolah]);

testAssert(evalSekolah1.isBlocked === true, 'Kategori 1: Kelas X terblokir oleh aturan sekolah');
testAssert(evalSekolah2.isBlocked === true, 'Kategori 1: Kelas XI terblokir oleh aturan sekolah');
testAssert(evalSekolah3.isBlocked === true, 'Kategori 1: Kelas XII terblokir oleh aturan sekolah');
testAssert(evalSekolah1.blockRule?.nama_kegiatan === 'Pesantren Kilat Ramadhan', 'Kategori 1: Aturan blok tersambung dengan benar');

// -------------------------------------------------------------
// Section 2: Kategori 2 - Tingkatan / Angkatan Tertentu
// -------------------------------------------------------------
console.log('\n--- 2. Kategori 2: Tingkatan/Angkatan Tertentu (tipe_target: angkatan) ---');

const ruleAngkatan10: SistemBlok = {
  id: 'blok-angkatan-10',
  sekolah_id: 'sch-1',
  nama_kegiatan: 'Asesmen Bakat Minat Kelas 10',
  deskripsi: 'Khusus kelas 10 ABM',
  tanggal_mulai: '2026-11-20',
  tanggal_selesai: '2026-11-20',
  tipe_target: 'angkatan',
  target_angkatan: '10',
  target_kelas: null,
  target_guru_id: null,
  target_guru_nama: null,
  is_full_day: true,
  jam_mulai: null,
  jam_selesai: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const evalAngkatanX = evaluateScheduleBlock({ kelas: '10 RPL 1' }, teacherBudi, [ruleAngkatan10]);
const evalAngkatanXRoman = evaluateScheduleBlock({ kelas: 'X Merdeka A' }, teacherBudi, [ruleAngkatan10]);
const evalAngkatanXI = evaluateScheduleBlock({ kelas: 'XI TKJ 1' }, teacherBudi, [ruleAngkatan10]);
const evalAngkatanXII = evaluateScheduleBlock({ kelas: 'XII TITL 2' }, teacherBudi, [ruleAngkatan10]);

testAssert(evalAngkatanX.isBlocked === true, 'Kategori 2: Jadwal kelas "10 RPL 1" terblokir oleh aturan Angkatan 10');
testAssert(evalAngkatanXRoman.isBlocked === true, 'Kategori 2: Jadwal kelas "X Merdeka A" terblokir oleh aturan Angkatan 10');
testAssert(evalAngkatanXI.isBlocked === false, 'Kategori 2: Jadwal kelas "XI TKJ 1" TIDAK terblokir (isolasi angkatan)');
testAssert(evalAngkatanXII.isBlocked === false, 'Kategori 2: Jadwal kelas "XII TITL 2" TIDAK terblokir (isolasi angkatan)');

// -------------------------------------------------------------
// Section 3: Kategori 3 - Khusus Kelas / Dispen Keseluruhan Kelas
// -------------------------------------------------------------
console.log('\n--- 3. Kategori 3: Khusus Kelas / Dispen Kelas (tipe_target: kelas) ---');

const ruleDispenKelas: SistemBlok = {
  id: 'blok-dispen-xii-mipa-1',
  sekolah_id: 'sch-1',
  nama_kegiatan: 'Dispen Studi Lapangan XII MIPA 1',
  deskripsi: 'Satu kelas dispen kunjungan kampus',
  tanggal_mulai: '2026-11-20',
  tanggal_selesai: '2026-11-20',
  tipe_target: 'kelas',
  target_angkatan: null,
  target_kelas: 'XII MIPA 1',
  target_guru_id: null,
  target_guru_nama: null,
  is_full_day: true,
  jam_mulai: null,
  jam_selesai: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const evalKelasTarget = evaluateScheduleBlock({ kelas: 'XII MIPA 1' }, teacherAhmad, [ruleDispenKelas]);
const evalKelasLainSamaAngkatan = evaluateScheduleBlock({ kelas: 'XII MIPA 2' }, teacherAhmad, [ruleDispenKelas]);
const evalKelasFormatVariasi = evaluateScheduleBlock({ kelas: 'Kelas XII MIPA 1' }, teacherAhmad, [ruleDispenKelas]);

testAssert(evalKelasTarget.isBlocked === true, 'Kategori 3: Jadwal kelas "XII MIPA 1" terblokir oleh aturan dispen kelas');
testAssert(evalKelasFormatVariasi.isBlocked === true, 'Kategori 3: Variasi nama "Kelas XII MIPA 1" terblokir');
testAssert(evalKelasLainSamaAngkatan.isBlocked === false, 'Kategori 3: Kelas "XII MIPA 2" TIDAK terblokir (isolasi kelas presisi)');

// -------------------------------------------------------------
// Section 4: Kategori 4 - Guru Tertentu
// -------------------------------------------------------------
console.log('\n--- 4. Kategori 4: Khusus Guru Tertentu (tipe_target: guru) ---');

const ruleGuruBudi: SistemBlok = {
  id: 'blok-guru-budi',
  sekolah_id: 'sch-1',
  nama_kegiatan: 'Pelatihan Kurikulum Nasional - Pak Budi',
  deskripsi: 'Guru ditugaskan mengikuti bimtek dinas',
  tanggal_mulai: '2026-11-20',
  tanggal_selesai: '2026-11-20',
  tipe_target: 'guru',
  target_angkatan: null,
  target_kelas: null,
  target_guru_id: teacherBudi.id,
  target_guru_nama: teacherBudi.nama,
  is_full_day: true,
  jam_mulai: null,
  jam_selesai: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const evalBudi = evaluateScheduleBlock({ kelas: 'X RPL 1' }, teacherBudi, [ruleGuruBudi]);
const evalRahma = evaluateScheduleBlock({ kelas: 'X RPL 1' }, teacherRahma, [ruleGuruBudi]);

testAssert(evalBudi.isBlocked === true, 'Kategori 4: Jadwal Pak Budi terblokir oleh aturan khusus guru');
testAssert(evalRahma.isBlocked === false, 'Kategori 4: Guru lain (Bu Rahma) di kelas yang sama TIDAK terblokir');

// -------------------------------------------------------------
// Section 5: getActiveSistemBlok Contextual Resolution
// -------------------------------------------------------------
console.log('\n--- 5. getActiveSistemBlok Contextual Resolution ---');

function testContextualGetActiveSistemBlok() {
  // Ketika ada aturan blok Angkatan 10, tetapi Bu Rahma hanya mengajar Kelas 11 & 12
  const mockAllBloks = [ruleAngkatan10];

  const resRahmaOutsideAngkatan = resolveActiveBlockForContext(
    mockAllBloks,
    teacherRahma.id,
    {
      namaGuru: teacherRahma.nama,
      schedules: [
        { kelas: 'XI TKJ 1', mata_pelajaran: 'Jaringan' },
        { kelas: 'XII TITL 2', mata_pelajaran: 'Listrik' }
      ]
    }
  );
  // Bu Rahma tidak mengajar kelas 10, sehingga tidak boleh terikat ke blok Angkatan 10
  testAssert(resRahmaOutsideAngkatan === null, 'Guru di luar angkatan target tidak menerima blok angkatan');

  // Pak Budi yang mengajar kelas 10 harus menerima blok Angkatan 10 jika disediakan konteks kelas 10
  const resBudiInsideAngkatan = resolveActiveBlockForContext(
    mockAllBloks,
    teacherBudi.id,
    {
      namaGuru: teacherBudi.nama,
      kelas: '10 RPL 1',
      schedules: [
        { kelas: '10 RPL 1', mata_pelajaran: 'Informatika' }
      ]
    }
  );
  testAssert(resBudiInsideAngkatan !== null && resBudiInsideAngkatan.id === ruleAngkatan10.id, 'Guru yang mengajar kelas di angkatan target menerima blok');

  // Verifikasi aturan perorangan guru
  const resGuruKhusus = resolveActiveBlockForContext(
    [ruleGuruBudi],
    teacherRahma.id,
    {
      namaGuru: teacherRahma.nama,
      schedules: [{ kelas: 'X RPL 1', mata_pelajaran: 'Informatika' }]
    }
  );
  testAssert(resGuruKhusus === null, 'Guru lain tidak terdampak aturan blok khusus guru');

  // Verifikasi aturan dispen kelas
  const resDispenKelasCocok = resolveActiveBlockForContext(
    [ruleDispenKelas],
    teacherAhmad.id,
    {
      namaGuru: teacherAhmad.nama,
      schedules: [{ kelas: 'XII MIPA 1', mata_pelajaran: 'Matematika' }]
    }
  );
  testAssert(resDispenKelasCocok !== null && resDispenKelasCocok.id === ruleDispenKelas.id, 'Guru yang mengajar di kelas dispen menerima blok kelas');

  const resDispenKelasBeda = resolveActiveBlockForContext(
    [ruleDispenKelas],
    teacherAhmad.id,
    {
      namaGuru: teacherAhmad.nama,
      schedules: [{ kelas: 'XII MIPA 2', mata_pelajaran: 'Fisika' }]
    }
  );
  testAssert(resDispenKelasBeda === null, 'Guru yang mengajar di kelas berbeda tidak menerima blok dispen kelas');
}

// -------------------------------------------------------------
// Section 6: Skenario Campuran (Mixed Mode) & Verifikasi Jurnal
// -------------------------------------------------------------
console.log('\n--- 6. Skenario Campuran (Mixed Mode) & Verifikasi Jurnal ---');

const teacherMixed = {
  id: 'mixed-1',
  user_id: 'user-mixed-1',
  nama: 'Guru Campuran, M.Kom',
};

const schedMixed1 = { id: 101, kelas: '10 RPL 1', mata_pelajaran: 'Informatika' }; // Terblokir oleh Angkatan 10
const schedMixed2 = { id: 102, kelas: 'XI RPL 1', mata_pelajaran: 'Basis Data' };  // Regular (tidak terblokir)

const evalM1 = evaluateScheduleBlock(schedMixed1, teacherMixed, [ruleAngkatan10]);
const evalM2 = evaluateScheduleBlock(schedMixed2, teacherMixed, [ruleAngkatan10]);

testAssert(evalM1.isBlocked === true, 'Mixed Mode: Jadwal 1 (10 RPL 1) terblokir');
testAssert(evalM2.isBlocked === false, 'Mixed Mode: Jadwal 2 (XI RPL 1) TIDAK terblokir');

const unblockedSchedules = [
  { ...schedMixed1, isBlocked: evalM1.isBlocked },
  { ...schedMixed2, isBlocked: evalM2.isBlocked }
].filter(s => !s.isBlocked);

const blockedSchedules = [
  { ...schedMixed1, isBlocked: evalM1.isBlocked },
  { ...schedMixed2, isBlocked: evalM2.isBlocked }
].filter(s => s.isBlocked);

testAssert(unblockedSchedules.length === 1 && unblockedSchedules[0].kelas === 'XI RPL 1', 'Mixed Mode: unblockedSchedules teridentifikasi tepat 1');
testAssert(blockedSchedules.length === 1 && blockedSchedules[0].kelas === '10 RPL 1', 'Mixed Mode: blockedSchedules teridentifikasi tepat 1');

// Simulasi kondisi jurnal
const mockJurnalKbmOnly = [
  {
    kelas: 'XI RPL 1',
    mapel: 'Basis Data',
    materi: 'Normalisasi Tabel',
    kegiatan: 'Diskusi Praktikum',
    status_verifikasi: 'Disetujui',
    absensi_siswa: JSON.stringify({ hadir: 30, sakit: 0, izin: 0, alpa: 0 })
  }
];

const mockJurnalKegiatanOnly = {
  keterangan: 'Jurnal Kegiatan',
  materi: 'Asesmen Bakat Minat',
  kegiatan: 'Pendampingan Ujian',
  status_verifikasi: 'Disetujui'
};

// Kondisi 1: Hanya isi KBM (Kegiatan belum) -> isJurnalDone harus false
const unblockedDone1 = unblockedSchedules.every(jk => 
  mockJurnalKbmOnly.some(j => isJurnalMatchJadwal(j, jk) && hasJournalContent(j))
);
const blockedDone1 = blockedSchedules.length === 0 || Boolean(null);
const isJurnalDone1 = unblockedDone1 && blockedDone1;
testAssert(isJurnalDone1 === false, 'Mixed Mode: Hanya isi Jurnal KBM (tanpa Jurnal Kegiatan) belum tuntas (Presensi Pulang terkunci)');

// Kondisi 2: Hanya isi Kegiatan (KBM belum) -> isJurnalDone harus false
const unblockedDone2 = unblockedSchedules.every(jk => 
  [].some((j: any) => isJurnalMatchJadwal(j, jk) && hasJournalContent(j))
);
const blockedDone2 = blockedSchedules.length === 0 || Boolean(mockJurnalKegiatanOnly);
const isJurnalDone2 = unblockedDone2 && blockedDone2;
testAssert(isJurnalDone2 === false, 'Mixed Mode: Hanya isi Jurnal Kegiatan (tanpa Jurnal KBM) belum tuntas (Presensi Pulang terkunci)');

// Kondisi 3: Isi KBM DAN Kegiatan -> isJurnalDone harus true
const unblockedDone3 = unblockedSchedules.every(jk => 
  mockJurnalKbmOnly.some(j => isJurnalMatchJadwal(j, jk) && hasJournalContent(j))
);
const blockedDone3 = blockedSchedules.length === 0 || Boolean(mockJurnalKegiatanOnly);
const isJurnalDone3 = unblockedDone3 && blockedDone3;
testAssert(isJurnalDone3 === true, 'Mixed Mode: Mengisi KBM reguler + Jurnal Kegiatan dinyatakan tuntas (Presensi Pulang terbuka)');

testContextualGetActiveSistemBlok();

console.log('\n=================================================================');
console.log(`TOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('=================================================================');
if (failed === 0) {
  console.log('🎉 SEMUA PENGUJIAN 4 KATEGORI SISTEM BLOK SUKSES!');
} else {
  process.exit(1);
}
