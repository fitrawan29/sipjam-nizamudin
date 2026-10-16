## 2026-10-16T11:41:24Z

You are worker_o22_m1.
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o22_m1
Caller/Parent ID: b8a13b7c-6c39-493c-96de-cd823a6f72d9

MANDATORY FIRST STEP:
Read the following files before starting any work:
1. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
2. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_22\PROJECT.md
3. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o22_1\survey_report.md
4. Skill instructions: C:\Users\Fitra\.gemini\config\plugins\ponytail\skills\ponytail\SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE BOUNDARIES:
You EXCLUSIVELY own and may modify ONLY these files:
- `src/utils/whatsappUtils.ts` (create this helper file)
- `src/components/PiketView.tsx`
- `src/components/RekapSiswaView.tsx`
Do NOT modify any other files (specifically, do NOT touch GradebookView.tsx or GuruJurnal.tsx).

TASK SPECIFICATION (Milestone 1 - R1: WhatsApp Parent 1-Click):
1. Create `src/utils/whatsappUtils.ts`:
   - `normalizeIndonesianPhoneNumber(raw: string | null | undefined): string | null`
     - Strip all non-digit characters (`+`, `-`, spaces, parentheses).
     - Standardize `08...`, `+62...`, and `62...` into pure international format `628...`.
     - Return `null` if invalid, missing, or less than 9 digits.
   - `formatWhatsAppAttendanceMessage(params: { studentName: string; kelas: string; tanggal: string; status: string; schoolName?: string; note?: string; timeStr?: string }): string`
     - Format a polite, clear Indonesian message for parents:
       - Salam dan identitas pengirim (misal: "Bapak/Ibu Orang Tua/Wali dari {studentName} ({kelas})")
       - Tanggal dan Waktu (jika ada)
       - Status Kehadiran (misal: "Menginformasikan bahwa putra/putri Bapak/Ibu tercatat: {status}")
       - Sekolah ({schoolName || "Sekolah"})
       - Catatan (jika ada keterangan/alasan)
   - `generateParentWhatsAppUrl(params: { phone: string; studentName: string; kelas: string; tanggal: string; status: string; schoolName?: string; note?: string; timeStr?: string }): string`
     - Return `https://wa.me/{normalizedPhone}?text={encodeURIComponent(message)}`.
   - `triggerParentWhatsApp(student: { nama_siswa?: string; nama?: string; kelas?: string; no_hp_ortu?: string | null }, attendance: { status: string; tanggal: string; timeStr?: string; note?: string }, schoolName?: string): Promise<void>`
     - If `no_hp_ortu` normalized successfully, open `window.open(url, '_blank')`.
     - If `no_hp_ortu` is missing or invalid:
       - Show SweetAlert2 dialog (`Swal.fire`) with friendly message that parent's phone is not registered yet.
       - Allow user to either:
         a) Input parent phone number manually and proceed to WhatsApp.
         b) Copy formatted message to clipboard via `navigator.clipboard.writeText` and show confirmation toast.
2. In `src/components/PiketView.tsx`:
   - Import `triggerParentWhatsApp` and `normalizeIndonesianPhoneNumber` from `@/utils/whatsappUtils`.
   - Add a neat 1-click action button with WhatsApp icon (green styling, e.g. `text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg p-1.5` or similar) to:
     - Manual attendance table rows (`filteredManualStudents`)
     - Scan log table rows (`filteredTodayScans`, matching student record)
     - Mobile attendance cards (`filteredManualStudents`)
   - Ensure clicking the button calls `triggerParentWhatsApp` with student name, class, status, date, note, and school name.
3. In `src/components/RekapSiswaView.tsx`:
   - Import `triggerParentWhatsApp` from `@/utils/whatsappUtils`.
   - Add 1-click WhatsApp button to:
     - Presensi Gerbang table (`filteredGerbangStudents`) with `print:hidden`
     - Rekap Absen table (`filteredData`) with `print:hidden`
4. Verification:
   - Run `npx tsc --noEmit` and ensure 0 TypeScript errors.
   - Write your handoff report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o22_m1\handoff.md`.
   - Send completion message to caller b8a13b7c-6c39-493c-96de-cd823a6f72d9.
