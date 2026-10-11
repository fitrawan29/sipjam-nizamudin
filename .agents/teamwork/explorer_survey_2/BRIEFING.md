# BRIEFING — 2026-10-11T00:49:00Z

## Mission
Investigate database schema, migrations, TypeScript types, and Admin settings for CP-TP hierarchy, asesmen keterangan, and bobot nilai mapel.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesizer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2
- Original parent: 1f15a155-9441-412f-8adc-6ac5519d6f4d
- Milestone: survey

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Ponytail principle: minimal schema diff, minimal bloat, backward compatibility
- Focus on Database Schema, Migrations, TypeScript Types, and Admin Settings

## Current Parent
- Conversation ID: 1f15a155-9441-412f-8adc-6ac5519d6f4d
- Updated: 2026-10-11T00:49:00Z

## Investigation State
- **Explored paths**:
  - `supabase/migrations/` (examined existing migrations: `20260911_guru_mapel_relational.sql`, `20260912_multi_tenant_sekolah_rls.sql`, `20260917_comprehensive_features.sql`, `20261008_m3_piket_form_lock.sql`, etc.)
  - `migrations/add_cp_and_gradebook_v2.sql` (inspected untracked draft migration)
  - `src/types/database.ts` (inspected table definitions: `capaian_pembelajaran`, `tujuan_pembelajaran`, `asesmen_kolom`, `pengaturan`, and exported type aliases)
  - `src/components/GradebookView.tsx` (inspected bobot state, modal, save handler, and identified syntax error at lines 3056-3058)
  - `src/components/AdminConfigView.tsx` (inspected admin settings structure)
  - `tests/` and `npm test` (verified existing test suite passes)
- **Key findings**:
  1. `capaian_pembelajaran` table design with RLS, indexes, and full multi-tenant isolation.
  2. `tujuan_pembelajaran.cp_id` foreign key must be NULLABLE (`UUID REFERENCES public.capaian_pembelajaran(id) ON DELETE SET NULL`) for full backward-compatibility with existing records.
  3. `asesmen_kolom.keterangan` is nullable TEXT. Added partial unique index `uq_asesmen_tp_diagnostik` on `public.asesmen_kolom(tp_id) WHERE (kategori = 'Diagnostik')` to strictly enforce at the DB layer that each TP has at most 1 Diagnostik assessment.
  4. `pengaturan.bobot_nilai_mapel` stores JSON string `{ kehadiran, formatif, sumatif }`. Provided idempotent seed migration and upsert recommendation.
  5. Admin weight modal in GradebookView enforces strict 100% total sum validation.
  6. Discovered duplicate closing tag bug at lines 3056-3058 of `GradebookView.tsx` that breaks `tsc --noEmit`.
- **Unexplored areas**: None regarding Database, Migrations, Types, or Admin Settings.

## Key Decisions Made
- Chose `cp_id` over `capaian_pembelajaran_id` to match existing `tp_id` convention across `asesmen_kolom` and `nilai_siswa`.
- Standardized migration path to `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql`.
- Specified `ON DELETE SET NULL` on `cp_id` so deleting a CP does not cascade-delete teachers' TPs.

## Artifact Index
- DISPATCH.md — dispatch message record
- BRIEFING.md — persistent working memory
- progress.md — liveness heartbeat
- handoff.md — self-contained 5-component handoff report
