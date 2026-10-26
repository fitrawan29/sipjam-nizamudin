# Reviewer Round 2 Task Dispatch

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
> High confidence in DOM omission and layout logic based on automated static React markup assertions and TypeScript type check, but physical print spooling via browser print dialog onto physical paper/PDF printer driver remains unverified in headless CLI.

## 1. What the prior attempt got wrong
1. **Fatal Runtime Crash on Non-String `user.role`**:
   - **Input**: `<PrintSignature user={{ role: 123 }} />`, `user={{ role: true }}`, or `user={{ role: {} }}`
   - **Expected**: Graceful fallback without crashing; renders default left signature block since role is not string `'admin'`.
   - **Actual**: Threw uncaught `TypeError: ((intermediate value) || "").trim is not a function`, causing a fatal crash of the React render tree.
   - **Root Cause**: In `src/components/PrintHeader.tsx`, line 354 used `(user?.role || '').trim().toLowerCase() === 'admin'`. Because `user` is typed as `any`, non-string truthy values for `user?.role` bypass `|| ''`, and calling `.trim()` on a number, boolean, or object immediately throws a TypeError.

2. **Omission of Adversarial Edge-Case Tests**:
   - **Input**: Non-string roles (`123`, `true`), whitespace variants (`' \n\tAdmin\r\n '`), non-admin roles (`'superadmin'`), and explicit `singleColumn={false}` with admin user.
   - **Expected**: Automated test assertions verifying all these edge cases.
   - **Actual**: Prior attempt only tested basic string variations (`'admin'`, `'Admin'`, `'ADMIN '`, `'guru'`, `undefined`, `null`).
   - **Root Cause**: Implementer did not write adversarial edge-case tests probing type boundaries or layout prop permutations.

## 2. What I changed
- `src/components/PrintHeader.tsx`:
  - Hardened role validation: changed `const isAdmin = (user?.role || '').trim().toLowerCase() === 'admin'` to `const isAdmin = typeof user?.role === 'string' && user.role.trim().toLowerCase() === 'admin'`. This ensures crash immunity against non-string role types (`number`, `boolean`, `object`) while safely preserving case-insensitive and trimmed string role matching.
- `tests/printHeader.test.ts`:
  - Added adversarial subtests 10h to 10l:
    - 10h: Non-string role (`number: 123`, `boolean: true`) - verifies no crash and left signature is rendered.
    - 10i: Whitespace/tabs/newlines (`' \n\tAdmin\r\n '`) - verifies left signature is omitted.
    - 10j: Non-admin role (`'superadmin'`) - verifies left signature is rendered.
    - 10k: Explicit `singleColumn={true}` with `user.role === 'guru'` - verifies single column layout works.
    - 10l: Explicit `singleColumn={false}` with `user.role === 'admin'` - verifies admin hides left signature even if `singleColumn={false}` is explicitly provided.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/printHeader.test.ts`: 10/10 test suites passed (all subtests 10a–10l PASSED).
  - `npx tsc --noEmit`: 0 TypeScript compiler errors.
  - `npx tsx tests/kepsek_pengawas_rbac.test.ts`: 47/47 passed.
  - `npx tsx tests/dinas_pendidikan_monitoring.test.ts`: 25/25 passed.
- **Shallow Verification (manual only):**
  - Verified static HTML string emitted by `renderToStaticMarkup` ensures `data-testid="signature-left"` is completely absent from DOM rather than hidden via CSS, and `data-testid="signature-right"` is aligned right.
- **Unverified aspects:**
  - Physical CSS print media rendering via actual browser print dialog (`window.print()`) onto physical paper/PDF.
  - Mobile device print dialog preview (iOS Safari and Android Chrome print stylesheets).

## 4. Known Issues
- `Shallow Verification`: Physical printer driver page pagination and margins cannot be directly inspected in a headless CLI environment; static DOM tree layout and CSS rules are verified.

## 5. Remaining risk & next step
- No remaining defect or functional risk. All requirements (R1, R2, and all acceptance criteria) are satisfied. The task is complete.
</prior_attempt>

<additional_context>
Open Issues Ledger:
- [implementer_1] Unverified aspect: Physical CSS print media rendering via actual browser print dialog (`window.print()`) onto physical paper/PDF.
- [implementer_1] Untested edge case: Mobile device print dialog preview (iOS Safari and Android Chrome print stylesheets) to ensure no unexpected margin shifts occur under constrained viewports.
- [reviewer_r1] Known issue: Physical printer driver page pagination and margins cannot be directly inspected in a headless CLI environment; static DOM tree layout and CSS rules are verified.

Your job as adversarial reviewer round 2 is to attempt to BREAK the current diff again.
Inspect:
1. Print CSS classes and media styles (`@media print`, `page-break-inside-avoid`, `print-only`, flex behavior on print). Does removing the left column cause any unexpected layout shifts or overlap when printed alongside other components like `PrintHeader` or when `showPengawas` is true?
2. Callers analysis: verify whether any of the callers (`AdminRekapView`, `DinasDashboard`, `DokumenView`, `GradebookView`, `PiketView`, `RaporView`, `RekapJurnalView`, `RekapSiswaView`) pass unexpected props or require specific layout behavior.
3. Write adversarial tests in `tests/printHeader.test.ts` or standalone test, fix any issues found, run `npx tsx tests/printHeader.test.ts` and `npx tsc --noEmit`.
4. Commit and push to `dev` if changes are made.
5. Record your report in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_r2\handoff.md`.
</additional_context>
