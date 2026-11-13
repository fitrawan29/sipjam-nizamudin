## 2026-11-12T13:26:40Z

This is a single self-contained fix; keep it small and focused. Perbaiki kolom jurnal KBM pada aplikasi sipjam-app agar urutan dan strukturnya sesuai ketentuan pada form input, mode edit, tabel data, data lama, dan tampilan cetak.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Urutan dan Struktur Kolom Jurnal KBM
Perbarui kolom jurnal KBM agar memiliki urutan dan struktur persis berikut:
1. Nomor
2. Hari/Tanggal
3. Materi/Konten
4. Kelas/JP
5. Keadaan Siswa (terdiri dari sub-kolom/sub-field: Jumlah, Hadir, Sakit, Izin, Alpa)
6. Tempat/Lokasi KBM
7. Dokumentasi (menyediakan dua opsi: live camera dan upload foto)
8. Keterangan (opsional)

Urutan dan struktur kolom baru ini wajib diterapkan secara konsisten pada:
- Form input/pengisian baru dan form mode edit jurnal KBM.
- Tampilan tabel/daftar jurnal KBM, dengan memastikan data jurnal lama yang sudah diisi sebelumnya tetap dapat tampil secara benar menyesuaikan struktur kolom baru.
- Mode cetak/print dokumen jurnal KBM.

### R2. Pendekatan Implementasi (Ponytail full)
Terapkan prinsip Ponytail (full): solusi paling sederhana yang berhasil bekerja (laziest solution that works), utamakan fitur native platform (seperti input file / camera capture native), hindari over-engineering, buat diff perubahan seringkas mungkin, dan gunakan kembali kode serta komponen yang sudah ada tanpa membuat abstraksi baru kecuali mutlak diperlukan.

### R3. Alur Kerja Git
Setelah seluruh perubahan selesai dan terverifikasi, lakukan staging (`git add .`), buat commit dengan pesan deskriptif, dan lakukan push langsung ke branch utama (`git push origin main`).

## Acceptance Criteria

### Kolom dan Struktur Jurnal KBM
- [ ] Kolom pada form input dan mode edit jurnal KBM tersusun sesuai urutan: Nomor, Hari/Tanggal, Materi/Konten, Kelas/JP, Keadaan Siswa, Tempat/Lokasi KBM, Dokumentasi, Keterangan.
- [ ] Kolom pada tampilan tabel/daftar jurnal KBM mencerminkan urutan dan struktur yang sama.
- [ ] Data jurnal yang sudah tersimpan sebelumnya tetap dapat dimuat dan ditampilkan secara benar pada struktur kolom baru tanpa error.
- [ ] Tampilan cetak/print dokumen jurnal KBM mencerminkan urutan dan struktur kolom baru secara konsisten.
- [ ] Bagian Keadaan Siswa mencakup seluruh sub-field/kolom: Jumlah, Hadir, Sakit, Izin, dan Alpa.
- [ ] Bagian Dokumentasi menyediakan dua opsi fungsional: live camera dan upload foto.
- [ ] Kolom Keterangan bersifat opsional (tidak wajib diisi).

### Verifikasi & Integritas
- [ ] Proyek Next.js dapat di-build atau typecheck tanpa error (`npm run build`).
- [ ] Alur input, edit, penampilan data lama, dan cetak jurnal KBM terverifikasi berfungsi normal tanpa regresi.
- [ ] Perubahan di-stage, di-commit, dan di-push ke branch `main`.

---
## Continuation Context
- Round 1 primary implementation has already been completed and committed (commit `f175746` in `src/components/GuruJurnal.tsx` and `src/components/RekapJurnalView.tsx`), with build and tests passing.
- State folder: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_3
- Original request path: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Prior open issues ledger from Round 1:
  1. [Open] Mobile camera stream behavior on low-end WebViews (uses standard HTML5 file input with capture="environment").
  2. [Open] Robustness: legacy journal with zero attendance records defaults to 0 across all five sub-fields.
  3. [Open] Edge case: very long custom descriptions in "Tempat/Lokasi KBM" during print preview.
  4. [Open] Verification: inspect print preview on dataset containing modern and legacy journals.
- Proceed with Review Round 1 (teamwork_reviewer), Review Round 2, Review Round 3, and final victory audit.
