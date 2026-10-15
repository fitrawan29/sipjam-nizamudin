# Dispatch to swe_28

## Mission
Sesuaikan tahun ajaran dan semester pada modul E-Rapor (`src/components/RaporView.tsx`) agar secara otomatis menyelaraskan diri dengan pengaturan aktif sekolah di tabel `pengaturan`, menyediakan dropdown pilihan dinamis yang memuat tahun ajaran yang diatur beserta arsip, serta mendengarkan update realtime.

## Working Directory
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_28

## Requirements
Refer to verbatim specifications in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`.

### R1. Sinkronisasi Otomatis Tahun Ajaran & Semester dari Pengaturan Sekolah
- Ambil konfigurasi aktif `tahun_ajaran` dan `semester` dari tabel `pengaturan` untuk `sekolah_id` pengguna (atau default sekolah jika belum diset).
- Gunakan nilai yang diatur tersebut sebagai inisialisasi awal default pada `selectedTahunAjaran` dan `selectedSemester` di `RaporView.tsx`.
- Pasang event listener untuk `sipjam:config_updated` agar saat admin mengubah tahun ajaran atau semester di menu Sistem (`AdminConfigView`), `RaporView` langsung memperbarui state aktifnya secara otomatis.

### R2. Dropdown Pilihan Tahun Ajaran Dinamis & Fleksibel
- Jangan mengunci opsi tahun ajaran pada daftar statis hardcoded semata.
- Bangun opsi tahun ajaran secara dinamis: pastikan tahun ajaran yang sedang diatur selalu tersedia, digabungkan dengan tahun ajaran yang tercatat di database (dari `capaian_pembelajaran`, `tujuan_pembelajaran`, `wali_kelas`, `jadwal_pelajaran`) serta opsi tahun relevan (misal tahun sebelumnya dan sesudahnya).
- Berikan penanda visual yang jelas pada opsi tahun ajaran yang sedang aktif diatur (misal: "2024/2025 (Aktif)").
- Pengguna tetap dapat memilih tahun ajaran atau semester lain dari dropdown untuk meninjau rapor periode/arsip terdahulu.

### R3. Konsistensi Query dan Dokumen Cetak
- Seluruh pengambilan data rapor (data nilai siswa, capaian pembelajaran, tujuan pembelajaran, wali kelas, serta catatan/observasi) harus dieksekusi secara reaktif sesuai `selectedTahunAjaran` dan `selectedSemester` yang sedang dipilih/disinkronkan.
- Lembar cetak Laporan Hasil Belajar (E-Rapor) dan judul dokumen cetak wajib menampilkan teks Tahun Ajaran dan Semester yang akurat sesuai pilihan aktif.

## Verification
- Run tests: `npm test` (including `tests/e_rapor_real_data_pipeline.test.ts`, `tests/adversarial_rapor_wali_security.test.ts`, and `tests/m4_academic_merdeka_rapor.test.ts`).
- Production build: `npm run build` with 0 errors.
- Adhere to Git Workflow Rule upon completion (`git status`, `git add .`, `git commit -m "..."`, `git push origin main`).
- Ponytail: diff minimal, reuse existing helpers.
