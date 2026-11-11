# BRIEFING — 2026-11-11T03:15:00Z

## Mission
Investigate Requirement R1: Admin teacher policy settings, handling of teachers and TU staff without KBM, avoiding "bebas presensi", requiring datang, piket, jurnal kegiatan, and pulang.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, analysis, synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
- State folder: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r1
- Original parent: 59588c2c-30d7-43ba-9674-4233e746c526
- Milestone: Survey & Investigation for Requirement R1

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do not modify source code directly
- Focus on Requirement R1

## Current Parent
- Conversation ID: 59588c2c-30d7-43ba-9674-4233e746c526
- Updated: 2026-11-11T03:15:00Z

## Investigation State
- **Explored paths**:
  - `src/components/AdminConfigView.tsx` (Tab 4: Kehadiran / Kebijakan Guru, lines 690-895, 172-205, 330-550)
  - `src/lib/workflow.ts` (lines 1113-1206, 1502-1560, 1753-1795, 1805-1840)
  - `src/components/HomeViewGuru.tsx` (lines 421-426, 491-492, 502-510, 563, 1056-1070)
  - `src/components/HomeViewTU.tsx` (lines 23-38, 215-322, 481-622)
  - `src/components/AdminPenggunaView.tsx` (lines 40-75, 230-285, 390-415)
  - `src/components/AdminVerifView.tsx` (lines 830-880, 1453-1559)
  - `src/components/HomeViewAdmin.tsx` (lines 390-445, 504)
  - `src/lib/attendanceAlpa.ts` (lines 400-450)
  - `src/components/GuruJurnal.tsx` (lines 550-575, 710-730, 1040-1090)
  - `src/hooks/usePiket.ts` & `src/components/AppScreen.tsx` (lines 689-699, 836, 856)
- **Key findings**:
  1. Admin Settings Tab 4 in `AdminConfigView.tsx` currently only toggles between `Semua_Hari` and `Hari_Mengajar_Saja` and has bulk button `Set Semua Hanya Hari KBM` without distinguishing teachers with KBM vs teachers/TU staff without KBM.
  2. Exemption mechanism (`isTeacherExempt` and `isNonTeachingDay`) in `workflow.ts`, `AdminVerifView.tsx`, and `HomeViewAdmin.tsx` treats anyone with 0 KBM hours on a day under `Hari_Mengajar_Saja` as `isNonTeachingDay` / `isFreeFromPresence` ("Bebas Presensi" / "Bebas Hadir"). Because TU staff and teachers without KBM have 0 KBM hours, they become permanently "Bebas Presensi"!
  3. Teachers without KBM who are set to "Wajib Hadir Setiap Hari" already have the exact required workflow in `HomeViewGuru.tsx` and `GuruJurnal.tsx`: Presensi Datang -> Laporan Piket (if scheduled) -> Jurnal Kegiatan -> Presensi Pulang.
  4. Staf TU in `HomeViewTU.tsx` currently has Datang -> Jurnal Kegiatan -> Pulang, but is missing piket assignment integration (`isPiket` / `laporanPiket`).
  5. Minimal changes required:
     - Clear policy guidance & UI classification in `AdminConfigView.tsx` (Tab 4).
     - Safeguard in `AdminConfigView.tsx` so "Set Semua Hanya Hari KBM" only applies to teachers with active KBM schedules.
     - Enforce `isTeacherExempt = false` for TU staff and teachers without KBM in `workflow.ts`, `AdminVerifView.tsx`, `HomeViewAdmin.tsx`, and `attendanceAlpa.ts`.
     - Add piket detection & workflow step to `HomeViewTU.tsx`.
- **Unexplored areas**: None, all 6 points thoroughly investigated.

## Key Decisions Made
- Fully analyzed all 6 investigation questions with verified code citations and line numbers.

## Artifact Index
- DISPATCH.md — Initial dispatch message
- BRIEFING.md — Persistent context
- progress.md — Liveness heartbeat
- handoff.md — Comprehensive investigation report
