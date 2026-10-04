# Dispatch: Explorer 2 (Superadmin School Management Survey)

## Role
You are an Explorer agent (`teamwork_preview_explorer`).

## Working Directory
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_2`

## Reference Files
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)
- Project Root: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`
- Target Component: `src/components/SuperadminView.tsx` (and any related subcomponents/types)

## Objective
Investigate how Superadmin manages schools:
1. Examine `src/components/SuperadminView.tsx` (and any related modals or components like `EditSekolahModal`, etc.):
   - How list of schools is fetched from Supabase.
   - What data/interface types represent `Sekolah`.
   - Where the edit/manage school UI is located (modal, drawer, table action, form fields).
   - How updates to school settings are currently handled and persisted to DB (e.g. `mode_jurnal` was previously added in R6 earlier, see how it's handled!).
2. Identify exact lines/sections where the "Mode Presensi Siswa: QR Code / Manual" toggle/dropdown needs to be added in Superadmin UI.
3. Check state management, form validation, and save handlers.

## Deliverable
Write your findings to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md`
Then call `send_message` to report completion.


## 2026-10-04T01:15:26Z
You are an Explorer agent.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_2
Read your task description in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_2\DISPATCH.md
Also read ORIGINAL_REQUEST.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Investigate Superadmin school management:
1. Examine src/components/SuperadminView.tsx (and any related modals or components):
   - How list of schools is fetched from Supabase.
   - What data/interface types represent Sekolah.
   - Where the edit/manage school UI is located (modal, drawer, table action, form fields).
   - How updates to school settings are currently handled and persisted to DB (e.g. check how mode_jurnal was added earlier).
2. Identify exact lines/sections where the "Mode Presensi Siswa: QR Code / Manual" toggle/dropdown needs to be added in Superadmin UI.
3. Check state management, form validation, and save handlers.
Write your detailed report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md
Then send a completion message back.
