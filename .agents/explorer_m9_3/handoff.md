# Handoff Report — Explorer 3 (Milestone 9)
**Scope**: R4 (Admin Attendance & Schedule Settings) and R5 (Direct Camera Integration & Enforcement)
**Date**: 2026-09-18
**Author**: Explorer 3 (explorer_m9_3)

---

## 1. Observation

### 1.1 R4: Pengaturan Kehadiran & Jadwal (Admin)
- **Admin Settings View**: src/components/AdminConfigView.tsx
  - Current configuration state (config, lines 10-36):
    - hari_sekolah: '6' (lines 15, 209-223)
    - turan_kehadiran_guru: 'Semua_Hari' (lines 16, 225-251)
    - jam_pulang_mulai: '11:00', jam_pulang_akhir: '22:00' (lines 21-22, 259-262)
    - Currently **no** jam_pulang_jumat configuration exists in config state or in the UI.
    - Currently turan_kehadiran_guru is a global school-wide single select dropdown (Semua_Hari vs Hari_Mengajar_Saja). There is **no interface to configure attendance obligations per teacher** or define exceptions.
  - Save routine (lines 143-160):
    - Upserts key-value entries into public.pengaturan.
    - Also updates columns turan_kehadiran_guru and email_tujuan_upload on public.pengaturan.

- **Database Tables**:
  - public.pengaturan (src/types/database.ts lines 651-680; migration 20260917_comprehensive_features.sql line 182):
    - Columns: id (UUID PK), sekolah_id (UUID), key (TEXT), alue (TEXT), turan_kehadiran_guru (TEXT), email_tujuan_upload (TEXT).
  - public.data_guru (src/types/database.ts lines 177-217):
    - Columns: id (UUID PK), sekolah_id (UUID), 
ama_guru (TEXT), 
ip (TEXT), mata_pelajaran (TEXT), 
o_hp (TEXT), email (TEXT), status (TEXT).
    - Currently **no** per-teacher column for attendance obligation (e.g. wajib_hadir_hanya_mengajar).

- **Attendance & Alpa Calculation in Workflow**: src/lib/workflow.ts
  - Function getGuruDailyState(namaGuru: string, username?: string) (lines 117-374):
    - Queries pengaturan for turan_kehadiran_guru (lines 161-179).
    - If state.aturanKehadiran === 'Hari_Mengajar_Saja' and teacher has no teaching schedule and no picket duty today (!hasTeachingObligation, line 256):
      - state.isNonTeachingDay = true;
      - state.bebasAlpa = true;
      - state.isAlpa = false;
      - state.lockedReason = 'Hari ini tidak ada jadwal mengajar atau piket (Bebas Kehadiran).';
    - If teacher is under default mode ('Semua_Hari') and has not checked in (!state.presensiDatang, line 265):
      - state.isAlpa = true;
      - state.bebasAlpa = false;
      - state.lockedReason = 'Anda belum melakukan Presensi Datang hari ini.';
  - In src/components/AdminVerifView.tsx (lines 283-315):
    - unsubmittedPresensi lists teachers who have not checked in. If a teacher is exempt on a non-teaching day, they currently appear in unsubmitted presensi because AdminVerifView does not cross-reference the exemption rule.
  - In src/components/HomeView.tsx (lines 266-395):
    - Status table lists all teachers. Teachers without presensi show "Belum Datang" regardless of whether they have the teaching-day-only exception.

- **Friday Return Time Enforcement**:
  - In src/components/GuruPresensi.tsx:
    - Lines 73-89: Fetches ['jam_datang_mulai', 'jam_datang_batas', 'jam_datang_akhir', 'jam_pulang_mulai', 'jam_pulang_akhir'] from pengaturan.
    - Lines 211-221: Validates pulang checkout:
      `	ypescript
      const startVal = parseTime(jamPresensi.pulangMulai);
      const akhirVal = parseTime(jamPresensi.pulangAkhir);
      if (currTimeVal < startVal) {
        return Swal.fire('Belum Waktunya', Presensi pulang baru dibuka jam  WITA., 'warning');
      }
      `
    - Currently ignores whether today is Friday (getWitaDayName(now) === 'Jumat').

---

### 1.2 R5: Integrasi & Aturan Kamera Langsung
- **Form 1: Presensi Pulang (src/components/GuruPresensi.tsx)**:
  - Line 131:
    const isSelfieRequired = (tipeAbsen === 'Datang' && jenisPresensi !== 'Izin') || jenisPresensi === 'Dinas Luar';
    - Notice: When 	ipeAbsen === 'Pulang' and jenisPresensi === 'Sekolah', isSelfieRequired is currently **FALSE**. No camera is shown!
  - Lines 430-451: <CameraSelfieCapture> is only rendered if isSelfieRequired is true.
  - Lines 411-425: Has <input type="file" accept="image/*,.pdf" ... /> for jenisPresensi === 'Izin' && tipeAbsen === 'Datang'.

- **Form 2: Jurnal Pembelajaran (src/components/GuruJurnal.tsx)**:
  - Line 635:
    <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
  - Teachers currently pick existing files/photos from their device storage/gallery.
  - Lines 287-295: handleJurnalSubmit uploads ile using uploadToDrive(file, user.nama, tipeJurnal, 'Jurnal') and writes ileUrl to link_bukti_foto.

- **Form 3: Laporan Piket (src/components/PiketView.tsx)**:
  - Line 1139:
    <input type="file" accept="image/*" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
  - Teachers currently pick existing files/photos from their device storage/gallery.
  - Lines 273-281: handlePiketSubmit uploads ile using uploadToDrive(file, user.nama, 'Laporan_Piket', 'Piket') and writes ileUrl to link_foto.

- **Camera Component (src/components/CameraSelfieCapture.tsx)**:
  - Line 74: Checks 
avigator.mediaDevices.getUserMedia.
  - Line 82: Hardcoded acingMode: 'user'. No support for back/environment camera.
  - Lines 252: Applies 	ransform -scale-x-100 (mirroring) unconditionally to <video>.
  - Lines 310-317: Contains hidden fallback <input ref={fileInputRef} type="file" accept="image/*" capture="user" ... />.
  - Lines 346-352: Contains manual file upload button with <i className="fa-solid fa-upload"></i>.
  - Lines 280-285: In error state, contains button "Pilih Foto dari Perangkat".

- **Watermark Engine (src/lib/watermarkCanvas.ts)**:
  - Lines 76-85: Automatically draws HTMLVideoElement with horizontal flip ctx.scale(-1, 1):
    `	ypescript
    if (videoElement instanceof HTMLVideoElement) {
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, 0, 0, width, height);
      ctx.restore();
    }
    `
    If back camera is used, unconditionally flipping results in horizontally mirrored photos (backward text). Needs a parameter mirror: boolean (true for front camera, false for back camera).

---

## 2. Logic Chain

`
[Requirement R4] Admin defines teacher attendance exception (Hadir khusus hari mengajar)
  --> Default: Wajib hadir setiap hari kerja
  --> Store exception list per teacher in DB (pengaturan key 'guru_hanya_mengajar' and/or data_guru.wajib_hadir_hanya_mengajar)
  --> AdminConfigView provides an interactive UI to check/uncheck teachers with this exception
  --> getGuruDailyState(namaGuru, username) in workflow.ts:
        Check if teacher has exception. If YES -> evaluate if teaching day (schedule > 0 || isPiket).
        If non-teaching day -> isAlpa: false, bebasAlpa: true, isNonTeachingDay: true.
        If NO (default) -> teacher is required every day; if missing attendance -> isAlpa: true.

[Requirement R4] Admin defines Friday Checkout Time ("Jam Pulang Hari Jumat")
  --> AdminConfigView adds input jam_pulang_jumat under "Pengaturan Jam Presensi"
  --> Saved to pengaturan (key: 'jam_pulang_jumat', value: '11:00')
  --> GuruPresensi.tsx loads jam_pulang_jumat
  --> On checkout (Pulang):
        Check if today is Friday (getWitaDayName() === 'Jumat')
        If Friday: effective checkout opening time is jam_pulang_jumat (fallback to jam_pulang_mulai)
        If not Friday: effective checkout opening time is jam_pulang_mulai
        Enforce in validation alert and display in UI card

[Requirement R5] Direct camera integration & removal of gallery upload in Presensi Pulang, Jurnal, Piket
  --> Presensi Pulang:
        Update isSelfieRequired in GuruPresensi.tsx:
        const isSelfieRequired = (tipeAbsen === 'Datang' && jenisPresensi !== 'Izin') || tipeAbsen === 'Pulang';
        Renders live camera viewfinder with snap & confirm.
  --> Jurnal Pembelajaran:
        Remove <input type="file"> at GuruJurnal.tsx:635.
        Render live camera component with viewfinder, capture shutter, and front/back toggle.
        Captured snapshot converts to File for uploadToDrive.
  --> Laporan Piket:
        Remove <input type="file"> at PiketView.tsx:1139.
        Render live camera component with viewfinder, capture shutter, and front/back toggle.
        Captured snapshot converts to File for uploadToDrive.
  --> Camera Component (CameraSelfieCapture.tsx):
        Remove all <input type="file"> and gallery upload buttons.
        Add state acingMode: 'user' | 'environment'.
        Add toggle button to switch front/back camera.
        Mirror video stream only when acingMode === 'user'.
        In watermarkCanvas.ts, pass mirror: facingMode === 'user'.
`

---

## 3. Detailed Implementation Plan

### 3.1 Database Migration (supabase/migrations/20260918_attendance_rules_camera.sql)
`sql
-- 1. Add Friday checkout time & teacher exemption list columns to pengaturan
ALTER TABLE public.pengaturan ADD COLUMN IF NOT EXISTS jam_pulang_jumat TEXT DEFAULT '11:00';
ALTER TABLE public.pengaturan ADD COLUMN IF NOT EXISTS guru_hanya_mengajar TEXT DEFAULT '[]';

-- 2. Add attendance exception flag to data_guru
ALTER TABLE public.data_guru ADD COLUMN IF NOT EXISTS wajib_hadir_hanya_mengajar BOOLEAN DEFAULT FALSE;
`

### 3.2 Update Database Types (src/types/database.ts)
- In pengaturan:
  - jam_pulang_jumat?: string | null
  - guru_hanya_mengajar?: string | null
- In data_guru:
  - wajib_hadir_hanya_mengajar?: boolean | null

### 3.3 Admin Settings UI (src/components/AdminConfigView.tsx)
1. **Add jam_pulang_jumat to configuration**:
   - In state: jam_pulang_jumat: '11:00'
   - In etchConfig: read item.key === 'jam_pulang_jumat' (or item.jam_pulang_jumat).
   - In UI under "Pengaturan Jam Presensi" (around line 262):
     `	sx
     <div>
       <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">
         Jam Pulang Hari Jumat
       </label>
       <input 
         type="time" 
         name="jam_pulang_jumat" 
         value={config.jam_pulang_jumat || '11:00'} 
         onChange={handleChange} 
         required 
         className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
       />
       <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
         Waktu pembukaan presensi pulang khusus pada hari Jumat.
       </p>
     </div>
     `
   - In handleSave: upsert { key: 'jam_pulang_jumat', value: saveConfig.jam_pulang_jumat }.

2. **Add Teacher Exception Picker under "Aturan Kehadiran Guru"**:
   - Fetch active teachers from data_guru when component mounts.
   - Maintain state exemptTeacherIds: string[] (or exemptTeacherNames: string[]).
   - Render an interactive selector where admin can search and check/uncheck teachers:
     - Header: "Pengecualian Kehadiran Guru (Hanya Wajib Hadir Saat Hari Mengajar)"
     - Subtitle: "Secara default, seluruh guru wajib hadir setiap hari kerja. Centang guru di bawah ini yang hanya diwajibkan hadir pada hari mereka memiliki jadwal mengajar atau tugas piket."
     - Teacher list card with checkbox, Avatar/Initials, Nama Guru, NIP, Mapel, and status pill ("Hanya Hari Mengajar" vs "Wajib Hadir Setiap Hari Kerja").
   - In handleSave:
     - Save exemptTeacherNames to pengaturan under key 'guru_hanya_mengajar' as JSON string.
     - Update data_guru: set wajib_hadir_hanya_mengajar = true for checked teachers, alse for others.

### 3.4 Workflow Logic (src/lib/workflow.ts)
In getGuruDailyState(namaGuru: string, username?: string):
1. When loading pengaturan:
   `	ypescript
   const ghmRow = pengaturanRows.find((p: any) => p.key === 'guru_hanya_mengajar');
   let exemptTeachers: string[] = [];
   if (ghmRow && ghmRow.value) {
     try {
       exemptTeachers = JSON.parse(ghmRow.value);
     } catch {
       exemptTeachers = ghmRow.value.split(',').map((s: string) => s.trim());
     }
   }
   `
2. Determine rule for this specific teacher:
   `	ypescript
   const normalizeName = (s: string) => (s || '').toLowerCase().trim().replace(/z/g, 's');
   const isExemptTeacher = exemptTeachers.some(tName => {
     const nT = normalizeName(tName);
     return nT === normalizeName(namaGuru) || (username && nT === normalizeName(username));
   });

   // If teacher is exempt -> 'Hari_Mengajar_Saja'.
   // If school has global 'Hari_Mengajar_Saja' -> 'Hari_Mengajar_Saja'.
   // Otherwise default -> 'Semua_Hari' (wajib hadir setiap hari kerja).
   const teacherAturan = isExemptTeacher || aturanKehadiran === 'Hari_Mengajar_Saja' 
     ? 'Hari_Mengajar_Saja' 
     : 'Semua_Hari';

   state.aturanKehadiran = teacherAturan;
   `
3. Existing logic in lines 253-269 continues to apply accurately:
   - If 'Hari_Mengajar_Saja' and !hasTeachingObligation: isAlpa = false, ebasAlpa = true.
   - If 'Semua_Hari' and !presensiDatang: isAlpa = true, ebasAlpa = false.

### 3.5 Friday Checkout Enforcement (src/components/GuruPresensi.tsx)
1. In initConfig:
   - Fetch 'jam_pulang_jumat' from pengaturan.
   - Store in jamPresensi.pulangJumat.
2. In handlePresensiSubmit (lines 211-221):
   `	ypescript
   const dayName = getWitaDayName(now);
   const isFriday = dayName === 'Jumat';
   const effectivePulangMulai = (isFriday && jamPresensi.pulangJumat) 
     ? jamPresensi.pulangJumat 
     : jamPresensi.pulangMulai;

   const startVal = parseTime(effectivePulangMulai);
   const akhirVal = parseTime(jamPresensi.pulangAkhir);

   if (currTimeVal < startVal) {
     return Swal.fire('Belum Waktunya', Presensi pulang baru dibuka jam  WITA., 'warning');
   }
   `
3. In schedule info display:
   Show Friday checkout time prominently if today is Friday.

### 3.6 Direct Camera Enhancement (src/components/CameraSelfieCapture.tsx)
1. **Props Extension**:
   `	ypescript
   export interface CameraSelfieCaptureProps {
     onPhotoConfirmed: (file: File, previewUrl: string) => void;
     onCancel?: () => void;
     initialCoordinates?: WatermarkCoordinates | null;
     existingPhotoUrl?: string | null;
     defaultFacingMode?: 'user' | 'environment';
     title?: string;
     enableWatermark?: boolean;
   }
   `
2. **Remove File Gallery Upload**:
   - Remove <input ref={fileInputRef} type="file" ... /> (lines 310-317).
   - Remove file upload button (lines 346-352).
   - Remove error-state "Pilih Foto dari Perangkat" button (lines 280-285).
3. **Camera Switching**:
   - State: const [facingMode, setFacingMode] = useState<'user' | 'environment'>(defaultFacingMode || 'user');
   - In startCamera:
     `	ypescript
     const constraints: MediaStreamConstraints = {
       video: {
         facingMode: { ideal: facingMode },
         width: { ideal: 1280, max: 1920 },
         height: { ideal: 720, max: 1080 },
       },
       audio: false,
     };
     `
   - Camera flip toggle:
     `	ypescript
     const handleToggleFacingMode = () => {
       stopCamera();
       setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
     };
     `
   - Mirroring: Only apply -scale-x-100 when acingMode === 'user'.
   - Flip button UI: Render next to capture button or in top-right corner of viewfinder:
     `	sx
     <button
       type="button"
       onClick={handleToggleFacingMode}
       title={Ganti ke }
       className="p-2.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-xs"
     >
       <i className="fa-solid fa-camera-rotate text-sm"></i>
     </button>
     `
   - Viewfinder label: Dynamically show "Kamera Depan (Selfie)" vs "Kamera Belakang (Objek/Kelas)".

### 3.7 Watermark Engine Update (src/lib/watermarkCanvas.ts)
In WatermarkOptions, add optional mirror?: boolean:
`	ypescript
export interface WatermarkOptions {
  timestamp: string;
  coordinates: WatermarkCoordinates | null;
  dateText: string;
  mirror?: boolean; // true for front camera, false for back camera
}
`
In drawWatermarkedCanvas:
`	ypescript
if (videoElement instanceof HTMLVideoElement && options.mirror !== false) {
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoElement, 0, 0, width, height);
  ctx.restore();
} else {
  ctx.drawImage(videoElement, 0, 0, width, height);
}
`

### 3.8 Form Updates in Presensi Pulang, Jurnal, and Piket
1. **Presensi Pulang (src/components/GuruPresensi.tsx)**:
   - Update line 131:
     const isSelfieRequired = (tipeAbsen === 'Datang' && jenisPresensi !== 'Izin') || tipeAbsen === 'Pulang';
   - When checking out (	ipeAbsen === 'Pulang'), the camera component is rendered, requiring a photo before submit.
2. **Jurnal Pembelajaran (src/components/GuruJurnal.tsx)**:
   - Replace <input type="file"> at line 635 with:
     `	sx
     <div>
       <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1 flex items-center justify-between">
         <span><i className="fa-solid fa-camera text-blue-500 mr-1"></i> Foto Dokumentasi KBM <span className="text-red-500">(Wajib Kamera Langsung)</span></span>
         {file && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Foto Terpasang</span>}
       </label>
       <CameraSelfieCapture
         key="jurnal-camera"
         defaultFacingMode="environment"
         title="Kamera Kegiatan Pembelajaran"
         onPhotoConfirmed={(capturedFile, previewUrl) => {
           setFile(capturedFile);
         }}
       />
     </div>
     `
3. **Laporan Piket (src/components/PiketView.tsx)**:
   - Replace <input type="file"> at line 1139 with:
     `	sx
     <div>
       <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1 flex items-center justify-between">
         <span><i className="fa-solid fa-camera text-teal-500 mr-1"></i> Foto Dokumentasi Piket <span className="text-red-500">(Wajib Kamera Langsung)</span></span>
         {file && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Foto Terpasang</span>}
       </label>
       <CameraSelfieCapture
         key="piket-camera"
         defaultFacingMode="environment"
         title="Kamera Dokumentasi Piket"
         onPhotoConfirmed={(capturedFile, previewUrl) => {
           setFile(capturedFile);
         }}
       />
     </div>
     `

---

## 4. Caveats

1. **Browser Camera Permissions**:
   - 
avigator.mediaDevices.getUserMedia requires HTTPS (or localhost) and user permission. On devices with only a single camera (e.g. desktop webcams), attempting to switch to environment should gracefully fall back to the available camera without throwing an unhandled exception (using { ideal: facingMode }).
2. **Existing Test Preservation**:
   - 	ests/m3_selfie_watermark.test.ts asserts:
     - CameraSelfieCapture.tsx exists and uses 
avigator.mediaDevices.getUserMedia
     - Contains acingMode: 'user' (default front)
     - Contains drawWatermarkedCanvas
     - Contains Foto Ulang and Gunakan Foto
     - Contains stopCamera
   - 	ests/m5_push_settings.test.ts asserts:
     - AdminConfigView.tsx contains turan_kehadiran_guru, Hari_Mengajar_Saja, Semua_Hari
     - workflow.ts contains turan_kehadiran_guru, Hari_Mengajar_Saja, ebasAlpa, isNonTeachingDay
   - All these exact strings must be preserved so previous milestone tests do not fail.
3. **No Unintentional Breaking Changes**:
   - Izin/Sakit medical certificate upload in GuruPresensi.tsx (for Datang only) handles document proof (PDF/Doctor letter). R5 specifies: "Presensi pulang, Jurnal, dan Laporan Piket wajib menggunakan input kamera langsung melalui browser. Opsi untuk upload file gambar (dari galeri) harus ditiadakan pada form-form tersebut." Presensi Datang Izin remains intact as intended.

---

## 5. Conclusion

- **R4 Scope**: Fully resolved design.
  1. AdminConfigView.tsx gets a dedicated "Pengecualian Kehadiran Guru" picker where Admin selects teachers with "Hanya wajib hadir saat hari mengajar". Other teachers default to "Wajib hadir setiap hari kerja". Stored in pengaturan under key 'guru_hanya_mengajar' and on data_guru.wajib_hadir_hanya_mengajar.
  2. workflow.ts evaluates attendance obligation per teacher, ensuring non-teaching days for exempt teachers yield isAlpa: false and ebasAlpa: true.
  3. AdminConfigView.tsx gets "Jam Pulang Hari Jumat" input; GuruPresensi.tsx checks day of week and enforces Friday return time on checkout.
- **R5 Scope**: Fully resolved design.
  1. All <input type="file"> elements and gallery upload buttons are eliminated from Presensi Pulang, Jurnal, and Piket forms.
  2. Live camera viewfinder via 
avigator.mediaDevices.getUserMedia is integrated into Presensi Pulang, Jurnal Pembelajaran, and Laporan Piket.
  3. Camera switching toggle between front (user) and back (environment) is implemented in CameraSelfieCapture.tsx with dynamic mirror correction in watermarkCanvas.ts.

---

## 6. Verification Method

1. **TypeScript Typecheck**:
   `ash
   npx tsc --noEmit
   `
   Must pass with exit code 0.

2. **Automated Test Suites**:
   `ash
   npx tsx tests/m3_selfie_watermark.test.ts
   npx tsx tests/m5_push_settings.test.ts
   npx tsx tests/challenger3_schedule_stress.test.ts
   npx tsx scripts/test-e2e-suite.ts
   `
   All tests must pass.

3. **Manual / UI Verification**:
   - [ ] Login as Admin -> Navigate to Konfigurasi Sistem:
     - Verify input field "Jam Pulang Hari Jumat" exists and saves to database.
     - Verify teacher exception list allows selecting teachers for "Hanya wajib hadir saat hari mengajar".
   - [ ] Login as Teacher marked with exception on a non-teaching day:
     - Verify isAlpa is false and no warning blocks the dashboard.
   - [ ] On a Friday:
     - Verify Presensi Pulang adheres to Friday checkout opening time.
   - [ ] Open Presensi Pulang, Guru Jurnal, and Laporan Piket:
     - Verify live camera viewfinder is rendered directly in each form.
     - Verify toggle button switches between front camera and back camera.
     - Verify <input type="file"> and gallery upload buttons are completely gone.
