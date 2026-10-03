# LAPORAN INVESTIGASI TEKNIS: R2 & R3 QR CODE SISWA & PRESENSI PIKETVIEW
**Proyek:** SIPJAM (Next.js 16 + Supabase + React 19)  
**Agent:** Explorer 2 (`explorer_o10_2`)  
**Tanggal:** 2026-10-04  
**Status:** Selesai (Read-Only Investigation)

---

## 1. Ringkasan Eksekutif
Investigasi ini berfokus pada pemenuhan kebutuhan:
- **R2: QR Code Siswa — Generate & Scan**: Pembuatan identifikasi QR unik untuk setiap siswa, antarmuka scan kamera browser (Web API) dan hardware barcode/QR scanner eksternal (USB HID input teks + Enter) pada `PiketView.tsx`, serta dukungan penggunaan bersamaan hingga 10 unit scanner.
- **R3: Laporan Presensi ke Piket & Wali Kelas**: Pencatatan data presensi siswa (`datang` & `pulang`) ke database Supabase, visualisasi laporan harian di modul Piket (`PiketView.tsx`), dan integrasi laporan ke tampilan Wali Kelas (`RekapSiswaView.tsx`).

---

## 2. Temuan Database & Struktur Data Siswa (Pertanyaan 1)

### 2.1 Kondisi Eksisting `data_siswa`
- **Tabel Eksisting**: `public.data_siswa` di Supabase.
- **Jumlah Baris Data**: 14 siswa (terdapat data live di database Supabase).
- **Struktur Kolom Saat Ini**:
  | Kolom | Tipe Data | Nullable | Keterangan |
  |---|---|---|---|
  | `id` | `uuid` | NO | Primary Key, `gen_random_uuid()` |
  | `nisn` | `text` | YES | NISN siswa (misal: "114367407", "011588409") |
  | `nama_siswa` | `text` | YES | Nama lengkap siswa |
  | `kelas` | `text` | YES | Kelas (misal: "X Merdeka") |
  | `gender` | `text` | YES | Jenis kelamin |
  | `status` | `text` | YES | Status aktif (misal: "Aktif") |
  | `no_hp_ortu` | `text` | YES | Nomor kontak orang tua |
  | `sekolah_id` | `uuid` | NO | Multi-tenant FK ke `public.sekolah(id)` |
- **Temuan QR Code**: **Belum ada kolom atau mekanisme QR code** di tabel `data_siswa` maupun tabel lainnya.

### 2.2 Desain Identifikasi & Struktur Identifier QR Siswa
Untuk memastikan QR code dapat dibaca baik oleh kamera browser maupun hardware USB HID barcode/QR scanner:
1. **Penambahan Kolom Database**:
   ```sql
   ALTER TABLE public.data_siswa ADD COLUMN IF NOT EXISTS qr_code TEXT;
   CREATE INDEX IF NOT EXISTS idx_data_siswa_qr_code ON public.data_siswa(qr_code);
   ```
2. **Format Payload QR Siswa**:
   - Nilai default dapat diisi dengan NISN siswa jika ada, atau fallback ke UUID siswa:
     `qr_code = COALESCE(NULLIF(nisn, ''), id::text)`
   - Nilai payload berbentuk string bersih alfanumerik tanpa karakter aneh (misal: `"114367407"` atau `"680584c6-0e5a-48c6-8a5c-d63515be6354"`).
3. **Mekanisme Pencocokan Multi-Identifier (Resilient Resolution)**:
   Saat scanner mengirim data teks `scannedCode`, sistem melakukan query pencocokan fleksibel:
   ```ts
   let query = supabase
     .from('data_siswa')
     .select('*')
     .or(`qr_code.eq.${scannedCode},nisn.eq.${scannedCode},id.eq.${scannedCode}`);
   if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);
   ```
   **Keuntungan:** Jika kartu pelajar fisik siswa dicetak menggunakan barcode NISN bawaan ataupun QR code buatan sistem SIPJAM, keduanya langsung terdeteksi otomatis tanpa konfigurasi rumit.

4. **Fitur Generator & Cetak QR**:
   - Di `AdminDataView.tsx` (tab Siswa): Tambahkan tombol aksi per baris "Lihat QR" dan tombol toolbar "Cetak Kartu Siswa / QR Massal".
   - QR code dapat di-render langsung sebagai gambar/SVG menggunakan library atau SVG generator murni.

---

## 3. Analisis Komponen `src/components/PiketView.tsx` (Pertanyaan 2)

### 3.1 Fungsi & Tab Eksisting `PiketView.tsx`
Saat ini `PiketView.tsx` (1.512 baris) memiliki state tab:
```ts
const [activeTab, setActiveTab] = useState<'beranda' | 'lapor' | 'penugasan' | 'rekap'>('beranda');
```
1. **Tab `beranda`**:
   - Menampilkan jadwal piket harian (Senin – Sabtu) dewan guru dan siswa.
   - Menampilkan 10 laporan piket terbaru (`laporan_piket`), status persetujuan, dan tombol aksi Admin (Setujui / Tolak).
2. **Tab `penugasan` (Admin Only)**:
   - Penugasan guru dan siswa per hari piket ke tabel `penugasan_piket`.
   - Sinkronisasi otomatis ke `jadwal_piket` untuk kompatibilitas workflow harian guru.
3. **Tab `lapor` (Guru Piket Bertugas)**:
   - Input laporan piket harian dengan rekap absensi per kelas (H/S/I/A manual).
   - Input catatan khusus & pengambilan foto dokumentasi lanskap via `CameraSelfieCapture`.
4. **Tab `rekap`**:
   - Riwayat rekapitulasi laporan bulanan, filter pencarian, export CSV, dan cetak laporan.

### 3.2 Integrasi UI Scan Presensi Siswa di `PiketView.tsx`
Untuk mengintegrasikan fitur scan:
1. **Perluasan State Tab**:
   ```ts
   const [activeTab, setActiveTab] = useState<'beranda' | 'scan' | 'lapor' | 'penugasan' | 'rekap'>('beranda');
   ```
2. **Navigasi Tab Scan**:
   Tambahkan tombol tab baru pada deretan tab navigation (dapat diakses oleh Guru Piket maupun Admin):
   ```tsx
   <button 
     type="button"
     onClick={() => setActiveTab('scan')} 
     className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
       activeTab === 'scan' ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold dark:bg-teal-900/30' : 'bg-gray-50 text-gray-700'
     }`}
   >
     <i className="fa-solid fa-qrcode mr-1.5 text-teal-600"></i> Scan Presensi Siswa
   </button>
   ```
3. **Struktur Tab `scan`**:
   - **Mode Selector (Datang vs Pulang)**:
     Toggle status presensi: `Datang` (default pagi, jam 06.00-11.00) dan `Pulang` (default siang, jam >11.00).
   - **Mode Input 1: Hardware USB HID Scanner (Utama & Tercepat)**:
     - Input field `<input ref={scannerInputRef} autoFocus ... />` dengan event `onKeyDown` mendeteksi tombol Enter.
     - Auto-refocus listener: Setiap kali window diklik atau blur, fokus otomatis dikembalikan ke input scanner.
     - Scanner fisik bertindak layaknya keyboard cepat: mengetik NISN/QR lalu mengirimkan Enter (char 13).
     - Pada Enter: Eksekusi pencarian siswa, simpan ke `presensi_siswa`, bersihkan input, beri feedback audio/visual.
   - **Mode Input 2: Kamera Browser (Web API)**:
     - Toggle buka kamera langsung di halaman.
     - Stream video menggunakan `navigator.mediaDevices.getUserMedia`.
     - Frame scanning menggunakan Web API standar `window.BarcodeDetector` (didukung native di Chrome, Edge, Chromium Android).
     - Throttle guard (cooldown 1,5 detik) agar tidak terjadi scan beruntun saat kartu masih di depan lensa.
   - **Feedback Audio & Visual Instan**:
     - Audio beep via Web Audio API (`new AudioContext()`): Frekuensi tinggi (880 Hz) untuk sukses, frekuensi rendah (220 Hz) untuk peringatan/duplikat. Tidak butuh file mp3 eksternal.
     - Kartu banner pop-up beranimasi: Nama Siswa, Kelas, NISN, Jam Presensi (WITA), dan Status (Datang/Pulang).
   - **Tabel Feed Presensi Hari Ini (Live Stream)**:
     - Daftar 20-50 siswa terakhir yang baru saja di-scan hari ini.
     - Ringkasan total kehadiran: Total Datang, Total Pulang.

---

## 4. Arsitektur Operasional Multi-Scanner Hingga 10 Unit Bersamaan (Pertanyaan 3)

Kebutuhan: *"Maksimal 10 scanner eksternal dapat digunakan bersamaan (masing-masing buka tab/window halaman scan yang sama)."*

### 4.1 Isolasi Input Hardware
- Scanner USB HID bersifat plug-and-play sebagai input keyboard pada sistem operasi host.
- Jika sekolah memasang 2 hingga 10 scanner pada laptop/PC/tablet berbeda di gerbang sekolah (atau multi-window/tab):
  Masing-masing jendela browser mengontrol elemen input aktifnya sendiri secara independen. Tidak ada konflik hardware atau interferensi antar scanner.

### 4.2 Standalone / Kiosk Window Support
- Sediakan tombol **"Buka Jendela Kiosk / Fullscreen"** (`window.open('?view=view-piket&tab=scan', '_blank')`).
- Di `AppScreen.tsx` dan `PiketView.tsx`, baca parameter URL `tab`:
  Jika terdapat parameter `?view=view-piket&tab=scan`, langsung aktifkan tab scan secara otomatis.

### 4.3 Penanganan Konkurensi & Anti-Race Condition di Database
- **Kendala yang Mungkin Muncul**: Dua scanner di gerbang berbeda melakukan scan pada siswa yang sama secara hampir bersamaan, atau siswa men-tap kartunya dua kali dalam 1 detik.
- **Solusi Skema**:
  Gunakan UNIQUE constraint pada level database PostgreSQL:
  ```sql
  CONSTRAINT uq_presensi_siswa_status UNIQUE (sekolah_id, tanggal, siswa_id, status)
  ```
- **Penanganan Query di Frontend**:
  Gunakan `upsert`:
  ```ts
  const { data, error } = await supabase
    .from('presensi_siswa')
    .upsert({
      sekolah_id: user.sekolah_id,
      siswa_id: student.id,
      nisn: student.nisn,
      nama_siswa: student.nama_siswa,
      kelas: student.kelas,
      tanggal: todayDateStr,
      status: scanMode, // 'datang' | 'pulang'
      jam: currentJamStr,
      timestamp: new Date().toISOString(),
      petugas_id: user.id,
      petugas_nama: user.nama,
      device_id: deviceLabel // misal 'Scanner Gerbang 1'
    }, {
      onConflict: 'sekolah_id,tanggal,siswa_id,status',
      ignoreDuplicates: true
    });
  ```
  Jika siswa sudah pernah tercatat pada status tersebut hari ini, sistem memberi notifikasi ramah: *"Siswa sudah melakukan presensi Datang pukul 06:45 WITA"*, memutar suara peringatan, dan tidak menimbulkan error SQL atau data ganda.

### 4.4 Sinkronisasi Real-Time Antar Jendela (Supabase Realtime)
- Seluruh jendela scan (hingga 10 unit) dan dashboard Piket berlangganan ke kanal realtime Supabase:
  ```ts
  const channel = supabase
    .channel(`realtime-presensi-siswa-${user.sekolah_id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'presensi_siswa' }, (payload) => {
      // Tambahkan siswa baru ke tabel live feed tanpa reload
      setLiveScans(prev => [payload.new, ...prev.slice(0, 49)]);
      incrementSummaryCount(payload.new.status);
    })
    .subscribe();
  ```
- Setiap kali salah satu pos gerbang men-scan siswa, seluruh pos lain dan guru piket yang memantau langsung melihat data ter-update secara instan.

---

## 5. Desain Skema Migrasi Tabel `presensi_siswa` (Pertanyaan 4)

### 5.1 Status Eksisting
- Tabel `presensi_siswa` **belum ada** di Supabase maupun file migrasi.
- Tabel `absensi` saat ini hanya digunakan untuk rekap status harian kelas (Hadir, Izin, Sakit, Alpa).
- Oleh karena itu, tabel khusus `presensi_siswa` harus dibuat melalui migrasi SQL Supabase.

### 5.2 Desain Lengkap SQL Migration (`20261004_create_presensi_siswa.sql`)
```sql
-- ==============================================================================
-- Migration: 20261004_create_presensi_siswa.sql
-- Description: Create public.presensi_siswa table and add qr_code to data_siswa
-- ==============================================================================

-- 1. Tambah kolom qr_code pada data_siswa
ALTER TABLE public.data_siswa 
  ADD COLUMN IF NOT EXISTS qr_code TEXT;

CREATE INDEX IF NOT EXISTS idx_data_siswa_qr_code 
  ON public.data_siswa(qr_code);

-- Update data siswa yang sudah ada agar memiliki qr_code default dari nisn/id
UPDATE public.data_siswa 
SET qr_code = COALESCE(NULLIF(nisn, ''), id::text) 
WHERE qr_code IS NULL;

-- 2. Buat tabel presensi_siswa
CREATE TABLE IF NOT EXISTS public.presensi_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
    siswa_id UUID NOT NULL REFERENCES public.data_siswa(id) ON DELETE CASCADE,
    nisn TEXT,
    nama_siswa TEXT NOT NULL,
    kelas TEXT NOT NULL,
    tanggal DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('datang', 'pulang')),
    jam TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    device_id TEXT DEFAULT 'Scanner-1',
    petugas_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    petugas_nama TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_presensi_siswa_status UNIQUE (sekolah_id, tanggal, siswa_id, status)
);

-- 3. Indeks performa untuk query harian, kelas, dan status
CREATE INDEX IF NOT EXISTS idx_presensi_siswa_lookup 
  ON public.presensi_siswa(sekolah_id, tanggal, status);

CREATE INDEX IF NOT EXISTS idx_presensi_siswa_kelas 
  ON public.presensi_siswa(sekolah_id, tanggal, kelas);

CREATE INDEX IF NOT EXISTS idx_presensi_siswa_siswa_id 
  ON public.presensi_siswa(siswa_id);

CREATE INDEX IF NOT EXISTS idx_presensi_siswa_timestamp 
  ON public.presensi_siswa(timestamp DESC);

-- 4. Aktifkan Row Level Security (RLS)
ALTER TABLE public.presensi_siswa ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan Multi-Tenant RLS
DO $$
BEGIN
  DROP POLICY IF EXISTS "presensi_siswa_tenant_select_policy" ON public.presensi_siswa;
  CREATE POLICY "presensi_siswa_tenant_select_policy" ON public.presensi_siswa FOR SELECT
    USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

  DROP POLICY IF EXISTS "presensi_siswa_tenant_insert_policy" ON public.presensi_siswa;
  CREATE POLICY "presensi_siswa_tenant_insert_policy" ON public.presensi_siswa FOR INSERT
    WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

  DROP POLICY IF EXISTS "presensi_siswa_tenant_update_policy" ON public.presensi_siswa;
  CREATE POLICY "presensi_siswa_tenant_update_policy" ON public.presensi_siswa FOR UPDATE
    USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true))
    WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));

  DROP POLICY IF EXISTS "presensi_siswa_tenant_delete_policy" ON public.presensi_siswa;
  CREATE POLICY "presensi_siswa_tenant_delete_policy" ON public.presensi_siswa FOR DELETE
    USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() OR (public.get_auth_user_sekolah_id() IS NULL AND true));
END $$;

-- 6. Hak Akses Tabel
GRANT ALL ON TABLE public.presensi_siswa TO anon, authenticated, service_role;
```

---

## 6. Audit Dependensi & Evaluasi Web API (Pertanyaan 5)

### 6.1 Dependensi Saat Ini di `package.json`
- Dependensi utama: `@supabase/supabase-js`, `csv-parse`, `dotenv`, `next` (16.3.4), `react` (19.2.8), `react-dom` (19.2.8), `sweetalert2`, `tsx`, `web-push`.
- **Tidak ada library QR/Barcode** seperti `qrcode`, `html5-qrcode`, `jsQR`, `@zxing/library`.

### 6.2 Evaluasi Web API Bawaan Browser
1. **Hardware USB HID Scanner**:
   - **Kebutuhan Library**: 0% (Sama sekali tidak memerlukan library eksternal).
   - Scanner USB HID bekerja murni sebagai perangkat input keyboard native. Event standard `onKeyDown` (Enter) menangkap data teks secara instan dalam hitungan milidetik.
2. **Kamera Browser (Scan Web API)**:
   - **Native Web API**: `window.BarcodeDetector` (W3C Barcode Detection API).
   - **Dukungan**: Didukung secara native di Google Chrome, Microsoft Edge, Opera, dan browser berbasis Chromium pada Android/Windows tanpa library tambahan.
   - **Contoh Implementasi**:
     ```ts
     const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
     const detectedCodes = await barcodeDetector.detect(videoElement);
     ```
   - **Fallback Browser Non-Chromium**: Jika dibuka di Safari/Firefox di mana `BarcodeDetector` belum aktif secara default, sistem dapat menampilkan badge instruksi ramah: *"Untuk scan kamera, gunakan browser Google Chrome / Microsoft Edge, atau gunakan scanner USB eksternal"*, atau jika diperkenankan, memasang utility ringan `html5-qrcode`.
3. **Generate QR Code Siswa**:
   - Untuk menampilkan QR Code siswa, kita dapat menggunakan utility generator SVG QR mandiri (pure TypeScript/JS tanpa dependensi) atau menginstal package `qrcode` (`npm install qrcode @types/qrcode`).
   - Pendekatan pure lightweight SVG generator sangat disarankan agar mematuhi prinsip *ponytail* (tanpa bloatware).

---

## 7. Integrasi Laporan ke Piket & Wali Kelas, Serta Sinkronisasi ke Guru Mapel (R3 & R4)

### 7.1 Laporan ke Modul Piket (`PiketView.tsx`)
- Tab Scan menampilkan:
  - Counter ringkasan: **Hadir Datang Hari Ini** vs **Pulang Hari Ini**.
  - Filter per kelas untuk mempermudah guru piket mengecek rombel mana yang sudah lengkap.
  - Export CSV hasil scan harian.

### 7.2 Laporan ke Wali Kelas (`RekapSiswaView.tsx`)
- Komponen `RekapSiswaView.tsx` saat ini sudah memiliki fungsionalitas wali kelas (`activeWaliKelas`).
- Penambahan: Sub-panel atau tab **"Presensi QR Gerbang Hari Ini"** yang membaca `presensi_siswa` di mana `kelas = activeWaliKelas.kelas AND tanggal = todayDateStr`.
- Wali kelas dapat langsung melihat siswa mana saja yang sudah masuk sekolah lewat gerbang piket pada jam berapa, dan siswa mana yang belum melakukan tap kartu.

### 7.3 Sinkronisasi ke Guru Mapel (`GuruJurnal.tsx`)
- Pada saat guru mapel membuka form Jurnal KBM (`GuruJurnal.tsx`) dan memilih kelas:
  Sistem membaca daftar siswa di kelas tersebut dari `data_siswa` dan secara bersamaan memverifikasi `presensi_siswa` untuk tanggal hari ini dengan status `datang`.
- Siswa yang sudah melakukan scan datang di gerbang piket secara visual ditandai dengan badge hijau *"Tiba di sekolah pk. {jam}"*, sehingga guru mapel tahu siswa tersebut sudah berada di lingkungan sekolah saat mengisi absensi KBM.

---

## 8. Rekomendasi Langkah Implementasi (Action Plan untuk Implementer)
1. **Langkah 1 (Database Migration)**: Jalankan migrasi SQL Supabase untuk menambahkan kolom `qr_code` pada `data_siswa` dan membuat tabel `presensi_siswa` lengkap dengan indeks dan RLS.
2. **Langkah 2 (Update Tipe Database)**: Tambahkan tipe TypeScript `PresensiSiswa` ke `src/types/database.ts`.
3. **Langkah 3 (Komponen Scan di `PiketView.tsx`)**: Buat sub-komponen atau view tab `scan` di `PiketView.tsx` dengan dukungan USB HID keyboard input, audio beep, dan kamera Web API.
4. **Langkah 4 (QR Code Generator di `AdminDataView.tsx`)**: Sediakan modal QR code dan opsi cetak kartu siswa di menu Master Data Siswa.
5. **Langkah 5 (Integrasi Wali Kelas di `RekapSiswaView.tsx`)**: Tambahkan tabel rekapan gerbang harian untuk wali kelas.
6. **Langkah 6 (Sinkronisasi Guru Mapel di `GuruJurnal.tsx`)**: Hubungkan status datang dari gerbang piket ke tampilan absensi KBM guru mapel.
7. **Langkah 7 (Pengujian Otomatis)**: Buat file test verifikasi komprehensif di folder `tests/` untuk memvalidasi skema, logika scan, penanganan duplikat, dan isolasi tenant.
