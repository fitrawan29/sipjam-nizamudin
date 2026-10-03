# Laporan Investigasi Komprehensif: Sistem Notifikasi Pengingat Otomatis 5 Menit (R3)

**Tanggal:** 3 Oktober 2026  
**Peneliti:** Explorer 3 (`teamwork_preview_explorer`)  
**Target:** Task R3 — Sistem Notifikasi Pengingat (Reminder) Otomatis Guru  
**Workspace:** `c:\Users\Fitra\OneDrive\Documents\sipjam-app`  

---

## 1. Executive Summary

Investigasi ini menganalisis arsitektur sistem notifikasi pengingat otomatis setiap 5 menit untuk guru pada aplikasi SIPJAM (Next.js 16 + React 19 + Supabase). Sistem ini bertujuan memastikan guru tidak melewatkan 4 kewajiban harian:
1. **Presensi Datang** (memperhatikan jam masuk dan batas keterlambatan).
2. **Jurnal Mengajar** (KBM terjadwal vs Jurnal Kegiatan Sistem Blok).
3. **Laporan Piket** (khusus bagi guru yang bertugas piket hari itu).
4. **Presensi Pulang** (memperhatikan jam pulang normal vs hari Jumat).

Aplikasi telah memiliki fondasi kuat: Service Worker (`public/sw.js`), modul Web Push (`src/lib/pushClient.ts`), mesin evaluasi status harian guru (`src/lib/workflow.ts` — `getGuruDailyState`), serta konfigurasi jam sekolah pada tabel `pengaturan`. Namun, **belum terdapat timer berulang (recurring loop) di frontend** yang secara proaktif mengevaluasi dan mengingatkan guru setiap 5 menit selama sesi aktif. Laporan ini menyajikan arsitektur lengkap implementasi berbasis *Ponytail* (sederhana, tangguh, tanpa dependensi npm tambahan).

---

## 2. Analisis Persyaratan (Task R3)

Berdasarkan `DISPATCH.md` dan `ORIGINAL_REQUEST.md`:

| Komponen Persyaratan | Rincian Kebutuhan |
|---|---|
| **Interval** | Berjalan setiap 5 menit (300.000 ms) saat aplikasi dibuka. |
| **Penerima** | Khusus akun **Guru** (`role === 'guru'` atau non-admin). Admin/Superadmin tidak perlu. |
| **Kondisi 1: Presensi Datang** | Belum absen datang pada rentang jam datang (`jam_datang_mulai` s.d. `jam_datang_akhir`). Bedakan pengingat sebelum batas toleransi (`jam_datang_batas`) dan peringatan terlambat sesudahnya. |
| **Kondisi 2: Jurnal Mengajar** | Sudah presensi datang, namun belum melengkapi jurnal. Jika Sistem Blok aktif: 1 Jurnal Kegiatan. Jika hari reguler: sejumlah jadwal KBM hari itu. |
| **Kondisi 3: Laporan Piket** | Guru terjadwal piket hari itu dan sudah presensi datang, namun belum mengirim laporan piket. |
| **Kondisi 4: Presensi Pulang** | Sudah presensi datang, waktu pulang telah tiba (`jam_pulang_mulai` / `jam_pulang_jumat`), namun belum absen pulang. |
| **Kanal Notifikasi** | Web Notification via Service Worker (berfungsi di foreground maupun background tab), dengan **fallback otomatis ke in-app notification/banner** jika izin notifikasi ditolak/diblokir. |
| **Anti-Spam & Kenyamanan** | Tidak membombardir popup sekaligus; konsolidasi tugas; hormati hari libur, izin/sakit, dan guru yang dikecualikan (hanya hadir di hari mengajar). |

---

## 3. Investigasi Kode & Komponen yang Ada

### 3.1. Mekanisme Notifikasi Saat Ini
1. **Service Worker (`public/sw.js`, 256 baris)**:
   - Terdaftar di scope `'/'`.
   - Menangani caching aset statis dan request GET.
   - Menangani `push` event untuk Web Push VAPID.
   - **Penting:** Sudah memiliki listener `notificationclick` (baris 222–255) yang mencari window client aktif, melakukan `client.focus()`, dan mengarahkan URL tujuan (`targetUrl`).
   - *Observasi:* `sw.js` belum memiliki listener `message` khusus, namun `registration.showNotification(title, options)` dari thread browser utama dapat langsung memicu notifikasi sistem dan kliknya tetap ditangani oleh `sw.js`.
2. **Push Client (`src/lib/pushClient.ts`, 312 baris)**:
   - Fungsi: `isPushNotificationSupported()`, `registerServiceWorker()`, `getPushSubscription()`, `subscribeToPushNotifications(user)`.
   - Menggunakan VAPID key dari backend atau default key.
3. **Modal Izin Notifikasi (`src/components/PushNotificationPrompt.tsx`, 196 baris)**:
   - Dimuat di `AppScreen.tsx` baris 732.
   - Meminta izin notifikasi jika `Notification.permission !== 'granted'`. Jika `denied`, menampilkan panduan membuka blokir izin di browser.
4. **Toast & In-App Alerts (`src/lib/toast.ts`)**:
   - `showToast(title, text, icon)` menggunakan SweetAlert2 Toast mode (`toast: true, position: 'top-end'`).

### 3.2. Mesin Evaluasi Status Harian Guru (`src/lib/workflow.ts`)
Fungsi inti `getGuruDailyState(namaGuru, username, userId, sekolahId)` (baris 174–566) telah mengabstraksi seluruh aturan bisnis:
- **`presensiDatang` & `presensiPulang`**: Membaca tabel `presensi_guru` hari ini, mengabaikan record dengan `status_verifikasi === 'Ditolak'`.
- **`isLibur`**: Mengecek `kalender_pendidikan` dan libur akhir pekan (Minggu, atau Sabtu jika `hari_sekolah === 5`).
- **`isIzinSakit` & `isDinasLuar`**: Mengetahui apakah guru sedang Sakit/Izin (sehingga dibebaskan dari jurnal/piket/pulang).
- **`isPiket` & `laporanPiket`**: Memeriksa penugasan piket dan tabel `laporan_piket`.
- **`jadwalKBM` & `jurnalKBM`**: Membaca jadwal KBM hari ini via `findJadwalForGuru` dan jurnal pembelajaran yang sudah diisi (`isJurnalMatchJadwal`).
- **`isBlok`**: Mengecek sistem blok aktif (`getActiveSistemBlok`). Jika blok aktif, KBM reguler digantikan Jurnal Kegiatan.
- **Pengecualian Guru**: Mengecek field `wajib_hadir_hanya_mengajar` pada `data_guru` dan konfigurasi `guru_hanya_mengajar`. Jika guru tidak memiliki jadwal hari ini, `state.isNonTeachingDay = true` dan `bebasAlpa = true`.
- **`canPresensiPulang`**: Bernilai `true` hanya jika jurnal dan laporan piket telah selesai.

### 3.3. Jam Kerja & Konfigurasi Sekolah
Disimpan di tabel `pengaturan` (dibaca oleh `GuruPresensi.tsx:85` dan `AdminConfigView.tsx:437–457`):
- `jam_datang_mulai`: Default `'06:45'` (Datang Buka)
- `jam_datang_batas`: Default `'07:15'` (Batas Keterlambatan)
- `jam_datang_akhir`: Default `'10:00'` (Datang Tutup)
- `jam_pulang_mulai`: Default `'14:00'` (Pulang Buka Senin–Kamis/Sabtu)
- `jam_pulang_jumat`: Default `'11:00'` (Pulang Buka khusus Hari Jumat)
- `jam_pulang_akhir`: Default `'17:00'` (Pulang Tutup)
- `hari_sekolah`: Default `'6'` (6 hari kerja)
- `aturan_kehadiran_guru`: `'Semua_Hari'` vs `'Hari_Mengajar_Saja'`

Helper waktu di `src/lib/wita.ts`:
- `getWitaNow()`: Objek Date zona WITA.
- `getWitaDateStr()`: String tanggal `YYYY-MM-DD`.
- `getWitaDayName()`: Nama hari (`'Senin'`, `'Jumat'`, dll).
- `getWitaTimeStr()`: String waktu `'HH:MM'`.

### 3.4. Backend Reminder Endpoint (`src/app/api/push/send-reminders/route.ts`)
Endpoint ini berjalan untuk mengirim notifikasi push via Web Push VAPID:
- Task 1: Cek Presensi Datang (baris 141–179).
- Task 2: Cek Jurnal Mengajar (KBM vs Sistem Blok) (baris 182–257).
- Task 3: Cek Laporan Piket (baris 260–294).
- **Temuan Kritis:** Endpoint ini **belum memiliki pengecekan Presensi Pulang (Task 4)**! Hal ini perlu ditambahkan agar backend cron dan frontend reminder sinkron.

---

## 4. Rincian Logika Trigger 4 Kondisi Pengingat

Setiap 5 menit, sistem membandingkan waktu sekarang (WITA) dengan konfigurasi jam kerja dan `dailyState`:

```
                    ┌─────────────────────────┐
                    │ Evaluasi Status Guru    │
                    │ getGuruDailyState()     │
                    └────────────┬────────────┘
                                 │
             ┌───────────────────┼───────────────────┐
             ▼                   ▼                   ▼
    Hari Libur / Weekend?   Izin / Sakit?     Non-Teaching Day?
           (YA)                (YA)                (YA)
             │                   │                   │
             └───────────────────┴───────────────────┘
                                 │
                            [ STOP / SKIP ]
                                 │
                                (TIDAK)
                                 ▼
                     ┌───────────────────────┐
                     │ Cek Waktu WITA        │
                     │ & Evaluasi 4 Tugas    │
                     └───────────┬───────────┘
                                 │
       ┌─────────────────┬───────┴─────────┬─────────────────┐
       ▼                 ▼                 ▼                 ▼
[1. Presensi Datang] [2. Jurnal]       [3. Piket]      [4. Presensi Pulang]
```

### 4.1. Kondisi 1: Presensi Datang
- **Rentang Waktu:** `jam_datang_mulai` (06:45) s.d. `jam_datang_akhir` (10:00).
- **Kondisi:** `!state.presensiDatang || state.presensiDatangDitolak`.
- **Dua Tingkat Pesan:**
  - *Sebelum Batas Terlambat (`waktu < jam_datang_batas`):*  
    **Judul:** "Pengingat Presensi Datang"  
    **Pesan:** "Batas waktu kedatangan hingga jam {jam_datang_batas} WITA. Harap segera lakukan presensi datang selfie."  
    **Tingkat:** *Info / Warning Ringan*
  - *Setelah Batas Terlambat (`waktu >= jam_datang_batas`):*  
    **Judul:** "Peringatan: Presensi Datang Terlambat"  
    **Pesan:** "Anda telah melewati batas waktu masuk ({jam_datang_batas} WITA). Segera lakukan presensi datang sekarang agar tidak tercatat alpa."  
    **Tingkat:** *Urgent / Warning Keras*
- **Aksi URL:** `?view=view-guru-presensi`

### 4.2. Kondisi 2: Jurnal Mengajar
- **Prasyarat:** Sudah presensi datang (`state.presensiDatang`), bukan status Izin/Sakit.
- **Rentang Waktu:** Jam pembelajaran s.d. jam pulang (`07:30` s.d. `jam_pulang_akhir`).
- **Pengecekan Sub-Kasus:**
  - *Kasus Sistem Blok Aktif (`state.isBlok`):*
    - Jika `!state.jurnalKegiatan`:  
      **Judul:** "Pengingat Jurnal Kegiatan (Sistem Blok)"  
      **Pesan:** "Hari ini berlaku Sistem Blok ({state.blokInfo?.nama_kegiatan}). Mohon lengkapi Jurnal Kegiatan Anda."  
      **Aksi URL:** `?view=view-guru-jurnal`
  - *Kasus KBM Reguler:*
    - Guru memiliki jadwal hari ini (`state.jadwalKBM.length > 0`).
    - Jurnal belum lengkap (`state.jurnalKBM.length < state.jadwalKBM.length` atau ada jadwal yang belum cocok via `isJurnalMatchJadwal`).  
      **Judul:** "Pengingat Jurnal Mengajar"  
      **Pesan:** "Anda memiliki {totalJadwal} jadwal mengajar hari ini ({totalTerisi} terisi). Segera isi jurnal pembelajaran Anda."  
      **Aksi URL:** `?view=view-guru-jurnal`

### 4.3. Kondisi 3: Laporan Piket
- **Prasyarat:** Sudah presensi datang (`state.presensiDatang`), dan guru ditugaskan piket hari ini (`state.isPiket`).
- **Rentang Waktu:** `07:30` s.d. `jam_pulang_akhir`.
- **Kondisi:** `!state.laporanPiket || state.laporanPiketDitolak`.
- **Pesan:**  
  **Judul:** "Pengingat Laporan Piket"  
  **Pesan:** "Anda bertugas piket hari ini dan belum mengisi laporan piket. Mohon segera lengkapi laporan piket harian Anda."  
  **Aksi URL:** `?view=view-piket`

### 4.4. Kondisi 4: Presensi Pulang
- **Prasyarat:** Sudah presensi datang (`state.presensiDatang`), bukan status Izin/Sakit.
- **Rentang Waktu:** `effectivePulangMulai` s.d. `jam_pulang_akhir`.
  - Hari Jumat: `jam_pulang_jumat` (default 11:00).
  - Hari lainnya: `jam_pulang_mulai` (default 14:00).
- **Kondisi:** `!state.presensiPulang || state.presensiPulangDitolak`.
- **Dua Skenario:**
  - *Jika tugas lain (jurnal/piket) belum selesai (`!state.canPresensiPulang`):*  
    **Judul:** "Pengingat Kelengkapan Sebelum Pulang"  
    **Pesan:** "Jam pulang telah dibuka, namun Anda belum menyelesaikan: {state.lockedReason}. Selesaikan tugas tersebut agar presensi pulang terbuka."  
    **Aksi URL:** Prioritas ke tugas yang belum selesai (`view-guru-jurnal` atau `view-piket`).
  - *Jika tugas lain sudah selesai (`state.canPresensiPulang`):*  
    **Judul:** "Pengingat Presensi Pulang"  
    **Pesan:** "Waktu kepulangan telah tiba ({effectivePulangMulai} WITA). Jangan lupa melakukan presensi pulang selfie sebelum ditutup ({jam_pulang_akhir} WITA)."  
    **Aksi URL:** `?view=view-guru-presensi`

---

## 5. Arsitektur Notifikasi Multi-Kanal (Foreground, Background & Fallback)

```
                            ┌────────────────────────┐
                            │ Trigger Pengingat 5m   │
                            └───────────┬────────────┘
                                        │
                         Apakah Izin Notifikasi Diberikan?
                                        │
                       ┌────────────────┴────────────────┐
                      (YA)                              (TIDAK)
                       ▼                                 ▼
         ┌───────────────────────────┐     ┌───────────────────────────┐
         │ Web Notification API      │     │ In-App Banner Fallback    │
         │ (Service Worker / Native) │     │ (Floating Card di UI)     │
         └─────────────┬─────────────┘     └─────────────┬─────────────┘
                       │                                 │
     Muncul di OS Notification Shade /         Muncul di bagian atas/bawah
     Desktop Popup saat tab background        layar dengan tombol aksi CTA
                       │                                 │
                       └───────────────┬─────────────────┘
                                       │
                         User Klik Notifikasi / CTA
                                       ▼
                         Buka Tab & Navigasi ke
                         Halaman Terkait Otomatis
```

### 5.1. Kanal 1: Web Notification API (Service Worker)
Ketika `Notification.permission === 'granted'`:
- Dipanggil via `ServiceWorkerRegistration.showNotification(title, options)`.
- Menggunakan parameter:
  ```typescript
  const options = {
    body: message,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `sipjam-reminder-${category}`, // Mencegah tumpukan notifikasi berlebih
    renotify: true, // Membunyikan nada/getar ulang setiap siklus 5 menit
    data: { url: targetUrl, category }
  };
  ```
- **Kelebihan:** Muncul di OS / system tray bahkan ketika pengguna sedang membuka tab lain atau me-minimize browser.
- **Interaksi:** Saat notifikasi diklik, event listener `notificationclick` di `public/sw.js` yang sudah ada akan memfokuskan window browser dan membuka rute tujuan (`targetUrl`).

### 5.2. Kanal 2: In-App Notification Banner (Fallback & Dual-Alert)
Ketika `Notification.permission !== 'granted'` (atau diblokir/tidak didukung perangkat):
- Sistem merender komponen floating banner elegan di UI (misalnya di atas header atau sudut bawah layar).
- Elemen banner:
  - Ikon lonceng animasi (`fa-bell ring-bell`).
  - Badge kategori ("Pengingat Presensi Datang", "Pengingat Jurnal", dsb).
  - Deskripsi ringkas tugas yang belum selesai.
  - Tombol aksi utama (*Call to Action*): misalnya `[ Presensi Datang Sekarang → ]` yang langsung memanggil `handleNavigation('view-guru-presensi')`.
  - Tombol *Tutup / Nanti* (`✕`): Menyembunyikan banner sementara hingga siklus 5 menit berikutnya.
- Ketika tugas selesai dilakukan guru, banner otomatis hilang.

---

## 6. Desain Anti-Spam & Kenyamanan Pengguna

Agar pengingat setiap 5 menit efektif tanpa mengganggu:

1. **Konsolidasi Tugas Tunggal per Siklus:**
   Jika pada jam 13:00 guru belum mengisi Jurnal DAN belum mengisi Laporan Piket, sistem **tidak menembakkan 2 notifikasi terpisah**. Sistem menggabungkan menjadi 1 notifikasi terpadu:  
   *"Pengingat SIPJAM: Anda memiliki 2 tugas yang belum selesai (Jurnal Mengajar & Laporan Piket)."*
2. **Hirarki Prasyarat (Blocker Priority):**
   Jika guru belum presensi datang di pagi hari, fokuskan pengingat HANYA pada Presensi Datang. Jangan ingatkan Jurnal atau Piket sebelum presensi datang terselesaikan, karena jurnal dan piket terkunci tanpa presensi datang.
3. **Penyimpanan Throttle Timestamp (`sessionStorage`):**
   Simpan `sipjam_last_reminder_ts` di `sessionStorage`. Jika guru me-refresh halaman 5 kali dalam 2 menit, interval tidak akan langsung menembakkan notifikasi berulang kali; timer menunggu hingga genap 5 menit dari trigger terakhir.
4. **Respek Hari Libur & Status Izin:**
   Guru yang sedang cuti/izin/sakit, libur akhir pekan, libur kalender, atau guru yang dikecualikan di hari non-mengajar otomatis dilewati (0 notifikasi).

---

## 7. Rencana Struktur Implementasi Teknis

### File Baru yang Diusulkan:
- `src/components/TeacherReminderManager.tsx` (Komponen pengelola interval 5 menit, pengecekan status, dispatch Web Notification, dan render floating in-app banner).

### Integrasi di `src/components/AppScreen.tsx`:
Mount komponen di dalam `AppScreen.tsx` hanya jika pengguna adalah guru:
```tsx
{/* Mount 5-Minute Automated Reminder System for Teachers */}
{user && !isAdmin && !isSuperadmin && (
  <TeacherReminderManager
    user={user}
    onNavigate={(viewId) => handleNavigation(viewId)}
  />
)}
```

### Penambahan di `src/app/api/push/send-reminders/route.ts`:
Tambahkan pengecekan Presensi Pulang (Task 4) setelah Task 3 (Piket) agar endpoint cron push server-side juga memiliki cakupan lengkap:
```typescript
// Task 4: Check Pulang Presensi
for (const teacher of teachers) {
  // Hanya jika sudah presensi datang dan belum presensi pulang
  // Serta waktu sekarang sudah melewati jam_pulang_mulai
}
```

---

## 8. Rencana Verifikasi (Verification Plan)

Implementasi dapat diverifikasi secara objektif melalui:
1. **Verifikasi Komponen & Ekstrak Kode (Static & Unit Test)**:
   - Buat test file `tests/reminder_system_r3.test.ts`.
   - Verifikasi interval diatur 300.000 ms (5 menit).
   - Verifikasi 4 kategori pengingat (Datang, Jurnal, Piket, Pulang) diuji pada kondisi mock yang berbeda.
   - Verifikasi isolasi role: admin dan superadmin tidak memicu pengingat.
2. **Verifikasi Fallback**:
   - Simulasi `Notification.permission = 'denied'` -> Banner in-app muncul di DOM.
   - Simulasi `Notification.permission = 'granted'` -> `registration.showNotification` terpanggil.
3. **Build & Type Check**:
   - Jalankan `npm run build` dan `npx tsc --noEmit` untuk memastikan tidak ada kesalahan TypeScript atau regresi build.

---

## 9. Kesimpulan

Rencana arsitektur untuk Task R3 telah lengkap, matang, dan siap diimplementasikan. Arsitektur ini sepenuhnya mematuhi prinsip *Ponytail* (memanfaatkan fungsi yang sudah ada di `src/lib/workflow.ts`, `src/lib/wita.ts`, dan `public/sw.js` tanpa menambah package baru) serta memenuhi seluruh kriteria penerimaan pengguna.
