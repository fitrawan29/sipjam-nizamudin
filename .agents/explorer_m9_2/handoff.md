# Handoff Report — Explorer 2 (Milestone 9 - Scope R2)

**Topic**: Broadcast Bell Notification in Navbar, Real-time Chat between Teachers, and Automated Web Push Notifications.  
**Author**: Explorer 2 (`.agents/explorer_m9_2`)  
**Date**: 2026-09-18T08:05:00Z  

---

## 1. Observation

### 1.1 Navbar & Broadcast Notification
1. **Navbar Header Location**:
   - File: `src/components/AppScreen.tsx`, lines 147–167:
     ```tsx
     <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-4 sm:px-6 py-3 flex justify-between items-center shrink-0 z-40 fixed top-0 w-full shadow-sm border-b border-gray-100 dark:border-gray-800 left-1/2 -translate-x-1/2 max-w-[1280px] print:hidden no-print">
       <div className="flex items-center gap-2 sm:gap-3">
           <button type="button" onClick={toggleSidebar} className="btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700">
               <i className="fa-solid fa-bars text-sm"></i>
           </button>
           <div className="text-sm md:text-base font-bold text-gray-900 dark:text-white cursor-pointer" onClick={() => handleNavigation(defaultHomeView)}>
             SIPJAM <span className="text-nizamudin-green dark:text-nizamudin-gold font-black">
               {user?.role === 'Superadmin' ? 'Superadmin' : (schoolData?.nama || 'Sekolah')}
             </span>
           </div>
       </div>

       <div className="flex items-center gap-2">
           <button type="button" onClick={toggleTheme} className="btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700">
               <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-sm`}></i>
           </button>
           <button type="button" onClick={onLogout} className="btn-click bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-red-200 dark:border-red-800/50 flex items-center gap-1.5 shadow-sm">
               <i className="fa-solid fa-power-off text-xs"></i> <span className="hidden sm:inline">Keluar</span>
           </button>
       </div>
     </header>
     ```
   - Current actions inside `<div className="flex items-center gap-2">` only contain `toggleTheme` and `onLogout`.
   - The bell notification button should be positioned directly preceding `toggleTheme`.

2. **Broadcast Data Model & Read State Tracking**:
   - File: `supabase/migrations/20260912_m6_overhaul.sql` (lines 36–48) and `src/types/database.ts` (lines 686–738):
     - Table `public.pengumuman` exists with columns:
       `id` (UUID), `judul` (TEXT), `konten` (TEXT), `sasaran` ('Semua' | 'Guru' | 'Wali Kelas' | 'Orang Tua'), `mode` ('Satu Arah' | 'Dua Arah'), `penulis_nama` (TEXT), `penulis_role` (TEXT), `is_pinned` (BOOLEAN), `lampiran_url` (TEXT), `sekolah_id` (UUID), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
     - Table `public.pengumuman_tanggapan` exists for replies.
   - Observation on read status: **There is currently NO database table or mechanism tracking per-user read/unread state** for announcements.
   - File: `src/components/InformasiView.tsx`: All announcements are fetched in bulk (`supabase.from('pengumuman').select('*')`, lines 43–47) without any read/unread flagging.

3. **Shake Animation & Badge Styling**:
   - File: `src/app/globals.css`, lines 153–207:
     Existing animations: `.fade-in`, `@keyframes pageEnter`, `@keyframes modalPop`.
     No bell vibration/shake animation currently exists in `globals.css`.

---

### 1.2 Real-time Chat between Teachers
1. **Supabase Realtime Configuration**:
   - File: `src/lib/supabaseClient.ts`, lines 109–116:
     ```ts
     export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
       global: {
         fetch: dynamicTenantFetch,
       },
     });
     ```
   - Realtime subscriptions via `@supabase/supabase-js` are actively used in:
     - `src/components/AdminMonitorView.tsx` (lines 20–26):
       `supabase.channel('realtime-presensi').on('postgres_changes', { event: '*', schema: 'public', table: 'presensi_guru' }, ...).subscribe()`
     - `src/components/AdminVerifView.tsx` (lines 62–87):
       `supabase.channel('verif-presensi')`, `supabase.channel('verif-jurnal')`, `supabase.channel('verif-piket')`.
2. **Current Chat Schema**:
   - Grep search for `chat`, `message`, and `pesan` in `src/types/database.ts` and `supabase/migrations/*.sql` returned **0 results**.
   - Currently, there is NO chat schema or message table in the database.
3. **Teacher User Model**:
   - File: `src/types/database.ts`, lines 1118–1155 (`public.users` table):
     Columns: `id` (UUID), `username` (TEXT), `nama` (TEXT), `password` (TEXT), `role` (TEXT), `sekolah_id` (UUID), `avatar` (TEXT).
   - All teachers in each tenant school have user accounts with `role = 'Guru'` (or `role = 'Admin'`).
   - File: `src/components/AppScreen.tsx`, lines 108–135:
     `menuItemsGuru` contains 10 items (`view-home`, `view-guru-presensi`, `view-guru-jurnal`, `view-piket`, `view-dokumen`, `view-gradebook`, `view-informasi`, `view-history`, `view-guru-rekap-jurnal`, `view-rekap-siswa`).
     No chat view currently exists.

---

### 1.3 Web Push Notifications & Automated Reminders
1. **Existing Web Push & VAPID Setup**:
   - Service Worker: `public/sw.js` (lines 11–45):
     Listens to `push` event, extracts JSON payload (`title`, `body`, `icon`, `data`, `vibrate`), and invokes `self.registration.showNotification(title, options)`.
     Listens to `notificationclick` (lines 47–69) to focus or open windows.
   - VAPID Configuration: `src/lib/vapid.ts`:
     Exports `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `sendWebPush(subscription, payload)` using npm package `web-push`.
   - Client Push Manager: `src/lib/pushClient.ts`:
     Exports `subscribeToPushNotifications(user)`, `getPushSubscription()`, `registerServiceWorker()`, and `sendTestNotification()`.
   - API Routes:
     - `src/app/api/push/subscribe/route.ts`: Upserts endpoint and keys into table `public.push_subscriptions`.
     - `src/app/api/push/validate/route.ts`: GET returns public key; POST triggers test notification to subscription.
   - Database Table: `public.push_subscriptions` in `src/types/database.ts` (lines 897–950):
     Has `id`, `endpoint`, `p256dh`, `auth`, `user_id`, `user_nama`, `user_role`, `sekolah_id`, `user_agent`, `created_at`, `updated_at`.
2. **Missing Automated Reminders**:
   - There is currently **no automated reminder route or scheduler** to push notifications to teachers who have not completed attendance, journal, or picket duties.
   - Push subscription dialog is currently only reachable inside `AccountSettingsModal.tsx` (lines 398–460), not triggered automatically on login or dashboard load.
3. **Teacher Daily Workflow State Evaluation**:
   - File: `src/lib/workflow.ts` lines 117–375 (`getGuruDailyState`):
     Evaluates `presensiDatang`, `presensiPulang`, `isLibur`, `isIzinSakit`, `isPiket`, `laporanPiket`, `jadwalKBM`, and `jurnalKBM`.
   - File: `src/components/HomeView.tsx` lines 240–350:
     Admin matrix calculates per teacher:
     - `presensiDatang`: 'Belum Datang' if not submitted.
     - `laporanPiket`: 'Belum Lapor' if teacher is on picket duty today and has no report.
     - `pengisianJurnal`: Target classes vs filled journals.
     - `presensiPulang`: 'Belum Pulang' if checked in but not checked out.

---

## 2. Logic Chain

### 2.1 Broadcast Bell Implementation Logic
1. **Tracking Read Status**:
   - Since `public.pengumuman` stores announcements globally per school, a join or junction table `public.pengumuman_dibaca` is required.
   - Each row represents that `user_id` has read `pengumuman_id`.
   - An announcement is unread for a user if:
     `pengumuman.sekolah_id = user.sekolah_id` AND
     `pengumuman.sasaran IN ('Semua', user.role)` (or 'Wali Kelas' if user is wali kelas) AND
     `pengumuman.id` NOT IN (`SELECT pengumuman_id FROM pengumuman_dibaca WHERE user_id = user.id`).
2. **Navbar Bell UI & Animation**:
   - Add a dedicated `<BroadcastBell user={user} onNavigate={handleNavigation} />` button inside `AppScreen.tsx` navbar header.
   - Add keyframe vibration `@keyframes bellShake` and utility `.animate-bell-shake` in `src/app/globals.css`.
   - When `unreadCount > 0`:
     - Bell icon applies `.animate-bell-shake` (smooth periodic rotation -14deg to +14deg).
     - Badge displays absolute red pill with count: `<span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">{unreadCount}</span>`.
3. **Real-time Reactive Updates**:
   - Bell component subscribes to `supabase.channel('public:pengumuman').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pengumuman' })`.
   - When an announcement is created by Admin, the bell triggers the shake animation and increments the unread counter immediately without page reload.
4. **Interaction Flow**:
   - Clicking the bell toggles a quick notification popover showing recent unread items.
   - Clicking "Buka Semua di Informasi" navigates to `view-informasi` and marks items as read by inserting into `public.pengumuman_dibaca`.

### 2.2 Teacher Real-time Chat Architecture Logic
1. **Schema Design (`public.chat_messages`)**:
   ```sql
   CREATE TABLE IF NOT EXISTS public.chat_messages (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
       sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
       sender_nama TEXT NOT NULL,
       recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
       recipient_nama TEXT NOT NULL,
       pesan TEXT NOT NULL,
       is_read BOOLEAN NOT NULL DEFAULT false,
       created_at TIMESTAMPTZ DEFAULT now(),
       updated_at TIMESTAMPTZ DEFAULT now()
   );
   ```
   - Indexes on `sekolah_id`, `(sender_id, recipient_id)`, and `(recipient_id, is_read)`.
   - RLS enabled with tenant isolation (`CALL public.setup_tenant_table_policies('chat_messages')`).
   - Realtime publication: `ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;`.
2. **UI Placement & Component**:
   - Component: `src/components/ChatView.tsx`.
   - Navigation: Add `{ id: 'view-chat', icon: 'fa-comments', label: 'Chat Guru' }` to `menuItemsGuru` and `menuItemsAdmin` in `AppScreen.tsx`.
   - Add view render branch in `AppScreen.tsx`: `{currentView === 'view-chat' && <ChatView user={user} />}`.
3. **Real-time Subscriptions**:
   - When `ChatView` is open, subscribe to Supabase Realtime channel `chat-school-${user.sekolah_id}` on table `chat_messages`.
   - On `INSERT`:
     - If `(sender_id === activeTeacher.id && recipient_id === user.id) || (sender_id === user.id && recipient_id === activeTeacher.id)`:
       Append new message to chat thread reactively.
       If incoming, update `is_read = true` in Supabase.
     - If message is from another teacher:
       Increment unread badge counter next to that teacher's name in the conversation list.
   - When message is sent:
     - Optimistically display bubble in UI, perform `supabase.from('chat_messages').insert(...)`.

### 2.3 Web Push Notifications & Automated Reminders Logic
1. **Automated Reminders API**:
   - Endpoint: `src/app/api/push/send-reminders/route.ts` (POST).
   - Logic:
     - Scans `data_guru` for active teachers in `sekolah_id`.
     - Queries today's `presensi_guru`, `jurnal_pembelajaran`, `jadwal_piket`, `laporan_piket`, `jadwal_pelajaran`.
     - Flags teachers missing:
       1. **Presensi Datang**: No arrival record by threshold time (e.g., > 07:30 WITA) and not on excused leave/holiday.
       2. **Laporan Piket**: On duty in `jadwal_piket` but no `laporan_piket` filed.
       3. **Jurnal KBM**: Has classes today in `jadwal_pelajaran` but fewer journal entries than assigned classes.
       4. **Presensi Pulang**: Checked in in the morning but no departure record after dismissal time.
     - For flagged teachers, fetches endpoints from `push_subscriptions` where `user_id = teacher.user_id` or `user_nama = teacher.nama_guru`.
     - Dispatches tailored push via `sendWebPush(sub, payload)`.
2. **Admin UI Manual Trigger**:
   - Add "Kirim Pengingat Notifikasi" action button in `AdminVerifView.tsx` and `HomeView.tsx` (Admin matrix).
   - Admin can click to broadcast immediate reminders to all teachers with pending obligations.
3. **Browser Permission Dialog & Welcome Simulation**:
   - Acceptance Criteria: *"Dialog izin 'Kirim Notifikasi (Push)' muncul di browser, dan notifikasi simulasi dari sistem berhasil masuk."*
   - In `AppScreen.tsx` or `HomeView.tsx`:
     On mount, if `isPushNotificationSupported() && Notification.permission === 'default'`:
     Show an interactive prompt / sweetalert modal: *"Aktifkan Notifikasi Web Push untuk menerima pengingat harian (Presensi, Jurnal, & Piket)?"*.
     Clicking "Aktifkan" triggers `Notification.requestPermission()`, registers service worker, saves subscription via `/api/push/subscribe`, and immediately triggers `/api/push/validate` so the user observes the native simulated push notification on their desktop/mobile device.

---

## 3. Caveats
1. **Browser Push Notification Environment**:
   - Web Push requires HTTPS or `localhost`. In unsecured HTTP environments, `Notification.requestPermission()` will be rejected by modern browsers.
   - iOS Safari requires PWA to be "Added to Home Screen" (iOS 16.4+) to support Web Push.
2. **Supabase Realtime Publication**:
   - By default in Supabase PostgreSQL, tables must be added to the publication `supabase_realtime` (`ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;`) for row-level change broadcasting to function. The database migration script must execute this command.
3. **Multi-Tenant User Linkage in Chat**:
   - Teachers are fetched from `public.users` matching `sekolah_id`. In cases where a school has added teachers in `data_guru` without creating an account in `users`, those teachers cannot receive direct messages until an account in `users` exists. (As observed in `Users (1).csv`, all teachers currently have active user accounts).

---

## 4. Conclusion
All three items under Milestone 9 Scope R2 have clear, clean, and non-breaking implementation paths:

1. **Broadcast Bell in Navbar**:
   - Component: `src/components/BroadcastBell.tsx` mounted in `src/components/AppScreen.tsx` `<header>` (line 159).
   - CSS: `@keyframes bellShake` and `.animate-bell-shake` in `src/app/globals.css`.
   - DB: New table `public.pengumuman_dibaca` to store `(pengumuman_id, user_id, sekolah_id)`.
   - Realtime: Subscribed to `pengumuman` INSERT events to trigger vibration and red unread badge.
2. **Real-time Teacher Chat**:
   - DB: New table `public.chat_messages` (`id`, `sekolah_id`, `sender_id`, `recipient_id`, `pesan`, `is_read`, `created_at`).
   - Component: `src/components/ChatView.tsx` with conversation list, message bubbles, and real-time subscription on channel `chat-school-${user.sekolah_id}`.
   - Navigation: Added to `AppScreen.tsx` sidebar as "Chat Guru".
3. **Web Push Automated Reminders**:
   - API: `src/app/api/push/send-reminders/route.ts` checking today's attendance, journals, and picket status against `push_subscriptions`.
   - Admin UI: "Kirim Pengingat" button in Admin Verifikasi/Matrix.
   - User UI: Permission prompt banner on login, auto-dispatching welcome simulation push upon permission grant.

---

## 5. Verification Method

### 5.1 Automated Script Verification
Run the project test suite and TypeScript validation:
```bash
npx tsc --noEmit
npm test
```

### 5.2 Specific Feature Test Script (`tests/m9_2_r2_verification.test.ts`)
Create and execute a dedicated test script to verify:
1. `src/components/AppScreen.tsx` contains `BroadcastBell` in header and `view-chat` in `menuItemsGuru`.
2. `src/app/globals.css` contains `bellShake` animation.
3. `src/components/ChatView.tsx` exists and contains Supabase Realtime channel subscription and message input handlers.
4. `src/app/api/push/send-reminders/route.ts` exists and references `presensi_guru`, `jurnal_pembelajaran`, and `laporan_piket`.
5. Database migration file exists with `chat_messages` and `pengumuman_dibaca`.

### 5.3 Invalidation Conditions
- If `npx tsc --noEmit` fails due to missing properties in `types/database.ts`.
- If `AppScreen.tsx` header fails to render the bell icon or layout overflows on mobile screens (< 375px).
- If `chat_messages` table is omitted from `supabase_realtime` publication, preventing reactive message delivery without manual refresh.
