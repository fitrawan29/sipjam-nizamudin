## 2026-10-29T14:34:05Z
You are teamwork_spec_miner for Milestone 3 (Navigation Restructuring, URL Aliasing & Onboarding).
Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\spec_miner_m3_gen1\

MANDATORY FIRST STEP:
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.

READ-ONLY TASK:
Investigate the specification and test requirements for navigation consolidation in:
1. docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md
2. tests/navigation_consolidation_verification.test.ts
3. PROJECT.md and TEST_READY.md

Specifically extract and document:
1. The exact dictionary of VIEW_ALIASES required for backward compatibility:
   - All 8 legacy view IDs:
     - view-guru-rekap-jurnal -> view-guru-jurnal (tab: rekap-pribadi)
     - view-jurnal-kelas -> view-guru-jurnal (tab: supervisi-kelas)
     - view-history -> view-guru-presensi (tab: riwayat)
     - view-rapor -> view-gradebook (tab: rapor)
     - view-analitik -> view-admin-rekap (tab: analitik)
     - view-rekap-guru -> view-admin-rekap (tab: tabel)
     - view-sistem-blok -> view-admin-data (tab: sistem_blok)
     - view-admin-backup -> view-admin-config (tab: backup)
   - Function signature and behavior of `resolveRoute(rawView, rawTab)`.
2. Exact menu lists and counts for all 7 user roles according to the recommendation document and test suite:
   - Guru Reguler (target: 6 menus)
   - Wali Kelas (target: 7 menus)
   - Guru Piket (target: 7-8 menus)
   - Administrator (target: 8 menus, zero-scroll geometry)
   - Kepala Sekolah (target: 6-7 menus)
   - Pengawas Dinas (target: 2 menus)
   - Superadmin (target: 3 platform + 5 satellite)
3. The exact test requirements in `tests/navigation_consolidation_verification.test.ts` regarding navigation, URL aliasing, role navigation counts, and tour selectors.

Scope Boundaries:
- READ-ONLY. Do NOT write or edit source code files.
- Write your findings to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\spec_miner_m3_gen1\analysis.md` and `handoff.md`.
- Report back when done.
