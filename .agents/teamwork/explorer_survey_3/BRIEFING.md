# BRIEFING — 2026-10-04T07:19:30Z

## Mission
Technical survey for R4: Download Kartu Presensi QR Siswa (Admin) in SIPJAM App.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3
- Original parent: 29c4dd2f-8b7c-4287-a6f5-79961b0e301b
- Milestone: milestone_survey_r4

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT edit or modify source code files
- Output comprehensive findings and recommendation in handoff.md
- Send message to parent when finished

## Current Parent
- Conversation ID: 29c4dd2f-8b7c-4287-a6f5-79961b0e301b
- Updated: 2026-10-04T07:15:19Z

## Investigation State
- **Explored paths**:
  - `package.json`: Verified installed dependencies (no jspdf, html2canvas, or external QR library).
  - `src/types/database.ts`: Inspected `data_siswa` and `sekolah` schemas.
  - `src/lib/qrSiswa.ts`: Pure TypeScript QR engine (`generateQrMatrix`, `generateStudentQrSvg`, `getStudentQrIdentifier`).
  - `src/components/AdminDataView.tsx`: Inspected student table, card rendering, and existing print handlers (`handleShowStudentQr`, `printStudentQrCard`, `handlePrintBatchQrCards`).
  - `src/lib/watermarkCanvas.ts`: Inspected existing HTML5 canvas patterns in repository.
  - `tests/qrSiswa.test.ts` & `tests/printHeader.test.ts`: Inspected test practices and execution patterns.
- **Key findings**:
  - Zero external dependencies needed: HTML5 Canvas + `generateQrMatrix` provides 100% synchronous, high-resolution PNG rendering and download.
  - Student schema uses `nama_siswa`, `nisn`, `kelas`, `sekolah_id`, `qr_code`.
  - School schema (`sekolah`) has `nama`, `logo_url`, `alamat`. AdminDataView currently has `user.sekolah_id`, easily querying `sekolah` table.
  - Existing print functions in `AdminDataView.tsx` lacked `Nama Sekolah` and only supported `window.print()`.
- **Unexplored areas**: None. Survey is complete.

## Key Decisions Made
- Recommend pure HTML5 Canvas PNG download (`toDataURL('image/png')`) + updated Print window for PDF export.
- Standard CR80 portrait layout (600x960px) with SIPJAM emerald branding, complete student identity (Nama, NISN, Kelas, Nama Sekolah), and sharp QR matrix rendering.
- UI button placement: dedicated "Download Kartu" on each student item card in Data_Siswa tab + inside QR modal + batch support.

## Artifact Index
- DISPATCH.md — Initial dispatch message
- BRIEFING.md — Persistent context & state
- progress.md — Liveness heartbeat
- handoff.md — Final 5-component handoff report
