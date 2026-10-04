## 2026-10-04T07:01:45Z

You are swe_11, the SWE Light Orchestrator (teamwork_preview_swe).

Your working directory is:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_11

Project root is:
c:\Users\Fitra\OneDrive\Documents\sipjam-app

Your task is defined in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md under header ## 2026-10-04T07:00:45Z:

"Perbaikan aksesibilitas fitur presensi dan cetak dokumen (SIPJAM): batasi modul piket hanya untuk guru yang bertugas hari ini, batasi rekap presensi hanya untuk wali kelas, dan rapikan format cetak (hide UI buttons).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Integrity mode: development

This is a single self-contained fix; keep it small and focused.

## Requirements

### R1. Batasan Akses Modul Piket
Menu dan akses ke `PiketView.tsx` (baik presensi QR maupun Manual) hanya boleh muncul/bisa diakses jika guru yang sedang login memiliki jadwal piket pada hari ini (cek tabel database jadwal piket yang relevan). Jika bukan hari piketnya, sembunyikan menu/aksesnya.

### R2. Batasan Akses Rekapitulasi Presensi (Wali Kelas)
Rekapitulasi presensi (QR maupun Piket) hanya boleh diakses oleh Wali Kelas, dan data yang ditampilkan dikunci mutlak HANYA untuk kelas binaan wali kelas tersebut. Guru biasa yang bukan wali kelas tidak boleh melihat menu rekapitulasi presensi siswa. Pastikan view seperti `RekapSiswaView.tsx` (atau tab terkait) memberlakukan rule ini.

### R3. Format Cetak Dokumen Guru
Sesuaikan layout cetak dokumen pada view Guru agar formatnya identik dengan format di Admin. Tambahkan aturan CSS `@media print` untuk menyembunyikan tombol-tombol UI, sidebar, atau elemen interaktif (non-dokumen) saat dicetak, sehingga hasil print bersih (print-friendly).

## Acceptance Criteria

### Akses Piket
- [ ] Guru tanpa jadwal piket hari ini tidak melihat menu "Piket" atau "Scan QR".
- [ ] Guru dengan jadwal piket hari ini dapat mengakses `PiketView`.

### Akses Rekap Wali Kelas
- [ ] Guru biasa tidak memiliki akses ke tab/menu "Rekap Presensi Siswa".
- [ ] Wali Kelas dapat melihat rekap presensi, tetapi dropdown/filter kelas terkunci hanya pada kelas binaannya.

### Cetak Dokumen
- [ ] Saat fungsi print dipanggil pada dokumen di view Guru, tombol aksi (seperti "Print", "Simpan", dsb) dan UI aplikasi tidak ikut tercetak.
- [ ] Layout cetak dokumen guru sama persis dengan layout cetak dokumen admin.

### Build & Types
- [ ] `tsc --noEmit` 0 error.
- [ ] Build Next.js sukses."

CRITICAL RULES:
1. GEMINI.md Git Workflow Rule:
Upon completing modifications/additions/deletions, you must check git status, stage changes (`git add .`), commit with descriptive message, and push to origin main automatically.
2. AGENTS.md Rule: Check Next.js rules in node_modules/next/dist/docs/ if writing any Next.js specific code.
3. Keep track of progress in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_11\progress.md` and maintain `BRIEFING.md`.
4. Run SWE Light protocol (one implementer on the whole task, then adversarial review rounds, verification).
5. When complete, write `handoff.md` in your directory and report completion with victory claim back to the Sentinel.
