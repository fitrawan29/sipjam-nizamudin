# Task Assignment: Explorer Survey 3 (R3 Presensi, R4 Journal Upload GPS, R6 School Setting)

## Identity
- Archetype: teamwork_preview_explorer
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_3
- Parent: orchestrator_6 (99cc2021-9546-433d-8867-c45dc0860a07)
- Scope Document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_6\DISPATCH.md
- Original Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see ## 2026-10-01T10:56:44Z)

## Mission
Investigate the UI and backend flows for:
1. R3 (Izin Datang Terlambat Guru): Find `GuruPresensi.tsx` (and related attendance components). How are status buttons and options structured? How does attendance submission work? Propose UI changes and backend handlers to add "Izin Terlambat".
2. R4 (Upload Foto Jurnal Pembelajaran & GPS): Find `GuruJurnal.tsx`. How is photo capture currently handled (camera)? How to add a gallery/file upload option? How to capture GPS via `navigator.geolocation.getCurrentPosition` during upload, and how to include latitude, longitude, and upload timestamp into the payload and database?
3. R6 (Pengaturan Fitur Per-Sekolah Superadmin): Find "Edit Sekolah" component/page (Superadmin). How is school configuration stored (schema/fields)? Add mode options: "Live Camera Langsung" vs "Live Camera + Upload Foto". How does Guru Jurnal read school config for the logged-in teacher and conditionally enable the upload option?

## Output
Write your comprehensive analysis and recommendations to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_3\survey_report.md`
And a standard `handoff.md` in your directory.
Report back via send_message to orchestrator_6.

## 2026-10-01T10:59:30Z
[Message] sender=99cc2021-9546-433d-8867-c45dc0860a07 priority=MESSAGE_PRIORITY_HIGH
You are assigned to Explorer Survey 3. Read your task assignment at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_3\DISPATCH.md and ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md.
Investigate GuruPresensi (R3), GuruJurnal photo upload + geolocation (R4), and Superadmin School Settings & per-school journal config (R6).
Produce a detailed survey report at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_3\survey_report.md and handoff.md.
Notify orchestrator_6 when finished.
