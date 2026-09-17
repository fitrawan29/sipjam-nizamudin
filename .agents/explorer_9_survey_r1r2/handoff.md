# Codebase Survey Handoff Report: R1 & R2
**Agent:** `explorer_9_survey_r1r2`  
**Working Directory:** `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_9_survey_r1r2`  
**Target Milestone / Requirements:** Milestone 9 — R1 (Sinkronisasi Kehadiran & Wali Kelas) & R2 (Presensi Guru Selfie & Integrasi Google Drive)

---

## 1. Observation

### 1.1 Scope & Requirement Specifications
From `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\ORIGINAL_REQUEST.md` (lines 252-264, 286-292):
- **R1. Sinkronisasi Kehadiran & Wali Kelas**:
  - Admin dapat menetapkan guru sebagai Wali Kelas untuk kelas tertentu.
  - Wali kelas dapat menginput status Izin/Sakit untuk siswa di kelasnya.
  - Sinkronisasi absolut: Jika status kehadiran siswa diubah (menjadi Hadir, Izin, Sakit, atau Alpa) oleh Wali Kelas, Piket, atau Guru Mapel, maka status siswa tersebut akan berubah secara global untuk hari tersebut di semua catatan sesi mapel lainnya.
  - Sistem harus tetap menyimpan log/keterangan (*audit trail*) mengenai siapa yang terakhir melakukan perubahan status tersebut.
  - Acceptance Criteria:
    - `[ ] Terdapat pengujian terprogram (test script) yang memvalidasi bahwa memperbarui status kehadiran seorang siswa di tabel absensi (misal via Piket) akan memicu trigger atau fungsi logika yang mensinkronkan status tersebut ke absensi Mapel lain pada hari yang sama, dan kolom log_perubahan mencatat nama user pengubahnya.`
- **R2. Presensi Guru Selfie & Integrasi Google Drive**:
  - Presensi Datang dan Dinas Luar wajib menggunakan antarmuka foto selfie menggunakan kamera perangkat.
  - Pada preview foto, sistem merender *watermark/stamp* (berisi tanggal, lokasi koordinat, dan waktu) di posisi tengah bawah foto.
  - Pengguna dapat memilih untuk foto ulang atau menyimpan.
  - Foto diunggah menggunakan sistem *webhook* Google Apps Script (GAS) yang sudah pernah dibuat sebelumnya.
  - Jika guru Datang dengan status "Dinas Luar", saat presensi Pulang, sistem memberikan opsi antara "Di Sekolah" atau "Dinas Luar".
  - Acceptance Criteria:
    - `[ ] Aplikasi merender elemen <canvas> yang berhasil menggabungkan aliran video (kamera) dengan teks watermark koordinat geolokasi tanpa bergantung pada API server (diproses di client-side).`
    - `[ ] Transmisi unggahan foto membidik endpoint webhook GAS secara asinkron tanpa memblokir UI utama.`

---

### 1.2 Current Class & Teacher Assignment Architecture (R1)
1. **Database Tables & Views (`src/types/database.ts` & `supabase/migrations/`)**:
   - `data_guru` (`src/types/database.ts`: lines 67-106):
     ```typescript
     data_guru: {
       Row: {
         email: string | null
         id: string
         mata_pelajaran: string | null
         nama_guru: string | null
         nip: string | null
         no_hp: string | null
         sekolah_id: string
         status: string | null
       }
     }
     ```
   - `guru_mapel` (`src/types/database.ts`: lines 178-237):
     ```typescript
     guru_mapel: {
       Row: {
         created_at: string | null
         guru_id: string | null
         id: string
         kelas: string
         mapel_id: string | null
         mapel_singkat: string | null
         nama_guru: string
         nama_mapel: string
         nip: string
         sekolah_id: string
       }
     }
     ```
   - `guru_kelas` view (`src/types/database.ts`: lines 843-868; `supabase/migrations/20260912_multi_tenant_sekolah_rls.sql`: lines 234-237):
     ```sql
     CREATE VIEW public.guru_kelas AS
     SELECT DISTINCT sekolah_id, guru_id, nip, nama_guru, kelas
     FROM public.guru_mapel;
     ```
   - `data_siswa` (`src/types/database.ts`: lines 137-176):
     ```typescript
     data_siswa: {
       Row: {
         gender: string | null
         id: string
         kelas: string | null
         nama_siswa: string | null
         nisn: string | null
         no_hp_ortu: string | null
         sekolah_id: string
         status: string | null
       }
     }
     ```
   - **Absence of `wali_kelas` Entity**:
     - No table named `wali_kelas` exists in `src/types/database.ts` or migrations.
     - Classes are not stored in a separate `kelas` master table; they exist only as string attributes across `data_siswa.kelas`, `guru_mapel.kelas`, and `jadwal_pelajaran.kelas`.
     - In `src/components/AdminDataView.tsx` (lines 18-24), tabs only include:
       `Data_Siswa`, `Data_Guru`, `Data_Mapel`, `Kalender_Pendidikan`, and `Jadwal_Pelajaran`.
       There is no interface for assigning teachers to Wali Kelas roles.

---

### 1.3 Current Student Attendance Storage & Disconnects (R1)
1. **Teacher Journal Attendance Input (`src/components/GuruJurnal.tsx`)**:
   - Lines 32: `const [absensi, setAbsensi] = useState<Record<string, string>>({});`
   - Lines 215-219: Initializes `initialAbsensi[s.nisn] = 'H'`.
   - Line 257:
     ```typescript
     absensi_siswa: JSON.stringify(absensi),
     ```
   - Lines 36-60: Calculates string summary `kehadiranMurid` (e.g. `"Hadir: 28, Sakit: 1 [Ahmad (S)]"`).
   - Saved to `jurnal_pembelajaran` (`absensi_siswa` column).
2. **Piket Attendance Input (`src/components/PiketView.tsx`)**:
   - Line 39: `const [piketAbsensi, setPiketAbsensi] = useState<Record<string, string>>({});`
   - Line 239:
     ```typescript
     rekap_absen_kelas: JSON.stringify(piketAbsensi),
     ```
   - Saved to `laporan_piket` (`rekap_absen_kelas` column).
3. **Student Attendance Recap Parsing (`src/components/RekapSiswaView.tsx`)**:
   - Lines 73-84: Queries `jurnal_pembelajaran` for `absensi_siswa, detail_absen, tanggal`.
   - Lines 103-125: Parses `j.absensi_siswa` as JSON and aggregates `H`, `S`, `I`, `A`.
4. **Current Disconnect**:
   - If Piket marks a student as `Sakit` in `laporan_piket`, this information is **never** propagated to `jurnal_pembelajaran`.
   - If a Mapel teacher at Jam 1-2 marks a student as `Sakit`, a different Mapel teacher teaching the same class at Jam 5-6 defaults the student back to `Hadir`, overwriting the real-world attendance.
   - There is no central `absensi` table, no synchronization trigger, and no `log_perubahan` tracking user identification and timestamp.

---

### 1.4 Current Teacher Attendance Flow (R2)
1. **Component Inspection (`src/components/GuruPresensi.tsx`)**:
   - Lines 11-13:
     ```typescript
     const [tipeAbsen, setTipeAbsen] = useState('Datang');
     const [jenisPresensi, setJenisPresensi] = useState('Sekolah');
     const [detailIzin, setDetailIzin] = useState('Sakit');
     ```
   - Lines 246-250:
     ```tsx
     <select 
       value={jenisPresensi} 
       onChange={e => togglePresensiFields(e.target.value)} 
       disabled={tipeAbsen === 'Pulang'} 
       required 
       className="w-full px-3 py-3 text-sm rounded-xl input-premium disabled:opacity-50 text-gray-900 dark:text-white"
     >
         <option value="Sekolah">Hadir Sekolah</option>
         <option value="Dinas Luar">Dinas Luar</option>
         <option value="Izin">Izin / Sakit</option>
     </select>
     ```
     *Notice: `disabled={tipeAbsen === 'Pulang'}` unconditionally freezes the selection when doing presensi Pulang, violating the requirement to allow choosing between "Di Sekolah" and "Dinas Luar" for teachers who checked in as Dinas Luar.*
   - Lines 288-293:
     ```tsx
     {jenisPresensi !== 'Sekolah' && tipeAbsen === 'Datang' && (
       <div id="row-file" className="fade-in pt-1">
           <label className="block text-[11px] font-bold text-red-500 dark:text-red-400 mb-1.5 ml-1">
             <i className="fa-solid fa-asterisk"></i> Wajib Upload Surat Keterangan
           </label>
           <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required className="..." />
       </div>
     )}
     ```
     *Notice: Currently only uses `<input type="file">`. There is no device camera viewfinder (`getUserMedia`), no `<video>` preview, no canvas watermark, and no Retake/Save flow.*
2. **Synchronous Blocking Upload (`src/lib/driveUpload.ts` & `src/components/GuruPresensi.tsx`)**:
   - `src/lib/driveUpload.ts` (lines 1-23):
     ```typescript
     const DRIVE_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxYQXyTxV2DPiOQ5WDYSs_vgYuxHobCSTTrxIuE7WxUqfi6IgWGEsWYgZq6T6hxRNc/exec';

     export async function uploadToDrive(file: File, namaGuru: string, folderFitur: string, prefix: string = 'Upload'): Promise<string> {
       return new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.readAsDataURL(file);
         reader.onload = async () => {
           const base64Data = reader.result as string;
           const timestamp = new Date().getTime();
           const filename = `${prefix}_${timestamp}_${file.name}`;
           try {
             const response = await fetch(DRIVE_WEBHOOK_URL, {
               method: 'POST',
               body: JSON.stringify({ filename, mimeType: file.type, base64Data, namaGuru, folderFitur }),
             });
             ...
     ```
   - In `GuruPresensi.tsx` (lines 178-185):
     ```typescript
     let fileUrl = '';
     if (file) {
       try {
         fileUrl = await uploadToDrive(file, user.nama, 'Presensi_Guru', 'Presensi');
       } catch (err: any) {
         setLoading(false);
         return Swal.fire('Gagal Upload', err.message, 'error');
       }
     }
     ...
     const { error } = await supabase.from('presensi_guru').insert([newPresensi]);
     ```
     *Form submission is blocked synchronously on line 180 until the Google Apps Script webhook completes reading, decoding base64, and writing to Google Drive.*
3. **Workflow Logic (`src/lib/workflow.ts`)**:
   - Lines 186-215: Loads `presensi_guru` records and sets `state.presensiDatang` and `state.presensiPulang`.
   - Lines 228-230:
     ```typescript
     if (jp === 'Dinas Luar') {
       state.isDinasLuar = true;
     }
     ```

---

## 2. Logic Chain

### 2.1 For Requirement R1 (Wali Kelas & Absolute Attendance Synchronization)
1. **Premise 1**: Admin needs to designate teachers as Wali Kelas for specific classes.
2. **Inference 1**: Because classes in the database are strings associated with schools (`sekolah_id`), creating a table `public.wali_kelas` with `(sekolah_id, kelas)` as a unique constraint provides strict single-wali-per-class enforcement across multiple tenants.
3. **Premise 2**: Wali Kelas must be able to input "Izin" or "Sakit" for students in their class on any given date.
4. **Inference 2**: When a teacher logs in, check if their `id`, `nip`, or `nama_guru` matches a record in `wali_kelas` for their `sekolah_id`. If so, expose an "Input Presensi Siswa (Wali Kelas)" action/tab within `RekapSiswaView` (or a dedicated modal) populated with students belonging to that class from `data_siswa`.
5. **Premise 3**: Acceptance criterion explicitly requires:
   `"memperbarui status kehadiran seorang siswa di tabel absensi (misal via Piket) akan memicu trigger atau fungsi logika yang mensinkronkan status tersebut ke absensi Mapel lain pada hari yang sama, dan kolom log_perubahan mencatat nama user pengubahnya."`
6. **Inference 3**:
   - Create a central table `public.absensi` structured as:
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `sekolah_id UUID REFERENCES public.sekolah(id) ON DELETE CASCADE`
     - `tanggal DATE NOT NULL`
     - `kelas TEXT NOT NULL`
     - `siswa_id UUID REFERENCES public.data_siswa(id) ON DELETE CASCADE`
     - `nisn TEXT NOT NULL`
     - `nama_siswa TEXT NOT NULL`
     - `status TEXT NOT NULL CHECK (status IN ('H', 'I', 'S', 'A'))`
     - `keterangan TEXT`
     - `sumber_perubahan TEXT NOT NULL` (`'Wali Kelas' | 'Piket' | 'Mapel' | 'Admin'`)
     - `diubah_oleh TEXT NOT NULL` (e.g. `"Ade Fitrawan (Wali Kelas)"`)
     - `log_perubahan TEXT` (Audit trail format: `"[2026-09-17 08:15 WITA] Status diubah menjadi Sakit oleh Ade Fitrawan (Wali Kelas). Alasan: Demam tinggi"`)
     - Unique constraint: `CONSTRAINT uq_absensi_sekolah_tgl_nisn UNIQUE (sekolah_id, tanggal, nisn)`
   - Create a PostgreSQL trigger `trg_sync_absensi_to_jurnal` on `public.absensi`:
     - On INSERT or UPDATE: Updates any existing records in `public.jurnal_pembelajaran` for `(sekolah_id, tanggal, kelas)` by replacing/merging the student's NISN in the `absensi_siswa` JSON column with the new status, ensuring all subject sessions for that class on that date immediately reflect the updated status!
   - Create triggers on `public.jurnal_pembelajaran` and `public.laporan_piket` (or database RPC functions):
     - When a Mapel teacher submits/updates a journal or Piket submits a piket report, unpack their attendance JSON and upsert into `public.absensi`, updating `log_perubahan` with the teacher's name and role.
   - In `GuruJurnal.tsx`:
     - When a teacher opens a KBM journal for class `X.1` on `tanggal`, pre-populate student statuses by querying `public.absensi`. If a student was already marked `I` or `S` by Wali Kelas or Piket earlier in the day, the teacher sees that status immediately instead of defaulting to `H`.

---

### 2.2 For Requirement R2 (Teacher Selfie & Canvas Watermark & Async GAS Upload)
1. **Premise 1**: Presensi Datang (Sekolah & Dinas Luar) and Presensi Pulang (Dinas Luar) require selfie photo captured from device camera.
2. **Inference 1**:
   - Build a reusable client-side component `CameraSelfieCapture.tsx`:
     - Uses `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } })`.
     - Displays live `<video>` preview.
     - Catches permission denied / hardware unsupported errors and provides graceful fallback.
     - Disposes media tracks cleanly on unmount or after photo capture via `stream.getTracks().forEach(t => t.stop())`.
3. **Premise 2**: Acceptance criterion requires:
   `"Aplikasi merender elemen <canvas> yang berhasil menggabungkan aliran video (kamera) dengan teks watermark koordinat geolokasi tanpa bergantung pada API server (diproses di client-side)."`
4. **Inference 2**:
   - On clicking "Ambil Foto" (Capture):
     - An HTML5 `<canvas>` is instantiated matching the video stream dimensions.
     - Frame is drawn mirrored (`ctx.translate(w, 0); ctx.scale(-1, 1)`).
     - Watermark badge is drawn at **bottom-center**:
       - Translucent dark badge background (`rgba(0, 0, 0, 0.65)`) with rounded corners.
       - Centered text (`ctx.textAlign = 'center'`) in pure white `#FFFFFF` with drop shadow.
       - Line 1: Date (e.g. `"Kamis, 17 September 2026"`).
       - Line 2: Geolocation Coordinates (e.g. `"Lat: -6.200000, Lng: 106.816666"`).
       - Line 3: Timestamp (e.g. `"07:05:30 WITA"`).
     - Canvas produces a JPEG Blob (`canvas.toBlob(...)`) and a preview data URL.
5. **Premise 3**: Acceptance criterion requires:
   `"Transmisi unggahan foto membidik endpoint webhook GAS secara asinkron tanpa memblokir UI utama."`
6. **Inference 3**:
   - In `GuruPresensi.tsx`:
     - When the form is submitted:
       1. Instantly generate a UUID: `const presensiId = crypto.randomUUID();`
       2. Insert the presensi record into Supabase with `link_bukti: 'pending:uploading'` (or empty placeholder).
       3. Immediately notify the user via SweetAlert toast: `"Presensi berhasil direkam! Foto sedang diunggah ke Google Drive."`.
       4. Update local state and workflow transitions (e.g. switch to Pulang tab) without waiting for GAS response.
       5. Asynchronously trigger `uploadToDrive(...)` in a background promise. Upon resolution:
          `supabase.from('presensi_guru').update({ link_bukti: driveUrl }).eq('id', presensiId)`.
       6. This ensures zero UI latency, no hanging spinners, and non-blocking operation.
7. **Premise 4**: For teachers who checked in as "Dinas Luar", presensi Pulang must provide options between "Di Sekolah" and "Dinas Luar".
8. **Inference 4**:
   - In `GuruPresensi.tsx`:
     - When `tipeAbsen === 'Pulang'`:
       - If `dailyState?.isDinasLuar` is true:
         - Do NOT disable the `jenisPresensi` dropdown.
         - Offer two specific options: `<option value="Sekolah">Di Sekolah</option>` and `<option value="Dinas Luar">Dinas Luar</option>`.
         - If "Dinas Luar" is selected, trigger camera selfie capture.

---

## 3. Caveats

1. **Camera Hardware Availability in Desktop / Emulated Environments**:
   - In automated headless test environments or desktop PCs without physical webcams, `navigator.mediaDevices.getUserMedia` may reject with `NotFoundError` or `NotAllowedError`.
   - *Mitigation*: Provide an automatic fallback toggle in `CameraSelfieCapture` allowing manual photo file selection (`<input type="file" accept="image/*" capture="user">`), and ensure the `<canvas>` watermarking utility functions identically whether the image source is a video stream or an image element.
2. **Google Apps Script Webhook Quotas**:
   - The GAS webhook URL in `src/lib/driveUpload.ts` is public and has daily execution limits from Google. The asynchronous non-blocking design ensures that even if GAS returns an error or times out, the teacher's presensi status in Supabase is already preserved.
3. **Database Migration Application**:
   - In multi-tenant environments, triggers executing `jsonb` transformations require existing `absensi_siswa` fields to either be valid JSON or safely handled via `CASE` expressions. The trigger must handle legacy plaintext strings gracefully.

---

## 4. Conclusion & Proposed Implementation Plan

### 4.1 Proposed Database Architecture (SQL Migration)
Create migration `supabase/migrations/20260917_r1_attendance_sync_and_wali_kelas.sql`:
```sql
-- 1. Table: wali_kelas
CREATE TABLE IF NOT EXISTS public.wali_kelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    kelas TEXT NOT NULL,
    guru_id UUID NOT NULL REFERENCES public.data_guru(id) ON DELETE CASCADE,
    nama_guru TEXT NOT NULL,
    nip TEXT,
    tahun_ajaran TEXT DEFAULT '2024/2025',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_wali_kelas_sekolah_kelas UNIQUE (sekolah_id, kelas)
);

-- 2. Table: absensi (Canonical daily student attendance)
CREATE TABLE IF NOT EXISTS public.absensi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sekolah_id UUID NOT NULL REFERENCES public.sekolah(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    kelas TEXT NOT NULL,
    siswa_id UUID REFERENCES public.data_siswa(id) ON DELETE CASCADE,
    nisn TEXT NOT NULL,
    nama_siswa TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('H', 'I', 'S', 'A')),
    keterangan TEXT,
    sumber_perubahan TEXT NOT NULL, -- 'Wali Kelas' | 'Piket' | 'Mapel' | 'Admin'
    diubah_oleh TEXT NOT NULL,
    log_perubahan TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_absensi_sekolah_tanggal_nisn UNIQUE (sekolah_id, tanggal, nisn)
);

-- 3. RLS Policies for multi-tenant isolation
ALTER TABLE public.wali_kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for wali_kelas" ON public.wali_kelas
    FOR ALL USING (sekolah_id = public.get_auth_user_sekolah_id() OR public.is_superadmin())
    WITH CHECK (sekolah_id = public.get_auth_user_sekolah_id() OR public.is_superadmin());

CREATE POLICY "Tenant isolation for absensi" ON public.absensi
    FOR ALL USING (sekolah_id = public.get_auth_user_sekolah_id() OR public.is_superadmin())
    WITH CHECK (sekolah_id = public.get_auth_user_sekolah_id() OR public.is_superadmin());

-- 4. Bidirectional Sync Trigger: absensi -> jurnal_pembelajaran
CREATE OR REPLACE FUNCTION public.sync_absensi_to_all_jurnal()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.jurnal_pembelajaran
    SET 
        absensi_siswa = CASE 
            WHEN absensi_siswa IS NOT NULL AND absensi_siswa LIKE '{%' THEN
                (absensi_siswa::jsonb || jsonb_build_object(NEW.nisn, NEW.status))::text
            ELSE 
                jsonb_build_object(NEW.nisn, NEW.status)::text
        END
    WHERE sekolah_id = NEW.sekolah_id 
      AND tanggal = NEW.tanggal::text 
      AND kelas = NEW.kelas;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sync_absensi_to_all_jurnal
AFTER INSERT OR UPDATE OF status ON public.absensi
FOR EACH ROW EXECUTE FUNCTION public.sync_absensi_to_all_jurnal();
```

### 4.2 Proposed UI & Frontend Implementation Plan

| Component | Target File | Proposed Implementation |
|---|---|---|
| **Wali Kelas Assignment UI** | `src/components/AdminDataView.tsx` | Add "Wali Kelas" tab. Render class list with dropdown selector for teachers from `data_guru`. Upsert to `public.wali_kelas`. |
| **Wali Kelas Attendance Input** | `src/components/RekapSiswaView.tsx` or new `WaliKelasPresensiView.tsx` | If logged in teacher is assigned as Wali Kelas, display "Input Absensi Kelas" action. Load students from `data_siswa`, allow status toggle (H/I/S/A) and notes, upsert to `public.absensi` with `sumber_perubahan: 'Wali Kelas'`. |
| **Mapel Attendance Auto-Sync** | `src/components/GuruJurnal.tsx` | When class is selected, pre-populate `absensi` state from `public.absensi`. When submitting, upsert to `public.absensi` with `sumber_perubahan: 'Mapel'`. |
| **Piket Attendance Auto-Sync** | `src/components/PiketView.tsx` | When piket report is submitted, unpack `piketAbsensi` and upsert into `public.absensi` with `sumber_perubahan: 'Piket'`. |
| **Camera Selfie Component** | `src/components/CameraSelfieCapture.tsx` | HTML5 `getUserMedia` camera preview with viewfinder. Ambil Foto button, Retake vs Save buttons. Clean track teardown. |
| **Canvas Watermark Utility** | `src/lib/watermarkCanvas.ts` | Client-side canvas rendering of mirrored frame + translucent bottom-center badge displaying Date, Coordinates, and Timestamp. |
| **Non-blocking GAS Upload** | `src/components/GuruPresensi.tsx` | Fire background upload promise for `uploadToDrive`. Immediately insert presensi record, show success toast, and update `link_bukti` upon completion. |
| **Pulang Dinas Luar Options** | `src/components/GuruPresensi.tsx` | When `tipeAbsen === 'Pulang'` and `dailyState?.isDinasLuar` is true, enable dropdown with "Di Sekolah" and "Dinas Luar". |

---

## 5. Verification Method

To independently verify the survey and future implementation:

1. **TypeScript Build Validation**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected:* Exit code 0 with 0 diagnostic errors.
2. **Schema & Migration Verification**:
   - Inspect `supabase/migrations/20260917_r1_attendance_sync_and_wali_kelas.sql` for:
     - `CREATE TABLE IF NOT EXISTS public.wali_kelas`
     - `CREATE TABLE IF NOT EXISTS public.absensi`
     - `CREATE OR REPLACE TRIGGER trg_sync_absensi_to_all_jurnal`
3. **Automated Programmatic Test Script**:
   Create `tests/m9_r1_r2_attendance_selfie.test.ts`:
   - Test 1: Insert multiple mock `jurnal_pembelajaran` records for class `X.1` on date `2026-09-17`.
   - Test 2: Update student attendance in `absensi` simulating Piket or Wali Kelas action (`status: 'S'`, `diubah_oleh: 'Budi Santoso (Piket)'`, `log_perubahan: '...'`).
   - Test 3: Assert that all `jurnal_pembelajaran` records for class `X.1` on that date have their `absensi_siswa` updated to reflect the new status.
   - Test 4: Assert that `absensi.log_perubahan` accurately records user name, role, and timestamp.
   - Test 5: Verify client-side `<canvas>` watermark generation and non-blocking asynchronous upload pattern in `GuruPresensi`.
   - Run via:
     ```bash
     npx tsx tests/m9_r1_r2_attendance_selfie.test.ts
     ```
