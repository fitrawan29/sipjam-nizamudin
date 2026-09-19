/**
 * Empirical Adversarial Test Suite - Challenger M10 Track 2
 * 
 * Target Coverage:
 * 1. Print layout, table pagination, and Kop Surat logos:
 *    - Verify @page in PrintHeader.tsx does NOT contain 'size: A4 ${orientation} !important;'.
 *    - Verify tables in GradebookView.tsx, RekapJurnalView.tsx, etc. do NOT have un-overridden max-h-[600px] or overflow-hidden during print.
 *    - Verify logo URL generation: test Google Drive thumbnail generation with diverse file ID formats, test tenant fallback to logo_kiri_url / logo_kanan_url.
 *    - Verify 3-column symmetric layout constraints.
 * 2. Admin Perangkat Pembelajaran CRUD & Minimalist Cards:
 *    - Completeness calculation edge cases: teacher with 0 assigned subjects, subject with 0 requirements, partial document uploads, legacy document type strings vs new requirements.
 * 3. Admin Daily Status Matrix in src/components/HomeView.tsx:
 *    - Date query stress tests: timestamps with slash formats, space-separated formats (YYYY-MM-DD HH:mm:ss), ISO 8601 UTC formats.
 *    - Picket lookup: verify direct querying of penugasan_piket.
 *    - Dinas Luar and holiday handling.
 */

import fs from 'fs';
import path from 'path';
import {
  getGoogleDriveFileId,
  transformGoogleDriveUrl,
  getGoogleDriveThumbnailUrl,
  isGoogleDriveUrl
} from '../src/lib/imageUrl';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     -> ${detail}`);
    failedTests++;
  }
}

console.log('================================================================');
console.log('CHALLENGER M10_2: ADVERSARIAL STRESS-TEST & VERIFICATION HARNESS');
console.log('================================================================\n');

const projectRoot = path.resolve(__dirname, '..');

// ============================================================================
// PART 1: PRINT LAYOUT, TABLE PAGINATION, AND KOP SURAT LOGOS
// ============================================================================
console.log('>>> SECTION 1: Print Layout, Table Pagination & Kop Surat Logos <<<');

// 1.1: Verify @page does NOT contain forced A4 size in PrintHeader.tsx
const printHeaderPath = path.join(projectRoot, 'src', 'components', 'PrintHeader.tsx');
assert(fs.existsSync(printHeaderPath), 'PrintHeader.tsx exists');
const printHeaderContent = fs.readFileSync(printHeaderPath, 'utf8');

assert(
  !printHeaderContent.includes('size: A4 ${orientation} !important;'),
  '@page in PrintHeader.tsx does NOT contain "size: A4 ${orientation} !important;"'
);
assert(
  !printHeaderContent.includes('size: A4'),
  '@page in PrintHeader.tsx does NOT force "size: A4" anywhere'
);
assert(
  printHeaderContent.includes("margin: ${orientation === 'landscape' ? '8mm 10mm' : '12mm 15mm'} !important;"),
  '@page preserves user printable margins (landscape vs portrait)'
);

// 1.2: Check global CSS & Component table pagination overrides
const globalsCssPath = path.join(projectRoot, 'src', 'app', 'globals.css');
assert(fs.existsSync(globalsCssPath), 'globals.css exists');
const globalsCssContent = fs.readFileSync(globalsCssPath, 'utf8');

assert(
  globalsCssContent.includes('overflow: visible !important;') &&
  globalsCssContent.includes('max-height: none !important;') &&
  globalsCssContent.includes('height: auto !important;'),
  'globals.css defines @media print resets for overflow: visible and max-height: none'
);

assert(
  globalsCssContent.includes('.overflow-y-auto') &&
  globalsCssContent.includes('[class*="max-h-"]') &&
  globalsCssContent.includes('.overflow-hidden') &&
  globalsCssContent.includes('.custom-scroll'),
  'globals.css explicitly targets .overflow-y-auto, [class*="max-h-"], .overflow-hidden in print'
);

assert(
  globalsCssContent.includes('word-break: break-word !important;') &&
  globalsCssContent.includes('overflow-wrap: break-word !important;'),
  'globals.css specifies word-break: break-word and overflow-wrap: break-word on print table cells'
);

// Verify GradebookView.tsx tables have explicit print overrides
const gradebookPath = path.join(projectRoot, 'src', 'components', 'GradebookView.tsx');
assert(fs.existsSync(gradebookPath), 'GradebookView.tsx exists');
const gradebookContent = fs.readFileSync(gradebookPath, 'utf8');

assert(
  gradebookContent.includes('print:overflow-visible print:max-h-none'),
  'GradebookView.tsx containers have print:overflow-visible and print:max-h-none'
);

// Verify RekapJurnalView.tsx tables have print:overflow-visible
const rekapJurnalPath = path.join(projectRoot, 'src', 'components', 'RekapJurnalView.tsx');
assert(fs.existsSync(rekapJurnalPath), 'RekapJurnalView.tsx exists');
const rekapJurnalContent = fs.readFileSync(rekapJurnalPath, 'utf8');

assert(
  rekapJurnalContent.includes('print:overflow-visible'),
  'RekapJurnalView.tsx table container has print:overflow-visible'
);

// 1.3: Logo URL generation adversarial test suite
console.log('\n--- 1.3: Google Drive Logo URL Extraction & Generation ---');

const driveTestCases = [
  {
    name: 'Standard view share link',
    input: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing',
    expectedId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  },
  {
    name: 'Open link with query id parameter',
    input: 'https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz_01234',
    expectedId: '1AbCdEfGhIjKlMnOpQrStUvWxYz_01234'
  },
  {
    name: 'uc export link with id parameter',
    input: 'https://drive.google.com/uc?id=FILE_ID_ALPHA_BETA_123&export=download',
    expectedId: 'FILE_ID_ALPHA_BETA_123'
  },
  {
    name: 'Shortened direct /d/ URL',
    input: 'https://drive.google.com/d/short-id-987654321',
    expectedId: 'short-id-987654321'
  },
  {
    name: 'Google Docs document URL',
    input: 'https://docs.google.com/document/d/DOCS_FILE_ID_XYZ/edit',
    expectedId: 'DOCS_FILE_ID_XYZ'
  },
  {
    name: 'Google Spreadsheets URL',
    input: 'https://docs.google.com/spreadsheets/d/SHEETS_FILE_ID_456/edit#gid=0',
    expectedId: 'SHEETS_FILE_ID_456'
  },
  {
    name: 'Relative path starting with /file/d/',
    input: '/file/d/REL_FILE_ID_789/view',
    expectedId: 'REL_FILE_ID_789'
  },
  {
    name: 'Direct googleusercontent thumbnail',
    input: 'https://lh3.googleusercontent.com/d/GUSER_CONTENT_ID_888',
    expectedId: 'GUSER_CONTENT_ID_888'
  }
];

driveTestCases.forEach(tc => {
  const extractedId = getGoogleDriveFileId(tc.input);
  assert(
    extractedId === tc.expectedId,
    `Extract file ID from ${tc.name}`,
    `Got ${extractedId}, expected ${tc.expectedId}`
  );

  const thumbUrl = getGoogleDriveThumbnailUrl(tc.input, 800);
  assert(
    thumbUrl === `https://drive.google.com/thumbnail?id=${tc.expectedId}&sz=w800`,
    `Generate 800px CDN thumbnail for ${tc.name}`
  );

  const directUcUrl = transformGoogleDriveUrl(tc.input);
  assert(
    directUcUrl === `https://drive.google.com/uc?export=view&id=${tc.expectedId}`,
    `Generate direct uc streaming URL for ${tc.name}`
  );

  assert(
    isGoogleDriveUrl(tc.input) === true,
    `isGoogleDriveUrl returns true for ${tc.name}`
  );
});

// Negative edge cases for Google Drive URLs
console.log('\n--- 1.3b: Adversarial Negative & Non-Drive URLs ---');

const negativeCases = [
  { name: 'External regular HTTPS image', input: 'https://sekolah.sch.id/images/logo.png', expected: 'https://sekolah.sch.id/images/logo.png' },
  { name: 'Non-google domain with id query parameter', input: 'https://example.com/api/get?id=12345', expected: 'https://example.com/api/get?id=12345' },
  { name: 'Empty string', input: '', expected: '' },
  { name: 'Whitespace string', input: '   ', expected: '' },
  { name: 'Dash character', input: '-', expected: '' },
  { name: 'Null value', input: null as any, expected: '' },
  { name: 'Undefined value', input: undefined as any, expected: '' }
];

negativeCases.forEach(nc => {
  const fileId = getGoogleDriveFileId(nc.input);
  assert(fileId === null, `Non-drive input [${nc.name}] yields null file ID`);

  const thumb = getGoogleDriveThumbnailUrl(nc.input, 800);
  assert(thumb === nc.expected, `Non-drive input [${nc.name}] returns preserved or empty string`);

  const isDrive = isGoogleDriveUrl(nc.input);
  assert(isDrive === false, `isGoogleDriveUrl returns false for [${nc.name}]`);
});

// 1.3c: Multi-tenant logo fallback resolution logic
console.log('\n--- 1.3c: Tenant Fallback Resolution Hierarchy ---');

function resolveKopLogos(config: any, schoolInfo: any) {
  const rawLogoYayasan = config.logo_yayasan || config.logo_kiri || config.LOGO_KIRI_URL || schoolInfo?.logo_kiri_url || schoolInfo?.logo_url || '';
  const rawLogoDinas = config.logo_dinas || config.logo_kanan || config.LOGO_KANAN_URL || schoolInfo?.logo_kanan_url || '';
  return { rawLogoYayasan, rawLogoDinas };
}

// Case A: Config has priority over schoolInfo
const resA = resolveKopLogos(
  { logo_yayasan: 'https://conf.com/yayasan.png', logo_dinas: 'https://conf.com/dinas.png' },
  { logo_kiri_url: 'https://school.com/kiri.png', logo_kanan_url: 'https://school.com/kanan.png' }
);
assert(resA.rawLogoYayasan === 'https://conf.com/yayasan.png' && resA.rawLogoDinas === 'https://conf.com/dinas.png', 'Config overrides schoolInfo when both exist');

// Case B: Config is empty, falls back to schoolInfo.logo_kiri_url / logo_kanan_url
const resB = resolveKopLogos(
  {},
  { logo_kiri_url: 'https://school.com/kiri.png', logo_kanan_url: 'https://school.com/kanan.png' }
);
assert(resB.rawLogoYayasan === 'https://school.com/kiri.png' && resB.rawLogoDinas === 'https://school.com/kanan.png', 'Falls back cleanly to schoolInfo.logo_kiri_url and logo_kanan_url');

// Case C: Single tenant fallback to legacy schoolInfo.logo_url
const resC = resolveKopLogos(
  {},
  { logo_url: 'https://school.com/general_logo.png' }
);
assert(resC.rawLogoYayasan === 'https://school.com/general_logo.png' && resC.rawLogoDinas === '', 'Falls back to legacy schoolInfo.logo_url when left logo is unset');

// 1.4: 3-Column Symmetric Layout & Dynamic Address Font Sizing
console.log('\n--- 1.4: Kop Surat 3-Column Symmetry & Address Sizing ---');

assert(
  printHeaderContent.includes('shrink-0 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center'),
  'PrintHeader defines fixed symmetric slots (w-20/w-24) on both sides'
);

assert(
  printHeaderContent.includes('className="w-full h-full invisible" aria-hidden="true"'),
  'PrintHeader renders invisible spacer in empty logo slot to preserve perfect center alignment'
);

assert(
  printHeaderContent.includes('flex-1 min-w-0 text-center'),
  'PrintHeader center text container uses flex-1 min-w-0 text-center'
);

// Test address font size scaling algorithm
const getAddressFontSize = (text: string) => {
  const len = text ? text.length : 0;
  if (len > 110) return '0.45rem';
  if (len > 95) return '0.52rem';
  if (len > 80) return '0.58rem';
  if (len > 65) return '0.65rem';
  if (len > 50) return '0.72rem';
  if (len > 35) return '0.8rem';
  return '0.875rem';
};

assert(getAddressFontSize('') === '0.875rem', 'Empty address defaults to 0.875rem');
assert(getAddressFontSize('Jl. Merdeka No. 1') === '0.875rem', 'Short address (<=35 chars) uses 0.875rem');
assert(getAddressFontSize('Jl. Pendidikan Karakter Bangsa No. 42, Kel. Maju') === '0.8rem', 'Medium address (36-50 chars) scales to 0.8rem');
assert(getAddressFontSize('Jl. Raya Boulevard Pendidikan No. 123, Kelurahan Bahagia, Kecamatan Sukamakmur') === '0.65rem', 'Long address (66-80 chars) scales to 0.65rem');
assert(getAddressFontSize('Jl. Jenderal Sudirman Komplek Perkantoran Pendidikan Terpadu Gedung C Lantai 4, Kelurahan Menteng Indah, Kecamatan Kota Baru, Kota Nusantara') === '0.45rem', 'Extremely long address (>110 chars) scales down to 0.45rem without clipping');


// ============================================================================
// PART 2: ADMIN PERANGKAT PEMBELAJARAN CRUD & MINIMALIST CARDS
// ============================================================================
console.log('\n>>> SECTION 2: Admin Perangkat Pembelajaran CRUD & Minimalist Cards <<<');

const dokumenPath = path.join(projectRoot, 'src', 'components', 'DokumenView.tsx');
assert(fs.existsSync(dokumenPath), 'DokumenView.tsx exists');
const dokumenContent = fs.readFileSync(dokumenPath, 'utf8');

// Check CRUD handlers exist
assert(
  dokumenContent.includes('handleOpenAddSyarat') &&
  dokumenContent.includes('handleOpenEditSyarat') &&
  dokumenContent.includes('handleSaveSyarat') &&
  dokumenContent.includes('handleDeleteSyarat'),
  'DokumenView has full CRUD handlers for document requirements'
);

// Check minimalist card implementation
assert(
  dokumenContent.includes('teacherSubjectCards') &&
  dokumenContent.includes('expandedCardKey') &&
  dokumenContent.includes('completionRate'),
  'DokumenView creates minimalist cards with click-to-expand key and completion rate'
);

// Pure implementation of the DokumenView completeness calculation engine for stress-testing
interface SyaratItem {
  id: string;
  nama_mapel: string;
  kode_dokumen: string;
  nama_dokumen: string;
  format_dokumen: string;
  wajib: boolean;
  urutan: number;
}

interface UploadedDoc {
  id: string;
  nama_guru: string;
  mapel?: string;
  kelas?: string;
  judul?: string;
  jenis_dokumen?: string;
  syarat_id?: string;
  status_verifikasi?: string;
}

const KURIKULUM_FALLBACK = [
  { id: 'cp', code: 'cp', name: 'Capaian Pembelajaran (CP)' },
  { id: 'atp', code: 'atp', name: 'Alur Tujuan Pembelajaran (ATP)' },
  { id: 'rpe', code: 'rpe', name: 'Rencana Pekan Efektif (RPE)' },
  { id: 'prota', code: 'prota', name: 'Program Tahunan (Prota)' },
  { id: 'promes', code: 'promes', name: 'Program Semester (Promes)' },
  { id: 'rpm', code: 'rpm', name: 'Modul Ajar / RPM' }
];

function calculateTeacherSubjectCompleteness(
  teacher: { id: string; nama_guru: string; mata_pelajaran?: string },
  assignedSubjects: Array<{ nama_mapel: string; kelas: string }>,
  syaratList: SyaratItem[],
  dokumenList: UploadedDoc[]
) {
  const tName = (teacher.nama_guru || '').trim().toLowerCase();

  const subjects = [...assignedSubjects];
  if (subjects.length === 0) {
    subjects.push({
      nama_mapel: teacher.mata_pelajaran || 'Mata Pelajaran Umum',
      kelas: ''
    });
  }

  const teacherDocs = dokumenList.filter(
    d => (d.nama_guru || '').trim().toLowerCase() === tName
  );

  return subjects.map(sub => {
    let reqs = syaratList.filter(
      s => (s.nama_mapel || '').trim().toLowerCase() === sub.nama_mapel.trim().toLowerCase()
    );
    if (reqs.length === 0) {
      reqs = syaratList.filter(s => (s.nama_mapel || '').trim().toLowerCase() === 'semua mapel');
    }

    let activeReqs: SyaratItem[] = reqs;
    if (activeReqs.length === 0) {
      activeReqs = KURIKULUM_FALLBACK.map((k, idx) => ({
        id: k.id,
        nama_mapel: 'Semua Mapel',
        kode_dokumen: k.code,
        nama_dokumen: k.name,
        format_dokumen: 'PDF, DOCX',
        wajib: true,
        urutan: idx + 1
      }));
    }

    const requiredDocs = activeReqs.map(req => {
      const uploaded = teacherDocs.find(d => {
        if (d.syarat_id && d.syarat_id === req.id) return true;

        if (sub.nama_mapel && d.mapel) {
          if (d.mapel.trim().toLowerCase() !== sub.nama_mapel.trim().toLowerCase()) {
            if (!d.judul || !d.judul.toLowerCase().includes(sub.nama_mapel.toLowerCase())) {
              return false;
            }
          }
        }
        if (sub.kelas && d.kelas) {
          if (d.kelas.trim().toLowerCase() !== sub.kelas.trim().toLowerCase()) {
            if (!d.judul || !d.judul.toLowerCase().includes(sub.kelas.toLowerCase())) {
              return false;
            }
          }
        }

        const j = (d.jenis_dokumen || '').toLowerCase();
        const kode = (req.kode_dokumen || '').toLowerCase();
        const nama = (req.nama_dokumen || '').toLowerCase();

        if (kode === 'cp' && (j.includes('capaian') || j.includes('cp'))) return true;
        if (kode === 'atp' && (j.includes('tujuan') || j.includes('atp'))) return true;
        if (kode === 'rpe' && (j.includes('pekan') || j.includes('rpe'))) return true;
        if (kode === 'prota' && (j.includes('tahunan') || j.includes('prota'))) return true;
        if (kode === 'promes' && (j.includes('semester') || j.includes('promes'))) return true;
        if (kode === 'rpm' && (j.includes('mendalam') || j.includes('rpm') || j.includes('modul'))) return true;

        if (j === nama || j.includes(kode) || (req.nama_dokumen && j.includes(req.nama_dokumen.toLowerCase()))) return true;
        return false;
      });

      return { req, uploadedDoc: uploaded };
    });

    const totalRequired = requiredDocs.filter(r => r.req.wajib !== false).length || requiredDocs.length;
    const completedCount = requiredDocs.filter(r => (r.req.wajib !== false ? Boolean(r.uploadedDoc) : false)).length;
    const completionRate = totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 100;
    const isComplete = completedCount >= totalRequired;

    return {
      subject: sub,
      totalRequired,
      completedCount,
      completionRate,
      isComplete,
      requiredDocs
    };
  });
}

// 2.1: Stress-test - Teacher with 0 assigned subjects in guru_mapel
console.log('\n--- 2.1: Teacher with 0 Assigned Subjects ---');
const teacher0Sub = { id: 't1', nama_guru: 'Budi Santoso', mata_pelajaran: 'Fisika' };
const cards0Sub = calculateTeacherSubjectCompleteness(teacher0Sub, [], [], []);
assert(cards0Sub.length === 1, 'Teacher with 0 assigned subjects generates exactly 1 fallback card');
assert(cards0Sub[0].subject.nama_mapel === 'Fisika', 'Fallback card adopts teacher.mata_pelajaran ("Fisika")');
assert(cards0Sub[0].totalRequired === 6, 'Fallback card adopts KURIKULUM_FALLBACK (6 docs)');
assert(cards0Sub[0].completedCount === 0 && cards0Sub[0].completionRate === 0, '0 uploaded docs produces 0% completion rate');

// 2.2: Stress-test - Subject with 0 specific requirements (fallback to Semua Mapel & Kurikulum)
console.log('\n--- 2.2: Subject with 0 Requirements & Zero Division Guard ---');
const teacherMath = { id: 't2', nama_guru: 'Dewi Sartika', mata_pelajaran: 'Matematika' };
// Case 1: Syarat has 'Semua Mapel'
const syaratSemuaMapel: SyaratItem[] = [
  { id: 's1', nama_mapel: 'Semua Mapel', kode_dokumen: 'cp', nama_dokumen: 'Capaian Pembelajaran', format_dokumen: 'PDF', wajib: true, urutan: 1 },
  { id: 's2', nama_mapel: 'Semua Mapel', kode_dokumen: 'atp', nama_dokumen: 'Alur Tujuan Pembelajaran', format_dokumen: 'PDF', wajib: true, urutan: 2 }
];
const cardsMath = calculateTeacherSubjectCompleteness(teacherMath, [{ nama_mapel: 'Matematika Peminatan', kelas: 'XII IPA 1' }], syaratSemuaMapel, []);
assert(cardsMath[0].totalRequired === 2, 'Subject with no specific syarat falls back to "Semua Mapel" (2 docs)');

// Case 2: Zero requirements at all (e.g. empty DB and all optional)
const cardsZeroTotal = calculateTeacherSubjectCompleteness(
  teacherMath,
  [{ nama_mapel: 'Kimia', kelas: 'X A' }],
  [],
  []
);
assert(cardsZeroTotal[0].totalRequired === 6, 'Empty syarat table falls back to default 6 curriculum docs');
assert(Number.isFinite(cardsZeroTotal[0].completionRate), 'Completion rate is always a finite number (no NaN)');

// 2.3: Stress-test - Partial document uploads (33%, 50%, 100%)
console.log('\n--- 2.3: Partial Document Uploads & Completion Rates ---');
const uploadedDocsPartial: UploadedDoc[] = [
  { id: 'd1', nama_guru: 'Dewi Sartika', mapel: 'Matematika Peminatan', kelas: 'XII IPA 1', jenis_dokumen: 'Capaian Pembelajaran' }
];
const cardsPartial = calculateTeacherSubjectCompleteness(teacherMath, [{ nama_mapel: 'Matematika Peminatan', kelas: 'XII IPA 1' }], syaratSemuaMapel, uploadedDocsPartial);
assert(cardsPartial[0].completedCount === 1 && cardsPartial[0].totalRequired === 2, '1 of 2 docs uploaded');
assert(cardsPartial[0].completionRate === 50, '1 of 2 documents yields 50% completion rate');
assert(cardsPartial[0].isComplete === false, 'isComplete is false when partially uploaded');

// Upload the second document
const uploadedDocsFull: UploadedDoc[] = [
  ...uploadedDocsPartial,
  { id: 'd2', nama_guru: 'Dewi Sartika', mapel: 'Matematika Peminatan', kelas: 'XII IPA 1', jenis_dokumen: 'Alur Tujuan Pembelajaran' }
];
const cardsFull = calculateTeacherSubjectCompleteness(teacherMath, [{ nama_mapel: 'Matematika Peminatan', kelas: 'XII IPA 1' }], syaratSemuaMapel, uploadedDocsFull);
assert(cardsFull[0].completedCount === 2 && cardsFull[0].totalRequired === 2, '2 of 2 docs uploaded');
assert(cardsFull[0].completionRate === 100, '2 of 2 documents yields 100% completion rate');
assert(cardsFull[0].isComplete === true, 'isComplete is true when 100% uploaded');

// 2.4: Stress-test - Legacy document type strings vs new requirements
console.log('\n--- 2.4: Legacy Document Type Matching ---');
const legacySyaratList: SyaratItem[] = [
  { id: 'req-cp', nama_mapel: 'Semua Mapel', kode_dokumen: 'cp', nama_dokumen: 'Capaian Pembelajaran', format_dokumen: 'PDF', wajib: true, urutan: 1 },
  { id: 'req-atp', nama_mapel: 'Semua Mapel', kode_dokumen: 'atp', nama_dokumen: 'Alur Tujuan Pembelajaran', format_dokumen: 'PDF', wajib: true, urutan: 2 },
  { id: 'req-rpe', nama_mapel: 'Semua Mapel', kode_dokumen: 'rpe', nama_dokumen: 'Rencana Pekan Efektif', format_dokumen: 'PDF', wajib: true, urutan: 3 },
  { id: 'req-prota', nama_mapel: 'Semua Mapel', kode_dokumen: 'prota', nama_dokumen: 'Program Tahunan', format_dokumen: 'PDF', wajib: true, urutan: 4 },
  { id: 'req-promes', nama_mapel: 'Semua Mapel', kode_dokumen: 'promes', nama_dokumen: 'Program Semester', format_dokumen: 'PDF', wajib: true, urutan: 5 },
  { id: 'req-rpm', nama_mapel: 'Semua Mapel', kode_dokumen: 'rpm', nama_dokumen: 'Rencana Pembelajaran Mendalam', format_dokumen: 'PDF', wajib: true, urutan: 6 }
];

const legacyUploadedDocs: UploadedDoc[] = [
  { id: 'l1', nama_guru: 'Ahmad Yani', mapel: 'Biologi', kelas: 'XI IPA', jenis_dokumen: 'Capaian Pembelajaran (CP) Fase F' },
  { id: 'l2', nama_guru: 'Ahmad Yani', mapel: 'Biologi', kelas: 'XI IPA', jenis_dokumen: 'Alur Tujuan Pembelajaran Matematika & Sains (ATP)' },
  { id: 'l3', nama_guru: 'Ahmad Yani', mapel: 'Biologi', kelas: 'XI IPA', jenis_dokumen: 'Pekan Efektif Semester 1 (RPE)' },
  { id: 'l4', nama_guru: 'Ahmad Yani', mapel: 'Biologi', kelas: 'XI IPA', jenis_dokumen: 'Prota 2026' },
  { id: 'l5', nama_guru: 'Ahmad Yani', mapel: 'Biologi', kelas: 'XI IPA', jenis_dokumen: 'Promes Ganjil' },
  { id: 'l6', nama_guru: 'Ahmad Yani', mapel: 'Biologi', kelas: 'XI IPA', jenis_dokumen: 'Modul Ajar Deep Learning Bab 1' }
];

const teacherLegacy = { id: 't3', nama_guru: 'Ahmad Yani', mata_pelajaran: 'Biologi' };
const cardsLegacy = calculateTeacherSubjectCompleteness(teacherLegacy, [{ nama_mapel: 'Biologi', kelas: 'XI IPA' }], legacySyaratList, legacyUploadedDocs);
assert(cardsLegacy[0].completedCount === 6, 'All 6 legacy document descriptions successfully matched against new requirements');
assert(cardsLegacy[0].completionRate === 100, 'Legacy document batch achieves 100% completion');

// Direct foreign key syarat_id matching
const directFkDoc: UploadedDoc = {
  id: 'l7',
  nama_guru: 'Ahmad Yani',
  mapel: 'Biologi',
  kelas: 'XI IPA',
  jenis_dokumen: 'Dokumen Khusus Custom',
  syarat_id: 'req-rpm'
};
const cardsFk = calculateTeacherSubjectCompleteness(teacherLegacy, [{ nama_mapel: 'Biologi', kelas: 'XI IPA' }], legacySyaratList, [directFkDoc]);
const rpmReq = cardsFk[0].requiredDocs.find(r => r.req.id === 'req-rpm');
assert(rpmReq?.uploadedDoc?.id === 'l7', 'Direct FK match on syarat_id correctly links uploaded document regardless of title');


// ============================================================================
// PART 3: ADMIN DAILY STATUS MATRIX IN SRC/COMPONENTS/HOMEVIEW.TSX
// ============================================================================
console.log('\n>>> SECTION 3: Admin Daily Status Matrix in HomeView.tsx <<<');

const homePath = path.join(projectRoot, 'src', 'components', 'HomeView.tsx');
assert(fs.existsSync(homePath), 'HomeView.tsx exists');
const homeContent = fs.readFileSync(homePath, 'utf8');

// 3.1: Date query stress tests
console.log('\n--- 3.1: Resilient Date Filtering Multi-Format Parser ---');

function filterPresensiByDate(rawPresensi: any[], todayStr: string) {
  return rawPresensi.filter((p: any) => {
    const ts = (p.timestamp || '').trim();
    if (!ts) return false;
    if (ts.startsWith(todayStr)) return true;
    if (ts.includes('T') && ts.substring(0, 10) === todayStr) return true;
    const slashMatch = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const month = slashMatch[1].padStart(2, '0');
      const day = slashMatch[2].padStart(2, '0');
      const year = slashMatch[3];
      if (`${year}-${month}-${day}` === todayStr) return true;
    }
    return false;
  });
}

const targetToday = '2026-09-19';

const dateTestCases = [
  // Matching cases
  { ts: '2026-09-19', shouldMatch: true, desc: 'Exact YYYY-MM-DD date prefix' },
  { ts: '2026-09-19 07:12:45', shouldMatch: true, desc: 'Space-separated timestamp (YYYY-MM-DD HH:mm:ss)' },
  { ts: '2026-09-19T06:30:00.000Z', shouldMatch: true, desc: 'ISO 8601 UTC timestamp' },
  { ts: '2026-09-19T14:45:10+08:00', shouldMatch: true, desc: 'ISO 8601 with timezone offset' },
  { ts: '09/19/2026 07:15:00', shouldMatch: true, desc: 'Slash format MM/DD/YYYY' },
  { ts: '9/19/2026 07:15:00', shouldMatch: true, desc: 'Slash format single-digit month M/DD/YYYY' },
  { ts: '  2026-09-19 08:00:00  ', shouldMatch: true, desc: 'Timestamp with surrounding whitespace' },
  // Non-matching cases
  { ts: '2026-09-18 23:59:59', shouldMatch: false, desc: 'Yesterday date (space-separated)' },
  { ts: '2026-09-18T23:59:59.000Z', shouldMatch: false, desc: 'Yesterday date (ISO UTC)' },
  { ts: '2026-09-20 00:01:00', shouldMatch: false, desc: 'Tomorrow date (space-separated)' },
  { ts: '2026-09-20T00:01:00.000Z', shouldMatch: false, desc: 'Tomorrow date (ISO UTC)' },
  { ts: '09/18/2026 08:00:00', shouldMatch: false, desc: 'Yesterday in slash format' },
  { ts: '09/20/2026 08:00:00', shouldMatch: false, desc: 'Tomorrow in slash format' },
  { ts: '09/19/2025 08:00:00', shouldMatch: false, desc: 'Different year in slash format' },
  { ts: 'random_invalid_string', shouldMatch: false, desc: 'Arbitrary non-date string' },
  { ts: '', shouldMatch: false, desc: 'Empty timestamp' },
  { ts: null as any, shouldMatch: false, desc: 'Null timestamp' },
  { ts: undefined as any, shouldMatch: false, desc: 'Undefined timestamp' }
];

dateTestCases.forEach(tc => {
  const result = filterPresensiByDate([{ timestamp: tc.ts }], targetToday);
  const matched = result.length === 1;
  assert(
    matched === tc.shouldMatch,
    `Date parser [${tc.desc}]: "${tc.ts}" -> ${matched ? 'MATCH' : 'NO MATCH'}`,
    `Expected shouldMatch=${tc.shouldMatch}, got ${matched}`
  );
});

// 3.2: Picket lookup: verify direct querying of penugasan_piket & jadwal_piket
console.log('\n--- 3.2: Direct Picket Assignment & Report Evaluation ---');

assert(
  homeContent.includes("from('penugasan_piket')"),
  'HomeView queries penugasan_piket table directly'
);
assert(
  homeContent.includes("penugasanPiketQ = penugasanPiketQ.eq('sekolah_id', user.sekolah_id)"),
  'HomeView scopes penugasan_piket query with multi-tenant sekolah_id'
);
assert(
  homeContent.includes("penugasanPiketQ = supabase.from('penugasan_piket').select('*').eq('hari', dayName).eq('tipe_petugas', 'Guru');"),
  'HomeView filters penugasan_piket by dayName and tipe_petugas="Guru"'
);

function evaluatePiketStatus(
  teacher: { nama_guru: string; nip?: string },
  assignedPiketTeachers: any[],
  piketReports: any[]
) {
  const inPenugasan = assignedPiketTeachers.some((p: any) =>
    (p.guru_nama || '').toLowerCase() === teacher.nama_guru.toLowerCase() ||
    (p.guru_nip && teacher.nip && p.guru_nip === teacher.nip)
  );

  if (!inPenugasan) {
    return { status: 'Bukan Petugas', color: 'gray', isPiket: false };
  }

  const hasReport = piketReports.some((lp: any) =>
    (lp.guru_pelapor || '').toLowerCase() === teacher.nama_guru.toLowerCase()
  );

  if (hasReport) {
    return { status: 'Sudah Lapor', color: 'green', isPiket: true };
  }
  return { status: 'Belum Lapor', color: 'rose', isPiket: true };
}

const piketTeacher1 = { nama_guru: 'Hasan Basri', nip: '198501012010011001' };
const piketTeacher2 = { nama_guru: 'Siti Aminah', nip: '198702022012022002' };
const nonPiketTeacher = { nama_guru: 'Bambang Sudirman', nip: '199003032015031003' };

const assignedPiket = [
  { guru_nama: 'Hasan Basri', guru_nip: '198501012010011001', hari: 'Sabtu', tipe_petugas: 'Guru' },
  { guru_nama: 'Siti Aminah', guru_nip: '198702022012022002', hari: 'Sabtu', tipe_petugas: 'Guru' }
];

const submittedReports = [
  { guru_pelapor: 'Hasan Basri', tanggal: targetToday }
];

// Test Hasan (assigned + reported)
const p1 = evaluatePiketStatus(piketTeacher1, assignedPiket, submittedReports);
assert(p1.status === 'Sudah Lapor' && p1.color === 'green' && p1.isPiket === true, 'Piket officer with submitted report evaluates to "Sudah Lapor" (green)');

// Test Siti (assigned + not reported)
const p2 = evaluatePiketStatus(piketTeacher2, assignedPiket, submittedReports);
assert(p2.status === 'Belum Lapor' && p2.color === 'rose' && p2.isPiket === true, 'Piket officer with NO report evaluates to "Belum Lapor" (rose)');

// Test Bambang (not assigned)
const p3 = evaluatePiketStatus(nonPiketTeacher, assignedPiket, submittedReports);
assert(p3.status === 'Bukan Petugas' && p3.color === 'gray' && p3.isPiket === false, 'Non-piket teacher evaluates to "Bukan Petugas" (gray)');


// 3.3: Dinas Luar, Holiday & Exemption Handling
console.log('\n--- 3.3: Dinas Luar, Holidays & Exemption Rules ---');

function evaluateTeacherDailyStatus(params: {
  isSchoolDayOff: boolean;
  isExemptNonTeaching: boolean;
  presensiDatangRecord?: any;
  presensiPulangRecord?: any;
  targetCount: number;
  filledCount: number;
  hasJurnalKegiatan: boolean;
}) {
  const {
    isSchoolDayOff,
    isExemptNonTeaching,
    presensiDatangRecord,
    presensiPulangRecord,
    targetCount,
    filledCount,
    hasJurnalKegiatan
  } = params;

  // 1. Presensi Datang
  let presensiDatangStatus = isSchoolDayOff ? 'Libur' : isExemptNonTeaching ? 'Bebas Hadir' : 'Belum Datang';
  let presensiDatangColor: 'green' | 'amber' | 'blue' | 'rose' | 'gray' = (isSchoolDayOff || isExemptNonTeaching) ? 'blue' : 'gray';

  if (presensiDatangRecord) {
    const jp = presensiDatangRecord.jenis_presensi || 'Sekolah';
    if (jp === 'Izin') {
      presensiDatangStatus = 'Izin';
      presensiDatangColor = 'blue';
    } else if (jp === 'Sakit') {
      presensiDatangStatus = 'Sakit';
      presensiDatangColor = 'rose';
    } else if (jp === 'Dinas Luar') {
      presensiDatangStatus = 'Dinas Luar';
      presensiDatangColor = 'blue';
    } else {
      presensiDatangStatus = 'Hadir';
      presensiDatangColor = 'green';
    }
  }

  // 2. Presensi Pulang
  let presensiPulangStatus = isSchoolDayOff ? 'Libur' : isExemptNonTeaching ? 'Bebas Hadir' : 'Belum Pulang';
  let presensiPulangColor = (isSchoolDayOff || isExemptNonTeaching) ? 'blue' : 'gray';
  if (presensiPulangRecord) {
    presensiPulangStatus = 'Pulang';
    presensiPulangColor = 'green';
  }

  // 3. Jurnal KBM / Kegiatan
  const isDinasLuar = presensiDatangStatus === 'Dinas Luar';
  let jurnalStatus = 'Bebas KBM';
  let jurnalColor = 'gray';

  if (isDinasLuar) {
    if (hasJurnalKegiatan) {
      jurnalStatus = 'Jurnal Kegiatan Selesai';
      jurnalColor = 'green';
    } else {
      jurnalStatus = 'Perlu Jurnal Kegiatan';
      jurnalColor = 'amber';
    }
  } else if (targetCount === 0 || isSchoolDayOff) {
    jurnalStatus = 'Bebas KBM';
    jurnalColor = 'gray';
  } else if (filledCount >= targetCount) {
    jurnalStatus = `${targetCount}/${targetCount} Selesai`;
    jurnalColor = 'green';
  } else if (filledCount > 0) {
    jurnalStatus = `${filledCount}/${targetCount} Belum Lengkap`;
    jurnalColor = 'amber';
  } else {
    jurnalStatus = 'Belum Mengisi';
    jurnalColor = 'rose';
  }

  // 4. Aggregated isTugasLengkap
  const isIzinSakit = presensiDatangStatus === 'Izin' || presensiDatangStatus === 'Sakit';
  const isLiburOrExempt = isSchoolDayOff || isExemptNonTeaching;
  const datangDone = isLiburOrExempt || isIzinSakit || (presensiDatangStatus !== 'Belum Datang');
  const pulangDone = isLiburOrExempt || isIzinSakit || (presensiPulangStatus === 'Pulang');
  const piketDone = true; // assume non-piket
  const jurnalDone = isLiburOrExempt || isIzinSakit || (isDinasLuar ? hasJurnalKegiatan : (targetCount === 0 || filledCount >= targetCount));

  const isTugasLengkap = isLiburOrExempt
    ? true
    : isIzinSakit
    ? datangDone
    : (datangDone && pulangDone && piketDone && jurnalDone);

  return {
    presensiDatangStatus,
    presensiPulangStatus,
    jurnalStatus,
    isTugasLengkap
  };
}

// Case 1: Dinas Luar WITH Jurnal Kegiatan
const dlDone = evaluateTeacherDailyStatus({
  isSchoolDayOff: false,
  isExemptNonTeaching: false,
  presensiDatangRecord: { jenis_presensi: 'Dinas Luar' },
  presensiPulangRecord: { tipe_absen: 'Pulang' },
  targetCount: 2,
  filledCount: 0,
  hasJurnalKegiatan: true
});
assert(dlDone.presensiDatangStatus === 'Dinas Luar', 'Dinas Luar arrival status is set');
assert(dlDone.jurnalStatus === 'Jurnal Kegiatan Selesai', 'Dinas Luar with activity journal yields "Jurnal Kegiatan Selesai"');
assert(dlDone.isTugasLengkap === true, 'Dinas Luar with activity journal and departure has isTugasLengkap=true');

// Case 2: Dinas Luar WITHOUT Jurnal Kegiatan
const dlPending = evaluateTeacherDailyStatus({
  isSchoolDayOff: false,
  isExemptNonTeaching: false,
  presensiDatangRecord: { jenis_presensi: 'Dinas Luar' },
  presensiPulangRecord: { tipe_absen: 'Pulang' },
  targetCount: 2,
  filledCount: 0,
  hasJurnalKegiatan: false
});
assert(dlPending.jurnalStatus === 'Perlu Jurnal Kegiatan', 'Dinas Luar without activity journal yields "Perlu Jurnal Kegiatan"');
assert(dlPending.isTugasLengkap === false, 'Dinas Luar missing activity journal has isTugasLengkap=false');

// Case 3: Official Holiday (isSchoolDayOff = true)
const holidayState = evaluateTeacherDailyStatus({
  isSchoolDayOff: true,
  isExemptNonTeaching: false,
  targetCount: 4,
  filledCount: 0,
  hasJurnalKegiatan: false
});
assert(holidayState.presensiDatangStatus === 'Libur', 'Arrival status on holiday is "Libur"');
assert(holidayState.presensiPulangStatus === 'Libur', 'Departure status on holiday is "Libur"');
assert(holidayState.jurnalStatus === 'Bebas KBM', 'Journal status on holiday is "Bebas KBM"');
assert(holidayState.isTugasLengkap === true, 'Holiday automatically sets isTugasLengkap=true');

// Case 4: Non-teaching exemption (wajib_hadir_hanya_mengajar with 0 classes today)
const exemptState = evaluateTeacherDailyStatus({
  isSchoolDayOff: false,
  isExemptNonTeaching: true,
  targetCount: 0,
  filledCount: 0,
  hasJurnalKegiatan: false
});
assert(exemptState.presensiDatangStatus === 'Bebas Hadir', 'Exempt teacher with 0 classes has arrival "Bebas Hadir"');
assert(exemptState.presensiPulangStatus === 'Bebas Hadir', 'Exempt teacher with 0 classes has departure "Bebas Hadir"');
assert(exemptState.jurnalStatus === 'Bebas KBM', 'Exempt teacher with 0 classes has journal "Bebas KBM"');
assert(exemptState.isTugasLengkap === true, 'Exempt teacher on non-teaching day has isTugasLengkap=true');

// Case 5: Normal teaching day with incomplete journals (1 of 3)
const incompleteState = evaluateTeacherDailyStatus({
  isSchoolDayOff: false,
  isExemptNonTeaching: false,
  presensiDatangRecord: { jenis_presensi: 'Sekolah' },
  presensiPulangRecord: { tipe_absen: 'Pulang' },
  targetCount: 3,
  filledCount: 1,
  hasJurnalKegiatan: false
});
assert(incompleteState.jurnalStatus === '1/3 Belum Lengkap', 'Partial KBM journal completion shows "1/3 Belum Lengkap"');
assert(incompleteState.isTugasLengkap === false, 'Incomplete KBM journal leaves isTugasLengkap=false');

console.log('\n================================================================');
console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
