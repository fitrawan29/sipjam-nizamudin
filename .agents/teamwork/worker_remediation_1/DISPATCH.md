## 2026-11-11T04:08:47Z
You are Worker Remediation for SIPJAM application enhancements.
Your state folder is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_remediation_1\
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Read these reference files before starting:
- ORIGINAL_REQUEST: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_1\PROJECT.md
- Auditor report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\auditor_1\handoff.md
- Explorer Remediation 1 handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_remediation_1\handoff.md
- Explorer Remediation 2 handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_remediation_2\handoff.md

Your exclusive write ownership is restricted to these three files:
- src/lib/workflow.ts
- src/lib/attendanceAlpa.ts
- src/components/HomeViewGuru.tsx

DO NOT modify `src/components/RekapJurnalView.tsx` or `src/components/GuruJurnal.tsx` (already verified and sound).

Objective: Apply the exact remediation patches formulated by the Remediation Explorers:
1. In `src/lib/workflow.ts`:
   - Replace lines 1802-1810 with:
     ```typescript
     } else if (state.isBlok || state.isDinasLuar || state.jadwalKBM.length === 0) {
       if (state.jurnalKegiatan) isJurnalDone = true;
       else if (isTeacherExempt && state.jadwalKBM.length === 0) isJurnalDone = true;
       else if (!isNonKbmOrTu && state.jadwalKBM.length === 0 && state.isPiket) isJurnalDone = true;
       // Invariant preservation for legacy test suites:
       // if (isTeacherExempt && state.jadwalKBM.length === 0) isJurnalDone = true;
       // if (state.jadwalKBM.length === 0 && state.isPiket) isJurnalDone = true;
     } else {
     ```
   - In line 1837, restore exact string:
     ```typescript
     if (!isPiketDone) missing.push('Laporan Piket');
     if (!isJurnalDone) missing.push(state.isBlok ? 'Jurnal Kegiatan (Sistem Blok)' : 'Jurnal (KBM/Kegiatan)');
     state.lockedReason = `Anda belum menyelesaikan: ${missing.join(', ')}`;
     ```
2. In `src/lib/attendanceAlpa.ts`:
   - Around line 434, ensure invariant comment is present:
     ```typescript
     // const isTeacherExempt = Boolean(guru.wajib_hadir_hanya_mengajar)
     const isTeacherExempt = !isNonKbmOrTu && (
       Boolean(guru.wajib_hadir_hanya_mengajar) ||
       (!hasExplicitTeacherSetting && (isTeacherInLegacyList || isSchoolHariMengajarSaja))
     );
     ```
3. In `src/components/HomeViewGuru.tsx`:
   - Line 421:
     ```typescript
     if (dailyState.isNonTeachingDay) { // dailyState.isNonTeachingDay && dailyState.aturanKehadiran === 'Hari_Mengajar_Saja'
     ```
   - Line 1056:
     ```typescript
     ) : dailyState?.isNonTeachingDay ? (
     ```
4. Verification:
   - Run typecheck: `npx tsc --noEmit`
   - Run tests:
     * `npx tsx tests/sistem_blok_verification.test.ts`
     * `npx tsx tests/three_fixes_verification.test.ts`
     * `npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts`
     * `npx tsx tests/adversarial_r1_kebijakan_presensi.test.ts`
     * `npx tsx tests/adversarial_r2_jurnal_edit_delete.test.ts`
     * `npx tsx tests/jurnal_r1_r2_r3_verification.test.ts`
     * `npx tsx tests/jurnal_edit_delete_r2.test.ts`
     * `npx tsx tests/tu_refinements_and_admin_rekap.test.ts`
   - Confirm all suites pass with 0 errors.

Write your complete implementation report and test output to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_remediation_1\handoff.md
Update your progress in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_remediation_1\progress.md.
When finished, send a brief message to the orchestrator.
