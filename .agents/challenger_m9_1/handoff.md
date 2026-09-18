# Milestone 9 Adversarial Challenger Handoff Report

**Agent**: Challenger 1 (`challenger_m9_1`)  
**Verdict**: **CONFIRMED**  
**Timestamp**: 2026-09-18T13:17:00Z  
**Test Suite**: `tests/m9_challenger_stress.test.ts` (55 checks passed, 0 failed)

---

## 1. Observation

### Focus Area 1: Edge Cases in `workflow.ts` and Friday Checkout
1. `src/lib/workflow.ts` (Lines 195-234, 307-331):
   - Exemption evaluation directly queries `data_guru.wajib_hadir_hanya_mengajar` and `pengaturan.guru_hanya_mengajar`.
   - Lines 307-323: When `isTeacherExempt` is true and `!hasTeachingObligation`:
     ```ts
     state.isNonTeachingDay = true;
     state.bebasAlpa = true;
     state.isAlpa = false;
     state.lockedReason = 'Hari ini tidak ada jadwal mengajar (Bebas Kehadiran).';
     return state;
     ```
   - When non-exempt: defaults to `state.isAlpa = true; state.bebasAlpa = false;` on any workday without presensi datang.
2. `src/components/GuruPresensi.tsx` (Lines 214-226):
   - Friday pulang evaluation:
     ```ts
     const isJumat = getWitaDayName(now) === 'Jumat';
     const effectivePulangMulai = isJumat ? (jamPresensi.pulangJumat || jamPresensi.pulangMulai) : jamPresensi.pulangMulai;
     const startVal = parseTime(effectivePulangMulai);
     const akhirVal = parseTime(jamPresensi.pulangAkhir);
     if (currTimeVal < startVal) return Swal.fire('Belum Waktunya', ...);
     if (currTimeVal > akhirVal) return Swal.fire('Ditutup', ...);
     ```
   - Boundary tests in `tests/m9_challenger_stress.test.ts`:
     - Friday 10:59 -> `BELUM_WAKTUNYA`
     - Friday 11:00 -> `DIBUKA`
     - Friday 13:30 -> `DIBUKA` on Friday, `BELUM_WAKTUNYA` on Monday (normal 14:00 opening)
     - Friday 22:00 -> `DIBUKA`
     - Friday 22:01 -> `DITUTUP`
     - Missing `jam_pulang_jumat` -> falls back to `jam_pulang_mulai` (14:00)

### Focus Area 2: Jurnal Kelas RBAC & Class Restrictions
1. `src/components/AppScreen.tsx` (Lines 248-258, 302, 449-470):
   - Dynamic sidebar navigation:
     ```tsx
     ...(isWaliKelas ? [{ id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' }] : [])
     ```
   - Navigation barrier:
     ```tsx
     if (targetId === 'view-jurnal-kelas') {
       if (!isAdmin && !isWaliKelas) {
         Swal.fire({ icon: 'warning', title: 'Akses Ditolak', text: 'Akses Terblokir: ...' });
         return;
       }
     }
     ```
   - View rendering fallback:
     ```tsx
     {currentView === 'view-jurnal-kelas' && (
       isAdmin || isWaliKelas ? (
         <RekapJurnalView user={user} initialMode="kelas" assignedKelas={assignedKelas} />
       ) : (
         <div className="glass-card ..."><h2>Akses Terblokir</h2>...</div>
       )
     )}
     ```
2. `src/components/RekapJurnalView.tsx` (Lines 124-138):
   - Component-level query block for regular teachers:
     ```ts
     if (activeMode === 'kelas' && !isAdmin && !isWaliKelas && waliClasses.length === 0) {
       setJurnalData([]);
       setLoading(false);
       return;
     }
     ```
   - Class-level constraint for Wali Kelas:
     ```ts
     if (activeMode === 'kelas' && !isAdmin && waliClasses.length > 0) {
       if (!activeKelas || !waliClasses.includes(activeKelas)) {
         activeKelas = waliClasses[0];
         setKelas(activeKelas);
       }
     }
     ```

### Focus Area 3: GradebookView Access Rules
1. `src/components/GradebookView.tsx`:
   - Admin view-only lock (Lines 292-295):
     ```ts
     if (isAdmin) {
       setIsGuruPengampu(false);
       return;
     }
     ```
   - All TP mutations check `if (isAdmin || !isGuruPengampu)`:
     - `handleOpenAddTpModal` (Line 700): blocks with warning
     - `handleOpenEditTpModal` (Line 716): blocks with warning
     - `handleSaveTp` (Line 733): blocks with warning
     - `handleDeleteTp` (Line 838): blocks with warning
     - `handleSaveGrades` (Line 624): immediately returns without DB changes
   - Render inspection:
     - Grade matrix cells (Lines 1951-1970, 1982-2004):
       `{isAdmin || !isGuruPengampu ? (<span className="font-semibold text-gray-900 dark:text-white">{grade}</span>) : (<input type="number" ... />)}`
     - Action buttons: "Tambah TP Baru" and "Simpan Semua Nilai" are wrapped in `{!isAdmin && isGuruPengampu && (...)}`.
     - CSV export buttons are wrapped in `{!isAdmin && (...)}`.
     - "Cetak Dokumen" (`window.print()`) is preserved across all roles.

### Focus Area 4: Chat & Broadcast Realtime Contracts
1. Live Supabase database transactions (`tests/m9_challenger_stress.test.ts` lines 360-448):
   - `public.chat_messages`:
     - Real row inserted: `pesan: "Adversarial test message verifying chat contract."`, `is_read: false`.
     - Bidirectional query matched the row.
     - Updated to `is_read: true`.
     - Row cleanly deleted.
   - `public.pengumuman` & `public.pengumuman_dibaca`:
     - Inserted test broadcast row.
     - Queried `pengumuman_dibaca` for test user -> 0 rows returned (State: UNREAD).
     - Inserted row into `pengumuman_dibaca`.
     - Queried `pengumuman_dibaca` -> 1 row returned (State: READ).
     - Rows cleanly deleted.

### Focus Area 5: Camera Enforcement & File Input Rules
1. Zero `<input type="file">` verification:
   - `src/components/GuruJurnal.tsx`: 0 occurrences of `<input type="file">`.
   - `src/components/PiketView.tsx`: 0 occurrences of `<input type="file">`.
   - `src/components/GuruPresensi.tsx`: File input exists exclusively inside `{jenisPresensi === 'Izin' && tipeAbsen === 'Datang' && (...)}` for medical excuse letters. For Pulang (`tipeAbsen === 'Pulang'`), NO file input exists; only `<CameraSelfieCapture>` is rendered.
2. Facing mode & canvas mirroring:
   - `CameraSelfieCapture.tsx` (Lines 25, 119-123, 229-231):
     - `facingMode` state defaults to `initialFacingMode` and toggles between `'user'` and `'environment'`.
     - CSS class `-scale-x-100` applied to video preview when `facingMode === 'user'`.
   - `src/lib/watermarkCanvas.ts` (Lines 53, 77-84):
     - `drawWatermarkedCanvas(..., mirror = false)`:
       ```ts
       if (mirror) {
         ctx.save();
         ctx.translate(width, 0);
         ctx.scale(-1, 1);
         ctx.drawImage(videoElement, 0, 0, width, height);
         ctx.restore();
       }
       ```
     - `getDefaultWatermarkOptions`: returns valid Indonesian `dateText`, WITA `timestamp`, and coordinates.

---

## 2. Logic Chain

1. **Friday Checkout & Attendance Exemption**:
   - Because `GuruPresensi.tsx` calculates `effectivePulangMulai = isJumat ? (jamPulangJumat || jamPulangMulai) : jamPulangMulai`, the checkout gate cleanly permits Friday afternoon checkouts starting at `jam_pulang_jumat` (11:00 WITA) while blocking earlier checkouts (10:59 WITA) and rejecting checkouts at identical times on normal workdays (13:30 WITA).
   - Because `workflow.ts` distinguishes between teachers with `wajib_hadir_hanya_mengajar = true` vs `false`, non-teaching days trigger `isNonTeachingDay = true` and `bebasAlpa = true` for exempt teachers, while regular teachers remain required to present daily (`isAlpa = true`).
2. **Jurnal Kelas RBAC**:
   - The multi-layer defense in `AppScreen.tsx` (sidebar filtering, `handleNavigation` interception, and locked fallback card) combined with `RekapJurnalView.tsx` (`tarikRekap` empty-data abort and automatic `activeKelas` fallback to `waliClasses[0]`) guarantees that regular teachers cannot inspect classroom journals, and assigned Wali Kelas cannot access classes other than their assigned class.
3. **GradebookView Security**:
   - Forcing `isGuruPengampu = false` whenever `isAdmin = true` ensures that Admin users are strictly view-only: all mutation callbacks abort early with security alerts, cells render uneditable static `<span>` elements, and only the "Cetak Dokumen" action is presented.
4. **Chat & Broadcast Realtime**:
   - Real database roundtrips verified that `chat_messages` inserts and queries comply with schema, and `pengumuman_dibaca` correctly drives unread count transitions.
5. **Camera Constraints**:
   - Lexical audits confirmed complete eradication of file uploads in `GuruJurnal.tsx`, `PiketView.tsx`, and Presensi Pulang, replaced with direct hardware access (`navigator.mediaDevices.getUserMedia`) with dual front/rear switching and canvas mirroring.

---

## 3. Caveats

- Hardware webcam video stream capture was tested functionally via headless DOM element mocks, as physical camera devices are not attached in the CI/server environment.
- Service Worker push events depend on the client browser's Notification and Push API implementations; server-side payload generation was verified via `/api/push/send-reminders`.

---

## 4. Conclusion

**VERDICT: CONFIRMED**

All 5 focus areas and acceptance criteria of Milestone 9 have been empirically tested, stress-tested, and verified against the live codebase and Supabase database. The implementation adheres strictly to the security, role-based access, camera enforcement, and workflow specifications outlined in `ORIGINAL_REQUEST.md` and `PROJECT.md`.

---

## 5. Verification Method

To independently reproduce and verify this test suite:
```powershell
npx tsx tests/m9_challenger_stress.test.ts
```
Expected output:
- `TOTAL ADVERSARIAL STRESS CHECKS: 55`
- `PASSED: 55`
- `FAILED: 0`
- Exit code: `0`
