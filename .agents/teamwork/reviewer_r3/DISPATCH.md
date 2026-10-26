# Reviewer Round 3 Task Dispatch

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
> High confidence in DOM omission, CSS class fidelity, and static markup layout assertions across all 8 caller permutations, though physical printer hardware spooling onto physical A4 paper margins remains unprofiled in headless CI.

## 1. What the prior attempt got wrong
1. **Missing `page-break-inside-avoid` in Single-Column Print Layout**:
   - **Input**: `<PrintSignature user={{ role: 'admin' }} />` (or `singleColumn={true}`) rendered on documents that paginate near a page boundary.
   - **Expected**: The signature container must include `page-break-inside-avoid` to guarantee the signature block is never split across physical/PDF pages.
   - **Actual**: `containerClass` in single-column mode was `"print-only print-signature mt-10 flex justify-end ml-auto text-black"`, lacking the explicit `.page-break-inside-avoid` utility class present on the multi-column container.
   - **Root Cause**: The ternary branch for single-column layout in `src/components/PrintHeader.tsx` did not include `page-break-inside-avoid`.

2. **Absence of Real Caller Integration Simulations and Boundary Probes**:
   - **Input**: Real caller configurations (`AdminRekapView`, `DokumenView`, `RaporView` with `showKepalaSekolah={true}`, `RekapJurnalView`, `RekapSiswaView`), primitive non-object values passed as `user` (e.g. `'admin'`, `42`, `true`), whitespace/empty strings (`''`, `'   '`), and explicit `showPengawas: false`.
   - **Expected**: Concrete automated test assertions verifying that all real-world caller prop combinations render without layout breaks or regressions.
   - **Actual**: Prior test suite only tested basic isolated props, leaving multi-caller real patterns and primitive prop boundaries unexercised.
   - **Root Cause**: Tests were written only for isolated unit props rather than full caller pattern simulations.

## 2. What I changed
- `src/components/PrintHeader.tsx`:
  - Added `page-break-inside-avoid` to the single-column `containerClass`:
    `"print-only print-signature mt-10 flex justify-end ml-auto page-break-inside-avoid text-black"`
    This guarantees print page-break immunity for admin/single-column print signatures across all browsers and PDF print engines.
- `tests/printHeader.test.ts`:
  - Added comprehensive adversarial subtests (10m–10v):
    - 10m: `page-break-inside-avoid` class assertion on both single-column (admin) and multi-column (guru) containers.
    - 10n: Mixed-case role variations (`'aDmIn'`).
    - 10o: Primitive `user` props (`'admin'`, `42`) to verify no false positives or exceptions.
    - 10p: Null, undefined, empty, and whitespace roles (`null`, `undefined`, `''`, `'   '`).
    - 10q: Caller simulation for `AdminRekapView` (`leftSubtitle="Pengelola Data / Admin"`, `leftName=user?.nama`).
    - 10r: Caller simulation for `DokumenView` (`leftSubtitle="Pengelola Data / Admin"`).
    - 10s: Caller simulation for `RaporView` (`leftSubtitle="Orang Tua / Wali Murid"`, `showKepalaSekolah={true}`).
    - 10t: Caller simulation for `RekapJurnalView` (`admin` vs `guru`).
    - 10u: Caller simulation for `RekapSiswaView` (`user={{ role: 'Admin' }}`).
    - 10v: Explicit `showPengawas: false` override verification.
- `.agents/teamwork/reviewer_r2/handoff.md` and `progress.md`:
  - Documented findings, root causes, changes, and verification records for Round 2.
- Git Workflow:
  - Staged, committed, and pushed changes to `origin dev` (`commit db1f23d`).

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - `npx tsx tests/printHeader.test.ts`: 10/10 test suites passed (all subtests 10a–10v PASSED).
  - `npx tsc --noEmit`: 0 TypeScript compiler errors.
  - `npx tsx tests/kepsek_pengawas_rbac.test.ts`: 47/47 passed.
  - `npx tsx tests/dinas_pendidikan_monitoring.test.ts`: 25/25 passed.
- **Shallow Verification (manual only):**
  - Verified static HTML output emitted by `renderToStaticMarkup` ensures `data-testid="signature-left"` is absent for admin roles, and `data-testid="signature-right"` is aligned right with `page-break-inside-avoid`.
- **Unverified aspects:**
  - Physical browser print spooling to physical paper printer tray in headless environment.

## 4. Known Issues
- `Shallow Verification`: Physical printer driver hardware pagination cannot be inspected in a headless CLI environment; static DOM tree layout, CSS rules, and page-break classes are verified.

## 5. Remaining risk & next step
- No remaining defect or functional risk. All requirements (R1, R2, and all acceptance criteria) are satisfied. The task is complete.
</prior_attempt>

<additional_context>
Open Issues Ledger:
- [implementer_1] Unverified aspect: Physical CSS print media rendering via actual browser print dialog (`window.print()`) onto physical paper/PDF.
- [implementer_1] Untested edge case: Mobile device print dialog preview (iOS Safari and Android Chrome print stylesheets) to ensure no unexpected margin shifts occur under constrained viewports.
- [reviewer_r1] Known issue: Physical printer driver page pagination and margins cannot be directly inspected in a headless CLI environment; static DOM tree layout and CSS rules are verified.
- [reviewer_r2] Known issue: Physical printer driver hardware pagination cannot be inspected in a headless CLI environment; static DOM tree layout, CSS rules, and page-break classes are verified.

Your job as adversarial reviewer round 3 is the final adversarial refinement round.
Conduct an exhaustive audit:
1. Re-derive requirements independently from scratch.
2. Verify all acceptance criteria against `src/components/PrintHeader.tsx`.
3. Check for any remaining edge cases: e.g. what if `showPengawas` is true and `user.role === 'admin'`? What about when `customDate` or `date` is passed? What about responsive styles (`min-w-[180px] sm:min-w-[200px]`)?
4. Run tests and typecheck (`npx tsx tests/printHeader.test.ts`, `npx tsc --noEmit`).
5. If any issue is discovered, fix it and push to `origin dev`.
6. Record your full report in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_r3\handoff.md`.
</additional_context>
