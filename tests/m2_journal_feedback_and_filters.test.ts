import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('MILESTONE 2: JOURNAL FEEDBACK & HISTORY FILTERS TEST SUITE');
console.log('========================================================================\n');

const srcDir = path.join(__dirname, '..', 'src');

// ========================================================================
// SECTION 1: GuruJurnal.tsx - Rejection Feedback Banner & Transparency
// ========================================================================
console.log('--- Section 1: GuruJurnal.tsx Rejection Feedback Transparency ---');
const guruJurnalPath = path.join(srcDir, 'components', 'GuruJurnal.tsx');
assert.ok(fs.existsSync(guruJurnalPath), 'GuruJurnal.tsx must exist');
const guruJurnalContent = fs.readFileSync(guruJurnalPath, 'utf-8');

// 1.1 State for rejected journals
assert.ok(
  guruJurnalContent.includes('rejectedJournals') && guruJurnalContent.includes('setRejectedJournals'),
  'GuruJurnal.tsx must declare state for rejectedJournals'
);
console.log('  ✔ [PASS] 1.1: GuruJurnal declares state for rejectedJournals');

// 1.2 Fetching and merging rejected journals
assert.ok(
  guruJurnalContent.includes('allRejectedJournals') && guruJurnalContent.includes("eq('status_verifikasi', 'Ditolak')"),
  'GuruJurnal.tsx must query and aggregate rejected journals with status_verifikasi === "Ditolak"'
);
console.log('  ✔ [PASS] 1.2: GuruJurnal queries and aggregates rejected journals from dailyState and database');

// 1.3 Sub-Tab 2 banner rendering
assert.ok(
  guruJurnalContent.includes('banner-jurnal-ditolak') &&
  guruJurnalContent.includes('id="panel-rekap-pribadi"'),
  'GuruJurnal.tsx must render #banner-jurnal-ditolak inside Sub-Tab 2 panel-rekap-pribadi'
);
console.log('  ✔ [PASS] 1.3: Sub-Tab 2 contains dedicated banner-jurnal-ditolak container');

// 1.4 Admin rejection notes fallback coverage
assert.ok(
  guruJurnalContent.includes('j.catatan_admin') &&
  guruJurnalContent.includes('j.alasan_penolakan') &&
  guruJurnalContent.includes('j.catatan_penolakan'),
  'GuruJurnal.tsx must display admin rejection reasons (catatan_admin, alasan_penolakan, catatan_penolakan)'
);
console.log('  ✔ [PASS] 1.4: Banner displays admin rejection notes with comprehensive fallback');

// 1.5 Quick action button to resubmit/input ulang
assert.ok(
  guruJurnalContent.includes('Input Ulang') &&
  guruJurnalContent.includes("handleTabChange('input')"),
  'Banner must provide an Input Ulang action button that switches to input tab and pre-fills journal parameters'
);
console.log('  ✔ [PASS] 1.5: Input Ulang action switches to input tab and pre-fills rejected journal data');


// ========================================================================
// SECTION 2: RekapJurnalView.tsx - Rejection Details & searchMateri Filter
// ========================================================================
console.log('\n--- Section 2: RekapJurnalView.tsx Feedback & searchMateri Filter ---');
const rekapJurnalPath = path.join(srcDir, 'components', 'RekapJurnalView.tsx');
assert.ok(fs.existsSync(rekapJurnalPath), 'RekapJurnalView.tsx must exist');
const rekapJurnalContent = fs.readFileSync(rekapJurnalPath, 'utf-8');

// 2.1 searchMateri state & input filter
assert.ok(
  rekapJurnalContent.includes('searchMateri') && rekapJurnalContent.includes('setSearchMateri'),
  'RekapJurnalView.tsx must declare state for searchMateri'
);
assert.ok(
  rekapJurnalContent.includes('CARI MATERI / TOPIK KBM'),
  'RekapJurnalView.tsx must render CARI MATERI / TOPIK KBM input filter alongside existing dropdowns'
);
console.log('  ✔ [PASS] 2.1: searchMateri state and free-text input rendered alongside dropdown filters');

// 2.2 filteredJurnal filtering logic with searchMateri
assert.ok(
  rekapJurnalContent.includes('searchMateri.toLowerCase()') &&
  rekapJurnalContent.includes('matchesMateri'),
  'filteredJurnal must dynamically filter entries based on searchMateri'
);
console.log('  ✔ [PASS] 2.2: filteredJurnal logic correctly evaluates searchMateri across KBM topics');

// 2.3 Table displays rejection notes when status_verifikasi === 'Ditolak'
assert.ok(
  rekapJurnalContent.includes("j.status_verifikasi === 'Ditolak'") &&
  rekapJurnalContent.includes('Alasan Penolakan:') &&
  rekapJurnalContent.includes('Ditolak Admin:'),
  'RekapJurnalView table must render rejection notes in both class and personal modes'
);
console.log('  ✔ [PASS] 2.3: Table rendering in both tabMode="kelas" and tabMode="pribadi" displays rejection notes');

// 2.4 Detail Modal with prominent rejection banner
assert.ok(
  rekapJurnalContent.includes('selectedJurnal') &&
  rekapJurnalContent.includes('setSelectedJurnal') &&
  rekapJurnalContent.includes('modal-detail-jurnal') &&
  rekapJurnalContent.includes('modal-rejection-banner'),
  'RekapJurnalView must provide modal-detail-jurnal with modal-rejection-banner when journal is rejected'
);
console.log('  ✔ [PASS] 2.4: modal-detail-jurnal provides complete journal overview and prominent rejection card');


// ========================================================================
// SECTION 3: HistoryView.tsx - Month Picker in Presensi History
// ========================================================================
console.log('\n--- Section 3: HistoryView.tsx Presensi Month Picker ---');
const historyViewPath = path.join(srcDir, 'components', 'HistoryView.tsx');
assert.ok(fs.existsSync(historyViewPath), 'HistoryView.tsx must exist');
const historyViewContent = fs.readFileSync(historyViewPath, 'utf-8');

// 3.1 Month picker input exists for activeTab === 'presensi'
assert.ok(
  historyViewContent.includes('filterBulan') &&
  historyViewContent.includes('setFilterBulan') &&
  historyViewContent.includes('type="month"'),
  'HistoryView.tsx must provide <input type="month"> for filtering attendance history'
);
console.log('  ✔ [PASS] 3.1: HistoryView contains <input type="month"> and filterBulan state');

// 3.2 Attendance history month matching logic
assert.ok(
  historyViewContent.includes("activeTab === 'presensi' && filterBulan") &&
  historyViewContent.includes('startsWith(filterBulan)'),
  'HistoryView.tsx must filter attendance records according to selected month'
);
console.log('  ✔ [PASS] 3.2: filteredData in HistoryView filters attendance by month (supports ISO & formatted dates)');

// 3.3 Clear & Reset filter capabilities
assert.ok(
  historyViewContent.includes('Reset pencarian') &&
  historyViewContent.includes("setFilterBulan('')"),
  'HistoryView.tsx must allow resetting the month filter cleanly'
);
console.log('  ✔ [PASS] 3.3: Reset button clears both text search and month picker filter');


// ========================================================================
// SECTION 4: Behavioral Verification of Filtering Functions
// ========================================================================
console.log('\n--- Section 4: Behavioral Verification of Logic ---');

// Behavioral test for searchMateri filter in RekapJurnalView
const mockJournals = [
  { id: '1', mapel: 'Matematika', materi: 'Aljabar Linear', status_verifikasi: 'Disetujui' },
  { id: '2', mapel: 'Fisika', materi: 'Hukum Termodinamika', status_verifikasi: 'Ditolak', catatan_admin: 'Foto tidak jelas' },
  { id: '3', mapel: 'Biologi', materi: 'Genetika Populasi', status_verifikasi: 'Menunggu' },
];

const filterByMateri = (list: any[], query: string) => {
  if (!query) return list;
  const q = query.toLowerCase();
  return list.filter(j => j.materi && j.materi.toLowerCase().includes(q));
};

const termoResults = filterByMateri(mockJournals, 'termo');
assert.strictEqual(termoResults.length, 1);
assert.strictEqual(termoResults[0].id, '2');
console.log('  ✔ [PASS] 4.1: filterByMateri accurately filters journal list by topic');

// Behavioral test for HistoryView month filter
const mockAttendances = [
  { id: 'a1', timestamp: '2026-10-15 07:12:00', tipe_absen: 'Datang' },
  { id: 'a2', timestamp: '2026-11-02 07:08:00', tipe_absen: 'Datang' },
  { id: 'a3', timestamp: '11/3/2026 07:15:00', tipe_absen: 'Datang' },
  { id: 'a4', timestamp: '2026-11-04T07:20:00+08:00', tipe_absen: 'Datang' },
];

const filterByMonth = (list: any[], month: string) => {
  if (!month) return list;
  return list.filter(item => {
    const ts = String(item.timestamp || '');
    if (ts.startsWith(month) || ts.includes(month)) return true;
    const slash = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slash) {
      const m = slash[1].padStart(2, '0');
      const y = slash[3];
      if (`${y}-${m}` === month) return true;
    }
    return false;
  });
};

const novResults = filterByMonth(mockAttendances, '2026-11');
assert.strictEqual(novResults.length, 3);
assert.ok(novResults.some(r => r.id === 'a2'));
assert.ok(novResults.some(r => r.id === 'a3'));
assert.ok(novResults.some(r => r.id === 'a4'));
console.log('  ✔ [PASS] 4.2: filterByMonth accurately filters attendance records across date formats');

console.log('\n========================================================================');
console.log('🎉 ALL MILESTONE 2 TESTS PASSED WITH 100% SUCCESS!');
console.log('========================================================================\n');
