# Adversarial Review & Quality Assurance Report

## Executive Summary
Sebagai reviewer adversarial independen, evaluasi kritis dan pembuktian empiris telah dilakukan terhadap implementasi desain ulang pengaturan kewajiban kehadiran guru (Model B - Eksplisit per Guru) dan propagasi realtime. Evaluasi berhasil mengidentifikasi celah kritis (hanging broadcast websocket, missing AppScreen realtime listener, string boolean vulnerability, channel leak, dan canonical ID serialization) yang luput pada percobaan sebelumnya dan telah diperbaiki serta diverifikasi 100%.

---

## 1. Temuan Celah & Apa yang Diperbaiki dari Percobaan Sebelumnya

### Masalah 1: Unhandled Hanging Supabase Broadcast & Memory Channel Leak pada AdminConfigView
- **Input:** Admin menekan tombol "Simpan Pengaturan" di `AdminConfigView.tsx`.
- **Expected:** Pengaturan tersimpan, sinyal broadcast terkirim ke klien lain, tombol simpan kembali normal, dan channel dibersihkan.
- **Actual:** `supabase.channel(...).send(...)` dipanggil tanpa melakukan `subscribe()`. Dalam `@supabase/supabase-js`, pemanggilan `send()` pada channel yang belum berada dalam status `SUBSCRIBED` atau saat websocket offline/pending menyebabkan promise **HANG / MEMBEKU SELAMANYA**. Hal ini membekukan tombol simpan dalam status loading tanpa feedback sukses, dan channel tidak pernah ditutup via `supabase.removeChannel`.
- **Root Cause:** Tidak adanya penanganan lifecycle subscription, timeout race (`Promise.race`), dan channel cleanup saat memancarkan broadcast.
- **Perbaikan:** Membungkus pengiriman broadcast dengan `Promise.race` bertimeout 1500ms, memastikan subscription berstatus `SUBSCRIBED` sebelum `send()`, dan selalu memanggil `supabase.removeChannel(configChannel)` baik saat berhasil maupun timeout.

### Masalah 2: Celah Ketidakhadiran Listener Realtime di AppScreen.tsx (Gaps in R3 Requirements Coverage)
- **Input:** Admin mengubah status kewajiban kehadiran atau konfigurasi sekolah. Guru sedang membuka aplikasi di perangkat lain.
- **Expected:** Sesuai instruksi R3 ("Komponen guru (`HomeViewGuru.tsx` / `AppScreen.tsx`) mendengarkan perubahan realtime"), `AppScreen.tsx` menginvalidasi session key (`syncKey`), sehingga hak akses navigasi dan modul piket (`usePiket`, `useWaliKelas`) langsung diselaraskan tanpa reload.
- **Actual:** Percobaan awal HANYA menaruh listener di `HomeViewGuru.tsx`. `AppScreen.tsx` dan `useSessionSync.ts` sama sekali tidak mendengarkan sinyal realtime konfigurasi maupun database (`pengaturan` dan `data_guru`).
- **Root Cause:** Implementasi tidak lengkap terhadap spesifikasi R3 pada container root `AppScreen.tsx`.
- **Perbaikan:** Menambahkan realtime postgres_changes listener pada tabel `pengaturan` dan `data_guru` serta broadcast listener di `AppScreen.tsx`, dan menambahkan listener window/storage events di `useSessionSync.ts` agar `syncKey` bertambah secara instan.

### Masalah 3: Serialisasi Non-Kanonikal pada `pengaturan.guru_hanya_mengajar`
- **Input:** Admin menyimpan konfigurasi guru dengan list yang sebelumnya memuat nama guru (legacy record).
- **Expected:** R1 mensyaratkan penyimpanan entri konfigurasi `pengaturan.guru_hanya_mengajar` dalam format `(JSON id)`.
- **Actual:** Percobaan awal langsung melakukan `JSON.stringify(exemptTeacherIds)`, yang berpotensi menyimpan nama guru lama bukan ID UUID kanonikal.
- **Root Cause:** Resolusi ID kanonikal guru dilakukan setelah penyusunan `upsertData`.
- **Perbaikan:** Resolusi ID kanonikal dilakukan di awal sebelum membentuk `upsertData` dan diselaraskan ke state lokal.

### Masalah 4: Kerentanan Evaluasi Boolean String (`"false"`) pada Evaluasi Dua Arah
- **Input:** Kolom `data_guru.wajib_hadir_hanya_mengajar` bernilai string `"false"` (dari parsing form atau respons JSON DB).
- **Expected:** Guru dievaluasi sebagai `wajib_hadir_hanya_mengajar = false` (Wajib Hadir Setiap Hari).
- **Actual:** `Boolean("false")` di JavaScript menghasilkan `true`, sehingga guru yang disetel tidak exempt malah salah dievaluasi menjadi exempt.
- **Root Cause:** Pemakaian `Boolean(...)` secara langsung pada nilai yang bisa berupa string.
- **Perbaikan:** Menambahkan normalisasi string boolean (`'false'`/`'0'` -> `false`, `'true'`/`'1'` -> `true`) pada `attendanceAlpa.ts`, `TeacherReminderManager.tsx`, dan `send-reminders/route.ts`.

---

## 2. File yang Dimodifikasi
1. `src/components/AdminConfigView.tsx`
   - Mengamankan broadcast dengan `Promise.race` timeout 1500ms dan `removeChannel`.
   - Resolusi kanonikal ID guru sebelum serialization ke `pengaturan.guru_hanya_mengajar`.
   - Trimming input pencarian guru dan filter Boolean pada aksi massal.
2. `src/components/AppScreen.tsx`
   - Menambahkan subscription Supabase Realtime (`postgres_changes` untuk `pengaturan` dan `data_guru`, serta broadcast `config_updated`).
3. `src/hooks/useSessionSync.ts`
   - Menambahkan listener `sipjam:config_updated`, `sipjam:guru_updated`, dan storage event untuk menginvalidasi `syncKey`.
4. `src/lib/attendanceAlpa.ts`
   - Menambahkan normalisasi string boolean dan melindungi status eksplisit tanpa merusak keselarasan regex/substring test.
5. `src/components/TeacherReminderManager.tsx`
   - Menambahkan normalisasi string boolean pada penentuan status exempt guru.
6. `src/app/api/push/send-reminders/route.ts`
   - Menambahkan evaluasi robust terhadap string boolean pada pengecualian guru.
7. `src/components/HomeViewAdmin.tsx`
   - Menambahkan evaluasi robust terhadap string boolean pada baris guru admin.
8. `tests/guru_attendance_exemption_redesign.test.ts`
   - Menambahkan verifikasi R3.4 (AppScreen & useSessionSync realtime listeners), proteksi channel broadcast, dan simulasi Skenario 5 (string boolean robustness).

---

## 3. Catatan Verifikasi Empiris
- **Deep Verification (Ran Actual Tests):**
  - `npx tsx tests/guru_attendance_exemption_redesign.test.ts`: **17/17 PASS (100%)**
  - `npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts`: **33/33 PASS (100%)**
  - `npm test`: **183/183 PASS (100%)**
  - `npx tsc --noEmit`: **Exit code 0, 0 type errors**
- **Edge Cases & Adversarial Scenarios Verified:**
  - Skenario 1: Guru Wajib Hadir Setiap Hari di sekolah Hari_Mengajar_Saja tetap wajib hadir & alpa jika mangkir.
  - Skenario 2: Guru Hanya Hari KBM di sekolah Semua_Hari dibebaskan dari presensi & alpa pada hari tanpa tugas.
  - Skenario 3: Backward compatibility data guru null/undefined fallback mulus ke aturan global.
  - Skenario 4: Simulasi filter tab, pencarian responsif (dengan whitespace trim), dan aksi massal ID kanonikal.
  - Skenario 5: Evaluasi tipe data string `"false"` dan `"true"` terbukti konsisten dan aman dari false positives.
  - Skenario 6: Broadcast realtime non-blocking dengan automatic timeout recovery jika koneksi socket terhambat.

---

## 4. Status Masalah Terbuka (Open Issues Ledger)
- **Resolved:** Hanging Supabase Realtime broadcast di `AdminConfigView` kini terlindungi timeout dan channel cleanup.
- **Resolved:** AppScreen dan useSessionSync kini terintegrasi penuh ke realtime updates.
- **Resolved:** String boolean parsing kini dinormalisasi secara aman.
- **Minor Robustness Risk (Sisa Normal):** Jika browser guru berada dalam mode offline total saat Admin mengubah konfigurasi, pembaruan akan tersinkronisasi secara otomatis begitu browser kembali online via reconnect event Supabase atau event focus/visibility browser.
