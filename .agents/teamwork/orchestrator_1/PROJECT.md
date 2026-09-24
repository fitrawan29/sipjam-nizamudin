# Project: SIPJAM Application Enhancements

## Architecture
SIPJAM is a Next.js (App Router) + Supabase (PostgreSQL with RLS & RPCs) + Tailwind CSS web application for school administration, attendance, teaching journals, and duty monitoring.
- **Frontend Layer**: Next.js App Router with client components (`src/components/`) for role-based views (`GuruPresensi`, `GuruJurnal`, `PiketView`, `AdminVerifView`, `AdminRekapView`, `AdminMonitorView`, `AdminDataView`, `HomeView`, `AppScreen`, `LoginScreen`).
- **Data & Business Logic Layer**: Supabase client (`src/lib/supabaseClient.ts`), state workflows (`src/lib/workflow.ts`), date/time utilities (`src/lib/attendanceAlpa.ts`, `src/lib/warningSystem.ts`), and push messaging client (`src/lib/pushClient.ts`, `src/lib/vapid.ts`).
- **API Routes Layer**: Next.js Route Handlers (`src/app/api/`) for server-side push notifications (`/api/notifications/rejection`, `/api/push/send-reminders`) and attendance cron/cutoff triggers (`/api/attendance/auto-alpa`).
- **Database Layer**: PostgreSQL tables (`presensi_guru`, `jurnal_pembelajaran`, `laporan_piket`, `push_subscriptions`, `chat_messages`, `pengaturan`, `data_guru`, `data_siswa`, `data_mapel`, `kalender_pendidikan`, `jadwal_pelajaran`, `wali_kelas`, `users`) with RPC functions (`update_user_profile`, `get_auth_user_id`).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Presensi Re-submission Reset | Resubmitting rejected Datang/Pulang presensi deletes old rejected record from DB and updates state. | M1 | ORIGINAL_REQUEST R1.1 |
| 2 | Jurnal Re-submission Reset & Fix | Resubmitting rejected journal deletes only the matching class/mapel rejected journal (fixes batch deletion bug) and includes `sekolah_id`. | M1 | ORIGINAL_REQUEST R1.1 |
| 3 | Laporan Piket Re-submission Reset | Resubmitting rejected piket report resets old rejected report from DB and refreshes state. | M1 | ORIGINAL_REQUEST R1.1 |
| 4 | Admin Verification UI Updates | In `AdminVerifView.tsx`, hide "Setujui" button when item is 'Ditolak'; automatically remove rejected cards from active verification queue. | M1 | ORIGINAL_REQUEST R1.4 |
| 5 | Rejection Notification to Teacher | Dispatch Web Push via `sendWebPush` and insert in-app message into `chat_messages` when Admin rejects presensi, jurnal, or piket via `/api/notifications/rejection`. | M2 | ORIGINAL_REQUEST R1.2 |
| 6 | Auto-Alpa Cutoff & Rekap Update | Evaluate cutoff against `pengaturan.jam_pulang_akhir` in `attendanceAlpa.ts` and mutate unresubmitted rejections to 'Alpa' in DB; update `AdminRekapView.tsx` to count explicit Alpa. | M2 | ORIGINAL_REQUEST R1.3 |
| 7 | 3x Absence Warning Feature | Engine in `warningSystem.ts` computing 3x consecutive/accumulated absences for Presensi, Jurnal, and Piket; render warning alert banners in `HomeView.tsx` and `AdminMonitorView.tsx`. | M2 | ORIGINAL_REQUEST R1.5 |
| 8 | Notification Permission Blocking Modal | Fullscreen blocking overlay (`fixed inset-0 z-[99999]`) on app entry (`page.tsx`) preventing any interaction until notification permission is handled. | M3 | ORIGINAL_REQUEST R2.1 |
| 9 | Pre-Login Animation & Splash | Dedicated branded splash intro with smooth fade transition before `<LoginScreen />` is displayed. | M3 | ORIGINAL_REQUEST R2.2 |
| 10 | Login SaaS Text Removal & Tab Title | Remove "Multi-Tenant SaaS • Superadmin, Admin Sekolah & Guru" from `LoginScreen.tsx`; set browser title and manifest to "SIPJAM". | M3 | ORIGINAL_REQUEST R2.3, R2.4 |
| 11 | Apple iOS/Safari Compatibility Fixes | Add `viewportFit: 'cover'`, safe-area padding in `AppScreen.tsx`, `-webkit-overflow-scrolling: touch;`, 16px mobile input font-size, and camera iPhone initialization fix. | M3 | ORIGINAL_REQUEST R2.5 |
| 12 | Keterlambatan Accumulation Fix | Select `timestamp` in `HomeView.tsx`, filter by WITA current month using multi-format regex parser, filter out rejected records, and sum `keterlambatan_detik` for accurate badge and alpa deduction. | M4 | ORIGINAL_REQUEST R3.1 |
| 13 | Camera Switch facingMode Fix | Eliminate double-start race condition between `toggleFacingMode` and `useEffect` in `CameraSelfieCapture.tsx`, insert hardware release pause, add mutex lock. | M4 | ORIGINAL_REQUEST R3.2 |
| 14 | Teacher Username & Password Change | Expose `AccountSettingsModal.tsx` in `AppScreen.tsx` top bar and `HomeView.tsx` teacher banner for teachers to update username and password via `update_user_profile` RPC. | M4 | ORIGINAL_REQUEST R3.3 |
| 15 | Master Menus Search & Column Filters | Add column-specific dropdown filters alongside search bar in `AdminDataView.tsx` for all 6 tabs (Siswa, Guru, Mapel, Kalender, Jadwal, Wali Kelas). | M4 | ORIGINAL_REQUEST R3.4 |
| 16 | Final Acceptance & E2E Test Suite | Pass 100% of E2E test suite (Tiers 1-4) and Tier 5 Adversarial Coverage Hardening. | M5 | ORIGINAL_REQUEST Acceptance Criteria |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Alur Presensi, Jurnal, Piket & Admin Verif UI | F1, F2, F3, F4 | none | IN_PROGRESS |
| M2 | Notifikasi Penolakan, Auto-Alpa Cutoff & Warning 3x | F5, F6, F7 | M1 (interfaces) | PLANNED |
| M3 | UI/UX, Branding & Apple Compatibility | F8, F9, F10, F11 | none | PLANNED |
| M4 | Fungsionalitas Tambahan & Bug Fixes | F12, F13, F14, F15 | none | PLANNED |
| M5 | Final Milestone: E2E Verification & Adversarial Hardening | F16 (All requirements) | M1, M2, M3, M4 | PLANNED |

---

## Interface Contracts

### M1 ↔ M2: Rejection Flow & Notifications
- Rejection endpoint: `POST /api/notifications/rejection`
- Payload:
  ```ts
  {
    teacherName: string;
    sekolahId?: string;
    category: 'Presensi' | 'Jurnal' | 'Piket';
    detailInfo: string;
    rejectionReason: string;
    adminName: string;
  }
  ```
- Response: `{ success: boolean, pushSent: number, inAppCreated: boolean }`

### M2: Auto-Alpa Cutoff Evaluation
- Service: `src/lib/attendanceAlpa.ts`
- Function: `evaluateAndApplyAutoAlpa(targetDateStr?: string, sekolahId?: string): Promise<{ affectedCount: number, details: any[] }>`
- Endpoint: `GET/POST /api/attendance/auto-alpa`
- DB mutation:
  - Table: `presensi_guru`
  - Columns: `status_verifikasi = 'Alpa'`, `jenis_presensi = 'Alpa'`, `catatan_admin = 'Status diubah menjadi Alpa karena tidak mengisi ulang presensi hingga batas waktu pulang.'`

### M2: Warning System
- Service: `src/lib/warningSystem.ts`
- Function: `getTeacherDisciplineWarnings(teacherName: string, sekolahId?: string): Promise<TeacherWarningSummary>`
- Type:
  ```ts
  export interface TeacherWarningSummary {
    teacherId?: string;
    teacherName: string;
    hasWarning: boolean;
    warnings: {
      category: 'Presensi' | 'Jurnal' | 'Piket';
      type: 'berturut-turut' | 'akumulasi';
      count: number;
      dates: string[];
      message: string;
    }[];
  }
  ```

### M3 ↔ M4: Camera Component Shared Contract
- File: `src/components/CameraSelfieCapture.tsx`
- Props:
  ```ts
  interface CameraSelfieCaptureProps {
    onCapture: (imageDataUrl: string, locationData?: LocationData) => void;
    onCancel?: () => void;
    requireLocation?: boolean;
    initialFacingMode?: 'user' | 'environment';
  }
  ```
- Invariants: Clean track release (`track.stop()`), 100ms hardware release pause, mutex `isStartingRef`, `playsInline` attribute on `<video>` element.

---

## Code Layout
- `src/components/`: Role views and UI components
  - `GuruPresensi.tsx`: Teacher attendance submission & reset
  - `GuruJurnal.tsx`: Teaching journal submission & reset
  - `PiketView.tsx`: Teacher piket reporting & reset
  - `AdminVerifView.tsx`: Admin verification cards, rejection & approval actions
  - `AdminRekapView.tsx`: Admin attendance recap & alpa aggregation
  - `AdminMonitorView.tsx`: Daily monitoring & 3x discipline warnings
  - `AdminDataView.tsx`: Master data tables with search and column dropdown filters
  - `HomeView.tsx`: Teacher dashboard, late accumulation badge, discipline warning banner
  - `AppScreen.tsx`: Main application frame, top bar, profile button, safe areas
  - `LoginScreen.tsx`: Login view, branding
  - `PreLoginSplash.tsx`: Pre-login animation and intro
  - `NotificationPermissionModal.tsx` / `PushNotificationPrompt.tsx`: Fullscreen blocking notification modal
  - `CameraSelfieCapture.tsx`: Camera capture with iOS/Safari compatibility & robust facingMode switch
  - `AccountSettingsModal.tsx`: User modal for username and password modification
- `src/lib/`:
  - `supabaseClient.ts`: Supabase client instance
  - `workflow.ts`: Daily workflow state machine
  - `attendanceAlpa.ts`: Auto-alpa cutoff business logic
  - `warningSystem.ts`: 3x absence warning calculation
  - `vapid.ts`: Web Push dispatching helper
  - `pushClient.ts`: Client-side notification subscription manager
- `src/app/api/`:
  - `notifications/rejection/route.ts`: Server-side rejection notification handler
  - `attendance/auto-alpa/route.ts`: Server-side auto-alpa cutoff trigger
  - `push/send-reminders/route.ts`: Push reminder batch dispatcher
