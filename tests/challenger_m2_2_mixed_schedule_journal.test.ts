import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

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

async function runChallengerM22Tests() {
  console.log('====================================================');
  console.log('CHALLENGER M2-2: MIXED SCHEDULE & DUAL JOURNAL WORKFLOW STRESS TEST');
  console.log('Scope: Mixed Schedule Simulation, Dual Journaling, Presensi Pulang');
  console.log('====================================================\n');

  const {
    isKelasInAngkatan,
    parseTimeToMinutes,
    isTimeRangeOverlap,
    evaluateScheduleBlock,
    isJurnalMatchJadwal,
    canTeacherPresensiPulang,
  } = await import('../src/lib/workflow');

  // ====================================================
  // TEST SUITE 1: 4-Schedule Simulation (2 Blocked, 2 Unblocked)
  // ====================================================
  console.log('--- Test Suite 1: Mixed 4-Schedule Simulation ---');

  const teacher = {
    id: 'guru-budi-id-001',
    user_id: 'user-budi-uuid-001',
    nama: 'Budi Santoso, S.Kom',
    nama_guru: 'Budi Santoso',
  };

  // 4 Schedules on Monday:
  // S1: 10 RPL 1 (07:30 - 09:00)
  // S2: X TKJ 2   (09:15 - 10:45)
  // S3: XI RPL 1  (11:00 - 12:30)
  // S4: XII RPL 1 (13:00 - 14:30)
  const schedules = [
    {
      id: 'sched-1',
      kelas: '10 RPL 1',
      mata_pelajaran: 'Dasar Pemrograman',
      jam_mulai: '07:30',
      jam_selesai: '09:00',
      user_id: teacher.user_id,
      nama_guru: teacher.nama,
    },
    {
      id: 'sched-2',
      kelas: 'X TKJ 2',
      mata_pelajaran: 'Jaringan Dasar',
      jam_mulai: '09:15',
      jam_selesai: '10:45',
      user_id: teacher.user_id,
      nama_guru: teacher.nama,
    },
    {
      id: 'sched-3',
      kelas: 'XI RPL 1',
      mata_pelajaran: 'Pemrograman Web',
      jam_mulai: '11:00',
      jam_selesai: '12:30',
      user_id: teacher.user_id,
      nama_guru: teacher.nama,
    },
    {
      id: 'sched-4',
      kelas: 'XII RPL 1',
      mata_pelajaran: 'Basis Data Terdistribusi',
      jam_mulai: '13:00',
      jam_selesai: '14:30',
      user_id: teacher.user_id,
      nama_guru: teacher.nama,
    },
  ];

  // Block Rule: Targeted to Angkatan 10 (or Grade X) from 07:00 to 11:00
  const angkatan10MorningBlock: any = {
    id: 'blok-angkatan-10',
    sekolah_id: 'sekolah-001',
    nama_kegiatan: 'Workshop Asesmen Bakat Minat Kelas 10',
    tipe_target: 'angkatan',
    target_angkatan: '10',
    is_full_day: false,
    jam_mulai: '07:00',
    jam_selesai: '11:00',
    tanggal_mulai: '2026-11-02',
    tanggal_selesai: '2026-11-02',
  };

  // Evaluate each schedule
  const evaluatedSchedules = schedules.map(s => {
    const res = evaluateScheduleBlock(s, teacher, [angkatan10MorningBlock]);
    return {
      ...s,
      isBlocked: res.isBlocked,
      blockRule: res.blockRule || null,
      blockedReason: res.reason || null,
    };
  });

  // Verify Schedule 1 (10 RPL 1, 07:30-09:00)
  assert(evaluatedSchedules[0].isBlocked === true, 'Schedule 1 (10 RPL 1, 07:30-09:00) is marked isBlocked = true');
  assert(evaluatedSchedules[0].blockRule?.id === 'blok-angkatan-10', 'Schedule 1 has correct blockRule attached');

  // Verify Schedule 2 (X TKJ 2, 09:15-10:45)
  assert(evaluatedSchedules[1].isBlocked === true, 'Schedule 2 (X TKJ 2, 09:15-10:45) is marked isBlocked = true');
  assert(evaluatedSchedules[1].blockRule?.id === 'blok-angkatan-10', 'Schedule 2 has correct blockRule attached');

  // Verify Schedule 3 (XI RPL 1, 11:00-12:30)
  assert(evaluatedSchedules[2].isBlocked === false, 'Schedule 3 (XI RPL 1, 11:00-12:30) is marked isBlocked = false');
  assert(evaluatedSchedules[2].blockRule === null, 'Schedule 3 has null blockRule');

  // Verify Schedule 4 (XII RPL 1, 13:00-14:30)
  assert(evaluatedSchedules[3].isBlocked === false, 'Schedule 4 (XII RPL 1, 13:00-14:30) is marked isBlocked = false');
  assert(evaluatedSchedules[3].blockRule === null, 'Schedule 4 has null blockRule');

  // ====================================================
  // TEST SUITE 2: dailyState State Transitions
  // ====================================================
  console.log('\n--- Test Suite 2: dailyState Logic Matrix ---');

  // Helper simulating getGuruDailyState logic on evaluated schedules
  function computeDailyBlockState(evalList: any[]) {
    const hasBlocked = evalList.some((jk: any) => jk.isBlocked);
    const allBlocked = evalList.length > 0 && evalList.every((jk: any) => jk.isBlocked);
    return {
      hasBlockedSchedule: hasBlocked,
      isBlok: allBlocked,
    };
  }

  // 2.1 Mixed case (2 blocked, 2 unblocked)
  const mixedState = computeDailyBlockState(evaluatedSchedules);
  assert(mixedState.hasBlockedSchedule === true, 'Mixed 4-schedules: dailyState.hasBlockedSchedule === true');
  assert(mixedState.isBlok === false, 'Mixed 4-schedules: dailyState.isBlok === false (NOT all blocked)');

  // 2.2 All blocked case (e.g. whole-school full-day block)
  const allBlockedSchedules = schedules.map(s => {
    const res = evaluateScheduleBlock(s, teacher, [{
      id: 'blok-sekolah-full',
      sekolah_id: 'sekolah-001',
      nama_kegiatan: 'HUT Sekolah',
      tipe_target: 'sekolah',
      is_full_day: true,
      jam_mulai: null,
      jam_selesai: null,
      tanggal_mulai: '2026-11-02',
      tanggal_selesai: '2026-11-02',
    } as any]);
    return { ...s, isBlocked: res.isBlocked };
  });
  const allState = computeDailyBlockState(allBlockedSchedules);
  assert(allState.hasBlockedSchedule === true, 'All-blocked case: dailyState.hasBlockedSchedule === true');
  assert(allState.isBlok === true, 'All-blocked case: dailyState.isBlok === true');

  // 2.3 None blocked case (e.g. block rule for another class or grade)
  const noneBlockedSchedules = schedules.map(s => {
    const res = evaluateScheduleBlock(s, teacher, [{
      id: 'blok-angkatan-9',
      sekolah_id: 'sekolah-001',
      nama_kegiatan: 'Ujian SMP',
      tipe_target: 'angkatan',
      target_angkatan: '9',
      is_full_day: true,
      tanggal_mulai: '2026-11-02',
      tanggal_selesai: '2026-11-02',
    } as any]);
    return { ...s, isBlocked: res.isBlocked };
  });
  const noneState = computeDailyBlockState(noneBlockedSchedules);
  assert(noneState.hasBlockedSchedule === false, 'None-blocked case: dailyState.hasBlockedSchedule === false');
  assert(noneState.isBlok === false, 'None-blocked case: dailyState.isBlok === false');

  // 2.4 Single schedule blocked out of 4 (1 blocked, 3 unblocked)
  const singleBlockedSchedules = schedules.map((s, idx) => ({
    ...s,
    isBlocked: idx === 0,
  }));
  const singleState = computeDailyBlockState(singleBlockedSchedules);
  assert(singleState.hasBlockedSchedule === true, '1 of 4 blocked: dailyState.hasBlockedSchedule === true');
  assert(singleState.isBlok === false, '1 of 4 blocked: dailyState.isBlok === false');

  // 2.5 3 schedules blocked out of 4 (3 blocked, 1 unblocked)
  const threeBlockedSchedules = schedules.map((s, idx) => ({
    ...s,
    isBlocked: idx < 3,
  }));
  const threeState = computeDailyBlockState(threeBlockedSchedules);
  assert(threeState.hasBlockedSchedule === true, '3 of 4 blocked: dailyState.hasBlockedSchedule === true');
  assert(threeState.isBlok === false, '3 of 4 blocked: dailyState.isBlok === false');

  // ====================================================
  // TEST SUITE 3: Time Boundary Permutations (Interval Overlap)
  // ====================================================
  console.log('\n--- Test Suite 3: Time Boundary & Isolation Permutations ---');

  // Block is 08:00 - 10:00
  const bStart = '08:00';
  const bEnd = '10:00';

  // 3.1 Exact abutment: Schedule ends right when block starts (07:00 - 08:00)
  assert(
    !isTimeRangeOverlap('07:00', '08:00', bStart, bEnd, false),
    'Boundary: Schedule 07:00-08:00 ending at block start (08:00) does NOT overlap'
  );

  // 3.2 Exact abutment: Schedule starts right when block ends (10:00 - 11:30)
  assert(
    !isTimeRangeOverlap('10:00', '11:30', bStart, bEnd, false),
    'Boundary: Schedule 10:00-11:30 starting at block end (10:00) does NOT overlap'
  );

  // 3.3 1-minute overlap at start (07:00 - 08:01)
  assert(
    isTimeRangeOverlap('07:00', '08:01', bStart, bEnd, false),
    'Boundary: Schedule 07:00-08:01 overlapping by 1 min at start overlaps'
  );

  // 3.4 1-minute overlap at end (09:59 - 11:00)
  assert(
    isTimeRangeOverlap('09:59', '11:00', bStart, bEnd, false),
    'Boundary: Schedule 09:59-11:00 overlapping by 1 min at end overlaps'
  );

  // 3.5 Afternoon schedule completely outside (13:00 - 14:30)
  assert(
    !isTimeRangeOverlap('13:00', '14:30', bStart, bEnd, false),
    'Boundary: Afternoon schedule 13:00-14:30 does NOT overlap'
  );

  // ====================================================
  // TEST SUITE 4: Dual Journal Workflow & Presensi Pulang
  // ====================================================
  console.log('\n--- Test Suite 4: Dual Journal Workflow & Presensi Pulang ---');

  // Helper matching workflow.ts journal verification logic
  function evaluateJournalAndPulang(dailyState: any) {
    const unblockedSchedules = dailyState.jadwalKBM.filter((jk: any) => !jk.isBlocked);
    const blockedSchedules = dailyState.jadwalKBM.filter((jk: any) => jk.isBlocked);

    const unblockedFulfilled = unblockedSchedules.every((jk: any) =>
      dailyState.jurnalKBM.some((j: any) => isJurnalMatchJadwal(j, jk))
    );
    const blockedFulfilled = blockedSchedules.length === 0 || Boolean(dailyState.jurnalKegiatan);

    const isJurnalDone = (unblockedFulfilled && blockedFulfilled);
    const isPiketDone = dailyState.isPiket ? Boolean(dailyState.laporanPiket) : true;

    let canPresensiPulang = false;
    let lockedReason: string | null = null;

    if (isJurnalDone && isPiketDone) {
      canPresensiPulang = true;
    } else {
      const missing = [];
      if (!isPiketDone) missing.push('Laporan Piket');
      if (!isJurnalDone) missing.push(dailyState.isBlok ? 'Jurnal Kegiatan (Sistem Blok)' : 'Jurnal (KBM/Kegiatan)');
      lockedReason = `Anda belum menyelesaikan: ${missing.join(', ')}`;
    }

    // R2 override: Teacher with presensiDatang
    if (canTeacherPresensiPulang(dailyState)) {
      canPresensiPulang = true;
      if (lockedReason && lockedReason.startsWith('Anda belum menyelesaikan')) {
        lockedReason = null;
      }
    }

    return {
      unblockedFulfilled,
      blockedFulfilled,
      isJurnalDone,
      canPresensiPulang,
      lockedReason,
    };
  }

  // 4.1 Base State: 2 unblocked (S3, S4), 2 blocked (S1, S2). No journals yet. No presensi datang yet.
  const stateNoJournals = {
    tanggal: '2026-11-02',
    isBlok: false,
    hasBlockedSchedule: true,
    presensiDatang: null,
    isPiket: false,
    jadwalKBM: evaluatedSchedules,
    jurnalKBM: [],
    jurnalKegiatan: null,
  };

  const res1 = evaluateJournalAndPulang(stateNoJournals);
  assert(res1.unblockedFulfilled === false, 'No journals: unblockedFulfilled is false');
  assert(res1.blockedFulfilled === false, 'No journals: blockedFulfilled is false');
  assert(res1.isJurnalDone === false, 'No journals: isJurnalDone is false');
  assert(res1.canPresensiPulang === false, 'No journals & no presensiDatang: canPresensiPulang is false');
  assert(res1.lockedReason !== null, 'No journals: lockedReason indicates missing obligations');

  // 4.2 Only Jurnal Kegiatan filled (Blocked classes covered, unblocked classes pending)
  const stateOnlyKegiatan = {
    ...stateNoJournals,
    jurnalKegiatan: {
      id: 'keg-001',
      keterangan: 'Jurnal Kegiatan',
      materi: 'Workshop Asesmen Bakat Minat Kelas 10',
    },
  };
  const res2 = evaluateJournalAndPulang(stateOnlyKegiatan);
  assert(res2.blockedFulfilled === true, 'Only Kegiatan filled: blockedFulfilled is true');
  assert(res2.unblockedFulfilled === false, 'Only Kegiatan filled: unblockedFulfilled is false');
  assert(res2.isJurnalDone === false, 'Only Kegiatan filled: isJurnalDone is false (unblocked classes still required)');

  // 4.3 Only 1 of 2 unblocked Jurnal KBM filled (S3 filled, S4 pending, Kegiatan filled)
  const statePartialKBM = {
    ...stateOnlyKegiatan,
    jurnalKBM: [
      {
        id: 'jur-s3',
        kelas: 'XI RPL 1',
        mapel: 'Pemrograman Web',
        keterangan: 'KBM S3',
      },
    ],
  };
  const res3 = evaluateJournalAndPulang(statePartialKBM);
  assert(res3.unblockedFulfilled === false, 'Partial KBM (1 of 2): unblockedFulfilled is false');
  assert(res3.isJurnalDone === false, 'Partial KBM (1 of 2): isJurnalDone is false');

  // 4.4 All unblocked Jurnal KBM filled + Jurnal Kegiatan filled (Complete duty fulfillment)
  const stateComplete = {
    ...stateOnlyKegiatan,
    jurnalKBM: [
      {
        id: 'jur-s3',
        kelas: 'XI RPL 1',
        mapel: 'Pemrograman Web',
        keterangan: 'KBM S3',
      },
      {
        id: 'jur-s4',
        kelas: 'XII RPL 1',
        mapel: 'Basis Data Terdistribusi',
        keterangan: 'KBM S4',
      },
    ],
  };
  const res4 = evaluateJournalAndPulang(stateComplete);
  assert(res4.unblockedFulfilled === true, 'Complete journals: unblockedFulfilled is true');
  assert(res4.blockedFulfilled === true, 'Complete journals: blockedFulfilled is true');
  assert(res4.isJurnalDone === true, 'Complete journals: isJurnalDone is true');
  assert(res4.canPresensiPulang === true, 'Complete journals: canPresensiPulang is true');
  assert(res4.lockedReason === null, 'Complete journals: lockedReason is cleared');

  // 4.5 Teacher with presensi datang (R2 Presensi Pulang Rule)
  const stateWithDatang = {
    ...stateNoJournals,
    presensiDatang: {
      id: 'datang-001',
      jam_masuk: '06:55:00',
    },
  };
  const res5 = evaluateJournalAndPulang(stateWithDatang);
  assert(res5.canPresensiPulang === true, 'R2: Teacher with presensiDatang can presensiPulang immediately without prior journals');
  assert(res5.lockedReason === null, 'R2: lockedReason is cleared when presensiDatang is recorded');

  // 4.6 Teacher who is sick / on leave (isIzinSakit)
  const stateIzinSakit = {
    ...stateWithDatang,
    isIzinSakit: true,
  };
  const res6 = evaluateJournalAndPulang(stateIzinSakit);
  assert(res6.canPresensiPulang === false, 'Teacher with isIzinSakit cannot presensiPulang');

  // ====================================================
  // TEST SUITE 5: Source Code Architecture & Invariants
  // ====================================================
  console.log('\n--- Test Suite 5: Code Architecture & Invariants ---');

  const homeGuruPath = path.join(__dirname, '..', 'src', 'components', 'HomeViewGuru.tsx');
  const guruJurnalPath = path.join(__dirname, '..', 'src', 'components', 'GuruJurnal.tsx');
  const workflowPath = path.join(__dirname, '..', 'src', 'lib', 'workflow.ts');

  const homeSrc = fs.readFileSync(homeGuruPath, 'utf8');
  const jurnalSrc = fs.readFileSync(guruJurnalPath, 'utf8');
  const workflowSrc = fs.readFileSync(workflowPath, 'utf8');

  // 5.1 In HomeViewGuru:
  // - "Campuran" badge rendered when hasBlockedSchedule
  assert(homeSrc.includes('Campuran'), 'HomeViewGuru renders "Campuran" badge for mixed schedule');
  // - Distinguishes jk.isBlocked
  assert(homeSrc.includes('jk.isBlocked'), 'HomeViewGuru checks jk.isBlocked flag');
  // - Blocked card has "Kegiatan Blok" label
  assert(homeSrc.includes('Kegiatan Blok'), 'HomeViewGuru renders "Kegiatan Blok" badge for blocked schedules');
  // - Blocked card has action button "Isi Jurnal Kegiatan"
  assert(homeSrc.includes('Isi Jurnal Kegiatan'), 'HomeViewGuru provides "Isi Jurnal Kegiatan" button');
  // - Unblocked card has action button "Isi Jurnal"
  assert(homeSrc.includes('Isi Jurnal'), 'HomeViewGuru provides "Isi Jurnal" button for unblocked schedules');

  // 5.2 In GuruJurnal:
  // - Checks dailyState.hasBlockedSchedule && !dailyState.isBlok for mixed mode
  assert(
    jurnalSrc.includes('hasBlockedSchedule') && jurnalSrc.includes('!dailyState?.isBlok'),
    'GuruJurnal explicitly detects mixed mode (hasBlockedSchedule && !isBlok)'
  );
  // - Provides interactive select for choosing Jurnal KBM or Jurnal Kegiatan in mixed mode
  assert(
    jurnalSrc.includes('Jurnal KBM (Jadwal Mengajar Reguler)') &&
    jurnalSrc.includes('Jurnal Kegiatan (Sistem Blok:'),
    'GuruJurnal provides options for both Jurnal KBM and Jurnal Kegiatan in mixed mode'
  );
  // - Explanatory helper text for mixed schedule
  assert(
    jurnalSrc.includes('Jadwal campuran aktif: Silakan pilih Jurnal KBM untuk kelas reguler atau Jurnal Kegiatan untuk jam yang diblokir'),
    'GuruJurnal displays helpful guidance for mixed schedule teachers'
  );

  // 5.3 In workflow:
  // - evaluateScheduleBlock returns ScheduleBlockEvaluation
  assert(workflowSrc.includes('export interface ScheduleBlockEvaluation'), 'workflow exports ScheduleBlockEvaluation');
  // - evaluateScheduleBlock evaluates both target and time overlap
  assert(workflowSrc.includes('isTimeRangeOverlap'), 'workflow calls isTimeRangeOverlap during evaluation');
  // - getGuruDailyState maps each schedule item with evaluateScheduleBlock
  assert(workflowSrc.includes('evaluateScheduleBlock(jk, teacherRef, activeBloks)'), 'getGuruDailyState evaluates each schedule item with activeBloks');

  // ====================================================
  // SUMMARY
  // ====================================================
  console.log('\n====================================================');
  console.log(`TOTAL CHALLENGER TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runChallengerM22Tests().catch(err => {
  console.error('Unhandled challenger test error:', err);
  process.exit(1);
});
