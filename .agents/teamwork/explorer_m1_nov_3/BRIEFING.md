# BRIEFING — 2026-11-06T22:52:00Z

## Mission
Produce an exact, actionable technical implementation blueprint for Class X Mata Pelajaran resolution in DokumenView.tsx and fixes for pre-existing TS/build errors.

## 🔒 My Identity
- Archetype: explorer
- Roles: Read-only investigation, code blueprinting, synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_nov_3\
- Original parent: 1ab94413-d6cb-47b9-9e53-4e1689efbdd2
- Milestone: M1 - Verifikasi Perangkat Kelas X Resolution & Compilation Fixes

## 🔒 Key Constraints
- Read-only investigation — do NOT implement / modify source code directly
- Produce exact functions, line numbers, TypeScript types, and code diff blueprint in handoff.md

## Current Parent
- Conversation ID: 1ab94413-d6cb-47b9-9e53-4e1689efbdd2
- Updated: 2026-11-06T22:52:00Z

## Investigation State
- **Explored paths**:
  - `src/components/AdminVerifView.tsx` (TS1184 error due to `export function isRealSubmittedJournal` placed inside component body)
  - `src/components/HomeViewAdmin.tsx` (TS2322 error due to `jurnalColor` type missing `'blue'`)
  - `src/components/DokumenView.tsx` (strict name matching `gm.nama_guru === tName`, missing `jadwal_pelajaran` & `data_mapel` fetching, fallback to `'Mata Pelajaran Umum'`)
  - `csv/SIPJAM NIZAMUDIN - Jadwal_Pelajaran.csv`, `csv/SIPJAM NIZAMUDIN - Data_Guru (1).csv`, `csv/SIPJAM NIZAMUDIN - Data_Mapel (1).csv`
  - `src/lib/workflow.ts` (`connectGuruMapelWithJadwal`)
- **Key findings**:
  - `AdminVerifView.tsx:475`: Moving `export function isRealSubmittedJournal(j: any)` outside the component function completely resolves TS1184 while preserving test compatibility (`tests/admin_jurnal_real_data_verification.test.ts`).
  - `HomeViewAdmin.tsx:494 & 30`: Updating `jurnalColor` and `TeacherStatusRow.pengisianJurnal.color` to include `'blue'` matches `getBadgeClass` and completely resolves TS2322.
  - `DokumenView.tsx`: `jadwal_pelajaran` was only loaded if `guruMapels.length === 0`. In production, `guru_mapel` has rows, so `jadwal_pelajaran` was never loaded. Moreover, strict name matching failed for `Ade` vs `Ade Fitrawan Ibrahim`, resulting in empty subjects falling back to `'Mata Pelajaran Umum'`.
  - Adding parallel loading of `jadwal_pelajaran` and `data_mapel`, tokenized/fuzzy teacher matching (`isTeacherEntityMatch`), subject expansion (`canonicalizeSubjectName`), and `resolveTeacherSubjects` completely resolves Class X subjects (`Matematika • Kelas X Merdeka`, `Informatika • Kelas X Merdeka`) and eliminates `'Mata Pelajaran Umum'`.
- **Unexplored areas**: None for M1 scope.

## Key Decisions Made
- Use a dedicated pure resolver `resolveTeacherSubjects` shared between `teacherSubjectCards` and `myTeacherSubjects` in `DokumenView.tsx`.
- Expand subject abbreviations (`MTK` -> `Matematika`, `SB` -> `Seni Budaya`, etc.) and support both `MTK` and `Matematika` in document matching via `isMapelMatch`.

## Artifact Index
- handoff.md — Complete 5-component technical blueprint report
