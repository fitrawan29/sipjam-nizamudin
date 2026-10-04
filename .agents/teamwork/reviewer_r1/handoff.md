# Adversarial Review & QA Report: 4 Ponytail Improvements

> [!WARNING] **Skepticism Disclaimer**
> Moderate-to-high confidence in core resilience paths; verified with programmatic test assertions, TypeScript validation, Turbopack production build, and simulated offline quota limits. Real-world physical device camera stream lifecycles across diverse mobile browser vendors remain subject to platform sandbox behavior.

## 1. What the prior attempt got wrong

### Issue 1: Missing Photo Compression & Quota Crash in Presensi Offline Fallback
- **Input:** Teacher submits Presensi while offline or with network failure, using a standard device camera capture or photo attachment (typically 3–8 MB).
- **Expected:** The photo is compressed via HTML `<canvas>` to ~40–60 KB before serialization so it fits into `localStorage` (which has a strict 5–10 MB domain quota), and if storage quota is still exhausted, the attendance record payload (time, GPS, teacher identity) is preserved safely without the photo.
- **Actual:** Prior attempt called `FileReader.readAsDataURL(file)` directly on raw uncompressed photos. A 5 MB photo serialized to ~6.7 MB base64 text, immediately throwing `DOMException: QuotaExceededError`. The `catch (offlineErr)` block intercepted this as a fatal failure, displaying an error toast and completely discarding the teacher's check-in record.
- **Root Cause:** Absence of canvas image compression in `GuruPresensi.tsx` and lack of quota-exceeded fallback handling.

### Issue 2: Offline Reconnect Sync Concurrency Race & Duplicate Rejection
- **Input:**
  1. Teacher reconnects; both `navigator.onLine` mount check and `window.addEventListener('online')` fire concurrently.
  2. Or an offline item was previously written to Supabase before a network drop, but client disconnected before receiving the 200 response; on reconnect, Supabase returns error `23505` (`duplicate key value violates unique constraint`).
- **Expected:**
  1. Sync execution is guarded by an `isSyncingRef` lock so parallel loops don't race, mutate the queue concurrently, or trigger duplicate uploads.
  2. Duplicate key code `23505` is treated as a successful sync (`sent = true`) and removed from the offline queue.
- **Actual:**
  1. Multiple listeners could invoke `syncOfflinePresensi` concurrently.
  2. Duplicate key error left the item indefinitely stuck in the `localStorage` queue on every reconnect.
- **Root Cause:** Missing `isSyncingRef` locking and missing duplicate key (`23505`) handling in `syncOfflinePresensi`.

### Issue 3: HTML `<canvas>.toBlob` Android WebView Incompatibility
- **Input:** Older Android WebViews or legacy mobile browser engines lacking `HTMLCanvasElement.prototype.toBlob`.
- **Expected:** Canvas compression provides a graceful fallback using `canvas.toDataURL` or original file fallback without throwing runtime `TypeError`.
- **Actual:** Direct invocation of `canvas.toBlob(...)` without verifying existence would reject or throw `TypeError: canvas.toBlob is not a function`.
- **Root Cause:** Missing feature check `typeof canvas.toBlob === 'function'` in `compressImageWithCanvas`.

### Issue 4: Form Draft Not Cleared When Emptied by User
- **Input:** Teacher starts entering a draft in `GuruJurnal`, then manually empties/clears all fields to start over, and refreshes the page.
- **Expected:** Cleared form remains empty upon page reload.
- **Actual:** The previous non-empty draft was restored from `localStorage` because auto-save only updated when `hasContent` was truthy, never clearing `sipjam_jurnal_autosave` when fields were emptied.
- **Root Cause:** Missing `localStorage.removeItem('sipjam_jurnal_autosave')` in the auto-save effect's `else` branch.

---

## 2. What I changed

- **`src/components/GuruPresensi.tsx`**:
  - Implemented `compressPhotoForStorage` using native HTML `<canvas>` scaling photos to max 800px / 0.6 quality (~40–60 KB data URLs) prior to `localStorage` insertion.
  - Added storage quota recovery in offline fallback: if `localStorage.setItem` throws `QuotaExceededError`, it catches and safely persists the presensi payload with `photo: null`, guaranteeing the teacher never loses their attendance check-in.
  - Added `isSyncingRef` concurrency guard to `syncOfflinePresensi` preventing overlapping executions on reconnect.
  - Added Postgres duplicate key (`23505` / duplicate key) resilience in `syncOfflinePresensi`, preventing phantom stuck records.

- **`src/components/GuruJurnal.tsx`**:
  - Enhanced `compressImageWithCanvas` with `typeof canvas.toBlob === 'function'` check and native `toDataURL` byte buffer fallback for older Android WebViews.
  - Added draft cleanup `localStorage.removeItem('sipjam_jurnal_autosave')` when the user empties all form fields, preventing stale draft restoration.

- **`tests/four_ponytail_improvements.test.ts`**:
  - Added adversarial unit tests and lifecycle simulations verifying `isSyncingRef` concurrency locks, `compressPhotoForStorage`, quota-exceeded payload preservation, `toBlob`/`toDataURL` compatibility, and empty draft cleanup.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/four_ponytail_improvements.test.ts`: All 9/9 audit & edge case tests PASSED.
  - `npm test`: Full 20-file regression suite (35 QR/attendance tests, 37 kiosk scanner checks, 31 wali kelas/guru sync tests, etc.) PASSED (0 failed).
  - `npx tsc --noEmit`: TypeScript typecheck PASSED with 0 errors.
  - `npm run build`: Next.js 16.3.4 Turbopack production build succeeded, generating 12 static/dynamic routes in 2.4s with 0 errors.

- **Shallow Verification (manual only):**
  - Verified Next.js dynamic chunk boundaries in `AppScreen.tsx` for all 18 sub-views.
  - Verified `@media print` unified rules in `globals.css` with page-break and card break avoidance rules.

- **Unverified aspects:**
  - Real device hardware GPS cold start timing in extreme signal deprivation (e.g. subterranean basements).
  - WebPush background sync capabilities when mobile browser OS aggressively terminates background web workers.

---

## 4. Known Issues
- `Minor Robustness Risk` — If a device browser has `localStorage` disabled entirely via strict private browsing security policy, offline queue storage will be unavailable; UI gracefully displays network error toasts.
- `Shallow Verification` — Native camera hardware stream resolution renegotiation across very diverse low-end Android WebView versions.

---

## 5. Remaining risk & next step
The 4 Ponytail improvements are robust, zero-dependency, verified against all 20 repo test suites, pass strict TypeScript checks, compile in Turbopack production build, and have had their critical offline quota and concurrency failure modes remediated. The task is fully complete.
