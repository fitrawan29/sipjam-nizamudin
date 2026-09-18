# Dispatch for Explorer 3 (Milestone 9 - Survey R4 & R5)

## Identity
- Role: Explorer
- Agent Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m9_3
- Parent: orchestrator_10

## Assigned Scope: R4 & R5
1. **R4: Pengaturan Kehadiran & Jadwal (Admin)**:
   - Investigate the Admin settings page/views (e.g. `AdminSettingsView.tsx` or similar).
   - Investigate database tables holding settings and guru attendance configurations.
   - Trace how teacher attendance exception ("Hanya wajib hadir saat hari mengajar") is defined, stored, and calculated. Check if an admin UI exists or needs to be built to select which teachers have this exception, and where default rule (wajib hadir setiap hari kerja) is enforced.
   - Investigate Friday return time ("Jam Pulang Hari Jumat"): check where attendance return time is configured/enforced, how to add a specific admin configuration for Friday checkout time, and how checkout validation logic utilizes it.
2. **R5: Integrasi & Aturan Kamera Langsung**:
   - Locate forms for:
     1. Presensi Pulang (checkout attendance)
     2. Jurnal Pembelajaran (teacher journal entry)
     3. Laporan Piket (picket report entry)
   - Inspect existing photo capture or upload logic:
     - Identify all `<input type="file">` elements and file upload options across these three forms.
     - Determine how to completely eliminate the file gallery upload option.
     - Determine how to enforce direct camera input via browser `navigator.mediaDevices.getUserMedia` with a live video viewfinder.
     - Determine how to support camera switching (front/back camera toggle: `facingMode: "user"` vs `facingMode: "environment"`).
   - Report exact files, lines of code, database tables/columns involved, and recommend implementation details.

## Required Output
Write your findings to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m9_3\handoff.md`.
Report back when finished.

## 2026-09-18T07:42:05Z
You are Explorer 3 for Milestone 9.
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md and c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m9_3\DISPATCH.md.
Your scope:
1. R4: Pengaturan Kehadiran & Jadwal (Admin):
   - Admin settings UI and database tables for attendance rules.
   - Investigate "Hanya wajib hadir saat hari mengajar" configuration per teacher vs default "wajib hadir setiap hari kerja", and its impact on attendance/alpa calculations.
   - Investigate "Jam Pulang Hari Jumat" configuration in admin and how it's enforced in attendance pulang checkout.
2. R5: Integrasi & Aturan Kamera Langsung:
   - Check forms: Presensi Pulang, Jurnal Pembelajaran, Laporan Piket.
   - Find all `<input type="file">` and gallery upload options and plan their removal.
   - Plan direct camera capture via `navigator.mediaDevices.getUserMedia` with a live viewfinder.
   - Plan front/back camera switching toggle (`facingMode: "user" | "environment"`).

Perform thorough code exploration. Find exact files, component names, lines of code, and database schema.
Write your complete findings and implementation plan to c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m9_3\handoff.md.
Send a message when completed with your summary.
