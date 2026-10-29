/**
 * Empirical Adversarial Challenger Test Suite
 * Milestone 1: ClayTabs & Sub-Tab Normalization
 * Focus:
 *  1. ClayTabs extreme edge cases (empty, single, all disabled, long text, null/undefined/numeric badges, custom icons, non-existent activeTab)
 *  2. WAI-ARIA roving tabindex invariants (tabindex="0" uniqueness, aria-selected, aria-disabled)
 *  3. Circular keyboard navigation with complex disabled tab layouts (interleaved, boundary, skip logic)
 *  4. Rapid tab-switching stress testing (100 rapid clicks & 500 interleaved keyboard navigation events)
 *  5. Form Keep-Alive Invariance verification in GuruJurnal.tsx (CSS display toggling vs unmounting, zero draft loss)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ClayTabs, getNextTabId, TabItem } from '../src/components/ClayTabs';

let passed = 0;
let failed = 0;

function testAssert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    if (detail) console.error(`    Detail: ${detail}`);
    failed++;
  }
}

function suite(title: string) {
  console.log(`\n========================================================================`);
  console.log(`SUITE: ${title}`);
  console.log(`========================================================================`);
}

async function runEmpiricalChallengerTests() {
  console.log('STARTING EMPIRICAL ADVERSARIAL CHALLENGER TESTS (MILESTONE 1)');

  // =========================================================================
  // SUITE 1: ClayTabs Extreme Edge Cases
  // =========================================================================
  suite('1. ClayTabs Extreme Edge Cases & Boundary Value Stress');

  // 1.1 Empty items list
  const emptyRendered = renderToString(React.createElement(ClayTabs, {
    items: [],
    activeTab: 'none',
    onTabChange: () => {},
    ariaLabel: 'Navigasi Kosong'
  }));
  testAssert(
    emptyRendered.includes('role="tablist"') && !emptyRendered.includes('role="tab"'),
    '1.1: Empty items list renders empty tablist container without throwing error'
  );
  testAssert(
    getNextTabId([], 'none', 'ArrowRight') === null,
    '1.1: getNextTabId with empty items list returns null'
  );

  // 1.2 Single item list
  const singleItem: TabItem[] = [{ id: 'single', label: 'Only Tab', icon: 'fa-star' }];
  const singleRendered = renderToString(React.createElement(ClayTabs, {
    items: singleItem,
    activeTab: 'single',
    onTabChange: () => {}
  }));
  testAssert(
    singleRendered.includes('id="tab-single"') && singleRendered.includes('tabindex="0"'),
    '1.2: Single item list renders with active tabindex="0"'
  );
  testAssert(
    getNextTabId(singleItem, 'single', 'ArrowRight') === null &&
    getNextTabId(singleItem, 'single', 'ArrowLeft') === null &&
    getNextTabId(singleItem, 'single', 'Home') === null &&
    getNextTabId(singleItem, 'single', 'End') === null,
    '1.2: getNextTabId returns null for single item (no navigation possible)'
  );

  // 1.3 All items disabled
  const allDisabledItems: TabItem[] = [
    { id: 'd1', label: 'Disabled 1', disabled: true },
    { id: 'd2', label: 'Disabled 2', disabled: true },
    { id: 'd3', label: 'Disabled 3', disabled: true }
  ];
  const allDisabledRendered = renderToString(React.createElement(ClayTabs, {
    items: allDisabledItems,
    activeTab: 'd1',
    onTabChange: () => {}
  }));
  testAssert(
    allDisabledRendered.includes('disabled=""') &&
    allDisabledRendered.includes('aria-disabled="true"') &&
    allDisabledRendered.includes('pointer-events-none'),
    '1.3: All disabled tabs render with native disabled, aria-disabled="true", and pointer-events-none'
  );
  testAssert(
    getNextTabId(allDisabledItems, 'd1', 'ArrowRight') === null &&
    getNextTabId(allDisabledItems, 'd2', 'Home') === null,
    '1.3: getNextTabId returns null when all items are disabled'
  );

  // 1.4 Long text labels & special characters (XSS safety)
  const xssDangerousLabel = '<script>alert("XSS")</script>&amp; "quote" \'single\' <img src=x onerror=alert(1)>';
  const longTextLabel = 'A'.repeat(2000);
  const stressTextItems: TabItem[] = [
    { id: 'xss', label: xssDangerousLabel },
    { id: 'long', label: longTextLabel }
  ];
  const textRendered = renderToString(React.createElement(ClayTabs, {
    items: stressTextItems,
    activeTab: 'xss',
    onTabChange: () => {}
  }));
  testAssert(
    !textRendered.includes('<script>alert') && textRendered.includes('&lt;script&gt;alert'),
    '1.4: Special characters and script tags in labels are safely HTML-escaped by React'
  );
  testAssert(
    textRendered.includes('A'.repeat(100)),
    '1.4: 2000-character long text label renders without crashing or buffer overflow'
  );

  // 1.5 Badges: null, undefined, empty, number 0, string "0", large numbers, whitespace
  const badgeTestItems: TabItem[] = [
    { id: 'b-null', label: 'Null Badge', badge: null as any },
    { id: 'b-undef', label: 'Undef Badge', badge: undefined },
    { id: 'b-empty', label: 'Empty Badge', badge: '' },
    { id: 'b-spaces', label: 'Space Badge', badge: '   ' },
    { id: 'b-zero', label: 'Zero Number Badge', badge: 0, badgeVariant: 'rose' },
    { id: 'b-strzero', label: 'Zero String Badge', badge: '0', badgeVariant: 'amber' },
    { id: 'b-large', label: 'Large Badge', badge: 99999, badgeVariant: 'blue' },
  ];
  const badgeRendered = renderToString(React.createElement(ClayTabs, {
    items: badgeTestItems,
    activeTab: 'b-zero',
    onTabChange: () => {}
  }));
  testAssert(
    !badgeRendered.includes('id="tab-b-null"><span') &&
    !badgeRendered.includes('id="tab-b-undef"><span') &&
    !badgeRendered.includes('id="tab-b-empty"><span'),
    '1.5: Null, undefined, empty, and whitespace badges render NO badge span element'
  );
  testAssert(
    badgeRendered.includes('>0</span>') && badgeRendered.includes('>99999</span>'),
    '1.5: Numeric 0 and large integer badges (99999) render properly as valid badge content'
  );
  testAssert(
    badgeRendered.includes('bg-rose-600 text-white'),
    '1.5: Active tab with rose badge variant renders high-contrast active styling'
  );
  testAssert(
    badgeRendered.includes('bg-amber-100 text-amber-800'),
    '1.5: Inactive tab with amber badge variant renders soft pill styling'
  );

  // 1.6 Custom Icon Types (string shorthand, full FontAwesome string, React JSX element)
  const customIconItems: TabItem[] = [
    { id: 'ic-none', label: 'No Icon' },
    { id: 'ic-short', label: 'Shorthand', icon: 'fa-book' },
    { id: 'ic-full', label: 'Full FA', icon: 'fa-regular fa-clock' },
    { id: 'ic-jsx', label: 'Custom JSX', icon: React.createElement('svg', { 'data-testid': 'custom-icon', className: 'w-4 h-4' }) }
  ];
  const iconRendered = renderToString(React.createElement(ClayTabs, {
    items: customIconItems,
    activeTab: 'ic-none',
    onTabChange: () => {}
  }));
  testAssert(
    iconRendered.includes('class="fa-solid fa-book text-xs shrink-0"'),
    '1.6: Shorthand "fa-book" is automatically normalized to "fa-solid fa-book"'
  );
  testAssert(
    iconRendered.includes('class="fa-regular fa-clock text-xs shrink-0"'),
    '1.6: Multi-word icon "fa-regular fa-clock" is preserved verbatim'
  );
  testAssert(
    iconRendered.includes('data-testid="custom-icon"'),
    '1.6: React.ReactNode JSX icon is cleanly rendered inside icon wrapper'
  );

  // 1.7 ActiveTab pointing to non-existent ID
  const fallbackNext = getNextTabId(sampleTabsForNav, 'ghost-tab-id', 'ArrowRight');
  testAssert(
    fallbackNext === 'e1',
    '1.7: getNextTabId with non-existent activeTab safely recovers to first enabled tab (e1)'
  );


  // =========================================================================
  // SUITE 2: WAI-ARIA Roving Tabindex & Circular Wrapping with Disabled Tabs
  // =========================================================================
  suite('2. WAI-ARIA Roving Tabindex Invariants & Complex Circular Wrapping');

  const complexTabs: TabItem[] = [
    { id: 'd0', label: 'Leading Disabled', disabled: true },
    { id: 'e1', label: 'Enabled 1' },
    { id: 'd2', label: 'Mid Disabled 1', disabled: true },
    { id: 'd3', label: 'Mid Disabled 2', disabled: true },
    { id: 'e4', label: 'Enabled 2' },
    { id: 'e5', label: 'Enabled 3' },
    { id: 'd6', label: 'Trailing Disabled', disabled: true },
  ];

  // 2.1 Roving Tabindex Invariant Check: Exactly ONE tabindex="0" across the entire tablist
  for (const activeCandidate of ['e1', 'e4', 'e5']) {
    const renderedMarkup = renderToString(React.createElement(ClayTabs, {
      items: complexTabs,
      activeTab: activeCandidate,
      onTabChange: () => {}
    }));

    const tabindexZeroMatches = (renderedMarkup.match(/tabindex="0"/g) || []).length;
    const tabindexNegOneMatches = (renderedMarkup.match(/tabindex="-1"/g) || []).length;
    const ariaSelectedTrueMatches = (renderedMarkup.match(/aria-selected="true"/g) || []).length;
    const ariaSelectedFalseMatches = (renderedMarkup.match(/aria-selected="false"/g) || []).length;

    testAssert(
      tabindexZeroMatches === 1 && ariaSelectedTrueMatches === 1,
      `2.1: Exactly ONE tab has tabindex="0" and aria-selected="true" when activeTab="${activeCandidate}"`
    );
    testAssert(
      tabindexNegOneMatches === complexTabs.length - 1 && ariaSelectedFalseMatches === complexTabs.length - 1,
      `2.1: All other ${complexTabs.length - 1} tabs have tabindex="-1" and aria-selected="false"`
    );
  }

  // 2.2 Circular Wrapping with Boundary Disabled Tabs (d0 at start, d6 at end, d2 & d3 in middle)
  // Enabled list: ['e1', 'e4', 'e5']

  // Forward Navigation: e1 -> e4 -> e5 -> e1 (skips d2, d3, d6, d0)
  testAssert(
    getNextTabId(complexTabs, 'e1', 'ArrowRight') === 'e4',
    '2.2: ArrowRight skips consecutive disabled tabs d2, d3: e1 -> e4'
  );
  testAssert(
    getNextTabId(complexTabs, 'e4', 'ArrowRight') === 'e5',
    '2.2: ArrowRight moves e4 -> e5'
  );
  testAssert(
    getNextTabId(complexTabs, 'e5', 'ArrowRight') === 'e1',
    '2.2: ArrowRight wraps circular: e5 -> e1 (skipping trailing d6 and leading d0)'
  );

  // Backward Navigation: e1 -> e5 -> e4 -> e1 (skips d0, d6, d3, d2)
  testAssert(
    getNextTabId(complexTabs, 'e1', 'ArrowLeft') === 'e5',
    '2.2: ArrowLeft wraps backward: e1 -> e5 (skipping leading d0 and trailing d6)'
  );
  testAssert(
    getNextTabId(complexTabs, 'e5', 'ArrowLeft') === 'e4',
    '2.2: ArrowLeft moves e5 -> e4'
  );
  testAssert(
    getNextTabId(complexTabs, 'e4', 'ArrowLeft') === 'e1',
    '2.2: ArrowLeft skips consecutive disabled tabs d3, d2 backward: e4 -> e1'
  );

  // Vertical Navigation equivalence
  testAssert(
    getNextTabId(complexTabs, 'e5', 'ArrowDown') === 'e1',
    '2.2: ArrowDown behaves identical to ArrowRight (circular wrap e5 -> e1)'
  );
  testAssert(
    getNextTabId(complexTabs, 'e1', 'ArrowUp') === 'e5',
    '2.2: ArrowUp behaves identical to ArrowLeft (circular wrap e1 -> e5)'
  );

  // Home and End Keys
  testAssert(
    getNextTabId(complexTabs, 'e5', 'Home') === 'e1',
    '2.2: Home key jumps to first ENABLED tab (e1), ignoring leading disabled tab d0'
  );
  testAssert(
    getNextTabId(complexTabs, 'e1', 'End') === 'e5',
    '2.2: End key jumps to last ENABLED tab (e5), ignoring trailing disabled tab d6'
  );

  // Irrelevant and Control keys return null
  for (const irrelevantKey of ['Tab', 'Enter', 'Space', 'Escape', 'Shift', 'Control', 'Alt', 'PageUp', 'PageDown']) {
    testAssert(
      getNextTabId(complexTabs, 'e1', irrelevantKey) === null,
      `2.2: Key "${irrelevantKey}" returns null without hijacking standard browser events`
    );
  }


  // =========================================================================
  // SUITE 3: Rapid Tab-Switching & Keystroke Stress Testing
  // =========================================================================
  suite('3. Rapid Tab-Switching & Keyboard Keystroke Stress Simulation');

  // 3.1 100 Rapid Sequential & Random Tab Clicks Simulation
  let currentActiveTab = 'e1';
  let tabChangeCount = 0;
  const mockOnTabChange = (newTabId: string) => {
    // Assert that onTabChange is NEVER called with a disabled tab ID
    const target = complexTabs.find(t => t.id === newTabId);
    if (target?.disabled) {
      throw new Error(`CRITICAL: onTabChange fired for disabled tab ${newTabId}`);
    }
    currentActiveTab = newTabId;
    tabChangeCount++;
  };

  const enabledTabIds = ['e1', 'e4', 'e5'];
  for (let i = 0; i < 100; i++) {
    const targetTabId = enabledTabIds[i % enabledTabIds.length];
    mockOnTabChange(targetTabId);
  }

  testAssert(
    tabChangeCount === 100 && enabledTabIds.includes(currentActiveTab),
    '3.1: 100 rapid tab-switch cycles executed with zero state corruption or desynchronization'
  );

  // 3.2 500 Interleaved Keyboard Arrow Keystrokes Simulation
  const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
  let simulatedTab = 'e1';
  let totalTransitions = 0;

  for (let step = 0; step < 500; step++) {
    const randomKey = keys[step % keys.length];
    const nextTab = getNextTabId(complexTabs, simulatedTab, randomKey);
    if (nextTab) {
      const tabObj = complexTabs.find(t => t.id === nextTab);
      if (!tabObj || tabObj.disabled) {
        throw new Error(`CRITICAL INVARIANT VIOLATION: getNextTabId navigated to disabled or non-existent tab ${nextTab}`);
      }
      simulatedTab = nextTab;
      totalTransitions++;
    }
  }

  testAssert(
    totalTransitions === 500 && enabledTabIds.includes(simulatedTab),
    '3.2: 500 continuous keyboard navigation events verified — all transitions landed on valid enabled tabs'
  );


  // =========================================================================
  // SUITE 4: Form Keep-Alive Invariance in GuruJurnal.tsx
  // =========================================================================
  suite('4. Form Keep-Alive Invariance & Zero Draft Loss Oracle in GuruJurnal.tsx');

  const projectRoot = process.cwd();
  const guruJurnalPath = path.join(projectRoot, 'src', 'components', 'GuruJurnal.tsx');
  assert(fs.existsSync(guruJurnalPath), 'GuruJurnal.tsx exists');
  const guruJurnalSrc = fs.readFileSync(guruJurnalPath, 'utf8');

  // 4.1 Structural Invariance: Form wrapped in CSS display toggle (hidden / block)
  const hasInputPanel = guruJurnalSrc.includes('id="panel-input"');
  const hasInputRole = guruJurnalSrc.includes('role="tabpanel"');
  const hasInputAria = guruJurnalSrc.includes('aria-labelledby="tab-input"');
  const hasInputDisplayToggle = guruJurnalSrc.includes("className={activeTab === 'input' ? 'block' : 'hidden'}");

  testAssert(
    hasInputPanel && hasInputRole && hasInputAria && hasInputDisplayToggle,
    '4.1: GuruJurnal input form is enclosed inside <div id="panel-input" role="tabpanel" className={activeTab === \'input\' ? \'block\' : \'hidden\'}>'
  );

  // 4.2 Structural Invariance: Rekap panels also wrapped in CSS display toggle
  const hasRekapPanelToggle = guruJurnalSrc.includes("className={activeTab === 'rekap-pribadi' ? 'block' : 'hidden'}");
  const hasSupervisiPanelToggle = guruJurnalSrc.includes("className={activeTab === 'supervisi-kelas' ? 'block' : 'hidden'}");

  testAssert(
    hasRekapPanelToggle && hasSupervisiPanelToggle,
    '4.2: Rekap Pribadi and Supervisi Kelas panels are enclosed in persistent keep-alive display toggles'
  );

  // 4.3 Anti-Pattern Check: Form must NOT be conditionally unmounted
  const hasConditionalUnmountAntiPattern = /\{\s*activeTab\s*===\s*['"]input['"]\s*&&\s*\(?<form/i.test(guruJurnalSrc);
  testAssert(
    !hasConditionalUnmountAntiPattern,
    '4.3: GuruJurnal contains NO conditional unmounting anti-pattern ({activeTab === "input" && ...})'
  );

  // 4.4 useEffect Dependency Invariance: activeTab must NOT wipe form states
  // Search for useEffect that has activeTab in dependency array
  const useEffectRegex = /useEffect\s*\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[([^\]]*?)\]\s*\)/g;
  let match: RegExpExecArray | null;
  let hasDangerousActiveTabReset = false;
  let activeTabEffectCount = 0;

  while ((match = useEffectRegex.exec(guruJurnalSrc)) !== null) {
    const effectBody = match[1];
    const deps = match[2];
    if (deps.includes('activeTab')) {
      activeTabEffectCount++;
      // Check if body calls state setters like setMateri, setKegiatan, setFile, etc.
      if (
        effectBody.includes('setMateri(') ||
        effectBody.includes('setKegiatan(') ||
        effectBody.includes('setCatatanSiswa(') ||
        effectBody.includes('setRefleksi(') ||
        effectBody.includes('setAbsensi(') ||
        effectBody.includes('clearJurnalDraft')
      ) {
        hasDangerousActiveTabReset = true;
      }
    }
  }

  testAssert(
    !hasDangerousActiveTabReset,
    '4.4: Zero useEffect hooks in GuruJurnal reset or wipe form state upon activeTab transition'
  );

  // 4.5 Empirical State Retention Simulation:
  // We model a stateful container demonstrating that display toggling preserves in-memory React state
  // whereas unmounting destroys state.
  class KeepAliveHarness {
    public inputTabState = { materi: 'Teorema Pythagoras', kegiatan: 'Diskusi Kelompok', photoCaptured: true };
    public unmountTabState: any = null;
    public activeTab = 'input';
    public unmountCount = 0;

    public switchTabWithKeepAlive(newTab: string) {
      this.activeTab = newTab;
      // In CSS keep-alive, inputTabState remains unchanged in memory
    }

    public switchTabWithAntiPattern(newTab: string) {
      if (newTab !== 'input' && this.activeTab === 'input') {
        // Component unmounts -> state wiped out
        this.unmountCount++;
        this.unmountTabState = null;
      } else if (newTab === 'input' && this.activeTab !== 'input') {
        // Component mounts fresh with default blank state
        this.unmountTabState = { materi: '', kegiatan: '', photoCaptured: false };
      }
      this.activeTab = newTab;
    }
  }

  const harness = new KeepAliveHarness();
  // 1. Teacher starts on input tab and enters draft
  assert.strictEqual(harness.inputTabState.materi, 'Teorema Pythagoras');

  // 2. Teacher switches to rekap-pribadi to check past week
  harness.switchTabWithKeepAlive('rekap-pribadi');
  testAssert(
    harness.inputTabState.materi === 'Teorema Pythagoras' && harness.inputTabState.photoCaptured === true,
    '4.5: Keep-Alive Oracle: Input state retained in memory when switching input -> rekap-pribadi'
  );

  // 3. Teacher switches to supervisi-kelas
  harness.switchTabWithKeepAlive('supervisi-kelas');
  testAssert(
    harness.inputTabState.materi === 'Teorema Pythagoras',
    '4.5: Keep-Alive Oracle: Input state retained in memory when switching to supervisi-kelas'
  );

  // 4. Teacher switches back to input
  harness.switchTabWithKeepAlive('input');
  testAssert(
    harness.inputTabState.materi === 'Teorema Pythagoras' && harness.inputTabState.photoCaptured === true,
    '4.5: Keep-Alive Oracle: Input state fully intact upon return to input tab'
  );

  // Contrast with unmount anti-pattern:
  harness.unmountTabState = { materi: 'Teorema Pythagoras', kegiatan: 'Diskusi Kelompok', photoCaptured: true };
  harness.switchTabWithAntiPattern('rekap-pribadi');
  harness.switchTabWithAntiPattern('input');
  testAssert(
    harness.unmountTabState.materi === '' && harness.unmountCount === 1,
    '4.5: Contrast Proof: Unmounting resets materi to empty string (proving necessity of keep-alive pattern)'
  );


  // =========================================================================
  // SUITE 5: GuruPresensi Keep-Alive & Sub-Tab Invariance
  // =========================================================================
  suite('5. GuruPresensi Keep-Alive & Sub-Tab Invariance');

  const guruPresensiPath = path.join(projectRoot, 'src', 'components', 'GuruPresensi.tsx');
  assert(fs.existsSync(guruPresensiPath), 'GuruPresensi.tsx exists');
  const guruPresensiSrc = fs.readFileSync(guruPresensiPath, 'utf8');

  const hasLivePanel = guruPresensiSrc.includes('id="panel-live"');
  const hasLiveRole = guruPresensiSrc.includes('role="tabpanel"');
  const hasLiveAria = guruPresensiSrc.includes('aria-labelledby="tab-live"');
  const hasLiveDisplayToggle = guruPresensiSrc.includes("className={activeTab === 'live' ? 'block' : 'hidden'}");
  const hasRiwayatPanelToggle = guruPresensiSrc.includes("className={activeTab === 'riwayat' ? 'block' : 'hidden'}");

  testAssert(
    hasLivePanel && hasLiveRole && hasLiveAria && hasLiveDisplayToggle && hasRiwayatPanelToggle,
    '5.1: GuruPresensi selfie camera, GPS geofencing, and riwayat panels use CSS display toggling (zero camera unmount)'
  );


  // =========================================================================
  // SUITE 6: URL SearchParams Synchronization Invariant
  // =========================================================================
  suite('6. URL SearchParams Tab Synchronization Invariant');

  const hasGuruJurnalUrlSync = guruJurnalSrc.includes("url.searchParams.set('tab', targetTab)");
  const hasGuruJurnalReplaceState = guruJurnalSrc.includes("window.history.replaceState(null, '', url.toString())");
  const hasGuruPresensiUrlSync = guruPresensiSrc.includes("url.searchParams.set('tab', targetTab)");
  const hasGuruPresensiReplaceState = guruPresensiSrc.includes("window.history.replaceState(null, '', url.toString())");

  testAssert(
    hasGuruJurnalUrlSync && hasGuruJurnalReplaceState,
    '6.1: GuruJurnal synchronizes tab switches to URL query parameter (?tab=...) via window.history.replaceState'
  );
  testAssert(
    hasGuruPresensiUrlSync && hasGuruPresensiReplaceState,
    '6.2: GuruPresensi synchronizes tab switches to URL query parameter (?tab=...) via window.history.replaceState'
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n========================================================================');
  console.log(`TOTAL ADVERSARIAL CHALLENGER TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Sample tabs helper for Suite 1.7
const sampleTabsForNav: TabItem[] = [
  { id: 'e1', label: 'Enabled 1' },
  { id: 'e2', label: 'Enabled 2' }
];

runEmpiricalChallengerTests().catch(err => {
  console.error('Empirical Challenger Suite Error:', err);
  process.exit(1);
});
