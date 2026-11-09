# Sentinel Handoff: Perbaikan Alur dan Fungsionalitas Guru BK ("Tunjuk BK")

## 1. Observation
- **User Request**: Memperbaiki alur dan fungsionalitas Guru BK saat admin menunjuk guru menjadi Guru BK ("Tunjuk BK"), konsistensi role `'bk'` vs `'guru_bk'`, navigasi khusus BK, dan preservasi peran lain dengan pendekatan /ponytail.
- **Workflow & Route**: Routed to SWE Light (`teamwork_swe`). Execution proceeded through initial implementation (`teamwork_implementer_r0`), 3 adversarial review rounds (`teamwork_reviewer_r1`, `r2`, `r3`), remediation iteration (`reviewer_r4`), and independent victory audit (`teamwork_victory_auditor`).
- **Remediation**: Initial victory audit surfaced TS2588 compilation error in `src/lib/teacherUserSync.ts` (const reassignment). Orchestrator remediated line 132 to `let { data: inserted, error: insErr }` in commit `35d89a4`.
- **Audit Verdict**: Generation 1 independent victory auditor confirmed complete compliance: **VICTORY CONFIRMED**.

## 2. Logic Chain
1. `AdminPenggunaView.tsx` was hardened to ensure the "Tunjuk BK" action updates the database (`users` and `data_guru.mata_pelajaran`), updates the local session (`localStorage.getItem('sipjam_user')`), and dispatches a storage event for reactive UI update.
2. `navigation.ts`, `AppScreen.tsx`, and `ClaySidebar.tsx` detect BK users via unified role mapping (`isBk` checks for `'bk'`, `'guru_bk'`, or `data_guru.mata_pelajaran` containing 'Bimbingan Konseling'), displaying the dedicated 5-item menu (Dashboard, Presensi BK, Jurnal BK, Informasi Sekolah, Pengaturan Akun).
3. Jurnal BK routes directly to `view-jurnal-bk` without requiring standard classroom bindings.
4. All non-BK roles (guru reguler, wali kelas, piket, admin) remain unaffected.
5. Verification via `npx tsc --noEmit`, `npm run build` (Next.js Turbopack), and `npm test` passed 100% with exit code 0.

## 3. Caveats
- If the live Supabase database still has a legacy check constraint (`users_role_check`) restricting the `role` column to `'Guru'`, the system uses the validated fallback in `data_guru.mata_pelajaran` (`Bimbingan Konseling (BK)`), which is fully supported across all UI and RBAC layers. Running the migration to drop `users_role_check` remains recommended for pure schema hygiene.

## 4. Conclusion
- All acceptance criteria in `ORIGINAL_REQUEST.md` have been met.
- Independent victory audit verdict: **VICTORY CONFIRMED**.
- All changes have been committed and pushed to `main` per GEMINI.md.

## 5. Verification Method
- `npx tsc --noEmit` -> 0 errors (Exit code 0).
- `npm run build` -> Next.js Turbopack build succeeds (Exit code 0).
- `npx tsx tests/adversarial_bk_challenger.test.ts` -> 481/481 passed.
- `npx tsx tests/bk_role_and_jurnal_rbac_verification.test.ts` -> 106/106 passed.
- `npx tsx tests/challenger_bk_2_stress_test.test.ts` -> 60/60 passed.
- `npx tsx tests/adversarial_bk_reviewer_verification.test.ts` -> 86/86 passed.
- `npm test` -> 80+ test suites passed cleanly.
