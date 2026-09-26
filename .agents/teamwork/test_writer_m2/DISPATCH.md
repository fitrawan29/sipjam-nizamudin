## 2026-09-26T10:01:21Z
You are Test Writer M2 (E2E Testing Specialist).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\test_writer_m2
Workspace root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY FIRST STEP: Read ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md and PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_4\PROJECT.md before starting work.
Also read the explorer reports at:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3\handoff.md

Objective:
Write a comprehensive, automated, end-to-end programmatic verification test suite at:
`tests/data_access_roles_verification.test.ts`
(Must be directly runnable with `npx tsx tests/data_access_roles_verification.test.ts`).

Requirements to Verify:
1. Admin Role Data Access Verification:
   - Authenticate as Admin (e.g. username `admin`, password `SipjamAdmin2026!` via `verify_login` RPC).
   - Verify that data retrieval succeeds across school entities:
     - `users` (returns staff users for the school)
     - `data_guru` (returns teachers)
     - `data_siswa` (returns student records, e.g. 14 students in test school)
     - `presensi_guru`, `jurnal_pembelajaran`, `pengaturan` (load cleanly without RLS or PostgREST errors).
2. Teacher (Guru) Role Data Access Verification:
   - Authenticate as Teacher (e.g. `Riski` / `Adnan` / `Fitra`).
   - Also test with a teacher who has academic titles/commas (e.g. `"Tika Mamonto, S.Pd."` or `"Ade Fitrawan Ibrahim, M.Pd., Gr."`).
   - Verify teacher dashboard data retrieval:
     - Teacher schedule (`jadwal_pelajaran`) returns all expected classes (no truncation due to partial UUID matches).
     - Teacher daily state / gatekeeper evaluation (`getGuruDailyState`) runs without PostgREST column errors (no `column data_guru.nama does not exist`).
     - Teaching journal and attendance queries succeed without `PGRST100: failed to parse logic tree`.
3. Siswa (Student) Data Access Integrity & Isolation:
   - Verify that student data in `data_siswa` is accessible to authorized staff (Admin & Teacher/Wali Kelas).
   - Verify that unauthenticated requests or cross-school requests cannot read student data (RLS isolation enforced).
4. Legacy / Stale Session Resilience:
   - Verify that when a client simulates a legacy session lacking `session_token`, the app / helper logic handles it gracefully (clearing invalid session or rejecting unauthenticated tenant access).

Test Suite Rules:
- Test runner MUST run standalone and output clear PASS/FAIL statuses and diagnostics.
- Write tests to `tests/data_access_roles_verification.test.ts`.
- Run the test suite using `npx tsx tests/data_access_roles_verification.test.ts`.
- Write your report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\test_writer_m2\handoff.md`.
