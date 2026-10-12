# BRIEFING — 2026-10-12T11:02:49Z

## Mission
Sesuaikan aplikasi SIPJAM agar seluruh lini transaksi data (presensi, jurnal, piket, nilai) beroperasi online langsung ke Supabase tanpa antrean offline lokal, dengan AI Assistant dipertahankan 100% offline (prinsip Ponytail).

## 🔒 My Identity
- Archetype: sentinel
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork
- Orchestrator: 61878a6a-1d16-44cf-a89b-853f3712f6ac (swe_16)
- Victory Auditor: 464b5cec-2404-4dd3-a72a-bcb2e6bd87e0 (victory_auditor_25)
- Orchestrator (current): 3ef8ddbb-8819-4386-aaac-f3d3ca2811fc (orchestrator_17)
- Victory Auditor (current): to be spawned on victory claim
- Orchestrator (current): abb46050-fc5a-40d0-bacf-41cc55be2bc6 (orchestrator_18)
- Victory Auditor (current): 8ba2e108-652d-4476-ac15-21511ca92ac4 (victory_auditor_26)
- Orchestrator (current): e16804dc-3a4d-422a-9c9b-f765efe2d907 (swe_17)
- Victory Auditor (current): to be spawned on victory claim
- Victory Auditor (current): 798b78a4-a923-4439-9421-5619b78ae0e7 (victory_auditor_27)
- Orchestrator (current): 10338150-5928-42f6-aed4-72eb0fc6dd61 (orchestrator_19)
- Victory Auditor (current): 9be99cd8-2ed4-4c58-b581-fa10f644f18d (victory_auditor_28)
- Orchestrator (current): to be spawned (orchestrator_20)
- Victory Auditor (current): to be spawned on victory claim
- Orchestrator (current): 2cb0cbe0-1611-4de1-a447-0a40f7ca123b (orchestrator_20 - errored 429)
- Orchestrator (current): to be spawned (orchestrator_21)
- Orchestrator (current): 1f15a155-9441-412f-8adc-6ac5519d6f4d (orchestrator_21, flash model)
- Victory Auditor (current): to be spawned (victory_auditor_29)
- Victory Auditor (current): 474872bb-b902-484b-9307-00639a1db00e (victory_auditor_29)
- Orchestrator (current): cc0db25c-cdde-4d08-b17a-6224476bfc0a (swe_18)
- Victory Auditor (current): to be spawned on victory claim (victory_auditor_30)

## 🔒 Key Constraints
- No technical decisions — relay only
- Victory Audit is MANDATORY before reporting completion
- Git Workflow Rule: commit and push automatically upon completion
- Route: SWE Light (teamwork_preview_swe) per Routing Decision Table (single self-contained fix, small and focused)
- Route (current): General (teamwork_preview_orchestrator) per Routing Decision Table (comprehensive multi-requirement update)
- Route (current): SWE Light (teamwork_preview_swe) per Routing Decision Table (single self-contained fix, small and focused)
- Route (current): General (teamwork_preview_orchestrator) per Routing Decision Table (multi-part overhaul across security, bugs, architecture, and perf)
- Route (current): General (teamwork_preview_orchestrator) per Routing Decision Table (overhaul of GradebookView CP -> TP -> Asesmen -> Nilai Akhir)
- Route (current): SWE Light (teamwork_preview_swe) per Routing Decision Table (single self-contained fix, small and focused; Ponytail online-only transactions & 100% offline AI preservation)

## User Context
- **Last user request**: Sesuaikan aplikasi SIPJAM agar seluruh lini transaksi data (presensi, jurnal, piket, nilai) beroperasi online langsung ke Supabase tanpa antrean offline lokal, dengan AI Assistant dipertahankan 100% offline (prinsip Ponytail).
- **Pending clarifications**: none
- **Delivered results**: In progress

## Project Status
- **Phase**: in progress
- **Route**: SWE Light (teamwork_preview_swe)
- **Active Crons**: task-34 (progress */8), task-36 (liveness */10)
- **Active Subagents**: cc0db25c-cdde-4d08-b17a-6224476bfc0a (swe_18)

## Victory Audit Status
- **Triggered**: no
- **Verdict**: pending
- **Retry count**: 0

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md — Authoritative user requirements
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_18\DISPATCH.md — Dispatch instructions for swe_18
