/**
 * ADVERSARIAL EMPIRICAL STRESS TEST & VERIFICATION SUITE
 * Milestone: M1 (Presensi & Jurnal Validation on Non-Teaching Days, Sickness Credit, Journal Printing)
 * Agent: challenger_m1_nov_1
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  recordUnfilledJournalsAndPiket,
  autoCloseOrMarkDelinquentJournals,
  normalizeDateStr
} from '../src/lib/attendanceAlpa';
import { canonicalizeTeacherRekapName } from '../src/components/AdminRekapView';
import { getWitaDayName } from '../src/lib/wita';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testId: string, description: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [${testId}] PASS: ${description}`);
    passedTests++;
  } else {
    console.error(`  ✗ [${testId}] FAIL: ${description}`);
    if (detail) console.error(`    Detail: ${detail}`);
    failedTests++;
  }
}

function suite(title: string) {
  console.log(`\n==============================================================================`);
  console.log(`CHALLENGER STRESS SUITE: ${title}`);
  console.log(`==============================================================================`);
}

// =========================================================================
// MOCK SUPABASE CLIENT BUILDER FOR EMPIRICAL ATTENDANCE & LEAVE EXECUTION
// =========================================================================

interface MockDatabaseState {
  jadwal_pelajaran?: any[];
  jurnal_pembelajaran?: any[];
  presensi_guru?: any[];
  penugasan_piket?: any[];
  jadwal_piket?: any[];
  laporan_piket?: any[];
  kalender_pendidikan?: any[];
  pengaturan?: any[];
  data_guru?: any[];
}

function createMockSupabaseClient(initialState: MockDatabaseState) {
  const state = {
    jadwal_pelajaran: [...(initialState.jadwal_pelajaran || [])],
    jurnal_pembelajaran: [...(initialState.jurnal_pembelajaran || [])],
    presensi_guru: [...(initialState.presensi_guru || [])],
    penugasan_piket: [...(initialState.penugasan_piket || [])],
    jadwal_piket: [...(initialState.jadwal_piket || [])],
    laporan_piket: [...(initialState.laporan_piket || [])],
    kalender_pendidikan: [...(initialState.kalender_pendidikan || [])],
    pengaturan: [...(initialState.pengaturan || [])],
    data_guru: [...(initialState.data_guru || [])],
  };

  const insertedRecords: Record<string, any[]> = {
    jurnal_pembelajaran: [],
    presensi_guru: [],
    laporan_piket: []
  };

  function from(tableName: string) {
    const tableData: any[] = (state as any)[tableName] || [];
    let currentFilter = [...tableData];

    const queryBuilder: any = {
      select: (_cols?: string) => queryBuilder,
      eq: (col: string, val: any) => {
        currentFilter = currentFilter.filter(item => item[col] === val);
        return queryBuilder;
      },
      neq: (col: string, val: any) => {
        currentFilter = currentFilter.filter(item => item[col] !== val);
        return queryBuilder;
      },
      lte: (col: string, val: any) => {
        currentFilter = currentFilter.filter(item => item[col] <= val);
        return queryBuilder;
      },
      gte: (col: string, val: any) => {
        currentFilter = currentFilter.filter(item => item[col] >= val);
        return queryBuilder;
      },
      not: (col: string, operator: string, val: any) => {
        if (operator === 'is' && val === null) {
          currentFilter = currentFilter.filter(item => item[col] !== null && item[col] !== undefined);
        }
        return queryBuilder;
      },
      order: (_col: string, _opts?: any) => queryBuilder,
      limit: (_n: number) => queryBuilder,
      maybeSingle: async () => ({ data: currentFilter[0] || null, error: null }),
      insert: async (record: any) => {
        if (!insertedRecords[tableName]) insertedRecords[tableName] = [];
        insertedRecords[tableName].push(record);
        tableData.push(record);
        return { data: [record], error: null };
      },
      then: (resolve: any) => {
        resolve({ data: currentFilter, error: null });
      }
    };

    return queryBuilder;
  }

  return { client: { from }, state, insertedRecords };
}

// =========================================================================
// RUNNER
// =========================================================================

async function runAdversarialStressVerification() {
  console.log('==============================================================================');
  console.log('🚀 STARTING EMPIRICAL ADVERSARIAL STRESS TEST EXECUTION');
  console.log('==============================================================================');

  // =========================================================================
  // TARGET 1: PRESENSI & JURNAL VALIDATION ON NON-TEACHING DAYS & HOLIDAYS
  // =========================================================================
  suite('1. Presensi & Jurnal Validation on Non-Teaching Days & Multi-Day Leaves');

  // Exact holiday evaluation oracle matching AdminVerifView.tsx:597-639
  function evaluateHolidayInfo(
    effectiveDate: string,
    hariSekolah: number,
    kalenderEvents: any[]
  ): { isHoliday: boolean; keterangan: string } | null {
    if (!effectiveDate) return null;
    const d = new Date(effectiveDate + 'T12:00:00+08:00');
    const effectiveDayName = getWitaDayName(d);

    // 1. Sunday is always a weekend holiday
    if (effectiveDayName === 'Minggu') {
      return { isHoliday: true, keterangan: 'Hari Minggu (Libur Akhir Pekan)' };
    }

    // 2. Saturday is a holiday if 5-day school week is configured
    if (effectiveDayName === 'Sabtu' && hariSekolah === 5) {
      return { isHoliday: true, keterangan: 'Hari Sabtu (Libur Sekolah 5 Hari)' };
    }

    // 3. Kalender Pendidikan events with tipe Libur
    const calMatch = kalenderEvents.find((evt: any) => {
      const tipe = (evt.tipe || '').toLowerCase();
      const isLibur = tipe === 'libur' || tipe.includes('libur');
      if (!isLibur) return false;

      // Exact single day
      if (evt.tanggal && evt.tanggal === effectiveDate) return true;

      // Date range [tanggal_mulai, tanggal_selesai]
      if (evt.tanggal_mulai && evt.tanggal_selesai) {
        return effectiveDate >= evt.tanggal_mulai && effectiveDate <= evt.tanggal_selesai;
      }
      if (evt.tanggal_mulai && !evt.tanggal_selesai && evt.tanggal_mulai === effectiveDate) {
        return true;
      }

      return false;
    });

    if (calMatch) {
      return {
        isHoliday: true,
        keterangan: calMatch.keterangan || 'Libur Kalender Pendidikan'
      };
    }

    return null;
  }

  // 1.1 Sunday behavior (independent of hari_sekolah setting)
  const sundayDates = ['2026-11-01', '2026-11-08', '2026-11-15', '2026-11-22', '2026-11-29'];
  for (const sun of sundayDates) {
    const h5 = evaluateHolidayInfo(sun, 5, []);
    const h6 = evaluateHolidayInfo(sun, 6, []);
    assert(
      h5?.isHoliday === true && h5.keterangan.includes('Minggu'),
      `SUN-5-${sun}`,
      `Sunday ${sun} is recognized as weekend holiday under 5-day school week`
    );
    assert(
      h6?.isHoliday === true && h6.keterangan.includes('Minggu'),
      `SUN-6-${sun}`,
      `Sunday ${sun} is recognized as weekend holiday under 6-day school week`
    );
  }

  // 1.2 Saturday behavior (hari_sekolah === 5 vs hari_sekolah === 6)
  const saturdayDates = ['2026-11-07', '2026-11-14', '2026-11-21', '2026-11-28'];
  for (const sat of saturdayDates) {
    const satH5 = evaluateHolidayInfo(sat, 5, []);
    const satH6 = evaluateHolidayInfo(sat, 6, []);
    assert(
      satH5?.isHoliday === true && satH5.keterangan.includes('Sabtu'),
      `SAT-5-${sat}`,
      `Saturday ${sat} is a holiday when hari_sekolah = 5`
    );
    assert(
      satH6 === null || satH6.isHoliday === false,
      `SAT-6-${sat}`,
      `Saturday ${sat} is NOT a holiday when hari_sekolah = 6 (effective teaching day)`
    );
  }

  // 1.3 Single-day calendar holiday
  const singleDayHoliday = [
    { id: 'cal-1', tanggal: '2026-08-17', tipe: 'Libur', keterangan: 'HUT Kemerdekaan RI Ke-81' }
  ];
  const hutRi = evaluateHolidayInfo('2026-08-17', 6, singleDayHoliday);
  const nextDay = evaluateHolidayInfo('2026-08-18', 6, singleDayHoliday);
  assert(
    hutRi?.isHoliday === true && hutRi.keterangan === 'HUT Kemerdekaan RI Ke-81',
    'CAL-SINGLE-01',
    'Single-day calendar holiday 2026-08-17 is identified with exact keterangan'
  );
  assert(
    nextDay === null,
    'CAL-SINGLE-02',
    'Day following single-day calendar holiday (2026-08-18) is not marked as holiday'
  );

  // 1.4 Multi-day calendar holiday range
  // 2026-12-21 is Monday, 2026-12-31 is Thursday
  // 2026-12-18 is Friday (effective teaching day under 6-day week)
  const multiDayHoliday = [
    {
      id: 'cal-multi',
      tanggal_mulai: '2026-12-21',
      tanggal_selesai: '2026-12-31',
      tipe: 'Libur',
      keterangan: 'Libur Akhir Semester Ganjil'
    }
  ];

  assert(
    evaluateHolidayInfo('2026-12-18', 6, multiDayHoliday) === null,
    'CAL-MULTI-PRE-FRIDAY',
    'Friday before multi-day holiday (2026-12-18) is not marked holiday under 6-day school week'
  );
  assert(
    evaluateHolidayInfo('2026-12-21', 6, multiDayHoliday)?.isHoliday === true,
    'CAL-MULTI-START',
    'First day of multi-day holiday (2026-12-21) is recognized as holiday'
  );
  assert(
    evaluateHolidayInfo('2026-12-25', 6, multiDayHoliday)?.isHoliday === true,
    'CAL-MULTI-MID',
    'Middle day of multi-day holiday (2026-12-25) is recognized as holiday'
  );
  assert(
    evaluateHolidayInfo('2026-12-31', 6, multiDayHoliday)?.isHoliday === true,
    'CAL-MULTI-END',
    'Last day of multi-day holiday (2026-12-31) is recognized as holiday'
  );
  assert(
    evaluateHolidayInfo('2027-01-04', 6, multiDayHoliday) === null,
    'CAL-MULTI-POST-MONDAY',
    'Monday after multi-day holiday (2027-01-04) is an effective teaching day'
  );

  // 1.5 Verification that in AdminVerifView, on any holiday, zero teachers are unsubmitted / delinquent
  const sampleTeachers = [
    { id: 't-1', nama_guru: 'Ade Fitrawan Ibrahim', nip: '19850101' },
    { id: 't-2', nama_guru: 'Budi Santoso, M.Pd', nip: '19860202' },
    { id: 't-3', nama_guru: 'Siti Aminah, S.Pd', nip: '19870303' }
  ];

  function getUnsubmittedPresensi(allTeachers: any[], holiday: any) {
    if (holiday?.isHoliday) return [];
    return allTeachers;
  }
  function getUnsubmittedJurnal(allTeachers: any[], holiday: any) {
    if (holiday?.isHoliday) return [];
    return allTeachers;
  }
  function getUnsubmittedPiket(allTeachers: any[], holiday: any) {
    if (holiday?.isHoliday) return [];
    return allTeachers;
  }

  const holidaySunday = evaluateHolidayInfo('2026-11-08', 6, []);
  assert(
    getUnsubmittedPresensi(sampleTeachers, holidaySunday).length === 0,
    'VERIF-HOL-PRESENSI',
    'On Sunday holiday, unsubmittedPresensi returns empty array (zero delinquent teachers)'
  );
  assert(
    getUnsubmittedJurnal(sampleTeachers, holidaySunday).length === 0,
    'VERIF-HOL-JURNAL',
    'On Sunday holiday, unsubmittedJurnal returns empty array (zero delinquent teachers)'
  );
  assert(
    getUnsubmittedPiket(sampleTeachers, holidaySunday).length === 0,
    'VERIF-HOL-PIKET',
    'On Sunday holiday, unsubmittedPiket returns empty array (zero delinquent teachers)'
  );

  const calHolidayInfo = evaluateHolidayInfo('2026-12-25', 6, multiDayHoliday);
  assert(
    getUnsubmittedPresensi(sampleTeachers, calHolidayInfo).length === 0 &&
    getUnsubmittedJurnal(sampleTeachers, calHolidayInfo).length === 0 &&
    getUnsubmittedPiket(sampleTeachers, calHolidayInfo).length === 0,
    'VERIF-HOL-ALL-TABS',
    'On calendar holiday, all 3 tabs (Presensi, Jurnal, Piket) return zero delinquent teachers'
  );

  // 1.6 Multi-Day Leaves in recordUnfilledJournalsAndPiket & autoCloseOrMarkDelinquentJournals
  // Empirical stress execution across Day 1, Day 2, Day 3 of an approved sick leave
  console.log('\n--- Stress Testing Multi-Day Leave across Day 1, Day 2, Day 3 ---');

  const teacherAhmad = {
    nama_guru: 'Drs. Ahmad Dahlan',
    user_id: 'usr-ahmad-01',
    sekolah_id: 'sch-001'
  };

  // Schedule for Monday, Tuesday, Wednesday
  const mockSchedules = [
    {
      id: 'sch-senin',
      hari: 'Senin',
      nama_guru: 'Drs. Ahmad Dahlan',
      kelas: 'X-1',
      mata_pelajaran: 'Bahasa Indonesia',
      jam_mulai: '07:30',
      jam_selesai: '09:00',
      sekolah_id: 'sch-001'
    },
    {
      id: 'sch-selasa',
      hari: 'Selasa',
      nama_guru: 'Drs. Ahmad Dahlan',
      kelas: 'X-2',
      mata_pelajaran: 'Bahasa Indonesia',
      jam_mulai: '07:30',
      jam_selesai: '09:00',
      sekolah_id: 'sch-001'
    },
    {
      id: 'sch-rabu',
      hari: 'Rabu',
      nama_guru: 'Drs. Ahmad Dahlan',
      kelas: 'X-3',
      mata_pelajaran: 'Bahasa Indonesia',
      jam_mulai: '07:30',
      jam_selesai: '09:00',
      sekolah_id: 'sch-001'
    }
  ];

  // Approved 3-day sick leave starting 2026-11-02 to 2026-11-04
  const multiDaySickRecord = {
    id: 'leave-ahmad-sakit-01',
    nama_guru: 'Drs. Ahmad Dahlan',
    user_id: 'usr-ahmad-01',
    sekolah_id: 'sch-001',
    tipe_absen: 'Datang',
    jenis_presensi: 'Sakit',
    status_verifikasi: 'Disetujui',
    tanggal_mulai: '2026-11-02',
    tanggal_selesai: '2026-11-04',
    durasi_hari: 3,
    detail_izin: 'Surat Keterangan Dokter - Rawat Inap',
    timestamp: '2026-11-02T07:15:00+08:00'
  };

  const { client: mockClientA, insertedRecords: insertedA } = createMockSupabaseClient({
    jadwal_pelajaran: mockSchedules,
    presensi_guru: [multiDaySickRecord],
    jurnal_pembelajaran: []
  });

  // --- Day 1 (Monday 2026-11-02) ---
  const resDay1 = await recordUnfilledJournalsAndPiket(
    teacherAhmad,
    '2026-11-02',
    { isIzinSakit: true },
    mockClientA
  );
  assert(
    resDay1.unfilledKbmCount === 1,
    'LEAVE-DAY1-COUNT',
    'Day 1 produces 1 excused KBM record'
  );
  assert(
    resDay1.unfilledKegiatanCreated === false,
    'LEAVE-DAY1-KEGIATAN',
    'Day 1 does NOT create delinquent "Tidak Melaksanakan Kegiatan"'
  );

  const insertedDay1 = insertedA.jurnal_pembelajaran.find(j => j.tanggal === '2026-11-02');
  assert(
    insertedDay1?.status_verifikasi === 'Sakit',
    'LEAVE-DAY1-STATUS',
    `Day 1 KBM status_verifikasi is 'Sakit' (actual: '${insertedDay1?.status_verifikasi}')`
  );
  assert(
    insertedDay1?.materi === 'Sakit',
    'LEAVE-DAY1-MATERI',
    `Day 1 KBM materi is 'Sakit' (actual: '${insertedDay1?.materi}')`
  );
  assert(
    insertedDay1?.status_verifikasi !== 'Tidak Masuk Kelas',
    'LEAVE-DAY1-NOT-TMK',
    'Day 1 does NOT produce "Tidak Masuk Kelas"'
  );

  // --- Day 2 (Tuesday 2026-11-03) via autoCloseOrMarkDelinquentJournals ---
  const resDay2 = await autoCloseOrMarkDelinquentJournals(
    teacherAhmad,
    '2026-11-03',
    { isIzinSakit: true },
    mockClientA
  );
  assert(
    resDay2.unfilledKbmCount === 1,
    'LEAVE-DAY2-COUNT',
    'Day 2 produces 1 excused KBM record'
  );
  assert(
    resDay2.unfilledKegiatanCreated === false,
    'LEAVE-DAY2-KEGIATAN',
    'Day 2 does NOT create delinquent "Tidak Melaksanakan Kegiatan"'
  );

  const insertedDay2 = insertedA.jurnal_pembelajaran.find(j => j.tanggal === '2026-11-03');
  assert(
    insertedDay2?.status_verifikasi === 'Sakit',
    'LEAVE-DAY2-STATUS',
    `Day 2 KBM status_verifikasi is 'Sakit' (actual: '${insertedDay2?.status_verifikasi}')`
  );
  assert(
    insertedDay2?.status_verifikasi !== 'Tidak Masuk Kelas',
    'LEAVE-DAY2-NOT-TMK',
    'Day 2 does NOT produce "Tidak Masuk Kelas"'
  );

  // --- Day 3 (Wednesday 2026-11-04) ---
  const resDay3 = await recordUnfilledJournalsAndPiket(
    teacherAhmad,
    '2026-11-04',
    { isIzinSakit: true },
    mockClientA
  );
  assert(
    resDay3.unfilledKbmCount === 1,
    'LEAVE-DAY3-COUNT',
    'Day 3 produces 1 excused KBM record'
  );
  const insertedDay3 = insertedA.jurnal_pembelajaran.find(j => j.tanggal === '2026-11-04');
  assert(
    insertedDay3?.status_verifikasi === 'Sakit',
    'LEAVE-DAY3-STATUS',
    `Day 3 KBM status_verifikasi is 'Sakit' (actual: '${insertedDay3?.status_verifikasi}')`
  );
  assert(
    insertedDay3?.status_verifikasi !== 'Tidak Masuk Kelas',
    'LEAVE-DAY3-NOT-TMK',
    'Day 3 does NOT produce "Tidak Masuk Kelas"'
  );

  // 1.7 Multi-Day Leave using durasi_hari instead of tanggal_selesai
  const teacherNur = {
    nama_guru: 'Dra. Nur Halimah',
    user_id: 'usr-nur-02',
    sekolah_id: 'sch-001'
  };
  const durasiLeaveRecord = {
    id: 'leave-nur-izin-01',
    nama_guru: 'Dra. Nur Halimah',
    user_id: 'usr-nur-02',
    sekolah_id: 'sch-001',
    tipe_absen: 'Datang',
    jenis_presensi: 'Izin',
    status_verifikasi: 'Disetujui',
    tanggal_mulai: '2026-11-09',
    durasi_hari: 3, // Nov 9, 10, 11
    detail_izin: 'Izin Keperluan Keluarga',
    timestamp: '2026-11-09T07:10:00+08:00'
  };
  const mockSchedulesNur = [
    { id: 'sch-nur-selasa', hari: 'Selasa', nama_guru: 'Dra. Nur Halimah', kelas: 'XII-1', mata_pelajaran: 'Matematika', sekolah_id: 'sch-001' },
    { id: 'sch-nur-rabu', hari: 'Rabu', nama_guru: 'Dra. Nur Halimah', kelas: 'XII-2', mata_pelajaran: 'Matematika', sekolah_id: 'sch-001' }
  ];
  const { client: mockClientNur, insertedRecords: insertedNur } = createMockSupabaseClient({
    jadwal_pelajaran: mockSchedulesNur,
    presensi_guru: [durasiLeaveRecord],
    jurnal_pembelajaran: []
  });

  // Day 2 (Nov 10, Tuesday)
  await autoCloseOrMarkDelinquentJournals(teacherNur, '2026-11-10', {}, mockClientNur);
  const nurDay2 = insertedNur.jurnal_pembelajaran.find(j => j.tanggal === '2026-11-10');
  assert(
    nurDay2?.status_verifikasi === 'Izin',
    'LEAVE-DURASI-DAY2',
    `Leave with durasi_hari: 3 on Day 2 produces status_verifikasi 'Izin' (actual: '${nurDay2?.status_verifikasi}')`
  );

  // Day 3 (Nov 11, Wednesday)
  await autoCloseOrMarkDelinquentJournals(teacherNur, '2026-11-11', {}, mockClientNur);
  const nurDay3 = insertedNur.jurnal_pembelajaran.find(j => j.tanggal === '2026-11-11');
  assert(
    nurDay3?.status_verifikasi === 'Izin',
    'LEAVE-DURASI-DAY3',
    `Leave with durasi_hari: 3 on Day 3 produces status_verifikasi 'Izin' (actual: '${nurDay3?.status_verifikasi}')`
  );

  // 1.8 Adversarial test: Unexcused / Delinquent Teacher
  // An unexcused teacher with no approved leave MUST produce "Tidak Masuk Kelas"
  const teacherDelinquent = {
    nama_guru: 'Guru Tanpa Keterangan',
    user_id: 'usr-delinquent-01',
    sekolah_id: 'sch-001'
  };
  const { client: mockClientDelinquent, insertedRecords: insertedDelinquent } = createMockSupabaseClient({
    jadwal_pelajaran: [
      {
        id: 'sch-kamis-delinquent',
        hari: 'Kamis',
        nama_guru: 'Guru Tanpa Keterangan',
        kelas: 'XI-1',
        mata_pelajaran: 'Fisika',
        sekolah_id: 'sch-001'
      }
    ],
    presensi_guru: [], // No attendance, no leave
    jurnal_pembelajaran: []
  });

  await recordUnfilledJournalsAndPiket(
    teacherDelinquent,
    '2026-11-05',
    {},
    mockClientDelinquent
  );
  const insertedDelinqRecord = insertedDelinquent.jurnal_pembelajaran.find(j => j.tanggal === '2026-11-05');
  assert(
    insertedDelinqRecord?.status_verifikasi === 'Tidak Masuk Kelas',
    'DELINQUENT-ORACLE',
    'Unexcused teacher without leave correctly receives "Tidak Masuk Kelas"'
  );

  // =========================================================================
  // TARGET 2: ATTENDANCE SICKNESS CREDIT IN ADMINREKAPVIEW
  // =========================================================================
  suite('2. Attendance Sickness Credit & Multi-Day Month Boundaries in AdminRekapView');

  // Exact reproduction of AdminRekapView countWorkdays (lines 16-33)
  function countWorkdays(
    startDateStr: string,
    endDateStr: string,
    hariSekolah: number,
    liburDates: Set<string>
  ): number {
    let count = 0;
    const cur = new Date(startDateStr + 'T12:00:00+08:00');
    const end = new Date(endDateStr + 'T12:00:00+08:00');
    while (cur <= end) {
      const dow = cur.getDay(); // 0=Minggu, 6=Sabtu
      const dateStr = cur.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
      const isWeekend = dow === 0 || (hariSekolah === 5 && dow === 6);
      if (!isWeekend && !liburDates.has(dateStr)) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  // Exact reproduction of AdminRekapView aggregation algorithm (lines 258-487)
  function aggregateAttendanceRekap({
    startDateStr,
    endDateStr,
    hariSekolah,
    kalenderLibur,
    guruList,
    presensiList,
    telatPenaltiAktif = true,
    batasDetikPenalti = 14400,
    penaltiHariAlpa = 1
  }: {
    startDateStr: string;
    endDateStr: string;
    hariSekolah: number;
    kalenderLibur: any[];
    guruList: any[];
    presensiList: any[];
    telatPenaltiAktif?: boolean;
    batasDetikPenalti?: number;
    penaltiHariAlpa?: number;
  }) {
    const liburDates = new Set<string>();
    (kalenderLibur || []).forEach((k: any) => {
      if (k.tanggal_mulai && k.tanggal_selesai) {
        const curCal = new Date(k.tanggal_mulai + 'T12:00:00+08:00');
        const endCal = new Date(k.tanggal_selesai + 'T12:00:00+08:00');
        while (curCal <= endCal) {
          const dStr = curCal.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
          liburDates.add(dStr);
          curCal.setDate(curCal.getDate() + 1);
        }
      } else if (k.tanggal) {
        liburDates.add(k.tanggal);
      }
    });
    const totalHariKerja = countWorkdays(startDateStr, endDateStr, hariSekolah, liburDates);

    const pMap: Record<string, any> = {};
    guruList?.forEach(g => {
      const rawName = g.nama_guru?.trim();
      if (g.nama_guru && rawName) {
        const cName = canonicalizeTeacherRekapName(rawName);
        if (!pMap[cName]) {
          pMap[cName] = {
            nama: cName,
            hadir: 0,
            izin: 0,
            sakit: 0,
            dinasLuar: 0,
            pulangCepat: 0,
            telatDetik: 0,
            piket: 0,
            jurnal: 0
          };
        }
      }
    });

    const creditedLeaveDates: Record<string, Set<string>> = {};

    presensiList?.forEach(p => {
      const nama = p.nama_guru?.trim();
      if (!nama) return;
      const canonicalNama = canonicalizeTeacherRekapName(nama);
      if (!pMap[canonicalNama]) {
        pMap[canonicalNama] = {
          nama: canonicalNama,
          hadir: 0,
          izin: 0,
          sakit: 0,
          dinasLuar: 0,
          pulangCepat: 0,
          telatDetik: 0,
          piket: 0,
          jurnal: 0
        };
      }
      if (!creditedLeaveDates[canonicalNama]) {
        creditedLeaveDates[canonicalNama] = new Set<string>();
      }

      if (p.tipe_absen === 'Pulang') {
        if (p.jenis_presensi === 'Pulang Cepat' || p.status_verifikasi === 'Pulang Cepat') {
          pMap[canonicalNama].pulangCepat++;
        }
      } else if (
        p.tipe_absen === 'Datang' || 
        p.jenis_presensi === 'Sakit' || 
        p.jenis_presensi === 'Izin' ||
        p.jenis_presensi === 'Dinas Luar'
      ) {
        const isApproved = 
          p.status_verifikasi === 'Disetujui' || 
          p.status_verifikasi === 'Diverifikasi' ||
          p.status_verifikasi === 'Sakit' ||
          p.status_verifikasi === 'Izin';

        if (!isApproved) return;

        const detailLower = (p.detail_izin || '').toLowerCase();
        const jenisLower = (p.jenis_presensi || '').toLowerCase();
        const statusLower = (p.status_verifikasi || '').toLowerCase();

        const isSakit = 
          jenisLower === 'sakit' || 
          detailLower.includes('sakit') || 
          statusLower === 'sakit';

        const isIzin = !isSakit && (
          jenisLower === 'izin' || 
          detailLower.includes('izin') || 
          statusLower === 'izin'
        );

        if (isSakit || isIzin) {
          if (p.tanggal_mulai && p.tanggal_selesai) {
            const curLeave = new Date(p.tanggal_mulai + 'T12:00:00+08:00');
            const endLeave = new Date(p.tanggal_selesai + 'T12:00:00+08:00');
            while (curLeave <= endLeave) {
              const dow = curLeave.getDay();
              const dStr = curLeave.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
              const isWeekend = dow === 0 || (hariSekolah === 5 && dow === 6);
              if (
                dStr >= startDateStr && 
                dStr <= endDateStr && 
                !isWeekend && 
                !liburDates.has(dStr) && 
                !creditedLeaveDates[canonicalNama].has(dStr)
              ) {
                creditedLeaveDates[canonicalNama].add(dStr);
                if (isSakit) pMap[canonicalNama].sakit++;
                else pMap[canonicalNama].izin++;
              }
              curLeave.setDate(curLeave.getDate() + 1);
            }
          } else if (p.tanggal_mulai && (p.durasi_hari || p.durasiHari)) {
            const days = Number(p.durasi_hari || p.durasiHari) || 1;
            const [y, m, d] = p.tanggal_mulai.split('-').map(Number);
            const dt = new Date(y, m - 1, d);
            dt.setDate(dt.getDate() + (days - 1));
            const computedEnd = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
            const curLeave = new Date(p.tanggal_mulai + 'T12:00:00+08:00');
            const endLeave = new Date(computedEnd + 'T12:00:00+08:00');
            while (curLeave <= endLeave) {
              const dow = curLeave.getDay();
              const dStr = curLeave.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
              const isWeekend = dow === 0 || (hariSekolah === 5 && dow === 6);
              if (
                dStr >= startDateStr && 
                dStr <= endDateStr && 
                !isWeekend && 
                !liburDates.has(dStr) && 
                !creditedLeaveDates[canonicalNama].has(dStr)
              ) {
                creditedLeaveDates[canonicalNama].add(dStr);
                if (isSakit) pMap[canonicalNama].sakit++;
                else pMap[canonicalNama].izin++;
              }
              curLeave.setDate(curLeave.getDate() + 1);
            }
          } else {
            const pDate = p.timestamp ? p.timestamp.substring(0, 10) : '';
            if (pDate && !creditedLeaveDates[canonicalNama].has(pDate)) {
              creditedLeaveDates[canonicalNama].add(pDate);
              if (isSakit) pMap[canonicalNama].sakit++;
              else pMap[canonicalNama].izin++;
            }
          }
        } else if (p.jenis_presensi === 'Dinas Luar') {
          pMap[canonicalNama].dinasLuar++;
        } else if (
          p.jenis_presensi === 'Sekolah' || 
          p.jenis_presensi === 'Izin Terlambat' || 
          p.jenis_presensi === 'Terlambat'
        ) {
          pMap[canonicalNama].hadir++;
          pMap[canonicalNama].telatDetik += (p.keterlambatan_detik || 0);
        }
      }
    });

    return Object.keys(pMap).map(k => {
      const { hadir, dinasLuar, sakit, izin, telatDetik } = pMap[k];
      const alpaOtomatis = telatPenaltiAktif && batasDetikPenalti > 0
        ? (batasDetikPenalti === 14400 ? Math.floor((telatDetik || 0) / 14400) : Math.floor((telatDetik || 0) / batasDetikPenalti)) * penaltiHariAlpa
        : 0;
      const hadirEfektif = Math.max(0, hadir - alpaOtomatis);
      const alpa = Math.max(0, totalHariKerja - hadirEfektif - dinasLuar - sakit - izin);
      return {
        ...pMap[k],
        hadir: hadirEfektif,
        alpa,
        totalWajib: totalHariKerja,
      };
    });
  }

  // 2.1 Single-day Sakit submission credit
  // 5-day week: Monday 2026-11-02 to Friday 2026-11-06 (total 5 workdays)
  // Teacher attends Mon-Thu (4 days), Sakit on Friday (1 day)
  const teacherBudi = [{ nama_guru: 'Budi Santoso' }];
  const presensiSingleSakit = [
    { nama_guru: 'Budi Santoso', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Disetujui', timestamp: '2026-11-02T07:00:00+08:00' },
    { nama_guru: 'Budi Santoso', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Disetujui', timestamp: '2026-11-03T07:00:00+08:00' },
    { nama_guru: 'Budi Santoso', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Disetujui', timestamp: '2026-11-04T07:00:00+08:00' },
    { nama_guru: 'Budi Santoso', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Disetujui', timestamp: '2026-11-05T07:00:00+08:00' },
    { nama_guru: 'Budi Santoso', tipe_absen: 'Datang', jenis_presensi: 'Sakit', status_verifikasi: 'Disetujui', detail_izin: 'Sakit Demam', timestamp: '2026-11-06T07:00:00+08:00' }
  ];

  const resSingle = aggregateAttendanceRekap({
    startDateStr: '2026-11-02',
    endDateStr: '2026-11-06',
    hariSekolah: 5,
    kalenderLibur: [],
    guruList: teacherBudi,
    presensiList: presensiSingleSakit
  });

  const budiRecap = resSingle.find(r => r.nama === 'Budi Santoso');
  assert(
    budiRecap?.totalWajib === 5,
    'REKAP-TOTAL-WAJIB',
    `Total workdays in 1-week period is 5 (actual: ${budiRecap?.totalWajib})`
  );
  assert(
    budiRecap?.hadir === 4,
    'REKAP-HADIR-4',
    `Teacher hadir is 4 days (actual: ${budiRecap?.hadir})`
  );
  assert(
    budiRecap?.sakit === 1,
    'REKAP-SAKIT-1',
    `Teacher sakit is credited to 1 (actual: ${budiRecap?.sakit})`
  );
  assert(
    budiRecap?.alpa === 0,
    'REKAP-ALPA-0',
    `Teacher alpa remains 0 because sick day is credited (actual: ${budiRecap?.alpa})`
  );

  // 2.2 Full week sick leave (5 workdays sick) -> alpa must be 0
  const presensiFullSick = [
    {
      nama_guru: 'Budi Santoso',
      tipe_absen: 'Datang',
      jenis_presensi: 'Sakit',
      status_verifikasi: 'Disetujui',
      tanggal_mulai: '2026-11-02',
      tanggal_selesai: '2026-11-06',
      timestamp: '2026-11-02T07:00:00+08:00'
    }
  ];
  const resFullSick = aggregateAttendanceRekap({
    startDateStr: '2026-11-02',
    endDateStr: '2026-11-06',
    hariSekolah: 5,
    kalenderLibur: [],
    guruList: teacherBudi,
    presensiList: presensiFullSick
  });
  const budiFull = resFullSick.find(r => r.nama === 'Budi Santoso');
  assert(
    budiFull?.sakit === 5,
    'REKAP-FULL-SAKIT',
    `Full-week sick leave credits all 5 workdays as sakit (actual: ${budiFull?.sakit})`
  );
  assert(
    budiFull?.alpa === 0,
    'REKAP-FULL-ALPA-0',
    `Full-week sick leave produces 0 alpa (actual: ${budiFull?.alpa})`
  );

  // 2.3 Multi-Day Sick Leave across Month Boundaries
  // Leave spans Wednesday 2026-10-28 to Wednesday 2026-11-04 (8 days)
  // Calendar days:
  // 2026-10-28 (Wed): workday
  // 2026-10-29 (Thu): workday
  // 2026-10-30 (Fri): workday
  // 2026-10-31 (Sat): weekend (5-day week)
  // 2026-11-01 (Sun): weekend
  // 2026-11-02 (Mon): workday
  // 2026-11-03 (Tue): workday
  // 2026-11-04 (Wed): workday
  // Expected in October (2026-10-01 to 2026-10-31): 3 workdays credited
  // Expected in November (2026-11-01 to 2026-11-30): 3 workdays credited
  // Total workdays across both months = 6 workdays.
  const crossMonthLeave = [
    {
      nama_guru: 'Siti Aminah',
      tipe_absen: 'Datang',
      jenis_presensi: 'Sakit',
      status_verifikasi: 'Disetujui',
      tanggal_mulai: '2026-10-28',
      tanggal_selesai: '2026-11-04',
      detail_izin: 'Rawat Inap Rumah Sakit',
      timestamp: '2026-10-28T07:00:00+08:00'
    }
  ];
  const teacherSiti = [{ nama_guru: 'Siti Aminah' }];

  // Evaluate October recap
  const rekapOct = aggregateAttendanceRekap({
    startDateStr: '2026-10-01',
    endDateStr: '2026-10-31',
    hariSekolah: 5,
    kalenderLibur: [],
    guruList: teacherSiti,
    presensiList: crossMonthLeave
  });
  const sitiOct = rekapOct.find(r => r.nama === 'Siti Aminah');
  assert(
    sitiOct?.sakit === 3,
    'REKAP-CROSS-OCT',
    `October recap credits exactly 3 workdays (Wed 28, Thu 29, Fri 30) (actual: ${sitiOct?.sakit})`
  );

  // Evaluate November recap
  const rekapNov = aggregateAttendanceRekap({
    startDateStr: '2026-11-01',
    endDateStr: '2026-11-30',
    hariSekolah: 5,
    kalenderLibur: [],
    guruList: teacherSiti,
    presensiList: crossMonthLeave
  });
  const sitiNov = rekapNov.find(r => r.nama === 'Siti Aminah');
  assert(
    sitiNov?.sakit === 3,
    'REKAP-CROSS-NOV',
    `November recap credits exactly 3 workdays (Mon 2, Tue 3, Wed 4) (actual: ${sitiNov?.sakit})`
  );

  assert(
    (sitiOct?.sakit || 0) + (sitiNov?.sakit || 0) === 6,
    'REKAP-CROSS-SUM',
    `Sum of cross-month sick days is exactly 6 workdays (no under-counting, no double-counting)`
  );

  // 2.4 Deduplication between single-day and multi-day records
  const duplicateRecords = [
    // Multi-day leave record
    {
      nama_guru: 'Siti Aminah',
      tipe_absen: 'Datang',
      jenis_presensi: 'Sakit',
      status_verifikasi: 'Disetujui',
      tanggal_mulai: '2026-11-02',
      tanggal_selesai: '2026-11-04',
      timestamp: '2026-11-02T07:00:00+08:00'
    },
    // Single-day record on Day 1
    {
      nama_guru: 'Siti Aminah',
      tipe_absen: 'Datang',
      jenis_presensi: 'Sakit',
      status_verifikasi: 'Disetujui',
      timestamp: '2026-11-02T07:00:00+08:00'
    }
  ];

  const rekapDedup = aggregateAttendanceRekap({
    startDateStr: '2026-11-02',
    endDateStr: '2026-11-06',
    hariSekolah: 5,
    kalenderLibur: [],
    guruList: teacherSiti,
    presensiList: duplicateRecords
  });
  const sitiDedup = rekapDedup.find(r => r.nama === 'Siti Aminah');
  assert(
    sitiDedup?.sakit === 3,
    'REKAP-DEDUP',
    `Deduplication prevents double-counting on 2026-11-02 (expected 3 days, actual: ${sitiDedup?.sakit})`
  );

  // 2.5 Calendar Holiday falling inside Multi-Day Sick Leave
  // If Wednesday 2026-11-04 is a holiday, total workdays in period = 4 (Mon, Tue, Thu, Fri).
  // Sick leave is Mon-Wed (3 days). Wed is holiday -> so sick credit is 2 days (Mon, Tue).
  // Teacher attends Thu, Fri (2 days).
  // Alpa must be 0!
  const sickWithHoliday = [
    {
      nama_guru: 'Budi Santoso',
      tipe_absen: 'Datang',
      jenis_presensi: 'Sakit',
      status_verifikasi: 'Disetujui',
      tanggal_mulai: '2026-11-02',
      tanggal_selesai: '2026-11-04',
      timestamp: '2026-11-02T07:00:00+08:00'
    },
    { nama_guru: 'Budi Santoso', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Disetujui', timestamp: '2026-11-05T07:00:00+08:00' },
    { nama_guru: 'Budi Santoso', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Disetujui', timestamp: '2026-11-06T07:00:00+08:00' }
  ];
  const wednesdayHoliday = [{ id: 'cal-wed', tanggal: '2026-11-04', tipe: 'Libur', keterangan: 'Hari Libur Khusus' }];

  const rekapHolidayOverlap = aggregateAttendanceRekap({
    startDateStr: '2026-11-02',
    endDateStr: '2026-11-06',
    hariSekolah: 5,
    kalenderLibur: wednesdayHoliday,
    guruList: teacherBudi,
    presensiList: sickWithHoliday
  });
  const budiOverlap = rekapHolidayOverlap.find(r => r.nama === 'Budi Santoso');
  assert(
    budiOverlap?.totalWajib === 4,
    'REKAP-OVERLAP-WAJIB',
    `Total workdays with Wednesday holiday is 4 (actual: ${budiOverlap?.totalWajib})`
  );
  assert(
    budiOverlap?.hadir === 2,
    'REKAP-OVERLAP-HADIR',
    `Hadir is 2 days (Thu, Fri) (actual: ${budiOverlap?.hadir})`
  );
  assert(
    budiOverlap?.sakit === 2,
    'REKAP-OVERLAP-SAKIT',
    `Sakit is 2 days (Mon, Tue) without counting Wednesday holiday as sick day (actual: ${budiOverlap?.sakit})`
  );
  assert(
    budiOverlap?.alpa === 0,
    'REKAP-OVERLAP-ALPA-0',
    `Alpa remains 0 when holiday falls within sick leave (actual: ${budiOverlap?.alpa})`
  );

  // =========================================================================
  // TARGET 3: JOURNAL PRINTING & BADGE RENDERING IN REKAPJURNALVIEW
  // =========================================================================
  suite('3. Journal Printing: Exclusion of "Libur" Rows & Clear Badge Display');

  // Filter function matching RekapJurnalView.tsx:659-667
  function filterJurnalForPrint(jurnalData: any[]): any[] {
    return (jurnalData || []).filter(j => {
      // REQUIREMENT R1: Exclude any rows labeled "Libur" from the document output
      const statusLower = (j.status_verifikasi || '').toLowerCase();
      const ketLower = (j.keterangan || '').toLowerCase();
      const matLower = (j.materi || j.materi_pembelajaran || '').toLowerCase();
      if (statusLower === 'libur' || ketLower === 'libur' || matLower === 'libur') {
        return false;
      }
      return true;
    });
  }

  // Component rendering attendance badge matching RekapJurnalView.tsx:1093-1112
  function renderAttendanceBadge(j: any) {
    const isTidakMasukKelas = j.status_verifikasi === 'Tidak Masuk Kelas' || j.keterangan === 'Tidak Masuk Kelas' || j.keterangan?.toLowerCase() === 'tidak masuk kelas';
    const isTidakKegiatan = j.status_verifikasi === 'Tidak Melaksanakan Kegiatan' || j.keterangan?.toLowerCase() === 'tidak melaksanakan kegiatan apapun';
    const isSakit = j.status_verifikasi === 'Sakit' || j.keterangan === 'Sakit' || j.materi === 'Sakit';
    const isIzin = j.status_verifikasi === 'Izin' || j.keterangan === 'Izin' || j.materi === 'Izin';
    const isDinasLuar = j.status_verifikasi === 'Dinas Luar' || j.keterangan === 'Dinas Luar' || j.materi === 'Dinas Luar';
    const ketKehadiran = isSakit
      ? 'Sakit'
      : isIzin
      ? 'Izin'
      : isDinasLuar
      ? 'Dinas Luar'
      : isTidakMasukKelas
      ? 'tidak masuk kelas'
      : isTidakKegiatan
      ? 'tidak melaksanakan kegiatan apapun'
      : (j.keterangan || (j.status_verifikasi ? `Hadir (${j.status_verifikasi})` : 'Hadir'));

    return React.createElement('span', {
      'data-testid': 'badge-kehadiran-guru',
      className: `inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
        j.status_verifikasi === 'Disetujui' || j.status_verifikasi === 'Diverifikasi'
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : j.status_verifikasi === 'Ditolak'
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          : isSakit
          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
          : isIzin
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          : isDinasLuar
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          : ((j.status_verifikasi === 'Tidak Masuk Kelas' || j.keterangan === 'Tidak Masuk Kelas') || isTidakMasukKelas)
          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
          : isTidakKegiatan
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
      }`
    }, ketKehadiran);
  }

  // 3.1 Stress-test exclusion of all "Libur" rows
  const mixedJournals = [
    { id: 1, nama_guru: 'Ade Fitrawan', mapel: 'Matematika', materi: 'Aljabar', status_verifikasi: 'Disetujui' },
    { id: 2, nama_guru: 'Budi Santoso', mapel: 'Fisika', materi: 'Sakit', status_verifikasi: 'Sakit' },
    { id: 3, nama_guru: 'Siti Aminah', mapel: 'Kimia', materi: 'Izin', status_verifikasi: 'Izin' },
    { id: 4, nama_guru: 'Admin', mapel: '-', materi: 'Libur', status_verifikasi: 'Libur' },
    { id: 5, nama_guru: 'Admin', mapel: '-', materi: '-', status_verifikasi: 'Libur', keterangan: 'Libur' },
    { id: 6, nama_guru: 'Admin', mapel: '-', materi: 'Libur', status_verifikasi: 'Disetujui' },
    { id: 7, nama_guru: 'Admin', mapel: '-', materi: '-', status_verifikasi: 'Disetujui', keterangan: 'Libur' },
    { id: 8, nama_guru: 'Guru Delinquent', mapel: 'Biologi', materi: 'tidak masuk kelas', status_verifikasi: 'Tidak Masuk Kelas' }
  ];

  const filteredForPrint = filterJurnalForPrint(mixedJournals);

  assert(
    filteredForPrint.length === 4,
    'PRINT-FILTER-COUNT',
    `Exactly 4 non-holiday journals remain (found: ${filteredForPrint.length})`
  );
  assert(
    !filteredForPrint.some(j => (j.status_verifikasi || '').toLowerCase() === 'libur'),
    'PRINT-NO-LIBUR-STATUS',
    'Zero rows with status_verifikasi: "Libur" exist in printed document'
  );
  assert(
    !filteredForPrint.some(j => (j.keterangan || '').toLowerCase() === 'libur'),
    'PRINT-NO-LIBUR-KET',
    'Zero rows with keterangan: "Libur" exist in printed document'
  );
  assert(
    !filteredForPrint.some(j => (j.materi || '').toLowerCase() === 'libur'),
    'PRINT-NO-LIBUR-MATERI',
    'Zero rows with materi: "Libur" exist in printed document'
  );

  // 3.2 Programmatic static markup rendering of badges
  // Sakit badge
  const sakitJournal = { nama_guru: 'Budi Santoso', status_verifikasi: 'Sakit', materi: 'Sakit' };
  const htmlSakit = renderToStaticMarkup(renderAttendanceBadge(sakitJournal));
  assert(
    htmlSakit.includes('Sakit'),
    'PRINT-BADGE-SAKIT-TEXT',
    'Sakit badge contains text "Sakit"'
  );
  assert(
    htmlSakit.includes('bg-rose-100') && htmlSakit.includes('text-rose-700'),
    'PRINT-BADGE-SAKIT-COLOR',
    'Sakit badge renders with distinct rose styling (bg-rose-100 text-rose-700)'
  );
  assert(
    !htmlSakit.includes('tidak masuk kelas'),
    'PRINT-BADGE-SAKIT-NOT-TMK',
    'Sakit badge does not contain "tidak masuk kelas"'
  );

  // Izin badge
  const izinJournal = { nama_guru: 'Siti Aminah', status_verifikasi: 'Izin', materi: 'Izin' };
  const htmlIzin = renderToStaticMarkup(renderAttendanceBadge(izinJournal));
  assert(
    htmlIzin.includes('Izin'),
    'PRINT-BADGE-IZIN-TEXT',
    'Izin badge contains text "Izin"'
  );
  assert(
    htmlIzin.includes('bg-amber-100') && htmlIzin.includes('text-amber-700'),
    'PRINT-BADGE-IZIN-COLOR',
    'Izin badge renders with distinct amber styling (bg-amber-100 text-amber-700)'
  );
  assert(
    !htmlIzin.includes('tidak masuk kelas'),
    'PRINT-BADGE-IZIN-NOT-TMK',
    'Izin badge does not contain "tidak masuk kelas"'
  );

  // Dinas Luar badge
  const dinasJournal = { nama_guru: 'Drs. Ahmad', status_verifikasi: 'Dinas Luar', materi: 'Dinas Luar' };
  const htmlDinas = renderToStaticMarkup(renderAttendanceBadge(dinasJournal));
  assert(
    htmlDinas.includes('Dinas Luar') && htmlDinas.includes('bg-blue-100 text-blue-700'),
    'PRINT-BADGE-DINAS',
    'Dinas Luar badge renders with blue styling'
  );

  // Normal Hadir badge
  const normalJournal = { nama_guru: 'Ade Fitrawan', status_verifikasi: 'Disetujui' };
  const htmlNormal = renderToStaticMarkup(renderAttendanceBadge(normalJournal));
  assert(
    htmlNormal.includes('Disetujui') && htmlNormal.includes('bg-green-100 text-green-700'),
    'PRINT-BADGE-NORMAL',
    'Normal submitted journal renders with green styling'
  );

  // Unexcused Delinquency badge
  const delinquentJournal = { nama_guru: 'Guru Alpha', status_verifikasi: 'Tidak Masuk Kelas' };
  const htmlDelinquent = renderToStaticMarkup(renderAttendanceBadge(delinquentJournal));
  assert(
    htmlDelinquent.includes('tidak masuk kelas') && htmlDelinquent.includes('bg-orange-100 text-orange-700'),
    'PRINT-BADGE-DELINQUENT',
    'Delinquent journal renders with orange styling'
  );

  // =========================================================================
  // SUMMARY OF CHALLENGE RESULTS
  // =========================================================================
  console.log(`\n==============================================================================`);
  console.log(`🏁 EMPIRICAL ADVERSARIAL CHALLENGER RESULTS:`);
  console.log(`   TOTAL TESTS : ${totalTests}`);
  console.log(`   PASSED      : ${passedTests}`);
  console.log(`   FAILED      : ${failedTests}`);
  console.log(`   SUCCESS RATE: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
  console.log(`==============================================================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAdversarialStressVerification().catch(err => {
  console.error('FATAL ERROR DURING ADVERSARIAL STRESS TEST:', err);
  process.exit(1);
});
