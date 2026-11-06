# Technical Implementation Blueprint: Holiday & Excused Leave Handling

**Agent**: `explorer_m1_nov_1`  
**Milestone**: M1 (Pusat Verifikasi Data & Automated Attendance Delinquency Handling)  
**Target Files**:
1. `src/components/AdminVerifView.tsx`
2. `src/lib/attendanceAlpa.ts`

---

## 1. Observation

### 1.1 `AdminVerifView.tsx` Holiday Omission & TypeScript Compilation Issue
- **File Path**: `src/components/AdminVerifView.tsx`
- **Lines 79-96 (`loadAuxData`)**:
  ```ts
  const [teachersRes, piketRes, jadwalRes, penugasanRes, pengaturanRes] = await Promise.all([
    supabase.from('data_guru').select('*').order('nama_guru', { ascending: true }),
    supabase.from('jadwal_piket').select('*'),
    supabase.from('jadwal_pelajaran').select('*'),
    supabase.from('penugasan_piket').select('*'),
    supabase.from('pengaturan').select('*')
  ]);
  ```
  *Verbatim Observation*: Table `kalender_pendidikan` is NOT loaded. Searching `kalender` in `AdminVerifView.tsx` yields 0 matches. Configuration `pengaturan.hari_sekolah` is not extracted (`aturan_kehadiran_guru` and `guru_hanya_mengajar` are parsed, but `hari_sekolah` is ignored).
- **Lines 539-705 (`unsubmittedPresensi` & `unsubmittedJurnal`)**:
  `unsubmittedPresensi` and `unsubmittedJurnal` evaluate teachers against `submittedList`. On Sundays, Saturdays (for 5-day week schools), and educational calendar holidays, teachers do not submit attendance or journals. Because neither `kalender_pendidikan` nor weekend days are checked, all teachers are mapped to delinquency cards:
  ```ts
  pesan_belum: isFreeFromPresence ? 'Bebas Hadir' : 'Belum melakukan presensi datang maupun pulang',
  status_label: isFreeFromPresence ? 'Bebas Hadir' : 'Belum Selesai',
  isUnsubmitted: true
  ```
  ```ts
  pesan_belum: scheduledClasses.length > 0 
    ? `Belum mengisi jurnal KBM untuk ${scheduledClasses.length} kelas terjadwal pada hari ${effectiveDayName}` 
    : `Belum mengisi jurnal pembelajaran untuk tanggal ${targetDate}`,
  isUnsubmitted: true
  ```
- **Lines 475-484 (`isRealSubmittedJournal` inner declaration & TS1184 error)**:
  `npx tsc --noEmit` fails verbatim with:
  `src/components/AdminVerifView.tsx(475,1): error TS1184: Modifiers cannot appear here.`
  `export function isRealSubmittedJournal` is declared inside `export default function AdminVerifView(...)`.
- **Lines 478 & 766-768 (`isRealSubmittedJournal` stripping excused leaves from view)**:
  ```ts
  export function isRealSubmittedJournal(j: any): boolean {
    if (!j) return false;
    const sv = j.status_verifikasi;
    if (sv === 'Tidak Masuk Kelas' || sv === 'Tidak Melaksanakan Kegiatan' || sv === 'Sakit' || sv === 'Izin') return false;
    ...
  }
  ```
  And in `displayList` (lines 766-768):
  ```ts
  const submittedList = activeTab === 'Jurnal'
    ? rawSubmittedList.filter(j => isRealSubmittedJournal(j))
    : rawSubmittedList;
  ```
  Because `isRealSubmittedJournal` returns `false` when `sv === 'Sakit' || sv === 'Izin'`, all excused journal submissions are stripped out of `submittedList`. In `unsubmittedJurnal` (line 667), excused teachers are also excluded from `unsubmittedList`. As a consequence, excused teachers completely vanish from the Jurnal verification tab.

### 1.2 `attendanceAlpa.ts` Multi-Day Leave Omission
- **File Path**: `src/lib/attendanceAlpa.ts`
- **Lines 1034-1053 (`recordUnfilledJournalsAndPiket`)**:
  ```ts
  let presensiDatang = state.presensiDatang;
  if (presensiDatang === undefined) {
    let pQ = client.from('presensi_guru').select('*').eq('tipe_absen', 'Datang');
    if (teacher.sekolah_id) pQ = pQ.eq('sekolah_id', teacher.sekolah_id);
    const startOfDay = getWitaStartOfDay(evaluatedDate);
    const endOfDay = getWitaEndOfDay(evaluatedDate);
    if (typeof (pQ as any)?.gte === 'function') pQ = (pQ as any).gte('timestamp', startOfDay);
    if (typeof (pQ as any)?.lte === 'function') pQ = (pQ as any).lte('timestamp', endOfDay);
    const { data: pData } = await pQ;
    presensiDatang = (pData || []).find((p: any) => {
      if (p.timestamp && !p.timestamp.startsWith(evaluatedDate)) return false;
      return matchTeacherTokens(teacher.nama_guru, p.nama_guru);
    }) || null;
  }
  ```
  *Verbatim Observation*: The query strictly filters `timestamp >= startOfDay && timestamp <= endOfDay`, and line 1044 rejects records where `!p.timestamp.startsWith(evaluatedDate)`. For multi-day leaves (`tanggal_mulai` to `tanggal_selesai` or `durasi_hari >= 2`), day 2 and day 3 do not match `timestamp`. As a result, `presensiDatang` evaluates to `null`, `leaveType` evaluates to `null`, and line 1093 inserts an auto-record with `status_verifikasi: 'Tidak Masuk Kelas'`, `materi: 'tidak masuk kelas'`, and `catatan_admin: 'Auto-record: Guru tidak masuk kelas (pulang cepat)'`. Approved multi-day leaves are thus erroneously turned into unexcused delinquencies.

---

## 2. Logic Chain

1. **Holiday Premise**: Schools operate under academic calendars and 5 or 6-day work weeks. Teachers are not scheduled to attend school, fill teaching journals, or run pickets on Sundays, 5-day week Saturdays, or calendar holidays.
2. **Holiday Infiltration**: Because `AdminVerifView.tsx` currently lacks holiday awareness, when an admin selects a holiday (or opens the page on a holiday/weekend), the cross-referencing logic treats zero submissions as unsubmitted delinquencies.
3. **Resolution**:
   - Query `kalender_pendidikan` (scoped by `sekolah_id`) and `pengaturan.hari_sekolah` in `loadAuxData`.
   - Compute `holidayInfo`: checks Sunday, Saturday when `hariSekolah === 5`, and events in `kalender_pendidikan` where `tipe === 'Libur'`.
   - If `holidayInfo?.isHoliday`, return `[]` for `unsubmittedPresensi`, `unsubmittedJurnal`, and `unsubmittedPiket`.
   - Render a prominent banner: `<div data-testid="holiday-banner">Hari Libur: {holidayInfo.keterangan}</div>`.
4. **Excused Leaves in Jurnal View**:
   - Relocate `isRealSubmittedJournal` outside `AdminVerifView` to fix `error TS1184`.
   - Separate delinquency auto-records (`Tidak Masuk Kelas`, `Tidak Melaksanakan Kegiatan`) from legitimate excused leaves (`Sakit`, `Izin`, `Dinas Luar`).
   - In `displayList` for `Jurnal`, keep excused leaves (`status_verifikasi === 'Sakit' || status_verifikasi === 'Izin'`).
   - If an excused presence exists in `presensi_guru` spanning `targetDate` without an existing row in `jurnal_pembelajaran`, synthesize a virtual excused item for `submittedList`.
   - Render the card badge with `data-testid="badge-excused-leave"` and label `"Dikecualikan (Izin / Sakit)"`.
5. **Multi-Day Leave Preservation in `attendanceAlpa.ts`**:
   - In `recordUnfilledJournalsAndPiket` (and exported `autoCloseOrMarkDelinquentJournals`), if single-day `timestamp` does not match, query active multi-day leaves spanning `evaluatedDate` where `status_verifikasi !== 'Ditolak'`.
   - Check `tanggal_mulai <= evaluatedDate && (tanggal_selesai >= evaluatedDate || addDaysToDateStr(tanggal_mulai, durasi_hari - 1) >= evaluatedDate)`.
   - When matched, set `presensiDatang = activeMultiLeave`.
   - As a result, `leaveType` correctly resolves to `'Sakit'` or `'Izin'`, inserting auto-journal records with `status_verifikasi: leaveType`, `materi: leaveType`, and `catatan_admin: 'Otomatis terisi sesuai presensi (' + leaveType + ')'` instead of `'Tidak Masuk Kelas'`.

---

## 3. Caveats

1. **Multi-Tenant RLS Scope**: All queries to `kalender_pendidikan` and `presensi_guru` must include `.or('sekolah_id.eq.${user.sekolah_id},sekolah_id.is.null,sekolah_id.eq.00000000-0000-0000-0000-000000000000')` or `.eq('sekolah_id', user.sekolah_id)` so schools do not bleed calendar events or attendance records.
2. **Database Field Variations**: Multi-day leaves may have `tanggal_selesai` populated OR only `durasi_hari` populated. The date comparison must evaluate both:
   `tanggal_mulai <= date && tanggal_selesai >= date` OR `tanggal_mulai <= date && addDaysToDateStr(tanggal_mulai, durasi_hari - 1) >= date`.
3. **Adversarial Test Suite Invariants**:
   - `tests/e2e/acceptance_criteria_m5.test.ts` asserts that `AdminVerifView.tsx` includes:
     `item.durasi_hari >= 3 || item.memerlukan_persetujuan_admin`
     `Sakit &gt;= 3 Hari (Perlu Persetujuan)`
     `item.durasi_hari > 3 || item.memerlukan_persetujuan_admin`
     `Izin &gt; 3 Hari (Perlu Persetujuan)`
     `item.is_auto_checkout`
     `Auto-Checkout (Lupa Checkout)`
   - `tests/m6_3_dashboards_and_verif.test.ts` asserts:
     `unsubmittedPresensi`, `unsubmittedJurnal`, `unsubmittedPiket`, `taskFilter`, `verifFilter`, `useMemo`, `isUnsubmitted`.
   - All proposed diffs preserve these exact strings verbatim.

---

## 4. Conclusion & Technical Implementation Blueprint

### 4.1 Changes in `src/components/AdminVerifView.tsx`

#### Blueprint A: Relocate Helper Functions Outside Component (Fix TS1184)
Move helper functions from lines 474-526 to top-level scope (above `export default function AdminVerifView` around line 25):

```ts
// Helper: Memastikan jurnal bukan auto-record delinquency (Tidak Masuk Kelas / Tidak Melaksanakan Kegiatan)
export function isDelinquencyJournal(j: any): boolean {
  if (!j) return false;
  const sv = j.status_verifikasi;
  if (sv === 'Tidak Masuk Kelas' || sv === 'Tidak Melaksanakan Kegiatan') return true;
  const ket = (j.keterangan || '').trim().toLowerCase();
  if (ket === 'tidak masuk kelas' || ket === 'tidak melaksanakan kegiatan apapun') return true;
  const mat = (j.materi || j.materi_pembelajaran || '').trim().toLowerCase();
  if (mat === 'tidak masuk kelas' || mat === 'tidak melaksanakan kegiatan apapun') return true;
  return false;
}

// Helper: Memastikan jurnal benar-benar diisi oleh guru dengan materi pembelajaran riil
export function isRealSubmittedJournal(j: any): boolean {
  if (!j) return false;
  if (isDelinquencyJournal(j)) return false;
  const sv = j.status_verifikasi;
  if (sv === 'Sakit' || sv === 'Izin') return false;
  const ket = (j.keterangan || '').trim().toLowerCase();
  if (ket === 'auto-fill sistem karena guru berhalangan hadir') return false;
  const mat = (j.materi || j.materi_pembelajaran || '').trim().toLowerCase();
  if (mat.startsWith('guru tidak dapat mengisi jurnal karena')) return false;
  return true;
}

// Helper: Normalisasi nama guru untuk perbandingan presisi tanpa false substring collision
function normalizeTeacherName(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/,.*$/, '')
    .replace(/\b(s\.?pd\.?i?|m\.?pd\.?|s\.?kom\.?|s\.?si\.?|s\.?ag\.?|s\.?e\.?|s\.?t\.?|gr\.?)\b/gi, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTeacherMatch(teacherName?: string | null, candidateName?: string | null, nip?: string | null): boolean {
  if (!teacherName || !candidateName) return false;
  const normTeacher = normalizeTeacherName(teacherName);
  const normCandidate = normalizeTeacherName(candidateName);

  if (normTeacher && normCandidate && normTeacher === normCandidate) return true;

  if (nip) {
    const normNip = normalizeTeacherName(nip);
    if (normNip && (normNip === normTeacher || normNip === normCandidate)) return true;
  }

  return false;
}

function addDaysToDateStr(dateStr: string, days: number): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}
```

#### Blueprint B: State and `loadAuxData` Integration
Inside `AdminVerifView`:
Add state declarations:
```ts
  const [kalenderEvents, setKalenderEvents] = useState<any[]>([]);
  const [hariSekolah, setHariSekolah] = useState<number>(6);
```

In `loadAuxData`:
```ts
        let kalenderQ = supabase.from('kalender_pendidikan').select('*');
        if (user?.sekolah_id) {
          kalenderQ = kalenderQ.or(`sekolah_id.eq.${user.sekolah_id},sekolah_id.is.null,sekolah_id.eq.00000000-0000-0000-0000-000000000000`);
        }

        const [teachersRes, piketRes, jadwalRes, penugasanRes, pengaturanRes, kalenderRes] = await Promise.all([
          supabase.from('data_guru').select('*').order('nama_guru', { ascending: true }),
          supabase.from('jadwal_piket').select('*'),
          supabase.from('jadwal_pelajaran').select('*'),
          supabase.from('penugasan_piket').select('*'),
          supabase.from('pengaturan').select('*'),
          kalenderQ
        ]);

        if (teachersRes.data) setAllTeachers(teachersRes.data);
        if (piketRes.data) setAllPiketSchedule(piketRes.data);
        if (penugasanRes.data) setAllPenugasanPiket(penugasanRes.data);
        if (jadwalRes.data) {
          const cleanJadwal = jadwalRes.data.filter((j: any) => !isInvalidMapel(j.mata_pelajaran || j.mapel));
          setAllJadwalPelajaran(cleanJadwal);
        }
        if (kalenderRes.data) {
          setKalenderEvents(kalenderRes.data);
        }
        if (pengaturanRes.data) {
          const aturanRow = pengaturanRes.data.find(
            (p: any) => (p.key === 'aturan_kehadiran_guru' && p.value === 'Hari_Mengajar_Saja') || p.aturan_kehadiran_guru === 'Hari_Mengajar_Saja'
          );
          if (aturanRow) setAturanGlobal('Hari_Mengajar_Saja');

          const hsRow = pengaturanRes.data.find((p: any) => p.key === 'hari_sekolah' || p.hari_sekolah);
          if (hsRow) {
            const hsVal = parseInt(hsRow.value || hsRow.hari_sekolah, 10);
            if (!isNaN(hsVal)) setHariSekolah(hsVal);
          }

          const ghmRow = pengaturanRes.data.find((p: any) => p.key === 'guru_hanya_mengajar');
          if (ghmRow && ghmRow.value) {
            try {
              const parsed = JSON.parse(ghmRow.value);
              if (Array.isArray(parsed)) setGuruHanyaMengajarList(parsed);
              else if (parsed && typeof parsed === 'object') {
                const list: string[] = [];
                if (Array.isArray(parsed.ids)) list.push(...parsed.ids);
                if (Array.isArray(parsed.names)) list.push(...parsed.names);
                setGuruHanyaMengajarList(list);
              }
            } catch {
              // ignore json parse error
            }
          }
        }
```

#### Blueprint C: Holiday Computation (`holidayInfo`)
Add immediately after `effectiveDayName`:
```ts
  // Holiday evaluation for effectiveDate
  const holidayInfo = useMemo(() => {
    if (!effectiveDate) return null;

    // 1. Sunday is always a weekend holiday
    if (effectiveDayName === 'Minggu') {
      return { isHoliday: true, keterangan: 'Hari Minggu (Libur Akhir Pekan)' };
    }

    // 2. Saturday is a holiday if 5-day school week is configured
    if (effectiveDayName === 'Sabtu' && hariSekolah === 5) {
      return { isHoliday: true, keterangan: 'Hari Sabtu (Libur Sekolah 5 Hari)' };
    }

    // 3. Kalender Pendidikan events with tipe Libur
    const calMatch = kalenderEvents.find((evt: any) => {
      const tipe = (evt.tipe || '').toLowerCase();
      const isLibur = tipe === 'libur' || tipe.includes('libur');
      if (!isLibur) return false;

      // Exact single day
      if (evt.tanggal && evt.tanggal === effectiveDate) return true;

      // Date range [tanggal_mulai, tanggal_selesai]
      if (evt.tanggal_mulai && evt.tanggal_selesai) {
        return effectiveDate >= evt.tanggal_mulai && effectiveDate <= evt.tanggal_selesai;
      }
      if (evt.tanggal_mulai && !evt.tanggal_selesai && evt.tanggal_mulai === effectiveDate) {
        return true;
      }

      return false;
    });

    if (calMatch) {
      return {
        isHoliday: true,
        keterangan: calMatch.keterangan || 'Libur Kalender Pendidikan'
      };
    }

    return null;
  }, [effectiveDate, effectiveDayName, hariSekolah, kalenderEvents]);
```

#### Blueprint D: Holiday Non-Delinquency Handling in Unsubmitted Memos
In `unsubmittedPresensi`:
```ts
  const unsubmittedPresensi = useMemo(() => {
    if (allTeachers.length === 0) return [];
    if (holidayInfo?.isHoliday) return []; // Non-delinquency holiday handling: zero teachers marked unsubmitted
    ...
  }, [allTeachers, presensiList, date, effectiveDate, effectiveDayName, allJadwalPelajaran, allPiketSchedule, allPenugasanPiket, aturanGlobal, guruHanyaMengajarList, holidayInfo]);
```

In `unsubmittedJurnal`:
```ts
  const unsubmittedJurnal = useMemo(() => {
    if (allTeachers.length === 0) return [];
    if (holidayInfo?.isHoliday) return []; // Non-delinquency holiday handling: zero teachers marked unsubmitted
    ...
  }, [allTeachers, jurnalList, presensiList, date, effectiveDate, effectiveDayName, allJadwalPelajaran, holidayInfo]);
```

In `unsubmittedPiket`:
```ts
  const unsubmittedPiket = useMemo(() => {
    if (allTeachers.length === 0) return [];
    if (holidayInfo?.isHoliday) return []; // Non-delinquency holiday handling: zero teachers marked unsubmitted
    ...
  }, [allTeachers, allPiketSchedule, allPenugasanPiket, piketList, date, effectiveDate, effectiveDayName, holidayInfo]);
```

#### Blueprint E: Multi-Day Excused Leave Querying in `loadData`
In `loadData` for `Presensi`:
```ts
        let combinedData = data || [];
        const targetD = date || getWitaDateStr();
        if (targetD) {
          try {
            let multiQ = supabase
              .from('presensi_guru')
              .select('*')
              .lte('tanggal_mulai', targetD)
              .not('tanggal_mulai', 'is', null)
              .neq('status_verifikasi', 'Ditolak');
            if (user?.sekolah_id) {
              multiQ = multiQ.eq('sekolah_id', user.sekolah_id);
            }
            const { data: multiDayData, error: multiDayErr } = await multiQ;
            if (multiDayErr) {
              console.error('Error loading multi-day presensi:', multiDayErr);
            } else if (multiDayData && multiDayData.length > 0) {
              const activeLeaves = multiDayData.filter((p: any) => {
                if (p.tanggal_mulai && p.tanggal_selesai) {
                  return targetD >= p.tanggal_mulai && targetD <= p.tanggal_selesai;
                }
                if (p.tanggal_mulai && (p.durasi_hari || p.durasiHari)) {
                  const days = Number(p.durasi_hari || p.durasiHari) || 1;
                  const computedEnd = addDaysToDateStr(p.tanggal_mulai, days - 1);
                  return targetD >= p.tanggal_mulai && targetD <= computedEnd;
                }
                return false;
              });
              const existingIds = new Set(combinedData.map((d: any) => d.id));
              const newMultiDay = activeLeaves.filter((d: any) => !existingIds.has(d.id));
              combinedData = [...combinedData, ...newMultiDay];
            }
          } catch (mErr) {
            console.error('Multi-day presensi query exception:', mErr);
          }
        }
        setPresensiList(combinedData);
```

And in `loadData` for `Jurnal`:
```ts
        const targetD = date || getWitaDateStr();
        if (targetD) {
          try {
            const startOfDay = getWitaStartOfDay(targetD);
            const endOfDay = getWitaEndOfDay(targetD);
            let pSingleQ = supabase.from('presensi_guru').select('*').gte('timestamp', startOfDay).lte('timestamp', endOfDay);
            let pMultiQ = supabase.from('presensi_guru').select('*').lte('tanggal_mulai', targetD).not('tanggal_mulai', 'is', null).neq('status_verifikasi', 'Ditolak');
            if (user?.sekolah_id) {
              pSingleQ = pSingleQ.eq('sekolah_id', user.sekolah_id);
              pMultiQ = pMultiQ.eq('sekolah_id', user.sekolah_id);
            }
            const [presensiRes, multiDayRes] = await Promise.all([pSingleQ, pMultiQ]);
            const pList = presensiRes.data || [];
            const activeLeaves = (multiDayRes.data || []).filter((p: any) => {
              if (p.tanggal_mulai && p.tanggal_selesai) {
                return targetD >= p.tanggal_mulai && targetD <= p.tanggal_selesai;
              }
              if (p.tanggal_mulai && (p.durasi_hari || p.durasiHari)) {
                const days = Number(p.durasi_hari || p.durasiHari) || 1;
                const computedEnd = addDaysToDateStr(p.tanggal_mulai, days - 1);
                return targetD >= p.tanggal_mulai && targetD <= computedEnd;
              }
              return false;
            });
            const existingIds = new Set(pList.map((d: any) => d.id));
            setPresensiList([...pList, ...activeLeaves.filter((d: any) => !existingIds.has(d.id))]);
          } catch (pErr) {
            console.error('Error loading presensi for jurnal view:', pErr);
          }
        }
```

#### Blueprint F: Preserve Excused Teachers in `displayList` (Jurnal Tab)
In `displayList` (lines 752-860):
```ts
    // Untuk tab Jurnal, jangan tampilkan auto-record delinquency (Tidak Masuk Kelas / Tidak Melaksanakan Kegiatan)
    // tetapi TETAP tampilkan pengajuan riil guru dan pengajuan izin/sakit yang dikecualikan
    const baseSubmitted = activeTab === 'Jurnal'
      ? rawSubmittedList.filter(j => !isDelinquencyJournal(j))
      : rawSubmittedList;

    // Untuk tab Jurnal: Pastikan guru yang berstatus izin/sakit pada presensi_guru tetap muncul sebagai kartu terverifikasi
    let synthesizedLeaveList: any[] = [];
    if (activeTab === 'Jurnal') {
      const targetDate = date || effectiveDate;
      presensiList.forEach((p: any) => {
        const jp = (p.jenis_presensi || '').toLowerCase();
        const di = (p.detail_izin || '').toLowerCase();
        const isLeave = jp === 'sakit' || jp === 'izin' || di.includes('sakit') || di.includes('izin');
        if (!isLeave) return;
        if (p.status_verifikasi === 'Ditolak') return;

        let inDateRange = false;
        if (p.tanggal_mulai && p.tanggal_selesai && targetDate >= p.tanggal_mulai && targetDate <= p.tanggal_selesai) {
          inDateRange = true;
        } else if (p.tanggal_mulai && (p.durasi_hari || p.durasiHari)) {
          const days = Number(p.durasi_hari || p.durasiHari) || 1;
          const computedEnd = addDaysToDateStr(p.tanggal_mulai, days - 1);
          if (targetDate >= p.tanggal_mulai && targetDate <= computedEnd) inDateRange = true;
        } else if (p.timestamp) {
          const pDate = extractWitaDateStr(p.timestamp) || p.timestamp.substring(0, 10);
          if (pDate === targetDate) inDateRange = true;
        }
        if (!inDateRange) return;

        const alreadyInBase = baseSubmitted.some((j: any) => isTeacherMatch(j.nama_guru, p.nama_guru, null));
        if (!alreadyInBase) {
          const leaveLabel = (jp === 'sakit' || di.includes('sakit')) ? 'Sakit' : 'Izin';
          synthesizedLeaveList.push({
            id: `excused-jurnal-${p.id}`,
            nama_guru: p.nama_guru,
            nip: p.nip || '-',
            tanggal: targetDate,
            kelas: '-',
            mapel: 'Dikecualikan (Izin / Sakit)',
            materi: `Dikecualikan (${leaveLabel})`,
            keterangan: `Presensi ${leaveLabel}: ${p.detail_izin || p.keterangan || leaveLabel}`,
            status_verifikasi: leaveLabel,
            isExcusedLeave: true,
            leaveType: leaveLabel,
            link_bukti_foto: p.link_bukti || '-',
            timestamp: p.timestamp || `${targetDate}T07:00:00+08:00`
          });
        }
      });
    }

    const submittedList = [...baseSubmitted, ...synthesizedLeaveList];
```
And in status verification filter (lines 796-799):
```ts
        } else if (verifFilter === 'Disetujui') {
          if (rawStatus !== 'Disetujui' && rawStatus !== 'Diverifikasi' && rawStatus !== 'Sakit' && rawStatus !== 'Izin') return false;
        }
```

#### Blueprint G: UI Banner and Card Badges
1. **Holiday Banner** (rendered above filter bar):
```tsx
        {/* Banner Hari Libur */}
        {holidayInfo?.isHoliday && (
          <div 
            data-testid="holiday-banner" 
            className="mb-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-3 shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-umbrella-beach text-sm"></i>
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold block text-sm">Hari Libur: {holidayInfo.keterangan}</span>
              <span className="text-[11px] opacity-90 block">
                Pada hari libur ({effectiveDayName}, {effectiveDate}), seluruh guru dibebaskan dari kewajiban presensi, jurnal KBM, dan tugas piket tanpa ditandai alpa atau belum menyelesaikan tugas.
              </span>
            </div>
          </div>
        )}
```

2. **Jurnal Card Badge** (lines 1300-1313):
```tsx
                    {(item.isExcusedLeave || item.status_verifikasi === 'Sakit' || item.status_verifikasi === 'Izin' || item.status_verifikasi === 'Dinas Luar' || item.materi === 'Sakit' || item.materi === 'Izin' || item.materi === 'Dinas Luar' || item.is_auto_filled_leave) && (
                      <div className="pt-1">
                        <span 
                          data-testid="badge-excused-leave"
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 ${
                          (item.status_verifikasi === 'Sakit' || item.materi === 'Sakit' || item.leaveType === 'Sakit')
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                            : (item.status_verifikasi === 'Izin' || item.materi === 'Izin' || item.leaveType === 'Izin')
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                        }`}>
                          <i className="fa-solid fa-calendar-check text-[10px]"></i>
                          Dikecualikan (Izin / Sakit)
                        </span>
                      </div>
                    )}
```

3. **Bottom Card Footer** (lines 1392-1396):
```tsx
                  ) : (item.isExcusedLeave || item.status_verifikasi === 'Sakit' || item.status_verifikasi === 'Izin' || item.status_verifikasi === 'Dinas Luar') ? (
                    <div className="w-full text-center py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <i className="fa-solid fa-check-circle mr-1.5"></i>
                      Dikecualikan ({item.status_verifikasi || item.leaveType || 'Izin / Sakit'} - Sesuai Presensi)
                    </div>
```

---

### 4.2 Changes in `src/lib/attendanceAlpa.ts`

#### Blueprint A: Date Arithmetic Helper
Add at top level of `src/lib/attendanceAlpa.ts`:
```ts
function addDaysToDateStr(dateStr: string, days: number): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}
```

#### Blueprint B: Multi-Day Excused Detection in `recordUnfilledJournalsAndPiket`
In `src/lib/attendanceAlpa.ts` lines 1034-1057:
```ts
      // Determine if teacher is legitimately excused via Sakit, Izin, or Dinas Luar
      let presensiDatang = state.presensiDatang;
      if (presensiDatang === undefined) {
        // 1. Check single-day presence record for evaluatedDate
        let pQ = client.from('presensi_guru').select('*').eq('tipe_absen', 'Datang');
        if (teacher.sekolah_id) pQ = pQ.eq('sekolah_id', teacher.sekolah_id);
        const startOfDay = getWitaStartOfDay(evaluatedDate);
        const endOfDay = getWitaEndOfDay(evaluatedDate);
        if (typeof (pQ as any)?.gte === 'function') pQ = (pQ as any).gte('timestamp', startOfDay);
        if (typeof (pQ as any)?.lte === 'function') pQ = (pQ as any).lte('timestamp', endOfDay);
        const { data: pData } = await pQ;

        let foundToday = (pData || []).find((p: any) => {
          const pDate = extractWitaDateStr(p.timestamp) || (p.timestamp ? p.timestamp.substring(0, 10) : '');
          if (pDate && pDate !== evaluatedDate) return false;
          return matchTeacherTokens(teacher.nama_guru, p.nama_guru) || (teacher.user_id && p.user_id && teacher.user_id === p.user_id);
        });

        if (foundToday) {
          presensiDatang = foundToday;
        } else {
          // 2. Check active multi-day leaves spanning evaluatedDate (Support for Day 2+ of leave)
          let multiQ = client
            .from('presensi_guru')
            .select('*')
            .lte('tanggal_mulai', evaluatedDate)
            .not('tanggal_mulai', 'is', null)
            .neq('status_verifikasi', 'Ditolak');
          if (teacher.sekolah_id) multiQ = multiQ.eq('sekolah_id', teacher.sekolah_id);
          const { data: multiData } = await multiQ;

          const activeMultiLeave = (multiData || []).find((p: any) => {
            if (p.status_verifikasi === 'Ditolak') return false;
            if (isLateArrival(p)) return false;

            const isMatch = matchTeacherTokens(teacher.nama_guru, p.nama_guru) || 
              (teacher.user_id && p.user_id && teacher.user_id === p.user_id);
            if (!isMatch) return false;

            if (p.tanggal_mulai && p.tanggal_selesai) {
              return evaluatedDate >= p.tanggal_mulai && evaluatedDate <= p.tanggal_selesai;
            }
            if (p.tanggal_mulai && (p.durasi_hari || p.durasiHari)) {
              const days = Number(p.durasi_hari || p.durasiHari) || 1;
              const computedEnd = addDaysToDateStr(p.tanggal_mulai, days - 1);
              return evaluatedDate >= p.tanggal_mulai && evaluatedDate <= computedEnd;
            }
            return false;
          });

          presensiDatang = activeMultiLeave || null;
        }
      }

      // Izin Terlambat / Terlambat is not leave: KBM journal must still be filled
      const isLate = isLateArrival(presensiDatang);
      const jp = (presensiDatang?.jenis_presensi || '').toLowerCase();
      const di = (presensiDatang?.detail_izin || '').toLowerCase();

      const leaveType: 'Sakit' | 'Izin' | 'Dinas Luar' | null = isLate ? null :
        (state.isIzinSakit || jp === 'sakit' || di.includes('sakit')) ? 'Sakit' :
        (jp === 'izin' || di.includes('izin')) ? 'Izin' :
        (state.isDinasLuar || jp === 'dinas luar' || di.includes('dinas')) ? 'Dinas Luar' : null;

      const leaveNote = presensiDatang?.detail_izin || presensiDatang?.keterangan || (leaveType || '');
      const leaveProof = presensiDatang?.link_bukti && presensiDatang.link_bukti !== '-' ? presensiDatang.link_bukti : '-';
```

And in auto-record creation (lines 1076-1104):
```ts
          if (!alreadyRecorded) {
            const isExcused = Boolean(leaveType);
            const kbmRecord = {
              id: crypto.randomUUID(),
              timestamp: nowTs,
              nama_guru: teacher.nama_guru,
              user_id: teacher.user_id || null,
              sekolah_id: teacher.sekolah_id || sched.sekolah_id || null,
              tanggal: evaluatedDate,
              kelas: sched.kelas || '-',
              mapel: sched.mata_pelajaran || sched.mapel || '-',
              jam_ke: sched.jam_mulai && sched.jam_selesai ? `${sched.jam_mulai} - ${sched.jam_selesai}` : (sched.jam_ke || '-'),
              materi: isExcused ? leaveType! : 'tidak masuk kelas',
              materi_pembelajaran: isExcused ? leaveType! : 'tidak masuk kelas',
              konten: isExcused ? leaveType! : 'tidak masuk kelas',
              kegiatan: isExcused ? `Presensi ${leaveType}${leaveNote ? `: ${leaveNote}` : ''}` : 'tidak masuk kelas',
              kegiatan_pembelajaran: isExcused ? `Presensi ${leaveType}` : 'tidak masuk kelas',
              keterangan: isExcused ? leaveType! : 'tidak masuk kelas',
              status_verifikasi: isExcused ? leaveType! : 'Tidak Masuk Kelas',
              catatan_admin: isExcused ? `Otomatis terisi sesuai presensi (${leaveType})` : 'Auto-record: Guru tidak masuk kelas (pulang cepat)',
              catatan_refleksi: isExcused ? `Presensi ${leaveType}` : 'tidak masuk kelas',
              kehadiran_murid: '-',
              absensi_siswa: '-',
              foto_kegiatan: isExcused ? leaveProof : '-',
              link_bukti_foto: isExcused ? leaveProof : '-'
            };
```

And in section 2 (Jurnal Kegiatan):
```ts
    // 2. Jurnal Kegiatan not filled -> "tidak melaksanakan kegiatan apapun"
    // Excused leaves must NOT generate delinquent kegiatan records
    const isExcusedFromActivity = Boolean(leaveType || state.isIzinSakit);
    const needsKegiatan = !isExcusedFromActivity && (jadwalKBM?.length === 0 || state.isBlok || state.isDinasLuar) && !state.isNonTeachingDay;
```

#### Blueprint C: Export `autoCloseOrMarkDelinquentJournals`
Add exported wrapper function to `src/lib/attendanceAlpa.ts`:
```ts
/**
 * Automated Journal Cutoff Excused Detection:
 * Evaluates empty teaching schedules and auto-closes them as excused (leaveType) or unexcused delinquency ("tidak masuk kelas").
 * Recognizes multi-day leaves spanning evaluatedDate (Day 2+).
 */
export async function autoCloseOrMarkDelinquentJournals(
  teacher: { nama_guru: string; user_id?: string | null; sekolah_id?: string | null },
  targetDateStr: string,
  state: {
    isPiket?: boolean;
    laporanPiket?: any | null;
    jadwalKBM?: any[];
    jurnalKBM?: any[];
    jurnalKegiatan?: any | null;
    presensiDatang?: any;
    isIzinSakit?: boolean;
    [key: string]: any;
  } = {},
  client: any = supabase
): Promise<{ unfilledKbmCount: number; unfilledKegiatanCreated: boolean; unfilledPiketCreated: boolean }> {
  return recordUnfilledJournalsAndPiket(teacher, targetDateStr, state, client);
}
```

---

## 5. Verification Method

To independently verify the implementation:

1. **Verify Automated Tests Run Cleanly**:
   ```powershell
   npx tsx tests/m6_3_dashboards_and_verif.test.ts
   npx tsx tests/m10_r2_r3.test.ts
   ```
2. **Dedicated Unit Verification for Holiday & Day 2+ Leave Recognition**:
   Create and execute `tests/m1_holiday_excused_verification.test.ts` testing:
   - `holidayInfo` detects Sunday, Saturday on 5-day week (`hari_sekolah = 5`), and `kalender_pendidikan` holiday events.
   - `unsubmittedPresensi` and `unsubmittedJurnal` return 0 unsubmitted teachers on holidays.
   - `recordUnfilledJournalsAndPiket` and `autoCloseOrMarkDelinquentJournals` correctly detect day 2 of a 3-day leave and insert records with `status_verifikasi = 'Sakit'` / `'Izin'`, NOT `'Tidak Masuk Kelas'`.
   - `AdminVerifView.tsx` renders the holiday banner (`data-testid="holiday-banner"`) and excused leave badge (`data-testid="badge-excused-leave"`).
3. **Type Check**:
   ```powershell
   npx tsc --noEmit
   ```
   Confirms TS1184 error in `AdminVerifView.tsx` is completely resolved.
4. **Invalidation Conditions**:
   - If teachers on holiday dates still show up as unsubmitted in `AdminVerifView`, the fix is invalid.
   - If day 2 of a multi-day sick leave still auto-populates `Tidak Masuk Kelas`, the fix is invalid.
   - If moving `isRealSubmittedJournal` breaks existing imports or tests, the fix is invalid.
