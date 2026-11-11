import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { isJurnalMatchJadwal, canTeacherPresensiPulang, GuruDailyState } from '../src/lib/workflow';

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}:`, err?.message || err);
    failed++;
  }
}

async function runAll() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TEST SUITE: PEMISAHAN ABSENSI SISWA DAN JURNAL KBM (R1 - R3)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const root = path.resolve(__dirname, '..');
  const homeViewGuruPath = path.join(root, 'src', 'components', 'HomeViewGuru.tsx');
  const guruJurnalPath = path.join(root, 'src', 'components', 'GuruJurnal.tsx');

  const homeContent = fs.readFileSync(homeViewGuruPath, 'utf8');
  const jurnalContent = fs.readFileSync(guruJurnalPath, 'utf8');

  // ==========================================================================
  // SECTION 1: R1 - PEMISAHAN ANTARMUKA PENGISIAN ABSENSI DAN JURNAL KBM
  // ==========================================================================
  console.log('--- Section 1: R1 - Pemisahan Antarmuka (HomeViewGuru & GuruJurnal) ---');

  await runTest('1.1: HomeViewGuru menyediakan tombol terpisah untuk Absensi Siswa dan Jurnal KBM', () => {
    // Check handleOpenKbmSession is defined with mode parameter
    assert.ok(
      homeContent.includes("handleOpenKbmSession = (jk: any, mode: 'absensi' | 'jurnal') =>"),
      'HomeViewGuru must have handleOpenKbmSession with mode parameter'
    );

    // Check separate button for Absensi Siswa
    assert.ok(
      homeContent.includes("handleOpenKbmSession(jk, 'absensi')"),
      'Schedule cards must have dedicated button trigger for Absensi Siswa'
    );
    assert.ok(
      homeContent.includes('Absensi Siswa') || homeContent.includes('Absensi ✓'),
      'Button text for Absensi Siswa must be present'
    );

    // Check separate button for Jurnal KBM
    assert.ok(
      homeContent.includes("handleOpenKbmSession(jk, 'jurnal')"),
      'Schedule cards must have dedicated button trigger for Jurnal KBM'
    );
    assert.ok(
      homeContent.includes('Isi Jurnal') || homeContent.includes('Jurnal ✓'),
      'Button text for Jurnal KBM must be present'
    );

    // Check session intent passes mode via localStorage and URL params
    assert.ok(
      homeContent.includes("localStorage.setItem('sipjam_kbm_session_intent'"),
      'Active session payload must be stored in localStorage under sipjam_kbm_session_intent'
    );
    assert.ok(
      homeContent.includes("url.searchParams.set('mode', mode)"),
      'URL mode parameter must be synchronized'
    );
  });

  await runTest('1.2: HomeViewGuru menampilkan status progres untuk kedua aktivitas (Jurnal & Absensi)', () => {
    assert.ok(
      homeContent.includes('kelas reguler'),
      'Schedule section must display regular classes progress'
    );
    assert.ok(
      homeContent.includes('Absensi:'),
      'Schedule section must display student attendance progress'
    );
  });

  await runTest('1.3: GuruJurnal menyediakan sub-mode switcher: Pengisian Absensi Siswa vs Pengisian Jurnal KBM', () => {
    // Check state definition
    assert.ok(
      jurnalContent.includes("const [kbmSubMode, setKbmSubMode] = useState<'absensi' | 'jurnal'>('absensi')"),
      'GuruJurnal must maintain kbmSubMode state'
    );

    // Check handler or tab switcher for both sub-modes
    assert.ok(
      jurnalContent.includes("handleKbmSubModeChange('absensi')"),
      'GuruJurnal must provide trigger to switch to Absensi Siswa'
    );
    assert.ok(
      jurnalContent.includes("handleKbmSubModeChange('jurnal')"),
      'GuruJurnal must provide trigger to switch to Jurnal KBM'
    );
    assert.ok(
      jurnalContent.includes('Pengisian Absensi Siswa'),
      'Tab label "Pengisian Absensi Siswa" must be present'
    );
    assert.ok(
      jurnalContent.includes('Pengisian Jurnal KBM'),
      'Tab label "Pengisian Jurnal KBM" must be present'
    );
  });

  await runTest('1.4: GuruJurnal menyediakan fungsi penyimpanan mandiri untuk Absensi Siswa (handleSaveAbsensiOnly)', () => {
    assert.ok(
      jurnalContent.includes('const handleSaveAbsensiOnly = async () =>'),
      'GuruJurnal must define handleSaveAbsensiOnly'
    );
    assert.ok(
      jurnalContent.includes('Simpan Absensi Siswa'),
      'GuruJurnal must have "Simpan Absensi Siswa" button in absensi sub-mode'
    );
    assert.ok(
      jurnalContent.includes('onClick={handleSaveAbsensiOnly}'),
      'Absensi submit button must call handleSaveAbsensiOnly'
    );
  });

  await runTest('1.5: GuruJurnal menyediakan tombol dan submit mandiri untuk Jurnal KBM (handleJurnalSubmit)', () => {
    assert.ok(
      jurnalContent.includes('Simpan Jurnal KBM'),
      'GuruJurnal must have "Simpan Jurnal KBM" button in jurnal sub-mode'
    );
    assert.ok(
      jurnalContent.includes('onSubmit={handleJurnalSubmit}'),
      'Jurnal form must invoke handleJurnalSubmit'
    );
  });

  // ==========================================================================
  // SECTION 2: R2 - PERHITUNGAN TERPADU SESI KBM
  // ==========================================================================
  console.log('\n--- Section 2: R2 - Perhitungan Terpadu Sesi KBM ---');

  await runTest('2.1: Absensi mandiri dan Jurnal mandiri disimpan dalam tabel jurnal_pembelajaran yang sama', () => {
    // In handleSaveAbsensiOnly
    assert.ok(
      jurnalContent.includes("from('jurnal_pembelajaran')"),
      'Both handlers must target jurnal_pembelajaran table'
    );
    assert.ok(
      jurnalContent.includes('absensi_siswa: JSON.stringify(cleanAbsensiForSave)'),
      'handleSaveAbsensiOnly must serialize student attendance into absensi_siswa column'
    );
    assert.ok(
      jurnalContent.includes('kehadiran_murid: computedKehadiran'),
      'handleSaveAbsensiOnly must record kehadiran_murid summary'
    );
  });

  await runTest('2.2: handleJurnalSubmit mempertahankan data absensi siswa yang telah tersimpan jika tidak diubah', () => {
    assert.ok(
      jurnalContent.includes('absensi_siswa: finalAbsensiJson'),
      'handleJurnalSubmit must preserve finalAbsensiJson from existing session if not re-entered'
    );
    assert.ok(
      jurnalContent.includes('kehadiran_murid: finalKehadiranSummary'),
      'handleJurnalSubmit must preserve existing kehadiranSummary'
    );
  });

  await runTest('2.3: handleSaveAbsensiOnly mempertahankan data jurnal yang telah ada (materi, kegiatan, link_bukti_foto)', () => {
    // When updating existing session row, updatePayload only modifies absensi fields:
    assert.ok(
      jurnalContent.includes('absensi_siswa: JSON.stringify(cleanAbsensiForSave)') &&
      jurnalContent.includes('catatan_khusus_siswa: catatanSiswa || existing.catatan_khusus_siswa || null'),
      'handleSaveAbsensiOnly updates attendance without overwriting existing journal fields'
    );
  });

  await runTest('2.4: Sinkronisasi siswa alpa/bolos otomatis tetap terpicu saat absensi disimpan mandiri', () => {
    assert.ok(
      jurnalContent.includes("keterangan: `Terindikasi Bolos (Hadir Pagi, Alfa Mapel ${mapel || 'KBM'})`"),
      'handleSaveAbsensiOnly must synchronize auto-bolos students'
    );
  });

  await runTest('2.5: isJurnalMatchJadwal mencocokkan record sesi KBM dengan jadwal tanpa bergantung apakah disimpan via absensi atau jurnal', () => {
    const jadwal = {
      id: 'jadwal-1',
      hari: 'Senin',
      mapel: 'Matematika',
      kelas: 'XII IPA 1',
      jam_ke: '1-2',
      guru_id: 'guru-123'
    };

    // Case A: Jurnal record created from Absensi mode (contains attendance, placeholder materi)
    const jurnalFromAbsensi = {
      id: 'jurnal-1',
      tanggal: '2026-11-11',
      mapel: 'Matematika',
      kelas: 'XII IPA 1',
      jam_ke: '1-2',
      guru_id: 'guru-123',
      absensi_siswa: JSON.stringify([{ id: 's1', status: 'Hadir' }]),
      kehadiran_murid: 'Hadir: 1, Sakit: 0, Izin: 0, Alpa: 0',
      materi: 'KBM Kelas XII IPA 1'
    };

    // Case B: Jurnal record created from Jurnal mode (contains materi & kegiatan)
    const jurnalFromKbm = {
      id: 'jurnal-2',
      tanggal: '2026-11-11',
      mapel: 'Matematika',
      kelas: 'XII IPA 1',
      jam_ke: '1-2',
      guru_id: 'guru-123',
      materi: 'Trigonometri Dasar',
      kegiatan: 'Diskusi kelompok dan latihan soal'
    };

    assert.strictEqual(
      isJurnalMatchJadwal(jurnalFromAbsensi, jadwal),
      true,
      'isJurnalMatchJadwal must match session created from Absensi mode'
    );
    assert.strictEqual(
      isJurnalMatchJadwal(jurnalFromKbm, jadwal),
      true,
      'isJurnalMatchJadwal must match session created from Jurnal mode'
    );
  });

  await runTest('2.6: canTeacherPresensiPulang memperhitungkan sesi KBM terpadu dalam validasi kepulangan guru', () => {
    const stateWithCompletedKbmSession: Partial<GuruDailyState> = {
      presensiDatang: { id: 'p-1', tipe_absen: 'Datang', timestamp: '2026-11-11T07:00:00+08:00' },
      isIzinSakit: false,
      isPiket: false,
      jadwalKBM: [
        { id: 'j-1', mapel: 'Bahasa Indonesia', kelas: 'X RPL 1', jam_ke: '1' }
      ],
      jurnalKBM: [
        {
          id: 'jur-1',
          mapel: 'Bahasa Indonesia',
          kelas: 'X RPL 1',
          jam_ke: '1',
          materi: 'Teks Eksplanasi',
          absensi_siswa: JSON.stringify([{ id: 's1', status: 'Hadir' }])
        }
      ],
      jurnalKegiatan: null
    };

    const canPulang = canTeacherPresensiPulang(stateWithCompletedKbmSession);
    assert.strictEqual(canPulang, true, 'Teacher can presensi pulang when KBM session is satisfied');
  });

  // ==========================================================================
  // SECTION 3: R3 - MINIMALIS (/ponytail) DAN PRESERVASI AST INVARIANTS
  // ==========================================================================
  console.log('\n--- Section 3: R3 - Minimalis & AST Invariant Preservations ---');

  await runTest('3.1: AST Invariants preserved in GuruJurnal.tsx', () => {
    assert.ok(
      jurnalContent.includes('AST preservation: Terapkan Presensi Piket'),
      'AST comment "Terapkan Presensi Piket" must be preserved'
    );
    assert.ok(
      jurnalContent.includes('AST preservation: Terindikasi Bolos'),
      'AST comment for Terindikasi Bolos must be preserved'
    );
    assert.ok(
      jurnalContent.includes('isUploadAllowed = true'),
      'isUploadAllowed = true must be preserved'
    );
    assert.ok(
      jurnalContent.includes('id="panel-input"'),
      'panel-input keep-alive container must be preserved'
    );
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAll();
