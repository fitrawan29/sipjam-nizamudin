# Implementer Progress: Role-Based Menu Visibility, Kepala Sekolah Admin Viewer & Pengawas Bina Signature

## Status: In Progress

### Completed Analyses:
- Checked existing test suite: 100% pass (33/33 tests pass).
- Identified menu visibility issue in `AppScreen.tsx`: `view-rekap-siswa` was unconditionally present in `menuItemsGuru`.
- Explored `AdminConfigView.tsx`: `guruList` is already loaded; can add Kepala Sekolah appointment dropdown and Pengawas Bina toggle + inputs.
- Explored `PrintHeader.tsx`: `PrintSignature` handles all document printing across the app; can support Pengawas Bina 3-column / endorsement signature block when enabled.
- Explored read-only / monitoring mode for Kepala Sekolah: `AdminVerifView.tsx`, `RekapSiswaView.tsx`, and `AppScreen.tsx`.

### Implementation Steps:
1. [ ] R1: Fix `AppScreen.tsx` `menuItemsGuru` so `view-rekap-siswa`, `view-jurnal-kelas`, and `view-rapor` only appear for active Wali Kelas (or Admin).
2. [ ] R2: In `AdminConfigView.tsx`, add Kepala Sekolah appointment dropdown that populates name/NIP and saves `kepala_sekolah_id` and updates school profile.
3. [ ] R2: In `AppScreen.tsx`, recognize Kepala Sekolah role/assignment and provide Admin monitoring access in read-only mode.
4. [ ] R2: In `AdminVerifView.tsx` and `RekapSiswaView.tsx`, enforce read-only / viewer mode (disable/hide modify, save, verify, delete buttons).
5. [ ] R3: In `AdminConfigView.tsx`, add toggle for Pengawas Bina signature with Nama Lengkap and NIP inputs, persisted to `pengaturan`.
6. [ ] R3: In `PrintHeader.tsx` (`PrintSignature`), add Pengawas Bina signature layout (3-column / endorsement) when enabled, and standard layout when disabled.
7. [ ] Verification: Run all existing tests and create comprehensive new tests covering all acceptance criteria.
8. [ ] Git Workflow: Follow git commit and push requirements.
