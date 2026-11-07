## 2026-11-07T08:27:01Z
You are Worker M4 (worker_o28_m4).
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o28_m4
Workspace: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY REFERENCES:
Before starting work, read:
1. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
2. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
3. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o28_1\report.md (Code diff recommendations for AdminBackupView.tsx)
4. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o28_2\report.md (33 tables & Level 0-5 topological order)
5. c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_o28_3\report.md (Binary photo assets, manifest.json, JSZip recipes)

FILE OWNERSHIP:
You exclusively own and may edit:
- src/components/AdminBackupView.tsx
- package.json & package-lock.json (for installing jszip and @types/jszip)
- (optional) src/lib/backupEngine.ts if you extract modular logic

TASK REQUIREMENTS (R5):
1. Install JSZip:
   Run `npm install jszip` and `npm install -D @types/jszip`.
2. Implement Full System ZIP Backup in `src/components/AdminBackupView.tsx`:
   - Backup all 33 database entities (32 tables + view/tables mapped by explorer_o28_2).
   - Use pagination `range(from, from + 1000 - 1)` so large tables are fully fetched.
   - Filter by `user.sekolah_id` (or `id = targetSekolahId` for root `sekolah` / `sekolah_registry`).
   - Package all tables into `data/<table_name>.json`.
   - Extract Base64 and media photo assets from `users.avatar`, `sekolah.logo_url`, `presensi_guru.link_bukti`, `jurnal_pembelajaran.foto_kegiatan`, `laporan_piket.link_foto`. Store them in the `foto/` directory in the ZIP using `compression: 'STORE'` in JSZip (memory-safe).
   - Include root `manifest.json` containing metadata (appName: 'sipjam-app', version: '2.0', timestamp, sekolah_id, sekolah_nama, exportedBy, totalEntities: 33, tableCounts, assetCount, topologicalLevels).
   - Generate ZIP named `backup_sipjam_<sekolah>_<timestamp>.zip` and trigger browser download.
   - Insert audit record to `riwayat_backup`.
   - DO NOT delete or clear data from database (completely non-destructive).
3. Implement Full System ZIP Restore in `src/components/AdminBackupView.tsx`:
   - Hidden file input `<input type="file" accept=".zip" />` triggered by "Pulihkan dari ZIP" button.
   - Parse ZIP via `JSZip.loadAsync(file)`.
   - Validate `manifest.json` pre-restore.
   - Restore database tables in strict topological order from Level 0 to Level 5:
     - Level 0: sekolah, sekolah_registry, pengaturan
     - Level 1: users, data_mapel, data_kelas, data_siswa, kalender_pendidikan, sistem_blok, syarat_perangkat_pembelajaran, jadwal_piket, piket_form_lock, pengumuman, riwayat_backup
     - Level 2: data_guru, jadwal_pelajaran, presensi_guru, jurnal_pembelajaran, laporan_piket, presensi_siswa, absensi, bank_dokumen, chat_messages, push_subscriptions, pengumuman_dibaca, pengumuman_tanggapan
     - Level 3: guru_mapel, wali_kelas, penugasan_piket
     - Level 4: capaian_pembelajaran, tujuan_pembelajaran
     - Level 5: asesmen_kolom, nilai_siswa
     (Skip database views such as guru_kelas from DB upsert).
   - Upsert records in chunks of 100 with `{ ignoreDuplicates: true }` or safe upsert.
   - Restore photos from `foto/` folder.
4. Preservations & Invariants:
   - Root JSX element MUST remain `<div id="view-admin-backup" className="space-y-4 fade-in">`.
   - Props interface MUST remain `{ user }: { user: any }`.
5. Verification:
   - Run `npx tsc --noEmit` -> ensure 0 errors.
   - Run `npm test` -> ensure all existing tests pass.
   - Run `npm run build` -> ensure build succeeds.
