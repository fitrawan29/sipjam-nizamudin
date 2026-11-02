# Analisis & Pemetaan Sistem Blok Fleksibel (Target & Rentang Waktu)

**Penyusun**: explorer_survey_1 (teamwork_explorer)  
**Tanggal**: 2026-11-02  
**Repositori**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app`  

---

## 1. Executive Summary

Fitur **Sistem Blok** pada SIPJAM saat ini telah berjalan dan terverifikasi dengan baik (85 test case lulus di `tests/sistem_blok_verification.test.ts`). Namun, implementasi saat ini masih bersifat **global satu sekolah (all school)** dan **sepanjang hari penuh (full day)**. 

Berdasarkan kebutuhan produksi pada `ORIGINAL_REQUEST.md`:
1. **Target Pemblokiran Fleksibel (R1)**: Setiap aturan pemblokiran harus dapat ditargetkan ke:
   - **Keseluruhan Sekolah** (`sekolah` / `all`)
   - **Per Angkatan** (`angkatan`, misal: Angkatan X, XI, XII atau 10, 11, 12)
   - **Per Kelas** (`kelas`, misal: X Merdeka, XI IPA 1)
   - **Per Guru** (`guru`, guru tertentu yang bertugas khusus)
2. **Rentang Tanggal & Jam Fleksibel (R2)**: Mendukung rentang tanggal (`tanggal_mulai` s/d `tanggal_selesai`) dan pembatasan rentang jam (`jam_mulai` s/d `jam_selesai`). Jika rentang jam tidak dibatasi (`is_full_day: true` atau kosong), berlaku penuh sepanjang hari.
3. **Masking Jadwal & Jurnal Kegiatan (R3)**: Jadwal KBM yang terdampak pemblokiran ditandai/di-masking sebagai kegiatan blok. Guru yang terdampak dapat mengisi **Jurnal Kegiatan (Sistem Blok)**, sedangkan jadwal dan guru yang berada di luar target atau di luar jam blok tetap berjalan normal sebagai KBM reguler.

Dokumen ini menyajikan hasil eksplorasi komprehensif atas arsitektur yang ada, skema database, antarmuka pengguna (`SistemBlokView.tsx`), workflow bisnis (`workflow.ts`), dan strategi pemetaannya.

---

## 2. Analisis Implementasi Saat Ini

### 2.1 Skema Database & Migrasi SQL
- **Lokasi Migrasi Awal**: `supabase/migrations/20260927_sistem_blok_schema.sql` (Baris 6–15)
- **Tabel**: `public.sistem_blok`
- **Kolom Saat Ini**:
  ```sql
  CREATE TABLE IF NOT EXISTS public.sistem_blok (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
      nama_kegiatan TEXT NOT NULL,
      deskripsi TEXT DEFAULT NULL,
      tanggal_mulai DATE NOT NULL,
      tanggal_selesai DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ```
- **Kondisi Kolom Live DB**:
  Telah diverifikasi via live query bahwa tabel `sistem_blok` saat ini hanya memiliki kolom di atas (`id`, `sekolah_id`, `nama_kegiatan`, `deskripsi`, `tanggal_mulai`, `tanggal_selesai`, `created_at`, `updated_at`). Belum ada kolom untuk tipe target maupun rentang jam.
- **Penyimpanan**: 100% tersimpan di Supabase PostgreSQL. Tidak menggunakan `localStorage` atau mock memory statis.

### 2.2 Tipe Data TypeScript
- **Lokasi**: `src/types/database.ts` (Baris 1411–1441, 1972–1974)
- **Definisi Saat Ini**:
  ```typescript
  sistem_blok: {
    Row: {
      created_at: string
      deskripsi: string | null
      id: string
      nama_kegiatan: string
      sekolah_id: string
      tanggal_mulai: string
      tanggal_selesai: string
      updated_at: string
    }
    Insert: { ... }
    Update: { ... }
  }
  export type SistemBlok = Tables<"sistem_blok">;
  export type SistemBlokInsert = TablesInsert<"sistem_blok">;
  export type SistemBlokUpdate = TablesUpdate<"sistem_blok">;
  ```

### 2.3 Antarmuka UI Konfigurasi
- **Komponen Utama**: `src/components/SistemBlokView.tsx` (706 baris)
- **Akses & Routing**:
  - `src/components/AppScreen.tsx` (Baris 1243–1246): Merender `<SistemBlokView user={user} />` secara langsung ketika rute `currentView === 'view-sistem-blok'`.
  - `src/components/AdminDataView.tsx` (Baris 102, 2049–2053): Tab `sistem_blok` atau `blok` di dalam *Master Data & Kalender* langsung merender `<SistemBlokView user={user} />`.
- **Form State Tambah Saat Ini**:
  - `namaKegiatan`: string
  - `tanggalMulai`: string (input type="date")
  - `tanggalSelesai`: string (input type="date")
  - `deskripsi`: string (textarea)
- **Form State Edit Saat Ini**:
  - `editingItem`, `editNama`, `editMulai`, `editSelesai`, `editDeskripsi`
- **Role Guard**: Hanya role `Admin` atau `Superadmin` yang diizinkan menambah, mengubah, atau menghapus data (`isAdmin = isMasterDataModificationAllowed(user?.role)`).

### 2.4 Logika Workflow & Masking Jadwal
- **Lokasi**: `src/lib/workflow.ts`
  - `getActiveSistemBlok(dateStr, sekolahId)` (Baris 69–92):
    Melakukan query:
    ```typescript
    supabase.from('sistem_blok')
      .select('*')
      .lte('tanggal_mulai', targetDate)
      .gte('tanggal_selesai', targetDate)
    ```
    Mengembalikan entitas aturan blok pertama (`data[0]`).
  - `getGuruDailyState(namaGuru, username, userId, sekolahId)` (Baris 244–256):
    Memanggil `getActiveSistemBlok(todayStr, sekolahId)`. Jika ada data aktif, menetapkan `state.isBlok = true` dan `state.blokInfo = { id, nama_kegiatan, deskripsi, tanggal_mulai, tanggal_selesai }`.
- **Tampilan Jadwal di Guru**:
  - `src/components/HomeViewGuru.tsx` (Baris 803, 849–912):
    Ketika `dailyState?.isBlok === true`, seluruh daftar jadwal KBM disembunyikan dan digantikan banner *"Sistem Blok Aktif — KBM Reguler Ditiadakan"*.
- **Tampilan Jurnal Guru**:
  - `src/components/GuruJurnal.tsx` (Baris 510–515, 600–605):
    Ketika `dailyState.isBlok === true`, form otomatis beralih ke tipe `Jurnal Kegiatan` dan auto-fill materi dengan nama kegiatan sistem blok.

---

## 3. Pemetaan Atribut & Antarmuka Baru yang Dibutuhkan

Untuk memenuhi seluruh kriteria R1, R2, dan R3 tanpa merusak backward compatibility dengan 85 test case yang sudah ada, berikut spesifikasi atribut dan tipe data yang dibutuhkan:

### 3.1 Atribut Data pada Tabel `public.sistem_blok`

| Nama Kolom | Tipe SQL | Nullable | Nilai Default | Keterangan & Aturan Nilai |
|---|---|---|---|---|
| `tipe_target` | `TEXT` | NOT NULL | `'sekolah'` | Salah satu dari: `'sekolah'`, `'angkatan'`, `'kelas'`, `'guru'` |
| `target_angkatan` | `TEXT` | Ya | `NULL` | Berisi tingkat/angkatan target (misal: `'X'`, `'XI'`, `'XII'` atau `'10'`, `'11'`, `'12'`, `'7'`, `'8'`, `'9'`) |
| `target_kelas` | `TEXT` | Ya | `NULL` | Berisi string kelas target yang cocok dengan `data_siswa.kelas` dan `jadwal_pelajaran.kelas` (misal: `'X Merdeka'`) |
| `target_guru_id` | `TEXT` | Ya | `NULL` | Berisi UUID / ID guru dari `data_guru.id` atau `data_guru.user_id` |
| `target_guru_nama` | `TEXT` | Ya | `NULL` | Berisi nama lengkap guru dari `data_guru.nama_guru` untuk keperluan display dan pencocokan nama di `jadwal_pelajaran.nama_guru` |
| `is_full_day` | `BOOLEAN` | NOT NULL | `true` | `true` = pemblokiran berlaku penuh sepanjang hari; `false` = pemblokiran dibatasi rentang jam tertentu |
| `jam_mulai` | `TEXT` | Ya | `NULL` | Format string waktu `HH:mm` (misal: `'07:30'`) jika `is_full_day === false` |
| `jam_selesai` | `TEXT` | Ya | `NULL` | Format string waktu `HH:mm` (misal: `'10:00'`) jika `is_full_day === false` |

### 3.2 SQL Migration Script
File migrasi baru yang perlu dibuat: `supabase/migrations/20261102_sistem_blok_flexible_targets_and_hours.sql`
```sql
-- Migration: Add flexible target scope and hour range to public.sistem_blok
ALTER TABLE public.sistem_blok
  ADD COLUMN IF NOT EXISTS tipe_target TEXT NOT NULL DEFAULT 'sekolah',
  ADD COLUMN IF NOT EXISTS target_angkatan TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_kelas TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_guru_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_guru_nama TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_full_day BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS jam_mulai TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS jam_selesai TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_sistem_blok_tipe_target ON public.sistem_blok(tipe_target);
```

### 3.3 Penyesuaian Antarmuka TypeScript (`src/types/database.ts`)
```typescript
export interface SistemBlok {
  id: string;
  sekolah_id: string;
  nama_kegiatan: string;
  deskripsi: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  created_at: string;
  updated_at: string;
  // Field baru fleksibilitas
  tipe_target?: 'sekolah' | 'angkatan' | 'kelas' | 'guru' | string | null;
  target_angkatan?: string | null;
  target_kelas?: string | null;
  target_guru_id?: string | null;
  target_guru_nama?: string | null;
  is_full_day?: boolean | null;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
}
```

---

## 4. Logika Evaluasi Masking & Pencocokan Aturan

### 4.1 Pencocokan Angkatan (Cohort Matching)
Di database SIPJAM:
- Kelas pada `data_siswa.kelas` dan `jadwal_pelajaran.kelas` tersimpan dalam format seperti: `"X Merdeka"`, `"XI Merdeka"`, `"XII Merdeka"`, `"10-A"`, `"7B"`, dsb.
- Berdasarkan logika cohort di `src/components/NaikKelasModal.tsx` (Baris 25–57):
  ```typescript
  export function matchesAngkatan(kelasName: string, targetAngkatan: string): boolean {
    if (!kelasName || !targetAngkatan) return false;
    const k = kelasName.trim().toLowerCase();
    const t = targetAngkatan.trim().toLowerCase();

    // Direct match (e.g. target "X Merdeka" or same string)
    if (k === t) return true;

    // Tingkat SMA/SMK (X, XI, XII atau 10, 11, 12)
    if (t === 'xii' || t === '12') return /\bxii\b/i.test(k) || /\b12\b/.test(k);
    if (t === 'xi' || t === '11') return /\bxi\b/i.test(k) || /\b11\b/.test(k);
    if (t === 'x' || t === '10') return (/\bx\b/i.test(k) || /\b10\b/.test(k)) && !/\bxi\b/i.test(k) && !/\bxii\b/i.test(k);

    // Tingkat SMP (VII, VIII, IX atau 7, 8, 9)
    if (t === 'ix' || t === '9') return /\bix\b/i.test(k) || /\b9\b/.test(k);
    if (t === 'viii' || t === '8') return /\bviii\b/i.test(k) || /\b8\b/.test(k);
    if (t === 'vii' || t === '7') return (/\bvii\b/i.test(k) || /\b7\b/.test(k)) && !/\bviii\b/i.test(k);

    // General prefix / token match
    return k.startsWith(t + ' ') || k.startsWith(t + '-') || k.startsWith(t + '.');
  }
  ```

### 4.2 Pencocokan Guru (Teacher Matching)
Nama guru di `jadwal_pelajaran.nama_guru` sering kali berupa nama panggilan pendek (misal: `"Ade"` untuk `"Ade Fitrawan Ibrahim"`, atau `"Rohani"` untuk `"Rohani Samalam"`).
- Pencocokan guru harus memverifikasi:
  1. `jadwal.user_id === rule.target_guru_id`
  2. Atau nama guru cocok dengan `findJadwalForGuru` / fuzzy matching yang sudah ada di `src/lib/workflow.ts` (Baris 117–160).

### 4.3 Pencocokan Rentang Jam (Time Overlap Matching)
Untuk jadwal KBM dengan `[s_mulai, s_selesai]` dan aturan blok dengan `[b_mulai, b_selesai]`:
- Jika aturan blok adalah `is_full_day === true` (atau `jam_mulai` & `jam_selesai` null/kosong):
  -> **Overlap = True** (berlaku penuh sepanjang hari).
- Jika aturan blok memiliki jam tertentu (`jam_mulai` & `jam_selesai` terisi):
  - Jika jadwal KBM memiliki `jam_mulai` dan `jam_selesai`:
    -> Overlap terjadi jika dan hanya jika:
    $$\text{s\_mulai} < \text{b\_selesai} \quad \text{DAN} \quad \text{s\_selesai} > \text{b\_mulai}$$
  - Contoh kasus:
    - Blok: 08:00 – 10:00
    - Jadwal 1: 07:30 – 09:00 -> $07:30 < 10:00$ dan $09:00 > 08:00$ -> **Overlap (Masked)**
    - Jadwal 2: 10:00 – 11:30 -> $10:00 < 10:00$ (False) -> **Tidak Terkena Blok (Normal)**
    - Jadwal 3: 08:30 – 09:30 -> **Overlap (Masked)**
  - Jika jadwal KBM belum memiliki jam terisi (`jam_mulai === null`):
    - Apabila aturan blok dibatasi jam spesifik, jadwal yang tidak memiliki jam spesifik dapat dianggap di luar jam blok atau memerlukan jam terisi agar tidak false-positive. Rekomendasi: jadwal tanpa jam hanya di-masking jika aturan blok adalah `is_full_day`.

---

## 5. Rencana Arsitektur Antarmuka `SistemBlokView.tsx`

### 5.1 Opsi Target Pemblokiran (Selector UI)
Tambahkan selector target yang ergonomis pada form tambah & modal edit:
1. **Pilihan Segmented / Radio**:
   - 🏫 **Keseluruhan Sekolah** (`sekolah`)
   - 🎓 **Per Angkatan** (`angkatan`)
   - 👥 **Per Kelas** (`kelas`)
   - 👨‍🏫 **Per Guru** (`guru`)
2. **Dynamic Dependent Input**:
   - Jika `tipeTarget === 'angkatan'`:
     Tampilkan `<select>` pilihan angkatan yang dideteksi otomatis dari kelas yang ada (misal: `'X'`, `'XI'`, `'XII'`) plus input teks bebas bila ada penamaan kustom.
   - Jika `tipeTarget === 'kelas'`:
     Tampilkan `<select>` pilihan kelas yang di-load dari daftar unik kelas di `data_siswa` (misal: `'X Merdeka'`, `'XI Merdeka'`, `'XII Merdeka'`).
   - Jika `tipeTarget === 'guru'`:
     Tampilkan `<select>` pilihan guru yang di-load dari tabel `data_guru` (menampilkan nama lengkap dan NIP/kode).

### 5.2 Rentang Hari & Jam (Time & Date Pickers)
1. **Tanggal Mulai & Tanggal Selesai**:
   Tetap menggunakan `<input type="date">` dengan validasi `tanggalSelesai >= tanggalMulai`.
2. **Checkbox Opsi "Berlaku Penuh Sepanjang Hari (Full Day)"**:
   - Checkbox default: `true` (checked).
   - Label: *"Berlaku Sepanjang Hari (Full Day)"*.
3. **Jam Mulai & Jam Selesai**:
   - Ditampilkan hanya jika checkbox *Full Day* tidak dicentang (`!isFullDay`).
   - `<input type="time">` untuk `jamMulai` dan `jamSelesai`.
   - Validasi saat submit: Jika bukan full day, `jamMulai` dan `jamSelesai` wajib diisi dan `jamSelesai > jamMulai`.

### 5.3 Tampilan Kartu & Tabel Daftar Blok
1. **Badge Target**:
   - Keseluruhan: Badge hijau/abu-abu `"Semua Siswa & Guru"`.
   - Angkatan: Badge ungu `"Angkatan: [X]"`.
   - Kelas: Badge biru `"Kelas: [X Merdeka]"`.
   - Guru: Badge kuning/oranye `"Guru: [Nama Guru]"`.
2. **Badge Waktu**:
   - Full day: `"Sepanjang Hari"`.
   - Jam tertentu: `"[jam_mulai] - [jam_selesai] WITA"`.
3. **Filter**:
   - Filter Status: `Semua`, `Aktif`, `Akan Datang`, `Selesai`.
   - Filter Target: `Semua Target`, `Sekolah`, `Angkatan`, `Kelas`, `Guru`.

---

## 6. Dampak Terhadap Integrasi Jadwal & Jurnal (R3)

### 6.1 Status Harian Guru (`getGuruDailyState`)
Di `src/lib/workflow.ts`:
- Fungsi `getActiveSistemBlokRules(dateStr, sekolahId)` mengambil seluruh aturan blok yang aktif pada tanggal tersebut (bisa lebih dari satu aturan berbeda untuk kelas/guru/angkatan berbeda).
- Lakukan iterasi pada setiap jadwal KBM guru hari ini (`state.jadwalKBM`):
  - Cek apakah jadwal tersebut terkena salah satu aturan blok aktif (berdasarkan kelas jadwal, angkatan jadwal, nama guru jadwal, dan jam jadwal).
  - Jika jadwal terkena blok:
    - Beri tanda pada objek jadwal: `schedule.isBlocked = true`, `schedule.blokInfo = matchingRule`.
- Evaluasi state guru:
  - Jika **semua jadwal KBM guru terblokir** (atau target blok adalah seluruh sekolah atau guru itu sendiri):
    - `state.isBlok = true`
    - `state.blokInfo = primaryRule`
    - Guru dibebaskan dari KBM reguler dan hanya wajib mengisi **1 Jurnal Kegiatan**.
  - Jika **sebagian jadwal KBM guru terblokir**:
    - `state.isBlok = false` (karena masih ada KBM reguler yang harus diajar).
    - `state.hasPartialBlok = true`
    - `state.blockedSchedulesCount = N`
    - Guru mengisi **Jurnal KBM** untuk jadwal yang aktif normal, DAN diperbolehkan/dapat mengisi **Jurnal Kegiatan** untuk jam kegiatan blok.
  - Jika **tidak ada jadwal guru yang terblokir**:
    - `state.isBlok = false`
    - KBM berjalan 100% normal tanpa terpengaruh sistem blok.

### 6.2 Tampilan Jadwal di `HomeViewGuru.tsx`
- Jika `dailyState.isBlok === true`: Tampilkan banner blok penuh (perilaku yang ada saat ini).
- Jika `dailyState.hasPartialBlok === true`:
  - Tampilkan list jadwal KBM.
  - Jadwal yang terkena blok diberi badge khusus `"Sistem Blok: [Nama Kegiatan]"` dengan visual amber/emas dan tombol cepat *"Isi Jurnal Kegiatan"*.
  - Jadwal normal ditampilkan biasa dengan tombol *"Isi Jurnal KBM"*.

---

## 7. Rencana Perluasan Test Suite (`tests/sistem_blok_verification.test.ts`)

Test suite yang ada (`tests/sistem_blok_verification.test.ts`) memiliki 85 assertion dan lulus 100%. Untuk verifikasi otomatis menyeluruh (Acceptance Criteria R1, R2, R3), test suite akan diperluas dengan pengujian skenario baru:
1. **CRUD Target Sekolah**: Simpan & baca aturan dengan `tipe_target: 'sekolah'`.
2. **CRUD Target Angkatan**: Simpan & baca aturan dengan `tipe_target: 'angkatan'`, `target_angkatan: 'X'`.
3. **CRUD Target Kelas**: Simpan & baca aturan dengan `tipe_target: 'kelas'`, `target_kelas: 'X Merdeka'`.
4. **CRUD Target Guru**: Simpan & baca aturan dengan `tipe_target: 'guru'`, `target_guru_nama: 'Fitrawan'`.
5. **CRUD Rentang Jam**: Simpan & baca aturan dengan `is_full_day: false`, `jam_mulai: '08:00'`, `jam_selesai: '10:00'`.
6. **Masking Jadwal Terarah**:
   - Jadwal kelas 'X Merdeka' ter-masking saat ada blok Angkatan X.
   - Jadwal kelas 'XI Merdeka' tidak ter-masking dan berjalan normal.
7. **Masking Rentang Jam**:
   - Jadwal jam 08:30 – 09:30 ter-masking saat blok 08:00 – 10:00 aktif.
   - Jadwal jam 10:30 – 12:00 tidak ter-masking dan berjalan normal.
8. **Jurnal Guru Terdampak**: Guru terdampak dapat mengakses dan mengisi Jurnal Kegiatan.
