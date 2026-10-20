## 2026-10-20T06:37:35Z

You are teamwork_preview_swe for swe_30.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_30
Authoritative request file is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Dispatch file is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_30\DISPATCH.md

Execute the SWE Light protocol on this single self-contained fix:
1. Penyesuaian batas jendela waktu input absensi kelas (Piket pagi s.d. 08:00 WITA, Wali Kelas pagi s.d. 12:00 WITA bersamaan KBM mapel, alokasi jam pulang Piket & Wali Kelas 1 jam setelah jam pulang mulai).
2. Fallback dinamis absensi harian siswa dari jurnal mapel guru jam terakhir dengan preservasi aturan Bolos.
3. Update suite pengujian (termasuk tests/wali_kelas_and_piket_intervensi.test.ts) dan verifikasi 100% lulus.
4. Git workflow: git status, git add ., git commit, git push origin main.
5. Record progress in progress.md and BRIEFING.md. On completion, write handoff.md and send message to caller.
