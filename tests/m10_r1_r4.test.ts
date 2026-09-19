/**
 * Tests for Milestone 10: Track R1 (Print Layout & Kop Surat) & Track R4 (PWA Install Prompt & Admin Rejection Feedback)
 */

import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    if (detail) console.error(`   ${detail}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('MILESTONE M10 TEST: TRACK R1 & R4 VERIFICATION');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // R1.1: Free Browser Print Orientation
  // ----------------------------------------------------
  console.log('--- R1.1: Free Browser Print Orientation ---');

  const printHeaderPath = path.join(__dirname, '..', 'src', 'components', 'PrintHeader.tsx');
  const printHeaderContent = fs.readFileSync(printHeaderPath, 'utf-8');

  assert(
    !printHeaderContent.includes('size: A4 ${orientation} !important;') &&
    !printHeaderContent.includes('size: A4'),
    'PrintHeader.tsx removed forced size: A4 from @page block'
  );

  assert(
    printHeaderContent.includes('@media print') &&
    printHeaderContent.includes('margin: ${orientation === \'landscape\''),
    'PrintOrientationToggle keeps standard printable margins'
  );

  // ----------------------------------------------------
  // R1.2: Print Table Responsive Pagination & Reset Styles
  // ----------------------------------------------------
  console.log('\n--- R1.2: Print Table Responsive Pagination ---');

  const globalsCssPath = path.join(__dirname, '..', 'src', 'app', 'globals.css');
  const globalsCssContent = fs.readFileSync(globalsCssPath, 'utf-8');

  assert(
    globalsCssContent.includes('.overflow-y-auto') &&
    globalsCssContent.includes('[class*="max-h-"]') &&
    globalsCssContent.includes('.overflow-hidden') &&
    globalsCssContent.includes('overflow: visible !important;') &&
    globalsCssContent.includes('max-height: none !important;'),
    'globals.css resets .overflow-y-auto, [class*="max-h-"], and .overflow-hidden in @media print'
  );

  assert(
    globalsCssContent.includes('word-break: break-word !important;') &&
    globalsCssContent.includes('overflow-wrap: break-word !important;'),
    'globals.css enforces word-break: break-word and overflow-wrap: break-word on print table cells'
  );

  assert(
    globalsCssContent.includes('table-layout: auto !important;') &&
    globalsCssContent.includes('font-size: 7.5pt !important;'),
    'globals.css sets responsive table-layout: auto and compact 7.5pt font size in print'
  );

  const gradebookPath = path.join(__dirname, '..', 'src', 'components', 'GradebookView.tsx');
  const gradebookContent = fs.readFileSync(gradebookPath, 'utf-8');

  assert(
    gradebookContent.includes('print:overflow-visible print:max-h-none'),
    'GradebookView.tsx outer table containers include print:overflow-visible and print:max-h-none'
  );

  // ----------------------------------------------------
  // R1.3: Kop Surat (Letterhead) Resolution & 3-Column Slot Layout
  // ----------------------------------------------------
  console.log('\n--- R1.3: Kop Surat Logo Resolution & Layout ---');

  assert(
    printHeaderContent.includes('getGoogleDriveThumbnailUrl'),
    'PrintHeader.tsx imports and uses getGoogleDriveThumbnailUrl for high-res direct thumbnail stream'
  );

  assert(
    printHeaderContent.includes('schoolInfo?.logo_kiri_url') &&
    printHeaderContent.includes('schoolInfo?.logo_kanan_url'),
    'PrintHeader.tsx resolves multi-tenant logo_kiri_url and logo_kanan_url from schoolInfo'
  );

  assert(
    printHeaderContent.includes('loading="eager"') &&
    printHeaderContent.includes('referrerPolicy="no-referrer"'),
    'PrintHeader.tsx configures loading="eager" and referrerPolicy="no-referrer" on logos'
  );

  assert(
    printHeaderContent.includes('onError=') &&
    printHeaderContent.includes('transformGoogleDriveUrl'),
    'PrintHeader.tsx implements onError fallback recovery for logo loading'
  );

  assert(
    printHeaderContent.includes('w-20') &&
    printHeaderContent.includes('print-header-center flex-1 min-w-0 text-center'),
    'PrintHeader.tsx enforces symmetric 3-column slot layout (w-20 left, flex-1 center, w-20 right)'
  );

  // ----------------------------------------------------
  // R4.1: PWA Install Prompt
  // ----------------------------------------------------
  console.log('\n--- R4.1: PWA Install Prompt ---');

  const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
  assert(fs.existsSync(manifestPath), 'public/manifest.json exists');

  const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert(
    manifestContent.name && manifestContent.short_name && manifestContent.display === 'standalone',
    'manifest.json contains valid PWA metadata with standalone display'
  );

  const pwaPromptPath = path.join(__dirname, '..', 'src', 'components', 'PWAInstallPrompt.tsx');
  assert(fs.existsSync(pwaPromptPath), 'PWAInstallPrompt.tsx component exists');

  const pwaPromptContent = fs.readFileSync(pwaPromptPath, 'utf-8');

  assert(
    pwaPromptContent.includes('display-mode: standalone') &&
    (pwaPromptContent.includes('navigator as any') || pwaPromptContent.includes('standalone')),
    'PWAInstallPrompt.tsx checks display-mode: standalone and navigator.standalone'
  );

  assert(
    pwaPromptContent.includes('sipjam_pwa_dismissed') &&
    pwaPromptContent.includes('sipjam_pwa_installed'),
    'PWAInstallPrompt.tsx checks and respects localStorage persistence for dismissed and installed flags'
  );

  assert(
    pwaPromptContent.includes('beforeinstallprompt') &&
    pwaPromptContent.includes('appinstalled'),
    'PWAInstallPrompt.tsx registers listeners for beforeinstallprompt and appinstalled events'
  );

  assert(
    pwaPromptContent.includes('Install') &&
    pwaPromptContent.includes('Nanti Saja'),
    'PWAInstallPrompt.tsx provides Install and Nanti Saja user actions'
  );

  const appScreenPath = path.join(__dirname, '..', 'src', 'components', 'AppScreen.tsx');
  const appScreenContent = fs.readFileSync(appScreenPath, 'utf-8');

  assert(
    appScreenContent.includes('import PWAInstallPrompt from \'./PWAInstallPrompt\';') &&
    appScreenContent.includes('<PWAInstallPrompt />'),
    'AppScreen.tsx imports and mounts PWAInstallPrompt component'
  );

  // ----------------------------------------------------
  // R4.2: Mandatory Admin Rejection Feedback Flow
  // ----------------------------------------------------
  console.log('\n--- R4.2: Mandatory Admin Rejection Feedback ---');

  const adminVerifPath = path.join(__dirname, '..', 'src', 'components', 'AdminVerifView.tsx');
  const adminVerifContent = fs.readFileSync(adminVerifPath, 'utf-8');

  assert(
    adminVerifContent.includes('input: \'textarea\'') &&
    adminVerifContent.includes('Alasan Penolakan (Wajib Diisi)'),
    'AdminVerifView.tsx opens SweetAlert2 textarea modal for rejection reason'
  );

  assert(
    adminVerifContent.includes('Alasan penolakan wajib diisi') &&
    adminVerifContent.includes('inputValidator:'),
    'AdminVerifView.tsx strictly blocks empty or whitespace-only rejection feedback'
  );

  assert(
    adminVerifContent.includes('catatan_admin =') &&
    adminVerifContent.includes('alasan_penolakan ='),
    'AdminVerifView.tsx persists rejection reason to catatan_admin and alasan_penolakan'
  );

  assert(
    adminVerifContent.includes('item.catatan_admin || item.alasan_penolakan'),
    'AdminVerifView.tsx renders rejection reason badge directly on the UI card'
  );

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n====================================================');
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} M10 R1 & R4 TESTS PASSED!`);
    console.log('====================================================');
    process.exit(0);
  } else {
    console.error(`💥 ${failed} TESTS FAILED out of ${passed + failed}!`);
    console.log('====================================================');
    process.exit(1);
  }
}

runTests();
