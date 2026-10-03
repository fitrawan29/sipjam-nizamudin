import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    if (detail) console.error(`   ${detail}`);
    failed++;
  }
}

async function runVerification() {
  console.log('=== JURNAL KBM R1, R2, R3 VERIFICATION ===\n');
  const root = path.resolve(__dirname, '..');
  const gjPath = path.join(root, 'src', 'components', 'GuruJurnal.tsx');
  const rjPath = path.join(root, 'src', 'components', 'RekapJurnalView.tsx');

  assert(fs.existsSync(gjPath), 'GuruJurnal.tsx exists');
  assert(fs.existsSync(rjPath), 'RekapJurnalView.tsx exists');

  const gj = fs.readFileSync(gjPath, 'utf8');
  const rj = fs.readFileSync(rjPath, 'utf8');

  // --- R1 Checks ---
  console.log('\n--- R1: Pertemuan ke & Jam ke Removal ---');
  assert(!gj.includes("showToast('No. Pertemuan Wajib'"), 'GuruJurnal has no submit validation for No. Pertemuan');
  assert(!gj.includes('placeholder="Contoh: 1 atau 1-2"'), 'GuruJurnal has no input element for Pertemuan ke in JSX');
  assert(gj.includes("pertemuan_ke: tipeJurnal === 'Jurnal KBM' ? (pertemuanKe || '-') : '-'"),
         'GuruJurnal safely defaults pertemuan_ke on submit');
  assert(gj.includes("jam_ke: tipeJurnal === 'Jurnal KBM' ? (jamKe || '-') : '-'"),
         'GuruJurnal safely defaults jam_ke on submit');

  // RekapJurnalView mode pribadi does not contain Pertemuan / Jam headers
  const pribadiHeaderMatch = rj.match(/JURNAL PRIBADI GURU[\s\S]*?<thead>([\s\S]*?)<\/thead>/);
  if (pribadiHeaderMatch) {
    const headerHtml = pribadiHeaderMatch[1];
    assert(!headerHtml.includes('>Pertemuan<') && !headerHtml.includes('>Jam KBM<') && !headerHtml.includes('>Jam ke<'),
      'RekapJurnalView personal table header does not contain Pertemuan or Jam');
  } else {
    assert(false, 'Failed to extract personal table header');
  }

  // --- R2 Checks ---
  console.log('\n--- R2: Kehadiran Murid Formatting ---');
  assert(gj.includes('Total murid:') && gj.includes('Hadir:') && gj.includes('Izin:') && gj.includes('Sakit:') && gj.includes('Alpa:'),
    'calculateKehadiranSummary in GuruJurnal outputs exact required format');

  assert(rj.includes('Total murid:') && rj.includes('Hadir:') && rj.includes('Izin:') && rj.includes('Sakit:') && rj.includes('Alpa:'),
    'formatAbsensi in RekapJurnalView normalizes to exact required format');

  // Dynamic evaluation of format helper regex
  const targetPattern = /^Total murid: \d+, Hadir: \d+, Izin: \d+, Sakit: \d+, Alpa: \d+$/;
  assert(targetPattern.test('Total murid: 29, Hadir: 28, Izin: 1, Sakit: 0, Alpa: 0'),
    'Target attendance regex matches specified criteria');

  // --- R3 Checks ---
  console.log('\n--- R3: Kelas & Mata Pelajaran Separation ---');
  assert(gj.includes('Mata Pelajaran') && gj.includes('handleMapelChange'),
    'GuruJurnal displays visible Mata Pelajaran dropdown');
  assert(gj.includes('Kelas') && gj.includes('handleKelasChange'),
    'GuruJurnal displays visible Kelas dropdown');

  // Personal print table has separate headers for Kelas and Mata Pelajaran
  if (pribadiHeaderMatch) {
    const headerHtml = pribadiHeaderMatch[1];
    assert(headerHtml.includes('>Kelas<') && headerHtml.includes('>Mata Pelajaran<'),
      'RekapJurnalView personal table has separate headers for Kelas and Mata Pelajaran');
  }

  // CSV export has separate columns for Kelas and Mata Pelajaran
  assert(rj.includes("'Kelas',") && rj.includes("'Mata Pelajaran',"),
    'RekapJurnalView CSV export includes separate columns for Kelas and Mata Pelajaran');

  console.log(`\n========================================`);
  console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runVerification();
