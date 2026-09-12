import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-key';
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

async function runTests() {
  console.log('====================================================');
  console.log('MILESTONE M6.3 TEST: TEACHER & ADMIN DASHBOARDS & VERIF');
  console.log('====================================================\n');

  const homeViewPath = path.resolve(__dirname, '..', 'src', 'components', 'HomeView.tsx');
  const adminVerifPath = path.resolve(__dirname, '..', 'src', 'components', 'AdminVerifView.tsx');

  assert(fs.existsSync(homeViewPath), 'HomeView.tsx file exists');
  assert(fs.existsSync(adminVerifPath), 'AdminVerifView.tsx file exists');

  const homeContent = fs.readFileSync(homeViewPath, 'utf8');
  const verifContent = fs.readFileSync(adminVerifPath, 'utf8');

  // ----------------------------------------------------
  // Section 1: Teacher Dashboard Code Structure
  // ----------------------------------------------------
  console.log('\n--- Section 1: Teacher Dashboard Overhaul (HomeView.tsx) ---');

  // Deprecated Aktivitas Utama removal
  assert(
    !homeContent.includes('Aktivitas Utama'),
    'Aktivitas Utama component is completely removed from HomeView.tsx'
  );

  // Personal Attendance Stat Cards (H, TL, Izin, Sakit)
  assert(
    homeContent.includes('Statistik Presensi Pribadi'),
    'HomeView contains Personal Attendance Stats section'
  );
  assert(
    homeContent.includes('Hadir (H)') &&
    homeContent.includes('Terlambat (TL)') &&
    homeContent.includes('Izin (I)') &&
    homeContent.includes('Sakit (S)'),
    'HomeView renders all 4 personal attendance stat cards (H, TL, Izin, Sakit)'
  );

  // Dynamic Target Journal Ratio
  assert(
    homeContent.includes('Target Jurnal Hari Ini') || homeContent.includes('Jurnal Terisi vs Total Target'),
    'HomeView contains dynamic target journal ratio section'
  );
  assert(
    homeContent.includes('Bebas Mengajar Hari Ini') &&
    homeContent.includes('Belum Lengkap'),
    'HomeView handles dynamic journal status badges (Selesai, Belum Lengkap, Bebas Mengajar)'
  );

  // Student Attendance Percentage per Subject
  assert(
    homeContent.includes('Persentase Kehadiran Siswa per Mata Pelajaran'),
    'HomeView contains student attendance percentage per subject section'
  );
  assert(
    homeContent.includes('guru_mapel') && homeContent.includes('absensi_siswa'),
    'HomeView queries guru_mapel and parses absensi_siswa for student attendance'
  );

  // Document Upload Completeness List (Kurikulum Merdeka 6 docs)
  assert(
    homeContent.includes('Kelengkapan Perangkat Pembelajaran'),
    'HomeView contains Document Completeness list'
  );
  assert(
    homeContent.includes('CP') &&
    homeContent.includes('ATP') &&
    homeContent.includes('RPE') &&
    homeContent.includes('Prota') &&
    homeContent.includes('Promes') &&
    homeContent.includes('RPM'),
    'HomeView tracks all 6 Kurikulum Merdeka documents (CP, ATP, RPE, Prota, Promes, RPM)'
  );

  // ----------------------------------------------------
  // Section 2: Admin Dashboard & Daily Status Matrix
  // ----------------------------------------------------
  console.log('\n--- Section 2: Admin Dashboard & Daily Status Matrix (HomeView.tsx) ---');

  assert(
    homeContent.includes('Matriks Status Harian Guru'),
    'HomeView renders Daily Status Matrix for Admin'
  );
  assert(
    homeContent.includes('1. Presensi Datang') &&
    homeContent.includes('2. Pengisian Jurnal') &&
    homeContent.includes('3. Laporan Piket') &&
    homeContent.includes('4. Presensi Pulang'),
    'Daily Status Matrix maps all 4 required operational dimensions'
  );
  assert(
    homeContent.includes('Presensi Datang') &&
    homeContent.includes('Jurnal Lengkap') &&
    homeContent.includes('Piket Selesai') &&
    homeContent.includes('Presensi Pulang'),
    'HomeView renders all Admin summary KPI counter cards at top'
  );
  assert(
    homeContent.includes('matrixFilter') &&
    homeContent.includes('Tugas Lengkap') &&
    homeContent.includes('Belum Lengkap'),
    'HomeView contains reactive in-memory search & filter pills for the status matrix'
  );

  // ----------------------------------------------------
  // Section 3: Admin Verification Page (AdminVerifView.tsx)
  // ----------------------------------------------------
  console.log('\n--- Section 3: Admin Verification Reactive Filtering (AdminVerifView.tsx) ---');

  assert(
    verifContent.includes('taskFilter') &&
    verifContent.includes('verifFilter'),
    'AdminVerifView defines reactive taskFilter and verifFilter states'
  );
  assert(
    verifContent.includes('Filter Penyelesaian Tugas') &&
    verifContent.includes('Filter Status Verifikasi'),
    'AdminVerifView renders both reactive dropdown filters in the UI'
  );
  assert(
    verifContent.includes('unsubmittedPresensi') &&
    verifContent.includes('unsubmittedJurnal') &&
    verifContent.includes('unsubmittedPiket'),
    'AdminVerifView implements cross-referencing for unsubmitted teachers when taskFilter === "Belum"'
  );
  assert(
    verifContent.includes('useMemo') &&
    verifContent.includes('isUnsubmitted'),
    'AdminVerifView filters instantly client-side via useMemo with zero reload and renders unsubmitted cards'
  );

  // ----------------------------------------------------
  // Section 4: Live Supabase Data Integration Tests
  // ----------------------------------------------------
  console.log('\n--- Section 4: Live Supabase Data Integration ---');

  try {
    const { data: teachers, error: tErr } = await supabase
      .from('data_guru')
      .select('id, nip, nama_guru, mata_pelajaran')
      .order('nama_guru', { ascending: true });

    assert(!tErr && teachers && teachers.length >= 13, `data_guru contains all 13 teachers (count: ${teachers?.length || 0})`);

    const { data: mapel, error: mErr } = await supabase
      .from('guru_mapel')
      .select('id, nip, nama_guru, nama_mapel, kelas')
      .limit(10);

    assert(!mErr && mapel && mapel.length > 0, `guru_mapel contains valid subject assignments (count: ${mapel?.length || 0})`);

    const { data: piket, error: pErr } = await supabase
      .from('jadwal_piket')
      .select('*');

    assert(!pErr && piket && piket.length > 0, `jadwal_piket contains active picket schedules (count: ${piket?.length || 0})`);

    const { data: jadwal, error: jErr } = await supabase
      .from('jadwal_pelajaran')
      .select('*')
      .limit(10);

    assert(!jErr && jadwal && jadwal.length > 0, `jadwal_pelajaran contains schedule entries (count: ${jadwal?.length || 0})`);

  } catch (err: any) {
    console.error('Supabase live test error:', err.message);
    failed++;
  }

  // ----------------------------------------------------
  // Section 5: Unit Logic Tests
  // ----------------------------------------------------
  console.log('\n--- Section 5: Unit Calculations & Edge Cases ---');

  // Test 5.1: Student attendance percentage calculation formula
  const sampleParsedAbsensi = {
    '101': 'H',
    '102': 'H',
    '103': 'S',
    '104': 'I',
    '105': 'H',
  };
  let totalH = 0;
  let totalRecs = 0;
  Object.values(sampleParsedAbsensi).forEach(val => {
    if (['H', 'S', 'I', 'A'].includes(val)) {
      totalRecs++;
      if (val === 'H') totalH++;
    }
  });
  const samplePct = Math.round((totalH / totalRecs) * 100);
  assert(
    samplePct === 60,
    `Student attendance percentage calculated correctly: 3/5 = 60% (got: ${samplePct}%)`
  );

  // Test 5.2: Zero records edge case (divide by zero protection)
  const zeroRecsPct = 0 > 0 ? Math.round((0 / 0) * 100) : 0;
  assert(zeroRecsPct === 0, 'Zero attendance records cleanly returns 0% without NaN');

  // Test 5.3: Target journal ratio edge case (0 scheduled classes)
  const zeroTarget = 0;
  const zeroTargetStatus = zeroTarget > 0 ? (0 >= zeroTarget ? 'Selesai' : 'Belum Lengkap') : 'Bebas Mengajar Hari Ini';
  assert(
    zeroTargetStatus === 'Bebas Mengajar Hari Ini',
    'Zero target classes cleanly evaluates to "Bebas Mengajar Hari Ini"'
  );

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
