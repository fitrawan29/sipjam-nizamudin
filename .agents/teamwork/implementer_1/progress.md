# Progress - Master Data Role Restriction

## Status: Implemented & Verifying
- Implemented client-side PostgREST mutation interception for Master Data (`data_siswa`, `data_guru`, `jadwal_pelajaran`, `data_mapel`, `guru_mapel`, `wali_kelas`, `data_kelas`, `kelas`, `kalender_pendidikan`, `sistem_blok`).
- Verified role validation: strictly permits Admin & Superadmin, rejects non-admin roles (Guru, Siswa, Piket, Kepala Sekolah, Dinas Pendidikan, anon) with 403 Forbidden and code `42501`.
- Non-admin roles retain read (SELECT / GET) access for daily operations.
- Updated `evaluateTabRBAC` to strictly block non-admin access to `view-admin-data`.
- Updated `AdminDataView.tsx` to preserve loaded & uploaded master data without automatic silent modification/filtering, and conditionally render mutations only for Admin.
- Added database migration `supabase/migrations/20261102_restrict_master_data_to_admin.sql` with RLS policies.
- Created `tests/master_data_admin_role_restriction.test.ts` (6/6 tests passed).
- Running full test suite.
