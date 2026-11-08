This is a single self-contained fix; keep it small and focused. Penambahan fitur admin untuk menentukan kepala sekolah dengan status Plt, Plh, atau Definitif pada aplikasi sipjam-app untuk kebutuhan produksi, di mana selain status definitif, awalan status ditambahkan di depan tulisan kepala sekolah ("Plt. Kepala Sekolah" atau "Plh. Kepala Sekolah") pada seluruh tampilan terkait tanpa mengubah atau mempengaruhi logika dan fitur eksisting.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Konfigurasi Status Kepala Sekolah oleh Admin
Admin dapat mengatur dan menentukan status jabatan Kepala Sekolah melalui antarmuka admin atau pengaturan sekolah dengan tiga pilihan status: Definitif, Plt (Pelaksana Tugas), atau Plh (Pelaksana Harian). Pilihan status ini harus tersimpan secara persisten pada sistem/basis data.

### R2. Penyesuaian Tampilan Label Kepala Sekolah
Pada seluruh tampilan antarmuka dan dokumen cetak yang memuat tulisan "Kepala Sekolah" (termasuk Informasi/Profil Sekolah, cetak dokumen rapor, rekapitulasi presensi, dan lembar tanda tangan):
- Jika status adalah Plt, tampilkan teks: "Plt. Kepala Sekolah".
- Jika status adalah Plh, tampilkan teks: "Plh. Kepala Sekolah".
- Jika status adalah Definitif, tetap tampilkan teks: "Kepala Sekolah" tanpa penambahan status di depan tulisan.

### R3. Preservasi Logika dan Fungsionalitas Eksisting
Perubahan ini tidak boleh merusak, mengubah, atau mendegradasi logika alur kerja dan fungsionalitas yang sudah ada pada aplikasi sipjam-app. Semua fitur eksisting harus tetap berfungsi normal.

### R4. Pengujian Otomatis
Implementasi harus disertai pengujian otomatis (automated unit/integration tests) menggunakan infrastruktur test eksisting di proyek yang memverifikasi:
- Penyimpanan dan pembaruan status kepala sekolah oleh admin.
- Format teks label kepala sekolah untuk status Definitif, Plt, dan Plh pada komponen tampilan dan cetak.
- Integritas fungsionalitas untuk memastikan tidak ada regresi pada modul lain di aplikasi.

## Acceptance Criteria

### Pengaturan Admin Status Kepala Sekolah
- [ ] Tersedia kontrol pemilihan status Kepala Sekolah dengan pilihan Definitif, Plt, dan Plh pada halaman pengaturan/admin.
- [ ] Admin dapat memilih dan menyimpan status Kepala Sekolah, dan nilai status tersimpan secara persisten di database/sistem.

### Format Tampilan Label Kepala Sekolah
- [ ] Ketika status adalah Plt, seluruh tampilan label yang relevan (halaman informasi sekolah, cetak rapor, rekap presensi, dokumen tanda tangan) menampilkan teks "Plt. Kepala Sekolah".
- [ ] Ketika status adalah Plh, seluruh tampilan label yang relevan menampilkan teks "Plh. Kepala Sekolah".
- [ ] Ketika status adalah Definitif, teks label tetap ditampilkan sebagai "Kepala Sekolah" tanpa awalan status tambahan.

### Integritas dan Pengujian Otomatis
- [ ] Automated tests dijalankan dan lulus 100%, memverifikasi logika penentuan status kepala sekolah dan pemformatan teks label.
- [ ] Seluruh test suite eksisting di proyek tetap lulus tanpa kegagalan atau regresi fungsional.
