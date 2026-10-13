# DISPATCH — swe_21

## Identity & Role
- **Agent Type**: `teamwork_preview_swe` (SWE Light Orchestrator)
- **Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_21`
- **Parent Sentinel**: Sentinel (`9bec634d-53a8-4c3e-a76a-e281f410f50f`)
- **Authoritative Request**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- **Project Root**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Mission
Mengganti mekanisme presensi Dinas Luar pada guru: dari upload dokumen (Surat Tugas) menjadi pengambilan foto lokasi langsung melalui kamera lengkap dengan watermark waktu & koordinat GPS/lokasi, tanpa batasan radius lokasi dari sekolah.

## Requirements

### R1. Presensi Dinas Luar Menggunakan Kamera Foto Lokasi
Pada `src/components/GuruPresensi.tsx`, presensi tipe "Dinas Luar" (baik Datang maupun Pulang) tidak lagi menampilkan form upload dokumen (`<input type="file">`). Sebagai gantinya, gunakan `CameraSelfieCapture` yang mengambil foto kamera langsung dengan watermark waktu, nama guru, koordinat GPS, dan nama lokasi.

### R2. Tanpa Batasan Radius Lokasi
Presensi "Dinas Luar" bebas dari pembatasan radius GPS sekolah (`gps_radius`), sehingga guru dapat melakukan presensi dinas luar dari lokasi mana pun. Koordinat GPS dan alamat tetap tercatat dan ditampilkan pada data presensi. Status verifikasi langsung 'Diverifikasi' tanpa peringatan 'Di Luar Jangkauan'.

### R3. Transisi State Presensi Tanpa Hambatan
Sesuaikan logika `togglePresensiFields` dan `handleTipeAbsenChange` agar "Dinas Luar" dikategorikan sebagai presensi berbasis kamera (sama seperti "Sekolah"), sehingga perpindahan jenis presensi antara Sekolah dan Dinas Luar tidak memunculkan dialog peringatan pergantian foto/dokumen.

### R4. Folder Routing & Upload Google Drive
Pastikan foto Dinas Luar tetap diarahkan ke folder Google Drive `Presensi_DinasLuar` dengan penyimpanan link bukti yang tepat.

## Acceptance Criteria

### Fungsionalitas & Logika
- [ ] Memilih "Dinas Luar" memunculkan kamera `CameraSelfieCapture` (bukan input upload file surat tugas).
- [ ] Presensi Dinas Luar tidak dibatasi radius GPS (`gpsConfig.radius`) dan tidak memunculkan toast "Di Luar Jangkauan".
- [ ] Pergantian antara "Sekolah" dan "Dinas Luar" mempertahankan foto yang telah diambil tanpa peringatan salah tipe lampiran.
- [ ] Upload foto presensi Dinas Luar diarahkan ke folder `Presensi_DinasLuar`.

### Verifikasi & Integritas
- [ ] Seluruh automated test suite (`npm test`) lulus 100%.
- [ ] Lolos verifikasi tipe TypeScript tanpa error (`npx tsc --noEmit`).
- [ ] Lolos build produksi Next.js secara bersih (`npm run build`).
- [ ] Kode ringkas, minimal, tepat sasaran (prinsip Ponytail) tanpa abstraksi tambahan.
- [ ] Mematuhi aturan Git Workflow proyek per `GEMINI.md` (otomatis stage, commit deskriptif, dan push ke branch `main`).

## Execution Protocol
- Run the SWE Light loop: dispatch implementer, then run reviewer rounds.
- Maintain `progress.md` and `BRIEFING.md` in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_21`.
- Once verified, write `handoff.md` and report completion back to the Sentinel.
