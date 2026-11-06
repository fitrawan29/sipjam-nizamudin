## 2026-11-06T22:42:05Z
You are explorer_m1_nov_1.
Your working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_nov_1\
Path to ORIGINAL_REQUEST.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md
Prior Survey Report: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_nov_1\handoff.md

You MUST read ORIGINAL_REQUEST.md and PROJECT.md first.

Your mission is to produce an exact, actionable technical implementation blueprint for:
1. **Presensi & Jurnal Verification Holiday & Excused Handling in `src/components/AdminVerifView.tsx`**:
   - Integrating `kalender_pendidikan` and 5-day week configuration (`pengaturan.hari_sekolah`) into `loadAuxData`.
   - Handling `effectiveDate` if holiday (Sunday, Saturday on 5-day week, or calendar event): Show banner "Hari Libur: [keterangan]" and do NOT mark teachers as unsubmitted or delinquent in `unsubmittedPresensi` and `unsubmittedJurnal`.
   - Multi-day excused leaves: Querying `presensi_guru` where date falls between `tanggal_mulai` and `tanggal_selesai` (or single day timestamp) with status Disetujui/Diverifikasi and jenis_presensi Izin/Sakit.
   - Preserving excused teachers in Jurnal tab with badge "Dikecualikan (Izin / Sakit)" rather than stripping them or flagging them as unsubmitted.
2. **Automated Journal Cutoff Excused Detection in `src/lib/attendanceAlpa.ts`**:
   - Check multi-day leaves in `autoCloseOrMarkDelinquentJournals` so day 2+ leaves are recognized as `leaveType` instead of auto-converting to `Tidak Masuk Kelas`.

Detail the exact functions, line numbers, TypeScript types, and code diff blueprint in your report:
`c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_m1_nov_1\handoff.md`.
Maintain `progress.md` in your working directory.
When finished, notify the orchestrator via send_message.
