# Project: SIPJAM-App Adjustment

## Architecture
- API Layer: `src/app/api/attendance/`
- Business Logic Layer: `src/lib/workflow.ts` (Core logic: journals, class resolution, attendance policies)
- Automated Process Layer: `src/api/push/send-reminders/route.ts`

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Attendance Logic & Automation | Adjustment 1 (Presensi pulang), 12 (Alpa), 13 (Pulang Cepat) | None | PLANNED |
| 2 | Journal/KBM Logic & UI | Adjustment 6 (No. Pertemuan), 7 (Preview foto), 8 (Foto not found), 9 (Edit pertemuan) | None | PLANNED |
| 3 | Attendance History & Reporting UI | Adjustment 2 (Upload tertunda), 3 (Satu kartu), 10 (Freeze kolom), 11 (Cetak jurnal) | None | PLANNED |
| 4 | Class/Subject Management | Adjustment 4 (Paralel upload), 5 (Nama mapel) | None | PLANNED |
