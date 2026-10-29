# Scope: Milestone 3 & Milestone 4

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
| M3 | Navigation Restructuring, URL Aliasing & Onboarding | VIEW_ALIASES router, sidebar definitions for all 7 roles, AST test guard preservation, OnboardingTutorial selector | DONE |
| M4 | Final Milestone: Full E2E Test Pass & Adversarial Hardening | Pass 100% E2E tests (Tiers 1-4) published by E2E Testing Track, then Tier 5 adversarial hardening | IN_PROGRESS |
