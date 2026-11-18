# Project: Sipjam-app Attendance and Journal System Enhancements
# Scope: All Requirements (R1-R6)

## Architecture
- Backend: Supabase APIs/Actions in `src\app\api\`
- Frontend: React components in `src\components\`
- Business Logic: Helper functions in `src\lib\`

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Attendance Logic (R1) | Add sakit, izin, dinas luar; Automate alpa/pulang cepat | M1 | Request |
| 2 | Photo Handling (R2) | Fix pending uploads, previews, and broken links | M2 | Request |
| 3 | Attendance UI Consolidation (R3)| Single card for presensi datang/pulang | M3 | Request |
| 4 | Perangkat Pembelajaran Simplification (R4) | Deduplication & Labeling | M4 | Request |
| 5 | UI and Jurnal Cleanup (R5) | Remove unnecessary menu items and text | M5 | Request |
| 6 | Daftar Nilai Fixes (R6) | Enable editing presensi sesi w/o journal | M6 | Request |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Attendance Logic | R1 | None | PLANNED |
| 2 | Photo Handling | R2 | None | PLANNED |
| 3 | Attendance UI | R3 | M1 | PLANNED |
| 4 | Perangkat Pembelajaran | R4 | None | PLANNED |
| 5 | UI/UX Cleanup | R5 | None | PLANNED |
| 6 | Daftar Nilai | R6 | None | PLANNED |

## Interface Contracts
- Attendance API: `src\app\api\attendance\route.ts` - Ensure status handling
- Upload API: `src\lib\presensiUploadPersistence.ts` - Ensure consistency
