import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

let failureCount = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    failureCount++;
  } else {
    console.log(`✅ PASS: ${testName}`);
  }
}

async function runStressTest() {
  console.log('================================================================');
  console.log('CHALLENGER: EMPIRICAL STRESS TEST FOR PRESENSI & REMINDER LOGIC');
  console.log('================================================================\n');

  const { setServerTenantContext, getTenantSupabaseClient } = await import('../src/lib/supabaseClient');

  const defaultSchoolAId = 'a0000000-0000-0000-0000-000000000001';

  // Configure Superadmin tenant context
  setServerTenantContext({ role: 'Superadmin', sekolahId: defaultSchoolAId });

  const testDate = '2026-09-18';
  const testDay = 'Jumat';
  const testSuffix = Date.now().toString().slice(-6);

  // Define test personas
  const tIsoZ = `Stress ISO Z ${testSuffix}`;
  const tIsoOffset = `Stress ISO Offset ${testSuffix}`;
  const tSpace = `Stress Space ${testSuffix}`;
  const tDateOnly = `Stress DateOnly ${testSuffix}`;
  const tPulangOnly = `Stress PulangOnly ${testSuffix}`;
  const tYesterday = `Stress Yesterday ${testSuffix}`;
  const tCasing = `Stress Casing ${testSuffix}`;
  const tExemptNoSched = `Stress Exempt NoSched ${testSuffix}`;
  const tExemptWithSchedUnchecked = `Stress Exempt SchedUnchecked ${testSuffix}`;
  const tExemptWithSchedCheckedIn = `Stress Exempt SchedCheckedIn ${testSuffix}`;
  const tNonExemptUnchecked = `Stress NonExempt Unchecked ${testSuffix}`;

  const createdTeacherIds: string[] = [];
  const createdPresensiIds: string[] = [];
  const createdScheduleIds: string[] = [];

  const schoolAClient = getTenantSupabaseClient(defaultSchoolAId, 'Superadmin');

  try {
    console.log('-> Seeding stress test personas...');

    // School A Teachers
    const teachersA = [
      { nama_guru: tIsoZ, sekolah_id: defaultSchoolAId, nip: `nip-isoz-${testSuffix}`, wajib_hadir_hanya_mengajar: false },
      { nama_guru: tIsoOffset, sekolah_id: defaultSchoolAId, nip: `nip-isooff-${testSuffix}`, wajib_hadir_hanya_mengajar: false },
      { nama_guru: tSpace, sekolah_id: defaultSchoolAId, nip: `nip-spc-${testSuffix}`, wajib_hadir_hanya_mengajar: false },
      { nama_guru: tDateOnly, sekolah_id: defaultSchoolAId, nip: `nip-do-${testSuffix}`, wajib_hadir_hanya_mengajar: false },
      { nama_guru: tPulangOnly, sekolah_id: defaultSchoolAId, nip: `nip-po-${testSuffix}`, wajib_hadir_hanya_mengajar: false },
      { nama_guru: tYesterday, sekolah_id: defaultSchoolAId, nip: `nip-yest-${testSuffix}`, wajib_hadir_hanya_mengajar: false },
      { nama_guru: `  ${tCasing}  `, sekolah_id: defaultSchoolAId, nip: `nip-cas-${testSuffix}`, wajib_hadir_hanya_mengajar: false },
      { nama_guru: tExemptNoSched, sekolah_id: defaultSchoolAId, nip: `nip-exns-${testSuffix}`, wajib_hadir_hanya_mengajar: true },
      { nama_guru: tExemptWithSchedUnchecked, sekolah_id: defaultSchoolAId, nip: `nip-exwsu-${testSuffix}`, wajib_hadir_hanya_mengajar: true },
      { nama_guru: tExemptWithSchedCheckedIn, sekolah_id: defaultSchoolAId, nip: `nip-exwsc-${testSuffix}`, wajib_hadir_hanya_mengajar: true },
      { nama_guru: tNonExemptUnchecked, sekolah_id: defaultSchoolAId, nip: `nip-neu-${testSuffix}`, wajib_hadir_hanya_mengajar: false }
    ];

    const { data: insertedTeachersA, error: tErrA } = await schoolAClient.from('data_guru').insert(teachersA).select();
    assert(!tErrA && !!insertedTeachersA && insertedTeachersA.length === teachersA.length, 'Seeded 11 School A stress test teachers', tErrA?.message);
    if (insertedTeachersA) {
      insertedTeachersA.forEach((t: any) => createdTeacherIds.push(t.id));
    }

    // Schedules for exempt teachers
    const schedulesToInsert = [
      {
        id: crypto.randomUUID(),
        sekolah_id: defaultSchoolAId,
        nama_guru: tExemptWithSchedUnchecked,
        hari: testDay,
        kelas: 'X-IPA-1',
        mata_pelajaran: 'Biologi'
      },
      {
        id: crypto.randomUUID(),
        sekolah_id: defaultSchoolAId,
        nama_guru: tExemptWithSchedCheckedIn,
        hari: testDay,
        kelas: 'XI-IPA-2',
        mata_pelajaran: 'Fisika'
      }
    ];
    const { data: insertedSched, error: sErr } = await schoolAClient.from('jadwal_pelajaran').insert(schedulesToInsert).select();
    assert(!sErr && !!insertedSched && insertedSched.length === schedulesToInsert.length, 'Seeded teaching schedules for exempt teachers', sErr?.message);
    if (insertedSched) {
      insertedSched.forEach((s: any) => createdScheduleIds.push(s.id));
    }

    // Presensi records testing edge cases
    const presensiToInsert = [
      // 1. ISO format with Z
      {
        id: crypto.randomUUID(),
        sekolah_id: defaultSchoolAId,
        nama_guru: tIsoZ,
        timestamp: `${testDate}T07:15:00.000Z`,
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Diverifikasi'
      },
      // 2. ISO format with offset
      {
        id: crypto.randomUUID(),
        sekolah_id: defaultSchoolAId,
        nama_guru: tIsoOffset,
        timestamp: `${testDate}T07:20:00+08:00`,
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Diverifikasi'
      },
      // 3. Space separated format
      {
        id: crypto.randomUUID(),
        sekolah_id: defaultSchoolAId,
        nama_guru: tSpace,
        timestamp: `${testDate} 07:25:00`,
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Diverifikasi'
      },
      // 4. Date only format
      {
        id: crypto.randomUUID(),
        sekolah_id: defaultSchoolAId,
        nama_guru: tDateOnly,
        timestamp: `${testDate}`,
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Diverifikasi'
      },
      // 5. Pulang only (negative control: should NOT prevent Datang reminder)
      {
        id: crypto.randomUUID(),
        sekolah_id: defaultSchoolAId,
        nama_guru: tPulangOnly,
        timestamp: `${testDate} 14:00:00`,
        tipe_absen: 'Pulang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Diverifikasi'
      },
      // 6. Yesterday only (negative control: should NOT prevent today's reminder)
      {
        id: crypto.randomUUID(),
        sekolah_id: defaultSchoolAId,
        nama_guru: tYesterday,
        timestamp: `2026-09-17 07:15:00`,
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Diverifikasi'
      },
      // 7. Casing variation (presensi has lowercase, data_guru had mixed casing and spaces)
      {
        id: crypto.randomUUID(),
        sekolah_id: defaultSchoolAId,
        nama_guru: tCasing.toLowerCase(),
        timestamp: `${testDate} 07:05:00`,
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Diverifikasi'
      },
      // 8. Exempt teacher who scheduled AND checked in
      {
        id: crypto.randomUUID(),
        sekolah_id: defaultSchoolAId,
        nama_guru: tExemptWithSchedCheckedIn,
        timestamp: `${testDate} 07:10:00`,
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Diverifikasi'
      }
    ];

    const { data: insertedPres, error: pErr } = await schoolAClient.from('presensi_guru').insert(presensiToInsert).select();
    assert(!pErr && !!insertedPres && insertedPres.length === presensiToInsert.length, 'Seeded stress test presensi records', pErr?.message);
    if (insertedPres) {
      insertedPres.forEach((p: any) => createdPresensiIds.push(p.id));
    }

    console.log('\n-> Executing checkMissingTasks against School A...');
    const { checkMissingTasks } = await import('../src/app/api/push/send-reminders/route');

    setServerTenantContext({ role: 'Superadmin', sekolahId: defaultSchoolAId });
    const resultA = await checkMissingTasks(testDate, testDay, defaultSchoolAId);
    const remindersA = resultA.reminders || [];
    console.log(`ℹ️ Total reminders evaluated for School A: ${remindersA.length}`);

    // --- CASE 1: Timestamp formats (Verified that .ilike('timestamp', `${todayStr}%`) matches all formats) ---
    const rIsoZ = remindersA.find((r: any) => r.guru_nama.includes(tIsoZ) && r.category === 'presensi');
    assert(!rIsoZ, 'Edge Case 1a: Teacher with ISO timestamp (Z) receives NO Datang reminder');

    const rIsoOffset = remindersA.find((r: any) => r.guru_nama.includes(tIsoOffset) && r.category === 'presensi');
    assert(!rIsoOffset, 'Edge Case 1b: Teacher with ISO timestamp (+offset) receives NO Datang reminder');

    const rSpace = remindersA.find((r: any) => r.guru_nama.includes(tSpace) && r.category === 'presensi');
    assert(!rSpace, 'Edge Case 1c: Teacher with space-separated timestamp receives NO Datang reminder');

    const rDateOnly = remindersA.find((r: any) => r.guru_nama.includes(tDateOnly) && r.category === 'presensi');
    assert(!rDateOnly, 'Edge Case 1d: Teacher with date-only timestamp receives NO Datang reminder');

    // --- CASE 2: Negative controls ---
    const rPulangOnly = remindersA.find((r: any) => r.guru_nama.includes(tPulangOnly) && r.category === 'presensi');
    assert(!!rPulangOnly, 'Edge Case 2a: Teacher who only checked PULANG (not Datang) DOES receive Datang reminder');

    const rYesterday = remindersA.find((r: any) => r.guru_nama.includes(tYesterday) && r.category === 'presensi');
    assert(!!rYesterday, 'Edge Case 2b: Teacher who checked in YESTERDAY (not today) DOES receive Datang reminder');

    // --- CASE 3: Whitespace & Casing ---
    const rCasing = remindersA.find((r: any) => r.guru_nama.includes(tCasing) && r.category === 'presensi');
    assert(!rCasing, 'Edge Case 3: Teacher with trimmed/casing variation in presensi receives NO Datang reminder');

    // --- CASE 4: Teacher Exemptions ---
    const rExemptNoSched = remindersA.find((r: any) => r.guru_nama.includes(tExemptNoSched) && r.category === 'presensi');
    assert(!rExemptNoSched, 'Edge Case 4a: Exempt teacher with NO schedule today receives NO Datang reminder');

    const rExemptWithSchedUnchecked = remindersA.find((r: any) => r.guru_nama.includes(tExemptWithSchedUnchecked) && r.category === 'presensi');
    assert(!!rExemptWithSchedUnchecked, 'Edge Case 4b: Exempt teacher WITH schedule today, unchecked, DOES receive Datang reminder');

    const rExemptWithSchedCheckedIn = remindersA.find((r: any) => r.guru_nama.includes(tExemptWithSchedCheckedIn) && r.category === 'presensi');
    assert(!rExemptWithSchedCheckedIn, 'Edge Case 4c: Exempt teacher WITH schedule today, checked in, receives NO Datang reminder');

    // --- CASE 5: Standard Non-Exempt Unchecked Teacher ---
    const rNonExemptUnchecked = remindersA.find((r: any) => r.guru_nama.includes(tNonExemptUnchecked) && r.category === 'presensi');
    assert(!!rNonExemptUnchecked, 'Edge Case 5: Standard non-exempt unchecked teacher DOES receive Datang reminder');

  } catch (err: any) {
    console.error('❌ Exception during stress testing:', err);
    failureCount++;
  } finally {
    console.log('\n-> Cleaning up stress test data...');
    if (createdPresensiIds.length > 0) {
      await schoolAClient.from('presensi_guru').delete().in('id', createdPresensiIds);
    }
    if (createdScheduleIds.length > 0) {
      await schoolAClient.from('jadwal_pelajaran').delete().in('id', createdScheduleIds);
    }
    if (createdTeacherIds.length > 0) {
      await schoolAClient.from('data_guru').delete().in('id', createdTeacherIds);
    }
    console.log('-> Stress test cleanup completed cleanly.');
  }

  console.log('\n================================================================');
  console.log(`TOTAL STRESS TESTS EXECUTED: ${totalTests}`);
  console.log(`PASSED: ${totalTests - failureCount}`);
  console.log(`FAILED: ${failureCount}`);
  console.log('================================================================\n');

  if (failureCount > 0) {
    process.exit(1);
  }
}

runStressTest();
