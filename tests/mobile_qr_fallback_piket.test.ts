import fs from 'fs';
import path from 'path';
import jsQR from 'jsqr';
import {
  generateQrMatrix,
  resolveStudentByCode,
  recordPresensiSiswa,
  getLocalTodayDate,
  getLocalCurrentTime,
  StudentReference
} from '../src/lib/qrSiswa';

console.log('====================================================');
console.log('TEST SUITE: MOBILE QR SCANNER FALLBACK & PRESENSI DATANG');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    if (detail) console.error(`    Detail: ${detail}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// 1. Static Code Analysis of PiketView.tsx
// ---------------------------------------------------------------------------
console.log('--- 1. PiketView.tsx Mobile QR Fallback Contracts ---');

const piketViewPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
assert(fs.existsSync(piketViewPath), 'PiketView.tsx exists');

const piketCode = fs.readFileSync(piketViewPath, 'utf8');

// 1.1 jsQR import
assert(
  piketCode.includes("import jsQR from 'jsqr';"),
  'PiketView imports jsQR library for client-side canvas decoding fallback'
);

// 1.2 Canvas and context integration in detection loop
assert(
  piketCode.includes('document.createElement(\'canvas\')') &&
  piketCode.includes('getContext(\'2d\'') &&
  piketCode.includes('drawImage(video') &&
  piketCode.includes('getImageData(') &&
  piketCode.includes('jsQR('),
  'Frame detection loop implements canvas-based frame processing with jsQR decoding'
);

// 1.3 Mobile compatibility attributes
assert(
  piketCode.includes("playsinline") &&
  piketCode.includes("webkit-playsinline") &&
  piketCode.includes("facingMode: { ideal: 'environment' }"),
  'Camera setup specifies ideal environment rear camera and iOS Safari playsinline attributes'
);

// 1.4 No USB HID instruction on mobile browsers without BarcodeDetector
assert(
  !piketCode.includes('Gunakan scanner USB HID atau ketik NISN'),
  'Banner does NOT instruct mobile users without BarcodeDetector to use a USB HID scanner'
);

// 1.5 Dynamic capability badge remains intact
assert(
  piketCode.includes("'BarcodeDetector' in window") &&
  piketCode.includes('BarcodeDetector aktif • Deteksi QR otomatis') &&
  piketCode.includes('Browser ini tidak mendukung BarcodeDetector bawaan'),
  'Capability badge provides clear feedback for both BarcodeDetector and fallback mode'
);

// 1.6 Concurrency protection & async scan handler in detection loop
assert(
  piketCode.includes('isSubmittingPresensiRef.current') &&
  piketCode.includes('await handleProcessScan(rawVal)'),
  'Frame detection loop guards against race conditions with isSubmittingPresensiRef and awaits scan handler'
);

// 1.7 Piket report verification condition preservation
assert(
  piketCode.includes('statusVerifikasiPiket = (isRekapLengkap && isFotoLengkap) ? \'Disetujui\' : \'Menunggu\'') &&
  piketCode.includes('if (isPiketIntervensiExpired && !isAdmin)') &&
  piketCode.includes('statusVerifikasiPiket = isFotoLengkap ? \'Disetujui\' : \'Menunggu\''),
  'statusVerifikasiPiket correctly auto-approves expired piket reports when foto bukti is complete while satisfying m22'
);

// 1.8 Mode toggle cache reset
assert(
  piketCode.includes('lastCameraScannedRef.current = null;'),
  'Scan mode toggle resets lastCameraScannedRef cooldown cache'
);

// 1.9 Unexpected camera track ending & visibility recovery handling
assert(
  piketCode.includes('track.onended') &&
  piketCode.includes('visibilitychange') &&
  piketCode.includes('Kamera terputus'),
  'Camera lifecycle handles unexpected track disconnection and background visibility recovery'
);

// 1.10 Shared Web Audio context caching & gesture priming
assert(
  piketCode.includes('audioCtxRef') &&
  piketCode.includes('getAudioContext') &&
  piketCode.includes('getAudioContext()'),
  'Web Audio API uses cached singleton AudioContext with gesture priming on camera activation'
);

// 1.11 Multi-tenant school isolation validation
assert(
  piketCode.includes('student.sekolah_id !== user.sekolah_id') &&
  piketCode.includes('!user?.sekolah_id'),
  'handleProcessScan enforces strict multi-tenant school isolation and rejects cross-school scans'
);

// 1.12 Responsive small-screen camera viewport (320px-428px)
assert(
  piketCode.includes('aspect-[4/3] sm:aspect-video') &&
  piketCode.includes('max-w-[75%] max-h-[75%]'),
  'Camera viewport and scanning reticle use responsive aspect ratio and bounds for small phone screens'
);

// ---------------------------------------------------------------------------
// 2. Behavioral Simulation: Canvas jsQR Decoding of Student QR Cards
// ---------------------------------------------------------------------------
console.log('\n--- 2. End-to-End Decoding and Attendance Recording Simulation ---');

// Helper to rasterize QR matrix to Uint8ClampedArray (mimicking canvas.getImageData)
function matrixToImageData(matrix: boolean[][], scale: number = 8, margin: number = 4) {
  const width = (matrix.length + margin * 2) * scale;
  const height = width;
  const data = new Uint8ClampedArray(width * height * 4);

  // Background: white (255, 255, 255, 255)
  data.fill(255);

  // Draw dark modules (0, 0, 0, 255)
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c]) {
        for (let py = 0; py < scale; py++) {
          for (let px = 0; px < scale; px++) {
            const idx = (((r + margin) * scale + py) * width + ((c + margin) * scale + px)) * 4;
            data[idx] = 0;
            data[idx + 1] = 0;
            data[idx + 2] = 0;
            data[idx + 3] = 255;
          }
        }
      }
    }
  }

  return { data, width, height };
}

// A. Test decoding student NISN QR code
const studentNisn = '114367407';
const matrixA = generateQrMatrix(studentNisn, { standardFormat: true });
const imgA = matrixToImageData(matrixA);
const decodedA = jsQR(imgA.data, imgA.width, imgA.height);
assert(
  Boolean(decodedA && decodedA.data === studentNisn),
  `jsQR successfully decodes student NISN QR card (expected: ${studentNisn}, got: ${decodedA?.data})`
);

// B. Test decoding student UUID QR code
const studentUuid = 'a1111111-1111-1111-1111-111111111111';
const matrixB = generateQrMatrix(studentUuid, { standardFormat: true });
const imgB = matrixToImageData(matrixB);
const decodedB = jsQR(imgB.data, imgB.width, imgB.height);
assert(
  Boolean(decodedB && decodedB.data === studentUuid),
  `jsQR successfully decodes student UUID QR card (expected: ${studentUuid}, got: ${decodedB?.data})`
);

// ---------------------------------------------------------------------------
// 3. Database Resolution & Attendance Flow Integration
// ---------------------------------------------------------------------------
console.log('\n--- 3. Attendance Recording via Decoded Code ---');

const mockStudents: StudentReference[] = [
  {
    id: studentUuid,
    nisn: studentNisn,
    nama_siswa: 'Siti Rahmawati',
    kelas: 'X-RPL-1',
    sekolah_id: 'school-mobile-test',
    qr_code: studentNisn
  },
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    nisn: '114367408',
    nama_siswa: 'Budi Santoso',
    kelas: 'X-RPL-1',
    sekolah_id: 'school-mobile-test',
    qr_code: '114367408'
  }
];

const mockAttendanceStore: any[] = [];

const mockSupabase: any = {
  from(table: string) {
    if (table === 'data_siswa') {
      return {
        select: () => {
          let filters: Array<{ col: string; val: any }> = [];
          return {
            eq(col: string, val: any) {
              filters.push({ col, val });
              return this;
            },
            maybeSingle: async () => {
              const found = mockStudents.find(s =>
                filters.every(f => (s as any)[f.col] === f.val)
              );
              return { data: found || null, error: null };
            }
          };
        }
      };
    }

    if (table === 'presensi_siswa') {
      return {
        select: () => {
          let filters: Array<{ col: string; val: any }> = [];
          return {
            eq(col: string, val: any) {
              filters.push({ col, val });
              return this;
            },
            maybeSingle: async () => {
              const found = mockAttendanceStore.find(r =>
                filters.every(f => (r as any)[f.col] === f.val)
              );
              return { data: found || null, error: null };
            }
          };
        },
        insert: (record: any) => ({
          select: () => ({
            single: async () => {
              const conflict = mockAttendanceStore.some(
                r => r.sekolah_id === record.sekolah_id &&
                     r.tanggal === record.tanggal &&
                     r.siswa_id === record.siswa_id &&
                     r.status === record.status
              );
              if (conflict) {
                const err: any = new Error('duplicate key value violates unique constraint');
                err.code = '23505';
                return { data: null, error: err };
              }
              const inserted = { ...record, id: `pres-${mockAttendanceStore.length + 1}` };
              mockAttendanceStore.push(inserted);
              return { data: inserted, error: null };
            }
          })
        })
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  }
};

async function testAttendanceFlow() {
  // Step 1: Decode QR via jsQR
  const decodedResult = jsQR(imgA.data, imgA.width, imgA.height);
  assert(Boolean(decodedResult?.data), 'jsQR successfully produced decoded QR payload');
  const scannedCode = decodedResult!.data;

  // Step 2: Resolve student by scanned code
  const { data: student, error: resolveErr } = await resolveStudentByCode(
    mockSupabase,
    scannedCode,
    'school-mobile-test'
  );
  assert(
    Boolean(student && student.nama_siswa === 'Siti Rahmawati'),
    'resolveStudentByCode resolves student identity from decoded QR payload'
  );

  // Step 3: Record datang attendance
  const attendanceResult = await recordPresensiSiswa(mockSupabase, {
    siswa: student!,
    status: 'datang',
    sekolahId: 'school-mobile-test',
    deviceId: 'mobile-guru-iphone',
    tanggal: getLocalTodayDate(),
    jam: getLocalCurrentTime()
  });

  assert(
    attendanceResult.success === true && attendanceResult.alreadyExists === false,
    'recordPresensiSiswa records datang check-in successfully on mobile browser'
  );

  // Step 4: Duplicate datang prevention test
  const duplicateResult = await recordPresensiSiswa(mockSupabase, {
    siswa: student!,
    status: 'datang',
    sekolahId: 'school-mobile-test',
    deviceId: 'mobile-guru-iphone',
    tanggal: getLocalTodayDate(),
    jam: getLocalCurrentTime()
  });

  assert(
    duplicateResult.success === false && duplicateResult.alreadyExists === true,
    'recordPresensiSiswa flags duplicate datang on same day with alreadyExists: true'
  );
  assert(
    duplicateResult.message.includes('sudah tercatat'),
    'Duplicate response provides user-friendly warning message'
  );

  // Step 5: Rapid consecutive student scanning simulation
  const matrixSecond = generateQrMatrix('114367408', { standardFormat: true });
  const imgSecond = matrixToImageData(matrixSecond);
  const decodedSecond = jsQR(imgSecond.data, imgSecond.width, imgSecond.height);
  assert(Boolean(decodedSecond?.data === '114367408'), 'jsQR decodes second student QR code in rapid queue');

  const { data: student2, error: err2 } = await resolveStudentByCode(
    mockSupabase,
    decodedSecond!.data,
    'school-mobile-test'
  );
  assert(Boolean(student2 && student2.nama_siswa === 'Budi Santoso'), 'resolveStudentByCode resolves second student');

  const attendanceResult2 = await recordPresensiSiswa(mockSupabase, {
    siswa: student2!,
    status: 'datang',
    sekolahId: 'school-mobile-test',
    deviceId: 'mobile-guru-iphone',
    tanggal: getLocalTodayDate(),
    jam: getLocalCurrentTime()
  });
  assert(
    attendanceResult2.success === true && attendanceResult2.alreadyExists === false,
    'recordPresensiSiswa successfully records second student in rapid queue without lockout'
  );

  assert(mockAttendanceStore.length === 2, 'Attendance store records both students consecutively');

  // Step 6: Multi-tenant boundary check (cross-school lookup)
  const crossResolve = await resolveStudentByCode(
    mockSupabase,
    decodedResult!.data,
    'school-other-district'
  );
  assert(crossResolve.data === null, 'resolveStudentByCode enforces strict tenant isolation on QR scans');

  // Step 7: Record without sekolah_id safety check
  const noSchoolRecord = await recordPresensiSiswa(mockSupabase, {
    siswa: { ...student!, sekolah_id: '' } as any,
    status: 'datang',
    sekolahId: ''
  });
  assert(noSchoolRecord.success === false && noSchoolRecord.error !== null, 'recordPresensiSiswa rejects attendance if sekolah_id is missing');

  console.log('\n====================================================');
  console.log(`RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

testAttendanceFlow().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
