# Laporan Survei Kode — Requirement R2: UI/UX & Kompatibilitas Apple (Safari/iOS)

**Tanggal Survei:** 2026-09-24  
**Explorer:** Explorer 2 (`teamwork_preview_explorer`)  
**Workspace:** `c:\Users\Fitra\OneDrive\Documents\sipjam-app`  
**Target:** Pemetaan lengkap berkas, baris kode, komponen, styling, serta arsitektur solusi teknis untuk 5 poin penyesuaian R2.

---

## 1. Ringkasan Eksekutif

Survei menyeluruh telah dilakukan pada seluruh basis kode Next.js (App Router v16.3.4, React 19, Tailwind CSS v4) untuk memetakan kebutuhan R2. Ditemukan bahwa:
1. **Modal Notifikasi Penuh (Blocking):** Saat ini `PushNotificationPrompt.tsx` merupakan banner mengambang (floating toast) non-blocking di pojok kanan bawah yang hanya muncul di `AppScreen` setelah login dan memiliki tombol "Nanti" / "Tutup" (`handleDismiss`). Perlu diganti/ditingkatkan menjadi modal overlay penuh (`fixed inset-0 z-[99999]`) yang memblokir seluruh interaksi saat aplikasi pertama kali dibuka hingga izin diberikan/diselesaikan.
2. **Animasi Pre-Login:** Saat ini `src/app/page.tsx` langsung memuat `<LoginScreen />` begitu pengecekan otentikasi awal selesai tanpa adanya transisi/animasi pembuka (splash/intro branding SIPJAM). Perlu ditambahkan komponen animasi pembuka elegan sebelum antarmuka login muncul.
3. **Pembersihan Teks SaaS pada Halaman Login:** Ditemukan tepat di `src/components/LoginScreen.tsx` baris 104–108 (`Multi-Tenant SaaS • Superadmin, Admin Sekolah & Guru`) serta judul header baris 71 (`SIPJAM SaaS Portal`). Teks ini harus dihapus/disederhanakan.
4. **Nama Aplikasi pada Tab Browser (Title):** Ditemukan pada `src/app/layout.tsx` baris 25 berbunyi `'SIPJAM SMA NIZAMUDIN'`. Harus diperbarui menjadi tepat `'SIPJAM'`.
5. **Kompatibilitas Produk Apple (Safari/iOS):**
   - **UI Terpotong & Safe Area:** Tidak ada konfigurasi `viewport` dengan `viewportFit: 'cover'`, dan tidak ada penanganan CSS `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` pada header (`AppScreen.tsx:342`) maupun kontainer utama (`AppScreen.tsx:420`), sehingga terpotong oleh notch/Dynamic Island dan home indicator iPhone. Input juga berukuran font 14px yang memicu auto-zoom Safari iOS (merusak layout).
   - **Scrolling Lancar:** Belum ada `-webkit-overflow-scrolling: touch;` pada kelas scroll kustom dan belum ada `overscroll-behavior-y: contain;` pada modal/drawer.
   - **Bug & Freeze Kamera iPhone:** Ditemukan race condition fatal di `src/components/CameraSelfieCapture.tsx` di mana `toggleFacingMode` memanggil `startCamera` secara langsung bersamaan dengan `setFacingMode` yang memicu pembersihan `useEffect` (`stopCamera`) dan eksekusi ulang. Hal ini menyebabkan crash/freeze di WebKit iOS karena konflik hardware lock AVFoundation.

---

## 2. Pemetaan Berkas & Analisis Rinci per Komponen

### 2.1. Modal Notifikasi Pemblokir Penuh (Blocking Overlay Modal)

#### Berkas Terkait:
- `src/components/PushNotificationPrompt.tsx`
- `src/lib/pushClient.ts`
- `src/app/page.tsx`
- `src/components/AppScreen.tsx`

#### Kondisi Eksisting:
Di `src/components/PushNotificationPrompt.tsx`:
```tsx
// Baris 131: Menggunakan floating toast non-blocking
<div className="fixed bottom-4 right-4 z-50 max-w-md w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-800/60 p-4 transition-all duration-300">
  ...
  {/* Tombol dismiss / tutup yang mengizinkan user mengabaikan izin */}
  <button type="button" onClick={handleDismiss} ...>
  <button type="button" onClick={handleDismiss}>Nanti</button>
</div>
```
Dan di `AppScreen.tsx` baris 23 & 455: Komponen ini hanya dipasang di dalam dashboard pengguna login, bukan di tingkat aplikasi paling awal.

#### Kebutuhan & Desain Arsitektur Baru:
1. **Titik Pemasangan:** Ditempatkan di tingkat aplikasi root (`src/app/page.tsx` atau dipanggil sebagai overlay global). Saat browser membuka aplikasi, periksa `Notification.permission`:
   - Jika `Notification.permission === 'granted'`: Modal tidak perlu tampil.
   - Jika `Notification.permission === 'default'`: Tampilkan modal overlay pemblokir penuh (`fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4`). Tidak ada tombol dismiss ("Nanti" atau "X").
   - Jika `Notification.permission === 'denied'`: Tampilkan overlay pemblokir dengan instruksi membuka blokir di Pengaturan Situs/Browser (ikon gembok di URL bar Safari/Chrome) beserta tombol "Periksa Ulang Izin" / "Muat Ulang Halaman".
2. **Blokir Interaksi Layar Penuh:** Overlay memiliki styling `fixed inset-0 w-screen h-screen z-[99999] pointer-events-auto` sehingga tidak ada klik/sentuhan apa pun yang dapat tembus ke elemen di belakangnya (memenuhi kriteria penerimaan otomatis Playwright/Puppeteer).
3. **Pemisahan Izin Browser vs Push Subscription:**
   - Permintaan izin `Notification.requestPermission()` dapat dipanggil tanpa harus login terlebih dahulu.
   - Begitu user menekan tombol "Izinkan & Aktifkan Notifikasi", browser menampilkan prompt native. Jika diterima, modal langsung tertutup dan membuka akses aplikasi.
   - Jika user sudah login (atau saat login nanti), subscription VAPID disimpan ke backend via `subscribeToPushNotifications(user)`.

---

### 2.2. Animasi Pre-Login Sebelum Halaman Login Muncul

#### Berkas Terkait:
- `src/app/page.tsx`
- `src/components/LoginScreen.tsx`
- Komponen baru yang disarankan: `src/components/PreLoginSplash.tsx`

#### Kondisi Eksisting:
Di `src/app/page.tsx`:
```tsx
// Baris 76-78:
if (!user) {
  return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
}
```
Ketika aplikasi dibuka dan belum ada user yang login di `localStorage`, setelah state `loading` selesai, halaman langsung menampilkan kartu login tanpa animasi pembuka/intro branding.

#### Kebutuhan & Desain Arsitektur Baru:
1. **Alur Transisi:**
   - Saat state awal render untuk pengguna yang belum login, tampilkan animasi pembuka (splash/intro) selama 1.5 – 2.0 detik.
   - Komponen `PreLoginSplash` menampilkan:
     - Ikon identitas SIPJAM (logo topi wisuda / perisai sekolah) dengan efek denyut halus (`animate-pulse` / scaling glow emas `#D4AF37` dan hijau `#0B4619`).
     - Teks "SIPJAM" dengan animasi fade-in bergradien emas/putih dan tracking huruf melebar (`tracking-widest`).
     - Subtitle elegan: "Sistem Informasi Presensi & Jurnal Mengajar".
     - Bar progres memuat minimalis.
   - Setelah waktu jeda selesai, layar bertransisi secara mulus (`opacity-0` -> `opacity-100` / CSS `page-enter`) menampilkan `<LoginScreen />`.
2. **Kemandirian State:**
   - Dapat diatur via state `const [showPreLoginAnim, setShowPreLoginAnim] = useState(true);` di `src/app/page.tsx`.
   - Menggunakan `sessionStorage` jika hanya ingin ditampilkan sekali per sesi browser, ATAU selalu ditampilkan saat halaman login pertama kali dimuat sesuai instruksi spesifikasi.

---

### 2.3. Penghapusan Teks SaaS pada Halaman Login

#### Berkas Terkait:
- `src/components/LoginScreen.tsx`

#### Lokasi Tepat Baris Kode:
1. **Teks Target Utama:**
   Berkas: `src/components/LoginScreen.tsx`, Baris 104–108:
   ```tsx
   <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
     <p className="text-[11px] text-gray-500 dark:text-gray-400">
       Multi-Tenant SaaS • Superadmin, Admin Sekolah & Guru
     </p>
   </div>
   ```
   **Tindakan:** Hapus seluruh blok `<div>` ini (baris 104–108).
2. **Penyempurnaan Teks Terkait (Header):**
   Berkas: `src/components/LoginScreen.tsx`, Baris 71:
   ```tsx
   <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">SIPJAM SaaS Portal</h1>
   ```
   **Tindakan:** Ganti menjadi:
   ```tsx
   <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">SIPJAM Portal</h1>
   ```
   Atau cukup `"SIPJAM"`, sehingga tidak ada sisa kata "SaaS" di seluruh tampilan login.

---

### 2.4. Perubahan Judul Tab Browser Menjadi 'SIPJAM'

#### Berkas Terkait:
- `src/app/layout.tsx`
- `public/manifest.json`

#### Lokasi Tepat Baris Kode:
1. `src/app/layout.tsx`, Baris 24–27:
   ```tsx
   // SEBELUM:
   export const metadata: Metadata = {
     title: 'SIPJAM SMA NIZAMUDIN',
     description: 'Sistem Informasi Manajemen Presensi & Jurnal Mengajar',
   };

   // SESUDAH:
   export const metadata: Metadata = {
     title: 'SIPJAM',
     description: 'Sistem Informasi Manajemen Presensi & Jurnal Mengajar',
   };
   ```
2. `public/manifest.json`, Baris 2–4:
   ```json
   {
     "name": "SIPJAM",
     "short_name": "SIPJAM",
     "description": "Sistem Informasi Manajemen Presensi & Jurnal Mengajar",
     ...
   }
   ```

---

### 2.5. Perbaikan Kompatibilitas Umum Produk Apple (Safari/iOS)

#### A. Viewport & Safe Area Inset (Pencegahan UI Terpotong)
1. **Export Objek `viewport` pada Next.js 16 (`src/app/layout.tsx`):**
   Next.js App Router merekomendasikan pemisahan `metadata` dan `viewport`. Pada Safari iOS, variabel CSS `env(safe-area-inset-*)` **hanya akan bernilai selain 0px** jika meta viewport menyertakan `viewport-fit=cover`.
   ```tsx
   import type { Metadata, Viewport } from 'next';

   export const viewport: Viewport = {
     width: 'device-width',
     initialScale: 1,
     maximumScale: 1,
     userScalable: false,
     viewportFit: 'cover',
     themeColor: '#0B4619',
   };
   ```
2. **Penyesuaian Padding Safe Area di Layout & CSS:**
   - **Header (`src/components/AppScreen.tsx:342`):**
     Saat ini header menggunakan `fixed top-0 w-full px-4 sm:px-6 py-3`. Pada iPhone dengan notch atau Dynamic Island, tombol hamburger dan menu bertumpuk langsung dengan jam status bar dan ikon baterai.
     *Perbaikan:* Tambahkan padding atas safe area: `pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3`.
   - **Main Content (`src/components/AppScreen.tsx:420`):**
     Saat ini: `pt-20 pb-8 px-4 sm:px-6 lg:px-8`.
     *Perbaikan:* `pt-[calc(5.25rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))]` sehingga konten di bagian paling bawah tidak tertutup oleh home indicator bar iPhone.
   - **Pencegahan Auto-Zoom Input di Safari iOS (`src/app/globals.css`):**
     Pada iOS Safari, jika `<input>` atau `<select>` memiliki `font-size` kurang dari 16px (misal `text-sm` = 14px), Safari akan secara paksa memperbesar (zoom in) halaman saat input difokuskan. Akibatnya, seluruh layout tergeser ke kanan dan terpotong!
     *Perbaikan:* Di `src/app/globals.css`, tambahkan rule:
     ```css
     @media screen and (max-width: 768px) {
       input, select, textarea {
         font-size: 16px !important;
       }
     }
     ```
     Atau pastikan `.input-premium` memiliki ukuran teks minimal 16px pada viewport mobile.

#### B. Scrolling Lancar (Smooth & Momentum Scrolling di iOS)
1. **Momentum Scrolling (`-webkit-overflow-scrolling: touch`):**
   Di `src/app/globals.css`, kelas kontainer scroll kustom `.custom-scroll` belum memiliki properti `-webkit-overflow-scrolling: touch;`. Tanpa ini, scroll pada div dengan `overflow-y-auto` di Safari iOS terasa kaku (tidak memiliki inersia / momentum).
   *Perbaikan:* Tambahkan di `globals.css`:
   ```css
   html {
     scroll-behavior: smooth;
     -webkit-text-size-adjust: 100%;
   }

   .custom-scroll,
   .overflow-y-auto,
   .overflow-x-auto {
     -webkit-overflow-scrolling: touch;
     overscroll-behavior-y: contain;
   }
   ```
2. **Pencegahan Rubber-band Chain Scrolling:**
   `overscroll-behavior-y: contain;` memastikan saat pengguna menggulir modal atau drawer hingga ke ujung atas/bawah, Safari tidak memicu elastic bounce pada halaman dasar di baliknya.

#### C. Penanganan Bug & Freeze Kamera iPhone (`src/components/CameraSelfieCapture.tsx`)
Penyebab utama kamera freeze / tidak bisa berganti kamera di iPhone:
1. **Dual Invocation & Race Condition pada `toggleFacingMode`:**
   Di baris 138–142 dan baris 145–153:
   ```tsx
   const toggleFacingMode = () => {
     const nextMode = facingMode === 'user' ? 'environment' : 'user';
     setFacingMode(nextMode);
     startCamera(nextMode); // <-- Eksekusi langsung 1
   };

   useEffect(() => {
     requestLocation();
     if (!capturedImage) {
       startCamera(facingMode); // <-- Eksekusi ganda 2 via re-render useEffect!
     }
     return () => {
       stopCamera(); // <-- Cleanup mematikan track yang sedang/baru diminta!
     };
   }, [capturedImage, facingMode, requestLocation, startCamera, stopCamera]);
   ```
   **Dampak di iOS Safari:**
   AVFoundation (framework media iOS) mengunci perangkat kamera secara ketat. Ketika `stopCamera()` dijalankan di tengah-tengah negosiasi `getUserMedia()` yang baru, Safari WebKit langsung melempar error `NotReadableError: The video stream could not be started` atau membekukan frame video secara permanen.
2. **Pelepasan Hardware Stream (AVFoundation Teardown Delay):**
   Sebelum meminta kamera baru, semua track lama wajib di-stop secara sinkron, `videoRef.current.srcObject = null`, dan diberikan jeda mikro (100–150ms) agar driver kamera iOS menyelesaikan pembebasan sensor fisik sebelum sensor kamera kedua dinyalakan.
3. **Atribut Video untuk iOS Safari:**
   Elemen video wajib memiliki properti DOM `playsinline` dan `webkit-playsinline`, serta dimute (`muted = true`).
   Di JSX:
   ```tsx
   <video
     ref={videoRef}
     playsInline
     autoPlay
     muted
     className={`...`}
   />
   ```
   Dan secara imperatif di ref sebelum pemutaran:
   ```ts
   if (videoRef.current) {
     videoRef.current.setAttribute('playsinline', 'true');
     videoRef.current.setAttribute('webkit-playsinline', 'true');
     videoRef.current.muted = true;
   }
   ```
4. **Constraint Fleksibel (Fallback Chain):**
   Jangan menggunakan resolusi kaku (misal `1280x720` fix) karena sensor kamera depan iPhone memiliki rasio native 4:3 sedangkan kamera belakang sering dinegosiasikan berbeda.
   Gunakan constraint bertingkat:
   ```ts
   const constraints: MediaStreamConstraints = {
     video: {
       facingMode: { ideal: mode },
       width: { ideal: 1280 },
       height: { ideal: 720 },
     },
     audio: false,
   };
   ```
   Jika gagal, lakukan fallback ke `{ video: { facingMode: mode } }` lalu `{ video: true }`.

---

## 3. Rangkuman Berkas yang Perlu Dimodifikasi

| No | Berkas | Lokasi / Baris | Tujuan Perubahan |
|---|---|---|---|
| 1 | `src/app/layout.tsx` | Baris 24–27 & Viewport | Ubah title menjadi `'SIPJAM'`, tambahkan `export const viewport: Viewport` dengan `viewportFit: 'cover'` |
| 2 | `public/manifest.json` | Baris 2–4 | Ubah name & short_name menjadi `'SIPJAM'` |
| 3 | `src/components/LoginScreen.tsx` | Baris 71 & Baris 104–108 | Hapus teks "Multi-Tenant SaaS • ...", sederhanakan judul header menjadi "SIPJAM Portal" |
| 4 | `src/app/globals.css` | Utilities & Media Queries | Tambahkan `-webkit-overflow-scrolling: touch;`, `overscroll-behavior-y: contain;`, safe-area-insets, dan batas min 16px font-size input mobile |
| 5 | `src/components/AppScreen.tsx` | Baris 342 & 420 | Tambahkan safe area top padding pada header dan safe area bottom padding pada main container |
| 6 | `src/components/PushNotificationPrompt.tsx` (atau Modal Baru) | Komponen & `page.tsx` | Ubah menjadi modal overlay penuh pemblokir (`fixed inset-0 z-[99999]`) tanpa tombol dismiss hingga izin diberikan |
| 7 | `src/components/PreLoginSplash.tsx` (baru) & `src/app/page.tsx` | Baris 76–80 | Tambahkan animasi splash/intro sebelum menampilkan form login |
| 8 | `src/components/CameraSelfieCapture.tsx` | Baris 76–155 & 258 | Perbaiki race condition `toggleFacingMode`, tambahkan hardware release delay, optimasi constraint dan atribut inline Safari iOS |

---

## 4. Metodologi Verifikasi

1. **Verifikasi Title & Teks Login:**
   - Script regex pada `LoginScreen.tsx`: pastikan `!content.includes('Multi-Tenant SaaS')`.
   - Script regex pada `layout.tsx`: pastikan `metadata.title === 'SIPJAM'`.
2. **Verifikasi Modal Overlay Notifikasi:**
   - Pengujian DOM/simulasi: Pastikan elemen modal memiliki kelas backdrop penutup penuh (`fixed inset-0`) dengan z-index tinggi, dan tidak merender tombol dismiss (`handleDismiss` / "Nanti").
3. **Verifikasi Kompatibilitas Safari & Kamera:**
   - Audit kode `CameraSelfieCapture.tsx`: Pastikan `toggleFacingMode` tidak memicu double `startCamera`, terdapat penghentian track yang bersih, dan video memiliki atribut `playsInline` serta `muted`.
   - Audit CSS `globals.css` & `layout.tsx`: Pastikan `viewportFit: 'cover'` dan `-webkit-overflow-scrolling: touch;` terpasang.
