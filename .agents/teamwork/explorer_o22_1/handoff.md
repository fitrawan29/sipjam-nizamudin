# Handoff Report: Feature R1 Codebase Survey

**Agent**: `explorer_o22_1`  
**Parent / Caller**: `b8a13b7c-6c39-493c-96de-cd823a6f72d9`  
**Task**: Survey codebase for Feature R1: WhatsApp Parent 1-Click Notifications in PiketView & RekapSiswaView

---

## 1. Observation

1. **`no_hp_ortu` Database Schema**:
   In `src/types/database.ts` lines 326–337:
   ```typescript
   data_siswa: {
     Row: {
       gender: string | null
       id: string
       kelas: string | null
       nama_siswa: string | null
       nisn: string | null
       no_hp_ortu: string | null
       qr_code: string | null
       sekolah_id: string
       status: string | null
     }
   ```
   The column `no_hp_ortu` already exists on table `data_siswa`.

2. **`data_siswa` Query Locations**:
   - `src/components/PiketView.tsx` line 1146:
     ```typescript
     let query = supabase.from('data_siswa').select('*').order('kelas', { ascending: true }).order('nama_siswa', { ascending: true });
     ```
     Sets `allStudents`, where every item contains `s.no_hp_ortu`.
   - `src/components/RekapSiswaView.tsx` line 228–233:
     ```typescript
     let sQ = supabase.from('data_siswa').select('*').eq('kelas', gerbangKelas).order('nama_siswa', { ascending: true });
     ```
     Combined into `gerbangStudents` via `...siswa` (line 311).
   - `src/components/RekapSiswaView.tsx` line 527–538:
     ```typescript
     let siswaQuery = supabase.from('data_siswa').select('*').eq('kelas', targetKelas).order('nama_siswa', { ascending: true });
     ```
     Spread into `rekapMap[s.nama_siswa] = { ...s, ... }` and preserved in `rekapData`.
   - `src/components/RekapSiswaView.tsx` line 160:
     ```typescript
     let sQ = supabase.from('data_siswa').select('*').eq('kelas', activeWaliKelas.kelas)...
     ```
     Sets `waliStudents`.

3. **Student Row Rendering Locations**:
   - `src/components/PiketView.tsx`:
     - Manual Roster Table: lines 2654–2749 (`filteredManualStudents.map((s, idx) => ...)`).
     - Live Scan Log Table: lines 2864–2899 (`filteredTodayScans.map((item, idx) => ...)`).
     - Mobile / Guru Touch Cards: lines 3211–3290 (`filteredManualStudents.map((s, idx) => ...)`).
     - Laporan Form Student Absence: lines 3676–3708 (`allStudents.filter(s => s.kelas === activeKelas).map((siswa, idx) => ...)`).
   - `src/components/RekapSiswaView.tsx`:
     - Presensi Gerbang Table: lines 1317–1359 (`filteredGerbangStudents.map((siswa, idx) => ...)`).
     - Rekap Absen Siswa Table: lines 1552–1572 (`filteredData.map((s, i) => ...)`).
     - Wali Kelas Input Panel: lines 989–1045 (`waliStudents.map((siswa, idx) => ...)`).

4. **Alerts & Dialog Pattern**:
   - `sweetalert2` is already imported and used across `PiketView.tsx` (line 5), `RekapSiswaView.tsx` (line 5), and throughout the app.
   - Standard modal form input with `Swal.fire({ html: '...', preConfirm: () => ... })` exists in `AdminDataView.tsx` lines 350–407 and lines 1012–1075.

---

## 2. Logic Chain

1. **Step 1 (Data availability)**:
   Observation 1 and Observation 2 confirm `no_hp_ortu` is present in the `data_siswa` table and is already retrieved by all relevant queries using `select('*')`.
   *Inference*: No database migration, SQL alter statement, or API change is required to read `no_hp_ortu`.

2. **Step 2 (Data presence in UI state)**:
   Observation 2 and Observation 3 confirm that each student row (`s`, `siswa`, or `item`) in `PiketView.tsx` and `RekapSiswaView.tsx` either already holds `no_hp_ortu` directly or can immediately look it up in memory from `allStudents` without an extra Supabase request.
   *Inference*: The 1-click action can be performed directly on each row using local data.

3. **Step 3 (Phone Normalization & Messaging)**:
   Indonesian mobile phone numbers come in multiple formats (`08...`, `+62...`, `62...`, `8...`, with spaces or dashes).
   *Inference*: A standalone helper function `normalizeIndonesianPhone` can clean non-digits and normalize to `628...`. If invalid or empty, return `null`.

4. **Step 4 (Native URI vs Fallback Dialog)**:
   When `no_hp_ortu` is present and valid, opening `https://wa.me/{cleanNumber}?text={encodedText}` opens WhatsApp Web or the WhatsApp app natively.
   When `no_hp_ortu` is missing or invalid, Observation 4 confirms `Swal.fire` can present a friendly prompt offering: (a) input manual number to send, or (b) copy formatted message text to clipboard.
   *Inference*: This fulfills R1 acceptance criteria cleanly with zero external npm packages.

5. **Step 5 (Print Safety)**:
   In `RekapSiswaView.tsx`, tables are printed via `@media print`.
   *Inference*: Action buttons must have Tailwind's `print:hidden` class so print outputs and exported PDFs remain clean and professional.

---

## 3. Caveats

1. **`presensi_siswa` rows do not store `no_hp_ortu` directly**:
   In `PiketView.tsx` scan log (`filteredTodayScans`), records come from `presensi_siswa`. Resolving the parent's phone number requires matching `item.siswa_id === s.id` or `item.nisn === s.nisn` against `allStudents`. Since `allStudents` is already in state, this is synchronous and instantaneous.
2. **Multiple Kiosk tabs**:
   In multi-kiosk setups, if a new student is added while the kiosk is open, `allStudents` might not have the newly added student until refreshed; however, adding new students mid-picket is rare and `fetchTodayScanData` handles regular attendance polling.
3. **No caveats regarding schema**: Schema is 100% ready as-is.

---

## 4. Conclusion

Feature R1 can be implemented cleanly and with minimal diff (Ponytail compliant):
1. Create `src/lib/whatsapp.ts` containing phone normalization (`normalizeIndonesianPhone`), message formatting (`formatParentAttendanceMessage`), URL building (`buildWhatsAppUrl`), and fallback handling (`sendParentWhatsAppNotification`).
2. Add the WhatsApp 1-click button to the student rows in `src/components/PiketView.tsx` (Manual table, Scan log, Guru cards) and `src/components/RekapSiswaView.tsx` (Gerbang table, Rekap table, Wali cards).
3. Create test suite `tests/whatsapp_parent_notify_and_autosave.test.ts` to verify phone normalization and message encoding.

---

## 5. Verification Method

1. **Static / Type Inspection**:
   Run `npx tsc --noEmit` to verify type compliance across `PiketView.tsx`, `RekapSiswaView.tsx`, and `whatsapp.ts`.
2. **Automated Unit Testing**:
   Run `npx tsx tests/whatsapp_parent_notify_and_autosave.test.ts` to test:
   - Phone normalization: `081234567890` -> `6281234567890`, `+62 812-3456-7890` -> `6281234567890`, `81234567890` -> `6281234567890`.
   - Message construction: verifies student name, class, date, status, and time are included.
   - URI encoding: verifies `wa.me/` URL formatting and special character escaping.
3. **Regresion Check**:
   Run `npx tsx tests/wajib_hadir_dan_pembersihan_usang.test.ts` and `npm run build`.
