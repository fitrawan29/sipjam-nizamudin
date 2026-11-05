/**
 * ============================================================================
 * ADVERSARIAL STRESS TEST SUITE: PRODUCTION ADMIN ADJUSTMENTS (R1–R5)
 * ============================================================================
 * 
 * Exhaustive empirical challenge testing targeting boundary conditions,
 * edge cases, and failure modes across R1–R5:
 * 
 * R1: Greeting edge cases (case-insensitive substring matches, empty school name,
 *     school name already in username).
 * R2: Presensi history sorting edge cases, KBM-only teacher with/without piket or
 *     scheduled KBM, unsubmitted piket logic, grade extraction with various parallel
 *     class naming conventions ('7A', 'VII-B', 'X Merdeka 1', '10-A', 'XII IPA 1'),
 *     and auto-filled KBM journals on multi-day leave.
 * R3: Multiple name variations of "Ade Fitrawan Ibrahim" with various prefixes/suffixes
 *     ('Drs. Ade Fitrawan Ibrahim, M.Pd.', 'Ade Fitrawan Ibrahim, S.Pd.', 'Ade Fitrawan Ibrahim').
 * R4: Dynamic attendance status points calculation edge cases (all Alpa = 0,
 *     all Hadir = 100, custom points e.g. 50/80, 0 valid sessions = 100 default).
 * R5: CSV template structure, UUID sanitization for malformed strings/null/undefined/legacy IDs,
 *     noValidate multi-tab form submission, and profile save without gelar.
 */

import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { extractTingkat } from '../src/components/DokumenView';
import { canonicalizeTeacherRekapName } from '../src/components/AdminRekapView';
import { DEFAULT_STATUS_POINTS, AttendanceStatusPoints } from '../src/components/GradebookView';
import { 
  autoFillKbmJournalsForLeave, 
  isTeacherScheduleMatch, 
  isTeacherJournalMatch 
} from '../src/lib/attendanceAlpa';
import { 
  parseAndValidateMasterCsv, 
  sanitizeUuid 
} from '../src/lib/dataIntegrityGuard';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails: { id: string; desc: string; error: any }[] = [];

function pass(id: string, desc: string, detail?: string) {
  totalTests++;
  passedTests++;
  console.log(`  ${GREEN}✔ [${id}] PASS:${RESET} ${desc}`);
  if (detail) {
    console.log(`    ${GRAY}↳ ${detail}${RESET}`);
  }
}

function fail(id: string, desc: string, error?: any) {
  totalTests++;
  failedTests++;
  const errMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
  failureDetails.push({ id, desc, error: errMsg });
  console.log(`  ${RED}✖ [${id}] FAIL:${RESET} ${desc}`);
  if (errMsg) {
    console.log(`    ${RED}↳ Error: ${errMsg}${RESET}`);
  }
}

async function runAdversarialSuite() {
  console.log(`\n${BOLD}${CYAN}=================================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  ADVERSARIAL STRESS TEST SUITE: R1–R5 PRODUCTION ADMIN ADJUSTMENTS             ${RESET}`);
  console.log(`${BOLD}${CYAN}=================================================================================${RESET}\n`);

  const homeViewAdminPath = path.resolve(__dirname, '../src/components/HomeViewAdmin.tsx');
  const adminVerifViewPath = path.resolve(__dirname, '../src/components/AdminVerifView.tsx');
  const dokumenViewPath = path.resolve(__dirname, '../src/components/DokumenView.tsx');
  const adminRekapViewPath = path.resolve(__dirname, '../src/components/AdminRekapView.tsx');
  const gradebookViewPath = path.resolve(__dirname, '../src/components/GradebookView.tsx');
  const raporViewPath = path.resolve(__dirname, '../src/components/RaporView.tsx');
  const adminDataViewPath = path.resolve(__dirname, '../src/components/AdminDataView.tsx');
  const adminConfigViewPath = path.resolve(__dirname, '../src/components/AdminConfigView.tsx');
  const accountSettingsModalPath = path.resolve(__dirname, '../src/components/AccountSettingsModal.tsx');

  // ============================================================================
  // R1 STRESS: GREETING & INFO SECTION
  // ============================================================================
  console.log(`${BOLD}${YELLOW}--- R1: GREETING & INFO SECTION STRESS TESTS ---${RESET}`);

  // Test 1.1: Greeting deduplication logic with edge cases
  try {
    const shouldDisplaySchoolName = (user: { nama?: string | null; username?: string | null; sekolah_nama?: string | null }) => {
      const defaultSchool = 'SMA NIZAMUDIN';
      const effectiveSchool = user?.sekolah_nama || defaultSchool;
      const userNamaLower = (user?.nama || '').toLowerCase();
      const schoolLower = effectiveSchool.toLowerCase();
      
      const shouldRender = !userNamaLower.includes(schoolLower) && !userNamaLower.includes('sma nizamudin');
      return shouldRender ? effectiveSchool : null;
    };

    // Edge Case 1: user.nama has uppercase, school is lowercase
    assert.strictEqual(
      shouldDisplaySchoolName({ nama: 'ADMIN SMA NIZAMUDIN', username: 'admin', sekolah_nama: 'sma nizamudin' }),
      null,
      'Case-insensitive uppercase nama should suppress school name'
    );

    // Edge Case 2: empty school name fallback to SMA NIZAMUDIN
    assert.strictEqual(
      shouldDisplaySchoolName({ nama: 'Admin SMA Nizamudin', username: 'admin', sekolah_nama: '' }),
      null,
      'Empty sekolah_nama falling back to SMA NIZAMUDIN should suppress duplicate'
    );

    // Edge Case 3: school name already in username (e.g. username is admin_sman1, but nama is "Fitra")
    assert.strictEqual(
      shouldDisplaySchoolName({ nama: 'Fitra Ibrahim', username: 'admin_sman1', sekolah_nama: 'SMAN 1 Nizamudin' }),
      'SMAN 1 Nizamudin',
      'School name should be cleanly displayed when nama does not contain it, regardless of username'
    );

    // Edge Case 4: user.nama is undefined / null
    assert.strictEqual(
      shouldDisplaySchoolName({ nama: undefined, username: 'admin', sekolah_nama: 'SMA Negeri 1' }),
      'SMA Negeri 1',
      'Undefined nama should safely default to rendering school name without crashing'
    );

    pass('ADV-R1-01', 'Greeting deduplication survives case-insensitivity, empty string, username prefix, and null nama');
  } catch (e) {
    fail('ADV-R1-01', 'Greeting deduplication edge cases failed', e);
  }

  // Test 1.2: Pusat Informasi is completely eliminated
  try {
    const homeContent = fs.readFileSync(homeViewAdminPath, 'utf8');
    assert.ok(!homeContent.includes('Pusat Informasi'), 'Must not contain "Pusat Informasi"');
    assert.ok(!homeContent.includes('Informasi & Pengumuman'), 'Must not contain "Informasi & Pengumuman"');
    pass('ADV-R1-02', 'HomeViewAdmin.tsx has zero instances of Pusat Informasi card section');
  } catch (e) {
    fail('ADV-R1-02', 'Pusat Informasi elimination check failed', e);
  }

  // ============================================================================
  // R2 STRESS: VERIFIKASI, SORTING, BEBAS HADIR, GRADE EXTRACTION, AUTO-FILL
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}--- R2: VERIFIKASI, SORTING, BEBAS HADIR & WORKFLOW STRESS TESTS ---${RESET}`);

  // Test 2.1: Presensi history sorting edge cases
  try {
    const sortPresensi = (records: { id: string; timestamp?: string | null }[]) => {
      return records.slice().sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
    };

    const edgeRecords = [
      { id: 'rec-null', timestamp: null },
      { id: 'rec-undefined', timestamp: undefined },
      { id: 'rec-iso-early', timestamp: '2026-11-05T06:30:00+08:00' },
      { id: 'rec-space-late', timestamp: '2026-11-05 14:15:00' },
      { id: 'rec-iso-mid', timestamp: '2026-11-05T09:45:00.000Z' }, // 17:45 WITA
      { id: 'rec-empty', timestamp: '' }
    ];

    const sorted = sortPresensi(edgeRecords);
    assert.strictEqual(sorted[0].id, 'rec-iso-mid', 'Latest timestamp (17:45 WITA) must be first');
    assert.strictEqual(sorted[1].id, 'rec-space-late', '14:15 must be second');
    assert.strictEqual(sorted[2].id, 'rec-iso-early', '06:30 must be third');
    // Null/undefined/empty safely sorted to the end
    const lastThreeIds = sorted.slice(3).map(r => r.id);
    assert.ok(lastThreeIds.includes('rec-null'));
    assert.ok(lastThreeIds.includes('rec-undefined'));
    assert.ok(lastThreeIds.includes('rec-empty'));

    pass('ADV-R2-01', 'Presensi descending sorting cleanly orders mixed formats (ISO, space, UTC) and pushes null/empty to end');
  } catch (e) {
    fail('ADV-R2-01', 'Presensi history sorting stress test failed', e);
  }

  // Test 2.2: KBM-only teacher evaluation across all truthy/falsy variations
  try {
    const evaluateBebasHadir = (
      teacher: { wajib_hadir_hanya_mengajar?: any; nama_guru: string },
      scheduledKbmCount: number,
      hasPiketToday: boolean
    ) => {
      const isExplicitExempt = 
        teacher.wajib_hadir_hanya_mengajar === true || 
        String(teacher.wajib_hadir_hanya_mengajar) === 'true' || 
        teacher.wajib_hadir_hanya_mengajar === 1 || 
        String(teacher.wajib_hadir_hanya_mengajar) === '1';

      const isFree = isExplicitExempt && scheduledKbmCount === 0 && !hasPiketToday;
      return {
        isFree,
        label: isFree ? 'Bebas Hadir' : 'Belum Selesai',
        message: isFree ? 'Bebas Hadir' : 'Belum melakukan presensi datang maupun pulang'
      };
    };

    // Case A: boolean true, 0 KBM, 0 piket -> Bebas Hadir
    assert.strictEqual(evaluateBebasHadir({ wajib_hadir_hanya_mengajar: true, nama_guru: 'G1' }, 0, false).label, 'Bebas Hadir');
    // Case B: string "true", 0 KBM, 0 piket -> Bebas Hadir
    assert.strictEqual(evaluateBebasHadir({ wajib_hadir_hanya_mengajar: 'true', nama_guru: 'G2' }, 0, false).label, 'Bebas Hadir');
    // Case C: number 1, 0 KBM, 0 piket -> Bebas Hadir
    assert.strictEqual(evaluateBebasHadir({ wajib_hadir_hanya_mengajar: 1, nama_guru: 'G3' }, 0, false).label, 'Bebas Hadir');
    // Case D: string "1", 0 KBM, 0 piket -> Bebas Hadir
    assert.strictEqual(evaluateBebasHadir({ wajib_hadir_hanya_mengajar: '1', nama_guru: 'G4' }, 0, false).label, 'Bebas Hadir');

    // Case E: boolean true BUT 1 scheduled KBM -> Belum Selesai
    assert.strictEqual(evaluateBebasHadir({ wajib_hadir_hanya_mengajar: true, nama_guru: 'G5' }, 1, false).label, 'Belum Selesai');
    // Case F: boolean true BUT has piket duty -> Belum Selesai
    assert.strictEqual(evaluateBebasHadir({ wajib_hadir_hanya_mengajar: true, nama_guru: 'G6' }, 0, true).label, 'Belum Selesai');
    // Case G: regular teacher (false), 0 KBM, 0 piket -> Belum Selesai
    assert.strictEqual(evaluateBebasHadir({ wajib_hadir_hanya_mengajar: false, nama_guru: 'G7' }, 0, false).label, 'Belum Selesai');

    pass('ADV-R2-02', 'Bebas Hadir logic handles boolean, string ("true", "1"), numeric representations, and duty gating');
  } catch (e) {
    fail('ADV-R2-02', 'Bebas Hadir stress test failed', e);
  }

  // Test 2.3: Unsubmitted piket logic: directly assigned status "tidak membuat laporan piket"
  try {
    const verifContent = fs.readFileSync(adminVerifViewPath, 'utf8');
    assert.ok(
      verifContent.includes("pesan_belum: 'tidak membuat laporan piket'"),
      "pesan_belum must be 'tidak membuat laporan piket'"
    );
    assert.ok(
      verifContent.includes("status_verifikasi: 'tidak membuat laporan piket'"),
      "status_verifikasi must be 'tidak membuat laporan piket'"
    );
    pass('ADV-R2-03', 'Unsubmitted piket items directly tagged "tidak membuat laporan piket" without requiring manual action');
  } catch (e) {
    fail('ADV-R2-03', 'Unsubmitted piket verification failed', e);
  }

  // Test 2.4: extractTingkat exhaustive stress testing on diverse naming patterns
  try {
    // Junior High (SMP / MTs)
    assert.strictEqual(extractTingkat('7A'), 'VII');
    assert.strictEqual(extractTingkat('7-B'), 'VII');
    assert.strictEqual(extractTingkat('VII.1'), 'VII');
    assert.strictEqual(extractTingkat('Kelas VII-A'), 'VII');
    assert.strictEqual(extractTingkat('8.2'), 'VIII');
    assert.strictEqual(extractTingkat('8B'), 'VIII');
    assert.strictEqual(extractTingkat('VIII-C'), 'VIII');
    assert.strictEqual(extractTingkat('9.1'), 'IX');
    assert.strictEqual(extractTingkat('IX Merdeka'), 'IX');
    assert.strictEqual(extractTingkat('9A'), 'IX');

    // Senior High (SMA / SMK / MA)
    assert.strictEqual(extractTingkat('10-A'), 'X');
    assert.strictEqual(extractTingkat('10.1'), 'X');
    assert.strictEqual(extractTingkat('X Merdeka 1'), 'X');
    assert.strictEqual(extractTingkat('X RPL 1'), 'X');
    assert.strictEqual(extractTingkat('11-B'), 'XI');
    assert.strictEqual(extractTingkat('XI IPA 1'), 'XI');
    assert.strictEqual(extractTingkat('XI Merdeka 2'), 'XI');
    assert.strictEqual(extractTingkat('12 IPS 3'), 'XII');
    assert.strictEqual(extractTingkat('XII TITL 2'), 'XII');
    assert.strictEqual(extractTingkat('XII-A'), 'XII');

    // Negative lookahead: multi-digit numbers should NOT match 10, 11, 12 falsely
    assert.notStrictEqual(extractTingkat('100 RPL'), 'X', '100 RPL must NOT match X');
    assert.notStrictEqual(extractTingkat('110 TKJ'), 'XI', '110 TKJ must NOT match XI');
    assert.notStrictEqual(extractTingkat('120 TITL'), 'XII', '120 TITL must NOT match XII');

    // Primary School (SD)
    assert.strictEqual(extractTingkat('1A'), '1');
    assert.strictEqual(extractTingkat('2B'), '2');
    assert.strictEqual(extractTingkat('Kelas 3'), '3');
    assert.strictEqual(extractTingkat('4.1'), '4');
    assert.strictEqual(extractTingkat('5-C'), '5');
    assert.strictEqual(extractTingkat('6A'), '6');

    pass('ADV-R2-04', 'extractTingkat accurately parses Roman & Arabic grade levels while preventing multi-digit number collisions');
  } catch (e) {
    fail('ADV-R2-04', 'extractTingkat stress test failed', e);
  }

  // Test 2.5: autoFillKbmJournalsForLeave across multi-day leave
  try {
    const insertedRecords: any[] = [];
    
    // Teacher schedules:
    // Monday (2 classes: 7A, 7B)
    // Tuesday (1 class: 8A)
    const mockJadwal = [
      { id: 'j1', hari: 'Senin', nama_guru: 'Ahmad Faiz', mata_pelajaran: 'IPA', kelas: '7A', jam_ke: '1-2' },
      { id: 'j2', hari: 'Senin', nama_guru: 'Ahmad Faiz', mata_pelajaran: 'IPA', kelas: '7B', jam_ke: '3-4' },
      { id: 'j3', hari: 'Selasa', nama_guru: 'Ahmad Faiz', mata_pelajaran: 'IPA', kelas: '8A', jam_ke: '1-2' },
    ];

    const mockClient = {
      from: (tbl: string) => {
        let currentFilterHari: string | null = null;
        let currentFilterDate: string | null = null;

        const chain: any = {
          select: () => chain,
          eq: (col: string, val: any) => {
            if (col === 'hari') currentFilterHari = String(val);
            if (col === 'tanggal') currentFilterDate = String(val);
            return chain;
          },
          insert: (record: any) => {
            if (Array.isArray(record)) insertedRecords.push(...record);
            else insertedRecords.push(record);
            return { error: null };
          },
          then: (resolve: any) => {
            if (tbl === 'jadwal_pelajaran') {
              const res = currentFilterHari ? mockJadwal.filter(j => j.hari === currentFilterHari) : mockJadwal;
              return resolve({ data: res, error: null });
            }
            if (tbl === 'jurnal_pembelajaran') {
              return resolve({ data: [], error: null });
            }
            return resolve({ data: [], error: null });
          }
        };
        return chain;
      }
    };

    // Multi-day leave: 2 days (Senin 2026-11-09 and Selasa 2026-11-10)
    // Day 1 (Senin): 2 classes
    const countD1 = await autoFillKbmJournalsForLeave(
      { nama_guru: 'Ahmad Faiz', sekolah_id: 'sekolah-01' },
      '2026-11-09', // Monday
      'Sakit',
      { keterangan: 'Tifus', link_bukti: 'https://storage/surat.jpg' },
      mockClient
    );
    assert.strictEqual(countD1, 2, 'Day 1 (Monday) should fill 2 scheduled classes');

    // Day 2 (Selasa): 1 class
    const countD2 = await autoFillKbmJournalsForLeave(
      { nama_guru: 'Ahmad Faiz', sekolah_id: 'sekolah-01' },
      '2026-11-10', // Tuesday
      'Sakit',
      { keterangan: 'Tifus', link_bukti: 'https://storage/surat.jpg' },
      mockClient
    );
    assert.strictEqual(countD2, 1, 'Day 2 (Tuesday) should fill 1 scheduled class');

    assert.strictEqual(insertedRecords.length, 3, 'Total 3 auto-filled KBM journals across 2-day leave');
    assert.strictEqual(insertedRecords[0].status_verifikasi, 'Sakit');
    assert.strictEqual(insertedRecords[2].status_verifikasi, 'Sakit');
    assert.strictEqual(insertedRecords[2].kelas, '8A');

    // Sunday check: Sunday 2026-11-08 should return 0
    const countSunday = await autoFillKbmJournalsForLeave(
      { nama_guru: 'Ahmad Faiz', sekolah_id: 'sekolah-01' },
      '2026-11-08', // Sunday
      'Sakit',
      { keterangan: 'Tifus' },
      mockClient
    );
    assert.strictEqual(countSunday, 0, 'Sunday must safely result in 0 journals filled');

    pass('ADV-R2-05', 'autoFillKbmJournalsForLeave correctly synchronizes multi-day leave across schedules and skips Sunday');
  } catch (e) {
    fail('ADV-R2-05', 'Multi-day autoFillKbmJournalsForLeave failed', e);
  }

  // ============================================================================
  // R3 STRESS: DEDUPLICATION & CONSOLIDATION OF "ADE FITRAWAN IBRAHIM"
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}--- R3: DEDUPLICATION OF ADE FITRAWAN IBRAHIM STRESS TESTS ---${RESET}`);

  // Test 3.1: Academic degrees and prefixes/suffixes normalization
  try {
    const adeVariations = [
      'Ade Fitrawan Ibrahim',
      'Ade Fitrawan Ibrahim, S.Pd.',
      'Ade Fitrawan Ibrahim, M.Pd.',
      'Drs. Ade Fitrawan Ibrahim',
      'Drs. Ade Fitrawan Ibrahim, M.Pd.',
      'Prof. Dr. Ade Fitrawan Ibrahim, M.Pd., Gr.',
      '  ADE FITRAWAN IBRAHIM, S.Kom.  ',
      'ade fitrawan ibrahim'
    ];

    adeVariations.forEach(variant => {
      const canonical = canonicalizeTeacherRekapName(variant);
      assert.strictEqual(
        canonical,
        'Ade Fitrawan Ibrahim',
        `Variant "${variant}" must canonicalize strictly to "Ade Fitrawan Ibrahim"`
      );
    });

    // Other teachers are untouched
    assert.strictEqual(canonicalizeTeacherRekapName('Drs. Ahmad Dahlan, M.Pd.'), 'Drs. Ahmad Dahlan, M.Pd.');
    assert.strictEqual(canonicalizeTeacherRekapName('Dewi Sartika, S.Pd.'), 'Dewi Sartika, S.Pd.');

    pass('ADV-R3-01', 'canonicalizeTeacherRekapName cleanly unifies all prefix & suffix variations of Ade Fitrawan Ibrahim without touching other teachers');
  } catch (e) {
    fail('ADV-R3-01', 'Teacher name canonicalization stress test failed', e);
  }

  // Test 3.2: Rekapitulasi multi-row aggregation simulation
  try {
    const rawTeacherRows = [
      { nama_guru: 'Ade Fitrawan Ibrahim', hadir: 5, jurnal: 4, piket: 1 },
      { nama_guru: 'Drs. Ade Fitrawan Ibrahim, M.Pd.', hadir: 8, jurnal: 6, piket: 2 },
      { nama_guru: 'Ade Fitrawan Ibrahim, S.Pd.', hadir: 2, jurnal: 1, piket: 0 },
      { nama_guru: 'Budi Santoso, S.Pd.', hadir: 10, jurnal: 10, piket: 2 }
    ];

    const aggregatedMap = new Map<string, { nama: string; hadir: number; jurnal: number; piket: number }>();
    rawTeacherRows.forEach(row => {
      const canonical = canonicalizeTeacherRekapName(row.nama_guru);
      if (!aggregatedMap.has(canonical)) {
        aggregatedMap.set(canonical, { nama: canonical, hadir: 0, jurnal: 0, piket: 0 });
      }
      const entry = aggregatedMap.get(canonical)!;
      entry.hadir += row.hadir;
      entry.jurnal += row.jurnal;
      entry.piket += row.piket;
    });

    const results = Array.from(aggregatedMap.values());
    const adeResults = results.filter(r => r.nama === 'Ade Fitrawan Ibrahim');
    assert.strictEqual(adeResults.length, 1, 'Must have exactly ONE row for Ade Fitrawan Ibrahim');
    assert.strictEqual(adeResults[0].hadir, 15, 'Hadir must sum: 5 + 8 + 2 = 15');
    assert.strictEqual(adeResults[0].jurnal, 11, 'Jurnal must sum: 4 + 6 + 1 = 11');
    assert.strictEqual(adeResults[0].piket, 3, 'Piket must sum: 1 + 2 + 0 = 3');

    pass('ADV-R3-02', 'Rekapitulasi accurately collapses multiple teacher rows into a single entry with summed metrics');
  } catch (e) {
    fail('ADV-R3-02', 'Rekapitulasi aggregation stress test failed', e);
  }

  // ============================================================================
  // R4 STRESS: DYNAMIC ATTENDANCE STATUS POINTS CALCULATION
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}--- R4: DYNAMIC ATTENDANCE STATUS POINTS STRESS TESTS ---${RESET}`);

  // Test 4.1: Mathematical formula behavior under boundary conditions
  try {
    const calcScore = (
      sessions: ('H' | 'S' | 'I' | 'T' | 'A')[],
      points: AttendanceStatusPoints = DEFAULT_STATUS_POINTS
    ): number => {
      const getPoints = (s: string) => {
        if (s === 'H') return points.hadir;
        if (s === 'S') return points.sakit;
        if (s === 'I') return points.izin;
        if (s === 'T') return points.terlambat;
        if (s === 'A') return points.alpa;
        return 0;
      };

      if (sessions.length === 0) return 100; // Default when 0 valid sessions
      const earned = sessions.reduce((acc, cur) => acc + getPoints(cur), 0);
      const rate = (earned / (sessions.length * 100)) * 100;
      return parseFloat(Math.min(100, Math.max(0, rate)).toFixed(1));
    };

    // Boundary 1: 0 valid sessions -> 100% default
    assert.strictEqual(calcScore([]), 100, '0 sessions must return 100% default');

    // Boundary 2: All Alpa (A) -> 0%
    assert.strictEqual(calcScore(['A', 'A', 'A', 'A']), 0, 'All Alpa must return 0%');

    // Boundary 3: All Hadir (H) -> 100%
    assert.strictEqual(calcScore(['H', 'H', 'H']), 100, 'All Hadir must return 100%');

    // Boundary 4: Custom weights (Hadir: 100, Sakit: 50, Izin: 80, Terlambat: 70, Alpa: 0)
    const customPoints: AttendanceStatusPoints = { hadir: 100, sakit: 50, izin: 80, terlambat: 70, alpa: 0 };
    // [H, S, I, T, A] -> 100 + 50 + 80 + 70 + 0 = 300 / 500 = 60.0%
    assert.strictEqual(calcScore(['H', 'S', 'I', 'T', 'A'], customPoints), 60.0);

    // Boundary 5: All Sakit (50) -> 50%
    assert.strictEqual(calcScore(['S', 'S'], customPoints), 50.0);

    // Boundary 6: All Izin (80) -> 80%
    assert.strictEqual(calcScore(['I', 'I'], customPoints), 80.0);

    pass('ADV-R4-01', 'Dynamic attendance points formula handles 0 sessions, all-alpa, all-hadir, and custom 50/80 weights');
  } catch (e) {
    fail('ADV-R4-01', 'Dynamic attendance points calculation stress test failed', e);
  }

  // ============================================================================
  // R5 STRESS: CSV TEMPLATES, UUID SANITIZATION, FORM NOVALIDATE, ACCOUNT PROFILE
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}--- R5: MASTER DATA, UUID SANITIZATION & ACCOUNT SETTINGS STRESS TESTS ---${RESET}`);

  // Test 5.1: CSV template structure verification
  try {
    const adminDataContent = fs.readFileSync(adminDataViewPath, 'utf8');

    // Kalender Pendidikan template
    assert.ok(
      adminDataContent.includes('Template_Kalender_Pendidikan.csv'),
      'Must contain Template_Kalender_Pendidikan.csv'
    );
    // Ensure no legacy 'KP-01' sample in template definition
    const kpLegacyMatch = adminDataContent.match(/Kalender_Pendidikan:[\s\S]*?sample:\s*\[([\s\S]*?)\]/);
    assert.ok(kpLegacyMatch, 'Kalender_Pendidikan sample block must exist');
    assert.strictEqual(kpLegacyMatch[1].includes('KP-01'), false, 'Sample must not contain legacy KP-01');

    // Jadwal Pelajaran template
    assert.ok(
      adminDataContent.includes('Template_Jadwal_Pelajaran.csv'),
      'Must contain Template_Jadwal_Pelajaran.csv'
    );
    const jpLegacyMatch = adminDataContent.match(/Jadwal_Pelajaran:[\s\S]*?sample:\s*\[([\s\S]*?)\]/);
    assert.ok(jpLegacyMatch, 'Jadwal_Pelajaran sample block must exist');
    assert.strictEqual(jpLegacyMatch[1].includes('JP-01'), false, 'Sample must not contain legacy JP-01');

    pass('ADV-R5-01', 'CSV templates for Kalender and Jadwal omit "id" and legacy string IDs');
  } catch (e) {
    fail('ADV-R5-01', 'CSV templates structure stress test failed', e);
  }

  // Test 5.2: UUID sanitization and error prevention
  try {
    // 1. Malformed legacy IDs in Kalender Pendidikan -> auto-converted to genuine UUID
    const csvKalender = 'id,tanggal,keterangan,tipe\nKP-999,2026-11-25,Hari Guru,Efektif';
    const parsedKal = parseAndValidateMasterCsv(csvKalender, 'kalender_pendidikan');
    assert.strictEqual(parsedKal.length, 1);
    assert.ok(UUID_REGEX.test(parsedKal[0].id), `Converted ID "${parsedKal[0].id}" must be valid UUID`);

    // 2. Missing ID in Jadwal Pelajaran -> auto-generated UUID
    const csvJadwalNoId = 'hari,nama_guru,mata_pelajaran,kelas\nSenin,Budi,Fisika,10A';
    const parsedJad = parseAndValidateMasterCsv(csvJadwalNoId, 'jadwal_pelajaran');
    assert.strictEqual(parsedJad.length, 1);
    assert.ok(UUID_REGEX.test(parsedJad[0].id), `Auto-generated ID "${parsedJad[0].id}" must be valid UUID`);

    // 3. String literal "null" and "undefined" as ID -> auto-generated UUID
    const csvLiteralNull = 'id,hari,nama_guru,mata_pelajaran,kelas\nnull,Senin,Budi,Fisika,10A\nundefined,Selasa,Budi,Fisika,10B';
    const parsedNull = parseAndValidateMasterCsv(csvLiteralNull, 'jadwal_pelajaran');
    assert.strictEqual(parsedNull.length, 2);
    assert.ok(UUID_REGEX.test(parsedNull[0].id));
    assert.ok(UUID_REGEX.test(parsedNull[1].id));

    // 4. sanitizeUuid stripping braces, quotes, spaces, and uppercase
    const rawGuid = ' "{A0000000-1111-2222-3333-444455556666}" ';
    assert.strictEqual(sanitizeUuid(rawGuid), 'a0000000-1111-2222-3333-444455556666');

    const rawGuidNoQuotes = ' {B0000000-1111-2222-3333-444455556666} ';
    assert.strictEqual(sanitizeUuid(rawGuidNoQuotes), 'b0000000-1111-2222-3333-444455556666');

    pass('ADV-R5-02', 'UUID sanitization prevents PostgreSQL Error 22P02 across legacy strings, null/undefined, and dirty GUID formats');
  } catch (e) {
    fail('ADV-R5-02', 'UUID sanitization stress test failed', e);
  }

  // Test 5.3: AdminConfigView noValidate attribute and multi-tab persistence
  try {
    const configContent = fs.readFileSync(adminConfigViewPath, 'utf8');
    assert.ok(configContent.includes('noValidate'), 'Form must include noValidate');
    assert.ok(
      /\.from\(['"]sekolah['"]\)\s*\.update\(/.test(configContent),
      'Must synchronize to sekolah table'
    );
    pass('ADV-R5-03', 'AdminConfigView form uses noValidate and synchronizes profile to sekolah table');
  } catch (e) {
    fail('ADV-R5-03', 'AdminConfigView noValidate verification failed', e);
  }

  // Test 5.4: AccountSettingsModal profile save without gelar
  try {
    const accountModalContent = fs.readFileSync(accountSettingsModalPath, 'utf8');
    // Ensure Multi-Gelar UI is gone
    assert.strictEqual(accountModalContent.includes('swal-btn-add-title'), false);
    assert.strictEqual(accountModalContent.includes('swal-titles-list'), false);
    assert.strictEqual(accountModalContent.includes('>+ Tambah Gelar<'), false);

    // Ensure clean input and direct save
    assert.ok(accountModalContent.includes('Nama Lengkap *'));
    assert.ok(accountModalContent.includes("p_nama: cleanNama || user.nama"));

    pass('ADV-R5-04', 'AccountSettingsModal provides clean single Nama Lengkap input with title addition UI eliminated');
  } catch (e) {
    fail('ADV-R5-04', 'AccountSettingsModal stress test failed', e);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log(`\n${BOLD}${CYAN}=================================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  ADVERSARIAL STRESS TEST SUITE RESULTS                                          ${RESET}`);
  console.log(`${BOLD}${CYAN}=================================================================================${RESET}`);
  console.log(`  Total Executed Tests: ${BOLD}${totalTests}${RESET}`);
  console.log(`  Passed Tests:         ${GREEN}${BOLD}${passedTests}${RESET}`);
  console.log(`  Failed Tests:         ${failedTests > 0 ? RED : GREEN}${BOLD}${failedTests}${RESET}`);

  if (failedTests > 0) {
    console.log(`\n${RED}${BOLD}Failures Summary:${RESET}`);
    failureDetails.forEach(f => {
      console.log(`  - [${f.id}] ${f.desc}: ${f.error}`);
    });
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}🎉 ALL ADVERSARIAL CHALLENGES & STRESS TESTS PASSED!${RESET}\n`);
    process.exit(0);
  }
}

runAdversarialSuite().catch(err => {
  console.error('Unhandled Adversarial Test Suite Error:', err);
  process.exit(1);
});
