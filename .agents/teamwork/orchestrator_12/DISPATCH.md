## 2026-10-04T01:13:54Z

You are the Project Orchestrator (orchestrator_12) for the SIPJAM multi-tenant application project.

Your assigned working directory is:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12

Your reference files:
- ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Project Root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Here is the verbatim user request:
```
Tambahkan konfigurasi mode presensi siswa per-sekolah yang dapat diatur oleh Superadmin di SIPJAM (Next.js + Supabase, multi-tenant): setiap sekolah dapat memilih antara mode **QR Code** (scan QR piket seperti yang baru diimplementasikan) atau mode **Manual** (guru piket cek hadir/tidak satu per satu dari daftar siswa). Mode yang dipilih otomatis mengubah tampilan modul Piket dan seluruh alur presensi siswa sekolah tersebut.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Integrity mode: development

## Requirements

### R1. Kolom Konfigurasi di Tabel Sekolah
Tambahkan kolom `mode_presensi_siswa` (enum atau TEXT dengan constraint: `'qr'` atau `'manual'`, default `'qr'`) pada tabel `public.sekolah` di Supabase via migration SQL. Kolom ini adalah sumber kebenaran tunggal mode presensi untuk setiap sekolah.

### R2. UI Pengaturan di Superadmin
Superadmin dapat mengubah `mode_presensi_siswa` per sekolah melalui panel kelola sekolah di `SuperadminView.tsx` — berupa toggle atau dropdown "Mode Presensi Siswa: QR Code / Manual". Perubahan langsung tersimpan ke DB.

### R3. Mode Manual — Daftar Hadir Satu per Satu di Piket
Ketika sekolah menggunakan mode `'manual'`, modul Piket (`PiketView.tsx`) menampilkan daftar seluruh siswa (per kelas, dapat difilter) dengan tombol/checkbox hadir datang dan hadir pulang yang dicentang satu per satu oleh guru piket — menggantikan tampilan tab scanner QR. Data tetap disimpan ke tabel `presensi_siswa` yang sama dengan kolom yang sama.

### R4. Mode QR — Tetap Seperti Sekarang
Ketika sekolah menggunakan mode `'qr'`, modul Piket tetap menampilkan tab scanner QR (kamera + USB HID) seperti yang sudah diimplementasikan. Tidak ada perubahan perilaku untuk mode ini.

### R5. Propagasi Mode ke Seluruh Alur Terkait
Komponen lain yang membaca/menampilkan data presensi siswa (`RekapSiswaView.tsx`, `GuruJurnal.tsx`) tidak perlu berubah perilaku — keduanya hanya membaca tabel `presensi_siswa` yang sama. Cukup pastikan tidak ada hardcode asumsi mode QR di luar `PiketView`.

## Acceptance Criteria

### Konfigurasi DB & Superadmin
- [ ] Migration SQL menambahkan kolom `mode_presensi_siswa` ke `public.sekolah`
- [ ] Superadmin dapat mengubah mode sekolah A ke `'manual'` dan sekolah B ke `'qr'` — perubahan tersimpan di DB
- [ ] Nilai default `'qr'` berlaku untuk sekolah yang belum dikonfigurasi

### Mode Manual di Piket
- [ ] Sekolah dengan mode `'manual'`: PiketView menampilkan daftar siswa + tombol/checkbox hadir (bukan scanner QR)
- [ ] Guru piket bisa tandai datang/pulang satu per satu, data tersimpan ke `presensi_siswa`
- [ ] Filter per kelas berfungsi

### Mode QR di Piket
- [ ] Sekolah dengan mode `'qr'`: PiketView tetap menampilkan scanner seperti sebelumnya
- [ ] Scanner kamera dan USB HID tetap berfungsi

### Build & Isolasi
- [ ] `tsc --noEmit` 0 error
- [ ] `npm run build` lulus
- [ ] Data multi-tenant terisolasi per `sekolah_id` — sekolah A tidak bocor ke B
```

CRITICAL REPOSITORY RULES:
1. GEMINI.md: Every time modifications are made to complete a task/feature, you MUST automatically:
   - git status
   - git add .
   - git commit -m "<descriptive message>"
   - git push origin main
   DO NOT push asking for permission, do it automatically.
2. AGENTS.md: Next.js breaking changes note in node_modules/next/dist/docs/.
