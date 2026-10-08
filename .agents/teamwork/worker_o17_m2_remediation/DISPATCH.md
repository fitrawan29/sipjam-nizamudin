## 2026-10-08T16:26:25Z
You are Remediation Worker (worker_o17_m2_remediation) for Milestone 2.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o17_m2_remediation

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INPUT FILES:
1. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (under header '## 2026-10-08T11:11:29Z').
2. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md.
3. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_o17_m2_2\handoff.md.

DEFECTS IDENTIFIED BY CHALLENGER 2:
1. Critical Defect (Multi-Day Leave vs Auto-Alpa):
   In `src/lib/attendanceAlpa.ts`, `evaluateAndApplyAutoAlpa(targetDateStr, sekolahId, options)` only queries records where `timestamp` is within `evaluatedDate`. On days 2..N of an approved multi-day leave, `hasRecord` evaluates to `false`, causing the system to insert false `Alpa` records for excused teachers!
   Fix: In `src/lib/attendanceAlpa.ts`, inside `evaluateAndApplyAutoAlpa`, also query approved/pending multi-day leave records where `evaluatedDate` falls within `[tanggal_mulai, tanggal_selesai]` with `status_verifikasi !== 'Ditolak'`. If an active teacher has an active multi-day leave covering `evaluatedDate`, mark them as having an active leave and skip them (`continue`) so they are NOT marked Alpa!
2. High Defect (GPS Print Disconnect):
   All print buttons in the app (`RekapJurnalView.tsx`, `DokumenView.tsx`, `AdminRekapView.tsx`, `PiketView.tsx`, `RekapSiswaView.tsx`, `GradebookView.tsx`, `AdminDataView.tsx`) currently invoke `window.print()` directly instead of `triggerPrintWithGps()`.
   Fix: In these components (especially `RekapJurnalView.tsx`, `DokumenView.tsx`, `AdminRekapView.tsx`, `PiketView.tsx`, `RekapSiswaView.tsx`, `GradebookView.tsx`), import `triggerPrintWithGps` from `src/utils/printWithGps` and invoke `triggerPrintWithGps()` instead of raw `window.print()`.
3. Edge Case (Inverted Date Selection):
   In `src/components/GuruPresensi.tsx`:
   Add `min={tanggalMulai}` to `<input type="date" value={tanggalSelesai} />` and ensure `handleTanggalSelesaiChange` clamps or guards if `newEnd < tanggalMulai`.

TASK STEPS:
1. Apply the fixes cleanly across the codebase.
2. Run full verification commands:
   - npx tsc --noEmit
   - npx tsx tests/m2_teacher_attendance_verification.test.ts
   - npx tsx tests/challenger_o17_m2_empirical_stress.test.ts
   - npm test
   - npx tsx tests/e2e/run_all_e2e.ts
   - npm run build
3. Execute Git Workflow Rule per GEMINI.md:
   - Run `git status`
   - Stage changes (`git add .`)
   - Commit with descriptive message: `fix(m2): exempt multi-day leaves in auto-alpa, wire triggerPrintWithGps to print views, and guard date inputs`
   - Push to active branch (`git push origin main`)
4. Write handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o17_m2_remediation\handoff.md` with details of all changes and command outputs.
5. Send message back to orchestrator.
