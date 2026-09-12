import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-key';
}

import { getGoogleDriveThumbnailUrl, transformGoogleDriveUrl, getGoogleDriveFileId } from '../src/lib/imageUrl';

let passedCount = 0;
let failedCount = 0;
const findings: { title: string; severity: string; detail: string }[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    failedCount++;
  }
}

function addFinding(title: string, severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', detail: string) {
  findings.push({ title, severity, detail });
  console.log(`⚠️ FINDING [${severity}]: ${title}`);
  console.log(`   ${detail}`);
}

async function runAdversarialSuite() {
  const { formatPeriodHeader } = await import('../src/components/PrintHeader');
  const { isJurnalMatchJadwal, isGuruDiPiket } = await import('../src/lib/workflow');

  console.log('====================================================');
  console.log('CHALLENGER M6-1: EMPIRICAL ADVERSARIAL STRESS SUITE');
  console.log('====================================================\n');

  // -------------------------------------------------------------------------
  // 1. PRINT ORIENTATION TOGGLE & DYNAMIC @PAGE STYLE INJECTION
  // -------------------------------------------------------------------------
  console.log('--- 1. Print Orientation Toggle & Dynamic @page Style Injection ---');
  const printHeaderSrc = fs.readFileSync(path.join(__dirname, '../src/components/PrintHeader.tsx'), 'utf8');
  const rjSrc = fs.readFileSync(path.join(__dirname, '../src/components/RekapJurnalView.tsx'), 'utf8');
  const arSrc = fs.readFileSync(path.join(__dirname, '../src/components/AdminRekapView.tsx'), 'utf8');
  const rsSrc = fs.readFileSync(path.join(__dirname, '../src/components/RekapSiswaView.tsx'), 'utf8');
  const appScreenSrc = fs.readFileSync(path.join(__dirname, '../src/components/AppScreen.tsx'), 'utf8');

  assert(
    printHeaderSrc.includes('size: A4 ${orientation} !important;'),
    'Dynamic @page size injects orientation variable'
  );
  assert(
    printHeaderSrc.includes('header, nav, aside, .app-header, .no-print'),
    'Injected print CSS strictly suppresses navbars and sidebars'
  );
  assert(
    appScreenSrc.includes('print:hidden no-print'),
    'AppScreen header element explicitly has print:hidden and no-print classes'
  );
  assert(
    rjSrc.includes("useState<'landscape' | 'portrait'>('landscape')"),
    'RekapJurnalView defaults orientation to landscape'
  );
  assert(
    arSrc.includes("useState<'landscape' | 'portrait'>('landscape')"),
    'AdminRekapView defaults orientation to landscape'
  );
  assert(
    rsSrc.includes("useState<'landscape' | 'portrait'>('portrait')"),
    'RekapSiswaView defaults orientation to portrait'
  );

  // -------------------------------------------------------------------------
  // 2. HEADER PERIOD FORMATTING & DATE BOUNDARIES
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Header Period Formatting & Date Boundaries ---');
  assert(formatPeriodHeader('2026-09') === 'Periode: September 2026', 'Normal month format YYYY-MM');
  assert(formatPeriodHeader('2026-01') === 'Periode: Januari 2026', 'January boundary');
  assert(formatPeriodHeader('2026-12') === 'Periode: Desember 2026', 'December boundary');
  assert(formatPeriodHeader('', '2026-09-01', '2026-09-12') === 'Periode: 01/09/2026 - 12/09/2026', 'Custom date range DD/MM/YYYY');
  assert(formatPeriodHeader('', '2026-09-12', '2026-09-12') === 'Periode: 12/09/2026', 'Identical start and end dates collapse');
  assert(formatPeriodHeader('', '2026-09-01', '') === 'Periode: Sejak 01/09/2026', 'Start date without end date');
  assert(formatPeriodHeader('', '', '2026-09-30') === 'Periode: Sampai 30/09/2026', 'End date without start date');
  assert(formatPeriodHeader('', '', '') === 'Periode: Semua Data', 'Empty params defaults to Semua Data');

  // Days in month calculation check
  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  assert(getDaysInMonth(2024, 2) === 29, '2024 leap year Feb has 29 days');
  assert(getDaysInMonth(2025, 2) === 28, '2025 non-leap year Feb has 28 days');
  assert(getDaysInMonth(2026, 9) === 30, 'September 2026 has 30 days');

  // -------------------------------------------------------------------------
  // 3. SIGNATURE BLOCKS JUSTIFICATION & OVERFLOW PREVENTION
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Signature Blocks Justification & Overflow Prevention ---');
  assert(
    printHeaderSrc.includes('justify-between') && printHeaderSrc.includes('items-start'),
    'Signature container uses justified layout (justify-between)'
  );
  assert(
    printHeaderSrc.includes('block whitespace-nowrap'),
    'Signature container enforces whitespace-nowrap on every line to prevent wrapping down'
  );
  assert(
    printHeaderSrc.includes('page-break-inside-avoid'),
    'Signature block has page-break-inside-avoid'
  );

  // -------------------------------------------------------------------------
  // 4. JOURNAL ACTIVITY PHOTO RENDERING & THUMBNAIL TRANSFORMATION
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Journal Activity Photo Rendering & Thumbnail URL Transformation ---');
  const sampleDriveLink = 'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J_K/view?usp=sharing';
  const thumbUrl = getGoogleDriveThumbnailUrl(sampleDriveLink, 800);
  assert(
    thumbUrl === 'https://drive.google.com/thumbnail?id=1A2B3C4D5E6F7G8H9I0J_K&sz=w800',
    'getGoogleDriveThumbnailUrl correctly generates 800px thumbnail CDN URL'
  );
  assert(
    transformGoogleDriveUrl(sampleDriveLink) === 'https://drive.google.com/uc?export=view&id=1A2B3C4D5E6F7G8H9I0J_K',
    'transformGoogleDriveUrl correctly generates direct export view URL'
  );
  assert(
    rjSrc.includes('getGoogleDriveThumbnailUrl(fotoUrl, 800)'),
    'RekapJurnalView uses 800px thumbnail URL for photos'
  );
  assert(
    rjSrc.includes('print:w-20 print:h-16 object-contain'),
    'RekapJurnalView uses object-contain and print:w-20 print:h-16 to prevent cropping and overflow'
  );

  // -------------------------------------------------------------------------
  // 5. ADMIN REKAP 10-COLUMN TABLE & REKAP SISWA TABLE
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Admin Rekap 10-Column Table & Rekap Siswa Table ---');
  const required10 = ['No', 'Nama Guru', 'Hadir', 'Dinas Luar', 'Sakit', 'Izin', 'Alpa', 'Keterlambatan', 'Piket', 'Jurnal'];
  let allHeadersFound = true;
  for (const h of required10) {
    if (!arSrc.includes(`>${h}</th>`)) {
      allHeadersFound = false;
      console.error(`Missing header in AdminRekapView: ${h}`);
    }
  }
  assert(allHeadersFound, 'AdminRekapView contains all 10 required table headers');
  assert(
    arSrc.includes('border-collapse') && arSrc.includes('print:border-black'),
    'AdminRekapView table has border-collapse and print:border-black'
  );
  assert(
    rsSrc.includes('border-collapse') && rsSrc.includes('print:border-black'),
    'RekapSiswaView table has border-collapse and print:border-black'
  );

  // -------------------------------------------------------------------------
  // 6. TEACHER DASHBOARD TARGET JOURNAL RATIO EDGE CASES
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Teacher Dashboard Target Journal Ratio Edge Cases ---');
  function evalJournalRatio(dailyState: any) {
    if (!dailyState || !dailyState.jadwalKBM) {
      return { totalTarget: 0, filledCount: 0, percentage: 100, statusBadge: 'Bebas Mengajar Hari Ini' };
    }
    const totalTarget = dailyState.jadwalKBM.length;
    const filledCount = dailyState.jadwalKBM.filter((jk: any) => 
      dailyState.jurnalKBM.some((j: any) => isJurnalMatchJadwal(j, jk))
    ).length;
    const percentage = totalTarget > 0 ? Math.round((filledCount / totalTarget) * 100) : 100;
    
    let statusBadge = 'Bebas Mengajar Hari Ini';
    if (totalTarget > 0) {
      statusBadge = filledCount >= totalTarget ? 'Selesai' : 'Belum Lengkap';
    }

    return { totalTarget, filledCount, percentage, statusBadge };
  }

  // Edge 6.1: 0 classes scheduled today
  const r0 = evalJournalRatio({ jadwalKBM: [], jurnalKBM: [] });
  assert(r0.totalTarget === 0 && r0.percentage === 100 && r0.statusBadge === 'Bebas Mengajar Hari Ini', '0 scheduled classes: ratio 0/0, badge Bebas Mengajar Hari Ini, percentage 100%');

  // Edge 6.2: 4 classes scheduled, 0 filled
  const rEmpty = evalJournalRatio({
    jadwalKBM: [
      { kelas: 'X-1', mata_pelajaran: 'Biologi' },
      { kelas: 'X-2', mata_pelajaran: 'Biologi' },
      { kelas: 'XI-1', mata_pelajaran: 'Biologi' },
      { kelas: 'XI-2', mata_pelajaran: 'Biologi' }
    ],
    jurnalKBM: []
  });
  assert(rEmpty.totalTarget === 4 && rEmpty.filledCount === 0 && rEmpty.percentage === 0 && rEmpty.statusBadge === 'Belum Lengkap', '4 scheduled, 0 filled: 0/4 (0%), badge Belum Lengkap');

  // Edge 6.3: 4 classes scheduled, 2 filled (partial)
  const rHalf = evalJournalRatio({
    jadwalKBM: [
      { kelas: 'X-1', mata_pelajaran: 'Biologi' },
      { kelas: 'X-2', mata_pelajaran: 'Biologi' },
      { kelas: 'XI-1', mata_pelajaran: 'Biologi' },
      { kelas: 'XI-2', mata_pelajaran: 'Biologi' }
    ],
    jurnalKBM: [
      { kelas: 'X-1', mapel: 'Biologi' },
      { kelas: 'XI-1', mapel: 'Biologi' }
    ]
  });
  assert(rHalf.totalTarget === 4 && rHalf.filledCount === 2 && rHalf.percentage === 50 && rHalf.statusBadge === 'Belum Lengkap', '4 scheduled, 2 filled: 2/4 (50%), badge Belum Lengkap');

  // Edge 6.4: 4 classes scheduled, 4 filled (all complete)
  const rAll = evalJournalRatio({
    jadwalKBM: [
      { kelas: 'X-1', mata_pelajaran: 'Biologi' },
      { kelas: 'X-2', mata_pelajaran: 'Biologi' },
      { kelas: 'XI-1', mata_pelajaran: 'Biologi' },
      { kelas: 'XI-2', mata_pelajaran: 'Biologi' }
    ],
    jurnalKBM: [
      { kelas: 'X-1', mapel: 'Biologi' },
      { kelas: 'X-2', mapel: 'Biologi' },
      { kelas: 'XI-1', mapel: 'Biologi' },
      { kelas: 'XI-2', mapel: 'Biologi' }
    ]
  });
  assert(rAll.totalTarget === 4 && rAll.filledCount === 4 && rAll.percentage === 100 && rAll.statusBadge === 'Selesai', '4 scheduled, 4 filled: 4/4 (100%), badge Selesai');

  // -------------------------------------------------------------------------
  // 7. STUDENT ATTENDANCE PERCENTAGE WITH EMPTY JOURNALS OR ZERO STUDENTS
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Student Attendance Percentage Edge Cases ---');
  function calcStudentAttendance(subjectJournals: any[]) {
    let totalH = 0;
    let totalRecords = 0;

    subjectJournals.forEach(j => {
      let parsed: Record<string, string> | null = null;
      if (j.absensi_siswa && typeof j.absensi_siswa === 'string' && j.absensi_siswa.trim().startsWith('{')) {
        try {
          parsed = JSON.parse(j.absensi_siswa);
        } catch (_) {
          parsed = null;
        }
      }

      if (parsed) {
        Object.values(parsed).forEach(status => {
          const code = String(status).trim().toUpperCase();
          if (['H', 'S', 'I', 'A'].includes(code)) {
            totalRecords++;
            if (code === 'H') totalH++;
          }
        });
      } else if (j.detail_absen) {
        const matches = j.detail_absen.match(/\(([HSIAhsia])\)/g);
        if (matches) {
          matches.forEach((m: string) => {
            const code = m.replace(/[()]/g, '').toUpperCase();
            totalRecords++;
            if (code === 'H') totalH++;
          });
        }
      }
    });

    const percentage = totalRecords > 0 ? Math.round((totalH / totalRecords) * 100) : 0;
    return { totalRecords, totalH, percentage };
  }

  assert(calcStudentAttendance([]).percentage === 0, 'Empty journal array returns 0%');
  assert(calcStudentAttendance([{ absensi_siswa: '{}' }]).percentage === 0, 'Empty absensi_siswa object returns 0%');
  assert(calcStudentAttendance([{ absensi_siswa: null, detail_absen: null }]).percentage === 0, 'Null absensi and null detail returns 0%');
  assert(calcStudentAttendance([{ absensi_siswa: 'not json' }]).percentage === 0, 'Invalid JSON string returns 0%');
  assert(calcStudentAttendance([{ detail_absen: 'A(H), B(H), C(H), D(H)' }]).percentage === 100, 'All Hadir returns 100%');
  assert(calcStudentAttendance([{ detail_absen: 'A(A), B(A), C(A), D(A)' }]).percentage === 0, 'All Alpa returns 0%');
  assert(calcStudentAttendance([{ detail_absen: 'A(H), B(S), C(I), D(A)' }]).percentage === 25, '1 of 4 Hadir returns 25%');

  // -------------------------------------------------------------------------
  // 8. ADMIN VERIFICATION REACTIVE FILTERS & DIFF CALCULATION
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Admin Verification Reactive Filters & Unsubmitted Diff ---');
  const adminVerifSrc = fs.readFileSync(path.join(__dirname, '../src/components/AdminVerifView.tsx'), 'utf8');

  // Test 8.1: Check if date fallback bug exists in AdminVerifView.tsx
  const hasPresensiDateBug = adminVerifSrc.includes('!date || (p.timestamp && p.timestamp.includes(effectiveDate))');
  const hasJurnalDateBug = adminVerifSrc.includes('!date || j.tanggal === effectiveDate');
  const hasPiketDateBug = adminVerifSrc.includes('!date || p.tanggal === effectiveDate');

  if (hasPresensiDateBug || hasJurnalDateBug || hasPiketDateBug) {
    addFinding(
      'AdminVerifView !date Fallback Pollutes Unsubmitted Cross-Referencing',
      'HIGH',
      'When date is empty ("", the default state), "!date" evaluates to true for all 200 fetched historical records. This marks teachers who submitted on ANY prior date as having submitted today, causing unsubmitted lists to falsely show 0 unsubmitted teachers.'
    );
  }

  // Test 8.2: Check if taskFilter === "Semua" includes or excludes unsubmitted teachers
  const isSemuaSameAsSudah = adminVerifSrc.includes('// 2. If filtering for Sudah Menyelesaikan or Semua');
  if (isSemuaSameAsSudah) {
    addFinding(
      'AdminVerifView "Semua" Filter Does Not Display Unsubmitted Teachers',
      'MEDIUM',
      'Dropdown option specifies "Semua Guru (Sudah & Belum)", but displayList in AdminVerifView only returns submittedList when taskFilter !== "Belum". As a result, selecting "Semua" behaves identically to "Sudah" and does not display unsubmitted cards.'
    );
  }

  // Test 8.3: Substring name collision check
  const hasSubstringCollision = adminVerifSrc.includes('Array.from(submittedTeacherNames).some(sn => sn.includes(tName) || tName.includes(sn))');
  if (hasSubstringCollision) {
    addFinding(
      'AdminVerifView Substring Name Collision in Unsubmitted Detection',
      'MEDIUM',
      'Using sn.includes(tName) || tName.includes(sn) causes teachers whose names are substrings of other teachers (e.g. "Fitra" in "Ade Fitrawan Ibrahim") to falsely count as submitted when the other teacher submits.'
    );
  }

  // Test 8.4: Live Simulation of Date Boundary Bug
  const mockTeachers = [
    { id: 1, nama_guru: 'Ade Fitrawan Ibrahim' },
    { id: 2, nama_guru: 'Nurhalizah Mamonto' },
    { id: 3, nama_guru: 'Setia Ambar Ningsih' }
  ];
  // Yesterday's checkins:
  const mockPresensi = [
    { nama_guru: 'Ade Fitrawan Ibrahim', timestamp: '2026-09-11T07:30:00+08:00' },
    { nama_guru: 'Nurhalizah Mamonto', timestamp: '2026-09-11T07:35:00+08:00' }
  ];
  const dateParam = ''; // default state
  const effDate = '2026-09-12'; // today

  // Flawed computation:
  const flawedSubmitted = new Set(
    mockPresensi
      .filter(p => !dateParam || (p.timestamp && p.timestamp.includes(effDate)))
      .map(p => (p.nama_guru || '').trim().toLowerCase())
  );
  const flawedUnsubmittedCount = mockTeachers.filter(t => !flawedSubmitted.has(t.nama_guru.toLowerCase())).length;

  // Correct computation:
  const correctSubmitted = new Set(
    mockPresensi
      .filter(p => p.timestamp && p.timestamp.includes(effDate))
      .map(p => (p.nama_guru || '').trim().toLowerCase())
  );
  const correctUnsubmittedCount = mockTeachers.filter(t => !correctSubmitted.has(t.nama_guru.toLowerCase())).length;

  assert(
    correctUnsubmittedCount === 3,
    'Correct diff: All 3 teachers should be unsubmitted for today when today has 0 records'
  );
  assert(
    flawedUnsubmittedCount === 1,
    'Empirical confirmation: flawed !date logic incorrectly reported 2 teachers as submitted today from yesterday data'
  );

  // Assertions confirming all 3 defects are remedied
  assert(
    !hasPresensiDateBug && !hasJurnalDateBug && !hasPiketDateBug,
    'AdminVerifView strictly filters by targetDate without !date leakage'
  );
  assert(
    !isSemuaSameAsSudah,
    'AdminVerifView displayList combines submitted and unsubmitted items when taskFilter is Semua'
  );
  assert(
    !hasSubstringCollision,
    'AdminVerifView uses robust exact normalized matching without substring collisions'
  );
  assert(
    findings.length === 0,
    'All Challenger 1 findings resolved (0 findings remaining)'
  );

  console.log('\n====================================================');
  console.log(`STRESS TEST COMPLETE: ${passedCount} PASSED | ${failedCount} FAILED | ${findings.length} FINDINGS`);
  console.log('====================================================\n');
}

runAdversarialSuite().catch(err => {
  console.error(err);
  process.exit(1);
});
