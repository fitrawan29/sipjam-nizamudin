# BRIEFING — 2026-09-17T15:28:00Z

## Mission
Deliver Milestone 6 (Advanced Master Data & UI Polish): Master Data Edit modals, Naik Kelas batch progression, Rekapan Jurnal Per Kelas (8 columns), Kepala Sekolah capitalization utility, and Perangkat Pembelajaran matrix grouped by subject in DokumenView.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m6_master_ui_gen2
- Original parent: 438061dd-8b26-44e8-acfe-051ab3586841
- Milestone: Milestone 6 - Advanced Master Data & UI Polish

## 🔒 Key Constraints
- Exclusively own:
  - src/components/AdminDataView.tsx
  - src/components/NaikKelasModal.tsx
  - src/components/RekapJurnalView.tsx
  - src/utils/textUtils.ts
  - src/components/PrintHeader.tsx
  - src/components/DokumenView.tsx
  - tests/m6_master_data_polish.test.ts
- Genuine implementations only (no hardcoding, dummy logic, facade implementations)
- Must pass `npx tsc --noEmit` and all automated tests
- Automatically check git status, stage, commit, and push per GEMINI.md
- Report to parent via send_message and handoff.md

## Current Parent
- Conversation ID: 438061dd-8b26-44e8-acfe-051ab3586841
- Updated: 2026-09-17T15:28:00Z

## Task Summary
- **What to build**:
  1. Master Data Edit interface in AdminDataView.tsx across 5 tabs (Data_Siswa, Data_Guru, Data_Mapel, Kalender_Pendidikan, Jadwal_Pelajaran) with real Supabase updates.
  2. NaikKelasModal.tsx with 3 modes (Perorangan, Per Kelas, Satu Angkatan) and integration in AdminDataView.
  3. RekapJurnalView.tsx "Rekapan Jurnal Per Kelas" mode with 8-column layout, print formatting, and CSV export.
  4. src/utils/textUtils.ts formatKepalaSekolahTitle and PrintHeader.tsx integration.
  5. DokumenView.tsx Perangkat Pembelajaran matrix grouped by subject with 6-document status matrix and mapel/kelas selectors.
  6. tests/m6_master_data_polish.test.ts verifying all features.
- **Success criteria**: All 6 items functional, tsc passes (0 errors), tests pass (31/31 passed), git committed and pushed.
- **Interface contracts**: PROJECT.md, Supabase schema
- **Code layout**: src/components, src/utils, tests/

## Change Tracker
- **Files modified**:
  - `src/components/AdminDataView.tsx`: Added Edit modals across all tabs and multi-select Naik Kelas integration
  - `src/components/NaikKelasModal.tsx`: New component with 3 operational modes for batch class progression
  - `src/components/RekapJurnalView.tsx`: Added Jurnal Guru Pribadi vs Rekapan Jurnal Per Kelas toggle, 8-column table layout, print and CSV export
  - `src/utils/textUtils.ts`: Created formatKepalaSekolahTitle and capitalizeEachWord with Indonesian educational acronym preservation
  - `src/components/PrintHeader.tsx`: Integrated formatKepalaSekolahTitle into PrintSignature
  - `src/components/DokumenView.tsx`: Grouped teacher documents by subject with 6-document status matrix and added mapel & kelas selectors in upload form
  - `tests/m6_master_data_polish.test.ts`: Automated test suite covering all 5 features (31 assertions, 100% pass)
- **Build status**: PASS (npx tsc --noEmit: 0 errors)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (31 passed, 0 failed)
- **Lint status**: Clean
- **Tests added/modified**: tests/m6_master_data_polish.test.ts (31 behavioral unit & integration assertions)

## Loaded Skills
- None

## Key Decisions Made
- Word-boundary regex matching implemented in computeCohortAdvancement to prevent chained replacement errors for Grade 11 -> Grade 12.
- Extended database schema with optional columns (jam_mulai, jam_selesai, tanggal_mulai, tanggal_selesai, kode_mapel, kelompok, mapel, nama_mapel) ensuring backward and forward compatibility.
- Added autocomplete datalist selectors in DokumenView for Mata Pelajaran and Kelas.

## Artifact Index
- .agents/worker_m6_master_ui_gen2/DISPATCH.md
- .agents/worker_m6_master_ui_gen2/BRIEFING.md
- .agents/worker_m6_master_ui_gen2/progress.md
- .agents/worker_m6_master_ui_gen2/handoff.md
- tests/m6_master_data_polish.test.ts
