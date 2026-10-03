## 2026-10-03T00:46:48Z
You are the SWE Orchestrator for this task.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_8
The project root is: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Please read the latest user request in:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (under section ## 2026-10-03T00:45:54Z)

Task Summary:
Ubah `CameraSelfieCapture` agar menerima prop orientasi, lalu gunakan orientasi potret untuk fitur Presensi, dan lanskap untuk Jurnal serta Laporan Piket.

Requirements:
- R1. Prop Orientasi: Tambahkan prop `orientation` ('portrait' | 'landscape') opsional ke `src/components/CameraSelfieCapture.tsx`. Jika 'portrait', gunakan constraint tinggi > lebar (misal `width: 720, height: 1280`). Jika 'landscape', gunakan lebar > tinggi (misal `width: 1280, height: 720`).
- R2. Terapkan ke Komponen: Teruskan prop yang sesuai dari:
  * `src/components/GuruPresensi.tsx` (portrait)
  * `src/components/GuruJurnal.tsx` (landscape)
  * `src/components/PiketView.tsx` (landscape)

Acceptance Criteria:
- File `CameraSelfieCapture.tsx` mengecek nilai prop `orientation` untuk mengatur `constraints.video`.
- File `GuruPresensi.tsx` meneruskan prop `orientation="portrait"`.
- File `GuruJurnal.tsx` meneruskan prop `orientation="landscape"`.
- File `PiketView.tsx` meneruskan prop `orientation="landscape"`.

Constraints:
- Git Workflow Rule (GEMINI.md): Setiap kali selesai modifikasi/penambahan file (menyelesaikan tugas), wajib `git status`, `git add .`, `git commit -m "..."`, dan `git push origin main`.
- Next.js Rule (AGENTS.md): Perhatikan konvensi Next.js jika ada file Next.js yang disentuh.
- Maintain your own progress.md and BRIEFING.md in your working directory (.agents/teamwork/swe_8).
- When complete, write handoff.md and send a message claiming victory back to the Sentinel so the victory audit can be initiated.
