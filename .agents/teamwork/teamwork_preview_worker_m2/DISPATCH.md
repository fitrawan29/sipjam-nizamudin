# Dispatch: Worker M2 (Superadmin Configuration UI)

## Role
You are a Worker agent (`teamwork_preview_worker`).

## Working Directory
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m2`

## Reference Files
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12\PROJECT.md`
- Survey 2 Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_2\handoff.md`
- Project Root: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Exclusive File Ownership
You exclusively own and may edit:
- `src/components/SuperadminView.tsx`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Tasks
1. In `src/components/SuperadminView.tsx`:
   - In `handleOpenAddSchoolModal`:
     - Add the `<select id="swal-sch-mode-presensi-siswa">` field with options:
       - `qr` (selected): "QR Code (Scan Kamera / Scanner Eksternal)"
       - `manual`: "Manual (Ceklis Hadir / Pulang per Siswa)"
     - In `preConfirm`, read `const mode_presensi_siswa = (document.getElementById('swal-sch-mode-presensi-siswa') as HTMLSelectElement)?.value || 'qr';`
     - Include `mode_presensi_siswa` in the returned object and insert payload.
   - In `handleEditSchool`:
     - Add `<select id="swal-edit-mode-presensi-siswa">` field pre-selected with `(school as any).mode_presensi_siswa === 'manual' ? 'manual' : 'qr'`.
     - In `preConfirm`, read `const mode_presensi_siswa = (document.getElementById('swal-edit-mode-presensi-siswa') as HTMLSelectElement)?.value || 'qr';`
     - Include `mode_presensi_siswa` in the returned object and update payload.
   - In School Table listing (under `activeTab === 'sekolah'`):
     - Add a visual badge in the `Nama Lembaga & NPSN` column next to `mode_jurnal` badge showing the current student attendance mode (e.g. purple badge with `fa-list-check` for "Presensi Manual", green/blue badge with `fa-qrcode` for "Presensi QR").
     - Add a quick toggle function `handleTogglePresensiMode(school: Sekolah)` that prompts confirmation, updates `mode_presensi_siswa` in Supabase, and calls `fetchAllData()`. Wire this to a click on the badge or an action in the table.
2. Run `npx tsc --noEmit` and ensure 0 errors.

## Git Workflow Reminder (GEMINI.md)
When completed, check git status, stage, commit with a descriptive message, and push to origin/main.

## Deliverable
Write your completion report to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m2\handoff.md`
Include build/type check results and diff summary.
Then send a completion message back.


## 2026-10-04T01:27:50Z
You are a Worker agent for Milestone M2 (Superadmin Configuration UI).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m2
Read your task description in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m2\DISPATCH.md
Also read ORIGINAL_REQUEST.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
and PROJECT.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You exclusively own:
- src/components/SuperadminView.tsx

Implement the add/edit school modal options, payload processing, table badges, and quick toggle handler for mode_presensi_siswa in SuperadminView.tsx.
Run `npx tsc --noEmit` to verify 0 errors.
Respect the Git Workflow in GEMINI.md (stage, commit, push to origin/main).
Write your handoff report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m2\handoff.md
Then send a completion message back.
