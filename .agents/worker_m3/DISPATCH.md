## 2026-09-11T10:14:29Z

You are the Global Operations Implementer worker subagent.
Your assigned working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m3

MANDATORY FIRST STEP:
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md. Do not skip this!
Also read c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md and c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_r3_global\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership:
You have exclusive write ownership of:
- src/components/AdminDataView.tsx
- src/components/DokumenView.tsx
- src/components/AdminBackupView.tsx
- src/components/HomeView.tsx
- src/components/HistoryView.tsx
- src/components/AdminConfigView.tsx
DO NOT modify any other files.

Your Mission (Milestone 3 — Requirement R3):
1. In src/components/AdminDataView.tsx:
   - Replace mock alert on "Template" button with dynamic CSV template generation & download for active tab using Blob API.
   - Replace mock alert on "Unggah" button with hidden file input, CSV line parser with quotes handling, and batch upsert query `supabase.from(tabObj.table).upsert(rows, { ignoreDuplicates: false })`.
   - Replace mock alert on "+ Baru" button with interactive modal dialog tailored to active tab fields, inserting via `supabase.from(tabObj.table).insert([newRecord])`.
   - Add Delete button on each master data card with SweetAlert2 confirmation and `supabase.from(tabObj.table).delete().eq(idField, idVal)`.
2. In src/components/DokumenView.tsx:
   - When `user.role === 'Admin'`, fetch all documents from all teachers instead of filtering by `user.nama`.
   - For Admin users, add "Setujui" and "Tolak" action buttons with optional admin notes modal, executing `supabase.from('bank_dokumen').update({ status_verifikasi, catatan_admin }).eq('id', dok.id)`.
3. In src/components/AdminBackupView.tsx:
   - Fix payload columns in `riwayat_backup` insert to match database schema (`id`, `timestamp`, `tahun_backup`, `link_file`, `status`, `keterangan`).
   - Fix card rendering to display `item.tahun_backup` and `item.keterangan`.
4. In src/components/HomeView.tsx:
   - Make active workflow tracker items clickable buttons that navigate to their respective views via `setView`.
5. In src/components/HistoryView.tsx:
   - Add clickable "Lihat Bukti" links on Presensi and Jurnal history cards when `link_bukti` or `link_bukti_foto` is present.
6. In src/components/AdminConfigView.tsx:
   - Add "Deteksi Lokasi Saat Ini" button calling `navigator.geolocation.getCurrentPosition` to automatically populate `gps_lat` and `gps_lng`.
7. Verification:
   - Run `npx tsc --noEmit` to verify 0 TypeScript compilation errors.
   - Run `npm run build` to confirm production build passes cleanly.
8. Git Workflow (GEMINI.md):
   - Check `git status`
   - Stage changes: `git add .`
   - Commit: `git commit -m "feat(global): wire master data CRUD, admin document verification, backup schema, and quick actions"`
   - Push: `git push origin main`
9. Documentation:
   - Write comprehensive handoff report to: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m3\handoff.md
   - Update progress.md in your working directory and notify parent orchestrator via send_message.
