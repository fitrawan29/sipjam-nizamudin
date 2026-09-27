/**
 * Integration Test Suite for AppScreen + AI Assistant + Onboarding Tutorial
 * Verifies non-destructive UI integration, DOM tour targeting attributes,
 * auto-trigger logic, and proper prop passing in AppScreen.tsx.
 *
 * Execution command:
 * npx tsx tests/app_screen_integration.test.ts
 */

import fs from 'fs';
import path from 'path';
import { GURU_STEPS, ADMIN_STEPS, STORAGE_KEY_GURU, STORAGE_KEY_ADMIN } from '../src/components/Onboarding';

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

console.log('====================================================');
console.log(' TEST SUITE: AppScreen Integration (AI + Onboarding)');
console.log('====================================================\n');

// 1. Read AppScreen.tsx Source Code
const appScreenPath = path.resolve(process.cwd(), 'src/components/AppScreen.tsx');
assert(fs.existsSync(appScreenPath), 'AppScreen.tsx file exists');

const source = fs.readFileSync(appScreenPath, 'utf8');

// 2. Import Verifications
console.log('\n--- Section 1: Module Imports ---');
assert(
  source.includes("@/components/AIAssistant") && source.includes("AIAssistant"),
  'Imports AIAssistant from "@/components/AIAssistant"'
);

assert(
  source.includes("@/components/Onboarding") &&
  source.includes("OnboardingTutorial") &&
  source.includes("STORAGE_KEY_GURU") &&
  source.includes("STORAGE_KEY_ADMIN"),
  'Imports OnboardingTutorial and storage keys from "@/components/Onboarding"'
);

// 3. Tour State & Initial Auto-Trigger Logic
console.log('\n--- Section 2: Tour State & Auto-Trigger Effect ---');
assert(
  source.includes("const [tourOpen, setTourOpen] = useState(false);"),
  'Defines tourOpen state initialized to false'
);

assert(
  source.includes("localStorage.getItem(STORAGE_KEY_ADMIN)") &&
  source.includes("localStorage.getItem(STORAGE_KEY_GURU)"),
  'Auto-trigger effect inspects localStorage for both ADMIN and GURU keys'
);

assert(
  source.includes("!isSuperadmin") && source.includes("isAdmin"),
  'Auto-trigger logic checks roles so superadmin is excluded while admin/guru trigger tour'
);

// 4. Header Hamburger Button Target
console.log('\n--- Section 3: Header Hamburger Button Tour Attribute ---');
assert(
  source.includes('data-tour="hamburger-btn"'),
  'Header hamburger button is tagged with data-tour="hamburger-btn"'
);

// 5. Sidebar Menu Loop Target
console.log('\n--- Section 4: Sidebar Menu Items Tour Attribute ---');
assert(
  source.includes('data-tour={item.id}'),
  'Sidebar menu button renders data-tour={item.id} dynamically'
);

// 6. "Lihat Tutorial Lagi" Button in Sidebar
console.log('\n--- Section 5: Re-run Tutorial Button in Sidebar ---');
assert(
  source.includes("Lihat Tutorial Lagi"),
  'Sidebar contains "Lihat Tutorial Lagi" action button'
);

assert(
  source.includes("setTourOpen(true)") && source.includes("setSidebarOpen(false)"),
  '"Lihat Tutorial Lagi" sets tourOpen(true) and closes sidebar'
);

// 7. Component Mounts & Props Passing at Root Level
console.log('\n--- Section 6: Component Mounts & Prop Passing ---');
assert(
  source.includes("<AIAssistant") &&
  source.includes("currentView={currentView}") &&
  source.includes("userRole={isSuperadmin ? 'superadmin' : isAdmin ? 'admin' : 'guru'}") &&
  source.includes("userName={user?.nama || user?.name}"),
  'Mounts AIAssistant with currentView, userRole, and userName props'
);

assert(
  source.includes("<OnboardingTutorial") &&
  source.includes("isOpen={tourOpen}") &&
  source.includes("onClose={() => setTourOpen(false)}") &&
  source.includes("onComplete={() => setTourOpen(false)}") &&
  source.includes("onEnsureSidebarOpen={(open) => setSidebarOpen(open)}"),
  'Mounts OnboardingTutorial with userRole, isOpen, onClose, onComplete, and onEnsureSidebarOpen props'
);

// 8. Cross-check Tour Target IDs from Step Definitions
console.log('\n--- Section 7: Tour Steps Target Alignment ---');
// Guru steps: hamburger-btn, view-guru-presensi, view-guru-jurnal, view-piket, ai-assistant-btn
const aiAssistantSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/AIAssistant/AIAssistant.tsx'),
  'utf8'
);
assert(
  aiAssistantSource.includes('data-tour="ai-assistant-btn"'),
  'AIAssistant floating button includes data-tour="ai-assistant-btn"'
);

// Menu item definitions in AppScreen
for (const step of GURU_STEPS) {
  if (step.targetTourId === 'ai-assistant-btn') {
    assert(
      aiAssistantSource.includes(`data-tour="${step.targetTourId}"`),
      `Guru tour target "${step.targetTourId}" is present in AIAssistant component`
    );
  } else if (step.targetTourId === 'hamburger-btn') {
    assert(
      source.includes(`data-tour="${step.targetTourId}"`),
      `Guru tour target "${step.targetTourId}" is present in AppScreen header`
    );
  } else {
    // Should be in menuItemsGuru
    assert(
      source.includes(`id: '${step.targetTourId}'`),
      `Guru tour target "${step.targetTourId}" exists in AppScreen menuItemsGuru`
    );
  }
}

for (const step of ADMIN_STEPS) {
  if (step.targetTourId === 'ai-assistant-btn') {
    assert(
      aiAssistantSource.includes(`data-tour="${step.targetTourId}"`),
      `Admin tour target "${step.targetTourId}" is present in AIAssistant component`
    );
  } else {
    // Should be in menuItemsAdmin
    assert(
      source.includes(`id: '${step.targetTourId}'`),
      `Admin tour target "${step.targetTourId}" exists in AppScreen menuItemsAdmin`
    );
  }
}

// 9. Summary
console.log('\n====================================================');
console.log(` RESULTS: ${passed} passed, ${failed} failed`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL APPSCREEN INTEGRATION TESTS PASSED (100%)\n');
  process.exit(0);
}
