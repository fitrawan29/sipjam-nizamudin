# Adversarial Review & QA Handoff Report - Round 3

> [!WARNING] **Skepticism Disclaimer**
> Confidence is high based on empirical test execution across all 14 test suites (including 17 new Round 3 adversarial assertions) and live Supabase database validation, though network dropouts during multipart Google Drive background uploads rely on client-side retry resilience.

## 1. What the prior attempt got wrong

### Issue 1: Loose, Unconstrained PostgREST Filter `%M.Pd%` in `scripts/merge_accounts.ts` Causing False-Positive Account Collision
- **Input:** Database contains attendance, journal, picket, schedule, homeroom, or assignment records of other teachers who hold a Master of Education ("M.Pd.") academic title (e.g., "Drs. Ahmad Dahlan, M.Pd." or future teachers with M.Pd).
- **Expected:** `scripts/merge_accounts.ts` must strictly match, count, and re-assign records belonging exclusively to the duplicate account "Ade Fitrawan Ibrahim, M.Pd., Gr." into primary account "Ade Fitrawan Ibrahim". Unrelated teachers holding an M.Pd title must remain 100% untouched and preserved.
- **Actual:** In `scripts/merge_accounts.ts`, the PostgREST filters for `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, `jadwal_pelajaran`, `penugasan_piket`, and `wali_kelas` used unconstrained substrings `ilike.%M.Pd%` instead of `ilike.Ade Fitrawan Ibrahim%M.Pd%`. As a consequence, running the script would falsely count and hijack any other teacher's records who has "M.Pd" anywhere in their name, transferring their records to Ade Fitrawan Ibrahim.
- **Root Cause:** Inconsistent filter scoping in `scripts/merge_accounts.ts` where lines 114, 126, 351, and 369 correctly scoped to `Ade Fitrawan Ibrahim%M.Pd%`, but lines 152, 165, 178, 208, 223, 238, 252, 298, and 307 omitted the teacher name prefix and queried `%M.Pd%` across the entire table.
- **Fix:** Strictly qualified all `.ilike.` filter arguments across `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, `jadwal_pelajaran`, `penugasan_piket`, and `wali_kelas` with the full teacher name prefix: `Ade Fitrawan Ibrahim%M.Pd%`. Added live database adversarial assertions in `tests/adversarial_round3_verification.test.ts` to actively prove that unrelated teachers holding M.Pd titles are never counted, modified, or deleted during the merge operation.

### Issue 2: Defensive Fallback on Non-Admin Username in Profile Update Payload (`AccountSettingsModal.tsx`)
- **Input:** Non-admin Guru submits profile changes (e.g. password change or avatar change) where the local user object or context has missing or unpopulated `user.username`.
- **Expected:** RPC payload safely falls back to local component `username` state without passing `undefined` to the database RPC `update_user_profile`.
- **Actual:** Payload was strictly `user.username`, which could evaluate to `undefined` if `user.username` was omitted in partial object states.
- **Root Cause:** Lack of coalescing fallback to component state in `p_username`.
- **Fix:** Changed `p_username: isAdmin ? username.trim() : (user.username || username || '')`.

---

## 2. What I changed

1. **`scripts/merge_accounts.ts`**:
   - Scoped all PostgREST query and update filters across `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, `jadwal_pelajaran`, `penugasan_piket`, and `wali_kelas` from unconstrained `%M.Pd%` to strictly `Ade Fitrawan Ibrahim%M.Pd%`.
   - Prevented false collision, accidental data hijacking, or unintentional record mutation for any other teachers holding M.Pd degrees.

2. **`src/components/AccountSettingsModal.tsx`**:
   - Added safe defensive fallback `(user.username || username || '')` in `p_username` for non-admin profiles so `update_user_profile` RPC never receives an undefined username.

3. **`tests/adversarial_round3_verification.test.ts`**:
   - Created comprehensive Round 3 adversarial test suite (17 assertions, 100% passing):
     - **Section 1 (R1 False Collision Attack & Scoping):** Verified zero loose `%M.Pd%` filters exist in script; inserted a dummy unrelated teacher with M.Pd title in live database; verified merge query count returns 0; executed `mergeAccounts()`; verified dummy teacher record remains completely intact and uncorrupted; cleaned up test record.
     - **Section 2 (R2 Izin Terlambat Workflow & Tamper Resistance):** Verified `/api/attendance` strictly enforces status `'Menunggu'`; verified `AdminVerifView` handles all pending status variants; verified explicit action buttons (Terima/Setujui & Tolak); verified `HomeView` avoids premature `'Hadir'`; verified live insert, retrieval, and cleanup of Izin Terlambat.
     - **Section 3 (R3 Teacher Username Removal & Password Form):** Verified DOM isolation (`{isAdmin && (...)}`); verified modal header omits username for teachers; verified responsive layout adapts to `space-y-3` without empty half-grid gaps; verified password fields remain accessible; verified RPC payload safety.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npm test`: **85/85 PASSED (12 suites clean, 0 failures, exit code 0)**.
  - `npx tsx scripts/merge_accounts.ts`: **Lulus (Presensi: 210, Jurnal: 72, Piket: 10, Total duplikat: 0, cleanup berhasil)**.
  - `npx tsx tests/adversarial_round3_verification.test.ts`: **17 PASSED, 0 FAILED (exit code 0)**.
  - `npx tsx tests/adversarial_round2_reviewer.test.ts`: **27 PASSED, 0 FAILED (exit code 0)**.
  - `npx tsx tests/adversarial_round1_reviewer.test.ts`: **14 PASSED, 0 FAILED (exit code 0)**.
  - `npx tsx tests/verification_r1_r2_r3.test.ts`: **23 PASSED, 0 FAILED (exit code 0)**.
  - `npx tsc --noEmit`: **0 error tipe (exit code 0)**.
  - `npm run build`: **Compiled successfully in 1875ms, 12 static/dynamic routes generated (exit code 0)**.

- **Shallow Verification (manual only):**
  - Inspected DOM tree in `AccountSettingsModal.tsx`: Confirmed no `<input>` element for username is rendered when `isAdmin` is false.
  - Inspected button accessibility in `AdminVerifView.tsx`: Confirmed "Setujui" and "Tolak" buttons contain appropriate aria-labels and tooltips.

- **Unverified aspects:**
  - Physical testing on legacy WebKit devices (iOS Safari 12/13) in an offline hardware blackout scenario.

---

## 4. Known Issues

- `Minor Robustness Risk`: In the event of a permanent client offline drop during attendance submission, the local UI catches the network error and advises the teacher to reconnect before retrying.
- `Shallow Verification`: Mobile UI responsiveness was validated via Tailwind CSS layout audit rather than physical mobile device lab testing.

---

## 5. Remaining risk & next step

- All three requirements (R1, R2, R3) and acceptance criteria are completely satisfied, verified with live database assertions, and protected against false account collisions and regression.
- The project is in a fully validated, green state. Task is COMPLETE and ready for final integration.
