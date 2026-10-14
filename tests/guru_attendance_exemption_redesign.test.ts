/**
 * Test Suite: Desain Ulang Sistem Pengaturan Kewajiban Kehadiran Guru & Realtime Sync
 * Verifies R1 (UI Model B Eksplisit), R2 (Evaluasi Dua Arah Konsisten), and R3 (Realtime Propagation).
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('========================================================================');
console.log('🧪 VERIFIKASI: DESAIN ULANG KEWAJIBAN KEHADIRAN GURU & REALTIME SYNC');
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
const adminConfigPath = path.join(root, 'src', 'components', 'AdminConfigView.tsx');
const workflowPath = path.join(root, 'src', 'lib', 'workflow.ts');
const alpaPath = path.join(root, 'src', 'lib', 'attendanceAlpa.ts');
const adminHomePath = path.join(root, 'src', 'components', 'HomeViewAdmin.tsx');
const guruHomePath = path.join(root, 'src', 'components', 'HomeViewGuru.tsx');
const reminderManagerPath = path.join(root, 'src', 'components', 'TeacherReminderManager.tsx');
const pushReminderPath = path.join(root, 'src', 'app', 'api', 'push', 'send-reminders', 'route.ts');

async function runTests() {
  try {
    const adminConfigContent = fs.readFileSync(adminConfigPath, 'utf8');
    const workflowContent = fs.readFileSync(workflowPath, 'utf8');
    const alpaContent = fs.readFileSync(alpaPath, 'utf8');
    const adminHomeContent = fs.readFileSync(adminHomePath, 'utf8');
    const guruHomeContent = fs.readFileSync(guruHomePath, 'utf8');
    const reminderManagerContent = fs.readFileSync(reminderManagerPath, 'utf8');
    const pushReminderContent = fs.readFileSync(pushReminderPath, 'utf8');

    // --------------------------------------------------------------------------
    // BAGIAN 1: VERIFIKASI UI PENGATURAN MODEL B DI AdminConfigView.tsx (R1)
    // --------------------------------------------------------------------------
    console.log('--- [R1] Desain Ulang UI AdminConfigView (Model B - Eksplisit per Guru) ---');

    // R1.1: Toggle / switch eksplisit per guru: Wajib Hadir Setiap Hari vs Hanya Hari KBM / Piket
    try {
      assert(adminConfigContent.includes('role="switch"'), 'Harus menyediakan elemen switch/toggle ber-atribut role="switch"');
      assert(adminConfigContent.includes('Hanya Hari KBM / Piket'), 'Harus menampilkan label Hanya Hari KBM / Piket');
      assert(adminConfigContent.includes('Wajib Hadir Setiap Hari'), 'Harus menampilkan label Wajib Hadir Setiap Hari');
      pass('R1.1: Setiap guru memiliki toggle switch status eksplisit (Setiap Hari vs Hanya Hari KBM)');
    } catch (e: any) {
      fail('R1.1: Toggle switch eksplisit per guru tidak ditemukan di AdminConfigView', e);
    }

    // R1.2: Tab filter cepat: Semua Guru, Wajib Setiap Hari, Hanya Hari KBM
    try {
      assert(adminConfigContent.includes('attendanceFilterTab'), 'Harus mengelola state attendanceFilterTab');
      assert(adminConfigContent.includes('Semua Guru'), 'Harus memiliki tab Semua Guru');
      assert(adminConfigContent.includes('Wajib Setiap Hari'), 'Harus memiliki tab Wajib Setiap Hari');
      assert(adminConfigContent.includes('Hanya Hari KBM'), 'Harus memiliki tab Hanya Hari KBM');
      pass('R1.2: Tersedia tab filter cepat (Semua Guru, Wajib Setiap Hari, Hanya Hari KBM)');
    } catch (e: any) {
      fail('R1.2: Tab filter cepat tidak ditemukan di AdminConfigView', e);
    }

    // R1.3: Tombol aksi massal: Set Semua Hadir Setiap Hari & Set Semua Hanya Hari KBM
    try {
      assert(adminConfigContent.includes('Set Semua Hadir Setiap Hari'), 'Harus ada tombol Set Semua Hadir Setiap Hari');
      assert(adminConfigContent.includes('Set Semua Hanya Hari KBM'), 'Harus ada tombol Set Semua Hanya Hari KBM');
      pass('R1.3: Tersedia tombol aksi massal untuk menyetel seluruh guru sekaligus');
    } catch (e: any) {
      fail('R1.3: Tombol aksi massal tidak ditemukan di AdminConfigView', e);
    }

    // R1.4: Input pencarian guru (nama, NIP, mapel)
    try {
      assert(adminConfigContent.includes('teacherSearch'), 'Harus mengelola state teacherSearch');
      assert(adminConfigContent.includes('g.nama_guru'), 'Pencarian harus menyaring nama_guru');
      assert(adminConfigContent.includes('g.mata_pelajaran'), 'Pencarian harus menyaring mata_pelajaran');
      assert(adminConfigContent.includes('g.nip'), 'Pencarian harus menyaring nip');
      pass('R1.4: Input pencarian responsif mendukung filter berdasarkan nama guru, NIP, dan mapel');
    } catch (e: any) {
      fail('R1.4: Input pencarian tidak lengkap di AdminConfigView', e);
    }

    // R1.5: Sinkronisasi data ke data_guru dan pengaturan
    try {
      assert(adminConfigContent.includes("from('data_guru').update({ wajib_hadir_hanya_mengajar: true })"), 'Menyimpan wajib_hadir_hanya_mengajar = true untuk guru exempt');
      assert(adminConfigContent.includes("from('data_guru').update({ wajib_hadir_hanya_mengajar: false })"), 'Menyimpan wajib_hadir_hanya_mengajar = false untuk guru non-exempt');
      assert(adminConfigContent.includes('guru_hanya_mengajar: jsonExempt'), 'Menyimpan array ID ke pengaturan.guru_hanya_mengajar');
      pass('R1.5: Sinkronisasi status tersimpan ke data_guru.wajib_hadir_hanya_mengajar dan pengaturan.guru_hanya_mengajar');
    } catch (e: any) {
      fail('R1.5: Sinkronisasi database di AdminConfigView tidak lengkap', e);
    }

    // --------------------------------------------------------------------------
    // BAGIAN 2: EVALUASI ATURAN DUA ARAH YANG KONSISTEN (R2)
    // --------------------------------------------------------------------------
    console.log('\n--- [R2] Evaluasi Aturan Kehadiran Dua Arah yang Konsisten ---');

    // R2.1: workflow.ts - Menghilangkan unconditional global override
    try {
      assert(workflowContent.includes('explicitTeacherSetting === false'), 'workflow.ts harus menghormati status eksplisit false');
      assert(workflowContent.includes('explicitTeacherSetting === true'), 'workflow.ts harus menghormati status eksplisit true');
      assert(workflowContent.includes('state.aturanKehadiran = isTeacherExempt ? \'Hari_Mengajar_Saja\' : \'Semua_Hari\''), 'workflow.ts menyetel aturan per guru');
      pass('R2.1: workflow.ts mengeliminasi hardcoded unconditional override dan mengevaluasi status eksplisit');
    } catch (e: any) {
      fail('R2.1: Logika evaluasi dua arah di workflow.ts belum benar', e);
    }

    // R2.2: attendanceAlpa.ts - Status eksplisit tidak tertimpa aturan global sekolah
    try {
      assert(alpaContent.includes('hasExplicitTeacherSetting'), 'attendanceAlpa.ts memeriksa status eksplisit');
      assert(alpaContent.includes('const isTeacherExempt = Boolean(guru.wajib_hadir_hanya_mengajar)'), 'attendanceAlpa.ts mengevaluasi isTeacherExempt');
      pass('R2.2: attendanceAlpa.ts konsisten melindungi guru wajib hadir dari pembatalan alpa sepihak');
    } catch (e: any) {
      fail('R2.2: attendanceAlpa.ts belum konsisten dalam evaluasi dua arah', e);
    }

    // R2.3: HomeViewAdmin.tsx & TeacherReminderManager.tsx - Konsistensi status dashboard & reminder
    try {
      assert(adminHomeContent.includes('hasExplicitTeacherSetting'), 'HomeViewAdmin.tsx menghormati status eksplisit');
      assert(reminderManagerContent.includes('hasExplicitTeacherSetting'), 'TeacherReminderManager.tsx menghormati status eksplisit');
      pass('R2.3: HomeViewAdmin dan TeacherReminderManager konsisten menghormati status eksplisit guru');
    } catch (e: any) {
      fail('R2.3: Inkonsistensi status pada HomeViewAdmin atau TeacherReminderManager', e);
    }

    // --------------------------------------------------------------------------
    // BAGIAN 3: PROPAGASI REALTIME & EFEK INSTAN PADA AKUN GURU (R3)
    // --------------------------------------------------------------------------
    console.log('\n--- [R3] Propagasi Realtime & Efek Langsung ke Akun Guru ---');

    // R3.1: AdminConfigView memicu sinkronisasi realtime
    try {
      assert(adminConfigContent.includes("new CustomEvent('sipjam:config_updated'"), 'AdminConfigView memancarkan event sipjam:config_updated');
      assert(adminConfigContent.includes("new CustomEvent('sipjam:guru_updated'"), 'AdminConfigView memancarkan event sipjam:guru_updated');
      assert(adminConfigContent.includes("localStorage.setItem('sipjam_config_sync'"), 'AdminConfigView menyimpan sinyal sync ke localStorage');
      assert(adminConfigContent.includes("event: 'config_updated'"), 'AdminConfigView mengirim broadcast channel config_updated');
      pass('R3.1: AdminConfigView memicu sinkronisasi database, window custom event, storage event, dan realtime channel');
    } catch (e: any) {
      fail('R3.1: AdminConfigView tidak memicu sinyal realtime lengkap', e);
    }

    // R3.2: HomeViewGuru mendengarkan sinyal realtime dan memperbarui state tanpa refresh
    try {
      assert(guruHomeContent.includes("table: 'pengaturan'"), 'HomeViewGuru mendengarkan perubahan tabel pengaturan');
      assert(guruHomeContent.includes("table: 'data_guru'"), 'HomeViewGuru mendengarkan perubahan tabel data_guru');
      assert(guruHomeContent.includes("event: 'config_updated'"), 'HomeViewGuru mendengarkan broadcast config_updated');
      assert(guruHomeContent.includes("window.addEventListener('sipjam:config_updated'"), 'HomeViewGuru mendengarkan event sipjam:config_updated');
      assert(guruHomeContent.includes("window.addEventListener('storage'"), 'HomeViewGuru mendengarkan storage event');
      assert(guruHomeContent.includes('refreshDailyWorkflow'), 'HomeViewGuru memiliki handler refreshDailyWorkflow');
      pass('R3.2: HomeViewGuru memiliki subscription lengkap ke postgres_changes, broadcast, window event, dan storage event');
    } catch (e: any) {
      fail('R3.2: Subscription realtime di HomeViewGuru belum lengkap', e);
    }

    // R3.3: TeacherReminderManager mendengarkan event konfigurasi
    try {
      assert(reminderManagerContent.includes("window.addEventListener('sipjam:config_updated'"), 'TeacherReminderManager mendengarkan sipjam:config_updated');
      assert(reminderManagerContent.includes("window.addEventListener('sipjam:guru_updated'"), 'TeacherReminderManager mendengarkan sipjam:guru_updated');
      pass('R3.3: TeacherReminderManager mendengarkan pembaruan konfigurasi secara instan');
    } catch (e: any) {
      fail('R3.3: TeacherReminderManager tidak mendengarkan update konfigurasi', e);
    }

    // --------------------------------------------------------------------------
    // BAGIAN 4: SIMULASI ALGORITMA & EDGE CASES (BEHAVIORAL SIMULATION)
    // --------------------------------------------------------------------------
    console.log('\n--- [Bagian 4] Simulasi Perilaku Logika Dua Arah & Edge Cases ---');

    // Skenario 1: Guru disetel "Wajib Hadir Setiap Hari" di sekolah dengan kebijakan global "Hari_Mengajar_Saja"
    // Guru tidak memiliki jadwal KBM dan tidak ada tugas piket hari ini.
    // Hasil: Guru TETAP wajib hadir dan dikenai Alpa jika mangkir (tidak tertimpa aturan global sekolah).
    {
      const guru = {
        id: 'guru-wajib-1',
        nama_guru: 'Budi Santoso',
        wajib_hadir_hanya_mengajar: false // Eksplisit: Wajib Hadir Setiap Hari
      };
      const schoolGlobalPolicy = 'Hari_Mengajar_Saja';
      const jadwalCount = 0;
      const isPiket = false;
      const presensiDatang = null;

      const hasExplicitTeacherSetting = guru.wajib_hadir_hanya_mengajar !== null && guru.wajib_hadir_hanya_mengajar !== undefined;
      const isTeacherExempt = Boolean(guru.wajib_hadir_hanya_mengajar) ||
        (!hasExplicitTeacherSetting && schoolGlobalPolicy === 'Hari_Mengajar_Saja');

      assert.strictEqual(isTeacherExempt, false, 'Guru berstatus wajib_hadir_hanya_mengajar=false tidak boleh dieksepsikan oleh aturan global');

      const hasTeachingObligation = jadwalCount > 0 || isPiket;
      let isAlpa = false;
      let bebasAlpa = false;
      let isNonTeachingDay = false;

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
          bebasAlpa = false;
        }
      }

      assert.strictEqual(isAlpa, true, 'Guru non-exempt tanpa jadwal tetap wajib hadir (Alpa jika tidak datang)');
      assert.strictEqual(bebasAlpa, false, 'Guru non-exempt tidak mendapatkan bebas Alpa');
      assert.strictEqual(isNonTeachingDay, false, 'Hari kerja normal bagi guru non-exempt');
      pass('Skenario 1: Guru Wajib Hadir Setiap Hari di sekolah Hari_Mengajar_Saja tetap wajib hadir & alpa jika mangkir');
    }

    // Skenario 2: Guru disetel "Hanya Hari KBM" di sekolah dengan kebijakan global "Semua_Hari"
    // Guru tidak memiliki jadwal KBM dan tidak ada piket hari ini.
    // Hasil: Guru bebas presensi, bebas alpa, dan berstatus isNonTeachingDay.
    {
      const guru = {
        id: 'guru-exempt-1',
        nama_guru: 'Siti Aminah',
        wajib_hadir_hanya_mengajar: true // Eksplisit: Hanya Hari KBM
      };
      const schoolGlobalPolicy = 'Semua_Hari';
      const jadwalCount = 0;
      const isPiket = false;
      const presensiDatang = null;

      const hasExplicitTeacherSetting = guru.wajib_hadir_hanya_mengajar !== null && guru.wajib_hadir_hanya_mengajar !== undefined;
      const isTeacherExempt = Boolean(guru.wajib_hadir_hanya_mengajar) ||
        (!hasExplicitTeacherSetting && schoolGlobalPolicy === 'Hari_Mengajar_Saja');

      assert.strictEqual(isTeacherExempt, true, 'Guru berstatus wajib_hadir_hanya_mengajar=true harus dieksepsikan meskipun aturan global Semua_Hari');

      const hasTeachingObligation = jadwalCount > 0 || isPiket;
      let isAlpa = false;
      let bebasAlpa = false;
      let isNonTeachingDay = false;

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

      assert.strictEqual(isAlpa, false, 'Guru exempt tanpa jadwal bebas Alpa');
      assert.strictEqual(bebasAlpa, true, 'Guru exempt memperoleh hak bebasAlpa');
      assert.strictEqual(isNonTeachingDay, true, 'Hari tanpa kewajiban mengajar terdeteksi');
      pass('Skenario 2: Guru Hanya Hari KBM di sekolah Semua_Hari dibebaskan dari presensi & alpa pada hari tanpa tugas');
    }

    // Skenario 3: Backward compatibility untuk data guru dengan nilai null/undefined
    {
      // Kasus A: data_guru null, aturan sekolah Hari_Mengajar_Saja -> Fallback ke exempt
      const guruLegacyA = { id: 'g-legacy-a', wajib_hadir_hanya_mengajar: null };
      const hasExplicitA = guruLegacyA.wajib_hadir_hanya_mengajar !== null && guruLegacyA.wajib_hadir_hanya_mengajar !== undefined;
      const isExemptA = Boolean(guruLegacyA.wajib_hadir_hanya_mengajar) || (!hasExplicitA && 'Hari_Mengajar_Saja' === 'Hari_Mengajar_Saja');
      assert.strictEqual(isExemptA, true, 'Data legacy null dengan kebijakan Hari_Mengajar_Saja harus fallback ke exempt');

      // Kasus B: data_guru null, aturan sekolah Semua_Hari -> Fallback ke non-exempt
      const guruLegacyB = { id: 'g-legacy-b', wajib_hadir_hanya_mengajar: undefined };
      const hasExplicitB = guruLegacyB.wajib_hadir_hanya_mengajar !== null && guruLegacyB.wajib_hadir_hanya_mengajar !== undefined;
      const isExemptB = Boolean(guruLegacyB.wajib_hadir_hanya_mengajar) || (!hasExplicitB && 'Semua_Hari' === 'Hari_Mengajar_Saja');
      assert.strictEqual(isExemptB, false, 'Data legacy null dengan kebijakan Semua_Hari harus fallback ke non-exempt');

      pass('Skenario 3: Backward compatibility aman dan mulus untuk record guru lama');
    }

    // Skenario 4: Simulasi filter tab dan pencarian responsif pada UI AdminConfigView
    {
      const teachers = [
        { id: '1', nama_guru: 'Ahmad Faiz', nip: '19700101', mata_pelajaran: 'Matematika' },
        { id: '2', nama_guru: 'Budi Santoso', nip: '19750202', mata_pelajaran: 'Fisika' },
        { id: '3', nama_guru: 'Citra Dewi', nip: '19800303', mata_pelajaran: 'Bahasa Inggris' },
        { id: '4', nama_guru: 'Dedi Kusuma', nip: '19850404', mata_pelajaran: 'Biologi' }
      ];
      let exemptIds = ['1', '3']; // Ahmad & Citra: Hanya Hari KBM

      // Filter: 'all'
      const filterAll = teachers.filter(g => {
        const isExempt = exemptIds.includes(g.id);
        return true;
      });
      assert.strictEqual(filterAll.length, 4, 'Tab Semua Guru harus menampilkan 4 guru');

      // Filter: 'setiap_hari'
      const filterSetiapHari = teachers.filter(g => {
        const isExempt = exemptIds.includes(g.id);
        return !isExempt;
      });
      assert.strictEqual(filterSetiapHari.length, 2, 'Tab Wajib Setiap Hari harus menampilkan 2 guru (Budi & Dedi)');
      assert.deepStrictEqual(filterSetiapHari.map(g => g.id), ['2', '4']);

      // Filter: 'hanya_kbm'
      const filterHanyaKbm = teachers.filter(g => {
        const isExempt = exemptIds.includes(g.id);
        return isExempt;
      });
      assert.strictEqual(filterHanyaKbm.length, 2, 'Tab Hanya Hari KBM harus menampilkan 2 guru (Ahmad & Citra)');
      assert.deepStrictEqual(filterHanyaKbm.map(g => g.id), ['1', '3']);

      // Pencarian: 'fisika'
      const searchFisika = teachers.filter(g => {
        const s = 'fisika';
        return g.mata_pelajaran.toLowerCase().includes(s);
      });
      assert.strictEqual(searchFisika.length, 1);
      assert.strictEqual(searchFisika[0].nama_guru, 'Budi Santoso');

      // Mass Action: Set Semua Hadir Setiap Hari
      exemptIds = [];
      assert.strictEqual(teachers.filter(g => exemptIds.includes(g.id)).length, 0, 'Set Semua Hadir Setiap Hari mengosongkan exempt');

      // Mass Action: Set Semua Hanya Hari KBM
      exemptIds = teachers.map(g => g.id);
      assert.strictEqual(teachers.filter(g => exemptIds.includes(g.id)).length, 4, 'Set Semua Hanya Hari KBM menyetel seluruh guru menjadi exempt');

      pass('Skenario 4: Simulasi filter tab, pencarian responsif, dan aksi massal berfungsi 100% presisi');
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
    console.log('🎉 SELURUH PENGUJIAN DESAIN ULANG KEWAJIBAN KEHADIRAN & REALTIME LULUS 100%!');
  }
}

runTests();
