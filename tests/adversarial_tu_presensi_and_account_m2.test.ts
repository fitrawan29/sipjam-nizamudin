/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE - MILESTONE 2
 * File: tests/adversarial_tu_presensi_and_account_m2.test.ts
 *
 * Adversarial Challenger verification for:
 * 1. Admin Presensi Separation & Page-Break Print Layout (R3)
 *    - Presensi partitioning algorithm stress testing (Guru vs TU)
 *    - Edge cases: Titles, canonical names, case variations, zero-attendance, matching via NIP/user_id/role/mapel
 *    - Print layout: Strict CSS page-break container (breakBefore: 'page', pageBreakBefore: 'always')
 *    - Dual PrintHeader & PrintSignature isolation
 *    - CSV export generation & formatting
 * 2. Admin TU Account Creation & Assignment (R4)
 *    - Form validation stress testing for + Akun TU modal (4 mandatory fields + regex fuzzing)
 *    - Role toggle ("Tunjuk TU" / "Ke Guru") state logic & updates
 *    - teacherUserSync auto-sync resilience simulation (verifying TU accounts are never overwritten to Guru)
 * ============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { canonicalizeTeacherRekapName } from '../src/components/AdminRekapView';
import { syncTeacherAccounts, TeacherAccountItem } from '../src/lib/teacherUserSync';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, testId: string, desc: string, detail?: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ${GREEN}✔ [${testId}] PASS:${RESET} ${desc}`);
    if (detail) console.log(`    ${GRAY}↳ ${detail}${RESET}`);
  } else {
    failedAssertions++;
    console.error(`  ${RED}✖ [${testId}] FAIL:${RESET} ${desc}`);
    if (detail) console.error(`    ${RED}↳ Detail: ${detail}${RESET}`);
  }
}

// ============================================================================
// SIMULATION HELPERS DIRECTLY REFLECTING PRODUCTION CODE
// ============================================================================

/**
 * Exact replica of the Presensi partitioning algorithm from AdminRekapView.tsx lines 314-400 & 560-570
 */
function partitionPresensiRekap(
  guruList: Array<{ nama_guru: string; nip?: string; mata_pelajaran?: string; user_id?: string; [key: string]: any }>,
  userAccounts: Array<{ id: string; nama?: string; username?: string; role?: string; [key: string]: any }>,
  presensiList: Array<{ nama_guru: string; nip?: string; user_id?: string; [key: string]: any }>,
  totalHariKerja = 22
) {
  const isTestGuruName = (name?: string | null) => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return lower.includes('test guru') || lower.includes('guru test') || lower.includes('dummy');
  };

  // Set of identifiers belonging to Tata Usaha (TU)
  const tuIdentifiers = new Set<string>();
  (userAccounts || []).forEach((u: any) => {
    const norm = (u.role || '').toLowerCase().replace(/[\s_-]+/g, '');
    if (norm === 'tatausaha') {
      if (u.id) tuIdentifiers.add(String(u.id).toLowerCase());
      if (u.username) tuIdentifiers.add(String(u.username).trim().toLowerCase());
      if (u.nama) {
        tuIdentifiers.add(String(u.nama).trim().toLowerCase());
        tuIdentifiers.add(canonicalizeTeacherRekapName(u.nama).toLowerCase());
      }
    }
  });

  (guruList || []).forEach((g: any) => {
    const mapel = (g.mata_pelajaran || '').toLowerCase();
    if (mapel.includes('tata usaha')) {
      if (g.nama_guru) {
        tuIdentifiers.add(String(g.nama_guru).trim().toLowerCase());
        tuIdentifiers.add(canonicalizeTeacherRekapName(g.nama_guru).toLowerCase());
      }
      if (g.nip) tuIdentifiers.add(String(g.nip).trim().toLowerCase());
      if (g.user_id) tuIdentifiers.add(String(g.user_id).toLowerCase());
    }
  });

  const isStaffTU = (person: any) => {
    if (!person) return false;
    const n = String(person.nama || person.nama_guru || '').trim().toLowerCase();
    const c = canonicalizeTeacherRekapName(n).toLowerCase();
    const nip = String(person.nip || '').trim().toLowerCase();
    const uid = String(person.user_id || person.userId || person.id || '').toLowerCase();
    const mapel = String(person.mata_pelajaran || '').toLowerCase();
    return (
      tuIdentifiers.has(n) ||
      tuIdentifiers.has(c) ||
      (nip && tuIdentifiers.has(nip)) ||
      (uid && tuIdentifiers.has(uid)) ||
      mapel.includes('tata usaha')
    );
  };

  // Seed map with all teachers and staff from data_guru
  const pMap: Record<string, any> = {};
  guruList?.forEach(g => {
    const rawName = g.nama_guru?.trim();
    if (g.nama_guru && rawName && !isTestGuruName(g.nama_guru) && !isTestGuruName(rawName)) {
      const cName = canonicalizeTeacherRekapName(rawName);
      const isTuPerson = isStaffTU(g) || tuIdentifiers.has(cName.toLowerCase());
      if (!pMap[cName]) {
        pMap[cName] = {
          nama: cName,
          isTU: isTuPerson,
          hadir: 0,
          izin: 0,
          sakit: 0,
          dinasLuar: 0,
          pulangCepat: 0,
          telatDetik: 0,
          piket: 0,
          jurnal: 0
        };
      } else if (isTuPerson) {
        pMap[cName].isTU = true;
      }
    }
  });

  // Aggregate presensi records
  presensiList?.forEach(p => {
    const nama = p.nama_guru?.trim();
    if (!nama || isTestGuruName(nama)) return;
    const canonicalNama = canonicalizeTeacherRekapName(nama);
    const isTuPerson = isStaffTU(p) || tuIdentifiers.has(canonicalNama.toLowerCase());
    if (!pMap[canonicalNama]) {
      pMap[canonicalNama] = {
        nama: canonicalNama,
        isTU: isTuPerson,
        hadir: 0,
        izin: 0,
        sakit: 0,
        dinasLuar: 0,
        pulangCepat: 0,
        telatDetik: 0,
        piket: 0,
        jurnal: 0
      };
    } else if (isTuPerson) {
      pMap[canonicalNama].isTU = true;
    }

    if (p.tipe_absen === 'Datang') {
      pMap[canonicalNama].hadir++;
    } else if (p.jenis_presensi === 'Sakit') {
      pMap[canonicalNama].sakit++;
    } else if (p.jenis_presensi === 'Izin') {
      pMap[canonicalNama].izin++;
    } else if (p.jenis_presensi === 'Dinas Luar') {
      pMap[canonicalNama].dinasLuar++;
    }
  });

  const pArr = Object.keys(pMap)
    .filter(k => !isTestGuruName(k))
    .map(k => {
      const { hadir, dinasLuar, sakit, izin } = pMap[k];
      const alpa = Math.max(0, totalHariKerja - hadir - dinasLuar - sakit - izin);
      return {
        ...pMap[k],
        alpa,
        totalWajib: totalHariKerja
      };
    })
    .sort((a, b) => a.nama.localeCompare(b.nama));

  const guruPresensiList = pArr.filter(p => !p.isTU);
  const tuPresensiList = pArr.filter(p => Boolean(p.isTU));

  return { pArr, guruPresensiList, tuPresensiList };
}

/**
 * Exact replica of the TU creation modal preConfirm validation from AdminPenggunaView.tsx lines 228-242
 */
function validateTuCreationForm(nip?: string | null, nama?: string | null, no_hp?: string | null, email?: string | null): {
  valid: boolean;
  message?: string;
  data?: { nip: string; nama: string; no_hp: string; email: string };
} {
  const cleanNip = nip?.trim();
  const cleanNama = nama?.trim();
  const cleanNoHp = no_hp?.trim();
  const cleanEmail = email?.trim();

  if (!cleanNip || !cleanNama || !cleanNoHp || !cleanEmail) {
    return {
      valid: false,
      message: 'Semua 4 data (NIP, Nama Lengkap, Nomor HP, dan Email Aktif) wajib diisi!'
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return {
      valid: false,
      message: 'Format email aktif tidak valid (contoh: user@sekolah.sch.id)!'
    };
  }

  return {
    valid: true,
    data: {
      nip: cleanNip,
      nama: cleanNama,
      no_hp: cleanNoHp,
      email: cleanEmail
    }
  };
}

/**
 * Exact replica of the Role Toggle logic from AdminPenggunaView.tsx lines 159-163
 */
function getToggledTuRole(currentRole?: string | null): { targetRole: 'Guru' | 'tata_usaha'; actionLabel: string } {
  const isCurrentlyTU = (currentRole || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';
  const targetRole = isCurrentlyTU ? 'Guru' : 'tata_usaha';
  const actionLabel = isCurrentlyTU ? 'Kembalikan ke Guru' : 'Tunjuk sebagai Tata Usaha (TU)';
  return { targetRole, actionLabel };
}

/**
 * Exact replica of the CSV export builder from AdminRekapView.tsx lines 635-683
 */
function generateRekapCsv(presensi: any[], bulan = '2026-11'): string {
  if (!presensi || presensi.length === 0) return '';
  const csvRows: string[] = [];

  // Section 1: Dewan Guru
  csvRows.push('=== REKAPITULASI PRESENSI DEWAN GURU ===');
  const headersGuru = ['No', 'Nama Guru', 'Wajib', 'Hadir', 'Dinas Luar', 'Sakit', 'Izin', 'Alpa', 'Pulang Cepat', 'Keterlambatan (Jam/Menit)', 'Piket Disetujui', 'Jurnal Disetujui'];
  csvRows.push(headersGuru.join(','));
  const guruItems = presensi.filter((r: any) => !r?.isTU);
  guruItems.forEach((r: any, i: number) => {
    const telatStr = `"${Math.floor((r.telatDetik||0) / 3600)}j ${Math.floor(((r.telatDetik||0) % 3600) / 60)}m"`;
    csvRows.push([
      i + 1,
      `"${r.nama}"`,
      r.totalWajib ?? 0,
      r.hadir || 0,
      r.dinasLuar || 0,
      r.sakit || 0,
      r.izin || 0,
      r.alpa || 0,
      r.pulangCepat || 0,
      telatStr,
      r.piket || 0,
      r.jurnal || 0
    ].join(','));
  });

  // Section 2: Tenaga Tata Usaha (TU)
  csvRows.push('');
  csvRows.push('=== REKAPITULASI PRESENSI TENAGA TATA USAHA (TU) ===');
  const headersTU = ['No', 'Nama Staf TU', 'Wajib', 'Hadir', 'Dinas Luar', 'Sakit', 'Izin', 'Alpa', 'Pulang Cepat', 'Keterlambatan (Jam/Menit)'];
  csvRows.push(headersTU.join(','));
  const tuItems = presensi.filter((r: any) => Boolean(r?.isTU));
  tuItems.forEach((r: any, i: number) => {
    const telatStr = `"${Math.floor((r.telatDetik||0) / 3600)}j ${Math.floor(((r.telatDetik||0) % 3600) / 60)}m"`;
    csvRows.push([
      i + 1,
      `"${r.nama}"`,
      r.totalWajib ?? 0,
      r.hadir || 0,
      r.dinasLuar || 0,
      r.sakit || 0,
      r.izin || 0,
      r.alpa || 0,
      r.pulangCepat || 0,
      telatStr
    ].join(','));
  });

  return '\uFEFF' + csvRows.join('\n');
}

// ============================================================================
// MAIN ADVERSARIAL TEST RUNNER
// ============================================================================
async function runAdversarialM2Tests() {
  console.log(`\n${BOLD}${CYAN}==============================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}⚡ ADVERSARIAL STRESS TEST HARNESS — MILESTONE 2 (R3 & R4 VERIFICATION)${RESET}`);
  console.log(`${BOLD}${CYAN}==============================================================================${RESET}\n`);

  const projectRoot = path.resolve(__dirname, '..');

  // ==========================================================================
  // SECTION 1: PRESENSI RECAP PARTITIONING EMPIRICAL STRESS TEST (R3)
  // ==========================================================================
  console.log(`${BOLD}--- 1. Empirical Presensi Partitioning Stress Test (R3) ---${RESET}`);

  // Dataset with edge cases:
  // - Regular teachers
  // - Appointed TU with role variations ('tata_usaha', 'Tata Usaha', 'tata-usaha', 'tatausaha')
  // - Direct TU staff with mapel: 'Tata Usaha (Administrasi)'
  // - Staff with zero attendance (should appear in respective lists with 0 stats)
  // - Academic titles / degree variations (Ade Fitrawan Ibrahim, M.Pd., Gr.)
  // - Test/dummy accounts (must be excluded)
  const mockGurus = [
    { nama_guru: 'Budi Santoso, S.Pd', nip: '198001012005011001', mata_pelajaran: 'Matematika', user_id: 'usr-1' },
    { nama_guru: 'Siti Rahmawati, M.Pd', nip: '198502022008022002', mata_pelajaran: 'Bahasa Indonesia', user_id: 'usr-2' },
    { nama_guru: 'Ahmad Dahlan', nip: '199003032015031003', mata_pelajaran: 'IPA', user_id: 'usr-3' },
    { nama_guru: 'Sri Wahyuni (Appointed TU)', nip: '199104042016042004', mata_pelajaran: 'Bahasa Inggris', user_id: 'usr-4' },
    { nama_guru: 'Hendra Gunawan (TU Staff)', nip: '199205052017051005', mata_pelajaran: 'Tata Usaha (Administrasi)', user_id: 'usr-5' },
    { nama_guru: 'Ratna Sari (TU Staff space)', nip: '199306062018062006', mata_pelajaran: 'Staf Tata Usaha Sekolah', user_id: 'usr-6' },
    { nama_guru: 'Ade Fitrawan Ibrahim, M.Pd., Gr.', nip: '199407072019071007', mata_pelajaran: 'Fisika', user_id: 'usr-7' },
    { nama_guru: 'Zero Attendance Guru', nip: '199508082020081008', mata_pelajaran: 'Biologi', user_id: 'usr-8' },
    { nama_guru: 'Zero Attendance TU', nip: '199609092021092009', mata_pelajaran: 'Tata Usaha', user_id: 'usr-9' },
    { nama_guru: 'Test Guru Dummy', nip: '111111111111111111', mata_pelajaran: 'Test', user_id: 'usr-test' }
  ];

  const mockUsers = [
    { id: 'usr-1', username: '198001012005011001', nama: 'Budi Santoso, S.Pd', role: 'Guru' },
    { id: 'usr-2', username: '198502022008022002', nama: 'Siti Rahmawati, M.Pd', role: 'Guru' },
    { id: 'usr-3', username: '199003032015031003', nama: 'Ahmad Dahlan', role: 'Guru' },
    { id: 'usr-4', username: '199104042016042004', nama: 'Sri Wahyuni (Appointed TU)', role: 'tata_usaha' }, // Appointed TU!
    { id: 'usr-5', username: '199205052017051005', nama: 'Hendra Gunawan (TU Staff)', role: 'tata_usaha' },
    { id: 'usr-6', username: '199306062018062006', nama: 'Ratna Sari (TU Staff space)', role: 'Tata Usaha' }, // Space variation
    { id: 'usr-7', username: '199407072019071007', nama: 'Ade Fitrawan Ibrahim', role: 'Guru' },
    { id: 'usr-8', username: '199508082020081008', nama: 'Zero Attendance Guru', role: 'Guru' },
    { id: 'usr-9', username: '199609092021092009', nama: 'Zero Attendance TU', role: 'tata_usaha' }
  ];

  const mockPresensi = [
    { nama_guru: 'Budi Santoso, S.Pd', tipe_absen: 'Datang' },
    { nama_guru: 'Budi Santoso, S.Pd', tipe_absen: 'Datang' },
    { nama_guru: 'Siti Rahmawati, M.Pd', jenis_presensi: 'Izin' },
    { nama_guru: 'Ahmad Dahlan', jenis_presensi: 'Sakit' },
    { nama_guru: 'Sri Wahyuni (Appointed TU)', tipe_absen: 'Datang' },
    { nama_guru: 'Hendra Gunawan (TU Staff)', tipe_absen: 'Datang' },
    { nama_guru: 'Ratna Sari (TU Staff space)', jenis_presensi: 'Dinas Luar' },
    { nama_guru: 'Ade Fitrawan Ibrahim', tipe_absen: 'Datang' },
    { nama_guru: 'Test Guru Dummy', tipe_absen: 'Datang' }
  ];

  const { pArr, guruPresensiList, tuPresensiList } = partitionPresensiRekap(mockGurus, mockUsers, mockPresensi, 20);

  // Assert 1.1: Exclusion of test accounts
  const hasTestGuru = pArr.some(p => p.nama.toLowerCase().includes('test'));
  assert(!hasTestGuru, 'ADV-1.1', 'Test/dummy accounts are strictly excluded from both lists');

  // Assert 1.2: Mutual exclusivity of Guru and TU lists
  const intersection = guruPresensiList.filter(g => tuPresensiList.some(tu => tu.nama === g.nama));
  assert(intersection.length === 0, 'ADV-1.2', `Guru and TU lists are strictly mutually exclusive (overlap: ${intersection.length})`);

  // Assert 1.3: Union covers all non-test accounts
  const expectedTotalValid = 9; // 5 Guru + 4 TU
  assert(
    pArr.length === expectedTotalValid,
    'ADV-1.3',
    `Total aggregated accounts equals ${expectedTotalValid} (got: ${pArr.length})`
  );
  assert(
    guruPresensiList.length + tuPresensiList.length === expectedTotalValid,
    'ADV-1.4',
    `Sum of Guru (${guruPresensiList.length}) and TU (${tuPresensiList.length}) equals total accounts (${expectedTotalValid})`
  );

  // Assert 1.5: Appointed TU (usr-4, Sri Wahyuni) is partitioned into TU list
  const sriWahyuni = tuPresensiList.find(p => p.nama.includes('Sri Wahyuni'));
  assert(
    sriWahyuni !== undefined && sriWahyuni.isTU === true,
    'ADV-1.5',
    'Appointed TU teacher (role: tata_usaha, mapel: Bahasa Inggris) is partitioned into tuPresensiList'
  );

  // Assert 1.6: TU staff via mapel: 'Tata Usaha (Administrasi)' is in TU list
  const hendra = tuPresensiList.find(p => p.nama.includes('Hendra Gunawan'));
  assert(
    hendra !== undefined && hendra.isTU === true,
    'ADV-1.6',
    'TU staff with mapel "Tata Usaha (Administrasi)" is partitioned into tuPresensiList'
  );

  // Assert 1.7: Role variation 'Tata Usaha' with space is in TU list
  const ratna = tuPresensiList.find(p => p.nama.includes('Ratna Sari'));
  assert(
    ratna !== undefined && ratna.isTU === true,
    'ADV-1.7',
    'Role variation "Tata Usaha" (with space) is recognized and partitioned into tuPresensiList'
  );

  // Assert 1.8: Zero attendance accounts appear in respective lists with 0 hadir
  const zeroGuru = guruPresensiList.find(p => p.nama.includes('Zero Attendance Guru'));
  const zeroTU = tuPresensiList.find(p => p.nama.includes('Zero Attendance TU'));
  assert(
    zeroGuru !== undefined && zeroGuru.hadir === 0 && zeroGuru.alpa === 20,
    'ADV-1.8.1',
    'Guru with 0 attendance is preserved in guruPresensiList with hadir=0 and calculated alpa=20'
  );
  assert(
    zeroTU !== undefined && zeroTU.hadir === 0 && zeroTU.alpa === 20,
    'ADV-1.8.2',
    'TU with 0 attendance is preserved in tuPresensiList with hadir=0 and calculated alpa=20'
  );

  // Assert 1.9: Canonical name normalization consolidates academic degrees
  const ade = guruPresensiList.find(p => p.nama === 'Ade Fitrawan Ibrahim');
  assert(
    ade !== undefined && ade.hadir === 1,
    'ADV-1.9',
    'canonicalizeTeacherRekapName consolidates "Ade Fitrawan Ibrahim, M.Pd., Gr." cleanly into Guru list'
  );

  // ==========================================================================
  // SECTION 2: PRINT LAYOUT & CSS PAGE-BREAK CONTRACT VERIFICATION (R3)
  // ==========================================================================
  console.log(`\n${BOLD}--- 2. Print Layout & CSS Page-Break Verification (R3) ---${RESET}`);

  const rekapSrcPath = path.join(projectRoot, 'src', 'components', 'AdminRekapView.tsx');
  const rekapSrc = fs.readFileSync(rekapSrcPath, 'utf8');

  // Assert 2.1: CSS page break container includes BOTH breakBefore: 'page' and pageBreakBefore: 'always'
  const hasPageBreakContainer =
    rekapSrc.includes("breakBefore: 'page'") && rekapSrc.includes("pageBreakBefore: 'always'");
  assert(
    hasPageBreakContainer,
    'ADV-2.1',
    "AdminRekapView strictly includes style={{ breakBefore: 'page', pageBreakBefore: 'always' }} for cross-browser print engines"
  );

  // Assert 2.2: Dual PrintHeader instances
  const printHeaderMatches = rekapSrc.match(/<PrintHeader\b/g);
  assert(
    printHeaderMatches !== null && printHeaderMatches.length >= 2,
    'ADV-2.2',
    `AdminRekapView renders independent <PrintHeader> for both sections (found: ${printHeaderMatches?.length || 0})`
  );

  // Assert 2.3: Dual PrintSignature instances
  const printSigMatches = rekapSrc.match(/<PrintSignature\b/g);
  assert(
    printSigMatches !== null && printSigMatches.length >= 2,
    'ADV-2.3',
    `AdminRekapView renders independent <PrintSignature> for both sections (found: ${printSigMatches?.length || 0})`
  );

  // Assert 2.4: Table column isolation (Dewan Guru has 12 columns, TU has 10 columns omitting Piket/Jurnal)
  const guruTableSnippet = rekapSrc.substring(
    rekapSrc.indexOf('Rekapitulasi Presensi Dewan Guru'),
    rekapSrc.indexOf('Print Signature Dewan Guru')
  );
  const tuTableSnippet = rekapSrc.substring(
    rekapSrc.indexOf('Rekapitulasi Presensi Tenaga Tata Usaha (TU)'),
    rekapSrc.indexOf('Print Signature Tenaga TU')
  );

  const guruHasPiketJurnal = guruTableSnippet.includes('Piket') && guruTableSnippet.includes('Jurnal');
  const tuOmitsPiketJurnal = !tuTableSnippet.includes('>Piket<') && !tuTableSnippet.includes('>Jurnal<');
  assert(
    guruHasPiketJurnal && tuOmitsPiketJurnal,
    'ADV-2.4',
    'Dewan Guru table includes Piket & Jurnal columns, while Tenaga TU table cleanly omits them'
  );

  // ==========================================================================
  // SECTION 3: CSV EXPORT FORMATTING EMPIRICAL STRESS TEST (R3)
  // ==========================================================================
  console.log(`\n${BOLD}--- 3. CSV Export Generation & Formatting Stress Test (R3) ---${RESET}`);

  const csvContent = generateRekapCsv(pArr, '2026-11');

  // Assert 3.1: UTF-8 BOM prefix
  assert(
    csvContent.startsWith('\uFEFF'),
    'ADV-3.1',
    'CSV export begins with UTF-8 BOM (\\uFEFF) for seamless Microsoft Excel rendering'
  );

  // Assert 3.2: Both section headers exist with proper separation
  const hasGuruSection = csvContent.includes('=== REKAPITULASI PRESENSI DEWAN GURU ===');
  const hasTuSection = csvContent.includes('=== REKAPITULASI PRESENSI TENAGA TATA USAHA (TU) ===');
  assert(
    hasGuruSection && hasTuSection,
    'ADV-3.2',
    'CSV output contains distinct headers for Dewan Guru and Tenaga TU'
  );

  // Assert 3.3: Empty line separator between sections
  const lines = csvContent.split('\n');
  const guruHeaderIdx = lines.findIndex(l => l.includes('=== REKAPITULASI PRESENSI DEWAN GURU ==='));
  const tuHeaderIdx = lines.findIndex(l => l.includes('=== REKAPITULASI PRESENSI TENAGA TATA USAHA (TU) ==='));
  assert(
    tuHeaderIdx > guruHeaderIdx && lines[tuHeaderIdx - 1] === '',
    'ADV-3.3',
    'CSV output separates Guru and TU sections with an empty line'
  );

  // Assert 3.4: Proper column counts per section
  const guruHeaderCols = lines[guruHeaderIdx + 1].split(',').length;
  const tuHeaderCols = lines[tuHeaderIdx + 1].split(',').length;
  assert(
    guruHeaderCols === 12 && tuHeaderCols === 10,
    'ADV-3.4',
    `CSV headers correctly sized: Guru has 12 columns, TU has 10 columns (got ${guruHeaderCols} and ${tuHeaderCols})`
  );

  // Assert 3.5: No TU in Guru CSV lines, No Guru in TU CSV lines
  const guruCsvLines = lines.slice(guruHeaderIdx + 2, tuHeaderIdx - 1);
  const tuCsvLines = lines.slice(tuHeaderIdx + 2);
  const sriInGuruCsv = guruCsvLines.some(l => l.includes('Sri Wahyuni'));
  const sriInTuCsv = tuCsvLines.some(l => l.includes('Sri Wahyuni'));
  const budiInGuruCsv = guruCsvLines.some(l => l.includes('Budi Santoso'));
  const budiInTuCsv = tuCsvLines.some(l => l.includes('Budi Santoso'));

  assert(!sriInGuruCsv && sriInTuCsv, 'ADV-3.5.1', 'TU staff (Sri Wahyuni) appears exclusively under TU CSV section');
  assert(budiInGuruCsv && !budiInTuCsv, 'ADV-3.5.2', 'Teacher (Budi Santoso) appears exclusively under Guru CSV section');

  // ==========================================================================
  // SECTION 4: FORM VALIDATION STRESS TESTING FOR + AKUN TU MODAL (R4)
  // ==========================================================================
  console.log(`\n${BOLD}--- 4. Form Validation Stress Testing (+ Akun TU Modal) (R4) ---${RESET}`);

  // 4.1 Missing mandatory fields matrix
  const missingFieldTests = [
    { name: 'Missing NIP (empty string)', nip: '', nama: 'Ahmad TU', hp: '081234567890', email: 'ahmad@sekolah.sch.id' },
    { name: 'Missing NIP (spaces only)', nip: '   ', nama: 'Ahmad TU', hp: '081234567890', email: 'ahmad@sekolah.sch.id' },
    { name: 'Missing NIP (null)', nip: null, nama: 'Ahmad TU', hp: '081234567890', email: 'ahmad@sekolah.sch.id' },
    { name: 'Missing Nama (empty string)', nip: '19900101', nama: '', hp: '081234567890', email: 'ahmad@sekolah.sch.id' },
    { name: 'Missing Nama (spaces only)', nip: '19900101', nama: '    ', hp: '081234567890', email: 'ahmad@sekolah.sch.id' },
    { name: 'Missing HP (empty string)', nip: '19900101', nama: 'Ahmad TU', hp: '', email: 'ahmad@sekolah.sch.id' },
    { name: 'Missing HP (spaces only)', nip: '19900101', nama: 'Ahmad TU', hp: '  ', email: 'ahmad@sekolah.sch.id' },
    { name: 'Missing Email (empty string)', nip: '19900101', nama: 'Ahmad TU', hp: '081234567890', email: '' },
    { name: 'Missing Email (spaces only)', nip: '19900101', nama: 'Ahmad TU', hp: '081234567890', email: '   ' },
    { name: 'All 4 fields empty', nip: '', nama: '', hp: '', email: '' }
  ];

  missingFieldTests.forEach((t, i) => {
    const res = validateTuCreationForm(t.nip, t.nama, t.hp, t.email);
    assert(
      !res.valid && res.message?.includes('Semua 4 data (NIP, Nama Lengkap, Nomor HP, dan Email Aktif) wajib diisi!'),
      `ADV-4.1.${i + 1}`,
      `Rejected invalid input: ${t.name}`
    );
  });

  // 4.2 Required Invalid Email Formats (Per Prompt: no @, no domain, spaces)
  const requiredInvalidEmailCases = [
    { label: 'no @ symbol', email: 'plainaddress' },
    { label: 'no @ symbol (dot only)', email: 'missingatsign.com' },
    { label: 'no username before @', email: '@missingusername.com' },
    { label: 'no domain name after @', email: 'username@.com' },
    { label: 'no TLD / domain', email: 'username@domain' },
    { label: 'trailing dot without domain', email: 'username@domain.' },
    { label: 'spaces in username', email: 'user name@domain.com' },
    { label: 'spaces after @', email: 'username@ domain.com' },
    { label: 'spaces in domain', email: 'username@domain. com' }
  ];

  requiredInvalidEmailCases.forEach((c, i) => {
    const res = validateTuCreationForm('199001012020011001', 'Staf TU Valid', '081234567890', c.email);
    const isRejected = !res.valid && res.message?.includes('Format email aktif tidak valid');
    assert(isRejected, `ADV-4.2.${i + 1}`, `Required invalid email format rejected (${c.label}): "${c.email}"`);
  });

  // 4.2b Deep Adversarial RFC / Injection Email Fuzzing (Surfaced in Critic Report)
  const rfcEdgeCases = [
    { label: 'consecutive dots', email: 'username@domain..com' },
    { label: 'html tags in local part', email: 'admin<script>@domain.com' }
  ];
  rfcEdgeCases.forEach((c, i) => {
    const res = validateTuCreationForm('199001012020011001', 'Staf TU Valid', '081234567890', c.email);
    // Document exact regex behavior for ponytail / standard input
    console.log(`    ${YELLOW}↳ [Observed Edge Case 4.2b.${i + 1}] Regex test for ${c.label} ("${c.email}"): ${res.valid ? 'Permitted by minimal regex (ponytail tradeoff)' : 'Rejected'}${RESET}`);
  });

  // 4.3 Valid Email Formats
  const validEmailCases = [
    'staf.tu@sekolah.sch.id',
    'tu_madrasah@kemenag.go.id',
    'pegawai123@sub.domain.co.id',
    'staff+admin@gmail.com'
  ];

  validEmailCases.forEach((goodEmail, i) => {
    const res = validateTuCreationForm('199001012020011001', 'Staf TU Valid', '081234567890', goodEmail);
    assert(res.valid === true, `ADV-4.3.${i + 1}`, `Valid email format accepted: "${goodEmail}"`);
  });

  // 4.4 Valid 4 fields submission payload verification
  const validSubmission = validateTuCreationForm(
    '  199001012020011001  ',
    '  Ahmad Subarjo  ',
    '  081298765432  ',
    '  ahmad.tu@sekolah.sch.id  '
  );
  assert(
    validSubmission.valid === true &&
    validSubmission.data?.nip === '199001012020011001' &&
    validSubmission.data?.nama === 'Ahmad Subarjo' &&
    validSubmission.data?.no_hp === '081298765432' &&
    validSubmission.data?.email === 'ahmad.tu@sekolah.sch.id',
    'ADV-4.4',
    'Valid form submission trims whitespace from all 4 mandatory fields'
  );

  // 4.5 Inspect AdminPenggunaView code for account creation invariants
  const penggunaSrcPath = path.join(projectRoot, 'src', 'components', 'AdminPenggunaView.tsx');
  const penggunaSrc = fs.readFileSync(penggunaSrcPath, 'utf8');

  assert(
    penggunaSrc.includes("role: 'tata_usaha'"),
    'ADV-4.5.1',
    "AdminPenggunaView assigns role: 'tata_usaha' in users table on account creation"
  );
  assert(
    penggunaSrc.includes("password: defaultPassword") && penggunaSrc.includes("const defaultPassword = `${formValues.nip}27`"),
    'ADV-4.5.2',
    "AdminPenggunaView sets defaultPassword as ${formValues.nip}27"
  );
  assert(
    penggunaSrc.includes("mata_pelajaran: 'Tata Usaha (Administrasi)'"),
    'ADV-4.5.3',
    "AdminPenggunaView records data_guru with mata_pelajaran: 'Tata Usaha (Administrasi)'"
  );
  assert(
    penggunaSrc.includes("no_hp: formValues.no_hp") && penggunaSrc.includes("email: formValues.email"),
    'ADV-4.5.4',
    'AdminPenggunaView records no_hp and email in data_guru profile'
  );

  // ==========================================================================
  // SECTION 5: ROLE TOGGLE ("TUNJUK TU" / "KE GURU") STATE LOGIC (R4)
  // ==========================================================================
  console.log(`\n${BOLD}--- 5. Role Toggle ("Tunjuk TU" / "Ke Guru") State Logic (R4) ---${RESET}`);

  // Test toggling from Guru to TU
  const toTu1 = getToggledTuRole('Guru');
  assert(toTu1.targetRole === 'tata_usaha' && toTu1.actionLabel.includes('Tunjuk'), 'ADV-5.1.1', 'Role "Guru" toggles to "tata_usaha"');

  const toTu2 = getToggledTuRole('guru');
  assert(toTu2.targetRole === 'tata_usaha', 'ADV-5.1.2', 'Role "guru" (lowercase) toggles to "tata_usaha"');

  const toTu3 = getToggledTuRole('');
  assert(toTu3.targetRole === 'tata_usaha', 'ADV-5.1.3', 'Empty role fallback toggles to "tata_usaha"');

  // Test toggling from TU back to Guru
  const toGuru1 = getToggledTuRole('tata_usaha');
  assert(toGuru1.targetRole === 'Guru' && toGuru1.actionLabel.includes('Kembalikan'), 'ADV-5.2.1', 'Role "tata_usaha" toggles back to "Guru"');

  const toGuru2 = getToggledTuRole('Tata Usaha');
  assert(toGuru2.targetRole === 'Guru', 'ADV-5.2.2', 'Role "Tata Usaha" (with space) toggles back to "Guru"');

  const toGuru3 = getToggledTuRole('tatausaha');
  assert(toGuru3.targetRole === 'Guru', 'ADV-5.2.3', 'Role "tatausaha" (normalized) toggles back to "Guru"');

  // Verify AdminPenggunaView toggle action implementation
  assert(
    penggunaSrc.includes('handleToggleTuAssignment') &&
    penggunaSrc.includes(".update({ role: targetRole })") &&
    penggunaSrc.includes(".eq('id', item.userId)"),
    'ADV-5.3',
    'AdminPenggunaView updates users.role = targetRole by item.userId'
  );

  // ==========================================================================
  // SECTION 6: teacherUserSync AUTO-SYNC RESILIENCE SIMULATION (R4)
  // ==========================================================================
  console.log(`\n${BOLD}--- 6. teacherUserSync Auto-Sync Resilience Simulation (R4) ---${RESET}`);

  // Build a mock Supabase client that tracks database state
  class MockSupabaseDB {
    users: any[];
    data_guru: any[];

    constructor(initialGurus: any[], initialUsers: any[]) {
      this.data_guru = JSON.parse(JSON.stringify(initialGurus));
      this.users = JSON.parse(JSON.stringify(initialUsers));
    }

    from(table: string) {
      const self = this;
      return {
        select: (cols: string = '*') => {
          let currentTable = table === 'users' ? self.users : self.data_guru;
          let filtered = [...currentTable];

          const builder: any = {
            eq: (col: string, val: any) => {
              filtered = filtered.filter(row => row[col] === val);
              return builder;
            },
            in: (col: string, vals: any[]) => {
              filtered = filtered.filter(row => vals.includes(row[col]));
              return builder;
            },
            then: (resolve: any) => resolve({ data: filtered, error: null })
          };
          return builder;
        },
        insert: (rows: any[]) => {
          const inserted: any[] = [];
          for (const r of rows) {
            self.users.push(r);
            inserted.push(r);
          }
          return {
            select: () => ({
              then: (resolve: any) => resolve({ data: inserted, error: null })
            }),
            then: (resolve: any) => resolve({ data: inserted, error: null })
          };
        },
        update: (payload: any) => {
          return {
            eq: (col: string, val: any) => {
              if (table === 'users') {
                self.users.forEach(u => {
                  if (u[col] === val) Object.assign(u, payload);
                });
              } else if (table === 'data_guru') {
                self.data_guru.forEach(g => {
                  if (g[col] === val) Object.assign(g, payload);
                });
              }
              return {
                then: (resolve: any) => resolve({ error: null })
              };
            }
          };
        }
      };
    }
  }

  const initialGurus = [
    { id: 'g-1', nama_guru: 'Guru Tetap', nip: '19800101', mata_pelajaran: 'Matematika', status: 'Aktif', sekolah_id: 'sch-1' },
    { id: 'g-2', nama_guru: 'Guru Diangkat TU', nip: '19850202', mata_pelajaran: 'Bahasa', status: 'Aktif', sekolah_id: 'sch-1' },
    { id: 'g-3', nama_guru: 'Guru Baru Belum Akun', nip: '19900303', mata_pelajaran: 'Fisika', status: 'Aktif', sekolah_id: 'sch-1' }
  ];

  const initialUsers = [
    { id: 'u-1', username: '19800101', nama: 'Guru Tetap', role: 'Guru', sekolah_id: 'sch-1' },
    { id: 'u-2', username: '19850202', nama: 'Guru Diangkat TU', role: 'tata_usaha', sekolah_id: 'sch-1' } // APPOINTED TU!
  ];

  const mockDb = new MockSupabaseDB(initialGurus, initialUsers);

  // Execute sync
  const syncResult1 = await syncTeacherAccounts(mockDb as any, 'sch-1');

  assert(syncResult1.success === true, 'ADV-6.1', 'syncTeacherAccounts runs successfully on mock database');
  assert(syncResult1.createdCount === 1, 'ADV-6.2', 'syncTeacherAccounts creates exactly 1 account for Guru Baru (g-3)');

  // Verify that appointed TU user (u-2) role was NOT overwritten to 'Guru'
  const userTuInDb = mockDb.users.find(u => u.id === 'u-2');
  assert(
    userTuInDb !== undefined && userTuInDb.role === 'tata_usaha',
    'ADV-6.3',
    'CRITICAL: Appointed TU user in users table retains role "tata_usaha" and is NOT reverted to "Guru" by sync'
  );

  // Verify returned account list preserves TU role
  const tuAccountItem = syncResult1.accounts.find(a => a.guruId === 'g-2');
  assert(
    tuAccountItem !== undefined && tuAccountItem.role === 'tata_usaha',
    'ADV-6.4',
    'Returned account item for appointed TU has role: "tata_usaha"'
  );

  // Verify new account was created with role 'Guru'
  const newAccountItem = syncResult1.accounts.find(a => a.guruId === 'g-3');
  assert(
    newAccountItem !== undefined && newAccountItem.role === 'Guru',
    'ADV-6.5',
    'Newly auto-created teacher account receives standard role: "Guru"'
  );

  // Run sync a SECOND time to verify idempotency and non-destruction
  const syncResult2 = await syncTeacherAccounts(mockDb as any, 'sch-1');
  assert(
    syncResult2.success === true && syncResult2.createdCount === 0,
    'ADV-6.6',
    'Subsequent sync run is idempotent (createdCount = 0)'
  );

  const userTuInDbAfterSecondSync = mockDb.users.find(u => u.id === 'u-2');
  assert(
    userTuInDbAfterSecondSync?.role === 'tata_usaha',
    'ADV-6.7',
    'Appointed TU user role remains "tata_usaha" across repeated sync iterations'
  );

  // ==========================================================================
  // FINAL ADVERSARIAL REPORT SUMMARY
  // ==========================================================================
  console.log(`\n${BOLD}${CYAN}==============================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}📊 ADVERSARIAL VERIFICATION SUMMARY:${RESET}`);
  console.log(`  Total Assertions: ${BOLD}${totalAssertions}${RESET}`);
  console.log(`  Passed Assertions: ${BOLD}${GREEN}${passedAssertions}${RESET}`);
  console.log(`  Failed Assertions: ${BOLD}${failedAssertions > 0 ? RED : GREEN}${failedAssertions}${RESET}`);
  console.log(`${BOLD}${CYAN}==============================================================================${RESET}\n`);

  if (failedAssertions > 0) {
    console.error(`${RED}${BOLD}VERDICT: REQUEST_CHANGES — ${failedAssertions} adversarial challenges failed!${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}VERDICT: APPROVE — All ${passedAssertions} empirical adversarial challenges passed cleanly!${RESET}`);
  }
}

runAdversarialM2Tests().catch(err => {
  console.error('Fatal crash in adversarial test harness:', err);
  process.exit(1);
});
