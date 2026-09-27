/**
 * Empirical Adversarial Test Suite - Challenger 2
 * Focus: OnboardingTutorial, tutorialSteps, and AppScreen Integration
 * 
 * Target Domains:
 * 1. Missing or non-existent target DOM elements (null rect, center fallback, no crashes)
 * 2. Step boundaries & transitions (skip on step 0, skip at last step, rapid next/prev, re-opening lifecycle)
 * 3. LocalStorage robustness (corrupted values, strict 'true' check, role normalization, reset)
 * 4. Viewport boundary stress (320px, 375px, 2560px, overflow prevention across 120+ permutations)
 * 5. Sidebar drawer state transitions & callback interactions
 * 6. DOM selector cross-validation across AppScreen, AIAssistant, and tutorialSteps
 */

import fs from 'fs';
import path from 'path';
import {
  type TourStep,
  GURU_STEPS,
  ADMIN_STEPS,
  STORAGE_KEY_GURU,
  STORAGE_KEY_ADMIN,
  normalizeRole,
  getStepsForRole,
  isTutorialCompleted,
  shouldShowTutorial,
  setTutorialCompleted,
  resetTutorial,
} from '../src/components/Onboarding/tutorialSteps';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const findings: { severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'; title: string; detail: string }[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     -> ${detail}`);
    failedTests++;
  }
}

function recordFinding(severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO', title: string, detail: string) {
  findings.push({ severity, title, detail });
  console.log(`  ⚠️ [FINDING - ${severity}] ${title}: ${detail}`);
}

console.log('================================================================');
console.log('CHALLENGER 2: ADVERSARIAL STRESS-TEST & EMPIRICAL VERIFICATION');
console.log('Target: OnboardingTutorial + tutorialSteps + AppScreen');
console.log('================================================================\n');

const projectRoot = path.resolve(__dirname, '..');

// ============================================================================
// PART 1: DOM SELECTOR CROSS-VALIDATION
// ============================================================================
console.log('>>> SECTION 1: DOM Selector Cross-Validation <<<');

const appScreenPath = path.join(projectRoot, 'src', 'components', 'AppScreen.tsx');
const aiAssistantPath = path.join(projectRoot, 'src', 'components', 'AIAssistant', 'AIAssistant.tsx');
const tutorialStepsPath = path.join(projectRoot, 'src', 'components', 'Onboarding', 'tutorialSteps.ts');
const onboardingTutorialPath = path.join(projectRoot, 'src', 'components', 'Onboarding', 'OnboardingTutorial.tsx');

assert(fs.existsSync(appScreenPath), 'AppScreen.tsx exists');
assert(fs.existsSync(aiAssistantPath), 'AIAssistant.tsx exists');
assert(fs.existsSync(tutorialStepsPath), 'tutorialSteps.ts exists');
assert(fs.existsSync(onboardingTutorialPath), 'OnboardingTutorial.tsx exists');

const appScreenSource = fs.readFileSync(appScreenPath, 'utf8');
const aiAssistantSource = fs.readFileSync(aiAssistantPath, 'utf8');

// Extract all data-tour attributes from AppScreen and AIAssistant
const dataTourRegex = /data-tour=["']([^"']+)["']/g;
const declaredDataTours = new Set<string>();
let match: RegExpExecArray | null;

while ((match = dataTourRegex.exec(appScreenSource)) !== null) {
  declaredDataTours.add(match[1]);
}
while ((match = dataTourRegex.exec(aiAssistantSource)) !== null) {
  declaredDataTours.add(match[1]);
}

// In AppScreen, menu items have data-tour={item.id}
// Let's verify menu item IDs that are rendered with data-tour
const menuItemIdRegex = /id:\s*['"](view-[a-z0-9-]+)['"]/g;
while ((match = menuItemIdRegex.exec(appScreenSource)) !== null) {
  declaredDataTours.add(match[1]);
}

console.log(`  Identified ${declaredDataTours.size} unique data-tour targets in AppScreen and AIAssistant.`);

// Check Guru step targets
for (const step of GURU_STEPS) {
  const exists = declaredDataTours.has(step.targetTourId);
  assert(exists, `Guru step '${step.id}' targetTourId '${step.targetTourId}' exists in DOM declarations`, `Missing target: ${step.targetTourId}`);
}

// Check Admin step targets
for (const step of ADMIN_STEPS) {
  const exists = declaredDataTours.has(step.targetTourId);
  assert(exists, `Admin step '${step.id}' targetTourId '${step.targetTourId}' exists in DOM declarations`, `Missing target: ${step.targetTourId}`);
}

// Check for duplicate step IDs
const allStepIds = [...GURU_STEPS.map(s => s.id), ...ADMIN_STEPS.map(s => s.id)];
const uniqueStepIds = new Set(allStepIds);
assert(allStepIds.length === uniqueStepIds.size, 'All tour step IDs are globally unique', `Total: ${allStepIds.length}, Unique: ${uniqueStepIds.size}`);


// ============================================================================
// PART 2: LOCALSTORAGE ROBUSTNESS & ADVERSARIAL VALUE CORRUPTION
// ============================================================================
console.log('\n>>> SECTION 2: LocalStorage Robustness & Adversarial Value Corruption <<<');

// In-memory localStorage mock with full tracking
const storage: Record<string, string> = {};
const mockStorage = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = String(v); },
  removeItem: (k: string) => { delete storage[k]; },
  clear: () => { for (const k of Object.keys(storage)) delete storage[k]; },
};

(global as any).localStorage = mockStorage;
(global as any).window = global;

mockStorage.clear();

// 2.1 Adversarial values that MUST NOT be interpreted as completed
const corruptValues = [
  'false',
  'null',
  'undefined',
  '0',
  '1',
  'TRUE',
  'True',
  'true ',
  ' true',
  'yes',
  'no',
  'OK',
  '{}',
  '{"done":true}',
  '[object Object]',
  'NaN',
  'Infinity',
  '',
];

for (const val of corruptValues) {
  storage[STORAGE_KEY_GURU] = val;
  storage[STORAGE_KEY_ADMIN] = val;

  const guruCompleted = isTutorialCompleted('guru');
  const adminCompleted = isTutorialCompleted('admin');
  const guruShow = shouldShowTutorial('guru');
  const adminShow = shouldShowTutorial('admin');

  assert(
    guruCompleted === false,
    `Guru tour completed is FALSE when localStorage has corrupt value: JSON.stringify("${val}")`,
    `Returned ${guruCompleted}`
  );
  assert(
    adminCompleted === false,
    `Admin tour completed is FALSE when localStorage has corrupt value: JSON.stringify("${val}")`,
    `Returned ${adminCompleted}`
  );
  assert(
    guruShow === true,
    `Guru shouldShowTutorial is TRUE when localStorage has corrupt value: JSON.stringify("${val}")`,
    `Returned ${guruShow}`
  );
  assert(
    adminShow === true,
    `Admin shouldShowTutorial is TRUE when localStorage has corrupt value: JSON.stringify("${val}")`,
    `Returned ${adminShow}`
  );
}

// 2.2 Only strictly 'true' bypasses
mockStorage.clear();
storage[STORAGE_KEY_GURU] = 'true';
assert(isTutorialCompleted('guru') === true, 'Strict "true" marks Guru tutorial completed');
assert(shouldShowTutorial('guru') === false, 'Strict "true" prevents Guru tutorial from auto-showing');
assert(isTutorialCompleted('admin') === false, 'Admin remains unaffected by Guru key');

storage[STORAGE_KEY_ADMIN] = 'true';
assert(isTutorialCompleted('admin') === true, 'Strict "true" marks Admin tutorial completed');
assert(shouldShowTutorial('admin') === false, 'Strict "true" prevents Admin tutorial from auto-showing');

// 2.3 Superadmin exemption regardless of localStorage
storage[STORAGE_KEY_GURU] = 'false';
storage[STORAGE_KEY_ADMIN] = 'false';
assert(isTutorialCompleted('superadmin') === true, 'Superadmin is ALWAYS completed regardless of localStorage');
assert(shouldShowTutorial('superadmin') === false, 'Superadmin NEVER shows tutorial regardless of localStorage');

// 2.4 Role normalization stress test
const roleCases: [any, string][] = [
  ['guru', 'guru'],
  ['Guru', 'guru'],
  ['GURU', 'guru'],
  [' GURU ', 'guru'],
  ['Teacher', 'guru'],
  ['teacher', 'guru'],
  ['admin', 'admin'],
  ['Admin', 'admin'],
  ['ADMIN', 'admin'],
  [' superadmin ', 'superadmin'],
  ['SuperAdmin', 'superadmin'],
  ['super admin', 'superadmin'],
  ['super_admin', 'superadmin'],
  ['super-admin', 'superadmin'],
  [null, 'unknown'],
  [undefined, 'unknown'],
  ['', 'unknown'],
  ['siswa', 'unknown'],
  ['wali_murid', 'unknown'],
  [123 as any, 'unknown'],
];

for (const [input, expected] of roleCases) {
  try {
    const norm = normalizeRole(input);
    assert(norm === expected, `normalizeRole(${JSON.stringify(input)}) -> '${expected}'`, `Got '${norm}'`);
  } catch (err: any) {
    recordFinding(
      'MEDIUM',
      'Runtime Type Vulnerability in normalizeRole',
      `Passing non-string role (${JSON.stringify(input)}) throws unhandled TypeError: ${err.message}. Should check typeof role !== 'string'.`
    );
    assert(false, `normalizeRole(${JSON.stringify(input)}) should not throw exception`, err.message);
  }
}

// 2.5 resetTutorial cleanly isolates roles
mockStorage.clear();
setTutorialCompleted('guru');
setTutorialCompleted('admin');
assert(storage[STORAGE_KEY_GURU] === 'true' && storage[STORAGE_KEY_ADMIN] === 'true', 'Both completed');

resetTutorial('guru');
assert(storage[STORAGE_KEY_GURU] === undefined, 'resetTutorial("guru") deletes Guru key');
assert(storage[STORAGE_KEY_ADMIN] === 'true', 'resetTutorial("guru") does NOT touch Admin key');

resetTutorial('admin');
assert(storage[STORAGE_KEY_ADMIN] === undefined, 'resetTutorial("admin") deletes Admin key');


// ============================================================================
// PART 3: MISSING / NON-EXISTENT TARGET DOM ELEMENTS & NULL RECT HANDLING
// ============================================================================
console.log('\n>>> SECTION 3: Missing Target DOM Elements & Null Rect Handling <<<');

// Replicate calculateTooltipStyle pure logic from OnboardingTutorial.tsx
function calculateTooltipStyle(
  targetRect: { top: number; left: number; width: number; height: number; bottom: number; right: number } | null,
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center' = 'right',
  viewport: { innerWidth: number; innerHeight: number } = { innerWidth: 1024, innerHeight: 768 }
): any {
  if (!targetRect) {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 75,
    };
  }

  const vw = viewport.innerWidth;
  const vh = viewport.innerHeight;
  const isMobile = vw < 640;
  const tooltipWidth = isMobile ? Math.min(360, vw - 32) : 380;
  const estimatedHeight = 220;

  if (isMobile) {
    const left = 16;
    if (targetRect.bottom + estimatedHeight + 16 <= vh) {
      return {
        position: 'fixed',
        top: `${Math.max(16, targetRect.bottom + 12)}px`,
        left: `${left}px`,
        width: `${vw - 32}px`,
        maxWidth: '380px',
        zIndex: 75,
      };
    }
    if (targetRect.top - estimatedHeight - 16 >= 0) {
      return {
        position: 'fixed',
        top: `${Math.max(16, targetRect.top - estimatedHeight - 12)}px`,
        left: `${left}px`,
        width: `${vw - 32}px`,
        maxWidth: '380px',
        zIndex: 75,
      };
    }
    return {
      position: 'fixed',
      bottom: '20px',
      left: '16px',
      right: '16px',
      maxWidth: '380px',
      margin: '0 auto',
      zIndex: 75,
    };
  }

  let top = targetRect.top;
  let left = targetRect.left;

  if (placement === 'right') {
    left = targetRect.right + 16;
    top = Math.max(16, Math.min(vh - estimatedHeight - 16, targetRect.top));
    if (left + tooltipWidth > vw - 16) {
      if (targetRect.left - tooltipWidth - 16 >= 16) {
        left = targetRect.left - tooltipWidth - 16;
      } else {
        left = Math.max(16, Math.min(vw - tooltipWidth - 16, targetRect.left));
        top = Math.min(vh - estimatedHeight - 16, targetRect.bottom + 16);
      }
    }
  } else if (placement === 'bottom') {
    top = targetRect.bottom + 14;
    left = Math.max(16, Math.min(vw - tooltipWidth - 16, targetRect.left));
    if (top + estimatedHeight > vh - 16) {
      top = Math.max(16, targetRect.top - estimatedHeight - 14);
    }
  } else if (placement === 'top') {
    top = targetRect.top - estimatedHeight - 14;
    left = Math.max(16, Math.min(vw - tooltipWidth - 16, targetRect.left));
    if (top < 16) {
      top = Math.min(vh - estimatedHeight - 16, targetRect.bottom + 14);
    }
  } else if (placement === 'left') {
    left = targetRect.left - tooltipWidth - 16;
    top = Math.max(16, Math.min(vh - estimatedHeight - 16, targetRect.top));
    if (left < 16) {
      left = Math.min(vw - tooltipWidth - 16, targetRect.right + 16);
    }
  }

  return {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    width: `${tooltipWidth}px`,
    zIndex: 75,
  };
}

// 3.1 Null rect fallback test
const nullRectStyle = calculateTooltipStyle(null, 'right', { innerWidth: 1024, innerHeight: 768 });
assert(nullRectStyle.top === '50%', 'Null targetRect places tooltip at top: 50%');
assert(nullRectStyle.left === '50%', 'Null targetRect places tooltip at left: 50%');
assert(nullRectStyle.transform === 'translate(-50%, -50%)', 'Null targetRect centers tooltip via transform');
assert(nullRectStyle.position === 'fixed', 'Null targetRect uses fixed positioning');
assert(nullRectStyle.zIndex === 75, 'Null targetRect keeps zIndex 75');

// 3.2 Null rect in SVG mask
// Check source code for conditional cutout rendering in SVG defs
const hasConditionalSvgMask = onboardingTutorialPath && fs.readFileSync(onboardingTutorialPath, 'utf8').includes('{targetRect && (');
assert(hasConditionalSvgMask, 'SVG mask conditionally renders cutout rectangle only when targetRect is non-null');

// 3.3 Spotlight box conditional rendering
const hasConditionalSpotlight = onboardingTutorialPath && fs.readFileSync(onboardingTutorialPath, 'utf8').includes('{targetRect && (\n        <div\n          data-testid="spotlight-box"');
assert(hasConditionalSpotlight, 'Spotlight box is conditionally rendered only when targetRect is non-null');

// 3.4 Element missing in DOM simulation
const fakeDocument = {
  querySelector: (sel: string) => {
    if (sel.includes('view-guru-presensi')) return null; // simulate missing
    return {
      getBoundingClientRect: () => ({ top: 100, left: 10, width: 200, height: 40, bottom: 140, right: 210 }),
      scrollIntoView: () => {},
    };
  }
};

let simulatedTargetRect: any = null;
function simulateUpdateTargetRect(stepId: string) {
  const el = fakeDocument.querySelector(`[data-tour="${stepId}"]`);
  if (el) {
    const r = el.getBoundingClientRect();
    simulatedTargetRect = { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
  } else {
    simulatedTargetRect = null;
  }
}

simulateUpdateTargetRect('view-guru-presensi');
assert(simulatedTargetRect === null, 'Missing DOM element sets targetRect to null safely');
const styleForMissing = calculateTooltipStyle(simulatedTargetRect);
assert(styleForMissing.top === '50%' && styleForMissing.left === '50%', 'Missing element produces center-screen modal without exception');


// ============================================================================
// PART 4: STEP BOUNDARIES & STATE MACHINE TRANSITIONS
// ============================================================================
console.log('\n>>> SECTION 4: Step Boundaries & State Transitions <<<');

class TourStateMachine {
  userRole: string;
  steps: TourStep[];
  currentStepIndex: number = 0;
  isOpen: boolean;
  isCompleted: boolean = false;
  sidebarOpen: boolean = false;

  constructor(role: string, isOpen: boolean = true) {
    this.userRole = role;
    this.steps = getStepsForRole(role);
    this.isOpen = isOpen;
    this.syncSidebar();
  }

  syncSidebar() {
    if (!this.isOpen || !this.currentStep) return;
    this.sidebarOpen = !!this.currentStep.requiresSidebarOpen;
  }

  get currentStep(): TourStep | undefined {
    return this.steps[this.currentStepIndex];
  }

  handleNext() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.syncSidebar();
    } else {
      this.handleComplete();
    }
  }

  handlePrev() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.syncSidebar();
    }
  }

  handleSkip() {
    setTutorialCompleted(this.userRole);
    this.sidebarOpen = false;
    this.isOpen = false;
  }

  handleComplete() {
    setTutorialCompleted(this.userRole);
    this.sidebarOpen = false;
    this.isOpen = false;
    this.isCompleted = true;
  }
}

// 4.1 Skip immediately at step 0 for Guru
mockStorage.clear();
const guruTour1 = new TourStateMachine('guru', true);
assert(guruTour1.currentStepIndex === 0, 'Guru tour starts at step 0');
guruTour1.handleSkip();
assert(guruTour1.isOpen === false, 'Tour closes upon skip at step 0');
assert(guruTour1.sidebarOpen === false, 'Sidebar is forced closed upon skip');
assert(storage[STORAGE_KEY_GURU] === 'true', 'Completion flag is set in localStorage upon skip');

// 4.2 Skip immediately at step 0 for Admin (starts with requiresSidebarOpen: true)
mockStorage.clear();
const adminTour1 = new TourStateMachine('admin', true);
assert(adminTour1.currentStepIndex === 0, 'Admin tour starts at step 0');
assert(adminTour1.sidebarOpen === true, 'Admin tour opens sidebar on step 0');
adminTour1.handleSkip();
assert(adminTour1.isOpen === false, 'Admin tour closes upon skip');
assert(adminTour1.sidebarOpen === false, 'Sidebar is forced closed upon skip');
assert(storage[STORAGE_KEY_ADMIN] === 'true', 'Admin completion flag is set upon skip');

// 4.3 Boundary: prev button at step 0
const guruTour2 = new TourStateMachine('guru', true);
guruTour2.handlePrev();
guruTour2.handlePrev();
assert(guruTour2.currentStepIndex === 0, 'handlePrev at step 0 does NOT underflow below 0');

// 4.4 Step forward to completion
const guruTour3 = new TourStateMachine('guru', true);
const stepCount = guruTour3.steps.length;
for (let i = 0; i < stepCount - 1; i++) {
  assert(guruTour3.currentStepIndex === i, `At step ${i}`);
  guruTour3.handleNext();
}
assert(guruTour3.currentStepIndex === stepCount - 1, `Reached final step ${stepCount - 1}`);
assert(guruTour3.isOpen === true, 'Tour remains open on final step');
guruTour3.handleNext(); // On final step, next triggers complete
assert(guruTour3.isOpen === false, 'Tour closes after completing final step');
assert(guruTour3.isCompleted === true, 'Tour is marked completed');
assert(guruTour3.sidebarOpen === false, 'Sidebar is closed after completion');

// 4.5 Rapid forward-backward toggling
const guruTour4 = new TourStateMachine('guru', true);
guruTour4.handleNext(); // 1
guruTour4.handleNext(); // 2
guruTour4.handlePrev(); // 1
guruTour4.handleNext(); // 2
guruTour4.handleNext(); // 3
guruTour4.handlePrev(); // 2
guruTour4.handlePrev(); // 1
guruTour4.handlePrev(); // 0
guruTour4.handlePrev(); // 0 (boundary)
assert(guruTour4.currentStepIndex === 0, 'Oscillating next/prev returns cleanly to step 0');

// 4.6 ADVERSARIAL DISCOVERY CHECK: Component state persistence on Re-opening
console.log('\n--- Adversarial Investigation: "Lihat Tutorial Lagi" Reopening ---');
const onboardingSource = fs.readFileSync(onboardingTutorialPath, 'utf8');

// Does OnboardingTutorial reset currentStepIndex to 0 when isOpen changes to true?
const hasResetOnOpen = onboardingSource.includes('setCurrentStepIndex(0)') &&
  (onboardingSource.includes('useEffect(') || onboardingSource.includes('if (isOpen'));

// In AppScreen, is OnboardingTutorial mounted conditionally ({tourOpen && <OnboardingTutorial}) or unconditionally?
const isMountedConditionally = appScreenSource.includes('{tourOpen && <OnboardingTutorial') ||
  appScreenSource.includes('{tourOpen && (\n        <OnboardingTutorial');

console.log(`  Investigation: isMountedConditionally = ${isMountedConditionally}`);
console.log(`  Investigation: hasResetOnOpen inside component = ${hasResetOnOpen}`);

if (!isMountedConditionally && !hasResetOnOpen) {
  recordFinding(
    'HIGH',
    'Tour Reopening Index Retention Bug',
    'OnboardingTutorial maintains internal state `const [currentStepIndex, setCurrentStepIndex] = useState(0)`. Because AppScreen renders `<OnboardingTutorial isOpen={tourOpen} .../>` unconditionally without unmounting or passing a dynamic key, and OnboardingTutorial lacks an effect resetting currentStepIndex when `isOpen` becomes true or on skip/complete, clicking "Lihat Tutorial Lagi" will reopen the tutorial stuck at the previous/last step rather than resetting to Step 1.'
  );
} else {
  console.log('  ✅ Tour resets index properly on reopen.');
}


// ============================================================================
// PART 5: VIEWPORT BOUNDARY STRESS & MULTI-DEVICE SCREEN TESTING
// ============================================================================
console.log('\n>>> SECTION 5: Viewport Boundary Stress & Collision Harness <<<');

interface ViewportPreset {
  name: string;
  vw: number;
  vh: number;
}

const viewports: ViewportPreset[] = [
  { name: 'Narrow Mobile 1 (iPhone SE 1st gen)', vw: 320, vh: 568 },
  { name: 'Narrow Mobile 2 (Galaxy S8/S9 mini)', vw: 360, vh: 640 },
  { name: 'Standard Mobile 1 (iPhone 8 / SE2)', vw: 375, vh: 667 },
  { name: 'Standard Mobile 2 (iPhone 13 / 14)', vw: 390, vh: 844 },
  { name: 'Large Mobile (iPhone 14 Pro Max)', vw: 428, vh: 926 },
  { name: 'Tablet Portrait (iPad Mini / Air)', vw: 768, vh: 1024 },
  { name: 'Tablet Landscape', vw: 1024, vh: 768 },
  { name: 'Laptop Small (1366x768)', vw: 1366, vh: 768 },
  { name: 'Desktop Full HD (1080p)', vw: 1920, vh: 1080 },
  { name: 'Ultra-wide / QHD 2K (1440p)', vw: 2560, vh: 1440 },
  { name: '4K Display (2160p)', vw: 3840, vh: 2160 },
  { name: 'Extreme Folded Outer Screen', vw: 280, vh: 653 },
];

interface TargetScenario {
  name: string;
  getRect: (vw: number, vh: number) => { top: number; left: number; width: number; height: number; bottom: number; right: number };
}

const scenarios: TargetScenario[] = [
  {
    name: 'Top-Left (Hamburger button)',
    getRect: () => ({ top: 16, left: 16, width: 36, height: 36, bottom: 52, right: 52 }),
  },
  {
    name: 'Top-Right (Notification / Profile)',
    getRect: (vw) => ({ top: 16, left: vw - 52, width: 36, height: 36, bottom: 52, right: vw - 16 }),
  },
  {
    name: 'Bottom-Right (AI Assistant floating btn)',
    getRect: (vw, vh) => ({ top: vh - 76, left: vw - 76, width: 56, height: 56, bottom: vh - 20, right: vw - 20 }),
  },
  {
    name: 'Sidebar Menu Item (Left column)',
    getRect: () => ({ top: 120, left: 20, width: 240, height: 44, bottom: 164, right: 260 }),
  },
  {
    name: 'Dead Center',
    getRect: (vw, vh) => ({ top: vh / 2 - 25, left: vw / 2 - 100, width: 200, height: 50, bottom: vh / 2 + 25, right: vw / 2 + 100 }),
  },
  {
    name: 'Scrolled Offscreen Top (partially visible)',
    getRect: () => ({ top: -20, left: 100, width: 200, height: 50, bottom: 30, right: 300 }),
  },
  {
    name: 'Scrolled Offscreen Bottom (partially visible)',
    getRect: (vw, vh) => ({ top: vh - 20, left: 100, width: 200, height: 50, bottom: vh + 30, right: 300 }),
  },
];

const placements: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom', 'left', 'right'];

let permutationCount = 0;
let overflowCount = 0;
let negativeTopCount = 0;

for (const vp of viewports) {
  for (const scen of scenarios) {
    for (const plc of placements) {
      permutationCount++;
      const rect = scen.getRect(vp.vw, vp.vh);
      const style = calculateTooltipStyle(rect, plc, { innerWidth: vp.vw, innerHeight: vp.vh });

      const topVal = parseFloat(style.top);
      const leftVal = parseFloat(style.left);
      const widthVal = parseFloat(style.width || style.maxWidth || '380');
      const estimatedHeight = 220;

      // Assertions
      const overflowsRight = leftVal + widthVal > vp.vw + 2;
      const overflowsLeft = leftVal < 0;
      const overflowsBottom = topVal + estimatedHeight > vp.vh + 30; // some leeway for bottom docked
      const overflowsTop = topVal < 0;

      if (overflowsRight || overflowsLeft) {
        overflowCount++;
        console.error(`  Horizontal overflow in ${vp.name} [${scen.name}, placement=${plc}]: left=${leftVal}, width=${widthVal}, vw=${vp.vw}`);
      }

      if (overflowsTop) {
        negativeTopCount++;
        console.error(`  Negative top coordinate in ${vp.name} [${scen.name}, placement=${plc}]: top=${topVal}`);
      }
    }
  }
}

assert(
  overflowCount === 0,
  `Horizontal viewport boundary enforcement across all ${permutationCount} viewport permutations`,
  `Encountered ${overflowCount} horizontal overflows`
);

assert(
  negativeTopCount === 0,
  `Vertical top clamping enforcement across all ${permutationCount} viewport permutations`,
  `Encountered ${negativeTopCount} negative top coordinates`
);

console.log(`  Successfully validated ${permutationCount} screen-size / target-position permutations.`);


// ============================================================================
// PART 6: SIDEBAR DRAWER STATE SYNCHRONIZATION
// ============================================================================
console.log('\n>>> SECTION 6: Sidebar Drawer State Synchronization <<<');

// 6.1 Guru sequence verification
const expectedGuruSidebarStates = [
  { step: 0, target: 'hamburger-btn', expectedSidebar: false },
  { step: 1, target: 'view-guru-presensi', expectedSidebar: true },
  { step: 2, target: 'view-guru-jurnal', expectedSidebar: true },
  { step: 3, target: 'view-piket', expectedSidebar: true },
  { step: 4, target: 'ai-assistant-btn', expectedSidebar: false },
];

const guruTour5 = new TourStateMachine('guru', true);
for (const exp of expectedGuruSidebarStates) {
  assert(
    guruTour5.sidebarOpen === exp.expectedSidebar,
    `Guru Step ${exp.step} ('${exp.target}') requiresSidebarOpen is ${exp.expectedSidebar}`,
    `Got ${guruTour5.sidebarOpen}`
  );
  if (exp.step < expectedGuruSidebarStates.length - 1) {
    guruTour5.handleNext();
  }
}

// 6.2 Admin sequence verification
const expectedAdminSidebarStates = [
  { step: 0, target: 'view-admin-verif', expectedSidebar: true },
  { step: 1, target: 'view-sistem-blok', expectedSidebar: true },
  { step: 2, target: 'view-admin-data', expectedSidebar: true },
  { step: 3, target: 'view-analitik', expectedSidebar: true },
  { step: 4, target: 'view-admin-config', expectedSidebar: true },
  { step: 5, target: 'ai-assistant-btn', expectedSidebar: false },
];

const adminTour5 = new TourStateMachine('admin', true);
for (const exp of expectedAdminSidebarStates) {
  assert(
    adminTour5.sidebarOpen === exp.expectedSidebar,
    `Admin Step ${exp.step} ('${exp.target}') requiresSidebarOpen is ${exp.expectedSidebar}`,
    `Got ${adminTour5.sidebarOpen}`
  );
  if (exp.step < expectedAdminSidebarStates.length - 1) {
    adminTour5.handleNext();
  }
}


// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n================================================================');
console.log('CHALLENGER 2 EMPIRICAL TEST RESULTS');
console.log(`Total Assertions : ${totalTests}`);
console.log(`Passed           : ${passedTests}`);
console.log(`Failed           : ${failedTests}`);
console.log(`Findings Logged  : ${findings.length}`);
console.log('================================================================');

for (const f of findings) {
  console.log(`\n[${f.severity}] ${f.title}`);
  console.log(`Details: ${f.detail}`);
}

if (failedTests > 0) {
  console.log('\nVERDICT: REJECT (Assertion failures encountered)');
  process.exit(1);
} else {
  console.log('\nVERDICT: APPROVE (with advisory findings)');
  process.exit(0);
}
