# SWE Light Dispatch (swe_18)

## Target Mission
Sesuaikan aplikasi SIPJAM agar seluruh lini transaksi data (presensi, jurnal, piket, nilai) beroperasi secara online langsung ke cloud Supabase tanpa antrean offline lokal, dengan pengecualian khusus: Asisten AI tetap dipertahankan dalam mode 100% offline (FAQ lokal & knowledge base statis tanpa dependensi API eksternal). Implementasi harus menerapkan prinsip Ponytail (solusi paling efisien, ringkas, tanpa over-engineering, diff seminimal mungkin).

Working directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\swe_18
Project root: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Integrity mode: development

## Requirements

### R1. Online-Only Cloud Transaction Enforcement
Seluruh pencatatan dan submission data operasional (khususnya Presensi Guru di `src/components/GuruPresensi.tsx`, Jurnal Pembelajaran, Presensi Siswa/Piket, Nilai) wajib terkirim langsung secara online ke Supabase. Hapus atau nonaktifkan mekanisme antrean offline lokal (`sipjam_offline_presensi`, `sipjam_offline_presensi_queue`). Jika perangkat terputus dari internet saat mencoba menyimpan/mengirim data, tampilkan peringatan interaktif kepada pengguna bahwa koneksi internet aktif diwajibkan untuk menyimpan transaksi.

### R2. Offline AI Assistant Preservation
Pertahankan arsitektur Asisten AI SIPJAM (`src/components/AIAssistant/`) tetap dalam mode 100% offline (menggunakan fuzzy matcher & knowledge base statis lokal, tanpa panggilan jaringan / API eksternal) sesuai indikator "100% Offline FAQ" yang sudah ada. Jaga agar tidak ada API network call yang ditambahkan ke modul AI.

### R3. Liveness, Network Status & Clean Error Handling
Pastikan deteksi status koneksi dan penanganan error jaringan berjalan konsisten dan jelas, memberikan feedback langsung kepada user tanpa meninggalkan data tertahan di antrean lokal yang berpotensi menimbulkan desinkronisasi.

## Acceptance Criteria

### Online Data Transactions
- [ ] Submisi presensi di `GuruPresensi.tsx` tidak lagi menyimpan antrean offline ke `localStorage` (`sipjam_offline_presensi` / `sipjam_offline_presensi_queue`) saat offline.
- [ ] Saat perangkat offline, aplikasi memberikan peringatan/pesan interaktif bahwa koneksi internet aktif diperlukan untuk menyimpan data.
- [ ] Seluruh data transaksi (presensi, jurnal, piket) langsung berkomunikasi ke Supabase cloud.

### AI Assistant Offline Purity
- [ ] Komponen Asisten AI tetap beroperasi 100% offline tanpa network call eksternal.
- [ ] Test suite `ai_assistant_faq.test.ts` tetap valid dan lulus 100%.

### Verification & Quality
- [ ] Disesuaikan test suite otomatis untuk memverifikasi penegakan mode online pada transaksi data dan retensi offline pada AI assistant.
- [ ] Seluruh pengujian automated test (`npm test`) berjalan dan lulus 100% tanpa regresi.
- [ ] Git commit dan push dilakukan sesuai GEMINI.md.
