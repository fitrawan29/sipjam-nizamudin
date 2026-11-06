## 2026-11-06T22:30:33Z
You are explorer_survey_nov_2.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_nov_2\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

You MUST read ORIGINAL_REQUEST.md first.

Your mission is to perform a comprehensive codebase survey for Requirements R3 and R5:

### R3. Penyesuaian Asesmen dan Rapor (Buku Nilai Mapel)
- Locate all components, views, queries, and logic handling "buku nilai mapel" (e.g. `src/components/AdminBukuNilaiView.tsx` or similar, teacher gradebook components, etc.).
- Analyze the current selection flow for Guru, Mapel, and Kelas:
  - Current state: How are dropdowns or filters ordered and populated right now?
  - Requirement: The selection flow MUST start with selecting the teacher ("guru pengampu") first.
  - After the teacher is selected, the system must dynamically adjust the available subjects ("mata pelajaran") and classes ("kelas") assigned to that teacher in a hierarchical/cascading manner.
  - Specifically, the class dropdown must follow the selected subject (e.g., if the selected subject is assigned to class XI, only class XI options are shown).
  - Investigate what database tables and columns supply this relation (`jadwal_pelajaran`, `data_guru`, `data_kelas`, `data_mapel`, etc.) and how to implement this cleanly and reactively without race conditions or orphaned state.

### R5. Penyesuaian Pencadangan Data Sistem (System Backup)
- Locate the existing backup/export and restore functionality in system settings ("Pengaturan Sistem", e.g., `AdminSettingsView.tsx`, backup utilities, or API routes).
- Analyze how backup currently functions: What tables/entities are included? What format is generated? What assets/photos are handled?
- Requirement:
  - The backup feature MUST back up ALL application data and related entities across the system.
  - The backup file MUST be packaged as a single ZIP archive.
  - Inside the ZIP, there MUST be clean separation:
    1. A `data/` folder containing all database tables/entities in structured JSON format.
    2. A `foto/` (or assets) folder containing stored photos/images/assets.
  - The backed up data format MUST be compatible and readable for subsequent restoration ("restore") by the system.
  - Investigate existing restore logic (if any) or how the restore flow can consume this structured ZIP package seamlessly.

Investigate thoroughly: inspect files, functions, types, routes, state management, and edge cases.
Document all findings with precise file paths, line references, code snippets, architectural recommendations, and risk analysis in your handoff report:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_nov_2\handoff.md`.
Also maintain your `progress.md` in your working directory.
When finished, send a message to the orchestrator with a summary and link to your handoff.md.
