# Project: SIPJAM — Piket UI/State, QR Camera Fix, Sidebar Profile & Tutorial

## Architecture
- Framework: Next.js 16 (App Router / Pages, React 19, TypeScript, Tailwind CSS, Font Awesome 6).
- Navigation & Shell: `src/components/AppScreen.tsx` mounts subviews dynamically, handles sidebar navigation, header, and onboarding overlays.
- Picket Management & Attendance: `src/components/PiketView.tsx` provides QR code scanning (webcam + USB HID) and manual student attendance, plus picket teacher reporting.
- Tutorial & Documentation: `src/components/Tutorial/TutorialModal.tsx` + `tutorialData.ts` and `docs/PANDUAN_PENGGUNA.md`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Piket List State Preservation | Preserve full student list and class filter when clicking "Tandai Datang" (remove auto-filter query override) | M1 | ORIGINAL_REQUEST R1.1 |
| 2 | Piket UI Guru vs Admin | Provide compact view for Guru (streamlined roster, 1-tap attendance, no kiosk selector, hidden audit log) and detailed view for Admin | M1 | ORIGINAL_REQUEST R1.2 |
| 3 | QR Code Camera Repair | Fix conditional mounting ref lifecycle, callback ref, media stream sync, and desktop webcam constraint fallback in PiketView | M1 | ORIGINAL_REQUEST R2 |
| 4 | Sidebar User Profile | Display avatar, full name, and role badge (Guru, Wali Kelas, Admin, Superadmin) in navigation sidebar | M2 | ORIGINAL_REQUEST R3.1 |
| 5 | In-App Comprehensive Tutorial | Searchable, role-filtered in-app tutorial modal covering all 28 menus across Guru, Admin, and Superadmin | M2 | ORIGINAL_REQUEST R3.2 |
| 6 | Comprehensive Documentation Guide | Complete markdown manual in `docs/PANDUAN_PENGGUNA.md` covering all roles, menus, workflows, and troubleshooting | M2 | ORIGINAL_REQUEST R3.2 |
| 7 | Full Verification & Git Deployment | Programmatic tests, Next.js build verification, acceptance criteria checklist, git commit & push | M3 | GEMINI.md & Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Modul Piket UI/State & QR Camera Fix | `src/components/PiketView.tsx` (R1.1, R1.2, R2) | Survey completed | PLANNED |
| M2 | Sidebar Profile & Tutorial System | `src/components/AppScreen.tsx`, `src/components/Tutorial/*`, `docs/PANDUAN_PENGGUNA.md` (R3.1, R3.2) | Interface defined | PLANNED |
| M3 | Comprehensive Verification & Git Push | Test execution, build gate, git commit & push | M1, M2 | PLANNED |

## Code Layout
- `src/components/PiketView.tsx`: Owned by M1 Worker.
- `src/components/AppScreen.tsx`: Owned by M2 Worker.
- `src/components/Tutorial/`: Owned by M2 Worker.
- `docs/PANDUAN_PENGGUNA.md`: Owned by M2 Worker.
- `tests/`: Owned by M3 / Test Writers / Reviewers.

## Interface Contracts
### AppScreen ↔ PiketView
- `PiketView` receives `user: any` prop containing `user.id`, `user.nama`, `user.role`, `user.sekolah_id`.
- Role normalization in `PiketView`:
  ```tsx
  const roleNormalized = (user?.role || '').toLowerCase().replace(/\s+/g, '');
  const isAdmin = roleNormalized === 'admin' || roleNormalized === 'superadmin';
  const isGuru = roleNormalized === 'guru';
  ```
- Guru view: renders compact attendance mode (`compact = true`), streamlined student roster, hides 10-kiosk selector and raw 7-column live audit log table.
- Admin view: renders comprehensive kiosk station, 10-kiosk selector, 3 large metric stat cards, full 6-column student roster with cancel actions, and 7-column live audit log table.

### AppScreen ↔ Tutorial System
- `AppScreen.tsx` imports `TutorialModal` from `@/components/Tutorial/TutorialModal`.
- State `tutorialModalOpen: boolean` with trigger button in sidebar labeled `"Panduan & Tutorial Lengkap"`.
- Existing `"Lihat Tutorial Lagi"` button retained for interactive tour (`OnboardingTutorial.tsx`) to preserve backward compatibility.
