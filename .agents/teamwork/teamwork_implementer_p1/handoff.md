# Handoff Report: Verifikasi Retensi Logika Presensi Gerbang & Absensi (R1 - R4)

## Ringkasan Eksekutif
Pekerjaan implementasi dan verifikasi menyeluruh untuk memastikan seluruh logika presensi gerbang piket, absensi wali kelas, alokasi kepulangan, aturan status bolos, fallback jurnal KBM, notifikasi WhatsApp orang tua, serta fungsi cetak/export rekap telah selesai dilakukan dan terverifikasi 100% tanpa regresi.

## 1. File yang Ditambahkan & Disesuaikan
- `tests/presensi_gerbang_dan_absensi_retensi.test.ts`: Test suite verifikasi komprehensif menguji seluruh Acceptance Criteria R1-R4 secara terisolasi dan end-to-end (13/13 passing assertions).
- `package.json`: Menambahkan eksekusi `tests/presensi_gerbang_jam_datang_pulang.test.ts` dan `tests/presensi_gerbang_dan_absensi_retensi.test.ts` ke dalam pipeline `npm test`.

## 2. Hasil Verifikasi Acceptance Criteria
- [x] **R1. Batas waktu input presensi piket pagi s.d. 08:00 WITA tetap berlaku**: Diuji melalui `isIntervensiAllowed('08:00', ...)` pada batas waktu pagi (06:45, 07:30, 07:59, 08:00 valid; 08:01 dan seterusnya terkunci).
- [x] **R1. Jendela absensi pagi wali kelas s.d. 12:00 WITA tetap berlaku**: Diuji melalui `isWaliKelasIntervensiAllowed('12:00', ...)` (fase 'pagi' aktif hingga 12:00, beralih ke 'kbm' / terkunci jika lewat 12:00 sebelum jam kepulangan dimulai).
- [x] **R1. Alokasi presensi pulang guru piket dan wali kelas berlaku selama 1 jam (60 menit) setelah waktu kepulangan dimulai**: Diuji melalui `isPiketPulangAllowed` dan `isWaliKelasIntervensiAllowed` (jamPulangMulai + 60 menit; misalnya 11:00 s.d. 12:00 aktif, lewat 12:00 langsung terkunci fase 'malam_tutup').
- [x] **R2. Aturan status Bolos gerbang & mapel**: Diuji melalui `resolveDailyStudentAttendance` (siswa yang hadir pagi di gerbang atau tercatat hadir di kelas pagi, namun tercatat Alfa atau Bolos pada jurnal KBM sesi jam terakhir otomatis ditetapkan berstatus `Bolos`).
- [x] **R2. Fallback dinamis absensi harian dari sesi jurnal KBM jam pelajaran terakhir**: Diuji melalui `findLastKbmJournal` dan `resolveDailyStudentAttendance` (mewarisi status Hadir/Sakit/Izin/Alfa secara otomatis saat wali kelas belum mengisi absensi harian; mengabaikan placeholder jurnal kosong).
- [x] **R2. Preservasi status resmi izin/sakit**: Siswa berstatus resmi Sakit atau Izin dari wali kelas diproteksi penuh dan tidak pernah tertimpa menjadi Bolos.
- [x] **R3. Notifikasi WhatsApp orang tua & Cetak/Export Rekap**: Integrasi 1-click WhatsApp (`normalizeIndonesianPhoneNumber`, `formatWhatsAppAttendanceMessage`, `generateParentWhatsAppUrl`, `triggerParentWhatsApp`) bekerja normal; fungsi cetak GPS (`triggerPrintWithGps`) serta ekspor CSV (`exportGerbangCsv`, `exportRekapPiketCSV`) terverifikasi utuh.
- [x] **R4. Konsistensi tampilan waktu scan gerbang**: Jam datang dan jam pulang di `RekapSiswaView.tsx` dan `PiketView.tsx` menampilkan waktu scan aktual yang dinormalkan dengan `formatPresensiTime` (WITA) atau tanda strip `-` jika belum presensi pulang. Naive slice fallbacks dieliminasi.
- [x] **Full Suite & Type-Check**: `npx tsc --noEmit` bersih 0 error, `npm run build` sukses, dan `npm test` lulus 100% di semua 48 file tes.
