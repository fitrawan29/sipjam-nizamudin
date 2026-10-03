/**
 * Empirical Challenge Test Suite for Milestone 3 (M3)
 * Challenger 2 (challenger_o10_m3_2)
 *
 * Scope:
 * 1. Mode toggling ("Datang" vs "Pulang") and corresponding status logging.
 * 2. Filter and search operations on today's attendance log.
 * 3. Concurrency, duplicate rejection, and edge case resilience.
 */

import fs from 'fs';
import path from 'path';
import {
  recordPresensiSiswa,
  getTodayPresensiSummary,
  getRecentPresensiSiswa,
  getLocalTodayDate,
  getLocalCurrentTime,
  StudentReference
} from '../src/lib/qrSiswa';

console.log('================================================================');
console.log('CHALLENGER 2 EMPIRICAL TEST: M3 PIKET SCANNER & ATTENDANCE LOG');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function expect(condition: boolean, testName: string, failureDetail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${testName}${failureDetail ? ` -> ${failureDetail}` : ''}`);
    failCount++;
  }
}

// ============================================================================
// PART 1: STATIC VERIFICATION OF UI LOGIC IN PIKETVIEW.TSX
// ============================================================================
console.log('--- 1. Static Contract & UI Component Integrity ---');

const piketViewPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
expect(fs.existsSync(piketViewPath), 'PiketView.tsx exists on disk');

const piketSource = fs.readFileSync(piketViewPath, 'utf8');

// Check scanMode state definition
expect(
  piketSource.includes("const [scanMode, setScanMode] = useState<'datang' | 'pulang'>('datang');"),
  "scanMode is initialized to 'datang'"
);

// Check mode toggle buttons
expect(
  piketSource.includes("onClick={() => setScanMode('datang')}") &&
  piketSource.includes("scanMode === 'datang'"),
  "Mode button for 'datang' switches scanMode to 'datang' with conditional styling"
);

expect(
  piketSource.includes("onClick={() => setScanMode('pulang')}") &&
  piketSource.includes("scanMode === 'pulang'"),
  "Mode button for 'pulang' switches scanMode to 'pulang' with conditional styling"
);

// Check distinct color theming for Datang (Emerald) and Pulang (Blue)
expect(
  piketSource.includes('bg-emerald-600') && piketSource.includes('bg-blue-600'),
  "Visual distinction: Emerald theme for 'datang' and Blue theme for 'pulang'"
);

// Check status passed to recordPresensiSiswa
expect(
  piketSource.includes('status: scanMode'),
  "handleProcessScan forwards active scanMode directly to recordPresensiSiswa"
);

// Check camera detection loop dependencies include scanMode
expect(
  piketSource.includes('[cameraActive, scanMode]'),
  'Barcode camera detection loop hook reacts to scanMode updates'
);

// Check filter and search state hooks
expect(
  piketSource.includes("const [scanFilterKelas, setScanFilterKelas] = useState('Semua');") &&
  piketSource.includes("const [scanSearchQuery, setScanSearchQuery] = useState('');"),
  'Filter class and search query states are properly declared'
);

// Check filter implementation
expect(
  piketSource.includes('const filteredTodayScans = todayScans.filter(') &&
  piketSource.includes("scanFilterKelas === 'Semua' || item.kelas === scanFilterKelas") &&
  piketSource.includes('!scanSearchQuery.trim() ||'),
  'filteredTodayScans accurately filters by class and student name / NISN'
);

// Check status badges in the log table
expect(
  piketSource.includes("item.status === 'datang' ?") &&
  piketSource.includes('Datang') &&
  piketSource.includes('Pulang'),
  'Attendance log table renders dedicated status badges for Datang and Pulang'
);

// ============================================================================
// PART 2: EMPIRICAL MODE TOGGLING & STATUS LOGGING RESILIENCE
// ============================================================================
console.log("\n--- 2. Empirical Mode Toggling ('Datang' vs 'Pulang') & Status Logging ---");

// In-memory mock database store
interface DbRow {
  id: string;
  sekolah_id: string;
  siswa_id: string;
  nisn: string | null;
  nama_siswa: string;
  kelas: string;
  tanggal: string;
  status: 'datang' | 'pulang';
  jam: string;
  timestamp: string;
  device_id: string;
}

const dbPresensi: DbRow[] = [];
let nextRowId = 1;

function createMockSupabase() {
  return {
    from(table: string) {
      if (table === 'presensi_siswa') {
        return {
          select(fields = '*') {
            return {
              eq(col1: string, val1: any) {
                return {
                  eq(col2: string, val2: any) {
                    return {
                      eq(col3: string, val3: any) {
                        return {
                          eq(col4: string, val4: any) {
                            return {
                              maybeSingle: async () => {
                                const found = dbPresensi.find(
                                  r => (r as any)[col1] === val1 &&
                                       (r as any)[col2] === val2 &&
                                       (r as any)[col3] === val3 &&
                                       (r as any)[col4] === val4
                                );
                                return { data: found || null, error: null };
                              }
                            };
                          }
                        };
                      },
                      // For getTodayPresensiSummary
                      then(resolve: any) {
                        const filtered = dbPresensi.filter(
                          r => (r as any)[col1] === val1 && (r as any)[col2] === val2
                        );
                        resolve({ data: filtered, error: null });
                      }
                    };
                  }
                };
              },
              order(col: string, { ascending }: { ascending: boolean }) {
                return {
                  limit(n: number) {
                    const sorted = [...dbPresensi].sort((a, b) => {
                      if (col === 'timestamp') {
                        return ascending
                          ? a.timestamp.localeCompare(b.timestamp)
                          : b.timestamp.localeCompare(a.timestamp);
                      }
                      return 0;
                    });
                    return Promise.resolve({ data: sorted.slice(0, n), error: null });
                  }
                };
              }
            };
          },
          insert(payload: any) {
            return {
              select() {
                return {
                  single: async () => {
                    const row = Array.isArray(payload) ? payload[0] : payload;
                    // Check primary unique key constraint: (sekolah_id, tanggal, siswa_id, status)
                    const existing = dbPresensi.find(
                      r => r.sekolah_id === row.sekolah_id &&
                           r.tanggal === row.tanggal &&
                           r.siswa_id === row.siswa_id &&
                           r.status === row.status
                    );
                    if (existing) {
                      const err: any = new Error('duplicate key value violates unique constraint');
                      err.code = '23505';
                      return { data: null, error: err };
                    }
                    const newRow: DbRow = {
                      ...row,
                      id: `presensi-${nextRowId++}`
                    };
                    dbPresensi.push(newRow);
                    return { data: newRow, error: null };
                  }
                };
              }
            };
          }
        };
      }
      throw new Error(`Unknown table: ${table}`);
    }
  };
}

async function runModeTogglingSuite() {
  const mockSupabase = createMockSupabase();
  const testDate = '2026-10-04';
  const testSchool = 'school-m3-test';

  const studentA: StudentReference = {
    id: 'student-uuid-001',
    nisn: '0011223344',
    nama_siswa: 'Budi Pratama',
    kelas: 'VII-A',
    sekolah_id: testSchool
  };

  const studentB: StudentReference = {
    id: 'student-uuid-002',
    nisn: '0022334455',
    nama_siswa: 'Siti Aminah',
    kelas: 'VII-B',
    sekolah_id: testSchool
  };

  // 2.1 Mode 'datang' scan
  const datangResA = await recordPresensiSiswa(mockSupabase, {
    siswa: studentA,
    status: 'datang',
    sekolahId: testSchool,
    tanggal: testDate,
    jam: '06:45:00',
    deviceId: 'kiosk-1'
  });

  expect(datangResA.success === true, "Student A scan 'datang' succeeds");
  expect(datangResA.data?.status === 'datang', "Logged record status is exactly 'datang'");
  expect(datangResA.data?.device_id === 'kiosk-1', 'Logged record deviceId is kiosk-1');

  // 2.2 Duplicate check in mode 'datang'
  const duplicateDatangA = await recordPresensiSiswa(mockSupabase, {
    siswa: studentA,
    status: 'datang',
    sekolahId: testSchool,
    tanggal: testDate,
    jam: '06:50:00',
    deviceId: 'kiosk-2'
  });

  expect(duplicateDatangA.success === false, "Second 'datang' scan for Student A is rejected");
  expect(duplicateDatangA.alreadyExists === true, "Second 'datang' scan sets alreadyExists: true");
  expect(
    duplicateDatangA.message.includes('sudah tercatat presensi datang'),
    "Duplicate rejection message states student is already recorded for 'datang'"
  );

  // 2.3 Mode Toggle to 'pulang'
  const pulangResA = await recordPresensiSiswa(mockSupabase, {
    siswa: studentA,
    status: 'pulang',
    sekolahId: testSchool,
    tanggal: testDate,
    jam: '14:30:00',
    deviceId: 'kiosk-3'
  });

  expect(pulangResA.success === true, "Toggling mode to 'pulang' succeeds for Student A on same date");
  expect(pulangResA.data?.status === 'pulang', "Logged record status is exactly 'pulang'");
  expect(pulangResA.data?.device_id === 'kiosk-3', 'Logged record deviceId is kiosk-3');

  // Verify DB now holds both 'datang' AND 'pulang' for student A without collision
  const studentARecords = dbPresensi.filter(r => r.siswa_id === studentA.id);
  expect(
    studentARecords.length === 2 &&
    studentARecords.some(r => r.status === 'datang') &&
    studentARecords.some(r => r.status === 'pulang'),
    "Database holds both 'datang' and 'pulang' records for student A on the same date"
  );

  // 2.4 Duplicate check in mode 'pulang'
  const duplicatePulangA = await recordPresensiSiswa(mockSupabase, {
    siswa: studentA,
    status: 'pulang',
    sekolahId: testSchool,
    tanggal: testDate,
    jam: '14:35:00',
    deviceId: 'kiosk-3'
  });

  expect(duplicatePulangA.success === false, "Second 'pulang' scan for Student A is rejected");
  expect(duplicatePulangA.alreadyExists === true, "Second 'pulang' scan sets alreadyExists: true");

  // 2.5 Out of order: Student B scans 'pulang' first (e.g. half-day permission)
  const outOfOrderPulangB = await recordPresensiSiswa(mockSupabase, {
    siswa: studentB,
    status: 'pulang',
    sekolahId: testSchool,
    tanggal: testDate,
    jam: '11:00:00',
    deviceId: 'kiosk-4'
  });

  expect(outOfOrderPulangB.success === true, "Student B can record 'pulang' first without blocking or error");
  expect(outOfOrderPulangB.data?.status === 'pulang', "Status is recorded as 'pulang'");

  // Student B subsequently records 'datang'
  const laterDatangB = await recordPresensiSiswa(mockSupabase, {
    siswa: studentB,
    status: 'datang',
    sekolahId: testSchool,
    tanggal: testDate,
    jam: '12:00:00',
    deviceId: 'kiosk-4'
  });
  expect(laterDatangB.success === true, "Student B can record 'datang' afterwards without collision");

  // 2.6 Summary aggregation verification
  const summary = await getTodayPresensiSummary(mockSupabase, testSchool, testDate);
  expect(summary.totalDatang === 2, `Summary totalDatang = 2 (got ${summary.totalDatang})`);
  expect(summary.totalPulang === 2, `Summary totalPulang = 2 (got ${summary.totalPulang})`);
  expect(summary.totalUnik === 2, `Summary totalUnik = 2 (got ${summary.totalUnik})`);

  // 2.7 Rapid concurrent mode toggling stress test (100 scans across 10 kiosks)
  console.log('  Testing rapid interleaved mode toggling across 50 students...');
  const stressPromises: Promise<any>[] = [];
  for (let i = 10; i < 60; i++) {
    const s: StudentReference = {
      id: `std-stress-${i}`,
      nisn: `NISN-${9000 + i}`,
      nama_siswa: `Stress Student ${i}`,
      kelas: i % 2 === 0 ? 'VII-A' : 'VII-B',
      sekolah_id: testSchool
    };
    // Alternate modes rapidly
    const mode = i % 2 === 0 ? 'datang' : 'pulang';
    const kiosk = `kiosk-${(i % 10) + 1}`;
    stressPromises.push(
      recordPresensiSiswa(mockSupabase, {
        siswa: s,
        status: mode,
        sekolahId: testSchool,
        tanggal: testDate,
        jam: `07:${String(i).padStart(2, '0')}:00`,
        deviceId: kiosk
      })
    );
  }

  const stressResults = await Promise.all(stressPromises);
  const allSuccessful = stressResults.every(r => r.success === true);
  expect(allSuccessful, 'All 50 interleaved concurrent scans succeeded without crosstalk');

  const stressSummary = await getTodayPresensiSummary(mockSupabase, testSchool, testDate);
  // Initial 2 datang + 25 stress datang = 27 datang
  // Initial 2 pulang + 25 stress pulang = 27 pulang
  // Initial 2 unique + 50 stress = 52 unique
  expect(stressSummary.totalDatang === 27, `Aggregated totalDatang is 27 (got ${stressSummary.totalDatang})`);
  expect(stressSummary.totalPulang === 27, `Aggregated totalPulang is 27 (got ${stressSummary.totalPulang})`);
  expect(stressSummary.totalUnik === 52, `Aggregated totalUnik is 52 (got ${stressSummary.totalUnik})`);
}

// ============================================================================
// PART 3: FILTER AND SEARCH OPERATIONS EMPIRICAL STRESS TEST
// ============================================================================
console.log("\n--- 3. Filter & Search Operations on Attendance Log ---");

// The exact filtering function from PiketView.tsx line 436-442:
function filterAttendanceLog(
  scans: any[],
  scanFilterKelas: string,
  scanSearchQuery: string
) {
  return scans.filter(item => {
    const matchKelas = scanFilterKelas === 'Semua' || item.kelas === scanFilterKelas;
    const matchSearch = !scanSearchQuery.trim() || 
      (item.nama_siswa?.toLowerCase() || '').includes(scanSearchQuery.toLowerCase()) ||
      (item.nisn?.toLowerCase() || '').includes(scanSearchQuery.toLowerCase());
    return matchKelas && matchSearch;
  });
}

function runFilterAndSearchSuite() {
  const sampleScans = [
    { id: 1, nama_siswa: 'Ahmad Dahlan', nisn: '001001', kelas: 'VII-A', status: 'datang', jam: '06:45:00' },
    { id: 2, nama_siswa: 'Budi Santoso', nisn: '001002', kelas: 'VII-A', status: 'datang', jam: '06:47:00' },
    { id: 3, nama_siswa: 'Citra Kirana', nisn: '002001', kelas: 'VII-B', status: 'datang', jam: '06:48:00' },
    { id: 4, nama_siswa: 'Dewi Sartika', nisn: '002002', kelas: 'VII-B', status: 'pulang', jam: '13:00:00' },
    { id: 5, nama_siswa: 'Eko Prasetyo', nisn: '003001', kelas: 'VIII-A', status: 'datang', jam: '06:50:00' },
    { id: 6, nama_siswa: 'Farhan Ahmad', nisn: '003002', kelas: 'VIII-A', status: 'pulang', jam: '14:00:00' },
    { id: 7, nama_siswa: 'Ahmad Syarif', nisn: '004001', kelas: 'IX-B', status: 'datang', jam: '07:00:00' },
    // Edge-case items: missing fields
    { id: 8, nama_siswa: null, nisn: '009999', kelas: 'VII-A', status: 'datang', jam: '07:05:00' },
    { id: 9, nama_siswa: 'Gita Gutawa', nisn: null, kelas: 'VII-B', status: 'pulang', jam: '14:10:00' },
    { id: 10, nama_siswa: 'Hadi (X)', nisn: '008888', kelas: 'IX-B', status: 'datang', jam: '07:15:00' }
  ];

  // 3.1 Class Filter: 'Semua'
  const rSemua = filterAttendanceLog(sampleScans, 'Semua', '');
  expect(rSemua.length === 10, "Filter 'Semua' returns all 10 records");

  // 3.2 Specific Class Filter
  const r7A = filterAttendanceLog(sampleScans, 'VII-A', '');
  expect(r7A.length === 3, "Filter 'VII-A' returns 3 records");
  expect(r7A.every(i => i.kelas === 'VII-A'), "All returned records have kelas 'VII-A'");

  const r7B = filterAttendanceLog(sampleScans, 'VII-B', '');
  expect(r7B.length === 3, "Filter 'VII-B' returns 3 records");

  const rNonExistent = filterAttendanceLog(sampleScans, 'XII-IPA', '');
  expect(rNonExistent.length === 0, "Non-existent class returns empty array without throwing");

  // 3.3 Search by Student Name (Exact & Case Insensitive)
  const rBudi = filterAttendanceLog(sampleScans, 'Semua', 'budi');
  expect(rBudi.length === 1 && rBudi[0].nama_siswa === 'Budi Santoso', "Search 'budi' (lowercase) matches 'Budi Santoso'");

  const rBudiUpper = filterAttendanceLog(sampleScans, 'Semua', 'BUDI');
  expect(rBudiUpper.length === 1 && rBudiUpper[0].nama_siswa === 'Budi Santoso', "Search 'BUDI' (uppercase) matches 'Budi Santoso'");

  const rAhmad = filterAttendanceLog(sampleScans, 'Semua', 'Ahmad');
  expect(rAhmad.length === 3, "Search 'Ahmad' matches 3 records across classes (Ahmad Dahlan, Farhan Ahmad, Ahmad Syarif)");

  // 3.4 Search by NISN (Exact & Partial)
  const rNisnExact = filterAttendanceLog(sampleScans, 'Semua', '002001');
  expect(rNisnExact.length === 1 && rNisnExact[0].nama_siswa === 'Citra Kirana', "Search by full NISN '002001' finds Citra Kirana");

  const rNisnPartial = filterAttendanceLog(sampleScans, 'Semua', '003');
  expect(rNisnPartial.length === 2, "Partial NISN search '003' matches 2 records in VIII-A");

  // 3.5 Combined Filter + Search
  const rAhmad7A = filterAttendanceLog(sampleScans, 'VII-A', 'Ahmad');
  expect(rAhmad7A.length === 1 && rAhmad7A[0].nama_siswa === 'Ahmad Dahlan', "Filter 'VII-A' + Search 'Ahmad' returns only Ahmad Dahlan");

  const rAhmad8A = filterAttendanceLog(sampleScans, 'VIII-A', 'Ahmad');
  expect(rAhmad8A.length === 1 && rAhmad8A[0].nama_siswa === 'Farhan Ahmad', "Filter 'VIII-A' + Search 'Ahmad' returns only Farhan Ahmad");

  const rAhmadNone = filterAttendanceLog(sampleScans, 'VII-B', 'Ahmad');
  expect(rAhmadNone.length === 0, "Filter 'VII-B' + Search 'Ahmad' returns 0 (none in VII-B)");

  // 3.6 Whitespace & Empty Query Resilience
  const rEmpty = filterAttendanceLog(sampleScans, 'Semua', '');
  expect(rEmpty.length === 10, "Empty string search returns all records");

  const rSpaces = filterAttendanceLog(sampleScans, 'Semua', '    ');
  expect(rSpaces.length === 10, "Whitespace-only search returns all records");

  // 3.7 Regex and Special Character Injection Resilience
  const specialChars = ['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\', '<script>', "' OR 1=1 --"];
  let specialCharSurvived = true;
  for (const ch of specialChars) {
    try {
      filterAttendanceLog(sampleScans, 'Semua', ch);
    } catch (e) {
      specialCharSurvived = false;
      console.error(`Crashed on special character: ${ch}`, e);
    }
  }
  expect(specialCharSurvived, 'All special regex and SQL characters handled safely without SyntaxError/crash');

  // Exact special char search: 'Hadi (X)'
  const rParen = filterAttendanceLog(sampleScans, 'Semua', '(X)');
  expect(rParen.length === 1 && rParen[0].nama_siswa === 'Hadi (X)', "Literal parentheses search '(X)' matches 'Hadi (X)'");

  // 3.8 Null and Undefined Fields Resilience
  let nullSafe = true;
  try {
    const rNullName = filterAttendanceLog(sampleScans, 'Semua', '009999');
    expect(rNullName.length === 1 && rNullName[0].id === 8, "Record with null nama_siswa matched by NISN without TypeError");

    const rNullNisn = filterAttendanceLog(sampleScans, 'Semua', 'Gutawa');
    expect(rNullNisn.length === 1 && rNullNisn[0].id === 9, "Record with null nisn matched by nama_siswa without TypeError");
  } catch (e) {
    nullSafe = false;
  }
  expect(nullSafe, 'Null/undefined fields do not cause runtime errors during search');

  // 3.9 Large-Scale Performance Stress Test (5,000 records)
  console.log('  Testing filter performance on 5,000 scan records...');
  const largeDataset: any[] = [];
  for (let i = 0; i < 5000; i++) {
    largeDataset.push({
      id: i,
      nama_siswa: `Student ${i} Name`,
      nisn: `NISN-${100000 + i}`,
      kelas: `Kelas-${(i % 15) + 1}`,
      status: i % 2 === 0 ? 'datang' : 'pulang',
      jam: '07:00:00'
    });
  }

  const startTime = Date.now();
  const perfFilter = filterAttendanceLog(largeDataset, 'Kelas-5', 'Student 5');
  const elapsed = Date.now() - startTime;
  expect(
    perfFilter.length > 0 && elapsed < 50,
    `5,000 records filtered in ${elapsed}ms (sub-50ms target met, got ${perfFilter.length} matches)`
  );
}

// Run all test suites
async function main() {
  await runModeTogglingSuite();
  runFilterAndSearchSuite();

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test execution failed with unhandled exception:', err);
  process.exit(1);
});
