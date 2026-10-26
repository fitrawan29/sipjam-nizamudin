# Project Orchestrator Assignment (orchestrator_25)

## Identity & Workspace
- Identity: Project Orchestrator (orchestrator_25)
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_25
- Authoritative Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

## Mission & Requirements
Restorasi layout, header, dan sidebar asli Superadmin (termasuk dropdown switcher satelit di navbar atas dan seluruh menu operasional sekolah) serta mempertahankan integrasi role `dinas_pendidikan` (manajemen wilayah oleh Superadmin & dashboard monitoring read-only) secara rapi dan non-destruktif, dengan pengiriman otomatis ke branch `dev`.

Working directory: c:/Users/Fitra/OneDrive/Documents/sipjam-app
Integrity mode: development

### Requirements

#### R1. Restorasi Navbar & Header Asli Superadmin
Kembalikan navbar header asli SIPJAM yang bersih dan fungsional:
1. Label logo SIPJAM Superadmin / Sekolah.
2. Dropdown switcher satelit "Ganti Sekolah yang Dipantau" (`🌐 Master Platform` / daftar sekolah) langsung pada header navbar.
3. Tombol notifikasi pengumuman, avatar profil dengan popup, toggle tema, dan tombol merah "Keluar".
4. Menghilangkan styling asing (claymorphism `#FDF6EC`) pada header agar kembali selaras dengan tema asli SIPJAM.

#### R2. Restorasi Sidebar Asli & Menu Operasional Superadmin
Kembalikan sidebar overlay asli SIPJAM yang menampilkan:
1. Header portal "Portal Superadmin" dengan ikon mahkota.
2. Kartu identitas pengguna (avatar, nama, badge role Superadmin).
3. Dropdown switcher sekolah satelit di dalam sidebar.
4. Menu navigasi lengkap:
   - `Ringkasan Platform` (`view-superadmin-overview`)
   - `Jaringan Sekolah` (`view-superadmin-jaringan`)
   - `Akun Dinas Pendidikan` (`view-superadmin-dinas`)
   - Menu operasional lengkap saat sekolah satelit dipilih: Master Data, Verifikasi, Rekap Presensi, Presensi Siswa, Analitik Satelit, dan Sistem Satelit.
5. Tombol Pengaturan Akun (`AccountSettingsModal`), Panduan & Tutorial Lengkap (`TutorialModal`), dan Tutorial Interaktif.

#### R3. Harmonisasi Tab di SuperadminView
Pastikan komponen `SuperadminView` menyajikan 3 tab horizontal berdampingan secara rapi dan responsif:
1. `Ringkasan Platform` (Overview metrik platform satelit).
2. `Jaringan Sekolah` (Manajemen dan monitoring status instance satelit).
3. `Akun Dinas Pendidikan` (Pembuatan akun dinas dan penugasan `kota_kabupaten` daerah binaan).
Semua tab tersinkronisasi mulus dengan route `?view=view-superadmin-*`.

#### R4. Preservasi Fungsionalitas Role Dinas Pendidikan
Pastikan penambahan fitur Dinas Pendidikan tetap stabil dan terisolasi:
1. User dengan role `dinas_pendidikan` login langsung ke `view-dinas-overview`.
2. Terkunci strictly read-only pada daerah binaan (`kota_kabupaten`) yang ditetapkan Superadmin.
3. Fitur drilldown detail sekolah binaan dan cetak dokumen resmi ber-GPS tetap berfungsi normal.
4. Tidak merusak atau mengubah hak akses akun Guru, Admin, maupun Superadmin.

#### R5. Automated Verification, Clean Build & Git Delivery
1. Seluruh test suite otomatis lolos (`npx tsx tests/dinas_pendidikan_monitoring.test.ts` dan `npm test`).
2. Typecheck (`npx tsc --noEmit`) dan build (`npm run build`) sukses tanpa error.
3. Staging (`git add .`), commit pesan deskriptif, dan push ke branch pengembangan: **`git push origin dev`**. STRICT: DO NOT push or merge to main.

### Acceptance Criteria

#### Restored Superadmin UI & Features
- [ ] Dropdown switcher sekolah satelit muncul dan berfungsi di navbar atas Superadmin.
- [ ] Sidebar asli Superadmin kembali lengkap dengan kartu profil, pengaturan akun, tutorial, serta daftar menu operasional sekolah satelit saat target school aktif.
- [ ] Tab "Akun Dinas Pendidikan" hadir berdampingan rapi bersama tab "Ringkasan Platform" dan "Jaringan Sekolah" di SuperadminView.

#### Intact Dinas Pendidikan Functionality
- [ ] Superadmin dapat mengelola akun dinas dan menetapkan wilayah penugasan tanpa error.
- [ ] Akun dinas dapat login, melihat agregat wilayahnya, drilldown, dan cetak laporan resmi secara read-only.

#### Quality Verification & Git Delivery
- [ ] `tests/dinas_pendidikan_monitoring.test.ts` lolos 100% (25/25 assertions).
- [ ] `npx tsc --noEmit` & `npm run build` sukses 0 error.
- [ ] Seluruh perubahan ter-push ke branch **`dev`** (`git push origin dev`).
