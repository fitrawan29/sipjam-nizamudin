# Handoff Report: Survey R4 - Download Kartu Presensi QR Siswa (Admin)

## 1. Observation

### 1.1 `package.json` Dependencies
Pemeriksaan pada `package.json` (lines 13-23):
```json
"dependencies": {
  "@supabase/supabase-js": "^2.116.0",
  "csv-parse": "^7.0.2",
  "dotenv": "^17.4.2",
  "next": "16.3.4",
  "react": "19.2.8",
  "react-dom": "19.2.8",
  "sweetalert2": "^11.26.25",
  "tsx": "^4.23.13",
  "web-push": "^3.6.7"
}
```
- **Fakta**: Tidak ada library eksternal untuk QR (`qrcode`, `qrcode.react`, dll.), tidak ada library PDF (`jspdf`, `pdfmake`, dll.), dan tidak ada library HTML-to-Canvas (`html2canvas`). Penambahan package npm baru dilarang oleh user rules & prinsip Ponytail.

### 1.2 Struktur Data Siswa & Sekolah
Pemeriksaan skema database di `src/types/database.ts`:
- **Tabel `data_siswa`** (lines 323-356):
  - `id`: `string` (UUID, primary key)
  - `nama_siswa`: `string | null` (Nama lengkap siswa)
  - `nisn`: `string | null` (Nomor Induk Siswa Nasional)
  - `kelas`: `string | null` (Nama kelas, misal "X Merdeka", "7A")
  - `sekolah_id`: `string` (Foreign key ke tabel `sekolah.id`)
  - `gender`: `string | null` ("Laki-laki" | "Perempuan")
  - `status`: `string | null` ("Aktif", "Lulus", "Pindah", "Nonaktif")
  - `qr_code`: `string | null` (Identifier unik QR presensi)
  - `no_hp_ortu`: `string | null`
- **Tabel `sekolah`** (lines 1270-1291):
  - `id`: `string` (UUID, primary key)
  - `nama`: `string` (Nama instansi sekolah, misal "SMA NIZAMUDIN")
  - `logo_url`: `string | null`
  - `alamat`: `string | null`
  - `kota_kabupaten`: `string | null`
  - `npsn`: `string | null`

### 1.3 Pembuatan dan Penyimpanan QR Code Siswa Saat Ini
Di `src/lib/qrSiswa.ts`:
- Sistem sudah memiliki generator QR Code mandiri murni TypeScript (ISO/IEC 18004 Specs, ECC Level L, Reed-Solomon BCH error correction, zero external dependencies).
- Fungsi kunci yang diekspor:
  1. `getStudentQrIdentifier(siswa)` (line 341):
     ```ts
     return (siswa.qr_code && siswa.qr_code.trim()) || (siswa.nisn && siswa.nisn.trim()) || siswa.id;
     ```
  2. `generateQrMatrix(text: string): boolean[][]` (line 158):
     Menghasilkan matriks 2D boolean untuk posisi titik hitam (dark module) QR code.
  3. `generateStudentQrSvg(text: string, options?: QrOptions): string` (line 298):
     Menghasilkan string SVG vector QR code.
  4. `generateStudentQrDataUrl(text: string, options?: QrOptions): string` (line 325):
     Menghasilkan Data URL base64 SVG (`data:image/svg+xml;base64,...`).

### 1.4 Kondisi Fitur Cetak Eksisting di `AdminDataView.tsx`
Pemeriksaan pada `src/components/AdminDataView.tsx`:
- Line 8: `import { getStudentQrIdentifier, generateStudentQrSvg } from '@/lib/qrSiswa';`
- Line 848-892: Fungsi `printStudentQrCard(student, qrSvg, qrIdentifier)`:
  Membuka popup jendela browser (`window.open('', '_blank')`) dengan template HTML statis dan memicu `window.print()`.
  *Catatan kekurangan saat ini*: Template print belum memuat Nama Sekolah (`schoolInfo.nama`) dan hanya memiliki tombol cetak browser, belum ada mekanisme download langsung (file PNG/gambar).
- Line 894-923: `handleShowStudentQr(student)`:
  Menampilkan dialog SweetAlert dengan preview SVG QR code dan tombol konfirmasi "Cetak Kartu" (memanggil `printStudentQrCard`).
- Line 926-989: `handlePrintBatchQrCards()`:
  Mencetak kartu presensi beberapa siswa yang dipilih (checkbox) atau seluruh siswa terfilter. Juga belum memuat Nama Sekolah.
- Line 2007-2016: Tombol aksi per baris kartu siswa:
  Saat ini hanya ada tombol `<i class="fa-solid fa-qrcode"></i> QR Code`, belum ada tombol langsung "Download Kartu".

### 1.5 Referensi Pola HTML5 Canvas di Codebase
Pada `src/lib/watermarkCanvas.ts` (lines 193-248):
Codebase telah memanfaatkan HTML5 Canvas 2D (`canvas.getContext('2d')`) dengan handling `roundRect`, scaling, font typography, dan export gambar tanpa library tambahan.

---

## 2. Logic Chain

1. **Kebutuhan Format File (Gambar PNG vs PDF)**:
   - User requirement R4 menyatakan:
     *"Admin harus bisa mendownload kartu ini (misal dalam bentuk PDF atau format gambar) selain dari sekadar tombol print yang sudah ada."*
   - Karena `package.json` tidak mengizinkan penambahan package baru (`jspdf`, `canvas`, `html2canvas`), mekanisme rendering kartu gambar paling handal di browser adalah menggunakan **HTML5 `<canvas>` native**.
   - Dari canvas, gambar kartu beresolusi tinggi (600 × 960 px, ~300 DPI equivalent) dapat diekspor langsung ke file PNG melalui `canvas.toDataURL('image/png')` atau `canvas.toBlob(...)`, kemudian ditrigger download menggunakan elemen `<a download="Kartu_Presensi_...png" href="...">`.
   - Untuk format PDF, browser modern menyediakan opsi native "Save as PDF / Simpan sebagai PDF" saat fungsi cetak `window.print()` dipanggil pada window kartu yang sudah diatur dengan CSS `@media print { @page { size: auto; margin: 10mm; } }`.

2. **Rendering QR Code pada Canvas**:
   - `src/lib/qrSiswa.ts` mengekspor `generateQrMatrix(qrIdentifier)`.
   - Menggambar QR code langsung dari matriks boolean (`matrix[r][c]`) menggunakan `ctx.fillRect(x, y, moduleSize, moduleSize)` adalah **100% sinkron**, tanpa asynchronous image loading, tanpa latensi jaringan, bebas CORS/tainted canvas issues, dan menghasilkan piksel yang sangat tajam.

3. **Resolusi Nama Sekolah**:
   - `AdminDataView` menerima prop `{ user }` yang memiliki `user.sekolah_id`.
   - Saat komponen mount, query satu kali ke `supabase.from('sekolah').select('id, nama, logo_url, alamat').eq('id', user.sekolah_id).maybeSingle()` akan mendapatkan nama resmi sekolah (misal "SMA NIZAMUDIN" atau "SMP NEGERI 1 ...").
   - Jika `user.sekolah_id` belum terisi, sediakan fallback ke `user.sekolah_nama` atau `'SIPJAM'`.

4. **Desain Kartu Identitas Siswa Proporsional (Standard Portrait ID-1 / CR80)**:
   - **Dimensi**: 600 px × 960 px (aspek rasio 1 : 1.6, ideal untuk kartu saku / lanyard / kartu pelajar).
   - **Header (Atas)**:
     - Background gradient tema hijau SIPJAM (`#0B4619` ke `#166534`).
     - Aksen garis emas (`#EAB308`).
     - Teks "KARTU PRESENSI DIGITAL" (uppercase putih, letter spacing).
     - Nama Sekolah (ukuran 20-22px, font tebal warna emas/putih).
     - Subtitle: "Sistem Informasi Presensi Siswa".
   - **Tengah (QR Code)**:
     - Kontainer kotak putih rounded (`borderRadius: 20px`) berukuran 270 × 270 px dengan drop shadow lembut.
     - QR Code berukuran 220 × 220 px warna hijau botol (`#0B4619`), mudah dipindai oleh kamera HP, kiosk, maupun scanner USB HID.
     - Badge ID di bawah QR: `ID: {qrIdentifier}` dalam font monospace.
   - **Identitas Siswa (Bawah)**:
     - Nama Lengkap Siswa: `nama_siswa` (bold 20-22px, auto-scale jika panjang).
     - Badge status: "SISWA AKTIF" (pill warna hijau).
     - Kotak informasi terstruktur:
       - NISN: `student.nisn` (monospace bold).
       - Kelas: `student.kelas`.
       - Sekolah: `schoolName`.
       - Jenis Kelamin: `student.gender`.
   - **Footer (Bawah)**:
     - Instruksi: *"Tunjukkan kartu ini pada scanner saat presensi datang & pulang"*.
     - Branding: *"SIPJAM • Dokumen Resmi Presensi"*.

5. **Penempatan Tombol pada UI `AdminDataView.tsx`**:
   - **Per Siswa pada Kartu List** (di `renderCard` / action bar baris 2007-2016):
     Tambahkan tombol langsung:
     ```tsx
     <button 
       type="button" 
       onClick={() => handleDownloadStudentCard(item)} 
       className="btn-click text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 transition"
       title="Download Kartu Presensi (PNG)"
     >
       <i className="fa-solid fa-download text-[10px]"></i> Download Kartu
     </button>
     ```
   - **Di dalam Modal QR Siswa** (`handleShowStudentQr`):
     Tambahkan opsi download PNG dan cetak kartu:
     - Tombol "Download Gambar (PNG)"
     - Tombol "Cetak / Simpan PDF"
   - **Di Toolbar Aksi Massal** (lines 1759-1767):
     Selain "Cetak QR", admin dapat mencetak atau mendownload kartu untuk semua siswa yang dicentang.

---

## 3. Caveats

1. **Ekspor PDF Murni Client-side**:
   Karena `jspdf` atau library pembuatan binary PDF tidak ada di `package.json` dan tidak boleh diinstal, format PDF didapatkan melalui dialog cetak browser (`window.print()` -> "Simpan sebagai PDF"), sedangkan format gambar (PNG) didownload langsung 1-klik sebagai file `.png`. Hal ini sepenuhnya memenuhi requirement (*"dalam bentuk PDF atau format gambar selain dari sekadar tombol print yang sudah ada"*).
2. **Ketersediaan DOM dalam Testing Unit**:
   Elemen `<canvas>` dan `document.createElement` memerlukan browser DOM. Di lingkungan Node.js/CLI (`tsx tests/...`), pemanggilan fungsi pembuat canvas perlu diproteksi dengan guard `typeof document !== 'undefined'` atau mock context agar suite testing otomatis tetap lulus 100%.
3. **Data Nama Sekolah Kosong**:
   Jika data sekolah di Supabase belum memiliki `nama` atau user adalah Superadmin tanpa `sekolah_id`, fallback harus disiapkan secara anggun (misal `'SIPJAM School'`).

---

## 4. Conclusion

1. **Arsitektur Solusi**:
   Buat modul helper baru (atau perluas di `src/lib/qrSiswa.ts` / `src/lib/studentCard.ts`) yang menyediakan:
   - `generateStudentCardCanvas({ student, schoolName, qrIdentifier }): HTMLCanvasElement`
   - `downloadStudentCardPng({ student, schoolName, qrIdentifier }): boolean`
   - `printStudentQrCard({ student, schoolName, qrIdentifier }): void` (dengan layout baru proporsional memuat Nama Sekolah).
2. **Integrasi ke `AdminDataView.tsx`**:
   - Fetch info sekolah (`nama`) via Supabase saat inisialisasi.
   - Tambahkan tombol "Download Kartu" di setiap kartu siswa (`Data_Siswa`).
   - Perbarui modal QR SweetAlert dengan tombol download PNG + cetak.
   - Perbarui batch print agar memuat Nama Sekolah.
3. **Dampak Perubahan**:
   - Nol dependensi baru (`package.json` bersih).
   - Perubahan hanya terlokalisasi pada `src/lib/qrSiswa.ts` (atau `studentCard.ts`) dan `src/components/AdminDataView.tsx`.
   - Tidak ada modifikasi skema database.

---

## 5. Verification Method

### 5.1 Programmatic Test Suite
Jalankan verifikasi automated test suite yang sudah ada:
```bash
npx tsx tests/qrSiswa.test.ts
npm test
```
Buat unit test tambahan (misal `tests/studentCard.test.ts` atau integrasikan ke `tests/qrSiswa.test.ts`) untuk memverifikasi:
- Fungsi `getStudentQrIdentifier` menghasilkan identifier yang konsisten.
- Generator matriks QR menghasilkan dimensi yang valid (21x21 s/d 29x29).
- Data identitas (Nama, NISN, Kelas, Nama Sekolah) diformat dengan benar.

### 5.2 Build & Type Checking
Pastikan tidak ada error TypeScript atau error kompilasi Next.js:
```bash
npx tsc --noEmit
npm run build
```

### 5.3 Manual / Browser Verification
1. Login sebagai Admin ke SIPJAM.
2. Buka menu **Master Data** -> tab **Siswa**.
3. Verifikasi terdapat tombol **Download Kartu** pada setiap kartu siswa.
4. Klik tombol **Download Kartu**:
   - File gambar PNG (`Kartu_Presensi_[NamaSiswa]_[NISN].png`) terunduh otomatis ke folder Downloads.
   - Buka file gambar: pastikan memuat Nama Sekolah, Nama Lengkap Siswa, NISN, Kelas, dan QR Code unik yang jelas dan tajam.
5. Klik tombol **QR Code** untuk membuka modal preview:
   - Verifikasi dialog menampilkan QR dan tombol download PNG serta cetak kartu.
6. Coba scan QR Code yang tertera pada kartu menggunakan tab **Scan QR Siswa** di modul Piket atau aplikasi scanner kamera HP:
   - Hasil scan terbaca sesuai NISN / kode unik siswa.
