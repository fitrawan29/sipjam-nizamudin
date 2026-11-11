# Original User Request

## Initial Request — 2026-11-11T03:02:28Z

Perbaiki kebijakan presensi agar guru dan staf TU yang tidak memiliki jam KBM tetap diwajibkan presensi, serta tambahkan fitur edit dan hapus jurnal KBM untuk pengguna dengan role guru pada aplikasi sipjam-app.

Integrity mode: development

## Requirements

### R1. Penyesuaian di Pengaturan Admin Kebijakan Guru untuk Guru dan Staf TU Tanpa Jam KBM
Periksa kembali dan sesuaikan pengaturan di menu pengaturan admin kebijakan guru. Pastikan kebijakan bagi guru yang hadir sesuai KBM dan hadir setiap hari teratur dengan jelas di sini, sehingga guru dan staf TU yang tidak memiliki jam KBM tidak terbaca bebas presensi; mereka tetap harus melakukan presensi datang, mengisi laporan piket (jika bertugas piket), mengisi jurnal kegiatan, dan melakukan presensi pulang.

### R2. Fitur Edit dan Hapus Jurnal KBM pada Role Guru
Tambahkan kemampuan pada antarmuka dan backend role guru untuk mengedit dan menghapus jurnal KBM yang telah mereka buat sendiri tanpa batasan waktu khusus, sehingga para guru dapat menyesuaikan data jurnal KBM mereka secara mandiri.

### R3. Batasan Perubahan dan Prosedur Git
Selain perbaikan pada R1 dan R2, jangan merubah hal lain yang ada di aplikasi. Terapkan prinsip solusi minimal dan tepat sasaran. Setelah selesai melakukan modifikasi/penambahan fitur, patuhi aturan git di GEMINI.md: jalankan git status, git add ., git commit dengan pesan deskriptif, dan git push origin main.

## Acceptance Criteria

### Pengaturan Kebijakan Presensi (Admin)
- [ ] Menu pengaturan admin kebijakan guru mengatur dengan jelas ketentuan kehadiran bagi guru dan staf TU tanpa jam KBM.
- [ ] Pengguna guru dan TU yang tidak memiliki jam KBM tidak lagi berstatus bebas presensi di sistem.
- [ ] Pengguna guru dan TU tanpa jam KBM dapat melakukan presensi datang dan presensi pulang.
- [ ] Pengguna guru dan TU tanpa jam KBM dapat mengisi jurnal kegiatan dan laporan piket (jika bertugas).

### Fitur Jurnal KBM Role Guru
- [ ] Pengguna dengan role guru dapat mengubah/mengedit data jurnal KBM milik mereka sendiri.
- [ ] Pengguna dengan role guru dapat menghapus data jurnal KBM milik mereka sendiri.
- [ ] Perubahan data jurnal KBM tersimpan dengan benar di database dan tercermin pada tampilan antarmuka.
- [ ] Fitur dan halaman lain di luar R1 dan R2 tetap berfungsi normal tanpa perubahan perilaku yang tidak diinginkan.

### Verifikasi dan Git
- [ ] Logika presensi dan fungsionalitas edit/hapus jurnal KBM terverifikasi berfungsi melalui pengujian kode / alur sistem.
- [ ] Seluruh perubahan kode telah di-commit dan di-push ke branch main sesuai aturan GEMINI.md.
