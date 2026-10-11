# Dispatch Instructions for Victory Auditor 29

## Mission
Conduct an independent post-victory audit for the overhaul of GradebookView (CP → TP → Asesmen → Nilai Akhir) in SIPJAM (R1-R5).

## Authoritative User Requirements
- Path: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`
- Latest Request Timestamp: `2026-10-10T22:56:05Z`

## Orchestrator Handoff
- Path: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_21\handoff.md`

## Audit Working Directory
- Directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\victory_auditor_29`
- Project Root: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Audit Protocol
Conduct a 3-phase independent verification with zero shared context from the implementation swarm:
1. **Phase 1: Timeline & Requirements Audit**:
   - Verify every requirement (R1-R5) and Acceptance Criterion against `ORIGINAL_REQUEST.md`.
   - Check database migration `supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql`.
   - Check types in `src/types/database.ts`.
   - Check UI hierarchy CP → TP in `src/components/GradebookView.tsx`.
   - Check assessment constraints (Diagnostik max 1, Formatif/Sumatif min 1, keterangan field).
   - Check Nilai Akhir formula: (bobot_kehadiran × rata kehadiran) + (bobot_formatif × rata formatif) + (bobot_sumatif × rata sumatif), diagnostik excluded, '-' if formatif/sumatif missing.
   - Check Admin Bobot settings (admin only, total 100%, persisted to `pengaturan.bobot_nilai_mapel`).
2. **Phase 2: Cheating & Anti-Gaming Forensics**:
   - Check for mock tampering, bypassed validations, hardcoded values, or superficial implementations.
3. **Phase 3: Independent Test Execution**:
   - Run `npm test` independently.
   - Run `npm run build` or typecheck if needed.
   - Check git status and commit history to ensure git workflow rule was honored.

Deliver a structured final verdict: **VICTORY CONFIRMED** or **VICTORY REJECTED**.
