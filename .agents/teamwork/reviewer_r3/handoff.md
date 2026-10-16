# Handoff Report - Adversarial Reviewer (Round 3)
**Task**: Perbaiki error Supabase PostgREST `Could not find the table 'public.sekolah_registry' in the schema cache` pada portal multi-sekolah SIPJAM
**Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`
**Reviewer Role**: reviewer@swe_light, qa@swe_light

---

## Executive Summary & Verdict
- **Verdict**: **APPROVED & BATTLE-HARDENED**
- All 3 requirements (R1 Graceful Fallback & Schema Resilience, R2 Standalone Migration & Schema Cache Reload Script, R3 Zero Regression & Test Preservation) are 100% verified.
- 5 new adversarial edge cases identified and comprehensively resolved in Round 3:
  1. **Legacy Instance Column Error (`mode_presensi_siswa`) on Create Fallback**: When inserting into legacy `public.sekolah` instances that predate `mode_presensi_siswa`, retries re-sent `mode_presensi_siswa: 'qr'`, causing `PGRST204`. Added a cascading fallback to clean `coreValues`.
  2. **Foreign Key Detachment Status Asymmetry on Delete**: On FK violations (`23503`), the fallback branch marked `status: 'nonaktif'`, but the primary registry branch omitted `status: 'nonaktif'` from the initial detachment update. Synchronized `status: 'nonaktif'` across all delete branches.
  3. **Dual ID / NPSN Invalidation of Active Target Scope**: If `activeTargetSchool` had a different UUID from `school.id` (e.g. from table mismatch) but shared the same NPSN, editing or deleting failed to update or clear the active target scope. Added dual ID and NPSN comparison.
  4. **Source Row Deduplication in SQL Migration Section 6b Backfill**: Section 6a used `DISTINCT ON` to prevent duplicate NPSN crashes, but Section 6b `UPDATE ... FROM public.sekolah` remained vulnerable to multi-row match indeterminism. Scoped Section 6b source to the same deduplicated subquery.
  5. **HTTP Response `statusText` Detection**: If a PostgREST error was wrapped in a fetch Response envelope where the error message was located in `statusText`, `isSchemaCacheOrMissingTableError` failed to detect it. Added `target.statusText` and `err.statusText` extraction.
- Automated test suites:
  - `tests/sekolah_registry_schema_cache_resilience.test.ts`: **40 / 40 assertions PASSED (100%)**
  - `tests/portal_induk_jaringan_multi_sekolah.test.ts`: **47 / 47 assertions PASSED (100%)**
  - Full test suite (`npm test`): **All 34 test suites PASSED (0 failures)**
  - Next.js production build (`npm run build`): **Compiled in 2.7s, 0 TypeScript errors, 12/12 static pages generated**

---

## 1. What the Prior Attempt Got Wrong (Adversarial Breakdown)

### Issue 1: Legacy Instance Missing `mode_presensi_siswa` on Create Fallback
- **Input**: Superadmin adds a satellite school on a deployment where `public.sekolah` has not run `20261004_add_mode_presensi_siswa_to_sekolah.sql` (lacks column `mode_presensi_siswa`).
- **Expected**: Fallback insert into `public.sekolah` strips missing columns and inserts clean `coreValues` without failing.
- **Actual**: Line 446 in `SuperadminView.tsx` retried `insert([{ ...coreValues, mode_presensi_siswa: 'qr' }])`. Since `mode_presensi_siswa` was missing, PostgREST returned `PGRST204`, triggering an unhandled error modal.
- **Root Cause**: The retry handler only stripped satellite columns (`vercel_url`, `supabase_url`, `supabase_anon_key`), but hardcoded `mode_presensi_siswa: 'qr'`.

### Issue 2: Foreign Key Detachment Status Asymmetry on Delete
- **Input**: Superadmin deletes a school that has relational data (teachers/students) when `sekolah_registry` exists.
- **Expected**: Detaches satellite credentials AND sets `status: 'nonaktif'` in `public.sekolah` so the school is marked non-operational.
- **Actual**: In the primary branch (line 750), `update({ vercel_url: null, supabase_url: null, supabase_anon_key: null })` omitted `status: 'nonaktif'`, leaving the school active in `public.sekolah`.
- **Root Cause**: `status: 'nonaktif'` was only added to the missing-table fallback branch (line 709) and omitted from line 750.

### Issue 3: Incomplete Active Target School Scope Invalidation on ID / NPSN Discrepancy
- **Input**: Superadmin is targeting a school whose `activeTargetSchool.id` originated from `public.sekolah`, and subsequently edits or deletes that school via `sekolah_registry` (which generates a distinct UUID).
- **Expected**: `activeTargetSchool` scope is updated or reset back to Global/Master because the school's NPSN matches.
- **Actual**: Lines 653 and 772 strictly checked `activeTargetSchool?.id === school.id`. Because `id` differed, the target scope was not updated on edit or cleared on delete.
- **Root Cause**: Strict ID-only equality check without evaluating dual NPSN matching.

### Issue 4: Source Multi-Row Indeterminism in SQL Migration Section 6b Backfill
- **Input**: Running `supabase/migrations/20261016_fix_sekolah_registry_schema_cache.sql` on a database where `public.sekolah` contained multiple records with the same NPSN.
- **Expected**: Section 6b executes deterministically against a deduplicated source set.
- **Actual**: Section 6b executed `UPDATE public.sekolah_registry r ... FROM public.sekolah s` directly without `DISTINCT ON`, causing non-deterministic multi-row updates.
- **Root Cause**: `DISTINCT ON` was applied to Section 6a (INSERT) but omitted from Section 6b (UPDATE).

### Issue 5: Untracked HTTP Response `statusText` in Detection Helper
- **Input**: Fetch error or custom PostgREST proxy response where `status: 404` and `statusText: "Not Found"` are passed without a body message.
- **Expected**: `isSchemaCacheOrMissingTableError` inspects `statusText` and detects missing table / relation.
- **Actual**: `message` string assembly ignored `statusText`, returning `false`.
- **Root Cause**: Helper only checked `target.message`, `target.error_description`, and `target.error`.

---

## 2. What I Changed

### 1. `src/lib/supabaseClient.ts`
- Added `target.statusText` and `err.statusText` to message unwrap logic in `isSchemaCacheOrMissingTableError`.

### 2. `src/components/SuperadminView.tsx`
- **`handleCreateSatellite`**:
  - Added secondary column resilience in fallback insert: if `retry` with `mode_presensi_siswa: 'qr'` fails with `PGRST204` / `42703`, automatically retries inserting pure `coreValues`.
  - Added the same cascading column resilience to the bidirectional sync block.
- **`handleEditSatelliteSchool`**:
  - Updated `activeTargetSchool` synchronization to check dual ID and NPSN: `activeTargetSchool?.id === school.id || (activeTargetSchool?.npsn && school.npsn && activeTargetSchool.npsn === school.npsn)`.
- **`handleDeleteSatelliteSchool`**:
  - Synchronized FK detachment: line 750 now sets `status: 'nonaktif'` alongside credential clearing, ensuring complete consistency with the fallback branch.
  - Updated `activeTargetSchool` clearing on delete to check dual ID and NPSN matching.

### 3. `supabase/migrations/20261016_fix_sekolah_registry_schema_cache.sql`
- Wrapped source table in Section 6b with `(SELECT DISTINCT ON (COALESCE(s_inner.npsn, s_inner.id::text)) s_inner.* FROM public.sekolah s_inner ORDER BY COALESCE(s_inner.npsn, s_inner.id::text), s_inner.id) s` for deterministic deduplication.

### 4. `tests/sekolah_registry_schema_cache_resilience.test.ts`
- Added Test 1.13: HTTP Response `statusText: 'Not Found'` detection.
- Added Test 2.11: Section 6b deduplicated source rows verification (`DISTINCT ON`).
- Added Test 3.14: Resilience when `mode_presensi_siswa` column is missing on create fallback.
- Added Test 3.15: Dual ID and NPSN matching for `activeTargetSchool` update and reset.
- Added Test 3.16: Uniform `status: 'nonaktif'` marking on foreign key constraint across all branches.
- Total assertions increased to 40 / 40 passed (100%).

---

## 3. Verification Record

### Deep Verification (ran actual tests)
1. **Schema Cache Resilience Test Suite**:
   - Command: `npx tsx tests/sekolah_registry_schema_cache_resilience.test.ts`
   - Result: **40 / 40 assertions PASSED (100%)**
2. **Portal Induk Jaringan Multi-Sekolah Test Suite**:
   - Command: `npx tsx tests/portal_induk_jaringan_multi_sekolah.test.ts`
   - Result: **47 / 47 assertions PASSED (100%)**
3. **Full Repository Test Suite**:
   - Command: `npm test`
   - Result: **All 34 test suites PASSED (0 failures)**
4. **Next.js Production Build & TypeScript Compiler**:
   - Command: `npm run build`
   - Result: **Compiled successfully in 2.7s, 0 TypeScript errors, 12/12 static pages generated**

### Shallow Verification (manual only)
- Verified SQL Editor instructions and migration script formatting for idempotency.
- Verified SweetAlert2 dialog flows and error handling logic for CRUD Superadmin operations.

### Unverified Aspects
- Live cloud socket latency of `NOTIFY pgrst, 'reload schema'` on heavily throttled Supabase free-tier micro-instances (100-300ms typical).
- High-concurrency race where table `sekolah_registry` is created mid-flight while a user is submitting an update request.

---

## 4. Known Issues
- `Minor Robustness Risk`: In an air-gapped environment without internet access, calling external satellite Supabase URLs will experience network timeout, which is already handled via try-catch and status indicators.

---

## 5. Remaining Risk & Next Step
- Complete requirements R1, R2, and R3 are satisfied with high confidence.
- All edge cases, column regressions, and duplicate collations are addressed.
- Next step: Hand off to orchestrator and sentinel for victory audit and sign-off.
