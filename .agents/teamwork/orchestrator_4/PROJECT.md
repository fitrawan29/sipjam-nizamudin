# Project: SIPJAM Data Access Recovery

## Architecture
- **Framework**: Next.js 16 SPA (`src/app/page.tsx`, `src/components/AppScreen.tsx`)
- **Backend/DB**: Supabase PostgreSQL with custom auth RPC (`verify_login`) and multi-tenant Row Level Security (RLS).
- **Authentication & Tenant Propagation**:
  - `LoginScreen.tsx` calls `verify_login(p_username, p_password)`.
  - Stored in `localStorage['sipjam_user']` with fields `{ id, username, nama, role, sekolah_id, session_token }`.
  - `src/lib/supabaseClient.ts` intercepts requests via `dynamicTenantFetch`, injecting `x-sekolah-id`, `x-user-role`, `x-user-id`, and `x-session-token`.
  - Database RLS helpers `get_auth_user_sekolah_id()`, `get_auth_user_role()`, and `get_auth_user_id()` resolve tenant access strictly from verified `x-session-token` or service_role/JWT.
- **Role Scopes**:
  - Superadmin (`role = 'Superadmin'`, `sekolah_id = NULL`): Platform management across all schools.
  - Admin (`role = 'Admin'`, scoped to `sekolah_id`): School configuration, user management, student data (`data_siswa`), attendance recap, and verifications.
  - Guru / Teacher (`role = 'Guru'`, scoped to `sekolah_id`): Daily gatekeeper workflow (`getGuruDailyState`), attendance (`presensi_guru`), teaching journals (`jurnal_pembelajaran`), schedule (`jadwal_pelajaran`), student grades, and homeroom (`wali_kelas`).
  - Siswa / Student: Master records in `data_siswa`, attendance in `absensi`, scores in `nilai_siswa`. Accessed and managed by school staff (Admin & Guru).

## Root Cause Diagnosis
1. **RLS Token Gating on Stored Sessions**: Pre-migration sessions in `localStorage` lack `session_token`. `get_auth_user_sekolah_id()` returns `NULL`, causing all tenant queries to return 0 rows for Admin and Guru. Fixed via session purge and clean re-login.
2. **PostgREST Column Name Mismatch**: `workflow.ts:217`, `AppScreen.tsx:108`, `RekapJurnalView.tsx:92` queried non-existent columns `nama` and `username` on `data_guru` instead of `nama_guru` and `nip`. Fixed by updating column names across queries.
3. **PostgREST Filter Syntax Breakage on Commas**: `GuruJurnal.tsx:105` and `HomeView.tsx:207` used `.or()` without quoting/sanitizing teacher names, crashing queries for teachers with academic titles (e.g. `"Tika Mamonto, S.Pd."`) with `PGRST100`. Fixed by quoting and splitting degrees.
4. **Relational Disconnection & Schedule Truncation**: Migration `20260926_add_uuid_fkeys.sql` left 48 of 51 rows in `jadwal_pelajaran` with `user_id = NULL`. `workflow.ts:findJadwalForGuru` prematurely dropped unlinked schedules when any UUID match existed. Fixed by combining UUID + fuzzy matches and backfilling 51/51 schedules.
5. **Direct REST Fallback Header Omission**: `AdminDataView.tsx:78-95` omitted `x-session-token` in fallback `fetch()`. Fixed by propagating active session headers.
6. **Anti-Spoofing Vulnerability**: Unauthenticated requests providing only `x-user-id` bypassed session token gating. Fixed by removing unauthenticated `x-user-id` fallbacks in `20260926_secure_rls_helpers.sql` and live Supabase functions.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | RLS Session Token & Stored Session Auto-Recovery | Sessions lacking valid `session_token` cleanly purged and prompted for re-login; RLS helper functions validate session tokens securely | M1 | Survey O1, O4 |
| 2 | PostgREST Column Name Alignment on `data_guru` | Fixed all references querying `data_guru.nama` or `data_guru.username` to use `nama_guru` and `nip` in `workflow.ts`, `AppScreen.tsx`, and `RekapJurnalView.tsx` | M1 | Survey O2 |
| 3 | Safe PostgREST Filter Sanitization for Academic Titles | Double-quoted and sanitized teacher names in PostgREST `.or()` filters in `GuruJurnal.tsx` and `HomeView.tsx` to prevent `PGRST100` errors | M1 | Survey O5 |
| 4 | Resilient Schedule Matching & Foreign Key Backfill | In `workflow.ts:findJadwalForGuru`, combined UUID matches and fuzzy/name matches; backfilled 51/51 schedules and 12/12 teachers | M1 | Survey O3, O6 |
| 5 | Fallback Request Session Token Injection | Ensured `AdminDataView.tsx` fallback fetch includes `x-session-token` and `x-sekolah-id` | M1 | Survey O7 |
| 6 | E2E Automated Verification Test Suite | Automated programmatic test verifying Admin login & data retrieval, Guru login & data retrieval, and Siswa data access integrity | M2 | User Acceptance Criteria |
| 7 | Multi-Role Security & Regression Protection | Multi-tenant isolation and anti-spoofing verified; siswa records protected; zero regressions | M3 | User R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Application & Query Fixes | Fix `page.tsx`, `workflow.ts`, `AppScreen.tsx`, `RekapJurnalView.tsx`, `GuruJurnal.tsx`, `HomeView.tsx`, `AdminDataView.tsx`, and database | Survey complete | DONE |
| M2 | Test Suite & Acceptance Verification | Build automated verification test suite checking Admin, Guru, and Siswa data access (`tests/data_access_roles_verification.test.ts`) | M1 | DONE |
| M3 | Gate, Adversarial Audit & Git Push | Reviewers, Challengers, Forensic Auditor verification, anti-spoofing hardening, and GEMINI.md git push | M1, M2 | DONE |

## Code Layout
- `src/app/page.tsx`: Session check, login mount, logout handling
- `src/lib/workflow.ts`: Teacher daily state evaluation, schedule matching, attendance calculations
- `src/components/AppScreen.tsx`: View routing, wali kelas detection
- `src/components/RekapJurnalView.tsx`: Homeroom journal queries
- `src/components/GuruJurnal.tsx`: Teacher journal queries and PostgREST `.or()` filters
- `src/components/HomeView.tsx`: Teacher dashboard and mapel queries
- `src/components/AdminDataView.tsx`: Admin master data view and fallback fetch
- `src/lib/supabaseClient.ts`: Tenant context and header injection
- `supabase/migrations/20260926_secure_rls_helpers.sql`: RLS helper functions and anti-spoofing policies
- `tests/data_access_roles_verification.test.ts`: Primary programmatic acceptance test suite (22/22 pass)
- `tests/adversarial_multitenant_role_isolation.test.ts`: Multi-tenant adversarial isolation suite (33/33 pass)
