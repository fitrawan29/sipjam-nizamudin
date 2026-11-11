This is a single self-contained fix; keep it small and focused. Investigasi dan perbaiki ketidakkonsistenan status KBM antara antarmuka Guru dan Admin/Dashboard pada sipjam-app, di mana guru (seperti Ibu Winda Wulansari) yang sudah mengisi jurnal dan menyelesaikan presensi pulang masih terdata "tidak masuk kelas" di antarmuka Admin. Gunakan pendekatan /ponytail: cari solusi paling sederhana, minimal, tepat sasaran, dan sinkronkan konsistensi status KBM antara kedua antarmuka.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Investigasi Akar Masalah dan Sinkronisasi Status KBM
Identifikasi akar penyebab inkonsistensi status kehadiran/KBM antara antarmuka Guru dan Admin/Dashboard (khususnya kasus di mana guru sudah mengisi jurnal dan presensi pulang namun di Admin tercatat "tidak masuk kelas"), lalu sinkronkan logika status KBM agar kedua antarmuka menampilkan data yang konsisten dan akurat.

### R2. Pendekatan Minimalis (/ponytail)
Terapkan solusi yang paling sederhana, minimal, dan tepat sasaran tanpa menambahkan abstraksi berlebih, serta pastikan perbaikan tidak menimbulkan regresi atau masalah pada fitur dan kode terkait lainnya.

### R3. Prosedur Git (GEMINI.md)
Setelah verifikasi selesai, lakukan alur kerja git sesuai aturan di GEMINI.md: periksa status (`git status`), stage seluruh perubahan (`git add .`), buat commit dengan pesan deskriptif (`git commit -m "..."`), dan push ke branch utama (`git push origin main`).

## Acceptance Criteria

### Konsistensi Status KBM
- [ ] Logika status KBM pada antarmuka Admin/Dashboard dan antarmuka Guru tersinkronisasi sehingga guru yang telah mengisi jurnal kelas dan presensi pulang (termasuk contoh kasus Ibu Winda Wulansari) tidak lagi berstatus "tidak masuk kelas" di Admin.
- [ ] Tampilan dan data rekap status KBM di antarmuka Admin mencerminkan status aktual jurnal dan kehadiran guru secara tepat dan konsisten.
- [ ] Tidak terjadi regresi pada alur presensi guru, pengisian jurnal, maupun fitur terkait lainnya.

### Verifikasi Repositori & Alur Git
- [ ] Perbaikan diverifikasi menggunakan data/kasus yang ada di repositori dan database saat ini.
- [ ] Seluruh perubahan kode telah di-stage, di-commit dengan pesan deskriptif, dan di-push ke branch main sesuai aturan GEMINI.md.
