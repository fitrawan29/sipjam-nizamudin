/**
 * Test Suite: Student QR Code & Presensi Siswa Mechanism
 * Validates:
 * 1. QR code SVG and Data URL generation for NISN & UUID identifiers.
 * 2. QR code matrix construction and error correction codewords.
 * 3. Identifier resolution: matching by qr_code, nisn, and uuid with tenant isolation.
 * 4. Presensi recording: datang and pulang recording, duplicate prevention, and race condition handling.
 * 5. Summary and classroom attendance queries.
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
  getRecentPresensiSiswa,
  getLocalTodayDate,
  getLocalCurrentTime
} from '../src/lib/qrSiswa';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTests() {
  console.log('--- Testing QR Generation & Attendance Logic ---');

  // 1. getStudentQrIdentifier
  const student1 = { id: 'uuid-1', nisn: '114367407', qr_code: '114367407' };
  assert(getStudentQrIdentifier(student1) === '114367407', 'getStudentQrIdentifier prefers qr_code when present');

  const student2 = { id: 'uuid-2', nisn: '011588409', qr_code: null };
  assert(getStudentQrIdentifier(student2) === '011588409', 'getStudentQrIdentifier falls back to nisn when qr_code is null');

  const student3 = { id: 'uuid-3', nisn: '', qr_code: '' };
  assert(getStudentQrIdentifier(student3) === 'uuid-3', 'getStudentQrIdentifier falls back to id when nisn & qr_code empty');

  // 2. generateQrMatrix
  const matrixNisn = generateQrMatrix('114367407');
  assert(Array.isArray(matrixNisn) && matrixNisn.length === 21, 'NISN matrix is 21x21 (Version 1)');
  assert(matrixNisn[0][0] === true && matrixNisn[0][6] === true, 'Top-left finder pattern corner is dark');

  // 2b. ISO/IEC 18004 Format Bits Encoding Verification (Level L, Mask 0: 0x77c4)
  const formatCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  let recoveredBits = 0;
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatCoords[i];
    if (matrixNisn[r][c]) {
      recoveredBits |= (1 << i);
    }
  }
  assert(recoveredBits === 0x77c4, `Format bits around top-left finder match ISO/IEC 18004 Level L Mask 0 (0x77c4, got 0x${recoveredBits.toString(16)})`);

  // Unmask with 0x5412 (101010000010010) to verify BCH error correction & Level L Mask 0 payload
  const unmaskedFormat = recoveredBits ^ 0x5412;
  const formatPayload = unmaskedFormat >> 10;
  // Level L = 01 (1), Mask 0 = 000 (0) -> 01000 binary = 8
  assert(formatPayload === 0b01000, `Unmasked format information payload matches Level L + Mask 0 (0b01000, got 0b${formatPayload.toString(2).padStart(5, '0')})`);

  // Verify secondary format information copy (bottom-left and top-right)
  let recoveredCopy = 0;
  const size = matrixNisn.length;
  for (let i = 0; i < 15; i++) {
    let r: number, c: number;
    if (i < 8) {
      r = size - 1 - i;
      c = 8;
    } else {
      r = 8;
      c = size - 15 + i;
    }
    if (matrixNisn[r][c]) {
      recoveredCopy |= (1 << i);
    }
  }
  assert(recoveredCopy === 0x77c4, `Secondary format bits (bottom-left/top-right) match 0x77c4`);

  const matrixUuid = generateQrMatrix('680584c6-0e5a-48c6-8a5c-d63515be6354');
  assert(Array.isArray(matrixUuid) && matrixUuid.length === 29, 'UUID matrix is 29x29 (Version 3)');

  // 3. generateStudentQrSvg
  const svg = generateStudentQrSvg('114367407', { size: 200, fgColor: '#0B4619' });
  assert(svg.includes('<svg') && svg.includes('</svg>'), 'generateStudentQrSvg returns valid SVG tag structure');
  assert(svg.includes('width="200"') && svg.includes('height="200"'), 'generateStudentQrSvg respects custom size');
  assert(svg.includes('fill="#0B4619"'), 'generateStudentQrSvg applies SIPJAM theme color');

  // 4. generateStudentQrDataUrl
  const dataUrl = generateStudentQrDataUrl('114367407');
  assert(dataUrl.startsWith('data:image/svg+xml;base64,'), 'generateStudentQrDataUrl returns base64 SVG data URL');

  // 5. Date & Time helpers
  const today = getLocalTodayDate();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(today), `getLocalTodayDate produces YYYY-MM-DD format (${today})`);
  const nowTime = getLocalCurrentTime();
  assert(/^\d{2}:\d{2}:\d{2}$/.test(nowTime), `getLocalCurrentTime produces HH:mm:ss format (${nowTime})`);

  // 6. Mock Supabase Client for resolution & attendance testing
  const mockStudents = [
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      nisn: '114367407',
      nama_siswa: 'Moh. Candra Podomi',
      kelas: 'X Merdeka',
      sekolah_id: 'school-a',
      qr_code: '114367407'
    },
    {
      id: 'b2222222-2222-2222-2222-222222222222',
      nisn: '011588409',
      nama_siswa: 'Revani Arvandi Rusli',
      kelas: 'XI-1',
      sekolah_id: 'school-b',
      qr_code: 'b2222222-2222-2222-2222-222222222222'
    }
  ];

  const mockPresensiRecords: any[] = [];

  const createMockSupabase = () => ({
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
              const found = mockStudents.find(s => {
                return filters.every(f => {
                  if (f.type === 'eq') return (s as any)[f.col] === f.val;
                  if (f.type === 'ilike') return String((s as any)[f.col]).toLowerCase() === String(f.val).toLowerCase();
                  return true;
                });
              });
              return { data: found || null, error: null };
            },
            single: async () => {
              const found = mockStudents.find(s => {
                return filters.every(f => (s as any)[f.col] === f.val);
              });
              return { data: found || null, error: found ? null : new Error('Not found') };
            }
          }),
          update: (payload: any) => ({
            eq: async (col: string, val: any) => {
              const s = mockStudents.find(st => (st as any)[col] === val);
              if (s) Object.assign(s, payload);
              return { data: s || null, error: null };
            }
          })
        };
      }

      if (table === 'presensi_siswa') {
        let filters: Array<{ col: string; val: any }> = [];
        let limitCount = 100;
        return {
          select: () => ({
            eq: function (col: string, val: any) {
              filters.push({ col, val });
              return this;
            },
            order: function () {
              return this;
            },
            limit: function (lim: number) {
              limitCount = lim;
              return this;
            },
            maybeSingle: async () => {
              const match = mockPresensiRecords.find(r =>
                filters.every(f => r[f.col] === f.val)
              );
              return { data: match || null, error: null };
            },
            then: (resolve: any) => {
              const matches = mockPresensiRecords.filter(r =>
                filters.every(f => r[f.col] === f.val)
              ).slice(0, limitCount);
              resolve({ data: matches, error: null });
            }
          }),
          insert: (record: any) => ({
            select: () => ({
              single: async () => {
                const isConflict = mockPresensiRecords.some(
                  r => r.sekolah_id === record.sekolah_id &&
                       r.tanggal === record.tanggal &&
                       r.siswa_id === record.siswa_id &&
                       r.status === record.status
                );
                if (isConflict) {
                  const err: any = new Error('duplicate key value violates unique constraint');
                  err.code = '23505';
                  return { data: null, error: err };
                }
                const inserted = { ...record, id: 'presensi-' + (mockPresensiRecords.length + 1) };
                mockPresensiRecords.push(inserted);
                return { data: inserted, error: null };
              }
            })
          })
        };
      }

      throw new Error(`Unhandled mock table: ${table}`);
    }
  });

  const mockClient = createMockSupabase();

  // 7. resolveStudentByCode: qr_code match
  const res1 = await resolveStudentByCode(mockClient, '114367407', 'school-a');
  assert(res1.data !== null && res1.data.nama_siswa === 'Moh. Candra Podomi', 'resolveStudentByCode resolves student by qr_code');

  // 8. resolveStudentByCode: tenant isolation
  const resTenantMismatch = await resolveStudentByCode(mockClient, '114367407', 'school-other');
  assert(resTenantMismatch.data === null, 'resolveStudentByCode enforces sekolah_id tenant isolation');

  // 9. resolveStudentByCode: uuid match
  const resUuid = await resolveStudentByCode(mockClient, 'b2222222-2222-2222-2222-222222222222', 'school-b');
  assert(resUuid.data !== null && resUuid.data.nama_siswa === 'Revani Arvandi Rusli', 'resolveStudentByCode resolves student by UUID');

  // 10. resolveStudentByCode: empty input
  const resEmpty = await resolveStudentByCode(mockClient, '   ');
  assert(resEmpty.data === null && resEmpty.error !== null, 'resolveStudentByCode returns error on empty input');

  // 10b. resolveStudentByCode: wildcard sanitization (% and _)
  const resWildcardPercent = await resolveStudentByCode(mockClient, '%', 'school-a');
  assert(resWildcardPercent.data === null, 'resolveStudentByCode rejects pure % wildcard query');

  const resWildcardUnderscore = await resolveStudentByCode(mockClient, '___', 'school-a');
  assert(resWildcardUnderscore.data === null, 'resolveStudentByCode rejects pure _ wildcard query');

  const resWildcardPattern = await resolveStudentByCode(mockClient, '1143%407', 'school-a');
  assert(resWildcardPattern.data === null, 'resolveStudentByCode neutralizes embedded % wildcard pattern');

  // 11. recordPresensiSiswa: datang recording
  const presensiDatang1 = await recordPresensiSiswa(mockClient, {
    siswa: mockStudents[0],
    status: 'datang',
    sekolahId: 'school-a',
    tanggal: '2026-10-04',
    jam: '06:45:00',
    deviceId: 'kiosk-gerbang-1'
  });
  assert(presensiDatang1.success === true, 'recordPresensiSiswa successfully records datang attendance');
  assert(presensiDatang1.alreadyExists === false, 'recordPresensiSiswa flags new attendance as alreadyExists: false');

  // 12. recordPresensiSiswa: duplicate datang rejection
  const duplicateDatang = await recordPresensiSiswa(mockClient, {
    siswa: mockStudents[0],
    status: 'datang',
    sekolahId: 'school-a',
    tanggal: '2026-10-04',
    jam: '06:50:00'
  });
  assert(duplicateDatang.success === false, 'recordPresensiSiswa rejects duplicate datang on same day');
  assert(duplicateDatang.alreadyExists === true, 'recordPresensiSiswa flags duplicate as alreadyExists: true');
  assert(duplicateDatang.message.includes('sudah tercatat'), 'recordPresensiSiswa returns friendly duplicate message');

  // 13. recordPresensiSiswa: pulang recording on same day
  const presensiPulang1 = await recordPresensiSiswa(mockClient, {
    siswa: mockStudents[0],
    status: 'pulang',
    sekolahId: 'school-a',
    tanggal: '2026-10-04',
    jam: '14:05:00',
    deviceId: 'kiosk-gerbang-1'
  });
  assert(presensiPulang1.success === true, 'recordPresensiSiswa allows pulang recording on same day after datang');

  // 14. recordPresensiSiswa: duplicate pulang rejection
  const duplicatePulang = await recordPresensiSiswa(mockClient, {
    siswa: mockStudents[0],
    status: 'pulang',
    sekolahId: 'school-a',
    tanggal: '2026-10-04',
    jam: '14:10:00'
  });
  assert(duplicatePulang.success === false && duplicatePulang.alreadyExists === true, 'recordPresensiSiswa rejects duplicate pulang on same day');

  // 15. Reporting Helpers
  const summary = await getTodayPresensiSummary(mockClient, 'school-a', '2026-10-04');
  assert(summary.totalDatang === 1, 'getTodayPresensiSummary counts total datang correctly');
  assert(summary.totalPulang === 1, 'getTodayPresensiSummary counts total pulang correctly');
  assert(summary.totalUnik === 1, 'getTodayPresensiSummary counts unique students correctly');

  const kelasRecords = await getPresensiSiswaByKelas(mockClient, 'school-a', 'X Merdeka', '2026-10-04');
  assert(kelasRecords.length === 2, 'getPresensiSiswaByKelas fetches all records for class');

  const recent = await getRecentPresensiSiswa(mockClient, 'school-a', '2026-10-04');
  assert(recent.length === 2, 'getRecentPresensiSiswa retrieves today live feed records');

  // 16. ensureStudentQrCode
  const ensureRes = await ensureStudentQrCode(mockClient, 'a1111111-1111-1111-1111-111111111111');
  assert(ensureRes.qr_code === '114367407', 'ensureStudentQrCode preserves existing qr_code');

  console.log(`\nAll ${passedTests}/${totalTests} tests passed successfully!`);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
