# BRIEFING — 2026-11-12T06:39:00Z

## Mission
Perbaiki alur penyimpanan Jurnal KBM Guru (R1), pulihkan tampilan data guru pada Cetak Jurnal KBM (R2), dan sediakan verifikasi objektif komprehensif (R3) dengan pendekatan /ponytail.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
- State folder: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_kbm\
- Original parent: f8423969-31b1-4c71-9bae-1480d343ca6a
- Milestone: M1

## 🔒 Key Constraints
- Pendekatan /ponytail: ringkas, tepat sasaran, zero over-engineering, 0 dependensi eksternal baru.
- Kepemilikan file tulis eksklusif: `src/components/GuruJurnal.tsx`, `src/components/RekapJurnalView.tsx`, `tests/`.
- Preservasi penuh: 15 modul konsumen hilir, format cetak 12-kolom, alur presensi, checkout gate guru.
- Git Delivery wajib: `git status` -> `git add .` -> `git commit -m "fix(kbm): perbaiki alur simpan jurnal KBM guru dan pulihkan data cetak jurnal KBM"` -> `git push origin main`.
- Handoff report lengkap 5-komponen di `.agents/teamwork/worker_kbm/handoff.md`.

## Current Parent
- Conversation ID: f8423969-31b1-4c71-9bae-1480d343ca6a
- Updated: 2026-11-12T06:39:00Z

## Task Summary
- **What to build**:
  1. Perbaikan Penyimpanan Jurnal KBM di `GuruJurnal.tsx`:
     - Safe UUID generator fallback (`generateSafeId`) untuk konteks non-HTTPS/LAN.
     - Resilient Drive Upload (non-blocking jika error/timeout, draft teks tetap tersimpan).
     - Robust Schema Retry (`isSchemaColumnError` menangkap error 42703, PGRST204, & HTTP 400).
     - Dual-write `kegiatan_pembelajaran: kegiatan` & safe tenant fallback `sekolah_id`.
     - Harmonisasi sub-mode absensi & materi tanpa kehilangan data.
     - Form lock relaxation bila kelas & mapel sudah dipilih guru.
  2. Pemulihan Tampilan Data Guru pada Cetak Jurnal KBM di `RekapJurnalView.tsx`:
     - Tolerant `sekolah_id` query (`.or('sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null')`).
     - Isolasi auto-select wali kelas HANYA ke mode `kelas`, biarkan kelas kosong di mode `pribadi` agar semua kelas guru ditampilkan secara default.
     - In-memory matching mapel & kelas dengan `isJurnalMatchJadwal()` daripada SQL exact match kaku.
     - Fallback query identitas guru jika query utama 0 baris.
     - Preservasi cetak 12-kolom tanpa tertimpa placeholder sintetik bila data riil ada.
  3. Verifikasi & Pengujian Otomatis (R3):
     - `npx tsc --noEmit` PASS (0 errors).
     - `tests/guru_cetak_jurnal_kbm.test.ts` PASS (17 assertions).
     - `tests/jurnal_kbm_r1_r2_r3_verification.test.ts` PASS (32 assertions).
     - `tests/legacy_jurnal_backward_compatibility.test.ts` PASS (7 assertions).
     - `tests/jurnal_save_setelah_absensi_selesai.test.ts` PASS (12 assertions).
     - `tests/m1_resubmission_and_verif.test.ts` PASS (23 assertions).
     - `npm test` PASS (Seluruh suite regresi lolos 100%).
  4. Git Commit & Push ke `main`.
- **Success criteria**:
  - Simpan jurnal KBM guru berhasil tanpa error: COMPLETED.
  - Data jurnal tersimpan dan dapat dimuat kembali: COMPLETED.
  - Dokumen cetak jurnal KBM menampilkan kembali data lengkap (termasuk multi-kelas): COMPLETED.
  - 0 regresi, semua test pass: COMPLETED.
- **Interface contracts**: `SCOPE.md § Interface Contracts`
- **Code layout**: `SCOPE.md § Code Layout`

## Key Decisions Made
- Digunakan `generateSafeId()` dengan fallback `jrn_${Date.now()}_${Math.random()}`.
- Upload foto Drive dijadikan non-blocking agar materi KBM guru tidak pernah hilang akibat timeout drive.
- Auto-select wali kelas diisolasi murni ke `effectiveMode === 'kelas'`.

## Artifact Index
- `DISPATCH.md` — Intruksi penugasan dari orchestrator
- `BRIEFING.md` — Memori kerja implementer
- `progress.md` — Catatan progres pengerjaan
- `handoff.md` — Laporan serah terima akhir 5-komponen

## Change Tracker
- **Files modified**:
  - `src/components/GuruJurnal.tsx`: Resilient save, safe UUID, non-blocking upload, dual-write contract, schema error retry.
  - `src/components/RekapJurnalView.tsx`: Tolerant sekolah_id query, auto-select isolation, in-memory matching, fallback query.
  - `tests/jurnal_kbm_r1_r2_r3_verification.test.ts`: Test suite komprehensif 32 assertions.
- **Build status**: Pass (0 errors)
- **Pending issues**: None

## Quality Status
- **Build/test result**: All suites passed (100% PASS)
- **Lint status**: Clean
- **Tests added/modified**: `tests/jurnal_kbm_r1_r2_r3_verification.test.ts`

## Loaded Skills
- **Source**: C:\Users\Fitra\.gemini\config\plugins\ponytail\skills\ponytail\SKILL.md
- **Core methodology**: Solusi paling minimalis, ringkas, tepat guna, zero bloat, YAGNI.
