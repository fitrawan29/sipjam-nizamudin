# BRIEFING — 2026-09-17T10:35:50Z

## Mission
Survey codebase for R3 (Gradebook/Daftar Nilai) and R4 (Native VAPID PWA Push Notifications & Account Settings), analyzing existing implementations, schemas, APIs, components, and proposing detailed technical architecture and implementation plans.

## 🔒 My Identity
- Archetype: explorer
- Roles: survey, investigation, synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r3r4
- Original parent: 438061dd-8b26-44e8-acfe-051ab3586841
- Milestone: survey_r3_r4

## 🔒 Key Constraints
- Read-only investigation — do NOT implement project code
- Focus strictly on R3 (Gradebook) and R4 (Push Notifications & Account Settings)
- Deliver comprehensive handoff.md report with exact paths, line numbers, schemas, and plan

## Current Parent
- Conversation ID: 438061dd-8b26-44e8-acfe-051ab3586841
- Updated: 2026-09-17T10:35:50Z

## Investigation State
- **Explored paths**: `src/types/database.ts`, `supabase/migrations/`, `src/components/AppScreen.tsx`, `src/components/HomeView.tsx`, `src/components/GuruJurnal.tsx`, `src/components/AdminConfigView.tsx`, `src/components/AdminVerifView.tsx`, `src/components/AdminRekapView.tsx`, `src/components/AdminDataView.tsx`, `src/lib/workflow.ts`, `src/lib/driveUpload.ts`, `src/lib/supabaseClient.ts`, `tests/`
- **Key findings**:
  - R3: No TP or Grade tables currently exist. Relational schema designed (`tujuan_pembelajaran`, `asesmen_kolom`, `nilai_siswa`) supporting 1 Diagnostik, N Formatif, and M Sumatif per TP with multi-tenant RLS.
  - R4: No `sw.js` or `web-push` installed. Pure VAPID Web Push architecture designed with `public/sw.js`, `/api/push/subscribe`, `/api/push/validate`, and `push_subscriptions` table.
  - R4: `users` table lacks `avatar` column. Profile edit RPC `update_user_profile` designed to bypass RLS safely and allow avatar selection from 12 presets, username change, and password change.
  - R4: `getGuruDailyState()` lacks attendance exemption. Branching logic designed to exempt teachers with "Wajib Hadir Hanya di Hari Mengajar" on days without schedule, skipping Alpa in both `workflow.ts` and admin verif/rekap views.
  - R4: `AdminConfigView` has no target email setting. Integration planned with `email_tujuan_upload` key in `pengaturan` and `driveUpload.ts`.
- **Unexplored areas**: None. All R3 and R4 requirements fully surveyed and synthesized.

## Key Decisions Made
- Designed normalized 3-table structure (`tujuan_pembelajaran`, `asesmen_kolom`, `nilai_siswa`) to enforce exactly 1 Diagnostik and flexible Formatif & Sumatif counts per TP.
- Selected native `web-push` library with self-contained VAPID support for service worker `sw.js`.
- Selected SECURITY DEFINER RPC `update_user_profile` to guarantee teachers can update their own profile without tripping strict multi-tenant user table RLS check policies.
- Formulated comprehensive handoff report at `.agents/explorer_9_survey_r3r4/handoff.md`.

## Artifact Index
- .agents/explorer_9_survey_r3r4/DISPATCH.md — record of dispatch
- .agents/explorer_9_survey_r3r4/BRIEFING.md — persistent working memory
- .agents/explorer_9_survey_r3r4/progress.md — liveness heartbeat
- .agents/explorer_9_survey_r3r4/handoff.md — final survey report
