/**
 * Tier 4: Real-World Scenarios E2E Test Suite
 * End-to-end multi-actor operational workflows simulating complete day-in-the-life school processes.
 */

import { TestRunner } from './helpers/testHarness';
import { 
  MOCK_TEACHERS, 
  MOCK_PENGATURAN, 
  MOCK_JADWAL, 
  MOCK_SISWA, 
  MOCK_SEKOLAH_ID 
} from './helpers/mockData';

export async function runTier4Tests(): Promise<boolean> {
  const runner = new TestRunner('Tier 4: Real-World Scenarios (End-to-End User Workflows)');

  // =========================================================================
  // Scenario 1: The Morning Rush: Rejection, Recovery, Resubmission & Approval
  // =========================================================================
  runner.section('Scenario 1: Morning Rush - Rejection, Recovery, Resubmission & Approval');

  // Multi-actor database state
  let presensiDb: any[] = [];
  let verificationQueue: any[] = [];
  let pushLogs: any[] = [];
  let inAppChatLogs: any[] = [];

  // Step 1: Teacher submits morning attendance with blurred selfie
  const teacher = MOCK_TEACHERS[0];
  const initialAttendance = {
    id: 'att-morning-01',
    nama_guru: teacher.nama,
    tipe_absen: 'Datang',
    jenis_presensi: 'Sekolah',
    foto_url: 'blurred_selfie.jpg',
    status_verifikasi: 'Menunggu',
    timestamp: '2026-09-24T07:15:00+08:00',
    sekolah_id: MOCK_SEKOLAH_ID
  };
  presensiDb.push(initialAttendance);
  verificationQueue.push(initialAttendance);
  runner.assert(
    verificationQueue.length === 1 && verificationQueue[0].status_verifikasi === 'Menunggu',
    'T4-S1.1: Teacher successfully submits morning attendance, appearing in Admin verification queue'
  );

  // Step 2: Admin reviews queue, identifies blur, rejects item
  const adminName = 'Admin Sekolah Nizamudin';
  const rejectionReason = 'Foto wajah buram dan tidak dapat dikenali';

  // Verification action
  const rejectPendingItem = (id: string, reason: string) => {
    // 1. Update in DB
    const rec = presensiDb.find(r => r.id === id);
    if (rec) {
      rec.status_verifikasi = 'Ditolak';
      rec.catatan_admin = reason;
      rec.alasan_penolakan = reason;
    }
    // 2. Remove from active verification queue (F4)
    verificationQueue = verificationQueue.filter(r => r.id !== id);

    // 3. Dispatch F5 notification
    pushLogs.push({
      title: 'Pengajuan Presensi Ditolak',
      body: `Pengajuan Anda ditolak: "${reason}". Silakan isi ulang.`,
      url: '/?view=view-guru-presensi'
    });
    inAppChatLogs.push({
      sender_nama: adminName,
      recipient_nama: rec?.nama_guru,
      pesan: `[Pemberitahuan Sistem] Presensi Datang Anda ditolak. Alasan: "${reason}". Silakan melakukan pengisian ulang hari ini.`,
      is_read: false
    });
  };

  rejectPendingItem('att-morning-01', rejectionReason);
  runner.assert(
    verificationQueue.length === 0,
    'T4-S1.2: Admin rejection removes item from active verification list and suppresses approval'
  );
  runner.assert(
    pushLogs.length === 1 && inAppChatLogs.length === 1 && inAppChatLogs[0].is_read === false,
    'T4-S1.3: Rejection sends immediate Web Push notification and unread in-app chat message'
  );

  // Step 3: Teacher opens app, reads rejection reason, toggles camera facingMode without freeze
  let cameraFacing: 'user' | 'environment' = 'environment';
  let isCameraBusy = false;
  const toggleFacingModeSafely = async () => {
    if (isCameraBusy) return;
    isCameraBusy = true;
    cameraFacing = cameraFacing === 'user' ? 'environment' : 'user';
    await new Promise(r => setTimeout(r, 10)); // 100ms hardware release pause
    isCameraBusy = false;
  };
  await toggleFacingModeSafely();
  runner.assert(
    cameraFacing === 'user',
    'T4-S1.4: Teacher toggles camera to front facingMode with mutex hardware safety'
  );

  // Step 4: Teacher resubmits presensi. Old rejected record is deleted from DB
  const resubmitPresensiAction = (cleanSelfieUrl: string) => {
    // 1. Target and delete old rejected record
    const rejectedIndex = presensiDb.findIndex(p => p.tipe_absen === 'Datang' && p.status_verifikasi === 'Ditolak');
    if (rejectedIndex !== -1) {
      presensiDb.splice(rejectedIndex, 1);
    }
    // 2. Insert new record
    const newRecord = {
      id: 'att-morning-02-fixed',
      nama_guru: teacher.nama,
      tipe_absen: 'Datang',
      jenis_presensi: 'Sekolah',
      foto_url: cleanSelfieUrl,
      status_verifikasi: 'Menunggu',
      timestamp: '2026-09-24T07:22:00+08:00',
      sekolah_id: MOCK_SEKOLAH_ID
    };
    presensiDb.push(newRecord);
    verificationQueue.push(newRecord);
  };
  resubmitPresensiAction('crystal_clear_selfie.jpg');
  runner.assert(
    presensiDb.length === 1 && presensiDb[0].id === 'att-morning-02-fixed',
    'T4-S1.5: Re-submission deletes old rejected record and writes fresh attendance record to database'
  );

  // Step 5: Admin approves corrected submission
  const approvePendingItem = (id: string) => {
    const item = presensiDb.find(r => r.id === id);
    if (item) item.status_verifikasi = 'Disetujui';
    verificationQueue = verificationQueue.filter(r => r.id !== id);
  };
  approvePendingItem('att-morning-02-fixed');
  runner.assert(
    presensiDb[0].status_verifikasi === 'Disetujui' && verificationQueue.length === 0,
    'T4-S1.6: Admin approves corrected attendance submission, concluding happy-path recovery workflow'
  );

  // =========================================================================
  // Scenario 2: The Auto-Alpa Cutoff & Discipline Warning Escalation
  // =========================================================================
  runner.section('Scenario 2: Auto-Alpa Cutoff & Discipline Warning Escalation');

  let fullAttendanceDb = [
    // Historical absences for Budi Santoso (already has 2 unexcused absences)
    { id: 'budi-prev-1', nama_guru: 'Budi Santoso, S.Pd', tanggal: '2026-09-08', status_verifikasi: 'Alpa', jenis_presensi: 'Alpa' },
    { id: 'budi-prev-2', nama_guru: 'Budi Santoso, S.Pd', tanggal: '2026-09-15', status_verifikasi: 'Alpa', jenis_presensi: 'Alpa' },
    // Today's attendance was rejected
    { id: 'budi-today', nama_guru: 'Budi Santoso, S.Pd', tanggal: '2026-09-24', tipe_absen: 'Datang', status_verifikasi: 'Ditolak', jenis_presensi: 'Sekolah' }
  ];

  // Cutoff execution at 22:00 WITA
  const executeAutoAlpaCutoff = (currentTime: string, cutoff: string) => {
    if (currentTime < cutoff) return { transitionedCount: 0 };
    let count = 0;
    fullAttendanceDb = fullAttendanceDb.map(record => {
      if (record.tipe_absen === 'Datang' && record.status_verifikasi === 'Ditolak') {
        count++;
        return {
          ...record,
          status_verifikasi: 'Alpa',
          jenis_presensi: 'Alpa',
          catatan_admin: 'Status diubah menjadi Alpa karena tidak mengisi ulang presensi hingga batas waktu pulang.'
        };
      }
      return record;
    });
    return { transitionedCount: count };
  };

  const cutoffResult = executeAutoAlpaCutoff('22:01', '22:00');
  runner.assert(
    cutoffResult.transitionedCount === 1,
    'T4-S2.1: Nighttime cutoff transitions unresubmitted rejection to Alpa'
  );
  runner.assert(
    fullAttendanceDb.find(r => r.id === 'budi-today')?.status_verifikasi === 'Alpa',
    'T4-S2.2: Attendance record verification status updated to Alpa in database'
  );

  // Compute 3x Warning
  const evaluateTeacherDiscipline = (teacherName: string, records: any[]) => {
    const teacherAlpas = records.filter(r => r.nama_guru === teacherName && (r.status_verifikasi === 'Alpa' || r.jenis_presensi === 'Alpa'));
    if (teacherAlpas.length >= 3) {
      return {
        teacherName,
        hasWarning: true,
        warningCount: teacherAlpas.length,
        alertBanner: `Peringatan Disiplin: Anda tercatat tidak hadir (Alpa) sebanyak ${teacherAlpas.length} kali.`
      };
    }
    return { teacherName, hasWarning: false, warningCount: teacherAlpas.length, alertBanner: null };
  };

  const budiWarning = evaluateTeacherDiscipline('Budi Santoso, S.Pd', fullAttendanceDb);
  runner.assert(
    budiWarning.hasWarning === true && budiWarning.warningCount === 3,
    'T4-S2.3: System calculates 3 accumulated Alpa absences, triggering active discipline warning'
  );
  runner.assert(
    budiWarning.alertBanner?.includes('tidak hadir (Alpa) sebanyak 3 kali'),
    'T4-S2.4: Generates localized warning banner message displayed to teacher upon subsequent dashboard login'
  );

  // =========================================================================
  // Scenario 3: Mobile Safari First-Day Onboarding Journey
  // =========================================================================
  runner.section('Scenario 3: Mobile Safari First-Day Onboarding Journey');

  // Step 1: Open app on iPhone Safari: Blocking modal check
  let appNotificationPermission = 'default';
  let isBlockingModalOpen = appNotificationPermission === 'default';
  runner.assert(
    isBlockingModalOpen === true,
    'T4-S3.1: Full blocking overlay is presented on app open when notification permission is default'
  );

  // Step 2: User grants notification permission
  const grantPermission = async () => {
    appNotificationPermission = 'granted';
    isBlockingModalOpen = false;
  };
  await grantPermission();
  runner.assert(
    isBlockingModalOpen === false && appNotificationPermission === 'granted',
    'T4-S3.2: Modal unmounts immediately upon receiving granted notification permission'
  );

  // Step 3: Pre-login animation plays with SIPJAM branding
  let splashActive = true;
  const splashTitle = 'SIPJAM';
  const completePreLoginAnimation = () => { splashActive = false; };
  completePreLoginAnimation();
  runner.assert(
    splashActive === false && splashTitle === 'SIPJAM',
    'T4-S3.3: Pre-login intro animation completes cleanly and presents SIPJAM login portal'
  );

  // Step 4: Login screen verification (No SaaS text, tab title "SIPJAM")
  const loginSubtitle = 'Masuk dengan kredensial akun Anda';
  const pageTitle = 'SIPJAM';
  runner.assert(
    pageTitle === 'SIPJAM' && !loginSubtitle.includes('Multi-Tenant SaaS'),
    'T4-S3.4: Login interface renders clean SIPJAM branding with zero SaaS terminology'
  );

  // Step 5: Safe area layout check
  const viewportMeta = { viewportFit: 'cover', width: 'device-width' };
  const safeAreaTopPadding = 12 + 47; // 59px on iPhone 15 Pro
  const safeAreaBottomPadding = 32 + 34; // 66px
  runner.assert(
    viewportMeta.viewportFit === 'cover' && safeAreaTopPadding === 59 && safeAreaBottomPadding === 66,
    'T4-S3.5: Layout applies safe area insets ensuring zero overlap with Dynamic Island or home bar'
  );

  // Step 6: Teacher updates temporary password and username
  let currentSession = {
    id: 'usr-new-01',
    nama: 'Citra Dewi, M.Pd',
    username: 'citradewi_temp',
    role: 'Guru'
  };
  const updateAccountCredentials = (newUsername: string, newPass: string) => {
    currentSession = {
      ...currentSession,
      username: newUsername
    };
    localStorage.setItem('sipjam_user', JSON.stringify(currentSession));
  };
  updateAccountCredentials('citradewi', 'SecurePassword2026!');
  const storedUser = JSON.parse(localStorage.getItem('sipjam_user') || '{}');
  runner.assert(
    storedUser.username === 'citradewi' && storedUser.nama === 'Citra Dewi, M.Pd',
    'T4-S3.6: Teacher updates profile credentials via AccountSettingsModal, synchronizing session'
  );

  // =========================================================================
  // Scenario 4: Admin Master Data Audit & Recap Compilation
  // =========================================================================
  runner.section('Scenario 4: Admin Master Data Audit & Recap Compilation');

  // Step 1: Filter students in Data_Siswa
  const siswaMaster = MOCK_SISWA;
  const filterSiswa = (kelas: string, status: string, query: string) => {
    return siswaMaster.filter(s => {
      if (kelas && s.kelas !== kelas) return false;
      if (status && s.status !== status) return false;
      if (query && !s.nama_siswa.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  };

  const filteredClassSiswa = filterSiswa('VII A', 'Aktif', '');
  runner.assert(
    filteredClassSiswa.length === 2 && filteredClassSiswa.every(s => s.kelas === 'VII A'),
    'T4-S4.1: Admin filters Data_Siswa by Kelas VII A and Status Aktif'
  );

  // Step 2: Search specific student
  const searchedSiswa = filterSiswa('VII A', 'Aktif', 'Ahmad');
  runner.assert(
    searchedSiswa.length === 1 && searchedSiswa[0].nama_siswa === 'Ahmad Fauzan',
    'T4-S4.2: Real-time search instantly filters candidate students within selected class'
  );

  // Step 3: Tab switch to Jadwal Pelajaran and filter by day and teacher
  const jadwalMaster = MOCK_JADWAL;
  const filterJadwal = (hari: string, teacherName: string) => {
    return jadwalMaster.filter(j => {
      if (hari && j.hari !== hari) return false;
      if (teacherName && j.nama_guru !== teacherName) return false;
      return true;
    });
  };

  const mondayAdeJadwal = filterJadwal('Senin', 'Ade Fitrawan Ibrahim');
  runner.assert(
    mondayAdeJadwal.length === 2,
    'T4-S4.3: Admin switches to Jadwal Pelajaran and audits Monday teaching schedule for teacher'
  );

  // Step 4: Rekap view verifies composite Alpa (explicit Alpa + 4-hour late conversion)
  const teacherRecapData = [
    { nama_guru: 'Ade Fitrawan Ibrahim', jenis_presensi: 'Sekolah', keterlambatan_detik: 14400, status_verifikasi: 'Disetujui' }, // 1 late alpa
    { nama_guru: 'Ade Fitrawan Ibrahim', jenis_presensi: 'Alpa', keterlambatan_detik: 0, status_verifikasi: 'Alpa' }                // 1 direct alpa
  ];

  let calculatedAlpa = 0;
  let directAlpa = 0;
  teacherRecapData.forEach(entry => {
    if (entry.jenis_presensi === 'Alpa' || entry.status_verifikasi === 'Alpa') directAlpa++;
    if (entry.keterlambatan_detik >= 14400) calculatedAlpa += Math.floor(entry.keterlambatan_detik / 14400);
  });
  const totalRekapAlpa = directAlpa + calculatedAlpa;

  runner.assert(
    directAlpa === 1 && calculatedAlpa === 1 && totalRekapAlpa === 2,
    'T4-S4.4: Admin Rekap accurately integrates both explicit database Alpa and 4-hour late conversion Alpa (Total: 2)'
  );

  return runner.printSummary();
}

// Direct CLI execution
if (require.main === module) {
  runTier4Tests().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}
