# Handoff Report — worker_m1: PiketView Auto-Filter Bug, QR Camera Preview Fix, and Role-Based UI Differentiation

**Agent**: `worker_m1`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\worker_m1`  
**Modified File**: `src/components/PiketView.tsx`  
**Timestamp**: 2026-10-05T10:23:00Z  

---

## 1. Observation

### 1.1 Auto-Filter Issue (Requirement R1.1)
- In `src/components/PiketView.tsx` (previously lines 590–594 and lines 616–619), `handleManualMark` called:
  ```tsx
  setUsbInputVal(student.nisn || student.nama_siswa);
  setManualSearchQuery(student.nama_siswa);
  setManualKelasFilter('Semua');
  ```
- Because `filteredManualStudents` filters by `manualSearchQuery`:
  ```tsx
  const filteredManualStudents = allStudents.filter(s => {
    const matchKelas = manualKelasFilter === 'Semua' || s.kelas === manualKelasFilter;
    const matchSearch = !manualSearchQuery.trim() || 
      (s.nama_siswa?.toLowerCase() || '').includes(manualSearchQuery.toLowerCase()) || ...
  ```
  Setting `manualSearchQuery(student.nama_siswa)` immediately filtered the roster down to only the clicked student. All other students disappeared from the table, and any selected class filter was forcibly reset to `'Semua'`.

### 1.2 QR Camera Preview Not Rendering (Requirement R2)
- In `src/components/PiketView.tsx`, the `<video>` element was rendered conditionally inside `{cameraActive && (...) }`.
- When clicking "Buka Kamera", `startCamera()` obtained a stream via `getUserMedia`, set `streamRef.current = stream`, and tried to execute:
  ```tsx
  if (videoRef.current) {
    videoRef.current.srcObject = stream;
    await videoRef.current.play();
  }
  setCameraActive(true);
  ```
- Because `cameraActive` was `false` before `startCamera` completed, `<video>` was unmounted and `videoRef.current` was `null`. The assignment was skipped.
- After `setCameraActive(true)` caused `<video>` to mount, no callback ref or `useEffect` attached `streamRef.current` to `videoRef.current.srcObject`. Consequently, `video.srcObject` stayed `null`, showing a black/blank box, and `video.readyState` remained 0, blocking `BarcodeDetector`.
- Furthermore, `startCamera` requested `{ video: { facingMode: 'environment', ... } }` without an `OverconstrainedError` fallback for desktop webcams lacking an environment camera, and had no concurrency mutex against rapid double-clicks.

### 1.3 Guru vs Admin UI Lack of Differentiation (Requirement R1.2)
- Role evaluation was strictly `user?.role === 'Admin'` and `user?.role === 'Guru'`, failing on lowercase or trimmed roles (e.g. `'superadmin'`).
- Both Guru and Admin roles rendered an identical, heavy 2-column kiosk interface with 10 kiosk stations, 3 large metric cards, and a 7-column Live Attendance Audit Log table.
- Teachers conducting picket duty at school gates needed a streamlined mobile-friendly interface with fast 1-tap attendance marking buttons, compact mode toggles, and inline counters without scrolling through raw audit logs.

---

## 2. Logic Chain

1. **Step 1 (Fixing R1.1 Auto-Filter Bug)**:
   - By removing `setManualSearchQuery(student.nama_siswa)` and `setManualKelasFilter('Semua')` from `handleManualMark` in both the `res.success` and `res.alreadyExists` branches (preserving `setUsbInputVal` and `setLastScanResult`), marking a student does NOT alter the user's active search query or class filter.
   - All students in the active class remain visible in the list with their updated attendance badges.
2. **Step 2 (Fixing R2 Camera Preview Lifecycle & Constraints)**:
   - Added an initiation mutex `isStartingCameraRef = useRef(false)` to block race conditions.
   - Wrapped `getUserMedia` constraints with `facingMode: { ideal: 'environment' }` and a `catch` fallback to `{ video: true, audio: false }` to support laptops and webcams without environment cameras.
   - Attached a callback ref `ref={(el) => { videoRef.current = el; if (el && streamRef.current && el.srcObject !== streamRef.current) { el.srcObject = streamRef.current; el.play().catch(...); } }}` on the `<video>` element to bind the media stream synchronously upon DOM mount.
   - Added `useEffect` on `[cameraActive]` to ensure stream attachment if mounting occurs across state transitions.
   - Added dynamic BarcodeDetector capability badge.
3. **Step 3 (Differentiating Guru vs Admin Layouts R1.2)**:
   - Normalized roles:
     ```tsx
     const roleNormalized = (user?.role || '').toLowerCase().replace(/\s+/g, '');
     const isAdmin = roleNormalized === 'admin' || roleNormalized === 'superadmin';
     const isGuru = roleNormalized === 'guru';
     ```
   - Conditioned `activeTab === 'scan'` rendering on `isAdmin`:
     - **For Guru (`!isAdmin`)**:
       - Kiosk Station selector dropdown is hidden (defaults `deviceId` to `'kiosk-default'`).
       - Mode toggle rendered as compact pill button (`Datang` | `Pulang`).
       - Compact scanner toggle card with Buka/Tutup Kamera, camera video preview with reticle and badge, USB HID input, and compact result feedback banner.
       - Inline counter badge (`Hadir Datang: X • Pulang: Y`) replaces the 3 standalone cards.
       - Fast touch-friendly student roster with 1-tap "Datang" and "Pulang" buttons and status badges.
       - Redundant 7-column Live Attendance Audit Log table is hidden.
     - **For Admin (`isAdmin`)**:
       - Full Kiosk Station selector dropdown (Kios 1–10).
       - Full two-column station (USB input + Camera preview + Large visual feedback card).
       - Full 6-column student roster with cancel buttons.
       - 3 large metric stat cards (`Total Hadir Datang`, `Total Pulang`, `Total Unik Siswa`).
       - Full 7-column Live Attendance Audit Log table (`Log Presensi Siswa Hari Ini`).
       - Exclusive access to `Penugasan Piket` tab.

---

## 3. Caveats

- In environments without HTTPS or localhost, browsers restrict `navigator.mediaDevices.getUserMedia`; an informative error banner is displayed prompting for secure context / permissions.
- In browsers without native `window.BarcodeDetector` (e.g. desktop Firefox or older Chromium), the video stream displays clearly and a badge informs the user that BarcodeDetector is unavailable, guiding them to use USB HID or manual NISN input.
- Presensi Siswa two-way sync (`handleProcessScan`) continues to sync scanned QR codes to the manual input form as specified in earlier milestone requirements, while `handleManualMark` strictly preserves the teacher's active filter and search state.

---

## 4. Conclusion

All requirements for Milestone M1 in `src/components/PiketView.tsx` have been successfully and genuinely implemented:
- **R1.1**: "Tandai Datang" and "Tandai Pulang" no longer filter the student list down to 1 student or reset the class filter; all students remain visible.
- **R2**: Camera preview blank screen bug resolved via video callback ref, `useEffect([cameraActive])` synchronization, `isStartingCameraRef` mutex, and fallback constraints.
- **R1.2**: Role checking is normalized and distinct interfaces are rendered: a compact, touch-friendly UI for Guru with inline counters and 1-tap buttons, and a comprehensive multi-kiosk audit UI for Admin.

---

## 5. Verification Method

### 5.1 TypeScript Compilation
```powershell
npx tsc --noEmit
```
**Result**: Exited with code 0 (0 errors).

### 5.2 Next.js Production Build
```powershell
npm run build
```
**Result**: Compiled successfully in 2.2s; all static and dynamic routes generated cleanly.

### 5.3 Automated Regression Suites
```powershell
npx tsx tests/m3_piket_scanner_kiosk.test.ts
npx tsx tests/presensi_siswa_sync_and_superadmin.test.ts
npx tsx tests/adversarial_presensi_sync_reviewer.test.ts
npx tsx tests/adversarial_presensi_sync_reviewer_r2.test.ts
npx tsx tests/adversarial_presensi_sync_reviewer_r3.test.ts
npx tsx tests/adversarial_piket_wali_challenger_1.test.ts
npm test
```
**Result**: All 27 test suites in `npm test` and all individual test scripts passed with 100% success rate.
