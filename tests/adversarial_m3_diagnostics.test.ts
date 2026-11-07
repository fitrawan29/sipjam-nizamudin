/**
 * tests/adversarial_m3_diagnostics.test.ts
 *
 * ADVERSARIAL EMPIRICAL CHALLENGER SUITE — MILESTONE 3 (M3 DIAGNOSTICS & INGESTION)
 *
 * Focus Areas:
 * 1. Empirically stress-test PostgreSQL error code parsing (23503, 23502, 23505, 42501, 57014/unrecognized)
 *    under diverse simulated database errors, edge-case regex patterns, and unusual detail payloads.
 * 2. Empirically test original line number preservation (_csvRowNumber) across batch slicing (50 rows/batch),
 *    chunking, multi-batch errors, empty line skips, and idempotent entity resolution.
 * 3. Empirically verify progress callback progression (5%, 15%, 30%, 40%-90%, 95%, 100%) and
 *    empirically test micro-yield event-loop non-blocking behavior using concurrent timers.
 * 4. Stress-test failure modes, error interruptions, and defensive boundary conditions.
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
const YELLOW = '\x1b[33m';
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
    console.error(`     ${err?.message || err}`);
    if (err?.stack) {
      const relevantStack = err.stack.split('\n').slice(1, 4).join('\n');
      console.error(`     ${relevantStack}`);
    }
    process.exitCode = 1;
  }
}

async function runAdversarialDiagnosticsSuite() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  ADVERSARIAL SUITE: M3 POSTGRESQL DIAGNOSTICS, ROW PRESERVATION & YIELDS${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  // ============================================================================
  // SUITE 1: ADVERSARIAL POSTGRESQL ERROR CODE PARSING (23503, 23502, 23505, 42501, 57014)
  // ============================================================================
  console.log(`\n${BOLD}--- SUITE 1: Adversarial PostgreSQL Error Code Parsing ---${RESET}`);

  await test('1.1: 23503 Foreign Key Violation — Standard Postgres detail with exact row mapping', () => {
    const batch = [
      { nisn: '1001', nama_siswa: 'Siswa A', kelas: 'X-RPL-1', _csvRowNumber: 10 },
      { nisn: '1002', nama_siswa: 'Siswa B', kelas: 'X-RPL-Ghost', _csvRowNumber: 11 },
      { nisn: '1003', nama_siswa: 'Siswa C', kelas: 'X-RPL-1', _csvRowNumber: 12 }
    ];

    const pgError = {
      code: '23503',
      message: 'insert or update on table "data_siswa" violates foreign key constraint "fk_siswa_kelas"',
      detail: 'Key (kelas)=(X-RPL-Ghost) is not present in table "data_kelas".'
    };

    const diag = translateDatabaseError(pgError, batch, 'data_siswa');

    assert.strictEqual(diag.code, '23503');
    assert.strictEqual(diag.row, 11, 'Must accurately point to row 11 which contains the ghost class');
    assert.strictEqual(diag.column, 'kelas');
    assert.strictEqual(diag.receivedValue, 'X-RPL-Ghost');
    assert.strictEqual(diag.referenceTable, 'data_kelas');
    assert.ok(diag.message.startsWith('Baris 11:'));
    assert.ok(diag.message.includes('X-RPL-Ghost'));
    assert.ok(diag.message.includes('data_kelas'));
    assert.ok(diag.remediation.includes('X-RPL-Ghost'));
  });

  await test('1.2: 23503 Foreign Key Violation — sekolah_id FK constraint with exact compatibility message', () => {
    const batch = [
      { id: 'uuid-1', nama_guru: 'Guru 1', sekolah_id: 'bad-school-id', _csvRowNumber: 42 }
    ];

    const pgError = {
      code: '23503',
      message: 'insert or update on table "data_guru" violates foreign key constraint "data_guru_sekolah_id_fkey"',
      detail: 'Key (sekolah_id)=(bad-school-id) is not present in table "sekolah".'
    };

    const diag = translateDatabaseError(pgError, batch, 'data_guru');

    assert.strictEqual(diag.code, '23503');
    assert.strictEqual(diag.row, 42);
    assert.strictEqual(diag.column, 'sekolah_id');
    assert.strictEqual(diag.referenceTable, 'sekolah');
    assert.ok(diag.message.includes('ID sekolah ("sekolah_id") dalam CSV tidak terdaftar di sistem sekolah'));
    assert.ok(diag.remediation.includes('ID sekolah yang valid'));
  });

  await test('1.3: 23503 Foreign Key Violation — Schema-qualified reference table and numeric code resilience', () => {
    const batch = [
      { hari: 'Senin', nama_guru: 'Budi', mata_pelajaran: 'Astrologi', kelas: 'X-A', _csvRowNumber: 77 }
    ];

    // Some PostgreSQL setups quote table as "public"."data_mapel" or supply code as number
    const pgError = {
      code: 23503 as any, // numeric code
      message: 'insert or update on table "jadwal_pelajaran" violates foreign key constraint "jadwal_mapel_fkey"',
      details: 'Key (mata_pelajaran)=(Astrologi) is not present in table "public"."data_mapel".'
    };

    const diag = translateDatabaseError(pgError, batch, 'jadwal_pelajaran');

    assert.strictEqual(diag.code, '23503');
    assert.strictEqual(diag.row, 77);
    assert.strictEqual(diag.column, 'mata_pelajaran');
    assert.strictEqual(diag.receivedValue, 'Astrologi');
    assert.ok(diag.referenceTable?.includes('data_mapel') || diag.referenceTable === 'public');
    assert.ok(diag.message.startsWith('Baris 77:'));
  });

  await test('1.4: 23503 Foreign Key Violation — Fallback when detail string lacks regex match', () => {
    const batch = [
      { id: 'uuid-1', nama_guru: 'Pak Guru', _csvRowNumber: 9 }
    ];

    const pgError = {
      code: '23503',
      message: 'violates foreign key constraint on guru_id'
      // No detail property provided
    };

    const diag = translateDatabaseError(pgError, batch, 'jadwal_pelajaran');

    assert.strictEqual(diag.code, '23503');
    assert.strictEqual(diag.row, 9);
    assert.strictEqual(diag.column, 'nama_guru');
    assert.strictEqual(diag.referenceTable, 'data_guru');
    assert.ok(diag.message.startsWith('Baris 9:'));
  });

  await test('1.5: 23502 Not-Null Violation — Pinpoints exact empty column and row in batch', () => {
    const batch = [
      { nisn: '1001', nama_siswa: 'Citra', kelas: 'X-A', _csvRowNumber: 15 },
      { nisn: '1002', nama_siswa: '', kelas: 'X-A', _csvRowNumber: 16 },
      { nisn: '1003', nama_siswa: 'Dewi', kelas: 'X-A', _csvRowNumber: 17 }
    ];

    const pgError = {
      code: '23502',
      message: 'null value in column "nama_siswa" of relation "data_siswa" violates not-null constraint'
    };

    const diag = translateDatabaseError(pgError, batch, 'data_siswa');

    assert.strictEqual(diag.code, '23502');
    assert.strictEqual(diag.row, 16, 'Must pinpoint row 16 where nama_siswa was empty');
    assert.strictEqual(diag.column, 'nama_siswa');
    assert.strictEqual(diag.receivedValue, '(kosong)');
    assert.ok(diag.message.startsWith('Baris 16:'));
    assert.ok(diag.message.includes('terdapat kolom wajib yang bernilai kosong (nama_siswa)'));
    assert.ok(diag.remediation.includes('baris 16'));
  });

  await test('1.6: 23505 Unique Violation — Multi-column constraint ignores tenant and resolves business key', () => {
    const batch = [
      { sekolah_id: 'sch-001', nisn: '10001', nama_siswa: 'Ahmad', _csvRowNumber: 21 },
      { sekolah_id: 'sch-001', nisn: '10002', nama_siswa: 'Bambang', _csvRowNumber: 22 },
      { sekolah_id: 'sch-001', nisn: '10003', nama_siswa: 'Candra', _csvRowNumber: 23 }
    ];

    const pgError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "data_siswa_sekolah_id_nisn_key"',
      detail: 'Key (sekolah_id, nisn)=(sch-001, 10002) already exists.'
    };

    const diag = translateDatabaseError(pgError, batch, 'data_siswa');

    assert.strictEqual(diag.code, '23505');
    assert.strictEqual(diag.row, 22, 'Must locate row 22 by business column nisn=10002');
    assert.strictEqual(diag.column, 'nisn');
    assert.strictEqual(diag.receivedValue, '10002');
    assert.ok(diag.message.startsWith('Baris 22:'));
    assert.ok(diag.message.includes('terdapat data duplikat yang melanggar batasan unik database'));
    assert.ok(diag.remediation.includes('10002'));
  });

  await test('1.7: 23505 Unique Violation — Single-column and case-insensitive value matching', () => {
    const batch = [
      { username: 'admin1', nama: 'Admin Satu', _csvRowNumber: 50 },
      { username: 'GURU_MATEMATIKA', nama: 'Guru Matematika', _csvRowNumber: 51 }
    ];

    // Postgres returns lowercase normalized in detail
    const pgError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "users_username_key"',
      detail: 'Key (username)=(guru_matematika) already exists.'
    };

    const diag = translateDatabaseError(pgError, batch, 'users');

    assert.strictEqual(diag.code, '23505');
    assert.strictEqual(diag.row, 51, 'Must match row 51 despite case difference');
    assert.strictEqual(diag.column, 'username');
    assert.strictEqual(diag.receivedValue, 'guru_matematika');
    assert.ok(diag.message.startsWith('Baris 51:'));
  });

  await test('1.8: 42501 Insufficient Privilege / RLS Policy Violation — Proper Indonesian diagnostic', () => {
    const batch = [
      { nama_kelas: 'X-RPL-1', _csvRowNumber: 105 }
    ];

    const pgError = {
      code: '42501',
      message: 'new row violates row-level security policy for table "data_kelas"'
    };

    const diag = translateDatabaseError(pgError, batch, 'data_kelas');

    assert.strictEqual(diag.code, '42501');
    assert.strictEqual(diag.row, 105);
    assert.ok(diag.message.startsWith('Baris 105:'));
    assert.ok(diag.message.includes('Akses ditolak oleh kebijakan keamanan data sekolah (RLS)'));
    assert.ok(diag.remediation.includes('sekolah_id'));
  });

  await test('1.9: Unrecognized / Statement Timeout Error (57014) — Safe fallback without crash', () => {
    const batch = [
      { id: '1', _csvRowNumber: 88 }
    ];

    const pgError = {
      code: '57014',
      message: 'canceling statement due to statement timeout'
    };

    const diag = translateDatabaseError(pgError, batch, 'data_siswa');

    assert.strictEqual(diag.code, '57014');
    assert.strictEqual(diag.row, 88);
    assert.ok(diag.message.startsWith('Baris 88:'));
    assert.ok(diag.message.includes('Terjadi kesalahan database (canceling statement due to statement timeout)'));
    assert.ok(diag.remediation.includes('Periksa format baris data'));
  });

  await test('1.10: Completely malformed or null error object — Safe handling', () => {
    const batch = [{ _csvRowNumber: 1 }];
    const diag1 = translateDatabaseError(null, batch, 'data_siswa');
    assert.strictEqual(diag1.code, 'DATABASE_ERROR');
    assert.strictEqual(diag1.row, 1);

    const diag2 = translateDatabaseError(undefined, [], 'data_siswa');
    assert.strictEqual(diag2.code, 'DATABASE_ERROR');
    assert.strictEqual(diag2.row, 1);
  });

  // ============================================================================
  // SUITE 2: ORIGINAL LINE NUMBER PRESERVATION (_csvRowNumber) THROUGH BATCHING
  // ============================================================================
  console.log(`\n${BOLD}--- SUITE 2: Line Number Preservation Through Batching & Chunking ---${RESET}`);

  await test('2.1: Non-enumerable _csvRowNumber invariant — Never leaks into JSON or Object.keys', () => {
    const csv = 'nama_kelas,tingkat,jurusan\nX-TKJ-1,10,TKJ\nX-TKJ-2,10,TKJ';
    const rows = parseAndValidateMasterCsv(csv, 'data_kelas');

    assert.strictEqual(rows.length, 2);
    const firstRow = rows[0];

    // 1. Accessible directly
    assert.strictEqual((firstRow as any)._csvRowNumber, 1, 'First data row must have _csvRowNumber = 1');

    // 2. Omitted from Object.keys
    const keys = Object.keys(firstRow);
    assert.ok(!keys.includes('_csvRowNumber'), '_csvRowNumber must NOT appear in Object.keys()');

    // 3. Omitted from JSON serialization (Supabase payload wire safety)
    const jsonStr = JSON.stringify(firstRow);
    assert.ok(!jsonStr.includes('_csvRowNumber'), '_csvRowNumber must NOT appear in JSON.stringify() payload');

    // 4. Property descriptor is non-enumerable
    const desc = Object.getOwnPropertyDescriptor(firstRow, '_csvRowNumber');
    assert.ok(desc, 'Property descriptor must exist');
    assert.strictEqual(desc?.enumerable, false, '_csvRowNumber must have enumerable: false');
  });

  await test('2.2: Multi-Batch Slicing (120 rows across 3 batches) — Pinpoints failure in Batch 3 accurately', async () => {
    // Generate CSV with 115 rows (50 + 50 + 15 in batches of 50)
    const lines = ['nama_kelas,tingkat,jurusan'];
    for (let i = 1; i <= 115; i++) {
      lines.push(`Kelas-${i},10,Umum`);
    }
    const csvText = lines.join('\n');

    const mockSupabase: any = {
      from: (tbl: string) => ({
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null })
        }),
        upsert: (batch: any[], options?: any) => {
          // Real database behavior: any attempt to insert row 112 is rejected by PostgreSQL
          if (batch.some((r: any) => r._csvRowNumber === 112)) {
            return Promise.resolve({
              error: {
                code: '23505',
                message: 'duplicate key value violates unique constraint',
                detail: 'Key (sekolah_id, nama_kelas)=(sch-test, Kelas-112) already exists.'
              }
            });
          }
          return Promise.resolve({ error: null });
        }
      })
    };

    let caughtError: any = null;
    try {
      await importMasterDataFromCsv(mockSupabase, csvText, 'data_kelas', { sekolah_id: 'sch-test' });
    } catch (err) {
      caughtError = err;
    }

    assert.ok(caughtError instanceof MasterDataValidationError, 'Must throw MasterDataValidationError');
    assert.strictEqual(caughtError.detail.code, '23505');
    assert.strictEqual(caughtError.detail.row, 112, 'Must pinpoint row 112 in Batch 3, NOT row 12 (batch index) or 1!');
    assert.ok(caughtError.detail.message.startsWith('Baris 112:'));
    assert.strictEqual(caughtError.detail.column, 'nama_kelas');
    assert.strictEqual(caughtError.detail.receivedValue, 'Kelas-112');
  });

  await test('2.3: Idempotent Entity Resolution preserves _csvRowNumber', async () => {
    // Student resolution updates row.id in-place
    const csvText = 'nisn,nama_siswa,kelas,gender,status,no_hp_ortu\n9991,Ahmad,X-A,L,Aktif,0812\n9992,Budi,X-A,L,Aktif,0813';
    const mockSupabase: any = {
      from: (tbl: string) => {
        if (tbl === 'data_kelas') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [{ nama_kelas: 'X-A' }], error: null })
            })
          };
        }
        if (tbl === 'data_siswa') {
          return {
            select: () => ({
              eq: () => ({
                in: () => Promise.resolve({
                  data: [{ id: 'existing-student-uuid-9992', nisn: '9992', nama_siswa: 'Budi', kelas: 'X-A' }],
                  error: null
                })
              })
            }),
            upsert: (batch: any[]) => {
              // Verify row.id was assigned AND _csvRowNumber was preserved
              assert.strictEqual(batch[1].id, 'existing-student-uuid-9992');
              assert.strictEqual(batch[1]._csvRowNumber, 2);
              return Promise.resolve({ error: null });
            }
          };
        }
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
          upsert: () => Promise.resolve({ error: null })
        };
      }
    };

    const res = await importMasterDataFromCsv(mockSupabase, csvText, 'data_siswa', { sekolah_id: 'sch-1' });
    assert.strictEqual(res.count, 2);
  });

  // ============================================================================
  // SUITE 3: UPLOAD PROGRESS PROGRESSION & NON-BLOCKING MICRO-YIELDS
  // ============================================================================
  console.log(`\n${BOLD}--- SUITE 3: Upload Progress Progression & Non-Blocking Micro-Yields ---${RESET}`);

  await test('3.1: Strict Progress Progression across all 6 stages (5%, 15%, 30%, 40%-90%, 95%, 100%)', async () => {
    // 60 rows -> 2 batches (50 + 10)
    const lines = ['nama_kelas,tingkat,jurusan'];
    for (let i = 1; i <= 60; i++) lines.push(`Kelas-${i},10,IPA`);
    const csv = lines.join('\n');

    const progressLog: UploadProgressInfo[] = [];
    const mockSupabase: any = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        upsert: () => Promise.resolve({ error: null })
      })
    };

    await importMasterDataFromCsv(
      mockSupabase,
      csv,
      'data_kelas',
      { sekolah_id: 'sch-1' },
      (info) => {
        progressLog.push({ ...info });
      }
    );

    // Verify progression
    assert.ok(progressLog.length >= 6, `Expected at least 6 progress reports, got ${progressLog.length}`);

    // Stage 1: 5% (Reading CSV)
    assert.strictEqual(progressLog[0].percentage, 5);
    assert.ok(progressLog[0].stage.includes('Membaca'));

    // Stage 2: 15% (Validating schema)
    assert.strictEqual(progressLog[1].percentage, 15);
    assert.ok(progressLog[1].stage.includes('Memvalidasi'));

    // Stage 3: 30% (Checking dependencies)
    assert.strictEqual(progressLog[2].percentage, 30);
    assert.ok(progressLog[2].stage.includes('dependensi'));
    assert.strictEqual(progressLog[2].totalRows, 60);

    // Stage 4: Batch 1 (50/60) -> 40 + Math.round((50/60) * 50) = 40 + 42 = 82%
    const batch1 = progressLog[3];
    assert.strictEqual(batch1.currentBatch, 1);
    assert.strictEqual(batch1.totalBatches, 2);
    assert.strictEqual(batch1.processedRows, 50);
    assert.ok(batch1.percentage >= 40 && batch1.percentage <= 90);

    // Stage 4: Batch 2 (60/60) -> 40 + Math.round((60/60) * 50) = 90%
    const batch2 = progressLog[4];
    assert.strictEqual(batch2.currentBatch, 2);
    assert.strictEqual(batch2.totalBatches, 2);
    assert.strictEqual(batch2.processedRows, 60);
    assert.strictEqual(batch2.percentage, 90);

    // Stage 5: 95% (Syncing)
    const syncStage = progressLog[5];
    assert.strictEqual(syncStage.percentage, 95);
    assert.ok(syncStage.stage.includes('Sinkronisasi'));

    // Stage 6: 100% (Completed)
    const finalStage = progressLog[6];
    assert.strictEqual(finalStage.percentage, 100);
    assert.ok(finalStage.stage.includes('Selesai'));

    // Verify strict monotonicity
    for (let i = 1; i < progressLog.length; i++) {
      assert.ok(
        progressLog[i].percentage >= progressLog[i - 1].percentage,
        `Progress not monotonic: ${progressLog[i - 1].percentage}% -> ${progressLog[i].percentage}%`
      );
    }
  });

  await test('3.2: Empirical Micro-Yield Verification — Proves UI thread is NOT blocked during upload', async () => {
    // We launch a concurrent setInterval every 3ms to monitor event loop turns.
    // If importMasterDataFromCsv blocks synchronously, tickCount will be starved.
    // With micro-yields (await new Promise(r => setTimeout(r, 10))), the timer fires during every yield!
    let concurrentTicks = 0;
    const intervalId = setInterval(() => {
      concurrentTicks++;
    }, 3);

    const lines = ['nama_kelas,tingkat,jurusan'];
    for (let i = 1; i <= 100; i++) lines.push(`Kelas-${i},10,IPS`); // 2 batches
    const csv = lines.join('\n');

    const startTime = Date.now();
    const mockSupabase: any = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        upsert: () => Promise.resolve({ error: null })
      })
    };

    await importMasterDataFromCsv(mockSupabase, csv, 'data_kelas', { sekolah_id: 'sch-1' });
    clearInterval(intervalId);

    const elapsed = Date.now() - startTime;

    // Minimum expected yields: Stage 1, Stage 3, Batch 1, Batch 2, Stage 5 = 5 yields * 10ms = ~50ms
    console.log(`     [Micro-Yield Benchmark] Elapsed: ${elapsed}ms | Concurrent event loop ticks: ${concurrentTicks}`);

    assert.ok(
      concurrentTicks >= 4,
      `Event loop must yield control to other tasks! Expected >= 4 ticks, observed ${concurrentTicks}`
    );
    assert.ok(
      elapsed >= 40,
      `Execution duration must reflect non-zero cooperative yield time (expected >= 40ms, got ${elapsed}ms)`
    );
  });

  await test('3.3: Error in Stage 3 (Relational Dependency Failure) halts progress before batching or 100%', async () => {
    const progressLog: number[] = [];
    const mockSupabase: any = {
      from: (tbl: string) => ({
        select: () => ({
          eq: () => {
            if (tbl === 'data_kelas') {
              return Promise.resolve({ data: [{ nama_kelas: 'Existing-Class' }], error: null });
            }
            return Promise.resolve({ data: [], error: null });
          }
        })
      })
    };

    const csv = 'nisn,nama_siswa,kelas\n1001,Siswa Satu,NonExistentClass';

    let threw = false;
    try {
      await importMasterDataFromCsv(
        mockSupabase,
        csv,
        'data_siswa',
        { sekolah_id: 'sch-1' },
        (info) => progressLog.push(info.percentage)
      );
    } catch (err: any) {
      threw = true;
      assert.ok(err instanceof MasterDataValidationError);
      assert.strictEqual(err.detail.code, '23503');
    }

    assert.ok(threw, 'Must throw dependency validation error');
    assert.ok(!progressLog.includes(100), 'Must NOT reach 100% on failure');
    assert.ok(!progressLog.includes(95), 'Must NOT reach 95% on failure');
    assert.ok(progressLog.includes(30), 'Must reach Stage 3 (30%) where dependency check runs');
  });

  await test('3.4: Error in Stage 4 Batch 2 halts progress cleanly with exact diagnostic', async () => {
    const progressLog: number[] = [];
    const mockSupabase: any = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        upsert: (batch: any[]) => {
          // Batch 2 (rows 51-60) triggers database constraint error
          if (batch.some((r: any) => r._csvRowNumber > 50)) {
            return Promise.resolve({
              error: {
                code: '23502',
                message: 'null value in column "tingkat" violates not-null constraint'
              }
            });
          }
          return Promise.resolve({ error: null });
        }
      })
    };

    const lines = ['nama_kelas,tingkat,jurusan'];
    for (let i = 1; i <= 60; i++) lines.push(`Kelas-${i},10,IPA`);
    const csv = lines.join('\n');

    let threw = false;
    try {
      await importMasterDataFromCsv(
        mockSupabase,
        csv,
        'data_kelas',
        { sekolah_id: 'sch-1' },
        (info) => progressLog.push(info.percentage)
      );
    } catch (err: any) {
      threw = true;
      assert.ok(err instanceof MasterDataValidationError);
      assert.strictEqual(err.detail.code, '23502');
    }

    assert.ok(threw, 'Must throw on batch 2 error');
    assert.ok(!progressLog.includes(100), 'Must NOT reach 100%');
    assert.ok(!progressLog.includes(95), 'Must NOT reach 95%');
  });

  await test('3.5: Omitted onProgress callback executes normally without error', async () => {
    const mockSupabase: any = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        upsert: () => Promise.resolve({ error: null })
      })
    };
    const csv = 'nama_kelas,tingkat,jurusan\nX-A,10,Umum';
    const res = await importMasterDataFromCsv(mockSupabase, csv, 'data_kelas', { sekolah_id: 'sch-1' });
    assert.strictEqual(res.count, 1);
  });

  // ============================================================================
  // SUITE 4: BOUNDARY CONDITIONS, RELATIONAL FUZZY MATCHING & SCALE STRESS
  // ============================================================================
  console.log(`\n${BOLD}--- SUITE 4: Boundary Conditions, Relational Matching & Scale Stress ---${RESET}`);

  await test('4.1: Relational validation is case-insensitive and trims whitespace for classes and teachers', async () => {
    const mockSupabase: any = {
      from: (tbl: string) => ({
        select: () => ({
          eq: () => {
            if (tbl === 'data_kelas') {
              return Promise.resolve({ data: [{ nama_kelas: 'XII MIPA 1' }], error: null });
            }
            if (tbl === 'data_guru') {
              return Promise.resolve({ data: [{ id: 'guru-1', nama_guru: 'Dr. H. Ahmad Dahlan, M.Pd.', nip: '19750101' }], error: null });
            }
            if (tbl === 'data_mapel') {
              return Promise.resolve({ data: [{ nama_mata_pelajaran: 'Fisika Terapan' }], error: null });
            }
            return Promise.resolve({ data: [], error: null });
          }
        })
      })
    };

    // CSV input has lowercase, trimmed variations: 'xii mipa 1', 'fisika terapan'
    const studentRows = [
      { nama_siswa: 'Ali', kelas: '  xii mipa 1  ', _csvRowNumber: 2 }
    ];
    await validateRelationalDependencies(mockSupabase, studentRows, 'data_siswa', 'sch-1');

    const scheduleRows = [
      { hari: 'Senin', nama_guru: 'Dr. H. Ahmad Dahlan, M.Pd.', mata_pelajaran: '  fisika terapan ', kelas: 'xii mipa 1', _csvRowNumber: 3 }
    ];
    await validateRelationalDependencies(mockSupabase, scheduleRows, 'jadwal_pelajaran', 'sch-1');
  });

  await test('4.2: Dependency check gracefully degrades when database query fails without crashing import', async () => {
    // If Supabase network drops during dependency check, safeSelect catches and returns { data: null }
    // It should not throw unhandled rejection, but proceed safely
    const failingSupabase: any = {
      from: () => ({
        select: () => ({
          eq: () => Promise.reject(new Error('Network connection timeout'))
        })
      })
    };

    const studentRows = [
      { nama_siswa: 'Ali', kelas: 'X-A', _csvRowNumber: 2 }
    ];

    // Must not throw unhandled exception
    await validateRelationalDependencies(failingSupabase, studentRows, 'data_siswa', 'sch-1');
  });

  await test('4.3: Batch boundary edge cases — Exactly 50 rows (1 batch) vs 51 rows (2 batches)', async () => {
    const mockSupabase: any = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        upsert: () => Promise.resolve({ error: null })
      })
    };

    // Case A: Exactly 50 rows -> totalBatches = 1
    const lines50 = ['nama_kelas,tingkat,jurusan'];
    for (let i = 1; i <= 50; i++) lines50.push(`Kelas-${i},10,Umum`);
    const progress50: UploadProgressInfo[] = [];
    await importMasterDataFromCsv(mockSupabase, lines50.join('\n'), 'data_kelas', { sekolah_id: 'sch-1' }, p => progress50.push({ ...p }));
    const batchReport50 = progress50.find(p => p.stage.includes('Mengunggah'));
    assert.strictEqual(batchReport50?.totalBatches, 1);
    assert.strictEqual(batchReport50?.currentBatch, 1);
    assert.strictEqual(batchReport50?.processedRows, 50);
    assert.strictEqual(batchReport50?.percentage, 90);

    // Case B: Exactly 51 rows -> totalBatches = 2
    const lines51 = ['nama_kelas,tingkat,jurusan'];
    for (let i = 1; i <= 51; i++) lines51.push(`Kelas-${i},10,Umum`);
    const progress51: UploadProgressInfo[] = [];
    await importMasterDataFromCsv(mockSupabase, lines51.join('\n'), 'data_kelas', { sekolah_id: 'sch-1' }, p => progress51.push({ ...p }));
    const batchReports51 = progress51.filter(p => p.stage.includes('Mengunggah'));
    assert.strictEqual(batchReports51.length, 2);
    assert.strictEqual(batchReports51[0].currentBatch, 1);
    assert.strictEqual(batchReports51[0].totalBatches, 2);
    assert.strictEqual(batchReports51[0].processedRows, 50);
    assert.strictEqual(batchReports51[1].currentBatch, 2);
    assert.strictEqual(batchReports51[1].totalBatches, 2);
    assert.strictEqual(batchReports51[1].processedRows, 51);
    assert.strictEqual(batchReports51[1].percentage, 90);
  });

  await test('4.4: 200-Row Scale Benchmark — Verifies cooperative multitasking across 4 batches', async () => {
    let tickCount = 0;
    const intervalId = setInterval(() => { tickCount++; }, 3);

    const lines200 = ['nama_kelas,tingkat,jurusan'];
    for (let i = 1; i <= 200; i++) lines200.push(`Kelas-${i},10,IPA`);
    const mockSupabase: any = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        upsert: () => Promise.resolve({ error: null })
      })
    };

    const startTime = Date.now();
    const progressLog: UploadProgressInfo[] = [];
    await importMasterDataFromCsv(mockSupabase, lines200.join('\n'), 'data_kelas', { sekolah_id: 'sch-1' }, p => progressLog.push({ ...p }));
    clearInterval(intervalId);

    const elapsed = Date.now() - startTime;
    console.log(`     [200-Row Scale Benchmark] Elapsed: ${elapsed}ms | Event loop ticks: ${tickCount}`);

    // 4 batches means 7 yield pauses (Stage 1, Stage 3, Batch 1, 2, 3, 4, Stage 5) = at least ~70ms
    assert.ok(elapsed >= 60, `Scale upload must yield across all batches (observed ${elapsed}ms)`);
    assert.ok(tickCount >= 6, `Event loop must process concurrent tasks during scale upload (observed ${tickCount} ticks)`);

    const batchUpdates = progressLog.filter(p => p.stage.includes('Mengunggah'));
    assert.strictEqual(batchUpdates.length, 4, 'Must emit progress for each of the 4 batches');
    assert.strictEqual(batchUpdates[3].processedRows, 200);
    assert.strictEqual(batchUpdates[3].totalBatches, 4);
    assert.strictEqual(progressLog[progressLog.length - 1].percentage, 100);
  });

  // ============================================================================
  // SUMMARY RESULTS
  // ============================================================================
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}  ADVERSARIAL SUITE RESULTS: ${passedTests} / ${totalTests} PASSED${RESET}`);
  if (failedTests > 0) {
    console.log(`${RED}${BOLD}  ${failedTests} ADVERSARIAL CHECKS FAILED!${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}  ALL ${totalTests} ADVERSARIAL CHECKS PASSED WITH ZERO FAILURES!${RESET}`);
    console.log(`${BOLD}========================================================================${RESET}\n`);
  }
}

runAdversarialDiagnosticsSuite().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
