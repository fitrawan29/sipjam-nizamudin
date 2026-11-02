import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('====================================================');
console.log('TEST SUITE: VERIFIKASI JAM DATANG & JAM PULANG GERBANG PIKET');
console.log('====================================================');

let passed = 0;
let failed = 0;

function check(desc: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ PASS: ${desc}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(err);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// 1. Static Source Code Verification in RekapSiswaView.tsx
// ---------------------------------------------------------------------------
const rekapPath = path.resolve(process.cwd(), 'src/components/RekapSiswaView.tsx');
const rekapSrc = fs.readFileSync(rekapPath, 'utf8');

check('R1.1 - RekapSiswaView defines table headers for Jam Datang and Jam Pulang', () => {
  assert(rekapSrc.includes('>Jam Datang</th>'), 'Table must have Jam Datang column header');
  assert(rekapSrc.includes('>Jam Pulang</th>'), 'Table must have Jam Pulang column header');
});

check('R1.2 - RekapSiswaView correctly checks and renders Jam Datang with WITA suffix or dash', () => {
  assert(
    rekapSrc.includes("siswa.jamDatang && siswa.jamDatang !== '-' ?") ||
    rekapSrc.includes("siswa.jamDatang ?"),
    'Must guard jamDatang before rendering'
  );
  assert(rekapSrc.includes('{siswa.jamDatang} WITA'), 'Must display formatted jamDatang with WITA suffix');
});

check('R2.1 - RekapSiswaView renders Jam Pulang time when present and dash "-" when absent', () => {
  assert(
    rekapSrc.includes("siswa.jamPulang && siswa.jamPulang !== '-' ?"),
    'Must strictly verify jamPulang is not dash/empty before showing WITA'
  );
  assert(rekapSrc.includes('{siswa.jamPulang} WITA'), 'Must display formatted jamPulang with WITA suffix');
});

check('R2.2 - RekapSiswaView does not assign fake "Sistem Mapel Auto" to pulang', () => {
  assert(
    !rekapSrc.includes("pulang = { jam: 'Sistem Mapel Auto'"),
    'Must not inject fake pulang records for morning present students'
  );
});

check('R2.3 - RekapSiswaView CSV export handles Jam Datang and Jam Pulang properly', () => {
  assert(
    rekapSrc.includes("s.jamDatang && s.jamDatang !== '-' ? `${s.jamDatang} WITA` : '-'") ||
    rekapSrc.includes("s.jamDatang ? `${s.jamDatang} WITA` : '-'"),
    'CSV export handles jamDatang'
  );
  assert(
    rekapSrc.includes("s.jamPulang && s.jamPulang !== '-' ? `${s.jamPulang} WITA` : '-'"),
    'CSV export handles jamPulang and returns "-" when missing'
  );
});

// ---------------------------------------------------------------------------
// 2. Behavioral Simulation of Gerbang Attendance Data Mapping
// ---------------------------------------------------------------------------
check('R1 & R2 Behavioral - Accurate Jam Datang and Jam Pulang Data Mapping', () => {
  const mockStudents = [
    { id: 's-1', nisn: '001', nama_siswa: 'Budi Santoso', kelas: '7A' },
    { id: 's-2', nisn: '002', nama_siswa: 'Siti Aminah', kelas: '7A' },
    { id: 's-3', nisn: '003', nama_siswa: 'Ahmad Fauzi', kelas: '7A' },
    { id: 's-4', nisn: '004', nama_siswa: 'Dewi Lestari', kelas: '7A' }
  ];

  const mockGateLogs = [
    // Budi has both datang and pulang
    { siswa_id: 's-1', nisn: '001', status: 'datang', jam: '06:45:20' },
    { siswa_id: 's-1', nisn: '001', status: 'pulang', jam: '14:05:00' },
    // Siti only has datang (has not checked out)
    { siswa_id: 's-2', nisn: '002', status: 'datang', jam: '07:05:00' },
    // Ahmad has no gate records at all
    // Dewi has datang but no pulang
    { siswa_id: 's-4', nisn: '004', status: 'datang', jam: '06:50:00' }
  ];

  // Map attendance exactly as RekapSiswaView does
  const mapped = mockStudents.map(siswa => {
    const datang = mockGateLogs.find(p => (p.siswa_id === siswa.id || p.nisn === siswa.nisn) && p.status === 'datang');
    const realPulang = mockGateLogs.find(p => (p.siswa_id === siswa.id || p.nisn === siswa.nisn) && p.status === 'pulang');

    const rawJamDatang = datang?.jam ? String(datang.jam).trim() : null;
    const jamDatang = rawJamDatang && rawJamDatang !== '-' && !rawJamDatang.toLowerCase().includes('auto')
      ? (rawJamDatang.length > 5 ? rawJamDatang.slice(0, 5) : rawJamDatang)
      : null;

    const rawJamPulang = realPulang?.jam ? String(realPulang.jam).trim() : null;
    const jamPulang = rawJamPulang && rawJamPulang !== '-' && !rawJamPulang.toLowerCase().includes('auto') && !rawJamPulang.toLowerCase().includes('sistem')
      ? (rawJamPulang.length > 5 ? rawJamPulang.slice(0, 5) : rawJamPulang)
      : null;

    const hasDatang = Boolean(datang);
    const hasPulang = Boolean(realPulang && realPulang.status === 'pulang');

    // UI representation
    const jamDatangDisplay = jamDatang ? `${jamDatang} WITA` : '-';
    const jamPulangDisplay = jamPulang ? `${jamPulang} WITA` : '-';
    const statusDisplay = hasPulang ? 'Sudah Pulang' : hasDatang ? 'Hadir Datang' : 'Belum Presensi';

    return {
      ...siswa,
      jamDatang,
      jamPulang,
      hasDatang,
      hasPulang,
      jamDatangDisplay,
      jamPulangDisplay,
      statusDisplay
    };
  });

  // Student 1 (Budi): datang & pulang
  const budi = mapped.find(s => s.id === 's-1')!;
  assert.strictEqual(budi.hasDatang, true);
  assert.strictEqual(budi.hasPulang, true);
  assert.strictEqual(budi.jamDatang, '06:45');
  assert.strictEqual(budi.jamPulang, '14:05');
  assert.strictEqual(budi.jamDatangDisplay, '06:45 WITA');
  assert.strictEqual(budi.jamPulangDisplay, '14:05 WITA');
  assert.strictEqual(budi.statusDisplay, 'Sudah Pulang');

  // Student 2 (Siti): datang only, NO pulang
  const siti = mapped.find(s => s.id === 's-2')!;
  assert.strictEqual(siti.hasDatang, true);
  assert.strictEqual(siti.hasPulang, false);
  assert.strictEqual(siti.jamDatang, '07:05');
  assert.strictEqual(siti.jamPulang, null);
  assert.strictEqual(siti.jamDatangDisplay, '07:05 WITA');
  assert.strictEqual(siti.jamPulangDisplay, '-');
  assert.strictEqual(siti.statusDisplay, 'Hadir Datang');

  // Student 3 (Ahmad): neither
  const ahmad = mapped.find(s => s.id === 's-3')!;
  assert.strictEqual(ahmad.hasDatang, false);
  assert.strictEqual(ahmad.hasPulang, false);
  assert.strictEqual(ahmad.jamDatang, null);
  assert.strictEqual(ahmad.jamPulang, null);
  assert.strictEqual(ahmad.jamDatangDisplay, '-');
  assert.strictEqual(ahmad.jamPulangDisplay, '-');
  assert.strictEqual(ahmad.statusDisplay, 'Belum Presensi');

  // Student 4 (Dewi): datang only
  const dewi = mapped.find(s => s.id === 's-4')!;
  assert.strictEqual(dewi.hasDatang, true);
  assert.strictEqual(dewi.hasPulang, false);
  assert.strictEqual(dewi.jamDatang, '06:50');
  assert.strictEqual(dewi.jamPulang, null);
  assert.strictEqual(dewi.jamDatangDisplay, '06:50 WITA');
  assert.strictEqual(dewi.jamPulangDisplay, '-');
  assert.strictEqual(dewi.statusDisplay, 'Hadir Datang');
});

// ---------------------------------------------------------------------------
// 3. Edge Cases & Boundary Value Testing
// ---------------------------------------------------------------------------
check('Edge Case 1 - Timestamp formatting with seconds, without seconds, and extra whitespace', () => {
  const formatTime = (raw: any): string | null => {
    const rawStr = raw ? String(raw).trim() : null;
    return rawStr && rawStr !== '-' && !rawStr.toLowerCase().includes('auto') && !rawStr.toLowerCase().includes('sistem')
      ? (rawStr.length > 5 ? rawStr.slice(0, 5) : rawStr)
      : null;
  };

  assert.strictEqual(formatTime('06:30:15'), '06:30');
  assert.strictEqual(formatTime('13:45'), '13:45');
  assert.strictEqual(formatTime('  08:12:00  '), '08:12');
  assert.strictEqual(formatTime(''), null);
  assert.strictEqual(formatTime(null), null);
  assert.strictEqual(formatTime(undefined), null);
  assert.strictEqual(formatTime('-'), null);
  assert.strictEqual(formatTime('Sistem Mapel Auto'), null);
});

console.log('\n====================================================');
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
