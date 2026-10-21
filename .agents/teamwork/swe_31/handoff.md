# Completion Handoff: Role-Based Menu Visibility, Kepala Sekolah Admin Monitoring, & Pengawas Bina Signature

## Milestone State
- [x] **R1: Visibilitas Menu Berdasarkan Penugasan Peran (Wali Kelas vs Guru Biasa)**: Done & Verified.
  - Non-wali regular teachers cannot see or access Presensi Siswa (`view-rekap-siswa`), Jurnal Kelas (`view-jurnal-kelas`), and Rapor (`view-rapor`).
  - Active Wali Kelas teachers retain full visibility and access.
  - JSX conditional route guards prevent direct URL manipulation bypass.
- [x] **R2: Penunjukan Kepala Sekolah & Akses Monitoring Admin (Read-Only)**: Done & Verified.
  - Dropdown in `AdminConfigView` allows selecting any registered teacher as Kepala Sekolah.
  - Automatically syncs name, NIP, `kepala_sekolah_id` to `pengaturan`, `sekolah`, and `data_guru.is_kepala_sekolah`.
  - Kepala Sekolah receives admin monitoring menu (`menuItemsKepalaSekolah`: Rekap Presensi, Verifikasi, Analitik, Jurnal Kelas, Presensi Siswa).
  - Admin views are in view-only / read-only mode (`isReadOnly`), hiding/disabling mutations, approvals, rejections, deletions, and attendance overrides.
  - Dual-role teachers (Wali Kelas + Kepala Sekolah) can edit their own homeroom class while other school classes remain read-only.
- [x] **R3: Opsi Tanda Tangan Pengawas Bina & Pengaturan Identitas**: Done & Verified.
  - Toggle switch in `AdminConfigView` for enabling/disabling Pengawas Bina signature.
  - Text inputs for Full Name, NIP/NIK, and Jabatan/Sebutan Pengawas.
  - When enabled: 3-column / endorsement signature block (`PrintSignature`) rendered across all documents (Jurnal Pembelajaran KBM, Jurnal Kegiatan, Rekap Presensi Siswa, Rekap Jurnal Kelas & Pribadi, Laporan Piket, Rekap Nilai, Dokumen).
  - When disabled: standard 2-column signature block rendered without supervisor.
  - Multi-tenant scoping enforced across all views with `user` and `sekolahId`.
- [x] **Iterative Refinement & Verification Floor**: 1 implementation round + 3 adversarial review rounds + 1 independent victory audit.
- [x] **Test Verification**: 47/47 assertions passed in `tests/kepsek_pengawas_rbac.test.ts`; 36/36 test suites passed in `npm test` (100% pass).

## Active Subagents
- `df52c69c-603b-4ca0-a4e9-8671fd935b55` (`teamwork_preview_implementer`): Completed (commit `eddee99`).
- `db0f6c50-5f88-4988-84f6-fd40d864d675` (`teamwork_preview_reviewer` Round 1): Completed (commit `2b2d4f4`).
- `9cf7a5f1-234d-494f-94da-27a45a45d578` (`teamwork_preview_reviewer` Round 2): Completed (commit `8550016`).
- `17dc0af3-f3bd-4433-8db1-23cb00fc3c6b` (`teamwork_preview_reviewer` Round 3): Completed (commit `ae4ffb4`).
- `ed2ed20f-d617-440d-9d17-3281d49cc2b2` (`teamwork_preview_victory_auditor`): Completed with `VICTORY CONFIRMED`.

## Pending Decisions
- None. All requirements and acceptance criteria have been fully resolved, implemented, and verified.

## Remaining Work
- None. The task is fully complete.

## Key Artifacts
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_31\BRIEFING.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_31\progress.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_31\DISPATCH.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\auditor_1\handoff.md`
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\tests\kepsek_pengawas_rbac.test.ts`

## Technical Summary
- Commits delivered:
  - `eddee99 feat: rbac menu perwalian, kepala sekolah admin monitoring, dan tanda tangan pengawas bina`
  - `2b2d4f4 fix(rbac): resolve dual-role homeroom editing, kepala sekolah jurnal monitoring, and multi-tenant signature scoping`
  - `8550016 fix(rbac): harden admin route guards, tenant isolation, and homeroom signature resolution`
  - `ae4ffb4 fix(review-r3): harden headmaster designation resolution and complete supervisor position input`
