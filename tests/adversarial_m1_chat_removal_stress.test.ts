/**
 * Adversarial Empirical Verification Test: Milestone 1 (M1)
 * Challenger: challenger_o10_m1_2
 * Focus: Complete and Clean Removal of Chat Guru Feature
 */

import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    if (detail) console.error(`   Detail: ${detail}`);
    failed++;
  }
}

async function runAdversarialM1Suite() {
  console.log('====================================================');
  console.log('ADVERSARIAL CHALLENGER: MILESTONE 1 (M1) VERIFICATION');
  console.log('====================================================\n');

  // 1. Verify ChatView.tsx file does not exist
  console.log('--- Test Group 1: File Deletion Check ---');
  const chatViewPath = path.join(projectRoot, 'src', 'components', 'ChatView.tsx');
  const chatViewExists = fs.existsSync(chatViewPath);
  assert(!chatViewExists, 'ChatView.tsx does not exist in src/components/', `File still found at ${chatViewPath}`);

  // 2. Scan src/ directory for any residual imports or usages of ChatView
  console.log('\n--- Test Group 2: Codebase Reference Scan ---');
  function scanDir(dir: string): string[] {
    const results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const item of list) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...scanDir(fullPath));
      } else if (/\.(tsx?|jsx?)$/.test(item)) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const srcFiles = scanDir(path.join(projectRoot, 'src'));
  const filesWithChatViewImport: string[] = [];
  const filesWithChatViewJSX: string[] = [];

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    // Regex for importing ChatView
    if (/import\s+.*ChatView.*from/i.test(content)) {
      filesWithChatViewImport.push(path.relative(projectRoot, file));
    }
    // Regex for rendering <ChatView
    if (/<ChatView(\s|\/|>)/.test(content)) {
      filesWithChatViewJSX.push(path.relative(projectRoot, file));
    }
  }

  assert(
    filesWithChatViewImport.length === 0,
    'No source files in src/ import ChatView',
    filesWithChatViewImport.join(', ')
  );
  assert(
    filesWithChatViewJSX.length === 0,
    'No source files in src/ render <ChatView />',
    filesWithChatViewJSX.join(', ')
  );

  // 3. Inspect AppScreen.tsx explicitly
  console.log('\n--- Test Group 3: AppScreen.tsx Navigation & Menus Inspection ---');
  const appScreenPath = path.join(projectRoot, 'src', 'components', 'AppScreen.tsx');
  const appScreenContent = fs.readFileSync(appScreenPath, 'utf8');

  // Check imports
  assert(!appScreenContent.includes("from './ChatView'"), "AppScreen does not import from './ChatView'");
  assert(!appScreenContent.includes('ChatView'), 'AppScreen contains no mention of ChatView');

  // Check menuItemsGuru
  const guruMenuMatch = appScreenContent.match(/const\s+menuItemsGuru\s*=\s*\[([\s\S]*?)\];/);
  assert(!!guruMenuMatch, 'AppScreen defines menuItemsGuru array');
  if (guruMenuMatch) {
    const guruMenuContent = guruMenuMatch[1];
    assert(!guruMenuContent.includes('view-chat'), 'menuItemsGuru does not contain view-chat');
    assert(!guruMenuContent.includes('Chat Guru'), 'menuItemsGuru does not contain "Chat Guru" label');
    assert(!guruMenuContent.includes('fa-comments'), 'menuItemsGuru does not contain fa-comments icon');
  }

  // Check menuItemsAdmin
  const adminMenuMatch = appScreenContent.match(/const\s+menuItemsAdmin\s*=\s*\[([\s\S]*?)\];/);
  assert(!!adminMenuMatch, 'AppScreen defines menuItemsAdmin array');
  if (adminMenuMatch) {
    const adminMenuContent = adminMenuMatch[1];
    assert(!adminMenuContent.includes('view-chat'), 'menuItemsAdmin does not contain view-chat');
    assert(!adminMenuContent.includes('Chat Guru'), 'menuItemsAdmin does not contain "Chat Guru" label');
    assert(!adminMenuContent.includes('fa-comments'), 'menuItemsAdmin does not contain fa-comments icon');
  }

  // Check JSX view router
  assert(!appScreenContent.includes("currentView === 'view-chat'"), "AppScreen does not route 'view-chat'");

  // 4. Inspect HomeView.tsx quick actions / shortcuts
  console.log('\n--- Test Group 4: HomeView.tsx Inspection ---');
  const homeViewPath = path.join(projectRoot, 'src', 'components', 'HomeView.tsx');
  const homeViewContent = fs.readFileSync(homeViewPath, 'utf8');
  assert(!homeViewContent.includes('view-chat'), 'HomeView does not link to view-chat');
  assert(!homeViewContent.includes('Chat Guru'), 'HomeView does not mention Chat Guru');

  // Summary
  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialM1Suite().catch(err => {
  console.error('Unhandled failure:', err);
  process.exit(1);
});
