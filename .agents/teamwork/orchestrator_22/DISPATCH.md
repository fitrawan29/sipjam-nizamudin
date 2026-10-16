## 2026-10-16T11:33:02Z
From: 236419fa-353a-4138-bed7-f9c6fbac9d3f (Sentinel)
Subject: Project Orchestrator Assignment (orchestrator_22)

Mission & Requirements:
Implementasi dua fitur operasional esensial berprinsip Ponytail (zero-bloat, minimal diff, native first) pada SIPJAM:
(1) Notifikasi WhatsApp Orang Tua 1-Click via Native URI di Modul Piket dan Rekap Siswa, serta
(2) Auto-Save Draft Lokal & Ketahanan Offline pada Jurnal KBM dan Daftar Nilai (Gradebook).

### R1. Notifikasi WhatsApp Orang Tua 1-Click (PiketView & RekapSiswaView)
- Manfaatkan data `no_hp_ortu` yang sudah tersedia pada tabel `data_siswa` (tanpa membuat skema atau tabel baru).
- Tambahkan aksi 1-klik "Kirim WA ke Orang Tua" pada setiap baris siswa di:
  1. `src/components/PiketView.tsx` (khususnya tab Rekap Harian / Hasil Scan / Daftar Hadir Siswa).
  2. `src/components/RekapSiswaView.tsx` (khususnya tab Presensi Gerbang & Rekap Absen).
- Normalisasi nomor telepon standar Indonesia (`08...`, `+62...`, `62...`) menjadi format internasional murni tanpa karakter non-digit (`628...`).
- Bangun tautan langsung menggunakan native URI WhatsApp (`https://wa.me/{nomor}?text={encodedText}`) dengan pesan informatif dan sopan mencakup: nama siswa, kelas, tanggal, status kehadiran (Alpa, Bolos, Terlambat, Izin, Sakit), nama sekolah, dan catatan waktu.
- Jika `no_hp_ortu` siswa belum terdaftar, tampilkan dialog ramah (SweetAlert) yang memungkinkan guru/piket menginput nomor manual sementara atau menyalin teks pesan ke clipboard.

### R2. Auto-Save Draft Lokal & Ketahanan Koneksi Lemah (GradebookView & GuruJurnal)
- **Daftar Nilai (`GradebookView.tsx`)**:
  - Terapkan mekanisme auto-save debounce ke `localStorage` untuk perubahan nilai (`localScores`) berdasarkan kunci scoped (`sipjam_gradebook_draft_{sekolahId}_{mapel}_{kelas}_{tpId}`).
  - Jika halaman termuat dan terdeteksi draft nilai lokal yang belum tersimpan ke database, berikan notifikasi atau pulihkan secara otomatis dengan indikator "Draft Lokal Tersimpan".
  - Saat guru berhasil menekan "Simpan Semua Nilai" ke database Supabase, bersihkan draft lokal terkait.
- **Jurnal KBM (`GuruJurnal.tsx`)**:
  - Pertahankan draft formulir di `localStorage` jika pengiriman gagal akibat kendala jaringan (`!navigator.onLine` atau network error timeout).
  - Tampilkan indikator status draft yang jelas agar guru tahu ketikan mereka aman dan tidak hilang saat sinyal terputus.

## Verification & Acceptance Criteria
- Test suite verifikasi baru yang harus dibuat: `tests/whatsapp_parent_notify_and_autosave.test.ts`
  - Validasi normalisasi nomor HP (`0812...` -> `62812...`, spasi, strip, tanda kurung).
  - Validasi formatting pesan WhatsApp dan parameter encodeURIComponent.
  - Validasi siklus hidup storage draft (save, restore, clear on success) pada Gradebook dan Jurnal KBM.
- Verifikasi build & type safety: `npx tsc --noEmit` dan `npm run build`.
- Verifikasi git workflow sesuai `GEMINI.md` (git status, git add ., git commit -m "...", git push origin main).

## 2026-10-16T13:36:35Z
From: 236419fa-353a-4138-bed7-f9c6fbac9d3f (Sentinel)
Subject: Resume Execution ("lanjutkan")

User instruction received: "lanjutkan". Please resume execution:
1. Check and resolve any remaining gate findings (specifically, ensure `GuruJurnal.tsx` retains the literal key `sipjam_jurnal_autosave` for compatibility with `tests/four_ponytail_improvements.test.ts`).
2. Verify all test suites (`npm test`), static typecheck (`npx tsc --noEmit`), and production build (`npm run build`).
3. Complete git workflow according to GEMINI.md (git status, git add ., git commit -m "...", git push origin main).
4. Write your final `handoff.md` and report project completion.
