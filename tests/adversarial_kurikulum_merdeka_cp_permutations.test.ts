/**
 * ============================================================================
 * ADVERSARIAL STRESS TEST: KURIKULUM MERDEKA CP EXTENDED PERMUTATIONS
 * Target: src/components/GradebookView.tsx -> generateKurikulumMerdekaDeskripsi
 * Agent: challenger_o18_m4_it2_1 (Critic / Specialist)
 * ============================================================================
 */

import {
  generateKurikulumMerdekaDeskripsi,
  CapaianDeskripsiResult
} from '../src/components/GradebookView';

console.log('================================================================');
console.log('  EMPIRICAL ADVERSARIAL STRESS: EXTENDED CP PERMUTATIONS & BOUNDS');
console.log('================================================================\n');

let total = 0;
let passed = 0;
let failed = 0;

interface TestRecord {
  suite: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const records: TestRecord[] = [];

function assertCheck(suite: string, name: string, condition: boolean, details: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] [${suite}] ${name}`);
    records.push({ suite, name, status: 'PASS', details });
  } else {
    failed++;
    console.error(`  [FAIL] [${suite}] ${name}`);
    console.error(`         Reason: ${details}`);
    records.push({ suite, name, status: 'FAIL', details });
  }
}

// ----------------------------------------------------------------------------
// SUITE A: EMPTY / NULLISH / DEGENERATE ARRAYS
// ----------------------------------------------------------------------------
console.log('━━━ SUITE A: EMPTY & DEGENERATE ARRAYS ━━━');

// A1: Empty array input
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa A1', []);
  assertCheck(
    'Degenerate Arrays',
    'A1: Empty array returns null score and fallback description',
    res.nilaiRapor === null &&
      res.predikat === '-' &&
      res.predikatBadge === 'text-gray-400' &&
      res.highestTp === null &&
      res.lowestTp === null &&
      res.deskripsiCapaian === 'Belum ada data penilaian capaian pembelajaran.',
    `Got: ${JSON.stringify(res)}`
  );
}

// A2: Null and Undefined tpScores input
{
  const resNull = generateKurikulumMerdekaDeskripsi('Siswa A2-Null', null as any);
  const resUndef = generateKurikulumMerdekaDeskripsi('Siswa A2-Undef', undefined as any);
  assertCheck(
    'Degenerate Arrays',
    'A2: Null and Undefined tpScores gracefully return fallback object without throwing',
    resNull.nilaiRapor === null &&
      resNull.predikat === '-' &&
      resUndef.nilaiRapor === null &&
      resUndef.predikat === '-',
    `Null result: ${JSON.stringify(resNull)}, Undef result: ${JSON.stringify(resUndef)}`
  );
}

// A3: Array of completely invalid scores (all null, undefined, NaN, empty string)
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa A3', [
    { kode: 'TP 1', deskripsi: 'A', score: null },
    { kode: 'TP 2', deskripsi: 'B', score: undefined },
    { kode: 'TP 3', deskripsi: 'C', score: NaN },
    { kode: 'TP 4', deskripsi: 'D', score: '' as any }
  ]);
  assertCheck(
    'Degenerate Arrays',
    'A3: All invalid score objects filter to empty set cleanly',
    res.nilaiRapor === null && res.highestTp === null && res.lowestTp === null,
    `Got: ${JSON.stringify(res)}`
  );
}

// ----------------------------------------------------------------------------
// SUITE B: SINGLE TP VARIATIONS ACROSS ALL PREDIKAT TIERS
// ----------------------------------------------------------------------------
console.log('\n━━━ SUITE B: SINGLE TP ACROSS ALL PREDIKAT TIERS ━━━');

// B1: Single TP score 100 (Tier A)
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa B1', [
    { kode: 'TP 1', deskripsi: 'Materi B1', score: 100 }
  ]);
  assertCheck(
    'Single TP Tiers',
    'B1: Score 100 yields Sangat Baik (A) with mastery narrative',
    res.nilaiRapor === 100 &&
      res.predikat === 'Sangat Baik (A)' &&
      res.deskripsiCapaian.includes('Menunjukkan penguasaan yang sangat baik') &&
      res.deskripsiCapaian.includes('Materi B1'),
    `Got: ${JSON.stringify(res)}`
  );
}

// B2: Single TP score 80 (Tier B)
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa B2', [
    { kode: 'TP 1', deskripsi: 'Materi B2', score: 80 }
  ]);
  assertCheck(
    'Single TP Tiers',
    'B2: Score 80 yields Baik (B) with single-TP mastery narrative',
    res.nilaiRapor === 80 &&
      res.predikat === 'Baik (B)' &&
      res.deskripsiCapaian.includes('Menunjukkan penguasaan yang sangat baik') &&
      res.deskripsiCapaian.includes('Materi B2'),
    `Got: ${JSON.stringify(res)}`
  );
}

// B3: Single TP score 70 (Tier C)
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa B3', [
    { kode: 'TP 1', deskripsi: 'Materi B3', score: 70 }
  ]);
  assertCheck(
    'Single TP Tiers',
    'B3: Score 70 yields Cukup (C) with single-TP mastery narrative',
    res.nilaiRapor === 70 &&
      res.predikat === 'Cukup (C)' &&
      res.deskripsiCapaian.includes('Menunjukkan penguasaan yang sangat baik') &&
      res.deskripsiCapaian.includes('Materi B3'),
    `Got: ${JSON.stringify(res)}`
  );
}

// B4: Single TP score 69.9 (Tier C with score < 70)
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa B4', [
    { kode: 'TP 1', deskripsi: 'Materi B4', score: 69.9 }
  ]);
  assertCheck(
    'Single TP Tiers',
    'B4: Score 69.9 yields Cukup (C) and remedial guidance narrative (due to < 70 rule)',
    res.nilaiRapor === 69.9 &&
      res.predikat === 'Cukup (C)' &&
      res.deskripsiCapaian.includes('Perlu bimbingan dan pendampingan lebih lanjut') &&
      !res.deskripsiCapaian.includes('penguasaan yang sangat baik'),
    `Got: ${JSON.stringify(res)}`
  );
}

// B5: Single TP score 64.9 (Tier D / < 65)
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa B5', [
    { kode: 'TP 1', deskripsi: 'Materi B5', score: 64.9 }
  ]);
  assertCheck(
    'Single TP Tiers',
    'B5: Score 64.9 yields Perlu Bimbingan (D) and remedial guidance narrative',
    res.nilaiRapor === 64.9 &&
      res.predikat === 'Perlu Bimbingan (D)' &&
      res.deskripsiCapaian.includes('Perlu bimbingan dan pendampingan lebih lanjut') &&
      !res.deskripsiCapaian.includes('penguasaan yang sangat baik'),
    `Got: ${JSON.stringify(res)}`
  );
}

// ----------------------------------------------------------------------------
// SUITE C: PREDIKAT AND BADGE BOUNDARY PRECISION
// ----------------------------------------------------------------------------
console.log('\n━━━ SUITE C: PREDIKAT AND BADGE BOUNDARY PRECISION ━━━');

const boundaries = [
  { score: 85.0, expPred: 'Sangat Baik (A)', expBadge: 'bg-green-100 text-green-800' },
  { score: 84.9, expPred: 'Baik (B)', expBadge: 'bg-blue-100 text-blue-800' },
  { score: 75.0, expPred: 'Baik (B)', expBadge: 'bg-blue-100 text-blue-800' },
  { score: 74.9, expPred: 'Cukup (C)', expBadge: 'bg-yellow-100 text-yellow-800' },
  { score: 65.0, expPred: 'Cukup (C)', expBadge: 'bg-yellow-100 text-yellow-800' },
  { score: 64.9, expPred: 'Perlu Bimbingan (D)', expBadge: 'bg-red-100 text-red-800' }
];

boundaries.forEach((b, idx) => {
  const res = generateKurikulumMerdekaDeskripsi(`Boundary C${idx}`, [
    { kode: 'TP 1', deskripsi: 'Desk', score: b.score }
  ]);
  assertCheck(
    'Predikat Precision',
    `C${idx + 1}: Score ${b.score} accurately maps to ${b.expPred}`,
    res.predikat === b.expPred && res.predikatBadge.includes(b.expBadge),
    `Score ${b.score} gave predikat '${res.predikat}', badge '${res.predikatBadge}'`
  );
});

// ----------------------------------------------------------------------------
// SUITE D: TIE LOGIC AND OXYMORON IMMUNITY
// ----------------------------------------------------------------------------
console.log('\n━━━ SUITE D: TIE LOGIC AND OXYMORON IMMUNITY ━━━');

// D1: Flat ties across 3 TPs in Baik range [78, 78, 78]
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa D1', [
    { kode: 'TP 1', deskripsi: 'Matematika Aljabar', score: 78 },
    { kode: 'TP 2', deskripsi: 'Matematika Geometri', score: 78 },
    { kode: 'TP 3', deskripsi: 'Matematika Statistika', score: 78 }
  ]);
  assertCheck(
    'Tie Logic',
    'D1: 3-way tie [78, 78, 78] emits "penguasaan yang baik dan merata" without remedial penalization',
    res.deskripsiCapaian.includes('penguasaan yang baik dan merata') &&
      !res.deskripsiCapaian.includes('perlu bimbingan dan peningkatan'),
    `Narrative: "${res.deskripsiCapaian}"`
  );
}

// D2: Identical descriptions across 2 TPs with slightly differing scores [82, 80]
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa D2', [
    { kode: 'TP 1', deskripsi: 'konsep gelombang elektromagnetik', score: 82 },
    { kode: 'TP 2', deskripsi: 'konsep gelombang elektromagnetik', score: 80 }
  ]);
  const hasContradiction =
    res.deskripsiCapaian.includes('penguasaan yang baik dalam konsep gelombang elektromagnetik') &&
    res.deskripsiCapaian.includes('perlu bimbingan dan peningkatan dalam konsep gelombang elektromagnetik');
  assertCheck(
    'Tie Logic',
    'D2: Identical descriptions with differing scores triggers description-tie fallback avoiding direct oxymoron',
    !hasContradiction && res.deskripsiCapaian.includes('penguasaan yang baik dan merata'),
    `Narrative: "${res.deskripsiCapaian}"`
  );
}

// D3: Lowest tie [90, 75, 75]
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa D3', [
    { kode: 'TP 1', deskripsi: 'Materi Utama', score: 90 },
    { kode: 'TP 2', deskripsi: 'Materi Bantuan A', score: 75 },
    { kode: 'TP 3', deskripsi: 'Materi Bantuan B', score: 75 }
  ]);
  assertCheck(
    'Tie Logic',
    'D3: Lowest tie [90, 75, 75] correctly identifies highest score 90 and lowest score 75',
    res.highestTp?.score === 90 &&
      res.lowestTp?.score === 75 &&
      res.deskripsiCapaian.includes('Materi Utama') &&
      (res.deskripsiCapaian.includes('Materi Bantuan A') || res.deskripsiCapaian.includes('Materi Bantuan B')),
    `Narrative: "${res.deskripsiCapaian}"`
  );
}

// ----------------------------------------------------------------------------
// SUITE E: SANITIZATION, WHITESPACE, DANGLING PREPOSITIONS & INJECTIONS
// ----------------------------------------------------------------------------
console.log('\n━━━ SUITE E: SANITIZATION & STRING INTEGRITY ━━━');

// E1: Whitespace-only descriptions fall back to kode
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa E1', [
    { kode: 'TP-101', deskripsi: '   \t  \n  ', score: 88 },
    { kode: 'TP-102', deskripsi: '        ', score: 68 }
  ]);
  assertCheck(
    'Sanitization',
    'E1: Whitespace-only descriptions cleanly fall back to kode (TP-101 and TP-102)',
    res.deskripsiCapaian.includes('TP-101') && res.deskripsiCapaian.includes('TP-102'),
    `Narrative: "${res.deskripsiCapaian}"`
  );
}

// E2: Missing deskripsi and missing kode fall back to "capaian pembelajaran"
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa E2', [
    { kode: '', deskripsi: '', score: 85 },
    { kode: '   ', deskripsi: '   ', score: 85 }
  ]);
  assertCheck(
    'Sanitization',
    'E2: Completely empty kode and deskripsi fall back to generic "capaian pembelajaran" without "dalam ,"',
    res.deskripsiCapaian.includes('dalam capaian pembelajaran') &&
      !res.deskripsiCapaian.includes('dalam ,') &&
      !res.deskripsiCapaian.includes('dalam .'),
    `Narrative: "${res.deskripsiCapaian}"`
  );
}

// E3: Special characters, HTML tags, and punctuation in description
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa E3', [
    { kode: 'TP 1', deskripsi: 'persamaan kuadrat: ax^2 + bx + c = 0 & rumus ABC', score: 92 },
    { kode: 'TP 2', deskripsi: '<script>alert("xss")</script> pemfaktoran', score: 62 }
  ]);
  assertCheck(
    'Sanitization',
    'E3: Mathematical notation and HTML-like strings preserved cleanly without corruption',
    res.deskripsiCapaian.includes('persamaan kuadrat: ax^2 + bx + c = 0 & rumus ABC') &&
      res.deskripsiCapaian.includes('<script>alert("xss")</script> pemfaktoran'),
    `Narrative: "${res.deskripsiCapaian}"`
  );
}

// ----------------------------------------------------------------------------
// SUITE F: EXTREME FUZZING & CLAMPING
// ----------------------------------------------------------------------------
console.log('\n━━━ SUITE F: EXTREME SCORE FUZZING & CLAMPING ━━━');

// F1: Wild out-of-range clamping (-999 and 9999)
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa F1', [
    { kode: 'TP 1', deskripsi: 'Materi Bawah', score: -999 },
    { kode: 'TP 2', deskripsi: 'Materi Atas', score: 9999 }
  ]);
  // Clamped: TP 1 -> 0, TP 2 -> 100. Average: (0 + 100) / 2 = 50.0
  assertCheck(
    'Extreme Clamping',
    'F1: Scores -999 and 9999 are clamped to [0, 100] resulting in average 50.0 and Perlu Bimbingan (D)',
    res.nilaiRapor === 50.0 &&
      res.highestTp?.score === 100 &&
      res.lowestTp?.score === 0 &&
      res.predikat === 'Perlu Bimbingan (D)',
    `Got: ${JSON.stringify(res)}`
  );
}

// F2: String numbers with decimals and whitespace ("  88.4  ", " 71.6 ")
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa F2', [
    { kode: 'TP 1', deskripsi: 'Materi A', score: '  88.4  ' as any },
    { kode: 'TP 2', deskripsi: 'Materi B', score: ' 71.6 ' as any }
  ]);
  // Average: (88.4 + 71.6) / 2 = 160 / 2 = 80.0
  assertCheck(
    'String Fuzzing',
    'F2: String scores with whitespace parsed as valid numbers with accurate average 80.0',
    res.nilaiRapor === 80.0 && res.predikat === 'Baik (B)',
    `Got: ${JSON.stringify(res)}`
  );
}

// F3: Scientific notation string ("1e2" -> 100)
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa F3', [
    { kode: 'TP 1', deskripsi: 'Materi Sci', score: '1e2' as any }
  ]);
  assertCheck(
    'String Fuzzing',
    'F3: Scientific notation string "1e2" parses to 100 and yields Sangat Baik (A)',
    res.nilaiRapor === 100 && res.predikat === 'Sangat Baik (A)',
    `Got: ${JSON.stringify(res)}`
  );
}

// F4: Infinity and -Infinity filtering
{
  const res = generateKurikulumMerdekaDeskripsi('Siswa F4', [
    { kode: 'TP 1', deskripsi: 'Materi Inf', score: Infinity },
    { kode: 'TP 2', deskripsi: 'Materi NegInf', score: -Infinity },
    { kode: 'TP 3', deskripsi: 'Materi Real', score: 85 }
  ]);
  assertCheck(
    'Finiteness',
    'F4: Infinity and -Infinity are filtered out, using only real finite scores (85)',
    res.nilaiRapor === 85 && res.highestTp?.kode === 'TP 3' && res.lowestTp?.kode === 'TP 3',
    `Got: ${JSON.stringify(res)}`
  );
}

// ----------------------------------------------------------------------------
// SUITE G: LARGE SCALE STRESS HARNESS (100 TPs)
// ----------------------------------------------------------------------------
console.log('\n━━━ SUITE G: LARGE SCALE STRESS HARNESS (100 TPs) ━━━');

{
  const count = 100;
  const hundredTps = Array.from({ length: count }, (_, i) => ({
    kode: `TP-${i + 1}`,
    deskripsi: `kompetensi bidang kejuruan tahap ${i + 1}`,
    score: 50 + ((i * 13) % 51) // scores between 50 and 100
  }));

  const expectedSum = hundredTps.reduce((acc, t) => acc + t.score, 0);
  const expectedAvg = parseFloat((expectedSum / count).toFixed(1));
  const expectedMax = Math.max(...hundredTps.map((t) => t.score));
  const expectedMin = Math.min(...hundredTps.map((t) => t.score));

  const start = performance.now();
  const res = generateKurikulumMerdekaDeskripsi('Siswa 100TP', hundredTps);
  const elapsed = performance.now() - start;

  assertCheck(
    'Large Scale',
    'G1: 100 TPs processes accurately in sub-millisecond time with exact extrema and average',
    res.nilaiRapor === expectedAvg &&
      res.highestTp?.score === expectedMax &&
      res.lowestTp?.score === expectedMin &&
      elapsed < 100, // well under 100ms
    `Elapsed: ${elapsed.toFixed(2)}ms, Avg: ${res.nilaiRapor} (exp: ${expectedAvg})`
  );
}

// ----------------------------------------------------------------------------
// SUMMARY & EXIT
// ----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`EXTENDED ADVERSARIAL CHECKS: ${total}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL EXTENDED ADVERSARIAL PERMUTATIONS PASSED EMPIRICALLY!');
}
