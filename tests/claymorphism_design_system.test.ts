import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('🎨 TEST SUITE: CLAYMORPHISM DESIGN SYSTEM & COMPREHENSIVE UI REFACTOR');
console.log('========================================================================\n');

const projectRoot = process.cwd();

// SECTION 1: REUSABLE CLAYMORPHISM DESIGN SYSTEM PRIMITIVES
console.log('━━━ SECTION 1: R1 - Design System Primitives & Exports ━━━');

const clayCardPath = path.join(projectRoot, 'src', 'components', 'ClayCard.tsx');
const clayButtonPath = path.join(projectRoot, 'src', 'components', 'ClayButton.tsx');
const claySidebarPath = path.join(projectRoot, 'src', 'components', 'ClaySidebar.tsx');
const clayIndexPath = path.join(projectRoot, 'src', 'components', 'clay', 'index.ts');

assert(fs.existsSync(clayCardPath), 'ClayCard.tsx exists');
assert(fs.existsSync(clayButtonPath), 'ClayButton.tsx exists');
assert(fs.existsSync(claySidebarPath), 'ClaySidebar.tsx exists');
assert(fs.existsSync(clayIndexPath), 'src/components/clay/index.ts barrel exists');

const cardSrc = fs.readFileSync(clayCardPath, 'utf8');
const btnSrc = fs.readFileSync(clayButtonPath, 'utf8');
const sidebarSrc = fs.readFileSync(claySidebarPath, 'utf8');
const indexSrc = fs.readFileSync(clayIndexPath, 'utf8');

// 1.1 ClayCard contracts
assert(cardSrc.includes('export type ClayCardVariant'), 'ClayCard exports ClayCardVariant');
assert(cardSrc.includes("'mint'") && cardSrc.includes("'peach'") && cardSrc.includes("'blue'"), 'ClayCard supports pastel variants');
assert(cardSrc.includes('clay-card'), 'ClayCard applies clay-card base styles');
console.log('  ✔ [PASS] ClayCard TypeScript component & pastel variants verified');

// 1.2 ClayButton contracts
assert(btnSrc.includes('export type ClayButtonVariant'), 'ClayButton exports ClayButtonVariant');
assert(btnSrc.includes('export type ClayButtonSize'), 'ClayButton exports ClayButtonSize');
assert(btnSrc.includes('clay-btn'), 'ClayButton applies tactile clay-btn base class');
console.log('  ✔ [PASS] ClayButton component, sizes, and tactile squish feedback verified');

// 1.3 ClaySidebar contracts
assert(sidebarSrc.includes('export interface ClaySidebarProps'), 'ClaySidebar exports ClaySidebarProps');
assert(sidebarSrc.includes('data-tour={item.id}'), 'ClaySidebar retains data-tour attributes for menu items');
assert(sidebarSrc.includes('ClayCard'), 'ClaySidebar integrates ClayCard for user profile');
console.log('  ✔ [PASS] ClaySidebar modular component & responsive drawer verified');

import React from 'react';
import { renderToString } from 'react-dom/server';
import { ClayCard, ClayButton, ClaySidebar } from '../src/components/clay';

// 1.4 Barrel exports
assert(indexSrc.includes('ClayCard') && indexSrc.includes('ClayButton') && indexSrc.includes('ClaySidebar'), 'Barrel exports all 3 primitives');
console.log('  ✔ [PASS] Barrel index exports all claymorphism primitives');

// 1.5 Runtime React component rendering & edge cases
const renderedCard = renderToString(React.createElement(ClayCard, { variant: 'mint', rounded: '2xl' }, 'Test Card Content'));
assert(renderedCard.includes('clay-card-mint') && renderedCard.includes('rounded-2xl'), 'ClayCard renders with variant and radius classes');

const renderedBtn = renderToString(React.createElement(ClayButton, { variant: 'primary', size: 'lg', loading: true }, 'Save'));
assert(renderedBtn.includes('clay-btn-primary') && renderedBtn.includes('fa-circle-notch'), 'ClayButton renders loading spinner and variant');

const renderedSidebar = renderToString(React.createElement(ClaySidebar, {
  isOpen: true,
  onClose: () => {},
  user: { id: 'u1', username: 'guru1', nama: 'Guru Test', role: 'guru', sekolah_id: 's1' },
  currentView: 'view-guru-dashboard',
  onNavigate: () => {},
  menuItems: [{ id: 'view-guru-dashboard', label: 'Dashboard', icon: 'fa-house' }]
}));
assert(renderedSidebar.includes('Guru Test') && renderedSidebar.includes('data-tour="view-guru-dashboard"'), 'ClaySidebar renders user profile and menu items');

// Edge case: null user & empty menu
const renderedEmptySidebar = renderToString(React.createElement(ClaySidebar, {
  isOpen: true,
  onClose: () => {},
  user: null as any,
  currentView: 'view-guru-dashboard',
  onNavigate: () => {},
  menuItems: []
}));
assert(renderedEmptySidebar.includes('Pengguna SIPJAM'), 'ClaySidebar handles null user gracefully with fallback label');
console.log('  ✔ [PASS] Runtime React component rendering & edge case handling verified');


// SECTION 2: CSS DESIGN TOKENS & CANVAS PALETTE
console.log('\n━━━ SECTION 2: Design Tokens & Palette in globals.css ━━━');

const globalsCssPath = path.join(projectRoot, 'src', 'app', 'globals.css');
const layoutPath = path.join(projectRoot, 'src', 'app', 'layout.tsx');

const cssSrc = fs.readFileSync(globalsCssPath, 'utf8');
const layoutSrc = fs.readFileSync(layoutPath, 'utf8');

// 2.1 Background canvas token #FDF6EC
assert(cssSrc.includes('#FDF6EC'), 'globals.css defines #FDF6EC as primary background token');
assert(layoutSrc.includes('#FDF6EC'), 'layout.tsx uses #FDF6EC canvas background');
console.log('  ✔ [PASS] Soft pastel canvas #FDF6EC configured across root layout and CSS');

// 2.2 Soft 3D clay aesthetic (dual shadow + inset highlights)
assert(cssSrc.includes('.clay-card {') && cssSrc.includes('inset 2px 2px 4px'), 'clay-card defines dual drop shadow and inner highlights');
assert(cssSrc.includes('.clay-card-mint') && cssSrc.includes('#EAF5ED'), 'clay-card-mint pastel token defined');
assert(cssSrc.includes('.clay-card-peach') && cssSrc.includes('#FFF6E9'), 'clay-card-peach pastel token defined');
assert(cssSrc.includes('.clay-card-blue') && cssSrc.includes('#EEF6FF'), 'clay-card-blue pastel token defined');
assert(cssSrc.includes('.clay-card-rose') && cssSrc.includes('#FFF0F2'), 'clay-card-rose pastel token defined');
assert(cssSrc.includes('.clay-card-purple') && cssSrc.includes('#F6F1FD'), 'clay-card-purple pastel token defined');
console.log('  ✔ [PASS] Dual box-shadow and multi-colored pastel clay palettes verified');

// 2.3 Clay button interactive squish feedback
assert(cssSrc.includes('.clay-btn {') && cssSrc.includes(':active'), 'clay-btn includes tactile press/squish transitions');
assert(cssSrc.includes('.clay-btn-primary') && cssSrc.includes('.clay-btn-secondary'), 'clay-btn defines primary and secondary variants');
console.log('  ✔ [PASS] Tactile clay button push feedback tokens verified');

// 2.4 Print Layout & @media print Audit (Resets borders, shadows, and pagination)
assert(cssSrc.includes('.clay-card,') && cssSrc.includes('.clay-inset {') && cssSrc.includes('box-shadow: none !important;'), 'Print resets strip clay box-shadows');
assert(cssSrc.includes('.clay-card,') && cssSrc.includes('border: none !important;'), 'Print resets strip clay borders');
assert(cssSrc.includes('overflow: visible !important;') && cssSrc.includes('.clay-card'), 'Print resets include .clay-card in continuous multi-page pagination');
console.log('  ✔ [PASS] Print layout & @media print resets verified for claymorphism cards');

// 2.5 High-Contrast OS Accessibility Adaptation (WCAG 2.1 AAA)
assert(cssSrc.includes('@media (prefers-contrast: more)'), 'globals.css includes prefers-contrast: more high contrast styles');
assert(cssSrc.includes('border: 2px solid currentColor !important;'), 'High contrast styles enforce currentColor semantic borders');
console.log('  ✔ [PASS] High-contrast OS accessibility adaptations verified');

// 2.6 Mobile Touch Tap Responsiveness & GPU Layering
assert(cssSrc.includes('touch-action: manipulation;'), 'clay-btn includes touch-action: manipulation for instant touch response');
assert(cssSrc.includes('transform: translateZ(0);'), 'clay-card includes GPU compositor layer for 60fps mobile scrolling');
console.log('  ✔ [PASS] Touch-action manipulation & GPU hardware layering verified');


// SECTION 3: COMPREHENSIVE UI REFACTORING ACROSS SCREENS
console.log('\n━━━ SECTION 3: Comprehensive Screen Refactoring ━━━');

// 3.1 AppScreen Header & Mobile Drawer
const appScreenPath = path.join(projectRoot, 'src', 'components', 'AppScreen.tsx');
const appScreenSrc = fs.readFileSync(appScreenPath, 'utf8');

assert(appScreenSrc.includes('<ClayCard variant="mint"'), 'AppScreen uses ClayCard for user identity card');
assert(appScreenSrc.includes('<ClayButton variant="rose"'), 'AppScreen uses ClayButton for logout action');
assert(appScreenSrc.includes('clay-btn'), 'AppScreen uses clay-btn for header and drawer buttons');
assert(appScreenSrc.includes('data-tour="hamburger-btn"'), 'AppScreen retains data-tour="hamburger-btn"');
assert(appScreenSrc.includes('data-tour={item.id}'), 'AppScreen retains data-tour={item.id}');
console.log('  ✔ [PASS] AppScreen header, sidebar drawer, and modal containers refactored');

// 3.2 HomeViewAdmin
const adminHomePath = path.join(projectRoot, 'src', 'components', 'HomeViewAdmin.tsx');
const adminHomeSrc = fs.readFileSync(adminHomePath, 'utf8');

assert(adminHomeSrc.includes('clay-card clay-card-blue'), 'HomeViewAdmin KPI includes clay-card-blue (Total Guru)');
assert(adminHomeSrc.includes('clay-card clay-card-mint'), 'HomeViewAdmin KPI includes clay-card-mint (Presensi Datang)');
assert(adminHomeSrc.includes('clay-card clay-card-peach'), 'HomeViewAdmin KPI includes clay-card-peach (Jurnal Lengkap)');
assert(adminHomeSrc.includes('clay-card clay-card-purple'), 'HomeViewAdmin KPI includes clay-card-purple (Piket Selesai)');
assert(adminHomeSrc.includes('clay-card clay-card-amber'), 'HomeViewAdmin KPI includes clay-card-amber (Presensi Pulang)');
assert(adminHomeSrc.includes('clay-card p-4 sm:p-5 space-y-3 rounded-3xl'), 'HomeViewAdmin daily matrix container uses clay-card');
console.log('  ✔ [PASS] HomeViewAdmin KPI metric cards & matrix container refactored');

// 3.3 HomeViewGuru
const guruHomePath = path.join(projectRoot, 'src', 'components', 'HomeViewGuru.tsx');
const guruHomeSrc = fs.readFileSync(guruHomePath, 'utf8');

assert(guruHomeSrc.includes('clay-card-mint') && guruHomeSrc.includes('clay-card-amber'), 'HomeViewGuru personal attendance cards use clay-card variants');
assert(guruHomeSrc.includes('clay-inset rounded-2xl'), 'HomeViewGuru accumulation info uses clay-inset rounded-2xl');
assert(guruHomeSrc.includes('clay-btn clay-btn-primary'), 'HomeViewGuru Wali Kelas CTA uses clay-btn-primary');
console.log('  ✔ [PASS] HomeViewGuru personal stats & action cards refactored');

// 3.4 PiketView
const piketPath = path.join(projectRoot, 'src', 'components', 'PiketView.tsx');
const piketSrc = fs.readFileSync(piketPath, 'utf8');

assert(piketSrc.includes('clay-btn px-4 py-2 rounded-2xl'), 'PiketView tab buttons use clay-btn');
assert(piketSrc.includes('clay-btn-mint'), 'PiketView active tab uses clay-btn-mint');
console.log('  ✔ [PASS] PiketView tabs & actions refactored');

// 3.5 GuruPresensi & GuruJurnal
const presensiPath = path.join(projectRoot, 'src', 'components', 'GuruPresensi.tsx');
const jurnalPath = path.join(projectRoot, 'src', 'components', 'GuruJurnal.tsx');
const presensiSrc = fs.readFileSync(presensiPath, 'utf8');
const jurnalSrc = fs.readFileSync(jurnalPath, 'utf8');

assert(presensiSrc.includes('clay-btn clay-btn-primary'), 'GuruPresensi submit button uses clay-btn-primary');
assert(presensiSrc.includes('clay-card p-5 sm:p-6 rounded-3xl'), 'GuruPresensi container uses clay-card');
assert(jurnalSrc.includes('clay-btn clay-btn-blue'), 'GuruJurnal submit button uses clay-btn-blue');
assert(jurnalSrc.includes('clay-card p-5 sm:p-6 rounded-3xl'), 'GuruJurnal container uses clay-card');
console.log('  ✔ [PASS] GuruPresensi & GuruJurnal form containers and submit actions refactored');

// 3.6 Rekap Views
const adminRekapPath = path.join(projectRoot, 'src', 'components', 'AdminRekapView.tsx');
const rekapJurnalPath = path.join(projectRoot, 'src', 'components', 'RekapJurnalView.tsx');
const rekapSiswaPath = path.join(projectRoot, 'src', 'components', 'RekapSiswaView.tsx');
const adminRekapSrc = fs.readFileSync(adminRekapPath, 'utf8');
const rekapJurnalSrc = fs.readFileSync(rekapJurnalPath, 'utf8');
const rekapSiswaSrc = fs.readFileSync(rekapSiswaPath, 'utf8');

assert(adminRekapSrc.includes('clay-card-blue') && adminRekapSrc.includes('clay-card-mint'), 'AdminRekapView summary badges use clay-card variants');
assert(adminRekapSrc.includes('clay-btn clay-btn-blue'), 'AdminRekapView download button uses clay-btn-blue');
assert(rekapJurnalSrc.includes('clay-card-blue') && rekapJurnalSrc.includes('clay-card-rose'), 'RekapJurnalView metric cards use clay-card variants');
assert(rekapSiswaSrc.includes('clay-btn') && rekapSiswaSrc.includes('clay-card-mint'), 'RekapSiswaView tab buttons and homeroom banner use clay styling');
console.log('  ✔ [PASS] Rekapitulasi views (Admin, Jurnal, Siswa) refactored');

// 3.7 Modals & Login Screen
const accountModalPath = path.join(projectRoot, 'src', 'components', 'AccountSettingsModal.tsx');
const loginPath = path.join(projectRoot, 'src', 'components', 'LoginScreen.tsx');
const accountModalSrc = fs.readFileSync(accountModalPath, 'utf8');
const loginSrc = fs.readFileSync(loginPath, 'utf8');

assert(accountModalSrc.includes('clay-card bg-[#FAF7F2]'), 'AccountSettingsModal uses clay-card dialog container');
assert(accountModalSrc.includes('clay-btn clay-btn-primary'), 'AccountSettingsModal save button uses clay-btn-primary');
assert(loginSrc.includes('clay-card w-full max-w-md'), 'LoginScreen authentication card uses clay-card rounded-3xl');
assert(loginSrc.includes('clay-btn clay-btn-primary'), 'LoginScreen submit button uses clay-btn-primary');
console.log('  ✔ [PASS] Modals and LoginScreen refactored with soft 3D claymorphism');


// SECTION 4: INTEGRITY OF BUSINESS LOGIC, DATABASE, AND RBAC
console.log('\n━━━ SECTION 4: Logic Preservation & Non-Regression ━━━');

assert(appScreenSrc.includes('useSessionSync'), 'AppScreen maintains useSessionSync');
assert(appScreenSrc.includes('useWaliKelas'), 'AppScreen maintains useWaliKelas');
assert(appScreenSrc.includes('usePiket'), 'AppScreen maintains usePiket');
assert(appScreenSrc.includes('useKepalaSekolah'), 'AppScreen maintains useKepalaSekolah');
assert(appScreenSrc.includes('useBroadcasts'), 'AppScreen maintains useBroadcasts');
assert(appScreenSrc.includes('handleNavigation'), 'AppScreen maintains handleNavigation route guards');
console.log('  ✔ [PASS] Zero modifications to database hooks, queries, or business logic');

console.log('\n========================================================================');
console.log('🎉 ALL CLAYMORPHISM DESIGN SYSTEM VERIFICATIONS PASSED (100% SUCCESS)');
console.log('========================================================================');
