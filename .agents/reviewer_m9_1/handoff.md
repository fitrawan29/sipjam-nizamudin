# Reviewer 1 (reviewer_m9_1) Handoff Report

## Review Summary

**Verdict**: **REQUEST_CHANGES**
**Overall Risk Assessment**: **HIGH**

Although the majority of Milestone 9 features (R1, R2 real-time chat, R3 Jurnal Kelas RBAC, R4 attendance configuration & workflow, R5 live camera enforcement) have been implemented cleanly with high quality, an empirical runtime defect was discovered in the automated push reminder service (`/api/push/send-reminders/route.ts`) that breaks the Datang attendance reminder check due to a database schema mismatch.

---

## Findings

### [Critical] Finding 1: Database Column Schema Mismatch in `/api/push/send-reminders/route.ts`
- **Tag**: BUG / REGRESSION / INSUFFICIENT VERIFICATION
- **Location**: `src/app/api/push/send-reminders/route.ts`, lines 55–65
- **Observation**:
  `checkMissingTasks` attempts to fetch Datang attendance for today using:
  ```typescript
  // C. Fetch presensi for today (Datang)
  let presensiQuery = supabase
    .from('presensi_guru')
    .select('*')
    .eq('tanggal', todayStr)
    .eq('jenis', 'Datang');
  ```
  However, in `src/types/database.ts` (lines 936–950) and live Supabase schema, the table `public.presensi_guru` does **NOT** contain a `tanggal` column nor a `jenis` column. Instead, it stores the datetime in `timestamp` (e.g. `2026-09-18 07:15:00`) and the check-in type in `tipe_absen` (`'Datang'` | `'Pulang'`).
- **Verbatim Error from Live Database**:
  ```json
  {
    "code": "42703",
    "details": null,
    "hint": null,
    "message": "column presensi_guru.tanggal does not exist"
  }
  ```
- **Impact**:
  Because Supabase returns error 42703 and `data: null`, `presensiList` is null and `checkedInSet` remains empty. As a result, **every single teacher** (unless exempt without teaching schedules) is evaluated as having NOT checked in (`hasCheckedIn = false`). The system generates false-positive push alerts for teachers who already completed their morning presensi!
- **Verification Inadequacy in m9_4 Test**:
  In `tests/m9_4_chat_and_notifications.test.ts` (Step 8, line 293), `checkMissingTasks` was executed against an isolated school ID containing 0 teachers. Because the teacher loop was never entered, this SQL error was masked during the test suite execution.
- **Required Fix**:
  Update `src/app/api/push/send-reminders/route.ts` lines 55–61 to:
  ```typescript
  let presensiQuery = supabase
    .from('presensi_guru')
    .select('*')
    .ilike('timestamp', `${todayStr}%`)
    .eq('tipe_absen', 'Datang');
  ```
  (Matching the pattern used in `HomeView.tsx` and `workflow.ts`).

---

## 5-Component Handoff Report

### 1. Observation
1. **TypeScript Typecheck**:
   `npx tsc --noEmit` exited with code 0 (0 compilation errors).
2. **Production Build**:
   `npm run build` compiled successfully via Next.js Turbopack in 1280ms, generating all static and dynamic routes including `/api/push/send-reminders`.
3. **Database & Type Verification (`tests/m9_1_database_and_types.test.ts`)**:
   All 17 tests passed. `public.chat_messages`, `public.pengumuman_dibaca`, `jam_pulang_jumat`, `guru_hanya_mengajar`, and `wajib_hadir_hanya_mengajar` are live in Supabase.
4. **M2 & M3 Verification (`tests/m9_2_3_verification.test.ts`)**:
   All 20 tests passed. RBAC in `AppScreen.tsx` and `RekapJurnalView.tsx` correctly enforces Wali Kelas restrictions. `AdminConfigView.tsx` and `workflow.ts` correctly manage teacher exemptions and Friday checkout.
5. **M9.4 Chat & Notifications Test (`tests/m9_4_chat_and_notifications.test.ts`)**:
   All 44 tests passed. Realtime chat inserts real rows, read receipts function, bell shake animation is configured.
6. **Empirical Direct Database Execution**:
   Running a live query against `public.presensi_guru`:
   ```javascript
   supabase.from('presensi_guru').select('*').eq('tanggal', '2026-09-18').eq('jenis', 'Datang')
   ```
   Directly returned error code `42703`: `column presensi_guru.tanggal does not exist`.
   Running the correct query:
   ```javascript
   supabase.from('presensi_guru').select('*').ilike('timestamp', '2026-09-18%').eq('tipe_absen', 'Datang')
   ```
   Directly returned `data: []` with 0 errors.

### 2. Logic Chain
1. Requirement R2 mandates Web Push Notifications via Service Worker and push reminders API (`/api/push/send-reminders`) to alert teachers who have not completed presensi, journals, or piket.
2. In `/api/push/send-reminders/route.ts`, `checkMissingTasks` queries `presensi_guru` filtering by `.eq('tanggal', todayStr).eq('jenis', 'Datang')`.
3. Inspection of `src/types/database.ts` (lines 936–950) and live database metadata proves `presensi_guru` has no `tanggal` or `jenis` column.
4. Supabase client fails the query with PostgreSQL error `42703: column presensi_guru.tanggal does not exist`.
5. Because `data` is `null`, `checkedInSet` is empty (`size: 0`).
6. All teachers are therefore classified as `hasCheckedIn: false`, generating false notifications.
7. Therefore, the implementation contains a critical defect and cannot be approved until corrected.

### 3. Caveats
- No other blocking defects were found in R1, R2 (chat/bell/prompt), R3, R4, or R5.
- The unit and integration tests passed because Step 8 of `m9_4` tested an empty school ID without active teachers, masking the query failure.

### 4. Conclusion
The implementation is 95% complete and of exceptionally high quality across the user interface, database migrations, and security layers. However, the database column naming mismatch in `/api/push/send-reminders/route.ts` directly impairs the automated reminder service.
**Verdict: REQUEST_CHANGES**. Remediation of lines 55–61 in `src/app/api/push/send-reminders/route.ts` is required before final acceptance.

### 5. Verification Method
1. Inspect `src/app/api/push/send-reminders/route.ts` lines 55–65.
2. Run live query check via Node:
   ```bash
   node -e "const { createClient } = require('@supabase/supabase-js'); require('dotenv').config({ path: '.env.local' }); const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); s.from('presensi_guru').select('*').ilike('timestamp', '2026-09-18%').eq('tipe_absen', 'Datang').then(r => console.log('Fixed Query Status:', r.error || 'SUCCESS'));"
   ```
3. Test API route dry-run:
   `GET http://localhost:3000/api/push/send-reminders?dry_run=true`
4. Confirm `npx tsc --noEmit` and `npm run build` remain clean.

---

## Detailed Review by Requirement

| Req | Description | Status | Evidence & Notes |
|---|---|---|---|
| **R1.1** | Academic Year sync from `pengaturan` to Guru GradebookView | **PASS** | `GradebookView.tsx` lines 121–155 fetch `pengaturan.tahun_ajaran` and sync `selectedTahunAjaran`. Locked with lock icon for Guru in lines 1508–1511. |
| **R1.2** | Admin view-only lock on Gradebook (only 'Cetak' button) | **PASS** | `GradebookView.tsx` lines 1560–1585 hide CSV and Save buttons for Admin; lines 1951–2035 render plain text `<span>` instead of inputs; mutation handlers check `if (isAdmin)` and reject. |
| **R1.3** | TP management restricted to `isGuruPengampu` | **PASS** | `GradebookView.tsx` lines 289–363 resolve `isGuruPengampu` against `guru_mapel` and `jadwal_pelajaran`. TP/Column CRUD buttons only render when `isGuruPengampu === true`. Handlers enforce `!isGuruPengampu` rejection with Swal alert. |
| **R2.1** | Navbar broadcast bell with shake animation & red badge | **PASS** | `globals.css` lines 384–399 define `@keyframes bell-shake` and `.animate-bell-shake`. `AppScreen.tsx` line 363 applies animation and renders red unread count badge (with `99+` cap). Realtime subscriptions on `pengumuman` and `pengumuman_dibaca`. |
| **R2.2** | Real-time teacher chat via Supabase Realtime | **PASS** | `ChatView.tsx` subscribes to `postgres_changes` on `public.chat_messages`, inserts real messages, updates stream instantly without page reload, and tracks unread count per colleague. |
| **R2.3** | Web Push service worker & push reminders API | **DEFECT** | `public/sw.js` and `PushNotificationPrompt.tsx` function as intended. However, `/api/push/send-reminders/route.ts` contains column name mismatch (`tanggal` vs `timestamp`, `jenis` vs `tipe_absen`). |
| **R3** | Jurnal Kelas RBAC (Admin & Wali Kelas exclusive) | **PASS** | `AppScreen.tsx` lines 248–258 & 449–470 restrict navigation and render access denied fallback. `RekapJurnalView.tsx` lines 301–326 hide class journal mode for regular teachers and restrict Wali Kelas to assigned classes only. |
| **R4.1** | Admin attendance settings (Friday checkout & exceptions) | **PASS** | `AdminConfigView.tsx` lines 22, 440–454 provide input for `jam_pulang_jumat` (default 11:00). Lines 350–430 provide interactive teacher exception selector with search and toggle. Saves to `pengaturan.guru_hanya_mengajar` and updates `data_guru.wajib_hadir_hanya_mengajar`. |
| **R4.2** | Workflow calculation logic | **PASS** | `workflow.ts` lines 195–233 check both exemption sources. If exempt and not teaching today: sets `isNonTeachingDay = true`, `bebasAlpa = true`, `isAlpa = false`. Non-exempt teachers default to daily attendance. |
| **R4.3** | Friday checkout time enforcement | **PASS** | `GuruPresensi.tsx` lines 215–222 dynamically use `jam_pulang_jumat` when `getWitaDayName(now) === 'Jumat'` and display warning if checkout attempted before opening. |
| **R5.1** | Direct camera enforcement in Presensi Pulang, Jurnal, Piket | **PASS** | `GuruPresensi.tsx`, `GuruJurnal.tsx`, and `PiketView.tsx` embed `<CameraSelfieCapture>` directly. |
| **R5.2** | Removal of `<input type="file">` for photos | **PASS** | `<input type="file">` is completely removed from `GuruJurnal.tsx` and `PiketView.tsx`. In `GuruPresensi.tsx`, it only exists for doctor sick letters under Izin Datang. |
| **R5.3** | Camera front/rear toggle support | **PASS** | `CameraSelfieCapture.tsx` supports `facingMode: 'user' \| 'environment'` toggle, mirrors front camera via CSS and canvas, and unmirrors rear camera. |

---

## Adversarial Challenge & Stress-Test Results

1. **Adversarial Input: Unsaved Grades on Tab Switch / Unload**
   - *Scenario*: Teacher inputs grades in TP Matrix, then switches tabs or navigates away without saving.
   - *Result*: `GradebookView.tsx` displays warning badge (`${unsavedCount} perubahan belum disimpan`) and prompts with dirty state tracking.
   - *Status*: **PASS**

2. **Adversarial Input: Camera Permission Denial**
   - *Scenario*: Teacher explicitly denies browser camera permission.
   - *Result*: `CameraSelfieCapture.tsx` intercepts `NotAllowedError` and renders descriptive Indonesian message with retry button without crashing the view.
   - *Status*: **PASS**

3. **Adversarial Input: Multi-tenant Data Leak in Chat**
   - *Scenario*: School A teacher receives a Realtime event for a message sent within School B.
   - *Result*: `ChatView.tsx` lines 189–192 enforce tenant guard:
     `if (user?.sekolah_id && newMsg.sekolah_id && newMsg.sekolah_id !== user.sekolah_id) return;`
   - *Status*: **PASS**

4. **Adversarial Input: Bypass Jurnal Kelas via Direct Client State Manipulation**
   - *Scenario*: Non-Wali teacher alters state to `currentView = 'view-jurnal-kelas'`.
   - *Result*: `AppScreen.tsx` lines 450–470 re-verify `isAdmin || isWaliKelas` in JSX rendering and render the locked shield view with "Akses Terblokir". Furthermore, `RekapJurnalView.tsx` lines 124–129 abort `tarikRekap` if non-Wali attempts to query class records.
   - *Status*: **PASS**

5. **Adversarial Input: Presensi Datang Push Reminder Execution with Real Teachers**
   - *Scenario*: Execute `checkMissingTasks` with real teachers present in database.
   - *Result*: Database query crashes with `42703: column presensi_guru.tanggal does not exist`.
   - *Status*: **FAIL (Critical Finding 1)**
