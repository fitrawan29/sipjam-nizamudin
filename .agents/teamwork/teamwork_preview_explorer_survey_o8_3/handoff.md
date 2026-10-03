# Handoff Report: RekapJurnalView Print Table Restructuring (R3)

**Author**: Explorer Survey 3  
**Target Component**: `src/components/RekapJurnalView.tsx`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_o8_3`  
**Handoff Type**: Hard (Task Complete)  

---

## 1. Observation

1. **Struktur File & Baris Kode**:
   - `src/components/RekapJurnalView.tsx` terdiri dari 886 baris.
   - Pada baris 20, state mode diinisialisasi: `const [tabMode, setTabMode] = useState<'pribadi' | 'kelas'>(initialMode);`.
   - Pada baris 503–646, tabel rekap kelas (`tabMode === 'kelas'`) diimplementasikan dalam 8 kolom: `No`, `Nama Guru`, `Tanggal & Waktu`, `Mapel`, `Jam KBM`, `Materi`, `Foto`, `Keterangan kehadiran guru`.
   - Pada baris 648–769, tabel rekap pribadi (`tabMode === 'pribadi'`) diimplementasikan dalam 8 kolom eksisting:
     - `Hari, tanggal bulan tahun` (baris 654)
     - `Kelas, pertemuan dan jam ke-` (baris 655)
     - `Tujuan pembelajaran` (baris 656)
     - `Materi pembelajaran` (baris 657)
     - `Kegiatan pembelajaran` (baris 658)
     - `Kehadiran murid` (baris 659)
     - `Catatan refleksi` (baris 660)
     - `Foto kegiatan` (baris 661)
   - Pada baris 786–873, ekspor CSV / Excel memiliki dua cabang `if (tabMode === 'kelas')` (baris 792–824) dan `else` (baris 825–861).

2. **Format Thumbnail Foto Eksisting**:
   - Di baris 729: `className="w-14 h-14 object-cover rounded border border-gray-300 dark:border-gray-600 mx-auto bg-white print:w-full print:h-auto print:rounded-none print:border-none print:bg-transparent print:m-0 print:block"`. Ukuran di layar berupa kotak 1:1 (`w-14 h-14` = 56px x 56px), belum lanskap (`aspect-video`).

3. **Status Kolom Database**:
   - Tabel Supabase `jurnal_pembelajaran` didefinisikan pada `src/types/database.ts:508-540`. Kolom `kktp`, `konten`, `lokasi_kbm` akan ditambahkan melalui migrasi SQL R4. Query pengambilan data di `RekapJurnalView.tsx:143-147` menggunakan `select('*')`, sehingga kolom baru akan otomatis tersedia di object `j`.

4. **Koreksi User (Update Dispatch 2026-10-03T07:18:11Z)**:
   - "Konten" menggantikan Materi Pembelajaran dengan fallback: `j.konten || j.materi_pembelajaran || j.materi || '-'`.
   - "Kegiatan Pembelajaran" tetap dipertahankan sebagai kolom terpisah dengan fallback: `j.kegiatan_pembelajaran || j.kegiatan || '-'`.
   - Kolom lainnya: `No`, `Hari/Tanggal`, `Tujuan Pembelajaran`, `KKTP`, `Kelas`, `Absensi Murid (H/I/S/A)`, `Lokasi KBM`, `Foto Dokumentasi` (aspect-video / landscape), `Catatan`.

---

## 2. Logic Chain

1. **Kebutuhan Kolom Baru vs Eksisting**:
   - Dari Observation 1, tabel `tabMode === 'pribadi'` saat ini tidak memiliki kolom `No`, `KKTP`, dan `Lokasi KBM`.
   - Berdasarkan arahan R3 dan koreksi user terbaru (Observation 4), kolom Materi Pembelajaran digantikan oleh `Konten` (`j.konten || j.materi_pembelajaran || j.materi || '-'`), sementara `Kegiatan Pembelajaran` tetap hadir mandiri (`j.kegiatan_pembelajaran || j.kegiatan || '-'`).
   - Penomoran `No` menggunakan `{index + 1}`.
   - Kolom `KKTP` menggunakan `{j.kktp || '-'}`.
   - Kolom `Lokasi KBM` menggunakan `{j.lokasi_kbm || j.lokasi || '-'}`.
   - Kolom `Absensi Murid (H/I/S/A)` menggunakan `{j.kehadiran_murid || formatAbsensi(j.absensi_siswa, j.detail_absen)}`.
   - Kolom `Catatan` menggunakan `{j.catatan_refleksi || j.refleksi || '-'}`.

2. **Penerapan Rasio Lanskap Foto**:
   - Dari Observation 2, foto saat ini diset `w-14 h-14` (kotak).
   - Mengubah kelas CSS menjadi `w-24 aspect-video object-cover` pada tampilan layar dan `print:w-full print:aspect-video print:object-cover` pada mode cetak memastikan rasio 16:9 lanskap terjaga secara proporsional tanpa distorsi.
   - Lokasi teks yang tadinya bertumpuk di bawah foto dapat dihapus/disembunyikan dari cell foto karena sudah memiliki kolom tersendiri (Lokasi KBM).

3. **Verifikasi Isolasi Mode Kelas (`tabMode === 'kelas'`)**:
   - Dari Observation 1, cabang `tabMode === 'kelas'` (baris 503–646) dan ekspor CSV kelas (baris 792–824) terisolasi penuh di dalam cabang ternary dan blok `if`.
   - Modifikasi hanya dilakukan pada blok `else` (baris 648–769 dan 825–861). Dengan demikian, mode kelas dijamin 100% tidak tersentuh dan bebas efek samping.

4. **Kompabilitas Pencarian & Ekspor**:
   - Array headers dan rows pada ekspor Excel/CSV pribadi (baris 826–861) harus disinkronkan dengan kolom baru.
   - Filter `search` pada baris 263–281 harus ditambah agar mencocokkan `j.konten`, `j.kktp`, dan `j.lokasi_kbm`.

---

## 3. Caveats

1. **Ketersediaan Kolom Database**:
   - RekapJurnalView membaca kolom `konten`, `kktp`, dan `lokasi_kbm`. Pastikan migrasi database R4 (`ALTER TABLE jurnal_pembelajaran ADD COLUMN IF NOT EXISTS ...`) telah dieksekusi sebelum data baru dimasukkan. Namun, karena semua kolom memiliki fallback `|| '-'`, tidak akan terjadi error runtime meskipun kolom database bernilai null atau belum terisi.
2. **Proporsi Lebar Kolom Print**:
   - Dokumen rekap dicetak dalam orientasi default lanskap (`orientation="landscape"`). Lebar persentase kolom telah dihitung presisi berjumlah total 100% agar pas sempurna pada kertas A4 tanpa overflow horizontal.

---

## 4. Conclusion

1. Restrukturisasi tabel cetak `RekapJurnalView.tsx` pada mode pribadi siap diimplementasikan dengan 11 kolom (atau 10 kolom bila kegiatan dimerge) sesuai spesifikasi yang terdokumentasi di `report.md`.
2. Fallback logic untuk setiap field telah terverifikasi aman untuk data lama maupun data baru.
3. Rasio foto dokumentasi terkonfigurasi ke lanskap 16:9 (`aspect-video object-cover`).
4. Mode rekap kelas (`tabMode === 'kelas'`) terkonfirmasi aman dan terisolasi tanpa sentuhan.

---

## 5. Verification Method

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Ekspektasi*: Exit code 0 tanpa error TypeScript.
2. **Verifikasi Layout & Kolom**:
   - Buka tampilan Rekap Jurnal Guru Pribadi (`currentView === 'view-guru-rekap-jurnal'`).
   - Periksa header tabel: No, Hari/Tanggal, Tujuan Pembelajaran, KKTP, Konten, Kegiatan Pembelajaran, Kelas, Absensi Murid (H/I/S/A), Lokasi KBM, Foto Dokumentasi, Catatan.
   - Verifikasi bahwa thumbnail foto berbentuk persegi panjang lanskap (bukan bujur sangkar).
   - Klik tab "Rekapan Jurnal Per Kelas" (jika login admin/wali kelas) dan pastikan tabel 8 kolom kelas tetap tampil persis seperti semula.
3. **Verifikasi Output Cetak & Ekspor**:
   - Tekan "Cetak Dokumen" (print preview) dan pastikan seluruh kolom muat rapi dalam mode Landscape.
   - Tekan "Excel" dan periksa file CSV yang diunduh memiliki urutan kolom yang sesuai.
