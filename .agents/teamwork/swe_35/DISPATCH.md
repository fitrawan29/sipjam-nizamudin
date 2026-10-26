# Task Dispatch: swe_35

## Identity & Workspace
- Agent Type: `teamwork_preview_swe`
- Agent Instance: `swe_35`
- Working Directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_35`
- Authoritative Request: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (Header: `## 2026-10-26T14:27:41Z`)

---

## User Request

This is a single self-contained fix; keep it small and focused.

Pembersihan dead code, orphaned utilities, dan dependensi usang pada aplikasi SIPJAM (Next.js) dengan prinsip Ponytail (minimalis, YAGNI, dan eliminasi kode mati tanpa regresi).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: demo

## Requirements

### R1. Audit and Removal of Dead Code and Orphaned Utilities
Lakukan audit komprehensif untuk mendeteksi dan menghapus modul/fungsi/file yang tidak pernah diimpor atau dipanggil dalam alur aplikasi (seperti `src/utils/textUtils.ts` jika terbukti unreferenced, dead exports, dan helper usang), serta rapikan import yang tidak terpakai.

### R2. Dependency & Configuration Pruning
Periksa dependensi pada `package.json` dan konfigurasi terkait untuk mengeliminasi package yang sudah usang atau tidak digunakan lagi di kode aplikasi (mengikuti prinsip Ponytail untuk meminimalkan beban ketergantungan eksternal), dengan tetap memastikan dependensi yang dibutuhkan oleh runner tes tetap terjaga.

### R3. Zero Regression & Test Suite Preservation
Pastikan seluruh alur fungsional inti (Presensi, Jurnal, Piket, Rapor, Superadmin, Dinas) tidak terganggu dan seluruh rangkaian pengujian otomatis (`npm test`) tetap lulus 100% tanpa kegagalan.

## Verification Resources
- Test suite resmi: `npm test`
- Type checker: `npx tsc --noEmit`
- Linter: `npm run lint`

## Acceptance Criteria

### Dead Code & Dependency Elimination
- [ ] File atau utilitas yang teridentifikasi unreferenced / dead code (termasuk orphaned utilities) telah dihapus dari codebase.
- [ ] Tidak ada dead imports, sisa deklarasi tak terpakai, atau broken references yang tertinggal.
- [ ] Dependensi `package.json` yang usang/tidak terpakai telah dibersihkan secara aman tanpa merusak build.

### Integrity & Stability
- [ ] `npx tsc --noEmit` berjalan dengan exit code 0 tanpa error tipe TypeScript.
- [ ] `npm run lint` berjalan sukses tanpa error import atau syntax.
- [ ] Seluruh test suite `npm test` lulus 100% (semua sub-suite lolos tanpa kegagalan).
- [ ] Fitur utama aplikasi berjalan normal tanpa kehilangan fungsionalitas.

---

## Mandatory Constraints & Workflow Rules

1. **Git Workflow Rule (MANDATORY)**:
   Setiap kali selesai melakukan modifikasi, penambahan, atau penghapusan file dalam proyek ini:
   - Cek status git (`git status`)
   - Lakukan staging pada file yang berubah (`git add .`)
   - Buat commit dengan pesan yang deskriptif dan sesuai (`git commit -m "..."`)
   - Lakukan push ke origin branch pengembangan: `git push origin dev`
   - **JANGAN PERNAH** push ke branch `main`. Push HANYA ke branch `dev`.

2. **Next.js & Code Rules**:
   - Perhatikan Next.js 16 breaking changes.
   - Terapkan prinsip Ponytail: fewest files changed, do not add unnecessary abstractions or packages.

3. **Lifecycle & Coordination**:
   - Tulis rencana kerja di `plan.md` di folder kerja Anda.
   - Update `progress.md` secara berkala dengan progress terkini agar sentinel dapat memantau liveness dan melaporkan kemajuan.
   - Tulis laporan akhir di `handoff.md` di folder kerja Anda ketika seluruh kriteria penerimaan terpenuhi.
