# Handoff Report: Empirical Adversarial Challenge — Wali Kelas Rapor Menu & Security Guards

**Agent**: `challenger_o18_m4_2` (empirical-challenger)  
**Parent**: `orchestrator_18` (`abb46050-fc5a-40d0-bacf-41cc55be2bc6`)  
**Date**: 2026-10-09  
**Target Scope**: `src/components/AppScreen.tsx`, `src/components/RaporView.tsx`  
**Verdict**: **APPROVE**  

---

## 1. Observation

1. **Teacher Without `isWaliKelas` Guarding (`AppScreen.tsx`)**:
   - `src/components/AppScreen.tsx:555`:
     ```tsx
     ...(isWaliKelas ? [{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }] : []),
     ```
     When `isWaliKelas` is `false`, `view-rapor` is omitted from `menuItemsGuru`.
   - `src/components/AppScreen.tsx:487-497`:
     ```tsx
     if (targetId === 'view-rapor') {
       if (!isAdmin && !isSuperadmin && !isWaliKelas) {
         Swal.fire({
           icon: 'warning',
           title: 'Akses Ditolak',
           text: 'Akses Terblokir: Halaman Rapor secara eksklusif hanya dapat diakses oleh Administrator dan Wali Kelas yang ditugaskan.',
           confirmButtonColor: '#0B4619'
         });
         return;
       }
     }
     ```
     Navigation calls targeting `view-rapor` by unauthorized teachers are intercepted, trigger a warning modal, and return early without mutating `currentView` or history state.
   - `src/components/AppScreen.tsx:846-867`:
     ```tsx
     {currentView === 'view-rapor' && (
       isAdmin || isSuperadmin || isWaliKelas ? (
         <RaporView user={user} assignedKelas={assignedKelas} />
       ) : (
         <div className="glass-card p-8 text-center max-w-lg mx-auto mt-10 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
           ...
           <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
           ...
           <button ... onClick={() => { ... setCurrentView(defaultHomeView); }}>Kembali ke Dashboard</button>
         </div>
       )
     )}
     ```
     Direct view forced attempts (e.g. `?view=view-rapor` in initial URL or state tampering) are intercepted at the JSX render layer; `<RaporView>` is never instantiated, rendering the fallback lock card instead.

2. **Teacher With `isWaliKelas === true` Authorized Homeroom Flow (`AppScreen.tsx` & `RaporView.tsx`)**:
   - `src/components/AppScreen.tsx:555`: Spreads `{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }` into `menuItemsGuru`.
   - `src/components/AppScreen.tsx:488`: Authorization condition `!isAdmin && !isSuperadmin && !isWaliKelas` evaluates to `false`, allowing navigation.
   - `src/components/AppScreen.tsx:847-848`: Mounts `<RaporView user={user} assignedKelas={assignedKelas} />`.
   - `src/components/RaporView.tsx:281-296`:
     ```tsx
     {isAdmin || isSuperadmin ? (
       <select value={selectedKelas} onChange={(e) => setSelectedKelas(e.target.value)} ...>
         {kelasList.map(k => (<option key={k} value={k}>{k}</option>))}
       </select>
     ) : (
       <span className="font-extrabold text-teal-700 dark:text-teal-300">
         {selectedKelas || assignedKelas || 'Tidak Ada'}
       </span>
     )}
     ```
     For a teacher, `isAdmin || isSuperadmin` is `false`, rendering only a static, non-editable text badge containing `assignedKelas`. No `<select>` element is rendered in the DOM for homeroom teachers.

3. **Admin & Superadmin Privilege Flow (`AppScreen.tsx` & `RaporView.tsx`)**:
   - `src/components/AppScreen.tsx:570`: `menuItemsAdmin` unconditionally includes `{ id: 'view-rapor', icon: 'fa-file-lines', label: 'Rapor' }`.
   - `src/components/AppScreen.tsx:488`: Admins and Superadmins pass navigation checks without interruption.
   - `src/components/RaporView.tsx:46-47`: Evaluates `isAdmin` and `isSuperadmin` across lowercase and title-case variants.
   - `src/components/RaporView.tsx:281-291`: Renders `<select>` dropdown populated from `kelasList` (unique school classes sorted ascending), allowing administrators to inspect report cards for any class in the school.

4. **Direct State Tampering Resistance**:
   - Deep-linking attack `?view=view-rapor` on fresh boot: `AppScreen` URL parser sets `currentView = 'view-rapor'`, but the render branch `isAdmin || isSuperadmin || isWaliKelas` fails for unauthorized users, rendering `Akses Terblokir`.
   - Browser popstate / back-button attack: Popstate handler does not elevate authorization flags; JSX guard prevents `<RaporView>` mount.
   - Forged prop attack: Even if `<RaporView>` is directly mounted with teacher credentials, `isAdmin || isSuperadmin` remains `false`, preventing class switching.

5. **Zero Class Data Leakage (`RaporView.tsx`)**:
   - `src/components/RaporView.tsx:98-103`: Student query `sQuery = supabase.from('data_siswa').select(...).eq('kelas', selectedKelas)` strictly isolates student records to `selectedKelas`.
   - `src/components/RaporView.tsx:119-124`: Attendance query `aQuery = supabase.from('absensi').select(...).eq('kelas', selectedKelas)` strictly scopes attendance counts to `selectedKelas`.
   - `src/components/RaporView.tsx:206-212`: In-memory student search filters strictly over the loaded `students` array; queries for students belonging to other classes yield 0 results.
   - `src/components/RaporView.tsx:146, 171`: Reflection storage is namespaced per class: `sipjam_rapor_catatan_${selectedKelas}_${selectedSemester}_${selectedTahunAjaran}`.
   - `src/components/RaporView.tsx:625`: Print signature title is locked to `rightTitle={'Wali Kelas ' + selectedKelas}`.
   - `src/components/RaporView.tsx:72, 102, 123`: Multi-tenant isolation is enforced via `.eq('sekolah_id', sekolahId)` across all queries.

6. **Empirical Execution Results**:
   - Created `tests/adversarial_rapor_wali_security.test.ts` executing 28 adversarial assertions:
     - 28 / 28 assertions PASSED (100%).
   - Ran `npx tsc --noEmit`: Exited with code 0 (clean).
   - Ran `npx tsx tests/m4_academic_merdeka_rapor.test.ts`: 14 / 14 tests PASSED (100%).
   - Ran `npm test`: 27 suites PASSED (100%).
   - Ran `npm run build`: Compiled successfully via Next.js Turbopack in 2.7s with 0 errors.

---

## 2. Logic Chain

1. **Three-Tier Defense-in-Depth for Unauthorized Access**:
   - *Tier 1 (Sidebar omission)*: Based on observation 1 (`menuItemsGuru:555`), a non-wali teacher is not exposed to the Rapor button in the navigation drawer.
   - *Tier 2 (Navigation handler intercept)*: Based on observation 1 (`handleNavigation:487`), programmatic attempts to navigate to `view-rapor` trigger a SweetAlert2 warning modal and immediately abort before changing view state or URL.
   - *Tier 3 (View mount guard)*: Based on observation 1 (`currentView === 'view-rapor':846`), even if an attacker bypasses the sidebar and handler via URL parameter tampering or state injection, the JSX branch blocks `<RaporView>` and displays the red fallback card.
   - *Inference*: Unauthorized teachers have 0 access paths to the Rapor view.

2. **Homeroom Teacher Access & Single-Class Enclosure**:
   - Based on observation 2 (`AppScreen.tsx:555, 488, 847`), teachers with `isWaliKelas === true` have the Rapor menu visible, can navigate freely, and mount `<RaporView user={user} assignedKelas={assignedKelas} />`.
   - Based on observation 2 (`RaporView.tsx:281-296`) and empirical server rendering, non-admin teachers cannot select different classes because no `<select>` element is rendered; the class indicator is a static text badge locked to `assignedKelas`.
   - *Inference*: Homeroom teachers receive seamless access to their assigned class while being strictly barred from viewing other classes.

3. **Administrative Authority**:
   - Based on observation 3 (`menuItemsAdmin:570`, `RaporView.tsx:281`), Admins and Superadmins have full access to Rapor and are provided with an active `<select>` dropdown populated by all classes in `data_siswa`.
   - *Inference*: Administrative oversight is fully preserved across the entire school.

4. **Information Leakage Prevention**:
   - Based on observation 5, student records, attendance figures, reflection notes, and print signatures all depend strictly on `selectedKelas` (which is locked to `assignedKelas` for homeroom teachers) and `sekolah_id`.
   - Empirical test `S5-03` confirmed that in-memory search filtering cannot match students outside the assigned class.
   - *Inference*: Zero leakage of unauthorized classes occurs across homeroom teachers or tenants.

---

## 3. Caveats

No caveats. All 5 criteria specified in the dispatch were tested empirically via automated test execution and server-side React markup analysis.

---

## 4. Conclusion

**Verdict: APPROVE**

The Wali Kelas Rapor Menu and Security Guards in `src/components/AppScreen.tsx` and `src/components/RaporView.tsx` meet all acceptance and security criteria:
- Unauthorized teachers are completely excluded from sidebar, intercepted on navigation, and blocked from component mounting.
- Authorized homeroom teachers can access Rapor for their assigned class with zero ability to switch or leak other classes.
- Administrators retain full school-wide class selection capabilities.
- Direct URL/history tampering attacks fail gracefully with an explicit security fallback card.
- All 28 adversarial assertions pass, TypeScript compiles with 0 errors, full project test suite passes, and production build succeeds.

---

## 5. Verification Method

To independently verify this evaluation, run the following commands in the workspace root:

```powershell
npx tsx tests/adversarial_rapor_wali_security.test.ts
npx tsc --noEmit
npx tsx tests/m4_academic_merdeka_rapor.test.ts
npm test
npm run build
```

**Files to Inspect**:
- `tests/adversarial_rapor_wali_security.test.ts` (Empirical adversarial test suite)
- `src/components/AppScreen.tsx` (lines 487-497, 555, 570, 846-867)
- `src/components/RaporView.tsx` (lines 46-48, 68-87, 98-103, 119-124, 281-296)
