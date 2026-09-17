# Handoff Report — R3 (Gradebook / Daftar Nilai) & R4 (Native VAPID Push & Account Settings)

**Surveyor Agent**: `explorer_9_survey_r3r4`  
**Target Recipient**: `orchestrator_9`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r3r4`  
**Timestamp**: 2026-09-17T10:35:10Z  
**Status**: Ready for Implementation  

---

## 1. Observation

### 1.1 Current Codebase & Schema State for R3 (Gradebook / Daftar Nilai)
1. **Existing Tables in `src/types/database.ts`**:
   - Evaluated all 1,110 lines of `src/types/database.ts`.
   - The database contains 18 tables: `bank_dokumen`, `data_guru`, `data_mapel`, `data_siswa`, `guru_mapel`, `jadwal_pelajaran`, `jadwal_piket`, `jurnal_pembelajaran`, `kalender_pendidikan`, `laporan_piket`, `pengaturan`, `pengumuman`, `pengumuman_tanggapan`, `penugasan_piket`, `presensi_guru`, `riwayat_backup`, `sekolah`, and `users`.
   - **No Dedicated TP or Grade Table Exists**: There is currently no `tujuan_pembelajaran`, `asesmen`, or `nilai_siswa` table in Supabase.
   - In `jurnal_pembelajaran` (lines 304–378), `tujuan_pembelajaran` is only a free-form text column: `tujuan_pembelajaran: string | null` (line 327).
2. **Subject, Teacher, and Class Mapping**:
   - `guru_mapel` table (lines 178–237) maps `guru_id`, `nip`, `nama_guru`, `mapel_id`, `nama_mapel`, `mapel_singkat`, and `kelas`.
   - `guru_kelas` view (lines 843–850) provides distinct pairs of `(guru_id, nip, nama_guru, kelas)`.
   - `data_siswa` table (lines 137–177) stores students by `id`, `nisn`, `nama_siswa`, `kelas`, `gender`, `status`, and `sekolah_id`.
3. **Application Navigation & Views**:
   - In `src/components/AppScreen.tsx` (lines 107–138), `menuItemsGuru` and `menuItemsAdmin` currently do not contain any entry for Gradebook (e.g. `view-gradebook` or `view-daftar-nilai`).
   - In `src/components/HomeView.tsx`, teacher dashboards render attendance stats, teaching schedules, and journal completion, but no Gradebook summary cards.

---

### 1.2 Current Codebase State for R4 (Push Notifications, Account Settings, Attendance Requirement & Target Email)
1. **PWA & Service Worker (Push Notifications)**:
   - Evaluated `public/` and root: **`sw.js` does NOT exist**.
   - `src/app/layout.tsx` (lines 1–47) does not register any Service Worker or include a Web App Manifest.
   - `package.json` has `next: 16.3.4`, `react: 19.2.8`, `@supabase/supabase-js: ^2.116.0`, but **`web-push` is NOT installed**.
   - `src/app/api/` currently only has an empty directory `sync-spreadsheet/`. No push notification API routes exist.
   - Supabase does not have a `push_subscriptions` table to store VAPID endpoints and keys (`p256dh`, `auth`).
2. **Account Settings & Profile Management**:
   - In `users` table (`src/types/database.ts` lines 806–840): columns are `id`, `nama`, `password`, `role`, `sekolah_id`, `username`. **No `avatar` column exists**.
   - No UI exists for Guru or Admin to manage their profile (avatar, username, password).
   - In `supabase/migrations/20260912_fix_rls_integrity.sql` lines 314–323, `users_update_policy` enforces:
     ```sql
     WITH CHECK (
         is_superadmin()
         OR (public.get_auth_user_role() = 'Admin' AND sekolah_id = public.get_auth_user_sekolah_id() AND role <> 'Superadmin')
     );
     ```
     This means non-admin teachers cannot directly execute an `UPDATE` on `public.users` without triggering an RLS permission rejection unless an explicit security definer function/RPC or policy adjustment is provided.
3. **Teacher Attendance Requirement & `getGuruDailyState()`**:
   - Inspected `src/lib/workflow.ts` (lines 111–326): `getGuruDailyState(namaGuru: string, username?: string)` checks:
     1. Calendar holidays (`kalender_pendidikan`)
     2. Weekend holidays (`hari_sekolah` in `pengaturan`)
     3. Today's teaching schedule (`findJadwalForGuru(selectedHari, namaGuru, username)`)
     4. Presence records (`presensi_guru`)
   - Lines 216–219:
     ```ts
     if (!state.presensiDatang) {
       state.lockedReason = 'Anda belum melakukan Presensi Datang hari ini.';
       return state;
     }
     ```
     There is currently **NO branching logic** checking whether the teacher has "Wajib Hadir Setiap Hari" vs "Wajib Hadir Hanya di Hari Mengajar".
   - In `AdminRekapView.tsx` lines 163–170, Alpa is calculated purely from accumulated late seconds (`alpaOtomatis = Math.floor(telat / 14400)`).
   - In `AdminVerifView.tsx` lines 283–310, `unsubmittedPresensi` marks any teacher who has not submitted presensi on that day as "Belum Presensi", even if they have no teaching schedule on that day.
4. **Target Email for File Upload**:
   - Inspected `src/components/AdminConfigView.tsx` (lines 9–33): contains 21 config keys, but no `email_tujuan_upload` / `target_email` key.
   - Inspected `src/lib/driveUpload.ts` (lines 1–37): `DRIVE_WEBHOOK_URL` sends a payload with `filename`, `mimeType`, `base64Data`, `namaGuru`, `folderFitur`, but does not pass a destination email.

---

## 2. Logic Chain

### 2.1 Logic Chain for R3: Gradebook (Daftar Nilai) Architecture
```
Observation 1.1.1 (No existing TP or Nilai tables)
+ Requirement R3 (Dynamic assessment: Diagnostik 1 per TP, Formatif dynamic per TP, Sumatif dynamic per TP)
+ Requirement Multi-Tenancy (sekolah_id on all tables, RLS isolation)
────────────────────────────────────────────────────────────────────────
→ Conclusion: We must create three relational tables:
  1. `public.tujuan_pembelajaran`: Defines learning objectives per Mapel, Kelas, Guru, Semester, and Year.
  2. `public.asesmen_kolom`: Defines assessment items under each TP, categorized strictly into:
     - 'Diagnostik' (Enforced at 1 per TP)
     - 'Formatif' (Flexible 1..N per TP)
     - 'Sumatif' (Flexible 1..N per TP)
  3. `public.nilai_siswa`: Stores student grades linked to `asesmen_kolom`, `tujuan_pembelajaran`, and `data_siswa`.
```

#### Detailed SQL Schema Migration Design for R3
File to create: `supabase/migrations/20260917_gradebook_and_settings.sql`

```sql
-- ==============================================================================
-- 1. Table: tujuan_pembelajaran
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tujuan_pembelajaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    guru_id UUID REFERENCES public.data_guru(id) ON DELETE SET NULL,
    nama_guru TEXT NOT NULL,
    mapel_id TEXT,
    nama_mapel TEXT NOT NULL,
    kelas TEXT NOT NULL,
    kode_tp TEXT NOT NULL, -- e.g. "TP 1", "TP 2"
    deskripsi TEXT NOT NULL,
    semester TEXT NOT NULL DEFAULT 'Ganjil',
    tahun_ajaran TEXT NOT NULL DEFAULT '2024/2025',
    urutan INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_tp_guru_mapel_kelas_kode UNIQUE (sekolah_id, nama_guru, nama_mapel, kelas, kode_tp, semester, tahun_ajaran)
);

CREATE INDEX IF NOT EXISTS idx_tp_sekolah_guru ON public.tujuan_pembelajaran(sekolah_id, nama_guru);
CREATE INDEX IF NOT EXISTS idx_tp_mapel_kelas ON public.tujuan_pembelajaran(nama_mapel, kelas);

-- ==============================================================================
-- 2. Table: asesmen_kolom
-- Defines columns per TP:
-- - Diagnostik: strictly 1 per TP (auto-created with TP)
-- - Formatif: flexible count (F1, F2, F3...)
-- - Sumatif: flexible count (S1, S2, Sumatif Akhir TP...)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.asesmen_kolom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    tp_id UUID NOT NULL REFERENCES public.tujuan_pembelajaran(id) ON DELETE CASCADE,
    kategori TEXT NOT NULL CHECK (kategori IN ('Diagnostik', 'Formatif', 'Sumatif')),
    nama TEXT NOT NULL, -- e.g. "Diagnostik", "Formatif 1", "Sumatif Lingkup Materi"
    bobot NUMERIC DEFAULT 1,
    urutan INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asesmen_tp_id ON public.asesmen_kolom(tp_id);
CREATE INDEX IF NOT EXISTS idx_asesmen_kategori ON public.asesmen_kolom(tp_id, kategori);

-- ==============================================================================
-- 3. Table: nilai_siswa
-- Stores student grades per assessment item
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.nilai_siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    tp_id UUID NOT NULL REFERENCES public.tujuan_pembelajaran(id) ON DELETE CASCADE,
    asesmen_id UUID NOT NULL REFERENCES public.asesmen_kolom(id) ON DELETE CASCADE,
    siswa_id TEXT,
    nisn TEXT NOT NULL,
    nama_siswa TEXT NOT NULL,
    kelas TEXT NOT NULL,
    mapel TEXT NOT NULL,
    nama_guru TEXT NOT NULL,
    nilai NUMERIC(5, 2) CHECK (nilai >= 0 AND nilai <= 100),
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_nilai_siswa_asesmen UNIQUE (sekolah_id, asesmen_id, nisn)
);

CREATE INDEX IF NOT EXISTS idx_nilai_siswa_tp ON public.nilai_siswa(tp_id, nisn);
CREATE INDEX IF NOT EXISTS idx_nilai_siswa_asesmen ON public.nilai_siswa(asesmen_id);
CREATE INDEX IF NOT EXISTS idx_nilai_sekolah ON public.nilai_siswa(sekolah_id);

-- ==============================================================================
-- 4. Enable Row Level Security & Multi-Tenant Policies
-- ==============================================================================
ALTER TABLE public.tujuan_pembelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asesmen_kolom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nilai_siswa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tujuan_pembelajaran_tenant_policy" ON public.tujuan_pembelajaran
    FOR ALL USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())
    WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

CREATE POLICY "asesmen_kolom_tenant_policy" ON public.asesmen_kolom
    FOR ALL USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())
    WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());

CREATE POLICY "nilai_siswa_tenant_policy" ON public.nilai_siswa
    FOR ALL USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())
    WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());
```

#### TypeScript Types to Add to `src/types/database.ts`
```typescript
export type TujuanPembelajaran = Tables<'tujuan_pembelajaran'>;
export type TujuanPembelajaranInsert = TablesInsert<'tujuan_pembelajaran'>;
export type AsesmenKolom = Tables<'asesmen_kolom'>;
export type AsesmenKolomInsert = TablesInsert<'asesmen_kolom'>;
export type NilaiSiswa = Tables<'nilai_siswa'>;
export type NilaiSiswaInsert = TablesInsert<'nilai_siswa'>;
```

#### UI Component Design: `GradebookView.tsx`
- **Location**: `src/components/GradebookView.tsx`
- **Roles**:
  - **Guru**: Selects assigned Mapel and Kelas (from `guru_mapel`). Views TP list, adds/edits TP, manages Formatif and Sumatif columns, inputs numeric grades (0–100) per student in an interactive spreadsheet table, auto-calculates averages (Nilai Rata-rata Formatif, Nilai Akhir TP), and exports/prints recap.
  - **Admin**: Review mode. Can switch between any Guru, Mapel, and Kelas to inspect grade entry progress, view class averages, and export or print grade sheets.
- **Menu integration in `src/components/AppScreen.tsx`**:
  - Add `{ id: 'view-gradebook', icon: 'fa-graduation-cap', label: 'Daftar Nilai' }` to `menuItemsGuru` and `menuItemsAdmin`.

---

### 2.2 Logic Chain for R4: Native VAPID PWA Push Notifications Architecture
```
Observation 1.2.1 (No sw.js, web-push not installed, no subscription routes)
+ Requirement R4 (Native VAPID Web Push without Firebase, sw.js listening to push event, Next.js API route)
────────────────────────────────────────────────────────────────────────
→ Conclusion: 
  1. Install `web-push` and `@types/web-push`.
  2. Create `push_subscriptions` table in Supabase.
  3. Create `public/sw.js` with `self.registration.showNotification`.
  4. Create `/api/push/subscribe` and `/api/push/validate` Next.js route handlers.
  5. Add Client-side Push Manager utility & UI toggle in Settings / Header.
```

#### Detailed Architecture for Push Notifications
1. **Database Table**:
   ```sql
   CREATE TABLE IF NOT EXISTS public.push_subscriptions (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE,
       user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
       user_nama TEXT,
       user_role TEXT,
       endpoint TEXT NOT NULL UNIQUE,
       p256dh TEXT NOT NULL,
       auth TEXT NOT NULL,
       user_agent TEXT,
       created_at TIMESTAMPTZ DEFAULT now(),
       updated_at TIMESTAMPTZ DEFAULT now()
   );
   ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "push_subscriptions_tenant_policy" ON public.push_subscriptions
       FOR ALL USING (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id())
       WITH CHECK (is_superadmin() OR sekolah_id = public.get_auth_user_sekolah_id());
   ```
2. **Service Worker (`public/sw.js`)**:
   ```javascript
   self.addEventListener('push', function (event) {
     let data = {};
     if (event.data) {
       try {
         data = event.data.json();
       } catch (e) {
         data = { title: 'SIPJAM Notifikasi', body: event.data.text() };
       }
     }
     const title = data.title || 'SIPJAM Notifikasi';
     const options = {
       body: data.body || '',
       icon: data.icon || '/favicon.ico',
       badge: data.badge || '/favicon.ico',
       data: data.url || '/',
       vibrate: [100, 50, 100],
       actions: data.actions || []
     };
     event.waitUntil(self.registration.showNotification(title, options));
   });

   self.addEventListener('notificationclick', function (event) {
     event.notification.close();
     const targetUrl = event.notification.data || '/';
     event.waitUntil(
       clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
         for (let i = 0; i < clientList.length; i++) {
           let client = clientList[i];
           if (client.url === targetUrl && 'focus' in client) {
             return client.focus();
           }
         }
         if (clients.openWindow) {
           return clients.openWindow(targetUrl);
         }
       })
     );
   });
   ```
3. **API Routes**:
   - `src/app/api/push/subscribe/route.ts`:
     - POST: Parses `{ subscription, userId, userNama, userRole, sekolahId }`, stores/upserts into `push_subscriptions`.
   - `src/app/api/push/validate/route.ts`:
     - POST: Uses `web-push` with VAPID keys to send an immediate test payload (`{ title: 'Notifikasi Berhasil Aktif', body: 'Perangkat ini terhubung ke SIPJAM Push Service.' }`) and returns `{ success: true }`.
     - GET: Returns the public VAPID key (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`).

---

### 2.3 Logic Chain for R4: Account Settings & Profile Editing Architecture
```
Observation 1.2.2 (users table lacks avatar column; RLS blocks non-admin update)
+ Requirement R4 (Guru & Admin can change avatar from cool presets, change username, change password)
────────────────────────────────────────────────────────────────────────
→ Conclusion:
  1. Add `avatar TEXT DEFAULT 'avatar_1'` to `public.users`.
  2. Implement an RPC `public.update_user_profile(p_user_id, p_nama, p_username, p_password, p_avatar)`
     with SECURITY DEFINER so any authenticated user can update their own profile safely.
  3. Create Account Settings Component (`AccountSettingsModal.tsx` or `AccountSettingsView.tsx`).
```

#### Avatar Preset Collection
Provide 12 stylish SVG/vector preset avatars:
- Male / Female educators with glasses, hijab, modern hairstyles, formal suits, and friendly smile options.
- Stored as preset IDs (`avatar_1` to `avatar_12`) or SVG data URIs, with instant live preview.

#### Profile Update RPC (PostgreSQL)
```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT 'avatar_1';

CREATE OR REPLACE FUNCTION public.update_user_profile(
    p_user_id UUID,
    p_nama TEXT,
    p_username TEXT,
    p_password TEXT,
    p_avatar TEXT
)
RETURNS JSON AS $$
DECLARE
    v_existing_id UUID;
    v_res JSON;
BEGIN
    -- Check username uniqueness if changed
    SELECT id INTO v_existing_id
    FROM public.users
    WHERE username = p_username AND id <> p_user_id
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', 'Username sudah digunakan oleh akun lain.');
    END IF;

    -- Update profile
    UPDATE public.users
    SET 
        nama = COALESCE(NULLIF(p_nama, ''), nama),
        username = COALESCE(NULLIF(p_username, ''), username),
        password = CASE WHEN p_password IS NOT NULL AND p_password <> '' THEN p_password ELSE password END,
        avatar = COALESCE(NULLIF(p_avatar, ''), avatar)
    WHERE id = p_user_id;

    RETURN json_build_object('success', true, 'message', 'Profil berhasil diperbarui.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
```

---

### 2.4 Logic Chain for R4: Teacher Attendance Requirement & `getGuruDailyState()`
```
Observation 1.2.3 (getGuruDailyState blocks unconditionally when !presensiDatang; no exemption check)
+ Acceptance Criteria: "getGuruDailyState() memiliki percabangan logika yang membebaskan perhitungan 'Alpa' pada hari-hari tanpa jadwal mengajar jika guru ditandai sebagai 'Wajib Hadir Hanya di Hari Mengajar'"
────────────────────────────────────────────────────────────────────────
→ Conclusion:
  1. Add `opsi_kehadiran` column to `data_guru` (default 'Wajib Hadir Setiap Hari').
  2. Add `opsi_kehadiran_guru` to `pengaturan` (Admin default).
  3. In `src/lib/workflow.ts`, update `getGuruDailyState()`:
     - Check teacher's `opsi_kehadiran` (from `data_guru` or `pengaturan`).
     - If marked 'Wajib Hadir Hanya di Hari Mengajar':
       - If `state.jadwalKBM.length === 0` AND `!state.isPiket`:
         - Set `state.isNonTeachingDay = true`
         - Set `state.bebasAlpa = true`
         - If `!state.presensiDatang`, set `state.lockedReason = 'Hari ini tidak ada jadwal mengajar atau piket (Bebas Kehadiran).'`
  4. In `AdminVerifView.tsx` & `AdminRekapView.tsx`:
     - Skip teachers with `bebasAlpa` from the missing attendance / Alpa count on their non-teaching days.
```

---

### 2.5 Logic Chain for R4: Target Email Setting in Admin Settings
```
Observation 1.2.4 (AdminConfigView lacks target email; driveUpload hardcoded)
+ Requirement: "Admin dapat mengubah alamat email tujuan untuk tempat integrasi upload file"
────────────────────────────────────────────────────────────────────────
→ Conclusion:
  1. Add `email_tujuan_upload` field to `AdminConfigView.tsx` state and UI form under a dedicated "Integrasi File Upload" card.
  2. Upsert key `email_tujuan_upload` into `public.pengaturan`.
  3. Update `src/lib/driveUpload.ts` to accept an optional or fetched `targetEmail` parameter and pass it into the GAS webhook payload.
```

---

## 3. Caveats

1. **VAPID Key Generation & Environment Variables**:
   - Web Push requires a cryptographic VAPID keypair (`VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`).
   - In production or benchmark environments without access to edit external `.env`, a deterministic or auto-generated key pair stored in the database / `pengaturan` table or default constant ensures zero runtime configuration failure.
2. **Push Permission Browser Restrictions**:
   - Browsers (especially Safari on iOS and Chrome on Android) require user interaction (button click) to request `Notification.requestPermission()`.
   - The UI should display a clean, dedicated "Aktifkan Notifikasi" toggle button rather than firing permissions on initial mount.
3. **Kurikulum Merdeka Diagnostik Assessment Rules**:
   - Diagnostik assessments are intended to map student baseline readiness and do not contribute to final report card GPA.
   - The UI should clearly distinguish Diagnostik (baseline) from Formatif (process) and Sumatif (achievement), displaying Formatif and Sumatif weighted averages dynamically.
4. **Preserve Compatibility with Existing Tests**:
   - `findJadwalForGuru` in `src/lib/workflow.ts` is strictly tested by `tests/challenger3_schedule_stress.test.ts`. Its signature, return value, and normalization logic must not be broken.

---

## 4. Conclusion

The technical survey for R3 and R4 is complete:
- **R3**: Clear relational model designed (`tujuan_pembelajaran`, `asesmen_kolom`, `nilai_siswa`) with full multi-tenant RLS, dynamic assessment counts (1 Diagnostik, N Formatif, M Sumatif per TP), full CRUD UI for teachers, and inspection mode for admins.
- **R4**: Clean native VAPID PWA Web Push architecture defined without Firebase dependencies, complete with `public/sw.js`, `/api/push/subscribe`, `/api/push/validate`, 12 avatar preset options with profile editing RPC, attendance exemption logic in `getGuruDailyState()`, and target email configuration in `AdminConfigView`.

---

## 5. Verification Method

To independently verify the implementation when executed:
1. **Database & TypeScript Verification**:
   - Run `npx tsc --noEmit` to verify 0 compile errors.
   - Inspect `supabase/migrations/20260917_gradebook_and_settings.sql` for table definitions, FK constraints, and RLS policies.
2. **Gradebook CRUD Verification**:
   - Login as Guru (`Ade` / `Ade Fitrawan Ibrahim`).
   - Navigate to `view-gradebook`.
   - Select Mapel and Kelas. Add a new TP ("TP 1"). Verify Diagnostik is present.
   - Add Formatif ("Formatif 1", "Formatif 2") and Sumatif ("Sumatif Lingkup Materi").
   - Input grades for students and verify auto-calculated averages. Save to Supabase.
   - Login as Admin. Open `view-gradebook` in review mode and confirm the saved grades and averages display accurately.
3. **Native Push Notification Verification**:
   - Verify `public/sw.js` exists and contains `self.addEventListener('push', ...)` and `self.registration.showNotification`.
   - Send POST request to `/api/push/validate` to confirm valid VAPID handling.
4. **Account Settings Verification**:
   - Open Account Settings from Guru or Admin profile.
   - Choose a preset avatar, change username, and update password.
   - Verify `users` table reflects the update and `localStorage.sipjam_user` updates seamlessly.
5. **Teacher Attendance Requirement Verification**:
   - In `AdminDataView` or `AdminConfigView`, set teacher to "Wajib Hadir Hanya di Hari Mengajar".
   - Select a day without teaching schedule (e.g. Wednesday for a teacher who only teaches Monday/Thursday).
   - Call `getGuruDailyState(namaGuru, username)` and verify `state.bebasAlpa === true` and `state.isNonTeachingDay === true`.
   - Verify that this teacher is NOT listed in the "Belum Presensi" list in `AdminVerifView.tsx` on that day.
6. **Target Email Verification**:
   - In `AdminConfigView.tsx`, enter a new target email and click "Simpan Konfigurasi".
   - Verify `pengaturan` table contains `key: 'email_tujuan_upload'`.
