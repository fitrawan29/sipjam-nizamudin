# BRIEFING — 2026-09-19T01:21:00Z

## Mission
Investigate R3 (Teacher Dashboard, Camera Geolocation & Reverse Geocoding with Nominatim, Student Attendance Percentage) and R4 (PWA Install Prompt, Admin Rejection Feedback Flow). Produce survey_r3r4.md.

## ?? My Identity
- Archetype: explorer
- Roles: investigator, reporter
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m10_survey_r3r4
- Original parent: e2b01d1e-ab0b-47a7-b1f2-7917ded697ce
- Milestone: milestone_10

## ?? Key Constraints
- Read-only investigation — do NOT implement or modify source code
- Files in .agents/ are metadata/reports only
- Provide exact file paths, line numbers, code snippets, schemas, and implementation guides

## Current Parent
- Conversation ID: e2b01d1e-ab0b-47a7-b1f2-7917ded697ce
- Updated: 2026-09-19T01:21:00Z

## Investigation State
- **Explored paths**:
  - `src/components/HomeView.tsx` (all 1610 lines analyzed, 6 sections identified)
  - `src/components/CameraSelfieCapture.tsx` (geolocation & capture flow)
  - `src/lib/watermarkCanvas.ts` (HTML5 canvas watermark drawing & mirroring)
  - `src/components/GuruPresensi.tsx`, `GuruJurnal.tsx`, `PiketView.tsx` (camera consumers)
  - `src/components/RekapSiswaView.tsx`, `AnalitikView.tsx` (student attendance calculations)
  - `public/sw.js`, `src/app/layout.tsx`, `src/app/page.tsx`, `PushNotificationPrompt.tsx` (PWA status)
  - `src/components/AdminVerifView.tsx`, `DokumenView.tsx`, `HistoryView.tsx` (verification & rejection flow)
  - Database schema queried via Supabase `information_schema.columns`
- **Key findings**:
  - Teacher dashboard has 6 sections; strictly reordered to: 1. Personal data stats, 2. Today's task status, 3. Teaching schedule. Sections 2 (standalone), 4, and 5 removed.
  - Nominatim reverse geocoding can be cleanly integrated with quantization cache and 3.5s timeout. Canvas badge expanded to 4 lines with format `[desa/kelurahan, kecamatan, kota/kabupaten, provinsi]`. Front and rear cameras verified.
  - Student attendance bug in `RekapSiswaView` missing `kehadiran_murid` and regex parsing of absentees fixed to `(total_present / total_students) * 100`.
  - PWA manifest.json and `beforeinstallprompt` missing; full component spec designed.
  - Database tables `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket` lack feedback column; SQL migration adding `catatan_admin TEXT` and SweetAlert2 textarea modal designed.
- **Unexplored areas**: None. All R3 and R4 requirements thoroughly investigated.

## Key Decisions Made
- Use `catatan_admin TEXT DEFAULT NULL` (and `alasan_penolakan TEXT DEFAULT NULL`) to maintain full consistency with `bank_dokumen` and `HistoryView.tsx`.
- Round coordinates to 3 decimals (~110m) for Nominatim caching in `sessionStorage` to prevent rate-limiting.

## Artifact Index
- survey_r3r4.md — Comprehensive Survey Report for R3 and R4
- handoff.md — Standard 5-Component Handoff Report
- progress.md — Liveness Heartbeat
- DISPATCH.md — Incoming Dispatch Record
