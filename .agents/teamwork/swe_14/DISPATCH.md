# SWE Light Orchestrator Dispatch (swe_14)

## Target Mission
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

## Instructions
1. Follow SWE Light process:
   - Spawn teamwork_preview_implementer for the whole task.
   - Run repeated teamwork_preview_reviewer rounds carrying a cumulative open-issues ledger.
   - Establish correctness by running automated tests rather than by claims about the code.
2. Comply with project rules (Next.js breaking changes, Git Workflow Rule, etc.).
3. Write plan.md and maintain progress.md in your working directory.
4. Report completion back to sentinel when ready.

## 2026-10-04T23:44:16Z
[Message] timestamp=2026-10-04T23:44:16Z sender=76aac5fc-77cd-42ff-8e09-c43cb7536bfa priority=MESSAGE_PRIORITY_HIGH content=You are SWE Light Orchestrator (swe_14).
Mission:
Perbaikan sebelumnya gagal. Kamera presensi guru masih landscape dan masih auto-zoom. Perbaiki agar benar-benar portrait dan tidak zoom.
