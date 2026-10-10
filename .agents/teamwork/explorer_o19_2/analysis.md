# Technical Investigation Report: Phase 2 (R5, R6, R7)

**Author:** Explorer 2 (`explorer_o19_2`)  
**Date:** 2026-10-10  
**Scope:** R5 (`AppUser` interface design & typing), R6 (`AppScreen.tsx` hook extraction), R7 (`HomeView.tsx` modular split)  
**Status:** Read-Only Investigation Complete

---

## Executive Summary

This report provides the complete architecture and implementation specifications for Phase 2 refactoring of the SIPJAM application:
1. **R5 (Type Safety & User Interface):** Design of `src/types/user.ts` introducing `AppUser` to replace `user: any` in primary components (`AppScreen.tsx`, `HomeView.tsx`, `LoginScreen.tsx`, `GuruPresensi.tsx`). We identified non-obvious property accesses (`user?.nip`, `user?.name`, `user?.penugasan?.kelas_binaan`) and included them to prevent any breaking changes or TypeScript compilation errors.
2. **R6 (Hook Extraction in `AppScreen.tsx`):** Detailed extraction blueprint for 4 custom hooks in `src/hooks/`:
   - `useSessionSync(user, onLogout, onUserUpdate)`
   - `useWaliKelas(user, isAdmin, syncKey)`
   - `usePiket(user, isAdmin, isSuperadmin, syncKey)`
   - `useBroadcasts(user, isAdmin, isWaliKelas, syncKey)`  
   All parameter signatures, state machines, Supabase realtime channels, return values, and consumption patterns in `AppScreen.tsx` have been cataloged with verbatim line references.
3. **R7 (Component Splitting of `HomeView.tsx`):** Partitioning the monolithic 1831-line `HomeView.tsx` into:
   - `src/components/HomeViewGuru.tsx` (~1100 lines, teacher stats, 4-step workflow, journal ratios, subject student attendance, curriculum documents)
   - `src/components/HomeViewAdmin.tsx` (~700 lines, admin summary KPIs, shortcuts, reactive daily status matrix table)
   - `src/components/HomeView.tsx` (< 50 lines wrapper component that resolves the R3 `isGuru = !isAdmin` bug, dynamically rendering `HomeViewGuru` vs `HomeViewAdmin`).
4. **Critical Test Suite Finding:** Four test files in `tests/` (`m10_r2_r3.test.ts`, `m6_3_dashboards_and_verif.test.ts`, `three_fixes_verification.test.ts`, `m4_features_verification.test.ts`) perform `fs.readFileSync` on `HomeView.tsx` for specific strings now split between Guru and Admin. We specify the backward-compatibility preservation approach for `npm test`.

---

## 1. R5: `src/types/user.ts` & `AppUser` Interface Analysis

### 1.1 Property Access Audit Across Components

We analyzed where and how the `user` object is consumed across the codebase:

| Component | Target Lines | Properties Accessed on `user` |
|---|---|---|
| `src/components/LoginScreen.tsx` | Lines 7, 45–63 | `user.nama`, `user.role`, `user.username`, `user.id`, `user.sekolah_id`, `user.session_token`, `user.avatar` |
| `src/components/GuruPresensi.tsx` | Lines 13, 208, 286, 323, 606, 624, 754, 775 | `user.nama`, `user.username`, `user.id`, `user.sekolah_id` |
| `src/components/HomeView.tsx` | Lines 66, 78, 107–132, 210–215, 294–304, 1032–1043 | `user.id`, `user.nama`, `user.username`, `user.role`, `user.sekolah_id`, `user.avatar` |
| `src/components/AppScreen.tsx` | Lines 46–62, 90–96, 108, 115, 216–233, 243–248, 279, 294–300, 314–347, 368, 387, 405, 500, 627, 660–682, 1079 | `user.id`, `user.username`, `user.nama`, `user.role`, `user.sekolah_id`, `user.session_token`, `user.avatar`, `user.wali_kelas`, `user.nip` (line 680), `user.name` (line 1079) |
| `src/components/RekapSiswaView.tsx` | Lines 84–100, 378–385, 641–644 | `user.wali_kelas`, `user.penugasan?.kelas_binaan` |

### 1.2 Proposed Interface Definition (`src/types/user.ts`)

```typescript
// src/types/user.ts

/**
 * AppUser defines the shape of the authenticated user session
 * object stored in localStorage ('sipjam_user') and passed down
 * to components and hooks.
 */
export interface AppUser {
  id: string;
  username: string;
  nama: string;
  role: string;
  sekolah_id: string;
  session_token: string;
  avatar?: string | null;
  wali_kelas?: string | { kelas: string } | null;
  /** Optional fallback / alternative aliases observed in codebase */
  nip?: string;
  name?: string;
  penugasan?: {
    kelas_binaan?: string;
    [key: string]: any;
  } | null;
  /** Index signature ensuring zero breaking changes for future Supabase RPC columns */
  [key: string]: any;
}
```

### 1.3 Target Refactor in Selected Components

1. **`src/components/LoginScreen.tsx`**:
   - Change:
     ```typescript
     import { AppUser } from '@/types/user';

     export default function LoginScreen({
       onLoginSuccess
     }: {
       onLoginSuccess: (user: AppUser) => void;
     }) {
     ```
   - Cast RPC response safely:
     ```typescript
     const userData = (rpcData && rpcData.length > 0 ? rpcData[0] : null) as AppUser | null;
     ```

2. **`src/components/GuruPresensi.tsx`**:
   - Change:
     ```typescript
     import { AppUser } from '@/types/user';

     export default function GuruPresensi({ user }: { user: AppUser }) {
     ```

3. **`src/components/HomeView.tsx`** (and child components):
   - Change:
     ```typescript
     import { AppUser } from '@/types/user';

     export interface HomeViewProps {
       user: AppUser;
       setView: (view: string) => void;
       menuItems?: any[];
       onOpenAccountSettings?: () => void;
     }

     export default function HomeView({
       user,
       setView,
       menuItems = [],
       onOpenAccountSettings,
     }: HomeViewProps) {
     ```

4. **`src/components/AppScreen.tsx`**:
   - Change:
     ```typescript
     import { AppUser } from '@/types/user';

     export default function AppScreen({
       user: initialUser,
       onLogout,
       onUserUpdate
     }: {
       user: AppUser;
       onLogout: () => void;
       onUserUpdate?: (user: AppUser) => void;
     }) {
       const [currentUser, setCurrentUser] = useState<AppUser>(initialUser);
     ```

---

## 2. R6: Hook Extraction Analysis (`src/components/AppScreen.tsx`)

In `AppScreen.tsx` (1101 lines), concerns are mixed between application shell rendering and session/role synchronization. We isolate four cohesive concerns into `src/hooks/`.

### 2.1 Hook 1: `useSessionSync` (`src/hooks/useSessionSync.ts`)
- **Existing Lines in `AppScreen.tsx`:** 74–162
- **Concern:** Idle revalidation (30-second inactivity check), session token verification against Supabase `users` table, automatic logout on session invalidation or superadmin revocation, fresh data sync to `localStorage` & component state, and cache-busting increment of `syncKey`.
- **Signature:**
  ```typescript
  export function useSessionSync(
    user: AppUser | null,
    onLogout: () => void,
    onUserUpdate?: (user: AppUser) => void
  ): {
    syncKey: number;
    currentUser: AppUser | null;
    setCurrentUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  }
  ```
- **Internal Mechanisms:**
  - `const [syncKey, setSyncKey] = useState(0);`
  - `const [currentUser, setCurrentUser] = useState<AppUser | null>(user);`
  - `useEffect(() => { setCurrentUser(user); }, [user]);`
  - Window event listeners: `focus`, `visibilitychange`, `pointerdown`, `keydown`.
  - Re-validates with:
    ```typescript
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, username, nama, role, sekolah_id, session_token, avatar')
      .eq('id', user.id)
      .single();
    ```
- **Dependencies & Imports:**
  - `useState, useEffect` from `'react'`
  - `supabase` from `'@/lib/supabaseClient'`
  - `AppUser` from `'@/types/user'`

### 2.2 Hook 2: `useWaliKelas` (`src/hooks/useWaliKelas.ts`)
- **Existing Lines in `AppScreen.tsx`:** 197–198, 210–264
- **Concern:** Determining whether the teacher is assigned as a Wali Kelas and identifying their assigned class (`assignedKelas`).
- **Signature:**
  ```typescript
  export function useWaliKelas(
    user: AppUser | null,
    isAdmin: boolean,
    syncKey?: number
  ): {
    isWaliKelas: boolean;
    assignedKelas: string | null;
  }
  ```
- **Internal Mechanisms:**
  - If `isAdmin`: immediately sets `isWaliKelas = true` and returns.
  - If `user?.wali_kelas`: parses string or `{ kelas: string }` and sets `isWaliKelas = true`.
  - Queries `supabase.from('wali_kelas').select('*')` filtered by `sekolah_id`, matching by `id === guru_id`, `nama === nama_guru`, or `username === nip`.
  - Fallback queries `supabase.from('data_guru')` for `wali_kelas` field.
- **Dependencies & Imports:**
  - `useState, useEffect` from `'react'`
  - `supabase` from `'@/lib/supabaseClient'`
  - `AppUser` from `'@/types/user'`

### 2.3 Hook 3: `usePiket` (`src/hooks/usePiket.ts`)
- **Existing Lines in `AppScreen.tsx`:** 199, 266–291
- **Concern:** Checking whether the logged-in teacher has piket duty scheduled today.
- **Signature:**
  ```typescript
  export function usePiket(
    user: AppUser | null,
    isAdmin: boolean,
    isSuperadmin: boolean,
    syncKey?: number
  ): {
    isPiketHariIni: boolean;
  }
  ```
- **Internal Mechanisms:**
  - If `isAdmin || isSuperadmin`: returns `isPiketHariIni = true`.
  - If `!user`: returns `isPiketHariIni = false`.
  - Calls `getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id)`.
  - Sets `isPiketHariIni = Boolean(state?.isPiket)`.
  - Protects against unmounted state updates via `isMounted` flag.
- **Dependencies & Imports:**
  - `useState, useEffect` from `'react'`
  - `getGuruDailyState` from `'@/lib/workflow'`
  - `AppUser` from `'@/types/user'`

### 2.4 Hook 4: `useBroadcasts` (`src/hooks/useBroadcasts.ts`)
- **Existing Lines in `AppScreen.tsx`:** 201–206, 314–421
- **Concern:** Broadcast announcements, unread count badge, read status tracking, mark-as-read mutations, and multi-tenant realtime channel subscription.
- **Signature:**
  ```typescript
  export function useBroadcasts(
    user: AppUser | null,
    isAdmin: boolean,
    isWaliKelas: boolean,
    syncKey?: number
  ): {
    unreadCount: number;
    broadcastModalOpen: boolean;
    setBroadcastModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    allAnnouncements: Pengumuman[];
    unreadAnnouncements: Pengumuman[];
    readMap: Record<string, boolean>;
    handleMarkAsRead: (announcementId: string) => Promise<void>;
    handleMarkAllAsRead: () => Promise<void>;
    fetchBroadcasts: () => Promise<void>;
  }
  ```
- **Internal Mechanisms:**
  - Queries `pengumuman` ordered by `is_pinned` and `created_at`, scoped by `user.sekolah_id`.
  - Filters by audience (`sasaran`: 'Semua', 'Guru', 'Wali Kelas', 'Admin').
  - Queries `pengumuman_dibaca` for read markers.
  - Subscribes to `supabase.channel(`realtime-broadcasts-${user?.sekolah_id || 'global'}`)` on `pengumuman` and `pengumuman_dibaca`.
  - Provides `handleMarkAsRead` and `handleMarkAllAsRead` via upsert to `pengumuman_dibaca`.
- **Dependencies & Imports:**
  - `useState, useEffect, useCallback` from `'react'`
  - `supabase` from `'@/lib/supabaseClient'`
  - `Pengumuman` from `'@/types/database'`
  - `AppUser` from `'@/types/user'`

### 2.5 `AppScreen.tsx` Consumption Pattern

After extracting the 4 hooks, `AppScreen.tsx` simplifies its setup to:

```typescript
// AppScreen.tsx setup
const { syncKey, currentUser, setCurrentUser } = useSessionSync(initialUser, onLogout, onUserUpdate);
const user = currentUser || initialUser;
const isSuperadmin = (user?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
const isAdmin = isSuperadmin || (user?.role || '').toLowerCase() === 'admin';

const { isWaliKelas, assignedKelas } = useWaliKelas(user, isAdmin, syncKey);
const { isPiketHariIni } = usePiket(user, isAdmin, isSuperadmin, syncKey);
const {
  unreadCount,
  broadcastModalOpen,
  setBroadcastModalOpen,
  allAnnouncements,
  unreadAnnouncements,
  readMap,
  handleMarkAsRead,
  handleMarkAllAsRead,
} = useBroadcasts(user, isAdmin, isWaliKelas, syncKey);
```

This extracts over 250 lines of complex state & effect logic into clean, testable hooks without modifying runtime behavior.

---

## 3. R7: `HomeView.tsx` Modularization (Guru vs Admin Split)

### 3.1 Structural Analysis of `HomeView.tsx` (1831 lines)

Our line-by-line inspection reveals that `HomeView.tsx` is strictly bifurcated:

| Section | Lines | Audience | Description |
|---|---|---|---|
| Imports & Types | 1–59 | Both | `TeacherStatusRow`, `KURIKULUM_DOC_TYPES`, WITA utilities |
| Component Setup | 60–104 | Both | Header date/time computations, Teacher state declarations, Admin state declarations |
| Teacher Data Fetching | 105–273 | Guru | `getGuruDailyState`, `getTeacherDisciplineWarnings`, monthly presensi stats, mapel, journals, documents |
| Admin Data Fetching | 274–636 | Admin | `loadAdminMatrix` (penugasan piket, jadwal KBM, kalender, sistem blok, presensi matrix) |
| Admin KPIs & Filtering | 644–682 | Admin | `filteredMatrix`, `adminKPIs` calculation |
| Teacher Ratios & Calcs | 684–891 | Guru | `journalRatioData`, `subjectAttendanceList`, `subjectDocCompletenessList` |
| Teacher Workflow Steps | 893–1022 | Guru | `getWorkflowSteps`, `getStepTargetView`, `getNextAction` |
| Header Banner | 1023–1075 | Both | User avatar, name, role, school, date, time, and Edit Akun button |
| **Teacher UI Body** | **1080–1513** | **Guru** | **Monthly stats, 4 stat cards, 4-step workflow progress, journal ratios, subject attendance, curriculum completeness** |
| **Admin UI Body** | **1518–1826** | **Admin** | **KPI cards, Quick action shortcuts, Daily Status Matrix table with search & filter pills, table footer** |

### 3.2 Target File Structure

#### File A: `src/components/HomeViewGuru.tsx` (~1100 lines)
- Dedicated exclusively to Guru dashboard.
- Encapsulates:
  - Teacher states (`dailyState`, `attendanceStats`, `selectedMonth`, `teacherSubjects`, `teacherJournals`, `teacherDocuments`, `teacherWarnings`).
  - Teacher data fetching effects (`getGuruDailyState`, `getTeacherDisciplineWarnings`, attendance queries).
  - Teacher calculation memos (`journalRatioData`, `subjectAttendanceList`, `subjectDocCompletenessList`).
  - Workflow step generator (`getWorkflowSteps`, `getNextAction`).
  - Header banner + Sections 1 through 5 of teacher UI.
- Props:
  ```typescript
  export interface HomeViewGuruProps {
    user: AppUser;
    setView: (view: string) => void;
    menuItems?: any[];
    onOpenAccountSettings?: () => void;
  }
  ```

#### File B: `src/components/HomeViewAdmin.tsx` (~700 lines)
- Dedicated exclusively to Administrator & Superadmin dashboard.
- Encapsulates:
  - Admin states (`adminLoading`, `matrixList`, `matrixSearch`, `matrixFilter`, `activeBlokToday`).
  - Matrix data fetching effect (`loadAdminMatrix`).
  - Memoized KPIs (`adminKPIs`) and search/filter evaluation (`filteredMatrix`).
  - Header banner + Summary KPI cards + Quick action shortcuts + Daily Status Matrix table.
- Props:
  ```typescript
  export interface HomeViewAdminProps {
    user: AppUser;
    setView: (view: string) => void;
    menuItems?: any[];
    onOpenAccountSettings?: () => void;
  }
  ```

#### File C: `src/components/HomeView.tsx` (< 50 lines wrapper)
- A clean, lightweight dispatcher.
- Directly fixes the **R3 bug**:
  ```typescript
  const role = (user?.role || '').toLowerCase().replace(/\s+/g, '');
  const isSuperadmin = role === 'superadmin';
  const isAdmin = isSuperadmin || role === 'admin';
  const isGuru = !isAdmin;
  ```
- Full implementation:
  ```tsx
  'use client';

  import { AppUser } from '@/types/user';
  import HomeViewGuru from './HomeViewGuru';
  import HomeViewAdmin from './HomeViewAdmin';

  export interface HomeViewProps {
    user: AppUser;
    setView: (view: string) => void;
    menuItems?: any[];
    onOpenAccountSettings?: () => void;
  }

  export default function HomeView({
    user,
    setView,
    menuItems = [],
    onOpenAccountSettings,
  }: HomeViewProps) {
    const role = (user?.role || '').toLowerCase().replace(/\s+/g, '');
    const isSuperadmin = role === 'superadmin';
    const isAdmin = isSuperadmin || role === 'admin';
    const isGuru = !isAdmin;

    if (isGuru) {
      return (
        <HomeViewGuru
          user={user}
          setView={setView}
          menuItems={menuItems}
          onOpenAccountSettings={onOpenAccountSettings}
        />
      );
    }

    return (
      <HomeViewAdmin
        user={user}
        setView={setView}
        menuItems={menuItems}
        onOpenAccountSettings={onOpenAccountSettings}
      />
    );
  }
  ```
- Line count: ~45 lines (well below the < 200 line constraint).
- Retains identical `default export HomeView` and prop signature so `AppScreen.tsx`'s dynamic import (`const HomeView = dynamic(() => import('./HomeView'))`) functions without any modification.

---

## 4. Test Suite Compatibility & Invariant Analysis

During our investigation of `npm test`, we uncovered an important nuance:

### 4.1 Static File Assertions in `tests/`
Four test files in the project's test suite read `src/components/HomeView.tsx` via `fs.readFileSync`:
1. `tests/m10_r2_r3.test.ts` (lines 80–119):
   - Asserts `homeContent.includes('loadAdminMatrix')` (now in `HomeViewAdmin`)
   - Asserts `homeContent.includes('Statistik Presensi Pribadi')` (now in `HomeViewGuru`)
2. `tests/m6_3_dashboards_and_verif.test.ts` (lines 36–134):
   - Asserts `homeContent.includes('Statistik Presensi Pribadi')` (now in `HomeViewGuru`)
   - Asserts `homeContent.includes('Matriks Status Harian Guru')` (now in `HomeViewAdmin`)
3. `tests/three_fixes_verification.test.ts` (lines 11–75):
   - Asserts `homeContent.includes('isExemptNonTeaching')` (now in `HomeViewAdmin`)
   - Asserts `homeContent.includes("steps.push({ label: 'Bebas Presensi'")` (now in `HomeViewGuru`)
4. `tests/m4_features_verification.test.ts` (lines 23–72):
   - Asserts `homeContent.includes('select(\'timestamp, keterlambatan_detik...')` (now in `HomeViewGuru`)

### 4.2 Recommendation for Builder
To ensure `npm test` achieves exit code 0 while keeping `HomeView.tsx` under 200 lines:
In those 4 test files, the tests should read the child components if present:
```typescript
const homeContent = fs.readFileSync(homeViewPath, 'utf8') +
  (fs.existsSync(homeGuruPath) ? fs.readFileSync(homeGuruPath, 'utf8') : '') +
  (fs.existsSync(homeAdminPath) ? fs.readFileSync(homeAdminPath, 'utf8') : '');
```
Additionally, `tests/m6_2_print_redesign.test.ts` currently fails because `PrintOrientationToggle` was removed in Milestone M10. The implementer should ensure this legacy test expectation is properly aligned so the entire test suite passes.

---

## 5. Verification Checklist for Implementation

- [ ] `src/types/user.ts` exists and exports `AppUser` interface.
- [ ] `AppUser` contains all required fields (`id`, `username`, `nama`, `role`, `sekolah_id`, `session_token`, `avatar`, `wali_kelas`, `nip`, `name`).
- [ ] `src/hooks/useSessionSync.ts` exists and handles idle revalidation.
- [ ] `src/hooks/useWaliKelas.ts` exists and resolves wali kelas & class assignment.
- [ ] `src/hooks/usePiket.ts` exists and verifies piket duty.
- [ ] `src/hooks/useBroadcasts.ts` exists and manages notifications & realtime channel.
- [ ] `src/components/AppScreen.tsx` imports and consumes the 4 hooks.
- [ ] `src/components/HomeViewGuru.tsx` and `src/components/HomeViewAdmin.tsx` exist.
- [ ] `src/components/HomeView.tsx` is < 200 lines and routes correctly between Guru and Admin.
- [ ] `npx tsc --noEmit` exits with 0 errors.
- [ ] `npm run build` succeeds.
