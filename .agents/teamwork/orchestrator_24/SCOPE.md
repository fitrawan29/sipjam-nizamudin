# Project Scope: Restorasi Superadmin & Harmonisasi Dinas Pendidikan (orchestrator_24)

## Architecture
- `src/components/AppScreen.tsx`: Top navbar, sidebar navigation, view routing, tenant & satellite school switcher.
- `src/components/SuperadminView.tsx`: 3 tabs (`view-superadmin-overview`, `view-superadmin-jaringan`, `view-superadmin-dinas`).
- `src/components/DinasOverview.tsx` & related components: Scoped read-only monitoring and reporting for `dinas_pendidikan`.
- `tests/dinas_pendidikan_monitoring.test.ts`: Automated test suite for dinas role scoping and verification.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Navbar & Header Restoration | Restore clean original SIPJAM header, satellite dropdown, profile popup, theme toggle, remove `#FDF6EC` clay styling | M1 | Survey |
| 2 | Sidebar & Operational Menu | Restore original overlay sidebar, Portal Superadmin header, user card, satellite switcher, full operational menu for satellite schools, settings & tutorial modals | M2 | Survey |
| 3 | SuperadminView 3 Tabs | Horizontal tabs: Ringkasan Platform, Jaringan Sekolah, Akun Dinas Pendidikan | M3 | Survey |
| 4 | Dinas Pendidikan Preservation | Scoped read-only access to kota_kabupaten, drilldown, official GPS print, no mutation | M3 | Survey |
| 5 | Automated Verification & Git Delivery | Pass `tests/dinas_pendidikan_monitoring.test.ts` and `npm test`, clean build, push to `dev` branch | M4 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 0 | Survey | Map exact files, git history, current state of navbar, sidebar, SuperadminView, dinas role | none | IN_PROGRESS |
| 1 | Navbar & Header Restoration | Clean header, satellite switcher dropdown, original theme | M0 | PLANNED |
| 2 | Sidebar & Operational Menus | Original sidebar overlay, operational menu items, modals | M1 | PLANNED |
| 3 | SuperadminView & Dinas Preservation | 3 tabs sync, dinas role security and read-only isolation | M2 | PLANNED |
| 4 | Verification & Git Delivery | Run test suites, typecheck, build, git commit & push to origin dev | M3 | PLANNED |

## Interface Contracts
### Navbar / Header ↔ AppScreen
- Satellite school switcher updates `activeTargetSchool` / `selectedSekolah` state in `AppScreen`.
- View state switching matches `currentView`.
### Sidebar ↔ Modals & Views
- Settings button triggers `AccountSettingsModal`.
- Tutorial button triggers `TutorialModal` / interactive tour.
- Operational items route to corresponding views (`view-superadmin-*`, `view-master-data`, etc.).
### SuperadminView ↔ Dinas Account Management
- Superadmin assigns `kota_kabupaten` to dinas accounts.
- Dinas users login and get directed to `view-dinas-overview`.
