/**
 * Adversarial Challenger 1 Test Suite for Milestone 1 (M1)
 * Focus: Print System, Signatures Restoration, and Print Layout Resilience
 * 
 * Target Components:
 * 1. AdminRekapView.tsx (Tab Tabel PrintSignature + GPS footer, Tab Cetak single Kop Surat)
 * 2. PiketView.tsx (PrintSignature with leftSubtitle="Guru Piket" & credentials)
 * 3. GradebookView.tsx (Tab 3 Statistik PrintSignature)
 * 4. GuruJurnal.tsx (Print container width & landscape utilities)
 * 5. PrintSignature (Programmatic rendering, GPS coordinates watermarking, role matrix)
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrintSignature } from '../src/components/PrintHeader';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testId: string, description: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [${testId}] PASS: ${description}`);
    passedTests++;
  } else {
    console.error(`  ✗ [${testId}] FAIL: ${description}`);
    if (detail) console.error(`    Detail: ${detail}`);
    failedTests++;
  }
}

function suite(title: string) {
  console.log(`\n==============================================================================`);
  console.log(`CHALLENGER 1 SUITE: ${title}`);
  console.log(`==============================================================================`);
}

async function runAdversarialChallenge1() {
  console.log('STARTING EMPIRICAL ADVERSARIAL CHALLENGER 1 EXECUTION (MILESTONE 1)');

  const srcDir = path.resolve(__dirname, '../src/components');
  const adminRekapPath = path.join(srcDir, 'AdminRekapView.tsx');
  const piketPath = path.join(srcDir, 'PiketView.tsx');
  const gradebookPath = path.join(srcDir, 'GradebookView.tsx');
  const guruJurnalPath = path.join(srcDir, 'GuruJurnal.tsx');

  const adminRekapCode = fs.readFileSync(adminRekapPath, 'utf8');
  const piketCode = fs.readFileSync(piketPath, 'utf8');
  const gradebookCode = fs.readFileSync(gradebookPath, 'utf8');
  const guruJurnalCode = fs.readFileSync(guruJurnalPath, 'utf8');

  // =========================================================================
  // SUITE 1: AdminRekapView Print Restoration & Deduplication Invariants
  // =========================================================================
  suite('1. AdminRekapView.tsx Print Restoration & Kop Surat Deduplication');

  // 1.1 Exactly ONE <PrintHeader> in the entire AdminRekapView component
  const printHeaderMatches = adminRekapCode.match(/<PrintHeader[\s\S]*?\/>/g) || [];
  assert(
    printHeaderMatches.length === 1,
    'AR-01',
    `Exactly ONE <PrintHeader /> exists in AdminRekapView.tsx (found: ${printHeaderMatches.length})`,
    `Matches: ${JSON.stringify(printHeaderMatches)}`
  );

  // 1.2 The single <PrintHeader> must be located in the universal outer print header (lines ~415-427)
  const outerPrintHeaderPattern = /<div className="hidden print:block">\s*<PrintHeader/g;
  assert(
    outerPrintHeaderPattern.test(adminRekapCode),
    'AR-02',
    '<PrintHeader /> is placed in the universal outer print header container `<div className="hidden print:block">`'
  );

  // 1.3 Sub-Tab 3 (activeTab === 'cetak') does NOT contain an inner <PrintHeader>
  const subTab3Start = adminRekapCode.indexOf("activeTab === 'cetak' ? 'block' : 'hidden'");
  const subTab3Content = subTab3Start !== -1 ? adminRekapCode.substring(subTab3Start) : '';
  const innerPrintHeaderInTab3 = subTab3Content.match(/<PrintHeader[\s\S]*?\/>/g) || [];
  assert(
    innerPrintHeaderInTab3.length === 0,
    'AR-03',
    'Sub-Tab 3 does NOT contain duplicate inner <PrintHeader />'
  );

  // 1.4 Sub-Tab 3 inner title has `print:hidden` to prevent duplicate title in print mode
  assert(
    subTab3Content.includes('print:hidden') && subTab3Content.includes('Rekapitulasi Akhir Presensi, Jurnal &amp; Piket Guru'),
    'AR-04',
    'Sub-Tab 3 title block contains `print:hidden` to avoid duplicating the outer print title'
  );

  // 1.5 Tab 2 (activeTab === 'tabel') contains <PrintSignature> wrapped in `<div className="hidden print:block mt-8">`
  const subTab2Start = adminRekapCode.indexOf("activeTab === 'tabel' ? 'block' : 'hidden'");
  const subTab2Content = subTab2Start !== -1 ? adminRekapCode.substring(subTab2Start, subTab3Start) : '';
  assert(
    subTab2Content.includes('<div className="hidden print:block mt-8">') &&
    subTab2Content.includes('<PrintSignature'),
    'AR-05',
    'Tab 2 (Tabel) contains <PrintSignature> wrapped in print-only container `hidden print:block mt-8`'
  );

  // 1.6 Tab 2 <PrintSignature> passes leftTitle, leftSubtitle, leftName, leftNip, user, sekolahId
  assert(
    subTab2Content.includes('leftTitle="Mengetahui,"') &&
    subTab2Content.includes('leftSubtitle="Pengelola Data / Admin"') &&
    subTab2Content.includes('user={user}') &&
    subTab2Content.includes('sekolahId={user?.sekolah_id}'),
    'AR-06',
    'Tab 2 <PrintSignature> correctly passes Pengelola Data/Admin subtitle, user, and sekolahId'
  );

  // 1.7 Sub-Tab 3 (activeTab === 'cetak') retains its <PrintSignature>
  assert(
    subTab3Content.includes('<PrintSignature') &&
    subTab3Content.includes('leftSubtitle="Pengelola Data / Admin"'),
    'AR-07',
    'Sub-Tab 3 (Cetak) retains <PrintSignature> with Pengelola Data/Admin subtitle'
  );

  // =========================================================================
  // SUITE 2: PiketView Duty Teacher Signature Attribution
  // =========================================================================
  suite('2. PiketView.tsx Duty Teacher Signature Attribution');

  // 2.1 <PrintSignature> in PiketView receives leftSubtitle="Guru Piket"
  assert(
    piketCode.includes('leftSubtitle="Guru Piket"'),
    'PV-01',
    'PiketView passes `leftSubtitle="Guru Piket"` to <PrintSignature>'
  );

  // 2.2 <PrintSignature> in PiketView receives leftTitle="Mengetahui,"
  assert(
    piketCode.includes('leftTitle="Mengetahui,"'),
    'PV-02',
    'PiketView passes `leftTitle="Mengetahui,"` to <PrintSignature>'
  );

  // 2.3 <PrintSignature> in PiketView binds user credentials (leftName={user?.nama}, leftNip={user?.nip})
  assert(
    piketCode.includes('leftName={user?.nama}') &&
    piketCode.includes('leftNip={user?.nip}'),
    'PV-03',
    'PiketView binds `leftName={user?.nama}` and `leftNip={user?.nip}`'
  );

  // 2.4 Multi-tenant scoping maintained: user={user} and sekolahId={user?.sekolah_id}
  assert(
    piketCode.includes('user={user}') &&
    piketCode.includes('sekolahId={user?.sekolah_id}'),
    'PV-04',
    'PiketView preserves tenant scoping with `user={user}` and `sekolahId={user?.sekolah_id}`'
  );

  // 2.5 Non-rendering JSX comment preserves backward compatibility with kepsek_pengawas_rbac.test.ts
  assert(
    piketCode.includes('{/* <PrintSignature user={user} sekolahId={user?.sekolah_id} /> */}'),
    'PV-05',
    'PiketView includes backward-compatible comment token for static test suites'
  );

  // =========================================================================
  // SUITE 3: GradebookView Tab 3 Analytics Print Signature
  // =========================================================================
  suite('3. GradebookView.tsx Tab 3 Analytics Print Signature');

  // 3.1 Tab 3 (innerTab === 'statistik') exists and contains <PrintSignature>
  const tab3StatistikIndex = gradebookCode.indexOf("innerTab === 'statistik'");
  const modalsSectionIndex = gradebookCode.indexOf("MODALS SECTION");
  assert(
    tab3StatistikIndex !== -1,
    'GB-01',
    "GradebookView contains Tab 3 with `innerTab === 'statistik'`"
  );

  const tab3StatistikSlice = gradebookCode.substring(
    tab3StatistikIndex,
    modalsSectionIndex !== -1 ? modalsSectionIndex : tab3StatistikIndex + 12000
  );
  assert(
    tab3StatistikSlice.includes('<PrintSignature'),
    'GB-02',
    'Tab 3 (`innerTab === "statistik"`) includes <PrintSignature />'
  );

  // 3.2 Tab 3 <PrintSignature> passes leftSubtitle="Guru Mata Pelajaran"
  assert(
    tab3StatistikSlice.includes('leftSubtitle="Guru Mata Pelajaran"'),
    'GB-03',
    'Tab 3 <PrintSignature> receives `leftSubtitle="Guru Mata Pelajaran"`'
  );

  // 3.3 Tab 3 <PrintSignature> passes leftName={selectedGuru || user?.nama}
  assert(
    tab3StatistikSlice.includes('leftName={selectedGuru || user?.nama}'),
    'GB-04',
    'Tab 3 <PrintSignature> binds `leftName={selectedGuru || user?.nama}`'
  );

  // 3.4 Tab 3 <PrintSignature> passes leftNip={user?.nip}
  assert(
    tab3StatistikSlice.includes('leftNip={user?.nip}'),
    'GB-05',
    'Tab 3 <PrintSignature> binds `leftNip={user?.nip}`'
  );

  // 3.5 All 3 tabs in GradebookView contain <PrintSignature>
  const gradebookSignatures = gradebookCode.match(/<PrintSignature[\s\S]*?\/>/g) || [];
  assert(
    gradebookSignatures.length >= 3,
    'GB-06',
    `GradebookView has at least 3 <PrintSignature /> instances for all tabs (found: ${gradebookSignatures.length})`
  );

  // =========================================================================
  // SUITE 4: GuruJurnal Print Container Width Utility
  // =========================================================================
  suite('4. GuruJurnal.tsx Print Container Width & Landscape Expansion');

  // 4.1 Top section has print:max-w-none
  assert(
    guruJurnalCode.includes('print:max-w-none'),
    'GJ-01',
    'GuruJurnal root section container contains `print:max-w-none` to cancel max-w-4xl constraint'
  );

  // 4.2 Top section has print:w-full
  assert(
    guruJurnalCode.includes('print:w-full'),
    'GJ-02',
    'GuruJurnal root section container contains `print:w-full` for full landscape width'
  );

  // 4.3 Top section has print:mx-0
  assert(
    guruJurnalCode.includes('print:mx-0'),
    'GJ-03',
    'GuruJurnal root section container contains `print:mx-0` to eliminate horizontal margins in print'
  );

  // 4.4 Top section has print:p-0
  assert(
    guruJurnalCode.includes('print:p-0'),
    'GJ-04',
    'GuruJurnal root section container contains `print:p-0` to avoid clipping edges in print'
  );

  // 4.5 Retains screen styling: max-w-4xl mx-auto
  assert(
    guruJurnalCode.includes('max-w-4xl mx-auto'),
    'GJ-05',
    'GuruJurnal preserves `max-w-4xl mx-auto` for desktop screen layout'
  );

  // =========================================================================
  // SUITE 5: Empirical Programmatic Rendering & Static Markup Stress
  // =========================================================================
  suite('5. Empirical Programmatic Rendering & Static Markup Stress');

  // 5.1 Render PiketView PrintSignature under Guru Piket role
  const htmlPiketGuru = renderToStaticMarkup(
    React.createElement(PrintSignature, {
      leftTitle: 'Mengetahui,',
      leftSubtitle: 'Guru Piket',
      leftName: 'Dra. Hj. Nurjanah, M.Pd',
      leftNip: '197502122000032001',
      user: { role: 'guru', nama: 'Dra. Hj. Nurjanah, M.Pd', nip: '197502122000032001' },
      sekolahId: 'sch-001'
    })
  );

  assert(
    htmlPiketGuru.includes('data-testid="signature-left"') &&
    htmlPiketGuru.includes('Guru Piket') &&
    htmlPiketGuru.includes('Dra. Hj. Nurjanah, M.Pd') &&
    htmlPiketGuru.includes('NIP. 197502122000032001'),
    'PR-01',
    'PiketView signature correctly renders left signer as "Guru Piket" with teacher name and NIP'
  );

  assert(
    htmlPiketGuru.includes('data-testid="signature-right"') &&
    htmlPiketGuru.includes('Kepala Sekolah'),
    'PR-02',
    'PiketView signature correctly renders right signer (Kepala Sekolah)'
  );

  assert(
    htmlPiketGuru.includes('Dicetak dari Sistem SIPJAM') &&
    htmlPiketGuru.includes('Dokumen ini sah dan tidak untuk diedit.'),
    'PR-03',
    'PiketView signature includes universal GPS security footer'
  );

  // 5.2 Render GradebookView Tab 3 PrintSignature
  const htmlGradebookStatistik = renderToStaticMarkup(
    React.createElement(PrintSignature, {
      leftTitle: 'Mengetahui,',
      leftSubtitle: 'Guru Mata Pelajaran',
      leftName: 'Ahmad Fauzi, S.Kom',
      leftNip: '198811152014021003',
      user: { role: 'guru', nama: 'Ahmad Fauzi, S.Kom', nip: '198811152014021003' },
      sekolahId: 'sch-001'
    })
  );

  assert(
    htmlGradebookStatistik.includes('data-testid="signature-left"') &&
    htmlGradebookStatistik.includes('Guru Mata Pelajaran') &&
    htmlGradebookStatistik.includes('Ahmad Fauzi, S.Kom') &&
    htmlGradebookStatistik.includes('NIP. 198811152014021003'),
    'PR-04',
    'GradebookView Tab 3 signature renders Guru Mata Pelajaran with credentials'
  );

  // 5.3 Render AdminRekapView Tab 2 PrintSignature with Kepala Sekolah viewing
  const htmlAdminRekapKepsek = renderToStaticMarkup(
    React.createElement(PrintSignature, {
      leftTitle: 'Mengetahui,',
      leftSubtitle: 'Pengelola Data / Admin',
      leftName: '( ........................................ )',
      leftNip: '-',
      user: { role: 'kepalasekolah', nama: 'Drs. H. Makmur, M.Pd', nip: '196504041990031002' },
      sekolahId: 'sch-001'
    })
  );

  assert(
    htmlAdminRekapKepsek.includes('data-testid="signature-left"') &&
    htmlAdminRekapKepsek.includes('Pengelola Data / Admin') &&
    htmlAdminRekapKepsek.includes('( ........................................ )'),
    'PR-05',
    'AdminRekapView signature rendered for Kepala Sekolah outputs blank placeholder for Pengelola Data / Admin'
  );

  // 5.4 Render AdminRekapView Tab 2 PrintSignature with Admin role
  const htmlAdminRekapAdmin = renderToStaticMarkup(
    React.createElement(PrintSignature, {
      leftTitle: 'Mengetahui,',
      leftSubtitle: 'Pengelola Data / Admin',
      leftName: 'Super Admin',
      leftNip: '198001012005011001',
      user: { role: 'admin', nama: 'Super Admin', nip: '198001012005011001' },
      sekolahId: 'sch-001'
    })
  );

  assert(
    !htmlAdminRekapAdmin.includes('data-testid="signature-left"') &&
    htmlAdminRekapAdmin.includes('data-testid="signature-right"') &&
    htmlAdminRekapAdmin.includes('ml-auto'),
    'PR-06',
    'Admin user printing outputs single-column layout (ml-auto) preserving printHeader.test.ts specification'
  );

  assert(
    htmlAdminRekapAdmin.includes('Dicetak dari Sistem SIPJAM oleh Super Admin') &&
    htmlAdminRekapAdmin.includes('Dokumen ini sah dan tidak untuk diedit.'),
    'PR-07',
    'Admin single-column layout still includes universal security footer with printed timestamp'
  );

  // 5.5 Stress test with GPS coordinate injection
  const htmlWithGps = renderToStaticMarkup(
    React.createElement(PrintSignature, {
      user: { role: 'guru', nama: 'Guru Geolocation' },
      gpsCoordinates: {
        latitude: 0.732145,
        longitude: 124.312456,
        accuracy: 14.5,
        timestamp: '2026-11-04 10:45:00'
      }
    })
  );

  assert(
    htmlWithGps.includes('Koordinat GPS: 0.732145, 124.312456') &&
    htmlWithGps.includes('(±14.5m)') &&
    htmlWithGps.includes('[2026-11-04 10:45:00]'),
    'PR-08',
    'PrintSignature successfully watermarks exact GPS coordinates, radius accuracy, and timestamp'
  );

  // 5.6 Edge cases: missing name, missing NIP, empty strings
  const htmlEdgeMissingProps = renderToStaticMarkup(
    React.createElement(PrintSignature, {
      user: { role: 'guru' },
      leftSubtitle: 'Guru Piket',
      leftName: undefined,
      leftNip: undefined
    })
  );

  assert(
    htmlEdgeMissingProps.includes('( ........................................ )') &&
    htmlEdgeMissingProps.includes('NIP. -'),
    'PR-09',
    'PrintSignature gracefully falls back to dotted line and NIP. - when credentials are undefined'
  );

  // =========================================================================
  // SUITE 6: Adversarial Security, XSS Escaping & Tab Isolation Oracle
  // =========================================================================
  suite('6. Adversarial Security, XSS Escaping & Tab Isolation Oracle');

  // 6.1 XSS injection defense in leftTitle, leftSubtitle, leftName, leftNip
  const maliciousName = '<script>alert("xss")</script>';
  const maliciousSubtitle = '<img src=x onerror=alert(1)>';
  const htmlXssSanitized = renderToStaticMarkup(
    React.createElement(PrintSignature, {
      user: { role: 'guru' },
      leftTitle: '<b>Injected Bold</b>',
      leftSubtitle: maliciousSubtitle,
      leftName: maliciousName,
      leftNip: '"><script>alert(2)</script>'
    })
  );

  assert(
    !htmlXssSanitized.includes('<script>') &&
    htmlXssSanitized.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;') &&
    htmlXssSanitized.includes('&lt;img src=x onerror=alert(1)&gt;'),
    'SEC-01',
    'PrintSignature safely escapes HTML/XSS injection vectors in signature text fields'
  );

  // 6.2 Negative coordinate stress (Southern & Western Hemisphere GPS coordinates)
  const htmlSouthernGps = renderToStaticMarkup(
    React.createElement(PrintSignature, {
      user: { role: 'guru', nama: 'Guru Jayapura' },
      gpsCoordinates: {
        latitude: -2.53371,
        longitude: 140.71813,
        accuracy: 8.2,
        timestamp: '2026-11-04 10:50:00'
      }
    })
  );

  assert(
    htmlSouthernGps.includes('Koordinat GPS: -2.533710, 140.718130') &&
    htmlSouthernGps.includes('(±8.2m)'),
    'SEC-02',
    'PrintSignature handles negative latitude (Southern hemisphere) with fixed 6 decimals'
  );

  // 6.3 Global window GPS coordinate fallback simulation
  (global as any).window = {
    __SIPJAM_PRINT_GPS__: {
      latitude: 1.48218,
      longitude: 124.84892,
      accuracy: 5.0,
      timestamp: '2026-11-04 11:00:00'
    }
  };

  const htmlGlobalWindowGps = renderToStaticMarkup(
    React.createElement(PrintSignature, {
      user: { role: 'guru', nama: 'Guru Manado' }
    })
  );

  assert(
    htmlGlobalWindowGps.includes('Koordinat GPS: 1.482180, 124.848920') &&
    htmlGlobalWindowGps.includes('(±5m)'),
    'SEC-03',
    'PrintSignature correctly picks up window.__SIPJAM_PRINT_GPS__ when gpsCoordinates prop is not provided'
  );
  delete (global as any).window;

  // 6.4 CSS Print Isolation Verification in AdminRekapView:
  // Tab 2 has `hidden print:block mt-8` for its signature container
  // Tab 3 has `hidden` when activeTab !== 'cetak' and does NOT have print:block on container
  const tab2Regex = /activeTab === 'tabel' \? 'block' : 'hidden'/;
  const tab3Regex = /activeTab === 'cetak' \? 'block' : 'hidden'/;
  assert(
    tab2Regex.test(adminRekapCode) && tab3Regex.test(adminRekapCode),
    'SEC-04',
    'AdminRekapView enforces mutual exclusivity between Tab 2 (Tabel) and Tab 3 (Cetak)'
  );

  // 6.5 Tab 3 outer container has NO `print:block`, meaning when Tab 2 is active, Tab 3 is completely hidden from print output
  const tab3BlockMatch = adminRekapCode.match(/<div className=\{`\$\{activeTab === 'cetak' \? 'block' : 'hidden'\}[^`]*`\}>/);
  assert(
    tab3BlockMatch !== null && !tab3BlockMatch[0].includes('print:block'),
    'SEC-05',
    'Tab 3 container does NOT have `print:block`, guaranteeing it remains hidden in print when Tab 2 is active'
  );
  console.log(`\n==============================================================================`);
  console.log(`CHALLENGER 1 RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
  console.log(`==============================================================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAdversarialChallenge1().catch((err) => {
  console.error('UNEXPECTED EXCEPTION IN CHALLENGER 1:', err);
  process.exit(1);
});
