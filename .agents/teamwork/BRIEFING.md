# BRIEFING — 2026-10-04T23:43:00Z

## Mission
Orchestrate SWE Light execution to fix teacher attendance camera so it is truly portrait and not auto-zoomed/cropped, with strong verification.

## 🔒 My Identity
- Archetype: sentinel
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork
- Orchestrator: 962492f1-3042-46e5-9074-fc7b66436c10 (orchestrator_14)
- Victory Auditor: 40233eab-df1e-4165-8dd0-9cae4ee13ae2 (victory_auditor_19)
- Active Orchestrator: 7d1a5c32-05b5-44c3-b3bf-8674553211e8 (swe_12)
- Active Auditor: baeca5fe-9944-4f5e-b654-65bd2b3dbf09 (victory_auditor_20)
- Active SWE Orchestrator: 6ccbc814-8f55-47ba-8af6-a392f7b949c0 (swe_14)
- Active Victory Auditor: TBD (to be spawned on victory claim)

## 🔒 Key Constraints
- No technical decisions — relay only
- Victory Audit is MANDATORY before reporting completion
- Git Workflow Rule: commit and push automatically upon completion
- Route: General (teamwork_preview_orchestrator) per Routing Decision Table (comprehensive architecture, codebase flow analysis, and feature mapping)
- Route: SWE Light (teamwork_preview_swe) per Routing Decision Table (single self-contained fix, small and focused)

## User Context
- **Last user request**: Perbaikan sebelumnya gagal. Kamera presensi guru masih landscape dan masih auto-zoom. Perbaiki agar benar-benar portrait dan tidak zoom. R1: Kamera benar-benar portrait (tinggi > lebar) tanpa distorsi/rotasi salah di perangkat sebenarnya, bukan sekadar parameter palsu. R2: Hentikan auto-zoom/crop di level CSS dan Canvas (gambar akhir 100% identik dengan area yang terlihat di preview). Acceptance Criteria: Bukti kuat (render dimensi height > width dan script/tes UI memastikan rasio kanvas sama persis dengan video).
- **Pending clarifications**: none
- **Delivered results**:
  - none yet for current iteration

## Project Status
- **Phase**: in progress

## Victory Audit Status
- **Triggered**: no
- **Verdict**: pending
- **Retry count**: 0

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md — Authoritative user requirements
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_14\DISPATCH.md — Dispatch instructions for swe_14
