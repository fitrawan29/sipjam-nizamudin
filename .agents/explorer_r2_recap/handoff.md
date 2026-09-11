# Handoff Report: Requirement R2 - Repair Recap Features (Admin & Guru)

## 1. Observation

Direct code and database inspections yielded the following factual findings across all recap features:

### A. Rekap Absen Siswa (`src/components/RekapSiswaView.tsx`)
1. **Critical Student Attendance Parsing Bug (Lines 73-93)**:
   ```typescript
   73: // Parse jurnal absences (assuming detail_absen contains string like "Sakit: Andi, Izin: Budi")
   74: // Note: Since data structure may vary, we try our best to match student names in the absensi field.
   75: jurnal?.forEach(j => {
   76:   const text = `${j.absensi_siswa || ''} ${j.detail_absen || ''}`.toLowerCase();
   77:   siswa?.forEach(s => {
   78:     const nama = s.nama_siswa.toLowerCase();
   79:     if (text.includes(nama)) {
   80:       // simple heuristic
   81:       if (text.includes(`sakit:`) && text.substring(text.indexOf(`sakit:`)).includes(nama)) {
   82:         rekapMap[s.nama_siswa].sakit++;
   83:       } else if (text.includes(`izin:`) && text.substring(text.indexOf(`izin:`)).includes(nama)) {
   84:         rekapMap[s.nama_siswa].izin++;
   85:       } else if (text.includes(`alpa:`) && text.substring(text.indexOf(`alpa:`)).includes(nama)) {
   86:         rekapMap[s.nama_siswa].alpa++;
   87:       } else {
   88:         // default fallback if name is found but no specific reason parsed
   89:         rekapMap[s.nama_siswa].alpa++; 
   90:       }
   91:     }
   92:   });
   93: });
   ```
2. **Actual Live Data in Supabase (`jurnal_pembelajaran`)**:
   - Recent rows (from September 2026):
     `absensi_siswa`: `"{\"69900279\":\"H\",\"83841410\":\"H\",\"91255714\":\"A\",\"97597761\":\"A\",\"103761143\":\"H\",\"107403376\":\"H\",\"117696563\":\"H\",\"3098361955\":\"H\"}"`
     `detail_absen`: `""`
     *The keys are student NISN values (e.g. `91255714`), NOT student names!*
     Because `text.includes(nama)` searches for the name string, it returns `false` for 100% of modern records. All student absences/attendances are completely ignored (stay at 0).
   - Older rows (July-August 2026):
     `detail_absen`: `"Moh. Candra Podomi (I), Anugrah Nugi Paputungan (H), Safari Ziansyah Maindoka (S)"`
     Because there are no `sakit:`, `izin:`, or `alpa:` keyword prefixes, any student matched by `text.includes(nama)` falls into line 89 (`else { rekapMap[s.nama_siswa].alpa++; }`). Consequently, students present with `(H)` were erroneously counted as `Alpa`!
3. **Missing Columns**:
   Lines 147-155: Table headers only show `No`, `NISN`, `Nama Siswa`, `Sakit`, `Izin`, `Alpa`.
   `Hadir`, `Total Pertemuan`, and `% Kehadiran` are completely missing from both the UI table and the CSV export (line 181).

---

### B. Guru Rekap Jurnal Pribadi (`src/components/RekapJurnalView.tsx`)
1. **Raw JSON Leak in Teacher UI (Line 127)**:
   ```tsx
   125: <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
   126:   <p className="text-[9px] font-bold text-gray-900 dark:text-white mb-1">Absensi Siswa:</p>
   127:   <p className="text-[10px] text-gray-700 dark:text-gray-300">{j.absensi_siswa}</p>
   128: </div>
   ```
   For journals saved via `GuruJurnal.tsx`, `j.absensi_siswa` contains raw stringified JSON like `{"96726979":"H"}`. This is rendered verbatim to teachers on screen and in printouts.
2. **Missing Summary Counters**:
   There are no summary statistics at the top (e.g., Total Jurnal, Total Disetujui, Total Menunggu, Total Ditolak).
3. **No Month Selector or Quick Presets**:
   Lines 71-80 only provide `startDate` and `endDate` date pickers, requiring manual 2-step date configuration instead of a quick 1-click month dropdown.
4. **No Keyword Search Filter**:
   Teachers cannot filter their journal list by topic/materi or activities.
5. **No Auto-Fetch on Mount**:
   Initially `jurnalData` is `null`, requiring the user to manually set dates and click "Tampilkan Rekap" before seeing any data.

---

### C. Admin Rekap Akhir (`src/components/AdminRekapView.tsx`)
1. **Complete Absence of Piket Recap**:
   Lines 37-50 only query `presensi_guru` and `jurnal_pembelajaran`. `laporan_piket` is never queried or displayed.
2. **Teachers Missing from Recap (Lines 52-79)**:
   `pArr` is generated purely by iterating over `presensi` records (`Object.keys(pMap)`). If a teacher in `data_guru` has 0 attendance records for the selected period, they vanish from the recap entirely instead of showing 0 hadir, 0 sakit, 0 izin, 0 alpa.
3. **Discrepancy in CSV Export (Lines 177-183)**:
   ```typescript
   177: const headers = ['No', 'Nama Guru', 'Hadir', 'Dinas Luar', 'Sakit', 'Izin', 'Jurnal Disetujui'];
   ```
   Although `Alpa` (calculated on line 71) and `Keterlambatan` (`p.telatDetik` on line 59) are shown in cards on lines 148-149, they are omitted from the CSV export!
4. **No Teacher Search / Filter**:
   Admin cannot search or filter for a specific teacher.
5. **Auto-Fetch on Mount Missing**:
   The view starts with empty state "Pilih bulan atau rentang khusus untuk menarik rekap."

---

### D. Piket Module & Piket Recap (`src/components/PiketView.tsx`)
1. **No Piket Recap Tab**:
   Lines 123-137 only define two tabs: `'beranda'` and `'lapor'`.
   There is no tab to view, filter, summarize, or export historical Piket reports.
2. **Underutilized `laporan_piket` Data**:
   Supabase table `laporan_piket` contains 30 rows with fields:
   `id`, `timestamp`, `tanggal`, `guru_pelapor`, `rekap_absen_kelas`, `catatan_apel`, `link_foto`, `status_verifikasi`, `kehadiran_guru_piket`.
   Currently, only the 10 latest entries are rendered in a small card on the home tab without date filters, search, full detail expansion, or export capabilities.

---

### E. Admin Analitik (`src/components/AnalitikView.tsx`)
1. **Dummy Score Formula (Line 72)**:
   ```typescript
   72: const score = (data.hadir * 10) + (data.jurnal * 5); // Dummy score logic
   ```
2. **Piket Omission**:
   `laporan_piket` is completely ignored in the monthly analytics and leaderboard.

---

## 2. Logic Chain

1. **Premise 1**: Requirement R2 mandates:
   > "Ensure all filter, search, and action buttons in the Recap views properly fetch, calculate, and display real data according to the selected parameters, abandoning any hardcoded dummy data logic."
2. **Premise 2**: In `RekapSiswaView.tsx`, `jurnal_pembelajaran.absensi_siswa` stores JSON maps with student NISNs (`{"69900279":"H", ...}`), while older rows store `detail_absen` as `Nama (H), Nama (A)`.
3. **Deduction 2A**: Because the current logic uses `text.includes(nama)` and looks for `sakit:`, `izin:`, `alpa:`, all NISN-keyed JSON entries fail to match, resulting in 0 attendance counts. All older entries without keywords fall into `else`, causing present students `(H)` to be falsely marked as `Alpa`.
4. **Conclusion 2B**: Replacing lines 75-93 with a parser that parses JSON by NISN and parses parenthetical statuses `\(([HSIA])\)` will immediately restore 100% accurate student attendance calculations. Adding `Hadir` and `% Kehadiran` makes the recap functionally complete.
5. **Premise 3**: In `AdminRekapView.tsx`, teachers who have 0 attendance records are excluded because `pMap` only collects keys from the returned `presensi_guru` rows.
6. **Conclusion 3A**: By performing an outer-join pattern starting with `data_guru` (`select('nama_guru')`), all registered teachers are seeded with 0 values. Merging `laporan_piket` provides a complete tri-pillar recap (Presensi, Jurnal, Piket).
7. **Premise 4**: In `RekapJurnalView.tsx`, rendering raw JSON `{ "112366749": "H" }` to users breaks UI legibility. Formatting it into human-readable text (`Hadir: X, Sakit: Y, Izin: Z, Alpa: W`) and providing top-level summary counters satisfies R2.
8. **Premise 5**: In `PiketView.tsx`, adding a `Rekap Piket` tab with month/date filter, teacher filter, search, summary tiles, and CSV/Print export fulfills the requirement for Piket Recap across both Admin and Guru roles.

---

## 3. Caveats

1. **No Backend Database Schema Changes Needed**:
   All necessary tables (`presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, `data_guru`, `data_siswa`, `data_mapel`) already exist in Supabase with live rows. No migrations or SQL schema changes are required.
2. **CSV vs Native XLSX**:
   Exporting via standard CSV with UTF-8 BOM (`\uFEFF`) ensures Microsoft Excel immediately recognizes UTF-8 formatting and separates columns correctly on Indonesian/European and US locale settings without requiring heavy external dependencies.
3. **Role Permission Scoping**:
   In `RekapJurnalView.tsx`, teachers only see their own journals (`.eq('nama_guru', user.nama)`). In `AdminRekapView.tsx` and `PiketView.tsx` (Rekap tab), admins see school-wide data, while teachers can see their own or school-wide reports as configured.

---

## 4. Conclusion & Precise Implementation Plan for Workers

### Task 1: Fix `src/components/RekapSiswaView.tsx`
- **File**: `src/components/RekapSiswaView.tsx`
- **Changes**:
  1. Auto-select first class when `kelasList` is loaded:
     ```typescript
     if (uniqueKelas.length > 0 && !kelas) setKelas(uniqueKelas[0] as string);
     ```
  2. In `tarikRekap`, initialize student map with `hadir: 0`:
     ```typescript
     rekapMap[s.nama_siswa] = { ...s, hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0 };
     ```
  3. Replace the broken heuristic parser (lines 75-93) with multi-format attendance parser:
     ```typescript
     jurnal?.forEach(j => {
       let absensiJson: Record<string, string> | null = null;
       if (j.absensi_siswa && j.absensi_siswa.trim().startsWith('{')) {
         try { absensiJson = JSON.parse(j.absensi_siswa); } catch (_) { absensiJson = null; }
       }

       siswa?.forEach(s => {
         const nisn = s.nisn;
         const nama = s.nama_siswa;
         const target = rekapMap[nama];
         if (!target) return;

         // 1. Check JSON by NISN
         if (absensiJson && absensiJson[nisn]) {
           const code = absensiJson[nisn].toUpperCase();
           if (code === 'H') target.hadir++;
           else if (code === 'S') target.sakit++;
           else if (code === 'I') target.izin++;
           else if (code === 'A') target.alpa++;
           return;
         }

         // 2. Check detail_absen format: "Nama Siswa (A)" or "Nama Siswa (H)"
         const detail = j.detail_absen || '';
         if (detail) {
           const escaped = nama.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
           const match = detail.match(new RegExp(`${escaped}\\s*\\(([HSIAhsia])\\)`, 'i'));
           if (match) {
             const code = match[1].toUpperCase();
             if (code === 'H') target.hadir++;
             else if (code === 'S') target.sakit++;
             else if (code === 'I') target.izin++;
             else if (code === 'A') target.alpa++;
             return;
           }
         }

         // 3. Fallback: Check if formatted as "Sakit: Nama, Izin: Nama"
         const combined = `${j.absensi_siswa || ''} ${j.detail_absen || ''}`;
         const namaLower = nama.toLowerCase();
         if (combined.toLowerCase().includes(namaLower)) {
           if (/sakit/i.test(combined) && combined.toLowerCase().indexOf('sakit') < combined.toLowerCase().indexOf(namaLower)) {
             target.sakit++;
           } else if (/izin/i.test(combined) && combined.toLowerCase().indexOf('izin') < combined.toLowerCase().indexOf(namaLower)) {
             target.izin++;
           } else if (/alpa/i.test(combined) && combined.toLowerCase().indexOf('alpa') < combined.toLowerCase().indexOf(namaLower)) {
             target.alpa++;
           }
         }
       });
     });
     ```
  4. Compute `total` and `% Kehadiran` for each student.
  5. Add `Hadir` and `% Kehadiran` columns to `table` (lines 148-166) and CSV export (lines 180-192).
  6. Add search input for students by name/NISN.
  7. Add summary cards above table: Total Siswa, Rata-rata Kehadiran %, Total Sakit, Total Izin, Total Alpa.

---

### Task 2: Enhance `src/components/RekapJurnalView.tsx`
- **File**: `src/components/RekapJurnalView.tsx`
- **Changes**:
  1. Add month selector (`input type="month"`) with automatic date population or toggle between "Bulan Ini" and "Rentang Tanggal".
  2. Auto-fetch journals for current month on component mount.
  3. Add search bar to filter journals by `materi` or `kegiatan`.
  4. Add summary metric cards:
     - Total Jurnal
     - Disetujui (Green)
     - Menunggu (Yellow)
     - Ditolak (Red)
  5. Replace raw JSON on line 127 with human-friendly formatter:
     ```typescript
     function formatAbsensi(rawAbsensi: string, detailAbsen: string) {
       if (!rawAbsensi && !detailAbsen) return '-';
       if (rawAbsensi && rawAbsensi.trim().startsWith('{')) {
         try {
           const parsed = JSON.parse(rawAbsensi);
           const counts = { H: 0, S: 0, I: 0, A: 0 };
           Object.values(parsed).forEach((v: any) => {
             const key = String(v).toUpperCase() as 'H'|'S'|'I'|'A';
             if (counts[key] !== undefined) counts[key]++;
           });
           return `Hadir: ${counts.H} | Sakit: ${counts.S} | Izin: ${counts.I} | Alpa: ${counts.A}`;
         } catch (_) {}
       }
       if (rawAbsensi && rawAbsensi.includes('|')) {
         return rawAbsensi.replace(/\|/g, ' · ');
       }
       return detailAbsen || rawAbsensi || '-';
     }
     ```
  6. Update CSV export to use formatted attendance and UTF-8 BOM (`\uFEFF`).

---

### Task 3: Repair & Upgrade `src/components/AdminRekapView.tsx`
- **File**: `src/components/AdminRekapView.tsx`
- **Changes**:
  1. Auto-fetch current month's recap on mount (`useEffect`).
  2. Query `data_guru` to seed the base list of all active teachers:
     ```typescript
     const { data: guruList } = await supabase.from('data_guru').select('nama_guru').order('nama_guru');
     ```
     Initialize `pMap[g.nama_guru] = { hadir: 0, izin: 0, sakit: 0, dinasLuar: 0, telatDetik: 0, piket: 0, jurnal: 0 };`
  3. Query `laporan_piket` for the selected period:
     ```typescript
     const { data: piket } = await supabase
       .from('laporan_piket')
       .select('guru_pelapor, status_verifikasi')
       .gte('tanggal', startDateStr)
       .lte('tanggal', endDateStr)
       .eq('status_verifikasi', 'Disetujui');
     ```
     Aggregate `pMap[p.guru_pelapor].piket++`.
  4. Add summary metric cards at the top of the results:
     - Total Guru Aktif
     - Total Kehadiran
     - Total Jurnal Disetujui
     - Total Laporan Piket
  5. Add teacher search input (`search`) to quickly filter cards.
  6. Add Piket Duty badge/metric to teacher cards and separate Piket summary card list.
  7. Fix CSV Export:
     - Include `Alpa`, `Keterlambatan (Jam/Menit)`, and `Piket Disetujui`.
     - Prepend UTF-8 BOM (`\uFEFF`) to Blob.

---

### Task 4: Implement "Rekap Piket" Tab in `src/components/PiketView.tsx`
- **File**: `src/components/PiketView.tsx`
- **Changes**:
  1. Add 3rd tab: `rekap` ("Rekap Piket") to tab bar (line 123).
  2. Add filters:
     - Month picker (`input type="month"`) or date range.
     - Teacher filter dropdown (`Semua Guru` or specific teacher from `data_guru`).
     - Verification status filter (`Semua`, `Disetujui`, `Menunggu`, `Ditolak`).
     - Search input (catatan apel or teacher name).
  3. Query `laporan_piket` matching selected filters.
  4. Display summary metric badges:
     - Total Laporan
     - Disetujui
     - Menunggu
  5. Render responsive card/table list showing:
     - Tanggal & Hari
     - Guru Pelapor
     - Catatan Apel / Kejadian
     - Status Verifikasi badge
     - Link Foto Dokumentasi (opens photo in new tab)
     - Ringkasan Kehadiran Siswa (formatted from `rekap_absen_kelas` JSON)
  6. Add Action Buttons:
     - "Export Excel (CSV)" with UTF-8 BOM.
     - "Cetak Dokumen" (`window.print()`) with `<PrintHeader />` and `<PrintSignature />`.

---

### Task 5: Enhance `src/components/AnalitikView.tsx`
- **File**: `src/components/AnalitikView.tsx`
- **Changes**:
  1. Query `laporan_piket` for the selected month (`status_verifikasi = 'Disetujui'`).
  2. Add `Total Piket` card to `Statistik Global`.
  3. Replace dummy score logic on line 72 with transparent formula:
     ```typescript
     const score = (data.hadir * 5) + (data.jurnal * 5) + ((data.piket || 0) * 10);
     ```

---

## 5. Verification Method

To independently verify the implementation after code updates:

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   Must exit with code 0.

2. **Next.js Production Build**:
   ```bash
   npm run build
   ```
   Must succeed without any compilation or prerendering errors.

3. **Runtime & Functional Verification**:
   - **Rekap Siswa**:
     Navigate to "Presensi Siswa" (`view-rekap-siswa`), select class "XI Merdeka", select current date range. Verify that students with recent attendance (e.g., September 10-11, 2026) show non-zero Hadir and Alpa matching the JSON entries in `jurnal_pembelajaran`.
   - **Rekap Jurnal**:
     Navigate to "Rekap Jurnal" (`view-guru-rekap-jurnal`), verify summary badges (Total, Disetujui, Menunggu, Ditolak) render at the top, and verify `Absensi Siswa` renders clean formatted text (e.g. `Hadir: 7 | Sakit: 0 | Izin: 0 | Alpa: 1`) instead of raw JSON `{"91255714": "A"}`.
   - **Admin Rekap Akhir**:
     Navigate to "Rekap Akhir" (`view-admin-rekap`), click fetch for current month. Verify all 13 teachers from `data_guru` appear, Piket counts are displayed, and exported CSV contains `Alpa`, `Keterlambatan`, and `Piket` columns.
   - **Rekap Piket**:
     Navigate to "Modul Piket" (`view-piket`), switch to the new "Rekap Piket" tab. Verify filter by month/teacher/status works, summary counts match `laporan_piket`, and Excel/Print buttons work.
