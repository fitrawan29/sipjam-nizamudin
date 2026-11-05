# Handoff Report: Reviewer Round 2 — Sub Menu Pengguna & Kredensial Guru (Admin)

**Reviewer:** Teamwork Reviewer (Round 2)  
**Date & Timestamp:** 2026-11-06T06:36:00Z  
**Branch:** main  
**Target Parent ID:** 0aa00ea1-9c92-421d-8e45-73f63b5e510d  

---

## 1. Executive Summary & Verdict
Pada Reviewer Round 2, peninjauan adversarial menemukan 4 celah nyata pada codebase dan Open Issues Ledger yang berhasil diperbaiki dan diverifikasi secara tuntas:
1. **Unmounted Component Memory Leak pada Tab Switching Cepat (`AdminPenggunaView.tsx`)**:
   Jika pengguna berpindah tab secara cepat antara sub menu Pengguna dan tab Master Data lainnya saat proses sinkronisasi background atau modal edit sedang aktif, pemanggilan `setState` (`setAccounts`, `setLoading`, `setErrorMsg`) dieksekusi pada komponen yang telah unmounted. Telah diperbaiki dengan `isMountedRef` lifecycle guard dan cleanup effect.
2. **Ketiadaan Validasi dan Redundansi Kode pada Self-Healing Account Insert (`AdminPenggunaView.tsx` & `teacherUserSync.ts`)**:
   Sebelumnya jika sebuah record guru belum memiliki `userId`, `AdminPenggunaView` melakukan direct insert manual tanpa melalui filter anti-dummy (`isDummyOrTestString`), filter nama terlarang (`isForbiddenName`), karakter ilegal/emoji, atau penanganan duplikasi username. Logika ini telah dipusatkan ke dalam `updateTeacherCredentials` dan `resetTeacherPasswordToDefault` sehingga `userId` bersifat opsional dan self-healing terjadi secara defensif, tersanitasi, dan konsisten.
3. **Penyempurnaan Normalisasi NIP Berformat & Fallback Placeholder NIP (`dataIntegrityGuard.ts` & `teacherUserSync.ts`)**:
   - NIP berformat resmi (18 digit angka dengan pemisah spasi, tanda hubung `-`, atau titik `.`, contoh: `19850101-201001-1-001` atau `1985.01.01.2010.01.1.001`) kini dinormalisasi secara otomatis ke digit angka murni (`198501012010011001`), dan password default konsisten `${nip}27`.
   - NIP bernilai placeholder umum (`--`, `N/A`, `none`, `tidak ada`, `0`, `00000000`, zero-width chars) kini dikenali secara cerdas dan fallback ke nama guru terstandarisasi / `guru27`.
   - Penolakan karakter ilegal, emoji, dan script injection pada username login (`/^[a-zA-Z0-9_.-]+$/`).
4. **Interaksi UX: Password Masking Toggle & Opsi Sinkronisasi NIP (`AdminPenggunaView.tsx`)**:
   - Menambahkan tombol interaktif toggle visibility password (ikon mata `fa-eye` / `fa-eye-slash`) pada SweetAlert2 modal agar admin dapat melihat atau menyamarkan kata sandi saat mengatur kredensial.
   - Menambahkan checkbox `syncNipToDataGuru` agar admin memiliki kontrol eksplisit apakah perubahan username juga disinkronkan ke kolom `nip` pada `data_guru`.
   - Menyelaraskan highlight sub menu aktif pada `AppScreen.tsx` untuk variasi `urlTab` (`Pengguna`, `pengguna`, `users`).

---

## 2. Issues Discovered and Root Cause Analysis

### Issue 1: Unmounted Component State Updates During Fast Tab Switch
- **Input:** Admin membuka sub menu Pengguna lalu segera beralih ke tab Siswa/Guru/Kalender saat `handleLoadAndSync` atau SweetAlert2 masih memproses query.
- **Expected:** Operasi async yang tertunda membatalkan update state tanpa memicu error atau memory leak pada unmounted component.
- **Actual:** `setAccounts`, `setLoading`, dan `setErrorMsg` dipanggil tanpa pengecekan mount status.
- **Root Cause:** Ketiadaan `isMountedRef` lifecycle guard di `AdminPenggunaView.tsx`.
- **Fix:** Menambahkan `isMountedRef = useRef<boolean>(true)` dengan cleanup unmount `false`, serta membungkus seluruh mutasi state dengan pengecekan `if (!isMountedRef.current) return;`.

### Issue 2: Unvalidated Direct Insert on Self-Healing Fallback
- **Input:** Admin mengatur kredensial atau mereset password pada guru yang belum memiliki `userId`, dengan memasukkan username dummy (`testuser`), emoji (`guru😊`), atau username yang sudah ada.
- **Expected:** Sistem menolak username invalid/dummy/bertabrakan dengan pesan ramah, atau membuat akun baru dengan sanitasi penuh.
- **Actual:** `AdminPenggunaView` melakukan insert SQL mentah ke tabel `users` melewati seluruh aturan anti-dummy dan sanitasi di `updateTeacherCredentials`.
- **Root Cause:** `updateTeacherCredentials` dan `resetTeacherPasswordToDefault` sebelumnya mewajibkan `userId: string`, memaksa komponen UI menulis fallback insert sendiri.
- **Fix:** Mengubah parameter `userId?: string` menjadi opsional pada `updateTeacherCredentials` dan `resetTeacherPasswordToDefault`. Fungsi kini secara otomatis melakukan query user eksisting atau membuat user baru secara tersanitasi dan memvalidasi keunikan serta format username.

### Issue 3: Punctuation & Placeholder NIP Vulnerabilities
- **Input:** NIP guru diinput dengan format tanda hubung (`19850101-201001-1-001`), titik (`1985.01.01.2010.01.1.001`), atau placeholder seperti `--`, `N/A`, `none`, `tidak ada`, `0`.
- **Expected:** NIP berformat dinormalisasi ke 18 digit angka murni; placeholder NIP dideteksi aman dan fallback ke nama guru / `guru27`.
- **Actual:** Sebelumnya NIP berformat menghasilkan username bertanda hubung/titik yang rentan benturan, sedangkan placeholder seperti `--` dan `N/A` menghasilkan username aneh `--` atau `na`.
- **Root Cause:** Helper `resolveTeacherUsername` dan `getDefaultTeacherPassword` hanya memeriksa `nip !== '-'` dan spasi tanpa regex normalisasi format NIP dan deteksi placeholder.
- **Fix:** Menambahkan deteksi placeholder `^[-_.\s0]+$` / `^(null|undefined|none|na|n\/a|tidak\s*ada|-+)$/i`, serta normalisasi digit NIP `\d{8,25}`.

---

## 3. Files Modified
1. `src/lib/dataIntegrityGuard.ts`:
   - Memusatkan implementasi `resolveTeacherUsername` dan `getDefaultTeacherPassword` dengan dukungan normalisasi format NIP (titik/strip/spasi) dan penanganan placeholder (`--`, `n/a`, `none`, `tidak ada`, `0`).
   - Menggunakan helper terpusat pada auto-sync `importMasterDataFromCsv`.
2. `src/lib/teacherUserSync.ts`:
   - Mengimpor dan me-re-export `resolveTeacherUsername` dan `getDefaultTeacherPassword` dari `dataIntegrityGuard`.
   - Mengizinkan `userId?: string` opsional pada `updateTeacherCredentials` dan `resetTeacherPasswordToDefault` untuk self-healing akun yang aman dan terpusat.
   - Validasi regex karakter username `/^[a-zA-Z0-9_.-]+$/` (menolak emoji, tag HTML, spasi tersembunyi).
3. `src/components/AdminPenggunaView.tsx`:
   - Menambahkan `isMountedRef` untuk mencegah memory leak dan unmounted state update.
   - Menambahkan kontrol tombol toggle visibility password (mata `fa-eye` / `fa-eye-slash`) pada modal atur kredensial.
   - Menambahkan checkbox `syncNipToDataGuru` untuk opsi sinkronisasi NIP guru.
   - Menghapus duplicate raw SQL insert dan memanfaatkan self-healing `updateTeacherCredentials`.
4. `src/components/AppScreen.tsx`:
   - Menyelaraskan evaluasi `isSubActive` sub-menu pada sidebar untuk variasi tab (`Pengguna`, `pengguna`, `users`).
5. `tests/admin_submenu_pengguna_kredensial_guru.test.ts`:
   - Menambahkan 5 adversarial test checks (3.9 s.d. 3.13) yang menguji penolakan emoji/script, normalisasi NIP bertanda hubung/titik, deteksi placeholder, self-healing tanpa `userId`, dan static code inspection pada elemen DOM.

---

## 4. Verification Record
- **Automated Tests:**
  - `npx tsx tests/admin_submenu_pengguna_kredensial_guru.test.ts`: **23/23 checks PASSED** (100%).
  - `npm test`: **53 Suites Executed | 53 PASSED | 0 FAILED** (100%).
- **Production Build:**
  - `npm run build`: Compiled successfully in 2.0s, Finished TypeScript in 2.6s, Generating static pages (13/13) in 1794ms. 0 errors.

---

## 5. Known Issues & Remaining Risk
- **Minor Robustness Risk**: Jika terdapat admin sekolah yang sengaja memasukkan username guru dengan format non-NIP (misal nama panggilan), kredensial login tetap berfungsi normal, namun NIP di `data_guru` hanya terupdate jika opsi `syncNipToDataGuru` dicentang dan username memenuhi kriteria format.
- **Deep Verification**: Seluruh automated test suite (53/53) dan build Next.js telah terverifikasi sukses tanpa regresi.
