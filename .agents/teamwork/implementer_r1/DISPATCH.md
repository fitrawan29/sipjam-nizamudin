# Task Dispatch for Implementer (Round 1)

Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\implementer_r1
Project Root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

<original_task>
# Teamwork Project Prompt — Draft

> Status: Launched.
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: small focused team

This is a single self-contained fix; keep it small and focused.
Pastikan kamera yang digunakan di aplikasi tidak terlihat men-zoom (terpotong atau membesar) saat mengambil gambar.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Nonaktifkan Zoom/Crop di Kamera
Periksa komponen `src/components/CameraSelfieCapture.tsx`. Kemungkinan besar masalah zoom disebabkan oleh CSS `object-fit: cover` yang memotong (crop) video stream sehingga terlihat membesar, atau batasan (constraints) resolusi yang memaksa crop dari sisi hardware. Sesuaikan styling CSS (misalnya menggunakan `object-contain` atau mencocokkan aspect-ratio container secara presisi) atau sesuaikan `MediaStreamConstraints` agar tampilan kamera pas dan tidak terpotong/zoom.

## Acceptance Criteria

### Verifikasi Kode (Programmatic / Statis)
- [ ] CSS atau constraints pada elemen `<video>` di `CameraSelfieCapture.tsx` telah disesuaikan untuk menghindari efek "zoom" atau crop yang berlebihan.
- [ ] Tampilan kamera tetap rapi dan proposional (tidak penyok/distorsi).
</original_task>

<critical_rules>
1. GEMINI.md Git Workflow Rule:
Upon completing modifications/additions/deletions, check git status, stage changes (`git add .`), commit with descriptive message, and push to origin main automatically.
2. AGENTS.md Rule: Check Next.js rules in node_modules/next/dist/docs/ if writing any Next.js specific code.
</critical_rules>
