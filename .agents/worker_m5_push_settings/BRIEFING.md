# BRIEFING — 2026-09-17T18:44:45+08:00

## Mission
Implement Milestone 5: Native VAPID Web Push Notifications, Account Settings Modal, Teacher Attendance Rules, and Target Email configuration.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m5_push_settings
- Original parent: 438061dd-8b26-44e8-acfe-051ab3586841
- Milestone: Milestone 5 - VAPID Push Notifications & Account Settings

## 🔒 Key Constraints
- Native VAPID Web Push (no Firebase).
- Exclusively own:
  - public/sw.js
  - src/app/api/push/subscribe/route.ts
  - src/app/api/push/validate/route.ts
  - src/components/AccountSettingsModal.tsx
  - src/components/AdminConfigView.tsx
  - src/lib/workflow.ts
  - src/lib/driveUpload.ts
  - package.json / package-lock.json
- Integrity Mandate: Genuine implementations only, no hardcoded or facade data.
- Git Workflow: git status, git add ., git commit, git push automatically on completion.

## Current Parent
- Conversation ID: 438061dd-8b26-44e8-acfe-051ab3586841
- Updated: not yet

## Task Summary
- **What to build**:
  1. `web-push` npm install, `public/sw.js`, `/api/push/subscribe` and `/api/push/validate`.
  2. `AccountSettingsModal.tsx` with 12 avatar picker, username/password change, using RPC `public.update_user_profile`.
  3. `AdminConfigView.tsx` & `src/lib/workflow.ts`: Teacher attendance rule (`aturan_kehadiran_guru`: 'Semua_Hari' vs 'Hari_Mengajar_Saja').
  4. `AdminConfigView.tsx` & `src/lib/driveUpload.ts`: Target email setting `email_tujuan_upload` sent in payload.
  5. Verify TypeScript (`npx tsc --noEmit`).
- **Success criteria**: TypeScript clean, push notification service worker and routes functional, account modal complete, config inputs working, workflow logic updated.
- **Interface contracts**: PROJECT.md, Supabase schema from worker_m1_db.
- **Code layout**: Next.js App router in `src/`.

## Key Decisions Made
- [TBD]

## Artifact Index
- [TBD]

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Not yet run
- **Lint status**: Not yet run
- **Tests added/modified**: None yet

## Loaded Skills
- None
