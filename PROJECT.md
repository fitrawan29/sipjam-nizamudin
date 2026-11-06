# Project: SIPJAM — Sub Menu Kelas & Penyelarasan Template Master Data

## Architecture
- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Font Awesome 6, SweetAlert2, Supabase PostgreSQL.
- **Navigation & Routing (`src/lib/navigation.ts`, `src/components/AppScreen.tsx`)**:
  - Sub menu `Data_Kelas` (`Kelas`) registered in `AdminDataView.tsx` under master data tabs for role admin.
  - Route aliases `view-admin-kelas` and `view-kelas` registered in `VIEW_ALIASES` mapping to `{ view: 'view-admin-data', tab: 'Data_Kelas' }`.
  - Non-admin roles (Guru, Siswa, Dinas, Kepsek) strictly forbidden from accessing `view-admin-data`.
- **Class & Student Allocation Component (`src/components/AdminKelasView.tsx`)**:
  - Class directory: Displays class cards (e.g. `X Merdeka`, `XI Merdeka`, `XII Merdeka`), enrolled student counts, gender breakdown, and homeroom teacher.
  - Centralized allocation workspace:
    * Interactive student roster per class with multi-selection.
    * Batch student transfer ("Pindahkan Siswa") to target class.
    * Inbound student allocation ("Alokasikan Siswa Masuk") from unassigned students or other classes.
    * Dedicated "Siswa Belum Memiliki Kelas" unallocated section.
    * Class creation and class rename with cascading update to `data_siswa.kelas`.
    * Integration with `NaikKelasModal.tsx` for bulk cohort advancement.
- **CSV Template Harmonization (`src/components/AdminDataView.tsx`)**:
  - Precisely aligned templates for all 7 Master Data entities:
    1. Kelas (`Template_Data_Kelas.csv`): `nama_kelas,tingkat,jurusan`
    2. Siswa (`Template_Data_Siswa.csv`): `nisn,nama_siswa,kelas,gender,status,no_hp_ortu`
    3. Guru (`Template_Data_Guru.csv`): `sekolah_id,nip,nama_guru,mata_pelajaran,no_hp,status,email`
    4. Mapel (`Template_Data_Mapel.csv`): `id,nama_mata_pelajaran,kategori`
    5. Kalender Pendidikan (`Template_Kalender_Pendidikan.csv`): `tanggal,keterangan,tipe`
    6. Jadwal Pelajaran (`Template_Jadwal_Pelajaran.csv`): `hari,nama_guru,mata_pelajaran,kelas`
    7. Wali Kelas (`Template_Wali_Kelas.csv`): `kelas,nama_guru,nip,tahun_ajaran`
  - Invariant preservation: Kalender & Jadwal templates omit `id` to prevent Postgres 22P02 and satisfy existing test invariants; Guru template includes `sekolah_id`.
- **CSV Parsing, Validation & Upsert Engine (`src/lib/dataIntegrityGuard.ts`)**:
  - `normalizeCsvHeaders`: Normalizes headers, adds aliases for `data_kelas` (`nama_kelas`, `tingkat`, `jurusan`, `kelas`, `rombel`).
  - `parseAndValidateMasterCsv`: Supports validation for `data_kelas`, generates UUIDs, preserves non-UUID prevention rules.
  - `importMasterDataFromCsv`: Supports `data_kelas` upsert and graceful fallback; performs idempotent student matching by `(sekolah_id, nisn)` for `data_siswa` to prevent duplicate student rows; provides detailed toast notifications with exact row errors.
- **Verification Harness (`tests/`)**:
  - New dedicated test suite `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`.
  - Full automated suite regression `npm test` (54+ test files).

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | F1: Sub Menu Kelas Navigation & Access | Add `Data_Kelas` tab to `AdminDataView.tsx`, configure aliases in `src/lib/navigation.ts`, enforce admin role restriction | M1 | Survey | DONE |
| 2 | F2: Centralized Student Class Allocation Workspace | Implement `AdminKelasView.tsx` with class directory cards, unallocated student indicators, student roster drawer, batch move/reassign, class creation/rename, and multi-tenant `data_siswa.kelas` updates | M1 | Survey | DONE |
| 3 | F3: Harmonization of 7 Master Data CSV Templates | Provide `Template_Data_Kelas.csv` and ensure all 7 entity templates in `AdminDataView.tsx` precisely match database column structures while preserving test invariants | M2 | Survey | DONE |
| 4 | F4: Robust CSV Parsing, Validation & Feedback | Enhance `src/lib/dataIntegrityGuard.ts` for `data_kelas` header normalization, validation, student upsert idempotency, and informative error/success feedback | M2 | Survey | DONE |
| 5 | F5: Dedicated Automated Verification Test Suite | Implement `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts` testing sub-menu access, route aliasing, class student allocation, and all 7 CSV template imports | M3 | Survey | PLANNED |
| 6 | F6: Full Non-Regression & Code Integrity Gate | Full regression test suite (`npm test`), static typecheck (`npx tsc --noEmit`), and production build (`npm run build`) | M3 | Survey | PLANNED |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Sub Menu Kelas & Pemusatan Penentuan Kelas Siswa | `src/components/AdminKelasView.tsx`, `src/components/AdminDataView.tsx`, `src/lib/navigation.ts` | none | DONE |
| M2 | Penyelarasan Template Master Data & Impor CSV | `src/components/AdminDataView.tsx` (`templates`), `src/lib/dataIntegrityGuard.ts` | M1 | DONE |
| M3 | Automated Verification Tests & Non-Regression Gate | `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`, `npm test`, `npx tsc --noEmit`, `npm run build` | M2 | PLANNED |

## Interface Contracts
### AdminDataView ↔ AdminKelasView
- Props: `{ user: AppUser }`
- Internal queries:
  * Reads students: `supabase.from('data_siswa').select('id, nisn, nama_siswa, kelas, gender, status').eq('sekolah_id', user.sekolah_id)`
  * Reads homeroom teachers: `supabase.from('wali_kelas').select('id, kelas, nama_guru, nip, tahun_ajaran').eq('sekolah_id', user.sekolah_id)`
  * Updates student class: `supabase.from('data_siswa').update({ kelas: targetKelas }).in('id', studentIds).eq('sekolah_id', user.sekolah_id)`
  * Renames class: Updates `data_siswa` (`kelas`), `wali_kelas` (`kelas`), and `jadwal_pelajaran` (`kelas`) where `kelas = oldKelas`.
- Error handling: Graceful fallback if `data_kelas` table does not exist in schema cache; SweetAlert2 confirmations and toasts.

### AdminDataView ↔ dataIntegrityGuard
- Function: `importMasterDataFromCsv(supabase, csvText, tableName, user)`
- `tableName = 'data_kelas'`:
  * Headers accepted: `nama_kelas, tingkat, jurusan` (or `kelas, tingkat, jurusan`)
  * If `public.data_kelas` exists, upserts to `data_kelas`. If PGRST205 or missing table, handles student allocation or updates classes gracefully.
- `tableName = 'data_siswa'`:
  * Resolves existing student IDs by `(sekolah_id, nisn)` so re-import updates class allocations without creating duplicate rows.
