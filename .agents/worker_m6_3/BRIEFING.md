# BRIEFING — 2026-09-12T05:08:25Z

## Mission
Overhaul Teacher and Admin Dashboards in HomeView.tsx and Verification in AdminVerifView.tsx (Milestone M6.3: R2 & R3) with authentic data flows, daily status matrix, and reactive filtering.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m6_3\
- Original parent: 391b5d0f-960b-430f-985b-4245841f8551
- Milestone: M6.3 (Teacher & Admin Dashboards & Verification - R2 & R3)

## 🔒 Key Constraints
- Minimal change principle, no fake/hardcoded facade data. Real queries and genuine calculations.
- Follow GEMINI.md git workflow: git status, git add ., git commit -m "...", git push origin main.
- Ownership files: src/components/HomeView.tsx, src/components/AdminVerifView.tsx.
- 0 TypeScript errors (`npx tsc --noEmit`).

## Current Parent
- Conversation ID: 391b5d0f-960b-430f-985b-4245841f8551
- Updated: 2026-09-12T05:08:25Z

## Task Summary
- **What to build**:
  1. Teacher Dashboard in HomeView.tsx:
     - Removed deprecated "Aktivitas Utama" component completely.
     - Built Personal Attendance Stat Cards (Hadir, Terlambat, Izin, Sakit) from `presensi_guru`.
     - Built Dynamic Target Journal Ratio using `dailyState.jadwalKBM` and `isJurnalMatchJadwal`.
     - Built Student Attendance Percentage per Subject Taught from `guru_mapel` & `jurnal_pembelajaran.absensi_siswa`.
     - Built Document Upload Completeness List from `bank_dokumen` for 6 standard Kurikulum Merdeka documents.
  2. Admin Dashboard in HomeView.tsx (!isGuru):
     - Daily Status Matrix for all 13 teachers from `data_guru` across 4 tasks (Presensi Datang, Jurnal, Piket, Presensi Pulang).
     - Summary KPI counter cards at top.
     - In-memory search & filter pills ("Semua", "Tugas Lengkap", "Belum Lengkap").
  3. Admin Verification in AdminVerifView.tsx:
     - Reactive dropdown filters: `taskFilter` ('Semua' | 'Sudah' | 'Belum') and `verifFilter` ('Semua' | 'Menunggu' | 'Disetujui' | 'Ditolak').
     - Display unsubmitted teachers when `taskFilter === 'Belum'`.
     - Zero reload/flicker client-side filtering via `useMemo`.
- **Success criteria**: Genuine implementation, no hardcoded stats, 0 TS errors, 26 new automated tests passing, git committed & pushed, handoff.md written.
- **Interface contracts**: PROJECT.md
- **Code layout**: src/components/

## Key Decisions Made
- Exported `isGuruDiPiket` from `workflow.ts` for unified picket scheduling checks.
- Handled edge cases for teachers with 0 subjects/classes (e.g. "Assyfa Fitra Azzahrah Abukasim") showing clean "Bebas Mengajar Hari Ini".

## Artifact Index
- DISPATCH.md — Assignment instructions
- BRIEFING.md — Persistent situational awareness
- progress.md — Liveness heartbeat and progress log
- handoff.md — 5-component handoff report
- tests/m6_3_dashboards_and_verif.test.ts — Comprehensive test suite for M6.3

## Change Tracker
- **Files modified**:
  - `src/components/HomeView.tsx`: Overhauled teacher and admin dashboards with daily matrix and authentic data.
  - `src/components/AdminVerifView.tsx`: Overhauled with reactive dropdown filters and unsubmitted cross-referencing.
  - `src/lib/workflow.ts`: Exported `isGuruDiPiket` helper.
  - `package.json`: Added M6.2 and M6.3 test suites to npm test script.
  - `PROJECT.md`: Updated M6.3 status to DONE.
  - `tests/m6_3_dashboards_and_verif.test.ts`: Added 26 automated tests.
- **Build status**: PASS (0 TypeScript errors, all tests pass)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (0 errors, 26 tests passed)
- **Lint status**: Clean
- **Tests added/modified**: `tests/m6_3_dashboards_and_verif.test.ts` (26 tests)

## Loaded Skills
- None
