# Implementer Task Dispatch

<original_task>
Hilangkan blok tanda tangan admin dari dokumen cetak di sipjam-app: ketika user yang sedang login memiliki role `admin` (atau `Admin`), komponen `PrintSignature` di `src/components/PrintHeader.tsx` tidak boleh merender blok tanda tangan sisi kiri (kolom admin/guru yang mencetak). Kolom tanda tangan Kepala Sekolah dan Pengawas tetap ditampilkan seperti biasa.

**This is a single self-contained fix; keep it small and focused.**

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Integrity mode: development

---

## Context

- Komponen utama: `PrintSignature` di `src/components/PrintHeader.tsx`
- Interface `PrintSignatureProps` sudah memiliki prop `user?: any`
- Pengecekan role admin yang sudah ada di codebase: `(user?.role || '').toLowerCase() === 'admin'` (lihat `AdminVerifView.tsx` L25)
- `PrintSignature` dipanggil dari: `AdminRekapView`, `DinasDashboard`, `DokumenView`, `GradebookView`, `PiketView`, `RaporView`, `RekapJurnalView`, `RekapSiswaView`
- Tanda tangan kiri adalah kolom pertama di layout flex `PrintSignature` — berisi jabatan + nama + NIP dari props `leftTitle/leftName/leftNip`

## Requirements

### R1. Sembunyikan tanda tangan kiri saat pencetak adalah admin

Jika `user?.role` (case-insensitive) adalah `'admin'`, `PrintSignature` tidak merender blok tanda tangan kiri (kolom `leftTitle`, `leftName`, `leftNip`, `leftSubtitle`). Kolom tanda tangan kanan (Kepala Sekolah) dan Pengawas tetap dirender normal.

Ubah hanya `PrintHeader.tsx`. Jangan ubah caller — prop `user` sudah diteruskan dari setiap caller.

### R2. Layout tidak rusak saat kolom kiri tidak ada

Ketika kolom kiri disembunyikan, kolom tanda tangan kanan (Kepala Sekolah) tetap terposisi rapi — tidak ada ruang kosong besar di kiri, tidak ada pergeseran layout yang aneh. Gunakan flag `singleColumn` yang sudah ada jika applicable, atau sesuaikan CSS minimal.

## Acceptance Criteria

### Logika role
- [ ] `user.role === 'admin'` → blok tanda tangan kiri tidak dirender sama sekali (tidak hanya invisible/hidden, benar-benar tidak ada di DOM)
- [ ] `user.role === 'Admin'` (kapital) → sama, tidak dirender
- [ ] `user.role === 'guru'` atau role lain → blok kiri tetap dirender seperti biasa
- [ ] `user` undefined/null → perilaku default tidak berubah (blok kiri tetap ada)

### Layout
- [ ] Saat role admin, kolom Kepala Sekolah masih terlihat dan posisinya tidak bergeser ekstrem
- [ ] Tidak ada TypeScript error baru

### Scope
- [ ] Hanya `PrintHeader.tsx` yang diubah
- [ ] Tidak ada prop baru yang ditambahkan ke caller manapun
- [ ] Commit dan push ke branch `dev` setelah selesai sesuai Git Workflow Rule

---
*Expecting this to run as one contained change on a small focused team — say so if you want it broken up.*
</original_task>

<additional_context>
- Git Workflow Rule: Whenever completing file modifications/additions/deletions, stage changes (`git add .`), commit with a descriptive message, and push to origin branch `dev` (`git push origin dev`, never `main`).
- Unit tests: Create/run automated tests demonstrating that all acceptance criteria are met. Run `npx tsc --noEmit` and the test suite (`npm test` or vitest/jest) to verify.
- Working directory for your coordination artifacts: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\implementer_1`. Put `handoff.md` and `progress.md` there.
- Report back with a clear Verification Record separating tested from untested claims.
</additional_context>
