# BRIEFING — 2026-11-11T03:47:00Z

## Mission
Implement Milestone 1 (Requirement R1): Kebijakan Presensi Guru & TU Tanpa KBM across AdminConfigView, workflow.ts, HomeViewTU, HomeViewGuru, AdminVerifView, HomeViewAdmin, and attendanceAlpa.ts.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\
- Original parent: 77685953-a979-46b9-9e32-e6b24ab55eb5
- Milestone: Milestone 1 (Sub Menu Kelas & Pemusatan Penentuan Kelas Siswa)
- Archetype: worker
- Roles: implementer, qa
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
- State folder: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1\
- Original parent: 59588c2c-30d7-43ba-9674-4233e746c526
- Milestone: Milestone 1 (Kebijakan Presensi Guru & Staf TU Tanpa Jam KBM)

## 🔒 Key Constraints
- Strict RBAC using isMasterDataModificationAllowed(user?.role)
- Cascading renames across data_siswa, wali_kelas, jadwal_pelajaran
- Defensive schema-cache error handling using isSchemaCacheOrMissingTableError
- Only delete class if count is 0
- Verify with npx tsc --noEmit and npm test
- Git commit and push to main following GEMINI.md
- Exclusive write ownership: AdminConfigView.tsx, workflow.ts, HomeViewTU.tsx, HomeViewGuru.tsx, AdminVerifView.tsx, HomeViewAdmin.tsx, attendanceAlpa.ts
- DO NOT modify RekapJurnalView.tsx or GuruJurnal.tsx (Milestone 2 ownership)
- Staf TU & Guru tanpa jam KBM must NEVER be evaluated as isTeacherExempt or Bebas Presensi / Bebas Hadir on active school days
- AdminConfigView must provide clear policy guidelines, display category badges, restrict mass action to only teachers with actual KBM hours, and enforce non-exempt on save
- HomeViewTU must check piket duty and enforce Laporan Piket before Presensi Pulang
- HomeViewGuru must not show Bebas Presensi banner for teachers without KBM on active school days; show active workflow steps

## Current Parent
- Conversation ID: 59588c2c-30d7-43ba-9674-4233e746c526
- Updated: 2026-11-11T03:47:00Z

## Task Summary
- **What to build**: Policy guidelines, teacher categorization, and safe mass action in AdminConfigView; protect TU and non-KBM teachers from exemption in workflow.ts, AdminVerifView.tsx, HomeViewAdmin.tsx, attendanceAlpa.ts; add piket check to HomeViewTU.tsx; remove false Bebas Presensi banner for non-KBM teachers in HomeViewGuru.tsx.
- **Success criteria**: Staf TU and non-KBM teachers are never exempt or free from attendance; their 4-step workflow (Datang -> Piket if assigned -> Jurnal Kegiatan -> Pulang) works cleanly; verification commands pass.
- **Interface contracts**: PROJECT.md, explorer_survey_r1, explorer_survey_r3
- **Code layout**: src/components/AdminConfigView.tsx, src/lib/workflow.ts, src/components/HomeViewTU.tsx, src/components/HomeViewGuru.tsx, src/components/AdminVerifView.tsx, src/components/HomeViewAdmin.tsx, src/lib/attendanceAlpa.ts

## Key Decisions Made
- `AdminConfigView.tsx`: Loaded `jadwal_pelajaran` alongside `data_guru` to identify KBM hour assignments per teacher. Added responsive policy guideline cards explaining `Hari_Mengajar_Saja` vs `Semua_Hari`. Displayed badges for Staf Tata Usaha, Guru Tanpa Jam KBM, and Guru KBM. Restricted "Set Semua Hanya Hari KBM" to only non-TU teachers with KBM schedules > 0. Enforced non-exempt persistence on save (`wajib_hadir_hanya_mengajar = false`). Disabled manual toggling to exempt for TU and non-KBM teachers.
- `src/lib/workflow.ts`: Identified TU staff and teachers with 0 KBM hours (`isNonKbmOrTu = true`) and protected them so `isTeacherExempt = false` and `isNonTeachingDay = false` on school days. Enforced `state.jurnalKegiatan` requirement before unlocking `canPresensiPulang`.
- `AdminVerifView.tsx` & `HomeViewAdmin.tsx`: Protected TU staff and non-KBM teachers from `isTeacherExempt` and `isFreeFromPresence`, preventing them from falsely showing as "Bebas Hadir".
- `attendanceAlpa.ts`: Protected TU staff and non-KBM teachers from exemption bypass during daily Alpa checks.
- `HomeViewTU.tsx`: Integrated piket duty checks (`penugasan_piket` & `jadwal_piket`), conditional "Laporan Piket" workflow step, and required both Laporan Piket and Jurnal Kegiatan for `canPresensiPulang`.
- `HomeViewGuru.tsx`: Conditioned "Bebas Presensi" hero banner to only appear when `dailyState?.aturanKehadiran === 'Hari_Mengajar_Saja'`, and added interactive Jurnal Kegiatan card when 0 KBM scheduled today.

## Artifact Index
- DISPATCH.md — Assignment instructions
- progress.md — Liveness & step updates
- BRIEFING.md — Working memory
- handoff.md — Final handoff report

## Change Tracker
- **Files modified**:
  * `src/components/AdminConfigView.tsx`: Policy guidelines, badges, safe mass action, non-exempt persistence
  * `src/lib/workflow.ts`: TU & non-KBM teacher protection, mandatory Jurnal Kegiatan for departure
  * `src/components/AdminVerifView.tsx`: Eliminates false Bebas Hadir for TU & non-KBM teachers
  * `src/components/HomeViewAdmin.tsx`: Eliminates false Bebas Hadir in admin monitor table
  * `src/lib/attendanceAlpa.ts`: Protects TU & non-KBM teachers from exemption bypass
  * `src/components/HomeViewTU.tsx`: Added piket detection, Laporan Piket step, and checkout unlocking
  * `src/components/HomeViewGuru.tsx`: Eliminates false Bebas Presensi banner for daily attendees
- **Build status**: PASS (`npx tsc --noEmit` clean, 0 errors)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (All 124 unit and regression tests pass across 4 suites)
- **Lint status**: Clean
- **Tests added/modified**: Verified against all relevant test suites

## Loaded Skills
None
