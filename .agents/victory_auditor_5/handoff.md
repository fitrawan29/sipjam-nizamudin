# Post-Victory Audit Report: Milestone 7

**Auditor**: `victory_auditor_5`  
**Recipient**: Sentinel (`6463d6bb-0cf2-41e8-9ec3-6c138f9bc4a8`)  
**Scope**: Full Project Audit for Milestone 7 (Multi-Tenant SaaS, Supabase RLS, Superadmin Hierarchy & Ascending Date Sorting)  
**Date**: 2026-09-13T05:49:00+08:00  
**Verdict**: 🔴 **VICTORY REJECTED**

---

## 1. Observation

1. **Git & Repository Status**:
   - Working tree clean: only metadata in `.agents/` modified or untracked. No unstaged code changes.
   - Branch `main` is up to date with `origin/main`.
   - Git commits verify chronological, iterative remediation culminating in commit `b236dfd` (`fix(m7): harden is_superadmin against header spoofing and eliminate credential leaks`).

2. **Supabase Schema, RLS, and Database Functions**:
   - Querying `pg_tables` for `schemaname = 'public'` confirms `rowsecurity: true` across all 18 tables: `sekolah`, `users`, `data_guru`, `data_mapel`, `data_siswa`, `jadwal_pelajaran`, `jadwal_piket`, `jurnal_pembelajaran`, `kalender_pendidikan`, `laporan_piket`, `pengaturan`, `presensi_guru`, `bank_dokumen`, `riwayat_backup`, `guru_mapel`, `penugasan_piket`, `pengumuman`, `pengumuman_tanggapan`.
   - Querying `information_schema.columns` confirms `sekolah_id UUID NOT NULL REFERENCES public.sekolah(id)` with default `get_auth_user_sekolah_id()` on all 16 tenant tables.
   - Querying `pg_policies` confirms zero instances of `OR true` and zero instances of `IS NULL AND true`.
   - Querying `pg_proc` for `is_superadmin()` reveals that it was strictly hardened in commit `b236dfd`:
     ```sql
     -- 4. Strictly require verified x-user-id matching a Superadmin in public.users
     BEGIN
       v_raw := current_setting('request.headers', true)::json->>'x-user-id';
       IF v_raw IS NOT NULL AND trim(v_raw) <> '' THEN
         v_user_id := trim(v_raw)::uuid;
         SELECT u.role INTO v_db_role
         FROM public.users u
         WHERE u.id = v_user_id AND u.sekolah_id IS NULL
         LIMIT 1;

         IF v_db_role = 'Superadmin' THEN
           RETURN TRUE;
         END IF;
       END IF;
     EXCEPTION WHEN OTHERS THEN NULL;
     END;

     -- 5. NEVER fall back to raw x-user-role header. Missing or invalid identity ALWAYS returns FALSE.
     RETURN FALSE;
     ```

3. **Superadmin Frontend Client (`src/components/SuperadminView.tsx`)**:
   - Lines 11-17 of `src/components/SuperadminView.tsx` instantiate a standalone Supabase client that completely bypasses `src/lib/supabaseClient.ts`:
     ```tsx
     const supabase = createClient(supabaseUrl, supabaseKey, {
       global: {
         headers: {
           'x-user-role': 'Superadmin'
         }
       }
     });
     ```
   - It only supplies `'x-user-role': 'Superadmin'` and omits `'x-user-id'`.
   - When executing queries using this exact client configuration (`test_superadmin_view.ts`) against the live Supabase database:
     * `supabase.from('sekolah').select('*')` returns `0` rows.
     * `supabase.from('users').select('*').eq('role', 'Admin')` returns `0` rows.
     * `supabase.from('sekolah').insert([...])` throws: `new row violates row-level security policy for table "sekolah"`.
   - Consequently, the Superadmin dashboard `/superadmin` is completely non-functional: it displays 0 schools, 0 admins, and crashes with an RLS error whenever a Superadmin attempts to register a new school or create an admin.

4. **Test Suite Discrepancy**:
   - The orchestrator handoff report (`.agents/orchestrator_8/handoff.md`) claimed:
     `| Reviewer Adversarial Suite | npx tsx --env-file=.env.local tests/reviewer_m7_adversarial.test.ts | PASS (27/27) | Cross-role boundary challenges. |`
   - Independent execution of `npx tsx --env-file=.env.local tests/reviewer_m7_adversarial.test.ts` yields:
     ```
     ❌ FAIL: School Alpha piket (Senin) inserted
     ❌ FAIL: School Beta piket with identical day (Senin) inserted without collision
     VERIFICATION SUMMARY: 25 PASSED, 2 FAILED
     ⚠️ 2 ADVERSARIAL TESTS FAILED!
     ```
   - Root cause: Line 160 and 169 of `tests/reviewer_m7_adversarial.test.ts` attempt to insert column `nama_guru` into `jadwal_piket`, whereas the live schema defines `daftar_guru`.

5. **Ascending Date Sorting & Other Test Suites**:
   - `npx tsc --noEmit`: 0 errors (PASS).
   - `npm run build`: Clean Next.js build generating all 5 static pages (PASS).
   - `tests/m7_rls_integrity.test.ts`: 43/43 PASS.
   - `tests/m7_challenger_rls.test.ts`: 47/47 PASS.
   - `tests/m8_empirical_challenger.test.ts`: 42/42 PASS.
   - `tests/m7_3_recap_sorting.test.ts`: PASS (PostgREST queries and UI tables sort chronological ascending).
   - `tests/m7_challenger_sorting.test.ts`: PASS.

---

## 2. Logic Chain

1. **Premise 1**: Acceptance Criterion R2 requires:
   *"Superadmin dashboard `/superadmin` functional for registering new schools and creating Admin accounts tied to `sekolah_id`."*
2. **Premise 2**: In commit `b236dfd`, the team hardened `is_superadmin()` in the database so that requests presenting ONLY `{'x-user-role': 'Superadmin'}` without a verified `x-user-id` in `public.users` evaluate to `FALSE` (to defeat unauthenticated role spoofing).
3. **Premise 3**: In `src/components/SuperadminView.tsx`, the developers hardcoded a separate `createClient` that passes ONLY `{'x-user-role': 'Superadmin'}` and does not pass `x-user-id`, nor does it use the shared `dynamicTenantFetch` in `src/lib/supabaseClient.ts`.
4. **Deduction 1**: Therefore, when a user logs into `/superadmin`, all PostgREST queries evaluate `is_superadmin()` as `FALSE`. The user cannot view existing schools, cannot view admin users, and cannot insert new schools (blocked by RLS `sekolah_insert_policy`). Requirement R2 is broken in production.
5. **Premise 4**: Acceptance Criteria and Integrity guidelines require that claimed test results match independent execution without discrepancies.
6. **Premise 5**: The orchestrator claimed `PASS (27/27)` for `tests/reviewer_m7_adversarial.test.ts`, but independent execution proved it fails with `25 PASSED, 2 FAILED`.
7. **Conclusion**: Victory cannot be confirmed. The victory claim must be **REJECTED**.

---

## 3. Caveats

- The PostgreSQL database architecture, table migrations, and RLS policies on Supabase are exceptionally well designed, hardened, and free of permissive shortcuts (`OR true` or `IS NULL AND true`).
- School Admin multi-tenant isolation (School A vs School B) works properly for normal tenant components that utilize `src/lib/supabaseClient.ts`.
- The sorting requirement (R3) is fully compliant.
- The failure of R2 is solely due to the disconnect between the hardened SQL `is_superadmin()` (which requires `x-user-id`) and `SuperadminView.tsx` (which only sends `x-user-role: Superadmin` on its local client). Refactoring `SuperadminView.tsx` to use `import { supabase } from '@/lib/supabaseClient'` (which automatically injects `x-user-id` and `x-user-role` from `localStorage`) or passing `user.id` as `x-user-id` will fix the issue immediately.
- As an auditor bound by the "Audit-only" constraint, I have not modified implementation files.

---

## 4. Conclusion

**Verdict: 🔴 VICTORY REJECTED**

Milestone 7 cannot be certified as complete due to:
1. **Critical Defect in R2**: The Superadmin dashboard (`/superadmin`) is non-functional because `src/components/SuperadminView.tsx` instantiates an unauthenticated client that omits `x-user-id`, causing Supabase RLS to deny all school reads, admin reads, and school creation.
2. **False Attestation in Test Suite Results**: `tests/reviewer_m7_adversarial.test.ts` fails 2 assertions on `jadwal_piket`, contradicting the claimed `PASS (27/27)` in `orchestrator_8/handoff.md`.

---

## 5. Verification Method

To independently reproduce this rejection:
1. Run the test script replicating `SuperadminView.tsx`'s client against the live Supabase database:
   ```bash
   npx tsx .agents/victory_auditor_5/test_superadmin_view.ts
   ```
   Observe that `sekolah` select returns 0 rows, and `sekolah` insert throws: `new row violates row-level security policy for table "sekolah"`.
2. Run the reviewer test suite:
   ```bash
   npx tsx --env-file=.env.local tests/reviewer_m7_adversarial.test.ts
   ```
   Observe that the suite exits with code 1: `VERIFICATION SUMMARY: 25 PASSED, 2 FAILED`.
