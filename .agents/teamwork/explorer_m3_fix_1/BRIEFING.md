# BRIEFING — 2026-11-07T01:00:00Z

## Mission
Analyze DEFECT-01 in `src/lib/dataIntegrityGuard.ts` (kelompok unconditionally converted to kategori), inspect data_mapel usage, formulate exact fix strategy.

## 🔒 My Identity
- Archetype: explorer
- Roles: Read-only investigation, synthesize findings, produce structured reports
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m3_fix_1\
- Original parent: 1ab94413-d6cb-47b9-9e53-4e1689efbdd2
- Milestone: M3 Fix Phase

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT edit production code directly
- Output structured analysis report to `handoff.md`
- Report back via `send_message`

## Current Parent
- Conversation ID: 1ab94413-d6cb-47b9-9e53-4e1689efbdd2
- Updated: 2026-11-07T00:53:20Z

## Investigation State
- **Explored paths**:
  - `src/lib/dataIntegrityGuard.ts` (lines 656–815 `normalizeCsvHeaders`, 864–879 `REQUIRED_HEADERS_BY_TABLE`, 1250–1265 `ALLOWED_COLUMNS_BY_TABLE`, 1909–1939 idempotent mapel resolution)
  - `src/components/AdminDataView.tsx` (lines 521–525 `handleDownloadTemplate`, 1063–1108 modal tambah mapel, 1851–1897 modal edit mapel, 2386 card render, 2321 filter)
  - `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql` (lines 72–81 table `data_mapel` definition)
  - `src/types/database.ts` (lines 290–317 `data_mapel` types)
  - `src/lib/workflow.ts` (lines 496, 500, 513)
  - `src/components/DokumenView.tsx` (line 213)
  - `src/components/RaporView.tsx` (lines 602–607)
  - `tests/adversarial_m3_dependencies.test.ts` (Check 3.5 reproducing failure)
- **Key findings**:
  - `data_mapel` defines BOTH `kategori TEXT` and `kelompok TEXT` as distinct, independent database columns.
  - `Template_Data_Mapel.csv` defines headers: `['id', 'nama_mata_pelajaran', 'kategori', 'kelompok']` with sample `['MP-01', 'Matematika Wajib', 'Umum', 'Wajib']`.
  - In `src/lib/dataIntegrityGuard.ts` line 801, `clean === 'kelompok'` is unconditionally rewritten to `'kategori'`.
  - When parsed, the header array becomes `['id', 'nama_mata_pelajaran', 'kategori', 'kategori']`, causing the 4th column ('Wajib') to overwrite the 3rd column ('Umum'), leaving `kelompok` as `undefined` and dropping it entirely from the database upsert payload.
  - Scoping the alias with `isMapel` (`isMapel ? 'kelompok' : 'kategori'`) cleanly preserves both columns, satisfies `tests/adversarial_m3_dependencies.test.ts` Check 3.5, and maintains backward compatibility.
- **Unexplored areas**: None, problem boundary is fully mapped and tested.

## Key Decisions Made
- Confirmed root cause: unconditional header rewrite in `normalizeCsvHeaders` line 801.
- Formulated fix strategy: scope `clean === 'kelompok'` using already-existing `isMapel` flag so `isMapel ? 'kelompok' : 'kategori'` and add `kelompok_mapel` alias.

## Artifact Index
- DISPATCH.md — Dispatch instructions and tasks
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat
- handoff.md — Final 5-component handoff report
