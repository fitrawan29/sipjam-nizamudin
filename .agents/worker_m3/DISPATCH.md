# Dispatch for Worker M3 (R4 & R5: Attendance Rules & Direct Camera Integration)

## Identity
- Role: Worker
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m3
- Parent: orchestrator_10

## Scope: Milestone 3 (R4 & R5)

### R4. Pengaturan Kehadiran & Jadwal (Admin)
1. **Admin Attendance Settings UI (`src/components/AdminConfigView.tsx`)**:
   - Under "Pengaturan Jam Presensi", add input for **Jam Pulang Hari Jumat** (`jam_pulang_jumat`, default `'11:00'`). Save to `pengaturan` (key `jam_pulang_jumat`).
   - Under "Aturan Kehadiran Guru", add an interactive teacher selection interface for **Pengecualian Kehadiran Guru (Hanya wajib hadir saat hari mengajar)**.
     - Fetch active teachers from `data_guru`.
     - Allow Admin to search and toggle checkboxes for teachers who only need to be present on teaching days.
     - Save the selected teacher IDs/names into `pengaturan` (key: `guru_hanya_mengajar` as JSON string) and update `data_guru.wajib_hadir_hanya_mengajar = true/false`.
     - Teachers NOT in this exception list remain under the default rule: "Wajib hadir setiap hari kerja".
2. **Attendance Workflow Calculation (`src/lib/workflow.ts` - `getGuruDailyState`)**:
   - Check if teacher is marked as `wajib_hadir_hanya_mengajar` or in `guru_hanya_mengajar`.
   - If marked with exception:
     - Check if today is a teaching day (or piket duty day) for this teacher.
     - If today is NOT a teaching day: set `isAlpa: false`, `bebasAlpa: true`, `isNonTeachingDay: true`, `lockedReason: 'Hari ini tidak ada jadwal mengajar (Bebas Kehadiran).'`.
   - If NOT marked with exception (default):
     - Teacher is required to attend every workday.
     - If teacher has not done Presensi Datang: set `isAlpa: true`, `bebasAlpa: false`.
3. **Friday Pulang Checkout Rule (`src/components/GuruPresensi.tsx`)**:
   - Query `jam_pulang_jumat` from settings.
   - When `tipeAbsen === 'Pulang'`:
     - Check if today is Friday (`getWitaDayName(now) === 'Jumat'`).
     - If Friday: validate checkout opening against `jam_pulang_jumat` (fallback to `jam_pulang_mulai`).
     - If not Friday: validate against `jam_pulang_mulai`.
     - Update UI card and validation alert to reflect Friday checkout time.

### R5. Integrasi & Aturan Kamera Langsung
1. **Camera Component (`src/components/CameraSelfieCapture.tsx`)**:
   - Remove ALL `<input type="file">` and gallery upload options:
     - Remove hidden file input at lines 310-317.
     - Remove manual file upload button at lines 346-352 ("Pilih dari Galeri").
     - Remove device photo picker in error state (lines 280-285).
   - Add camera toggle between front (`facingMode: 'user'`) and rear (`facingMode: 'environment'`).
   - When toggled, re-request `getUserMedia({ video: { facingMode: { ideal: facingMode } } })`.
   - Apply horizontal flip CSS (`-scale-x-100`) ONLY when `facingMode === 'user'`.
2. **Watermark Engine (`src/lib/watermarkCanvas.ts`)**:
   - Pass parameter `mirror: boolean` (true for front camera, false for rear camera).
   - Apply `ctx.scale(-1, 1)` only when `mirror === true` so rear camera photos are NOT horizontally mirrored.
3. **Presensi Pulang (`src/components/GuruPresensi.tsx`)**:
   - Update `isSelfieRequired` so that ALL Presensi Pulang checkouts require camera capture.
4. **Jurnal Pembelajaran (`src/components/GuruJurnal.tsx`)**:
   - Completely remove `<input type="file">` (line 635).
   - Render `<CameraSelfieCapture>` directly in the form for photo capture with shutter, preview, confirm, and retake. Convert captured image to File for `uploadToDrive`.
5. **Laporan Piket (`src/components/PiketView.tsx`)**:
   - Completely remove `<input type="file">` (line 1139).
   - Render `<CameraSelfieCapture>` directly in the form for photo capture with shutter, preview, confirm, and retake. Convert captured image to File for `uploadToDrive`.

## Verification
- Run `npx tsc --noEmit` and any unit tests.
- Verify that `npx tsc --noEmit` exits with 0 errors.

## Git Workflow Rule
- `git status`
- `git add .`
- `git commit -m "feat(attendance-camera): add friday checkout, teacher attendance exceptions, and direct live camera enforcement"`
- `git push origin main`

## Output
Write your full handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m3\handoff.md` and send a message when complete.

## 2026-09-18T08:25:02Z
You are Worker M3 for Milestone 3 (R4 & R5: Attendance Rules & Direct Camera Integration).
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md and c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m3\DISPATCH.md before starting work.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task:
1. Admin Attendance Settings in src/components/AdminConfigView.tsx:
   - Jam Pulang Hari Jumat configuration (jam_pulang_jumat).
   - Interactive teacher selection interface for 'Pengecualian Kehadiran Guru (Hanya wajib hadir saat hari mengajar)' vs default 'Wajib hadir setiap hari kerja'.
2. Attendance Workflow calculation in src/lib/workflow.ts (getGuruDailyState):
   - Check teacher exemption: exempt teachers have isAlpa: false and bebasAlpa: true on non-teaching days. Default teachers require daily presence (isAlpa: true if missing).
3. Friday checkout rule in src/components/GuruPresensi.tsx:
   - Use jam_pulang_jumat on Fridays for checkout start time.
4. Direct Camera enforcement & removal of gallery file uploads:
   - src/components/GuruPresensi.tsx: require camera capture for Presensi Pulang.
   - src/components/GuruJurnal.tsx: remove `<input type="file">`, embed direct camera capture.
   - src/components/PiketView.tsx: remove `<input type="file">`, embed direct camera capture.
   - src/components/CameraSelfieCapture.tsx: remove all file inputs / gallery buttons, add front/back camera toggle (facingMode: 'user' | 'environment'), mirror only on front camera.
   - src/lib/watermarkCanvas.ts: pass mirror parameter so rear camera captures are not flipped.
5. Verify with `npx tsc --noEmit`.
6. Follow Git Workflow Rule: `git status`, `git add .`, `git commit -m "feat(attendance-camera): add friday checkout, teacher attendance exceptions, and direct live camera enforcement"`, `git push origin main`.
7. Write handoff report to c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m3\handoff.md and notify with send_message.

## 2026-09-18T08:41:13Z
**Context**: Milestone 3 (R4 & R5: Attendance Rules & Direct Camera Integration)
**Content**: Heartbeat status check. Please provide a brief update on your implementation progress across AdminConfigView.tsx, workflow.ts, GuruPresensi.tsx, CameraSelfieCapture.tsx, and direct camera inputs.
**Action**: Reply with current status.


