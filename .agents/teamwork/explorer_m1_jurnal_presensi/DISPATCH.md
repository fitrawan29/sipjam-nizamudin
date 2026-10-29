## 2026-10-29T11:34:16Z
You are an Explorer for Milestone 1: Jurnal & Presensi Sub-Tab Architecture.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_jurnal_presensi\
Before starting work, YOU MUST read ORIGINAL_REQUEST.md located at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

Also read:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\spec_miner_survey\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_views_tests\handoff.md

Your task is to analyze and design the exact technical strategy to:
1. Normalize and prepare Cluster 1 (`GuruJurnal.tsx`, `RekapJurnalView.tsx`):
   - How `GuruJurnal.tsx` can accept an `initialTab` or render internal sub-tabs: `input` (Input Jurnal KBM 10 field), `rekap-pribadi` (Riwayat & Rekap Jurnal Saya), and `supervisi-kelas` (Supervisi Kelas Binaan for Wali Kelas).
   - How to ensure the 10-field input form and student roll-call are NEVER unmounted when switching sub-tabs (using CSS class `hidden` vs `block`), preserving draft state in memory.
   - How existing props and actions (`saveJurnalDraft`, `loadJurnalDraft`, print 10-column preview) remain 100% functional.
2. Normalize and prepare Cluster 2 (`GuruPresensi.tsx`, `HistoryView.tsx`):
   - How `GuruPresensi.tsx` can accept an `initialTab` or render internal sub-tabs: `live` (Presensi Hari Ini) and `riwayat` (Riwayat Kehadiran & Status Izin).
   - How camera 4:3 selfie capture, geofence GPS check, leave request forms, and snooze reminder remain 100% functional.
   - How `HistoryView` tab Presensi code is cleanly embedded or shared without regression.

Write your comprehensive findings and blueprint to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_jurnal_presensi\handoff.md
Update progress in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_jurnal_presensi\progress.md
Send a completion message to the orchestrator (conversation ID: 095792d8-1a85-4945-889d-abf25d3c7740).
