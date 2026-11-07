# Handoff Report: Navigation, Sidebar, and View Switching for Role 'tata_usaha'

**Agent**: `explorer_tu_2`  
**Date**: 2026-11-07T17:18:00Z  
**Parent Conversation ID**: `08027b32-4cf8-48ae-a2fb-29465f707e8c`  
**Status**: Task Complete (Hard Handoff)  
**Design Philosophy**: `/ponytail` (Simplest, cleanest, most concise reuse of existing architecture without over-engineering)

---

## 1. Observation

### 1.1 Navigation Definitions and Role Filtering (`src/lib/navigation.ts`)

- **MenuItem Interface (`src/lib/navigation.ts:8-14`)**:
  ```typescript
  export interface MenuItem {
    id: string;
    icon: string;
    label: string;
    badge?: string | number;
    badgeVariant?: 'mint' | 'amber' | 'rose' | 'blue';
    dataTour?: string;
    subItems?: MenuItem[];
  }
  ```
- **Route Aliases (`src/lib/navigation.ts:22-41`)**:
  `VIEW_ALIASES` maps friendly or legacy route names to `{ view: string; tab?: string }`.
  Existing entries include:
  ```typescript
  'view-admin-kelas':    { view: 'view-admin-data', tab: 'Data_Kelas' },
  'view-admin-pengguna': { view: 'view-admin-data', tab: 'Pengguna' },
  'view-sistem-blok':    { view: 'view-admin-data', tab: 'blok' },
  'view-admin-backup':   { view: 'view-admin-config', tab: 'backup' }
  ```
  *There are currently no aliases defined for direct navigation to Data Siswa or Data Guru.*
- **Canonical Route Resolver (`src/lib/navigation.ts:54-81`)**:
  `resolveCanonicalRoute(rawView, rawTab)` maps aliases into `{ canonicalView, defaultTab, isLegacyAlias }`. If rawView is empty, it returns `canonicalView: 'view-home'`.
- **Role Menu Generator (`src/lib/navigation.ts:85-191`)**:
  `getConsolidatedMenuItems(params)` normalizes the role string:
  ```typescript
  const normRole = (params.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  ```
  It has dedicated branches for `isSuperadmin` (lines 98-118), `isDinas` (lines 120-132), `isKepsek` (lines 134-144), `isAdmin` (lines 146-163), and `normRole === 'siswa'` (lines 165-170).
  *Critical observation*: Any role not explicitly captured falls through to the **Guru** menu list (lines 173-190). Consequently, any user with `role: 'tata_usaha'` currently inherits Guru menu items: `view-home`, `view-guru-presensi`, `view-guru-jurnal`, `view-dokumen`, `view-gradebook`, `view-informasi`.
- **Role-Based Tab Authorization (`src/lib/navigation.ts:193-260`)**:
  `evaluateTabRBAC(viewId, tabId, user)`:
  - Lines 206-209: Strictly confines role `siswa` to `view-ujian` and `view-informasi`.
  - Lines 226-251: Strictly isolates `view-admin-data` and related views:
    ```typescript
    if (
      effectiveView === 'view-admin-data' ||
      viewId === 'view-admin-data' ||
      viewId === 'view-sistem-blok' || ...
    ) {
      if (!isAdmin) {
        return { allowed: false, fallbackTab: 'view-home', reason: 'Seluruh data master hanya dapat diakses dan diubah oleh Administrator.' };
      }
    }
    ```
    *Critical observation*: Line 248 blocks any user where `isAdmin` is false from accessing `view-admin-data`. Tata Usaha cannot currently access `view-admin-data` via this function.

---

### 1.2 Sidebar Drawer and Navigation Controller (`src/components/AppScreen.tsx`)

- **Role Flags Computation (`src/components/AppScreen.tsx:90-95`)**:
  ```typescript
  const baseUser = currentUser || initialUser;
  const isSuperadmin = (baseUser?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
  const isDinas = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'dinaspendidikan';
  const isAdmin = isSuperadmin || (baseUser?.role || '').toLowerCase() === 'admin';
  const isSiswa = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'siswa';
  ```
  `isTataUsaha` is not currently defined.
- **Initial View Resolution (`src/components/AppScreen.tsx:173-195`)**:
  Specialized roles land on their dedicated workspace:
  ```typescript
  if (isSuperadmin) return 'view-superadmin-overview';
  if (isDinas) return 'view-dinas-overview';
  if (isSiswa) return 'view-ujian';
  return 'view-home';
  ```
- **Popstate / Browser History Listener (`src/components/AppScreen.tsx:211-237`)**:
  When history pops to root without view parameter, it falls back:
  ```typescript
  const defaultDinasPopView = isDinas ? 'view-dinas-overview' : 'view-home';
  const defaultSiswaPopView = isSiswa ? 'view-ujian' : 'view-home';
  setCurrentView(isSuperadmin ? 'view-superadmin-overview' : (isSiswa ? defaultSiswaPopView : defaultDinasPopView));
  ```
- **Onboarding Tutorial Trigger (`src/components/AppScreen.tsx:241-255`)**:
  ```typescript
  if (!isSuperadmin) {
    if (isAdmin) {
      if (localStorage.getItem(STORAGE_KEY_ADMIN) !== 'true') setTourOpen(true);
    } else {
      if (localStorage.getItem(STORAGE_KEY_GURU) !== 'true') setTourOpen(true);
    }
  }
  ```
  Non-admin users trigger the Guru onboarding tutorial (`STORAGE_KEY_GURU`).
- **Navigation Guard in `handleNavigation` (`src/components/AppScreen.tsx:477-670`)**:
  - Lines 480-490: Admin / Superadmin bypass guru checks.
  - Lines 493-531: Dinas role whitelist guard (`view-dinas-overview`, `view-admin-rekap`, `view-rekap-guru`, `view-rekap-siswa`, `view-jurnal-kelas`, `view-informasi`).
  - Lines 608-618: Master data and config guard:
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
    *Critical observation*: Line 608 explicitly blocks non-admins from `view-admin-data`.
  - Line 621: Defense-in-depth sub-tab RBAC check calling `evaluateTabRBAC`.
- **Sidebar User Identity Card (`src/components/AppScreen.tsx:887-926`)**:
  Badge style, icon, and label are resolved via nested ternary:
  ```typescript
  isSuperadmin ? 'Superadmin' : isDinas ? 'Dinas Pendidikan' : isAdmin ? 'Administrator' : isKepalaSekolah ? 'Kepala Sekolah' : isWaliKelas ? 'Guru (Wali Kelas)' : 'Guru'
  ```
  Icon resolves to `fa-chalkboard-user` for all other roles.
- **Sidebar Menu Loop (`src/components/AppScreen.tsx:968-985`)**:
  Loops over `consolidatedMenuItems` with mandatory invariant comment:
  `{/* AST preservation: data-tour={item.id} */}`.
- **View Render Guards in JSX (`src/components/AppScreen.tsx:1060-1420`)**:
  - `view-dokumen` (`src/components/AppScreen.tsx:1146`): Renders `<DokumenView user={user} />` without role restrictions.
  - `view-admin-data` (`src/components/AppScreen.tsx:1306-1327`):
    ```tsx
    {currentView === 'view-admin-data' && (
      isAdmin || isSuperadmin ? (
        <AdminDataView user={user} initialTab={urlTab || undefined} />
      ) : (
        <div className="glass-card ...">Akses Terblokir ...</div>
      )
    )}
    ```
  - `view-admin-backup`, `view-admin-config`, `view-sistem-blok`, `view-analitik`, `view-superadmin-*`: Strictly guarded with `<div className="glass-card ...">Akses Terblokir</div>`.

---

### 1.3 Standalone Sidebar Component (`src/components/ClaySidebar.tsx`)

- Reusable claymorphic sidebar component exported via `src/components/clay/index.ts`.
- Lines 67-100: Computes `roleBadgeStyle`, `roleLabel`, and `roleIcon` with similar ternary structures as `AppScreen.tsx`.
- Line 213: Preserves `{/* AST preservation: data-tour={item.id} */}`.
- Lines 218-250: Renders menu items passed via `menuItems: MenuItem[]`.

---

### 1.4 Master Data Component (`src/components/AdminDataView.tsx`)

- Unified view managing all school master data.
- **Tab Normalization (`src/components/AdminDataView.tsx:40-53`)**:
  `normalizeAdminTab(tab)` converts aliases:
  `data_siswa`, `siswa`, `students` -> `'Data_Siswa'`; `data_guru`, `guru`, `teachers` -> `'Data_Guru'`.
- **Modification Guard (`src/components/AdminDataView.tsx:139`)**:
  ```typescript
  const isAdmin = isMasterDataModificationAllowed(user?.role);
  ```
  `isMasterDataModificationAllowed` in `src/lib/dataIntegrityGuard.ts:533` checks:
  `norm === 'admin' || norm === 'superadmin' || norm === 'servicerole'`.
- **Tabs Pipeline Array (`src/components/AdminDataView.tsx:220-230`)**:
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
- **Tab Rendering (`src/components/AdminDataView.tsx:2509, 2583`)**:
  Both the stepper pipeline and tab buttons map directly over the `tabs` array.
- **Operations Guarded by `isAdmin` in `AdminDataView.tsx`**:
  - CSV file upload / import (line 673)
  - Tambah Data / add record modal (line 883)
  - Edit record modal (line 1657)
  - Delete record modal (line 2182)
  - UI action buttons: Tambah, Naik Kelas, Edit, Hapus (lines 2677, 2709, 2731, 2988)

---

### 1.5 Home & Landing Views (`src/components/HomeView.tsx`, `HomeViewGuru.tsx`, `HomeViewAdmin.tsx`)

- `src/components/HomeView.tsx:22-26`:
  ```typescript
  const role = (user?.role || '').toLowerCase().replace(/\s+/g, '');
  const isSuperadmin = role === 'superadmin';
  const isAdmin = isSuperadmin || role === 'admin';
  const isGuru = !isAdmin;
  ```
  If `isGuru` is true, it renders `HomeViewGuru`. If false, `HomeViewAdmin`.
- `HomeViewGuru.tsx`: 1,164 lines focused entirely on teacher KBM activities, GPS presensi, lesson schedules, and journal inputs. Irrelevant for administrative staff (Tata Usaha).
- `HomeViewAdmin.tsx`: 1,028 lines focused on monitoring teacher attendance matrix, teaching journal completeness, and school operational alerts. Contains buttons to access admin-only features (`view-sistem-blok`).
- Pattern for specialized non-teacher roles:
  - `superadmin`: Lands on `view-superadmin-overview` (no HomeView).
  - `dinaspendidikan`: Lands on `view-dinas-overview` (no HomeView).
  - `siswa`: Lands on `view-ujian` (no HomeView).

---

### 1.6 User Types Contract (`src/types/user.ts`)

- Line 1:
  ```typescript
  export type UserRole = 'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan' | 'siswa' | string;
  ```
- Line 7:
  ```typescript
  role: 'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan' | 'siswa' | string;
  ```

---

## 2. Logic Chain

1. **Premise 1 (R1 & Acceptance Criteria)**: The system must support the `tata_usaha` role across authentication, authorization, and UI routing.
2. **Premise 2 (R2 - Scope of Access)**: Role Tata Usaha must have operational access **strictly and exclusively** to Data Siswa and Data Guru. They must be completely barred from Bank Dokumen / Persuratan (`view-dokumen`), system configuration (`view-admin-config`, `view-admin-backup`, `view-sistem-blok`), and superadmin accounts (`view-superadmin-*`).
3. **Premise 3 (R3 - /ponytail Simplicity & Code Reuse)**:
   - `AdminDataView.tsx` already contains complete, battle-tested CRUD interfaces for both Data Siswa (student table, search, pagination, add/edit/delete, CSV import/export, student QR generation, and Naik Kelas modal) and Data Guru (teacher table, search, pagination, add/edit/delete, CSV import/export).
   - Creating a separate view component for Tata Usaha would duplicate ~3,000 lines of complex data tables and validation logic.
   - Therefore, the simplest, cleanest solution is to **reuse `AdminDataView` directly**, filtering its `tabs` array when the current user has the `tata_usaha` role so that only `Data_Siswa` and `Data_Guru` are rendered.
4. **Premise 4 (Navigation & Sidebar Menu Items)**:
   - In `src/lib/navigation.ts`, when `normRole === 'tatausaha'`, `getConsolidatedMenuItems` should return exactly two operational items:
     1. `{ id: 'view-data-siswa', icon: 'fa-user-graduate', label: 'Data Siswa' }`
     2. `{ id: 'view-data-guru', icon: 'fa-chalkboard-user', label: 'Data Guru' }`
   - In `VIEW_ALIASES`, register aliases:
     - `'view-data-siswa'`: `{ view: 'view-admin-data', tab: 'Data_Siswa' }`
     - `'view-siswa'`: `{ view: 'view-admin-data', tab: 'Data_Siswa' }`
     - `'view-data-guru'`: `{ view: 'view-admin-data', tab: 'Data_Guru' }`
     - `'view-guru'`: `{ view: 'view-admin-data', tab: 'Data_Guru' }`
   - This satisfies the acceptance criterion: *"Menu navigasi untuk role tata_usaha hanya menampilkan akses operasional ke Data Siswa dan Data Guru (tanpa Bank Dokumen / Persuratan)"* with exact compliance to Miller's Law (2 items <= 7).
5. **Premise 5 (Landing / Home View Design)**:
   - Specialized roles in SIPJAM do not use a redundant generic home view: Superadmin lands on `view-superadmin-overview`, Dinas lands on `view-dinas-overview`, Siswa lands on `view-ujian`.
   - Following this established architectural pattern, the default landing view for `tata_usaha` should be `view-admin-data` (defaulting to tab `Data_Siswa`).
   - If a Tata Usaha user manually navigates to `view-home`, `HomeView.tsx` should gracefully redirect them to `view-admin-data` or display a minimal claymorphic launcher card with links to Data Siswa and Data Guru.
   - This achieves zero code redundancy, instant productivity, and complete consistency with the codebase.
6. **Premise 6 (Defense-in-Depth RBAC & URL Protection)**:
   - In `evaluateTabRBAC` (`src/lib/navigation.ts`):
     - For `normRole === 'tatausaha'`: Allow `view-admin-data` ONLY when tab is `Data_Siswa` or `Data_Guru` (or their aliases). Deny all other tabs (`Pengguna`, `Data_Kelas`, `Data_Mapel`, `Jadwal_Pelajaran`, `Wali_Kelas`, `Kalender_Pendidikan`, `sistem_blok`).
     - Deny all other view modules (`view-dokumen`, `view-admin-config`, `view-admin-backup`, `view-admin-verif`, `view-admin-rekap`, `view-piket`, `view-guru-presensi`, `view-guru-jurnal`, `view-gradebook`, `view-rapor`, `view-superadmin-*`).
   - In `handleNavigation` (`src/components/AppScreen.tsx`):
     - Intercept `isTataUsaha` navigation: allow only `view-admin-data` (and `view-home`). Block any attempt to navigate to `view-dokumen`, `view-admin-config`, etc., with a SweetAlert message.
   - In `AppScreen.tsx` JSX view rendering:
     - `view-dokumen`: Guard so it is not rendered for `isTataUsaha`.
     - `view-admin-data`: Guard updated to `isAdmin || isSuperadmin || isTataUsaha`.

---

## 3. Caveats

1. **AST Preservation Invariant**:
   - Automated tests (`tests/adversarial_m3_coldstart_rbac_popstate_challenger.test.ts:360-361` and `tests/adversarial_m3_challenger_2_geometry_and_invariants.test.ts:54-60`) enforce static code assertions that `AppScreen.tsx` and `ClaySidebar.tsx` must preserve the exact comment:
     `{/* AST preservation: data-tour={item.id} */}`.
   - Any modifications to the menu loop in those files must keep this comment untouched.
2. **Onboarding Tutorial Key**:
   - `AppScreen.tsx` automatically launches `OnboardingTutorial` when `localStorage` keys are absent. For non-admin roles, it checks `STORAGE_KEY_GURU`. To prevent Tata Usaha from being presented with the Guru onboarding tour (which targets teacher buttons not present in TU's sidebar), `isTataUsaha` must be excluded from auto-opening the tour.
3. **Data Integrity Guard (`src/lib/dataIntegrityGuard.ts`)**:
   - `AdminDataView.tsx` calls `isMasterDataModificationAllowed(user?.role)` to authorize add/edit/delete operations.
   - Either `isMasterDataModificationAllowed` in `dataIntegrityGuard.ts` must recognize `tata_usaha` for student and teacher tables, OR `AdminDataView.tsx` should compute:
     `const canManage = isMasterAdmin || (isTataUsaha && (activeTab === 'Data_Siswa' || activeTab === 'Data_Guru'))`.
   - Both layers should align to maintain defense-in-depth without regressions on other roles.
4. **Scope Isolation**:
   - Tata Usaha accounts are school-scoped (`sekolah_id`). When fetching and modifying `data_siswa` and `data_guru`, queries must strictly include `.eq('sekolah_id', user.sekolah_id)` (which `AdminDataView` already does by default).

---

## 4. Conclusion

Adding the `tata_usaha` role can be achieved cleanly, minimally, and with zero architectural bloat by reusing `AdminDataView` and updating the navigation configuration.

### Summary of Targeted Changes:

| File | Lines (approx) | Action / Description |
|---|---|---|
| `src/types/user.ts` | 1, 7 | Add `'tata_usaha'` to `UserRole` and `AppUser.role` union types. |
| `src/lib/navigation.ts` | 22-41 | Add aliases: `'view-data-siswa'`, `'view-siswa'`, `'view-data-guru'`, `'view-guru'` mapped to `view-admin-data` with `Data_Siswa` / `Data_Guru`. |
| `src/lib/navigation.ts` | 85-191 | In `getConsolidatedMenuItems`, add branch for `normRole === 'tatausaha'` returning 2 items: Data Siswa (`fa-user-graduate`) and Data Guru (`fa-chalkboard-user`). |
| `src/lib/navigation.ts` | 193-260 | In `evaluateTabRBAC`, permit `normRole === 'tatausaha'` on `view-admin-data` strictly for `Data_Siswa` and `Data_Guru`; deny all other views and tabs. |
| `src/components/AppScreen.tsx` | 90-95 | Define `const isTataUsaha = (baseUser?.role \|\| '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';`. |
| `src/components/AppScreen.tsx` | 191-195 | In initial view resolution, add `if (isTataUsaha) return 'view-admin-data';`. |
| `src/components/AppScreen.tsx` | 230-233 | In popstate fallback, set default view for `isTataUsaha` to `'view-admin-data'`. |
| `src/components/AppScreen.tsx` | 243-250 | Guard `setTourOpen(true)` so it does not trigger Guru onboarding tour for `isTataUsaha`. |
| `src/components/AppScreen.tsx` | 477-532 | In `handleNavigation`, add a dedicated guard for `isTataUsaha` allowing only `view-admin-data` (with `Data_Siswa` / `Data_Guru`) and blocking other views. |
| `src/components/AppScreen.tsx` | 608-618 | Update master data navigation block so `isTataUsaha` can access `view-admin-data`. |
| `src/components/AppScreen.tsx` | 765-771 | Pass `role: isSuperadmin ? 'superadmin' : isDinas ? 'dinaspendidikan' : isAdmin ? 'admin' : isTataUsaha ? 'tata_usaha' : ...` to `getConsolidatedMenuItems`. |
| `src/components/AppScreen.tsx` | 776-778 | Set `defaultHomeView` for `isTataUsaha` to `'view-admin-data'`. |
| `src/components/AppScreen.tsx` | 897-912 | Add user identity badge for `isTataUsaha`: cyan/teal pill, label `'Tata Usaha'`, icon `'fa-clipboard-user'`. |
| `src/components/AppScreen.tsx` | 1146 | Guard `view-dokumen` so `isTataUsaha` is denied access. |
| `src/components/AppScreen.tsx` | 1307 | Update `view-admin-data` render condition to `isAdmin \|\| isSuperadmin \|\| isTataUsaha`. |
| `src/components/ClaySidebar.tsx` | 67-100 | Add `roleBadgeStyle`, `roleLabel: 'Tata Usaha'`, and `roleIcon: 'fa-clipboard-user'` for `tata_usaha`. |
| `src/components/AdminDataView.tsx` | 86-93 | On mount, normalize `activeTab` so `isTataUsaha` falls back to `'Data_Siswa'` if an unauthorized tab is provided. |
| `src/components/AdminDataView.tsx` | 139 | Compute permission flag allowing `isTataUsaha` full CRUD on `Data_Siswa` and `Data_Guru`. |
| `src/components/AdminDataView.tsx` | 220-230 | Filter `tabs` array to only `Data_Siswa` and `Data_Guru` when `isTataUsaha`. |
| `src/components/AdminDataView.tsx` | 232-242 | In `handleSwitchTab`, reject switching to tabs other than `Data_Siswa` and `Data_Guru` for `isTataUsaha`. |
| `src/components/HomeView.tsx` | 22-47 | Handle `tata_usaha` by redirecting to `view-admin-data` or displaying a concise 2-button launcher. |

---

## 5. Verification Method

### Independent Verification Steps:

1. **Unit & Contract Verification via Vitest / tsx**:
   - Create a dedicated test file `tests/tata_usaha_navigation_rbac.test.ts` verifying:
     - `getConsolidatedMenuItems({ role: 'tata_usaha' })` returns exactly 2 items: `view-data-siswa` and `view-data-guru`.
     - `getConsolidatedMenuItems` does not return `view-dokumen`, `view-admin-config`, `view-guru-presensi`, or `view-superadmin-*` for `tata_usaha`.
     - `resolveCanonicalRoute('view-data-siswa')` resolves to `{ canonicalView: 'view-admin-data', defaultTab: 'Data_Siswa' }`.
     - `resolveCanonicalRoute('view-data-guru')` resolves to `{ canonicalView: 'view-admin-data', defaultTab: 'Data_Guru' }`.
     - `evaluateTabRBAC('view-admin-data', 'Data_Siswa', { role: 'tata_usaha' })` returns `{ allowed: true }`.
     - `evaluateTabRBAC('view-admin-data', 'Data_Guru', { role: 'tata_usaha' })` returns `{ allowed: true }`.
     - `evaluateTabRBAC('view-admin-data', 'Pengguna', { role: 'tata_usaha' })` returns `{ allowed: false }`.
     - `evaluateTabRBAC('view-admin-data', 'Data_Kelas', { role: 'tata_usaha' })` returns `{ allowed: false }`.
     - `evaluateTabRBAC('view-dokumen', '', { role: 'tata_usaha' })` returns `{ allowed: false }`.
     - `evaluateTabRBAC('view-admin-config', '', { role: 'tata_usaha' })` returns `{ allowed: false }`.
   - Run command:
     ```bash
     npx tsx tests/tata_usaha_navigation_rbac.test.ts
     ```

2. **Full Regression Test Suite Run**:
   - Run the complete project test suite to verify zero regressions on existing roles (`superadmin`, `admin`, `guru`, `dinas_pendidikan`, `siswa`):
     ```bash
     npm test
     ```

3. **AST Invariant Check**:
   - Inspect `src/components/AppScreen.tsx` and `src/components/ClaySidebar.tsx` to confirm that:
     ```tsx
     {/* AST preservation: data-tour={item.id} */}
     ```
     is preserved verbatim on the menu buttons.

4. **Invalidation Conditions**:
   - If `getConsolidatedMenuItems({ role: 'tata_usaha' })` includes `view-dokumen` or `view-admin-config`, the implementation is invalid.
   - If a `tata_usaha` user can view or switch to the `Pengguna` (Users) tab, the implementation is invalid.
   - If existing tests for `admin`, `guru`, or `dinaspendidikan` fail during `npm test`, the implementation is invalid.
