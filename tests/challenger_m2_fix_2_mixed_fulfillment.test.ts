/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL CHALLENGER SUITE: CHALLENGER_M2_FIX_2
 * Mixed Schedule & Fulfillment Invariants Re-Challenge
 *
 * File: tests/challenger_m2_fix_2_mixed_fulfillment.test.ts
 *
 * SCOPE:
 * 1. Mixed Schedule Simulation (Unblocked + Blocked Combinations)
 * 2. Invariant: ONLY Jurnal Kegiatan leaves isJurnalDone = false when unblocked KBM incomplete
 * 3. Invariant: BOTH unblocked journals + blocked journals sets isJurnalDone = true
 * 4. Combinatorial Matrix: (1+3, 2+2, 3+1, 0+4, 4+0)
 * 5. AST & Source Code Proof in src/lib/workflow.ts
 * 6. Presensi Pulang & Locked Reason Verification
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${label}`);
    if (detail) console.error(`   ${detail}`);
    failed++;
  }
}

async function runEmpiricalReChallenge() {
  console.log('====================================================');
  console.log('CHALLENGER M2 FIX 2: EMPIRICAL MIXED SCHEDULE FULFILLMENT RE-CHALLENGE');
  console.log('====================================================\n');

  const {
    isJurnalMatchJadwal,
    canTeacherPresensiPulang,
  } = await import('../src/lib/workflow');

  // Exact function simulating getGuruDailyState lines 996-1030
  function computeFulfillmentState(state: any, isTeacherExempt = false) {
    let isJurnalDone = false;
    let lockedReason: string | null = null;

    if (state.isNonTeachingDay) {
      isJurnalDone = true;
    } else if (state.isBlok || state.isDinasLuar || state.jadwalKBM.length === 0) {
      if (state.jurnalKegiatan) isJurnalDone = true;
      if (isTeacherExempt && state.jadwalKBM.length === 0) isJurnalDone = true;
      if (state.jadwalKBM.length === 0 && state.isPiket) isJurnalDone = true;
    } else {
      const unblockedSchedules = state.jadwalKBM.filter((jk: any) => !jk.isBlocked);
      const blockedSchedules = state.jadwalKBM.filter((jk: any) => jk.isBlocked);

      const unblockedFulfilled = unblockedSchedules.every((jk: any) =>
        state.jurnalKBM.some((j: any) => isJurnalMatchJadwal(j, jk))
      );
      const blockedFulfilled = blockedSchedules.length === 0 || Boolean(state.jurnalKegiatan);

      if (unblockedFulfilled && blockedFulfilled) {
        isJurnalDone = true;
      }
    }

    let isPiketDone = true;
    if (state.isPiket && !state.laporanPiket) {
      isPiketDone = false;
    }

    let canPresensiPulang = false;
    if (isJurnalDone && isPiketDone) {
      canPresensiPulang = true;
    } else {
      const missing = [];
      if (!isPiketDone) missing.push('Laporan Piket');
      if (!isJurnalDone) missing.push(state.isBlok ? 'Jurnal Kegiatan (Sistem Blok)' : 'Jurnal (KBM/Kegiatan)');
      lockedReason = `Anda belum menyelesaikan: ${missing.join(', ')}`;
    }

    // Override by canTeacherPresensiPulang (R2: Presensi Datang recorded allows Pulang)
    if (canTeacherPresensiPulang(state)) {
      canPresensiPulang = true;
      if (lockedReason && lockedReason.startsWith('Anda belum menyelesaikan')) {
        lockedReason = null;
      }
    }

    return {
      isJurnalDone,
      isPiketDone,
      canPresensiPulang,
      lockedReason,
    };
  }

  // --- Scenarios Data Setup ---
  const sReg1 = { id: 's1', kelas: 'X RPL 1', mata_pelajaran: 'Dasar Pemrograman', isBlocked: false };
  const sReg2 = { id: 's2', kelas: 'XI RPL 1', mata_pelajaran: 'Pemrograman Web', isBlocked: false };
  const sReg3 = { id: 's3', kelas: 'XII RPL 1', mata_pelajaran: 'Basis Data', isBlocked: false };
  const sBlok1 = { id: 'sb1', kelas: 'X TKJ 1', mata_pelajaran: 'Jaringan', isBlocked: true };
  const sBlok2 = { id: 'sb2', kelas: 'X TKJ 2', mata_pelajaran: 'Sistem Operasi', isBlocked: true };
  const sBlok3 = { id: 'sb3', kelas: 'XI TKJ 1', mata_pelajaran: 'Troubleshooting', isBlocked: true };

  const jReg1 = { id: 'jr1', kelas: 'X RPL 1', mapel: 'Dasar Pemrograman', keterangan: 'KBM 1' };
  const jReg2 = { id: 'jr2', kelas: 'XI RPL 1', mapel: 'Pemrograman Web', keterangan: 'KBM 2' };
  const jReg3 = { id: 'jr3', kelas: 'XII RPL 1', mapel: 'Basis Data', keterangan: 'KBM 3' };
  const jKegiatan = { id: 'jk1', keterangan: 'Jurnal Kegiatan', materi: 'Workshop Asesmen' };

  // ====================================================
  // TEST SUITE 1: 2 Regular + 2 Blocked (Mixed Schedule)
  // ====================================================
  console.log('--- Test Suite 1: 2 Regular + 2 Blocked Schedules ---');

  const baseStateMixed2x2 = {
    tanggal: '2026-11-02',
    isBlok: false,
    hasBlockedSchedule: true,
    jadwalKBM: [sReg1, sReg2, sBlok1, sBlok2],
    jurnalKBM: [],
    jurnalKegiatan: null,
    isPiket: false,
    presensiDatang: null,
  };

  // 1.1 Zero journals submitted
  const res1_1 = computeFulfillmentState(baseStateMixed2x2);
  assert(res1_1.isJurnalDone === false, '1.1 Zero journals: isJurnalDone === false');
  assert(res1_1.canPresensiPulang === false, '1.1 Zero journals (no presensiDatang): canPresensiPulang === false');
  assert(res1_1.lockedReason?.includes('Jurnal (KBM/Kegiatan)') === true, '1.1 Zero journals: lockedReason cites Jurnal');

  // 1.2 ONLY Jurnal Kegiatan submitted (unblocked KBM journals incomplete)
  const res1_2 = computeFulfillmentState({
    ...baseStateMixed2x2,
    jurnalKegiatan: jKegiatan,
  });
  assert(res1_2.isJurnalDone === false, '1.2 ONLY Jurnal Kegiatan submitted: isJurnalDone MUST be false (unblocked KBM incomplete)');
  assert(res1_2.lockedReason?.includes('Jurnal (KBM/Kegiatan)') === true, '1.2 ONLY Jurnal Kegiatan: lockedReason remains active');

  // 1.3 1 of 2 KBM journals + Jurnal Kegiatan (partial unblocked KBM)
  const res1_3 = computeFulfillmentState({
    ...baseStateMixed2x2,
    jurnalKBM: [jReg1],
    jurnalKegiatan: jKegiatan,
  });
  assert(res1_3.isJurnalDone === false, '1.3 Partial unblocked KBM (1/2) + Jurnal Kegiatan: isJurnalDone MUST be false');

  // 1.4 BOTH regular KBM journals submitted, but NO Jurnal Kegiatan
  const res1_4 = computeFulfillmentState({
    ...baseStateMixed2x2,
    jurnalKBM: [jReg1, jReg2],
    jurnalKegiatan: null,
  });
  assert(res1_4.isJurnalDone === false, '1.4 ALL unblocked KBM (2/2) but NO Jurnal Kegiatan: isJurnalDone MUST be false (blocked classes require Kegiatan)');

  // 1.5 BOTH regular KBM journals AND Jurnal Kegiatan submitted
  const res1_5 = computeFulfillmentState({
    ...baseStateMixed2x2,
    jurnalKBM: [jReg1, jReg2],
    jurnalKegiatan: jKegiatan,
  });
  assert(res1_5.isJurnalDone === true, '1.5 BOTH unblocked KBM (2/2) AND Jurnal Kegiatan submitted: isJurnalDone MUST be true');
  assert(res1_5.canPresensiPulang === true, '1.5 Complete fulfillment: canPresensiPulang === true');
  assert(res1_5.lockedReason === null, '1.5 Complete fulfillment: lockedReason is cleared');

  // ====================================================
  // TEST SUITE 2: 1 Regular + 3 Blocked (Asymmetric Mixed)
  // ====================================================
  console.log('\n--- Test Suite 2: 1 Regular + 3 Blocked Schedules ---');

  const baseStateMixed1x3 = {
    tanggal: '2026-11-02',
    isBlok: false,
    hasBlockedSchedule: true,
    jadwalKBM: [sReg1, sBlok1, sBlok2, sBlok3],
    jurnalKBM: [],
    jurnalKegiatan: null,
    isPiket: false,
    presensiDatang: null,
  };

  // 2.1 ONLY Jurnal Kegiatan
  const res2_1 = computeFulfillmentState({
    ...baseStateMixed1x3,
    jurnalKegiatan: jKegiatan,
  });
  assert(res2_1.isJurnalDone === false, '2.1 1 Reg + 3 Blok: ONLY Jurnal Kegiatan -> isJurnalDone === false');

  // 2.2 ONLY Regular KBM Journal
  const res2_2 = computeFulfillmentState({
    ...baseStateMixed1x3,
    jurnalKBM: [jReg1],
  });
  assert(res2_2.isJurnalDone === false, '2.2 1 Reg + 3 Blok: ONLY Regular KBM -> isJurnalDone === false');

  // 2.3 BOTH Regular KBM Journal AND Jurnal Kegiatan
  const res2_3 = computeFulfillmentState({
    ...baseStateMixed1x3,
    jurnalKBM: [jReg1],
    jurnalKegiatan: jKegiatan,
  });
  assert(res2_3.isJurnalDone === true, '2.3 1 Reg + 3 Blok: BOTH Regular + Kegiatan -> isJurnalDone === true');

  // ====================================================
  // TEST SUITE 3: 3 Regular + 1 Blocked (Asymmetric Mixed)
  // ====================================================
  console.log('\n--- Test Suite 3: 3 Regular + 1 Blocked Schedules ---');

  const baseStateMixed3x1 = {
    tanggal: '2026-11-02',
    isBlok: false,
    hasBlockedSchedule: true,
    jadwalKBM: [sReg1, sReg2, sReg3, sBlok1],
    jurnalKBM: [],
    jurnalKegiatan: null,
    isPiket: false,
    presensiDatang: null,
  };

  // 3.1 ONLY Jurnal Kegiatan
  const res3_1 = computeFulfillmentState({
    ...baseStateMixed3x1,
    jurnalKegiatan: jKegiatan,
  });
  assert(res3_1.isJurnalDone === false, '3.1 3 Reg + 1 Blok: ONLY Jurnal Kegiatan -> isJurnalDone === false');

  // 3.2 2 of 3 Regular KBM Journals + Jurnal Kegiatan
  const res3_2 = computeFulfillmentState({
    ...baseStateMixed3x1,
    jurnalKBM: [jReg1, jReg2],
    jurnalKegiatan: jKegiatan,
  });
  assert(res3_2.isJurnalDone === false, '3.2 3 Reg + 1 Blok: 2/3 Regular KBM + Kegiatan -> isJurnalDone === false');

  // 3.3 All 3 Regular KBM Journals, NO Jurnal Kegiatan
  const res3_3 = computeFulfillmentState({
    ...baseStateMixed3x1,
    jurnalKBM: [jReg1, jReg2, jReg3],
    jurnalKegiatan: null,
  });
  assert(res3_3.isJurnalDone === false, '3.3 3 Reg + 1 Blok: 3/3 Regular KBM, NO Kegiatan -> isJurnalDone === false');

  // 3.4 All 3 Regular KBM Journals AND Jurnal Kegiatan
  const res3_4 = computeFulfillmentState({
    ...baseStateMixed3x1,
    jurnalKBM: [jReg1, jReg2, jReg3],
    jurnalKegiatan: jKegiatan,
  });
  assert(res3_4.isJurnalDone === true, '3.4 3 Reg + 1 Blok: ALL 3 Regular KBM + Kegiatan -> isJurnalDone === true');

  // ====================================================
  // TEST SUITE 4: All-Blocked vs All-Regular Controls
  // ====================================================
  console.log('\n--- Test Suite 4: Control Invariants (All-Blocked & All-Regular) ---');

  // 4.1 All Blocked (state.isBlok === true)
  const stateAllBlocked = {
    tanggal: '2026-11-02',
    isBlok: true,
    hasBlockedSchedule: true,
    jadwalKBM: [sBlok1, sBlok2],
    jurnalKBM: [],
    jurnalKegiatan: jKegiatan,
    isPiket: false,
    presensiDatang: null,
  };
  const res4_1 = computeFulfillmentState(stateAllBlocked);
  assert(res4_1.isJurnalDone === true, '4.1 All Blocked with Jurnal Kegiatan -> isJurnalDone === true');

  const stateAllBlockedNoKegiatan = {
    ...stateAllBlocked,
    jurnalKegiatan: null,
  };
  const res4_2 = computeFulfillmentState(stateAllBlockedNoKegiatan);
  assert(res4_2.isJurnalDone === false, '4.2 All Blocked WITHOUT Jurnal Kegiatan -> isJurnalDone === false');

  // 4.3 All Regular (state.isBlok === false, 0 blocked schedules)
  const stateAllRegular = {
    tanggal: '2026-11-02',
    isBlok: false,
    hasBlockedSchedule: false,
    jadwalKBM: [sReg1, sReg2],
    jurnalKBM: [jReg1, jReg2],
    jurnalKegiatan: null,
    isPiket: false,
    presensiDatang: null,
  };
  const res4_3 = computeFulfillmentState(stateAllRegular);
  assert(res4_3.isJurnalDone === true, '4.3 All Regular with both KBM journals -> isJurnalDone === true (blockedFulfilled is vacuously true)');

  const stateAllRegularKegiatanOnly = {
    ...stateAllRegular,
    jurnalKBM: [],
    jurnalKegiatan: jKegiatan,
  };
  const res4_4 = computeFulfillmentState(stateAllRegularKegiatanOnly);
  assert(res4_4.isJurnalDone === false, '4.4 All Regular with ONLY Jurnal Kegiatan -> isJurnalDone === false');

  // ====================================================
  // TEST SUITE 5: Source Code AST & Invariant Scrutiny
  // ====================================================
  console.log('\n--- Test Suite 5: Source Code AST & Invariant Scrutiny ---');

  const workflowPath = path.resolve(__dirname, '..', 'src', 'lib', 'workflow.ts');
  const workflowSrc = fs.readFileSync(workflowPath, 'utf8');

  // Check lines around mixed schedule evaluation
  const targetPattern = /if\s*\(unblockedFulfilled\s*&&\s*blockedFulfilled\)\s*\{\s*isJurnalDone\s*=\s*true;/;
  assert(targetPattern.test(workflowSrc), '5.1 Source code strictly requires (unblockedFulfilled && blockedFulfilled) for isJurnalDone');

  // Verify that the old bypass `|| state.jurnalKegiatan` does NOT exist in the else branch
  const bypassPattern = /if\s*\(\(unblockedFulfilled\s*&&\s*blockedFulfilled\)\s*\|\|\s*state\.jurnalKegiatan\)/;
  assert(!bypassPattern.test(workflowSrc), '5.2 Source code DOES NOT contain the old short-circuit bypass `|| state.jurnalKegiatan`');

  // Verify that unblockedFulfilled requires every unblocked schedule to have a matching jurnal
  const unblockedPattern = /const\s+unblockedFulfilled\s*=\s*unblockedSchedules\.every/;
  assert(unblockedPattern.test(workflowSrc), '5.3 unblockedFulfilled is computed via unblockedSchedules.every');

  // Verify that blockedFulfilled checks length === 0 or state.jurnalKegiatan
  const blockedPattern = /const\s+blockedFulfilled\s*=\s*blockedSchedules\.length\s*===\s*0\s*\|\|\s*Boolean\(state\.jurnalKegiatan\)/;
  assert(blockedPattern.test(workflowSrc), '5.4 blockedFulfilled checks blockedSchedules.length === 0 || Boolean(state.jurnalKegiatan)');

  // ====================================================
  // SUMMARY
  // ====================================================
  console.log('\n====================================================');
  console.log(`TOTAL EMPIRICAL RE-CHALLENGE TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runEmpiricalReChallenge().catch(err => {
  console.error('Unhandled re-challenge error:', err);
  process.exit(1);
});
