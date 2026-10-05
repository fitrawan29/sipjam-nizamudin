# Handoff Report: Presensi Siswa Two-Way Sync & Superadmin Config Removal

## Summary of Changes
1. **Superadmin UI Simplification (`src/components/SuperadminView.tsx`):**
   - Completely removed `mode_presensi_siswa` configuration fields from the Add School and Edit School modal dialogs.
   - Removed `handleTogglePresensiMode` function.
   - Removed the table column action toggle and badge toggle for `mode_presensi_siswa`.
   - Kept the backend default fallback `mode_presensi_siswa: 'qr'` in `handleCreateSchool` so database check constraints remain satisfied without exposing obsolete configuration in the UI.

2. **Unified Piket View with Bidirectional Synchronization (`src/components/PiketView.tsx`):**
   - Removed conditional branch `{modePresensiSiswa === 'manual' ? ... : ...}` in favor of simultaneous rendering of QR Scanner (USB HID & Camera) and Manual Presensi roster.
   - Removed `fetchSchoolMode` and real-time subscription for school mode.
   - Renamed tab header unconditionally to `Presensi Siswa (QR & Manual)`.
   - Implemented bidirectional synchronization:
     - Scanning via QR (camera/USB) automatically populates `searchQuery` and resets `selectedRombel` to `""`, instantly filtering the roster to show the scanned student.
     - Typing into the manual search input updates `usbInput` in real-time. If the typed query no longer matches the currently displayed scan card's student (NISN/Nama), `lastScanResult` is automatically dismissed to prevent stale visual confirmation.
     - Submitting the manual attendance form (`handleManualFormSubmit`) or clicking Datang/Pulang (`handleManualMark`) creates an attendance record via `recordPresensiSiswa` and mirrors the real-time feedback into `lastScanResult` as if scanned via QR.
     - Cancelling manual presensi (`handleCancelManualPresensi`) cleans up any matching scan feedback card.
   - Refined USB auto-focus listener to respect active focus on interactive form elements (input/select/textarea) so manual typing is uninterrupted.

3. **Automated Test Suite (`tests/presensi_siswa_sync_and_superadmin.test.ts`):**
   - Comprehensive test suite covering R1 (two-way sync, unified view), R2 (Superadmin UI removal), and R3 (attendance recording contract).
   - 11/11 tests passing cleanly.

## Verification
- Unit test suite `tests/presensi_siswa_sync_and_superadmin.test.ts`: Passed (11/11).
- Existing test suite `npm test`: Passed (all 23 test suites, 73 checks).
- Typecheck `npx tsc --noEmit`: 0 errors.
- Production build `npm run build`: Succeeded.
