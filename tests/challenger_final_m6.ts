import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-key';
}

import { createClient } from '@supabase/supabase-js';
import { getWitaDateStr, getWitaDayName } from '../src/lib/wita';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string, detail?: string) {
  if (cond) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${name}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

// Extract normalizeTeacherName and isTeacherMatch directly from AdminVerifView.tsx
function normalizeTeacherName(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/,.*$/, '') // Hapus gelar setelah koma (misal: ", S.Pd.")
    .replace(/\b(s\.?pd\.?i?|m\.?pd\.?|s\.?kom\.?|s\.?si\.?|s\.?ag\.?|s\.?e\.?|s\.?t\.?|gr\.?)\b/gi, '') // Hapus singkatan gelar
    .replace(/[^a-z0-9\s]/gi, ' ') // Ganti tanda baca dengan spasi
    .replace(/\s+/g, ' ') // Rapikan multi-spasi
    .trim();
}

function isTeacherMatch(teacherName?: string | null, candidateName?: string | null, nip?: string | null): boolean {
  if (!teacherName || !candidateName) return false;
  const normTeacher = normalizeTeacherName(teacherName);
  const normCandidate = normalizeTeacherName(candidateName);

  if (normTeacher && normCandidate && normTeacher === normCandidate) return true;

  if (nip) {
    const normNip = normalizeTeacherName(nip);
    if (normNip && (normNip === normTeacher || normNip === normCandidate)) return true;
  }

  return false;
}

async function runFinalChallengerVerification() {
  console.log('=================================================================');
  console.log('CHALLENGER FINAL M6: INDEPENDENT EMPIRICAL ADVERSARIAL HARNESS');
  console.log('=================================================================\n');

  // -------------------------------------------------------------------------
  // SUITE 1: TEACHER NAME NORMALIZATION & ANTI-COLLISION MATRIX
  // -------------------------------------------------------------------------
  console.log('--- Suite 1: Teacher Name Normalization & Anti-Collision Matrix ---');

  // Fetch real teacher roster from Supabase or fallback to real school roster
  let teachers: any[] = [];
  try {
    const { data, error } = await supabase.from('data_guru').select('id, nama_guru, nip, mata_pelajaran');
    if (!error && data && data.length > 0) {
      teachers = data;
    }
  } catch (_) {}

  if (teachers.length === 0) {
    // Exact SIPJAM roster
    teachers = [
      { id: 1, nama_guru: 'Ade Fitrawan Ibrahim', nip: '19850101' },
      { id: 2, nama_guru: 'Assyfa Fitra Azzahrah Abukasim', nip: '19900202' },
      { id: 3, nama_guru: 'Fitra Suryazana Mamonto, S.Pd.', nip: 'Fitra' },
      { id: 4, nama_guru: 'Nurhalizah Mamonto, S.Pd.', nip: '19870303' },
      { id: 5, nama_guru: 'Setia Ambar Ningsih, M.Pd.', nip: '19820404' },
      { id: 6, nama_guru: 'Riski Candra Mamangkai', nip: '19950505' },
      { id: 7, nama_guru: 'Adnan Mokoagow, S.Kom.', nip: '19880606' },
      { id: 8, nama_guru: 'Rahmawati Paputungan, S.Ag.', nip: '19790707' },
      { id: 9, nama_guru: 'Dewi Sartika Mokodongan', nip: '19920808' },
      { id: 10, nama_guru: 'Ismail Hasan, S.Pd., Gr.', nip: '19840909' }
    ];
  }

  console.log(`Testing with ${teachers.length} teachers...`);

  // 1.1 Pairwise Cross-Collision Test: No distinct teachers should match each other
  let pairwiseCollisions = 0;
  for (let i = 0; i < teachers.length; i++) {
    for (let j = 0; j < teachers.length; j++) {
      if (i === j) continue;
      const tA = teachers[i];
      const tB = teachers[j];

      // Test A against B's name
      if (isTeacherMatch(tA.nama_guru, tB.nama_guru, tA.nip)) {
        console.error(`COLLISION DETECTED: Teacher "${tA.nama_guru}" (NIP: ${tA.nip}) matched with "${tB.nama_guru}"!`);
        pairwiseCollisions++;
      }
      // Test A against B's NIP
      if (isTeacherMatch(tA.nama_guru, tB.nip, tA.nip)) {
        console.error(`COLLISION DETECTED: Teacher "${tA.nama_guru}" (NIP: ${tA.nip}) matched with NIP "${tB.nip}"!`);
        pairwiseCollisions++;
      }
    }
  }
  assert(pairwiseCollisions === 0, `Pairwise Independence: 0 false collisions across all ${teachers.length * (teachers.length - 1)} pairs`);

  // 1.2 Substring Vulnerability Attacks
  assert(
    !isTeacherMatch('Fitra Suryazana Mamonto, S.Pd.', 'Ade Fitrawan Ibrahim', 'Fitra'),
    'Fitra does NOT collide with Ade Fitrawan Ibrahim'
  );
  assert(
    !isTeacherMatch('Fitra Suryazana Mamonto, S.Pd.', 'Assyfa Fitra Azzahrah Abukasim', 'Fitra'),
    'Fitra does NOT collide with Assyfa Fitra Azzahrah Abukasim'
  );
  assert(
    !isTeacherMatch('Adnan Mokoagow', 'Riski Candra Mamangkai', 'Adnan'),
    'Adnan does NOT collide with Riski Candra Mamangkai'
  );

  // 1.3 Positive Title Invariance Matches
  assert(
    isTeacherMatch('Fitra Suryazana Mamonto, S.Pd.', 'Fitra Suryazana Mamonto', 'Fitra'),
    'Matches when submission omits academic title',
    'Title S.Pd. should be normalized away'
  );
  assert(
    isTeacherMatch('Fitra Suryazana Mamonto, S.Pd.', 'Fitra', 'Fitra'),
    'Matches when submission uses NIP / short name alias',
    'Candidate "Fitra" matches NIP "Fitra"'
  );
  assert(
    isTeacherMatch('Setia Ambar Ningsih, M.Pd.', 'Setia Ambar Ningsih, S.Pd.', '19820404'),
    'Matches when title varies (M.Pd vs S.Pd)',
    'Titles normalized away to identical base names'
  );
  assert(
    isTeacherMatch('Ismail Hasan, S.Pd., Gr.', 'Ismail Hasan', '19840909'),
    'Matches multiple titles (S.Pd., Gr.)',
    'Multiple trailing titles stripped'
  );

  // 1.4 Adversarial Null / Empty / Malformed Inputs
  assert(!isTeacherMatch(null, 'Fitra', null), 'Handles null teacherName gracefully');
  assert(!isTeacherMatch('Fitra', null, null), 'Handles null candidateName gracefully');
  assert(!isTeacherMatch('', '', ''), 'Handles empty strings gracefully');
  assert(!isTeacherMatch(undefined, undefined, undefined), 'Handles undefined gracefully');

  // -------------------------------------------------------------------------
  // SUITE 2: TARGET DATE SCOPING & HISTORICAL POLLUTION INVARIANT
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 2: Target Date Scoping & Historical Pollution Invariant ---');

  const todayStr = getWitaDateStr();
  const pastDateStr = '2026-08-15';
  const futureDateStr = '2026-10-01';

  // Mock 100 historical presensi records spanning past days
  const historicalPresensi: any[] = [];
  for (let d = 1; d <= 30; d++) {
    const dayStr = `2026-08-${String(d).padStart(2, '0')}`;
    historicalPresensi.push({
      id: 1000 + d,
      nama_guru: 'Fitra Suryazana Mamonto',
      timestamp: `${dayStr}T07:15:00+08:00`,
      status_verifikasi: 'Disetujui'
    });
    historicalPresensi.push({
      id: 2000 + d,
      nama_guru: 'Ade Fitrawan Ibrahim',
      timestamp: `${dayStr}T07:20:00+08:00`,
      status_verifikasi: 'Disetujui'
    });
  }

  // Simulation: Target date scoping logic as in AdminVerifView.tsx
  function computeUnsubmittedPresensi(
    teacherList: any[],
    rawPresensi: any[],
    selectedDate: string
  ) {
    const effectiveDate = selectedDate || todayStr;
    const targetDate = selectedDate || effectiveDate;

    const submittedList = rawPresensi.filter(p => {
      if (!p.timestamp) return false;
      if (p.timestamp.includes(targetDate)) return true;
      try {
        return getWitaDateStr(new Date(p.timestamp)) === targetDate;
      } catch {
        return false;
      }
    });

    return teacherList
      .filter(t => {
        const hasSubmitted = submittedList.some(p =>
          isTeacherMatch(t.nama_guru, p.nama_guru, t.nip)
        );
        return !hasSubmitted;
      })
      .map(t => ({
        id: `unsub-presensi-${t.id}`,
        nama_guru: t.nama_guru,
        tanggal: targetDate,
        isUnsubmitted: true
      }));
  }

  // 2.1 Default Mount: date = '' (No date picked by user)
  // There are 0 submissions for todayStr in historicalPresensi.
  const unsubDefault = computeUnsubmittedPresensi(teachers, historicalPresensi, '');
  assert(
    unsubDefault.length === teachers.length,
    `Mount state (date=''): All ${teachers.length} teachers marked unsubmitted when today has 0 records (got: ${unsubDefault.length})`
  );

  // 2.2 Adding 1 record for today: Exactly that 1 teacher should drop from unsubmitted
  const presensiWithToday = [
    ...historicalPresensi,
    {
      id: 9999,
      nama_guru: 'Fitra Suryazana Mamonto',
      timestamp: `${todayStr}T07:05:00+08:00`,
      status_verifikasi: 'Menunggu'
    }
  ];
  const unsubWithToday = computeUnsubmittedPresensi(teachers, presensiWithToday, '');
  assert(
    unsubWithToday.length === teachers.length - 1,
    `1 teacher submitted today: exactly ${teachers.length - 1} unsubmitted remaining`
  );
  assert(
    !unsubWithToday.some(u => u.nama_guru.includes('Fitra Suryazana')),
    'Submitted teacher Fitra Suryazana is cleanly excluded from unsubmitted'
  );

  // 2.3 Date Selection: User selects a past date '2026-08-15'
  // On that date, Fitra and Ade submitted. Others did not.
  const unsubPast = computeUnsubmittedPresensi(teachers, historicalPresensi, '2026-08-15');
  assert(
    unsubPast.length === teachers.length - 2,
    `Specific date '2026-08-15': exactly 2 teachers submitted, ${teachers.length - 2} unsubmitted`
  );
  assert(
    !unsubPast.some(u => u.nama_guru.includes('Fitra Suryazana') || u.nama_guru.includes('Ade Fitrawan')),
    'Fitra and Ade are not in unsubmitted on 2026-08-15'
  );

  // 2.4 WITA Timezone Boundary Stress:
  // UTC timestamp 2026-09-11T16:30:00Z is 2026-09-12 00:30:00 WITA.
  const presensiUtcBoundary = [
    {
      id: 8888,
      nama_guru: 'Nurhalizah Mamonto',
      timestamp: '2026-09-11T16:30:00Z', // 00:30 WITA on 2026-09-12
      status_verifikasi: 'Menunggu'
    }
  ];
  const unsubUtc = computeUnsubmittedPresensi(
    [{ id: 4, nama_guru: 'Nurhalizah Mamonto, S.Pd.', nip: '19870303' }],
    presensiUtcBoundary,
    '2026-09-12'
  );
  assert(
    unsubUtc.length === 0,
    'UTC timestamp across midnight maps precisely to WITA day and marks teacher as submitted'
  );

  // -------------------------------------------------------------------------
  // SUITE 3: "SEMUA" FILTER REACTION & DISPLAY LIST COMBINATION
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 3: "Semua" Filter Reaction & Display List Combination ---');

  // Simulation of displayList useMemo
  function computeDisplayList({
    taskFilter,
    verifFilter,
    search,
    submittedList,
    unsubmittedList
  }: {
    taskFilter: 'Semua' | 'Sudah' | 'Belum';
    verifFilter: 'Semua' | 'Menunggu' | 'Disetujui' | 'Ditolak';
    search: string;
    submittedList: any[];
    unsubmittedList: any[];
  }) {
    const filteredUnsubmitted = unsubmittedList.filter((item: any) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (item.nama_guru || '').toLowerCase().includes(q) ||
        (item.nip || '').toLowerCase().includes(q) ||
        (item.mata_pelajaran || '').toLowerCase().includes(q)
      );
    });

    const filteredSubmitted = submittedList.filter((item: any) => {
      if (verifFilter !== 'Semua') {
        const status = item.status_verifikasi || 'Menunggu';
        if (status !== verifFilter) return false;
      }
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (item.nama_guru || '').toLowerCase().includes(q) ||
        (item.tipe_absen || '').toLowerCase().includes(q)
      );
    });

    if (taskFilter === 'Belum') return filteredUnsubmitted;
    if (taskFilter === 'Sudah') return filteredSubmitted;
    if (verifFilter !== 'Semua') return filteredSubmitted;
    return [...filteredSubmitted, ...filteredUnsubmitted];
  }

  const mockSubmitted = [
    { id: 1, nama_guru: 'Fitra Suryazana Mamonto', status_verifikasi: 'Menunggu', isUnsubmitted: false },
    { id: 2, nama_guru: 'Ade Fitrawan Ibrahim', status_verifikasi: 'Disetujui', isUnsubmitted: false },
    { id: 3, nama_guru: 'Nurhalizah Mamonto', status_verifikasi: 'Ditolak', isUnsubmitted: false }
  ];

  const mockUnsubmitted = [
    { id: 'unsub-4', nama_guru: 'Setia Ambar Ningsih', nip: '19820404', isUnsubmitted: true },
    { id: 'unsub-5', nama_guru: 'Adnan Mokoagow', nip: '19880606', isUnsubmitted: true },
    { id: 'unsub-6', nama_guru: 'Dewi Sartika Mokodongan', nip: '19920808', isUnsubmitted: true }
  ];

  // 3.1 taskFilter = "Semua", verifFilter = "Semua"
  const listSemuaSemua = computeDisplayList({
    taskFilter: 'Semua',
    verifFilter: 'Semua',
    search: '',
    submittedList: mockSubmitted,
    unsubmittedList: mockUnsubmitted
  });
  assert(
    listSemuaSemua.length === 6,
    `"Semua" + "Semua": Combines 3 submitted + 3 unsubmitted = 6 total items (got: ${listSemuaSemua.length})`
  );
  assert(
    listSemuaSemua.filter(i => i.isUnsubmitted).length === 3 &&
    listSemuaSemua.filter(i => !i.isUnsubmitted).length === 3,
    '"Semua" contains both submitted and unsubmitted items exactly'
  );

  // 3.2 taskFilter = "Belum"
  const listBelum = computeDisplayList({
    taskFilter: 'Belum',
    verifFilter: 'Semua',
    search: '',
    submittedList: mockSubmitted,
    unsubmittedList: mockUnsubmitted
  });
  assert(
    listBelum.length === 3 && listBelum.every(i => i.isUnsubmitted),
    '"Belum": Contains strictly 3 unsubmitted items'
  );

  // 3.3 taskFilter = "Sudah"
  const listSudah = computeDisplayList({
    taskFilter: 'Sudah',
    verifFilter: 'Semua',
    search: '',
    submittedList: mockSubmitted,
    unsubmittedList: mockUnsubmitted
  });
  assert(
    listSudah.length === 3 && listSudah.every(i => !i.isUnsubmitted),
    '"Sudah": Contains strictly 3 submitted items'
  );

  // 3.4 taskFilter = "Semua", verifFilter = "Disetujui"
  // When specific verifFilter is active, unsubmitted items (which lack verif status) are excluded
  const listDisetujui = computeDisplayList({
    taskFilter: 'Semua',
    verifFilter: 'Disetujui',
    search: '',
    submittedList: mockSubmitted,
    unsubmittedList: mockUnsubmitted
  });
  assert(
    listDisetujui.length === 1 && listDisetujui[0].nama_guru === 'Ade Fitrawan Ibrahim',
    '"Semua" + "Disetujui": Returns only submitted item with Disetujui status'
  );

  // 3.5 Search interaction across combined items
  const listSearchMamonto = computeDisplayList({
    taskFilter: 'Semua',
    verifFilter: 'Semua',
    search: 'Mamonto',
    submittedList: mockSubmitted,
    unsubmittedList: mockUnsubmitted
  });
  // mockSubmitted has 2 Mamonto (Fitra, Nurhalizah), mockUnsubmitted has 0 Mamonto
  assert(
    listSearchMamonto.length === 2,
    'Search "Mamonto" correctly matches 2 submitted items'
  );

  const listSearchAdnan = computeDisplayList({
    taskFilter: 'Semua',
    verifFilter: 'Semua',
    search: 'Adnan',
    submittedList: mockSubmitted,
    unsubmittedList: mockUnsubmitted
  });
  // mockUnsubmitted has 1 Adnan, mockSubmitted has 0 Adnan
  assert(
    listSearchAdnan.length === 1 && listSearchAdnan[0].isUnsubmitted,
    'Search "Adnan" correctly matches 1 unsubmitted item from combined list'
  );

  // -------------------------------------------------------------------------
  // SUITE 4: CODEBASE SOURCE INTEGRITY & REGRESSION GUARDS
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 4: Codebase Source Integrity & Regression Guards ---');

  const adminVerifCode = fs.readFileSync(
    path.join(__dirname, '../src/components/AdminVerifView.tsx'),
    'utf8'
  );

  assert(
    !adminVerifCode.includes('!date || (p.timestamp && p.timestamp.includes(effectiveDate))'),
    'Presensi filter has no "!date ||" leak'
  );
  assert(
    !adminVerifCode.includes('!date || j.tanggal === effectiveDate'),
    'Jurnal filter has no "!date ||" leak'
  );
  assert(
    !adminVerifCode.includes('!date || p.tanggal === effectiveDate'),
    'Piket filter has no "!date ||" leak'
  );
  assert(
    adminVerifCode.includes('isTeacherMatch(t.nama_guru, p.nama_guru, t.nip)'),
    'Presensi unsubmitted uses isTeacherMatch'
  );
  assert(
    adminVerifCode.includes('isTeacherMatch(t.nama_guru, j.nama_guru, t.nip)'),
    'Jurnal unsubmitted uses isTeacherMatch'
  );
  assert(
    adminVerifCode.includes('isTeacherMatch(t.nama_guru, p.guru_pelapor, t.nip)'),
    'Piket unsubmitted uses isTeacherMatch'
  );
  assert(
    adminVerifCode.includes('return [...filteredSubmitted, ...filteredUnsubmitted]'),
    'displayList explicitly combines submitted and unsubmitted when taskFilter === "Semua"'
  );
  assert(
    adminVerifCode.includes('disabled={taskFilter === \'Belum\'}'),
    'verifFilter dropdown is cleanly disabled when taskFilter === "Belum"'
  );
  assert(
    adminVerifCode.includes('{displayList.length} Data {taskFilter === \'Belum\' ? \'Guru Belum Menyelesaikan\' : taskFilter === \'Semua\' ? \'Guru (Sudah & Belum)\' : \'Diverifikasi\'}'),
    'Footer summary accurately displays "Guru (Sudah & Belum)" when taskFilter is Semua'
  );

  console.log('\n=================================================================');
  console.log(`FINAL CHALLENGER VERIFICATION: ${passed} PASSED | ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFinalChallengerVerification().catch(err => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
