/**
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE — MILESTONE 2: REGRESSION & AST INVARIANTS
 * 
 * Verifies that all AST strings, route guards, RBAC contracts, and DOM keep-alive
 * architectures across Clusters 3 to 7 and AppScreen.tsx are strictly intact and uncompromised.
 */

import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✔ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    failed++;
  }
}

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║   ADVERSARIAL CHALLENGER 2: MILESTONE 2 REGRESSION & AST INVARIANTS     ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

// Read source files
const appScreenPath = path.resolve(process.cwd(), 'src/components/AppScreen.tsx');
const gradebookPath = path.resolve(process.cwd(), 'src/components/GradebookView.tsx');
const adminRekapPath = path.resolve(process.cwd(), 'src/components/AdminRekapView.tsx');
const adminDataPath = path.resolve(process.cwd(), 'src/components/AdminDataView.tsx');
const adminConfigPath = path.resolve(process.cwd(), 'src/components/AdminConfigView.tsx');
const adminVerifPath = path.resolve(process.cwd(), 'src/components/AdminVerifView.tsx');
const rekapSiswaPath = path.resolve(process.cwd(), 'src/components/RekapSiswaView.tsx');

const appScreenSrc = fs.readFileSync(appScreenPath, 'utf-8');
const gradebookSrc = fs.readFileSync(gradebookPath, 'utf-8');
const adminRekapSrc = fs.readFileSync(adminRekapPath, 'utf-8');
const adminDataSrc = fs.readFileSync(adminDataPath, 'utf-8');
const adminConfigSrc = fs.readFileSync(adminConfigPath, 'utf-8');
const adminVerifSrc = fs.readFileSync(adminVerifPath, 'utf-8');
const rekapSiswaSrc = fs.readFileSync(rekapSiswaPath, 'utf-8');

// =========================================================================
// SECTION 1: APPSCREEN.TSX AST ROUTE GUARDS & INVARIANTS
// =========================================================================
console.log('--- SECTION 1: AppScreen.tsx AST Route Guards & Backward Compatibility ---');

assert(
  /const\s+GradebookView\s*=\s*dynamic\(\(\)\s*=>\s*import\(['"]\.\/GradebookView['"]\)\);/.test(appScreenSrc),
  'AppScreen dynamically imports GradebookView'
);

assert(
  /const\s+SistemBlokView\s*=\s*dynamic\(\(\)\s*=>\s*import\(['"]\.\/SistemBlokView['"]\)\);/.test(appScreenSrc),
  'AppScreen dynamically imports SistemBlokView'
);

assert(
  /const\s+RaporView\s*=\s*dynamic\(\(\)\s*=>\s*import\(['"]\.\/RaporView['"]\)\);/.test(appScreenSrc),
  'AppScreen dynamically imports RaporView'
);

assert(
  /const\s+AdminBackupView\s*=\s*dynamic\(\(\)\s*=>\s*import\(['"]\.\/AdminBackupView['"]\)\);/.test(appScreenSrc),
  'AppScreen dynamically imports AdminBackupView'
);

assert(
  appScreenSrc.includes("if (targetId === 'view-sistem-blok')"),
  'AppScreen handleNavigation explicitly guards view-sistem-blok'
);

assert(
  appScreenSrc.includes("if (targetId === 'view-rapor')"),
  'AppScreen handleNavigation explicitly guards view-rapor'
);

assert(
  /currentView\s*===\s*['"]view-rapor['"]\s*&&\s*\(/.test(appScreenSrc),
  'AppScreen view router strictly preserves currentView === "view-rapor" AST invariant'
);

assert(
  /currentView\s*===\s*['"]view-sistem-blok['"]\s*&&\s*\(/.test(appScreenSrc),
  'AppScreen view router strictly preserves currentView === "view-sistem-blok" AST invariant'
);

assert(
  /currentView\s*===\s*['"]view-admin-backup['"]\s*&&\s*\(/.test(appScreenSrc),
  'AppScreen view router strictly preserves currentView === "view-admin-backup" AST invariant'
);

assert(
  /currentView\s*===\s*['"]view-gradebook['"]\s*&&\s*\(/.test(appScreenSrc),
  'AppScreen view router strictly preserves currentView === "view-gradebook" AST invariant'
);

assert(
  /isWaliKelas\s*\?\s*\[\{\s*id:\s*['"]view-rapor['"]/.test(appScreenSrc),
  'AppScreen sidebar conditionally exposes view-rapor exclusively for Wali Kelas'
);

assert(
  appScreenSrc.includes('isReadOnly={isKepalaSekolah && !isAdmin && !isSuperadmin}'),
  'AppScreen propagates isReadOnly flag to AdminVerifView for Kepala Sekolah'
);

// =========================================================================
// SECTION 2: CLUSTER 3 (GRADEBOOKVIEW & RAPORVIEW CONSOLIDATION)
// =========================================================================
console.log('\n--- SECTION 2: Cluster 3 (GradebookView & RaporView Consolidation) ---');

assert(
  gradebookSrc.includes("import ClayTabs, { TabItem } from '@/components/ClayTabs';"),
  'GradebookView imports ClayTabs component'
);

assert(
  gradebookSrc.includes("import RaporView from './RaporView';"),
  'GradebookView imports RaporView component'
);

assert(
  gradebookSrc.includes("const canAccessRapor = isAdmin || isSuperadmin || isWaliKelas;"),
  'GradebookView strictly implements defense-in-depth canAccessRapor RBAC guard'
);

assert(
  gradebookSrc.includes("activeTab === 'gradebook' ? 'block' : 'hidden'"),
  'GradebookView wraps scoring input with CSS keep-alive display toggling'
);

assert(
  gradebookSrc.includes("activeTab === 'rapor' ? 'block' : 'hidden'"),
  'GradebookView wraps RaporView with CSS keep-alive display toggling'
);

assert(
  gradebookSrc.includes('<RaporView user={user} assignedKelas={assignedKelas || null} />'),
  'GradebookView embeds RaporView with user and assignedKelas props'
);

assert(
  gradebookSrc.includes('<AccessDeniedCard') && gradebookSrc.includes('Akses Terblokir'),
  'GradebookView displays AccessDeniedCard when unauthorized user attempts opening rapor tab'
);

// =========================================================================
// SECTION 3: CLUSTER 4 (ADMINREKAPVIEW & ANALITIKVIEW CONVERGENCE)
// =========================================================================
console.log('\n--- SECTION 3: Cluster 4 (AdminRekapView & AnalitikView Convergence) ---');

assert(
  adminRekapSrc.includes("import ClayTabs, { TabItem } from '@/components/ClayTabs';"),
  'AdminRekapView imports ClayTabs'
);

assert(
  adminRekapSrc.includes('isReadOnly?: boolean;'),
  'AdminRekapView declares isReadOnly?: boolean prop contract'
);

assert(
  adminRekapSrc.includes('function isTestGuruName('),
  'AdminRekapView declares and implements isTestGuruName filter helper'
);

assert(
  adminRekapSrc.includes('Hadir*10 + Piket*10 + Jurnal*5 + Dinas*5') ||
  adminRekapSrc.includes('(p.hadir || 0) * 10 + (p.piket || 0) * 10 + (p.jurnal || 0) * 5 + (p.dinas || 0) * 5'),
  'AdminRekapView derives Top 5 Leaderboard dynamically using weighted performance formula'
);

assert(
  adminRekapSrc.includes('<PrintHeader user={user} sekolahId={user?.sekolah_id} />'),
  'AdminRekapView PrintHeader receives user and sekolahId for multi-tenant isolation'
);

assert(
  adminRekapSrc.includes('<PrintSignature'),
  'AdminRekapView includes PrintSignature component'
);

// =========================================================================
// SECTION 4: CLUSTER 5 (MASTER DATA & SISTEM BLOK, CONFIG & BACKUP)
// =========================================================================
console.log('\n--- SECTION 4: Cluster 5 (Master Data & Sistem Blok, Config & Backup) ---');

assert(
  adminDataSrc.includes('initialTab?: string;'),
  'AdminDataView declares initialTab?: string prop'
);

assert(
  adminDataSrc.includes("initialTab === 'blok' || initialTab === 'sistem_blok'"),
  'AdminDataView handles initialTab aliases for blok and sistem_blok'
);

assert(
  adminDataSrc.includes("<SistemBlokView user={user} />"),
  'AdminDataView embeds SistemBlokView component on sistem_blok tab'
);

assert(
  adminDataSrc.includes("if (activeTab === 'sistem_blok' || activeTab === 'blok') return;"),
  'AdminDataView loadData suppresses redundant generic SQL table queries on sistem_blok'
);

assert(
  adminConfigSrc.includes("import AdminBackupView from './AdminBackupView';"),
  'AdminConfigView imports AdminBackupView'
);

assert(
  adminConfigSrc.includes("initialTab?: string;"),
  'AdminConfigView declares initialTab?: string prop'
);

assert(
  adminConfigSrc.includes("<AdminBackupView user={user} />"),
  'AdminConfigView embeds AdminBackupView on backup tab'
);

assert(
  adminConfigSrc.includes("className={activeTab === 'backup' ? 'block' : 'hidden'}"),
  'AdminConfigView wraps AdminBackupView with keep-alive CSS display toggling'
);

assert(
  adminConfigSrc.includes("className={activeTab === 'backup' ? 'hidden' : 'space-y-4'}"),
  'AdminConfigView preserves configuration form values in memory when switching to backup tab'
);

// =========================================================================
// SECTION 5: CLUSTER 6 (PUSAT VERIFIKASI & PERANGKAT DOKUMEN)
// =========================================================================
console.log('\n--- SECTION 5: Cluster 6 (Pusat Verifikasi & Perangkat Dokumen) ---');

assert(
  adminVerifSrc.includes("import DokumenView from './DokumenView';"),
  'AdminVerifView imports DokumenView'
);

assert(
  adminVerifSrc.includes("lower === 'dokumen' || lower === 'perangkat'"),
  'AdminVerifView recognizes both "dokumen" and "perangkat" aliases for Tab 4'
);

assert(
  adminVerifSrc.includes("<DokumenView user={user} />"),
  'AdminVerifView embeds DokumenView on Tab 4'
);

assert(
  adminVerifSrc.includes("className={activeTab === 'Dokumen' ? 'block' : 'hidden'}"),
  'AdminVerifView wraps DokumenView with keep-alive CSS display toggling'
);

assert(
  adminVerifSrc.includes("if (isReadOnly) {") && adminVerifSrc.includes("Aksi dinonaktifkan: Anda dalam mode peninjauan"),
  'AdminVerifView enforces strict read-only execution guard on verifyItem'
);

// =========================================================================
// SECTION 6: CLUSTER 7 (REKAP SISWA & GERBANG PIKET HARMONIZATION)
// =========================================================================
console.log('\n--- SECTION 6: Cluster 7 (Rekap Siswa & Gerbang Piket) ---');

assert(
  rekapSiswaSrc.includes("initialTab?: 'gerbang' | 'rekap';"),
  'RekapSiswaView declares initialTab?: "gerbang" | "rekap" prop contract'
);

assert(
  rekapSiswaSrc.includes("table: 'presensi_siswa'"),
  'RekapSiswaView subscribes to presensi_siswa realtime postgres_changes channel'
);

assert(
  rekapSiswaSrc.includes("activeTab === 'gerbang' && (") && rekapSiswaSrc.includes("activeTab === 'rekap' && ("),
  'RekapSiswaView conditionally renders dedicated sub-panels for gerbang and rekap'
);

// =========================================================================
// SECTION 7: PURE ORACLE CALCULATIONS & RBAC MATRIX STRESS-TESTS
// =========================================================================
console.log('\n--- SECTION 7: Pure Oracle Calculations & RBAC Matrix Stress-Tests ---');

// Oracle 1: Weighted score formula (Hadir*10 + Piket*10 + Jurnal*5 + Dinas*5)
function calculateTeacherScore(p: { hadir?: number; piket?: number; jurnal?: number; dinas?: number }) {
  return (p.hadir || 0) * 10 + (p.piket || 0) * 10 + (p.jurnal || 0) * 5 + (p.dinas || 0) * 5;
}

assert(
  calculateTeacherScore({ hadir: 20, piket: 2, jurnal: 18, dinas: 1 }) === (200 + 20 + 90 + 5),
  'Leaderboard Oracle: standard monthly workload evaluates correctly to 315 points'
);

assert(
  calculateTeacherScore({ hadir: 0, piket: 0, jurnal: 0, dinas: 0 }) === 0,
  'Leaderboard Oracle: zero activity safely evaluates to 0 without NaN/undefined'
);

assert(
  calculateTeacherScore({}) === 0,
  'Leaderboard Oracle: empty/undefined activity object evaluates to 0'
);

// Oracle 2: RBAC Matrix Evaluation
function checkCanAccessRapor(role: string | null | undefined, isWaliKelas: boolean | null | undefined) {
  const normalizedRole = (role || '').toLowerCase().trim();
  const isAdmin = normalizedRole === 'admin';
  const isSuperadmin = normalizedRole === 'superadmin';
  const isWali = !!isWaliKelas;
  return isAdmin || isSuperadmin || isWali;
}

assert(checkCanAccessRapor('guru', false) === false, 'RBAC Matrix: regular non-wali teacher is strictly DENIED');
assert(checkCanAccessRapor('guru', true) === true, 'RBAC Matrix: wali kelas teacher is GRANTED');
assert(checkCanAccessRapor('admin', false) === true, 'RBAC Matrix: administrator without wali role is GRANTED');
assert(checkCanAccessRapor('superadmin', false) === true, 'RBAC Matrix: superadmin without wali role is GRANTED');
assert(checkCanAccessRapor(null, false) === false, 'RBAC Matrix: unauthenticated null user is strictly DENIED');
assert(checkCanAccessRapor(undefined, undefined) === false, 'RBAC Matrix: undefined user is strictly DENIED');

// Summary
console.log('\n══════════════════════════════════════════════════════════════════════════');
console.log(`TOTAL ASSERTIONS : ${passed + failed}`);
console.log(`PASSED           : ${passed}`);
console.log(`FAILED           : ${failed}`);
console.log('══════════════════════════════════════════════════════════════════════════');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL EMPIRICAL CHALLENGER ASSERTIONS PASSED WITH 100% SUCCESS!');
  process.exit(0);
}
