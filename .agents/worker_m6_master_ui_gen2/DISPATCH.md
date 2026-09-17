## 2026-09-17T15:24:00Z
You are worker_m6_master_ui_gen2, a specialized frontend and master data worker replacing a previous worker that stalled.
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m6_master_ui_gen2

MANDATORY: Read ORIGINAL_REQUEST.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md before starting work.
Also read PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md and survey report at:
- c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r5r6\handoff.md

FILE WRITE OWNERSHIP:
You exclusively own:
- src/components/AdminDataView.tsx (Master Data Edit modals & Naik Kelas integration)
- src/components/NaikKelasModal.tsx (New component for Naik Kelas bulk progression)
- src/components/RekapJurnalView.tsx (Rekapan Jurnal Per Kelas with 8 columns)
- src/utils/textUtils.ts (New utility for formatKepalaSekolahTitle)
- src/components/PrintHeader.tsx (Print formatting capitalization)
- src/components/DokumenView.tsx (Perangkat Pembelajaran matrix grouped by subject)
- tests/m6_master_data_polish.test.ts (Automated test suite)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

YOUR MISSION (Milestone 6 - Advanced Master Data & UI Polish):
1. Master Data Edit Interfaces in `src/components/AdminDataView.tsx`:
   - Implement "Edit" button (`handleOpenEditModal`) alongside "Hapus" across all master data tabs:
     - `Data_Siswa`: Edit nama_siswa, nisn, kelas, gender, status, no_hp_ortu.
     - `Data_Guru`: Edit nama_guru, nip, mata_pelajaran, email, no_hp, status.
     - `Data_Mapel`: Edit nama_mapel, kode_mapel, kelompok.
     - `Kalender_Pendidikan`: Edit tanggal_mulai, tanggal_selesai, keterangan, tipe.
     - `Jadwal_Pelajaran`: Edit hari, kelas, mapel, nama_guru, jam_mulai, jam_selesai.
   - Dispatches real Supabase `UPDATE` queries: `supabase.from(tab.table).update(payload).eq(pkField, id)`.
2. "Naik Kelas" Batch Progression Feature:
   - Create `src/components/NaikKelasModal.tsx` and integrate into `AdminDataView.tsx` under `Data_Siswa`:
   - Checkboxes on student cards for multi-selection.
   - 3 operational modes:
     a. Perorangan: Advance selected students to chosen target class.
     b. Per Kelas: Select source class -> select target class or mark as Lulus.
     c. Satu Angkatan: One-click cohort progression (XII -> Lulus, XI -> XII, X -> XI).
   - Executes batch update via `supabase.from('data_siswa').update({ kelas: targetKelas, status: isLulus ? 'Lulus' : 'Aktif' }).in('id', selectedIds)`.
3. "Rekapan Jurnal Per Kelas" in `src/components/RekapJurnalView.tsx`:
   - Add tab/toggle: "Jurnal Guru Pribadi" vs "Rekapan Jurnal Per Kelas".
   - Classroom journal mode queries all journal entries for the selected `kelas` and date range across ALL teachers who taught in that class.
   - Uses exact 8-column layout:
     1. No
     2. Nama Guru
     3. Tanggal & Waktu
     4. Mapel
     5. Jam KBM
     6. Materi
     7. Foto
     8. Keterangan kehadiran guru
   - Includes printable view with `PrintHeader` and `PrintSignature`, and CSV export.
4. "Kepala [Nama Sekolah]" Capitalization:
   - Create `src/utils/textUtils.ts` with `formatKepalaSekolahTitle(schoolName: string): string`:
     - Trims and converts to Capitalize Each Word.
     - Preserves standard Indonesian educational acronyms (SMA, SMK, SMP, SD, MA, MTS, MI, SLB, SMAN, SMKN, SMPN, SDN, MAN).
     - Example: `"SMA NIZAMUDIN "` -> `"Kepala SMA Nizamudin"`.
   - Integrate into `src/components/PrintHeader.tsx` so all print outputs use this standardized title.
5. Perangkat Pembelajaran Matrix in `src/components/DokumenView.tsx`:
   - Group teacher documents by subject (Mata Pelajaran) assigned to the teacher (from `guru_mapel` / `jadwal_pelajaran`).
   - Display a 6-document status matrix for each subject with clear badges: "Sudah Diunggah" vs "Belum Diunggah" (with direct upload trigger).
   - In upload form: add `Mata Pelajaran` and `Kelas` selectors so uploaded documents have `mapel` and `kelas` columns populated in `bank_dokumen`.
6. Verification & Automated Test:
   - Create `tests/m6_master_data_polish.test.ts` validating all 5 features.
   - Run `npx tsc --noEmit` (0 errors).
   - Commit and push git changes per GEMINI.md.
   - Write handoff report and message orchestrator_9.
