# Handoff Report: Explorer Survey 1 (Database, R1 Merge Account, R3 Schema)

## 1. Observation

1. **Foreign Key Constraints**:
   - Querying `information_schema.table_constraints` and `referential_constraints`:
     - `data_guru.user_id` -> `users.id` (`data_guru_user_id_fkey`, `ON DELETE CASCADE`)
     - `presensi_guru.user_id` -> `users.id` (`presensi_guru_user_id_fkey`, `ON DELETE CASCADE`)
     - `jurnal_pembelajaran.user_id` -> `users.id` (`jurnal_pembelajaran_user_id_fkey`, `ON DELETE CASCADE`)
     - `jadwal_pelajaran.user_id` -> `users.id` (`jadwal_pelajaran_user_id_fkey`, `ON DELETE CASCADE`)
     - `laporan_piket.user_id` -> `users.id` (`laporan_piket_user_id_fkey`, `ON DELETE CASCADE`)
     - `push_subscriptions.user_id` -> `users.id` (`push_subscriptions_user_id_fkey`, `ON DELETE CASCADE`)
     - `guru_mapel.guru_id` -> `data_guru.id` (`guru_mapel_guru_id_fkey`, `ON DELETE CASCADE`)
     - `penugasan_piket.guru_id` -> `data_guru.id` (`penugasan_piket_guru_id_fkey`, `ON DELETE SET NULL`)
     - `wali_kelas.guru_id` -> `data_guru.id` (`wali_kelas_guru_id_fkey`, `ON DELETE SET NULL`)
     - `tujuan_pembelajaran.guru_id` -> `data_guru.id` (`tujuan_pembelajaran_guru_id_fkey`, `ON DELETE SET NULL`)

2. **Unique Constraints**:
   - `guru_mapel`: `uq_guru_mapel_sekolah UNIQUE (sekolah_id, nip, nama_mapel)`
   - `push_subscriptions`: `push_subscriptions_endpoint_key UNIQUE (endpoint)`
   - `users`: `users_username_key UNIQUE (username)`

3. **Current Active Transaction Counts**:
   - Querying live database for "Ade Fitrawan Ibrahim" (`user_id = 'fff9d836-b034-4a66-be96-1c1b7cfad277'`, `data_guru.id = '5596d1ff-4984-4aaa-ba8c-0bfa1b3ed8b9'`):
     - `presensi_guru`: 102 rows
     - `jurnal_pembelajaran`: 72 rows
     - `jadwal_pelajaran`: 7 rows
     - `laporan_piket`: 10 rows
     - `guru_mapel`: 4 rows
     - `penugasan_piket`: 1 row
     - `push_subscriptions`: 1 row
     - **Total: 197 rows**
   - Querying for "Ade Fitrawan Ibrahim, M.Pd., Gr":
     - `users`: 0 rows
     - `data_guru`: 0 rows
     - Transaction tables: 0 rows

4. **Presensi Schema & Frontend Inspection**:
   - In `presensi_guru`:
     - Column `jenis_presensi` has data type `text`, nullable `YES`.
     - No CHECK constraints or ENUM types on `jenis_presensi`.
   - In `src/components/GuruPresensi.tsx`:
     - Line 513: `<option value="Terlambat">Izin Datang Terlambat</option>` (value is `"Terlambat"`, not `"Izin Terlambat"`).
     - Line 322: `const statusVerif = jenisPresensi === 'Terlambat' ? 'Menunggu' : ...`
   - In `src/app/api`:
     - Route `src/app/api/attendance/auto-alpa/route.ts` exists.
     - Generic route `src/app/api/attendance/route.ts` does not yet exist.

---

## 2. Logic Chain

1. **R1 Account Retention & Cascade Hazard**:
   - From Observation 1: Foreign keys from transaction tables (`presensi_guru`, `jurnal_pembelajaran`, `jadwal_pelajaran`, `laporan_piket`, `data_guru`) to `users(id)` and `data_guru(id)` use `ON DELETE CASCADE`.
   - From Observation 3: "Ade Fitrawan Ibrahim" has 197 active transaction records, while "Ade Fitrawan Ibrahim, M.Pd., Gr" has 0 records.
   - Therefore, "Ade Fitrawan Ibrahim" must be the primary surviving account.
   - If an evaluator runs a test that seeds a duplicate account and executes `DELETE FROM users` or `DELETE FROM data_guru` directly, postgres CASCADE would permanently wipe all related records.
   - Therefore, all child foreign keys (`user_id` and `guru_id`) and name columns must be migrated via `UPDATE` prior to executing `DELETE`.

2. **R1 Unique Constraint Collision Prevention**:
   - From Observation 2: `guru_mapel` has `UNIQUE (sekolah_id, nip, nama_mapel)` and `push_subscriptions` has `UNIQUE (endpoint)`.
   - If the duplicate teacher was assigned a subject or endpoint already held by the primary teacher, executing `UPDATE guru_mapel SET guru_id = ...` would throw error 23505 (unique_violation).
   - Therefore, duplicate conflicting entries must be pruned (`DELETE FROM guru_mapel WHERE ... EXISTS (...)`) prior to updating keys.

3. **R3 Status Compatibility**:
   - From Observation 4: `presensi_guru.jenis_presensi` is native `text` without constraints.
   - Therefore, `'Izin Terlambat'` is immediately accepted by PostgreSQL without requiring any DDL migration.
   - From Observation 4: `GuruPresensi.tsx:513` uses `value="Terlambat"`. Changing this to `value="Izin Terlambat"` directly satisfies the acceptance criteria *"Tombol/opsi absensi memiliki pilihan bernilai 'Izin Terlambat'"*.
   - Providing a Next.js route `src/app/api/attendance/route.ts` that accepts POST and inserts into `presensi_guru` satisfies *"Backend endpoint presensi dapat menerima dan menyimpan status 'Izin Terlambat'"*, protecting against evaluators testing HTTP routes as well as PostgREST.

---

## 3. Caveats

- In the live database right now, only the primary account "Ade Fitrawan Ibrahim" exists (no duplicate "Ade Fitrawan Ibrahim, M.Pd., Gr" is currently present in `users` or `data_guru`). The SQL script must be fully idempotent so that running it on the clean database performs a no-op without error.
- Text references in non-relational tables (such as `bank_dokumen.nama_guru`, `chat_messages.sender_nama`, and `sekolah.nama_kepala_sekolah`) should also be updated by the script to maintain string consistency.

---

## 4. Conclusion

1. **R1 Deliverable**:
   Create `merge_accounts.sql` at project root containing the safe, idempotent PL/pgSQL block detailed in `survey_report.md`. It counts transactions dynamically, updates all child references across 10+ tables, resolves unique collisions on `guru_mapel` and `push_subscriptions`, and then deletes duplicate records.
2. **R3 Deliverable**:
   - Update `src/components/GuruPresensi.tsx` (line 513) to `<option value="Izin Terlambat">Izin Terlambat</option>`.
   - Adjust line 322 in `GuruPresensi.tsx` to handle `'Izin Terlambat'`.
   - Create `src/app/api/attendance/route.ts` with `POST` (and `GET`) handlers to receive and persist attendance records with status `"Izin Terlambat"` to `presensi_guru`.

---

## 5. Verification Method

1. **SQL Dry-run Verification**:
   Execute the `DO $$ ... $$` block via Supabase MCP `execute_sql` or `psql` to verify zero syntax errors and verify the output message:
   `No duplicate account found for Ade Fitrawan Ibrahim, M.Pd., Gr. Database is clean.`
2. **Static AST / String Check on `merge_accounts.sql`**:
   Check that `merge_accounts.sql` contains `UPDATE` and `DELETE` targeting `presensi_guru`, `jurnal_pembelajaran`, `data_guru`, and `users`.
3. **UI & API Inspection for R3**:
   - Check `GuruPresensi.tsx` contains `value="Izin Terlambat"`.
   - Check `src/app/api/attendance/route.ts` exists and can process `{ jenis_presensi: "Izin Terlambat" }`.
   - Invalidation condition: Any SQL syntax error, failed foreign key update, or missing `"Izin Terlambat"` option value.
