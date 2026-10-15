# DISPATCH: swe_25

## Identity
- Role: SWE Light Orchestrator
- Working Directory: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_25`
- Original Request File: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md`

## Mission
Perbaiki QR Scanner di HP guru (smartphone) agar dapat mendeteksi kode QR dari kartu presensi digital siswa secara otomatis dan mencatat presensi datang siswa dengan lancar di semua peramban mobile (iOS Safari, Android Chrome, WebView, dll).

## Requirements

### R1. Universal Client-Side QR Decoding (Mobile Fallback)
Integrasikan modul dekoder QR client-side (seperti `jsQR` via Canvas `getImageData` atau fallback sejenis) pada pemindaian kamera `PiketView.tsx`. Ketika `window.BarcodeDetector` bawaan tidak tersedia di perangkat HP guru (terutama iOS Safari dan sebagian Android Chrome), sistem otomatis beralih memproses frame video secara real-time via canvas decoding tanpa memblokir pengguna dengan pesan bahwa browser tidak mendukung.

### R2. Optimasi Kamera HP Guru & Stream Handling
Pastikan aktivasi kamera belakang (`facingMode: { ideal: 'environment' }`) berjalan mulus pada smartphone dengan atribut `playsInline` dan `webkit-playsinline`. Hilangkan pesan peringatan yang memblokir scanner mobile, serta sediakan indikator pemindaian yang responsif dan jernih pada layar HP.

### R3. Perekaman Presensi Datang & Umpan Balik Siswa
Hubungkan hasil pemindaian kode QR kartu presensi digital siswa secara langsung ke fungsi `resolveStudentByCode` dan `recordPresensiSiswa` dengan status `datang`. Berikan audio-visual feedback instan (kartu informasi siswa, bunyi notifikasi sukses/duplikat, dan sinkronisasi rekap harian).

## Verification Resources
- Test suite: `tests/qrSiswa.test.ts` dan `tests/m3_piket_scanner_kiosk.test.ts`
- Script build: `npm run build`

## Acceptance Criteria
- [ ] Kamera pada HP Guru (termasuk iOS Safari & Android Chrome yang tidak memiliki `window.BarcodeDetector`) dapat mendeteksi kode QR kartu presensi siswa secara otomatis melalui fallback client-side canvas.
- [ ] Teks banner scanner di HP tidak lagi menginstruksikan pengguna untuk mencolokkan scanner USB HID ketika membuka di peramban tanpa native BarcodeDetector.
- [ ] Pemindaian kode QR kartu digital siswa berhasil menyelesaikan identitas siswa (`resolveStudentByCode`) dan mencatat kehadiran `datang` ke tabel `presensi_siswa`.
- [ ] Kondisi duplikat presensi datang pada hari yang sama tertangani dengan pesan informatif dan peringatan suara yang sesuai.
- [ ] Seluruh pengujian otomatis di `tests/` berjalan sukses (`PASS`).
- [ ] Perintah `npm run build` berhasil tanpa error TypeScript atau Turbopack.

## Rules & Constraints
1. **Ponytail Rule**: Pilih solusi paling sederhana, minimal, fewest files changed. Jangan tambah dependensi berat jika library yang dibutuhkan (misal jsQR sudah ada di package.json atau dapat digunakan secara efisien). Cek dependensi yang sudah ada di repo sebelum memutuskan.
2. **Git Workflow Rule (GEMINI.md)**: Setiap selesai modifikasi/penambahan file (menyelesaikan tugas/fitur), lakukan: `git status`, `git add .`, `git commit -m "..."`, `git push origin main`.
3. **Next.js Rule (AGENTS.md)**: Baca petunjuk di `node_modules/next/dist/docs/` jika relevan sebelum menulis kode Next.js.
4. **Lifecycle**: Jalankan SWE Light cycle: implementasi oleh `teamwork_preview_implementer`, kemudian review adversarial oleh `teamwork_preview_reviewer` sampai clean, verifikasi dengan test suite dan build produksi. Setelah tervalidasi, buat `handoff.md` dan laporkan selesai ke Sentinel.


## 2026-10-15T05:25:15Z

Server telah di-restart. Lanjutkan proses pengerjaan: resume review rounds, jalankan verifikasi pengujian, dan selesaikan finalisasi hingga tuntas.
