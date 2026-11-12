# BRIEFING — 2026-11-12T05:42:00Z

## Mission
Investigate end-to-end data architecture for Jurnal KBM Guru and Cetak Jurnal KBM, map regression risks across consumers, and design an objective verification strategy & test suite.

## 🔒 My Identity
- Archetype: explorer
- Roles: KBM Architecture & Verification Planner
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app
- State folder: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_kbm_3
- Original parent: f8423969-31b1-4c71-9bae-1480d343ca6a
- Milestone: Investigation & Verification Planning

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do not modify source code directly
- Write only to own state folder: .agents/teamwork/explorer_kbm_3/
- Deliver results via send_message to parent

## Current Parent
- Conversation ID: f8423969-31b1-4c71-9bae-1480d343ca6a
- Updated: 2026-11-12T05:19:35Z

## Investigation State
- **Explored paths**:
  - Database schema: `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql`, migrations (`20260912_jurnal_pembelajaran_8_kolom.sql`, `20261003_add_kktp_konten_lokasi_kbm.sql`, `20260912_multi_tenant_sekolah_rls.sql`, etc.)
  - Save flow: `src/components/GuruJurnal.tsx` (`handleJurnalSubmit`, `handleSaveAbsensiOnly`, `kbmSubMode`, `newJurnal`, `existingSessionQuery`, update/insert retries)
  - Print/rekap flow: `src/components/RekapJurnalView.tsx` (`tarikRekap`, `activeMode`, `waliClasses` auto-filter bug, `filteredJurnal`, 12-column teacher print table, 8-column class recap table, CSV export)
  - Downstream consumers: `AdminVerifView.tsx`, `AdminRekapView.tsx`, `HomeViewGuru.tsx`, `GuruPresensi.tsx`, `workflow.ts`, `attendanceAlpa.ts`, `RekapSiswaView.tsx`, `GradebookView.tsx`, `HistoryView.tsx`
  - Existing test suites: `tests/jurnal_save_setelah_absensi_selesai.test.ts`, `tests/legacy_jurnal_backward_compatibility.test.ts`, `tests/guru_cetak_jurnal_kbm.test.ts`
- **Key findings**:
  1. Data Model: Single relational table `jurnal_pembelajaran` houses all teaching and activity journals. No separate `jurnal_kbm` or `jurnal_guru` tables exist in PostgreSQL schema.
  2. Consumer Matrix: 15 components/services consume `jurnal_pembelajaran`. High risk in `HomeViewGuru` (`canPresensiPulang`), `AdminVerifView` (`isRealSubmittedJournal`), and `RekapJurnalView` (print rendering).
  3. Print Missing Data Root Cause:
     - `fetchMaster` in `RekapJurnalView.tsx` sets `kelas = assignedWalis[0]` if teacher is a homeroom teacher (`isWaliKelas`). When opening `Cetak Jurnal KBM` (personal mode), `tarikRekap` filters query by `kelas = activeKelas`, unintentionally dropping journals from all other classes taught by the teacher.
     - Column naming divergence: `GuruJurnal.tsx` writes `kegiatan` but omits `kegiatan_pembelajaran`; dual-write for both legacy and modern columns is vital for print completeness.
  4. Save Failure Root Cause:
     - Pre-lock via `isLocked` (e.g., missing assignments before fetch completes, or `canOpenJurnal` evaluation).
     - Missing `kegiatan_pembelajaran` in `newJurnal` payload.
     - `sekolah_id` fallback requirement when user object lacks explicit tenant id.
     - PostgREST `.or()` query syntax on `nama_guru.ilike` with special characters or titles.
- **Unexplored areas**: None. All architectural relationships, consumers, and verification vectors have been verified.

## Key Decisions Made
- Designing automated verification harness (`tests/kbm_architecture_and_verification.test.ts`) that verifies both save integrity (create, update, session reconciliation) and print data retrieval (multi-class retention, 12-column print rendering, non-regression).
- Formulating exact analysis.md and handoff.md according to Handoff Protocol.

## Artifact Index
- DISPATCH.md — Task assignment and requirements
- BRIEFING.md — Working memory and current state
- progress.md — Liveness heartbeat and milestone tracking
- analysis.md — Full architectural analysis, consumer mapping, and verification suite design
- handoff.md — 5-component handoff report for parent agent
