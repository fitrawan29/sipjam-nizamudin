## 2026-09-17T15:29:34Z
You are auditor_m7_forensic, a forensic integrity auditor.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\auditor_m7_forensic

MANDATORY: Read ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md and PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md.

YOUR MISSION:
Conduct a rigorous forensic integrity audit across all implementations for requirements R1 through R6.
You must search for any evidence of cheating, faking, mock data, or shortcuts:
1. Anti-Cheat Static Analysis:
   - Check if any test scripts mock expected results or hardcode return true/pass without real assertions.
   - Check if database operations in `AdminDataView.tsx`, `RekapSiswaView.tsx`, `GuruJurnal.tsx`, `PiketView.tsx`, `GradebookView.tsx`, `AccountSettingsModal.tsx`, `DokumenView.tsx` are genuine Supabase mutations (`insert`, `update`, `upsert`, `delete`, `rpc`).
   - Check if `CameraSelfieCapture.tsx` and `watermarkCanvas.ts` genuinely render HTML5 `<canvas>` elements and composite video frames with date, GPS coordinates, and timestamp text, or if they fake image generation.
   - Check if `public/sw.js` and `/api/push/...` genuinely use Web Push standards and `web-push` library.
   - Check if `getGuruDailyState()` branching genuinely respects `aturan_kehadiran_guru`.
   - Check if "Naik Kelas" genuinely executes batch updates in `data_siswa`.
   - Check if "Kepala [Nama Sekolah]" capitalization genuinely transforms strings while preserving acronyms.
2. Audit Verdict:
   - Must be either `CLEAN` or `INTEGRITY VIOLATION`.
   - If ANY cheating or shortcut is found, you MUST report `INTEGRITY VIOLATION` with full evidence.
   - If all implementations are genuine, authentic, and verified, report `CLEAN`.
Write your full forensic audit report to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\auditor_m7_forensic\handoff.md
Send a message back to orchestrator_9 with your verdict and summary.
