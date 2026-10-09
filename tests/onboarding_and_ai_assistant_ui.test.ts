import React from 'react';
import { renderToString } from 'react-dom/server';
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
  OnboardingTutorial,
} from '../src/components/Onboarding';
import { AIAssistant } from '../src/components/AIAssistant';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('TEST SUITE: Onboarding Tutorial UI & Logic');
console.log('====================================================\n');

// ----------------------------------------------------
// Section 1: Storage Keys
// ----------------------------------------------------
console.log('--- Section 1: LocalStorage Keys ---');
assert(STORAGE_KEY_GURU === 'sipjam_onboarding_guru_done', `STORAGE_KEY_GURU is '${STORAGE_KEY_GURU}'`);
assert(STORAGE_KEY_ADMIN === 'sipjam_onboarding_admin_done', `STORAGE_KEY_ADMIN is '${STORAGE_KEY_ADMIN}'`);

// ----------------------------------------------------
// Section 2: Role Normalization
// ----------------------------------------------------
console.log('\n--- Section 2: Role Normalization ---');
assert(normalizeRole('Guru') === 'guru', 'Normalizes "Guru" to "guru"');
assert(normalizeRole('guru') === 'guru', 'Normalizes "guru" to "guru"');
assert(normalizeRole('Teacher') === 'guru', 'Normalizes "Teacher" to "guru"');
assert(normalizeRole('Admin') === 'admin', 'Normalizes "Admin" to "admin"');
assert(normalizeRole('admin') === 'admin', 'Normalizes "admin" to "admin"');
assert(normalizeRole('Superadmin') === 'superadmin', 'Normalizes "Superadmin" to "superadmin"');
assert(normalizeRole('super admin') === 'superadmin', 'Normalizes "super admin" to "superadmin"');
assert(normalizeRole(null) === 'unknown', 'Normalizes null to "unknown"');
assert(normalizeRole(undefined) === 'unknown', 'Normalizes undefined to "unknown"');
assert(normalizeRole(123 as any) === 'unknown', 'Normalizes numeric role to "unknown" without throwing');
assert(normalizeRole({} as any) === 'unknown', 'Normalizes object role to "unknown" without throwing');

// ----------------------------------------------------
// Section 3: Guru Flow Steps Verification (Minimum 5 steps)
// ----------------------------------------------------
console.log('\n--- Section 3: Guru Flow Steps ---');
const guruSteps = getStepsForRole('guru');
assert(guruSteps.length >= 5, `Guru flow has >= 5 steps (actual: ${guruSteps.length})`);

const guruTargets = guruSteps.map((s) => s.targetTourId);
assert(guruTargets.includes('hamburger-btn'), 'Guru flow includes "hamburger-btn" target');
assert(guruTargets.includes('view-guru-presensi'), 'Guru flow includes "view-guru-presensi" target');
assert(guruTargets.includes('view-guru-jurnal'), 'Guru flow includes "view-guru-jurnal" target');
assert(guruTargets.includes('view-piket'), 'Guru flow includes "view-piket" target');
assert(guruTargets.includes('ai-assistant-btn'), 'Guru flow includes "ai-assistant-btn" target');

// Verify sidebar coordination flags for Guru
const guruStep1 = guruSteps.find((s) => s.targetTourId === 'hamburger-btn');
assert(guruStep1?.requiresSidebarOpen === false, 'Guru hamburger-btn has requiresSidebarOpen: false');

const guruStep2 = guruSteps.find((s) => s.targetTourId === 'view-guru-presensi');
assert(guruStep2?.requiresSidebarOpen === true, 'Guru presensi step has requiresSidebarOpen: true');

const guruAiStep = guruSteps.find((s) => s.targetTourId === 'ai-assistant-btn');
assert(guruAiStep?.requiresSidebarOpen === false, 'Guru AI assistant step has requiresSidebarOpen: false');

// ----------------------------------------------------
// Section 4: Admin Flow Steps Verification (Minimum 6 steps)
// ----------------------------------------------------
console.log('\n--- Section 4: Admin Flow Steps ---');
const adminSteps = getStepsForRole('admin');
assert(adminSteps.length >= 6, `Admin flow has >= 6 steps (actual: ${adminSteps.length})`);

const adminTargets = adminSteps.map((s) => s.targetTourId);
assert(adminTargets.includes('view-admin-verif'), 'Admin flow includes "view-admin-verif" target');
assert(adminTargets.includes('view-sistem-blok'), 'Admin flow includes "view-sistem-blok" target');
assert(adminTargets.includes('view-admin-data'), 'Admin flow includes "view-admin-data" target');
assert(adminTargets.includes('view-analitik'), 'Admin flow includes "view-analitik" target');
assert(adminTargets.includes('view-admin-config'), 'Admin flow includes "view-admin-config" target');
assert(adminTargets.includes('ai-assistant-btn'), 'Admin flow includes "ai-assistant-btn" target');

// Verify sidebar coordination flags for Admin
const adminStep1 = adminSteps.find((s) => s.targetTourId === 'view-admin-verif');
assert(adminStep1?.requiresSidebarOpen === true, 'Admin verifikasi step has requiresSidebarOpen: true');

const adminAiStep = adminSteps.find((s) => s.targetTourId === 'ai-assistant-btn');
assert(adminAiStep?.requiresSidebarOpen === false, 'Admin AI assistant step has requiresSidebarOpen: false');

// ----------------------------------------------------
// Section 5: Superadmin Exemption
// ----------------------------------------------------
console.log('\n--- Section 5: Superadmin Exemption ---');
const superadminSteps = getStepsForRole('superadmin');
assert(superadminSteps.length === 0, 'Superadmin role receives empty steps (exempt from tour)');

// ----------------------------------------------------
// Section 6: LocalStorage State Machine Simulation
// ----------------------------------------------------
console.log('\n--- Section 6: LocalStorage State Machine Simulation ---');

// Mock localStorage in Node.js environment
const memoryStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => memoryStore[key] ?? null,
  setItem: (key: string, value: string) => {
    memoryStore[key] = String(value);
  },
  removeItem: (key: string) => {
    delete memoryStore[key];
  },
  clear: () => {
    for (const k of Object.keys(memoryStore)) delete memoryStore[k];
  },
};

(global as any).localStorage = mockLocalStorage;
(global as any).window = global;

// Initial state: nothing done
mockLocalStorage.clear();
assert(isTutorialCompleted('guru') === false, 'Initially, guru tutorial is not completed');
assert(isTutorialCompleted('admin') === false, 'Initially, admin tutorial is not completed');
assert(isTutorialCompleted('superadmin') === true, 'Superadmin is always considered completed');

assert(shouldShowTutorial('guru') === true, 'shouldShowTutorial returns true for fresh guru');
assert(shouldShowTutorial('admin') === true, 'shouldShowTutorial returns true for fresh admin');
assert(shouldShowTutorial('superadmin') === false, 'shouldShowTutorial returns false for superadmin');

// Mark guru as completed
setTutorialCompleted('guru');
assert(isTutorialCompleted('guru') === true, 'isTutorialCompleted returns true for guru after completion');
assert(mockLocalStorage.getItem(STORAGE_KEY_GURU) === 'true', 'STORAGE_KEY_GURU is set to "true"');
assert(shouldShowTutorial('guru') === false, 'shouldShowTutorial returns false for completed guru');
assert(shouldShowTutorial('admin') === true, 'Admin remains unaffected and still needs tutorial');

// Reset guru
resetTutorial('guru');
assert(isTutorialCompleted('guru') === false, 'isTutorialCompleted returns false after reset');
assert(shouldShowTutorial('guru') === true, 'shouldShowTutorial returns true after reset');

// Complete admin
setTutorialCompleted('admin');
assert(isTutorialCompleted('admin') === true, 'isTutorialCompleted returns true for admin after completion');
assert(mockLocalStorage.getItem(STORAGE_KEY_ADMIN) === 'true', 'STORAGE_KEY_ADMIN is set to "true"');
assert(shouldShowTutorial('admin') === false, 'shouldShowTutorial returns false for completed admin');

// ----------------------------------------------------
// Section 7: Component SSR Safety & Render Testing
// ----------------------------------------------------
console.log('\n--- Section 7: Component SSR Safety & Render Testing ---');

// 1. Closed state
const closedHtml = renderToString(
  React.createElement(OnboardingTutorial, {
    userRole: 'guru',
    isOpen: false,
    onClose: () => {},
    onComplete: () => {},
  })
);
assert(closedHtml === '', 'Renders nothing when isOpen is false');

// 2. Superadmin state (exempt)
const superadminHtml = renderToString(
  React.createElement(OnboardingTutorial, {
    userRole: 'superadmin',
    isOpen: true,
    onClose: () => {},
    onComplete: () => {},
  })
);
assert(superadminHtml === '', 'Renders nothing for superadmin role even when isOpen is true');

// 3. Open state for Guru
const guruHtml = renderToString(
  React.createElement(OnboardingTutorial, {
    userRole: 'guru',
    isOpen: true,
    onClose: () => {},
    onComplete: () => {},
  })
);
assert(guruHtml.length > 0, 'Renders non-empty HTML for Guru when isOpen is true');
assert(guruHtml.includes('Langkah 1 dari 5'), 'Guru HTML includes "Langkah 1 dari 5" counter badge');
assert(guruHtml.includes('Menu Navigasi'), 'Guru HTML includes Step 1 title "Menu Navigasi"');
assert(guruHtml.includes('Lewati'), 'Guru HTML includes "Lewati" skip action');
assert(guruHtml.includes('Lanjut'), 'Guru HTML includes "Lanjut" next action');

// 4. Open state for Admin
const adminHtml = renderToString(
  React.createElement(OnboardingTutorial, {
    userRole: 'admin',
    isOpen: true,
    onClose: () => {},
    onComplete: () => {},
  })
);
assert(adminHtml.length > 0, 'Renders non-empty HTML for Admin when isOpen is true');
assert(adminHtml.includes('Langkah 1 dari 6'), 'Admin HTML includes "Langkah 1 dari 6" counter badge');
assert(adminHtml.includes('Menu Verifikasi'), 'Admin HTML includes Step 1 title "Menu Verifikasi"');
assert(adminHtml.includes('Lewati'), 'Admin HTML includes "Lewati" skip action');
assert(adminHtml.includes('Lanjut'), 'Admin HTML includes "Lanjut" next action');

// ----------------------------------------------------
// Section 8: AIAssistant Component Props & Styling
// ----------------------------------------------------
console.log('\n--- Section 8: AIAssistant Props & Styling ---');
const assistantHtml = renderToString(
  React.createElement(AIAssistant, {
    currentView: 'view-guru-presensi',
    userRole: 'guru',
    userName: 'Ahmad Zainudin',
  })
);
assert(assistantHtml.includes('z-[45]'), 'AIAssistant button has valid arbitrary class z-[45]');
assert(assistantHtml.includes('data-tour="ai-assistant-btn"'), 'AIAssistant has data-tour="ai-assistant-btn"');

console.log('\n====================================================');
console.log('🎉 ALL ONBOARDING UI & LOGIC TESTS PASSED (100%)');
console.log('====================================================');
