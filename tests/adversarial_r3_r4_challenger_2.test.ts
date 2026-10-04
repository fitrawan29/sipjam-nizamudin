/**
 * ADVERSARIAL EMPIRICAL TEST SUITE — CHALLENGER 2
 * Verification of R3 (Print Layout & Watermark) and R4 (Student QR Card Generation & Download)
 *
 * Requirements Tested:
 * - R3: Print layout CSS rules:
 *      .sipjam-print-watermark remains active and visible on print (display: flex !important; position: fixed),
 *      while [data-tour="ai-assistant-btn"], [aria-label*="Asisten AI"], .fa-robot, and button.fixed are hidden (display: none !important;).
 * - R4: Student QR card generation and download:
 *      generateStudentCardCanvas, downloadStudentCardPng, and printStudentQrCardWithSchool
 *      produce valid canvases/outputs containing Nama, NISN, Kelas, Nama Sekolah, and QR matrix.
 */

import fs from 'fs';
import path from 'path';
import {
  generateStudentCardCanvas,
  downloadStudentCardPng,
  printStudentQrCardWithSchool,
  getStudentQrIdentifier,
  generateQrMatrix,
  generateStudentQrSvg
} from '../src/lib/qrSiswa';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTestSuite() {
  console.log('======================================================================');
  console.log('ADVERSARIAL EMPIRICAL CHALLENGE SUITE: R3 & R4 VERIFICATION');
  console.log('======================================================================\n');

  const rootDir = path.resolve(__dirname, '..');

  // ==========================================================================
  // SECTION 1: R3 PRINT LAYOUT CSS & WATERMARK RULES
  // ==========================================================================
  console.log('--- SECTION 1: R3 Print Layout CSS & Watermark Protection ---');

  const cssPath = path.join(rootDir, 'src/app/globals.css');
  assert(fs.existsSync(cssPath), 'globals.css exists');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // 1.1 Verify @media print block existence
  assert(cssContent.includes('@media print'), 'globals.css contains @media print declaration');

  // Extract @media print block
  const printBlockMatch = cssContent.match(/@media\s+print\s*\{([\s\S]*?)(?=@media\s+screen|\/\*\s*Broadcast Bell|$)/i);
  assert(!!printBlockMatch, '@media print block successfully extracted from globals.css');
  const printBlock = printBlockMatch ? printBlockMatch[1] : '';

  // 1.2 Watermark Preservation in @media print
  assert(
    printBlock.includes('.sipjam-print-watermark'),
    'printBlock contains .sipjam-print-watermark selector'
  );

  const watermarkRuleMatch = printBlock.match(/\.sipjam-print-watermark\s*\{([^}]+)\}/);
  assert(!!watermarkRuleMatch, '.sipjam-print-watermark rule block exists in @media print');
  const watermarkRule = watermarkRuleMatch ? watermarkRuleMatch[1] : '';

  assert(
    watermarkRule.includes('display: flex !important;'),
    '.sipjam-print-watermark has "display: flex !important;" in @media print'
  );
  assert(
    watermarkRule.includes('position: fixed;'),
    '.sipjam-print-watermark has "position: fixed;" to repeat across printed pages'
  );
  assert(
    watermarkRule.includes('opacity: 0.07;'),
    '.sipjam-print-watermark has subtle print opacity 0.07'
  );
  assert(
    watermarkRule.includes('z-index: 9999;'),
    '.sipjam-print-watermark has high z-index (9999) to overlay behind/over content'
  );
  assert(
    watermarkRule.includes('pointer-events: none;'),
    '.sipjam-print-watermark has pointer-events: none;'
  );

  // 1.3 Floating & Robot Element Hiding in @media print
  // Verify that target selectors are included in the hiding rule list
  const requiredHiddenSelectors = [
    '[data-tour="ai-assistant-btn"]',
    '[aria-label*="Asisten AI"]',
    '[role="dialog"][aria-label*="Asisten AI"]',
    '.fa-robot',
    'button.fixed',
    'div.fixed:not(.sipjam-print-watermark)',
    '.no-print'
  ];

  for (const selector of requiredHiddenSelectors) {
    assert(
      printBlock.includes(selector),
      `@media print rule specifically targets selector: ${selector}`
    );
  }

  // Verify that the rule hiding these elements has display: none !important; and visibility: hidden !important;
  const hiddenRuleRegex = /(?:button\.fixed|\[data-tour="ai-assistant-btn"\]|div\.fixed:not\(\.sipjam-print-watermark\))[\s\S]*?\{([^}]+)\}/;
  const hiddenRuleMatch = printBlock.match(hiddenRuleRegex);
  assert(!!hiddenRuleMatch, 'Hiding rule block exists for robot and floating buttons');
  const hiddenRuleBody = hiddenRuleMatch ? hiddenRuleMatch[1] : '';
  assert(
    hiddenRuleBody.includes('display: none !important;'),
    'Targeted floating elements and robot icon have "display: none !important;"'
  );
  assert(
    hiddenRuleBody.includes('visibility: hidden !important;'),
    'Targeted floating elements and robot icon have "visibility: hidden !important;"'
  );

  // 1.4 Protection of watermark against div.fixed blanket elimination
  assert(
    printBlock.includes('div.fixed:not(.sipjam-print-watermark)'),
    'Fixed div hiding rule explicitly excludes watermark via :not(.sipjam-print-watermark)'
  );

  // 1.5 Verification of @media screen hiding watermark on digital displays
  const screenBlockMatch = cssContent.match(/@media\s+screen\s*\{([^}]+)\}/i);
  assert(!!screenBlockMatch, '@media screen block exists in globals.css');
  const screenBlock = screenBlockMatch ? screenBlockMatch[1] : '';
  assert(
    screenBlock.includes('.sipjam-print-watermark') && screenBlock.includes('display: none !important;'),
    '@media screen hides .sipjam-print-watermark on normal screens (display: none !important;)'
  );
  assert(
    screenBlock.includes('.print-only') && screenBlock.includes('display: none !important;'),
    '@media screen hides .print-only elements on normal screens'
  );

  // 1.6 Verification of AIAssistant.tsx Component Attributes
  console.log('\n--- 1.6 Component Integration: AIAssistant.tsx ---');
  const aiFile = path.join(rootDir, 'src/components/AIAssistant/AIAssistant.tsx');
  assert(fs.existsSync(aiFile), 'AIAssistant.tsx exists');
  const aiContent = fs.readFileSync(aiFile, 'utf8');

  assert(
    aiContent.includes('data-tour="ai-assistant-btn"') &&
    aiContent.includes('no-print') &&
    aiContent.includes('print:hidden'),
    'AIAssistant trigger button contains data-tour="ai-assistant-btn" and "no-print print:hidden"'
  );
  assert(
    aiContent.includes('role="dialog"') &&
    aiContent.includes('aria-label="Panel Asisten AI SIPJAM"') &&
    aiContent.includes('no-print') &&
    aiContent.includes('print:hidden'),
    'AIAssistant dialog panel contains role="dialog", aria-label and "no-print print:hidden"'
  );
  assert(
    aiContent.includes('fa-solid fa-robot'),
    'AIAssistant uses robot icon class (fa-solid fa-robot)'
  );

  // 1.7 Verification of DokumenView.tsx Print Integration
  console.log('\n--- 1.7 Component Integration: DokumenView.tsx ---');
  const dokFile = path.join(rootDir, 'src/components/DokumenView.tsx');
  assert(fs.existsSync(dokFile), 'DokumenView.tsx exists');
  const dokContent = fs.readFileSync(dokFile, 'utf8');

  assert(
    dokContent.includes('<PrintHeader user={user} sekolahId={user?.sekolah_id} />'),
    'DokumenView renders <PrintHeader user={user} sekolahId={user?.sekolah_id} />'
  );
  assert(
    dokContent.includes('Laporan Kelengkapan Perangkat Pembelajaran Kurikulum Merdeka'),
    'DokumenView renders standardized print subheader title'
  );
  assert(
    dokContent.includes('<PrintSignature'),
    'DokumenView renders <PrintSignature /> at the bottom'
  );
  assert(
    dokContent.includes('print-only hidden print:block'),
    'DokumenView renders standardized print-only table structure'
  );

  // 1.8 Verification of RekapJurnalView.tsx Print Formatting
  console.log('\n--- 1.8 Component Integration: RekapJurnalView.tsx ---');
  const rekapJurnalFile = path.join(rootDir, 'src/components/RekapJurnalView.tsx');
  assert(fs.existsSync(rekapJurnalFile), 'RekapJurnalView.tsx exists');
  const rekapJurnalContent = fs.readFileSync(rekapJurnalFile, 'utf8');

  assert(
    rekapJurnalContent.includes('print:bg-gray-100'),
    'RekapJurnalView standardizes table headers with print:bg-gray-100'
  );
  assert(
    rekapJurnalContent.includes('px-2 py-1.5 print:p-1.5'),
    'RekapJurnalView standardizes table cell padding to compact "px-2 py-1.5 print:p-1.5"'
  );
  assert(
    rekapJurnalContent.includes('no-print') && rekapJurnalContent.includes('j.latitude'),
    'RekapJurnalView hides raw GPS geotags from printouts using no-print'
  );

  // ==========================================================================
  // SECTION 2: R4 STUDENT QR CARD GENERATION & DOWNLOAD
  // ==========================================================================
  console.log('\n--- SECTION 2: R4 Student QR Card Generation, Download & Print ---');

  // Test Student Models
  const standardStudent = {
    id: 's-uuid-001',
    nama_siswa: 'Budi Santoso',
    nisn: '114367407',
    kelas: 'X-1',
    gender: 'Laki-laki',
    status: 'Aktif',
    qr_code: '114367407',
    sekolah_id: 'sch-001'
  };

  const longNameStudent = {
    id: 's-uuid-002',
    nama_siswa: 'Muhammad Dzaky Fathurrahman Al-Habsyi S.Pd',
    nisn: '0098765432',
    kelas: 'XII MIPA Unggulan 2',
    gender: 'Laki-laki',
    status: 'SISWA AKTIF',
    qr_code: null, // falls back to nisn
    sekolah_id: 'sch-001'
  };

  const exoticStudent = {
    id: 's-uuid-003',
    nama_siswa: '<script>alert("XSS")</script> & Ahmad',
    nisn: '9988776655',
    kelas: 'XI-IPA/A',
    gender: 'Perempuan',
    status: 'Aktif',
    qr_code: undefined // falls back to nisn
  };

  const minimalStudent = {
    id: 's-uuid-004'
  };

  // 2.1 Node.js Fallback Behavior for generateStudentCardCanvas
  console.log('\n--- 2.1 Node.js Execution Safe Fallbacks ---');
  const nodeCanvas = generateStudentCardCanvas({
    student: standardStudent,
    schoolName: 'SMA Negeri 1 Bolaang Mongondow Timur'
  });
  assert(nodeCanvas.width === 600, 'Canvas fallback width is 600 px');
  assert(nodeCanvas.height === 960, 'Canvas fallback height is 960 px');
  const fallbackDataUrl = nodeCanvas.toDataURL('image/png');
  assert(fallbackDataUrl.startsWith('data:image/png;base64,'), 'Canvas fallback generates valid PNG data URL');

  // 2.2 Node.js Execution Safe Fallback for downloadStudentCardPng
  const nodeDownloadRes = downloadStudentCardPng({
    student: standardStudent,
    schoolName: 'SMA Negeri 1 Jakarta'
  });
  assert(nodeDownloadRes === false, 'downloadStudentCardPng safely returns false in Node environment without crashing');

  // 2.3 Node.js Execution Safe Fallback for printStudentQrCardWithSchool
  let printCrashed = false;
  try {
    printStudentQrCardWithSchool({
      student: standardStudent,
      schoolName: 'SMA Negeri 1 Jakarta'
    });
  } catch (e) {
    printCrashed = true;
  }
  assert(!printCrashed, 'printStudentQrCardWithSchool handles Node environment without throwing error');

  // ==========================================================================
  // SECTION 3: EMPIRICAL CANVAS SIMULATION HARNESS (DOM ENVIRONMENT)
  // ==========================================================================
  console.log('\n--- SECTION 3: Empirical Canvas Drawing & Structure Simulation ---');

  // Create an empirical Canvas & 2D Context Spy to track every drawn element
  class MockCanvasContext2D {
    public fillRectCalls: Array<{ x: number; y: number; w: number; h: number; fillStyle: any }> = [];
    public fillTextCalls: Array<{ text: string; x: number; y: number; font: string; fillStyle: any; align: string }> = [];
    public strokeCalls: number = 0;
    public fillCalls: number = 0;
    public fillStyle: any = '#000000';
    public strokeStyle: any = '#000000';
    public font: string = '10px sans-serif';
    public textAlign: string = 'left';
    public textBaseline: string = 'alphabetic';
    public lineWidth: number = 1;
    public shadowColor: string = 'transparent';
    public shadowBlur: number = 0;
    public shadowOffsetY: number = 0;

    fillRect(x: number, y: number, w: number, h: number) {
      this.fillRectCalls.push({ x, y, w, h, fillStyle: this.fillStyle });
    }
    fillText(text: string, x: number, y: number) {
      this.fillTextCalls.push({
        text,
        x,
        y,
        font: this.font,
        fillStyle: this.fillStyle,
        align: this.textAlign
      });
    }
    createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
      return {
        addColorStop: (offset: number, color: string) => {}
      };
    }
    beginPath() {}
    moveTo(x: number, y: number) {}
    lineTo(x: number, y: number) {}
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {}
    closePath() {}
    fill() { this.fillCalls++; }
    stroke() { this.strokeCalls++; }
    save() {}
    restore() {}
  }

  // Set up global browser DOM mock
  const globalMockContext = new MockCanvasContext2D();
  const mockCanvasElement = {
    width: 600,
    height: 960,
    getContext: (type: string) => (type === '2d' ? globalMockContext : null),
    toDataURL: (type: string) => `data:${type};base64,iVBORw0KGgoAAAANSUhEUgAAAlgAAAPACA...SIMULATED_PNG_PAYLOAD`
  };

  const originalDocument = (global as any).document;
  const originalWindow = (global as any).window;

  let createdElements: any[] = [];
  let clickedElements: any[] = [];

  const mockDocument: any = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return mockCanvasElement;
      }
      if (tag === 'a') {
        const link = {
          tagName: 'A',
          download: '',
          href: '',
          click: function() {
            clickedElements.push(this);
          }
        };
        createdElements.push(link);
        return link;
      }
      return {};
    },
    body: {
      appendChild: (el: any) => {},
      removeChild: (el: any) => {}
    }
  };

  let writtenHtml = '';
  let documentClosed = false;

  const mockWindow: any = {
    document: mockDocument,
    open: (url: string, target: string, features: string) => {
      return {
        document: {
          write: (html: string) => {
            writtenHtml += html;
          },
          close: () => {
            documentClosed = true;
          }
        }
      };
    }
  };

  try {
    (global as any).document = mockDocument;
    (global as any).window = mockWindow;

    // 3.1 Test Standard Student Canvas Rendering
    console.log('\n--- 3.1 Standard Student Canvas Verification ---');
    globalMockContext.fillRectCalls = [];
    globalMockContext.fillTextCalls = [];

    const standardSchool = 'SMA Negeri 1 Bolaang Mongondow Timur';
    const canvasRes = generateStudentCardCanvas({
      student: standardStudent,
      schoolName: standardSchool
    });

    assert(canvasRes.width === 600, 'Canvas width is exactly 600 px (Portrait ID card standard)');
    assert(canvasRes.height === 960, 'Canvas height is exactly 960 px (Portrait ID card standard)');

    // Verify Title in rendered text
    const titleText = globalMockContext.fillTextCalls.find(c => c.text === 'KARTU PRESENSI DIGITAL');
    assert(!!titleText, 'Card renders title "KARTU PRESENSI DIGITAL"');
    assert(titleText?.y === 48, 'Title is placed at header position (y=48)');

    // Verify School Name in rendered text
    const schoolText = globalMockContext.fillTextCalls.find(c => c.text === standardSchool.toUpperCase());
    assert(!!schoolText, `Card renders school name: "${standardSchool.toUpperCase()}"`);
    assert(schoolText?.fillStyle === '#FEF08A', 'School name is rendered with bright gold accent (#FEF08A)');

    // Verify Subtitle
    const subText = globalMockContext.fillTextCalls.find(c => c.text === 'Sistem Informasi Presensi Siswa');
    assert(!!subText, 'Card renders subtitle "Sistem Informasi Presensi Siswa"');

    // Verify Student Full Name
    const nameText = globalMockContext.fillTextCalls.find(c => c.text === standardStudent.nama_siswa);
    assert(!!nameText, `Card renders student name: "${standardStudent.nama_siswa}"`);

    // Verify Status Badge
    const statusText = globalMockContext.fillTextCalls.find(c => c.text === 'SISWA AKTIF');
    assert(!!statusText, 'Card renders status badge "SISWA AKTIF"');

    // Verify Metadata values: NISN, Kelas, Sekolah, Gender
    const nisnVal = globalMockContext.fillTextCalls.find(c => c.text === standardStudent.nisn);
    assert(!!nisnVal, `Card renders student NISN: "${standardStudent.nisn}"`);

    const kelasVal = globalMockContext.fillTextCalls.find(c => c.text === standardStudent.kelas);
    assert(!!kelasVal, `Card renders student Kelas: "${standardStudent.kelas}"`);

    const genderVal = globalMockContext.fillTextCalls.find(c => c.text === standardStudent.gender);
    assert(!!genderVal, `Card renders student Gender: "${standardStudent.gender}"`);

    // Verify QR ID Badge
    const idBadgeText = globalMockContext.fillTextCalls.find(c => c.text.startsWith('ID: '));
    assert(!!idBadgeText && idBadgeText.text === `ID: ${standardStudent.nisn}`, `Card renders monospace ID badge: "${idBadgeText?.text}"`);

    // Verify Footer text
    const instructionText = globalMockContext.fillTextCalls.find(c => c.text.includes('Tunjukkan kartu ini'));
    assert(!!instructionText, 'Card renders footer scanning instructions');

    const brandText = globalMockContext.fillTextCalls.find(c => c.text === 'SIPJAM • Dokumen Resmi Presensi');
    assert(!!brandText, 'Card renders footer official branding "SIPJAM • Dokumen Resmi Presensi"');

    // Verify QR matrix fillRect modules drawn in #0B4619
    const qrModules = globalMockContext.fillRectCalls.filter(c => c.fillStyle === '#0B4619');
    assert(qrModules.length > 100, `Card draws QR matrix using fillRect modules (${qrModules.length} dark modules drawn)`);

    // 3.2 Dynamic Font Size Scaling for Long School Names & Student Names
    console.log('\n--- 3.2 Dynamic Font Scaling for Long Text ---');
    globalMockContext.fillTextCalls = [];

    const longSchool = 'SEKOLAH MENENGAH ATAS NEGERI SATU ATAP MODAYAG TIMUR KABUPATEN BOLTIM';
    generateStudentCardCanvas({
      student: longNameStudent,
      schoolName: longSchool
    });

    const scaledSchool = globalMockContext.fillTextCalls.find(c => c.text === longSchool.toUpperCase());
    assert(!!scaledSchool, 'Long school name rendered successfully');
    assert(scaledSchool?.font.includes('18px'), `Long school name font scaled down to 18px (got ${scaledSchool?.font})`);

    const scaledStudent = globalMockContext.fillTextCalls.find(c => c.text === longNameStudent.nama_siswa);
    assert(!!scaledStudent, 'Long student name rendered successfully');
    assert(scaledStudent?.font.includes('19px'), `Long student name font scaled down to 19px (got ${scaledStudent?.font})`);

    // 3.3 Missing Values Fallback Test
    console.log('\n--- 3.3 Missing Values & Minimal Student Model ---');
    globalMockContext.fillTextCalls = [];

    generateStudentCardCanvas({
      student: minimalStudent
    });

    const defaultName = globalMockContext.fillTextCalls.find(c => c.text === 'Siswa');
    assert(!!defaultName, 'Missing nama_siswa falls back to "Siswa"');

    const defaultSchool = globalMockContext.fillTextCalls.find(c => c.text === 'SIPJAM');
    assert(!!defaultSchool, 'Missing schoolName falls back to "SIPJAM"');

    const missingNisnDash = globalMockContext.fillTextCalls.filter(c => c.text === '-');
    assert(missingNisnDash.length >= 3, 'Missing metadata fields render clean "-" placeholders');

    // 3.4 Verification of downloadStudentCardPng in Browser Environment
    console.log('\n--- 3.4 downloadStudentCardPng Verification ---');
    createdElements = [];
    clickedElements = [];

    const downloadSuccess = downloadStudentCardPng({
      student: standardStudent,
      schoolName: standardSchool
    });

    assert(downloadSuccess === true, 'downloadStudentCardPng returns true on browser download');
    assert(createdElements.length === 1, 'Temporary download anchor element was created');
    const createdLink = createdElements[0];
    assert(createdLink.download === 'Kartu_Presensi_Budi_Santoso_114367407.png', `Download filename is properly formatted: ${createdLink.download}`);
    assert(createdLink.href.startsWith('data:image/png'), 'Download link href is valid PNG data URL');
    assert(clickedElements.length === 1 && clickedElements[0] === createdLink, 'Download link click() was programmatically invoked');

    // 3.5 Adversarial Filename Sanitization Test
    console.log('\n--- 3.5 Filename Sanitization Against Illegal Characters ---');
    createdElements = [];
    clickedElements = [];

    downloadStudentCardPng({
      student: exoticStudent,
      schoolName: 'Test School'
    });

    const exoticLink = createdElements[0];
    assert(
      !exoticLink.download.includes('<') &&
      !exoticLink.download.includes('>') &&
      !exoticLink.download.includes('"') &&
      !exoticLink.download.includes('/') &&
      !exoticLink.download.includes('\\'),
      `Sanitized filename does not contain dangerous characters: ${exoticLink.download}`
    );

    // 3.6 Verification of printStudentQrCardWithSchool in Browser Environment
    console.log('\n--- 3.6 printStudentQrCardWithSchool HTML Output Verification ---');
    writtenHtml = '';
    documentClosed = false;

    printStudentQrCardWithSchool({
      student: standardStudent,
      schoolName: standardSchool
    });

    assert(writtenHtml.length > 0, 'printStudentQrCardWithSchool generated HTML content');
    assert(documentClosed === true, 'printWindow.document.close() was called');
    assert(writtenHtml.includes('<!DOCTYPE html>'), 'Generated output contains valid HTML doctype');
    assert(writtenHtml.includes(`<title>Kartu Presensi Siswa - ${standardStudent.nama_siswa}</title>`), 'HTML title contains student name');
    assert(writtenHtml.includes(standardSchool), 'HTML header contains official school name');
    assert(writtenHtml.includes('KARTU PRESENSI DIGITAL'), 'HTML card contains "KARTU PRESENSI DIGITAL" header');
    assert(writtenHtml.includes('<svg'), 'HTML card includes sharp QR SVG element');
    assert(writtenHtml.includes(`ID: ${standardStudent.nisn}`), 'HTML card includes monospace ID badge');
    assert(writtenHtml.includes(standardStudent.nama_siswa), 'HTML card includes student full name');
    assert(writtenHtml.includes(standardStudent.nisn), 'HTML card includes student NISN');
    assert(writtenHtml.includes(standardStudent.kelas), 'HTML card includes student class');
    assert(writtenHtml.includes('window.print();'), 'HTML script triggers window.print() on window.onload');

    // 3.7 Adversarial XSS Escaping in printStudentQrCardWithSchool
    console.log('\n--- 3.7 Adversarial XSS Escaping in Print HTML ---');
    writtenHtml = '';

    printStudentQrCardWithSchool({
      student: exoticStudent,
      schoolName: '<img src=x onerror=alert(1)> & "SMK 1"'
    });

    assert(!writtenHtml.includes('<script>alert("XSS")</script>'), 'Unescaped script tags are eliminated from HTML output');
    assert(writtenHtml.includes('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'), 'XSS payload is safely HTML-entity escaped');
    assert(!writtenHtml.includes('<img src=x onerror=alert(1)>'), 'Unescaped img XSS payload is eliminated');
    assert(writtenHtml.includes('&lt;img src=x onerror=alert(1)&gt;'), 'School name XSS payload is safely HTML-entity escaped');

  } finally {
    // Restore global environment
    (global as any).document = originalDocument;
    (global as any).window = originalWindow;
  }

  // ==========================================================================
  // SECTION 4: ADMIN DATA VIEW INTEGRATION CONTRACT
  // ==========================================================================
  console.log('\n--- SECTION 4: AdminDataView.tsx Integration Contract ---');
  const adminViewPath = path.join(rootDir, 'src/components/AdminDataView.tsx');
  assert(fs.existsSync(adminViewPath), 'AdminDataView.tsx exists');
  const adminViewContent = fs.readFileSync(adminViewPath, 'utf8');

  // 4.1 Import of student card helpers
  assert(
    adminViewContent.includes('downloadStudentCardPng') &&
    adminViewContent.includes('printStudentQrCardWithSchool'),
    'AdminDataView imports downloadStudentCardPng and printStudentQrCardWithSchool'
  );

  // 4.2 Handler function handleDownloadStudentCard
  assert(
    adminViewContent.includes('handleDownloadStudentCard = (student: any) =>') ||
    adminViewContent.includes('handleDownloadStudentCard(student'),
    'AdminDataView contains handleDownloadStudentCard handler function'
  );

  // 4.3 UI Button: Download Kartu
  assert(
    adminViewContent.includes('Download Kartu') &&
    adminViewContent.includes('handleDownloadStudentCard(item)'),
    'AdminDataView renders "Download Kartu" button per student linking to handleDownloadStudentCard(item)'
  );

  // 4.4 Modal options: Download Gambar (PNG) and Cetak / Simpan PDF
  assert(
    adminViewContent.includes('Cetak / Simpan PDF') &&
    adminViewContent.includes('Download Gambar (PNG)'),
    'AdminDataView QR modal includes both "Cetak / Simpan PDF" and "Download Gambar (PNG)" options'
  );

  // 4.5 Batch QR print includes schoolName
  assert(
    adminViewContent.includes('Cetak Kartu QR Siswa - ${escapeHtml(schoolName)}') ||
    adminViewContent.includes('schoolName'),
    'Batch QR print layout includes school name in title and header'
  );

  // ==========================================================================
  // SECTION 5: ADVERSARIAL STRESS HARNESS & EDGE CASE ORACLES
  // ==========================================================================
  console.log('\n--- SECTION 5: Adversarial Edge Cases & Failure Mode Stress Harness ---');

  (global as any).document = mockDocument;
  (global as any).window = mockWindow;

  try {
    // 5.1 Popup Blocker Oracle for printStudentQrCardWithSchool
  const originalOpen = mockWindow.open;
  mockWindow.open = () => null; // Simulate browser popup blocker
  let popupBlockerThrew = false;
  try {
    printStudentQrCardWithSchool({
      student: standardStudent,
      schoolName: 'SMA Blokir Test'
    });
  } catch (err) {
    popupBlockerThrew = true;
  }
  assert(!popupBlockerThrew, 'printStudentQrCardWithSchool gracefully handles browser popup blocker returning null');
  mockWindow.open = originalOpen;

  // 5.2 Canvas Tainted / SecurityError Oracle for downloadStudentCardPng
  const originalToDataUrl = mockCanvasElement.toDataURL;
  mockCanvasElement.toDataURL = () => {
    throw new Error('SecurityError: The canvas has been tainted by cross-origin data.');
  };
  const taintedDownloadResult = downloadStudentCardPng({
    student: standardStudent,
    schoolName: 'SMA Tainted Test'
  });
  assert(taintedDownloadResult === false, 'downloadStudentCardPng catches SecurityError/tainted canvas and returns false safely');
  mockCanvasElement.toDataURL = originalToDataUrl;

  // 5.3 Identifier Prioritization Oracle
  // Priority order: explicit qrIdentifier > student.qr_code > student.nisn > student.id
  globalMockContext.fillTextCalls = [];
  generateStudentCardCanvas({
    student: { id: 'uuid-1', nisn: '001', qr_code: 'QR-CODE-1' },
    schoolName: 'Test School',
    qrIdentifier: 'EXPLICIT-OVERRIDE'
  });
  const explicitBadge = globalMockContext.fillTextCalls.find(c => c.text === 'ID: EXPLICIT-OVERRIDE');
  assert(!!explicitBadge, 'Explicit qrIdentifier parameter strictly overrides all student model fields');

  globalMockContext.fillTextCalls = [];
  generateStudentCardCanvas({
    student: { id: 'uuid-1', nisn: '001', qr_code: 'QR-CODE-1' },
    schoolName: 'Test School'
  });
  const qrCodeBadge = globalMockContext.fillTextCalls.find(c => c.text === 'ID: QR-CODE-1');
  assert(!!qrCodeBadge, 'student.qr_code takes priority when no explicit qrIdentifier is passed');

  globalMockContext.fillTextCalls = [];
  generateStudentCardCanvas({
    student: { id: 'uuid-1', nisn: '001', qr_code: null },
    schoolName: 'Test School'
  });
  const nisnBadge = globalMockContext.fillTextCalls.find(c => c.text === 'ID: 001');
  assert(!!nisnBadge, 'student.nisn takes priority when qr_code is null');

  globalMockContext.fillTextCalls = [];
  generateStudentCardCanvas({
    student: { id: 'uuid-fallback', nisn: '', qr_code: '' },
    schoolName: 'Test School'
  });
  const idFallbackBadge = globalMockContext.fillTextCalls.find(c => c.text === 'ID: uuid-fallback');
  assert(!!idFallbackBadge, 'student.id is used as final fallback when both qr_code and nisn are empty');

  // 5.4 Non-Standard Student Status Handling
  globalMockContext.fillTextCalls = [];
  generateStudentCardCanvas({
    student: { id: 's-status', nama_siswa: 'Ali', status: 'Cuti Belajar' },
    schoolName: 'Test School'
  });
  const customStatusBadge = globalMockContext.fillTextCalls.find(c => c.text === 'CUTI BELAJAR');
  assert(!!customStatusBadge, 'Custom non-active student status is properly rendered in uppercase');

  // 5.5 Unicode & Emoji School Name Handling
  globalMockContext.fillTextCalls = [];
  const emojiSchool = '🎓 SMA NEGERI UNGGULAN 🌟';
  generateStudentCardCanvas({
    student: standardStudent,
    schoolName: emojiSchool
  });
  const emojiRendered = globalMockContext.fillTextCalls.find(c => c.text === emojiSchool);
  assert(!!emojiRendered, 'Unicode and emoji in school name are rendered without corruption');

  // 5.6 CSS Specificity Conflict Oracle
  // Verify that within @media print, .sipjam-print-watermark has display: flex !important
  // and no later rule with higher specificity overrides it
  const watermarkIdx = printBlock.indexOf('.sipjam-print-watermark {');
  const afterWatermark = printBlock.slice(watermarkIdx);
  const conflictingOverride = afterWatermark.match(/\.sipjam-print-watermark\s*\{[^}]*display\s*:\s*none/i);
  assert(!conflictingOverride, 'No subsequent rule in @media print overrides .sipjam-print-watermark to display: none');
  } finally {
    (global as any).document = originalDocument;
    (global as any).window = originalWindow;
  }

  // ==========================================================================
  // FINAL SCOREBOARD & SUMMARY
  // ==========================================================================
  console.log('\n======================================================================');
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('======================================================================');

  if (failedTests > 0) {
    throw new Error(`${failedTests} tests failed.`);
  }
}

runTestSuite().catch((err) => {
  console.error('\nADVERSARIAL SUITE ENCOUNTERED FATAL ERROR:', err);
  process.exit(1);
});
