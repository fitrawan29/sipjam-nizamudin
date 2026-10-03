## 2026-10-03T05:28:21Z
You are orchestrator_7, the Project Orchestrator.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_7
The original user request is in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (under header ## 2026-10-03T05:27:01Z).

Tasks to orchestrate:
1. R1. Kamera Anti-Zoom dan Orientasi Akurat: Pastikan pengambilan gambar melalui `CameraSelfieCapture.tsx` tidak men-zoom (skala 1x). Jika kamera dalam mode potret, maka foto yang dihasilkan (baik di `<canvas>` maupun di data akhir) berorientasi potret. Jika lanskap, hasilkan gambar lanskap.
2. R2. Penghapusan Indikator Oranye pada AI: Hilangkan elemen visual "tanda oranye bulat" (badge/dot notifikasi) yang menempel pada ikon robot AI di komponen `AIAssistant.tsx`.
3. R3. Sistem Notifikasi Pengingat (Reminder) Otomatis: Buat mekanisme untuk mengirim notifikasi push (atau in-app jika push tidak memungkinkan secara interval) setiap 5 menit untuk mengingatkan guru apabila:
- Belum melakukan presensi datang (memperhatikan jam masuk/terlambat).
- Belum mengisi jurnal mengajar.
- Belum mengisi laporan piket (khusus bagi yang mendapat jadwal piket hari itu).
- Belum melakukan presensi pulang (memperhatikan jam pulang).
Catatan: Gunakan mekanisme berbasis frontend / Service Worker (berjalan saat aplikasi dibuka di depan atau latar belakang) sesuai preferensi pengguna.

Acceptance Criteria:
- Pengambilan foto di mode potret menghasilkan gambar berdimensi vertikal (tinggi > lebar), tanpa cropping buatan/zoom.
- Ikon robot AI tampil bersih tanpa bulatan oranye di sudutnya.
- Terdapat logika yang mendeteksi kekurangan kelengkapan harian (presensi datang, pulang, jurnal, piket) berdasarkan waktu/jam sekolah, dan memicu notifikasi peringatan berulang.

Rules:
- GEMINI.md Git Workflow Rule: whenever completing modifications/additions/deletions, check git status, stage (git add .), commit with descriptive message, and push to origin main automatically.
- Next.js rules in AGENTS.md.
- Maintain your plan.md, progress.md, and context.md in your working directory.
- Dispatch specialists, test comprehensively, and report back via send_message when victory is achieved.
