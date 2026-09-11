# Milestone 5 Scope & Implementation Specification

## Architecture & Work Allocation
The work is decomposed into 3 cohesive implementation work packages executed by Workers:

### Work Package 1 (Database & Backend Migrations):
- **Owner**: Worker 1 (`teamwork_preview_worker`)
- **Scope**:
  1. Execute Supabase SQL DDL migration for `jurnal_pembelajaran`:
     Add columns `pertemuan_ke`, `jam_ke`, `tujuan_pembelajaran`, `materi_pembelajaran`, `kehadiran_murid`, `catatan_refleksi`, `foto_kegiatan` as `TEXT NULL`.
  2. Backfill existing records from legacy columns (`materi`, `refleksi`, `link_bukti_foto`).
  3. Verify via `information_schema.columns`.
  4. Ensure `pengaturan` table has `kota_kabupaten` record or is ready for upsert.

### Work Package 2 (Kop Surat & Print Signature - R1, Form Jurnal - R2, Rekap Jurnal - R3):
- **Owner**: Worker 2 (`teamwork_preview_worker`)
- **Files Owned**:
  - `src/components/PrintHeader.tsx`
  - `src/components/AdminConfigView.tsx`
  - `src/app/globals.css`
  - `src/components/GuruJurnal.tsx`
  - `src/components/RekapJurnalView.tsx`
  - `tests/printHeader.test.ts`
- **Scope**:
  1. R1: AdminConfigView `kota_kabupaten` input & save; Logo Yayasan (left) and Logo Dinas (right); Kop address 1-line CSS no-wrap & auto font-scale; PrintSignature align right (`justify-end`, `margin-left: auto`) and date format `[Kota/Kabupaten], [DD Bulan YYYY]`.
  2. R2: Form `GuruJurnal.tsx` with inputs for `pertemuan_ke`, `jam_ke`, `tujuan_pembelajaran`, `kehadiran_murid`, dual-writing new & legacy fields.
  3. R3: `RekapJurnalView.tsx` 8-column semantic `<table>` layout with exact requested headers in order, responsive on screen & print-friendly.

### Work Package 3 (Teacher Daily Schedule - R4 & Bug Hunting / Stabilization - R5):
- **Owner**: Worker 3 (`teamwork_preview_worker`)
- **Files Owned**:
  - `src/lib/workflow.ts`
  - `src/components/HomeView.tsx`
  - `src/app/page.tsx`
  - `src/components/GuruPresensi.tsx`
  - `src/components/HistoryView.tsx`
- **Scope**:
  1. R4: Export `findJadwalForGuru` and `isJurnalMatchJadwal`. Ensure `getGuruDailyState` always populates `jadwalKBM`. Implement the Daily Schedule widget on `HomeView.tsx` for the logged-in teacher.
  2. R5: Bug hunting & stabilization (try-catch `JSON.parse` in `page.tsx`, WITA timezone in `GuruPresensi.tsx`, fix pagination flicker in `HistoryView.tsx`).
  3. Typecheck & verification (`npx tsc --noEmit` must pass with 0 errors).

## Mandatory Git Workflow
Each worker must execute:
1. `git status`
2. `git add .`
3. `git commit -m "..."`
4. `git push origin main` (or active branch)
