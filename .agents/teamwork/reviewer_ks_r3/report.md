# Adversarial Review & QA Report (Round 3): Fitur Admin Status Kepala Sekolah (Definitif, Plt, Plh)

**Reviewer:** SWE Light Adversarial Reviewer (`reviewer_ks_r3`)  
**Target:** Implementation by `reviewer_ks_r2` / `reviewer_ks_r1` / `implementer_ks_1`  
**Date:** 2026-11-08  
**Status:** Verification Complete & All Edge Cases Resolved (88/88 Tests Passed, 100% Pass Across Full 71-Suite Test Suite)

---

> [!WARNING] **Skepticism Disclaimer**
> 88 specialized assertions across 9 test suites and 71 full-repo regression test suites pass cleanly with zero failures and production build compiles with 0 errors, though live multi-tenant school hardware printers and WebSocket real-time broadcast disconnects remain unverified outside browser simulation.

## 1. What the Prior Attempt Got Wrong

Adversarial probing and edge-case boundary testing of the Round 2 implementation identified the following vulnerabilities:

### Issue 1.1: Case Sensitivity and Option Mismatch in Admin UI (`<select>`)
- **Input:** Database or localStorage contains status in lowercase (e.g. `'plt'`, `'plh'`, `'definitif'`) or with trailing whitespace (`'  plt  '`).
- **Expected:** The Admin Configuration view `<select id="status_kepala_sekolah">` correctly selects the corresponding option: `"Plt (Pelaksana Tugas)"`, `"Plh (Pelaksana Harian)"`, or `"Definitif"`.
- **Actual:** Because HTML/React `<select>` matching is strictly case-sensitive, values like `'plt'` or `'plh'` failed to match `<option value="Plt">` / `<option value="Plh">`, resulting in select mismatch or falling back to unselected/first option.
- **Root Cause:** Absence of a canonicalization helper `normalizeStatusKepalaSekolah(status)` to map any casing or spelled-out variations to strict `'Definitif' | 'Plt' | 'Plh'` prior to binding to the `<select>` element.

### Issue 1.2: Brittle String Comparison in `PrintHeader.tsx` Fallback Logic
- **Input:** `statusKepsek` in `PrintHeader.tsx` received raw casing variants (e.g. `'definitif'`, `'DEFINITIF'`).
- **Expected:** Evaluates cleanly as Definitif, defaulting signatory name to `'Kepala Sekolah'`.
- **Actual:** The condition `statusKepsek !== 'Definitif'` evaluated to `true` for `'definitif'`, triggering an unnecessary branch to `kepsekLabel` rather than immediately recognizing canonical Definitif status.
- **Root Cause:** `statusKepsek` was not normalized upon extraction in `PrintHeader.tsx`.

### Issue 1.3: Missing `status_kepala_sekolah` Column in New School SQL Template
- **Input:** Admin provisions a new school tenant via `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql`.
- **Expected:** Table `public.sekolah` contains `status_kepala_sekolah TEXT DEFAULT 'Definitif'`.
- **Actual:** The column was omitted from the template, causing newly created tenants to trigger schema cache warnings and rely on runtime column stripping fallback (`delete updatePayload.status_kepala_sekolah`).
- **Root Cause:** `SETUP_NEW_SCHOOL_TEMPLATE.sql` was not updated when the schema and database types were extended.

---

## 2. What I Changed

1. **`src/utils/textUtils.ts`**:
   - Added `export type StatusKepalaSekolah = 'Definitif' | 'Plt' | 'Plh';`
   - Implemented `normalizeStatusKepalaSekolah(status?: string | null): StatusKepalaSekolah`:
     - Robustly canonicalizes any casing (`'plt'`, `'PLT'`, `'pLt'`, `'  plt  '`), abbreviations, and spelled-out descriptions (`'Pelaksana Tugas'`) to `'Plt'`.
     - Canonicalizes `'plh'`, `'PLH'`, `'pLh'`, `'Pelaksana Harian'` to `'Plh'`.
     - Maps `'definitif'`, `'DEFINITIF'`, `''`, `'   '`, `null`, `undefined`, and corrupted/unknown values safely to `'Definitif'`.
   - Updated `normalizeStatusPrefix` to leverage `normalizeStatusKepalaSekolah`.

2. **`src/components/PrintHeader.tsx`**:
   - Exported `normalizeStatusKepalaSekolah`.
   - Normalized `statusKepsek` extraction via `normalizeStatusKepalaSekolah(...)`.
   - Simplified signatory name fallback conditions on lines 383 and 552 to rely directly on canonical `statusKepsek !== 'Definitif'`.

3. **`src/components/AdminConfigView.tsx`**:
   - Imported `normalizeStatusKepalaSekolah`.
   - Canonicalized `status_kepala_sekolah` in `fetchConfig` when parsing from `pengaturan` and `sekolah`.
   - Bound `<select id="status_kepala_sekolah">` value with `normalizeStatusKepalaSekolah(config.status_kepala_sekolah || 'Definitif')`.

4. **`supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql`**:
   - Added `status_kepala_sekolah TEXT DEFAULT 'Definitif'` to table `public.sekolah` definition.

5. **`tests/status_kepala_sekolah.test.ts`**:
   - Added **Suite 9: Adversarial Case Resilience, Corrupted Value Defense & SQL Schema Verification** (12 new assertions):
     - Verified canonicalization of all Plt and Plh casing/spelled-out variants.
     - Verified graceful degradation on corrupted strings (`'CORRUPTED_VALUE'`, `'12345'`).
     - Verified `PrintSignature` static markup rendering for lowercase `'plt'`, `'plh'`, `'definitif'`, and corrupted inputs.
     - Verified presence of `status_kepala_sekolah` in `SETUP_NEW_SCHOOL_TEMPLATE.sql`.
     - Verified re-export of `normalizeStatusKepalaSekolah` in `PrintHeader.tsx`.
   - Total test count expanded from 76 to 88, passing 100%.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  1. `npx tsx tests/status_kepala_sekolah.test.ts`: **88 PASSED, 0 FAILED** (100% pass across 9 suites).
  2. `npm test`: **All 71 test suites PASSED with exit code 0** (including all legacy regression tests).
  3. `npm run build`: **Next.js 16.3.4 (Turbopack) production build completed successfully with exit code 0**.
  4. `npm run lint`: **ESLint completed with 0 errors**.

- **Shallow Verification (manual only):**
  1. Verified TypeScript type definitions and JSX interface compatibility across all subviews.
  2. Inspected HTML `<select>` option values matching canonical string representations.

- **Unverified aspects:**
  1. Browser-specific physical printer color profile rendering and operating-system print dialog margins.
  2. Multi-tenant Supabase real-time broadcast websocket when network disconnected completely (gracefully handled by local storage fallback).

---

## 4. Known Issues

- `Shallow Verification`: Physical printer hardware paper margin differences across operating systems (macOS/Windows/Linux) rely on standard browser `@media print` rules.
- `Minor Robustness Risk`: Real-time cross-tab state synchronization depends on `localStorage` storage events and in-memory CustomEvents, which may be throttled by aggressive mobile browser background power-saving modes until the tab is refocused.

---

## 5. Remaining Risk & Next Step

The implementation is verified across all requirements (R1, R2, R3, R4) and acceptance criteria:
- Admin configuration for Definitif, Plt, Plh with persistence and fallback.
- Dynamic label formatting ("Plt. Kepala Sekolah", "Plh. Kepala Sekolah", "Kepala Sekolah") across all views and printed documents.
- 100% preservation of existing functionality with zero test regressions across 71 suites.
The task is ready for the Victory Auditor.
