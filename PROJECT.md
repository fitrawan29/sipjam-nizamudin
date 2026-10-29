# Project: SIPJAM — Comprehensive Feature & Menu Consolidation

## Architecture
- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Font Awesome 6, SweetAlert2, Supabase.
- **Navigation Architecture**:
  - Single-Page Application (SPA) view switching controlled by `currentRoute` state in `AppScreen.tsx`.
  - Dynamic imports via `next/dynamic` for top-level modular views.
  - Reusable `<ClayTabs />` component (`src/components/ClayTabs.tsx`) providing tactile claymorphism tab navigation with badges, icons, role-aware visibility, and accessibility (`aria-selected`, `role="tablist"`).
- **Dual-Layer Backward-Compatible Aliasing**:
  - `VIEW_ALIASES` in `src/lib/navigation.ts` resolving all 8 legacy view IDs (`view-guru-rekap-jurnal`, `view-jurnal-kelas`, `view-history`, `view-rapor`, `view-analitik`, `view-rekap-guru`, `view-sistem-blok`, `view-admin-backup`) to their canonical view ID and default sub-tab.
  - Three-lifecycle router integration in `AppScreen.tsx`: (1) cold-start `useState` initialization from URL query `?view=...&tab=...`, (2) `popstate` event listener for browser history (back/forward), and (3) imperative `handleNavigation` navigation.
  - Source AST string compatibility branches in `AppScreen.tsx` preserving verbatim guard strings expected by existing automated security and RBAC test suites (`tests/adversarial_rapor_wali_security.test.ts`, `tests/kepsek_pengawas_rbac.test.ts`, `tests/sistem_blok_verification.test.ts`).
- **State Preservation (Zero Feature & Draft Loss)**:
  - In-memory keep-alive for sub-tabs using CSS display toggling (`hidden`) on form-heavy views (`GuruJurnal`, `GradebookView`, `GuruPresensi`).
  - Partitioned `localStorage` keys using `${userId}_${sekolahId}` to prevent cross-tenant cache bleeding.
- **Tour & Onboarding Preservation**:
  - `OnboardingTutorial.tsx` enhanced with word-matching selector `[data-tour~="..."], [data-tour="..."]`.
  - Sidebar buttons annotated with multi-id tour aliases.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | F1: Reusable ClayTabs Sub-Navigation Component | Tactile Claymorphism sub-tabs with badge counters, icons, and keyboard/aria accessibility | M1 | Survey | DONE |
| 2 | F2: Cluster 1 Jurnal Mengajar Normalization | Unify personal journal and class supervision rekap into single canonical view with sub-tabs | M1 | Survey | DONE |
| 3 | F3: Cluster 2 Guru Presensi & Riwayat Integration | Integrate live selfie attendance and attendance history into sub-tabs, eliminating standalone History menu | M1 | Survey | DONE |
| 4 | F4: Cluster 4 Dinas Read-Only Standardization | Consolidate view-rekap-guru into AdminRekapView with isReadOnly=true | M1 | Survey | DONE |
| 5 | F5: Cluster 3 Asesmen & Rapor Siswa Consolidation | Merge GradebookView and RaporView into unified Asesmen & Rapor with defense-in-depth RBAC | M2 | Survey | DONE |
| 6 | F6: Cluster 4 Laporan & Analitik Kinerja Convergence | Incorporate AnalitikView dashboard and leaderboard into AdminRekapView sub-tabs | M2 | Survey | DONE |
| 7 | F7: Cluster 5 Master Data & Kalender (Sistem Blok) | Embed SistemBlokView as Tab 6 in AdminDataView | M2 | Survey | DONE |
| 8 | F8: Cluster 5 Pengaturan Sistem & Database (Backup) | Embed AdminBackupView database sync as Tab 5 in AdminConfigView | M2 | Survey | DONE |
| 9 | F9: Cluster 6 Pusat Verifikasi & Supervisi Terpadu | Integrate curriculum document verification from DokumenView into AdminVerifView | M2 | Survey | DONE |
| 10 | F10: Cluster 7 Kesiswaan & Piket Harmonisasi | Harmonize RekapSiswaView gate logs and attendance with PiketView concurrency scanner | M2 | Survey | DONE |
| 11 | F11: Dual-Layer Aliasing Router (`VIEW_ALIASES`) | Implement `src/lib/navigation.ts` mapping legacy view IDs to canonical views + sub-tabs | M3 | Survey | PLANNED |
| 12 | F12: Sidebar Menu Restructuring Across All 7 Roles | Restructure sidebar items in AppScreen.tsx and ClaySidebar.tsx for Guru, Wali Kelas, Piket, Admin, Kepsek, Dinas, Superadmin | M3 | Survey | PLANNED |
| 13 | F13: Tour Selector Alignment & Tutorial Updating | Update OnboardingTutorial.tsx query selector, tutorialSteps.ts, and tutorialData.ts | M3 | Survey | PLANNED |
| 14 | F14: E2E Test Suite Creation & Verification (Tiers 1-4) | Comprehensive opaque-box test suite verifying navigation, aliasing, sub-tabs, RBAC, and zero feature loss | M4 | Survey | DONE |
| 15 | F15: Adversarial Hardening (Tier 5) & Code Integrity Verification | White-box stress tests, TypeScript check (`tsc --noEmit`), production build (`npm run build`), all 41 suites pass | M4 | Survey | PLANNED |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Foundation: Reusable Tabs & Component Normalization | ClayTabs component, Jurnal normalization, GuruPresensi sub-tab riwayat, Dinas read-only standardization | none | DONE |
| M2 | Functional Consolidation & Sub-Tabs | Asesmen & Rapor (C3), Laporan & Analitik (C4), Master Data & Sistem Blok/Backup (C5), Verifikasi Terpadu (C6), Kesiswaan (C7) | M1 | DONE |
| M3 | Navigation Restructuring, URL Aliasing & Onboarding | VIEW_ALIASES router, sidebar definitions for all 7 roles, AST test guard preservation, OnboardingTutorial selector | M2 | PLANNED |
| M4 | Final Milestone: Full E2E Test Pass & Adversarial Hardening | Pass 100% E2E tests (Tiers 1-4) published by E2E Testing Track, then Tier 5 adversarial hardening | M3 | PLANNED |

## Interface Contracts

### 1. Reusable Sub-Tabs (`src/components/ClayTabs.tsx`)
```typescript
export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string | number;
  badgeVariant?: 'mint' | 'amber' | 'rose' | 'blue';
  disabled?: boolean;
}

export interface ClayTabsProps {
  items: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}
```

### 2. Dual-Layer Routing & Aliasing (`src/lib/navigation.ts`)
```typescript
export interface RouteResolution {
  canonicalView: string;
  defaultTab?: string;
  isLegacyAlias: boolean;
}

export const VIEW_ALIASES: Record<string, { view: string; tab?: string }>;
export function resolveRoute(rawView: string | null, rawTab?: string | null): RouteResolution;
```

### 3. In-Memory Keep-Alive Contract
For form-heavy components (`GuruJurnal`, `GradebookView`, `GuruPresensi`), sub-tab switching MUST use CSS display toggling (`hidden`) for the input form:
```tsx
<div className={activeTab === 'input' ? 'block' : 'hidden'}>
  <InputForm ... />
</div>
<div className={activeTab === 'rekap' ? 'block' : 'hidden'}>
  <RekapView ... />
</div>
```

## Code Layout
- `src/components/ClayTabs.tsx`: Reusable claymorphism sub-tabs component.
- `src/lib/navigation.ts`: `VIEW_ALIASES` dictionary and `resolveRoute` function.
- `src/components/AppScreen.tsx`: Main router, sidebar menu definitions, lifecycle aliasing, and view mounts.
- `src/components/ClaySidebar.tsx`: Sidebar menu rendering and `data-tour` attribute output.
- `src/components/GuruJurnal.tsx`: Cluster 1 canonical view with sub-tabs (`input`, `rekap-pribadi`, `supervisi-kelas`).
- `src/components/GuruPresensi.tsx`: Cluster 2 canonical view with sub-tabs (`live`, `riwayat`).
- `src/components/GradebookView.tsx`: Cluster 3 canonical view with sub-tabs (`gradebook`, `rapor`).
- `src/components/AdminRekapView.tsx`: Cluster 4 canonical view with sub-tabs (`analitik`, `tabel`, `cetak`).
- `src/components/AdminDataView.tsx`: Cluster 5 canonical view with Tab 6 (`sistem_blok`).
- `src/components/AdminConfigView.tsx`: Cluster 5 canonical view with Tab 5 (`backup`).
- `src/components/AdminVerifView.tsx`: Cluster 6 canonical view with Tab 4 (`perangkat`).
- `src/components/RekapSiswaView.tsx`: Cluster 7 canonical view with sub-tabs (`gerbang`, `rekap`).
- `src/components/Onboarding/OnboardingTutorial.tsx`: Multi-selector query enhancement.
- `src/components/Onboarding/tutorialSteps.ts`: Target tour ID updates.
- `src/components/Tutorial/tutorialData.ts`: 16 unified tutorial modules.
- `tests/navigation_consolidation_verification.test.ts`: E2E test suite.
