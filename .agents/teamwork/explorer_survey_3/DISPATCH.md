## 2026-10-04T07:15:19Z
You are an Explorer subagent (explorer_survey_3).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3

Read ORIGINAL_REQUEST.md at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the latest request at the bottom, 2026-10-04T07:11:46Z).

Your objective is technical survey for:
4. R4: Download Kartu Presensi QR Siswa (Admin)
   - Di tampilan Admin (misal: `AdminDataView.tsx` atau tab Siswa di master data), selidiki struktur data siswa (`nama_lengkap` / `nama`, `nisn` / `nis`, `kelas`, `sekolah_id` / nama sekolah, `qr_code`).
   - Periksa bagaimana QR code siswa saat ini dibuat atau disimpan (misalnya kolom `qr_code` di tabel `siswa`, library QR yang dipakai seperti `qrcode`, `qr-code-styling`, `qrcode.react`, atau canvas).
   - Periksa apakah ada library eksternal atau bawaan di `package.json` untuk export/download (misal `jspdf`, `html2canvas`, canvas `toDataURL()`, SVG download, dsb.). Jika tidak ada library baru yang boleh diinstall, rancang mekanisme download gambar (PNG/JPEG) via HTML5 `<canvas>` atau PDF native / print preview tanpa dependensi npm baru jika memungkinkan.
   - Rancang desain kartu identitas (Nama, NISN, Kelas, Nama Sekolah, QR Code unik) yang proporsional, rapi, dan tombol "Download Kartu" di `AdminDataView.tsx`.

Scope boundaries:
- DO NOT edit or modify source code files. You are an exploratory read-only agent.
- Output your comprehensive findings and implementation recommendation in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3\handoff.md`.
- Send a message to parent when finished.
