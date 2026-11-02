/**
 * Adversarial Empirical Verification & Stress Test Suite for Milestone 2 (M2)
 * Scope: Sistem Blok Flexible Target Scopes & Time Range Masking
 *
 * Requirements Tested:
 * 1. Target Scopes: Sekolah, Angkatan, Kelas, Guru
 * 2. Time Range Masking: Full Day vs Bounded Hours, Boundary Intersections, Format Resilience
 * 3. Mixed Schedule Isolation Matrix: Multiple Concurrent Rules, Affected vs Unaffected
 * 4. Boundary & Defensive Invariants: Nulls, Undefined, Malformed Tokens, False Positive Prevention
 */

import {
  isKelasInAngkatan,
  isTimeRangeOverlap,
  parseTimeToMinutes,
  evaluateScheduleBlock,
  getActiveSistemBloks,
  getActiveSistemBlok,
  type ScheduleBlockEvaluation,
} from '../src/lib/workflow';
import type { SistemBlok } from '../src/types/database';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string, detail?: any) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${message}`, detail || '');
    failCount++;
  }
}

async function runAdversarialStressTests() {
  console.log('====================================================');
  console.log('CHALLENGER M2: ADVERSARIAL STRESS TEST & VERIFICATION');
  console.log('Testing: Matching, Time Overlap, Isolation, Boundaries');
  console.log('====================================================\n');

  // =========================================================================
  // 1. TARGET MATCHING: WHOLE SCHOOL (sekolah / keseluruhan / default)
  // =========================================================================
  console.log('--- 1. Target Matching: Whole School ---');

  const schoolRule: SistemBlok = {
    id: 'rule-school-1',
    sekolah_id: 'school-uuid-1',
    nama_kegiatan: 'Upacara Hardiknas',
    deskripsi: 'Libur KBM sekolah',
    tanggal_mulai: '2026-11-02',
    tanggal_selesai: '2026-11-02',
    tipe_target: 'sekolah',
    target_angkatan: null,
    target_kelas: null,
    target_guru_id: null,
    target_guru_nama: null,
    is_full_day: true,
    jam_mulai: null,
    jam_selesai: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const dummyTeacher = {
    id: 'teacher-1',
    user_id: 'teacher-user-1',
    nama: 'Budi Santoso, M.Pd',
  };

  // Whole school must match arbitrary classes and teachers
  const schoolTestClasses = [
    'X Merdeka',
    'XI RPL 1',
    'XII TITL 2',
    '7A',
    '8B',
    '9C',
    'Kelas Akselerasi',
    '',
    undefined,
  ];

  for (const c of schoolTestClasses) {
    const res = evaluateScheduleBlock({ kelas: c, jam_mulai: '07:30', jam_selesai: '09:00' }, dummyTeacher, [schoolRule]);
    assert(res.isBlocked, `Whole school blocks class "${c ?? 'undefined'}"`);
  }

  // Also verify alias 'keseluruhan' and empty tipe_target defaults to whole school
  const aliasSchoolRule: any = { ...schoolRule, id: 'rule-school-alias', tipe_target: 'keseluruhan' };
  assert(
    evaluateScheduleBlock({ kelas: 'XII TKJ' }, dummyTeacher, [aliasSchoolRule]).isBlocked,
    'tipe_target "keseluruhan" is treated as whole school'
  );

  const defaultSchoolRule: any = { ...schoolRule, id: 'rule-school-default', tipe_target: undefined };
  assert(
    evaluateScheduleBlock({ kelas: 'VII-A' }, dummyTeacher, [defaultSchoolRule]).isBlocked,
    'undefined tipe_target defaults to whole school'
  );

  // =========================================================================
  // 2. TARGET MATCHING: ANGKATAN & COHORT ISOLATION (isKelasInAngkatan)
  // =========================================================================
  console.log('\n--- 2. Target Matching: Angkatan & Strict Cohort Isolation ---');

  // 2.1 Grade 10 / X
  const grade10Matches = [
    'X Merdeka', 'X RPL 1', '10 RPL 2', 'Kelas 10-A', '10.TKJ', 'X.1', 'x', '10', 'Kelas X', 'X-Merdeka-1'
  ];
  for (const k of grade10Matches) {
    assert(isKelasInAngkatan(k, '10'), `Grade 10 matches "${k}" with target "10"`);
    assert(isKelasInAngkatan(k, 'X'), `Grade 10 matches "${k}" with target "X"`);
  }

  // 2.2 Grade 11 / XI
  const grade11Matches = [
    'XI RPL 1', 'XI TKJ 2', '11 IPA 3', 'Kelas 11-B', 'XI.2', 'xi', '11', 'Kelas XI', 'XI-MIPA-2'
  ];
  for (const k of grade11Matches) {
    assert(isKelasInAngkatan(k, '11'), `Grade 11 matches "${k}" with target "11"`);
    assert(isKelasInAngkatan(k, 'XI'), `Grade 11 matches "${k}" with target "XI"`);
  }

  // 2.3 Grade 12 / XII
  const grade12Matches = [
    'XII TITL', '12 Akuntansi', 'XII-3', '12.1', 'xii', '12', 'Kelas XII', 'XII RPL 2'
  ];
  for (const k of grade12Matches) {
    assert(isKelasInAngkatan(k, '12'), `Grade 12 matches "${k}" with target "12"`);
    assert(isKelasInAngkatan(k, 'XII'), `Grade 12 matches "${k}" with target "XII"`);
  }

  // 2.4 Junior High: 7 / VII, 8 / VIII, 9 / IX
  assert(isKelasInAngkatan('7A', '7') && isKelasInAngkatan('VII-B', '7') && isKelasInAngkatan('VII B', 'VII'), 'Grade 7 matches 7/VII variants');
  assert(isKelasInAngkatan('8C', '8') && isKelasInAngkatan('VIII.1', '8') && isKelasInAngkatan('VIII-B', 'VIII'), 'Grade 8 matches 8/VIII variants');
  assert(isKelasInAngkatan('9D', '9') && isKelasInAngkatan('IX-3', '9') && isKelasInAngkatan('IX.A', 'IX'), 'Grade 9 matches 9/IX variants');

  // 2.5 Primary: 1..6 / I..VI
  assert(isKelasInAngkatan('1A', '1') && isKelasInAngkatan('Kelas I', '1'), 'Grade 1 matches 1/I');
  assert(isKelasInAngkatan('2B', '2') && isKelasInAngkatan('Kelas II', '2'), 'Grade 2 matches 2/II');
  assert(isKelasInAngkatan('3C', '3') && isKelasInAngkatan('Kelas III', '3'), 'Grade 3 matches 3/III');
  assert(isKelasInAngkatan('4D', '4') && isKelasInAngkatan('Kelas IV', '4'), 'Grade 4 matches 4/IV');
  assert(isKelasInAngkatan('5E', '5') && isKelasInAngkatan('Kelas V', '5'), 'Grade 5 matches 5/V');
  assert(isKelasInAngkatan('6F', '6') && isKelasInAngkatan('Kelas VI', '6'), 'Grade 6 matches 6/VI');

  // 2.6 Adversarial False Positive Prevention (STRICT ISOLATION)
  // X or 10 MUST NEVER match XI, XII, 100, 101, etc.
  assert(!isKelasInAngkatan('XI RPL 1', '10'), 'Adversarial: Target "10" does NOT match "XI RPL 1"');
  assert(!isKelasInAngkatan('XI RPL 1', 'X'), 'Adversarial: Target "X" does NOT match "XI RPL 1"');
  assert(!isKelasInAngkatan('XII TKJ', '10'), 'Adversarial: Target "10" does NOT match "XII TKJ"');
  assert(!isKelasInAngkatan('XII TKJ', 'X'), 'Adversarial: Target "X" does NOT match "XII TKJ"');
  assert(!isKelasInAngkatan('100 RPL', '10'), 'Adversarial: Target "10" does NOT match "100 RPL"');
  assert(!isKelasInAngkatan('101 TKJ', '10'), 'Adversarial: Target "10" does NOT match "101 TKJ"');
  assert(!isKelasInAngkatan('X Merdeka', '11'), 'Adversarial: Target "11" does NOT match "X Merdeka"');
  assert(!isKelasInAngkatan('X Merdeka', 'XI'), 'Adversarial: Target "XI" does NOT match "X Merdeka"');
  assert(!isKelasInAngkatan('XII TKJ', '11'), 'Adversarial: Target "11" does NOT match "XII TKJ"');
  assert(!isKelasInAngkatan('XII TKJ', 'XI'), 'Adversarial: Target "XI" does NOT match "XII TKJ"');
  assert(!isKelasInAngkatan('110 TKJ', '11'), 'Adversarial: Target "11" does NOT match "110 TKJ"');
  assert(!isKelasInAngkatan('X Merdeka', '12'), 'Adversarial: Target "12" does NOT match "X Merdeka"');
  assert(!isKelasInAngkatan('XI RPL 1', '12'), 'Adversarial: Target "12" does NOT match "XI RPL 1"');
  assert(!isKelasInAngkatan('120 RPL', '12'), 'Adversarial: Target "12" does NOT match "120 RPL"');

  // Junior High false positive prevention
  assert(!isKelasInAngkatan('8A', '7'), 'Target "7" does NOT match "8A"');
  assert(!isKelasInAngkatan('17A', '7'), 'Target "7" does NOT match "17A"');
  assert(!isKelasInAngkatan('70A', '7'), 'Target "7" does NOT match "70A"');
  assert(!isKelasInAngkatan('VII-A', 'VIII'), 'Target "VIII" does NOT match "VII-A"');
  assert(!isKelasInAngkatan('VIII-B', 'IX'), 'Target "IX" does NOT match "VIII-B"');

  // Defensive input validation
  assert(!isKelasInAngkatan(null, '10'), 'null kelas returns false safely');
  assert(!isKelasInAngkatan(undefined, '10'), 'undefined kelas returns false safely');
  assert(!isKelasInAngkatan('', '10'), 'empty string kelas returns false safely');
  assert(!isKelasInAngkatan('   ', '10'), 'whitespace kelas returns false safely');
  assert(!isKelasInAngkatan('X RPL 1', ''), 'empty angkatan returns false safely');
  assert(!isKelasInAngkatan('X RPL 1', null as any), 'null angkatan returns false safely');

  // =========================================================================
  // 3. TARGET MATCHING: KELAS & STRICT CLASS ISOLATION
  // =========================================================================
  console.log('\n--- 3. Target Matching: Kelas & Strict Class Isolation ---');

  const ruleKelasXMerdeka: SistemBlok = {
    id: 'rule-kelas-1',
    sekolah_id: 'school-uuid-1',
    nama_kegiatan: 'Kunjungan Industri X RPL 1',
    deskripsi: 'Kegiatan di PT Telkom',
    tanggal_mulai: '2026-11-02',
    tanggal_selesai: '2026-11-02',
    tipe_target: 'kelas',
    target_angkatan: null,
    target_kelas: 'X RPL 1',
    target_guru_id: null,
    target_guru_nama: null,
    is_full_day: true,
    jam_mulai: null,
    jam_selesai: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Exact matching (case-insensitive & trimmed)
  assert(evaluateScheduleBlock({ kelas: 'X RPL 1' }, dummyTeacher, [ruleKelasXMerdeka]).isBlocked, 'Exact class "X RPL 1" matches');
  assert(evaluateScheduleBlock({ kelas: 'x rpl 1' }, dummyTeacher, [ruleKelasXMerdeka]).isBlocked, 'Lowercase class "x rpl 1" matches');
  assert(evaluateScheduleBlock({ kelas: '  X RPL 1  ' }, dummyTeacher, [ruleKelasXMerdeka]).isBlocked, 'Untrimmed class "  X RPL 1  " matches');

  // Strict isolation: Other classes MUST NOT be blocked
  const nonTargetClasses = ['X RPL 2', 'XI RPL 1', 'X RPL', 'X RPL 10', 'X Merdeka', 'XII TKJ 1'];
  for (const c of nonTargetClasses) {
    const res = evaluateScheduleBlock({ kelas: c }, dummyTeacher, [ruleKelasXMerdeka]);
    assert(!res.isBlocked, `Class target "X RPL 1" does NOT block "${c}"`);
  }

  // Defensive: empty or null target_kelas in rule
  const emptyTargetKelasRule: any = { ...ruleKelasXMerdeka, target_kelas: null };
  assert(!evaluateScheduleBlock({ kelas: 'X RPL 1' }, dummyTeacher, [emptyTargetKelasRule]).isBlocked, 'Null target_kelas in rule blocks nothing');

  // =========================================================================
  // 4. TARGET MATCHING: GURU & STRICT TEACHER ISOLATION
  // =========================================================================
  console.log('\n--- 4. Target Matching: Guru & Strict Teacher Isolation ---');

  const targetGuruUUID = 'f8992e62-c0e9-4e67-9c94-0cfb3f946d4a';
  const targetGuruName = 'Siti Nurhaliza, S.Pd';

  const ruleGuru: SistemBlok = {
    id: 'rule-guru-1',
    sekolah_id: 'school-uuid-1',
    nama_kegiatan: 'Pelatihan Instruktur Guru Penggerak',
    deskripsi: 'Lokakarya 4',
    tanggal_mulai: '2026-11-02',
    tanggal_selesai: '2026-11-02',
    tipe_target: 'guru',
    target_angkatan: null,
    target_kelas: null,
    target_guru_id: targetGuruUUID,
    target_guru_nama: targetGuruName,
    is_full_day: true,
    jam_mulai: null,
    jam_selesai: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 4.1 Matches targeted teacher by ID
  const targetedTeacherById = {
    id: targetGuruUUID,
    user_id: 'user-siti-123',
    nama: 'Siti Nurhaliza',
  };
  const evalById = evaluateScheduleBlock({ kelas: 'X RPL 1' }, targetedTeacherById, [ruleGuru]);
  assert(evalById.isBlocked, 'Target guru blocks teacher matching target_guru_id');

  // 4.2 Matches targeted teacher by schedule user_id / guru_id
  const evalBySchedId = evaluateScheduleBlock(
    { kelas: 'X RPL 1', guru_id: targetGuruUUID },
    { id: 'diff-id', nama: 'Different Name' },
    [ruleGuru]
  );
  assert(evalBySchedId.isBlocked, 'Target guru blocks schedule matching guru_id');

  // 4.3 Matches targeted teacher by name
  const targetedTeacherByName = {
    id: 'diff-id-uuid',
    nama: 'Siti Nurhaliza, S.Pd',
  };
  const evalByName = evaluateScheduleBlock({ kelas: 'X RPL 1' }, targetedTeacherByName, [ruleGuru]);
  assert(evalByName.isBlocked, 'Target guru blocks teacher matching target_guru_nama');

  // 4.4 Strict isolation: Different teacher MUST NOT be blocked
  const unrelatedTeacher = {
    id: 'e1111111-2222-3333-4444-555555555555',
    user_id: 'unrelated-user-uuid',
    nama: 'Ahmad Dahlan, M.Kom',
  };
  const evalUnrelated = evaluateScheduleBlock(
    { kelas: 'X RPL 1', nama_guru: 'Ahmad Dahlan' },
    unrelatedTeacher,
    [ruleGuru]
  );
  assert(!evalUnrelated.isBlocked, 'Target guru does NOT block unrelated teacher (Ahmad Dahlan)');

  // =========================================================================
  // 5. TIME RANGE PARSING & OVERLAP TESTS (parseTimeToMinutes, isTimeRangeOverlap)
  // =========================================================================
  console.log('\n--- 5. Time Range Parsing & Boundary Overlap Tests ---');

  // 5.1 Parsing formats
  assert(parseTimeToMinutes('07:30') === 450, 'parseTimeToMinutes: "07:30" = 450 min');
  assert(parseTimeToMinutes('07.30') === 450, 'parseTimeToMinutes: "07.30" = 450 min (dot format)');
  assert(parseTimeToMinutes('7:30') === 450, 'parseTimeToMinutes: "7:30" = 450 min (single digit hour)');
  assert(parseTimeToMinutes('13:45') === 825, 'parseTimeToMinutes: "13:45" = 825 min');
  assert(parseTimeToMinutes('13.45') === 825, 'parseTimeToMinutes: "13.45" = 825 min (dot format)');
  assert(parseTimeToMinutes(' 08:00 ') === 480, 'parseTimeToMinutes: trimmed " 08:00 " = 480 min');
  assert(parseTimeToMinutes(null, 100) === 100, 'parseTimeToMinutes: null returns fallback');
  assert(parseTimeToMinutes('invalid', 200) === 200, 'parseTimeToMinutes: invalid string returns fallback');

  // 5.2 Full Day Behavior
  // Full-day block overlaps with ANY schedule regardless of time
  assert(
    isTimeRangeOverlap('07:30', '09:00', '08:00', '10:00', true),
    'Full-day (is_full_day: true) overlaps with schedule even if times differ'
  );
  assert(
    isTimeRangeOverlap('13:00', '15:00', null, null, false),
    'Unbounded block hours (null, null) defaults to full-day overlap'
  );
  assert(
    isTimeRangeOverlap(null, null, '08:00', '11:00', false),
    'Schedule with null hours defaults to overlap with active block'
  );

  // 5.3 Bounded Hours Overlap Matrix (Block: 07:30 - 11:00 = [450, 660])
  const bStart = '07:30';
  const bEnd = '11:00';

  // Case 1: Strictly inside block (08:00 - 09:30)
  assert(
    isTimeRangeOverlap('08:00', '09:30', bStart, bEnd, false),
    'Overlapping: Schedule strictly inside block interval (08:00 - 09:30) -> OVERLAPS'
  );

  // Case 2: Schedule overlaps start boundary (07:00 - 08:30)
  assert(
    isTimeRangeOverlap('07:00', '08:30', bStart, bEnd, false),
    'Overlapping: Schedule straddles block start (07:00 - 08:30) -> OVERLAPS'
  );

  // Case 3: Schedule overlaps end boundary (10:30 - 11:30)
  assert(
    isTimeRangeOverlap('10:30', '11:30', bStart, bEnd, false),
    'Overlapping: Schedule straddles block end (10:30 - 11:30) -> OVERLAPS'
  );

  // Case 4: Schedule completely encloses block (07:00 - 12:00)
  assert(
    isTimeRangeOverlap('07:00', '12:00', bStart, bEnd, false),
    'Overlapping: Schedule completely encloses block (07:00 - 12:00) -> OVERLAPS'
  );

  // Case 5: Exact boundary touch at start (06:00 - 07:30)
  // Schedule ends exactly when block starts: interval [360, 450) and [450, 660) do NOT overlap
  assert(
    !isTimeRangeOverlap('06:00', '07:30', bStart, bEnd, false),
    'Boundary: Schedule ends exactly when block starts (06:00 - 07:30) -> DOES NOT OVERLAP'
  );

  // Case 6: Exact boundary touch at end (11:00 - 12:30)
  // Schedule starts exactly when block ends: interval [660, 750) and [450, 660) do NOT overlap
  assert(
    !isTimeRangeOverlap('11:00', '12:30', bStart, bEnd, false),
    'Boundary: Schedule starts exactly when block ends (11:00 - 12:30) -> DOES NOT OVERLAP'
  );

  // Case 7: Afternoon class strictly after block (12:30 - 14:00)
  assert(
    !isTimeRangeOverlap('12:30', '14:00', bStart, bEnd, false),
    'Isolation: Afternoon schedule after morning block (12:30 - 14:00) -> DOES NOT OVERLAP'
  );

  // Case 8: Early morning class strictly before block (05:30 - 07:00)
  assert(
    !isTimeRangeOverlap('05:30', '07:00', bStart, bEnd, false),
    'Isolation: Early schedule before block (05:30 - 07:00) -> DOES NOT OVERLAP'
  );

  // Case 9: Dot notation support in overlap check
  assert(
    isTimeRangeOverlap('08.00', '09.30', '07.30', '11.00', false),
    'Format Resilience: Dot notation in schedule & block times overlaps correctly'
  );

  // =========================================================================
  // 6. GRANULAR MULTI-RULE WORKFLOW MATRIX (evaluateScheduleBlock)
  // =========================================================================
  console.log('\n--- 6. Granular Multi-Rule Workflow Matrix ---');

  // Define concurrent active rules:
  // Rule 1: Angkatan 10 morning block (07:30 - 10:00)
  const ruleAngkatan10Morning: SistemBlok = {
    id: 'rule-angkatan-10-morning',
    sekolah_id: 'school-uuid-1',
    nama_kegiatan: 'P5 Angkatan 10 Pagi',
    deskripsi: 'Projek Penguatan Profil Pelajar Pancasila',
    tanggal_mulai: '2026-11-02',
    tanggal_selesai: '2026-11-02',
    tipe_target: 'angkatan',
    target_angkatan: '10',
    target_kelas: null,
    target_guru_id: null,
    target_guru_nama: null,
    is_full_day: false,
    jam_mulai: '07:30',
    jam_selesai: '10:00',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Rule 2: Guru Pak Budi afternoon block (11:00 - 14:00)
  const ruleGuruBudiAfternoon: SistemBlok = {
    id: 'rule-guru-budi-afternoon',
    sekolah_id: 'school-uuid-1',
    nama_kegiatan: 'Rapat MGMP Pak Budi',
    deskripsi: 'Musyawarah Guru Mata Pelajaran',
    tanggal_mulai: '2026-11-02',
    tanggal_selesai: '2026-11-02',
    tipe_target: 'guru',
    target_angkatan: null,
    target_kelas: null,
    target_guru_id: 'uuid-pak-budi',
    target_guru_nama: 'Pak Budi',
    is_full_day: false,
    jam_mulai: '11:00',
    jam_selesai: '14:00',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const activeRulesList = [ruleAngkatan10Morning, ruleGuruBudiAfternoon];

  const teacherBuSiti = { id: 'uuid-bu-siti', nama: 'Bu Siti' };
  const teacherPakBudi = { id: 'uuid-pak-budi', nama: 'Pak Budi' };

  // Scenario 6.1: Bu Siti teaches Class X in morning (08:00 - 09:30)
  // Target: Angkatan 10 matches Class X. Time: 08:00-09:30 overlaps 07:30-10:00.
  // EXPECTATION: BLOCKED by Rule 1.
  const evalSitiMorning = evaluateScheduleBlock(
    { kelas: 'X Merdeka', jam_mulai: '08:00', jam_selesai: '09:30' },
    teacherBuSiti,
    activeRulesList
  );
  assert(evalSitiMorning.isBlocked, 'Multi-Rule: Bu Siti morning Class X is BLOCKED by Angkatan 10 rule');
  assert(evalSitiMorning.blockRule?.id === 'rule-angkatan-10-morning', 'Multi-Rule: Attributed to Angkatan 10 rule');

  // Scenario 6.2: Bu Siti teaches Class X in afternoon (12:30 - 14:00)
  // Target: Angkatan 10 matches Class X. BUT Time: 12:30-14:00 is after 10:00!
  // Rule 2 is for Pak Budi, not Bu Siti.
  // EXPECTATION: UNBLOCKED!
  const evalSitiAfternoon = evaluateScheduleBlock(
    { kelas: 'X Merdeka', jam_mulai: '12:30', jam_selesai: '14:00' },
    teacherBuSiti,
    activeRulesList
  );
  assert(
    !evalSitiAfternoon.isBlocked,
    'Multi-Rule: Bu Siti afternoon Class X is UNBLOCKED (after block hours)',
    evalSitiAfternoon
  );

  // Scenario 6.3: Bu Siti teaches Class XI in morning (08:00 - 09:30)
  // Target: Class XI is not Angkatan 10. Bu Siti is not Pak Budi.
  // EXPECTATION: UNBLOCKED!
  const evalSitiClassXI = evaluateScheduleBlock(
    { kelas: 'XI RPL 1', jam_mulai: '08:00', jam_selesai: '09:30' },
    teacherBuSiti,
    activeRulesList
  );
  assert(!evalSitiClassXI.isBlocked, 'Multi-Rule: Bu Siti morning Class XI is UNBLOCKED (cohort isolation)');

  // Scenario 6.4: Pak Budi teaches Class XI in afternoon (11:30 - 13:00)
  // Target: Pak Budi matches Rule 2. Time: 11:30-13:00 overlaps 11:00-14:00.
  // EXPECTATION: BLOCKED by Rule 2.
  const evalBudiAfternoon = evaluateScheduleBlock(
    { kelas: 'XI RPL 1', jam_mulai: '11:30', jam_selesai: '13:00' },
    teacherPakBudi,
    activeRulesList
  );
  assert(evalBudiAfternoon.isBlocked, 'Multi-Rule: Pak Budi afternoon Class XI is BLOCKED by Guru Budi rule');
  assert(evalBudiAfternoon.blockRule?.id === 'rule-guru-budi-afternoon', 'Multi-Rule: Attributed to Guru Budi rule');

  // Scenario 6.5: Pak Budi teaches Class XI in early morning (07:00 - 08:30)
  // Target: Class XI not Angkatan 10. Pak Budi's block starts at 11:00.
  // EXPECTATION: UNBLOCKED!
  const evalBudiMorning = evaluateScheduleBlock(
    { kelas: 'XI RPL 1', jam_mulai: '07:00', jam_selesai: '08:30' },
    teacherPakBudi,
    activeRulesList
  );
  assert(!evalBudiMorning.isBlocked, 'Multi-Rule: Pak Budi morning Class XI is UNBLOCKED (before teacher block hours)');

  // =========================================================================
  // 7. EMPTY / EDGE CASE HARNESS
  // =========================================================================
  console.log('\n--- 7. Empty & Edge Case Boundary Harness ---');

  // Empty active blocks array
  assert(!evaluateScheduleBlock({ kelas: 'X RPL 1' }, dummyTeacher, []).isBlocked, 'Empty activeBloks returns isBlocked: false');
  assert(!evaluateScheduleBlock({ kelas: 'X RPL 1' }, dummyTeacher, null as any).isBlocked, 'Null activeBloks returns isBlocked: false');

  // Schedule with completely undefined attributes
  assert(
    evaluateScheduleBlock({}, dummyTeacher, [schoolRule]).isBlocked,
    'Empty schedule object with whole-school rule evaluates without crashing and is blocked'
  );

  // Teacher with completely undefined attributes
  const evalEmptyTeacher = evaluateScheduleBlock({ kelas: 'XI RPL 1' }, {}, [ruleGuru]);
  assert(
    !evalEmptyTeacher.isBlocked,
    'Empty teacher object with teacher-targeted rule evaluates safely to unblocked',
    evalEmptyTeacher
  );

  console.log('\n====================================================');
  console.log(`TOTAL ADVERSARIAL STRESS TESTS: ${passCount + failCount}`);
  console.log(`PASSED: ${passCount}`);
  console.log(`FAILED: ${failCount}`);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAdversarialStressTests().catch(err => {
  console.error('Unhandled failure in stress tests:', err);
  process.exit(1);
});
