/**
 * ============================================================================
 * TEST SUITE: WALI KELAS & PIKET INTERVENSI PRESENSI SISWA
 * File: tests/wali_kelas_and_piket_intervensi.test.ts
 *
 * Requirements:
 * 1. Wali kelas dapat mengisi presensi siswa dengan fallback assignment
 * 2. Batas waktu intervensi hanya sampai pk. 08:00 (dapat diatur oleh admin)
 * 3. Tidak bertabrakan antara Piket, Wali Kelas, dan Guru Mapel
 * 4. Pengaturan admin dapat disesuaikan (jam_batas_intervensi_siswa)
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { isIntervensiAllowed, isWaliKelasIntervensiAllowed, isPiketPulangAllowed, addMinutesToTime, findLastKbmJournal, resolveDailyStudentAttendance } from '../src/lib/presensiIntervensi';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(id: string, desc: string, detail?: string) {
  totalTests++;
  passedTests++;
  console.log(`  ${GREEN}✔ [${id}] PASS:${RESET} ${desc}`);
  if (detail) console.log(`    ${GRAY}↳ ${detail}${RESET}`);
}

function fail(id: string, desc: string, error?: any) {
  totalTests++;
  failedTests++;
  const errMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
  console.error(`  ${RED}✖ [${id}] FAIL:${RESET} ${desc}`);
  if (errMsg) console.error(`    ${RED}↳ Error: ${errMsg}${RESET}`);
}

async function runTests() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║  WALI KELAS & PIKET INTERVENSI PRESENSI SISWA TEST SUITE             ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  // SECTION 1: CUTOFF HELPER LOGIC
  console.log(`${YELLOW}${BOLD}━━━ 1. UNIT TEST: isIntervensiAllowed & isWaliKelasIntervensiAllowed ━━━${RESET}`);
  
  // 1.1 Before 08:00
  if (isIntervensiAllowed('08:00', '07:30') === true && isIntervensiAllowed('08:00', '07:59') === true) {
    pass('CUTOFF-01', 'Intervensi diizinkan sebelum pk. 08:00 (misal 07:30 dan 07:59)');
  } else {
    fail('CUTOFF-01', 'isIntervensiAllowed gagal untuk waktu sebelum 08:00');
  }

  // 1.2 Exactly at 08:00
  if (isIntervensiAllowed('08:00', '08:00') === true) {
    pass('CUTOFF-02', 'Intervensi diizinkan tepat pada batas waktu pk. 08:00');
  } else {
    fail('CUTOFF-02', 'isIntervensiAllowed gagal pada tepat pukul 08:00');
  }

  // 1.3 Past 08:00
  if (isIntervensiAllowed('08:00', '08:01') === false && isIntervensiAllowed('08:00', '09:30') === false) {
    pass('CUTOFF-03', 'Intervensi ditolak setelah pk. 08:00 (misal 08:01 dan 09:30)');
  } else {
    fail('CUTOFF-03', 'isIntervensiAllowed gagal memblokir waktu lewat 08:00');
  }

  // 1.4 Custom admin configured cutoff
  if (isIntervensiAllowed('08:30', '08:15') === true && isIntervensiAllowed('08:30', '08:35') === false) {
    pass('CUTOFF-04', 'Dukungan konfigurasi waktu dinamis admin (misal batas 08:30)');
  } else {
    fail('CUTOFF-04', 'isIntervensiAllowed gagal dengan waktu batas kustom');
  }

  // 1.5 Guru Piket Hak Akses Pulang (Waktu Pulang s.d. 60 Menit Setelah Jam Pulang Guru)
  const piketEarly = isPiketPulangAllowed('11:00', '10:45');
  const piketActive1 = isPiketPulangAllowed('11:00', '11:00');
  const piketActive2 = isPiketPulangAllowed('11:00', '11:30');
  const piketAkhir = isPiketPulangAllowed('11:00', '12:00');
  const piketExpired = isPiketPulangAllowed('11:00', '12:01');

  if (!piketEarly.allowed && piketActive1.allowed && piketActive2.allowed && piketAkhir.allowed && !piketExpired.allowed) {
    pass('PIKET-WIN-01', 'Guru Piket memiliki hak akses presensi pulang mulai jam pulang s.d. 60 menit setelahnya (11:00 - 12:00)');
  } else {
    fail('PIKET-WIN-01', 'Piket pulang 60-menit window gagal divalidasi');
  }

  // 1.6 Wali Kelas Multi-Window (Pagi s.d. 12:00, Terkunci KBM jika jam pulang belum mulai, Alokasi Pulang Selaras 1 Jam, Akses Malam 22:00 Ditutup)
  const resPagi = isWaliKelasIntervensiAllowed('12:00', '13:00', '14:00', '07:45');
  const resPagi10 = isWaliKelasIntervensiAllowed('12:00', '13:00', '14:00', '10:30');
  const resPagi12 = isWaliKelasIntervensiAllowed('12:00', '13:00', '14:00', '12:00');
  const resKbm = isWaliKelasIntervensiAllowed('12:00', '13:00', '14:00', '12:15');
  const resPulangMulai = isWaliKelasIntervensiAllowed('12:00', '11:00', '12:00', '11:00');
  const resPulangMid = isWaliKelasIntervensiAllowed('12:00', '11:00', '12:00', '11:30');
  const resPulangAkhir = isWaliKelasIntervensiAllowed('12:00', '11:00', '12:00', '12:00');
  const resLewat60m = isWaliKelasIntervensiAllowed('12:00', '11:00', '12:00', '12:01');
  const resSore16 = isWaliKelasIntervensiAllowed('12:00', '11:00', '12:00', '16:30');
  const resMalam22 = isWaliKelasIntervensiAllowed('12:00', '11:00', '12:00', '22:00');

  if (resPagi.allowed && resPagi10.allowed && resPagi12.allowed && resPagi.phase === 'pagi') {
    pass('WALI-WIN-01', 'Wali Kelas diizinkan input presensi pada jendela pagi diperpanjang hingga pk. 12:00 WITA');
  } else {
    fail('WALI-WIN-01', 'Gagal pada jendela pagi Wali Kelas');
  }

  if (!resKbm.allowed && resKbm.phase === 'kbm') {
    pass('WALI-WIN-02', 'Wali Kelas terkunci saat KBM (12:15) sebelum jam presensi pulang guru dimulai (13:00)');
  } else {
    fail('WALI-WIN-02', 'Wali Kelas tidak terkunci saat KBM sebelum jam pulang');
  }

  if (resPulangMulai.allowed && resPulangMid.allowed && resPulangAkhir.allowed && resPulangMulai.phase === 'pulang') {
    pass('WALI-WIN-03', 'Wali Kelas memiliki alokasi waktu presensi pulang selaras 1 jam (60 menit) sejak jam pulang dimulai (11:00 - 12:00)');
  } else {
    fail('WALI-WIN-03', 'Wali Kelas gagal mengakses jendela presensi pulang 60 menit');
  }

  if (!resLewat60m.allowed && !resSore16.allowed && !resMalam22.allowed && resLewat60m.phase === 'malam_tutup') {
    pass('WALI-WIN-04', 'Akses penyesuaian malam (pk. 22:00 WITA) telah dinonaktifkan sehingga intervensi terkunci setelah batas 60 menit (12:01 dan 22:00 terkunci)');
  } else {
    fail('WALI-WIN-04', 'Penguncian setelah batas 60 menit pasca jam pulang tidak berfungsi dengan benar');
  }

  // 1.7 Wali Kelas Early Dismissal (misal jam pulang 10:00 WITA, alokasi s.d. 11:00 WITA)
  // Pada pk. 11:15 WITA (setelah alokasi 1 jam selesai), intervensi HARUS terkunci (malam_tutup), BUKAN terbuka sebagai 'pagi'
  const resEarlyDismissalPostWindow = isWaliKelasIntervensiAllowed('12:00', '10:00', '11:00', '11:15');
  if (!resEarlyDismissalPostWindow.allowed && resEarlyDismissalPostWindow.phase === 'malam_tutup') {
    pass('WALI-WIN-05', 'Hari kepulangan lebih awal (10:00) terkunci penuh setelah 60 menit (11:15 terkunci malam_tutup, tidak kembali ke pagi)');
  } else {
    fail('WALI-WIN-05', 'Hari kepulangan lebih awal salah membuka kembali jendela pagi setelah jam pulang selesai');
  }

  // SECTION 2: ADMIN CONFIGURATION VERIFICATION
  console.log(`\n${YELLOW}${BOLD}━━━ 2. VERIFY ADMIN CONFIGURATION (AdminConfigView.tsx) ━━━${RESET}`);
  const adminConfigCode = fs.readFileSync(path.resolve('src/components/AdminConfigView.tsx'), 'utf-8');

  if (adminConfigCode.includes("jam_batas_intervensi_siswa: '08:00'")) {
    pass('ADMIN-01', 'AdminConfigView memiliki state jam_batas_intervensi_siswa dengan default 08:00');
  } else {
    fail('ADMIN-01', 'Default state jam_batas_intervensi_siswa tidak ditemukan di AdminConfigView');
  }

  if (adminConfigCode.includes('name="jam_batas_intervensi_siswa"')) {
    pass('ADMIN-02', 'Input form jam_batas_intervensi_siswa tersedia bagi Admin untuk disesuaikan');
  } else {
    fail('ADMIN-02', 'Input name="jam_batas_intervensi_siswa" tidak ditemukan di UI Admin');
  }

  // SECTION 3: WALI KELAS ATTENDANCE & LOCKING (RekapSiswaView.tsx)
  console.log(`\n${YELLOW}${BOLD}━━━ 3. VERIFY WALI KELAS PRESENSI (RekapSiswaView.tsx) ━━━${RESET}`);
  const rekapCode = fs.readFileSync(path.resolve('src/components/RekapSiswaView.tsx'), 'utf-8');

  if (rekapCode.includes('isWaliKelasIntervensiAllowed') && rekapCode.includes('fetchJadwalIntervensiWali')) {
    pass('WALI-01', 'RekapSiswaView mengintegrasikan isWaliKelasIntervensiAllowed dan fetchJadwalIntervensiWali');
  } else {
    fail('WALI-01', 'Helper intervensi multi-window tidak diimpor di RekapSiswaView');
  }

  if (rekapCode.includes('isIntervensiExpired') && rekapCode.includes('disabled={isIntervensiExpired')) {
    pass('WALI-02', 'Tombol input status presensi siswa dikunci jika batas intervensi telah berakhir');
  } else {
    fail('WALI-02', 'Tombol input presensi tidak dikunci saat expired');
  }

  if (rekapCode.includes('fallbackKelas') && rekapCode.includes('synthesized')) {
    pass('WALI-03', 'Fallback penugasan wali kelas tersedia untuk mencegah lockout');
  } else {
    fail('WALI-03', 'Fallback penugasan wali kelas tidak ditemukan');
  }

  if (rekapCode.includes("sumber_perubahan: 'Wali Kelas'")) {
    pass('WALI-04', 'Presensi yang diisi wali kelas mencatat sumber_perubahan = Wali Kelas');
  } else {
    fail('WALI-04', 'sumber_perubahan Wali Kelas tidak tercatat');
  }

  if (rekapCode.includes('waliIntervensiStatus.label') && (rekapCode.includes('Presensi Pulang Siswa (Alokasi 1 Jam)') || rekapCode.includes("waliIntervensiStatus.phase === 'pulang'"))) {
    pass('WALI-05', 'RekapSiswaView menampilkan banner presensi pulang siswa alokasi 1 jam saat jam pulang guru');
  } else {
    fail('WALI-05', 'Banner presensi pulang siswa wali kelas tidak ditemukan di RekapSiswaView');
  }

  // SECTION 4: PIKET COLLISION PREVENTION & LOCKING (PiketView.tsx)
  console.log(`\n${YELLOW}${BOLD}━━━ 4. VERIFY PIKET COLLISION PREVENTION (PiketView.tsx) ━━━${RESET}`);
  const piketCode = fs.readFileSync(path.resolve('src/components/PiketView.tsx'), 'utf-8');

  if (piketCode.includes('isPiketIntervensiExpired') && piketCode.includes('disabled={isFormLocked || isPiketIntervensiExpired}')) {
    pass('PIKET-01', 'PiketView mengunci form rekap absensi sekolah jika lewat batas intervensi');
  } else {
    fail('PIKET-01', 'PiketView tidak mengunci rekap absensi saat expired');
  }

  if (piketCode.includes("(!isPiketIntervensiExpired || isAdmin)")) {
    pass('PIKET-02', 'PiketView tidak menimpa absensi siswa saat submit laporan piket di luar jam intervensi');
  } else {
    fail('PIKET-02', 'PiketView masih dapat menimpa absensi siswa setelah jam intervensi');
  }

  if (piketCode.includes("existing.sumber_perubahan === 'Wali Kelas'") && piketCode.includes("existing.sumber_perubahan === 'Guru Mapel'")) {
    pass('PIKET-03', 'PiketView melindungi catatan presensi dari Wali Kelas & Guru Mapel agar tidak ditimpa default Hadir');
  } else {
    fail('PIKET-03', 'PiketView tidak melindungi catatan dari Wali Kelas / Guru Mapel');
  }

  if (piketCode.includes('Presensi Siswa Ditutup (Batas pk.') && piketCode.includes('"Kirim Laporan Piket"')) {
    pass('PIKET-04', 'PiketView menyembunyikan tabel presensi saat expired & mengubah tombol menjadi Kirim Laporan Piket');
  } else {
    fail('PIKET-04', 'PiketView tidak menampilkan banner penutupan atau label tombol tidak sesuai saat expired');
  }

  if (piketCode.includes('fetchBatasIntervensiSiswa') && piketCode.includes('fetchJadwalIntervensiWali') && piketCode.includes('setJamPulangMulai')) {
    pass('PIKET-05', 'PiketView mengambil konfigurasi jam_batas_intervensi_siswa dan jam_pulang_mulai dari database secara dinamis');
  } else {
    fail('PIKET-05', 'PiketView tidak mengambil konfigurasi intervensi dinamis dari database');
  }

  // SECTION 5: JURNAL KBM FOOTNOTE (GuruJurnal.tsx)
  console.log(`\n${YELLOW}${BOLD}━━━ 5. VERIFY JURNAL KBM FOOTNOTE (GuruJurnal.tsx) ━━━${RESET}`);
  const jurnalCode = fs.readFileSync(path.resolve('src/components/GuruJurnal.tsx'), 'utf-8');

  if (jurnalCode.includes('lastChangeMap') && jurnalCode.includes('setLastChangeMap')) {
    pass('JURNAL-01', 'GuruJurnal memiliki state lastChangeMap untuk melacak riwayat perubahan presensi siswa');
  } else {
    fail('JURNAL-01', 'GuruJurnal tidak memiliki state lastChangeMap');
  }

  if (jurnalCode.includes('Terakhir diubah oleh') && jurnalCode.includes('lastChangeMap[siswa.nisn]')) {
    pass('JURNAL-02', 'GuruJurnal merender catatan kaki nama pengubah terakhir & perannya (Wali Kelas / Piket) di bawah siswa');
  } else {
    fail('JURNAL-02', 'Catatan kaki pengubah terakhir tidak dirender pada baris siswa');
  }

  // SECTION 6: HOME DASHBOARD SHORTCUT (HomeViewGuru.tsx)
  console.log(`\n${YELLOW}${BOLD}━━━ 6. VERIFY DASHBOARD QUICK ACCESS (HomeViewGuru.tsx) ━━━${RESET}`);
  const homeGuruCode = fs.readFileSync(path.resolve('src/components/HomeViewGuru.tsx'), 'utf-8');

  if (homeGuruCode.includes('Presensi Siswa Kelas') && homeGuruCode.includes("setView('view-rekap-siswa')")) {
    pass('DASH-01', 'Dashboard guru menyediakan kartu akses cepat presensi siswa untuk Wali Kelas');
  } else {
    fail('DASH-01', 'Kartu akses cepat presensi siswa wali kelas tidak ditemukan di HomeViewGuru');
  }

  if (homeGuruCode.includes('isWaliKelasIntervensiAllowed') && homeGuruCode.includes('fetchJadwalIntervensiWali')) {
    pass('DASH-02', 'HomeViewGuru mengintegrasikan isWaliKelasIntervensiAllowed untuk badge dinamis penyesuaian sore');
  } else {
    fail('DASH-02', 'isWaliKelasIntervensiAllowed tidak diintegrasikan di HomeViewGuru');
  }

  // SECTION 7: SEPARATION OF ABSENSI KELAS (HARIAN) & PRESENSI MAPEL
  console.log(`\n${YELLOW}${BOLD}━━━ 7. VERIFY SEPARATION OF ABSENSI KELAS VS PRESENSI MAPEL ━━━${RESET}`);

  // 7.1 GuruJurnal automatically triggers Bolos to public.absensi when student is Alfa in subject despite morning presence
  if (jurnalCode.includes("status: 'Bolos'") && jurnalCode.includes("sumber_perubahan: 'Guru Mapel (Otomatis Bolos)'")) {
    pass('DOMAIN-01', 'GuruJurnal otomatis menyinkronkan status Bolos ke public.absensi jika siswa Hadir pagi tetapi Alfa di mapel');
  } else {
    fail('DOMAIN-01', 'GuruJurnal belum mengimplementasikan sinkronisasi otomatis status Bolos ke public.absensi');
  }

  // 7.2 GuruJurnal UI states subject attendance clearly
  if (jurnalCode.includes('Presensi Siswa Mapel:') && jurnalCode.includes('tidak mengubah absensi kelas harian')) {
    pass('DOMAIN-02', 'Form GuruJurnal secara eksplisit melabeli presensi sebagai presensi mapel');
  } else {
    fail('DOMAIN-02', 'Label presensi mapel di GuruJurnal tidak ditemukan');
  }

  // 7.3 RekapSiswaView separates Domain 1 (absensi kelas harian) and Domain 2 (presensi mapel)
  if (rekapCode.includes('DOMAIN 1: PRESENSI SISWA (ABSENSI KELAS HARIAN MEREKA)') &&
      rekapCode.includes('DOMAIN 2: PRESENSI MAPEL (ABSENSI SESI MATA PELAJARAN TERSEBUT)')) {
    pass('DOMAIN-03', 'RekapSiswaView memisahkan query absensi kelas harian (public.absensi) & presensi mapel (jurnal_pembelajaran)');
  } else {
    fail('DOMAIN-03', 'Pemisahan domain absensi kelas dan presensi mapel tidak ditemukan di RekapSiswaView');
  }

  // 7.4 RekapSiswaView UI header and options distinction
  if (rekapCode.includes('Semua Mapel (Rekap Absensi Kelas Harian)') &&
      rekapCode.includes('Rekapitulasi Presensi Mata Pelajaran:') &&
      rekapCode.includes('Rekapitulasi Absensi Kelas (Harian)')) {
    pass('DOMAIN-04', 'RekapSiswaView memberikan penamaan judul, dropdown, dan cetak yang membedakan absensi kelas vs presensi mapel');
  } else {
    fail('DOMAIN-04', 'Perbedaan penamaan judul dan dropdown di RekapSiswaView belum lengkap');
  }

  // 7.5 GuruJurnal implements morning locked attendance for Sakit/Izin/Alfa
  if (jurnalCode.includes('morningLockedAttendance') && jurnalCode.includes('(Terkunci)') && jurnalCode.includes('isMorningLocked')) {
    pass('DOMAIN-05', 'GuruJurnal mengunci status siswa yang di pagi hari berstatus Sakit/Izin/Alfa agar tidak dapat diubah Guru Mapel');
  } else {
    fail('DOMAIN-05', 'GuruJurnal belum mengunci status siswa Sakit/Izin/Alfa dari pagi');
  }

  // 7.6 GuruJurnal limits Guru Mapel intervention strictly to Hadir and Alfa
  if (jurnalCode.includes("status !== 'H' && status !== 'A'") && jurnalCode.includes('Terindikasi Bolos (Alfa Mapel, Pagi Hadir)')) {
    pass('DOMAIN-06', 'GuruJurnal membatasi hak intervensi Guru Mapel hanya pada opsi Hadir dan Alfa');
  } else {
    fail('DOMAIN-06', 'GuruJurnal belum membatasi opsi intervensi mapel hanya pada Hadir dan Alfa');
  }

  // 7.7 RekapSiswaView table and CSV display strictly Hadir, Alfa, and % Keaktifan KBM for Mapel
  if (rekapCode.includes("mapel ? '% Keaktifan KBM' : '% Kehadiran'") &&
      rekapCode.includes("['No', 'NISN', 'Nama Siswa', 'Hadir', 'Alfa', '% Keaktifan KBM']") &&
      rekapCode.includes("['No', 'NISN', 'Nama Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Bolos', '% Kehadiran']")) {
    pass('DOMAIN-07', 'RekapSiswaView memisahkan kolom UI dan CSV: Mapel (H/A/% Keaktifan KBM) vs Kelas Harian (H/S/I/A/B/% Kehadiran)');
  } else {
    fail('DOMAIN-07', 'Pemisahan kolom UI dan CSV antara mapel dan kelas harian di RekapSiswaView belum lengkap');
  }

  // 7.8 GuruJurnal protects existing Sakit & Izin from being overwritten by Bolos updates
  if (jurnalCode.includes("const isExcused = classRec && (classRec.status === 'Sakit' || classRec.status === 'Izin'")) {
    pass('DOMAIN-08', 'GuruJurnal melindungi status Sakit & Izin resmi Wali Kelas agar tidak tertimpa menjadi Bolos saat submit mapel');
  } else {
    fail('DOMAIN-08', 'GuruJurnal belum memproteksi status Sakit/Izin resmi saat auto-sync Bolos');
  }

  // 7.9 RaporView includes Bolos / B in unexcused absence (alpa) accumulation
  const raporCode = fs.readFileSync(path.resolve('src/components/RaporView.tsx'), 'utf-8');
  if (raporCode.includes("st === 'BOLOS' || st === 'B'")) {
    pass('DOMAIN-09', 'RaporView mengakumulasikan status Bolos (B) ke dalam total ketidakhadiran tanpa keterangan (alpa) di rapor');
  } else {
    fail('DOMAIN-09', 'RaporView belum memasukkan status Bolos ke dalam akumulasi alpa rapor');
  }

  // SECTION 8: STATUS BOLOS, FALLBACK SYSTEM, & 30-MINUTE PIKET PULANG WINDOW
  console.log(`\n${YELLOW}${BOLD}━━━ 8. VERIFY STATUS BOLOS, FALLBACK SYSTEM, & PIKET 30-MIN PULANG ━━━${RESET}`);

  // 8.1 Rekap Absensi Kelas (Harian) accumulates Hadir, Sakit, Izin, Alfa, Bolos
  if (rekapCode.includes("st === 'bolos' || st === 'b'") && rekapCode.includes('totalBolos')) {
    pass('BOLOS-01', 'Rekap Absensi Kelas (Harian) merekap akumulasi 5 status resmi: H, S, I, A, dan Bolos (B)');
  } else {
    fail('BOLOS-01', 'Rekap Absensi Kelas tidak menghitung akumulasi status Bolos');
  }

  // 8.2 Rekap UI table & CSV include Bolos column when !mapel
  if (rekapCode.includes('<th>Bolos</th>') || rekapCode.includes('Bolos (B)') || rekapCode.includes("'Bolos'")) {
    pass('BOLOS-02', 'Tabel rekapitulasi dan ekspor CSV menyertakan kolom Bolos pada mode Absensi Kelas Harian');
  } else {
    fail('BOLOS-02', 'Kolom Bolos tidak ditemukan pada tabel atau CSV rekap siswa');
  }

  // 8.3 Gerbang Presensi Fallback System & Validasi Bolos Mapel Terakhir
  if (rekapCode.includes('Auto Fallback: Bolos') && rekapCode.includes('Pulang: Bolos') && rekapCode.includes('totalGerbangBolos')) {
    pass('BOLOS-03', 'Gerbang Presensi memiliki fallback otomatis mapel terakhir & mendeteksi Pulang: Bolos jika Alfa di mapel terakhir');
  } else {
    fail('BOLOS-03', 'Fallback system gerbang presensi atau deteksi Pulang: Bolos belum lengkap');
  }

  // 8.4 PiketView enforces 1-hour (60-minute) pulang window
  if (piketCode.includes('isPiketPulangAllowed') && (piketCode.includes("scanMode === 'pulang'") || piketCode.includes("status === 'pulang'"))) {
    pass('BOLOS-04', 'PiketView menerapkan validasi batas 1 jam (60 menit) jam pulang guru untuk hak akses presensi pulang Guru Piket');
  } else {
    fail('BOLOS-04', 'PiketView belum menerapkan validasi isPiketPulangAllowed pada mode pulang');
  }

  // 8.5 Dynamic Fallback dari Jurnal KBM Jam Terakhir & Preservasi Aturan Bolos (R3)
  const studentA = { id: 's-1', nisn: '0011223344', nama_siswa: 'Budi Santoso' };
  const studentB = { id: 's-2', nisn: '0055667788', nama_siswa: 'Siti Aminah' };
  const studentC = { id: 's-3', nisn: '0099887766', nama_siswa: 'Ahmad Fauzi' };

  const journalJam3 = {
    jam_ke: 'Jam ke-3',
    mapel: 'Bahasa Indonesia',
    absensi_siswa: { '0011223344': 'H', '0055667788': 'H', '0099887766': 'H' }
  };
  const journalJam5 = {
    jam_ke: 'Jam ke-5',
    mapel: 'Matematika',
    absensi_siswa: { '0011223344': 'H', '0055667788': 'A', '0099887766': 'S' }
  };

  // 8.5.1 Verify findLastKbmJournal picks Jam ke-5 over Jam ke-3
  const lastPicked = findLastKbmJournal([journalJam3, journalJam5]);
  if (lastPicked && lastPicked.jam_ke === 'Jam ke-5') {
    pass('FALLBACK-01', 'findLastKbmJournal berhasil memprioritaskan sesi jurnal KBM dengan jam pelajaran terakhir (Jam ke-5)');
  } else {
    fail('FALLBACK-01', 'findLastKbmJournal gagal mendeteksi jam terakhir');
  }

  // 8.5.2 Student A has no class record from wali kelas -> inherits 'Hadir' from Jam ke-5
  const resA = resolveDailyStudentAttendance(studentA, null, false, lastPicked);
  if (resA.status === 'Hadir' && resA.isFallback === true) {
    pass('FALLBACK-02', 'Siswa tanpa absensi wali kelas otomatis mewarisi status Hadir dari jurnal KBM jam terakhir');
  } else {
    fail('FALLBACK-02', 'Fallback status Hadir dari KBM terakhir gagal');
  }

  // 8.5.3 Student B has morning presence (gate datang) but Alfa in Jam ke-5 -> strictly resolved to Bolos (B)
  const resB = resolveDailyStudentAttendance(studentB, null, true, lastPicked);
  if (resB.status === 'Bolos') {
    pass('FALLBACK-03', 'Aturan Bolos ditegakkan: Siswa tercatat Hadir pagi di gerbang/kelas namun Alfa pada KBM terakhir otomatis menjadi Bolos (B)');
  } else {
    fail('FALLBACK-03', 'Aturan Bolos gagal ditegakkan untuk siswa Hadir pagi & Alfa mapel terakhir');
  }

  // 8.5.4 Student C has no morning presence and Sakit in Jam ke-5 -> strictly Sakit
  const resC = resolveDailyStudentAttendance(studentC, null, false, lastPicked);
  if (resC.status === 'Sakit') {
    pass('FALLBACK-04', 'Siswa tanpa absensi kelas mewarisi status Sakit dari jurnal KBM jam terakhir tanpa false-positive Bolos');
  } else {
    fail('FALLBACK-04', 'Pewarisan status Sakit dari KBM terakhir gagal');
  }

  // 8.5.5 Student has canonical Sakit from Wali Kelas + tapped gate morning + Alfa in last KBM -> STRICTLY PRESERVED AS Sakit (NOT Bolos)
  const studentD = { id: 's-4', nisn: '0077889900', nama_siswa: 'Dewi Lestari' };
  const resD = resolveDailyStudentAttendance(studentD, { status: 'Sakit' }, true, lastPicked);
  if (resD.status === 'Sakit' && resD.isFallback === false) {
    pass('FALLBACK-05', 'Preservasi status Sakit Wali Kelas: Siswa berstatus Sakit tidak diubah menjadi Bolos meskipun tap gerbang dan Alfa di mapel');
  } else {
    fail('FALLBACK-05', `False-positive Bolos terdeteksi untuk siswa Sakit (status: ${resD.status})`);
  }

  // 8.5.6 Student has canonical Izin from Wali Kelas + tapped gate morning + Alfa in last KBM -> STRICTLY PRESERVED AS Izin (NOT Bolos)
  const studentE = { id: 's-5', nisn: '0033445566', nama_siswa: 'Eko Prasetyo' };
  const resE = resolveDailyStudentAttendance(studentE, { status: 'Izin' }, true, lastPicked);
  if (resE.status === 'Izin' && resE.isFallback === false) {
    pass('FALLBACK-06', 'Preservasi status Izin Wali Kelas: Siswa berstatus Izin tidak diubah menjadi Bolos');
  } else {
    fail('FALLBACK-06', `False-positive Bolos terdeteksi untuk siswa Izin (status: ${resE.status})`);
  }

  // 8.5.7 Empty journal at higher jam_ke does not blind the fallback (picks last journal with attendance)
  const journalEmptyJam6 = { jam_ke: 'Jam ke-6', mapel: 'Pramuka', absensi_siswa: {} };
  const pickedNonEmpty = findLastKbmJournal([journalJam3, journalJam5, journalEmptyJam6]);
  if (pickedNonEmpty && pickedNonEmpty.jam_ke === 'Jam ke-5') {
    pass('FALLBACK-07', 'findLastKbmJournal memprioritaskan jurnal yang memiliki data absensi murid (mengabaikan placeholder kosong jam ke-6)');
  } else {
    fail('FALLBACK-07', 'findLastKbmJournal tertipu oleh jurnal kosong pada jam ke-6');
  }

  // 8.5.8 Student identified by UUID without NISN is successfully resolved
  const studentUuid = { id: 'uuid-student-999', nisn: '', nama_siswa: 'Gita Gutawa' };
  const journalWithUuid = {
    jam_ke: 'Jam ke-4',
    mapel: 'Seni Musik',
    absensi_siswa: { 'uuid-student-999': 'H' }
  };
  const resUuid = resolveDailyStudentAttendance(studentUuid, null, false, journalWithUuid);
  if (resUuid.status === 'Hadir' && resUuid.isFallback === true) {
    pass('FALLBACK-08', 'resolveDailyStudentAttendance berhasil mencocokkan siswa berdasarkan student.id (UUID)');
  } else {
    fail('FALLBACK-08', 'Pencocokan student.id pada absensi_siswa gagal');
  }

  // 8.5.9 Case-insensitive student name matching in absensi_siswa JSON
  const studentCase = { id: 's-case', nisn: '', nama_siswa: 'Muhammad Ali' };
  const journalWithCaseName = {
    jam_ke: 'Jam ke-2',
    mapel: 'PJOK',
    absensi_siswa: { 'muhammad ali': 'H' }
  };
  const resCase = resolveDailyStudentAttendance(studentCase, null, false, journalWithCaseName);
  if (resCase.status === 'Hadir') {
    pass('FALLBACK-09', 'resolveDailyStudentAttendance mendukung pencocokan nama siswa case-insensitive');
  } else {
    fail('FALLBACK-09', 'Pencocokan case-insensitive nama siswa gagal');
  }

  // 8.5.10 Keyword prefix in detail_absen ("Alpa: Nama") triggers Bolos if morning presence
  const studentKw = { id: 's-kw', nisn: '112233', nama_siswa: 'Ahmad Fauzi' };
  const journalWithKeyword = {
    jam_ke: 'Jam ke-5',
    mapel: 'Matematika',
    absensi_siswa: null,
    detail_absen: 'Alpa: Ahmad Fauzi'
  };
  const resKw = resolveDailyStudentAttendance(studentKw, null, true, journalWithKeyword);
  if (resKw.status === 'Bolos') {
    pass('FALLBACK-10', 'resolveDailyStudentAttendance mendeteksi format keyword (Alpa: Nama) dan menetapkan Bolos saat hadir pagi');
  } else {
    fail('FALLBACK-10', `Format keyword gagal dideteksi (status: ${resKw.status})`);
  }

  // 8.5.11 Full word in parentheses ("Nama (Alfa)") in detail_absen triggers Bolos if morning presence
  const journalWithFullWord = {
    jam_ke: 'Jam ke-5',
    mapel: 'Fisika',
    absensi_siswa: null,
    detail_absen: 'Ahmad Fauzi (Alfa)'
  };
  const resFullWord = resolveDailyStudentAttendance(studentKw, null, true, journalWithFullWord);
  if (resFullWord.status === 'Bolos') {
    pass('FALLBACK-11', 'resolveDailyStudentAttendance mendeteksi format kata lengkap (Nama (Alfa)) dan menetapkan Bolos saat hadir pagi');
  } else {
    fail('FALLBACK-11', `Format kata lengkap dalam tanda kurung gagal dideteksi (status: ${resFullWord.status})`);
  }

  // 8.5.12 Cascading fallback to detail_absen when absensi_siswa only lists other students
  const journalMixed = {
    jam_ke: 'Jam ke-4',
    mapel: 'Kimia',
    absensi_siswa: { '999': 'H' },
    detail_absen: 'Alpa: Ahmad Fauzi'
  };
  const resMixed = resolveDailyStudentAttendance(studentKw, null, true, journalMixed);
  if (resMixed.status === 'Bolos') {
    pass('FALLBACK-12', 'resolveDailyStudentAttendance melakukan cascading lookup ke detail_absen saat siswa tidak ada di absensi_siswa JSON');
  } else {
    fail('FALLBACK-12', `Cascading lookup ke detail_absen gagal (status: ${resMixed.status})`);
  }

  // 8.5.13 Status Bolos / B in absensi_siswa JSON is correctly recognized
  const studentBolosDirect = { id: 's-bolos-direct', nisn: '445566', nama_siswa: 'Candra Wijaya' };
  const journalWithBolosStatus = {
    jam_ke: 'Jam ke-3',
    mapel: 'Biologi',
    absensi_siswa: { '445566': 'BOLOS' }
  };
  const resBolosDirect = resolveDailyStudentAttendance(studentBolosDirect, null, false, journalWithBolosStatus);
  if (resBolosDirect.status === 'Bolos') {
    pass('FALLBACK-13', 'resolveDailyStudentAttendance mengenali status BOLOS/B dalam JSON jurnal KBM');
  } else {
    fail('FALLBACK-13', `Status BOLOS dalam JSON gagal dikenali (status: ${resBolosDirect.status})`);
  }

  // SUMMARY
  console.log(`\n${CYAN}══════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}SUMMARY: Total ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}${RESET}`);
  if (failedTests === 0) {
    console.log(`${GREEN}${BOLD}VERDICT: ALL REQUIREMENTS VERIFIED AND PASSED SUCCESSFULLY!${RESET}\n`);
  } else {
    console.log(`${RED}${BOLD}VERDICT: FAILURES DETECTED!${RESET}\n`);
    process.exitCode = 1;
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exitCode = 1;
});
