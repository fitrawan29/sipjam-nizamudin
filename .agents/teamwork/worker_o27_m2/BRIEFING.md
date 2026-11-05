# BRIEFING — 2026-11-05T15:55:00Z

## Mission
Implement Milestone M2 (R2: Pusat Verifikasi & Workflow Penyelarasan Presensi, Piket, Perangkat, & Jurnal).

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o27_m2\
- Original parent: b5b25aaa-c722-45e4-bde9-78a9910f9061
- Milestone: M2 (R2: Pusat Verifikasi & Workflow Penyelarasan Presensi, Piket, Perangkat, & Jurnal)

## 🔒 Key Constraints
- Files owned:
  * src/components/AdminVerifView.tsx
  * src/components/DokumenView.tsx
  * src/components/GuruPresensi.tsx
  * src/lib/attendanceAlpa.ts
  * src/components/RekapJurnalView.tsx
- No cheating, no hardcoding verification strings. Real state and genuine logic.
- Run `npx tsc --noEmit` and `npm test` to verify. All tests must pass.
- Git workflow rule: check status, git add, commit descriptive, push to main (or check if parent does push, follow GEMINI.md).
- Self-contained handoff.md and send_message to parent.

## Current Parent
- Conversation ID: b5b25aaa-c722-45e4-bde9-78a9910f9061
- Updated: 2026-11-05T15:55:00Z

## Task Summary
- **What to build**:
  1. AdminVerifView:
     - Remove "Pedoman Kebijakan & SOP SIPJAM" button from header.
     - Presensi history list sort newest to oldest.
     - "Bebas Hadir" status for teachers with `wajib_hadir_hanya_mengajar` or `Hari_Mengajar_Saja` when 0 scheduled classes and 0 piket on selected day.
     - Distinct badge pills for status: Sakit, Izin, Dinas Luar, Hadir di Sekolah.
     - Piket: teachers scheduled for piket without submitted report marked directly as "tidak membuat laporan piket" without requiring manual/modal confirmation.
     - Jurnal verification: teachers who are Sakit, Izin, Dinas Luar not flagged as unsubmitted delinquency.
  2. DokumenView:
     - Grade-level extraction (`extractTingkat(kelas)`).
     - Limit upload per subject to once for parallel classes at same grade level; block duplicates with informative message.
     - Teacher subject cards and completion matrix count upload for grade level as complete for parallel classes on same level.
  3. Auto-fill KBM Journal on teacher absence (Sakit, Izin, Dinas Luar):
     - In GuruPresensi.tsx, attendanceAlpa.ts, RekapJurnalView.tsx, AdminVerifView.tsx:
     - When teacher attendance is Sakit, Izin, or Dinas Luar and has scheduled KBM classes, automatically populate KBM journal entries with status matching attendance (Sakit, Izin, Dinas Luar) and reason/notes, so rekapitulasi & verification show legitimate excused status instead of "tidak masuk kelas" or unsubmitted violation.
- **Success criteria**:
  - `npx tsc --noEmit` -> 0 errors (Confirmed PASS).
  - `npm test` -> all test suites pass (Confirmed PASS).

## Change Tracker
- **Files modified**:
  * src/components/AdminVerifView.tsx - SOP button removed, sort descending, Bebas Hadir, badge pills, piket direct unsubmitted mark, excused journal filtering
  * src/components/DokumenView.tsx - extractTingkat, parallel class upload single check, shared completion matrix
  * src/components/GuruPresensi.tsx - autoFillKbmJournalsForLeave integration on attendance submission
  * src/lib/attendanceAlpa.ts - autoFillKbmJournalsForLeave function & excused leave handling in recordUnfilledJournalsAndPiket
  * src/components/RekapJurnalView.tsx - synthesized leave entries check presensi and format as excused Sakit/Izin/Dinas Luar
- **Build status**: Pass (`npx tsc --noEmit` -> 0 errors, `npm test` -> 0 failures)
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass
- **Lint status**: Clean
- **Tests added/modified**: All project test suites passing

## Loaded Skills
- None

## Key Decisions Made
- `extractTingkat` extracts normalized Roman numerals (X, XI, XII, VII, VIII, IX) and numeric grade levels (1-12) to match parallel classes such as "X Merdeka 1" and "X Merdeka 2".
- Duplicate document upload check in `submitDokumen` stops upload with an informative alert before storage upload, conserving storage bandwidth and teacher time.
- In `AdminVerifView.tsx`, unsubmitted and auto-filled items directly display their automated status ("tidak membuat laporan piket" or "Otomatis ({status} - Sesuai Presensi)") without requiring manual/modal confirmation.
- In `GuruPresensi.tsx`, submitting Sakit/Izin/Dinas Luar Datang attendance calls `autoFillKbmJournalsForLeave` across the leave duration to record legitimate journal entries immediately.

## Artifact Index
- DISPATCH.md
- BRIEFING.md
- progress.md
- handoff.md
