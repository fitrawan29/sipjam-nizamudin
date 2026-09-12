## 2026-09-12T10:04:04Z

<USER_REQUEST>
You are a Worker subagent for Milestone 7 (M7.4: Ascending Date Sorting on Recap & Print Views).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m7_recap_sorting

MANDATORY FIRST STEP:
Read the authoritative user request and architectural files:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m7_recap_sorting\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL GIT WORKFLOW RULE (from GEMINI.md):
Every time you finish modifying, adding, or deleting files for this task:
1. Check git status (git status)
2. Stage all changed files (git add .)
3. Commit with descriptive message (git commit -m "feat(recap): enforce ascending date sorting across all recap and print views")
4. Push immediately to remote branch (git push origin main). Do NOT ask for permission, do it automatically!

FILE OWNERSHIP:
You have exclusive write ownership of:
- `src/components/RekapJurnalView.tsx`
- `src/components/RekapSiswaView.tsx`
- `src/components/AdminRekapView.tsx`
- `src/components/PiketView.tsx`
(DO NOT TOUCH `SuperadminView.tsx`, `AppScreen.tsx`, `LoginScreen.tsx`, `PrintHeader.tsx`, or `AdminDataView.tsx` - they belong to parallel worker_m7_auth_ui).

YOUR MISSION:
Implement Requirement R3 and Acceptance Criteria ("selalu mengurutkan (sorting) berdasarkan data tanggal dari yang terkecil (terlama) ke yang terbesar (terbaru); Hasil pencetakan (Cetak Dokumen) pada Rekap Jurnal dan Rekap Presensi secara visual menampilkan baris tabel dari tanggal awal bulan hingga tanggal akhir bulan (ascending)"):

1. In `src/components/RekapJurnalView.tsx`:
   - Change line 59 from `.order('tanggal', { ascending: false })` to:
     `.order('tanggal', { ascending: true }).order('jam_ke', { ascending: true })`
   - Add client-side sorting comparator to `filteredJurnal` to guarantee ascending chronological order from start of month to end of month:
     `(a, b) => (a.tanggal || '').localeCompare(b.tanggal || '') || (Number(a.jam_ke) || 0) - (Number(b.jam_ke) || 0)`
   - Add `if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);` to data fetching.
   - Also add `sekolah_id` filter to `data_siswa` and `data_mapel` fetches.
2. In `src/components/RekapSiswaView.tsx`:
   - Add `.order('tanggal', { ascending: true })` to `jurnal_pembelajaran` query.
   - Add `if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);` to `data_siswa`, `data_mapel`, and `jurnal_pembelajaran`.
3. In `src/components/AdminRekapView.tsx`:
   - Add `.order('timestamp', { ascending: true })` to `presensi_guru` and `jurnal_pembelajaran` queries.
   - Add `.order('tanggal', { ascending: true })` to `laporan_piket` query.
   - Add `if (user?.sekolah_id) ...` filter to all 4 queries (`data_guru`, `presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`).
4. In `src/components/PiketView.tsx` (Tab 3: Rekap Piket):
   - Change line 139 from `.order('tanggal', { ascending: false }).order('timestamp', { ascending: false })` to:
     `.order('tanggal', { ascending: true }).order('timestamp', { ascending: true })`
   - Add `if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);`.
5. Run `npx tsc --noEmit` and `npm run build` to verify 0 errors.
6. Execute Git Workflow (git status -> git add . -> git commit -> git push origin main).
7. Write report to `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m7_recap_sorting\handoff.md`.

When complete, send a message to orchestrator parent (conversation ID: bedfb7f0-1cec-4949-8c24-27709173b6ec).
</USER_REQUEST>
