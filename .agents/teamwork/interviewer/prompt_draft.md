This is a single self-contained fix; keep it small and focused. Perbaiki mata pelajaran di jadwal pembelajaran agar mata pelajaran yang tidak ada seperti "teknik informasi" tidak dimasukkan dan hanya mata pelajaran valid seperti "informatika" yang digunakan, serta pastikan seluruh data master yang sudah diupload (data siswa, data guru, data jadwal pembelajaran, dan data kelas) tidak diubah atau disentuh sama sekali.

Integrity mode: development

## Requirements

### R1. Koreksi Mata Pelajaran pada Jadwal
Memastikan jadwal pembelajaran hanya memuat mata pelajaran yang valid (seperti informatika) dan meniadakan mata pelajaran yang tidak ada atau keliru (seperti teknik informasi). Pendekatan koreksi diserahkan kepada tim untuk menentukan apakah mencakup penyesuaian logika pemetaan/pembentukan jadwal dan pembersihan data jadwal yang keliru.

### R2. Perlindungan Data Master
Memastikan seluruh data master yang sudah di-upload (data siswa, data guru, data jadwal pembelajaran, dan data kelas) tidak disentuh atau dimodifikasi oleh proses perbaikan jadwal maupun proses sistem lainnya. Modul data master tetap difokuskan hanya untuk upload dan bukan untuk diubah-ubah.

## Acceptance Criteria

### Validitas Jadwal Pembelajaran
- [ ] Jadwal pembelajaran tidak memuat mata pelajaran yang tidak ada (misalnya "teknik informasi") dan hanya menampilkan mata pelajaran yang valid (misalnya "informatika").
- [ ] Jadwal pembelajaran dapat diakses dan ditampilkan dengan konsisten tanpa error atau referensi ke mata pelajaran yang keliru.

### Integritas Data Master
- [ ] Record data master siswa, guru, kelas, dan master jadwal yang sudah di-upload tidak mengalami perubahan (update) atau penghapusan (delete).
- [ ] Verifikasi independen membuktikan keutuhan data master tetap terjaga sebelum dan sesudah eksekusi perbaikan.
