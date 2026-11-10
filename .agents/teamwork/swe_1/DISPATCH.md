## 2026-11-10T00:45:46Z
This is a single self-contained fix; keep it small and focused. Sesuaikan fitur intervensi wali kelas pada presensi siswa agar tetap dapat dilakukan meskipun wali kelas tersebut berstatus presensi dinas luar, izin, sakit, cuti, atau status non-hadir lainnya, tanpa memengaruhi fitur dan logika aplikasi yang sudah ada.

Integrity mode: development

## Requirements

### R1. Intervensi Presensi Siswa oleh Wali Kelas Berstatus Non-Hadir
Izinkan wali kelas untuk melakukan intervensi presensi terhadap siswa binaannya meskipun presensi wali kelas pada hari tersebut berstatus dinas luar, izin, sakit, cuti, atau status non-hadir lainnya, selama pengguna terotentikasi dan terverifikasi sebagai wali kelas dari siswa terkait.

### R2. Preservasi Logika Eksisting dan Pencegahan Regresi
Perubahan aturan validasi tidak boleh mengubah alur presensi reguler, validasi untuk peran/guru selain wali kelas, atau logika presensi siswa lainnya. Semua aturan bisnis presensi yang sudah berjalan harus tetap berfungsi normal.

## Acceptance Criteria

### Fungsionalitas Intervensi
- [ ] Wali kelas dengan status presensi dinas luar dapat berhasil melakukan intervensi presensi siswa di kelas binaannya.
- [ ] Wali kelas dengan status presensi izin, sakit, atau cuti dapat berhasil melakukan intervensi presensi siswa di kelas binaannya.
- [ ] Pengguna yang bukan wali kelas dari siswa terkait tetap ditolak saat mencoba melakukan intervensi presensi siswa tersebut sesuai aturan otorisasi yang berlaku.

### Integritas Sistem & Regresi
- [ ] Logika presensi guru reguler dan pencatatan presensi siswa umum tetap berjalan tanpa error atau perubahan perilaku yang tidak diharapkan.
- [ ] Perubahan kode diverifikasi menggunakan automated test yang relevan atau skrip verifikasi programmatic mandiri yang membuktikan kondisi terpenuhi dan tidak ada regresi.
