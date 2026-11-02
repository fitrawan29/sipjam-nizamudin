# Project: SIPJAM — Flexible Sistem Blok (Target Scopes & Time Ranges)

## Architecture
- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Font Awesome 6, SweetAlert2, Supabase PostgreSQL.
- **Data Persistence**:
  - `public.sistem_blok` table enhanced with flexible target attributes:
    * `tipe_target`: `'sekolah' | 'angkatan' | 'kelas' | 'guru'` (DEFAULT `'sekolah'`)
    * `target_angkatan`: `TEXT | NULL` (e.g. `'10'`, `'11'`, `'12'` / `'X'`, `'XI'`, `'XII'`)
    * `target_kelas`: `TEXT | NULL` (e.g. `'X Merdeka'`, `'XI RPL 1'`)
    * `target_guru_id`: `UUID | NULL` (REFERENCES `public.data_guru(id)` ON DELETE SET NULL)
    * `target_guru_nama`: `TEXT | NULL`
    * `is_full_day`: `BOOLEAN NOT NULL DEFAULT true`
    * `jam_mulai`: `TEXT | NULL` (e.g. `'07:30'`)
    * `jam_selesai`: `TEXT | NULL` (e.g. `'11:00'`)
  - Backward compatibility: All new columns are nullable or have sensible defaults (`tipe_target = 'sekolah'`, `is_full_day = true`), preserving 100% of existing records and tests.
- **Admin Configuration UI (`src/components/SistemBlokView.tsx`)**:
  - Target selection: Segmented button/tabs (`Keseluruhan Sekolah`, `Per Angkatan`, `Per Kelas`, `Per Guru`).
  - Contextual selectors:
    * Angkatan: Grade levels extracted from school classes (`10 / X`, `11 / XI`, `12 / XII`).
    * Kelas: Dynamic dropdown populated from school classes (`data_siswa`).
    * Guru: Searchable dropdown populated from active teachers (`data_guru`).
  - Time Range Controls: Full-day switch (`is_full_day`), with start time (`jam_mulai`) and end time (`jam_selesai`) inputs enabled when not full-day.
  - Informative Badges: Visual indicators in the rule table showing target scope and time boundaries.
- **Workflow & Granular Schedule Masking (`src/lib/workflow.ts` & `src/components/HomeViewGuru.tsx`)**:
  - `getActiveSistemBloks(dateStr, sekolahId)` returns all active block rules for the specified date.
  - `evaluateScheduleBlock(schedule, teacher, activeBloks)` evaluates whether a specific schedule item is blocked:
    1. Target Matching: Whole school matches all; Angkatan matches grade tokens; Kelas matches class name; Guru matches teacher ID/name.
    2. Time Overlap: Full-day always overlaps; Time-bounded blocks check interval intersection (`schedStart < blokEnd && schedEnd > blokStart`).
  - In `HomeViewGuru.tsx`: Unaffected schedules continue regular KBM; affected schedules are masked with block indicator badge.
  - In `GuruJurnal.tsx`: Affected teachers fill `Jurnal Kegiatan (Sistem Blok)`.
- **Test Suite (`tests/sistem_blok_verification.test.ts`)**:
  - Extended with comprehensive tests for all 4 target levels, time range isolation, schedule masking, and journal fulfillment.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | F1: Database Schema & Type Expansion | Add target columns (`tipe_target`, `target_angkatan`, `target_kelas`, `target_guru_id`, `target_guru_nama`) and time range columns (`is_full_day`, `jam_mulai`, `jam_selesai`) to `public.sistem_blok` and update `src/types/database.ts` | M1 | Survey | DONE |
| 2 | F2: Admin UI Target & Time Range Configuration | Update `src/components/SistemBlokView.tsx` with target type selector, dependent dropdowns (angkatan, kelas, guru), full-day toggle, time pickers, and visual badges | M1 | Survey | DONE |
| 3 | F3: Granular Schedule Masking & Workflow Engine | Implement `getActiveSistemBloks`, `isKelasInAngkatan`, `isTimeRangeOverlap`, and `evaluateScheduleBlock` in `src/lib/workflow.ts` | M2 | Survey | DONE |
| 4 | F4: Teacher Dashboard & Mixed Schedule Masking | Update `src/components/HomeViewGuru.tsx` to selectively mask affected schedules while rendering unaffected schedules as active KBM | M2 | Survey | DONE |
| 5 | F5: Jurnal Kegiatan & Jurnal KBM Integration | Ensure `src/components/GuruJurnal.tsx` supports filling `Jurnal Kegiatan` for affected teachers/classes while keeping regular `Jurnal KBM` for unblocked classes | M2 | Survey | DONE |
| 6 | F6: Automated Verification Suite Expansion | Expand `tests/sistem_blok_verification.test.ts` to test all 4 target types, hour-range filtering, schedule isolation matrix, and journal submission | M3 | Survey | DONE |
| 7 | F7: Full Regression & Code Integrity Verification | Run full test suite (`npm test`), static type check (`npx tsc --noEmit`), and production build verification (`npm run build`) | M4 | Survey | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Schema, Types & Admin Configuration UI | Schema migration script, `src/types/database.ts`, `src/components/SistemBlokView.tsx` | none | DONE |
| M2 | Workflow Engine, Granular Schedule Masking & Journal Workflows | `src/lib/workflow.ts`, `src/components/HomeViewGuru.tsx`, `src/components/GuruJurnal.tsx` | M1 | DONE |
| M3 | Automated Verification Test Suite Expansion | Expand `tests/sistem_blok_verification.test.ts` to cover all target scopes, time boundaries, and isolation scenarios | M2 | DONE |
| M4 | Final Milestone: Full Regression & Integrity Audit | 100% test pass on all test suites, TypeScript compilation, build verification, and forensic audit | M3 | DONE |

## Interface Contracts

### 1. Database Model (`src/types/database.ts`)
```typescript
export type TargetBlokType = 'sekolah' | 'angkatan' | 'kelas' | 'guru';

export interface SistemBlok {
  id: string;
  sekolah_id: string;
  nama_kegiatan: string;
  deskripsi: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  tipe_target: TargetBlokType;
  target_angkatan: string | null;
  target_kelas: string | null;
  target_guru_id: string | null;
  target_guru_nama: string | null;
  is_full_day: boolean;
  jam_mulai: string | null;
  jam_selesai: string | null;
  created_at: string;
  updated_at: string;
}
```

### 2. Workflow Matching Engine (`src/lib/workflow.ts`)
```typescript
export interface ScheduleBlockEvaluation {
  isBlocked: boolean;
  blockRule?: SistemBlok | null;
  reason?: string;
}

export function isKelasInAngkatan(kelas: string | null | undefined, angkatan: string): boolean;
export function isTimeRangeOverlap(schedStart?: string | null, schedEnd?: string | null, blokStart?: string | null, blokEnd?: string | null): boolean;
export function evaluateScheduleBlock(
  schedule: { kelas?: string; nama_guru?: string; user_id?: string; guru_id?: string; jam_mulai?: string; jam_selesai?: string },
  teacher: { id?: string; user_id?: string; nama?: string; nama_guru?: string },
  activeBloks: SistemBlok[]
): ScheduleBlockEvaluation;
export function getActiveSistemBloks(dateStr?: string, sekolahId?: string): Promise<SistemBlok[]>;
```

## Code Layout
- `supabase/migrations/20261102_flexible_sistem_blok.sql`: SQL migration adding target and time range columns to `public.sistem_blok`.
- `src/types/database.ts`: TypeScript definitions for `sistem_blok` Row, Insert, Update, and `SistemBlok`.
- `src/components/SistemBlokView.tsx`: Admin management UI for Sistem Blok with target and time range configuration.
- `src/lib/workflow.ts`: Core workflow logic, `getActiveSistemBloks`, and schedule block evaluation functions.
- `src/components/HomeViewGuru.tsx`: Teacher home dashboard with granular schedule masking.
- `src/components/GuruJurnal.tsx`: Teacher journal entry interface with flexible block journal support.
- `tests/sistem_blok_verification.test.ts`: Expanded verification test suite.
