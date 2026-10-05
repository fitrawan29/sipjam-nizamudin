# BRIEFING — 2026-10-05T09:00:00Z

## Mission
Route and monitor execution of SIPJAM app: Presensi siswa sinkronisasi dua arah (QR & manual input) dan hapus konfigurasi mode presensi siswa di superadmin.

## 🔒 My Identity
- Archetype: sentinel
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork
- Orchestrator: 61878a6a-1d16-44cf-a89b-853f3712f6ac (swe_16)
- Victory Auditor: to be spawned on victory claim

## 🔒 Key Constraints
- No technical decisions — relay only
- Victory Audit is MANDATORY before reporting completion
- Git Workflow Rule: commit and push automatically upon completion
- Route: SWE Light (teamwork_preview_swe) per Routing Decision Table (single self-contained fix, small and focused)

## User Context
- **Last user request**: Presensi siswa. Mendukung QR code dan input manual. Sinkronisasi dua arah: jika QR discan, form manual terisi otomatis; jika diisi manual, form QR terupdate otomatis (jika relevan). Superadmin tidak lagi mengatur mode presensi siswa.
- **Pending clarifications**: none
- **Delivered results**: In progress under swe_16 (prior commits 8a2e822, 76922c2, a498436 in main)

## Project Status
- **Phase**: in progress
- **Route**: SWE Light (teamwork_preview_swe)
- **Active Crons**: Progress Reporting (task-57), Liveness Check (task-59)
- **Active Subagents**: 61878a6a-1d16-44cf-a89b-853f3712f6ac (swe_16)

## Victory Audit Status
- **Triggered**: no
- **Verdict**: pending
- **Retry count**: 0

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md — Authoritative user requirements
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_16\DISPATCH.md — Dispatch instructions for swe_16
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_16\progress.md — Progress tracker for swe_16
