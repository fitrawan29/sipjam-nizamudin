# Dispatch for Explorer Survey 2

**Role**: Explorer (GuruJurnal Form Restructuring Survey)
**Assigned Scope**: R2
**Working Directory**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_o8_2
**Original Request**: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md

Please inspect:
1. `src/components/GuruJurnal.tsx` (especially section `tipeJurnal === 'Jurnal KBM'`).
2. Current form fields vs required 10 fields order:
   1. No. (pertemuan_ke)
   2. Hari/Tanggal ("Sabtu, 4 Oktober 2026", stored YYYY-MM-DD)
   3. Tujuan Pembelajaran (textarea, required)
   4. KKTP (textarea, required, column `kktp`)
   5. Konten (textarea, required, column `konten`, separated from Materi & Kegiatan)
   6. Kelas (dropdown autofill)
   7. Absensi Murid (H/I/S/A buttons + sync to `absensi` table)
   8. Lokasi KBM (text input, required, column `lokasi_kbm`)
   9. Dokumentasi KBM (landscape CameraSelfieCapture)
   10. Catatan (optional textarea, column `catatan_refleksi`)
3. Secondary/collapsed fields for Mapel, Jam ke-, Materi, Kegiatan.
4. Validation and database submission logic.
Write your findings to `report.md` and `handoff.md`.

## 2026-10-03T07:14:41Z
You are Explorer 2 (Survey for R2 GuruJurnal Form Restructuring).
Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_o8_2

You MUST read ORIGINAL_REQUEST.md at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
and your dispatch instructions at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_o8_2\DISPATCH.md

Your tasks:
1. Examine `src/components/GuruJurnal.tsx` in depth, especially where `tipeJurnal === 'Jurnal KBM'`.
2. Inspect the existing form fields and compare with the required 10 fields order:
   1. No. (pertemuan_ke)
   2. Hari/Tanggal ("Sabtu, 4 Oktober 2026", stored YYYY-MM-DD)
   3. Tujuan Pembelajaran (textarea, required)
   4. KKTP (textarea, required, column `kktp`)
   5. Konten (textarea, required, column `konten`, separated from Materi & Kegiatan)
   6. Kelas (dropdown autofill)
   7. Absensi Murid (H/I/S/A buttons + sync to `absensi` table)
   8. Lokasi KBM (text input, required, column `lokasi_kbm`)
   9. Dokumentasi KBM (landscape CameraSelfieCapture)
   10. Catatan (optional textarea, column `catatan_refleksi`)
3. Note how secondary/collapsed fields (Mapel, Jam ke-, Materi, Kegiatan) are or should be placed.
4. Check state management, validation logic before submit, and the insert/update payload sent to Supabase `jurnal_pembelajaran`.

Write your findings to:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_o8_2\report.md
and create a self-contained handoff report at:
c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_o8_2\handoff.md

When finished, send a message to your parent orchestrator summarizing your findings and pointing to your handoff file.

## 2026-10-03T07:18:07Z
[From Orchestrator Parent]
**Context**: User corrections received for Form Jurnal KBM
**Content**: Attention: User has issued corrections:
1. Hari/Tanggal display: DD-MM-YYYY format (read-only), value stored as YYYY-MM-DD.
2. "Konten" replaces "Materi Pembelajaran" (saved to `konten` and/or `materi`). "Kegiatan Pembelajaran" remains present and REQUIRED as a separate field.
3. Updated Form Order:
   1. No. (pertemuan_ke, otomatis)
   2. Hari/Tanggal (DD-MM-YYYY, read-only)
   3. Tujuan Pembelajaran (wajib)
   4. KKTP (wajib)
   5. Konten (menggantikan Materi Pembelajaran, wajib)
   6. Kegiatan Pembelajaran (tetap ada, wajib)
   7. Mapel (dropdown, tetap ada)
   8. Kelas (dropdown)
   9. Absensi Murid H/I/S/A
   10. Lokasi KBM (wajib)
   11. Dokumentasi KBM (kamera lanskap)
   12. Catatan (opsional)
4. Pertemuan ke- dan Jam ke- dihapus dari tampilan form (hanya Mapel yang disisakan dari grup Mapel/Pertemuan/Jam).
**Action**: Please incorporate these corrections into your analysis and report.md!
