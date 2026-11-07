import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { canTeacherPresensiPulang, GuruDailyState, isJurnalMatchJadwal } from '../src/lib/workflow';

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 TEST SUITE: ALUR GURU PRESENSI PULANG WAJIB SEMUA TUGAS TERISI');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  ❌ [FAIL] ${name}: ${e.message}`);
      failed++;
    }
  }

  // --- SUITE 1: Evaluation of canTeacherPresensiPulang across permutations ---
  console.log('--- Suite 1: Rule Permutations of canTeacherPresensiPulang ---');

  test('1.1: Teacher without presensiDatang CANNOT presensiPulang', () => {
    const state: Partial<GuruDailyState> = {
      presensiDatang: null,
      isIzinSakit: false,
      jadwalKBM: [],
      jurnalKBM: [],
      isPiket: false,
    };
    assert.strictEqual(canTeacherPresensiPulang(state), false);
  });

  test('1.2: Teacher on Izin/Sakit CANNOT presensiPulang', () => {
    const state: Partial<GuruDailyState> = {
      presensiDatang: { id: 'datang-izin', tipe_absen: 'Izin' },
      isIzinSakit: true,
      jadwalKBM: [],
      jurnalKBM: [],
      isPiket: false,
    };
    assert.strictEqual(canTeacherPresensiPulang(state), false);
  });

  test('1.3: Teacher on Libur CANNOT presensiPulang', () => {
    const state: Partial<GuruDailyState> = {
      presensiDatang: { id: 'datang-1' },
      isLibur: true,
      isIzinSakit: false,
    };
    assert.strictEqual(canTeacherPresensiPulang(state), false);
  });

  test('1.4: Teacher with presensiDatang but missing Piket report CANNOT presensiPulang', () => {
    const state: Partial<GuruDailyState> = {
      presensiDatang: { id: 'datang-1' },
      isIzinSakit: false,
      isPiket: true,
      laporanPiket: null, // missing piket report
      jadwalKBM: [],
      jurnalKBM: [],
      isNonTeachingDay: true,
    };
    assert.strictEqual(canTeacherPresensiPulang(state), false);
  });

  test('1.5: Teacher with presensiDatang + Piket report filled unlocks presensiPulang on non-teaching day', () => {
    const state: Partial<GuruDailyState> = {
      presensiDatang: { id: 'datang-1' },
      isIzinSakit: false,
      isPiket: true,
      laporanPiket: { id: 'piket-1', tanggal: '2026-11-07' },
      jadwalKBM: [],
      jurnalKBM: [],
      isNonTeachingDay: true,
    };
    assert.strictEqual(canTeacherPresensiPulang(state), true);
  });

  test('1.6: Regular teacher with KBM schedule but 0 journals CANNOT presensiPulang', () => {
    const state: Partial<GuruDailyState> = {
      presensiDatang: { id: 'datang-1' },
      isIzinSakit: false,
      isPiket: false,
      jadwalKBM: [
        { id: 'sch-1', kelas: 'X-A', mapel: 'Fisika' },
        { id: 'sch-2', kelas: 'X-B', mapel: 'Fisika' },
      ],
      jurnalKBM: [],
      jurnalKegiatan: null,
    };
    assert.strictEqual(canTeacherPresensiPulang(state), false);
  });

  test('1.7: Regular teacher with 2 KBM schedules and only 1 journal CANNOT presensiPulang', () => {
    const state: Partial<GuruDailyState> = {
      presensiDatang: { id: 'datang-1' },
      isIzinSakit: false,
      isPiket: false,
      jadwalKBM: [
        { id: 'sch-1', kelas: 'X-A', mapel: 'Fisika' },
        { id: 'sch-2', kelas: 'X-B', mapel: 'Fisika' },
      ],
      jurnalKBM: [
        { id: 'jur-1', kelas: 'X-A', mapel: 'Fisika' }
      ],
      jurnalKegiatan: null,
    };
    assert.strictEqual(canTeacherPresensiPulang(state), false);
  });

  test('1.8: Regular teacher with 2 KBM schedules and all journals filled CAN presensiPulang', () => {
    const state: Partial<GuruDailyState> = {
      presensiDatang: { id: 'datang-1' },
      isIzinSakit: false,
      isPiket: false,
      jadwalKBM: [
        { id: 'sch-1', kelas: 'X-A', mapel: 'Fisika' },
        { id: 'sch-2', kelas: 'X-B', mapel: 'Fisika' },
      ],
      jurnalKBM: [
        { id: 'jur-1', kelas: 'X-A', mapel: 'Fisika' },
        { id: 'jur-2', kelas: 'X-B', mapel: 'Fisika' }
      ],
      jurnalKegiatan: null,
    };
    assert.strictEqual(canTeacherPresensiPulang(state), true);
  });

  test('1.9: Teacher under Sistem Blok without Jurnal Kegiatan CANNOT presensiPulang', () => {
    const state: Partial<GuruDailyState> = {
      presensiDatang: { id: 'datang-1' },
      isIzinSakit: false,
      isBlok: true,
      isPiket: false,
      jadwalKBM: [],
      jurnalKegiatan: null,
    };
    assert.strictEqual(canTeacherPresensiPulang(state), false);
  });

  test('1.10: Teacher under Sistem Blok with Jurnal Kegiatan filled CAN presensiPulang', () => {
    const state: Partial<GuruDailyState> = {
      presensiDatang: { id: 'datang-1' },
      isIzinSakit: false,
      isBlok: true,
      isPiket: false,
      jadwalKBM: [],
      jurnalKegiatan: { id: 'keg-1', materi: 'Workshop Sistem Blok' },
    };
    assert.strictEqual(canTeacherPresensiPulang(state), true);
  });

  test('1.11: Teacher on Dinas Luar without Jurnal Kegiatan CANNOT presensiPulang', () => {
    const state: Partial<GuruDailyState> = {
      presensiDatang: { id: 'datang-dl', jenis_presensi: 'Dinas Luar' },
      isIzinSakit: false,
      isDinasLuar: true,
      isPiket: false,
      jadwalKBM: [],
      jurnalKegiatan: null,
    };
    assert.strictEqual(canTeacherPresensiPulang(state), false);
  });

  test('1.12: Teacher on Dinas Luar with Jurnal Kegiatan filled CAN presensiPulang', () => {
    const state: Partial<GuruDailyState> = {
      presensiDatang: { id: 'datang-dl', jenis_presensi: 'Dinas Luar' },
      isIzinSakit: false,
      isDinasLuar: true,
      isPiket: false,
      jadwalKBM: [],
      jurnalKegiatan: { id: 'keg-dl', materi: 'Rapat Koordinasi Dinas' },
    };
    assert.strictEqual(canTeacherPresensiPulang(state), true);
  });

  test('1.13: Mixed schedule (1 unblocked, 1 blocked) requires BOTH unblocked KBM and Jurnal Kegiatan', () => {
    const baseMixed: Partial<GuruDailyState> = {
      presensiDatang: { id: 'datang-1' },
      isIzinSakit: false,
      isPiket: false,
      jadwalKBM: [
        { id: 'sch-1', kelas: 'X-A', mapel: 'Fisika', isBlocked: false },
        { id: 'sch-2', kelas: 'XI-A', mapel: 'Fisika', isBlocked: true },
      ],
      jurnalKBM: [],
      jurnalKegiatan: null,
    };
    // 0 filled: false
    assert.strictEqual(canTeacherPresensiPulang(baseMixed), false);

    // Only unblocked KBM filled: false (blocked still needs kegiatan)
    const withKbmOnly = {
      ...baseMixed,
      jurnalKBM: [{ id: 'jur-1', kelas: 'X-A', mapel: 'Fisika' }]
    };
    assert.strictEqual(canTeacherPresensiPulang(withKbmOnly), false);

    // Only kegiatan filled: false (unblocked KBM still needs class journal)
    const withKegiatanOnly = {
      ...baseMixed,
      jurnalKegiatan: { id: 'keg-1', materi: 'Kegiatan Angkatan XI' }
    };
    assert.strictEqual(canTeacherPresensiPulang(withKegiatanOnly), false);

    // Both filled: true!
    const withBoth = {
      ...baseMixed,
      jurnalKBM: [{ id: 'jur-1', kelas: 'X-A', mapel: 'Fisika' }],
      jurnalKegiatan: { id: 'keg-1', materi: 'Kegiatan Angkatan XI' }
    };
    assert.strictEqual(canTeacherPresensiPulang(withBoth), true);
  });

  test('1.14: Exempt teacher voluntarily attending on non-teaching day without piket CAN presensiPulang', () => {
    const state: Partial<GuruDailyState> = {
      presensiDatang: { id: 'datang-vol' },
      isIzinSakit: false,
      isNonTeachingDay: true,
      aturanKehadiran: 'Hari_Mengajar_Saja',
      jadwalKBM: [],
      isPiket: false,
    };
    assert.strictEqual(canTeacherPresensiPulang(state), true);
  });

  test('1.15: Pre-computed canPresensiPulang boolean in state is respected directly', () => {
    const stateTrue: Partial<GuruDailyState> = {
      presensiDatang: { id: 'datang-1' },
      canPresensiPulang: true,
    };
    assert.strictEqual(canTeacherPresensiPulang(stateTrue), true);

    const stateFalse: Partial<GuruDailyState> = {
      presensiDatang: { id: 'datang-1' },
      canPresensiPulang: false,
    };
    assert.strictEqual(canTeacherPresensiPulang(stateFalse), false);
  });

  // --- SUITE 2: Source Code AST Invariants ---
  console.log('\n--- Suite 2: Source Code Invariants in workflow.ts & GuruPresensi.tsx ---');

  const root = path.resolve(__dirname, '..');
  const workflowContent = fs.readFileSync(path.join(root, 'src', 'lib', 'workflow.ts'), 'utf8');
  const guruPresensiContent = fs.readFileSync(path.join(root, 'src', 'components', 'GuruPresensi.tsx'), 'utf8');
  const homeGuruContent = fs.readFileSync(path.join(root, 'src', 'components', 'HomeViewGuru.tsx'), 'utf8');

  test('2.1: workflow.ts sets state.canPresensiPulang = true ONLY when isJurnalDone && isPiketDone', () => {
    assert.ok(
      workflowContent.includes('if (isJurnalDone && isPiketDone)'),
      'workflow.ts must check isJurnalDone && isPiketDone'
    );
    assert.ok(
      workflowContent.includes('state.canPresensiPulang = false;'),
      'workflow.ts must set canPresensiPulang to false when duties incomplete'
    );
    assert.ok(
      workflowContent.includes('state.canPresensiPulang = true;\n      state.lockedReason = null;') ||
      workflowContent.includes('state.canPresensiPulang = true;\r\n      state.lockedReason = null;'),
      'workflow.ts must set canPresensiPulang to true and clear lockedReason when duties are complete'
    );
  });

  test('2.2: workflow.ts does NOT bypass duty checks unconditionally on presensiDatang', () => {
    assert.strictEqual(
      workflowContent.includes('state.canPresensiPulang = true;\n      if (state.lockedReason && state.lockedReason.startsWith') ||
      workflowContent.includes('state.canPresensiPulang = true;\r\n      if (state.lockedReason && state.lockedReason.startsWith'),
      false,
      'Old R2 override that bypassed duties must be completely removed from getGuruDailyState'
    );
  });

  test('2.3: GuruPresensi.tsx validates !dailyState?.canPresensiPulang in handleSubmit', () => {
    assert.ok(
      guruPresensiContent.includes("if (!dailyState?.canPresensiPulang) {") &&
      guruPresensiContent.includes("'Tugas Belum Selesai'"),
      'GuruPresensi.tsx must reject submission if dailyState.canPresensiPulang is false'
    );
  });

  test('2.4: GuruPresensi.tsx disables submit button when isPulangLocked is true', () => {
    assert.ok(
      guruPresensiContent.includes("const isPulangLocked = tipeAbsen === 'Pulang' && dailyState && !dailyState.canPresensiPulang;"),
      'isPulangLocked must depend on !dailyState.canPresensiPulang'
    );
    assert.ok(
      guruPresensiContent.includes("disabled={loading || isPulangLocked || dailyState?.isLibur}"),
      'Submit button must be disabled when isPulangLocked is true'
    );
    assert.ok(
      guruPresensiContent.includes("isPulangLocked ? 'Terkunci' :"),
      'Submit button label must show Terkunci when locked'
    );
  });

  test('2.5: HomeViewGuru.tsx displays locked status and lockedReason until all duties completed', () => {
    assert.ok(
      homeGuruContent.includes("dailyState.canPresensiPulang") &&
      homeGuruContent.includes("Semua tugas selesai, silakan absen pulang") &&
      homeGuruContent.includes("Selesaikan semua tugas terlebih dahulu"),
      'HomeViewGuru must render locked or active based on canPresensiPulang'
    );
    assert.ok(
      homeGuruContent.includes("dailyState.lockedReason && !dailyState.canPresensiPulang"),
      'HomeViewGuru must display dailyState.lockedReason banner when canPresensiPulang is false'
    );
  });

  console.log('\n========================================================================');
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL PRESENSI PULANG WORKFLOW TESTS PASSED PERFECTLY!');
  }
}

runTests();
