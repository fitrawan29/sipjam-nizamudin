## 2026-10-31T12:25:39Z
This is a single self-contained fix; keep it small and focused. Menyusun dokumen kebijakan dan standar operasional prosedur (SOP) mengenai konsekuensi bagi pihak yang tidak mengisi tiket, tidak mengisi jurnal KBM, ataupun tidak mengisi jurnal kegiatan dalam repositori SIPJAM.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Dokumen Kebijakan Konsekuensi Administratif Bertingkat
Menyusun dokumen regulasi dan SOP tertulis di `docs/KONSEKUENSI_PELANGGARAN.md` yang menetapkan konsekuensi administratif bertingkat (teguran lisan, teguran tertulis SP1-SP3, evaluasi insentif/honor, hingga pemanggilan pimpinan/yayasan) atas kelalaian dalam:
1. Tidak mengisi tiket (tiket piket / izin / penugasan).
2. Tidak mengisi jurnal KBM (Kegiatan Belajar Mengajar).
3. Tidak mengisi jurnal kegiatan.

### R2. Batas Waktu Pelaporan, Alur Verifikasi, dan Mekanisme Klarifikasi
Mendefinisikan batasan waktu cut-off pengisian, peran dan wewenang pihak pemeriksa (guru piket, tim kurikulum, pimpinan sekolah), serta alur klarifikasi/keberatan yang wajar bagi guru atau staf dengan kendala yang sah.

## Acceptance Criteria

### Kelengkapan & Struktur Dokumen
- [ ] Dokumen kebijakan dan SOP resmi tersimpan di `docs/KONSEKUENSI_PELANGGARAN.md`.
- [ ] Dokumen memuat definisi pelanggaran dan matriks konsekuensi bertingkat untuk ketiga kategori: tiket, jurnal KBM, dan jurnal kegiatan.
- [ ] Skema sanksi administratif mencakup tahapan bertingkat: teguran lisan, teguran tertulis (SP1-SP3), evaluasi/penangguhan insentif, dan pemanggilan pimpinan.
- [ ] Dokumen mencantumkan batas waktu toleransi pengisian (cut-off) dan pihak yang berwenang melakukan verifikasi serta rekapitulasi.
- [ ] Dokumen memuat prosedur resmi klarifikasi atau pengajuan dispensasi jika terjadi kendala teknis/keadaan darurat.

## 2026-11-02T06:56:54Z
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

