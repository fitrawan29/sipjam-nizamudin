# Handoff Report: Role BK (Bimbingan Konseling) & Kontrol Akses (R1) Exploration

**Agent**: `explorer_bk_1`  
**Date**: 2026-11-09T05:20:00Z  
**Scope**: Read-only codebase investigation of Role BK, Navigation/Menus, RBAC, AST Invariants, and Admin Account Management across SIPJAM.

---

## 1. Observation

Direct observations from the SIPJAM codebase:

### 1.1. Role Definitions & Types
- **`src/types/user.ts` (Lines 1 & 7)**:
  ```ts
  1: export type UserRole = 'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan' | 'siswa' | 'tata_usaha' | string;
  ...
  7:   role: 'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan' | 'siswa' | 'tata_usaha' | string;
  ```
  Role `tata_usaha` was explicitly added as a union member with a fallback to `string`. Role BK is not yet defined here.
- **`src/types/database.ts` (Line 2177)**:
  ```ts
  2177: export type RoleUser = "Superadmin" | "Admin" | "Guru" | "dinas_pendidikan" | "Dinas Pendidikan" | "tata_usaha" | "Tata Usaha";
  ```
- **`supabase/migrations/20261108_fix_users_role_check_constraint.sql` (Lines 23-32)**:
  ```sql
  23: -- 1. Hapus constraint users_role_check pada tabel public.users jika masih ada
  24: DO $$
  25: BEGIN
  26:   IF EXISTS (
  27:     SELECT 1 FROM pg_constraint 
  28:     WHERE conname = 'users_role_check'
  29:   ) THEN
  30:     ALTER TABLE public.users DROP CONSTRAINT users_role_check;
  31:   END IF;
  32: END $$;
  ```
  The old check constraint on `public.users` restricting roles to `('Superadmin', 'Admin', 'Guru', 'Piket', 'Wali Kelas')` was dropped in migration 20261108.

### 1.2. Role Normalization Patterns
- In `src/lib/navigation.ts` (Line 101, 220):
  ```ts
  const normRole = (params.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  ```
  `'tata_usaha'` -> `'tatausaha'`.
  `'dinas_pendidikan'` -> `'dinaspendidikan'`.
- In `src/components/AppScreen.tsx` (Lines 92-98):
  ```ts
  const isSuperadmin = (baseUser?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
  const isDinas = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'dinaspendidikan';
  const isAdmin = isSuperadmin || (baseUser?.role || '').toLowerCase() === 'admin';
  const isSiswa = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'siswa';
  const isTataUsaha =
    (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha' ||
    (baseUser?.mata_pelajaran || '').toLowerCase().includes('tata usaha');
  ```
- In `src/components/ClaySidebar.tsx` (Line 72):
  ```ts
  const isTU = isTataUsaha || (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';
  ```
- In `src/components/AdminPenggunaView.tsx` (Line 57-58, Line 166):
  ```ts
  const norm = (u.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  return norm === 'tatausaha';
  ...
  const isCurrentlyTU = (item.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';
  ```

### 1.3. Navigation & Consolidated Menus (Miller's Law)
- In `src/lib/navigation.ts` (Lines 181-191):
  ```ts
  if (normRole === 'tatausaha') {
    return [
      { id: 'view-home', icon: 'fa-house', label: 'Dashboard', dataTour: 'view-home' },
      { id: 'view-guru-presensi', icon: 'fa-clock', label: 'Presensi TU', dataTour: 'view-guru-presensi' },
      { id: 'view-guru-jurnal', icon: 'fa-book-open', label: 'Jurnal Kegiatan', dataTour: 'view-guru-jurnal' },
      { id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Asesmen', dataTour: 'view-gradebook' },
      { id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor', dataTour: 'view-rapor' },
      { id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi Sekolah', dataTour: 'view-informasi' },
      { id: 'view-pengaturan-akun', icon: 'fa-user-gear', label: 'Pengaturan Akun', dataTour: 'view-pengaturan-akun' }
    ];
  }
  ```
- Regular teacher menus (`src/lib/navigation.ts` Lines 194-209):
  Includes `view-home`, `view-guru-presensi`, `view-guru-jurnal` (classroom teaching journal requiring `jadwal_pelajaran`), `view-dokumen`, `view-gradebook`, `view-informasi`, and conditionally `view-rekap-siswa` (wali kelas) & `view-piket` (piket).

### 1.4. AST Invariant (`data-tour={item.id}`)
- In `src/components/AppScreen.tsx` (Lines 1024-1028):
  ```tsx
  {consolidatedMenuItems.map(item => (
    <React.Fragment key={item.id}>
      {/* AST preservation: data-tour={item.id} */}
      <button 
        key={item.id}
        data-tour={(item as any).dataTour || item.id}
        onClick={() => handleNavigation(item.id)}
  ```
- In `src/components/ClaySidebar.tsx` (Lines 226-230):
  ```tsx
  {menuItems.map((item) => {
    const isActive = currentView === item.id;
    return (
      <React.Fragment key={item.id}>
        {/* AST preservation: data-tour={item.id} */}
        <button
          key={item.id}
          data-tour={item.dataTour || item.id}
          type="button"
  ```
- In `tests/adversarial_m3_coldstart_rbac_popstate_challenger.test.ts` (Lines 360-361):
  ```ts
  assert(appScreenSource.includes('{/* AST preservation: data-tour={item.id} */}'), `[AST Preservation] AppScreen contains '{/* AST preservation: data-tour={item.id} */}'`);
  assert(claySidebarSource.includes('{/* AST preservation: data-tour={item.id} */}'), `[AST Preservation] ClaySidebar contains '{/* AST preservation: data-tour={item.id} */}'`);
  ```
  And in `tests/adversarial_m3_challenger_2_geometry_and_invariants.test.ts` (Lines 54-72).

### 1.5. Access Control & `evaluateTabRBAC`
- In `src/lib/navigation.ts` (Lines 214-273):
  Role isolation patterns:
  - Siswa: restricted to `view-ujian` and `view-informasi`.
  - Tata Usaha: restricted to whitelist `allowedTuViews` (`view-guru-presensi`, `view-guru-jurnal`, `view-gradebook`, `view-rapor`, `view-informasi`, `view-home`, `view-pengaturan-akun`) and blocked from `view-dokumen`.
  - Master Data (`view-admin-data`, `view-admin-config`, `view-admin-backup`): restricted strictly to `isAdmin`.
- In `src/components/AppScreen.tsx` (Lines 508-580 & Lines 1200-1420):
  Dual layer defense:
  - In `handleNavigation()`: checks `evaluateTabRBAC()` and shows `Swal.fire` on denial.
  - In JSX view rendering: checks `isAdmin || isSuperadmin || ...` and renders `<div className="glass-card ...">Akses Terblokir</div>` if URL was directly tampered.

### 1.6. Admin User Management & Sync
- In `src/lib/teacherUserSync.ts` (Lines 66-71):
  ```ts
  let userQuery = supabaseClient.from('users').select('*');
  if (typeof (userQuery as any).in === 'function') {
    userQuery = (userQuery as any).in('role', ['Guru', 'tata_usaha', 'Tata Usaha']);
  } else if (typeof (userQuery as any).eq === 'function') {
    userQuery = (userQuery as any).eq('role', 'Guru');
  }
  ```
- In `src/components/AdminPenggunaView.tsx`:
  - Lines 164-242: `handleToggleTuAssignment` toggles teacher role between `'Guru'` and `'tata_usaha'`, updating `users.role` and `data_guru.mata_pelajaran` (`'Tata Usaha (Administrasi)'` vs `'-'`).
  - Lines 245-368: `handleCreateTuUser` creates new account with 4 mandatory fields (NIP, Nama Lengkap, Nomor HP, Email Aktif), password default `${nip}27`.
  - Lines 865-881: Table action button toggles "Tunjuk TU" / "Ke Guru".
  - Lines 691-700: Banner button `+ Akun TU`.

---

## 2. Logic Chain

1. **Role Identification & Normalization**:
   - Observations 1.1 and 1.2 demonstrate that SIPJAM uses a two-tier role strategy:
     - Canonical storage in database `users.role` (e.g. `'tata_usaha'`, `'admin'`, `'guru'`).
     - Normalization helper: `(role || '').toLowerCase().replace(/[\s_-]+/g, '')`.
   - For BK: In Indonesian school administrative practices, users and spreadsheets refer to the counseling role as "BK", "Guru BK", "guru_bk", or "Bimbingan Konseling".
   - Normalizing these variations:
     - `'bk'`, `'BK'`, `' bk '` -> `'bk'`
     - `'guru_bk'`, `'Guru BK'`, `'GURU_BK'`, `'gurubk'` -> `'gurubk'`
     - `'bimbingan_konseling'`, `'Bimbingan Konseling'` -> `'bimbingankonseling'`
     - `'bimbingan_dan_konseling'`, `'Bimbingan dan Konseling'` -> `'bimbingandankonseling'`
   - Logic: The canonical database role should be `'bk'`. The normalization check should be:
     `const normRole = (role || '').toLowerCase().replace(/[\s_-]+/g, '');`
     `const isBK = normRole === 'bk' || normRole === 'gurubk' || normRole === 'bimbingankonseling' || normRole === 'bimbingandankonseling';`
     And in `data_guru`: `mata_pelajaran: 'Bimbingan Konseling (BK)'`.

2. **Navigation & Miller's Law Ergonomics**:
   - Observation 1.3 shows that each role receives an isolated, uncluttered menu set (7 ± 2 items).
   - A counseling teacher (Guru BK) does NOT teach scheduled classroom subjects; therefore, `view-guru-jurnal` (which enforces `jadwal_pelajaran` / rombel classes) is inapplicable.
   - BK counselors require:
     1. `view-home` (Dashboard with daily attendance status and BK shortcut cards)
     2. `view-guru-presensi` (Presensi BK — check-in/out attendance)
     3. `view-jurnal-bk` (Jurnal BK — non-class counseling journal)
     4. `view-informasi` (Informasi Sekolah — school bulletins)
     5. `view-pengaturan-akun` (Pengaturan Akun — profile & password)
   - This produces an ergonomic 5-item menu set.
   - Default landing view:
     Observation 1.2 in `AppScreen.tsx` shows:
     `defaultHomeView = isSuperadmin ? 'view-superadmin-overview' : (isSiswa ? defaultSiswaHomeView : defaultTuHomeView);`
     Where `defaultTuHomeView = isTataUsaha ? 'view-home' : defaultDinasHomeView;`.
     By extending this to `defaultBkHomeView = isBK ? 'view-home' : defaultTuHomeView;`, BK lands on `'view-home'`, maintaining consistent UX across staff roles while keeping `'view-jurnal-bk'` one tap away.

3. **AST Invariant Protection**:
   - Observation 1.4 shows automated tests strictly check for the verbatim comment `{/* AST preservation: data-tour={item.id} */}` and attribute `data-tour={(item as any).dataTour || item.id}` in `AppScreen.tsx` and `ClaySidebar.tsx`.
   - Logic: Because BK menus are generated inside `getConsolidatedMenuItems()` in `src/lib/navigation.ts`, the JSX in `AppScreen.tsx` and `ClaySidebar.tsx` will map over them automatically without altering the AST wrapper comment. Any developer implementing BK MUST NOT touch this comment block.

4. **Strict Confidentiality & RBAC Protection of Jurnal BK**:
   - Observation 1.5 shows `evaluateTabRBAC` is the central authorization gate, coupled with defense-in-depth JSX checks in `AppScreen.tsx`.
   - Student counseling records contain sensitive personal, psychological, family, and disciplinary information. Under counseling ethics and school privacy guidelines, access MUST be strictly limited to:
     - Role BK (`isBK`)
     - Administrator (`isAdmin || isSuperadmin`)
     - Kepala Sekolah (`isKepalaSekolah`)
   - Logic:
     - In `evaluateTabRBAC`:
       ```ts
       if (viewId === 'view-jurnal-bk' || effectiveView === 'view-jurnal-bk') {
         if (!isBK && !isAdmin && !isKepalaSekolah) {
           return {
             allowed: false,
             fallbackTab: 'view-home',
             reason: 'Jurnal BK bersifat rahasia dan hanya dapat diakses oleh Guru BK, Administrator, dan Kepala Sekolah.'
           };
         }
       }
       ```
     - For role BK trying to access unpermitted views:
       Whitelist approach (`['view-home', 'view-guru-presensi', 'view-jurnal-bk', 'view-informasi', 'view-pengaturan-akun']`). If BK tries `view-guru-jurnal`, redirect to `view-jurnal-bk`.
     - In `AppScreen.tsx`:
       `handleNavigation` blocks unauthorized attempts with SweetAlert2.
       JSX rendering displays `<div className="glass-card ...">Akses Terblokir: Halaman Jurnal BK bersifat rahasia...</div>` if unpermitted users tamper with URL query params.

5. **Admin Management of BK Accounts**:
   - Observation 1.6 shows how TU accounts are managed via dual mechanisms in `AdminPenggunaView.tsx`:
     1. Quick toggle button ("Tunjuk TU" / "Ke Guru").
     2. Dedicated creation form ("+ Akun TU").
     3. Sync query in `teacherUserSync.ts`.
   - Logic: BK account management should adopt this exact dual pattern:
     - "Tunjuk BK" / "Ke Guru" button in table rows:
       Switches `users.role` between `'bk'` and `'Guru'`, and sets `data_guru.mata_pelajaran` between `'Bimbingan Konseling (BK)'` and `'-'`.
     - "+ Akun BK" button in banner:
       Opens modal with 4 required fields (NIP, Nama Lengkap, Nomor HP, Email Aktif), creates `users` record (`role: 'bk'`), default password `${nip}27`, and creates `data_guru` entry.
     - `teacherUserSync.ts`:
       Extends line 68 query to include `['Guru', 'tata_usaha', 'Tata Usaha', 'bk', 'guru_bk', 'Guru BK']`.

---

## 3. Caveats

1. **Database RLS vs Client-Side RBAC**:
   Investigation focused on application-level RBAC (`evaluateTabRBAC`, `AppScreen`, `ClaySidebar`, `AdminPenggunaView`). When table `jurnal_bk` is created in database, corresponding Supabase RLS policies (or security definer helper functions) must ensure server-side enforcement.
2. **Read-Only vs Full CRUD for Kepala Sekolah**:
   Kepala Sekolah needs supervisory oversight. In `AppScreen`, Kepala Sekolah has read-only access to monitoring views (`isReadOnly={isKepalaSekolah && !isAdmin && !isSuperadmin}`). In Jurnal BK, Kepala Sekolah should be able to view entries for supervision, while only BK and Admin have write/edit permissions.
3. **Student Presensi Monitoring**:
   While `view-rekap-siswa` is traditionally for Wali Kelas and Admin, some schools allow BK to view student attendance for early truancy intervention. We recommend keeping BK's core sidebar to 5 items to strictly uphold Miller's Law, while allowing BK read-only access to `view-rekap-siswa` if explicitly requested or via a link from Jurnal BK.

---

## 4. Conclusion

1. **Role Naming & Normalization**:
   - Canonical DB value: `'bk'`.
   - Normalization check: `const isBK = normRole === 'bk' || normRole === 'gurubk' || normRole === 'bimbingankonseling' || normRole === 'bimbingandankonseling';`
   - Type definitions: Add `'bk' | 'guru_bk'` to `UserRole` (`src/types/user.ts`) and `RoleUser` (`src/types/database.ts`).
2. **Sidebar & Navigation**:
   - BK sidebar items (5 items):
     1. `view-home` (Dashboard)
     2. `view-guru-presensi` (Presensi BK)
     3. `view-jurnal-bk` (Jurnal BK)
     4. `view-informasi` (Informasi Sekolah)
     5. `view-pengaturan-akun` (Pengaturan Akun)
   - Default landing view: `'view-home'` (consistent with Guru and TU).
   - AST invariant `{/* AST preservation: data-tour={item.id} */}` remains untouched in `AppScreen.tsx` and `ClaySidebar.tsx`.
3. **RBAC & Isolation**:
   - `evaluateTabRBAC`: strictly blocks all other roles (regular `guru`, wali kelas, piket, tata usaha, siswa, dinas) from `view-jurnal-bk`.
   - BK role is restricted to its allowed whitelist, blocking master data, class teaching journals, verification, and backups.
   - Defense-in-depth: Dual protection in `handleNavigation` and JSX view rendering.
4. **Admin Management**:
   - In `AdminPenggunaView.tsx`:
     - Fast toggle button: "Tunjuk BK" / "Ke Guru".
     - Modal creation: "+ Akun BK" (4 mandatory fields).
   - In `src/lib/teacherUserSync.ts`: Include `'bk'`, `'guru_bk'`, `'Guru BK'` in user query filter.

---

## 5. Verification Method

Independent verification methods to confirm these findings and test future implementation:

1. **Static Invariant Verification**:
   Inspect `src/components/AppScreen.tsx` and `src/components/ClaySidebar.tsx` to verify comment preservation:
   ```bash
   grep -n "AST preservation: data-tour={item.id}" src/components/AppScreen.tsx src/components/ClaySidebar.tsx
   ```
2. **TypeScript Compilation Check**:
   ```bash
   npx tsc --noEmit
   ```
3. **Automated RBAC Test Execution**:
   Run the existing adversarial test suites to ensure zero regression:
   ```bash
   npx tsx tests/adversarial_tu_nav_m2_challenger.test.ts
   npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts
   npx tsx tests/adversarial_m3_coldstart_rbac_popstate_challenger.test.ts
   ```
4. **BK Dedicated Test Suite (for Implementation Phase)**:
   Author `tests/bk_role_rbac_and_isolation.test.ts` verifying:
   - Permutations of BK role string return strictly the 5 menu items.
   - `evaluateTabRBAC` permits `view-jurnal-bk` for BK, Admin, Kepsek, and rejects Guru, Wali, Piket, TU, Siswa, Dinas.
   - `evaluateTabRBAC` rejects `view-admin-data` and `view-guru-jurnal` for BK.
   - `isAdminRole('bk') === false`.
