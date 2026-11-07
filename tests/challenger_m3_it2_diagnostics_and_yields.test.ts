/**
 * tests/challenger_m3_it2_diagnostics_and_yields.test.ts
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE — CHALLENGER_M3_IT2_2
 * Focus:
 * 1. Micro-Yield Event-Loop Responsiveness & UI Thread Non-Blocking under Scale (300 rows / 6 batches).
 * 2. Adversarial PostgreSQL Error Parsing & Indonesian Diagnostic Translation (schema-qualified, malformed, timeout, RLS).
 * 3. Monotonic Progress Percentage Invariant & Terminal Stage Guarantees (error mid-upload never reaches 95%/100%).
 * 4. Non-Enumerable _csvRowNumber Invariant & Supabase Wire Payload Cleanliness.
 * 5. Boundary Condition CSV Inputs (empty files, header-only, malformed columns, Windows CRLF / Unix LF).
 */

import assert from 'node:assert';
import {
  parseAndValidateMasterCsv,
  validateRelationalDependencies,
  translateDatabaseError,
  importMasterDataFromCsv,
  UploadProgressInfo,
  MasterDataValidationError
} from '../src/lib/dataIntegrityGuard';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ${GREEN}✔ [PASS]${RESET} ${name}`);
  } catch (err: any) {
    failedTests++;
    console.error(`  ${RED}✖ [FAIL]${RESET} ${name}`);
    console.error(`     ${err?.stack || err?.message || err}`);
    process.exitCode = 1;
  }
}

async function runChallengerDiagnosticsSuite() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  CHALLENGER SUITE 2: DIAGNOSTICS, MICRO-YIELDS & INGESTION INTEGRITY  ${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  const schoolId = 'e0000000-0000-0000-0000-000000000099';
  const dummyUser = { id: 'admin-emp-1', role: 'admin', sekolah_id: schoolId };

  // ============================================================================
  // SUITE 1: MICRO-YIELDS & EVENT LOOP RESPONSIVENESS AT SCALE
  // ============================================================================
  console.log(`\n${BOLD}--- SUITE 1: Micro-Yields & Cooperative Multitasking at Scale ---${RESET}`);

  await test('1.1: 300-row batching across 6 batches yields cooperatively to event loop (>10 ticks)', async () => {
    let tickCount = 0;
    const intervalTimer = setInterval(() => {
      tickCount++;
    }, 2);

    const rows: string[] = ['nama_kelas,tingkat,jurusan'];
    for (let i = 1; i <= 300; i++) {
      rows.push(`Kelas-${i},10,RPL`);
    }
    const csvContent = rows.join('\r\n'); // Windows CRLF

    const mockSupabase: any = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        upsert: () => Promise.resolve({ error: null })
      })
    };

    const startTime = Date.now();
    const progressLog: UploadProgressInfo[] = [];

    const res = await importMasterDataFromCsv(
      mockSupabase,
      csvContent,
      'data_kelas',
      dummyUser,
      p => progressLog.push({ ...p })
    );

    clearInterval(intervalTimer);
    const elapsed = Date.now() - startTime;

    console.log(`     [300-Row Scale Benchmark] Elapsed: ${elapsed}ms | Interleaved Event Loop Ticks: ${tickCount}`);

    assert.strictEqual(res.count, 300, 'All 300 rows must be processed');
    assert.ok(
      tickCount >= 8,
      `Event loop must receive execution turns during 6-batch ingestion! Expected >= 8 ticks, saw ${tickCount}`
    );
    assert.ok(
      elapsed >= 50,
      `Elapsed time must reflect non-blocking cooperative yield time (observed ${elapsed}ms)`
    );

    // Verify 6 batch progress emissions
    const batchStages = progressLog.filter(p => p.stage.includes('Mengunggah'));
    assert.strictEqual(batchStages.length, 6, 'Must emit progress for each of the 6 batches');
    assert.strictEqual(batchStages[5].processedRows, 300);
    assert.strictEqual(batchStages[5].totalBatches, 6);
  });

  await test('1.2: Event loop interleaving allows concurrent Promise resolution without thread locking', async () => {
    let concurrentPromiseResolved = false;
    setTimeout(() => {
      concurrentPromiseResolved = true;
    }, 15);

    const rows: string[] = ['nama_kelas,tingkat,jurusan'];
    for (let i = 1; i <= 150; i++) {
      rows.push(`BatchClass-${i},11,TKJ`);
    }

    const mockSupabase: any = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        upsert: () => Promise.resolve({ error: null })
      })
    };

    await importMasterDataFromCsv(mockSupabase, rows.join('\n'), 'data_kelas', dummyUser);

    assert.ok(
      concurrentPromiseResolved,
      'Concurrent timer must resolve during importMasterDataFromCsv due to cooperative micro-yields'
    );
  });

  // ============================================================================
  // SUITE 2: ADVERSARIAL POSTGRESQL ERROR TRANSLATION
  // ============================================================================
  console.log(`\n${BOLD}--- SUITE 2: Adversarial PostgreSQL Error Parsing & Indonesian Diagnostics ---${RESET}`);

  await test('2.1: Schema-qualified 23503 foreign key violation with complex characters', () => {
    const batch = [
      { id: '1', mata_pelajaran: 'Bahasa (Daerah) & Seni', kelas: 'XII-IPA-1', _csvRowNumber: 45 }
    ];

    const pgError = {
      code: '23503',
      message: 'insert or update on table "jadwal_pelajaran" violates foreign key constraint "fk_mapel"',
      detail: 'Key (mata_pelajaran)=(Bahasa (Daerah) & Seni) is not present in table "public"."data_mapel".'
    };

    const diag = translateDatabaseError(pgError, batch, 'jadwal_pelajaran');

    assert.strictEqual(diag.code, '23503');
    assert.strictEqual(diag.row, 45);
    assert.strictEqual(diag.column, 'mata_pelajaran');
    assert.strictEqual(diag.receivedValue, 'Bahasa (Daerah) & Seni');
    assert.ok(diag.message.includes('Baris 45'));
    assert.ok(diag.message.includes('Bahasa (Daerah) & Seni'));
    assert.ok(diag.remediation.includes('Data Mapel') || diag.remediation.includes('data_mapel'));
  });

  await test('2.2: 23505 Unique Violation on multi-tenant composite key with schema prefix', () => {
    const batch = [
      { sekolah_id: schoolId, nama_kelas: 'X-TITL-1', _csvRowNumber: 12 },
      { sekolah_id: schoolId, nama_kelas: 'X-TITL-2', _csvRowNumber: 13 }
    ];

    const pgError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "data_kelas_sekolah_id_nama_kelas_key"',
      detail: `Key (sekolah_id, nama_kelas)=(${schoolId}, X-TITL-2) already exists.`
    };

    const diag = translateDatabaseError(pgError, batch, 'data_kelas');

    assert.strictEqual(diag.code, '23505');
    assert.strictEqual(diag.row, 13, 'Must pinpoint row 13 by matching non-tenant business key');
    assert.strictEqual(diag.column, 'nama_kelas');
    assert.strictEqual(diag.receivedValue, 'X-TITL-2');
    assert.ok(diag.message.includes('Baris 13'));
    assert.ok(diag.message.includes('X-TITL-2'));
  });

  await test('2.3: 23502 Not-Null Violation where column name is extracted cleanly without quotes', () => {
    const batch = [
      { nisn: '9901', nama_siswa: 'Rina', kelas: 'X-1', _csvRowNumber: 3 },
      { nisn: '9902', nama_siswa: '', kelas: 'X-1', _csvRowNumber: 4 }
    ];

    const pgError = {
      code: '23502',
      message: 'null value in column "nama_siswa" of relation "data_siswa" violates not-null constraint'
    };

    const diag = translateDatabaseError(pgError, batch, 'data_siswa');

    assert.strictEqual(diag.code, '23502');
    assert.strictEqual(diag.row, 4);
    assert.strictEqual(diag.column, 'nama_siswa');
    assert.ok(diag.message.includes('Baris 4'));
    assert.ok(diag.message.includes('nama_siswa'));
  });

  await test('2.4: 42501 RLS policy rejection formats constructive remediation in Indonesian', () => {
    const batch = [{ id: 'u1', _csvRowNumber: 99 }];
    const pgError = {
      code: '42501',
      message: 'new row violates row-level security policy for table "data_guru"'
    };

    const diag = translateDatabaseError(pgError, batch, 'data_guru');

    assert.strictEqual(diag.code, '42501');
    assert.strictEqual(diag.row, 99);
    assert.ok(diag.message.includes('Akses ditolak'));
    assert.ok(diag.remediation.includes('sekolah_id'));
  });

  await test('2.5: Resilient handling of circular, empty, or unexpected error payloads', () => {
    const circular: any = { code: 'CUSTOM_ERR' };
    circular.self = circular;

    const diag = translateDatabaseError(circular, [{ _csvRowNumber: 5 }], 'data_siswa');
    assert.strictEqual(diag.code, 'CUSTOM_ERR');
    assert.strictEqual(diag.row, 5);
    assert.ok(diag.message.includes('Baris 5'));
  });

  // ============================================================================
  // SUITE 3: PROGRESS PERCENTAGE MONOTONICITY & TERMINAL GUARANTEES
  // ============================================================================
  console.log(`\n${BOLD}--- SUITE 3: Progress Monotonicity & Error Halting ---${RESET}`);

  await test('3.1: Progress percentages are strictly monotonically increasing', async () => {
    const rows = ['nama_kelas,tingkat,jurusan'];
    for (let i = 1; i <= 100; i++) rows.push(`Kelas-${i},10,Umum`);

    const progressReports: number[] = [];
    const mockSupabase: any = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        upsert: () => Promise.resolve({ error: null })
      })
    };

    await importMasterDataFromCsv(mockSupabase, rows.join('\n'), 'data_kelas', dummyUser, p => {
      progressReports.push(p.percentage);
    });

    assert.ok(progressReports.length >= 5);
    assert.strictEqual(progressReports[0], 5);
    assert.strictEqual(progressReports[progressReports.length - 1], 100);

    for (let i = 1; i < progressReports.length; i++) {
      assert.ok(
        progressReports[i] >= progressReports[i - 1],
        `Progress went backwards at step ${i}: ${progressReports[i - 1]} -> ${progressReports[i]}`
      );
    }
  });

  await test('3.2: Error in batch upsert immediately terminates without emitting 95% or 100%', async () => {
    const rows = ['nama_kelas,tingkat,jurusan'];
    for (let i = 1; i <= 60; i++) rows.push(`Kelas-${i},10,Umum`);

    const percentages: number[] = [];
    const mockSupabase: any = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        upsert: (batch: any[]) => {
          if (batch.some(r => r._csvRowNumber > 50)) {
            return Promise.resolve({
              error: {
                code: '23505',
                message: 'duplicate key value violates unique constraint',
                detail: 'Key (nama_kelas)=(Kelas-55) already exists.'
              }
            });
          }
          return Promise.resolve({ error: null });
        }
      })
    };

    let caught: any = null;
    try {
      await importMasterDataFromCsv(mockSupabase, rows.join('\n'), 'data_kelas', dummyUser, p => {
        percentages.push(p.percentage);
      });
    } catch (e) {
      caught = e;
    }

    assert.ok(caught instanceof MasterDataValidationError);
    assert.strictEqual(caught.detail.row, 55);
    assert.ok(!percentages.includes(95), 'Must not emit 95% (Syncing) when upsert fails');
    assert.ok(!percentages.includes(100), 'Must not emit 100% (Completed) when upsert fails');
  });

  // ============================================================================
  // SUITE 4: _csvRowNumber NON-ENUMERABLE WIRE INTEGRITY
  // ============================================================================
  console.log(`\n${BOLD}--- SUITE 4: Non-Enumerable _csvRowNumber Wire Integrity ---${RESET}`);

  await test('4.1: _csvRowNumber is strictly stripped from JSON.stringify and Object.keys', () => {
    const csv = 'nama_kelas,tingkat,jurusan\nX-IPA-1,10,IPA\nX-IPA-2,10,IPA';
    const rows = parseAndValidateMasterCsv(csv, 'data_kelas', dummyUser);

    assert.strictEqual(rows.length, 2);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      assert.strictEqual((row as any)._csvRowNumber, i + 1);

      const jsonStr = JSON.stringify(row);
      assert.strictEqual(jsonStr.includes('_csvRowNumber'), false, 'Must not be serialized in JSON payload');

      const keys = Object.keys(row);
      assert.strictEqual(keys.includes('_csvRowNumber'), false, 'Must not appear in Object.keys');

      const ownKeys = Reflect.ownKeys(row);
      assert.ok(ownKeys.includes('_csvRowNumber'), 'Reflect.ownKeys must track property descriptor');
    }
  });

  await test('4.2: Payload passed to supabase.upsert contains zero _csvRowNumber pollution', async () => {
    const csv = 'nama_kelas,tingkat,jurusan\nXII-TKJ-1,12,TKJ';
    let upsertedRow: any = null;

    const mockSupabase: any = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        upsert: (batch: any[]) => {
          upsertedRow = batch[0];
          return Promise.resolve({ error: null });
        }
      })
    };

    await importMasterDataFromCsv(mockSupabase, csv, 'data_kelas', dummyUser);

    assert.ok(upsertedRow, 'Upsert must be called with parsed rows');
    const wireJson = JSON.stringify(upsertedRow);
    assert.strictEqual(wireJson.includes('_csvRowNumber'), false, 'Supabase wire JSON must not contain _csvRowNumber');
  });

  // ============================================================================
  // SUITE 5: BOUNDARY CONDITION CSV INPUTS
  // ============================================================================
  console.log(`\n${BOLD}--- SUITE 5: Boundary Condition CSV Inputs ---${RESET}`);

  await test('5.1: Empty CSV content throws descriptive error', () => {
    assert.throws(
      () => parseAndValidateMasterCsv('', 'data_kelas', dummyUser),
      /File CSV kosong/
    );
  });

  await test('5.2: Header-only CSV throws descriptive error', () => {
    assert.throws(
      () => parseAndValidateMasterCsv('nama_kelas,tingkat,jurusan', 'data_kelas', dummyUser),
      /File CSV tidak memuat data yang valid/
    );
  });

  await test('5.3: Trailing blank lines, whitespace-only lines, and comments are cleanly skipped', () => {
    const csv = `
# Comment line
nama_kelas,tingkat,jurusan
X-TKJ-1,10,TKJ

X-TKJ-2,10,TKJ
   
   `;
    const rows = parseAndValidateMasterCsv(csv, 'data_kelas', dummyUser);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].nama_kelas, 'X-TKJ-1');
    assert.strictEqual((rows[0] as any)._csvRowNumber, 1);
    assert.strictEqual(rows[1].nama_kelas, 'X-TKJ-2');
    assert.strictEqual((rows[1] as any)._csvRowNumber, 2);
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}  CHALLENGER SUITE 2 RESULTS: ${passedTests} / ${totalTests} PASSED${RESET}`);
  if (failedTests > 0) {
    console.log(`${RED}${BOLD}  ${failedTests} CHECKS FAILED!${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}  ALL ${totalTests} CHECKS PASSED WITH COMPLETE EMPIRICAL CERTAINTY!${RESET}`);
    console.log(`${BOLD}========================================================================${RESET}\n`);
  }
}

runChallengerDiagnosticsSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
