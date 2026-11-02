# Handoff: Master Data Role Restriction & Management Enforcement

## 1. Executive Summary
Implemented strict role authorization across application layers to guarantee that all Master Data (`data_siswa`, `data_guru`, `jadwal_pelajaran`, `data_mapel`, `guru_mapel`, `wali_kelas`, `data_kelas`, `kelas`, `kalender_pendidikan`, `sistem_blok`) can only be modified through the application by users with the `Admin` or `Superadmin` role via the admin management panel. Non-admin users attempting to mutate master data are immediately blocked with HTTP 403 Forbidden (`code: 42501`). In addition, master data loaded or uploaded by administrators is preserved intact without silent automatic alteration.

## 2. Files Modified & Substance of Changes
1. `src/lib/supabaseClient.ts`:
   - Defined `MASTER_DATA_TABLES` covering all master data entities: `data_siswa`, `data_guru`, `jadwal_pelajaran`, `data_mapel`, `guru_mapel`, `wali_kelas`, `data_kelas`, `kelas`, `guru_kelas`, `kalender_pendidikan`, `sistem_blok`.
   - Implemented `isMasterDataEndpoint`, `isAdminRole`, and `checkMasterDataMutationGuard`.
   - Wired mutation guards into `dynamicTenantFetch`, `masterFetch`, `getTenantSupabaseClient`, and `getSatelliteSupabaseClient` to reject non-admin mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) with HTTP 403 Forbidden.
   - Read operations (`GET` / `SELECT`) remain accessible for teachers and staff.
2. `src/lib/dataIntegrityGuard.ts`:
   - Added and exported `validateMasterDataModificationRole(role)` and `isMasterDataModificationAllowed(role)`.
3. `src/lib/navigation.ts`:
   - Hardened `evaluateTabRBAC` for `view-admin-data`: strictly rejects non-admin users and routes to `view-home`.
4. `src/components/AdminDataView.tsx`:
   - Preserved master data as stored in database during `loadData` and fallback direct fetch without silent mapping or filtering.
   - Added role authorization checks in `handleFileUpload`, `handleOpenCreateModal`, `handleOpenEditModal`, `handleDeleteItem`, and `handleEditWaliKelas`.
   - Restricted UI mutation actions (Unggah, Baru, Naik Kelas, Edit, Hapus) to render only for administrators.
   - Preserved uploaded CSV subject data without silent automated transformation.
5. `supabase/migrations/20261102_restrict_master_data_to_admin.sql`:
   - Created database-level RLS policies enforcing `public.get_auth_user_role() = 'Admin'` or Superadmin on INSERT, UPDATE, DELETE for all master tables.
6. `tests/master_data_admin_role_restriction.test.ts`:
   - Automated test suite validating role authorization, endpoint detection, navigation RBAC, client-level PostgREST interception, and tenant context propagation.
7. `package.json`:
   - Added `master_data_admin_role_restriction.test.ts` to `npm test`.

## 3. Verification Summary
- `npx tsx tests/master_data_admin_role_restriction.test.ts`: 6/6 tests passed.
- `npm test`: All 46 test suites passed with exit code 0.
- `npm run build`: Next.js production build succeeded with Turbopack and TypeScript checks passed.
