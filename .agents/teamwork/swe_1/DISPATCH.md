## 2026-10-30T14:44:52Z
This is a single self-contained fix; keep it small and focused. Identifikasi dan perbaiki sistem keamanan ujian serta fitur anti-kecurangan pada role siswa agar bekerja dengan benar dan andal pada codebase saat ini.

Integrity mode: development

## Requirements

### R1. Audit dan Identifikasi Kelemahan Keamanan Ujian Siswa
Audit seluruh mekanisme anti-kecurangan yang saat ini diterapkan pada role siswa saat pelaksanaan ujian di aplikasi, serta identifikasi bug, celah bypass, atau malfungsi yang menyebabkan proteksi tidak bekerja sebagaimana mestinya.

### R2. Perbaikan dan Penguatan Fitur Anti-Kecurangan
Terapkan perbaikan pada kode agar seluruh fitur anti-kecurangan pada role siswa (seperti deteksi perpindahan tab/jendela/blur, penjagaan mode fullscreen, pembatasan copy-paste/shortcut, dan integritas sesi pengerjaan ujian) aktif dan berfungsi dengan benar.

## Acceptance Criteria

### Fungsionalitas Anti-Kecurangan Siswa
- [ ] Seluruh celah keamanan atau kegagalan deteksi pada fitur anti-kecurangan role siswa yang ada diidentifikasi dan diperbaiki pada kode.
- [ ] Fitur anti-kecurangan bereaksi secara konsisten saat terjadi aksi pelanggaran siswa (misal: perpindahan fokus jendela/tab, keluar dari fullscreen, percobaan penyalinan teks) tanpa merusak pengalaman pengerjaan ujian normal bagi siswa yang jujur.
- [ ] Tim menyusun dan menjalankan skenario verifikasi/uji terprogram untuk membuktikan seluruh deteksi anti-kecurangan bekerja sesuai rancangan.
- [ ] Proyek lulus proses validasi build dan linting (npm run build) tanpa error atau regresi fungsional.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents/teamwork/swe_1/
Original request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents/teamwork/ORIGINAL_REQUEST.md
Identity: teamwork_swe
