# Orchestrator Dispatch: Sipjam Bug Fixes & Feature Enhancements

## Identity & Workspace
- Subagent: `orchestrator_6`
- Type: `teamwork_preview_orchestrator`
- Working Directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_6`
- Original Request File: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (Refer to section `## 2026-10-01T10:56:44Z`)
- Project Working Directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Architectural & Design Principles
- **Ponytail Principle**: Implement the simplest, most minimal, cleanest solution that solves each requirement without over-engineering or speculative abstraction.
- **Git Workflow (GEMINI.md mandatory)**: When all work is done and verified, check git status (`git status`), stage changed files (`git add .`), commit with descriptive message (`git commit -m "..."`), and push to origin (`git push origin main` or current branch).
- **Next.js Guidelines (AGENTS.md mandatory)**: Consult documentation in `node_modules/next/dist/docs/` if modifying Next.js specific files/APIs.

## Detailed Requirements & Scope

### R1. Perbaikan Data Ganda (Merge Account)
- Buat script SQL satu kali jalan (misal: `merge_accounts.sql` atau di folder migrations/scripts/supabase).
- Script SQL harus menggabungkan akun "Ade Fitrawan Ibrahim" dan "Ade Fitrawan Ibrahim, M.Pd., Gr" secara langsung di database.
- Cek dan pertahankan akun dengan riwayat transaksi terbanyak (presensi, jurnal, dll).
- Lakukan UPDATE / re-assign data foreign keys dari akun duplikat ke akun utama, kemudian DELETE akun duplikat.
- Script harus aman, idempotent jika memungkinkan, dan terdokumentasi dengan baik.

### R2. Perbaikan Avatar
- Pada komponen profil pengguna (dan komponen avatar terkait di header/sidebar jika ada), pastikan saat avatar dipilih atau diunggah, gambar profil langsung diperbarui dan terlihat pada UI tanpa perlu memuat ulang (reload) halaman secara manual.
- State di React (dan context jika ada) harus di-update segera setelah mendapatkan respon sukses dari upload/update avatar.

### R3. Izin Datang Terlambat (Guru)
- Tambahkan opsi/status "Izin Terlambat" pada pilihan / tombol absensi di halaman presensi guru (misal `GuruPresensi.tsx` atau komponen presensi terkait).
- Pastikan backend endpoint presensi (API route atau Supabase table) dapat menerima dan menyimpan status "Izin Terlambat".
- Validasi tampilan UI dan rekap agar menangani status baru ini dengan benar.

### R4. Upload Foto Jurnal Pembelajaran
- Sediakan opsi tambahan pada form Jurnal Pembelajaran untuk mengunggah foto dari file/galeri (selain atau melengkapi camera langsung jika ada).
- Sistem harus menangkap lokasi GPS dari device via browser (`navigator.geolocation.getCurrentPosition`) saat proses upload dilakukan.
- Simpan data lokasi (latitude, longitude) serta waktu upload ke database / payload jurnal dan tampilkan di UI jika relevan.

### R5. Pembatasan Pengaturan Username
- Kunci kemampuan untuk mengubah username milik guru di aplikasi.
- Pastikan hanya pengguna dengan role Admin (`role === 'admin'` atau setara) yang memiliki izin untuk mengubah username guru.
- Validasi baik pada UI (form/input disabled/hidden jika bukan admin) maupun pada backend/guard sebelum update dieksekusi.

### R6. Pengaturan Fitur Per-Sekolah (Superadmin)
- Di halaman "Edit Sekolah" (School Management untuk Superadmin), tambahkan opsi input (checkbox/dropdown) untuk mengatur mode Jurnal Pembelajaran:
  - Mode 1: "Live Camera Langsung" saja
  - Mode 2: "Live Camera + Upload Foto"
- Simpan konfigurasi ini pada data sekolah di database.
- Pada halaman Jurnal Pembelajaran guru, baca konfigurasi sekolah dari pengguna yang login: render opsi file upload HANYA JIKA konfigurasi sekolah mengizinkannya.

## Acceptance Criteria (Objective Verification Rubric)
1. **Verifikasi R1 (Merge Account)**:
   - Terdapat file script SQL (misal: `merge_accounts.sql`) yang berisi query UPDATE untuk memindahkan foreign keys dan query DELETE untuk menghapus akun duplikat.
2. **Verifikasi R2 (Avatar)**:
   - Terdapat kode di komponen profil yang memperbarui state segera setelah respon sukses dari upload avatar, sehingga gambar langsung berubah tanpa reload halaman.
3. **Verifikasi R3 (Izin Terlambat)**:
   - Tombol/opsi absensi memiliki pilihan bernilai "Izin Terlambat".
   - Backend endpoint presensi dapat menerima dan menyimpan status "Izin Terlambat".
4. **Verifikasi R4 (Upload Jurnal GPS)**:
   - Terdapat penggunaan API `navigator.geolocation.getCurrentPosition` pada fungsi upload jurnal via galeri.
   - Payload request ke backend menyertakan latitude dan longitude.
5. **Verifikasi R5 (Username Edit Limit)**:
   - Terdapat pengecekan kondisi `role === 'admin'` (atau setara) sebelum form edit username dirender di UI ATAU sebelum update dieksekusi di backend.
6. **Verifikasi R6 (Pengaturan Sekolah)**:
   - UI form Edit Sekolah memiliki input untuk mode Jurnal (Live Camera / Camera + Upload).
   - Halaman Jurnal membaca konfigurasi sekolah pengguna yang sedang login dan merender input file upload HANYA JIKA konfigurasinya mengizinkan.
7. **Kualitas & Stabilitas**:
   - TypeScript checking lolos (`npx tsc --noEmit`).
   - Unit/integration test (Vitest/Jest) ditambahkan/diperbarui untuk memverifikasi fitur R1-R6.
   - Build produksi (`npm run build`) berhasil tanpa error.
   - Otomatis `git add . && git commit -m "..." && git push origin main` setelah selesai.

## Instructions
1. Buat direktori subagent Anda di `.agents/teamwork/orchestrator_6/`.
2. Kelola file `plan.md` dan `progress.md` secara berkala.
3. Delegasikan tugas ke subagent spesialis (misal `teamwork_preview_explorer`, `implementer`/`worker`, `reviewer`/`challenger`).
4. Pastikan semua acceptance criteria teruji dan terverifikasi secara ketat.
5. Laporkan hasil akhir kepada Sentinel setelah seluruh pekerjaan tuntas.
