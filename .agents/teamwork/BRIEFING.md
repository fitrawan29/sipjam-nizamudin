# BRIEFING — 2026-11-03T03:03:58Z

## Mission
Ensure gate attendance logic preserves agreed rules while maintaining recent changes.

## 🔒 My Identity
- Archetype: sentinel
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\
- Orchestrator: deb62a4b-7249-487d-b175-09bf52efe57c
- Victory Auditor: [to be spawned on victory claim]

## 🔒 Key Constraints
- No technical decisions — relay only
- Victory Audit is MANDATORY before reporting completion
- R1: Retensi Logika Waktu Presensi Gerbang & Wali Kelas (batas pagi 08:00 WITA, jendela walas 12:00 WITA, alokasi pulang 60 menit / isPiketPulangAllowed)
- R2: Retensi Aturan Status Kehadiran (Bolos gerbang & mapel, Fallback jurnal KBM findLastKbmJournal / resolveDailyStudentAttendance)
- R3: Retensi Notifikasi WhatsApp dan Cetak/Export Rekap
- R4: Konsistensi Tampilan Waktu Scan Gerbang (jam datang scan aktual, jam pulang scan aktual atau '-', format formatPresensiTime WITA)
- Single self-contained fix, keep small and focused (SWE Light path)

## User Context
- **Last user request**: Approved task prompt received and routed
- **Pending clarifications**: [none]
- **Delivered results**: [none]

## Project Status
- **Phase**: in progress
- **Route**: SWE Light (`teamwork_swe`)
- **Active Agent**: deb62a4b-7249-487d-b175-09bf52efe57c (`teamwork_swe` in `.agents/teamwork/swe_1/`)
- **Crons**:
  - Cron 1 (Progress Reporting `*/8 * * * *`): task-24
  - Cron 2 (Liveness Check `*/10 * * * *`): task-26

## Victory Audit Status
- **Triggered**: no
- **Verdict**: pending
- **Retry count**: 0

## Artifact Index
- .agents/teamwork/ORIGINAL_REQUEST.md — Authoritative task prompt and requirements record
