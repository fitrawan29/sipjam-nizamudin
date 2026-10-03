import {
  recordPresensiSiswa,
  resolveStudentByCode,
  getTodayPresensiSummary,
  getRecentPresensiSiswa,
  getLocalTodayDate,
  getLocalCurrentTime,
  StudentReference
} from '../src/lib/qrSiswa';

console.log('======================================================================');
console.log('ADVERSARIAL STRESS TEST: SCANNER HANDLING & MULTI-KIOSK CONCURRENCY');
console.log('======================================================================');

let testsPassed = 0;
let testsFailed = 0;
let testsTotal = 0;

function assert(condition: boolean, msg: string, detail?: string) {
  testsTotal++;
  if (!condition) {
    console.error(`❌ FAIL [${testsTotal}]: ${msg}`);
    if (detail) console.error(`   Details: ${detail}`);
    testsFailed++;
    process.exit(1);
  } else {
    console.log(`✓ PASS [${testsTotal}]: ${msg}`);
    testsPassed++;
  }
}

// ---------------------------------------------------------------------------
// Mock Database Fixtures
// ---------------------------------------------------------------------------
const SCHOOL_A = 'sekolah-uuid-primary-aaa';
const SCHOOL_B = 'sekolah-uuid-foreign-bbb';

const mockStudentsSchoolA: StudentReference[] = Array.from({ length: 50 }, (_, i) => ({
  id: `std-uuid-a-${i + 1}`,
  nisn: `NISN-A-${1000 + i}`,
  nama_siswa: `Siswa Sekolah A ${i + 1}`,
  kelas: `7-${String.fromCharCode(65 + (i % 4))}`,
  sekolah_id: SCHOOL_A,
  qr_code: `QR-SISWA-A-${1000 + i}`
}));

const mockStudentsSchoolB: StudentReference[] = Array.from({ length: 10 }, (_, i) => ({
  id: `std-uuid-b-${i + 1}`,
  nisn: `NISN-B-${2000 + i}`,
  nama_siswa: `Siswa Sekolah B ${i + 1}`,
  kelas: `8-A`,
  sekolah_id: SCHOOL_B,
  qr_code: `QR-SISWA-B-${2000 + i}`
}));

const allStudents = [...mockStudentsSchoolA, ...mockStudentsSchoolB];
const attendanceDb: any[] = [];

// Realistic Supabase Client Mock with In-Memory Concurrency & Constraint Enforcement
function createMockSupabase(simulatedDelayMs: number = 0) {
  const delay = () => new Promise(res => setTimeout(res, simulatedDelayMs));

  return {
    from(table: string) {
      if (table === 'data_siswa') {
        return {
          select(columns: string = '*') {
            let filterSchool: string | null = null;
            let filterField: string | null = null;
            let filterVal: string | null = null;
            let ilikeField: string | null = null;
            let ilikeVal: string | null = null;

            const builder: any = {
              eq(field: string, val: string) {
                if (field === 'sekolah_id') filterSchool = val;
                else { filterField = field; filterVal = val; }
                return builder;
              },
              ilike(field: string, val: string) {
                ilikeField = field;
                ilikeVal = val;
                return builder;
              },
              maybeSingle: async () => {
                await delay();
                let candidates = allStudents;
                if (filterSchool) {
                  candidates = candidates.filter(s => s.sekolah_id === filterSchool);
                }
                if (filterField && filterVal !== null) {
                  candidates = candidates.filter(s => (s as any)[filterField!] === filterVal);
                }
                if (ilikeField && ilikeVal !== null) {
                  const pattern = ilikeVal.toLowerCase();
                  candidates = candidates.filter(s => {
                    const v = ((s as any)[ilikeField!] || '').toLowerCase();
                    return v === pattern;
                  });
                }
                return { data: candidates[0] || null, error: null };
              }
            };
            return builder;
          }
        };
      }

      if (table === 'presensi_siswa') {
        return {
          select(columns: string = '*') {
            let eqFilters: { col: string; val: string }[] = [];
            const selectBuilder: any = {
              eq(col: string, val: string) {
                eqFilters.push({ col, val });
                return selectBuilder;
              },
              maybeSingle: async () => {
                await delay();
                const found = attendanceDb.find(r =>
                  eqFilters.every(f => r[f.col] === f.val)
                );
                return { data: found || null, error: null };
              },
              order(col: string, opts?: any) {
                return {
                  limit: async (lim: number) => {
                    await delay();
                    let res = attendanceDb.filter(r =>
                      eqFilters.every(f => r[f.col] === f.val)
                    );
                    return { data: res.slice(0, lim), error: null };
                  }
                };
              },
              then(resolve: any) {
                delay().then(() => {
                  let res = attendanceDb.filter(r =>
                    eqFilters.every(f => r[f.col] === f.val)
                  );
                  resolve({ data: res, error: null });
                });
              }
            };
            return selectBuilder;
          },
          insert(payload: any) {
            return {
              select() {
                return {
                  single: async () => {
                    await delay();
                    const item = Array.isArray(payload) ? payload[0] : payload;
                    // Atomically check unique constraint (sekolah_id, tanggal, siswa_id, status)
                    const existing = attendanceDb.find(r =>
                      r.sekolah_id === item.sekolah_id &&
                      r.tanggal === item.tanggal &&
                      r.siswa_id === item.siswa_id &&
                      r.status === item.status
                    );
                    if (existing) {
                      const err: any = new Error('duplicate key value violates unique constraint "presensi_siswa_unique_daily"');
                      err.code = '23505';
                      return { data: null, error: err };
                    }
                    const saved = { ...item, id: `presensi-id-${attendanceDb.length + 1}` };
                    attendanceDb.push(saved);
                    return { data: saved, error: null };
                  }
                };
              }
            };
          }
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }
  };
}

async function runAdversarialScannerTests() {
  const mockClient = createMockSupabase(1);

  // =========================================================================
  // 1. ADVERSARIAL SCANNER RESOLUTION: INVALID, MALFORMED & HOSTILE INPUTS
  // =========================================================================
  console.log('\n--- Section 1: Hostile & Malformed Input Defense ---');

  const adversarialInputs = [
    { name: 'Empty string', code: '', expectError: true },
    { name: 'Whitespace only', code: '   \t  \n  ', expectError: true },
    { name: 'Pure wildcard %', code: '%', expectError: true },
    { name: 'Pure wildcard _', code: '_', expectError: true },
    { name: 'Multiple wildcards', code: '%%%___%%%', expectError: true },
    { name: 'SQL Injection: Single quote tautology', code: "' OR '1'='1", expectError: true },
    { name: 'SQL Injection: Comment drop attempt', code: "'; DROP TABLE data_siswa;--", expectError: true },
    { name: 'SQL Injection: UNION attack', code: "' UNION SELECT * FROM users --", expectError: true },
    { name: 'Massive string buffer overflow attempt (10,000 chars)', code: 'A'.repeat(10000), expectError: true },
    { name: 'Null byte injection', code: 'NISN-A-1000\x00malicious', expectError: true },
    { name: 'Emoji / Unicode characters', code: '🎓🏫QR-STUDENT-🔥', expectError: true },
    { name: 'Non-existent random UUID', code: 'c4b8b6a3-7649-43c2-8491-111111111111', expectError: true },
    { name: 'Non-existent QR Code', code: 'QR-NOT-EXISTS-99999', expectError: true },
    { name: 'Valid School A student QR', code: 'QR-SISWA-A-1000', expectError: false, expectedId: 'std-uuid-a-1' },
    { name: 'Valid School A student NISN', code: 'NISN-A-1001', expectError: false, expectedId: 'std-uuid-a-2' }
  ];

  for (const testCase of adversarialInputs) {
    try {
      const res = await resolveStudentByCode(mockClient, testCase.code, SCHOOL_A);
      if (testCase.expectError) {
        assert(
          res.data === null && res.error !== null,
          `Safely handled hostile input: [${testCase.name}] without crash or data leak`
        );
      } else {
        assert(
          res.data !== null && res.data.id === testCase.expectedId,
          `Successfully resolved valid input: [${testCase.name}] -> ${res.data?.nama_siswa}`
        );
      }
    } catch (err: any) {
      assert(false, `Unexpected unhandled throw on input [${testCase.name}]: ${err.message}`);
    }
  }

  // =========================================================================
  // 2. TENANT ISOLATION STRESS: CROSS-SCHOOL RESOLUTION & RECORDING
  // =========================================================================
  console.log('\n--- Section 2: Multi-Tenant Boundary Enforcement ---');

  // Attempt to resolve School B student using School A kiosk context
  const crossResolve = await resolveStudentByCode(mockClient, 'QR-SISWA-B-2000', SCHOOL_A);
  assert(
    crossResolve.data === null,
    'Cross-school student lookup blocked: School B student NOT resolvable by School A kiosk'
  );

  // Attempt to record presensi for School B student under School A
  const crossRecord = await recordPresensiSiswa(mockClient, {
    siswa: mockStudentsSchoolB[0],
    status: 'datang',
    sekolahId: SCHOOL_A
  });
  // Record should succeed or fail cleanly without cross-contaminating school data
  assert(
    crossRecord.data?.sekolah_id === SCHOOL_A,
    'Presensi recording strictly scopes record to current kiosk session sekolah_id'
  );

  // =========================================================================
  // 3. MASSIVE MULTI-KIOSK CONCURRENCY STRESS: 20 KIOSKS SIMULTANEOUS SCANS
  // =========================================================================
  console.log('\n--- Section 3: High-Concurrency Multi-Kiosk Simulation (20 Kiosks) ---');

  const KIOSK_COUNT = 20;
  const kiosks = Array.from({ length: KIOSK_COUNT }, (_, i) => `kiosk-${i + 1}`);

  // 20 kiosks scan 20 distinct students at the exact same instant
  const concurrentScans = kiosks.map((station, idx) => {
    return recordPresensiSiswa(mockClient, {
      siswa: mockStudentsSchoolA[idx],
      status: 'datang',
      sekolahId: SCHOOL_A,
      deviceId: station,
      tanggal: '2026-10-04',
      jam: `07:${String(idx).padStart(2, '0')}:00`
    });
  });

  const concurrentResults = await Promise.all(concurrentScans);

  // Verify all 20 succeeded
  let successCount = 0;
  concurrentResults.forEach((r, idx) => {
    if (r.success && !r.alreadyExists) successCount++;
  });
  assert(
    successCount === 20,
    `All 20 concurrent scans across 20 distinct kiosks succeeded without collisions (Got ${successCount}/20)`
  );

  // Verify all 20 unique device IDs were faithfully preserved
  const todayScans = await getRecentPresensiSiswa(mockClient, SCHOOL_A, '2026-10-04', 100);
  const registeredDevices = new Set(todayScans.map(s => s.device_id));
  assert(
    registeredDevices.size >= 20,
    `All ${registeredDevices.size} distinct kiosk station IDs properly captured in attendance records`
  );

  // =========================================================================
  // 4. RACE CONDITION & DUPLICATE CONFLICT SIMULATION (10 KIOSKS ON 1 STUDENT)
  // =========================================================================
  console.log('\n--- Section 4: Severe Race Condition Simulation (10 Kiosks Scanning Same Student) ---');

  const targetStudent = mockStudentsSchoolA[25]; // Student 26

  // 10 kiosks simultaneously scan targetStudent at the exact same moment
  const racePromises = Array.from({ length: 10 }, (_, i) => {
    return recordPresensiSiswa(mockClient, {
      siswa: targetStudent,
      status: 'datang',
      sekolahId: SCHOOL_A,
      deviceId: `kiosk-race-${i + 1}`,
      tanggal: '2026-10-04',
      jam: '07:15:00'
    });
  });

  const raceResults = await Promise.all(racePromises);

  const passedRaces = raceResults.filter(r => r.success);
  const duplicateFlags = raceResults.filter(r => r.alreadyExists);

  assert(
    passedRaces.length === 1,
    `Strict idempotency: exactly 1 scan succeeded (Got ${passedRaces.length})`,
    `Expected 1 success, got ${passedRaces.length}`
  );
  assert(
    duplicateFlags.length === 9,
    `All 9 concurrent collisions cleanly flagged alreadyExists: true without crashes (Got ${duplicateFlags.length})`
  );

  // Ensure duplicate response contains user-friendly Indonesian notice
  const dupMsg = raceResults.find(r => r.alreadyExists)?.message || '';
  assert(
    dupMsg.includes('sudah tercatat presensi datang hari ini'),
    `Duplicate message is informative: "${dupMsg}"`
  );

  // =========================================================================
  // 5. LIFECYCLE: DATANG -> PULANG TRANSITION & DUPLICATE PULANG PREVENTION
  // =========================================================================
  console.log('\n--- Section 5: Datang to Pulang Lifecycle Transitions ---');

  // Checkout (pulang) for targetStudent from another kiosk
  const checkoutRes = await recordPresensiSiswa(mockClient, {
    siswa: targetStudent,
    status: 'pulang',
    sekolahId: SCHOOL_A,
    deviceId: 'kiosk-exit-1',
    tanggal: '2026-10-04',
    jam: '14:30:00'
  });

  assert(
    checkoutRes.success === true,
    'Checkout (pulang) successfully recorded after earlier arrival (datang)'
  );

  // Duplicate checkout attempt from another kiosk
  const duplicateCheckout = await recordPresensiSiswa(mockClient, {
    siswa: targetStudent,
    status: 'pulang',
    sekolahId: SCHOOL_A,
    deviceId: 'kiosk-exit-2',
    tanggal: '2026-10-04',
    jam: '14:31:00'
  });

  assert(
    duplicateCheckout.success === false && duplicateCheckout.alreadyExists === true,
    'Duplicate checkout (pulang) safely rejected with alreadyExists: true'
  );

  // Verify daily summary stats aggregation
  const summary = await getTodayPresensiSummary(mockClient, SCHOOL_A, '2026-10-04');
  assert(
    summary.totalDatang === 22,
    `Summary accurately counts 22 datang records (Got ${summary.totalDatang})`
  );
  assert(
    summary.totalPulang === 1,
    `Summary accurately counts 1 pulang record (Got ${summary.totalPulang})`
  );
  assert(
    summary.totalUnik === 22,
    `Summary accurately counts 22 unique students (Got ${summary.totalUnik})`
  );

  // =========================================================================
  // 6. AUDIO FEEDBACK & ENVIRONMENT ROBUSTNESS
  // =========================================================================
  console.log('\n--- Section 6: Audio Synthesizer & Error Boundary Resilience ---');

  // In PiketView.tsx, playAudioFeedback has try/catch and checks typeof window === 'undefined'
  // and checks AudioContext existence.
  const fs = await import('fs');
  const path = await import('path');
  const piketViewCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/PiketView.tsx'), 'utf8');

  assert(
    piketViewCode.includes('typeof window === \'undefined\'') &&
    piketViewCode.includes('window.AudioContext || (window as any).webkitAudioContext'),
    'Audio synthesizer safely guards SSR and unsupported environments'
  );
  assert(
    piketViewCode.includes('try {') && piketViewCode.includes('catch {') &&
    piketViewCode.includes('ctx.resume().catch(() => {})'),
    'Audio synthesizer handles browser autoplay policy restrictions gracefully'
  );

  // Debounce check for camera scanner
  assert(
    piketViewCode.includes('lastCameraScannedRef.current.code !== rawVal || (now - lastCameraScannedRef.current.time > 3000)'),
    'Camera scanner implements 3000ms debounce filter preventing accidental rapid re-scans'
  );

  console.log('\n======================================================================');
  console.log(`🎉 ALL ${testsPassed}/${testsTotal} ADVERSARIAL STRESS TESTS COMPLETED SUCCESSFULLY!`);
  console.log('======================================================================\n');
}

runAdversarialScannerTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
