/**
 * Automated Test Suite for Offline AI Assistant & FAQ Knowledge Base
 * Run command: npx tsx tests/ai_assistant_faq.test.ts
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  FAQ_ITEMS,
  MENU_CATEGORIES,
  tokenize,
  normalizeQuery,
  calculateMatchScore,
  findBestAnswers,
  getContextSuggestions,
  getFallbackResponse,
  MIN_MATCH_SCORE_THRESHOLD,
  AIAssistant
} from '../src/components/AIAssistant';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log(' RUNNING AI ASSISTANT & FAQ MATCHER TEST SUITE');
  console.log('====================================================\n');

  // 1. Knowledge Base Size & Count Verification
  console.log('Test Group 1: Knowledge Base Capacity & Schema');
  assert(
    FAQ_ITEMS.length >= 30,
    `FAQ items count should be at least 30 (found: ${FAQ_ITEMS.length})`
  );
  assert(
    FAQ_ITEMS.length >= 42,
    `FAQ items count should meet or exceed 42 cataloged items (found: ${FAQ_ITEMS.length})`
  );

  const ids = new Set<string>();
  let allValid = true;
  for (const item of FAQ_ITEMS) {
    if (!item.id || ids.has(item.id)) {
      allValid = false;
      console.error(`Duplicate or empty id: ${item.id}`);
    }
    ids.add(item.id);

    if (!item.question || !item.question.trim().endsWith('?')) {
      allValid = false;
      console.error(`Question missing or does not end with '?': ${item.id} -> ${item.question}`);
    }
    if (!item.answer || item.answer.trim().length < 25) {
      allValid = false;
      console.error(`Answer too short: ${item.id}`);
    }
    if (!item.keywords || item.keywords.length < 2) {
      allValid = false;
      console.error(`Insufficient keywords: ${item.id}`);
    }
    if (!item.relatedViews || item.relatedViews.length === 0) {
      allValid = false;
      console.error(`Missing relatedViews: ${item.id}`);
    }
    if (!item.category) {
      allValid = false;
      console.error(`Missing category: ${item.id}`);
    }
  }
  assert(allValid, 'Every FAQ item adheres to the strict schema contract');

  // 2. Full 19 Menu Views Coverage
  console.log('\nTest Group 2: Full 19 Menu Coverage');
  const REQUIRED_19_MENUS = [
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

  const coveredViews = new Set<string>();
  for (const item of FAQ_ITEMS) {
    for (const v of item.relatedViews) {
      coveredViews.add(v);
    }
  }

  let allMenusCovered = true;
  for (const viewId of REQUIRED_19_MENUS) {
    const isCovered = coveredViews.has(viewId);
    if (!isCovered) {
      allMenusCovered = false;
      console.error(`Uncovered view: ${viewId}`);
    }
  }
  assert(allMenusCovered, 'All 19 main menus are covered by FAQ items in relatedViews');
  assert(
    MENU_CATEGORIES.length >= 19,
    `Menu categories metadata covers all 19 views (found: ${MENU_CATEGORIES.length})`
  );

  // 3. Tokenizer & Normalizer
  console.log('\nTest Group 3: Tokenizer & Normalization');
  const tokens = tokenize('Bagaimana cara Presensi Datang & Pulang di SIPJAM?');
  assert(
    tokens.includes('bagaimana') &&
    tokens.includes('cara') &&
    tokens.includes('presensi') &&
    tokens.includes('datang') &&
    tokens.includes('pulang'),
    'Tokenizer extracts lowercase alphanumeric tokens correctly'
  );

  const normalized = normalizeQuery('  CARA MENGISI JURNAL KBM!  ');
  assert(
    normalized === 'cara mengisi jurnal kbm',
    `Normalizer strips punctuation and trims excess spaces: "${normalized}"`
  );

  // 4. Keyword & Question Matcher Accuracy
  console.log('\nTest Group 4: Search Matching Accuracy');

  const presensiResults = findBestAnswers('bagaimana cara melakukan presensi datang');
  assert(
    presensiResults.length > 0 && presensiResults[0].id === 'faq-presensi-1',
    'Query "bagaimana cara melakukan presensi datang" matches faq-presensi-1'
  );

  const terkunciResults = findBestAnswers('mengapa tombol presensi pulang terkunci');
  assert(
    terkunciResults.length > 0 && terkunciResults[0].id === 'faq-presensi-2',
    'Query "mengapa tombol presensi pulang terkunci" matches faq-presensi-2'
  );

  const piketResults = findBestAnswers('laporan piket harian');
  assert(
    piketResults.length > 0 && piketResults[0].id.startsWith('faq-piket'),
    'Query "laporan piket harian" matches piket FAQ'
  );

  const gradebookResults = findBestAnswers('cara input nilai formatif dan sumatif');
  assert(
    gradebookResults.length > 0 && gradebookResults[0].id === 'faq-gradebook-1',
    'Query "cara input nilai formatif dan sumatif" matches faq-gradebook-1'
  );

  const excelResults = findBestAnswers('ekspor daftar nilai ke excel');
  assert(
    excelResults.length > 0 && excelResults[0].id === 'faq-gradebook-2',
    'Query "ekspor daftar nilai ke excel" matches faq-gradebook-2'
  );

  const verifResults = findBestAnswers('setujui tolak izin sakit guru');
  assert(
    verifResults.length > 0 && verifResults[0].id === 'faq-verif-1',
    'Query "setujui tolak izin sakit guru" matches faq-verif-1'
  );

  // 5. Context-Aware Score Boost (+15 Points)
  console.log('\nTest Group 5: Context-Aware Score Boost (+15 Points)');
  const targetItem = FAQ_ITEMS.find(i => i.id === 'faq-blok-2')!;
  const scoreWithoutContext = calculateMatchScore(targetItem, 'jadwal pelajaran database', 'view-guru-presensi');
  const scoreWithContext = calculateMatchScore(targetItem, 'jadwal pelajaran database', 'view-sistem-blok');

  assert(
    scoreWithContext - scoreWithoutContext === 15,
    `Context boost is strictly +15 points (without: ${scoreWithoutContext}, with: ${scoreWithContext})`
  );

  // 6. Context-Aware Search Prioritization
  console.log('\nTest Group 6: Search Context Prioritization');
  // Both faq-jurnal-1 and faq-rekap-jurnal-1 deal with jurnal
  const answersInJurnalView = findBestAnswers('cetak laporan jurnal', 'view-guru-rekap-jurnal');
  assert(
    answersInJurnalView.length > 0 && answersInJurnalView[0].id === 'faq-rekap-jurnal-1',
    'Context boost prioritizes faq-rekap-jurnal-1 when currentView is view-guru-rekap-jurnal'
  );

  // 7. Fallback Response Generator
  console.log('\nTest Group 7: Friendly Fallback & Menu Categories');
  const nonsenseQuery = 'resep membuat martabak manis keju spesial 99';
  const noMatches = findBestAnswers(nonsenseQuery);
  assert(
    noMatches.length === 0,
    'Unrelated nonsense query yields 0 matches below threshold'
  );

  const fallback = getFallbackResponse(nonsenseQuery, 'view-guru-presensi');
  assert(
    fallback.message.includes('Maaf, saya belum menemukan jawaban yang sesuai'),
    'Fallback response contains polite Indonesian apology message'
  );
  assert(
    fallback.categories.length >= 19,
    `Fallback includes all available categories (${fallback.categories.length} categories provided)`
  );
  assert(
    fallback.suggestions.length >= 2,
    `Fallback includes context suggestions (${fallback.suggestions.length} suggestions provided)`
  );

  // 8. Context Suggestions per View
  console.log('\nTest Group 8: Context Suggestions Generator');
  const piketSuggestions = getContextSuggestions('view-piket', 3);
  assert(
    piketSuggestions.length >= 2 && piketSuggestions.some(s => s.relatedViews.includes('view-piket')),
    'getContextSuggestions for view-piket provides piket-related questions'
  );

  const verifSuggestions = getContextSuggestions('view-admin-verif', 3);
  assert(
    verifSuggestions.length >= 2 && verifSuggestions.some(s => s.relatedViews.includes('view-admin-verif')),
    'getContextSuggestions for view-admin-verif provides verif-related questions'
  );

  // 9. Pure Offline & Zero External API Calls Attestation
  console.log('\nTest Group 9: Offline Purity Check');
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  // Replace fetch with sentinel to verify zero network requests
  globalThis.fetch = (() => {
    fetchCalled = true;
    throw new Error('NETWORK CALL DETECTED: AI Assistant must be 100% offline!');
  }) as any;

  try {
    findBestAnswers('presensi datang');
    findBestAnswers('jurnal mengajar');
    findBestAnswers('random query');
    getContextSuggestions('view-home');
    getFallbackResponse('test');
    assert(!fetchCalled, 'Zero network or fetch calls occurred during search operations');
  } finally {
    globalThis.fetch = originalFetch;
  }

  // 10. SSR Component Rendering Test
  console.log('\nTest Group 10: Component SSR Rendering');
  try {
    const html = renderToString(
      React.createElement(AIAssistant, {
        currentView: 'view-home',
        user: { nama: 'Fitra Nizam', role: 'guru' }
      })
    );

    assert(
      html.includes('data-tour="ai-assistant-btn"'),
      'Rendered HTML includes data-tour="ai-assistant-btn" attribute'
    );
    assert(
      html.includes('fa-robot') || html.includes('fa-wand-magic-sparkles'),
      'Rendered HTML includes Font Awesome robot icon'
    );
  } catch (err: any) {
    assert(false, 'Component SSR render failed', err?.message);
  }

  console.log('\n====================================================');
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('✨ ALL AI ASSISTANT FAQ TESTS PASSED SUCCESSFULLY! ✨\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
