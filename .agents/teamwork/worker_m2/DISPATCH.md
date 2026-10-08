## 2026-10-08T12:26:47Z
You are teamwork_preview_worker_m2.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INPUT FILES:
1. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md first (under header '## 2026-10-08T11:11:29Z').
2. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md.
3. Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o16_2\report.md.

YOUR SCOPE & EXCLUSIVE WRITE OWNERSHIP:
- src/types/database.ts
- supabase/migrations/20261008_m2_presensi_guru_approval_autocheckout.sql
- src/components/GuruPresensi.tsx
- src/lib/workflow.ts
- src/lib/attendanceAlpa.ts
- src/components/AdminVerifView.tsx
- src/components/PrintHeader.tsx
- src/utils/printWithGps.ts (or src/lib/gpsPrint.ts)
- tests/m2_teacher_attendance_verification.test.ts

TASK INSTRUCTIONS (Follow explorer_o16_2/report.md blueprint):
1. Database Schema & Migration:
   - Create migration `supabase/migrations/20261008_m2_presensi_guru_approval_autocheckout.sql` adding nullable columns to `public.presensi_guru`:
     `durasi_hari INTEGER DEFAULT 1`,
     `tanggal_mulai DATE`,
     `tanggal_selesai DATE`,
     `memerlukan_persetujuan_admin BOOLEAN DEFAULT false`,
     `is_auto_checkout BOOLEAN DEFAULT false`
   - Update `src/types/database.ts` for `presensi_guru` row/insert/update types.

2. Teacher Attendance Flow & Multi-State Transitions:
   - In `src/components/GuruPresensi.tsx`:
     - Unlock the `Pulang` dropdown (`isJenisDropdownDisabled`) so teachers can select between "Hadir di Sekolah" (or "Sekolah") and "Dinas Luar" when checking out, supporting all 4 state transitions ("Hadir di Sekolah" <-> "Dinas Luar").
     - In the leave form (`jenisPresensi === 'Izin'`), add duration fields (`durasi_hari` with default 1, min 1, and start/end dates).
     - Calculate `memerlukan_persetujuan_admin = (detailIzin === 'Sakit' && durasi >= 3) || (jenisPresensi === 'Izin' && durasi > 3)`.
     - Display informational badge indicating if admin approval is required.
   - In `src/lib/workflow.ts`:
     - Track arrival vs departure states cleanly.
     - Add multi-day approved leave coverage: if teacher has an approved sick/leave record where today is within `[tanggal_mulai, tanggal_selesai]`, mark `isIzinSakit = true`, `bebasAlpa = true`.

3. Auto-Checkout Flagging (Forgotten Checkouts):
   - In `src/lib/attendanceAlpa.ts`:
     - Add `evaluateAndApplyAutoCheckout` function to detect teachers who checked in (`Datang`) on targetDate but never checked out (`Pulang`) past `jam_pulang_akhir`.
     - Insert/flag an explicit auto-checkout record with `is_auto_checkout = true`, `status_verifikasi = 'Lupa Checkout'`, `catatan_admin = 'Auto-checkout: Guru tidak melakukan presensi pulang'`.
   - In `GuruPresensi.tsx`:
     - Surface a warning/notification banner if teacher was flagged as "Lupa Checkout" on their last attendance day.

4. Admin Verification Routing:
   - In `src/components/AdminVerifView.tsx`:
     - On the Presensi verification tab, detect long-term sick (>= 3 days) and leave (> 3 days).
     - Display distinctive badges ("Sakit >= 3 Hari (Perlu Persetujuan)", "Izin > 3 Hari (Perlu Persetujuan)") along with the date range and duration.
     - Ensure admin can approve or reject with feedback.

5. GPS Coordinates on Printed Documents:
   - Create helper `src/utils/printWithGps.ts` (or `src/lib/gpsPrint.ts`).
   - In `src/components/PrintHeader.tsx`'s `PrintSignature`:
     - Accept and render `gpsCoordinates` (latitude, longitude, timestamp) in the official legal security footer.
   - Trigger print with geolocation: if `navigator.geolocation` fails or user blocks/denies permission, display a SweetAlert alert notifying the user that GPS access is blocked/required.

6. Verification Commands:
   - `npx tsc --noEmit`
   - `npm test`
   - `npx tsx tests/m2_teacher_attendance_verification.test.ts`
   - `npx tsx tests/e2e/run_all_e2e.ts`
   - `npm run build`
7. Git Workflow:
   - Stage changes (`git add .`), commit with descriptive message (`feat(m2): implement teacher attendance multi-state, auto-checkout, admin routing, and gps print`), and push to `origin main`.

Deliver detailed handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2\handoff.md`.
Notify orchestrator (conversation ID 835d6ca7-b3e2-474a-acf0-423026614449).
