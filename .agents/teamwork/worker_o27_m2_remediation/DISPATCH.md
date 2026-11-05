## 2026-11-05T16:07:32Z
[Message] timestamp=2026-11-05T16:07:32Z sender=b5b25aaa-c722-45e4-bde9-78a9910f9061 priority=MESSAGE_PRIORITY_HIGH content=You are worker_o27_m2_remediation. Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o27_m2_remediation\

MANDATORY: Read the authoritative request before starting work:
- Path: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Project scope: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
- Challenger 1 handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_o27_m2_1\handoff.md
- Challenger 2 handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_o27_m2_2\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope of Remediation:
Files you have write ownership over:
- src/components/DokumenView.tsx
- src/components/AdminVerifView.tsx

Tasks to fix:
1. `src/components/DokumenView.tsx`:
   - Fix `extractTingkat(kelasStr)`: Currently uses `\b10\b`, `\b7\b`, etc., which fails on concatenated alphanumeric class names like "7A", "7B", "10A", "10B", "8A", "9A", "11A", "12A".
   - Update regex to support digits immediately followed by section letters (e.g. `/(?:^|\D)12(?!\d)/i`, `/(?:^|\D)10(?!\d)/i`, `/(?:^|\D)7(?!\d)/i`, `/(?:^|\D)([1-6])(?!\d)/i`).
   - Run `npx tsx tests/adversarial_o27_m2_challenger.test.ts` to verify all 36 tests pass.

2. `src/components/AdminVerifView.tsx`:
   - Fix multi-day leave handling: In `AdminVerifView.tsx`, ensure teachers on multi-day leave (`tanggal_mulai` <= targetDate && targetDate <= `tanggal_selesai` or `durasiHari`) with status Sakit, Izin, or Dinas Luar are correctly recognized as having submitted/excused presence on day 2+, and are NOT marked as unsubmitted delinquents. Also ensure the presensi query or state includes active multi-day leaves spanning the selected date.
   - Run `npx tsx tests/adversarial_m2_challenger_2.test.ts` to verify.

3. General Verification:
   - Run `npx tsc --noEmit` -> 0 errors.
   - Run `npm test` -> all test suites pass with 0 failures.
   - Deliver handoff.md in your working directory and notify parent.
