# Handoff Report: Reviewer 1 — Independent Review of Milestones 1 & 2 (Requirements R1 & R2)

## Review Summary
- **Verdict**: **APPROVE**
- **Reviewed Scope**:
  - Milestone 1 (R1): `src/components/AdminConfigView.tsx`, `src/lib/workflow.ts`, `src/components/HomeViewTU.tsx`, `src/components/HomeViewGuru.tsx`, `src/components/AdminVerifView.tsx`, `src/components/HomeViewAdmin.tsx`, `src/lib/attendanceAlpa.ts`
  - Milestone 2 (R2): `src/components/RekapJurnalView.tsx`, `src/components/GuruJurnal.tsx`, `tests/jurnal_edit_delete_r2.test.ts`
- **Integrity Status**: CLEAN. Zero evidence of hardcoded test outputs, dummy implementations, facade patterns, or task bypasses.

---

## 1. Observation

### 1.1 Direct Source Code Observations

#### Milestone 1: Kebijakan Presensi Guru & TU Tanpa Jam KBM (Requirement R1)
1. **`src/components/AdminConfigView.tsx`**:
   - Lines 71–81: Defined helper `isTuStaff` (checking `tata usaha`, `tu (administrasi)`, or `tu`) and `getTeacherKbmCount` (using `isTeacherRecordMatch` against loaded `jadwal_pelajaran` timetable).
   - Lines 221–230: In `loadData`, `dbExempt` is strictly filtered: `!isTuStaff(t) && getTeacherKbmCount(t, allSchoolJadwal) > 0 && isValTrue(t.wajib_hadir_hanya_mengajar)`.
   - Lines 374–385: In `saveConfig`, `validExemptTeachers` is computed as `guruList.filter(t => !isTuStaff(t) && getTeacherKbmCount(t, jadwalList) > 0)`. The `exemptIds` array is strictly intersected with this set. Any TU staff or teacher with 0 KBM hours is guaranteed to have `wajib_hadir_hanya_mengajar: false` persisted to Supabase `data_guru`.
   - Lines 830–845: Mass action button "Set Semua Hanya Hari KBM" explicitly restricts candidates: `guruList.filter(g => !isTuStaff(g) && getTeacherKbmCount(g, jadwalList) > 0)`.
   - Lines 952–965: Toggle switches for non-eligible staff are disabled with `cursor-not-allowed`, warning tooltips, and warning toasts preventing accidental modification.
2. **`src/lib/workflow.ts`**:
   - Lines 1115 & 1202–1235: Computes `totalTeacherKbmCount` from `jadwal_pelajaran`. Flags `isNonKbmOrTu = isTeacherTu || totalTeacherKbmCount === 0`.
   - Lines 1235–1240: Enforces `if (isNonKbmOrTu) { isTeacherExempt = false; }`.
   - Lines 1803–1809: In journal completion check:
     ```ts
     } else if (state.isBlok || state.isDinasLuar || state.jadwalKBM.length === 0) {
       if (state.jurnalKegiatan) {
         isJurnalDone = true;
       } else if (isTeacherExempt && state.jadwalKBM.length === 0) {
         isJurnalDone = true;
       } else if (!isNonKbmOrTu && state.jadwalKBM.length === 0 && state.isPiket) {
         isJurnalDone = true;
       }
     }
     ```
     For non-KBM/TU staff (`isNonKbmOrTu = true`, `isTeacherExempt = false`), neither exemption branch applies; `isJurnalDone` is true *only* when `state.jurnalKegiatan` is present.
   - Lines 1883–1889: In `canTeacherPresensiPulang(state)`:
     ```ts
     if (state.isBlok || state.isDinasLuar || !state.jadwalKBM || state.jadwalKBM.length === 0) {
       if (state.jurnalKegiatan) return true;
       if (isTeacherExempt && (!state.jadwalKBM || state.jadwalKBM.length === 0)) return true;
       return false;
     }
     ```
     Non-exempt staff without KBM cannot checkout without submitting `jurnalKegiatan`.
3. **`src/components/HomeViewTU.tsx`**:
   - Lines 308–377: Integrated Piket duty detection checking `penugasan_piket` and fallback `jadwal_piket`, plus retrieval of `laporan_piket` and verification status `laporanPiketDitolak`.
   - Lines 381–382: Evaluated checkout gate:
     `const isPiketDone = !isPiket || (Boolean(laporanPiket) && !laporanPiketDitolak);`
     `const canPresensiPulang = Boolean(effectivePresensiDatang) && !isIzinSakit && !isAlpa && !isLibur && Boolean(jurnalKegiatan) && isPiketDone;`
   - Lines 624–730: Rendered full 4-step workflow: Presensi Datang -> Laporan Piket (if assigned) -> Jurnal Kegiatan -> Presensi Pulang.
4. **`src/components/HomeViewGuru.tsx`**:
   - Lines 421 & 1056: Guarded the "Bebas Presensi" hero banner with `dailyState?.isNonTeachingDay && dailyState?.aturanKehadiran === 'Hari_Mengajar_Saja'`.
   - Lines 1135–1176: For teachers without KBM hours, rendered active guidance: "Tidak Ada Jadwal Mengajar KBM Hari Ini - Anda tetap wajib hadir dan mengisi Jurnal Kegiatan administrasi harian", with direct action button "Isi Jurnal Kegiatan" or completion badge.
5. **`src/components/AdminVerifView.tsx` & `src/components/HomeViewAdmin.tsx`**:
   - `AdminVerifView.tsx` (lines 843–867): `isNonKbmOrTu = isTu || totalTeacherSchedules === 0; isTeacherExempt = !isNonKbmOrTu && (...);`
   - `HomeViewAdmin.tsx` (lines 407–415): `isNonKbmOrTu = isTu || !hasAnyWeeklyKbm; isTeacherExempt = !isNonKbmOrTu && (...);`
   - Neither component labels TU staff or non-KBM teachers as "Bebas Hadir".
6. **`src/lib/attendanceAlpa.ts`**:
   - Lines 324–330 & 411–438: Pre-fetches `allWeeklyJadwal`, computes `isNonKbmOrTu = isTu || !hasAnyWeeklyKbm`.
   - Line 435: `const isTeacherExempt = !isNonKbmOrTu && (...)`. Non-KBM/TU staff are never bypassed during daily Alpa checks.

---

#### Milestone 2: Fitur Edit & Hapus Jurnal KBM Role Guru (Requirement R2)
1. **`src/components/RekapJurnalView.tsx`**:
   - Lines 12–16: Imported `SwalModal from 'sweetalert2'` with alias `const Swal = SwalModal;` and `uploadToDrive` from `@/lib/driveUpload`.
   - Lines 110–127: Form state variables initialized for all editable attributes.
   - Lines 859–892 (`handleOpenEditModal`): Pre-fills date, jam_ke, pertemuan_ke, mapel, kelas, lokasi_kbm, TP, KKTP, materi/konten, kegiatan, refleksi, absensi parsing (H/I/S/A), and photo preview.
   - Lines 903–953 (`handleDeleteJurnal`):
     - Displays confirmation via `Swal.fire({ title: 'Hapus Jurnal KBM?', ... })`.
     - Scopes mutation strictly to teacher: `.from('jurnal_pembelajaran').delete().eq('id', targetJurnal.id).eq('nama_guru', user.nama).eq('sekolah_id', user.sekolah_id)`.
     - Updates local state, dispatches `sipjam:jurnal-updated` event, and refreshes via `tarikRekap()`.
   - Lines 955–1095 (`handleSaveEdit`):
     - Validates mandatory fields (date, mapel, kelas, lokasi, TP, KKTP, konten, kegiatan).
     - Supports keeping existing photo or uploading a new file via `uploadToDrive` with FileReader data URL fallback.
     - Formats attendance as `Total murid: ${totalMurid}, Hadir: ${hadir}, Izin: ${izin}, Sakit: ${sakit}, Alpa: ${alpa}`.
     - Resets rejection status when editing a previously rejected journal (`status_verifikasi = 'Menunggu'` or `'Disetujui'`, clearing `catatan_admin = null`, `alasan_penolakan = null`).
     - Scopes update query strictly: `.from('jurnal_pembelajaran').update(payload).eq('id', editingJurnal.id).eq('nama_guru', user.nama).eq('sekolah_id', user.sekolah_id)`.
     - Operates with no date or time restrictions ("tanpa batasan waktu khusus").
   - Lines 1679–1695 & 1811–1840:
     - Retains exact 12-column table print header.
     - Action buttons (`Detail`, `Edit`, `Hapus`) are wrapped inside `<div className="mt-1.5 no-print not-italic flex items-center gap-1.5 flex-wrap">` in column 12 (`Catatan`), hidden during print.
     - Restricts buttons to real teacher-owned entries: `!isReadOnly && !j.id?.startsWith('unfilled-') && (tabMode === 'pribadi' || controlledMode === 'pribadi')`.
   - Lines 2166–2189: Detail modal (`modal-detail-jurnal`) includes `Edit Jurnal` and `Hapus Jurnal` action buttons.
   - Lines 2203–2610: Renders full accessible dialog `modal-edit-jurnal`.
2. **`src/components/GuruJurnal.tsx`**:
   - Lines 604–610: Subscribes to `window.addEventListener('sipjam:jurnal-updated')` to dynamically invoke `fetchRejected()`.
   - Line 597: `setRejectedJournals(data || [])` properly empties rejected journal list when rejected records are modified or removed.

---

### 1.2 Verification Commands Executed & Live Outputs

| Command | Status | Details |
|---|---|---|
| `npx tsc --noEmit` | **PASS (0 errors)** | Zero TypeScript type errors across entire codebase. |
| `npx tsx tests/jurnal_edit_delete_r2.test.ts` | **PASS (19/19)** | All 5 sections passed: Table action buttons & print invariant, Detail modal action buttons, Deletion scoping, Edit modal & mutation scoping, GuruJurnal coordination. |
| `npx tsx tests/tu_refinements_and_admin_rekap.test.ts` | **PASS (82/82)** | All 5 suites passed: TU navigation & RBAC, read-only gradebook/rapor, admin recap separation, admin TU account sync, AST invariants. |
| `npx tsx tests/jurnal_r1_r2_r3_verification.test.ts` | **PASS (20/20)** | All 3 sections passed: Photo upload options, presensi pulang flexibility, rekap standard descriptions & invariants. |
| `npx tsx tests/pulang_cepat_guru_bk_tu.test.ts` | **PASS (3/3)** | Universal pulang cepat logic intact across Guru, BK, and TU. |
| `npx tsx tests/jurnal_kbm_r1_r2_r3_verification.test.ts` | **PASS (14/14)** | 12-column personal table invariants, attendance formatting, and class/mapel separation intact. |
| `npx tsx tests/verifikasi_presensi_alpa_guru.test.ts` | **PASS (18/18)** | Alpa status calculations and gating invariants intact. |
| `npx tsx tests/tata_usaha_role_rbac_and_isolation.test.ts` | **PASS (87/87)** | Comprehensive TU RBAC isolation, data guard, and menu invariants intact. |
| `npx tsx tests/adversarial_bk_reviewer_verification.test.ts` | **PASS (86/86)** | BK role RBAC, mapel normalization, and session safety intact. |

---

## 2. Logic Chain

1. **Requirement R1 Fulfillment**:
   - *Observation*: `AdminConfigView.tsx` now loads `jadwal_pelajaran` to distinguish teachers with KBM schedules from teachers without KBM and TU staff.
   - *Reasoning*: Because exemption is strictly prohibited for non-KBM/TU staff during configuration save, batch toggle, and individual toggling, the database state `data_guru.wajib_hadir_hanya_mengajar` remains `false`.
   - *Observation*: `workflow.ts`, `AdminVerifView.tsx`, `HomeViewAdmin.tsx`, and `attendanceAlpa.ts` calculate `isNonKbmOrTu` dynamically and force `isTeacherExempt = false`.
   - *Reasoning*: Staff without KBM can never be evaluated as exempt (`isNonTeachingDay = false`, `bebasAlpa = false`, not "Bebas Hadir").
   - *Observation*: In `workflow.ts` (lines 1803 & 1883) and `HomeViewTU.tsx` (line 381), `canPresensiPulang` requires `jurnalKegiatan` and `laporanPiket` (if on duty).
   - *Conclusion*: Non-KBM teachers and TU staff are never exempt from attendance. They must check in (Datang), submit Piket (if on duty), submit Jurnal Kegiatan, and only then can check out (Pulang).

2. **Requirement R2 Fulfillment**:
   - *Observation*: `RekapJurnalView.tsx` provides both row-level `Edit` / `Hapus` buttons and detail modal action buttons when in personal mode.
   - *Reasoning*: Teachers have immediate self-service access to adjust or delete their own journal entries.
   - *Observation*: Mutations are strictly restricted with `.eq('nama_guru', user.nama).eq('sekolah_id', user.sekolah_id)`.
   - *Reasoning*: Tenant isolation and authorization are preserved; teachers cannot modify peers' journals.
   - *Observation*: The code has no time limitation logic, and the personal print header retains exactly 12 columns because buttons are wrapped in `no-print`.
   - *Conclusion*: Teachers can edit and delete their journals freely without time limits, while print layouts and multi-teacher security remain uncompromised.

---

## 3. Findings & Adversarial Stress Tests

### Finding 1: Brittle AST Substring Asserts in Legacy Test (`tests/wajib_hadir_dan_pembersihan_usang.test.ts`)
- **Classification**: Minor / Informational
- **Location**: `tests/wajib_hadir_dan_pembersihan_usang.test.ts` (lines 146, 159, 169)
- **Observation**:
  `tests/wajib_hadir_dan_pembersihan_usang.test.ts` contains 3 static string assertions that check for pre-R1 syntax:
  - Line 146 checks for exact single-line `if (isTeacherExempt && state.jadwalKBM.length === 0) isJurnalDone = true;`.
  - Line 159 checks for `if (state.jadwalKBM.length === 0 && state.isPiket) isJurnalDone = true;` (an old assumption that piket duty excused all journal requirements).
  - Line 169 checks for `const isTeacherExempt = Boolean(guru.wajib_hadir_hanya_mengajar)`.
- **Impact Analysis**:
  All 30 algorithmic and behavioral simulation tests in `tests/wajib_hadir_dan_pembersihan_usang.test.ts` (R1.10.A through R1.21) passed cleanly. The 3 failures are solely caused by static AST substring matching against obsolete pre-R1 syntax that R1 explicitly superseded.
- **Recommendation**:
  No implementation changes needed. If test cleanup is scheduled in M3, the AST string assertions in that legacy test can be updated to reflect the new R1 syntax.

### Finding 2: Adversarial Stress Test Results
- **Scenario A: Malicious attempt to delete another teacher's journal**:
  - *Result*: Blocked. The Supabase query enforces `.eq('nama_guru', user.nama).eq('sekolah_id', user.sekolah_id)`, resulting in zero affected rows.
- **Scenario B: Modifying historical journals from past weeks/months**:
  - *Result*: Supported. Form pre-fills historical values and saves directly to database with no date barrier.
- **Scenario C: TU staff attempting checkout with only Datang presensi**:
  - *Result*: Blocked. `canPresensiPulang` returns `false` with locked reason: "Selesaikan jurnal kegiatan terlebih dahulu" (and piket if on duty).
- **Scenario D: Non-KBM teacher attempting checkout after only Piket without Jurnal Kegiatan**:
  - *Result*: Blocked. `isNonKbmOrTu` prevents piket from waiving `jurnalKegiatan`.
- **Scenario E: Offline / unconfigured Google Drive during journal photo edit**:
  - *Result*: Gracefully handled. System falls back to `FileReader.readAsDataURL` and preserves the edit.

---

## 4. Caveats

- **Supervisi Kelas Binaan**: When a teacher views `tabMode === 'kelas'` (supervising class entries), other teachers' journals are view-only with no Edit or Hapus buttons displayed. This is intentional and necessary for supervisory integrity.
- **Git Operations**: Per GEMINI.md, committing and pushing to `main` is handled in Milestone 3 following gate approval.

---

## 5. Conclusion & Final Verdict

**VERDICT: APPROVE**

Both Milestone 1 (Requirement R1) and Milestone 2 (Requirement R2) are fully and correctly implemented:
1. Admin policy configuration and daily attendance workflows prevent TU staff and non-KBM teachers from being exempt.
2. The 4-step workflow (Datang -> Piket if assigned -> Jurnal Kegiatan -> Pulang) is reliably enforced across all roles.
3. KBM journal editing and deletion are available to teachers without time restrictions, scoped to the owner, and synchronized with GuruJurnal.
4. All 4 required test suites and multiple auxiliary suites passed 100%. Zero integrity violations detected.

---

## 6. Verification Method

To independently reproduce the verification results:

```powershell
# 1. Typecheck
npx tsc --noEmit

# 2. Milestone 2 Edit & Delete Test Suite
npx tsx tests/jurnal_edit_delete_r2.test.ts

# 3. Milestone 1 TU Refinements & Admin Recap Suite
npx tsx tests/tu_refinements_and_admin_rekap.test.ts

# 4. Universal Journal Verification Suite
npx tsx tests/jurnal_r1_r2_r3_verification.test.ts
```

### Invalidation Conditions
- Any occurrence of `status_label = 'Bebas Hadir'` for TU staff or teachers without KBM hours on active school days.
- Any ability of a non-KBM teacher or TU staff member to checkout without submitting `jurnalKegiatan` and assigned piket.
- Any inability of a teacher to edit or delete their own past journals in personal rekap mode.
- Any alteration to the 12-column personal table print layout.
- Any compilation error in `npx tsc --noEmit`.
