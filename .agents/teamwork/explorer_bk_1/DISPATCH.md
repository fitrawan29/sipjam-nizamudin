## 2026-11-09T05:11:15Z
You are explorer_bk_1, a read-only exploration agent.
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_bk_1
You MUST read the original user request before starting work:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

Your Task:
Investigate and survey R1 (Role BK - Bimbingan Konseling & Kontrol Akses) across the SIPJAM codebase.
Specifically:
1. Examine how user roles, authentication, and sessions are defined and managed:
   - Check `src/types/`, `src/lib/navigation.ts`, `src/components/AppScreen.tsx`, `src/components/ClaySidebar.tsx`, `src/components/AdminPenggunaView.tsx`, `src/lib/teacherUserSync.ts`, and database user models/types.
   - How was role `tata_usaha` implemented recently? (Look at role normalization, e.g., `tata_usaha`, `tatausaha`, etc.)
   - Determine the ideal role name and normalization for BK (e.g. `bk` or `guru_bk`, `normRole === 'bk' || normRole === 'gurubk'`).
2. Examine navigation and sidebar menus for the BK role:
   - What menus should a user with role BK have? (e.g., Presensi BK / `view-guru-presensi`, Jurnal BK / `view-jurnal-bk`, Informasi Sekolah / `view-informasi`, Pengaturan Akun / `view-pengaturan-akun`).
   - What default landing view should BK have?
   - How to ensure the AST invariant `{/* AST preservation: data-tour={item.id} */}` is preserved.
3. Examine Access Control & RBAC:
   - How does `evaluateTabRBAC` in `src/lib/navigation.ts` restrict views?
   - How to ensure data jurnal BK is strictly protected: only accessible by role BK, Admin, and Kepala Sekolah.
   - How to prevent regular teachers (`guru`), wali kelas, piket, tata usaha, siswa, and dinas from viewing or accessing Jurnal BK.
4. Examine Admin management of BK accounts:
   - How Admin can assign or create BK accounts in `src/components/AdminPenggunaView.tsx` (e.g. "Tunjuk BK" from existing teachers or creating new BK account).

Constraints:
- You are strictly read-only. DO NOT write or modify any source code files.
- Write your findings and recommendations to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_bk_1\handoff.md`.
- Keep `progress.md` updated in your working directory.
- When finished, send a message to the orchestrator with a summary and the path to your handoff.md.
