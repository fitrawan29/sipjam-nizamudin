import fs from 'fs';
import path from 'path';
import { isJurnalMatchJadwal } from '../src/lib/workflow';

const srcDir = path.join(__dirname, '..', 'src');

console.log('--- Testing R4 & R5 Implementation ---');

// Test 1: Unit test isJurnalMatchJadwal logic
console.log('Test 1: isJurnalMatchJadwal logic');
const testCases = [
  {
    jurnal: { kelas: 'X Merdeka', mapel: 'X Merdeka_Matematika' },
    jadwal: { kelas: 'X Merdeka', mata_pelajaran: 'Matematika' },
    expected: true,
  },
  {
    jurnal: { kelas: 'XI Merdeka', mapel: 'XI Merdeka_MTK' },
    jadwal: { kelas: 'XI Merdeka', mata_pelajaran: 'MTK' },
    expected: true,
  },
  {
    jurnal: { kelas: 'XII Merdeka', mapel: 'XII Merdeka_Bahasa Inggris' },
    jadwal: { kelas: 'X Merdeka', mata_pelajaran: 'Bahasa Inggris' },
    expected: false, // different class
  },
  {
    jurnal: { kelas: 'X Merdeka', mapel: 'Kimia' },
    jadwal: { kelas: 'X Merdeka', mata_pelajaran: 'Kimia' },
    expected: true,
  },
];

for (const tc of testCases) {
  const result = isJurnalMatchJadwal(tc.jurnal, tc.jadwal);
  if (result !== tc.expected) {
    console.error(`FAIL: isJurnalMatchJadwal expected ${tc.expected} but got ${result} for:`, tc);
    process.exit(1);
  }
}
console.log('PASS: isJurnalMatchJadwal works accurately!');

// Test 2: Verify export in workflow.ts
console.log('Test 2: Verify exports in workflow.ts');
const workflowPath = path.join(srcDir, 'lib', 'workflow.ts');
const workflowContent = fs.readFileSync(workflowPath, 'utf-8');

if (!workflowContent.includes('export async function findJadwalForGuru')) {
  console.error('FAIL: findJadwalForGuru is not exported in workflow.ts');
  process.exit(1);
}
if (!workflowContent.includes('export function isJurnalMatchJadwal')) {
  console.error('FAIL: isJurnalMatchJadwal is not exported in workflow.ts');
  process.exit(1);
}
// Verify state.jadwalKBM is populated without isDinasLuar suppression
if (workflowContent.includes('if (!state.isDinasLuar) {\n      state.jadwalKBM')) {
  console.error('FAIL: state.jadwalKBM is still suppressed when isDinasLuar is true');
  process.exit(1);
}
console.log('PASS: workflow.ts correctly exports functions and populates jadwalKBM unconditionally!');

// Test 3: Verify HomeView.tsx widget implementation
console.log('Test 3: Verify HomeView.tsx widget');
const homeViewPath = path.join(srcDir, 'components', 'HomeView.tsx');
const homeViewContent = fs.readFileSync(homeViewPath, 'utf-8');

const requiredHomeElements = [
  'Jadwal Mengajar Hari Ini',
  'dailyState.jadwalKBM',
  'isJurnalMatchJadwal',
  'view-guru-jurnal',
  'Tidak Ada Jadwal Mengajar Hari Ini',
  'Hari Ini Libur',
  'Memuat jadwal pelajaran...',
];

for (const elem of requiredHomeElements) {
  if (!homeViewContent.includes(elem)) {
    console.error(`FAIL: HomeView.tsx missing required element: "${elem}"`);
    process.exit(1);
  }
}
console.log('PASS: HomeView.tsx successfully implements Daily Teaching Schedule widget with all states!');

// Test 4: Verify page.tsx try-catch protection
console.log('Test 4: Verify page.tsx try-catch');
const pagePath = path.join(srcDir, 'app', 'page.tsx');
const pageContent = fs.readFileSync(pagePath, 'utf-8');

if (!pageContent.includes('try {') || !pageContent.includes('localStorage.removeItem(\'sipjam_user\')')) {
  console.error('FAIL: page.tsx does not properly guard JSON.parse with try-catch and cleanup');
  process.exit(1);
}
console.log('PASS: page.tsx protects against malformed localStorage JSON safely!');

// Test 5: Verify GuruPresensi.tsx WITA normalization
console.log('Test 5: Verify GuruPresensi.tsx WITA timezone');
const guruPresensiPath = path.join(srcDir, 'components', 'GuruPresensi.tsx');
const guruPresensiContent = fs.readFileSync(guruPresensiPath, 'utf-8');

if (!guruPresensiContent.includes('Asia/Makassar')) {
  console.error('FAIL: GuruPresensi.tsx does not use Asia/Makassar timezone');
  process.exit(1);
}
if (guruPresensiContent.includes('const currH = now.getHours();')) {
  console.error('FAIL: GuruPresensi.tsx still uses local getHours()');
  process.exit(1);
}
console.log('PASS: GuruPresensi.tsx successfully normalizes time calculation to WITA!');

// Test 6: Verify HistoryView.tsx pagination flicker fix
console.log('Test 6: Verify HistoryView.tsx pagination flicker fix');
const historyPath = path.join(srcDir, 'components', 'HistoryView.tsx');
const historyContent = fs.readFileSync(historyPath, 'utf-8');

if (historyContent.includes('[activeTab, page]')) {
  console.error('FAIL: HistoryView.tsx still has page in useEffect dependency array');
  process.exit(1);
}
console.log('PASS: HistoryView.tsx pagination flicker fix verified!');

console.log('\n--- ALL R4 & R5 AUTOMATED TESTS PASSED SUCCESSFULLY! ---');
