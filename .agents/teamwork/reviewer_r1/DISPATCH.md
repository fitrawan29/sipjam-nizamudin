# Reviewer Round 1 Task Dispatch

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

<prior_attempt>
> [!WARNING] **Skepticism Disclaimer**
> Highly confident in the DOM omission and layout logic based on automated static React markup assertions, but physical PDF/paper print spool layout was not visually observed.

## 1. What I changed
- `src/components/PrintHeader.tsx`:
  - Added case-insensitive admin role check: `const isAdmin = (user?.role || '').trim().toLowerCase() === 'admin'`.
  - Defined `const isSingleColumnLayout = Boolean(singleColumn || isAdmin)` and applied it to determine container flex styling, left signer block rendering, middle pengawas block rendering, and right Kepala Sekolah signer alignment.
  - When `user.role` is `'admin'` (or `'Admin'`, `'ADMIN'`), the left signature block (`leftTitle`, `leftSubtitle`, `leftName`, `leftNip`) is completely excluded from the rendered DOM.
  - Aligned Kepala Sekolah signature to the right (`justify-end ml-auto` with `w-64 ml-auto`) when single column and Pengawas is inactive; cleanly displayed Pengawas on the left and Kepala Sekolah on the right with `justify-between` when Pengawas is active.
- `tests/printHeader.test.ts`:
  - Added test suite 10 (subtests 10a–10g) verifying `PrintSignature` role-based rendering using `renderToStaticMarkup` across `admin`, `Admin`, uppercase `ADMIN`, `guru`, `undefined`, and `null` user roles, plus active pengawas combination.

## 2. Why
Satisfies task requirements R1 and R2 by removing redundant left signature blocks when printed by administrators while keeping the Kepala Sekolah column neatly aligned to the right without awkward whitespace or broken flex layout, preserving Pengawas and teacher print behavior.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/printHeader.test.ts`: 10/10 test suites passed (100% PASS).
  - `npx tsc --noEmit`: 0 TypeScript errors.
- **Shallow Verification (manual run only):**
  - Eyeballed raw SSR HTML string emitted by `renderToStaticMarkup` to ensure `data-testid="signature-left"` is completely absent from DOM rather than hidden via CSS.
- **Unverified aspects:**
  - Physical CSS print media rendering via actual browser print dialog (`window.print()`) onto physical paper/PDF.

## 4. Known Issues
None.

## 5. Untested Edge Cases & Next Step
- Reviewer should verify mobile device print dialog preview (iOS Safari and Android Chrome print stylesheets) to ensure no unexpected margin shifts occur under constrained viewports.
</prior_attempt>

<additional_context>
Open Issues Ledger:
- [implementer_1] Unverified aspect: Physical CSS print media rendering via actual browser print dialog (`window.print()`) onto physical paper/PDF.
- [implementer_1] Untested edge case: Mobile device print dialog preview (iOS Safari and Android Chrome print stylesheets) to ensure no unexpected margin shifts occur under constrained viewports.

Your job as adversarial reviewer is to try to BREAK the existing diff. Re-derive requirements independently. Inspect edge cases (e.g. role variations, whitespace, singleColumn combined with isAdmin, different caller component scenarios like AdminRekapView, DinasDashboard, DokumenView, GradebookView, PiketView, RaporView, RekapJurnalView, RekapSiswaView). Write adversarial tests, fix any defects found, verify with `npx tsx tests/printHeader.test.ts` and `npx tsc --noEmit`. If changes are made, commit and push to branch `dev`. Write your report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_r1\handoff.md`.
</additional_context>
