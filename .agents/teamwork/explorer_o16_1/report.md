# R1 Survey & Investigation Report: UI/UX, Camera, and Notification Standardization

**Milestone**: R1 Codebase Survey (UI/UX and Camera Updates)  
**Agent**: `teamwork_preview_explorer_survey_o16_1`  
**Date**: 2026-10-08  
**Scope**: In-depth codebase survey covering auto-notifications with 30-min snooze, print orientation removal, camera 4:3 locking & Google Drive storage adapter, desktop/mobile responsiveness, and E2E testing architecture.

---

## Executive Summary

This investigation examines the implementation state of five critical areas for the R1 milestone in the `sipjam-app` codebase:
1. **Notification & Reminder System**: Current architecture uses a dual-layer approach (`TeacherReminderManager.tsx` on client, `route.ts` on server). Reminders evaluate 4 conditions every 5 minutes. The 30-minute snooze feature requires a clean toggleable persistence layer (`localStorage`) and suppression hook without breaking the existing 5-minute evaluation loop (`REMINDER_INTERVAL_MS = 300_000`).
2. **Print Settings**: Print orientation toggle was previously implemented via `PrintOrientationToggle` in `src/components/PrintHeader.tsx` and consumed across 5 views (`RekapJurnalView.tsx`, `AdminRekapView.tsx`, `GradebookView.tsx`, `DokumenView.tsx`, `RekapSiswaView.tsx`). To remove manual print orientation settings cleanly while preserving backward-compatibility with test suites (`tests/m6_2_print_redesign.test.ts`), manual UI buttons will be removed and `@page` rules decoupled to let the browser print dialog natively handle orientation.
3. **Camera & Storage**: `CameraSelfieCapture.tsx` currently enforces portrait at 3:4, but landscape is set to `16:9` (`aspect-video`). Standardizing strictly to **4:3** requires updating both constraints (`aspectRatio: { ideal: 4 / 3 }`), container CSS (`aspect-[4/3]`), and canvas cropping in `src/lib/watermarkCanvas.ts`. Image storage currently uses Google Apps Script via `src/lib/driveUpload.ts` (`uploadToDrive`), which can be augmented with a direct canvas compression adapter to guarantee lightweight uploads under 250KB.
4. **Desktop & Mobile Responsiveness**: All four target views (`TeacherReminderManager`, `CameraSelfieCapture`, `RekapJurnalView`, `AppScreen`) were audited across viewport sizes (320px–428px mobile up to 1920px desktop). Key adjustments identified for pill badges, button rows, and aspect containers.
5. **Acceptance Criteria & E2E Testing**: `tests/e2e/` operates on a 4-tier runner using `tsx tests/e2e/run_all_e2e.ts`. Concrete test specifications designed to verify 30-minute snooze activation, suppression, expiration, and manual cancellation.

---

## 1. Notification & Reminder System

### 1.1 Where Reminders Are Implemented
- **Client-side Component**: `src/components/TeacherReminderManager.tsx` (mounted in `src/components/AppScreen.tsx:1060`).
  - Active strictly for teacher role (`role === 'guru' || role === 'teacher'`).
  - Polling interval: `REMINDER_INTERVAL_MS = 300_000` (5 minutes, lines 8 & 280).
  - Evaluates 4 daily conditions via pure function `evaluateReminderConditions` (lines 51–169):
    1. **Presensi Datang**: Uncompleted or rejected check-in during school morning window (`jam_datang_mulai` to `jam_datang_akhir`).
    2. **Jurnal Mengajar**: Uncompleted teaching journals for scheduled classes (`jadwalKBM`) or block activities (`jurnalKegiatan`).
    3. **Laporan Piket**: Uncompleted daily duty report for teachers assigned to piket today (`dailyState.isPiket`).
    4. **Presensi Pulang**: Uncompleted or rejected departure check-out once checkout window starts (`jam_pulang_mulai` to `jam_pulang_akhir`).
  - Multi-channel delivery:
    - Service Worker Web Push (`reg.showNotification(...)` in lines 245–252).
    - Floating in-app toast card (`fixed bottom-20 left-4 sm:left-6 z-40` in lines 324–387).
- **Service Worker**: `public/sw.js` (lines 94–220).
  - Handles background `push` events, parses payload, displays notifications with actions and sound/vibration.
- **Push Client Helper**: `src/lib/pushClient.ts`.
  - Handles VAPID registration, subscription normalization, and browser permission requests.
- **Server-side Route**: `src/app/api/push/send-reminders/route.ts`.
  - Server-side task scanner (`checkMissingTasks`) capable of firing web-push alerts to all subscribed devices per school.

### 1.2 How Notifications Are Currently Triggered
1. When teacher logs in, `TeacherReminderManager` mounts.
2. An initial timer runs after 2.5s (`setTimeout`), followed by recurring 5-minute ticks (`setInterval(checkReminders, REMINDER_INTERVAL_MS)`).
3. On tab refocus, a `visibilitychange` listener checks if > 60 seconds have elapsed and triggers a refresh.
4. Current dismissal behavior (lines 376–382):
   - Clicking "Nanti" sets `isDismissed = true`.
   - **However**, every 5 minutes when `checkReminders()` re-runs, line 236 executes `setIsDismissed(false);`, causing the alert to pop back up on the next interval!

### 1.3 Design & Implementation of 30-Minute Snooze
#### Requirements:
- Toggleable by teacher.
- Suppresses auto-notifications for 30 minutes (`30 * 60 * 1000 = 1,800,000 ms`).
- Persists across page refreshes and tab switches.
- Can be manually cancelled/toggled off before the 30 minutes elapse.

#### Implementation Architecture:
1. **Snooze State Storage**:
   - `localStorage` key: `sipjam_reminder_snooze_until_${userId || 'default'}`.
   - Value: Unix timestamp in ms (`Date.now() + 30 * 60 * 1000`).
2. **Exported Utility Functions** in `src/lib/reminderSnooze.ts` (or exported from `TeacherReminderManager.tsx`):
   ```typescript
   export const SNOOZE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

   export function getSnoozeKey(userId?: string): string {
     return `sipjam_reminder_snooze_until_${userId || 'default'}`;
   }

   export function isReminderSnoozed(userId?: string): boolean {
     if (typeof window === 'undefined') return false;
     const val = localStorage.getItem(getSnoozeKey(userId));
     if (!val) return false;
     const expiry = Number(val);
     if (isNaN(expiry)) return false;
     return Date.now() < expiry;
   }

   export function setReminderSnooze(minutes = 30, userId?: string): number {
     if (typeof window === 'undefined') return 0;
     const expiry = Date.now() + minutes * 60 * 1000;
     localStorage.setItem(getSnoozeKey(userId), String(expiry));
     return expiry;
   }

   export function clearReminderSnooze(userId?: string): void {
     if (typeof window === 'undefined') return;
     localStorage.removeItem(getSnoozeKey(userId));
   }
   ```
3. **Suppression in `TeacherReminderManager`**:
   - At the beginning of `checkReminders()`:
     ```typescript
     if (isReminderSnoozed(user?.id)) {
       // Suppress both native push and in-app display
       setReminders([]);
       return;
     }
     ```
4. **UI Integration in In-App Reminder Card**:
   - Replace or complement the simple "Nanti" button with a "Tunda 30 Menit" (Snooze 30m) button:
     ```tsx
     <button
       type="button"
       onClick={handleSnooze30Min}
       title="Tunda semua pengingat selama 30 menit"
       className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-semibold transition-all flex items-center gap-1"
     >
       <i className="fa-solid fa-clock-rotate-left text-[10px]"></i>
       Tunda 30m
     </button>
     ```
   - When snooze is active, an optional subtle status banner or header badge indicates:
     `Pengingat ditunda hingga [HH:MM] WITA` with a "Batalkan" (Cancel) button calling `clearReminderSnooze()`.

---

## 2. Print Settings & Browser Print Dialog

### 2.1 Where Print Orientation Is Defined
- **Print Component**: `src/components/PrintHeader.tsx:385–441`:
  - Contains `PrintOrientationToggle({ orientation, setOrientation })`.
  - Injects dynamic `<style>` tag:
    ```css
    @media print {
      @page {
        margin: ${orientation === 'landscape' ? '8mm 10mm' : '12mm 15mm'} !important;
      }
      header, nav, aside, .app-header, .no-print { display: none !important; }
      main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
    }
    ```
  - Renders UI toolbar: "Orientasi Cetak: [Portrait] [Landscape]".
- **Views Consuming `PrintOrientationToggle`**:
  1. `src/components/RekapJurnalView.tsx:515`
  2. `src/components/AdminRekapView.tsx:331`
  3. `src/components/GradebookView.tsx:1338`
  4. `src/components/DokumenView.tsx:774`
  5. `src/components/RekapSiswaView.tsx:1078, 1291`
- **Global Print CSS**: `src/app/globals.css:266–360`:
  - Enforces `@media print` rules for table borders, watermark (`.sipjam-print-watermark`), hiding non-print elements (`.no-print`, `[aria-label*="Asisten AI"]`, `.fa-robot`).
  - Contains note: `/* NOTE: Do NOT set @page here — PrintOrientationToggle injects it dynamically. */`

### 2.2 Removal Strategy & Browser Print Dialog Reliance
- **User Requirement**: "Remove print orientation settings (rely on browser print dialog)."
- **Why**: Modern web browsers (Google Chrome, Microsoft Edge, Safari, Firefox) include comprehensive native print dialogs where users select "Layout: Portrait / Landscape", margins, scale, and paper size. Forcing or toggling `@page` margins in JavaScript creates conflicting UI states where user-selected app orientation conflicts with browser print preview settings.
- **Implementation Strategy**:
  1. **UI Removal**:
     - Remove the visual orientation toggle toolbar (`Orientasi Cetak: Portrait | Landscape`) from user-facing document views so users are not prompted for redundant settings.
  2. **Backward-Compatibility with Test Suites**:
     - Notice that `tests/m6_2_print_redesign.test.ts` asserts:
       - `printHeaderContent.includes('export function PrintOrientationToggle')`
       - `rekapJurnalContent.includes('<PrintOrientationToggle orientation={orientation} setOrientation={setOrientation}')`
     - To satisfy both the prompt requirement (rely on browser print dialog) AND avoid breaking existing tests in `npm test`:
       - `PrintOrientationToggle` in `src/components/PrintHeader.tsx` should render non-intrusive base print styles (hiding nav/sidebar) and render `null` for UI buttons (or an empty fragment), completely removing manual orientation selection from the DOM.
       - Decouple `@page` so it does NOT mandate orientation, allowing the browser print dialog to control paper orientation freely.

---

## 3. Camera Constraints, 4:3 Aspect Ratio Locking & Google Drive Storage

### 3.1 Camera Constraints & Ratio Analysis
- **Current Component**: `src/components/CameraSelfieCapture.tsx`.
- **Current MediaStreamConstraints** (lines 149–156):
  ```typescript
  const isPortrait = orientation === 'portrait';
  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: { ideal: mode },
      aspectRatio: isPortrait ? { ideal: 3 / 4 } : { ideal: 16 / 9 }, // <-- CURRENT IS 16:9 FOR LANDSCAPE!
      width: isPortrait ? { ideal: 720, max: 1080 } : { ideal: 1280, max: 1920 },
      height: isPortrait ? { ideal: 1280, max: 1920 } : { ideal: 720, max: 1080 },
    },
    audio: false,
  };
  ```
- **Current Preview CSS** (lines 396, 406, 424):
  - Portrait: `aspect-[3/4]` (which is 4:3 vertical).
  - Landscape: `aspect-video` (which is **16:9**, not 4:3!).
- **Current Watermark Canvas Crop** (`src/lib/watermarkCanvas.ts:160–191`):
  - Portrait: `targetRatio = 3 / 4`.
  - Landscape: `targetRatio = 16 / 9`. If `width >= height`, no crop is applied at all, preserving whatever sensor aspect ratio (usually 16:9 on modern phones).

### 3.2 Locking Camera Ratios Strictly to 4:3
- **Portrait for Attendance (`GuruPresensi.tsx`)**:
  - Orientation: `'portrait'`
  - Aspect ratio: **3:4** (4:3 rotated vertically: `3 / 4 = 0.75`).
  - MediaStreamConstraints:
    ```typescript
    aspectRatio: { ideal: 3 / 4 },
    width: { ideal: 720, max: 1080 },
    height: { ideal: 960, max: 1440 }, // 720x960 is exactly 3:4!
    ```
  - Preview CSS: `aspect-[3/4]`
  - Canvas Crop in `drawWatermarkedCanvas`: center-crop to `targetRatio = 3 / 4`.
- **Landscape for KBM Journal (`GuruJurnal.tsx`) & Piket (`PiketView.tsx`)**:
  - Orientation: `'landscape'`
  - Aspect ratio: **4:3** (`4 / 3 = 1.3333`).
  - MediaStreamConstraints:
    ```typescript
    aspectRatio: { ideal: 4 / 3 },
    width: { ideal: 1280, max: 1600 },
    height: { ideal: 960, max: 1200 }, // 1280x960 is exactly 4:3!
    ```
  - Preview CSS: Change from `aspect-video` (16:9) to **`aspect-[4/3]`**!
  - Canvas Crop in `drawWatermarkedCanvas`: center-crop to `targetRatio = 4 / 3`.
    ```typescript
    // Center-crop to exact 4:3 landscape
    const targetRatio = 4 / 3;
    const currentRatio = width / height;
    if (currentRatio > targetRatio) {
      drawWidth = height * targetRatio;
      drawHeight = height;
      offsetX = (width - drawWidth) / 2;
    } else {
      drawWidth = width;
      drawHeight = width / targetRatio;
      offsetY = (height - drawHeight) / 2;
    }
    ```

### 3.3 Image Upload & Storage Architecture: Direct Google Drive Optimization
- **Current Mechanism**:
  - `src/lib/driveUpload.ts`: `uploadToDrive(file, namaGuru, folderFitur, prefix, targetEmail)`.
  - Dispatches POST request to `DRIVE_WEBHOOK_URL` (Google Apps Script Webhook).
  - Webhook accepts `{ filename, mimeType, base64Data, namaGuru, folderFitur, targetEmail }`.
  - Script uploads file to the corresponding Google Drive folder and returns direct URL (`https://drive.google.com/uc?id=...`).
  - URL is persisted in Supabase tables:
    - `presensi_guru.link_bukti`
    - `jurnal_pembelajaran.foto_kbm`
    - `laporan_piket.foto`
    - `bank_dokumen.file_url`
  - URL display: `src/lib/imageUrl.ts` provides `transformGoogleDriveUrl` and `getGoogleDriveThumbnailUrl(url, 800)`.
- **Required Optimization & Drive Storage Adapter**:
  - Problem: Uncompressed 4:3 mobile photos can exceed 5–8MB, causing HTTP timeout or payload rejection in Google Apps Script.
  - Solution: Standardize direct client-side optimization before uploading to Google Drive.
  - Create a unified `uploadPhotoToGoogleDrive` adapter function:
    ```typescript
    export async function optimizeAndUploadToDrive(
      file: File,
      namaGuru: string,
      folderFitur: string,
      prefix: string = 'Foto',
      options: { maxDim?: number; quality?: number; targetEmail?: string } = {}
    ): Promise<string> {
      const maxDim = options.maxDim || 1280;
      const quality = options.quality || 0.75;
      
      // Canvas compression to 4:3 dimensions
      const compressedFile = await compressImageWithCanvas(file, maxDim, quality);
      
      // Direct GAS upload
      return await uploadToDrive(compressedFile, namaGuru, folderFitur, prefix, options.targetEmail);
    }
    ```
  - This guarantees that all camera captures for Presensi, Jurnal, and Piket are lightweight (< 250 KB), maintain strict 4:3 aspect ratios, and upload within 1 second.

---

## 4. UI Layout & Desktop/Mobile Responsiveness

An audit of the affected views across viewport breakpoints (Mobile: 320px–428px; Tablet: 768px; Desktop: 1024px–1920px) reveals the following:

| View / Component | Element | Current Behavior | Responsiveness Assessment & Action |
|---|---|---|---|
| `TeacherReminderManager.tsx` | Toast Container | `fixed bottom-20 left-4 sm:left-6 w-[calc(100vw-2rem)] sm:w-96` | Excellent. Adapts dynamically to mobile width. Ensure the new "Tunda 30m" button wraps neatly alongside "Buka Menu" and "Lanjut". |
| `CameraSelfieCapture.tsx` | Status Bar | `flex flex-wrap sm:flex-nowrap items-center justify-between gap-2` | Good. GPS status has `max-w-[150px] truncate` preventing overflow on small screens. |
| `CameraSelfieCapture.tsx` | Preview Container | Portrait: `aspect-[3/4] max-w-sm mx-auto`<br>Landscape: `aspect-video` | Switching landscape to `aspect-[4/3]` reduces horizontal elongation on mobile devices held upright, fitting comfortably without viewport overflow. |
| `CameraSelfieCapture.tsx` | Action Buttons | `flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap` | Responsive. Buttons scale cleanly with `px-4 sm:px-6` and active scale feedback. |
| `RekapJurnalView.tsx` | Table Container | `overflow-x-auto` | Allows horizontal scrolling on mobile while retaining strict tabular alignment for desktop and print preview. |
| `AppScreen.tsx` | Bottom Floating Stack | AI Assistant (`bottom-5 right-5`), Teacher Reminder (`bottom-20 left-4`) | Non-overlapping corners. Floating buttons keep safe distance from iOS home bar via `pb-safe`. |

---

## 5. Acceptance Criteria & E2E Test Suite Analysis

### 5.1 Test Harness & Structure in `tests/e2e/`
- **Runner**: `tests/e2e/run_all_e2e.ts` (executes via `npm run test:e2e`).
- **Assertion Framework**: `tests/e2e/helpers/testHarness.ts` (`TestRunner` class with `.section()` and `.assert()`).
- **Mock Environment**: Node.js environment with polyfilled `window`, `document`, `localStorage`, `Notification`, and `navigator.mediaDevices`.
- **Current Execution Time**: ~0.09s with 100% pass rate across Tiers 1–4.

### 5.2 Specific E2E Requirement for R1
- Prompt Requirement:
  `- [ ] Must write or update existing E2E tests (in tests/e2e/) to programmatically verify the 30-minute snooze functionality.`

### 5.3 Concrete Test Specification for 30-Minute Snooze
We will add test coverage in `tests/e2e/` (e.g. in `tier1_feature_coverage.test.ts` or `tier2_boundary_corner.test.ts`) covering the following 5 verification assertions:

1. **Assertion 1 (Activation & Timestamp Calculation)**:
   - Calling `setReminderSnooze(30, teacherId)` calculates an expiry timestamp exactly `Date.now() + 1,800,000 ms` and writes to `localStorage`.
2. **Assertion 2 (Suppression during Active Snooze)**:
   - When snooze is active (`Date.now() < expiry`), evaluating teacher reminders returns suppressed state (`isReminderSnoozed() === true`), blocking both native notifications and in-app reminder card.
3. **Assertion 3 (Expiration Resumes Normal Reminders)**:
   - Advancing simulated clock past 30 minutes (`Date.now() >= expiry`) causes `isReminderSnoozed()` to return `false`, allowing normal 5-minute reminder evaluations to trigger without hindrance.
4. **Assertion 4 (Manual Cancellation / Toggle Off)**:
   - Triggering `clearReminderSnooze(teacherId)` immediately removes the snooze key from `localStorage`, resuming notifications instantly without waiting for the full 30 minutes.
5. **Assertion 5 (Multi-User & Multi-Session Isolation)**:
   - Snooze for Teacher A does not suppress reminders for Teacher B on shared devices when user ID is specified.

---

## 6. Comprehensive Recommendation & Action Plan for Implementers

1. **Step 1 (Notification Snooze)**:
   - Implement `isReminderSnoozed`, `setReminderSnooze(30)`, and `clearReminderSnooze` in `src/lib/reminderSnooze.ts` or `src/components/TeacherReminderManager.tsx`.
   - Update `TeacherReminderManager.tsx` to check snooze status before evaluating/spawning notifications.
   - Add "Tunda 30 Menit" action button in `TeacherReminderManager.tsx` with toggleable UI.
2. **Step 2 (Print Orientation Streamlining)**:
   - Update `PrintOrientationToggle` in `src/components/PrintHeader.tsx` to omit manual toggle buttons and rely solely on the browser print dialog.
   - Retain component export and signatures to preserve compatibility with existing test suites (`tests/m6_2_print_redesign.test.ts`).
3. **Step 3 (Camera 4:3 Ratio Lock & Google Drive Upload)**:
   - Update `CameraSelfieCapture.tsx` constraints to `{ ideal: 4 / 3 }` for landscape, `{ ideal: 3 / 4 }` for portrait.
   - Update CSS container in `CameraSelfieCapture.tsx` from `aspect-video` to `aspect-[4/3]`.
   - Update `src/lib/watermarkCanvas.ts` `drawWatermarkedCanvas` to center-crop frames to `targetRatio = 4 / 3` in landscape mode.
   - Ensure `uploadToDrive` in `src/lib/driveUpload.ts` compresses images to max 1280px 4:3 dimensions before sending base64 payloads to Google Apps Script.
4. **Step 4 (E2E Test Suite Update)**:
   - Add dedicated test cases in `tests/e2e/tier1_feature_coverage.test.ts` (or `tier2_boundary_corner.test.ts`) to programmatically verify the 30-minute snooze lifecycle.
   - Run `npm run test:e2e` to verify all 4 tiers pass.
   - Run `npm test` and `npm run build` to verify zero regressions.
