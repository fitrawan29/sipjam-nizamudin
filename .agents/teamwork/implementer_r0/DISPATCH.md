# Dispatch for implementer_r0

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\implementer_r0

<original_task>
# Teamwork Project Prompt

> Requested team: Small focused team

This is a single self-contained fix; keep it small and focused.
Perbaikan sebelumnya gagal. Kamera presensi guru masih landscape dan masih auto-zoom. Perbaiki agar benar-benar portrait dan tidak zoom.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: benchmark

## Requirements

### R1. Kamera Benar-benar Portrait
Kamera harus dirender dan menangkap gambar dalam rasio portrait (tinggi > lebar) tanpa distorsi atau rotasi yang salah di perangkat sebenarnya, bukan sekadar set parameter `orientation` palsu.

### R2. Hentikan Auto-zoom/Crop di Level CSS dan Canvas
Gambar akhir yang diambil harus 100% identik dengan area yang terlihat di preview. Tidak boleh ada pemotongan (crop) atau zoom saat diproses.

## Acceptance Criteria

### Pengujian Bukti Kuat (Strong Verification)
- [ ] Terdapat bukti pengujian (seperti screenshot/log render dimensi) bahwa elemen video memiliki height > width.
- [ ] Terdapat script/tes UI yang memastikan kanvas hasil tangkapan memiliki rasio yang sama persis dengan elemen video.
</original_task>
