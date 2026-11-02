# Handoff Report — Explorer Survey: Sistem Blok Fleksibel

**Agent**: `explorer_survey_1`  
**Role**: `teamwork_explorer`  
**Target Milestone / Task**: Survey & Analysis of Sistem Blok Data Model, Persistence, and Configuration UI  
**Analysis File**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1\analysis.md`  

---

## 1. Observation

1. **Database Schema & Table**:
   - `supabase/migrations/20260927_sistem_blok_schema.sql` (lines 6–15) defines `public.sistem_blok` with columns:
     `id UUID PRIMARY KEY`, `sekolah_id UUID`, `nama_kegiatan TEXT`, `deskripsi TEXT`, `tanggal_mulai DATE`, `tanggal_selesai DATE`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
   - Live DB inspection via command:
     `npx tsx -e "import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' }); (async () => { const { supabase } = await import('./src/lib/supabaseClient'); const { data } = await supabase.from('sistem_blok').select('*').limit(1); console.log(data); })();"`
     Returned record containing only those 8 columns:
     `{ id: 'f6844695-538b-4133-9c26-75a20338d75d', sekolah_id: 'a0000000-0000-0000-0000-000000000001', nama_kegiatan: 'Pelatihan untuk mengikuti lomba Hari Santri Nasional 2026', tanggal_mulai: '2026-10-01', tanggal_selesai: '2026-10-17', ... }`.
   - No target scope (`tipe_target`) or hour range (`jam_mulai`, `jam_selesai`, `is_full_day`) columns exist yet.

2. **TypeScript Database Types**:
   - `src/types/database.ts` (lines 1411–1441, 1972–1974) has `sistem_blok: { Row, Insert, Update }` and `export type SistemBlok = Tables<"sistem_blok">;` matching the original 8 columns without target or time range properties.

3. **Configuration UI**:
   - `src/components/SistemBlokView.tsx` (lines 53–56, 136–144, 344–423) implements the form with only `namaKegiatan`, `tanggalMulai`, `tanggalSelesai`, and `deskripsi`.
   - `src/components/AdminDataView.tsx` (lines 102, 2049–2052) delegates the `sistem_blok` / `blok` tab directly to `<SistemBlokView user={user} />`.
   - `src/components/AppScreen.tsx` (lines 1243–1246) routes `view-sistem-blok` to `<SistemBlokView user={user} />`.

4. **Workflow & Schedule Masking**:
   - `src/lib/workflow.ts` (lines 69–92): `getActiveSistemBlok(dateStr, sekolahId)` queries `lte('tanggal_mulai', targetDate).gte('tanggal_selesai', targetDate)` and returns `data[0]`.
   - `src/components/HomeViewGuru.tsx` (lines 803, 849–875): When `dailyState?.isBlok` is true, regular schedules are completely hidden under the full-day block banner:
     `"Sistem Blok Aktif — KBM Reguler Ditiadakan"`.
   - `src/components/GuruJurnal.tsx` (lines 510–515): Automatically selects `Jurnal Kegiatan` and sets `dateBlok` when `state.isBlok` is true.

5. **Existing Verification Suite**:
   - Execution command: `npx tsx tests/sistem_blok_verification.test.ts`
   - Result: 85 test assertions executed, **0 failed, 85 passed**. Tests CRUD on live Supabase, schedule masking UI strings, journal fulfillment logic, multi-tenant isolation, and boundary conditions.

---

## 2. Logic Chain

1. **Target Scope Extensibility**:
   - Observation 1 shows that `sistem_blok` currently has no target identifiers.
   - In Sipjam, classes are strings (`data_siswa.kelas`, `jadwal_pelajaran.kelas`), teachers are entities in `data_guru` (`id`, `nama_guru`, `nip`), and cohorts/angkatan are derived grade levels (`X`, `XI`, `XII` or `10`, `11`, `12` as implemented in `NaikKelasModal.computeCohortAdvancement`).
   - Therefore, adding `tipe_target` (`'sekolah' | 'angkatan' | 'kelas' | 'guru'`), `target_angkatan`, `target_kelas`, `target_guru_id`, and `target_guru_nama` to `sistem_blok` provides full coverage for all 4 target levels specified in Requirement R1.
   - Setting default `tipe_target = 'sekolah'` ensures that all legacy records and existing test assertions remain 100% valid.

2. **Time Range Extensibility**:
   - Requirement R2 requires supporting date range (`tanggal_mulai` to `tanggal_selesai`, which already exists) plus optional hour range (`jam_mulai` to `jam_selesai`).
   - If not restricted, the block must default to full day.
   - Therefore, adding `is_full_day BOOLEAN NOT NULL DEFAULT true`, `jam_mulai TEXT NULL`, and `jam_selesai TEXT NULL` fulfills R2.
   - Schedules with `[sched.jam_mulai, sched.jam_selesai]` overlap with `[rule.jam_mulai, rule.jam_selesai]` when:
     `sched.jam_mulai < rule.jam_selesai && sched.jam_selesai > rule.jam_mulai`.
   - Schedules outside this window remain active and unmasked.

3. **Schedule Masking & Jurnal Integration**:
   - Observation 4 shows that currently, `dailyState?.isBlok` treats the entire day as blocked for all classes of the teacher.
   - For granular targets (e.g. Angkatan X only, or 08:00–10:00 only), each item in `dailyState.jadwalKBM` must be evaluated against active block rules:
     - Terdampak (Blocked): Marked with `isBlocked = true`, displaying a block activity badge and linking to `Jurnal Kegiatan`.
     - Tidak Terdampak (Normal): Rendered normally with regular KBM workflow and `Jurnal KBM` submission.
   - If a teacher has any blocked schedules, they are enabled to submit `Jurnal Kegiatan (Sistem Blok)`. If all schedules are blocked, they only need 1 `Jurnal Kegiatan`.

---

## 3. Caveats

1. **Schedules without Time Attributes**: In the sample school database inspected, some `jadwal_pelajaran` records have `jam_mulai: null` and `jam_selesai: null`. For schedules without explicit time boundaries, hour-restricted blocks should not inadvertently mask them unless the block is `is_full_day: true` or a fallback schedule period table is consulted.
2. **Read-Only Explorer Scope**: In accordance with the teamwork protocol and role instructions, no source files, database migrations, or test files were modified during this exploration. The DDL and UI proposals are documented for downstream implementers.

---

## 4. Conclusion

The current codebase is in an ideal state to adopt flexible target and hour configurations for Sistem Blok.
1. **Database**: Needs an ALTER TABLE migration adding `tipe_target`, `target_angkatan`, `target_kelas`, `target_guru_id`, `target_guru_nama`, `is_full_day`, `jam_mulai`, and `jam_selesai` (with default `'sekolah'` and `is_full_day = true` for zero breakage).
2. **Types**: Update `src/types/database.ts` for `sistem_blok` Row, Insert, Update, and `SistemBlok`.
3. **UI**: Enhance `src/components/SistemBlokView.tsx` with a target selector (segmented/radio), dependent selects (classes from `data_siswa`, teachers from `data_guru`, cohorts derived from classes), full-day toggle, time pickers (`HH:mm`), and target/time badges.
4. **Workflow & UI Masking**: Update `src/lib/workflow.ts` and `src/components/HomeViewGuru.tsx` to perform schedule-level matching (`isScheduleBlocked`), masking only affected schedules while letting unaffected schedules run normally.
5. **Testing**: Expand `tests/sistem_blok_verification.test.ts` to assert all 4 target levels, hour-range filtering, and selective schedule masking.

---

## 5. Verification Method

To verify the current findings independently:
1. **Run existing test suite**:
   ```bash
   npx tsx tests/sistem_blok_verification.test.ts
   ```
   (Must output 85 passed, 0 failed).
2. **Inspect current table schema**:
   ```bash
   npx tsx -e "import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' }); (async () => { const { supabase } = await import('./src/lib/supabaseClient'); const { data } = await supabase.from('sistem_blok').select('*').limit(1); console.log(Object.keys(data[0])); })();"
   ```
3. **Inspect detailed analysis**:
   Open and read `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_1\analysis.md`.
