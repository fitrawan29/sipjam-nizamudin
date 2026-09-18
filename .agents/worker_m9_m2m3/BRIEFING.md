# BRIEFING — 2026-09-18T12:45:00Z

## Mission
Complete all remaining items for Milestone 2 (Jurnal Kelas RBAC & menu visibility, class restrictions) and Milestone 3 (Friday checkout time UI & Teacher attendance exceptions UI, Piket live CameraSelfieCapture integration).

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m9_m2m3
- Original parent: d2dfd088-11e9-48f7-a9b6-d9a38d0c3b78
- Milestone: Milestone 2 & 3 (worker_m9_m2m3)

## 🔒 Key Constraints
- Files Owned Exclusively:
  * `src/components/AppScreen.tsx`
  * `src/components/RekapJurnalView.tsx`
  * `src/components/AdminConfigView.tsx`
  * `src/components/PiketView.tsx`
- Do not touch files owned by worker_m1: `src/lib/workflow.ts`, `src/components/TeacherDashboardView.tsx`, `src/components/PresensiView.tsx` (can read, but do not edit).
- Minimal change principle, genuine logic only.
- Strict git workflow per GEMINI.md: git status, git add ., git commit, git push origin.

## Current Parent
- Conversation ID: d2dfd088-11e9-48f7-a9b6-d9a38d0c3b78
- Updated: 2026-09-18T12:45:00Z

## Task Summary
- **What to build**:
  1. M2 (R3): In `AppScreen.tsx` & `RekapJurnalView.tsx`: Jurnal Kelas RBAC. Admin & Wali Kelas can access. Regular teachers cannot see menu, and direct access shows Access Denied. Wali Kelas filtered to their assigned class.
  2. M3 (R4): In `AdminConfigView.tsx`: Jam Pulang Hari Jumat (`jam_pulang_jumat` defaulting to '11:00') & Pengecualian Kehadiran Guru (fetch `data_guru`, toggle/selector for "Hanya wajib hadir saat hari mengajar", save to `pengaturan.guru_hanya_mengajar` / `data_guru.wajib_hadir_hanya_mengajar` compatible with workflow.ts).
  3. M3 (R5): In `PiketView.tsx`: Remove `<input type="file">` completely, mount live `CameraSelfieCapture` with facingMode toggle and watermark.
- **Success criteria**:
  - `npx tsc --noEmit` passes with 0 errors.
  - Tests in `tests/m9_2_3_verification.test.ts` pass via `npx tsx`.
  - Full handoff report generated.
  - Git committed and pushed.

## Change Tracker
- **Files modified**:
  * `src/components/AppScreen.tsx` — Jurnal Kelas RBAC, Wali Kelas assignment query, menu item visibility, and Terblokir view
  * `src/components/RekapJurnalView.tsx` — Props `initialMode` and `assignedKelas`, restricted class options for Wali Kelas, RBAC mode toggle
  * `src/components/AdminConfigView.tsx` — Jam Pulang Hari Jumat input, Pengecualian Kehadiran Guru selector, data_guru sync
  * `src/components/PiketView.tsx` — Removed `<input type="file">`, integrated `CameraSelfieCapture` with environment facingMode and preview
  * `tests/m9_2_3_verification.test.ts` — Comprehensive 20-point verification test suite
- **Build status**: `npx tsc --noEmit` exit code 0; `tests/m9_2_3_verification.test.ts` 20/20 PASS
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (TypeScript 0 errors, 20/20 automated tests passing)
- **Lint status**: 0 errors
- **Tests added/modified**: `tests/m9_2_3_verification.test.ts` (20 assertions covering M2 & M3)

## Loaded Skills
None required.

## Key Decisions Made
- `isWaliKelas` checks `user.role`, `user.wali_kelas`, `public.wali_kelas` table query, and `data_guru.wali_kelas` fallback.
- `AdminConfigView` persists exemptions to both `pengaturan.guru_hanya_mengajar` and `data_guru.wajib_hadir_hanya_mengajar` ensuring full compatibility.
- `PiketView` completely removed `<input type="file">` to enforce live camera capture.

## Artifact Index
- `.agents/worker_m9_m2m3/DISPATCH.md` — Assignment instructions
- `.agents/worker_m9_m2m3/BRIEFING.md` — Agent memory
- `.agents/worker_m9_m2m3/progress.md` — Progress tracker and heartbeat
