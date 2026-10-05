# SWE Light Orchestrator Dispatch (swe_15)

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

## Instructions
1. Follow SWE Light process:
   - Your working directory is `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_15`.
   - Spawn `teamwork_preview_implementer` for the implementation.
   - Run adversarial review with `teamwork_preview_reviewer` rounds.
   - Establish correctness with robust automated tests (`npm test` / vitest / jest).
2. Comply strictly with all user rules:
   - Git Workflow Rule (GEMINI.md): staging, commit, push origin main on completion.
   - AGENTS.md: Next.js conventions and breaking changes.
3. Write `plan.md` and keep `progress.md` updated in your working directory.
4. Report completion back to sentinel when ready.
