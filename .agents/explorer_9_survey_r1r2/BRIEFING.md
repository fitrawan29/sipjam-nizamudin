# BRIEFING — 2026-09-17T10:31:33Z

## Mission
Survey codebase for R1 (Attendance Synchronization & Wali Kelas) and R2 (Teacher Selfie Attendance & Google Drive Integration), producing comprehensive architectural and implementation analysis.

## 🔒 My Identity
- Archetype: explorer_9_survey_r1r2
- Roles: Codebase Survey Explorer, Architecture Analyst
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r1r2
- Original parent: 438061dd-8b26-44e8-acfe-051ab3586841
- Milestone: Survey Phase 9

## 🔒 Key Constraints
- Read-only investigation — do NOT implement or modify application source code
- Files for content delivery, Messages for coordination
- Accurate evidence chain with exact file paths, line numbers, schema definitions, and call chains

## Current Parent
- Conversation ID: 438061dd-8b26-44e8-acfe-051ab3586841
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md`: Milestone 9 requirements for R1 & R2
  - `src/types/database.ts`, `supabase/migrations/`: Existing tables and views
  - `src/components/GuruPresensi.tsx`, `src/lib/workflow.ts`: Presensi Guru flow and daily state
  - `src/components/GuruJurnal.tsx`, `src/components/PiketView.tsx`: Current attendance handling
  - `src/components/RekapSiswaView.tsx`: Student attendance aggregation
  - `src/components/AdminDataView.tsx`, `src/components/AdminConfigView.tsx`: Master data & settings
  - `src/lib/driveUpload.ts`: GAS webhook integration
- **Key findings**:
  - R1: Currently no `wali_kelas` table or column exists; classes are plain text attributes on `data_siswa`, `guru_mapel`, `jadwal_pelajaran`. Attendance is fragmented across `jurnal_pembelajaran.absensi_siswa` (JSON string) and `laporan_piket.rekap_absen_kelas` (JSON string). Creating an authoritative `absensi` table with `log_perubahan` + bidirectional sync triggers/functions ensures absolute synchronization.
  - R2: Currently no camera selfie or canvas watermark exists; only file input. `uploadToDrive` synchronously blocks form submission. When `tipeAbsen === 'Pulang'`, `jenisPresensi` is locked/disabled, preventing Dinas Luar teachers from choosing between "Di Sekolah" or "Dinas Luar".
- **Unexplored areas**: None for R1 & R2 scope.

## Key Decisions Made
- Architecture for R1: Table `wali_kelas` with unique `(sekolah_id, kelas)` + Table `absensi` with unique `(sekolah_id, tanggal, nisn)` + Postgres sync triggers for `jurnal_pembelajaran` & `laporan_piket` + audit log column `log_perubahan`.
- Architecture for R2: Dedicated `CameraSelfieModal`/`CameraSelfieCapture` using `navigator.mediaDevices.getUserMedia` + HTML5 canvas watermark with GPS/date/time badge + async fire-and-forget non-blocking upload to GAS webhook with background status update + Pulang dropdown enabled for Dinas Luar.

## Artifact Index
- DISPATCH.md — Initial dispatch instructions
- progress.md — Liveness & task heartbeat
- BRIEFING.md — Situational awareness
- handoff.md — Comprehensive survey report
