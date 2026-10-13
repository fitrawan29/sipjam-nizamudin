## 2026-10-13T11:26:12Z
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_swe19
Project root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

<original_task>
This is a single self-contained feature; keep it small and focused.

Bangun fitur **Portal Induk Jaringan Multi-Sekolah dengan Akses Superadmin Tunggal (Single Sign-On / School Switcher)** pada aplikasi SIPJAM. Fitur ini memungkinkan 1 akun Superadmin (1 username & password master) untuk login satu kali dan langsung memantau serta mengelola seluruh sekolah satelit tanpa perlu login berulang kali.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Unified Master Superadmin Authentication
Satu akun kredensial Superadmin (username: `superadmin` dengan master password) dapat mengautentikasi dan mengelola seluruh database sekolah satelit:
- Di portal pusat, Superadmin login satu kali.
- Sistem menyediakan dropdown / tombol **"Ganti Sekolah yang Dipantau"** di dashboard Superadmin.
- Saat berganti sekolah, client secara dinamis beralih ke instance Supabase sekolah yang dipilih tanpa memaksa user login ulang.

### R2. Central School Registry Management
Superadmin dapat mendaftarkan dan mengelola daftar sekolah satelit (ID, Nama Sekolah, NPSN, Kota/Kabupaten, Vercel Web URL, Supabase URL, dan Supabase Anon Key) secara terpusat di tabel pengaturan atau database registry dengan RLS ketat (hanya Superadmin yang bisa mengakses).

### R3. Tab "Jaringan Sekolah" pada SuperadminView
Tambahkan tab/menu navigasi baru bernama **"Jaringan Sekolah"** pada src/components/SuperadminView.tsx:
- Tampilan kartu/tabel daftar seluruh sekolah satelit yang terdaftar.
- Indikator status live database (Online / Ter-pause).
- Ringkasan metrik real-time per sekolah (jumlah guru aktif, jumlah siswa).
- Tombol aksi: **"Kelola Sekolah Ini"** (mengaktifkan mode pemantauan aktif untuk sekolah tersebut) dan **"Buka Web Vercel"** (membuka web sekolah di tab baru).
- Form modal untuk Tambah, Edit, dan Hapus Sekolah dari jaringan monitoring.

### R4. Dynamic Client-Side Scope Switching
Buat helper pada src/lib/supabaseClient.ts yang memungkinkan Superadmin beralih target koneksi Supabase (`activeTargetSchool`) secara dinamis di level browser (localStorage/memory context), sehingga komponen dashboard admin, guru, dan siswa dapat membaca dan memanipulasi data sekolah yang sedang dipilih secara real-time.

## Acceptance Criteria

### Functional Verification
- [ ] Superadmin login 1 kali di halaman portal dengan username `superadmin` dan password master.
- [ ] Di dashboard Superadmin, tersedia tab "Jaringan Sekolah" dan dropdown pemilih sekolah aktif.
- [ ] Memilih sekolah X otomatis mengubah konteks data yang ditampilkan ke database sekolah X tanpa error autentikasi.
- [ ] Superadmin dapat menambah sekolah baru (Nama, NPSN, URL Vercel, Supabase URL, Anon Key) dan data langsung tersimpan.
- [ ] Terdapat tombol satu-klik untuk membuka website sekolah di tab baru.
- [ ] Guru dan Admin lokal tidak dapat melihat atau mengakses fitur pergantian sekolah satelit ini (isolasi RBAC terjaga).

### Programmatic & Quality Verification
- [ ] Lolos verifikasi tipe TypeScript tanpa error sama sekali (`npx tsc --noEmit`).
- [ ] Lolos build produksi Next.js secara bersih tanpa warning fatal (`npm run build`).
- [ ] Mematuhi aturan Git Workflow proyek per `GEMINI.md` (otomatis stage, commit deskriptif, dan push ke branch `main`).
</original_task>

Conduct an independent post-victory audit (timeline, cheating detection, independent test execution) across the implementation. Verify all requirements and acceptance criteria, check git log/diff, run `npx tsc --noEmit`, `npm test`, and `npm run build`, and provide your structured verdict.
