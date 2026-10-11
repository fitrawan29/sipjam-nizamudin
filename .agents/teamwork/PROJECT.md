# Project: SIPJAM — GradebookView CP → TP → Asesmen → Nilai Akhir Refactor (R1-R5)

## Architecture
- **Stack**: Next.js 15 (App Router, `'use client'`), React 19, TypeScript, Tailwind CSS, SweetAlert2, Supabase (PostgreSQL + RLS).
- **Core Component**: `src/components/GradebookView.tsx` (3,147 lines).
- **Database Schema**:
  - `capaian_pembelajaran`: New table storing Capaian Pembelajaran (`id`, `sekolah_id`, `guru_mapel_id`, `nama_mapel`, `kelas`, `semester`, `tahun_ajaran`, `kode_cp`, `deskripsi`, `urutan`, timestamps).
  - `tujuan_pembelajaran`: Column `cp_id UUID REFERENCES capaian_pembelajaran(id) ON DELETE SET NULL` linking TP to parent CP.
  - `asesmen_kolom`: Column `keterangan TEXT` for free-text assessment notes.
  - `asesmen_kolom`: Partial unique index `uq_asesmen_tp_diagnostik` enforcing max 1 Diagnostik column per TP.
  - `pengaturan`: Key `bobot_nilai_mapel` storing JSON string `{"kehadiran":40,"formatif":30,"sumatif":30}` with unique constraint `(sekolah_id, key)`.
- **UI Hierarchy & Data Flow**:
  - CP is the top parent entity for a subject/class/semester.
  - Teachers must define CP before creating TPs.
  - Each TP has 3 assessment types: Diagnostik (exactly 1, excluded from final grade), Formatif (min 1), Sumatif (min 1).
  - Nilai Akhir Formula: `(bobot_kehadiran * rata_kehadiran) + (bobot_formatif * rata_formatif) + (bobot_sumatif * rata_sumatif)`.
  - Attendance Rate: Computed from subject's KBM sessions in `jurnal_pembelajaran` with fallback to `absensi` table.
  - Admin/Superadmin Bobot Settings: Customizable percentage weights with strict 100% sum validation.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | R5: Database Migration SQL | New table `capaian_pembelajaran`, `cp_id` in `tujuan_pembelajaran`, `keterangan` in `asesmen_kolom`, `uq_asesmen_tp_diagnostik` index, and default seed in `pengaturan` | M1 | Survey 2 | PLANNED |
| 2 | R5: TypeScript Database Types | Update `src/types/database.ts` with `CapaianPembelajaran`, updated `tujuan_pembelajaran`, updated `asesmen_kolom`, `BobotNilaiMapel`, `DEFAULT_BOBOT_NILAI_MAPEL` | M1 | Survey 2 | PLANNED |
| 3 | Syntax Fix in GradebookView | Remove premature closing tag at lines 3056–3058 so `Modal Bulk Fill Grades` compiles cleanly | M2 | Survey 1, 2, 3 | PLANNED |
| 4 | R1: UI CP Management & State | Add/edit/delete Capaian Pembelajaran, modal, form validation, and save with `guru_mapel_id` linking | M2 | Survey 1 | PLANNED |
| 5 | R1: UI CP → TP Hierarchy & Linking | Require CP before TP, add `cp_id` dropdown in TP modal, link TP to selected CP, filter TP pills by active CP | M2 | Survey 1 | PLANNED |
| 6 | R2: Asesmen Diagnostik Rule | Enforce max 1 Diagnostik per TP in UI and DB, auto-heal if missing, block adding 2nd Diagnostik, block deleting Diagnostik | M2 | Survey 1, 3 | PLANNED |
| 7 | R2: Asesmen Formatif & Sumatif Multi-Add | Allow multiple Formatif and multiple Sumatif columns with customizable weights | M2 | Survey 1, 3 | PLANNED |
| 8 | R2: Asesmen Field Keterangan | Input, edit, save, and display free-text `keterangan` for each assessment column | M2 | Survey 1, 2 | PLANNED |
| 9 | R4: Admin Bobot Settings Modal & Validation | Admin/Superadmin form to adjust percentage weights, validate total = 100%, save to `pengaturan` table | M2 | Survey 1, 2 | PLANNED |
| 10 | R4: Bobot Settings Loading & State | Load saved weights on mount per `sekolah_id`, apply dynamically to grade calculations | M2 | Survey 1, 2 | PLANNED |
| 11 | R3: Nilai Akhir Mathematical Formula | Implement `(bobot_kehadiran * rata_kehadiran) + (bobot_formatif * rata_formatif) + (bobot_sumatif * rata_sumatif)` | M2 | Survey 3 | PLANNED |
| 12 | R3: Diagnostik Exclusion from Nilai Akhir | Guarantee Diagnostik is never included in student subject final score | M2 | Survey 3 | PLANNED |
| 13 | R3: Missing Data Handling | If formatif or sumatif is missing/null, return `null` / display `'-'` without runtime errors | M2 | Survey 3 | PLANNED |
| 14 | R3: Attendance Integration per Mapel | Query student attendance percentage from `jurnal_pembelajaran` / `absensi` for the subject/class | M2 | Survey 1, 3 | PLANNED |
| 15 | R3: Rekap Semester & Rapor Preservation | Ensure Tab 2 Rekap Semester, CSV export, and `generateKurikulumMerdekaDeskripsi` work with 0 regressions | M2 | Survey 3 | PLANNED |
| 16 | E2E & Adversarial Testing Track | Complete test suite covering Tiers 1-5 (Feature, Boundary, Combinations, Real-world, Adversarial) | M3 | E2E Track | PLANNED |
| 17 | Final Build & Git Delivery | Verify `npx tsc --noEmit`, `npm test`, `npm run build`, and execute automatic Git workflow (status, add, commit, push) | M3 | GEMINI.md | PLANNED |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Data Layer (Database Migration & TypeScript Types) | `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql` & `src/types/database.ts` | none | PLANNED |
| M2 | UI & Logic Layer (`GradebookView.tsx`) | Syntax fix, CP->TP hierarchy, Asesmen per TP, Admin Bobot modal, Nilai Akhir formula & attendance | M1 | PLANNED |
| M3 | Verification, E2E Testing, Build & Git Delivery | Automated test suite `tests/gradebook_cp_tp_formula_verification.test.ts`, `npm test`, `npm run build`, Git push | M1, M2 | PLANNED |

## Interface Contracts

### 1. Database Schema (`capaian_pembelajaran`)
- Table: `public.capaian_pembelajaran`
  - `id`: UUID PRIMARY KEY DEFAULT gen_random_uuid()
  - `sekolah_id`: UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE
  - `guru_mapel_id`: UUID REFERENCES public.guru_mapel(id) ON DELETE SET NULL
  - `nama_mapel`: TEXT NOT NULL
  - `kelas`: TEXT NOT NULL
  - `semester`: TEXT NOT NULL DEFAULT 'Ganjil'
  - `tahun_ajaran`: TEXT NOT NULL DEFAULT '2024/2025'
  - `kode_cp`: TEXT NOT NULL
  - `deskripsi`: TEXT NOT NULL
  - `urutan`: INTEGER NOT NULL DEFAULT 1
  - `created_at`: TIMESTAMPTZ DEFAULT now()
  - `updated_at`: TIMESTAMPTZ DEFAULT now()

### 2. Table Adjustments
- `public.tujuan_pembelajaran`:
  - `cp_id`: UUID REFERENCES public.capaian_pembelajaran(id) ON DELETE SET NULL
- `public.asesmen_kolom`:
  - `keterangan`: TEXT (nullable)
  - Constraint: `UNIQUE INDEX uq_asesmen_tp_diagnostik ON public.asesmen_kolom(tp_id) WHERE (kategori = 'Diagnostik')`
- `public.pengaturan`:
  - Row key: `'bobot_nilai_mapel'`
  - Row value: JSON string `{"kehadiran": 40, "formatif": 30, "sumatif": 30}`

### 3. Nilai Akhir Formula Contract
- Inputs:
  - `rata_kehadiran`: number (0-100)
  - `rata_formatif`: number (0-100) or null
  - `rata_sumatif`: number (0-100) or null
  - `bobot_kehadiran`, `bobot_formatif`, `bobot_sumatif`: numbers summing to 100
- Formula:
  `if (rata_formatif !== null && rata_sumatif !== null) { return ((rata_kehadiran * bobot_kehadiran / 100) + (rata_formatif * bobot_formatif / 100) + (rata_sumatif * bobot_sumatif / 100)).toFixed(1); } else { return null; }`
- Display:
  `finalScore !== null ? finalScore : '-'`

## Code Layout
- `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql`: Owned by M1.
- `src/types/database.ts`: Owned by M1.
- `src/components/GradebookView.tsx`: Owned by M2.
- `tests/gradebook_cp_tp_formula_verification.test.ts`: Owned by M3.
