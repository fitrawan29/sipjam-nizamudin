# Dispatch Log

## 2026-10-03T07:13:02Z
You are the Project Orchestrator (orchestrator_8) for sipjam-app.

Working Directory: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\orchestrator_8
Project Root: c:\Users\Fitra\OneDrive\Documents\sipjam-app
Original Request: c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md (Request timestamp: 2026-10-03T07:10:50Z)

Your mission is to lead and execute the project per the latest user request:
Modifikasi aplikasi SIPJAM (Next.js + Supabase) di `c:\Users\Fitra\OneDrive\Documents\sipjam-app` untuk menyesuaikan orientasi kamera per fitur dan merestrukturisasi form Jurnal KBM beserta dokumen cetaknya. Gunakan pendekatan minimal (ponytail): ubah hanya yang perlu, jangan tambahkan abstraksi baru, fewest files changed wins.

IMPORTANT CONSTRAINTS & RULES:
1. ATENSI: Baca `node_modules/next/dist/docs/` sebelum menulis kode Next.js apapun.
2. Git Workflow Rule (GEMINI.md): Setiap kali selesai modifikasi/penambahan/penghapusan file (menyelesaikan tugas/fitur), otomatis cek status git (`git status`), staging (`git add .`), commit pesan deskriptif (`git commit -m "..."`), dan push ke origin branch aktif (`git push origin main`).
3. Ponytail philosophy: Minimal changes, standard libraries, no over-engineering.

REQUIREMENTS:
### R1. Orientasi Kamera per Fitur
Pastikan setiap fitur menggunakan orientasi kamera yang benar pada komponen `CameraSelfieCapture` (src/components/CameraSelfieCapture.tsx):
- Presensi (`src/components/GuruPresensi.tsx`): orientasi potret (`orientation="portrait"`, `initialFacingMode="user"`)
- Jurnal KBM (`src/components/GuruJurnal.tsx`): orientasi lanskap (`orientation="landscape"`, `initialFacingMode="environment"`)
- Piket (`src/components/PiketView.tsx`): orientasi lanskap (`orientation="landscape"`, `initialFacingMode="environment"`)
Sesuaikan juga tampilan thumbnail/preview foto di tabel cetak (`src/components/RekapJurnalView.tsx`) agar rasio gambar sesuai:
- Foto dari jurnal/piket: rasio lanskap (mis. `aspect-video` atau `w-full h-24 object-cover`)
- Foto dari presensi (jika ada di rekap): rasio potret
Catatan: Cek kondisi existing. GuruPresensi sudah portrait, GuruJurnal sudah landscape, PiketView sudah landscape. Jika sudah benar, skip — hanya sesuaikan yang belum benar.

### R2. Restrukturisasi Form Jurnal KBM
Ubah form pengisian Jurnal KBM di `src/components/GuruJurnal.tsx` (hanya section `tipeJurnal === 'Jurnal KBM'`) menggunakan urutan field berikut:
1. No. — nomor urut pertemuan (`pertemuan_ke`), terisi otomatis, bisa diedit manual
2. Hari/Tanggal — otomatis dari tanggal hari ini, ditampilkan dalam format "Sabtu, 4 Oktober 2026" (read-only display). Nilai `tanggal` tetap disimpan sebagai YYYY-MM-DD
3. Tujuan Pembelajaran — textarea, wajib diisi
4. KKTP (Kriteria Ketercapaian Tujuan Pembelajaran) — textarea, wajib diisi; simpan ke kolom `kktp` di tabel `jurnal_pembelajaran`
5. Konten — textarea, wajib diisi; ini TERPISAH dari Materi Pembelajaran dan Kegiatan Pembelajaran (keduanya tetap ada di form tapi bisa di-collapse atau dijadikan secondary). Simpan Konten ke kolom `konten` di tabel `jurnal_pembelajaran`. Materi dan Kegiatan tetap tersimpan ke kolom masing-masing untuk backward-compatibility.
6. Kelas — dropdown pilih kelas (pertahankan logika auto-fill bestehende)
7. Absensi Murid — tombol H/I/S/A per siswa (pertahankan live absensi + sync ke tabel `absensi`)
8. Lokasi KBM — text input, wajib diisi (contoh: "Ruang Kelas 7A", "Lab IPA"); simpan ke kolom `lokasi_kbm` di tabel `jurnal_pembelajaran`
9. Dokumentasi KBM — kamera lanskap (pertahankan komponen CameraSelfieCapture landscape)
10. Catatan — textarea opsional; simpan ke `catatan_refleksi`
Field Mapel, Jam ke- tetap ada (untuk logika dan penyimpanan data) tapi bisa diposisikan sebagai secondary/collapsed. Jangan hapus logika auto-fill yang sudah ada.

### R3. Restrukturisasi Dokumen Cetak Rekap Jurnal Pribadi
Sesuaikan tabel cetak di `src/components/RekapJurnalView.tsx` (mode `pribadi` / `tabMode === 'pribadi'`) agar kolomnya:
| No | Hari/Tanggal | Tujuan Pembelajaran | KKTP | Konten | Kelas | Absensi Murid (H/I/S/A) | Lokasi KBM | Foto Dokumentasi | Catatan |
- Kolom "Absensi Murid" menampilkan ringkasan H/I/S/A (gunakan fungsi `formatAbsensi` yang sudah ada atau `j.kehadiran_murid`)
- Kolom "Konten" menampilkan `j.konten || j.materi_pembelajaran || j.materi || '-'` (fallback untuk data lama)
- Kolom "KKTP" menampilkan `j.kktp || '-'`
- Kolom "Lokasi KBM" menampilkan `j.lokasi_kbm || j.lokasi || '-'`
- Kolom "Catatan" menampilkan `j.catatan_refleksi || j.refleksi || '-'`
- Foto ditampilkan dalam rasio lanskap (aspect-video)
- Mode rekap per kelas (`tabMode === 'kelas'`) TIDAK berubah.

### R4. Migrasi Database (Supabase)
Tambahkan kolom baru ke tabel `jurnal_pembelajaran` menggunakan Supabase MCP (`apply_migration`):
```sql
ALTER TABLE jurnal_pembelajaran 
  ADD COLUMN IF NOT EXISTS kktp TEXT,
  ADD COLUMN IF NOT EXISTS konten TEXT,
  ADD COLUMN IF NOT EXISTS lokasi_kbm TEXT;
```
Pastikan kolom nullable agar tidak merusak data lama. Project Supabase ID: lihat dari `src/lib/supabaseClient.ts` atau `.env.local`.

ACCEPTANCE CRITERIA:
- Camera orientation correctly wired & thumbnail aspect ratios adapted
- Form Jurnal KBM 10 fields matching specified order, KKTP & Lokasi KBM required, Konten preserved & isolated
- Live student attendance sync preserved
- Recap table 10 columns matching requirements with backward compatible fallbacks
- DB migration applied, zero runtime errors
- All verification tests pass, clean build
- Git workflow executed (status, add, commit, push)


## 2026-10-03T07:17:31Z
KOREKSI REQUIREMENTS dari user — mohon terapkan sebelum melanjutkan implementasi:

1. **Format Hari/Tanggal**: Tampilkan dalam format `DD-MM-YYYY` (bukan format panjang "Sabtu, 4 Oktober 2026"). Field read-only display, nilai tersimpan tetap YYYY-MM-DD di database.

2. **Field "Konten"**: Menggantikan **Materi Pembelajaran** saja (bukan Kegiatan Pembelajaran). Field **Kegiatan Pembelajaran tetap ada dan wajib diisi terpisah**. Urutan form yang dikoreksi:
   1. No. (pertemuan_ke, otomatis)
   2. Hari/Tanggal (DD-MM-YYYY, read-only)
   3. Tujuan Pembelajaran (wajib)
   4. KKTP (wajib)
   5. **Konten** (menggantikan Materi Pembelajaran, wajib) — simpan ke kolom `konten` dan/atau `materi`
   6. **Kegiatan Pembelajaran** (tetap ada, wajib)
   7. Mapel (dropdown, tetap ada)
   8. Kelas (dropdown)
   9. Absensi Murid H/I/S/A
   10. Lokasi KBM (wajib)
   11. Dokumentasi KBM (kamera lanskap)
   12. Catatan (opsional)

3. **Field yang disisakan dari grup Mapel/Pertemuan/Jam**: Hanya **Mapel** yang tetap ditampilkan di form. **Pertemuan ke- dan Jam ke- dihapus dari tampilan form** (boleh tetap tersimpan/diisi internal secara otomatis jika diperlukan untuk backward-compat, tapi tidak perlu input dari user).

Sesuaikan juga kolom tabel cetak rekap jurnal pribadi agar mencerminkan koreksi ini (Konten menggantikan Materi Pembelajaran, Kegiatan Pembelajaran tetap ada sebagai kolom terpisah).
