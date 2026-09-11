# Execution Plan — orchestrator_2

## Objective
Comprehensive functional audit and repair of UI buttons across the Admin and Guru interfaces, connecting any remaining dummy functions to real Supabase database operations (Verification views: Presensi, Jurnal, Piket; Recap features; and Global buttons).

## Workflow Phases
1. **Phase 0: Comprehensive Survey (Explorers)**
   - Explorer 1: Focus on Admin Verification Views (Presensi, Jurnal, Piket action buttons, status_verifikasi fields, schema & tables).
   - Explorer 2: Focus on Recap Views (Presensi Recap, Jurnal Recap, Piket Recap, filters, search, export/action buttons, Supabase query bindings).
   - Explorer 3: Focus on Global Button Audit (Guru dashboard, quick actions, schedule, forms, modal dialogs, any inactive/mock handlers).
2. **Phase 1: Synthesis & Decomposition**
   - Consolidate explorer findings into `PROJECT.md` Feature Inventory & Architecture.
   - Assign milestones with clean file boundaries.
3. **Phase 2-4: Implementation & Verification Cycles**
   - Workers execute changes with Supabase client mutations and proper state handling.
   - Enforce Git workflow per `GEMINI.md` (`git status`, `git add .`, `git commit`, `git push origin main`).
   - Reviewers & Challengers independently verify actual Supabase API calls and dynamic UI reactivity.
   - Forensic Auditor verifies integrity and no mock leftovers.
4. **Phase 5: Synthesis & Handoff**
   - Document all wired buttons, table schemas used, verification results.
   - Send completion message to parent/Sentinel.
