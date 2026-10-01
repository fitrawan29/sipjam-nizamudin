# BRIEFING — 2026-10-01T11:25:55Z

## Mission
Implement R4 & R6: Jurnal Upload, GPS Geolocation & School Setting for Journal Mode.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m4
- Original parent: 99cc2021-9546-433d-8867-c45dc0860a07
- Milestone: Milestone 4 (Jurnal Upload, GPS Geolocation R4 & School Setting R6)

## 🔒 Key Constraints
- Exclusively modify ONLY:
  - `src/components/SuperadminView.tsx`
  - `src/components/GuruJurnal.tsx`
  - `src/components/AdminVerifView.tsx`
  - `src/components/RekapJurnalView.tsx`
- DO NOT modify `GuruPresensi.tsx`, `AccountSettingsModal.tsx`, `merge_accounts.sql`, or migration files.
- DO NOT CHEAT: genuine implementation, real state and real behavior. No dummy/facade implementations.
- Verify with `npx tsc --noEmit`.
- Git workflow rule: stage, commit, push upon completion.

## Current Parent
- Conversation ID: 99cc2021-9546-433d-8867-c45dc0860a07
- Updated: 2026-10-01T11:17:37Z

## Task Summary
- **What to build**:
  1. Superadmin Edit Sekolah & Tambah Sekolah modal: input for `mode_jurnal` ('camera_only' vs 'camera_upload').
  2. GuruJurnal: fetch school `mode_jurnal`. Render `<input type="file">` ONLY if `mode_jurnal !== 'camera_only'`.
  3. GuruJurnal: capture GPS via `navigator.geolocation.getCurrentPosition` in gallery upload handler. Send `latitude`, `longitude`, `lokasi`, `waktu_upload` to database on submit.
  4. AdminVerifView & RekapJurnalView: display GPS location badge and upload time if present.
- **Success criteria**:
  - `tsc --noEmit` passes with 0 errors.
  - Production build `npm run build` passes with 0 errors.
  - Verification criteria for R4 and R6 satisfied.
- **Interface contracts**: `PROJECT.md` § Interface Contracts (5. School Mode Jurnal & Geolocation).
- **Code layout**: `PROJECT.md` § Code Layout.

## Change Tracker
- **Files modified**:
  - `src/components/SuperadminView.tsx`: added mode_jurnal select input in add & edit modals and status badge in school table.
  - `src/components/GuruJurnal.tsx`: added school mode fetch, mode toggle (if allowed), conditional gallery upload input with GPS geolocation capture, and payload coordinates insertion.
  - `src/components/AdminVerifView.tsx`: added GPS location badge and upload timestamp display on journal items.
  - `src/components/RekapJurnalView.tsx`: added GPS location badge and upload timestamp display in both per-kelas and pribadi tables.
- **Build status**: PASS (`tsc --noEmit` and `npm run build` both code 0)
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (0 errors)
- **Lint status**: Clean
- **Tests added/modified**: Covered by M4 acceptance criteria and verified via typecheck and production build

## Loaded Skills
- None explicitly requested

## Key Decisions Made
- Used browser native `navigator.geolocation.getCurrentPosition` with high accuracy and fallback.
- Strictly conditioned `<input type="file">` rendering on `isUploadAllowed && uploadMode === 'gallery'`.

## Artifact Index
- `handoff.md` — Final handoff report
- `progress.md` — Progress tracker and heartbeat
