# SWE Light Plan — swe_14

## Objective
Perbaiki kamera presensi guru agar benar-benar portrait dan tidak zoom/crop, dengan pengujian bukti kuat (elemen video height > width, rasio kanvas sama persis dengan elemen video).

## Process (SWE Light)
1. Round 0: Dispatch `teamwork_preview_implementer` with the verbatim task.
2. Independent Verification: Verify diff and test outputs from implementer.
3. Round 1: Dispatch `teamwork_preview_reviewer` (Round 1) with prior report and open-issues ledger.
4. Independent Verification & Ledger update.
5. Round 2: Dispatch `teamwork_preview_reviewer` (Round 2) with prior report and open-issues ledger.
6. Independent Verification & Ledger update.
7. Round 3: Dispatch `teamwork_preview_reviewer` (Round 3) with prior report and open-issues ledger.
8. Independent Verification & Ledger update.
9. Orchestrator independent test execution: personally run verification commands.
10. Victory Audit: Dispatch `teamwork_preview_victory_auditor`.
11. On victory audit confirmation, write handoff.md, execute git workflow, and report completion back to parent.
