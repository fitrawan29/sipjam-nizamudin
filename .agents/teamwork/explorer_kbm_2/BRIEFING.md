# BRIEFING — 2026-11-12T05:47:45Z

## Mission
Investigasi akar penyebab hilangnya data jurnal guru pada fitur Cetak Jurnal KBM dan rancang rekomendasi perbaikan tepat sasaran.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesizer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
- State folder: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_kbm_2\
- Original parent: f8423969-31b1-4c71-9bae-1480d343ca6a
- Milestone: M1_Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT modify source code directly
- Write output to .agents/teamwork/explorer_kbm_2/
- Output analysis.md and handoff.md

## Current Parent
- Conversation ID: f8423969-31b1-4c71-9bae-1480d343ca6a
- Updated: 2026-11-12T05:47:45Z

## Investigation State
- **Explored paths**: `src/components/RekapJurnalView.tsx`, `src/components/GuruJurnal.tsx`, `src/components/AppScreen.tsx`, `src/components/ClaySidebar.tsx`, `src/lib/workflow.ts`, `src/lib/attendanceAlpa.ts`, `csv/SIPJAM NIZAMUDIN - Jurnal_Pembelajaran (1).csv`, git history commits (`7e4cf9d`, `f012878`, `a79793c`, `a2db0d7`, `3c4ff91`, `bece4f3`).
- **Key findings**:
  1. PostgREST exact SQL query `query.eq('mapel', mapel)` and `query.eq('kelas', activeKelas)` in `tarikRekap()` breaks when mapel contains class prefixes (`XI Merdeka_Matematika`) or abbreviations, or when classes are parallel vs broad.
  2. Multi-tenant filter `query.eq('sekolah_id', user.sekolah_id)` eliminates all historical records where `sekolah_id IS NULL`.
  3. Auto-select in `fetchMaster()` triggers these rigid queries on single assignment teachers.
  4. Failure to load real journals causes synthesis of "Tidak Masuk Kelas" placeholders.
- **Unexplored areas**: None (investigation complete and synthesized).

## Key Decisions Made
- Analisis selesai, laporan komprehensif ditulis ke `analysis.md` dan `handoff.md`.
- Mengusulkan perbaikan /ponytail: pindahkan filter mapel/kelas ke in-memory post-processing dengan `isJurnalMatchJadwal()`, dukung `sekolah_id.is.null`, dan sertakan fallback query identitas guru.

## Artifact Index
- DISPATCH.md — Task assignment and instructions
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat
- analysis.md — Deep technical investigation findings
- handoff.md — 5-component handoff report
