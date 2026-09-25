# Original User Request

## 2026-09-24T11:41:13Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full Team

Modifikasi dan penambahan fitur pada aplikasi SIPJAM (Next.js) berdasarkan 12 poin penyesuaian yang mencakup perbaikan alur presensi, penyesuaian UI/UX, kompatibilitas Apple, perbaikan bug kamera, serta penambahan fitur pendukung.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: benchmark

## Requirements

### R1. Alur Presensi, Jurnal, dan Laporan Piket
- Jika presensi, jurnal, atau laporan piket ditolak admin, guru harus mengisinya kembali pada hari yang sama. Pengisian ulang ini akan me-reset data yang lama.
- Kirimkan notifikasi kepada guru jika data mereka ditolak.
- Jika guru tidak melakukan pengisian ulang hingga waktu presensi pulang ditutup, status mereka diubah menjadi alpa.
- Pada halaman verifikasi admin: Jika admin menolak data, tombol "Setujui" otomatis hilang, dan data yang ditolak tersebut otomatis dihapus dari daftar verifikasi.
- Tambahkan fitur peringatan (warning) bagi guru yang tidak melakukan presensi, tidak mengisi jurnal, dan tidak mengisi laporan piket masing-masing sebanyak 3 kali berturut-turut/akumulasi.

### R2. UI/UX dan Penyesuaian Tampilan
- Paksa user memberikan izin notifikasi saat membuka aplikasi dengan menampilkan modal/overlay penuh yang memblokir interaksi aplikasi sampai izin diberikan.
- Berikan animasi sebelum halaman login ditampilkan.
- Hilangkan teks "Multi-Tenant SaaS • Superadmin, Admin Sekolah & Guru" pada halaman login.
- Ubah nama aplikasi pada tab browser (title) menjadi "SIPJAM".
- Perbaiki kompatibilitas umum pada produk Apple (Safari/iOS), seperti memastikan UI tidak terpotong, scrolling lancar, dan masalah akses kamera di iPhone teratasi.

### R3. Fungsionalitas Tambahan dan Bug Fixes
- Perbaiki fitur akumulasi keterlambatan agar dapat terbaca dan diakumulasi dengan benar pada masing-masing akun guru.
- Perbaiki masalah kamera (bug saat user berganti dari kamera belakang ke kamera depan dan sebaliknya).
- Tambahkan opsi bagi guru untuk mengganti username dan password pada halaman akun mereka masing-masing.
- Tambahkan fitur filter (search bar umum dan filter dropdown spesifik per kolom) pada setiap bagian di menu master.

## Acceptance Criteria

### Pengujian Alur Presensi (Agent-as-judge)
- [ ] Buat pengujian mandiri atau skrip untuk mensimulasikan penolakan admin: Pastikan data ter-reset dan notifikasi masuk ke guru.
- [ ] Verifikasi bahwa jika tidak ada perbaikan data hingga jam pulang, status berubah menjadi alpa di database.
- [ ] Verifikasi UI admin: Saat status ditolak disubmit, baris data hilang dari daftar verifikasi dan tombol setujui tidak dapat di-klik lagi.
- [ ] Verifikasi bahwa peringatan 3x absen muncul sesuai dengan kondisi data (presensi, jurnal, laporan).

### Pengujian UI/UX & Kompatibilitas Apple (Agent-as-judge)
- [ ] Verifikasi (dapat melalui simulasi Playwright/Puppeteer) bahwa modal overlay notifikasi memblokir klik ke elemen lain di belakangnya.
- [ ] Verifikasi bahwa teks "Multi-Tenant SaaS..." sudah tidak ada di kode halaman login, dan title halaman adalah "SIPJAM".
- [ ] Verifikasi (manual review kode) bahwa API getUserMedia untuk kamera telah dilengkapi dengan constraint yang benar untuk mendukung peralihan kamera (facingMode) di Safari iOS tanpa freeze.

### Pengujian Fitur Tambahan (Agent-as-judge)
- [ ] Verifikasi bahwa fungsi ganti username dan password berhasil memperbarui kredensial di database (misal Supabase/DB terkait).
- [ ] Verifikasi bahwa akumulasi menit/jam keterlambatan dikalkulasi dengan benar di dashboard guru.
- [ ] Verifikasi bahwa menu master memiliki input pencarian teks dan minimal satu filter dropdown tambahan, dan datanya terfilter saat digunakan.

## 2026-09-25T15:49:46Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Small, focused team

This is a single self-contained fix; keep it small and focused.

This project involves implementing a series of UI/UX improvements across the Sipjam application based on a recent audit. The primary goals are replacing blocking SweetAlert modals with non-intrusive toasts, fixing destructive form resets in attendance, and making data tables responsive on mobile devices.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Non-Intrusive Notifications
Replace generic blocking `Swal.fire` (SweetAlert2) calls for success, info, and validation errors with non-intrusive Toast notifications (e.g., using `react-hot-toast` or similar) across the application (especially in `GuruPresensi.tsx`). Critical alerts (like confirmation to delete) may still use modals.

### R2. Preserving Form State
In `GuruPresensi.tsx`, prevent the automatic deletion of the user's uploaded photo/selfie when they toggle between different attendance types (`tipeAbsen` or `jenisPresensi`). If state must be cleared, implement a confirmation warning first.

### R3. Mobile-Responsive Tables
Refactor data-heavy tables in `AdminDataView.tsx`, `PiketView.tsx`, and `GradebookView` to be mobile-friendly. Either wrap them in horizontally scrollable containers (`overflow-x-auto whitespace-nowrap`) or convert the rows into a stacked "Card" layout on small screens.

## Acceptance Criteria

### UI Behavior Validation
- [ ] Programmatic/Visual Check: Submitting a successful attendance record triggers a non-blocking toast. The UI does not present a popup requiring an "OK" click to proceed.
- [ ] Programmatic/Visual Check: Toggling between "Datang" and "Pulang" in `GuruPresensi.tsx` after attaching a mock file does not erase the file state without explicit user confirmation.
- [ ] Programmatic/Visual Check: Tables in `PiketView.tsx` and `AdminDataView.tsx` scroll horizontally (or stack) when the viewport width is simulated to be < 640px, without causing horizontal layout overflow on the main body.

