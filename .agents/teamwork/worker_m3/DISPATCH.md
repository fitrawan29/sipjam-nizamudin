## 2026-10-04T07:25:38Z
You are Worker 3 (worker_m3).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3

Read ORIGINAL_REQUEST.md at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the latest request at the bottom, 2026-10-04T07:11:46Z).

Read PROJECT.md at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_13\PROJECT.md

Read the survey handoff from explorer_survey_3 at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3\handoff.md

Your exclusive write ownership files (YOU OWN ONLY THESE FILES):
- `src/lib/qrSiswa.ts`
- `src/components/AdminDataView.tsx`
DO NOT write to any other source files.

Task: Implement Milestone 3 (R4):
Download Kartu Presensi QR Siswa (Admin):
1. In `src/lib/qrSiswa.ts`:
   - Implement zero-dependency helper functions:
     - `generateStudentCardCanvas({ student, schoolName, qrIdentifier }): HTMLCanvasElement`
       - Canvas dimensions: 600 x 960 px.
       - Header: Gradient emerald theme (`#0B4619` to `#166534`), gold accent line (`#EAB308`), Title: "KARTU PRESENSI DIGITAL", School Name (`schoolName`), Subtitle: "Sistem Informasi Presensi Siswa".
       - QR Container: rounded white box (270x270 px) with drop shadow, containing sharp QR matrix generated from `generateQrMatrix(qrIdentifier)` in `#0B4619` color (220x220 px) and monospace badge `ID: ${qrIdentifier}`.
       - Student Identity Box: Full Name (`student.nama_siswa`), NISN (`student.nisn`), Kelas (`student.kelas`), Sekolah (`schoolName`), Gender (`student.gender`), Status "SISWA AKTIF".
       - Footer: instructions "Tunjukkan kartu ini pada scanner saat presensi datang & pulang" and "SIPJAM • Dokumen Resmi Presensi".
     - `downloadStudentCardPng({ student, schoolName, qrIdentifier }): boolean`
       - Calls `generateStudentCardCanvas`, converts to DataURL via `canvas.toDataURL('image/png')` or blob, and triggers browser download with filename `Kartu_Presensi_${student.nama_siswa || 'Siswa'}_${student.nisn || student.id}.png`.
     - `printStudentQrCardWithSchool({ student, schoolName, qrSvg, qrIdentifier }): void`
       - Enhanced version of print card popup that includes `schoolName` and formatted print layout.

2. In `src/components/AdminDataView.tsx`:
   - Fetch school name from Supabase `sekolah` table (`user.sekolah_id`) on component mount, with safe fallback to `user.sekolah_nama` or `'SIPJAM'`.
   - In student cards list (`renderCard` / action bar lines ~2007-2016):
     Add "Download Kartu" button:
     `<button onClick={() => handleDownloadStudentCard(item)} ...><i className="fa-solid fa-download"></i> Download Kartu</button>`
   - In QR modal dialog (`handleShowStudentQr`):
     Add options to "Download Gambar (PNG)" and "Cetak / Simpan PDF".
   - In batch QR actions:
     Ensure school name is included in batch card print.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Acceptance verification:
Run `npx tsc --noEmit` and relevant tests. Make sure there are 0 TypeScript errors.
Document all changes and test outputs in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3\handoff.md`.
Send a message to parent when completed.
