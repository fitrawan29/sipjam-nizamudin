# Execution Plan — orchestrator_3

## Objective
Comprehensive functional audit and repair of UI buttons across Admin and Guru interfaces, connecting all remaining dummy/mock functions to real Supabase database operations (Verification views: Presensi, Jurnal, Piket; Recap features; and Global buttons).

## Workflow Phases
1. **Phase 0: Parallel Exploratory Survey**
   - Survey Verification views (Admin Presensi, Jurnal, Piket verification action buttons, status_verifikasi fields, schema & tables).
   - Survey Recap views (Presensi, Jurnal, Piket recap filters, search, export/actions, Supabase queries).
   - Survey Global Buttons (Guru dashboard, quick actions, schedule, forms, modal dialogs, any inactive/mock handlers).
2. **Phase 1: Synthesis & Decomposition (PROJECT.md)**
   - Consolidate explorer findings into Feature Inventory and Architecture.
   - Define exact interface contracts, table schemas, and clean file boundaries.
3. **Phase 2: Milestone 1 — Functionalize Verification Buttons (R1)**
   - Implement Supabase updates on Presensi, Jurnal, and Piket verification views.
   - Update `status_verifikasi` (or schema equivalent) with feedback toasts and state updates.
4. **Phase 3: Milestone 2 — Repair Recap Features (R2)**
   - Implement dynamic Supabase fetch queries based on UI filter and search states.
   - Remove mock datasets in recap components.
5. **Phase 4: Milestone 3 — Global Button Audit & Wiring (R3)**
   - Wire inactive/mock buttons across Guru dashboard, quick actions, forms, and dialogs.
6. **Phase 5: Verification & Quality Assurance**
   - Reviewers inspect code and query patterns.
   - Challengers stress-test edge cases and Supabase error handling.
   - Forensic Auditor audits for zero remaining mock logic / hardcoded data.
   - Worker runs git workflow per GEMINI.md (`git status`, `git add .`, `git commit`, `git push origin main`).
7. **Phase 6: Final Handoff**
   - Generate comprehensive `handoff.md` and report completion to Sentinel.
