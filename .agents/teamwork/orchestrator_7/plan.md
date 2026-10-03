# Implementation & Verification Plan — orchestrator_7

## Task Requirements
1. **R1: Kamera Anti-Zoom dan Orientasi Akurat**
   - File: `CameraSelfieCapture.tsx` (and related camera usages).
   - Scale 1x, no digital zoom/artificial cropping.
   - Respect orientation: portrait mode -> vertical/portrait canvas & output (height > width); landscape mode -> landscape canvas & output (width > height).
2. **R2: Penghapusan Indikator Oranye pada AI**
   - File: `AIAssistant.tsx`.
   - Remove the orange badge/dot visual element attached to the robot icon.
3. **R3: Sistem Notifikasi Pengingat (Reminder) Otomatis**
   - Interval: Every 5 minutes.
   - Target checks:
     * Belum presensi datang (considering check-in/late hours).
     * Belum mengisi jurnal mengajar.
     * Belum mengisi laporan piket (specifically for teachers on duty that day).
     * Belum presensi pulang (considering check-out hours).
   - Mechanism: Frontend / Service Worker based (runs when app is open foreground or background). Push notification / in-app fallback.

## Phases
- **Phase 1: Exploration**
  - Dispatch 3 Explorers to investigate:
    * Explorer 1: `CameraSelfieCapture.tsx` implementation, stream constraints, canvas rendering, CSS cropping, orientation handling.
    * Explorer 2: `AIAssistant.tsx` structure, robot icon styling, orange badge/dot logic.
    * Explorer 3: Existing notification system, service worker / push notifications, attendance/journal/piket status detection and schedule timings.
- **Phase 2: Architecture & Synthesis**
  - Consolidate exact file paths, interfaces, and logic changes.
- **Phase 3: Worker Implementation**
  - Dispatch Worker to apply changes cleanly and execute build/tests.
  - Enforce git workflow rule: git status, git add ., git commit -m "...", git push origin main.
- **Phase 4: Review, Adversarial Testing & Forensic Audit**
  - Dispatch Reviewers (2), Challengers (2), and Forensic Auditor (1).
- **Phase 5: Gate & Final Report**
  - Verify all gates pass, verify git push to origin main, and report to parent.
