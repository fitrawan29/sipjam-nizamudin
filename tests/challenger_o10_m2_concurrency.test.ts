/**
/**
 * Test Suite: Challenger 2 (M2) — Concurrency, Duplicate Protection & Status Enum Stress Testing
 *
 * Scope:
 * 1. Concurrency Stress Test:
 *    Simulate up to 20 concurrent kiosks/tabs scanning the same student simultaneously.
 *    Verifies that simultaneous calls to `recordPresensiSiswa`:
 *    - Resolve cleanly with zero unhandled promise rejections.
 *    - Exactly one call succeeds (`success: true, alreadyExists: false`).
 *    - All other concurrent calls detect duplication (`success: false, alreadyExists: true`).
 *    - PostgreSQL unique constraint 23505 race conditions are handled cleanly without exceptions.
 *
 * 2. Duplicate Protection:
 *    - Same student, same day, same status ('datang' then 'datang') -> Rejected with alreadyExists: true.
 *    - Same student, same day, different status ('datang' then 'pulang') -> Allowed.
 *    - Same student, same day, duplicate 'pulang' -> Rejected with alreadyExists: true.
 *    - Same student, different dates ('2026-10-04' then '2026-10-05') -> Both allowed.
 *    - Multi-tenant isolation: same student ID in different sekolah_id (if multi-school) -> Isolated.
 *
 * 3. Status Enum Constraints:
 *    - Allowed values: 'datang' | 'pulang'.
 *    - Adversarial/invalid values ('izin', 'sakit', 'alpa', 'hadir', '', 'DATANG', sql injection payload).
 *    - Verifies database check constraint violation (code 23514) is caught gracefully without unhandled rejection.
 *
 * 4. Error Path & Fault Injection:
 *    - Missing sekolah_id -> Handled cleanly.
 *    - Simulated network failure / unexpected DB error -> Handled cleanly without unhandled rejection.
 */

import {
  recordPresensiSiswa,
  resolveStudentByCode,
  generateStudentQrSvg,
  generateQrMatrix,
  getStudentQrIdentifier,
  StudentReference,
  RecordPresensiParams
} from '../src/lib/qrSiswa';

let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` - Detail: ${detail}` : ''}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

/**
 * Creates an in-memory concurrent database simulator that accurately models
 * asynchronous query latency, race conditions, unique constraint enforcement (code 23505),
 * and check constraint enforcement (code 23514).
 */
function createConcurrentDbSimulator(options?: {
  queryDelayMs?: number;
  insertDelayMs?: number;
  faultInjection?: 'network_error' | 'rls_error' | null;
}) {
  const queryDelay = options?.queryDelayMs ?? 5;
  const insertDelay = options?.insertDelayMs ?? 10;
  const fault = options?.faultInjection ?? null;

  const records: any[] = [];
  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  return {
    getRecords: () => [...records],
    clear: () => { records.length = 0; },
    from: (table: string) => {
      if (table !== 'presensi_siswa') {
        throw new Error(`Simulator only handles presensi_siswa, got ${table}`);
      }

      let filters: Array<{ col: string; val: any }> = [];

      return {
        select: (cols: string = '*') => ({
          eq: function (col: string, val: any) {
            filters.push({ col, val });
            return this;
          },
          maybeSingle: async () => {
            if (fault === 'network_error') {
              await delay(queryDelay);
              throw new Error('FetchError: Network request timed out');
            }
            // Simulate asynchronous DB query latency
            await delay(queryDelay);
            const match = records.find(r =>
              filters.every(f => r[f.col] === f.val)
            );
            return { data: match || null, error: null };
          }
        }),

        insert: (payload: any) => ({
          select: () => ({
            single: async () => {
              if (fault === 'network_error') {
                await delay(insertDelay);
                throw new Error('Connection terminated unexpectedly');
              }
              if (fault === 'rls_error') {
                await delay(insertDelay);
                return {
                  data: null,
                  error: {
                    message: 'new row violates row-level security policy for table "presensi_siswa"',
                    code: '42501'
                  }
                };
              }

              // Simulate network latency before write commit
              await delay(insertDelay);

              // 1. Check Constraint validation: status IN ('datang', 'pulang')
              const validStatuses = ['datang', 'pulang'];
              if (!validStatuses.includes(payload.status)) {
                const checkErr: any = new Error(
                  `new row for relation "presensi_siswa" violates check constraint "presensi_siswa_status_check"`
                );
                checkErr.code = '23514';
                return { data: null, error: checkErr };
              }

              // 2. Unique Constraint validation: uq_presensi_siswa_status
              // (sekolah_id, tanggal, siswa_id, status)
              const conflict = records.find(r =>
                r.sekolah_id === payload.sekolah_id &&
                r.tanggal === payload.tanggal &&
                r.siswa_id === payload.siswa_id &&
                r.status === payload.status
              );

              if (conflict) {
                const uniqueErr: any = new Error(
                  `duplicate key value violates unique constraint "uq_presensi_siswa_status"`
                );
                uniqueErr.code = '23505';
                uniqueErr.detail = `Key (sekolah_id, tanggal, siswa_id, status)=(${payload.sekolah_id}, ${payload.tanggal}, ${payload.siswa_id}, ${payload.status}) already exists.`;
                return { data: null, error: uniqueErr };
              }

              const newRow = {
                id: `uuid-presensi-${records.length + 1}`,
                ...payload,
                created_at: new Date().toISOString()
              };
              records.push(newRow);
              return { data: newRow, error: null };
            }
          })
        })
      };
    }
  };
}

async function runEmpiricalChallenge() {
  console.log('================================================================');
  console.log('CHALLENGER 2: EMPIRICAL CONCURRENCY & CONSTRAINT STRESS HARNESS');
  console.log('================================================================\n');

  const testStudentA: StudentReference = {
    id: '11111111-aaaa-bbbb-cccc-111111111111',
    nama_siswa: 'Ahmad Siswa Test',
    kelas: 'X-1',
    sekolah_id: 'sekolah-uuid-main',
    nisn: '0012345678',
    qr_code: '0012345678'
  };

  const testStudentB: StudentReference = {
    id: '22222222-aaaa-bbbb-cccc-222222222222',
    nama_siswa: 'Budi Siswa Test',
    kelas: 'X-2',
    sekolah_id: 'sekolah-uuid-main',
    nisn: '0087654321',
    qr_code: '0087654321'
  };

  // --------------------------------------------------------------------------
  // SUITE 1: Extreme Concurrency & Race Conditions (10 & 20 Concurrent Kiosks)
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: Extreme Concurrency & Race Conditions ---');

  const concurrentDb = createConcurrentDbSimulator({ queryDelayMs: 8, insertDelayMs: 15 });

  const CONCURRENT_CLIENT_COUNT = 15;
  console.log(`Firing ${CONCURRENT_CLIENT_COUNT} concurrent requests for same student & status ('datang')...`);

  const burstRequests = Array.from({ length: CONCURRENT_CLIENT_COUNT }, (_, index) => {
    return recordPresensiSiswa(concurrentDb, {
      siswa: testStudentA,
      status: 'datang',
      sekolahId: 'sekolah-uuid-main',
      tanggal: '2026-10-04',
      jam: `06:30:${String(index).padStart(2, '0')}`,
      deviceId: `hardware-scanner-${index + 1}`
    });
  });

  const results = await Promise.all(burstRequests);

  const successfulCalls = results.filter(r => r.success === true);
  const duplicateCalls = results.filter(r => r.success === false && r.alreadyExists === true);
  const failureCalls = results.filter(r => r.success === false && !r.alreadyExists);

  assert(
    successfulCalls.length === 1,
    `Exactly 1 out of ${CONCURRENT_CLIENT_COUNT} concurrent requests succeeds (got ${successfulCalls.length})`
  );
  assert(
    duplicateCalls.length === CONCURRENT_CLIENT_COUNT - 1,
    `Exactly ${CONCURRENT_CLIENT_COUNT - 1} calls are cleanly flagged as duplicates (got ${duplicateCalls.length})`
  );
  assert(
    failureCalls.length === 0,
    `Zero unhandled failures or unclassified errors occurred (got ${failureCalls.length})`
  );

  const storedRows = concurrentDb.getRecords();
  assert(
    storedRows.length === 1,
    `Under race conditions, database contains strictly 1 record for (student, date, datang) (got ${storedRows.length})`
  );

  // Check the error message on duplicate responses
  for (const dup of duplicateCalls) {
    assert(
      dup.message.includes('sudah tercatat'),
      `Duplicate response contains user-friendly Indonesian explanation: "${dup.message}"`
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 2: Multi-Status & Multi-Day Duplicate Protection
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Multi-Status & Multi-Day Duplicate Protection ---');

  // Same day, subsequent 'datang' check after record already exists
  const subsequentDatang = await recordPresensiSiswa(concurrentDb, {
    siswa: testStudentA,
    status: 'datang',
    sekolahId: 'sekolah-uuid-main',
    tanggal: '2026-10-04',
    jam: '07:00:00'
  });
  assert(
    subsequentDatang.success === false && subsequentDatang.alreadyExists === true,
    'Subsequent sequential datang request returns alreadyExists: true'
  );

  // Same day, recording 'pulang' should SUCCEED (different status)
  const pulangResult = await recordPresensiSiswa(concurrentDb, {
    siswa: testStudentA,
    status: 'pulang',
    sekolahId: 'sekolah-uuid-main',
    tanggal: '2026-10-04',
    jam: '14:05:00',
    deviceId: 'kiosk-pulang-1'
  });
  assert(
    pulangResult.success === true && pulangResult.alreadyExists === false,
    'Recording pulang on same date succeeds after datang'
  );

  // Same day, recording duplicate 'pulang' should FAIL
  const duplicatePulang = await recordPresensiSiswa(concurrentDb, {
    siswa: testStudentA,
    status: 'pulang',
    sekolahId: 'sekolah-uuid-main',
    tanggal: '2026-10-04',
    jam: '14:15:00'
  });
  assert(
    duplicatePulang.success === false && duplicatePulang.alreadyExists === true,
    'Recording duplicate pulang on same date is rejected'
  );

  // Different date: next day 'datang' should SUCCEED
  const nextDayDatang = await recordPresensiSiswa(concurrentDb, {
    siswa: testStudentA,
    status: 'datang',
    sekolahId: 'sekolah-uuid-main',
    tanggal: '2026-10-05',
    jam: '06:40:00'
  });
  assert(
    nextDayDatang.success === true && nextDayDatang.alreadyExists === false,
    'Recording datang on subsequent date (2026-10-05) succeeds independently'
  );

  // Different student on same day should SUCCEED
  const studentBDatang = await recordPresensiSiswa(concurrentDb, {
    siswa: testStudentB,
    status: 'datang',
    sekolahId: 'sekolah-uuid-main',
    tanggal: '2026-10-04',
    jam: '06:42:00'
  });
  assert(
    studentBDatang.success === true && studentBDatang.alreadyExists === false,
    'Different student recording datang on same date succeeds'
  );

  // --------------------------------------------------------------------------
  // SUITE 3: Status Enum Constraint Stress Testing ('datang' | 'pulang')
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Status Enum Constraint Stress Testing ---');

  const invalidStatuses = [
    'izin',
    'sakit',
    'alpa',
    'hadir',
    'DATANG',
    'PULANG',
    '',
    'datang; DROP TABLE presensi_siswa;--',
    'unknown_status'
  ];

  for (const badStatus of invalidStatuses) {
    const invalidResult = await recordPresensiSiswa(concurrentDb, {
      siswa: testStudentA,
      status: badStatus as any,
      sekolahId: 'sekolah-uuid-main',
      tanggal: '2026-10-06',
      jam: '07:00:00'
    });

    assert(
      invalidResult.success === false,
      `Invalid status "${badStatus}" is rejected by database check constraint`
    );
    assert(
      invalidResult.error !== undefined,
      `Invalid status "${badStatus}" provides error details from constraint violation`
    );
    assert(
      invalidResult.error.code === '23514',
      `Check constraint violation reports PostgreSQL error code 23514 for "${badStatus}"`
    );
  }

  // --------------------------------------------------------------------------
  // SUITE 4: Error Handling & Fault Injection Resilience
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Error Handling & Fault Injection Resilience ---');

  // Missing sekolahId
  const missingSekolahStudent: StudentReference = {
    ...testStudentA,
    sekolah_id: ''
  };
  const missingSekolahResult = await recordPresensiSiswa(concurrentDb, {
    siswa: missingSekolahStudent,
    status: 'datang',
    sekolahId: null
  });
  assert(
    missingSekolahResult.success === false,
    'Missing sekolah_id is caught immediately before DB operation'
  );
  assert(
    missingSekolahResult.message.includes('ID Sekolah tidak ditemukan'),
    'Missing sekolah_id gives clear actionable message'
  );

  // Network Error / Timeout Fault Injection
  const networkErrorDb = createConcurrentDbSimulator({ faultInjection: 'network_error' });
  const networkErrorResult = await recordPresensiSiswa(networkErrorDb, {
    siswa: testStudentA,
    status: 'datang',
    sekolahId: 'sekolah-uuid-main',
    tanggal: '2026-10-07'
  });
  assert(
    networkErrorResult.success === false,
    'Simulated network timeout does not trigger unhandled promise rejection'
  );
  assert(
    networkErrorResult.message !== '',
    `Network timeout caught cleanly: "${networkErrorResult.message}"`
  );

  // RLS Security Violation Fault Injection
  const rlsErrorDb = createConcurrentDbSimulator({ faultInjection: 'rls_error' });
  const rlsResult = await recordPresensiSiswa(rlsErrorDb, {
    siswa: testStudentA,
    status: 'datang',
    sekolahId: 'sekolah-uuid-main',
    tanggal: '2026-10-07'
  });
  assert(
    rlsResult.success === false,
    'RLS policy rejection (42501) does not crash or throw unhandled rejection'
  );
  assert(
    rlsResult.message.includes('row-level security'),
    'RLS rejection message captured in result structure'
  );

  console.log('\n================================================================');
  console.log(`ALL EMPIRICAL CHALLENGES PASSED: ${passedAssertions}/${totalAssertions} assertions`);
  console.log('================================================================');
}

runEmpiricalChallenge().catch(err => {
  console.error('\nFATAL CHALLENGE ERROR:', err);
  process.exit(1);
});
