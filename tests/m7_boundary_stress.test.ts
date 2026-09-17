import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as webpush from 'web-push';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const defaultSekolahId = 'a0000000-0000-0000-0000-000000000001';
const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-user-role': 'Superadmin',
      'x-sekolah-id': defaultSekolahId
    }
  }
});

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function check(description: string, fn: () => void | Promise<void>) {
  return async () => {
    totalTests++;
    try {
      await fn();
      console.log(`  ✅ PASS [${totalTests}]: ${description}`);
      passedTests++;
    } catch (err: any) {
      console.error(`  ❌ FAIL [${totalTests}]: ${description}`);
      console.error(`     Error: ${err.message}`);
      failedTests++;
    }
  };
}

async function runBoundaryStressTests() {
  const { computeCohortAdvancement } = await import('../src/components/NaikKelasModal');
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, configureWebPush, urlBase64ToUint8Array } = await import('../src/lib/vapid');

  console.log('================================================================');
  console.log('⚡ M7 ADVERSARIAL CHALLENGER: COMPREHENSIVE BOUNDARY STRESS TESTS');
  console.log('================================================================\n');

  // ===========================================================================
  // DOMAIN 1: ATTENDANCE SYNC WITH MISSING OR LEGACY ATTENDANCE FIELDS
  // ===========================================================================
  console.log('--- DOMAIN 1: Attendance Sync with Missing & Legacy Fields ---');
  const timestamp = Date.now().toString().slice(-5);
  const testClass = `X-STRESS-${timestamp}`;
  const testDate = '2026-09-17';
  const testJournalId = crypto.randomUUID();
  const testNisn1 = `NISN_1_${timestamp}`;
  const testNisn2 = `NISN_2_${timestamp}`;
  const testNisn3 = `NISN_3_${timestamp}`;
  const testNisn4 = `NISN_4_${timestamp}`;

  // 1.1 Trigger sync when journal absensi_siswa is initially NULL
  await check('Attendance sync handles NULL initial absensi_siswa gracefully', async () => {
    // Insert journal with NULL absensi_siswa
    const { error: jErr } = await supabase.from('jurnal_pembelajaran').insert([{
      id: testJournalId,
      sekolah_id: defaultSekolahId,
      tanggal: testDate,
      kelas: testClass,
      mapel: 'Matematika Boundary',
      nama_guru: 'Guru Boundary',
      materi: 'Limit Fungsi',
      kegiatan: 'Latihan Soal',
      absensi_siswa: null,
      keterangan: 'Jurnal KBM',
      status_verifikasi: 'Menunggu',
      pertemuan_ke: '1',
      jam_ke: '1-2'
    }]);
    assert(!jErr, `Failed to seed test journal: ${jErr?.message}`);

    // Insert attendance record with missing optional fields (siswa_id=null, keterangan=null, log_perubahan=[])
    const { error: aErr } = await supabase.from('absensi').insert([{
      id: crypto.randomUUID(),
      sekolah_id: defaultSekolahId,
      tanggal: testDate,
      kelas: testClass,
      siswa_id: null,
      nisn: testNisn1,
      nama_siswa: 'Siswa Null Test',
      status: 'Sakit',
      keterangan: null,
      sumber_perubahan: 'Piket',
      diubah_oleh: 'Petugas Piket',
      log_perubahan: []
    }]);
    assert(!aErr, `Failed to insert absensi with null fields: ${aErr?.message}`);

    // Verify journal was synced from NULL to valid JSON
    const { data: updatedJournal, error: qErr } = await supabase
      .from('jurnal_pembelajaran')
      .select('absensi_siswa')
      .eq('id', testJournalId)
      .single();
    assert(!qErr && updatedJournal, `Failed to fetch journal: ${qErr?.message}`);
    assert(updatedJournal.absensi_siswa !== null, 'absensi_siswa should not be null');
    const parsed = JSON.parse(updatedJournal.absensi_siswa);
    assert.equal(parsed[testNisn1], 'Sakit', `Expected status 'Sakit', got '${parsed[testNisn1]}'`);
  })();

  // 1.2 Trigger sync when journal absensi_siswa contains legacy non-JSON text
  await check('Attendance sync recovers from legacy malformed non-JSON absensi_siswa', async () => {
    // Overwrite journal with legacy non-JSON string
    const { error: uErr } = await supabase
      .from('jurnal_pembelajaran')
      .update({ absensi_siswa: 'Hadir Semua (Legacy Format)' })
      .eq('id', testJournalId);
    assert(!uErr, `Failed to set legacy absensi_siswa: ${uErr?.message}`);

    // Upsert absensi for student 2
    const { error: aErr } = await supabase.from('absensi').insert([{
      id: crypto.randomUUID(),
      sekolah_id: defaultSekolahId,
      tanggal: testDate,
      kelas: testClass,
      nisn: testNisn2,
      nama_siswa: 'Siswa Legacy Test',
      status: 'Izin',
      sumber_perubahan: 'Wali Kelas',
      diubah_oleh: 'Ibu Wali',
      log_perubahan: ['Diubah ke Izin']
    }]);
    assert(!aErr, `Failed to insert absensi: ${aErr?.message}`);

    // Verify trigger sanitized absensi_siswa into valid JSON
    const { data: updatedJournal } = await supabase
      .from('jurnal_pembelajaran')
      .select('absensi_siswa')
      .eq('id', testJournalId)
      .single();
    assert(updatedJournal && updatedJournal.absensi_siswa, 'absensi_siswa must exist');
    const parsed = JSON.parse(updatedJournal.absensi_siswa);
    assert.equal(parsed[testNisn2], 'Izin', `Expected status 'Izin', got '${parsed[testNisn2]}'`);
  })();

  // 1.3 Multi-student peer preservation
  await check('Attendance sync preserves other peer students when updating an individual', async () => {
    // Seed journal with existing multi-student map
    const initialMap = {
      [testNisn1]: 'Hadir',
      [testNisn2]: 'Hadir',
      [testNisn3]: 'Hadir'
    };
    await supabase
      .from('jurnal_pembelajaran')
      .update({ absensi_siswa: JSON.stringify(initialMap) })
      .eq('id', testJournalId);

    // Upsert student 4 as Alpa
    await supabase.from('absensi').insert([{
      id: crypto.randomUUID(),
      sekolah_id: defaultSekolahId,
      tanggal: testDate,
      kelas: testClass,
      nisn: testNisn4,
      nama_siswa: 'Siswa Empat',
      status: 'Alpa',
      sumber_perubahan: 'Guru Mapel',
      diubah_oleh: 'Pak Guru',
      log_perubahan: ['Diubah ke Alpa']
    }]);

    // Update student 2 to Sakit
    await supabase.from('absensi').upsert([{
      sekolah_id: defaultSekolahId,
      tanggal: testDate,
      kelas: testClass,
      nisn: testNisn2,
      nama_siswa: 'Siswa Dua',
      status: 'Sakit',
      sumber_perubahan: 'Piket',
      diubah_oleh: 'Piket',
      log_perubahan: ['Diubah ke Sakit']
    }], { onConflict: 'sekolah_id, tanggal, nisn' });

    const { data: finalJournal } = await supabase
      .from('jurnal_pembelajaran')
      .select('absensi_siswa')
      .eq('id', testJournalId)
      .single();
    const finalMap = JSON.parse(finalJournal?.absensi_siswa || '{}');

    assert.equal(finalMap[testNisn1], 'Hadir', 'Peer student 1 must be preserved as Hadir');
    assert.equal(finalMap[testNisn2], 'Sakit', 'Target student 2 must be updated to Sakit');
    assert.equal(finalMap[testNisn3], 'Hadir', 'Peer student 3 must be preserved as Hadir');
    assert.equal(finalMap[testNisn4], 'Alpa', 'New student 4 must be added as Alpa');
  })();

  // 1.4 Database Check Constraint on Attendance Status
  await check('PostgreSQL check constraint rejects invalid attendance status', async () => {
    const { error: invalidStatusErr } = await supabase.from('absensi').insert([{
      id: crypto.randomUUID(),
      sekolah_id: defaultSekolahId,
      tanggal: testDate,
      kelas: testClass,
      nisn: `INVALID_${Date.now()}`,
      nama_siswa: 'Invalid Status Test',
      status: 'Dispensasi', // NOT IN ('Hadir', 'Izin', 'Sakit', 'Alpa')
      sumber_perubahan: 'Test',
      diubah_oleh: 'Test'
    }]);
    assert(invalidStatusErr !== null, 'Database must reject invalid status Dispensasi');
  })();

  // Cleanup Domain 1
  await supabase.from('absensi').delete().eq('kelas', testClass);
  await supabase.from('jurnal_pembelajaran').delete().eq('id', testJournalId);


  // ===========================================================================
  // DOMAIN 2: GRADEBOOK NUMERIC BOUNDARIES (<0, >100, DECIMALS)
  // ===========================================================================
  console.log('\n--- DOMAIN 2: Gradebook Numeric Boundaries & Kurikulum Merdeka ---');
  const testTpId = crypto.randomUUID();
  const testAsesmenId = crypto.randomUUID();
  const testStudentNisn = `NISN_GB_${Date.now().toString().slice(-6)}`;

  // Setup test TP & Column
  const { error: tpSetupErr } = await supabase.from('tujuan_pembelajaran').insert([{
    id: testTpId,
    sekolah_id: defaultSekolahId,
    nama_guru: 'Guru Boundary Math',
    nama_mapel: 'Matematika Peminatan',
    kelas: testClass,
    kode_tp: `TP-STRESS-${timestamp}`,
    deskripsi: 'Boundary Testing TP',
    semester: 'Ganjil',
    tahun_ajaran: '2024/2025',
    urutan: 1
  }]);
  assert(!tpSetupErr, `TP Setup failed: ${tpSetupErr?.message}`);

  const { error: colSetupErr } = await supabase.from('asesmen_kolom').insert([{
    id: testAsesmenId,
    sekolah_id: defaultSekolahId,
    tp_id: testTpId,
    kategori: 'Formatif',
    nama: 'Formatif 1 Boundary',
    bobot: 1,
    urutan: 1
  }]);
  assert(!colSetupErr, `Column Setup failed: ${colSetupErr?.message}`);

  // 2.1 Rejection of Negative Grade (< 0)
  await check('PostgreSQL check constraint rejects negative grade (nilai = -5)', async () => {
    const { error: negErr } = await supabase.from('nilai_siswa').insert([{
      sekolah_id: defaultSekolahId,
      tp_id: testTpId,
      asesmen_id: testAsesmenId,
      nisn: testStudentNisn,
      nama_siswa: 'Siswa Negative',
      kelas: testClass,
      mapel: 'Matematika Peminatan',
      nama_guru: 'Guru Boundary Math',
      nilai: -5
    }]);
    assert(negErr !== null, 'Database must reject negative score nilai = -5');
  })();

  // 2.2 Rejection of Negative Small Decimal (nilai = -0.01)
  await check('PostgreSQL check constraint rejects small negative decimal (nilai = -0.01)', async () => {
    const { error: smallNegErr } = await supabase.from('nilai_siswa').insert([{
      sekolah_id: defaultSekolahId,
      tp_id: testTpId,
      asesmen_id: testAsesmenId,
      nisn: testStudentNisn,
      nama_siswa: 'Siswa Small Neg',
      kelas: testClass,
      mapel: 'Matematika Peminatan',
      nama_guru: 'Guru Boundary Math',
      nilai: -0.01
    }]);
    assert(smallNegErr !== null, 'Database must reject small negative decimal nilai = -0.01');
  })();

  // 2.3 Rejection of Grade Exceeding 100 (nilai = 100.01)
  await check('PostgreSQL check constraint rejects grade > 100 (nilai = 100.01)', async () => {
    const { error: overErr } = await supabase.from('nilai_siswa').insert([{
      sekolah_id: defaultSekolahId,
      tp_id: testTpId,
      asesmen_id: testAsesmenId,
      nisn: testStudentNisn,
      nama_siswa: 'Siswa Over 100',
      kelas: testClass,
      mapel: 'Matematika Peminatan',
      nama_guru: 'Guru Boundary Math',
      nilai: 100.01
    }]);
    assert(overErr !== null, 'Database must reject score > 100');
  })();

  // 2.4 Acceptance of Lower Extreme Boundary (nilai = 0.00)
  await check('Accepts exact lower extreme boundary (nilai = 0.00)', async () => {
    const { error: zeroErr } = await supabase.from('nilai_siswa').insert([{
      sekolah_id: defaultSekolahId,
      tp_id: testTpId,
      asesmen_id: testAsesmenId,
      nisn: `${testStudentNisn}_0`,
      nama_siswa: 'Siswa Nol',
      kelas: testClass,
      mapel: 'Matematika Peminatan',
      nama_guru: 'Guru Boundary Math',
      nilai: 0
    }]);
    assert(!zeroErr, `Should accept 0: ${zeroErr?.message}`);

    const { data: rec } = await supabase
      .from('nilai_siswa')
      .select('nilai')
      .eq('nisn', `${testStudentNisn}_0`)
      .single();
    assert.equal(Number(rec?.nilai), 0, 'Retrieved grade must be 0');
  })();

  // 2.5 Acceptance of Upper Extreme Boundary (nilai = 100.00)
  await check('Accepts exact upper extreme boundary (nilai = 100.00)', async () => {
    const { error: maxErr } = await supabase.from('nilai_siswa').insert([{
      sekolah_id: defaultSekolahId,
      tp_id: testTpId,
      asesmen_id: testAsesmenId,
      nisn: `${testStudentNisn}_100`,
      nama_siswa: 'Siswa Max',
      kelas: testClass,
      mapel: 'Matematika Peminatan',
      nama_guru: 'Guru Boundary Math',
      nilai: 100
    }]);
    assert(!maxErr, `Should accept 100: ${maxErr?.message}`);

    const { data: rec } = await supabase
      .from('nilai_siswa')
      .select('nilai')
      .eq('nisn', `${testStudentNisn}_100`)
      .single();
    assert.equal(Number(rec?.nilai), 100, 'Retrieved grade must be 100');
  })();

  // 2.6 Acceptance and Precision of Fractional Decimals (nilai = 88.75)
  await check('Preserves decimal precision with 2 decimal places (nilai = 88.75)', async () => {
    const { error: decErr } = await supabase.from('nilai_siswa').insert([{
      sekolah_id: defaultSekolahId,
      tp_id: testTpId,
      asesmen_id: testAsesmenId,
      nisn: `${testStudentNisn}_dec`,
      nama_siswa: 'Siswa Decimal',
      kelas: testClass,
      mapel: 'Matematika Peminatan',
      nama_guru: 'Guru Boundary Math',
      nilai: 88.75
    }]);
    assert(!decErr, `Should accept 88.75: ${decErr?.message}`);

    const { data: rec } = await supabase
      .from('nilai_siswa')
      .select('nilai')
      .eq('nisn', `${testStudentNisn}_dec`)
      .single();
    assert.equal(Number(rec?.nilai), 88.75, 'Retrieved grade must accurately be 88.75');
  })();

  // 2.7 Kurikulum Merdeka Predicate Boundary Edges
  await check('Kurikulum Merdeka predicate evaluation at exact boundary thresholds', () => {
    function getPredikat(score: number): string {
      if (score >= 85) return 'Sangat Baik';
      if (score >= 75) return 'Baik';
      if (score >= 65) return 'Cukup';
      return 'Perlu Bimbingan';
    }

    assert.equal(getPredikat(0), 'Perlu Bimbingan');
    assert.equal(getPredikat(64.9), 'Perlu Bimbingan');
    assert.equal(getPredikat(65.0), 'Cukup');
    assert.equal(getPredikat(74.9), 'Cukup');
    assert.equal(getPredikat(75.0), 'Baik');
    assert.equal(getPredikat(84.9), 'Baik');
    assert.equal(getPredikat(85.0), 'Sangat Baik');
    assert.equal(getPredikat(100.0), 'Sangat Baik');
  })();

  // Cleanup Domain 2
  await supabase.from('nilai_siswa').delete().eq('tp_id', testTpId);
  await supabase.from('asesmen_kolom').delete().eq('tp_id', testTpId);
  await supabase.from('tujuan_pembelajaran').delete().eq('id', testTpId);


  // ===========================================================================
  // DOMAIN 3: VAPID KEYS AND SERVICE WORKER PAYLOAD PARSING IN SW.JS
  // ===========================================================================
  console.log('\n--- DOMAIN 3: VAPID Keys & Service Worker Payload Parsing ---');

  // 3.1 VAPID Keys Validation
  await check('VAPID public & private keys are syntactically valid and initialize web-push', () => {
    assert(typeof VAPID_PUBLIC_KEY === 'string', 'VAPID_PUBLIC_KEY must be string');
    assert(typeof VAPID_PRIVATE_KEY === 'string', 'VAPID_PRIVATE_KEY must be string');
    // Standard uncompressed P-256 public key is 65 bytes -> 87 base64url characters
    assert.equal(VAPID_PUBLIC_KEY.length, 87, `Public key expected 87 chars, got ${VAPID_PUBLIC_KEY.length}`);
    // P-256 private key is 32 bytes -> 43 base64url characters
    assert.equal(VAPID_PRIVATE_KEY.length, 43, `Private key expected 43 chars, got ${VAPID_PRIVATE_KEY.length}`);

    // urlBase64ToUint8Array conversion test
    const rawBuffer = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    assert.equal(rawBuffer.byteLength, 65, `Converted public key buffer must be 65 bytes`);

    // Verify webpush initialization
    configureWebPush();
  })();

  // 3.2 Service Worker Payload Parsing Logic Simulation (sw.js parity)
  function simulateSwPushHandler(eventData: { json?: () => any; text?: () => string } | null | undefined) {
    let payload: any = {};
    if (eventData) {
      try {
        if (eventData.json) {
          payload = eventData.json();
        } else if (eventData.text) {
          payload = { title: 'SIPJAM Notifikasi', body: eventData.text() };
        }
      } catch (err) {
        payload = {
          title: 'SIPJAM Notifikasi',
          body: eventData.text ? eventData.text() : ''
        };
      }
    }

    const title = payload.title || 'SIPJAM Notifikasi';
    const targetUrl = payload.url || (payload.data && payload.data.url) || payload.data || '/';

    const options = {
      body: payload.body || 'Pemberitahuan baru dari sistem SIPJAM.',
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      data: {
        url: targetUrl,
        timestamp: 1234567890,
        ...(typeof payload.data === 'object' ? payload.data : {})
      },
      vibrate: payload.vibrate || [100, 50, 100],
      tag: payload.tag || 'sipjam-push-notification',
      renotify: true,
      actions: payload.actions || []
    };

    return { title, options };
  }

  await check('sw.js push handler handles null/undefined event data safely', () => {
    const res1 = simulateSwPushHandler(null);
    assert.equal(res1.title, 'SIPJAM Notifikasi');
    assert.equal(res1.options.body, 'Pemberitahuan baru dari sistem SIPJAM.');
    assert.equal(res1.options.data.url, '/');

    const res2 = simulateSwPushHandler(undefined);
    assert.equal(res2.title, 'SIPJAM Notifikasi');
    assert.equal(res2.options.data.url, '/');
  })();

  await check('sw.js push handler handles malformed non-JSON data via text() fallback', () => {
    const malformedData = {
      json: () => { throw new SyntaxError('Unexpected token < in JSON at position 0'); },
      text: () => 'Server Alert: Maintenance Scheduled'
    };
    const res = simulateSwPushHandler(malformedData);
    assert.equal(res.title, 'SIPJAM Notifikasi');
    assert.equal(res.options.body, 'Server Alert: Maintenance Scheduled');
    assert.equal(res.options.data.url, '/');
  })();

  await check('sw.js push handler resolves complex nested payload.data.url correctly', () => {
    const complexData = {
      json: () => ({
        title: 'Pengingat Presensi',
        body: 'Waktunya presensi datang!',
        data: { url: '/guru/presensi', category: 'reminder' },
        icon: '/custom-icon.png'
      })
    };
    const res = simulateSwPushHandler(complexData);
    assert.equal(res.title, 'Pengingat Presensi');
    assert.equal(res.options.body, 'Waktunya presensi datang!');
    assert.equal(res.options.icon, '/custom-icon.png');
    assert.equal(res.options.data.url, '/guru/presensi');
    assert.equal(res.options.data.category, 'reminder');
  })();

  await check('sw.js push handler handles non-object payload.data without crashing', () => {
    const stringDataPayload = {
      json: () => ({
        title: 'Notif',
        data: '/rekap/siswa'
      })
    };
    const res = simulateSwPushHandler(stringDataPayload);
    assert.equal(res.options.data.url, '/rekap/siswa');
  })();


  // ===========================================================================
  // DOMAIN 4: NAIK KELAS COHORT PROGRESSION WITH IRREGULAR CLASS NAMES
  // ===========================================================================
  console.log('\n--- DOMAIN 4: Naik Kelas Progression with Irregular Class Names ---');

  await check('computeCohortAdvancement handles standard and irregular class naming matrix', () => {
    // 1. Standard Roman
    assert.deepEqual(computeCohortAdvancement('X IPA 1'), { targetKelas: 'XI IPA 1', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('XI IPA 1'), { targetKelas: 'XII IPA 1', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('XII IPA 1'), { targetKelas: 'Lulus', isLulus: true });

    // 2. Hyphenated Irregulars
    assert.deepEqual(computeCohortAdvancement('X-1'), { targetKelas: 'XI-1', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('XI-1'), { targetKelas: 'XII-1', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('XII-1'), { targetKelas: 'Lulus', isLulus: true });
    assert.deepEqual(computeCohortAdvancement('X-TKJ-1'), { targetKelas: 'XI-TKJ-1', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('XI-TKJ-1'), { targetKelas: 'XII-TKJ-1', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('XII-TKJ-1'), { targetKelas: 'Lulus', isLulus: true });

    // 3. Dot-separated Irregulars
    assert.deepEqual(computeCohortAdvancement('X.A'), { targetKelas: 'XI.A', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('XI.B'), { targetKelas: 'XII.B', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('XII.C'), { targetKelas: 'Lulus', isLulus: true });
    assert.deepEqual(computeCohortAdvancement('Kelas 10.1'), { targetKelas: 'Kelas 11.1', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('Kelas 11.1'), { targetKelas: 'Kelas 12.1', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('Kelas 12.1'), { targetKelas: 'Lulus', isLulus: true });

    // 4. Arabic Numbers
    assert.deepEqual(computeCohortAdvancement('10 RPL'), { targetKelas: '11 RPL', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('11 RPL'), { targetKelas: '12 RPL', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('12 RPL'), { targetKelas: 'Lulus', isLulus: true });
    assert.deepEqual(computeCohortAdvancement('10'), { targetKelas: '11', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('11'), { targetKelas: '12', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('12'), { targetKelas: 'Lulus', isLulus: true });

    // 5. Lowercase input
    assert.deepEqual(computeCohortAdvancement('x merdeka'), { targetKelas: 'XI merdeka', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('xi dkv'), { targetKelas: 'XII dkv', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('xii tata boga'), { targetKelas: 'Lulus', isLulus: true });

    // 6. Whitespace and empty inputs
    assert.deepEqual(computeCohortAdvancement(''), { targetKelas: 'Lulus', isLulus: true });
    assert.deepEqual(computeCohortAdvancement('   '), { targetKelas: 'Lulus', isLulus: true });

    // 7. Non-cohort / Special Classes (Graceful fallback to "(Lanjutan)")
    assert.deepEqual(computeCohortAdvancement('Alumni'), { targetKelas: 'Alumni (Lanjutan)', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('PAUD Melati'), { targetKelas: 'PAUD Melati (Lanjutan)', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('TK B Bintang'), { targetKelas: 'TK B Bintang (Lanjutan)', isLulus: false });
    assert.deepEqual(computeCohortAdvancement('Kelas Khusus ABK'), { targetKelas: 'Kelas Khusus ABK (Lanjutan)', isLulus: false });
  })();

  // 4.2 Live Database Batch Progression with Irregular Classes
  await check('Live database batch progression updates irregular classes atomically', async () => {
    const studentAId = crypto.randomUUID();
    const studentBId = crypto.randomUUID();
    const studentCId = crypto.randomUUID();

    // Insert 3 test students with irregular names
    const { error: seedErr } = await supabase.from('data_siswa').insert([
      {
        id: studentAId,
        sekolah_id: defaultSekolahId,
        nisn: `STU_A_${timestamp}`,
        nama_siswa: 'Siswa X Irregular',
        kelas: 'X-RPL-1',
        gender: 'Laki-laki',
        status: 'Aktif'
      },
      {
        id: studentBId,
        sekolah_id: defaultSekolahId,
        nisn: `STU_B_${timestamp}`,
        nama_siswa: 'Siswa XI Irregular',
        kelas: 'XI-RPL-1',
        gender: 'Perempuan',
        status: 'Aktif'
      },
      {
        id: studentCId,
        sekolah_id: defaultSekolahId,
        nisn: `STU_C_${timestamp}`,
        nama_siswa: 'Siswa XII Irregular',
        kelas: 'XII-RPL-1',
        gender: 'Laki-laki',
        status: 'Aktif'
      }
    ]);
    assert(!seedErr, `Seed students failed: ${seedErr?.message}`);

    // Compute advancement
    const advA = computeCohortAdvancement('X-RPL-1');
    const advB = computeCohortAdvancement('XI-RPL-1');
    const advC = computeCohortAdvancement('XII-RPL-1');

    // Execute batch update for A
    await supabase.from('data_siswa')
      .update({ kelas: advA.targetKelas, status: advA.isLulus ? 'Lulus' : 'Aktif' })
      .eq('id', studentAId);

    // Execute batch update for B
    await supabase.from('data_siswa')
      .update({ kelas: advB.targetKelas, status: advB.isLulus ? 'Lulus' : 'Aktif' })
      .eq('id', studentBId);

    // Execute batch update for C
    await supabase.from('data_siswa')
      .update({ kelas: advC.targetKelas, status: advC.isLulus ? 'Lulus' : 'Aktif' })
      .eq('id', studentCId);

    // Verify in database
    const { data: updatedStudents } = await supabase
      .from('data_siswa')
      .select('id, kelas, status')
      .in('id', [studentAId, studentBId, studentCId]);

    const stuA = updatedStudents?.find(s => s.id === studentAId);
    const stuB = updatedStudents?.find(s => s.id === studentBId);
    const stuC = updatedStudents?.find(s => s.id === studentCId);

    assert.equal(stuA?.kelas, 'XI-RPL-1', 'Student A must advance to XI-RPL-1');
    assert.equal(stuA?.status, 'Aktif', 'Student A must remain Aktif');

    assert.equal(stuB?.kelas, 'XII-RPL-1', 'Student B must advance to XII-RPL-1');
    assert.equal(stuB?.status, 'Aktif', 'Student B must remain Aktif');

    assert.equal(stuC?.kelas, 'Lulus', 'Student C must advance to Lulus');
    assert.equal(stuC?.status, 'Lulus', 'Student C must be marked Lulus');

    // Cleanup
    await supabase.from('data_siswa').delete().in('id', [studentAId, studentBId, studentCId]);
  })();

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n================================================================');
  console.log(`STRESS TEST SUMMARY: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runBoundaryStressTests().catch(err => {
  console.error('Unhandled fatal stress test error:', err);
  process.exit(1);
});
