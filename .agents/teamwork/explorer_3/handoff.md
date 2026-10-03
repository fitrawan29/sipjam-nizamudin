# Handoff Report: R3 5-Minute Automated Reminder System

**Agent:** Explorer 3 (`teamwork_preview_explorer`)  
**Working Directory:** `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_3`  
**Handoff Type:** Hard (Investigation Complete)  

---

## 1. Observation

1. **Service Worker & Push Infrastructure:**
   - File `public/sw.js` (lines 94–220, 222–255): Contains complete VAPID Web Push handler and `notificationclick` handler that focuses matching client windows and navigates to target URLs.
   - File `src/lib/pushClient.ts` (lines 30–73, 130–248): Exports `isPushNotificationSupported()`, `registerServiceWorker()`, `subscribeToPushNotifications()`.
   - File `src/components/PushNotificationPrompt.tsx` (lines 22–37, 54–74): Manages permission states (`'granted'`, `'denied'`, `'default'`).
2. **Teacher Daily Workflow Engine:**
   - File `src/lib/workflow.ts` (lines 174–566): Function `getGuruDailyState(namaGuru, username, userId, sekolahId)` evaluates daily attendance (`presensiDatang`, `presensiPulang`), holidays (`isLibur`), leave (`isIzinSakit`), piket assignment & report (`isPiket`, `laporanPiket`), teaching schedule vs submitted journals (`jadwalKBM`, `jurnalKBM`, `jurnalKegiatan`), active block system (`isBlok`), exemption for non-teaching days (`isNonTeachingDay`, `bebasAlpa`), and checkout eligibility (`canPresensiPulang`).
3. **School Hours Configuration:**
   - Table `pengaturan` stores keys: `jam_datang_mulai`, `jam_datang_batas`, `jam_datang_akhir`, `jam_pulang_mulai`, `jam_pulang_jumat`, `jam_pulang_akhir`, `hari_sekolah`, `aturan_kehadiran_guru`.
   - File `src/components/GuruPresensi.tsx` (lines 85–102, 286–315): Loads these keys and enforces attendance windows and late calculation (`keterlambatanDetik`).
   - File `src/components/AdminConfigView.tsx` (lines 436–457): Displays inputs for all arrival and departure hours.
4. **App Integration & Role Identification:**
   - File `src/components/AppScreen.tsx` (lines 58–60, 393–461): Determines user roles via `isSuperadmin`, `isAdmin`, with teachers identified when `!isAdmin && !isSuperadmin`. Handles navigation via `handleNavigation(targetId)`.
5. **Backend Reminders Discrepancy:**
   - File `src/app/api/push/send-reminders/route.ts` (lines 140–294): Implements missing task checks for `presensi` (Datang only), `jurnal`, and `piket`. Noticeably absent is a check for `presensi` (Pulang).
6. **No Existing Recurring Timers:**
   - Search across `src/` for `setInterval` yielded 0 occurrences. Currently, the application has no periodic background evaluation running on the client.

---

## 2. Logic Chain

1. **Premise:** The user requested an automated reminder system repeating every 5 minutes when the app is open (foreground or background) for teachers who have not completed: (1) Presensi Datang, (2) Jurnal Mengajar, (3) Laporan Piket, (4) Presensi Pulang.
2. **From Observation 2 & 3:** `getGuruDailyState()` and the `pengaturan` table provide all the business logic, status fields, and time constraints needed to determine whether any of the 4 conditions are currently violated for the active teacher.
3. **From Observation 1:** When `Notification.permission === 'granted'`, Web Notifications can be spawned directly using `(await navigator.serviceWorker.ready).showNotification(title, options)`. Because `public/sw.js` already has an active `notificationclick` listener, clicking the notification will bring the tab into focus and navigate to the view URL.
4. **From Observation 1 & 4:** In browsers where notifications are denied or blocked, an in-app floating banner / alert rendered inside `AppScreen.tsx` provides an immediate visual fallback with direct action buttons (`handleNavigation`).
5. **From Observation 6:** Because there are no existing recurring timers, a dedicated React component or hook (`TeacherReminderManager`) with a 5-minute interval (`300,000 ms`) mounted inside `AppScreen.tsx` for teacher sessions will fulfill the requirement without interfering with existing page behavior.
6. **From Observation 5:** Adding the missing Presensi Pulang check to `src/app/api/push/send-reminders/route.ts` ensures parity between the client-side reminder loop and the server-side cron push notification system.

---

## 3. Caveats

- **Browser Tab Throttle:** When a browser tab is in the background, modern browsers throttle JavaScript `setInterval` timers. However, timers throttled to once per minute will still comfortably trigger every 5 minutes (`300,000 ms`).
- **Complete Tab Closure:** A client-side timer only executes while at least one SIPJAM tab is open. If all browser tabs are closed, reminders must be triggered via the server-side endpoint `/api/push/send-reminders` (which is already set up for external cron jobs).
- **Audio Permission:** Playing audio chimes on reminder triggers may be muted by browser autoplay policies unless the user has previously interacted with the document during that session.

---

## 4. Conclusion

Task R3 is fully investigable, feasible, and follows the *Ponytail* principle. The system should be implemented as a clean component (`TeacherReminderManager.tsx`) mounted in `AppScreen.tsx` for teachers (`role === 'guru'`). It evaluates `getGuruDailyState` and school hours every 5 minutes, triggers `showNotification` when permitted, and renders a floating banner fallback with call-to-action buttons when blocked.

---

## 5. Verification Method

1. **Codebase Inspection:**
   - Check `src/components/TeacherReminderManager.tsx` exists and implements 300,000 ms interval.
   - Check `AppScreen.tsx` mounts `<TeacherReminderManager user={user} onNavigate={handleNavigation} />` for teachers.
   - Check `src/app/api/push/send-reminders/route.ts` includes Task 4 (Presensi Pulang).
2. **Automated Unit & Static Test:**
   - Execute `npx tsx tests/reminder_system_r3.test.ts` (to be created by implementer) verifying:
     - 4 condition evaluations under simulated time windows.
     - Role restriction (active only for guru, inactive for admin).
     - Anti-spam throttle logic.
3. **Build & Type Check:**
   - Run `npm run build` and `npx tsc --noEmit` to confirm zero TypeScript errors.
