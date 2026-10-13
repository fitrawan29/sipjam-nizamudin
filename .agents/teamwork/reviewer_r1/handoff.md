# Handoff Report — Reviewer Round 1

> [!WARNING] **Skepticism Disclaimer**
> Moderate-to-high confidence on client and API business logic; live hardware camera permission and real-time physical device GPS sensor accuracy in mobile browsers remain physical-environment dependencies.

## 1. What the prior attempt got wrong

### Issue 1: Dropped GPS Coordinates in Fallback Database Insert (`compatiblePresensi`)
- **Input:** Teacher submits Dinas Luar attendance, but client direct insert fails due to PostgREST schema cache or missing column retry.
- **Expected:** Retried attendance record retains `latitude` and `longitude` captured from GPS.
- **Actual:** `latitude` and `longitude` were omitted from `compatiblePresensi`, dropping GPS coordinates on retry.
- **Root Cause:** In `GuruPresensi.tsx`, `compatiblePresensi` fallback object constructed for retry lacked `latitude: newPresensi.latitude` and `longitude: newPresensi.longitude`.

### Issue 2: Dropped GPS Coordinates in Server Route (`/api/attendance`)
- **Input:** Teacher submits attendance and network/RLS issues trigger server fallback `POST /api/attendance`.
- **Expected:** Server route saves `latitude` and `longitude` to `presensi_guru`.
- **Actual:** `/api/attendance/route.ts` did not extract `latitude` or `longitude` from the request body or assign them to `presensiRecord` or `baseCleanRecord`.
- **Root Cause:** Omission of `body.latitude` and `body.longitude` mapping in `src/app/api/attendance/route.ts`.

### Issue 3: Loss of Dinas Luar State on Toggling `tipeAbsen` (Datang <-> Pulang)
- **Input:** Teacher chooses "Dinas Luar", then switches `tipeAbsen` to "Pulang" before submitting Datang.
- **Expected:** "Dinas Luar" choice is preserved.
- **Actual:** `handleTipeAbsenChange` evaluated `dailyState?.isDinasLuar ? 'Dinas Luar' : 'Sekolah'`, resetting the dropdown to 'Sekolah' because Datang had not yet been submitted in the DB.
- **Root Cause:** Asymmetrical state preservation in `handleTipeAbsenChange`.

### Issue 4: Stale Document Logic in `getRequiredDocName`
- **Input:** Code inspection of `getRequiredDocName()`.
- **Expected:** Dead branch returning `'Surat Tugas'` for Dinas Luar purged, since Dinas Luar is now 100% camera-based.
- **Actual:** `if (jenisPresensi === 'Dinas Luar') return 'Surat Tugas';` remained as confusing dead code.
- **Root Cause:** Incomplete cleanup of legacy file-upload logic.

### Issue 5: Shallow Verification Test Suite
- **Input:** `tests/dinas_luar_kamera_verification.test.ts`.
- **Expected:** Functional and behavioral assertion tests for geofence bypass, distance thresholds, state transitions, and API coordinate extraction.
- **Actual:** Only static string matching (`code.includes(...)`) was performed.
- **Root Cause:** Implementer relied exclusively on substring checks without runtime functional assertions.

## 2. What I changed
- `src/components/GuruPresensi.tsx`:
  - Added `latitude: newPresensi.latitude` and `longitude: newPresensi.longitude` to `compatiblePresensi`.
  - Preserved Dinas Luar across `tipeAbsen` changes: `nextJenisPresensi = (jenisPresensi === 'Dinas Luar' || dailyState?.isDinasLuar) ? 'Dinas Luar' : 'Sekolah'`.
  - Purged obsolete `if (jenisPresensi === 'Dinas Luar') return 'Surat Tugas'` in `getRequiredDocName`.
  - Dynamically customized "Ganti Foto" confirmation dialog text to state "Foto lokasi..." when `jenisPresensi === 'Dinas Luar'`.
- `src/app/api/attendance/route.ts`:
  - Extracted `latitude` and `longitude` from `body` and added them to `presensiRecord` and `baseCleanRecord`.
- `tests/dinas_luar_kamera_verification.test.ts`:
  - Expanded test suite from basic substring checks to 17 deep tests including functional simulations of geofence radius bypass (e.g. 50km out-of-range), state transition prompt rules, and API coordinate handling.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/dinas_luar_kamera_verification.test.ts`: 17 passed, 0 failed across 4 sections.
  - `npm test`: All 24 test suites passed 100% (47 multi-sekolah tests, 19 superadmin cleanup tests, 17 dinas luar tests, etc.).
  - `npx tsc --noEmit`: Clean exit code 0, zero TypeScript compiler errors.
  - `npm run build`: Production Turbopack build compiled cleanly in 3.4s, static page generation (12/12) completed cleanly.
- **Shallow Verification (manual only):**
  - Inspected prompt texts, button states, and JSX structure for Dinas Luar camera selfie form.
- **Unverified aspects:**
  - Live hardware smartphone camera sensor feed on an actual physical mobile device.
  - Real-world Google Apps Script execution with live Google Drive credentials.

## 4. Known Issues
- `Minor Robustness Risk`: On mobile devices if the user denies camera permission, `CameraSelfieCapture` displays an in-card error message and does not have an automated fallback to file upload (by design per requirement R1).
- `Shallow Verification`: Google Drive upload mock endpoint verified via logic simulation; live GAS script endpoint execution requires live deployment credentials.

## 5. Remaining risk & next step
- Implementation is complete, hardened, and verified with zero compiler or test errors. All 4 requirements (R1 camera selfie, R2 radius bypass & GPS persistence, R3 seamless state transitions, R4 Google Drive routing) are satisfied and covered by tests.
