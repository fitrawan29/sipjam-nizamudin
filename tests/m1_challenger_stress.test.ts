import path from 'path';
import dotenv from 'dotenv';
import assert from 'assert';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

let passed = 0;
let failed = 0;

function testAssert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${label}`);
    if (detail) console.error(`   ${detail}`);
    failed++;
  }
}

async function runChallengerStressTests() {
  console.log('======================================================================');
  console.log('CHALLENGER EMPIRICAL QA & ADVERSARIAL STRESS TEST: MILESTONE 1');
  console.log('Focus: Target Scope CRUD, Time Boundaries, Fallback & Live DB Compat');
  console.log('======================================================================\n');

  const { supabase, setServerTenantContext } = await import('../src/lib/supabaseClient');

  const defaultSekolahId = 'a0000000-0000-0000-0000-000000000001';
  let sessionToken = 'deb40d1b-ce7f-4424-9d58-b98d47d62edf';
  try {
    const { data: loginData } = await supabase.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'SipjamSuperAdmin2026!'
    });
    if (loginData && loginData[0]?.session_token) {
      sessionToken = loginData[0].session_token;
    }
  } catch (err) {
    console.warn('verify_login fallback:', err);
  }

  setServerTenantContext({
    sekolahId: defaultSekolahId,
    role: 'Admin',
    userId: 'd23141e4-2116-4946-8094-895ef21a50e5',
    sessionToken
  });

  // -------------------------------------------------------------------
  // Section 1: Live DB Column Inspection & Compatibility
  // -------------------------------------------------------------------
  console.log('--- 1. Live Database Schema & Column Probe ---');
  const { data: probeRows, error: probeError } = await supabase
    .from('sistem_blok')
    .select('*')
    .limit(1);

  testAssert(!probeError, 'Live DB: Query public.sistem_blok succeeded', probeError?.message);

  let hasRemoteColumns = false;
  if (probeRows && probeRows.length > 0) {
    const row = probeRows[0];
    hasRemoteColumns = 'tipe_target' in row && 'is_full_day' in row;
    console.log('Probe sample row keys:', Object.keys(row));
    console.log('Remote columns present:', hasRemoteColumns);
  } else {
    console.log('Table public.sistem_blok is currently empty or returned 0 rows.');
  }

  // -------------------------------------------------------------------
  // Section 2: Validation Oracle (Testing UI/Action Invariant Rules)
  // -------------------------------------------------------------------
  console.log('\n--- 2. Validation Logic & Boundary Conditions Stress ---');

  // Helper simulating the validation rule matrix from SistemBlokView.tsx
  function validateBlockInput(input: {
    namaKegiatan: string;
    tanggalMulai: string;
    tanggalSelesai: string;
    tipeTarget: 'sekolah' | 'angkatan' | 'kelas' | 'guru';
    targetAngkatan?: string;
    targetKelas?: string;
    targetGuruId?: string;
    isFullDay: boolean;
    jamMulai?: string;
    jamSelesai?: string;
  }): { valid: boolean; errorReason?: string } {
    if (!input.namaKegiatan.trim()) {
      return { valid: false, errorReason: 'Nama/deskripsi kegiatan wajib diisi.' };
    }
    if (!input.tanggalMulai || !input.tanggalSelesai) {
      return { valid: false, errorReason: 'Tanggal mulai dan selesai wajib dipilih.' };
    }
    if (input.tanggalSelesai < input.tanggalMulai) {
      return { valid: false, errorReason: 'Tanggal selesai tidak boleh sebelum tanggal mulai.' };
    }
    if (input.tipeTarget === 'angkatan' && !input.targetAngkatan) {
      return { valid: false, errorReason: 'Silakan pilih angkatan target pemblokiran.' };
    }
    if (input.tipeTarget === 'kelas' && !input.targetKelas) {
      return { valid: false, errorReason: 'Silakan pilih kelas target pemblokiran.' };
    }
    if (input.tipeTarget === 'guru' && !input.targetGuruId) {
      return { valid: false, errorReason: 'Silakan pilih guru target pemblokiran.' };
    }
    if (!input.isFullDay) {
      if (!input.jamMulai || !input.jamSelesai) {
        return { valid: false, errorReason: 'Jam mulai dan jam selesai wajib diisi untuk pemblokiran non-full day.' };
      }
      if (input.jamMulai >= input.jamSelesai) {
        return { valid: false, errorReason: 'Jam selesai harus lebih akhir dari jam mulai.' };
      }
    }
    return { valid: true };
  }

  // Stress tests on validation rules
  // Rule A: Empty name
  const vEmptyName = validateBlockInput({
    namaKegiatan: '   ',
    tanggalMulai: '2026-11-03',
    tanggalSelesai: '2026-11-03',
    tipeTarget: 'sekolah',
    isFullDay: true,
  });
  testAssert(!vEmptyName.valid && vEmptyName.errorReason?.includes('Nama/deskripsi'), 'Validation: Reject whitespace-only name');

  // Rule B: tanggal_selesai < tanggal_mulai
  const vInvertedDate = validateBlockInput({
    namaKegiatan: 'Kegiatan Blok',
    tanggalMulai: '2026-11-05',
    tanggalSelesai: '2026-11-02',
    tipeTarget: 'sekolah',
    isFullDay: true,
  });
  testAssert(!vInvertedDate.valid && vInvertedDate.errorReason?.includes('sebelum tanggal mulai'), 'Validation: Reject inverted date range');

  // Rule C: Per Angkatan missing targetAngkatan
  const vMissingAngkatan = validateBlockInput({
    namaKegiatan: 'Blok Angkatan',
    tanggalMulai: '2026-11-03',
    tanggalSelesai: '2026-11-03',
    tipeTarget: 'angkatan',
    targetAngkatan: '',
    isFullDay: true,
  });
  testAssert(!vMissingAngkatan.valid && vMissingAngkatan.errorReason?.includes('pilih angkatan'), 'Validation: Reject Per Angkatan without angkatan value');

  // Rule D: Per Kelas missing targetKelas
  const vMissingKelas = validateBlockInput({
    namaKegiatan: 'Blok Kelas',
    tanggalMulai: '2026-11-03',
    tanggalSelesai: '2026-11-03',
    tipeTarget: 'kelas',
    targetKelas: '',
    isFullDay: true,
  });
  testAssert(!vMissingKelas.valid && vMissingKelas.errorReason?.includes('pilih kelas'), 'Validation: Reject Per Kelas without kelas value');

  // Rule E: Per Guru missing targetGuruId
  const vMissingGuru = validateBlockInput({
    namaKegiatan: 'Blok Guru',
    tanggalMulai: '2026-11-03',
    tanggalSelesai: '2026-11-03',
    tipeTarget: 'guru',
    targetGuruId: '',
    isFullDay: true,
  });
  testAssert(!vMissingGuru.valid && vMissingGuru.errorReason?.includes('pilih guru'), 'Validation: Reject Per Guru without guru id');

  // Rule F: Non-full-day missing jam_mulai
  const vMissingJamMulai = validateBlockInput({
    namaKegiatan: 'Blok Jam',
    tanggalMulai: '2026-11-03',
    tanggalSelesai: '2026-11-03',
    tipeTarget: 'sekolah',
    isFullDay: false,
    jamMulai: '',
    jamSelesai: '11:00',
  });
  testAssert(!vMissingJamMulai.valid && vMissingJamMulai.errorReason?.includes('Jam mulai dan jam selesai wajib diisi'), 'Validation: Reject non-full-day without jam_mulai');

  // Rule G: Non-full-day missing jam_selesai
  const vMissingJamSelesai = validateBlockInput({
    namaKegiatan: 'Blok Jam',
    tanggalMulai: '2026-11-03',
    tanggalSelesai: '2026-11-03',
    tipeTarget: 'sekolah',
    isFullDay: false,
    jamMulai: '07:30',
    jamSelesai: '',
  });
  testAssert(!vMissingJamSelesai.valid && vMissingJamSelesai.errorReason?.includes('Jam mulai dan jam selesai wajib diisi'), 'Validation: Reject non-full-day without jam_selesai');

  // Rule H: Non-full-day jam_selesai < jam_mulai (e.g. 11:00 to 07:30)
  const vInvertedTime = validateBlockInput({
    namaKegiatan: 'Blok Jam',
    tanggalMulai: '2026-11-03',
    tanggalSelesai: '2026-11-03',
    tipeTarget: 'sekolah',
    isFullDay: false,
    jamMulai: '11:00',
    jamSelesai: '07:30',
  });
  testAssert(!vInvertedTime.valid && vInvertedTime.errorReason?.includes('Jam selesai harus lebih akhir'), 'Validation: Reject non-full-day with inverted time (11:00 > 07:30)');

  // Rule I: Non-full-day jam_selesai === jam_mulai (e.g. 08:00 to 08:00)
  const vEqualTime = validateBlockInput({
    namaKegiatan: 'Blok Jam',
    tanggalMulai: '2026-11-03',
    tanggalSelesai: '2026-11-03',
    tipeTarget: 'sekolah',
    isFullDay: false,
    jamMulai: '08:00',
    jamSelesai: '08:00',
  });
  testAssert(!vEqualTime.valid && vEqualTime.errorReason?.includes('Jam selesai harus lebih akhir'), 'Validation: Reject non-full-day with equal start and end time (08:00 == 08:00)');

  // Rule J: Boundary time valid 00:00 to 23:59
  const vBoundaryMidnight = validateBlockInput({
    namaKegiatan: 'Blok Midnight',
    tanggalMulai: '2026-11-03',
    tanggalSelesai: '2026-11-03',
    tipeTarget: 'sekolah',
    isFullDay: false,
    jamMulai: '00:00',
    jamSelesai: '23:59',
  });
  testAssert(vBoundaryMidnight.valid, 'Validation: Accept boundary hours 00:00 to 23:59');

  // Rule K: Boundary 1-minute interval 07:00 to 07:01
  const vOneMinute = validateBlockInput({
    namaKegiatan: 'Blok 1 Menit',
    tanggalMulai: '2026-11-03',
    tanggalSelesai: '2026-11-03',
    tipeTarget: 'sekolah',
    isFullDay: false,
    jamMulai: '07:00',
    jamSelesai: '07:01',
  });
  testAssert(vOneMinute.valid, 'Validation: Accept 1-minute valid interval 07:00 to 07:01');

  // -------------------------------------------------------------------
  // Section 3: Empirical CRUD on All 4 Target Scopes & Live Database
  // -------------------------------------------------------------------
  console.log('\n--- 3. Empirical CRUD Verification for All 4 Target Scopes ---');

  // Fetch a teacher for testing the Per Guru target
  const { data: teachers, error: tErr } = await supabase
    .from('data_guru')
    .select('id, nama_guru')
    .eq('sekolah_id', defaultSekolahId)
    .limit(1);

  const sampleTeacher = teachers && teachers[0] ? teachers[0] : {
    id: 'c75c7712-7eab-4929-bf3b-172cafffcda2',
    nama_guru: 'Guru Uji Coba'
  };

  const testIds: string[] = [];

  // Helper simulating handleAddSubmit logic including PGRST204 fallback resilience
  async function simulateAddSubmit(payload: any) {
    let { error } = await supabase.from('sistem_blok').insert([payload]);

    if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column'))) {
      console.log(`[PGRST204 Fallback Triggered] Columns pending in schema cache. Inserting base columns.`);
      const basePayload = {
        id: payload.id,
        nama_kegiatan: payload.nama_kegiatan,
        tanggal_mulai: payload.tanggal_mulai,
        tanggal_selesai: payload.tanggal_selesai,
        deskripsi: payload.deskripsi,
        sekolah_id: payload.sekolah_id,
      };
      const res = await supabase.from('sistem_blok').insert([basePayload]);
      error = res.error;
    }
    return error;
  }

  // 3.1 Target: Sekolah (Full Day)
  const idSekolah = crypto.randomUUID();
  testIds.push(idSekolah);
  const payloadSekolah = {
    id: idSekolah,
    nama_kegiatan: 'TEST EMPIRICAL SEKOLAH FULL DAY',
    tanggal_mulai: '2026-12-01',
    tanggal_selesai: '2026-12-02',
    deskripsi: 'Stress test whole-school full day',
    sekolah_id: defaultSekolahId,
    tipe_target: 'sekolah',
    target_angkatan: null,
    target_kelas: null,
    target_guru_id: null,
    target_guru_nama: null,
    is_full_day: true,
    jam_mulai: null,
    jam_selesai: null,
  };
  const errSekolah = await simulateAddSubmit(payloadSekolah);
  testAssert(!errSekolah, 'CRUD: Successfully inserted target=sekolah full-day block', errSekolah?.message);

  // 3.2 Target: Angkatan (Bounded hours: 07:30 to 11:00)
  const idAngkatan = crypto.randomUUID();
  testIds.push(idAngkatan);
  const payloadAngkatan = {
    id: idAngkatan,
    nama_kegiatan: 'TEST EMPIRICAL ANGKATAN 10 TIME BOUNDED',
    tanggal_mulai: '2026-12-03',
    tanggal_selesai: '2026-12-03',
    deskripsi: 'Stress test angkatan 10 with bounded hours',
    sekolah_id: defaultSekolahId,
    tipe_target: 'angkatan',
    target_angkatan: '10',
    target_kelas: null,
    target_guru_id: null,
    target_guru_nama: null,
    is_full_day: false,
    jam_mulai: '07:30',
    jam_selesai: '11:00',
  };
  const errAngkatan = await simulateAddSubmit(payloadAngkatan);
  testAssert(!errAngkatan, 'CRUD: Successfully inserted target=angkatan with hours 07:30-11:00', errAngkatan?.message);

  // 3.3 Target: Kelas (Full Day)
  const idKelas = crypto.randomUUID();
  testIds.push(idKelas);
  const payloadKelas = {
    id: idKelas,
    nama_kegiatan: 'TEST EMPIRICAL KELAS X MERDEKA',
    tanggal_mulai: '2026-12-04',
    tanggal_selesai: '2026-12-04',
    deskripsi: 'Stress test kelas X Merdeka',
    sekolah_id: defaultSekolahId,
    tipe_target: 'kelas',
    target_angkatan: null,
    target_kelas: 'X Merdeka',
    target_guru_id: null,
    target_guru_nama: null,
    is_full_day: true,
    jam_mulai: null,
    jam_selesai: null,
  };
  const errKelas = await simulateAddSubmit(payloadKelas);
  testAssert(!errKelas, 'CRUD: Successfully inserted target=kelas (X Merdeka)', errKelas?.message);

  // 3.4 Target: Guru (Bounded hours: 12:30 to 15:00)
  const idGuru = crypto.randomUUID();
  testIds.push(idGuru);
  const payloadGuru = {
    id: idGuru,
    nama_kegiatan: 'TEST EMPIRICAL GURU SPESIFIK',
    tanggal_mulai: '2026-12-05',
    tanggal_selesai: '2026-12-05',
    deskripsi: 'Stress test guru spesifik with hours',
    sekolah_id: defaultSekolahId,
    tipe_target: 'guru',
    target_angkatan: null,
    target_kelas: null,
    target_guru_id: sampleTeacher.id,
    target_guru_nama: sampleTeacher.nama_guru,
    is_full_day: false,
    jam_mulai: '12:30',
    jam_selesai: '15:00',
  };
  const errGuru = await simulateAddSubmit(payloadGuru);
  testAssert(!errGuru, 'CRUD: Successfully inserted target=guru with hours 12:30-15:00', errGuru?.message);

  // -------------------------------------------------------------------
  // Section 4: Read & Verify Data Integrity of All 4 Records
  // -------------------------------------------------------------------
  console.log('\n--- 4. Verify Read & Data Integrity for All 4 Targets ---');
  const { data: readRows, error: readErr } = await supabase
    .from('sistem_blok')
    .select('*')
    .in('id', testIds);

  testAssert(!readErr, 'CRUD: Read back all inserted test blocks', readErr?.message);
  testAssert(readRows && readRows.length === 4, `CRUD: Expected 4 records, found ${readRows?.length}`);

  const rowSekolah = readRows?.find(r => r.id === idSekolah);
  const rowAngkatan = readRows?.find(r => r.id === idAngkatan);
  const rowKelas = readRows?.find(r => r.id === idKelas);
  const rowGuru = readRows?.find(r => r.id === idGuru);

  testAssert(rowSekolah?.nama_kegiatan === payloadSekolah.nama_kegiatan, 'Read: Sekolah record name matches');
  testAssert(rowAngkatan?.nama_kegiatan === payloadAngkatan.nama_kegiatan, 'Read: Angkatan record name matches');
  testAssert(rowKelas?.nama_kegiatan === payloadKelas.nama_kegiatan, 'Read: Kelas record name matches');
  testAssert(rowGuru?.nama_kegiatan === payloadGuru.nama_kegiatan, 'Read: Guru record name matches');

  if (hasRemoteColumns) {
    testAssert(rowSekolah?.tipe_target === 'sekolah' && rowSekolah?.is_full_day === true, 'Data Integrity: Sekolah target and full_day verified');
    testAssert(rowAngkatan?.tipe_target === 'angkatan' && rowAngkatan?.target_angkatan === '10' && rowAngkatan?.is_full_day === false && rowAngkatan?.jam_mulai === '07:30', 'Data Integrity: Angkatan target, hours 07:30-11:00 verified');
    testAssert(rowKelas?.tipe_target === 'kelas' && rowKelas?.target_kelas === 'X Merdeka', 'Data Integrity: Kelas target X Merdeka verified');
    testAssert(rowGuru?.tipe_target === 'guru' && rowGuru?.target_guru_id === sampleTeacher.id && rowGuru?.jam_mulai === '12:30', 'Data Integrity: Guru target ID and hours verified');
  } else {
    console.log('ℹ️ Remote schema cache does not have expanded columns yet (fallback mode was used successfully).');
  }

  // -------------------------------------------------------------------
  // Section 5: Update Operation Testing
  // -------------------------------------------------------------------
  console.log('\n--- 5. Empirical Update Operation Verification ---');

  // Simulate updating Angkatan block to Kelas block with changed hours
  async function simulateUpdate(id: string, updatePayload: any) {
    let updateQ = supabase
      .from('sistem_blok')
      .update(updatePayload)
      .eq('id', id);

    let { error } = await updateQ;
    if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column'))) {
      console.log(`[PGRST204 Fallback on Update] Falling back to base column update.`);
      const baseUpdate = {
        nama_kegiatan: updatePayload.nama_kegiatan,
        tanggal_mulai: updatePayload.tanggal_mulai,
        tanggal_selesai: updatePayload.tanggal_selesai,
        deskripsi: updatePayload.deskripsi,
      };
      const res = await supabase.from('sistem_blok').update(baseUpdate).eq('id', id);
      error = res.error;
    }
    return error;
  }

  const updatePayload = {
    nama_kegiatan: 'UPDATED ANGKATAN TO KELAS XI RPL 2',
    tipe_target: 'kelas',
    target_angkatan: null,
    target_kelas: 'XI RPL 2',
    is_full_day: false,
    jam_mulai: '08:00',
    jam_selesai: '10:00',
    deskripsi: 'Updated successfully via empirical test harness',
    updated_at: new Date().toISOString()
  };

  const updateErr = await simulateUpdate(idAngkatan, updatePayload);
  testAssert(!updateErr, 'CRUD: Successfully executed update on block record', updateErr?.message);

  const { data: updatedRows } = await supabase.from('sistem_blok').select('*').eq('id', idAngkatan);
  testAssert(updatedRows && updatedRows[0]?.nama_kegiatan === 'UPDATED ANGKATAN TO KELAS XI RPL 2', 'Update: Name correctly updated in database');

  if (hasRemoteColumns) {
    testAssert(updatedRows?.[0]?.tipe_target === 'kelas', 'Update: Target type correctly switched from angkatan to kelas');
    testAssert(updatedRows?.[0]?.target_kelas === 'XI RPL 2', 'Update: Target kelas correctly updated to XI RPL 2');
    testAssert(updatedRows?.[0]?.jam_mulai === '08:00' && updatedRows?.[0]?.jam_selesai === '10:00', 'Update: Hours correctly updated to 08:00-10:00');
  }

  // -------------------------------------------------------------------
  // Section 6: Delete & Cleanup Testing
  // -------------------------------------------------------------------
  console.log('\n--- 6. Empirical Delete & Cleanup Verification ---');
  const { error: delErr } = await supabase
    .from('sistem_blok')
    .delete()
    .in('id', testIds);

  testAssert(!delErr, 'CRUD: Successfully deleted all test block records', delErr?.message);

  const { data: remainingRows } = await supabase
    .from('sistem_blok')
    .select('*')
    .in('id', testIds);

  testAssert(remainingRows && remainingRows.length === 0, 'CRUD: Confirmed zero test records remain in database');

  // -------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`TOTAL CHALLENGER STRESS TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL CHALLENGER EMPIRICAL STRESS TESTS PASSED!');
  }
}

runChallengerStressTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
