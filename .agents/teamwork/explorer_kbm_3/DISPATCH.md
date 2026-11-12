# DISPATCH — explorer_kbm_3

## Task Assignment
Investigate system integration, data contracts, and objective verification plan for Jurnal KBM save and Cetak Jurnal KBM.

## Requirements
- Read ORIGINAL_REQUEST.md at: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
- Investigate data model and schema contracts for KBM journals and teacher journals across the system.
- Map all consumers and potential regression areas (presensi, dashboard, monitoring, rekap, export).
- Design an objective verification methodology (automated test scripts/harness) that proves both save functionality and print rendering work completely and accurately without regressions.
- Deliver analysis to analysis.md and handoff.md in your state folder: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_kbm_3\


## 2026-11-12T05:19:35Z
Anda bertugas sebagai explorer_kbm_3 (KBM Architecture & Verification Planner).
State folder Anda: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_kbm_3\
Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app

MANDATORY FIRST STEP:
Baca file ORIGINAL_REQUEST.md di: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md
Baca DISPATCH.md di state folder Anda.

TUGAS ANDA:
1. Investigasi arsitektur data end-to-end terkait Jurnal KBM Guru dan Cetak Jurnal KBM:
   - Hubungan antara tabel database KBM (`jurnal_kbm`, `jurnal_guru`, `jurnal_pembelajaran`, `jadwal_pelajaran`, `data_kelas`, `data_guru`, dll).
   - Seluruh modul/komponen yang mengonsumsi data ini (dashboard guru, presensi piket, rekapitulasi kepala sekolah/admin, wali kelas) untuk memetakan risiko regresi.
2. Rancang strategi verifikasi objektif (acceptance test plan & automated test suite):
   - Uji penyimpanan jurnal KBM guru (create, update, read-back).
   - Uji data cetak jurnal KBM (memastikan data jurnal guru ter-fetch dan ter-render lengkap tanpa data hilang).
   - Uji non-regresi (memastikan alur kerja lain tetap bekerja tanpa degradasi).
3. Evaluasi interaksi antara perbaikan penyimpanan (R1) dan pemulihan cetak (R2).
4. Tulis laporan komprehensif ke:
   - `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_kbm_3\analysis.md`
   - `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_kbm_3\handoff.md`
5. Kirim pesan ringkasan ke parent saat selesai dengan format Handoff Protocol.

PENTING: Sebagai Explorer, Anda adalah READ-ONLY investigator. JANGAN memodifikasi kode sumber secara langsung.
