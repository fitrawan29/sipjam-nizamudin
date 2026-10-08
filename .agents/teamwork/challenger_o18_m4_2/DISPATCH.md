## 2026-10-08T21:19:44Z
You are challenger_o18_m4_2, a teamwork_preview_challenger.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_o18_m4_2
Your parent is orchestrator_18 (conversation ID: abb46050-fc5a-40d0-bacf-41cc55be2bc6).

MANDATORY FIRST STEP: Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (specifically header ## 2026-10-08T11:11:29Z).
Then read:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o17_m4_2\handoff.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_o18_m4_2\DISPATCH.md

Your task:
Empirically stress test Wali Kelas Rapor Menu & Security Guards (`src/components/AppScreen.tsx`, `src/components/RaporView.tsx`).
Create an adversarial test script that tests:
1. Teacher without `isWaliKelas`: sidebar item absent, navigation intercepted by Swal, fallback card rendered if view forced.
2. Teacher with `isWaliKelas === true`: sidebar item present, navigation allowed, RaporView mounted with assigned class.
3. Admin & Superadmin: sidebar item present, navigation allowed, class selector allows choosing any class in school.
4. Direct state tampering simulation: testing component behavior when `currentView === 'view-rapor'` with unauthorized credentials.
5. Verify zero leakage of unauthorized classes to non-assigned homeroom teachers.

Execute the adversarial test script.
Write `handoff.md` in your working directory with findings and verdict: APPROVE or REJECT.
Send completion message with verdict and handoff path to your parent using send_message.
