## 2026-11-05T17:02:27Z
You are reviewer_o27_m4. Your working directory is c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_o27_m4\

MANDATORY: Read the authoritative request before starting work:
- Path: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Project scope: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\PROJECT.md
- Worker M4 handoff: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_o27_m4\handoff.md

Your task:
Review Milestone M4 changes in:
- `src/components/AdminDataView.tsx`
- `src/lib/dataIntegrityGuard.ts`
- `src/components/AdminConfigView.tsx`
- `src/components/AccountSettingsModal.tsx`

Check for:
1. Master data CSV templates in `AdminDataView.tsx`: verified absence of 'id' and non-UUID samples ('KP-01', 'JP-01') in Kalender_Pendidikan and Jadwal_Pelajaran.
2. `dataIntegrityGuard.ts`: UUID sanitization for tables (`kalender_pendidikan`, `jadwal_pelajaran`, `data_siswa`, `wali_kelas`, `sistem_blok`), automatically replacing missing or non-UUID strings with genuine UUIDs to prevent error 22P02.
3. `AdminConfigView.tsx`: `noValidate` on form, and persistent synchronization of all school identity fields to `sekolah` table.
4. `AccountSettingsModal.tsx`: complete removal of Multi-Gelar Manager and simplification to single `Nama Lengkap *` input.
5. Verification: `npx tsc --noEmit` and `npm test`.
6. Deliver handoff.md with verdict APPROVE or REQUEST_CHANGES.
