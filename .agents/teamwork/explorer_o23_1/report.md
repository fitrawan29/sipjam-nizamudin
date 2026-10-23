# Laporan Investigasi Komprehensif: Arsitektur RBAC `dinas_pendidikan`, Autentikasi, Manajemen Superadmin, dan Isolasi Read-Only

**Peneliti**: Explorer Agent 1 (Auth, User Management, RBAC & Superadmin)  
**Tanggal**: 2026-10-23  
**Status**: Investigasi Lengkap & Terverifikasi  
**Target Aplikasi**: SIPJAM (Next.js 16.3.4 + Supabase + Tailwind CSS / Claymorphism)  

---

## Ringkasan Eksekutif

Investigasi mendalam telah dilakukan terhadap seluruh alur autentikasi, model pengguna, hierarki hak akses (RBAC), komponen manajemen Superadmin, skema database Supabase, dan mekanisme isolasi multi-tenant di codebase SIPJAM.

Temuan utama:
1. **Model Pengguna & Tipe Role**: Antarmuka pengguna dideklarasikan di `src/types/user.ts` (`AppUser`) dan di `src/types/database.ts` (`User = Tables<"users">`). Role yang saat ini ada adalah `'superadmin'`, `'admin'`, dan `'guru'`. Belum ada role `'dinas_pendidikan'`.
2. **Alur Login & Navigasi**: Login ditangani oleh `src/components/LoginScreen.tsx` menggunakan PostgreSQL RPC `verify_login` (`SECURITY DEFINER`). Sesi disimpan di `localStorage` dengan key `sipjam_user` dan divalidasi ke database secara berkala di `src/app/page.tsx` dan `src/hooks/useSessionSync.ts`. Navigasi dan perutean view diatur di `src/components/AppScreen.tsx`.
3. **Manajemen Sekolah & Wilayah**: Superadmin mengelola jaringan sekolah satelit melalui `src/components/SuperadminView.tsx` yang tersinkronisasi ke tabel `public.sekolah_registry` dan `public.sekolah`. Kolom `kota_kabupaten` **sudah tersedia** di kedua tabel tersebut sebagai kolom bawaan.
4. **Penugasan Wilayah Akun Dinas**: Tabel `public.users` belum memiliki kolom `kota_kabupaten`, dan `SuperadminView.tsx` belum memiliki antarmuka manajemen pengguna dinas. Solusi terbaik adalah menambahkan kolom `kota_kabupaten TEXT` pada `public.users` dan menyediakan tab/panel "Akun Dinas Pendidikan" di `SuperadminView.tsx`.
5. **Isolasi Read-Only**: Isolasi ketat dapat ditegakkan menggunakan strategi **5-Layer Defense-in-Depth** (UI Routing, Component Disable, Scoped Switcher Validation, HTTP Fetch Interceptor Guard, dan PostgreSQL RLS).

---

## 1. Deklarasi `UserRole` dan `User` Interface

### 1.1 Lokasi Deklarasi di Codebase

| Lokasi Berkas | Simbol / Antarmuka | Deskripsi & Isi |
|---|---|---|
| `src/types/user.ts:1-14` | `interface AppUser` | Antarmuka pengguna runtime utama yang dipakai di seluruh komponen React, modals, dan context: <br>`id: string`, `username: string`, `nama: string`, `role: string`, `sekolah_id: string`, `session_token: string`, `avatar?: string \| null`, `wali_kelas?: any`, `nip?: string`, `penugasan?: any`, `[key: string]: any` |
| `src/types/database.ts:2041` | `type User = Tables<"users">` | Representasi skema database Supabase tabel `public.users`. Row type (`database.ts:1639-1649`) memuat: `id`, `username`, `password`, `nama`, `role`, `sekolah_id`, `session_token`, `avatar`. |
| `src/components/AIAssistant/knowledgeBase.ts:7` | `type UserRole` | Dideklarasikan khusus untuk bot FAQ: `export type UserRole = 'guru' \| 'admin' \| 'all';` |
| `src/lib/supabaseClient.ts:15-20` | `interface TenantContext` | Konteks multi-tenant: `{ sessionToken?, sekolahId?, role?, userId? }`. |
| `supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql:47` | Constraint Database `users.role` | `role TEXT NOT NULL CHECK (role IN ('Superadmin', 'Admin', 'Guru', 'Piket', 'Wali Kelas'))` |

### 1.2 Pola Pengecekan Role di Codebase
Pengecekan role di komponen React konsisten menggunakan normalisasi string (huruf kecil dan spasi dihilangkan):
```typescript
// Contoh di AppScreen.tsx:73-74
const isSuperadmin = (baseUser?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
const isAdmin = isSuperadmin || (baseUser?.role || '').toLowerCase() === 'admin';
```

### 1.3 Rekomendasi Pembaruan Tipe untuk `dinas_pendidikan`
Di `src/types/user.ts`:
```typescript
export type UserRole = 'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan' | string;

export interface AppUser {
  id: string;
  username: string;
  nama: string;
  role: UserRole;
  sekolah_id: string | null;
  session_token: string;
  avatar?: string | null;
  wali_kelas?: string | { kelas: string } | null;
  nip?: string;
  name?: string;
  penugasan?: any;
  kota_kabupaten?: string | null; // <-- Daerah binaan penugasan dinas pendidikan
  [key: string]: any;
}
```

Di `src/types/database.ts`:
Tambahkan `kota_kabupaten: string | null` pada `users.Row`, `users.Insert`, dan `users.Update`.

Di `src/lib/supabaseClient.ts`:
Tambahkan `kotaKabupaten?: string | null;` pada `interface TenantContext`.

---

## 2. Alur Autentikasi, Login, Sesi, dan Pengalihan (Redirect)

### 2.1 Alur Login (`src/components/LoginScreen.tsx`)
1. User menginput `username` dan `password`.
2. Memanggil RPC Supabase:
   ```typescript
   // src/components/LoginScreen.tsx:19-22
   const { data: rpcData, error: rpcError } = await supabase.rpc('verify_login', {
     p_username: username.trim(),
     p_password: password
   });
   ```
3. RPC PostgreSQL `verify_login` (didefinisikan di `supabase/migrations/20261002_sekolah_nonaktif_login_block.sql`):
   - Bersifat `SECURITY DEFINER` (melewati RLS secara aman tanpa kebocoran data).
   - Memeriksa username (case-insensitive & spasi diabaikan).
   - Memverifikasi hash password bcrypt (`extensions.crypt(p_password, u.password)`).
   - Melakukan rotasi token sesi: `session_token = gen_random_uuid()`.
   - Mengembalikan kolom: `id, username, nama, role, sekolah_id, session_token, avatar`.
   - **Catatan Penting**: Terdapat guard sekolah nonaktif di baris 43:
     `IF lower(replace(v_user.role, ' ', '')) != 'superadmin' AND v_user.sekolah_status = 'nonaktif' THEN RAISE EXCEPTION 'Sekolah nonaktif'; END IF;`
     Untuk role `dinas_pendidikan`, nilai `sekolah_id` adalah `NULL`, sehingga `v_user.sekolah_status` bernilai `NULL` (tidak diblokir). Namun, untuk keamanan maksimal, RPC sebaiknya diperbarui menjadi:
     `IF lower(replace(v_user.role, ' ', '')) NOT IN ('superadmin', 'dinas_pendidikan') AND v_user.sekolah_status = 'nonaktif' THEN ...`
     Serta menambahkan kolom `kota_kabupaten` pada kolom yang di-return oleh RPC `verify_login`.

### 2.2 Penyimpanan Sesi & Sinkronisasi
1. **Penyimpanan Lokal**:
   - `src/app/page.tsx:165`: `localStorage.setItem('sipjam_user', JSON.stringify(userData))`.
2. **Validasi Sesi Saat Boot / Refresh**:
   - `src/app/page.tsx:23-74` (`validateSessionWithDb`):
     Mengambil data pengguna terbaru dari `masterSupabase.from('users')`.
     Jika `dbUser.session_token !== storedUserObj.session_token`, sesi dihapus (`clearAllClientSessionState()`).
   - Query pemilihan kolom di `page.tsx:27`:
     `.select('id, username, nama, role, sekolah_id, session_token, avatar')`
     -> Wajib ditambahkan `kota_kabupaten`.
3. **Heartbeat & Resepsi Idle**:
   - `src/hooks/useSessionSync.ts:36-40`:
     Saat tab kembali aktif setelah idle (>30 detik), memvalidasi kembali token sesi ke tabel `users`.
     Query pemilihan kolom di `useSessionSync.ts:38`:
     `.select('id, username, nama, role, sekolah_id, session_token, avatar')`
     -> Wajib ditambahkan `kota_kabupaten`.

### 2.3 Pengalihan Navigasi Berdasarkan Role (`src/components/AppScreen.tsx`)
Di `AppScreen.tsx`, penentuan tampilan awal (`currentView`) dan perutean internal bekerja sebagai berikut:
1. **Deteksi Role**:
   ```typescript
   const isSuperadmin = (baseUser?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
   const isAdmin = isSuperadmin || (baseUser?.role || '').toLowerCase() === 'admin';
   const isDinas = (baseUser?.role || '').toLowerCase().replace(/\s+/g, '') === 'dinas_pendidikan';
   ```
2. **Inisialisasi `currentView`** (baris 153-160):
   ```typescript
   const [currentView, setCurrentView] = useState(() => {
     if (typeof window !== 'undefined') {
       const params = new URLSearchParams(window.location.search);
       const view = params.get('view');
       if (view) return view;
     }
     if (isSuperadmin) return 'view-superadmin-overview';
     if (isDinas) return 'view-dinas-monitoring'; // <-- Langsung redirect ke dashboard dinas
     return 'view-home';
   });
   ```
3. **Popstate Listener & Default Home** (baris 170 & 515):
   ```typescript
   const defaultHomeView = isSuperadmin ? 'view-superadmin-overview' : (isDinas ? 'view-dinas-monitoring' : 'view-home');
   ```
4. **Sidebar Menu Khusus Dinas** (`menuItemsDinas`):
   ```typescript
   const menuItemsDinas = [
     { id: 'view-dinas-monitoring', icon: 'fa-building-columns', label: 'Monitoring Wilayah' },
     ...(activeTargetSchool ? [
       { id: 'view-admin-rekap', icon: 'fa-file-invoice', label: `Rekap Presensi (${activeTargetSchool.nama})` },
       { id: 'view-rekap-siswa', icon: 'fa-users-viewfinder', label: `Presensi Siswa (${activeTargetSchool.nama})` },
       { id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: `Jurnal Kelas (${activeTargetSchool.nama})` }
     ] : [])
   ];
   ```
5. **Guard Navigasi di `handleNavigation`** (baris 303-440):
   Jika `isDinas` mencoba membuka view mutasi data (`view-admin-data`, `view-admin-config`, `view-admin-backup`, `view-admin-verif`, `view-sistem-blok`, `view-guru-presensi`, dll.), navigasi langsung ditolak dan dimunculkan peringatan SweetAlert.

---

## 3. Manajemen Sekolah & Pengguna oleh Superadmin

### 3.1 Manajemen Sekolah Satelit (`SuperadminView.tsx`)
Superadmin mengelola jaringan sekolah satelit melalui antarmuka visual terpusat:
- **Tabel Sumber Data**:
  1. `public.sekolah_registry` (tabel master jaringan portal multi-sekolah, didefinisikan di `20261013_portal_induk_jaringan_multi_sekolah.sql`).
  2. `public.sekolah` (tabel tenant institusi lokal, didefinisikan di `20260912_multi_tenant_sekolah_rls.sql`).
- **Operasi CRUD Sekolah Satelit**:
  - *Tambah Sekolah*: `handleOpenAddSatelliteSchoolModal` (`SuperadminView.tsx:336-520`) menggunakan Swal form, menyimpan ke `sekolah_registry` dan melakukan fallback/sync ke `sekolah`.
  - *Edit Sekolah*: `handleEditSatelliteSchool` (`SuperadminView.tsx:521-681`).
  - *Hapus Sekolah*: `handleDeleteSatelliteSchool` (`SuperadminView.tsx:682-789`).
  - *Target Scope Switcher*: `handleSelectTargetSchool` (`SuperadminView.tsx:290-311`) yang memanggil `setActiveTargetSchool(school)`.

### 3.2 Keberadaan Kolom Wilayah (`kota_kabupaten`)
**Temuan**: Kolom `kota_kabupaten` **SUDAH TERSEDIA SECARA ASLI** pada skema database sekolah:
1. Pada `public.sekolah`:
   ```sql
   -- supabase/migrations/20260912_multi_tenant_sekolah_rls.sql:22
   kota_kabupaten TEXT,
   provinsi TEXT DEFAULT 'Sulawesi Utara',
   ```
2. Pada `public.sekolah_registry`:
   ```sql
   -- supabase/migrations/20261013_portal_induk_jaringan_multi_sekolah.sql:11
   kota_kabupaten TEXT,
   provinsi TEXT DEFAULT 'Sulawesi Utara',
   ```
3. Pada UI Input Superadmin:
   Input form `swal-sat-kota` dan `swal-edit-sat-kota` di `SuperadminView.tsx:352, 537` sudah mewajibkan pengisian `Kota / Kabupaten` (contoh: "Kab. Bolaang Mongondow Timur", "Kota Kotamobagu").

### 3.3 Manajemen Pengguna Saat Ini
- **Status Eksisting**:
  - `AdminDataView.tsx` dikhususkan bagi Admin Sekolah lokal untuk mengelola `data_guru`, `data_siswa`, `guru_mapel`, dll.
  - Di `SuperadminView.tsx` saat ini **hanya ada 2 tab**: `overview` ("Ringkasan Platform") dan `jaringan` ("Jaringan Sekolah"). Belum ada tab manajemen akun pengguna dinas.
- **Tabel Penyimpanan Pengguna**:
  Seluruh akun otentikasi login SIPJAM disimpan di tabel `public.users`.
  Kolom eksisting: `id`, `username`, `password`, `nama`, `role`, `sekolah_id`, `session_token`, `avatar`, `created_at`, `updated_at`.

---

## 4. Penugasan Wilayah (`kota_kabupaten`) untuk Akun `dinas_pendidikan`

### 4.1 Skema Database Penugasan Wilayah
Untuk mendukung penugasan wilayah oleh Superadmin:
1. Tambahkan kolom `kota_kabupaten` pada tabel `public.users`:
   ```sql
   ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kota_kabupaten TEXT;
   ```
2. Karakteristik baris akun `dinas_pendidikan`:
   - `role`: `'dinas_pendidikan'`
   - `sekolah_id`: `NULL` (tidak terikat pada satu sekolah tunggal, melainkan multi-sekolah dalam satu wilayah)
   - `kota_kabupaten`: string nama wilayah binaan, misal `'Kab. Bolaang Mongondow Timur'` atau `'Kota Kotamobagu'`.

### 4.2 Desain UI Penugasan Wilayah di `SuperadminView.tsx`
Tambahkan Tab ke-3 di `SuperadminView.tsx`: `activeTab === 'dinas'` ("Akun Dinas Pendidikan"):
1. **Daftar Akun Dinas**:
   Menampilkan tabel akun dengan kolom: Nama Petugas/Dinas, Username, Wilayah Binaan (`kota_kabupaten`), Status, dan Aksi (Edit Wilayah / Hapus).
2. **Formulir Tambah / Edit Akun Dinas**:
   - `Nama`: mis. "Dinas Pendidikan Kab. Boltim"
   - `Username`: mis. "dinas_boltim"
   - `Password`: Kata sandi akun
   - `Daerah Binaan (Kota/Kabupaten)`: Dropdown dinamis yang mengambil daftar unik `kota_kabupaten` dari data sekolah yang terdaftar di `sekolah_registry` / `sekolah`.
3. **Eksekusi Mutasi**:
   Superadmin menggunakan `masterSupabase.from('users').insert(...)` atau `.update(...)`. Karena Superadmin memiliki hak akses penuh melalui RLS policy (`is_superadmin()`), mutasi ini berjalan 100% aman dan terisolasi.

### 4.3 Propagasi Wilayah Binaan ke Sesi Pengguna
1. Saat user dinas login, `verify_login` (atau pembacaan `users` pasca-login) mengembalikan `kota_kabupaten`.
2. Objek tersimpan di `localStorage.getItem('sipjam_user')` memuat properti `kota_kabupaten`.
3. `getActiveTenantContext()` di `src/lib/supabaseClient.ts` mengembalikan `kotaKabupaten`.
4. Dashboard Monitoring Dinas (`DinasMonitoringView.tsx`) membaca `user.kota_kabupaten` dan secara ketat hanya memuat sekolah yang:
   ```typescript
   query = masterSupabase
     .from('sekolah_registry')
     .select('*')
     .eq('kota_kabupaten', user.kota_kabupaten);
   ```
   Sekolah dari wilayah lain otomatis **tidak akan pernah muncul** di daftar maupun dalam perhitungan agregat metrik.

---

## 5. Penegakan Isolasi Read-Only (Defense-in-Depth)

Role `dinas_pendidikan` dirancang khusus untuk pemantauan eksekutif dan dilarang keras memodifikasi data apapun. Penegakan isolasi dilakukan melalui 5 lapisan perlindungan:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UI & Menu Navigation Gating (AppScreen.tsx)              │
│    - Menu mutasi (AdminData, AdminConfig, dll.) tidak muncul│
│    - Guard handleNavigation menolak akses ke view mutasi    │
├─────────────────────────────────────────────────────────────┤
│ 2. Read-Only Props in Drilldown Views                       │
│    - isReadOnly={true} dipassing ke RekapView & JurnalView  │
│    - Tombol Edit, Hapus, Verifikasi, Simpan disembunyikan   │
├─────────────────────────────────────────────────────────────┤
│ 3. Region-Bound Target Switching (getActiveTargetSchool)    │
│    - getActiveTargetSchool() memvalidasi target.kota_kab    │
│    - Sekolah di luar wilayah binaan menghasilkan NULL       │
├─────────────────────────────────────────────────────────────┤
│ 4. Client-Side HTTP Fetch Interceptor Guard                 │
│    - Interceptor di supabaseClient.ts mencegat request REST │
│    - Metode POST, PUT, PATCH, DELETE diblokir langsung (403)│
├─────────────────────────────────────────────────────────────┤
│ 5. PostgreSQL Row-Level Security (RLS)                      │
│    - Policy INSERT/UPDATE/DELETE hanya untuk is_superadmin()│
│      atau Admin sekolah bersangkutan                        │
│    - Role 'dinas_pendidikan' ditolak secara kriptografis DB │
└─────────────────────────────────────────────────────────────┘
```

### Penjelasan Detail 5 Lapisan:

1. **Lapisan 1: UI Navigation Gating (`AppScreen.tsx`)**
   - Di `AppScreen.tsx`, daftar menu untuk dinas (`menuItemsDinas`) hanya berisi:
     - `view-dinas-monitoring` (Dashboard Eksekutif Wilayah)
     - `view-admin-rekap` (Rekap Presensi Guru Satelit Aktif)
     - `view-rekap-siswa` (Presensi Siswa Satelit Aktif)
     - `view-jurnal-kelas` (Jurnal Pembelajaran Satelit Aktif)
   - Di `handleNavigation`:
     ```typescript
     if (isDinas && ['view-admin-data', 'view-admin-config', 'view-admin-backup', 'view-admin-verif', 'view-sistem-blok', 'view-guru-presensi', 'view-guru-jurnal', 'view-piket'].includes(targetId)) {
       Swal.fire({
         icon: 'warning',
         title: 'Akses Ditolak',
         text: 'Akun Dinas Pendidikan beroperasi dalam mode monitoring read-only.',
         confirmButtonColor: '#0B4619'
       });
       return;
     }
     ```

2. **Lapisan 2: UI Component Props (`isReadOnly={true}`)**
   - Saat dinas membuka view drilldown (misal `view-rekap-siswa`, `view-admin-rekap`, `view-jurnal-kelas`), prop `isReadOnly={true}` diteruskan.
   - Di dalam komponen-komponen tersebut, elemen tombol input tindakan (seperti tombol "Simpan Perubahan", "Hapus Presensi", "Ubah Status") disembunyikan atau di-disable. Fitur cetak (`PrintHeader` / dialog cetak dokumen resmi) tetap diizinkan.

3. **Lapisan 3: Validasi Wilayah pada Scope Switcher (`getActiveTargetSchool`)**
   - Di `src/lib/supabaseClient.ts`, fungsi `getActiveTargetSchool()` saat ini hanya mengizinkan Superadmin:
     ```typescript
     // src/lib/supabaseClient.ts:174-177
     const roleNorm = (tenant.role || '').toLowerCase().replace(/\s+/g, '');
     if (roleNorm !== 'superadmin') {
       return null;
     }
     ```
   - Untuk mendukung drilldown oleh `dinas_pendidikan`, logika ini diperluas dengan validasi wilayah:
     ```typescript
     if (roleNorm === 'dinas_pendidikan') {
       // Target school MUST belong to the user's assigned kota_kabupaten
       const target = getActiveTargetSchoolFromStorage();
       if (!target || !tenant.kotaKabupaten || target.kota_kabupaten !== tenant.kotaKabupaten) {
         return null; // Blokir jika di luar wilayah binaan!
       }
       return target;
     }
     if (roleNorm !== 'superadmin') {
       return null;
     }
     ```

4. **Lapisan 4: Interceptor HTTP Request di `supabaseClient.ts`**
   - Seluruh request Supabase client melewati custom fetch di `src/lib/supabaseClient.ts:360-440`.
   - Jika `safeRole === 'dinas_pendidikan'` dan metode HTTP adalah `POST`, `PUT`, `PATCH`, atau `DELETE` pada endpoint tabel REST (`/rest/v1/...`):
     ```typescript
     const method = (init?.method || 'GET').toUpperCase();
     if (safeRole === 'dinas_pendidikan' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
       // Exception only for verify_login RPC
       if (!requestUrlStr.includes('/rpc/verify_login')) {
         throw new Error('[RBAC Guard] Role dinas_pendidikan memiliki akses read-only dan dilarang melakukan mutasi data.');
       }
     }
     ```
   - Request mutasi akan langsung dibatalkan di sisi client sebelum terkirim ke network.

5. **Lapisan 5: PostgreSQL Row Level Security (RLS)**
   - RLS policy yang sudah ada pada seluruh 16 tabel multi-tenant (`20260912_fix_rls_integrity.sql:346-370`) hanya mengizinkan INSERT, UPDATE, dan DELETE jika:
     `is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id() AND public.get_auth_user_role() = 'Admin'`
   - Akun `dinas_pendidikan` memiliki `role = 'dinas_pendidikan'` dan `sekolah_id = NULL`, sehingga otomatis ditolak (0 rows affected atau error) oleh database PostgreSQL jika mencoba melakukan mutasi langsung.

---

## 6. Arsitektur Komponen Baru yang Direkomendasikan

### 6.1 `src/components/DinasMonitoringView.tsx`
Komponen dashboard eksekutif untuk role `dinas_pendidikan`:
1. **Header Wilayah**:
   - Menampilkan identitas: "Dashboard Monitoring Eksekutif — [user.kota_kabupaten]".
   - Tombol "Cetak Laporan Rekapitulasi Wilayah" (menggunakan `window.print()` dan format resmi SIPJAM).
2. **Kartu Metrik Agregat Wilayah**:
   - *Total Sekolah Aktif Binaan*: jumlah sekolah di wilayah penugasan dengan status `aktif`.
   - *Rata-rata Kehadiran Guru Hari Ini*: persentase guru hadir hari ini di seluruh sekolah wilayah binaan.
   - *Rata-rata Kehadiran Siswa Hari Ini*: persentase siswa hadir hari ini di seluruh sekolah wilayah binaan.
   - *Koneksi Live Satelit*: jumlah satelit online vs paused (menggunakan ping `checkSatelliteHealthAndMetrics`).
3. **Peringatan Sekolah Memerlukan Perhatian (Alpa Tinggi)**:
   - Panel peringatan yang menyorot sekolah dengan tingkat ketidakhadiran/alpa guru atau siswa melebihi ambang batas wajar.
4. **Tabel & Kontrol Pencarian Sekolah Binaan**:
   - Filter pencarian nama/NPSN sekolah di dalam wilayah binaan.
   - Filter status operasional (Aktif / Nonaktif / Online / Paused).
   - Tombol aksi per sekolah: "Pantau Sekolah (Drilldown)" yang memanggil `setActiveTargetSchool(sch)` dan mengarahkan ke rekap presensi sekolah tersebut secara read-only.

### 6.2 File Pengujian Otomatis (`tests/dinas_pendidikan_monitoring.test.ts`)
Menguji secara menyeluruh 4 aspek sesuai acceptance criteria:
1. Penugasan wilayah `kota_kabupaten` oleh Superadmin ke akun dinas.
2. Isolasi data wilayah: Akun dinas di wilayah A tidak dapat melihat data sekolah di wilayah B.
3. Hak akses cetak/rekap dapat diakses, sedangkan upaya mutasi data dicegah dan ditolak.
4. Kalkulasi agregasi metrik kehadiran dan drilldown sekolah binaan berjalan akurat.

---

## 7. Kesimpulan & Rekomendasi Langkah Kerja

| Langkah | Komponen / Berkas | Tindakan yang Diperlukan |
|---|---|---|
| **1. Skema & Tipe** | `src/types/user.ts`, `src/types/database.ts`, Migration SQL | Tambahkan role `'dinas_pendidikan'` dan kolom `kota_kabupaten` pada `AppUser`, skema `users`, serta perbarui RPC `verify_login`. |
| **2. Superadmin Management** | `src/components/SuperadminView.tsx` | Tambahkan antarmuka (Tab 3 atau Modal) untuk membuat, mengedit, dan menugaskan `kota_kabupaten` pada akun `dinas_pendidikan`. |
| **3. Tenant & Client Context** | `src/lib/supabaseClient.ts` | Tambahkan `kotaKabupaten` pada `TenantContext`, perluas `getActiveTargetSchool` untuk validasi `dinas_pendidikan` sesuai wilayah, dan pasang HTTP fetch mutation interceptor guard. |
| **4. Executive Dashboard** | `src/components/DinasMonitoringView.tsx` | Bangun dashboard monitoring eksekutif wilayah dengan metrik agregat, daftar sekolah binaan, sekolah butuh perhatian, dan tombol cetak laporan. |
| **5. AppScreen Integration** | `src/components/AppScreen.tsx`, `ClaySidebar.tsx` | Hubungkan perutean view dinas, menu sidebar khusus, penanganan drilldown, dan proteksi read-only di navigation handler. |
| **6. Automated Test Suite** | `tests/dinas_pendidikan_monitoring.test.ts` | Tulis test suite komprehensif memvalidasi RBAC, isolasi wilayah binaan, proteksi mutasi data, dan agregasi metrik. |
| **7. Build & Git Delivery** | `git status`, `npx tsc --noEmit`, `git push origin dev` | Verifikasi build bersih tanpa error dan dorong perubahan ke branch `dev`. |
