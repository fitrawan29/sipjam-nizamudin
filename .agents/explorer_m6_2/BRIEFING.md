# BRIEFING — 2026-09-12T04:38:39Z

## Mission
Investigate R2 (Teacher Dashboard & Interface) and R3 (Admin Dashboard & Verification) to produce a detailed architecture and implementation plan in handoff.md.

## 🔒 My Identity
- Archetype: explorer
- Roles: Teamwork explorer
- Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m6_2\
- Original parent: 391b5d0f-960b-430f-985b-4245841f8551
- Milestone: M6

## 🔒 Key Constraints
- Read-only investigation — do NOT implement source code changes directly.
- Only create reports, progress, briefing, and handoff in working directory.

## Current Parent
- Conversation ID: 391b5d0f-960b-430f-985b-4245841f8551
- Updated: not yet

## Investigation State
- **Explored paths**: `src/components/HomeView.tsx`, `src/components/AppScreen.tsx`, `src/lib/workflow.ts`, `src/components/GuruPresensi.tsx`, `src/components/GuruJurnal.tsx`, `src/components/DokumenView.tsx`, `src/components/HistoryView.tsx`, `src/components/AdminRekapView.tsx`, `src/components/AdminVerifView.tsx`, `src/components/AdminMonitorView.tsx`, `src/components/RekapSiswaView.tsx`, Supabase tables schema via MCP (`data_guru`, `data_mapel`, `guru_mapel`, `jadwal_pelajaran`, `jadwal_piket`, `jurnal_pembelajaran`, `presensi_guru`, `bank_dokumen`, `laporan_piket`).
- **Key findings**:
  1. Teacher dashboard lives in `src/components/HomeView.tsx` (when `isGuru = user?.role !== 'Admin'`).
  2. "Aktivitas Utama" component is in `src/components/HomeView.tsx` lines 467-482.
  3. Personal attendance stats (H, TL, Izin, Sakit) are derived from `presensi_guru` records where `tipe_absen === 'Datang'` and `timestamp` in current month.
  4. Dynamic target journal ratio is calculated by comparing classes assigned today in `jadwal_pelajaran` (`workflow.ts:findJadwalForGuru`) against journals submitted today in `jurnal_pembelajaran` (`isJurnalMatchJadwal`).
  5. Student attendance per subject taught is derived from `guru_mapel` cross-referenced with `jurnal_pembelajaran.absensi_siswa` JSON strings.
  6. Subject document completion: 6 curriculum document types in `DokumenView.tsx`, `bank_dokumen` currently lacks a `mapel` column which should be added to correlate per-subject uploads.
  7. Admin dashboard currently only renders the Header Banner and the legacy "Aktivitas Utama" button grid in `HomeView.tsx` (when `!isGuru`). It needs a full daily status matrix covering all 13 teachers across 4 dimensions: Presensi Datang, Pengisian Jurnal, Laporan Piket, and Presensi Pulang.
  8. Verification page (`AdminVerifView.tsx`) can support reactive dropdown filtering for "Sudah" vs "Belum" completing tasks and verification status (`Menunggu`, `Disetujui`, `Ditolak`) via React state without page reloads.
- **Unexplored areas**: None for R2/R3 scope.

## Key Decisions Made
- Outlined precise data structures, SQL queries, component layouts, and state management for both R2 (Guru) and R3 (Admin).

## Artifact Index
- handoff.md — Comprehensive handoff analysis report
- progress.md — Liveness heartbeat and step tracking
- DISPATCH.md — Incoming prompt record
- BRIEFING.md — Persistent context index
