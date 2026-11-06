# Technical Implementation Blueprint: Accurate Document Printing & Sub-Menu Cleanup (M1 & R2)
**Agent**: `explorer_m1_nov_2`  
**Date**: 2026-11-06T22:48:00Z  
**Target Requirements**: R1 (Accurate Document Printing for Presensi & Jurnal) & R2 (Clean Removal of Sub Menu "Cetak Dokumen Resmi")  
**Target Files**:
- `src/components/AdminRekapView.tsx`
- `src/components/RekapJurnalView.tsx`
- `src/lib/navigation.ts`
- `src/components/Onboarding/tutorialSteps.ts`
- `tests/navigation_consolidation_verification.test.ts`
- `tests/adversarial_m1_print_verification.test.ts`

---

## 1. Observation

### 1.1 Sickness & Excused Absence False Alpa in `AdminRekapView.tsx`
- **Location**: `src/components/AdminRekapView.tsx:287-303`
  ```ts
  if (p.tipe_absen === 'Pulang') {
    if (p.jenis_presensi === 'Pulang Cepat' || p.status_verifikasi === 'Pulang Cepat') {
      pMap[canonicalNama].pulangCepat++;
    }
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
  *Direct observation*: When a teacher submits attendance with `jenis_presensi === 'Sakit'` (set by `GuruPresensi.tsx:491`), the condition `else if (p.jenis_presensi === 'Izin')` evaluates to `false`. There is NO branch handling `p.jenis_presensi === 'Sakit'`. Consequently, `pMap[canonicalNama].sakit` remains 0.
- **Impact on Alpa Calculation**: Line 335:
  ```ts
  const alpa = Math.max(0, totalHariKerja - hadirEfektif - dinasLuar - sakit - izin);
  ```
  Because `sakit` is 0, every sick day is subtracted from `totalHariKerja` and falsely registered as **Alpa**!
- **Multi-Day Leave Span & SQL Windowing**: Lines 169-170:
  ```ts
  .gte('timestamp', start)
  .lte('timestamp', end)
  ```
  When teachers submit multi-day sick leave (`durasi_hari > 1`, spanning `tanggal_mulai` to `tanggal_selesai`), only a single row is inserted at `timestamp` of day 1. If the leave spans across month boundaries, or if the calculation only performs `sakit++` for the single row, all subsequent sick days within that leave period are ignored, inflating Alpa.

### 1.2 Holiday Delinquency & False Missing Rows in `RekapJurnalView.tsx`
- **Location**: `src/components/RekapJurnalView.tsx:268-274`
  ```ts
  while (cur <= end) {
    const dateStr = getWitaDateStr(cur);
    if (dateStr > todayStr) break;

    const dayName = getWitaDayName(cur);
    if (dayName !== 'Minggu') {
  ```
  *Direct observation*: The loop only checks `dayName !== 'Minggu'`.
  1. It completely ignores `kalender_pendidikan` (educational/national holidays).
  2. It ignores 5-day week rules (when `pengaturan.hari_sekolah === 5`, Saturday is a holiday).
  Because teachers do not submit teaching journals on holidays, lines 332-356 synthesize:
  `materi: 'tidak masuk kelas'`, `status_verifikasi: 'Tidak Masuk Kelas'`, and lines 368-392 synthesize: `materi: 'tidak melaksanakan kegiatan apapun'`, `status_verifikasi: 'Tidak Melaksanakan Kegiatan'`.
  This causes holiday dates to erroneously appear as delinquent rows in the printed document.
- **Multi-Day Leave Omission in Journal**: Lines 311-314:
  ```ts
  const leavePresensi = (presensiRows || []).find((p: any) => {
    if (!p.timestamp) return false;
    const pDate = p.timestamp.substring(0, 10);
    if (pDate !== dateStr) return false;
  ```
  Multi-day excused leaves only match the first day's `p.timestamp`. Day 2 and Day 3 fail `pDate !== dateStr`, so `leaveType` evaluates to `null`, turning excused sick teachers into `tidak masuk kelas`.
- **Personal Activity Journal Excused Leave Omission**: Lines 360-394:
  When teacher has no KBM schedules, it synthesizes `Tidak Melaksanakan Kegiatan` without checking if the teacher was on approved `Sakit` or `Izin`.

### 1.3 Redundant Sub-Tab 3 "Cetak Dokumen Resmi" (Requirement R2)
- **Location**: `src/components/AdminRekapView.tsx:424-428`
  ```ts
  const tabItems: TabItem[] = [
    { id: 'analitik', label: 'Analitik & Leaderboard', icon: 'fa-chart-pie' },
    { id: 'tabel', label: 'Tabel Rekapitulasi', icon: 'fa-table-list' },
    { id: 'cetak', label: 'Cetak Dokumen Resmi', icon: 'fa-print' },
  ];
  ```
- **Redundant Block**: Lines 853-933 (`{/* SUB-TAB 3: CETAK DOKUMEN RESMI */}`).
  *Direct observation*: Sub-Tab 3 is an almost 100% duplicate of Sub-Tab 2 (`Tabel Rekapitulasi`, lines 713-850). Sub-Tab 2 already possesses:
  1. Universal KOP surat (`<PrintHeader user={user} sekolahId={user?.sekolah_id} />`, lines 484-495).
  2. The complete 11-column table (`No`, `Nama Guru`, `Wajib`, `Hadir`, `Dinas Luar`, `Sakit`, `Izin`, `Alpa`, `Pulang Cepat`, `Keterlambatan`, `Piket`, `Jurnal`).
  3. Legally binding print signature (`<PrintSignature>`, lines 832-840).
  4. GPS security watermark printing via `triggerPrintWithGps()` (line 846).
  5. Excel export via `handleExportCsv()` (line 843).
- **Onboarding Tutorial**: `src/components/Onboarding/tutorialSteps.ts:132` registers:
  `subTabs: ['Analitik & Leaderboard', 'Tabel Rekapitulasi', 'Cetak Dokumen Resmi']`.
- **Test Suite Expectations**:
  `tests/navigation_consolidation_verification.test.ts:403-404, 628, 1013-1014` explicitly expects `'cetak'` sub-tab to exist.
  `tests/adversarial_m1_print_verification.test.ts:78, 477` searches for `activeTab === 'cetak'`.

---

## 2. Logic Chain

1. **Premise 1 (Presensi Aggregation)**:
   In `GuruPresensi.tsx:491`, sick teachers submit attendance with `jenis_presensi = 'Sakit'`. In `AdminRekapView.tsx:291-300`, the branch only matches `p.jenis_presensi === 'Izin'`. Therefore, `p.jenis_presensi === 'Sakit'` is ignored, leaving `sakit` at 0. Since `alpa = max(0, totalHariKerja - hadirEfektif - dinasLuar - sakit - izin)`, the uncredited days become false Alpa.
   **Solution**: Match `p.jenis_presensi === 'Sakit'`, `p.detail_izin?.toLowerCase().includes('sakit')`, and `p.status_verifikasi === 'Sakit'`. Furthermore, track credited leave dates per teacher using `Set<string>` across multi-day spans `[tanggal_mulai, tanggal_selesai]` to guarantee zero double-counting and zero undercounting.

2. **Premise 2 (Holiday Non-Delinquency)**:
   Schools do not conduct KBM on Sundays, Saturdays (for 5-day schools), or calendar holidays (`kalender_pendidikan.tipe === 'Libur'`). In `RekapJurnalView.tsx:273`, the missing-entry generator only skips `'Minggu'`.
   **Solution**: Query `hari_sekolah` from `pengaturan` and holiday dates from `kalender_pendidikan`. If `isWeekend || isCalendarHoliday`, immediately skip that date in the simulation loop. No missing entries are generated for holidays, ensuring zero "Libur" or false delinquency rows appear in the print document.

3. **Premise 3 (Clean Sub-Menu Removal R2)**:
   Sub-Tab 3 in `AdminRekapView.tsx` is completely redundant with Sub-Tab 2. Removing `{ id: 'cetak', ... }` from `tabItems` and removing the duplicate Sub-Tab 3 block cleans the UI without losing any functionality.
   **Solution**:
   - Strip `{ id: 'cetak', ... }` from `tabItems`.
   - Remove lines 853-933.
   - Redirect any legacy access where `initialTab === 'cetak'` or `defaultTab === 'cetak'` to `'tabel'` in both `AdminRekapView.tsx` and `src/lib/navigation.ts:resolveCanonicalRoute`.
   - Update `tutorialSteps.ts` and adapt test assertions in `tests/navigation_consolidation_verification.test.ts`.

---

## 3. Caveats

1. **Multi-Tenant Isolation**: Queries to `kalender_pendidikan`, `pengaturan`, and `presensi_guru` must filter by `sekolah_id` (or universal null) so holidays and settings from one school do not affect another.
2. **Backward-Compatibility with Adversarial Tests**: `tests/adversarial_m1_print_verification.test.ts` (lines 78, 89, 114, 477) was written in an earlier milestone to verify Sub-Tab 3 had no duplicate kop. When Sub-Tab 3 is removed, those assertions must be updated to test that Sub-Tab 3 has been cleanly eliminated and Sub-Tab 2 contains the sole consolidated legal print layout.
3. **Date Formats**: Attendance dates can come from ISO strings with timezone offsets. All date string comparisons must use WITA calendar strings (`YYYY-MM-DD`).

---

## 4. Conclusion & Exact Implementation Blueprints

### 4.1 `src/components/AdminRekapView.tsx`

#### A. InitialTab Normalization (Line 96-110)
```tsx
export default function AdminRekapView({
  user,
  isKepalaSekolah,
  isReadOnly = false,
  targetSchool,
  initialTab = 'tabel'
}: AdminRekapViewProps) {
  // Requirement R2: Redirect legacy 'cetak' subtab cleanly to 'tabel'
  const normalizedInitialTab = initialTab === 'cetak' ? 'tabel' : initialTab;
  const [activeTab, setActiveTab] = useState<string>(normalizedInitialTab);
  const [leaderboardLimit, setLeaderboardLimit] = useState<5 | 10>(5);

  useEffect(() => {
    const target = initialTab === 'cetak' ? 'tabel' : initialTab;
    if (target && target !== activeTab) {
      setActiveTab(target);
    }
  }, [initialTab]);
```

#### B. Multi-Day Leave Query Integration (Lines 164-177)
```tsx
      // 2. Fetch presensi_guru (both single-day and multi-day spans)
      let presensiQuery = supabase
        .from('presensi_guru')
        .select('*')
        .not('nama_guru', 'ilike', '%test guru%')
        .not('nama_guru', 'ilike', '%guru test%')
        .gte('timestamp', start)
        .lte('timestamp', end)
        .in('status_verifikasi', ['Disetujui', 'Diverifikasi', 'Pulang Cepat', 'Sakit', 'Izin'])
        .order('timestamp', { ascending: true });
      if (user?.sekolah_id) {
        presensiQuery = presensiQuery.eq('sekolah_id', user.sekolah_id);
      }

      let multiDayQuery = supabase
        .from('presensi_guru')
        .select('*')
        .not('nama_guru', 'ilike', '%test guru%')
        .not('nama_guru', 'ilike', '%guru test%')
        .lte('tanggal_mulai', endDateStr)
        .gte('tanggal_selesai', startDateStr)
        .in('status_verifikasi', ['Disetujui', 'Diverifikasi', 'Sakit', 'Izin']);
      if (user?.sekolah_id) {
        multiDayQuery = multiDayQuery.eq('sekolah_id', user.sekolah_id);
      }

      const [{ data: presensiSingle }, { data: presensiMulti }] = await Promise.all([
        presensiQuery,
        multiDayQuery
      ]);

      const presensiMap = new Map<string, any>();
      (presensiSingle || []).forEach(p => presensiMap.set(p.id, p));
      (presensiMulti || []).forEach(p => {
        if (!presensiMap.has(p.id)) presensiMap.set(p.id, p);
      });
      const presensi = Array.from(presensiMap.values());
```

#### C. Presensi Aggregation Logic (Lines 270-304)
```tsx
      // Track credited dates per teacher to prevent double counting
      const creditedLeaveDates: Record<string, Set<string>> = {};

      // Aggregate presensi
      presensi?.forEach(p => {
        const nama = p.nama_guru?.trim();
        if (!nama || isTestGuruName(nama)) return;
        const canonicalNama = canonicalizeTeacherRekapName(nama);
        if (!pMap[canonicalNama]) {
          pMap[canonicalNama] = {
            nama: canonicalNama,
            hadir: 0,
            izin: 0,
            sakit: 0,
            dinasLuar: 0,
            pulangCepat: 0,
            telatDetik: 0,
            piket: 0,
            jurnal: 0
          };
        }
        if (!creditedLeaveDates[canonicalNama]) {
          creditedLeaveDates[canonicalNama] = new Set<string>();
        }

        if (p.tipe_absen === 'Pulang') {
          if (p.jenis_presensi === 'Pulang Cepat' || p.status_verifikasi === 'Pulang Cepat') {
            pMap[canonicalNama].pulangCepat++;
          }
        } else if (
          p.tipe_absen === 'Datang' || 
          p.jenis_presensi === 'Sakit' || 
          p.jenis_presensi === 'Izin' ||
          p.jenis_presensi === 'Dinas Luar'
        ) {
          const isApproved = 
            p.status_verifikasi === 'Disetujui' || 
            p.status_verifikasi === 'Diverifikasi' ||
            p.status_verifikasi === 'Sakit' ||
            p.status_verifikasi === 'Izin';

          if (!isApproved) return;

          const detailLower = (p.detail_izin || '').toLowerCase();
          const jenisLower = (p.jenis_presensi || '').toLowerCase();
          const statusLower = (p.status_verifikasi || '').toLowerCase();

          const isSakit = 
            jenisLower === 'sakit' || 
            detailLower.includes('sakit') || 
            statusLower === 'sakit';

          const isIzin = !isSakit && (
            jenisLower === 'izin' || 
            detailLower.includes('izin') || 
            statusLower === 'izin'
          );

          if (isSakit || isIzin) {
            // Calculate exact workdays within leave span to prevent undercounting multi-day leaves
            if (p.tanggal_mulai && p.tanggal_selesai) {
              const curLeave = new Date(p.tanggal_mulai + 'T12:00:00+08:00');
              const endLeave = new Date(p.tanggal_selesai + 'T12:00:00+08:00');
              while (curLeave <= endLeave) {
                const dow = curLeave.getDay();
                const dStr = curLeave.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
                const isWeekend = dow === 0 || (hariSekolah === 5 && dow === 6);
                if (
                  dStr >= startDateStr && 
                  dStr <= endDateStr && 
                  !isWeekend && 
                  !liburDates.has(dStr) && 
                  !creditedLeaveDates[canonicalNama].has(dStr)
                ) {
                  creditedLeaveDates[canonicalNama].add(dStr);
                  if (isSakit) pMap[canonicalNama].sakit++;
                  else pMap[canonicalNama].izin++;
                }
                curLeave.setDate(curLeave.getDate() + 1);
              }
            } else {
              const pDate = p.timestamp ? p.timestamp.substring(0, 10) : '';
              if (!creditedLeaveDates[canonicalNama].has(pDate)) {
                if (pDate) creditedLeaveDates[canonicalNama].add(pDate);
                if (isSakit) pMap[canonicalNama].sakit++;
                else pMap[canonicalNama].izin++;
              }
            }
          } else if (p.jenis_presensi === 'Dinas Luar') {
            pMap[canonicalNama].dinasLuar++;
          } else if (
            p.jenis_presensi === 'Sekolah' || 
            p.jenis_presensi === 'Izin Terlambat' || 
            p.jenis_presensi === 'Terlambat'
          ) {
            pMap[canonicalNama].hadir++;
            pMap[canonicalNama].telatDetik += (p.keterlambatan_detik || 0);
          }
          // Record Alpa dari DB tidak dijumlah langsung — Alpa dihitung dari selisih
        }
      });
```

#### D. TabItems Clean Removal of `cetak` (Lines 424-428)
```tsx
  // Requirement R2: Sub menu 'cetak' cleanly removed
  const tabItems: TabItem[] = [
    { id: 'analitik', label: 'Analitik & Leaderboard', icon: 'fa-chart-pie' },
    { id: 'tabel', label: 'Tabel Rekapitulasi', icon: 'fa-table-list' },
  ];
```

#### E. Deletion of Duplicate Sub-Tab 3 Block (Lines 853-933)
Delete the entire block:
```tsx
// REMOVE lines 853-933:
{/* ================================================================= */}
{/* SUB-TAB 3: CETAK DOKUMEN RESMI                                   */}
{/* ================================================================= */}
...
```

---

### 4.2 `src/components/RekapJurnalView.tsx`

#### A. Load `hari_sekolah` and `kalender_pendidikan` (Lines 255+)
```tsx
        // Load 5-day vs 6-day school configuration
        let hariSekolah = 6;
        try {
          let hsQ = supabase.from('pengaturan').select('value').eq('key', 'hari_sekolah');
          if (user?.sekolah_id) hsQ = hsQ.eq('sekolah_id', user.sekolah_id);
          const { data: hsRow } = await hsQ.maybeSingle();
          if (hsRow?.value) hariSekolah = parseInt(hsRow.value, 10) || 6;
        } catch (_) {}

        // Load educational calendar holidays covering the period
        const liburDates = new Set<string>();
        try {
          let calQ = supabase
            .from('kalender_pendidikan')
            .select('tanggal, keterangan, tipe, tanggal_mulai, tanggal_selesai')
            .eq('tipe', 'Libur');
          if (user?.sekolah_id) {
            calQ = calQ.or(`sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null`);
          }
          const { data: calRows } = await calQ;
          (calRows || []).forEach((c: any) => {
            if (c.tanggal_mulai && c.tanggal_selesai) {
              const cStart = new Date(c.tanggal_mulai + 'T12:00:00+08:00');
              const cEnd = new Date(c.tanggal_selesai + 'T12:00:00+08:00');
              const curCal = new Date(cStart);
              while (curCal <= cEnd) {
                const dStr = curCal.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
                liburDates.add(dStr);
                curCal.setDate(curCal.getDate() + 1);
              }
            } else if (c.tanggal) {
              liburDates.add(c.tanggal);
            }
          });
        } catch (_) {}

        // Fetch presensi_guru including multi-day leaves
        let presensiQ = supabase.from('presensi_guru').select('*');
        if (user?.sekolah_id) presensiQ = presensiQ.eq('sekolah_id', user.sekolah_id);
        if (activeMode === 'pribadi' && user?.nama) presensiQ = presensiQ.eq('nama_guru', user.nama);
        presensiQ = presensiQ.gte('timestamp', `${startDStr}T00:00:00`).lte('timestamp', `${endDStr}T23:59:59`);

        let multiPresensiQ = supabase.from('presensi_guru').select('*');
        if (user?.sekolah_id) multiPresensiQ = multiPresensiQ.eq('sekolah_id', user.sekolah_id);
        if (activeMode === 'pribadi' && user?.nama) multiPresensiQ = multiPresensiQ.eq('nama_guru', user.nama);
        multiPresensiQ = multiPresensiQ.lte('tanggal_mulai', endDStr).gte('tanggal_selesai', startDStr).neq('status_verifikasi', 'Ditolak');

        const [{ data: presensiRowsRaw }, { data: multiPresensiRows }] = await Promise.all([
          presensiQ,
          multiPresensiQ
        ]);

        const combinedPresensiMap = new Map<string, any>();
        (presensiRowsRaw || []).forEach((p: any) => combinedPresensiMap.set(p.id, p));
        (multiPresensiRows || []).forEach((p: any) => {
          if (!combinedPresensiMap.has(p.id)) combinedPresensiMap.set(p.id, p);
        });
        const presensiRows = Array.from(combinedPresensiMap.values());
```

#### B. Holiday Exclusion in Synthesis Loop (Lines 268-397)
```tsx
        while (cur <= end) {
          const dateStr = getWitaDateStr(cur);
          if (dateStr > todayStr) break;

          const dayName = getWitaDayName(cur);
          const isWeekend = dayName === 'Minggu' || (hariSekolah === 5 && dayName === 'Sabtu');
          const isCalendarHoliday = liburDates.has(dateStr);

          // REQUIREMENT R1: EXCLUDE ALL HOLIDAY DATES FROM SYNTHESIZED MISSING ENTRIES
          if (isWeekend || isCalendarHoliday) {
            cur.setDate(cur.getDate() + 1);
            continue;
          }

          const daySchedules = (allSchedules || []).filter(s => s.hari === dayName);
          let teacherSchedulesToday: any[] = [];
          ...
```

#### C. Multi-Day Leave Matching in Loop (Lines 310-330)
```tsx
                // Check if teacher has excused attendance (Sakit, Izin, Dinas Luar) on dateStr
                const leavePresensi = (presensiRows || []).find((p: any) => {
                  const pDate = p.timestamp ? p.timestamp.substring(0, 10) : '';
                  const matchesDate = (p.tanggal_mulai && p.tanggal_selesai)
                    ? (dateStr >= p.tanggal_mulai && dateStr <= p.tanggal_selesai)
                    : (pDate === dateStr);
                  if (!matchesDate) return false;

                  const matchTeacher = isTeacherScheduleMatch({ nama_guru: p.nama_guru, user_id: p.user_id }, sched);
                  if (!matchTeacher) return false;
                  if (isLateArrival(p)) return false;
                  const jp = (p.jenis_presensi || '').toLowerCase();
                  const di = (p.detail_izin || '').toLowerCase();
                  const sv = (p.status_verifikasi || '').toLowerCase();
                  return jp === 'sakit' || jp === 'izin' || jp === 'dinas luar' || 
                         di.includes('sakit') || di.includes('izin') || di.includes('dinas') ||
                         sv === 'sakit' || sv === 'izin';
                });
```

#### D. Personal Activity Journal Excused Leave Check (Lines 360-394)
```tsx
            if (activeMode === 'pribadi' && !activeKelas && !mapel && user?.nama && teacherSchedulesToday.length === 0) {
              const hasAnyJournal = combined.some(j =>
                j.tanggal === dateStr &&
                isTeacherJournalMatch({ nama_guru: user.nama, user_id: user.id, sekolah_id: user.sekolah_id }, j)
              );
              const isEligibleTime = dateStr < todayStr || currTime >= '07:00';
              if (!hasAnyJournal && isEligibleTime) {
                const teacherLeaveToday = (presensiRows || []).find((p: any) => {
                  const pDate = p.timestamp ? p.timestamp.substring(0, 10) : '';
                  const matchesDate = (p.tanggal_mulai && p.tanggal_selesai)
                    ? (dateStr >= p.tanggal_mulai && dateStr <= p.tanggal_selesai)
                    : (pDate === dateStr);
                  if (!matchesDate) return false;
                  if (!isTeacherScheduleMatch({ nama_guru: p.nama_guru, user_id: p.user_id }, { nama_guru: user.nama, user_id: user.id })) return false;
                  const jp = (p.jenis_presensi || '').toLowerCase();
                  const di = (p.detail_izin || '').toLowerCase();
                  const sv = (p.status_verifikasi || '').toLowerCase();
                  return jp === 'sakit' || jp === 'izin' || jp === 'dinas luar' || 
                         di.includes('sakit') || di.includes('izin') || di.includes('dinas') ||
                         sv === 'sakit' || sv === 'izin';
                });

                const leaveType: 'Sakit' | 'Izin' | 'Dinas Luar' | null = teacherLeaveToday ? (
                  (teacherLeaveToday.jenis_presensi === 'Sakit' || teacherLeaveToday.detail_izin?.toLowerCase().includes('sakit') || teacherLeaveToday.status_verifikasi === 'Sakit') ? 'Sakit' :
                  (teacherLeaveToday.jenis_presensi === 'Dinas Luar' || teacherLeaveToday.detail_izin?.toLowerCase().includes('dinas')) ? 'Dinas Luar' : 'Izin'
                ) : null;

                if (leaveType) {
                  missingEntries.push({
                    id: `excused-kegiatan-${dateStr}-${user.id || 'guru'}`,
                    tanggal: dateStr,
                    nama_guru: user.nama,
                    user_id: user.id || null,
                    sekolah_id: user.sekolah_id || null,
                    kelas: '-',
                    mapel: 'Jurnal Kegiatan',
                    jam_ke: '-',
                    materi: leaveType,
                    materi_pembelajaran: leaveType,
                    kegiatan: `Presensi ${leaveType}`,
                    kegiatan_pembelajaran: `Presensi ${leaveType}`,
                    keterangan: leaveType,
                    status_verifikasi: leaveType,
                    catatan_refleksi: `Presensi ${leaveType}`,
                    tujuan_pembelajaran: '-',
                    kktp: '-',
                    konten: leaveType,
                    lokasi_kbm: '-',
                    kehadiran_murid: '-',
                    foto_kegiatan: teacherLeaveToday.link_bukti && teacherLeaveToday.link_bukti !== '-' ? teacherLeaveToday.link_bukti : '-',
                    link_bukti_foto: teacherLeaveToday.link_bukti && teacherLeaveToday.link_bukti !== '-' ? teacherLeaveToday.link_bukti : '-'
                  });
                } else {
                  missingEntries.push({
                    id: `unfilled-kegiatan-${dateStr}-${user.id || 'guru'}`,
                    tanggal: dateStr,
                    nama_guru: user.nama,
                    user_id: user.id || null,
                    sekolah_id: user.sekolah_id || null,
                    kelas: '-',
                    mapel: 'Jurnal Kegiatan',
                    jam_ke: '-',
                    materi: 'tidak melaksanakan kegiatan apapun',
                    materi_pembelajaran: 'tidak melaksanakan kegiatan apapun',
                    kegiatan: 'tidak melaksanakan kegiatan apapun',
                    kegiatan_pembelajaran: 'tidak melaksanakan kegiatan apapun',
                    keterangan: 'tidak melaksanakan kegiatan apapun',
                    status_verifikasi: 'Tidak Melaksanakan Kegiatan',
                    catatan_refleksi: 'tidak melaksanakan kegiatan apapun',
                    tujuan_pembelajaran: '-',
                    kktp: '-',
                    konten: 'tidak melaksanakan kegiatan apapun',
                    lokasi_kbm: '-',
                    kehadiran_murid: '-',
                    foto_kegiatan: '-',
                    link_bukti_foto: '-'
                  });
                }
              }
            }
```

#### E. Elimination of "Libur" Rows from Print Document (Lines 533-573)
```tsx
  const filteredJurnal = (jurnalData || [])
    .filter(j => {
      // REQUIREMENT R1: Exclude any rows labeled "Libur" from the document output
      const statusLower = (j.status_verifikasi || '').toLowerCase();
      const ketLower = (j.keterangan || '').toLowerCase();
      const matLower = (j.materi || j.materi_pembelajaran || '').toLowerCase();
      if (statusLower === 'libur' || ketLower === 'libur' || matLower === 'libur') {
        return false;
      }
      // Standard search filters follow...
```

---

### 4.3 `src/lib/navigation.ts`
In `resolveCanonicalRoute` (lines 54-73):
```ts
export function resolveCanonicalRoute(rawView: string | null | undefined, rawTab?: string | null): RouteResolution {
  const trimmed = (rawView || '').trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
    return { canonicalView: 'view-home', isLegacyAlias: false };
  }
  const cleanView = trimmed;
  const alias = VIEW_ALIASES[cleanView];
  let canonicalView = cleanView;
  let defaultTab = (rawTab && rawTab.trim() !== '') ? rawTab.trim() : undefined;
  let isLegacyAlias = false;

  if (alias) {
    canonicalView = alias.view;
    defaultTab = (rawTab && rawTab.trim() !== '') ? rawTab.trim() : alias.tab;
    isLegacyAlias = true;
  }

  // Requirement R2: Transparent redirection of legacy 'cetak' subtab to 'tabel'
  if (canonicalView === 'view-admin-rekap' && defaultTab === 'cetak') {
    defaultTab = 'tabel';
  }

  return {
    canonicalView,
    defaultTab,
    isLegacyAlias
  };
}
```

---

### 4.4 `src/components/Onboarding/tutorialSteps.ts`
Line 132:
```ts
// BEFORE:
subTabs: ['Analitik & Leaderboard', 'Tabel Rekapitulasi', 'Cetak Dokumen Resmi'],

// AFTER:
subTabs: ['Analitik & Leaderboard', 'Tabel Rekapitulasi'],
```

---

### 4.5 `tests/navigation_consolidation_verification.test.ts`
- **Line 403-405**:
  ```ts
  // BEFORE:
  const c4CetakTab = resolveCanonicalRoute('view-admin-rekap', 'cetak');
  assertEqual(c4CetakTab.defaultTab, 'cetak', 'T1.4.4', 'Defines sub-tab "cetak" for official letterhead printing & Excel export');

  // AFTER:
  const c4CetakTab = resolveCanonicalRoute('view-admin-rekap', 'cetak');
  assertEqual(c4CetakTab.defaultTab, 'tabel', 'T1.4.4', 'Legacy sub-tab "cetak" transparently aliases/redirects to "tabel" print view');
  ```
- **Line 628**:
  ```ts
  // BEFORE:
  'view-admin-rekap': ['analitik', 'tabel', 'cetak'],

  // AFTER:
  'view-admin-rekap': ['analitik', 'tabel'],
  ```
- **Line 1013-1014**:
  ```ts
  // BEFORE:
  const s4Cetak = resolveCanonicalRoute('view-admin-rekap', 'cetak');
  assertEqual(s4Cetak.defaultTab, 'cetak', 'T4.S4.5', 'Scenario 4.5: Principal generates signed official report in tab cetak');

  // AFTER:
  const s4Cetak = resolveCanonicalRoute('view-admin-rekap', 'cetak');
  assertEqual(s4Cetak.defaultTab, 'tabel', 'T4.S4.5', 'Scenario 4.5: Principal generates signed official report from consolidated tab tabel');
  ```

---

### 4.6 `tests/adversarial_m1_print_verification.test.ts`
Update assertions AR-03, AR-04, AR-07, SEC-04, SEC-05 to reflect that Sub-Tab 3 has been cleanly eliminated per Requirement R2:
- AR-03 / AR-04 / AR-07: Verify `adminRekapCode.includes("activeTab === 'cetak'")` is `false` or that tab items do not contain `'cetak'`, and verify Tab 2 (`tabel`) contains the sole official `<PrintHeader>` and `<PrintSignature>`.
- SEC-04 / SEC-05: Verify Tab 2 is the single authoritative print layout without redundant duplicate sub-tabs.

---

## 5. Verification Method

### 5.1 Verification Commands
Run the dedicated verification suites:
```powershell
npx tsx tests/navigation_consolidation_verification.test.ts
npx tsx tests/m6_3_dashboards_and_verif.test.ts
npx tsx tests/session_resilience_and_clean_rekap.test.ts
npx tsc --noEmit
```

### 5.2 Specific Conditions to Inspect
1. **Zero False Alpa Check**:
   Create a test teacher in `data_guru` with 20 workdays. Add 2 approved records with `jenis_presensi = 'Sakit'`. Verify `pArr` has `hadir = 18`, `sakit = 2`, `izin = 0`, `alpa = 0`.
2. **Holiday Exclusion Check**:
   In `RekapJurnalView.tsx`, simulate date range containing Sunday, Saturday (with 5-day week), and an entry in `kalender_pendidikan` with `tipe: 'Libur'`. Verify `filteredJurnal` has 0 rows for those holiday dates and 0 rows containing `materi: 'tidak masuk kelas'` or `status_verifikasi: 'Libur'`.
3. **Sub-Menu Elimination Check**:
   Inspect rendered `tabItems` in `AdminRekapView.tsx` — must contain exactly 2 items: `['analitik', 'tabel']`. Verify calling `resolveCanonicalRoute('view-admin-rekap', 'cetak')` returns `{ canonicalView: 'view-admin-rekap', defaultTab: 'tabel' }`.

### 5.3 Invalidation Conditions
- If any sick teacher continues to produce `sakit = 0` or receives `alpa > 0` on their sick days, the presensi aggregation fix is invalidated.
- If any holiday date generates a "tidak masuk kelas" row or "Libur" appears in the print document, the calendar exclusion logic is invalidated.
- If `{ id: 'cetak' }` remains in `AdminRekapView.tsx` `tabItems`, Requirement R2 is invalidated.
