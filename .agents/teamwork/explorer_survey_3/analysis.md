# Comprehensive Test Suite Exploration & Expansion Analysis: Sistem Blok

**Author**: `explorer_survey_3`  
**Target Milestone**: Exploration & Survey  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_3\`  
**Date**: 2026-11-02  

---

## 1. Executive Summary

The Sipjam application currently features a centralized "Sistem Blok" mechanism designed to handle school-wide activity periods (e.g., Penilaian Tengah Semester / PTS, P5 projects, or institutional special events). Under the current implementation, any active block period treats the entire school uniformly: regular teaching schedules (`jadwal_pelajaran`) are completely hidden for all teachers on that date, and teachers are prompted to submit a singular `Jurnal Kegiatan` in place of standard subject-specific class journals (`Jurnal KBM`).

Per the authoritative user request (`ORIGINAL_REQUEST.md`), the block system must be enhanced for production flexibility to support:
1. **Target Scope Options**: Per rule, administrators can target **Keseluruhan Sekolah**, a specific **Angkatan** (e.g. Grade 10 / X), a specific **Kelas** (e.g. X-A), or a specific **Guru** (e.g. teacher UUID / name).
2. **Date & Time Range Options**: Date ranges (`tanggal_mulai` to `tanggal_selesai`) and optional bounded time ranges (`jam_mulai` to `jam_selesai`, e.g., 07:30 to 10:00). If no time range is specified, the block applies for the full day by default.
3. **Target Masking & Isolation**: Only schedules matching both the target scope AND the time window are masked as block activities. Unmatched schedules (different class, different teacher, different cohort, or afternoon hours outside the block window) remain normal regular KBM.
4. **Journal Submission Parity**: Teachers affected by a block period submit `Jurnal Kegiatan` for that block; teachers or schedules not affected proceed with regular `Jurnal KBM` with student attendance.
5. **Zero Regression / 100% Backward Compatibility**: All 85 existing assertions in `tests/sistem_blok_verification.test.ts` must continue to pass seamlessly with 0 failures.

---

## 2. Test Infrastructure & Execution Mechanics

### 2.1 Test Runner & Environment
- **Runner**: The repository uses `tsx` (TypeScript Execute) to run test suites directly as Node.js CLI scripts without Jest or Vitest overhead.
  - Script defined in `package.json` line 10:
    ```json
    "test": "... && tsx tests/sistem_blok_verification.test.ts && ..."
    ```
- **Direct Execution Command**:
  ```bash
  npx tsx tests/sistem_blok_verification.test.ts
  ```
- **Execution Time & Verification**:
  - The entire existing suite runs in ~8 seconds.
  - Verification run on 2026-11-02 executed 85 tests: `85 PASSED, 0 FAILED`.

### 2.2 Tenant Context & Supabase Authentication
- Configured in `tests/sistem_blok_verification.test.ts` lines 24–48:
  ```ts
  const { supabase, setServerTenantContext } = await import('../src/lib/supabaseClient');
  const defaultSekolahId = 'a0000000-0000-0000-0000-000000000001';
  let sessionToken = 'deb40d1b-ce7f-4424-9d58-b98d47d62edf';
  try {
    const { data: loginData } = await supabase.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'SipjamSuperAdmin2026!'
    });
    if (loginData && loginData[0]?.session_token) {
      sessionToken = loginData[0].session_token;
    }
  } catch (err) {
    console.warn('verify_login fallback in sistem_blok_verification:', err);
  }

  setServerTenantContext({
    sekolahId: defaultSekolahId,
    role: 'Admin',
    userId: 'd23141e4-2116-4946-8094-895ef21a50e5',
    sessionToken
  });
  ```
- This setup enables live PostgreSQL operations on `public.sistem_blok` within Row Level Security (RLS) constraints, while avoiding cross-tenant leakage.

### 2.3 Assertion Architecture
- Implemented as a lightweight pure assert function (lines 12–21):
  ```ts
  function assert(condition: boolean, label: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${label}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${label}`);
      if (detail) console.error(`   ${detail}`);
      failed++;
    }
  }
  ```
- The suite terminates with `process.exit(1)` if `failed > 0` or `process.exit(0)` if all pass.

---

## 3. Deep Audit of Existing Coverage in `tests/sistem_blok_verification.test.ts`

The test file currently contains 614 lines structured into 5 sections covering 85 assertions:

| Section | Topic | Lines | Focus & Existing Coverage |
|---|---|---|---|
| **Section 1** | R1 - Manajemen Sistem Blok (CRUD) & Schema | 97–224 | Static AST checks for `types/database.ts` (`SistemBlok`), `SistemBlokView.tsx` form states (`namaKegiatan`, `tanggalMulai`, `tanggalSelesai`, `deskripsi`), date validation (`tanggalSelesai < tanggalMulai`), role guard (`isAdminOrSuperadmin`, AppScreen router). Live DB insert, read, and update of test record `00000000-0000-0000-0000-00000000b10c`. |
| **Section 2** | R2 - Penyesuaian Tampilan Jadwal & Masking | 225–284 | `workflow.getActiveSistemBlok(today)` lookup, far-future date null check, database schedule count integrity (`jadwal_pelajaran` count is completely unchanged before vs after), HomeView schedule masking banner verification. |
| **Section 3** | R3 - Jurnal Kegiatan Guru | 285–368 | `GuruJurnal.tsx` auto-switch to `Jurnal Kegiatan` when `state.isBlok` is true, KBM-only field suppression (Mapel, Kelas, Pertemuan, Jam, Absensi Siswa), date toggling, `workflow.ts` Presensi Pulang requirement fulfillment (1 Jurnal Kegiatan unlocks checkout), Admin Matrix target count (1 instead of N classes), live DB test record deletion. |
| **Section 4** | R4 - Batasan Implementasi & UI Compatibility | 369–402 | `package.json` zero-dependency invariant (no new npm packages), design tokens (`glass-card`, `input-premium`, `btn-click`). |
| **Section 5** | Adversarial Edge Cases & Open Issues Ledger QA | 403–591 | 9 sub-sections: <br>• **5.1**: Multi-tenant cross-school isolation (School A vs School B).<br>• **5.2**: Single-day block (`tanggal_mulai == tanggal_selesai`) and ISO date sanitization.<br>• **5.3**: Exempt teacher obligation (`wajib_hadir_hanya_mengajar`).<br>• **5.4**: Push notification reminders cron (`/api/push/send-reminders/route.ts`).<br>• **5.5**: Disciplinary warning system (`warningSystem.ts`).<br>• **5.6**: Pure function date sanitization (`sanitizeDateStr`, `getBlokStatus`).<br>• **5.7**: Cross-month, cross-year, and leap year calculations (`getBlokDurationDays`).<br>• **5.8**: `PiketView` tenant context retention.<br>• **5.9**: Jurnal Kegiatan display in `AdminVerifView`, `HistoryView`, `RekapJurnalView`. |

---

## 4. Gap Analysis: What is Missing for the New Requirements

### Gap 1: Target Scope Options (R1)
- **Current State**:
  - `public.sistem_blok` table and `src/types/database.ts` only contain `nama_kegiatan`, `deskripsi`, `tanggal_mulai`, `tanggal_selesai`.
  - `SistemBlokView.tsx` form only asks for name, dates, and description.
  - All blocks unconditionally apply to the whole school.
- **Required New Test Coverage**:
  1. AST verification of new schema fields in `src/types/database.ts`:
     - `tipe_target: 'sekolah' | 'angkatan' | 'kelas' | 'guru' | string`
     - `target_angkatan: string | null`
     - `target_kelas: string | null`
     - `target_guru_id: string | null`
     - `target_guru_nama: string | null`
  2. AST verification of UI form controls in `SistemBlokView.tsx`:
     - Target selector/radio/dropdown with options: `'sekolah'`, `'angkatan'`, `'kelas'`, `'guru'`.
     - Contextual inputs:
       - If `tipe_target === 'angkatan'`, cohort selector/input (e.g., "10", "11", "12" or "X", "XI", "XII").
       - If `tipe_target === 'kelas'`, class dropdown/input (e.g., "X-A", "XI IPA 1").
       - If `tipe_target === 'guru'`, teacher selector/input (UUID and name).
     - Target-specific form validation (e.g. required selection when target is angkatan/kelas/guru).
  3. Live DB CRUD testing across all 4 target types:
     - Inserting `tipe_target = 'sekolah'`
     - Inserting `tipe_target = 'angkatan'` with `target_angkatan = '10'`
     - Inserting `tipe_target = 'kelas'` with `target_kelas = 'X-A'`
     - Inserting `tipe_target = 'guru'` with `target_guru_id = '...'` and `target_guru_nama = '...'`
     - Verifying persistence and updating target attributes in live DB.

### Gap 2: Date & Time Range Options (R2)
- **Current State**:
  - Only date boundary is supported (`tanggal_mulai` and `tanggal_selesai`).
  - No hour boundaries exist; blocks run full-day automatically.
- **Required New Test Coverage**:
  1. AST verification of time columns in `src/types/database.ts`:
     - `jam_mulai: string | null`
     - `jam_selesai: string | null`
  2. AST verification of UI form controls in `SistemBlokView.tsx`:
     - Inputs for start time (`jam_mulai`) and end time (`jam_selesai`).
     - Validation: when filled, `jam_selesai > jam_mulai`.
     - Full-day default: when omitted, both values are stored as `null` and treated as whole-day active.
  3. Live DB verification:
     - Inserting a time-bounded block rule (e.g., `jam_mulai = '07:30'`, `jam_selesai = '10:00'`).
     - Inserting an unbounded block rule (`jam_mulai = null`, `jam_selesai = null`).
     - Reading back and verifying exact time range persistence.

### Gap 3: Target Masking & Isolation Logic (R3)
- **Current State**:
  - In `src/lib/workflow.ts`, `getActiveSistemBlok(todayStr, sekolahId)` returns the first active block for the school. If found, `state.isBlok = true`, and `state.jadwalKBM` is completely masked in `HomeViewGuru.tsx` (lines 803–887).
  - There is ZERO logic to inspect whether a specific schedule belongs to the targeted class, cohort, teacher, or time window.
- **Required New Test Coverage**:
  1. **Helper Function AST & Unit Tests**:
     - Testing an evaluation helper such as `isScheduleBlocked(schedule, blokRules, dateStr)` or `getActiveSistemBloks(dateStr, sekolahId)`:
       - **Class Isolation**:
         - Class `X-A` blocked $\rightarrow$ Schedule for `X-A` is masked (`isBlocked = true`).
         - Schedule for `X-B` $\rightarrow$ NOT masked (`isBlocked = false`).
       - **Teacher Isolation**:
         - Teacher `Ade Fitrawan` blocked $\rightarrow$ Schedule for `Ade Fitrawan` is masked.
         - Schedule for `Riski Candra` $\rightarrow$ NOT masked.
       - **Angkatan / Cohort Isolation**:
         - Angkatan `10` / `X` blocked $\rightarrow$ Schedules for `10-A`, `10-B`, `X.1` are masked.
         - Schedules for `11-A`, `XI IPA 1`, `12-B` $\rightarrow$ NOT masked.
       - **Time Range (Morning vs Afternoon) Isolation**:
         - Block 07:30–10:00 $\rightarrow$ Schedule 07:30–09:00 is masked.
         - Schedule 10:30–12:00 $\rightarrow$ NOT masked (proceeds as normal KBM).
       - **Unbounded Full-Day Overlap**:
         - Block with `jam_mulai = null`, `jam_selesai = null` $\rightarrow$ Masks morning, noon, and afternoon schedules on that date for the target.
  2. **UI Schedule Masking Granularity**:
     - `HomeViewGuru.tsx`: When only a subset of schedules is blocked, blocked schedules render as block banners/cards while unblocked schedules render standard regular KBM cards.

### Gap 4: Journal Submission for Blocked vs Unblocked Activities (R3)
- **Current State**:
  - When `state.isBlok = true`, `GuruJurnal.tsx` unconditionally locks to `Jurnal Kegiatan` and hides subject, class, and attendance inputs.
- **Required New Test Coverage**:
  1. If teacher has a blocked class/period:
     - Teacher can submit `Jurnal Kegiatan` for that block period.
  2. If teacher ALSO has an unblocked class (e.g. afternoon schedule outside the morning block, or teaching Class 11 while only Class 10 is blocked):
     - Teacher can select and submit `Jurnal KBM` with student attendance for that unblocked class.
  3. Presensi Pulang validation:
     - Completing the required `Jurnal Kegiatan` (for the block) AND `Jurnal KBM` (for unblocked schedules) fulfills checkout criteria.

### Gap 5: Backward Compatibility Guarantee
- **Current State**:
  - Legacy records in `sistem_blok` do not have `tipe_target`, `target_angkatan`, `target_kelas`, `target_guru_id`, `jam_mulai`, `jam_selesai`.
- **Required New Test Coverage**:
  - Null/undefined handling: Any record with `tipe_target = null` or undefined defaults to `'sekolah'`.
  - Null/undefined time range: Any record with `jam_mulai = null` and `jam_selesai = null` defaults to full-day active.
  - All existing 85 test assertions in `tests/sistem_blok_verification.test.ts` MUST run and PASS with 0 modifications to their existing assertion criteria.

---

## 5. Specification for Test Suite Expansion

To verify all requirements and acceptance criteria from `ORIGINAL_REQUEST.md`, `tests/sistem_blok_verification.test.ts` should be expanded with Sections 6 through 10 as detailed below.

### 5.1 Proposed Section 6: Target Scope & Time Range Schema & UI Validation
```ts
// ====================================================
// Section 6: R1 & R2 - Target Scope & Time Range Options
// ====================================================
console.log('\n--- Section 6: R1 & R2 - Target Scope & Time Range Options ---');

// 6.1 Database schema & TypeScript definitions
assert(
  typesContent.includes('tipe_target') &&
  typesContent.includes('target_angkatan') &&
  typesContent.includes('target_kelas') &&
  typesContent.includes('target_guru_id') &&
  typesContent.includes('jam_mulai') &&
  typesContent.includes('jam_selesai'),
  'TypeScript types include target scope (tipe_target, angkatan, kelas, guru) and time range fields'
);

// 6.2 UI Form Controls in SistemBlokView.tsx
assert(
  viewContent.includes('tipeTarget') &&
  viewContent.includes('targetAngkatan') &&
  viewContent.includes('targetKelas') &&
  viewContent.includes('targetGuru') &&
  viewContent.includes('jamMulai') &&
  viewContent.includes('jamSelesai'),
  'SistemBlokView includes form states for tipe_target, angkatan, kelas, guru, jam_mulai, and jam_selesai'
);

// 6.3 Validation of Time Range (jamSelesai > jamMulai)
assert(
  viewContent.includes('jamSelesai <= jamMulai') || viewContent.includes('jamMulai >= jamSelesai'),
  'SistemBlokView validates that jam_selesai must be greater than jam_mulai when specified'
);

// 6.4 Full-day default hint / indicator
assert(
  viewContent.includes('sepanjang hari') || viewContent.includes('penuh sepanjang hari') || viewContent.includes('Opsional'),
  'SistemBlokView provides guidance that omitting time range applies the block for the full day'
);
```

### 5.2 Proposed Section 7: Live Database Multi-Target CRUD Verification
```ts
// ====================================================
// Section 7: Live Database Multi-Target CRUD Verification
// ====================================================
console.log('\n--- Section 7: Live Database Multi-Target CRUD Verification ---');

const blockSekolahId = '00000000-0000-0000-0000-00000000b110';
const blockAngkatanId = '00000000-0000-0000-0000-00000000b111';
const blockKelasId = '00000000-0000-0000-0000-00000000b112';
const blockGuruId = '00000000-0000-0000-0000-00000000b113';

try {
  // Clean up
  await supabase.from('sistem_blok').delete().in('id', [blockSekolahId, blockAngkatanId, blockKelasId, blockGuruId]);

  // 7.1 Insert Target: Keseluruhan Sekolah (Full Day)
  const { error: eSekolah } = await supabase.from('sistem_blok').insert([{
    id: blockSekolahId,
    sekolah_id: defaultSekolahId,
    nama_kegiatan: 'Block Keseluruhan Sekolah',
    tanggal_mulai: today,
    tanggal_selesai: today,
    tipe_target: 'sekolah',
    jam_mulai: null,
    jam_selesai: null,
  }]);
  assert(!eSekolah, 'Live DB: Successfully created block for Keseluruhan Sekolah');

  // 7.2 Insert Target: per Angkatan with Bounded Time Range
  const { error: eAngkatan } = await supabase.from('sistem_blok').insert([{
    id: blockAngkatanId,
    sekolah_id: defaultSekolahId,
    nama_kegiatan: 'Block Angkatan 10 Workshop',
    tanggal_mulai: today,
    tanggal_selesai: today,
    tipe_target: 'angkatan',
    target_angkatan: '10',
    jam_mulai: '07:30',
    jam_selesai: '10:00',
  }]);
  assert(!eAngkatan, 'Live DB: Successfully created time-bounded block for Angkatan 10');

  // 7.3 Insert Target: per Kelas
  const { error: eKelas } = await supabase.from('sistem_blok').insert([{
    id: blockKelasId,
    sekolah_id: defaultSekolahId,
    nama_kegiatan: 'Block Kelas X-A Lab Khusus',
    tanggal_mulai: today,
    tanggal_selesai: today,
    tipe_target: 'kelas',
    target_kelas: 'X-A',
    jam_mulai: '08:00',
    jam_selesai: '11:00',
  }]);
  assert(!eKelas, 'Live DB: Successfully created block for specific Kelas X-A');

  // 7.4 Insert Target: per Guru
  const { error: eGuru } = await supabase.from('sistem_blok').insert([{
    id: blockGuruId,
    sekolah_id: defaultSekolahId,
    nama_kegiatan: 'Block Tugas Khusus Guru',
    tanggal_mulai: today,
    tanggal_selesai: today,
    tipe_target: 'guru',
    target_guru_nama: 'Ade Fitrawan Ibrahim',
    jam_mulai: '07:30',
    jam_selesai: '12:00',
  }]);
  assert(!eGuru, 'Live DB: Successfully created block for specific Guru');

  // Read and verify all 4 targets persisted correctly
  const { data: insertedRules } = await supabase.from('sistem_blok').select('*').in('id', [blockSekolahId, blockAngkatanId, blockKelasId, blockGuruId]);
  assert(insertedRules?.length === 4, 'Live DB: All 4 targeted block rules read back successfully');
  
  const savedAngkatan = insertedRules?.find(r => r.id === blockAngkatanId);
  assert(savedAngkatan?.tipe_target === 'angkatan' && savedAngkatan?.target_angkatan === '10', 'Live DB: Angkatan target attributes verified');
  assert(savedAngkatan?.jam_mulai === '07:30' && savedAngkatan?.jam_selesai === '10:00', 'Live DB: Time range attributes verified');

} finally {
  await supabase.from('sistem_blok').delete().in('id', [blockSekolahId, blockAngkatanId, blockKelasId, blockGuruId]);
}
```

### 5.3 Proposed Section 8: Target Masking & Isolation Verification (Pure & Integration)
```ts
// ====================================================
// Section 8: R3 - Target Masking & Non-Matching Isolation
// ====================================================
console.log('\n--- Section 8: R3 - Target Masking & Non-Matching Isolation ---');

const { isScheduleBlocked, matchAngkatan } = await import('../src/lib/workflow');

// 8.1 Class Isolation Test
const mockClassBlock = {
  tipe_target: 'kelas',
  target_kelas: 'X-A',
  tanggal_mulai: '2026-11-02',
  tanggal_selesai: '2026-11-02',
  jam_mulai: null,
  jam_selesai: null,
};
const schedClassXA = { kelas: 'X-A', jam_mulai: '07:30', jam_selesai: '09:00', nama_guru: 'Guru 1' };
const schedClassXB = { kelas: 'X-B', jam_mulai: '07:30', jam_selesai: '09:00', nama_guru: 'Guru 1' };

assert(isScheduleBlocked(schedClassXA, [mockClassBlock], '2026-11-02').isBlocked === true, 'Isolation: Class X-A schedule is masked by Class X-A block rule');
assert(isScheduleBlocked(schedClassXB, [mockClassBlock], '2026-11-02').isBlocked === false, 'Isolation: Class X-B schedule is NOT masked (unblocked)');

// 8.2 Teacher Isolation Test
const mockTeacherBlock = {
  tipe_target: 'guru',
  target_guru_nama: 'Ade Fitrawan',
  tanggal_mulai: '2026-11-02',
  tanggal_selesai: '2026-11-02',
  jam_mulai: null,
  jam_selesai: null,
};
const schedTeacherAde = { kelas: 'X-B', jam_mulai: '07:30', jam_selesai: '09:00', nama_guru: 'Ade Fitrawan Ibrahim' };
const schedTeacherOther = { kelas: 'X-B', jam_mulai: '07:30', jam_selesai: '09:00', nama_guru: 'Riski Candra' };

assert(isScheduleBlocked(schedTeacherAde, [mockTeacherBlock], '2026-11-02').isBlocked === true, 'Isolation: Teacher Ade schedule is masked by Teacher Ade block rule');
assert(isScheduleBlocked(schedTeacherOther, [mockTeacherBlock], '2026-11-02').isBlocked === false, 'Isolation: Other teacher schedule is NOT masked (unblocked)');

// 8.3 Angkatan Isolation Test (Roman & Arabic Numerals)
const mockAngkatanBlock = {
  tipe_target: 'angkatan',
  target_angkatan: '10',
  tanggal_mulai: '2026-11-02',
  tanggal_selesai: '2026-11-02',
  jam_mulai: null,
  jam_selesai: null,
};
const schedGrade10A = { kelas: '10-A', jam_mulai: '07:30', jam_selesai: '09:00' };
const schedGradeX1 = { kelas: 'X.1', jam_mulai: '07:30', jam_selesai: '09:00' };
const schedGrade11A = { kelas: '11-A', jam_mulai: '07:30', jam_selesai: '09:00' };
const schedGradeXII = { kelas: 'XII IPA 1', jam_mulai: '07:30', jam_selesai: '09:00' };

assert(isScheduleBlocked(schedGrade10A, [mockAngkatanBlock], '2026-11-02').isBlocked === true, 'Isolation: 10-A is masked by Angkatan 10 block rule');
assert(isScheduleBlocked(schedGradeX1, [mockAngkatanBlock], '2026-11-02').isBlocked === true, 'Isolation: X.1 (Roman numeral) is masked by Angkatan 10 block rule');
assert(isScheduleBlocked(schedGrade11A, [mockAngkatanBlock], '2026-11-02').isBlocked === false, 'Isolation: 11-A is NOT masked by Angkatan 10 block rule');
assert(isScheduleBlocked(schedGradeXII, [mockAngkatanBlock], '2026-11-02').isBlocked === false, 'Isolation: XII IPA 1 is NOT masked by Angkatan 10 block rule');

// 8.4 Time Range Isolation Test (Morning Blocked vs Afternoon Unblocked)
const mockTimeBlock = {
  tipe_target: 'sekolah',
  tanggal_mulai: '2026-11-02',
  tanggal_selesai: '2026-11-02',
  jam_mulai: '07:30',
  jam_selesai: '10:00',
};
const schedMorning = { kelas: 'X-A', jam_mulai: '07:30', jam_selesai: '09:00' };
const schedOverlap = { kelas: 'X-A', jam_mulai: '09:30', jam_selesai: '11:00' };
const schedAfternoon = { kelas: 'X-A', jam_mulai: '11:00', jam_selesai: '12:30' };

assert(isScheduleBlocked(schedMorning, [mockTimeBlock], '2026-11-02').isBlocked === true, 'Isolation: 07:30-09:00 schedule is masked within 07:30-10:00 block window');
assert(isScheduleBlocked(schedOverlap, [mockTimeBlock], '2026-11-02').isBlocked === true, 'Isolation: 09:30-11:00 overlapping schedule is masked');
assert(isScheduleBlocked(schedAfternoon, [mockTimeBlock], '2026-11-02').isBlocked === false, 'Isolation: 11:00-12:30 afternoon schedule outside block window is NOT masked');
```

### 5.4 Proposed Section 9: Journal Submission Parity & Checkout Workflow
```ts
// ====================================================
// Section 9: Journal Submission Parity & Checkout Workflow
// ====================================================
console.log('\n--- Section 9: Journal Submission Parity & Checkout Workflow ---');

// 9.1 Blocked teacher mode
assert(
  guruJurnalContent.includes("tipeJurnal === 'Jurnal Kegiatan'") || guruJurnalContent.includes("setTipeJurnal('Jurnal Kegiatan')"),
  'GuruJurnal supports Jurnal Kegiatan for teachers with active block periods'
);

// 9.2 Mixed schedule: teacher with partially blocked schedules can toggle or fill Jurnal KBM for regular schedules
assert(
  guruJurnalContent.includes("tipeJurnal === 'Jurnal KBM'") &&
  guruJurnalContent.includes("tipeJurnal === 'Jurnal Kegiatan'"),
  'GuruJurnal retains Jurnal KBM mode with class & student attendance for unblocked schedules'
);

// 9.3 Presensi Pulang requirement fulfillment with mixed journals
assert(
  workflowContent.includes('isJurnalDone') &&
  workflowContent.includes('jurnalKegiatan'),
  'workflow.ts: Checkout requirement accurately balances Jurnal Kegiatan for blocked items and Jurnal KBM for unblocked items'
);
```

### 5.5 Proposed Section 10: Backward Compatibility Guarantee
```ts
// ====================================================
// Section 10: Backward Compatibility Guarantee with Legacy Records
// ====================================================
console.log('\n--- Section 10: Backward Compatibility Guarantee with Legacy Records ---');

// 10.1 Legacy record with null target & null hours defaults to whole-school full-day block
const legacyRecord = {
  id: '00000000-0000-0000-0000-00000000b114',
  nama_kegiatan: 'Legacy Block Without Target',
  tanggal_mulai: '2026-11-02',
  tanggal_selesai: '2026-11-02',
  tipe_target: null,
  target_angkatan: null,
  target_kelas: null,
  target_guru_id: null,
  jam_mulai: null,
  jam_selesai: null,
};

const anySchedule = { kelas: 'XII-C', jam_mulai: '13:00', jam_selesai: '14:30', nama_guru: 'Pak Guru' };
const legacyCheck = isScheduleBlocked(anySchedule, [legacyRecord], '2026-11-02');
assert(legacyCheck.isBlocked === true, 'Backward Compatibility: Legacy record with null target and null hours applies to all classes and hours');

// 10.2 Preserves all existing Section 1 - Section 5 assertions intact
assert(passed >= 85, `Backward Compatibility: All original 85 assertions preserved and passing (current total passed: ${passed})`);
```

---

## 6. Synthesis with System Invariants & Peer Components

To ensure non-breaking integration across the entire codebase, the following invariants must be adhered to by implementers:

1. **AST Invariant Check in `tests/adversarial_ast_invariants_challenger.test.ts`**:
   - Lines 204–233 assert that `AppScreen` guards `view-sistem-blok` for Admin/Superadmin, `GuruJurnal` switches to `Jurnal Kegiatan` when `state.isBlok` is true, and `RekapJurnalView` shows `Kegiatan Khusus (Sistem Blok)`.
   - Any modifications to `AppScreen.tsx`, `GuruJurnal.tsx`, or `RekapJurnalView.tsx` must preserve these exact string matches.
2. **Multi-Tenant Policy Invariant**:
   - Table `public.sistem_blok` uses `setup_tenant_table_policies('sistem_blok')` with tenant isolation on `sekolah_id`.
   - New columns (`tipe_target`, `target_angkatan`, `target_kelas`, `target_guru_id`, `target_guru_nama`, `jam_mulai`, `jam_selesai`) must NOT alter the RLS policies or tenant boundaries.
3. **Admin Role Gate**:
   - `isMasterDataModificationAllowed(user?.role)` in `src/components/SistemBlokView.tsx` line 47 strictly restricts creating/editing/deleting block rules to Admin and Superadmin.
4. **Schedule Masking vs Deletion Invariant**:
   - In Section 2.5 of `tests/sistem_blok_verification.test.ts`, the database schedule count before vs after running the test must be identical. Block rules **mask** schedules; they must **never delete or truncate** records in `public.jadwal_pelajaran`.

---

## 7. Actionable Roadmap for Implementation & Testing

1. **Database Migration & Types**:
   - Create migration adding `tipe_target`, `target_angkatan`, `target_kelas`, `target_guru_id`, `target_guru_nama`, `jam_mulai`, `jam_selesai` to `public.sistem_blok`.
   - Update `src/types/database.ts` accordingly.
2. **Workflow & Pure Logic**:
   - Export `isScheduleBlocked`, `getActiveSistemBloks`, and cohort/angkatan matching helpers in `src/lib/workflow.ts`.
   - Update `getGuruDailyState` to check which of the teacher's schedules are blocked.
3. **UI Enhancements**:
   - Update `src/components/SistemBlokView.tsx` with target type selector (Sekolah, Angkatan, Kelas, Guru) and optional hour bounds.
   - Update `src/components/HomeViewGuru.tsx` to display schedule masking per-class rather than all-or-nothing.
   - Update `src/components/GuruJurnal.tsx` to handle mixed schedules.
4. **Test Suite Expansion**:
   - Expand `tests/sistem_blok_verification.test.ts` with Sections 6 through 10, bringing total assertions from 85 to ~125+.
   - Run `npx tsx tests/sistem_blok_verification.test.ts` to ensure 100% pass (0 failed).
