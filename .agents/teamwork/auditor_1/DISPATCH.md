## 2026-10-15T14:10:12Z
You are teamwork_preview_victory_auditor conducting an independent post-victory audit for this software engineering task.
Your working directory is `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\auditor_1`.

<original_task>
This is a single self-contained fix; keep it small and focused.

Redesign antarmuka dan alur modul Daftar Nilai (Gradebook Kurikulum Merdeka) pada SIPJAM agar alur persiapan CP (Capaian Pembelajaran), TP (Tujuan Pembelajaran), dan Kolom Asesmen menyatu dalam satu antarmuka terpadu yang ringkas tanpa modal bertingkat yang membingungkan, sehingga guru dapat langsung fokus mengisi nilai dengan cepat, jelas, dan nyaman.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Penyatuan Alur Persiapan Asesmen (Unified Setup Flow)
Gantikan hierarki modal pop-up terpisah yang berbelit-belit (modal tambah CP -> modal tambah TP -> modal tambah Kolom) dengan satu panel terintegrasi (misal: inline drawer, accordion terstruktur, atau tab setup ringkas). Guru harus dapat melihat dan mengelola hubungan CP, TP, serta kolom asesmen dalam satu tampilan yang terpadu tanpa harus membuka-tutup banyak dialog modal.

### R2. Akses Langsung & Inisialisasi Cepat Pengisian Nilai (Frictionless Grade Entry)
Pastikan guru dapat langsung masuk ke pengisian nilai begitu Mata Pelajaran dan Kelas dipilih:
- Jika belum ada data CP/TP, sediakan panduan inline bersahabat atau tombol "Inisialisasi Cepat / Buat Format Awal" (membuat 1 CP, 1 TP, dan kolom Formatif/Sumatif default dengan 1 klik) agar guru tidak terbentur pesan kosong yang kaku.
- Tampilkan matriks tabel input nilai secara jelas dengan navigasi yang mudah dan tombol aksi yang terlihat langsung.

### R3. Preservasi Integritas Data & Logika Kurikulum Merdeka
Pertahankan 100% kompatibilitas dengan:
- Skema database Supabase: capaian_pembelajaran, tujuan_pembelajaran, asesmen_kolom, nilai_siswa, dan pengaturan.
- Aturan validasi: tepat 1 asesmen Diagnostik per TP, asesmen Formatif, dan Sumatif dengan bobot masing-masing.
- Formula kalkulasi Kurikulum Merdeka (bobot Kehadiran, Formatif, Sumatif) serta fungsi generator narasi rapor generateKurikulumMerdekaDeskripsi.
- Mode Review Admin (hak akses read-only nilai siswa + pengelolaan bobot).

### R4. Kesederhanaan & Kerapian Kode (Ponytail Principle)
Gunakan komponen dan pustaka yang sudah tersedia di proyek. Hindari penambahan dependensi pihak ketiga baru atau abstraksi berlebihan yang tidak diminta. Pertahankan penanganan offline check (navigator.onLine), autosave/dirty indicator, export CSV, dan integrasi cetak GPS.

## Acceptance Criteria

### Pengalaman Pengguna (UX)
- [ ] Pengelolaan CP, TP, dan Kolom Asesmen tidak lagi memerlukan navigasi modal pop-up bertingkat yang terputus-putus
- [ ] Tersedia opsi inisialisasi awal cepat untuk kelas/mapel yang baru sehingga guru dapat langsung mengisi nilai
- [ ] Navigasi input nilai terasa mulus, jelas, dan tidak terhalang oleh banner peringatan yang bertumpuk

### Integritas Fungsional & Fungsionalitas Lengkap
- [ ] Operasi simpan nilai (batch upsert ke tabel nilai_siswa) berjalan normal dan terverifikasi di database
- [ ] Perhitungan otomatis nilai akhir per TP, nilai akhir semester, predikat, dan narasi deskripsi capaian pembelajaran bekerja akurat
- [ ] Fitur pendukung: Isi Nilai Cepat (Bulk Fill), Export CSV (TP & Semester), dan Cetak (PrintHeader / GPS) tetap berfungsi normal
- [ ] Mode admin tetap memiliki hak akses yang benar (hanya review nilai & ubah bobot)

### Verifikasi Teknis
- [ ] Build Next.js (npm run build) berhasil tanpa error TypeScript atau lint
- [ ] Test regresi atau test fungsional baru gradebook berhasil dijalankan (PASS)
</original_task>

Conduct your independent 3-phase audit:
1. Timeline audit: Review git log and verify commits made for the feature.
2. Cheating detection: Check for hardcoded test returns, mocked data facades, or disabled test assertions.
3. Independent test execution: Run the test suites yourself (`npx tsx tests/gradebook_unified_setup_flow.test.ts`, `npx tsx tests/gradebook_cp_tp_formula_verification.test.ts`, `npx tsx tests/forensic_gradebook_audit.test.ts`, `npm run build`).

Deliver your structured audit verdict (CONFIRMED or REJECTED) in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\auditor_1\verdict.md` and report back via `send_message`.
