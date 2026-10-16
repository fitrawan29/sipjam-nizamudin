# Handoff Report - Adversarial Reviewer (Round 2)
**Task**: Perbaiki error Supabase PostgREST `Could not find the table 'public.sekolah_registry' in the schema cache` pada portal multi-sekolah SIPJAM
**Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`
**Reviewer Role**: reviewer@swe_light, qa@swe_light

---

## Executive Summary & Verdict
- **Verdict**: **APPROVED & HARDENED**
- All 3 requirements (R1 Graceful Fallback & Schema Resilience, R2 Standalone Migration & Schema Cache Reload Script, R3 Zero Regression & Test Preservation) are 100% verified.
- 4 critical adversarial edge cases identified and completely fixed:
  1. **Chained Column Error + Duplicate NPSN Crash on Create**: If `public.sekolah` lacked satellite columns and had a duplicate NPSN, updating on conflict re-sent satellite columns and triggered fatal uncaught `PGRST204` modal.
  2. **Uncaught Native PostgreSQL Relation Errors in Detection Helper**: `isSchemaCacheOrMissingTableError` failed to detect native PostgreSQL `relation "public.sekolah_registry" does not exist` when thrown without the `42P01` code property.
  3. **Foreign Key Constraint Column Crash on Detachment**: When foreign key violations (`23503`) occurred on delete, detaching credentials with satellite fields failed if `sekolah` had not yet migrated those columns.
  4. **SQL Migration Backfill Duplicate NPSN Collision**: Backfill in Section 6 previously crashed if `public.sekolah` contained multiple rows with duplicate NPSN.
- All 34 test suites passed with 0 errors (`npm test`).
- Production build and TypeScript validation passed cleanly (`npm run build`).

---

## 1. What the Prior Attempt Got Wrong (Adversarial Breakdown)

### Issue 1: Chained Column Error & Duplicate NPSN Crash on Create
- **Input**: Superadmin adds a satellite school whose NPSN already exists in `public.sekolah`, on an instance where `public.sekolah` does not yet have `vercel_url` / `supabase_url` columns.
- **Expected**: `handleCreateSatellite` falls back to `public.sekolah`, intercepts column error, falls back to `coreValues`, catches duplicate NPSN (`23505`), updates existing record using column-safe `coreValues`, and completes without modal error.
- **Actual**: Line 453 attempted `update(formValues)`. Since `formValues` retained un-migrated columns (`vercel_url`, `supabase_url`, `supabase_anon_key`), PostgREST returned `PGRST204`, which was uncaught and threw `Gagal menyimpan sekolah satelit` error modal.
- **Root Cause**: `update(formValues)` on conflict did not strip satellite columns when `sekolah` was un-migrated.

### Issue 2: False Negative in `isSchemaCacheOrMissingTableError` for Native PostgreSQL Errors
- **Input**: Native JS Error or Supabase response with message `'relation "public.sekolah_registry" does not exist'` or `'table "public.sekolah_registry" does not exist'` where `err.code` was omitted or undefined.
- **Expected**: Helper returns `true` and triggers schema cache / table missing fallback.
- **Actual**: Returned `false` because it only checked `code === '42P01'` or messages containing `'schema cache'`.
- **Root Cause**: Rigid pattern matching requiring either explicit error code or the exact substring `'schema cache'`.

### Issue 3: Missing Column Crash During Foreign Key Detachment on Delete
- **Input**: Superadmin deletes a school that has relational data (teachers/students) on an instance where `sekolah` does not have `vercel_url` / `supabase_url` columns.
- **Expected**: Intercepts `23503` (foreign key violation), safely detaches credentials, and sets `status: 'nonaktif'` without throwing error modal.
- **Actual**: `update({ vercel_url: null, ... })` failed with `PGRST204` because `vercel_url` did not exist on `sekolah`.
- **Root Cause**: Detachment logic did not intercept missing column errors (`PGRST204` / `42703`) and retry with `{ status: 'nonaktif' }`.

### Issue 4: Source Deduplication in SQL Migration Backfill
- **Input**: Executing `supabase/migrations/20261016_fix_sekolah_registry_schema_cache.sql` on a database where `public.sekolah` had duplicate NPSN entries.
- **Expected**: Migration completes idempotently without crashing.
- **Actual**: `INSERT INTO public.sekolah_registry` selected both duplicate rows, triggering unique constraint violation on `sekolah_registry.npsn`.
- **Root Cause**: Lack of `DISTINCT ON (COALESCE(s_inner.npsn, s_inner.id::text))` deduplication in source query.

---

## 2. What I Changed

### 1. `src/lib/supabaseClient.ts`
- Broadened `isSchemaCacheOrMissingTableError`:
  - Added detection for native PostgreSQL messages: `'does not exist'`, `'not exist'`, `'not found'`, `'undefined table'`, `'undefined_table'`, `'could not find the relation'`.
  - Scoped to `sekolah_registry` references across `rawStr`, `message`, `details`, and `jsonStr` to avoid false positives on unrelated errors.

### 2. `src/components/SuperadminView.tsx`
- **`fetchSchools`**: Safely unwraps error messages in warning logs (`regErr?.message || regErr?.error?.message`).
- **`handleCreateSatellite`**:
  - Chained resilience: If unique NPSN violation (`23505`) occurs on create fallback, updates using `formValues`, and if that hits `PGRST204` column error, automatically retries with stripped `coreValues`.
  - Bidirectional sync: When `sekolah_registry` insert succeeds, synchronizes to `public.sekolah` with duplicate NPSN update and column-safe fallback.
- **`handleEditSatelliteSchool`**:
  - Dual ID and NPSN update synchronization on fallback.
  - Updates `coreValues` by NPSN when ID does not match rows.
  - Synchronizes `coreValues` to `public.sekolah` even when `sekolah` lacks satellite columns.
- **`handleDeleteSatelliteSchool`**:
  - Dual ID and NPSN deletion attempts.
  - If FK constraint (`23503`) blocks deletion, detaches credentials by ID and NPSN; if satellite columns are missing (`PGRST204`), safely marks `status: 'nonaktif'`.

### 3. `src/components/AppScreen.tsx`
- Safely unwraps error messages in switcher fallback warning log.

### 4. `supabase/migrations/20261016_fix_sekolah_registry_schema_cache.sql`
- Added idempotent `status` column check on `public.sekolah`.
- Added `DISTINCT ON (COALESCE(s_inner.npsn, s_inner.id::text))` to backfill query to prevent unique constraint crashes.
- Added case-safe status normalization (`CASE WHEN lower(...) = 'nonaktif' THEN 'nonaktif' ELSE 'aktif' END`).

### 5. `tests/sekolah_registry_schema_cache_resilience.test.ts`
- Added test cases 1.9 to 1.12 (native PostgreSQL errors, table not found, relation phrasing).
- Added test cases 2.8 to 2.10 (deduplication, status column idempotency, case-safe status).
- Added test cases 3.10 to 3.13 (chained create fallback, bidirectional sync, dual edit sync, safe FK detachment).
- Total assertions increased to 35 / 35 passed (100%).

---

## 3. Verification Record

### Deep Verification (ran actual test suites)
1. **Schema Cache Resilience Test**:
   `npx tsx tests/sekolah_registry_schema_cache_resilience.test.ts`
   -> **35 / 35 assertions PASSED (100%)**
2. **Multi-Sekolah Portal Induk Test**:
   `npx tsx tests/portal_induk_jaringan_multi_sekolah.test.ts`
   -> **47 / 47 assertions PASSED (100%)**
3. **Full Repository Test Suite**:
   `npm test`
   -> **All 34 test suites PASSED (0 failures)**
4. **Next.js Production Build & TypeScript Check**:
   `npm run build`
   -> **Compiled successfully in 3.2s, 0 TypeScript errors, 12/12 static pages generated**

---

## 4. Known Issues
- `Minor Robustness Risk`: In an air-gapped environment without internet access, calling external satellite Supabase URLs will experience network timeout, which is already handled via try-catch and status indicators.

---

## 5. Remaining Risk & Conclusion
- Complete requirements R1, R2, and R3 are satisfied.
- The solution is completely hardened and production-ready.
- Next step: Ready for sentinel verification and release.
