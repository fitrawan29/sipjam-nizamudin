# Dispatch Log

## 2026-09-18T07:38:54Z

You are the Project Orchestrator for Milestone 9 enhancements of the SIPJAM application.

## Identity & Working Directory
- Identity: orchestrator_10
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_10
- Sentinel Conversation ID: 5901617f-3b2b-467c-8abc-3a06ccc86505
- Master Request File: c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md (and c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md)

## Objective & Requirements
Implement all requirements from the latest section in ORIGINAL_REQUEST.md:

### R1. Pengaturan Tahun Ajaran & Daftar Nilai
- Pada akun guru, Tahun Ajaran harus disinkronkan dengan pengaturan yang ditetapkan oleh admin di tabel pengaturan/konfigurasi.
- Pada antarmuka admin, daftar nilai dikunci menjadi view-only dan hanya memiliki opsi untuk dicetak.
- Input dan manajemen Tujuan Pembelajaran (TP) hanya dapat diakses melalui akun guru pengampu.

### R2. Sistem Notifikasi & Chat Real-time
- Implementasikan UI ikon bel notifikasi di navbar untuk pemberitahuan siaran (broadcast). Ikon harus memiliki animasi bergetar dan indikator merah jika ada unread broadcast.
- Kembangkan fitur chat real-time antar guru menggunakan Supabase Realtime.
- Integrasikan sistem Web Push Notifications (menggunakan Service Worker & VAPID keys) untuk memberikan peringatan otomatis kepada guru yang belum melakukan presensi, mengisi jurnal, atau piket.

### R3. Hak Akses Jurnal Kelas
- Modifikasi middleware atau routing agar Jurnal Kelas secara eksklusif hanya dapat dibuka oleh role Admin dan Wali Kelas dari kelas yang bersangkutan.

### R4. Pengaturan Kehadiran & Jadwal (Admin)
- Tambahkan konfigurasi di sisi Admin untuk mendefinisikan pengecualian kehadiran guru (hadir khusus hari mengajar). Guru tanpa pengecualian diwajibkan hadir setiap hari kerja.
- Tambahkan konfigurasi jam presensi pulang spesifik untuk hari Jumat di panel Admin.

### R5. Integrasi & Aturan Kamera Langsung
- Presensi pulang, Jurnal, dan Laporan Piket wajib menggunakan input kamera langsung melalui browser (`navigator.mediaDevices`).
- Opsi untuk upload file gambar (dari galeri) harus ditiadakan pada form-form tersebut.
- Kamera harus mendukung pergantian antara kamera depan (user) dan kamera belakang (environment).

## Acceptance Criteria
- Login sebagai Guru -> Tahun Ajaran sesuai dengan data di panel admin.
- Login sebagai Admin -> Fitur edit pada daftar nilai tidak muncul, hanya tampil tombol "Cetak".
- Ikon bel notifikasi memicu animasi getar ketika ada baris baru di tabel broadcast dengan status unread untuk user tersebut.
- Chat antar guru dapat dilakukan secara dua arah, pesan baru muncul tanpa perlu me-refresh halaman.
- Dialog izin "Kirim Notifikasi (Push)" muncul di browser, dan notifikasi simulasi dari sistem berhasil masuk.
- Login sebagai Guru biasa -> Akses ke menu Jurnal Kelas terblokir atau disembunyikan.
- Login sebagai Admin -> Terdapat antarmuka untuk memilih guru yang "Hanya wajib hadir saat hari mengajar" dan antarmuka untuk mengatur "Jam Pulang Hari Jumat".
- Form Presensi Pulang, Jurnal, dan Piket -> Menampilkan viewfinder kamera langsung, terdapat tombol toggle kamera depan/belakang, dan fitur `<input type="file">` telah dihilangkan.
