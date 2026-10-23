# Dispatch Instructions for Independent Victory Auditor (victory_auditor_47)

## Identity & Working Directory
- **Agent Name**: victory_auditor_47
- **Agent Type**: teamwork_preview_victory_auditor
- **Working Directory**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_47
- **Project Root**: c:\Users\Fitra\OneDrive\Documents\sipjam-app
- **Authoritative Request**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (under section `## 2026-10-23T19:45:33Z`)

## Mission
Conduct an independent 3-phase post-victory audit (timeline & git diff inspection, cheating/mocking/stub detection, independent test execution & validation) on the Dinas Pendidikan Executive Monitoring implementation across Requirements R1 to R5.

## Acceptance Criteria to Audit

### 1. Superadmin Region Assignment & Scoped Access
- [ ] Akun Superadmin dapat mengatur/memperbarui daerah penugasan (`kota_kabupaten` / wilayah) pada akun dengan role `dinas_pendidikan` di `SuperadminView.tsx`.
- [ ] Pengguna `dinas_pendidikan` yang login hanya disajikan data sekolah yang berada di wilayah penugasan yang diberikan oleh Superadmin. Sekolah dari daerah lain tidak muncul di daftar maupun di metrik agregat.

### 2. RBAC & Read-Only Isolation
- [ ] Pengguna dengan role `dinas_pendidikan` langsung diarahkan ke tampilan dashboard dinas saat login (`view-dinas-overview`).
- [ ] Seluruh kontrol mutasi data (tambah/edit/hapus guru, siswa, kelas, setting sekolah, hapus presensi) disembunyikan dan dicegah untuk role `dinas_pendidikan` (baik di UI via `isReadOnly` maupun network layer mutation guard).

### 3. Region-Scoped Dashboard & Drilldown with Printing
- [ ] Dashboard dinas (`DinasDashboard.tsx`) menyajikan metrik agregat kehadiran hari ini khusus untuk sekolah-sekolah binaan di daerah penugasan.
- [ ] Pengguna dinas dapat memilih sekolah binaan untuk melihat rekap detail presensi secara read-only dan dapat kembali ke dashboard tanpa merusak session (`clearActiveTargetSchool`).
- [ ] Tersedia tombol/fitur cetak laporan resmi (rekap agregat daerah dan rekap per sekolah) menggunakan komponen cetak standar SIPJAM (`PrintHeader`, `PrintSignature`, `triggerPrintWithGps`).

### 4. Programmatic Proof & Git Delivery
- [ ] Test suite baru lolos pengujian tanpa error (`npx tsx tests/dinas_pendidikan_monitoring.test.ts`).
- [ ] Full regression suite lolos (`npm test`).
- [ ] `npx tsc --noEmit` lolos tanpa kompilasi error.
- [ ] `npm run build` lolos tanpa error.
- [ ] Seluruh perubahan file ter-staging, ter-commit, dan ter-push ke branch **`dev`** (`git push origin dev`). Branch `main` tidak disentuh.

Conduct your 3-phase verification independently. Report a structured verdict: `VICTORY CONFIRMED` or `VICTORY REJECTED`.


## 2026-10-23T21:38:12Z
You are the Independent Victory Auditor (victory_auditor_47).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_47
Authoritative request file: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (under section ## 2026-10-23T19:45:33Z)
Dispatch file: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_47\DISPATCH.md
Project root is: c:\Users\Fitra\OneDrive\Documents\sipjam-app

Conduct an independent 3-phase post-victory audit on the Dinas Pendidikan Executive Monitoring implementation across Requirements R1 to R5:
Phase 1: Timeline & Git Diff Inspection (inspect git log, files changed, verify branch dev, ensure origin/dev pushed, verify main branch was not touched).
Phase 2: Cheating & Logic Regression Detection (verify genuine implementation, zero facades, zero mocks, zero hardcoded cheat strings).
Phase 3: Independent Test Execution & Verification:
- Execute `npx tsx tests/dinas_pendidikan_monitoring.test.ts` (verify all 25 assertions pass).
- Execute `npx tsc --noEmit` (must pass with 0 errors).
- Execute `npm run build` (must exit 0 cleanly).
- Execute `npm test` (full regression test suite).
- Verify read-only enforcement, regional scoping, Superadmin region assignment, and official printing.

Deliver your structured findings and final verdict (VICTORY CONFIRMED or VICTORY REJECTED) in your handoff.md and send a structured notification message back to the Sentinel.
