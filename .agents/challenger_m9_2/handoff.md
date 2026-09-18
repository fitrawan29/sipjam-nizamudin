# Challenger 2 Handoff Report — Milestone 9 Verification

**Agent**: `challenger_m9_2` (Empirical Challenger)  
**Roles**: critic, specialist  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\challenger_m9_2`  
**Target Milestone**: Milestone 9 Enhancements (Web Push Automated Reminders, Service Worker, UI State Transitions, Production Build)  
**Verdict**: **FAILED** (Critical bug discovered in `/api/push/send-reminders` presensi query and server-side RLS tenant context)

---

## 1. Observation

### 1.1 `/api/push/send-reminders/route.ts` Schema Mismatch & False-Positive Bug
In `src/app/api/push/send-reminders/route.ts` (lines 54–65):
```typescript
    // C. Fetch presensi for today (Datang)
    let presensiQuery = supabase
      .from('presensi_guru')
      .select('*')
      .eq('tanggal', todayStr)
      .eq('jenis', 'Datang');
    if (sekolahId && sekolahId !== '00000000-0000-0000-0000-000000000000') {
      presensiQuery = presensiQuery.eq('sekolah_id', sekolahId);
    }
    const { data: presensiList } = await presensiQuery;
    const checkedInSet = new Set((presensiList || []).map(p => (p.nama_guru || '').toLowerCase().trim()));
```

Direct database inspection of `public.presensi_guru` revealed its actual schema:
```
['id', 'timestamp', 'nama_guru', 'tipe_absen', 'jenis_presensi', 'detail_izin', 'lokasi', 'jarak', 'link_bukti', 'status_verifikasi', 'keterlambatan_detik', 'sekolah_id']
```
Direct PostgREST execution output:
```
Could not find the 'jenis' column of 'presensi_guru' in the schema cache
```
- The `presensi_guru` table stores attendance direction in `tipe_absen` (`'Datang'` or `'Pulang'`), NOT in a column named `jenis` (the `jenis_presensi` column stores `'Sekolah'` vs `'Dinas Luar'`).
- The date is stored inside `timestamp` (`'YYYY-MM-DD HH:mm:ss'` or ISO string), NOT in a column named `tanggal`.
- When `presensiQuery` executes, PostgREST errors and returns `data: null`.
- Because `data: null`, `checkedInSet` is permanently empty (`Set(0)`).
- When a teacher **has already checked in** on time (`tipe_absen = 'Datang'`), the system falsely determines `hasCheckedIn = false` and dispatches an erroneous push notification reminder to that teacher:
  ```
  ❌ FAIL: Teacher who already checked in (Presensi Datang) receives NO Datang reminder -> BUG FOUND: Checked-in teacher Guru Challenger DoneJournal 475261 erroneously received Datang reminder because route.ts queries non-existent columns eq('tanggal', ...) and eq('jenis', 'Datang') instead of timestamp and tipe_absen!
  ```

### 1.2 Route Handler Multi-Tenant RLS Header Absence in Server Context
In `src/app/api/push/send-reminders/route.ts` (lines 1–45):
```typescript
import { supabase } from '@/lib/supabaseClient';
...
export async function checkMissingTasks(targetDateStr?: string, targetDayName?: string, filterSekolahId?: string) {
  ...
  let schoolQuery = supabase.from('sekolah').select('id, nama');
  ...
  let guruQuery = supabase.from('data_guru').select('*');
```
- In Node.js / Next.js Server Route Handlers, `localStorage` is unavailable.
- `@/lib/supabaseClient` relies on `getActiveTenantContext()`, which defaults to empty tenant headers (`{ sekolahId: null, role: null, userId: null }`).
- Under PostgreSQL Row-Level Security (RLS) on `data_guru` (`USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())`), PostgREST filters out all rows when unauthenticated with no tenant headers.
- Result: When `/api/push/send-reminders` is triggered by an external scheduler/cron HTTP call, `guruQuery` returns `[]` (empty), skipping all schools and generating 0 reminders.

### 1.3 Service Worker `public/sw.js` Behavior
Inspection and sandboxed VM execution of `public/sw.js`:
- Verified listeners: `install`, `activate`, `push`, `notificationclick`.
- `install` calls `self.skipWaiting()`.
- `activate` calls `event.waitUntil(self.clients.claim())`.
- `push` event parses `event.data.json()` safely and falls back to `event.data.text()`, passing options `{ body, icon, badge, data, vibrate, tag, renotify, actions }` into `self.registration.showNotification(title, options)`.
- `notificationclick` calls `event.notification.close()`, inspects `self.clients.matchAll({ type: 'window', includeUncontrolled: true })`, focuses an open client matching `targetUrl`, or opens a new window via `self.clients.openWindow(targetUrl)`.
- All Service Worker tests passed (14/14 assertions).

### 1.4 UI State Transitions & Bell Shake
Inspection of `src/app/globals.css`, `src/components/AppScreen.tsx`, and `src/components/PushNotificationPrompt.tsx`:
- `@keyframes bell-shake` and `.animate-bell-shake` defined in `globals.css` with natural top-center oscillation (`animation: bell-shake 0.8s ease-in-out infinite`).
- `AppScreen.tsx` dynamically evaluates:
  `unreadCount > 0 ? 'text-amber-500 animate-bell-shake' : 'text-gray-700 dark:text-gray-300'`
  and conditionally renders the red badge counter with a `99+` cap.
- `PushNotificationPrompt.tsx` delays display by 1500ms, renders title `"Kirim Notifikasi (Push)"`, handles `"Aktifkan Notifikasi"` and `"Kirim Notifikasi Uji Coba"`, and writes `'sipjam_push_prompt_dismissed'` to `sessionStorage` on dismissal.
- All UI transition tests passed (21/21 assertions).

### 1.5 TypeScript Compilation & Production Build
- `npx tsc --noEmit` exited with code `0`.
- `npm run build` completed cleanly with exit code `0`:
  ```
  Route (app)
  ┌ ○ /
  ├ ○ /_not-found
  ├ ƒ /api/push/send-reminders
  ├ ƒ /api/push/subscribe
  ├ ƒ /api/push/validate
  └ ○ /superadmin
  ```

---

## 2. Logic Chain

1. **Step 1**: An empirical test was created (`tests/m9_challenger2_e2e_verification.test.ts`) that seeded test teachers for every scenario:
   - Non-exempt teacher with no Datang presensi today.
   - Non-exempt teacher who DID check in today.
   - Exempt teacher (`wajib_hadir_hanya_mengajar = true`) with no schedule today.
   - Exempt teacher (`wajib_hadir_hanya_mengajar = true`) who DOES teach today and has not checked in.
   - Teacher with 2 scheduled classes who completed only 1 journal.
   - Teacher with scheduled classes who completed all journals.
   - Teacher assigned to piket today without a report.
   - Teacher assigned to piket today with a report submitted.
2. **Step 2**: The test ran `checkMissingTasks` and evaluated the generated reminders array against ground truth expectations.
3. **Step 3**: The test observed that `teacherCompleteJournal`, despite having an active `'Datang'` presensi record with timestamp `'2026-09-18 07:15:00'` and `tipe_absen = 'Datang'`, was issued a missing Datang reminder.
4. **Step 4**: Tracing the code in `src/app/api/push/send-reminders/route.ts` line 58–59 revealed that it queried `.eq('tanggal', todayStr).eq('jenis', 'Datang')`.
5. **Step 5**: Schema inspection proved `presensi_guru` has no `tanggal` column and no `jenis` column. PostgREST rejects the query, causing `presensiList` to evaluate to `null`.
6. **Step 6**: Because `checkedInSet` is empty, every teacher in the school is falsely flagged as absent, resulting in false-positive push notifications spamming teachers who have already checked in.
7. **Step 7**: Testing execution without explicit `setServerTenantContext({ role: 'Superadmin' })` revealed that `send-reminders/route.ts` fails to fetch teachers due to PostgREST RLS restrictions when invoked from external server-side requests.
8. **Conclusion**: Therefore, `/api/push/send-reminders` fails acceptance criteria for accurate reminder dispatch.

---

## 3. Caveats

- Live push message delivery to Apple Push Notification Service (APNs) or Firebase Cloud Messaging (FCM) was not tested with a physical iOS/Android device token (this requires physical mobile hardware and registered browser push service endpoints); standard VAPID payload signing and Service Worker reception were verified via local simulation and sandbox tests.
- All temporary test rows generated during empirical test execution were cleanly deleted in the test teardown block.

---

## 4. Conclusion

### Overall Verdict: **FAILED**

While the UI keyframe animations, Service Worker (`public/sw.js`), permission prompt dialog, and production build passed with flying colors, `/api/push/send-reminders` has two critical defects that must be addressed:

1. **Schema Mismatch in `route.ts`**:
   In `src/app/api/push/send-reminders/route.ts`, lines 55–65 must be updated to query `presensi_guru` matching how `src/lib/workflow.ts` queries attendance:
   ```typescript
   // Fetch presensi for today (Datang)
   let presensiQuery = supabase
     .from('presensi_guru')
     .select('*')
     .eq('tipe_absen', 'Datang');
   if (sekolahId && sekolahId !== '00000000-0000-0000-0000-000000000000') {
     presensiQuery = presensiQuery.eq('sekolah_id', sekolahId);
   }
   const { data: presensiList } = await presensiQuery;
   const checkedInSet = new Set(
     (presensiList || [])
       .filter(p => {
         const ts = p.timestamp || '';
         return ts.startsWith(todayStr) || (ts.includes('T') && ts.substring(0, 10) === todayStr);
       })
       .map(p => (p.nama_guru || '').toLowerCase().trim())
   );
   ```

2. **Server-Side Tenant Context in `route.ts`**:
   Before querying schools and teachers in `checkMissingTasks`, set server tenant context or instantiate a scoped client with `x-user-role: Superadmin` so that PostgREST RLS does not block `data_guru` queries when invoked from HTTP GET/POST cron callers:
   ```typescript
   import { setServerTenantContext } from '@/lib/supabaseClient';
   ...
   setServerTenantContext({ role: 'Superadmin', sekolahId: filterSekolahId || null });
   ```

---

## 5. Verification Method

To independently reproduce and verify these findings:

1. Run the empirical challenger test suite:
   ```powershell
   npx tsx tests/m9_challenger2_e2e_verification.test.ts
   ```
   **Expected Output**: Shows 87 tests passing, and 1 failure identifying that checked-in teachers erroneously receive Datang reminders.

2. Verify zero TypeScript errors across the codebase:
   ```powershell
   npx tsc --noEmit
   ```
   **Expected Output**: Exit code `0`, no output.

3. Verify Next.js production build:
   ```powershell
   npm run build
   ```
   **Expected Output**: Exit code `0`, successful compilation of all 6 routes.
