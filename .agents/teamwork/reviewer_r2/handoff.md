> [!WARNING] **Skepticism Disclaimer**
> High confidence in the core algorithmic flow, class name fuzzy normalization, teacher identity consolidation, and UI warning state harmonization; live edge conditions with unverified mobile push delivery remain outside automated mocks.

## 1. What the prior attempt got wrong

1. **Dashboard Completeness False-Positive for Pulang Cepat in `HomeViewAdmin.tsx`**
   - **Input:** Teacher attended school, skipped classes, did not checkout, and received `status_verifikasi = 'Pulang Cepat'` (`presensiPulangStatus = "Pulang Cepat [14:00]"`).
   - **Expected:** `pulangDone` evaluates to `false` and teacher's daily task is marked incomplete (`isTugasLengkap = false`).
   - **Actual:** `pulangDone` evaluated to `true`!
   - **Root Cause:** In `src/components/HomeViewAdmin.tsx` line 433, `pulangDone` checked `presensiPulangStatus.startsWith('Pulang')`. Because `"Pulang Cepat"`.startsWith('Pulang') evaluates to `true`, the dashboard falsely marked the departure requirement as satisfied.

2. **Teacher Identity Segregation Bug in `evaluateAndApplyAutoCheckout`**
   - **Input:** Teacher A checked in via mobile (`user_id = 'usr-123'`, `nama_guru = 'Budi Santoso'`), and checked out via kiosk/scanner (`user_id = null`, `nama_guru = 'Budi Santoso'`).
   - **Expected:** Teacher A's attendance records are recognized as belonging to the same individual with `hasPulang = true`.
   - **Actual:** The system placed the check-in into bucket `uid:usr-123` and check-out into bucket `budi santoso`. Bucket `uid:usr-123` saw `hasPulang = false` and generated a duplicate `Pulang` record and falsely flagged Pulang Cepat.
   - **Root Cause:** In `src/lib/attendanceAlpa.ts`, `teacherRecordsMap` used a ternary key `rec.user_id ? 'uid:' + rec.user_id : rec.nama_guru`, isolating records when one had `user_id` and another did not.

3. **False-Positive Pulang Cepat on Substitute Teacher Inval Activity Journals**
   - **Input:** An inval / substitute teacher filled an activity journal with `keterangan: 'Inval - Jurnal Kegiatan'`.
   - **Expected:** Recognized as having completed a valid activity journal (`hasJurnalKegiatan = true`), exempt from Pulang Cepat.
   - **Actual:** `hasJurnalKegiatan` returned `false`, and the substitute teacher was penalized with `Pulang Cepat`.
   - **Root Cause:** `attendanceAlpa.ts` checked only exact equality `j.keterangan === 'Jurnal Kegiatan'`. Furthermore, it referenced `j.kegiatan_pembelajaran` which was not selected in the SQL query and does not exist in the database table (`kegiatan`).

4. **Class Punctuation & Prefix False-Negatives in `isJurnalMatchJadwal`**
   - **Input:** Timetable schedule stored as `kelas: 'VII A'` or `'Kelas X-1'`, and teacher journal submitted as `kelas: 'VII-A'` or `'X 1'`.
   - **Expected:** `isJurnalMatchJadwal` returns `true`.
   - **Actual:** Returned `false` due to strict string equality `jKelas === jdKelas`.
   - **Root Cause:** In `src/lib/workflow.ts`, differences in hyphens, spaces, periods, or "Kelas " prefixes caused valid classes to be judged as empty schedules, resulting in false Pulang Cepat triggers.

5. **Visual Warning Misclassification in `RekapJurnalView.tsx` & Missing Fallback in `AdminVerifView.tsx`**
   - **Input:** Viewing auto-generated "Tidak Masuk Kelas" records in `RekapJurnalView.tsx`.
   - **Expected:** Prominent orange badge warning for unfulfilled classes.
   - **Actual:** Defaulted to `bg-emerald-50 text-emerald-700` (greenish "Hadir").
   - **Root Cause:** Missing `status_verifikasi === 'Tidak Masuk Kelas'` condition in `RekapJurnalView.tsx`. In `AdminVerifView.tsx`, the auto-checkout badge relied solely on `is_auto_checkout`, failing if that column was stripped during fallback schema retry.

## 2. What I changed

- `src/lib/workflow.ts`:
  - Added class name normalization (`normKelas`) in `isJurnalMatchJadwal` to strip "Kelas " prefix, spaces, hyphens, and periods, preventing false mismatch between `"VII-A"` and `"VII A"`.
- `src/lib/attendanceAlpa.ts`:
  - Consolidated teacher grouping in `evaluateAndApplyAutoCheckout` so records matching by `user_id` or `matchTeacherTokens` are unified into the same teacher group.
  - Expanded `hasJurnalKegiatan` to check substring match `includes('Jurnal Kegiatan')` and fallback `(j.kegiatan || j.keterangan)` when `kelas` is empty/'-', supporting substitute teachers (`'Inval - Jurnal Kegiatan'`).
  - Added `sekolahId` parameter fallback in `emptyJurnalRecord` and checked both `status_verifikasi` and `keterangan` in journal duplicate guard.
- `src/components/HomeViewAdmin.tsx`:
  - Corrected `pulangDone` condition to `presensiPulangStatus.startsWith('Pulang [')`, strictly excluding `Pulang Cepat` from marking duties as complete.
- `src/components/RekapJurnalView.tsx`:
  - Added orange warning badge for `status_verifikasi === 'Tidak Masuk Kelas'` or `keterangan === 'Tidak Masuk Kelas'`.
- `src/components/AdminVerifView.tsx`:
  - Hardened auto-checkout robot badge to check `status_verifikasi === 'Pulang Cepat'` or `jenis_presensi === 'Pulang Cepat'` or `status_verifikasi === 'Lupa Checkout'`, in addition to `is_auto_checkout`.
- `tests/pulang_cepat_dan_jurnal_kosong_verification.test.ts`:
  - Added Section 6 with 5 new automated tests verifying class punctuation normalization, substitute teacher inval activity journals, HomeViewAdmin pulangDone task completion exclusion, RekapJurnalView orange badge styling, and attendanceAlpa teacher group consolidation (Total: 25/25 tests passing).

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - Ran `npx tsx tests/pulang_cepat_dan_jurnal_kosong_verification.test.ts`: 25/25 passed (100%).
  - Ran `npm test`: all 42 automated test suites in repository passed (100% across whole app, 0 failures).
  - Ran `npm run build`: Next.js 16.3.4 Turbopack production build compiled cleanly in 6.6s, TypeScript checks passed in 6.3s, 13/13 static pages generated successfully with 0 errors.
- **Shallow Verification (manual only):**
  - None; all logic backed by automated tests.
- **Unverified aspects:**
  - Real-time mobile push notifications for Pulang Cepat (external push service).

## 4. Known Issues

- `Minor Robustness Risk`: If a school alters schedule periods midway through the day after the cutoff has already executed, existing "Tidak Masuk Kelas" records remain in the database unless edited or deleted by the school admin.

## 5. Remaining risk & next step

- All core functional requirements (R1, R2) and edge cases (class name punctuation, substitute teachers, identity consolidation, dashboard aggregation, and rekap styling) are fully implemented and verified with 100% test pass rate.
- Ready to commit and push to main according to project git rules.
