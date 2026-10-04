/**
 * Adversarial Challenger 2 Test Suite:
 * Empirical Verification of Attendance Flow and Downstream Simulation:
 * 1. recordPresensiSiswa with deviceId: 'manual'
 * 2. Duplicate prevention (soft check and Postgres 23505 race condition handling)
 * 3. Downstream ingestion by GuruJurnal.tsx (arrival query status='datang')
 * 4. Downstream ingestion by RekapSiswaView.tsx (gate attendance query and badges)
 * 5. Strict multi-tenant isolation across sekolah_id
 * 6. Live Supabase database integration test and rollback
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  recordPresensiSiswa,
  getLocalTodayDate,
  getLocalCurrentTime,
  StudentReference
} from '../src/lib/qrSiswa';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('================================================================');
console.log('CHALLENGER 2: EMPIRICAL ATTENDANCE FLOW & DOWNSTREAM SIMULATION');
console.log('================================================================\n');

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
    console.error(`  ✗ FAIL: ${testName}`);
    if (detail) console.error(`    Detail: ${detail}`);
    throw new Error(`Test failed: ${testName} - ${detail || ''}`);
  }
}

// ============================================================================
// PART 1: MOCK HARNESS WITH ADVERSARIAL STRESS TESTING
// ============================================================================

interface MockRecord {
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

function createAdversarialMockClient(options: { simulateDb23505RaceCondition?: boolean } = {}) {
  const store: MockRecord[] = [];

  const mockClient = {
    _store: store,
    from: (table: string) => {
      if (table !== 'presensi_siswa') {
        throw new Error(`Mock table ${table} not implemented in test harness`);
      }

      let filters: Array<{ col: string; val: any }> = [];

      return {
        select: (cols: string = '*') => ({
          eq: function (col: string, val: any) {
            filters.push({ col, val });
            return this;
          },
          order: function () {
            return this;
          },
          maybeSingle: async () => {
            // If race condition simulation is enabled, pretend record was NOT found on check
            if (options.simulateDb23505RaceCondition) {
              return { data: null, error: null };
            }
            const match = store.find(r => filters.every(f => (r as any)[f.col] === f.val));
            return { data: match ? { ...match } : null, error: null };
          },
          then: (resolve: any) => {
            const matches = store.filter(r => filters.every(f => (r as any)[f.col] === f.val));
            resolve({ data: matches.map(m => ({ ...m })), error: null });
          }
        }),

        insert: (payload: any) => ({
          select: () => ({
            single: async () => {
              // Simulate Postgres unique constraint: uq_presensi_siswa_status (sekolah_id, tanggal, siswa_id, status)
              const conflict = store.find(
                r =>
                  r.sekolah_id === payload.sekolah_id &&
                  r.tanggal === payload.tanggal &&
                  r.siswa_id === payload.siswa_id &&
                  r.status === payload.status
              );

              if (conflict || options.simulateDb23505RaceCondition) {
                const err: any = new Error(
                  `duplicate key value violates unique constraint "uq_presensi_siswa_status"`
                );
                err.code = '23505';
                return { data: null, error: err };
              }

              const newRow: MockRecord = {
                id: `mock-uuid-${store.length + 1}`,
                sekolah_id: payload.sekolah_id,
                siswa_id: payload.siswa_id,
                nisn: payload.nisn ?? null,
                nama_siswa: payload.nama_siswa,
                kelas: payload.kelas,
                tanggal: payload.tanggal,
                status: payload.status,
                jam: payload.jam,
                timestamp: payload.timestamp || new Date().toISOString(),
                device_id: payload.device_id
              };
              store.push(newRow);
              return { data: { ...newRow }, error: null };
            }
          })
        })
      };
    }
  };

  return mockClient;
}

async function runMockSuite() {
  console.log('--- 1. Testing recordPresensiSiswa with deviceId: "manual" ---');

  const client = createAdversarialMockClient();
  const testStudent1: StudentReference = {
    id: 's-001',
    nisn: '99001122',
    nama_siswa: 'Budi Santoso',
    kelas: 'X-1',
    sekolah_id: 'school-a'
  };

  // 1.1 First datang mark via manual mode
  const resDatang = await recordPresensiSiswa(client as any, {
    siswa: testStudent1,
    status: 'datang',
    sekolahId: 'school-a',
    deviceId: 'manual',
    tanggal: '2026-10-04',
    jam: '06:45:00'
  });

  assert(resDatang.success === true, 'Manual Datang succeeds on first attempt');
  assert(resDatang.alreadyExists === false, 'alreadyExists is false on initial entry');
  assert(resDatang.data !== null && resDatang.data !== undefined, 'Returned record payload is defined');
  assert(resDatang.data.device_id === 'manual', 'Returned record device_id is explicitly "manual"');
  assert(resDatang.data.sekolah_id === 'school-a', 'Returned record sekolah_id matches school-a');
  assert(resDatang.data.siswa_id === 's-001', 'Returned record siswa_id matches s-001');
  assert(resDatang.data.status === 'datang', 'Returned record status is "datang"');
  assert(resDatang.data.tanggal === '2026-10-04', 'Returned record tanggal matches 2026-10-04');
  assert(resDatang.data.jam === '06:45:00', 'Returned record jam matches 06:45:00');
  assert(resDatang.data.nisn === '99001122', 'Returned record nisn matches student nisn');
  assert(resDatang.data.nama_siswa === 'Budi Santoso', 'Returned record nama_siswa matches');
  assert(resDatang.data.kelas === 'X-1', 'Returned record kelas matches');

  // 1.2 Duplicate datang attempt (Soft check via SELECT)
  console.log('\n--- 2. Testing Duplicate Prevention (Soft Check) ---');
  const resDupDatang = await recordPresensiSiswa(client as any, {
    siswa: testStudent1,
    status: 'datang',
    sekolahId: 'school-a',
    deviceId: 'manual',
    tanggal: '2026-10-04',
    jam: '06:50:00'
  });

  assert(resDupDatang.success === false, 'Duplicate Datang returns success = false');
  assert(resDupDatang.alreadyExists === true, 'Duplicate Datang flags alreadyExists = true');
  assert(client._store.length === 1, 'Duplicate Datang does NOT insert a second row');
  assert(
    resDupDatang.message.includes('sudah tercatat presensi datang hari ini'),
    'Duplicate Datang message indicates student already marked'
  );

  // 1.3 Race condition duplicate handling (Postgres 23505)
  console.log('\n--- 3. Testing Race Condition / PostgreSQL Error 23505 Handling ---');
  const raceClient = createAdversarialMockClient({ simulateDb23505RaceCondition: true });
  const resRace = await recordPresensiSiswa(raceClient as any, {
    siswa: testStudent1,
    status: 'datang',
    sekolahId: 'school-a',
    deviceId: 'manual',
    tanggal: '2026-10-04',
    jam: '06:46:00'
  });

  assert(resRace.success === false, 'Race condition 23505 returns success = false');
  assert(resRace.alreadyExists === true, 'Race condition 23505 flags alreadyExists = true');
  assert(resRace.error?.code === '23505', 'Race condition error code 23505 is preserved in response');
  assert(
    resRace.message.includes('sudah tercatat presensi datang hari ini'),
    'Race condition 23505 returns friendly user message without crash'
  );

  // 1.4 Mark Pulang via manual mode
  console.log('\n--- 4. Testing Manual Pulang & Duplicate Pulang Prevention ---');
  const resPulang = await recordPresensiSiswa(client as any, {
    siswa: testStudent1,
    status: 'pulang',
    sekolahId: 'school-a',
    deviceId: 'manual',
    tanggal: '2026-10-04',
    jam: '13:30:00'
  });

  assert(resPulang.success === true, 'Manual Pulang succeeds for student who already arrived');
  assert(resPulang.alreadyExists === false, 'alreadyExists is false for new pulang record');
  assert(resPulang.data.status === 'pulang', 'Returned record status is "pulang"');
  assert(resPulang.data.device_id === 'manual', 'Returned record device_id is "manual"');
  assert(client._store.length === 2, 'Store contains exactly 2 rows (datang + pulang)');

  // 1.5 Duplicate pulang attempt
  const resDupPulang = await recordPresensiSiswa(client as any, {
    siswa: testStudent1,
    status: 'pulang',
    sekolahId: 'school-a',
    deviceId: 'manual',
    tanggal: '2026-10-04',
    jam: '13:35:00'
  });

  assert(resDupPulang.success === false, 'Duplicate Pulang returns success = false');
  assert(resDupPulang.alreadyExists === true, 'Duplicate Pulang flags alreadyExists = true');
  assert(client._store.length === 2, 'Store still contains exactly 2 rows');

  // 1.6 Edge Cases: Student with null NISN
  console.log('\n--- 5. Testing Edge Cases: Null NISN & Missing Sekolah ID ---');
  const testStudentNullNisn: StudentReference = {
    id: 's-002',
    nisn: null,
    nama_siswa: 'Dewi Lestari',
    kelas: 'X-1',
    sekolah_id: 'school-a'
  };

  const resNullNisn = await recordPresensiSiswa(client as any, {
    siswa: testStudentNullNisn,
    status: 'datang',
    sekolahId: 'school-a',
    deviceId: 'manual',
    tanggal: '2026-10-04'
  });

  assert(resNullNisn.success === true, 'Student with null NISN records presensi successfully');
  assert(resNullNisn.data.nisn === null, 'Row stored has nisn = null');
  assert(resNullNisn.data.device_id === 'manual', 'Row stored has device_id = "manual"');

  // Student with missing sekolahId
  const testStudentNoSchool: StudentReference = {
    id: 's-003',
    nisn: '123456',
    nama_siswa: 'No School Student',
    kelas: 'X-1',
    sekolah_id: ''
  };

  const resNoSchool = await recordPresensiSiswa(client as any, {
    siswa: testStudentNoSchool,
    status: 'datang',
    deviceId: 'manual'
  });

  assert(resNoSchool.success === false, 'Missing sekolah_id correctly returns success = false');
  assert(resNoSchool.message.includes('ID Sekolah tidak ditemukan'), 'Returns appropriate error message');

  // ==========================================================================
  // PART 2: DOWNSTREAM QUERY INGESTION SIMULATION - GuruJurnal.tsx
  // ==========================================================================
  console.log('\n--- 6. Downstream Query Ingestion Simulation: GuruJurnal.tsx ---');
  // GuruJurnal queries:
  // supabase.from('presensi_siswa')
  //   .select('siswa_id, nisn, nama_siswa, jam, status')
  //   .eq('kelas', kelas)
  //   .eq('tanggal', tgl)
  //   .eq('status', 'datang')
  //   .eq('sekolah_id', user.sekolah_id);

  let pQuery = client
    .from('presensi_siswa')
    .select('siswa_id, nisn, nama_siswa, jam, status')
    .eq('kelas', 'X-1')
    .eq('tanggal', '2026-10-04')
    .eq('status', 'datang')
    .eq('sekolah_id', 'school-a');

  let pData: any[] = [];
  await new Promise<void>(resolve => {
    (pQuery as any).then((res: any) => {
      pData = res.data || [];
      resolve();
    });
  });

  assert(pData.length === 2, `GuruJurnal receives 2 arrived students in X-1 (got ${pData.length})`);

  // Build pMap as done in GuruJurnal.tsx
  const pMap: Record<string, { jam: string }> = {};
  pData.forEach((p: any) => {
    const rawJam = p.jam ? String(p.jam).trim() : '';
    const jamStr = rawJam.length > 5 ? rawJam.slice(0, 5) : rawJam;
    if (p.nisn) pMap[p.nisn] = { jam: jamStr };
    if (p.siswa_id) pMap[p.siswa_id] = { jam: jamStr };
  });

  assert(pMap['99001122'] !== undefined, 'pMap contains entry by NISN (99001122)');
  assert(pMap['99001122'].jam === '06:45', 'pMap contains correct sliced jam (06:45)');
  assert(pMap['s-001'] !== undefined, 'pMap contains entry by siswa_id (s-001)');
  assert(pMap['s-002'] !== undefined, 'pMap contains entry for null-NISN student by siswa_id (s-002)');

  // Verify GuruJurnal "Terapkan Presensi Piket" action behavior
  const classStudents = [
    { id: 's-001', nisn: '99001122', nama_siswa: 'Budi Santoso' },
    { id: 's-002', nisn: null, nama_siswa: 'Dewi Lestari' },
    { id: 's-003', nisn: '99003344', nama_siswa: 'Citra Kirana' } // Has not arrived
  ];

  const initialAbsensi: Record<string, string> = {
    '99001122': 'H',
    's-002': 'H',
    '99003344': 'H'
  };

  // When teacher clicks "Terapkan Presensi Piket":
  const appliedAbsensi = { ...initialAbsensi };
  classStudents.forEach(s => {
    const key = s.nisn || s.id;
    const hasGateArrival = (s.nisn && pMap[s.nisn]) || pMap[s.id];
    if (hasGateArrival) {
      appliedAbsensi[key] = 'H';
    }
  });

  assert(appliedAbsensi['99001122'] === 'H', 'Student 1 marked Hadir');
  assert(appliedAbsensi['s-002'] === 'H', 'Student 2 marked Hadir');

  // ==========================================================================
  // PART 3: DOWNSTREAM QUERY INGESTION SIMULATION - RekapSiswaView.tsx
  // ==========================================================================
  console.log('\n--- 7. Downstream Query Ingestion Simulation: RekapSiswaView.tsx ---');
  // RekapSiswaView queries:
  // supabase.from('presensi_siswa')
  //   .select('*')
  //   .eq('kelas', gerbangKelas)
  //   .eq('tanggal', gerbangTanggal)
  //   .eq('sekolah_id', user.sekolah_id);

  let rkQuery = client
    .from('presensi_siswa')
    .select('*')
    .eq('kelas', 'X-1')
    .eq('tanggal', '2026-10-04')
    .eq('sekolah_id', 'school-a');

  let rkData: any[] = [];
  await new Promise<void>(resolve => {
    (rkQuery as any).then((res: any) => {
      rkData = res.data || [];
      resolve();
    });
  });

  assert(rkData.length === 3, `RekapSiswaView receives 3 records (2 datang + 1 pulang, got ${rkData.length})`);

  // Simulate combined student view in RekapSiswaView
  const combined = classStudents.map(siswa => {
    const datang = rkData.find(
      p => (p.siswa_id === siswa.id || (siswa.nisn && p.nisn === siswa.nisn)) && p.status === 'datang'
    );
    const pulang = rkData.find(
      p => (p.siswa_id === siswa.id || (siswa.nisn && p.nisn === siswa.nisn)) && p.status === 'pulang'
    );

    const rawJamDatang = datang?.jam ? String(datang.jam).trim() : null;
    const jamDatang = rawJamDatang ? (rawJamDatang.length > 5 ? rawJamDatang.slice(0, 5) : rawJamDatang) : null;
    const rawJamPulang = pulang?.jam ? String(pulang.jam).trim() : null;
    const jamPulang = rawJamPulang ? (rawJamPulang.length > 5 ? rawJamPulang.slice(0, 5) : rawJamPulang) : null;

    return {
      ...siswa,
      datang,
      pulang,
      jamDatang,
      jamPulang,
      hasDatang: !!datang,
      hasPulang: !!pulang,
      deviceDatang: datang?.device_id || null,
      devicePulang: pulang?.device_id || null
    };
  });

  const s1 = combined.find(s => s.id === 's-001')!;
  assert(s1.hasDatang === true, 'Student 1 hasDatang is true');
  assert(s1.hasPulang === true, 'Student 1 hasPulang is true');
  assert(s1.deviceDatang === 'manual', 'Student 1 deviceDatang is "manual"');
  assert(s1.devicePulang === 'manual', 'Student 1 devicePulang is "manual"');
  assert(s1.jamDatang === '06:45', 'Student 1 jamDatang is "06:45"');
  assert(s1.jamPulang === '13:30', 'Student 1 jamPulang is "13:30"');

  const s2 = combined.find(s => s.id === 's-002')!;
  assert(s2.hasDatang === true, 'Student 2 (null NISN) hasDatang is true');
  assert(s2.hasPulang === false, 'Student 2 hasPulang is false');
  assert(s2.deviceDatang === 'manual', 'Student 2 deviceDatang is "manual"');

  const s3 = combined.find(s => s.id === 's-003')!;
  assert(s3.hasDatang === false, 'Student 3 (absent) hasDatang is false');
  assert(s3.hasPulang === false, 'Student 3 (absent) hasPulang is false');

  // Summary counts
  const totalSiswa = combined.length;
  const totalDatang = combined.filter(s => s.hasDatang).length;
  const totalPulang = combined.filter(s => s.hasPulang).length;
  const totalBelumPresensi = totalSiswa - totalDatang;

  assert(totalSiswa === 3, 'Total siswa in class is 3');
  assert(totalDatang === 2, 'Total hadir datang is 2');
  assert(totalPulang === 1, 'Total pulang is 1');
  assert(totalBelumPresensi === 1, 'Total belum presensi is 1');

  // Badges logic verification
  function getBadgeText(s: typeof s1): string {
    return s.hasPulang ? 'Sudah Pulang' : s.hasDatang ? 'Hadir Datang' : 'Belum Presensi';
  }

  assert(getBadgeText(s1) === 'Sudah Pulang', 'Student 1 badge is "Sudah Pulang"');
  assert(getBadgeText(s2) === 'Hadir Datang', 'Student 2 badge is "Hadir Datang"');
  assert(getBadgeText(s3) === 'Belum Presensi', 'Student 3 badge is "Belum Presensi"');

  // ==========================================================================
  // PART 4: MULTI-TENANT ISOLATION STRESS TEST
  // ==========================================================================
  console.log('\n--- 8. Multi-Tenant Isolation Stress Test ---');
  // Student in school-b
  const testStudentSchoolB: StudentReference = {
    id: 's-b-001',
    nisn: '99001122', // Same NISN as school-a student!
    nama_siswa: 'Cross Tenant Student',
    kelas: 'X-1',
    sekolah_id: 'school-b'
  };

  const resSchoolB = await recordPresensiSiswa(client as any, {
    siswa: testStudentSchoolB,
    status: 'datang',
    sekolahId: 'school-b',
    deviceId: 'manual',
    tanggal: '2026-10-04',
    jam: '07:05:00'
  });

  assert(resSchoolB.success === true, 'School B student records attendance independently even with same NISN');

  // Query as school-a: must NOT see school-b record
  let aScopeQuery = client
    .from('presensi_siswa')
    .select('*')
    .eq('kelas', 'X-1')
    .eq('tanggal', '2026-10-04')
    .eq('sekolah_id', 'school-a');

  let aScopeData: any[] = [];
  await new Promise<void>(resolve => {
    (aScopeQuery as any).then((res: any) => {
      aScopeData = res.data || [];
      resolve();
    });
  });

  assert(
    !aScopeData.some(r => r.sekolah_id === 'school-b'),
    'School A query NEVER contains School B records'
  );
  assert(
    !aScopeData.some(r => r.nama_siswa === 'Cross Tenant Student'),
    'School A query NEVER leaks School B student data'
  );

  // Query as school-b: must NOT see school-a record
  let bScopeQuery = client
    .from('presensi_siswa')
    .select('*')
    .eq('kelas', 'X-1')
    .eq('tanggal', '2026-10-04')
    .eq('sekolah_id', 'school-b');

  let bScopeData: any[] = [];
  await new Promise<void>(resolve => {
    (bScopeQuery as any).then((res: any) => {
      bScopeData = res.data || [];
      resolve();
    });
  });

  assert(bScopeData.length === 1, 'School B query returns exactly 1 record');
  assert(bScopeData[0].nama_siswa === 'Cross Tenant Student', 'School B query returns only School B student');
}

// ============================================================================
// PART 5: LIVE SUPABASE DATABASE INTEGRATION TEST
// ============================================================================
async function runLiveDatabaseSuite() {
  console.log('\n--- 9. Live Supabase Database Integration & Rollback ---');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials missing in .env.local, skipping live DB suite.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Pick real student from SMA Nizamudin
  const testSiswaId = '680584c6-0e5a-48c6-8a5c-d63515be6354'; // Moh. Candra Podomi
  const testSekolahId = 'a0000000-0000-0000-0000-000000000001';
  const testDate = '2099-01-01'; // Safe future date for testing
  const testJam = '07:15:00';

  const liveStudent: StudentReference = {
    id: testSiswaId,
    nisn: '114367407',
    nama_siswa: 'Moh. Candra Podomi',
    kelas: 'X Merdeka',
    sekolah_id: testSekolahId
  };

  try {
    // Cleanup any remnant from previous run
    await supabase
      .from('presensi_siswa')
      .delete()
      .eq('sekolah_id', testSekolahId)
      .eq('tanggal', testDate);

    // 1. Live manual recordPresensiSiswa
    const resLiveDatang = await recordPresensiSiswa(supabase, {
      siswa: liveStudent,
      status: 'datang',
      sekolahId: testSekolahId,
      deviceId: 'manual',
      tanggal: testDate,
      jam: testJam
    });

    assert(resLiveDatang.success === true, 'Live Supabase: Manual datang succeeds');
    assert(resLiveDatang.data?.device_id === 'manual', 'Live Supabase: Inserted device_id is "manual"');
    assert(resLiveDatang.data?.sekolah_id === testSekolahId, 'Live Supabase: sekolah_id matches');
    assert(resLiveDatang.data?.siswa_id === testSiswaId, 'Live Supabase: siswa_id matches');

    // 2. Live duplicate check
    const resLiveDup = await recordPresensiSiswa(supabase, {
      siswa: liveStudent,
      status: 'datang',
      sekolahId: testSekolahId,
      deviceId: 'manual',
      tanggal: testDate,
      jam: '07:20:00'
    });

    assert(resLiveDup.success === false, 'Live Supabase: Duplicate datang is rejected');
    assert(resLiveDup.alreadyExists === true, 'Live Supabase: alreadyExists = true');

    // 3. Live pulang record
    const resLivePulang = await recordPresensiSiswa(supabase, {
      siswa: liveStudent,
      status: 'pulang',
      sekolahId: testSekolahId,
      deviceId: 'manual',
      tanggal: testDate,
      jam: '14:00:00'
    });

    assert(resLivePulang.success === true, 'Live Supabase: Manual pulang succeeds');
    assert(resLivePulang.data?.status === 'pulang', 'Live Supabase: Inserted status is "pulang"');
    assert(resLivePulang.data?.device_id === 'manual', 'Live Supabase: Pulang device_id is "manual"');

    // 4. Live GuruJurnal query verification
    const { data: gjData, error: gjErr } = await supabase
      .from('presensi_siswa')
      .select('siswa_id, nisn, nama_siswa, jam, status')
      .eq('kelas', 'X Merdeka')
      .eq('tanggal', testDate)
      .eq('status', 'datang')
      .eq('sekolah_id', testSekolahId);

    assert(!gjErr, 'Live Supabase: GuruJurnal query executes without error');
    assert(gjData !== null && gjData.length === 1, 'Live Supabase: GuruJurnal query returns manual record');
    assert(gjData![0].siswa_id === testSiswaId, 'Live Supabase: GuruJurnal record matches test student');

    // 5. Live RekapSiswaView query verification
    const { data: rkData, error: rkErr } = await supabase
      .from('presensi_siswa')
      .select('*')
      .eq('kelas', 'X Merdeka')
      .eq('tanggal', testDate)
      .eq('sekolah_id', testSekolahId);

    assert(!rkErr, 'Live Supabase: RekapSiswaView query executes without error');
    assert(rkData !== null && rkData.length === 2, 'Live Supabase: RekapSiswaView returns 2 records (datang & pulang)');
    const liveDatangRec = rkData!.find(r => r.status === 'datang');
    const livePulangRec = rkData!.find(r => r.status === 'pulang');
    assert(liveDatangRec?.device_id === 'manual', 'Live Supabase: Datang record has device_id = "manual"');
    assert(livePulangRec?.device_id === 'manual', 'Live Supabase: Pulang record has device_id = "manual"');

  } finally {
    // 6. Cleanup test records
    console.log('Cleaning up live test records for date 2099-01-01...');
    await supabase
      .from('presensi_siswa')
      .delete()
      .eq('sekolah_id', testSekolahId)
      .eq('tanggal', testDate);

    // Verify cleanup
    const { data: checkClean } = await supabase
      .from('presensi_siswa')
      .select('id')
      .eq('sekolah_id', testSekolahId)
      .eq('tanggal', testDate);

    assert((checkClean || []).length === 0, 'Live Supabase: Test records successfully rolled back and cleaned up');
  }
}

async function main() {
  try {
    await runMockSuite();
    await runLiveDatabaseSuite();

    console.log('\n================================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('================================================================\n');
  } catch (err: any) {
    console.error('\n❌ TEST SUITE FAILED WITH ERROR:', err.message);
    process.exit(1);
  }
}

main();
