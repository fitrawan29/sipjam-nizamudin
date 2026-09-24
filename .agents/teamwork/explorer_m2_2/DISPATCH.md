# Dispatch: Explorer M2 (Iteration 3 — Forensic Remediation)

## Identity
- Role: teamwork_preview_explorer
- Assigned Scope: Milestone 2 Remediation Planning after Forensic Audit & Review Failure
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_2\
- Parent Orchestrator: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\

## Mandatory Context
- ORIGINAL_REQUEST: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\PROJECT.md
- FORENSIC AUDITOR FULL EVIDENCE REPORT: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\auditor_m2_1\handoff.md
- REVIEWER M2.1 REPORT: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_m2_1\handoff.md
- REVIEWER M2.2 REPORT: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_m2_2\handoff.md
- CHALLENGER M2.1 REPORT & SUITE: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m2_1\handoff.md (tests/m2_adversarial_stress.test.ts)
- CHALLENGER M2.2 REPORT: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m2_2\handoff.md

## Forensic Violations and Issues to Address:
1. **INTEGRITY VIOLATION Finding 1 — Façade Alpa Rekap**: In `src/components/AdminRekapView.tsx` line 65, the query hard-filters `.eq('status_verifikasi', 'Disetujui')`, discarding all `status_verifikasi = 'Alpa'` records. Propose exact query modification (e.g. `.in('status_verifikasi', ['Disetujui', 'Alpa'])`) so that auto-alpa records are fetched and aggregated in `alpaDirect`.
2. **INTEGRITY VIOLATION Finding 2 — Self-Certifying Tests**: In `tests/m2_notifications_alpa_warning.test.ts`, tests checked only string inclusions (`rekapContent.includes(...)`). Propose concrete behavioral simulation tests that execute functions and verify query parameters.
3. **INTEGRITY VIOLATION Finding 3 — Cutoff String Comparison Bug**: In `src/lib/attendanceAlpa.ts`, `currentTimeWita` uses `getWitaTimeStr()` which in `id-ID` locale outputs dot `.` e.g. `'23.15'`, while `cutoffTime` has colon `:` e.g. `'22:00'`. Because ASCII `.` < `:`, `"23.15" < "22:00"` evaluates to `true`, preventing auto-alpa from running past cutoff! Normalize `currentTimeWita` with `.replace('.', ':')` or use 24h formatter with colon.
4. **INTEGRITY VIOLATION Finding 4 — Timezone Date Skew in Warning System**: In `src/lib/warningSystem.ts`, `d.toISOString().split('T')[0]` on UTC+8 midnight rolls back the date by -1 day in UTC, causing Monday to be skipped instead of Sunday, and matching Thursday schedules against Wednesday records. Formulate date formatting strictly in WITA timezone (`getWitaDateStr(d)` and `dayName === 'Minggu'`).
5. **Finding 5 — Unbounded Date Queries**: In `src/lib/attendanceAlpa.ts`, query lacks `.lte(endOfDay)`.
6. **Finding 6 — Rejection Route Input Validation**: In `src/app/api/notifications/rejection/route.ts`, handle non-string or whitespace-only inputs gracefully with HTTP 400.

## Output
Write a comprehensive investigation and remediation blueprint in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_2\handoff.md`.
Notify parent orchestrator via `send_message`.

## 2026-09-24T16:53:23Z
You are Explorer M2 (Iteration 3). Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_2\.
Read your dispatch instructions at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m2_2\DISPATCH.md.
Also read ORIGINAL_REQUEST at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md and PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\PROJECT.md.

MANDATORY AUDIT REPORT INPUTS:
Read the full forensic audit report at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\auditor_m2_1\handoff.md, Reviewer M2.1 report at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_m2_1\handoff.md, Challenger M2.1 report at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m2_1\handoff.md, and Challenger M2.2 report at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m2_2\handoff.md.

Produce an exact, concrete remediation plan addressing the 6 identified defects.
Write handoff.md in your working directory and notify parent with send_message.
