# Handoff Report — Explorer 3: Grading Logic, Attendance Integration & Test Suite

- **Project**: orchestrator_21
- **Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3`
- **Role**: Explorer 3 (Grading Logic, Absensi & Testing Explorer)
- **Authoritative Request**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (entry at 2026-10-10T22:56:05Z)
- **Date**: 2026-10-11

---

## 1. Observation

### 1.1 Existing Score Calculation in `src/components/GradebookView.tsx`

Inspection of `src/components/GradebookView.tsx` reveals two distinct calculation scopes:

#### A. Per-TP Calculation: `calculateStudentTpStats` (Lines 1283–1356)
- **Diagnostik**:
  ```ts
  // Line 1287: Diagnostik fetched but completely excluded from TP final score
  const diagVal = diagnostikCol ? sGrades[diagnostikCol.id] : null;
  ```
- **Formatif Weighted Average**:
  ```ts
  // Lines 1290–1300
  let sumF = 0;
  let sumWeightF = 0;
  formatifCols.forEach(col => {
    const val = sGrades[col.id];
    if (val !== null && val !== undefined && !isNaN(val)) {
      const weight = col.bobot ? Number(col.bobot) : 1;
      sumF += val * weight;
      sumWeightF += weight;
    }
  });
  const avgF = sumWeightF > 0 ? parseFloat((sumF / sumWeightF).toFixed(1)) : null;
  ```
- **Sumatif Weighted Average**:
  ```ts
  // Lines 1303–1313
  let sumS = 0;
  let sumWeightS = 0;
  sumatifCols.forEach(col => {
    const val = sGrades[col.id];
    if (val !== null && val !== undefined && !isNaN(val)) {
      const weight = col.bobot ? Number(col.bobot) : 1;
      sumS += val * weight;
      sumWeightS += weight;
    }
  });
  const avgS = sumWeightS > 0 ? parseFloat((sumS / sumWeightS).toFixed(1)) : null;
  ```
- **Nilai Akhir TP** (Normalized Formatif + Sumatif for a single TP):
  ```ts
  // Lines 1317–1328
  let finalTp: number | null = null;
  const fPct = bobotFormatif;
  const sPct = bobotSumatif;
  const fsTotal = fPct + sPct;
  if (avgF !== null && avgS !== null && fsTotal > 0) {
    finalTp = parseFloat((avgF * (fPct / fsTotal) + avgS * (sPct / fsTotal)).toFixed(1));
  } else if (avgS !== null) {
    finalTp = avgS;
  } else if (avgF !== null) {
    finalTp = avgF;
  }
  ```

#### B. Overall Semester Calculation: `calculateStudentSemesterStats` (Lines 1361–1435)
- **Current State**:
  ```ts
  // Lines 1404–1419
  // Aggregate semester final with kehadiran component
  // ponytail: kehadiran placeholder = 100 until kehadiran-per-mapel data is wired
  const avgFormatifAll = allAvgF.length > 0 ? allAvgF.reduce((a, b) => a + b, 0) / allAvgF.length : null;
  const avgSumatifAll = allAvgS.length > 0 ? allAvgS.reduce((a, b) => a + b, 0) / allAvgS.length : null;
  const kehadiranScore = 100; // ponytail: placeholder; replace with real attendance query when available

  let semesterFinalRaw: number | null = null;
  if (avgFormatifAll !== null || avgSumatifAll !== null) {
    const f = avgFormatifAll ?? 0;
    const s = avgSumatifAll ?? 0;
    semesterFinalRaw = parseFloat((
      kehadiranScore * (bobotKehadiran / 100) +
      f * (bobotFormatif / 100) +
      s * (bobotSumatif / 100)
    ).toFixed(1));
  }
  ```
- **Observed Deficiency**:
  1. `kehadiranScore` is hardcoded as `100` instead of querying the student's actual attendance for the subject.
  2. If `avgSumatifAll` is `null` (e.g., student has only taken Formatif assessments), `const s = avgSumatifAll ?? 0` assigns 0, artificially penalizing the score, instead of displaying `'-'` or `null` as required by acceptance criteria: *"Jika tidak ada data formatif atau sumatif, nilai akhir menampilkan '-' / null (tidak error)"*.

### 1.2 Admin Bobot Configuration Mechanism
- **Loading Bobot** (`GradebookView.tsx:182–212`):
  Defaults: `kehadiran: 40`, `formatif: 30`, `sumatif: 30`. Loaded from table `pengaturan` using key `'bobot_nilai_mapel'`.
- **Saving & Validation** (`GradebookView.tsx:667–692`):
  - Strictly requires `bobotForm.kehadiran + bobotForm.formatif + bobotForm.sumatif === 100`.
  - Rejects with `showToast('Validasi', 'Total bobot harus 100%. Saat ini: ...', 'warning')`.
  - Saved as JSON string `{"kehadiran":40,"formatif":30,"sumatif":30}` in `pengaturan`.

### 1.3 Diagnostik Constraint & Assessment Rules
- **Rule 1: Diagnostik Max 1 per TP**:
  - In `GradebookView.tsx:713–735`: `fetchColumnsForActiveTP` auto-heals / initializes exactly 1 Diagnostik column if missing.
  - In `GradebookView.tsx:1102`: `handleOpenAddColModal(kategori: 'Formatif' | 'Sumatif')` restricts add column buttons in the UI to Formatif and Sumatif only (no manual "+ Diagnostik" button).
  - In `GradebookView.tsx:1195–1198`: `handleDeleteCol` blocks deleting Diagnostik (`showToast('Tidak Dapat Dihapus', 'Asesmen Diagnostik wajib ada tepat 1 per Tujuan Pembelajaran.', 'warning')`).
  - *Missing in DB*: While UI restricts adding Diagnostik, PostgreSQL table `asesmen_kolom` currently lacks a database-level unique constraint preventing concurrent or programmatic insertion of a second Diagnostik column for the same `tp_id`.
- **Rule 2: Diagnostik Excluded from Nilai Akhir**:
  - Confirmed: `diagnostikCol` is never factored into `allAvgF`, `allAvgS`, or `semesterFinalRaw`.

### 1.4 How Attendance is Tracked in the Database
- **Table `public.absensi`** (`src/types/database.ts:17–75`):
  - Columns: `id`, `sekolah_id`, `tanggal`, `kelas`, `siswa_id`, `nisn`, `nama_siswa`, `status` (`'Hadir'|'Izin'|'Sakit'|'Alpa'`), `keterangan`, `sumber_perubahan`, `diubah_oleh`, `log_perubahan`.
  - Constraint: `UNIQUE (sekolah_id, tanggal, nisn)`.
- **Table `public.jurnal_pembelajaran`** (`src/types/database.ts:514–615`):
  - Columns: `id`, `sekolah_id`, `mapel`, `kelas`, `tanggal`, `absensi_siswa` (JSON string of `{ [nisn]: 'H'|'S'|'I'|'A' }`), `kehadiran_murid`.
  - In `src/components/GuruJurnal.tsx:827–863`: Each Jurnal KBM submission records the subject's attendance and synchronizes it to `absensi`.
- **Attendance Querying Pattern in `src/components/RaporView.tsx:120–144`**:
  `RaporView.tsx` queries:
  ```ts
  let aQuery = supabase.from('absensi').select('nisn, status').eq('kelas', selectedKelas);
  if (sekolahId) aQuery = aQuery.eq('sekolah_id', sekolahId);
  const { data: aData } = await aQuery;
  ```
  And compiles `{ hadir, izin, sakit, alpa }` for each `nisn`.

### 1.5 Rekap Semester & Rapor Integration
- **`src/components/GradebookView.tsx` Tab 2 (`'rekap-semester'`, lines 2465–2604)**:
  Renders student table with columns `#`, `NISN`, `Nama Siswa`, `L/P`, `[TP Columns]`, `Nilai Rapor` (`stats.semesterFinal ?? '-'`), `Predikat Semester`, and `Deskripsi Capaian Pembelajaran` (`stats.deskripsiCapaian`).
- **`exportSemesterToCsv` (lines 1548–1586)**:
  Exports `semStats.semesterFinal` and `semStats.predikat` for all students in the class.
- **`generateKurikulumMerdekaDeskripsi` (lines 20–104)**:
  Pure exported function taking `(studentName: string, tpScores: { kode, deskripsi, score }[])` returning `CapaianDeskripsiResult`.
  Used by:
  1. `GradebookView.tsx:1424` (Tab 2 deskripsi column).
  2. `src/components/RaporView.tsx:218` (Wali Kelas report card synthesis).
  3. `tests/m4_academic_merdeka_rapor.test.ts`.
  4. `tests/adversarial_kurikulum_merdeka_cp.test.ts`.
  5. `tests/adversarial_kurikulum_merdeka_cp_permutations.test.ts`.

### 1.6 Syntax Error Blocker in `GradebookView.tsx`
- Running `npx tsx tests/adversarial_kurikulum_merdeka_cp.test.ts` fails with:
  ```
  Error: Transform failed with 1 error:
  src/components/GradebookView.tsx:3144:5: ERROR: Expected identifier but found "/"
  ```
- **Direct Cause**: Premature closure tags `</section>\n );\n}` were inadvertently inserted at lines 3056–3058 immediately following the Admin Bobot Modal, leaving the subsequent `Modal Bulk Fill Grades` outside the component scope. Removing lines 3056–3058 resolves this immediately.

### 1.7 Existing Test Suites
- Test command: `npm test` runs 19 test suites using `tsx` (configured in `package.json`).
- Related academic test suites in `tests/`:
  - `tests/m4_gradebook.test.ts` (verifies CRUD, TP calculation, Diagnostik isolation).
  - `tests/m4_academic_merdeka_rapor.test.ts` (verifies `generateKurikulumMerdekaDeskripsi`, Wali Kelas access guards).
  - `tests/adversarial_kurikulum_merdeka_cp.test.ts` (100+ checks for Kurikulum Merdeka boundary logic).
  - `tests/adversarial_kurikulum_merdeka_cp_permutations.test.ts` (permutation test for empty/degenerate arrays and score distribution).

---

## 2. Logic Chain

### 2.1 Diagnostik Exclusion & Limit Architecture
1. **Exclusion from Formula**:
   - *Observation (1.1)*: `diagnostikCol` represents diagnostic/baseline competency.
   - *Requirement (ORIGINAL_REQUEST R2 & R3)*: Diagnostik must not count towards Nilai Akhir.
   - *Deduction*: Diagnostik columns must strictly be excluded from both `avgFormatifAll` and `avgSumatifAll`. In `GradebookView`, Formatif columns are filtered by `c.kategori === 'Formatif'` and Sumatif by `c.kategori === 'Sumatif'`. Diagnostik (`kategori === 'Diagnostik'`) is ignored during aggregation, satisfying the isolation rule.
2. **Limit: Max 1 per TP**:
   - *UI Layer*: The UI already restricts addition by only offering `handleOpenAddColModal('Formatif')` and `handleOpenAddColModal('Sumatif')`. If `handleSaveCol` is invoked, add an explicit guard:
     ```ts
     if (colForm.kategori === 'Diagnostik') {
       const existingDiag = columnsList.find(c => c.kategori === 'Diagnostik');
       if (existingDiag && (!editingCol || editingCol.id !== existingDiag.id)) {
         showToast('Validasi Gagal', 'Maksimal 1 Asesmen Diagnostik per Tujuan Pembelajaran.', 'warning');
         return;
       }
     }
     ```
   - *DB Layer*: Enforce via partial unique index in migration:
     ```sql
     CREATE UNIQUE INDEX IF NOT EXISTS uq_asesmen_tp_diagnostik 
     ON public.asesmen_kolom(tp_id) WHERE (kategori = 'Diagnostik');
     ```

### 2.2 Mathematical Design of Nilai Akhir Formula
1. **Core Equation**:
   $$\text{Nilai Akhir} = (\text{bobot}_{\text{kehadiran}} \times \text{rata}_{\text{kehadiran}}) + (\text{bobot}_{\text{formatif}} \times \text{rata}_{\text{formatif}}) + (\text{bobot}_{\text{sumatif}} \times \text{rata}_{\text{sumatif}})$$
   Where:
   - $\text{bobot}_{\text{kehadiran}} + \text{bobot}_{\text{formatif}} + \text{bobot}_{\text{sumatif}} = 100\%$
   - Standard defaults: $40\%$, $30\%$, $30\%$
2. **Handling Missing / Incomplete Data**:
   - *Requirement R3*: *"Jika tidak ada data formatif atau sumatif, nilai akhir menampilkan '-' / null (tidak error)"*.
   - *Logic*:
     - If both `avgFormatifAll === null` and `avgSumatifAll === null`: return `null`.
     - If either `avgFormatifAll === null` or `avgSumatifAll === null`: return `null` (since a Kurikulum Merdeka subject final grade cannot be certified without both formative progress and summative achievement).
     - If `totalPertemuan === 0` (no attendance sessions recorded yet): default `rata_kehadiran` to `100.0` so students are not penalized for untracked attendance.
   - *Implementation*:
     ```ts
     const avgFormatifAll = allAvgF.length > 0 ? allAvgF.reduce((a, b) => a + b, 0) / allAvgF.length : null;
     const avgSumatifAll = allAvgS.length > 0 ? allAvgS.reduce((a, b) => a + b, 0) / allAvgS.length : null;
     const rataKehadiran = attendanceRates[nisn] ?? 100;

     let semesterFinalRaw: number | null = null;
     if (avgFormatifAll !== null && avgSumatifAll !== null) {
       const wK = bobotKehadiran / 100;
       const wF = bobotFormatif / 100;
       const wS = bobotSumatif / 100;

       semesterFinalRaw = parseFloat((
         (rataKehadiran * wK) +
         (avgFormatifAll * wF) +
         (avgSumatifAll * wS)
       ).toFixed(1));
     }
     ```

### 2.3 Attendance (`absensi`) Integration Strategy
1. **Data Source Evaluation**:
   - `jurnal_pembelajaran` records contain `mapel`, `kelas`, `tanggal`, and `absensi_siswa` (JSON map of student attendance per KBM session).
   - `absensi` table stores daily verified attendance records (`kelas`, `tanggal`, `status`, `nisn`).
2. **Robust Dual-Source Resolver**:
   - Query KBM journals for `selectedMapel` and `selectedKelas`:
     ```ts
     let jQ = supabase
       .from('jurnal_pembelajaran')
       .select('tanggal, absensi_siswa')
       .eq('mapel', selectedMapel)
       .eq('kelas', selectedKelas);
     if (sekolahId) jQ = jQ.eq('sekolah_id', sekolahId);
     const { data: jData } = await jQ;
     ```
   - If `jData` has KBM entries with `absensi_siswa`:
     - Parse JSON for each journal session.
     - For each student: `hadirCount = count where status in ('H', 'Hadir')`, `totalSessions = jData.length`.
     - `attendanceRate = (hadirCount / totalSessions) * 100`.
   - Fallback (if no journals yet):
     - Query canonical `absensi` table matching `RaporView.tsx`:
       ```ts
       let aQ = supabase.from('absensi').select('nisn, status').eq('kelas', selectedKelas);
       if (sekolahId) aQ = aQ.eq('sekolah_id', sekolahId);
       const { data: aData } = await aQ;
       ```
     - For each student: `total = hadir + izin + sakit + alpa`.
     - `attendanceRate = total > 0 ? (hadir / total) * 100 : 100.0`.
   - Store in `attendanceRates: Record<string, number>`.

### 2.4 Regression Prevention for Rekap Semester & Rapor
1. **Preserve Export Signature**:
   - `generateKurikulumMerdekaDeskripsi` and `CapaianDeskripsiResult` must remain unchanged in `GradebookView.tsx`.
   - `RaporView.tsx` imports this exact function at line 9. Preserving its inputs and outputs guarantees 0 regressions in `RaporView.tsx`.
2. **Preserve Tab 2 Columns**:
   - Tab 2 table in `GradebookView.tsx` expects `stats.semesterFinal`, `stats.predikat`, and `stats.deskripsiCapaian`.
   - When `stats.semesterFinal === null`, the table renders `'-'`, matching acceptance criteria.
3. **Preserve CSV Export**:
   - `exportSemesterToCsv` outputs `Nilai_Rapor_Semester` and `Predikat` cleanly with no `NaN` or unhandled exceptions.

---

## 3. Caveats

1. **Read-Only Explorer Discipline**:
   In strict compliance with teamwork explorer rules, no code changes were made to `src/components/GradebookView.tsx` or `src/types/database.ts`. All solutions are provided as exact actionable blueprints for the Implementer.
2. **Historical Absence Records**:
   In instances where school sessions have just started and 0 attendance records exist for a subject, defaulting `rata_kehadiran` to `100.0` prevents penalizing students with 0% attendance.
3. **Partial Unique Index in PostgreSQL**:
   `CREATE UNIQUE INDEX ... WHERE (kategori = 'Diagnostik')` is PostgreSQL-specific. This is fully supported by Supabase PostgreSQL.

---

## 4. Conclusion

### 4.1 Concrete Implementer Blueprint for `src/components/GradebookView.tsx`

1. **Step 1: Fix Syntax Error**:
   Delete lines 3056–3058:
   ```tsx
   // REMOVE THESE 3 LINES:
       </section>
     );
   }
   ```
   This ensures `Modal Bulk Fill Grades` remains inside the component return statement.

2. **Step 2: Add Attendance Querying Hook**:
   ```ts
   // State
   const [attendanceRates, setAttendanceRates] = useState<Record<string, number>>({});

   // Fetch attendance when mapel/kelas/sekolahId changes
   useEffect(() => {
     if (!selectedKelas || !selectedMapel) {
       setAttendanceRates({});
       return;
     }

     const fetchMapelAttendance = async () => {
       try {
         // 1. Try fetching from jurnal_pembelajaran for this specific mapel & kelas
         let jQ = supabase
           .from('jurnal_pembelajaran')
           .select('absensi_siswa')
           .eq('mapel', selectedMapel)
           .eq('kelas', selectedKelas);
         if (sekolahId) jQ = jQ.eq('sekolah_id', sekolahId);
         const { data: jData } = await jQ;

         const rates: Record<string, number> = {};

         if (jData && jData.length > 0 && jData.some(j => j.absensi_siswa)) {
           const studentHadirCount: Record<string, number> = {};
           let validSessions = 0;

           jData.forEach(j => {
             if (!j.absensi_siswa) return;
             try {
               const parsed = typeof j.absensi_siswa === 'string' ? JSON.parse(j.absensi_siswa) : j.absensi_siswa;
               validSessions++;
               Object.entries(parsed).forEach(([nisn, status]) => {
                 const st = String(status).toUpperCase();
                 if (st === 'H' || st === 'HADIR') {
                   studentHadirCount[nisn] = (studentHadirCount[nisn] || 0) + 1;
                 }
               });
             } catch {}
           });

           if (validSessions > 0) {
             students.forEach(s => {
               const hadir = studentHadirCount[s.nisn] || 0;
               rates[s.nisn] = parseFloat(((hadir / validSessions) * 100).toFixed(1));
             });
             setAttendanceRates(rates);
             return;
           }
         }

         // 2. Fallback: query canonical absensi table for this class
         let aQ = supabase.from('absensi').select('nisn, status').eq('kelas', selectedKelas);
         if (sekolahId) aQ = aQ.eq('sekolah_id', sekolahId);
         const { data: aData } = await aQ;

         if (aData && aData.length > 0) {
           const studentStats: Record<string, { hadir: number; total: number }> = {};
           aData.forEach(row => {
             if (!studentStats[row.nisn]) studentStats[row.nisn] = { hadir: 0, total: 0 };
             studentStats[row.nisn].total++;
             const st = (row.status || '').toUpperCase();
             if (st === 'H' || st === 'HADIR') studentStats[row.nisn].hadir++;
           });

           students.forEach(s => {
             const stat = studentStats[s.nisn];
             rates[s.nisn] = stat && stat.total > 0 ? parseFloat(((stat.hadir / stat.total) * 100).toFixed(1)) : 100;
           });
           setAttendanceRates(rates);
           return;
         }

         // 3. Fallback default: 100% if no records yet
         const defaultRates: Record<string, number> = {};
         students.forEach(s => { defaultRates[s.nisn] = 100; });
         setAttendanceRates(defaultRates);
       } catch (err) {
         console.error('Error fetching attendance for gradebook:', err);
       }
     };

     fetchMapelAttendance();
   }, [selectedMapel, selectedKelas, sekolahId, students]);
   ```

3. **Step 3: Update `calculateStudentSemesterStats`**:
   Replace lines 1404–1420 with:
   ```ts
   // Aggregate semester final with real kehadiran component
   const avgFormatifAll = allAvgF.length > 0 ? allAvgF.reduce((a, b) => a + b, 0) / allAvgF.length : null;
   const avgSumatifAll = allAvgS.length > 0 ? allAvgS.reduce((a, b) => a + b, 0) / allAvgS.length : null;
   const kehadiranScore = attendanceRates[nisn] ?? 100;

   let semesterFinalRaw: number | null = null;
   // Requirement: "Jika tidak ada data formatif atau sumatif, nilai akhir menampilkan '-' / null (tidak error)"
   if (avgFormatifAll !== null && avgSumatifAll !== null) {
     const wKehadiran = bobotKehadiran / 100;
     const wFormatif = bobotFormatif / 100;
     const wSumatif = bobotSumatif / 100;

     semesterFinalRaw = parseFloat((
       (kehadiranScore * wKehadiran) +
       (avgFormatifAll * wFormatif) +
       (avgSumatifAll * wSumatif)
     ).toFixed(1));
   }
   ```

4. **Step 4: Update UI Validation for Diagnostik Limit**:
   In `handleSaveCol` (line 1162):
   ```ts
   if (colForm.kategori === 'Diagnostik') {
     const existingDiag = columnsList.find(c => c.kategori === 'Diagnostik');
     if (existingDiag && (!editingCol || editingCol.id !== existingDiag.id)) {
       showToast('Validasi Gagal', 'Maksimal 1 Asesmen Diagnostik per Tujuan Pembelajaran.', 'warning');
       return;
     }
   }
   ```

---

## 5. Verification Method

### 5.1 Verification Commands
1. **TypeScript Static Check**:
   ```powershell
   npx tsc --noEmit
   ```
   *Pass Condition*: 0 errors (clean compilation after removing lines 3056–3058).

2. **Kurikulum Merdeka CP Engine Verification**:
   ```powershell
   npx tsx tests/adversarial_kurikulum_merdeka_cp.test.ts
   ```
   *Pass Condition*: All boundary tests pass with exit code 0.

3. **Extended Permutations Verification**:
   ```powershell
   npx tsx tests/adversarial_kurikulum_merdeka_cp_permutations.test.ts
   ```
   *Pass Condition*: All degenerate array tests pass with exit code 0.

4. **Dedicated New Test File to Implement**:
   Create `tests/gradebook_formula_and_attendance.test.ts` to programmatically verify:
   - Nilai Akhir formula: `(40% * 90) + (30% * 80) + (30% * 70) = 36 + 24 + 21 = 81.0`.
   - Diagnostik isolation: Diagnostik score 50 vs 100 produces identical Nilai Akhir.
   - Missing data check: Formatif `null` or Sumatif `null` returns `null` (displayed as `'-'`).
   - Weight validation: Sum != 100 is rejected.
   - Attendance rate calculation from mock meetings.

### 5.2 Invalidation Conditions
- Any occurrence of `NaN` or unexpected fallback when a student has missing grades.
- Any change to the exported signature of `generateKurikulumMerdekaDeskripsi` or `CapaianDeskripsiResult`.
- Permitting more than 1 Diagnostik column per TP.
- Factoring Diagnostik scores into the semester final grade.
