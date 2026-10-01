# BRIEFING — 2026-10-01T11:37:00Z

## Mission
Adversarial review and quality review for Sipjam bug fixes and feature enhancements (R1-R6), focusing on robustness, security, and edge cases (username locking, geolocation fallbacks, avatar size checks, school mode enforcement, DB migration safety).

## 🔒 My Identity
- Archetype: teamwork_preview_reviewer
- Roles: reviewer, critic
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_reviewer_2
- Original parent: 99cc2021-9546-433d-8867-c45dc0860a07
- Milestone: M5 Review
- Instance: 2 of 2

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code
- Check for integrity violations (hardcoded test results, facade implementations, shortcuts bypassing core work, fabricated verification, self-certifying work)
- Verdict MUST be REQUEST_CHANGES if any integrity violation is found
- Unambiguous verdict in handoff.md: APPROVE or REQUEST_CHANGES
- Communicate findings back to orchestrator_6 via send_message

## Current Parent
- Conversation ID: 99cc2021-9546-433d-8867-c45dc0860a07
- Updated: 2026-10-01T11:37:00Z

## Review Scope
- **Files to review**:
  - `merge_accounts.sql`
  - `supabase/migrations/*`
  - `src/lib/avatars.tsx`
  - `src/components/AccountSettingsModal.tsx`
  - `src/components/HomeView.tsx`
  - `src/components/AppScreen.tsx`
  - `src/components/GuruPresensi.tsx`
  - `src/app/api/attendance/route.ts`
  - `src/components/GuruJurnal.tsx`
  - `src/components/SuperadminView.tsx`
  - `src/components/AdminVerifView.tsx`
  - `src/components/RekapJurnalView.tsx`
  - `tests/all_requirements_r1_r6_verification.test.ts`
- **Interface contracts**: `PROJECT.md`
- **Review criteria**: Robustness, security, edge cases, integrity, correctness

## Review Checklist
- **Items reviewed**: [TBD]
- **Verdict**: pending
- **Unverified claims**: [TBD]

## Attack Surface
- **Hypotheses tested**: [TBD]
- **Vulnerabilities found**: [TBD]
- **Untested angles**: [TBD]

## Key Decisions Made
- Initialized review process focusing on R1-R6 robustness, security, and edge cases.

## Artifact Index
- `.agents/teamwork/teamwork_preview_reviewer_2/DISPATCH.md` — Assignment instructions
- `.agents/teamwork/teamwork_preview_reviewer_2/BRIEFING.md` — Agent state and working memory
