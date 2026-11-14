/**
 * tests/guru_lokasi_dan_kbm_jurnal.test.ts
 *
 * TDD & Verification Suite for:
 * 1. Rekonstruksi kebijakan kehadiran guru (Wajib Hadir Setiap Hari vs Wajib Hadir Hanya KBM)
 *    beserta akurasi pencocokan jadwal (Susan <-> Susana Muliono, Adnan, Ambar, anti-collision Fitra).
 * 2. Pengisian otomatis & backfill kolom Tempat/Lokasi KBM yang kosong dari riwayat lokasi
 *    yang pernah diisi oleh guru tersebut.
 * 3. Tampilan & cetak jurnal guru yang hanya mengajar sesuai KBM murni menampilkan/mencetak
 *    jurnal yang sesuai dengan KBM-nya.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import * as workflow from '../src/lib/workflow';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✖ [FAIL] ${name}: ${err?.message || err}`);
    failed++;
  }
}

console.log('\n========================================================================');
console.log('🧪 TEST SUITE: KEBIJAKAN KBM, BACKFILL LOKASI KBM & FILTER JURNAL KBM');
console.log('========================================================================\n');

const root = process.cwd();

// ---------------------------------------------------------------------------
// SECTION 1: Schedule Matching & Teacher Attendance Policy Reconstruction
// ---------------------------------------------------------------------------
console.log('--- Section 1: Akurasi Pencocokan Jadwal Guru & Kebijakan Kehadiran ---');

const sampleNizamudinJadwal = [
  { id: 'j1', hari: 'Kamis', kelas: 'X Merdeka', mata_pelajaran: 'PP', nama_guru: 'Susan' },
  { id: 'j2', hari: 'Kamis', kelas: 'XI Merdeka', mata_pelajaran: 'PP', nama_guru: 'Susan' },
  { id: 'j3', hari: 'Rabu', kelas: 'XII Merdeka', mata_pelajaran: 'PP', nama_guru: 'Susan' },
  { id: 'j4', hari: 'Jumat', kelas: 'XII Merdeka', mata_pelajaran: 'PAI BP', nama_guru: 'Adnan' },
  { id: 'j5', hari: 'Senin', kelas: 'XII Merdeka', mata_pelajaran: 'Kimia', nama_guru: 'Ambar' },
  { id: 'j6', hari: 'Kamis', kelas: 'XI Merdeka', mata_pelajaran: 'Kimia', nama_guru: 'Ambar' },
  { id: 'j7', hari: 'Rabu', kelas: 'X Merdeka', mata_pelajaran: 'PJOK', nama_guru: 'Fitra' },
  { id: 'j8', hari: 'Senin', kelas: 'X Merdeka', mata_pelajaran: 'MTK', nama_guru: 'Ade' },
  { id: 'j9', hari: 'Senin', kelas: 'X Merdeka', mata_pelajaran: 'B. Ing', nama_guru: 'Fitri' },
];

test('1.1: "Susan" pada jadwal_pelajaran cocok dengan "Susana Muliono"', () => {
  const susana = {
    id: 'af4f4ab1-520f-48be-9b01-349ec72b4a95',
    nama_guru: 'Susana Muliono',
    nip: 'Susana',
    mata_pelajaran: 'X Merdeka_PP, XI Merdeka_PP, XII Merdeka_PP',
    wajib_hadir_hanya_mengajar: true,
  };
  assert.strictEqual(
    workflow.isTeacherNameEquivalent('Susan', 'Susana Muliono', true),
    true,
    'isTeacherNameEquivalent("Susan", "Susana Muliono", true) harus true'
  );
  const matched = sampleNizamudinJadwal.filter(j =>
    workflow.isTeacherRecordMatch(j, susana, null, { allowSingleWordFirstToken: true })
  );
  assert.strictEqual(matched.length, 3, `Susana Muliono harus memiliki 3 jadwal KBM, dapat ${matched.length}`);
});

test('1.2: "Adnan" cocok dengan "Mohamad Adnan Mamangkai" dan "Ambar" cocok dengan "Setia Ambar Ningsih Mamonto" meski tanpa nip', () => {
  const adnanNoNip = { id: 'g-adnan', nama_guru: 'Mohamad Adnan Mamangkai' };
  const ambarNoNip = { id: 'g-ambar', nama_guru: 'Setia Ambar Ningsih Mamonto' };

  assert.strictEqual(
    workflow.isTeacherRecordMatch({ nama_guru: 'Adnan' }, adnanNoNip, null, { allowSingleWordFirstToken: true }),
    true,
    'Adnan harus cocok dengan Mohamad Adnan Mamangkai'
  );
  assert.strictEqual(
    workflow.isTeacherRecordMatch({ nama_guru: 'Ambar' }, ambarNoNip, null, { allowSingleWordFirstToken: true }),
    true,
    'Ambar harus cocok dengan Setia Ambar Ningsih Mamonto'
  );
});

test('1.3: Anti-collision tetap terjaga: "Fitra" TIDAK boleh cocok dengan "Ade Fitrawan Ibrahim", "Fitri Aprilia Dotulong", atau "Assyfa Fitra Azzahrah Abukasim"', () => {
  const ade = { id: 'g-ade', nama_guru: 'Ade Fitrawan Ibrahim', nip: 'Fitrawan' };
  const fitri = { id: 'g-fitri', nama_guru: 'Fitri Aprilia Dotulong, S.Pd.', nip: 'Fitri' };
  const assyfa = { id: 'g-assyfa', nama_guru: 'Assyfa Fitra Azzahrah Abukasim', nip: 'Assyfa' };
  const fitra = { id: 'g-fitra', nama_guru: 'Fitra Suryazana Mamonto', nip: 'Fitra' };

  const jadwalFitra = { hari: 'Rabu', kelas: 'X Merdeka', mata_pelajaran: 'PJOK', nama_guru: 'Fitra' };
  assert.strictEqual(workflow.isTeacherRecordMatch(jadwalFitra, fitra, null, { allowSingleWordFirstToken: true }), true);
  assert.strictEqual(workflow.isTeacherRecordMatch(jadwalFitra, ade, null, { allowSingleWordFirstToken: true }), false);
  assert.strictEqual(workflow.isTeacherRecordMatch(jadwalFitra, fitri, null, { allowSingleWordFirstToken: true }), false);
  assert.strictEqual(workflow.isTeacherRecordMatch(jadwalFitra, assyfa, null, { allowSingleWordFirstToken: true }), false);
});

test('1.4: getTeacherScheduleSummary mengembalikan jumlah jadwal, urutan hari mengajar, dan daftar kelas-mapel secara akurat', () => {
  const getSummary = (workflow as any).getTeacherScheduleSummary;
  assert.strictEqual(typeof getSummary, 'function', 'getTeacherScheduleSummary harus diekspor dari workflow.ts');

  const susana = {
    id: 'af4f4ab1-520f-48be-9b01-349ec72b4a95',
    nama_guru: 'Susana Muliono',
    nip: 'Susana',
    mata_pelajaran: 'X Merdeka_PP, XI Merdeka_PP, XII Merdeka_PP',
  };
  const summary = getSummary(susana, sampleNizamudinJadwal);
  assert.strictEqual(summary.totalJadwal, 3);
  assert.deepStrictEqual(summary.hariMengajarList, ['Rabu', 'Kamis']);
});

// ---------------------------------------------------------------------------
// SECTION 2: Tempat/Lokasi KBM Backfill & Resolution Helper
// ---------------------------------------------------------------------------
console.log('\n--- Section 2: Resolusi & Backfill Tempat/Lokasi KBM Guru ---');

test('2.1: isValidLokasiKbm membedakan nama ruang/lokasi KBM asli vs nilai kosong/placeholder/GPS', () => {
  const isValid = (workflow as any).isValidLokasiKbm;
  assert.strictEqual(typeof isValid, 'function', 'isValidLokasiKbm harus diekspor dari workflow.ts');

  assert.strictEqual(isValid(null), false);
  assert.strictEqual(isValid(''), false);
  assert.strictEqual(isValid('-'), false);
  assert.strictEqual(isValid(' - '), false);
  assert.strictEqual(isValid('Lokasi tidak terdeteksi'), false);
  assert.strictEqual(isValid('GPS: 0.721077, 124.380673'), false);
  assert.strictEqual(isValid('0.721077, 124.380673'), false);

  assert.strictEqual(isValid('Kelas X Merdeka'), true);
  assert.strictEqual(isValid('Ruang kelas x'), true);
  assert.strictEqual(isValid('Ruang guru'), true);
  assert.strictEqual(isValid('Musolah'), true);
});

test('2.2: resolveTeacherLokasiKbm mengisi lokasi_kbm yang kosong dengan lokasi yang pernah diisi guru tersebut (prioritas kelas sama -> umum guru)', () => {
  const resolveLokasi = (workflow as any).resolveTeacherLokasiKbm;
  assert.strictEqual(typeof resolveLokasi, 'function', 'resolveTeacherLokasiKbm harus diekspor dari workflow.ts');

  const historyRows = [
    {
      id: 'h1',
      tanggal: '2026-11-10',
      user_id: 'u-ade',
      nama_guru: 'Ade Fitrawan Ibrahim',
      kelas: 'X Merdeka',
      mapel: 'X Merdeka_MTK',
      lokasi_kbm: 'Kelas X Merdeka',
    },
    {
      id: 'h2',
      tanggal: '2026-11-11',
      user_id: 'u-ade',
      nama_guru: 'Ade Fitrawan Ibrahim',
      kelas: 'XI Merdeka',
      mapel: 'XI Merdeka_MTK',
      lokasi_kbm: 'Kelas XI merdeka',
    },
    {
      id: 'h3',
      tanggal: '2026-11-12',
      user_id: 'u-saskia',
      nama_guru: 'Saskia Agow',
      kelas: 'X Merdeka',
      mapel: 'X Merdeka_B. Indo',
      lokasi_kbm: 'Ruang guru',
    },
  ];

  // 1. Jika lokasi_kbm sudah terisi valid, pertahankan nilainya
  assert.strictEqual(
    resolveLokasi(
      { user_id: 'u-ade', nama_guru: 'Ade Fitrawan Ibrahim', kelas: 'X Merdeka', lokasi_kbm: 'Lab Komputer' },
      historyRows
    ),
    'Lab Komputer'
  );

  // 2. Jika lokasi_kbm kosong/strip/GPS, ambil lokasi yang pernah diisi guru tersebut di kelas yang sama
  assert.strictEqual(
    resolveLokasi(
      { user_id: 'u-ade', nama_guru: 'Ade Fitrawan Ibrahim', kelas: 'XI Merdeka', lokasi_kbm: null, lokasi: 'GPS: 0.721, 124.380' },
      historyRows
    ),
    'Kelas XI merdeka'
  );

  // 3. Guru belum pernah mengisi lokasi di kelas XII Merdeka: JANGAN menarik lokasi kelas lain (kosong)
  assert.strictEqual(
    resolveLokasi(
      { user_id: 'u-saskia', nama_guru: 'Saskia Agow', kelas: 'XII Merdeka', lokasi_kbm: '-', lokasi: '-' },
      historyRows
    ),
    '-'
  );

  // 4. Kelas kosong / '-' (mis. Jurnal Kegiatan): tidak menarik lokasi dari kelas manapun
  assert.strictEqual(
    resolveLokasi({ user_id: 'u-ade', nama_guru: 'Ade Fitrawan Ibrahim', kelas: '-', lokasi_kbm: null }, historyRows),
    '-'
  );
  assert.strictEqual(
    resolveLokasi({ user_id: 'u-ade', nama_guru: 'Ade Fitrawan Ibrahim', kelas: '', lokasi_kbm: null }, historyRows),
    '-'
  );
});

// ---------------------------------------------------------------------------
// SECTION 3: Strict KBM Journal Filtering for KBM-Only Teachers
// ---------------------------------------------------------------------------
console.log('\n--- Section 3: Penyaringan Jurnal Sesuai KBM untuk Guru Hanya Mengajar KBM ---');

test('3.1: isJournalEligibleForKbmTeacher memfilter murni jurnal sesuai KBM guru dan mempertahankan jurnal KBM historis', () => {
  const isEligible = (workflow as any).isJournalEligibleForKbmTeacher;
  assert.strictEqual(typeof isEligible, 'function', 'isJournalEligibleForKbmTeacher harus diekspor dari workflow.ts');

  const susanaAssignments = [
    { kelas: 'X Merdeka', nama_mata_pelajaran: 'X Merdeka_PP', nama_mapel: 'PP', hariList: ['Kamis'] },
    { kelas: 'XI Merdeka', nama_mata_pelajaran: 'XI Merdeka_PP', nama_mapel: 'PP', hariList: ['Kamis'] },
    { kelas: 'XII Merdeka', nama_mata_pelajaran: 'XII Merdeka_PP', nama_mapel: 'PP', hariList: ['Rabu'] },
  ];
  const susanaSchedules = sampleNizamudinJadwal.filter(j => j.nama_guru === 'Susan');

  // a) Jurnal KBM normal sesuai kelas & mapel
  assert.strictEqual(
    isEligible(
      { kelas: 'XII Merdeka', mapel: 'XII Merdeka_PP', keterangan: 'Jurnal KBM', materi: 'Pancasila' },
      susanaAssignments,
      susanaSchedules
    ),
    true
  );

  // b) Jurnal KBM historis (September 2026) yang punya kelas='XII Merdeka' & mapel='XII Merdeka_PP' tapi keterangan='Jurnal Kegiatan'
  assert.strictEqual(
    isEligible(
      { kelas: 'XII Merdeka', mapel: 'XII Merdeka_PP', keterangan: 'Jurnal Kegiatan', materi: 'Bab 2' },
      susanaAssignments,
      susanaSchedules
    ),
    true,
    'Jurnal KBM historis dengan kelas & mapel KBM valid harus tetap ditampilkan'
  );

  // c) Jurnal Kegiatan murni non-KBM (kelas='-', mapel='Jurnal Kegiatan') -> HARUS DISEMBUNYIKAN
  assert.strictEqual(
    isEligible(
      { kelas: '-', mapel: 'Jurnal Kegiatan', keterangan: 'Jurnal Kegiatan', materi: 'Rapat Guru' },
      susanaAssignments,
      susanaSchedules
    ),
    false,
    'Jurnal Kegiatan non-KBM harus disembunyikan untuk guru Hanya KBM'
  );

  // d) Baris sintetis hari tidak mengajar ("tidak melaksanakan kegiatan apapun") -> HARUS DISEMBUNYIKAN
  assert.strictEqual(
    isEligible(
      { kelas: '-', mapel: '-', keterangan: 'tidak melaksanakan kegiatan apapun' },
      susanaAssignments,
      susanaSchedules
    ),
    false
  );

  // e) Jurnal mapel/kelas yang BUKAN KBM guru tersebut (tanpa INVAL) -> HARUS DISEMBUNYIKAN
  assert.strictEqual(
    isEligible(
      { kelas: 'X Merdeka', mapel: 'X Merdeka_Fisika', keterangan: 'Jurnal KBM' },
      susanaAssignments,
      susanaSchedules
    ),
    false,
    'Jurnal mapel yang bukan diampu guru tersebut harus disaring keluar'
  );

  // f) Jurnal INVAL menggantikan guru lain pada KBM -> TETAP DITAMPILKAN
  assert.strictEqual(
    isEligible(
      { kelas: 'X Merdeka', mapel: 'X Merdeka_Fisika', keterangan: '[INVAL - Menggantikan: Ambar] Jurnal KBM' },
      susanaAssignments,
      susanaSchedules
    ),
    true,
    'Jurnal INVAL KBM tetap diizinkan tampil'
  );
});

// ---------------------------------------------------------------------------
// SECTION 4: Static Integration Checks Across Components & Migrations
// ---------------------------------------------------------------------------
console.log('\n--- Section 4: Integrasi Komponen UI & Migrasi Database ---');

test('4.1: RekapJurnalView menggunakan resolveTeacherLokasiKbm dan isJournalEligibleForKbmTeacher serta menyinkronkan total kartu dengan filteredJurnal', () => {
  const rekapSrc = fs.readFileSync(path.join(root, 'src', 'components', 'RekapJurnalView.tsx'), 'utf8');
  assert.ok(rekapSrc.includes('resolveTeacherLokasiKbm'), 'RekapJurnalView harus menggunakan resolveTeacherLokasiKbm');
  assert.ok(rekapSrc.includes('isJournalEligibleForKbmTeacher'), 'RekapJurnalView harus menggunakan isJournalEligibleForKbmTeacher');
  assert.ok(rekapSrc.includes('teacherLokasiHistory'), 'RekapJurnalView harus menyimpan state teacherLokasiHistory lintas waktu');
});

test('4.2: GuruJurnal melakukan prefill lokasiKbm dari riwayat lokasi KBM yang pernah diisi guru', () => {
  const guruJurnalSrc = fs.readFileSync(path.join(root, 'src', 'components', 'GuruJurnal.tsx'), 'utf8');
  assert.ok(guruJurnalSrc.includes('resolveTeacherLokasiKbm'), 'GuruJurnal harus menggunakan resolveTeacherLokasiKbm untuk prefill lokasi KBM');
});

test('4.3: AdminConfigView menyediakan UI rekonstruksi kebijakan kehadiran dengan getTeacherScheduleSummary', () => {
  const adminConfigSrc = fs.readFileSync(path.join(root, 'src', 'components', 'AdminConfigView.tsx'), 'utf8');
  assert.ok(adminConfigSrc.includes('getTeacherScheduleSummary'), 'AdminConfigView harus menggunakan getTeacherScheduleSummary');
});

test('4.5: GuruJurnal mengosongkan lokasiKbm saat kelas kosong/berubah dan riwayat difilter per kelas', () => {
  const src = fs.readFileSync(path.join(root, 'src', 'components', 'GuruJurnal.tsx'), 'utf8');
  assert.ok(/histLokQ\s*=\s*histLokQ\.eq\('kelas',\s*kelas\)/.test(src), 'histLokQ harus difilter .eq(kelas)');
  assert.ok(src.includes('prevKelasLokasiRef'), 'harus ada pelacak perubahan kelas untuk reset lokasiKbm');
  assert.ok(/!kelas \|\| \(tipeJurnal !== 'Jurnal KBM'[\s\S]{0,400}setLokasiKbm\(''\)/.test(src), 'saat !kelas lokasiKbm dikosongkan');
  assert.ok(src.includes('draft.lokasiKbm !== undefined && !hasExplicitIntent'), 'draft.lokasiKbm tidak dipulihkan saat explicit intent');
});

test('4.6: Migrasi trigger lokasi_kbm hanya kelas yang sama + pembersihan lintas kelas', () => {
  const migPath = path.join(root, 'supabase', 'migrations', '20261114180000_fix_lokasi_kbm_strict_class_only.sql');
  assert.ok(fs.existsSync(migPath), 'migrasi strict class-only harus ada');
  const sql = fs.readFileSync(migPath, 'utf8');
  assert.ok(!/ELSE 1/.test(sql), 'tidak boleh ada fallback lintas kelas (ORDER BY CASE ... ELSE 1)');
  assert.ok(/lower\(btrim\(COALESCE\(h\.kelas, ''\)\)\) = lower\(btrim\(COALESCE\(NEW\.kelas, ''\)\)\)/.test(sql), 'WHERE harus mewajibkan kelas sama');
  assert.ok(/UPDATE public\.jurnal_pembelajaran/.test(sql), 'harus membersihkan baris lintas kelas');
  const tpl = fs.readFileSync(path.join(root, 'supabase', 'SETUP_NEW_SCHOOL_TEMPLATE.sql'), 'utf8');
  assert.ok(!/ELSE 1\s*END,\s*\n\s*h\.tanggal/.test(tpl), 'template SQL tidak boleh fallback lintas kelas');
});

test('4.4: File migrasi SQL backfill lokasi_kbm tersedia', () => {
  const migPath = path.join(root, 'supabase', 'migrations', '20261114130000_backfill_lokasi_kbm_and_trigger.sql');
  assert.ok(fs.existsSync(migPath), 'File migrasi 20261114130000_backfill_lokasi_kbm_and_trigger.sql harus ada');
});

console.log('\n========================================================================');
console.log(`SUMMARY: Passed: ${passed} | Failed: ${failed}`);
console.log('========================================================================\n');

if (failed > 0) {
  process.exit(1);
}
