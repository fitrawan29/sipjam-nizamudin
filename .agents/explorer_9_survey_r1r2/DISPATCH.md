## 2026-09-17T10:31:33Z
You are explorer_9_survey_r1r2, a Codebase Survey Explorer.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r1r2

MANDATORY: Read ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md, specifically the requirements under header ## 2026-09-17T10:29:39Z.

Your survey scope is R1 & R2:
- R1. Attendance Synchronization & Wali Kelas:
  - How teachers are currently assigned to classes, and how to enable Admin to assign teachers as Wali Kelas (check existing tables like data_guru, kelas, data_kelas, or relational schemas).
  - How Wali Kelas can input Izin/Sakit for students in their class.
  - Absolute attendance synchronization: how attendance is stored across subjects (presensi_siswa, absensi, jurnal, piket) and how to ensure when Wali Kelas, Piket, or Mapel teacher changes a student's status for a date, all subject sessions for that student on that date synchronize.
  - Audit trail / log_perubahan tracking who last changed status (check table columns, user identification, timestamp).
- R2. Teacher Selfie Attendance & Google Drive Integration:
  - Current teacher attendance flow (presensi_guru, Datang, Pulang, Dinas Luar).
  - Implementation plan for camera selfie interface for Datang & Dinas Luar (HTML5 getUserMedia / canvas stream).
  - Canvas-based watermark rendering at bottom-center: date, coordinates (geolocation), and timestamp.
  - Retake vs save options in UI.
  - Asynchronous non-blocking upload to Google Apps Script (GAS) webhook (check existing GAS webhook implementation or URL configuration).
  - Pulang options for Dinas Luar: allow choosing between "Di Sekolah" and "Dinas Luar".

Explore the codebase, inspect relevant files, components, API routes, database types/migrations.
Produce a comprehensive handoff report with exact file paths, schemas, current code analysis, and proposed implementation plan at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r1r2\handoff.md

When done, send a message to orchestrator_9 with a summary and the path to your handoff.md.
