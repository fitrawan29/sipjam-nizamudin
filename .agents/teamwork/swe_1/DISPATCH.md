# Dispatch Log

## 2026-11-06T06:36:20Z
This is a single self-contained fix; keep it small and focused. Memperbaiki proses unggah data siswa dari berkas CSV template yang di-download dari aplikasi sesuai data master yang telah diisi agar data berhasil dimuat dan ditampilkan pada tabel master data siswa, tanpa mengubah fitur dan logika lain yang ada di aplikasi yang tidak terdampak.

Integrity mode: development

## Requirements

### R1. Perbaikan Pemrosesan dan Pemuatan Berkas CSV Siswa
Sistem harus memastikan berkas CSV template yang di-download dari aplikasi sesuai dengan data master, serta dapat membaca, memvalidasi, dan mengimpor data dari berkas CSV template siswa yang diunggah (termasuk menangani field opsional seperti nomor telepon yang kosong dan format nilai pada contoh dataset) ke dalam database master siswa, serta memastikan data langsung termuat dan ditampilkan pada tabel master siswa tanpa pesan atau status "tabel ini kosong dan data belum bisa dimuat".

### R2. Preservasi Fitur Eksisting (Zero Regression)
Perbaikan harus terisolasi pada alur unggah dan pemuatan data siswa. Fitur serta logika lain di dalam aplikasi yang tidak terdampak tidak boleh diubah atau mengalami regresi fungsional.

## Acceptance Criteria

### Fungsionalitas Unggah dan Tampilan Master Siswa
- [ ] Berkas CSV template yang di-download dari aplikasi sesuai data master dan diisi (termasuk dataset contoh 200+ siswa yang diberikan pengguna) berhasil diunggah tanpa error pemrosesan.
- [ ] Seluruh baris data siswa yang valid tersimpan ke dalam database dan ditampilkan pada tabel master data siswa.
- [ ] Tabel master data siswa menampilkan data hasil unggahan dan tidak menampilkan status "tabel ini kosong dan data belum bisa dimuat".

### Verifikasi & Preservasi Sistem
- [ ] Pengujian otomatis memverifikasi bahwa template CSV siswa yang diunduh sesuai data master dan penguraian (parsing) serta pemuatan data siswa dari contoh CSV berhasil secara menyeluruh.
- [ ] Seluruh pengujian otomatis proyek yang ada tetap berjalan sukses (passing) tanpa regresi pada modul aplikasi lainnya.
