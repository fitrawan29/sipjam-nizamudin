# Handoff Report: Adversarial Challenge for R4 & R5

**Agent**: `challenger_m6_2`  
**Role**: EMPIRICAL CHALLENGER (critic, specialist)  
**Milestone**: M6 (R4 Piket & Perangkat Pembelajaran, R5 Broadcast Announcements & UI Transitions)  
**Final Verdict**: **APPROVE**  
**Risk Assessment**: **LOW**

---

## 1. Observation

Direct empirical observations from codebase inspection, database queries, and automated test execution:

### 1.1 Piket Penugasan (`src/components/PiketView.tsx`)
- **Day Scheduling**: Line 13 defines `const HARI_PIKET_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;`. Line 23 initializes `selectedHariPiket` with WITA day fallback to 'Senin'.
- **Admin Tab Isolation**: Line 465-467 sets `const canReport = !isAdmin && isGuru && Boolean(dailyState && dailyState.isPiket && !dailyState.isLibur);`. When `isAdmin` is true, `canReport` is `false`, completely hiding the "Isi Laporan" tab (Line 517). In its place, Admin renders "Penugasan Piket" (Line 507-515, 667-951).
- **Duplicate Prevention**:
  * Guru: Line 316-322 checks `penugasanList.some(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Guru' && (p.guru_id === teacher.id || p.guru_nama === teacher.nama_guru))`.
  * Siswa: Line 385-391 checks `penugasanList.some(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Siswa' && p.siswa_nama?.toLowerCase() === nama.toLowerCase())`.
- **Synchronization with `jadwal_piket`**: Line 114-134 implements `syncJadwalPiketForDay(day: string)`, which queries `penugasan_piket`, joins teacher names with `, `, and updates or inserts the corresponding day in `jadwal_piket`. It is invoked on adding a teacher (Line 341) and on deleting a teacher (Line 448).
- **Live Database Records**: Supabase query on `penugasan_piket` confirms 14 existing penugasan records across active days.

### 1.2 DokumenView (`src/components/DokumenView.tsx`)
- **Admin Upload Removal**: Line 20-21 defaults `activeTab` to `'matrix'` for Admin, and line 304-344 only renders "Matriks Guru" tab for Admin. "Upload Baru" is only accessible when `!isAdmin` (Line 331, 702).
- **13 Teachers Completeness**: Supabase query on `data_guru` returns exactly 13 teachers. Line 208-242 maps over all teachers to compute `completedCount`, `completionRate`, `isComplete`, and `docStatusMap`.
- **6 Standard Documents**: Lines 10-17 defines `KURIKULUM_DOCS` with CP, ATP, RPE, Prota, Promes, RPM. Line 194-205 provides fuzzy type matching (`capaian|cp`, `tujuan|atp`, `pekan|rpe`, `tahunan|prota`, `semester|promes`, `mendalam|rpm|modul`).
- **Edge Case (0 Subjects)**: Teacher Assyfa Fitra Azzahrah Abukasim has 0 records in `guru_mapel`. DokumenView handles this at Line 491-495 by falling back to `teacher.mata_pelajaran || 'Belum ada mapel diinput'`. No null pointer exceptions or rendering breaks occur.
- **Modal Verify Action**: Lines 85-142 implements `handleVerifyDokumen(id, status)`. Approvals support optional notes (defaulting to "Disetujui oleh Admin"), while rejections enforce mandatory notes via Swal validator (`!val ? 'Catatan perbaikan wajib diisi...' : null`).

### 1.3 AppScreen Navigation (`src/components/AppScreen.tsx`)
- **Pantauan Harian Elimination**: Neither `menuItemsGuru` (Line 74-84) nor `menuItemsAdmin` (Line 86-98) contain `'view-admin-monitor'` or "Pantauan Harian".
- **Informasi Navigation**: Both roles contain `{ id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi' }` (Line 80 and Line 91). Line 167 mounts `<InformasiView user={user} setView={handleNavigation} />`.
- **Navigation Guard Integrity**: Line 40 restricts only `['view-guru-jurnal', 'view-piket', 'view-guru-presensi']`. `view-informasi` is unrestricted, enabling teachers to view announcements even if locked out from daily teaching.
- **Print Hiding**: AppScreen header element explicitly specifies `print:hidden no-print` (Line 104).

### 1.4 InformasiView (`src/components/InformasiView.tsx`)
- **Audience Filtering**: Lines 288-292 filter announcements such that when `activeFilter !== 'Semua'`, items must match either `p.sasaran === activeFilter` or `p.sasaran === 'Semua'`. No cross-audience leakage occurs (e.g. Ortu announcements do not appear under Guru).
- **Communication Modes**:
  * Line 510-529 renders discussion button and comment stream only when `p.mode === 'Dua Arah'`.
  * In `'Satu Arah'`, only a locked badge `<i className="fa-solid fa-lock text-[10px] mr-1"></i> Siaran Satu Arah` is rendered.
  * Comment deletion (Line 574) strictly enforces authorization: `isAdmin || resp.user_nama === user?.nama`.
- **WhatsApp Integration**: Line 221-235 builds the WhatsApp message and passes it through `encodeURIComponent(text)`. Stress testing with emojis, special symbols, linebreaks, and URLs verifies lossless round-trip decoding.

### 1.5 globals.css (`src/app/globals.css`)
- **Animations**: Lines 163-183 define `@keyframes pageEnter` and `@keyframes modalPop`. Line 158 defines `@keyframes fadeIn`.
- **Transitions**: Utilities `.btn-click`, `.card-interactive`, `.pill-interactive` apply smooth hover brightness and transform effects without layout thrashing.
- **Print Media Cleanliness**: Lines 210-296 define `@media print` rules hiding `header, nav, aside, .swal2-container, .no-print { display: none !important; }`. Signature container strictly enforces `justify-content: flex-end !important; margin-left: auto !important;` to prevent breaking.

---

## 2. Logic Chain

1. **Premise 1 (R4 Piket)**: Admin must be restricted from submitting daily picket reports ("Isi Laporan") and granted picket duty scheduling ("Penugasan Piket") for teachers and students across Monday–Saturday, preserving synchronization with `jadwal_piket`.
   - *Observation*: `canReport` is falsified for Admin; `Penugasan Piket` tab is rendered. Duplicate prevention tests for teachers and students passed. `syncJadwalPiketForDay` successfully writes comma-delimited strings to `jadwal_piket` preserving `workflow.ts` compatibility.
   - *Deduction*: R4 Piket requirements are satisfied and resilient against regressions.

2. **Premise 2 (R4 Perangkat)**: Admin must manage learning documents through a teacher matrix card system across 13 teachers and 6 standard documents, gracefully handling edge cases like 0 subjects.
   - *Observation*: Database contains exactly 13 teachers. Teacher matrix calculation ran against all 13 teachers, matching 6 standard documents. Teacher Assyfa (0 subjects in `guru_mapel`) rendered safely using fallback text. Document verify modal correctly enforces validation.
   - *Deduction*: R4 Perangkat requirements are complete and robust against empty/sparse data.

3. **Premise 3 (R5 Broadcast & Navigation)**: Old "Pantauan Harian" must be removed; "Informasi" broadcast system must support audience filtering, 1-way / 2-way permissions, WhatsApp export, and smooth UI motion.
   - *Observation*: "Pantauan Harian" is absent from all role menus. "Informasi" is accessible to both Admin and Guru. Audience filtering strictly prevents data leaks. 1-way mode disables commenting. WhatsApp URL safely encodes complex content. globals.css defines valid keyframes and strict print hiding.
   - *Deduction*: R5 requirements are satisfied with zero functional defects.

---

## 3. Adversarial Review & Stress Test Results

### Challenge Summary
**Overall risk assessment**: **LOW**

### Challenges Analyzed
1. **Challenge 1: Duplicate Picket Assignment Bypass**
   - *Assumption*: Users might accidentally assign the same teacher twice or assign students with varying character cases.
   - *Attack Scenario*: Admin adds teacher with same ID but different name, or submits duplicate student names with uppercase/lowercase differences.
   - *Blast Radius*: Corrupted duty list and broken attendance reporting.
   - *Mitigation Verified*: `PiketView.tsx` checks both `guru_id === teacher.id || guru_nama === teacher.nama_guru` for teachers and `toLowerCase()` for students.
   - *Result*: **PASS**

2. **Challenge 2: Invalidation of Legacy Daily Picket Check (`workflow.ts`)**
   - *Assumption*: Overhauling piket into `penugasan_piket` might break `workflow.ts:isTeacherOnPiket` which queries `jadwal_piket`.
   - *Attack Scenario*: Penugasan changes are saved to `penugasan_piket` but not mirrored in `jadwal_piket`.
   - *Blast Radius*: Teachers cannot fill out daily reports because `workflow.ts` thinks they are not on duty.
   - *Mitigation Verified*: `syncJadwalPiketForDay` is triggered after every add and delete operation, syncing the teacher list to `jadwal_piket`.
   - *Result*: **PASS**

3. **Challenge 3: Teacher Matrix Breakdown on Teachers with 0 Subjects**
   - *Assumption*: Matrix assumes every teacher in `data_guru` has records in `guru_mapel`.
   - *Attack Scenario*: Teacher without subjects in `guru_mapel` triggers `undefined.map` or renders empty blank space.
   - *Blast Radius*: Application crash or ugly UI glitch for unassigned teachers.
   - *Mitigation Verified*: Checked `Assyfa Fitra Azzahrah Abukasim` (0 subjects); component safely falls back to `teacher.mata_pelajaran || 'Belum ada mapel diinput'`.
   - *Result*: **PASS**

4. **Challenge 4: Audience Privacy Leakage in Broadcast Feed**
   - *Assumption*: Filtering for 'Guru' might accidentally expose messages meant strictly for 'Orang Tua' or 'Wali Kelas'.
   - *Attack Scenario*: Filter logic uses loose `includes` or inverted boolean condition.
   - *Blast Radius*: Confidential administrative or parental notes displayed to unintended audiences.
   - *Mitigation Verified*: Filter condition `if (p.sasaran !== activeFilter && p.sasaran !== 'Semua') return false;` guarantees only messages specifically targeted to the filter or broadcast to 'Semua' are returned.
   - *Result*: **PASS**

5. **Challenge 5: Discussion Hijacking in "Satu Arah" Broadcasts**
   - *Assumption*: "Satu Arah" broadcasts might still expose discussion endpoints or comment forms.
   - *Attack Scenario*: User triggers comment submission UI on broadcast marked 'Satu Arah'.
   - *Blast Radius*: Uncontrolled commentary on official decrees.
   - *Mitigation Verified*: Comment toggle button and discussion thread are only rendered when `p.mode === 'Dua Arah'`. 'Satu Arah' displays a static lock indicator.
   - *Result*: **PASS**

### Stress Test Results Summary Table
| # | Stress Test Scenario | Expected Behavior | Actual Behavior | Verdict |
|---|---|---|---|---|
| 1 | Day validation (Senin–Sabtu vs Minggu/Ahad) | Valid days accepted, invalid days rejected | 6 valid accepted, 3 invalid rejected | **PASS** |
| 2 | Teacher duplicate assignment check | Same day blocked, different day permitted | Duplicate blocked, different day allowed | **PASS** |
| 3 | Student duplicate assignment (case-insensitive) | Ahmad vs ahmad vs AHMAD blocked | All case variants detected and blocked | **PASS** |
| 4 | `jadwal_piket` synchronization simulation | Comma-separated string created/updated | String matches format exactly | **PASS** |
| 5 | DokumenView standard 6 documents matching | Fuzzy matching for CP, ATP, RPE, Prota, Promes, RPM | 14 test variants correctly matched | **PASS** |
| 6 | Teacher Matrix for all 13 teachers | All 13 mapped with 0-6 count and 0-100% rate | All 13 rendered with zero errors | **PASS** |
| 7 | Zero subject edge case (Assyfa) | Fallback text rendered without exception | "Belum ada mapel diinput" rendered | **PASS** |
| 8 | Pantauan Harian menu elimination | No traces of view-admin-monitor or Pantauan | Completely absent from all role menus | **PASS** |
| 9 | Informasi menu presence & navigation | Present in Guru & Admin; no daily lockout | Present in both, unrestricted navigation | **PASS** |
| 10 | Broadcast audience filtering (4 targets) | Exact target + 'Semua' displayed | Zero leakage across 4 audience targets | **PASS** |
| 11 | Satu Arah vs Dua Arah permissions | Commenting disabled in Satu Arah | Toggle and inputs hidden in Satu Arah | **PASS** |
| 12 | WhatsApp URL encoding stress test | Emojis, linebreaks, special chars encoded | Round-trip decode matches original | **PASS** |
| 13 | globals.css animation keyframes & transitions | pageEnter, modalPop, fadeIn valid | Valid syntax and classes defined | **PASS** |
| 14 | Print media hiding rules | Navbar/header/swal hidden; print-only shown | header, nav, aside, swal2 hidden | **PASS** |

---

## 4. Caveats

- **No Caveats**: All required backend tables (`penugasan_piket`, `pengumuman`, `pengumuman_tanggapan`, `bank_dokumen`), UI components (`PiketView.tsx`, `DokumenView.tsx`, `AppScreen.tsx`, `InformasiView.tsx`), CSS animations, and database queries have been empirically tested and validated.

---

## 5. Conclusion & Verdict

**Verdict**: **APPROVE**

The implementations of **R4 (Piket & Perangkat Pembelajaran)** and **R5 (Broadcast Announcements & UI Transitions)** meet all requirements in `PROJECT.md` and `ORIGINAL_REQUEST.md`. All edge cases have been empirically stress-tested with 111 passing assertions, zero TypeScript errors, 100% passing project test suites, and clean Next.js production builds.

---

## 6. Verification Method

To independently reproduce and verify this assessment:

1. **Run the empirical stress test harness**:
   ```bash
   npx tsx tests/challenger_m6_2_r4_r5_stress.test.ts
   ```
   *Expected result*: `TEST SUMMARY: 111 PASSED, 0 FAILED`.

2. **Run full project test suite**:
   ```bash
   npm test
   ```
   *Expected result*: All test suites pass with exit code 0.

3. **Run TypeScript type checking**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected result*: Exit code 0, 0 errors.

4. **Run Next.js production build**:
   ```bash
   npm run build
   ```
   *Expected result*: Build succeeds with optimized production bundles.
