# Dispatch: Worker M3 (Piket View QR vs Manual)

## Role
You are a Worker agent (`teamwork_preview_worker`).

## Working Directory
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m3`

## Reference Files
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (MUST read first)
- `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12\PROJECT.md`
- Survey 3 Report: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_3\handoff.md`
- Project Root: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`

## Exclusive File Ownership
You exclusively own and may edit:
- `src/components/PiketView.tsx`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Tasks
1. In `src/components/PiketView.tsx`:
   - Fetch the school's `mode_presensi_siswa` from `public.sekolah` on mount using `user.sekolah_id`:
     ```ts
     const [modePresensiSiswa, setModePresensiSiswa] = useState<'qr' | 'manual'>('qr');

     useEffect(() => {
       const fetchSchoolMode = async () => {
         if (!user?.sekolah_id) return;
         try {
           const { data, error } = await supabase
             .from('sekolah')
             .select('mode_presensi_siswa')
             .eq('id', user.sekolah_id)
             .single();
           if (data?.mode_presensi_siswa) {
             setModePresensiSiswa(data.mode_presensi_siswa as 'qr' | 'manual');
           }
         } catch (e) {
           console.error('Error fetching mode_presensi_siswa:', e);
         }
       };
       fetchSchoolMode();
     }, [user?.sekolah_id]);
     ```
   - In tab button rendering:
     - If `modePresensiSiswa === 'manual'`, tab label can be "Presensi Manual Siswa" (or "Presensi Siswa").
     - If `modePresensiSiswa === 'qr'`, tab label remains "Scan QR Siswa".
   - In Tab content (`activeTab === 'scan'`):
     - If `modePresensiSiswa === 'manual'`:
       - Replace the QR scanner kiosk input and camera card with the Manual Attendance Roster:
         - Class filter dropdown/selector (`kelasList`, e.g. using `activeKelas` or `selectedManualKelas`, default to first class or "Semua Kelas").
         - Search input for student name or NISN.
         - Student list table/cards with columns: No, Nama Siswa, NISN, Kelas, Presensi Datang, Presensi Pulang.
         - For Datang:
           - Check if student already has a record in `todayScans` with `status === 'datang'`.
           - If YES: display green checkmark badge with timestamp (`✓ Datang {jam}`). Also allow unmark/cancel if needed.
           - If NO: display "Tandai Datang" button. Clicking calls `recordPresensiSiswa(supabase, { siswa, status: 'datang', sekolahId: user?.sekolah_id, deviceId: 'manual' })` and reloads `fetchTodayScanData()`.
         - For Pulang:
           - Check if student already has a record in `todayScans` with `status === 'pulang'`.
           - If YES: display blue checkmark badge with timestamp (`✓ Pulang {jam}`). Also allow unmark/cancel if needed.
           - If NO: display "Tandai Pulang" button. Clicking calls `recordPresensiSiswa(supabase, { siswa, status: 'pulang', sekolahId: user?.sekolah_id, deviceId: 'manual' })` and reloads `fetchTodayScanData()`.
         - Statistics cards (Total Datang, Total Pulang, Total Unik) and Log Presensi Hari Ini table remain active below.
     - If `modePresensiSiswa === 'qr'`:
       - Retain the exact QR camera scanner and USB HID scanner kiosk inputs without any regression.
2. Run `npx tsc --noEmit` and `npm run build` to ensure 0 errors.
3. Check git status, stage, commit with a descriptive message, and push to origin/main per GEMINI.md.

## Deliverable
Write your completion report to:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m3\handoff.md`
Include build/type check results and diff summary.
Then send a completion message back.


## 2026-10-04T01:35:14Z
You are a Worker agent for Milestone M3 (Piket View QR vs Manual).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m3
Read your task description in: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m3\DISPATCH.md
Also read ORIGINAL_REQUEST.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
and PROJECT.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_12\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You exclusively own:
- src/components/PiketView.tsx

Implement school mode fetching, conditional view rendering in PiketView.tsx (if 'manual': class-filterable student roster with Datang and Pulang marking buttons calling recordPresensiSiswa; if 'qr': retain existing camera and USB HID kiosk scanner).
Verify build with `npx tsc --noEmit` and `npm run build`.
Respect the Git Workflow in GEMINI.md (stage, commit, push to origin/main).
Write your handoff report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_worker_m3\handoff.md
Then send a completion message back.
