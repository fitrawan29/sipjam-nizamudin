# Task Assignment: Worker Milestone 3

You are Worker M3 (`teamwork_preview_worker`).
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_1
- Original Request File: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Master Project Document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_1\PROJECT.md
- Survey Reference: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_r2_1\survey_r2.md
- Parent Orchestrator ID: 2ac91888-0ccf-41c6-9452-748556b221b7

## Mandatory Integrity Warning
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective: Milestone 3 Implementation
Implement genuine solutions for:
1. **F8: Notification Permission Full Blocking Modal Overlay on App Open**:
   - In `src/app/page.tsx` (and `PushNotificationPrompt.tsx` or `NotificationPermissionModal.tsx`), display a full blocking overlay (`fixed inset-0 z-[99999]`) on initial app launch that blocks all underlying app interaction until the user responds to the notification permission request. No dismiss/"Nanti" buttons that allow using the app without deciding.
2. **F9: Pre-Login Animation & Splash**:
   - Create `src/components/PreLoginSplash.tsx` with SIPJAM branding and smooth intro animation.
   - In `src/app/page.tsx`, show this intro animation before `<LoginScreen />` is displayed. Authenticated sessions bypass it cleanly.
3. **F10: Login SaaS Text Removal & Browser Title "SIPJAM"**:
   - In `src/components/LoginScreen.tsx`, remove the text "Multi-Tenant SaaS • Superadmin, Admin Sekolah & Guru" (lines 104-108) and simplify heading to "SIPJAM Portal" (line 71).
   - In `src/app/layout.tsx`, change metadata `title` to `'SIPJAM'` and export `viewport` with `viewportFit: 'cover'`.
   - In `public/manifest.json`, set name and short_name to `'SIPJAM'`.
4. **F11: Apple iOS/Safari Compatibility Fixes**:
   - In `src/app/globals.css`, add `-webkit-overflow-scrolling: touch;`, `overscroll-behavior-y: contain`, safe area variables, and 16px minimum mobile input font size.

## Exclusive File Ownership
You exclusively own and may edit:
- `src/app/layout.tsx`
- `public/manifest.json`
- `src/components/LoginScreen.tsx`
- `src/components/PreLoginSplash.tsx` (new)
- `src/components/PushNotificationPrompt.tsx` (or `NotificationPermissionModal.tsx`)
- `src/app/globals.css`
- `src/app/page.tsx`

## Git Workflow Rule (from GEMINI.md)
When completed, you are REQUIRED to automatically:
1. Check git status (`git status`)
2. Stage modified files (`git add .`)
3. Create commit with descriptive message (`git commit -m "feat(m3): implement UI/UX, splash animation, SaaS text removal, title, and iOS/Safari compatibility"`)
4. Push to active origin branch (`git push origin main` or current branch)

## Verification
1. Run existing test suite (`npm test`) and E2E test suite (`npm run test:e2e`).
2. Write unit/integration tests for M3 in `tests/m3_ui_ux_apple_compatibility.test.ts`.
3. Document build/test results in `handoff.md` and send completion message to parent.
