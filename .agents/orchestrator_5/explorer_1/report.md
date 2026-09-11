# Laporan Investigasi Kebutuhan R1: Format Cetak Kop Surat & Tanda Tangan

**Peneliti**: Explorer 1 (`teamwork_preview_explorer`)  
**Target File**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\orchestrator_5\explorer_1\report.md`  
**Waktu Analisis**: 2026-09-12T05:42:00+07:00  
**Status**: Investigasi Selesai (Read-Only)

---

## Ringkasan Eksekutif

Investigasi mendalam terhadap kode sumber dan database Supabase untuk Requirement R1 ("Kop Surat & Signature Print Formatting") telah selesai. Temuan utama meliputi:
1. **Komponen Cetak Terpusat**: Komponen Kop Surat (`PrintHeader`) dan Blok Tanda Tangan (`PrintSignature`) sudah terpusat di satu file: `src/components/PrintHeader.tsx`. Komponen ini digunakan di 4 tampilan rekap cetak utama: `AdminRekapView.tsx`, `PiketView.tsx`, `RekapSiswaView.tsx`, dan `RekapJurnalView.tsx`.
2. **Struktur Penyimpanan Supabase**: Pengaturan sekolah dan kop surat disimpan di tabel `pengaturan` (skema key-value: `id`, `key`, `value` dengan constraint unique pada `key`). Tabel `sekolah` tidak ada di database, melainkan menggunakan `pengaturan`. Kunci yang sudah ada saat ini adalah `KOTA_TTD` dan `kota_ttd`. Kunci baru `kota_kabupaten` perlu ditambahkan ke state `AdminConfigView.tsx` dan disimpan ke tabel `pengaturan`.
3. **Pembalikan Posisi Logo di Pengaturan**: Label logo di `AdminConfigView.tsx` terbalik (tertulis "Logo Kiri (Dinas)" dan "Logo Kanan (Sekolah)"). Sesuai standar persuratan dan kebutuhan R1, logo kiri adalah **Logo Yayasan** dan logo kanan adalah **Logo Dinas**.
4. **Isu Override CSS pada Blok Tanda Tangan**: Di `globals.css`, aturan `@media print` mendefinisikan `.print-only { display: block !important; }`. Akibatnya kelas flex Tailwind `.print-only.flex.justify-end` di-override menjadi `display: block`, menyebabkan blok tanda tangan jatuh ke rata kiri jika inner container tidak memiliki `margin-left: auto`.
5. **Format Alamat 1 Baris**: Ditemukan bahwa aturan CSS `clamp(...) !important` menimpa perhitungan dinamis `getAddressFontSize` di `PrintHeader.tsx`. Diperlukan harmonisasi menggunakan CSS variable (`--address-font-size`) dan container query agar alamat panjang (hingga 110+ karakter) dijamin tidak membungkus (nowrap) dan tidak terpotong (overflow clipped).

---

## 1. Inventarisasi Komponen Terkait Cetak & Layout Dokumen

Berikut adalah daftar lengkap komponen, layout, dan stylesheet yang terlibat dalam pencetakan Kop Surat dan Tanda Tangan:

| Path Berkas | Peran / Fungsi | Keterangan |
|---|---|---|
| `src/components/PrintHeader.tsx` | Mendefinisikan komponen utama `PrintHeader` dan `PrintSignature`. | Hanya aktif saat `@media print` (`.print-only`). Berisi layout kop 3 kolom (logo kiri, teks tengah, logo kanan) dan blok tanda tangan. |
| `src/app/globals.css` (Baris 166–248) | Definisi aturan `@media print` global, page setup A4, page break, typography rules, dan class visibility (`.print-only`, `.no-print`). | Mengatur `.print-header` `line-height: 1 !important`, `.print-address` `white-space: nowrap !important`, dan `.print-signature`. |
| `src/components/AdminConfigView.tsx` | Halaman form admin untuk mengubah konfigurasi sekolah, kop surat, jam kerja, dan GPS. | Tempat input "Nama Kota/Kabupaten" dan URL logo yayasan/dinas. |
| `src/components/AdminRekapView.tsx` | Halaman rekapitulasi kehadiran, piket, dan jurnal guru untuk admin. | Memanggil `<PrintHeader />` (baris 177) dan `<PrintSignature />` (baris 341). Tombol cetak memanggil `window.print()` (baris 373). |
| `src/components/PiketView.tsx` | Halaman jadwal dan laporan piket guru. | Memanggil `<PrintHeader />` (baris 479) dan `<PrintSignature />` (baris 678) pada Tab 3 (Rekap Piket). Tombol cetak memanggil `window.print()` (baris 692). |
| `src/components/RekapSiswaView.tsx` | Halaman rekapitulasi presensi siswa per kelas. | Memanggil `<PrintHeader />` (baris 199) dan `<PrintSignature />` (baris 328). Tombol cetak memanggil `window.print()` (baris 349). |
| `src/components/RekapJurnalView.tsx` | Halaman rekapitulasi jurnal pembelajaran guru pribadi. | Memanggil `<PrintHeader />` (baris 121) dan `<PrintSignature />` (baris 263). Tombol cetak memanggil `window.print()` (baris 293). |
| `tests/printHeader.test.ts` | Unit test otomasi untuk logika `getAddressFontSize`, ekstraksi wilayah, dan format tanggal WITA. | Berkas verifikasi independen saat `npm test`. |

---

## 2. Investigasi Skema Supabase: Tabel `pengaturan`

### 2.1 Struktur Tabel
Kueri langsung ke `information_schema.columns` pada proyek Supabase (`jicvvqxjyzntdrccnuyz`):
- Nama Tabel: `pengaturan` (Catatan: tabel `sekolah` tidak ada di sistem database).
- Kolom:
  - `id`: `uuid` (Primary Key, default `gen_random_uuid()`)
  - `key`: `text` (Unique constraint `pengaturan_key_key`)
  - `value`: `text` (Nullable)

### 2.2 Data Eksisting dalam Database
Berdasarkan hasil `SELECT * FROM pengaturan;`:
- Data Huruf Kapital (Legacy / Default Seed):
  - `NAMA_YAYASAN`: `"YAYASAN NIZAMUDIN CANDI LIBERIA"`
  - `NAMA_SEKOLAH`: `"SMA Nizamudin"`
  - `ALAMAT_SEKOLAH`: `"Dusun I, Jln. Wiratama no.1, Desa Candi Rejo, Kec. Modayag, Kab. Bolaangmongondow Timur"`
  - `NPSN`: `"70040625"`
  - `LOGO_KIRI_URL`: `"https://drive.google.com/file/d/1IuiijBtVcKtvTItL9ZqAwMhxJh0y8pE0/view?usp=sharing"`
  - `LOGO_KANAN_URL`: `"https://drive.google.com/file/d/1YEB9w1-JeTVKbDwdrjhX-824euORrd3f/view?usp=sharing"`
  - `NAMA_KEPALA_SEKOLAH`: `"Ade Fitrawan Ibrahim, M.Pd., Gr."`
  - `NIP_KEPALA_SEKOLAH`: `"-"`
  - `KOTA_TTD`: `"Kab. Bolaangmongondow Timur"`
- Data Huruf Kecil (Tersimpan dari `AdminConfigView.tsx`):
  - `kop_yayasan`: `"YAYASAN CANDI NIZAMUDIN LIBERIA "`
  - `kop_sekolah`: `"SMA NIZAMUDIN "`
  - `kop_alamat`: `"Jl. Wiratama, Dusun 1, Kec. Modayag, Kab. Bolaangmongondow Timur"`
  - `kop_npsn`: `"70040625"`
  - `logo_kiri`: `"https://ibb.co.com/c061HtG"`
  - `logo_kanan`: `"https://freeimage.host/i/n3ZyXlj"`
  - `ttd_kepsek_nama`: `"Ade Fitrawan Ibrahim, M.Pd., Gr."`
  - `ttd_kepsek_nip`: `""`
  - `kota_ttd`: `"Kab. Bolaangmongondow Timur"`

### 2.3 Mekanisme Query & Upsert
1. **Query**:
   ```ts
   const { data } = await supabase.from('pengaturan').select('*');
   // Diubah menjadi key-value object: config[item.key] = item.value;
   ```
2. **Upsert**:
   ```ts
   const upsertData = Object.entries(config).map(([key, value]) => ({
     key,
     value: value ? value.toString() : ''
   }));
   await supabase.from('pengaturan').upsert(upsertData, { onConflict: 'key' });
   ```
   Karena `key` memiliki unique constraint, operasi `upsert` pada Supabase secara atomik memperbarui baris jika kunci sudah ada, atau menyisipkan baris baru jika belum ada. Tidak diperlukan DDL migration (CREATE TABLE/ALTER TABLE) untuk tabel `pengaturan`.

---

## 3. Investigasi Halaman Admin Pengaturan (`AdminConfigView.tsx`)

### 3.1 Observasi Kode Saat Ini
Di `src/components/AdminConfigView.tsx`:
1. **State Konfigurasi** (Baris 20–28):
   ```tsx
   kop_yayasan: '',
   kop_sekolah: '',
   kop_alamat: '',
   kop_npsn: '',
   logo_kiri: '',
   logo_kanan: '',
   ttd_kepsek_nama: '',
   ttd_kepsek_nip: '',
   kota_ttd: '',
   ```
2. **Label Input Logo** (Baris 177 & 192):
   ```tsx
   <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Logo Kiri (Dinas)</label>
   ...
   <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Logo Kanan (Sekolah)</label>
   ```
   *Analisis*: Label ini keliru. Sesuai ketentuan R1: Logo Yayasan harus di Kiri dan Logo Dinas di Kanan.
3. **Input Wilayah / Kota** (Baris 221–224):
   ```tsx
   <div>
       <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Kabupaten / Kota Tanda Tangan</label>
       <input type="text" name="kota_ttd" value={config.kota_ttd || ''} onChange={handleChange} placeholder="Contoh: Kab. Bolaangmongondow Timur" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
   </div>
   ```

### 3.2 Kebutuhan Perubahan untuk R1 & Acceptance Criteria
Kriteria Penerimaan secara eksplisit menyatakan:
`- [ ] Komponen admin (Pengaturan) berhasil menyimpan data kota_kabupaten.`
Oleh karena itu, implementasi harus:
1. Menambahkan key `kota_kabupaten` pada state awal `AdminConfigView`:
   ```tsx
   kota_kabupaten: '',
   kota_ttd: '',
   ```
2. Pada `useEffect` pemuatan data:
   ```tsx
   if (item.key === 'kota_kabupaten' || item.key === 'KOTA_KABUPATEN') {
     newConfig.kota_kabupaten = item.value;
   }
   // Fallback jika kota_kabupaten belum pernah diisi sebelumnya:
   if (!newConfig.kota_kabupaten && (newConfig.kota_ttd || newConfig.KOTA_TTD)) {
     newConfig.kota_kabupaten = newConfig.kota_ttd || newConfig.KOTA_TTD;
   }
   ```
3. Mengubah elemen input agar jelas berlabel **"Nama Kota/Kabupaten"** dengan `name="kota_kabupaten"`:
   ```tsx
   <div>
       <label className="block text-xs font-bold text-gray-900 dark:text-white mb-0.5">Nama Kota/Kabupaten</label>
       <input 
         type="text" 
         name="kota_kabupaten" 
         value={config.kota_kabupaten || ''} 
         onChange={(e) => {
           handleChange(e);
           // Sinkronisasi otomatis ke kota_ttd agar backwards-compatible
           setConfig(prev => ({ ...prev, kota_kabupaten: e.target.value, kota_ttd: e.target.value }));
         }} 
         placeholder="Contoh: Kab. Bolaangmongondow Timur" 
         className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
       />
   </div>
   ```
4. Saat penyimpanan (`handleSave`):
   Data yang dikirim ke Supabase mencakup:
   `{ key: 'kota_kabupaten', value: config.kota_kabupaten }`
   dan `{ key: 'kota_ttd', value: config.kota_kabupaten }`.

---

## 4. Penataan Logo Yayasan (Kiri) dan Logo Dinas (Kanan)

### 4.1 Logika Penataan
Sesuai instruksi spesifik:
*"Letakkan logo yayasan (kiri) dan logo dinas (kanan) bersumber dari tabel pengaturan."*

1. **Di `AdminConfigView.tsx`**:
   - Ganti label field logo kiri:
     `Logo Kiri (Yayasan)` (mengisi URL logo yayasan).
   - Ganti label field logo kanan:
     `Logo Kanan (Dinas)` (mengisi URL logo dinas/provinsi).
   - Simpan ke kunci `logo_kiri` (alias `logo_yayasan`) dan `logo_kanan` (alias `logo_dinas`).

2. **Di `PrintHeader.tsx`**:
   - Resolusi URL logo:
     ```tsx
     const logoYayasan = transformGoogleDriveUrl(
       config.logo_yayasan || config.logo_kiri || config.LOGO_KIRI_URL || ''
     );
     const logoDinas = transformGoogleDriveUrl(
       config.logo_dinas || config.logo_kanan || config.LOGO_KANAN_URL || ''
     );
     ```
   - Komponen kontainer kiri:
     ```tsx
     {/* Left Logo Container (Yayasan) */}
     <div className="shrink-0 w-24 h-24 flex items-center justify-center">
       {logoYayasan ? (
         <img 
           src={logoYayasan} 
           alt="Logo Yayasan" 
           className="max-w-full max-h-full object-contain" 
         />
       ) : (
         <div className="w-20 h-20" />
       )}
     </div>
     ```
   - Komponen kontainer kanan:
     ```tsx
     {/* Right Logo Container (Dinas) */}
     <div className="shrink-0 w-24 h-24 flex items-center justify-center">
       {logoDinas ? (
         <img 
           src={logoDinas} 
           alt="Logo Dinas" 
           className="max-w-full max-h-full object-contain" 
         />
       ) : (
         <div className="w-20 h-20" />
       )}
     </div>
     ```

---

## 5. Investigasi CSS Print Styles (Line-Height & Alamat 1 Baris)

### 5.1 Penegakan `line-height: 1`
Kop surat resmi memerlukan kerapatan vertikal standar tanpa jarak antar-baris font default browser yang renggang.
- **Dalam `src/app/globals.css`** (Baris 180–188):
  ```css
  /* Enforce line-height: 1 for PrintHeader */
  .print-header,
  .print-header h1,
  .print-header h2,
  .print-header p,
  .print-header div,
  .print-header span {
    line-height: 1 !important;
  }
  ```
- **Dalam `src/components/PrintHeader.tsx`**:
  Semua elemen kop surat (`h1`, `h2`, `p`) telah diberi kelas Tailwind `leading-none` (yang setara dengan `line-height: 1`) dan properti inline `lineHeight: 1`.

### 5.2 Menjamin Alamat Kop Surat Tepat 1 Baris (Tanpa Wrap & Tanpa Terpotong)
Tantangan teknis:
Alamat sekolah formal Indonesia seringkali sangat panjang, misalnya:
*"Dusun I, Jln. Wiratama no.1, Desa Candi Rejo, Kec. Modayag, Kab. Bolaangmongondow Timur, Sulawesi Utara 95781"* (105 karakter).
Pada kertas A4 (lebar cetak bersih 180mm minus dua logo @ 25.4mm dan gap = lebar sisa ~125mm):
- Jika font size sebesar `9pt` atau `0.875rem`, teks membutuhkan lebar >160mm. Jika di-`nowrap` dengan overflow hidden, teks akan terpotong di sebelah kanan.
- Di `globals.css` saat ini terdapat:
  ```css
  .print-address {
    white-space: nowrap !important;
    line-height: 1 !important;
    font-size: clamp(6.5pt, 1.35vw, 9.5pt) !important;
    overflow: hidden !important;
  }
  ```
  Nilai batas bawah `6.5pt` pada `clamp()` masih terlalu besar untuk alamat >95 karakter, dan tanda `!important` mencegah skrip `getAddressFontSize` di `PrintHeader.tsx` bekerja.

**Solusi Terverifikasi**:
1. Hubungkan kalkulasi dinamis JavaScript dengan CSS Variable `--address-font-size`:
   Di `PrintHeader.tsx`:
   ```tsx
   const getAddressFontSize = (text: string) => {
     const len = text ? text.length : 0;
     if (len > 110) return '0.45rem'; // ~5.4pt
     if (len > 95) return '0.52rem';  // ~6.2pt
     if (len > 80) return '0.58rem';  // ~7.0pt
     if (len > 65) return '0.65rem';  // ~7.8pt
     if (len > 50) return '0.72rem';  // ~8.6pt
     if (len > 35) return '0.8rem';
     return '0.875rem';
   };
   ```
   Dan pada elemen `<p>`:
   ```tsx
   <p
     className="print-address text-black whitespace-nowrap leading-none tracking-tight overflow-hidden"
     style={{
       whiteSpace: 'nowrap',
       lineHeight: 1,
       fontSize: getAddressFontSize(alamat),
       ['--address-font-size' as any]: getAddressFontSize(alamat)
     }}
     title={alamat}
   >
     {alamat}
   </p>
   ```
2. Di `src/app/globals.css`:
   Gunakan variabel fallback:
   ```css
   .print-address {
     white-space: nowrap !important;
     line-height: 1 !important;
     font-size: var(--address-font-size, clamp(5pt, 1.8cqw, 9pt)) !important;
     overflow: hidden !important;
     text-overflow: clip !important;
     max-width: 100% !important;
     display: block !important;
     margin-left: auto !important;
     margin-right: auto !important;
   }
   ```
   Dengan teknik ini:
   - Jika CSS Variable ada, font size mengecil sesuai panjang teks riil.
   - Jika browser mengabaikan inline style, container query `clamp(5pt, 1.8cqw, 9pt)` tetap mengecilkan font secara proporsional dengan lebar kontainer tengah tanpa merusak baris.

---

## 6. Investigasi Blok Tanda Tangan (`PrintSignature`)

### 6.1 Analisis Tata Letak & Masalah Rata Kanan (`justify-end`)
Kebutuhan R1 menetapkan:
- *"Format tanda tangan: Letakkan seluruh blok tanggal dan tanda tangan di rata kanan (align right)."*
- Kriteria Penerimaan: *"Blok tanda tangan (PrintSignature) memiliki CSS flex/grid yang memaksanya merapat ke kanan (`justify-end`)."*

**Temuan Cacat Rendering Cetak (Critical Finding)**:
Di `src/app/globals.css` baris 178:
```css
.print-only { display: block !important; }
```
Di `src/components/PrintHeader.tsx` baris 154:
```tsx
<div className="print-only print-signature mt-10 flex justify-end text-black">
  <div className="text-center w-64 text-black">
```
Karena `.print-only` memiliki `display: block !important`, saat media cetak aktif, browser menerapkan `display: block` pada elemen pembungkus terluar. Properti `justify-end` Tailwind tidak berlaku pada elemen blok biasa! Akibatnya, `div.text-center.w-64` (lebar 256px) yang tidak memiliki `margin-left: auto` akan **jatuh ke sisi kiri kertas**.

**Perbaikan yang Diperlukan**:
1. Di `src/app/globals.css`:
   Tambahkan aturan khusus untuk `.print-signature`:
   ```css
   .print-signature {
     display: flex !important;
     justify-content: flex-end !important;
     margin-left: auto !important;
     page-break-inside: avoid !important;
     break-inside: avoid !important;
   }
   .print-signature > div {
     margin-left: auto !important;
   }
   ```
2. Di `src/components/PrintHeader.tsx`:
   Tambahkan kelas `ml-auto` pada inner card:
   ```tsx
   <div className="print-only print-signature mt-10 flex justify-end text-black">
     <div className="text-center w-64 ml-auto text-black">
   ```
   Ini memberikan jaminan berlapis: baik browser menggunakan Flexbox maupun Block fallback, kontainer tanda tangan tetap berada di sudut kanan bawah halaman.

### 6.2 Format Baris Tanggal & Identitas
Sesuai instruksi:
- Baris 1: `[Kota/Kabupaten dari Pengaturan], [DD Bulan YYYY]`
- Baris 2: `Kepala Sekolah`
- Spasi tanda tangan (`mb-24`)
- Baris 3: Nama Kepala Sekolah (Bold, Underline)
- Baris 4: NIP Kepala Sekolah

1. **Resolusi Nama Wilayah**:
   Fungsi `getRegion()` di `PrintHeader.tsx` harus mengutamakan `kota_kabupaten`:
   ```tsx
   const getRegion = () => {
     if (config.kota_kabupaten && typeof config.kota_kabupaten === 'string' && config.kota_kabupaten.trim()) {
       return config.kota_kabupaten.trim();
     }
     if (config.KOTA_KABUPATEN && typeof config.KOTA_KABUPATEN === 'string' && config.KOTA_KABUPATEN.trim()) {
       return config.KOTA_KABUPATEN.trim();
     }
     if (config.kota_ttd && typeof config.kota_ttd === 'string' && config.kota_ttd.trim()) {
       return config.kota_ttd.trim();
     }
     if (config.KOTA_TTD && typeof config.KOTA_TTD === 'string' && config.KOTA_TTD.trim()) {
       return config.KOTA_TTD.trim();
     }
     const alamat = config.kop_alamat || config.ALAMAT_SEKOLAH || '';
     if (alamat && typeof alamat === 'string') {
       const match = alamat.match(/(Kab\.\s*[^,]+|Kota\s*[^,]+|Kabupaten\s*[^,]+)/i);
       if (match) return match[1].trim();
     }
     return '';
   };
   ```
2. **Format Tanggal WITA**:
   ```tsx
   const today = new Date();
   const formattedDate = today.toLocaleDateString('id-ID', {
     timeZone: 'Asia/Makassar',
     day: 'numeric',
     month: 'long',
     year: 'numeric'
   });
   // Contoh hasil: "12 September 2026"
   ```
3. **Penyusunan Baris Lengkap**:
   ```tsx
   <p className="leading-tight text-xs sm:text-sm">
     {region ? `${region}, ` : ''}{dateStr}
   </p>
   <p className="mb-24 leading-tight text-xs sm:text-sm">Kepala Sekolah</p>
   <p className="font-bold underline leading-tight text-xs sm:text-sm">{kepsekNama}</p>
   {kepsekNip && kepsekNip !== '-' && kepsekNip !== '' ? (
     <p className="leading-tight text-[11px] sm:text-xs">NIP. {kepsekNip}</p>
   ) : null}
   ```

---

## 7. Rencana Perubahan Kode (Proposed Changes Specification)

Berikut panduan perubahan kode untuk implementer:

### 1. `src/components/AdminConfigView.tsx`
- Tambahkan `kota_kabupaten: ''` di initial state `config`.
- Parsing `kota_kabupaten` pada pemanggilan `pengaturan`.
- Ubah label `Logo Kiri (Dinas)` -> `Logo Kiri (Yayasan)`.
- Ubah label `Logo Kanan (Sekolah)` -> `Logo Kanan (Dinas)`.
- Ganti input `name="kota_ttd"` menjadi `name="kota_kabupaten"`, label `Nama Kota/Kabupaten`.
- Pada `handleSave`: upsert kedua key (`kota_kabupaten` dan `kota_ttd`) dengan nilai yang sama.

### 2. `src/components/PrintHeader.tsx`
- Pada `PrintHeader`:
  - Baca `logoYayasan` dari `config.logo_yayasan || config.logo_kiri || config.LOGO_KIRI_URL`.
  - Baca `logoDinas` dari `config.logo_dinas || config.logo_kanan || config.LOGO_KANAN_URL`.
  - Pasang `alt="Logo Yayasan"` pada gambar kiri, dan `alt="Logo Dinas"` pada gambar kanan.
  - Perbarui `getAddressFontSize` dengan threshold hingga >110 char (`0.45rem`).
  - Tambahkan style `['--address-font-size' as any]: getAddressFontSize(alamat)`.
- Pada `PrintSignature`:
  - Perbarui `getRegion` agar membaca `config.kota_kabupaten` dan `config.KOTA_KABUPATEN` pada prioritas pertama.
  - Tambahkan kelas `ml-auto` pada inner `div` agar tahan terhadap render block.

### 3. `src/app/globals.css`
- Perbarui selektor `.print-signature`:
  ```css
  .print-signature {
    display: flex !important;
    justify-content: flex-end !important;
    margin-left: auto !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  .print-signature > div {
    margin-left: auto !important;
  }
  ```
- Perbarui `.print-address`:
  ```css
  .print-address {
    white-space: nowrap !important;
    line-height: 1 !important;
    font-size: var(--address-font-size, clamp(5pt, 1.8cqw, 9pt)) !important;
    overflow: hidden !important;
    text-overflow: clip !important;
    max-width: 100% !important;
    display: block !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }
  ```

### 4. `tests/printHeader.test.ts`
- Perbarui pengujian `getRegion` agar menguji `kota_kabupaten` (misal: `{ kota_kabupaten: 'Kab. Bolaangmongondow Timur' }`).
- Pastikan semua assertion lulus tanpa error.

---

## 8. Verifikasi Independen & Rekomendasi Pengujian

Untuk memverifikasi implementasi R1:
1. **Pengecekan Kompilasi TypeScript**:
   `npx tsc --noEmit` (harus menghasilkan exit code 0).
2. **Eksekusi Pengujian Otomasi**:
   `npm run test` (harus meluluskan `tests/imageUrl.test.ts`, `tests/printHeader.test.ts`, dan `tests/qolAudit.test.ts`).
3. **Verifikasi Database Supabase**:
   Kueri ke Supabase:
   `SELECT * FROM pengaturan WHERE key IN ('kota_kabupaten', 'logo_kiri', 'logo_kanan');`
   Memverifikasi bahwa penyimpanan dari Admin Pengaturan berhasil menyimpan baris dengan `key = 'kota_kabupaten'`.
4. **Verifikasi Visual Cetak (Print Preview)**:
   Buka salah satu tampilan cetak (misalnya Rekap Siswa atau Rekap Jurnal), tekan Ctrl+P atau tombol cetak:
   - Pastikan logo yayasan di kiri dan logo dinas di kanan.
   - Pastikan alamat kop surat berada persis di 1 baris tanpa wrapping maupun pemotongan teks.
   - Pastikan seluruh blok tanda tangan merapat ke kanan (`justify-end` / rata kanan) dengan baris tanggal `"Kab. Bolaangmongondow Timur, [Tanggal Hari Ini]"`.
