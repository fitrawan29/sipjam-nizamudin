# Handoff Report - worker_bk

**Task**: Implement Milestone 1: Role BK (Bimbingan Konseling) & Independent Classless Counseling Journal (`jurnal_bk`)  
**Worker**: worker_bk (implementer, qa, specialist)  
**Parent Conversation ID**: 964210f9-504e-473a-a8e2-8633726ad7c7  
**Date**: 2026-11-09T05:42:00Z  

---

## 1. Observation

Direct observations from the codebase, tools, and execution runs:

1. **Role and Type Definitions**:
   - `src/types/user.ts`: Lines 1-10 define `UserRole = 'admin' | 'guru' | 'piket' | 'kepala_sekolah' | 'siswa' | 'wali_kelas' | 'tata_usaha' | 'dinas_pendidikan' | 'bk' | 'guru_bk'`.
   - `src/types/database.ts`: Lines 290-305 define `RoleUser = 'Admin' | 'Guru' | 'Piket' | 'Kepala Sekolah' | 'Siswa' | 'Wali Kelas' | 'Tata Usaha' | 'Dinas Pendidikan' | 'bk' | 'guru_bk' | 'Guru BK' | 'BK'`.
2. **Navigation and Menu Isolation**:
   - `src/lib/navigation.ts`: `normalizeRole` normalizes `'bk'`, `'guru_bk'`, `'Guru BK'`, `'BK'` into canonical `'bk'`.
   - `src/lib/navigation.ts`: `getSidebarMenuItems` returns strictly 5 items for `isBk`:
     1. `view-home` (Dashboard / Beranda)
     2. `view-guru-presensi` (Presensi Harian BK)
     3. `view-jurnal-bk` (Jurnal BK)
     4. `view-informasi` (Informasi Sekolah)
     5. `view-pengaturan-akun` (Pengaturan Akun)
   - Aliases `'view-jurnal-bk'` and `'view-bk-jurnal'` are registered in `VIEW_ALIASES` and `SIDEBAR_TOUR_ALIASES`.
   - `evaluateTabRBAC` strictly allows `'view-jurnal-bk'` ONLY for roles `bk`, `admin`, and `kepala_sekolah`. All other roles (`guru`, `wali_kelas`, `piket`, `tata_usaha`, `siswa`, `dinas_pendidikan`) receive `{ allowed: false, reason: "Akses jurnal BK dibatasi untuk Guru BK, Kepala Sekolah, dan Administrator demi kerahasiaan siswa." }`.
   - `evaluateTabRBAC` strictly denies role `bk` from accessing KBM journals (`view-guru-jurnal`), administrative master data (`view-admin-data`, `view-admin-config`, `view-admin-backup`, `view-admin-verif`), superadmin routes (`view-superadmin-*`), and dinas routes (`view-dinas-*`).
3. **AST Preservation Invariant**:
   - `src/components/AppScreen.tsx` line 1088: Verbatim comment `{/* AST preservation: data-tour={item.id} */}` is preserved.
   - `src/components/ClaySidebar.tsx` line 238: Verbatim comment `{/* AST preservation: data-tour={item.id} */}` is preserved.
4. **AppScreen Route Gate & Defense**:
   - `src/components/AppScreen.tsx`: `BkJurnalView` is dynamically imported (`next/dynamic`).
   - Default landing view for BK is `'view-home'`.
   - `handleNavigation` blocks unauthorized access to `view-jurnal-bk` with a SweetAlert2 warning.
   - UI gate in AppScreen rendering displays an "Akses Terblokir" warning screen if URL query tampering attempts to bypass navigation.
5. **Sidebar Styling**:
   - `src/components/ClaySidebar.tsx`: Role BK displays with a rose badge (`bg-rose-500/10 text-rose-300 border-rose-500/20`), label `'Guru BK'`, and icon `'fa-heart-pulse'`.
6. **Classless Counseling Journal Component (`BkJurnalView`)**:
   - File created at `src/components/BkJurnalView.tsx`.
   - Universal student selector queries `data_siswa`, allowing filtering by class or live search by Name / NISN across all grades and classes without classroom schedule locks.
   - Form fields: `siswa_id`, `nisn`, `nama_siswa`, `kelas`, `tanggal`, `waktu`, `bidang_bimbingan`, `jenis_layanan`, `tempat_layanan`, `catatan`, `tindak_lanjut`, `status`.
   - CRUD operations: Create, Read (filter by search, status, bidang, date range), Update, Delete with SweetAlert2 confirmation.
   - Cache resilience: handles `isSchemaCacheOrMissingTableError` using `localStorage` key `sipjam_jurnal_bk_cache_${sekolahId}`, plus form auto-save via `sipjam_jurnal_bk_draft_${userId}`.
   - Read-only mode for `kepala_sekolah` includes banner `<div data-testid="readonly-notice">` and disables edit/delete actions.
   - Printable report layout integrates `PrintHeader` and `triggerPrintWithGps`.
7. **Admin User Management**:
   - `src/components/AdminPenggunaView.tsx`: Added "+ Akun BK" button opening modal with 4 required fields (NIP, Nama Lengkap, Nomor HP, Email Aktif) and default password `${nip}27`.
   - Row-level toggle "Tunjuk BK" / "Ke Guru" updating `users.role` between `'bk'` and `'Guru'`, and `data_guru.mata_pelajaran` between `'Bimbingan Konseling (BK)'` and `'-'`.
   - Delete and credential editing support for BK accounts.
8. **Teacher User Synchronization**:
   - `src/lib/teacherUserSync.ts`: Included `'bk'`, `'guru_bk'`, `'Guru BK'` in user queries and preserved BK assignments during automated synchronization.
9. **Database Migration**:
   - File created at `supabase/migrations/20261109_create_jurnal_bk.sql` defining `public.jurnal_bk`, indexes on `(sekolah_id, tanggal)`, `(sekolah_id, siswa_id)`, and `(sekolah_id, status)`, with RLS policies and `NOTIFY pgrst, 'reload schema';`.
10. **Test Execution Results**:
    - `npx tsx tests/bk_role_and_jurnal_rbac_verification.test.ts`:
      `Total Tests: 106 | Passed: 106 | Failed: 0` (100% pass across all 9 acceptance criteria).
    - `npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts`:
      `Passed: 87, Failed: 0` (Zero regression on Tata Usaha).
    - `npx tsx tests/adversarial_tu_nav_m2_challenger.test.ts`:
      `Passed: 167, Failed: 0` (Zero regression on challenger suite).
    - `npx tsc --noEmit`: Exited with code 0 (Zero TypeScript errors).
    - `npm run build`: Exited with code 0 (Next.js 16.3.4 Turbopack build succeeded, all 13 static pages generated).

---

## 2. Logic Chain

1. **From Need for Confidentiality to Independent Table & RBAC**:
   - *Observation*: BK counseling data contains sensitive student information (family issues, behavioral interventions, emotional distress) that regular classroom subject teachers, homeroom teachers, and non-counseling staff must not see.
   - *Observation*: Regular KBM journals in `jurnal_pembelajaran` enforce classroom schedule validation (`jadwal_kbm`), teaching hours, and block checkout via `canTeacherPresensiPulang`.
   - *Inference*: BK cannot share `jurnal_pembelajaran`. It requires an independent `jurnal_bk` table and an isolated view (`view-jurnal-bk`), protected by `evaluateTabRBAC` which strictly permits only `bk`, `admin`, and `kepala_sekolah`.
2. **From Classless Counseling Nature to Universal Student Selector**:
   - *Observation*: Students can consult BK individually or across grade levels at any hour of the school day, regardless of current subject schedules.
   - *Inference*: `BkJurnalView` fetches students universally from `data_siswa`, allowing quick filtering by class or instant search by NISN / Name, cleanly bypassing `jadwal_pelajaran` constraints while strictly preserving data integrity.
3. **From Schema Cache Staleness to Multi-Tier Client Resilience**:
   - *Observation*: Supabase PostgREST schemas occasionally experience caching delays after new migration deployment before a reload completes.
   - *Inference*: Using `isSchemaCacheOrMissingTableError` with `localStorage` fallback (`sipjam_jurnal_bk_cache_${sekolahId}`) prevents frontend crashes during network or PostgREST propagation delays.
4. **From Non-Regression Rule to AST Preservation & Code Isolation**:
   - *Observation*: `src/components/GuruJurnal.tsx` and `src/lib/workflow.ts` must remain untouched to avoid disturbing teacher presensi or attendance workflows.
   - *Inference*: Neither file was modified. AST comments `{/* AST preservation: data-tour={item.id} */}` in `AppScreen.tsx` and `ClaySidebar.tsx` were kept intact verbatim.

---

## 3. Caveats

- **Supabase Migration Execution in Production**: The SQL migration file `supabase/migrations/20261109_create_jurnal_bk.sql` is ready in the repository. In a live production Supabase instance, this script must be executed in the Supabase SQL Editor or via Supabase CLI to create the physical table and trigger `NOTIFY pgrst, 'reload schema';`. If the table is not yet migrated on a given remote database instance, the client resilience layer transparently falls back to local storage cache so users experience zero crashes.
- **Pre-existing Test Challenger Failure**: In `tests/adversarial_m3_coldstart_rbac_popstate_challenger.test.ts`, 2 assertions failed due to prior architectural commits (`380222b` and `b539182` which hardened master data fallback to `'view-home'` and added Dinas satellite menus). This file was outside worker_bk's exclusive ownership and was left untouched.

---

## 4. Conclusion

Milestone 1 is complete, verified, and adheres strictly to all acceptance criteria, the `/ponytail` design philosophy (minimal changes, 0 new dependencies, reuse of native SIPJAM UI components), and non-regression guarantees:
- Role BK (`'bk'`, `'guru_bk'`, `'Guru BK'`, `'BK'`) is fully integrated into SIPJAM's authentication, user types, and teacher synchronization.
- Menu navigation for BK is strictly consolidated to 5 items conforming to Miller's Law.
- RBAC enforces strict confidentiality: `view-jurnal-bk` is accessible only by BK, Admin, and Kepsek (read-only mode), and denied to all other roles.
- The independent classless counseling journal (`BkJurnalView`) supports full CRUD, universal student selection, print reporting, and offline/cache resilience.
- Admin user management enables quick BK assignment toggling and dedicated BK account creation with default credential formatting.
- AST preservation comments remain intact.
- TypeScript check (`npx tsc --noEmit`) and Next.js production build (`npm run build`) pass cleanly with 0 errors.

---

## 5. Verification Method

To independently verify the implementation:

1. **Automated BK Verification Suite**:
   ```powershell
   npx tsx tests/bk_role_and_jurnal_rbac_verification.test.ts
   ```
   *Expected result*: 106 passed, 0 failed.
2. **Regression Check on Existing Roles (TU & RBAC)**:
   ```powershell
   npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts
   npx tsx tests/adversarial_tu_nav_m2_challenger.test.ts
   ```
   *Expected result*: All 87 and 167 tests pass cleanly.
3. **TypeScript Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected result*: Code 0, zero errors.
4. **Production Build**:
   ```powershell
   npm run build
   ```
   *Expected result*: Compiled successfully, 13/13 static pages generated.
5. **AST Comment Invariants**:
   Inspect `src/components/AppScreen.tsx` line 1088 and `src/components/ClaySidebar.tsx` line 238 for `{/* AST preservation: data-tour={item.id} */}`.
