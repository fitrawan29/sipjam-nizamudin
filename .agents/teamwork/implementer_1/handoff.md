# Implementer 1 Handoff Report: Sembunyikan Blok Tanda Tangan Admin Pada Dokumen Cetak

## 1. What was changed
- **`src/components/PrintHeader.tsx`**:
  - Ditambahkan deteksi role admin secara case-insensitive:
    ```tsx
    const isAdmin = (user?.role || '').trim().toLowerCase() === 'admin';
    const isSingleColumnLayout = Boolean(singleColumn || isAdmin);
    ```
  - Variabel `isSingleColumnLayout` digunakan untuk mengontrol `containerClass`, `containerStyle`, blok tanda tangan kiri (`data-testid="signature-left"`), blok tanda tangan pengawas (`data-testid="signature-pengawas"`), dan blok tanda tangan kanan Kepala Sekolah (`data-testid="signature-right"`).
  - Ketika `user.role` bernilai `'admin'` (atau `'Admin'`, `'ADMIN'`):
    - Kolom tanda tangan kiri (jabatan, nama, NIP admin/pencetak) tidak dirender sama sekali ke dalam DOM (`null`).
    - Kolom tanda tangan Kepala Sekolah tetap terposisi rapi di sisi kanan dengan class `w-64 ml-auto` dan container `flex justify-end ml-auto`.
    - Jika opsi tanda tangan Pengawas aktif, kolom Pengawas tetap dirender normal di sisi kiri dan Kepala Sekolah di sisi kanan dengan `justify-between`.
  - Jika `user` undefined, `null`, atau memiliki role selain admin (seperti `guru`), perilaku default tidak berubah sama sekali (blok tanda tangan kiri tetap dirender).
  - Tidak ada perubahan pada pemanggil (callers) mana pun; interface `PrintSignatureProps` tetap utuh.
- **`tests/printHeader.test.ts`**:
  - Ditambahkan unit test suite (Suite 10a - 10g) yang merender komponen `PrintSignature` ke HTML via `renderToStaticMarkup` untuk memvalidasi:
    - 10a: `user.role === 'admin'` -> blok kiri tidak ada di DOM, blok kanan Kepala Sekolah ada, container `justify-end` `ml-auto`.
    - 10b: `user.role === 'Admin'` (kapital) -> blok kiri tidak ada di DOM.
    - 10c: `user.role === 'ADMIN '` (uppercase + whitespace) -> blok kiri tidak ada di DOM.
    - 10d: `user.role === 'guru'` -> blok kiri dirender normal beserta nama dan NIP guru.
    - 10e: `user` undefined -> blok kiri dirender normal.
    - 10f: `user` null -> blok kiri dirender normal.
    - 10g: `user.role === 'admin'` dengan `showPengawas={true}` -> blok tanda tangan admin tidak ada, blok Pengawas ada di kiri, blok Kepala Sekolah ada di kanan.

## 2. Rationale
Menghilangkan blok tanda tangan kiri saat admin mencetak dokumen untuk menghindari kolom tanda tangan yang redundan/tidak perlu bagi staf tata usaha/admin, sembari menjaga estetika dokumen cetak agar kolom Kepala Sekolah tetap rapi di sisi kanan (atau berdampingan dengan Pengawas Pembina jika aktif) tanpa celah kosong aneh di sisi kiri.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/printHeader.test.ts`: PASS (10/10 test suites passed, including all sub-tests for R1 & R2).
  - `npx tsc --noEmit`: PASS (0 type errors).
- **Shallow Verification (manual run only):**
  - Evaluasi struktur DOM string dari `renderToStaticMarkup` untuk memastikan elemen HTML benar-benar tidak dirender (bukan disembunyikan via CSS `hidden` / `display:none`).
- **Unverified aspects:**
  - Browser physical print preview render to paper/PDF printer driver (tested via synthetic SSR HTML markup rendering and DOM structure assertions).

## 4. Known Issues
None.

## 5. Untested Edge Cases & Next Step
- Perilaku pada browser mobile print dialog (CSS print media query) — direkomendasikan untuk diverifikasi secara visual pada saat QA manual print preview di berbagai ukuran kertas (A4 vs F4).
