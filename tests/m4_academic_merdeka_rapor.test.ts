import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {
  generateKurikulumMerdekaDeskripsi,
  CapaianDeskripsiResult
} from '../src/components/GradebookView';
import { GURU_STEPS, ADMIN_STEPS } from '../src/components/Onboarding/tutorialSteps';
import { TUTORIAL_DATA } from '../src/components/Tutorial/tutorialData';

console.log('================================================================');
console.log('  MILESTONE 4: KURIKULUM MERDEKA ACADEMICS, RAPOR & TUTORIALS   ');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      return (res as Promise<void>)
        .then(() => {
          passedTests++;
          console.log(`  ✔ [PASS] ${name}`);
        })
        .catch((err: any) => {
          console.error(`  ✖ [FAIL] ${name}`);
          console.error(`     Error: ${err.message}`);
          process.exitCode = 1;
        });
    } else {
      passedTests++;
      console.log(`  ✔ [PASS] ${name}`);
    }
  } catch (err: any) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

async function main() {
  console.log('━━━ SUITE 1: KURIKULUM MERDEKA CALCULATION LOGIC & NARRATIVE SYNTHESIS ━━━');

  runTest('M4-01: Empty or invalid TP scores handled gracefully with fallback text', () => {
    const emptyResult = generateKurikulumMerdekaDeskripsi('Budi', []);
    assert.strictEqual(emptyResult.nilaiRapor, null);
    assert.strictEqual(emptyResult.predikat, '-');
    assert.strictEqual(emptyResult.predikatBadge, 'text-gray-400');
    assert.strictEqual(emptyResult.highestTp, null);
    assert.strictEqual(emptyResult.lowestTp, null);
    assert.strictEqual(emptyResult.deskripsiCapaian, 'Belum ada data penilaian capaian pembelajaran.');

    // Only nulls/NaNs
    const nullsResult = generateKurikulumMerdekaDeskripsi('Siti', [
      { kode: 'TP 1', deskripsi: 'Aljabar', score: null },
      { kode: 'TP 2', deskripsi: 'Geometri', score: NaN }
    ]);
    assert.strictEqual(nullsResult.nilaiRapor, null);
    assert.strictEqual(nullsResult.predikat, '-');
  });

  runTest('M4-02: All high TP scores (lowest >= 85) produces mastery narrative & Sangat Baik (A)', () => {
    const tpScores = [
      { kode: 'TP 1', deskripsi: 'menganalisis struktur teks argumentasi', score: 92 },
      { kode: 'TP 2', deskripsi: 'menulis paragraf persuasi secara efektif', score: 88 },
      { kode: 'TP 3', deskripsi: 'menyampaikan pidato secara persuasif', score: 86 }
    ];
    const res = generateKurikulumMerdekaDeskripsi('Ahmad', tpScores);
    assert.strictEqual(res.nilaiRapor, 88.7);
    assert.strictEqual(res.predikat, 'Sangat Baik (A)');
    assert.ok(res.predikatBadge.includes('bg-green-100'));
    assert.strictEqual(res.highestTp?.kode, 'TP 1');
    assert.strictEqual(res.lowestTp?.kode, 'TP 3');
    assert.strictEqual(
      res.deskripsiCapaian,
      'Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam menganalisis struktur teks argumentasi.'
    );
  });

  runTest('M4-03: Single TP score treated as comprehensive mastery of that goal', () => {
    const tpScores = [
      { kode: 'TP 1', deskripsi: 'memahami operasi vektor dua dimensi', score: 78 }
    ];
    const res = generateKurikulumMerdekaDeskripsi('Dewi', tpScores);
    assert.strictEqual(res.nilaiRapor, 78);
    assert.strictEqual(res.predikat, 'Baik (B)');
    assert.strictEqual(
      res.deskripsiCapaian,
      'Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam memahami operasi vektor dua dimensi.'
    );
  });

  runTest('M4-04: All low TP scores (highest < 70) produces remedial guidance narrative & Perlu Bimbingan (D)', () => {
    const tpScores = [
      { kode: 'TP 1', deskripsi: 'menghitung stoikiometri larutan asam-basa', score: 62 },
      { kode: 'TP 2', deskripsi: 'menjelaskan hukum kekekalan massa', score: 58 },
      { kode: 'TP 3', deskripsi: 'merancang percobaan titrasi sederhana', score: 50 }
    ];
    const res = generateKurikulumMerdekaDeskripsi('Rian', tpScores);
    assert.strictEqual(res.nilaiRapor, 56.7);
    assert.strictEqual(res.predikat, 'Perlu Bimbingan (D)');
    assert.ok(res.predikatBadge.includes('bg-red-100'));
    assert.strictEqual(res.highestTp?.kode, 'TP 1');
    assert.strictEqual(res.lowestTp?.kode, 'TP 3');
    assert.strictEqual(
      res.deskripsiCapaian,
      'Perlu bimbingan dan pendampingan lebih lanjut dalam menguasai seluruh capaian pembelajaran, khususnya dalam merancang percobaan titrasi sederhana.'
    );
  });

  runTest('M4-05: Mixed TP scores synthesizes both strength and guidance areas', () => {
    const tpScores = [
      { kode: 'TP 1', deskripsi: 'menganalisis peristiwa sejarah kemerdekaan', score: 88 },
      { kode: 'TP 2', deskripsi: 'menjelaskan dampak revolusi industri', score: 76 },
      { kode: 'TP 3', deskripsi: 'mengevaluasi sumber primer dan sekunder', score: 68 }
    ];
    const res = generateKurikulumMerdekaDeskripsi('Fajar', tpScores);
    assert.strictEqual(res.nilaiRapor, 77.3);
    assert.strictEqual(res.predikat, 'Baik (B)');
    assert.ok(res.predikatBadge.includes('bg-blue-100'));
    assert.strictEqual(res.highestTp?.kode, 'TP 1');
    assert.strictEqual(res.lowestTp?.kode, 'TP 3');
    assert.strictEqual(
      res.deskripsiCapaian,
      'Menunjukkan penguasaan yang baik dalam menganalisis peristiwa sejarah kemerdekaan, namun perlu bimbingan dan peningkatan dalam mengevaluasi sumber primer dan sekunder.'
    );
  });

  runTest('M4-06: Predikat boundary transitions conform to Kemendikbudristek scale', () => {
    // 85 -> Sangat Baik (A)
    const resA = generateKurikulumMerdekaDeskripsi('Test A', [
      { kode: 'TP 1', deskripsi: 'Materi 1', score: 85 },
      { kode: 'TP 2', deskripsi: 'Materi 2', score: 85 }
    ]);
    assert.strictEqual(resA.predikat, 'Sangat Baik (A)');

    // 75 -> Baik (B)
    const resB = generateKurikulumMerdekaDeskripsi('Test B', [
      { kode: 'TP 1', deskripsi: 'Materi 1', score: 75 },
      { kode: 'TP 2', deskripsi: 'Materi 2', score: 75 }
    ]);
    assert.strictEqual(resB.predikat, 'Baik (B)');

    // 65 -> Cukup (C)
    const resC = generateKurikulumMerdekaDeskripsi('Test C', [
      { kode: 'TP 1', deskripsi: 'Materi 1', score: 65 },
      { kode: 'TP 2', deskripsi: 'Materi 2', score: 65 }
    ]);
    assert.strictEqual(resC.predikat, 'Cukup (C)');

    // 64.9 -> Perlu Bimbingan (D)
    const resD = generateKurikulumMerdekaDeskripsi('Test D', [
      { kode: 'TP 1', deskripsi: 'Materi 1', score: 64 },
      { kode: 'TP 2', deskripsi: 'Materi 2', score: 65 }
    ]);
    assert.strictEqual(resD.nilaiRapor, 64.5);
    assert.strictEqual(resD.predikat, 'Perlu Bimbingan (D)');
  });

  console.log('\n━━━ SUITE 2: GRADEBOOK TAB 2 INTEGRATION ━━━');

  runTest('M4-07: GradebookView.tsx exports function and integrates into Tab 2 rekap-semester', () => {
    const gradebookPath = path.join(__dirname, '../src/components/GradebookView.tsx');
    assert.ok(fs.existsSync(gradebookPath), 'GradebookView.tsx must exist');
    const content = fs.readFileSync(gradebookPath, 'utf8');

    // Check export
    assert.ok(
      content.includes('export function generateKurikulumMerdekaDeskripsi'),
      'Must export generateKurikulumMerdekaDeskripsi'
    );
    assert.ok(
      content.includes('export interface CapaianDeskripsiResult'),
      'Must export CapaianDeskripsiResult'
    );

    // Check calculation hook invocation
    assert.ok(
      content.includes('generateKurikulumMerdekaDeskripsi(nisn, tpScoresList)'),
      'Must invoke generateKurikulumMerdekaDeskripsi in calculateStudentSemesterStats'
    );

    // Check dedicated column in Tab 2
    assert.ok(
      content.includes('Deskripsi Capaian Pembelajaran'),
      'Must render header Deskripsi Capaian Pembelajaran in Tab 2 table'
    );
    assert.ok(
      content.includes('stats.deskripsiCapaian'),
      'Must render stats.deskripsiCapaian in student rows'
    );
  });

  console.log('\n━━━ SUITE 3: WALI KELAS "RAPOR" MENU & ACCESS GUARDS IN AppScreen.tsx ━━━');

  runTest('M4-08: Menu items condition: includes Rapor when isWaliKelas is true, excludes when false', () => {
    const appScreenPath = path.join(__dirname, '../src/components/AppScreen.tsx');
    assert.ok(fs.existsSync(appScreenPath), 'AppScreen.tsx must exist');
    const content = fs.readFileSync(appScreenPath, 'utf8');

    // Check menuItemsGuru definition
    const guruMenuSnippet = `...(isWaliKelas ? [{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }] : [])`;
    assert.ok(
      content.includes(guruMenuSnippet),
      'menuItemsGuru must conditionally spread view-rapor when isWaliKelas is true'
    );

    // Test the logic directly
    const simulateMenuItemsGuru = (isWaliKelas: boolean) => [
      { id: 'view-home', icon: 'fa-house', label: 'Dashboard' },
      { id: 'view-guru-presensi', icon: 'fa-right-to-bracket', label: 'Presensi Guru' },
      { id: 'view-guru-jurnal', icon: 'fa-book-journal-whills', label: 'Jurnal Pembelajaran' },
      { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Daftar Nilai' },
      ...(isWaliKelas ? [{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }] : [])
    ];

    const teacherAsWali = simulateMenuItemsGuru(true);
    assert.ok(teacherAsWali.some(m => m.id === 'view-rapor'), 'Wali Kelas must see Rapor menu');

    const teacherRegular = simulateMenuItemsGuru(false);
    assert.ok(!teacherRegular.some(m => m.id === 'view-rapor'), 'Regular teacher must NOT see Rapor menu');
  });

  runTest('M4-09: Admin menu always includes Rapor menu', () => {
    const appScreenPath = path.join(__dirname, '../src/components/AppScreen.tsx');
    const content = fs.readFileSync(appScreenPath, 'utf8');

    assert.ok(
      content.includes(`{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }`),
      'menuItemsAdmin must include view-rapor'
    );
  });

  runTest('M4-10: handleNavigation guards view-rapor with Swal alert for unauthorized roles', () => {
    const appScreenPath = path.join(__dirname, '../src/components/AppScreen.tsx');
    const content = fs.readFileSync(appScreenPath, 'utf8');

    assert.ok(
      content.includes("targetId === 'view-rapor'"),
      'handleNavigation must inspect targetId === view-rapor'
    );
    assert.ok(
      content.includes('!isAdmin && !isSuperadmin && !isWaliKelas'),
      'Guard condition must require isAdmin || isSuperadmin || isWaliKelas'
    );
    assert.ok(
      content.includes('Akses Ditolak'),
      'Guard must trigger Swal warning with Akses Ditolak'
    );
  });

  runTest('M4-11: AppScreen renders RaporView when authorized and fallback card when unauthorized', () => {
    const appScreenPath = path.join(__dirname, '../src/components/AppScreen.tsx');
    const content = fs.readFileSync(appScreenPath, 'utf8');

    assert.ok(
      content.includes("currentView === 'view-rapor'"),
      'Must have render block for currentView === view-rapor'
    );
    assert.ok(
      content.includes('<RaporView user={user} assignedKelas={assignedKelas} />'),
      'Must render RaporView passing user and assignedKelas when authorized'
    );
    assert.ok(
      content.includes('Akses Terblokir') && content.includes('Wali Kelas'),
      'Must render Akses Terblokir card when unauthorized'
    );
  });

  console.log('\n━━━ SUITE 4: RaporView.tsx IMPLEMENTATION & FEATURE COMPLETENESS ━━━');

  runTest('M4-12: RaporView.tsx component exists and provides full Kurikulum Merdeka workflow', () => {
    const raporViewPath = path.join(__dirname, '../src/components/RaporView.tsx');
    assert.ok(fs.existsSync(raporViewPath), 'RaporView.tsx must exist');
    const content = fs.readFileSync(raporViewPath, 'utf8');

    // Exports default component
    assert.ok(content.includes('export default function RaporView'), 'Must export default RaporView');

    // Uses generateKurikulumMerdekaDeskripsi
    assert.ok(
      content.includes('generateKurikulumMerdekaDeskripsi'),
      'RaporView must use generateKurikulumMerdekaDeskripsi for CP synthesis'
    );

    // Contains student selection and class filtering
    assert.ok(content.includes('selectedStudent'), 'Must manage selectedStudent');
    assert.ok(content.includes('selectedKelas'), 'Must manage selectedKelas');

    // Contains attendance summary
    assert.ok(
      content.includes('attendanceMap') && content.includes('hadir') && content.includes('alpa'),
      'Must calculate and display attendance summary'
    );

    // Contains teacher notes (Catatan Wali Kelas)
    assert.ok(
      content.includes('catatanWaliMap') || content.includes('handleCatatanChange'),
      'Must manage Catatan Wali Kelas reflections'
    );

    // Contains official print with GPS
    assert.ok(
      content.includes('triggerPrintWithGps'),
      'Must integrate triggerPrintWithGps for authenticated GPS print'
    );
    assert.ok(
      content.includes('PrintSignature'),
      'Must include PrintSignature component'
    );
  });

  console.log('\n━━━ SUITE 5: IN-APP TUTORIAL UPDATES ━━━');

  runTest('M4-13: Onboarding tutorialSteps.ts covers all required teacher flows & Wali Kelas Rapor', () => {
    const presensiStep = GURU_STEPS.find(s => s.id === 'guru-step-2-presensi');
    assert.ok(presensiStep, 'Must have guru-step-2-presensi');
    assert.ok(
      presensiStep.description.includes('Dinas Luar') && presensiStep.description.includes('30-min snooze'),
      'Presensi step must document Dinas Luar and 30-min snooze'
    );

    const jurnalStep = GURU_STEPS.find(s => s.id === 'guru-step-3-jurnal');
    assert.ok(jurnalStep, 'Must have guru-step-3-jurnal');
    assert.ok(
      jurnalStep.description.includes('bolos'),
      'Jurnal step must document truancy/bolos detection'
    );

    const piketStep = GURU_STEPS.find(s => s.id === 'guru-step-4-piket');
    assert.ok(piketStep, 'Must have guru-step-4-piket');
    assert.ok(
      piketStep.description.includes('concurrency lock'),
      'Piket step must document concurrency lock'
    );

    const raporStep = GURU_STEPS.find(s => s.id === 'guru-step-6-rapor');
    assert.ok(raporStep, 'Must have guru-step-6-rapor');
    assert.strictEqual(raporStep.targetTourId, 'view-rapor');
    assert.ok(
      raporStep.description.includes('Wali Kelas') && raporStep.description.includes('capaian pembelajaran'),
      'Rapor step must document Wali Kelas CP and rapor print'
    );
  });

  runTest('M4-14: In-App Knowledge Base tutorialData.ts includes guru-rapor and updated modules', () => {
    // 1. guru-rapor
    const raporTutorial = TUTORIAL_DATA.find(t => t.id === 'guru-rapor');
    assert.ok(raporTutorial, 'TUTORIAL_DATA must contain guru-rapor item');
    assert.strictEqual(raporTutorial.viewId, 'view-rapor');
    assert.strictEqual(raporTutorial.role, 'guru');
    assert.ok(
      raporTutorial.summary.includes('Kurikulum Merdeka') && raporTutorial.summary.includes('Capaian Pembelajaran'),
      'guru-rapor summary must mention Kurikulum Merdeka and CP'
    );
    assert.ok(
      raporTutorial.keyTips.some(k => k.includes('GPS') || k.includes('Kemendikbudristek')),
      'guru-rapor tips must explain CP synthesis or GPS legality'
    );

    // 2. guru-presensi
    const presensiTutorial = TUTORIAL_DATA.find(t => t.id === 'guru-presensi');
    assert.ok(presensiTutorial, 'Must have guru-presensi tutorial');
    assert.ok(
      presensiTutorial.summary.includes('Dinas Luar') &&
      presensiTutorial.summary.includes('30-min snooze') &&
      presensiTutorial.summary.includes('auto-checkout'),
      'guru-presensi summary must cover multi-state, snooze, and auto-checkout'
    );

    // 3. guru-jurnal
    const jurnalTutorial = TUTORIAL_DATA.find(t => t.id === 'guru-jurnal');
    assert.ok(jurnalTutorial, 'Must have guru-jurnal tutorial');
    assert.ok(
      jurnalTutorial.steps.some(s => s.includes('bolos')) ||
      jurnalTutorial.keyTips.some(k => k.includes('bolos')),
      'guru-jurnal must document truancy (bolos) detection'
    );

    // 4. guru-piket
    const piketTutorial = TUTORIAL_DATA.find(t => t.id === 'guru-piket');
    assert.ok(piketTutorial, 'Must have guru-piket tutorial');
    assert.ok(
      piketTutorial.steps.some(s => s.includes('Concurrency Lock')) ||
      piketTutorial.keyTips.some(k => k.includes('Concurrency Lock')),
      'guru-piket must document concurrency lock'
    );

    // 5. admin-verif
    const adminVerifTutorial = TUTORIAL_DATA.find(t => t.id === 'admin-verif');
    assert.ok(adminVerifTutorial, 'Must have admin-verif tutorial');
    assert.ok(
      adminVerifTutorial.summary.includes('>=3 hari') ||
      adminVerifTutorial.steps.some(s => s.includes('>=3 hari')),
      'admin-verif must document routing and approval for long-term sick and leave'
    );
  });

  console.log('\n================================================================');
  console.log(`  M4 TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exitCode = 1;
});
