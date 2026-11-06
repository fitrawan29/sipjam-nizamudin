## 2026-11-06T01:14:06Z
You are a Teamwork Test Writer for Milestone 3 (Dedicated Automated Verification Test Suite & Final Non-Regression Gate).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\test_writer_m3\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read ORIGINAL_REQUEST.md and PROJECT.md before starting work.
You MUST also read the 3 Explorer handoff reports for Milestone 3:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_1\handoff.md (Class allocation test scenarios)
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_2\handoff.md (CSV templates & importer pipeline test scenarios)
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_3\handoff.md (Route aliasing, RBAC & regression harness)

File ownership:
You have exclusive write ownership of:
1. `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts` (new comprehensive test suite)
2. `package.json` (integrating the new test into the test script chain)

Your task:
1. Implement `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`:
   - Incorporate all test suites designed by the Explorers:
     * Suite 1: Navigation, Tab Normalization & Route Aliasing (`view-admin-kelas`, `view-kelas`, `normalizeAdminTab`).
     * Suite 2: RBAC Security Boundaries & Role Denial (Guru, Siswa, Dinas, Kepsek, Piket, Anon blocked).
     * Suite 3: Sub-Menu Kelas Architecture, Directory Aggregation & Demographics.
     * Suite 4: Centralized Student Allocation Workspace (batch move, inbound allocation, cascading rename, zero-student delete guard, multi-tenant scoping).
     * Suite 5: CSV Template Download Integrity across all 7 Entities (Kelas, Siswa, Guru, Mapel, Kalender, Jadwal, Wali Kelas) and invariant verification.
     * Suite 6: CSV Parsing, Normalization, Validation, and Row Error Feedback (`Baris ${i}`).
     * Suite 7: Idempotent Student Import by `(sekolah_id, nisn)` and `data_kelas` schema cache fallback.
2. Integrate `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts` into `package.json` test script chain.
3. Run verification commands:
   - `npx tsx tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts` (all test assertions must pass 100%).
   - `npx tsc --noEmit` (0 errors).
   - `npm test` (full project test suite across all files must pass 100%).
   - `npm run build` (Next.js production build must succeed).
4. Follow the Git workflow rule in GEMINI.md:
   - `git status`
   - `git add .`
   - `git commit -m "test: tambahkan automated verification test suite untuk sub menu kelas dan penyelarasan template master data"`
   - `git push origin main`
5. Write a complete handoff report to:
   `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\test_writer_m3\handoff.md`
   and notify the orchestrator with `send_message`.
