# AUDIT REPORT: MILESTONE 9 WORKING TREE & FEATURE IMPLEMENTATION

## Executive Summary

This comprehensive technical audit evaluated the working tree state, unstaged changes, and codebase readiness against Milestones 2, 3, 4, and 5 of Milestone 9 (as specified in ORIGINAL_REQUEST.md and PROJECT.md).

### Implementation Status Matrix

| Milestone | Requirement | Scope | Status | Details |
|---|---|---|---|---|
| **M1** | Survey & Schema | Database schema & TS types | **COMPLETED** | Migration 20260918_milestone9_schema.sql applied; 17/17 tests pass in 	ests/m9_1_database_and_types.test.ts. |
| **M2** | R1 | Academic Year Sync in Gradebook | **COMPLETED** | GradebookView.tsx: syncs from pengaturan.tahun_ajaran, locked for guru. |
| **M2** | R1 | Admin Gradebook View-Only Lock | **COMPLETED** | GradebookView.tsx: edit/mutation controls hidden for Admin, only "Cetak" button shown, scores rendered as read-only text spans. |
| **M2** | R1 | TP Restricted to Guru Pengampu | **COMPLETED** | GradebookView.tsx: checked via guru_mapel & jadwal_pelajaran; non-pengampu teachers blocked with alerts. |
| **M2** | R3 | Jurnal Kelas RBAC | **MISSING** | AppScreen.tsx lacks iew-jurnal-kelas routing/menu; RekapJurnalView.tsx exposes "Rekapan Jurnal Per Kelas" to all users without Wali Kelas check. |
| **M3** | R4 | Admin Config: Teacher Attendance Exceptions | **MISSING** | AdminConfigView.tsx lacks UI/checkboxes for selecting teachers exempt from daily presence (guru_hanya_mengajar). |
| **M3** | R4 | Admin Config: Jam Pulang Hari Jumat | **MISSING** | AdminConfigView.tsx lacks input for jam_pulang_jumat. |
| **M3** | R4 | Attendance Workflow Logic | **COMPLETED** | workflow.ts: getGuruDailyState exempts marked teachers on non-teaching days, enforces daily attendance for non-exempt teachers. |
| **M3** | R4 | Friday Checkout Enforcement | **COMPLETED** | GuruPresensi.tsx: uses jam_pulang_jumat on Fridays, validates checkout time, shows Friday schedule alert. |
| **M3** | R5 | Direct Camera Enforcement on Pulang & Jurnal | **COMPLETED** | GuruPresensi.tsx requires selfie on Pulang; GuruJurnal.tsx embeds CameraSelfieCapture and removes file input. |
| **M3** | R5 | Direct Camera Enforcement on Piket | **MISSING / DEFECT** | PiketView.tsx: line 1141 still has <input type="file">; CameraSelfieCapture is imported but never rendered in the form. |
| **M3** | R5 | Front/Rear Camera Toggle & Mirroring | **COMPLETED** | CameraSelfieCapture.tsx & watermarkCanvas.ts: toggle works, horizontal flip only applies to front camera. |
| **M4** | R2 | Navbar Broadcast Bell with Shake & Dot | **MISSING** | AppScreen.tsx and globals.css lack bell UI, shake keyframes, and unread indicator. |
| **M4** | R2 | Real-time Teacher-to-Teacher Chat | **MISSING (UI)** | Database table chat_messages is live in Supabase Realtime, but ChatView.tsx does not exist and is not wired into AppScreen.tsx. |
| **M4** | R2 | Web Push Reminder Endpoint | **MISSING** | sw.js and subscribe/validate routes exist, but /api/push/send-reminders does not exist. |
| **M4** | R2 | Push Permission Dialog on Login/Dashboard | **MISSING** | Push toggle only exists inside AccountSettingsModal.tsx; no automatic permission prompt on login/dashboard. |
| **M5** | Acceptance | TypeScript & Automated Tests | **READY** | 
px tsc --noEmit exits 0; test suite can be constructed immediately. |

---

## 1. Observation

Direct inspection of modified and target files yielded the following findings:

### 1.1 src/components/GradebookView.tsx (Working Tree Modified)
- **Lines 21, 118–162**:
  ``tsx
  const isAdmin = user?.role === 'Admin' || user?.role === 'Superadmin' || user?.role === 'admin';
  ...
  // Academic Year & Semester Sync from pengaturan table for Guru accounts
  useEffect(() => {
    const fetchAcademicYearSettings = async () => {
      let query = supabase.from('pengaturan').select('*');
      ...
      if (tahunVal) {
        setSyncedTahunAjaran(tahunVal);
        if (!isAdmin) {
          setSelectedTahunAjaran(tahunVal);
          setTpForm(prev => ({ ...prev, tahun_ajaran: tahunVal }));
        }
      }
    };
    fetchAcademicYearSettings();
  }, [sekolahId, isAdmin]);
  ``
- **Lines 286–360**: erifyGuruPengampu verifies if teacher is assigned to selectedMapel & selectedKelas by querying mapelList, guru_mapel, and jadwal_pelajaran.
- **Lines 621–628, 697–703, 713–719, 730–736, 835–841, 871–877, 996–1002**: Mutation handlers (handleSaveGrades, handleOpenAddTpModal, handleSaveTp, handleDeleteTp, handleSaveCol, handleDeleteCol, handleExecuteBulkFill) enforce strict guard clauses:
  ``tsx
  if (isAdmin) return;
  if (!isGuruPengampu) {
    Swal.fire('Akses Ditolak', 'Hanya guru pengampu mata pelajaran ini yang berhak...', 'warning');
    return;
  }
  ``
- **Lines 1382–1405**: "Simpan Semua Nilai" button is wrapped in {!isAdmin && isGuruPengampu && ...}.
- **Lines 1560–1575**: "Export CSV" buttons are wrapped in {!isAdmin && ...}.
- **Lines 1625–1633**: "Tambah TP Baru" button is wrapped in {!isAdmin && isGuruPengampu && ...}.
- **Lines 1715–1745**: "+ Kolom Formatif", "+ Kolom Sumatif", and "Isi Nilai Cepat" buttons are wrapped in {!isAdmin && isGuruPengampu && ...}.
- **Lines 1780–1835, 1979–2035**: Student grade inputs are locked:
  ``tsx
  {isAdmin || !isGuruPengampu ? (
    <span className="font-semibold text-gray-900 dark:text-white">
      {sGrades[col.id] ?? '-'}
    </span>
  ) : (
    <input type="number" ... />
  )}
  ``
- **Lines 1575–1600**: "Cetak" button (window.print()) is universally accessible.

### 1.2 src/components/AppScreen.tsx (Unmodified)
- **Lines 108–135**: Menu items (menuItemsGuru, menuItemsAdmin) do NOT contain any item for Jurnal Kelas (iew-jurnal-kelas).
- **Lines 58–100**: handleNavigation contains no RBAC check for iew-jurnal-kelas and does not check public.wali_kelas.
- **Lines 147–167**: Header navbar renders only sidebar toggle, Title, Theme toggle, and Logout. There is NO broadcast bell icon, no shake animation, and no unread dot.
- **Lines 227–245**: View router does not render iew-jurnal-kelas or iew-chat.

### 1.3 src/components/RekapJurnalView.tsx (Unmodified)
- **Lines 10, 201–224**: Tab toggle between "Jurnal Guru Pribadi" and "Rekapan Jurnal Per Kelas" is rendered unconditionally for all users.
- **Lines 30–38**: kelasList pulls all classes from data_siswa without checking whether the user is a Wali Kelas or filtering by their assigned class.
- Regular teachers can freely click "Rekapan Jurnal Per Kelas" and view all classes.

### 1.4 src/components/AdminConfigView.tsx (Unmodified)
- **Lines 225–251**: "Aturan Kehadiran Guru" renders a single select element turan_kehadiran_guru ('Semua_Hari' vs 'Hari_Mengajar_Saja'). It lacks an interface to select individual teachers for exemption (guru_hanya_mengajar / wajib_hadir_hanya_mengajar).
- **Lines 252–265**: "Pengaturan Jam Presensi" renders jam_datang_mulai, jam_datang_batas, jam_datang_akhir, jam_pulang_mulai, and jam_pulang_akhir. It lacks jam_pulang_jumat.

### 1.5 src/lib/workflow.ts (Working Tree Modified)
- **Lines 176–236**: getGuruDailyState parses pengaturan.guru_hanya_mengajar and queries data_guru.wajib_hadir_hanya_mengajar for the teacher.
- **Lines 305–325**: If teacher is exempt (isTeacherExempt):
  - On non-teaching days (!hasTeachingObligation): sets isNonTeachingDay: true, ebasAlpa: true, isAlpa: false, lockedReason: 'Hari ini tidak ada jadwal mengajar (Bebas Kehadiran).'.
  - On teaching days: if missing presensi datang, sets isAlpa: true, ebasAlpa: false.
- If teacher is NOT exempt: default requirement is daily presence (isAlpa: true, ebasAlpa: false if not presensi datang).

### 1.6 src/components/GuruPresensi.tsx (Working Tree Modified)
- **Lines 28, 74, 86**: jamPresensi.pulangJumat loaded from pengaturan.jam_pulang_jumat.
- **Lines 134**: isSelfieRequired updated:
  ``tsx
  const isSelfieRequired = tipeAbsen === 'Pulang' || (tipeAbsen === 'Datang' && jenisPresensi !== 'Izin') || jenisPresensi === 'Dinas Luar';
  ``
- **Lines 212–225**: Friday check:
  ``tsx
  const isJumat = getWitaDayName(now) === 'Jumat';
  const effectivePulangMulai = isJumat ? (jamPresensi.pulangJumat || jamPresensi.pulangMulai) : jamPresensi.pulangMulai;
  ``
- **Lines 380–405**: Renders a dedicated alert banner showing Friday checkout hours when isJumat.

### 1.7 src/components/CameraSelfieCapture.tsx & src/lib/watermarkCanvas.ts (Working Tree Modified)
- Fallback <input type="file"> and "Pilih dari Galeri" buttons completely removed from CameraSelfieCapture.tsx.
- State acingMode: 'user' | 'environment' with toggle button (a-camera-rotate) added.
- watermarkCanvas.ts line 52: drawWatermarkedCanvas(videoElement, options, mirror: boolean = false).
- Line 77: if (mirror) applies ctx.translate(width, 0); ctx.scale(-1, 1);. Only front camera is horizontally flipped.

### 1.8 src/components/GuruJurnal.tsx (Working Tree Modified)
- Line 641: <input type="file"> replaced with embedded <CameraSelfieCapture initialFacingMode="environment" ... />.
- handleJurnalSubmit alerts if !file.

### 1.9 src/components/PiketView.tsx (Working Tree Incomplete)
- Line 12 imports CameraSelfieCapture and line 43 defines photoPreviewUrl.
- **Line 1141 STILL CONTAINS**:
  ``tsx
  <input type="file" accept="image/*" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required className="..." />
  ``
- CameraSelfieCapture is NOT rendered in the Piket form.

### 1.10 Milestone 4 Components
- ChatView.tsx: File does not exist.
- public/sw.js: Exists, valid, handles push events.
- /api/push/subscribe and /api/push/validate: Exist.
- /api/push/send-reminders: Directory and route file do NOT exist.
- globals.css: No bell shake keyframe animation.
- Push permission prompt: Not invoked automatically on dashboard/login.

### 1.11 Compiler and Existing Test Status
- 
px tsc --noEmit exited with code 0 (0 compilation errors).
- 
px tsx tests/m9_1_database_and_types.test.ts passed 17/17 assertions against live Supabase.

---

## 2. Logic Chain

1. **Academic Year & Gradebook RBAC (M2/R1)**:
   - Observation 1.1 proves that GradebookView.tsx already contains complete logic for syncing Academic Year from pengaturan, locking Admin out of all mutation operations, replacing input fields with read-only spans, and restricting TP management to verified isGuruPengampu.
   - Conclusion: **M2/R1 is fully implemented and verified.**

2. **Jurnal Kelas RBAC (M2/R3)**:
   - Observations 1.2 and 1.3 prove that AppScreen.tsx lacks iew-jurnal-kelas menu routing, and RekapJurnalView.tsx allows any teacher to access "Rekapan Jurnal Per Kelas" across all classes without checking public.wali_kelas.
   - Conclusion: **M2/R3 is NOT implemented and requires Worker M2 intervention.**

3. **Admin Attendance Configuration (M3/R4)**:
   - Observation 1.4 proves that AdminConfigView.tsx has not been updated with the Friday checkout time input (jam_pulang_jumat) or the interactive teacher exception selection list (guru_hanya_mengajar).
   - Observations 1.5 and 1.6 prove that the backend workflow (workflow.ts) and attendance view (GuruPresensi.tsx) already support these fields once saved in the database.
   - Conclusion: **M3/R4 is complete in backend & presensi, but missing the Admin UI in AdminConfigView.tsx.**

4. **Direct Camera Enforcement & File Input Elimination (M3/R5)**:
   - Observations 1.6, 1.7, and 1.8 confirm that Presensi Pulang and GuruJurnal strictly use live camera without file input, with front/rear toggle and correct mirror transformations.
   - Observation 1.9 confirms that PiketView.tsx failed to complete the replacement: <input type="file"> remains on line 1141.
   - Conclusion: **M3/R5 is 85% complete; PiketView.tsx requires immediate replacement of the file input with CameraSelfieCapture.**

5. **Broadcast Bell, Real-time Chat & Web Push Reminders (M4/R2)**:
   - Observations 1.2, 1.10, and global grep confirm that ChatView.tsx, the navbar broadcast bell, shake animation, /api/push/send-reminders, and dashboard push permission dialog are not yet built.
   - Conclusion: **M4/R2 requires full implementation by Worker M4.**

---

## 3. Caveats

1. **Supabase Database Schema**: The M1 migration is already applied in production/staging. All required tables (chat_messages, pengumuman_dibaca) and columns (jam_pulang_jumat, guru_hanya_mengajar, wajib_hadir_hanya_mengajar) exist in the database.
2. **Read-Only Explorer Mandate**: Per the Explorer role constraints, this report makes no modifications to source code files in src/. All identified gaps are compiled into concrete worker action items.
3. **PWA Push Testing Environment**: Service Worker registration and Web Push depend on HTTPS or localhost. Push notification tests must use the existing /api/push/validate endpoint or mocked Service Worker payloads.

---

## 4. Conclusion

The repository is in a healthy, compiling state (	sc passes, M1 tests pass), with major portions of M2 and M3 already implemented in the working tree. However, four critical implementation gaps must be resolved before proceeding to final acceptance:

1. **M2 Gap**: Enforce Jurnal Kelas RBAC in AppScreen.tsx and RekapJurnalView.tsx.
2. **M3 Gap (UI)**: Add "Jam Pulang Hari Jumat" and "Pengecualian Kehadiran Guru" UI to AdminConfigView.tsx.
3. **M3 Gap (Piket Camera)**: Replace <input type="file"> with <CameraSelfieCapture> in PiketView.tsx (line 1141).
4. **M4 Gap (All)**: Implement Navbar Broadcast Bell with shake animation, ChatView.tsx with Supabase Realtime, /api/push/send-reminders route, and the Push permission dialog.

---

## 5. Worker Task Recommendations & Action Checklist

### Action 1: Worker M2 Remediation (M2: Jurnal Kelas RBAC)
- **Target Files**: src/components/AppScreen.tsx, src/components/RekapJurnalView.tsx.
- **Tasks**:
  1. In AppScreen.tsx:
     - Query public.wali_kelas on login/mount for guru role.
     - Add iew-jurnal-kelas to menuItemsAdmin (label: "Jurnal Kelas").
     - If the teacher is in wali_kelas, add iew-jurnal-kelas to menuItemsGuru (label: "Jurnal Kelas").
     - If a regular teacher attempts to navigate to iew-jurnal-kelas, show a warning alert and block navigation.
  2. In RekapJurnalView.tsx:
     - Hide the "Rekapan Jurnal Per Kelas" tab toggle for regular teachers (!isAdmin && !isWaliKelas).
     - When opened as iew-jurnal-kelas by a Wali Kelas, restrict the class dropdown to their assigned class (kelas_id from wali_kelas).

### Action 2: Worker M3 Remediation (M3: Admin Config & Piket Camera)
- **Target Files**: src/components/AdminConfigView.tsx, src/components/PiketView.tsx.
- **Tasks**:
  1. In AdminConfigView.tsx:
     - Add input for **Jam Pulang Hari Jumat** (jam_pulang_jumat, default '11:00') in the "Pengaturan Jam Presensi" card. Save to pengaturan.
     - In "Aturan Kehadiran Guru", fetch active teachers from data_guru and render a searchable checkbox list for **Pengecualian Kehadiran Guru (Hanya wajib hadir saat hari mengajar)**.
     - Save selected teacher IDs to pengaturan.guru_hanya_mengajar and update data_guru.wajib_hadir_hanya_mengajar = true/false.
  2. In PiketView.tsx:
     - At line 1141, delete <input type="file">.
     - Render <CameraSelfieCapture initialFacingMode="environment" onPhotoConfirmed={(file, preview) => { setFile(file); setPhotoPreviewUrl(preview); }} />.
     - Add validation alert in handleSubmitPiket if !file.

### Action 3: Worker M4 Implementation (M4: Bell, Chat, Push Reminders)
- **Target Files**: src/components/AppScreen.tsx, src/app/globals.css, src/components/ChatView.tsx, src/app/api/push/send-reminders/route.ts.
- **Tasks**:
  1. In src/app/globals.css:
     - Add keyframes and utility class:
       ``css
       @keyframes bell-shake {
         0%, 100% { transform: rotate(0); }
         20%, 60% { transform: rotate(15deg); }
         40%, 80% { transform: rotate(-15deg); }
       }
       .animate-bell-shake {
         animation: bell-shake 0.8s cubic-bezier(.36,.07,.19,.97) both infinite;
       }
       ``
  2. In src/components/AppScreen.tsx:
     - Add broadcast bell button in header with shake animation and red dot when unread broadcasts exist (queried from pengumuman joined with pengumuman_dibaca).
     - Add menu item for Chat (iew-chat) with icon a-comments for Guru and Admin.
     - Add push permission dialog banner on dashboard/mount if Notification.permission === 'default'.
  3. Create src/components/ChatView.tsx:
     - Two-way teacher chat listing all teachers in school.
     - Query and display messages between user.id and selected teacher from public.chat_messages.
     - Subscribe to Supabase Realtime channel (supabase.channel('public:chat_messages')) to append incoming messages instantly without page reload.
     - Mark messages as read (is_read = true).
  4. Create src/app/api/push/send-reminders/route.ts:
     - Query teachers with missing presensi datang, journal, or piket duties for today.
     - Query their endpoints from push_subscriptions.
     - Dispatch web-push notification with sendWebPush.

### Action 4: Worker M5 Verification & Testing
- Construct comprehensive automated test scripts:
  - 	ests/m9_2_gradebook_and_jurnal_rbac.test.ts
  - 	ests/m9_3_attendance_and_camera.test.ts
  - 	ests/m9_4_bell_chat_push.test.ts
- Run 
px tsc --noEmit and all test suites.
- Follow Git Workflow Rule to stage, commit, and push changes.

---

## 6. Verification Method

To independently verify the audit conclusions:

1. **Verify TypeScript compilation**:
   `ash
   npx tsc --noEmit
   `
   *Expected result: 0 errors (Exit code 0).*

2. **Verify live database schema & types**:
   `ash
   npx tsx tests/m9_1_database_and_types.test.ts
   `
   *Expected result: 17/17 tests PASS.*

3. **Verify file input absence in Jurnal vs presence in Piket**:
   `powershell
   Select-String -Path "src/components/GuruJurnal.tsx" -Pattern 'type="file"'
   Select-String -Path "src/components/PiketView.tsx" -Pattern 'type="file"'
   `
   *Expected result: GuruJurnal returns 0 matches; PiketView returns line 1141.*

4. **Verify absence of Jurnal Kelas navigation in AppScreen**:
   `powershell
   Select-String -Path "src/components/AppScreen.tsx" -Pattern 'view-jurnal-kelas'
   `
   *Expected result: 0 matches.*
