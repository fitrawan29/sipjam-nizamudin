## 2026-09-12T05:01:02Z
<USER_REQUEST>
Read c:\Users\Fitra\OneDrive\Documents\sipjam-app\ORIGINAL_REQUEST.md (specifically section ## 2026-09-12T04:36:57Z).
Read PROJECT.md at c:\Users\Fitra\OneDrive\Documents\sipjam-app\PROJECT.md.
Read Explorer 2's detailed handoff at c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m6_2\handoff.md.

Your working directory is: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\worker_m6_3\

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY GIT RULE (GEMINI.md):
Setiap kali selesai melakukan modifikasi, penambahan, atau penghapusan file dalam proyek ini (menyelesaikan suatu tugas/fitur), Anda DIWAJIBKAN untuk secara otomatis:
1. Mengecek status git (git status)
2. Melakukan staging pada file yang berubah (git add .)
3. Membuat commit dengan pesan yang deskriptif dan sesuai (git commit -m "...")
4. Melakukan push ke origin branch yang sedang aktif (git push origin main).
JANGAN meminta izin terlebih dahulu untuk push.

Task Scope (Milestone M6.3: Teacher & Admin Dashboards & Verification - R2 & R3):
1. Write ownership:
   - src/components/HomeView.tsx
   - src/components/AdminVerifView.tsx

2. Detailed Requirements:
   a. Teacher Dashboard (HomeView.tsx when isGuru):
      - Remove deprecated "Aktivitas Utama" component completely (lines 467-482).
      - Build Personal Attendance Stat Cards:
        * Query `presensi_guru` for logged-in teacher this month (`tipe_absen === 'Datang'`).
        * Count Hadir (H: tepat waktu), Terlambat (TL: keterlambatan_detik > 0), Izin, Sakit.
        * Render 4 modern cards with icons and color accents (Emerald, Amber, Sky, Rose).
      - Dynamic Target Journal Ratio ("Jurnal terisi vs Total target yang harus diisi hari ini"):
        * Target classes calculated dynamically from `jadwal_pelajaran` for today using `workflow.ts` (`dailyState.jadwalKBM` and `isJurnalMatchJadwal`).
        * Display ratio prominently (e.g. "2 / 2 Selesai" or "0 / 2 Diisi"), progress bar percentage, and status badge ("Selesai", "Belum Lengkap", or "Bebas Mengajar Hari Ini" if target is 0).
      - Student Attendance Percentage per Subject Taught:
        * Query teacher's subjects from `guru_mapel` and journals from `jurnal_pembelajaran`.
        * Parse `absensi_siswa` JSON: percentage = Math.round((totalH / totalRecords) * 100).
        * Render each subject card with class badge, attendance percentage, and visual meter bar.
      - Document Upload Completeness List:
        * Query `bank_dokumen` for logged-in teacher.
        * For each subject in `guru_mapel`, check completeness against the 6 standard Kurikulum Merdeka documents (CP, ATP, RPE, Prota, Promes, RPM).
        * Display a clear status checklist showing which documents are uploaded vs pending for each subject.

   b. Admin Dashboard & Daily Status Matrix (HomeView.tsx when !isGuru):
      - Build comprehensive daily status matrix mapping all 13 teachers from `data_guru`:
        1. Presensi Datang (Hadir [HH:mm], Terlambat [x]m, Izin, or Belum Datang)
        2. Pengisian Jurnal (N/N Selesai, X/N Belum Lengkap, Belum Mengisi, or Bebas KBM)
        3. Laporan Piket (Sudah Lapor, Belum Lapor, or Bukan Petugas)
        4. Presensi Pulang (Pulang [HH:mm], or Belum Pulang)
      - Summary KPI counter cards at top: Total Guru, Sudah Presensi Datang, Jurnal Lengkap, Piket Selesai, Sudah Presensi Pulang.
      - Reactive in-memory search and filter pills ("Semua", "Tugas Lengkap", "Belum Lengkap").

   c. Admin Verification Page (AdminVerifView.tsx):
      - Add reactive dropdown filters for "Sudah" vs "Belum" completing tasks (`taskFilter`: 'Semua' | 'Sudah' | 'Belum') and verification status (`verifFilter`: 'Semua' | 'Menunggu' | 'Disetujui' | 'Ditolak').
      - When `taskFilter === 'Belum'`: cross-reference teachers from `data_guru` against submitted logs for the selected date, displaying teachers who have NOT submitted (e.g. "Belum melakukan presensi", "Belum mengisi jurnal", "Petugas piket belum melapor").
      - Filtering must be instantaneous and client-side (via useMemo / local state) with ZERO page reload and ZERO flicker.

3. Verification:
   - Run `npx tsc --noEmit` and confirm 0 TypeScript errors.
   - Run test suites if applicable.
   - Run git status, git add ., git commit -m "feat(dashboard): overhaul teacher & admin dashboards with daily matrix and reactive filters", git push origin main.
   - Deliver handoff.md with all 5 required sections (Observation, Logic Chain, Caveats, Conclusion, Verification).
   - Send completion message to parent.
</USER_REQUEST>
