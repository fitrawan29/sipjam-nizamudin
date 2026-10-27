# DISPATCH PROMPT — swe_38 (teamwork_preview_swe)

You are the SWE Light orchestrator (teamwork_preview_swe).
Your working directory is: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_38`
Project root: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`
User request reference: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (Header `## 2026-10-27T10:21:28Z`)

## Task Summary
Sesuaikan sistem profil pengguna dan manajemen guru agar user dapat menambahkan gelar akademik/profesi lebih dari satu, dengan fleksibilitas memilih penempatan gelar di depan (prefix) atau di belakang (suffix) nama pokok. Terapkan prinsip Ponytail (paling sederhana, minimal, memanfaatkan komponen UI dan state yang sudah ada tanpa dependensi pihak ketiga baru).

## Requirements

### R1. Input Multi-Gelar pada Pengaturan Akun & Manajemen Guru
- Menyediakan antarmuka input pada modal Pengaturan Akun (`AccountSettingsModal.tsx`) dan form Tambah/Edit Guru (`AdminDataView.tsx`) yang memungkinkan penambahan gelar lebih dari satu.
- Setiap gelar yang ditambahkan dapat ditentukan posisinya secara eksplisit: di depan (seperti Dr., Drs., Prof., Ir., Hj.) atau di belakang (seperti S.Pd., M.Pd., S.Kom., M.Kom., Gr.).
- Pengguna dapat menghapus atau mengubah gelar yang telah ditambahkan sebelum data disimpan.
- Tampilkan preview nama lengkap terformat secara langsung (real-time) sehingga pengguna dapat melihat hasil penggabungan sebelum menyimpan.

### R2. Format Penggabungan dan Integritas Data
- Menggabungkan nama secara baku: gelar depan dipisahkan spasi sebelum nama pokok, dan gelar belakang dipisahkan tanda koma dan spasi setelah nama pokok (contoh: `Dr. Drs. H. Ahmad Fauzi, S.Pd., M.Pd.`). Jika tidak ada gelar depan atau belakang, format menyesuaikan secara alami tanpa spasi/tanda baca ganda yang janggal.
- Kompatibel dengan penyimpanan kolom nama saat ini (`users.nama` dan `data_guru.nama_guru`) tanpa memerlukan migration schema database yang merusak.
- Hasil penggabungan nama tetap lolos dan selaras dengan validasi integritas nama (`src/lib/dataIntegrityGuard.ts`).
- Mengikuti prinsip minimalis (Ponytail approach): gunakan komponen UI dan penanganan state yang sudah ada tanpa menambah dependensi pustaka baru.

### R3. Otomatisasi Git Workflow
- Setelah seluruh modifikasi file dan pengujian selesai, lakukan `git status`, `git add .`, commit dengan pesan deskriptif, dan `git push origin main` (sesuai GEMINI.md).

## Acceptance Criteria

### Fungsionalitas Multi-Gelar UI & Penyimpanan
- [ ] Pengguna dapat menambahkan lebih dari 1 gelar pada `AccountSettingsModal` dengan memilih posisi Depan atau Belakang untuk masing-masing gelar.
- [ ] Admin dapat menambahkan/mengedit data guru di `AdminDataView` dengan lebih dari 1 gelar baik posisi Depan maupun Belakang.
- [ ] Input gelar memungkinkan penghapusan gelar individu sebelum form disimpan.
- [ ] Format nama yang dihasilkan menggabungkan seluruh gelar depan (spasi), nama pokok, dan gelar belakang (koma + spasi) secara tepat tanpa double spaces atau dangling commas.
- [ ] Nama tersimpan ke database dan diperbarui di sesi login, sidebar/header profil, serta tabel data guru.

### Integritas & Validasi
- [ ] Nama bergelar tidak memicu false-positive pada `isDummyOrTestString` atau `validateTeacherData` / `validateUserData`.
- [ ] Tidak ada penambahan dependensi pihak ketiga baru (pure native React & Tailwind/CSS).

### Verifikasi Teruji (Automated Test)
- [ ] Tersedia file pengujian otomatis (misal: `tests/multi_gelar_verification.test.ts`) yang memverifikasi skenario:
  - Nama tanpa gelar
  - Nama hanya dengan 1 atau beberapa gelar depan (e.g., `Dr. Ir. Budi Santoso`)
  - Nama hanya dengan 1 atau beberapa gelar belakang (e.g., `Siti Aminah, S.Pd., M.Pd.`)
  - Nama dengan kombinasi gelar depan dan belakang (e.g., `Prof. Dr. H. Ahmad Fauzi, S.Pd., M.Pd., Gr.`)
  - Penghapusan gelar dan penyesuaian format string
- [ ] Seluruh pengujian dalam skrip verifikasi tersebut berstatus `PASS` (exit code 0).


## 2026-10-27T10:23:49Z
You are swe_38, the SWE Light orchestrator (teamwork_preview_swe).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_38
Project root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Please read your dispatch instructions at:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_38\DISPATCH.md`
and the authoritative request in:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (header ## 2026-10-27T10:21:28Z).

Orchestrate the SWE Light workflow:
1. Initialize your BRIEFING.md and progress.md in your working directory.
2. Spawn an implementer (teamwork_preview_implementer) to make the code changes and write the automated verification test (`tests/multi_gelar_verification.test.ts`).
3. Run reviewer rounds (teamwork_preview_reviewer) with cumulative issue tracking and verify test execution.
4. Ensure git workflow is fulfilled (`git status`, `git add .`, `git commit -m "..."`, `git push origin main`).
5. Write handoff.md in your working directory and notify me when complete.
