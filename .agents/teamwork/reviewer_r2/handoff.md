# Adversarial Review & QA Report: Round 2 Review & Hardening

> [!WARNING] **Skepticism Disclaimer**
> Moderate-to-high confidence in core resilience, offline queue stability, and print CSS layout. Browser sandbox variations in extreme offline storage constraints and mobile camera device access lifecycles remain partially reliant on physical mobile device behavior.

## 1. What the prior attempt got wrong

### Issue 1: GuruJurnal Student Attendance Overwrite on Draft Reload
- **Input:** Teacher drafts a KBM entry, marks 3 students in the class with custom attendance statuses (e.g. Sakit, Izin, Alpa), and reloads the page or experiences an unexpected browser restart.
- **Expected:** When the form restores from `localStorage.getItem('sipjam_jurnal_autosave')`, the teacher's manually assigned student attendance statuses (`absensi`) are preserved.
- **Actual:** The draft restoration mounted first, but as soon as `fetchStudents` resolved data from Supabase for that class, line 583 executed `setAbsensi(initialAbsensi)`, wiping out the teacher's draft marks and resetting all students to default 'Hadir'.
- **Root Cause:** `fetchStudents` unconditionally called `setAbsensi(initialAbsensi)` instead of checking whether `prevAbsensi` already contained valid draft marks for matching students in the class.

### Issue 2: Unhandled Corrupted JSON in Presensi Offline Queue Crash
- **Input:** `localStorage.getItem('sipjam_offline_presensi_queue')` contains malformed or corrupted JSON text (e.g. caused by an abrupt browser crash or partial write during storage pressure).
- **Expected:** Submission offline fallback and reconnect sync gracefully detect invalid JSON, recover single item fallback or clean the corrupted key, without crashing.
- **Actual:** `saveToLocalStorage` called `JSON.parse(rawQueue)` without a try/catch guard. When this threw a `SyntaxError`, the outer `catch (quotaErr)` caught it and attempted `saveToLocalStorage(itemWithoutPhoto)`, which threw `SyntaxError` again, dropping all the way to `catch (offlineErr)` and completely aborting the teacher's check-in. In `syncOfflinePresensi`, parsing error caused an early `return`, permanently leaving the corrupt string in `localStorage` and locking offline sync.
- **Root Cause:** Missing try/catch around `JSON.parse(rawQueue)` in `saveToLocalStorage` and absence of corrupt queue recovery in `syncOfflinePresensi`.

### Issue 3: Offline Queue Bloat from Repeated Offline Submissions
- **Input:** Teacher is in an area with no internet connection, clicks "Simpan Presensi", receives the "Tersimpan Offline" notice, and then clicks submit again (or double clicks) believing it did not register.
- **Expected:** Duplicate submissions with the identical presensi ID update the existing queued record rather than duplicating base64 photos in `localStorage`.
- **Actual:** Prior attempt used `queue.push(itemToSave)`, causing duplicate 50KB data URLs to accumulate in `localStorage` and rapidly filling the 5MB browser domain quota.
- **Root Cause:** Absence of ID deduplication in `saveToLocalStorage`.

### Issue 4: Document Uploads (Surat Sakit PDF) Dropped in Offline Presensi
- **Input:** Teacher submits "Izin / Sakit" while offline, attaching a doctor's note in `.pdf` format (<= 500 KB).
- **Expected:** PDF document is preserved in the offline queue via base64 data URL if storage permits.
- **Actual:** `compressPhotoForStorage` only supported images (`Image()` object). Loading `.pdf` into `Image().src` triggered `img.onerror` and resolved to `''`, completely discarding the uploaded doctor's note document.
- **Root Cause:** Lack of `file.type === 'application/pdf'` base64 encoding support in `handleSubmit` offline fallback.

---

## 2. What I changed

- **`src/components/GuruJurnal.tsx`**:
  - Fixed `fetchStudents`: when setting `setAbsensi`, inspects `prevAbsensi` to see if it contains draft marks for matching students in the class (`data.some(...)`). If matching students exist, merges `{ ...initialAbsensi, ...prevAbsensi }` and updates `calculateKehadiranSummary`, safeguarding the teacher's drafted student attendance across reloads.
- **`src/components/GuruPresensi.tsx`**:
  - Hardened `saveToLocalStorage`: added try/catch around `JSON.parse(rawQueue)` and implemented ID deduplication (`queue.findIndex(...)`), preventing offline queue bloat and syntax crash cascades.
  - Hardened `syncOfflinePresensi`: added recovery for corrupt queue JSON by clearing corrupt keys and falling back to `sipjam_offline_presensi`.
  - Added base64 encoding for small PDF document attachments (<= 500 KB) in offline fallback, ensuring Surat Sakit/Izin documents survive offline submission.
- **`src/app/globals.css`**:
  - Added explicit `.break-before-page`, `.break-after-page`, `.page-break-before-always`, and `.page-break-after-always` utility classes under `@media print`.
- **`tests/four_ponytail_improvements.test.ts`**:
  - Added comprehensive adversarial unit tests covering offline queue deduplication, corrupt JSON recovery, draft student attendance preservation during student list sync, and page break utilities.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/four_ponytail_improvements.test.ts`: 11/11 tests PASSED.
  - `npm test`: Full 20-file test suite passed cleanly (100% pass, 0 failed).
  - `npx tsx tests/m6_2_print_redesign.test.ts`: 27/27 PASSED.
  - `npx tsx tests/m10_r1_r4.test.ts`: 23/23 PASSED.
  - `npx tsc --noEmit`: Strict TypeScript typecheck passed with 0 errors.
  - `npm run build`: Turbopack production build succeeded in 2.2s generating 12 static/dynamic routes with 0 errors.

- **Shallow Verification (manual only):**
  - Verified Next.js dynamic chunk imports in `AppScreen.tsx` for all 18 sub-views.
  - Verified print CSS unification in `globals.css` with page-break avoidance and explicit break utilities.

- **Unverified aspects:**
  - Physical mobile device battery-saver aggressive process termination during offline state transitions.
  - Mobile web browser storage quota exhaustion across Safari Private Browsing mode where `localStorage` quota can be 0 MB.

---

## 4. Known Issues
- `Minor Robustness Risk`: In Safari Private Browsing (or browsers with storage completely blocked), `localStorage` operations throw security errors; UI alerts the teacher via toast.
- `Shallow Verification`: Background Google Drive upload performance on severely throttled 2G cellular connections.

---

## 5. Remaining risk & next step
The 4 Ponytail improvements are fully implemented, zero-dependency, verified against all test suites, and hardened against queue corruption, offline bloat, and draft data loss. The task is complete.
