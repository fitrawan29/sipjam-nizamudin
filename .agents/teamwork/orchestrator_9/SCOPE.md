# Scope: Jurnal KBM Form and Rekap Cetak Enhancements (R1, R2, R3)

## Architecture
- Framework: Next.js (App Router), React, TypeScript, Supabase.
- Target Files:
  - `src/components/GuruJurnal.tsx`
  - `src/components/RekapJurnalView.tsx`
- Minimalist approach (Ponytail): fewest lines and files changed, no over-engineering.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1: Remove Pertemuan & Jam Inputs | Remove UI input & submit validation for Pertemuan ke & Jam ke in GuruJurnal.tsx; default safely | Iteration 1 | Dispatch |
| 2 | R1: Remove Pertemuan & Jam from Print Table | Remove pertemuan and jam headers and cells in RekapJurnalView.tsx (mode pribadi/guru) | Iteration 1 | Dispatch |
| 3 | R2: Format Kehadiran Murid in GuruJurnal | Update calculateKehadiranSummary to: `Total murid: {total}, Hadir: {hadir}, Izin: {izin}, Sakit: {sakit}, Alpa: {alpa}` | Iteration 1 | Dispatch |
| 4 | R2: Format Kehadiran Murid in RekapJurnalView | Update formatAbsensi and j.kehadiran_murid display to match exact format in print table | Iteration 1 | Dispatch |
| 5 | R3: Kelas & Mata Pelajaran in GuruJurnal | Ensure Kelas and Mapel inputs/dropdowns are visible/not hidden; keep auto-fill logic | Iteration 1 | Dispatch |
| 6 | R3: Kelas & Mata Pelajaran Columns in RekapJurnalView | Ensure separate column headers for Kelas and Mata Pelajaran in print table | Iteration 1 | Dispatch |
| 7 | Verification & Build | Passes npx tsc --noEmit and npm run build | Iteration 1 | Dispatch |
| 8 | Git Workflow | Status, staging, descriptive commit, push to origin/main | Iteration 1 | GEMINI.md |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Iteration 1: Form & Rekap Table Updates | GuruJurnal.tsx and RekapJurnalView.tsx R1, R2, R3 updates + verification + git push | none | IN_PROGRESS |

## Interface Contracts
- `calculateKehadiranSummary`: returns string matching `Total murid: {total}, Hadir: {hadir}, Izin: {izin}, Sakit: {sakit}, Alpa: {alpa}`
- `formatAbsensi`: returns string matching `Total murid: {total}, Hadir: {hadir}, Izin: {izin}, Sakit: {sakit}, Alpa: {alpa}`
- Print table columns for pribadi mode in `RekapJurnalView.tsx`: must include separate "Kelas" and "Mata Pelajaran" headers, must NOT include "Pertemuan" or "Jam".
- Form submit in `GuruJurnal.tsx`: must not block submission if pertemuan/jam are empty; default safely.

## Code Layout
- `src/components/GuruJurnal.tsx`: Teacher journal creation form
- `src/components/RekapJurnalView.tsx`: Journal recap and print tables
