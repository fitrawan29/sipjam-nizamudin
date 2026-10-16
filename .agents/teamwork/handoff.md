# Sentinel Handoff Report — Multi-Sekolah Supabase PostgREST Schema Cache Resilience & Migration

## Observation
- Superadmin portal operations (query, insert, update, delete) in `SuperadminView.tsx` and the multi-school switcher in `AppScreen.tsx` previously depended directly on `public.sekolah_registry`.
- In Supabase deployments where `sekolah_registry` has not yet been migrated or where PostgREST has not reloaded its schema cache, PostgREST returns `PGRST205` ("Could not find the table 'public.sekolah_registry' in the schema cache") or PostgreSQL error `42P01` ("undefined_table"), causing fatal modal dialogs or blocking operations.
- The user requested resilient graceful fallback to `public.sekolah` when `public.sekolah_registry` is missing/un-cached, and a standalone idempotent SQL migration script with `NOTIFY pgrst, 'reload schema';`.

## Logic Chain
1. **Helper & Error Detection (`src/lib/supabaseClient.ts`)**:
   - Implemented `isSchemaCacheOrMissingTableError(err)` detecting `PGRST205`, `42P01`, `PGRST200`, `PGRST204`, wrapped Postgres error envelopes, and string patterns like "could not find the table" and "schema cache".
2. **Resilient Fallback Mechanics (`src/components/SuperadminView.tsx` & `src/components/AppScreen.tsx`)**:
   - Query: When fetching registered schools fails with a schema cache or missing table error, the application automatically falls back to fetching from `public.sekolah` without blocking the UI or alerting fatal errors.
   - Insert: When inserting into `sekolah_registry` fails due to schema cache issues, it creates the school record directly in `public.sekolah`. If the remote table lacks satellite-specific columns, it strips un-migrated columns gracefully.
   - Update: If updating `sekolah_registry` fails due to schema cache issues, it updates `public.sekolah` (using ID or NPSN). Also coordinates active school target state scope synchronization.
   - Delete: If deleting from `sekolah_registry` fails due to schema cache issues, it safely deletes from `public.sekolah`, including handling foreign key dependency detachment (`23503`).
3. **Standalone SQL Migration (`supabase/migrations/20261016_fix_sekolah_registry_schema_cache.sql`)**:
   - Idempotent `CREATE TABLE IF NOT EXISTS public.sekolah_registry`.
   - Enabled RLS with unrestricted policy (`anon`, `authenticated`, `service_role`).
   - Created performance indexes on `npsn`, `nama`, `is_active`, `kota_kabupaten`.
   - Seeded existing schools from `public.sekolah` using `DISTINCT ON (npsn)` deduplication.
   - Sent PostgreSQL notification `NOTIFY pgrst, 'reload schema';` to reload the PostgREST schema cache immediately.
4. **Verification & Audit**:
   - Created comprehensive test suite `tests/sekolah_registry_schema_cache_resilience.test.ts` (40/40 assertions passed).
   - Preserved canonical suite `tests/portal_induk_jaringan_multi_sekolah.test.ts` (47/47 assertions passed).
   - Ran repository test suite `npm test` (34/34 suites passed, 100%).
   - Ran build `npm run build` (Exit code 0, 0 TypeScript errors).
   - Independent Sentinel Victory Auditor verified timeline, integrity, and test execution, returning `VERDICT: VICTORY CONFIRMED`.

## Caveats
- When executing the migration script `20261016_fix_sekolah_registry_schema_cache.sql` in Supabase SQL Editor on a heavily loaded remote cluster, PostgREST may take up to 200–500ms to reload its schema cache. The frontend fallback ensures seamless operation during this window.
- If a custom remote database schema modifies core columns of `public.sekolah` (e.g. omitting `kota_kabupaten`), the fallback column-stripping mechanism ensures compatibility.

## Conclusion
- All requirements R1, R2, and R3 are satisfied.
- Both `SuperadminView.tsx` and `AppScreen.tsx` operate robustly whether `sekolah_registry` exists or not.
- Standalone migration script is available in `supabase/migrations/20261016_fix_sekolah_registry_schema_cache.sql`.
- Independent victory audit confirmed with 100% test pass.

## Verification Method
- Canonical Multi-School Tests: `npx tsx tests/portal_induk_jaringan_multi_sekolah.test.ts` -> 47/47 assertions passed (100%).
- Schema Cache Resilience Tests: `npx tsx tests/sekolah_registry_schema_cache_resilience.test.ts` -> 40/40 assertions passed (100%).
- Full Project Suite: `npm test` -> 34/34 test suites passed (100%).
- Production Build: `npm run build` -> 0 errors, 12/12 routes generated.
- Independent Audit: `teamwork_preview_victory_auditor` -> VERDICT: VICTORY CONFIRMED.
