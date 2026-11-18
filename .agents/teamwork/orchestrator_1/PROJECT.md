# Project: sipjam-app teacher account updates

## Architecture
- Updates to `jurnal KBM` structure, form inputs, list view, print mode, student attendance fields, documentation (camera/upload), and optional keterangan.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Form Input | Update order | M1 | survey |
| 2 | Form Edit | Update order | M1 | survey |
| 3 | Tabel/Daftar | Update order | M1 | survey |
| 4 | Mode Cetak | Update order | M1 | survey |
| 5 | Data Lama | Adjust for new structure | M2 | survey |
| 6 | Keadaan Siswa | Add Jml, Hdr, Skt, Izn, Alp fields | M2 | survey |
| 7 | Dokumentasi | Add live camera option | M3 | survey |
| 8 | Dokumentasi | Add upload option | M3 | survey |
| 9 | Keterangan | Make optional | M1 | survey |
| 10 | Implementation | Apply Ponytail full | M4 | survey |
| 11 | Verification | Build without errors | M4 | survey |
| 12 | Verification | Functional test | M4 | survey |
| 13 | Git Workflow | Stage, Commit, Push to main | M4 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Form & List UI Updates | 1, 2, 3, 4, 9 | none | PLANNED |
| 2 | Data Schema & Attendance | 5, 6 | M1 | PLANNED |
| 3 | Media Upload & Camera | 7, 8 | M2 | PLANNED |
| 4 | Final Integration & Git | 10, 11, 12, 13 | M3 | PLANNED |

## Interface Contracts
### `sipjam-app` ↔ `Database/Supabase`
- Need to update `jurnal KBM` schema to include new attendance fields and documentation options.
