# Original User Request

## Initial Request — 2026-11-09T00:02:47Z

This is a single self-contained fix; keep it small and focused. Perbaiki masalah pengunggahan dokumen dari presensi untuk surat izin, surat sakit, dan surat-surat lainnya pada aplikasi SIPJAM agar berkas terunggah dengan andal tanpa refresh halaman secara prematur, dilengkapi indikator progres, tidak terjadi error penolakan file, dan dokumen terunggah pada folder presensi guru sesuai nama guru.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Penanganan Alur Pengunggahan Dokumen Presensi
Saat pengguna memilih berkas dokumen untuk surat izin, surat sakit, atau berkas pendukung presensi lainnya, sistem harus menampung berkas tanpa memicu refresh halaman atau upload langsung secara prematur. Proses pengunggahan dijalankan saat form presensi dikonfirmasi/disimpan tanpa me-refresh atau mereset halaman.

### R2. Indikator Progres dan Validasi Berkas
Sistem harus menyediakan indikator progres/status pengunggahan yang jelas. Berkas dokumen yang valid tidak boleh mengalami error penolakan file dan dapat diproses hingga tuntas.

### R3. Penempatan File Upload di Folder SIPJAM Sesuai Nama Guru
Dokumen presensi yang diunggah harus tersimpan secara otomatis pada jalur direktori upload presensi guru sesuai nama guru yang bersangkutan dengan struktur `SIPJAM/Presensi_Guru/<Nama Guru>/`.

## Acceptance Criteria

### Alur dan Ketahanan Pengunggahan
- [ ] Pemilihan berkas dokumen (surat izin, sakit, dsb.) tidak memicu refresh halaman atau upload langsung secara prematur sebelum konfirmasi form
- [ ] Proses upload berjalan tanpa memicu reload atau pemutusan state halaman

### Indikator Progres dan Penerimaan Berkas
- [ ] Indikator progres/status pengunggahan tampil saat proses upload berlangsung
- [ ] Berkas dokumen yang valid tidak ditolak dan tidak memunculkan error penolakan berkas

### Penempatan Direktori Penyimpanan
- [ ] Berkas yang terunggah tersimpan pada lokasi folder `SIPJAM/Presensi_Guru/<Nama Guru>/` sesuai identitas guru yang melakukan presensi

### Verifikasi Pengujian
- [ ] Automated unit/integration test baru dibuat dan lulus, mencakup skenario upload tanpa refresh prematur, progres pengunggahan, dan routing folder guru
- [ ] Seluruh test suite presensi yang sudah ada di repositori tetap lolos pengujian (regresi nihil)

---
Metadata & Coordination:
- Role/Identity: teamwork_swe (SWE Light Orchestrator)
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe\
- Original request reference: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Project root: c:\Users\Fitra\OneDrive\Documents\sipjam-app
