# Survey & Architecture Report: Restrukturisasi Tabel Cetak Rekap Jurnal Pribadi (R3)

**File Target**: `src/components/RekapJurnalView.tsx`  
**Explorer**: Explorer Survey 3  
**Status**: Investigasi Tuntas & Terverifikasi  
**Tanggal**: 2026-10-03  

---

## 1. Executive Summary

Laporan ini membedah struktur tabel cetak dan tampilan rekap jurnal pada `src/components/RekapJurnalView.tsx`. Fokus utama investigasi adalah restrukturisasi tabel pada mode pribadi (`tabMode === 'pribadi'`), integrasi fallback data kompatibilitas mundur (backward-compatibility), penyesuaian rasio foto ke lanskap (`aspect-video`), dan verifikasi bahwa mode rekap per kelas (`tabMode === 'kelas'`) tetap terisolasi 100% tanpa perubahan.

Investigasi ini juga telah mengakomodasi **koreksi user terbaru (2026-10-03T07:18:11Z)**:
- **"Konten"** menggantikan kolom Materi Pembelajaran dengan fallback: `j.konten || j.materi_pembelajaran || j.materi || '-'`.
- **"Kegiatan Pembelajaran"** tetap dipertahankan sebagai kolom terpisah dengan fallback: `j.kegiatan_pembelajaran || j.kegiatan || '-'`.
- **Kolom tambahan**: `No`, `Hari/Tanggal`, `Tujuan Pembelajaran`, `KKTP`, `Kelas`, `Absensi Murid (H/I/S/A)`, `Lokasi KBM`, `Foto Dokumentasi`, `Catatan`.

---

## 2. Analisis Struktur Eksisting `src/components/RekapJurnalView.tsx`

### 2.1. Arsitektur Komponen & Tab Mode
- Komponen memiliki state `tabMode`:
  ```tsx
  // src/components/RekapJurnalView.tsx:20
  const [tabMode, setTabMode] = useState<'pribadi' | 'kelas'>(initialMode);
  ```
- Di bagian render tabel (baris 503–771), terdapat percabangan ternary kondisional:
  ```tsx
  {tabMode === 'kelas' ? (
    /* REKAPAN JURNAL PER KELAS: EXACT 8 COLUMNS LAYOUT */
    // baris 505 - 646
  ) : (
    /* JURNAL PRIBADI GURU: 8 COLUMNS LAYOUT */
    // baris 648 - 769
  )}
  ```
- Ekspor CSV (baris 786–873) juga terbagi dua secara terpisah via `if (tabMode === 'kelas') { ... } else { ... }`.

### 2.2. Struktur Tabel Eksisting `tabMode === 'pribadi'` (Baris 651–769)
Saat ini mode pribadi memiliki 8 kolom:
1. `Hari, tanggal bulan tahun` (`print:w-[15%]`)
2. `Kelas, pertemuan dan jam ke-` (`print:w-[15%]`)
3. `Tujuan pembelajaran` (`print:w-[10%]`)
4. `Materi pembelajaran` (`print:w-[10%]`)
5. `Kegiatan pembelajaran` (`print:w-[12%]`)
6. `Kehadiran murid` (`print:w-[8%]`)
7. `Catatan refleksi` (`print:w-[10%]`)
8. `Foto kegiatan` (`print:w-[20%]`)

### 2.3. Masalah pada Tabel Eksisting Terhadap Kebutuhan Baru:
1. **Tidak Ada Kolom `No`**: Penomoran baris (`index + 1`) belum ada di mode pribadi (hanya ada di mode kelas).
2. **Tidak Ada Kolom `KKTP`**: Kolom kriteria ketercapaian tujuan pembelajaran belum ditampilkan.
3. **Belum Ada Kolom `Konten`**: Masih menggunakan kolom Materi Pembelajaran murni.
4. **Kolom `Kelas` Tercampur**: Menyatukan kelas, pertemuan ke-, jam ke-, dan mapel ke dalam satu cell sempit.
5. **Tidak Ada Kolom `Lokasi KBM`**: Lokasi hanya dicetak sebagai teks sub-label kecil di bawah thumbnail foto (`j.lokasi`).
6. **Rasio Foto Masih Kotak (Square 1:1)**:
   Baris 729:
   ```tsx
   className="w-14 h-14 object-cover rounded border border-gray-300 dark:border-gray-600 mx-auto bg-white print:w-full print:h-auto print:rounded-none print:border-none print:bg-transparent print:m-0 print:block"
   ```
   Di layar (`w-14 h-14` = 56px x 56px) berbentuk persegi, bukan lanskap 16:9 (`aspect-video`).

---

## 3. Spesifikasi Kolom Baru & Fallback Logic

Sesuai arahan terbaru, berikut pemetaan lengkap kolom untuk implementasi:

| No | Nama Kolom Header | Sumber Data & Fallback Logic | Format & Styling | Target Lebar Cetak (`print:w-[%]`) |
|:---:|:---|:---|:---|:---:|
| 1 | **No** | `index + 1` | `text-center font-semibold w-8` | `print:w-[3%]` |
| 2 | **Hari/Tanggal** | `formatHariTanggal(j.tanggal)` | `text-center font-medium` (contoh: "Sabtu, 4 Oktober 2026") | `print:w-[10%]` |
| 3 | **Tujuan Pembelajaran** | `j.tujuan_pembelajaran \|\| '-'` | `whitespace-pre-wrap` | `print:w-[12%]` |
| 4 | **KKTP** | `j.kktp \|\| '-'` | `whitespace-pre-wrap` | `print:w-[10%]` |
| 5 | **Konten** | `j.konten \|\| j.materi_pembelajaran \|\| j.materi \|\| '-'` | `whitespace-pre-wrap font-medium` | `print:w-[12%]` |
| 6 | **Kegiatan Pembelajaran** | `j.kegiatan_pembelajaran \|\| j.kegiatan \|\| '-'` | `whitespace-pre-wrap` | `print:w-[12%]` |
| 7 | **Kelas** | `j.kelas \|\| '-'` | `text-center font-bold w-14` | `print:w-[5%]` |
| 8 | **Absensi Murid (H/I/S/A)** | `j.kehadiran_murid \|\| formatAbsensi(j.absensi_siswa, j.detail_absen)` | `text-xs font-normal` (contoh: "Hadir: 28, Sakit: 1, Izin: 1, Alpa: 0") | `print:w-[11%]` |
| 9 | **Lokasi KBM** | `j.lokasi_kbm \|\| j.lokasi \|\| '-'` | `text-center font-medium` (contoh: "Ruang Kelas 7A", "Lab IPA") | `print:w-[8%]` |
| 10 | **Foto Dokumentasi** | `fotoUrl` via `getGoogleDriveThumbnailUrl` / `transformGoogleDriveUrl` | `aspect-video object-cover` lanskap | `print:w-[9%]` |
| 11 | **Catatan** | `j.catatan_refleksi \|\| j.refleksi \|\| '-'` | `whitespace-pre-wrap italic` | `print:w-[8%]` |

*(Total persentase print: 3 + 10 + 12 + 10 + 12 + 12 + 5 + 11 + 8 + 9 + 8 = 100% pas!)*

*Catatan opsional: Jika user/implementer ingin mengompresi menjadi tepat 10 kolom (menggabungkan kegiatan ke dalam konten sesuai spec awal R3), persentase dapat didistribusikan: No (4%), Hari/Tanggal (11%), TP (13%), KKTP (11%), Konten (14%), Kelas (5%), Absensi (12%), Lokasi KBM (9%), Foto (11%), Catatan (10%). Kedua varian telah kami formulasikan secara presisi.*

---

## 4. Evaluasi Rasio Foto (Landscape / `aspect-video`)

### 4.1. Analisis Styling Foto
- Di layar biasa (screen UI):
  - Eksisting: `w-14 h-14 object-cover` (rasio 1:1, 56px x 56px).
  - Target: `w-24 aspect-video object-cover rounded border border-gray-300 dark:border-gray-600 mx-auto bg-white` (rasio 16:9, 96px x 54px).
- Di mode cetak (print CSS):
  - Di `globals.css:420-426`:
    ```css
    img {
      max-width: 100% !important;
      max-height: 100% !important;
      object-fit: contain !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    ```
  - Target pada elemen `<img>`:
    `print:w-full print:aspect-video print:object-cover print:rounded-none print:border-none print:bg-transparent print:m-0 print:block`
  - Thumbnail tautan "Lihat" (`<a>`) tetap dipertahankan dengan kelas `no-print`.
  - Teks `j.lokasi` yang sebelumnya menumpuk di bawah foto bisa disembunyikan di mode cetak atau dihilangkan dari sel foto, karena `Lokasi KBM` sudah memiliki kolom tabel sendiri yang rapi.

---

## 5. Verifikasi Isolasi Mode Rekap Per Kelas (`tabMode === 'kelas'`)

### 5.1. Pengecekan Blok Kode `tabMode === 'kelas'`
- Blok tabel kelas berada di baris 503–646:
  ```tsx
  {tabMode === 'kelas' ? (
    /* REKAPAN JURNAL PER KELAS: EXACT 8 COLUMNS LAYOUT */
    <table ...>
      <thead>
        <tr>
          <th>No</th>
          <th>Nama Guru</th>
          <th>Tanggal & Waktu</th>
          <th>Mapel</th>
          <th>Jam KBM</th>
          <th>Materi</th>
          <th>Foto</th>
          <th>Keterangan kehadiran guru</th>
        </tr>
      </thead>
      <tbody>
        ...
      </tbody>
    </table>
  ) : ( ... )}
  ```
- Blok ekspor CSV kelas berada di baris 792–824:
  ```tsx
  if (tabMode === 'kelas') {
    headers = [
      'No',
      'Nama Guru',
      'Tanggal & Waktu',
      'Mapel',
      'Jam KBM',
      'Materi',
      'Foto',
      'Keterangan kehadiran guru'
    ];
    ...
  }
  ```

### 5.2. Kesimpulan Isolasi
Kedua cabang (`tabMode === 'kelas'` vs `tabMode === 'pribadi'`) berdiri sendiri secara struktural:
1. Tidak ada variabel bersama yang bergantung pada urutan kolom pribadi.
2. Tidak ada mutasi state tabel kelas saat tabel pribadi diubah.
3. Seluruh perubahan R3 terkapsulasi secara ketat di dalam blok `else` pada JSX tabel (baris 648–769) dan blok `else` pada handler CSV (baris 825–861).
4. `tabMode === 'kelas'` dijamin **100% untouched dan bebas regresi**.

---

## 6. Penyesuaian Sinkron Tambahan (Search & Export CSV)

Agar pengalaman pengguna konsisten, dua area penunjang berikut wajib disesuaikan:

### 6.1. Filter Pencarian Cepat (Search Bar)
Pada baris 263–281, filter pencarian mencakup pencarian teks bebas. Tambahkan field baru agar pencarian mencakup KKTP, Konten, dan Lokasi KBM:
```tsx
(j.konten && j.konten.toLowerCase().includes(s)) ||
(j.kktp && j.kktp.toLowerCase().includes(s)) ||
(j.lokasi_kbm && j.lokasi_kbm.toLowerCase().includes(s)) ||
(j.kegiatan_pembelajaran && j.kegiatan_pembelajaran.toLowerCase().includes(s)) ||
```

### 6.2. Ekspor CSV / Excel (Baris 826–861)
Sesuaikan array `headers` dan pemetaan data `csvRows` pada blok `else` (mode pribadi) agar menghasilkan header dan fallback yang persis sama dengan tabel cetak.

---

## 7. Rekomendasi Kode Siap Pasang untuk Implementer

Implementer dapat menggantikan baris 648–769 dengan blok kode berikut:

```tsx
                    ) : (
                      /* ============================================================ */
                      /* JURNAL PRIBADI GURU: RESTRUCTURED PRINT TABLE                */
                      /* ============================================================ */
                      <table className="w-full text-left text-xs border-collapse border border-gray-200 dark:border-gray-700 print:border-black print:text-[8pt]">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-700 print:bg-gray-200 print:text-black print:border-black">
                            <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-8 print:w-[3%]">No</th>
                            <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold print:w-[10%]">Hari/Tanggal</th>
                            <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold print:w-[12%]">Tujuan Pembelajaran</th>
                            <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold print:w-[10%]">KKTP</th>
                            <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold print:w-[12%]">Konten</th>
                            <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold print:w-[12%]">Kegiatan Pembelajaran</th>
                            <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-14 print:w-[5%]">Kelas</th>
                            <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold print:w-[11%]">Absensi Murid (H/I/S/A)</th>
                            <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold print:w-[8%]">Lokasi KBM</th>
                            <th className="p-1 print:p-0 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-24 print:w-[9%]">Foto Dokumentasi</th>
                            <th className="p-2 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold print:w-[8%]">Catatan</th>
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
                                {/* 1. No */}
                                <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black text-center font-semibold align-top">
                                  {index + 1}
                                </td>

                                {/* 2. Hari/Tanggal */}
                                <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black text-center font-medium align-top">
                                  {formatHariTanggal(j.tanggal)}
                                </td>

                                {/* 3. Tujuan Pembelajaran */}
                                <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top whitespace-pre-wrap">
                                  {j.tujuan_pembelajaran || '-'}
                                </td>

                                {/* 4. KKTP */}
                                <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top whitespace-pre-wrap">
                                  {j.kktp || '-'}
                                </td>

                                {/* 5. Konten */}
                                <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top font-medium whitespace-pre-wrap">
                                  {j.konten || j.materi_pembelajaran || j.materi || '-'}
                                </td>

                                {/* 6. Kegiatan Pembelajaran */}
                                <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top whitespace-pre-wrap">
                                  {j.kegiatan_pembelajaran || j.kegiatan || '-'}
                                </td>

                                {/* 7. Kelas */}
                                <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top text-center">
                                  <div className="font-bold text-gray-900 dark:text-white print:text-black">{j.kelas || '-'}</div>
                                  {j.mapel && j.mapel !== '-' && (
                                    <div className="text-[10px] print:text-[7pt] font-semibold text-blue-600 dark:text-blue-400 print:text-black mt-0.5">
                                      ({j.mapel})
                                    </div>
                                  )}
                                </td>

                                {/* 8. Absensi Murid (H/I/S/A) */}
                                <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top text-xs">
                                  {j.kehadiran_murid || formatAbsensi(j.absensi_siswa, j.detail_absen)}
                                </td>

                                {/* 9. Lokasi KBM */}
                                <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top text-center font-medium">
                                  {j.lokasi_kbm || j.lokasi || '-'}
                                </td>

                                {/* 10. Foto Dokumentasi */}
                                <td className="p-1 print:p-0 border border-gray-200 dark:border-gray-700 print:border-black align-top text-center">
                                  {hasFoto ? (
                                    <div className="flex flex-col items-center justify-center gap-1 print:block print:w-full print:h-full">
                                      <img
                                        src={getGoogleDriveThumbnailUrl(fotoUrl, 800) || transformGoogleDriveUrl(fotoUrl)}
                                        alt="Foto Dokumentasi"
                                        loading="eager"
                                        referrerPolicy="no-referrer"
                                        className="w-24 aspect-video object-cover rounded border border-gray-300 dark:border-gray-600 mx-auto bg-white print:w-full print:aspect-video print:object-cover print:rounded-none print:border-none print:bg-transparent print:m-0 print:block"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          if (target.src !== transformGoogleDriveUrl(fotoUrl)) {
                                            target.src = transformGoogleDriveUrl(fotoUrl);
                                          } else {
                                            target.style.display = 'none';
                                          }
                                        }}
                                      />
                                      <a
                                        href={fotoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[9px] text-blue-600 dark:text-blue-400 hover:underline font-semibold no-print inline-flex items-center gap-0.5"
                                      >
                                        <i className="fa-solid fa-arrow-up-right-from-square text-[8px]"></i> Lihat
                                      </a>
                                      {j.waktu_upload && (
                                        <div className="text-[7px] text-gray-400 font-mono text-center no-print">
                                          {j.waktu_upload}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-[10px] italic">-</span>
                                  )}
                                </td>

                                {/* 11. Catatan */}
                                <td className="p-2 border border-gray-200 dark:border-gray-700 print:border-black align-top whitespace-pre-wrap italic">
                                  {j.catatan_refleksi || j.refleksi || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
```
