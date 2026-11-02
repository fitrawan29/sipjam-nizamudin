## 2026-11-02T08:26:01Z
You are teamwork_victory_auditor.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_victory_auditor_mapel

<original_task>
This is a single self-contained fix; keep it small and focused. Perbaiki mata pelajaran di jadwal pembelajaran agar mata pelajaran yang tidak ada seperti "teknik informasi" tidak dimasukkan dan hanya mata pelajaran valid seperti "informatika" yang digunakan, serta pastikan seluruh data master yang sudah diupload (data siswa, data guru, data jadwal pembelajaran, dan data kelas) tidak diubah atau disentuh sama sekali.

Integrity mode: development

## Requirements

### R1. Koreksi Mata Pelajaran pada Jadwal
Memastikan jadwal pembelajaran hanya memuat mata pelajaran yang valid (seperti informatika) dan meniadakan mata pelajaran yang tidak ada atau keliru (seperti teknik informasi). Pendekatan koreksi diserahkan kepada tim untuk menentukan apakah mencakup penyesuaian logika pemetaan/pembentukan jadwal dan pembersihan data jadwal yang keliru.

### R2. Perlindungan Data Master
Memastikan seluruh data master yang sudah di-upload (data siswa, data guru, data jadwal pembelajaran, dan data kelas) tidak disentuh atau dimodifikasi oleh proses perbaikan jadwal maupun proses sistem lainnya. Modul data master tetap difokuskan hanya untuk upload dan bukan untuk diubah-ubah.

## Acceptance Criteria

### Validitas Jadwal Pembelajaran
- [ ] Jadwal pembelajaran tidak memuat mata pelajaran yang tidak ada (misalnya "teknik informasi") dan hanya menampilkan mata pelajaran yang valid (misalnya "informatika").
- [ ] Jadwal pembelajaran dapat diakses dan ditampilkan dengan konsisten tanpa error atau referensi ke mata pelajaran yang keliru.

### Integritas Data Master
- [ ] Record data master siswa, guru, kelas, dan master jadwal yang sudah di-upload tidak mengalami perubahan (update) atau penghapusan (delete).
- [ ] Verifikasi independen membuktikan keutuhan data master tetap terjaga sebelum dan sesudah eksekusi perbaikan.
</original_task>

<claim_to_audit>
The team claims that the task is complete:
1. Jadwal pembelajaran and all related subsystems (AdminDataView, HomeViewAdmin, GuruJurnal, GradebookView, RaporView, AdminVerifView, DokumenView, RekapJurnalView, RekapSiswaView, send-reminders API, attendanceAlpa, and warningSystem) strictly filter, reject, and normalize invalid subjects (such as "teknik informasi", "teknologi informasi", "tekinfo", "TIK", and variations with punctuation or class prefixes), and only allow valid official subjects like "Informatika".
2. All master data originally uploaded from school CSV files (data_siswa 14 records, data_guru 12 records, data_mapel 39 records, jadwal_pelajaran 51 master records, and data_kelas 3 class levels) are 100% intact, untouched, and unedited.
3. Tests passing: `npx tsx tests/jadwal_mapel_validity_and_master_integrity.test.ts` (16/16), `npx tsc --noEmit` (0 errors), `npx tsx tests/matrix_teacher_collision_fix.test.ts` (100%).
</claim_to_audit>

Conduct your independent 3-phase audit (Phase 1: Timeline & Git log, Phase 2: Anti-cheating & test authenticity verification, Phase 3: Independent test execution).
Write your complete audit report with explicit verdict [VICTORY CONFIRMED] or [VICTORY REJECTED] to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_victory_auditor_mapel\audit_report.md
and send a message with your structured verdict.
