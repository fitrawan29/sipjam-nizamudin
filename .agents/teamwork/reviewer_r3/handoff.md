# Adversarial Review & QA Report: Round 3 Review & Hardening

> [!WARNING] **Skepticism Disclaimer**
> High confidence in offline queue durability, zero-leak submit state transitions, and canvas promise stability; hardware GPS lock timing inside deep building basements and extreme Safari Private storage sandboxing remain platform-bound.

## 1. What the prior attempt got wrong

### Issue 1: GuruJurnal Ghost / Zombie Draft Recreation on Successful Submission
- **Input:** Teacher completes a KBM journal entry with Class "8B", Subject "Matematika", and student attendance marks, then submits the journal successfully to Supabase.
- **Expected:** `sipjam_jurnal_autosave` in `localStorage` is removed permanently upon submit, and the form resets cleanly so subsequent visits start with a blank state.
- **Actual:** Line 856 ran `localStorage.removeItem('sipjam_jurnal_autosave')`, but `mapel` and `kelas` were not reset to `''`. On the immediate next React render cycle, the auto-save `useEffect` checked `const hasContent = Boolean(... || mapel || kelas)`. Because `mapel` and `kelas` were still truthy, `hasContent` evaluated to `true`, instantly re-saving a ghost draft (`{ mapel: 'Matematika', kelas: '8B', absensi: ... }`) back into `localStorage`. On page reload, the teacher was greeted with stale draft data from their already-submitted journal.
- **Root Cause:**
  1. `hasContent` incorrectly considered standalone dropdown selections (`mapel || kelas`) as an active draft even with zero written journal content (`materi`, `kegiatan`, `catatanSiswa`, `refleksi`, `tujuanPembelajaran`, `kktp`, `konten`, `lokasiKbm`).
  2. `handleJurnalSubmit` failed to reset `setMapel('')`, `setKelas('')`, and `setAbsensi({})` on successful submission.

### Issue 2: Unhandled Asynchronous Exceptions in Canvas Image Compression Freezing Submit Flow
- **Input:** Teacher attempts to submit presensi or journal in a restricted browser environment or low-memory mobile device where canvas processing encounters an exception (e.g., tainted canvas `SecurityError`, `DOMException` under memory pressure, or unsupported format).
- **Expected:** Canvas compression promise resolves safely with the original file / data URL fallback so the submission can proceed without interrupting the teacher.
- **Actual:** `compressImageWithCanvas` (in `GuruJurnal.tsx`) and `compressPhotoForStorage` (in `GuruPresensi.tsx`) only wrapped the outer synchronous setup (`img.src = srcUrl`) in `try ... catch`. Inside the asynchronous `img.onload` event callback, canvas operations ran unguarded. When an exception was thrown inside `img.onload`, the Promise was never resolved or rejected. `await compressImageWithCanvas(file)` or `await compressPhotoForStorage(...)` in `handleSubmit` hung indefinitely, keeping `loading = true` ("Menyimpan...") permanently locked.
- **Root Cause:** Missing `try ... catch` guard inside the asynchronous `img.onload` handler in both canvas compression helpers.

### Issue 3: Missing Defensive Defaults in Presensi Offline Queue Drive Upload
- **Input:** An offline queued presensi record without explicit `folderName` or `prefix` attributes (e.g. from an earlier schema or fallback queue entry) reconnects to the network and triggers `syncOfflinePresensi`.
- **Expected:** Google Drive upload safely defaults to standard presensi folders and file prefixes.
- **Actual:** Line 228 called `uploadToDrive(fileObj, item.payload.nama_guru, item.folderName, item.prefix)`, passing `undefined` for `folderFitur` into the GAS webhook payload. Furthermore, updating `localStorage.setItem` for remaining items lacked a try-catch guard.
- **Root Cause:** Missing defensive fallback defaults for `item.folderName || 'Presensi_Guru'`, `item.prefix || (item.isSelfie ? 'Selfie' : 'Dokumen')`, and `teacherName = item.payload?.nama_guru || user?.nama || 'Guru'`.

---

## 2. What I changed

- **`src/components/GuruJurnal.tsx`**:
  - Fixed `hasContent` in auto-save `useEffect`: now requires at least one actual written journal content field (`materi`, `kegiatan`, `catatanSiswa`, `refleksi`, `tujuanPembelajaran`, `kktp`, `konten`, `lokasiKbm`).
  - Added complete form cleanup in `handleJurnalSubmit`: resets `setMapel('')`, `setKelas('')`, and `setAbsensi({})` alongside text fields, ensuring drafts are never resurrected after submission.
  - Hardened `compressImageWithCanvas`: added `try ... catch` inside `img.onload` to ensure the Promise always resolves safely with `imageFile` on any canvas execution failure.
- **`src/components/GuruPresensi.tsx`**:
  - Hardened `compressPhotoForStorage`: supported `Blob` instances alongside `File` and guarded `img.onload` with `try ... catch` to prevent hanging promises.
  - Added robust fallback parameters in `syncOfflinePresensi` background Drive upload (`folderFitur`, `prefix`, `teacherName`) and guarded remaining queue updates with try-catch.
- **`tests/four_ponytail_improvements.test.ts`**:
  - Added tests verifying: (1) `GuruJurnal` submission cleanly clears draft without zombie draft resurrection, (2) internal `try-catch` inside `img.onload` in canvas compression helpers, and (3) offline sync folder fallbacks.

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npx tsx tests/four_ponytail_improvements.test.ts`: 13/13 tests PASSED (100%).
  - `npm test`: Full 20-file test suite passed cleanly (100% pass, 0 failed).
  - `npx tsx tests/m6_2_print_redesign.test.ts`: 27/27 PASSED.
  - `npx tsx tests/m10_r1_r4.test.ts`: 23/23 PASSED.
  - `npx tsc --noEmit`: Strict TypeScript typecheck passed with 0 errors.
  - `npm run build`: Turbopack production build succeeded in 2.3s generating 12 static/dynamic routes with 0 errors.

- **Shallow Verification (manual only):**
  - Verified Next.js dynamic chunk imports in `AppScreen.tsx` for all 18 sub-views without breaking layout or context hierarchy.
  - Verified print CSS unification in `globals.css` with page-break avoidance, print watermark, and table flow resets.

- **Unverified aspects:**
  - Physical mobile device battery-saver aggressive process termination during offline state transitions.
  - Safari Private Browsing mode where `localStorage` quota can be 0 MB.

---

## 4. Known Issues
- `Minor Robustness Risk`: In Safari Private Browsing (or browsers with storage completely blocked), `localStorage` operations throw security errors; UI alerts the teacher via toast.
- `Shallow Verification`: Background Google Drive upload performance on severely throttled 2G cellular connections.

---

## 5. Remaining risk & next step
The 4 Ponytail improvements are fully implemented, zero-dependency, verified against all test suites, and hardened against queue corruption, ghost drafts, and async compression hangs. The task is complete.
