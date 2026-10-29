# Scope: Milestone 3 — Navigation Restructuring, URL Aliasing & Onboarding

## Architecture
- Dual-layer navigation routing via `src/lib/navigation.ts` (`VIEW_ALIASES` and `resolveRoute`).
- Streamlined sidebar menus in `ClaySidebar.tsx` and `AppScreen.tsx` across all 7 user roles matching `docs/REKOMENDASI_PENGGABUNGAN_FITUR_DAN_MENU.md`.
- Full backward compatibility for 8 legacy view IDs via routing & aliasing.
- Preserved AST string invariants for security/RBAC test suites in `AppScreen.tsx`.
- Word-matching `data-tour` selector in `OnboardingTutorial.tsx`.

## Milestones Status
| # | Milestone | Scope | Status |
|---|-----------|-------|:------:|
| M1 | Foundation & Normalization | ClayTabs, Jurnal, Presensi, Dinas Rekap | DONE |
| M2 | Functional Consolidation & Sub-Tabs | Gradebook+Rapor, AdminRekap+Analitik, AdminData+Blok, AdminConfig+Backup, AdminVerif+Dokumen, RekapSiswa | DONE |
| M3 | Navigation Restructuring, URL Aliasing & Onboarding | VIEW_ALIASES router, sidebar definitions for all 7 roles, AST test guard preservation, OnboardingTutorial selector | IN_PROGRESS |
| M4 | Final Milestone: Full E2E Test Pass & Adversarial Hardening | Pass 100% E2E tests (Tiers 1-4) published by E2E Testing Track, then Tier 5 adversarial hardening | PLANNED |

## Milestone 3 Work Breakdown
1. `src/lib/navigation.ts`: `VIEW_ALIASES` mapping 8 legacy view IDs to canonical views + default tabs, and `resolveRoute`.
2. `src/components/ClaySidebar.tsx` & `src/components/AppScreen.tsx`: Update menu lists for all 7 roles.
   - Guru Reguler: 6 menus
   - Wali Kelas: 7 menus
   - Guru Piket: 7-8 menus
   - Administrator: 8 menus
   - Kepala Sekolah: 6-7 menus
   - Pengawas Dinas: 2 menus
   - Superadmin: 3 platform + 5 satellite
   - Preserve AST invariant guards:
     - `{currentView === 'view-rapor' && (`
     - `{currentView === 'view-sistem-blok' && (`
     - `targetId === 'view-sistem-blok'`
     - `isReadOnly={isKepalaSekolah && !isAdmin && !isSuperadmin}`
3. `src/components/Onboarding/OnboardingTutorial.tsx`: Word-matching selector `[data-tour~="..."], [data-tour="..."]`.
4. `src/components/Onboarding/tutorialSteps.ts` and `src/components/Tutorial/tutorialData.ts`: Target tour IDs.
