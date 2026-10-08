# Project: SIPJAM — Teacher Account Comprehensive Updates

## Architecture
- **Stack**: Next.js 16.3.4 (App Router), React 19, TypeScript, Tailwind CSS, Font Awesome 6, SweetAlert2, Supabase (PostgreSQL + PostgREST).
- **Authentication & Roles**: Roles are `'superadmin'`, `'admin'`, and `'guru'`. Additional teacher assignments include `wali_kelas` and daily `piket`.
- **Multi-tenant Data Flow**: All operational queries strictly partitioned by `sekolah_id`.
- **Teacher Reminder Subsystem**: `TeacherReminderManager.tsx` with 30-minute persistent snooze toggle in `localStorage` (`sipjam_reminder_snooze_until_${userId}`) suppressing both in-app banners and push alerts.
- **Camera & Storage Architecture**: `CameraSelfieCapture.tsx` locked strictly to 4:3 (portrait 3:4 for attendance, landscape 4:3 for KBM journal) with canvas pre-compression before upload via `src/lib/driveUpload.ts` to Google Drive.
- **Attendance & Admin Verification**:
  - `public.presensi_guru`: enhanced with `durasi_hari`, `tanggal_mulai`, `tanggal_selesai`, `memerlukan_persetujuan_admin`, `is_auto_checkout`.
  - Multi-state transitions between "Hadir di Sekolah" and "Dinas Luar".
  - Auto-checkout evaluation in `src/lib/attendanceAlpa.ts`.
  - Admin approval routing in `AdminVerifView.tsx` for sick $\ge 3$ days and leave $> 3$ days.
  - GPS coordinate capture and injection into `PrintHeader.tsx`'s security footer, with SweetAlert alert if GPS access is denied/blocked.
- **Student Attendance, Sync & Concurrency**:
  - Strict RBAC: Mapel limited to session roll-call, Wali Kelas locked to assigned class, Piket active only on duty days.
  - Gate to Mapel synchronization with automatic truancy detection (`piketAttendance` present but Mapel marks `Alpa`).
  - Lease-based concurrency lock in `src/lib/piketLock.ts` preventing simultaneous form edits.
- **Academic Merdeka & Reporting**:
  - `GradebookView.tsx`: Kurikulum Merdeka Capaian Pembelajaran narrative generator based on highest and lowest TP scores.
  - `AppScreen.tsx`: Dedicated "Rapor" menu for Wali Kelas (`isWaliKelas`).
  - Updated in-app tutorials (`tutorialSteps.ts` and `tutorialData.ts`).
- **Testing & Quality Assurance**:
  - Comprehensive automated tests in `tests/e2e/` covering all 5 Acceptance Criteria.
  - Zero TypeScript errors (`npx tsc --noEmit`), clean build (`npm run build`), and git workflow compliance.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | F1: 30-Minute Notification Snooze | 30-min snooze for auto-notifications toggleable by teacher | M1 | Survey 1 | PLANNED |
| 2 | F2: Print Orientation Simplification | Remove print orientation toggle buttons, rely cleanly on browser dialog | M1 | Survey 1 | PLANNED |
| 3 | F3: 4:3 Camera Lock & Google Drive Upload | Camera locked to 4:3 (portrait 3:4, landscape 4:3), canvas compression & Drive upload | M1 | Survey 1 | PLANNED |
| 4 | F4: UI Responsiveness Across Devices | Responsive layout for all teacher controls across desktop and mobile | M1 | Survey 1 | PLANNED |
| 5 | F5: Multi-State Teacher Attendance | Arrival/departure multi-state transitions ("Hadir di Sekolah" <-> "Dinas Luar") | M2 | Survey 2 | PLANNED |
| 6 | F6: Auto-Checkout Flagging | Detect uncompleted checkouts past cutoff and flag auto-checkout | M2 | Survey 2 | PLANNED |
| 7 | F7: Long-Term Sick & Leave Admin Routing | Route sick >=3 days and leave >3 days to Admin dashboard for approval | M2 | Survey 2 | PLANNED |
| 8 | F8: GPS Coordinates on Printed Documents | Auto-attach GPS to printed documents with alert if GPS is blocked | M2 | Survey 2 | PLANNED |
| 9 | F9: Student Attendance RBAC | Strict RBAC for student attendance across Mapel, Wali Kelas, and Piket | M3 | Survey 3 | PLANNED |
| 10 | F10: Gate-to-Mapel Sync & Truancy Detection | Synchronize gate check-ins and auto-flag truancy when Piket Hadir but Mapel Alpa | M3 | Survey 3 | PLANNED |
| 11 | F11: Piket Form Concurrency Lock | Concurrency lock preventing double entry by simultaneous Piket users | M3 | Survey 3 | PLANNED |
| 12 | F12: Kurikulum Merdeka CP Calculations | Capaian Pembelajaran narrative descriptions computed from highest/lowest TP | M4 | Survey 3 | PLANNED |
| 13 | F13: Wali Kelas "Rapor" Menu | Dedicated "Rapor" navigation item for teachers assigned as Wali Kelas | M4 | Survey 3 | PLANNED |
| 14 | F14: In-App Tutorial Updates | Update onboarding tour and guide cards for all new flows | M4 | Survey 3 | PLANNED |
| 15 | F15: E2E & Programmatic Test Suite | Write/update E2E tests in tests/e2e/ validating all 5 acceptance criteria | M5 | Survey 3 | PLANNED |
| 16 | F16: Build Verification & Git Delivery | tsc --noEmit, npm run build, git add/commit/push per GEMINI.md | M5 | Dispatch | PLANNED |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | UI/UX & Camera Updates (R1) | Notification 30-min snooze, print orientation removal, 4:3 camera lock, Google Drive upload | none | PLANNED |
| M2 | Teacher Attendance & Admin Verification (R2) | Multi-state flows, auto-checkout, sick/leave admin routing, GPS print footer | M1 | PLANNED |
| M3 | Student Attendance & Piket Concurrency (R3) | RBAC enforcement, gate sync & truancy detection, Piket form concurrency lock | M2 | PLANNED |
| M4 | Academic Merdeka, Rapor Menu & Tutorials (R4) | Kurikulum Merdeka CP calculations, Wali Kelas Rapor menu, tutorial updates | M3 | PLANNED |
| M5 | E2E Testing, Adversarial Verification & Git Delivery | All acceptance criteria tests in tests/e2e/, npm test, tsc, npm run build, git push | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### 1. Teacher Notification Snooze (`TeacherReminderManager.tsx`)
- Storage Key: `sipjam_reminder_snooze_until_${user.id}`
- Snooze Duration: 30 minutes (`30 * 60 * 1000` ms)
- Evaluation:
  ```ts
  export function isReminderSnoozed(userId: string): boolean {
    const until = localStorage.getItem(`sipjam_reminder_snooze_until_${userId}`);
    if (!until) return false;
    return Date.now() < parseInt(until, 10);
  }
  ```

### 2. Camera Constraints & Frame Ratios (`CameraSelfieCapture.tsx`)
- Constraints:
  - Portrait: `aspectRatio: { ideal: 3 / 4 }`, `width: { ideal: 720 }`, `height: { ideal: 960 }`
  - Landscape: `aspectRatio: { ideal: 4 / 3 }`, `width: { ideal: 1280 }`, `height: { ideal: 960 }`
- Canvas Processing:
  - Portrait cropped to 3:4, landscape cropped to 4:3 in `watermarkCanvas.ts`.

### 3. Presensi Guru Schema (`public.presensi_guru`)
- New columns:
  - `durasi_hari`: INTEGER DEFAULT 1
  - `tanggal_mulai`: DATE
  - `tanggal_selesai`: DATE
  - `memerlukan_persetujuan_admin`: BOOLEAN DEFAULT false
  - `is_auto_checkout`: BOOLEAN DEFAULT false
- Approval Threshold Rule:
  ```ts
  const requiresAdminApproval = (detailIzin === 'Sakit' && durasi >= 3) || (jenisPresensi === 'Izin' && durasi > 3);
  ```

### 4. Piket Form Concurrency Lock (`src/lib/piketLock.ts`)
- Lock record: `{ id, sekolah_id, tanggal, form_type, user_id, user_name, locked_at, expires_at }`
- Lease duration: 5 minutes (300 seconds), refresh heartbeat: 60 seconds.
- Lock acquisition:
  ```ts
  acquirePiketLock(sekolahId: string, tanggal: string, userId: string, userName: string): Promise<{ success: boolean; lockedBy?: string }>
  ```

### 5. Kurikulum Merdeka Capaian Pembelajaran (`GradebookView.tsx`)
- For each student:
  - Find TP with highest score: `tpMax`
  - Find TP with lowest score: `tpMin`
  - Description synthesized:
    - Strengths: "Menunjukkan penguasaan yang sangat baik dalam [materi tpMax]"
    - Needs Guidance: "Perlu bimbingan lebih lanjut dalam [materi tpMin]"

## Code Layout
- `src/components/TeacherReminderManager.tsx`: 30-minute notification snooze.
- `src/components/PrintHeader.tsx`: Clean print layout, GPS security footer.
- `src/components/CameraSelfieCapture.tsx`: 4:3 aspect ratio lock.
- `src/lib/watermarkCanvas.ts`: 4:3 canvas cropping.
- `src/components/GuruPresensi.tsx`: Multi-state attendance, leave duration input.
- `src/lib/attendanceAlpa.ts`: Auto-checkout detection pass.
- `src/components/AdminVerifView.tsx`: Sick/leave approval cards & badges.
- `src/components/PiketView.tsx`: Piket concurrency lock and gate logging.
- `src/lib/piketLock.ts`: Concurrency lease manager.
- `src/components/GuruJurnal.tsx`: Gate sync & truancy detection.
- `src/components/GradebookView.tsx`: Kurikulum Merdeka grade & CP generation.
- `src/components/AppScreen.tsx`: Wali Kelas "Rapor" menu and navigation guards.
- `src/components/Onboarding/tutorialSteps.ts` & `src/components/Tutorial/tutorialData.ts`: In-app guides.
- `tests/e2e/`: E2E test suites verifying all 5 acceptance criteria.
