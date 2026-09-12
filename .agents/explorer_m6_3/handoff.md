# Handoff Report — Explorer M6_3: R4 (Piket & Perangkat Pembelajaran) & R5 (Informasi Broadcast & UI Transitions)

**Date**: 2026-09-12  
**Author**: `explorer_m6_3`  
**Target File**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m6_3\handoff.md`  
**Reference Request**: `ORIGINAL_REQUEST.md` (Section `## 2026-09-12T04:36:57Z`, Requirements R4 and R5)  

---

## 1. Observation

### 1.1 Piket Management (`src/components/PiketView.tsx`)
- **Current Tab Structure (Lines 13, 284–305)**:
  `PiketView` currently maintains `activeTab` with three states: `'beranda' | 'lapor' | 'rekap'`.
  ```tsx
  13: const [activeTab, setActiveTab] = useState<'beranda' | 'lapor' | 'rekap'>('beranda');
  ...
  291: {canReport && (
  292:   <button 
  293:     onClick={() => setActiveTab('lapor')} 
  ...
  296:     Isi Laporan
  297:   </button>
  298: )}
  ```
- **Access Logic (Line 257)**:
  `const canReport = !isGuru || (dailyState && dailyState.isPiket && !dailyState.isLibur);`
  For Admin (`user.role === 'Admin'`), `!isGuru` is `true`, causing the "Isi Laporan" tab to be shown to Admin even though Admins do not conduct daily picket duty.
- **Form Implementation (Lines 393–474)**:
  The "Isi Laporan" tab renders a submission form for attendance verification and daily picket reports that writes to `public.laporan_piket`.
- **Existing Piket Schema & Data (`public.jadwal_piket`)**:
  Inspection via Supabase MCP tool `list_tables` and `csv/SIPJAM NIZAMUDIN - Jadwal_Piket.csv` revealed:
  - Table `public.jadwal_piket` has only 3 columns: `id` (uuid), `hari` (text, unique), `daftar_guru` (text).
  - It contains exactly 6 rows (one per day: Senin–Sabtu) storing comma-separated teacher names (e.g. `Senin: "Setia Ambar Ningsih Mamonto, Rohani Marham"`).
  - There is **no structure or table for student piket (siswa piket)**.
  - In `src/lib/workflow.ts` (lines 206–213), the app determines whether a teacher is on duty via:
    ```tsx
    const { data: jpiket } = await supabase.from('jadwal_piket').select('*').eq('hari', selectedHari);
    if (jpiket && jpiket.length > 0) {
      if (isGuruDiPiket(jpiket[0].daftar_guru, namaGuru)) state.isPiket = true;
    }
    ```

### 1.2 Perangkat Pembelajaran (`src/components/DokumenView.tsx`)
- **Current Tab Structure (Lines 10, 178–194)**:
  `DokumenView` maintains `activeTab: 'list' | 'upload'`.
  ```tsx
  10: const [activeTab, setActiveTab] = useState<'list'|'upload'>('list');
  ...
  188: <button type="button" onClick={() => setActiveTab('upload')} ...>Upload Baru</button>
  ```
- **Upload Form (Lines 278–308)**:
  The `upload` tab allows any user to upload files with `jenis_dokumen` and `judul`.
- **Existing Schema (`public.bank_dokumen`)**:
  Inspected via Supabase MCP: columns are `id`, `timestamp`, `nama_guru`, `jenis_dokumen`, `judul`, `link_file`, `status_verifikasi`, `catatan_admin`. Currently contains 0 rows.
- **Relational Data**:
  - `public.data_guru`: 13 teachers.
  - `public.guru_mapel`: 39 relational assignments linking teachers to subjects (`nama_mapel`, `mapel_singkat`, `kelas`).
- **Standard Document Types in Kurikulum Merdeka (Lines 285–290)**:
  1. Analisis Capaian Pembelajaran (CP)
  2. Alur Tujuan Pembelajaran (ATP)
  3. Rencana Pekan Efektif (RPE)
  4. Program Tahunan (Prota)
  5. Program Semester (Promes)
  6. Rencana Pembelajaran Mendalam / Modul Ajar (RPM)

### 1.3 Navigation & "Pantauan Harian" Menu (`src/components/AppScreen.tsx`)
- **Menu Items Admin (Lines 85–97)**:
  Line 94: `{ id: 'view-admin-monitor', icon: 'fa-user-clock', label: 'Pantauan Harian' }`.
- **View Switcher (Line 168)**:
  Line 168: `{currentView === 'view-admin-monitor' && <AdminMonitorView user={user} />}`.
- **Component `AdminMonitorView.tsx`**:
  Simple 123-line component reading `presensi_guru` for a single date. As per R3 of ORIGINAL_REQUEST, live attendance tracking has been moved into the redesigned Admin Dashboard (`HomeView.tsx`), rendering the standalone "Pantauan Harian" screen redundant.

### 1.4 Broadcast / Announcement System
- Currently, no announcement/broadcast menu or database table exists.
- In `public.pengaturan`, there are existing keys:
  `WA_API_URL: "https://api.fonnte.com/send"` and `WA_API_KEY: "-"`.
- In `public.data_siswa`, phone contacts exist: `no_hp_ortu`.
- In `public.data_guru`, phone contacts exist: `no_hp`.
- Neither `public.pengumuman` nor `public.penugasan_piket` exists in the database currently.

### 1.5 UI Transitions & Styling (`src/app/globals.css`)
- Tailwind CSS v4 is used (`@import "tailwindcss";` and `@custom-variant dark (&:where(.dark, .dark *));`).
- Currently, `.btn-click` has `transition-all duration-200 ease-in-out; :active { transform: scale(0.92); opacity: 0.8; }`, which produces an abrupt jump on click without hover elevation.
- View transitions only use a simple `@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }`.
- There is no container transition wrapper for smooth view switching in `AppScreen.tsx`.

---

## 2. Logic Chain

### 2.1 Refactoring Piket Management (R4.1)
1. **Differentiating Roles**:
   - In `PiketView.tsx`, Admins do not record field reports. Therefore, for `user?.role === 'Admin'`, the tab "Isi Laporan" (`activeTab === 'lapor'`) must be suppressed.
   - In its place, Admin requires a dedicated tab: **"Penugasan Piket"** (`activeTab === 'penugasan'`).
   - For teachers (`user?.role === 'Guru'`), the tabs remain `beranda`, `lapor` (when assigned), and `rekap`.
2. **Scheduling Data Model (`public.penugasan_piket`)**:
   - To support assigning both **Teachers (Guru)** and **Students (Siswa)** across days of the week, a dedicated table is required:
     ```sql
     CREATE TABLE IF NOT EXISTS public.penugasan_piket (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         hari TEXT NOT NULL, -- 'Senin'..'Sabtu'
         tipe TEXT NOT NULL DEFAULT 'Guru', -- 'Guru' | 'Siswa'
         nama TEXT NOT NULL,
         identifier TEXT, -- NIP (Guru) or NISN (Siswa)
         kelas TEXT, -- Class for Siswa, NULL for Guru
         tugas TEXT DEFAULT 'Piket Umum', -- e.g. 'Piket Gerbang & Kedisiplinan', 'Piket Kebersihan Lingkungan'
         urutan INTEGER DEFAULT 1,
         created_at TIMESTAMPTZ DEFAULT now()
     );
     ```
3. **Preserving Backward Compatibility with `workflow.ts`**:
   - `workflow.ts` lines 206–213 checks `jadwal_piket.daftar_guru` using `isGuruDiPiket()`.
   - When Admin adds/removes teacher assignments in `penugasan_piket`, an automatic sync updates `jadwal_piket` (`daftar_guru = string_agg(nama, ', ') WHERE hari = target_hari`).
   - This ensures existing attendance locks and daily teacher state detection continue functioning without regression.
4. **UI Design for "Penugasan Piket" Tab**:
   - Day Selector pills: `Senin | Selasa | Rabu | Kamis | Jumat | Sabtu`.
   - Section 1: **Guru Piket**:
     - Assigned teachers list with badges, specific tasks (e.g. Gerbang, Ketertiban KBM), and delete button.
     - Button `+ Tugaskan Guru`: modal/inline selector populated from `public.data_guru`.
   - Section 2: **Siswa Piket**:
     - Assigned students list with class badges (e.g. `X Merdeka`), NISN, tasks (e.g. Kebersihan, Apel), and delete button.
     - Button `+ Tugaskan Siswa`: modal/inline selector with class filter dropdown (`kelasList`) and student selector populated from `public.data_siswa`.
   - Enhance the "Beranda Piket" tab to display both assigned teachers and students.

### 2.2 Refactoring Perangkat Pembelajaran into Teacher Matrix System (R4.2)
1. **Removing "Upload Baru" Tab for Admin**:
   - Admins oversee verification rather than uploading documents. In `DokumenView.tsx`, the tab `upload` ("Upload Baru") is removed for Admin.
   - For teachers (`user?.role !== 'Admin'`), the upload capability is retained either via a dedicated upload modal or teacher-specific action button.
2. **Teacher Matrix Card System**:
   - Instead of an unorganized flat document list, documents must be mapped per teacher (`public.data_guru`) and their assigned subjects (`public.guru_mapel`).
   - For each teacher:
     - **Card Header**: Teacher Name, NIP, Total Subjects Count, Completion Badge (`X/6 Selesai`), and a visual Progress Bar (`(completedCount / 6) * 100%`).
     - **Subjects Area**: Badges displaying subjects taught (e.g., `X Merdeka_MTK`, `XI Merdeka_Informatika`).
     - **6-Document Matrix Grid**:
       For each of the 6 standard documents (CP, ATP, RPE, Prota, Promes, RPM):
       - If uploaded: Green checkmark icon, document status badge (`Disetujui`, `Menunggu`, `Ditolak`), timestamp, link to file, and verification action buttons (`Setujui` / `Tolak` with Admin feedback notes modal).
       - If missing: Red/Gray indicator with label "Belum Diunggah".
   - **Page-Level Controls**:
     - Metric KPI Badges: Total Guru (13), Guru Dokumen Lengkap, Guru Belum Lengkap, Dokumen Menunggu Verifikasi.
     - Filter dropdowns: All / Lengkap (100%) / Belum Lengkap (<100%) / Menunggu Verifikasi.
     - Search input for instant name/subject filtering.

### 2.3 Navigation & Broadcast "Informasi" Menu (R5.1 & R5.2)
1. **Menu Transformation in `AppScreen.tsx`**:
   - Remove `{ id: 'view-admin-monitor', icon: 'fa-user-clock', label: 'Pantauan Harian' }` from `menuItemsAdmin`.
   - Add `{ id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi' }` to both `menuItemsAdmin` and `menuItemsGuru`.
   - Remove `<AdminMonitorView user={user} />` and wire `<InformasiView user={user} />`.
2. **Broadcast Data Model**:
   - Table `public.pengumuman`:
     ```sql
     CREATE TABLE IF NOT EXISTS public.pengumuman (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         judul TEXT NOT NULL,
         isi TEXT NOT NULL,
         kategori TEXT NOT NULL DEFAULT 'Umum', -- 'Penting', 'Akademik', 'Kegiatan', 'Kedisiplinan', 'Umum'
         target_audiens TEXT NOT NULL DEFAULT 'Semua', -- 'Semua', 'Guru', 'Wali Kelas', 'Orang Tua', 'Kelas X', 'Kelas XI', 'Kelas XII'
         tipe_komunikasi TEXT NOT NULL DEFAULT 'Satu Arah', -- 'Satu Arah' | 'Dua Arah'
         penulis TEXT NOT NULL DEFAULT 'Admin',
         lampiran_url TEXT,
         is_pinned BOOLEAN NOT NULL DEFAULT false,
         is_active BOOLEAN NOT NULL DEFAULT true,
         created_at TIMESTAMPTZ DEFAULT now(),
         updated_at TIMESTAMPTZ DEFAULT now()
     );
     ```
   - Table `public.pengumuman_tanggapan` (Two-way communication):
     ```sql
     CREATE TABLE IF NOT EXISTS public.pengumuman_tanggapan (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         pengumuman_id UUID NOT NULL REFERENCES public.pengumuman(id) ON DELETE CASCADE,
         nama_pengirim TEXT NOT NULL,
         role_pengirim TEXT NOT NULL,
         pesan TEXT NOT NULL,
         created_at TIMESTAMPTZ DEFAULT now()
     );
     ```
3. **Features of `InformasiView.tsx`**:
   - **Admin View**:
     - "Buat Siaran Baru" form: Judul, Kategori badge, Target Audiens dropdown, Mode Komunikasi toggle, Isi pesan, Lampiran URL, Pin to Top toggle.
     - One-click WhatsApp Broadcast generator: Generates pre-formatted message text with school title and web link, with a button opening `https://wa.me/?text=...` to forward directly to WhatsApp school groups or parents.
     - Broadcast card feed: Pinned announcement highlighted in gold, delete/edit actions, and collapsible response thread.
   - **Guru / Wali Kelas View**:
     - Personalized feed displaying announcements targeted to them or "Semua".
     - Feedback submission box on announcements marked as "Dua Arah".

### 2.4 Modern UI Transitions & Animations (R5.4)
1. **Refining Global Keyframes & Classes in `globals.css`**:
   - Enhance `.btn-click`: replace abrupt `scale(0.92)` with `transition-all duration-200 cubic-bezier(0.16, 1, 0.3, 1)` and `active:scale-[0.97]`, adding subtle `hover:scale-[1.01]` and shadow lift.
   - Introduce `.card-interactive`: `transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg`.
   - Add refined page entry transition `.page-transition`:
     ```css
     @keyframes pageEnter {
       0% { opacity: 0; transform: translateY(8px) scale(0.995); }
       100% { opacity: 1; transform: translateY(0) scale(1); }
     }
     ```
   - Add modal pop animation `.modal-pop`:
     ```css
     @keyframes modalPop {
       0% { opacity: 0; transform: scale(0.96) translateY(6px); }
       100% { opacity: 1; transform: scale(1) translateY(0); }
     }
     ```
2. **Smooth View Transitions in `AppScreen.tsx`**:
   - Wrap the active view inside `<div key={currentView} className="page-transition">` to trigger seamless, modern page fade-and-rise animations on menu changes without page reload.

---

## 3. Caveats
1. **Student Picket Data**: Currently, `public.data_siswa` contains 16 sample student records. Penugasan piket allows assigning these students by class, but the school's historical picket records only had teachers. Seed data will initialize with existing teachers.
2. **WhatsApp Direct API vs Manual Forwarding**: While `public.pengaturan` has placeholder keys for Fonnte API (`WA_API_URL`, `WA_API_KEY: "-"`), third-party WhatsApp gateway keys may not be configured. The UI must therefore offer both direct `wa.me` share links (guaranteed to work everywhere without configuration) and API broadcast hooks.
3. **Database Types File**: The project currently lacks a centralized `src/types/database.ts`. Creating this file is recommended to ensure complete TypeScript safety across all new features.

---

## 4. Conclusion & Actionable Blueprint

### Action 1: Create Supabase Migration File
Create `supabase/migrations/20260912_informasi_dan_penugasan_piket.sql` with:
- Table `public.penugasan_piket` (with RLS policies and initial seed from `jadwal_piket`).
- Table `public.pengumuman` (with RLS policies and indexes).
- Table `public.pengumuman_tanggapan` (with cascade delete and RLS).
- Column addition to `public.bank_dokumen` (`mapel TEXT`, `kelas TEXT`).

### Action 2: Create TypeScript Types
Create `src/types/database.ts` exporting:
- `PenugasanPiket`, `Pengumuman`, `PengumumanTanggapan`, `BankDokumen`, `DataGuru`, `DataMapel`, `GuruMapel`.

### Action 3: Refactor `PiketView.tsx`
- Replace tab `"Isi Laporan"` with `"Penugasan Piket"` for Admins.
- Implement the day-by-day picket assignment manager for both Teachers and Students.
- Synchronize picket teachers to `jadwal_piket` to preserve `workflow.ts` integrity.
- Update "Beranda Piket" to render both assigned teachers and students.

### Action 4: Refactor `DokumenView.tsx`
- Remove tab `"Upload Baru"` for Admins.
- Implement the Teacher Matrix Card System displaying all 13 teachers, their assigned subjects, and indicators for the 6 Kurikulum Merdeka documents.
- Keep quick approval/rejection modal for document verification.

### Action 5: Create `InformasiView.tsx` & Update `AppScreen.tsx`
- Build `src/components/InformasiView.tsx` supporting broadcast creation, WhatsApp share integration, target audience filters, and two-way responses.
- In `AppScreen.tsx`: remove "Pantauan Harian" (`view-admin-monitor`) and add "Informasi" (`view-informasi`) in both Admin and Guru menus.

### Action 6: Enhance UI Animations in `globals.css`
- Add modern button hover/active transitions, card hover elevation, page entry keyframes, and modal pop animations.

---

## 5. Verification Method

### 5.1 Static Verification
1. **TypeScript Typecheck**:
   Run `npx tsc --noEmit` to verify 0 type errors across new and modified files.
2. **Lint Verification**:
   Run `npm run lint` or check modified components.

### 5.2 Functional Inspection Checklist
1. **Piket Tab Test**:
   - Login as Admin: Confirm tab "Isi Laporan" is absent; "Penugasan Piket" is present and functional.
   - In "Penugasan Piket": Assign a teacher and a student for "Senin", verify that both appear in list and that `jadwal_piket` is synchronized.
   - Login as Guru: Confirm "Penugasan Piket" is not visible.
2. **Dokumen Matrix Test**:
   - Login as Admin: Confirm tab "Upload Baru" is absent; Teacher Matrix cards are displayed with 6 document indicators and subject badges.
   - Test search and status filters.
3. **Informasi Menu Test**:
   - Check Sidebar: Confirm "Pantauan Harian" is gone and replaced by "Informasi".
   - Create a test broadcast targeted to "Guru" with mode "Dua Arah". Verify it renders in feed and allows comments.
   - Check WhatsApp broadcast button opens proper URL.
4. **Transition Inspection**:
   - Test button hover and click states for smooth micro-interactions.
   - Test switching views in sidebar and verify smooth `.page-transition` rendering.
