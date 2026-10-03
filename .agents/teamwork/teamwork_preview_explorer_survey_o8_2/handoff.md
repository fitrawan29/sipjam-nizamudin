# Handoff Report: Form Jurnal KBM Survey (R2)

**Explorer**: Explorer Survey 2  
**Target Scope**: R2 — Restrukturisasi Form Jurnal KBM (`src/components/GuruJurnal.tsx`)  
**Date**: 2026-10-03  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\teamwork_preview_explorer_survey_o8_2`

---

## 1. Observation

1. **Component Location & Structure**:
   - File inspected: `src/components/GuruJurnal.tsx` (1,204 lines).
   - Journal type state: Line 13: `const [tipeJurnal, setTipeJurnal] = useState('Jurnal KBM');`.
   - Workflow logic toggles `tipeJurnal` between `'Jurnal KBM'` and `'Jurnal Kegiatan'` based on `dailyState.isBlok` (lines 265-276), `dailyState.isDinasLuar` (line 272), and `dateBlok` (line 346).
2. **Existing Fields vs Target Fields**:
   - `pertemuanKe` is currently defined at line 25 and rendered in a 2-column grid with `jamKe` at lines 898-926:
     ```tsx
     <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1 flex items-center gap-1">
       Pertemuan Ke- <span className="text-red-500">*</span>
       {pertemuanKe && <span className="text-[9px] text-green-600 dark:text-green-400 font-normal">(terisi otomatis)</span>}
     </label>
     <input type="text" value={pertemuanKe} onChange={e => setPertemuanKe(e.target.value)} ... />
     ```
   - `tanggal` is initialized to `getWitaDateStr()` (line 218) and rendered as `<input type="date" value={tanggal} ...>` at lines 930-934.
   - `tujuanPembelajaran` is rendered as a textarea at lines 941-955.
   - `kktp`, `konten`, and `lokasiKbm` are **currently absent** in state, UI, and Supabase types (`src/types/database.ts` lines 508-540).
   - `materi` is currently rendered as text input at lines 936-938 with label `Materi Pembelajaran`.
   - `kegiatan` is currently rendered as textarea at lines 957-962 with label `Kegiatan Pembelajaran`.
   - `mapel` and `kelas` are currently rendered in a 2-column grid at lines 860-896.
   - `absensi` and live student list with `['H', 'S', 'I', 'A']` buttons are rendered at lines 986-1024, triggering `handleAbsensiChange` which syncs immediately to `public.absensi` (lines 414-445) and again in bulk during submit (lines 564-604).
   - `CameraSelfieCapture` is rendered at lines 1084-1100 and already passes:
     ```tsx
     <CameraSelfieCapture
       key={`cam-jurnal-${tipeJurnal}`}
       orientation="landscape"
       initialFacingMode="environment"
       ...
     />
     ```
   - `refleksi` is rendered at lines 1188-1191 with label `Catatan Refleksi (Opsional)`.
3. **User Corrections Received (2026-10-03T07:18:07Z)**:
   - "Hari/Tanggal display: DD-MM-YYYY format (read-only), value stored as YYYY-MM-DD."
   - "'Konten' replaces 'Materi Pembelajaran' (saved to `konten` and/or `materi`). 'Kegiatan Pembelajaran' remains present and REQUIRED as a separate field."
   - "Pertemuan ke- dan Jam ke- dihapus dari tampilan form (hanya Mapel yang disisakan dari grup Mapel/Pertemuan/Jam)."
   - Updated form order (12 fields):
     1. No. (`pertemuan_ke`, otomatis)
     2. Hari/Tanggal (`DD-MM-YYYY`, read-only)
     3. Tujuan Pembelajaran (wajib)
     4. KKTP (wajib)
     5. Konten (menggantikan Materi Pembelajaran, wajib)
     6. Kegiatan Pembelajaran (tetap ada, wajib)
     7. Mapel (dropdown, tetap ada)
     8. Kelas (dropdown)
     9. Absensi Murid H/I/S/A
     10. Lokasi KBM (wajib)
     11. Dokumentasi KBM (kamera lanskap)
     12. Catatan (opsional)
4. **Submit & Payload Logic**:
   - Lines 481-483 in `handleJurnalSubmit`: only validates `if (!file)` via toast warning.
   - Lines 504-534 construct `newJurnal` and insert into `jurnal_pembelajaran`.
   - Lines 612-629 reset form states.

---

## 2. Logic Chain

1. **Field Reordering & State Wiring**:
   - Because `tipeJurnal === 'Jurnal KBM'` currently intersperses KBM fields with Jurnal Kegiatan fields via ternaries, refactoring the KBM branch into a dedicated block allows placing the 12 fields cleanly in exact sequence without risking regressions in `Jurnal Kegiatan`.
   - `No.` is field #1 and maps directly to existing state `pertemuanKe`. The existing `useEffect` (lines 314-336) queries `jurnal_pembelajaran` for the last pertemuan and increments it by 1 when `mapel` and `kelas` are selected. This auto-fill logic remains fully functional.
   - `Hari/Tanggal` display should use a read-only input formatted as `DD-MM-YYYY` (e.g., `03-10-2026` via string split or helper), while leaving `tanggal` state as `YYYY-MM-DD` so that `newJurnal.tanggal` remains valid for Supabase.
   - `KKTP`, `Konten`, and `Lokasi KBM` require three new React states: `[kktp, setKktp]`, `[konten, setKonten]`, and `[lokasiKbm, setLokasiKbm]`.
   - `Konten` replaces `Materi Pembelajaran`. To ensure zero regressions with existing reports, exports, or audit scripts reading `materi` or `materi_pembelajaran`, `newJurnal` must write to `konten` and dual-write to `materi` and `materi_pembelajaran`.
   - `Jam ke-` is removed from the form UI per the user's explicit correction, but `jamKe` state and auto-fill from `dailyState.jadwalKBM` (line 308) must remain active so `jam_ke` in `newJurnal` continues to be saved in the database.
2. **Form Validation**:
   - Relying solely on HTML5 `required` attributes is fragile. Adding explicit programmatic checks in `handleJurnalSubmit` for `tujuanPembelajaran`, `kktp`, `konten`, `kegiatan`, `mapel`, `kelas`, `lokasiKbm`, and `file` guarantees that invalid submissions are stopped immediately with clear SweetAlert2/toast messages.
3. **Database Insertion & State Reset**:
   - Adding `kktp`, `konten`, and `lokasi_kbm` to `newJurnal` matches the database migration schema (`ADD COLUMN IF NOT EXISTS kktp TEXT, konten TEXT, lokasi_kbm TEXT`).
   - Adding `setKktp('')`, `setKonten('')`, `setLokasiKbm('')` to form cleanup prevents stale input data upon subsequent submissions.

---

## 3. Caveats

1. **Database Migration Dependency**:
   - Columns `kktp`, `konten`, `lokasi_kbm` must be created in Supabase table `jurnal_pembelajaran` (via MCP or migration script) before insertion will succeed without database error.
2. **Typescript Definitions**:
   - `src/types/database.ts` currently lacks these 3 new columns. While `supabaseClient.ts` uses untyped client calls that do not throw TypeScript compiler errors on unlisted properties, updating `src/types/database.ts` is recommended for type cleanliness.
3. **Jurnal Kegiatan Preservation**:
   - The restructuring must be strictly isolated to `tipeJurnal === 'Jurnal KBM'`. When `tipeJurnal === 'Jurnal Kegiatan'`, the existing simpler form (Tanggal, Nama Kegiatan, Uraian, Foto, Refleksi) must remain untouched.

---

## 4. Conclusion

The restructuring plan for `src/components/GuruJurnal.tsx` is completely specified and straightforward to implement:
1. Introduce 3 new state variables: `kktp`, `konten`, `lokasiKbm`.
2. Format `tanggal` as `DD-MM-YYYY` read-only in the UI, keeping `YYYY-MM-DD` in state.
3. Restructure the JSX for `tipeJurnal === 'Jurnal KBM'` to render the 12 fields in exact sequence:
   `No.` (#1) → `Hari/Tanggal` (#2) → `Tujuan Pembelajaran` (#3) → `KKTP` (#4) → `Konten` (#5) → `Kegiatan Pembelajaran` (#6) → `Mapel` (#7) → `Kelas` (#8) → `Absensi Murid` (#9) → `Lokasi KBM` (#10) → `Dokumentasi KBM` (#11) → `Catatan` (#12).
4. Remove `Jam ke-` from the visible form UI while preserving it in state and payload.
5. Add explicit JavaScript validations before submit for all mandatory fields.
6. Populate `kktp`, `konten`, `lokasi_kbm`, and dual-write `konten` to `materi`/`materi_pembelajaran` in `newJurnal` payload.
7. Include the new states in the form reset logic.

---

## 5. Verification Method

1. **Static Analysis & TypeScript Compilation**:
   Run `npx tsc --noEmit` from the root directory to verify there are no TypeScript syntax or typing errors.
2. **Build Verification**:
   Run `npm run build` to confirm the production build completes without errors.
3. **Code Inspection Checklist**:
   - Inspect `src/components/GuruJurnal.tsx` to verify the 12 fields appear in exact sequence under `tipeJurnal === 'Jurnal KBM'`.
   - Verify `displayTanggal` renders `DD-MM-YYYY` as read-only.
   - Verify `CameraSelfieCapture` has `orientation="landscape"`.
   - Verify `handleJurnalSubmit` validates `tujuanPembelajaran`, `kktp`, `konten`, `kegiatan`, `mapel`, `kelas`, `lokasiKbm`, and `file`.
   - Verify `newJurnal` contains `kktp`, `konten`, `lokasi_kbm`, and dual-writes `konten` to `materi`.
   - Verify `setKktp('')`, `setKonten('')`, `setLokasiKbm('')` are in the form reset block.
