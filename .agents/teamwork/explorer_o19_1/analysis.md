# Laporan Analisis Teknis — Phase 1 (R1, R2, R3, R4, R8, R9, R10)
**Peneliti**: Explorer 1 (`explorer_o19_1`)  
**Tanggal**: 2026-10-10  
**Tujuan**: Investigasi mendalam (read-only) untuk Phase 1 sesuai spesifikasi permintaan. Menghasilkan bukti observasi, nomor baris tepat, rantai logika, dan rancangan kode pengganti minimalis (Ponytail mode).

---

## Ringkasan Eksekutif

Investigasi teknis terhadap 7 requirement Phase 1 telah selesai dilakukan:
1. **R1 (Keamanan Password)**: Ditemukan kredensial superadmin plaintext hardcoded pada `src/app/api/attendance/route.ts` baris 29 (`'SipjamSuperAdmin2026!'`). File `.env.local` saat ini belum memiliki key `SUPERADMIN_API_PASSWORD`.
2. **R2 (Duplikasi Auth State)**: `src/app/page.tsx` memanggil `supabase.auth.getSession()` dan `supabase.auth.onAuthStateChange()` (baris 16, 22), yang hasilnya disimpan di `session` tetapi tidak pernah digunakan karena aplikasi memakai custom auth `sipjam_user` di localStorage. Komponen `Home()` dapat disederhanakan secara dramatis.
3. **R3 (Bug isGuru)**: `src/components/HomeView.tsx` baris 78 mendefinisikan `const isGuru = user?.role !== 'Admin'`. Hal ini menyebabkan akun Superadmin (role `Superadmin` / `superadmin`) dan Admin bertulisan kecil (`admin`) salah terdeteksi sebagai Guru dan menampilkan dashboard guru. Pola harus diselaraskan dengan `AppScreen.tsx`.
4. **R4 (Scoping Realtime Channel)**: `src/components/AdminVerifView.tsx` baris 64, 71, 78 mendengarkan channel global `'verif-presensi'`, `'verif-jurnal'`, `'verif-piket'`. Admin lintas sekolah akan saling mentrigger reload. Perlu ditambahkan scoping tenant `-${user?.sekolah_id || 'global'}`.
5. **R8 (Preconnect Font Awesome)**: `src/app/layout.tsx` baris 46 memuat Font Awesome stylesheet CDN tanpa tag `preconnect`. Tag `<link rel="preconnect" href="https://cdnjs.cloudflare.com" />` harus disisipkan pada baris 46 sebelum stylesheet.
6. **R9 (Once-Flag Connectivity Test)**: `src/lib/supabaseClient.ts` baris 214–227 menjalankan connectivity test setiap kali module dievaluasi. Diperlukan guard flag `let _connectivityChecked = false`.
7. **R10 (Dead Code sync-spreadsheet)**: Direktori `src/app/api/sync-spreadsheet/` kosong (0 files, tidak ditrack git, 0 referensi di seluruh codebase). Backup spreadsheet aktual berjalan langsung dari client (`AdminBackupView.tsx`) ke webhook Apps Script. Direktori kosong ini aman dihapus sepenuhnya.

---

## 1. R1: Keamanan — Hapus Hardcoded Credentials

### Observasi
- **File**: `src/app/api/attendance/route.ts`
- **Fungsi**: `resolveSessionToken(req: NextRequest, body: any): Promise<string | null>` (baris 10–40)
- **Baris Bermasalah**: Baris 27–34
  ```ts
  27:     const { data } = await supabase.rpc('verify_login', {
  28:       p_username: 'superadmin',
  29:       p_password: 'SipjamSuperAdmin2026!',
  30:     });
  31:     if (data && data[0]?.session_token) {
  32:       cachedSuperadminToken = data[0].session_token;
  33:       return cachedSuperadminToken;
  34:     }
  ```
- **Pemeriksaan `.env.local`**:
  File `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.env.local` saat ini berisi:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SPREADSHEET_WEBHOOK_URL`
  - `NEXT_PUBLIC_DRIVE_UPLOAD_WEBHOOK_URL`
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT`
  Entry `SUPERADMIN_API_PASSWORD` **belum ada**.
- **Hasil Grep**:
  `grep -r 'SipjamSuperAdmin' src/` hanya memunculkan 1 hasil di `src/app/api/attendance/route.ts:29`.

### Analisis & Rantai Logika
1. Kredensial superadmin disimpan secara eksplisit dalam kode sumber TypeScript.
2. Ketika request masuk ke `/api/attendance` tanpa session token di header atau body, fungsi mencoba auto-login dengan password statis tersebut.
3. Ini merupakan celah keamanan credential exposure.
4. Solusi ponytail: baca password dari `process.env.SUPERADMIN_API_PASSWORD`. Jika env variable tidak diset, fungsi langsung mengembalikan `null` tanpa memanggil RPC `verify_login`.

### Rancangan Perubahan
1. Pada `src/app/api/attendance/route.ts`:
```ts
<<<<
  if (cachedSuperadminToken) return cachedSuperadminToken;

  try {
    const { data } = await supabase.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'SipjamSuperAdmin2026!',
    });
    if (data && data[0]?.session_token) {
      cachedSuperadminToken = data[0].session_token;
      return cachedSuperadminToken;
    }
  } catch (err) {
    console.warn('[API /api/attendance] Fallback token retrieval warning:', err);
  }

  return null;
====
  if (cachedSuperadminToken) return cachedSuperadminToken;

  const superadminPassword = process.env.SUPERADMIN_API_PASSWORD;
  if (!superadminPassword) {
    return null;
  }

  try {
    const { data } = await supabase.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: superadminPassword,
    });
    if (data && data[0]?.session_token) {
      cachedSuperadminToken = data[0].session_token;
      return cachedSuperadminToken;
    }
  } catch (err) {
    console.warn('[API /api/attendance] Fallback token retrieval warning:', err);
  }

  return null;
>>>>
```
2. Pada `.env.local`:
Tambahkan di akhir file:
```env
SUPERADMIN_API_PASSWORD=SipjamSuperAdmin2026!
```

---

## 2. R2: Hapus Duplikasi Auth State di page.tsx

### Observasi
- **File**: `src/app/page.tsx`
- **Baris Eksisting 9–47**:
  ```tsx
  export default function Home() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      // Check active session
      const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setLoading(false);
      };
      checkUser();

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      return () => subscription.unsubscribe();
    }, []);

    if (loading) {
      return (
        <div className="flex flex-col min-h-screen min-h-dvh w-full items-center justify-center bg-gray-100 dark:bg-black">
          <div className="w-48 bg-gray-200 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
            <div className="bg-nizamudin-green dark:bg-nizamudin-gold h-2 rounded-full w-full animate-pulse"></div>
          </div>
          <p className="mt-3 text-xs font-bold text-nizamudin-green dark:text-nizamudin-gold tracking-wide">
            Memuat...
          </p>
        </div>
      );
    }

    return (
      <div className="mobile-container flex flex-col min-h-screen min-h-dvh relative">
        <MainApp />
      </div>
    );
  }
  ```
- **Fungsi `MainApp` (baris 49–222)**:
  - `MainApp` mengelola state `user`, `isUserLoaded`, `showSplash`.
  - Pada baris 110–133 (`useEffect`), `MainApp` membaca `localStorage.getItem('sipjam_user')` dan memvalidasi via `validateSessionWithDb`.
  - `MainApp` sama sekali tidak menerima prop `session` dari `Home()`.
  - State `session` di `Home()` adalah dead state.

### Analisis & Rantai Logika
1. Pemanggilan `supabase.auth.getSession()` dan `supabase.auth.onAuthStateChange` membuat request jaringan yang tidak berguna ke endpoint Supabase Auth bawaan (GoTrue).
2. Tampilan terhalang oleh spinner `Memuat...` di `Home()`, kemudian setelah itu `MainApp` masih menjalankan pengecekan session sendiri.
3. Menghapus auth check di `Home()` membuat aplikasi langsung me-render container dan menjalankan `MainApp`.
4. Catatan penting: `import { supabase } from '@/lib/supabaseClient';` di baris 4 tetap dipertahankan karena `MainApp` (baris 57) menggunakannya untuk query `supabase.from('users')`.
5. Hanya pemanggilan `supabase.auth` di dalam `Home()` yang dieliminasi.

### Rancangan Perubahan
Pada `src/app/page.tsx`:
```tsx
<<<<
export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen min-h-dvh w-full items-center justify-center bg-gray-100 dark:bg-black">
        <div className="w-48 bg-gray-200 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
          <div className="bg-nizamudin-green dark:bg-nizamudin-gold h-2 rounded-full w-full animate-pulse"></div>
        </div>
        <p className="mt-3 text-xs font-bold text-nizamudin-green dark:text-nizamudin-gold tracking-wide">
          Memuat...
        </p>
      </div>
    );
  }

  return (
    <div className="mobile-container flex flex-col min-h-screen min-h-dvh relative">
      <MainApp />
    </div>
  );
}
====
export default function Home() {
  return (
    <div className="mobile-container flex flex-col min-h-screen min-h-dvh relative">
      <MainApp />
    </div>
  );
}
>>>>
```

---

## 3. R3: Fix Bug `isGuru` di `HomeView.tsx`

### Observasi
- **File**: `src/components/HomeView.tsx`
- **Baris Eksisting 78**:
  ```ts
  const isGuru = user?.role !== 'Admin';
  ```
- **Penggunaan `isGuru` di `HomeView.tsx`**:
  - Baris 107: `if (isGuru && user?.nama)` -> load data guru (jadwal, jurnal, dokumen, dll.)
  - Baris 273: dependencies `[isGuru, user?.nama, ...]`
  - Baris 639: `if (!isGuru) loadAdminMatrix();`
  - Baris 990: `const steps = isGuru ? getWorkflowSteps() : [];`
  - Baris 1021: `const nextAction = isGuru ? getNextAction() : null;`
  - Baris 1080: `{isGuru && (` -> render dashboard guru (kartu jadwal mengajar, alur presensi, dll.)
  - Baris 1518: `{!isGuru && (` -> render dashboard admin (status kehadiran harian, matriks guru)

### Analisis & Rantai Logika
1. Pada role `'Superadmin'` atau `'superadmin'`, evaluasi `user?.role !== 'Admin'` menghasilkan `true`.
2. Akibatnya, Superadmin diarahkan ke antarmuka Guru (`isGuru = true`), padahal Superadmin adalah peran administratif tertinggi.
3. Demikian juga jika role tersimpan sebagai `'admin'` (huruf kecil), perbandingan case-sensitive `!== 'Admin'` menghasilkan `true` (bug role case mismatch).
4. Bandingkan dengan `src/components/AppScreen.tsx` baris 61–62:
  ```ts
  const isSuperadmin = (user?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
  const isAdmin = isSuperadmin || (user?.role || '').toLowerCase() === 'admin';
  ```
5. Konsisten dengan itu, `isGuru` harus bernilai `!isAdmin`.

### Rancangan Perubahan
Pada `src/components/HomeView.tsx` baris 78:
```ts
<<<<
  const isGuru = user?.role !== 'Admin';
====
  const role = (user?.role || '').toLowerCase().replace(/\s+/g, '');
  const isSuperadmin = role === 'superadmin';
  const isAdmin = isSuperadmin || role === 'admin';
  const isGuru = !isAdmin;
>>>>
```
Tabel evaluasi hasil:
| Role String | `role` | `isSuperadmin` | `isAdmin` | `isGuru` | Tampilan Dashboard |
|---|---|---|---|---|---|
| `'Superadmin'` | `'superadmin'` | true | true | **false** | Admin Dashboard |
| `'superadmin'` | `'superadmin'` | true | true | **false** | Admin Dashboard |
| `'Super Admin'` | `'superadmin'` | true | true | **false** | Admin Dashboard |
| `'Admin'` | `'admin'` | false | true | **false** | Admin Dashboard |
| `'admin'` | `'admin'` | false | true | **false** | Admin Dashboard |
| `'Guru'` | `'guru'` | false | false | **true** | Guru Dashboard |
| `'guru'` | `'guru'` | false | false | **true** | Guru Dashboard |

---

## 4. R4: Scope Realtime Channel per Sekolah di `AdminVerifView.tsx`

### Observasi
- **File**: `src/components/AdminVerifView.tsx`
- **Baris Eksisting 63–83**:
  ```ts
    const channelPresensi = supabase
      .channel('verif-presensi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presensi_guru' }, () => {
        if (activeTab === 'Presensi') loadData();
      })
      .subscribe();

    const channelJurnal = supabase
      .channel('verif-jurnal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jurnal_pembelajaran' }, () => {
        if (activeTab === 'Jurnal') loadData();
      })
      .subscribe();

    const channelPiket = supabase
      .channel('verif-piket')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_piket' }, () => {
        if (activeTab === 'Piket') loadData();
      })
      .subscribe();
  ```
- Props komponen:
  ```ts
  export default function AdminVerifView({ user }: { user: any })
  ```
  Objek `user` tersedia dengan properti `user.sekolah_id`.

### Analisis & Rantai Logika
1. Nama channel `'verif-presensi'`, `'verif-jurnal'`, `'verif-piket'` tidak menyertakan tenant ID (`sekolah_id`).
2. Dalam arsitektur multi-tenant, ketika presensi disimpan untuk sekolah A, channel memancarkan event ke semua client yang tersambung ke topic `'verif-presensi'`, termasuk admin di sekolah B.
3. Ini menyebabkan admin sekolah B melakukan reload data yang tidak perlu (`loadData()`).
4. Dengan menyematkan `user?.sekolah_id || 'global'`, channel menjadi terisolasi per sekolah:
   - `verif-presensi-${user?.sekolah_id || 'global'}`
   - `verif-jurnal-${user?.sekolah_id || 'global'}`
   - `verif-piket-${user?.sekolah_id || 'global'}`
5. Acceptance criteria: `grep "verif-presensi'" src/components/AdminVerifView.tsx` harus kosong. Penggunaan template literal otomatis memenuhi kriteria ini.

### Rancangan Perubahan
Pada `src/components/AdminVerifView.tsx` baris 63–83:
```ts
<<<<
    const channelPresensi = supabase
      .channel('verif-presensi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presensi_guru' }, () => {
        if (activeTab === 'Presensi') loadData();
      })
      .subscribe();

    const channelJurnal = supabase
      .channel('verif-jurnal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jurnal_pembelajaran' }, () => {
        if (activeTab === 'Jurnal') loadData();
      })
      .subscribe();

    const channelPiket = supabase
      .channel('verif-piket')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_piket' }, () => {
        if (activeTab === 'Piket') loadData();
      })
      .subscribe();
====
    const channelPresensi = supabase
      .channel(`verif-presensi-${user?.sekolah_id || 'global'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presensi_guru' }, () => {
        if (activeTab === 'Presensi') loadData();
      })
      .subscribe();

    const channelJurnal = supabase
      .channel(`verif-jurnal-${user?.sekolah_id || 'global'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jurnal_pembelajaran' }, () => {
        if (activeTab === 'Jurnal') loadData();
      })
      .subscribe();

    const channelPiket = supabase
      .channel(`verif-piket-${user?.sekolah_id || 'global'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_piket' }, () => {
        if (activeTab === 'Piket') loadData();
      })
      .subscribe();
>>>>
```

---

## 5. R8: Preconnect Font Awesome di `src/app/layout.tsx`

### Observasi
- **File**: `src/app/layout.tsx`
- **Baris Eksisting 43–48**:
  ```tsx
    return (
      <html lang="id" className="light" suppressHydrationWarning>
        <head>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        </head>
  ```

### Analisis & Rantai Logika
1. Browser mengunduh stylesheet Font Awesome dari `cdnjs.cloudflare.com`.
2. Tanpa instruksi `preconnect`, browser harus menyelesaikan DNS lookup, TCP handshake, dan negosiasi TLS secara berurutan setelah parser HTML menemukan tag `<link rel="stylesheet">`.
3. Menambahkan `<link rel="preconnect" href="https://cdnjs.cloudflare.com" />` sebelum stylesheet memungkinkan browser membuka koneksi soket lebih awal selama fase tokenisasi HTML.
4. Ini mempercepat First Contentful Paint (FCP) untuk ikon UI.

### Rancangan Perubahan
Pada `src/app/layout.tsx` baris 45–47:
```tsx
<<<<
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
====
      <head>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
>>>>
```

---

## 6. R9: Connectivity Test Once-Flag di `src/lib/supabaseClient.ts`

### Observasi
- **File**: `src/lib/supabaseClient.ts`
- **Baris Eksisting 214–227**:
  ```ts
  // Quick connectivity test on module load (client-side only)
  if (typeof window !== 'undefined') {
    supabase
      .from('sekolah')
      .select('id')
      .limit(1)
      .then(({ error }) => {
        if (error && error.code !== 'PGRST116') {
          console.error('[supabaseClient] Connectivity test note:', error.message);
        } else {
          console.log('[supabaseClient] Supabase is reachable.');
        }
      });
  }
  ```

### Analisis & Rantai Logika
1. Kode ini berjalan pada top-level scope module setiap kali modul diinisialisasi di environment browser.
2. Dalam Next.js PWA, jika modul diimpor ulang atau dievaluasi dalam multiple bundle splits, query ini dapat terpanggil lebih dari satu kali.
3. Penambahan variabel modul `let _connectivityChecked = false` memastikan query test koneksi hanya dieksekusi sekali seumur hidup aplikasi.

### Rancangan Perubahan
Pada `src/lib/supabaseClient.ts` baris 214–227:
```ts
<<<<
// Quick connectivity test on module load (client-side only)
if (typeof window !== 'undefined') {
  supabase
    .from('sekolah')
    .select('id')
    .limit(1)
    .then(({ error }) => {
      if (error && error.code !== 'PGRST116') {
        console.error('[supabaseClient] Connectivity test note:', error.message);
      } else {
        console.log('[supabaseClient] Supabase is reachable.');
      }
    });
}
====
// Quick connectivity test on module load (client-side only, run once)
let _connectivityChecked = false;
if (typeof window !== 'undefined' && !_connectivityChecked) {
  _connectivityChecked = true;
  supabase
    .from('sekolah')
    .select('id')
    .limit(1)
    .then(({ error }) => {
      if (error && error.code !== 'PGRST116') {
        console.error('[supabaseClient] Connectivity test note:', error.message);
      } else {
        console.log('[supabaseClient] Supabase is reachable.');
      }
    });
}
>>>>
```

---

## 7. R10: Investigasi Dead Code `src/app/api/sync-spreadsheet/`

### Observasi
1. **Pemeriksaan Direktori**:
   - `list_dir` pada `c:\Users\Fitra\OneDrive\Documents\sipjam-app\src\app\api\sync-spreadsheet` mengembalikan `Empty directory` (0 byte, 0 file, tidak ada `route.ts` maupun file lain).
2. **Pemeriksaan Git**:
   - `git ls-files src/app/api/sync-spreadsheet` mengembalikan output kosong (tidak ada file yang ditrack git).
   - `git status` clean.
3. **Pencarian Referensi Kode**:
   - Pencarian string `sync-spreadsheet` di seluruh repository menghasilkan 0 kecocokan.
4. **Alur Sinkronisasi Spreadsheet Eksisting**:
   - Fitur backup/sinkronisasi spreadsheet ditangani di `src/components/AdminBackupView.tsx` (baris 12, 87, 97, 156).
   - Fitur tersebut langsung memanggil URL webhook Google Apps Script (`NEXT_PUBLIC_SPREADSHEET_WEBHOOK_URL`) langsung dari browser menggunakan `fetch()`. Tidak melalui endpoint API Next.js lokal.
   - Endpoint `/api/sync-spreadsheet` tidak terdaftar pada build output Next.js.

### Analisis & Rantai Logika
1. Folder `src/app/api/sync-spreadsheet/` merupakan sisa folder kosong (folder hantu / dead directory) yang tidak digunakan atau file routernya sudah dihapus sebelumnya.
2. Tidak ada ketergantungan kode dari komponen manapun.
3. Menghapus folder kosong ini akan merapikan struktur direktori dan mencegah kebingungan arsitektur.

### Rekomendasi Tindakan
Hapus direktori kosong `src/app/api/sync-spreadsheet/`.

---

## Checklist Acceptance Criteria untuk Builder

| Requirement | Kriteria | Cara Verifikasi | Status Hasil Investigasi |
|---|---|---|---|
| **R1** | `grep -r 'SipjamSuperAdmin' src/` return kosong | `grep_search` / `Select-String` | Teridentifikasi di `attendance/route.ts:29`, siap diganti |
| **R1** | `.env.local` memiliki entry `SUPERADMIN_API_PASSWORD` | Cek `.env.local` | Terverifikasi belum ada, siap ditambahkan |
| **R2** | `grep -n 'supabase.auth' src/app/page.tsx` return kosong | `grep_search` / `Select-String` | Teridentifikasi di baris 16 & 22, siap dihilangkan |
| **R3** | `isGuru` memakai logika `role -> !isAdmin` | Unit test / code review | Logika terpetakan konsisten dengan `AppScreen.tsx` |
| **R4** | Realtime channel mengandung `sekolah_id`; `grep "verif-presensi'" src/components/AdminVerifView.tsx` return kosong | `grep_search` | Teridentifikasi di baris 64, 71, 78, siap diganti template literal |
| **R8** | `<link rel="preconnect" href="https://cdnjs.cloudflare.com" />` sebelum stylesheet Font Awesome | Code review / grep | Teridentifikasi di `layout.tsx:45-47` |
| **R9** | `_connectivityChecked` once-flag terpasang | Code review / grep | Teridentifikasi di `supabaseClient.ts:214-227` |
| **R10** | Folder `src/app/api/sync-spreadsheet` dihapus | File explorer / ls | Terkonfirmasi kosong, siap didelete |
