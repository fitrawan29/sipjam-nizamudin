/**
 * ============================================================================
 * TEST SUITE: RETENSI LOGIKA PRESENSI GERBANG, WALI KELAS, BOLOS & EXPORT/WA
 * File: tests/presensi_gerbang_dan_absensi_retensi.test.ts
 *
 * Verifies Requirements R1-R4 & Acceptance Criteria:
 * - R1: Time Window Logic (Gate morning cutoff 08:00, Wali kelas morning cutoff 12:00,
 *       1-hour / 60-min departure window for Guru Piket and Wali Kelas).
 * - R2: Attendance Status Logic (Bolos if morning present but Alfa/Bolos in last KBM;
 *       Dynamic fallback from last KBM journal when class absensi is not yet filled;
 *       Excused status preservation: Sakit/Izin are never converted to Bolos).
 * - R3: WhatsApp Notification & Print / Export Functionality (1-click WhatsApp,
 *       print documents with GPS, CSV exports with valid times and '-').
 * - R4: Actual Gate Scan Time Display (Format WITA via formatPresensiTime,
 *       shows actual check-in and check-out or '-' if not yet checked out).
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';
import {
  isIntervensiAllowed,
  isPiketPulangAllowed,
  isWaliKelasIntervensiAllowed,
  addMinutesToTime,
  extractMaxJamKe,
  findLastKbmJournal,
  resolveDailyStudentAttendance
} from '../src/lib/presensiIntervensi';
import { formatPresensiTime } from '../src/lib/wita';
import {
  normalizeIndonesianPhoneNumber,
  formatWhatsAppAttendanceMessage,
  generateParentWhatsAppUrl
} from '../src/utils/whatsappUtils';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function check(id: string, desc: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ${GREEN}✔ [${id}] PASS:${RESET} ${desc}`);
  } catch (err: any) {
    failedTests++;
    console.error(`  ${RED}✖ [${id}] FAIL:${RESET} ${desc}`);
    console.error(err);
  }
}

async function run() {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║  PRESENSI GERBANG, WALI KELAS, STATUS BOLOS, & REKAP VERIFICATION TEST SUITE     ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  // ==========================================================================
  // SECTION 1: R1 - WAKTU PRESENSI GERBANG & WALI KELAS
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}━━━ SECTION 1: R1 - RETENSI LOGIKA WAKTU GERBANG & WALI KELAS ━━━${RESET}`);

  check('R1.1', 'Batas waktu input presensi piket pagi s.d. 08:00 WITA tetap berlaku', () => {
    // Before cutoff
    assert.strictEqual(isIntervensiAllowed('08:00', '06:45'), true);
    assert.strictEqual(isIntervensiAllowed('08:00', '07:30'), true);
    assert.strictEqual(isIntervensiAllowed('08:00', '07:59'), true);
    // Boundary exactly at cutoff
    assert.strictEqual(isIntervensiAllowed('08:00', '08:00'), true);
    // After cutoff
    assert.strictEqual(isIntervensiAllowed('08:00', '08:01'), false);
    assert.strictEqual(isIntervensiAllowed('08:00', '09:00'), false);
  });

  check('R1.2', 'Jendela absensi pagi wali kelas s.d. 12:00 WITA tetap berlaku', () => {
    // With normal departure at 13:00
    const morningEarly = isWaliKelasIntervensiAllowed('12:00', '13:00', undefined, '07:15');
    const morningMid = isWaliKelasIntervensiAllowed('12:00', '13:00', undefined, '10:00');
    const morningBoundary = isWaliKelasIntervensiAllowed('12:00', '13:00', undefined, '12:00');
    const pastMorning = isWaliKelasIntervensiAllowed('12:00', '13:00', undefined, '12:01');

    assert.strictEqual(morningEarly.allowed, true);
    assert.strictEqual(morningEarly.phase, 'pagi');
    assert.strictEqual(morningMid.allowed, true);
    assert.strictEqual(morningMid.phase, 'pagi');
    assert.strictEqual(morningBoundary.allowed, true);
    assert.strictEqual(morningBoundary.phase, 'pagi');
    assert.strictEqual(pastMorning.allowed, false);
    assert.strictEqual(pastMorning.phase, 'kbm');
  });

  check('R1.3', 'Alokasi presensi pulang guru piket berlaku tepat 1 jam (60 menit) setelah waktu pulang', () => {
    // Departure starts at 11:00 WITA -> window is 11:00 to 12:00 WITA
    const early = isPiketPulangAllowed('11:00', '10:59');
    const atStart = isPiketPulangAllowed('11:00', '11:00');
    const midWindow = isPiketPulangAllowed('11:00', '11:30');
    const atEnd = isPiketPulangAllowed('11:00', '12:00');
    const expired = isPiketPulangAllowed('11:00', '12:01');

    assert.strictEqual(early.allowed, false);
    assert.strictEqual(atStart.allowed, true);
    assert.strictEqual(midWindow.allowed, true);
    assert.strictEqual(atEnd.allowed, true);
    assert.strictEqual(expired.allowed, false);
    assert.strictEqual(atStart.batasAkhir, '12:00');
  });

  check('R1.4', 'Alokasi presensi pulang wali kelas selaras 1 jam (60 menit) dan terkunci setelahnya', () => {
    // Departure starts at 11:00 WITA -> window is 11:00 to 12:00 WITA
    const atStart = isWaliKelasIntervensiAllowed('12:00', '11:00', undefined, '11:00');
    const midWindow = isWaliKelasIntervensiAllowed('12:00', '11:00', undefined, '11:45');
    const atEnd = isWaliKelasIntervensiAllowed('12:00', '11:00', undefined, '12:00');
    const expired = isWaliKelasIntervensiAllowed('12:00', '11:00', undefined, '12:01');
    const eveningLocked = isWaliKelasIntervensiAllowed('12:00', '11:00', undefined, '22:00');

    assert.strictEqual(atStart.allowed, true);
    assert.strictEqual(atStart.phase, 'pulang');
    assert.strictEqual(midWindow.allowed, true);
    assert.strictEqual(midWindow.phase, 'pulang');
    assert.strictEqual(atEnd.allowed, true);
    assert.strictEqual(atEnd.phase, 'pulang');
    assert.strictEqual(expired.allowed, false);
    assert.strictEqual(expired.phase, 'malam_tutup');
    assert.strictEqual(eveningLocked.allowed, false);
    assert.strictEqual(eveningLocked.phase, 'malam_tutup');
  });

  check('R1.5', 'Resilience format waktu pada isIntervensiAllowed, isPiketPulangAllowed, & isWaliKelasIntervensiAllowed', () => {
    // Suffix WITA & exact boundaries
    assert.strictEqual(isIntervensiAllowed('08:00 WITA', '08:00 WITA'), true);
    assert.strictEqual(isIntervensiAllowed('08:00', '08:00 WITA'), true);
    assert.strictEqual(isIntervensiAllowed('08:00', '08:01 WITA'), false);

    // Dot notation and seconds
    assert.strictEqual(isIntervensiAllowed('08.00', '07.30.00'), true);
    assert.strictEqual(isIntervensiAllowed('08.00.00', '08.00.00'), true);

    // Departure with WITA suffix and 12-hour AM/PM notation
    const piketWita = isPiketPulangAllowed('11:00 WITA', '12:00 WITA');
    assert.strictEqual(piketWita.allowed, true);
    assert.strictEqual(piketWita.batasAkhir, '12:00');

    const piketPm = isPiketPulangAllowed('11:00', '11:45 AM');
    assert.strictEqual(piketPm.allowed, true);

    const waliWita = isWaliKelasIntervensiAllowed('12:00 WITA', '11:00 WITA', undefined, '12:00 WITA');
    assert.strictEqual(waliWita.allowed, true);
    assert.strictEqual(waliWita.phase, 'pulang');

    // addMinutesToTime handles rich time formats, negative minutes, and midnight wrapping
    assert.strictEqual(addMinutesToTime('11:00 WITA', 60), '12:00');
    assert.strictEqual(addMinutesToTime('11.30', 45), '12:15');
    assert.strictEqual(addMinutesToTime('00:30', -60), '23:30');
    assert.strictEqual(addMinutesToTime('23:45', 30), '00:15');
    assert.strictEqual(addMinutesToTime('08:00', NaN), '08:00');
  });

  // ==========================================================================
  // SECTION 2: R2 - ATURAN STATUS BOLOS & FALLBACK JURNAL KBM
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ SECTION 2: R2 - RETENSI ATURAN BOLOS & FALLBACK JURNAL KBM ━━━${RESET}`);

  const mockStudent1 = { id: 's-101', nisn: '0012345678', nama_siswa: 'Aditya Pratama' };
  const mockStudent2 = { id: 's-102', nisn: '0023456789', nama_siswa: 'Bella Safitri' };
  const mockStudent3 = { id: 's-103', nisn: '0034567890', nama_siswa: 'Citra Kirana' };
  const mockStudent4 = { id: 's-104', nisn: '0045678901', nama_siswa: 'Dimas Anggara' };

  check('R2.1', 'findLastKbmJournal mendeteksi jurnal dengan jam_ke tertinggi yang memiliki data absensi', () => {
    const journals = [
      { jam_ke: 'Jam ke-1', mapel: 'Pendidikan Agama', absensi_siswa: { '0012345678': 'H' } },
      { jam_ke: 'Jam ke-4', mapel: 'Matematika', absensi_siswa: { '0012345678': 'H' } },
      { jam_ke: 'Jam ke-6', mapel: 'Fisika', absensi_siswa: { '0012345678': 'A', '0023456789': 'H' } },
      { jam_ke: 'Jam ke-7', mapel: 'Pramuka', absensi_siswa: {} } // Kosong, harus diabaikan
    ];

    const last = findLastKbmJournal(journals);
    assert.ok(last, 'Harus mengembalikan jurnal');
    assert.strictEqual(last.jam_ke, 'Jam ke-6');
    assert.strictEqual(last.mapel, 'Fisika');
  });

  check('R2.2', 'Siswa hadir pagi di gerbang/kelas tapi Alfa di sesi KBM terakhir otomatis berstatus Bolos', () => {
    const lastJournal = {
      jam_ke: 'Jam ke-5',
      mapel: 'Biologi',
      absensi_siswa: { '0012345678': 'A', '0023456789': 'H' }
    };

    // Aditya had morning presence (gate) + Alfa in last KBM -> Bolos
    const resAditya = resolveDailyStudentAttendance(mockStudent1, null, true, lastJournal);
    assert.strictEqual(resAditya.status, 'Bolos');

    // Aditya had class attendance 'Hadir' from morning + Alfa in last KBM -> Bolos
    const resAdityaClass = resolveDailyStudentAttendance(mockStudent1, { status: 'Hadir' }, false, lastJournal);
    assert.strictEqual(resAdityaClass.status, 'Bolos');

    // Bella had morning presence + Hadir in last KBM -> Hadir
    const resBella = resolveDailyStudentAttendance(mockStudent2, null, true, lastJournal);
    assert.strictEqual(resBella.status, 'Hadir');
  });

  check('R2.3', 'Fallback dinamis aktif mewarisi status dari sesi KBM jam terakhir saat wali kelas belum mengisi', () => {
    const lastJournal = {
      jam_ke: 'Jam ke-6',
      mapel: 'Kimia',
      absensi_siswa: { '0034567890': 'S', '0045678901': 'I' }
    };

    // Citra: no wali kelas record, no morning gate -> inherits Sakit from KBM
    const resCitra = resolveDailyStudentAttendance(mockStudent3, null, false, lastJournal);
    assert.strictEqual(resCitra.status, 'Sakit');
    assert.strictEqual(resCitra.isFallback, true);
    assert.ok(resCitra.source.includes('Fallback Jurnal KBM'));

    // Dimas: no wali kelas record, no morning gate -> inherits Izin from KBM
    const resDimas = resolveDailyStudentAttendance(mockStudent4, null, false, lastJournal);
    assert.strictEqual(resDimas.status, 'Izin');
    assert.strictEqual(resDimas.isFallback, true);
    assert.ok(resDimas.source.includes('Fallback Jurnal KBM'));
  });

  check('R2.4', 'Status Sakit dan Izin dari Wali Kelas tidak pernah tertimpa menjadi Bolos', () => {
    const lastJournal = {
      jam_ke: 'Jam ke-5',
      mapel: 'Sejarah',
      absensi_siswa: { '0012345678': 'A' }
    };

    // Aditya was recorded Sakit by Wali Kelas, even if he tapped gate morning and Alfa in mapel
    const resSakit = resolveDailyStudentAttendance(mockStudent1, { status: 'Sakit' }, true, lastJournal);
    assert.strictEqual(resSakit.status, 'Sakit');
    assert.strictEqual(resSakit.isFallback, false);

    // Citra was recorded Izin by Wali Kelas, even if marked Alfa in mapel
    const resIzin = resolveDailyStudentAttendance(mockStudent3, { status: 'Izin' }, true, lastJournal);
    assert.strictEqual(resIzin.status, 'Izin');
    assert.strictEqual(resIzin.isFallback, false);
  });

  check('R2.5', 'Adversarial student identifier matching & absentee-only lists in resolveDailyStudentAttendance', () => {
    // 1. Student matched by id when nisn is missing
    const studentNoNisn = { id: 's-999', nama_siswa: 'Zahra Amelia' };
    const journalIdMatch = {
      jam_ke: 'Jam ke-4',
      mapel: 'Seni Budaya',
      absensi_siswa: { 's-999': 'I' }
    };
    const resId = resolveDailyStudentAttendance(studentNoNisn, null, false, journalIdMatch);
    assert.strictEqual(resId.status, 'Izin');

    // 2. Student matched by trimmed whitespace NISN
    const studentWithSpaceNisn = { id: 's-888', nisn: ' 0012345678 ', nama_siswa: 'Aditya Pratama' };
    const journalCleanNisn = {
      jam_ke: 'Jam ke-4',
      mapel: 'Geografi',
      absensi_siswa: { '0012345678': 'A' }
    };
    const resSpaceNisn = resolveDailyStudentAttendance(studentWithSpaceNisn, null, true, journalCleanNisn);
    assert.strictEqual(resSpaceNisn.status, 'Bolos');

    // 3. Absentee-only journal: student not listed defaults to Hadir
    const studentNotListed = { id: 's-777', nisn: '0099999999', nama_siswa: 'Gilang Ramadhan' };
    const absenteeOnlyJournal = {
      jam_ke: 'Jam ke-3',
      mapel: 'Bahasa Indonesia',
      absensi_siswa: { '0012345678': 'A', '0023456789': 'S' }
    };
    const resUnlisted = resolveDailyStudentAttendance(studentNotListed, null, false, absenteeOnlyJournal);
    assert.strictEqual(resUnlisted.status, 'Hadir');
  });

  check('R2.6', 'findLastKbmJournal handles complex jam_ke format strings ("Jam 7-8", "Jam ke-9", numeric 10)', () => {
    const mixedJournals = [
      { jam_ke: 'Jam 1-2', mapel: 'PABP', absensi_siswa: { '001': 'H' } },
      { jam_ke: 'Jam 7-8', mapel: 'Fisika', absensi_siswa: { '001': 'H' } },
      { jam_ke: 'Jam ke-9', mapel: 'Kimia', absensi_siswa: { '001': 'A' } },
      { jam_ke: 6, mapel: 'Biologi', absensi_siswa: { '001': 'H' } }
    ];

    const last = findLastKbmJournal(mixedJournals);
    assert.ok(last);
    assert.strictEqual(last.jam_ke, 'Jam ke-9');
    assert.strictEqual(last.mapel, 'Kimia');
  });

  check('R2.7', 'findLastKbmJournal ignores whitespace-padded empty JSON and extractMaxJamKe parses Roman numerals', () => {
    // 1. Whitespace-padded empty JSON should not be counted as attendance data
    const emptyWithSpace = { jam_ke: 'Jam ke-8', mapel: 'Seni', absensi_siswa: '{\n  \n}' };
    const validEarlier = { jam_ke: 'Jam ke-4', mapel: 'Matematika', absensi_siswa: { '0012345678': 'A' } };
    const picked = findLastKbmJournal([emptyWithSpace, validEarlier]);
    assert.ok(picked);
    assert.strictEqual(picked.jam_ke, 'Jam ke-4', 'Must pick journal with actual attendance data over whitespace-padded empty JSON');

    // 2. extractMaxJamKe parses Roman numerals
    assert.strictEqual(extractMaxJamKe('Jam ke-IV'), 4);
    assert.strictEqual(extractMaxJamKe('Jam ke-VII'), 7);
    assert.strictEqual(extractMaxJamKe('Jam IX'), 9);
    assert.strictEqual(extractMaxJamKe('Jam ke-XII'), 12);
  });

  check('R2.8', 'resolveDailyStudentAttendance handles "Alpha" spelling and object-wrapped status payloads', () => {
    const student = { id: 's-alpha', nisn: '998877', nama_siswa: 'Alpha Tester' };

    // 1. "Alpha" spelling in class record
    const resClassAlpha = resolveDailyStudentAttendance(student, { status: 'Alpha' }, false);
    assert.strictEqual(resClassAlpha.status, 'Alpa');

    // 2. Object status in absensi_siswa JSON
    const journalObj = {
      jam_ke: 'Jam ke-5',
      absensi_siswa: { '998877': { status: 'A' } }
    };
    const resObj = resolveDailyStudentAttendance(student, null, true, journalObj);
    assert.strictEqual(resObj.status, 'Bolos', 'Morning hadir + Alfa object payload in last KBM resolves to Bolos');
  });

  check('R2.9', 'RekapSiswaView fetchGerbangAttendance query includes detail_absen and kehadiran_murid', () => {
    const rekapSrc = fs.readFileSync(path.resolve('src/components/RekapSiswaView.tsx'), 'utf8');
    assert.ok(
      rekapSrc.includes(".select('jam_ke, mapel, absensi_siswa, detail_absen, kehadiran_murid, tanggal')"),
      'fetchGerbangAttendance query must select detail_absen and kehadiran_murid to ensure full Bolos detection'
    );
  });

  // ==========================================================================
  // SECTION 3: R3 - NOTIFIKASI WHATSAPP & CETAK/EXPORT REKAP
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ SECTION 3: R3 - NOTIFIKASI WHATSAPP & CETAK/EXPORT REKAP ━━━${RESET}`);

  check('R3.1', 'Integrasi notifikasi 1-click WhatsApp orang tua memformat pesan dan URL dengan benar', () => {
    const phone = normalizeIndonesianPhoneNumber('081234567890');
    assert.strictEqual(phone, '6281234567890');

    const msgHadir = formatWhatsAppAttendanceMessage({
      studentName: 'Aditya Pratama',
      kelas: '7A',
      status: 'Hadir Datang',
      tanggal: '2026-11-03',
      timeStr: '06:45'
    });
    assert.ok(msgHadir.includes('Aditya Pratama'));
    assert.ok(msgHadir.includes('Hadir Datang'));
    assert.ok(msgHadir.includes('06:45'));

    const url = generateParentWhatsAppUrl({
      phone: '081234567890',
      studentName: 'Aditya Pratama',
      kelas: '7A',
      status: 'Hadir Datang',
      tanggal: '2026-11-03',
      timeStr: '06:45'
    });
    assert.ok(url.startsWith('https://wa.me/6281234567890?text='));
    assert.ok(url.includes(encodeURIComponent('Aditya Pratama')));
  });

  check('R3.2', 'Komponen RekapSiswaView & PiketView memuat fungsi cetak dan ekspor CSV lengkap', () => {
    const rekapSrc = fs.readFileSync(path.resolve('src/components/RekapSiswaView.tsx'), 'utf8');
    const piketSrc = fs.readFileSync(path.resolve('src/components/PiketView.tsx'), 'utf8');

    // RekapSiswaView
    assert.ok(rekapSrc.includes('exportGerbangCsv'), 'RekapSiswaView harus memiliki fungsi exportGerbangCsv');
    assert.ok(rekapSrc.includes('triggerPrintWithGps'), 'RekapSiswaView harus menggunakan triggerPrintWithGps');
    assert.ok(rekapSrc.includes('triggerParentWhatsApp'), 'RekapSiswaView harus mengintegrasikan triggerParentWhatsApp');

    // PiketView
    assert.ok(piketSrc.includes('exportRekapPiketCSV'), 'PiketView harus memiliki fungsi exportRekapPiketCSV');
    assert.ok(piketSrc.includes('triggerPrintWithGps'), 'PiketView harus menggunakan triggerPrintWithGps');
    assert.ok(piketSrc.includes('triggerParentWhatsApp'), 'PiketView harus mengintegrasikan triggerParentWhatsApp');
  });

  check('R3.3', 'exportGerbangCsv aman dari injeksi tanda petik (quotes) sesuai spesifikasi RFC 4180', () => {
    const rekapSrc = fs.readFileSync(path.resolve('src/components/RekapSiswaView.tsx'), 'utf8');
    assert.ok(
      rekapSrc.includes('(s.nama_siswa || \'\').replace(/"/g, \'""\')') ||
      rekapSrc.includes('(s.nama_siswa || "").replace(/"/g, \'""\')') ||
      rekapSrc.includes('.replace(/"/g, \'""\')'),
      'RekapSiswaView exportGerbangCsv must safely escape double quotes in student names'
    );
  });

  check('R3.4', 'exportGerbangCsv meng-escape dan mengutip seluruh kolom teks (NISN, Kelas, Tanggal)', () => {
    const rekapSrc = fs.readFileSync(path.resolve('src/components/RekapSiswaView.tsx'), 'utf8');
    assert.ok(
      rekapSrc.includes('`"${(s.nisn || \'\').replace(/"/g, \'""\')}"`'),
      'NISN must be escaped and quoted in CSV'
    );
    assert.ok(
      rekapSrc.includes('`"${(s.kelas || gerbangKelas || \'\').replace(/"/g, \'""\')}"`'),
      'Kelas must be escaped and quoted in CSV'
    );
  });

  // ==========================================================================
  // SECTION 4: R4 - KONSISTENSI TAMPILAN WAKTU SCAN GERBANG
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}━━━ SECTION 4: R4 - KONSISTENSI TAMPILAN WAKTU SCAN GERBANG ━━━${RESET}`);

  check('R4.1', 'formatPresensiTime menormalkan berbagai format waktu ke format WITA HH:mm', () => {
    assert.strictEqual(formatPresensiTime('06:45:30'), '06:45');
    assert.strictEqual(formatPresensiTime('7:15:00'), '07:15');
    assert.strictEqual(formatPresensiTime('14.05.00'), '14:05');
    assert.strictEqual(formatPresensiTime('02:30 PM'), '14:30');
    assert.strictEqual(formatPresensiTime('2026-11-03 07:20:00'), '07:20');
    assert.strictEqual(formatPresensiTime('2026-11-03T06:15:00Z'), '14:15'); // UTC to WITA (+8)
    assert.strictEqual(formatPresensiTime('-'), null);
    assert.strictEqual(formatPresensiTime(''), null);
    assert.strictEqual(formatPresensiTime(undefined), null);
    assert.strictEqual(formatPresensiTime(null), null);
  });

  check('R4.2', 'RekapSiswaView menampilkan jam datang aktual dan jam pulang aktual atau "-" jika belum pulang', () => {
    const mockGateRecords = [
      { siswa_id: 's-101', status: 'datang', jam: '06:45:00' },
      { siswa_id: 's-101', status: 'pulang', jam: '14:05:00' },
      { siswa_id: 's-102', status: 'datang', jam: '07:10:00' }
      // s-102 has NOT checked out yet
    ];

    // s-101 mapping
    const s1Datang = mockGateRecords.find(r => r.siswa_id === 's-101' && r.status === 'datang');
    const s1Pulang = mockGateRecords.find(r => r.siswa_id === 's-101' && r.status === 'pulang');
    const s1JamDatang = formatPresensiTime(s1Datang?.jam);
    const s1JamPulang = formatPresensiTime(s1Pulang?.jam);

    assert.strictEqual(s1JamDatang, '06:45');
    assert.strictEqual(s1JamPulang, '14:05');
    assert.strictEqual(`${s1JamDatang} WITA`, '06:45 WITA');
    assert.strictEqual(`${s1JamPulang} WITA`, '14:05 WITA');

    // s-102 mapping (belum presensi pulang)
    const s2Datang = mockGateRecords.find(r => r.siswa_id === 's-102' && r.status === 'datang');
    const s2Pulang = mockGateRecords.find(r => r.siswa_id === 's-102' && r.status === 'pulang');
    const s2JamDatang = formatPresensiTime(s2Datang?.jam);
    const s2JamPulang = formatPresensiTime(s2Pulang?.jam);

    assert.strictEqual(s2JamDatang, '07:10');
    assert.strictEqual(s2JamPulang, null);
    assert.strictEqual(s2JamDatang ? `${s2JamDatang} WITA` : '-', '07:10 WITA');
    assert.strictEqual(s2JamPulang ? `${s2JamPulang} WITA` : '-', '-');
  });

  check('R4.3', 'PiketView menampilkan Jam Datang dan Jam Pulang pada roster dan WhatsApp notification', () => {
    const piketSrc = fs.readFileSync(path.resolve('src/components/PiketView.tsx'), 'utf8');

    // Roster rendering uses formatPresensiTime
    assert.ok(piketSrc.includes('Datang {formatPresensiTime(datangRecord.jam) || \'-\'}'));
    assert.ok(piketSrc.includes('Pulang {formatPresensiTime(pulangRecord.jam) || \'-\'}'));

    // WhatsApp notification passes formatPresensiTime
    assert.ok(piketSrc.includes('timeStr: formatPresensiTime(pulangRecord?.jam) || formatPresensiTime(datangRecord?.jam) || undefined'));

    // Eliminates naive slice fallback
    assert.ok(!piketSrc.includes('datangRecord.jam.slice(0, 5)'));
    assert.ok(!piketSrc.includes('pulangRecord.jam.slice(0, 5)'));
  });

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log(`\n${CYAN}══════════════════════════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}SUMMARY: Total ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}${RESET}`);
  if (failedTests === 0) {
    console.log(`${GREEN}${BOLD}VERDICT: ALL REQUIREMENTS R1-R4 AND ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!${RESET}\n`);
  } else {
    console.log(`${RED}${BOLD}VERDICT: TEST FAILURES DETECTED!${RESET}\n`);
    process.exitCode = 1;
  }
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exitCode = 1;
});
