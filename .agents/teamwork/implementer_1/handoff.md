# Handoff Report - Implementer 1

## Overview
Implementasi perbaikan dan penyesuaian lanjutan pada aplikasi Sipjam mencakup:
1. **R1**: Skrip penggabungan data ganda terukur (`scripts/merge_accounts.ts`) dengan query COUNT eksplisit, re-assign foreign keys, dan pembersihan akun duplikat.
2. **R2**: Logika alur konfirmasi "Izin Terlambat" yang memerlukan konfirmasi/verifikasi admin (status awal pending "Menunggu" / "Menunggu Verifikasi"), tombol persetujuan/penolakan (Terima/Tolak) di UI Admin (`AdminVerifView`), serta isolasi di `HomeView` agar tidak langsung disahkan sebagai "Hadir".
3. **R3**: Penghapusan input username dan teks username pada `AccountSettingsModal` saat pengguna login adalah non-admin/Guru, dengan form ganti password yang tetap berfungsi normal.

---

## 1. What I Changed
- `scripts/merge_accounts.ts`:
  - Membuat skrip TypeScript mandiri menggunakan Supabase Client terautentikasi (Superadmin).
  - Melakukan query eksplisit `COUNT` untuk riwayat presensi (`presensi_guru`), jurnal (`jurnal_pembelajaran`), dan piket (`laporan_piket`) baik untuk akun primer maupun duplikat.
  - Mencetak hasil hitungan riwayat secara terperinci ke konsol (`console.log`).
  - Menjalankan re-assignment foreign keys pada seluruh tabel terkait transaksi guru (presensi, jurnal, piket, jadwal, mapel, penugasan piket, wali kelas, push subscriptions).
  - Menghapus akun duplikat secara berurutan (`data_guru` terlebih dahulu, kemudian `users`) dengan proteksi idempoten.
- `src/components/AdminVerifView.tsx`:
  - Menyelaraskan filter status verifikasi agar mengenali status pending `'Menunggu'` maupun `'Menunggu Verifikasi'`.
  - Menambahkan atribut eksplisit `title` dan `aria-label` untuk aksi Terima/Setujui dan Tolak pada kartu verifikasi.
- `src/components/HomeView.tsx`:
  - Memperbarui evaluasi status presensi datang: jika jenis presensi adalah `'Izin Terlambat'` atau `'Terlambat'`, status tidak langsung disahkan sebagai `'Hadir'`. Apabila belum disetujui admin, status berstatus `'Izin Terlambat (Menunggu Verifikasi)'` (warna amber).
- `src/components/AdminRekapView.tsx`:
  - Mengikutsertakan `'Izin Terlambat'` dan `'Terlambat'` ke dalam agregasi kehadiran (`hadir`) dan akumulasi detik keterlambatan hanya jika status verifikasinya telah disahkan (`'Disetujui'` / `'Diverifikasi'`).
- `src/components/AccountSettingsModal.tsx`:
  - Mengondisikan elemen input username di Section 2 hanya dirender saat `isAdmin` bernilai `true` (`{isAdmin && (...) }`).
  - Mengondisikan teks username di header modal agar tidak menampilkan username jika pengguna adalah Guru / non-admin.
  - Mempertahankan form ganti kata sandi dan integritas payload `update_user_profile` tanpa bergantung pada input form username.
- `tests/verification_r1_r2_r3.test.ts`:
  - Membuat rangkaian uji komprehensif (23 tes) yang menguji R1, R2, dan R3 secara end-to-end.

---

## 2. Verification Commands & Outputs
- **R1 Script Execution**:
  ```bash
  npx tsx scripts/merge_accounts.ts
  ```
  Output:
  - Berhasil terhubung ke Supabase dengan hak Superadmin.
  - Berhasil menghitung dan mencetak jumlah pasti riwayat:
    - Duplikat: Presensi = 0, Jurnal = 0, Piket = 0
    - Primer (Ade Fitrawan Ibrahim): Presensi = 171, Jurnal = 72, Piket = 10
  - Re-assignment foreign keys dan pembersihan akun duplikat berhasil dieksekusi secara idempoten.

- **Full R1, R2, R3 Test Suite**:
  ```bash
  npx tsx tests/verification_r1_r2_r3.test.ts
  ```
  Output: `23 PASSED, 0 FAILED`

- **Typecheck**:
  ```bash
  npx tsc --noEmit
  ```
  Output: `Exit code: 0` (0 errors)

- **Next.js Production Build**:
  ```bash
  npm run build
  ```
  Output: `Compiled successfully in 1694ms`, static/dynamic routes generated without errors.

---

## 3. Explicit Verification Record
- **Deep Verification (ran actual tests & scripts):**
  - Eksekusi langsung `scripts/merge_accounts.ts` pada live Supabase database.
  - Eksekusi `tests/verification_r1_r2_r3.test.ts` (23 assertions mencakup query count R1, API POST presensi Izin Terlambat R2, verifikasi filter dan tombol AdminVerifView R2, logika HomeView & AdminRekapView R2, serta pengondisian DOM AccountSettingsModal R3).
  - Eksekusi `tests/m3_izin_terlambat_verification.test.ts` (pass).
  - Eksekusi `tests/adversarial_challenger_1.test.ts` (72 passed, 0 failed).
  - Verifikasi tipe TypeScript via `npx tsc --noEmit` (pass).
  - Verifikasi build produksi Next.js via `npm run build` (pass).
- **Shallow Verification (manual run / review only):**
  - Tampilan visual styling kartu di browser (direview melalui struktur token Tailwind CSS: `grid`, `input-premium`, `glass-card`).
- **Unverified aspects:**
  - Perilaku browser Safari iOS versi lama pada interaksi modal ganti password (hanya diverifikasi pada lingkungan Node/Chromium Next.js build).

---

## 4. Known Issues
- `None` — Semua acceptance criteria R1, R2, dan R3 terpenuhi dan lolos verifikasi otomatis.
