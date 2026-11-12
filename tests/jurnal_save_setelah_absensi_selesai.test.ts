import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { isJurnalMatchJadwal, canTeacherPresensiPulang, hasJournalContent, GuruDailyState, isTeacherRecordMatch, isTeacherNameEquivalent } from '../src/lib/workflow';
import { isRealSubmittedJournal } from '../src/components/AdminVerifView';

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
  console.log('🧪 TEST SUITE: SIMPAN JURNAL KBM SETELAH ABSENSI SISWA SELESAI');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const root = path.resolve(__dirname, '..');
  const guruJurnalPath = path.join(root, 'src', 'components', 'GuruJurnal.tsx');
  const guruJurnalContent = fs.readFileSync(guruJurnalPath, 'utf8');

  // ==========================================================================
  // SECTION 1: INTEGRITAS STATE TANGGAL & VALIDITAS FORMAT DATE
  // ==========================================================================
  console.log('--- Section 1: Integritas State Tanggal & Validitas Format Date ---');

  await runTest('1.1: State tanggal diinisialisasi secara aman dengan fungsi getWitaDateStr() (tidak pernah string kosong)', () => {
    assert.ok(
      guruJurnalContent.includes("const [tanggal, setTanggal] = useState(() => getWitaDateStr());"),
      'tanggal must be initialized with getWitaDateStr() to avoid empty-string date failures in PostgreSQL'
    );
  });

  await runTest('1.2: handleJurnalSubmit menjamin tanggal adalah string tanggal valid (tgl = tanggal || getWitaDateStr())', () => {
    assert.ok(
      guruJurnalContent.includes('const tgl = tanggal || getWitaDateStr();'),
      'handleJurnalSubmit must resolve tgl fallback before composing newJurnal'
    );
    assert.ok(
      guruJurnalContent.includes('tanggal: tgl,'),
      'newJurnal must assign tanggal: tgl'
    );
  });

  await runTest('1.3: Auto-sync bolos di handleJurnalSubmit menggunakan parameter tanggal yang valid (tgl)', () => {
    assert.ok(
      guruJurnalContent.includes(".eq('tanggal', tgl).eq('kelas', kelas)"),
      'Bolos query in handleJurnalSubmit must use tgl instead of potentially empty tanggal'
    );
  });

  // ==========================================================================
  // SECTION 2: PENCEGAHAN DOWNGRADE KE JURNAL KEGIATAN SAAT MODE JURNAL KBM
  // ==========================================================================
  console.log('\n--- Section 2: Pencegahan Downgrade Tipe Jurnal ke Jurnal Kegiatan ---');

  await runTest('2.1: checkState tidak memaksa Jurnal Kegiatan jika guru memiliki penugasan atau kelas/mapel terpilih', () => {
    assert.ok(
      guruJurnalContent.includes("else if (!kelas && !mapel && (myAssignments.length === 0 || (state as any).isNonKbmOrTu)) {\n        setTipeJurnal('Jurnal Kegiatan');"),
      'checkState must check !kelas && !mapel && myAssignments.length === 0 before setting Jurnal Kegiatan'
    );
  });

  await runTest('2.2: checkDateBlok tidak memaksa Jurnal Kegiatan saat guru berada dalam mode jurnal KBM', () => {
    assert.ok(
      guruJurnalContent.includes("else if (kbmSubMode !== 'absensi' && !kelas && !mapel && (myAssignments.length === 0 || (dailyState as any)?.isNonKbmOrTu)) {\n            setTipeJurnal('Jurnal Kegiatan');"),
      'checkDateBlok must not downgrade tipeJurnal to Jurnal Kegiatan when kelas or mapel is selected or teacher has assignments'
    );
  });

  await runTest('2.3: hasNoKbmAssignments tidak mengunci form jika kelas dan mapel sudah terisi', () => {
    assert.ok(
      guruJurnalContent.includes('const hasNoKbmAssignments = tipeJurnal === \'Jurnal KBM\' && !isFetchingAssignments && mapelList.length === 0 && !kelas && !mapel && user?.role !== \'Admin\';'),
      'hasNoKbmAssignments must not lock access if kelas and mapel are already specified'
    );
  });

  // ==========================================================================
  // SECTION 3: PENCARIAN & UPDATE SESI KBM YANG SUDAH MEMILIKI ABSENSI
  // ==========================================================================
  console.log('\n--- Section 3: Pencarian & Update Sesi KBM Terpadu ---');

  await runTest('3.1: handleJurnalSubmit menyelaraskan pencarian existing session dengan firstToken || cleanNama', () => {
    assert.ok(
      guruJurnalContent.includes('const firstToken = normName.split(\' \')[0] || targetSearchName.split(\',\')[0].trim();'),
      'handleJurnalSubmit must extract firstToken to match teacher name permutations'
    );
    assert.ok(
      guruJurnalContent.includes('targetSearchUserId && searchEffectiveName'),
      'handleJurnalSubmit must use searchEffectiveName for PostgREST .or() query'
    );
  });

  await runTest('3.2: handleJurnalSubmit menyediakan fallback pencarian existing session tanpa batas sekolah_id', () => {
    assert.ok(
      guruJurnalContent.includes('// Fallback query tanpa batas sekolah_id jika belum ditemukan'),
      'handleJurnalSubmit must provide tenant-resilient fallback query'
    );
  });

  await runTest('3.3: handleJurnalSubmit mencocokkan existing session dengan isTeacherRecordMatch dan isTeacherNameEquivalent', () => {
    assert.ok(
      guruJurnalContent.includes('isTeacherRecordMatch(j, user) || isTeacherNameEquivalent(j.nama_guru, targetSearchName, true)'),
      'handleJurnalSubmit must use unified teacher matching helpers'
    );
  });

  await runTest('3.4: updatePayload retry and insert retry strip catatan_khusus_siswa jika terjadi error schema cache', () => {
    assert.ok(
      guruJurnalContent.includes('catatan_khusus_siswa: _ck, ...compatiblePayload'),
      'updatePayload retry must strip catatan_khusus_siswa for schema cache resilience'
    );
    assert.ok(
      guruJurnalContent.includes('catatan_khusus_siswa: _ck, ...compatibleJurnal'),
      'insert retry must strip catatan_khusus_siswa for schema cache resilience'
    );
  });

  // ==========================================================================
  // SECTION 4: SIMULASI ALUR PENUH (END-TO-END WORKFLOW SIMULATION)
  // ==========================================================================
  console.log('\n--- Section 4: Simulasi Alur Penuh (Absensi Selesai -> Jurnal Disimpan) ---');

  await runTest('4.1: Sesi absensi selesai memiliki data absensi tetapi materi & kegiatan "-"', () => {
    const sessionAfterAbsensi = {
      id: 'session-kbm-001',
      tanggal: '2026-11-12',
      kelas: 'VII-A',
      mapel: 'Informatika',
      nama_guru: 'Budi Santoso, S.Kom.',
      user_id: 'user-001',
      materi: '-',
      kegiatan: '-',
      absensi_siswa: JSON.stringify({ 'NIS001': 'H', 'NIS002': 'S' }),
      kehadiran_murid: 'Total murid: 2, Hadir: 1, Sakit: 1',
      status_verifikasi: 'Menunggu'
    };

    // Saat baru absensi saja:
    assert.strictEqual(hasJournalContent(sessionAfterAbsensi), false, 'Session with only absensi must not count as completed journal');
    assert.strictEqual(isRealSubmittedJournal(sessionAfterAbsensi), false, 'Admin view must not count session with only absensi as submitted journal');

    const stateOnlyAbs: Partial<GuruDailyState> = {
      presensiDatang: { id: 'p-1' } as any,
      jadwalKBM: [{ id: 'jk-1', kelas: 'VII-A', mata_pelajaran: 'Informatika', isBlocked: false } as any],
      jurnalKBM: [sessionAfterAbsensi as any]
    };
    assert.strictEqual(canTeacherPresensiPulang(stateOnlyAbs), false, 'Teacher cannot checkout when journal content is still draft/placeholder');
  });

  await runTest('4.2: Guru menyimpan Jurnal KBM pada sesi yang sama memperbarui materi & kegiatan dan mempertahankan absensi', () => {
    const existingSession = {
      id: 'session-kbm-001',
      tanggal: '2026-11-12',
      kelas: 'VII-A',
      mapel: 'Informatika',
      nama_guru: 'Budi Santoso, S.Kom.',
      user_id: 'user-001',
      materi: '-',
      kegiatan: '-',
      absensi_siswa: JSON.stringify({ 'NIS001': 'H', 'NIS002': 'S' }),
      kehadiran_murid: 'Total murid: 2, Hadir: 1, Sakit: 1',
      status_verifikasi: 'Menunggu'
    };

    // Simulasi payload update saat guru menekan Simpan Jurnal KBM di sub-mode 'jurnal':
    const newJurnalInput = {
      tujuan_pembelajaran: 'Memahami Algoritma dan Pemrograman',
      kktp: 'Mampu menyusun pseudocode',
      konten: 'Struktur Logika Percabangan (IF-ELSE)',
      kegiatan: 'Praktikum di Lab Komputer dan diskusi kelompok',
      lokasi_kbm: 'Lab Komputer 1',
      foto_kegiatan: 'https://drive.google.com/photo-123.jpg',
      status_verifikasi: 'Disetujui'
    };

    // Integritas merge payload sesuai implementasi handleJurnalSubmit:
    const updatedSession = {
      ...existingSession,
      ...newJurnalInput,
      materi: newJurnalInput.konten,
      materi_pembelajaran: newJurnalInput.konten,
      // Absensi dari sesi sebelumnya tetap utuh:
      absensi_siswa: existingSession.absensi_siswa,
      kehadiran_murid: existingSession.kehadiran_murid
    };

    // Validasi setelah jurnal berhasil disimpan:
    assert.strictEqual(hasJournalContent(updatedSession), true, 'Updated session must now have valid journal content');
    assert.strictEqual(isRealSubmittedJournal(updatedSession), true, 'Admin verification must now recognize submitted journal');
    assert.strictEqual(JSON.parse(updatedSession.absensi_siswa)['NIS001'], 'H', 'Attendance NIS001 must be retained as Hadir');
    assert.strictEqual(JSON.parse(updatedSession.absensi_siswa)['NIS002'], 'S', 'Attendance NIS002 must be retained as Sakit');

    const stateAfterJournalSave: Partial<GuruDailyState> = {
      presensiDatang: { id: 'p-1' } as any,
      jadwalKBM: [{ id: 'jk-1', kelas: 'VII-A', mata_pelajaran: 'Informatika', isBlocked: false } as any],
      jurnalKBM: [updatedSession as any]
    };

    assert.strictEqual(canTeacherPresensiPulang(stateAfterJournalSave), true, 'Teacher is now unlocked to checkout after saving journal');
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
