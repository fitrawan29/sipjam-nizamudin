## 2026-10-29T16:55:16Z
[Message] timestamp=2026-10-29T16:55:16Z sender=1fe2e0b2-5a84-4de9-be48-595dc2869f77 priority=MESSAGE_PRIORITY_HIGH content=You are teamwork_worker for Milestone 4 (Tier 5 Adversarial Hardening Gap Remediation).
Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_tier5_gen1\

MANDATORY FIRST STEP:
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md before doing anything else.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

READ CHALLENGER REPORT:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_tier5_2_gen1\handoff.md

FILE OWNERSHIP:
- `src/utils/draftStorage.ts`
- `src/components/GuruJurnal.tsx`
- `src/components/AppScreen.tsx`
- `src/lib/navigation.ts`

TASKS:
1. KBM Journal Autosave Partitioning (`src/utils/draftStorage.ts` and `src/components/GuruJurnal.tsx`):
   - Implement `getJurnalDraftKey(userId?: string, sekolahId?: string): string`:
     If both `userId` and `sekolahId` are present, return `'sipjam_jurnal_autosave_' + userId + '_' + sekolahId`.
     Otherwise return `'sipjam_jurnal_autosave'`.
   - In `saveJurnalDraft`, `loadJurnalDraft`, `clearJurnalDraft`, and in `GuruJurnal.tsx` (lines 200, 262, 270):
     Use `getJurnalDraftKey(user?.id, user?.sekolah_id)`.
     When loading, if partitioned key has data, return it; if null, check fallback `'sipjam_jurnal_autosave'` for backward compatibility.
2. Regional Scoping for Dinas in AppScreen (`src/components/AppScreen.tsx` lines 683, 817):
   - Align the filter to match `ClaySidebar.tsx`:
     ```tsx
     isDinas
       ? satelliteSchools.filter(s => {
           const userRegion = (user?.kota_kabupaten || '').trim().toLowerCase();
           const schoolRegion = (s.kota_kabupaten || '').trim().toLowerCase();
           return Boolean(userRegion && schoolRegion && userRegion === schoolRegion);
         })
       : satelliteSchools
     ```
3. URL Route Parameter Sanitization (`src/lib/navigation.ts`):
   - In `resolveCanonicalRoute(rawView, rawTab)`:
     Trim and clean the rawView first:
     ```ts
     const trimmed = (rawView || '').trim().replace(/\/+$/, '');
     if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
       return { canonicalView: 'view-home', isLegacyAlias: false };
     }
     ```
     This handles whitespace-padded `"   null   "`, `"   undefined   "`, and trailing slashes like `'view-rapor/'`.

VERIFICATION:
- `npx tsc --noEmit`
- `npx tsx tests/navigation_consolidation_verification.test.ts`
- `npx tsx tests/adversarial_tier5_coverage_hardening_challenger_1.test.ts`
- `npx tsx tests/adversarial_tier5_lifecycle_scoping_challenger_2.test.ts`
- `npm test`
- `npm run build`

GIT WORKFLOW RULE (GEMINI.md):
After all tests pass, stage, commit, and push to main:
`git add .`
`git commit -m "feat: resolve Tier 5 adversarial hardening gaps (partitioned draft storage, regional scoping, URL sanitization)"`
`git push origin main`

Write handoff report in `worker_tier5_gen1/handoff.md` and report back via send_message.
