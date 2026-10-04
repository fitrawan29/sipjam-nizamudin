# BRIEFING — 2026-10-04T07:23:00Z

## Mission
Conduct comprehensive technical survey for R1 (Akses Modul Piket Sesuai Jadwal) and R2 (Pembatasan Rekapitulasi Presensi untuk Wali Kelas & Akses Guru Mapel).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1
- Original parent: 29c4dd2f-8b7c-4287-a6f5-79961b0e301b
- Milestone: technical_survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Scope bounded to R1 and R2 survey
- Write handoff.md in working directory
- Communicate completion to parent via send_message

## Current Parent
- Conversation ID: 29c4dd2f-8b7c-4287-a6f5-79961b0e301b
- Updated: 2026-10-04T07:23:00Z

## Investigation State
- **Explored paths**:
  - `src/types/database.ts`: schemas of `penugasan_piket`, `jadwal_piket`, `wali_kelas`, `data_guru`, `data_siswa`, `absensi`, `presensi_siswa`
  - `src/lib/workflow.ts`: `isGuruDiPiket`, `getGuruDailyState`, `dailyState.isPiket`
  - `src/lib/wita.ts`: `getWitaDayName()`, `getWitaDateStr()`
  - `src/lib/warningSystem.ts`: `isTeacherPiketOnDay`, `penugasan_piket` & `jadwal_piket` queries
  - `src/components/HomeView.tsx`: `assignedPiketTeachers`, `inPenugasan`, `inJadwalPiket`, step generator
  - `src/components/AppScreen.tsx`: `isWaliKelas`, `assignedKelas`, `menuItemsGuru`, `menuItemsAdmin`, `handleNavigation`, view renders
  - `src/components/PiketView.tsx`: tabs, `fetchDataPiket`, `syncJadwalPiketForDay`, authorization checks
  - `src/components/RekapSiswaView.tsx`: `waliKelasList`, class dropdowns in tab 'gerbang' & tab 'rekap'
  - `src/components/RekapJurnalView.tsx`: pattern for `assignedKelas` & locked class dropdown
  - `src/components/GuruJurnal.tsx`: live attendance in subject journal session
  - `tests/`: test suite verification (`npm test` passes 100%, `tsc --noEmit` 0 errors)
- **Key findings**:
  - R1: Database has `penugasan_piket` and `jadwal_piket`. Currently `AppScreen.tsx` renders `view-piket` unconditionally in `menuItemsGuru`. `handleNavigation` checks presensi datang but not `state.isPiket`.
  - R2: `AppScreen.tsx` already has `isWaliKelas` and `assignedKelas`, but `view-rekap-siswa` is unconditionally shown in `menuItemsGuru`. In `RekapSiswaView.tsx`, tab 2 allows selecting ANY class from the school (`kelasList`). `GuruJurnal.tsx` operates independently per KBM session and will not be broken.
- **Unexplored areas**: None within the survey scope of R1 and R2.

## Key Decisions Made
- Fully documented all database schemas, query methods, UI navigation paths, and exact code changes needed.

## Artifact Index
- DISPATCH.md — incoming dispatch instructions
- BRIEFING.md — persistent situational awareness
- progress.md — liveness heartbeat
- handoff.md — final handoff report
