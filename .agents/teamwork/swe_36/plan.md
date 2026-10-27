# Plan: swe_36 (SWE Light Orchestration)

## Task Summary
Perbaikan data user di sistem:
1. R1: Standardisasi Akun & Riwayat Guru Fitra Suryazana Mamonto:
   - Di tabel `users`: "FITRA SURYAZANA MAMONTO" -> "Fitra Suryazana Mamonto".
   - Di tabel transaksi (`presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`): "FITRA SURYAZANA MAMONTO" -> "Fitra Suryazana Mamonto".
   - Pastikan relasi akun di `data_guru` (NIP/username 'Fitra') tetap utuh dan aktif.
   - Perbarui file CSV sumber (seperti di folder `csv/`) yang masih mencatat nama kapital menjadi Title Case.
2. R2: Pembersihan Total User & Data Usang Drs. Ahmad Dahlan, M.Pd.:
   - Hapus seluruh sisa rekaman yang memuat "Drs. Ahmad Dahlan, M.Pd." dari tabel database (`users`, `data_guru`, `presensi_guru` misal ID `e1144f72-2ec4-43f2-aebb-10a59063a906`, `jurnal_pembelajaran`, `laporan_piket`, `data_siswa`).
3. Quality & Acceptance:
   - 0 baris query untuk nama "FITRA SURYAZANA MAMONTO" di `users` dan transaksi.
   - 0 baris query untuk nama "Drs. Ahmad Dahlan, M.Pd." di semua tabel.
   - `npm test` lulus 100%.
   - `npx tsc --noEmit` lulus 0 error.
   - Git workflow: `git add . && git commit -m "..." && git push origin main`.

## Refinement Execution Strategy
1. **Round 0: Implementer (`teamwork_preview_implementer`)**
   - Provide original task verbatim.
   - Implementer creates script/SQL/code fixes for DB and CSV files, runs tests, and executes verification queries.
2. **Review Round 1 (`teamwork_preview_reviewer`)**
   - Adversarial review: checks database, CSVs, tests, regressions.
3. **Review Round 2 (`teamwork_preview_reviewer`)**
   - Verification of edge cases, remaining risk, unverified items in ledger.
4. **Review Round 3 (`teamwork_preview_reviewer`)**
   - Final adversarial scrutiny ensuring zero remaining references to old names.
5. **Orchestrator Independent Verification & Victory Audit**
   - Re-run `npm test` and `npx tsc --noEmit`.
   - Dispatch `teamwork_preview_victory_auditor` for independent verification.
6. **Delivery & Git Push**
   - Verify git status, commit, push to origin main.
   - Deliver `handoff.md` and send report to sentinel.
