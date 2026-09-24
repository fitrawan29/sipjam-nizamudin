import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${label}`);
    if (detail) console.error(`   ${detail}`);
    failed++;
  }
}

async function runTests() {
  console.log('==============================================================================');
  console.log('MILESTONE M3 TEST: UI/UX, PRE-LOGIN SPLASH, TITLE, & APPLE COMPATIBILITY');
  console.log('==============================================================================\n');

  const root = path.resolve(__dirname, '..');
  const layoutPath = path.join(root, 'src', 'app', 'layout.tsx');
  const manifestPath = path.join(root, 'public', 'manifest.json');
  const loginPath = path.join(root, 'src', 'components', 'LoginScreen.tsx');
  const splashPath = path.join(root, 'src', 'components', 'PreLoginSplash.tsx');
  const notifModalPath = path.join(root, 'src', 'components', 'NotificationPermissionModal.tsx');
  const pushPromptPath = path.join(root, 'src', 'components', 'PushNotificationPrompt.tsx');
  const globalsCssPath = path.join(root, 'src', 'app', 'globals.css');
  const pagePath = path.join(root, 'src', 'app', 'page.tsx');

  assert(fs.existsSync(layoutPath), 'src/app/layout.tsx exists');
  assert(fs.existsSync(manifestPath), 'public/manifest.json exists');
  assert(fs.existsSync(loginPath), 'src/components/LoginScreen.tsx exists');
  assert(fs.existsSync(splashPath), 'src/components/PreLoginSplash.tsx exists');
  assert(fs.existsSync(notifModalPath), 'src/components/NotificationPermissionModal.tsx exists');
  assert(fs.existsSync(pushPromptPath), 'src/components/PushNotificationPrompt.tsx exists');
  assert(fs.existsSync(globalsCssPath), 'src/app/globals.css exists');
  assert(fs.existsSync(pagePath), 'src/app/page.tsx exists');

  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const loginContent = fs.readFileSync(loginPath, 'utf8');
  const splashContent = fs.readFileSync(splashPath, 'utf8');
  const notifModalContent = fs.readFileSync(notifModalPath, 'utf8');
  const pushPromptContent = fs.readFileSync(pushPromptPath, 'utf8');
  const globalsCssContent = fs.readFileSync(globalsCssPath, 'utf8');
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  // --------------------------------------------------------------------------
  // SECTION 1: F8 - Notification Permission Full Blocking Modal Overlay
  // --------------------------------------------------------------------------
  console.log('\n--- Section 1: F8 - Full Blocking Notification Modal ---');

  // Check blocking modal overlay z-index and fixed inset-0
  assert(
    notifModalContent.includes('fixed inset-0') &&
    (notifModalContent.includes('z-[99999]') || notifModalContent.includes('z-50')) &&
    notifModalContent.includes('pointer-events-auto'),
    'NotificationPermissionModal uses fixed inset-0 z-[99999] pointer-events-auto'
  );

  // Check no dismiss/"Nanti" buttons allowing bypass in blocking modal
  assert(
    !notifModalContent.includes('>Nanti<') &&
    !notifModalContent.includes('handleDismiss') &&
    !pushPromptContent.includes('>Nanti<'),
    'No dismiss or "Nanti" bypass button in NotificationPermissionModal and PushNotificationPrompt'
  );

  // Check browser unblock instructions when denied
  assert(
    notifModalContent.includes('Buka pengaturan situs browser untuk mengaktifkan izin notifikasi'),
    'NotificationPermissionModal provides explicit browser unblock instructions when denied'
  );

  // Check Escape key suppression
  assert(
    notifModalContent.includes("e.key === 'Escape'") &&
    notifModalContent.includes('e.stopPropagation()'),
    'NotificationPermissionModal suppresses Escape key dismissal in strict blocking mode'
  );

  // Check click containment
  assert(
    notifModalContent.includes('e.stopPropagation()'),
    'NotificationPermissionModal captures backdrop clicks preventing underlying element activation'
  );

  // Check integration in page.tsx
  assert(
    pageContent.includes('NotificationPermissionModal'),
    'page.tsx mounts NotificationPermissionModal at the root application level'
  );

  // --------------------------------------------------------------------------
  // SECTION 2: F9 - Pre-Login Animation & Splash
  // --------------------------------------------------------------------------
  console.log('\n--- Section 2: F9 - Pre-Login Animation & Splash ---');

  // Check SIPJAM branding in splash
  assert(
    splashContent.includes('SIPJAM') &&
    splashContent.includes('fa-graduation-cap') &&
    splashContent.includes('Presensi & Jurnal'),
    'PreLoginSplash displays official SIPJAM title, graduation cap emblem, and educational subtitle'
  );

  // Check animation styling classes
  assert(
    splashContent.includes('animate-pulse') &&
    splashContent.includes('fade-in') &&
    splashContent.includes('tracking-widest'),
    'PreLoginSplash utilizes smooth pulsing, fade-in, and tracking-widest typography'
  );

  // Check timer cleanup and lifecycle callback
  assert(
    splashContent.includes('clearTimeout') &&
    splashContent.includes('onFinish'),
    'PreLoginSplash manages timeout lifecycle cleanly preventing memory leaks'
  );

  // Check page.tsx integration & authenticated bypass
  assert(
    pageContent.includes('PreLoginSplash') &&
    pageContent.includes('setShowSplash(false)') &&
    pageContent.includes('storedUser'),
    'page.tsx renders PreLoginSplash before LoginScreen and cleanly bypasses for authenticated sessions'
  );

  // --------------------------------------------------------------------------
  // SECTION 3: F10 - Login SaaS Text Removal & Browser Title "SIPJAM"
  // --------------------------------------------------------------------------
  console.log('\n--- Section 3: F10 - SaaS Text Removal & Tab Title "SIPJAM" ---');

  // Check absence of "Multi-Tenant SaaS" in LoginScreen
  assert(
    !loginContent.includes('Multi-Tenant SaaS • Superadmin, Admin Sekolah & Guru'),
    'LoginScreen removes legacy "Multi-Tenant SaaS • Superadmin, Admin Sekolah & Guru" text'
  );

  // Check absence of any "SaaS" keyword in LoginScreen
  assert(
    !/\bsaas\b/i.test(loginContent),
    'LoginScreen contains zero occurrences of "SaaS" or "saas"'
  );

  // Check heading is simplified to "SIPJAM Portal"
  assert(
    loginContent.includes('SIPJAM Portal'),
    'LoginScreen header is standardized to "SIPJAM Portal"'
  );

  // Check layout.tsx metadata title
  assert(
    layoutContent.includes("title: 'SIPJAM'"),
    'src/app/layout.tsx sets metadata title to exactly "SIPJAM"'
  );

  // Check public/manifest.json name and short_name
  const manifest = JSON.parse(manifestContent);
  assert(
    manifest.name === 'SIPJAM' && manifest.short_name === 'SIPJAM',
    'public/manifest.json sets both name and short_name to "SIPJAM"'
  );

  // --------------------------------------------------------------------------
  // SECTION 4: F11 - Apple iOS/Safari Compatibility Fixes
  // --------------------------------------------------------------------------
  console.log('\n--- Section 4: F11 - Apple iOS/Safari Compatibility ---');

  // Check layout.tsx viewportFit: 'cover'
  assert(
    layoutContent.includes("viewportFit: 'cover'") &&
    layoutContent.includes('export const viewport: Viewport'),
    'src/app/layout.tsx exports Next.js Viewport with viewportFit: "cover"'
  );

  // Check globals.css WebKit momentum scrolling
  assert(
    globalsCssContent.includes('-webkit-overflow-scrolling: touch;'),
    'globals.css enables -webkit-overflow-scrolling: touch for iOS inertia scrolling'
  );

  // Check globals.css overscroll-behavior-y containment
  assert(
    globalsCssContent.includes('overscroll-behavior-y: contain;'),
    'globals.css defines overscroll-behavior-y: contain to prevent Safari rubber-band chaining'
  );

  // Check globals.css safe area variables
  assert(
    globalsCssContent.includes('--sat: env(safe-area-inset-top, 0px);') &&
    globalsCssContent.includes('--sab: env(safe-area-inset-bottom, 0px);'),
    'globals.css defines CSS safe area variables for notch and home indicator clearance'
  );

  // Check globals.css mobile input font size >= 16px
  assert(
    globalsCssContent.includes('font-size: 16px !important;') &&
    globalsCssContent.includes('@media screen and (max-width: 768px)'),
    'globals.css enforces 16px minimum font size on mobile inputs to eliminate Safari auto-zoom'
  );

  // Check smooth scroll on html
  assert(
    globalsCssContent.includes('scroll-behavior: smooth;') &&
    globalsCssContent.includes('-webkit-text-size-adjust: 100%;'),
    'globals.css specifies smooth scrolling and text size adjust on html root'
  );

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n==============================================================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('==============================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
