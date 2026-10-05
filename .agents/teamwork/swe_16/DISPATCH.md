# SWE Light Orchestrator Dispatch (swe_16)

## Target Mission
Presensi siswa: Mendukung QR code dan input manual dengan sinkronisasi dua arah. Jika QR discan, form manual terisi otomatis; jika diisi manual, form QR terupdate otomatis (jika relevan). Hapus opsi pengaturan mode presensi siswa oleh Superadmin.

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: benchmark

## Requirements

### R1. Sinkronisasi Dua Arah
Ketika kode QR discan, data harus otomatis mengisi form input manual. Sebaliknya, ketika pengguna mengetik data secara manual, sistem harus menyesuaikan state pencarian seolah-olah dipindai dari QR.

### R2. Hapus Pengaturan Mode Presensi oleh Superadmin
Superadmin tidak perlu lagi mengatur mode presensi siswa secara eksplisit, karena kedua mode (QR dan Manual) sekarang tersedia dan sinkron bersamaan. Hapus opsi konfigurasi ini dari UI superadmin dan logika terkait.

### R3. Pertahankan Logika Presensi Saat Ini
Mekanisme submit data presensi ke database tetap menggunakan flow yang sama, hanya pengisian field UI yang saling tersinkronisasi.

## Acceptance Criteria

### Verifikasi Manual User & Automated Tests
- [ ] Scan QR akan membuat nama/ID siswa langsung tampil di form manual.
- [ ] Mengisi form manual akan memproses data seolah telah disubmit via QR, atau membatalkan state QR lama jika berbeda.
- [ ] Opsi pengaturan mode presensi siswa tidak lagi muncul di halaman pengaturan superadmin.
- [ ] Unit & integration / component tests verify the two-way sync and absence of mode toggle in superadmin.
- [ ] Build dan typecheck (`npm run build` / `npx tsc --noEmit`) lulus tanpa error.
- [ ] Git commit & push dilakukan sesuai GEMINI.md.

## Context & Continuation Notes
- Previous iteration `swe_15` completed initial implementation and 2 review rounds (commits 8a2e822, 76922c2, a498436). All 26 test suites (106 checks) passed cleanly.
- Verify status, review round 3 / adversarial verification, ensure full compliance with requirements and GEMINI.md.
- Follow SWE Light protocol. Your working directory is `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_16`.
- Report completion back to Sentinel when verified.


## 2026-10-05T08:59:31Z
You are the SWE Light Orchestrator (swe_16).
Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_16.
Parent conversation ID: 09be5525-1f0c-43d1-8945-19103f91d138 (Sentinel).
Project repository root: c:\Users\Fitra\OneDrive\Documents\sipjam-app.

Refer to authoritative requirements in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md and dispatch instructions in c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_16\DISPATCH.md.

Context:
Previous iteration swe_15 completed initial implementation (commit 8a2e822), reviewer round 1 (commit 76922c2), and reviewer round 2 (commit a498436). All 26 test suites pass cleanly.
Conduct Reviewer Round 3 / final adversarial QA and independent test verification to ensure robust two-way sync, removal of superadmin mode settings, no regressions, clean typecheck and build, git status commit & push per GEMINI.md, and report completion back to Sentinel.
