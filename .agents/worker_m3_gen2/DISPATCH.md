# Dispatch for Worker M3 Gen2 (R4 & R5: Attendance Rules & Direct Camera Integration)

## Identity
- Role: Worker (Replacement Gen 2)
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m3_gen2
- Parent: orchestrator_10

## Scope: Milestone 3 (R4 & R5) - Resume from Interruption Point
The previous worker completed:
1. `src/lib/watermarkCanvas.ts`: `mirror` parameter to avoid horizontally flipping rear camera photos.
2. `src/components/CameraSelfieCapture.tsx`: removed all file inputs / gallery buttons, added front/rear camera toggle with `facingMode: 'user' | 'environment'`, horizontal flip CSS applied strictly to front camera.
3. `src/components/GuruPresensi.tsx`: Friday checkout rule using `jam_pulang_jumat` and `getWitaDayName`, and enforced camera capture for all Pulang presensi.
4. `src/lib/workflow.ts`: updated `getGuruDailyState` to support teacher attendance exemptions (`guru_hanya_mengajar` and `data_guru.wajib_hadir_hanya_mengajar`), setting `isAlpa: false` and `bebasAlpa: true` on non-teaching days, and enforcing daily attendance for non-exempt teachers.

### Remaining Tasks for Worker M3 Gen2:
1. **Direct Camera in Jurnal Pembelajaran (`src/components/GuruJurnal.tsx`)**:
   - Completely eliminate `<input type="file">` (around line 635).
   - Embed `<CameraSelfieCapture>` live viewfinder directly in the form.
   - When photo is snapped and confirmed, convert dataUrl/blob to File for `uploadToDrive` and form submission.
2. **Direct Camera in Laporan Piket (`src/components/PiketView.tsx`)**:
   - Completely eliminate `<input type="file">` (around line 1139).
   - Embed `<CameraSelfieCapture>` live viewfinder directly in the form.
   - When photo is snapped and confirmed, convert dataUrl/blob to File for `uploadToDrive` and form submission.
3. **Admin Attendance Settings in `src/components/AdminConfigView.tsx`**:
   - Under "Pengaturan Jam Presensi", add input for **Jam Pulang Hari Jumat** (`jam_pulang_jumat`, default `'11:00'`). Save to `pengaturan`.
   - Under "Aturan Kehadiran Guru", add an interactive teacher selection interface for **Pengecualian Kehadiran Guru (Hanya wajib hadir saat hari mengajar)**.
     - Fetch active teachers from `data_guru`.
     - Allow Admin to search and toggle checkboxes for teachers who only need to be present on teaching days.
     - Save the selected teacher IDs/names into `pengaturan` (key: `guru_hanya_mengajar` as JSON string) and update `data_guru.wajib_hadir_hanya_mengajar = true/false`.
     - Teachers NOT in this exception list remain under the default rule: "Wajib hadir setiap hari kerja".
4. **Verification**:
   - Run `npx tsc --noEmit` and ensure 0 compilation errors.
5. **Git Workflow Rule**:
   - `git status`
   - `git add .`
   - `git commit -m "feat(attendance-camera): add friday checkout, teacher attendance exceptions, and direct live camera enforcement"`
   - `git push origin main`

## Output
Write your full handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m3_gen2\handoff.md` and send a message when complete.
