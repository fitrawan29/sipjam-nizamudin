# BRIEFING — 2026-10-03T07:31:45Z

## Mission
Implement Milestone 2: Form Jurnal KBM restructuring, camera orientation updates, Rekap Jurnal Pribadi table & print document update, Supabase migration & types, followed by verification and git push.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m2
- Original parent: 9158af2a-a31a-4d06-bc79-2701bb3d1192
- Milestone: Milestone 2 (Jurnal KBM Restructuring & Camera Orientation)

## 🔒 Key Constraints
- Baca node_modules/next/dist/docs/ sebelum menulis kode Next.js apapun.
- Git Workflow Rule (GEMINI.md): git status, git add ., git commit -m "...", git push origin main.
- Ponytail philosophy: Minimal changes, standard libraries, no over-engineering. Fewest files changed wins.
- Apply form changes ONLY to tipeJurnal === 'Jurnal KBM'. Keep 'Jurnal Kegiatan' intact.
- Apply table & print changes in RekapJurnalView ONLY to tabMode === 'pribadi'. Do NOT touch tabMode === 'kelas'.

## Current Parent
- Conversation ID: 9158af2a-a31a-4d06-bc79-2701bb3d1192
- Updated: 2026-10-03T07:31:45Z

## Task Summary
- **What to build**:
  1. Migration file `supabase/migrations/20261003_add_kktp_konten_lokasi_kbm.sql` & update `src/types/database.ts`
  2. GuruPresensi orientation: portrait / user
  3. GuruJurnal: Restructure Jurnal KBM form to 12 fields order, state for kktp, konten, lokasiKbm, validation, dual-write to materi/materi_pembelajaran, date DD-MM-YYYY read-only display.
  4. RekapJurnalView: Pribadi tab table & print document columns (No, Hari/Tanggal, TP, KKTP, Konten, Kegiatan, Kelas, Absensi, Lokasi KBM, Foto, Catatan), fallbacks, sync Excel/CSV export.
  5. Verification: `npx tsc --noEmit` & `npm run build`.
  6. Git commit & push.
- **Success criteria**: Zero TypeScript errors, build succeeds, git push succeeds, clean handoff.
- **Interface contracts**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_8\PROJECT.md`
- **Code layout**: Next.js App Router / React client components in `src/components/`.

## Key Decisions Made
- Maintained exact 12-field order for Jurnal KBM while preserving Jurnal Kegiatan form cleanly.
- Implemented robust fallback logic in RekapJurnalView table and CSV export.
- Formatted date display as DD-MM-YYYY read-only input while storing YYYY-MM-DD in state.
- Dual-wrote `konten` to `materi` and `materi_pembelajaran` for backward compatibility.

## Artifact Index
- `DISPATCH.md` — assignment dispatch
- `BRIEFING.md` — persistent memory
- `progress.md` — liveness heartbeat
- `handoff.md` — final handoff report
- `ponytail_skill.md` — local skill reference

## Change Tracker
- **Files modified**:
  - `supabase/migrations/20261003_add_kktp_konten_lokasi_kbm.sql` (created)
  - `src/types/database.ts` (added kktp, konten, lokasi_kbm to Row, Insert, Update)
  - `src/components/GuruPresensi.tsx` (explicit initialFacingMode="user")
  - `src/components/GuruJurnal.tsx` (12 fields restuctured, states, validations, payload, resets)
  - `src/components/RekapJurnalView.tsx` (11 columns for tabMode pribadi, fallbacks, aspect-video photo, CSV sync)
- **Build status**: PASS (`tsc --noEmit` exit code 0, `npm run build` exit code 0)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (zero errors)
- **Lint status**: Clean
- **Tests added/modified**: Verified through TypeScript typecheck and Next.js production build

## Loaded Skills
- **Source**: C:\Users\Fitra\.gemini\config\plugins\ponytail\skills\ponytail\SKILL.md
- **Local copy**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m2\ponytail_skill.md
- **Core methodology**: Simplest, minimal solution, standard libraries, fewest files changed.
