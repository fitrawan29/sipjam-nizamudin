import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`  ✔ [PASS] ${message}`);
}

console.log('========================================================================');
console.log('🧪 TEST SUITE: GRADEBOOK STICKY (R1) & BK JURNAL PRINT (R2, R3, R4)');
console.log('========================================================================\n');

const gradebookPath = path.join(process.cwd(), 'src', 'components', 'GradebookView.tsx');
const bkJurnalPath = path.join(process.cwd(), 'src', 'components', 'BkJurnalView.tsx');

assert(fs.existsSync(gradebookPath), 'GradebookView.tsx exists');
assert(fs.existsSync(bkJurnalPath), 'BkJurnalView.tsx exists');

const gradebookContent = fs.readFileSync(gradebookPath, 'utf-8');
const bkJurnalContent = fs.readFileSync(bkJurnalPath, 'utf-8');

// --- Suite 1: R1 Sticky / Frozen Columns in GradebookView ---
console.log('--- Suite 1: R1 Sticky / Frozen Columns in GradebookView ---');

// Check cumulative left offsets and z-indexes for thead headers
const theadStickyHeaderPattern = /sticky left-0 z-30 bg-\[#DDE4EE\] dark:bg-\[#181C24\] print:bg-gray-100 print:text-black py-2(?:\.5)? px-2\.5 w-10 min-w-\[40px\] max-w-\[40px\] text-center/g;
const headerMatches = gradebookContent.match(theadStickyHeaderPattern);
assert(Boolean(headerMatches && headerMatches.length === 4), `All 4 tables define frozen '#' header at left-0 z-30 (found ${headerMatches?.length || 0})`);

const theadNisnPattern = /sticky left-\[40px\] z-30 bg-\[#DDE4EE\] dark:bg-\[#181C24\] print:bg-gray-100 print:text-black py-2(?:\.5)? px-2\.5 w-24 min-w-\[96px\] max-w-\[96px\]/g;
const nisnMatches = gradebookContent.match(theadNisnPattern);
assert(Boolean(nisnMatches && nisnMatches.length === 4), `All 4 tables define frozen 'NISN' header at left-[40px] z-30 (found ${nisnMatches?.length || 0})`);

const theadNamaPattern = /sticky left-\[136px\] z-30 bg-\[#DDE4EE\] dark:bg-\[#181C24\] print:bg-gray-100 print:text-black py-2(?:\.5)? px-3 w-\[200px\] min-w-\[200px\] max-w-\[200px\]/g;
const namaMatches = gradebookContent.match(theadNamaPattern);
assert(Boolean(namaMatches && namaMatches.length === 4), `All 4 tables define frozen 'Nama Siswa' header at left-[136px] z-30 (found ${namaMatches?.length || 0})`);

const theadGenderPattern = /sticky left-\[336px\] z-30 bg-\[#DDE4EE\] dark:bg-\[#181C24\] print:bg-gray-100 print:text-black py-2(?:\.5)? px-2 w-12 min-w-\[48px\] max-w-\[48px\] text-center border-r border-slate-300\/60 dark:border-slate-700\/60/g;
const genderMatches = gradebookContent.match(theadGenderPattern);
assert(Boolean(genderMatches && genderMatches.length === 4), `All 4 tables define frozen 'L/P' header at left-[336px] z-30 (found ${genderMatches?.length || 0})`);

// Category row
const categoryRowPattern = /<th colSpan=\{4\} className="sticky left-0 z-30 py-2\.5 px-3 border-r border-slate-300\/60 dark:border-slate-700\/60 text-center bg-\[#DDE4EE\] dark:bg-\[#181C24\] print:bg-gray-100 print:text-black">/g;
const catMatches = gradebookContent.match(categoryRowPattern);
assert(Boolean(catMatches && catMatches.length === 3), `Category 'Identitas Siswa' header is frozen at left-0 z-30 across all 3 multi-row tables (found ${catMatches?.length || 0})`);

// Tbody cells
const tbodyNumPattern = /sticky left-0 z-10 bg-\[#E6ECF2\] dark:bg-\[#1F242D\] group-hover:bg-\[#DDE4EE\] dark:group-hover:bg-\[#181C24\] print:bg-white py-2(?:\.5)? px-2\.5 text-center text-\[#475569\](?: dark:text-\[#94A3B8\])? font-medium font-num w-10 min-w-\[40px\] max-w-\[40px\]/g;
const tbodyNumMatches = gradebookContent.match(tbodyNumPattern);
assert(Boolean(tbodyNumMatches && tbodyNumMatches.length === 4), `Tbody '#' cell has Cool Slate solid background, group hover, and sticky left-0 z-10 across all 4 tables (found ${tbodyNumMatches?.length || 0})`);

const tbodyNisnPattern = /sticky left-\[40px\] z-10 bg-\[#E6ECF2\] dark:bg-\[#1F242D\] group-hover:bg-\[#DDE4EE\] dark:group-hover:bg-\[#181C24\] print:bg-white py-2(?:\.5)? px-2\.5 font-mono font-num text-\[11px\] text-\[#475569\] dark:text-\[#94A3B8\] w-24 min-w-\[96px\] max-w-\[96px\]/g;
const tbodyNisnMatches = gradebookContent.match(tbodyNisnPattern);
assert(Boolean(tbodyNisnMatches && tbodyNisnMatches.length === 4), `Tbody 'NISN' cell has Cool Slate solid background, group hover, and sticky left-[40px] z-10 across all 4 tables (found ${tbodyNisnMatches?.length || 0})`);

const tbodyNamaPattern = /sticky left-\[136px\] z-10 bg-\[#E6ECF2\] dark:bg-\[#1F242D\] group-hover:bg-\[#DDE4EE\] dark:group-hover:bg-\[#181C24\] print:bg-white py-2(?:\.5)? px-3 font-semibold text-\[#0F172A\] dark:text-\[#F1F5F9\] w-\[200px\] min-w-\[200px\] max-w-\[200px\] truncate/g;
const tbodyNamaMatches = gradebookContent.match(tbodyNamaPattern);
assert(Boolean(tbodyNamaMatches && tbodyNamaMatches.length === 4), `Tbody 'Nama Siswa' cell has Cool Slate solid background, group hover, and sticky left-[136px] z-10 across all 4 tables (found ${tbodyNamaMatches?.length || 0})`);

const tbodyGenderPattern = /sticky left-\[336px\] z-10 bg-\[#E6ECF2\] dark:bg-\[#1F242D\] group-hover:bg-\[#DDE4EE\] dark:group-hover:bg-\[#181C24\] print:bg-white py-2(?:\.5)? px-2 text-center text-\[#475569\](?: dark:text-\[#94A3B8\])? border-r border-slate-300\/60 dark:border-slate-700\/60 w-12 min-w-\[48px\] max-w-\[48px\]/g;
const tbodyGenderMatches = gradebookContent.match(tbodyGenderPattern);
assert(Boolean(tbodyGenderMatches && tbodyGenderMatches.length === 4), `Tbody 'L/P' cell has Cool Slate solid background, group hover, and sticky left-[336px] z-10 across all 4 tables (found ${tbodyGenderMatches?.length || 0})`);

// Tfoot cell
assert(
  gradebookContent.includes('<td colSpan={4} className="sticky left-0 z-10 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black py-2.5 px-3 text-right border-r border-slate-300/60 dark:border-slate-700">'),
  'Table 1 tfoot average cell is frozen at sticky left-0 z-10 with Cool Slate solid background'
);

// --- Suite 2: R2 Kop Surat Jurnal Cetak BK Aligned with Jurnal Guru ---
console.log('\n--- Suite 2: R2 Kop Surat Jurnal Cetak BK Aligned with Jurnal Guru ---');

// Banner and Preview Toolbar have no-print
assert(
  bkJurnalContent.includes('className="neu-card-sm p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 no-print"'),
  'Header Banner has no-print class preventing screen banner from appearing in printout'
);

assert(
  bkJurnalContent.includes('className="flex flex-col md:flex-row md:items-center justify-between gap-3 neu-card p-3.5 sm:p-4 rounded-2xl no-print"'),
  'Preview Toolbar has no-print class preventing screen toolbar from appearing in printout'
);

// PrintHeader call passes user and sekolahId
assert(
  bkJurnalContent.includes('<PrintHeader user={user} sekolahId={user?.sekolah_id || sekolahId} />'),
  'PrintHeader invocation passes user and sekolahId={user?.sekolah_id || sekolahId}'
);

// Document subheader
assert(
  bkJurnalContent.includes('JURNAL KEGIATAN BIMBINGAN DAN KONSELING (BK)') &&
  bkJurnalContent.includes('<h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F1F5F9] print:text-black uppercase tracking-wider">') &&
  bkJurnalContent.includes('<span>Guru BK: <strong>{filterCounselor !== \'all\' ? filterCounselor : counselorName}</strong></span>'),
  'Document subheader matches RekapJurnalView styling with tracking-wider and dynamic metadata tags'
);

// --- Suite 3: R3 Dokumentasi Column in BK Print View ---
console.log('\n--- Suite 3: R3 Dokumentasi Column in BK Print View ---');

// Header
assert(
  bkJurnalContent.includes('print:border-black p-2 w-24 text-center print:w-24">Dokumentasi</th>'),
  'Print table header renders "Dokumentasi" column (w-24 text-center)'
);

// Body cell logic
assert(
  bkJurnalContent.includes('const docUrl = e.link_dokumen?.trim();') &&
  bkJurnalContent.includes('getGoogleDriveThumbnailUrl(docUrl, 400) || transformGoogleDriveUrl(docUrl)') &&
  bkJurnalContent.includes('isGoogleDriveUrl(docUrl)'),
  'Print table body renders documentation thumbnail using imageUrl utilities'
);

assert(
  bkJurnalContent.includes('target.src = transformGoogleDriveUrl(docUrl);'),
  'Documentation thumbnail has onError fallback to direct stream URL'
);

// Colspan 9
assert(
  bkJurnalContent.includes('<td colSpan={9} className="p-4 text-center text-xs italic">'),
  'Empty state row properly spans all 9 columns (colSpan={9})'
);

// --- Suite 4: R4 Standard Signature Block Alignment ---
console.log('\n--- Suite 4: R4 Standard Signature Block Alignment ---');

// Import PrintSignature
assert(
  bkJurnalContent.includes("import { PrintHeader, PrintSignature } from './PrintHeader';"),
  'BkJurnalView imports PrintSignature from ./PrintHeader'
);

// PrintSignature call
assert(
  bkJurnalContent.includes('<PrintSignature') &&
  bkJurnalContent.includes('leftTitle="Mengetahui,"') &&
  bkJurnalContent.includes('leftSubtitle="Guru Bimbingan Konseling (BK)"') &&
  bkJurnalContent.includes("user={user ? { ...user, role: 'bk' } : { role: 'bk' }}") &&
  bkJurnalContent.includes('sekolahId={user?.sekolah_id || sekolahId}') &&
  bkJurnalContent.includes('statusKepalaSekolah={statusKepalaSekolah}'),
  'PrintSignature invoked with Guru BK on left and Kepala Sekolah on right with official props'
);

// Inverted signature removed
assert(
  !bkJurnalContent.includes('___________________________'),
  'Old inverted hardcoded signature placeholder is removed'
);

console.log('\n========================================================================');
console.log('🎉 ALL R1, R2, R3, R4 CHECKS PASSED WITH 100% SUCCESS!');
console.log('========================================================================\n');
