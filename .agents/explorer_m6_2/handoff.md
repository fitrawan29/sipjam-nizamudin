# Handoff Report: R2 (Teacher Dashboard) & R3 (Admin Dashboard & Verification)

## 1. Observation

### 1.1 Application Routing & Dashboard Entry Point
- In `src/app/page.tsx` (lines 43-48, 80), the main application renders `<AppScreen user={user} onLogout={handleLogout} />`.
- In `src/components/AppScreen.tsx` (lines 24, 75-99, 159-175):
  - View navigation is managed by React state `currentView` (defaulting to `'view-home'`).
  - At line 160: `{currentView === 'view-home' && <HomeView user={user} setView={handleNavigation} menuItems={menuItems} />}`.
  - Both Teacher (`isGuru = user?.role !== 'Admin'`) and Administrator use `HomeView.tsx` as their dashboard view.
  - Navigation menu for Guru (lines 74-83) has 8 items: `view-home`, `view-guru-presensi`, `view-guru-jurnal`, `view-piket`, `view-dokumen`, `view-history`, `view-guru-rekap-jurnal`, `view-rekap-siswa`.
  - Navigation menu for Admin (lines 85-97) has 11 items: `view-home`, `view-admin-verif`, `view-piket`, `view-dokumen`, `view-analitik`, `view-admin-rekap`, `view-rekap-siswa`, `view-admin-data`, `view-admin-monitor`, `view-admin-backup`, `view-admin-config`.

### 1.2 Location of "Aktivitas Utama" Component
- Located in `src/components/HomeView.tsx` at lines 467-482:
```tsx
      {/* Menu Grid */}
      <div>
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mb-3 px-1">Aktivitas Utama</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {menuItems.filter(item => item.id !== 'view-home').map((item, idx) => {
                const colors = getColorClasses(idx);
                return (
                  <button key={item.id} onClick={() => setView(item.id)} className={`glass-card p-4 text-center transition-colors ${colors.hover}`}>
                    <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${colors.bg} ${colors.text}`}>
                      <i className={`fa-solid ${item.icon} text-xl`}></i>
                    </div>
                    <h4 className="font-bold text-[11px] sm:text-xs text-gray-900 dark:text-white">{item.label}</h4>
                  </button>
                );
              })}
          </div>
      </div>
```
- A global grep across `src/` for `"Aktivitas Utama"` returned only this single occurrence at line 468 of `HomeView.tsx`.

### 1.3 Personal Attendance Stats (H, TL, Izin, Sakit)
- In `src/components/HomeView.tsx` lines 26-42, attendance data is currently queried solely for lateness seconds (`keterlambatan_detik`):
```tsx
      const fetchTelat = async () => {
        const now = new Date();
        const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const sb = await import('@/lib/supabaseClient').then(m => m.supabase);
        const { data } = await sb
          .from('presensi_guru')
          .select('keterlambatan_detik')
          .eq('nama_guru', user.nama)
          .gte('timestamp', firstDay);
        
        let totalDetik = 0;
        data?.forEach((p: any) => totalDetik += (p.keterlambatan_detik || 0));
        setAkumulasiTelat({ detik: totalDetik, alpa: Math.floor(totalDetik / 14400) });
      };
```
- In `src/components/GuruPresensi.tsx` lines 188-200 and `src/components/AdminRekapView.tsx` lines 96-122:
  - Table: `public.presensi_guru`
  - Columns: `nama_guru`, `tipe_absen` ('Datang' | 'Pulang'), `jenis_presensi` ('Sekolah' | 'Izin' | 'Dinas Luar'), `detail_izin` ('Sakit' | 'Izin'), `keterlambatan_detik` (integer), `timestamp` (string), `status_verifikasi` ('Disetujui' | 'Diverifikasi' | 'Menunggu' | 'Ditolak').
  - When filtering for individual attendance count, only `tipe_absen === 'Datang'` is considered:
    - **H (Hadir Tepat Waktu)**: `jenis_presensi === 'Sekolah'` and `(keterlambatan_detik === 0 || keterlambatan_detik === null)`.
    - **TL (Terlambat)**: `jenis_presensi === 'Sekolah'` and `(keterlambatan_detik || 0) > 0`.
    - **Izin**: `jenis_presensi === 'Izin'` and `(!detail_izin || !detail_izin.toLowerCase().includes('sakit'))`.
    - **Sakit**: `(jenis_presensi === 'Izin' && detail_izin && detail_izin.toLowerCase().includes('sakit')) || jenis_presensi === 'Sakit'`.

### 1.4 `jadwal_pelajaran` Schema & Dynamic Journal Target Ratio
- Database inspection of `public.jadwal_pelajaran` (via Supabase MCP `list_tables`):
  - Primary Key: `id` (text)
  - Columns: `id` (text), `hari` (text: 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'), `nama_guru` (text: short names e.g. 'Ade', 'Rohani', 'Ambar', 'Riski', etc.), `mata_pelajaran` (text: e.g. 'MTK', 'Informatika', 'Kimia'), `kelas` (text: e.g. 'X Merdeka', 'XI Merdeka', 'XII Merdeka').
- In `src/lib/workflow.ts` lines 35-72:
  - `findJadwalForGuru(hari: string, namaGuru: string, username?: string)` queries `jadwal_pelajaran.select('*').eq('hari', hari)` and fuzzy-matches `namaGuru` (and `username`) against short name `j.nama_guru`.
  - In `src/lib/workflow.ts` lines 86-109:
  - `isJurnalMatchJadwal(jurnal: any, jadwal: any)` checks if a submitted journal matches a scheduled class.
- In `src/components/HomeView.tsx` lines 105-114 and 448-452:
  - `dailyState.jadwalKBM` already contains all classes scheduled for this teacher today.
  - Total Target: `dailyState.jadwalKBM.length` (dynamic per teacher, per day).
  - Jurnal Terisi: `dailyState.jadwalKBM.filter(jk => dailyState.jurnalKBM.some(j => isJurnalMatchJadwal(j, jk))).length`.

### 1.5 Student Attendance Per Subject Taught
- Table `public.guru_mapel`:
  - Columns: `id` (uuid), `nip` (text), `nama_guru` (text), `mapel_id` (text), `nama_mapel` (text: e.g. 'X Merdeka_MTK'), `mapel_singkat` (text: e.g. 'MTK'), `kelas` (text: e.g. 'X Merdeka').
  - Contains 39 rows mapping all 13 teachers to their designated subjects and classes.
- In `src/components/GuruJurnal.tsx` line 228 and `src/components/RekapSiswaView.tsx` lines 93-116:
  - `jurnal_pembelajaran.absensi_siswa` stores JSON format: `{"<nisn>": "H" | "S" | "I" | "A"}`.
  - Student attendance percentage for a subject is calculated by summing `H` entries across all journals for that subject, divided by total student records (`H + S + I + A`) across those journals: `Math.round((totalH / totalStudentEntries) * 100)`.

### 1.6 Subject Document Completion List (`bank_dokumen`)
- Table `public.bank_dokumen`:
  - Columns: `id`, `timestamp`, `nama_guru`, `jenis_dokumen`, `judul`, `link_file`, `status_verifikasi`, `catatan_admin`.
  - Note: Currently does not have a dedicated `mapel` column, but documents in `DokumenView.tsx` have 6 curriculum document types:
    1. `Analisis Capaian Pembelajaran`
    2. `Alur Tujuan Pembelajaran`
    3. `Rencana Pekan Efektif`
    4. `Program Tahunan`
    5. `Program Semester`
    6. `Rencana Pembelajaran Mendalam`
- Document completion for a teacher's subject requires checking which of these 6 documents have been uploaded for each subject in `guru_mapel`.

### 1.7 Current Admin Dashboard State
- In `src/components/HomeView.tsx`:
  - When `!isGuru` (i.e. `user.role === 'Admin'`), lines 198-464 are hidden.
  - The Admin only sees the Header Banner (lines 158-195) and "Aktivitas Utama" (lines 467-482).
  - There is currently NO daily status matrix on the Admin dashboard.

### 1.8 Verification View (`AdminVerifView.tsx`)
- In `src/components/AdminVerifView.tsx` lines 10-222:
  - Has tabs: `Presensi`, `Jurnal`, `Piket`.
  - Has date filter `input type="date"`.
  - Has text search input `search`.
  - Does NOT currently have dropdown filters for "Sudah" vs "Belum" completing tasks, nor a verification status dropdown.
  - Filter currently runs purely on in-memory array `displayList`, meaning reactive dropdown filtering will execute with zero page reloads.

---

## 2. Logic Chain

### 2.1 Refactoring Teacher Dashboard (`HomeView.tsx`)
1. **Remove "Aktivitas Utama"**:
   - Deleting lines 467-482 in `HomeView.tsx` eliminates the deprecated button grid completely.
2. **Add Personal Attendance Stat Cards (H, TL, Izin, Sakit)**:
   - Query `presensi_guru` for `nama_guru === user.nama` where `timestamp >= firstDayOfMonth` and `tipe_absen === 'Datang'`.
   - Iterate through records:
     - If `jenis_presensi === 'Sekolah'` and `(!keterlambatan_detik || keterlambatan_detik === 0)`: `H++`
     - If `jenis_presensi === 'Sekolah'` and `keterlambatan_detik > 0`: `TL++`
     - If `jenis_presensi === 'Izin'`: if `detail_izin` includes 'Sakit', `Sakit++`, else `Izin++`
     - If `jenis_presensi === 'Sakit'`: `Sakit++`
   - Render 4 modern cards: Hadir (Emerald), Terlambat (Amber), Izin (Sky), Sakit (Rose).
3. **Dynamic Target Journal Ratio ("Jurnal terisi vs Total target yang harus diisi hari ini")**:
   - `workflow.ts` already calculates `dailyState.jadwalKBM` (target classes today) and `dailyState.jurnalKBM`.
   - Compute `totalTarget = dailyState.jadwalKBM.length`.
   - Compute `jurnalTerisi = dailyState.jadwalKBM.filter(jk => dailyState.jurnalKBM.some(j => isJurnalMatchJadwal(j, jk))).length`.
   - Present a prominent progress card:
     - Displays `jurnalTerisi / totalTarget` (e.g. `2 / 2 Selesai` or `1 / 3 Diisi`).
     - Progress bar with percentage: `totalTarget > 0 ? Math.round((jurnalTerisi / totalTarget) * 100) : 100%`.
     - Contextual message (e.g. "Bebas Mengajar Hari Ini" if `totalTarget === 0`).
4. **Student Attendance Percentage Per Subject Taught**:
   - Query `guru_mapel` for teacher's subjects.
   - Query `jurnal_pembelajaran` for `nama_guru === user.nama`.
   - For each subject in `guru_mapel`:
     - Collect matching journals.
     - Parse `absensi_siswa` JSON.
     - Count total `H` and total attendance records (`H + S + I + A`).
     - Percentage = `totalRecords > 0 ? Math.round((totalH / totalRecords) * 100) : 0`.
   - Render a list/card view displaying each subject with class badge and attendance percentage meter.
5. **Subject Document Completion List**:
   - Query `bank_dokumen` for `nama_guru === user.nama`.
   - For each subject in `guru_mapel`, inspect uploaded documents against the 6 standard document types.
   - Display a status checklist/matrix showing `Uploaded` (green check) vs `Belum Upload` (gray/red dash) per subject.

### 2.2 Constructing the Admin Daily Status Matrix (`HomeView.tsx` when `!isGuru`)
1. **Teacher Catalog**:
   - Fetch all 13 teachers from `data_guru` (`id`, `nip`, `nama_guru`, `mata_pelajaran`).
2. **Dimension 1: Presensi Datang**:
   - Query `presensi_guru` for today where `tipe_absen === 'Datang'`.
   - Match by `nama_guru`. If found: "Hadir [HH:mm]" (or "Terlambat [x]m", "Izin", "Dinas Luar"). If not: "Belum Datang".
3. **Dimension 2: Pengisian Jurnal**:
   - For each teacher, find today's schedule from `jadwal_pelajaran` using `findJadwalForGuru(todayHari, teacher.nama_guru, teacher.nip)`.
   - Query `jurnal_pembelajaran` for today.
   - Match: If teacher has 0 classes today, status is "Bebas KBM" (or "Dinas Luar" if applicable). If teacher has N classes, check how many matching journals exist: "N/N Selesai", "X/N Belum Lengkap", or "Belum Mengisi".
4. **Dimension 3: Laporan Piket**:
   - Check `jadwal_piket` for today's day.
   - If teacher is in `daftar_guru`:
     - Query `laporan_piket` for today with `guru_pelapor === teacher.nama_guru`.
     - If exists: "Sudah Lapor". If not: "Belum Lapor".
   - If teacher is not in `daftar_guru`: "Bukan Petugas".
5. **Dimension 4: Presensi Pulang**:
   - Query `presensi_guru` for today where `tipe_absen === 'Pulang'`.
   - If exists: "Pulang [HH:mm]". If not: "Belum Pulang".
6. **Matrix UI Presentation**:
   - Summary stat cards at the top: Total Guru, Sudah Presensi Datang, Jurnal Lengkap, Piket Selesai, Sudah Presensi Pulang.
   - Reactive search input + Status filter ("Semua", "Tugas Lengkap", "Belum Lengkap").
   - Responsive grid/table mapping each teacher with color-coded status badges.

### 2.3 Reactive Dropdown Filters in Verification Page (`AdminVerifView.tsx`)
1. **Dual Reactive Dropdowns**:
   - `taskFilter`: `'Semua'` | `'Sudah'` | `'Belum'` (Filter based on task completion).
   - `verifFilter`: `'Semua'` | `'Menunggu'` | `'Disetujui'` | `'Ditolak'` (Filter based on verification status).
2. **Implementation Mechanism**:
   - Maintain active tab data in state (`presensiList`, `jurnalList`, `piketList`).
   - Also maintain `allTeachers` from `data_guru` to identify teachers who haven't completed their task today.
   - When `taskFilter === 'Belum'`:
     - Cross-reference `allTeachers` against submissions for the selected date.
     - Display teachers who have not completed the required submission (e.g. "Belum melakukan presensi", "Belum mengisi jurnal", "Petugas piket belum melapor").
   - When `taskFilter === 'Sudah'` or `'Semua'`:
     - Filter existing submitted records by `verifFilter` and `search`.
3. **No Reload / No Flicker Guarantee**:
   - Filtering is performed synchronously in React render using `useMemo` or plain variable calculation (`displayList = ...`).
   - Changing dropdown triggers a React state update only, causing a clean virtual DOM diff without page reloads or network requests.

---

## 3. Caveats

1. **`bank_dokumen` Schema**:
   - `public.bank_dokumen` does not currently possess a `mapel` column in the Supabase schema. To associate documents strictly with a specific subject (as needed for R2 and R4), a migration should execute:
     `ALTER TABLE public.bank_dokumen ADD COLUMN IF NOT EXISTS mapel TEXT;`
   - In the interim, document matching can fallback to examining `judul` or `jenis_dokumen`.
2. **Teacher Name Discrepancies**:
   - `jadwal_pelajaran` uses informal/short names (e.g. "Ade", "Rohani", "Ambar", "Riski"), whereas `data_guru` and `users` use full names (e.g. "Ade Fitrawan Ibrahim", "Setia Ambar Ningsih Mamonto").
   - All schedule queries must use `findJadwalForGuru()` from `workflow.ts` or its exact normalization logic to prevent false zero targets.
3. **Teacher Without Teaching Assignment**:
   - "Assyfa Fitra Azzahrah Abukasim" has `mata_pelajaran = null` in `data_guru` and 0 rows in `guru_mapel`. Both the dynamic journal target and subject attendance calculations must handle 0 subjects cleanly with empty states rather than `NaN` or dividing by zero.
4. **Offline / Network Drops**:
   - Supabase queries must have `try/catch` fallbacks and preserve previous state if network calls momentarily fail.

---

## 4. Conclusion

The codebase is exceptionally well-structured for these enhancements:
1. **R2 (Teacher Dashboard)**:
   - `HomeView.tsx` is the direct target for refactoring.
   - Removing lines 467-482 deletes "Aktivitas Utama".
   - Adding 4 state queries (`presensi_guru` for H/TL/Izin/Sakit, `workflow.ts` for dynamic journal target, `jurnal_pembelajaran` + `guru_mapel` for student attendance percentage, and `bank_dokumen` for document completion) provides all required widgets.
2. **R3 (Admin Dashboard & Verification)**:
   - When `!isGuru` in `HomeView.tsx`, the view should render the Admin Daily Status Matrix mapping each teacher across Presensi Datang, Jurnal, Piket, and Presensi Pulang.
   - In `AdminVerifView.tsx`, adding two reactive dropdown filters (`taskFilter` and `verifFilter`) operating over client state fulfills the requirement without page reloads or flickering.

---

## 5. Verification Method

### 5.1 Static Code & Type Checking
Execute TypeScript compilation to ensure zero type errors:
```powershell
npx tsc --noEmit
```
Expected: Exit code 0 with no diagnostic errors.

### 5.2 Teacher Dashboard Verification
1. Log in as teacher "Ade Fitrawan Ibrahim" (`username: Fitrawan`).
2. Verify "Aktivitas Utama" button grid is absent.
3. Verify personal attendance cards show distinct counts for H, TL, Izin, Sakit.
4. Verify dynamic target journal ratio displays:
   - On Saturday (Sabtu): Ade has 2 classes (`X Merdeka_Informatika` and `XII Merdeka_MTK`). If both are filled, ratio displays `2 / 2 (100%)`.
5. Verify student attendance percentage widget renders for Ade's 4 subjects:
   - `X Merdeka_Informatika`
   - `X Merdeka_MTK`
   - `XI Merdeka_MTK`
   - `XII Merdeka_MTK`
   With valid percentage numbers based on historical `jurnal_pembelajaran.absensi_siswa`.
6. Verify document completion list displays each subject with completion status across the 6 document types.

### 5.3 Admin Dashboard & Status Matrix Verification
1. Log in as admin (`username: admin`).
2. Open Dashboard (`view-home`).
3. Verify the daily status matrix renders all 13 teachers from `data_guru`.
4. Verify all 4 status columns are populated accurately for today (2026-09-12):
   - Presensi Datang: Ade Fitrawan (07:39), Setia Ambar (09:59), others "Belum Datang".
   - Jurnal: Ade (2/2 Selesai), Ambar (0/2 Belum Mengisi), etc.
   - Piket: Ade (Sudah Lapor), Tika (Belum Lapor), others "Bukan Petugas".
   - Presensi Pulang: accurate to database records.

### 5.4 Admin Verification Dropdown Filter Verification
1. Open `view-admin-verif`.
2. Toggle dropdown `Filter Penyelesaian` to "Belum".
   - Confirm teachers who have not completed the active task (e.g. presensi) are displayed immediately without page reload or flicker.
3. Toggle dropdown `Filter Status Verifikasi` between "Menunggu", "Disetujui", "Ditolak".
   - Confirm list updates in-place smoothly with zero layout flickering.
