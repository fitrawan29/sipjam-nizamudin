Melanjutkan penyesuaian fungsional pada role admin aplikasi sipjam-app untuk kebutuhan produksi pada modul pusat verifikasi data (termasuk cetak dokumen presensi dan jurnal), laporan dan analitik kerja, asesmen dan rapor, master data, serta pengaturan sistem, dengan memastikan seluruh perubahan tidak merusak atau mempengaruhi fitur dan logika yang sudah ada (zero regression). Status: Milestone 1, 2, dan 3 telah selesai (DONE); fokus saat ini adalah melanjutkan ke Milestone 4 (M4) dan Milestone 5 (M5).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R5. Penyesuaian Pencadangan Data Sistem (`src/components/AdminBackupView.tsx`)
- Fitur pencadangan pada pengaturan sistem harus mencadangkan seluruh data yang ada dan berhubungan pada aplikasi (seluruh 33 tabel/entitas database yang diidentifikasi dari skema dan migrasi Supabase).
- Berkas cadangan dikemas dalam format ZIP (`backup_sipjam_<sekolah>_<timestamp>.zip`) dengan pemisahan folder `data/` (berisi seluruh tabel/entitas database dalam format JSON terstruktur: `data/<table_name>.json`) dan folder `foto/` (berisi foto/aset biner), serta `manifest.json`, namun tetap berada dalam satu berkas ZIP yang sama.
- Format data yang dicadangkan harus kompatibel dan dapat dibaca kembali oleh aplikasi di kemudian hari untuk proses pemulihan (restore) secara bertahap (topological order Level 0 s/d Level 5) serta memulihkan foto/aset.

### R6. Preservasi Fitur dan Logika Eksisting (Zero Regression — Milestone 5)
- Seluruh penyesuaian tidak boleh mempengaruhi fitur, alur kerja, maupun logika bisnis lain di luar cakupan yang ditentukan, dan seluruh fungsi aplikasi yang sudah berjalan tetap beroperasi normal.

## Acceptance Criteria

### Pencadangan Sistem
- [ ] Fitur pencadangan menghasilkan berkas ZIP yang memuat seluruh data aplikasi dengan struktur folder data (format JSON) dan folder foto yang terpisah.
- [ ] Format data JSON dan berkas foto dalam file cadangan terverifikasi dapat dibaca ulang oleh sistem aplikasi untuk pemulihan.

### Preservasi Sistem
- [ ] Fitur dan logika aplikasi yang sudah ada di luar 6 poin perubahan tetap berfungsi normal tanpa regresi fungsional (`npm test`, `npx tsc --noEmit`, `npm run build`, serta `git push origin main`).

## Verification Resources
- Tim membuat dan menjalankan automated test suite di folder `tests/` untuk memverifikasi fungsionalitas pencadangan/pemulihan ZIP dan zero regression, serta memvalidasi keutuhan sistem dengan `npm test`, `npx tsc --noEmit`, dan `npm run build`.
