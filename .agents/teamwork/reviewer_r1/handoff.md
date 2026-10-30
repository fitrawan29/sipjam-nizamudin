# Reviewer Handoff Report: Penyesuaian Alur Presensi Pulang Cepat & Jurnal Otomatis Tidak Masuk Kelas

## 1. What the prior attempt got wrong
1. **Fatal Functional Bug: Partial Match false-positive on Empty Mapel in `isJurnalMatchJadwal`**
   - **Input:** Teaching schedule with subject stored in `mapel: 'Bahasa Indonesia'` (`mata_pelajaran: undefined`), and teacher journal filled for `mapel: 'Matematika'`.
   - **Expected:** `isJurnalMatchJadwal` returns `false` (Matematika does not match Bahasa Indonesia).
   - **Actual:** `isJurnalMatchJadwal` returned `true`!
   - **Root Cause:** In `src/lib/workflow.ts`, `isJurnalMatchJadwal` only inspected `jadwal.mata_pelajaran`. When `jadwal.mata_pelajaran` was undefined, `jdMapel` defaulted to `""`. Because `'matematika'.includes("")` evaluates to `true` in JavaScript, ANY journal in that class was falsely treated as matching ANY schedule! Similarly, if a journal had an empty `mapel`, `"".includes(jdMapel)` or `jdMapel.includes("")` evaluated to `true`.
   - **Fix:** Updated `isJurnalMatchJadwal` to look up `(jadwal.mata_pelajaran || jadwal.mapel || '').trim().toLowerCase()` and `(jurnal.mapel || jurnal.mata_pelajaran || '').trim().toLowerCase()`, guarded with `if (!jMapel || !jdMapel) return false`, and enforced minimum 3-character threshold for substring matching.

2. **Fatal Boundary Collision: Sub-word Substring Matches in Teacher Identification**
   - **Input:** Teacher A: `"Fitra"` vs Schedule Teacher B: `"Fitrawan"`, or `"Budi"` vs `"Budiman"`.
   - **Expected:** `isTeacherScheduleMatch` returns `false` (different persons).
   - **Actual:** `isTeacherScheduleMatch` returned `true` (`'fitrawan'.includes('fitra') === true`).
   - **Root Cause:** In `src/lib/attendanceAlpa.ts`, `isTeacherScheduleMatch` and `isTeacherJournalMatch` used naive `.includes(...)` across raw name strings, violating the token boundary rule.
   - **Fix:** Implemented token-based word matching `matchTeacherTokens` that normalizes titles/prefixes and enforces whole-token array comparison so sub-word collisions like "Fitra" vs "Fitrawan" return `false`, while legitimate academic title variations like `"Dr. H. Ahmad Fauzi, M.Pd."` vs `"Ahmad Fauzi"` match accurately.

3. **Robustness / Idempotency Flaw: Duplicate "Tidak Masuk Kelas" Journal Insertion**
   - **Input:** Calling `evaluateAndApplyAutoCheckout` when an empty schedule already had an auto-generated `"Tidak Masuk Kelas"` record.
   - **Expected:** Idempotent execution without inserting duplicate journal rows.
   - **Actual:** Every run created a brand new UUID and inserted duplicate `"Tidak Masuk Kelas"` rows in `jurnal_pembelajaran`.
   - **Root Cause:** In `src/lib/attendanceAlpa.ts`, `evalResult.emptySchedules` filters out `"Tidak Masuk Kelas"` journals from valid teaching journals, but the insertion loop did not check if a `"Tidak Masuk Kelas"` record for that specific schedule and date had already been inserted.
   - **Fix:** Added existence guard `(allJurnalToday || []).some(...)` before calling `insert` in `evaluateAndApplyAutoCheckout` and appended new records to the local cache.

4. **API Observability Omission in `/api/attendance/auto-alpa`**
   - **Input:** GET/POST request to `/api/attendance/auto-alpa`.
   - **Expected:** Returns status of both auto-alpa and auto-checkout/pulang cepat execution.
   - **Actual:** Auto-checkout was invoked inside a `try/catch` but its return value was discarded.
   - **Root Cause:** Response object spread only `...result` (AutoAlpaResult).
   - **Fix:** Captured `checkoutResult` and returned it in `autoCheckout` field in both GET and POST handlers.

5. **UI Resilience in `GuruPresensi.tsx` & `AdminVerifView.tsx`**
   - In `GuruPresensi.tsx`, added check for `jenis_presensi === 'Pulang Cepat'` in addition to `status_verifikasi === 'Pulang Cepat'`.
   - In `AdminVerifView.tsx`, added `"Otomatis (Tidak Masuk Kelas)"` robot badge for auto-generated empty journals in the verification tab.

## 2. What I Changed
- `src/lib/workflow.ts`:
  - Hardened `isJurnalMatchJadwal` with fallback `mata_pelajaran || mapel`, empty string guards, clean class prefix stripping, and length checks.
- `src/lib/attendanceAlpa.ts`:
  - Replaced naive substring collision with `cleanTeacherNameForMatch` and `matchTeacherTokens`.
  - Added idempotency guard in `evaluateAndApplyAutoCheckout` preventing duplicate `"Tidak Masuk Kelas"` journals.
- `src/app/api/attendance/auto-alpa/route.ts`:
  - Returned `autoCheckout` result in GET and POST API responses.
- `src/components/GuruPresensi.tsx`:
  - Supported `jenis_presensi === 'Pulang Cepat'` in auto-checkout alert banner.
- `src/components/AdminVerifView.tsx`:
  - Rendered `Otomatis (Tidak Masuk Kelas)` badge on Jurnal cards.
- `tests/pulang_cepat_dan_jurnal_kosong_verification.test.ts`:
  - Added Section 5 with 5 automated adversarial tests (total 20 tests).

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - Ran `npx tsx tests/pulang_cepat_dan_jurnal_kosong_verification.test.ts`: 20/20 passed (100%).
  - Ran `npm test`: all 42 automated test suites passed (100% across whole app).
  - Ran `npm run build`: compiled successfully, TypeScript passed in 55s, 0 errors, static pages generated cleanly.
- **Shallow Verification (manual only):**
  - None; all logic backed by automated end-to-end tests.
- **Unverified aspects:**
  - Real-time mobile push notifications for Pulang Cepat (external push service).

## 4. Known Issues
- `Minor Robustness Risk`: If a school alters schedule periods midway through the day after the cutoff has already executed, existing "Tidak Masuk Kelas" records remain in the database unless edited or deleted by the school admin.

## 5. Remaining risk & next step
- Task is 100% complete and fully verified.
- The Git commit and push to main should be performed according to project rules.
