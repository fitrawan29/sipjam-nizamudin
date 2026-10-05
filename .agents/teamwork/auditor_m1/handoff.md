# Forensic Audit Report — Milestone M1: `src/components/PiketView.tsx`

**Auditor**: `auditor_m1`  
**Work Product**: `src/components/PiketView.tsx`  
**Profile**: General Project (Benchmark Integrity Mode)  
**Verdict**: **CLEAN**  
**Date**: 2026-10-05T10:32:00Z  

---

## 1. Executive Summary

A forensic integrity audit was conducted on the work product in `src/components/PiketView.tsx` implemented by `worker_m1`. All five mandatory forensic check areas were verified empirically against the source code, runtime behavior, and regression test suites:
1. **Absence of Dummies/Mocks/Facades**: Confirmed 0 mock datasets, 0 facade short-circuits, and 0 hardcoded test values.
2. **Authentic Attendance Submission**: Confirmed `handleManualMark` and `handleProcessScan` execute authentic database queries via `recordPresensiSiswa` into the `presensi_siswa` Supabase table.
3. **State Filtering Fix & Two-Way Sync**: Confirmed removal of `setManualSearchQuery` and `setManualKelasFilter` from `handleManualMark` preserves roster visibility, while `handleProcessScan` continues two-way sync for QR scanning.
4. **Authentic MediaStream Camera Streaming**: Confirmed real browser `navigator.mediaDevices.getUserMedia`, MediaStream lifecycle management, `<video>` callback ref bindings, and native `BarcodeDetector` support.
5. **Role-Based UI Differentiation**: Confirmed normalized role evaluation (`admin`/`superadmin` vs `guru`) rendering a streamlined 1-tap interface for Guru and a comprehensive multi-kiosk audit interface for Admin.

---

## 2. Forensic Phase Results

| # | Forensic Check Name | Status | Details |
|---|---|:---:|---|
| 1 | **Dummy / Facade / Mock Detection** | **PASS** | No dummy arrays, mock variables, or facade return statements detected in `PiketView.tsx`. |
| 2 | **Database Attendance Integration** | **PASS** | `handleManualMark` and `handleProcessScan` invoke `recordPresensiSiswa` with authentic database queries and error handling. |
| 3 | **Filter Persistence & Two-Way Sync** | **PASS** | "Tandai Datang/Pulang" preserves active class filter and search query; QR scan preserves two-way form synchronization. |
| 4 | **Camera Hardware & Stream Lifecycles** | **PASS** | Real `MediaStream` acquired via `getUserMedia`, bound to `<video>` via callback refs and `useEffect([cameraActive])`, tracks stopped on unmount. |
| 5 | **Role Normalization & UI Separation** | **PASS** | Role string normalized with lowercase and whitespace stripping; Admin renders 10-station kiosk + 7-column audit log, Guru renders streamlined touch interface. |

---

## 3. Observation

### 3.1 Source Inspection of State Filtering Fix
In `src/components/PiketView.tsx`:
- `handleManualMark` (lines 619–735):
  ```tsx
  // Two-way sync: fill QR scanner input (preserve manual search query and class filter to keep roster intact)
  setUsbInputVal(student.nisn || student.nama_siswa);
  await fetchTodayScanData();
  ```
  Neither `setManualSearchQuery(student.nama_siswa)` nor `setManualKelasFilter('Semua')` are present in `handleManualMark`.
- `handleProcessScan` (lines 434–531):
  ```tsx
  // Two-way sync: auto-fill manual input and roster search
  setManualSearchQuery(student.nama_siswa);
  setUsbInputVal(student.nisn || student.nama_siswa);
  setManualKelasFilter('Semua');
  await fetchTodayScanData();
  ```
  QR scanning continues to synchronize the scanned student into the manual form and class filter as required.

### 3.2 Source Inspection of Camera & Video Stream
In `src/components/PiketView.tsx`:
- `startCamera` (lines 279–348):
  - Uses `isStartingCameraRef.current` mutex against concurrent requests.
  - Invokes `navigator.mediaDevices.getUserMedia(constraints)` with ideal `environment` facing mode, falling back to basic video `{ video: true, audio: false }` if overconstrained.
  - Stores stream in `streamRef.current = stream`.
  - Callback ref on `<video>` (lines 1905–1914 & 2542–2551):
    ```tsx
    ref={(el) => {
      videoRef.current = el;
      if (el && streamRef.current && el.srcObject !== streamRef.current) {
        el.srcObject = streamRef.current;
        el.setAttribute('playsinline', 'true');
        el.setAttribute('webkit-playsinline', 'true');
        el.muted = true;
        el.play().catch(e => console.warn('[PiketView] Callback ref play error:', e));
      }
    }}
    ```
  - `useEffect([cameraActive])` (lines 362–375) provides an additional synchronization guarantee on state changes.
  - `stopCamera` (lines 350–359) stops all tracks with `streamRef.current.getTracks().forEach(track => track.stop())` and clears `videoRef.current.srcObject = null`.

### 3.3 Source Inspection of Role Normalization & UI Differentiation
In `src/components/PiketView.tsx`:
- Role normalization (lines 27–29):
  ```tsx
  const roleNormalized = (user?.role || '').toLowerCase().replace(/\s+/g, '');
  const isAdmin = roleNormalized === 'admin' || roleNormalized === 'superadmin';
  const isGuru = roleNormalized === 'guru';
  ```
- Admin View (`id="piket-content-scan"`, lines 1691–2431):
  - Kiosk station dropdown with options `kiosk-1` through `kiosk-10`.
  - 3 large metric cards: `Total Hadir Datang`, `Total Pulang`, `Total Unik Siswa`.
  - Full 7-column Live Attendance Audit Log table (`Log Presensi Siswa Hari Ini`).
  - Exclusive access to `Penugasan Piket` tab (`activeTab === 'penugasan' && isAdmin`).
- Guru View (`id="piket-content-scan-guru"`, lines 2434–2836):
  - Header with inline counter badge: `Hadir Datang: {scanSummary.totalDatang} • Pulang: {scanSummary.totalPulang}`.
  - Compact mode toggle pill button (`Datang` | `Pulang`).
  - Compact scanner toggle card with Buka/Tutup Kamera, camera reticle, USB HID input, and compact result banner.
  - Fast touch-friendly student roster with 1-tap "Datang" and "Pulang" buttons.
  - Omits the 7-column audit log table and multi-kiosk selectors.

---

## 4. Logic Chain

1. **Bug Resolution (R1.1)**:
   - Observation 3.1 establishes that `handleManualMark` previously reset `manualSearchQuery` to `student.nama_siswa` and `manualKelasFilter` to `'Semua'`. Because `filteredManualStudents` filters by `manualSearchQuery`, this caused the roster to collapse to a single student.
   - By removing both setters while retaining `setUsbInputVal` and `setLastScanResult`, the user's active filter and search terms persist, allowing consecutive student attendance marks without disrupting list visibility.
2. **Camera Blank Screen Fix (R2)**:
   - Observation 3.2 proves that the previous bug (where `<video>` mounted conditionally after stream acquisition without attaching `srcObject`) is solved through the callback ref on the `<video>` element and the `useEffect([cameraActive])` hook.
   - Hardware race conditions are prevented by `isStartingCameraRef`, and unsupported desktop webcams gracefully fall back from environment constraints to basic video.
3. **Role Differentiation (R1.2)**:
   - Observation 3.3 proves that role checking handles case variations and whitespace cleanly.
   - Admin and Guru render mutually distinct DOM trees under `activeTab === 'scan'`: Guru gets a fast, mobile-friendly 1-tap interface without administrative audit tables, while Admin gets the full multi-kiosk audit and penugasan suite.
4. **Authenticity & Integrity**:
   - Observations 3.1 and 3.2 prove that all operations interact with authentic browser APIs (`MediaStream`, `BarcodeDetector`, `Web Audio API`) and authentic database procedures (`recordPresensiSiswa` inserting into Supabase table `presensi_siswa`). No mock fallbacks or dummy facade bypasses exist.

---

## 5. Caveats

- In browser environments without HTTPS or localhost (insecure origin), `navigator.mediaDevices.getUserMedia` is blocked by browser security policy; an informative warning alert is rendered.
- On browsers lacking native `window.BarcodeDetector` (e.g. desktop Firefox), the camera stream renders cleanly and a badge instructs the user to use USB HID or manual search input.

---

## 6. Conclusion

**Verdict: CLEAN**

The implementation in `src/components/PiketView.tsx` strictly meets all user requirements and integrity standards:
- R1.1: Clicking "Tandai Datang" or "Tandai Pulang" keeps the student roster intact and preserves active class filters.
- R1.2: Guru and Admin UIs are cleanly differentiated based on normalized role permissions.
- R2: QR camera preview renders reliably with genuine MediaStream bindings and fallback handling.
- No facade, dummy, or mock mechanisms exist in the work product.

---

## 7. Verification Method

To independently reproduce the forensic verification:

### 7.1 Independent Forensic Integrity Suite
```powershell
npx tsx tests/forensic_auditor_m1_integrity.test.ts
```
**Expected Output**: 20/20 PASS, VERDICT: CLEAN.

### 7.2 Camera & QR Lifecycle Empirical Verification Suite
```powershell
npx tsx tests/challenger_m1_camera_qr_lifecycle.test.ts
```
**Expected Output**: 18/18 PASS, VERDICT: APPROVE.

### 7.3 Filter Persistence & Role UI Challenger Test Suite
```powershell
npx tsx tests/challenger_m1_piket_filter_ui.test.ts
```
**Expected Output**: 66/66 PASS, VERDICT: APPROVE.

### 7.4 Multi-Kiosk Regression Test Suite
```powershell
npx tsx tests/m3_piket_scanner_kiosk.test.ts
```
**Expected Output**: 37/37 PASS.

### 7.5 TypeScript & Next.js Build
```powershell
npx tsc --noEmit
npm run build
```
**Expected Output**: Exited with code 0.
