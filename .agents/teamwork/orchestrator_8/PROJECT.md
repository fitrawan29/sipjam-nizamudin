# Project: SIPJAM Camera Orientation & Jurnal KBM Restructuring (Updated per Corrections)

## Architecture
Next.js 16 app with React 19, Supabase database, Tailwind CSS.
Key components:
- `src/components/CameraSelfieCapture.tsx`: Camera component handling `orientation` and `initialFacingMode`
- `src/components/GuruPresensi.tsx`: Attendance component (portrait, user)
- `src/components/GuruJurnal.tsx`: Teaching journal form (landscape, environment)
- `src/components/PiketView.tsx`: Patrol/piket report (landscape, environment)
- `src/components/RekapJurnalView.tsx`: Journal recap view & print document
- Database table: `jurnal_pembelajaran` (columns: `kktp`, `konten`, `lokasi_kbm`)

## Updated Requirements & Corrections (2026-10-03T07:17:31Z)
1. **Hari/Tanggal Format**: Display format `DD-MM-YYYY` (e.g., `03-10-2026`), read-only. Database value stored as `YYYY-MM-DD`.
2. **Konten & Kegiatan**:
   - "Konten" replaces "Materi Pembelajaran". Saved to `konten` and/or `materi`.
   - "Kegiatan Pembelajaran" remains present and REQUIRED as a separate field.
3. **Form Jurnal KBM Field Order**:
   1. No. (`pertemuan_ke`, auto-calculated)
   2. Hari/Tanggal (`DD-MM-YYYY`, read-only)
   3. Tujuan Pembelajaran (required)
   4. KKTP (required, saved to `kktp`)
   5. Konten (replaces Materi Pembelajaran, required, saved to `konten` / `materi`)
   6. Kegiatan Pembelajaran (present, required, saved to `kegiatan`)
   7. Mapel (dropdown, kept visible)
   8. Kelas (dropdown, auto-fill)
   9. Absensi Murid (H/I/S/A buttons + sync to `absensi`)
   10. Lokasi KBM (required, text input, saved to `lokasi_kbm`)
   11. Dokumentasi KBM (landscape CameraSelfieCapture)
   12. Catatan (optional, saved to `catatan_refleksi`)
4. **Mapel / Pertemuan / Jam**:
   - Only **Mapel** is shown in the form UI.
   - **Pertemuan ke-** and **Jam ke-** are removed from the form UI (handled/preserved internally for backward compatibility).
5. **Print Table (Rekap Jurnal Pribadi)**:
   - Reflect updated fields: Konten (replaces Materi), Kegiatan Pembelajaran remains a separate column, KKTP, Lokasi KBM, etc.
   - Fallbacks: Konten (`j.konten || j.materi_pembelajaran || j.materi || '-'`), Kegiatan (`j.kegiatan_pembelajaran || j.kegiatan || '-'`), KKTP (`j.kktp || '-'`), Lokasi KBM (`j.lokasi_kbm || j.lokasi || '-'`), Catatan (`j.catatan_refleksi || j.refleksi || '-'`).
   - Image aspect ratio: landscape (`aspect-video`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Camera Orientation | Presensi is portrait/user, Jurnal & Piket are landscape/environment | M2 | R1 |
| 2 | Print Thumbnail Aspect | RekapJurnalView print thumbnails aspect-video / landscape | M2 | R1 |
| 3 | Form Jurnal KBM Order | 12 ordered items per correction, hide Pertemuan & Jam ke- from UI | M2 | R2 (Updated) |
| 4 | KKTP, Konten, Kegiatan, Lokasi Required | Required validations before submit | M2 | R2 (Updated) |
| 5 | Date Display Format | DD-MM-YYYY read-only display, stored as YYYY-MM-DD | M2 | R2 (Updated) |
| 6 | Attendance & Autofill Preserved | Live attendance sync to absensi and autofill preserved | M2 | R2 |
| 7 | Rekap Jurnal Print Table | Updated columns (Konten, Kegiatan separate, KKTP, Lokasi) with fallbacks | M2 | R3 (Updated) |
| 8 | Database Migration | Apply ALTER TABLE to `jurnal_pembelajaran` for kktp, konten, lokasi_kbm | M1 | R4 |
| 9 | Git Workflow | Status, add, commit, push to origin main | M3 | System |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | DB Migration & Code Survey | Survey code & apply DB columns | none | DONE |
| 2 | Implementation | Implement camera orientations, updated GuruJurnal form, updated RekapJurnalView table | M1 | IN_PROGRESS |
| 3 | Verification & Git Push | Typecheck, build, review, audit, git commit & push | M2 | PLANNED |

## Code Layout
- `src/components/CameraSelfieCapture.tsx`
- `src/components/GuruPresensi.tsx`
- `src/components/GuruJurnal.tsx`
- `src/components/PiketView.tsx`
- `src/components/RekapJurnalView.tsx`
- `src/lib/supabaseClient.ts`
