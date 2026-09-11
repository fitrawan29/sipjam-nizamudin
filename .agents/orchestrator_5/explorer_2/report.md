# Laporan Investigasi Mendalam: R2 & R3
**Investigator**: Explorer 2 (`teamwork_preview_explorer`)  
**Lingkup Tugas**:  
1. **R2**: Modifikasi Struktur Database & Form Jurnal KBM (`jurnal_pembelajaran`, `GuruJurnal.tsx`)  
2. **R3**: Rekonstruksi Tabel Rekap Jurnal Pembelajaran 8 Kolom (`RekapJurnalView.tsx`, Layout Cetak & Layar)  
**Tanggal Investigasi**: 2026-09-12  

---

## 1. Executive Summary & Temuan Kunci

1. **Skema Database `jurnal_pembelajaran` Saat Ini**:
   - Berdasarkan kueri langsung ke Supabase `information_schema.columns` pada project `jicvvqxjyzntdrccnuyz`, tabel `jurnal_pembelajaran` saat ini memiliki 15 kolom:
     `id` (PK, text), `timestamp`, `nama_guru`, `mapel`, `kelas`, `tanggal`, `materi`, `kegiatan`, `absensi_siswa`, `keterangan`, `refleksi`, `detail_absen`, `link_bukti_foto`, `status_verifikasi`, `catatan_khusus_siswa`.
   - **Status 7 Kolom Baru yang Diminta**: Kueri khusus memverifikasi bahwa **BELUM ADA SATU PUN** dari 7 kolom baru (`pertemuan_ke`, `jam_ke`, `tujuan_pembelajaran`, `materi_pembelajaran`, `kehadiran_murid`, `catatan_refleksi`, `foto_kegiatan`) yang ada di database.
   - Tabel `jurnal_pembelajaran` memiliki `relrowsecurity = false` (RLS tidak menghalangi penambahan kolom DDL).

2. **Form Jurnal KBM (`src/components/GuruJurnal.tsx`)**:
   - Saat ini komponen hanya memiliki input: `tipeJurnal`, `mapel`, `kelas`, `tanggal`, `materi`, `kegiatan`, `catatanSiswa`, `absensi` (checklist siswa), `file` (upload Google Drive), dan `refleksi`.
   - Belum memiliki input untuk: `pertemuan_ke`, `jam_ke`, `tujuan_pembelajaran`, `kehadiran_murid` (teks ringkasan terstruktur).
   - `file` saat ini diupload via `uploadToDrive` (`src/lib/driveUpload.ts`) dan hanya disimpan ke kolom `link_bukti_foto`. Untuk memenuhi kriteria, harus disimpan juga ke `foto_kegiatan`.
   - `materi` dan `refleksi` harus disimpan ganda (ke kolom lama dan kolom baru `materi_pembelajaran` serta `catatan_refleksi`) agar komponen lain (`HistoryView`, `AdminVerifView`, dll.) tidak mengalami regresi.

3. **Rekap Jurnal Pembelajaran (`src/components/RekapJurnalView.tsx`)**:
   - Saat ini **BUKAN BERUPA TABEL**, melainkan kumpulan kartu card grid 2 kolom (`<div id="hasil-rekap-jurnal-guru" className="grid grid-cols-1 md:grid-cols-2 gap-4">`).
   - Tampilan ini tidak memenuhi format dokumen kedinasan/sekolah dan tidak memenuhi kriteria penerimaan R3 (wajib menggunakan tag `<table>` dengan 8 header `<th>` eksplisit).
   - Diperlukan rekonstruksi total area data menjadi tabel 8 kolom formal yang responsif di layar dan rapi saat dicetak (`window.print()`).

---

## 2. Investigasi Database Schema & Migrasi (`jurnal_pembelajaran`)

### 2.1 Analisis Kolom Eksisting vs Kolom Baru
Hasil inspeksi langsung Supabase `information_schema.columns`:

| Kolom Database | Tipe Saat Ini | Status | Rekomendasi Tipe Baru | Keterangan & Kompatibilitas |
|---|---|---|---|---|
| `id` | `text` | Eksisting (PK) | `TEXT` | ID acak UUID / timestamp string |
| `timestamp` | `text` | Eksisting | `TEXT` | Waktu submit WITA |
| `nama_guru` | `text` | Eksisting | `TEXT` | Nama lengkap guru |
| `mapel` | `text` | Eksisting | `TEXT` | Mata pelajaran yang diampu |
| `kelas` | `text` | Eksisting | `TEXT` | Kelas yang diajar |
| `tanggal` | `text` | Eksisting | `TEXT` | Tanggal KBM (YYYY-MM-DD) |
| `materi` | `text` | Eksisting | `TEXT` | Materi legacy |
| `kegiatan` | `text` | Eksisting | `TEXT` | Uraian kegiatan pembelajaran |
| `absensi_siswa` | `text` | Eksisting | `TEXT` | Format JSON absensi per NISN (wajib dipertahankan untuk `RekapSiswaView`) |
| `keterangan` | `text` | Eksisting | `TEXT` | Tipe jurnal ('Jurnal KBM' / 'Jurnal Kegiatan') |
| `refleksi` | `text` | Eksisting | `TEXT` | Refleksi legacy |
| `detail_absen` | `text` | Eksisting | `TEXT` | Detail absen legacy |
| `link_bukti_foto` | `text` | Eksisting | `TEXT` | Link URL foto bukti legacy |
| `status_verifikasi` | `text` | Eksisting | `TEXT` | 'Menunggu' / 'Disetujui' / 'Ditolak' |
| `catatan_khusus_siswa` | `text` | Eksisting | `TEXT` | Catatan khusus per siswa |
| **`pertemuan_ke`** | **TIDAK ADA** | **BARU** | **`TEXT` NULL** | Diisi misal '1', '2', '1-2'. Menggunakan TEXT agar fleksibel jika ada pertemuan ganda/remedial. |
| **`jam_ke`** | **TIDAK ADA** | **BARU** | **`TEXT` NULL** | Diisi misal '1-2', '3-4', '1 - 3 (07.15 - 09.15)'. |
| **`tujuan_pembelajaran`** | **TIDAK ADA** | **BARU** | **`TEXT` NULL** | Tujuan Pembelajaran (TP) / Capaian Pembelajaran Kurikulum Merdeka. |
| **`materi_pembelajaran`** | **TIDAK ADA** | **BARU** | **`TEXT` NULL** | Nama pokok materi pembelajaran. Backfilled dari `materi`. |
| **`kehadiran_murid`** | **TIDAK ADA** | **BARU** | **`TEXT` NULL** | Ringkasan kehadiran (misal: "Hadir: 28, Sakit: 1 (Budi), Alpa: 0" atau "Semua Hadir (29 siswa)"). |
| **`catatan_refleksi`** | **TIDAK ADA** | **BARU** | **`TEXT` NULL** | Catatan evaluasi/refleksi guru setelah KBM selesai. Backfilled dari `refleksi`. |
| **`foto_kegiatan`** | **TIDAK ADA** | **BARU** | **`TEXT` NULL** | URL foto dokumentasi KBM (Google Drive direct URL). Backfilled dari `link_bukti_foto`. |

### 2.2 Skrip DDL SQL Migrasi yang Siap Diterapkan
File migrasi yang disarankan: `supabase/migrations/20260912_jurnal_pembelajaran_8_kolom.sql`
```sql
-- Migration: Add 7 columns to jurnal_pembelajaran for 8-column layout standard
ALTER TABLE public.jurnal_pembelajaran
  ADD COLUMN IF NOT EXISTS pertemuan_ke TEXT,
  ADD COLUMN IF NOT EXISTS jam_ke TEXT,
  ADD COLUMN IF NOT EXISTS tujuan_pembelajaran TEXT,
  ADD COLUMN IF NOT EXISTS materi_pembelajaran TEXT,
  ADD COLUMN IF NOT EXISTS kehadiran_murid TEXT,
  ADD COLUMN IF NOT EXISTS catatan_refleksi TEXT,
  ADD COLUMN IF NOT EXISTS foto_kegiatan TEXT;

-- Backfill data historis agar baris jurnal lama tetap sinkron & tampil di tabel 8 kolom
UPDATE public.jurnal_pembelajaran
SET 
  materi_pembelajaran = COALESCE(materi_pembelajaran, materi),
  catatan_refleksi = COALESCE(catatan_refleksi, refleksi),
  foto_kegiatan = COALESCE(foto_kegiatan, link_bukti_foto)
WHERE materi_pembelajaran IS NULL OR catatan_refleksi IS NULL OR foto_kegiatan IS NULL;

-- Indeks performa untuk query filtering rekap
CREATE INDEX IF NOT EXISTS idx_jurnal_guru_tanggal ON public.jurnal_pembelajaran(nama_guru, tanggal);
CREATE INDEX IF NOT EXISTS idx_jurnal_kelas_mapel ON public.jurnal_pembelajaran(kelas, mapel);
```

---

## 3. Investigasi Komponen Form `GuruJurnal.tsx`

### 3.1 Alur Input & Validasi Saat Ini
File: `src/components/GuruJurnal.tsx`
- **Dropdown Mapel & Kelas**: Difilter dinamis dari tabel `guru_mapel` berdasarkan NIP / Nama Guru login (implementasi Milestone sebelumnya sudah berfungsi sangat baik).
- **Upload Bukti**: Memakai `uploadToDrive(file, user.nama, tipeJurnal, 'Jurnal')` dari `src/lib/driveUpload.ts`. File dikonversi ke Base64 dan diposting ke Google Apps Script Webhook (`NEXT_PUBLIC_DRIVE_UPLOAD_WEBHOOK_URL`). Mengembalikan URL publik Google Drive.
- **Penyimpanan ke Supabase**: Menggunakan `supabase.from('jurnal_pembelajaran').insert([newJurnal])`.

### 3.2 Kebutuhan Modifikasi Form
1. **Tambahkan State Baru**:
   ```typescript
   const [pertemuanKe, setPertemuanKe] = useState('');
   const [jamKe, setJamKe] = useState('');
   const [tujuanPembelajaran, setTujuanPembelajaran] = useState('');
   const [kehadiranMurid, setKehadiranMurid] = useState('');
   ```

2. **Sinkronisasi Otomatis Kehadiran Murid dari Live Absensi**:
   Saat guru mengklik tombol `H`, `S`, `I`, `A` pada daftar siswa:
   ```typescript
   const calculateKehadiranSummary = (abs: Record<string, string>, stList: any[]): string => {
     if (!stList || stList.length === 0) return 'Semua Hadir';
     const counts = { H: 0, S: 0, I: 0, A: 0 };
     const absents: string[] = [];
     
     stList.forEach(s => {
       const status = (abs[s.nisn] || 'H').toUpperCase();
       if (status === 'H') counts.H++;
       else if (status === 'S') { counts.S++; absents.push(`${s.nama_siswa} (S)`); }
       else if (status === 'I') { counts.I++; absents.push(`${s.nama_siswa} (I)`); }
       else if (status === 'A') { counts.A++; absents.push(`${s.nama_siswa} (A)`); }
     });

     if (counts.S === 0 && counts.I === 0 && counts.A === 0) {
       return `Semua Hadir (${counts.H} siswa)`;
     }
     let summary = `Hadir: ${counts.H}`;
     if (counts.S > 0) summary += `, Sakit: ${counts.S}`;
     if (counts.I > 0) summary += `, Izin: ${counts.I}`;
     if (counts.A > 0) summary += `, Alpa: ${counts.A}`;
     if (absents.length > 0) {
       summary += ` [${absents.join(', ')}]`;
     }
     return summary;
   };
   ```
   Ketika `absensi` berubah atau `students` pertama kali dimuat, string `kehadiranMurid` langsung terisi otomatis, sekaligus tetap dapat diedit manual jika guru ingin menambahkan keterangan khusus.

3. **Input Baru pada Tampilan Form UI**:
   - **Pertemuan Ke- & Jam Ke-**:
     Ditempatkan tepat di bawah pilihan Kelas & Mapel (grid 2 kolom).
     ```tsx
     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
       <div>
         <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
           Pertemuan Ke- <span className="text-red-500">*</span>
         </label>
         <input
           type="text"
           value={pertemuanKe}
           onChange={e => setPertemuanKe(e.target.value)}
           required={tipeJurnal === 'Jurnal KBM'}
           placeholder="Contoh: 1 atau 1-2"
           className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
         />
       </div>
       <div>
         <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
           Jam Ke- <span className="text-red-500">*</span>
         </label>
         <input
           type="text"
           value={jamKe}
           onChange={e => setJamKe(e.target.value)}
           required={tipeJurnal === 'Jurnal KBM'}
           placeholder="Contoh: 1 - 2 (07.15 - 08.35)"
           className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
         />
       </div>
     </div>
     ```
   - **Tujuan Pembelajaran**:
     Ditempatkan di bawah Materi Pokok:
     ```tsx
     <div>
       <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
         Tujuan Pembelajaran <span className="text-red-500">*</span>
       </label>
       <textarea
         value={tujuanPembelajaran}
         onChange={e => setTujuanPembelajaran(e.target.value)}
         required={tipeJurnal === 'Jurnal KBM'}
         rows={2}
         className="w-full px-3 py-2.5 text-sm rounded-xl input-premium resize-none text-gray-900 dark:text-white"
         placeholder="Tuliskan capaian/tujuan pembelajaran..."
       />
     </div>
     ```
   - **Kehadiran Murid**:
     Field input ringkasan di atas checklist live absensi agar jelas terlihat dan tersimpan rapi.

4. **Payload Insert Supabase**:
   ```typescript
   const newJurnal = {
     id: crypto.randomUUID(),
     timestamp: getWitaTimestamp(),
     nama_guru: user.nama,
     mapel: tipeJurnal === 'Jurnal KBM' ? mapel : '-',
     kelas: tipeJurnal === 'Jurnal KBM' ? kelas : '-',
     tanggal: tanggal,
     materi: materi,
     kegiatan: kegiatan,
     absensi_siswa: JSON.stringify(absensi),
     keterangan: tipeJurnal,
     refleksi: refleksi,
     detail_absen: '',
     link_bukti_foto: fileUrl,
     status_verifikasi: 'Menunggu',
     catatan_khusus_siswa: catatanSiswa,
     // Kolom baru R2:
     pertemuan_ke: tipeJurnal === 'Jurnal KBM' ? (pertemuanKe || '1') : '-',
     jam_ke: tipeJurnal === 'Jurnal KBM' ? (jamKe || '1-2') : '-',
     tujuan_pembelajaran: tipeJurnal === 'Jurnal KBM' ? (tujuanPembelajaran || '-') : '-',
     materi_pembelajaran: materi,
     kehadiran_murid: tipeJurnal === 'Jurnal KBM' ? (kehadiranMurid || calculateKehadiranSummary(absensi, students)) : 'Hadir',
     catatan_refleksi: refleksi || '-',
     foto_kegiatan: fileUrl
   };
   ```

---

## 4. Investigasi Rekonstruksi Tabel Rekap Jurnal Pembelajaran (`RekapJurnalView.tsx`)

### 4.1 Pemenuhan Kriteria Penerimaan R3
Kriteria penerimaan R3 menetapkan:
> **Tabel rekap jurnal menggunakan tag `<table>` yang secara eksplisit memiliki 8 header `<th>` sesuai urutan yang diminta.**

Urutan 8 Header yang wajib digunakan:
1. `Hari, tanggal bulan tahun`
2. `Kelas, pertemuan dan jam ke-`
3. `Tujuan pembelajaran`
4. `Materi pembelajaran`
5. `Kegiatan pembelajaran`
6. `Kehadiran murid`
7. `Catatan refleksi`
8. `Foto kegiatan`

### 4.2 Desain Format Kolom & Isi Sel (Row Rendering)

```tsx
<div className="overflow-x-auto w-full my-4 rounded-xl border border-gray-200 dark:border-gray-700 print:border-black print:overflow-visible">
  <table className="w-full text-left text-xs border-collapse border border-gray-200 dark:border-gray-700 print:border-black print:text-[8pt]">
    <thead>
      <tr className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-700 print:bg-gray-200 print:text-black print:border-black">
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-[12%]">Hari, tanggal bulan tahun</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-[11%]">Kelas, pertemuan dan jam ke-</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-[15%]">Tujuan pembelajaran</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-[15%]">Materi pembelajaran</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-[18%]">Kegiatan pembelajaran</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-[13%]">Kehadiran murid</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-[10%]">Catatan refleksi</th>
        <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-[6%]">Foto kegiatan</th>
      </tr>
    </thead>
    <tbody>
      {filteredJurnal.map((j: any, index: number) => {
        const fotoUrl = j.foto_kegiatan || j.link_bukti_foto;
        const hasFoto = fotoUrl && fotoUrl !== '-' && fotoUrl.trim() !== '';

        return (
          <tr 
            key={j.id || index}
            className="border-b border-gray-200 dark:border-gray-700 print:border-black hover:bg-gray-50 dark:hover:bg-gray-800/50 print:hover:bg-transparent"
          >
            {/* 1. Hari, tanggal bulan tahun */}
            <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black text-center font-medium align-top">
              {formatHariTanggal(j.tanggal)}
            </td>

            {/* 2. Kelas, pertemuan dan jam ke- */}
            <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top text-center">
              <div className="font-bold text-gray-900 dark:text-white print:text-black">{j.kelas || '-'}</div>
              <div className="text-[11px] print:text-[8pt] text-gray-600 dark:text-gray-300 print:text-black">
                {j.pertemuan_ke ? `Pertemuan ke-${j.pertemuan_ke}` : '-'}
              </div>
              <div className="text-[10px] print:text-[7pt] text-gray-500 dark:text-gray-400 print:text-black">
                {j.jam_ke ? `Jam ke-${j.jam_ke}` : '-'}
              </div>
              {j.mapel && j.mapel !== '-' && (
                <div className="text-[10px] print:text-[7pt] font-semibold text-blue-600 dark:text-blue-400 print:text-black mt-0.5">
                  ({j.mapel})
                </div>
              )}
            </td>

            {/* 3. Tujuan pembelajaran */}
            <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top whitespace-pre-wrap">
              {j.tujuan_pembelajaran || '-'}
            </td>

            {/* 4. Materi pembelajaran */}
            <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top font-medium whitespace-pre-wrap">
              {j.materi_pembelajaran || j.materi || '-'}
            </td>

            {/* 5. Kegiatan pembelajaran */}
            <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top whitespace-pre-wrap">
              {j.kegiatan || '-'}
            </td>

            {/* 6. Kehadiran murid */}
            <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top">
              {j.kehadiran_murid || formatAbsensi(j.absensi_siswa, j.detail_absen)}
            </td>

            {/* 7. Catatan refleksi */}
            <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top whitespace-pre-wrap italic">
              {j.catatan_refleksi || j.refleksi || '-'}
            </td>

            {/* 8. Foto kegiatan */}
            <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top text-center">
              {hasFoto ? (
                <div className="flex flex-col items-center justify-center gap-1">
                  <img
                    src={transformGoogleDriveUrl(fotoUrl)}
                    alt="Foto Kegiatan"
                    className="w-12 h-12 print:w-10 print:h-10 object-cover rounded border border-gray-300 dark:border-gray-600 print:border-black mx-auto"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                  <a
                    href={fotoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[9px] text-blue-600 dark:text-blue-400 hover:underline font-semibold no-print inline-flex items-center gap-0.5"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square text-[8px]"></i> Lihat
                  </a>
                </div>
              ) : (
                <span className="text-gray-400 text-[10px] italic">-</span>
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
```

### 4.3 Formatter Hari dan Tanggal Indonesia
Fungsi parsing tanggal agar tidak mengalami pergeseran timezone (WITA/UTC):
```typescript
function formatHariTanggal(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  } catch (_) {}
  return dateStr;
}
```
Hasil: `"Selasa, 21 Juli 2026"`. Sangat sesuai standar penanggalan administrasi persuratan Indonesia.

### 4.4 Header Dokumen & Tanda Tangan Cetak
- Di bagian atas: `<PrintHeader />` sudah ada di `RekapJurnalView.tsx` (baris 121).
- Tambahkan judul cetak resmi di bawah `<PrintHeader />`:
  ```tsx
  <div className="text-center my-3 print:my-2">
    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white print:text-black uppercase tracking-wider">
      Rekapitulasi Jurnal Pembelajaran Guru
    </h3>
    <div className="text-xs text-gray-600 dark:text-gray-400 print:text-black mt-1 flex justify-center gap-4">
      <span>Guru: <strong>{user?.nama || '-'}</strong></span>
      {bulan && <span>Bulan: <strong>{formatPeriodeBulan(bulan)}</strong></span>}
    </div>
  </div>
  ```
- Di bagian bawah: `<PrintSignature />` sudah ada di baris 263.

### 4.5 Kompatibilitas CSS Cetak (`@media print`)
Aturan cetak yang sudah ada di `src/app/globals.css`:
1. `table, tr, td, th, img { page-break-inside: avoid !important; break-inside: avoid !important; }`
2. `thead { display: table-header-group; }` (mengulang header tabel di setiap halaman jika tabel multi-page).
3. `.overflow-x-auto { overflow: visible !important; }` (menjamin tabel tercetak melebar tanpa scrollbar terpotong).
4. Rekomendasi tambahan khusus untuk tampilan rekap jurnal saat dicetak:
   Tambahkan orientasi cetak fleksibel atau landscape via CSS lokal atau style print agar 8 kolom memiliki ruang yang sangat lega pada kertas A4:
   ```css
   @media print {
     @page {
       size: A4 landscape;
       margin: 10mm;
     }
   }
   ```

---

## 5. Rencana Langkah Implementasi untuk Tim Developer

1. **Langkah 1 (Database Migration)**:
   - Terapkan DDL SQL pada Supabase via MCP tool `apply_migration` atau `execute_sql` untuk menambahkan 7 kolom baru ke `jurnal_pembelajaran`.
   - Jalankan backfill data historis dari `materi`, `refleksi`, dan `link_bukti_foto`.
   - Verifikasi melalui query `information_schema.columns` bahwa ketujuh kolom telah sukses terdaftar.

2. **Langkah 2 (Pembaruan Form `src/components/GuruJurnal.tsx`)**:
   - Tambahkan state: `pertemuanKe`, `jamKe`, `tujuanPembelajaran`, `kehadiranMurid`.
   - Tambahkan input UI untuk Pertemuan Ke-, Jam Ke-, Tujuan Pembelajaran, dan Kehadiran Murid.
   - Sambungkan live absensi agar otomatis memperbarui teks ringkasan `kehadiranMurid`.
   - Perbarui payload `supabase.from('jurnal_pembelajaran').insert([newJurnal])` dengan kolom baru dan legacy.
   - Reset seluruh field form setelah submit sukses.

3. **Langkah 3 (Rekonstruksi `src/components/RekapJurnalView.tsx`)**:
   - Ganti card grid dengan elemen `<table>` dengan 8 header `<th>` eksplisit.
   - Terapkan fungsi `formatHariTanggal` untuk kolom 1.
   - Render data tiap sel dengan fallback ke kolom legacy untuk baris lama.
   - Render foto kegiatan dengan `transformGoogleDriveUrl` dan thumbnail responsif.
   - Perbarui fungsi ekspor Excel/CSV agar mengekspor 8 kolom yang sama.

4. **Langkah 4 (Verifikasi & Validasi)**:
   - Jalankan `npx tsc --noEmit` untuk memastikan tidak ada error tipe data TypeScript.
   - Uji coba pengisian form jurnal dan verifikasi data masuk ke Supabase.
   - Uji cetak `window.print()` pada `RekapJurnalView` untuk memastikan layout tabel 8 kolom rapi.
