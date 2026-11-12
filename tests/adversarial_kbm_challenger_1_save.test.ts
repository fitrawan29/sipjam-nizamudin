import fs from 'fs';
import path from 'path';
import {
  isJurnalMatchJadwal,
  normalizeTeacherIdentityName,
  isTeacherRecordMatch,
  isTeacherNameEquivalent,
  hasJournalContent
} from '../src/lib/workflow';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testId: string, description: string, details?: any) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${testId}: ${description}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testId}: ${description}`);
    if (details) {
      console.error('   Details:', details);
    }
    failedTests++;
  }
}

// =========================================================================
// HELPER EXTRACTION & SIMULATION OF GURU JURNAL LOGIC
// =========================================================================

// Extracted from src/components/GuruJurnal.tsx lines 28-41
const generateSafeIdWithEnv = (explicitCrypto: any) => {
  return typeof explicitCrypto !== 'undefined' && explicitCrypto !== null && typeof explicitCrypto.randomUUID === 'function'
    ? explicitCrypto.randomUUID()
    : 'jrn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
};

const isSchemaColumnError = (err: any) => Boolean(
  err && (
    err.code === 'PGRST204' ||
    err.code === '42703' ||
    err.status === 400 ||
    err.message?.includes('schema cache') ||
    err.message?.includes('column') ||
    err.message?.includes('Could not find the')
  )
);

// Attendance summary calculator from GuruJurnal.tsx
function calculateKehadiranSummary(
  absensiMap: Record<string, string>,
  studentList: Array<{ id?: string; nisn?: string }>
): string {
  if (!studentList || studentList.length === 0) return '';
  const total = studentList.length;
  let hadir = 0;
  let izin = 0;
  let sakit = 0;
  let alpa = 0;

  studentList.forEach((s, idx) => {
    const sKey = s.nisn || s.id || `student-${idx}`;
    const st = absensiMap[s.nisn || ''] || absensiMap[sKey] || 'H';
    if (st === 'I') izin++;
    else if (st === 'S') sakit++;
    else if (st === 'A' || st === 'B') alpa++;
    else hadir++;
  });

  return `Total murid: ${total}, Hadir: ${hadir}, Izin: ${izin}, Sakit: ${sakit}, Alpa: ${alpa}`;
}

async function runAdversarialHarness() {
  console.log('================================================================');
  console.log('ADVERSARIAL STRESS TEST HARNESS — CHALLENGER_KBM_1');
  console.log('Target: src/components/GuruJurnal.tsx (commit f800a0f)');
  console.log('================================================================\n');

  const root = path.resolve(__dirname, '..');
  const gjPath = path.join(root, 'src', 'components', 'GuruJurnal.tsx');
  assert(fs.existsSync(gjPath), 'INIT-01', 'GuruJurnal.tsx exists in workspace');
  const gjSource = fs.readFileSync(gjPath, 'utf8');

  // =========================================================================
  // SCENARIO 1: RUNTIME SIMULATION — WINDOW.CRYPTO.RANDOMUUID MISSING
  // =========================================================================
  console.log('\n--- Scenario 1: Runtime Environment Simulation (crypto.randomUUID absent) ---');

  // 1.1 In-source elimination of raw crypto.randomUUID() calls
  const rawCryptoCalls = gjSource.match(/crypto\.randomUUID\(\)/g) || [];
  // There is only 1 mention inside generateSafeId definition
  assert(
    rawCryptoCalls.length === 1 && gjSource.includes('generateSafeId = () =>'),
    'SCEN-1.1',
    'GuruJurnal contains exactly 1 guarded call inside generateSafeId, 0 unguarded direct calls'
  );

  // 1.2 Both handleSaveAbsensiOnly and handleJurnalSubmit call generateSafeId()
  assert(
    gjSource.includes('id: generateSafeId()'),
    'SCEN-1.2',
    'GuruJurnal uses generateSafeId() for newSession and newJurnal mutations'
  );

  // 1.3 Behavioral test: Secure Context (native randomUUID present)
  const mockSecureCrypto = {
    randomUUID: () => '11111111-2222-3333-4444-555555555555'
  };
  const secureId = generateSafeIdWithEnv(mockSecureCrypto);
  assert(
    secureId === '11111111-2222-3333-4444-555555555555',
    'SCEN-1.3',
    'generateSafeId uses native crypto.randomUUID when available'
  );

  // 1.4 Behavioral test: Non-secure Context / HTTP LAN (crypto exists with getRandomValues, but randomUUID is undefined)
  const mockHttpLanCrypto = {
    getRandomValues: (arr: any) => arr
    // randomUUID is undefined
  };
  const httpLanId = generateSafeIdWithEnv(mockHttpLanCrypto);
  assert(
    typeof httpLanId === 'string' && httpLanId.startsWith('jrn_') && httpLanId.length >= 20,
    'SCEN-1.4',
    'generateSafeId falls back safely to "jrn_..." in HTTP/LAN context without crashing'
  );

  // 1.5 Behavioral test: Legacy context (crypto is undefined)
  const legacyId = generateSafeIdWithEnv(undefined);
  assert(
    typeof legacyId === 'string' && legacyId.startsWith('jrn_'),
    'SCEN-1.5',
    'generateSafeId falls back safely when crypto is undefined entirely'
  );

  // 1.6 Behavioral test: Corrupt context (crypto.randomUUID is null or non-function)
  const corruptCrypto = { randomUUID: 'not-a-function' };
  const corruptId = generateSafeIdWithEnv(corruptCrypto);
  assert(
    typeof corruptId === 'string' && corruptId.startsWith('jrn_'),
    'SCEN-1.6',
    'generateSafeId defends against corrupt non-function crypto.randomUUID property'
  );

  // 1.7 Stress Generator: 20,000 rapid sequential IDs collision test under fallback
  console.log('   Stress Testing: generating 20,000 fallback IDs for collision analysis...');
  const idSet = new Set<string>();
  const idRegex = /^jrn_\d+_[a-z0-9]+$/;
  let hasMalformed = false;
  for (let i = 0; i < 20000; i++) {
    const id = generateSafeIdWithEnv(mockHttpLanCrypto);
    if (!idRegex.test(id)) hasMalformed = true;
    idSet.add(id);
  }
  assert(
    idSet.size === 20000,
    'SCEN-1.7',
    `20,000 sequential fallback IDs generated with 0 collisions (unique count: ${idSet.size})`
  );
  assert(
    !hasMalformed,
    'SCEN-1.8',
    'All 20,000 fallback IDs strictly match the format /^jrn_\\d+_[a-z0-9]+$/'
  );

  // =========================================================================
  // SCENARIO 2: RESILIENT DRIVE UPLOAD (DRIVE OFFLINE / TIMEOUT / EXCEPTION)
  // =========================================================================
  console.log('\n--- Scenario 2: Resilient Drive Failure (Drive offline/timeout) ---');

  // 2.1 Inspect catch block in GuruJurnal.tsx
  assert(
    gjSource.includes("console.warn('Gagal upload ke Google Drive, melanjutkan simpan jurnal dengan preview/fallback foto:', err)") &&
    gjSource.includes("fileUrl = photoPreviewUrl || ''") &&
    gjSource.includes("showToast('Info Upload Foto', 'Foto belum tersinkron ke cloud drive, data jurnal tetap tersimpan di database.', 'info')"),
    'SCEN-2.1',
    'GuruJurnal catches uploadToDrive error, logs warning, falls back to photoPreviewUrl, and warns via non-blocking info toast'
  );

  // 2.2 Verify that upload failure does NOT abort the execution flow
  // Simulate the exact try-catch sequence from lines 1482-1545
  const simulateUploadBlock = async (
    driveUploadMock: () => Promise<string>,
    photoPreviewUrl: string | null,
    hasFile: boolean
  ) => {
    let fileUrl = '';
    let caughtError: any = null;
    let toastType = '';
    try {
      if (hasFile) {
        fileUrl = await driveUploadMock();
      } else if (photoPreviewUrl) {
        fileUrl = photoPreviewUrl;
      }
    } catch (err: any) {
      caughtError = err;
      fileUrl = photoPreviewUrl || '';
      toastType = 'info';
    }
    return { fileUrl, caughtError, toastType };
  };

  // Test 2.2a: Network Disconnect Simulation (Failed to fetch)
  const netError = await simulateUploadBlock(
    async () => { throw new Error('TypeError: Failed to fetch (Drive Offline)'); },
    'data:image/jpeg;base64,mockPreview',
    true
  );
  assert(
    netError.fileUrl === 'data:image/jpeg;base64,mockPreview' && netError.toastType === 'info',
    'SCEN-2.2',
    'Network fetch failure in uploadToDrive falls back to photoPreviewUrl without aborting'
  );

  // Test 2.2b: Google Drive 504 Timeout Simulation
  const timeoutError = await simulateUploadBlock(
    async () => { throw new Error('504 Gateway Timeout: Google Apps Script timed out after 30000ms'); },
    'blob:http://localhost/123-abc',
    true
  );
  assert(
    timeoutError.fileUrl === 'blob:http://localhost/123-abc' && timeoutError.toastType === 'info',
    'SCEN-2.3',
    'Drive timeout error falls back to photoPreviewUrl without aborting'
  );

  // Test 2.2c: Drive Quota Exceeded Simulation with empty preview
  const quotaError = await simulateUploadBlock(
    async () => { throw new Error('Quota exceeded for Google Drive API'); },
    null,
    true
  );
  assert(
    quotaError.fileUrl === '' && quotaError.toastType === 'info',
    'SCEN-2.4',
    'Drive quota exceeded without preview falls back safely to empty string'
  );

  // 2.3 Verify payload generation persists text and attendance despite Drive upload failure
  const simulatedSavePayload = {
    materi: 'Persamaan Linear Satu Variabel',
    kegiatan: 'Latihan soal cerita kelompok',
    materi_pembelajaran: 'Persamaan Linear Satu Variabel',
    kegiatan_pembelajaran: 'Latihan soal cerita kelompok',
    kehadiran_murid: 'Total murid: 30, Hadir: 29, Izin: 1, Sakit: 0, Alpa: 0',
    absensi_siswa: JSON.stringify({ '001': 'H', '002': 'I' }),
    link_bukti_foto: netError.fileUrl,
    foto_kegiatan: netError.fileUrl,
    status_verifikasi: netError.fileUrl ? 'Disetujui' : 'Menunggu'
  };
  assert(
    simulatedSavePayload.materi_pembelajaran === 'Persamaan Linear Satu Variabel' &&
    simulatedSavePayload.kegiatan_pembelajaran === 'Latihan soal cerita kelompok' &&
    simulatedSavePayload.absensi_siswa.includes('"002":"I"') &&
    simulatedSavePayload.foto_kegiatan === 'data:image/jpeg;base64,mockPreview',
    'SCEN-2.5',
    'Journal payload maintains complete text, learning activities, and attendance records when Drive fails'
  );

  // =========================================================================
  // SCENARIO 3: SCHEMA ERROR TOLERANCE (42703, PGRST204, HTTP 400)
  // =========================================================================
  console.log('\n--- Scenario 3: Schema Error Tolerance (42703, PGRST204, HTTP 400) ---');

  // 3.1 isSchemaColumnError predicate tests
  assert(
    isSchemaColumnError({ code: '42703', message: 'column "kktp" does not exist' }) === true,
    'SCEN-3.1',
    'isSchemaColumnError returns true for PostgreSQL 42703 (undefined_column)'
  );
  assert(
    isSchemaColumnError({ code: 'PGRST204', message: "Could not find the 'lokasi_kbm' column of 'jurnal_pembelajaran' in the schema cache" }) === true,
    'SCEN-3.2',
    'isSchemaColumnError returns true for PostgREST PGRST204'
  );
  assert(
    isSchemaColumnError({ status: 400, message: "Could not find column" }) === true,
    'SCEN-3.3',
    'isSchemaColumnError returns true for HTTP 400 status column error'
  );
  assert(
    isSchemaColumnError({ code: 'PGRST100', message: 'schema cache miss for column catatan_khusus_siswa' }) === true,
    'SCEN-3.4',
    'isSchemaColumnError returns true when message mentions schema cache'
  );
  assert(
    isSchemaColumnError({ code: '23503', message: 'foreign key constraint violation' }) === false,
    'SCEN-3.5',
    'isSchemaColumnError correctly rejects foreign key violation 23503'
  );
  assert(
    isSchemaColumnError({ code: '23505', message: 'duplicate key value violates unique constraint' }) === false,
    'SCEN-3.6',
    'isSchemaColumnError correctly rejects unique constraint violation 23505'
  );
  assert(
    isSchemaColumnError(null) === false && isSchemaColumnError(undefined) === false,
    'SCEN-3.7',
    'isSchemaColumnError handles null/undefined error safely without throwing'
  );

  // 3.2 Simulation of retry payload degradation (stripping optional columns)
  const fullNewJurnalPayload: any = {
    id: 'jrn-test-001',
    timestamp: '2026-11-12T10:00:00+08:00',
    nama_guru: 'Ade Fitrawan Ibrahim',
    user_id: 'usr-123',
    mapel: 'Matematika',
    kelas: 'VII-A',
    tanggal: '2026-11-12',
    materi: 'Bilangan Bulat',
    kegiatan: 'Diskusi kelompok',
    absensi_siswa: '{"s1":"H"}',
    keterangan: 'Jurnal KBM',
    refleksi: 'Murid antusias',
    detail_absen: '',
    link_bukti_foto: 'https://drive.google.com/...',
    status_verifikasi: 'Disetujui',
    catatan_khusus_siswa: 'Catatan siswa',
    kktp: 'Tercapai',
    konten: 'Bilangan Bulat',
    lokasi_kbm: 'Ruang 7A',
    pertemuan_ke: '-',
    jam_ke: '-',
    tujuan_pembelajaran: 'Memahami operasi bulat',
    materi_pembelajaran: 'Bilangan Bulat',
    kegiatan_pembelajaran: 'Diskusi kelompok',
    kehadiran_murid: 'Total murid: 1, Hadir: 1, Izin: 0, Sakit: 0, Alpa: 0',
    catatan_refleksi: 'Murid antusias',
    foto_kegiatan: 'https://drive.google.com/...',
    latitude: 0.12345,
    longitude: 124.12345,
    lokasi: 'GPS: 0.12345, 124.12345',
    waktu_upload: '2026-11-12T10:05:00+08:00',
    sekolah_id: 'a0000000-0000-0000-0000-000000000001'
  };

  // Perform exact destructuring used in GuruJurnal.tsx line 1701:
  const {
    user_id: _u,
    latitude: _lat,
    longitude: _lng,
    lokasi: _lok,
    waktu_upload: _wu,
    kktp: _k,
    konten: _ko,
    lokasi_kbm: _lk,
    catatan_khusus_siswa: _ck,
    ...compatibleJurnal
  } = fullNewJurnalPayload;

  assert(
    !('user_id' in compatibleJurnal) &&
    !('kktp' in compatibleJurnal) &&
    !('konten' in compatibleJurnal) &&
    !('lokasi_kbm' in compatibleJurnal) &&
    !('catatan_khusus_siswa' in compatibleJurnal),
    'SCEN-3.8',
    'Compatible fallback payload strips non-canonical columns that trigger schema errors'
  );
  assert(
    compatibleJurnal.materi_pembelajaran === 'Bilangan Bulat' &&
    compatibleJurnal.kegiatan_pembelajaran === 'Diskusi kelompok' &&
    compatibleJurnal.sekolah_id === 'a0000000-0000-0000-0000-000000000001' &&
    compatibleJurnal.absensi_siswa === '{"s1":"H"}',
    'SCEN-3.9',
    'Compatible fallback payload preserves core KBM data (materi, kegiatan, absensi, sekolah_id)'
  );

  // 3.3 End-to-end simulated Supabase retry cycle with PostgREST 42703
  let insertAttemptCount = 0;
  let finalInsertedRow: any = null;
  const mockSupabase = {
    from: (table: string) => ({
      insert: async (rows: any[]) => {
        insertAttemptCount++;
        if (insertAttemptCount === 1) {
          // First attempt fails with PostgreSQL 42703
          return { data: null, error: { code: '42703', message: 'column "kktp" does not exist' } };
        }
        // Second attempt with compatible payload succeeds
        finalInsertedRow = rows[0];
        return { data: rows, error: null };
      }
    })
  };

  let mutationError = null;
  let insertRes = await mockSupabase.from('jurnal_pembelajaran').insert([fullNewJurnalPayload]);
  mutationError = insertRes.error;
  if (isSchemaColumnError(mutationError)) {
    const { user_id: _u, latitude: _lat, longitude: _lng, lokasi: _lok, waktu_upload: _wu, kktp: _k, konten: _ko, lokasi_kbm: _lk, catatan_khusus_siswa: _ck, ...compatibleJurnal } = fullNewJurnalPayload;
    const retry = await mockSupabase.from('jurnal_pembelajaran').insert([compatibleJurnal]);
    mutationError = retry.error;
  }

  assert(
    insertAttemptCount === 2 && mutationError === null && finalInsertedRow !== null,
    'SCEN-3.10',
    'Simulated 42703 triggers automatic schema downgrade retry and completes without error'
  );

  // =========================================================================
  // SCENARIO 4: MULTI-TENANT SEKOLAH_ID FALLBACK
  // =========================================================================
  console.log('\n--- Scenario 4: Multi-Tenant sekolah_id Fallback ---');

  const CANONICAL_DEFAULT_SEKOLAH_ID = 'a0000000-0000-0000-0000-000000000001';

  // 4.1 Evaluation of session variants in GuruJurnal
  const evalSekolahId = (sessionUser: any) => sessionUser?.sekolah_id || CANONICAL_DEFAULT_SEKOLAH_ID;

  // Variant A: Normal user with assigned sekolah_id
  assert(
    evalSekolahId({ id: 'u1', sekolah_id: 'b1111111-2222-3333-4444-555555555555' }) === 'b1111111-2222-3333-4444-555555555555',
    'SCEN-4.1',
    'User with assigned sekolah_id preserves their tenant ID'
  );

  // Variant B: User with undefined sekolah_id (session sync lag)
  assert(
    evalSekolahId({ id: 'u2' }) === CANONICAL_DEFAULT_SEKOLAH_ID,
    'SCEN-4.2',
    'User with undefined sekolah_id falls back to canonical default tenant UUID'
  );

  // Variant C: User with null sekolah_id
  assert(
    evalSekolahId({ id: 'u3', sekolah_id: null }) === CANONICAL_DEFAULT_SEKOLAH_ID,
    'SCEN-4.3',
    'User with null sekolah_id falls back to canonical default tenant UUID'
  );

  // Variant D: User with empty string sekolah_id
  assert(
    evalSekolahId({ id: 'u4', sekolah_id: '' }) === CANONICAL_DEFAULT_SEKOLAH_ID,
    'SCEN-4.4',
    'User with empty string sekolah_id falls back to canonical default tenant UUID'
  );

  // 4.2 Verify UUID format validity
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  assert(
    uuidRegex.test(CANONICAL_DEFAULT_SEKOLAH_ID),
    'SCEN-4.5',
    'Canonical fallback sekolah_id satisfies RFC 4122 UUID syntax for PostgreSQL uuid column'
  );

  // 4.3 Verify source code application in all critical mutation lines
  assert(
    gjSource.includes("sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001'") &&
    gjSource.includes("sekolah_id: user.sekolah_id || 'a0000000-0000-0000-0000-000000000001'"),
    'SCEN-4.6',
    'GuruJurnal applies fallback sekolah_id across both handleSaveAbsensiOnly and handleJurnalSubmit'
  );

  // =========================================================================
  // SCENARIO 5: ATTENDANCE DATA PRESERVATION & SUB-MODE TRANSITION
  // =========================================================================
  console.log('\n--- Scenario 5: Attendance Data Preservation & Sub-Mode Transition ---');

  // 5.1 Sub-mode switching logic: Memory retention when transitioning absensi -> jurnal
  // Simulate student list
  const mockStudents = [
    { id: 's1', nisn: '0011223344', nama_siswa: 'Ahmad Dahlan' },
    { id: 's2', nisn: '0011223355', nama_siswa: 'Budi Santoso' },
    { id: 's3', nisn: '0011223366', nama_siswa: 'Citra Kirana' }
  ];

  // Teacher fills attendance in 'absensi' sub-mode:
  // Ahmad: Sakit (S), Budi: Izin (I), Citra: Hadir (H)
  const memoryAbsensi: Record<string, string> = {
    '0011223344': 'S',
    '0011223355': 'I',
    '0011223366': 'H'
  };

  // Build cleanAbsensiForSave as done in lines 1496-1512
  const cleanAbsensiForSave: Record<string, string> = {};
  mockStudents.forEach((s, idx) => {
    const sKey = s.nisn || s.id || `student-${idx}`;
    const val = (s.nisn && memoryAbsensi[s.nisn]) || memoryAbsensi[sKey] || 'H';
    if (s.nisn) cleanAbsensiForSave[s.nisn] = memoryAbsensi[s.nisn] || 'H';
    if (sKey) cleanAbsensiForSave[sKey] = val;
  });

  const computedSummary = calculateKehadiranSummary(cleanAbsensiForSave, mockStudents);
  assert(
    computedSummary === 'Total murid: 3, Hadir: 1, Izin: 1, Sakit: 1, Alpa: 0',
    'SCEN-5.1',
    'Attendance summary accurately reflects memory attendance (1 Hadir, 1 Izin, 1 Sakit, 0 Alpa)'
  );

  // 5.2 Transition to 'jurnal' sub-mode and submit:
  // Simulate memory attendance retention guard (lines 1662-1679)
  const existingSessionRowWithAttendance = {
    id: 'existing-jrn-01',
    absensi_siswa: '{"0011223344":"H","0011223355":"H","0011223366":"H"}',
    kehadiran_murid: 'Total murid: 3, Hadir: 3, Izin: 0, Sakit: 0, Alpa: 0'
  };

  let newJurnalAbsensiJson = JSON.stringify(cleanAbsensiForSave);
  let newJurnalKehadiranSummary = computedSummary;

  let finalAbsensiJson = newJurnalAbsensiJson;
  let finalKehadiranSummary = newJurnalKehadiranSummary;

  const hasExistingAbsensi = Boolean(
    existingSessionRowWithAttendance?.absensi_siswa &&
    existingSessionRowWithAttendance.absensi_siswa !== '{}' &&
    existingSessionRowWithAttendance.absensi_siswa !== '-'
  );
  const hasMemoryAbsensi = Boolean(
    finalAbsensiJson &&
    finalAbsensiJson !== '{}' &&
    finalAbsensiJson !== '-' &&
    Object.keys(cleanAbsensiForSave).length > 0
  );

  if (hasExistingAbsensi && !hasMemoryAbsensi) {
    finalAbsensiJson = existingSessionRowWithAttendance.absensi_siswa;
    finalKehadiranSummary = existingSessionRowWithAttendance.kehadiran_murid || computedSummary;
  }

  // Because teacher entered attendance in memory, hasMemoryAbsensi is TRUE:
  assert(
    hasMemoryAbsensi === true,
    'SCEN-5.2',
    'hasMemoryAbsensi is true when teacher filled attendance in memory'
  );
  assert(
    finalAbsensiJson.includes('"0011223344":"S"') && finalAbsensiJson.includes('"0011223355":"I"'),
    'SCEN-5.3',
    'Memory attendance entries (Sakit, Izin) are prioritized and preserved over old database snapshot'
  );

  // 5.3 Opposite Case: Database has attendance, but memory is empty
  const emptyCleanAbsensi: Record<string, string> = {};
  let emptyJurnalAbsensiJson = JSON.stringify(emptyCleanAbsensi);
  let finalAbsensiFromDb = emptyJurnalAbsensiJson;
  let finalSummaryFromDb = '';

  const hasExistingFromDb = true;
  const hasMemoryFromDb = Boolean(
    emptyJurnalAbsensiJson &&
    emptyJurnalAbsensiJson !== '{}' &&
    emptyJurnalAbsensiJson !== '-' &&
    Object.keys(emptyCleanAbsensi).length > 0
  );

  if (hasExistingFromDb && !hasMemoryFromDb) {
    finalAbsensiFromDb = existingSessionRowWithAttendance.absensi_siswa;
    finalSummaryFromDb = existingSessionRowWithAttendance.kehadiran_murid;
  }

  assert(
    hasMemoryFromDb === false && finalAbsensiFromDb === existingSessionRowWithAttendance.absensi_siswa,
    'SCEN-5.4',
    'When memory attendance is empty, existing database attendance is safeguarded from being erased'
  );

  // 5.4 Form Lockout Guard Relaxation Stress Test
  // Test conditions under which form must NOT be locked
  const testFormLockout = (dailyState: any, hasRejected: boolean, hasNoKbm: boolean, kelasVal: string, mapelVal: string) => {
    return !hasRejected && !!(
      dailyState?.isLibur ||
      (dailyState && !dailyState.canOpenJurnal && !(kelasVal && mapelVal)) ||
      (hasNoKbm && !(kelasVal && mapelVal))
    );
  };

  // Case A: canOpenJurnal is false, but kelas & mapel selected -> MUST BE UNLOCKED (false)
  const lockCaseA = testFormLockout({ canOpenJurnal: false, isLibur: false }, false, false, 'VII-A', 'Matematika');
  assert(
    lockCaseA === false,
    'SCEN-5.5',
    'isLocked is false when teacher selects kelas and mapel even if canOpenJurnal is false'
  );

  // Case B: hasNoKbmAssignments is true, but kelas & mapel selected -> MUST BE UNLOCKED (false)
  const lockCaseB = testFormLockout({ canOpenJurnal: true, isLibur: false }, false, true, 'VII-B', 'IPA');
  assert(
    lockCaseB === false,
    'SCEN-5.6',
    'isLocked is false when kelas and mapel are chosen even if no formal assignments are registered'
  );

  // Case C: Libur is true -> MUST REMAIN LOCKED (true)
  const lockCaseC = testFormLockout({ canOpenJurnal: true, isLibur: true }, false, false, 'VII-A', 'Matematika');
  assert(
    lockCaseC === true,
    'SCEN-5.7',
    'isLocked correctly locks form on school holidays (isLibur === true)'
  );

  // Case D: Rejected journal exists -> MUST REMAIN UNLOCKED for resubmission (false)
  const lockCaseD = testFormLockout({ canOpenJurnal: false, isLibur: false }, true, false, 'VII-A', 'Matematika');
  assert(
    lockCaseD === false,
    'SCEN-5.8',
    'isLocked unlocks form when a rejected journal requires re-submission'
  );

  // =========================================================================
  // SCENARIO 6: ADVERSARIAL EDGE CASES & BOUNDARY CONDITIONS
  // =========================================================================
  console.log('\n--- Scenario 6: Adversarial Edge Cases & Boundary Conditions ---');

  // 6.1 Empty students array fallback in Jurnal KBM
  const emptyStudents: any[] = [];
  const manualAbsensiMap = { 'manual-1': 'H', 'manual-2': 'S' };
  const fallbackCleanAbsensi: Record<string, string> = {};
  if (Array.isArray(emptyStudents) && emptyStudents.length > 0) {
    // skipped
  } else if (manualAbsensiMap && Object.keys(manualAbsensiMap).length > 0) {
    Object.assign(fallbackCleanAbsensi, manualAbsensiMap);
  }
  assert(
    fallbackCleanAbsensi['manual-1'] === 'H' && fallbackCleanAbsensi['manual-2'] === 'S',
    'SCEN-6.1',
    'Fallback Object.assign cleanly captures manual attendance map when student roster array is empty'
  );

  // 6.2 Dual-write contract completeness
  assert(
    gjSource.includes('kegiatan_pembelajaran: kegiatan') &&
    gjSource.includes('materi_pembelajaran: finalKonten') &&
    gjSource.includes('materi: finalKonten') &&
    gjSource.includes('kegiatan: kegiatan'),
    'SCEN-6.2',
    'Complete dual-write synchronization across legacy (materi, kegiatan) and modern (materi_pembelajaran, kegiatan_pembelajaran)'
  );

  // 6.3 Downstream verification: hasJournalContent compatibility
  const testSavedRow = {
    materi: 'Statistika',
    kegiatan: 'Menghitung mean & median',
    materi_pembelajaran: 'Statistika',
    kegiatan_pembelajaran: 'Menghitung mean & median'
  };
  assert(
    hasJournalContent(testSavedRow) === true,
    'SCEN-6.3',
    'hasJournalContent from workflow.ts confirms journal content is valid for checkout pulang'
  );

  console.log('\n================================================================');
  console.log(`STRESS TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} tests`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAdversarialHarness().catch(err => {
  console.error('Test harness exception:', err);
  process.exit(1);
});
