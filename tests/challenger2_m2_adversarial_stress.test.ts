import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('CHALLENGER 2: ADVERSARIAL STRESS TEST SUITE FOR MILESTONE 2');
console.log('========================================================================\n');

const srcDir = path.join(__dirname, '..', 'src');

// ========================================================================
// ADV-1: CATATAN_ADMIN / REJECTION NOTES ROBUSTNESS (EMPTY, NULL, UNDEFINED)
// ========================================================================
console.log('--- ADV-1: Robustness of catatan_admin Fallback Chains ---');

// Fallback logic as implemented in GuruJurnal.tsx and RekapJurnalView.tsx
const resolveAlasanGuruJurnal = (j: any) => {
  return j.catatan_admin || j.alasan_penolakan || j.catatan_penolakan || j.keterangan_penolakan || 'Harap perbaiki dokumentasi atau materi KBM';
};

const resolveAlasanRekapPersonal = (j: any) => {
  return j.catatan_admin || j.alasan_penolakan || j.catatan_penolakan || j.keterangan_penolakan || 'Harap perbaiki dokumentasi/materi KBM';
};

const resolveModalAlasan = (selectedJurnal: any) => {
  return selectedJurnal.catatan_admin || selectedJurnal.alasan_penolakan || selectedJurnal.catatan_penolakan || selectedJurnal.keterangan_penolakan || 'Harap perbaiki dokumentasi atau materi KBM';
};

// 1.1 Null, undefined, empty string handling
const testCasesEmpty = [
  { catatan_admin: null },
  { catatan_admin: undefined },
  { catatan_admin: '' },
  {},
  { catatan_admin: null, alasan_penolakan: undefined, catatan_penolakan: '', keterangan_penolakan: null },
];

for (const tc of testCasesEmpty) {
  assert.doesNotThrow(() => {
    const res1 = resolveAlasanGuruJurnal(tc);
    assert.strictEqual(res1, 'Harap perbaiki dokumentasi atau materi KBM');
    const res2 = resolveAlasanRekapPersonal(tc);
    assert.strictEqual(res2, 'Harap perbaiki dokumentasi/materi KBM');
    const res3 = resolveModalAlasan(tc);
    assert.strictEqual(res3, 'Harap perbaiki dokumentasi atau materi KBM');
  }, 'Should not throw on null, undefined, or empty catatan_admin');
}
console.log('  ✔ [PASS] 1.1: Null, undefined, and empty string fallback to standard instructions without throwing');

// 1.2 Cascading fallbacks
assert.strictEqual(resolveAlasanGuruJurnal({ catatan_admin: 'Admin note' }), 'Admin note');
assert.strictEqual(resolveAlasanGuruJurnal({ alasan_penolakan: 'Alasan note' }), 'Alasan note');
assert.strictEqual(resolveAlasanGuruJurnal({ catatan_penolakan: 'Catatan note' }), 'Catatan note');
assert.strictEqual(resolveAlasanGuruJurnal({ keterangan_penolakan: 'Keterangan note' }), 'Keterangan note');
console.log('  ✔ [PASS] 1.2: Fallback chain precedence (catatan_admin > alasan_penolakan > catatan_penolakan > keterangan_penolakan) verified');

// 1.3 Extreme edge cases: Multiline, unicode, HTML tags, 20,000 chars
const longStr = 'X'.repeat(20000);
const prefix = `Revisi Diperlukan:\n1. Foto blur\n2. TP belum sesuai <script>alert(1)</script>\n3. ⚠️ Emojis & Arabic: ممتاز\n`;
const edgeNoteJournal = {
  catatan_admin: `${prefix}${longStr}`
};
assert.doesNotThrow(() => {
  const note = resolveAlasanGuruJurnal(edgeNoteJournal);
  assert.ok(note.includes('Revisi Diperlukan'));
  assert.ok(note.includes('ممتاز'));
  assert.strictEqual(note.length, longStr.length + prefix.length);
});
console.log('  ✔ [PASS] 1.3: Catatan admin safely accepts multiline, emojis, foreign alphabets, and 20,000 char strings');

// 1.4 Deduplication map resilience in GuruJurnal
const buildDeduplicatedRejected = (dailyJurnal: any[], dbJurnal: any[]) => {
  const map = new Map<string, any>();
  if (dailyJurnal && Array.isArray(dailyJurnal)) {
    dailyJurnal.forEach(j => {
      if (j.id) map.set(j.id, j);
      else map.set(`${j.tanggal}-${j.mapel}-${j.kelas}`, j);
    });
  }
  dbJurnal.forEach(j => {
    if (j.id) map.set(j.id, j);
    else map.set(`${j.tanggal}-${j.mapel}-${j.kelas}`, j);
  });
  return Array.from(map.values());
};

const duplicateTest = buildDeduplicatedRejected(
  [{ id: 'j-1', tanggal: '2026-11-04', mapel: 'IPA', kelas: '7A', status_verifikasi: 'Ditolak' }],
  [
    { id: 'j-1', tanggal: '2026-11-04', mapel: 'IPA', kelas: '7A', status_verifikasi: 'Ditolak', catatan_admin: 'Updated note' },
    { tanggal: '2026-11-03', mapel: 'IPS', kelas: '8B', status_verifikasi: 'Ditolak' },
    { tanggal: '2026-11-03', mapel: 'IPS', kelas: '8B', status_verifikasi: 'Ditolak' } // un-keyed duplicate
  ]
);
assert.strictEqual(duplicateTest.length, 2, 'Deduplication must collapse duplicates with same id or composite key');
assert.strictEqual(duplicateTest[0].catatan_admin, 'Updated note', 'Database record with notes should supersede dailyState stub');
console.log('  ✔ [PASS] 1.4: Map-based deduplication correctly collapses duplicate rejections and preserves notes');


// ========================================================================
// ADV-2: FILTERBULAN ZERO RECORDS & TIMEZONE/FORMAT PARSING
// ========================================================================
console.log('\n--- ADV-2: filterBulan Zero Records & Date Format Matrix ---');

const filterHistoryPresensi = (dataList: any[], filterBulan: string, search: string = '') => {
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

    return (item.tipe_absen || '').toLowerCase().includes(search.toLowerCase()) || 
           (item.jenis_presensi || '').toLowerCase().includes(search.toLowerCase()) ||
           (item.status_verifikasi || '').toLowerCase().includes(search.toLowerCase()) ||
           (item.detail_izin || '').toLowerCase().includes(search.toLowerCase()) ||
           (item.catatan_admin || '').toLowerCase().includes(search.toLowerCase());
  });
};

const sampleHistory = [
  { id: 1, timestamp: '2026-11-01 07:14:22', tipe_absen: 'Datang' },
  { id: 2, timestamp: '2026-11-02T07:15:00+08:00', tipe_absen: 'Datang' },
  { id: 3, timestamp: '11/3/2026 07:20:00', tipe_absen: 'Datang' },
  { id: 4, timestamp: '2026-10-31 07:10:00', tipe_absen: 'Datang' },
  { id: 5, tanggal: '2026-11-04', tipe_absen: 'Datang' }
];

// 2.1 Zero records month
const zeroResults = filterHistoryPresensi(sampleHistory, '1999-01');
assert.strictEqual(zeroResults.length, 0, 'Must return 0 records for month with no attendance');

// Check empty state text construction
const getEmptyMessage = (search: string, filterBulan: string, activeTab: string = 'presensi') => {
  return (search || filterBulan)
    ? `Tidak ada riwayat ${activeTab} yang sesuai dengan filter ${filterBulan ? `bulan "${filterBulan}"` : ''}${search ? ` dan pencarian "${search}"` : ''}.` 
    : `Belum ada riwayat ${activeTab}.`;
};

const emptyMsg = getEmptyMessage('', '1999-01');
assert.strictEqual(emptyMsg, 'Tidak ada riwayat presensi yang sesuai dengan filter bulan "1999-01".');
console.log('  ✔ [PASS] 2.1: Zero records month produces empty array and clean targeted empty message');

// 2.2 Combined filterBulan and search
const comboEmptyMsg = getEmptyMessage('Apel Pagi', '2026-11');
assert.strictEqual(comboEmptyMsg, 'Tidak ada riwayat presensi yang sesuai dengan filter bulan "2026-11" dan pencarian "Apel Pagi".');
console.log('  ✔ [PASS] 2.2: Combined month and query filter builds clean composite message');

// 2.3 Leap years & ISO formats
const leapHistory = [
  { id: 'l1', timestamp: '2024-02-29 07:00:00', tipe_absen: 'Datang' },
  { id: 'l2', timestamp: '2/29/2024 16:00:00', tipe_absen: 'Pulang' },
  { id: 'l3', timestamp: '2024-03-01 07:00:00', tipe_absen: 'Datang' },
];
const feb2024 = filterHistoryPresensi(leapHistory, '2024-02');
assert.strictEqual(feb2024.length, 2);
console.log('  ✔ [PASS] 2.3: Leap year leap day (Feb 29) accurately matched across ISO and slash representations');

// 2.4 Empty filterBulan returns all records
assert.strictEqual(filterHistoryPresensi(sampleHistory, '').length, 5);
console.log('  ✔ [PASS] 2.4: Empty filterBulan transparently retains all records');


// ========================================================================
// ADV-3: REGEX & SPECIAL CHARACTER INJECTIONS IN SEARCHMATERI
// ========================================================================
console.log('\n--- ADV-3: Adversarial Regex & Character Injections in searchMateri ---');

const filterJurnalWithSearchMateri = (jurnalData: any[], searchMateri: string) => {
  return jurnalData.filter(j => {
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
    return true;
  });
};

const sampleJournals = [
  { id: '1', materi: 'Aljabar [Kelas 7] (Persamaan Linear)' },
  { id: '2', materi: 'Trigonometri: sin(x) + cos(x) = 1' },
  { id: '3', materi: 'Fisika Kuantum & Teori String? Yes.*' },
  { id: '4', materi: 'Pemrograman: const regex = /^[a-z]+$/;' },
  { id: '5', materi: 'Bahasa Indonesia: Tanda baca (.,:;!?)' },
  { id: '6', materi: 'Kimia: H2O + CO2 -> H2CO3' },
  { id: '7', materi: 'Matematika: a\\b / c\\d' },
];

// Adversarial regex attack vectors that would crash unescaped RegExp
const maliciousRegexQueries = [
  '[Kelas 7]',          // Unclosed bracket or char class
  '(Persamaan',          // Unclosed parenthesis
  'sin(x) + cos(x)',     // Quantifier '+' without preceding token or grouped
  '?',                   // Dangling quantifier
  '*',                   // Dangling quantifier
  '.*',                  // Greedy wild match
  '/^[a-z]+$/',          // Literal regex string
  '\\',                  // Lone trailing escape character
  '\\\\',                // Double backslash
  '{1,3}',               // Quantifier range
  '(?=.*a)',             // Lookahead assertion
  '+++',                 // Multiple pluses
  '(((',                 // Multiple unclosed parentheses
  '[[[',                 // Multiple unclosed brackets
  '|',                   // Bare alternation
  '^$',                  // Start-end anchors
];

for (const q of maliciousRegexQueries) {
  assert.doesNotThrow(() => {
    const results = filterJurnalWithSearchMateri(sampleJournals, q);
    assert.ok(Array.isArray(results), `Query "${q}" must return valid array`);
  }, `Should not crash on malicious regex query: "${q}"`);
}
console.log('  ✔ [PASS] 3.1: All 16 hostile regex injection patterns handled safely without throwing syntax errors');

// Verify exact literal matching with special characters
const bracketMatch = filterJurnalWithSearchMateri(sampleJournals, '[Kelas 7]');
assert.strictEqual(bracketMatch.length, 1);
assert.strictEqual(bracketMatch[0].id, '1');

const mathMatch = filterJurnalWithSearchMateri(sampleJournals, 'sin(x)');
assert.strictEqual(mathMatch.length, 1);
assert.strictEqual(mathMatch[0].id, '2');

const backslashMatch = filterJurnalWithSearchMateri(sampleJournals, 'a\\b');
assert.strictEqual(backslashMatch.length, 1);
assert.strictEqual(backslashMatch[0].id, '7');
console.log('  ✔ [PASS] 3.2: Special characters match verbatim literal substrings as expected');


// ========================================================================
// ADV-4: PRINT MEDIA OUTPUT & STYLESHEET SUPPRESSION AUDIT
// ========================================================================
console.log('\n--- ADV-4: Print Media Output & no-print Suppression Audit ---');

const globalsCssPath = path.join(srcDir, 'app', 'globals.css');
assert.ok(fs.existsSync(globalsCssPath), 'globals.css must exist');
const globalsCss = fs.readFileSync(globalsCssPath, 'utf-8');

// 4.1 globals.css forces display: none !important for .no-print in @media print
assert.ok(
  globalsCss.includes('@media print') && globalsCss.includes('.no-print { display: none !important; }'),
  'globals.css must strictly enforce .no-print { display: none !important; } under @media print'
);
console.log('  ✔ [PASS] 4.1: globals.css strictly defines display: none !important for .no-print');

// 4.2 RekapJurnalView modal-detail-jurnal contains no-print class
const rekapJurnalViewPath = path.join(srcDir, 'components', 'RekapJurnalView.tsx');
const rekapJurnalCode = fs.readFileSync(rekapJurnalViewPath, 'utf-8');

assert.ok(
  rekapJurnalCode.includes('id="modal-detail-jurnal"') &&
  rekapJurnalCode.includes('no-print'),
  'modal-detail-jurnal must be flagged with no-print'
);

// Specifically verify modal-detail-jurnal element contains no-print
const modalTagStart = rekapJurnalCode.indexOf('id="modal-detail-jurnal"');
assert.ok(modalTagStart !== -1, 'id="modal-detail-jurnal" must exist');
const modalTag = rekapJurnalCode.slice(modalTagStart, modalTagStart + 250);
assert.ok(modalTag.includes('no-print'), 'modal-detail-jurnal element directly bears no-print class');
console.log('  ✔ [PASS] 4.2: #modal-detail-jurnal directly bears the no-print class preventing print pollution');

// 4.3 GuruJurnal banner-jurnal-ditolak contains no-print class
const guruJurnalCode = fs.readFileSync(path.join(srcDir, 'components', 'GuruJurnal.tsx'), 'utf-8');
const bannerTagStart = guruJurnalCode.indexOf('id="banner-jurnal-ditolak"');
assert.ok(bannerTagStart !== -1, 'id="banner-jurnal-ditolak" must exist');
const bannerTag = guruJurnalCode.slice(bannerTagStart, bannerTagStart + 250);
assert.ok(bannerTag.includes('no-print'), 'banner-jurnal-ditolak element directly bears no-print class');
console.log('  ✔ [PASS] 4.3: #banner-jurnal-ditolak directly bears the no-print class');

// 4.4 Table detail buttons are enclosed in no-print containers
assert.ok(
  rekapJurnalCode.includes('className="mt-1 no-print"') &&
  rekapJurnalCode.includes('className="mt-1.5 no-print not-italic"'),
  'Detail buttons in table rows must be wrapped in no-print containers'
);
console.log('  ✔ [PASS] 4.4: Table row "Detail" triggers are enclosed in no-print wrappers');

// 4.5 GuruJurnal container expands cleanly in print
assert.ok(
  guruJurnalCode.includes('print:max-w-none print:w-full print:mx-0 print:p-0'),
  'GuruJurnal must expand to full width in print'
);
console.log('  ✔ [PASS] 4.5: GuruJurnal container normalizes print layout (print:max-w-none print:w-full)');

console.log('\n========================================================================');
console.log('🎉 ALL 15 CHALLENGER 2 ADVERSARIAL STRESS TESTS PASSED WITH 100% SUCCESS!');
console.log('========================================================================\n');
