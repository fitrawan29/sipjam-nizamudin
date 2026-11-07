# Handoff Report: R1 - Penyesuaian Menu Navigasi Role TU

## 1. Observation

Direct code analysis and empirical inspection were conducted across `sipjam-app`. The key observations are quoted directly:

### 1.1 Navigation & Role Menu Generator (`src/lib/navigation.ts`)
- **Lines 176–181:** Menu items for `normRole === 'tatausaha'` are currently defined with only 2 items:
  ```ts
  if (normRole === 'tatausaha') {
    return [
      { id: 'view-data-siswa', icon: 'fa-user-graduate', label: 'Data Siswa', dataTour: 'view-admin-data' },
      { id: 'view-data-guru', icon: 'fa-chalkboard-user', label: 'Data Guru', dataTour: 'view-admin-data' }
    ];
  }
  ```
- **Lines 28–29:** Canonical alias exists for `'view-rapor'`:
  ```ts
  // Klaster 3: Asesmen & Rapor
  'view-rapor':             { view: 'view-gradebook', tab: 'rapor' },
  ```
- **Lines 223–226 & 247–259:** Role TU RBAC guard in `evaluateTabRBAC()`:
  ```ts
  // Strict isolation for Tata Usaha: strictly cannot access Bank Dokumen / Persuratan
  if (isTataUsaha && viewId === 'view-dokumen') {
    return { allowed: false, fallbackTab: 'view-data-siswa', reason: 'Role Tata Usaha tidak memiliki hak akses ke Bank Dokumen / Persuratan.' };
  }
  ...
  if (isTataUsaha) {
    if (effectiveView === 'view-admin-data') {
      const allowedTuTabs = ['Data_Siswa', 'data_siswa', 'siswa', 'Data_Guru', 'data_guru', 'guru'];
      if (allowedTuTabs.includes(effectiveTab || 'Data_Siswa')) {
        return { allowed: true };
      }
      return { allowed: false, fallbackTab: 'view-data-siswa', reason: 'Role Tata Usaha hanya memiliki akses ke Data Siswa dan Data Guru.' };
    }
    if (effectiveView !== 'view-home') {
      return { allowed: false, fallbackTab: 'view-data-siswa', reason: 'Role Tata Usaha tidak memiliki izin akses ke modul ini.' };
    }
    return { allowed: true };
  }
  ```
- **Lines 236–240:** Tab `rapor` under `view-gradebook` is currently restricted:
  ```ts
  if (viewId === 'view-gradebook' && tabId === 'rapor') {
    if (!isWali && !isAdmin) {
      return { allowed: false, fallbackTab: 'gradebook', reason: 'Halaman Rapor secara eksklusif hanya dapat diakses oleh Wali Kelas dan Administrator.' };
    }
  }
  ```

### 1.2 Root View Router & Sidebar Drawer (`src/components/AppScreen.tsx`)
- **Line 95:** Definition of `isTataUsaha`:
  ```ts
  const isTataUsaha = (baseUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';
  ```
- **Lines 195, 234, 816:** Default view resolution routes TU to `view-admin-data`:
  ```ts
  // Line 195:
  if (isTataUsaha) return 'view-admin-data';
  // Line 234:
  const defaultTuPopView = isTataUsaha ? 'view-admin-data' : defaultDinasPopView;
  // Line 816:
  const defaultTuHomeView = isTataUsaha ? 'view-admin-data' : defaultDinasHomeView;
  ```
- **Lines 495–527:** `handleNavigation` checks `evaluateTabRBAC()` for `isTataUsaha`:
  ```ts
  if (isTataUsaha) {
    if (targetId === 'view-dokumen') {
      Swal.fire({
        icon: 'warning',
        title: 'Akses Ditolak',
        text: 'Akses Terblokir: Role Tata Usaha tidak memiliki hak akses ke Bank Dokumen / Persuratan.',
        confirmButtonColor: '#0B4619'
      });
      return;
    }

    const rbacCheck = evaluateTabRBAC(targetId, targetTab || '', { role: user?.role, isWaliKelas });
    if (!rbacCheck.allowed) {
      Swal.fire({
        icon: 'warning',
        title: 'Akses Ditolak',
        text: rbacCheck.reason || 'Akses Terblokir: Role Tata Usaha hanya memiliki akses ke Data Siswa dan Data Guru.',
        confirmButtonColor: '#0B4619'
      });
      return;
    }
  ...
  ```
- **Lines 802–808:** `AppScreen` generates `consolidatedMenuItems` using `getConsolidatedMenuItems()`:
  ```ts
  const consolidatedMenuItems = getConsolidatedMenuItems({
    role: isSuperadmin ? 'superadmin' : isDinas ? 'dinaspendidikan' : isAdmin ? 'admin' : (isKepalaSekolah ? 'kepalasekolah' : isSiswa ? 'siswa' : isTataUsaha ? 'tata_usaha' : 'guru'),
    isWaliKelas,
    isPiketHariIni,
    isKepalaSekolah,
    activeTargetSchool
  });
  ```
- **Lines 1010–1055:** Sidebar overlay renders items and additional hardcoded buttons:
  ```tsx
  {consolidatedMenuItems.map(item => (
    <React.Fragment key={item.id}>
      {/* AST preservation: data-tour={item.id} */}
      <button key={item.id} data-tour={(item as any).dataTour || item.id} onClick={() => handleNavigation(item.id)} ...>
        <i className={`fa-solid ${item.icon} w-5 text-center`}></i> {item.label}
      </button>
    </React.Fragment>
  ))}
  <button type="button" onClick={() => { setSidebarOpen(false); setIsAccountModalOpen(true); }} ...>
    <i className="fa-solid fa-user-gear w-5 text-center text-blue-500"></i> Pengaturan Akun
  </button>
  <button type="button" onClick={() => { setTutorialModalOpen(true); setSidebarOpen(false); }} ...>
    <i className="fa-solid fa-book-bookmark text-sm"></i>
    <span>Panduan & Tutorial Lengkap</span>
  </button>
  {!isSuperadmin && (
    <button type="button" onClick={() => { setTourOpen(true); setSidebarOpen(false); }} ...>
      <i className="fa-solid fa-graduation-cap text-sm"></i>
      <span>Lihat Tutorial Lagi</span>
    </button>
  )}
  ```
- **Lines 1156, 1157, 1209, 1217, 1268, 1368:** View component routing:
  - Line 1156: `{currentView === 'view-guru-presensi' && <GuruPresensi user={user} initialTab={(urlTab as any) || 'live'} />}` (no role restriction here, accessible if navigated).
  - Line 1157: `{currentView === 'view-guru-jurnal' && (<GuruJurnal user={user} initialTab={(urlTab as any) || 'input'} assignedKelas={assignedKelas} isKepalaSekolah={isKepalaSekolah} />)}` (accessible).
  - Line 1209: `{currentView === 'view-gradebook' && (<GradebookView user={user} initialTab={urlTab === 'rapor' ? 'rapor' : 'gradebook'} assignedKelas={assignedKelas} isKepalaSekolah={isKepalaSekolah} />)}` (accessible).
  - Line 1217: `{currentView === 'view-informasi' && <InformasiView user={user} setView={handleNavigation} />}` (accessible to all).
  - Line 1268–1271: `{currentView === 'view-rapor' && (isAdmin || isSuperadmin || isWaliKelas ? (<RaporView user={user} assignedKelas={assignedKelas} />) : (<div className="glass-card ...">Akses Terblokir...</div>))}` (currently blocks TU).
  - Line 1368–1370: `{currentView === 'view-admin-data' && (isAdmin || isSuperadmin || isTataUsaha ? (<AdminDataView user={user} initialTab={urlTab || undefined} />) : (<div className="glass-card ...">Akses Terblokir...</div>))}` (currently permits TU).

### 1.3 Sidebar Presentation (`src/components/ClaySidebar.tsx`)
- **Lines 267–280:** Quick action `onOpenAccountSettings` renders `Pengaturan Akun`.
- **Lines 283–298:** Quick action `onOpenTutorial` renders `Panduan & Tutorial Lengkap`.
- **Lines 300–315:** Quick action `onOpenInteractiveTour` renders `Lihat Tutorial Lagi`.
- **Lines 223–227:** AST comment:
  ```tsx
  {/* AST preservation: data-tour={item.id} */}
  ```

### 1.4 Existing Tests
- `tests/tata_usaha_role_rbac_and_isolation.test.ts`: Currently enforces that `getConsolidatedMenuItems({ role: 'tata_usaha' })` has exactly 2 items (`view-data-siswa` & `view-data-guru`). Executed via `npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts` with 81 passed tests.
- `package.json` line 10 includes `tests/tata_usaha_role_rbac_and_isolation.test.ts` in `"npm test"`.

---

## 2. Logic Chain

1. **Requirement Boundary Comparison:**
   - In M1 (prior state): TU had only 2 menu items (`view-data-siswa` and `view-data-guru` pointing to `AdminDataView`).
   - In R1 (current production requirement): Menu navigasi role TU must be restricted to **EXACTLY and ONLY 6 items**:
     1. Presensi TU
     2. Jurnal Kegiatan
     3. Asesmen (mode read-only)
     4. Rapor (mode read-only)
     5. Informasi Sekolah
     6. Pengaturan Akun
   - All other menus (Data Siswa, Data Guru, Master Data, Perangkat Pembelajaran, Piket, Kalender, Verifikasi, Rekap Presensi, dll.) must be hidden and strictly blocked.

2. **Analysis of the 6 Views:**
   - **Menu 1: Presensi TU**
     - Canonical View ID: `view-guru-presensi` (with optional alias `view-presensi-tu`).
     - Component: `<GuruPresensi user={user} initialTab="live" />`.
     - Underlying mechanism: Inserts into table `presensi_guru` with user's NIP/name/sekolah_id. The check-in/check-out and GPS geofence workflow works identically for all staff. In `GuruPresensi.tsx:838`, title can conditionally display `"Presensi Kehadiran TU"` when `user.role === 'tata_usaha'`.
   - **Menu 2: Jurnal Kegiatan**
     - Canonical View ID: `view-guru-jurnal` (with optional alias `view-jurnal-kegiatan`).
     - Component: `<GuruJurnal user={user} initialTab="input" />`.
     - Underlying mechanism: `GuruJurnal.tsx` already has native support for `tipeJurnal === 'Jurnal Kegiatan'` (lines 1440, 1751). In Jurnal Kegiatan mode, it captures date, activity name (`materi`), description (`kegiatan`), reflection, and photo documentation without requiring assigned classes or student attendance.
     - For role TU: defaulting `tipeJurnal` to `'Jurnal Kegiatan'` ensures TU users are never blocked by missing teaching assignments (`hasNoKbmAssignments`).
   - **Menu 3: Asesmen (mode read-only)**
     - Canonical View ID: `view-gradebook` (tab `'gradebook'`).
     - Component: `<GradebookView user={user} initialTab="gradebook" />`.
     - Read-only enforcement (linked to R2): TU can view assessment data across all classes/teachers, while save/edit/delete buttons are disabled or hidden for role TU.
   - **Menu 4: Rapor (mode read-only)**
     - Canonical View ID: `view-rapor` (resolves to `view-gradebook` with tab `'rapor'`, or renders `<RaporView />`).
     - Component: `<GradebookView user={user} initialTab="rapor" />` or `<RaporView user={user} assignedKelas={null} />`.
     - In `AppScreen.tsx:1269`, allow `isTataUsaha` so `view-rapor` is not blocked.
   - **Menu 5: Informasi Sekolah**
     - Canonical View ID: `view-informasi`.
     - Component: `<InformasiView user={user} setView={handleNavigation} />`.
     - Read-only announcements and school information; already fully supported for all authenticated roles.
   - **Menu 6: Pengaturan Akun**
     - Canonical View ID: `view-pengaturan-akun`.
     - Modal: `AccountSettingsModal.tsx`.
     - In `AppScreen.tsx` and `ClaySidebar.tsx`: Clicking `view-pengaturan-akun` opens `setIsAccountModalOpen(true)` and closes the sidebar drawer.

3. **Restricting Other Menus & Route Guards:**
   - In `src/lib/navigation.ts` -> `getConsolidatedMenuItems`:
     Return exactly the 6 items for `normRole === 'tatausaha'`.
   - In `src/lib/navigation.ts` -> `evaluateTabRBAC`:
     Permit: `view-guru-presensi`, `view-guru-jurnal`, `view-gradebook`, `view-rapor`, `view-informasi`, `view-home`.
     Deny: `view-admin-data` (Data Siswa & Data Guru are NO LONGER accessible to TU), `view-dokumen`, `view-admin-config`, `view-admin-backup`, `view-sistem-blok`, `view-admin-verif`, `view-admin-rekap`, `view-piket`, `view-superadmin-*`, `view-dinas-*`, `view-ujian`.
   - In `src/components/AppScreen.tsx`:
     - Line 195: Change `if (isTataUsaha) return 'view-admin-data'` to `if (isTataUsaha) return 'view-guru-presensi'`.
     - Line 234: `defaultTuPopView = isTataUsaha ? 'view-guru-presensi' : ...`.
     - Line 816: `defaultTuHomeView = isTataUsaha ? 'view-guru-presensi' : ...`.
     - Line 1369: Remove `|| isTataUsaha` from `view-admin-data` guard to block manual URL manipulation to master data.
     - Line 1269: Add `|| isTataUsaha` to `view-rapor` guard.
     - Lines 1027–1055: Suppress hardcoded Pengaturan Akun button, Panduan & Tutorial button, and Tour button for `isTataUsaha` to guarantee that exactly and only the 6 items appear in the navigation drawer.
   - In `src/components/ClaySidebar.tsx`:
     - Suppress quick actions (`onOpenAccountSettings`, `onOpenTutorial`, `onOpenInteractiveTour`) when `isTU === true`.

4. **/ponytail Minimal Architecture Assessment:**
   - **Ladder Rung 1 (YAGNI):** No new tables, no new files, no separate navigation classes.
   - **Ladder Rung 2 (Reuse):** Reuse `GuruPresensi` for Presensi TU, `GuruJurnal` for Jurnal Kegiatan, `GradebookView`/`RaporView` for Asesmen & Rapor, `InformasiView` for Informasi, and `AccountSettingsModal` for Pengaturan Akun.
   - **Ladder Rung 6/7 (Minimal code):** Update array definition in `src/lib/navigation.ts`, whitelist check in `evaluateTabRBAC()`, and clean guard adjustments in `AppScreen.tsx` and `ClaySidebar.tsx`.

---

## 3. Caveats

1. **Interaction with R2 (Read-Only Mode for Asesmen & Rapor):**
   - R1 dictates navigation exposure for Asesmen and Rapor. R2 dictates that mutative elements (scoring, inputs, saves, edits) within `GradebookView` and `RaporView` must be disabled for TU. While R1 opens the navigation door to these views, the implementer of R2 must verify that `isReadOnly` flags are honored inside `GradebookView` and `RaporView`.
2. **Existing Test Suite Invalidation:**
   - `tests/tata_usaha_role_rbac_and_isolation.test.ts` (created during M1) explicitly tests `tuMenuItems.length === 2` (`view-data-siswa` & `view-data-guru`). Updating the codebase for R1 will cause this legacy assertion to fail unless the test assertions are updated to reflect the new 6-item requirement.
3. **Draft Storage for Jurnal Kegiatan:**
   - When TU fills out Jurnal Kegiatan, session draft storage should key on `tipeJurnal === 'Jurnal Kegiatan'`. `GuruJurnal.tsx` already separates draft keys appropriately.

---

## 4. Conclusion

The simplest, most minimal (/ponytail) solution to fulfill R1 without unnecessary abstraction is:

1. **`src/lib/navigation.ts`**:
   - In `getConsolidatedMenuItems`: For `normRole === 'tatausaha'`, return the exact 6 items:
     1. `{ id: 'view-guru-presensi', icon: 'fa-clock', label: 'Presensi TU', dataTour: 'view-guru-presensi' }`
     2. `{ id: 'view-guru-jurnal', icon: 'fa-book-open', label: 'Jurnal Kegiatan', dataTour: 'view-guru-jurnal' }`
     3. `{ id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Asesmen', dataTour: 'view-gradebook' }`
     4. `{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor', dataTour: 'view-rapor' }`
     5. `{ id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi Sekolah', dataTour: 'view-informasi' }`
     6. `{ id: 'view-pengaturan-akun', icon: 'fa-user-gear', label: 'Pengaturan Akun', dataTour: 'view-pengaturan-akun' }`
   - In `VIEW_ALIASES`: Register canonical aliases:
     - `'view-presensi-tu': { view: 'view-guru-presensi' }`
     - `'view-jurnal-kegiatan': { view: 'view-guru-jurnal', tab: 'input' }`
     - `'view-asesmen': { view: 'view-gradebook', tab: 'gradebook' }`
   - In `evaluateTabRBAC`:
     - Allow TU for `['view-guru-presensi', 'view-guru-jurnal', 'view-gradebook', 'view-rapor', 'view-informasi', 'view-home']`.
     - Allow `tabId === 'rapor'` under `view-gradebook` when `isTataUsaha === true`.
     - Strictly block `view-admin-data`, `view-dokumen`, `view-admin-config`, `view-admin-backup`, `view-sistem-blok`, `view-admin-verif`, `view-admin-rekap`, `view-piket`, `view-ujian`, `view-superadmin-*`, `view-dinas-*`.
2. **`src/components/AppScreen.tsx`**:
   - Change TU default landing view from `'view-admin-data'` to `'view-guru-presensi'` (lines 195, 234, 816).
   - In `handleNavigation`: when `targetId === 'view-pengaturan-akun'`, invoke `setSidebarOpen(false); setIsAccountModalOpen(true);`.
   - In sidebar drawer: do not render duplicate hardcoded Pengaturan Akun, Tutorial, or Tour buttons when `isTataUsaha`.
   - In view router: remove `|| isTataUsaha` from line 1369 (`view-admin-data`); add `|| isTataUsaha` to line 1269 (`view-rapor`).
3. **`src/components/ClaySidebar.tsx`**:
   - In `onClick` handler of menu items: if `item.id === 'view-pengaturan-akun'`, trigger `onOpenAccountSettings()`.
   - Suppress quick actions when `isTU === true` (`onOpenAccountSettings`, `onOpenTutorial`, `onOpenInteractiveTour`).
   - Preserve verbatim AST comment: `{/* AST preservation: data-tour={item.id} */}`.
4. **Presensi & Jurnal UI Labels**:
   - In `GuruPresensi.tsx`: title dynamically shows `"Presensi Kehadiran TU"` when `user?.role === 'tata_usaha'`.
   - In `GuruJurnal.tsx`: defaults `tipeJurnal` to `'Jurnal Kegiatan'` and title to `"Jurnal Kegiatan"` when `user?.role === 'tata_usaha'`.

---

## 5. Verification Method

### 5.1 Independent Verification Commands
1. Run existing test suite to inspect baseline:
   ```powershell
   npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts
   ```
2. Verify updated consolidated menu for TU:
   ```powershell
   npx tsx -e "
     const { getConsolidatedMenuItems } = require('./src/lib/navigation');
     const items = getConsolidatedMenuItems({ role: 'tata_usaha' });
     console.log('Total items:', items.length);
     console.log(items.map(i => ({ id: i.id, label: i.label })));
     if (items.length !== 6) process.exit(1);
   "
   ```
3. Verify RBAC isolation for TU:
   ```powershell
   npx tsx -e "
     const { evaluateTabRBAC } = require('./src/lib/navigation');
     const u = { role: 'tata_usaha' };
     const allowed = ['view-guru-presensi', 'view-guru-jurnal', 'view-gradebook', 'view-rapor', 'view-informasi'];
     const blocked = ['view-admin-data', 'view-dokumen', 'view-admin-config', 'view-admin-verif', 'view-admin-rekap', 'view-piket'];
     for (const v of allowed) {
       const res = evaluateTabRBAC(v, '', u);
       if (!res.allowed) throw new Error('Expected allowed for ' + v);
     }
     for (const v of blocked) {
       const res = evaluateTabRBAC(v, '', u);
       if (res.allowed) throw new Error('Expected blocked for ' + v);
     }
     console.log('RBAC verification passed 100%');
   "
   ```
4. Verify AST invariant preservation:
   ```powershell
   npx tsx -e "
     const fs = require('fs');
     const app = fs.readFileSync('src/components/AppScreen.tsx', 'utf8');
     const bar = fs.readFileSync('src/components/ClaySidebar.tsx', 'utf8');
     if (!app.includes('{/* AST preservation: data-tour={item.id} */}')) throw new Error('AppScreen AST missing');
     if (!bar.includes('{/* AST preservation: data-tour={item.id} */}')) throw new Error('ClaySidebar AST missing');
     console.log('AST invariants verified');
   "
   ```

### 5.2 Invalidation Conditions
- Any menu item for Tata Usaha outside the exact 6 required (e.g. Master Data, Data Siswa, Data Guru, Perangkat) appearing in `getConsolidatedMenuItems({ role: 'tata_usaha' })`.
- A TU user being able to access `view-admin-data` or `view-dokumen` via URL query parameters (`?view=view-admin-data`).
- Failure of other roles (admin, guru, kepsek, dinas, superadmin, siswa) to retain their existing menu configurations.
