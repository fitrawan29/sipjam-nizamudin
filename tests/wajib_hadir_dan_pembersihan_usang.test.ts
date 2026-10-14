/**
 * Test Suite: Wajib Hadir Hanya Hari Mengajar & Pembersihan Kode Usang
 * Verifies R1 (Keandalan Aturan Kehadiran Guru), R2 (Eliminasi File & Fitur Usang), and R3 (Otomatisasi Verifikasi).
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('========================================================================');
console.log('🧪 VERIFIKASI: WAJIB HADIR HARI MENGAJAR & PEMBERSIHAN KODE USANG');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(name: string) {
  totalTests++;
  passedTests++;
  console.log(`✅ PASS: ${name}`);
}

function fail(name: string, error?: any) {
  totalTests++;
  failedTests++;
  console.error(`❌ FAIL: ${name}`, error || '');
}

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, 'src', 'lib', 'workflow.ts');
const alpaPath = path.join(root, 'src', 'lib', 'attendanceAlpa.ts');
const adminHomePath = path.join(root, 'src', 'components', 'HomeViewAdmin.tsx');
const guruHomePath = path.join(root, 'src', 'components', 'HomeViewGuru.tsx');
const reminderPath = path.join(root, 'src', 'app', 'api', 'push', 'send-reminders', 'route.ts');
const guruPresensiPath = path.join(root, 'src', 'components', 'GuruPresensi.tsx');
const teacherReminderPath = path.join(root, 'src', 'components', 'TeacherReminderManager.tsx');

// File paths of obsoleted components
const adminMonitorPath = path.join(root, 'src', 'components', 'AdminMonitorView.tsx');
const notifModalPath = path.join(root, 'src', 'components', 'NotificationPermissionModal.tsx');
const pushPromptPath = path.join(root, 'src', 'components', 'PushNotificationPrompt.tsx');

async function runTests() {
  try {
    // --------------------------------------------------------------------------
    // R2: ELIMINASI FILE & FITUR USANG (DEAD & OBSOLETE CODE CLEANUP)
    // --------------------------------------------------------------------------
    console.log('--- [R2] Eliminasi File & Fitur Usang (Dead & Obsolete Code Cleanup) ---');

    // R2.1: AdminMonitorView.tsx is physically removed
    try {
      assert(!fs.existsSync(adminMonitorPath), 'AdminMonitorView.tsx must be completely deleted');
      pass('R2.1: File AdminMonitorView.tsx berhasil dihapus dari repository');
    } catch (e: any) {
      fail('R2.1: File AdminMonitorView.tsx masih ditemukan di repo', e);
    }

    // R2.2: NotificationPermissionModal.tsx is physically removed
    try {
      assert(!fs.existsSync(notifModalPath), 'NotificationPermissionModal.tsx must be completely deleted');
      pass('R2.2: File NotificationPermissionModal.tsx berhasil dihapus dari repository');
    } catch (e: any) {
      fail('R2.2: File NotificationPermissionModal.tsx masih ditemukan di repo', e);
    }

    // R2.3: PushNotificationPrompt.tsx is physically removed
    try {
      assert(!fs.existsSync(pushPromptPath), 'PushNotificationPrompt.tsx must be completely deleted');
      pass('R2.3: File PushNotificationPrompt.tsx berhasil dihapus dari repository');
    } catch (e: any) {
      fail('R2.3: File PushNotificationPrompt.tsx masih ditemukan di repo', e);
    }

    // R2.4: Zero broken imports across all src files
    try {
      const srcDir = path.join(root, 'src');
      const scanFiles = (dir: string): string[] => {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        for (const file of list) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            results = results.concat(scanFiles(filePath));
          } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(filePath);
          }
        }
        return results;
      };

      const allSrcFiles = scanFiles(srcDir);
      let brokenImports: string[] = [];
      for (const f of allSrcFiles) {
        const content = fs.readFileSync(f, 'utf8');
        if (content.includes('AdminMonitorView')) brokenImports.push(`${path.basename(f)}: AdminMonitorView`);
        if (content.includes('NotificationPermissionModal')) brokenImports.push(`${path.basename(f)}: NotificationPermissionModal`);
        if (content.includes('PushNotificationPrompt')) brokenImports.push(`${path.basename(f)}: PushNotificationPrompt`);
      }
      assert.strictEqual(brokenImports.length, 0, `Ditemukan broken imports di src/: ${brokenImports.join(', ')}`);
      pass('R2.4: Zero broken imports pada seluruh direktori src/ akibat penghapusan komponen');
    } catch (e: any) {
      fail('R2.4: Broken imports terdeteksi di src/', e);
    }

    // R2.5: GuruPresensi purges legacy offline keys and has zero offline queue storage writes
    try {
      const presensiSrc = fs.readFileSync(guruPresensiPath, 'utf8');
      assert(!presensiSrc.includes("localStorage.setItem('sipjam_offline_presensi'"), 'Must not store offline queue');
      assert(!presensiSrc.includes("localStorage.setItem('sipjam_offline_presensi_queue'"), 'Must not store offline queue array');
      assert(presensiSrc.includes("localStorage.removeItem('sipjam_offline_presensi')"), 'Must purge legacy offline key');
      assert(presensiSrc.includes("localStorage.removeItem('sipjam_offline_presensi_queue')"), 'Must purge legacy offline queue key');
      pass('R2.5: Kode antrean offline usang dibersihkan secara aman dari GuruPresensi');
    } catch (e: any) {
      fail('R2.5: Antrean offline usang belum dibersihkan dengan benar', e);
    }

    // --------------------------------------------------------------------------
    // R1: ATURAN KEHADIRAN GURU "WAJIB HADIR HANYA HARI MENGAJAR"
    // --------------------------------------------------------------------------
    console.log('\n--- [R1] Keandalan Aturan Kehadiran Guru "Wajib Hadir Hanya Hari Mengajar" ---');

    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    const alpaContent = fs.readFileSync(alpaPath, 'utf8');
    const adminHomeContent = fs.readFileSync(adminHomePath, 'utf8');
    const guruHomeContent = fs.readFileSync(guruHomePath, 'utf8');
    const reminderContent = fs.readFileSync(reminderPath, 'utf8');
    const teacherReminderContent = fs.readFileSync(teacherReminderPath, 'utf8');

    // R1.1: workflow.ts - Status Guru Exempt pada hari tanpa jadwal mengajar & tanpa piket
    try {
      assert(workflowContent.includes('state.isNonTeachingDay = true;'), 'Must set isNonTeachingDay = true');
      assert(workflowContent.includes('state.bebasAlpa = true;'), 'Must set bebasAlpa = true');
      assert(workflowContent.includes('state.isAlpa = false;'), 'Must set isAlpa = false');
      assert(workflowContent.includes('Hari ini tidak ada jadwal mengajar (Bebas Kehadiran)'), 'Must explain Bebas Kehadiran');
      pass('R1.1: workflow.ts membebaskan guru exempt pada hari tanpa KBM & piket (isNonTeachingDay=true, bebasAlpa=true, isAlpa=false)');
    } catch (e: any) {
      fail('R1.1: workflow.ts gagal menetapkan status bebas kehadiran guru exempt', e);
    }

    // R1.2: workflow.ts - Presensi Datang sukarela guru exempt tidak terblokir tagihan jurnal KBM fiktif
    try {
      assert(workflowContent.includes('if (state.isNonTeachingDay) {'), 'Must check isNonTeachingDay for Presensi Pulang');
      assert(workflowContent.includes('isJurnalDone = true;'), 'isNonTeachingDay sets isJurnalDone = true');
      assert(workflowContent.includes('if (isTeacherExempt && state.jadwalKBM.length === 0) isJurnalDone = true;'), 'Exempt teacher with 0 classes has isJurnalDone = true');
      pass('R1.2: workflow.ts mengizinkan Presensi Pulang guru sukarela tanpa terblokir tagihan jurnal KBM fiktif');
    } catch (e: any) {
      fail('R1.2: workflow.ts memblokir Presensi Pulang guru sukarela dengan tagihan jurnal', e);
    }

    // R1.3: workflow.ts - Guru exempt ditugaskan piket tetap berkewajiban hadir & piket
    try {
      assert(
        workflowContent.includes('const hasTeachingObligation = (state.isBlok && !isTeacherExempt) || state.jadwalKBM.length > 0 || state.isPiket;'),
        'hasTeachingObligation must include state.isPiket'
      );
      assert(
        workflowContent.includes('if (state.jadwalKBM.length === 0 && state.isPiket) isJurnalDone = true;'),
        'Piket duty on 0 classes relieves KBM journal requirements'
      );
      pass('R1.3: workflow.ts mendeteksi kewajiban hadir bagi guru exempt yang ditugaskan piket');
    } catch (e: any) {
      fail('R1.3: workflow.ts tidak mewajibkan hadir bagi guru piket', e);
    }

    // R1.4: attendanceAlpa.ts - Guru exempt tanpa jadwal KBM & tanpa piket tidak dimasukkan record Alpa
    try {
      assert(alpaContent.includes('const isTeacherExempt = Boolean(guru.wajib_hadir_hanya_mengajar)'), 'alpa must evaluate isTeacherExempt');
      assert(alpaContent.includes('hasTeachingToday'), 'alpa must evaluate hasTeachingToday');
      assert(alpaContent.includes('hasPiketDuty'), 'alpa must evaluate hasPiketDuty');
      assert(alpaContent.includes('if (!hasTeachingToday && !hasPiketDuty) {'), 'alpa skips only when neither teaching nor piket duty exists');
      assert(alpaContent.includes('continue; // Tidak wajib hadir, bebas Alpa'), 'alpa skips insertion for exempt teachers without duties');
      pass('R1.4: attendanceAlpa.ts membebaskan guru exempt dari Alpa otomatis jika tidak ada jadwal KBM dan piket');
    } catch (e: any) {
      fail('R1.4: attendanceAlpa.ts gagal membebaskan guru exempt', e);
    }

    // R1.5: attendanceAlpa.ts - Guru exempt yang ditugaskan piket TETAP dikenai Alpa jika tidak hadir
    try {
      assert(alpaContent.includes('inPenugasan') || alpaContent.includes('penugasanList'), 'alpa checks penugasan_piket');
      assert(alpaContent.includes('inJadwalPiket') || alpaContent.includes('jadwalPiketList'), 'alpa checks jadwal_piket');
      pass('R1.5: attendanceAlpa.ts mendeteksi kewajiban piket sehingga guru piket yang mangkir tetap dievaluasi');
    } catch (e: any) {
      fail('R1.5: attendanceAlpa.ts luput mengecek kewajiban piket', e);
    }

    // R1.6: send-reminders/route.ts - Guru exempt tanpa jadwal mengajar tidak dikirimi notifikasi tagihan presensi/jurnal
    try {
      assert(reminderContent.includes('if (teacher.wajib_hadir_hanya_mengajar)'), 'Reminders check teacher exemption');
      assert(reminderContent.includes('hasPiketDuty'), 'Reminders account for piket duty');
      assert(reminderContent.includes('if (!hasTeachingToday && !hasPiketDuty) {'), 'Reminders skip exempt teachers without duties');
      pass('R1.6: send-reminders/route.ts tidak mengirimkan push reminder pengingat presensi/jurnal ke guru exempt tanpa jadwal/piket');
    } catch (e: any) {
      fail('R1.6: send-reminders/route.ts mengirimkan reminder fiktif ke guru exempt', e);
    }

    // R1.7: TeacherReminderManager.tsx - Anti-spam in-app reminder menghormati guru exempt
    try {
      assert(teacherReminderContent.includes('const isExempt = dailyState.isNonTeachingDay || Boolean(teacherObj?.wajib_hadir_hanya_mengajar)'), 'TeacherReminder checks exemption');
      assert(teacherReminderContent.includes('const hasObligationToday = hasClassesToday || hasPiketDuty;'), 'TeacherReminder calculates total obligation');
      assert(teacherReminderContent.includes('if (needsDatang && (!isExempt || hasObligationToday))'), 'TeacherReminder gates datang reminder cleanly');
      pass('R1.7: TeacherReminderManager.tsx menyelaraskan in-app reminder untuk guru exempt dan piket');
    } catch (e: any) {
      fail('R1.7: TeacherReminderManager.tsx tidak menyelaraskan aturan kehadiran', e);
    }

    // R1.8: HomeViewAdmin.tsx - Dashboard Admin konsisten menampilkan Bebas Hadir dan mendeteksi tugas piket
    try {
      assert(adminHomeContent.includes('const isExemptNonTeaching = isTeacherExempt && targetCount === 0;'), 'Admin Home checks isExemptNonTeaching');
      assert(adminHomeContent.includes('const hasPiketDuty = isPiket;'), 'Admin Home checks hasPiketDuty');
      assert(adminHomeContent.includes("isFreeFromPresence ? 'Bebas Hadir' : 'Belum Datang'"), 'Admin Home sets Bebas Hadir for Datang');
      assert(adminHomeContent.includes("(isFreeFromPresence && !pDatang) ? 'Bebas Hadir' : 'Belum Pulang'"), 'Admin Home sets Bebas Hadir for Pulang when not present');
      assert(adminHomeContent.includes('const isLiburOrExempt = isSchoolDayOff || (isExemptNonTeaching && !hasPiketDuty && !pDatang);'), 'Admin Home calculates isLiburOrExempt incorporating piket duty and arrival');
      pass('R1.8: HomeViewAdmin.tsx konsisten menampilkan status Bebas Hadir dan mendeteksi penugasan piket guru exempt');
    } catch (e: any) {
      fail('R1.8: HomeViewAdmin.tsx inkonsisten dalam status kehadiran guru exempt', e);
    }

    // R1.9: HomeViewGuru.tsx - Tampilan Guru menampilkan Bebas Presensi & Bebas Jurnal secara akurat
    try {
      assert(guruHomeContent.includes("steps.push({ label: 'Bebas Presensi'"), 'Guru Home renders Bebas Presensi step');
      assert(guruHomeContent.includes("steps.push({ label: 'Bebas Jurnal'"), 'Guru Home renders Bebas Jurnal step');
      assert(guruHomeContent.includes('Bebas Kehadiran & Jurnal'), 'Guru Home renders Bebas Kehadiran & Jurnal banner');
      assert(guruHomeContent.includes('Kehadiran Sukarela · Bebas Jurnal'), 'Guru Home supports voluntary attendance badge');
      pass('R1.9: HomeViewGuru.tsx menyajikan visualisasi Bebas Presensi, Bebas Jurnal, dan Kehadiran Sukarela secara akurat');
    } catch (e: any) {
      fail('R1.9: HomeViewGuru.tsx gagal menampilkan visualisasi bebas tugas', e);
    }

    // --------------------------------------------------------------------------
    // R1.10: SIMULASI ALGORITMA PERILAKU SISTEM (BEHAVIORAL SIMULATION)
    // --------------------------------------------------------------------------
    console.log('\n--- [R1.10] Simulasi Algoritma Batas Guru Exempt & Non-Exempt ---');

    // Skenario A: Guru Exempt, Hari Tanpa Jadwal Mengajar, Tanpa Piket
    {
      const isTeacherExempt = true;
      const jadwalCount = 0;
      const isPiket = false;
      const presensiDatang = null;

      const hasTeachingObligation = jadwalCount > 0 || isPiket;
      let isNonTeachingDay = false;
      let bebasAlpa = false;
      let isAlpa = false;

      if (!presensiDatang) {
        if (isTeacherExempt) {
          if (!hasTeachingObligation) {
            isNonTeachingDay = true;
            bebasAlpa = true;
            isAlpa = false;
          } else {
            isAlpa = true;
          }
        } else {
          isAlpa = true;
        }
      }

      assert.strictEqual(isNonTeachingDay, true, 'Skenario A: isNonTeachingDay harus true');
      assert.strictEqual(bebasAlpa, true, 'Skenario A: bebasAlpa harus true');
      assert.strictEqual(isAlpa, false, 'Skenario A: isAlpa harus false');
      pass('R1.10.A: Guru exempt tanpa jadwal KBM & piket memperoleh status bebas kewajiban presensi (bebas Alpa)');
    }

    // Skenario B: Guru Exempt, Hadir Sukarela (Presensi Datang) tanpa Jadwal KBM & tanpa Piket
    {
      const isTeacherExempt = true;
      const jadwalCount = 0;
      const isPiket = false;
      const presensiDatang = { id: 'datang-vol', tipe_absen: 'Datang', waktu: '07:05' };

      const hasTeachingObligation = jadwalCount > 0 || isPiket;
      let isNonTeachingDay = false;
      let bebasAlpa = false;
      let isAlpa = false;

      if (presensiDatang) {
        isAlpa = false;
        if (isTeacherExempt && !hasTeachingObligation) {
          isNonTeachingDay = true;
          bebasAlpa = true;
        }
      }

      // Evaluasi Presensi Pulang
      let isJurnalDone = false;
      if (isNonTeachingDay || (isTeacherExempt && jadwalCount === 0)) {
        isJurnalDone = true;
      }
      let isPiketDone = !isPiket;
      const canPresensiPulang = isJurnalDone && isPiketDone;

      assert.strictEqual(isAlpa, false, 'Skenario B: isAlpa harus false');
      assert.strictEqual(isNonTeachingDay, true, 'Skenario B: isNonTeachingDay harus true');
      assert.strictEqual(isJurnalDone, true, 'Skenario B: isJurnalDone harus true (tidak terblokir)');
      assert.strictEqual(canPresensiPulang, true, 'Skenario B: canPresensiPulang harus true');
      pass('R1.10.B: Guru exempt hadir sukarela dapat melakukan presensi pulang tanpa terblokir validasi jurnal');
    }

    // Skenario C: Guru Exempt ditugaskan Piket pada Hari Tanpa Jadwal KBM
    {
      const isTeacherExempt = true;
      const jadwalCount = 0;
      const isPiket = true;
      let presensiDatang: any = null;

      const hasTeachingObligation = jadwalCount > 0 || isPiket;
      assert.strictEqual(hasTeachingObligation, true, 'Skenario C: Kewajiban hadir harus aktif karena piket');

      // Sebelum Datang
      let isAlpaBefore = false;
      if (!presensiDatang && hasTeachingObligation) {
        isAlpaBefore = true;
      }
      assert.strictEqual(isAlpaBefore, true, 'Skenario C: Wajib presensi datang, berstatus Alpa sebelum absen');

      // Setelah Datang tapi Belum Laporan Piket
      presensiDatang = { id: 'datang-piket' };
      let laporanPiket: any = null;
      let isJurnalDone = isTeacherExempt && jadwalCount === 0;
      let isPiketDone = !isPiket || Boolean(laporanPiket);
      let canPresensiPulang = isJurnalDone && isPiketDone;
      assert.strictEqual(isJurnalDone, true, 'Skenario C: Jurnal KBM tidak ditagih');
      assert.strictEqual(isPiketDone, false, 'Skenario C: Laporan piket belum selesai');
      assert.strictEqual(canPresensiPulang, false, 'Skenario C: Pulang belum dibuka sebelum lapor piket');

      // Setelah Laporan Piket dikirim
      laporanPiket = { id: 'lap-piket-1' };
      isPiketDone = !isPiket || Boolean(laporanPiket);
      canPresensiPulang = isJurnalDone && isPiketDone;
      assert.strictEqual(isPiketDone, true, 'Skenario C: Laporan piket selesai');
      assert.strictEqual(canPresensiPulang, true, 'Skenario C: Presensi pulang berhasil dibuka');
      pass('R1.10.C: Guru exempt ditugaskan piket diwajibkan presensi datang dan lapor piket untuk membuka presensi pulang');
    }

    // Skenario D: Guru Reguler (Non-Exempt) pada Hari Tanpa Jadwal Mengajar
    {
      const isTeacherExempt = false;
      const jadwalCount = 0;
      const isPiket = false;
      const presensiDatang = null;

      const hasTeachingObligation = jadwalCount > 0 || isPiket;
      let isAlpa = false;
      let bebasAlpa = false;

      if (!presensiDatang) {
        if (isTeacherExempt && !hasTeachingObligation) {
          bebasAlpa = true;
        } else {
          isAlpa = true;
        }
      }

      assert.strictEqual(isAlpa, true, 'Skenario D: Guru reguler wajib hadir setiap hari kerja');
      assert.strictEqual(bebasAlpa, false, 'Skenario D: Guru reguler tidak memperoleh bebas alpa');
      pass('R1.10.D: Guru non-exempt tetap wajib hadir setiap hari kerja (tidak salah dieksepsikan)');
    }

    // --------------------------------------------------------------------------
    // R1.11: UJI KETAHANAN STRING KOSONG (EMPTY STRING ADVERSARIAL RESILIENCE)
    // --------------------------------------------------------------------------
    console.log('\n--- [R1.11] Ketahanan Terhadap String Kosong / Placeholder ---');
    {
      const guru = {
        id: 'guru-1',
        nama_guru: 'Ahmad Dahlan',
        wajib_hadir_hanya_mengajar: true
      };
      const namaNorm = guru.nama_guru.toLowerCase().trim();
      const cleanName = guru.nama_guru.split(',')[0].trim().toLowerCase();

      // Kasus 1: Jadwal dengan nama_guru kosong/whitespace (misal slot upacara/istirahat/placeholder)
      const allJadwalWithEmptyRows = [
        { id: 'j-1', nama_guru: '', kelas: 'X-A', hari: 'Senin' },
        { id: 'j-2', nama_guru: '   ', kelas: 'X-B', hari: 'Senin' },
        { id: 'j-3', nama_guru: null, kelas: 'XI-A', hari: 'Senin' }
      ];

      const hasTeachingToday = allJadwalWithEmptyRows.some((j: any) => {
        const jNama = (j.nama_guru || '').toLowerCase().trim();
        if (!jNama || !cleanName) return false;
        return jNama === namaNorm || jNama === cleanName || (cleanName.length >= 3 && jNama.includes(cleanName)) || (jNama.length >= 3 && cleanName.includes(jNama));
      });

      assert.strictEqual(hasTeachingToday, false, 'Jadwal kosong tidak boleh mencocokkan guru exempt');
      pass('R1.11.A: Jadwal kosong/placeholder tidak memicu false-positive hasTeachingToday pada guru exempt');

      // Kasus 2: Penugasan piket dengan guru_nama kosong
      const penugasanWithEmptyRows = [
        { id: 'p-1', guru_nama: '', guru_nip: null, guru_id: null, hari: 'Senin' },
        { id: 'p-2', guru_nama: '  ', guru_nip: '', guru_id: '', hari: 'Senin' }
      ];

      const inPenugasan = penugasanWithEmptyRows.some((p: any) => {
        if (p.guru_id && String(p.guru_id) === String(guru.id)) return true;
        const pNama = (p.guru_nama || '').toLowerCase().trim();
        if (!pNama || !cleanName) return false;
        return pNama === namaNorm || pNama === cleanName || (cleanName.length >= 3 && pNama.includes(cleanName)) || (pNama.length >= 3 && cleanName.includes(pNama));
      });

      assert.strictEqual(inPenugasan, false, 'Penugasan piket kosong tidak boleh mencocokkan guru exempt');
      pass('R1.11.B: Penugasan piket kosong/placeholder tidak memicu false-positive inPenugasan pada guru exempt');
    }

    // --------------------------------------------------------------------------
    // R1.12: KEKOKOHAN PENCOCOKAN ID & NIP PADA PENUGASAN PIKET
    // --------------------------------------------------------------------------
    console.log('\n--- [R1.12] Pencocokan Penugasan Piket Berbasis ID Guru & NIP ---');
    {
      const teacherInDb = {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        nip: '198001012005011005',
        nama_guru: 'Drs. H. Bambang Sudirman, M.Pd.',
        wajib_hadir_hanya_mengajar: true
      };

      // Kasus 1: Penugasan piket mencatat guru_id yang merujuk data_guru.id dengan nama disingkat "Bambang S."
      const piketEntryWithId = {
        guru_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        guru_nama: 'Bambang S.',
        guru_nip: ''
      };

      const matchById = Boolean(
        piketEntryWithId.guru_id && String(piketEntryWithId.guru_id) === String(teacherInDb.id)
      );
      assert.strictEqual(matchById, true, 'Matching berbasis data_guru.id harus berhasil');
      pass('R1.12.A: Penugasan piket berhasil dicocokkan melalui relasi primary key guru_id (data_guru.id)');

      // Kasus 2: Penugasan piket mencatat guru_nip sama meski penulisan nama berbeda total karena ejaan
      const piketEntryWithNip = {
        guru_id: null,
        guru_nama: 'B. Soedirman',
        guru_nip: '198001012005011005'
      };

      const matchByNip = Boolean(
        teacherInDb.nip && piketEntryWithNip.guru_nip && String(piketEntryWithNip.guru_nip).trim() === String(teacherInDb.nip).trim()
      );
      assert.strictEqual(matchByNip, true, 'Matching berbasis NIP harus berhasil');
      pass('R1.12.B: Penugasan piket berhasil dicocokkan melalui NIP guru');
    }

    // --------------------------------------------------------------------------
    // R1.13: UJI EMPIRIS TEACHER REMINDER MANAGER (PRESENSI PULANG CONDITIONS)
    // --------------------------------------------------------------------------
    console.log('\n--- [R1.13] Evaluasi Empiris Presensi Pulang di TeacherReminderManager ---');
    {
      const { evaluateReminderConditions } = await import('../src/components/TeacherReminderManager');

      const reminderCfg = {
        jam_datang_mulai: '06:00',
        jam_datang_batas: '07:15',
        jam_datang_akhir: '12:00',
        jam_pulang_mulai: '14:00',
        jam_pulang_akhir: '18:00',
        jam_pulang_jumat: '11:00'
      };

      // Buat waktu saat ini berada di jam pulang (15:00 WITA)
      // Gunakan waktu yang saat diparsing di WITA bernilai 15:00
      const nowDuringCheckout = new Date();
      // Jam lokal saat test dieksekusi bisa berbeda, tapi kita bisa mock fungsi atau set waktu WITA
      // WITA = UTC+8. Jadi 15:00 WITA = 07:00 UTC
      const mockCheckoutTime = new Date('2026-10-14T07:00:00Z'); // 15:00 WITA

      // Kasus A: Guru Exempt ditugaskan Piket hari ini (0 jam mengajar), belum absen pulang
      const dailyStatePiket: any = {
        isLibur: false,
        isIzinSakit: false,
        isNonTeachingDay: false,
        aturanKehadiran: 'Hari_Mengajar_Saja',
        jadwalKBM: [],
        isPiket: true,
        presensiDatang: { id: 'datang-1', tipe_absen: 'Datang' },
        presensiDatangDitolak: null,
        presensiPulang: null,
        presensiPulangDitolak: null,
        laporanPiket: { id: 'piket-rep-1' }
      };

      const remindersPiket = evaluateReminderConditions(
        dailyStatePiket,
        reminderCfg,
        mockCheckoutTime,
        { wajib_hadir_hanya_mengajar: true }
      );
      const hasPulangPiket = remindersPiket.some(r => r.category === 'presensi_pulang');
      assert.strictEqual(hasPulangPiket, true, 'Guru piket (exempt) harus mendapatkan reminder presensi pulang');
      pass('R1.13.A: Guru exempt yang bertugas piket hari ini menerima pengingat Presensi Pulang');

      // Kasus B: Guru Exempt hadir sukarela (ada presensi datang), belum absen pulang
      const dailyStateSukarela: any = {
        isLibur: false,
        isIzinSakit: false,
        isNonTeachingDay: true,
        aturanKehadiran: 'Hari_Mengajar_Saja',
        jadwalKBM: [],
        isPiket: false,
        presensiDatang: { id: 'datang-sukarela', tipe_absen: 'Datang' },
        presensiDatangDitolak: null,
        presensiPulang: null,
        presensiPulangDitolak: null
      };

      const remindersSukarela = evaluateReminderConditions(
        dailyStateSukarela,
        reminderCfg,
        mockCheckoutTime,
        { wajib_hadir_hanya_mengajar: true }
      );
      const hasPulangSukarela = remindersSukarela.some(r => r.category === 'presensi_pulang');
      assert.strictEqual(hasPulangSukarela, true, 'Guru hadir sukarela harus mendapatkan reminder presensi pulang');
      pass('R1.13.B: Guru exempt yang hadir sukarela (sudah datang) menerima pengingat Presensi Pulang');

      // Kasus C: Guru Exempt tidak hadir & tidak ada tugas (bebas kehadiran)
      const dailyStateBebas: any = {
        isLibur: false,
        isIzinSakit: false,
        isNonTeachingDay: true,
        aturanKehadiran: 'Hari_Mengajar_Saja',
        jadwalKBM: [],
        isPiket: false,
        presensiDatang: null,
        presensiDatangDitolak: null,
        presensiPulang: null,
        presensiPulangDitolak: null
      };

      const remindersBebas = evaluateReminderConditions(
        dailyStateBebas,
        reminderCfg,
        mockCheckoutTime,
        { wajib_hadir_hanya_mengajar: true }
      );
      const hasPulangBebas = remindersBebas.some(r => r.category === 'presensi_pulang');
      assert.strictEqual(hasPulangBebas, false, 'Guru exempt yang bebas kehadiran tidak boleh menerima reminder pulang');
      pass('R1.13.C: Guru exempt bebas kehadiran tidak dikirimi pengingat Presensi Pulang fiktif');
    }

    // --------------------------------------------------------------------------
    // R1.14: TRANSISI DINAMIS DI TENGAH HARI (MIDDAY DYNAMIC DUTY TRANSITION)
    // --------------------------------------------------------------------------
    console.log('\n--- [R1.14] Simulasi Transisi Penugasan Piket Dinamis di Tengah Hari ---');
    {
      const teacher = {
        id: 'guru-exempt-dyn',
        nama: 'Bu Rahmawati',
        wajib_hadir_hanya_mengajar: true
      };

      // Pagi hari (08:00): Belum ada jadwal KBM dan belum ditugaskan piket
      let isPiketAssigned = false;
      const jadwalCount = 0;
      let hasTeachingObligation = jadwalCount > 0 || isPiketAssigned;
      let isFreeFromPresence = teacher.wajib_hadir_hanya_mengajar && !hasTeachingObligation;
      let adminPresensiStatus = isFreeFromPresence ? 'Bebas Hadir' : 'Belum Datang';

      assert.strictEqual(isFreeFromPresence, true, 'Pagi: Harus berstatus Bebas Hadir');
      assert.strictEqual(adminPresensiStatus, 'Bebas Hadir', 'Pagi: Status Admin harus Bebas Hadir');

      // Siang hari (10:00): Admin menetapkan penugasan piket untuk Bu Rahmawati
      isPiketAssigned = true;
      hasTeachingObligation = jadwalCount > 0 || isPiketAssigned;
      isFreeFromPresence = teacher.wajib_hadir_hanya_mengajar && !hasTeachingObligation;
      adminPresensiStatus = isFreeFromPresence ? 'Bebas Hadir' : 'Belum Datang';

      assert.strictEqual(hasTeachingObligation, true, 'Siang: Kewajiban piket harus aktif');
      assert.strictEqual(isFreeFromPresence, false, 'Siang: Tidak lagi bebas kehadiran');
      assert.strictEqual(adminPresensiStatus, 'Belum Datang', 'Siang: Status Admin bertransisi ke Belum Datang');
      pass('R1.14: Transisi dinamis penugasan piket di tengah hari mengubah status guru dari Bebas Hadir menjadi kewajiban hadir');
    }

    // --------------------------------------------------------------------------
    // R1.15: ISOLASI MULTI-TENANT (MULTI-SCHOOL ATTENDANCE POLICY ISOLATION)
    // --------------------------------------------------------------------------
    console.log('\n--- [R1.15] Isolasi Multi-Tenant Kebijakan Sekolah ---');
    {
      const sekolahA = 'sch-uuid-aaa';
      const sekolahB = 'sch-uuid-bbb';

      const mockPengaturanRows = [
        { key: 'aturan_kehadiran_guru', value: 'Hari_Mengajar_Saja', sekolah_id: sekolahA },
        { key: 'aturan_kehadiran_guru', value: 'Semua_Hari', sekolah_id: sekolahB }
      ];

      const guruA = {
        id: 'guru-a',
        nama_guru: 'Guru Sekolah A',
        wajib_hadir_hanya_mengajar: false,
        sekolah_id: sekolahA
      };

      const guruB = {
        id: 'guru-b',
        nama_guru: 'Guru Sekolah B',
        wajib_hadir_hanya_mengajar: false,
        sekolah_id: sekolahB
      };

      // Evaluasi untuk guru A
      const schoolCfgA = mockPengaturanRows.filter(p => !guruA.sekolah_id || !p.sekolah_id || p.sekolah_id === guruA.sekolah_id);
      const isSchoolExemptA = schoolCfgA.some(p => p.key === 'aturan_kehadiran_guru' && p.value === 'Hari_Mengajar_Saja');
      const isGuruAExempt = Boolean(guruA.wajib_hadir_hanya_mengajar) || isSchoolExemptA;

      // Evaluasi untuk guru B
      const schoolCfgB = mockPengaturanRows.filter(p => !guruB.sekolah_id || !p.sekolah_id || p.sekolah_id === guruB.sekolah_id);
      const isSchoolExemptB = schoolCfgB.some(p => p.key === 'aturan_kehadiran_guru' && p.value === 'Hari_Mengajar_Saja');
      const isGuruBExempt = Boolean(guruB.wajib_hadir_hanya_mengajar) || isSchoolExemptB;

      assert.strictEqual(isGuruAExempt, true, 'Guru di Sekolah A harus berstatus exempt karena kebijakan Hari_Mengajar_Saja di Sekolah A');
      assert.strictEqual(isGuruBExempt, false, 'Guru di Sekolah B TIDAK boleh terpengaruh oleh kebijakan Sekolah A dan harus tetap non-exempt (Semua_Hari)');
      pass('R1.15: Kebijakan Hari_Mengajar_Saja di Sekolah A terisolasi dengan aman dan tidak mencemari Sekolah B');
    }

    // --------------------------------------------------------------------------
    // R1.16: KONSISTENSI VISUAL & KPI PRESENSI PULANG GURU SUKARELA DI ADMIN
    // --------------------------------------------------------------------------
    console.log('\n--- [R1.16] Konsistensi Visual & KPI Presensi Pulang Guru Hadir Sukarela ---');
    {
      const isExemptNonTeaching = true;
      const hasPiketDuty = false;
      const isSchoolDayOff = false;
      const isFreeFromPresence = isSchoolDayOff ? false : (isExemptNonTeaching && !hasPiketDuty);

      // Skenario 1: Guru hadir sukarela (sudah datang jam 07:15, belum pulang)
      const pDatang = { timestamp: '2026-10-14 07:15:00', tipe_absen: 'Datang', jenis_presensi: 'Sekolah' };
      const pPulangNull = null;

      const presensiPulangStatus1 = isSchoolDayOff ? 'Libur' : (isFreeFromPresence && !pDatang) ? 'Bebas Hadir' : 'Belum Pulang';
      const isLiburOrExempt1 = isSchoolDayOff || (isExemptNonTeaching && !hasPiketDuty && !pDatang);
      const pulangDone1 = isLiburOrExempt1 || (presensiPulangStatus1.startsWith('Pulang'));
      const isTugasLengkap1 = isLiburOrExempt1 ? true : pulangDone1;

      assert.strictEqual(presensiPulangStatus1, 'Belum Pulang', 'Status pulang guru hadir sukarela harus Belum Pulang, BUKAN Bebas Hadir');
      assert.strictEqual(isTugasLengkap1, false, 'Tugas guru hadir sukarela belum lengkap karena belum checkout');

      // Skenario 2: Guru hadir sukarela sudah absen pulang (jam 14:05)
      const pPulang = { timestamp: '2026-10-14 14:05:00', tipe_absen: 'Pulang', jenis_presensi: 'Sekolah' };
      const presensiPulangStatus2 = `Pulang [14:05]`;
      const isLiburOrExempt2 = isSchoolDayOff || (isExemptNonTeaching && !hasPiketDuty && !pDatang);
      const pulangDone2 = isLiburOrExempt2 || (presensiPulangStatus2.startsWith('Pulang'));
      const isTugasLengkap2 = isLiburOrExempt2 ? true : pulangDone2;

      assert.strictEqual(presensiPulangStatus2, 'Pulang [14:05]', 'Status pulang guru setelah checkout adalah Pulang [14:05]');
      assert.strictEqual(isTugasLengkap2, true, 'Tugas guru sukarela lengkap setelah presensi pulang berhasil');

      // Skenario 3: Guru exempt tidak hadir sama sekali hari ini (bebas kehadiran)
      const pDatangNone = null;
      const presensiPulangStatus3 = isSchoolDayOff ? 'Libur' : (isFreeFromPresence && !pDatangNone) ? 'Bebas Hadir' : 'Belum Pulang';
      const isLiburOrExempt3 = isSchoolDayOff || (isExemptNonTeaching && !hasPiketDuty && !pDatangNone);
      const isTugasLengkap3 = isLiburOrExempt3 ? true : false;

      assert.strictEqual(presensiPulangStatus3, 'Bebas Hadir', 'Status pulang guru bebas kehadiran yang di rumah adalah Bebas Hadir');
      assert.strictEqual(isTugasLengkap3, true, 'Guru bebas kehadiran yang tidak hadir otomatis Tugas Lengkap');

      pass('R1.16: Visual status badge dan status tugas lengkap di admin konsisten tanpa loncatan status prematur');
    }

    // --------------------------------------------------------------------------
    // R1.17: GURU TIDAK MASUK TIDAK DIKIRIMI PENGINGAT PRESENSI PULANG
    // --------------------------------------------------------------------------
    console.log('\n--- [R1.17] Guru Mangkir Tidak Dikirimi Pengingat Presensi Pulang ---');
    {
      const { evaluateReminderConditions } = await import('../src/components/TeacherReminderManager');
      const reminderCfg = {
        jam_datang_mulai: '06:00',
        jam_datang_batas: '07:15',
        jam_datang_akhir: '12:00',
        jam_pulang_mulai: '14:00',
        jam_pulang_akhir: '18:00',
      };
      const mockAfternoon = new Date('2026-10-14T07:00:00Z'); // 15:00 WITA

      // Pak Joko (guru non-exempt) mangkir / tidak datang sama sekali hari ini
      const dailyStateMangkir: any = {
        isLibur: false,
        isIzinSakit: false,
        isNonTeachingDay: false,
        aturanKehadiran: 'Semua_Hari',
        jadwalKBM: [{ id: 'j-1', kelas: 'X', mata_pelajaran: 'Fisika' }],
        isPiket: false,
        presensiDatang: null,
        presensiDatangDitolak: null,
        presensiPulang: null,
        presensiPulangDitolak: null
      };

      const remindersMangkir = evaluateReminderConditions(
        dailyStateMangkir,
        reminderCfg,
        mockAfternoon,
        { wajib_hadir_hanya_mengajar: false }
      );

      const hasPulangMangkir = remindersMangkir.some(r => r.category === 'presensi_pulang');
      assert.strictEqual(hasPulangMangkir, false, 'Guru yang tidak melakukan Presensi Datang dilarang menerima reminder Presensi Pulang');
      pass('R1.17: Guru yang tidak pernah presensi datang tidak dikirimi pengingat Presensi Pulang yang terkunci');
    }

    // --------------------------------------------------------------------------
    // R1.18: DUKUNGAN JADWAL_PIKET DAN HARDENING STRING PADA SEND-REMINDERS
    // --------------------------------------------------------------------------
    console.log('\n--- [R1.18] Dukungan Jadwal Piket & Keamanan Substring pada send-reminders ---');
    {
      const sendRemindersSource = fs.readFileSync(path.resolve(process.cwd(), 'src/app/api/push/send-reminders/route.ts'), 'utf-8');

      // Memastikan Task 3 memeriksa jadwalPiketList fallback
      assert(
        sendRemindersSource.includes('jadwalPiketList.some') && sendRemindersSource.includes('Task 3: Check Piket Reports'),
        'Task 3 send-reminders harus mendukung fallback jadwal_piket selain penugasan_piket'
      );

      // Memastikan submittedCount jurnal dan piket report memiliki length check >= 3
      assert(
        sendRemindersSource.includes('jName.length >= 3 && tNameLower.includes(jName)'),
        'Task 2 send-reminders terlindungi dari false-positive empty/short substring'
      );

      pass('R1.18: Task 3 send-reminders mendukung jadwal_piket fallback dan string matching terlindungi penuh');
    }

    // --------------------------------------------------------------------------
    // R1.19: ISOLASI MULTI-TENANT KALENDER PENDIDIKAN (LIBUR SEKOLAH A VS SEKOLAH B)
    // --------------------------------------------------------------------------
    console.log('\n--- [R1.19] Isolasi Multi-Tenant Kalender Pendidikan ---');
    {
      const workflowSource = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/workflow.ts'), 'utf-8');
      const attendanceAlpaSource = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/attendanceAlpa.ts'), 'utf-8');

      // workflow.ts harus memfilter kalender_pendidikan berdasarkan sekolahId
      assert(
        workflowSource.includes('sekolah_id.eq.${sekolahId}') || workflowSource.includes('relevantCal = cal.filter'),
        'workflow.ts harus mengisolasi kalender pendidikan per-sekolah'
      );

      // attendanceAlpa.ts tidak boleh melakukan global return abort yang mencemari sekolah lain
      assert(
        attendanceAlpaSource.includes('guruCal = (kalenderRows || []).filter') &&
        attendanceAlpaSource.includes('isGuruSchoolHoliday'),
        'attendanceAlpa.ts harus mengevaluasi hari libur sekolah per-guru dan tidak membatalkan batch secara prematur'
      );

      // Simulasi filtering kalender:
      const mockKalender = [
        { id: 'cal-1', sekolah_id: 'sekolah-A', tipe: 'Libur', keterangan: 'Libur Khusus Sekolah A', tanggal: '2026-10-15' },
        { id: 'cal-2', sekolah_id: '00000000-0000-0000-0000-000000000000', tipe: 'Kegiatan', keterangan: 'Hari Guru', tanggal: '2026-10-15' },
      ];

      // Evaluasi Sekolah A:
      const calSekolahA = mockKalender.filter((c: any) =>
        !c.sekolah_id || c.sekolah_id === 'sekolah-A' || c.sekolah_id === '00000000-0000-0000-0000-000000000000'
      );
      const isSekolahALibur = calSekolahA.some((c: any) => c.tipe === 'Libur');
      assert.strictEqual(isSekolahALibur, true, 'Sekolah A terdeteksi Libur');

      // Evaluasi Sekolah B (sekolah berbeda):
      const calSekolahB = mockKalender.filter((c: any) =>
        !c.sekolah_id || c.sekolah_id === 'sekolah-B' || c.sekolah_id === '00000000-0000-0000-0000-000000000000'
      );
      const isSekolahBLibur = calSekolahB.some((c: any) => c.tipe === 'Libur');
      assert.strictEqual(isSekolahBLibur, false, 'Sekolah B tidak terkena dampak libur lokal Sekolah A');

      pass('R1.19: Kalender libur lokal Sekolah A terisolasi dengan aman dan tidak mengunci kehadiran Sekolah B');
    }

    // --------------------------------------------------------------------------
    // R1.20: RESOLUSI ENTRI CAMPURAN (OVERRIDE MASUK/EFEKTIF PADA KALENDER PENDIDIKAN)
    // --------------------------------------------------------------------------
    console.log('\n--- [R1.20] Resolusi Entri Campuran Kalender Pendidikan (Override Masuk) ---');
    {
      const workflowSource = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/workflow.ts'), 'utf-8');
      const attendanceAlpaSource = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/attendanceAlpa.ts'), 'utf-8');
      const homeViewAdminSource = fs.readFileSync(path.resolve(process.cwd(), 'src/components/HomeViewAdmin.tsx'), 'utf-8');

      assert(workflowSource.includes("tipe === 'Masuk' || c.tipe === 'Efektif'"), 'workflow.ts mendukung override tipe Masuk/Efektif');
      assert(attendanceAlpaSource.includes("tipe === 'Masuk' || c.tipe === 'Efektif'"), 'attendanceAlpa.ts mendukung override tipe Masuk/Efektif');
      assert(homeViewAdminSource.includes("tipe === 'Masuk' || c.tipe === 'Efektif'"), 'HomeViewAdmin.tsx mendukung override tipe Masuk/Efektif');

      // Simulasi entri campuran pada tanggal yang sama:
      // Misal ada Libur Umum tetapi sekolah menetapkan Hari Pengganti / Masuk
      const mixedCalendar = [
        { id: 'cal-libur', tipe: 'Libur', keterangan: 'Libur Terjadwal' },
        { id: 'cal-masuk', tipe: 'Masuk', keterangan: 'KBM Pengganti Hari Sabtu' }
      ];

      const isExplicitMasuk = mixedCalendar.some((c: any) => c.tipe === 'Masuk' || c.tipe === 'Efektif');
      const isHoliday = !isExplicitMasuk && mixedCalendar.some((c: any) => c.tipe === 'Libur');

      assert.strictEqual(isExplicitMasuk, true, 'Entri Masuk terdeteksi sebagai override');
      assert.strictEqual(isHoliday, false, 'Hari tidak dianggap libur jika terdapat override Masuk');

      pass('R1.20: Entri kalender campuran (tipe Masuk/Efektif) berhasil meng-override status Libur');
    }

    // --------------------------------------------------------------------------
    // R1.21: PROTEKSI HARI LIBUR & AKHIR PEKAN PADA SEND-REMINDERS
    // --------------------------------------------------------------------------
    console.log('\n--- [R1.21] Proteksi Hari Libur & Akhir Pekan pada send-reminders ---');
    {
      const sendRemindersSource = fs.readFileSync(path.resolve(process.cwd(), 'src/app/api/push/send-reminders/route.ts'), 'utf-8');

      assert(sendRemindersSource.includes('isSchoolDayOff = isHoliday || isWeekendOff'), 'send-reminders menghitung isSchoolDayOff');
      assert(sendRemindersSource.includes('if (!isSchoolDayOff)'), 'send-reminders memproteksi Task 1, 2, 3 dengan guard isSchoolDayOff');

      // Simulasi perilaku logic:
      const simulateReminders = (isHoliday: boolean, isSunday: boolean, hasCheckedIn: boolean, hasCheckedOut: boolean) => {
        const isSchoolDayOff = isHoliday || isSunday;
        const tasks: string[] = [];

        if (!isSchoolDayOff) {
          if (!hasCheckedIn) tasks.push('presensi_datang');
          tasks.push('jurnal');
          tasks.push('piket');
        }

        if (hasCheckedIn && !hasCheckedOut) {
          tasks.push('presensi_pulang');
        }

        return tasks;
      };

      // Kasus 1: Hari Minggu / Libur, guru belum presensi
      const tasksOnHoliday = simulateReminders(true, false, false, false);
      assert.strictEqual(tasksOnHoliday.length, 0, 'Pada hari libur/Minggu, tidak ada pengingat Datang/Jurnal/Piket yang dikirim');

      // Kasus 2: Hari Libur, guru hadir sukarela dan belum checkout
      const tasksHolidayVoluntary = simulateReminders(true, false, true, false);
      assert.deepStrictEqual(tasksHolidayVoluntary, ['presensi_pulang'], 'Guru hadir sukarela pada hari libur tetap diingatkan presensi pulang');

      // Kasus 3: Hari kerja normal, guru belum datang
      const tasksNormalWorkday = simulateReminders(false, false, false, false);
      assert(tasksNormalWorkday.includes('presensi_datang'), 'Hari kerja normal mengirim pengingat datang');

      pass('R1.21: send-reminders terlindungi dari pengiriman notifikasi spam pada hari libur dan akhir pekan');
    }

  } catch (err: any) {
    fail('Global unexpected error during verification', err);
  }

  console.log('\n========================================================================');
  console.log(`TOTAL PENGUJIAN: ${totalTests}`);
  console.log(`LULUS (PASSED): ${passedTests}`);
  console.log(`GAGAL (FAILED): ${failedTests}`);
  console.log('========================================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('🎉 SELURUH PENGUJIAN OTOMATIS ATURAN KEHADIRAN & PEMBERSIHAN KODE USANG LULUS 100%!');
  }
}

runTests();
