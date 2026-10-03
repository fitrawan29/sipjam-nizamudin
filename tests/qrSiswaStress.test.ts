/**
/**
 * Empirical Stress & Adversarial Test Suite for M2 (Student QR Code & Attendance)
 * Tests boundaries, exotic inputs, SVG XML validity, tenant isolation, and race conditions.
 */

import {
  getStudentQrIdentifier,
  generateQrMatrix,
  generateStudentQrSvg,
  generateStudentQrDataUrl,
  resolveStudentByCode,
  recordPresensiSiswa,
  ensureStudentQrCode,
  getTodayPresensiSummary,
  getPresensiSiswaByKelas,
  getRecentPresensiSiswa
} from '../src/lib/qrSiswa';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runStressTests() {
  console.log('====================================================');
  console.log('ADVERSARIAL STRESS TEST: STUDENT QR & ATTENDANCE');
  console.log('====================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: QR Generator Boundary & Exotic Inputs
  // --------------------------------------------------------------------------
  console.log('--- 1. QR Generator: Boundaries & Exotic Inputs ---');

  // Test 1.1: Empty string input
  const matrixEmpty = generateQrMatrix('');
  assert(Array.isArray(matrixEmpty) && matrixEmpty.length === 21, 'Empty string generates valid 21x21 matrix (Version 1)');
  const svgEmpty = generateStudentQrSvg('');
  assert(svgEmpty.includes('<svg') && svgEmpty.includes('</svg>'), 'Empty string generates valid SVG element');

  // Test 1.2: Single character
  const matrixSingle = generateQrMatrix('A');
  assert(matrixSingle.length === 21, 'Single character generates 21x21 matrix');

  // Test 1.3: Numeric NISN with leading zeroes
  const nisn = '0012345678';
  const matrixNisn = generateQrMatrix(nisn);
  assert(matrixNisn.length === 21, 'Numeric NISN with leading zero generates 21x21 matrix');

  // Test 1.4: Standard UUID v4 (36 chars)
  const uuid = '680584c6-0e5a-48c6-8a5c-d63515be6354';
  const matrixUuid = generateQrMatrix(uuid);
  assert(matrixUuid.length === 29, '36-char UUID generates 29x29 matrix (Version 3)');

  // Test 1.5: Special characters and symbols
  const specialChars = '!@#$%^&*()_+-=[]{}|;:",./<>?~`';
  const matrixSpecial = generateQrMatrix(specialChars);
  assert(matrixSpecial.length === 25, 'Punctuation/symbol string (30 chars) generates 25x25 matrix (Version 2)');

  // Test 1.6: Multibyte UTF-8 characters (Indonesian / International / Accents)
  const utf8Text = 'Fîtrāh-Šmān-1';
  const matrixUtf8 = generateQrMatrix(utf8Text);
  assert(matrixUtf8.length === 21 || matrixUtf8.length === 25, 'Multibyte UTF-8 string generates valid matrix');

  // Test 1.7: HTML/XSS injection attempts
  const xssText = '<script>alert("XSS")</script>';
  const svgXss = generateStudentQrSvg(xssText);
  assert(svgXss.includes('<svg') && !svgXss.includes('<script>'), 'XSS payload in QR content is purely geometric data, not injected into SVG tags');

  // Test 1.8: Maximum capacity boundary (78 chars)
  const max78 = 'A'.repeat(78);
  const matrixMax78 = generateQrMatrix(max78);
  assert(matrixMax78.length === 33, 'Maximum capacity (78 chars) generates 33x33 matrix (Version 4)');

  // Test 1.9: Exceeding capacity (79 chars) must throw expected error
  let threwOn79 = false;
  try {
    const max79 = 'A'.repeat(79);
    generateQrMatrix(max79);
  } catch (err: any) {
    threwOn79 = true;
    assert(err.message.includes('Data too large for QR generator'), '79 chars throws "Data too large for QR generator" error');
  }
  assert(threwOn79, 'Exceeding 78 chars correctly triggers boundary safeguard');

  // --------------------------------------------------------------------------
  // SECTION 2: SVG Structure, Dimensions & Encoding Accuracy
  // --------------------------------------------------------------------------
  console.log('\n--- 2. SVG Structure, Dimensions & Encoding Accuracy ---');

  // Test 2.1: Default dimensions and styling
  const svgDefault = generateStudentQrSvg('NISN123456');
  assert(svgDefault.includes('width="220"'), 'Default width is 220');
  assert(svgDefault.includes('height="220"'), 'Default height is 220');
  assert(svgDefault.includes('shape-rendering="crispEdges"'), 'crispEdges enabled for sharp QR barcode rendering');
  assert(svgDefault.includes('fill="#0B4619"'), 'SIPJAM default emerald green fgColor');
  assert(svgDefault.includes('fill="#FFFFFF"'), 'Default white bgColor');

  // Test 2.2: Custom dimensions and colors
  const svgCustom = generateStudentQrSvg('NISN123456', {
    size: 450,
    margin: 5,
    fgColor: '#1A202C',
    bgColor: '#F7FAFC'
  });
  assert(svgCustom.includes('width="450"'), 'Custom width 450 applied');
  assert(svgCustom.includes('height="450"'), 'Custom height 450 applied');
  assert(svgCustom.includes('fill="#1A202C"'), 'Custom fgColor applied');
  assert(svgCustom.includes('fill="#F7FAFC"'), 'Custom bgColor applied');
  // Margin 5 on 21x21 -> viewBox 0 0 31 31
  assert(svgCustom.includes('viewBox="0 0 31 31"'), 'Custom margin 5 produces 31x31 viewBox');

  // Test 2.3: Data URL Base64 decoding roundtrip
  const dataUrl = generateStudentQrDataUrl('114367407', { size: 150 });
  assert(dataUrl.startsWith('data:image/svg+xml;base64,'), 'Data URL has correct MIME prefix');
  const base64Data = dataUrl.replace('data:image/svg+xml;base64,', '');
  const decodedSvg = Buffer.from(base64Data, 'base64').toString('utf-8');
  assert(decodedSvg === generateStudentQrSvg('114367407', { size: 150 }), 'Base64 decoded content matches generated SVG byte-for-byte');

  // --------------------------------------------------------------------------
  // SECTION 3: Multi-Tenant Isolation & Resolution Robustness
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Multi-Tenant Isolation & Resolution Robustness ---');

  const mockStudentsDb = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      nisn: '9988776655',
      nama_siswa: 'Siswa Sekolah A',
      kelas: 'VII-A',
      sekolah_id: 'tenant-school-a',
      qr_code: '9988776655'
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      nisn: '9988776655', // Duplicate NISN across different schools (multi-tenant collision edge case)
      nama_siswa: 'Siswa Sekolah B (Same NISN)',
      kelas: 'VIII-B',
      sekolah_id: 'tenant-school-b',
      qr_code: '9988776655'
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      nisn: null,
      nama_siswa: 'Siswa Tanpa NISN',
      kelas: 'IX-C',
      sekolah_id: 'tenant-school-a',
      qr_code: '33333333-3333-3333-3333-333333333333'
    }
  ];

  const createTenantMockSupabase = () => ({
    from: (table: string) => {
      if (table === 'data_siswa') {
        let filters: Array<{ col: string; val: any; type: string }> = [];
        return {
          select: () => ({
            eq: function (col: string, val: any) {
              filters.push({ col, val, type: 'eq' });
              return this;
            },
            ilike: function (col: string, val: any) {
              filters.push({ col, val, type: 'ilike' });
              return this;
            },
            maybeSingle: async () => {
              const found = mockStudentsDb.find(s => {
                return filters.every(f => {
                  if (f.type === 'eq') return (s as any)[f.col] === f.val;
                  if (f.type === 'ilike') return String((s as any)[f.col]).toLowerCase() === String(f.val).toLowerCase();
                  return true;
                });
              });
              return { data: found || null, error: null };
            }
          })
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }
  });

  const tenantClient = createTenantMockSupabase();

  // Test 3.1: Resolution with tenant-school-a finds Student A
  const resA = await resolveStudentByCode(tenantClient, '9988776655', 'tenant-school-a');
  assert(resA.data?.nama_siswa === 'Siswa Sekolah A', 'Query with tenant-school-a returns School A student');

  // Test 3.2: Resolution with tenant-school-b finds Student B even with identical NISN
  const resB = await resolveStudentByCode(tenantClient, '9988776655', 'tenant-school-b');
  assert(resB.data?.nama_siswa === 'Siswa Sekolah B (Same NISN)', 'Query with tenant-school-b returns School B student with same NISN');

  // Test 3.3: Cross-tenant access attempt (School C querying School A student's QR)
  const resC = await resolveStudentByCode(tenantClient, '9988776655', 'tenant-school-c');
  assert(resC.data === null, 'Tenant C cannot resolve student belonging to Tenant A or B');
  assert(resC.error !== null && resC.error.message.includes('tidak ditemukan'), 'Returns "tidak ditemukan" when tenant mismatch occurs');

  // Test 3.4: Resolution by UUID under tenant isolation
  const resUuidA = await resolveStudentByCode(tenantClient, '33333333-3333-3333-3333-333333333333', 'tenant-school-a');
  assert(resUuidA.data?.nama_siswa === 'Siswa Tanpa NISN', 'UUID resolution succeeds under correct school_id');

  const resUuidWrongSchool = await resolveStudentByCode(tenantClient, '33333333-3333-3333-3333-333333333333', 'tenant-school-b');
  assert(resUuidWrongSchool.data === null, 'UUID resolution blocked when school_id does not match');

  // Test 3.5: Whitespace-padded input is cleaned
  const resPadded = await resolveStudentByCode(tenantClient, '  9988776655 \n', 'tenant-school-a');
  assert(resPadded.data?.nama_siswa === 'Siswa Sekolah A', 'Whitespace-padded scanned input is trimmed and resolved');

  // Test 3.6: Empty and whitespace-only scan inputs
  const resEmpty1 = await resolveStudentByCode(tenantClient, '');
  assert(resEmpty1.data === null && resEmpty1.error.message.includes('kosong'), 'Empty input rejected with error');
  const resEmpty2 = await resolveStudentByCode(tenantClient, '   \t  ');
  assert(resEmpty2.data === null && resEmpty2.error.message.includes('kosong'), 'Whitespace-only input rejected with error');

  // --------------------------------------------------------------------------
  // SECTION 4: Concurrency & Duplicate Prevention in Attendance Recording
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Concurrency & Duplicate Prevention ---');

  const attendanceLog: any[] = [];
  const createAttendanceMock = () => ({
    from: (table: string) => {
      if (table === 'presensi_siswa') {
        let filters: Array<{ col: string; val: any }> = [];
        return {
          select: () => ({
            eq: function (col: string, val: any) {
              filters.push({ col, val });
              return this;
            },
            maybeSingle: async () => {
              const match = attendanceLog.find(r =>
                filters.every(f => r[f.col] === f.val)
              );
              return { data: match || null, error: null };
            }
          }),
          insert: (record: any) => ({
            select: () => ({
              single: async () => {
                // Simulate Postgres UNIQUE (sekolah_id, tanggal, siswa_id, status)
                const conflict = attendanceLog.some(r =>
                  r.sekolah_id === record.sekolah_id &&
                  r.tanggal === record.tanggal &&
                  r.siswa_id === record.siswa_id &&
                  r.status === record.status
                );
                if (conflict) {
                  const err: any = new Error('duplicate key value violates unique constraint "uq_presensi_siswa_status"');
                  err.code = '23505';
                  return { data: null, error: err };
                }
                const inserted = { ...record, id: `presensi-${attendanceLog.length + 1}` };
                attendanceLog.push(inserted);
                return { data: inserted, error: null };
              }
            })
          })
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }
  });

  const attendanceClient = createAttendanceMock();
  const testStudent = mockStudentsDb[0];

  // Test 4.1: Record Datang
  const checkin1 = await recordPresensiSiswa(attendanceClient, {
    siswa: testStudent,
    status: 'datang',
    sekolahId: 'tenant-school-a',
    tanggal: '2026-10-04',
    jam: '06:55:00',
    deviceId: 'scanner-kiosk-1'
  });
  assert(checkin1.success === true, 'First datang scan succeeds');
  assert(checkin1.alreadyExists === false, 'alreadyExists is false on first record');

  // Test 4.2: Duplicate Datang within same day
  const checkinDup = await recordPresensiSiswa(attendanceClient, {
    siswa: testStudent,
    status: 'datang',
    sekolahId: 'tenant-school-a',
    tanggal: '2026-10-04',
    jam: '06:58:00',
    deviceId: 'scanner-kiosk-2'
  });
  assert(checkinDup.success === false, 'Duplicate datang is rejected');
  assert(checkinDup.alreadyExists === true, 'Duplicate datang flags alreadyExists: true');
  assert(checkinDup.message.includes('sudah tercatat presensi datang hari ini'), 'Helpful user message returned for duplicate');

  // Test 4.3: Pulang scan on same day succeeds
  const checkout1 = await recordPresensiSiswa(attendanceClient, {
    siswa: testStudent,
    status: 'pulang',
    sekolahId: 'tenant-school-a',
    tanggal: '2026-10-04',
    jam: '14:05:00',
    deviceId: 'scanner-kiosk-1'
  });
  assert(checkout1.success === true, 'Pulang scan succeeds on same day after datang');

  // Test 4.4: Duplicate Pulang within same day
  const checkoutDup = await recordPresensiSiswa(attendanceClient, {
    siswa: testStudent,
    status: 'pulang',
    sekolahId: 'tenant-school-a',
    tanggal: '2026-10-04',
    jam: '14:15:00',
    deviceId: 'scanner-kiosk-2'
  });
  assert(checkoutDup.success === false, 'Duplicate pulang is rejected');
  assert(checkoutDup.alreadyExists === true, 'Duplicate pulang flags alreadyExists: true');

  // Test 4.5: Missing sekolah_id returns immediate failure
  const badStudent = { ...testStudent, sekolah_id: '' };
  const checkinNoSchool = await recordPresensiSiswa(attendanceClient, {
    siswa: badStudent,
    status: 'datang',
    sekolahId: undefined
  });
  assert(checkinNoSchool.success === false, 'Missing sekolah_id correctly fails attendance registration');

  // Test 4.6: Simulated Postgres 23505 race condition (simultaneous insert)
  // Create client that skips pre-check but hits DB 23505
  const raceClient = {
    from: () => ({
      select: () => ({
        eq: function () { return this; },
        maybeSingle: async () => ({ data: null, error: null }) // Pre-check saw nothing due to race
      }),
      insert: () => ({
        select: () => ({
          single: async () => {
            const err: any = new Error('duplicate key value violates unique constraint');
            err.code = '23505';
            return { data: null, error: err };
          }
        })
      })
    })
  };
  const raceResult = await recordPresensiSiswa(raceClient, {
    siswa: testStudent,
    status: 'datang',
    sekolahId: 'tenant-school-a',
    tanggal: '2026-10-04'
  });
  assert(raceResult.success === false && raceResult.alreadyExists === true, 'Postgres 23505 race condition gracefully handled as alreadyExists');

  console.log(`\n====================================================`);
  console.log(`🎉 ALL ${passedTests}/${totalTests} ADVERSARIAL STRESS TESTS PASSED!`);
  console.log(`====================================================\n`);
}

runStressTests().catch(err => {
  console.error('Fatal Stress Test Error:', err);
  process.exit(1);
});
