> [!WARNING] **Skepticism Disclaimer**
> High confidence in the core journal photo upload pipeline, flexible presensi pulang workflow, departure schedule time boundaries, dynamic rekap schedule cross-referencing, and title-normalized idempotency; production mobile file pickers remain dependent on browser OS permissions.

## 1. What the prior attempt got wrong

1. **Rekap Jurnal Omission of Unfilled Scheduled Classes in `RekapJurnalView.tsx`**
   - **Input:** Teacher was scheduled to teach on a given date/time but had not submitted a journal, and presensi pulang had not yet been executed (or auto-checkout had not yet run).
   - **Expected:** Rekap Jurnal displays the scheduled class entry with `keterangan: "tidak masuk kelas"` and badge `status_verifikasi: "Tidak Masuk Kelas"`.
   - **Actual:** Rekap Jurnal showed zero entries for that class or date (empty table), failing Requirement R3.
   - **Root Cause:** In `RekapJurnalView.tsx`, `tarikRekap` only queried `jurnal_pembelajaran`. It lacked timetable schedule cross-referencing against `jadwal_pelajaran`. Unlike `PiketView.tsx` which synthesized missing entries for unsubmitted piket duties, `RekapJurnalView.tsx` only transformed rows that were already physically inserted into `jurnal_pembelajaran`.

2. **Duplicate Empty Journal Insertion Bug on Academic Title Differences**
   - **Input:** `recordUnfilledJournalsAndPiket` executed where teacher name in `user.nama` has academic titles (e.g. `"Bambang Sudibyo, M.Pd."`) while `jurnal_pembelajaran` or `jadwal_pelajaran` had `"Bambang Sudibyo"`, or when `sched.mata_pelajaran` had minor naming differences from `jurnal.mapel`.
   - **Expected:** Existing journals are recognized via token matching (`isTeacherJournalMatch`) and fuzzy schedule matching (`isJurnalMatchJadwal`), preventing duplicate inserts.
   - **Actual:** Duplicate empty journal records were inserted on repeated checkout or re-submission.
   - **Root Cause:** `recordUnfilledJournalsAndPiket` used strict equality query `.eq('nama_guru', teacher.nama_guru).eq('mapel', sched.mata_pelajaran)` directly in Supabase client instead of normalized token and fuzzy matching functions (`matchTeacherTokens`, `isTeacherJournalMatch`, `isJurnalMatchJadwal`).

3. **Silent Failure When `recordUnfilledJournalsAndPiket` Called with Empty State `{}`**
   - **Input:** Teacher submits checkout in `GuruPresensi.tsx` before `dailyState` has fully populated or when `dailyState` is an empty object `{}`.
   - **Expected:** Autonomous resolution of schedules, piket duties, and existing journals from the database.
   - **Actual:** Silent failure / skipped recording because `state.jadwalKBM` was undefined (`if (state.jadwalKBM && ...)` evaluated to false).
   - **Root Cause:** Missing fallback queries in `recordUnfilledJournalsAndPiket` to fetch `jadwal_pelajaran`, `jurnal_pembelajaran`, and `penugasan_piket` when state fields are omitted.

4. **Gallery File Picker Re-Selection Freeze in `GuruJurnal.tsx`**
   - **Input:** Teacher uploads a photo via the gallery input in `GuruJurnal.tsx`, cancels or resets, and then re-selects the exact same photo from their device.
   - **Expected:** The photo input fires `onChange` and the selected photo is previewed.
   - **Actual:** Nothing happens (no change event fired by the browser).
   - **Root Cause:** Standard HTML `<input type="file">` does not trigger `onChange` if the file value hasn't changed. Missing `onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}` reset handler.

5. **Missing Function Import `getWitaDayName` in `attendanceAlpa.ts`**
   - **Input:** Invoking `recordUnfilledJournalsAndPiket` without pre-computed schedule.
   - **Expected:** Resolves day of week in WITA format.
   - **Actual:** Crashed with `ReferenceError: getWitaDayName is not defined`.
   - **Root Cause:** `getWitaDayName` was not included in the import list from `@/lib/wita`.

## 2. What I changed

- `src/components/RekapJurnalView.tsx`:
  - Imported `getWitaDayName`, `getWitaTimeStr`, `isJurnalMatchJadwal`, `isTeacherScheduleMatch`, and `isTeacherJournalMatch`.
  - Added dynamic timetable schedule cross-referencing in `tarikRekap`: queries `jadwal_pelajaran` across the evaluated date range or month. For past dates or current date where class start time has elapsed, any unfilled schedule without a matching journal entry is synthesized into a missing entry with `keterangan: "tidak masuk kelas"`, `materi: "tidak masuk kelas"`, `kegiatan: "tidak masuk kelas"`, and `status_verifikasi: "Tidak Masuk Kelas"`.
- `src/lib/attendanceAlpa.ts`:
  - Imported `getWitaDayName` from `@/lib/wita`.
  - Updated `isTeacherScheduleMatch` and `isTeacherJournalMatch` parameter types to accept `sekolah_id?: string | null`.
  - Hardened `recordUnfilledJournalsAndPiket` with autonomous fallbacks for `jadwalKBM`, `jurnalKBM`, `isPiket`, and `laporanPiket` when `state` is empty or partial.
  - Replaced strict `.eq('nama_guru', ...)` and `.eq('mapel', ...)` checks with `isTeacherJournalMatch`, `isJurnalMatchJadwal`, and `matchTeacherTokens` to guarantee idempotency and eliminate duplicate inserts from academic title or spacing differences.
- `src/components/GuruJurnal.tsx`:
  - Added `onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}` on `#jurnal-gallery-file-input` so re-selecting the same photo immediately triggers `onChange`.
- `tests/jurnal_r1_r2_r3_verification.test.ts`:
  - Added Test 1.2: File input value reset on click.
  - Added Test 2.4: Departure time boundary conditions (`currTimeVal === startVal` allows checkout; `currTimeVal < startVal` blocks).
  - Added Test 3.5: Autonomous `recordUnfilledJournalsAndPiket` resolution with empty state `{}`.
  - Added Test 3.6: Title normalization and duplicate prevention with academic titles.
  - Added Test 3.7: `RekapJurnalView` dynamic timetable cross-referencing for unsubmitted schedules.
  - Total test count expanded from 8 to 13 tests (all passing).

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - Ran `npx tsx tests/jurnal_r1_r2_r3_verification.test.ts`:
    - Result: **13 / 13 tests passed (0 failed)**.
    - Verified:
      - R1: Photo upload unconditional access (1.1) and re-selection reset (1.2).
      - R2: Presensi pulang flexibility (2.1), blocking when no datang or on izin/sakit (2.2), jam_pulang check enforcement (2.3), and exact departure boundary condition `currTimeVal === startVal` vs `< startVal` (2.4).
      - R3: Database standard descriptions for KBM and Piket (3.1), Kegiatan (3.2), UI/CSV display in RekapJurnalView (3.3), PiketView display (3.4), autonomous resolution with empty state (3.5), title-normalized duplicate prevention (3.6), and RekapJurnalView schedule cross-referencing (3.7).
  - Ran `npm test`:
    - Result: **All 44 test suites in repository passed 100% (0 failed)**.
  - Ran `npm run build`:
    - Result: **Compiled successfully in Next.js Turbopack, TypeScript check completed with 0 errors across 13/13 static and dynamic routes**.
- **Shallow Verification (manual only):**
  - None; all components, workflow state transitions, and edge cases are programmatically verified.
- **Unverified aspects:**
  - Hardware camera hardware driver quirks on specific Android/iOS webview browsers when switching directly from camera to native device file picker.
  - High concurrency race condition when two admin clients trigger auto-checkout on the exact same second while a teacher simultaneously checks out.

## 4. Known Issues

- `Minor Robustness Risk`: If a mobile browser aggressively restricts storage read permissions for gallery photos, image compression canvas fallback will request re-selection.
- `Minor Robustness Risk`: Teachers with schedules spanning midnight (e.g. 23:00 - 01:00) require day-boundary multi-day timetable handling, which standard K-12 school timetables do not use.

## 5. Remaining risk & next step

- **Remaining risk:** Live Supabase multi-tenant database policies in production should confirm `anon` or authenticated role has write permission to `laporan_piket` and `jurnal_pembelajaran` for auto-generated records.
- **Next step:** The task implementation and adversarial verification are complete; all requirements R1, R2, and R3 are satisfied, verified, tested, and regression-free.
