# BRIEFING — 2026-11-11T03:28:00Z

## Mission
Investigate Requirement R3 (Staff TU / non-KBM jurnal & roles), cross-cutting concerns (admin views, workflow, warning systems), and verification setup (build/test commands) for SIPJAM app.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
- State folder: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r3
- Original parent: 59588c2c-30d7-43ba-9674-4233e746c526
- Milestone: Milestone 1 — Comprehensive Codebase Exploration

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT edit project source code
- Produce structured 5-component handoff report

## Current Parent
- Conversation ID: 59588c2c-30d7-43ba-9674-4233e746c526
- Updated: 2026-11-11T03:28:00Z

## Investigation State
- **Explored paths**:
  - `package.json`, `tsconfig.json`
  - `src/types/user.ts`, `src/types/database.ts`
  - `src/lib/navigation.ts`, `src/lib/supabaseClient.ts`, `src/lib/workflow.ts`, `src/lib/attendanceAlpa.ts`, `src/lib/warningSystem.ts`
  - `src/components/AdminConfigView.tsx`, `src/components/AdminPenggunaView.tsx`, `src/components/AdminRekapView.tsx`, `src/components/AdminVerifView.tsx`
  - `src/components/GuruJurnal.tsx`, `src/components/RekapJurnalView.tsx`, `src/components/HomeViewGuru.tsx`, `src/components/HomeViewTU.tsx`, `src/components/GuruPresensi.tsx`
- **Key findings**:
  1. Build & Test commands: `npx tsc --noEmit` passes with 0 errors, `npm run lint` passes with 0 errors (223 warnings), `npm run build` generates static/dynamic routes with code 0. Unit tests run via `npx tsx tests/<test_name>.test.ts`.
  2. Role & TU distinction: `users.role` contains `'tata_usaha'`. TU staff are also in `data_guru` with `mata_pelajaran: 'Tata Usaha (Administrasi)'`. The system checks `role === 'tatausaha'` or `mata_pelajaran.includes('tata usaha')`.
  3. Jurnal Kegiatan vs Jurnal Pembelajaran: Single table `jurnal_pembelajaran`. Non-teaching journal is represented by `keterangan: 'Jurnal Kegiatan'`, `mapel: '-'`, `kelas: '-'`. In `GuruJurnal.tsx`, teachers with 0 KBM schedules auto-default to `'Jurnal Kegiatan'`. TU has dedicated menu item `{ id: 'view-guru-jurnal', label: 'Jurnal Kegiatan' }`.
  4. Root cause of "Bebas Presensi" for Guru/TU without KBM: In `AdminConfigView.tsx`, bulk button "Set Semua Hanya Hari KBM" sets all teachers in `data_guru` to `wajib_hadir_hanya_mengajar = true`. If school policy is `Hari_Mengajar_Saja` or teacher is exempt, `workflow.ts:1506-1514` and `attendanceAlpa.ts:410-413` see 0 KBM schedules and flag `state.isNonTeachingDay = true; state.bebasAlpa = true; state.lockedReason = 'Hari ini tidak ada jadwal mengajar (Bebas Kehadiran).'`. This locks them out of doing Presensi Datang, Pulang, and Jurnal.
  5. Edit/Delete Jurnal KBM (R2): Currently `RekapJurnalView.tsx` only has a view-only "Detail" button (`selectedJurnal`). No edit or delete capability exists in the UI for role Guru. Adding edit/delete requires row action buttons, ownership check (`j.user_id === user.id || j.nama_guru === user.nama`), delete call to `supabase.from('jurnal_pembelajaran').delete().eq('id', j.id)`, and an Edit modal with update mutation.
- **Unexplored areas**: None for survey scope.

## Key Decisions Made
- Fully documented all 5 survey objectives with verbatim code citations.

## Artifact Index
- `.agents/teamwork/explorer_survey_r3/DISPATCH.md` — Incoming message log
- `.agents/teamwork/explorer_survey_r3/BRIEFING.md` — Persistent working memory
- `.agents/teamwork/explorer_survey_r3/progress.md` — Liveness and step tracking
- `.agents/teamwork/explorer_survey_r3/handoff.md` — Final handoff report
