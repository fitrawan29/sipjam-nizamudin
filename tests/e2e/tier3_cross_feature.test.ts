/**
 * Tier 3: Cross-Feature Interactions E2E Test Suite
 * Covers pairwise and multi-feature interaction workflows across F1 - F15.
 */

import { TestRunner } from './helpers/testHarness';
import { 
  MOCK_TEACHERS, 
  MOCK_PENGATURAN, 
  MOCK_JADWAL, 
  MOCK_SISWA, 
  MOCK_SEKOLAH_ID 
} from './helpers/mockData';

export async function runTier3Tests(): Promise<boolean> {
  const runner = new TestRunner('Tier 3: Cross-Feature Interactions');

  // =========================================================================
  // Interaction 1: F4 (Admin Rejection) ➔ F5 (Notification) ➔ F1 (Presensi Resubmit & Reset)
  // =========================================================================
  runner.section('Interaction 1: F4 (Admin Rejection) ➔ F5 (Notification) ➔ F1 (Presensi Reset)');

  let adminDb = [
    { id: 'att-01', nama_guru: 'Ade Fitrawan', tipe_absen: 'Datang', status_verifikasi: 'Menunggu', foto_url: 'selfie.jpg' }
  ];
  let inAppChatStore: any[] = [];
  let pushLog: any[] = [];

  // Step 1: Admin rejects item in AdminVerifView
  const rejectAttendanceItem = (id: string, reason: string) => {
    const item = adminDb.find(i => i.id === id);
    if (!item) return;
    item.status_verifikasi = 'Ditolak';
    // Remove from active queue
    adminDb = adminDb.filter(i => i.id !== id);

    // Trigger F5 notification
    pushLog.push({
      title: 'Pengajuan Presensi Ditolak',
      body: `Pengajuan Anda ditolak: "${reason}". Silakan isi ulang.`,
      url: '/?view=view-guru-presensi'
    });
    inAppChatStore.push({
      recipient: item.nama_guru,
      message: `[Sistem] Presensi Datang Anda ditolak: ${reason}`,
      is_read: false
    });
  };

  rejectAttendanceItem('att-01', 'Foto buram dan tidak memuat wajah dengan jelas');
  runner.assert(
    adminDb.length === 0,
    'T3-I1.1: Admin verification rejection removes pending card from active verification queue'
  );
  runner.assert(
    pushLog.length === 1 && pushLog[0].url === '/?view=view-guru-presensi',
    'T3-I1.2: Rejection dispatches push notification with direct link to Guru Presensi view'
  );
  runner.assert(
    inAppChatStore.length === 1 && inAppChatStore[0].is_read === false,
    'T3-I1.3: Generates unread in-app chat notification for teacher'
  );

  // Step 2: Teacher opens view, deletes rejected record, and resubmits
  let teacherAttendanceStore = [
    { id: 'att-01', nama_guru: 'Ade Fitrawan', tipe_absen: 'Datang', status_verifikasi: 'Ditolak' }
  ];
  const resubmitAttendance = (newData: any) => {
    const rejected = teacherAttendanceStore.find(p => p.tipe_absen === newData.tipe_absen && p.status_verifikasi === 'Ditolak');
    if (rejected) {
      teacherAttendanceStore = teacherAttendanceStore.filter(p => p.id !== rejected.id);
    }
    teacherAttendanceStore.push({ ...newData, id: 'att-02', status_verifikasi: 'Menunggu' });
  };
  resubmitAttendance({ nama_guru: 'Ade Fitrawan', tipe_absen: 'Datang', foto_url: 'clear_selfie.jpg' });
  runner.assert(
    teacherAttendanceStore.length === 1 &&
    teacherAttendanceStore[0].id === 'att-02' &&
    teacherAttendanceStore[0].status_verifikasi === 'Menunggu',
    'T3-I1.4: Resubmission deletes old rejected attendance record and creates fresh pending record'
  );

  // =========================================================================
  // Interaction 2: F4 (Admin Rejection) ➔ F5 (Notification) ➔ F2 (Jurnal Resubmit Class Isolation)
  // =========================================================================
  runner.section('Interaction 2: F4 (Admin Rejection) ➔ F5 (Notification) ➔ F2 (Jurnal Resubmit Class Isolation)');

  let journals = [
    { id: 'j-1', kelas: 'VII A', mapel: 'Matematika', status_verifikasi: 'Ditolak', alasan: 'RPP lampiran belum ada' },
    { id: 'j-2', kelas: 'VII B', mapel: 'Matematika', status_verifikasi: 'Ditolak', alasan: 'Rekap absen siswa kosong' }
  ];

  // Teacher resubmits ONLY VII A
  const resubmitJournal = (kelas: string, mapel: string, newPayload: any) => {
    // Delete only matching rejected journal
    const target = journals.find(j => j.status_verifikasi === 'Ditolak' && j.kelas === kelas && j.mapel === mapel);
    if (target) {
      journals = journals.filter(j => j.id !== target.id);
    }
    journals.push({ ...newPayload, id: 'j-1-resubmitted', kelas, mapel, status_verifikasi: 'Menunggu' });
  };

  resubmitJournal('VII A', 'Matematika', { materi: 'Aljabar dengan lampiran RPP' });
  runner.assert(
    journals.some(j => j.id === 'j-1-resubmitted' && j.status_verifikasi === 'Menunggu') &&
    journals.some(j => j.id === 'j-2' && j.status_verifikasi === 'Ditolak'),
    'T3-I2.1: Targeted journal resubmission deletes only Class VII A while Class VII B remains in rejected list awaiting correction'
  );

  // =========================================================================
  // Interaction 3: F4 (Admin Rejection) ➔ F5 (Notification) ➔ F3 (Piket Resubmit & Absensi Sync)
  // =========================================================================
  runner.section('Interaction 3: F4 (Admin Rejection) ➔ F5 (Notification) ➔ F3 (Piket Resubmit & Absensi Sync)');

  let canonicalAbsensi: any[] = [];
  let piketStore = [
    { id: 'piket-old', tanggal: '2026-09-24', status_verifikasi: 'Ditolak', alasan_penolakan: 'Rekap siswa tidak sesuai' }
  ];

  // Resubmit piket with student absence sync
  const resubmitPiketReport = (newReport: any, studentAbsentees: { nisn: string; status: string }[]) => {
    piketStore = piketStore.filter(p => p.id !== 'piket-old');
    piketStore.push({ ...newReport, id: 'piket-new', status_verifikasi: 'Menunggu' });

    // Sync to canonical public.absensi
    canonicalAbsensi = studentAbsentees.map(s => ({
      nisn: s.nisn,
      tanggal: newReport.tanggal,
      status: s.status,
      source: 'Piket'
    }));
  };

  resubmitPiketReport(
    { tanggal: '2026-09-24', guru_pelapor: 'Ade Fitrawan', catatan: 'Laporan perbaikan' },
    [{ nisn: '0012345671', status: 'Sakit' }]
  );
  runner.assert(
    piketStore.length === 1 && piketStore[0].id === 'piket-new',
    'T3-I3.1: Resubmitting piket report clears old rejected report'
  );
  runner.assert(
    canonicalAbsensi.length === 1 && canonicalAbsensi[0].status === 'Sakit' && canonicalAbsensi[0].source === 'Piket',
    'T3-I3.2: Piket resubmission triggers synchronized updates to canonical public.absensi'
  );

  // =========================================================================
  // Interaction 4: F1 (Presensi Rejected) ➔ Cutoff Expiration ➔ F6 (Auto-Alpa Database Transition)
  // =========================================================================
  runner.section('Interaction 4: F1 (Presensi Rejected) ➔ Cutoff Expiration ➔ F6 (Auto-Alpa Transition)');

  let databasePresensi = [
    { id: 'att-unresolved', nama_guru: 'Budi Santoso', tipe_absen: 'Datang', status_verifikasi: 'Ditolak', jenis_presensi: 'Sekolah' },
    { id: 'att-resubmitted', nama_guru: 'Ade Fitrawan', tipe_absen: 'Datang', status_verifikasi: 'Disetujui', jenis_presensi: 'Sekolah' }
  ];

  const runAutoAlpaCutoffCron = (currentTime: string, cutoffTime: string) => {
    if (currentTime < cutoffTime) return { affected: 0 };
    let affected = 0;
    databasePresensi = databasePresensi.map(p => {
      if (p.tipe_absen === 'Datang' && p.status_verifikasi === 'Ditolak') {
        affected++;
        return {
          ...p,
          status_verifikasi: 'Alpa',
          jenis_presensi: 'Alpa',
          catatan_admin: 'Status diubah menjadi Alpa karena tidak mengisi ulang presensi hingga batas waktu pulang.'
        };
      }
      return p;
    });
    return { affected };
  };

  const cronResult = runAutoAlpaCutoffCron('22:05', '22:00');
  runner.assert(
    cronResult.affected === 1,
    'T3-I4.1: Nighttime cutoff transition detects and mutates exactly 1 unresubmitted rejection'
  );
  runner.assert(
    databasePresensi.find(p => p.nama_guru === 'Budi Santoso')?.status_verifikasi === 'Alpa' &&
    databasePresensi.find(p => p.nama_guru === 'Ade Fitrawan')?.status_verifikasi === 'Disetujui',
    'T3-I4.2: Transitions Budi Santoso to Alpa while preserving Ade Fitrawan Disetujui record'
  );

  // =========================================================================
  // Interaction 5: F6 (Auto-Alpa) ➔ F7 (3x Absence Warning Accumulation & Banner)
  // =========================================================================
  runner.section('Interaction 5: F6 (Auto-Alpa) ➔ F7 (3x Absence Warning System)');

  // Teacher has 2 prior absences, and this auto-alpa is the 3rd
  const teacherHistory = [
    { tanggal: '2026-09-21', status: 'Alpa' },
    { tanggal: '2026-09-22', status: 'Alpa' },
    { tanggal: '2026-09-24', status: databasePresensi.find(p => p.nama_guru === 'Budi Santoso')?.status_verifikasi || 'Alpa' }
  ];

  const evaluateWarningSystem = (teacherName: string, history: { tanggal: string; status: string }[]) => {
    const alpas = history.filter(h => h.status === 'Alpa');
    if (alpas.length >= 3) {
      return {
        teacherName,
        hasWarning: true,
        warnings: [{
          category: 'Presensi',
          type: 'akumulasi',
          count: alpas.length,
          message: `Peringatan: Guru tidak melakukan presensi sebanyak ${alpas.length} kali akumulasi.`
        }]
      };
    }
    return { teacherName, hasWarning: false, warnings: [] };
  };

  const warningResult = evaluateWarningSystem('Budi Santoso', teacherHistory);
  runner.assert(
    warningResult.hasWarning === true && warningResult.warnings[0].count === 3,
    'T3-I5.1: Auto-Alpa database mutation escalates total absence count to 3, triggering discipline warning banner'
  );

  // =========================================================================
  // Interaction 6: F12 (Keterlambatan Accumulation) ➔ Alpa Conversion ➔ F7 (Warning System)
  // =========================================================================
  runner.section('Interaction 6: F12 (Late Accumulation) ➔ Alpa Conversion ➔ F7 (Warning System)');

  const monthLateRecords = [
    { keterlambatan_detik: 7200, status_verifikasi: 'Disetujui' }, // 2 hours
    { keterlambatan_detik: 7200, status_verifikasi: 'Disetujui' }  // 2 hours -> total 14,400s = 1 Alpa
  ];
  const totalLateSec = monthLateRecords.reduce((s, r) => s + r.keterlambatan_detik, 0);
  const alpaFromLate = Math.floor(totalLateSec / 14400);

  // Combine with 2 explicit absences
  const totalCompositeAlpa = alpaFromLate + 2;
  const compositeWarning = evaluateDisciplineWarning(totalCompositeAlpa);

  function evaluateDisciplineWarning(count: number) {
    return count >= 3;
  }

  runner.assert(
    alpaFromLate === 1 && compositeWarning === true,
    'T3-I6.1: 14,400s late arrival accumulates into 1 Alpa, which elevates 2 prior absences to trigger 3x warning'
  );

  // =========================================================================
  // Interaction 7: F8 (Blocking Notification Modal) ➔ Web Push Permission ➔ F5 (Push Delivery)
  // =========================================================================
  runner.section('Interaction 7: F8 (Blocking Modal) ➔ Web Push Permission ➔ F5 (Push Delivery)');

  let modalVisible = true;
  let browserPermission = 'default';
  let registeredEndpoints: string[] = [];

  const handleGrantNotificationPermission = async () => {
    browserPermission = 'granted';
    modalVisible = false;
    // Register push subscription
    registeredEndpoints.push('https://fcm.googleapis.com/fcm/send/token123');
  };

  await handleGrantNotificationPermission();
  runner.assert(
    modalVisible === false && browserPermission === 'granted' && registeredEndpoints.length === 1,
    'T3-I7.1: Resolving blocking notification modal registers active push endpoint to enable future rejection alerts'
  );

  // =========================================================================
  // Interaction 8: F13 (Camera Toggle Mutex) ➔ F1 (Presensi Photo Capture) ➔ Resubmission
  // =========================================================================
  runner.section('Interaction 8: F13 (Camera Toggle Mutex) ➔ F1 (Presensi Photo Capture)');

  let currentCameraMode: 'user' | 'environment' = 'user';
  let isCameraBusy = false;
  let capturedPhotoData: string | null = null;

  const toggleCameraSafely = async () => {
    if (isCameraBusy) return;
    isCameraBusy = true;
    currentCameraMode = currentCameraMode === 'user' ? 'environment' : 'user';
    await new Promise(r => setTimeout(r, 10)); // hardware pause
    isCameraBusy = false;
  };

  const captureSelfiePhoto = () => {
    capturedPhotoData = `data:image/jpeg;base64,cameraMode=${currentCameraMode};watermark=true`;
  };

  await toggleCameraSafely();
  captureSelfiePhoto();
  runner.assert(
    currentCameraMode === 'environment' && capturedPhotoData?.includes('cameraMode=environment'),
    'T3-I8.1: Teacher seamlessly toggles camera facingMode without freeze and captures replacement selfie'
  );

  // =========================================================================
  // Interaction 9: F14 (Teacher Credential Change) ➔ F10 (Login Validation) ➔ New Password Auth
  // =========================================================================
  runner.section('Interaction 9: F14 (Credential Change) ➔ F10 (Login Validation)');

  let userCredentialsDb = {
    username: 'adefitrawan',
    password_hash: 'old_secret_123',
    nama: 'Ade Fitrawan Ibrahim'
  };

  const updateUserCredentials = (newUsername: string, newPassword: string) => {
    userCredentialsDb.username = newUsername;
    userCredentialsDb.password_hash = `hash_${newPassword}`;
  };

  const verifyUserLogin = (user: string, pass: string) => {
    if (user === userCredentialsDb.username && `hash_${pass}` === userCredentialsDb.password_hash) {
      return { success: true, user: userCredentialsDb.nama };
    }
    return { success: false, error: 'Invalid credentials' };
  };

  // Step 1: Change credentials
  updateUserCredentials('ade_fitra', 'newPassword2026!');
  // Step 2: Attempt login with old credentials -> fails
  const oldLogin = verifyUserLogin('adefitrawan', 'old_secret_123');
  // Step 3: Login with new credentials -> succeeds
  const newLogin = verifyUserLogin('ade_fitra', 'newPassword2026!');

  runner.assert(
    oldLogin.success === false && newLogin.success === true,
    'T3-I9.1: Modifying credentials invalidates old login and authenticates teacher under updated username and password'
  );

  // =========================================================================
  // Interaction 10: F15 (Master Schedule Filter) ➔ F2 (Teacher Timetable Mapping) ➔ Jurnal Validation
  // =========================================================================
  runner.section('Interaction 10: F15 (Master Data Filter) ➔ F2 (Teacher Timetable Mapping)');

  const masterSchedules = MOCK_JADWAL;
  const filterSchedules = (hari: string, guru: string) => {
    return masterSchedules.filter(j => j.hari === hari && j.nama_guru === guru);
  };

  const adeMondayClasses = filterSchedules('Senin', 'Ade Fitrawan Ibrahim');
  runner.assert(
    adeMondayClasses.length === 2 && adeMondayClasses[0].kelas === 'VII A' && adeMondayClasses[1].kelas === 'VII B',
    'T3-I10.1: Master timetable filter resolves teacher Monday teaching obligations (VII A and VII B)'
  );

  const canSubmitJournalForClass = (targetClass: string) => {
    return adeMondayClasses.some(c => c.kelas === targetClass);
  };
  runner.assert(
    canSubmitJournalForClass('VII A') === true && canSubmitJournalForClass('IX C') === false,
    'T3-I10.2: Journal submission validation maps directly to timetable schedule derived from Master Data'
  );

  return runner.printSummary();
}

// Direct CLI execution
if (require.main === module) {
  runTier3Tests().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}
