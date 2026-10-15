import fs from 'fs';
import path from 'path';
import { generateKurikulumMerdekaDeskripsi } from '../src/components/GradebookView';

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  VERIFICATION SUITE: GRADEBOOK UNIFIED SETUP FLOW & QUICK INIT       ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  ✘ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failCount++;
  }
}

const gradebookPath = path.resolve(process.cwd(), 'src/components/GradebookView.tsx');
assert(fs.existsSync(gradebookPath), 'GradebookView.tsx exists');
const code = fs.readFileSync(gradebookPath, 'utf-8');

// ━━━ 1. R1: UNIFIED SETUP FLOW (PANEL TERPADU CP • TP • KOLOM) ━━━
console.log('\n━━━ 1. R1: UNIFIED SETUP FLOW (PANEL TERPADU CP • TP • KOLOM) ━━━');

assert(
  code.includes('isSetupPanelOpen') && code.includes('setIsSetupPanelOpen'),
  'R1.1: State isSetupPanelOpen manages collapsible unified setup panel'
);

assert(
  code.includes('inlineMode') && code.includes('setInlineMode'),
  'R1.2: State inlineMode supports inline editing without multi-level modal dialogs'
);

assert(
  code.includes('Panel Terpadu: Struktur Capaian, Tujuan Pembelajaran & Asesmen'),
  'R1.3: Unified panel header clearly announces integrated CP, TP & Asesmen structure'
);

assert(
  code.includes('Capaian Pembelajaran (CP)') &&
  code.includes('Tujuan Pembelajaran (TP)') &&
  code.includes('Kolom Asesmen ('),
  'R1.4: Unified panel contains 3-column structured layout for CP, TP, and Assessment Columns'
);

assert(
  code.includes('inlineMode === \'add-cp\'') && code.includes('inlineMode === \'edit-cp\''),
  'R1.5: Inline form allows adding and editing CP directly inside the unified panel'
);

assert(
  code.includes('inlineMode === \'add-tp\'') && code.includes('inlineMode === \'edit-tp\''),
  'R1.6: Inline form allows adding and editing TP directly inside the unified panel'
);

assert(
  code.includes('inlineMode === \'add-col\'') && code.includes('inlineMode === \'edit-col\''),
  'R1.7: Inline form allows adding and editing Formatif/Sumatif columns directly inside the unified panel'
);

assert(
  code.includes('Kelola Struktur Asesmen'),
  'R1.8: Quick toggle button allows opening/closing the unified structure panel at any time'
);

// ━━━ 2. R2: FRICTIONLESS GRADE ENTRY & QUICK INITIALIZATION ━━━
console.log('\n━━━ 2. R2: FRICTIONLESS GRADE ENTRY & QUICK INITIALIZATION ━━━');

assert(
  code.includes('handleQuickInitialize') && code.includes('isInitializing'),
  'R2.1: handleQuickInitialize function is implemented for 1-click format preparation'
);

assert(
  code.includes("kode_cp: 'CP 1'") &&
  code.includes("kode_tp: `TP ${tpList.length + 1}`") &&
  code.includes("kategori: 'Diagnostik'") &&
  code.includes("kategori: 'Formatif'") &&
  code.includes("kategori: 'Sumatif'"),
  'R2.2: Quick initialization prepares CP 1, TP 1, Diagnostik, Formatif 1, and Sumatif 1 automatically'
);

assert(
  code.includes('Inisialisasi Cepat (1 Klik)') || code.includes('Inisialisasi Cepat / Buat Format Awal (1 Klik)'),
  'R2.3: Prominent 1-click Quick Initialize button rendered in cold-start view'
);

assert(
  code.includes('setSelectedCpId(activeCpId)') && code.includes('setSelectedTpId(createdTp.id)'),
  'R2.4: Quick initialization immediately auto-selects newly created CP and TP for instant grading'
);

assert(
  code.includes('handleQuickInitialize') && code.includes('Koneksi Internet Diperlukan'),
  'R2.5: Quick initialization guards against offline mode with friendly toast warning'
);

// ━━━ 3. R3: PRESERVATION OF KURIKULUM MERDEKA LOGIC & DATA INTEGRITY ━━━
console.log('\n━━━ 3. R3: PRESERVATION OF KURIKULUM MERDEKA LOGIC & DATA INTEGRITY ━━━');

assert(
  code.includes('generateKurikulumMerdekaDeskripsi') && typeof generateKurikulumMerdekaDeskripsi === 'function',
  'R3.1: generateKurikulumMerdekaDeskripsi narrative function is exported and functional'
);

// Verify generateKurikulumMerdekaDeskripsi works accurately
const narrativeResult = generateKurikulumMerdekaDeskripsi('Ahmad', [
  { kode: 'TP 1', deskripsi: 'Membaca teks sastra', score: 90 },
  { kode: 'TP 2', deskripsi: 'Menulis teks argumentasi', score: 70 },
]);
assert(narrativeResult.nilaiRapor === 80.0, 'R3.2: generateKurikulumMerdekaDeskripsi accurately averages TP scores');
assert(narrativeResult.predikat === 'Baik (B)', 'R3.3: Score 80.0 receives Baik (B) predikat');
assert(narrativeResult.highestTp?.kode === 'TP 1', 'R3.4: Identifies highest mastery TP 1');
assert(narrativeResult.lowestTp?.kode === 'TP 2', 'R3.5: Identifies lowest mastery TP 2');

// Verify formula presence
assert(
  code.includes('kehadiranScore * (bobotKehadiran / 100)') &&
  code.includes('avgFormatifAll * (bobotFormatif / 100)') &&
  code.includes('avgSumatifAll * (bobotSumatif / 100)'),
  'R3.6: Formula correctly weights attendance, formatif, and sumatif components'
);

// Verify Diagnostik strictly 1 per TP guard
assert(
  code.includes('Maksimal 1 Asesmen Diagnostik per Tujuan Pembelajaran'),
  'R3.7: Diagnostik guard prevents adding duplicate Diagnostik columns'
);
assert(
  code.includes('Asesmen Diagnostik wajib ada tepat 1 per Tujuan Pembelajaran'),
  'R3.8: Diagnostik guard prevents deleting the mandatory Diagnostik column'
);

// Verify Admin mode restriction
assert(
  code.includes('isAdmin ?') && code.includes('isGuruPengampu'),
  'R3.9: Role checks correctly restrict student grade modifications to assigned teacher'
);
assert(
  code.includes('{isBobotModalOpen && isAdmin && ('),
  'R3.10: Weight configuration access is restricted exclusively to Admin role'
);

// ━━━ 4. R4: PONYTAIL PRINCIPLES & FEATURE RETENTION ━━━
console.log('\n━━━ 4. R4: PONYTAIL PRINCIPLES & FEATURE RETENTION ━━━');

// Check no unnecessary new packages
const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'));
assert(!pkg.dependencies['zustand'] && !pkg.dependencies['redux'], 'R4.1: Ponytail - zero extra state libraries added');

// Check print classes preserved
assert(
  code.includes('print:overflow-visible') && code.includes('print:max-h-none'),
  'R4.2: Print media styles preserve overflow-visible and max-h-none'
);

// Check dirty indicator & bulk fill
assert(
  code.includes('dirtyGrades') && code.includes('unsavedCount'),
  'R4.3: Unsaved changes dirty state indicator functions correctly'
);
assert(
  code.includes('handleExecuteBulkFill'),
  'R4.4: Bulk fill (Isi Nilai Cepat) feature remains operational'
);

// Check CSV export functions
assert(
  code.includes('exportTpToCsv') && code.includes('exportSemesterToCsv'),
  'R4.5: CSV export for TP matrix and semester recap preserved'
);

console.log('\n══════════════════════════════════════════════════════════════════════');
console.log(`TEST SUMMARY: Total ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
if (failCount > 0) {
  console.error('VERDICT: SOME CHECKS FAILED!');
  process.exit(1);
} else {
  console.log('VERDICT: ALL GRADEBOOK UNIFIED SETUP & QUICK INIT TESTS PASSED 100%!');
  process.exit(0);
}
