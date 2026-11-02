# Handoff Report — Explorer Survey 3: Test Suite & Verification for Sistem Blok

- **Author**: Explorer 3 (`explorer_survey_3`)
- **Target Audience**: Orchestrator, Planner, Implementer, Test Writer
- **Scope**: Exploration of `tests/sistem_blok_verification.test.ts`, test runner mechanics, existing test coverage, and test expansion design for flexible target scopes, date/time ranges, masking isolation, and journal submission.
- **Reference Document**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\ORIGINAL_REQUEST.md` (2026-11-02T12:24:20Z)

---

## 1. Observation

### 1.1 Test Infrastructure & Execution Command
- **Test Command**: Tests in this repository are executed using `tsx` directly.
  - In `package.json` line 10:
    ```json
    "test": "... && tsx tests/sistem_blok_verification.test.ts && ..."
    ```
- **Direct CLI Execution**:
  ```bash
  npx tsx tests/sistem_blok_verification.test.ts
  ```
- **Execution Output on Baseline Codebase**:
  ```
  TOTAL TESTS: 85
  PASSED: 85
  FAILED: 0
  🎉 ALL SISTEM BLOK VERIFICATION TESTS PASSED!
  ```
  Execution duration: ~8.2 seconds.
- **Related Test Invariant Check**:
  - `npx tsx tests/adversarial_ast_invariants_challenger.test.ts` (Section 3: lines 202–233) verifies AST invariants for `sistem_blok` role guards, `GuruJurnal` auto-switching, and `RekapJurnalView` mapel labeling.
  - Result: `TOTAL 37 | PASSED: 37 | FAILED: 0`.

### 1.2 Structure of `tests/sistem_blok_verification.test.ts`
- Total Lines: 614 lines.
- Authentication & Tenant Context (lines 29–48):
  - Injects `sekolahId = 'a0000000-0000-0000-0000-000000000001'`, `role = 'Admin'`, `userId = 'd23141e4-2116-4946-8094-895ef21a50e5'` with verified session token from `verify_login`.
- **Existing Sections**:
  - **Section 1 (lines 97–224)**: R1 - Manajemen Sistem Blok (CRUD) & Schema. Static AST checks for types, form inputs (`namaKegiatan`, `tanggalMulai`, `tanggalSelesai`, `deskripsi`), chronological validation (`tanggalSelesai < tanggalMulai`), and live DB CRUD execution on `public.sistem_blok` with test ID `00000000-0000-0000-0000-00000000b10c`.
  - **Section 2 (lines 225–284)**: R2 - Penyesuaian Tampilan Jadwal & Masking. Calls `workflow.getActiveSistemBlok(today)` (line 231), verifies `jadwal_pelajaran` count is completely unchanged (lines 245, 280), checks HomeView masking banner AST.
  - **Section 3 (lines 285–368)**: R3 - Jurnal Kegiatan Guru. Verifies `GuruJurnal.tsx` auto-selects `Jurnal Kegiatan` when `state.isBlok` is true, hides KBM fields, and verifies 1 Jurnal Kegiatan fulfills Presensi Pulang requirement in `workflow.ts` (lines 327–335). Cleans up test DB record.
  - **Section 4 (lines 369–402)**: R4 - Zero new npm dependencies and Tailwind CSS tokens (`glass-card`, `input-premium`, `btn-click`).
  - **Section 5 (lines 403–591)**: Adversarial Edge Cases:
    - 5.1 Multi-tenant isolation (School A vs School B).
    - 5.2 Single-day block (`tanggal_mulai == tanggal_selesai`).
    - 5.3 Exempt teacher obligation (`wajib_hadir_hanya_mengajar`).
    - 5.4 Push Reminder Cron (`/api/push/send-reminders/route.ts`).
    - 5.5 Disciplinary warning system (`warningSystem.ts`).
    - 5.6 Date sanitization (`sanitizeDateStr`, `getBlokStatus`).
    - 5.7 Cross-month, cross-year, leap year calculations (`getBlokDurationDays`).
    - 5.8 `PiketView` tenant retention.
    - 5.9 Jurnal Kegiatan display in `AdminVerifView`, `HistoryView`, `RekapJurnalView`.

### 1.3 Database Schema & Types
- `supabase/migrations/20260927_sistem_blok_schema.sql` (lines 6–15) and `src/types/database.ts` (lines 1411–1450):
  ```sql
  CREATE TABLE IF NOT EXISTS public.sistem_blok (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
      nama_kegiatan TEXT NOT NULL,
      deskripsi TEXT DEFAULT NULL,
      tanggal_mulai DATE NOT NULL,
      tanggal_selesai DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ```
- **Finding**: Table currently lacks target attributes (`tipe_target`, `target_angkatan`, `target_kelas`, `target_guru_id`, `target_guru_nama`) and time boundaries (`jam_mulai`, `jam_selesai`).

### 1.4 Workflow & Masking Logic
- In `src/lib/workflow.ts` lines 69–92:
  ```ts
  export async function getActiveSistemBlok(dateStr?: string, sekolahId?: string): Promise<any | null>
  ```
  Queries `sistem_blok` where `tanggal_mulai <= targetDate AND tanggal_selesai >= targetDate` and returns `data[0]`.
- In `src/lib/workflow.ts` lines 245–256:
  Sets `state.isBlok = true` unconditionally if `activeBlok` is returned.
- In `src/components/HomeViewGuru.tsx` lines 849–887:
  If `dailyState?.isBlok` is true, all schedules in `jadwalKBM` are replaced by the block activity banner.

---

## 2. Logic Chain

1. **Current Test Limitation (from Observation 1.2 & 1.3)**:
   - `tests/sistem_blok_verification.test.ts` currently verifies ONLY whole-school, whole-day block periods because the underlying schema and components only supported `nama_kegiatan`, `tanggal_mulai`, `tanggal_selesai`.
2. **New Requirements Mandate (from ORIGINAL_REQUEST.md)**:
   - Users require 4 target scopes: Keseluruhan Sekolah, per Angkatan, per Kelas, per Guru.
   - Users require optional time ranges (`jam_mulai` and `jam_selesai`) where omitting hours defaults to full-day active.
   - Users require strict schedule masking isolation: schedules matching the target & time window are masked; schedules outside the target or outside the time window remain regular KBM.
   - Users require journal submission capability: teachers affected by a block submit `Jurnal Kegiatan`; teachers with regular KBM submit `Jurnal KBM`.
3. **Test Suite Expansion Design**:
   - To prove fulfillment of the acceptance criteria without breaking existing tests, `tests/sistem_blok_verification.test.ts` must be extended with:
     - **Section 6**: Target scope & time range AST validation in `types/database.ts` and `SistemBlokView.tsx`.
     - **Section 7**: Live Database CRUD on all 4 target scopes (`sekolah`, `angkatan`, `kelas`, `guru`) and time range fields.
     - **Section 8**: Schedule masking & isolation tests:
       - Class isolation (Class X-A masked vs Class X-B unmasked).
       - Teacher isolation (Target teacher masked vs other teacher unmasked).
       - Angkatan isolation (Grade 10 / X masked vs Grade 11 / XI unmasked).
       - Time range isolation (07:30–09:00 morning masked vs 11:00–12:30 afternoon unmasked).
     - **Section 9**: Dual-mode journal submission and checkout fulfillment.
     - **Section 10**: Backward compatibility guarantee (legacy records with null target & null hours default to whole-school, full-day blocks; all 85 original assertions preserved and passing).

---

## 3. Caveats

1. **Live Database vs Mock Isolation**:
   - `tests/sistem_blok_verification.test.ts` executes live queries against Supabase. Test IDs use a distinct range (`...00000000b10c`, `...00000000b110`, etc.) and are cleaned up in `finally` blocks. Implementers must ensure test records are always deleted even if an assertion fails midway.
2. **Time Parsing & 24-Hour Formats**:
   - School schedules in Indonesia operate in WITA (UTC+8) and time strings in `jadwal_pelajaran` are stored as `HH:mm` or `HH:mm:ss` (e.g., `'07:30'`, `'07:30:00'`). Time range comparison logic should normalize seconds to `HH:mm` for robust comparison.
3. **Angkatan Representation**:
   - Cohort names vary across schools: Roman numerals (`X`, `XI`, `XII` or `VII`, `VIII`, `IX`) or Arabic numerals (`10`, `11`, `12` or `7`, `8`, `9`). The isolation test must verify both Arabic and Roman representations match appropriately.

---

## 4. Conclusion

1. The test runner is `tsx` and the primary test suite is `tests/sistem_blok_verification.test.ts`. All 85 baseline tests currently pass.
2. The existing test suite provides strong coverage for legacy CRUD and whole-school masking, but completely lacks coverage for target scopes, time ranges, schedule isolation, and mixed journal submissions.
3. A comprehensive expansion specification (Sections 6 through 10, adding ~40+ assertions) has been documented in `analysis.md` and is ready for implementation by the test-writer and worker agents.
4. Backward compatibility is strictly guaranteed by designing new schema columns as nullable with safe defaults (`tipe_target DEFAULT 'sekolah'`, `jam_mulai DEFAULT NULL`, `jam_selesai DEFAULT NULL`).

---

## 5. Verification Method

To independently verify this exploration and test suite:

1. **Run Current Test Suite**:
   ```bash
   npx tsx tests/sistem_blok_verification.test.ts
   ```
   *Expected Result*: Total 85 tests, 85 passed, 0 failed.
2. **Run Invariants Challenger**:
   ```bash
   npx tsx tests/adversarial_ast_invariants_challenger.test.ts
   ```
   *Expected Result*: Total 37 tests, 37 passed, 0 failed.
3. **Inspect Specification in Analysis Report**:
   ```bash
   view_file .agents/teamwork/explorer_survey_3/analysis.md
   ```
   Verify all 4 target scopes, time boundaries, isolation matrix, and code snippets match the requirements.
