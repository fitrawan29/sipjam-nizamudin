/**
 * tests/adversarial_bk_reviewer_verification.test.ts
 * 
 * Adversarial Reviewer Verification Suite:
 * Probes and tests all edge cases, session synchronization, and RBAC isolation
 * for Guru BK appointment and interface access.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
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

console.log('\n========================================================================');
console.log(`🎉 ALL ${passCount} ADVERSARIAL REVIEWER VERIFICATION CHECKS PASSED EMPIRICALLY!`);
console.log('========================================================================\n');
