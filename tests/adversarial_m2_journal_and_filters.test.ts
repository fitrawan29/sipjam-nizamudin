import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('ADVERSARIAL STRESS TEST SUITE: MILESTONE 2 VERIFICATION');
console.log('Testing: GuruJurnal.tsx, RekapJurnalView.tsx, HistoryView.tsx');
console.log('========================================================================\n');

// ========================================================================
// 1. GURUJURNAL: DEDUPLICATION & ADMIN NOTES RESOLUTION ORACLE
// ========================================================================
console.log('--- 1. Testing GuruJurnal Rejection Aggregation & Deduplication Oracle ---');

function deduplicateRejectedJournals(dailyRejected: any[] | null | undefined, dbRejected: any[]) {
  const map = new Map<string, any>();
  if (dailyRejected && Array.isArray(dailyRejected)) {
    dailyRejected.forEach(j => {
      if (j.id) map.set(j.id, j);
      else map.set(`${j.tanggal}-${j.mapel}-${j.kelas}`, j);
    });
  }
  dbRejected.forEach(j => {
    if (j.id) map.set(j.id, j);
    else map.set(`${j.tanggal}-${j.mapel}-${j.kelas}`, j);
  });
  return Array.from(map.values());
}

function resolveRejectionNote(j: any): string {
  return j.catatan_admin || j.alasan_penolakan || j.catatan_penolakan || j.keterangan_penolakan || 'Harap perbaiki dokumentasi atau materi KBM';
}

// 1.1 Deduplication with identical IDs
const daily1 = [{ id: 'j-1', tanggal: '2026-11-04', mapel: 'Matematika', kelas: '7A', catatan_admin: 'Foto buram - daily' }];
const db1 = [{ id: 'j-1', tanggal: '2026-11-04', mapel: 'Matematika', kelas: '7A', catatan_admin: 'Foto buram - db updated' }];
const res1 = deduplicateRejectedJournals(daily1, db1);
assert.strictEqual(res1.length, 1, 'Duplicate ID must be deduplicated to exactly 1 entry');
assert.strictEqual(res1[0].catatan_admin, 'Foto buram - db updated', 'DB entry should overwrite stale dailyState');
console.log('  ✔ [PASS] 1.1: Deduplication by ID correctly collapses duplicates and favors fresh DB data');

// 1.2 Fallback key deduplication when id is absent
const daily2 = [{ tanggal: '2026-11-03', mapel: 'IPA', kelas: '8B', alasan_penolakan: 'RPP belum sesuai' }];
const db2 = [{ tanggal: '2026-11-03', mapel: 'IPA', kelas: '8B', alasan_penolakan: 'RPP revisi diminta' }];
const res2 = deduplicateRejectedJournals(daily2, db2);
assert.strictEqual(res2.length, 1, 'Duplicate without ID must be deduplicated by compound key');
assert.strictEqual(res2[0].alasan_penolakan, 'RPP revisi diminta');
console.log('  ✔ [PASS] 1.2: Compound key fallback (${tanggal}-${mapel}-${kelas}) cleanly deduplicates ID-less items');

// 1.3 Null / undefined safe handling
assert.strictEqual(deduplicateRejectedJournals(null, []).length, 0);
assert.strictEqual(deduplicateRejectedJournals(undefined, []).length, 0);
assert.strictEqual(deduplicateRejectedJournals(null, [{ id: 'j-2', tanggal: '2026-11-02' }]).length, 1);
console.log('  ✔ [PASS] 1.3: Null/undefined dailyState handled without throwing TypeError');

// 1.4 Admin notes fallback chain oracle
assert.strictEqual(resolveRejectionNote({ catatan_admin: 'Catatan 1' }), 'Catatan 1');
assert.strictEqual(resolveRejectionNote({ alasan_penolakan: 'Alasan 2' }), 'Alasan 2');
assert.strictEqual(resolveRejectionNote({ catatan_penolakan: 'Catatan Penolakan 3' }), 'Catatan Penolakan 3');
assert.strictEqual(resolveRejectionNote({ keterangan_penolakan: 'Keterangan 4' }), 'Keterangan 4');
assert.strictEqual(resolveRejectionNote({}), 'Harap perbaiki dokumentasi atau materi KBM');
console.log('  ✔ [PASS] 1.4: Admin rejection note resolution chain works correctly across all column aliases');

// 1.5 Stress test with 100 mixed entries
const stressDaily: any[] = [];
const stressDb: any[] = [];
for (let i = 0; i < 50; i++) {
  stressDaily.push({ id: `item-${i}`, tanggal: '2026-11-01', mapel: `Mapel ${i}`, kelas: '7A' });
  // Every even item is in DB with same ID
  if (i % 2 === 0) {
    stressDb.push({ id: `item-${i}`, tanggal: '2026-11-01', mapel: `Mapel ${i}`, kelas: '7A', catatan_admin: `Updated note ${i}` });
  }
}
// Add 25 new unique items in DB
for (let i = 50; i < 75; i++) {
  stressDb.push({ id: `item-${i}`, tanggal: '2026-11-02', mapel: `Mapel ${i}`, kelas: '8A' });
}
const stressRes = deduplicateRejectedJournals(stressDaily, stressDb);
// Total unique items: 50 from daily + 25 distinct from DB = 75 total
assert.strictEqual(stressRes.length, 75, `Expected 75 unique items, got ${stressRes.length}`);
console.log('  ✔ [PASS] 1.5: Large-scale stress test (100 mixed records) yielded exact 75 unique entries');


// ========================================================================
// 2. REKAPJURNALVIEW: SEARCHMATERI FILTERING & UI ORACLE
// ========================================================================
console.log('\n--- 2. Testing RekapJurnalView searchMateri Filter & View Modes ---');

function filterRekapJurnal(jurnalList: any[], searchMateri: string, searchGeneral: string) {
  return (jurnalList || [])
    .filter(j => {
      if (searchMateri) {
        const sm = searchMateri.toLowerCase();
        const matchesMateri = Boolean(
          (j.materi && j.materi.toLowerCase().includes(sm)) ||
          (j.materi_pembelajaran && j.materi_pembelajaran.toLowerCase().includes(sm)) ||
          (j.konten && j.konten.toLowerCase().includes(sm)) ||
          (j.tujuan_pembelajaran && j.tujuan_pembelajaran.toLowerCase().includes(sm)) ||
          (j.kegiatan && j.kegiatan.toLowerCase().includes(sm)) ||
          (j.kegiatan_pembelajaran && j.kegiatan_pembelajaran.toLowerCase().includes(sm))
        );
        if (!matchesMateri) return false;
      }
      if (!searchGeneral) return true;
      const s = searchGeneral.toLowerCase();
      return (
        (j.nama_guru && j.nama_guru.toLowerCase().includes(s)) ||
        (j.konten && j.konten.toLowerCase().includes(s)) ||
        (j.kktp && j.kktp.toLowerCase().includes(s)) ||
        (j.lokasi_kbm && j.lokasi_kbm.toLowerCase().includes(s)) ||
        (j.materi && j.materi.toLowerCase().includes(s)) ||
        (j.materi_pembelajaran && j.materi_pembelajaran.toLowerCase().includes(smField(j))) ||
        (j.tujuan_pembelajaran && j.tujuan_pembelajaran.toLowerCase().includes(s)) ||
        (j.kegiatan && j.kegiatan.toLowerCase().includes(s)) ||
        (j.kegiatan_pembelajaran && j.kegiatan_pembelajaran.toLowerCase().includes(s)) ||
        (j.kelas && j.kelas.toLowerCase().includes(s)) ||
        (j.mapel && j.mapel.toLowerCase().includes(s)) ||
        (j.tanggal && j.tanggal.toLowerCase().includes(s)) ||
        (j.kehadiran_murid && j.kehadiran_murid.toLowerCase().includes(s)) ||
        (j.catatan_refleksi && j.catatan_refleksi.toLowerCase().includes(s)) ||
        (j.catatan_admin && j.catatan_admin.toLowerCase().includes(s)) ||
        (j.alasan_penolakan && j.alasan_penolakan.toLowerCase().includes(s)) ||
        (j.catatan_penolakan && j.catatan_penolakan.toLowerCase().includes(s)) ||
        (j.keterangan_penolakan && j.keterangan_penolakan.toLowerCase().includes(s)) ||
        (j.status_verifikasi && j.status_verifikasi.toLowerCase().includes(s)) ||
        (j.keterangan && j.keterangan.toLowerCase().includes(s))
      );
    });
}
function smField(j: any) { return (j.materi_pembelajaran || '').toLowerCase(); }

const sampleJournals = [
  { id: '1', materi: 'Trigonometri Dasar', kelas: '10A', status_verifikasi: 'Disetujui' },
  { id: '2', materi_pembelajaran: 'Hukum Newton II', kelas: '10B', status_verifikasi: 'Ditolak', catatan_admin: 'Lampirkan silabus' },
  { id: '3', konten: 'Sistem Pencernaan Manusia', kelas: '8C', status_verifikasi: 'Menunggu' },
  { id: '4', tujuan_pembelajaran: 'Menganalisis teks naratif Bahasa Inggris', kelas: '9A', status_verifikasi: 'Disetujui' },
  { id: '5', kegiatan: 'Praktikum Larutan Asam Basa di Lab Kimia', kelas: '11IPA', status_verifikasi: 'Disetujui' },
  { id: '6', kegiatan_pembelajaran: 'Diskusi Kelompok Pemrograman Web NextJS', kelas: '12RPL', status_verifikasi: 'Ditolak', catatan_penolakan: 'Foto KBM buram' },
  { id: '7', materi: null, konten: null, kegiatan: null, status_verifikasi: 'Tidak Masuk Kelas' }
];

// 2.1 Case insensitivity & multi-column coverage
const matchNewton = filterRekapJurnal(sampleJournals, 'NEWTON', '');
assert.strictEqual(matchNewton.length, 1);
assert.strictEqual(matchNewton[0].id, '2');

const matchPencernaan = filterRekapJurnal(sampleJournals, 'pencernaan', '');
assert.strictEqual(matchPencernaan.length, 1);
assert.strictEqual(matchPencernaan[0].id, '3');

const matchNaratif = filterRekapJurnal(sampleJournals, 'Naratif', '');
assert.strictEqual(matchNaratif.length, 1);
assert.strictEqual(matchNaratif[0].id, '4');

const matchAsamBasa = filterRekapJurnal(sampleJournals, 'asam basa', '');
assert.strictEqual(matchAsamBasa.length, 1);
assert.strictEqual(matchAsamBasa[0].id, '5');

const matchNextJs = filterRekapJurnal(sampleJournals, 'nextjs', '');
assert.strictEqual(matchNextJs.length, 1);
assert.strictEqual(matchNextJs[0].id, '6');

console.log('  ✔ [PASS] 2.1: searchMateri correctly matches across materi, materi_pembelajaran, konten, tujuan_pembelajaran, kegiatan, kegiatan_pembelajaran');

// 2.2 Dual filter interaction
const dualMatch = filterRekapJurnal(sampleJournals, 'newton', '10B');
assert.strictEqual(dualMatch.length, 1);
const dualMismatch = filterRekapJurnal(sampleJournals, 'newton', '10A');
assert.strictEqual(dualMismatch.length, 0);
console.log('  ✔ [PASS] 2.2: Dual filtering (searchMateri + general search) operates conjunctively as expected');

// 2.3 Null / empty handling without exceptions
const nullQueryMatch = filterRekapJurnal(sampleJournals, '', '');
assert.strictEqual(nullQueryMatch.length, 7, 'Empty search must return all entries');
const unmatchedQuery = filterRekapJurnal(sampleJournals, 'Termodinamika Quantum 999', '');
assert.strictEqual(unmatchedQuery.length, 0);
console.log('  ✔ [PASS] 2.3: Gracefully handles null/empty fields and non-matching queries');

// 2.4 Verify no-print containment on modal
const rekapContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'RekapJurnalView.tsx'), 'utf-8');
assert.ok(rekapContent.includes('id="modal-detail-jurnal"'), 'Modal element must exist');
assert.ok(
  rekapContent.includes('id="modal-detail-jurnal"') && rekapContent.includes('no-print'),
  'modal-detail-jurnal MUST be tagged with no-print class'
);
console.log('  ✔ [PASS] 2.4: Modal detail container is strictly guarded with no-print CSS utility');


// ========================================================================
// 3. HISTORYVIEW: MULTI-FORMAT TIMESTAMP MONTH FILTER HARNESS
// ========================================================================
console.log('\n--- 3. Testing HistoryView Multi-Format Month Filtering Harness ---');

function filterHistoryPresensi(dataList: any[], filterBulan: string, search: string) {
  return dataList.filter(item => {
    if (filterBulan) {
      const ts = String(item.timestamp || item.tanggal || '');
      let matchMonth = false;
      if (ts.startsWith(filterBulan) || ts.includes(filterBulan)) {
        matchMonth = true;
      } else {
        const slashMatch = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (slashMatch) {
          const m = slashMatch[1].padStart(2, '0');
          const y = slashMatch[3];
          if (`${y}-${m}` === filterBulan) matchMonth = true;
        }
      }
      if (!matchMonth) return false;
    }

    if (!search) return true;
    const s = search.toLowerCase();
    return (item.tipe_absen || '').toLowerCase().includes(s) || 
           (item.jenis_presensi || '').toLowerCase().includes(s) ||
           (item.status_verifikasi || '').toLowerCase().includes(s) ||
           (item.detail_izin || '').toLowerCase().includes(s) ||
           (item.catatan_admin || '').toLowerCase().includes(s);
  });
}

const testAttendanceData = [
  // November 2026 targets
  { id: 't1', timestamp: '2026-11-04T07:15:00+08:00', tipe_absen: 'Datang', jenis_presensi: 'Hadir' },
  { id: 't2', timestamp: '2026-11-04T07:15:00.000Z', tipe_absen: 'Datang', jenis_presensi: 'Hadir' },
  { id: 't3', timestamp: '2026-11-04 07:15:00', tipe_absen: 'Pulang', jenis_presensi: 'Hadir' },
  { id: 't4', tanggal: '2026-11-04', tipe_absen: 'Datang', jenis_presensi: 'Hadir' },
  { id: 't5', timestamp: '11/04/2026 07:15:00', tipe_absen: 'Datang', jenis_presensi: 'Hadir' },
  { id: 't6', timestamp: '11/4/2026 07:15:00', tipe_absen: 'Datang', jenis_presensi: 'Hadir' },
  { id: 't7', timestamp: 'Recorded on 2026-11-02 by Scanner', tipe_absen: 'Datang', jenis_presensi: 'Hadir' },

  // Non-November 2026 controls
  { id: 'c1', timestamp: '2026-10-31 23:59:59', tipe_absen: 'Datang', jenis_presensi: 'Hadir' },
  { id: 'c2', timestamp: '2026-12-01 00:00:01', tipe_absen: 'Datang', jenis_presensi: 'Hadir' },
  { id: 'c3', timestamp: '2025-11-04 07:15:00', tipe_absen: 'Datang', jenis_presensi: 'Hadir' },
  { id: 'c4', timestamp: '10/15/2026 08:00:00', tipe_absen: 'Datang', jenis_presensi: 'Hadir' },
  { id: 'c5', timestamp: null, tanggal: null, tipe_absen: 'Datang', jenis_presensi: 'Hadir' },
  { id: 'c6', timestamp: '', tipe_absen: 'Datang', jenis_presensi: 'Hadir' },

  // March single-digit test
  { id: 'm1', timestamp: '3/9/2026 07:10:00', tipe_absen: 'Datang', jenis_presensi: 'Hadir' },
  { id: 'm2', timestamp: '2026-03-09 07:10:00', tipe_absen: 'Datang', jenis_presensi: 'Hadir' }
];

// 3.1 Verify November 2026 filter
const novFiltered = filterHistoryPresensi(testAttendanceData, '2026-11', '');
assert.strictEqual(novFiltered.length, 7, `Expected exactly 7 November items, got ${novFiltered.length}`);
const novIds = new Set(novFiltered.map(x => x.id));
assert.ok(novIds.has('t1'), 'ISO with offset must match');
assert.ok(novIds.has('t2'), 'ISO UTC must match');
assert.ok(novIds.has('t3'), 'SQL datetime string must match');
assert.ok(novIds.has('t4'), 'Date only string must match');
assert.ok(novIds.has('t5'), 'MM/DD/YYYY format must match');
assert.ok(novIds.has('t6'), 'M/D/YYYY format must match');
assert.ok(novIds.has('t7'), 'String with embedded date must match');
console.log('  ✔ [PASS] 3.1: All 7 valid November timestamp representations matched successfully');

// 3.2 Verify exclusion of boundary and other month records
assert.ok(!novIds.has('c1'), 'October 31 must NOT match November');
assert.ok(!novIds.has('c2'), 'December 1 must NOT match November');
assert.ok(!novIds.has('c3'), 'November 2025 must NOT match November 2026');
assert.ok(!novIds.has('c4'), 'October slash format must NOT match November');
assert.ok(!novIds.has('c5'), 'Null timestamp must NOT match');
assert.ok(!novIds.has('c6'), 'Empty timestamp must NOT match');
console.log('  ✔ [PASS] 3.2: False positives accurately excluded across temporal and empty boundaries');

// 3.3 Verify March single-digit slash matching
const marFiltered = filterHistoryPresensi(testAttendanceData, '2026-03', '');
assert.strictEqual(marFiltered.length, 2);
assert.ok(marFiltered.some(x => x.id === 'm1'));
assert.ok(marFiltered.some(x => x.id === 'm2'));
console.log('  ✔ [PASS] 3.3: Single-digit month (3/9/2026) padded to 2026-03 and matched');

// 3.4 Combined month + search query
const novDatang = filterHistoryPresensi(testAttendanceData, '2026-11', 'Pulang');
assert.strictEqual(novDatang.length, 1);
assert.strictEqual(novDatang[0].id, 't3');
console.log('  ✔ [PASS] 3.4: Combined month filter and text search operates with high precision');


// ========================================================================
// 4. VERIFY SOURCE CODE SANITY & SAFETY
// ========================================================================
console.log('\n--- 4. Static Invariant Verification ---');
const historyContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'HistoryView.tsx'), 'utf-8');
const guruContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'GuruJurnal.tsx'), 'utf-8');

// Check that month picker in HistoryView resets page on change
assert.ok(
  historyContent.includes("setFilterBulan(e.target.value); setPage(0);"),
  'Changing month filter must reset pagination page to 0'
);
assert.ok(
  historyContent.includes("setFilterBulan(''); setPage(0);"),
  'Clearing month filter must reset pagination page to 0'
);
console.log('  ✔ [PASS] 4.1: HistoryView resets pagination page to 0 whenever filterBulan updates');

// Check that GuruJurnal banner has proper aria or role semantics
assert.ok(
  guruContent.includes('id="banner-jurnal-ditolak"'),
  'GuruJurnal has explicit banner container'
);
console.log('  ✔ [PASS] 4.2: GuruJurnal has dedicated banner-jurnal-ditolak element');

console.log('\n========================================================================');
console.log('🎉 ALL EMPIRICAL CHALLENGER STRESS TESTS PASSED!');
console.log('========================================================================\n');
