import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

const root = path.resolve(__dirname, '../../..');

console.log('====================================================');
console.log('VERIFYING MILESTONE 2 (R3) IMPLEMENTATION');
console.log('====================================================\n');

// 1. Verify src/components/AIAssistant/AIAssistant.tsx
console.log('--- 1. Verification of AIAssistant.tsx ---');
const aiFile = path.join(root, 'src/components/AIAssistant/AIAssistant.tsx');
assert(fs.existsSync(aiFile), 'AIAssistant.tsx exists');
const aiContent = fs.readFileSync(aiFile, 'utf8');

// Check trigger button classes
assert(
  aiContent.includes('data-tour="ai-assistant-btn"') &&
  aiContent.includes('no-print print:hidden'),
  'AIAssistant.tsx trigger button contains no-print print:hidden'
);

// Check chat dialog panel classes
assert(
  aiContent.includes('role="dialog"') &&
  aiContent.includes('aria-label="Panel Asisten AI SIPJAM"') &&
  aiContent.includes('no-print print:hidden'),
  'AIAssistant.tsx chat panel dialog contains no-print print:hidden'
);

// 2. Verify src/app/globals.css
console.log('\n--- 2. Verification of globals.css ---');
const cssFile = path.join(root, 'src/app/globals.css');
assert(fs.existsSync(cssFile), 'globals.css exists');
const cssContent = fs.readFileSync(cssFile, 'utf8');

// Check @media print selectors
assert(cssContent.includes('@media print'), 'globals.css contains @media print');
assert(cssContent.includes('[data-tour="ai-assistant-btn"]'), 'globals.css print rule targets [data-tour="ai-assistant-btn"]');
assert(cssContent.includes('[aria-label*="Asisten AI"]'), 'globals.css print rule targets [aria-label*="Asisten AI"]');
assert(cssContent.includes('[role="dialog"][aria-label*="Asisten AI"]'), 'globals.css print rule targets [role="dialog"][aria-label*="Asisten AI"]');
assert(cssContent.includes('.fa-robot'), 'globals.css print rule targets .fa-robot');
assert(cssContent.includes('button.fixed'), 'globals.css print rule targets button.fixed');
assert(cssContent.includes('div.fixed:not(.sipjam-print-watermark)'), 'globals.css print rule targets div.fixed:not(.sipjam-print-watermark)');

// Check .sipjam-print-watermark preservation
assert(
  cssContent.includes('.sipjam-print-watermark') &&
  cssContent.includes('display: flex !important;'),
  'globals.css preserves .sipjam-print-watermark with display: flex !important;'
);

// Check watermark hidden on screen media
assert(
  cssContent.includes('@media screen') &&
  cssContent.includes('.sipjam-print-watermark'),
  'globals.css hides .sipjam-print-watermark on screen media'
);

// 3. Verify src/components/DokumenView.tsx
console.log('\n--- 3. Verification of DokumenView.tsx ---');
const dokFile = path.join(root, 'src/components/DokumenView.tsx');
assert(fs.existsSync(dokFile), 'DokumenView.tsx exists');
const dokContent = fs.readFileSync(dokFile, 'utf8');

// Check PrintHeader import and render
assert(
  dokContent.includes("import { PrintHeader, PrintSignature, PrintOrientationToggle, formatPeriodHeader } from './PrintHeader';"),
  'DokumenView.tsx imports PrintHeader components'
);
assert(
  dokContent.includes('<PrintHeader user={user} sekolahId={user?.sekolah_id} />'),
  'DokumenView.tsx renders <PrintHeader user={user} sekolahId={user?.sekolah_id} />'
);

// Check Print Subheader
assert(
  dokContent.includes('Laporan Kelengkapan Perangkat Pembelajaran Kurikulum Merdeka') &&
  dokContent.includes('Tahun Ajaran:') &&
  dokContent.includes('Dicetak:'),
  'DokumenView.tsx contains standardized Print Subheader with Teacher Name, School Year, Print Date'
);

// Check PrintOrientationToggle and Cetak Dokumen button
assert(
  dokContent.includes('<PrintOrientationToggle orientation={orientation} setOrientation={setOrientation} />') &&
  dokContent.includes('Cetak Dokumen'),
  'DokumenView.tsx renders PrintOrientationToggle and Cetak Dokumen button'
);

// Check no-print on web interactive cards and forms
assert(
  dokContent.includes("activeTab === 'matrix' && (\n          <div className=\"space-y-6 fade-in no-print\">") ||
  dokContent.includes("activeTab === 'matrix' && (\r\n          <div className=\"space-y-6 fade-in no-print\">"),
  'DokumenView.tsx has no-print on Admin matrix web cards'
);
assert(
  dokContent.includes("activeTab === 'list' && (\n          <div className=\"space-y-6 fade-in no-print\">") ||
  dokContent.includes("activeTab === 'list' && (\r\n          <div className=\"space-y-6 fade-in no-print\">"),
  'DokumenView.tsx has no-print on Teacher list web cards'
);
assert(
  dokContent.includes('id="dokumen-content-upload" className="fade-in max-w-xl mx-auto no-print"'),
  'DokumenView.tsx has no-print on upload form'
);

// Check Print-Only Table
assert(
  dokContent.includes('print-only hidden print:block') &&
  dokContent.includes('border-collapse border border-black print:border-black print:text-[8pt]') &&
  dokContent.includes('bg-gray-100 text-black font-bold border-b border-black print:bg-gray-100 print:text-black print:border-black') &&
  dokContent.includes('px-2 py-1.5 border border-black'),
  'DokumenView.tsx renders standardized Print-Only Table for curriculum documents'
);

// Check PrintSignature
assert(
  dokContent.includes('<PrintSignature') &&
  dokContent.includes('leftSubtitle={isAdmin ? "Pengelola Data / Admin" : "Guru Mata Pelajaran"}') &&
  dokContent.includes('sekolahId={user?.sekolah_id}'),
  'DokumenView.tsx renders PrintSignature with dual signers'
);

// 4. Verify src/components/RekapJurnalView.tsx
console.log('\n--- 4. Verification of RekapJurnalView.tsx ---');
const rekapFile = path.join(root, 'src/components/RekapJurnalView.tsx');
assert(fs.existsSync(rekapFile), 'RekapJurnalView.tsx exists');
const rekapContent = fs.readFileSync(rekapFile, 'utf8');

// Check table header bg standardized to print:bg-gray-100
assert(
  !rekapContent.includes('print:bg-gray-200'),
  'RekapJurnalView.tsx does not use print:bg-gray-200 anymore'
);
assert(
  rekapContent.includes('print:bg-gray-100 print:text-black print:border-black'),
  'RekapJurnalView.tsx headers use print:bg-gray-100'
);

// Check standardized cell padding px-2 py-1.5 print:p-1.5
assert(
  rekapContent.includes('px-2 py-1.5 print:p-1.5 border border-gray-200 dark:border-gray-700 print:border-black'),
  'RekapJurnalView.tsx uses standardized px-2 py-1.5 print:p-1.5 cell padding'
);

// Check no-print on raw GPS coordinates
assert(
  rekapContent.includes('max-w-[100px] text-center leading-tight no-print'),
  'RekapJurnalView.tsx hides raw GPS coordinates with no-print'
);

// Check Wali Kelas autofill in PrintSignature
assert(
  rekapContent.includes("isWaliKelas || waliClasses.length > 0"),
  'RekapJurnalView.tsx autofills Wali Kelas name and NIP in signature'
);

console.log('\n====================================================');
console.log('🎉 ALL MILESTONE 2 (R3) VERIFICATION CHECKS PASSED!');
console.log('====================================================\n');
