# Review & Adversarial Critic Report: Role Tata Usaha ('tata_usaha') Implementation

## Review Summary

**Verdict**: **APPROVE**  
**Role**: Reviewer 1 (`reviewer_tu_1`) & Adversarial Critic  
**Scope**: Tata Usaha (`tata_usaha`) implementation in SIPJAM (`ORIGINAL_REQUEST.md`, `PROJECT.md`)  
**Integrity Violations**: None found.  
**Ponytail Compliance**: 100% compliant (0 new npm packages, 0 redundant components, maximal reuse of existing views and pipeline).

---

## 1. Observation

Direct observations verified through code inspection, static AST analysis, and test executions:

1. **Role Identification & Type Systems**:
   - `src/types/user.ts`: Added `'tata_usaha'` to `UserRole` and `AppUser.role` (lines 1 & 7).
   - `src/types/database.ts`: Added `"tata_usaha" | "Tata Usaha"` to `RoleUser` (line 2171).
   - `src/lib/supabaseClient.ts`: `isAdminRole(role)` returns strictly `false` for `'tata_usaha'` (line 170). Tested via TS execution:
     `isAdminRole('tata_usaha') === false`, `isAdminRole('Tata Usaha') === false`, `isAdminRole('tatausaha') === false`.
   - `src/lib/supabaseClient.ts`: In `checkMasterDataMutationGuard` (lines 203-214), mutations (`POST`, `PUT`, `PATCH`, `DELETE`) on student (`data_siswa`, `siswa`) and teacher (`data_guru`, `guru`) tables are permitted for `tata_usaha`, whereas all other 14 master tables (e.g. `data_kelas`, `data_mapel`, `jadwal_pelajaran`, `wali_kelas`, `kalender_pendidikan`, `sistem_blok`, `guru_kelas`, `guru_mapel`) return HTTP 403 Forbidden with `{ error: 'Akses Ditolak', code: '42501' }`.

2. **Strict Menu Isolation (Exactly 2 Items)**:
   - `src/lib/navigation.ts`: `getConsolidatedMenuItems({ role: 'tata_usaha' })` (lines 173-178) strictly returns exactly 2 items:
     - `view-data-siswa` (Data Siswa, icon: `fa-user-graduate`, dataTour: `view-admin-data`)
     - `view-data-guru` (Data Guru, icon: `fa-chalkboard-user`, dataTour: `view-admin-data`)
     Zero presence of `view-dokumen`, `view-admin-config`, `view-admin-backup`, or teacher modules.
   - `VIEW_ALIASES` (lines 40-43): Mapped `view-data-siswa` to `{ view: 'view-admin-data', tab: 'Data_Siswa' }` and `view-data-guru` to `{ view: 'view-admin-data', tab: 'Data_Guru' }`.
   - `SIDEBAR_TOUR_ALIASES['view-admin-data']` (line 54) includes `view-data-siswa view-data-guru`.

3. **Routing & Tab RBAC Isolation (`evaluateTabRBAC`)**:
   - `src/lib/navigation.ts`:
     - Line 224: `if (isTataUsaha && viewId === 'view-dokumen')` strictly returns `{ allowed: false, fallbackTab: 'view-data-siswa', reason: 'Role Tata Usaha tidak memiliki hak akses ke Bank Dokumen / Persuratan.' }`.
     - Lines 247-259: `if (isTataUsaha)` allows `view-admin-data` exclusively when tab is in `['Data_Siswa', 'data_siswa', 'siswa', 'Data_Guru', 'data_guru', 'guru']`. All other master data tabs (`Pengguna`, `Data_Kelas`, `Data_Mapel`, `Jadwal_Pelajaran`, `Wali_Kelas`, `Kalender_Pendidikan`, `sistem_blok`) return `{ allowed: false, fallbackTab: 'view-data-siswa', reason: 'Role Tata Usaha hanya memiliki akses ke Data Siswa dan Data Guru.' }`. All non-home views return `{ allowed: false }`.

4. **AST Comment Preservation**:
   - `src/components/AppScreen.tsx` line 1012:
     `{/* AST preservation: data-tour={item.id} */}` is preserved verbatim.
   - `src/components/ClaySidebar.tsx` line 223:
     `{/* AST preservation: data-tour={item.id} */}` is preserved verbatim.

5. **Presentation & Application Shell Invariants**:
   - `src/components/AppScreen.tsx`:
     - Line 95: `const isTataUsaha = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';`.
     - Line 195: Default landing view for `isTataUsaha` resolves to `'view-admin-data'`.
     - Lines 496-527: `handleNavigation` blocks `view-dokumen` and unauthorized views with SweetAlert2 warnings.
     - Lines 1184-1207: Direct JSX render guard for `view-dokumen` displays an "Akses Terblokir" glass-card if `isTataUsaha`.
     - Line 1369: `view-admin-data` view gate updated to `isAdmin || isSuperadmin || isTataUsaha`.
     - Lines 943-952: Sidebar profile badge displays "Tata Usaha" with `fa-id-card-clip` icon and teal styling.
     - Onboarding tour trigger excluded for `isTataUsaha` (line 252).
   - `src/components/ClaySidebar.tsx`:
     - Line 69: `const isTU = isTataUsaha || (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';`.
     - Lines 77-80, 91-92, 105-106: Renders teal badge, "Tata Usaha" label, and `fa-id-card-clip` icon.

6. **Component Reuse in `AdminDataView.tsx`**:
   - `tabs` array declaration `const tabs = [...]` (line 220) remains completely intact, ensuring that existing AST regex `/const\s+tabs\s*=\s*\[([\s\S]*?)\];/` in regression tests matches verbatim.
   - Line 246: `const visibleTabs = isTataUsaha ? tabs.filter(t => t.id === 'Data_Siswa' || t.id === 'Data_Guru') : tabs;`.
   - Line 153: `canModify = isAdmin || (isTataUsaha && (activeTab === 'Data_Siswa' || activeTab === 'Data_Guru'));`.
   - Line 248: `handleSwitchTab` rejects unauthorized tab switching for `isTataUsaha`.
   - Line 3063: `<NaikKelasModal ... role={isTataUsaha ? 'Admin' : user?.role} />` allows cohort promotion within authorized student bounds.

7. **User Management in `AdminPenggunaView.tsx`**:
   - Lines 49-77: School Admin loads Tata Usaha accounts directly from `users` table without modifying or corrupting teacher account synchronization (`syncTeacherAccounts`).
   - Lines 158-216: Dedicated "+ Akun TU" modal creates accounts with `role: 'tata_usaha'`.
   - Lines 721-730: Dedicated TU account deletion from `users` table.

8. **Empirical Test Results**:
   - `npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts`: **81 passed, 0 failed** (100%).
   - `npx tsx tests/kepsek_pengawas_rbac.test.ts`: **47 passed, 0 failed** (100%).
   - `npx tsx tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`: **58 passed, 0 failed** (100%).
   - `npx tsx tests/master_data_admin_role_restriction.test.ts`: **8 passed, 0 failed** (100%).
   - `npx tsc --noEmit`: Exit code **0**, 0 errors.
   - `npm test`: Exit code **0**, all 68+ suites executed with 0 failures.

---

## 2. Logic Chain

1. From `ORIGINAL_REQUEST.md` (R1 & R2) and `PROJECT.md`, role Tata Usaha must only access Data Siswa and Data Guru, with zero access to Bank Dokumen / Persuratan, system configuration, or superadmin capabilities.
2. In `src/lib/navigation.ts`, `getConsolidatedMenuItems` for `tatausaha` returns strictly `['view-data-siswa', 'view-data-guru']`, fulfilling Miller's Law ergonomics and strict isolation.
3. In `src/lib/navigation.ts`, `evaluateTabRBAC` guards both the view and tab levels: any attempt to open `view-dokumen`, system configuration, superadmin views, or unauthorized master tabs (e.g. `Pengguna`, `Data_Kelas`, `Data_Mapel`, `sistem_blok`) returns `{ allowed: false }` with actionable fallback to `view-data-siswa`.
4. In `src/components/AppScreen.tsx`, defense-in-depth routing is implemented:
   - Direct URL injection for `view-dokumen` renders an explicit "Akses Terblokir" lock card.
   - Initial landing view automatically selects `'view-admin-data'` with tab `'Data_Siswa'`.
   - Programmatic navigation via `handleNavigation` checks `evaluateTabRBAC` and displays a SweetAlert2 warning if blocked.
5. In `src/components/AdminDataView.tsx`, the `/ponytail` philosophy was adhered to by reusing the existing component without duplicating code:
   - Stepper and tab bars iterate over `visibleTabs` (`Data_Siswa` and `Data_Guru`).
   - `canModify` allows full CRUD (create, edit, delete, CSV import, Naik Kelas) on Student and Teacher records while locking all other entities.
   - The original `const tabs = [...]` array syntax is preserved verbatim, ensuring backward compatibility with existing AST tests.
6. In `src/lib/supabaseClient.ts`, data layer mutation security prevents privilege escalation:
   - `isAdminRole('tata_usaha')` strictly returns `false`.
   - `checkMasterDataMutationGuard` authorizes mutations only on `data_siswa` and `data_guru`, while returning HTTP 403 Forbidden on all other 14 master tables.
7. Both `AppScreen.tsx:1012` and `ClaySidebar.tsx:223` contain `{/* AST preservation: data-tour={item.id} */}` verbatim.
8. Automated tests verify all dimensions with zero regressions across existing roles (Superadmin, Admin, Guru, Dinas, Siswa).

---

## 3. Adversarial Stress-Test Results & Attack Surface

| # | Attack Scenario / Hypothesis | Mechanism Tested | Observed Behavior | Status |
|---|-----------------------------|------------------|-------------------|--------|
| 1 | **Direct URL Hijacking**: TU accesses `?view=view-dokumen` | JSX guard in `AppScreen.tsx` | Renders "Akses Terblokir" lock card; no document data leaked. | **DEFENDED** |
| 2 | **Direct URL Tab Escalation**: TU accesses `?view=view-admin-data&tab=Pengguna` | `AdminDataView.tsx` `activeTab` sanitizer & `evaluateTabRBAC` | Tab state forces fallback to `Data_Siswa`; tab list hides `Pengguna`. | **DEFENDED** |
| 3 | **Direct URL Admin Config**: TU accesses `?view=view-admin-config` | `AppScreen.tsx` `isAdmin \|\| isSuperadmin` gate | Displays "Akses Terblokir" lock card. | **DEFENDED** |
| 4 | **Mutation Escalation on Master Tables**: TU sends `POST /rest/v1/data_kelas` | `checkMasterDataMutationGuard` | Intercepted with HTTP 403 Forbidden (`42501`). | **DEFENDED** |
| 5 | **Query Parameter Evasion**: TU sends `PATCH /rest/v1/jadwal_pelajaran?id=eq.2` | URL query regex parser in mutation guard | Intercepted with HTTP 403 Forbidden (`42501`). | **DEFENDED** |
| 6 | **Partial Word Collisions**: Does `/rest/v1/guru_kelas` get falsely permitted by `guru`? | TS regex evaluation in `checkMasterDataMutationGuard` | `guru_kelas` requires word boundary (`/`, `$`, or `?`); returns HTTP 403 Forbidden. | **DEFENDED** |
| 7 | **Role Normalization Variations**: `'Tata Usaha'`, `'tata-usaha'`, `' TATA_USAHA '` | Normalizer `.toLowerCase().replace(/[\s_-]+/g, '')` | Correctly identified as `tatausaha` across all components and guards. | **DEFENDED** |
| 8 | **Privilege Escalation via `isAdminRole`**: Calling `isAdminRole('tata_usaha')` | Function check | Strictly returns `false`. | **DEFENDED** |
| 9 | **Teacher Sync Corruption**: Admin creates TU accounts | `AdminPenggunaView.tsx` | Stored exclusively in `users` table; `syncTeacherAccounts` remains untouched. | **DEFENDED** |
| 10 | **Existing Role Regressions**: Admin, Superadmin, Guru, Siswa workflows | `npm test` (68+ suites) | 100% passed without errors. | **DEFENDED** |

---

## 4. Integrity Violation Check

- **Hardcoded test results**: None. Test assertions evaluate actual runtime functions (`evaluateTabRBAC`, `checkMasterDataMutationGuard`, etc.).
- **Dummy/facade implementations**: None. Real state machines, real route resolution, real network guards, and real UI components.
- **Shortcuts / bypasses**: None. Reused existing infrastructure via clean composition without bypassing RBAC.
- **Fabricated verification artifacts**: None. All commands were independently executed and verified in this review session.

---

## 5. Caveats

No caveats. All requirements from `ORIGINAL_REQUEST.md` and `PROJECT.md` are completely met and independently verified.

---

## 6. Conclusion

The implementation of Role Tata Usaha (`tata_usaha`) is sound, robust, and clean:
- Strictly isolates access to Data Siswa and Data Guru.
- Enforces multi-layered defense (sidebar menu isolation, route aliasing, tab RBAC, component JSX guards, and PostgREST network mutation interception).
- Preserves verbatim AST comments and existing regression test invariants.
- Perfectly conforms to `/ponytail` (minimal diff, 0 extra dependencies, 100% component reuse).
- Passed all verification checks with 0 errors and zero regressions across existing roles.

**Final Verdict**: **APPROVE**

---

## 7. Verification Method

To independently reproduce verification:

1. **Verify Tata Usaha Dedicated RBAC & Isolation Suite**:
   ```powershell
   npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts
   ```
   *Expected*: 81 passed, 0 failed.

2. **Verify Kepala Sekolah & Pengawas RBAC Suite**:
   ```powershell
   npx tsx tests/kepsek_pengawas_rbac.test.ts
   ```
   *Expected*: 47 passed, 0 failed.

3. **Verify Sub-Menu Kelas & Master Data Admin Restriction Suites**:
   ```powershell
   npx tsx tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts
   npx tsx tests/master_data_admin_role_restriction.test.ts
   ```
   *Expected*: All pass with 0 failures.

4. **Verify TypeScript Compilation**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0.

5. **Verify Full Project Regression Suite**:
   ```powershell
   npm test
   ```
   *Expected*: All 68+ test suites pass with exit code 0.
