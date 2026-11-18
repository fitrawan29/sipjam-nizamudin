# Investigation Report - SIPJAM Attendance and Journal Logic

## 1. Attendance Logic
The attendance logic for "presensi datang" and "presensi pulang" is spread across:
- **API (Backend)**: `src\app\api\attendance\route.ts` handles the POST requests for presensi. It includes logic for distinguishing "Sekolah", "Terlambat", "Izin", "Sakit" and checking radius/timing.
- **Business Logic (Helper)**: `src\lib\workflow.ts` contains `canTeacherPresensiPulang` and `evaluatePresensiPulangTiming` which enforce business rules for presensi.
- **UI (Piket)**: `src\components\PiketView.tsx` allows manual attendance overrides by piket teachers for student attendance.

## 2. Journal Completion Checks
Journal completion is validated primarily in:
- **UI (Guru)**: `src\components\GuruJurnal.tsx` performs client-side validation on form submission:
  ```typescript
  const statusVerifikasiJurnal = (isMateriLengkap && isKegiatanLengkap && isAbsensiLengkap && isFotoLengkap)
  ```
- **Admin**: `src\components\AdminVerifView.tsx` checks `status_verifikasi` of journals submitted by teachers.

## 3. Daftar Nilai Code
- **UI (Gradebook)**: `src\components\GradebookView.tsx` manages the CRUD operations for `nilai_siswa`, interacting with the database.

## 4. Presensi Sesi Restriction
- **Implementation**: Found in `src\components\GradebookView.tsx` as an internal tab. It is restricted to the specific subject/class and requires teacher-level access.

## Strategy
### R1. Attendance Logic
- Focus on `src\app\api\attendance\route.ts` for API-level changes and `src\lib\workflow.ts` for business logic updates.
- Ensure manual overrides in `PiketView.tsx` respect the new rules.

### R3. Journal Completion Check
- Consolidate validation logic in `GuruJurnal.tsx` if additional fields are required.
- Update `AdminVerifView.tsx` to handle the new status validation if rules change.

### R6. Nilai / Sesi
- `GradebookView.tsx` is the central point for Nilai and Sesi management.
- Ensure RLS rules (Supabase) in `src\lib\supabaseClient.ts` match the intended access controls for Gradebook and Sesi views.
