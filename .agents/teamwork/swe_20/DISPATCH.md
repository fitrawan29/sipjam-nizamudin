# DISPATCH — swe_20

## Identity & Role
- **Agent Type**: `teamwork_preview_swe` (SWE Light Orchestrator)
- **Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_20`
- **Parent Sentinel**: Sentinel (`87d0f8d6-b4cc-401a-8e9e-375ba4f67b0d`)
- **Authoritative Request**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- **Project Root**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Mission
Hapus dan bersihkan seluruh fitur, tab, dan modal usang (*obsolete*) pada role Superadmin yang sudah tidak diperlukan lagi akibat transisi ke arsitektur **Jaringan Sekolah Satelit & Multi-School Switcher**.

## Requirements

### R1. Remove Obsolete "Kelola Sekolah" & "Admin Sekolah" Tabs
- Hapus tab **"Kelola Sekolah"** (`sekolah`) dan **"Admin Sekolah"** (`admins`) dari navigasi tab di `src/components/SuperadminView.tsx`.
- Hapus menu navigasi `view-superadmin-sekolah` dan `view-superadmin-admins` dari `menuItemsSuperadmin` di `src/components/AppScreen.tsx`.
- Struktur navigasi Superadmin disederhanakan menjadi 2 tampilan utama yang relevan:
  1. **Ringkasan Platform** (`overview`)
  2. **Jaringan Sekolah** (`jaringan`)

### R2. Strip Redundant Legacy Modals & Handlers
- Hapus modal dan handler pembuatan sekolah lokal lama (`showAddSchoolModal`, `showEditSchoolModal`, `handleToggleSchoolStatus`) yang menyisipkan data langsung ke `public.sekolah` lokal.
- Hapus modal dan handler pembuatan akun admin lokal lama (`showAddAdminModal`, `showEditAdminModal`, `handleResetAdminPassword`) yang memanipulasi `public.users` lokal.
- Hapus seluruh state dan filter yang tidak lagi digunakan (`adminList`, `adminSearch`, `cityFilter`, `statusFilter`).

### R3. Align Overview Tab to Jaringan Sekolah
- Sesuaikan kartu statistik dan widget aksi cepat pada tab **Overview** di `src/components/SuperadminView.tsx` agar merujuk ke data **Jaringan Sekolah Satelit** (`satelliteSchools`), status koneksi live database, serta total guru & siswa lintas jaringan.
- Ganti pintasan "Buat Akun Admin Sekolah" dan "Kelola Daftar Sekolah" dengan pintasan langsung ke "Tambah Sekolah Satelit" dan "Periksa Status Live Database".

## Acceptance Criteria

### Functional Verification
- [ ] Di dashboard Superadmin (`SuperadminView.tsx`), hanya terdapat 2 tab bersih: **Ringkasan Platform** dan **Jaringan Sekolah**.
- [ ] Di menu sidebar/drawer Superadmin (`src/components/AppScreen.tsx`), menu "Kelola Sekolah" dan "Admin Sekolah" sudah tidak ada lagi.
- [ ] Tab Overview menampilkan ringkasan data satelit yang akurat tanpa mengacu ke tabel admin/sekolah lokal lama.
- [ ] Pengelolaan sekolah satelit (tambah, edit, hapus, live ping, dan switch target) di tab "Jaringan Sekolah" tetap berfungsi 100% normal tanpa regresi.

### Programmatic & Quality Verification
- [ ] Seluruh suite pengujian otomatis lulus (`npm test`).
- [ ] Lolos verifikasi tipe TypeScript tanpa error (`npx tsc --noEmit`).
- [ ] Lolos build produksi Next.js secara bersih (`npm run build`).
- [ ] Perubahan di-stage, di-commit dengan pesan deskriptif, dan di-push ke branch `main` per `GEMINI.md`.

## Execution Protocol
- Run the SWE Light loop: dispatch implementer, then run reviewer rounds.
- Maintain `progress.md` and `BRIEFING.md` in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_20`.
- Once verified, write `handoff.md` and report completion back to the Sentinel.
