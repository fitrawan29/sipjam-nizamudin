# Worker 1 Dispatch: Implementation of R1, R2, R3

## Context & Role
You are Worker 1 (`teamwork_preview_worker`).
Working directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_1`
Original request path: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (read this first!).

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks & Detailed Requirements

### Task 1 (R1): Kamera Anti-Zoom dan Orientasi Akurat
- **Files**: `src/lib/watermarkCanvas.ts`, `src/components/CameraSelfieCapture.tsx`, `tests/camera_orientation.test.ts`.
- **Root Cause & Solution**:
  1. In `src/lib/watermarkCanvas.ts` (lines 144–164), `drawWatermarkedCanvas` previously forced `targetRatio = 3/4` for portrait and `16/9` for landscape, slicing 25% of sensor pixels on mobile portrait 9:16 streams (720x1280) and causing an artificial 1.33x digital zoom.
  2. Refactor the aspect ratio logic:
     - If requested orientation is `portrait` (or default when height > width):
       * If incoming stream is already vertical/portrait (`width < height`): do NOT crop (`drawWidth = width`, `drawHeight = height`, `offsetX = 0`, `offsetY = 0`), preserving full 1x scale without artificial zoom or pixel cropping.
       * If incoming stream is horizontal/landscape (`width >= height`, e.g. desktop webcam): center-crop width to fit target vertical ratio (e.g. 3/4 or 9/16) so resulting image is vertical (`height > width`).
     - If requested orientation is `landscape`:
       * If incoming stream is already horizontal/landscape (`width >= height`): do NOT crop (`drawWidth = width`, `drawHeight = height`, `offsetX = 0`, `offsetY = 0`), preserving full 1x scale.
       * If incoming stream is vertical/portrait (`width < height`): center-crop height to fit target horizontal ratio (e.g. 16/9 or 4/3).
  3. In `src/components/CameraSelfieCapture.tsx`: Ensure video preview (`<video>`) retains `object-contain`, no zoom transforms, and output preview matches the captured canvas.
  4. In `tests/camera_orientation.test.ts`: Update tests to assert 1x uncropped scale on matching orientation streams while ensuring portrait output is vertical (`height > width`) and landscape is horizontal (`width >= height`).

### Task 2 (R2): Penghapusan Indikator Oranye pada AI Assistant
- **File**: `src/components/AIAssistant/AIAssistant.tsx`.
- **Action**:
  Lines 180–184 contain the unconditional pulsing badge:
  ```tsx
          {/* Pulsing notification badge */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white dark:border-gray-900"></span>
          </span>
  ```
  Remove these lines so the robot AI icon (`fa-robot`) displays cleanly without any orange badge or dot in the corner. Keep `fa-robot`, `data-tour="ai-assistant-btn"`, tooltip, and chat modal completely intact.

### Task 3 (R3): Sistem Notifikasi Pengingat (Reminder) Otomatis
- **Requirement**: Automated reminder every 5 minutes (300,000 ms) for teachers for:
  1. Belum presensi datang (considering school check-in / late hours).
  2. Belum mengisi jurnal mengajar.
  3. Belum mengisi laporan piket (specifically for teachers assigned piket duty today).
  4. Belum presensi pulang (considering check-out hours).
- **Frontend Component**:
  Create `src/components/TeacherReminderManager.tsx`:
  - Active only for teachers (`!isAdmin && !isSuperadmin` or `user.role === 'guru'`).
  - Sets up a 5-minute recurring evaluation interval (`300,000 ms`).
  - Evaluates daily status using `getGuruDailyState(namaGuru, username, userId, sekolahId)` from `src/lib/workflow.ts` and schedule/hours (`pengaturan`).
  - Evaluates the 4 conditions:
    * Presensi Datang: If in arrival window (`jam_datang_mulai` to `jam_datang_akhir`) and not yet checked in (`!dailyState.presensiDatang`). Warn if approaching or past `jam_datang_batas`.
    * Jurnal Mengajar: If today is a teaching day (not holiday/leave) and classes are missing journals (`jadwalKBM` vs `jurnalKBM` or `jurnalKegiatan`).
    * Laporan Piket: If assigned piket duty today (`dailyState.isPiket`) and hasn't submitted piket report (`!dailyState.laporanPiket`).
    * Presensi Pulang: If in departure window (`jam_pulang_mulai` / `jam_pulang_jumat` to `jam_pulang_akhir`) and not yet checked out (`!dailyState.presensiPulang`).
  - Multi-channel notification:
    * Service Worker Web Notification API: use `(await navigator.serviceWorker.ready).showNotification(...)` (or `new Notification(...)`) when permission is granted.
    * In-app fallback: If Web Notification is not granted or blocked, render a floating, non-intrusive banner/toast with action button to navigate (`onNavigate`) directly to the relevant view.
  - Mount `<TeacherReminderManager>` in `src/components/AppScreen.tsx`.
- **Backend Parity**:
  Update `src/app/api/push/send-reminders/route.ts` to also include the 4th task (`presensiPulang`) check so backend cron has complete parity with frontend reminder checks.

### Testing & Verification
1. Run TypeScript type checks: `npx tsc --noEmit`.
2. Run existing tests: `npm test` and `npx tsx tests/camera_orientation.test.ts`, `npx tsx tests/adversarial_r1_r2_reviewer.test.ts`.
3. Create automated unit test for R3 reminder evaluation: `tests/teacher_reminder_r3.test.ts` verifying all 4 condition evaluations, role restriction, interval logic, and fallback delivery.
4. Run production build: `npm run build`.

### Git Workflow (MANDATORY per GEMINI.md)
When all modifications and tests are verified and passing:
1. `git status`
2. `git add .`
3. `git commit -m "fix: camera anti-zoom portrait/landscape, remove ai orange badge, add 5-min teacher reminder system"`
4. `git push origin main`

## Output Requirements
Write a complete handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_1\handoff.md` with:
- Files modified/added
- Build and test commands executed and outputs
- Git status, commit, and push outputs
- Send completion message to parent orchestrator.

## 2026-10-03T05:38:38Z
You are Worker 1 (teamwork_preview_worker).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_1
First, read your task instructions in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_1\DISPATCH.md and the original user request in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md.

Read the explorer handoffs and reports:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_1\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_2\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_3\handoff.md

Implement R1 (camera anti-zoom 1x scale without artificial crop in watermarkCanvas.ts and CameraSelfieCapture.tsx), R2 (remove orange badge in AIAssistant.tsx), and R3 (5-minute automated reminder system in TeacherReminderManager.tsx, AppScreen.tsx, and /api/push/send-reminders/route.ts).
Create tests in tests/teacher_reminder_r3.test.ts.
Run all tests and build (npm test, npx tsc --noEmit, npm run build).
Perform the mandatory Git Workflow from GEMINI.md: git status, git add ., git commit -m "...", git push origin main.
Write your handoff report to c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_1\handoff.md and notify your caller (orchestrator_7).

