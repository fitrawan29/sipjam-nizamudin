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


## 2026-11-03T03:03:41Z
This is a single self-contained fix; keep it small and focused. Pastikan seluruh logika presensi gerbang piket, absensi wali kelas, alokasi kepulangan, aturan bolos mapel, fallback jurnal KBM, notifikasi WhatsApp orang tua, serta fungsi cetak/export rekap tetap dipertahankan dan bekerja sesuai kesepakatan setelah pembaruan tampilan scan aktual.

Integrity mode: development

## Requirements

### R1. Retensi Logika Waktu Presensi Gerbang & Wali Kelas
Batas waktu input presensi piket pagi tetap s.d. 08:00 WITA, jendela absensi pagi wali kelas tetap s.d. 12:00 WITA, dan alokasi presensi pulang guru piket serta wali kelas berlaku selama 1 jam (60 menit) setelah waktu kepulangan dimulai (`isPiketPulangAllowed`).

### R2. Retensi Aturan Status Kehadiran (Bolos & Fallback Jurnal KBM)
Jika siswa tercatat hadir pagi di gerbang/kelas tetapi Alfa atau Bolos pada jurnal KBM terakhir, status kehadiran harian tetap menjadi Bolos. Jika absensi harian belum diisi oleh wali kelas, fallback dinamis dari sesi jurnal KBM jam pelajaran terakhir (`findLastKbmJournal`, `resolveDailyStudentAttendance`) tetap aktif dan valid.

### R3. Retensi Notifikasi WhatsApp dan Cetak/Export Rekap
Integrasi notifikasi 1-click WhatsApp orang tua dan seluruh fungsi cetak/export rekap presensi tetap berfungsi normal tanpa regresi.

### R4. Konsistensi Tampilan Waktu Scan Gerbang
Jam datang presensi gerbang menampilkan waktu scan masuk aktual, dan jam pulang presensi gerbang menampilkan waktu scan pulang aktual jika sudah ada atau '-' jika belum presensi pulang, dengan penormalan format waktu menggunakan `formatPresensiTime` (WITA).

## Acceptance Criteria

### Presensi Gerbang & Absensi Logic Verification
- [ ] Batas waktu input presensi piket pagi s.d. 08:00 WITA tetap berlaku dan terverifikasi.
- [ ] Jendela absensi pagi wali kelas s.d. 12:00 WITA tetap berlaku dan terverifikasi.
- [ ] Alokasi presensi pulang guru piket dan wali kelas berlaku selama 1 jam (60 menit) setelah waktu kepulangan dimulai (`isPiketPulangAllowed`) tetap berlaku dan terverifikasi.
- [ ] Aturan status Bolos gerbang & mapel terverifikasi: siswa hadir pagi di gerbang/kelas tetapi Alfa atau Bolos pada jurnal KBM terakhir menghasilkan status akhir Bolos.
- [ ] Fallback dinamis absensi harian dari sesi jurnal KBM jam pelajaran terakhir (`findLastKbmJournal`, `resolveDailyStudentAttendance`) terverifikasi aktif saat wali kelas belum mengisi absensi harian.
- [ ] Tampilan jam datang presensi gerbang menampilkan waktu scan masuk aktual, dan jam pulang menampilkan waktu scan pulang aktual jika sudah ada atau '-' jika belum ada presensi pulang dalam format WITA (`formatPresensiTime`).
- [ ] Integrasi notifikasi 1-click WhatsApp orang tua dan fungsi cetak/export rekap presensi terverifikasi utuh dan berfungsi normal.
- [ ] Seluruh skrip pengujian / type-check / build berjalan sukses tanpa kegagalan atau regresi.
