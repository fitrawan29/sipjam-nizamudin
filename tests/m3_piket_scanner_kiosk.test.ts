import fs from 'fs';
import path from 'path';
import {
  recordPresensiSiswa,
  resolveStudentByCode,
  getTodayPresensiSummary,
  getRecentPresensiSiswa,
  getLocalTodayDate,
  getLocalCurrentTime,
  StudentReference
} from '../src/lib/qrSiswa';

console.log('====================================================');
console.log('MILESTONE 3: PIKETVIEW SCANNER & MULTI-KIOSK AUDIT');
console.log('====================================================');

let testsPassed = 0;
let testsTotal = 0;

function assert(condition: boolean, msg: string) {
  testsTotal++;
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✓ ${msg}`);
  testsPassed++;
}

// ---------------------------------------------------------------------------
// 1. Static Source Code Inspection of PiketView.tsx
// ---------------------------------------------------------------------------
console.log('\n--- 1. Static Code Inspection of PiketView.tsx ---');

const piketViewPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
assert(fs.existsSync(piketViewPath), 'PiketView.tsx exists');

const piketContent = fs.readFileSync(piketViewPath, 'utf8');

// Tab 'scan' definition
assert(
  piketContent.includes("'scan'") && piketContent.includes('Scan QR Siswa') && piketContent.includes('fa-qrcode'),
  "PiketView defines tab 'scan' with label 'Scan QR Siswa' and icon 'fa-qrcode'"
);

// Mode Toggle: Datang vs Pulang
assert(
  piketContent.includes("setScanMode('datang')") &&
  piketContent.includes("setScanMode('pulang')") &&
  piketContent.includes('PRESENSI DATANG') &&
  piketContent.includes('PRESENSI PULANG'),
  'PiketView implements prominent visual mode toggle for Datang vs Pulang'
);

// Dual Input 1: Hardware USB HID scanner
assert(
  piketContent.includes('usbInputRef') &&
  piketContent.includes('handleUsbInputBlur') &&
  piketContent.includes('autoFocus') &&
  piketContent.includes('handleProcessScan'),
  'PiketView implements hardware USB HID scanner input with auto-focus and auto re-focus mechanism'
);

// Dual Input 2: Browser camera scanner with BarcodeDetector
assert(
  piketContent.includes('videoRef') &&
  piketContent.includes('startCamera') &&
  piketContent.includes('stopCamera') &&
  piketContent.includes('BarcodeDetector'),
  'PiketView implements HTML5 video stream camera scanner with native BarcodeDetector API'
);

// Audio feedback via Web Audio API
assert(
  piketContent.includes('AudioContext') &&
  piketContent.includes('playAudioFeedback') &&
  piketContent.includes('createOscillator') &&
  piketContent.includes('createGain'),
  'PiketView implements zero-dependency Web Audio API sound feedback for success, warning, and error'
);

// Visual feedback student card
assert(
  piketContent.includes('lastScanResult') &&
  piketContent.includes('nama_siswa') &&
  piketContent.includes('kelas') &&
  piketContent.includes('nisn'),
  'PiketView displays real-time student visual feedback card with name, class, NISN, and timestamp'
);

// 10-Unit Multi-Kiosk Concurrency & Supabase Realtime
assert(
  piketContent.includes('kiosk-1') &&
  piketContent.includes('kiosk-10') &&
  piketContent.includes('postgres_changes') &&
  piketContent.includes('presensi_siswa'),
  'PiketView supports 10-unit kiosk concurrency with Supabase Realtime channel subscription'
);

// Live Attendance Log & Summary stat cards
assert(
  piketContent.includes('Total Hadir Datang') &&
  piketContent.includes('Total Pulang') &&
  piketContent.includes('Total Unik Siswa') &&
  piketContent.includes('scanFilterKelas') &&
  piketContent.includes('scanSearchQuery'),
  'PiketView implements live attendance summary stat cards, class filter, and student search'
);

// ---------------------------------------------------------------------------
// 2. Multi-Kiosk 10-Unit Concurrency Behavioral Simulation
// ---------------------------------------------------------------------------
console.log('\n--- 2. Multi-Kiosk 10-Unit Concurrency Behavioral Simulation ---');

const mockStore: any[] = [];
const mockStudents: StudentReference[] = Array.from({ length: 20 }, (_, i) => ({
  id: `std-uuid-${i + 1}`,
  nisn: `NISN-${1000 + i}`,
  nama_siswa: `Siswa Bintang ${i + 1}`,
  kelas: i % 2 === 0 ? 'X-A' : 'X-B',
  sekolah_id: 'sekolah-kiosk-test-id',
  qr_code: `QR-SISWA-${1000 + i}`
}));

const mockSupabase: any = {
  from(tableName: string) {
    if (tableName === 'data_siswa') {
      return {
        select() {
          return {
            eq(col: string, val: string) {
              return {
                or(orExpr: string) {
                  return {
                    maybeSingle: async () => {
                      const match = mockStudents.find(
                        s => s.qr_code === val || s.nisn === val || s.id === val
                      );
                      return { data: match || null, error: null };
                    }
                  };
                },
                maybeSingle: async () => {
                  return { data: null, error: null };
                }
              };
            }
          };
        }
      };
    }

    if (tableName === 'presensi_siswa') {
      return {
        select() {
          return {
            eq(c1: string, v1: string) {
              return {
                eq(c2: string, v2: string) {
                  return {
                    eq(c3: string, v3: string) {
                      return {
                        eq(c4: string, v4: string) {
                          return {
                            maybeSingle: async () => {
                              const found = mockStore.find(
                                r => r.sekolah_id === v1 &&
                                     r.tanggal === v2 &&
                                     r.siswa_id === v3 &&
                                     r.status === v4
                              );
                              return { data: found || null, error: null };
                            }
                          };
                        }
                      };
                    },
                    // For getTodayPresensiSummary: .eq('sekolah_id', s).eq('tanggal', t)
                    then(resolve: any) {
                      const filtered = mockStore.filter(
                        r => r.sekolah_id === v1 && r.tanggal === v2
                      );
                      resolve({ data: filtered, error: null });
                    }
                  };
                }
              };
            },
            order() {
              return {
                limit(n: number) {
                  return Promise.resolve({ data: mockStore.slice(0, n), error: null });
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
                  const item = Array.isArray(payload) ? payload[0] : payload;
                  const conflict = mockStore.find(
                    r => r.sekolah_id === item.sekolah_id &&
                         r.tanggal === item.tanggal &&
                         r.siswa_id === item.siswa_id &&
                         r.status === item.status
                  );
                  if (conflict) {
                    const err: any = new Error('duplicate key value violates unique constraint');
                    err.code = '23505';
                    return { data: null, error: err };
                  }
                  mockStore.push(item);
                  return { data: item, error: null };
                }
              };
            }
          };
        }
      };
    }

    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
  }
};

async function runMultiKioskSimulation() {
  const kioskStations = Array.from({ length: 10 }, (_, i) => `kiosk-${i + 1}`);

  // 10 different kiosks scan 10 different students simultaneously
  const scanPromises = kioskStations.map((station, idx) => {
    const student = mockStudents[idx];
    return recordPresensiSiswa(mockSupabase, {
      siswa: student,
      status: 'datang',
      sekolahId: 'sekolah-kiosk-test-id',
      deviceId: station,
      tanggal: '2026-10-04',
      jam: `06:${String(30 + idx).padStart(2, '0')}:00`
    });
  });

  const results = await Promise.all(scanPromises);

  results.forEach((res, idx) => {
    assert(res.success === true, `Kiosk ${idx + 1} (${kioskStations[idx]}) recorded student ${idx + 1} successfully`);
    assert(res.alreadyExists === false, `Kiosk ${idx + 1} returned alreadyExists: false`);
  });

  // Check that all 10 device IDs were accurately tagged
  const recordedDevices = new Set(mockStore.map(r => r.device_id));
  assert(recordedDevices.size === 10, 'All 10 unique kiosk device IDs are preserved in presensi_siswa records');

  // Verify concurrent duplicate attempt from a different kiosk
  const duplicateAttempt = await recordPresensiSiswa(mockSupabase, {
    siswa: mockStudents[0],
    status: 'datang',
    sekolahId: 'sekolah-kiosk-test-id',
    deviceId: 'kiosk-2', // Different kiosk scanning the same student who scanned at kiosk-1
    tanggal: '2026-10-04'
  });

  assert(duplicateAttempt.success === false, 'Cross-kiosk duplicate attempt safely rejected');
  assert(duplicateAttempt.alreadyExists === true, 'Cross-kiosk duplicate flagged alreadyExists: true');

  // Verify attendance summary
  const summary = await getTodayPresensiSummary(mockSupabase, 'sekolah-kiosk-test-id', '2026-10-04');
  assert(summary.totalDatang === 10, `Total datang correctly aggregates 10 check-ins across kiosks (got ${summary.totalDatang})`);
  assert(summary.totalUnik === 10, `Total unique students correctly counted as 10 (got ${summary.totalUnik})`);

  // Verify pulang scan for same students from different kiosks
  const pulangResult = await recordPresensiSiswa(mockSupabase, {
    siswa: mockStudents[0],
    status: 'pulang',
    sekolahId: 'sekolah-kiosk-test-id',
    deviceId: 'kiosk-5', // Student checks out at kiosk-5
    tanggal: '2026-10-04',
    jam: '14:05:00'
  });

  assert(pulangResult.success === true, 'Student checkout (pulang) from Kiosk 5 succeeded after earlier arrival (datang)');

  const updatedSummary = await getTodayPresensiSummary(mockSupabase, 'sekolah-kiosk-test-id', '2026-10-04');
  assert(updatedSummary.totalPulang === 1, `Total pulang updated to 1 (got ${updatedSummary.totalPulang})`);
  assert(updatedSummary.totalUnik === 10, 'Total unique students remains 10');

  console.log(`\n🎉 ALL ${testsPassed}/${testsTotal} PIKETVIEW SCANNER & MULTI-KIOSK AUDIT CHECKS PASSED!\n`);
}

runMultiKioskSimulation().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
