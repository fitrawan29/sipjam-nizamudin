# Handoff Report — Codebase Survey for Requirements R1 & R2
**Agent**: `explorer_survey_nov_1`  
**Date**: 2026-11-06T22:42:00Z  
**Target Requirements**: R1 (Pusat Verifikasi Data, Presensi & Jurnal Validation/Print, Perangkat Kelas X) & R2 (Laporan & Analitik Kerja — Removal of Cetak Dokumen Resmi)

---

## 1. Observation

### 1.1 Pusat Verifikasi Data Component Layout & Tabs
- **Main Container**: `src/components/AdminVerifView.tsx` (1478 lines)
  - Rendered when `currentView === 'view-admin-verif'` in `src/components/AppScreen.tsx:1251`.
  - Lines 37-46 & 897-942: Active tabs are `'Presensi'`, `'Jurnal'`, `'Piket'`, and `'Dokumen'` (aliased to Perangkat).
  - Lines 931-947: The `'Dokumen'` tab renders `<DokumenView user={user} isReadOnly={isReadOnly} />`.
  - Lines 58-61: Dropdown filters: `taskFilter` (`'Semua' | 'Sudah' | 'Belum'`) and `verifFilter` (`'Semua' | 'Menunggu' | 'Disetujui' | 'Ditolak'`).
  - Lines 81-87: Auxiliary master data loading:
    ```ts
    const [teachersRes, piketRes, jadwalRes, penugasanRes, pengaturanRes] = await Promise.all([
      supabase.from('data_guru').select('*').order('nama_guru', { ascending: true }),
      supabase.from('jadwal_piket').select('*'),
      supabase.from('jadwal_pelajaran').select('*'),
      supabase.from('penugasan_piket').select('*'),
      supabase.from('pengaturan').select('*')
    ]);
    ```
    *Direct observation*: `kalender_pendidikan` is NOT queried or loaded anywhere in `AdminVerifView.tsx`. Searching `kalender` or `libur` in `AdminVerifView.tsx` yields 0 results.

### 1.2 Presensi and Jurnal Validation: False Neglect on Holiday (Libur), Leave (Izin), and Sickness (Sakit)
- **Holiday (Libur) False Neglect in `AdminVerifView.tsx`**:
  - `unsubmittedPresensi` (lines 539-626):
    Filters `allTeachers` against `submittedList`. On holidays (Sundays, Saturdays with 5-day week, or calendar holidays), no attendance is submitted. Without holiday verification, teachers are mapped to:
    ```ts
    id: `unsub-presensi-${t.id}`,
    pesan_belum: isFreeFromPresence ? 'Bebas Hadir' : 'Belum melakukan presensi datang maupun pulang',
    status_label: isFreeFromPresence ? 'Bebas Hadir' : 'Belum Selesai',
    isUnsubmitted: true
    ```
    This causes all teachers to show up as "Belum Presensi" on holidays when filtering by `taskFilter === 'Belum'` or `'Semua'`.
  - `unsubmittedJurnal` (lines 628-705):
    Teachers with scheduled teaching hours on that day of the week are evaluated against `submittedList`. Because it's a holiday, no journals were created, causing teachers to be flagged as:
    ```ts
    pesan_belum: scheduledClasses.length > 0 
      ? `Belum mengisi jurnal KBM untuk ${scheduledClasses.length} kelas terjadwal pada hari ${effectiveDayName}` 
      : `Belum mengisi jurnal pembelajaran untuk tanggal ${targetDate}`,
    isUnsubmitted: true
    ```

- **Sakit & Izin False Neglect / Omission in `AdminVerifView.tsx` & `AdminRekapView.tsx`**:
  - In `AdminVerifView.tsx` (lines 475-484):
    ```ts
    export function isRealSubmittedJournal(j: any): boolean {
      if (!j) return false;
      const sv = j.status_verifikasi;
      if (sv === 'Tidak Masuk Kelas' || sv === 'Tidak Melaksanakan Kegiatan' || sv === 'Sakit' || sv === 'Izin') return false;
      const ket = (j.keterangan || '').trim().toLowerCase();
      if (ket === 'tidak masuk kelas' || ket === 'tidak melaksanakan kegiatan apapun' || ket === 'auto-fill sistem karena guru berhalangan hadir') return false;
      const mat = (j.materi || j.materi_pembelajaran || '').trim().toLowerCase();
      if (mat === 'tidak masuk kelas' || mat === 'tidak melaksanakan kegiatan apapun' || mat.startsWith('guru tidak dapat mengisi jurnal karena')) return false;
      return true;
    }
    ```
    `isRealSubmittedJournal` returns `false` if `status_verifikasi === 'Sakit' || status_verifikasi === 'Izin'`. This strips excused leave journals from `realSubmissions`. In the Jurnal tab, excused teachers vanish or get flagged as unsubmitted if `isTeacherOnLeave` misses their leave record.
  - In `AdminRekapView.tsx` (lines 291-302):
    ```ts
    } else if (p.tipe_absen === 'Datang' && (p.status_verifikasi === 'Disetujui' || p.status_verifikasi === 'Diverifikasi')) {
      if (p.jenis_presensi === 'Sekolah' || p.jenis_presensi === 'Izin Terlambat' || p.jenis_presensi === 'Terlambat') {
        pMap[canonicalNama].hadir++;
        pMap[canonicalNama].telatDetik += (p.keterlambatan_detik || 0);
      } else if (p.jenis_presensi === 'Dinas Luar') {
        pMap[canonicalNama].dinasLuar++;
      } else if (p.jenis_presensi === 'Izin') {
        if (p.detail_izin?.includes('Sakit')) pMap[canonicalNama].sakit++;
        else pMap[canonicalNama].izin++;
      }
      // Record Alpa dari DB tidak dijumlah langsung — Alpa dihitung dari selisih
    }
    ```
    *Direct observation*: There is NO `else if (p.jenis_presensi === 'Sakit')` branch! When a teacher submits attendance with `jenis_presensi === 'Sakit'` (set by `GuruPresensi.tsx:491`), `pMap[canonicalNama].sakit` is NEVER incremented.
    Then at line 335:
    ```ts
    const alpa = Math.max(0, totalHariKerja - hadirEfektif - dinasLuar - sakit - izin);
    ```
    Because `sakit` is 0, the teacher is falsely computed and recorded as **ALPA**!

  - In `src/lib/attendanceAlpa.ts` (lines 1034-1053):
    The automated cutoff evaluates unfilled KBM schedules. To find whether the teacher was excused, it runs:
    ```ts
    let pQ = client.from('presensi_guru').select('*').eq('tipe_absen', 'Datang');
    if (typeof (pQ as any)?.gte === 'function') pQ = (pQ as any).gte('timestamp', startOfDay);
    if (typeof (pQ as any)?.lte === 'function') pQ = (pQ as any).lte('timestamp', endOfDay);
    ```
    It only looks at `timestamp` for the single day. For multi-day leaves (`tanggal_mulai` to `tanggal_selesai`), day 2 and day 3 do not match `timestamp`, so `leaveType` evaluates to `null` and the system auto-records `Tidak Masuk Kelas` (unexcused delinquency).

- **False Neglect on Holidays in `RekapJurnalView.tsx`**:
  - In `src/components/RekapJurnalView.tsx` (lines 268-274):
    ```ts
    while (cur <= end) {
      const dateStr = getWitaDateStr(cur);
      if (dateStr > todayStr) break;
      const dayName = getWitaDayName(cur);
      if (dayName !== 'Minggu') {
        ...
        missingEntries.push({
          materi: isExcused ? leaveType! : 'tidak masuk kelas',
          status_verifikasi: isExcused ? leaveType! : 'Tidak Masuk Kelas',
          ...
        });
      }
    }
    ```
    The loop only skips `'Minggu'`. It does NOT query `kalender_pendidikan` or 5-day week Saturday (`hari_sekolah === 5`). As a result, for every national/educational calendar holiday, it synthesizes `Tidak Masuk Kelas` (for KBM) or `tidak melaksanakan kegiatan apapun` (for personal activity journal).

### 1.3 Document Printing ("Cetak Dokumen" for Presensi & Jurnal)
- **Presensi Printing**:
  - Located in `src/components/AdminRekapView.tsx` Sub-Tab 2 (`Tabel Rekapitulasi`, lines 761-850) and Sub-Tab 3 (`Cetak Dokumen Resmi`, lines 855-933).
  - Both render the 11-column table (`No`, `Nama Guru`, `Wajib`, `Hadir`, `Dinas Luar`, `Sakit`, `Izin`, `Alpa`, `Pulang Cepat`, `Keterlambatan`, `Piket`, `Jurnal`).
  - Triggered via `triggerPrintWithGps()` (`src/utils/printWithGps.ts:31`), attaching GPS coordinates, `PrintHeader` with KOP, and `PrintSignature`.
  - "Libur" is excluded from working days via `countWorkdays(startDateStr, endDateStr, hariSekolah, liburDates)` (line 220), so it does not appear as a column or row in the recap table.
  - Sickness (`Sakit`) currently prints as `0` and inflates `Alpa` due to the aforementioned `AdminRekapView.tsx:297` missing condition.
- **Jurnal Printing**:
  - Located in `src/components/RekapJurnalView.tsx` (lines 815-1175 & 1210-1275).
  - Triggered via button `Cetak Dokumen` (`<button onClick={() => triggerPrintWithGps()} ...>`) at line 1305.
  - Generates 10-column table (pribadi) or 13-column table (kelas/supervisi).
  - Displays `Sakit` and `Izin` in columns 5, 6, 12, and status verifikasi.
  - Currently, because missing entries are synthesized for holidays, holidays erroneously appear as rows (`tidak masuk kelas` / `tidak melaksanakan kegiatan apapun`).

### 1.4 Verifikasi Perangkat & Mata Pelajaran Kelas X ("Mata Pelajaran Umum" Issue)
- **Rendering Location**:
  - `src/components/AdminVerifView.tsx:946` renders `<DokumenView user={user} isReadOnly={isReadOnly} />`.
  - In `src/components/DokumenView.tsx`, when `isAdmin` is true, default tab is `'matrix'` (`Teacher Matrix Card System`), rendering `filteredTeacherSubjectCards` (lines 1078-1150).
- **Exact Cause of "Mata Pelajaran Umum"**:
  - In `DokumenView.tsx` (lines 711-736):
    ```ts
    teachersList.forEach(teacher => {
      const tName = (teacher.nama_guru || '').trim().toLowerCase();
      // Teacher's assigned subjects
      const teacherGm = guruMapelList.filter(
        gm => (gm.nama_guru || '').trim().toLowerCase() === tName
      );

      const subjects: { nama_mapel: string; kelas: string }[] = [];
      const seenSub = new Set<string>();

      teacherGm.forEach(gm => {
        const mName = gm.nama_mapel || gm.mapel_singkat || '';
        const kls = gm.kelas || '';
        const key = `${mName}-${kls}`;
        if (mName && !seenSub.has(key)) {
          seenSub.add(key);
          subjects.push({ nama_mapel: mName, kelas: kls });
        }
      });

      if (subjects.length === 0) {
        subjects.push({
          nama_mapel: teacher.mata_pelajaran || 'Mata Pelajaran Umum',
          kelas: ''
        });
      }
    ```
    And in `myTeacherSubjects` (lines 555-562):
    ```ts
    if (list.length === 0) {
      const g = teachersList.find(t => (t.nama_guru || '').trim().toLowerCase() === (user?.nama || '').trim().toLowerCase());
      const rawFallback = g?.mata_pelajaran || user?.mata_pelajaran || 'Mata Pelajaran Umum';
      const fallbackMapel = isInvalidMapel(rawFallback) ? normalizeScheduleMapel(rawFallback) : rawFallback;
      list.push({ nama_mapel: fallbackMapel, kelas: '' });
    }
    ```
  - **Discrepancy 1**: Strict name matching `gm.nama_guru === tName`.
    In `data_guru`, teachers have full names (e.g. `Ade Fitrawan Ibrahim`, `Setia Ambar Ningsih Mamonto`, `Susana Muliono`).
    In `jadwal_pelajaran` and `guru_mapel`, teachers for Class X (e.g. `X Merdeka`) are recorded with short names: `Ade`, `Ambar`, `Susan`, `Fitri`, `Rizki`.
    Because `(gm.nama_guru || '').trim().toLowerCase() === tName` is a strict equality check, `teacherGm` yields 0 matches.
  - **Discrepancy 2**: Fallback to hardcoded string `'Mata Pelajaran Umum'`.
    When `subjects.length === 0`, if `teacher.mata_pelajaran` is empty or generic, it falls back to `'Mata Pelajaran Umum'`.
    Even when `teacher.mata_pelajaran` exists in `data_guru`, it is a raw comma-delimited string (e.g. `"X Merdeka_MTK, X Merdeka_Informatika, XI Merdeka_MTK, XII Merdeka_MTK"`), which is pushed as a single unparsed string without associating `kelas: 'X Merdeka'`.
  - **Discrepancy 3**: Lack of `connectGuruMapelWithJadwal`.
    `DokumenView.tsx` does NOT call `connectGuruMapelWithJadwal` (from `src/lib/workflow.ts:429`), which is specifically designed to reconcile fuzzy/tokenized teacher names (`Ade` <-> `Ade Fitrawan Ibrahim`), `data_mapel`, and `jadwal_pelajaran` into structured `{ nama_mapel, kelas }` items.

### 1.5 Navigation, Routing, and Sub Menu "Cetak Dokumen Resmi" (Requirement R2)
- **Module Navigation**:
  - `src/lib/navigation.ts`:
    - Menu item for Admin (line 143): `{ id: 'view-admin-rekap', icon: 'fa-chart-pie', label: 'Laporan & Analitik Kinerja', dataTour: 'view-admin-rekap view-analitik' }`.
    - Menu item for Superadmin (line 100): `{ id: 'view-admin-rekap', icon: 'fa-chart-pie', label: 'Laporan & Analitik', dataTour: 'view-admin-rekap view-analitik' }`.
    - Menu item for Kepala Sekolah (line 130): `{ id: 'view-admin-rekap', icon: 'fa-chart-pie', label: 'Laporan & Analitik', dataTour: 'view-admin-rekap view-analitik' }`.
    - Route Aliases (lines 31-32):
      - `'view-analitik': { view: 'view-admin-rekap', tab: 'analitik' }`
      - `'view-rekap-guru': { view: 'view-admin-rekap', tab: 'tabel' }`
- **Sub Menu "Cetak Dokumen Resmi"**:
  - `src/components/AdminRekapView.tsx:427`:
    ```ts
    const tabItems: TabItem[] = [
      { id: 'analitik', label: 'Analitik & Leaderboard', icon: 'fa-chart-pie' },
      { id: 'tabel', label: 'Tabel Rekapitulasi', icon: 'fa-table-list' },
      { id: 'cetak', label: 'Cetak Dokumen Resmi', icon: 'fa-print' },
    ];
    ```
  - `src/components/AdminRekapView.tsx:853-933`:
    Renders `{/* SUB-TAB 3: CETAK DOKUMEN RESMI */}`.
    *Direct observation*: Sub-Tab 3 is an almost 100% duplicate of Sub-Tab 2 (`Tabel Rekapitulasi`, lines 761-850). Both render the exact same 11-column table, both have the Excel export button, and both have the `Cetak Halaman` button (`triggerPrintWithGps()`).
  - `src/components/Onboarding/tutorialSteps.ts:132`:
    `subTabs: ['Analitik & Leaderboard', 'Tabel Rekapitulasi', 'Cetak Dokumen Resmi'],`
  - `tests/navigation_consolidation_verification.test.ts:403 & 628`:
    Asserts `sanitizeSubTab('view-admin-rekap')` has `['analitik', 'tabel', 'cetak']` and tests `resolveCanonicalRoute('view-admin-rekap', 'cetak')`.

---

## 2. Logic Chain

1. **Premise**: In Indonesian school operations, teachers do not work on Sundays, Saturdays (for 5-day schools), or national/school holidays recorded in `kalender_pendidikan`.
2. **Finding from Observation 1.1 & 1.2**: `AdminVerifView.tsx` does not check `kalender_pendidikan` or weekend days. Its unsubmitted teacher cross-referencing evaluates whether a teacher submitted presence or journals on the evaluated date.
3. **Deduction**: On any holiday, zero submissions exist. The system evaluates this as delinquency, producing false "Belum Presensi" and "Belum mengisi jurnal KBM" alerts.
4. **Finding from Observation 1.2**: In `AdminRekapView.tsx:297`, the condition only handles `p.jenis_presensi === 'Izin'`. When `jenis_presensi === 'Sakit'`, the branch is skipped, `pMap[canonicalNama].sakit` remains 0, and line 335 computes the days as `Alpa`. Additionally, in `attendanceAlpa.ts:1034`, active multi-day leaves are queried only by single-day `timestamp`, converting subsequent leave days into `Tidak Masuk Kelas`.
5. **Deduction**: Sickness submissions are not credited in the monthly recap, and multi-day leaves convert into false delinquencies after day 1.
6. **Finding from Observation 1.4**: In `DokumenView.tsx:714`, teacher names from `data_guru` are matched against `guru_mapel` using strict string equality (`===`). Teachers in `data_guru` have full names, whereas in `jadwal_pelajaran` and `guru_mapel` they have short first names (e.g., `Ade` vs `Ade Fitrawan Ibrahim`).
7. **Deduction**: Matching fails, `subjects` array is empty, and the fallback at line 733 assigns `'Mata Pelajaran Umum'`. Connecting `data_guru`, `jadwal_pelajaran`, and `data_mapel` via tokenized/fuzzy matching (as done in `connectGuruMapelWithJadwal`) resolves specific Class X subjects (e.g. Matematika, Fisika, Biologi, Informatika for Kelas X).
8. **Finding from Observation 1.5**: In `AdminRekapView.tsx`, Sub-Tab 3 ("Cetak Dokumen Resmi") is redundant with Sub-Tab 2 ("Tabel Rekapitulasi"). Sub-Tab 2 already contains the full print layout, KOP, GPS authentication, and Excel export.
9. **Deduction**: Removing `{ id: 'cetak', label: 'Cetak Dokumen Resmi', icon: 'fa-print' }` from `tabItems` and stripping the Sub-Tab 3 JSX block eliminates the sub-menu cleanly. Adding a fallback `initialTab === 'cetak' ? 'tabel' : initialTab` guarantees zero broken links for legacy bookmarks. Updating `tutorialSteps.ts` and test assertions ensures complete zero-regression compliance.

---

## 3. Caveats

1. **Multi-Tenant Scope**: All calendar checks (`kalender_pendidikan`) must filter by `sekolah_id` (or universal fallback `sekolah_id is null` / `00000000-0000-0000-0000-000000000000`) so multi-school configurations do not bleed holiday dates across schools.
2. **5-Day vs 6-Day Work Week**: Saturday is a holiday only if `pengaturan.key === 'hari_sekolah'` is set to `5`. If `6`, Saturday is a normal school day unless explicitly listed in `kalender_pendidikan`.
3. **Database Schema Variants**: Columns `durasi_hari`, `tanggal_mulai`, and `tanggal_selesai` in `presensi_guru` may be null in legacy records. Any queries evaluating leaves must accommodate single-day records where only `timestamp` exists, as well as multi-day records.
4. **Adversarial Test Assertions**: `tests/navigation_consolidation_verification.test.ts` contains assertions expecting `'cetak'` in `tabItems` and `validTabs['view-admin-rekap']`. When removing `'cetak'` from `AdminRekapView.tsx`, the implementer must also adjust those assertions so the test suite passes 100%.

---

## 4. Conclusion & Architectural Recommendations

### Recommended Actions for Requirement R1:
1. **Presensi & Jurnal Validation in `AdminVerifView.tsx`**:
   - In `loadAuxData()`: Load `kalender_pendidikan` (for the school) and `hari_sekolah` from `pengaturan`.
   - In `unsubmittedPresensi` and `unsubmittedJurnal`:
     - Determine if `effectiveDate` is a holiday (`isHoliday = isSunday || (hariSekolah === 5 && isSaturday) || calenderLibur.has(effectiveDate)`).
     - If `isHoliday`: Display a clear banner "Hari Libur: [Keterangan Libur]" and do NOT mark teachers as unsubmitted or delinquent.
     - For `Izin` and `Sakit`: Expand `presensiList` query in `loadData()` to cover multi-day leaves (`lte('tanggal_mulai', targetD).gte('tanggal_selesai', targetD)`).
     - In the Jurnal tab: Display excused teachers with a badge "Dikecualikan (Izin / Sakit)" rather than stripping them or flagging them as unsubmitted.
2. **Attendance & Sickness Credit in `AdminRekapView.tsx` & `attendanceAlpa.ts`**:
   - In `AdminRekapView.tsx:297`: Add `else if (p.jenis_presensi === 'Sakit' || p.detail_izin?.toLowerCase().includes('sakit')) { pMap[canonicalNama].sakit++; }`.
   - Credit multi-day leaves across all working days within their date span.
   - In `attendanceAlpa.ts:1034`: Check active multi-day leaves in `presensiDatang` so day 2 and day 3 are properly marked with `status_verifikasi = leaveType` instead of auto-converting to `Tidak Masuk Kelas`.
3. **Print Documents**:
   - In `RekapJurnalView.tsx`: Skip dates where `isHoliday === true` when synthesizing missing entries (lines 268-397). Ensure no "Libur" rows appear in the print document. Preserve clear printing of `Sakit` and `Izin`.
   - In `AdminRekapView.tsx`: Sub-Tab 2 already excludes holidays from working days. Fixing the `sakit` aggregation bug ensures `Sakit` and `Izin` are accurately printed with 0 false Alpa.
4. **Verifikasi Perangkat Kelas X in `DokumenView.tsx`**:
   - Replace strict equality `gm.nama_guru === tName` with tokenized matching (or invoke `connectGuruMapelWithJadwal` from `src/lib/workflow.ts:429` using `jadwal_pelajaran` and `data_mapel`).
   - Parse `data_guru.mata_pelajaran` and `jadwal_pelajaran` for Class X subjects (`X Merdeka_MTK` -> `Matematika / MTK`, `X Merdeka_Informatika` -> `Informatika`, with `kelas: 'X Merdeka'`).
   - Remove the default `'Mata Pelajaran Umum'` fallback.

### Recommended Actions for Requirement R2:
1. **Remove Sub-Tab "Cetak Dokumen Resmi"**:
   - In `src/components/AdminRekapView.tsx:427`: Remove `{ id: 'cetak', label: 'Cetak Dokumen Resmi', icon: 'fa-print' }` from `tabItems`.
   - Remove Sub-Tab 3 block (lines 853-933). (Sub-Tab 2 retains complete printing and export capabilities).
   - In `AdminRekapView.tsx:103`: Add fallback `const [activeTab, setActiveTab] = useState<string>(initialTab === 'cetak' ? 'tabel' : initialTab);` to redirect legacy `?tab=cetak` cleanly to `'tabel'`.
2. **Update Onboarding Tutorial**:
   - In `src/components/Onboarding/tutorialSteps.ts:132`: Update `subTabs: ['Analitik & Leaderboard', 'Tabel Rekapitulasi']`.
3. **Update Test Suites**:
   - In `tests/navigation_consolidation_verification.test.ts`: Update `sanitizeSubTab` valid tabs for `view-admin-rekap` to `['analitik', 'tabel']` and adapt test assertion T1.4.4.

---

## 5. Verification Method

To independently verify all findings and test subsequent implementation:

1. **Verify Existing Suites Run and Pass**:
   ```powershell
   npx tsx tests/m6_3_dashboards_and_verif.test.ts
   npx tsx tests/m10_r2_r3.test.ts
   npx tsx tests/navigation_consolidation_verification.test.ts
   ```
2. **Verify Code Locations**:
   - Inspect `AdminVerifView.tsx:539-705` to confirm `unsubmittedPresensi` and `unsubmittedJurnal` lack holiday checks.
   - Inspect `AdminRekapView.tsx:297` to confirm `jenis_presensi === 'Sakit'` is missing from aggregation.
   - Inspect `DokumenView.tsx:714-736` to confirm strict teacher name equality and `'Mata Pelajaran Umum'` fallback.
   - Inspect `AdminRekapView.tsx:427` and `AdminRekapView.tsx:853` to confirm the duplicate "Cetak Dokumen Resmi" sub-tab.
3. **Invalidation Conditions**:
   - If `AdminVerifView.tsx` already checked `kalender_pendidikan` or weekend days, our finding regarding false holiday delinquency would be invalidated (confirmed absent).
   - If `DokumenView.tsx` already matched Class X subjects without falling back to `'Mata Pelajaran Umum'`, our finding would be invalidated (confirmed fallback present at line 558 & 733).
   - If `AdminRekapView.tsx` Sub-Tab 3 contained unique functionality absent in Sub-Tab 2, our finding that it is a pure duplicate would be invalidated (confirmed Sub-Tab 2 already has print, signature, and Excel).
