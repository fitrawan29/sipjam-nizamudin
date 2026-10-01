# Task Assignment: Worker Milestone 3 (Presensi "Izin Terlambat" UI & Backend API)

## Identity
- Archetype: teamwork_preview_worker
- Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m3
- Parent: orchestrator_6 (99cc2021-9546-433d-8867-c45dc0860a07)
- Scope Document: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
- Original Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (see ## 2026-10-01T10:56:44Z)

## Survey References
- Explorer Survey 1 Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_report.md`
- Explorer Survey 3 Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_3\survey_report.md`

## Write Ownership (Strictly Exclusive)
You exclusively own and may modify or create ONLY these files:
- `src/components/GuruPresensi.tsx`
- `src/app/api/attendance/route.ts` (create this route handler)
- `src/lib/workflow.ts` (if adjusting workflow check for Izin Terlambat)

DO NOT modify `GuruJurnal.tsx`, `AccountSettingsModal.tsx`, `SuperadminView.tsx`, or database migration files.

## Mission & Detailed Requirements

### R3: Izin Datang Terlambat (Guru)
1. **`src/components/GuruPresensi.tsx`**:
   - Line 513 currently has `<option value="Terlambat">Izin Datang Terlambat</option>`.
   - Update the option to:
     `<option value="Izin Terlambat">Izin Terlambat</option>`
     (or support both values to ensure complete backward compatibility).
   - In attendance handling logic:
     - Define `const isTerlambat = jenisPresensi === 'Izin Terlambat' || jenisPresensi === 'Terlambat';`
     - Status verifikasi: `isTerlambat ? 'Menunggu' : ...`
     - Late calculation: `if (currTimeVal > batasVal && (jenisPresensi === 'Sekolah' || isTerlambat))`
     - `newPresensi` payload: `jenis_presensi: jenisPresensi` (saves `'Izin Terlambat'`).
     - When submitting with "Izin Terlambat", teacher remains eligible to fill subsequent class journals and regular school activities.
2. **`src/app/api/attendance/route.ts`**:
   - Acceptance criteria states: *"Backend endpoint presensi dapat menerima dan menyimpan status 'Izin Terlambat'"*.
   - Create Next.js App Router route handler `src/app/api/attendance/route.ts` with `POST` and `GET` methods.
   - `POST` handler:
     - Accepts JSON body containing `{ nama_guru, user_id, tipe_absen, jenis_presensi, status, detail_izin, lokasi, jarak, link_bukti, status_verifikasi, keterlambatan_detik, sekolah_id }`.
     - Maps `jenis_presensi: body.jenis_presensi || body.status || 'Sekolah'`.
     - Inserts record into Supabase `public.presensi_guru`.
     - Returns `NextResponse.json({ success: true, data: result }, { status: 201 })`.
   - `GET` handler:
     - Optional helper returning recent attendance records or status confirmation `{ success: true, message: 'Attendance endpoint active' }`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Verification
- Verify TypeScript types (`npx tsc --noEmit`).
- Document all changes and verification in `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m3\handoff.md`.

## 2026-10-01T11:17:37Z
Sender: 99cc2021-9546-433d-8867-c45dc0860a07
Content: You are assigned as Worker Milestone 3 (Presensi "Izin Terlambat" UI & Backend API). Read your task assignment at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m3\DISPATCH.md, PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md, and ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md.
MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement R3: Update GuruPresensi.tsx to have an option with value="Izin Terlambat", handle state & late calculation, and create Next.js App Router route handler src/app/api/attendance/route.ts accepting and saving "Izin Terlambat".
Verify with tsc --noEmit.
Write handoff.md in your working directory and notify orchestrator_6 via send_message when done.
