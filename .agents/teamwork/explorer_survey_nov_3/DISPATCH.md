## 2026-11-06T22:30:40Z
You are explorer_survey_nov_3.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_nov_3\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

You MUST read ORIGINAL_REQUEST.md first.

Your mission is to perform a comprehensive codebase survey for Requirements R4 and R6:

### R4. Penyesuaian Master Data (Alur Input, Template, Progress, dan Error Handling)
- Locate the master data components (`AdminDataView.tsx`, `src/lib/dataIntegrityGuard.ts`, etc.).
- Requirement 1: Navigation menu order & input guide.
  - Reorder navigation menu tabs and workflow guide to exactly:
    1. Siswa
    2. Kelas
    3. Mapel
    4. Guru
    5. Jadwal
    6. Wali Kelas
    7. Pengguna
    8. Kalender
    9. Periode Sistem Blok (opsional)
  - Dependency validation during upload: When uploading master data, validate that required dependency data already exists (e.g. if uploading Siswa, does Kelas exist? if uploading Jadwal, do Guru, Mapel, Kelas exist? if uploading Wali Kelas, do Guru and Kelas exist?).
- Requirement 2: Template alignment with database schema.
  - Check download templates for all master data entities against Supabase database schema to ensure exact column alignment and avoid any schema/type errors on upload.
- Requirement 3: Upload progress visualization.
  - Inspect current upload mechanism. Where is progress displayed?
  - Requirement: Provide an interactive/visual progress bar or indicator that users can see during the upload process.
- Requirement 4: Specific and clear error handling.
  - Inspect how errors (from database or application validation) are currently caught and displayed.
  - Requirement: Present clear, specific, and actionable error descriptions for upload failures (identifying specific row numbers, missing dependencies, or DB constraint errors instead of generic messages).

### R6. Preservasi Fitur dan Logika Eksisting (Zero Regression)
- Survey the existing automated test suite:
  - Check `package.json` scripts, test runners (`jest`, `vitest`, etc.), test files in `tests/`.
  - Check how many test suites exist, how long they take, and what coverage they have.
  - Survey build verification (`npm run build`, `npx tsc --noEmit`).
  - Identify critical invariants and regression risks across all roles (Admin, Guru, Wali Kelas, Guru Piket, Kepala Sekolah, Pengawas Dinas, Superadmin).

Investigate thoroughly: inspect files, functions, types, routes, state management, and edge cases.
Document all findings with precise file paths, line references, code snippets, architectural recommendations, and risk analysis in your handoff report:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_nov_3\handoff.md`.
Also maintain your `progress.md` in your working directory.
When finished, send a message to the orchestrator with a summary and link to your handoff.md.
