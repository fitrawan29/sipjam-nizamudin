import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-key';
}

async function runTests() {
  const { formatPeriodHeader } = await import('../src/components/PrintHeader');

  console.log('====================================================');
  console.log('MILESTONE M6.2 TEST: DOCUMENT PRINTING REDESIGN');
  console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${label}`);
    if (detail) console.error(`   ${detail}`);
    failed++;
  }
}

// ----------------------------------------------------
// Section 1: Dynamic Period Header Formatting
// ----------------------------------------------------
console.log('--- Section 1: formatPeriodHeader Helper Verification ---');

const testBulan = formatPeriodHeader('2026-09');
assert(
  testBulan === 'Periode: September 2026',
  'formatPeriodHeader formats YYYY-MM into Indonesian Month and Year',
  `Expected "Periode: September 2026", got "${testBulan}"`
);

const testDateRange = formatPeriodHeader('', '2026-09-01', '2026-09-12');
assert(
  testDateRange === 'Periode: 01/09/2026 - 12/09/2026',
  'formatPeriodHeader formats startDate and endDate into DD/MM/YYYY range',
  `Expected "Periode: 01/09/2026 - 12/09/2026", got "${testDateRange}"`
);

const testSingleDate = formatPeriodHeader('', '2026-09-05', '2026-09-05');
assert(
  testSingleDate === 'Periode: 05/09/2026',
  'formatPeriodHeader formats identical start & end date to single date',
  `Expected "Periode: 05/09/2026", got "${testSingleDate}"`
);

const testEmpty = formatPeriodHeader();
assert(
  testEmpty === 'Periode: Semua Data',
  'formatPeriodHeader handles empty parameters gracefully',
  `Expected "Periode: Semua Data", got "${testEmpty}"`
);

// ----------------------------------------------------
// Section 2: PrintHeader.tsx Invariants
// ----------------------------------------------------
console.log('\n--- Section 2: PrintHeader & PrintSignature Invariants ---');

const printHeaderPath = path.join(__dirname, '..', 'src', 'components', 'PrintHeader.tsx');
const printHeaderContent = fs.readFileSync(printHeaderPath, 'utf-8');

assert(
  printHeaderContent.includes('export function PrintOrientationToggle'),
  'PrintHeader.tsx exports PrintOrientationToggle component'
);

assert(
  printHeaderContent.includes('size: A4 ${orientation} !important;'),
  'PrintOrientationToggle injects dynamic @page size based on selected orientation'
);

assert(
  printHeaderContent.includes('header, nav, aside, .app-header, .no-print {') &&
  printHeaderContent.includes('display: none !important;'),
  'PrintOrientationToggle hides header, nav, aside, .app-header in @media print'
);

assert(
  printHeaderContent.includes('w-full flex justify-between items-start mt-8 pt-4 page-break-inside-avoid'),
  'PrintSignature container uses justified full-width flex layout (justify-between)'
);

assert(
  printHeaderContent.includes('block whitespace-nowrap'),
  'PrintSignature enforces block whitespace-nowrap on text lines to prevent wrapping down'
);

// ----------------------------------------------------
// Section 3: RekapJurnalView.tsx Verification
// ----------------------------------------------------
console.log('\n--- Section 3: RekapJurnalView.tsx Print Redesign ---');

const rekapJurnalPath = path.join(__dirname, '..', 'src', 'components', 'RekapJurnalView.tsx');
const rekapJurnalContent = fs.readFileSync(rekapJurnalPath, 'utf-8');

assert(
  rekapJurnalContent.includes("useState<'landscape' | 'portrait'>('landscape')"),
  'RekapJurnalView defaults orientation to landscape'
);

assert(
  rekapJurnalContent.includes('<PrintOrientationToggle orientation={orientation} setOrientation={setOrientation}'),
  'RekapJurnalView renders interactive PrintOrientationToggle toolbar'
);

assert(
  rekapJurnalContent.includes('formatPeriodHeader(bulan, startDate, endDate)'),
  'RekapJurnalView dynamically renders formatPeriodHeader in subheader'
);

assert(
  rekapJurnalContent.includes('getGoogleDriveThumbnailUrl(fotoUrl, 800)'),
  'RekapJurnalView uses getGoogleDriveThumbnailUrl(fotoUrl, 800) for high resolution activity photo'
);

assert(
  rekapJurnalContent.includes('print:w-20 print:h-16 object-contain rounded border border-gray-300'),
  'RekapJurnalView styles activity photos with print:w-20 print:h-16 object-contain rounded border border-gray-300'
);

assert(
  rekapJurnalContent.includes('leftTitle="Mengetahui,"') &&
  rekapJurnalContent.includes('leftSubtitle="Guru Mata Pelajaran"'),
  'RekapJurnalView passes dual signers to PrintSignature'
);

// ----------------------------------------------------
// Section 4: AdminRekapView.tsx Verification
// ----------------------------------------------------
console.log('\n--- Section 4: AdminRekapView.tsx 10-Column Table & Print ---');

const adminRekapPath = path.join(__dirname, '..', 'src', 'components', 'AdminRekapView.tsx');
const adminRekapContent = fs.readFileSync(adminRekapPath, 'utf-8');

assert(
  adminRekapContent.includes("useState<'landscape' | 'portrait'>('landscape')"),
  'AdminRekapView defaults orientation to landscape'
);

assert(
  adminRekapContent.includes('<PrintOrientationToggle orientation={orientation} setOrientation={setOrientation}'),
  'AdminRekapView renders interactive PrintOrientationToggle toolbar'
);

assert(
  adminRekapContent.includes('formatPeriodHeader(bulan, startDate, endDate)'),
  'AdminRekapView dynamically renders formatPeriodHeader in subheader'
);

// Verify 10-column table presence
assert(
  adminRekapContent.includes('<table className="w-full text-left text-xs border-collapse border border-gray-300 dark:border-gray-700 print:border-black print:text-[8pt]">'),
  'AdminRekapView has dedicated professional table with crisp borders'
);

const adminExpectedHeaders = [
  'No',
  'Nama Guru',
  'Hadir',
  'Dinas Luar',
  'Sakit',
  'Izin',
  'Alpa',
  'Keterlambatan',
  'Piket',
  'Jurnal'
];

let allHeadersFound = true;
adminExpectedHeaders.forEach(hdr => {
  if (!adminRekapContent.includes(`>${hdr}</th>`)) {
    allHeadersFound = false;
    console.error(`Missing header in AdminRekapView: ${hdr}`);
  }
});

assert(
  allHeadersFound,
  'AdminRekapView contains all 10 required table headers in exact format'
);

// Verify card grid is gone and replaced
assert(
  !adminRekapContent.includes('id="card-rekap-presensi"'),
  'AdminRekapView replaced old card grid with 10-column table'
);

// ----------------------------------------------------
// Section 5: RekapSiswaView.tsx Verification
// ----------------------------------------------------
console.log('\n--- Section 5: RekapSiswaView.tsx Table & Print Layout ---');

const rekapSiswaPath = path.join(__dirname, '..', 'src', 'components', 'RekapSiswaView.tsx');
const rekapSiswaContent = fs.readFileSync(rekapSiswaPath, 'utf-8');

assert(
  rekapSiswaContent.includes("useState<'landscape' | 'portrait'>('portrait')"),
  'RekapSiswaView defaults orientation to portrait and allows selection'
);

assert(
  rekapSiswaContent.includes('<PrintOrientationToggle orientation={orientation} setOrientation={setOrientation}'),
  'RekapSiswaView renders interactive PrintOrientationToggle toolbar'
);

assert(
  rekapSiswaContent.includes("formatPeriodHeader('', startDate, endDate)"),
  'RekapSiswaView dynamically renders formatPeriodHeader in subheader'
);

assert(
  rekapSiswaContent.includes('border-collapse border border-gray-300 dark:border-gray-700 print:border-black'),
  'RekapSiswaView enforces professional crisp table borders (print:border-black)'
);

assert(
  rekapSiswaContent.includes('px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black'),
  'RekapSiswaView enforces consistent cell padding and print borders'
);

assert(
  rekapSiswaContent.includes('leftTitle="Mengetahui,"'),
  'RekapSiswaView configures dual signature block'
);

// ----------------------------------------------------
// Final Summary
// ----------------------------------------------------
console.log('\n====================================================');
if (failed === 0) {
  console.log(`🎉 ALL ${passed} M6.2 PRINT REDESIGN TESTS PASSED!`);
  console.log('====================================================');
  process.exit(0);
} else {
  console.error(`💥 ${failed} TESTS FAILED out of ${passed + failed}!`);
  console.log('====================================================');
  process.exit(1);
}
}

runTests();
