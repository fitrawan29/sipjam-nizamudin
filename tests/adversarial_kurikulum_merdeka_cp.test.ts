/**
 * ============================================================================
 * ADVERSARIAL STRESS TEST SUITE: KURIKULUM MERDEKA CP CALCULATIONS
 * Target: src/components/GradebookView.tsx -> generateKurikulumMerdekaDeskripsi
 * Agent: challenger_o18_m4_1
 * ============================================================================
 * 
 * Scope of Adversarial Verification (Dispatch Requirements):
 * 1. TP count variations: 1 TP, 2 TPs, 5 TPs, 20 TPs.
 * 2. Boundary score testing: 85, 84.99, 70, 69.99, 65, 0, 100.
 * 3. All scores >= 85: assert comprehensive mastery text.
 * 4. All scores < 70: assert needs guidance across all competencies text.
 * 5. Mixed scores with single highest, single lowest.
 * 6. Equal highest and lowest scores (ties).
 * 7. Invalid or extreme scores (negative, NaN, null, string numbers).
 * 8. Formatting and sentence cohesion in Indonesian.
 */

import assert from 'assert';
import {
  generateKurikulumMerdekaDeskripsi,
  CapaianDeskripsiResult
} from '../src/components/GradebookView';

console.log('================================================================');
console.log('   ADVERSARIAL EMPIRICAL HARNESS: KURIKULUM MERDEKA CP ENGINE   ');
console.log('================================================================\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

interface TestResult {
  category: string;
  testName: string;
  status: 'PASS' | 'FAIL';
  detail: string;
  output?: any;
}

const findings: TestResult[] = [];

function check(
  category: string,
  testName: string,
  condition: boolean,
  detail: string,
  output?: any
) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] [${category}] ${testName}`);
    findings.push({ category, testName, status: 'PASS', detail, output });
  } else {
    failedChecks++;
    console.error(`  [FAIL] [${category}] ${testName}`);
    console.error(`         Detail: ${detail}`);
    if (output) {
      console.error(`         Output:`, JSON.stringify(output, null, 2));
    }
    findings.push({ category, testName, status: 'FAIL', detail, output });
  }
}

// ============================================================================
// SUITE 1: TP COUNT VARIATIONS (1, 2, 5, 20 TPs)
// ============================================================================
console.log('━━━ SUITE 1: TP COUNT VARIATIONS (1, 2, 5, 20 TPs) ━━━');

// 1.1: 1 TP with High Score (90)
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa 1TP-High', [
    { kode: 'TP 1', deskripsi: 'memahami konsep trigonometri dasar', score: 90 }
  ]);
  check(
    'TP Count',
    '1 TP with score 90 yields finalScore 90, Sangat Baik (A), and mastery narrative',
    res.nilaiRapor === 90 &&
      res.predikat === 'Sangat Baik (A)' &&
      res.deskripsiCapaian.includes('Menunjukkan penguasaan yang sangat baik') &&
      res.deskripsiCapaian.includes('memahami konsep trigonometri dasar'),
    'Expected mastery narrative for high single TP',
    res
  );
}

// 1.2: 1 TP with Low Score (< 70, e.g. 50)
// DISPATCH REQ 4: "All scores < 70: assert needs guidance across all competencies text"
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa 1TP-Low', [
    { kode: 'TP 1', deskripsi: 'menghitung stoikiometri larutan', score: 50 }
  ]);
  const isGuidanceText = res.deskripsiCapaian.includes('Perlu bimbingan dan pendampingan lebih lanjut');
  const isMasteryContradiction = res.deskripsiCapaian.includes('Menunjukkan penguasaan yang sangat baik');
  check(
    'TP Count & Req 4',
    '1 TP with score 50 (< 70) must assert guidance text, NOT mastery text',
    isGuidanceText && !isMasteryContradiction,
    `Score is 50 (< 70) with predikat '${res.predikat}'. But deskripsi returned: "${res.deskripsiCapaian}"`,
    res
  );
}

// 1.3: 2 TPs with distinct scores [90, 60]
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa 2TP', [
    { kode: 'TP 1', deskripsi: 'analisis data statistik', score: 90 },
    { kode: 'TP 2', deskripsi: 'penyajian diagram lingkaran', score: 60 }
  ]);
  check(
    'TP Count',
    '2 TPs correctly identifies highest (TP 1) and lowest (TP 2) with mixed narrative',
    res.nilaiRapor === 75 &&
      res.highestTp?.kode === 'TP 1' &&
      res.lowestTp?.kode === 'TP 2' &&
      res.deskripsiCapaian.includes('analisis data statistik') &&
      res.deskripsiCapaian.includes('penyajian diagram lingkaran') &&
      res.deskripsiCapaian.includes('namun perlu bimbingan'),
    'Expected 2 TPs mixed narrative',
    res
  );
}

// 1.4: 5 TPs with varying scores
{
  const fiveTps = [
    { kode: 'TP 1', deskripsi: 'membaca teks eksplanasi', score: 88 },
    { kode: 'TP 2', deskripsi: 'menemukan ide pokok', score: 72 },
    { kode: 'TP 3', deskripsi: 'meringkas artikel ilmiah', score: 94 }, // highest
    { kode: 'TP 4', deskripsi: 'mengevaluasi bukti empiris', score: 62 }, // lowest
    { kode: 'TP 5', deskripsi: 'mempresentasikan hasil riset', score: 84 }
  ];
  const res = generateKurikulumMerdekaDeskripsi('Siswa 5TP', fiveTps);
  // Avg: (88 + 72 + 94 + 62 + 84) / 5 = 400 / 5 = 80.0
  check(
    'TP Count',
    '5 TPs correctly calculates average 80.0, highest TP 3, lowest TP 4',
    res.nilaiRapor === 80 &&
      res.predikat === 'Baik (B)' &&
      res.highestTp?.kode === 'TP 3' &&
      res.lowestTp?.kode === 'TP 4' &&
      res.deskripsiCapaian.includes('meringkas artikel ilmiah') &&
      res.deskripsiCapaian.includes('mengevaluasi bukti empiris'),
    'Expected 5 TPs calculation',
    res
  );
}

// 1.5: 20 TPs stress test
{
  const twentyTps = Array.from({ length: 20 }, (_, i) => ({
    kode: `TP ${i + 1}`,
    deskripsi: `kompetensi ke-${i + 1}`,
    score: 70 + ((i * 7) % 25) // scores between 70 and 94
  }));
  // TP with i=0 has score 70 (lowest). TP with i=3 has score 70+21=91, i=13 has score 70+16=86, etc.
  const maxScore = Math.max(...twentyTps.map((t) => t.score));
  const minScore = Math.min(...twentyTps.map((t) => t.score));
  const expectedAvg = parseFloat(
    (twentyTps.reduce((acc, t) => acc + t.score, 0) / 20).toFixed(1)
  );

  const res = generateKurikulumMerdekaDeskripsi('Siswa 20TP', twentyTps);
  check(
    'TP Count',
    '20 TPs executes correctly, computes expected average, and finds extrema',
    res.nilaiRapor === expectedAvg &&
      res.highestTp?.score === maxScore &&
      res.lowestTp?.score === minScore,
    'Expected 20 TPs stability',
    { expectedAvg, actual: res.nilaiRapor, highest: res.highestTp, lowest: res.lowestTp }
  );
}

// ============================================================================
// SUITE 2: BOUNDARY SCORE TESTING (85, 84.99, 70, 69.99, 65, 0, 100)
// ============================================================================
console.log('\n━━━ SUITE 2: BOUNDARY SCORE TESTING (85, 84.99, 70, 69.99, 65, 0, 100) ━━━');

// 2.1: Boundary 85 (Exact upper threshold)
{
  const res = generateKurikulumMerdekaDeskripsi('Boundary 85', [
    { kode: 'TP 1', deskripsi: 'Materi A', score: 85 },
    { kode: 'TP 2', deskripsi: 'Materi B', score: 85 }
  ]);
  check(
    'Boundary 85',
    'Score exactly 85 gives Sangat Baik (A) and comprehensive mastery text',
    res.nilaiRapor === 85 &&
      res.predikat === 'Sangat Baik (A)' &&
      res.deskripsiCapaian.includes('Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran'),
    'Expected 85 exact boundary behavior',
    res
  );
}

// 2.2: Boundary 84.99 (Sub-85 threshold)
{
  const res = generateKurikulumMerdekaDeskripsi('Boundary 84.99', [
    { kode: 'TP 1', deskripsi: 'Materi A', score: 84.99 },
    { kode: 'TP 2', deskripsi: 'Materi B', score: 84.99 }
  ]);
  // Rounding: (84.99).toFixed(1) -> "85.0", parseFloat -> 85
  // finalScore >= 85 -> Sangat Baik (A)
  // lowest.score >= 85 -> 84.99 >= 85 is FALSE!
  // isAllLow (84.99 < 70) is FALSE!
  // Fallthrough to else: "Menunjukkan penguasaan yang baik dalam Materi A, namun perlu bimbingan dan peningkatan dalam Materi B."
  const hasContradiction =
    res.predikat === 'Sangat Baik (A)' &&
    res.deskripsiCapaian.includes('perlu bimbingan dan peningkatan dalam Materi B');
  check(
    'Boundary 84.99',
    'Score 84.99 boundary consistency between predikat and narrative',
    !hasContradiction,
    `Predikat is '${res.predikat}' (rounded to ${res.nilaiRapor}), but deskripsi claims student needs remedial guidance in Materi B (score 84.99): "${res.deskripsiCapaian}"`,
    res
  );
}

// 2.3: Boundary 70 (Intervention threshold boundary)
{
  const res = generateKurikulumMerdekaDeskripsi('Boundary 70', [
    { kode: 'TP 1', deskripsi: 'Materi A', score: 70 },
    { kode: 'TP 2', deskripsi: 'Materi B', score: 70 }
  ]);
  // highest.score < 70 is false.
  check(
    'Boundary 70',
    'Score 70 is not classified as all-low (< 70) and predikat is Cukup (C)',
    res.nilaiRapor === 70 &&
      res.predikat === 'Cukup (C)' &&
      !res.deskripsiCapaian.includes('menguasai seluruh capaian pembelajaran, khususnya'),
    'Score 70 boundary check',
    res
  );
}

// 2.4: Boundary 69.99 (Just below intervention threshold)
{
  const res = generateKurikulumMerdekaDeskripsi('Boundary 69.99', [
    { kode: 'TP 1', deskripsi: 'Materi A', score: 69.99 },
    { kode: 'TP 2', deskripsi: 'Materi B', score: 69.99 }
  ]);
  // highest.score < 70 is true (69.99 < 70).
  // isAllLow is true -> "Perlu bimbingan dan pendampingan lebih lanjut..."
  check(
    'Boundary 69.99',
    'Score 69.99 triggers isAllLow guidance text across competencies',
    res.deskripsiCapaian.includes('Perlu bimbingan dan pendampingan lebih lanjut dalam menguasai seluruh capaian pembelajaran'),
    'Expected all-low guidance trigger for 69.99',
    res
  );
}

// 2.5: Boundary 65 (Cukup vs Perlu Bimbingan threshold)
{
  const res65 = generateKurikulumMerdekaDeskripsi('Boundary 65', [
    { kode: 'TP 1', deskripsi: 'Materi A', score: 65 },
    { kode: 'TP 2', deskripsi: 'Materi B', score: 65 }
  ]);
  const res649 = generateKurikulumMerdekaDeskripsi('Boundary 64.9', [
    { kode: 'TP 1', deskripsi: 'Materi A', score: 64.9 },
    { kode: 'TP 2', deskripsi: 'Materi B', score: 64.9 }
  ]);
  check(
    'Boundary 65',
    'Score 65 is Cukup (C) while score 64.9 is Perlu Bimbingan (D)',
    res65.predikat === 'Cukup (C)' && res649.predikat === 'Perlu Bimbingan (D)',
    'Expected 65 threshold transition',
    { res65: res65.predikat, res649: res649.predikat }
  );
}

// 2.6: Boundary 0 (Absolute minimum)
{
  const res = generateKurikulumMerdekaDeskripsi('Boundary 0', [
    { kode: 'TP 1', deskripsi: 'Materi A', score: 0 },
    { kode: 'TP 2', deskripsi: 'Materi B', score: 0 }
  ]);
  check(
    'Boundary 0',
    'Score 0 yields finalScore 0, Perlu Bimbingan (D), and guidance text',
    res.nilaiRapor === 0 &&
      res.predikat === 'Perlu Bimbingan (D)' &&
      res.deskripsiCapaian.includes('Perlu bimbingan dan pendampingan lebih lanjut'),
    'Expected 0 score handling',
    res
  );
}

// 2.7: Boundary 100 (Absolute maximum)
{
  const res = generateKurikulumMerdekaDeskripsi('Boundary 100', [
    { kode: 'TP 1', deskripsi: 'Materi A', score: 100 },
    { kode: 'TP 2', deskripsi: 'Materi B', score: 100 }
  ]);
  check(
    'Boundary 100',
    'Score 100 yields finalScore 100, Sangat Baik (A), and comprehensive mastery text',
    res.nilaiRapor === 100 &&
      res.predikat === 'Sangat Baik (A)' &&
      res.deskripsiCapaian.includes('Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran'),
    'Expected 100 score handling',
    res
  );
}

// ============================================================================
// SUITE 3: ALL SCORES >= 85 (COMPREHENSIVE MASTERY NARRATIVE)
// ============================================================================
console.log('\n━━━ SUITE 3: ALL SCORES >= 85 (COMPREHENSIVE MASTERY) ━━━');

{
  const res = generateKurikulumMerdekaDeskripsi('All High Multi-TP', [
    { kode: 'TP 1', deskripsi: 'merancang basis data relasional', score: 95 },
    { kode: 'TP 2', deskripsi: 'menulis kueri SQL kompleks', score: 90 },
    { kode: 'TP 3', deskripsi: 'mengoptimasi indeks database', score: 86 }
  ]);
  check(
    'All >= 85',
    'All TP scores >= 85 generates comprehensive mastery narrative mentioning highest TP',
    res.deskripsiCapaian ===
      'Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam merancang basis data relasional.',
    'Verifying exact comprehensive mastery template',
    res
  );
}

// ============================================================================
// SUITE 4: ALL SCORES < 70 (NEEDS GUIDANCE ACROSS ALL COMPETENCIES)
// ============================================================================
console.log('\n━━━ SUITE 4: ALL SCORES < 70 (REMEDIAL GUIDANCE) ━━━');

{
  const res = generateKurikulumMerdekaDeskripsi('All Low Multi-TP', [
    { kode: 'TP 1', deskripsi: 'pemrograman modular', score: 68 },
    { kode: 'TP 2', deskripsi: 'analisis algoritma sorting', score: 55 },
    { kode: 'TP 3', deskripsi: 'debugging kode rekursif', score: 45 }
  ]);
  check(
    'All < 70',
    'All TP scores < 70 generates remedial guidance narrative mentioning lowest TP',
    res.deskripsiCapaian ===
      'Perlu bimbingan dan pendampingan lebih lanjut dalam menguasai seluruh capaian pembelajaran, khususnya dalam debugging kode rekursif.',
    'Verifying exact remedial guidance template',
    res
  );
}

// Stress Test Req 4 on 1 TP with score < 70:
{
  const res = generateKurikulumMerdekaDeskripsi('Single TP Low', [
    { kode: 'TP 1', deskripsi: 'pemahaman gerak lurus berubah beraturan', score: 58 }
  ]);
  check(
    'All < 70 (1 TP)',
    'Single TP with score < 70 must state remedial guidance, NOT mastery',
    res.deskripsiCapaian.includes('Perlu bimbingan') &&
      !res.deskripsiCapaian.includes('penguasaan yang sangat baik'),
    `Single TP with score 58 produced: "${res.deskripsiCapaian}"`,
    res
  );
}

// ============================================================================
// SUITE 5: MIXED SCORES WITH SINGLE HIGHEST, SINGLE LOWEST
// ============================================================================
console.log('\n━━━ SUITE 5: MIXED SCORES (SINGLE HIGHEST, SINGLE LOWEST) ━━━');

{
  const res = generateKurikulumMerdekaDeskripsi('Mixed Student', [
    { kode: 'TP 1', deskripsi: 'menganalisis teks eksplanasi', score: 92 }, // highest
    { kode: 'TP 2', deskripsi: 'menulis resensi buku', score: 78 },
    { kode: 'TP 3', deskripsi: 'menyunting kaidah ejaan', score: 65 }   // lowest
  ]);
  check(
    'Mixed Scores',
    'Mixed scores synthesizes both highest mastery and lowest improvement areas',
    res.deskripsiCapaian ===
      'Menunjukkan penguasaan yang baik dalam menganalisis teks eksplanasi, namun perlu bimbingan dan peningkatan dalam menyunting kaidah ejaan.',
    'Verifying exact mixed description synthesis',
    res
  );
}

// ============================================================================
// SUITE 6: EQUAL HIGHEST AND LOWEST SCORES (TIES)
// ============================================================================
console.log('\n━━━ SUITE 6: EQUAL HIGHEST AND LOWEST SCORES (TIES) ━━━');

// 6.1: All scores equal at intermediate score (e.g. 78, 78)
{
  const res = generateKurikulumMerdekaDeskripsi('Flat Tie 78', [
    { kode: 'TP 1', deskripsi: 'Materi Geometri', score: 78 },
    { kode: 'TP 2', deskripsi: 'Materi Aljabar', score: 78 }
  ]);
  // Current behavior: highest = TP 1 (78), lowest = TP 2 (78).
  // Neither isAllHigh (78 < 85) nor isAllLow (78 not < 70).
  // Yields: "Menunjukkan penguasaan yang baik dalam Materi Geometri, namun perlu bimbingan dan peningkatan dalam Materi Aljabar."
  const isSemanticContradiction =
    res.deskripsiCapaian.includes('Materi Geometri') &&
    res.deskripsiCapaian.includes('perlu bimbingan dan peningkatan dalam Materi Aljabar');
  check(
    'Ties: Equal 78',
    'Equal scores (78 vs 78) should not arbitrarily penalize one TP as needing remedial guidance',
    !isSemanticContradiction,
    `Identical score 78 across both TPs arbitrarily labelled Materi Aljabar as needing remediation: "${res.deskripsiCapaian}"`,
    res
  );
}

// 6.2: Identical Descriptions with equal scores
{
  const res = generateKurikulumMerdekaDeskripsi('Identical Deskripsi Tie', [
    { kode: 'TP 1', deskripsi: 'pemahaman tata surya', score: 75 },
    { kode: 'TP 2', deskripsi: 'pemahaman tata surya', score: 75 }
  ]);
  // Current code: "Menunjukkan penguasaan yang baik dalam pemahaman tata surya, namun perlu bimbingan dan peningkatan dalam pemahaman tata surya."
  const isDirectOxymoron =
    res.deskripsiCapaian.includes('Menunjukkan penguasaan yang baik dalam pemahaman tata surya') &&
    res.deskripsiCapaian.includes('namun perlu bimbingan dan peningkatan dalam pemahaman tata surya');
  check(
    'Ties: Direct Oxymoron',
    'Identical description tie must not create self-contradictory sentence',
    !isDirectOxymoron,
    `Direct self-contradiction produced: "${res.deskripsiCapaian}"`,
    res
  );
}

// 6.3: Tie for highest score [90, 90, 60]
{
  const res = generateKurikulumMerdekaDeskripsi('Highest Tie', [
    { kode: 'TP 1', deskripsi: 'Materi A', score: 90 },
    { kode: 'TP 2', deskripsi: 'Materi B', score: 90 },
    { kode: 'TP 3', deskripsi: 'Materi C', score: 60 }
  ]);
  check(
    'Ties: Highest Tie',
    'Highest tie picks valid highest (score 90) and lowest (score 60)',
    res.highestTp?.score === 90 &&
      res.lowestTp?.score === 60 &&
      res.deskripsiCapaian.includes('Materi C'),
    'Tie handling for highest',
    res
  );
}

// 6.4: Tie for lowest score [90, 60, 60]
{
  const res = generateKurikulumMerdekaDeskripsi('Lowest Tie', [
    { kode: 'TP 1', deskripsi: 'Materi A', score: 90 },
    { kode: 'TP 2', deskripsi: 'Materi B', score: 60 },
    { kode: 'TP 3', deskripsi: 'Materi C', score: 60 }
  ]);
  check(
    'Ties: Lowest Tie',
    'Lowest tie picks valid highest (score 90) and valid lowest (score 60)',
    res.highestTp?.score === 90 && res.lowestTp?.score === 60,
    'Tie handling for lowest',
    res
  );
}

// ============================================================================
// SUITE 7: INVALID OR EXTREME SCORES (NEGATIVE, NAN, NULL, STRING NUMBERS)
// ============================================================================
console.log('\n━━━ SUITE 7: INVALID OR EXTREME SCORES ━━━');

// 7.1: Null and NaN filtering
{
  const res = generateKurikulumMerdekaDeskripsi('Null and NaN', [
    { kode: 'TP 1', deskripsi: 'Materi Valid', score: 80 },
    { kode: 'TP 2', deskripsi: 'Materi Null', score: null },
    { kode: 'TP 3', deskripsi: 'Materi NaN', score: NaN }
  ]);
  check(
    'Invalid Scores: Null/NaN',
    'Null and NaN scores are filtered out, computing average purely from valid numbers',
    res.nilaiRapor === 80 && res.highestTp?.kode === 'TP 1',
    'Null/NaN filter verification',
    res
  );
}

// 7.2: String numbers (e.g. "85")
{
  const res = generateKurikulumMerdekaDeskripsi('String Numbers', [
    { kode: 'TP 1', deskripsi: 'Materi A', score: '85' as any },
    { kode: 'TP 2', deskripsi: 'Materi B', score: 75 }
  ]);
  // In JS: !isNaN("85") is true!
  // reduce: 0 + "85" = "085", "085" + 75 = "08575"!
  // ( "08575" / 2 ) = 4287.5!
  const isTypeCorrupted = typeof res.nilaiRapor === 'number' && res.nilaiRapor > 100;
  check(
    'Invalid Scores: String Number Fuzzing',
    'String score "85" must NOT corrupt accumulator into string concatenation ("08575")',
    !isTypeCorrupted && res.nilaiRapor === 80,
    `String score "85" resulted in nilaiRapor = ${res.nilaiRapor} due to JS loose typing!`,
    res
  );
}

// 7.3: Negative scores (e.g. -10)
{
  const res = generateKurikulumMerdekaDeskripsi('Negative Score', [
    { kode: 'TP 1', deskripsi: 'Materi A', score: -10 },
    { kode: 'TP 2', deskripsi: 'Materi B', score: 80 }
  ]);
  // Average: (-10 + 80) / 2 = 35.0
  check(
    'Invalid Scores: Negative Score Handling',
    'Negative scores either rejected/clamped or mapped safely to Perlu Bimbingan (D)',
    res.nilaiRapor !== null && res.nilaiRapor >= 0,
    `Negative score (-10) produced unconstrained calculation: nilaiRapor = ${res.nilaiRapor}`,
    res
  );
}

// 7.4: Over 100 scores (e.g. 150)
{
  const res = generateKurikulumMerdekaDeskripsi('Over 100 Score', [
    { kode: 'TP 1', deskripsi: 'Materi A', score: 150 },
    { kode: 'TP 2', deskripsi: 'Materi B', score: 90 }
  ]);
  check(
    'Invalid Scores: Out of Range > 100',
    'Scores exceeding 100 capped or flagged',
    res.nilaiRapor !== null && res.nilaiRapor <= 100,
    `Out-of-range score (150) inflated nilaiRapor to ${res.nilaiRapor}`,
    res
  );
}

// ============================================================================
// SUITE 8: FORMATTING AND SENTENCE COHESION IN INDONESIAN
// ============================================================================
console.log('\n━━━ SUITE 8: INDONESIAN FORMATTING & COHESION ━━━');

// 8.1: Punctuation and Capitalization
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa Cohesion', [
    { kode: 'TP 1', deskripsi: 'memahami struktur algoritma percabangan', score: 88 },
    { kode: 'TP 2', deskripsi: 'menerapkan perulangan bertingkat', score: 68 }
  ]);
  const text = res.deskripsiCapaian;
  const startsWithCapital = /^[A-Z]/.test(text);
  const endsWithPeriod = text.endsWith('.');
  const noDoubleSpaces = !text.includes('  ');
  const validIndonesianConjunction = text.includes(', namun ');

  check(
    'Cohesion: Grammar & Punctuation',
    'Sentence starts with capital, ends with period, has no double spaces, uses valid ", namun "',
    startsWithCapital && endsWithPeriod && noDoubleSpaces && validIndonesianConjunction,
    `Text: "${text}"`,
    { startsWithCapital, endsWithPeriod, noDoubleSpaces, validIndonesianConjunction }
  );
}

// 8.2: Empty description string handling
{
  const res = generateKurikulumMerdekaDeskripsi('Empty Desc', [
    { kode: 'TP 1', deskripsi: '', score: 90 },
    { kode: 'TP 2', deskripsi: '', score: 60 }
  ]);
  const text = res.deskripsiCapaian;
  const hasDanglingPreposition = text.includes('dalam ,') || text.endsWith('dalam .');
  check(
    'Cohesion: Empty Description Fallback',
    'Empty description should not leave dangling preposition "dalam ,"',
    !hasDanglingPreposition,
    `Dangling preposition detected: "${text}"`,
    res
  );
}

// ============================================================================
// SUMMARY & METRICS
// ============================================================================
console.log('\n================================================================');
console.log(`TOTAL ADVERSARIAL CHECKS: ${totalChecks}`);
console.log(`PASSED: ${passedChecks}`);
console.log(`FAILED: ${failedChecks}`);
console.log('================================================================\n');

if (failedChecks > 0) {
  console.log('SUMMARY OF FAILED FINDINGS:');
  findings
    .filter((f) => f.status === 'FAIL')
    .forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.category}] ${f.testName}`);
      console.log(`     -> ${f.detail}`);
    });
}
