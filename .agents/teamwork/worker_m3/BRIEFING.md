# BRIEFING — 2026-10-04T15:35:00Z

## Mission
Implement Milestone 3 (R4): Download Kartu Presensi QR Siswa (Admin) in SIPJAM with client-side canvas PNG download and school name integrated printing.

## 🔒 My Identity
- Archetype: worker_m3
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3
- Original parent: 29c4dd2f-8b7c-4287-a6f5-79961b0e301b
- Milestone: M3 (R4) - Download Kartu Presensi QR Siswa (Admin)

## 🔒 Key Constraints
- Exclusive write ownership files: `src/lib/qrSiswa.ts` and `src/components/AdminDataView.tsx`. DO NOT modify any other source files!
- Zero external dependencies: no new packages (`jspdf`, `qrcode`, `html2canvas`, etc.). Use pure HTML5 Canvas and native APIs.
- Integrity Mandate: Genuine logic, real state and canvas rendering, sharp QR matrix, proper student metadata.
- Must compile cleanly: `npx tsc --noEmit` must return 0 errors.
- Respect Git Workflow Rule in GEMINI.md: git status, git add ., git commit -m "...", git push origin main.

## Current Parent
- Conversation ID: 29c4dd2f-8b7c-4287-a6f5-79961b0e301b
- Updated: 2026-10-04T15:35:00Z

## Task Summary
- **What to build**:
  1. In `src/lib/qrSiswa.ts`:
     - `generateStudentCardCanvas({ student, schoolName, qrIdentifier })`: 600x960 px portrait student digital attendance card with gradient emerald header, gold accents, school name, rounded QR container (270x270) with 220x220 sharp QR matrix, ID badge, student metadata box (nama, nisn, kelas, sekolah, gender, status), instructions footer.
     - `downloadStudentCardPng({ student, schoolName, qrIdentifier })`: Converts canvas to DataURL and triggers browser PNG download with standard filename.
     - `printStudentQrCardWithSchool({ student, schoolName, qrSvg, qrIdentifier })`: Enhanced print dialog containing school name and professional print card styling.
  2. In `src/components/AdminDataView.tsx`:
     - Fetch school name from Supabase `sekolah` table (`user.sekolah_id`), fallback to `user.sekolah_nama` or `'SIPJAM'`.
     - Student card item action: Added "Download Kartu" button calling `handleDownloadStudentCard`.
     - QR modal dialog: Added options "Download Gambar (PNG)" and "Cetak / Simpan PDF".
     - Batch QR actions: Included school name in batch card print HTML & page title.
- **Success criteria**:
  - Admin can download high-resolution PNG student card.
  - Print dialog includes school name.
  - Zero TypeScript errors (`npx tsc --noEmit`).
  - Production build succeeds (`npm run build`).

## Key Decisions Made
- Used direct 2D canvas drawing with `generateQrMatrix(qrIdentifier)` for zero-latency, sharp, 100% synchronous offline rendering.
- Standardized dimensions to 600x960 px (portrait ID ratio 1:1.6).
- Implemented graceful fallback for non-DOM/Node environments so unit test runners execute without canvas crashes.
- Extended single card print and batch print HTML templates to display school name prominently with responsive print media queries.

## Artifact Index
- `.agents/teamwork/worker_m3/DISPATCH.md` — assignment dispatch
- `.agents/teamwork/worker_m3/BRIEFING.md` — situational awareness
- `.agents/teamwork/worker_m3/progress.md` — heartbeat and progress tracking
- `.agents/teamwork/worker_m3/test_card.ts` — verification script for student card generator
- `.agents/teamwork/worker_m3/handoff.md` — completion handoff report

## Change Tracker
- **Files modified**:
  - `src/lib/qrSiswa.ts`: Added `generateStudentCardCanvas`, `downloadStudentCardPng`, `printStudentQrCardWithSchool`, interfaces and canvas rounded rectangle helpers.
  - `src/components/AdminDataView.tsx`: Added `schoolName` state fetched from Supabase `sekolah` table, `handleDownloadStudentCard`, updated `printStudentQrCard` and `handleShowStudentQr` modal with download PNG and print options, batch card printing with school branding, and "Download Kartu" action button in student card list.
- **Build status**: PASS (`tsc --noEmit` 0 errors, `npm run build` PASS)
- **Pending issues**: None

## Quality Status
- **Build/test result**: All 35/35 tests in `tests/qrSiswa.test.ts` passed; `test_card.ts` passed 100%; `npm run build` compiled successfully.
- **Lint status**: Clean
- **Tests added/modified**: `test_card.ts` verifying canvas creation, dimensions, dataUrl format, download handler, and node environment safety.

## Loaded Skills
- None explicitly loaded.
