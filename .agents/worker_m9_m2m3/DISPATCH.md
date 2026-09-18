## 2026-09-18T12:44:53Z
You are Worker M2M3 (worker_m9_m2m3).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m9_m2m3
Read ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md
Read PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
Read Explorer handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m9_audit\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission is to complete all remaining items for Milestone 2 and Milestone 3:

1. Files Owned Exclusively:
   - `src/components/AppScreen.tsx` (Jurnal Kelas RBAC & menu visibility)
   - `src/components/RekapJurnalView.tsx` (Jurnal Kelas RBAC / class restriction for Wali Kelas)
   - `src/components/AdminConfigView.tsx` (Friday checkout time UI & Teacher attendance exceptions UI)
   - `src/components/PiketView.tsx` (Remove file upload input completely, mount live CameraSelfieCapture)

2. Exact Requirements & Implementation Tasks:

   A. M2 (R3: Hak Akses Jurnal Kelas):
      - In `src/components/AppScreen.tsx`:
        * Check current user role and Wali Kelas status. Admin (`role === 'admin'`) and teachers assigned as Wali Kelas (`data_guru.wali_kelas` or assigned class in `data_kelas`) can access Jurnal Kelas.
        * Regular teachers who are NOT Wali Kelas must NOT see the "Jurnal Kelas" navigation item in the sidebar / navigation menu.
        * If a regular teacher attempts to navigate to `view-jurnal-kelas` directly, display an Access Denied / Terblokir view explaining that only Admin and assigned Wali Kelas have access.
      - In `src/components/RekapJurnalView.tsx`:
        * Ensure that when accessed by a Wali Kelas, the view properly filters or defaults to their assigned class and restricts unauthorized access.

   B. M3 (R4: Pengaturan Kehadiran & Jadwal Admin):
      - In `src/components/AdminConfigView.tsx`:
        * Add configuration input for "Jam Pulang Hari Jumat" (`jam_pulang_jumat` in `pengaturan`, defaulting to '11:00'). Save to `pengaturan` in Supabase.
        * Add configuration interface for "Pengecualian Kehadiran Guru":
          - Fetch teachers from `data_guru`.
          - Provide an interface (checkboxes, toggle switches, or selector) where Admin can designate which teachers "Hanya wajib hadir saat hari mengajar" vs default (every workday).
          - Save the setting to `pengaturan.guru_hanya_mengajar` and/or `data_guru.wajib_hadir_hanya_mengajar`. Ensure compatibility with `src/lib/workflow.ts:getGuruDailyState`.

   C. M3 (R5: Integrasi & Aturan Kamera Langsung Piket):
      - In `src/components/PiketView.tsx`:
        * Remove the file upload element `<input type="file">` (e.g. line 1141) completely. No gallery upload allowed.
        * Integrate `CameraSelfieCapture` directly for capturing picket report photos with live viewfinder, front/rear camera toggle (`facingMode: "user" | "environment"`), and watermark.

3. Verification:
   - Run `npx tsc --noEmit` and ensure exit code 0.
   - Write a unit/integration test in `tests/m9_2_3_verification.test.ts` to verify:
     * `workflow.ts` attendance exception calculation with Friday checkout time and teacher exemption settings.
     * AdminConfigView schema fields persistence.
     * Jurnal Kelas access rule assertions.
   - Run the test using `npx tsx tests/m9_2_3_verification.test.ts` and verify it passes.

4. Output:
   Write a comprehensive report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m9_m2m3\handoff.md` documenting:
   - All changes made with file paths and line references.
   - Verification command outputs (`tsc --noEmit`, test results).
   - Confirmation of acceptance criteria met.

When done, send a completion message to the parent orchestrator via send_message.

## 2026-09-18T12:55:05Z
**Context**: Milestone 2 & Milestone 3 Completion
**Content**: Please report your current progress on Jurnal Kelas RBAC, AdminConfigView Friday/exceptions UI, Piket live camera, and test verification.
**Action**: Provide a brief status update or completion report.
