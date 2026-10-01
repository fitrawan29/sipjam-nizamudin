# Task Assignment: Forensic Auditor (Integrity Forensics)

## Identity
- Archetype: teamwork_preview_auditor
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_auditor_1
- Parent: orchestrator_6 (99cc2021-9546-433d-8867-c45dc0860a07)
- Scope Document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
- Original Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see ## 2026-10-01T10:56:44Z)

## Mission
Conduct a rigorous, non-negotiable forensic integrity audit on all changes implemented for Requirements R1 through R6.
Verify that:
1. **No Test Hardcoding / Cheating**:
   - Check if source code contains hardcoded mock values or mock functions specifically crafted to bypass test assertions.
   - Check that `merge_accounts.sql` contains real SQL statements that genuinely handle table relationships and foreign keys.
   - Check that `navigator.geolocation.getCurrentPosition` in `GuruJurnal.tsx` is genuinely hooked to device geolocation.
   - Check that role checks for `role === 'admin'` are genuine business logic, not stubbed out.
2. **No Dummy / Facade Implementations**:
   - Verify that `/api/attendance` actually communicates with database or Supabase client.
   - Verify that avatar file uploads actually process file data and propagate state through React / localStorage.
   - Verify that Superadmin school settings genuinely persist and affect `GuruJurnal.tsx`.
3. **Execution & Evidence**:
   - Run static analysis, grep searches, and runtime verification.
   - Check git history (`git log -n 5`) to verify authentic code development.

## Verdict Requirement
Your `handoff.md` must conclude with a binary verdict:
`Verdict: CLEAN` or `Verdict: INTEGRITY VIOLATION` (with detailed evidence).
Report back via `send_message` to orchestrator_6.

## 2026-10-01T11:36:51Z
You are Forensic Auditor. Read your task assignment at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_auditor_1\DISPATCH.md, PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md, and ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md.
Conduct a rigorous forensic integrity audit verifying that implementations for R1-R6 are genuine, with no hardcoded test cheats, no dummy facades, real SQL queries, real geolocation calls, and real role checks.
Write handoff.md with explicit binary Verdict: CLEAN or INTEGRITY VIOLATION. Notify orchestrator_6 via send_message.

