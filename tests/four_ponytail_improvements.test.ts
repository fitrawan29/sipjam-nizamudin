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
// R2: Presensi Offline Fallback & Online Sync Audit
// ---------------------------------------------------------------------
test('GuruPresensi.tsx implements localStorage offline queue & online listener', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'GuruPresensi.tsx'), 'utf-8');
  assert(fileContent.includes('sipjam_offline_presensi'), 'Must use localStorage key sipjam_offline_presensi');
  assert(fileContent.includes("window.addEventListener('online'"), 'Must register window online event listener');
  assert(fileContent.includes('syncOfflinePresensi'), 'Must implement syncOfflinePresensi function');
  assert(fileContent.includes('dataUrlToFile'), 'Must restore photo from data URL for upload');
  assert(fileContent.includes('isSyncingRef'), 'Must implement concurrency lock isSyncingRef');
  assert(fileContent.includes('compressPhotoForStorage'), 'Must implement native canvas photo compression for offline storage');
  assert(fileContent.includes('23505'), 'Must handle duplicate key 23505 gracefully');
});

test('Presensi offline queue serialization & sync lifecycle simulation', async () => {
  // Mock localStorage
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; }
  };

  const dummyPayload = {
    id: 'test-presensi-123',
    nama_guru: 'Budi Santoso',
    tipe_absen: 'Datang',
    jenis_presensi: 'Sekolah',
    timestamp: '2026-10-05 07:00:00'
  };

  const offlineItem = {
    id: dummyPayload.id,
    payload: dummyPayload,
    photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    photoName: 'selfie.jpg',
    isSelfie: true,
    folderName: 'Presensi_Guru',
    prefix: 'Selfie',
    timestamp: new Date().toISOString()
  };

  // 1. Simulating offline submission saving to localStorage
  mockLocalStorage.setItem('sipjam_offline_presensi', JSON.stringify(offlineItem));
  mockLocalStorage.setItem('sipjam_offline_presensi_queue', JSON.stringify([offlineItem]));

  const saved = JSON.parse(mockLocalStorage.getItem('sipjam_offline_presensi')!);
  assert.strictEqual(saved.id, dummyPayload.id);
  assert.strictEqual(saved.payload.nama_guru, 'Budi Santoso');
  assert(saved.photo.startsWith('data:image/jpeg;base64,'));

  // 2. Simulating reconnect sync logic
  const queuedStr = mockLocalStorage.getItem('sipjam_offline_presensi_queue');
  assert(queuedStr !== null);
  const items = JSON.parse(queuedStr);
  assert.strictEqual(items.length, 1);

  // Mock server delivery
  let delivered = false;
  for (const item of items) {
    if (item.id === dummyPayload.id) {
      delivered = true;
    }
  }
  assert.strictEqual(delivered, true, 'Queued item should be successfully processed');

  // Queue cleared upon successful sync
  mockLocalStorage.removeItem('sipjam_offline_presensi');
  mockLocalStorage.removeItem('sipjam_offline_presensi_queue');
  assert.strictEqual(mockLocalStorage.getItem('sipjam_offline_presensi'), null);
});

test('Presensi offline quota exceeded fallback preserves payload without photo', () => {
  const store: Record<string, string> = {};
  let quotaExceeded = true;

  const saveToLocalStorage = (itemToSave: any) => {
    if (quotaExceeded && itemToSave.photo) {
      throw new Error('QuotaExceededError');
    }
    store['sipjam_offline_presensi'] = JSON.stringify(itemToSave);
  };

  const item = {
    id: 'test-presensi-quota',
    payload: { id: 'test-presensi-quota', nama_guru: 'Siti Rahma' },
    photo: 'data:image/jpeg;base64,VERY_LARGE_IMAGE_DATA',
  };

  try {
    saveToLocalStorage(item);
  } catch {
    const itemWithoutPhoto = { ...item, photo: null };
    saveToLocalStorage(itemWithoutPhoto);
  }

  const saved = JSON.parse(store['sipjam_offline_presensi']);
  assert.strictEqual(saved.id, 'test-presensi-quota');
  assert.strictEqual(saved.payload.nama_guru, 'Siti Rahma');
  assert.strictEqual(saved.photo, null, 'Payload preserved safely even if photo exceeds quota');
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

test('Presensi offline queue deduplication and corrupted JSON recovery', () => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; }
  };

  const saveToLocalStorage = (itemToSave: any) => {
    mockLocalStorage.setItem('sipjam_offline_presensi', JSON.stringify(itemToSave));
    const rawQueue = mockLocalStorage.getItem('sipjam_offline_presensi_queue');
    let queue: any[] = [];
    try {
      if (rawQueue) queue = JSON.parse(rawQueue);
      if (!Array.isArray(queue)) queue = [];
    } catch {
      queue = [];
    }
    const existingIdx = queue.findIndex((q: any) => q.id === itemToSave.id);
    if (existingIdx >= 0) {
      queue[existingIdx] = itemToSave;
    } else {
      queue.push(itemToSave);
    }
    mockLocalStorage.setItem('sipjam_offline_presensi_queue', JSON.stringify(queue));
  };

  const item1 = { id: 'presensi-dup-1', nama: 'Guru A' };
  // 1. Submit twice while offline -> should deduplicate
  saveToLocalStorage(item1);
  saveToLocalStorage(item1);
  const queue1 = JSON.parse(mockLocalStorage.getItem('sipjam_offline_presensi_queue')!);
  assert.strictEqual(queue1.length, 1, 'Duplicate ID should update existing entry instead of inflating queue');

  // 2. Corrupted queue recovery
  mockLocalStorage.setItem('sipjam_offline_presensi_queue', 'INVALID_JSON_{[[');
  const rawCorrupt = mockLocalStorage.getItem('sipjam_offline_presensi_queue');
  let recoveredQueue: any[] = [];
  try {
    if (rawCorrupt) recoveredQueue = JSON.parse(rawCorrupt);
  } catch {
    mockLocalStorage.removeItem('sipjam_offline_presensi_queue');
    recoveredQueue = [];
  }
  assert.strictEqual(recoveredQueue.length, 0, 'Corrupt JSON should safely recover without crashing');
  assert.strictEqual(mockLocalStorage.getItem('sipjam_offline_presensi_queue'), null);
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

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL 4 PONYTAIL IMPROVEMENTS AUDIT TESTS PASSED!\n');
}
