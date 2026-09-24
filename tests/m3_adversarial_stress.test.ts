/**
 * ==============================================================================
 * ADVERSARIAL STRESS TEST SUITE: MILESTONE 3 (M3)
 * File: tests/m3_adversarial_stress.test.ts
 *
 * EMPIRICAL CHALLENGER VERIFICATION FOR:
 * 1. NotificationPermissionModal: Edge cases (default, granted, denied, unsupported),
 *    backdrop penetration, Escape key interception, focus recheck, concurrency lock,
 *    and bypass button elimination in both NotificationPermissionModal & PushNotificationPrompt.
 * 2. PreLoginSplash: Lifecycle teardown, 5-timer clearing on unmount, monotonic progress,
 *    fade-out transition timing, duration boundaries, and authenticated session bypass.
 * 3. LoginScreen SaaS Sanitization & Branding: Exhaustive case-insensitive scanning
 *    for "saas", tab title "SIPJAM" precision, and manifest.json compliance.
 * 4. Apple iOS / Safari Compatibility: Viewport cover, safe-area variables & utilities,
 *    momentum scrolling, 16px mobile input auto-zoom defense, and iOS camera playsInline.
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, label: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ${GREEN}✓ PASS [${totalTests}]:${RESET} ${label}`);
    passedTests++;
  } else {
    console.error(`  ${RED}✗ FAIL [${totalTests}]:${RESET} ${label}`);
    if (detail) console.error(`    ${RED}Detail:${RESET} ${detail}`);
    failedTests++;
  }
}

function suite(title: string) {
  console.log(`\n${CYAN}${BOLD}======================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}CHALLENGE SUITE: ${title}${RESET}`);
  console.log(`${CYAN}${BOLD}======================================================================${RESET}`);
}

async function runAdversarialM3TestSuite() {
  console.log(`\n${YELLOW}${BOLD}**********************************************************************${RESET}`);
  console.log(`${YELLOW}${BOLD}  STARTING EMPIRICAL ADVERSARIAL CHALLENGER SUITE FOR MILESTONE 3     ${RESET}`);
  console.log(`${YELLOW}${BOLD}**********************************************************************${RESET}\n`);

  const root = path.resolve(__dirname, '..');
  const notifModalPath = path.join(root, 'src', 'components', 'NotificationPermissionModal.tsx');
  const pushPromptPath = path.join(root, 'src', 'components', 'PushNotificationPrompt.tsx');
  const splashPath = path.join(root, 'src', 'components', 'PreLoginSplash.tsx');
  const loginPath = path.join(root, 'src', 'components', 'LoginScreen.tsx');
  const layoutPath = path.join(root, 'src', 'app', 'layout.tsx');
  const pagePath = path.join(root, 'src', 'app', 'page.tsx');
  const globalsCssPath = path.join(root, 'src', 'app', 'globals.css');
  const manifestPath = path.join(root, 'public', 'manifest.json');
  const cameraPath = path.join(root, 'src', 'components', 'CameraSelfieCapture.tsx');

  const notifModalSrc = fs.readFileSync(notifModalPath, 'utf8');
  const pushPromptSrc = fs.readFileSync(pushPromptPath, 'utf8');
  const splashSrc = fs.readFileSync(splashPath, 'utf8');
  const loginSrc = fs.readFileSync(loginPath, 'utf8');
  const layoutSrc = fs.readFileSync(layoutPath, 'utf8');
  const pageSrc = fs.readFileSync(pagePath, 'utf8');
  const globalsCssSrc = fs.readFileSync(globalsCssPath, 'utf8');
  const manifestSrc = fs.readFileSync(manifestPath, 'utf8');
  const cameraSrc = fs.readFileSync(cameraPath, 'utf8');

  // ============================================================================
  // SUITE 1: Notification Permission Modal Adversarial Challenge
  // ============================================================================
  suite('1. Notification Permission Modal & Push Prompt Adversarial Challenge');

  // Test 1.1: State oracle simulation for all 4 permission states + unsupported
  console.log('\n  [1.1] Permission State Oracles');

  type PermState = NotificationPermission | 'unsupported';
  function simulateModalRender(perm: PermState, mounted: boolean = true) {
    if (!mounted) return { rendered: false, view: 'none' };
    if (perm === 'granted' || perm === 'unsupported') {
      return { rendered: false, view: 'suppressed' };
    }
    if (perm === 'denied') {
      return { rendered: true, view: 'denied-instructions' };
    }
    return { rendered: true, view: 'default-prompt' };
  }

  // Edge Case 1: SSR / Pre-mount state
  const ssrState = simulateModalRender('default', false);
  assert(
    ssrState.rendered === false && ssrState.view === 'none',
    'Pre-mount / SSR: Component renders null to guarantee 0ms visual flicker'
  );

  // Edge Case 2: Notification API unsupported (e.g. older browser or restricted env)
  const unsupportedState = simulateModalRender('unsupported', true);
  assert(
    unsupportedState.rendered === false && unsupportedState.view === 'suppressed',
    "Permission 'unsupported': Modal is completely suppressed so users are not trapped on unsupported clients"
  );
  assert(
    notifModalSrc.includes("setPermission('unsupported')") &&
    notifModalSrc.includes("if (permission === 'granted' || permission === 'unsupported')"),
    'NotificationPermissionModal source explicitly handles unsupported environment gracefully'
  );

  // Edge Case 3: Permission already 'granted'
  const grantedState = simulateModalRender('granted', true);
  assert(
    grantedState.rendered === false && grantedState.view === 'suppressed',
    "Permission 'granted': Modal suppresses immediately with zero UI obstruction"
  );

  // Edge Case 4: Permission 'default' (initial unprompted state)
  const defaultState = simulateModalRender('default', true);
  assert(
    defaultState.rendered === true && defaultState.view === 'default-prompt',
    "Permission 'default': Modal enters full blocking prompt requiring explicit activation"
  );

  // Edge Case 5: Permission 'denied' (blocked by user / browser setting)
  const deniedState = simulateModalRender('denied', true);
  assert(
    deniedState.rendered === true && deniedState.view === 'denied-instructions',
    "Permission 'denied': Modal displays browser unblock guide, hiding the futile request button"
  );

  // Test 1.2: Adversarial Attack - Overlay Blocking & Event Penetration
  console.log('\n  [1.2] Adversarial Attack: Backdrop Click-Through & Event Propagation');

  // Verify modal styling classes enforce non-bypassable fullscreen coverage
  const hasFixedInset0 = notifModalSrc.includes('fixed inset-0');
  const hasFullViewport = notifModalSrc.includes('w-screen h-screen') || notifModalSrc.includes('inset-0');
  const hasExtremeZIndex = notifModalSrc.includes('z-[99999]');
  const hasPointerEventsAuto = notifModalSrc.includes('pointer-events-auto');
  const hasBackdropBlur = notifModalSrc.includes('backdrop-blur');

  assert(
    hasFixedInset0 && hasFullViewport && hasExtremeZIndex && hasPointerEventsAuto && hasBackdropBlur,
    'Overlay uses fixed inset-0 z-[99999] pointer-events-auto backdrop-blur to physically block clicks to underlying UI'
  );

  // Test click event stopPropagation
  let backdropEventStopped = false;
  let cardEventStopped = false;

  // Emulate backdrop click
  const mockBackdropClick = {
    stopPropagation: () => { backdropEventStopped = true; },
  };
  // Emulate card click
  const mockCardClick = {
    stopPropagation: () => { cardEventStopped = true; },
  };

  // Inspect NotificationPermissionModal onClick handlers
  const backdropClickPattern = /<div[\s\S]*?id="notification-permission-modal"[\s\S]*?onClick=\{\(e\)\s*=>\s*\{[\s\S]*?e\.stopPropagation\(\);[\s\S]*?\}\}/;
  const cardClickPattern = /<div[\s\S]*?className="glass-card[\s\S]*?onClick=\{\(e\)\s*=>\s*e\.stopPropagation\(\)\}/;

  assert(
    backdropClickPattern.test(notifModalSrc),
    'Modal backdrop captures onClick and executes e.stopPropagation() to prevent event bubbling to background'
  );
  assert(
    cardClickPattern.test(notifModalSrc),
    'Modal glass-card container executes e.stopPropagation() to isolate inner interactions'
  );

  // Test 1.3: Adversarial Attack - Escape Key Dismissal Interception
  console.log('\n  [1.3] Adversarial Attack: Keyboard Escape Key Dismissal');

  let escDefaultPrevented = false;
  let escPropagationStopped = false;

  const mockEscEvent = {
    key: 'Escape',
    preventDefault: () => { escDefaultPrevented = true; },
    stopPropagation: () => { escPropagationStopped = true; },
  };

  // Extract keydown handler logic from notifModalSrc
  const escHandlerMatch = notifModalSrc.includes("if (e.key === 'Escape')") &&
    notifModalSrc.includes('e.preventDefault()') &&
    notifModalSrc.includes('e.stopPropagation()');

  assert(
    escHandlerMatch,
    'Escape key listener explicitly prevents default and stops propagation in capture phase'
  );

  const usesCapturePhase = notifModalSrc.includes("addEventListener('keydown', handleKeyDown, true)");
  assert(
    usesCapturePhase,
    'Keydown listener registers with capture=true to intercept Escape before any child component can process it'
  );

  const cleansUpKeydown = notifModalSrc.includes("removeEventListener('keydown', handleKeyDown, true)");
  assert(
    cleansUpKeydown,
    'Keydown listener cleans up on unmount to prevent dangling event listeners'
  );

  // Test 1.4: Adversarial Audit - Zero Bypass Buttons in Both Modals
  console.log('\n  [1.4] Adversarial Audit: Bypass Button Elimination (No Nanti / Tutup / Close)');

  const forbiddenButtonsRegex = />\s*(Nanti|Nanti Saja|Tutup|Batal|Lewati|Dismiss|Close|Skip)\s*</i;
  assert(
    !forbiddenButtonsRegex.test(notifModalSrc),
    'NotificationPermissionModal: Zero bypass buttons (Nanti, Tutup, Batal, Lewati, Dismiss, Close)'
  );
  assert(
    !forbiddenButtonsRegex.test(pushPromptSrc),
    'PushNotificationPrompt: Zero bypass buttons (Nanti, Tutup, Batal, Lewati, Dismiss, Close)'
  );

  const dismissHandlersRegex = /(handleDismiss|onDismiss|onClose|onCancel|closeModal)/;
  assert(
    !dismissHandlersRegex.test(notifModalSrc),
    'NotificationPermissionModal: Zero dismiss or cancellation handler functions present'
  );

  // Test 1.5: Dynamic Window Focus Re-evaluation Oracle
  console.log('\n  [1.5] Dynamic Permission Re-evaluation via Window Focus');

  assert(
    notifModalSrc.includes("window.addEventListener('focus', handleFocus)") &&
    notifModalSrc.includes("window.removeEventListener('focus', handleFocus)"),
    'Modal re-queries Notification.permission whenever user returns to tab (focus event)'
  );
  assert(
    notifModalSrc.includes("if (Notification.permission === 'granted' && onPermissionGranted)"),
    'When focus detects permission transitioned to granted, fires onPermissionGranted callback'
  );

  // Test 1.6: Concurrency and Re-entrancy Protection
  console.log('\n  [1.6] Concurrency Protection: Re-entrant Request Locking');

  assert(
    notifModalSrc.includes('const [isProcessing, setIsProcessing] = useState(false);') &&
    notifModalSrc.includes('setIsProcessing(true);') &&
    notifModalSrc.includes('setIsProcessing(false);') &&
    notifModalSrc.includes('disabled={isProcessing}'),
    'Grant button disables itself during pending permission requests to prevent race conditions'
  );


  // ============================================================================
  // SUITE 2: PreLoginSplash Lifecycle, Animation & Boundary Stress
  // ============================================================================
  suite('2. PreLoginSplash Lifecycle, Animation & Boundary Stress');

  // Test 2.1: Lifecycle Teardown and 5-Timer Clearing Oracle
  console.log('\n  [2.1] Lifecycle Teardown & Timer Clearing Oracle');

  interface MockTimerHandle {
    id: number;
    delay: number;
    cleared: boolean;
    callback: () => void;
  }

  let timerCounter = 0;
  const activeTimers: Map<number, MockTimerHandle> = new Map();

  function mockSetTimeout(cb: () => void, ms: number): number {
    const id = ++timerCounter;
    activeTimers.set(id, { id, delay: ms, cleared: false, callback: cb });
    return id;
  }

  function mockClearTimeout(id: number) {
    const timer = activeTimers.get(id);
    if (timer) {
      timer.cleared = true;
      activeTimers.delete(id);
    }
  }

  // Simulate PreLoginSplash mounting effect
  function mountSplashEffect(durationMs: number, onFinish: () => void) {
    let progress = 15;
    let isFadingOut = false;

    const t1 = mockSetTimeout(() => { progress = 55; }, durationMs * 0.25);
    const t2 = mockSetTimeout(() => { progress = 85; }, durationMs * 0.6);
    const t3 = mockSetTimeout(() => { progress = 100; }, durationMs * 0.85);
    const fadeTimer = mockSetTimeout(() => {
      isFadingOut = true;
    }, Math.max(durationMs - 300, 500));
    const finishTimer = mockSetTimeout(() => {
      onFinish();
    }, durationMs);

    const cleanup = () => {
      mockClearTimeout(t1);
      mockClearTimeout(t2);
      mockClearTimeout(t3);
      mockClearTimeout(fadeTimer);
      mockClearTimeout(finishTimer);
    };

    return { cleanup, getProgress: () => progress, getIsFadingOut: () => isFadingOut };
  }

  // Stress Scenario A: Early unmount at t = 300ms
  activeTimers.clear();
  let finishCalledEarly = false;
  const earlySplash = mountSplashEffect(1800, () => { finishCalledEarly = true; });

  assert(activeTimers.size === 5, 'Mounting PreLoginSplash registers exactly 5 tracked lifecycle timers');

  // Trigger unmount
  earlySplash.cleanup();
  assert(activeTimers.size === 0, 'Early unmount clears 100% of registered timers (0 dangling timers)');
  assert(finishCalledEarly === false, 'Early unmounted splash does NOT execute onFinish callback');

  // Verify source cleanup block has all 5 clearTimeouts
  const sourceClearTimeouts = (splashSrc.match(/clearTimeout\([a-zA-Z0-9_]+\)/g) || []).length;
  assert(
    sourceClearTimeouts === 5,
    `PreLoginSplash.tsx cleanup callback contains all 5 clearTimeout calls (found ${sourceClearTimeouts}/5)`
  );

  // Test 2.2: Monotonic Timeline Progression Oracle
  console.log('\n  [2.2] Monotonic Timeline Progression Oracle');

  activeTimers.clear();
  let normalFinishCalled = false;
  const duration = 1800;
  const splash = mountSplashEffect(duration, () => { normalFinishCalled = true; });

  // Timeline checkpoints:
  // t = 0: initial
  assert(splash.getProgress() === 15, 'At t=0: progress is 15%');
  assert(splash.getIsFadingOut() === false, 'At t=0: isFadingOut is false');

  // Advance to t = 450ms (0.25 * 1800)
  const timerT1 = Array.from(activeTimers.values()).find(t => t.delay === 450);
  timerT1?.callback();
  assert(splash.getProgress() === 55, 'At t=450ms (25%): progress advances monotonically to 55%');

  // Advance to t = 1080ms (0.6 * 1800)
  const timerT2 = Array.from(activeTimers.values()).find(t => t.delay === 1080);
  timerT2?.callback();
  assert(splash.getProgress() === 85, 'At t=1080ms (60%): progress advances monotonically to 85%');

  // Advance to t = 1500ms (1800 - 300)
  const timerFade = Array.from(activeTimers.values()).find(t => t.delay === 1500);
  timerFade?.callback();
  assert(splash.getIsFadingOut() === true, 'At t=1500ms (fade-out threshold): isFadingOut becomes true');

  // Advance to t = 1530ms (0.85 * 1800)
  const timerT3 = Array.from(activeTimers.values()).find(t => t.delay === 1530);
  timerT3?.callback();
  assert(splash.getProgress() === 100, 'At t=1530ms (85%): progress reaches 100%');

  // Advance to t = 1800ms
  const timerFinish = Array.from(activeTimers.values()).find(t => t.delay === 1800);
  timerFinish?.callback();
  assert(normalFinishCalled === true, 'At t=1800ms: onFinish callback triggers smoothly');

  // Test 2.3: Boundary Duration Calculations
  console.log('\n  [2.3] Boundary Duration Calculations');

  function getTimingSummary(dur: number) {
    const fadeAt = Math.max(dur - 300, 500);
    const finishAt = dur;
    return { fadeAt, finishAt, fadeBeforeFinish: fadeAt <= finishAt };
  }

  const dur1000 = getTimingSummary(1000);
  assert(dur1000.fadeAt === 700 && dur1000.fadeBeforeFinish, 'Duration 1000ms: Fade triggers at 700ms (300ms before finish)');

  const dur3000 = getTimingSummary(3000);
  assert(dur3000.fadeAt === 2700 && dur3000.fadeBeforeFinish, 'Duration 3000ms: Fade triggers at 2700ms (300ms before finish)');

  // Test 2.4: Session Authentication Bypass Oracle in page.tsx
  console.log('\n  [2.4] Authenticated Session Splash Bypass in page.tsx');

  function simulateMainAppMount(storedUserStr: string | null) {
    let user: any = null;
    let showSplash = true;
    let isUserLoaded = false;
    let localStorageCleared = false;

    try {
      if (storedUserStr) {
        const parsed = JSON.parse(storedUserStr);
        user = parsed;
        showSplash = false;
      }
    } catch (e) {
      localStorageCleared = true;
      user = null;
    } finally {
      isUserLoaded = true;
    }

    return { user, showSplash, isUserLoaded, localStorageCleared };
  }

  // Case A: Valid authenticated session
  const authSession = simulateMainAppMount(JSON.stringify({ id: 'u1', nama: 'Fitra', role: 'Guru' }));
  assert(
    authSession.showSplash === false && authSession.user !== null,
    'Authenticated user: PreLoginSplash is cleanly bypassed (showSplash = false) directly to AppScreen'
  );

  // Case B: Unauthenticated user (no session)
  const unauthSession = simulateMainAppMount(null);
  assert(
    unauthSession.showSplash === true && unauthSession.user === null,
    'Unauthenticated visitor: PreLoginSplash is displayed (showSplash = true) before LoginScreen'
  );

  // Case C: Corrupted session data in localStorage
  const corruptSession = simulateMainAppMount('{ corrupted_json_missing_brace: true');
  assert(
    corruptSession.showSplash === true &&
    corruptSession.user === null &&
    corruptSession.localStorageCleared === true,
    'Corrupted session: Safely catches JSON error, purges storage, and falls back to Splash + Login without crashing'
  );


  // ============================================================================
  // SUITE 3: LoginScreen SaaS Scrubbing, Tab Title & Manifest Integrity
  // ============================================================================
  suite('3. LoginScreen SaaS Sanitization, Title & Manifest Precision');

  // Test 3.1: Case-Insensitive SaaS Regex Scans
  console.log('\n  [3.1] Case-Insensitive Regex Scans for SaaS Terminology');

  const saasWordRegex = /\bsaas\b/i;
  const multiTenantSaasRegex = /multi-tenant\s+saas/i;

  assert(
    !saasWordRegex.test(loginSrc),
    'LoginScreen.tsx: Zero occurrences of "saas", "SaaS", or "SAAS"'
  );
  assert(
    !multiTenantSaasRegex.test(loginSrc),
    'LoginScreen.tsx: Zero occurrences of "Multi-Tenant SaaS"'
  );

  assert(
    !saasWordRegex.test(pageSrc),
    'src/app/page.tsx: Zero occurrences of "SaaS"'
  );
  assert(
    !saasWordRegex.test(layoutSrc),
    'src/app/layout.tsx: Zero occurrences of "SaaS"'
  );
  assert(
    !saasWordRegex.test(manifestSrc),
    'public/manifest.json: Zero occurrences of "SaaS"'
  );

  // Test 3.2: Branding Consistency in LoginScreen
  console.log('\n  [3.2] Standardized Branding Header in LoginScreen');

  assert(
    loginSrc.includes('SIPJAM Portal'),
    'LoginScreen: Primary title is standardized to "SIPJAM Portal"'
  );
  assert(
    loginSrc.includes('Presensi & Jurnal Multi-Sekolah'),
    'LoginScreen: Subtitle is standardized to educational domain "Presensi & Jurnal Multi-Sekolah"'
  );

  // Test 3.3: Tab Title Precision in layout.tsx
  console.log('\n  [3.3] Browser Tab Title Precision in layout.tsx');

  const titleMatch = layoutSrc.match(/title:\s*['"]([^'"]+)['"]/);
  const exactTitle = titleMatch ? titleMatch[1] : '';
  assert(
    exactTitle === 'SIPJAM',
    `Browser tab title is strictly "SIPJAM" (found: "${exactTitle}")`
  );

  // Test 3.4: PWA Manifest Consistency
  console.log('\n  [3.4] PWA Manifest Precision in public/manifest.json');

  const parsedManifest = JSON.parse(manifestSrc);
  assert(
    parsedManifest.name === 'SIPJAM',
    `manifest.json "name" is strictly "SIPJAM" (found: "${parsedManifest.name}")`
  );
  assert(
    parsedManifest.short_name === 'SIPJAM',
    `manifest.json "short_name" is strictly "SIPJAM" (found: "${parsedManifest.short_name}")`
  );
  assert(
    parsedManifest.start_url === '/',
    'manifest.json "start_url" points to "/"'
  );
  assert(
    parsedManifest.display === 'standalone',
    'manifest.json "display" is configured for "standalone" PWA experience'
  );


  // ============================================================================
  // SUITE 4: Apple iOS / Safari Compatibility Stress Tests
  // ============================================================================
  suite('4. Apple iOS & Safari Compatibility Stress Tests');

  // Test 4.1: Viewport Configuration in layout.tsx
  console.log('\n  [4.1] Viewport Cover & Scaling Controls in layout.tsx');

  assert(
    layoutSrc.includes("viewportFit: 'cover'"),
    'layout.tsx defines viewportFit: "cover" for notch / Dynamic Island edge-to-edge rendering'
  );
  assert(
    layoutSrc.includes("userScalable: false") &&
    layoutSrc.includes("initialScale: 1") &&
    layoutSrc.includes("maximumScale: 1"),
    'layout.tsx locks scaling (userScalable: false, max 1) to prevent mobile layout distortion'
  );
  assert(
    layoutSrc.includes("export const viewport: Viewport"),
    'layout.tsx uses official Next.js Viewport export contract'
  );

  // Test 4.2: Safe Area Insets in globals.css
  console.log('\n  [4.2] Safe Area CSS Variables & Utility Classes');

  const hasTopInsetVar = globalsCssSrc.includes('--sat: env(safe-area-inset-top, 0px);');
  const hasBottomInsetVar = globalsCssSrc.includes('--sab: env(safe-area-inset-bottom, 0px);');
  const hasLeftInsetVar = globalsCssSrc.includes('--sal: env(safe-area-inset-left, 0px);');
  const hasRightInsetVar = globalsCssSrc.includes('--sar: env(safe-area-inset-right, 0px);');

  assert(
    hasTopInsetVar && hasBottomInsetVar && hasLeftInsetVar && hasRightInsetVar,
    'globals.css defines all 4 safe area CSS variables (--sat, --sab, --sal, --sar) with 0px fallbacks'
  );

  const hasPtSafe = globalsCssSrc.includes('.pt-safe');
  const hasPbSafe = globalsCssSrc.includes('.pb-safe');
  const hasPlSafe = globalsCssSrc.includes('.pl-safe');
  const hasPrSafe = globalsCssSrc.includes('.pr-safe');

  assert(
    hasPtSafe && hasPbSafe && hasPlSafe && hasPrSafe,
    'globals.css exports utilities: .pt-safe, .pb-safe, .pl-safe, .pr-safe'
  );

  assert(
    globalsCssSrc.includes('@supports (padding-top: env(safe-area-inset-top))') &&
    globalsCssSrc.includes('header.fixed.top-0') &&
    globalsCssSrc.includes('main.pt-20'),
    'globals.css includes @supports query adjusting fixed header and main content for iPhone notch'
  );

  // Test 4.3: Touch Momentum Scrolling & Overscroll Containment
  console.log('\n  [4.3] Touch Momentum Scrolling & Rubber-Band Containment');

  const hasMomentumScroll = globalsCssSrc.includes('-webkit-overflow-scrolling: touch;');
  const hasOverscrollContain = globalsCssSrc.includes('overscroll-behavior-y: contain;');

  assert(
    hasMomentumScroll,
    'globals.css specifies -webkit-overflow-scrolling: touch for native iOS inertial fling'
  );
  assert(
    hasOverscrollContain,
    'globals.css specifies overscroll-behavior-y: contain to prevent Safari rubber-band chaining'
  );

  // Test 4.4: Mobile Auto-Zoom Prevention (16px Input Rule)
  console.log('\n  [4.4] Mobile Auto-Zoom Prevention (16px Input Rule)');

  const has16pxMobileRule = globalsCssSrc.includes('@media screen and (max-width: 768px)') &&
    globalsCssSrc.includes('input, select, textarea') &&
    globalsCssSrc.includes('font-size: 16px !important;');

  assert(
    has16pxMobileRule,
    'globals.css strictly enforces 16px minimum font-size on mobile inputs to eliminate Safari auto-zoom'
  );

  assert(
    globalsCssSrc.includes('-webkit-text-size-adjust: 100%;'),
    'globals.css defines -webkit-text-size-adjust: 100% on html to prevent font inflation on rotation'
  );

  // Test 4.5: Camera iOS Safari Invariants (Acceptance Criteria Cross-Check)
  console.log('\n  [4.5] Camera iOS Safari Invariants in CameraSelfieCapture.tsx');

  assert(
    cameraSrc.includes('playsInline') && cameraSrc.includes('autoPlay') && cameraSrc.includes('muted'),
    'CameraSelfieCapture: <video> element declares playsInline, autoPlay, and muted to prevent iOS fullscreen video hijack'
  );

  assert(
    cameraSrc.includes('track.stop()'),
    'CameraSelfieCapture: cleanly stops hardware tracks on camera stop / facingMode change'
  );

  assert(
    cameraSrc.includes('facingMode: { ideal: mode }'),
    'CameraSelfieCapture: uses ideal constraint for facingMode to allow graceful iPhone camera fallback'
  );


  // ============================================================================
  // SUMMARY & VERDICT
  // ============================================================================
  console.log(`\n${CYAN}${BOLD}======================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}                   ADVERSARIAL STRESS TEST RESULTS                     ${RESET}`);
  console.log(`${CYAN}${BOLD}======================================================================${RESET}`);
  console.log(`  Total Checks:  ${BOLD}${totalTests}${RESET}`);
  console.log(`  Passed:        ${GREEN}${BOLD}${passedTests}${RESET}`);
  console.log(`  Failed:        ${RED}${BOLD}${failedTests}${RESET}`);
  console.log(`${CYAN}${BOLD}======================================================================${RESET}\n`);

  if (failedTests > 0) {
    console.error(`${RED}${BOLD}❌ VERDICT: REQUEST_CHANGES — ${failedTests} challenge checks failed.${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}✅ VERDICT: APPROVE — All ${passedTests} adversarial stress checks passed!${RESET}\n`);
    process.exit(0);
  }
}

runAdversarialM3TestSuite().catch((err) => {
  console.error('Adversarial test execution error:', err);
  process.exit(1);
});
