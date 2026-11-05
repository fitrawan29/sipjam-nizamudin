# Handoff Report: Reviewer Round 3 — Sub Menu Pengguna & Kredensial Guru (Admin)

**Reviewer:** Teamwork Reviewer (Round 3)  
**Date & Timestamp:** 2026-11-06T06:47:00Z  
**Branch:** main  
**Target Parent ID:** 0aa00ea1-9c92-421d-8e45-73f63b5e510d  

---

## 1. Executive Summary & Verdict
Pada peninjauan adversarial Round 3, ditemukan 6 celah kritis dan perbaikan fungsional mendalam pada implementasi sub menu Pengguna, sinkronisasi kredensial otomatis guru, dan integrasi antar komponen:

1. **Self-Collision False Positive pada Pembaruan Password Guru tanpa `userId` (`teacherUserSync.ts`)**:
   - Jika admin memperbarui kata sandi akun guru yang belum memiliki `userId` di state memori tanpa mengubah username (`oldUsername === newUsername`), fungsi `updateTeacherCredentials` sebelumnya menjalankan query keunikan username sebelum meresolusi identitas pengguna. Query tersebut menemukan akun guru itu sendiri dan secara keliru membatalkan operasi dengan pesan error *"Username sudah digunakan oleh akun lain!"*.
   - Telah diperbaiki dengan menyelesaikan resolusi `userId` terlebih dahulu dari `oldUsername` atau lookup `data_guru`, kemudian menyertakan filter `.neq('id', userId)` pada query keunikan.
2. **Desinkronisasi dan Duplikasi Akun Akibat Format NIP Input Modal (`teacherUserSync.ts`)**:
   - Jika admin menginputkan NIP berformat (misal `19850101-201001-1-001` atau `1985.01.01.2010.01.1.001`) pada modal ubah username, `updateTeacherCredentials` sebelumnya menyimpan string bertanda hubung/titik mentah tersebut ke tabel `users`.
   - Hal ini menyebabkan `syncTeacherAccounts` gagal mencocokkan akun target (karena `resolveTeacherUsername` menormalisasi NIP ke digit murni `198501012010011001`), serta menghasilkan password default yang tidak cocok. Kini dinormalisasi secara kanonikal ke digit angka murni jika memenuhi pola 8-25 digit NIP.
3. **Penyusupan Apostrof Excel & Karakter Kutip pada NIP (`dataIntegrityGuard.ts`)**:
   - NIP yang diekspor/diimpor dari Microsoft Excel seringkali memiliki apostrof awal (`'198501012010011001`) atau tanda kutip ganda (`"198501012010011001"`) agar tidak terkonversi ke notasi ilmiah (`1.98501E+17`).
   - Karakter kutip ini sebelumnya lolos ke `resolveTeacherUsername` dan `getDefaultTeacherPassword`, menggagalkan regex digit dan menghasilkan password cacat seperti `'19850101201001100127`. Telah ditambahkan sanitasi kutip `.replace(/^['"]+|['"]+$/g, '')`.
4. **Kegagalan Resolusi Akun pada Reset Password Mandiri Ber-Username Custom (`teacherUserSync.ts`)**:
   - Pada `resetTeacherPasswordToDefault`, jika `userId` tidak disertakan dan guru memiliki username kustom (misal `guru_fisika`), sistem sebelumnya hanya mencari berdasarkan `resolveTeacherUsername(nip, nama)` sehingga gagal menemukan akun dan membuat akun duplikat baru. Kini diprioritaskan pencarian berdasarkan `params.username` eksisting terlebih dahulu.
5. **Normalisasi NIP pada Edit Guru di Master Data (`AdminDataView.tsx`)**:
   - Ketika admin mengubah NIP guru di tab Guru (`data_guru`), pembaruan ke tabel `users` sebelumnya langsung meneruskan `formValues.nip` mentah tanpa `resolveTeacherUsername`. Kini diselaraskan menggunakan `resolveTeacherUsername` agar username `users` selalu kanonikal.
6. **Checkbox Sinkronisasi NIP Modal Pengguna Otomatis Aktif untuk NIP Berformat (`AdminPenggunaView.tsx`)**:
   - Checkbox "Sinkronkan username ke NIP di Data Guru" sebelumnya menggunakan regex kaku `/^\d{8,25}$/` pada raw `item.nip`, sehingga NIP berformat tanda hubung atau titik muncul dalam kondisi unchecked. Telah diperbaiki dengan menormalkan karakter pemisah sebelum pengecekan regex.
7. **Sinkronisasi Tab Parameter URL pada Pergantian Tab Master Data (`AdminDataView.tsx`)**:
   - Menambahkan `window.history.replaceState` pada event pergantian tab di `AdminDataView` agar parameter query `?view=view-admin-data&tab=Pengguna` tersinkronisasi secara reaktif dengan sidebar dan histori navigasi browser.

---

## 2. Issues Discovered and Root Cause Analysis

### Issue 1: False Positive Self-Collision on Password-Only Update
- **Input:** Admin memperbarui password guru yang belum memiliki `userId` tanpa mengubah username (`oldUsername: '198501012010011001'`, `newUsername: '198501012010011001'`, `newPassword: 'MyNewPassword123!'`).
- **Expected:** Password berhasil diperbarui tanpa error tabrakan.
- **Actual:** Mengembalikan `{ success: false, message: 'Username "198501012010011001" sudah digunakan oleh akun lain!' }`.
- **Root Cause:** Pemeriksaan keunikan username dieksekusi sebelum `userId` dicari dari `oldUsername`, sehingga akun pengguna sendiri terdeteksi sebagai "akun lain".
- **Fix:** Resolusi `userId` dilakukan di awal alur fungsi sebelum query keunikan dieksekusi dengan `.neq('id', userId)`.

### Issue 2: Modal Username Formatted NIP Desync
- **Input:** Admin memasukkan NIP berformat strip/titik `19850101-201001-1-001` pada modal kredensial.
- **Expected:** Username dinormalisasi ke digit kanonikal murni `198501012010011001`.
- **Actual:** Disimpan sebagai string bertanda strip mentah, memicu ketidakcocokan dengan `resolveTeacherUsername` dan duplikasi saat sinkronisasi background.
- **Root Cause:** `updateTeacherCredentials` tidak memiliki normalisasi format NIP berdigit 8-25.
- **Fix:** Normalisasi `digitsOnly` diaktifkan untuk pola NIP 8-25 digit di `updateTeacherCredentials`.

### Issue 3: Excel Apostrophe Punctuation Leak
- **Input:** Guru dengan NIP ber-apostrof Excel `'198501012010011001`.
- **Expected:** Dikenali sebagai NIP murni, password default `19850101201001100127`.
- **Actual:** Apostrof terbawa ke username dan password default (`'19850101201001100127`).
- **Root Cause:** Hilangnya sanitasi kutip `replace(/^['"]+|['"]+$/g, '')` pada `resolveTeacherUsername` dan `getDefaultTeacherPassword`.
- **Fix:** Ditambahkan pembersihan kutip di `dataIntegrityGuard.ts`.

---

## 3. Files Modified
1. `src/lib/dataIntegrityGuard.ts`:
   - Menambahkan sanitasi apostrof Excel dan tanda kutip ganda (`replace(/^['"]+|['"]+$/g, '')`) pada `getDefaultTeacherPassword` dan `resolveTeacherUsername`.
2. `src/lib/teacherUserSync.ts`:
   - Normalisasi format NIP (strip/titik/kutip) pada `updateTeacherCredentials`.
   - Resolusi awal `userId` sebelum pemeriksaan keunikan untuk mencegah false positive tabrakan diri sendiri.
   - Pengecekan `params.username` pada alur self-healing `resetTeacherPasswordToDefault`.
   - Konsistensi `defaultPassword` pada `accounts.push` di `syncTeacherAccounts`.
3. `src/components/AdminPenggunaView.tsx`:
   - Normalisasi format NIP pada status inisial checked checkbox `swal-sync-nip`.
4. `src/components/AdminDataView.tsx`:
   - Menyelaraskan sinkronisasi username guru saat update data guru menggunakan `resolveTeacherUsername`.
   - Menambahkan `window.history.replaceState` untuk sinkronisasi URL query parameter saat pergantian tab master data.
5. `tests/admin_submenu_pengguna_kredensial_guru.test.ts`:
   - Menambahkan 5 pengujian adversarial baru (3.14 s.d. 3.18) yang memvalidasi eliminasi apostrof Excel, pencegahan self-collision tanpa `userId`, normalisasi NIP berformat pada input modal, reset password username custom, dan checkbox state.

---

## 4. Verification Record
- **Automated Tests:**
  - `npx tsx tests/admin_submenu_pengguna_kredensial_guru.test.ts`: **28/28 checks PASSED** (100%).
  - `npm test`: **53 Suites Executed | 53 PASSED | 0 FAILED** (100%).
- **Production Build:**
  - `npm run build`: Compiled successfully in 1.9s, Finished TypeScript in 1.7s, Generating static pages (13/13) in 1471ms. 0 errors, 0 warnings.

---

## 5. Known Issues & Remaining Risk
- **Shallow Verification**: Interaksi visual pop-up SweetAlert2 diuji melalui simulasi DOM komprehensif pada testing environment.
- **Deep Verification**: Seluruh 53 test suites dan 28 checks spesifik fitur ini telah terverifikasi lulus 100% tanpa regresi.
