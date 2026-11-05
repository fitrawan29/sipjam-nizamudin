/**
 * Test Suite: AI Assistant Floating Button Visibility Toggle (Sembunyikan/Tampilkan)
 * Run: npx tsx tests/ai_assistant_toggle_visibility.test.ts
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { AIAssistant } from '../src/components/AIAssistant';
import AccountSettingsModal from '../src/components/AccountSettingsModal';
import ClaySidebar from '../src/components/ClaySidebar';
import fs from 'fs';
import path from 'path';

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
  console.log(' RUNNING AI ASSISTANT TOGGLE VISIBILITY TESTS');
  console.log('====================================================\n');

  // Test 1: Default Visibility in SSR is true
  console.log('Test Group 1: Default Visibility');
  const defaultHtml = renderToString(
    React.createElement(AIAssistant, {
      currentView: 'view-home',
      user: { nama: 'Fitra Nizam', role: 'guru' }
    })
  );
  assert(
    defaultHtml.includes('data-tour="ai-assistant-btn"'),
    'Default AIAssistant renders the trigger button with data-tour="ai-assistant-btn"'
  );
  assert(
    defaultHtml.includes('fa-robot'),
    'Default AIAssistant contains Font Awesome robot icon'
  );
  assert(
    defaultHtml.includes('title="Sembunyikan tombol asisten"'),
    'Default AIAssistant contains quick-hide dismiss button'
  );

  // Test 2: Explicit visible=false hides the button
  console.log('\nTest Group 2: Explicit visible=false');
  const hiddenHtml = renderToString(
    React.createElement(AIAssistant, {
      currentView: 'view-home',
      user: { nama: 'Fitra Nizam', role: 'guru' },
      visible: false
    })
  );
  assert(
    !hiddenHtml.includes('data-tour="ai-assistant-btn"'),
    'When visible=false, trigger button is not rendered in HTML'
  );
  assert(
    !hiddenHtml.includes('Panel Asisten AI SIPJAM'),
    'When visible=false, chat dialog is not rendered in HTML'
  );

  // Test 3: Explicit visible=true displays the button
  console.log('\nTest Group 3: Explicit visible=true');
  const explicitVisibleHtml = renderToString(
    React.createElement(AIAssistant, {
      currentView: 'view-home',
      user: { nama: 'Fitra Nizam', role: 'guru' },
      visible: true
    })
  );
  assert(
    explicitVisibleHtml.includes('data-tour="ai-assistant-btn"'),
    'When visible=true, trigger button is rendered in HTML'
  );

  // Test 4: Chat panel header includes eye-slash hide button
  console.log('\nTest Group 4: Chat Header Controls');
  const openHtml = renderToString(
    React.createElement(AIAssistant, {
      currentView: 'view-home',
      user: { nama: 'Fitra Nizam', role: 'guru' },
      initialOpen: true,
      visible: true
    })
  );
  assert(
    openHtml.includes('fa-eye-slash'),
    'Chat panel header contains fa-eye-slash hide icon'
  );
  assert(
    openHtml.includes('title="Sembunyikan tombol asisten"'),
    'Chat panel header contains button to hide the assistant button'
  );

  // Test 5: AccountSettingsModal contains Section 6 for AI Assistant
  console.log('\nTest Group 5: Account Settings Preference');
  const modalHtml = renderToString(
    React.createElement(AccountSettingsModal, {
      isOpen: true,
      onClose: () => {},
      user: { id: 'usr-1', nama: 'Guru Test', role: 'guru', username: 'gurutest' } as any
    })
  );
  assert(
    modalHtml.includes('Tombol Asisten AI'),
    'AccountSettingsModal includes "Tombol Asisten AI" setting label'
  );
  assert(
    modalHtml.includes('Tampilkan tombol mengambang Asisten AI di sudut kanan bawah aplikasi'),
    'AccountSettingsModal includes descriptive text for the toggle'
  );

  // Test 6: ClaySidebar includes toggle button when onToggleAiAssistant is passed
  console.log('\nTest Group 6: ClaySidebar Component');
  const sidebarHtml = renderToString(
    React.createElement(ClaySidebar, {
      isOpen: true,
      onClose: () => {},
      user: { id: 'usr-1', nama: 'Guru Test', role: 'guru' } as any,
      currentView: 'view-home',
      onNavigate: () => {},
      menuItems: [],
      showAiAssistant: true,
      onToggleAiAssistant: () => {}
    })
  );
  assert(
    sidebarHtml.includes('Sembunyikan Tombol AI'),
    'ClaySidebar renders "Sembunyikan Tombol AI" when showAiAssistant is true'
  );

  const sidebarHiddenHtml = renderToString(
    React.createElement(ClaySidebar, {
      isOpen: true,
      onClose: () => {},
      user: { id: 'usr-1', nama: 'Guru Test', role: 'guru' } as any,
      currentView: 'view-home',
      onNavigate: () => {},
      menuItems: [],
      showAiAssistant: false,
      onToggleAiAssistant: () => {}
    })
  );
  assert(
    sidebarHiddenHtml.includes('Tampilkan Tombol AI'),
    'ClaySidebar renders "Tampilkan Tombol AI" when showAiAssistant is false'
  );

  // Test 7: AppScreen file verification
  console.log('\nTest Group 7: AppScreen Integration Verification');
  const appScreenContent = fs.readFileSync(
    path.join(process.cwd(), 'src/components/AppScreen.tsx'),
    'utf8'
  );
  assert(
    appScreenContent.includes('showAiAssistant') && appScreenContent.includes('setShowAiAssistant'),
    'AppScreen manages showAiAssistant state'
  );
  assert(
    appScreenContent.includes('sipjam_ai_assistant_visible'),
    'AppScreen persists visibility state with localStorage key "sipjam_ai_assistant_visible"'
  );
  assert(
    appScreenContent.includes('sipjam:ai_assistant_visibility'),
    'AppScreen listens to and dispatches "sipjam:ai_assistant_visibility" event'
  );
  assert(
    appScreenContent.includes('Sembunyikan Tombol AI') && appScreenContent.includes('Tampilkan Tombol AI'),
    'AppScreen sidebar includes toggle button for AI Assistant'
  );

  console.log('\n====================================================');
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('✨ ALL AI ASSISTANT TOGGLE VISIBILITY TESTS PASSED! ✨\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
