## 2026-10-03T20:57:14Z
You are Worker 3 (worker_o10_m3) for sipjam-app.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o10_m3
Dispatch file: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o10_m3\DISPATCH.md
ORIGINAL_REQUEST.md path: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
PROJECT.md path: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md

Scope: Milestone 3 (M3) — PiketView Scanner UI & Laporan Piket
1. In `src/components/PiketView.tsx`:
   - Add new tab `'scan'` with label "Scan QR Siswa" and icon `fa-qrcode` in tab bar alongside existing tabs.
   - Implement Mode Toggle: "Datang" vs "Pulang" with prominent visual switch/buttons.
   - Implement Dual Input Modes:
     a. Hardware USB HID Scanner:
        - Auto-focused input field (with auto re-focus mechanism).
        - On Enter keydown, reads scanned string, resolves student using `resolveStudentByCode(supabase, code, user.sekolah_id)` from `@/lib/qrSiswa`.
        - Calls `recordPresensiSiswa(supabase, { ... })` from `@/lib/qrSiswa`.
        - Audio feedback via Web Audio API (success chime, duplicate warning, error tone).
        - Visual feedback showing student card (name, class, photo/avatar, timestamp, status).
     b. Browser Camera Scanner:
        - Toggleable camera scanner using HTML5 video stream and native `BarcodeDetector` Web API (with canvas fallback if needed).
        - Scanned frames trigger the same resolution and attendance recording flow.
   - Implement 10-Unit Concurrency Support:
     - Multi-kiosk operation where up to 10 stations can open the scan page independently.
     - Live subscription to Supabase Realtime channel for `presensi_siswa` (or short polling) so all open windows update live stats and logs.
   - Implement Live Attendance Log & Summary for Piket:
     - Real-time stat cards: Total Hadir Datang, Total Pulang, Total Unik Siswa.
     - Filter by Class and search by Student Name.
     - Live table of today's scans with timestamps, student name, class, status badges, and device ID.
2. Verification:
   - Run `npx tsc --noEmit` (must pass with 0 errors).
   - Run `npm test` (all test suites must pass).
   - Run `npm run build` (Turbopack production build must pass).
3. Per GEMINI.md:
   a. git status
   b. git add .
   c. git commit -m "feat(piket): implement QR code scanner kiosk and daily attendance report"
   d. git push origin main
4. Write handoff report to:
   c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o10_m3\handoff.md
5. Use send_message to report completion back to parent.
