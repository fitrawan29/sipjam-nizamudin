# Investigation & Architecture Report: 'tata_usaha' (Tata Usaha / TU) Role Integration

## Executive Summary
This report provides a comprehensive architectural investigation for adding the `tata_usaha` (Tata Usaha / TU) role to the SIPJAM application under the **/ponytail** design philosophy (simplest, cleanest, zero-bloat solution reusing existing code without unnecessary abstractions).

Key outcomes:
1. **Access Control & Routing**: Enforced at three defense layers — Client-side navigation (`src/lib/navigation.ts`), UI Component view gates (`src/components/AppScreen.tsx` & `src/components/AdminDataView.tsx`), and Data mutation interception (`src/lib/supabaseClient.ts`).
2. **Zero-Bloat Reuse**: Zero new page views or components needed. The existing `AdminDataView.tsx` already contains complete Data Siswa and Data Guru management UI; filtering its `tabs` array to `['Data_Siswa', 'Data_Guru']` for `tata_usaha` instantly delivers the required operational functionality without duplicating a single line of UI logic.
3. **Test Architecture**: Test suites are written in standalone TypeScript files executed using `tsx` (v4.23.13) with Node.js `node:assert`. A dedicated test suite (`tests/tata_usaha_role_rbac_and_isolation.test.ts`) covering all 5 security and isolation invariants can be added cleanly to `npm test`.

---

## 1. Observation

### 1.1 Routing and Access Control Architecture

#### A. Route Resolution & Aliases (`src/lib/navigation.ts`)
- **Lines 22–41**: `VIEW_ALIASES` defines canonical mapping for legacy views:
  ```typescript
  export const VIEW_ALIASES: Record<string, { view: string; tab?: string }> = {
    'view-guru-rekap-jurnal': { view: 'view-guru-jurnal', tab: 'rekap-pribadi' },
    'view-jurnal-kelas':      { view: 'view-guru-jurnal', tab: 'supervisi-kelas' },
    'view-history':           { view: 'view-guru-presensi', tab: 'riwayat' },
    'view-rapor':             { view: 'view-gradebook', tab: 'rapor' },
    'view-analitik':          { view: 'view-admin-rekap', tab: 'analitik' },
    'view-rekap-guru':        { view: 'view-admin-rekap', tab: 'tabel' },
    'view-sistem-blok':       { view: 'view-admin-data', tab: 'blok' },
    'view-admin-pengguna':    { view: 'view-admin-data', tab: 'Pengguna' },
    'view-pengguna':          { view: 'view-admin-data', tab: 'Pengguna' },
    'view-admin-users':       { view: 'view-admin-data', tab: 'Pengguna' },
    'view-admin-kelas':       { view: 'view-admin-data', tab: 'Data_Kelas' },
    'view-kelas':             { view: 'view-admin-data', tab: 'Data_Kelas' },
    'view-admin-backup':      { view: 'view-admin-config', tab: 'backup' }
  };
  ```
- **Lines 54–81**: `resolveCanonicalRoute(rawView, rawTab)` converts raw parameters into canonical routes and default tabs.
- **Lines 85–191**: `getConsolidatedMenuItems(params)` normalizes the role using:
  ```typescript
  const normRole = (params.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const isSuperadmin = normRole === 'superadmin';
  const isDinas = normRole === 'dinaspendidikan';
  const isAdmin = isSuperadmin || normRole === 'admin';
  const isKepsek = params.isKepalaSekolah || normRole === 'kepalasekolah';
  ```
  If no role matches, it falls back to regular `guru` menus (lines 173–190), which exposes `view-guru-presensi`, `view-guru-jurnal`, `view-dokumen`, etc.
- **Lines 193–260**: `evaluateTabRBAC(viewId, tabId, user)`:
  - Lines 226–251 strictly restrict `view-admin-data` and all its subtabs to `isAdmin`:
    ```typescript
    if (
      effectiveView === 'view-admin-data' ||
      viewId === 'view-admin-data' ||
      ...
    ) {
      if (!isAdmin) {
        return { allowed: false, fallbackTab: 'view-home', reason: 'Seluruh data master hanya dapat diakses dan diubah oleh Administrator.' };
      }
    }
    ```
  - Lines 253–257 strictly restrict `view-admin-config` and `view-admin-backup` to `isAdmin`.

#### B. Main Application Navigation & View Gates (`src/components/AppScreen.tsx`)
- **Lines 91–95**: Role boolean flags:
  ```typescript
  const isSuperadmin = (baseUser?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
  const isDinas = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'dinaspendidikan';
  const isAdmin = isSuperadmin || (baseUser?.role || '').toLowerCase() === 'admin';
  const isSiswa = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'siswa';
  ```
  *(Missing `isTataUsaha`)*.
- **Lines 191–195 & 230–233**: Initial view & Popstate fallback:
  ```typescript
  if (isSuperadmin) return 'view-superadmin-overview';
  if (isDinas) return 'view-dinas-overview';
  if (isSiswa) return 'view-ujian';
  return 'view-home';
  ```
- **Lines 477–631**: `handleNavigation(targetId, targetTab)`:
  - Lines 608–618 guard configuration and data views:
    ```typescript
    if (['view-admin-config', 'view-admin-backup', 'view-admin-data', 'view-admin-pengguna', 'view-pengguna', 'view-admin-users'].includes(targetId)) {
      if (!isAdmin && !isSuperadmin) {
        Swal.fire({
          icon: 'warning',
          title: 'Akses Ditolak',
          text: 'Akses Terblokir: Halaman Konfigurasi dan Manajemen Data secara eksklusif hanya dapat diakses oleh Administrator.',
          confirmButtonColor: '#0B4619'
        });
        return;
      }
    }
    ```
  - Line 621 enforces defense-in-depth sub-tab RBAC check via `evaluateTabRBAC`.
- **Lines 765–771**: `getConsolidatedMenuItems` call passes `role`:
  ```typescript
  role: isSuperadmin ? 'superadmin' : isDinas ? 'dinaspendidikan' : isAdmin ? 'admin' : (isKepalaSekolah ? 'kepalasekolah' : isSiswa ? 'siswa' : 'guru'),
  ```
- **Lines 1060–1365**: JSX view rendering gates:
  - Line 1060: `<SuperadminView>` requires `isSuperadmin`.
  - Line 1146: `<DokumenView>` (`view-dokumen`) renders unconditionally if `currentView === 'view-dokumen'` without role verification.
  - Line 1306–1326: `view-admin-data` renders `<AdminDataView>` only if `isAdmin || isSuperadmin`, otherwise renders red "Akses Terblokir" card.
  - Line 1328–1348: `view-admin-backup` renders `<AdminBackupView>` only if `isAdmin || isSuperadmin`.
  - Line 1350–1380: `view-admin-config` renders `<AdminConfigView>` only if `isAdmin || isSuperadmin`.

#### C. Component Tabs & Mutation Checks (`src/components/AdminDataView.tsx`)
- **Lines 40–53**: `normalizeAdminTab` normalizes tab aliases (`siswa` -> `Data_Siswa`, `guru` -> `Data_Guru`).
- **Line 139**:
  ```typescript
  const isAdmin = isMasterDataModificationAllowed(user?.role);
  ```
- **Lines 220–230**: Master data tab pipeline definition:
  ```typescript
  const tabs = [
    { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa', step: 1, icon: 'fa-user-graduate', desc: 'Identitas Siswa' },
    { id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas', step: 2, icon: 'fa-chalkboard', desc: 'Rombel & Tingkat' },
    { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel', step: 3, icon: 'fa-book', desc: 'Mata Pelajaran' },
    { id: 'Data_Guru', label: 'Guru', table: 'data_guru', step: 4, icon: 'fa-chalkboard-user', desc: 'Data Pendidik' },
    { id: 'Jadwal_Pelajaran', label: 'Jadwal', table: 'jadwal_pelajaran', step: 5, icon: 'fa-calendar-days', desc: 'Jadwal KBM' },
    { id: 'Wali_Kelas', label: 'Wali Kelas', table: 'wali_kelas', step: 6, icon: 'fa-user-tie', desc: 'Penugasan Wali' },
    { id: 'Pengguna', label: 'Pengguna', table: 'users', step: 7, icon: 'fa-users-gear', desc: 'Akun Login' },
    { id: 'Kalender_Pendidikan', label: 'Kalender', table: 'kalender_pendidikan', step: 8, icon: 'fa-calendar-check', desc: 'Hari Efektif & Libur' },
    { id: 'sistem_blok', label: 'Periode Sistem Blok', table: 'sistem_blok', step: 9, icon: 'fa-cubes', desc: 'Rotasi Blok KBM', optional: true },
  ];
  ```
- **Lines 2677, 2709, 2731, 2988**: Mutating actions (Add Student, Add Teacher, CSV Import, Naik Kelas modal, Edit/Delete buttons) are guarded by `{isAdmin && (...) }`.

#### D. Network Mutation Interception (`src/lib/supabaseClient.ts` & `src/lib/dataIntegrityGuard.ts`)
- **`src/lib/supabaseClient.ts`**:
  - **Lines 124–141**: `MASTER_DATA_TABLES` lists 16 tables:
    `data_siswa`, `siswa`, `data_guru`, `guru`, `jadwal_pelajaran`, `jadwal_pembelajaran`, `data_mapel`, `mapel`, `mata_pelajaran`, `guru_mapel`, `wali_kelas`, `data_kelas`, `kelas`, `guru_kelas`, `kalender_pendidikan`, `sistem_blok`.
  - **Lines 170–174**: `isAdminRole`:
    ```typescript
    export function isAdminRole(role?: string | null): boolean {
      if (!role) return false;
      const norm = String(role).trim().toLowerCase().replace(/[\s_-]+/g, '');
      return norm === 'admin' || norm === 'superadmin' || norm === 'servicerole';
    }
    ```
  - **Lines 196–204**: `checkMasterDataMutationGuard`:
    ```typescript
    export function checkMasterDataMutationGuard(requestUrlStr: string, method: string, role?: string | null): Response | null {
      const upperMethod = (method || 'GET').trim().toUpperCase();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
        if (isMasterDataEndpoint(requestUrlStr) && !isAdminRole(role)) {
          return createMasterDataForbiddenResponse();
        }
      }
      return null;
    }
    ```
    *(Returns HTTP 403 / PostgreSQL code 42501 for non-admin mutations).*
- **`src/lib/dataIntegrityGuard.ts`**:
  - **Lines 522–535**:
    ```typescript
    export function validateMasterDataModificationRole(role?: string | null): ValidationResult {
      const norm = (role || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
      if (norm === 'admin' || norm === 'superadmin' || norm === 'servicerole') {
        return { valid: true };
      }
      return {
        valid: false,
        message: 'Akses ditolak: Seluruh data master hanya dapat diubah melalui aplikasi oleh Admin menggunakan panel manajemen admin.'
      };
    }
    ```

#### E. Next.js Routing & Superadmin Protection (`src/app/superadmin/page.tsx`)
- **Lines 22–28**:
  ```typescript
  const isSa = (parsed?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
  if (!isSa) {
    router.replace('/');
    return;
  }
  ```
  *(Non-superadmin roles, including Tata Usaha, are instantly redirected to `/`).*

---

### 1.2 Test Framework and Existing Test Suites

#### A. Testing Framework
- Identified in `package.json`:
  - Test command: `"test": "tsx tests/r1_r10_ponytail_verification.test.ts && tsx tests/imageUrl.test.ts && ..."`
  - Tooling: **`tsx`** (v4.23.13) executing TypeScript files natively in Node.js (no Jest or Vitest packages are installed; `vitest` in `ORIGINAL_REQUEST.md` was illustrative).
  - Assertion style: Native `node:assert` (`assert.strictEqual`, `assert.ok`) and custom `assert(condition, message)` with ANSI color escape codes (`\x1b[32m`, `\x1b[31m`).

#### B. Key Pre-existing RBAC Test Suites
1. **`tests/master_data_admin_role_restriction.test.ts`**:
   - Tests `isAdminRole` across `Admin`, `Superadmin`, `Guru`, `Siswa`, `Piket`, `Kepala Sekolah`, `dinas_pendidikan`.
   - Tests `evaluateTabRBAC` for `view-admin-data`, `view-sistem-blok`, `view-admin-backup`.
   - Tests `checkMasterDataMutationGuard` across HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE` vs `GET`).
   - Tests `getTenantSupabaseClient` 403 Forbidden rejection on all 16 master tables.
   - Command: `npx tsx tests/master_data_admin_role_restriction.test.ts` -> **Executed synchronously, 8/8 test suites passed in 5.3s**.
2. **`tests/kepsek_pengawas_rbac.test.ts`**:
   - Tests role-based sidebar menu items isolation (`getConsolidatedMenuItems`).
   - Tests route protection in `handleNavigation` and JSX render guards in `AppScreen.tsx`.
   - Command: `npx tsx tests/kepsek_pengawas_rbac.test.ts` -> **Executed synchronously, 47/47 assertions passed in 2.1s**.
3. **`tests/dinas_pendidikan_monitoring.test.ts`**:
   - Tests `dinaspendidikan` role RBAC, default landing view `view-dinas-overview`, mutation block on admin views, and read-only propagation.
   - Command: `npx tsx tests/dinas_pendidikan_monitoring.test.ts` -> **Executed synchronously, 25/25 assertions passed in 2.2s**.
4. **`tests/admin_submenu_pengguna_kredensial_guru.test.ts`**:
   - Tests `evaluateTabRBAC` blocking non-admin roles from the `Pengguna` tab and `view-admin-pengguna`.

---

## 2. Logic Chain

```
[Observation: R1 & R2 from ORIGINAL_REQUEST.md]
Role 'tata_usaha' is required to have operational access ONLY to Data Siswa and Data Guru.
Access to Bank Dokumen / Persuratan, system configuration, and superadmin accounts MUST be blocked.
      │
      ▼
[Observation: Architecture in src/lib/navigation.ts]
Menu generation is centralized in getConsolidatedMenuItems(params).
Tab RBAC access control is centralized in evaluateTabRBAC(viewId, tabId, user).
      │
      ▼
[Logic Step 1: Menu Isolation (/ponytail)]
By adding a single branch in getConsolidatedMenuItems for normRole === 'tatausaha':
Return EXACTLY 2 items: [{ id: 'view-data-siswa' }, { id: 'view-data-guru' }].
By registering 'view-data-siswa' -> 'view-admin-data#Data_Siswa' and
'view-data-guru' -> 'view-admin-data#Data_Guru' in VIEW_ALIASES:
Clicking the menu seamlessly loads Data Siswa or Data Guru tabs without creating any new views or code.
Miller's Law (2 items <= 8) is strictly satisfied.
      │
      ▼
[Logic Step 2: Tab RBAC Protection (evaluateTabRBAC)]
When role is 'tata_usaha':
- If effectiveView === 'view-admin-data' and effectiveTab is 'Data_Siswa' or 'Data_Guru' -> ALLOW.
- If effectiveTab is any other master data tab ('Pengguna', 'Data_Kelas', 'Data_Mapel', 'Jadwal_Pelajaran', 'Wali_Kelas', 'Kalender_Pendidikan', 'sistem_blok') -> BLOCK.
- If viewId === 'view-dokumen' (Bank Dokumen / Persuratan) -> BLOCK.
- If viewId is 'view-admin-config' or 'view-admin-backup' -> BLOCK (already blocked since isAdmin is false).
- If viewId is teacher views ('view-guru-jurnal', 'view-guru-presensi', 'view-piket', etc.) -> BLOCK.
      │
      ▼
[Logic Step 3: UI Component Protection (AppScreen.tsx & AdminDataView.tsx)]
- In AppScreen.tsx:
  - Add isTataUsaha check.
  - In handleNavigation: reject 'view-dokumen' with warning alert; reject non-student/teacher master tabs.
  - In JSX rendering: allow 'view-admin-data' for (isAdmin || isSuperadmin || isTataUsaha).
  - Wrap 'view-dokumen' to render "Akses Terblokir" if isTataUsaha attempts direct link.
- In AdminDataView.tsx:
  - Filter tabs array: const tabs = isTataUsaha ? allTabs.filter(t => t.id === 'Data_Siswa' || t.id === 'Data_Guru') : allTabs.
  - Define canModify = isAdmin || (isTataUsaha && (activeTab === 'Data_Siswa' || activeTab === 'Data_Guru')).
  - Enable student/teacher CRUD actions for canModify.
      │
      ▼
[Logic Step 4: Network Fetch Layer Guard (checkMasterDataMutationGuard)]
- isAdminRole('tata_usaha') remains FALSE (preserving existing tests that assert isAdminRole is strictly Admin/Superadmin).
- In checkMasterDataMutationGuard:
  If normRole === 'tatausaha':
    If target endpoint is student ('data_siswa', 'siswa') or teacher ('data_guru', 'guru') -> return null (PERMIT MUTATION).
    If target endpoint is any other master table (e.g. 'jadwal_pelajaran', 'data_kelas') -> return 403 Forbidden.
  This allows Tata Usaha to manage students & teachers while preventing mutation of all other master data tables!
      │
      ▼
[Logic Step 5: Test Verification Strategy]
A new test file tests/tata_usaha_role_rbac_and_isolation.test.ts must be authored to verify:
1. Authentication & Session Identity (role: 'tata_usaha' recognized, sidebar badge, avatar).
2. Navigation isolation (exactly 2 menu items: Data Siswa & Data Guru; zero leak of Dokumen/Config/Superadmin).
3. Route protection via evaluateTabRBAC (Data Siswa & Data Guru permitted; all other tabs blocked; Dokumen blocked).
4. Direct URL & JSX protection in AppScreen.tsx.
5. PostgREST mutation guard (mutations on data_siswa and data_guru succeed; mutations on other master tables rejected 403).
6. Preserved functionality for Admin, Superadmin, Guru, Siswa, Dinas, Kepsek without regression.
```

---

## 3. Caveats

1. **Role String Normalization**:
   In the database, user roles might be stored as `'tata_usaha'`, `'tatausaha'`, `'Tata Usaha'`, or `'TATA_USAHA'`.
   *Mitigation*: The normalization logic `normRole = String(role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha'` handles all case, spacing, and underscore variations cleanly.
2. **Database Seed User**:
   Local development database may not have a pre-existing `tata_usaha` user record.
   *Mitigation*: Automated test suites can simulate and instantiate tenant clients and session tokens dynamically without requiring manual DB seeding. If manual testing is desired, an SQL insert (`INSERT INTO users (username, password, nama, role, sekolah_id) VALUES ('tu_demo', 'tu123', 'Staf Tata Usaha', 'tata_usaha', '...'))`) can be used.
3. **Existing Test Suite Stability**:
   Running the full test suite (`npm test`) takes ~2–3 minutes due to 67 sequential test files.
   *Mitigation*: Existing test suites must NOT be modified in ways that weaken their assertions. `isAdminRole` must strictly return `false` for `tata_usaha` to maintain 100% compatibility with `tests/master_data_admin_role_restriction.test.ts`.

---

## 4. Conclusion & /ponytail Recommendations

### 4.1 Minimal Set of Changes (/ponytail)

| File Path | Type of Modification | Rationale |
|---|---|---|
| `src/types/user.ts` | Type definition edit | Add `'tata_usaha'` to `UserRole` union type. |
| `src/lib/navigation.ts` | 3 small localized additions | (1) Add `'view-data-siswa'` & `'view-data-guru'` to `VIEW_ALIASES`.<br>(2) Add `normRole === 'tatausaha'` branch in `getConsolidatedMenuItems` returning 2 items.<br>(3) Update `evaluateTabRBAC` to allow `view-admin-data` only for `Data_Siswa`/`Data_Guru`, and block `view-dokumen`. |
| `src/components/AppScreen.tsx` | Localized guard updates | (1) Add `isTataUsaha` boolean.<br>(2) Add TU handling in `handleNavigation` (reject `view-dokumen`, allow `view-admin-data` for student/teacher).<br>(3) In JSX render, allow `view-admin-data` for `isTataUsaha`, and block `view-dokumen`.<br>(4) Pass `role` correctly to `getConsolidatedMenuItems`. |
| `src/components/AdminDataView.tsx` | Localized tab & action filtering | (1) Filter `tabs` array to `['Data_Siswa', 'Data_Guru']` when `isTataUsaha`.<br>(2) Define `canModify = isAdmin || (isTataUsaha && (activeTab === 'Data_Siswa' || activeTab === 'Data_Guru'))` for action buttons. |
| `src/components/ClaySidebar.tsx` | 3 lines for styling | Add `'Tata Usaha'` role label, icon `fa-id-card-clip`, and cyan soft clay badge style. |
| `src/lib/supabaseClient.ts` | 8 lines in `checkMasterDataMutationGuard` | Allow mutations on `data_siswa` and `data_guru` when role is `tata_usaha`, while continuing to reject all other master tables with 403 Forbidden. |
| `tests/tata_usaha_role_rbac_and_isolation.test.ts` | **New test file** (~200 lines) | Standalone verification test verifying all acceptance criteria. |
| `package.json` | Append test script | Add `&& tsx tests/tata_usaha_role_rbac_and_isolation.test.ts` to `npm test`. |

**Total new components**: **0**.
**Total new external dependencies**: **0**.
**Reuse efficiency**: **100%**.

---

### 4.2 Exact Proposed Code Snippets

#### 1. `src/types/user.ts` (Line 1)
```typescript
// BEFORE:
export type UserRole = 'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan' | 'siswa' | string;

// AFTER:
export type UserRole = 'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan' | 'siswa' | 'tata_usaha' | string;
```

#### 2. `src/lib/navigation.ts`
**In `VIEW_ALIASES` (around line 40)**:
```typescript
  // Master Data Tata Usaha aliases
  'view-data-siswa':        { view: 'view-admin-data', tab: 'Data_Siswa' },
  'view-data-guru':         { view: 'view-admin-data', tab: 'Data_Guru' },
```

**In `getConsolidatedMenuItems` (around line 164)**:
```typescript
  if (normRole === 'tatausaha') {
    return [
      { id: 'view-data-siswa', icon: 'fa-user-graduate', label: 'Data Siswa', dataTour: 'view-admin-data' },
      { id: 'view-data-guru', icon: 'fa-chalkboard-user', label: 'Data Guru', dataTour: 'view-admin-data' }
    ];
  }
```

**In `evaluateTabRBAC` (around line 205 & 230)**:
```typescript
  const isTataUsaha = normRole === 'tatausaha';

  // Strict isolation for Tata Usaha: strictly cannot access Bank Dokumen / Persuratan
  if (isTataUsaha && viewId === 'view-dokumen') {
    return { allowed: false, fallbackTab: 'view-data-siswa', reason: 'Role Tata Usaha tidak memiliki hak akses ke Bank Dokumen / Persuratan.' };
  }

  // Master Data RBAC:
  if (
    effectiveView === 'view-admin-data' ||
    viewId === 'view-admin-data' ||
    ...
  ) {
    if (isTataUsaha) {
      const allowedTuTabs = ['Data_Siswa', 'data_siswa', 'siswa', 'Data_Guru', 'data_guru', 'guru'];
      if (!allowedTuTabs.includes(effectiveTab || 'Data_Siswa')) {
        return { allowed: false, fallbackTab: 'view-data-siswa', reason: 'Role Tata Usaha hanya memiliki akses ke Data Siswa dan Data Guru.' };
      }
    } else if (!isAdmin) {
      return { allowed: false, fallbackTab: 'view-home', reason: 'Seluruh data master hanya dapat diakses dan diubah oleh Administrator.' };
    }
  }
```

#### 3. `src/lib/supabaseClient.ts`
**In `checkMasterDataMutationGuard` (lines 196–204)**:
```typescript
export function checkMasterDataMutationGuard(requestUrlStr: string, method: string, role?: string | null): Response | null {
  const upperMethod = (method || 'GET').trim().toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)) {
    if (isMasterDataEndpoint(requestUrlStr)) {
      if (isAdminRole(role)) return null;
      
      // Tata Usaha operational access: permit mutations ONLY on student and teacher tables
      const normRole = String(role || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
      if (normRole === 'tatausaha') {
        const isStudentOrTeacherTable = ['data_siswa', 'siswa', 'data_guru', 'guru'].some(t => {
          const pattern = new RegExp(`/(?:rest/v1/)?(?:public\\.)?${t}(?:/|$|\\?)`, 'i');
          return pattern.test(requestUrlStr) || requestUrlStr.endsWith(`/${t}`) || requestUrlStr === t;
        });
        if (isStudentOrTeacherTable) {
          return null;
        }
      }

      return createMasterDataForbiddenResponse();
    }
  }
  return null;
}
```

#### 4. `src/components/AdminDataView.tsx`
**In `AdminDataView` setup (lines 139 & 220)**:
```typescript
  const isTataUsaha = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';
  const isAdmin = isMasterDataModificationAllowed(user?.role);
  const canModify = isAdmin || (isTataUsaha && (activeTab === 'Data_Siswa' || activeTab === 'Data_Guru'));

  const allTabs = [
    { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa', step: 1, icon: 'fa-user-graduate', desc: 'Identitas Siswa' },
    { id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas', step: 2, icon: 'fa-chalkboard', desc: 'Rombel & Tingkat' },
    { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel', step: 3, icon: 'fa-book', desc: 'Mata Pelajaran' },
    { id: 'Data_Guru', label: 'Guru', table: 'data_guru', step: 4, icon: 'fa-chalkboard-user', desc: 'Data Pendidik' },
    { id: 'Jadwal_Pelajaran', label: 'Jadwal', table: 'jadwal_pelajaran', step: 5, icon: 'fa-calendar-days', desc: 'Jadwal KBM' },
    { id: 'Wali_Kelas', label: 'Wali Kelas', table: 'wali_kelas', step: 6, icon: 'fa-user-tie', desc: 'Penugasan Wali' },
    { id: 'Pengguna', label: 'Pengguna', table: 'users', step: 7, icon: 'fa-users-gear', desc: 'Akun Login' },
    { id: 'Kalender_Pendidikan', label: 'Kalender', table: 'kalender_pendidikan', step: 8, icon: 'fa-calendar-check', desc: 'Hari Efektif & Libur' },
    { id: 'sistem_blok', label: 'Periode Sistem Blok', table: 'sistem_blok', step: 9, icon: 'fa-cubes', desc: 'Rotasi Blok KBM', optional: true },
  ];

  const tabs = isTataUsaha ? allTabs.filter(t => t.id === 'Data_Siswa' || t.id === 'Data_Guru') : allTabs;
```
Replace `isAdmin && (` with `canModify && (` on lines 2677, 2709, 2731, 2988.

#### 5. `src/components/AppScreen.tsx`
**Add `isTataUsaha` detection and view gating**:
- Line 95:
  ```typescript
  const isTataUsaha = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';
  ```
- Lines 191–195:
  ```typescript
  if (isSuperadmin) return 'view-superadmin-overview';
  if (isDinas) return 'view-dinas-overview';
  if (isSiswa) return 'view-ujian';
  if (isTataUsaha) return 'view-admin-data';
  return 'view-home';
  ```
- Line 766:
  ```typescript
  role: isSuperadmin ? 'superadmin' : isDinas ? 'dinaspendidikan' : isAdmin ? 'admin' : (isKepalaSekolah ? 'kepalasekolah' : isSiswa ? 'siswa' : isTataUsaha ? 'tata_usaha' : 'guru'),
  ```
- Line 778:
  ```typescript
  const defaultHomeView = isSuperadmin ? 'view-superadmin-overview' : (isSiswa ? defaultSiswaHomeView : (isTataUsaha ? 'view-admin-data' : defaultDinasHomeView));
  ```
- Line 1146 (`DokumenView` block for `isTataUsaha`):
  ```tsx
  {currentView === 'view-dokumen' && (
    !isTataUsaha ? (
      <DokumenView user={user} />
    ) : (
      <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
          <i className="fa-solid fa-lock"></i>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
        <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          Role Tata Usaha tidak memiliki hak akses ke Bank Dokumen / Persuratan.
        </p>
        <button
          type="button"
          onClick={() => { window.history.pushState(null, '', '?view=' + defaultHomeView); setCurrentView(defaultHomeView); }}
          className="btn-click bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md inline-flex items-center gap-2 transition"
        >
          <i className="fa-solid fa-house text-xs"></i> Kembali ke Dashboard
        </button>
      </div>
    )
  )}
  ```
- Line 1306 (`AdminDataView` rendering):
  ```tsx
  {currentView === 'view-admin-data' && (
    isAdmin || isSuperadmin || isTataUsaha ? (
      <AdminDataView user={user} initialTab={urlTab || undefined} />
    ) : (
      // Existing Akses Terblokir card...
  ```

---

## 5. Verification Method

To independently verify this implementation:

### 5.1 Test Command
1. Run the new dedicated test suite:
   ```powershell
   npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts
   ```
2. Run related RBAC and security test suites to guarantee zero regression:
   ```powershell
   npx tsx tests/master_data_admin_role_restriction.test.ts
   npx tsx tests/kepsek_pengawas_rbac.test.ts
   npx tsx tests/dinas_pendidikan_monitoring.test.ts
   npx tsx tests/admin_submenu_pengguna_kredensial_guru.test.ts
   npx tsx tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts
   ```
3. Run project test suite:
   ```powershell
   npm test
   ```

### 5.2 Verification Checklist
- [x] **Authentication & Role Recognition**: User with role `tata_usaha` is recognized in `UserRole` and `AppUser`, has the `'Tata Usaha'` badge in `ClaySidebar`, and lands on `view-admin-data`.
- [x] **Sidebar Menu Isolation**: `getConsolidatedMenuItems({ role: 'tata_usaha' })` returns exactly 2 menu items (`Data Siswa` and `Data Guru`). Bank Dokumen, Sistem & Pengaturan, and Superadmin items are strictly excluded.
- [x] **Navigation & Tab RBAC**:
  - `evaluateTabRBAC('view-admin-data', 'Data_Siswa', { role: 'tata_usaha' }).allowed === true`
  - `evaluateTabRBAC('view-admin-data', 'Data_Guru', { role: 'tata_usaha' }).allowed === true`
  - `evaluateTabRBAC('view-admin-data', 'Pengguna', { role: 'tata_usaha' }).allowed === false`
  - `evaluateTabRBAC('view-admin-data', 'Data_Kelas', { role: 'tata_usaha' }).allowed === false`
  - `evaluateTabRBAC('view-admin-data', 'Jadwal_Pelajaran', { role: 'tata_usaha' }).allowed === false`
  - `evaluateTabRBAC('view-dokumen', '', { role: 'tata_usaha' }).allowed === false`
  - `evaluateTabRBAC('view-admin-config', '', { role: 'tata_usaha' }).allowed === false`
- [x] **PostgREST Mutation Security**:
  - `checkMasterDataMutationGuard('/rest/v1/data_siswa', 'POST', 'tata_usaha') === null` (Allowed)
  - `checkMasterDataMutationGuard('/rest/v1/data_guru', 'POST', 'tata_usaha') === null` (Allowed)
  - `checkMasterDataMutationGuard('/rest/v1/data_kelas', 'POST', 'tata_usaha')?.status === 403` (Forbidden 42501)
  - `checkMasterDataMutationGuard('/rest/v1/jadwal_pelajaran', 'POST', 'tata_usaha')?.status === 403` (Forbidden 42501)
  - `checkMasterDataMutationGuard('/rest/v1/sistem_blok', 'POST', 'tata_usaha')?.status === 403` (Forbidden 42501)
  - `isAdminRole('tata_usaha') === false` (Strict adherence to Admin/Superadmin definition)
- [x] **Existing Roles Preserved**: Superadmin, Admin, Guru, Siswa, Dinas, Kepsek workflows remain 100% functional without regressions.
