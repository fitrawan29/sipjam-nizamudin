# Handoff Report: Sub Menu Pengguna & Manajemen Kredensial Guru (Admin)

**Implementer:** Teamwork Implementer  
**Timestamp:** 2026-11-06T06:04:00Z  
**Branch:** main  

---

## 1. Executive Summary
Fitur penambahan sub menu "Pengguna" di bawah menu Master Data & Kalender pada role Admin telah berhasil diimplementasikan end-to-end. Fitur ini secara otomatis menarik seluruh akun guru dari tabel `data_guru` ke tabel `users` dengan kredensial default username sesuai NIP dan password berupa NIP27 (`${nip}27`). Admin dapat mengelola, melihat daftar, serta memperbarui username dan password setiap akun guru, maupun mereset kata sandi ke default NIP27. Seluruh automated test suite (52 suites) dan production build Next.js lulus 100%.

---

## 2. Requirements & Acceptance Criteria Verification

### R1. Sub Menu Pengguna pada Menu Master Data dan Kalender
- [x] **Navigasi Sidebar Admin**: Sub menu "Pengguna" muncul langsung di bawah menu "Master Data & Kalender" saat login sebagai Administrator/Superadmin (`ClaySidebar.tsx` dan `AppScreen.tsx`).
- [x] **Sub-Tab Master Data**: Tab "Pengguna" muncul di jajaran tab Master Data (`AdminDataView.tsx`).
- [x] **Isolasi Non-Admin**: Non-admin (Guru, Siswa, Dinas Pendidikan, Kepala Sekolah) tidak dapat melihat sub menu di sidebar dan dicegah mengakses route/tab melalui `evaluateTabRBAC` serta component guards.
- [x] **Routing & Canonical Resolution**: Route alias `view-admin-pengguna`, `view-pengguna`, dan `view-admin-users` secara mulus dipetakan ke `view-admin-data` dengan `defaultTab: 'Pengguna'`.

### R2. Penarikan Otomatis Akun dari Data Guru
- [x] **Sinkronisasi Otomatis**: Fungsi `syncTeacherAccounts` menarik seluruh data dari `data_guru` untuk sekolah terkait dan mendaftarkannya ke tabel `users` dengan role `'Guru'`.
- [x] **Kredensial Default**: Username awal diset sesuai NIP guru (atau slug nama jika NIP `-`), dan password default otomatis diformat menjadi `${nip}27` (NIP27).
- [x] **Preservasi Akun Lama**: Akun yang sudah ada tidak ditimpa kata sandinya secara sepihak.
- [x] **Registrasi Guru Baru**: Penambahan guru baru lewat modal Master Data Guru maupun impor CSV `data_guru` secara otomatis mendaftarkan akun di `users` dengan username NIP dan password NIP27.

### R3. Manajemen Kredensial Pengguna oleh Admin
- [x] **Antarmuka Manajemen Pengguna**: Komponen `AdminPenggunaView.tsx` menyediakan antarmuka lengkap dengan metrik ringkas, pencarian data, filter mapel/status, serta tombol sinkronisasi ulang.
- [x] **Pembaruan Kredensial**: Admin dapat mengubah username dan password guru melalui modal SweetAlert2. Perubahan disimpan ke tabel `users` dan disinkronkan ke `data_guru.nip`.
- [x] **Reset Cepat NIP27**: Tersedia tombol shortcut untuk mereset kata sandi guru kembali ke default `${nip}27`.
- [x] **Kompatibilitas Login**: Password plaintext maupun bcrypt hash didukung oleh RPC `verify_login` sehingga guru dapat langsung login setelah kredensial diperbarui atau direset oleh admin.

### R4. Integritas dan Non-Regresi Fitur Eksisting
- [x] Semua tab Master Data sebelumnya (Siswa, Guru, Mapel, Kalender, Jadwal, Periode Sistem Blok, Wali Kelas) berfungsi normal tanpa regresi.
- [x] 52 test suites di dalam `npm test` lulus 100% (0 gagal).
- [x] `npm run build` berhasil dikompilasi tanpa error TypeScript maupun Turbopack.

---

## 3. Files Modified and Created

### Created Files:
1. `src/lib/teacherUserSync.ts`
   - Modul helper penarikan dan sinkronisasi akun guru ke `users`.
   - Logika penentuan default password `${nip}27`.
   - Fungsi `syncTeacherAccounts`, `updateTeacherCredentials`, dan `resetTeacherPasswordToDefault`.
2. `src/components/AdminPenggunaView.tsx`
   - Komponen UI Claymorphism untuk sub menu Pengguna di Master Data.
   - Tabel akun guru dengan avatar, nama, NIP, username login, indikator password default, mapel, dan status.
   - Modal interaktif SweetAlert2 untuk pengaturan kredensial dan konfirmasi reset password.
3. `tests/admin_submenu_pengguna_kredensial_guru.test.ts`
   - Test suite komprehensif menguji 14 assertions mencakup navigasi, RBAC, sinkronisasi otomatis, format password NIP27, update kredensial, dan validasi login.

### Modified Files:
1. `src/lib/navigation.ts`
   - Menambahkan properti opsional `subItems?: MenuItem[]` pada interface `MenuItem`.
   - Menambahkan subItems `view-admin-pengguna` pada item `view-admin-data` untuk admin & superadmin.
   - Mendaftarkan alias `view-admin-pengguna`, `view-pengguna`, `view-admin-users` ke `VIEW_ALIASES`.
   - Menambahkan `view-admin-pengguna` ke `evaluateTabRBAC` untuk memblokir non-admin.
2. `src/components/AdminDataView.tsx`
   - Mendaftarkan tab `Pengguna` di jajaran tabs Master Data & Kalender.
   - Merender `<AdminPenggunaView user={user} />` saat tab `Pengguna` aktif.
   - Menangani `initialTab` bernilai `'Pengguna'` / `'pengguna'` / `'users'`.
   - Menambahkan auto-create akun user di tabel `users` saat guru baru ditambahkan via modal Master Data Guru.
3. `src/components/ClaySidebar.tsx`
   - Memperbarui interface `MenuItem` lokal dengan `subItems?: MenuItem[]`.
   - Menambahkan render sub menu item untuk item dengan `subItems` khusus role Administrator / Superadmin.
4. `src/components/AppScreen.tsx`
   - Menambahkan render sub menu Pengguna di sidebar inline navigasi untuk role Administrator.
   - Menambahkan `view-admin-pengguna` pada guard navigasi admin-only dan guard read-only Dinas Pendidikan.
5. `src/lib/dataIntegrityGuard.ts`
   - Menambahkan auto-sync pembuatan akun user guru saat data guru diimpor melalui CSV.
   - Dilengkapi safe inspection check untuk kompatibilitas mock client testing.
6. `package.json`
   - Menambahkan `tests/admin_submenu_pengguna_kredensial_guru.test.ts` ke dalam runner `npm test`.

---

## 4. Verification Evidence

### Build Output:
```
▲ Next.js 16.3.4 (Turbopack)
✓ Compiled successfully in 1952ms
✓ Finished TypeScript in 2.5s
✓ Generating static pages (13/13) in 1029ms
```

### Automated Test Suite:
```
╔══════════════════════════════════════════════════════════════════════╗
║   SUB MENU PENGGUNA & KREDENSIAL GURU OTOMATIS VERIFICATION SUITE    ║
╚══════════════════════════════════════════════════════════════════════╝
TOTAL CHECKS: 14 | PASSED: 14 | FAILED: 0

Full npm test runner: 52 Suites Executed | 52 PASSED | 0 FAILED
```
