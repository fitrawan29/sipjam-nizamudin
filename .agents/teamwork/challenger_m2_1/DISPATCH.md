## 2026-10-05T10:53:55Z
You are challenger_m2_1.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m2_1
Project root: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY FIRST STEP: Read the user request at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (under ## 2026-10-05T09:55:29Z)

Read Worker M2's handoff report:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m2\handoff.md

Your role is to write an empirical test script (e.g. `tests/challenger_m2_sidebar_profile.test.ts`) that programmatically and empirically verifies:
1. R3.1: In `src/components/AppScreen.tsx`:
   - Verifies the sidebar profile card contains user avatar (`renderUserAvatar`), name `{user?.nama || 'Pengguna SIPJAM'}`, role badges with correct icons and colors for Superadmin, Administrator, Guru (Wali Kelas), and Guru.
   - Verifies username/NIP display.
   - Verifies the sidebar drawer retains `"Lihat Tutorial Lagi"` button and mounts `<OnboardingTutorial ... />`.
   - Verifies that the new `"Panduan & Tutorial Lengkap"` button opens `TutorialModal`.
2. Run the test with `npx tsx tests/challenger_m2_sidebar_profile.test.ts`.
3. Run `npx tsx tests/app_screen_integration.test.ts`.

Provide a clear APPROVE or REQUEST_CHANGES verdict in your handoff report.
Write your report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m2_1\handoff.md` and send a message to parent.
