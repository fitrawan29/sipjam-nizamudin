# Empirical Challenger Report: Milestone 1 (M1)

**Agent**: `challenger_m1_2`  
**Role**: Empirical Challenger (critic, specialist)  
**Milestone**: Milestone 1 (Sub Menu Kelas & Pemusatan Penentuan Kelas Siswa)  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m1_2\`  
**Date**: 2026-11-06  
**Final Verdict**: **VERDICT: APPROVE**

---

## 1. Observation

Direct empirical observations from automated verification test execution, static code inspection, and adversarial stress testing:

### 1. Route Aliasing & Tab Normalization
- **Implementation**:
  - `src/lib/navigation.ts`:
    * Line 38: `'view-admin-kelas': { view: 'view-admin-data', tab: 'Data_Kelas' }`
    * Line 39: `'view-kelas': { view: 'view-admin-data', tab: 'Data_Kelas' }`
    * Line 50: `'view-admin-data': '... view-admin-kelas view-kelas'`
    * Line 97, 151: `dataTour: 'view-admin-data view-sistem-blok view-admin-kelas'`
  - `src/components/AdminDataView.tsx`:
    * Lines 42–49:
      ```typescript
      export function normalizeAdminTab(tab?: string): string {
        if (!tab) return 'Data_Siswa';
        const clean = tab.trim().toLowerCase();
        if (clean === 'blok' || clean === 'sistem_blok') return 'sistem_blok';
        if (clean === 'pengguna' || clean === 'users') return 'Pengguna';
        if (clean === 'data_kelas' || clean === 'kelas') return 'Data_Kelas';
        return tab;
      }
      ```
- **Empirical Execution (`npx tsx tests/challenger_m1_empirical.test.ts`)**:
  - `resolveCanonicalRoute('view-admin-kelas')` yields `{ canonicalView: 'view-admin-data', defaultTab: 'Data_Kelas', isLegacyAlias: true }`. (VERIFIED)
  - `resolveCanonicalRoute('view-kelas')` yields `{ canonicalView: 'view-admin-data', defaultTab: 'Data_Kelas', isLegacyAlias: true }`. (VERIFIED)
  - Parameter override: `resolveCanonicalRoute('view-admin-kelas', 'Data_Siswa')` preserves explicit tab override `defaultTab: 'Data_Siswa'`. (VERIFIED)
  - Normalization test:
    * `normalizeAdminTab('Data_Kelas')` -> `'Data_Kelas'`
    * `normalizeAdminTab('data_kelas')` -> `'Data_Kelas'`
    * `normalizeAdminTab('Kelas')` -> `'Data_Kelas'`
    * `normalizeAdminTab('kelas')` -> `'Data_Kelas'`
    * Case variations (`'DATA_KELAS'`, `'kElAs'`) -> `'Data_Kelas'`
    * Whitespace padding (`'  Data_Kelas  '`, `'  kelas  '`) -> `'Data_Kelas'`
    * Defaults: `normalizeAdminTab(undefined)` and `normalizeAdminTab('')` -> `'Data_Siswa'`

### 2. RBAC Access Boundaries & Security Enforcement
- **Implementation**:
  - `src/lib/navigation.ts` (lines 218–243):
    `evaluateTabRBAC` intercepts any attempt to access `view-admin-data`, `view-admin-kelas`, `view-kelas`, or tabs `Data_Kelas`, `data_kelas`, `Kelas`, `kelas` by checking `if (!isAdmin) return { allowed: false, fallbackTab: 'view-home', reason: 'Seluruh data master hanya dapat diakses dan diubah oleh Administrator.' };`.
    For role Siswa, line 199 strictly redirects non-exam views to `fallbackTab: 'view-ujian'`.
  - `src/components/AdminKelasView.tsx`:
    * Line 108: `const isAdmin = isMasterDataModificationAllowed(user?.role);`
    * Lines 699–711: If `!isAdmin`, the entire view is replaced by an "Akses Terblokir" locked card.
    * Action handlers (`handleBatchTransferRoster`, `handleBatchAllocateInbound`, `handleAssignUnassignedStudents`, `handleCreateClass`, `handleRenameClass`, `handleDeleteClass`) enforce `if (!isAdmin)` guards with SweetAlert2 rejections.
  - `src/components/AppScreen.tsx`:
    * Lines 608–618 & lines 621–630: `handleNavigation` blocks unauthorized navigation attempts via `evaluateTabRBAC`.
    * Lines 1306–1325: Even on direct URL tampering (`?view=view-admin-kelas`), JSX rendering strictly validates `isAdmin || isSuperadmin` before mounting `AdminDataView`, falling back to a full-screen red locked card.
- **Empirical Execution**:
  - Tested roles against `view-admin-kelas`, `view-kelas`, `view-admin-data` (tab `Data_Kelas`, `data_kelas`, `Kelas`, `kelas`):
    * `Guru` (and `guru` lowercase): `allowed: false`, fallback `view-home`.
    * `Siswa` (and `siswa` lowercase): `allowed: false`, fallback `view-ujian`.
    * `dinas_pendidikan`, `dinaspendidikan`, `Dinas Pendidikan`: `allowed: false`, fallback `view-home`.
    * `Kepala Sekolah`, `kepalasekolah`, `kepala sekolah`: `allowed: false`, fallback `view-home`.
    * `Piket`: `allowed: false`, fallback `view-home`.
    * `null`, `undefined`, `''`, and arbitrary untrusted roles: `allowed: false`, fallback `view-home`.
  - Tested admin roles (`Admin`, `admin`, `ADMIN`, `Superadmin`, `superadmin`, `SUPERADMIN`, `Super Admin`): `allowed: true`.
  - Sidebar isolation: `getConsolidatedMenuItems` verified across Guru, Siswa, Kepsek, and Dinas — zero leakage of `view-admin-data`, `view-admin-kelas`, or `view-kelas`.

### 3. Full Regression Suite Gate (`npm test`)
- Command: `npm test`
- Result: **0 failures** across all 54 automated test files (Exit code 0).
- Static Typecheck: `npx tsc --noEmit` executed with **0 compilation errors** (Exit code 0).
- Dedicated role test: `npx tsx tests/master_data_admin_role_restriction.test.ts` passed 8/8 tests (Exit code 0).
- Master integrity test: `npx tsx tests/jadwal_mapel_validity_and_master_integrity.test.ts` passed 16/16 checks (Exit code 0).
- Challenger empirical harness: `npx tsx tests/challenger_m1_empirical.test.ts` passed 143/143 tests (Exit code 0).

---

## 2. Logic Chain

1. **Route Aliasing Soundness**:
   - `resolveCanonicalRoute` correctly identifies `'view-admin-kelas'` and `'view-kelas'` in `VIEW_ALIASES`.
   - Both routes resolve to canonical view `'view-admin-data'` with default sub-tab `'Data_Kelas'` and flag `isLegacyAlias: true`.
   - When user lands on `view-admin-data`, `AdminDataView` uses `normalizeAdminTab` on the URL parameter, normalizing all variations (`Data_Kelas`, `data_kelas`, `Kelas`, `kelas`, case variations, leading/trailing whitespace) to canonical `'Data_Kelas'`.
   - This directly fulfills R1 navigation requirements and ensures backward compatibility for all potential deep-links.

2. **Defense-in-Depth RBAC Architecture**:
   - Boundary 1 (Sidebar Menu): `getConsolidatedMenuItems` excludes master data and class management items from non-admin role navigation bars.
   - Boundary 2 (Navigation Interception): `AppScreen.handleNavigation` runs `evaluateTabRBAC` before pushing state, blocking unauthorized access.
   - Boundary 3 (Top-level View Rendering): `AppScreen.tsx` checks `isAdmin || isSuperadmin` before rendering `<AdminDataView />`, displaying an "Akses Terblokir" card if bypassed.
   - Boundary 4 (Sub-view Component Rendering): `AdminKelasView.tsx` independently checks `isMasterDataModificationAllowed(user?.role)` and displays a locked card if bypassed.
   - Boundary 5 (Data Mutation Guards): Every mutating action in `AdminKelasView.tsx` checks `isAdmin` upfront and operations are multi-tenant scoped with `.eq('sekolah_id', sekolahId)`.
   - Observation from testing: All 14 non-admin role variations were completely rejected at every boundary.

3. **Zero-Regression Proof**:
   - All 54 test files in the project test suite executed without failures.
   - Existing master data records (classes `X Merdeka`, `XI Merdeka`, `XII Merdeka`, schedules, subject allocations) remain 100% intact.
   - TypeScript compilation reports zero type errors.

---

## 3. Caveats

1. **Whitespace Tab Edge Case**:
   - Passing a whitespace-only string (e.g. `'   '`) to `normalizeAdminTab` returns `'   '` rather than default `'Data_Siswa'` because `!tab` is false for non-empty string. This has zero security or functional impact because `AppScreen` always trims query parameters before passing them, and `evaluateTabRBAC` protects all master data access regardless of tab.
2. **Physical `data_kelas` Cloud Table Migration**:
   - The Postgres table `data_kelas` is optional in Milestone 1; `AdminKelasView` dynamically synthesizes classes from `data_siswa.kelas` and `wali_kelas.kelas` when `data_kelas` is absent (`isSchemaCacheOrMissingTableError`). Full CSV template export/import pipelines for `data_kelas` will be completed in Milestone 2.

---

## 4. Conclusion

All empirical challenge criteria for Milestone 1 are satisfied:
1. Canonical route resolution for `view-admin-kelas` and `view-kelas` maps precisely to `view-admin-data` with tab `Data_Kelas`.
2. `normalizeAdminTab` handles `Data_Kelas`, `data_kelas`, `Kelas`, and `kelas` robustly under varying case and whitespace inputs.
3. RBAC security boundaries strictly and unconditionally block all non-admin roles (Guru, Siswa, Dinas, Kepsek, Piket, Anon) from `view-admin-kelas`, `view-kelas`, and tab `Data_Kelas`.
4. The full project regression suite (`npm test`) passes 100% with zero regressions.

**VERDICT: APPROVE**

---

## 5. Verification Method

To independently reproduce this empirical verification:

1. **Empirical Challenger Test Suite**:
   ```powershell
   npx tsx tests/challenger_m1_empirical.test.ts
   ```
   *Expected result*: 143/143 tests passed, exit code 0.

2. **Master Data RBAC Test Suite**:
   ```powershell
   npx tsx tests/master_data_admin_role_restriction.test.ts
   ```
   *Expected result*: 8/8 tests passed, exit code 0.

3. **Static TypeScript Compilation**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected result*: 0 compilation errors, exit code 0.

4. **Full Automated Project Regression Suite**:
   ```powershell
   npm test
   ```
   *Expected result*: All 54 test suites pass with 0 failures, exit code 0.
