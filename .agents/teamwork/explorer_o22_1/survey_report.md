# Survey Report: Feature R1 — WhatsApp Parent 1-Click Notifications in PiketView & RekapSiswaView

**Investigator**: `explorer_o22_1`  
**Date**: 2026-10-16  
**Status**: Completed (Read-Only Analysis)

---

## Executive Summary
Feature R1 requires 1-click WhatsApp notifications to parents with polite Indonesian attendance messages for any student row across `PiketView.tsx` and `RekapSiswaView.tsx`.
Our codebase survey reveals:
1. **`no_hp_ortu` is ALREADY present** on the Supabase `public.data_siswa` table (`no_hp_ortu: string | null` in `src/types/database.ts:333`).
2. **`no_hp_ortu` is ALREADY fetched in memory** in all key locations (`PiketView.tsx` line 1146, `RekapSiswaView.tsx` lines 160, 228, 528) because they all execute `supabase.from('data_siswa').select('*')`.
3. **No database migrations or new schema tables are needed.**
4. **SweetAlert2 (`Swal.fire`)** is standard across the app, making the fallback dialog for missing phone numbers (or manual input/clipboard copying) seamless with zero new dependencies.
5. A lightweight, centralized utility module (`src/lib/whatsapp.ts`) will cleanly handle Indonesian phone normalization (`08...`, `+62...` -> `628...`), message formatting, URI generation (`https://wa.me/...`), and the Swal fallback interaction.

---

## 1. Deep Dive: `src/components/PiketView.tsx`

### 1.1 Where Student Attendance Lists / Rows Are Rendered
There are three main places where student rows appear in `PiketView.tsx`:

#### A. Presensi Siswa Tab — Manual Roster Table (Admin / Desktop Mode)
- **Code Location**: Lines 2630–2750 (`filteredManualStudents.map((s, idx) => ...)`).
- **Data Source**: Populated from `allStudents` state.
- **Data Fields Available**:
  - `s` contains full `data_siswa` fields: `id`, `nama_siswa`, `nisn`, `kelas`, `gender`, `no_hp_ortu`, `qr_code`.
  - Also calculated for each row: `datangRecord` (scan datang) and `pulangRecord` (scan pulang).
- **Proposed Button Placement**:
  - Add column header: `<th className="py-3 px-3 text-center">WA Ortu</th>` (or Action column).
  - In each row: A 1-click WhatsApp action button:
    ```tsx
    <button
      type="button"
      onClick={() => handleSendWhatsApp(s, datangRecord ? 'Hadir' : 'Belum Hadir', datangRecord?.jam)}
      title="Kirim WhatsApp ke Orang Tua"
      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 transition"
    >
      <i className="fa-brands fa-whatsapp text-sm text-emerald-600"></i>
    </button>
    ```

#### B. Presensi Siswa Tab — Live Scan Log Table (Admin / Desktop Mode)
- **Code Location**: Lines 2843–2902 (`filteredTodayScans.map((item, idx) => ...)`).
- **Data Source**: `todayScans` state (queried from `presensi_siswa` via `getRecentPresensiSiswa`).
- **Data Fields Available**: `item.nama_siswa`, `item.kelas`, `item.nisn`, `item.status`, `item.jam`, `item.siswa_id`.
  - While `presensi_siswa` rows do not store `no_hp_ortu` directly, `item.siswa_id` and `item.nisn` link directly to `allStudents`.
  - Resolving phone:
    ```ts
    const student = allStudents.find(st => st.id === item.siswa_id || (item.nisn && st.nisn === item.nisn));
    const noHpOrtu = student?.no_hp_ortu;
    ```
- **Proposed Button Placement**:
  - Add an action column or an icon button next to status pill (`<button onClick={() => ...}><i className="fa-brands fa-whatsapp"></i></button>`).

#### C. Presensi Siswa Tab — Mobile / Guru View (Touch-Friendly Cards)
- **Code Location**: Lines 3210–3290 (`filteredManualStudents.map((s, idx) => ...)`).
- **Data Source**: `s` from `filteredManualStudents` (has `s.no_hp_ortu`).
- **Proposed Button Placement**:
  - In the card header or alongside Datang/Pulang action buttons:
    ```tsx
    <button
      type="button"
      onClick={() => handleSendWhatsApp(s, datangRecord ? 'Hadir' : 'Belum Hadir', datangRecord?.jam)}
      className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center justify-center transition shrink-0"
      title="Kirim WA ke Orang Tua"
    >
      <i className="fa-brands fa-whatsapp text-base"></i>
    </button>
    ```

#### D. Form Lapor Tab — Classroom Student Absence List
- **Code Location**: Lines 3676–3708 (`allStudents.filter(s => s.kelas === activeKelas).map((siswa, idx) => ...)`).
- **Data Source**: `siswa` from `allStudents` (has `siswa.no_hp_ortu`, `piketAbsensi[siswa.nisn]`).
- **Proposed Button Placement**:
  - Beside the `[H] [S] [I] [A]` buttons, allowing picket teachers who mark a student as S, I, or A to immediately alert parents with 1 click.

---

## 2. Deep Dive: `src/components/RekapSiswaView.tsx`

### 2.1 Where Student Attendance Lists / Rows Are Rendered

#### A. Presensi Gerbang Tab (Gate Attendance)
- **Code Location**: Lines 1304–1369 (`filteredGerbangStudents.map((siswa, idx) => ...)`).
- **Data Source**: `gerbangStudents`, queried at lines 228–233 from `supabase.from('data_siswa').select('*').eq('kelas', gerbangKelas)`.
- **Data Fields Available**:
  - Each item `siswa` is `{ ...siswa, datang, pulang, jamDatang, jamPulang, hasDatang, hasPulang, isBolos }`.
  - **`siswa.no_hp_ortu` is 100% available and already loaded!**
- **Proposed Button Placement**:
  - Add table header:
    ```tsx
    <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:hidden text-center w-20">WA Ortu</th>
    ```
  - In each row:
    ```tsx
    <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:hidden text-center">
      <button
        type="button"
        onClick={() => handleSendParentWhatsApp(siswa, {
          status: siswa.isBolos ? 'Bolos' : siswa.hasPulang ? 'Pulang' : siswa.hasDatang ? 'Hadir' : 'Belum Presensi',
          tanggal: gerbangTanggal,
          jam: siswa.jamDatang || siswa.jamPulang
        })}
        title="Kirim WhatsApp ke Orang Tua"
        className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold transition inline-flex items-center gap-1"
      >
        <i className="fa-brands fa-whatsapp text-sm text-emerald-600"></i>
        <span>Kirim</span>
      </button>
    </td>
    ```
  - Note: Using `print:hidden` ensures clean PDF/print document rendering without UI buttons.

#### B. Rekap Absen Siswa Tab (Harian & KBM)
- **Code Location**: Lines 1528–1582 (`filteredData.map((s, i) => ...)`).
- **Data Source**: `rekapData`, generated in `handleGenerateRekap` (lines 526–719) from `supabase.from('data_siswa').select('*').eq('kelas', targetKelas)`.
- **Data Fields Available**:
  - Initialized with `rekapMap[s.nama_siswa] = { ...s, hadir: 0, sakit: 0, izin: 0, alpa: 0, bolos: 0, total: 0, persentase: 0 }`.
  - **`s.no_hp_ortu` is preserved and available!**
- **Proposed Button Placement**:
  - Add table header: `<th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:hidden text-center w-20">WA Ortu</th>`.
  - In each row: A WhatsApp button to send the cumulative attendance summary to the parent (especially useful for students with high Alpa/Bolos).

#### C. Wali Kelas Intervensi Input Form
- **Code Location**: Lines 989–1060 (`waliStudents.map((siswa, idx) => ...)`).
- **Data Source**: `waliStudents`, fetched at lines 158–170 from `supabase.from('data_siswa').select('*')`.
- **Data Fields Available**: `siswa.no_hp_ortu` is present!
- **Proposed Button Placement**:
  - A compact WhatsApp icon button in the header/action area of each student's card.

---

## 3. Supabase Query & Schema Structure

### 3.1 `data_siswa` Schema
Verified in `src/types/database.ts` (lines 326–369):
```typescript
data_siswa: {
  Row: {
    id: string;
    nama_siswa: string | null;
    nisn: string | null;
    kelas: string | null;
    gender: string | null;
    status: string | null;
    no_hp_ortu: string | null;   // <--- Already exists!
    qr_code: string | null;
    sekolah_id: string;
  }
}
```

### 3.2 Fetch Patterns
- `PiketView.tsx` line 1146:
  `let query = supabase.from('data_siswa').select('*').order('kelas', { ascending: true }).order('nama_siswa', { ascending: true });`
- `RekapSiswaView.tsx` line 228:
  `let sQ = supabase.from('data_siswa').select('*').eq('kelas', gerbangKelas).order('nama_siswa', { ascending: true });`
- `RekapSiswaView.tsx` line 527:
  `let siswaQuery = supabase.from('data_siswa').select('*').eq('kelas', targetKelas).order('nama_siswa', { ascending: true });`

**Finding**: All relevant queries already use `select('*')`. No changes to SQL schema, migrations, or query fields are needed.

---

## 4. Dialog & Alert Handling in the App

- **SweetAlert2 (`import Swal from 'sweetalert2'`)** is the established standard across all pages (`PiketView`, `RekapSiswaView`, `AdminDataView`, `AppScreen`, etc.).
- `src/lib/toast.ts` provides `Toast` (Swal toast mixin) and `showToast`.
- **FontAwesome 6**: Includes `fa-brands fa-whatsapp`, `fa-solid fa-copy`, `fa-solid fa-paper-plane`.
- **Fallback UX when `no_hp_ortu` is empty**:
  ```ts
  const { value: manualNumber, isConfirmed, isDenied } = await Swal.fire({
    title: 'No. HP Orang Tua Belum Terdaftar',
    html: `
      <div class="text-left space-y-2 text-xs">
        <p class="text-gray-600 dark:text-gray-300">
          Data nomor WhatsApp untuk siswa <b>${student.nama_siswa}</b> belum tercatat di sistem.
        </p>
        <div>
          <label class="font-bold text-gray-700 dark:text-gray-200 block mb-1">
            Masukkan Nomor WhatsApp Sementara:
          </label>
          <input id="swal-manual-phone" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: 081234567890">
        </div>
      </div>
    `,
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: '<i class="fa-brands fa-whatsapp mr-1"></i> Kirim WhatsApp',
    denyButtonText: '<i class="fa-solid fa-copy mr-1"></i> Salin Pesan',
    cancelButtonText: 'Tutup',
    confirmButtonColor: '#25D366', // WhatsApp green
    denyButtonColor: '#0d9488',   // Teal
    preConfirm: () => {
      return (document.getElementById('swal-manual-phone') as HTMLInputElement)?.value?.trim();
    }
  });
  ```
  - If `isConfirmed` and `manualNumber`: normalize and open WhatsApp.
  - If `isDenied`: copy message to clipboard via `navigator.clipboard.writeText(...)` and show `showToast('Pesan berhasil disalin ke clipboard!', '', 'success')`.

---

## 5. Phone Normalization & WhatsApp URI Architecture

### 5.1 Indonesian Phone Normalization Rule
Standard Indonesian inputs vary widely:
- `0812-3456-7890`
- `+62 812 3456 7890`
- `6281234567890`
- `81234567890`
- `0812 (3456) 7890`

**Normalization logic**:
```typescript
export function normalizeIndonesianPhone(phone?: string | null): string | null {
  if (!phone) return null;
  // Strip non-digits
  let clean = phone.replace(/\D/g, '');
  if (!clean) return null;

  // Transform leading digits
  if (clean.startsWith('08')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  } else if (clean.startsWith('6208')) {
    clean = '628' + clean.slice(4);
  }

  // Validate length and prefix (standard Indonesian cellular: 628 + 7 to 12 digits -> total 10 to 15 digits)
  if (/^628\d{7,12}$/.test(clean)) {
    return clean;
  }
  return null;
}
```

### 5.2 Polite Indonesian Message Format
```typescript
export function formatParentAttendanceMessage({
  namaSiswa,
  kelas,
  status,
  tanggal,
  jam,
  namaSekolah = 'Sekolah',
  catatan
}: {
  namaSiswa: string;
  kelas: string;
  status: string;
  tanggal?: string;
  jam?: string;
  namaSekolah?: string;
  catatan?: string;
}): string {
  const tglStr = tanggal || new Date().toISOString().split('T')[0];
  let msg = `Yth. Orang Tua / Wali dari *${namaSiswa}* (Kelas ${kelas}),\n\n`;
  msg += `Pemberitahuan presensi dari *${namaSekolah}*:\n`;
  msg += `📅 Tanggal: ${tglStr}\n`;
  msg += `📌 Status Kehadiran: *${status}*\n`;
  if (jam) msg += `⏰ Waktu: ${jam} WITA\n`;
  if (catatan) msg += `📝 Catatan: ${catatan}\n`;
  msg += `\nPesan ini dikirimkan untuk memastikan pemantauan kehadiran putra/putri Bapak/Ibu di sekolah. Terima kasih atas perhatian dan kerja samanya.`;
  return msg;
}
```

### 5.3 Native WhatsApp URI
```typescript
export function buildWhatsAppUrl(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
```

---

## 6. Minimal Changes Plan (Ponytail Compliance)

1. **New Utility File**: `src/lib/whatsapp.ts` (~80 lines)
   - Contains `normalizeIndonesianPhone`, `formatParentAttendanceMessage`, `buildWhatsAppUrl`, and `sendParentWhatsAppNotification(student, options)`.
   - Zero external npm libraries; pure browser native + SweetAlert2.
2. **Modify `src/components/PiketView.tsx`**:
   - Import `sendParentWhatsAppNotification`.
   - Add WhatsApp button to:
     - Manual attendance table (`filteredManualStudents`)
     - Scan log table (`filteredTodayScans`)
     - Guru compact view cards (`filteredManualStudents`)
3. **Modify `src/components/RekapSiswaView.tsx`**:
   - Import `sendParentWhatsAppNotification`.
   - Add WhatsApp button to:
     - Presensi Gerbang table (`filteredGerbangStudents`) with `print:hidden`
     - Rekap Absen table (`filteredData`) with `print:hidden`
     - Wali Kelas input cards (`waliStudents`)
4. **New Test Suite**: `tests/whatsapp_parent_notify_and_autosave.test.ts`
   - Test normalization of all phone patterns (`08...`, `+62...`, `62...`, `8...`, dashed, parentheses, invalid).
   - Test message construction and URI encoding.
   - Run via `npx tsx tests/whatsapp_parent_notify_and_autosave.test.ts`.
