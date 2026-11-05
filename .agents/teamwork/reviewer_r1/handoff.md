# Handoff Report: Reviewer Round 1 — Sub Menu Pengguna & Kredensial Guru (Admin)

**Reviewer:** Teamwork Reviewer (Round 1)  
**Date & Timestamp:** 2026-11-06T06:22:00Z  
**Branch:** main  
**Target Parent ID:** 0aa00ea1-9c92-421d-8e45-73f63b5e510d  

---

## 1. Executive Summary & Verdict
Pada Reviewer Round 1, peninjauan adversarial menemukan 3 masalah nyata pada codebase:
1. **Kegagalan Test Suite `user_standardization_and_cleanup_verification.test.ts` (Fatal Bug / Test Interference)**:
   Implementer menambahkan auto-sync ke tabel `users` saat `importMasterDataFromCsv` dijalankan untuk data guru. Namun, pada test suite `tests/data_guru_csv_import_sekolah_id_validation.test.ts`, pembersihan test record hanya menghapus dari tabel `data_guru` dan membiarkan user `Muhammad Ridwan Pratama` tertinggal di tabel `users`. Hal ini mengakibatkan duplikasi nama guru di database `users`, sehingga test `user_standardization_and_cleanup_verification.test.ts` gagal (64 passed, 1 failed).
2. **Kegagalan TypeScript Build `npm run build` (Fatal Compilation Bug)**:
   `HomeViewAdminProps` tidak mendeklarasikan properti opsional `schoolName?: string;`, padahal `HomeView.tsx` meneruskan `schoolName={schoolName}` ke `<HomeViewAdmin .../>`. Hal ini menyebabkan `npm run build` gagal pada tahap Type Check (`error TS2322: Property 'schoolName' does not exist on type 'IntrinsicAttributes & HomeViewAdminProps'`). Klaim build sukses pada handoff implementer sebelumnya terbukti tidak akurat.
3. **Penyempurnaan Ketahanan Kredensial & Sinkronisasi**:
   - `teacherUserSync.ts`: Penambahan sanitasi internal whitespace pada NIP (`replace(/\s+/g, '')`), validasi penolakan username dummy (`isDummyOrTestString`) dan terlarang (`isForbiddenName`), pencarian keunikan case-insensitive menggunakan `.ilike('username', cleanUsername)` (mencegah benturan unik PostgreSQL `uq_users_username_lower`), penerjemahan error kode 23505 ke pesan user-friendly, dan perlindungan agar NIP pada `data_guru` tidak tertimpa nama login sembarangan kecuali jika `syncNipToDataGuru` atau `newNip` dispesifikasikan.
   - `AdminPenggunaView.tsx`: Penambahan proteksi self-healing saat modal edit atau quick reset diakses pada record guru yang belum memiliki `userId` (langsung membuatkan akun dengan password default NIP27 alih-alih gagal tanpa aksi), serta menampilkan `result.errors` di UI.
   - `ClaySidebar.tsx`: Sinkronisasi status aktif sub menu pengguna ketika `currentView === 'view-admin-data'` dan `currentTab === 'Pengguna'`.
   - `AdminDataView.tsx` & `dataIntegrityGuard.ts`: Memusatkan helper `resolveTeacherUsername` dan `getDefaultTeacherPassword` dari `teacherUserSync.ts` dan menggunakan `.ilike()`.

---

## 2. Issues Discovered and Root Cause Analysis

### Issue 1: Database Test Pollution & Duplicate User Name Collision
- **Input:** Menjalankan `npm test` yang mengeksekusi `tests/data_guru_csv_import_sekolah_id_validation.test.ts` lalu `tests/user_standardization_and_cleanup_verification.test.ts`.
- **Expected:** Seluruh 52 test suites lulus 100% dan tidak meninggalkan orphan rows pada tabel `users`.
- **Actual:** `user_standardization_and_cleanup_verification.test.ts` gagal dengan: `✖ FAIL: Table users: found 1 duplicate user names: [["a0000000-0000-0000-0000-000000000001::muhammad ridwan pratama",2]]`.
- **Root Cause:** Penambahan auto-sync pembuatan user pada `importMasterDataFromCsv` menyisipkan akun user setiap kali test import dijalankan, namun cleanup test di line 804 hanya menghapus dari `data_guru` dan tidak menghapus dari `users`.
- **Fix:** Menambahkan pembersihan pre-clean dan post-clean `users` di `tests/data_guru_csv_import_sekolah_id_validation.test.ts` dalam blok `finally`, serta membersihkan 2 record orphan dari database.

### Issue 2: Next.js Production Build TypeScript Error TS2322
- **Input:** Menjalankan `npm run build`.
- **Expected:** TypeScript typecheck selesai 100% tanpa error dan seluruh static pages terkompilasi.
- **Actual:** `src/components/HomeView.tsx(44,7): error TS2322: Property 'schoolName' does not exist on type 'IntrinsicAttributes & HomeViewAdminProps'`. Build terhenti dengan exit code 1.
- **Root Cause:** Deklarasi interface `HomeViewAdminProps` di `HomeViewAdmin.tsx` belum menyertakan `schoolName?: string;`.
- **Fix:** Menambahkan `schoolName?: string;` ke `HomeViewAdminProps` dan parameter `HomeViewAdmin`.

### Issue 3: Username Collision Vulnerability & Case Sensitivity Bypass
- **Input:** Admin memperbarui username guru menjadi username yang sudah ada dengan huruf besar/kecil berbeda (misal "Superadmin" vs "superadmin") atau username dummy ("testuser").
- **Expected:** Validasi ramah menolak input sebelum menabrak exception trigger database atau constraint index PostgreSQL `uq_users_username_lower`.
- **Actual:** Sebelumnya `updateTeacherCredentials` hanya menggunakan `.eq()` dan melewati cek jika `oldUsername` tidak dioper, serta tidak memeriksa `isDummyOrTestString`.
- **Root Cause:** Ketiadaan validasi defensif terintegrasi dan ketiadaan `.ilike()`.
- **Fix:** Mengintegrasikan `isDummyOrTestString` dan `isForbiddenName`, menggunakan query `.ilike()` dengan fallback aman, dan menangkap exception 23505 untuk diterjemahkan ke pesan ramah.

---

## 3. Files Modified
1. `src/lib/teacherUserSync.ts`
   - Sanitasi internal whitespace untuk NIP dan username.
   - Integrasi `isDummyOrTestString` dan `isForbiddenName`.
   - Pemeriksaan keunikan username case-insensitive via `ilike` & `neq`.
   - Penangkapan error Postgres 23505 untuk pesan ramah.
   - Proteksi field NIP pada `data_guru`.
2. `src/components/AdminPenggunaView.tsx`
   - Self-healing akun pengguna otomatis saat `userId` belum ada pada modal edit maupun quick reset.
   - Menampilkan notifikasi banner jika sinkronisasi guru menghasilkan errors.
3. `src/components/ClaySidebar.tsx`
   - Menambahkan properti `currentTab?: string;` pada `ClaySidebarProps`.
   - Mengaktifkan highlight sub menu Pengguna saat tab Pengguna aktif di Master Data.
4. `src/components/AdminDataView.tsx`
   - Memakai `resolveTeacherUsername` dan `getDefaultTeacherPassword` terpusat.
   - Menggunakan query `.ilike()` saat validasi user sebelum insert.
5. `src/components/HomeViewAdmin.tsx`
   - Menambahkan properti opsional `schoolName?: string;` pada `HomeViewAdminProps` untuk memperbaiki build TypeScript.
6. `src/lib/dataIntegrityGuard.ts`
   - Menyelaraskan sanitasi NIP dan username, menggunakan `.ilike()` pada auto-sync import CSV.
7. `tests/data_guru_csv_import_sekolah_id_validation.test.ts`
   - Menambahkan pembersihan record `users` pada pre-clean dan blok `finally` pasca-import.
8. `tests/admin_submenu_pengguna_kredensial_guru.test.ts`
   - Menambahkan mock `.ilike()` dan `.neq()` pada mockSupabase.
   - Menambahkan 4 adversarial test checks baru (3.5 s.d. 3.8): penolakan dummy username, penolakan nama terlarang, pencegahan tabrakan username akun lain, dan toleransi sanitasi spasi internal/null/dash.

---

## 4. Verification Record
- **Automated Tests:**
  - `npx tsx tests/admin_submenu_pengguna_kredensial_guru.test.ts`: **18/18 checks PASSED** (100%).
  - `npx tsx tests/user_standardization_and_cleanup_verification.test.ts`: **65/65 checks PASSED** (100%).
  - `npx tsx tests/data_guru_csv_import_sekolah_id_validation.test.ts`: **31/31 checks PASSED** (100%).
  - `npm test`: **52 Suites Executed | 52 PASSED | 0 FAILED** (100%).
- **Production Build:**
  - `npm run build`: Compiled successfully in 2.2s, Finished TypeScript in 3.4s, Generating static pages (13/13) in 1378ms. 0 errors.

---

## 5. Next Steps
Seluruh bug fatal pada build, interferensi test suite antar-modul, dan celah validasi kredensial telah diperbaiki secara tuntas. Kode siap untuk di-commit dan di-push ke main sesuai Git Workflow Rule.
