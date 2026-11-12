# Original User Request

## Initial Request — 2026-11-12T05:14:28Z

Investigasi dan perbaiki dua kendala pada aplikasi sipjam-app: jurnal KBM guru yang tidak bisa disimpan, serta data jurnal guru yang hilang pada cetak jurnal KBM dari yang sebelumnya ada.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Perbaikan Penyimpanan Jurnal KBM Guru
Identifikasi penyebab kegagalan penyimpanan jurnal KBM guru dan perbaiki alur penyimpanan sehingga data jurnal KBM guru dapat tersimpan ke database dengan berhasil tanpa error.

### R2. Pemulihan Tampilan Data Jurnal Guru pada Cetak Jurnal KBM
Identifikasi penyebab hilangnya data jurnal guru pada fitur cetak jurnal KBM dan perbaiki logika pemanggilan atau penampilan datanya sehingga data jurnal guru kembali muncul secara lengkap dan akurat saat mencetak jurnal KBM.

### R3. Mekanisme Verifikasi
Rancang dan jalankan mekanisme verifikasi objektif untuk membuktikan bahwa penyimpanan jurnal KBM berhasil dan data cetak jurnal KBM tampil kembali tanpa menimbulkan regresi pada fitur lainnya.

## Acceptance Criteria

### Penyimpanan Jurnal KBM Guru
- [ ] Operasi penyimpanan jurnal KBM guru berhasil dieksekusi tanpa error.
- [ ] Data jurnal KBM yang disimpan tercatat di database dan dapat dimuat kembali secara benar.

### Cetak Jurnal KBM
- [ ] Tampilan atau dokumen cetak jurnal KBM menampilkan kembali data jurnal guru yang sebelumnya hilang.
- [ ] Seluruh data jurnal guru yang bersangkutan muncul secara lengkap dan akurat pada hasil cetak jurnal KBM.

### Verifikasi & Integritas
- [ ] Verifikasi objektif dijalankan dan membuktikan bahwa kedua masalah telah teratasi.
- [ ] Tidak terjadi regresi pada alur kerja guru, modul KBM, maupun fitur cetak lainnya.
