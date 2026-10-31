> [!WARNING] **Skepticism Disclaimer**
> High confidence in the isolated personal mode schedule scoping, title-tolerant piket teacher cross-matching, unsubmitted action guard in PiketView, and standard unfilled field population in attendanceAlpa; physical hardware camera drivers and browser-specific file dialog interactions remain subject to device webview environment.

## 1. What the prior attempt got wrong

1. **Personal Mode Class & Subject Filter Leakage in `RekapJurnalView.tsx`**
   - **Input:** A teacher who teaches multiple classes (e.g., VII A, VII B, VII C) selects `kelas = 'VII A'` in personal recap mode (`activeMode === 'pribadi'`).
   - **Expected:** Only entries for class VII A should appear. Missing schedule rows for VII B and VII C should not be synthesized into the view, and synthetic "Jurnal Kegiatan" should be suppressed when filtering by a specific class or mapel.
   - **Actual:** Missing schedule entries for VII B and VII C were synthesized and appended into the table even though the user specifically selected class VII A.
   - **Root Cause:** In `RekapJurnalView.tsx:224`, `targetKelas` was only set when `activeMode === 'kelas'`. In personal mode, `targetKelas` remained `null`, causing `allSchedules` to fetch all teaching classes for the teacher. Because the `jurnal_pembelajaran` query was filtered by VII A, `hasJournal` evaluated to `false` for VII B and VII C, falsely generating synthetic missing entries for those unselected classes.

2. **Title (Gelar) Discrepancy & Missing Dropdown Filter Option in `PiketView.tsx`**
   - **Input:** An admin filters Rekap Piket by teacher `rekapGuru` (populated from `data_guru.nama_guru`, which contains titles like "Drs. Budi Santoso, M.Pd"), while `penugasan_piket` or `jadwal_piket` has "Budi Santoso".
   - **Expected:** The filter matches the teacher and shows their missing or submitted piket reports. Also, users should be able to filter by "Tidak Membuat Laporan Piket" via the status dropdown.
   - **Actual:** Strict equality check `rekapGuru !== guruName` failed due to titles, skipping that teacher's missing reports completely. Additionally, the `rekapStatus` dropdown omitted `<option value="tidak membuat laporan piket">`, leaving the filter check in line 1385 unreachable from the UI.
   - **Root Cause:** In `PiketView.tsx:1363`, strict string equality was used instead of title-tolerant token matching, and the status `<select>` element was missing the option.

3. **Errant Admin Verification Buttons ("Setujui" / "Tolak") on Unsubmitted Piket Reports in `PiketView.tsx`**
   - **Input:** Admin views Rekap Piket where a teacher did not submit a report (`status_verifikasi === 'tidak membuat laporan piket'` or synthetic id `unfilled-piket-...`).
   - **Expected:** Missing reports should not display "Setujui" or "Tolak" action buttons, as there is no report to verify.
   - **Actual:** "Setujui" and "Tolak" buttons were rendered. Clicking them triggered an update call to a non-existent database ID.
   - **Root Cause:** In `PiketView.tsx:4125`, the action buttons only checked `isAdmin` without guarding against unsubmitted status or synthetic IDs.

4. **Missing Sunday & Morning Duty Guards in `PiketView.tsx`**
   - **Input:** Errant assignment exists on Sunday, or teacher on piket duty views Rekap Piket early in the morning on today's date (`currTime < 11:00`).
   - **Expected:** Sunday is skipped (not a school day). On today's date, duty is currently active during morning hours, so the teacher should not be flagged as missing report before departure hours.
   - **Actual:** Sunday assignments generated missing piket entries, and today's duty was flagged as "tidak membuat laporan piket" starting at midnight.
   - **Root Cause:** Missing `if (dayName === 'Minggu') continue;` and missing time check for `dateStr === todayStr && currTime < '11:00'`.

5. **Omission of `konten` Field in `attendanceAlpa.ts` Unfilled Duty Records**
   - **Input:** Teacher checks out without filling KBM or Kegiatan journals, triggering `recordUnfilledJournalsAndPiket`.
   - **Expected:** All standard note fields (`materi`, `kegiatan`, `keterangan`, `konten`) receive the required note string ("tidak masuk kelas" or "tidak melaksanakan kegiatan apapun").
   - **Actual:** `konten` field was omitted from `emptyKbmRecord` and `emptyKegiatanRecord`, and `materi` had inconsistent uppercase casing (`'Tidak Masuk Kelas'`).
   - **Root Cause:** Missing `konten` key in record construction and missing column destructuring in schema cache fallback.

## 2. What I changed

- `src/components/RekapJurnalView.tsx`:
  - Scoped `targetKelas` to `activeKelas || (activeMode === 'kelas' && !isAdmin && !isKepalaSekolah && waliClasses.length > 0 ? waliClasses[0] : null)` so class filtering in personal mode properly restricts schedule queries and synthesis.
  - Added support for both `mata_pelajaran` and `mapel` column queries in schedule cross-referencing.
  - Suppressed synthetic unfilled Jurnal Kegiatan when filtering by a specific class or mapel (`!activeKelas && !mapel`).
- `src/components/PiketView.tsx`:
  - Added Sunday guard `if (dayName === 'Minggu') continue;` and morning duty guard `if (dateStr === todayStr && currTime < '11:00') continue;`.
  - Added title-tolerant teacher name comparison when filtering by `rekapGuru`.
  - Added `<option value="tidak membuat laporan piket">Tidak Membuat Laporan Piket</option>` to `rekapStatus` dropdown.
  - Hidden verification action buttons for unsubmitted piket reports (`item.status_verifikasi?.toLowerCase() !== 'tidak membuat laporan piket' && !item.id?.toString().startsWith('unfilled-')`).
- `src/lib/attendanceAlpa.ts`:
  - Added `konten: 'tidak masuk kelas'` to `emptyKbmRecord` and normalized `materi` and `materi_pembelajaran` to lowercase `'tidak masuk kelas'`.
  - Added `konten: 'tidak melaksanakan kegiatan apapun'` to `emptyKegiatanRecord`.
  - Updated schema fallback destructuring to cleanly omit `konten` if the database table lacks that column.
- `tests/jurnal_r1_r2_r3_verification.test.ts`:
  - Added Test 3.11: Verifies personal mode class/mapel filter isolation in `RekapJurnalView`.
  - Added Test 3.12: Verifies title-tolerant matching and action button suppression for unsubmitted reports in `PiketView`.
  - Added Test 3.13: Verifies `konten` field auto-fill for both KBM and Kegiatan unfilled records in `attendanceAlpa`.
  - Expanded test suite from 17 to 20 tests (all passing).

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - Ran `npx tsx tests/jurnal_r1_r2_r3_verification.test.ts`: **20 / 20 tests passed (0 failed)**.
  - Ran `npx tsx tests/pulang_cepat_dan_jurnal_kosong_verification.test.ts`: **30 / 30 tests passed (0 failed)**.
  - Ran `npm test`: **All 44 test suites across the repository passed 100% (0 failed)**.
  - Ran `npm run build`: **Compiled successfully in Next.js Turbopack, TypeScript check finished with 0 errors across 13/13 static and dynamic routes**.
- **Shallow Verification (manual only):**
  - None; all components, state handlers, and synthesis pipelines are programmatically verified.
- **Unverified aspects:**
  - Native mobile browser file picker cancellation handling across legacy Android OS versions.
  - Live Supabase multi-tenant RLS policy on production database during concurrent insertions.

## 4. Known Issues
- `Minor Robustness Risk`: If a mobile browser aggressively restricts storage read permissions for gallery photos, image compression canvas fallback will request re-selection.
- `Minor Robustness Risk`: Teachers with schedules spanning midnight (e.g. 23:00 - 01:00) require day-boundary multi-day timetable handling, which standard K-12 school timetables do not use.

## 5. Remaining risk & next step
- **Remaining risk:** Live Supabase production database permissions for auto-inserted rows under authenticated/anon roles.
- **Next step:** Implementation and adversarial review are complete; all requirements R1, R2, and R3 are satisfied, verified, tested, and regression-free.
