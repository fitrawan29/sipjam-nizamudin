import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const defaultSekolahId = 'a0000000-0000-0000-0000-000000000001';

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-user-role': 'Superadmin',
      'x-sekolah-id': defaultSekolahId
    }
  }
});

async function runAttendanceSyncTests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING ATTENDANCE SYNCHRONIZATION & WALI KELAS TEST SUITE');
  console.log('===============================================================\n');

  const testKelas = 'X-SYNC-TEST-' + Date.now().toString().slice(-4);
  const testNisn = 'TEST_' + Date.now().toString().slice(-6);
  const testStudentId = crypto.randomUUID();
  const testStudentName = 'Siswa Pengujian Sinkronisasi';
  const testDate = '2026-09-17';
  const testJournalId = crypto.randomUUID();

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Admin Wali Kelas Assignment (Table: public.wali_kelas)
    // ------------------------------------------------------------------------
    console.log('📌 Test 1: Testing Admin Wali Kelas Assignment in public.wali_kelas...');
    const waliAssignment = {
      id: crypto.randomUUID(),
      sekolah_id: defaultSekolahId,
      kelas: testKelas,
      nama_guru: 'Fitri Aprilia Dotulong, S.Pd.',
      nip: '198501012010011001',
      tahun_ajaran: '2024/2025'
    };

    const { data: waliData, error: waliError } = await supabase
      .from('wali_kelas')
      .upsert([waliAssignment], { onConflict: 'sekolah_id, kelas' })
      .select()
      .single();

    if (waliError) {
      throw new Error(`Failed to assign Wali Kelas: ${waliError.message}`);
    }

    if (!waliData || waliData.kelas !== testKelas || waliData.nama_guru !== waliAssignment.nama_guru) {
      throw new Error(`Wali Kelas record mismatch: ${JSON.stringify(waliData)}`);
    }
    console.log(`✅ Test 1 Passed: Wali Kelas assigned for ${testKelas} -> ${waliData.nama_guru} (${waliData.nip})`);

    // ------------------------------------------------------------------------
    // TEST 2: Seed Test Student & Initial Journal Session
    // ------------------------------------------------------------------------
    console.log('\n📌 Test 2: Creating Test Student & Journal Session...');
    const { error: studentError } = await supabase.from('data_siswa').insert([{
      id: testStudentId,
      sekolah_id: defaultSekolahId,
      nisn: testNisn,
      nama_siswa: testStudentName,
      kelas: testKelas,
      gender: 'Laki-laki',
      status: 'Aktif'
    }]);

    if (studentError) {
      throw new Error(`Failed to insert test student: ${studentError.message}`);
    }

    const initialAttendanceMap = { [testNisn]: 'Hadir' };
    const { error: journalError } = await supabase.from('jurnal_pembelajaran').insert([{
      id: testJournalId,
      sekolah_id: defaultSekolahId,
      tanggal: testDate,
      kelas: testKelas,
      mapel: 'Fisika Test',
      nama_guru: 'Guru Fisika Test',
      materi: 'Gelombang Mekanik',
      kegiatan: 'Eksperimen Resonansi',
      absensi_siswa: JSON.stringify(initialAttendanceMap),
      keterangan: 'Jurnal KBM',
      status_verifikasi: 'Menunggu',
      pertemuan_ke: '1',
      jam_ke: '1-2'
    }]);

    if (journalError) {
      throw new Error(`Failed to insert test journal: ${journalError.message}`);
    }
    console.log(`✅ Test 2 Passed: Student created (NISN: ${testNisn}) and Journal initialized with status: Hadir`);

    // ------------------------------------------------------------------------
    // TEST 3: Piket Attendance Input & Canonical Upsert to public.absensi
    // ------------------------------------------------------------------------
    console.log('\n📌 Test 3: Simulating Piket marking student as Sakit...');
    const piketTimestamp = '2026-09-17 07:45:12 WITA';
    const piketActor = 'Ade Fitrawan (Piket)';
    const piketLog = `[${piketTimestamp}] Diubah ke Sakit oleh ${piketActor}. Keterangan: Demam tinggi`;

    const { error: piketAbsensiError } = await supabase.from('absensi').upsert([{
      id: crypto.randomUUID(),
      sekolah_id: defaultSekolahId,
      tanggal: testDate,
      kelas: testKelas,
      siswa_id: testStudentId,
      nisn: testNisn,
      nama_siswa: testStudentName,
      status: 'Sakit',
      keterangan: 'Demam tinggi',
      sumber_perubahan: 'Piket',
      diubah_oleh: 'Ade Fitrawan',
      log_perubahan: [piketLog]
    }], { onConflict: 'sekolah_id, tanggal, nisn' });

    if (piketAbsensiError) {
      throw new Error(`Failed to upsert piket attendance: ${piketAbsensiError.message}`);
    }

    // Verify record in public.absensi
    const { data: absensiPiketRecord, error: verifyAbsensiError } = await supabase
      .from('absensi')
      .select('*')
      .eq('sekolah_id', defaultSekolahId)
      .eq('tanggal', testDate)
      .eq('nisn', testNisn)
      .single();

    if (verifyAbsensiError || !absensiPiketRecord) {
      throw new Error(`Failed to retrieve absensi record: ${verifyAbsensiError?.message}`);
    }

    if (absensiPiketRecord.status !== 'Sakit' || absensiPiketRecord.sumber_perubahan !== 'Piket') {
      throw new Error(`Absensi record unexpected state: ${JSON.stringify(absensiPiketRecord)}`);
    }

    if (!absensiPiketRecord.log_perubahan || !absensiPiketRecord.log_perubahan[0].includes('Ade Fitrawan (Piket)')) {
      throw new Error(`log_perubahan does not record actor details correctly: ${JSON.stringify(absensiPiketRecord.log_perubahan)}`);
    }
    console.log(`✅ Test 3 Passed: public.absensi updated with status Sakit, actor Ade Fitrawan (Piket), and log_perubahan verified.`);

    // ------------------------------------------------------------------------
    // TEST 4: Automatic PostgreSQL Trigger Synchronization to Jurnal Pembelajaran
    // ------------------------------------------------------------------------
    console.log('\n📌 Test 4: Verifying PostgreSQL Trigger trg_sync_absensi_to_jurnal synced to Jurnal...');
    const { data: syncedJournal, error: syncQueryError } = await supabase
      .from('jurnal_pembelajaran')
      .select('id, absensi_siswa')
      .eq('id', testJournalId)
      .single();

    if (syncQueryError || !syncedJournal) {
      throw new Error(`Failed to query updated journal: ${syncQueryError?.message}`);
    }

    const parsedJournalAbsensi = JSON.parse(syncedJournal.absensi_siswa || '{}');
    if (parsedJournalAbsensi[testNisn] !== 'Sakit') {
      throw new Error(`Trigger sync failed! Expected student ${testNisn} to be Sakit in journal absensi_siswa, got: ${parsedJournalAbsensi[testNisn]}`);
    }
    console.log(`✅ Test 4 Passed: Trigger trg_sync_absensi_to_jurnal automatically updated jurnal_pembelajaran.absensi_siswa: ${syncedJournal.absensi_siswa}`);

    // ------------------------------------------------------------------------
    // TEST 5: Wali Kelas Attendance Update & Multi-Event Audit Trail
    // ------------------------------------------------------------------------
    console.log('\n📌 Test 5: Simulating Wali Kelas updating status to Izin with cumulative audit trail...');
    const waliTimestamp = '2026-09-17 09:15:30 WITA';
    const waliActor = 'Fitri Aprilia Dotulong (Wali Kelas)';
    const waliLog = `[${waliTimestamp}] Diubah ke Izin oleh ${waliActor}. Keterangan: Mengikuti acara keluarga`;
    const cumulativeLogs = [...(absensiPiketRecord.log_perubahan || []), waliLog];

    const { error: waliUpdateError } = await supabase.from('absensi').upsert([{
      id: absensiPiketRecord.id,
      sekolah_id: defaultSekolahId,
      tanggal: testDate,
      kelas: testKelas,
      siswa_id: testStudentId,
      nisn: testNisn,
      nama_siswa: testStudentName,
      status: 'Izin',
      keterangan: 'Mengikuti acara keluarga',
      sumber_perubahan: 'Wali Kelas',
      diubah_oleh: 'Fitri Aprilia Dotulong',
      log_perubahan: cumulativeLogs
    }], { onConflict: 'sekolah_id, tanggal, nisn' });

    if (waliUpdateError) {
      throw new Error(`Failed to update absensi via Wali Kelas: ${waliUpdateError.message}`);
    }

    // Verify second sync to journal
    const { data: journalAfterWali, error: secondSyncError } = await supabase
      .from('jurnal_pembelajaran')
      .select('id, absensi_siswa')
      .eq('id', testJournalId)
      .single();

    if (secondSyncError || !journalAfterWali) {
      throw new Error(`Failed to query journal after Wali update: ${secondSyncError?.message}`);
    }

    const parsedSecondJournal = JSON.parse(journalAfterWali.absensi_siswa || '{}');
    if (parsedSecondJournal[testNisn] !== 'Izin') {
      throw new Error(`Trigger second sync failed! Expected ${testNisn} to be Izin in journal, got: ${parsedSecondJournal[testNisn]}`);
    }

    // Verify multi-entry log_perubahan
    const { data: absensiFinalRecord } = await supabase
      .from('absensi')
      .select('*')
      .eq('sekolah_id', defaultSekolahId)
      .eq('tanggal', testDate)
      .eq('nisn', testNisn)
      .single();

    if (!absensiFinalRecord || absensiFinalRecord.log_perubahan?.length !== 2) {
      throw new Error(`Expected exactly 2 audit log entries, found: ${absensiFinalRecord?.log_perubahan?.length}`);
    }
    console.log(`✅ Test 5 Passed: Wali Kelas update synchronized to journal (status: Izin). Audit trail contains 2 chronological events:`);
    absensiFinalRecord.log_perubahan.forEach((log: string, idx: number) => {
      console.log(`   [Log #${idx + 1}] ${log}`);
    });

  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------------------
    console.log('\n🧹 Cleaning up test artifacts...');
    await supabase.from('jurnal_pembelajaran').delete().eq('id', testJournalId);
    await supabase.from('absensi').delete().eq('nisn', testNisn);
    await supabase.from('data_siswa').delete().eq('id', testStudentId);
    await supabase.from('wali_kelas').delete().eq('kelas', testKelas);
    console.log('✅ Cleanup completed successfully.');
  }

  console.log('\n===============================================================');
  console.log('🎉 ALL ATTENDANCE SYNCHRONIZATION TESTS PASSED WITH EXIT CODE 0');
  console.log('===============================================================\n');
}

runAttendanceSyncTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
