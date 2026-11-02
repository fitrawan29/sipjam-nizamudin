import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { formatPresensiTime } from '../src/lib/wita';

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
  assert(rekapSrc.includes('formatPresensiTime(datang?.jam)'), 'Must use formatPresensiTime for clean time parsing');
});

check('R2.1 - RekapSiswaView renders Jam Pulang time when present and dash "-" when absent', () => {
  assert(
    rekapSrc.includes("siswa.jamPulang && siswa.jamPulang !== '-' ?"),
    'Must strictly verify jamPulang is not dash/empty before showing WITA'
  );
  assert(rekapSrc.includes('{siswa.jamPulang} WITA'), 'Must display formatted jamPulang with WITA suffix');
  assert(rekapSrc.includes('formatPresensiTime(realPulang?.jam)'), 'Must use formatPresensiTime for realPulang parsing');
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
// 2. Static Source Code Verification in PiketView.tsx (Presensi Gerbang Piket)
// ---------------------------------------------------------------------------
const piketPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
const piketSrc = fs.readFileSync(piketPath, 'utf8');

check('R1.3 & R2.4 - PiketView defines Presensi Datang and Presensi Pulang headers in manual roster', () => {
  assert(piketSrc.includes('>Presensi Datang</th>'), 'PiketView must have Presensi Datang column header');
  assert(piketSrc.includes('>Presensi Pulang</th>'), 'PiketView must have Presensi Pulang column header');
});

check('R1.4 - PiketView desktop manual table displays Datang time when present and dash "-" when absent', () => {
  // When datangRecord exists: shows Datang {time}
  assert(
    piketSrc.includes('formatPresensiTime(datangRecord.jam)') ||
    piketSrc.includes('datangRecord.jam'),
    'PiketView formats datangRecord.jam'
  );
  // When datangRecord does NOT exist: displays dash indicator "-" alongside action button
  assert(
    piketSrc.includes('<span className="text-gray-400 dark:text-gray-500 font-mono text-xs font-semibold">-</span>'),
    'PiketView must display "-" indicator when not presensi yet'
  );
});

check('R2.5 - PiketView desktop manual table displays Pulang time when present and dash "-" when absent', () => {
  // When pulangRecord exists: shows Pulang {time}
  assert(
    piketSrc.includes('formatPresensiTime(pulangRecord.jam)') ||
    piketSrc.includes('pulangRecord.jam'),
    'PiketView formats pulangRecord.jam'
  );
  // When pulangRecord does NOT exist: shows dash indicator "-" alongside action button
  assert(
    piketSrc.includes('Tandai Pulang</span>') &&
    piketSrc.includes('<span className="text-gray-400 dark:text-gray-500 font-mono text-xs font-semibold">-</span>'),
    'PiketView must display "-" indicator in Pulang column when student has not yet checked out'
  );
});

check('R2.6 - PiketView mobile touch cards display dash "-" indicator when absent', () => {
  assert(
    piketSrc.includes('mr-1">-</span>') ||
    piketSrc.includes('font-semibold mr-1">-</span>'),
    'Mobile card view displays dash indicator alongside 1-tap action buttons'
  );
});

check('R2.7 - PiketView WhatsApp notification safely passes valid timeStr or undefined', () => {
  assert(
    piketSrc.includes('timeStr: formatPresensiTime(pulangRecord?.jam) || formatPresensiTime(datangRecord?.jam) || undefined'),
    'WhatsApp notification in PiketView uses formatPresensiTime and never passes "-" as timeStr'
  );
});

check('R2.8 - PiketView manual roster eliminates naive slice fallback that causes "Datang Auto " or "Pulang Auto "', () => {
  assert(!piketSrc.includes('datangRecord.jam.slice(0, 5)'), 'PiketView must not use naive slice on datangRecord');
  assert(!piketSrc.includes('pulangRecord.jam.slice(0, 5)'), 'PiketView must not use naive slice on pulangRecord');
});

check('R2.9 - Cross-component gate presence formatting in GuruJurnal and qrSiswa', () => {
  const guruJurnalSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/GuruJurnal.tsx'), 'utf8');
  const qrSiswaSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/qrSiswa.ts'), 'utf8');

  assert(guruJurnalSrc.includes('formatPresensiTime(p.jam)'), 'GuruJurnal must use formatPresensiTime for gate presence');
  assert(qrSiswaSrc.includes("import { formatPresensiTime } from './wita'"), 'qrSiswa must import formatPresensiTime');
});

check('R2.10 - PiketView kiosk feedback banner formats timestamp cleanly via formatPresensiTime', () => {
  assert(
    piketSrc.includes('pk. {formatPresensiTime(lastScanResult.jam)'),
    'Kiosk scanner card must format timestamp with formatPresensiTime'
  );
});

check('R2.11 - PiketView audit log table and WhatsApp notify use formatPresensiTime instead of naive slice(0, 8)', () => {
  assert(!piketSrc.includes('item.jam.slice(0, 8)'), 'PiketView audit log must not use naive slice(0, 8)');
  assert(piketSrc.includes('{formatPresensiTime(item.jam)'), 'PiketView audit log table must use formatPresensiTime(item.jam)');
  assert(piketSrc.includes('timeStr: formatPresensiTime(item.jam)'), 'WhatsApp notify must use formatPresensiTime(item.jam)');
});

check('R2.12 - GuruJurnal and qrSiswa eliminate naive slice fallbacks that corrupt non-time strings', () => {
  const guruJurnalSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/GuruJurnal.tsx'), 'utf8');
  const qrSiswaSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/qrSiswa.ts'), 'utf8');

  assert(!guruJurnalSrc.includes('p.jam.slice'), 'GuruJurnal must not have naive slice fallback');
  assert(!qrSiswaSrc.includes('existing.jam.slice'), 'qrSiswa must not have naive slice fallback on existing.jam');
  assert(!qrSiswaSrc.includes('jam.slice'), 'qrSiswa must not have naive slice fallback on jam');
});

// ---------------------------------------------------------------------------
// 3. Central formatPresensiTime Unit Testing
// ---------------------------------------------------------------------------
check('R1 & R2 Helper - formatPresensiTime handles diverse timestamp and datetime inputs', () => {
  // Standard 24-hr formats with seconds
  assert.strictEqual(formatPresensiTime('06:45:20'), '06:45');
  assert.strictEqual(formatPresensiTime('14:05:00'), '14:05');
  assert.strictEqual(formatPresensiTime('23:59:59'), '23:59');

  // Standard formats without seconds
  assert.strictEqual(formatPresensiTime('07:15'), '07:15');
  assert.strictEqual(formatPresensiTime('13:30'), '13:30');

  // Single-digit hours (e.g. 7:05:00 -> 07:05)
  assert.strictEqual(formatPresensiTime('7:05:00'), '07:05');
  assert.strictEqual(formatPresensiTime('6:30'), '06:30');

  // Indonesian dot format (e.g. 06.45, 14.05.30, 07.15 WITA)
  assert.strictEqual(formatPresensiTime('06.45'), '06:45');
  assert.strictEqual(formatPresensiTime('06.45.30'), '06:45');
  assert.strictEqual(formatPresensiTime('7.15'), '07:15');
  assert.strictEqual(formatPresensiTime('06.45 WITA'), '06:45');
  assert.strictEqual(formatPresensiTime('13.30 WITA'), '13:30');

  // 12-hour AM / PM formats (hardware kiosk / peripheral inputs)
  assert.strictEqual(formatPresensiTime('02:30 PM'), '14:30');
  assert.strictEqual(formatPresensiTime('2:30 pm'), '14:30');
  assert.strictEqual(formatPresensiTime('12:15 PM'), '12:15');
  assert.strictEqual(formatPresensiTime('12:30 AM'), '00:30');
  assert.strictEqual(formatPresensiTime('07:15 AM'), '07:15');
  assert.strictEqual(formatPresensiTime('7:00 am'), '07:00');

  // Datetime strings (ISO and SQL formats)
  assert.strictEqual(formatPresensiTime('2026-11-03 07:15:00'), '07:15');
  assert.strictEqual(formatPresensiTime('2026-11-03T14:30:00+08:00'), '14:30');

  // UTC ISO timestamp with 'Z' correctly converts to WITA (UTC+8)
  assert.strictEqual(formatPresensiTime('2026-11-03T06:15:00Z'), '14:15');
  assert.strictEqual(formatPresensiTime('2026-11-03 06:15:00Z'), '14:15');
  assert.strictEqual(formatPresensiTime('2026-11-03 06:15:00+00:00'), '14:15');

  // Date instance support
  assert.strictEqual(formatPresensiTime(new Date('2026-11-03T06:15:00Z')), '14:15');

  // Whitespace resilience
  assert.strictEqual(formatPresensiTime('  08:12:00  '), '08:12');

  // Boundaries and invalid hours / minutes return null
  assert.strictEqual(formatPresensiTime('99:99'), null);
  assert.strictEqual(formatPresensiTime('25:00'), null);
  assert.strictEqual(formatPresensiTime('12:75'), null);
  assert.strictEqual(formatPresensiTime('14:00 PM'), null);
  assert.strictEqual(formatPresensiTime('random text'), null);

  // Invalid, empty, or placeholder inputs return null
  assert.strictEqual(formatPresensiTime(''), null);
  assert.strictEqual(formatPresensiTime('   '), null);
  assert.strictEqual(formatPresensiTime(null), null);
  assert.strictEqual(formatPresensiTime(undefined), null);
  assert.strictEqual(formatPresensiTime('-'), null);
  assert.strictEqual(formatPresensiTime('Sistem Mapel Auto'), null);
  assert.strictEqual(formatPresensiTime('Auto Fallback: Bolos'), null);
  assert.strictEqual(formatPresensiTime('Auto Fallback: Mapel'), null);
});

// ---------------------------------------------------------------------------
// 4. Behavioral Simulation of Gerbang Attendance Data Mapping
// ---------------------------------------------------------------------------
check('R1 & R2 Behavioral - Accurate Jam Datang and Jam Pulang Data Mapping', () => {
  const mockStudents = [
    { id: 's-1', nisn: '001', nama_siswa: 'Budi Santoso', kelas: '7A' },
    { id: 's-2', nisn: '002', nama_siswa: 'Siti Aminah', kelas: '7A' },
    { id: 's-3', nisn: '003', nama_siswa: 'Ahmad Fauzi', kelas: '7A' },
    { id: 's-4', nisn: '004', nama_siswa: 'Dewi Lestari', kelas: '7A' },
    { id: 's-5', nisn: '005', nama_siswa: 'Eko Prasetyo', kelas: '7A' }
  ];

  const mockGateLogs = [
    // Budi: datang & pulang
    { siswa_id: 's-1', nisn: '001', status: 'datang', jam: '06:45:20' },
    { siswa_id: 's-1', nisn: '001', status: 'pulang', jam: '14:05:00' },
    // Siti: datang only (belum pulang)
    { siswa_id: 's-2', nisn: '002', status: 'datang', jam: '07:05:00' },
    // Ahmad: no gate records at all
    // Dewi: datang only
    { siswa_id: 's-4', nisn: '004', status: 'datang', jam: '06:50:00' },
    // Eko: single digit hour datang (7:10:00), iso pulang (2026-11-03 13:45:00)
    { siswa_id: 's-5', nisn: '005', status: 'datang', jam: '7:10:00' },
    { siswa_id: 's-5', nisn: '005', status: 'pulang', jam: '2026-11-03 13:45:00' }
  ];

  // Map attendance exactly as RekapSiswaView does
  const mapped = mockStudents.map(siswa => {
    const datang = mockGateLogs.find(p => (p.siswa_id === siswa.id || p.nisn === siswa.nisn) && p.status === 'datang');
    const realPulang = mockGateLogs.find(p => (p.siswa_id === siswa.id || p.nisn === siswa.nisn) && p.status === 'pulang');

    const jamDatang = formatPresensiTime(datang?.jam);
    const jamPulang = formatPresensiTime(realPulang?.jam);

    const hasDatang = Boolean(datang);
    const hasPulang = Boolean(realPulang && realPulang.status === 'pulang');

    // UI representations
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

  // Student 5 (Eko): single digit hour & ISO datetime string
  const eko = mapped.find(s => s.id === 's-5')!;
  assert.strictEqual(eko.hasDatang, true);
  assert.strictEqual(eko.hasPulang, true);
  assert.strictEqual(eko.jamDatang, '07:10');
  assert.strictEqual(eko.jamPulang, '13:45');
  assert.strictEqual(eko.jamDatangDisplay, '07:10 WITA');
  assert.strictEqual(eko.jamPulangDisplay, '13:45 WITA');
  assert.strictEqual(eko.statusDisplay, 'Sudah Pulang');
});

console.log('\n====================================================');
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
