# Handoff Report: Penyesuaian Alur Presensi Pulang Cepat & Jurnal Otomatis Tidak Masuk Kelas

## 1. What I Changed
- `src/lib/attendanceAlpa.ts`:
  - Added and exported `evaluatePulangCepatDanJurnal`: analyzes whether a teacher with active presence Datang, teaching schedules on the day, without teaching journals or Jurnal Kegiatan, and without Pulang qualifies for "Pulang Cepat" and detects all unfulfilled teaching schedules.
  - Added and exported helper functions `isTeacherScheduleMatch` and `isTeacherJournalMatch` ensuring robust multi-tenant school isolation and Title Case/academic title compatibility.
  - Enhanced `evaluateAndApplyAutoCheckout`:
    - Queries active teaching schedules (`jadwal_pelajaran`) and learning journals (`jurnal_pembelajaran`) for target date.
    - If conditions for Pulang Cepat are met, creates explicit auto-checkout record with `status_verifikasi: 'Pulang Cepat'`, `jenis_presensi: 'Pulang Cepat'`, and descriptive admin note.
    - Automatically creates journal entries in `jurnal_pembelajaran` for each empty teaching schedule with `status_verifikasi: 'Tidak Masuk Kelas'`, `materi: 'Tidak Masuk Kelas'`, `kegiatan: 'Tidak Masuk Kelas'`, and `keterangan: 'Tidak Masuk Kelas'`.
    - Preserves standard `status_verifikasi: 'Lupa Checkout'` auto-checkout when teacher has no schedule or filled their journals.
- `src/lib/workflow.ts`:
  - Enhanced auto-checkout detection in `getGuruDailyState` to track `status_verifikasi === 'Pulang Cepat'` and `jenis_presensi === 'Pulang Cepat'`.
- `src/components/GuruPresensi.tsx`:
  - Updated auto-checkout warning alert to render `Peringatan Presensi: Tercatat Pulang Cepat` when `dailyState.lastAutoCheckout.status_verifikasi === 'Pulang Cepat'`, while retaining literal backward-compatibility strings.
- `src/components/AdminVerifView.tsx`:
  - Styled `Pulang Cepat` and `Tidak Masuk Kelas` status badges.
  - Added `Auto-Checkout (Pulang Cepat)` indicator badge in verification card.
- `src/components/HomeViewAdmin.tsx`:
  - Added support to display `Pulang Cepat [HH:MM]` in departure status.
  - Highlighted journal status as `Tidak Masuk Kelas` (rose badge) when empty schedule journals are generated.
- `src/app/api/attendance/auto-alpa/route.ts`:
  - Seamlessly invokes `evaluateAndApplyAutoCheckout` on GET and POST triggers.
- `src/app/api/attendance/auto-checkout/route.ts`:
  - Created dedicated endpoint for `/api/attendance/auto-checkout` (GET & POST).
- `package.json` & `tests/pulang_cepat_dan_jurnal_kosong_verification.test.ts`:
  - Created 15-test automated unit and integration suite covering R1, R2, partial schedule filling, Jurnal Kegiatan exemption, normal checkout exemption, non-teaching day exemption, and multi-tenant isolation.
  - Integrated into default `npm test` pipeline.

## 2. Why
To enforce pedagogical attendance integrity: when a teacher checks in and has teaching duties but leaves school early without teaching their assigned classes or logging journals, the attendance is flagged as "pulang cepat" rather than forgotten checkout ("lupa checkout"), and the unattended classroom periods are officially cataloged as "tidak masuk kelas" to maintain gradebook, administration, and parent transparency.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - Ran `npx tsx tests/pulang_cepat_dan_jurnal_kosong_verification.test.ts`: 15/15 passed (100%).
  - Ran `npm test`: all 42 automated test suites passed (100% success across the entire application).
- **Shallow Verification (manual run only):**
  - Visual color tokens and styling in `AdminVerifView.tsx` and `HomeViewAdmin.tsx` for orange/rose warning tags.
- **Unverified aspects:**
  - Real-time mobile push notifications for Pulang Cepat (outside scope of R1/R2).

## 4. Known Issues
- `Minor Robustness Risk`: If a school modifies schedule periods midway through the day after cutoff has already run, already inserted "tidak masuk kelas" journal records remain in the database unless edited by admin.

## 5. Untested Edge Cases & Next Step
- Edge Case: Extreme edge cases where multiple teachers share the same nickname across different schools without user_id UUID mapping (mitigated by `isTeacherScheduleMatch` school_id check).
- Next Step: Reviewer should verify end-to-end cron trigger with live Supabase database instance.
