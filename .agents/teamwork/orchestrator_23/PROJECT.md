# Project: SIPJAM — Role Baru `dinas_pendidikan` Executive Monitoring (R1-R5)

## Architecture
- **Stack**: Next.js 16 (App Router, `'use client'`), React 19, TypeScript, Tailwind CSS, Font Awesome 6 (CDN), SweetAlert2, Supabase (PostgreSQL + RLS).
- **Core RBAC & Context Layer**:
  - `src/types/user.ts`: `AppUser` interface updated with `role: 'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan'` and `kota_kabupaten?: string | null`.
  - `src/types/database.ts`: `users` table type updated with `kota_kabupaten?: string | null`.
  - `src/lib/supabaseClient.ts`: `getActiveTargetSchool()` updated to allow `dinas_pendidikan` with regional validation (`targetSchool.kota_kabupaten === user.kota_kabupaten`). Client-side mutation guard to reject POST/PUT/PATCH/DELETE for `dinas_pendidikan`.
- **Superadmin Assignment Layer**:
  - `src/components/SuperadminView.tsx`: Management panel for Dinas Pendidikan accounts (`users` with role `'dinas_pendidikan'`). Dropdown selection of `kota_kabupaten` derived from registered schools (`sekolah` / `sekolah_registry`).
- **Navigation & Dashboard Layer**:
  - `src/components/AppScreen.tsx`: Role detection `isDinas`, redirect on login to `view-dinas-overview`, menu list `menuItemsDinas`, UI navigation guard preventing access to data mutation views (`view-admin-data`, `view-admin-config`, `view-admin-backup`, `view-sistem-blok`, `view-admin-verif`).
  - `src/components/ClaySidebar.tsx`: Role badge `Dinas Pendidikan` (`fa-building-columns`), scoped target school switcher locked to `user.kota_kabupaten`.
  - `src/components/DinasDashboard.tsx`: Executive cross-school monitoring dashboard with Claymorphism aesthetic (ClayCard, ClayButton):
    - 5 Key Aggregate Metrics: Total Active Schools, Today's Teacher Attendance %, Today's Student Attendance %, Satellite Connection Health, Schools Needing Attention (High Alpa).
    - Regional Search and Status Filter (intra-wilayah).
    - School Drilldown button linking to school recaps via `setActiveTargetSchool`.
    - Official Regional Summary Print feature via `triggerPrintWithGps`, `PrintHeader`, and `PrintSignature`.
- **Drilldown & Print System**:
  - Views (`AdminRekapView`, `RekapSiswaView`, `RekapJurnalView`) receive `isReadOnly={true}` when accessed by `isDinas`. All mutation controls (add/edit/delete/verify) are hidden.
  - Documents printed from drilldown automatically use target school's Kop Surat & signatures.
  - Return to dashboard button in header/sidebar clears `sipjam_active_target_school` without session corruption.
- **Verification & Testing Layer**:
  - Test suite `tests/dinas_pendidikan_monitoring.test.ts` executed with `npx tsx` verifying 6 test suites (Superadmin assignment, regional scoping, read-only RBAC, aggregate metrics, drilldown lifecycle, and print system).
  - TypeScript compilation `npx tsc --noEmit` and `npm run build`.
  - Git delivery: `git add .`, `git commit -m "..."`, and `git push origin dev`.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | R1: RBAC Types & AppUser Interface | Add `dinas_pendidikan` role and `kota_kabupaten` to `src/types/user.ts` & `src/types/database.ts` | M1 | Survey 1, 2 | PLANNED |
| 2 | R1: Database Schema / Migration for Users Region | Migration SQL adding `kota_kabupaten` to `public.users` (nullable) | M1 | Survey 1 | PLANNED |
| 3 | R1: Superadmin Dinas Account Management | Add panel/tab in `SuperadminView.tsx` to create, edit region, and manage `dinas_pendidikan` accounts | M1 | Survey 1 | PLANNED |
| 4 | R1: Target School Regional Bound & Client Mutation Guard | Update `getActiveTargetSchool()` in `supabaseClient.ts` to authorize `dinas_pendidikan` with region check + reject mutations | M1 | Survey 1, 3 | PLANNED |
| 5 | R2: AppScreen Navigation & Role Gating | Add `isDinas`, `menuItemsDinas`, default view `'view-dinas-overview'`, and route-level mutation blocking in `AppScreen.tsx` | M2 | Survey 1, 2 | PLANNED |
| 6 | R2: ClaySidebar Dinas Badge & Regional Scoped Switcher | Add `Dinas Pendidikan` badge and regional filter on school switcher in `ClaySidebar.tsx` | M2 | Survey 2 | PLANNED |
| 7 | R2: Executive Cross-School Dashboard (`DinasDashboard.tsx`) | 5 metric cards, region-locked search & filter, school table, and aggregate data fetching | M2 | Survey 2 | PLANNED |
| 8 | R2: Official Regional Summary Printing | Print button in `DinasDashboard.tsx` with GPS coordinates, `PrintHeader`, and official regional table format | M2 | Survey 2, 3 | PLANNED |
| 9 | R3: Read-Only School Drilldown Integration | Select school to inspect teacher attendance, student attendance, and class journals via `activeTargetSchool` | M3 | Survey 2, 3 | PLANNED |
| 10 | R3: Drilldown Views Read-Only Mode & Mutation Protection | Pass `isReadOnly={true}` to `AdminRekapView`, `RekapSiswaView`, `RekapJurnalView` to hide mutation buttons | M3 | Survey 1, 3 | PLANNED |
| 11 | R3: Drilldown Target School Official Printing | Verify official Kop Surat & signatures print correctly for drilldown school views | M3 | Survey 3 | PLANNED |
| 12 | R4: Automated Test Suite (`tests/dinas_pendidikan_monitoring.test.ts`) | 6-suite programmatic verification covering R1-R4 passing via `npx tsx` | M4 | Survey 3 | PLANNED |
| 13 | R5: Build & TypeScript Verification | Run `npx tsc --noEmit` and `npm run build` with 0 errors | M5 | R5 | PLANNED |
| 14 | R5: Mandatory Git Delivery to `dev` | Execute `git status`, `git add .`, `git commit -m "..."`, and `git push origin dev` | M5 | GEMINI.md | PLANNED |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | RBAC, Data Model, & Superadmin Regional Assignment | `src/types/user.ts`, `src/types/database.ts`, migration SQL, `src/components/SuperadminView.tsx`, `src/lib/supabaseClient.ts` | none | PLANNED |
| M2 | Executive Scoped Dashboard & Navigation | `src/components/AppScreen.tsx`, `src/components/ClaySidebar.tsx`, `src/components/DinasDashboard.tsx` | M1 | PLANNED |
| M3 | Read-Only School Drilldown & Recaps + Printing | Integration of drilldown in `DinasDashboard`, `AppScreen`, `AdminRekapView`, `RekapSiswaView`, `RekapJurnalView` | M2 | PLANNED |
| M4 | Automated Test Suite & Security Guard | `tests/dinas_pendidikan_monitoring.test.ts` (6 suites) running via `npx tsx` | M1, M2, M3 | PLANNED |
| M5 | Final Verification, Build, & Git Delivery to `dev` | `npx tsc --noEmit`, `npm run build`, `npm test`, `git add .`, `git commit`, `git push origin dev` | M4 | PLANNED |

## Code Layout
- `src/types/user.ts`: Type definition for `AppUser` and roles.
- `src/types/database.ts`: Supabase database schema types.
- `supabase/migrations/20261024_dinas_pendidikan_role_and_region.sql`: Migration for `users.kota_kabupaten`.
- `src/lib/supabaseClient.ts`: `getActiveTargetSchool` and client-side mutation prevention guard.
- `src/components/SuperadminView.tsx`: Superadmin UI for managing Dinas Pendidikan accounts and assigning regions.
- `src/components/AppScreen.tsx`: Routing, navigation items, role detection, and route protection.
- `src/components/ClaySidebar.tsx`: Sidebar styling and scoped target school selection.
- `src/components/DinasDashboard.tsx`: Executive cross-school monitoring dashboard component.
- `tests/dinas_pendidikan_monitoring.test.ts`: Automated test suite.
