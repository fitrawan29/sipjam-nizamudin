import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;
const findings: { category: string; description: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'; detail?: string }[] = [];

function assert(condition: boolean, label: string, detail?: string, severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH') {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${label}`);
    if (detail) console.error(`   ${detail}`);
    failed++;
    findings.push({ category: 'Assertion Failure', description: label, detail, severity });
  }
}

// Dynamically extract formatAbsensi from src/components/RekapJurnalView.tsx
const root = path.resolve(__dirname, '..');
const rjPath = path.join(root, 'src', 'components', 'RekapJurnalView.tsx');
const gjPath = path.join(root, 'src', 'components', 'GuruJurnal.tsx');

const rjCode = fs.readFileSync(rjPath, 'utf8');
const gjCode = fs.readFileSync(gjPath, 'utf8');

const formatAbsensiMatch = rjCode.match(/function formatAbsensi\([\s\S]*?\n  \}/);
if (!formatAbsensiMatch) {
  throw new Error('Could not find formatAbsensi in RekapJurnalView.tsx');
}

const cleanedFunc = formatAbsensiMatch[0]
  .replace(/rawAbsensi\?: string/, 'rawAbsensi')
  .replace(/detailAbsen\?: string/, 'detailAbsen')
  .replace(/kehadiranMurid\?: string/, 'kehadiranMurid')
  .replace(/\): string \{/, ') {')
  .replace(/\(v: any\)/, '(v)');

const formatAbsensi: (rawAbsensi?: string, detailAbsen?: string, kehadiranMurid?: string) => string = new Function(
  'rawAbsensi',
  'detailAbsen',
  'kehadiranMurid',
  cleanedFunc.slice(cleanedFunc.indexOf('{') + 1, -1)
) as any;

// Extract calculateKehadiranSummary from src/components/GuruJurnal.tsx
const calcMatch = gjCode.match(/const calculateKehadiranSummary\s*=\s*\([\s\S]*?\n  \};/);
if (!calcMatch) {
  throw new Error('Could not find calculateKehadiranSummary in GuruJurnal.tsx');
}

const cleanedCalcFunc = calcMatch[0]
  .replace(/abs:\s*Record<string,\s*string>/, 'abs')
  .replace(/stList:\s*any\[\]/, 'stList')
  .replace(/\):\s*string\s*=>\s*\{/, ') => {');

const calculateKehadiranSummary: (abs: Record<string, string>, stList: any[]) => string = new Function(
  'return ' + cleanedCalcFunc.replace(/^const calculateKehadiranSummary\s*=\s*/, '')
)() as any;

async function runAdversarialSuite() {
  console.log('========================================================================');
  console.log('ADVERSARIAL STRESS TEST SUITE: JURNAL KBM & REKAP (R1, R2, R3)');
  console.log('Empirical verification of edge cases, weird inputs & robustness');
  console.log('========================================================================\n');

  // =========================================================================
  // SUITE 1: ATTENDANCE NORMALIZATION (R2) ACROSS WEIRD & ADVERSARIAL INPUTS
  // =========================================================================
  console.log('--- SUITE 1: Attendance Normalization (R2) Across Weird Inputs ---');

  // 1.1 Nil / Empty inputs
  assert(formatAbsensi() === 'Total murid: 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0',
    'formatAbsensi() with no arguments returns zeroed summary');
  assert(formatAbsensi('', '', '') === 'Total murid: 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0',
    'formatAbsensi("", "", "") returns zeroed summary');
  assert(formatAbsensi('   ', '   ', '   ') === 'Total murid: 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0',
    'formatAbsensi with whitespace-only strings returns zeroed summary');
  assert(formatAbsensi(null as any, null as any, null as any) === 'Total murid: 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0',
    'formatAbsensi with null arguments returns zeroed summary');

  // 1.2 Exact Target Format Passthrough
  const exactSample = 'Total murid: 32, Hadir: 30, Izin: 1, Sakit: 1, Alpa: 0';
  assert(formatAbsensi('', '', exactSample) === exactSample,
    'Exact format passes through unchanged');
  assert(formatAbsensi('', '', 'Total murid: 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0') === 'Total murid: 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0',
    'Zeroed exact format passes through unchanged');
  assert(formatAbsensi('', '', 'total murid: 25, hadir: 25, izin: 0, sakit: 0, alpa: 0') === 'total murid: 25, hadir: 25, izin: 0, sakit: 0, alpa: 0',
    'Case-insensitive exact format accepted');
  assert(formatAbsensi('', '', '  Total murid: 10, Hadir: 10, Izin: 0, Sakit: 0, Alpa: 0  ') === 'Total murid: 10, Hadir: 10, Izin: 0, Sakit: 0, Alpa: 0',
    'Exact format with surrounding whitespace is trimmed properly');

  // 1.3 Alternative String Formats & Historical Records in kehadiranMurid
  assert(formatAbsensi('', '', 'Semua Hadir (36 siswa)') === 'Total murid: 36, Hadir: 36, Izin: 0, Sakit: 0, Alpa: 0',
    '"Semua Hadir (36 siswa)" converts to standardized format');
  assert(formatAbsensi('', '', 'semua hadir (0 siswa)') === 'Total murid: 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0',
    '"semua hadir (0 siswa)" converts to standardized format with 0 total');

  // CRITICAL CHALLENGE 1: Legacy order (Sakit before Izin)
  const legacyOrderInput = 'Total murid: 30, Hadir: 28, Sakit: 1, Izin: 1, Alpa: 0';
  const legacyOrderResult = formatAbsensi('', '', legacyOrderInput);
  assert(
    legacyOrderResult === 'Total murid: 30, Hadir: 28, Izin: 1, Sakit: 1, Alpa: 0',
    'Legacy order (Sakit before Izin) reordered to Hadir, Izin, Sakit, Alpa',
    `Input: "${legacyOrderInput}" -> Output: "${legacyOrderResult}" (EXPECTED: "Total murid: 30, Hadir: 28, Izin: 1, Sakit: 1, Alpa: 0")`,
    'CRITICAL'
  );

  // CRITICAL CHALLENGE 2: Missing "Total murid" prefix with standard colon-space
  const noTotalPrefixInput = 'Hadir: 28, Izin: 1, Sakit: 1, Alpa: 0';
  const noTotalPrefixResult = formatAbsensi('', '', noTotalPrefixInput);
  assert(
    noTotalPrefixResult === 'Total murid: 30, Hadir: 28, Izin: 1, Sakit: 1, Alpa: 0',
    'Missing "Total murid" prefix recalculated accurately (sum = 30)',
    `Input: "${noTotalPrefixInput}" -> Output: "${noTotalPrefixResult}"`,
    'HIGH'
  );

  // CRITICAL CHALLENGE 3: Partial counts with standard colon-space
  const partialHadirInput = 'Hadir: 20';
  const partialHadirResult = formatAbsensi('', '', partialHadirInput);
  assert(
    partialHadirResult === 'Total murid: 20, Hadir: 20, Izin: 0, Sakit: 0, Alpa: 0',
    'Partial attendance (only Hadir: 20) defaults missing fields to 0',
    `Input: "${partialHadirInput}" -> Output: "${partialHadirResult}"`,
    'HIGH'
  );

  const partialAbsentInput = 'Sakit: 3, Alpa: 2';
  const partialAbsentResult = formatAbsensi('', '', partialAbsentInput);
  assert(
    partialAbsentResult === 'Total murid: 5, Hadir: 0, Izin: 0, Sakit: 3, Alpa: 2',
    'Partial attendance (only Sakit: 3, Alpa: 2) defaults Hadir & Izin to 0',
    `Input: "${partialAbsentInput}" -> Output: "${partialAbsentResult}"`,
    'HIGH'
  );

  // 1.4 JSON Variations in rawAbsensi
  const jsonStandard = JSON.stringify({ '001': 'H', '002': 'H', '003': 'I', '004': 'S', '005': 'A' });
  assert(formatAbsensi(jsonStandard) === 'Total murid: 5, Hadir: 2, Izin: 1, Sakit: 1, Alpa: 1',
    'JSON object with standard H, I, S, A codes normalized correctly');

  const jsonFullWords = JSON.stringify({ '001': 'Hadir', '002': 'HADIR', '003': 'Izin', '004': 'Sakit', '005': 'Alpa' });
  assert(formatAbsensi(jsonFullWords) === 'Total murid: 5, Hadir: 2, Izin: 1, Sakit: 1, Alpa: 1',
    'JSON object with full word statuses (Hadir, Izin, Sakit, Alpa) normalized correctly');

  assert(formatAbsensi('{}') === 'Total murid: 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0',
    'Empty JSON object {} returns zeroed summary');

  assert(formatAbsensi('{invalid json: true') === 'Total murid: 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0',
    'Malformed JSON string caught gracefully without throwing');

  // 1.5 Pipe Variations in rawAbsensi
  assert(formatAbsensi('H:25|I:2|S:1|A:0') === 'Total murid: 28, Hadir: 25, Izin: 2, Sakit: 1, Alpa: 0',
    'Standard tight pipe format "H:25|I:2|S:1|A:0" parsed correctly');

  // CHALLENGE 4: Pipe format with spaces around colon (common human entry)
  const pipeWithSpacesInput = 'H: 25 | I: 2 | S: 1 | A: 0';
  const pipeWithSpacesResult = formatAbsensi(pipeWithSpacesInput);
  assert(
    pipeWithSpacesResult === 'Total murid: 28, Hadir: 25, Izin: 2, Sakit: 1, Alpa: 0',
    'Pipe format with spaces around colon "H: 25 | I: 2 | S: 1 | A: 0" parsed correctly',
    `Input: "${pipeWithSpacesInput}" -> Output: "${pipeWithSpacesResult}"`,
    'MEDIUM'
  );

  // 1.6 Detail Absen String Variations
  assert(formatAbsensi(undefined, 'Budi (H), Siti (I), Andi (S), Eka (A)') === 'Total murid: 4, Hadir: 1, Izin: 1, Sakit: 1, Alpa: 1',
    'detailAbsen with student names and tags (H), (I), (S), (A) parsed correctly');
  assert(formatAbsensi(undefined, 'budi (h), siti (s)') === 'Total murid: 2, Hadir: 1, Izin: 0, Sakit: 1, Alpa: 0',
    'detailAbsen with lowercase tags (h), (s) parsed correctly');

  // 1.7 Security / Injection
  assert(formatAbsensi('', '', "'; DROP TABLE jurnal; --") === 'Total murid: 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0',
    'SQL injection string safely ignored and returns default');
  assert(formatAbsensi('', '', '<script>alert(1)</script>') === 'Total murid: 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0',
    'XSS payload string safely ignored and returns default');

  // =========================================================================
  // SUITE 2: calculateKehadiranSummary in GuruJurnal.tsx
  // =========================================================================
  console.log('\n--- SUITE 2: calculateKehadiranSummary in GuruJurnal.tsx ---');

  const mockStudents = [
    { nisn: '001', nama_siswa: 'Ali' },
    { nisn: '002', nama_siswa: 'Budi' },
    { nisn: '003', nama_siswa: 'Cici' },
    { nisn: '004', nama_siswa: 'Dodi' }
  ];

  assert(
    calculateKehadiranSummary({ '001': 'H', '002': 'I', '003': 'S', '004': 'A' }, mockStudents) ===
    'Total murid: 4, Hadir: 1, Izin: 1, Sakit: 1, Alpa: 1',
    'calculateKehadiranSummary produces exact required sequence: Total, Hadir, Izin, Sakit, Alpa'
  );

  assert(
    calculateKehadiranSummary({}, mockStudents) ===
    'Total murid: 4, Hadir: 4, Izin: 0, Sakit: 0, Alpa: 0',
    'Empty absensi map defaults all students to Hadir (H)'
  );

  assert(
    calculateKehadiranSummary({}, []) ===
    'Total murid: 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0',
    'Empty students list produces 0 total'
  );

  assert(
    calculateKehadiranSummary({ '001': 'h', '002': 'i', '003': 's', '004': 'a' }, mockStudents) ===
    'Total murid: 4, Hadir: 1, Izin: 1, Sakit: 1, Alpa: 1',
    'Lowercase status values converted via toUpperCase()'
  );

  // =========================================================================
  // SUITE 3: FORM SUBMISSION BEHAVIOR WITH EMPTY PERTEMUAN / JAM (R1)
  // =========================================================================
  console.log('\n--- SUITE 3: Form Submission Behavior with Empty Pertemuan/Jam (R1) ---');

  assert(!gjCode.includes("showToast('No. Pertemuan Wajib'"), 'GuruJurnal has no submit validation for No. Pertemuan');
  assert(!gjCode.includes('placeholder="Contoh: 1 atau 1-2"'), 'GuruJurnal has no input element for Pertemuan ke in JSX');
  assert(gjCode.includes("pertemuan_ke: tipeJurnal === 'Jurnal KBM' ? (pertemuanKe || '-') : '-'"),
    'GuruJurnal safely defaults pertemuan_ke on submit');
  assert(gjCode.includes("jam_ke: tipeJurnal === 'Jurnal KBM' ? (jamKe || '-') : '-'"),
    'GuruJurnal safely defaults jam_ke on submit');

  // Verify Rekap table does not render Pertemuan or Jam
  const rekapPribadiTable = rjCode.match(/JURNAL PRIBADI GURU[\s\S]*?<table[\s\S]*?<\/table>/);
  assert(!!rekapPribadiTable, 'Extracted JURNAL PRIBADI GURU table');
  if (rekapPribadiTable) {
    const tableCode = rekapPribadiTable[0];
    assert(!tableCode.includes('>Pertemuan<') && !tableCode.includes('>Jam KBM<') && !tableCode.includes('>Jam ke<'),
      'Rekap table does not contain Pertemuan or Jam in any header');
    assert(!tableCode.includes('{j.pertemuan_ke}'), 'Rekap table does not render {j.pertemuan_ke}');
    assert(!tableCode.includes('{j.jam_ke}'), 'Rekap table does not render {j.jam_ke}');
  }

  // =========================================================================
  // SUITE 4: TABLE COLUMN RENDERING & LAYOUT ROBUSTNESS (R3)
  // =========================================================================
  console.log('\n--- SUITE 4: Table Column Rendering & Layout Robustness (R3) ---');

  const headersMatch = rjCode.match(/JURNAL PRIBADI GURU[\s\S]*?<thead>([\s\S]*?)<\/thead>/);
  assert(!!headersMatch, 'Extracted table thead in RekapJurnalView');
  if (headersMatch) {
    const thead = headersMatch[1];
    const thMatches = Array.from(thead.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)).map(m => m[1].trim());
    assert(thMatches.length === 12, `Table has exactly 12 columns (found ${thMatches.length})`);
    assert(thMatches[6] === 'Kelas', 'Column 7 is Kelas');
    assert(thMatches[7] === 'Mata Pelajaran', 'Column 8 is Mata Pelajaran');
    assert(thMatches[8] === 'Absensi Murid (H/I/S/A)', 'Column 9 is Absensi Murid (H/I/S/A)');
  }

  // CSV check
  assert(rjCode.includes("'Kelas',") && rjCode.includes("'Mata Pelajaran',"),
    'RekapJurnalView CSV export has separate headers for Kelas and Mata Pelajaran');

  // Summary
  console.log(`\n========================================================================`);
  console.log(`ADVERSARIAL STRESS TEST SUMMARY`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`CRITICAL/HIGH FINDINGS: ${findings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length}`);
  findings.forEach((f, idx) => {
    console.log(` [${idx + 1}] [${f.severity}] ${f.category}: ${f.description}`);
    if (f.detail) console.log(`     Detail: ${f.detail}`);
  });
  console.log(`========================================================================\n`);

  // Exit 1 if any failure occurs so CI / verification identifies it
  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialSuite();
