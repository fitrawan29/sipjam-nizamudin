# Handoff Report: Requirement R1 — Functionalize Verification Buttons

**Explorer Agent**: Verification Codebase Explorer  
**Mission**: Comprehensive investigation of Requirement R1 (Functionalize Verification Buttons across all Admin verification views: Presensi, Jurnal, and Piket)  
**Target Milestone**: R1 — Functionalize Verification Buttons  
**Date**: 2026-09-11  

---

## 1. Observation

### 1.1 UI Architecture & Route Inspection
- **Architecture**: The application uses Next.js App Router (`src/app/page.tsx`), but implements an in-memory client-side view switcher managed by `src/components/AppScreen.tsx`. There are **no separate URL routes** like `/admin/verifikasi-presensi` or `/admin/verifikasi-jurnal`.
- **Primary Verification View**:
  - File: `src/components/AdminVerifView.tsx` (197 lines)
  - Invoked at: `src/components/AppScreen.tsx:186`:
    ```tsx
    186: {currentView === 'view-admin-verif' && <AdminVerifView user={user} />}
    ```
  - Menu definition at: `src/components/AppScreen.tsx:104`:
    ```tsx
    104: { id: 'view-admin-verif', icon: 'fa-clipboard-check', label: 'Verifikasi' },
    ```
- **Related Secondary Views**:
  - `src/components/PiketView.tsx` (`view-piket`): In Admin menu as "Kelola Piket" (`AppScreen.tsx:105`). Displays "Laporan Terbaru" (lines 158-173) but does not display `status_verifikasi` badges or verify buttons.
  - `src/components/DokumenView.tsx` (`view-dokumen`): In Admin menu as "Perangkat Pembelajaran" (`AppScreen.tsx:106`). Filters queries by `eq('nama_guru', user.nama)` (line 30), preventing admins from seeing or verifying all submitted teacher documents.
  - `src/components/AdminMonitorView.tsx` (`view-admin-monitor`): Displays presensi cards with verification badges (`Disetujui`, `Ditolak`, `Menunggu`), but is strictly read-only with no action buttons.

---

### 1.2 Scan of Existing Action Buttons in `src/components/AdminVerifView.tsx`
Direct inspection of `src/components/AdminVerifView.tsx` revealed the following action buttons:

1. **Individual "Setujui" Button** (Line 184):
   ```tsx
   184: <button onClick={() => verifyItem(item.id, 'Disetujui')} className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1.5 rounded-lg transition">Setujui</button>
   ```
2. **Individual "Tolak" Button** (Line 185):
   ```tsx
   185: <button onClick={() => verifyItem(item.id, 'Ditolak')} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1.5 rounded-lg transition">Tolak</button>
   ```
3. **Bulk "Setujui Semua Tampil" Button** (Lines 129-131):
   ```tsx
   129: <button type="button" onClick={bulkVerifyCurrent} className="btn-click w-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 py-2.5 rounded-xl text-xs font-bold border border-green-200 dark:border-green-800 flex justify-center items-center gap-2 hover:bg-green-200 dark:hover:bg-green-900/50 transition">
   130:   <i className="fa-solid fa-check-double"></i> Setujui Semua Tampil
   131: </button>
   ```
4. **Tab Switcher Buttons** (Lines 134-140):
   ```tsx
   134: <button type="button" onClick={() => setActiveTab('Presensi')} ...>Presensi</button>
   137: <button type="button" onClick={() => setActiveTab('Jurnal')} ...>Jurnal</button>
   ```
   **CRITICAL DEFECT**: There is NO Tab button for "Piket" (`laporan_piket`)!
5. **Date Filter Reset "Semua" Button** (Lines 125-127):
   ```tsx
   125: <button type="button" onClick={() => setDate('')} ...>Semua</button>
   ```
6. **Refresh Data Button** (Lines 115-117):
   ```tsx
   115: <button type="button" onClick={loadData} ...>
   116:   <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
   117: </button>
   ```

---

### 1.3 Current Implementation Deficiencies in `AdminVerifView.tsx`

1. **`activeTab` State & Missing Piket**:
   Lines 10, 72-83, 85-101:
   ```tsx
   10: const [activeTab, setActiveTab] = useState<'Presensi'|'Jurnal'>('Presensi');
   ...
   73: const table = activeTab === 'Presensi' ? 'presensi_guru' : 'jurnal_pembelajaran';
   ...
   87: const table = activeTab === 'Presensi' ? 'presensi_guru' : 'jurnal_pembelajaran';
   88: const list = activeTab === 'Presensi' ? filteredPresensi : filteredJurnal;
   ```
   - Only `Presensi` and `Jurnal` are supported.
   - Requirement R1 explicitly specifies: *"such as approving or rejecting Presensi, Jurnal, and Piket"*.
   - In legacy code (`code.gs.txt:1150-1156`), bulk verification specifically implemented three domains:
     ```javascript
     if(type === 'presensi') { sheetName = 'Presensi_Guru'; statusCol = 11; }
     else if(type === 'jurnal' || type === 'Jurnal_Pembelajaran') { sheetName = 'Jurnal_Pembelajaran'; statusCol = 14; }
     else if(type === 'piket') { sheetName = 'Laporan_Piket'; statusCol = 8; }
     ```
2. **Missing Realtime Subscription for Piket**:
   Lines 19-36 of `AdminVerifView.tsx` subscribe only to `presensi_guru` and `jurnal_pembelajaran`. `laporan_piket` has no realtime subscription.
3. **Primitive Browser Notifications & Error Handling**:
   - Line 81: `alert("Gagal memverifikasi: " + error.message);`
   - Line 86: `if (!confirm('Anda yakin menyetujui semua data yang tampil ini?')) return;`
   - Line 95-98 (`bulkVerifyCurrent`):
     ```tsx
     await supabase
       .from(table)
       .update({ status_verifikasi: 'Disetujui' })
       .in('id', batchIds);
     ```
     Errors returned from `supabase.from().update()` are ignored with no `{ error }` check or user feedback.
   - No success feedback is shown for either individual verify or bulk verify (silent `loadData()`).
   - The rest of the codebase uses `sweetalert2` (`Swal.fire(...)`).
4. **No Loading / In-flight State for Action Buttons**:
   Buttons remain clickable while the asynchronous Supabase call executes. Double-clicking triggers redundant update calls.
5. **Card Rendering Assumes 2 Tabs Only**:
   Lines 160-182:
   ```tsx
   {activeTab === 'Presensi' ? (
     ... // uses item.timestamp, item.tipe_absen, item.jenis_presensi, item.link_bukti
   ) : (
     ... // uses item.tanggal, item.kelas, item.mapel, item.materi, item.link_bukti_foto
   )}
   ```
   If Piket data is rendered here, `item.mapel` and `item.kelas` are `undefined`. `laporan_piket` has `guru_pelapor`, `catatan_apel`, `link_foto`, and `rekap_absen_kelas`.
6. **Search Field Key Mismatch for Piket**:
   Line 103-104:
   ```tsx
   103: const filteredPresensi = presensiList.filter(p => p.nama_guru?.toLowerCase().includes(search.toLowerCase()));
   104: const filteredJurnal = jurnalList.filter(j => j.nama_guru?.toLowerCase().includes(search.toLowerCase()));
   ```
   In `laporan_piket`, the teacher's name is stored in column `guru_pelapor`, **not** `nama_guru`.

---

### 1.4 Database Schema & Status Fields Inspection (Supabase `jicvvqxjyzntdrccnuyz`)

Direct inspection via `supabase.list_tables` and `execute_sql` revealed the exact table definitions:

| Table Name | Primary Key | Status Column | Date/Time Column | Teacher Name Column | Evidence Link Column | Other Relevant Columns |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `presensi_guru` | `id` (`text`) | `status_verifikasi` (`text`) | `timestamp` (`text`) | `nama_guru` (`text`) | `link_bukti` (`text`) | `tipe_absen`, `jenis_presensi`, `detail_izin`, `lokasi`, `jarak`, `keterlambatan_detik` |
| `jurnal_pembelajaran` | `id` (`text`) | `status_verifikasi` (`text`) | `tanggal` (`text`, YYYY-MM-DD), `timestamp` (`text`) | `nama_guru` (`text`) | `link_bukti_foto` (`text`) | `mapel`, `kelas`, `materi`, `kegiatan`, `absensi_siswa`, `keterangan`, `refleksi`, `detail_absen`, `catatan_khusus_siswa` |
| `laporan_piket` | `id` (`text`) | `status_verifikasi` (`text`) | `tanggal` (`text`, YYYY-MM-DD), `timestamp` (`text`) | `guru_pelapor` (`text`) | `link_foto` (`text`) | `rekap_absen_kelas` (JSON), `catatan_apel`, `kehadiran_guru_piket` (JSON) |
| `bank_dokumen` *(optional)* | `id` (`text`) | `status_verifikasi` (`text`) | `timestamp` (`text`) | `nama_guru` (`text`) | `link_file` (`text`) | `jenis_dokumen`, `judul`, `catatan_admin` |

**Distribution of `status_verifikasi` in production database**:
- `presensi_guru`: `'Disetujui'` (124 rows), `'-'` (120 rows), 3 legacy rows with file link.
- `jurnal_pembelajaran`: `'Disetujui'` (137 rows), `'Menunggu'` (8 rows), `'Menunggu Verifikasi'` (3 rows).
- `laporan_piket`: `'Disetujui'` (22 rows), `'Menunggu Verifikasi'` (7 rows), `'Menunggu'` (1 row).

**Accepted Status Values**:
- Approved: `'Disetujui'`
- Rejected: `'Ditolak'`
- Pending/Unverified: `'Menunggu'` (or legacy `'Menunggu Verifikasi'`, `'-'`)

---

### 1.5 Supabase Client Instantiation
- File: `src/lib/supabaseClient.ts`
  ```typescript
  import { createClient } from '@supabase/supabase-js';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  export const supabase = createClient(supabaseUrl, supabaseKey);
  ```
- Import usage across components:
  ```typescript
  import { supabase } from '@/lib/supabaseClient';
  ```

---

## 2. Logic Chain

1. **Premise**: Requirement R1 mandates that verification action buttons across all Admin verification views (such as approving or rejecting Presensi, Jurnal, and Piket) must execute actual updates to the `status_verifikasi` field in Supabase.
2. **From Observation 1.1 & 1.2**: `AdminVerifView.tsx` is the sole dedicated verification interface for the Admin. However, it only contains tabs and handlers for `Presensi` and `Jurnal`. `Piket` (`laporan_piket`) is absent from the tabs, data loading, rendering, and action handlers.
3. **From Observation 1.4**: All three core tables (`presensi_guru`, `jurnal_pembelajaran`, and `laporan_piket`) have `id` as primary key (`text` data type) and `status_verifikasi` as the verification status column (`text` data type).
4. **From Observation 1.3**: The current `verifyItem` function in `AdminVerifView.tsx` issues a valid Supabase query:
   ```typescript
   supabase.from(table).update({ status_verifikasi: status }).eq('id', id)
   ```
   However:
   - `table` is hardcoded as `activeTab === 'Presensi' ? 'presensi_guru' : 'jurnal_pembelajaran'`.
   - If `activeTab` is extended to `'Piket'`, it must map to `'laporan_piket'`.
   - `bulkVerifyCurrent` similarly hardcodes table mapping and ignores returned Supabase mutation errors.
   - Browser `alert()` and `confirm()` degrade the user experience and break standard mobile/web UX patterns implemented in other components via `sweetalert2`.
5. **From Observation 1.3 (Items 5 & 6)**: For `laporan_piket`, teacher name is in `guru_pelapor` (not `nama_guru`), date is in `tanggal`, photo is in `link_foto`, and notes are in `catatan_apel`. Adding a `Piket` tab requires handling these unique column names in search filtering, card rendering, and data fetching.
6. **From Observation 1.1**: In `src/components/PiketView.tsx`, the Admin can view "Laporan Terbaru" (lines 158-173). Adding verification status badges and direct approve/reject buttons for Admin users here will allow verification in both the central `AdminVerifView` and contextually within `PiketView`.

---

## 3. Caveats

1. **Legacy Timestamp Formatting**: 3 rows in `presensi_guru` have slash-formatted timestamps (`7/16/2026 8:03:27`). When filtering Presensi by date, using `.gte('timestamp', startOfDay).lte('timestamp', endOfDay)` works for all 244 ISO/standard format rows, but may miss the 3 legacy rows. For `jurnal_pembelajaran` and `laporan_piket`, both contain a strict `tanggal` column formatted as `YYYY-MM-DD`, so `.eq('tanggal', date)` is 100% reliable.
2. **Bank Dokumen Verification**: While R1 explicitly emphasizes Presensi, Jurnal, and Piket, `bank_dokumen` also has `status_verifikasi`. While not required by R1, adding a 4th tab for "Dokumen" in `AdminVerifView.tsx` or updating `DokumenView.tsx` for Admin would be a high-value bonus.
3. **Row Level Security (RLS)**: RLS is disabled across all tables in this demo Supabase project. Mutations via `supabase.from(...).update(...)` will succeed directly with the anon key without requiring Postgres auth policies.

---

## 4. Conclusion & Actionable Implementation Plan

To fully satisfy Requirement R1, the implementer workers must execute the following concrete changes:

### 4.1 Update `src/components/AdminVerifView.tsx`

#### A. State & Tab Definitions
- Change `activeTab` type from `'Presensi' | 'Jurnal'` to `'Presensi' | 'Jurnal' | 'Piket'`.
- Add `piketList` state:
  ```typescript
  const [piketList, setPiketList] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Menunggu' | 'Disetujui' | 'Ditolak'>('Semua');
  ```

#### B. Tab Switcher UI
Add the "Piket" tab button alongside Presensi and Jurnal:
```tsx
<button
  type="button"
  onClick={() => setActiveTab('Piket')}
  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm border transition ${
    activeTab === 'Piket'
      ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800'
      : 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
  }`}
>
  <i className="fa-solid fa-shield-halved mr-1.5"></i> Piket
</button>
```

#### C. Realtime Channels
Add subscription for `laporan_piket`:
```typescript
const channelPiket = supabase
  .channel('verif-piket')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_piket' }, () => {
    if (activeTab === 'Piket') loadData();
  })
  .subscribe();

// Clean up in return:
return () => {
  supabase.removeChannel(channelPresensi);
  supabase.removeChannel(channelJurnal);
  supabase.removeChannel(channelPiket);
};
```

#### D. Dynamic Table & List Resolution Helper
```typescript
const getActiveConfig = () => {
  switch (activeTab) {
    case 'Presensi':
      return { table: 'presensi_guru', list: presensiList, nameKey: 'nama_guru', label: 'Presensi' };
    case 'Jurnal':
      return { table: 'jurnal_pembelajaran', list: jurnalList, nameKey: 'nama_guru', label: 'Jurnal' };
    case 'Piket':
      return { table: 'laporan_piket', list: piketList, nameKey: 'guru_pelapor', label: 'Laporan Piket' };
  }
};
```

#### E. Data Fetching in `loadData()`
Extend `loadData` to fetch `laporan_piket`:
```typescript
if (activeTab === 'Presensi') {
  query = supabase.from('presensi_guru').select('*');
  if (date) {
    query = query.gte('timestamp', getWitaStartOfDay(date)).lte('timestamp', getWitaEndOfDay(date));
  }
  query = query.order('timestamp', { ascending: false }).limit(100);
  const { data } = await query;
  if (data) setPresensiList(data);
} else if (activeTab === 'Jurnal') {
  query = supabase.from('jurnal_pembelajaran').select('*');
  if (date) {
    query = query.eq('tanggal', date);
  }
  query = query.order('timestamp', { ascending: false }).limit(100);
  const { data } = await query;
  if (data) setJurnalList(data);
} else if (activeTab === 'Piket') {
  query = supabase.from('laporan_piket').select('*');
  if (date) {
    query = query.eq('tanggal', date);
  }
  query = query.order('timestamp', { ascending: false }).limit(100);
  const { data } = await query;
  if (data) setPiketList(data);
}
```

#### F. Replace `verifyItem` with Modern Supabase Mutation & Feedback
Import SweetAlert2: `import Swal from 'sweetalert2';`
```typescript
const verifyItem = async (id: string, newStatus: 'Disetujui' | 'Ditolak') => {
  const { table, label } = getActiveConfig();
  setProcessingId(id);

  try {
    const { error } = await supabase
      .from(table)
      .update({ status_verifikasi: newStatus })
      .eq('id', id);

    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memverifikasi',
        text: error.message,
        confirmButtonColor: '#0B4619'
      });
    } else {
      // Optimistic update
      if (activeTab === 'Presensi') {
        setPresensiList(prev => prev.map(item => item.id === id ? { ...item, status_verifikasi: newStatus } : item));
      } else if (activeTab === 'Jurnal') {
        setJurnalList(prev => prev.map(item => item.id === id ? { ...item, status_verifikasi: newStatus } : item));
      } else {
        setPiketList(prev => prev.map(item => item.id === id ? { ...item, status_verifikasi: newStatus } : item));
      }

      Swal.fire({
        icon: newStatus === 'Disetujui' ? 'success' : 'info',
        title: `${label} ${newStatus}`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1800
      });
    }
  } catch (err: any) {
    Swal.fire('Error', err.message || 'Terjadi kesalahan jaringan', 'error');
  } finally {
    setProcessingId(null);
  }
};
```

#### G. Replace `bulkVerifyCurrent` with Robust Batch Updates
```typescript
const bulkVerifyCurrent = async () => {
  const { table, label } = getActiveConfig();
  const pendingItems = displayList.filter(item => item.status_verifikasi !== 'Disetujui');

  if (pendingItems.length === 0) {
    return Swal.fire('Info', `Semua ${label} yang tampil sudah berstatus Disetujui.`, 'info');
  }

  const result = await Swal.fire({
    title: 'Setujui Semua Tampil?',
    text: `Anda akan menyetujui ${pendingItems.length} data ${label} sekaligus.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#16a34a',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Ya, Setujui Semua',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  setLoading(true);
  try {
    const pendingIds = pendingItems.map(item => item.id);
    let hasError = false;

    for (let i = 0; i < pendingIds.length; i += 100) {
      const batchIds = pendingIds.slice(i, i + 100);
      const { error } = await supabase
        .from(table)
        .update({ status_verifikasi: 'Disetujui' })
        .in('id', batchIds);

      if (error) {
        hasError = true;
        Swal.fire('Gagal Sebagian', error.message, 'error');
        break;
      }
    }

    if (!hasError) {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Disetujui',
        text: `${pendingIds.length} data ${label} berhasil disetujui.`,
        confirmButtonColor: '#0B4619'
      });
      loadData();
    }
  } catch (err: any) {
    Swal.fire('Error', err.message || 'Gagal memproses persetujuan massal', 'error');
  } finally {
    setLoading(false);
  }
};
```

#### H. Card Rendering for Piket Tab
In `displayList.map`:
```tsx
{activeTab === 'Presensi' ? (
  <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
    <p><span className="font-semibold">Waktu:</span> {formatTimestampWita(item.timestamp)}</p>
    <p><span className="font-semibold">Tipe:</span> <span className="font-bold text-nizamudin-green dark:text-green-400">{item.tipe_absen}</span></p>
    <p><span className="font-semibold">Jenis:</span> {item.jenis_presensi} {item.detail_izin && `(${item.detail_izin})`}</p>
    {item.link_bukti && item.link_bukti !== '-' && (
      <a href={item.link_bukti} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline mt-1 block">
        <i className="fa-solid fa-link"></i> Bukti Lampiran
      </a>
    )}
  </div>
) : activeTab === 'Jurnal' ? (
  <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
    <p><span className="font-semibold">Tanggal:</span> {item.tanggal}</p>
    <p><span className="font-semibold">Kelas/Mapel:</span> {item.kelas} - {item.mapel}</p>
    <p className="line-clamp-2"><span className="font-semibold">Materi:</span> {item.materi}</p>
    {item.link_bukti_foto && item.link_bukti_foto !== '-' && (
      <a href={item.link_bukti_foto} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline mt-1 block">
        <i className="fa-solid fa-link"></i> Bukti Lampiran
      </a>
    )}
  </div>
) : (
  <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
    <p><span className="font-semibold">Tanggal:</span> {item.tanggal}</p>
    <p><span className="font-semibold">Guru Pelapor:</span> {item.guru_pelapor}</p>
    <p className="line-clamp-2"><span className="font-semibold">Catatan Apel:</span> {item.catatan_apel || '-'}</p>
    {item.link_foto && item.link_foto !== '-' && (
      <a href={item.link_foto} target="_blank" rel="noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline mt-1 block">
        <i className="fa-solid fa-camera"></i> Foto Piket
      </a>
    )}
  </div>
)}

<div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
  <button
    disabled={processingId === item.id || item.status_verifikasi === 'Disetujui'}
    onClick={() => verifyItem(item.id, 'Disetujui')}
    className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
      item.status_verifikasi === 'Disetujui'
        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 cursor-default opacity-80'
        : 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50'
    }`}
  >
    {processingId === item.id ? (
      <i className="fa-solid fa-spinner animate-spin"></i>
    ) : (
      <><i className="fa-solid fa-check"></i> Setujui</>
    )}
  </button>
  <button
    disabled={processingId === item.id || item.status_verifikasi === 'Ditolak'}
    onClick={() => verifyItem(item.id, 'Ditolak')}
    className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
      item.status_verifikasi === 'Ditolak'
        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 cursor-default opacity-80'
        : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
    }`}
  >
    {processingId === item.id ? (
      <i className="fa-solid fa-spinner animate-spin"></i>
    ) : (
      <><i className="fa-solid fa-xmark"></i> Tolak</>
    )}
  </button>
</div>
```

---

### 4.2 Secondary Enhancement in `src/components/PiketView.tsx`
In `PiketView.tsx` under "Laporan Terbaru" (lines 160-173):
1. Render status badge:
   ```tsx
   <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
     l.status_verifikasi === 'Disetujui' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
     l.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
   }`}>{l.status_verifikasi || 'Menunggu'}</span>
   ```
2. If `user?.role === 'Admin'`, provide quick verify buttons:
   ```tsx
   {!isGuru && (
     <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
       <button onClick={() => updatePiketStatus(l.id, 'Disetujui')} className="flex-1 bg-green-500 text-white text-[10px] font-bold py-1 rounded">Setujui</button>
       <button onClick={() => updatePiketStatus(l.id, 'Ditolak')} className="flex-1 bg-red-500 text-white text-[10px] font-bold py-1 rounded">Tolak</button>
     </div>
   )}
   ```
   With handler:
   ```typescript
   const updatePiketStatus = async (id: string, status: string) => {
     const { error } = await supabase.from('laporan_piket').update({ status_verifikasi: status }).eq('id', id);
     if (error) Swal.fire('Error', error.message, 'error');
     else {
       Swal.fire({ icon: 'success', title: `Laporan ${status}`, toast: true, position: 'top-end', timer: 1500, showConfirmButton: false });
       fetchDataPiket();
     }
   };
   ```

---

## 5. Verification Method

To independently verify the implementation after workers complete the changes:

### 5.1 Static Verification (TypeScript & Build)
Run:
```bash
npx tsc --noEmit
npm run build
```
Verify 0 compilation errors and successful Next.js build.

### 5.2 Functional Verification (Database Mutation Audit)
1. **Presensi Verification Test**:
   - Navigate to Admin Verifikasi -> Presensi.
   - Click "Setujui" or "Tolak" on a pending presensi record.
   - Run SQL check:
     ```sql
     SELECT id, status_verifikasi FROM presensi_guru WHERE id = '<item_id>';
     ```
   - Verify `status_verifikasi` equals `'Disetujui'` or `'Ditolak'`.
2. **Jurnal Verification Test**:
   - Navigate to Admin Verifikasi -> Jurnal.
   - Click "Setujui" or "Tolak" on a pending jurnal record.
   - Run SQL check:
     ```sql
     SELECT id, status_verifikasi FROM jurnal_pembelajaran WHERE id = '<item_id>';
     ```
   - Verify `status_verifikasi` equals the clicked status.
3. **Piket Verification Test**:
   - Navigate to Admin Verifikasi -> Piket.
   - Verify that all rows from `laporan_piket` load properly, displaying teacher name (`guru_pelapor`), `tanggal`, `catatan_apel`, and photo link.
   - Click "Setujui" on a pending piket record.
   - Run SQL check:
     ```sql
     SELECT id, status_verifikasi FROM laporan_piket WHERE id = '<item_id>';
     ```
   - Verify `status_verifikasi` updated to `'Disetujui'`.
4. **Bulk Verification Test**:
   - Click "Setujui Semua Tampil" on any tab.
   - Confirm the SweetAlert modal appears.
   - After confirmation, verify in database that all displayed rows are updated to `'Disetujui'`.
   - Verify that toast notification appears with total approved count.

### 5.3 Invalidation Conditions
- Any code where `verifyItem` continues to use browser `alert()` or `confirm()`.
- Any code where clicking "Setujui" on Piket modifies `jurnal_pembelajaran` instead of `laporan_piket`.
- Any failure in `bulkVerifyCurrent` to handle Piket records.
- Any regression breaking the TypeScript build (`npx tsc --noEmit`).
