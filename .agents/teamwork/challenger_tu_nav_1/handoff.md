# Handoff Report: Empirical Adversarial Challenge — Milestone 2 (TU Nav, RBAC, AST & PostgREST)

**Agent**: `challenger_tu_nav_1` (EMPIRICAL CHALLENGER - critic, specialist)  
**Parent Orchestrator**: `de917fec-7436-4fa2-9853-bd1bea951980`  
**Verdict**: **APPROVE** (0 Vulnerabilities, 0 Regressions)

---

## 1. Observation

Direct empirical evidence gathered across code inspections and test executions:

### 1.1 Navigation & RBAC (`src/lib/navigation.ts`)
- Line 179: `getConsolidatedMenuItems({ role: 'tatausaha' })` strictly constructs and returns an array of exactly 6 items:
  1. `view-guru-presensi` (icon: `fa-clock`, label: `Presensi TU`)
  2. `view-guru-jurnal` (icon: `fa-book-open`, label: `Jurnal Kegiatan`)
  3. `view-gradebook` (icon: `fa-graduation-cap`, label: `Asesmen`)
  4. `view-rapor` (icon: `fa-file-lines`, label: `Rapor`)
  5. `view-informasi` (icon: `fa-bullhorn`, label: `Informasi Sekolah`)
  6. `view-pengaturan-akun` (icon: `fa-user-gear`, label: `Pengaturan Akun`)
- Lines 254-268 in `evaluateTabRBAC()`:
  - Whitelist: `allowedTuViews = ['view-guru-presensi', 'view-guru-jurnal', 'view-gradebook', 'view-rapor', 'view-informasi', 'view-home', 'view-pengaturan-akun']`. If `effectiveView` or `viewId` matches, returns `{ allowed: true }`.
  - Blacklist fallback: all other views return `{ allowed: false, fallbackTab: 'view-guru-presensi', reason: 'Role Tata Usaha tidak memiliki izin akses ke modul ini.' }`.
  - Lines 231-233: Explicit guard for `view-dokumen` returning `{ allowed: false, fallbackTab: 'view-guru-presensi', reason: 'Role Tata Usaha tidak memiliki hak akses ke Bank Dokumen / Persuratan.' }`.
  - Lines 236-240: Explicit guard for `view-guru-jurnal` tab `supervisi-kelas` returning `{ allowed: false, fallbackTab: 'input' }` for non-wali/non-admin/non-kepsek users (denying TU access).

### 1.2 AST Invariants
- `src/components/AppScreen.tsx:1018`:
  ```tsx
  {/* AST preservation: data-tour={item.id} */}
  <button 
    key={item.id}
    data-tour={(item as any).dataTour || item.id}
  ```
  Verified verbatim match on line 1018 immediately preceding navigation button.
- `src/components/ClaySidebar.tsx:223`:
  ```tsx
  {/* AST preservation: data-tour={item.id} */}
  <button
    key={item.id}
    data-tour={item.dataTour || item.id}
  ```
  Verified verbatim match on line 223 immediately preceding navigation button.

### 1.3 PostgREST Mutation Guard (`src/lib/supabaseClient.ts`)
- Lines 143-148: `ASSESSMENT_TABLES = ['capaian_pembelajaran', 'tujuan_pembelajaran', 'asesmen_kolom', 'nilai_siswa']`.
- Lines 150-171: `isAssessmentEndpoint(urlOrPath)` strips URLs, queries, fragments, decodes URI components, normalizes multiple slashes, and performs case-insensitive regex matching with boundary delimiter `(?:/|$|\\?)`.
- Lines 226-250 in `checkMasterDataMutationGuard(requestUrlStr, method, role)`:
  - Detects mutating methods (`['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)`).
  - For `normRole === 'tatausaha'`, if `isAssessmentEndpoint(requestUrlStr)` evaluates to `true`, returns a Response with:
    - Status: `403 Forbidden`
    - Body JSON: `{"code":"42501","status":403,"error":"Forbidden: Hak akses Tata Usaha pada Asesmen dan Rapor adalah read-only (tinjau saja).","message":"...","details":"...","hint":"..."}`
  - Non-mutating methods (`GET`, `HEAD`, `OPTIONS`) bypass the guard and return `null`.

### 1.4 Test Suite Execution Results
- **Dedicated Adversarial Suite**: `tests/adversarial_tu_nav_m2_challenger.test.ts`
  - Command: `npx tsx tests/adversarial_tu_nav_m2_challenger.test.ts`
  - Output: `TOTAL CHECKS: 166 | PASSED CHECKS: 166 | FAILED CHECKS: 0 | Exit Code: 0`
- **Existing TU Role & RBAC Suite**: `tests/tata_usaha_role_rbac_and_isolation.test.ts`
  - Command: `npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts`
  - Output: `87 passed, 0 failed out of 87 tests | Exit Code: 0`
- **Milestone 2 Specification Suite**: `tests/tu_refinements_and_admin_rekap.test.ts`
  - Command: `npx tsx tests/tu_refinements_and_admin_rekap.test.ts`
  - Output: `81 passed, 0 failed out of 81 tests | Exit Code: 0`
- **TypeScript Static Verification**:
  - Command: `npx tsc --noEmit`
  - Output: Exit Code 0, clean compile without errors.
- **Full Project Test Suite**:
  - Command: `npm test`
  - Output: All 69 test suites passed with exit code 0.

---

## 2. Logic Chain

1. *From Observation 1.1*: Testing 14 role string formatting variations (including whitespace padding, uppercase, underscores, and hyphens) against `getConsolidatedMenuItems` proves that the normalization logic `role.toLowerCase().replace(/[\s_-]+/g, '')` consistently resolves to `'tatausaha'`. In all cases, exactly 6 items are returned, with zero leakage of administrative or examination views.
2. *From Observation 1.1*: In `evaluateTabRBAC()`, every single permitted view (`view-guru-presensi`, `view-guru-jurnal`, `view-gradebook`, `view-rapor`, `view-informasi`, `view-home`, `view-pengaturan-akun`) returns `allowed: true`. Conversely, an exhaustive check of 25 unpermitted views and 11 injection/malformed view strings returned `allowed: false` with appropriate fallback routing to `view-guru-presensi`. Granular subtab checks confirmed that while TU can access standard journal entries, `supervisi-kelas` remains strictly denied.
3. *From Observation 1.2*: Direct filesystem read and line-indexed inspection confirm `{/* AST preservation: data-tour={item.id} */}` is preserved verbatim in both `AppScreen.tsx` (line 1018) and `ClaySidebar.tsx` (line 223), positioned immediately above the JSX `<button>` element with `data-tour` property intact.
4. *From Observation 1.3*: Testing all combinations of mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) across all 4 assessment endpoints confirmed HTTP 403 Forbidden with PostgREST code `42501`. Testing edge cases—including trailing slashes (`/nilai_siswa/`), multi-slash paths, query parameters (`?select=*&order=id`), URL hashes, uppercase paths (`/REST/V1/NILAI_SISWA`), public schema prefixes (`/public.nilai_siswa`), and percent-encoded paths—demonstrated that `isAssessmentEndpoint` reliably detects assessment mutations without false negatives. Furthermore, boundary tests (`nilai_siswa_archive`, `capaian_pembelajaran_v2`) proved that non-assessment tables are not blocked by the guard.
5. *From Observation 1.4*: Zero failures across 166 adversarial checks, 87 isolation checks, 81 acceptance checks, clean typechecking, and 100% pass on all 69 suites in `npm test` provide empirical proof that the implementation is robust, adheres to all architectural constraints, and introduces zero regressions.

---

## 3. Caveats

- No caveats. All 3 challenge focus areas were empirically tested using rigorous automated harnesses. No simulated or mock bypasses were accepted without validation against the actual codebase.

---

## 4. Conclusion

**Verdict: APPROVE.**

The implementation of Milestone 2 meets all functional, architectural, and security requirements:
- Menu isolation strictly confines role `tata_usaha` to the 6 specified views.
- `evaluateTabRBAC` reliably blocks all administrative, supervision, and unauthorized routes.
- The required AST preservation comments remain verbatim and intact in both UI navigation components.
- PostgREST mutation interception provides bulletproof protection against assessment tampering by role `tata_usaha` while allowing read operations and handling URL edge cases.

---

## 5. Verification Method

To independently verify these conclusions, execute the following commands in powershell/terminal:

```bash
# 1. Run the new adversarial challenge test harness (166 checks)
npx tsx tests/adversarial_tu_nav_m2_challenger.test.ts

# 2. Run the dedicated Milestone 2 test suites
npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts
npx tsx tests/tu_refinements_and_admin_rekap.test.ts

# 3. Verify TypeScript type safety
npx tsc --noEmit

# 4. Verify AST invariant strings exist verbatim
powershell -Command "Select-String -Path 'src/components/AppScreen.tsx', 'src/components/ClaySidebar.tsx' -Pattern 'AST preservation: data-tour=\{item.id\}'"
```
All commands execute with exit code 0.
