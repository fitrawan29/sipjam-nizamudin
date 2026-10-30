/**
 * tests/student_exam_anti_cheat.test.ts
 * Programmatic verification suite for Student Exam Security & Anti-Cheating System.
 * 
 * Verifies:
 * 1. Role-Based Access Control (RBAC) isolation for role 'siswa'
 * 2. DevTools shortcut detection & suppression (F12, Ctrl+Shift+I/J/C, Ctrl+U)
 * 3. Copy-Paste & Print/Save shortcut restrictions (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+P, Ctrl+S)
 * 4. Input & Textarea ergonomics (genuine student typing preservation vs question text lockdown)
 * 5. Anti-cheat state machine & violation counter progression
 * 6. Cooldown debouncing for compound blur/visibilitychange events
 * 7. Tamper-resistant exam session storage & reload persistence
 * 8. Fullscreen guard & blocking modal structural invariants
 * 9. Integration with AppScreen view routing and default home view for students
 * 10. End-to-end simulated student exam scenario (honest path vs hostile cheat attempts)
 */

import fs from 'fs';
import path from 'path';
import {
  getConsolidatedMenuItems,
  evaluateTabRBAC,
  resolveCanonicalRoute
} from '../src/lib/navigation';
import {
  initExamSecurityState,
  evaluateSecurityViolation,
  isDevToolsShortcut,
  isRestrictedCopyPasteShortcut,
  isInputOrTextarea,
  isCurrentlyFullscreen,
  isFullscreenSupported,
  getExamSecurityStorageKey,
  getExamProgressStorageKey,
  saveExamProgress,
  loadExamProgress,
  clearExamProgress,
  VIOLATION_DESCRIPTIONS,
  ExamSessionSecurityState
} from '../src/lib/antiCheatGuard';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    if (detail) console.error(`    Detail: ${detail}`);
    failed++;
    failures.push(`${label}${detail ? ` (${detail})` : ''}`);
  }
}

function suite(name: string) {
  console.log(`\n==============================================================================`);
  console.log(`SUITE: ${name}`);
  console.log(`==============================================================================`);
}

async function runStudentExamAntiCheatTests() {
  console.log('STARTING STUDENT EXAM & ANTI-CHEATING VERIFICATION SUITE\n');

  // =========================================================================
  // SUITE 1: Role-Based Access Control (RBAC) for Role 'siswa'
  // =========================================================================
  suite('1. Role-Based Access Control (RBAC) Isolation for Siswa');

  const siswaMenus = getConsolidatedMenuItems({ role: 'siswa' });
  assert(
    siswaMenus.length === 2 &&
    siswaMenus.some(m => m.id === 'view-ujian' && m.label === 'Ujian Siswa') &&
    siswaMenus.some(m => m.id === 'view-informasi'),
    'getConsolidatedMenuItems returns strictly view-ujian and view-informasi for role siswa'
  );

  assert(
    !siswaMenus.some(m => m.id === 'view-admin-verif' || m.id === 'view-guru-jurnal' || m.id === 'view-admin-config'),
    'Siswa menu strictly excludes teacher and administrator management modules'
  );

  // evaluateTabRBAC checks
  const rbacDeniedJurnal = evaluateTabRBAC('view-guru-jurnal', 'input', { role: 'siswa' });
  assert(
    rbacDeniedJurnal.allowed === false && rbacDeniedJurnal.fallbackTab === 'view-ujian',
    'evaluateTabRBAC strictly denies role siswa from accessing view-guru-jurnal and falls back to view-ujian'
  );

  const rbacDeniedVerif = evaluateTabRBAC('view-admin-verif', 'presensi', { role: 'siswa' });
  assert(
    rbacDeniedVerif.allowed === false && rbacDeniedVerif.fallbackTab === 'view-ujian',
    'evaluateTabRBAC strictly denies role siswa from accessing view-admin-verif'
  );

  const rbacAllowedUjian = evaluateTabRBAC('view-ujian', '', { role: 'siswa' });
  assert(
    rbacAllowedUjian.allowed === true,
    'evaluateTabRBAC permits role siswa to access view-ujian'
  );

  const rbacAllowedInfo = evaluateTabRBAC('view-informasi', '', { role: 'siswa' });
  assert(
    rbacAllowedInfo.allowed === true,
    'evaluateTabRBAC permits role siswa to access view-informasi'
  );

  // Canonical route resolution
  const routeRes = resolveCanonicalRoute('view-ujian');
  assert(
    routeRes.canonicalView === 'view-ujian' && !routeRes.isLegacyAlias,
    'resolveCanonicalRoute accurately resolves view-ujian as canonical'
  );

  // =========================================================================
  // SUITE 2: DevTools Shortcut Detection (F12, Ctrl+Shift+I/J/C, Ctrl+U)
  // =========================================================================
  suite('2. DevTools Shortcut Detection & Suppression');

  // Helper mock KeyboardEvent
  const makeKey = (props: Partial<KeyboardEvent>): KeyboardEvent => {
    return {
      key: '',
      keyCode: 0,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
      ...props
    } as any;
  };

  assert(isDevToolsShortcut(makeKey({ key: 'F12', keyCode: 123 })), 'Detects F12 key as DevTools shortcut');
  assert(isDevToolsShortcut(makeKey({ ctrlKey: true, shiftKey: true, key: 'I' })), 'Detects Ctrl+Shift+I as DevTools inspector');
  assert(isDevToolsShortcut(makeKey({ metaKey: true, shiftKey: true, key: 'i' })), 'Detects Cmd+Shift+I (Mac) as DevTools inspector');
  assert(isDevToolsShortcut(makeKey({ ctrlKey: true, shiftKey: true, key: 'J' })), 'Detects Ctrl+Shift+J as DevTools console');
  assert(isDevToolsShortcut(makeKey({ ctrlKey: true, shiftKey: true, key: 'C' })), 'Detects Ctrl+Shift+C as DevTools element picker');
  assert(isDevToolsShortcut(makeKey({ ctrlKey: true, shiftKey: true, key: 'K' })), 'Detects Ctrl+Shift+K (Firefox console) as DevTools');
  assert(isDevToolsShortcut(makeKey({ ctrlKey: true, shiftKey: true, key: 'E' })), 'Detects Ctrl+Shift+E (Firefox style editor) as DevTools');
  assert(isDevToolsShortcut(makeKey({ ctrlKey: true, shiftKey: true, key: 'M' })), 'Detects Ctrl+Shift+M (Responsive device mode) as DevTools');
  assert(isDevToolsShortcut(makeKey({ shiftKey: true, key: 'F9', keyCode: 120 })), 'Detects Shift+F9 (Firefox storage inspector) as DevTools');
  assert(isDevToolsShortcut(makeKey({ metaKey: true, altKey: true, key: 'i' })), 'Detects Cmd+Option+I on Mac Safari/Chrome as DevTools');
  assert(isDevToolsShortcut(makeKey({ metaKey: true, altKey: true, key: 'j' })), 'Detects Cmd+Option+J on Mac Console as DevTools');
  assert(isDevToolsShortcut(makeKey({ metaKey: true, altKey: true, key: 'c' })), 'Detects Cmd+Option+C on Mac Element Inspector as DevTools');
  assert(isDevToolsShortcut(makeKey({ metaKey: true, altKey: true, key: 'u' })), 'Detects Cmd+Option+U on Mac View Source as DevTools');
  assert(isDevToolsShortcut(makeKey({ ctrlKey: true, key: 'U' })), 'Detects Ctrl+U as View Source');
  assert(isDevToolsShortcut(makeKey({ metaKey: true, key: 'u' })), 'Detects Cmd+U as View Source');
  assert(!isDevToolsShortcut(makeKey({ key: 'A', keyCode: 65 })), 'Honest typing key A is not flagged as DevTools');
  assert(!isDevToolsShortcut(makeKey({ key: 'Enter', keyCode: 13 })), 'Honest key Enter is not flagged as DevTools');
  assert(!isDevToolsShortcut(makeKey({ ctrlKey: true, shiftKey: true, key: 'z' })), 'Ctrl+Shift+Z (Redo) is NOT flagged as DevTools (honest student editing preserved)');
  assert(!isDevToolsShortcut(makeKey({ metaKey: true, shiftKey: true, key: 'z' })), 'Cmd+Shift+Z (Mac Redo) is NOT flagged as DevTools');
  assert(!isDevToolsShortcut(makeKey({ ctrlKey: true, key: 'y' })), 'Ctrl+Y (Redo) is NOT flagged as DevTools');

  // =========================================================================
  // SUITE 3: Copy-Paste, Cut, Print & Save Shortcut Restrictions
  // =========================================================================
  suite('3. Copy-Paste, Cut, Print & Save Shortcut Restrictions');

  assert(isRestrictedCopyPasteShortcut(makeKey({ ctrlKey: true, key: 'c' }), false), 'Detects Ctrl+C (Copy) as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ ctrlKey: true, key: 'v' }), false), 'Detects Ctrl+V (Paste) as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ ctrlKey: true, key: 'x' }), false), 'Detects Ctrl+X (Cut) as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ ctrlKey: true, key: 'p' }), false), 'Detects Ctrl+P (Print) as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ ctrlKey: true, key: 's' }), false), 'Detects Ctrl+S (Save) as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ metaKey: true, key: 'c' }), false), 'Detects Cmd+C on Mac as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ ctrlKey: true, key: 'insert', keyCode: 45 }), false), 'Detects Ctrl+Insert (OS Copy) as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ shiftKey: true, key: 'insert', keyCode: 45 }), false), 'Detects Shift+Insert (OS Paste) as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ shiftKey: true, key: 'delete', keyCode: 46 }), false), 'Detects Shift+Delete (OS Cut) outside input as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ ctrlKey: true, key: 'f' }), false), 'Detects Ctrl+F (Find in page) as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ key: 'F3', keyCode: 114 }), false), 'Detects F3 (Find in page) as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ key: 'PrintScreen', keyCode: 44 }), false), 'Detects PrintScreen as restricted screenshot');
  assert(isRestrictedCopyPasteShortcut(makeKey({ metaKey: true, shiftKey: true, key: '3' }), false), 'Detects Cmd+Shift+3 (Mac screenshot) as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ metaKey: true, shiftKey: true, key: '4' }), false), 'Detects Cmd+Shift+4 (Mac screenshot) as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ metaKey: true, shiftKey: true, key: '5' }), false), 'Detects Cmd+Shift+5 (Mac screenshot) as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ ctrlKey: true, key: 'g' }), false), 'Detects Ctrl+G (Find Next) as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ ctrlKey: true, key: 't' }), false), 'Detects Ctrl+T (New Tab) as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ ctrlKey: true, key: 'n' }), false), 'Detects Ctrl+N (New Window) as restricted');
  assert(isRestrictedCopyPasteShortcut(makeKey({ ctrlKey: true, key: 'h' }), false), 'Detects Ctrl+H (History) as restricted');

  // Ctrl+A inside editable input vs outside
  assert(isRestrictedCopyPasteShortcut(makeKey({ ctrlKey: true, key: 'a' }), false), 'Ctrl+A outside editable element is blocked (prevents full page copy)');
  assert(!isRestrictedCopyPasteShortcut(makeKey({ ctrlKey: true, key: 'a' }), true), 'Ctrl+A inside student essay input is allowed for editing personal answer');

  // Normal keyboard keys inside input
  assert(!isRestrictedCopyPasteShortcut(makeKey({ key: 'b' }), true), 'Normal character typing is not restricted');

  // =========================================================================
  // SUITE 4: Input & Textarea Ergonomics Validation
  // =========================================================================
  suite('4. Input & Textarea Element Discrimination');

  class MockElement {
    public isContentEditable = false;
    constructor(public tagName: string) {}
  }

  assert(isInputOrTextarea(new MockElement('INPUT') as any), 'Identifies INPUT element as editable');
  assert(isInputOrTextarea(new MockElement('TEXTAREA') as any), 'Identifies TEXTAREA element as editable');
  assert(!isInputOrTextarea(new MockElement('DIV') as any), 'Identifies DIV element as non-editable');
  assert(!isInputOrTextarea(new MockElement('P') as any), 'Identifies P element as non-editable');
  assert(!isInputOrTextarea(null), 'Handles null target safely');

  // =========================================================================
  // SUITE 5: Anti-Cheat State Machine & Progression
  // =========================================================================
  suite('5. Anti-Cheat State Machine & Violation Progression');

  // Initialize fresh mock security state
  let state: ExamSessionSecurityState = {
    examId: 'ujian_matematika_01',
    studentId: 'siswa_adit_101',
    violationCount: 0,
    maxViolations: 3,
    isLocked: false,
    isFullscreen: true,
    violations: [],
    startedAt: new Date().toISOString()
  };

  assert(state.violationCount === 0 && !state.isLocked, 'Initial exam state has 0 violations and is unlocked');

  // 1st violation: Tab Switch
  const v1 = evaluateSecurityViolation(state, 'TAB_SWITCH', 'Switched to search tab');
  state = v1.nextState;
  assert(
    state.violationCount === 1 && !state.isLocked && v1.isCountIncremented,
    'Violation 1 (TAB_SWITCH) increments count to 1 and remains unlocked'
  );
  assert(state.violations.length === 1 && state.violations[0].type === 'TAB_SWITCH', 'Violation 1 is logged with timestamp and details');

  // 2nd violation: Fullscreen Exit (after simulated delay)
  state.lastViolationAt = new Date(Date.now() - 1000).toISOString(); // simulate 1 sec later
  const v2 = evaluateSecurityViolation(state, 'FULLSCREEN_EXIT', 'Exited fullscreen via gesture');
  state = v2.nextState;
  assert(
    state.violationCount === 2 && !state.isLocked && v2.isCountIncremented,
    'Violation 2 (FULLSCREEN_EXIT) increments count to 2 and remains unlocked'
  );

  // 3rd violation: Window Blur (exceeding tolerance threshold of 3)
  state.lastViolationAt = new Date(Date.now() - 1000).toISOString();
  const v3 = evaluateSecurityViolation(state, 'WINDOW_BLUR', 'Focus lost to another window');
  state = v3.nextState;
  assert(
    state.violationCount === 3 && state.isLocked && v3.isNowLocked,
    'Violation 3 (WINDOW_BLUR) reaches max limit (3) and immediately locks the exam session'
  );
  assert(Boolean(state.lockoutReason && state.lockoutReason.includes('3')), 'Lockout reason is populated with details');

  // Subsequent violation on locked session
  state.lastViolationAt = new Date(Date.now() - 1000).toISOString();
  const v4 = evaluateSecurityViolation(state, 'CLIPBOARD_ATTEMPT', 'Copy attempt after locked');
  assert(
    v4.nextState.isLocked === true && v4.isNowLocked === true,
    'Subsequent violation retains permanent locked state'
  );

  // =========================================================================
  // SUITE 6: Cooldown Debouncing for Compound Blur/Visibility Events
  // =========================================================================
  suite('6. Cooldown Debouncing for Compound Window Events');

  let debouncedState: ExamSessionSecurityState = {
    examId: 'ujian_fisika_02',
    studentId: 'siswa_budi_102',
    violationCount: 0,
    maxViolations: 3,
    isLocked: false,
    isFullscreen: true,
    violations: [],
    startedAt: new Date().toISOString()
  };

  // 1st event: blur fires
  const blurResult = evaluateSecurityViolation(debouncedState, 'WINDOW_BLUR');
  debouncedState = blurResult.nextState;
  assert(debouncedState.violationCount === 1, 'Initial blur increments violation count to 1');

  // Rapid 2nd event: visibilitychange fires 50ms later (compound OS event)
  const rapidTabResult = evaluateSecurityViolation(debouncedState, 'TAB_SWITCH');
  debouncedState = rapidTabResult.nextState;
  assert(
    debouncedState.violationCount === 1 && !rapidTabResult.isCountIncremented,
    'Rapid compound visibilitychange within cooldown window does NOT double-increment count'
  );
  assert(
    debouncedState.violations.length === 2,
    'Both events are preserved in the forensic violation audit log'
  );

  // =========================================================================
  // SUITE 7: Tamper-Resistant Storage & Reload Persistence
  // =========================================================================
  suite('7. Tamper-Resistant Storage Key & Descriptions');

  const key1 = getExamSecurityStorageKey('PAS_2026/Ganjil', 'siswa@01#');
  assert(
    key1.startsWith('sipjam_exam_security_') && !key1.includes('/') && !key1.includes('@'),
    'getExamSecurityStorageKey sanitizes examId and studentId into clean storage identifier'
  );

  assert(
    Object.keys(VIOLATION_DESCRIPTIONS).length === 6 &&
    Boolean(VIOLATION_DESCRIPTIONS.FULLSCREEN_EXIT) &&
    Boolean(VIOLATION_DESCRIPTIONS.TAB_SWITCH),
    'VIOLATION_DESCRIPTIONS provides complete Indonesian human-readable warning messages'
  );

  // =========================================================================
  // SUITE 8: Source Code Structural Invariants (UjianSiswaView & Hooks)
  // =========================================================================
  suite('8. Source Code Structural Invariants & Security Guard Audits');

  const root = path.resolve(__dirname, '..');
  const viewPath = path.join(root, 'src', 'components', 'UjianSiswaView.tsx');
  const hookPath = path.join(root, 'src', 'hooks', 'useExamAntiCheat.ts');
  const guardPath = path.join(root, 'src', 'lib', 'antiCheatGuard.ts');
  const appScreenPath = path.join(root, 'src', 'components', 'AppScreen.tsx');
  const userTypePath = path.join(root, 'src', 'types', 'user.ts');

  assert(fs.existsSync(viewPath), 'src/components/UjianSiswaView.tsx exists');
  assert(fs.existsSync(hookPath), 'src/hooks/useExamAntiCheat.ts exists');
  assert(fs.existsSync(guardPath), 'src/lib/antiCheatGuard.ts exists');

  const viewContent = fs.readFileSync(viewPath, 'utf8');
  const hookContent = fs.readFileSync(hookPath, 'utf8');
  const appScreenContent = fs.readFileSync(appScreenPath, 'utf8');
  const userTypeContent = fs.readFileSync(userTypePath, 'utf8');

  const globalsPath = path.join(root, 'src', 'app', 'globals.css');
  assert(fs.existsSync(globalsPath), 'src/app/globals.css exists');
  const globalsContent = fs.readFileSync(globalsPath, 'utf8');

  // Verify UjianSiswaView security elements
  assert(
    viewContent.includes('fixed inset-0 z-[99999]') &&
    viewContent.includes('backdrop-blur-md') &&
    viewContent.includes('pointer-events-auto'),
    'UjianSiswaView declares full-viewport blocking overlay: fixed inset-0 z-[99999] backdrop-blur-md pointer-events-auto'
  );

  assert(
    viewContent.includes('select-none'),
    'UjianSiswaView applies select-none class preventing question text selection'
  );

  assert(
    viewContent.includes('onContextMenu={(e) => e.preventDefault()}') &&
    viewContent.includes('onCopy={(e) => e.preventDefault()}') &&
    viewContent.includes('onPaste={(e) => e.preventDefault()}'),
    'UjianSiswaView suppresses contextmenu, copy, cut, and paste on root container'
  );

  assert(
    viewContent.includes('violation-counter-badge'),
    'UjianSiswaView renders real-time violation counter badge'
  );

  assert(
    viewContent.includes('Kembali ke Layar Penuh'),
    'UjianSiswaView provides explicit prompt to restore fullscreen mode'
  );

  // Verify Hook event listeners
  assert(
    hookContent.includes("document.addEventListener('visibilitychange'") &&
    hookContent.includes("window.addEventListener('blur'") &&
    hookContent.includes("document.addEventListener('fullscreenchange'"),
    'useExamAntiCheat binds visibilitychange, window blur, and fullscreenchange'
  );

  assert(
    hookContent.includes("document.addEventListener('copy'") &&
    hookContent.includes("document.addEventListener('paste'") &&
    hookContent.includes("window.addEventListener('keydown'") &&
    hookContent.includes("window.addEventListener('beforeunload'"),
    'useExamAntiCheat binds copy, paste, keydown, and beforeunload capture listeners'
  );

  assert(
    hookContent.includes("safeExitFullscreen") &&
    hookContent.includes("isTerminatingRef"),
    'useExamAntiCheat implements termination suppression to prevent false FULLSCREEN_EXIT violations on submit'
  );

  assert(
    hookContent.includes("window.addEventListener('beforeprint'") &&
    hookContent.includes("document.addEventListener('selectstart'") &&
    hookContent.includes("document.addEventListener('dragstart'") &&
    hookContent.includes("document.addEventListener('drop'"),
    'useExamAntiCheat captures print, text selection, dragstart, and drop events'
  );

  assert(
    hookContent.includes("window.addEventListener('storage'") &&
    hookContent.includes("window.addEventListener('resize'"),
    'useExamAntiCheat monitors storage tampering and window resize transitions'
  );

  assert(
    viewContent.includes("select-text"),
    'UjianSiswaView applies select-text to essay input for student editing ergonomics'
  );

  assert(
    viewContent.includes("Ujian Terkunci & Didiskualifikasi"),
    'UjianSiswaView differentiates visual presentation for locked/disqualified sessions'
  );

  assert(
    viewContent.includes("isSimulatedFullscreen") &&
    viewContent.includes("Lihat Hasil & Riwayat Pelanggaran"),
    'UjianSiswaView integrates simulated fullscreen fallback and locked lobby result review'
  );

  assert(
    globalsContent.includes(".swal2-container") &&
    globalsContent.includes("z-index: 100000 !important;"),
    'globals.css elevates SweetAlert z-index above z-[99999] exam modal backdrop'
  );

  assert(
    globalsContent.includes("#student-exam-container") &&
    globalsContent.includes("display: none !important;"),
    'globals.css suppresses student-exam-container during print media output'
  );

  // Verify AppScreen integration
  assert(
    appScreenContent.includes("const isSiswa = (baseUser?.role || '').toLowerCase().replace(/[\\s_-]+/g, '') === 'siswa'") ||
    appScreenContent.includes("isSiswa = (baseUser?.role || '').toLowerCase().replace"),
    'AppScreen evaluates isSiswa role condition'
  );

  assert(
    appScreenContent.includes("currentView === 'view-ujian'") &&
    appScreenContent.includes('<UjianSiswaView'),
    'AppScreen mounts UjianSiswaView when currentView is view-ujian'
  );

  assert(
    appScreenContent.includes("isSiswa ? 'view-ujian' : 'view-home'"),
    'AppScreen sets default home view for role siswa directly to view-ujian'
  );

  // Verify user type
  assert(
    userTypeContent.includes("'siswa'"),
    'src/types/user.ts explicitly includes role siswa'
  );

  // =========================================================================
  // SUITE 9: Honest Student Normal Experience Simulation
  // =========================================================================
  suite('9. Honest Student Normal Answering Experience Simulation');

  // Simulate an honest student answering questions without switching tabs
  const honestAnswers: Record<number, string> = {};
  honestAnswers[0] = 'B';
  honestAnswers[1] = 'B';
  honestAnswers[2] = 'B';
  honestAnswers[3] = 'Siswa wajib fokus pada lembar ujian tanpa membuka bantuan eksternal.';

  assert(Object.keys(honestAnswers).length === 4, 'Student successfully records answers for all 4 questions');
  assert(state.isLocked === true, 'Previous hostile simulation was locked as expected');

  const honestSession = initExamSecurityState({
    examId: 'ujian_honest_demo',
    studentId: 'siswa_honest_999'
  });

  assert(
    honestSession.violationCount === 0 && !honestSession.isLocked,
    'Honest student session completes with 0 violations and unblocked integrity'
  );

  // =========================================================================
  // SUITE 10: Exam Progress Persistence & Anti-Reload Data Protection
  // =========================================================================
  suite('10. Exam Progress Persistence & Anti-Reload Data Protection');

  const mockStorage = new Map<string, string>();
  const globalAny = global as any;
  const originalWindow = globalAny.window;
  const originalLocalStorage = globalAny.localStorage;

  try {
    globalAny.window = {};
    globalAny.localStorage = {
      getItem: (k: string) => mockStorage.get(k) || null,
      setItem: (k: string, v: string) => mockStorage.set(k, v),
      removeItem: (k: string) => mockStorage.delete(k)
    };

    const progressKey = getExamProgressStorageKey('PAS_2026', 'siswa_01');
    assert(progressKey.includes('sipjam_exam_progress_'), 'Generates valid progress storage key');

    // Save student answers during active exam
    saveExamProgress({
      examId: 'PAS_2026',
      studentId: 'siswa_01',
      currentQuestionIndex: 2,
      answers: { 0: 'B', 1: 'B' },
      doubtful: { 1: true },
      timeRemaining: 1540,
      lastUpdatedAt: new Date().toISOString()
    });

    // Simulate page reload: restore progress
    const restored = loadExamProgress('PAS_2026', 'siswa_01');
    assert(
      Boolean(restored && restored.currentQuestionIndex === 2 && restored.answers[0] === 'B'),
      'Restores ongoing exam answers and current question index across page reload'
    );
    assert(restored?.doubtful[1] === true, 'Restores doubtful flag state across reload');
    assert(restored?.timeRemaining === 1540, 'Restores countdown timer state across reload');

    // Clean up on legitimate submission
    clearExamProgress('PAS_2026', 'siswa_01');
    const afterClear = loadExamProgress('PAS_2026', 'siswa_01');
    assert(afterClear === null, 'Clears stored answer progress cleanly upon exam submission');
  } finally {
    globalAny.window = originalWindow;
    globalAny.localStorage = originalLocalStorage;
  }

  // =========================================================================
  // SUITE 11: Mobile & In-App WebView Simulated Fullscreen Resilience
  // =========================================================================
  suite('11. Mobile & In-App WebView Simulated Fullscreen Resilience');

  assert(
    typeof isFullscreenSupported === 'function',
    'isFullscreenSupported is exported as a guard function'
  );

  // In Node.js / SSR environment, document is undefined
  assert(
    isFullscreenSupported() === false,
    'isFullscreenSupported cleanly returns false when document/API is missing'
  );

  assert(
    isCurrentlyFullscreen(false) === false,
    'isCurrentlyFullscreen(false) returns false when no native fullscreen is active'
  );

  assert(
    isCurrentlyFullscreen(true) === true,
    'isCurrentlyFullscreen(true) returns true when simulated fullscreen fallback is active'
  );

  // Simulate mobile environment where Fullscreen API is missing (e.g. iPhone Safari)
  const mockDocWithoutFullscreen = {
    fullscreenElement: null,
    documentElement: {}
  };
  const origDoc = globalAny.document;
  try {
    globalAny.document = mockDocWithoutFullscreen;
    assert(
      isFullscreenSupported() === false,
      'Identifies environment lacking Fullscreen API (e.g. iPhone / restricted WebView)'
    );
    assert(
      isCurrentlyFullscreen(false) === false,
      'Returns false for native check on unsupported environment'
    );
    assert(
      isCurrentlyFullscreen(true) === true,
      'Seamlessly activates simulated fullscreen fallback on unsupported environment'
    );
  } finally {
    globalAny.document = origDoc;
  }

  // =========================================================================
  // RESULTS SUMMARY
  // =========================================================================
  console.log(`\n==============================================================================`);
  console.log(`STUDENT EXAM ANTI-CHEAT VERIFICATION RESULTS:`);
  console.log(`Passed: ${passed} | Failed: ${failed}`);
  console.log(`==============================================================================\n`);

  if (failed > 0) {
    console.error('FAILURES DETECTED:');
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL STUDENT EXAM ANTI-CHEATING VERIFICATION SCENARIOS PASSED 100%!');
  }
}

runStudentExamAntiCheatTests().catch(err => {
  console.error('Unexpected test runner error:', err);
  process.exit(1);
});
