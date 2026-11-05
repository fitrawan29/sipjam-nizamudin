## 2026-11-05T17:12:28Z
You are Worker M5 (worker_o27_m5).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o27_m5\
Your request file is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Your scope document is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md

MANDATORY: You MUST read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Author a comprehensive, rigorous regression test suite in `tests/production_admin_adjustments.test.ts` to empirically validate every acceptance criterion from R1 to R5 in `ORIGINAL_REQUEST.md`:

1. **R1: Dashboard Operasional**:
   - `src/components/HomeViewAdmin.tsx`: Ensure greeting text does not duplicate school name (e.g. `Admin SMP Negeri 1 Contoh` does not become `Admin SMP Negeri 1 Contoh - SMP Negeri 1 Contoh`).
   - `src/components/HomeViewAdmin.tsx`: Ensure "Pusat Informasi" (Informasi & Pengumuman Sekolah) card section is completely absent.

2. **R2: Pusat Verifikasi & Workflow Penyelarasan**:
   - `src/components/AdminVerifView.tsx`: Ensure "Pedoman Kebijakan & SOP SIPJAM" button is removed.
   - `src/components/AdminVerifView.tsx`: Ensure presensi history list is sorted descending by timestamp (newest to oldest).
   - `src/components/AdminVerifView.tsx`: Ensure teachers who have KBM-only attendance rules with 0 scheduled KBM and 0 piket on the target day cleanly display "Bebas Hadir" without delinquency warnings or extra text.
   - `src/components/AdminVerifView.tsx`: Ensure distinct badge pills are rendered for presensi categories (`Hadir di Sekolah`, `Sakit`, `Izin`, `Dinas Luar`).
   - `src/components/AdminVerifView.tsx`: Ensure teachers scheduled for piket who did not submit a report are directly marked "tidak membuat laporan piket" without requiring confirmation modals or action buttons.
   - `src/components/DokumenView.tsx`: Ensure teaching device uploads are restricted to a maximum of 1 per subject per grade level across parallel classes (e.g. `7A` and `7B`, `X Merdeka 1` and `X Merdeka 2`).
   - `src/lib/attendanceAlpa.ts` & `src/components/RekapJurnalView.tsx`: Ensure `autoFillKbmJournalsForLeave` generates complete KBM journal entries for teachers absent with `Sakit`, `Izin`, or `Dinas Luar` when they have scheduled KBM classes on that day.

3. **R3: Laporan Analitik Kerja**:
   - `src/components/AdminRekapView.tsx`: Ensure `canonicalizeTeacherRekapName` deduplicates entries for "Ade Fitrawan Ibrahim" (with and without academic degrees) into a single row without degrees, aggregating attendance, journal, and piket metrics.

4. **R4: Asesmen dan Raport Sekolah**:
   - `src/components/GradebookView.tsx` & `src/components/RaporView.tsx`: Ensure the active semester and school year from admin settings are selected by default on mount for Admin as well as Guru.
   - `src/components/GradebookView.tsx`: Ensure the grade weight modal provides dynamic form inputs for meeting attendance status points (`Hadir: 100`, `Sakit: 75`, `Izin: 75`, `Terlambat: 75`, `Alpa: 0`), persists them to `pengaturan`, and calculates attendance grades via `Math.round((earnedPoints / (validSessions * 100)) * 100)`.

5. **R5: Master Data, Pengaturan Sistem Persisten, & Akun**:
   - `src/components/AdminDataView.tsx`: Ensure CSV templates for `Kalender_Pendidikan` and `Jadwal_Pelajaran` omit `id` and legacy sample strings (`KP-01`, `JP-01`).
   - `src/lib/dataIntegrityGuard.ts`: Ensure UUID sanitization converts missing or non-UUID IDs to genuine UUIDs for UUID-keyed tables to prevent PostgreSQL Error 22P02.
   - `src/components/AdminConfigView.tsx`: Ensure `<form>` has `noValidate` to prevent hidden tab inputs from blocking submission, and synchronizes school identity fields to the `sekolah` table.
   - `src/components/AccountSettingsModal.tsx`: Ensure Multi-Gelar Manager and title addition UI are completely removed, presenting a clean single `Nama Lengkap *` input.

## Execution Requirements
1. Write `tests/production_admin_adjustments.test.ts`. Use standard assertion logic and genuine component/logic inspection.
2. Run the test suite: `npx tsx tests/production_admin_adjustments.test.ts`
3. Run the TypeScript type check: `npx tsc --noEmit`
4. Run all project tests: `npm test`
5. Run the production build: `npm run build`
6. Write a comprehensive `handoff.md` in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o27_m5\handoff.md` with:
   - Observation: Detailed test breakdown and command outputs
   - Logic Chain: Explaining why the test suite proves acceptance criteria R1–R5
   - Caveats: Any observations or constraints
   - Conclusion: Verification summary
   - Verification Method: Exact commands to reproduce
7. Send a message to parent with completion status.
