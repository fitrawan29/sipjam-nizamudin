# Penyesuaian Fitur Akun Guru Sipjam

[OPEN: Ini adalah proyek dengan banyak bagian yang melibatkan perubahan backend, database, dan UI. Saya menyarankan tim yang terfokus untuk menangani ini.]

Integrity mode: development

## Requirements

### R1. Presensi Pulang
Tambahkan opsi kondisi "Izin", "Sakit", dan "Dinas Luar" pada presensi pulang. Jika dipilih, sistem harus mengisi otomatis sisa jurnal KBM hari itu dengan keterangan kondisi tersebut.

### R2. Perbaikan Upload Dokumen Presensi
Analisis dan perbaiki masalah "Upload dokumen tertunda" agar foto presensi datang/pulang dapat langsung terunggah.

### R3. Tampilan Riwayat Kehadiran
Satu-kan tampilan presensi datang dan pulang menjadi 1 kartu agar lebih simpel.

### R4. Deduplikasi Perangkat Pembelajaran
Identifikasi tingkatan kelas untuk mapel. Jika terdapat 2 atau lebih kelas paralel pada tingkatan yang sama, perangkat pembelajaran cukup diupload satu kali untuk tingkat tersebut.

### R5. Penyesuaian Label Mapel
Sesuaikan label mapel menjadi format "[Nama Mapel] - [Tingkatan]" (misal: "Seni Budaya - X Merdeka") untuk upload perangkat pembelajaran.

### R6. Perubahan Form Jurnal KBM
Hilangkan form pengisian "Nomor (Pertemuan ke-)" pada pembuatan dan pengeditan jurnal KBM.

### R7. Perbaikan Preview Foto Jurnal
Perbaiki tampilan preview foto dokumentasi pada edit jurnal KBM yang saat ini menampilkan logo gambar pecah.

### R8. Perbaikan Link Foto Jurnal
Perbaiki error "ERR_FILE_NOT_FOUND" pada foto dokumentasi di rekap jurnal guru agar dapat diakses.

### R9. Edit Jurnal di Daftar Nilai
Izinkan guru mengedit pertemuan meskipun belum ada jurnal pada presensi sesi di daftar nilai.

### R10. Freeze Kolom Daftar Nilai
Freeze hanya kolom "NISN" dan "Nama Siswa" pada tabel identitas siswa di daftar nilai.

### R11. Hapus Menu Cetak Jurnal
Hilangkan menu "Cetak Jurnal" pada sidebar menu.

### R12. Alur Otomatis Alpa
Sistem secara otomatis memberikan keterangan "Alpa" jika guru tidak melakukan presensi datang dan pulang sesuai batas waktu yang ditentukan admin.

### R13. Alur Otomatis Pulang Cepat
Sistem secara otomatis memberikan keterangan "Pulang Cepat" jika guru melakukan presensi datang tetapi tidak melakukan presensi pulang sesuai batas waktu yang ditentukan admin.

## Verification Resources
[OPEN: Apakah Anda memiliki test suite, dokumentasi skema database, atau dokumentasi alur presensi/jurnal yang bisa digunakan tim untuk verifikasi?]
