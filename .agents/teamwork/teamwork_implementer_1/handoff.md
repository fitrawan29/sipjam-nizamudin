# Handoff Report — teamwork_implementer_1

## Executive Summary
Perbaikan tampilan Jam Datang dan Jam Pulang pada modul Presensi Gerbang Piket (`RekapSiswaView.tsx`) telah selesai diimplementasikan dan diverifikasi secara menyeluruh.

Sebelum perbaikan, siswa yang hadir di pagi hari (`isMorningHadir`) secara keliru menerima fallback otomatis `pulang = { jam: 'Sistem Mapel Auto', status: 'pulang' }`. Nilai string ini ketika dipotong 5 karakter menghasilkan `'Siste'`, sehingga kolom Jam Pulang menampilkan teks cacat `"Siste WITA"`, serta secara keliru menandai siswa seolah-olah sudah pulang (`hasPulang: true`). Selain itu, jika catatan presensi pulang bernilai `'-'`, kolom merender `"- WITA"` alih-alih `"-"`.

Kami telah memperbarui mekanisme pemetaan presensi gerbang piket agar waktu Jam Datang bersumber murni dari scan kedatangan yang tercatat, dan Jam Pulang bersumber murni dari scan kepulangan aktual (`realPulang`). Jika belum ada catatan presensi pulang, kolom menampilkan tanda `"-"`.

Seluruh pengujian unit, regresi, dan build produksi Next.js telah dijalankan dan lulus 100%.

---

## 1. What I Changed
- **`src/components/RekapSiswaView.tsx`**:
  - Memisahkan ekstraksi kepulangan aktual (`realPulang`) dari log gerbang (`gateLogs` dengan `status === 'pulang'`).
  - Menghapus pembuatan rekor kepulangan fiktif (`pulang = { jam: 'Sistem Mapel Auto', ... }`) pada siswa yang hadir pagi.
  - Mempertahankan deteksi bolos (`isBolosPulang`, `Auto Fallback: Bolos`, `Pulang: Bolos`, dan metrik `totalGerbangBolos`) untuk kompatibilitas aturan audit dan tes eksisting.
  - Memformat `jamDatang` dan `jamPulang` secara presisi: nilai jam yang valid (HH:MM / HH:MM:SS) dipotong rapi menjadi HH:MM, sedangkan jika catatan tidak ada atau bertanda `'-'`, nilai dijadikan `null`.
  - Memperbaiki rendering sel tabel HTML dan ekspor CSV:
    - Jam Datang: menampilkan `{siswa.jamDatang} WITA` jika ada catatan scan masuk, atau `"-"` jika belum ada.
    - Jam Pulang: menampilkan `{siswa.jamPulang} WITA` jika ada catatan scan pulang, atau `"-"` jika belum ada.
  - Memastikan state `hasPulang` hanya bernilai `true` jika siswa benar-benar memiliki catatan presensi pulang di gerbang dan tidak bolos.
  - Menyelaraskan pembacaan `timeStr` pada pengiriman notifikasi WhatsApp orang tua agar aman dari nilai `'-'`.
- **`tests/presensi_gerbang_jam_datang_pulang.test.ts`**:
  - Test suite baru untuk memvalidasi:
    1. Keberadaan kolom dan penanganan rendering Jam Datang dan Jam Pulang di tabel `RekapSiswaView.tsx`.
    2. Pencegahan injeksi fake record `'Sistem Mapel Auto'`.
    3. Ekspor CSV dengan format waktu yang sesuai atau tanda `'-'`.
    4. Simulasi data multi-siswa (datang + pulang, datang saja, belum presensi, dan bolos).
    5. Pengujian format timestamp beragam (dengan detik, tanpa detik, whitespace, null/undefined).

---

## 2. Why
Tugas meminta perbaikan tampilan jam datang dan jam pulang pada presensi gerbang piket:
- **R1**: Tampilkan waktu presensi/scan masuk pada kolom jam datang sesuai catatan kedatangan.
- **R2**: Tampilkan waktu presensi/scan pulang pada kolom jam pulang jika sudah presensi pulang, dan tampilkan tanda `"-"` jika belum ada catatan presensi pulang.

---

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/presensi_gerbang_jam_datang_pulang.test.ts`: **7 / 7 checks PASS (100%)**
  - `npx tsx tests/wali_kelas_and_piket_intervensi.test.ts`: **56 / 56 checks PASS (100%)**
  - `npm test`: **46 test suites PASS (100%)** (Exit code 0)
  - `npm run build`: **Exit code 0** (Next.js 16.3.4 Turbopack build sukses, pemeriksaan tipe TypeScript selesai tanpa error, 13/13 static routes dioptimasi)
- **Shallow Verification (manual run only):**
  - Pemeriksaan layout HTML table `border-collapse`, font mono styling, badge CSS classes di `RekapSiswaView.tsx`.
- **Unverified aspects:**
  - Koneksi live ke hardware barcode scanner USB HID fisik (sudah dicakup oleh simulasi payload database dan unit test `tests/m3_piket_scanner_kiosk.test.ts`).

---

## 4. Known Issues
- `None` — Semua pengujian otomatis dan build sistem berjalan tanpa error serta diff difokuskan secara bedah pada area terkait.

---

## 5. Untested Edge Cases & Next Step
- Uji skenario di mana scanner mencatat format waktu 12 jam (AM/PM) dari perangkat kiosk pihak ketiga (format standar SIPJAM saat ini menggunakan 24 jam HH:MM:SS WITA).
