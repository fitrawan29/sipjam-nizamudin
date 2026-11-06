# Handoff Report: Navigation, Tab Registration, and Route Aliasing Architecture for Milestone 1

**Agent**: `explorer_m1_2`  
**Milestone**: Milestone 1 (Sub Menu Kelas & Pemusatan Penentuan Kelas Siswa)  
**Date**: 2026-11-06  
**Status**: COMPLETE (Investigation & Integration Blueprint)  

---

## 1. Observation

Direct code examination across the active workspace revealed the following exact baseline implementations:

### 1.1 `src/components/AdminDataView.tsx`
- **Tabs Array (lines 117–126)**:
  ```typescript
  const tabs = [
    { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa' },
    { id: 'Data_Guru', label: 'Guru', table: 'data_guru' },
    { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel' },
    { id: 'Kalender_Pendidikan', label: 'Kalender', table: 'kalender_pendidikan' },
    { id: 'Jadwal_Pelajaran', label: 'Jadwal', table: 'jadwal_pelajaran' },
    { id: 'sistem_blok', label: 'Periode Sistem Blok', table: 'sistem_blok' },
    { id: 'Wali_Kelas', label: 'Wali Kelas', table: 'wali_kelas' },
    { id: 'Pengguna', label: 'Pengguna', table: 'users' },
  ];
  ```
  `Data_Kelas` (`Kelas`) is currently absent from this array.

- **Initial Tab State & Normalization (lines 41–58)**:
  ```typescript
  export interface AdminDataViewProps {
    user: any;
    initialTab?: string;
  }

  export default function AdminDataView({ user, initialTab }: AdminDataViewProps) {
    const [activeTab, setActiveTab] = useState(() => {
      if (initialTab === 'blok' || initialTab === 'sistem_blok') return 'sistem_blok';
      if (initialTab === 'Pengguna' || initialTab === 'pengguna' || initialTab === 'users') return 'Pengguna';
      return initialTab || 'Data_Siswa';
    });

    useEffect(() => {
      if (initialTab) {
        if (initialTab === 'blok' || initialTab === 'sistem_blok') {
          setActiveTab('sistem_blok');
        } else if (initialTab === 'Pengguna' || initialTab === 'pengguna' || initialTab === 'users') {
          setActiveTab('Pengguna');
        } else {
          setActiveTab(initialTab);
        }
      }
    }, [initialTab]);
  ```
  Aliases for `Data_Kelas` (`data_kelas`, `Kelas`, `kelas`) are not normalized, falling through to raw assignment.

- **Data Fetch Short-Circuit in `loadData` (lines 128–132)**:
  ```typescript
  const loadData = useCallback(async () => {
    if (activeTab === 'sistem_blok' || activeTab === 'blok' || activeTab === 'Pengguna') return;
    const tabObj = tabs.find(t => t.id === activeTab);
    if (!tabObj) return;
  ```
  When an active tab is a modular sub-view (`sistem_blok`, `Pengguna`), `loadData` short-circuits immediately. If `Data_Kelas` is active without short-circuiting, `loadData` would attempt a generic Supabase query on `data_kelas` which is redundant and can trigger RLS/PGRST errors.

- **Modular Sub-View Rendering & Generic Table Branch (lines 1926–1935)**:
  ```tsx
  {(activeTab === 'sistem_blok' || activeTab === 'blok') ? (
    <div className="mt-2">
      <SistemBlokView user={user} />
    </div>
  ) : activeTab === 'Pengguna' ? (
    <div className="mt-2">
      <AdminPenggunaView user={user} />
    </div>
  ) : (
    <>
      {/* ERROR MESSAGE, DEBUG INFO, Impor & Kelola Data, SEARCH, FILTERS, DATA TABLE, PAGINATION */}
    </>
  )}
  ```
  Modular views (`SistemBlokView` and `AdminPenggunaView`) are mounted inside the top-level ternary. When active, they completely bypass the generic table view, search inputs, and filter dropdowns.

### 1.2 `src/lib/navigation.ts`
- **Route Aliases (lines 22–39)**:
  `VIEW_ALIASES` defines canonical route resolutions for legacy views across 5 feature clusters. `view-admin-kelas` and `view-kelas` are not yet registered.
- **Sidebar Tour Aliases (lines 43–50)**:
  `SIDEBAR_TOUR_ALIASES['view-admin-data']` maps to `'view-sistem-blok view-admin-pengguna view-pengguna'`, omitting class-related aliases.
- **Consolidated Menu Generator (lines 88–153)**:
  `getConsolidatedMenuItems` returns 9 items for Admin (`view-admin-data` has `dataTour: 'view-admin-data view-sistem-blok'`).
- **Tab RBAC Evaluator (lines 183–240)**:
  `evaluateTabRBAC` intercepts Cluster 5 routes and verifies `isAdmin`. It checks `effectiveView === 'view-admin-data'`, `view-sistem-blok`, `view-admin-pengguna`, `view-pengguna`, `view-admin-users`.

### 1.3 `src/components/AppScreen.tsx`
- **URL Parameter Extraction (lines 173–209)**:
  `currentView` and `urlTab` are initialized using `resolveCanonicalRoute(rawView, rawTab)`.
- **PopState Navigation (lines 212–237)**:
  Browser forward/back triggers `resolveCanonicalRoute` and updates `urlTab` state.
- **Imperative Navigation `handleNavigation` (lines 500–677)**:
  * Lines 500–520: `blockedMutationViews` bars Dinas from mutation pages.
  * Lines 608–618: Direct view check bars non-admin users from admin configuration and data views.
  * Line 621: Invokes `evaluateTabRBAC(targetId, targetTab, { role, isWaliKelas })`.
  * Lines 665–672: Canonical resolution sets `currentView` and `urlTab`.
- **View Router Rendering (lines 1306–1327)**:
  `{currentView === 'view-admin-data' && (isAdmin || isSuperadmin ? <AdminDataView user={user} initialTab={urlTab || undefined} /> : <LockedAccessCard />)}`.
  `urlTab` is passed cleanly into `AdminDataView`.

---

## 2. Logic Chain

From these direct observations, the complete integration architecture for Navigation, Tab Registration, and Route Aliasing follows this step-by-step logic:

1. **Sub Menu Placement (Observation 1.1)**:
   In educational management systems, Classes (`Kelas`) are the foundational containers for Students (`Siswa`). ORIGINAL_REQUEST.md explicitly itemizes the master entities starting with: *"Menyelaraskan seluruh template master data (Kelas, Siswa, Guru, Mapel, Kalender Pendidikan, Jadwal Pelajaran, Wali Kelas)"*.
   Inserting `{ id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas' }` at **index 0** (before `Data_Siswa`) places `Kelas` in its natural leading position in the tab bar. Furthermore, because line 45 defaults `activeTab` to `initialTab || 'Data_Siswa'`, inserting at index 0 **does NOT alter the default tab** when users navigate to `/admin-data` without a tab query parameter.

2. **Case and Alias Normalization (Observation 1.1)**:
   Users and external links may access the class sub-menu via query parameters such as `?tab=Data_Kelas`, `?tab=data_kelas`, `?tab=Kelas`, or `?tab=kelas`. 
   Introducing a helper `normalizeAdminTab`:
   ```typescript
   function normalizeAdminTab(tab?: string): string {
     if (!tab) return 'Data_Siswa';
     const clean = tab.trim().toLowerCase();
     if (clean === 'blok' || clean === 'sistem_blok') return 'sistem_blok';
     if (clean === 'pengguna' || clean === 'users') return 'Pengguna';
     if (clean === 'data_kelas' || clean === 'kelas') return 'Data_Kelas';
     return tab;
   }
   ```
   guarantees that all case variants cleanly normalize to `'Data_Kelas'` in both `useState` initialization and `useEffect([initialTab])`.

3. **Data Fetching Short-Circuit (Observation 1.1)**:
   `AdminKelasView` provides its own query and mutation engine (querying `data_siswa`, `wali_kelas`, and optionally `data_kelas` with tenant scoping). Therefore, `loadData` in `AdminDataView.tsx` MUST return early when `activeTab === 'Data_Kelas'`:
   ```typescript
   if (activeTab === 'sistem_blok' || activeTab === 'blok' || activeTab === 'Pengguna' || activeTab === 'Data_Kelas') return;
   ```
   This prevents redundant network roundtrips, prevents console errors if `public.data_kelas` table cache is cold, and preserves pristine component isolation.

4. **Modular View Rendering & Control Isolation (Observation 1.1)**:
   By chaining `activeTab === 'Data_Kelas'` into the existing modular view ternary:
   ```tsx
   {(activeTab === 'sistem_blok' || activeTab === 'blok') ? (
     <div className="mt-2">
       <SistemBlokView user={user} />
     </div>
   ) : activeTab === 'Pengguna' ? (
     <div className="mt-2">
       <AdminPenggunaView user={user} />
     </div>
   ) : activeTab === 'Data_Kelas' ? (
     <div className="mt-2">
       <AdminKelasView user={user} />
     </div>
   ) : (
     <>
       {/* Generic Master Data Table, Search, Filters, CSV Controls */}
     </>
   )}
   ```
   - The top tab strip (`tabs.map(...)`) remains visible, horizontally scrollable, and interactive.
   - The generic table search, filters (`filterKelas`, `filterStatus`, `filterMapel`), raw table rows, and pagination are conditionally excluded without any additional JSX conditionals, because they reside in the fallback branch of the ternary.
   - `AdminKelasView` renders its own dedicated search input, class cards, student allocation tables, and action modals.

5. **Route Aliasing & Canonical Resolution (Observation 1.2)**:
   Registering in `VIEW_ALIASES`:
   ```typescript
   'view-admin-kelas': { view: 'view-admin-data', tab: 'Data_Kelas' },
   'view-kelas':       { view: 'view-admin-data', tab: 'Data_Kelas' },
   ```
   causes `resolveCanonicalRoute('view-admin-kelas')` and `resolveCanonicalRoute('view-kelas')` to return `{ canonicalView: 'view-admin-data', defaultTab: 'Data_Kelas', isLegacyAlias: true }`.
   When `isLegacyAlias` is true, `AppScreen.tsx` automatically calls `window.history.replaceState` to normalize the browser URL to `?view=view-admin-data&tab=Data_Kelas`.

6. **Defense-in-Depth RBAC Protection (Observations 1.2 & 1.3)**:
   To ensure non-admin roles (Guru, Siswa, Dinas, Kepsek) are strictly barred:
   - **`navigation.ts` `evaluateTabRBAC`**: Since `effectiveView === 'view-admin-data'`, `evaluateTabRBAC` checks `if (!isAdmin) return { allowed: false, fallbackTab: 'view-home' }`. Adding explicit aliases `view-admin-kelas` and `view-kelas` reinforces this gate.
   - **`AppScreen.tsx` `handleNavigation`**: Adding `'view-admin-kelas'` and `'view-kelas'` to `blockedMutationViews` (line 500) prevents Dinas users from accessing it. Adding them to line 608 immediately raises the SweetAlert2 "Akses Ditolak" modal for Guru/Siswa/Kepsek.
   - **`AppScreen.tsx` View Router Guard (lines 1306–1327)**: `currentView === 'view-admin-data'` requires `isAdmin || isSuperadmin`. Unauthorized users see the Red Lock Card and `AdminDataView` is never mounted.

7. **Tour and Backward Compatibility (Observation 1.2)**:
   Updating `SIDEBAR_TOUR_ALIASES['view-admin-data']` and adding `'view-admin-kelas'` to `dataTour` preserves zero regressions for compound tour selectors (`[data-tour~="..."]`) in Onboarding Tutorial without adding any new top-level sidebar items (strictly preserving Miller's Law Zero-Scroll geometry).

---

## 3. Caveats

1. **`AdminKelasView.tsx` Dependency**:
   `AdminDataView.tsx` will import `AdminKelasView` from `./AdminKelasView`. If `AdminKelasView.tsx` has not yet been authored by the builder agent, static typecheck will fail. The builder agent must ensure `src/components/AdminKelasView.tsx` is created before or concurrently with `AdminDataView.tsx`.
2. **Milestone 2 CSV Templates**:
   While `Data_Kelas` tab registration is part of Milestone 1, the full CSV download and upload pipeline (`Template_Data_Kelas.csv` and `dataIntegrityGuard.ts` parsing) is scoped to Milestone 2. However, ensuring `loadData` short-circuits in Milestone 1 prevents any premature errors when clicking the `Kelas` tab before Milestone 2 CSV hooks are connected.
3. **Existing Test Invariant Preservation**:
   Existing tests (such as `tests/adversarial_m3_challenger_2_geometry_and_invariants.test.ts` and `tests/master_data_admin_role_restriction.test.ts`) assert exact string patterns and AST structures in `AppScreen.tsx`. All edits to `AppScreen.tsx` must strictly preserve existing comments and structure (e.g. `{/* AST preservation: data-tour={item.id} */}`).

---

## 4. Conclusion & Concrete Code Diff Blueprint

The architecture is clean, highly modular, and 100% backward-compatible. Below are the exact diff blueprints ready for implementation:

### 4.1 Changes to `src/lib/navigation.ts`

```diff
--- a/src/lib/navigation.ts
+++ b/src/lib/navigation.ts
@@ -35,6 +35,8 @@ export const VIEW_ALIASES: Record<string, { view: string; tab?: string }> = {
   'view-admin-pengguna':    { view: 'view-admin-data', tab: 'Pengguna' },
   'view-pengguna':          { view: 'view-admin-data', tab: 'Pengguna' },
   'view-admin-users':       { view: 'view-admin-data', tab: 'Pengguna' },
+  'view-admin-kelas':       { view: 'view-admin-data', tab: 'Data_Kelas' },
+  'view-kelas':             { view: 'view-admin-data', tab: 'Data_Kelas' },
   'view-admin-backup':      { view: 'view-admin-config', tab: 'backup' }
 };
 
@@ -45,7 +47,7 @@ export const SIDEBAR_TOUR_ALIASES: Record<string, string> = {
   'view-guru-presensi': 'view-history',
   'view-gradebook': 'view-rapor',
   'view-admin-rekap': 'view-analitik view-rekap-guru',
-  'view-admin-data': 'view-sistem-blok view-admin-pengguna view-pengguna',
+  'view-admin-data': 'view-sistem-blok view-admin-pengguna view-pengguna view-admin-kelas view-kelas',
   'view-admin-config': 'view-admin-backup'
 };
 
@@ -92,7 +94,7 @@ export function getConsolidatedMenuItems(params: {
           id: 'view-admin-data',
           icon: 'fa-database',
           label: 'Master Data & Kalender',
-          dataTour: 'view-admin-data view-sistem-blok'
+          dataTour: 'view-admin-data view-sistem-blok view-admin-kelas'
         },
         { id: 'view-admin-verif', icon: 'fa-clipboard-check', label: 'Pusat Verifikasi' },
         { id: 'view-admin-rekap', icon: 'fa-chart-pie', label: 'Laporan & Analitik', dataTour: 'view-admin-rekap view-analitik' },
@@ -146,7 +148,7 @@ export function getConsolidatedMenuItems(params: {
         id: 'view-admin-data',
         icon: 'fa-database',
         label: 'Master Data & Kalender',
-        dataTour: 'view-admin-data view-sistem-blok'
+        dataTour: 'view-admin-data view-sistem-blok view-admin-kelas'
       },
       { id: 'view-admin-config', icon: 'fa-gear', label: 'Pengaturan Sistem & Database', dataTour: 'view-admin-config view-admin-backup' }
     ];
@@ -224,6 +226,14 @@ export function evaluateTabRBAC(
     viewId === 'view-pengguna' ||
     viewId === 'view-admin-users' ||
+    viewId === 'view-admin-kelas' ||
+    viewId === 'view-kelas' ||
     (effectiveView === 'view-admin-data' && (
       effectiveTab === 'Pengguna' ||
       effectiveTab === 'users' ||
-      effectiveTab === 'pengguna'
+      effectiveTab === 'pengguna' ||
+      effectiveTab === 'Data_Kelas' ||
+      effectiveTab === 'data_kelas' ||
+      effectiveTab === 'Kelas' ||
+      effectiveTab === 'kelas'
     ))
   ) {
     if (!isAdmin) {
```

### 4.2 Changes to `src/components/AdminDataView.tsx`

```diff
--- a/src/components/AdminDataView.tsx
+++ b/src/components/AdminDataView.tsx
@@ -32,6 +32,7 @@ import {
 } from '@/lib/academicTitles';
 import SistemBlokView from './SistemBlokView';
 import AdminPenggunaView from './AdminPenggunaView';
+import AdminKelasView from './AdminKelasView';
 import { resolveTeacherUsername, getDefaultTeacherPassword } from '@/lib/teacherUserSync';
 
 export interface AdminDataViewProps {
@@ -40,20 +41,21 @@ export interface AdminDataViewProps {
 }
 
+export function normalizeAdminTab(tab?: string): string {
+  if (!tab) return 'Data_Siswa';
+  const clean = tab.trim().toLowerCase();
+  if (clean === 'blok' || clean === 'sistem_blok') return 'sistem_blok';
+  if (clean === 'pengguna' || clean === 'users') return 'Pengguna';
+  if (clean === 'data_kelas' || clean === 'kelas') return 'Data_Kelas';
+  return tab;
+}
+
 export default function AdminDataView({ user, initialTab }: AdminDataViewProps) {
-  const [activeTab, setActiveTab] = useState(() => {
-    if (initialTab === 'blok' || initialTab === 'sistem_blok') return 'sistem_blok';
-    if (initialTab === 'Pengguna' || initialTab === 'pengguna' || initialTab === 'users') return 'Pengguna';
-    return initialTab || 'Data_Siswa';
-  });
+  const [activeTab, setActiveTab] = useState(() => normalizeAdminTab(initialTab));
 
   useEffect(() => {
     if (initialTab) {
-      if (initialTab === 'blok' || initialTab === 'sistem_blok') {
-        setActiveTab('sistem_blok');
-      } else if (initialTab === 'Pengguna' || initialTab === 'pengguna' || initialTab === 'users') {
-        setActiveTab('Pengguna');
-      } else {
-        setActiveTab(initialTab);
-      }
+      setActiveTab(normalizeAdminTab(initialTab));
     }
   }, [initialTab]);
 
@@ -115,6 +117,7 @@ export default function AdminDataView({ user, initialTab }: AdminDataViewProps)
   }, [user?.sekolah_id]);
 
   const tabs = [
+    { id: 'Data_Kelas', label: 'Kelas', table: 'data_kelas' },
     { id: 'Data_Siswa', label: 'Siswa', table: 'data_siswa' },
     { id: 'Data_Guru', label: 'Guru', table: 'data_guru' },
     { id: 'Data_Mapel', label: 'Mapel', table: 'data_mapel' },
@@ -126,7 +129,7 @@ export default function AdminDataView({ user, initialTab }: AdminDataViewProps)
   ];
 
   const loadData = useCallback(async () => {
-    if (activeTab === 'sistem_blok' || activeTab === 'blok' || activeTab === 'Pengguna') return;
+    if (activeTab === 'sistem_blok' || activeTab === 'blok' || activeTab === 'Pengguna' || activeTab === 'Data_Kelas') return;
     const tabObj = tabs.find(t => t.id === activeTab);
     if (!tabObj) return;
 
@@ -1931,6 +1934,10 @@ export default function AdminDataView({ user, initialTab }: AdminDataViewProps)
             ) : activeTab === 'Pengguna' ? (
               <div className="mt-2">
                 <AdminPenggunaView user={user} />
               </div>
+            ) : activeTab === 'Data_Kelas' ? (
+              <div className="mt-2">
+                <AdminKelasView user={user} />
+              </div>
             ) : (
               <>
```

### 4.3 Changes to `src/components/AppScreen.tsx`

```diff
--- a/src/components/AppScreen.tsx
+++ b/src/components/AppScreen.tsx
@@ -499,6 +499,8 @@ export default function AppScreen({ user, onLogout }: AppScreenProps) {
           'view-admin-data',
           'view-sistem-blok',
           'view-admin-pengguna',
-          'view-pengguna'
+          'view-pengguna',
+          'view-admin-kelas',
+          'view-kelas'
         ];
         const allowedDinasViews = [
@@ -605,7 +607,7 @@ export default function AppScreen({ user, onLogout }: AppScreenProps) {
         }
       }
 
-      if (['view-admin-config', 'view-admin-backup', 'view-admin-data', 'view-admin-pengguna', 'view-pengguna', 'view-admin-users'].includes(targetId)) {
+      if (['view-admin-config', 'view-admin-backup', 'view-admin-data', 'view-admin-pengguna', 'view-pengguna', 'view-admin-users', 'view-admin-kelas', 'view-kelas'].includes(targetId)) {
         if (!isAdmin && !isSuperadmin) {
           Swal.fire({
             icon: 'warning',
```

---

## 5. Verification Method

To independently verify the implementation after applying the blueprints:

1. **Unit Test Verification of Route Aliases & RBAC**:
   Execute the following assertions in `tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts`:
   ```typescript
   import { resolveCanonicalRoute, evaluateTabRBAC } from '../src/lib/navigation';
   import assert from 'node:assert';

   // 1. Alias resolution
   const res1 = resolveCanonicalRoute('view-admin-kelas');
   assert.strictEqual(res1.canonicalView, 'view-admin-data');
   assert.strictEqual(res1.defaultTab, 'Data_Kelas');
   assert.strictEqual(res1.isLegacyAlias, true);

   const res2 = resolveCanonicalRoute('view-kelas');
   assert.strictEqual(res2.canonicalView, 'view-admin-data');
   assert.strictEqual(res2.defaultTab, 'Data_Kelas');

   // 2. Custom tab preservation over alias
   const res3 = resolveCanonicalRoute('view-admin-kelas', 'custom_tab');
   assert.strictEqual(res3.canonicalView, 'view-admin-data');
   assert.strictEqual(res3.defaultTab, 'custom_tab');

   // 3. Admin access authorization
   assert.strictEqual(evaluateTabRBAC('view-admin-kelas', '', { role: 'Admin' }).allowed, true);
   assert.strictEqual(evaluateTabRBAC('view-admin-data', 'Data_Kelas', { role: 'Admin' }).allowed, true);

   // 4. Non-admin access rejection
   assert.strictEqual(evaluateTabRBAC('view-admin-kelas', '', { role: 'Guru' }).allowed, false);
   assert.strictEqual(evaluateTabRBAC('view-kelas', '', { role: 'Siswa' }).allowed, false);
   assert.strictEqual(evaluateTabRBAC('view-admin-data', 'Data_Kelas', { role: 'Guru' }).allowed, false);
   assert.strictEqual(evaluateTabRBAC('view-admin-data', 'Data_Kelas', { role: 'dinas_pendidikan' }).allowed, false);
   ```

2. **Integration Verification Command**:
   ```bash
   npx tsx tests/admin_submenu_kelas_dan_alokasi_siswa.test.ts
   npx tsx tests/navigation_consolidation_verification.test.ts
   npx tsx tests/master_data_admin_role_restriction.test.ts
   ```

3. **Typecheck & Regression Test Gate**:
   ```bash
   npx tsc --noEmit
   npm test
   ```

4. **Invalidation Conditions**:
   - If `resolveCanonicalRoute('view-admin-kelas')` does not return `canonicalView: 'view-admin-data'` and `defaultTab: 'Data_Kelas'`, routing fails.
   - If `evaluateTabRBAC('view-admin-kelas', '', { role: 'Guru' }).allowed === true`, the RBAC barrier has been compromised.
   - If navigating to `?view=view-admin-data&tab=Data_Kelas` executes `loadData` and displays generic table errors, short-circuit guard in `AdminDataView.tsx` was not applied.
