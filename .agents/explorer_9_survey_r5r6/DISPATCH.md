## 2026-09-17T10:31:33Z
You are explorer_9_survey_r5r6, a Codebase Survey Explorer.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r5r6

MANDATORY: Read ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md, specifically the requirements under header ## 2026-09-17T10:29:39Z.

Your survey scope is R5 & R6:
- R5. Advanced Master Data & Class Progression:
  - Edit interfaces across all Master Data views (Guru, Siswa, Kelas, Mapel, etc.). Inspect current Admin Master Data components (e.g. MasterDataView, data tables, modals/forms) to see which have edit functionality and which lack it.
  - "Naik Kelas" feature: batch/bulk update feature for students to advance class level (individually, by class, or whole cohort). Inspect data_siswa structure and batch update logic.
  - "Rekapan Jurnal Per Kelas": compiled journal overview table showing all teachers who taught in that class (columns: No, Nama Guru, Tanggal & Waktu, Mapel, Jam KBM, Materi, Foto, Keterangan kehadiran guru). Inspect existing journal recap components (RekapJurnalView, etc.).
- R6. UI Polish:
  - Print formatting: Ensure "Kepala [Nama Sekolah]" is formatted as "Capitalize Each Word" across all print outputs (e.g., PrintHeader, PrintSignature, and all printable document templates).
  - Learning device matrix (Perangkat Pembelajaran Guru): grouped by subject (Mata Pelajaran) with clear status indicators for uploaded / not uploaded documents for each subject. Inspect current Perangkat Pembelajaran components.

Explore the codebase, inspect relevant files, components, and utilities.
Produce a comprehensive handoff report with exact file paths, schemas, current code analysis, and proposed implementation plan at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r5r6\handoff.md

When done, send a message to orchestrator_9 with a summary and the path to your handoff.md.
