# Dispatch: Worker M3 (Iteration 2)

## Identity
- Role: teamwork_preview_worker
- Assigned Milestone: Milestone 3 (M3: UI/UX, Branding & Apple Compatibility)
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_2\
- Parent Orchestrator: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\

## Mandatory Context
- ORIGINAL_REQUEST: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\PROJECT.md
- Prior Work & Test: tests/m3_ui_ux_apple_compatibility.test.ts

## MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Git Workflow Rule (GEMINI.md)
Every time you complete code modifications:
1. `git status`
2. `git add .`
3. `git commit -m "..."`
4. `git push origin main` (or active branch) automatically without asking.

## Next.js Rules (AGENTS.md)
Ensure App Router conventions and zero deprecations.

## Objectives & Tasks
Complete and verify Features F8, F9, F10, F11:
1. **F8: Notification Permission Full Blocking Modal Overlay**
   - In `src/components/NotificationPermissionModal.tsx` & `src/components/PushNotificationPrompt.tsx`
   - Fullscreen blocking overlay (`fixed inset-0 z-[99999] pointer-events-auto`) preventing any interaction until notification permission is granted/handled
   - Remove any bypass/dismiss buttons ("Nanti")
   - Mount in `src/app/page.tsx`
2. **F9: Pre-Login Animation & Splash**
   - Branded splash intro `src/components/PreLoginSplash.tsx` with smooth fade-in and animated icon
   - Integrates before `<LoginScreen />` in `src/app/page.tsx` with lifecycle timer and unmount cleanup
3. **F10: Login SaaS Text Removal & Tab Title "SIPJAM"**
   - Remove "Multi-Tenant SaaS • Superadmin, Admin Sekolah & Guru" and any mention of "SaaS" from `src/components/LoginScreen.tsx`
   - Set title in `src/app/layout.tsx` to "SIPJAM"
   - Update `public/manifest.json` `name` and `short_name` to "SIPJAM"
4. **F11: Apple iOS/Safari Compatibility Fixes**
   - Add `viewportFit: 'cover'` in Next.js `Viewport` export in `src/app/layout.tsx`
   - Add safe-area padding (`env(safe-area-inset-top)` / `bottom`), `-webkit-overflow-scrolling: touch;`, `overscroll-behavior-y: contain;`, `scroll-behavior: smooth;` in `src/app/globals.css`
   - Mobile input font-size >= 16px to prevent iOS Safari auto-zoom
5. **Verification & Tests**
   - Run `npx tsx tests/m3_ui_ux_apple_compatibility.test.ts`
   - Run `npm test` or affected tests
   - Ensure all tests pass with exit code 0
6. **Git commit and push per GEMINI.md**

## 2026-09-24T16:40:24Z
You are Worker M3 (Iteration 2). Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_2\.
Read your dispatch instructions at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m3_2\DISPATCH.md.
Also read ORIGINAL_REQUEST at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md and PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_2\PROJECT.md.

Tasks:
1. Verify and complete Features F8 (Full blocking notification permission modal overlay), F9 (Pre-login splash & animation), F10 (Login SaaS text removal & browser/manifest title "SIPJAM"), F11 (Apple iOS/Safari compatibility fixes).
2. Run tests/m3_ui_ux_apple_compatibility.test.ts (npx tsx tests/m3_ui_ux_apple_compatibility.test.ts).
3. Ensure all tests pass.
4. Stage, commit, and push changes to git per GEMINI.md.
5. Write handoff.md in your working directory and notify parent with send_message.

