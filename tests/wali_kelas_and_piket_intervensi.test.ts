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
import { isIntervensiAllowed, isWaliKelasIntervensiAllowed } from '../src/lib/presensiIntervensi';

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

  // 1.5 Wali Kelas Multi-Window (Pagi s.d. 08:00, Terkunci KBM, Buka Kembali Jam Pulang s.d. 22:00 WITA)
  const resPagi = isWaliKelasIntervensiAllowed('08:00', '11:00', '22:00', '07:45');
  const resKbm = isWaliKelasIntervensiAllowed('08:00', '11:00', '22:00', '09:15');
  const resPulangMulai = isWaliKelasIntervensiAllowed('08:00', '11:00', '22:00', '11:00');
  const resPulangSore = isWaliKelasIntervensiAllowed('08:00', '11:00', '22:00', '16:30');
  const resTepat22 = isWaliKelasIntervensiAllowed('08:00', '11:00', '22:00', '22:00');
  const resLewat22 = isWaliKelasIntervensiAllowed('08:00', '11:00', '22:00', '22:01');

  if (resPagi.allowed && resPagi.phase === 'pagi') {
    pass('WALI-WIN-01', 'Wali Kelas diizinkan input presensi pada jendela pagi (07:45 <= 08:00)');
  } else {
    fail('WALI-WIN-01', 'Gagal pada jendela pagi Wali Kelas');
  }

  if (!resKbm.allowed && resKbm.phase === 'kbm') {
    pass('WALI-WIN-02', 'Wali Kelas terkunci saat KBM (09:15) sebelum jam presensi pulang guru');
  } else {
    fail('WALI-WIN-02', 'Wali Kelas tidak terkunci saat KBM');
  }

  if (resPulangMulai.allowed && resPulangSore.allowed && resPulangSore.phase === 'pulang') {
    pass('WALI-WIN-03', 'Wali Kelas dapat menyesuaikan kembali presensi saat jam presensi pulang guru (11:00 - 16:30)');
  } else {
    fail('WALI-WIN-03', 'Wali Kelas gagal membuka kembali presensi saat jam pulang guru');
  }

  if (resTepat22.allowed && !resLewat22.allowed && resLewat22.phase === 'malam_tutup') {
    pass('WALI-WIN-04', 'Wali Kelas hanya dapat menyesuaikan sampai batas pk. 22:00 WITA (22:01 terkunci)');
  } else {
    fail('WALI-WIN-04', 'Batas akhir 22:00 WITA tidak berfungsi dengan benar');
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

  if (rekapCode.includes('waliIntervensiStatus.label') && rekapCode.includes('Penyesuaian Presensi Siswa Sore (s.d. pk. 22:00 WITA)')) {
    pass('WALI-05', 'RekapSiswaView menampilkan banner penyesuaian sore s.d. 22:00 WITA saat jam pulang guru');
  } else {
    fail('WALI-05', 'Banner penyesuaian sore wali kelas tidak ditemukan di RekapSiswaView');
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
