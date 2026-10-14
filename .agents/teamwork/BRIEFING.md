# BRIEFING — 2026-10-14T13:29:08Z

## Mission
Desain ulang sistem pengaturan kewajiban kehadiran guru di SIPJAM untuk memberikan penentuan eksplisit per guru antara 'Wajib Hadir Setiap Hari' dan 'Hanya Hari KBM', serta memastikan pembaruan pengaturan langsung berefek secara instan (real-time) pada akun guru tanpa perlu logout atau refresh manual.

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
- Victory Auditor (current): 798b78a4-a923-4439-9421-5619b78ae0e7 (victory_auditor_27)
- Orchestrator (current): 10338150-5928-42f6-aed4-72eb0fc6dd61 (orchestrator_19)
- Victory Auditor (current): 9be99cd8-2ed4-4c58-b581-fa10f644f18d (victory_auditor_28)
- Orchestrator (current): 1f15a155-9441-412f-8adc-6ac5519d6f4d (orchestrator_21, flash model)
- Victory Auditor (current): 474872bb-b902-484b-9307-00639a1db00e (victory_auditor_29)
- Orchestrator (current): cc0db25c-cdde-4d08-b17a-6224476bfc0a (swe_18)
- Victory Auditor (current): 24ab1754-6da1-4fde-a60f-345ba204a634 (victory_auditor_30)
- Orchestrator (current): ff45a26f-b6cf-4779-b111-0990eab12d72 (swe_19)
- Victory Auditor (current): 0a222086-d0a2-4a8f-a306-398787ac97d1 (victory_auditor_31)
- Orchestrator (current): 150d9d73-054f-4d29-b427-4a8f6e4dcd3d (swe_20)
- Victory Auditor (current): fad6b157-5c8b-4522-bb29-088d3a55a119 (victory_auditor_33)
- Orchestrator (current): to be spawned (swe_21)
- Orchestrator (current): 3e8bd682-e794-4929-9e75-6ca1b41b7e73 (swe_21)
- Victory Auditor (current): to be spawned on victory claim
- Victory Auditor (current): to be spawned (victory_auditor_34)
- Victory Auditor (current): 42788b54-e172-4c7f-9245-95990ba36be2 (victory_auditor_34)
- Orchestrator (current): to be spawned (swe_22)
- Victory Auditor (current): to be spawned on victory claim
- Orchestrator (current): 9c3f6afe-7f70-4bf4-a653-bed63c5a2688 (swe_22)
- Cron 1 (Progress Reporting): 4a4e3549-bafc-4324-b1e2-1c248f3e8fdd/task-44 (*/8 * * * *)
- Cron 2 (Liveness Check): 4a4e3549-bafc-4324-b1e2-1c248f3e8fdd/task-46 (*/10 * * * *)
- Victory Auditor (current): 5aea33be-f1a8-4a56-824b-094e929b9e31 (victory_auditor_35)
- Orchestrator (current): cee80ad9-6743-4395-8d50-c686b97fb49d (swe_23)
- Cron 1 (Progress Reporting): 67d0fcc1-2722-4817-bf1c-aac715599224/task-18 (*/8 * * * *)
- Cron 2 (Liveness Check): 67d0fcc1-2722-4817-bf1c-aac715599224/task-20 (*/10 * * * *)
- Victory Auditor (current): 8c0719d3-9587-4655-8046-412ac91e1275 (victory_auditor_36)
- Orchestrator (current): to be spawned (swe_24)
- Victory Auditor (current): to be spawned on victory claim
- Orchestrator (current): 7cc63b3d-4f70-478d-adcd-a6c556e5f976 (swe_24)
- Cron 1 (Progress Reporting): a50a197f-dd6a-4990-bbd9-e6e56c6859c8/task-38 (*/8 * * * *)
- Cron 2 (Liveness Check): a50a197f-dd6a-4990-bbd9-e6e56c6859c8/task-40 (*/10 * * * *)

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
- Route (current): SWE Light (teamwork_preview_swe) per Routing Decision Table (single self-contained feature, small and focused; Portal Induk Jaringan Multi-Sekolah / Single Superadmin SSO / School Switcher)
- Route (current): SWE Light (teamwork_preview_swe) per Routing Decision Table (single self-contained cleanup and removal of obsolete Superadmin tabs and modals, small and focused)
- Route (current): SWE Light (teamwork_preview_swe) per Routing Decision Table (single self-contained fix, small and focused; Dinas Luar camera presensi without radius restriction)
- Route (current): SWE Light (teamwork_preview_swe) per Routing Decision Table (single self-contained fix, small and focused; real-time automated verification for attendance, journal, and piket with manual approval queue retention)
- Route (current): SWE Light (teamwork_preview_swe) per Routing Decision Table (single self-contained fix, small and focused; teaching-only attendance rules and obsolete code removal)
- Route (current): SWE Light (teamwork_preview_swe) per Routing Decision Table (single self-contained fix, small and focused; explicit per-teacher attendance obligation redesign & real-time sync)

## User Context
- **Last user request**: Desain ulang sistem pengaturan kewajiban kehadiran guru di SIPJAM untuk memberikan penentuan eksplisit per guru antara 'Wajib Hadir Setiap Hari' dan 'Hanya Hari KBM', serta memastikan pembaruan pengaturan langsung berefek secara instan (real-time) pada akun guru tanpa perlu logout atau refresh manual.
- **Pending clarifications**: none
- **Delivered results**: previous milestones complete, launching swe_24.

## Project Status
- **Phase**: in progress
- **Route**: SWE Light (teamwork_preview_swe)
- **Active Crons**: a50a197f-dd6a-4990-bbd9-e6e56c6859c8/task-38, a50a197f-dd6a-4990-bbd9-e6e56c6859c8/task-40
- **Active Subagents**: 7cc63b3d-4f70-478d-adcd-a6c556e5f976 (swe_24)

## Victory Audit Status
- **Triggered**: no
- **Verdict**: pending
- **Retry count**: 0

## Artifact Index
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md — Authoritative user requirements
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_24\DISPATCH.md — Dispatch instructions for swe_24
