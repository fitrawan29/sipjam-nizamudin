# Survey Report: Form Jurnal KBM Restructuring (R2)

**Component**: `src/components/GuruJurnal.tsx`  
**Date**: 2026-10-03  
**Explorer**: Explorer Survey 2 (R2 Scope)  
**Parent Orchestrator ID**: `9158af2a-a31a-4d06-bc79-2701bb3d1192`

---

## 1. Executive Summary

This report surveys `src/components/GuruJurnal.tsx` (specifically the `tipeJurnal === 'Jurnal KBM'` section) to evaluate the restructuring of the KBM Journal form based on the original requirements and the updated user corrections received on 2026-10-03T07:18:07Z.

### Key Takeaways:
1. **Form Order**: The user updated the form order to a sequence of 12 fields (No, Hari/Tanggal, Tujuan Pembelajaran, KKTP, Konten, Kegiatan Pembelajaran, Mapel, Kelas, Absensi Murid, Lokasi KBM, Dokumentasi KBM, Catatan).
2. **Display vs Storage for Date**: Hari/Tanggal must be displayed in read-only `DD-MM-YYYY` format (e.g., `03-10-2026`), while the state and database payload must store `YYYY-MM-DD` (e.g., `2026-10-03`).
3. **Konten replaces Materi Pembelajaran**: A new required textarea field `konten` replaces the old `materi` text input. In the database, it writes to `konten` and is dual-written to `materi` / `materi_pembelajaran` for backwards compatibility.
4. **Kegiatan Pembelajaran remains separate and required**: It is retained as field #6.
5. **Pertemuan ke- and Jam ke- UI Adjustment**: The old separate grid `[Pertemuan Ke-] [Jam Ke-]` is removed. `Jam ke-` is removed completely from the form UI (retained in state/payload in the background). `Pertemuan ke-` is represented as field #1 (`No.`, auto-filled, editable).
6. **New Required Fields**: `kktp` (textarea) and `lokasi_kbm` (text input) require new React state, strict validation, and mapping to new columns in `jurnal_pembelajaran`.
7. **Orientation**: `CameraSelfieCapture` already correctly receives `orientation="landscape"` in `GuruJurnal.tsx` (line 1086).

---

## 2. Current State vs Target State Comparison

| No | Target Field Name | Component / HTML Element | State Variable | Validation | Target DB Column | Existing Location in `GuruJurnal.tsx` | Status / Modification Needed |
|:---|:---|:---|:---|:---|:---|:---|:---|
| 1 | **No.** (pertemuan_ke) | Text input (`w-full` or compact) | `pertemuanKe`, `setPertemuanKe` | Required (auto-fill default `'1'`) | `pertemuan_ke` | Line 898-911 (Grid with `jamKe`) | Relocate to field #1. Keep auto-fill hook (lines 314-336). |
| 2 | **Hari/Tanggal** | Text input (read-only) | `tanggal` (YYYY-MM-DD) | Auto-filled today | `tanggal` | Line 930-934 (`input type="date"`) | Change from datepicker to read-only `DD-MM-YYYY` display. Value sent to DB remains `YYYY-MM-DD`. |
| 3 | **Tujuan Pembelajaran** | Textarea (`rows={2}`) | `tujuanPembelajaran` | Required (`*`) | `tujuan_pembelajaran` | Line 941-955 | Reposition to #3. Add explicit JS validation. |
| 4 | **KKTP** | Textarea (`rows={2}`) | `kktp`, `setKktp` *(NEW)* | Required (`*`) | `kktp` *(NEW)* | *None (Not present)* | **NEW FIELD**. Create state, add validation, save to `kktp`. |
| 5 | **Konten** | Textarea (`rows={2}`) | `konten`, `setKonten` *(NEW)* | Required (`*`) | `konten` *(NEW)* + dual-write `materi` | *Replaces old `materi` input* | **NEW FIELD**. Replaces `Materi Pembelajaran`. Dual-write to `materi` & `materi_pembelajaran`. |
| 6 | **Kegiatan Pembelajaran** | Textarea (`rows={2}`) | `kegiatan` | Required (`*`) | `kegiatan` | Line 957-962 | Keep as required textarea, reposition to #6. |
| 7 | **Mata Pelajaran (Mapel)** | Select dropdown | `mapel` | Required (`*`) | `mapel` | Line 861-878 | Dropdown from `mapelList`. Retain auto-sync and Guru Inval overrides. |
| 8 | **Kelas** | Select dropdown | `kelas` | Required (`*`) | `kelas` | Line 879-895 | Dropdown from `kelasList`. Retain `fetchStudents` trigger and auto-sync. |
| 9 | **Absensi Murid** | Interactive H/I/S/A buttons per student | `absensi`, `students`, `kehadiranMurid` | Live per student | `absensi_siswa`, `kehadiran_murid`, syncs to `public.absensi` | Line 964-977 & 986-1024 | Retain student list with H/S/I/A buttons, summary string, and live sync to `public.absensi`. |
| 10 | **Lokasi KBM** | Text input | `lokasiKbm`, `setLokasiKbm` *(NEW)* | Required (`*`) | `lokasi_kbm` *(NEW)* + `lokasi` | *None (previously only auto GPS)* | **NEW FIELD**. Text input (e.g., "Ruang Kelas 7A"). Add validation, save to `lokasi_kbm`. |
| 11 | **Dokumentasi KBM** | `CameraSelfieCapture` + optional Gallery | `file`, `photoPreviewUrl`, `uploadMode` | Required (File) | `link_bukti_foto`, `foto_kegiatan` | Line 1026-1186 | Already passes `orientation="landscape"`. Retain photo required check. |
| 12 | **Catatan** | Textarea | `refleksi` (and `catatanSiswa`) | Optional | `catatan_refleksi`, `refleksi` | Line 1188-1191 & Line 980-984 | Optional reflection/notes field. |
| - | *(Jam Ke-)* | *Removed from form UI* | `jamKe` | Background / auto | `jam_ke` | Line 912-925 | **REMOVED FROM UI**. Preserved in state and auto-filled from schedule, saved in background. |

---

## 3. Detailed Component & State Analysis

### 3.1 State Additions & Adjustments
In `src/components/GuruJurnal.tsx`:
```typescript
// Existing states to keep:
const [tipeJurnal, setTipeJurnal] = useState('Jurnal KBM');
const [tanggal, setTanggal] = useState(''); // Stores YYYY-MM-DD
const [mapel, setMapel] = useState('');
const [kelas, setKelas] = useState('');
const [pertemuanKe, setPertemuanKe] = useState('');
const [jamKe, setJamKe] = useState('');
const [tujuanPembelajaran, setTujuanPembelajaran] = useState('');
const [kegiatan, setKegiatan] = useState('');
const [refleksi, setRefleksi] = useState('');
const [catatanSiswa, setCatatanSiswa] = useState('');
const [file, setFile] = useState<File | null>(null);

// NEW STATES to add:
const [kktp, setKktp] = useState('');
const [konten, setKonten] = useState('');
const [lokasiKbm, setLokasiKbm] = useState('');
```

### 3.2 Date Formatting Display Helper
`tanggal` is initialized in `useEffect` (line 218) via `setTanggal(getWitaDateStr())` as `'YYYY-MM-DD'` (e.g. `'2026-10-03'`).
To display in `DD-MM-YYYY` read-only format:
```typescript
const displayTanggal = (() => {
  if (!tanggal) return '';
  const parts = tanggal.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  return tanggal;
})();
```
In JSX:
```tsx
<div>
  <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
    Hari / Tanggal
  </label>
  <div className="relative">
    <input
      type="text"
      readOnly
      value={displayTanggal}
      className="w-full px-3 py-2.5 text-sm rounded-xl input-premium font-semibold text-gray-700 dark:text-gray-200 bg-gray-100/80 dark:bg-gray-800/80 cursor-default"
    />
    <i className="fa-solid fa-calendar-day absolute right-3 top-3 text-gray-400"></i>
  </div>
</div>
```

### 3.3 Auto-fill Hooks Continuity
The auto-fill hooks do not depend on the visual order of form fields:
1. **Jadwal Auto-Fill** (lines 284-311): Sets `mapel`, `kelas`, and `jamKe` when `dailyState.jadwalKBM` has a single schedule entry for today.
2. **Pertemuan Ke- Auto-Fill** (lines 314-336): Runs whenever `mapel` or `kelas` changes. Queries the latest `pertemuan_ke` from `jurnal_pembelajaran` for that teacher, mapel, and class, and increments it by 1 (or defaults to `'1'`).
3. **Student Roster & Attendance Auto-Fill** (lines 370-407): Runs whenever `kelas` changes. Fetches `data_siswa` and pre-populates attendance from `absensi` for that date and class.
4. **Guru Inval Mode** (lines 43-47, 646-691, 791-835): When active, overrides `mapelList` and `kelasList` with the substituted teacher's schedule.

All of these remain 100% operational because they communicate via React state.

---

## 4. Submission, Validation, and Supabase Payload Logic

### 4.1 Client-Side Validation (`handleJurnalSubmit`)
Currently, `handleJurnalSubmit` only checks `if (!file)`. The remaining validations relied on HTML5 `required` attributes.
For the new structure, we must introduce explicit programmatic validations:
```typescript
if (tipeJurnal === 'Jurnal KBM') {
  if (!tujuanPembelajaran.trim()) {
    return showToast('Validasi Gagal', 'Tujuan Pembelajaran wajib diisi.', 'warning');
  }
  if (!kktp.trim()) {
    return showToast('Validasi Gagal', 'KKTP (Kriteria Ketercapaian Tujuan Pembelajaran) wajib diisi.', 'warning');
  }
  if (!konten.trim()) {
    return showToast('Validasi Gagal', 'Konten pembelajaran wajib diisi.', 'warning');
  }
  if (!kegiatan.trim()) {
    return showToast('Validasi Gagal', 'Kegiatan Pembelajaran wajib diisi.', 'warning');
  }
  if (!mapel) {
    return showToast('Validasi Gagal', 'Silakan pilih Mata Pelajaran.', 'warning');
  }
  if (!kelas) {
    return showToast('Validasi Gagal', 'Silakan pilih Kelas.', 'warning');
  }
  if (!lokasiKbm.trim()) {
    return showToast('Validasi Gagal', 'Lokasi KBM wajib diisi.', 'warning');
  }
} else {
  // Jurnal Kegiatan validations
  if (!materi.trim()) {
    return showToast('Validasi Gagal', 'Nama Kegiatan wajib diisi.', 'warning');
  }
  if (!kegiatan.trim()) {
    return showToast('Validasi Gagal', 'Uraian / Deskripsi kegiatan wajib diisi.', 'warning');
  }
}

if (!file) {
  return showToast('Foto Dokumentasi Wajib', 'Silakan ambil foto dokumentasi pembelajaran menggunakan kamera atau unggah dari galeri.', 'warning');
}
```

### 4.2 Database Insert Payload (`newJurnal`)
The object constructed and sent to `supabase.from('jurnal_pembelajaran').insert([newJurnal])` must incorporate the new columns while maintaining backward compatibility:

```typescript
const computedKehadiran = tipeJurnal === 'Jurnal KBM'
  ? (kehadiranMurid || calculateKehadiranSummary(absensi, students))
  : 'Hadir';

const invalPrefix = isInval && guruDigantikan
  ? `[INVAL - Menggantikan: ${guruDigantikan.nama}] `
  : '';

const newJurnal = {
  id: crypto.randomUUID(),
  timestamp: getWitaTimestamp(),
  nama_guru: user.nama,
  user_id: user.id,
  mapel: tipeJurnal === 'Jurnal KBM' ? mapel : '-',
  kelas: tipeJurnal === 'Jurnal KBM' ? kelas : '-',
  tanggal: tanggal, // YYYY-MM-DD
  materi: tipeJurnal === 'Jurnal KBM' ? konten.trim() : materi.trim(),
  kegiatan: kegiatan.trim(),
  absensi_siswa: JSON.stringify(absensi),
  keterangan: `${invalPrefix}${tipeJurnal}`,
  refleksi: refleksi.trim(),
  detail_absen: '',
  link_bukti_foto: fileUrl,
  status_verifikasi: 'Menunggu',
  catatan_khusus_siswa: catatanSiswa,
  
  // Dual-write legacy & R2 columns
  pertemuan_ke: tipeJurnal === 'Jurnal KBM' ? (pertemuanKe || '1') : '-',
  jam_ke: tipeJurnal === 'Jurnal KBM' ? (jamKe || '1-2') : '-',
  tujuan_pembelajaran: tipeJurnal === 'Jurnal KBM' ? tujuanPembelajaran.trim() : '-',
  materi_pembelajaran: tipeJurnal === 'Jurnal KBM' ? konten.trim() : materi.trim(),
  kehadiran_murid: computedKehadiran,
  catatan_refleksi: refleksi.trim() || '-',
  foto_kegiatan: fileUrl,

  // New columns
  kktp: tipeJurnal === 'Jurnal KBM' ? kktp.trim() : null,
  konten: tipeJurnal === 'Jurnal KBM' ? konten.trim() : null,
  lokasi_kbm: tipeJurnal === 'Jurnal KBM' ? lokasiKbm.trim() : null,

  // Location & Watermark
  latitude: uploadLatitude ?? (jurnalCoords?.latitude || null),
  longitude: uploadLongitude ?? (jurnalCoords?.longitude || null),
  lokasi: (tipeJurnal === 'Jurnal KBM' && lokasiKbm.trim())
    ? lokasiKbm.trim()
    : (uploadLokasi || (jurnalCoords ? `GPS: ${jurnalCoords.latitude.toFixed(5)}, ${jurnalCoords.longitude.toFixed(5)}` : '-')),
  waktu_upload: uploadWaktu || getWitaTimestamp(),
  ...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})
};
```

### 4.3 Form Reset After Successful Submit
In lines 612-629, add reset calls for the new states:
```typescript
setPertemuanKe('');
setTujuanPembelajaran('');
setKktp('');
setKonten('');
setKegiatan('');
setLokasiKbm('');
setRefleksi('');
setCatatanSiswa('');
setFile(null);
setPhotoPreviewUrl(null);
setIsInval(false);
setGuruDigantikan(null);
```

---

## 5. Separation of Jurnal KBM vs Jurnal Kegiatan Form Layout

Currently, `GuruJurnal.tsx` intersperses `tipeJurnal === 'Jurnal KBM'` ternaries inside a single mixed form.  
When restructuring:
- If `tipeJurnal === 'Jurnal KBM'`, render the clean 12-field layout in exact sequence.
- If `tipeJurnal === 'Jurnal Kegiatan'` (due to Sistem Blok, Dinas Luar, or no KBM schedule), render the existing simple form:
  - Tanggal (`input type="date"`)
  - Nama Kegiatan (`materi`)
  - Uraian / Deskripsi (`kegiatan`)
  - Foto Dokumentasi (`CameraSelfieCapture`)
  - Catatan Refleksi (`refleksi`)

This clean conditional rendering prevents regression in Sistem Blok or non-teaching days.

---

## 6. Implementation Checklist for Developer Agent

- [ ] Add `kktp`, `konten`, `lokasiKbm` states in `GuruJurnal.tsx`.
- [ ] Add `displayTanggal` helper formatting `tanggal` to `DD-MM-YYYY` for read-only display.
- [ ] Reorganize JSX under `{tipeJurnal === 'Jurnal KBM'}` into fields 1 to 12 in exact order.
- [ ] Remove `jam_ke` from the UI form display while preserving `jamKe` state and DB payload.
- [ ] Add explicit validation for `tujuanPembelajaran`, `kktp`, `konten`, `kegiatan`, `mapel`, `kelas`, `lokasiKbm`, and `file` in `handleJurnalSubmit`.
- [ ] Update `newJurnal` insert payload with `kktp`, `konten`, `lokasi_kbm`, and dual-write `konten` to `materi` and `materi_pembelajaran`.
- [ ] Update form reset logic with `setKktp('')`, `setKonten('')`, `setLokasiKbm('')`.
- [ ] Verify `npm run build` / `tsc --noEmit` passes with 0 errors.
