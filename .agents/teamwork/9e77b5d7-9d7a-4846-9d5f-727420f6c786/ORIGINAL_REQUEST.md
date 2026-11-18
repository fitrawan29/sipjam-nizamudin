# Original User Request
## Initial Request — 2026-11-18T13:47:34Z
# Sipjam-app Attendance and Journal System Enhancements

[Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app]
Integrity mode: development
State folder: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_1

## Requirements

### R1. Attendance Logic Improvements
Implement "sakit", "izin", and "dinas luar" conditions for "presensi pulang". If a teacher has not completed the required Jurnal KBM (e.g., 4 daily, but 0 or 1 done), applying these conditions to "presensi pulang" must update the remaining journals to reflect the condition. Automate "alpa" status if presensi datang/pulang are not performed by the deadline. Automate "pulang cepat" if presensi pulang is not performed.

### R2. Photo Handling
Resolve "Upload dokumen tertunda" and ensure photos (datang/pulang/Jurnal KBM) upload directly. Fix broken preview images in Edit Jurnal KBM. Repair broken/inaccessible photos in Rekap Jurnal Guru.

### R3. Attendance UI Consolidation
Consolidate "presensi datang" and "presensi pulang" views into a single card in the attendance history.

### R4. Perangkat Pembelajaran Simplification
Deduplicate perangkat pembelajaran uploads per grade level if multiple parallel classes exist for the same subject, while ensuring files are distinct and identifiable for different teachers instructing the same subject and grade level. Update labels for these items to "[nama mapel] - [Tingkat] - [Nama Guru]".

### R5. UI and Jurnal Cleanup
Remove "Nomor (Pertemuan ke-)" from Jurnal KBM forms. Remove "cetak jurnal" menu item. Ensure only NISN and Nama Siswa are frozen in the Daftar Nilai table.

### R6. Daftar Nilai Fixes
Enable editing of presensi sesi even when no journal exists.

## Verification Resources
None provided. The implementing team must perform manual validation of attendance and journal workflows, ensuring deduplication and teacher-specific separation for perangkat pembelajaran.

## Acceptance Criteria

### Attendance Logic
- [ ] New conditions (izin, sakit, dinas luar) properly applied to remaining journals.
- [ ] Auto-assignment of "alpa" and "pulang cepat" based on attendance deadlines.

### Photo Handling
- [ ] No "Upload dokumen tertunda" status.
- [ ] Images are previewable and accessible in both edit forms and reports.

### UI/UX
- [ ] Attendance history card is consolidated.
- [ ] "Nomor (Pertemuan ke-)" and "cetak jurnal" menu are removed.
- [ ] Daftar Nilai table freeze is limited to NISN and Nama Siswa.
- [ ] Perangkat pembelajaran uploads are deduplicated per grade level, with teacher-specific identification.
