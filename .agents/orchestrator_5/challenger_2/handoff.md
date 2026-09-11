# Empirical Challenge Report & Handoff - Challenger 2

**Agent**: Challenger 2 (`teamwork_preview_challenger`)  
**Parent Agent**: `0436a7e8-c270-413c-bcf5-b9e753860f23` (Orchestrator)  
**Date**: 2026-09-12  
**Verdict**: **REQUEST_CHANGES**  

---

## 1. Observation

### A. Requirement R2: Database Schema Verification
- Tool call: Supabase MCP `execute_sql` on project `jicvvqxjyzntdrccnuyz`.
- Query to `information_schema.columns`:
  ```sql
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'jurnal_pembelajaran'
  ORDER BY ordinal_position;
  ```
- Result confirmed that all 7 required columns exist in `public.jurnal_pembelajaran`:
  1. `pertemuan_ke`: `data_type = text`, `is_nullable = YES`
  2. `jam_ke`: `data_type = text`, `is_nullable = YES`
  3. `tujuan_pembelajaran`: `data_type = text`, `is_nullable = YES`
  4. `materi_pembelajaran`: `data_type = text`, `is_nullable = YES`
  5. `kehadiran_murid`: `data_type = text`, `is_nullable = YES`
  6. `catatan_refleksi`: `data_type = text`, `is_nullable = YES`
  7. `foto_kegiatan`: `data_type = text`, `is_nullable = YES`
- Row count verification on `public.jurnal_pembelajaran`:
  - `total_rows`: 148
  - `count(materi_pembelajaran)`: 148 (matched legacy column `materi`: 148)
  - `count(catatan_refleksi)`: 22 (matched legacy column `refleksi`: 22)
  - `count(foto_kegiatan)`: 148 (matched legacy column `link_bukti_foto`: 148)
- Configuration verification on `public.pengaturan`:
  - Record with `key = 'kota_kabupaten'` exists with `value = 'Kab. Bolaangmongondow Timur'`.

---

### B. Requirement R4: Schedule Matching Stress-Test & Real-World User Verification
- Investigated `src/lib/workflow.ts` lines 35–67 (`findJadwalForGuru`) and lines 85–104 (`isJurnalMatchJadwal`).
- Live database query of `public.users` returned 14 active user records:
  - `Ade Fitrawan Ibrahim` (username: `Fitrawan`)
  - `Admin Sma Nizamudin` (username: `admin`)
  - `Assyfa Fitra Azzahrah Abukasim` (username: `Assyfa`)
  - `Dinda Putri Kurniawati` (username: `Dinda`)
  - `FITRA SURYAZANA MAMONTO` (username: `Fitra`)
  - `Fitri Aprilia Dotulong` (username: `Fitri`)
  - `Mohamad Adnan Mamangkai` (username: `Adnan`)
  - `Riski Candra Mamangkai` (username: `Riski`)
  - `Rohani Marham` (username: `Rohani`)
  - `Saskia Agow` (username: `Saskia`)
  - `Setia Ambar Ningsih Mamonto` (username: `Ambar`)
  - `Susana Muliono` (username: `Susana`)
  - `Tika Mamonto, S.Pd.` (username: `Tika`)
  - `Venda Lestari Kairupan` (username: `Venda`)

- Live database query of `public.jadwal_pelajaran` returned 12 distinct `nama_guru` values:
  `Ade`, `Adnan`, `Ambar`, `Dinda`, `Fitra`, `Fitri`, `Rizki`, `Rohani`, `Saskia`, `Susan`, `Tika`, `Venda`.

- **CRITICAL FINDING 1 (Pak Riski Candra Mamangkai - Mismatch Failure)**:
  - In `public.users` and `public.guru_mapel`, the teacher is recorded as `"Riski Candra Mamangkai"` (username: `"Riski"`).
  - In `public.jadwal_pelajaran`, rows for Sejarah (Senin XI Merdeka, Senin XII Merdeka, Kamis X Merdeka) have `nama_guru = 'Rizki'` (spelled with a **'z'**).
  - In `src/lib/workflow.ts` lines 58–66:
    ```typescript
    const namaLower = namaGuru.toLowerCase().trim(); // "riski candra mamangkai"
    const guruWords = namaLower.split(/\s+/).filter(w => w.length >= 3); // ["riski", "candra", "mamangkai"]
    return allJadwal.filter((j: any) => {
      const jNama = (j.nama_guru || '').toLowerCase().trim(); // "rizki"
      if (!jNama) return false;
      if (namaLower === jNama) return true;
      if (namaLower.startsWith(jNama) || jNama.startsWith(namaLower)) return true;
      if (guruWords.includes(jNama)) return true;
      if (jNama.length >= 3 && (namaLower.includes(jNama) || jNama.includes(namaLower))) return true;
      return false;
    });
    ```
  - Because `'riski' !== 'rizki'`, every conditional evaluates to `false`.
  - **Result**: `findJadwalForGuru("Senin", "Riski Candra Mamangkai")` returns `[]`.
  - On the HomeView dashboard, Pak Riski sees: *"Anda tidak memiliki jadwal KBM pada hari Senin."* His teaching schedule is completely invisible.

- **CRITICAL FINDING 2 (Ibu Assyfa Fitra Azzahrah Abukasim - Token Collision Bug)**:
  - Ibu Assyfa's full name in `public.users` is `"Assyfa Fitra Azzahrah Abukasim"` (username: `"Assyfa"`). She has 0 teaching hours assigned.
  - Pak Fitra's full name is `"FITRA SURYAZANA MAMONTO"` (username: `"Fitra"`). He teaches PJOK on Wednesdays (`nama_guru = 'Fitra'` in `jadwal_pelajaran`).
  - In `findJadwalForGuru`, Ibu Assyfa's `guruWords` contains `['assyfa', 'fitra', 'azzahrah', 'abukasim']`.
  - Line 63: `if (guruWords.includes(jNama)) return true;` evaluates to `true` because `jNama` is `"fitra"` and `"fitra"` is present in `guruWords`!
  - **Result**: When Ibu Assyfa logs in on Wednesday, she receives Pak Fitra's 3 PJOK classes (X Merdeka, XI Merdeka, XII Merdeka) on her HomeView dashboard.
  - Line 268 of `workflow.ts` requires all scheduled classes to have matching journals before clocking out:
    ```typescript
    const fulfilled = state.jadwalKBM.every(jk => 
      state.jurnalKBM.some(j => isJurnalMatchJadwal(j, jk))
    );
    if (fulfilled) isJurnalDone = true;
    ```
  - Because Ibu Assyfa does not teach PJOK and has no PJOK dropdown options, she cannot fill those journals, and her presensi pulang is locked with: *"Anda belum menyelesaikan: Jurnal (KBM/Kegiatan)"*.

---

### C. Requirement R4 & R5: HomeView Widget Edge Cases & Stability
- Investigated `src/components/HomeView.tsx`:
  - `isDinasLuar === true`: Lines 343–352 render a blue "Dinas Luar" badge while continuing to display the teacher's daily teaching cards. Presensi Pulang validation in `workflow.ts` line 264 permits checkout with `jurnalKegiatan`. (PASS)
  - Sunday empty state: Lines 383–385 explicitly check `hariIni === 'Minggu'` and display: *"Hari Minggu merupakan hari libur akhir pekan."* (PASS)
  - Free weekday empty state: Lines 385–386 display: *"Anda tidak memiliki jadwal KBM pada hari [Hari]."* (PASS)
  - Holiday state: Lines 362–372 render a holiday banner with `dailyState.keteranganLibur` and skip normal tasks. (PASS)
  - Interactive Action button: Unfilled schedule cards provide an `"Isi Jurnal"` button navigating directly to `view-guru-jurnal`. (PASS)
- Investigated `src/app/page.tsx`:
  - Lines 54–63 enclose `JSON.parse(storedUser)` in a `try ... catch` block that purges corrupted storage and prevents white-screen crashes. (PASS)
- Investigated `src/components/HistoryView.tsx`:
  - Line 20 removes `page` from the `useEffect` dependency array, and line 26 removes premature `setDataList([])`, eliminating pagination flicker. (PASS)

---

### D. Requirement R5: WITA Timezone Normalization
- Investigated `src/components/GuruPresensi.tsx` lines 119–131:
  ```typescript
  const now = new Date();
  const witaParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  }).formatToParts(now);

  const currH = parseInt(witaParts.find(p => p.type === 'hour')?.value || '0', 10);
  const currM = parseInt(witaParts.find(p => p.type === 'minute')?.value || '0', 10);
  const currS = parseInt(witaParts.find(p => p.type === 'second')?.value || '0', 10);
  const currTimeVal = currH * 60 + currM;
  ```
- Evaluated against client machine timezone variances (WIB GMT+7, WIT GMT+9):
  - Machine in WIB (07:05:00 WIB) converts to 08:05:00 WITA.
  - `currTimeVal` = 485 > `batasVal` (480 = 08:00 WITA).
  - `keterlambatanDetik` = `currTotalSeconds - batasTotalSeconds` evaluates to 300 seconds late.
  - Previous implementation using `now.getHours()` incorrectly calculated 07:05 as on time. The new implementation is mathematically correct and timezone-independent. (PASS)

---

## 2. Logic Chain

1. *Observation*: Live database queries confirm that all 7 columns (`pertemuan_ke`, `jam_ke`, `tujuan_pembelajaran`, `materi_pembelajaran`, `kehadiran_murid`, `catatan_refleksi`, `foto_kegiatan`) are active in `jurnal_pembelajaran`, and backfilled values match legacy counts (148 materi, 148 foto, 22 refleksi).
2. *Inference*: Requirement R2 database DDL and backfill are 100% verified.
3. *Observation*: In `public.jadwal_pelajaran`, Pak Riski's name is misspelled as `"Rizki"` while his user record is `"Riski Candra Mamangkai"`.
4. *Inference*: In `src/lib/workflow.ts`, the matching conditions (`startsWith`, `guruWords.includes`, `includes`) all fail on `'s'` vs `'z'`. Pak Riski receives 0 scheduled classes on Mondays and Thursdays.
5. *Observation*: In `public.users`, Ibu Assyfa has `"Assyfa Fitra Azzahrah Abukasim"`. Pak Fitra has `"FITRA SURYAZANA MAMONTO"`. In `jadwal_pelajaran`, PJOK is listed under `"Fitra"`.
6. *Inference*: In `src/lib/workflow.ts`, `guruWords.includes(jNama)` matches `"fitra"` in Ibu Assyfa's middle name, erroneously assigning her Pak Fitra's PJOK classes and blocking her Presensi Pulang checkout.
7. *Observation*: HomeView widget handles `isDinasLuar`, Sunday, free weekdays, and holidays cleanly.
8. *Observation*: `GuruPresensi.tsx` calculates WITA time and late penalties accurately using `Intl.DateTimeFormat` with `Asia/Makassar`.
9. *Inference*: While R2, R5, and the UI portions of R4 are high quality, the teacher schedule matching algorithm contains 2 critical functional flaws directly impacting production teachers.

---

## 3. Caveats

- `isJurnalMatchJadwal` matches on `jMapel.includes(jdMapel)`: In current data, `guru_mapel.nama_mapel` has values like `"X Merdeka_MTK"`, which matches `"MTK"` in `jadwal_pelajaran`. If an admin manually inputs full names like `"Matematika"` into `jurnal_pembelajaran` without the abbreviation `"MTK"`, `isJurnalMatchJadwal` will not match unless abbreviation aliases are added.
- In accordance with the key constraint *"Review-only — do NOT modify implementation code"*, this agent did not modify `workflow.ts` or database rows, leaving remediation to the implementation workers.

---

## 4. Conclusion & Required Changes

**Verdict**: **REQUEST_CHANGES**

To achieve full approval, the following two specific defects must be addressed:

### Required Change 1: Fix Riski vs Rizki Schedule Matching
- **Option A (Recommended & Immediate)**: Update `public.jadwal_pelajaran` rows where `nama_guru = 'Rizki'` to `nama_guru = 'Riski'` so it aligns with `public.users.nama` and `public.guru_mapel`.
- **Option B (Code level)**: In `src/lib/workflow.ts` (`findJadwalForGuru`), add alias or phonetic normalization (e.g. normalize `z` to `s` for `riski`/`rizki`).

### Required Change 2: Prevent False Positive Middle Name Token Collisions (Assyfa vs Fitra)
- In `src/lib/workflow.ts` (`findJadwalForGuru`), adjust the matching logic:
  - If `namaGuru` starts with a distinct first name (e.g., `"assyfa"`), do not match a short schedule name (`"fitra"`) that belongs to another teacher whose first name actually IS `"fitra"`.
  - Alternatively, allow `findJadwalForGuru` to accept `user.username` (or `user.nip`) in addition to `namaGuru`, since `user.username` in `users` maps 1:1 to the schedule names:
    - User `FITRA SURYAZANA MAMONTO` has `username: 'Fitra'`.
    - User `Assyfa Fitra Azzahrah Abukasim` has `username: 'Assyfa'`.
    - Matching on `username` immediately resolves the ambiguity without false collisions.

---

## 5. Verification Method

1. **Verify Database Schema**:
   ```sql
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'jurnal_pembelajaran'
     AND column_name IN ('pertemuan_ke', 'jam_ke', 'tujuan_pembelajaran', 'materi_pembelajaran', 'kehadiran_murid', 'catatan_refleksi', 'foto_kegiatan');
   ```
   *Expected*: Exactly 7 rows returned.

2. **Verify Riski Schedule Resolution**:
   Call `findJadwalForGuru("Senin", "Riski Candra Mamangkai")`.
   *Expected*: Returns 2 classes (XI Merdeka Sejarah, XII Merdeka Sejarah). Currently returns `[]`.

3. **Verify Assyfa Schedule Resolution**:
   Call `findJadwalForGuru("Rabu", "Assyfa Fitra Azzahrah Abukasim")`.
   *Expected*: Returns `[]` (she has no teaching assignments). Currently returns 3 PJOK classes.

4. **Verify Fitra Schedule Resolution**:
   Call `findJadwalForGuru("Rabu", "FITRA SURYAZANA MAMONTO")`.
   *Expected*: Returns 3 PJOK classes (X Merdeka, XI Merdeka, XII Merdeka).
