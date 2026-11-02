# Original User Request

## Approved Task Prompt — 2026-11-02T21:18:45Z

This is a single self-contained fix; keep it small and focused. Perbaiki tampilan jam datang dan jam pulang pada presensi gerbang piket agar menampilkan data waktu yang sesuai.

Integrity mode: development

## Requirements

### R1. Tampilan Jam Datang pada Presensi Gerbang Piket
Tampilkan waktu presensi/scan masuk pada kolom atau indikator jam datang presensi gerbang piket sesuai dengan catatan presensi kedatangan.

### R2. Tampilan Jam Pulang pada Presensi Gerbang Piket
Tampilkan waktu presensi/scan pulang pada kolom atau indikator jam pulang presensi gerbang piket jika sudah melakukan presensi pulang, dan tampilkan tanda '-' jika belum ada catatan presensi pulang.

## Acceptance Criteria

### Akurasi Tampilan Jam Presensi
- [ ] Kolom atau tampilan jam datang pada presensi gerbang piket menunjukkan waktu scan masuk yang tercatat.
- [ ] Kolom atau tampilan jam pulang pada presensi gerbang piket menunjukkan waktu scan pulang yang tercatat jika data sudah ada.
- [ ] Kolom atau tampilan jam pulang pada presensi gerbang piket menampilkan tanda '-' ketika belum terdapat data presensi pulang.
- [ ] Pengujian automated test yang relevan pada proyek berjalan tanpa error, atau alur tampilan presensi gerbang piket diverifikasi menampilkan data kedatangan dan kepulangan dengan benar.
