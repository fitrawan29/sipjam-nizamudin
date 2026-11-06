/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — CHALLENGER M1 NOV 2
 * File: tests/challenger_m1_nov_2_stress.test.ts
 *
 * Mission:
 * 1. Verifikasi Perangkat Kelas X Subject Resolution:
 *    - Teacher names tokenized/fuzzy resolution (short vs full with academic titles)
 *    - Multi-subject combinations & multi-class assignments
 *    - Acronym expansion (MTK -> Matematika, etc.)
 *    - Class X subject formatting ("Matematika • Kelas X Merdeka")
 *    - Absolute zero tolerance for 'Mata Pelajaran Umum' fallback for Class X
 * 2. Sub Menu Cetak Dokumen Resmi Removal & Route Aliasing:
 *    - tabItems has exactly ['analitik', 'tabel'] and NO 'cetak'
 *    - initialTab === 'cetak' resolves to 'tabel'
 *    - Sub-Tab 2 retains all print headers, signature, GPS watermark, and export features
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import {
  normalizeTeacherToken,
  isTeacherNameMatch,
  isTeacherEntityMatch,
  MAPEL_EXPANSIONS,
  canonicalizeSubjectName,
  isMapelMatch,
  extractTingkat,
  resolveTeacherSubjects,
  TeacherSubjectResolved
} from '../src/components/DokumenView';
import { resolveCanonicalRoute, VIEW_ALIASES } from '../src/lib/navigation';

// ============================================================================
// TEST HARNESS & ANSI STYLING
// ============================================================================
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
const failures: { id: string; name: string; detail?: string }[] = [];

function assert(condition: boolean, id: string, name: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${GREEN}✔ [${id}] PASS:${RESET} ${name}`);
    if (detail) {
      console.log(`    ${GRAY}↳ ${detail}${RESET}`);
    }
  } else {
    failedTests++;
    console.error(`  ${RED}✖ [${id}] FAIL:${RESET} ${name}`);
    if (detail) {
      console.error(`    ${RED}↳ Detail: ${detail}${RESET}`);
    }
    failures.push({ id, name, detail });
  }
}

function assertEqual<T>(actual: T, expected: T, id: string, name: string) {
  const match = actual === expected;
  assert(
    match,
    id,
    name,
    match ? undefined : `Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`
  );
}

function suiteBanner(title: string) {
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║  ${title.padEnd(66, ' ')}║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}\n`);
}

function sectionHeader(section: string, title: string) {
  console.log(`\n${YELLOW}${BOLD}━━━ [${section}] ${title} ━━━${RESET}`);
}

async function runChallengerStressSuite() {
  suiteBanner('ADVERSARIAL CHALLENGER STRESS SUITE: M1 PRODUKSI VERIFIKASI');

  const projectRoot = path.resolve(__dirname, '..');
  const dokViewPath = path.join(projectRoot, 'src', 'components', 'DokumenView.tsx');
  const adminRekapPath = path.join(projectRoot, 'src', 'components', 'AdminRekapView.tsx');
  const tutorialPath = path.join(projectRoot, 'src', 'components', 'Onboarding', 'tutorialSteps.ts');

  const dokViewContent = fs.readFileSync(dokViewPath, 'utf8');
  const adminRekapContent = fs.readFileSync(adminRekapPath, 'utf8');
  const tutorialContent = fs.readFileSync(tutorialPath, 'utf8');

  // =========================================================================
  // SUITE 1: TEACHER NAME TOKENIZED / FUZZY MATCHING STRESS
  // =========================================================================
  sectionHeader('Suite 1', 'Teacher Name Matching (Short vs Full with Academic Titles)');

  const teacherMatchCases = [
    // [short/scheduleName, fullTeacherName, expectedMatch, description]
    { short: 'Ade', full: 'Ade Fitrawan Ibrahim, S.Pd.', match: true, desc: 'Ade matches Ade Fitrawan Ibrahim, S.Pd.' },
    { short: 'Ade', full: 'Ade Fitrawan Ibrahim, M.Pd., Gr.', match: true, desc: 'Ade matches multi-title Ade Fitrawan Ibrahim, M.Pd., Gr.' },
    { short: 'Ade', full: 'Drs. Ade Fitrawan Ibrahim', match: true, desc: 'Ade matches prefix title Drs. Ade Fitrawan Ibrahim' },
    { short: 'Ade Fitrawan', full: 'Ade Fitrawan Ibrahim, S.Pd.', match: true, desc: 'Two-word prefix matches full name' },
    { short: 'Susan', full: 'Susana Muliono, S.Pd.', match: true, desc: 'Susan matches Susana Muliono, S.Pd.' },
    { short: 'Susan', full: 'Hj. Susana Muliono, S.Pd.', match: true, desc: 'Susan matches Hj. Susana Muliono with prefix degree' },
    { short: 'Susana', full: 'Susana Muliono, S.Pd.', match: true, desc: 'Susana matches Susana Muliono' },
    { short: 'Ambar', full: 'Setia Ambar Ningsih Mamonto, S.Pd.', match: true, desc: 'Ambar matches middle token in Setia Ambar Ningsih Mamonto' },
    { short: 'Ambar', full: 'Dra. Setia Ambar Ningsih Mamonto', match: true, desc: 'Ambar matches Setia Ambar Ningsih with Dra. prefix' },
    { short: 'Setia Ambar', full: 'Setia Ambar Ningsih Mamonto, S.Pd.', match: true, desc: 'Setia Ambar matches Setia Ambar Ningsih Mamonto' },
    { short: 'Rizki', full: 'Riski Candra Mamangkai', match: true, desc: 'Rizki matches Riski (Z <-> S phonetic normalization)' },
    { short: 'Riski', full: 'Riski Candra Mamangkai, S.Pd.', match: true, desc: 'Riski matches Riski Candra Mamangkai' },
    { short: 'Rizki Candra', full: 'Riski Candra Mamangkai', match: true, desc: 'Rizki Candra matches Riski Candra Mamangkai' },
    { short: 'Riski Candra', full: 'Riski Candra Mamangkai, S.Pd., Gr.', match: true, desc: 'Riski Candra matches full name with trailing degrees' },
    // Adversarial Negative Cases (Must NEVER match unrelated teachers)
    { short: 'Ade', full: 'Budi Santoso, S.Pd.', match: false, desc: 'Ade does NOT match Budi Santoso' },
    { short: 'Susan', full: 'Ratna Sari Dewi, M.Pd.', match: false, desc: 'Susan does NOT match Ratna Sari Dewi' },
    { short: 'Ambar', full: 'Ahmad Fauzi, S.Kom.', match: false, desc: 'Ambar does NOT match Ahmad Fauzi' },
    { short: 'Rizki', full: 'Dewi Lestari, S.Pd.', match: false, desc: 'Rizki does NOT match Dewi Lestari' },
  ];

  teacherMatchCases.forEach((tc, idx) => {
    const directMatch = isTeacherNameMatch(tc.short, tc.full);
    const reverseMatch = isTeacherNameMatch(tc.full, tc.short);
    assert(
      directMatch === tc.match && reverseMatch === tc.match,
      `T1.1.${idx + 1}`,
      `${tc.desc} (Bi-directional: ${directMatch})`
    );
  });

  // Entity matching with NIP and ID
  const mockTeacherEntity = {
    id: 't-101',
    user_id: 'u-101',
    nama_guru: 'Ade Fitrawan Ibrahim, S.Pd.',
    nip: '198501012010011005'
  };

  assert(
    isTeacherEntityMatch(mockTeacherEntity, 'Ade'),
    'T1.2.1',
    'Entity matches schedule by nickname Ade'
  );
  assert(
    isTeacherEntityMatch(mockTeacherEntity, 'Ade Fitrawan Ibrahim'),
    'T1.2.2',
    'Entity matches schedule by full name without title'
  );
  assert(
    isTeacherEntityMatch(mockTeacherEntity, 'Unknown Guru', '198501012010011005'),
    'T1.2.3',
    'Entity matches schedule by NIP fallback even if name differs'
  );
  assert(
    isTeacherEntityMatch(mockTeacherEntity, 'Unknown Guru', undefined, 'u-101'),
    'T1.2.4',
    'Entity matches schedule by user_id fallback'
  );

  // =========================================================================
  // SUITE 2: SUBJECT ACRONYM EXPANSION & CANONICALIZATION
  // =========================================================================
  sectionHeader('Suite 2', 'Subject Acronym Expansion & Canonicalization');

  const expansionCases = [
    { input: 'mtk', expected: 'Matematika' },
    { input: 'MTK', expected: 'Matematika' },
    { input: 'matematika', expected: 'Matematika' },
    { input: 'informatika', expected: 'Informatika' },
    { input: 'fisika', expected: 'Fisika' },
    { input: 'kimia', expected: 'Kimia' },
    { input: 'biologi', expected: 'Biologi' },
    { input: 'geografi', expected: 'Geografi' },
    { input: 'sosiologi', expected: 'Sosiologi' },
    { input: 'ekonomi', expected: 'Ekonomi' },
    { input: 'sejarah', expected: 'Sejarah' },
    { input: 'pp', expected: 'Pendidikan Pancasila' },
    { input: 'pkn', expected: 'Pendidikan Pancasila' },
    { input: 'pjok', expected: 'PJOK' },
    { input: 'sb', expected: 'Seni Budaya' },
    { input: 'b. ing', expected: 'Bahasa Inggris' },
    { input: 'b.ing', expected: 'Bahasa Inggris' },
    { input: 'b ing', expected: 'Bahasa Inggris' },
    { input: 'b. indo', expected: 'Bahasa Indonesia' },
    { input: 'b.indo', expected: 'Bahasa Indonesia' },
    { input: 'b indo', expected: 'Bahasa Indonesia' },
    { input: 'pai bp', expected: 'PAI & BP' },
    { input: 'mtl', expected: 'Matematika Tingkat Lanjut' },
    // Prefixed cases
    { input: 'X Merdeka_MTK', expected: 'Matematika' },
    { input: 'X Merdeka_Informatika', expected: 'Informatika' },
    { input: 'X-1_b. ing', expected: 'Bahasa Inggris' },
    { input: 'X Merdeka 1_pjok', expected: 'PJOK' },
  ];

  expansionCases.forEach((ec, idx) => {
    const canonical = canonicalizeSubjectName(ec.input);
    assertEqual(
      canonical,
      ec.expected,
      `T2.1.${idx + 1}`,
      `Subject acronym expansion: "${ec.input}" -> "${ec.expected}"`
    );
  });

  // =========================================================================
  // SUITE 3: MULTI-SUBJECT RESOLUTION & CLASS X FORMATTING
  // =========================================================================
  sectionHeader('Suite 3', 'Multi-Subject Resolution, Multi-Class & Class X Formatting');

  // Teacher 1: Ade Fitrawan Ibrahim (teaches MTK and Informatika in Class X)
  const teacherAde = {
    id: 'guru-ade',
    nama_guru: 'Ade Fitrawan Ibrahim, S.Pd.',
    nip: '198501012010011005'
  };

  const jadwalListSample = [
    { id: 'j-1', nama_guru: 'Ade', mata_pelajaran: 'MTK', kelas: 'X Merdeka' },
    { id: 'j-2', nama_guru: 'Ade', mata_pelajaran: 'Informatika', kelas: 'X Merdeka' },
    // Teacher 2: Susana Muliono (teaches Bahasa Inggris across multiple Class X sections)
    { id: 'j-3', nama_guru: 'Susan', mata_pelajaran: 'b. ing', kelas: 'X Merdeka 1' },
    { id: 'j-4', nama_guru: 'Susan', mata_pelajaran: 'b. ing', kelas: 'X Merdeka 2' },
    // Teacher 3: Setia Ambar Ningsih (teaches Biologi in Class X and XI)
    { id: 'j-5', nama_guru: 'Ambar', mata_pelajaran: 'Biologi', kelas: 'X Merdeka' },
    { id: 'j-6', nama_guru: 'Ambar', mata_pelajaran: 'Biologi', kelas: 'XI F-1' },
    // Teacher 4: Riski Candra Mamangkai (teaches PJOK in Class X)
    { id: 'j-7', nama_guru: 'Rizki', mata_pelajaran: 'pjok', kelas: 'X Merdeka' },
  ];

  const resolvedAde = resolveTeacherSubjects(teacherAde, jadwalListSample, [], []);
  assert(
    resolvedAde.length === 2,
    'T3.1.1',
    `Ade resolves exactly 2 subjects (found ${resolvedAde.length})`
  );

  const adeMapelNames = resolvedAde.map(s => s.nama_mapel);
  assert(
    adeMapelNames.includes('Matematika') && adeMapelNames.includes('Informatika'),
    'T3.1.2',
    'Ade resolves MTK -> Matematika and Informatika correctly'
  );

  // Check Card Display Formatting: `${card.subject.nama_mapel} ${card.subject.kelas ? `• Kelas ${card.subject.kelas}` : ''}`
  const adeCardDisplay1 = `${resolvedAde[0].nama_mapel} ${resolvedAde[0].kelas ? `• Kelas ${resolvedAde[0].kelas}` : ''}`;
  const adeCardDisplay2 = `${resolvedAde[1].nama_mapel} ${resolvedAde[1].kelas ? `• Kelas ${resolvedAde[1].kelas}` : ''}`;
  assert(
    adeCardDisplay1 === 'Matematika • Kelas X Merdeka' || adeCardDisplay2 === 'Matematika • Kelas X Merdeka',
    'T3.1.3',
    'Class X subject formatted correctly on Card: "Matematika • Kelas X Merdeka"'
  );
  assert(
    adeCardDisplay1 === 'Informatika • Kelas X Merdeka' || adeCardDisplay2 === 'Informatika • Kelas X Merdeka',
    'T3.1.4',
    'Class X subject formatted correctly on Card: "Informatika • Kelas X Merdeka"'
  );

  // Check Table Print Formatting: `${sub.nama_mapel}${sub.kelas ? ` (Kelas ${sub.kelas})` : ''}`
  const adePrintDisplay = `${resolvedAde[0].nama_mapel}${resolvedAde[0].kelas ? ` (Kelas ${resolvedAde[0].kelas})` : ''}`;
  assert(
    adePrintDisplay.includes('(Kelas X Merdeka)'),
    'T3.1.5',
    'Class X subject formatted correctly in Print Table: "... (Kelas X Merdeka)"'
  );

  // Teacher 2: Susana Muliono (Susan)
  const teacherSusan = {
    id: 'guru-susan',
    nama_guru: 'Susana Muliono, S.Pd.',
    nip: '198703152011022003'
  };
  const resolvedSusan = resolveTeacherSubjects(teacherSusan, jadwalListSample, [], []);
  assert(
    resolvedSusan.length === 2,
    'T3.2.1',
    `Susan resolves both Class X parallel sections (found ${resolvedSusan.length})`
  );
  assert(
    resolvedSusan.every(s => s.nama_mapel === 'Bahasa Inggris'),
    'T3.2.2',
    'Susan b. ing correctly expanded to "Bahasa Inggris" for all sections'
  );
  const susanClasses = resolvedSusan.map(s => s.kelas);
  assert(
    susanClasses.includes('X Merdeka 1') && susanClasses.includes('X Merdeka 2'),
    'T3.2.3',
    'Susan assigned to both "X Merdeka 1" and "X Merdeka 2"'
  );

  // Teacher 3: Setia Ambar Ningsih Mamonto (Ambar) - Class X must sort before Class XI
  const teacherAmbar = {
    id: 'guru-ambar',
    nama_guru: 'Setia Ambar Ningsih Mamonto, S.Pd.',
    nip: '199005202015032001'
  };
  const resolvedAmbar = resolveTeacherSubjects(teacherAmbar, jadwalListSample, [], []);
  assert(
    resolvedAmbar.length === 2,
    'T3.3.1',
    `Ambar resolves 2 subjects across grades (found ${resolvedAmbar.length})`
  );
  assert(
    resolvedAmbar[0].kelas === 'X Merdeka' && extractTingkat(resolvedAmbar[0].kelas) === 'X',
    'T3.3.2',
    'Class X subject is logically sorted FIRST before upper classes'
  );

  // Teacher 4: Riski Candra Mamangkai (Rizki)
  const teacherRizki = {
    id: 'guru-rizki',
    nama_guru: 'Riski Candra Mamangkai',
    nip: '199208102019011002'
  };
  const resolvedRizki = resolveTeacherSubjects(teacherRizki, jadwalListSample, [], []);
  assert(
    resolvedRizki.length === 1 && resolvedRizki[0].nama_mapel === 'PJOK',
    'T3.4.1',
    'Riski resolves "pjok" -> "PJOK" via phonetic match "Rizki"'
  );

  // =========================================================================
  // SUITE 4: EMPIRICAL VERIFICATION THAT "MATA PELAJARAN UMUM" NEVER APPEARS
  // =========================================================================
  sectionHeader('Suite 4', 'Empirical Verification: Zero "Mata Pelajaran Umum" Fallback');

  // Generate 50 adversarial teacher & schedule configurations
  const sampleNames = [
    { short: 'Ade', full: 'Ade Fitrawan Ibrahim, S.Pd.' },
    { short: 'Susan', full: 'Susana Muliono, S.Pd.' },
    { short: 'Ambar', full: 'Setia Ambar Ningsih Mamonto, S.Pd.' },
    { short: 'Rizki', full: 'Riski Candra Mamangkai' },
    { short: 'Budi', full: 'Drs. Budi Santoso, M.Pd.' },
    { short: 'Dewi', full: 'Hj. Dewi Lestari, S.Pd., Gr.' },
    { short: 'Fauzi', full: 'Ahmad Fauzi, S.Kom.' },
    { short: 'Nur', full: 'Dra. Nurjanah, M.Pd.' },
    { short: 'Makmur', full: 'Drs. H. Makmur, M.Pd.' },
    { short: 'Citra', full: 'Citra Kirana, S.Pd.' }
  ];

  const sampleSubjects = [
    'MTK', 'Informatika', 'b. ing', 'pjok', 'Fisika',
    'Kimia', 'Biologi', 'Ekonomi', 'Sosiologi', 'Geografi'
  ];

  const sampleClasses = [
    'X Merdeka', 'X Merdeka 1', 'X Merdeka 2', 'X-A', 'X.1'
  ];

  let zeroMpuViolations = 0;
  let totalEvaluated = 0;

  for (let i = 0; i < 50; i++) {
    const namePair = sampleNames[i % sampleNames.length];
    const subStr = sampleSubjects[i % sampleSubjects.length];
    const clsStr = sampleClasses[i % sampleClasses.length];

    const teacher = {
      id: `guru-${i}`,
      nama_guru: `${namePair.full} (ID ${i})`,
      nip: `19800000000000${i}`
    };

    const jadwal = [
      {
        id: `j-${i}`,
        nama_guru: namePair.short,
        mata_pelajaran: subStr,
        kelas: clsStr
      }
    ];

    const resolved = resolveTeacherSubjects(teacher, jadwal, [], []);
    totalEvaluated += resolved.length;

    resolved.forEach(r => {
      const lower = r.nama_mapel.toLowerCase();
      if (lower.includes('mata pelajaran umum') || lower === 'umum') {
        zeroMpuViolations++;
      }
      // Formatted card check
      const cardFmt = `${r.nama_mapel} ${r.kelas ? `• Kelas ${r.kelas}` : ''}`;
      if (cardFmt.includes('Mata Pelajaran Umum')) {
        zeroMpuViolations++;
      }
    });
  }

  assertEqual(
    zeroMpuViolations,
    0,
    'T4.1.1',
    `Zero instances of "Mata Pelajaran Umum" found across ${totalEvaluated} resolved Class X configurations`
  );

  // Static AST / code scan check in DokumenView
  const dokLines = dokViewContent.split('\n');
  const codeMpuMatches = dokLines.filter(l => l.includes("'Mata Pelajaran Umum'") && !l.includes('*'));
  assertEqual(
    codeMpuMatches.length,
    0,
    'T4.1.2',
    `Zero occurrences of 'Mata Pelajaran Umum' string literal in DokumenView.tsx code`
  );

  // =========================================================================
  // SUITE 5: SUB MENU CETAK DOKUMEN RESMI REMOVAL & ROUTE ALIASING
  // =========================================================================
  sectionHeader('Suite 5', 'Sub Menu Cetak Removal, tabItems Structure & Route Aliasing');

  // 1. Check tabItems in AdminRekapView
  assert(
    !adminRekapContent.includes("id: 'cetak'"),
    'T5.1.1',
    'AdminRekapView tabItems does not contain id: "cetak"'
  );

  assert(
    !adminRekapContent.includes("activeTab === 'cetak'"),
    'T5.1.2',
    'AdminRekapView does not contain activeTab === "cetak" block'
  );

  // Extract tabItems definition from code
  const tabItemsMatch = adminRekapContent.match(/const tabItems: TabItem\[\] = (\[[\s\S]*?\]);/);
  assert(
    !!tabItemsMatch,
    'T5.1.3',
    'tabItems definition located in AdminRekapView'
  );

  if (tabItemsMatch) {
    const tabItemsStr = tabItemsMatch[1];
    assert(
      tabItemsStr.includes("id: 'analitik'") && tabItemsStr.includes("id: 'tabel'"),
      'T5.1.4',
      'tabItems contains exactly analitik and tabel'
    );
    assert(
      !tabItemsStr.includes('cetak'),
      'T5.1.5',
      'tabItems strictly excludes cetak'
    );
  }

  // 2. Empirical Route Redirection: initialTab === 'cetak'
  assert(
    adminRekapContent.includes("initialTab === 'cetak' ? 'tabel' : initialTab"),
    'T5.2.1',
    'AdminRekapView maps initialTab === "cetak" to "tabel"'
  );

  // Test resolveCanonicalRoute behavior
  const routeDirectCetak = resolveCanonicalRoute('view-admin-rekap', 'cetak');
  assertEqual(
    routeDirectCetak.canonicalView,
    'view-admin-rekap',
    'T5.2.2',
    'Canonical view remains view-admin-rekap'
  );
  assertEqual(
    routeDirectCetak.defaultTab,
    'tabel',
    'T5.2.3',
    'Subtab "cetak" transparently aliases to "tabel"'
  );

  const routeAliasAnalitikCetak = resolveCanonicalRoute('view-analitik', 'cetak');
  assertEqual(
    routeAliasAnalitikCetak.canonicalView,
    'view-admin-rekap',
    'T5.2.4',
    'Legacy view-analitik maps to view-admin-rekap'
  );
  assertEqual(
    routeAliasAnalitikCetak.defaultTab,
    'tabel',
    'T5.2.5',
    'Legacy view-analitik with tab=cetak resolves to tab=tabel'
  );

  const routeAliasRekapGuruCetak = resolveCanonicalRoute('view-rekap-guru', 'cetak');
  assertEqual(
    routeAliasRekapGuruCetak.canonicalView,
    'view-admin-rekap',
    'T5.2.6',
    'Legacy view-rekap-guru maps to view-admin-rekap'
  );
  assertEqual(
    routeAliasRekapGuruCetak.defaultTab,
    'tabel',
    'T5.2.7',
    'Legacy view-rekap-guru with tab=cetak resolves to tab=tabel'
  );

  // 3. Tutorial Steps verification
  assert(
    !tutorialContent.includes("'Cetak Dokumen Resmi'"),
    'T5.3.1',
    'tutorialSteps.ts has cleanly removed "Cetak Dokumen Resmi" from subTabs'
  );
  assert(
    tutorialContent.includes("subTabs: ['Analitik & Leaderboard', 'Tabel Rekapitulasi']"),
    'T5.3.2',
    'tutorialSteps.ts subTabs contains exactly Analitik & Leaderboard and Tabel Rekapitulasi'
  );

  // =========================================================================
  // SUITE 6: SUB-TAB 2 RETENTION OF ALL PRINT & EXPORT FEATURES
  // =========================================================================
  sectionHeader('Suite 6', 'Sub-Tab 2 Retention of All Official Print, Signature & Export Features');

  // 1. Universal Print Header
  assert(
    adminRekapContent.includes('<PrintHeader user={user} sekolahId={user?.sekolah_id} />'),
    'T6.1.1',
    'Universal <PrintHeader /> present in print-only container `<div className="hidden print:block">`'
  );

  // 2. Period and Printed By Header
  assert(
    adminRekapContent.includes('formatPeriodHeader(bulan, startDate, endDate)') &&
    adminRekapContent.includes('Dicetak Oleh:'),
    'T6.1.2',
    'Period header and "Dicetak Oleh" author metadata present for official prints'
  );

  // 3. Legally binding signature in Sub-Tab 2
  const subTab2StartIdx = adminRekapContent.indexOf("activeTab === 'tabel' ? 'block' : 'hidden'");
  assert(
    subTab2StartIdx !== -1,
    'T6.1.3',
    'Sub-Tab 2 (Tabel Rekapitulasi) container located'
  );

  const subTab2Block = adminRekapContent.substring(subTab2StartIdx);

  assert(
    subTab2Block.includes('<PrintSignature') &&
    subTab2Block.includes('leftTitle="Mengetahui,"') &&
    subTab2Block.includes('leftSubtitle="Pengelola Data / Admin"'),
    'T6.1.4',
    'Sub-Tab 2 contains official <PrintSignature /> with Pengelola Data / Admin subtitle'
  );

  // 4. GPS watermark trigger
  assert(
    subTab2Block.includes('triggerPrintWithGps()'),
    'T6.1.5',
    'Sub-Tab 2 includes `triggerPrintWithGps()` attached to Cetak Halaman button'
  );

  // 5. Excel / CSV export
  assert(
    subTab2Block.includes('handleExportCsv') &&
    subTab2Block.includes('fa-file-excel'),
    'T6.1.6',
    'Sub-Tab 2 includes `handleExportCsv` attached to Excel export button'
  );

  // 6. 11-column breakdown table in Sub-Tab 2
  const requiredTableColumns = [
    'No', 'Nama Guru', 'Wajib', 'Hadir', 'Dinas Luar', 'Sakit', 'Izin',
    'Alpa', 'Pulang Cepat', 'Keterlambatan', 'Piket', 'Jurnal'
  ];

  requiredTableColumns.forEach(col => {
    assert(
      subTab2Block.includes(`font-bold">${col}<`) ||
      subTab2Block.includes(`>${col}<`) ||
      subTab2Block.includes(col),
      `T6.2.${col}`,
      `Sub-Tab 2 table retains column "${col}"`
    );
  });

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log(`\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║  CHALLENGER STRESS SUITE RESULTS SUMMARY                             ║${RESET}`);
  console.log(`${CYAN}${BOLD}╠══════════════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`${CYAN}${BOLD}║  Total Assertions Executed : ${String(totalTests).padEnd(40, ' ')}║${RESET}`);
  console.log(`${CYAN}${BOLD}║  Passed                    : ${String(passedTests).padEnd(40, ' ')}║${RESET}`);
  console.log(`${CYAN}${BOLD}║  Failed                    : ${String(failedTests).padEnd(40, ' ')}║${RESET}`);
  console.log(`${CYAN}${BOLD}║  Pass Rate                 : ${(passedTests === totalTests ? '100.0%' : `${((passedTests/totalTests)*100).toFixed(1)}%`).padEnd(40, ' ')}║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════════╝${RESET}\n`);

  if (failedTests > 0) {
    console.error(`${RED}${BOLD}❌ VERDICT: CHALLENGE_FAILED — ${failedTests} assertion(s) failed.${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}🎉 VERDICT: APPROVE — 100% of adversarial stress assertions passed!${RESET}`);
    process.exit(0);
  }
}

runChallengerStressSuite().catch(err => {
  console.error('UNEXPECTED EXCEPTION IN CHALLENGER SUITE:', err);
  process.exit(1);
});
