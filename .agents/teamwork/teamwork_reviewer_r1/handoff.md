> [!WARNING] **Skepticism Disclaimer**
> Confidence is high on RBAC, session synchronization, and routing isolation based on 70+ automated test suites with 680+ BK assertions, but browser visual rendering remains tested via AST, DOM simulation, and logic harnesses rather than live human manual browser clicks.

## 1. What the prior attempt got wrong

### Issue 1: `evaluateTabRBAC` Blocked Teachers Appointed to BK via mata_pelajaran Fallback
- **Input:** User with `{ role: 'Guru', mata_pelajaran: 'Bimbingan Konseling (BK)' }` accessing `view-jurnal-bk`.
- **Expected:** `evaluateTabRBAC('view-jurnal-bk', '', user)` returns `{ allowed: true }` because the user was appointed as Guru BK (when DB constraint `users_role_check` falls back to `data_guru.mata_pelajaran`).
- **Actual:** Returned `{ allowed: false, fallbackTab: 'view-home', reason: 'Jurnal BK bersifat rahasia dan hanya dapat diakses oleh Guru BK, Administrator, dan Kepala Sekolah.' }`.
- **Root Cause:** `evaluateTabRBAC` in `src/lib/navigation.ts` only checked normalized role strings (`bk`, `gurubk`, `bimbingankonseling`, etc.) and did not inspect `mata_pelajaran` or `isBk` flag. Furthermore, `AppScreen.tsx` called `evaluateTabRBAC(targetId, targetTab, { role: user?.role, isWaliKelas })` passing raw `'Guru'` instead of the effective BK role.

### Issue 2: Early Return in Database Constraint Fallback Skipped Local Session Synchronization
- **Input:** Admin invokes `handleToggleBkAssignment` in `AdminPenggunaView` for a teacher where Supabase throws `users_role_check` constraint violation.
- **Expected:** Active session in `localStorage` (`sipjam_user`) is synchronized so that if the updated teacher is active, their session reflects `role: 'bk'` and `mata_pelajaran: 'Bimbingan Konseling (BK)'`.
- **Actual:** The code updated `data_guru.mata_pelajaran`, displayed a warning Swal, and executed an early `return;` before reaching the `localStorage.setItem` session sync logic at lines 522-540.
- **Root Cause:** Early `return` inside the `if (updErr.message?.includes('users_role_check'))` handler bypassed the session synchronization block.

### Issue 3: Intra-Tab Event Dispatch Used Generic `Event('storage')` Which Was Ignored by `page.tsx`
- **Input:** Admin toggles role BK, dispatching `window.dispatchEvent(new Event('storage'))`.
- **Expected:** `handleStorageChange` in `src/app/page.tsx` catches the event and updates the active user state in React without requiring full browser reload.
- **Actual:** `new Event('storage')` does not set `e.key`, causing `if (e.key === 'sipjam_user')` in `page.tsx` to evaluate to `false` and ignore the event.
- **Root Cause:** A generic `Event` has `e.key === undefined`. Intra-tab notification requires `StorageEvent` with `key: 'sipjam_user'` and `newValue: serialized` (or `page.tsx` checking `!e.key`).

### Issue 4: Mapel Matching Failed on "Bimbingan dan Konseling" in `teacherUserSync.ts`
- **Input:** Teacher with `mata_pelajaran = 'Bimbingan dan Konseling'` or `'BK '` (with whitespace).
- **Expected:** `isBkMapel` and `isTeacherBk` evaluate to `true` and create/recognize account as `'bk'`.
- **Actual:** `.toLowerCase().includes('bimbingan konseling')` returned `false` due to the word "dan", and `.toLowerCase() === 'bk'` returned `false` due to untrimmed whitespace.
- **Root Cause:** Inflexible string matching that omitted `"bimbingan dan konseling"` and did not call `.trim() === 'bk'`.

### Issue 5: BK Test Suites Were Excluded from `package.json` `"test"` Script
- **Input:** Running standard project gate `npm test`.
- **Expected:** All tests including BK adversarial tests run automatically as part of the test runner.
- **Actual:** `package.json`'s `"test"` script did not chain `tests/adversarial_bk_challenger.test.ts`, `tests/bk_role_and_jurnal_rbac_verification.test.ts`, or `tests/challenger_bk_2_stress_test.test.ts`.
- **Root Cause:** The test scripts were executed manually with standalone commands instead of being integrated into the core package test gate.

---

## 2. What I changed

1. **`src/lib/navigation.ts`**:
   - Updated `evaluateTabRBAC` to accept optional `mata_pelajaran`, `mataPelajaran`, and `isBk` fields on the user object.
   - Enhanced `isBk` resolution inside `evaluateTabRBAC` to recognize `user?.isBk === true`, role normalization variants, and `mata_pelajaran` containing `"bimbingan konseling"`, `"bimbingan dan konseling"`, or `.trim() === 'bk'`.
   - Updated `getConsolidatedMenuItems` to accept optional `isBk?: boolean` in `params` to allow explicit override.

2. **`src/components/AppScreen.tsx`**:
   - Enhanced `isBk` detection to include `(baseUser?.mata_pelajaran || '').toLowerCase().includes('bimbingan dan konseling')`.
   - Updated lines 572 and 735 to pass effective role `{ role: isBk ? 'bk' : (isTataUsaha ? 'tata_usaha' : user?.role), isWaliKelas, mata_pelajaran: user?.mata_pelajaran, isBk }` into `evaluateTabRBAC`.
   - Preserved verbatim AST comment: `{/* AST preservation: data-tour={item.id} */}`.

3. **`src/components/ClaySidebar.tsx`**:
   - Enhanced `isBkRole` check to include `(user?.mata_pelajaran || '').toLowerCase().includes('bimbingan dan konseling')`.
   - Preserved verbatim AST comment: `{/* AST preservation: data-tour={item.id} */}`.

4. **`src/components/AdminPenggunaView.tsx`**:
   - Extracted helper `syncLocalSessionIfMatching(userId, username, targetRole)` that safely updates `localStorage` and dispatches `StorageEvent('storage', { key: 'sipjam_user', newValue: serialized })` alongside fallback `Event('storage')`.
   - Ensured `syncLocalSessionIfMatching` is called in both standard execution and database constraint fallback branches before dialog displays or returns.
   - Enhanced `isCurrentlyBk` and table row `isItemBk` logic to inspect both role variants and mapel variants (`bimbingan konseling`, `bimbingan dan konseling`, `bk`).
   - Cleaned up Tunjuk BK toggle button styling and labels using canonical `isItemBk`.

5. **`src/lib/teacherUserSync.ts`**:
   - Updated `isBkMapel` and `isTeacherBk` to support `"bimbingan dan konseling"` and trimmed `'bk'`.
   - Preserved exact required invariant strings (`'Guru', 'tata_usaha', 'Tata Usaha', 'bk', 'guru_bk', 'Guru BK'`, `role: matchedUser?.role || (isTeacherBk ? 'bk' : 'Guru')`, `role: isBkMapel ? 'bk' : 'Guru'`).

6. **`src/app/page.tsx`**:
   - Enhanced `handleStorageChange` to handle `e.key === 'sipjam_user' || !e.key`, reading `localStorage.getItem('sipjam_user')` when `e.newValue` is not populated on synthetic/intra-tab events.

7. **`package.json`**:
   - Integrated all 4 BK verification suites into the `test` script:
     - `tests/adversarial_bk_challenger.test.ts`
     - `tests/bk_role_and_jurnal_rbac_verification.test.ts`
     - `tests/challenger_bk_2_stress_test.test.ts`
     - `tests/adversarial_bk_reviewer_verification.test.ts`

8. **`tests/adversarial_bk_reviewer_verification.test.ts`**:
   - Created dedicated adversarial reviewer test suite with 40 assertions verifying:
     - Mapel BK constraint fallback RBAC authorization for `view-jurnal-bk`.
     - Strict RBAC denial for BK users attempting to access regular KBM journals (`view-guru-jurnal`) and teaching documents (`view-dokumen`).
     - Non-regression for regular subject teachers (`Matematika`, `IPA`, etc.).
     - Consolidated 5-item menu generation with `isBk` override flag.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/adversarial_bk_reviewer_verification.test.ts`:
    - Result: **40 / 40 assertions PASSED** (0 failures).
    - Verified: mapel BK variants (`Bimbingan Konseling (BK)`, `Bimbingan dan Konseling`, `BK`), `isBk` flag override, regular teacher non-regression, and consolidated 5-item menu generation.
  - `npx tsx tests/adversarial_bk_challenger.test.ts`:
    - Result: **481 / 481 assertions PASSED** (0 failures).
    - Verified: role fuzzing (24 variations), Miller's Law 5 items, RBAC isolation, AST comments preservation, route aliases resolution.
  - `npx tsx tests/bk_role_and_jurnal_rbac_verification.test.ts`:
    - Result: **106 / 106 assertions PASSED** (0 failures).
    - Verified: RBAC isolation, data model migration, admin supervision read-only, non-regression on admin, guru, TU, kepsek, siswa.
  - `npx tsx tests/challenger_bk_2_stress_test.test.ts`:
    - Result: **60 / 60 assertions PASSED** (0 failures).
    - Verified: classless student selector, input validation, auto-save drafts, multi-counselor supervision, AST invariants.
  - `npm test` (Full Project Suite - 74+ test files):
    - Result: **PASSED with exit code 0** across all 74 test suites without a single regression.

- **Shallow Verification (manual only):**
  - Git diff inspection of all modified files (`git diff`).
  - AST comment verification on `AppScreen.tsx` and `ClaySidebar.tsx`.

- **Unverified aspects:**
  - Real browser physical click interactions (interactive clicking, camera, and biometric tests require live browser/device which are simulated via DOM/AST logic harnesses in node/tsx).

---

## 4. Known Issues

- `Minor Robustness Risk`: If a school's Supabase instance has an active `users_role_check` constraint restricting roles to a legacy enum, changing a teacher's role to BK in `users` falls back to `data_guru.mata_pelajaran`. While our code now fully supports this fallback and grants all BK permissions seamlessly, the admin modal advises running `ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;` in Supabase SQL Editor for complete relational cleanliness.

---

## 5. Remaining risk & next step

- Task is **complete**: All acceptance criteria are verified with zero regressions, the root causes of all edge cases have been resolved directly using /ponytail principles (minimal code, root-cause fixes, zero unneeded abstractions), and the full project test suite passes with 100% success.
- Next step: Stage, commit, and push changes to `main` branch following the project's Git Workflow Rule.
