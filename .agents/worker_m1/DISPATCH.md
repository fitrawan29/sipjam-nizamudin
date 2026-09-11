## 2026-09-11T10:14:29Z
You are the Verification & Piket Implementer worker subagent.
Your assigned working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m1

MANDATORY FIRST STEP:
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md. Do not skip this!
Also read c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md and c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_r1_verification\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership:
You have exclusive write ownership of:
- src/components/AdminVerifView.tsx
- src/components/PiketView.tsx
DO NOT modify any other files to avoid collisions with concurrent workers.

Your Mission (Milestone 1 — Requirement R1):
1. In src/components/AdminVerifView.tsx:
   - Add 'Piket' as third tab alongside 'Presensi' and 'Jurnal'.
   - Add realtime Postgres subscription for table 'laporan_piket'.
   - In loadData(), query 'laporan_piket' when activeTab === 'Piket' (with date filtering if selected, ordered by timestamp descending).
   - Dynamically resolve table ('presensi_guru' | 'jurnal_pembelajaran' | 'laporan_piket') and teacher name column ('guru_pelapor' for piket, 'nama_guru' for presensi/jurnal).
   - In verifyItem(id, status): execute `supabase.from(table).update({ status_verifikasi: status }).eq('id', id)`. Add optimistic state update, SweetAlert2 toast notification, and processingId state to disable buttons during in-flight requests.
   - In bulkVerifyCurrent(): execute batch updates using `supabase.from(table).update({ status_verifikasi: 'Disetujui' }).in('id', batchIds)` with SweetAlert2 confirmation and error handling, supporting Presensi, Jurnal, and Piket.
   - Render Piket cards showing tanggal, guru_pelapor, catatan_apel, and link_foto.
   - Ensure search filter works for all three tabs.
2. In src/components/PiketView.tsx:
   - In "Laporan Terbaru" cards, display status_verifikasi badge (Disetujui, Ditolak, Menunggu).
   - If user?.role === 'Admin', render direct "Setujui" and "Tolak" action buttons that execute `supabase.from('laporan_piket').update({ status_verifikasi: status }).eq('id', id)` with SweetAlert2 feedback.
   - Add a third tab 'rekap' ("Rekap Piket") with month/date filter, search, summary counters, and CSV export per Explorer R2 specifications.
3. Verification:
   - Run `npx tsc --noEmit` to verify 0 TypeScript compilation errors.
   - Run `npm run build` to confirm production build passes cleanly.
4. Git Workflow (GEMINI.md):
   - Check `git status`
   - Stage changes: `git add .`
   - Commit: `git commit -m "feat(verification): functionalize admin verification and piket actions with supabase"`
   - Push: `git push origin main`
5. Documentation:
   - Write comprehensive handoff report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m1\handoff.md
   - Update progress.md in your working directory and notify parent orchestrator via send_message.
