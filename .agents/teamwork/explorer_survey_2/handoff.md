# Handoff Report: Sistem Blok Schedule Masking & Journal Workflows

## 1. Observation

### Exact File Paths & Code Line Observations
1. **`supabase/migrations/20260927_sistem_blok_schema.sql`** (lines 6-15):
   ```sql
   CREATE TABLE IF NOT EXISTS public.sistem_blok (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE DEFAULT public.get_auth_user_sekolah_id(),
       nama_kegiatan TEXT NOT NULL,
       deskripsi TEXT DEFAULT NULL,
       tanggal_mulai DATE NOT NULL,
       tanggal_selesai DATE NOT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   ```
   Observed that `public.sistem_blok` currently lacks target scoping columns (`tipe_target`, `target_id`) and time limitation columns (`jam_mulai`, `jam_selesai`).

2. **`src/types/database.ts`** (lines 1411-1441):
   `sistem_blok` Row type only defines `created_at`, `deskripsi`, `id`, `nama_kegiatan`, `sekolah_id`, `tanggal_mulai`, `tanggal_selesai`, `updated_at`.
   `jadwal_pelajaran` Row type (lines 431-443) contains: `hari`, `id`, `jam_mulai`, `jam_selesai`, `kelas`, `mapel`, `mata_pelajaran`, `nama_guru`, `sekolah_id`, `user_id`.

3. **`src/lib/workflow.ts`**:
   - Lines 69-92 (`getActiveSistemBlok`):
     ```typescript
     export async function getActiveSistemBlok(dateStr?: string, sekolahId?: string): Promise<any | null> {
       ...
       let query = supabase.from('sistem_blok').select('*')
         .lte('tanggal_mulai', targetDate)
         .gte('tanggal_selesai', targetDate);
       ...
       return data[0];
     }
     ```
     Observed that it queries strictly on date strings (`tanggal_mulai <= targetDate <= tanggal_selesai`) and returns a single school-wide record.
   - Lines 244-256 (`getGuruDailyState`):
     ```typescript
     const activeBlok = await getActiveSistemBlok(todayStr, sekolahId);
     if (activeBlok) {
       state.isBlok = true;
       state.blokInfo = { ... };
     }
     ```
     Sets a binary `state.isBlok = true` for the teacher without checking the teacher's individual schedule items, grade, or class.
   - Lines 701-715 (`canPresensiPulang` journal fulfillment):
     ```typescript
     } else if (state.isBlok || state.isDinasLuar || state.jadwalKBM.length === 0) {
       if (state.jurnalKegiatan) isJurnalDone = true;
     ```
     During block mode, exactly 1 `jurnalKegiatan` satisfies the daily requirement.

4. **`src/components/HomeViewGuru.tsx`**:
   - Lines 803-912:
     ```typescript
     {dailyState?.isBlok ? (
       <div className="p-4 rounded-2xl bg-amber-50/70 ...">
         ...
         Sistem Blok Aktif ... KBM Reguler Ditiadakan
         ...
         <button onClick={() => setView('view-guru-jurnal')}>Isi Jurnal Kegiatan Sekarang</button>
       </div>
     ) : ...
     ```
     Observed that when `dailyState?.isBlok` is true, regular teaching schedules (`dailyState.jadwalKBM`) are completely hidden. Regular schedules are only rendered if `!dailyState?.isBlok` (lines 812, 930).

5. **`src/components/GuruJurnal.tsx`**:
   - Lines 510-522 & 584-612:
     When `state.isBlok` is true or when chosen `tanggal` falls in a block period:
     `setTipeJurnal('Jurnal Kegiatan')` is auto-selected, `dateBlok` is set, and `materi` is prefilled with `blokInfo.nama_kegiatan`.
   - Lines 1248-1262:
     Displays warning banner: *"Periode Sistem Blok Aktif: {dateBlok.nama_kegiatan} ... Jadwal KBM reguler ditiadakan sementara dan digantikan oleh kegiatan khusus ini. Anda hanya perlu mengisi form Jurnal Kegiatan"*.
   - Lines 1315-1320:
     The `tipeJurnal` select is disabled: `<select value={tipeJurnal} disabled ...>`.
   - Lines 1323-1631:
     When `tipeJurnal === 'Jurnal Kegiatan'`, all KBM inputs (Mapel, Kelas, Pertemuan Ke-, KKTP, Konten, Absensi Murid, Lokasi KBM) are conditionally omitted, showing only Tanggal, Nama Kegiatan, Uraian/Deskripsi, and Foto Kegiatan.

6. **Missing File Clarification (`JadwalView.tsx`)**:
   Tool search `find_by_name` for `*Jadwal*` and `grep_search` confirmed that `src/components/JadwalView.tsx` does not exist in the codebase. Schedules are displayed on `HomeViewGuru.tsx`, tracked on `HomeViewAdmin.tsx`, managed in `AdminDataView.tsx`, and selected in `GuruJurnal.tsx`.

7. **Existing Verification Suite**:
   Executed `npx tsx tests/sistem_blok_verification.test.ts`:
   85 tests executed and all 85 passed in 7.0 seconds.

---

## 2. Logic Chain

1. **Current Schema & Evaluation Gap (from Observations 1, 2, 3)**:
   Because `sistem_blok` currently only stores `tanggal_mulai` and `tanggal_selesai`, `getActiveSistemBlok` cannot discriminate by target (school vs angkatan vs kelas vs guru) nor by hour (`jam_mulai` s/d `jam_selesai`). Consequently, any block rule active on a given date applies unconditionally to the entire school and all teachers for the entire 24-hour day.
2. **Impact on Masking (from Observations 3, 4)**:
   Because `getGuruDailyState` sets `state.isBlok = true` globally for the teacher whenever any block exists, `HomeViewGuru.tsx` masks every class of the teacher. To meet Requirement R3 ("jadwal di luar target atau di luar rentang jam yang diblok tetap berjalan normal dan tidak terpengaruh"), schedule masking must evaluate each schedule item in `jadwalKBM` individually against the active block rules.
3. **Target Type Matching Logic (from Observation 2 & codebase conventions)**:
   - *Keseluruhan Sekolah*: matches all schedules in `sekolah_id`.
   - *Per Angkatan*: matches schedule `kelas` using grade token recognition (e.g. "X", "XI", "XII", "10", "11", "12").
   - *Per Kelas*: matches exact schedule `kelas` (case-insensitive string match).
   - *Per Guru*: matches schedule `user_id` or `nama_guru` against the target teacher.
4. **Time Range Overlap Logic (from Observation 2)**:
   If `jam_mulai` and `jam_selesai` are null or empty on the block rule, it applies full day (`sepanjang hari`). If specified, standard interval overlap `sStart < bEnd && sEnd > bStart` determines whether the lesson period falls inside the block period.
5. **Journal Workflow Flexibility (from Observations 3, 5)**:
   Currently, `GuruJurnal.tsx` locks `tipeJurnal` to 'Jurnal Kegiatan'. When a teacher has mixed classes (e.g., morning blocked, afternoon regular KBM; or one class blocked for an angkatan while another class runs normally), the teacher must be able to select `Jurnal KBM` for regular classes and `Jurnal Kegiatan` for blocked activities. In `workflow.ts`, `canPresensiPulang` must require `jurnalKBM` only for unblocked schedules, plus 1 `jurnalKegiatan` for blocked activities.

---

## 3. Caveats

1. **Schedule Period Missing Times**: In some schools, records in `jadwal_pelajaran` might have `null` for `jam_mulai` and `jam_selesai` (only storing `hari`, `kelas`, `mapel`, `nama_guru`). For such records, if a block has a specific time range, the fallback should assume the schedule falls within regular morning school hours (07:00 - 15:00) or treat it as overlapping to ensure safety.
2. **Multiple Simultaneous Block Rules**: A school might have simultaneous rules (e.g., Angkatan X block on Monday 08:00-11:00, and Guru B block all day Monday). Helper functions should fetch all active rules for the day and evaluate whether any rule matches each schedule.
3. **No Standalone `JadwalView.tsx`**: Downstream implementation must update schedule masking in `HomeViewGuru.tsx` and schedule evaluation in `src/lib/workflow.ts` rather than attempting to edit a non-existent `JadwalView.tsx`.

---

## 4. Conclusion

The current Sistem Blok implementation is robust and fully covered by 85 passing tests, but is built around a single school-wide, full-day date-range model.
To implement the new requirements seamlessly and without regression:
1. **Database Schema**: Add `tipe_target` (default `'keseluruhan'`), `target_id`, `jam_mulai`, and `jam_selesai` to `public.sistem_blok` and update TypeScript types in `src/types/database.ts`.
2. **Evaluation Helpers**: Create helper functions (`isScheduleBlocked`, `isKelasInAngkatan`, `isTimeRangeOverlap`) in `src/lib/workflow.ts` or `src/lib/sistemBlokHelper.ts`.
3. **Schedule Masking**: Update `getGuruDailyState` and `HomeViewGuru.tsx` to tag individual schedule items as blocked or unblocked.
4. **Admin UI**: Add target type selector (Keseluruhan, Per Angkatan, Per Kelas, Per Guru) with appropriate dropdowns and optional start/end time pickers in `SistemBlokView.tsx`.
5. **Teacher Journal**: Allow mode selection when both blocked and unblocked schedules exist, preserving the simplified Jurnal Kegiatan form when entering block activity.
6. **Testing**: Expand `tests/sistem_blok_verification.test.ts` to cover the new target types and time range scenarios while keeping all 85 existing assertions green.

---

## 5. Verification Method

To independently verify the investigation findings and test the current baseline:

```bash
# 1. Verify all existing tests pass
npx tsx tests/sistem_blok_verification.test.ts

# 2. Check the absence of JadwalView.tsx and confirm where schedules are rendered
npx tsx -e "console.log(require('fs').existsSync('src/components/JadwalView.tsx'))" # outputs false
npx tsx -e "console.log(require('fs').existsSync('src/components/HomeViewGuru.tsx'))" # outputs true

# 3. Inspect public.sistem_blok table columns and constraints
# File: supabase/migrations/20260927_sistem_blok_schema.sql
```

Invalidation conditions:
- If a standalone `JadwalView.tsx` file were created in another branch or subfolder.
- If existing 85 test assertions in `tests/sistem_blok_verification.test.ts` fail or change.
