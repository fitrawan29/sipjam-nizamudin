## 2026-10-04T07:15:18Z
You are an Explorer subagent (explorer_survey_1).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1

Read ORIGINAL_REQUEST.md at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (specifically the latest request at the bottom, 2026-10-04T07:11:46Z).

Your objective is technical survey for:
1. R1: Akses Modul Piket Sesuai Jadwal
   - Modul Piket (QR & Manual) hanya muncul di menu sidebar dan dapat diakses jika Guru bertugas piket hari ini.
   - Cek database jadwal piket / penugasan piket / tugas tambahan guru: tabel apa yang digunakan (`penugasan_piket`, `jadwal_piket`, etc.), kolom apa saja, bagaimana cara query hari ini (misal hari Senin-Minggu atau tanggal spesifik).
   - Periksa `AppScreen.tsx` dan modul navigasi/routing: bagaimana menu item dirender (`menuItemsGuru`, `menuItemsAdmin`), bagaimana routing ke view `view-piket` atau `PiketView.tsx` dibatasi/diblokir jika guru bukan piket hari ini.
   - Pastikan Admin dan Superadmin tetap punya akses penuh tanpa terpengaruh filter hari ini.

2. R2: Pembatasan Rekapitulasi Presensi untuk Wali Kelas & Akses Guru Mapel
   - Rekapitulasi kehadiran siswa menyeluruh (QR / Piket / RekapSiswaView) HANYA boleh diakses oleh Wali Kelas untuk kelas binaannya saja.
   - Periksa bagaimana Wali Kelas diidentifikasi di database (`data_guru`, `kelas`, `wali_kelas`, dsb.).
   - Periksa `RekapSiswaView.tsx` dan `AppScreen.tsx`: bagaimana menu 'view-rekap-siswa' atau tab rekap dibatasi di sidebar dan komponen agar hanya Wali Kelas yang bisa membuka, dan kelas yang dipilih terkunci ke kelas binaannya.
   - Periksa `GuruJurnal.tsx`: bagaimana Guru Mapel melihat presensi siswa pada kelas & mapel yang sedang diampu hari ini. Pastikan akses Guru Mapel pada sesi jurnalnya tetap berfungsi penuh dan tidak terblokir.

Scope boundaries:
- DO NOT edit or modify source code files. You are an exploratory read-only agent.
- Output your comprehensive findings and implementation recommendation in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1\handoff.md`.
- Send a message to parent when finished.
