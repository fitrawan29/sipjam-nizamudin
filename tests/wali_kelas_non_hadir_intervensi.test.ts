/**
 * ============================================================================
 * TEST SUITE: WALI KELAS NON-HADIR INTERVENSI PRESENSI SISWA
 * File: tests/wali_kelas_non_hadir_intervensi.test.ts
 *
 * Requirements:
 * R1. Wali kelas dengan status presensi non-hadir (Dinas Luar, Izin, Sakit, Cuti, dll)
 *     tetap diizinkan melakukan intervensi presensi siswa di kelas binaannya.
 * R2. Pengguna yang bukan wali kelas dari siswa terkait tetap ditolak.
 * R3. Preservasi logika eksisting dan pencegahan regresi.
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  isWaliKelasIntervensiAllowed,
  canWaliKelasIntervene,
  isWaliKelasIntervensiAuthorized,
  validateWaliKelasIntervensi
} from '../src/lib/presensiIntervensi';

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
  console.log(`${CYAN}${BOLD}║  WALI KELAS NON-HADIR INTERVENSI PRESENSI SISWA TEST SUITE           ║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  // SECTION 1: WALI KELAS DENGAN STATUS NON-HADIR (DINAS LUAR, IZIN, SAKIT, CUTI)
  console.log(`${YELLOW}${BOLD}━━━ 1. UNIT TEST: canWaliKelasIntervene DENGAN STATUS NON-HADIR ━━━${RESET}`);

  const mockWaliKelasUser = {
    id: 'guru-uuid-001',
    nama: 'Fitra Suryazana Mamonto, S.Pd',
    role: 'Guru',
    wali_kelas: 'X Merdeka A',
    penugasan: { kelas_binaan: 'X Merdeka A' }
  };

  // 1.1 Dinas Luar
  const resDinasLuar = canWaliKelasIntervene(mockWaliKelasUser, 'X Merdeka A', 'Dinas Luar');
  if (resDinasLuar.allowed === true && resDinasLuar.isWaliKelas === true) {
    pass('WALI-NONHADIR-01', 'Wali kelas berstatus presensi Dinas Luar berhasil diizinkan intervensi presensi siswa binaan', resDinasLuar.reason);
  } else {
    fail('WALI-NONHADIR-01', 'Wali kelas berstatus Dinas Luar ditolak', resDinasLuar);
  }

  // 1.2 Izin
  const resIzin = canWaliKelasIntervene(mockWaliKelasUser, 'X Merdeka A', 'Izin');
  if (resIzin.allowed === true && resIzin.isWaliKelas === true) {
    pass('WALI-NONHADIR-02', 'Wali kelas berstatus presensi Izin berhasil diizinkan intervensi presensi siswa binaan', resIzin.reason);
  } else {
    fail('WALI-NONHADIR-02', 'Wali kelas berstatus Izin ditolak', resIzin);
  }

  // 1.3 Sakit
  const resSakit = canWaliKelasIntervene(mockWaliKelasUser, 'X Merdeka A', 'Sakit');
  if (resSakit.allowed === true && resSakit.isWaliKelas === true) {
    pass('WALI-NONHADIR-03', 'Wali kelas berstatus presensi Sakit berhasil diizinkan intervensi presensi siswa binaan', resSakit.reason);
  } else {
    fail('WALI-NONHADIR-03', 'Wali kelas berstatus Sakit ditolak', resSakit);
  }

  // 1.4 Cuti
  const resCuti = canWaliKelasIntervene(mockWaliKelasUser, 'X Merdeka A', 'Cuti');
  if (resCuti.allowed === true && resCuti.isWaliKelas === true) {
    pass('WALI-NONHADIR-04', 'Wali kelas berstatus presensi Cuti berhasil diizinkan intervensi presensi siswa binaan', resCuti.reason);
  } else {
    fail('WALI-NONHADIR-04', 'Wali kelas berstatus Cuti ditolak', resCuti);
  }

  // 1.5 Object payload status presensi guru (seperti data presensi_guru)
  const resObjectPresensi = canWaliKelasIntervene(mockWaliKelasUser, 'X Merdeka A', {
    status: 'Disetujui',
    jenis_presensi: 'Dinas Luar',
    detail_izin: 'Tugas Workshop Kurikulum'
  });
  if (resObjectPresensi.allowed === true && resObjectPresensi.isWaliKelas === true) {
    pass('WALI-NONHADIR-05', 'Dukungan payload objek presensi guru (jenis_presensi: Dinas Luar) berhasil diizinkan', resObjectPresensi.reason);
  } else {
    fail('WALI-NONHADIR-05', 'Payload objek presensi guru gagal diproses', resObjectPresensi);
  }

  // 1.6 Case & whitespace normalization pada nama kelas
  const resClassNorm = canWaliKelasIntervene(mockWaliKelasUser, 'Kelas x merdeka a', 'Cuti');
  if (resClassNorm.allowed === true && resClassNorm.isWaliKelas === true) {
    pass('WALI-NONHADIR-06', 'Normalisasi format kelas ("Kelas x merdeka a" vs "X Merdeka A") berhasil cocok', resClassNorm.reason);
  } else {
    fail('WALI-NONHADIR-06', 'Normalisasi nama kelas gagal', resClassNorm);
  }

  // SECTION 2: OTORISASI DAN PENOLAKAN NON-WALI KELAS
  console.log(`\n${YELLOW}${BOLD}━━━ 2. UNIT TEST: OTORISASI & PENOLAKAN PENGGUNA BUKAN WALI KELAS ━━━${RESET}`);

  // 2.1 Guru lain (bukan wali kelas) mencoba intervensi
  const mockRegularTeacher = {
    id: 'guru-regular-002',
    nama: 'Budi Santoso, M.Pd',
    role: 'Guru',
    wali_kelas: null,
    penugasan: null
  };
  const resNonWali = canWaliKelasIntervene(mockRegularTeacher, 'X Merdeka A', 'Hadir');
  if (resNonWali.allowed === false && resNonWali.isWaliKelas === false) {
    pass('WALI-AUTH-01', 'Pengguna yang bukan wali kelas dari siswa terkait tetap ditolak melakukan intervensi', resNonWali.reason);
  } else {
    fail('WALI-AUTH-01', 'Pengguna bukan wali kelas salah diizinkan intervensi', resNonWali);
  }

  // 2.2 Wali kelas kelas lain mencoba intervensi kelas orang lain
  const resWaliDifferentClass = canWaliKelasIntervene(mockWaliKelasUser, 'XI Merdeka B', 'Dinas Luar');
  if (resWaliDifferentClass.allowed === false && resWaliDifferentClass.isWaliKelas === false) {
    pass('WALI-AUTH-02', 'Wali kelas X Merdeka A ditolak saat mencoba intervensi presensi kelas XI Merdeka B', resWaliDifferentClass.reason);
  } else {
    fail('WALI-AUTH-02', 'Wali kelas dapat mengintervensi kelas di luar binaannya', resWaliDifferentClass);
  }

  // 2.3 Unauthenticated user (null/undefined)
  const resUnauth = canWaliKelasIntervene(null, 'X Merdeka A');
  if (resUnauth.allowed === false && resUnauth.isWaliKelas === false) {
    pass('WALI-AUTH-03', 'Pengguna tanpa otentikasi (null) ditolak secara ketat', resUnauth.reason);
  } else {
    fail('WALI-AUTH-03', 'Pengguna null tidak ditolak', resUnauth);
  }

  // 2.4 Administrator globally authorized
  const mockAdminUser = {
    id: 'admin-001',
    nama: 'Administrator Utama',
    role: 'Admin'
  };
  const resAdmin = canWaliKelasIntervene(mockAdminUser, 'X Merdeka A');
  if (resAdmin.allowed === true && resAdmin.isWaliKelas === true) {
    pass('WALI-AUTH-04', 'Administrator memiliki hak intervensi lintas seluruh kelas binaan', resAdmin.reason);
  } else {
    fail('WALI-AUTH-04', 'Administrator gagal mendapatkan hak akses intervensi', resAdmin);
  }

  // 2.5 Superadmin globally authorized
  const mockSuperadmin = {
    id: 'superadmin-001',
    nama: 'Superadmin Global',
    role: 'Superadmin'
  };
  const resSuperadmin = canWaliKelasIntervene(mockSuperadmin, 'XII Merdeka C');
  if (resSuperadmin.allowed === true && resSuperadmin.isSuperadmin !== false) {
    pass('WALI-AUTH-05', 'Superadmin memiliki hak intervensi lintas seluruh kelas', resSuperadmin.reason);
  } else {
    fail('WALI-AUTH-05', 'Superadmin gagal mendapatkan hak akses intervensi', resSuperadmin);
  }

  // 2.6 Aliases export consistency
  if (isWaliKelasIntervensiAuthorized === canWaliKelasIntervene && validateWaliKelasIntervensi === canWaliKelasIntervene) {
    pass('WALI-AUTH-06', 'Helper alias isWaliKelasIntervensiAuthorized & validateWaliKelasIntervensi konsisten diekspor');
  } else {
    fail('WALI-AUTH-06', 'Helper alias tidak merujuk ke fungsi yang sama');
  }

  // SECTION 3: WALI KELAS TIME WINDOW DENGAN TEACHER STATUS
  console.log(`\n${YELLOW}${BOLD}━━━ 3. UNIT TEST: isWaliKelasIntervensiAllowed DENGAN STATUS GURU ━━━${RESET}`);

  // 3.1 Pagi window (08:30) with Dinas Luar
  const checkPagiDinas = isWaliKelasIntervensiAllowed('12:00', '13:00', '14:00', '08:30', 'Dinas Luar');
  if (checkPagiDinas.allowed === true && checkPagiDinas.phase === 'pagi') {
    pass('WALI-TIME-01', 'isWaliKelasIntervensiAllowed mengizinkan intervensi pagi saat guru Dinas Luar');
  } else {
    fail('WALI-TIME-01', 'Gagal pada jendela pagi saat guru Dinas Luar', checkPagiDinas);
  }

  // 3.2 Pagi window (10:00) with Izin / Sakit / Cuti
  const checkPagiIzin = isWaliKelasIntervensiAllowed('12:00', '13:00', '14:00', '10:00', 'Izin');
  const checkPagiSakit = isWaliKelasIntervensiAllowed('12:00', '13:00', '14:00', '10:00', 'Sakit');
  const checkPagiCuti = isWaliKelasIntervensiAllowed('12:00', '13:00', '14:00', '10:00', 'Cuti');
  if (checkPagiIzin.allowed && checkPagiSakit.allowed && checkPagiCuti.allowed) {
    pass('WALI-TIME-02', 'isWaliKelasIntervensiAllowed mengizinkan intervensi pagi saat guru Izin, Sakit, atau Cuti');
  } else {
    fail('WALI-TIME-02', 'Gagal pada jendela pagi saat guru Izin, Sakit, atau Cuti');
  }

  // 3.3 Pulang window (11:30) with non-hadir status
  const checkPulangCuti = isWaliKelasIntervensiAllowed('12:00', '11:00', '12:00', '11:30', 'Cuti');
  if (checkPulangCuti.allowed === true && checkPulangCuti.phase === 'pulang') {
    pass('WALI-TIME-03', 'isWaliKelasIntervensiAllowed mengizinkan intervensi pulang saat guru Cuti');
  } else {
    fail('WALI-TIME-03', 'Gagal pada jendela pulang saat guru Cuti', checkPulangCuti);
  }

  // 3.4 Outside window remains locked even if non-hadir
  const checkExpired = isWaliKelasIntervensiAllowed('12:00', '11:00', '12:00', '12:05', 'Dinas Luar');
  if (checkExpired.allowed === false && checkExpired.phase === 'malam_tutup') {
    pass('WALI-TIME-04', 'isWaliKelasIntervensiAllowed tetap mengunci presensi saat di luar jadwal intervensi (12:05 WITA)');
  } else {
    fail('WALI-TIME-04', 'Penguncian waktu terlewati', checkExpired);
  }

  // SECTION 4: INTEGRASI UI & REGRESSION PROOF (RekapSiswaView & AppScreen)
  console.log(`\n${YELLOW}${BOLD}━━━ 4. VERIFIKASI INTEGRASI UI & REGRESI LOGIKA EKSISTING ━━━${RESET}`);

  const rekapCode = fs.readFileSync(path.resolve('src/components/RekapSiswaView.tsx'), 'utf-8');
  const appScreenCode = fs.readFileSync(path.resolve('src/components/AppScreen.tsx'), 'utf-8');

  // 4.1 RekapSiswaView mengintegrasikan canWaliKelasIntervene
  if (rekapCode.includes('canWaliKelasIntervene') && rekapCode.includes('authCheck = canWaliKelasIntervene')) {
    pass('UI-INT-01', 'RekapSiswaView mengintegrasikan canWaliKelasIntervene untuk proteksi otorisasi kelas binaan');
  } else {
    fail('UI-INT-01', 'RekapSiswaView belum mengintegrasikan canWaliKelasIntervene');
  }

  // 4.2 RekapSiswaView menolak non-wali dengan sweetalert
  if (rekapCode.includes('Anda bukan wali kelas dari kelas binaan ini sehingga tidak berhak melakukan intervensi presensi')) {
    pass('UI-INT-02', 'RekapSiswaView menolak pengguna bukan wali kelas dengan peringatan SweetAlert');
  } else {
    fail('UI-INT-02', 'Pesan penolakan non-wali tidak ditemukan di RekapSiswaView');
  }

  // 4.3 RekapSiswaView mempertahankan dual-role support isReadOnly
  if (rekapCode.includes('isReadOnly = isGlobalReadOnly && !isOwnHomeroomClass')) {
    pass('REGRESS-01', 'RekapSiswaView mempertahankan preservasi isReadOnly = isGlobalReadOnly && !isOwnHomeroomClass');
  } else {
    fail('REGRESS-01', 'Aturan dual-role isReadOnly berubah');
  }

  // 4.4 AppScreen tidak memblokir view-rekap-siswa pada restrictedViews
  if (appScreenCode.includes("restrictedViews = ['view-guru-jurnal', 'view-piket', 'view-guru-presensi']") &&
      !appScreenCode.includes("restrictedViews = ['view-guru-jurnal', 'view-piket', 'view-guru-presensi', 'view-rekap-siswa']")) {
    pass('REGRESS-02', 'AppScreen restrictedViews tidak membatasi view-rekap-siswa dari alur presensi harian guru');
  } else {
    fail('REGRESS-02', 'view-rekap-siswa salah dimasukkan ke restrictedViews');
  }

  // 4.5 AppScreen route guard tetap melindungi view-rekap-siswa dari guru non-wali
  if (appScreenCode.includes("if (targetId === 'view-rekap-siswa') {") &&
      appScreenCode.includes('!isAdmin && !isSuperadmin && !isWaliKelas && !isKepalaSekolah')) {
    pass('REGRESS-03', 'AppScreen navigation guard secara ketat menolak guru non-wali dari akses modul Presensi Siswa');
  } else {
    fail('REGRESS-03', 'AppScreen navigation guard tidak membatasi akses non-wali');
  }

  // 4.6 RekapSiswaView mempertahankan pencatatan sumber_perubahan Wali Kelas
  if (rekapCode.includes("sumber_perubahan: 'Wali Kelas'") && rekapCode.includes("diubah_oleh: user?.nama || 'Wali Kelas'")) {
    pass('REGRESS-04', 'RekapSiswaView mempertahankan pencatatan sumber_perubahan = "Wali Kelas" dan diubah_oleh');
  } else {
    fail('REGRESS-04', 'Pencatatan sumber_perubahan Wali Kelas tidak utuh');
  }

  // SECTION 5: ADVERSARIAL EDGE CASES & POLYMORPHIC RESILIENCE
  console.log(`\n${YELLOW}${BOLD}━━━ 5. ADVERSARIAL ROBUSTNESS: CLASS FORMATTING & POLYMORPHIC ARGUMENTS ━━━${RESET}`);

  // 5.1 Hyphen, space, and punctuation tolerance in class matching
  const resHyphenSpace = canWaliKelasIntervene({ role: 'guru', wali_kelas: 'VII-A' }, 'VII A');
  if (resHyphenSpace.allowed === true && resHyphenSpace.isWaliKelas === true) {
    pass('ADV-ROBUST-01', 'Pencocokan kelas toleran terhadap tanda hubung vs spasi ("VII-A" vs "VII A")');
  } else {
    fail('ADV-ROBUST-01', 'Pencocokan tanda hubung vs spasi gagal', resHyphenSpace);
  }

  // 5.2 Prefix "Kelas" with hyphen vs standard ("Kelas VII-A" vs "VII A")
  const resPrefixHyphen = canWaliKelasIntervene({ role: 'guru', wali_kelas: 'Kelas VII-A' }, 'VII A');
  if (resPrefixHyphen.allowed === true) {
    pass('ADV-ROBUST-02', 'Pencocokan kelas toleran terhadap prefix "Kelas " dan tanda hubung');
  } else {
    fail('ADV-ROBUST-02', 'Pencocokan prefix "Kelas " dan tanda hubung gagal', resPrefixHyphen);
  }

  // 5.3 Roman numeral vs Arabic numeral canonicalization ("VII A" vs "7 A", "X Merdeka A" vs "10 Merdeka A")
  const resRomanArabic = canWaliKelasIntervene({ role: 'guru', wali_kelas: 'VII A' }, '7 A');
  const resMerdekaRoman = canWaliKelasIntervene({ role: 'guru', wali_kelas: 'X Merdeka A' }, '10 Merdeka A');
  if (resRomanArabic.allowed === true && resMerdekaRoman.allowed === true) {
    pass('ADV-ROBUST-03', 'Pencocokan kelas mengenali ekuivalensi angka romawi & arab (VII <=> 7, X <=> 10)');
  } else {
    fail('ADV-ROBUST-03', 'Pencocokan angka romawi & arab gagal', { resRomanArabic, resMerdekaRoman });
  }

  // 5.4 Support for direct user properties (user.kelas_binaan, user.assignedKelas, user.assigned_kelas)
  const resKelasBinaan = canWaliKelasIntervene({ role: 'guru', kelas_binaan: 'IX A' }, 'IX A');
  const resAssignedKelas = canWaliKelasIntervene({ role: 'guru', assignedKelas: 'IX A' }, 'IX A');
  const resAssigned_Kelas = canWaliKelasIntervene({ role: 'guru', assigned_kelas: 'IX A' }, 'IX A');
  if (resKelasBinaan.allowed && resAssignedKelas.allowed && resAssigned_Kelas.allowed) {
    pass('ADV-ROBUST-04', 'Dukungan properti penugasan variatif (kelas_binaan, assignedKelas, assigned_kelas)');
  } else {
    fail('ADV-ROBUST-04', 'Gagal mengenali properti alternatif kelas binaan pada user');
  }

  // 5.5 Target class passed as object ({ kelas: 'X Merdeka A' }) without runtime crash
  try {
    const resTargetObj = canWaliKelasIntervene({ role: 'guru', wali_kelas: 'X Merdeka A' }, { kelas: 'X Merdeka A' } as any);
    if (resTargetObj.allowed === true) {
      pass('ADV-ROBUST-05', 'Mendukung targetClass dalam bentuk objek ({ kelas: "..." }) tanpa TypeError');
    } else {
      fail('ADV-ROBUST-05', 'TargetClass objek menghasilkan allowed: false', resTargetObj);
    }
  } catch (err: any) {
    fail('ADV-ROBUST-05', 'TargetClass objek memicu runtime exception', err);
  }

  // 5.6 Support for array and delimited multi-class assignments
  const resArrayWali = canWaliKelasIntervene({ role: 'guru', wali_kelas: [{ kelas: 'VIII B' }] }, 'VIII B');
  const resCommaWali = canWaliKelasIntervene({ role: 'guru', wali_kelas: 'VIII A, VIII B' }, 'VIII B');
  if (resArrayWali.allowed && resCommaWali.allowed) {
    pass('ADV-ROBUST-06', 'Mendukung wali_kelas dalam bentuk array objek dan string multi-kelas koma');
  } else {
    fail('ADV-ROBUST-06', 'Gagal memproses array atau multi-kelas koma', { resArrayWali, resCommaWali });
  }

  // 5.7 Polymorphic 4th argument on isWaliKelasIntervensiAllowed with non-time teacher status string
  const resPolyStatusString = isWaliKelasIntervensiAllowed('12:00', '11:00', '12:00', 'Dinas Luar' as any);
  if (resPolyStatusString.phase !== 'malam_tutup' || resPolyStatusString.pesan.includes('Status intervensi tidak dapat diproses') === false) {
    pass('ADV-ROBUST-07', 'isWaliKelasIntervensiAllowed fleksibel menerima status guru sebagai argumen ke-4 tanpa runtime error');
  } else {
    fail('ADV-ROBUST-07', 'isWaliKelasIntervensiAllowed gagal pada argumen status string ke-4', resPolyStatusString);
  }

  // 5.8 Polymorphic 4th argument with object payload
  const resPolyStatusObj = isWaliKelasIntervensiAllowed('12:00', '11:00', '12:00', { status: 'Izin' } as any);
  if (resPolyStatusObj.pesan !== 'Status intervensi tidak dapat diproses.') {
    pass('ADV-ROBUST-08', 'isWaliKelasIntervensiAllowed fleksibel menerima objek presensi guru tanpa crash');
  } else {
    fail('ADV-ROBUST-08', 'isWaliKelasIntervensiAllowed crash saat menerima objek pada argumen ke-4', resPolyStatusObj);
  }

  // 5.9 Cross-class intervention attempt while teacher is on Cuti
  const resCrossClassCuti = canWaliKelasIntervene({ role: 'guru', wali_kelas: 'VII A' }, 'VII B', 'Cuti');
  if (resCrossClassCuti.allowed === false && resCrossClassCuti.reason.includes('bukan wali kelas')) {
    pass('ADV-ROBUST-09', 'Guru berstatus cuti tetap ditolak saat mencoba intervensi presensi kelas paralel lain');
  } else {
    fail('ADV-ROBUST-09', 'Guru cuti salah diizinkan intervensi kelas lain', resCrossClassCuti);
  }

  // 5.10 Integration with external waliKelasList database records
  const mockDbWaliList = [
    { kelas: '7-A', guru_id: 'guru-999', nama_guru: 'Ade Fitrawan', nip: '19870101' }
  ];
  const resViaList = canWaliKelasIntervene(
    { id: 'guru-999', role: 'guru', nama: 'Ade Fitrawan' },
    'VII A',
    'Dinas Luar',
    mockDbWaliList
  );
  if (resViaList.allowed === true && resViaList.isWaliKelas === true) {
    pass('ADV-ROBUST-10', 'Otorisasi intervensi berhasil terverifikasi melalui data relasi waliKelasList');
  } else {
    fail('ADV-ROBUST-10', 'Otorisasi via waliKelasList gagal', resViaList);
  }

  // SECTION 6: ADVERSARIAL REVIEW ROUND 2 DEEP ATTACK PROBES
  console.log(`\n${YELLOW}${BOLD}━━━ 6. ADVERSARIAL REVIEW ROUND 2 DEEP PROBES ━━━${RESET}`);

  // 6.1 Elementary school roman numeral canonicalization (I - VI)
  const resElemVI = canWaliKelasIntervene({ role: 'guru', wali_kelas: 'VI A' }, '6 A');
  const resElemIV = canWaliKelasIntervene({ role: 'guru', wali_kelas: 'IV B' }, '4 B');
  const resElemV = canWaliKelasIntervene({ role: 'guru', wali_kelas: 'Kelas V' }, '5');
  if (resElemVI.allowed && resElemIV.allowed && resElemV.allowed) {
    pass('ADV-ROBUST-11', 'Pencocokan kelas mengenali tingkat sekolah dasar (VI <=> 6, IV <=> 4, V <=> 5)');
  } else {
    fail('ADV-ROBUST-11', 'Gagal pada romawi kelas sekolah dasar', { resElemVI, resElemIV, resElemV });
  }

  // 6.2 Academic titles and degree suffix tolerance in database list matching
  const mockDbTitles = [
    { kelas: 'VIII-B', guru_id: 'dg-001', nama_guru: 'Budi Santoso', nip: '19700101' }
  ];
  const resTitleTolerance = canWaliKelasIntervene(
    { id: 'auth-user-999', data_guru_id: 'dg-001', role: 'guru', nama: 'Drs. Budi Santoso, M.Pd', username: '19700101' },
    'VIII B',
    'Izin',
    mockDbTitles
  );
  if (resTitleTolerance.allowed === true && resTitleTolerance.isWaliKelas === true) {
    pass('ADV-ROBUST-12', 'Toleransi gelar akademik dan NIP pada pencocokan relasi waliKelasList');
  } else {
    fail('ADV-ROBUST-12', 'Gagal mencocokkan guru dengan gelar akademik di waliKelasList', resTitleTolerance);
  }

  // 6.3 Separation of user auth id vs data_guru_id in relational lookup
  const resDataGuruIdMatch = canWaliKelasIntervene(
    { id: 'auth-uuid-different', data_guru_id: 'dg-001', role: 'guru', nama: 'Budi Santoso' },
    'VIII B',
    'Sakit',
    mockDbTitles
  );
  if (resDataGuruIdMatch.allowed === true) {
    pass('ADV-ROBUST-13', 'Relasi waliKelasList berhasil dicocokkan melalui data_guru_id');
  } else {
    fail('ADV-ROBUST-13', 'Gagal mencocokkan via data_guru_id', resDataGuruIdMatch);
  }

  // 6.4 RekapSiswaView rawAllowed & tarikRekap class authorization resilience
  if (rekapCode.includes('(user as any)?.assignedKelas') &&
      rekapCode.includes('allowedClasses.some(c => toCanonicalClass(c) === toCanonicalClass(targetKelas))')) {
    pass('ADV-ROBUST-14', 'RekapSiswaView mengintegrasikan penugasan kelas alternatif & toleransi kanonikal pada tarikRekap');
  } else {
    fail('ADV-ROBUST-14', 'RekapSiswaView belum mengintegrasikan pencocokan kanonikal pada tarikRekap');
  }

  // 6.5 workflow.ts Cuti leave protection preserves isIzinSakit and prevents false Alpa
  const workflowCode = fs.readFileSync(path.resolve('src/lib/workflow.ts'), 'utf-8');
  if (workflowCode.includes("jp === 'Cuti'") && workflowCode.includes("p.jenis_presensi === 'Cuti'")) {
    pass('ADV-ROBUST-15', 'workflow.ts memproteksi guru berstatus Cuti dari false-positive Alpa');
  } else {
    fail('ADV-ROBUST-15', 'workflow.ts tidak menyertakan proteksi Cuti');
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
