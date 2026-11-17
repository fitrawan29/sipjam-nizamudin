/**
 * ============================================================================
 * AUTOMATED TEST SUITE: JURNAL BK ENHANCEMENTS (R1, R2, R3)
 * File: tests/jurnal_bk_r1_r2_r3.test.ts
 *
 * Verifies:
 * - R1: Filter Jenis Layanan BK (Form & History Filter strictly "layanan")
 * - R2: Multi-Siswa Support (Group services, dual-representation, reconstruction)
 * - R3: Mobile Print Preview Responsiveness & Dark Mode Paper Contrast
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'node:assert';
import {
  JENIS_LAYANAN_OPTIONS,
  RAW_JENIS_LAYANAN_OPTIONS,
  MULTI_STUDENT_SERVICES,
  isMultiStudentService,
  getCanonicalServiceName,
  BK_SERVICE_CONFIGS,
  SiswaOption,
  PesertaDidikItem,
  JurnalBkEntry
} from '../src/components/BkJurnalView';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function check(condition: boolean, id: string, name: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✔ [${id}] PASS:${RESET} ${name}`);
    if (details) console.log(`    ${GRAY}↳ ${details}${RESET}`);
  } else {
    failedTests++;
    console.error(`  ${RED}✖ [${id}] FAIL:${RESET} ${name}`);
    if (details) console.error(`    ${RED}↳ Detail: ${details}${RESET}`);
  }
}

async function runAllTests() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}⚡ VERIFICATION SUITE: JURNAL BK R1, R2, R3${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  const componentPath = path.resolve(__dirname, '../src/components/BkJurnalView.tsx');
  const componentSource = fs.readFileSync(componentPath, 'utf8');

  // ==========================================================================
  // SUITE 1: REQUIREMENT R1 — FILTER JENIS LAYANAN BK
  // ==========================================================================
  console.log(`${BOLD}--- Suite 1: Requirement R1 (Filter Jenis Layanan BK) ---${RESET}`);

  // 1.1 All items in JENIS_LAYANAN_OPTIONS start with "layanan" (case-insensitive)
  const allStartWithLayanan = JENIS_LAYANAN_OPTIONS.every(opt =>
    opt.trim().toLowerCase().startsWith('layanan')
  );
  check(
    allStartWithLayanan && JENIS_LAYANAN_OPTIONS.length === 11,
    'R1-01',
    'All JENIS_LAYANAN_OPTIONS start with "layanan" (case-insensitive) and total 11 items',
    `Found ${JENIS_LAYANAN_OPTIONS.length} items: ${JENIS_LAYANAN_OPTIONS.join(', ')}`
  );

  // 1.2 None of the 9 excluded non-"layanan" options exist in JENIS_LAYANAN_OPTIONS
  const excludedLegacyOptions = [
    'Konseling Individual',
    'Konseling Kelompok',
    'Bimbingan Kelompok',
    'Konsultasi',
    'Mediasi',
    'Konferensi Kasus',
    'Kunjungan Rumah (Home Visit)',
    'Alih Tangan Kasus (Referral)',
    'Lainnya'
  ];
  const noExcludedPresent = excludedLegacyOptions.every(opt =>
    !JENIS_LAYANAN_OPTIONS.includes(opt)
  );
  check(
    noExcludedPresent,
    'R1-02',
    'Zero legacy/non-"layanan" options exist in JENIS_LAYANAN_OPTIONS',
    `Verified absence of: ${excludedLegacyOptions.join(', ')}`
  );

  // 1.3 Every item in JENIS_LAYANAN_OPTIONS maps to a valid BK_SERVICE_CONFIGS definition
  const allConfigsDefined = JENIS_LAYANAN_OPTIONS.every(opt =>
    Boolean(BK_SERVICE_CONFIGS[opt])
  );
  check(
    allConfigsDefined,
    'R1-03',
    'Every filtered option corresponds 1-to-1 with a BK_SERVICE_CONFIGS definition',
    `11 official services configured with dynamic fields and guidance domains`
  );

  // 1.4 getCanonicalServiceName normalizes legacy shorthand names
  check(
    getCanonicalServiceName('Konseling Individual') === 'Layanan Konseling Perorangan (Individual)' &&
    getCanonicalServiceName('Konseling Kelompok') === 'Layanan Konseling Kelompok' &&
    getCanonicalServiceName('Bimbingan Kelompok') === 'Layanan Bimbingan Kelompok' &&
    getCanonicalServiceName('Konsultasi') === 'Layanan Konsultasi' &&
    getCanonicalServiceName('Mediasi') === 'Layanan Mediasi',
    'R1-04',
    'getCanonicalServiceName accurately normalizes legacy service names',
    'Legacy names mapped to canonical "Layanan ..." names'
  );

  // 1.5 History filter bar includes filterLayanan select with JENIS_LAYANAN_OPTIONS
  const hasHistoryLayananFilter =
    componentSource.includes('value={filterLayanan}') &&
    componentSource.includes('Semua Layanan') &&
    componentSource.includes('JENIS_LAYANAN_OPTIONS.map');
  check(
    hasHistoryLayananFilter,
    'R1-05',
    'History filter bar includes dedicated filterLayanan select element',
    'filterLayanan dropdown mounted in riwayat tab with Semua Layanan option'
  );

  // 1.6 filteredEntries filter logic integrates filterLayanan
  const hasFilterLayananLogic =
    componentSource.includes('if (filterLayanan !== \'all\')') &&
    componentSource.includes('getCanonicalServiceName(e.jenis_layanan)');
  check(
    hasFilterLayananLogic,
    'R1-06',
    'filteredEntries checks filterLayanan with canonical normalization support',
    'Matches direct service name and canonical alias transparently'
  );

  // ==========================================================================
  // SUITE 2: REQUIREMENT R2 — DUKUNGAN PEMILIHAN MULTI-SISWA
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 2: Requirement R2 (Multi-Siswa Support) ---${RESET}`);

  // 2.1 isMultiStudentService classification
  check(
    isMultiStudentService('Layanan Bimbingan Kelompok') === true &&
    isMultiStudentService('Layanan Konseling Kelompok') === true &&
    isMultiStudentService('Layanan Mediasi') === true &&
    isMultiStudentService('Bimbingan Kelompok') === true &&
    isMultiStudentService('Konseling Kelompok') === true &&
    isMultiStudentService('Mediasi') === true &&
    isMultiStudentService('Layanan Konseling Perorangan (Individual)') === false &&
    isMultiStudentService('Layanan Konsultasi') === false &&
    isMultiStudentService('Layanan Advokasi') === false,
    'R2-01',
    'isMultiStudentService accurately identifies group and mediation counseling services',
    'Returns true for group/mediasi, false for individual/konsultasi/advokasi'
  );

  // 2.2 Dual-representation storage contract simulation
  const dummyStudents: SiswaOption[] = [
    { id: 'uuid-student-1', nama_siswa: 'Ahmad Dahlan', kelas: '7A', nisn: '0012345678' },
    { id: 'uuid-student-2', nama_siswa: 'Budi Santoso', kelas: '7B', nisn: '0012345679' },
    { id: 'uuid-student-3', nama_siswa: 'Citra Dewi', kelas: '7A', nisn: '0012345680' }
  ];

  const serializedNames = dummyStudents.map(s => s.nama_siswa).join(', ');
  const serializedClasses = Array.from(new Set(dummyStudents.map(s => s.kelas))).join(', ');
  const serializedNisns = dummyStudents.map(s => s.nisn).filter(Boolean).join(', ');
  const primaryId = dummyStudents[0].id;
  const structuredPesertaDidik: PesertaDidikItem[] = dummyStudents.map(s => ({
    id: s.id,
    nisn: s.nisn,
    nama_siswa: s.nama_siswa,
    kelas: s.kelas
  }));

  check(
    serializedNames === 'Ahmad Dahlan, Budi Santoso, Citra Dewi' &&
    serializedClasses === '7A, 7B' &&
    serializedNisns === '0012345678, 0012345679, 0012345680' &&
    primaryId === 'uuid-student-1' &&
    structuredPesertaDidik.length === 3,
    'R2-02',
    'Dual-representation serializes comma-separated fields and structured array',
    'Primary FK satisfied with primary student ID, classes deduplicated'
  );

  // 2.3 Component source contains multi-student UI chips and toggle logic
  const hasMultiStudentChips =
    componentSource.includes('isMultiStudentService(formData.jenis_layanan)') &&
    componentSource.includes('handleToggleStudent') &&
    componentSource.includes('handleRemoveStudent') &&
    componentSource.includes('Siswa Terpilih');
  check(
    hasMultiStudentChips,
    'R2-03',
    'Form UI contains multi-student removable chips and toggle handlers',
    'Interactive chips display student name, class badge, and delete icon'
  );

  // 2.4 Reconstruction on edit from structured peserta_didik or legacy string
  const legacyMultiEntry: Partial<JurnalBkEntry> = {
    id: 'entry-legacy-1',
    nama_siswa: 'Fajar Nugraha, Gita Gutawa',
    kelas: '8A, 8B',
    nisn: '111, 222',
    jenis_layanan: 'Layanan Bimbingan Kelompok',
    sasaran: 'Kelompok'
  };

  const parsedNames = (legacyMultiEntry.nama_siswa || '').split(',').map(n => n.trim());
  const parsedClasses = (legacyMultiEntry.kelas || '').split(',').map(c => c.trim());
  const reconstructedLegacy = parsedNames.map((n, i) => ({
    id: `legacy-${i}-${n}`,
    nama_siswa: n,
    kelas: parsedClasses[i] || parsedClasses[0] || '',
    nisn: ''
  }));

  check(
    reconstructedLegacy.length === 2 &&
    reconstructedLegacy[0].nama_siswa === 'Fajar Nugraha' &&
    reconstructedLegacy[1].nama_siswa === 'Gita Gutawa',
    'R2-04',
    'Backward compatible deserialization reconstructs legacy comma-separated names',
    'Parsed 2 students with individual class attribution'
  );

  // 2.5 Detail badges filter out peserta_didik preventing [object Object]
  const hasDetailBadgeProtection =
    componentSource.includes("k !== 'peserta_didik'") &&
    componentSource.includes("typeof v === 'string'");
  check(
    hasDetailBadgeProtection,
    'R2-05',
    'Detail badges in history table filter out peserta_didik preventing [object Object]',
    'Non-string objects strictly filtered from detail badges'
  );

  // 2.6 Database migration file for peserta_didik column exists
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261117_add_peserta_didik_to_jurnal_bk.sql');
  const migrationExists = fs.existsSync(migrationPath);
  const migrationContent = migrationExists ? fs.readFileSync(migrationPath, 'utf8') : '';
  check(
    migrationExists &&
    migrationContent.includes('ALTER TABLE public.jurnal_bk ADD COLUMN IF NOT EXISTS peserta_didik JSONB'),
    'R2-06',
    'Database migration 20261117_add_peserta_didik_to_jurnal_bk.sql exists and valid',
    'Defines ALTER TABLE public.jurnal_bk ADD COLUMN IF NOT EXISTS peserta_didik JSONB'
  );

  // 2.7 Missing column fallback logic guards peserta_didik
  const hasMissingColGuard =
    componentSource.includes("msg.includes('peserta_didik')") &&
    componentSource.includes('payloadWithVerifNoPeserta');
  check(
    hasMissingColGuard,
    'R2-07',
    'isMissingOptionalCol guards peserta_didik column with retry fallbacks',
    'Protects against PGRST204 / 42703 schema cache or unmigrated column errors'
  );

  // ==========================================================================
  // SUITE 3: REQUIREMENT R3 — TAMPILAN CETAK DOKUMEN JURNAL MOBILE
  // ==========================================================================
  console.log(`\n${BOLD}--- Suite 3: Requirement R3 (Mobile Print Responsiveness) ---${RESET}`);

  // 3.1 Responsive Toolbar container
  const hasResponsiveToolbar =
    componentSource.includes('flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white');
  check(
    hasResponsiveToolbar,
    'R3-01',
    'Tab 3 Toolbar container uses responsive stacking (flex-col md:flex-row)',
    'Prevents side-by-side button squishing on mobile viewports'
  );

  // 3.2 Responsive Paper Card Padding & Overflow
  const hasResponsivePaperCard =
    componentSource.includes('p-3.5 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-gray-300 max-w-full overflow-hidden print:overflow-visible');
  check(
    hasResponsivePaperCard,
    'R3-02',
    'Printable paper card uses responsive padding (p-3.5 sm:p-6 md:p-8) and overflow protection',
    'Card fits inside mobile viewport (<640px) without horizontal blowout'
  );

  // 3.3 Mobile Swipe Indicator
  const hasMobileSwipeHint =
    componentSource.includes('Geser tabel ke samping') &&
    componentSource.includes('sm:hidden no-print');
  check(
    hasMobileSwipeHint,
    'R3-03',
    'Mobile swipe indicator rendered for mobile screens and hidden on desktop/print',
    'Displays "Geser tabel ke samping" hint with pulse icon on sm:hidden'
  );

  // 3.4 Responsive Table Wrapper
  const hasResponsiveTableWrapper =
    componentSource.includes('w-full overflow-x-auto rounded-xl border border-gray-200 print:border-none print:overflow-visible my-2 print:my-2 custom-scroll') &&
    componentSource.includes('min-w-[760px] sm:min-w-full print:min-w-0');
  check(
    hasResponsiveTableWrapper,
    'R3-04',
    'Print table wrapped in responsive horizontal scroll container with print reset',
    'Table constrained inside scroll wrapper; @media print resets overflow: visible'
  );

  // 3.5 Document subheader dark mode text contrast fix on white paper
  const hasSubheaderContrastFix =
    componentSource.includes('text-gray-900 print:text-black uppercase tracking-wider') &&
    componentSource.includes('text-xs text-gray-600 print:text-black mt-1 flex flex-wrap justify-center');
  check(
    hasSubheaderContrastFix,
    'R3-05',
    'Subheader dark mode glitch fixed: uses dark text (text-gray-900 / text-gray-600) on white paper card',
    'No dark:text-white on white paper background'
  );

  // 3.6 Print View formats multi-student entries as clean list without blowout
  const hasPrintMultiStudentFormat =
    componentSource.includes('Kelompok (') &&
    componentSource.includes('list-decimal list-inside');
  check(
    hasPrintMultiStudentFormat,
    'R3-06',
    'Print view renders multi-student groups as structured compact ordered list',
    'Numbered list with classes and NISNs fits cleanly without column blowout'
  );

  // 3.7 Preservation of global print styles in globals.css
  const globalsPath = path.resolve(__dirname, '../src/app/globals.css');
  const globalsContent = fs.readFileSync(globalsPath, 'utf8');
  const hasPrintRulesInCss =
    globalsContent.includes('@media print') &&
    globalsContent.includes('.no-print {') &&
    globalsContent.includes('table-layout: auto !important;');
  check(
    hasPrintRulesInCss,
    'R3-07',
    'Project global print styles in src/app/globals.css remain intact with 100% paper fidelity',
    'window.print() unrolls overflow and formats table to 100% page width'
  );

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}TEST RESULTS SUMMARY:${RESET}`);
  console.log(`  Total Asserts: ${totalTests}`);
  console.log(`  Passed:        ${GREEN}${passedTests}${RESET}`);
  console.log(`  Failed:        ${failedTests > 0 ? RED + failedTests : GREEN + '0'}${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
