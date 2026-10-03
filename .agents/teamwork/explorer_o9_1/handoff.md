# Handoff Report — Investigation of `src/components/GuruJurnal.tsx` (R1, R2, R3)

**Author:** explorer_o9_1  
**Target:** parent (`39ee7d4d-26ad-4d48-ad3e-07ef312a4b5b`) / implementer  
**File under Investigation:** `src/components/GuruJurnal.tsx`  
**Philosophy:** Ponytail (lazy, minimal edits, standard libraries, no over-engineering)

---

## 1. Observation

Direct code observations from `src/components/GuruJurnal.tsx`:

### R1. Hilangkan Field "Pertemuan ke" dan "Jam ke"
1. **State & Default Value** (`src/components/GuruJurnal.tsx:25-26`):
   ```tsx
   const [pertemuanKe, setPertemuanKe] = useState('');
   const [jamKe, setJamKe] = useState('');
   ```
2. **Auto-fill Routine** (`src/components/GuruJurnal.tsx:318-321` and `326-348`):
   - `jamKe` auto-filled if `dailyState.jadwalKBM` exists:
     ```tsx
     if (j.jam_mulai && !jamKe) {
       setJamKe(j.jam_selesai ? `${j.jam_mulai} - ${j.jam_selesai}` : j.jam_mulai);
     }
     ```
   - `pertemuanKe` auto-filled via query to `jurnal_pembelajaran`:
     ```tsx
     if (data && data[0]?.pertemuan_ke) {
       const last = parseInt(data[0].pertemuan_ke, 10);
       if (!isNaN(last)) setPertemuanKe(String(last + 1));
     } else {
       setPertemuanKe('1');
     }
     ```
3. **Submit Validation** (`src/components/GuruJurnal.tsx:494-496`):
   ```tsx
   if (!pertemuanKe || !pertemuanKe.trim()) {
     return showToast('No. Pertemuan Wajib', 'Silakan isi nomor pertemuan KBM.', 'warning');
   }
   ```
   *Note:* There is currently **no** submit validation for `jamKe`.
4. **Insert Payload** (`src/components/GuruJurnal.tsx:573-574`):
   ```tsx
   pertemuan_ke: tipeJurnal === 'Jurnal KBM' ? (pertemuanKe || '1') : '-',
   jam_ke: tipeJurnal === 'Jurnal KBM' ? (jamKe || '1-2') : '-',
   ```
5. **Form Reset** (`src/components/GuruJurnal.tsx:669-670`):
   ```tsx
   setPertemuanKe('');
   setJamKe('');
   ```
6. **UI Rendering** (`src/components/GuruJurnal.tsx:903-930`):
   ```tsx
   {/* 1. No. & 2. Hari/Tanggal */}
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 fade-in">
     <div>
       <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1 flex items-center gap-1">
         No. <span className="text-red-500">*</span>
         {pertemuanKe && <span className="text-[9px] text-green-600 dark:text-green-400 font-normal">(terisi otomatis)</span>}
       </label>
       <input
         type="text"
         value={pertemuanKe}
         onChange={e => setPertemuanKe(e.target.value)}
         required
         placeholder="Contoh: 1 atau 1-2"
         className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
       />
     </div>
     <div>
       <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
         Hari/Tanggal
       </label>
       <input
         type="text"
         value={formatDisplayDate(tanggal)}
         readOnly
         className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
       />
     </div>
   </div>
   ```
   *Note:* There is currently **no** UI input element for `Jam ke` in `GuruJurnal.tsx`. Only `No.` (`pertemuanKe`) is rendered in UI.

---

### R2. Format Kehadiran Murid
1. **Attendance Calculation Function** (`src/components/GuruJurnal.tsx:71-95`):
   ```tsx
   const calculateKehadiranSummary = (abs: Record<string, string>, stList: any[]): string => {
     if (!stList || stList.length === 0) return 'Semua Hadir';
     const counts = { H: 0, S: 0, I: 0, A: 0 };
     const absents: string[] = [];

     stList.forEach(s => {
       const status = (abs[s.nisn] || 'H').toUpperCase();
       if (status === 'H') counts.H++;
       else if (status === 'S') { counts.S++; absents.push(`${s.nama_siswa} (S)`); }
       else if (status === 'I') { counts.I++; absents.push(`${s.nama_siswa} (I)`); }
       else if (status === 'A') { counts.A++; absents.push(`${s.nama_siswa} (A)`); }
     });

     if (counts.S === 0 && counts.I === 0 && counts.A === 0) {
       return `Semua Hadir (${counts.H} siswa)`;
     }
     let summary = `Hadir: ${counts.H}`;
     if (counts.S > 0) summary += `, Sakit: ${counts.S}`;
     if (counts.I > 0) summary += `, Izin: ${counts.I}`;
     if (counts.A > 0) summary += `, Alpa: ${counts.A}`;
     if (absents.length > 0) {
       summary += ` [${absents.join(', ')}]`;
     }
     return summary;
   };
   ```
   *Current Output Example:* `"Semua Hadir (29 siswa)"` or `"Hadir: 28, Sakit: 1 [Budi (S)]"`.  
   *Required Output:* Must strictly be:  
   `Total murid: {total}, Hadir: {hadir}, Izin: {izin}, Sakit: {sakit}, Alpa: {alpa}`
2. **Attendance Summary Input Placeholder** (`src/components/GuruJurnal.tsx:1051-1058`):
   ```tsx
   <input
     type="text"
     value={kehadiranMurid}
     onChange={e => setKehadiranMurid(e.target.value)}
     placeholder="Contoh: Semua Hadir (29 siswa) atau Hadir: 28, Sakit: 1"
     className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
   />
   ```

---

### R3. Kelas dan Mata Pelajaran
1. **Dropdown UI & Layout** (`src/components/GuruJurnal.tsx:1007-1043`):
   ```tsx
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 fade-in">
     <div>
       <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
         Mata Pelajaran <span className="text-red-500">*</span> ...
       </label>
       <select value={mapel} onChange={e => handleMapelChange(e.target.value)} required ...>
     </div>
     <div>
       <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
         Kelas <span className="text-red-500">*</span> ...
       </label>
       <select value={kelas} onChange={e => handleKelasChange(e.target.value)} required ...>
     </div>
   </div>
   ```
2. **Auto-Fill & Cascading Sync Routines**:
   - `useEffect` lines 198-201: Auto-selects if teacher only teaches 1 subject.
   - `useEffect` lines 296-323: Auto-selects based on today's scheduled KBM (`dailyState.jadwalKBM`).
   - `handleMapelChange` lines 747-761: Selects matching class when mapel changes.
   - `handleKelasChange` lines 763-777: Selects matching mapel when class changes.
   - Inval mode lines 721-745: Loads substitute teacher's assigned subjects and classes.
   *Status:* Both fields are **already visible** and auto-fill logic is **already active and working properly**.

---

## 2. Logic Chain

1. **R1 Analysis**:
   - In `GuruJurnal.tsx`, the UI currently renders an `<input>` for `pertemuanKe` (labeled "No. *"), while `jamKe` has no UI input.
   - `handleJurnalSubmit` has a mandatory check for `pertemuanKe` that displays toast warning `'No. Pertemuan Wajib'`.
   - By removing the UI input for `pertemuanKe` from lines 904-930 and converting the section to a clean single-column `Hari/Tanggal` field, the user is relieved of entering it.
   - Removing lines 494-496 eliminates the submit validation error.
   - Changing the fallback in `newJurnal` from `(pertemuanKe || '1')` to `(pertemuanKe || '-')` and `(jamKe || '-')` satisfies the instruction: *"Jika dibutuhkan internal, berikan default saja (misal pertemuanKe = '-' atau null) tapi pastikan tidak membuat submit error"*.
   - Keeping the internal auto-fill routines (`fetchLastPertemuan` and schedule detection) intact ensures backward-compatibility if `pertemuan_ke` is stored, but defaulting to `'-'` ensures it never fails if empty.

2. **R2 Analysis**:
   - The user explicitly specified the attendance string format:
     `Total murid: {total}, Hadir: {hadir}, Izin: {izin}, Sakit: {sakit}, Alpa: {alpa}`
   - In `calculateKehadiranSummary`:
     - Count total students as `stList.length` (or `0` if empty).
     - Count `H`, `I`, `S`, `A` from the `abs` object.
     - Note the sequence required: `Hadir`, then `Izin`, then `Sakit`, then `Alpa`.
     - Return the exact string template without any conditional branch (e.g. no "Semua Hadir", no brackets).
   - Update the placeholder on line 1055 to reflect this exact format.

3. **R3 Analysis**:
   - The user asked to ensure "Kelas" and "Mata Pelajaran" are present and visible (not hidden), and that auto-fill logic is maintained.
   - Investigation confirms that lines 1007-1043 already render both dropdowns in an open 2-column grid whenever assignments exist, and lines 198-201 / 296-323 / 747-777 handle auto-fill and cascading selection.
   - No modifications are required for R3 in `GuruJurnal.tsx`.

---

## 3. Caveats

- **Database Column Constraints**: The database columns `pertemuan_ke` and `jam_ke` in table `jurnal_pembelajaran` are nullable / text. Providing `'-'` or keeping the internal auto-fill will not trigger DB constraint errors.
- **Historic Data in Rekap**: Old journals might contain older attendance strings like `"Semua Hadir (25 siswa)"` or `"Hadir: 20, Sakit: 2 [Andi (S)]"`. Rekap table handling for historic data is handled separately in `RekapJurnalView.tsx` by peer explorer/implementer.
- **R3 in Rekap**: The prompt noted that in `RekapJurnalView.tsx` the table columns for Kelas and Mata Pelajaran should be separate; in `GuruJurnal.tsx`, they are already separate input dropdowns.

---

## 4. Conclusion & Recommended Minimal Fixes (Ponytail Mode)

All changes in `src/components/GuruJurnal.tsx` can be executed with minimal code modifications across 4 concise chunks:

### Fix 1: Update `calculateKehadiranSummary` (Lines 71-95)
**Before:**
```tsx
  const calculateKehadiranSummary = (abs: Record<string, string>, stList: any[]): string => {
    if (!stList || stList.length === 0) return 'Semua Hadir';
    const counts = { H: 0, S: 0, I: 0, A: 0 };
    const absents: string[] = [];

    stList.forEach(s => {
      const status = (abs[s.nisn] || 'H').toUpperCase();
      if (status === 'H') counts.H++;
      else if (status === 'S') { counts.S++; absents.push(`${s.nama_siswa} (S)`); }
      else if (status === 'I') { counts.I++; absents.push(`${s.nama_siswa} (I)`); }
      else if (status === 'A') { counts.A++; absents.push(`${s.nama_siswa} (A)`); }
    });

    if (counts.S === 0 && counts.I === 0 && counts.A === 0) {
      return `Semua Hadir (${counts.H} siswa)`;
    }
    let summary = `Hadir: ${counts.H}`;
    if (counts.S > 0) summary += `, Sakit: ${counts.S}`;
    if (counts.I > 0) summary += `, Izin: ${counts.I}`;
    if (counts.A > 0) summary += `, Alpa: ${counts.A}`;
    if (absents.length > 0) {
      summary += ` [${absents.join(', ')}]`;
    }
    return summary;
  };
```

**After:**
```tsx
  const calculateKehadiranSummary = (abs: Record<string, string>, stList: any[]): string => {
    const total = stList?.length || 0;
    const counts = { H: 0, I: 0, S: 0, A: 0 };
    if (stList && stList.length > 0) {
      stList.forEach(s => {
        const status = (abs[s.nisn] || 'H').toUpperCase();
        if (status === 'H') counts.H++;
        else if (status === 'I') counts.I++;
        else if (status === 'S') counts.S++;
        else if (status === 'A') counts.A++;
        else counts.H++;
      });
    }
    return `Total murid: ${total}, Hadir: ${counts.H}, Izin: ${counts.I}, Sakit: ${counts.S}, Alpa: ${counts.A}`;
  };
```

---

### Fix 2: Remove `pertemuanKe` Validation from `handleJurnalSubmit` (Lines 494-496)
**Before:**
```tsx
    if (tipeJurnal === 'Jurnal KBM') {
      if (!pertemuanKe || !pertemuanKe.trim()) {
        return showToast('No. Pertemuan Wajib', 'Silakan isi nomor pertemuan KBM.', 'warning');
      }
      if (!tujuanPembelajaran || !tujuanPembelajaran.trim()) {
```

**After:**
```tsx
    if (tipeJurnal === 'Jurnal KBM') {
      if (!tujuanPembelajaran || !tujuanPembelajaran.trim()) {
```

---

### Fix 3: Ensure Safe Fallback Defaults for `pertemuan_ke` and `jam_ke` (Lines 573-574)
**Before:**
```tsx
      pertemuan_ke: tipeJurnal === 'Jurnal KBM' ? (pertemuanKe || '1') : '-',
      jam_ke: tipeJurnal === 'Jurnal KBM' ? (jamKe || '1-2') : '-',
```

**After:**
```tsx
      pertemuan_ke: tipeJurnal === 'Jurnal KBM' ? (pertemuanKe || '-') : '-',
      jam_ke: tipeJurnal === 'Jurnal KBM' ? (jamKe || '-') : '-',
```

---

### Fix 4: Remove UI Input "No." (`pertemuanKe`) and Update Placeholder (Lines 903-930 & 1055)
**Before (Lines 903-930):**
```tsx
                    {/* 1. No. & 2. Hari/Tanggal */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 fade-in">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1 flex items-center gap-1">
                          No. <span className="text-red-500">*</span>
                          {pertemuanKe && <span className="text-[9px] text-green-600 dark:text-green-400 font-normal">(terisi otomatis)</span>}
                        </label>
                        <input
                          type="text"
                          value={pertemuanKe}
                          onChange={e => setPertemuanKe(e.target.value)}
                          required
                          placeholder="Contoh: 1 atau 1-2"
                          className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                          Hari/Tanggal
                        </label>
                        <input
                          type="text"
                          value={formatDisplayDate(tanggal)}
                          readOnly
                          className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                        />
                      </div>
                    </div>
```

**After (Lines 903-930):**
```tsx
                    {/* Hari/Tanggal */}
                    <div className="fade-in">
                      <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                        Hari/Tanggal
                      </label>
                      <input
                        type="text"
                        value={formatDisplayDate(tanggal)}
                        readOnly
                        className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                      />
                    </div>
```

**Before (Line 1055):**
```tsx
placeholder="Contoh: Semua Hadir (29 siswa) atau Hadir: 28, Sakit: 1"
```

**After (Line 1055):**
```tsx
placeholder="Contoh: Total murid: 30, Hadir: 28, Izin: 1, Sakit: 1, Alpa: 0"
```

---

## 5. Verification Method

1. **TypeScript Verification**:
   ```powershell
   npx tsc --noEmit
   ```
   Must exit with code 0 without any type errors.
2. **Build Verification**:
   ```powershell
   npm run build
   ```
   Must successfully build the Next.js production bundle.
3. **Behavioral Checks**:
   - Inspect the form UI for Jurnal KBM: Verify "No." / "Pertemuan ke" and "Jam ke" inputs are absent, while "Hari/Tanggal" is displayed cleanly.
   - Fill in Tujuan Pembelajaran, KKTP, Konten, Kegiatan, Mapel, Kelas, Lokasi, and take/upload a photo without any "pertemuan" input: Click submit, verify form submits successfully without any "No. Pertemuan Wajib" warning toast.
   - Check attendance summary output: Toggle attendance buttons (H, I, S, A) and verify string strictly matches `Total murid: X, Hadir: Y, Izin: Z, Sakit: A, Alpa: B`.
   - Verify Mapel and Kelas dropdowns are visible and auto-sync appropriately.
