# DISPATCH — swe_22

## Identity & Role
- **Agent Type**: `teamwork_preview_swe` (SWE Light Orchestrator)
- **Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_22`
- **Parent Sentinel**: Sentinel
- **Authoritative Request**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- **Project Root**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Mission
Otomatisasi verifikasi presensi guru, jurnal pembelajaran, dan laporan piket secara real-time saat pengajuan dibuat di aplikasi SIPJAM, dengan mempertahankan antrean persetujuan manual untuk pengajuan bersyarat khusus.

## Requirements

### R1. Otomatisasi Verifikasi Presensi Guru
Sistem secara otomatis menetapkan status verifikasi `Disetujui` saat presensi diajukan jika memenuhi kriteria kehadiran normal (berada dalam radius sekolah atau dinas luar valid, serta izin/sakit singkat). Pengajuan yang memerlukan persetujuan admin (sakit >= 3 hari, izin > 3 hari, atau di luar radius) tetap berstatus `Menunggu`.

### R2. Otomatisasi Verifikasi Jurnal Pembelajaran
Sistem secara otomatis menetapkan status verifikasi `Disetujui` saat jurnal pembelajaran dikirim jika kelengkapan data wajib (materi, kegiatan, absensi siswa) terpenuhi dan bukti foto kegiatan terlampir. Jurnal yang tidak memenuhi kelengkapan tetap berstatus `Menunggu`.

### R3. Otomatisasi Verifikasi Laporan Piket
Sistem secara otomatis menetapkan status verifikasi `Disetujui` saat laporan piket diserahkan jika rekap absen kelas terisi dan bukti foto apel/kegiatan piket terlampir. Laporan yang belum lengkap tetap berstatus `Menunggu`.

### R4. Kompatibilitas Admin Dashboard & Penolakan Manual
Halaman Admin Verifikasi tetap dapat menampilkan filter pengajuan ('Semua', 'Menunggu', 'Disetujui', 'Ditolak') dan memberikan hak kepada Admin untuk membatalkan/menolak (`Ditolak`) dengan catatan alasan penolakan, serta menyetujui manual pengajuan yang berstatus `Menunggu`.

## Acceptance Criteria

### Automated Verification Logic
- [ ] Presensi kehadiran normal dalam radius atau izin/sakit singkat otomatis tersimpan dengan `status_verifikasi = 'Disetujui'`.
- [ ] Presensi izin > 3 hari atau sakit >= 3 hari (`memerlukan_persetujuan_admin = true`) tetap tersimpan dengan `status_verifikasi = 'Menunggu'`.
- [ ] Jurnal pembelajaran dengan materi, kegiatan, absensi siswa, dan bukti foto lengkap otomatis tersimpan dengan `status_verifikasi = 'Disetujui'`.
- [ ] Laporan piket dengan rekap absensi kelas dan bukti foto lengkap otomatis tersimpan dengan `status_verifikasi = 'Disetujui'`.
- [ ] Admin pada AdminVerifView tetap dapat meninjau, menyetujui manual pengajuan yang berstatus `Menunggu`, atau menolak pengajuan apa pun dengan alasan penolakan.
- [ ] Validasi build dan typecheck (`npx tsc --noEmit` & `npm run build`) berhasil tanpa error.
- [ ] Seluruh automated test suite (`npm test`) lulus 100%.
- [ ] Mematuhi aturan Git Workflow proyek per `GEMINI.md` (otomatis stage, commit deskriptif, dan push ke branch `main`).

## Execution Protocol
- Run the SWE Light loop: dispatch implementer, then run reviewer rounds.
- Maintain `progress.md` and `BRIEFING.md` in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_22`.
- Once verified, write `handoff.md` and report completion back to the Sentinel.
