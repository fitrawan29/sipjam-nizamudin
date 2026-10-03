/**
 * ADVERSARIAL TEST SUITE - AIAssistant & FAQ Matcher
 * Empirical Challenger 1
 * 
 * Verifies:
 * 1. Extreme inputs (empty, whitespace, 1000+ chars, SQLi, XSS, pure emojis, random punctuation)
 * 2. Case sensitivity and Indonesian accent normalization
 * 3. Context boost accuracy and page disambiguation (guru rekap vs admin rekap)
 * 4. Fallback response robustness and schema integrity
 * 5. Performance benchmark (< 5ms per query across 1000 runs)
 * 6. Knowledge base integrity invariants (all 44 items, 19 views)
 * 7. SSR rendering and XSS escaping verification
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  FAQ_ITEMS,
  MENU_CATEGORIES,
  FAQItem
} from '../src/components/AIAssistant/knowledgeBase';
import {
  tokenize,
  normalizeQuery,
  calculateMatchScore,
  findBestAnswers,
  getContextSuggestions,
  getFallbackResponse,
  MIN_MATCH_SCORE_THRESHOLD
} from '../src/components/AIAssistant/faqMatcher';
import { AIAssistant } from '../src/components/AIAssistant/AIAssistant';

let passed = 0;
let failed = 0;
const testResults: Array<{ section: string; name: string; status: 'PASS' | 'FAIL'; detail?: string }> = [];

function record(section: string, name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    testResults.push({ section, name, status: 'PASS' });
    console.log(`  [PASS] [${section}] ${name}`);
  } else {
    failed++;
    testResults.push({ section, name, status: 'FAIL', detail });
    console.error(`  [FAIL] [${section}] ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function runAdversarialSuite() {
  console.log('================================================================');
  console.log('  CHALLENGER 1: ADVERSARIAL & EMPIRICAL STRESS TEST SUITE');
  console.log('  Testing: faqMatcher.ts, knowledgeBase.ts, AIAssistant.tsx');
  console.log('================================================================\n');

  // ==========================================================================
  // SECTION 1: EXTREME INPUTS & INJECTION RESISTANCE
  // ==========================================================================
  console.log('--- Section 1: Extreme Inputs & Injection Resistance ---');

  // 1.1 Empty query
  const emptyRes = findBestAnswers('');
  record('ExtremeInputs', 'Empty query returns empty array', emptyRes.length === 0);

  // 1.2 Whitespace only
  const wsQueries = ['   ', '\t\t\n\r', '    \n   \t  '];
  for (const ws of wsQueries) {
    const wsRes = findBestAnswers(ws);
    record('ExtremeInputs', `Whitespace query "${encodeURI(ws)}" returns empty array`, wsRes.length === 0);
  }

  // 1.3 Extremely long query (1000+ chars with repetitive keywords)
  const longKeywordQuery = 'presensi datang sekolah selfie gps '.repeat(150); // ~5400 chars
  const t0 = performance.now();
  const longRes = findBestAnswers(longKeywordQuery);
  const tLong = performance.now() - t0;
  record('ExtremeInputs', '1000+ chars repeated keywords query completes without crashing', longRes.length > 0);
  record('ExtremeInputs', `1000+ chars repeated keywords latency < 20ms (${tLong.toFixed(2)}ms)`, tLong < 20);

  // 1.4 Extremely long query (1000+ chars gibberish)
  const longGibberish = 'xyzqwklnmvb '.repeat(120); // ~1440 chars
  const gibRes = findBestAnswers(longGibberish);
  record('ExtremeInputs', '1000+ chars gibberish returns 0 matches without crashing', gibRes.length === 0);

  // 1.5 10,000 chars buffer stress
  const superLong = 'a'.repeat(10000);
  const superLongRes = findBestAnswers(superLong);
  record('ExtremeInputs', '10,000 chars single token completes safely with 0 matches', superLongRes.length === 0);

  // 1.6 SQL Injection payloads
  const sqliPayloads = [
    "' OR '1'='1",
    "' OR 1=1 --",
    "'; DROP TABLE users; --",
    "UNION SELECT null, username, password FROM users--",
    "1' ORDER BY 1--+",
    "admin' --",
    "1; EXEC xp_cmdshell('dir')"
  ];
  for (const sqli of sqliPayloads) {
    try {
      const sqliRes = findBestAnswers(sqli);
      record('ExtremeInputs', `SQLi payload safely handled: ${sqli}`, Array.isArray(sqliRes));
    } catch (err: any) {
      record('ExtremeInputs', `SQLi payload threw error: ${sqli}`, false, err.message);
    }
  }

  // 1.7 XSS & HTML Injection payloads
  const xssPayloads = [
    "<script>alert('xss')</script>",
    "<img src=x onerror=alert(1)>",
    "<svg onload=alert(document.cookie)>",
    "<iframe src=\"javascript:alert(1)\">",
    "<body onload=alert('xss')>",
    "\"><script>alert(1)</script>",
    "<a href=\"javascript:void(0)\" onclick=\"steal()\">Click</a>"
  ];
  for (const xss of xssPayloads) {
    try {
      const xssRes = findBestAnswers(xss);
      record('ExtremeInputs', `XSS payload safely parsed without execution: ${xss}`, Array.isArray(xssRes));
    } catch (err: any) {
      record('ExtremeInputs', `XSS payload threw error: ${xss}`, false, err.message);
    }
  }

  // 1.8 Command & Template injection payloads
  const cmdPayloads = [
    "${7*7}",
    "{{7*7}}",
    "<%= 7*7 %>",
    "$(whoami)",
    "`id`",
    "| cat /etc/passwd"
  ];
  for (const cmd of cmdPayloads) {
    try {
      const cmdRes = findBestAnswers(cmd);
      record('ExtremeInputs', `Template/cmd injection safely handled: ${cmd}`, Array.isArray(cmdRes));
    } catch (err: any) {
      record('ExtremeInputs', `Template/cmd injection threw error: ${cmd}`, false, err.message);
    }
  }

  // 1.9 Pure Emojis
  const emojiQueries = [
    "😀🎉🚀💻🔥👍❓🙏",
    "❓",
    "✨💡📝",
    "👨‍👩‍👧‍👦"
  ];
  for (const em of emojiQueries) {
    try {
      const emRes = findBestAnswers(em);
      record('ExtremeInputs', `Pure emoji query handled safely: ${em}`, Array.isArray(emRes));
    } catch (err: any) {
      record('ExtremeInputs', `Pure emoji query threw error: ${em}`, false, err.message);
    }
  }

  // 1.10 Random Punctuation & Special Symbols
  const punctuationQueries = [
    "!@#$%^&*()_+-=[]{}|;':\",./<>?",
    "~`!@#$%^&*()_+=-[]{}\\|;:'\",.<>/?\n\t",
    "\u0000\u0001\u0002\u0003\u0004", // Control chars
    "\u200B\u200C\u200D\uFEFF" // Zero-width spaces
  ];
  for (const p of punctuationQueries) {
    try {
      const pRes = findBestAnswers(p);
      record('ExtremeInputs', 'Random punctuation/control chars query handled safely', Array.isArray(pRes));
    } catch (err: any) {
      record('ExtremeInputs', 'Random punctuation threw error', false, err.message);
    }
  }

  // ==========================================================================
  // SECTION 2: CASE SENSITIVITY & INDONESIAN ACCENT NORMALIZATION
  // ==========================================================================
  console.log('\n--- Section 2: Case Sensitivity & Indonesian Accent Normalization ---');

  // 2.1 Case Sensitivity Invariance
  const baselineQuery = 'bagaimana cara melakukan presensi datang';
  const baselineMatches = findBestAnswers(baselineQuery);
  const baselineId = baselineMatches[0]?.id;
  const baselineScore = baselineMatches[0]?.score;

  const upperQuery = 'BAGAIMANA CARA MELAKUKAN PRESENSI DATANG';
  const upperMatches = findBestAnswers(upperQuery);
  record(
    'CaseSensitivity',
    'UPPERCASE query produces identical top match',
    upperMatches[0]?.id === baselineId
  );
  record(
    'CaseSensitivity',
    'UPPERCASE query produces identical match score',
    upperMatches[0]?.score === baselineScore
  );

  const mixedQuery = 'BaGaiMaNa cArA MeLaKuKan PreSenSi DaTang';
  const mixedMatches = findBestAnswers(mixedQuery);
  record(
    'CaseSensitivity',
    'MixedCase query produces identical top match',
    mixedMatches[0]?.id === baselineId
  );
  record(
    'CaseSensitivity',
    'MixedCase query produces identical match score',
    mixedMatches[0]?.score === baselineScore
  );

  const invertedQuery = 'bAGAIMANA cARA mELAKUKAN pRESENSI dATANG';
  const invertedMatches = findBestAnswers(invertedQuery);
  record(
    'CaseSensitivity',
    'Inverted case query produces identical top match',
    invertedMatches[0]?.id === baselineId
  );

  // 2.2 Indonesian Accent / Diacritics Normalization Analysis
  // Standard Indonesian (EYD V) has no diacritics. However, testing multi-word and single-word accented queries:
  const accentedQuery1 = 'bagaimana cara melakukan presènsi datang';
  const accentedMatches1 = findBestAnswers(accentedQuery1);
  record(
    'AccentNormalization',
    'Accented word in compound query ("presènsi datang") matches target FAQ via surrounding tokens',
    accentedMatches1.length > 0 && accentedMatches1[0].id === baselineId
  );

  const singleAccented = 'presènsi';
  const singleAccentedMatches = findBestAnswers(singleAccented);
  // Verify safe degradation to fallback when single accented word does not match ASCII keywords:
  const fallbackSingleAccented = getFallbackResponse(singleAccented);
  record(
    'AccentNormalization',
    'Single accented query executes without error and yields valid fallback response',
    Array.isArray(singleAccentedMatches) && fallbackSingleAccented.message.length > 0
  );

  // ==========================================================================
  // SECTION 3: CONTEXT BOOST ACCURACY & DISAMBIGUATION
  // ==========================================================================
  console.log('\n--- Section 3: Context Boost Accuracy & Disambiguation ---');

  // 3.1 Guru Rekap vs Admin Rekap disambiguation on query 'rekap'
  // When currentView is 'view-guru-rekap-jurnal', guru FAQ must win!
  // When currentView is 'view-admin-rekap', admin FAQ must win!
  const queryRekap = 'rekap';
  const guruRekapMatches = findBestAnswers(queryRekap, 'view-guru-rekap-jurnal');
  const adminRekapMatches = findBestAnswers(queryRekap, 'view-admin-rekap');

  record(
    'ContextBoost',
    'Query "rekap" in view-guru-rekap-jurnal returns guru rekap FAQ as #1',
    guruRekapMatches.length > 0 && guruRekapMatches[0].relatedViews.includes('view-guru-rekap-jurnal')
  );
  record(
    'ContextBoost',
    'Query "rekap" in view-admin-rekap returns admin rekap FAQ as #1',
    adminRekapMatches.length > 0 && adminRekapMatches[0].relatedViews.includes('view-admin-rekap')
  );

  // 3.2 Specific phrase "cetak rekap bulanan" disambiguation
  const queryCetak = 'cetak rekap bulanan';
  const guruCetakMatches = findBestAnswers(queryCetak, 'view-guru-rekap-jurnal');
  const adminCetakMatches = findBestAnswers(queryCetak, 'view-admin-rekap');

  record(
    'ContextBoost',
    'Query "cetak rekap bulanan" in view-guru-rekap-jurnal ranks faq-rekap-jurnal-1 as #1',
    guruCetakMatches[0]?.id === 'faq-rekap-jurnal-1'
  );
  record(
    'ContextBoost',
    'Query "cetak rekap bulanan" in view-admin-rekap ranks faq-admin-rekap-1 as #1',
    adminCetakMatches[0]?.id === 'faq-admin-rekap-1'
  );

  // 3.3 Score comparison: context boost flips ranking between guru rekap and admin rekap
  const guruScoreInGuruView = calculateMatchScore(guruCetakMatches[0], queryCetak, 'view-guru-rekap-jurnal');
  const guruScoreInAdminView = calculateMatchScore(guruCetakMatches[0], queryCetak, 'view-admin-rekap');
  const adminScoreInGuruView = calculateMatchScore(adminCetakMatches[0], queryCetak, 'view-guru-rekap-jurnal');
  const adminScoreInAdminView = calculateMatchScore(adminCetakMatches[0], queryCetak, 'view-admin-rekap');

  record(
    'ContextBoost',
    'Guru rekap score is higher in view-guru-rekap-jurnal than in view-admin-rekap',
    guruScoreInGuruView > guruScoreInAdminView
  );
  record(
    'ContextBoost',
    'Admin rekap score is higher in view-admin-rekap than in view-guru-rekap-jurnal',
    adminScoreInAdminView > adminScoreInGuruView
  );

  // 3.4 Context Boost Invariant (+15 strictly) across all 44 items
  let allBoostsExact = true;
  for (const item of FAQ_ITEMS) {
    const matchingView = item.relatedViews[0];
    const scoreWith = calculateMatchScore(item, 'laporan data sistem', matchingView);
    const scoreWithout = calculateMatchScore(item, 'laporan data sistem', 'view-unrelated-random');
    if (scoreWith - scoreWithout !== 15) {
      allBoostsExact = false;
      console.error(`Item ${item.id} boost mismatch: with=${scoreWith}, without=${scoreWithout}`);
    }
  }
  record(
    'ContextBoost',
    'Context boost is mathematically invariant (+15 pts) across all 44 FAQ items',
    allBoostsExact
  );

  // ==========================================================================
  // SECTION 4: FALLBACK ROBUSTNESS & SUGGESTIONS
  // ==========================================================================
  console.log('\n--- Section 4: Fallback Robustness & Suggestions ---');

  const fallbackQueries = [
    'resep membuat martabak manis keju spesial',
    'xyzrandomnonsense12345',
    '!@#$%^&*()_+',
    '',
    '   ',
    'who is the president of indonesia 1945'
  ];

  for (const fq of fallbackQueries) {
    const fb = getFallbackResponse(fq, 'view-guru-presensi');
    const msgValid = typeof fb.message === 'string' && fb.message.length > 25;
    const catValid = Array.isArray(fb.categories) && fb.categories.length >= 19;
    const sugValid = Array.isArray(fb.suggestions) && fb.suggestions.length > 0;
    const sugSchemaValid = fb.suggestions.every(
      s => s.id && s.question && s.answer && Array.isArray(s.keywords) && Array.isArray(s.relatedViews)
    );

    record(
      'FallbackRobustness',
      `Fallback response valid for "${fq.slice(0, 20)}": msg=${msgValid}, cats=${fb.categories.length}, sugs=${fb.suggestions.length}`,
      msgValid && catValid && sugValid && sugSchemaValid
    );
  }

  // Fallback with undefined currentView
  const fbNoView = getFallbackResponse('pertanyaan aneh', undefined);
  record(
    'FallbackRobustness',
    'Fallback response handles undefined currentView gracefully',
    fbNoView.suggestions.length > 0 && fbNoView.categories.length >= 19
  );

  // Context suggestions generator invariant
  const knownViews = [
    'view-home',
    'view-guru-presensi',
    'view-guru-jurnal',
    'view-piket',
    'view-dokumen',
    'view-gradebook',
    'view-chat',
    'view-informasi',
    'view-history',
    'view-guru-rekap-jurnal',
    'view-rekap-siswa',
    'view-admin-verif',
    'view-sistem-blok',
    'view-jurnal-kelas',
    'view-analitik',
    'view-admin-rekap',
    'view-admin-data',
    'view-admin-backup',
    'view-admin-config'
  ];

  let allViewsHaveSuggestions = true;
  for (const v of knownViews) {
    const sugs = getContextSuggestions(v, 3);
    if (!sugs || sugs.length < 2) {
      allViewsHaveSuggestions = false;
      console.error(`View ${v} returned insufficient suggestions: ${sugs?.length}`);
    }
  }
  record(
    'FallbackRobustness',
    'Every one of the 19 main views yields valid context suggestions (>= 2 items)',
    allViewsHaveSuggestions
  );

  // ==========================================================================
  // SECTION 5: PERFORMANCE & LATENCY BENCHMARK
  // ==========================================================================
  console.log('\n--- Section 5: Performance & Latency Benchmark ---');

  const benchmarkQueries = [
    'presensi datang',
    'cara mengisi jurnal mengajar harian',
    'tombol presensi pulang terkunci',
    'laporan piket guru',
    'cetak rekap bulanan',
    'ekspor nilai kurikulum merdeka ke excel',
    'sistem blok jeda tengah semester',
    'reset password akun guru',
    'geofence radius gps sekolah',
    'resep martabak telur asin gurih', // fallback query
    'apa itu aplikasi sipjam',
    'lupa password login',
    'jadwal mengajar bentrok',
    'bagaimana cara mengajukan izin sakit dinas luar'
  ];

  const viewsList = [
    'view-home',
    'view-guru-presensi',
    'view-guru-jurnal',
    'view-piket',
    'view-admin-rekap',
    'view-sistem-blok',
    'view-admin-data',
    'view-admin-config'
  ];

  const ITERATIONS = 1000;
  const latencies: number[] = [];

  // Warmup run
  for (let i = 0; i < 50; i++) {
    findBestAnswers(benchmarkQueries[i % benchmarkQueries.length], viewsList[i % viewsList.length]);
  }

  // Measured run
  const benchStart = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    const q = benchmarkQueries[i % benchmarkQueries.length];
    const v = viewsList[i % viewsList.length];
    const tStart = performance.now();
    findBestAnswers(q, v, 3);
    const tEnd = performance.now();
    latencies.push(tEnd - tStart);
  }
  const benchTotal = performance.now() - benchStart;

  latencies.sort((a, b) => a - b);
  const avgLatency = benchTotal / ITERATIONS;
  const p50 = latencies[Math.floor(ITERATIONS * 0.50)];
  const p90 = latencies[Math.floor(ITERATIONS * 0.90)];
  const p95 = latencies[Math.floor(ITERATIONS * 0.95)];
  const p99 = latencies[Math.floor(ITERATIONS * 0.99)];
  const p100 = latencies[latencies.length - 1];

  console.log(`  [BENCHMARK] Total iterations: ${ITERATIONS}`);
  console.log(`  [BENCHMARK] Total time: ${benchTotal.toFixed(2)}ms`);
  console.log(`  [BENCHMARK] Average latency: ${avgLatency.toFixed(3)}ms per query`);
  console.log(`  [BENCHMARK] P50 latency: ${p50.toFixed(3)}ms`);
  console.log(`  [BENCHMARK] P90 latency: ${p90.toFixed(3)}ms`);
  console.log(`  [BENCHMARK] P95 latency: ${p95.toFixed(3)}ms`);
  console.log(`  [BENCHMARK] P99 latency: ${p99.toFixed(3)}ms`);
  console.log(`  [BENCHMARK] P100 (Max) latency: ${p100.toFixed(3)}ms`);

  record(
    'Performance',
    `Average latency across 1000 queries is < 5ms (Actual: ${avgLatency.toFixed(3)}ms)`,
    avgLatency < 5.0
  );
  record(
    'Performance',
    `Average latency is ultra-fast < 1ms (Actual: ${avgLatency.toFixed(3)}ms)`,
    avgLatency < 1.0
  );
  record(
    'Performance',
    `P99 latency is < 5ms (Actual: ${p99.toFixed(3)}ms)`,
    p99 < 5.0
  );

  // ==========================================================================
  // SECTION 6: KNOWLEDGE BASE INTEGRITY & INVARIANTS
  // ==========================================================================
  console.log('\n--- Section 6: Knowledge Base Integrity & Invariants ---');

  record('KnowledgeBase', `Total FAQ items count is 44 (Actual: ${FAQ_ITEMS.length})`, FAQ_ITEMS.length === 44);
  record('KnowledgeBase', `Total Menu Categories count is 20 (Actual: ${MENU_CATEGORIES.length})`, MENU_CATEGORIES.length === 20);

  // Check unique IDs
  const idSet = new Set<string>();
  let idsUnique = true;
  for (const item of FAQ_ITEMS) {
    if (idSet.has(item.id)) {
      idsUnique = false;
      console.error(`Duplicate FAQ ID found: ${item.id}`);
    }
    idSet.add(item.id);
  }
  record('KnowledgeBase', 'All 44 FAQ item IDs are strictly unique', idsUnique);

  // Check all questions end with '?'
  const questionsEndWithQ = FAQ_ITEMS.every(i => i.question.trim().endsWith('?'));
  record('KnowledgeBase', 'All 44 FAQ questions end with a question mark "?"', questionsEndWithQ);

  // Check all answers are substantial (> 50 chars)
  const answersSubstantial = FAQ_ITEMS.every(i => i.answer.trim().length >= 50);
  record('KnowledgeBase', 'All 44 FAQ answers contain detailed explanations (>= 50 chars)', answersSubstantial);

  // Check every item has >= 3 keywords
  const keywordsSufficient = FAQ_ITEMS.every(i => i.keywords && i.keywords.length >= 3);
  record('KnowledgeBase', 'All 44 FAQ items have at least 3 keywords for robust matching', keywordsSufficient);

  // Check all relatedViews match valid MENU_CATEGORIES viewIds
  const validViewIds = new Set(MENU_CATEGORIES.map(c => c.viewId));
  const relatedViewsValid = FAQ_ITEMS.every(
    item => item.relatedViews && item.relatedViews.length > 0 && item.relatedViews.every(v => validViewIds.has(v))
  );
  record('KnowledgeBase', 'All relatedViews references point to valid system viewIds', relatedViewsValid);

  // Check that every one of the 19 distinct menus is referenced in at least 1 FAQ
  const menuViews = [
    'view-home',
    'view-guru-presensi',
    'view-guru-jurnal',
    'view-piket',
    'view-dokumen',
    'view-gradebook',
    'view-chat',
    'view-informasi',
    'view-history',
    'view-guru-rekap-jurnal',
    'view-rekap-siswa',
    'view-admin-verif',
    'view-sistem-blok',
    'view-jurnal-kelas',
    'view-analitik',
    'view-admin-rekap',
    'view-admin-data',
    'view-admin-backup',
    'view-admin-config'
  ];
  const coveredViewIds = new Set(FAQ_ITEMS.flatMap(i => i.relatedViews));
  const all19Covered = menuViews.every(v => coveredViewIds.has(v));
  record('KnowledgeBase', 'All 19 main menu views have corresponding FAQ coverage', all19Covered);

  // ==========================================================================
  // SECTION 7: AIAssistant COMPONENT SSR & XSS ESCAPING VERIFICATION
  // ==========================================================================
  console.log('\n--- Section 7: AIAssistant Component SSR & XSS Escaping Verification ---');

  // 7.1 Normal Render
  try {
    const normalHtml = renderToString(
      React.createElement(AIAssistant, {
        currentView: 'view-home',
        user: { nama: 'Fitra Nizam', role: 'guru' }
      })
    );
    record('SSRRender', 'AIAssistant renders successfully via SSR', normalHtml.length > 0);
    record(
      'SSRRender',
      'AIAssistant has data-tour="ai-assistant-btn" attribute',
      normalHtml.includes('data-tour="ai-assistant-btn"')
    );
  } catch (err: any) {
    record('SSRRender', 'AIAssistant SSR threw error', false, err.message);
  }

  // 7.2 XSS Safety Verification in React JSX Message Rendering
  try {
    const rawXssPayload = "<script>alert('xss')</script>";
    const fallbackResponse = getFallbackResponse(rawXssPayload);
    // Simulate rendering the fallback message in React
    const renderedMsgHtml = renderToString(
      React.createElement('p', { className: 'whitespace-pre-line' }, fallbackResponse.message)
    );
    record(
      'SSRRender',
      'XSS query embedded in fallback message is strictly escaped by React (&lt;script&gt;)',
      renderedMsgHtml.includes('&lt;script&gt;') && !renderedMsgHtml.includes('<script>')
    );
  } catch (err: any) {
    record('SSRRender', 'XSS escaping test threw error', false, err.message);
  }

  // 7.3 Unknown viewId & Null user handling
  try {
    const edgeHtml = renderToString(
      React.createElement(AIAssistant, {
        currentView: 'view-unknown-arbitrary-999',
        user: null
      })
    );
    record('SSRRender', 'AIAssistant renders safely with unknown viewId and null user', edgeHtml.length > 0);
    record('SSRRender', 'Floating trigger button rendered properly under edge props', edgeHtml.includes('fa-robot') || edgeHtml.includes('fa-wand-magic-sparkles'));
  } catch (err: any) {
    record('SSRRender', 'Edge props render threw error', false, err.message);
  }

  // ==========================================================================
  // FINAL SUMMARY & VERDICT
  // ==========================================================================
  console.log('\n================================================================');
  console.log(` ADVERSARIAL TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    console.error('\n❌ EMPIRICAL VERDICT: REJECT (Failures detected in test suite)');
    process.exit(1);
  } else {
    console.log('\n✅ EMPIRICAL VERDICT: APPROVE');
    console.log('All adversarial stress tests, disambiguation checks, invariants, and performance benchmarks passed!\n');
    process.exit(0);
  }
}

runAdversarialSuite().catch(err => {
  console.error('Fatal unhandled error in adversarial suite:', err);
  process.exit(1);
});
