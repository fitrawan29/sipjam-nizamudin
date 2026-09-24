# Handoff Report — Explorer 2: Requirement R2 (UI/UX & Apple Compatibility)

## 1. Observation
1. **Browser Tab Title**:
   - Berkas: `src/app/layout.tsx:25`
   - Konten: `title: 'SIPJAM SMA NIZAMUDIN',`
   - Berkas: `public/manifest.json:2-3`
   - Konten: `"name": "SIPJAM - SMA Nizamudin", "short_name": "SIPJAM"`
2. **Login Page SaaS Text**:
   - Berkas: `src/components/LoginScreen.tsx:104-108`
   - Konten:
     ```tsx
     <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
       <p className="text-[11px] text-gray-500 dark:text-gray-400">
         Multi-Tenant SaaS • Superadmin, Admin Sekolah & Guru
       </p>
     </div>
     ```
   - Berkas: `src/components/LoginScreen.tsx:71`
   - Konten: `<h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">SIPJAM SaaS Portal</h1>`
3. **Notification Prompt**:
   - Berkas: `src/components/PushNotificationPrompt.tsx:131`
   - Konten: `<div className="fixed bottom-4 right-4 z-50 max-w-md w-[calc(100vw-2rem)] ...">`
   - Konten: Baris 144–149 & 180–186 menyediakan tombol `handleDismiss` ("Nanti" dan tombol ikon silang "X") yang menyimpan `sessionStorage.setItem('sipjam_push_prompt_dismissed', 'true')`.
   - Berkas: `src/components/AppScreen.tsx:23 & 455` merender `PushNotificationPrompt` hanya setelah user berhasil masuk.
4. **Pre-Login Animation**:
   - Berkas: `src/app/page.tsx:76-78`
   - Konten:
     ```tsx
     if (!user) {
       return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
     }
     ```
     Tidak ada animasi transisi atau intro splash screen sebelum `<LoginScreen />` muncul.
5. **iOS / Safari Compatibility**:
   - Berkas: `src/app/layout.tsx:1-46`: Tidak ada ekspor `viewport` atau konfigurasi `viewportFit: 'cover'`.
   - Berkas: `src/app/globals.css:27-35 & 194-207`: Tidak ada kelas `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`, tidak ada `-webkit-overflow-scrolling: touch;` pada scrollbar atau kontainer, dan tidak ada pembatasan font-size input minimal 16px untuk mobile.
   - Berkas: `src/components/AppScreen.tsx:342`: Header menggunakan `fixed top-0` dengan padding `py-3` tanpa safe area top padding.
   - Berkas: `src/components/CameraSelfieCapture.tsx:138-153`:
     ```tsx
     const toggleFacingMode = () => {
       const nextMode = facingMode === 'user' ? 'environment' : 'user';
       setFacingMode(nextMode);
       startCamera(nextMode);
     };

     useEffect(() => {
       requestLocation();
       if (!capturedImage) {
         startCamera(facingMode);
       }
       return () => {
         stopCamera();
       };
     }, [capturedImage, facingMode, requestLocation, startCamera, stopCamera]);
     ```
     Ketika user menekan tombol ganti kamera, terjadi race condition ganda: `startCamera(nextMode)` dipanggil secara langsung, dan sekaligus memicu re-render yang menjalankan cleanup `stopCamera()` dari `useEffect`, kemudian memanggil `startCamera` lagi. Pada AVFoundation iOS WebKit, hal ini memicu `NotReadableError` atau pembekuan kamera.

---

## 2. Logic Chain
1. Dari **Observasi 1**, `title` browser didefinisikan secara statis sebagai `'SIPJAM SMA NIZAMUDIN'`. Menggantinya menjadi `'SIPJAM'` pada `layout.tsx` metadata akan langsung memenuhi syarat nama tab browser.
2. Dari **Observasi 2**, teks persis `"Multi-Tenant SaaS • Superadmin, Admin Sekolah & Guru"` terletak di baris 106 `LoginScreen.tsx`. Menghapus blok kontainer baris 104–108 dan menyederhanakan judul baris 71 menghapus seluruh jejak teks SaaS.
3. Dari **Observasi 3**, user saat ini dapat mengabaikan izin notifikasi dengan menekan "Nanti", dan prompt hanya muncul setelah login. Untuk memenuhi R2.1 ("Paksa user memberikan izin notifikasi saat membuka aplikasi dengan modal/overlay penuh yang memblokir interaksi aplikasi sampai izin diberikan"), modal harus dipindahkan/dibuat di tingkat awal aplikasi (`page.tsx`) dengan backdrop `fixed inset-0 z-[99999]`, tanpa tombol dismiss, dan hanya hilang saat izin diberikan.
4. Dari **Observasi 4**, antarmuka login muncul seketika setelah inisialisasi state. Menambahkan komponen intro splash `PreLoginSplash` berdurasi 1.5–2 detik dengan transisi fade-out ke `<LoginScreen />` akan mewujudkan animasi pre-login yang halus dan elegan.
5. Dari **Observasi 5**:
   - Notch dan Dynamic Island pada iPhone memotong header `fixed top-0` karena ketiadaan `viewportFit: 'cover'` dan safe-area insets. Menambahkan export `viewport` di `layout.tsx` dan `pt-[calc(0.75rem+env(safe-area-inset-top,0px))]` pada header menyelesaikan pemotongan UI.
   - Tanpa `-webkit-overflow-scrolling: touch;`, scroll div pada Safari iOS terasa lambat dan tidak responsif. Menambahkannya pada kelas scroll utilitas mengaktifkan akselerasi hardware momentum scroll.
   - Dual invocation pada `toggleFacingMode` memicu konflik penguncian sensor di AVFoundation Apple. Menghilangkan pemanggilan ganda dan menyisipkan jeda pelepasan track sebelum `getUserMedia` baru mengeliminasi bug freeze kamera iPhone.

---

## 3. Caveats
- Browser Safari iOS (terutama versi sebelum iOS 16.4) memiliki keterbatasan Web Push jika aplikasi tidak ditambahkan ke Home Screen (Add to Home Screen PWA). Modal pemblokir harus mampu mendeteksi ketersediaan API `Notification` agar tidak mengunci perangkat yang secara permanen tidak mendukung Web Push.
- Pengujian kamera iPhone secara penuh membutuhkan perangkat fisik atau emulator iOS WebKit; pengujian simulasi kode (ast/source inspection) dapat memverifikasi eliminasi race condition dan constraint yang tepat.

---

## 4. Conclusion
Seluruh 5 target Requirement R2 telah dipetakan secara tuntas dan presisi hingga nomor baris, CSS class, dan pola kode. Rencana aksi siap diimplementasikan oleh tim implementasi:
1. `src/app/layout.tsx`: Ubah metadata title ke `'SIPJAM'` dan ekspor `viewport` dengan `viewportFit: 'cover'`.
2. `public/manifest.json`: Ubah nama ke `'SIPJAM'`.
3. `src/components/LoginScreen.tsx`: Hapus baris 104–108 dan ubah judul baris 71.
4. `src/components/PreLoginSplash.tsx` & `src/app/page.tsx`: Pasang animasi splash pembuka sebelum menampilkan `LoginScreen`.
5. `src/components/PushNotificationPrompt.tsx` (atau `NotificationPermissionModal.tsx`): Jadikan modal overlay pemblokir penuh layar saat aplikasi dibuka.
6. `src/app/globals.css`: Pasang safe area utilities, momentum scroll touch, dan font-size input mobile 16px.
7. `src/components/AppScreen.tsx`: Berikan padding safe area atas dan bawah.
8. `src/components/CameraSelfieCapture.tsx`: Perbaiki alur pergantian kamera, hilangkan race condition `useEffect`, dan tambahkan timeout delay pelepasan hardware iOS.

---

## 5. Verification Method
1. **Pengujian Teks & Judul:**
   - Cek `layout.tsx`: `grep -n "title: 'SIPJAM'" src/app/layout.tsx`
   - Cek `LoginScreen.tsx`: `grep -n "Multi-Tenant SaaS" src/components/LoginScreen.tsx` harus kosong (0 match).
2. **Pengujian Modal Overlay Pemblokir:**
   - Jalankan uji DOM atau uji berbasis Playwright: Pastikan elemen modal memiliki kelas backdrop penutup penuh (`fixed inset-0 z-[99999]`) dan elemen input di belakangnya tidak dapat diklik sebelum izin diselesaikan.
3. **Pengujian Scroll & Safe Area:**
   - Cek `globals.css`: `grep -n "webkit-overflow-scrolling" src/app/globals.css`
   - Cek `layout.tsx`: `grep -n "viewportFit: 'cover'" src/app/layout.tsx`
4. **Pengujian Kamera:**
   - Cek `CameraSelfieCapture.tsx`: Verifikasi bahwa `toggleFacingMode` tidak lagi memanggil `startCamera` secara tumpang tindih dengan dependensi `useEffect`.
5. **Menjalankan Test Suite Proyek:**
   - Perintah: `npm test`
