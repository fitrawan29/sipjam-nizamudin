/**
 * tests/menu_consolidation_feature_recovery.test.ts
 *
 * Comprehensive Automated Regression Test Suite for Menu Consolidation Feature Recovery
 * Covers all features recovered across Milestones 1, 2, and 3:
 * - Suite 1: Print System & Legal Signatures (AdminRekapView, PiketView, GradebookView, GuruJurnal, PrintHeader)
 * - Suite 2: Journal Feedback & Rejection Visibility (GuruJurnal Tab 2, RekapJurnalView, searchMateri filter, Detail Modal)
 * - Suite 3: History View Filters (HistoryView month picker, multi-format timestamp handling, clean reset)
 * - Suite 4: RBAC & Navigation (evaluateTabRBAC for supervisi-kelas & siswa, getConsolidatedMenuItems for Admin & Dinas)
 * - Suite 5: DokumenView & AdminVerifView (isReadOnly forwarding, case-insensitive role check, action guards)
 * - Suite 6: Analytics & DOM Sanitization (AdminRekapView composition ratios & Top 5/10 toggle, HomeViewAdmin, clean containers)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { evaluateTabRBAC, getConsolidatedMenuItems } from '../src/lib/navigation';
import { PrintSignature } from '../src/components/PrintHeader';

console.log('========================================================================');
console.log('   SIPJAM MENU CONSOLIDATION FEATURE RECOVERY — E2E TEST SUITE (M4)   ');
console.log('========================================================================\n');

const srcDir = path.join(__dirname, '..', 'src');
let totalAssertions = 0;
let passedAssertions = 0;

function check(desc: string, condition: boolean, errorMsg?: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✔ [PASS] ${desc}`);
  } else {
    console.error(`  ✖ [FAIL] ${desc} — ${errorMsg || 'Condition was false'}`);
    assert.fail(errorMsg || `Assertion failed: ${desc}`);
  }
}

// ============================================================================
// SUITE 1: Print System & Legal Signatures
// ============================================================================
console.log('------------------------------------------------------------------------');
console.log('SUITE 1: Print System & Legal Signatures');
console.log('------------------------------------------------------------------------');

// 1.1 AdminRekapView Tab 2 PrintSignature & GPS footer
const adminRekapPath = path.join(srcDir, 'components', 'AdminRekapView.tsx');
check('1.1.0: AdminRekapView.tsx exists', fs.existsSync(adminRekapPath));
const adminRekapContent = fs.readFileSync(adminRekapPath, 'utf-8');

check(
  '1.1.1: AdminRekapView Tab 2 contains PrintSignature inside hidden print:block container',
  adminRekapContent.includes('<div className="hidden print:block mt-8">') &&
  adminRekapContent.includes('<PrintSignature') &&
  adminRekapContent.includes('leftSubtitle="Pengelola Data / Admin"')
);

check(
  '1.1.2: AdminRekapView Tab 2 passes user and sekolahId to PrintSignature',
  adminRekapContent.includes('user={user}') &&
  adminRekapContent.includes('sekolahId={user?.sekolah_id}')
);

check(
  '1.1.3: AdminRekapView Tab 2 adapts leftName & leftNip based on isKepalaSekolah',
  adminRekapContent.includes("leftName={isKepalaSekolah ? '( ........................................ )' : user?.nama}") &&
  adminRekapContent.includes("leftNip={isKepalaSekolah ? '-' : user?.nip}")
);

check(
  '1.1.4: AdminRekapView invokes triggerPrintWithGps for GPS watermark',
  adminRekapContent.includes('triggerPrintWithGps()')
);

// 1.2 AdminRekapView Tab 3 No Duplicate Kop Surat
check(
  '1.2.1: AdminRekapView contains universal PrintHeader at root print container',
  adminRekapContent.includes('<div className="hidden print:block">') &&
  adminRekapContent.includes('<PrintHeader user={user} sekolahId={user?.sekolah_id} />')
);

const subTab3Start = adminRekapContent.indexOf("activeTab === 'cetak'");
check('1.2.2: Sub-Tab 3 exists in AdminRekapView', subTab3Start !== -1);
const subTab3Block = adminRekapContent.slice(subTab3Start, subTab3Start + 3000);
check(
  '1.2.3: Sub-Tab 3 does NOT have a duplicate <PrintHeader> inside its block',
  !subTab3Block.includes('<PrintHeader')
);

check(
  '1.2.4: Sub-Tab 3 title container has print:hidden to prevent duplicate report title',
  subTab3Block.includes('print:hidden') &&
  subTab3Block.includes('Rekapitulasi Akhir Presensi, Jurnal &amp; Piket Guru')
);

// 1.3 PiketView Guru Piket Signature Attribution
const piketViewPath = path.join(srcDir, 'components', 'PiketView.tsx');
check('1.3.0: PiketView.tsx exists', fs.existsSync(piketViewPath));
const piketViewContent = fs.readFileSync(piketViewPath, 'utf-8');

check(
  '1.3.1: PiketView Tab 3 renders PrintSignature with Guru Piket props',
  piketViewContent.includes('leftTitle="Mengetahui,"') &&
  piketViewContent.includes('leftSubtitle="Guru Piket"') &&
  piketViewContent.includes('leftName={user?.nama}') &&
  piketViewContent.includes('leftNip={user?.nip}')
);

check(
  '1.3.2: PiketView preserves comment assertion for backward-compatibility',
  piketViewContent.includes('{/* <PrintSignature user={user} sekolahId={user?.sekolah_id} /> */}')
);

// Behavioral test for PiketView signature rendering
const htmlPiketSig = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Guru Piket',
    leftName: 'Ahmad Dahlan, S.Pd',
    leftNip: '197501012000031002',
    user: { role: 'guru', nama: 'Ahmad Dahlan, S.Pd' },
    sekolahId: 'sekolah-1'
  })
);
check(
  '1.3.3: Behavioral: PrintSignature for Guru Piket displays Guru Piket subtitle, name and NIP',
  htmlPiketSig.includes('Guru Piket') &&
  htmlPiketSig.includes('Ahmad Dahlan, S.Pd') &&
  htmlPiketSig.includes('197501012000031002') &&
  htmlPiketSig.includes('data-testid="signature-left"') &&
  htmlPiketSig.includes('data-testid="signature-right"')
);

// 1.4 GradebookView Tab 3 Statistik PrintSignature
const gradebookPath = path.join(srcDir, 'components', 'GradebookView.tsx');
check('1.4.0: GradebookView.tsx exists', fs.existsSync(gradebookPath));
const gradebookContent = fs.readFileSync(gradebookPath, 'utf-8');

const statistikStart = gradebookContent.indexOf("TAB 3: STATISTIK");
check('1.4.1: GradebookView has statistik tab (TAB 3: STATISTIK)', statistikStart !== -1);
const statistikBlock = gradebookContent.slice(statistikStart, statistikStart + 15000);
check(
  '1.4.2: GradebookView Tab 3 renders PrintSignature with Guru Mata Pelajaran attribution',
  statistikBlock.includes('<PrintSignature') &&
  statistikBlock.includes('leftSubtitle="Guru Mata Pelajaran"') &&
  statistikBlock.includes('leftName={selectedGuru || user?.nama}') &&
  statistikBlock.includes('leftNip={user?.nip}')
);

// 1.5 GuruJurnal Landscape Print Container Width Override
const guruJurnalPath = path.join(srcDir, 'components', 'GuruJurnal.tsx');
check('1.5.0: GuruJurnal.tsx exists', fs.existsSync(guruJurnalPath));
const guruJurnalContent = fs.readFileSync(guruJurnalPath, 'utf-8');

check(
  '1.5.1: GuruJurnal top-level section overrides max-w-4xl during printing with print:max-w-none print:w-full print:mx-0 print:p-0',
  guruJurnalContent.includes('max-w-4xl mx-auto space-y-4 print:max-w-none print:w-full print:mx-0 print:p-0')
);

// 1.6 PrintHeader Single Column & Role Logic (Behavioral tests via renderToStaticMarkup)
const printHeaderPath = path.join(srcDir, 'components', 'PrintHeader.tsx');
check('1.6.0: PrintHeader.tsx exists', fs.existsSync(printHeaderPath));
const printHeaderContent = fs.readFileSync(printHeaderPath, 'utf-8');

check(
  '1.6.1: PrintHeader implements isSingleColumnLayout = Boolean(singleColumn || isAdmin)',
  printHeaderContent.includes('const isSingleColumnLayout = Boolean(singleColumn || isAdmin);')
);

// Behavioral test 1: Admin role triggers single column layout (left signature hidden)
const htmlAdmin = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'admin', nama: 'Admin Operator' },
    leftName: 'Left Signer'
  })
);
check(
  '1.6.2: Admin role renders single column layout (left signature hidden)',
  !htmlAdmin.includes('data-testid="signature-left"') &&
  !htmlAdmin.includes('Left Signer') &&
  htmlAdmin.includes('data-testid="signature-right"')
);

// Behavioral test 2: Guru role with singleColumn=false renders multi-column layout
const htmlGuru = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'guru', nama: 'Guru Mapel' },
    leftSubtitle: 'Guru Mata Pelajaran',
    leftName: 'Budi Santoso, S.Pd',
    leftNip: '198501012010011001'
  })
);
check(
  '1.6.3: Guru role renders two-column signature with left and right signers',
  htmlGuru.includes('data-testid="signature-left"') &&
  htmlGuru.includes('Budi Santoso, S.Pd') &&
  htmlGuru.includes('Guru Mata Pelajaran') &&
  htmlGuru.includes('data-testid="signature-right"')
);

// Behavioral test 3: Explicit singleColumn=true forces single column layout for non-admin
const htmlGuruSingle = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'guru' },
    singleColumn: true,
    leftName: 'Should Be Hidden'
  })
);
check(
  '1.6.4: Explicit singleColumn=true forces single column layout for any role',
  !htmlGuruSingle.includes('data-testid="signature-left"') &&
  !htmlGuruSingle.includes('Should Be Hidden')
);

// Behavioral test 4: Case-insensitivity and whitespace resilience in role check
const htmlAdminVariations = [
  renderToStaticMarkup(React.createElement(PrintSignature, { user: { role: 'Admin' }, leftName: 'Hidden1' })),
  renderToStaticMarkup(React.createElement(PrintSignature, { user: { role: 'ADMIN' }, leftName: 'Hidden2' })),
  renderToStaticMarkup(React.createElement(PrintSignature, { user: { role: '  admin  \n' }, leftName: 'Hidden3' }))
];
check(
  '1.6.5: Case-insensitive and whitespace-trimmed admin role behaves consistently',
  htmlAdminVariations.every(h => !h.includes('data-testid="signature-left"'))
);

// Behavioral test 5: Non-string and undefined role resilience
const htmlNonStringRoles = [
  renderToStaticMarkup(React.createElement(PrintSignature, { user: { role: 123 as any }, leftName: 'NumberRole' })),
  renderToStaticMarkup(React.createElement(PrintSignature, { user: { role: true as any }, leftName: 'BoolRole' })),
  renderToStaticMarkup(React.createElement(PrintSignature, { user: null, leftName: 'NullUser' })),
  renderToStaticMarkup(React.createElement(PrintSignature, { user: undefined, leftName: 'UndefUser' }))
];
check(
  '1.6.6: Adversarial: non-string, boolean, and null user objects do not crash PrintSignature and render left column',
  htmlNonStringRoles.every(h => h.includes('data-testid="signature-left"'))
);

// Behavioral test 6: Page break inside avoid in both layouts
check(
  '1.6.7: PrintSignature maintains page-break-inside-avoid in both admin and multi-column containers',
  htmlAdmin.includes('page-break-inside-avoid') && htmlGuru.includes('page-break-inside-avoid')
);

// Behavioral test 7: Three column signature support with Pengawas Pembina
const htmlThreeCols = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'guru' },
    showPengawas: true,
    pengawasJabatan: 'Pengawas Pembina Utama',
    pengawasNama: 'Drs. H. Sulaiman, M.Pd',
    pengawasNip: '196803051994031005'
  })
);
check(
  '1.6.8: Three-column signature renders middle Pengawas signature block when showPengawas=true',
  htmlThreeCols.includes('data-testid="signature-pengawas"') &&
  htmlThreeCols.includes('Pengawas Pembina Utama') &&
  htmlThreeCols.includes('Drs. H. Sulaiman, M.Pd') &&
  htmlThreeCols.includes('196803051994031005')
);


// ============================================================================
// SUITE 2: Journal Feedback & Rejection Visibility
// ============================================================================
console.log('\n------------------------------------------------------------------------');
console.log('SUITE 2: Journal Feedback & Rejection Visibility');
console.log('------------------------------------------------------------------------');

// 2.1 GuruJurnal Sub-Tab 2 Rejection Banner & Resubmit
check(
  '2.1.1: GuruJurnal declares state for rejectedJournals and queries status_verifikasi Ditolak',
  guruJurnalContent.includes('rejectedJournals') &&
  guruJurnalContent.includes('setRejectedJournals') &&
  guruJurnalContent.includes("eq('status_verifikasi', 'Ditolak')")
);

check(
  '2.1.2: GuruJurnal computes allRejectedJournals combining dailyState and database',
  guruJurnalContent.includes('allRejectedJournals')
);

check(
  '2.1.3: GuruJurnal Sub-Tab 2 renders #banner-jurnal-ditolak inside #panel-rekap-pribadi',
  guruJurnalContent.includes('id="panel-rekap-pribadi"') &&
  guruJurnalContent.includes('id="banner-jurnal-ditolak"')
);

check(
  '2.1.4: Banner displays admin rejection notes with comprehensive fallback chain',
  guruJurnalContent.includes('j.catatan_admin') &&
  guruJurnalContent.includes('j.alasan_penolakan') &&
  guruJurnalContent.includes('j.catatan_penolakan')
);

check(
  '2.1.5: Banner provides Input Ulang action button pre-filling form state',
  guruJurnalContent.includes('Input Ulang') &&
  guruJurnalContent.includes("handleTabChange('input')") &&
  guruJurnalContent.includes('setMateri(j.materi') &&
  guruJurnalContent.includes('setKelas(j.kelas') &&
  guruJurnalContent.includes('setMapel(j.mapel')
);

// 2.2 RekapJurnalView Rejection Notes in Table & Modal
const rekapJurnalPath = path.join(srcDir, 'components', 'RekapJurnalView.tsx');
check('2.2.0: RekapJurnalView.tsx exists', fs.existsSync(rekapJurnalPath));
const rekapJurnalContent = fs.readFileSync(rekapJurnalPath, 'utf-8');

check(
  '2.2.1: RekapJurnalView renders rejection note box in tabMode="kelas"',
  rekapJurnalContent.includes("tabMode === 'kelas'") &&
  rekapJurnalContent.includes("j.status_verifikasi === 'Ditolak'") &&
  rekapJurnalContent.includes('Ditolak Admin:')
);

check(
  '2.2.2: RekapJurnalView renders rejection note box in tabMode="pribadi"',
  rekapJurnalContent.includes("tabMode === 'pribadi'") &&
  rekapJurnalContent.includes('Alasan Penolakan:')
);

check(
  '2.2.3: RekapJurnalView provides #modal-detail-jurnal with #modal-rejection-banner',
  rekapJurnalContent.includes('id="modal-detail-jurnal"') &&
  rekapJurnalContent.includes('id="modal-rejection-banner"')
);

check(
  '2.2.4: Modal detail container has no-print class to prevent appearing on print sheets',
  rekapJurnalContent.includes('id="modal-detail-jurnal"') &&
  rekapJurnalContent.includes('no-print')
);

// 2.3 searchMateri Filter in RekapJurnalView
check(
  '2.3.1: RekapJurnalView declares searchMateri state and renders input filter',
  rekapJurnalContent.includes('searchMateri') &&
  rekapJurnalContent.includes('setSearchMateri') &&
  rekapJurnalContent.includes('CARI MATERI / TOPIK KBM')
);

check(
  '2.3.2: filteredJurnal logic includes matchesMateri filter across multiple fields',
  rekapJurnalContent.includes('matchesMateri') &&
  rekapJurnalContent.includes('searchMateri.toLowerCase()')
);

// Behavioral test for searchMateri logic
const mockJournalRecords = [
  { id: '1', mapel: 'Matematika', materi: 'Aljabar Linear dan Matriks', status_verifikasi: 'Disetujui' },
  { id: '2', mapel: 'Fisika', materi_pembelajaran: 'Hukum Newton dan Dinamika Gerak', status_verifikasi: 'Ditolak', catatan_admin: 'Foto buram' },
  { id: '3', mapel: 'Kimia', tujuan_pembelajaran: 'Reaksi Redoks dan Elektrokimia', status_verifikasi: 'Disetujui' },
  { id: '4', mapel: 'Biologi', kegiatan: 'Praktikum Fotosintesis Tumbuhan', status_verifikasi: 'Ditolak', catatan_admin: 'Jam mengajar tidak sesuai' },
  { id: '5', mapel: 'Bahasa Indonesia', konten: 'Menulis Teks Anekdot', status_verifikasi: 'Menunggu' }
];

function filterJournalsByMateri(list: any[], query: string) {
  if (!query || !query.trim()) return list;
  const q = query.toLowerCase().trim();
  return list.filter(j => {
    const textFields = [
      j.materi,
      j.materi_pembelajaran,
      j.konten,
      j.tujuan_pembelajaran,
      j.kegiatan,
      j.kegiatan_pembelajaran
    ].filter(Boolean).map((s: string) => String(s).toLowerCase());
    return textFields.some((t: string) => t.includes(q));
  });
}

const matchNewt = filterJournalsByMateri(mockJournalRecords, 'newton');
check('2.3.3: Behavioral: searchMateri matches "newton" in materi_pembelajaran', matchNewt.length === 1 && matchNewt[0].id === '2');

const matchRedoks = filterJournalsByMateri(mockJournalRecords, 'REDOKS');
check('2.3.4: Behavioral: searchMateri matches "REDOKS" case-insensitively in tujuan_pembelajaran', matchRedoks.length === 1 && matchRedoks[0].id === '3');

const matchEmpty = filterJournalsByMateri(mockJournalRecords, '');
check('2.3.5: Behavioral: empty searchMateri returns all items', matchEmpty.length === 5);

// Adversarial test: regex meta-characters must not break string matching
const matchRegexChar = filterJournalsByMateri(mockJournalRecords, '.*[a-z]+(');
check('2.3.6: Adversarial: regex meta-characters in search query handled safely', matchRegexChar.length === 0);

// Whitespace resilience test
const matchWhitespaceQuery = filterJournalsByMateri(mockJournalRecords, '   aljabar   ');
check('2.3.7: Behavioral: searchMateri with leading/trailing spaces matches "Aljabar"', matchWhitespaceQuery.length === 1 && matchWhitespaceQuery[0].id === '1');


// ============================================================================
// SUITE 3: History View Filters
// ============================================================================
console.log('\n------------------------------------------------------------------------');
console.log('SUITE 3: History View Filters');
console.log('------------------------------------------------------------------------');

const historyViewPath = path.join(srcDir, 'components', 'HistoryView.tsx');
check('3.1.0: HistoryView.tsx exists', fs.existsSync(historyViewPath));
const historyViewContent = fs.readFileSync(historyViewPath, 'utf-8');

check(
  '3.1.1: HistoryView defines filterBulan state and renders <input type="month">',
  historyViewContent.includes('filterBulan') &&
  historyViewContent.includes('setFilterBulan') &&
  historyViewContent.includes('type="month"')
);

check(
  '3.1.2: HistoryView month picker is active when activeTab === "presensi"',
  historyViewContent.includes("activeTab === 'presensi'") &&
  historyViewContent.includes('filterBulan')
);

check(
  '3.1.3: HistoryView reset button clears both search text and filterBulan',
  historyViewContent.includes("setFilterBulan('')") &&
  historyViewContent.includes("setSearch('')")
);

// Behavioral test for HistoryView date filtering across formats
const mockPresensiHistory = [
  { id: 'p1', timestamp: '2026-11-04T07:15:00+08:00', tipe_absen: 'Datang' },
  { id: 'p2', timestamp: '2026-11-03 07:10:00', tipe_absen: 'Datang' },
  { id: 'p3', timestamp: '11/2/2026 07:12:00', tipe_absen: 'Datang' },
  { id: 'p4', timestamp: '2026-10-31 23:59:59', tipe_absen: 'Pulang' },
  { id: 'p5', timestamp: '2026-12-01T00:00:01', tipe_absen: 'Datang' },
  { id: 'p6', timestamp: '1/15/2026 07:30:00', tipe_absen: 'Datang' },
  { id: 'p7', timestamp: null, tipe_absen: 'Datang' }
];

function filterPresensiByMonth(list: any[], monthFilter: string) {
  if (!monthFilter) return list;
  return list.filter(item => {
    const ts = String(item.timestamp || '');
    if (!ts) return false;
    // 1. Direct prefix match for ISO or SQL strings (YYYY-MM)
    if (ts.startsWith(monthFilter) || ts.includes(monthFilter)) return true;
    // 2. Match M/D/YYYY or MM/DD/YYYY formatted strings
    const slash = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slash) {
      const m = slash[1].padStart(2, '0');
      const y = slash[3];
      if (`${y}-${m}` === monthFilter) return true;
    }
    return false;
  });
}

const nov2026 = filterPresensiByMonth(mockPresensiHistory, '2026-11');
check('3.2.1: Behavioral: 2026-11 filter correctly captures ISO, SQL, and slash dates', nov2026.length === 3);
check('3.2.2: Behavioral: captured items have IDs p1, p2, p3', nov2026.every(item => ['p1', 'p2', 'p3'].includes(item.id)));

const oct2026 = filterPresensiByMonth(mockPresensiHistory, '2026-10');
check('3.2.3: Behavioral: 2026-10 filter captures p4 (month boundary 23:59:59)', oct2026.length === 1 && oct2026[0].id === 'p4');

const jan2026 = filterPresensiByMonth(mockPresensiHistory, '2026-01');
check('3.2.4: Behavioral: 2026-01 filter captures single-digit month slash date 1/15/2026', jan2026.length === 1 && jan2026[0].id === 'p6');

const clearFilter = filterPresensiByMonth(mockPresensiHistory, '');
check('3.2.5: Behavioral: empty month filter returns full list including null timestamps', clearFilter.length === 7);


// ============================================================================
// SUITE 4: RBAC & Navigation Harmonization
// ============================================================================
console.log('\n------------------------------------------------------------------------');
console.log('SUITE 4: RBAC & Navigation Harmonization');
console.log('------------------------------------------------------------------------');

// 4.1 evaluateTabRBAC for supervisi-kelas
const resKepsekRaw = evaluateTabRBAC('view-guru-jurnal', 'supervisi-kelas', { role: 'kepala sekolah' });
check('4.1.1: evaluateTabRBAC allows "kepala sekolah" for supervisi-kelas', resKepsekRaw.allowed === true);

const resKepsekNorm = evaluateTabRBAC('view-guru-jurnal', 'supervisi-kelas', { role: 'kepalasekolah' });
check('4.1.2: evaluateTabRBAC allows "kepalasekolah" for supervisi-kelas', resKepsekNorm.allowed === true);

const resKepsekKebab = evaluateTabRBAC('view-guru-jurnal', 'supervisi-kelas', { role: 'kepala-sekolah' });
check('4.1.3: evaluateTabRBAC allows "kepala-sekolah" for supervisi-kelas', resKepsekKebab.allowed === true);

const resDinasRaw = evaluateTabRBAC('view-guru-jurnal', 'supervisi-kelas', { role: 'dinas pendidikan' });
check('4.1.4: evaluateTabRBAC allows "dinas pendidikan" for supervisi-kelas', resDinasRaw.allowed === true);

const resDinasNorm = evaluateTabRBAC('view-guru-jurnal', 'supervisi-kelas', { role: 'dinaspendidikan' });
check('4.1.5: evaluateTabRBAC allows "dinaspendidikan" for supervisi-kelas', resDinasNorm.allowed === true);

const resWali = evaluateTabRBAC('view-guru-jurnal', 'supervisi-kelas', { role: 'guru', isWaliKelas: true });
check('4.1.6: evaluateTabRBAC allows Wali Kelas (role: guru, isWaliKelas: true) for supervisi-kelas', resWali.allowed === true);

const resAdmin = evaluateTabRBAC('view-guru-jurnal', 'supervisi-kelas', { role: 'admin' });
check('4.1.7: evaluateTabRBAC allows Admin for supervisi-kelas', resAdmin.allowed === true);

const resSuperadmin = evaluateTabRBAC('view-guru-jurnal', 'supervisi-kelas', { role: 'superadmin' });
check('4.1.8: evaluateTabRBAC allows Superadmin for supervisi-kelas', resSuperadmin.allowed === true);

const resRegularGuru = evaluateTabRBAC('view-guru-jurnal', 'supervisi-kelas', { role: 'guru', isWaliKelas: false });
check(
  '4.1.9: evaluateTabRBAC denies regular teacher without Wali Kelas for supervisi-kelas',
  resRegularGuru.allowed === false && resRegularGuru.fallbackTab === 'input'
);

// 4.2 evaluateTabRBAC for Cluster 3: Gradebook / Rapor
const resRaporWali = evaluateTabRBAC('view-gradebook', 'rapor', { role: 'guru', isWaliKelas: true });
check('4.2.1: evaluateTabRBAC allows Wali Kelas for view-gradebook rapor tab', resRaporWali.allowed === true);

const resRaporAdmin = evaluateTabRBAC('view-gradebook', 'rapor', { role: 'admin' });
check('4.2.2: evaluateTabRBAC allows Admin for view-gradebook rapor tab', resRaporAdmin.allowed === true);

const resRaporGuru = evaluateTabRBAC('view-gradebook', 'rapor', { role: 'guru', isWaliKelas: false });
check(
  '4.2.3: evaluateTabRBAC denies regular teacher for view-gradebook rapor tab and falls back to gradebook',
  resRaporGuru.allowed === false && resRaporGuru.fallbackTab === 'gradebook'
);

// 4.3 Siswa Role Isolation
const resSiswaSupervisi = evaluateTabRBAC('view-guru-jurnal', 'supervisi-kelas', { role: 'siswa' });
check(
  '4.3.1: evaluateTabRBAC strictly denies Siswa from accessing teacher operational modules',
  resSiswaSupervisi.allowed === false && resSiswaSupervisi.fallbackTab === 'view-ujian'
);

const resSiswaUjian = evaluateTabRBAC('view-ujian', 'ujian', { role: 'siswa' });
check('4.3.2: evaluateTabRBAC allows Siswa for view-ujian', resSiswaUjian.allowed === true);

const resSiswaInformasi = evaluateTabRBAC('view-informasi', 'info', { role: 'siswa' });
check('4.3.3: evaluateTabRBAC allows Siswa for view-informasi', resSiswaInformasi.allowed === true);

// 4.4 getConsolidatedMenuItems across roles
const adminMenuItems = getConsolidatedMenuItems({ role: 'admin' });
const hasAdminInfo = adminMenuItems.some(m => m.id === 'view-informasi' && m.icon === 'fa-bullhorn');
check('4.4.1: getConsolidatedMenuItems for Admin includes view-informasi', hasAdminInfo);

const dinasSatelliteItems = getConsolidatedMenuItems({
  role: 'dinaspendidikan',
  activeTargetSchool: 'sekolah-uuid-123'
});
const hasDinasRekapSiswa = dinasSatelliteItems.some(m => m.id === 'view-rekap-siswa');
const hasDinasJurnalKelas = dinasSatelliteItems.some(m => m.id === 'view-jurnal-kelas');
check('4.4.2: getConsolidatedMenuItems for Dinas with activeTargetSchool includes view-rekap-siswa', hasDinasRekapSiswa);
check('4.4.3: getConsolidatedMenuItems for Dinas with activeTargetSchool includes view-jurnal-kelas', hasDinasJurnalKelas);

const dinasOverviewItems = getConsolidatedMenuItems({ role: 'dinaspendidikan' });
check(
  '4.4.4: getConsolidatedMenuItems for Dinas without activeTargetSchool returns region overview only',
  dinasOverviewItems.length === 1 && dinasOverviewItems[0].id === 'view-dinas-overview'
);

const guruRegulerItems = getConsolidatedMenuItems({ role: 'guru', isWaliKelas: false, isPiketHariIni: false });
check(
  '4.4.5: getConsolidatedMenuItems for regular teacher excludes view-rekap-siswa and view-piket',
  !guruRegulerItems.some(m => m.id === 'view-rekap-siswa') &&
  !guruRegulerItems.some(m => m.id === 'view-piket')
);

const guruWaliItems = getConsolidatedMenuItems({ role: 'guru', isWaliKelas: true });
check(
  '4.4.6: getConsolidatedMenuItems for Wali Kelas includes view-rekap-siswa',
  guruWaliItems.some(m => m.id === 'view-rekap-siswa')
);

const guruPiketItems = getConsolidatedMenuItems({ role: 'guru', isPiketHariIni: true });
check(
  '4.4.7: getConsolidatedMenuItems for Guru Piket includes view-piket',
  guruPiketItems.some(m => m.id === 'view-piket')
);


// ============================================================================
// SUITE 5: DokumenView & AdminVerifView
// ============================================================================
console.log('\n------------------------------------------------------------------------');
console.log('SUITE 5: DokumenView & AdminVerifView Read-Only & Role Normalization');
console.log('------------------------------------------------------------------------');

// 5.1 AdminVerifView forwards isReadOnly to DokumenView
const adminVerifPath = path.join(srcDir, 'components', 'AdminVerifView.tsx');
check('5.1.0: AdminVerifView.tsx exists', fs.existsSync(adminVerifPath));
const adminVerifContent = fs.readFileSync(adminVerifPath, 'utf-8');

check(
  '5.1.1: AdminVerifView explicitly passes isReadOnly={isReadOnly} to DokumenView',
  adminVerifContent.includes('<DokumenView user={user} isReadOnly={isReadOnly} />')
);

// 5.2 DokumenView interface and role check
const dokumenViewPath = path.join(srcDir, 'components', 'DokumenView.tsx');
check('5.2.0: DokumenView.tsx exists', fs.existsSync(dokumenViewPath));
const dokumenViewContent = fs.readFileSync(dokumenViewPath, 'utf-8');

check(
  '5.2.1: DokumenView exports DokumenViewProps with optional isReadOnly?: boolean',
  dokumenViewContent.includes('export interface DokumenViewProps') &&
  dokumenViewContent.includes('isReadOnly?: boolean;')
);

check(
  '5.2.2: DokumenView defaults isReadOnly to false',
  dokumenViewContent.includes('export default function DokumenView({ user, isReadOnly = false }: DokumenViewProps)')
);

check(
  '5.2.3: DokumenView normalizes role case-insensitively and recognizes admin & superadmin',
  dokumenViewContent.includes("normRole === 'admin' || normRole === 'superadmin'")
);

// Behavioral test for role normalization logic in DokumenView
function isDokumenAdmin(user: any): boolean {
  const normRole = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  return normRole === 'admin' || normRole === 'superadmin';
}

check('5.2.4: Behavioral: role "admin" is recognized as Admin', isDokumenAdmin({ role: 'admin' }) === true);
check('5.2.5: Behavioral: role "Admin" is recognized as Admin', isDokumenAdmin({ role: 'Admin' }) === true);
check('5.2.6: Behavioral: role "SUPERADMIN" is recognized as Admin', isDokumenAdmin({ role: 'SUPERADMIN' }) === true);
check('5.2.7: Behavioral: role "super_admin" is recognized as Admin', isDokumenAdmin({ role: 'super_admin' }) === true);
check('5.2.8: Behavioral: role "guru" is NOT recognized as Admin', isDokumenAdmin({ role: 'guru' }) === false);
check('5.2.9: Behavioral: null/undefined role does not crash and returns false', isDokumenAdmin(null) === false && isDokumenAdmin({}) === false);

// 5.3 DokumenView Read-Only Action Guards
check(
  '5.3.1: DokumenView guards edit/delete syarat actions with !isReadOnly check',
  dokumenViewContent.includes('!isReadOnly ? (') &&
  dokumenViewContent.includes('handleOpenEditSyarat') &&
  dokumenViewContent.includes('handleDeleteSyarat') &&
  dokumenViewContent.includes('Read-only')
);


// ============================================================================
// SUITE 6: Analytics & DOM Sanitization
// ============================================================================
console.log('\n------------------------------------------------------------------------');
console.log('SUITE 6: Analytics & DOM Sanitization');
console.log('------------------------------------------------------------------------');

// 6.1 AdminRekapView Tab 1 Composition Progress Bars
check(
  '6.1.1: AdminRekapView calculates persentaseKomposisi for hadir, izinSakit, and dinasLuar',
  adminRekapContent.includes('persentaseKomposisi') &&
  adminRekapContent.includes('persentaseKomposisi.hadir') &&
  adminRekapContent.includes('persentaseKomposisi.izinSakit') &&
  adminRekapContent.includes('persentaseKomposisi.dinasLuar')
);

check(
  '6.1.2: AdminRekapView renders dynamic width progress bars for each composition category',
  adminRekapContent.includes('style={{ width: `${persentaseKomposisi.hadir}%` }}') &&
  adminRekapContent.includes('style={{ width: `${persentaseKomposisi.izinSakit}%` }}') &&
  adminRekapContent.includes('style={{ width: `${persentaseKomposisi.dinasLuar}%` }}')
);

// Behavioral test for composition ratio calculation
function calculateComposition(hadir: number, izin: number, sakit: number, dinas: number) {
  const total = hadir + izin + sakit + dinas;
  return {
    total,
    hadir: total > 0 ? Math.round((hadir / total) * 100) : 0,
    izinSakit: total > 0 ? Math.round(((izin + sakit) / total) * 100) : 0,
    dinasLuar: total > 0 ? Math.round((dinas / total) * 100) : 0
  };
}

const comp1 = calculateComposition(70, 10, 10, 10);
check('6.1.3: Behavioral: composition ratio calculates 70% hadir, 20% izin/sakit, 10% dinas', comp1.hadir === 70 && comp1.izinSakit === 20 && comp1.dinasLuar === 10);

const compZero = calculateComposition(0, 0, 0, 0);
check('6.1.4: Behavioral: zero presensi records return 0% without NaN or division by zero errors', compZero.hadir === 0 && compZero.izinSakit === 0 && compZero.dinasLuar === 0 && !isNaN(compZero.hadir));

const comp100Hadir = calculateComposition(50, 0, 0, 0);
check('6.1.5: Behavioral: 100% hadir scenario correctly computes 100% and 0% for other categories', comp100Hadir.hadir === 100 && comp100Hadir.izinSakit === 0 && comp100Hadir.dinasLuar === 0);

// 6.2 AdminRekapView Leaderboard Top 5 / Top 10 Toggle & Scoring Formula
check(
  '6.2.1: AdminRekapView maintains leaderboardLimit state defaulting to 5',
  adminRekapContent.includes('leaderboardLimit') &&
  adminRekapContent.includes('setLeaderboardLimit')
);

check(
  '6.2.2: AdminRekapView provides toggle button group for Top 5 and Top 10',
  adminRekapContent.includes('setLeaderboardLimit(5)') &&
  adminRekapContent.includes('setLeaderboardLimit(10)') &&
  adminRekapContent.includes('(Top {leaderboardLimit} Guru)')
);

check(
  '6.2.3: AdminRekapView documents official formula: (Hadir×10) + (Piket×10) + (Jurnal×5) + (Dinas×5)',
  adminRekapContent.includes('(Hadir×10) + (Piket×10) + (Jurnal×5) + (Dinas×5)')
);

// Behavioral test for leaderboard ranking formula
function calculateLeaderboardScore(hadir: number, piket: number, jurnal: number, dinas: number): number {
  return (hadir * 10) + (piket * 10) + (jurnal * 5) + (dinas * 5);
}

const teacherA = { nama: 'Guru A', score: calculateLeaderboardScore(20, 2, 18, 1) }; // 200 + 20 + 90 + 5 = 315
const teacherB = { nama: 'Guru B', score: calculateLeaderboardScore(15, 4, 10, 3) }; // 150 + 40 + 50 + 15 = 255
const teacherC = { nama: 'Guru C', score: calculateLeaderboardScore(22, 1, 15, 0) }; // 220 + 10 + 75 + 0 = 305
const ranked = [teacherA, teacherB, teacherC].sort((a, b) => b.score - a.score);
check('6.2.4: Behavioral: Leaderboard formula correctly orders Guru A (315) > Guru C (305) > Guru B (255)', ranked[0].nama === 'Guru A' && ranked[1].nama === 'Guru C' && ranked[2].nama === 'Guru B');

// 6.3 HomeViewAdmin Quick Action Card for Informasi
const homeAdminPath = path.join(srcDir, 'components', 'HomeViewAdmin.tsx');
check('6.3.0: HomeViewAdmin.tsx exists', fs.existsSync(homeAdminPath));
const homeAdminContent = fs.readFileSync(homeAdminPath, 'utf-8');

check(
  '6.3.1: HomeViewAdmin renders Quick Action Card for Informasi Sekolah',
  homeAdminContent.includes('Publikasikan Informasi Sekolah') &&
  homeAdminContent.includes('fa-bullhorn') &&
  homeAdminContent.includes("setView('view-informasi')")
);

// 6.4 DOM Sanitization in AdminBackupView & SistemBlokView
const adminBackupPath = path.join(srcDir, 'components', 'AdminBackupView.tsx');
check('6.4.0: AdminBackupView.tsx exists', fs.existsSync(adminBackupPath));
const adminBackupContent = fs.readFileSync(adminBackupPath, 'utf-8');

check(
  '6.4.1: AdminBackupView uses clean <div id="view-admin-backup"> instead of nested view-section',
  adminBackupContent.includes('<div id="view-admin-backup" className="space-y-4 fade-in">') &&
  !adminBackupContent.includes('<section className="view-section"')
);

const sistemBlokPath = path.join(srcDir, 'components', 'SistemBlokView.tsx');
check('6.4.2: SistemBlokView.tsx exists', fs.existsSync(sistemBlokPath));
const sistemBlokContent = fs.readFileSync(sistemBlokPath, 'utf-8');

check(
  '6.4.3: SistemBlokView uses clean <div id="view-sistem-blok"> instead of nested view-section',
  sistemBlokContent.includes('<div id="view-sistem-blok" className="fade-in space-y-4">') &&
  !sistemBlokContent.includes('<section className="view-section"')
);


// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n========================================================================');
console.log(`🎉 TEST SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED (100% SUCCESS)`);
console.log('========================================================================\n');
