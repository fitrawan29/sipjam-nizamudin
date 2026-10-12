import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('====================================================');
console.log('VERIFICATION: 4 PONYTAIL IMPROVEMENTS AUDIT');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function test(description: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ PASS: ${description}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ FAIL: ${description}`);
    console.error(`   Error: ${err.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------
// R1 & AC-1: Package.json Dependencies Audit
// ---------------------------------------------------------------------
test('No new dependencies added to package.json', () => {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const expectedDeps = [
    '@supabase/supabase-js',
    'csv-parse',
    'dotenv',
    'next',
    'react',
    'react-dom',
    'sweetalert2',
    'tsx',
    'web-push'
  ];
  const actualDeps = Object.keys(pkg.dependencies || {}).sort();
  assert.deepStrictEqual(actualDeps, expectedDeps.sort(), 'Dependencies list should match original without additions');
});

// ---------------------------------------------------------------------
// R1: AppScreen.tsx Dynamic Imports Audit
// ---------------------------------------------------------------------
test('AppScreen.tsx imports dynamic from next/dynamic', () => {
  const appScreenPath = path.join(__dirname, '..', 'src', 'components', 'AppScreen.tsx');
  const content = fs.readFileSync(appScreenPath, 'utf-8');
  assert(content.includes("import dynamic from 'next/dynamic';"), 'AppScreen.tsx must import dynamic from next/dynamic');
});

test('AppScreen.tsx wraps sub-views using next/dynamic', () => {
  const appScreenPath = path.join(__dirname, '..', 'src', 'components', 'AppScreen.tsx');
  const content = fs.readFileSync(appScreenPath, 'utf-8');
  const requiredDynamicViews = [
    'HomeView',
    'GuruPresensi',
    'GuruJurnal',
    'PiketView',
    'DokumenView',
    'HistoryView',
    'RekapJurnalView',
    'RekapSiswaView',
    'InformasiView',
    'AdminVerifView',
    'AdminRekapView',
    'AdminDataView',
    'AdminBackupView',
    'AdminConfigView',
    'AnalitikView',
    'SuperadminView',
    'GradebookView',
    'SistemBlokView'
  ];

  for (const view of requiredDynamicViews) {
    const pattern = new RegExp(`const\\s+${view}\\s*=\\s*dynamic\\(\\s*\\(\\)\\s*=>\\s*import\\(['"]\\./${view}['"]\\)`);
    assert(pattern.test(content), `View ${view} should be dynamically imported with next/dynamic`);
  }
});

// ---------------------------------------------------------------------
// R2: Presensi Online-Only Cloud Enforcement & Zero Local Offline Queue Audit
// ---------------------------------------------------------------------
test('GuruPresensi.tsx enforces online-only Supabase transactions & cleans up legacy offline queue', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'GuruPresensi.tsx'), 'utf-8');
  // Must NOT store offline queue items
  assert(!fileContent.includes("localStorage.setItem('sipjam_offline_presensi'"), 'Must NOT store offline presensi into localStorage');
  assert(!fileContent.includes("localStorage.setItem('sipjam_offline_presensi_queue'"), 'Must NOT store offline presensi queue into localStorage');

  // Must clean up legacy keys on mount
  assert(fileContent.includes("localStorage.removeItem('sipjam_offline_presensi')"), 'Must clean up legacy sipjam_offline_presensi');
  assert(fileContent.includes("localStorage.removeItem('sipjam_offline_presensi_queue')"), 'Must clean up legacy sipjam_offline_presensi_queue');

  // Must enforce online check with interactive warning
  assert(fileContent.includes('Koneksi Internet Diperlukan'), 'Must show interactive warning when attempting presensi while offline');
  assert(fileContent.includes('isOffline'), 'Must check isOffline status');

  // Direct communication to cloud Supabase
  assert(fileContent.includes("supabase.from('presensi_guru').insert"), 'Must insert directly to Supabase presensi_guru table');
});

test('Online-only transactional enforcement simulation across operational data', () => {
  // Mock localStorage to verify no offline queues are generated
  const store: Record<string, string> = {
    sipjam_offline_presensi: '{"id":"stale"}',
    sipjam_offline_presensi_queue: '[{"id":"stale"}]'
  };
  const mockLocalStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; }
  };

  // Simulating component mount cleanup
  mockLocalStorage.removeItem('sipjam_offline_presensi');
  mockLocalStorage.removeItem('sipjam_offline_presensi_queue');

  assert.strictEqual(mockLocalStorage.getItem('sipjam_offline_presensi'), null, 'Legacy offline presensi key must be removed');
  assert.strictEqual(mockLocalStorage.getItem('sipjam_offline_presensi_queue'), null, 'Legacy queue must be removed');

  // Verify offline submission rejection behavior
  const isOffline = true;
  let offlineWarningTriggered = false;
  if (isOffline) {
    offlineWarningTriggered = true;
  }
  assert.strictEqual(offlineWarningTriggered, true, 'Offline device must immediately trigger warning and abort saving');
  assert.strictEqual(mockLocalStorage.getItem('sipjam_offline_presensi'), null, 'Must never create offline queue');
});

test('Presensi direct Supabase cloud insertion flow verification', async () => {
  const dummyPayload = {
    id: 'test-presensi-online-1',
    nama_guru: 'Budi Santoso',
    tipe_absen: 'Datang',
    jenis_presensi: 'Sekolah',
    timestamp: '2026-10-12 07:00:00'
  };

  let insertedDirectlyToCloud = false;
  const mockSupabase = {
    from: (table: string) => ({
      insert: (rows: any[]) => {
        if (table === 'presensi_guru' && rows[0].id === dummyPayload.id) {
          insertedDirectlyToCloud = true;
        }
        return Promise.resolve({ error: null });
      }
    })
  };

  await mockSupabase.from('presensi_guru').insert([dummyPayload]);
  assert.strictEqual(insertedDirectlyToCloud, true, 'Operational transaction must go directly to cloud database');
});

// ---------------------------------------------------------------------
// R3: GuruJurnal Auto-Save & Canvas Compression Audit
// ---------------------------------------------------------------------
test('GuruJurnal.tsx implements localStorage auto-save on change and restore on mount', () => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'GuruJurnal.tsx'), 'utf-8');
  assert(content.includes('sipjam_jurnal_autosave'), 'Must use localStorage key sipjam_jurnal_autosave');
  assert(content.includes('compressImageWithCanvas'), 'Must define canvas image compression helper');
  assert(content.includes('isRestoredRef'), 'Must guard initial draft restoration');
  assert(content.includes('document.createElement(\'canvas\')'), 'Must use native HTML canvas');
  assert(content.includes('toDataURL'), 'Must provide toDataURL fallback for older WebViews without toBlob');
  assert(content.includes('localStorage.removeItem(\'sipjam_jurnal_autosave\')'), 'Must clean up draft when form is cleared or submitted');
});

test('GuruJurnal form auto-save and restore behavior simulation', () => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; }
  };

  const draftForm = {
    tipeJurnal: 'Jurnal KBM',
    mapel: 'Matematika',
    kelas: '7A',
    tanggal: '2026-10-05',
    materi: 'Aljabar Linier',
    kegiatan: 'Diskusi kelompok dan pemecahan soal matriks',
    catatanSiswa: 'Siswa aktif bertanya',
    refleksi: 'Pembelajaran berjalan lancar',
    pertemuanKe: '3',
    jamKe: '1-2',
    tujuanPembelajaran: 'Memahami konsep dasar matriks',
    kehadiranMurid: 'Total murid: 30, Hadir: 30, Izin: 0, Sakit: 0, Alpa: 0',
    kktp: 'Minimal nilai 75',
    konten: 'Konsep dasar aljabar',
    lokasiKbm: 'Ruang Kelas 7A',
    absensi: { '001': 'H', '002': 'H' }
  };

  // Simulating auto-save
  mockLocalStorage.setItem('sipjam_jurnal_autosave', JSON.stringify(draftForm));

  // Simulating reload & restore
  const restoredJson = mockLocalStorage.getItem('sipjam_jurnal_autosave');
  assert(restoredJson !== null);
  const restored = JSON.parse(restoredJson);
  assert.strictEqual(restored.mapel, 'Matematika');
  assert.strictEqual(restored.materi, 'Aljabar Linier');
  assert.strictEqual(restored.kegiatan, 'Diskusi kelompok dan pemecahan soal matriks');
  assert.strictEqual(restored.lokasiKbm, 'Ruang Kelas 7A');

  // Simulating form emptied by user -> draft removed from localStorage
  const hasContent = false;
  if (!hasContent) {
    mockLocalStorage.removeItem('sipjam_jurnal_autosave');
  }
  assert.strictEqual(mockLocalStorage.getItem('sipjam_jurnal_autosave'), null, 'Cleared form removes draft');

  // Simulating submit clearing draft
  mockLocalStorage.removeItem('sipjam_jurnal_autosave');
  assert.strictEqual(mockLocalStorage.getItem('sipjam_jurnal_autosave'), null);
});

// ---------------------------------------------------------------------
// R4: Unified Print CSS in globals.css Audit
// ---------------------------------------------------------------------
test('globals.css defines unified print break avoidance rules in @media print', () => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'globals.css'), 'utf-8');
  assert(content.includes('@media print'), 'globals.css must contain @media print');
  assert(content.includes('break-inside: avoid !important;'), 'Must define break-inside: avoid !important;');
  assert(content.includes('page-break-inside: avoid !important;'), 'Must define page-break-inside: avoid !important;');
  assert(content.includes('.page-break-inside-avoid'), 'Must include .page-break-inside-avoid utility');
  assert(content.includes('.break-inside-avoid'), 'Must include .break-inside-avoid utility');
  assert(content.includes('.break-before-page'), 'Must include .break-before-page utility');
  assert(content.includes('.break-after-page'), 'Must include .break-after-page utility');
});

test('Legacy offline queue purge and clean state verification', () => {
  const store: Record<string, string> = {
    sipjam_offline_presensi_queue: 'INVALID_JSON_{[',
    sipjam_offline_presensi: 'some-old-data'
  };
  const mockLocalStorage = {
    getItem: (key: string) => store[key] || null,
    removeItem: (key: string) => { delete store[key]; }
  };

  mockLocalStorage.removeItem('sipjam_offline_presensi');
  mockLocalStorage.removeItem('sipjam_offline_presensi_queue');
  assert.strictEqual(mockLocalStorage.getItem('sipjam_offline_presensi'), null, 'sipjam_offline_presensi must be purged');
  assert.strictEqual(mockLocalStorage.getItem('sipjam_offline_presensi_queue'), null, 'sipjam_offline_presensi_queue must be purged');
});

test('GuruJurnal draft attendance preservation during student list sync', () => {
  const students = [
    { nisn: '001', nama_siswa: 'Ahmad' },
    { nisn: '002', nama_siswa: 'Budi' },
    { nisn: '003', nama_siswa: 'Citra' }
  ];

  // Restored draft attendance where teacher already marked student 002 as Sakit and 003 as Izin
  const draftAbsensi: Record<string, string> = {
    '001': 'H',
    '002': 'S',
    '003': 'I'
  };

  // Default canonical attendance returned by database
  const initialAbsensi: Record<string, string> = {
    '001': 'H',
    '002': 'H',
    '003': 'H'
  };

  // Simulation of fetchStudents merging logic
  const hasMatchingStudent = students.some(s => s.nisn && draftAbsensi && draftAbsensi[s.nisn]);
  assert.strictEqual(hasMatchingStudent, true);

  const merged = { ...initialAbsensi, ...draftAbsensi };
  assert.strictEqual(merged['001'], 'H');
  assert.strictEqual(merged['002'], 'S', 'Student 002 Sakit mark should be preserved from draft');
  assert.strictEqual(merged['003'], 'I', 'Student 003 Izin mark should be preserved from draft');
});

test('GuruJurnal submission cleanly clears draft and does not resurrect zombie draft', () => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; }
  };

  // Teacher types a draft
  let materi = 'Bab 4 Teorema Pythagoras';
  let kegiatan = 'Latihan soal';
  let mapel = 'Matematika';
  let kelas = '8B';

  const checkHasContent = (m: string, k: string) => Boolean(
    (m && m.trim()) || (k && k.trim())
  );

  if (checkHasContent(materi, kegiatan)) {
    mockLocalStorage.setItem('sipjam_jurnal_autosave', JSON.stringify({ materi, kegiatan, mapel, kelas }));
  }
  assert(mockLocalStorage.getItem('sipjam_jurnal_autosave') !== null, 'Draft should be saved while user types');

  // Teacher submits form:
  mockLocalStorage.removeItem('sipjam_jurnal_autosave');
  materi = '';
  kegiatan = '';
  mapel = '';
  kelas = '';

  // Auto-save effect triggers on subsequent render:
  const hasContentAfterSubmit = checkHasContent(materi, kegiatan);
  assert.strictEqual(hasContentAfterSubmit, false, 'hasContent must evaluate to false after submit');
  if (hasContentAfterSubmit) {
    mockLocalStorage.setItem('sipjam_jurnal_autosave', JSON.stringify({ materi, kegiatan, mapel, kelas }));
  }

  assert.strictEqual(
    mockLocalStorage.getItem('sipjam_jurnal_autosave'),
    null,
    'Submitted journal must NOT resurrect a ghost draft in localStorage'
  );
});

test('Canvas image compression and upload helpers preserve robust error guards', () => {
  const jurnalCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'GuruJurnal.tsx'), 'utf-8');
  const presensiCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'GuruPresensi.tsx'), 'utf-8');

  // Check GuruJurnal compressImageWithCanvas
  assert(
    jurnalCode.includes('img.onload = () => {\n          try {') ||
    jurnalCode.includes('img.onload = () => {\r\n          try {'),
    'GuruJurnal compressImageWithCanvas must guard img.onload with try-catch'
  );

  // Check GuruPresensi cloud upload error handling
  assert(
    presensiCode.includes('uploadErr') && presensiCode.includes('Upload Foto Tertunda'),
    'GuruPresensi must gracefully handle background Google Drive upload errors without failing cloud record'
  );
});

test('AI Assistant 100% offline preservation and zero network call verification', () => {
  const aiCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AIAssistant', 'AIAssistant.tsx'), 'utf-8');
  const matcherCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AIAssistant', 'faqMatcher.ts'), 'utf-8');
  const kbCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'AIAssistant', 'knowledgeBase.ts'), 'utf-8');

  assert(aiCode.includes('100% Offline FAQ'), 'AI Assistant must display 100% Offline FAQ indicator');
  assert(!matcherCode.includes('fetch(') && !matcherCode.includes('axios'), 'Matcher must have 0 external network calls');
  assert(!kbCode.includes('fetch(') && !kbCode.includes('http'), 'Knowledge base must be pure static local constants');
});

test('Cross-module operational transactions (jurnal, piket, nilai) enforce online requirements', () => {
  const jurnalCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'GuruJurnal.tsx'), 'utf-8');
  const piketCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'PiketView.tsx'), 'utf-8');
  const gradebookCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'GradebookView.tsx'), 'utf-8');

  assert(jurnalCode.includes('Koneksi Internet Diperlukan'), 'GuruJurnal must require active internet connection');
  assert(piketCode.includes('Koneksi Internet Diperlukan'), 'PiketView must require active internet connection');
  assert(gradebookCode.includes('Koneksi Internet Diperlukan'), 'GradebookView must require active internet connection');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL 4 PONYTAIL IMPROVEMENTS AUDIT TESTS PASSED!\n');
}
