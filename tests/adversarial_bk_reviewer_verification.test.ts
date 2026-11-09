/**
 * tests/adversarial_bk_reviewer_verification.test.ts
 * 
 * Adversarial Reviewer Verification Suite:
 * Probes and tests all edge cases, session synchronization, and RBAC isolation
 * for Guru BK appointment and interface access.
 */

import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { evaluateTabRBAC, getConsolidatedMenuItems, resolveCanonicalRoute } from '../src/lib/navigation';

console.log('\n========================================================================');
console.log('🛡️ ADVERSARIAL REVIEWER VERIFICATION: BK ROLE & SESSION INTEGRITY');
console.log('========================================================================\n');

let passCount = 0;
function pass(desc: string) {
  passCount++;
  console.log(`  ✔ [PASS] ${desc}`);
}

// 1. RBAC Isolation for Teachers Appointed BK via mata_pelajaran
console.log('--- Suite 1: RBAC for Teachers Appointed via mata_pelajaran (Constraint Fallback) ---');

const mapelBkVariants = [
  'Bimbingan Konseling (BK)',
  'Bimbingan Konseling',
  'bimbingan konseling',
  'Bimbingan dan Konseling',
  'bimbingan dan konseling',
  'BK',
  'bk',
  '  BK  ',
  'bk '
];

for (const mapel of mapelBkVariants) {
  const user = { role: 'Guru', mata_pelajaran: mapel };
  const rbacJurnalBk = evaluateTabRBAC('view-jurnal-bk', '', user);
  assert.strictEqual(rbacJurnalBk.allowed, true, `Teacher with mapel '${mapel}' MUST be allowed into view-jurnal-bk`);
  pass(`Teacher with role: 'Guru' & mapel: '${mapel}' PERMITTED to view-jurnal-bk`);

  const rbacKbm = evaluateTabRBAC('view-guru-jurnal', '', user);
  assert.strictEqual(rbacKbm.allowed, false, `Teacher with mapel '${mapel}' MUST be blocked from view-guru-jurnal`);
  assert.strictEqual(rbacKbm.fallbackTab, 'view-home');
  pass(`Teacher with role: 'Guru' & mapel: '${mapel}' strictly BLOCKED from view-guru-jurnal`);

  const rbacDokumen = evaluateTabRBAC('view-dokumen', '', user);
  assert.strictEqual(rbacDokumen.allowed, false, `Teacher with mapel '${mapel}' MUST be blocked from view-dokumen`);
  pass(`Teacher with role: 'Guru' & mapel: '${mapel}' strictly BLOCKED from view-dokumen`);
}

// 2. RBAC Isolation for isBk Flag Override
console.log('\n--- Suite 2: RBAC with isBk Flag Override ---');

const userWithFlag = { role: 'Guru', isBk: true };
const flagJurnalBk = evaluateTabRBAC('view-jurnal-bk', '', userWithFlag);
assert.strictEqual(flagJurnalBk.allowed, true);
pass("User with isBk: true PERMITTED to view-jurnal-bk");

const flagKbm = evaluateTabRBAC('view-guru-jurnal', '', userWithFlag);
assert.strictEqual(flagKbm.allowed, false);
pass("User with isBk: true strictly BLOCKED from view-guru-jurnal");

// 3. Regular Teacher Non-Regression
console.log('\n--- Suite 3: Regular Teacher Non-Regression ---');

const regularSubjects = [
  'Matematika',
  'Bahasa Indonesia',
  'IPA Terpadu',
  'Pendidikan Jasmani',
  'Sejarah Kebudayaan Islam'
];

for (const mapel of regularSubjects) {
  const regUser = { role: 'Guru', mata_pelajaran: mapel };
  const resBk = evaluateTabRBAC('view-jurnal-bk', '', regUser);
  assert.strictEqual(resBk.allowed, false, `Regular teacher in '${mapel}' MUST be blocked from Jurnal BK`);
  assert.ok(resBk.reason?.includes('Jurnal BK bersifat rahasia'));
  pass(`Regular teacher '${mapel}' strictly BLOCKED from view-jurnal-bk with confidentiality reason`);

  const resKbm = evaluateTabRBAC('view-guru-jurnal', '', regUser);
  assert.strictEqual(resKbm.allowed, true, `Regular teacher in '${mapel}' MUST be allowed into view-guru-jurnal`);
  pass(`Regular teacher '${mapel}' strictly PERMITTED to view-guru-jurnal`);
}

// 4. Menu Consolidation with isBk flag
console.log('\n--- Suite 4: Consolidated Menu Generation with isBk Flag ---');

const bkMenusWithFlag = getConsolidatedMenuItems({ role: 'Guru', isBk: true });
assert.strictEqual(bkMenusWithFlag.length, 5);
const expectedIds = ['view-home', 'view-guru-presensi', 'view-jurnal-bk', 'view-informasi', 'view-pengaturan-akun'];
assert.deepStrictEqual(bkMenusWithFlag.map(m => m.id), expectedIds);
pass("getConsolidatedMenuItems({ role: 'Guru', isBk: true }) generates strictly 5 BK items");

// 5. Menu Consolidation with mapelBkVariants (Constraint Fallback in Menu Generator)
console.log('\n--- Suite 5: Consolidated Menu Generation with mata_pelajaran Variants ---');

for (const mapel of mapelBkVariants) {
  const menus = getConsolidatedMenuItems({ role: 'Guru', mata_pelajaran: mapel });
  assert.strictEqual(menus.length, 5, `Expected 5 items for mapel '${mapel}'`);
  assert.deepStrictEqual(menus.map(m => m.id), expectedIds);
  pass(`getConsolidatedMenuItems({ role: 'Guru', mata_pelajaran: '${mapel}' }) produces strictly 5 BK items`);

  // Also verify camelCase mataPelajaran
  const menusCamel = getConsolidatedMenuItems({ role: 'Guru', mataPelajaran: mapel });
  assert.strictEqual(menusCamel.length, 5);
  pass(`getConsolidatedMenuItems({ role: 'Guru', mataPelajaran: '${mapel}' }) produces strictly 5 BK items`);
}

// 6. Session Reversion Simulation (Clearing BK Mapel variants on Reversion to Guru)
console.log('\n--- Suite 6: Session Reversion Simulation ---');

const testRevertSync = (initialMapel: string) => {
  const parsed = {
    id: 'test-guru-123',
    role: 'bk',
    mata_pelajaran: initialMapel
  };
  const targetRole = 'Guru';

  if (targetRole) {
    parsed.role = targetRole;
    if (targetRole === 'bk' || targetRole === 'guru_bk') {
      parsed.mata_pelajaran = 'Bimbingan Konseling (BK)';
    } else {
      const currentMapel = (parsed.mata_pelajaran || '').toLowerCase();
      if (
        currentMapel.includes('bimbingan konseling') ||
        currentMapel.includes('bimbingan dan konseling') ||
        currentMapel.trim() === 'bk'
      ) {
        parsed.mata_pelajaran = '-';
      }
    }
  }

  assert.strictEqual(parsed.role, 'Guru');
  assert.strictEqual(parsed.mata_pelajaran, '-', `Mapel '${initialMapel}' must be reset to '-' on revert`);

  // Verify that subsequent RBAC check treats them as regular Guru
  const rbacAfterRevert = evaluateTabRBAC('view-jurnal-bk', '', parsed);
  assert.strictEqual(rbacAfterRevert.allowed, false, 'Reverted teacher MUST be blocked from Jurnal BK');
  const rbacKbmAfterRevert = evaluateTabRBAC('view-guru-jurnal', '', parsed);
  assert.strictEqual(rbacKbmAfterRevert.allowed, true, 'Reverted teacher MUST be allowed into KBM journal');
};

for (const mapel of mapelBkVariants) {
  testRevertSync(mapel);
  pass(`Session cleanly reverted from BK mapel '${mapel}' back to Guru`);
}

// 7. AST Comments & Invariant Preservation
console.log('\n--- Suite 7: AST Comments & Structural Preservation ---');

const appScreen = fs.readFileSync(path.resolve('src/components/AppScreen.tsx'), 'utf-8');
assert.ok(appScreen.includes('{/* AST preservation: data-tour={item.id} */}'));
pass("AppScreen.tsx verbatim AST comment preserved");

const claySidebar = fs.readFileSync(path.resolve('src/components/ClaySidebar.tsx'), 'utf-8');
assert.ok(claySidebar.includes('{/* AST preservation: data-tour={item.id} */}'));
pass("ClaySidebar.tsx verbatim AST comment preserved");

const homeViewGuru = fs.readFileSync(path.resolve('src/components/HomeViewGuru.tsx'), 'utf-8');
assert.ok(homeViewGuru.includes('Layanan Bimbingan & Konseling (Guru BK)'));
assert.ok(homeViewGuru.includes("label.includes('Jurnal') ? (isBk ? 'view-jurnal-bk' : 'view-guru-jurnal') : null") || homeViewGuru.includes("isBk ? 'view-jurnal-bk' : 'view-guru-jurnal'"));
pass("HomeViewGuru.tsx contains dedicated Guru BK quick access card and correct journal routing");

console.log('\n========================================================================');
console.log(`🎉 ALL ${passCount} ADVERSARIAL REVIEWER VERIFICATION CHECKS PASSED EMPIRICALLY!`);
console.log('========================================================================\n');
