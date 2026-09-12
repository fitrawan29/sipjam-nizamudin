# Scope: Milestone 7 Multi-Tenant Database Architecture & RLS, Superadmin & Admin Hierarchy, and Ascending Date Sorting

## Architecture
- **Multi-Tenant Model**: Pooled database schema with row-level discriminator (`sekolah_id UUID REFERENCES public.sekolah(id)`).
- **Security & Authorization**: Native Supabase Row Level Security (RLS) policies on all tables utilizing security helper functions (`get_auth_user_sekolah_id()`, `get_auth_user_role()`, `is_superadmin()`).
- **Role Hierarchy**:
  - `Superadmin`: Platform administrator (`sekolah_id = NULL`), can register schools and create school admin accounts.
  - `Admin`: School administrator (`sekolah_id = <school_uuid>`), manages school master data, settings, and teachers for their assigned school.
  - `Guru`: School teacher (`sekolah_id = <school_uuid>`), inputs attendance, journals, and piket for their assigned school.
- **Data Flow & Presentation**:
  - Client state in `localStorage` binds `user.sekolah_id`.
  - UI queries defensively pass `.eq('sekolah_id', user.sekolah_id)`.
  - Recap views (`RekapJurnalView`, `RekapSiswaView`, `AdminRekapView`, `PiketView`) strictly sort chronologically in ascending date order (`.order('tanggal', { ascending: true })`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | `sekolah` Entity | Entity for schools storing institutional identity, NPSN, address, headmaster, logos, and status | M7.1 | survey |
| 2 | Schema Alterations & Backfill | Add `sekolah_id` to all 17 tables, backfill SMA Nizamudin records, enforce foreign keys and NOT NULL | M7.1 | survey |
| 3 | Composite Unique Constraints | Update `pengaturan`, `jadwal_piket`, `guru_mapel` constraints to be multi-tenant composite | M7.1 | survey |
| 4 | Native Supabase RLS Policies | Full database-level RLS policies on all 17 tables enforcing strict tenant isolation | M7.1 | survey |
| 5 | Ascending Indexes | Composite B-Tree indexes on `(sekolah_id, tanggal ASC)` and `(sekolah_id, timestamp ASC)` | M7.1 | survey |
| 6 | Superadmin Dashboard (`SuperadminView`) | Dedicated interface for Superadmin: Platform Overview, School Management (CRUD), Admin Provisioning | M7.2 | survey |
| 7 | Superadmin Route (`/superadmin`) | Deep-link page for direct Superadmin access with authentication guards | M7.2 | survey |
| 8 | School Admin Login & Context Binding | Session binding of `sekolah_id`, dynamic school branding in headers and login | M7.2 | survey |
| 9 | UI Navigation Isolation | Role-based menu isolation: Superadmin sees platform tools, Admin sees school tools, Guru sees teacher tools | M7.2 | survey |
| 10 | Tenant-Scoped Master Views | Scoping `AdminDataView`, `AdminConfigView`, `AdminBackupView` by `sekolah_id` | M7.3 | survey |
| 11 | Multi-Tenant `PrintHeader` | Dynamic letterhead (KOP), logos, and signature blocks resolved per school | M7.3 | survey |
| 12 | Rekap Jurnal Ascending Sorting | Fix `RekapJurnalView.tsx` from descending to ascending order on `tanggal` and `jam_ke` | M7.4 | survey |
| 13 | Rekap Siswa Ascending Sorting | Add ascending sorting on `jurnal_pembelajaran` in `RekapSiswaView.tsx` | M7.4 | survey |
| 14 | Admin Rekap & Piket Ascending Sorting | Add ascending sorting on `AdminRekapView.tsx` and `PiketView.tsx` | M7.4 | survey |
| 15 | Multi-Tenant & Sorting E2E Test Suite | Comprehensive automated tests for RLS isolation, Superadmin workflow, and ascending sorting | M7.5 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M7.1 | Multi-Tenant Database & RLS Migration | SQL migration, table alterations, backfill, unique constraints, RLS policies, TypeScript types | none | DONE |
| M7.2 | Superadmin & Admin Hierarchy | `SuperadminView`, `/superadmin` page, Admin creation modal, dynamic header, navigation isolation | M7.1 | DONE |
| M7.3 | App Tenant Context & Scoping | Update `AdminDataView`, `AdminConfigView`, `AdminBackupView`, `PrintHeader` for `sekolah_id` | M7.1, M7.2 | DONE |
| M7.4 | Ascending Date Sorting | Fix sorting in `RekapJurnalView`, `RekapSiswaView`, `AdminRekapView`, `PiketView` | M7.1 | DONE |
| M7.5 | Verification, E2E Testing & Audit | End-to-end tests, challenger stress tests, forensic audit, build verification | M7.1-M7.4 | IN_PROGRESS |

## Interface Contracts
### Superadmin ↔ Database
- Function: `supabase.from('sekolah').insert([...])`
- Function: `supabase.from('users').insert([{ username, password, nama, role: 'Admin', sekolah_id }])`
- Constraints: `username` must be unique globally; `sekolah_id` must match existing school `id`.

### School Admin / Guru ↔ Database
- Queries on any master/transactional table evaluate RLS against `public.get_auth_user_sekolah_id()` and `public.get_auth_user_role()`.
- Client requests pass `.eq('sekolah_id', user.sekolah_id)` for optimal query planning.

### Recap Views ↔ Output
- Data returned from `jurnal_pembelajaran`, `presensi_guru`, `laporan_piket` must be sorted ascending: `tanggal ASC`, `jam_ke ASC`.
- Cetak Dokumen renders earliest date (day 1 of month) in row 1, and latest date in final row.
