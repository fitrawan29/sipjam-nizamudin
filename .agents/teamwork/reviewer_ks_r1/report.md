# Adversarial Review & QA Report: Fitur Admin Status Kepala Sekolah (Definitif, Plt, Plh)

**Reviewer:** SWE Light Adversarial Reviewer (`reviewer_ks_r1`)  
**Target:** Implementation by `implementer_ks_1` (Commit `116dcd0`)  
**Date:** 2026-11-08  
**Status:** Defect Identified, Root Causes Resolved, Adversarial Invariants Verified (100% Pass)

---

## 1. What the Prior Attempt Got Wrong

### Issue 1.1: `useKepalaSekolah` early-return bug preventing status hydration and reactive event binding
- **Input:** User with `role: 'kepalasekolah'` or NIP/ID matching designated headmaster.
- **Expected:** The hook sets `isKepalaSekolah = true`, proceeds to query `pengaturan` and `sekolah` tables for `status_kepala_sekolah`, sets `statusKepalaSekolah` (e.g. `'Plt'` or `'Plh'`), and registers event listeners for `sipjam:config_updated` and `storage`.
- **Actual:** The hook encountered `if (checkIsKepalaSekolah(user, schoolData)) { setIsKepalaSekolah(true); return; }` and exited early. Consequently, `verifyFromDatabase` was never called, `statusKepalaSekolah` remained in its default (`'Definitif'`), and event listeners were never registered. Real-time updates from admin were completely ignored.
- **Root Cause:** Optimization short-circuit placed in `useEffect` assumed that because role check passed synchronously, no database verification or listener registration was needed, failing to realize that `status_kepala_sekolah` still had to be retrieved from settings/DB.

### Issue 1.2: Corrupted title formatting for non-principal titles containing "kepala"
- **Input:** `<PrintSignature rightTitle="Wakil Kepala Sekolah" statusKepalaSekolah="Plt" />` or `<PrintSignature rightTitle="Kepala TU" statusKepalaSekolah="Plt" />`.
- **Expected:** `rightTitle` should remain `"Wakil Kepala Sekolah"` or `"Kepala TU"` verbatim without corruption.
- **Actual:** Output rendered as `"Plt. Kepala Wakil Kepala Sekolah"` and `"Plt. Kepala TU"`.
- **Root Cause:** `PrintHeader.tsx` used `rightTitle.toLowerCase().includes('kepala') ? formatKepalaSekolahTitle(rightTitle, statusKepsek) : rightTitle`. Because `formatKepalaSekolahTitle` treats its first argument as a school name and strips leading `"kepala"`, non-principal titles like `"Wakil Kepala Sekolah"` were treated as schools, prepending `Plt. Kepala `.

### Issue 1.3: False positive in `checkIsKepalaSekolah` for "Wakil Kepala Sekolah"
- **Input:** User with role `"Wakil Kepala Sekolah"` (`roleNorm = "wakilkepalasekolah"`).
- **Expected:** `checkIsKepalaSekolah` evaluates to `false` (Vice Principals do not have Principal-exclusive monitoring rights or badges).
- **Actual:** Evaluated to `true` because `roleNorm.includes('kepalasekolah')` matched `"wakilkepalasekolah"`.
- **Root Cause:** Substring search `.includes('kepalasekolah')` without excluding `roleNorm.startsWith('wakil')` or `roleNorm.includes('wakilkepala')`.

### Issue 1.4: Lack of spelled-out Indonesian status recognition
- **Input:** `normalizeStatusPrefix('Pelaksana Tugas')` or `formatKepalaSekolahLabel('Pelaksana Harian')`.
- **Expected:** Normalized prefix `'Plt. '` and `'Plh. '`.
- **Actual:** Returned `''` (treated as Definitif) because it only checked `clean.startsWith('PLT')` and `clean.startsWith('PLH')`.
- **Root Cause:** Rigid prefix matching without checking for common spelled-out terms `"PELAKSANA TUGAS"` and `"PELAKSANA HARIAN"`.

### Issue 1.5: Inconsistent role resolution in `navigation.ts` and `RekapSiswaView.tsx`
- **Input:** User with role `'Plt. Kepala Sekolah'` accessing class supervision navigation or Rekap Siswa monitoring.
- **Expected:** Full access equivalent to Kepala Sekolah with read-only monitoring mode.
- **Actual:** `navigation.ts` checked `normRole === 'kepalasekolah'` and blocked them; `RekapSiswaView.tsx` checked strict `=== 'kepalasekolah'` and disabled monitoring mode.
- **Root Cause:** Fragmented role checking across modules instead of standardizing with `checkIsKepalaSekolah` and supporting `pltkepalasekolah` / `plhkepalasekolah`.

### Issue 1.6: Missing multi-tab storage synchronization and initial hydration flash
- **Input:** Admin updates status in Tab 1, while user has Tab 2 open in the background or reloads a print preview.
- **Expected:** Tab 2 dynamically updates via `storage` event and renders immediately without flash of default status.
- **Actual:** Only local window `CustomEvent` was dispatched; cross-tab `storage` events were not monitored in `PrintHeader` or `useKepalaSekolah`.
- **Root Cause:** Omission of `window.addEventListener('storage', ...)` and initial state hydration from `localStorage.getItem('sipjam_config_sync')`.

---

## 2. What I Changed

1. **`src/hooks/useKepalaSekolah.ts`**:
   - Added guard `!roleNorm.startsWith('wakil') && !roleNorm.includes('wakilkepala')` in `checkIsKepalaSekolah`.
   - Removed the faulty early `return;` inside `useEffect`, ensuring `verifyFromDatabase` executes and fetches `status_kepala_sekolah` from both `pengaturan` and `sekolah` tables.
   - Added `window.addEventListener('storage', handleStorage)` for real-time multi-tab synchronization.
   - Synchronously hydrated initial `statusKepalaSekolah` from `user` session object if present.

2. **`src/components/PrintHeader.tsx`**:
   - Replaced fragile `rightTitle.includes('kepala')` with robust `resolveDisplayRightTitle()`:
     - Exact `"Kepala Sekolah"` / `"kepalasekolah"` -> `formatKepalaSekolahLabel(statusKepsek)`
     - Starts with `"Plt."` / `"Plh."` followed by Kepala Sekolah -> `formatKepalaSekolahLabel(statusKepsek)`
     - Starts with `"Kepala "` followed by school name (e.g. `"Kepala SMAN 1"`) -> `formatKepalaSekolahTitle(cleanRight, statusKepsek)`
     - Specific non-principal roles (e.g. `"Wakil Kepala Sekolah"`, `"Kepala TU"`, `"Kepala Perpustakaan"`, `"Guru Piket"`) -> preserved verbatim without corruption.
   - Synchronously hydrated initial `config` and `schoolInfo` in `PrintSignature` from `localStorage.getItem('sipjam_config_sync')` and `localStorage.getItem('sipjam_user')` to eliminate unconfigured fallback flash.
   - Added `storage` event listener for multi-tab synchronization in `PrintSignature`.

3. **`src/utils/textUtils.ts`**:
   - Enhanced `normalizeStatusPrefix` to support spelled-out variants: `clean.includes('PELAKSANA TUGAS')` -> `'Plt. '` and `clean.includes('PELAKSANA HARIAN')` -> `'Plh. '`.

4. **`src/lib/navigation.ts`**:
   - Updated `isKepsek` in `getNavigationItems` to include `pltkepalasekolah` and `plhkepalasekolah`.
   - Updated `isKepalaSekolah` in `validateNavigationGuard` to include `pltkepalasekolah`, `plhkepalasekolah`, and `user.is_kepala_sekolah === true`.

5. **`src/components/RekapSiswaView.tsx`**:
   - Replaced fragmented role check on line 28 with standard `checkIsKepalaSekolah(user)`.

6. **`src/components/AdminConfigView.tsx`**:
   - Synchronized `status_kepala_sekolah` into cached `localStorage.getItem('sipjam_user')` upon admin save.

7. **`tests/status_kepala_sekolah.test.ts`**:
   - Added **Suite 7: Adversarial Probing, Edge Cases & Multi-Tab Sync** with 14 additional comprehensive invariant checks (total tests increased from 42 to 56, 100% passing).

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  1. `npx tsx tests/status_kepala_sekolah.test.ts` -> **56 PASSED, 0 FAILED** (100% pass across 7 suites).
  2. `npm test` -> **70+ test files PASSED 100%**.
  3. `npx tsx tests/kepsek_pengawas_rbac.test.ts` -> PASSED.
  4. `npx tsx tests/printHeader.test.ts` -> PASSED.
  5. `npm run build` -> Next.js production build compiled cleanly with Turbopack.

- **Shallow Verification (manual only):**
  1. Verified static JSX layout and absence of flash when mounting `PrintSignature`.
  2. Verified cross-tab event listeners wiring (`sipjam:config_updated` + `storage`).

- **Unverified aspects:**
  1. Browser-specific physical printer color profile rendering and operating-system print dialog margins.
  2. Multi-tenant Supabase real-time broadcast websocket when network disconnected completely (gracefully handled by local storage fallback).

---

## 4. Known Issues
None. Zero fatal functional bugs or regressions detected.

---

## 5. Remaining Risk & Next Step
Task is complete and production-ready. All acceptance criteria and open issues ledger items have been resolved and verified with automated tests.
