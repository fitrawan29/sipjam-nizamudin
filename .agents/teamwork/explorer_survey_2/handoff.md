# Handoff Report — Requirement R2: Perbaikan Kamera QR Code

**Agent**: explorer_survey_2  
**Milestone**: Survey / Investigation  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\explorer_survey_2`  
**Target File**: `src/components/PiketView.tsx`  

---

## 1. Observation

### 1.1 Architecture & Implementation Location
- **Location**: `src/components/PiketView.tsx` (Lines 83–92, 273–358, 1801–1856).
- **QR Utilities**: `src/lib/qrSiswa.ts` (Lines 15–22, 547–560).
- **Dependencies**: Inspection of `package.json` (lines 13–23) confirms **no external QR scanning libraries** are installed (no `html5-qrcode`, `jsQR`, or `@zxing/library`).
- **Mechanism**: The scanner is implemented purely using native browser Web APIs:
  - Video stream acquisition: `navigator.mediaDevices.getUserMedia` (`src/components/PiketView.tsx:277-279`).
  - Barcode / QR detection: Native W3C `window.BarcodeDetector` (`src/components/PiketView.tsx:319-335`).

### 1.2 State & Ref Declarations
In `src/components/PiketView.tsx` (lines 83–92):
```tsx
83:   // Camera scanner states
84:   const [cameraActive, setCameraActive] = useState(false);
85:   const [cameraError, setCameraError] = useState<string | null>(null);
86:   const videoRef = useRef<HTMLVideoElement | null>(null);
87:   const streamRef = useRef<MediaStream | null>(null);
88:   const isDetectingRef = useRef(false);
89:   const lastCameraScannedRef = useRef<{ code: string; time: number } | null>(null);
90:   const usbInputRef = useRef<HTMLInputElement | null>(null);
91:   const isSubmittingPresensiRef = useRef(false);
```

### 1.3 `startCamera` and `stopCamera` Implementation
In `src/components/PiketView.tsx` (lines 274–301):
```tsx
274:   const startCamera = async () => {
275:     setCameraError(null);
276:     try {
277:       const stream = await navigator.mediaDevices.getUserMedia({
278:         video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
279:       });
280:       streamRef.current = stream;
281:       if (videoRef.current) {
282:         videoRef.current.srcObject = stream;
283:         await videoRef.current.play();
284:       }
285:       setCameraActive(true);
286:     } catch (err: any) {
287:       setCameraError(err.message || 'Gagal mengakses kamera browser. Pastikan izin kamera telah diberikan.');
288:       setCameraActive(false);
289:     }
290:   };
291: 
292:   const stopCamera = () => {
293:     if (streamRef.current) {
294:       streamRef.current.getTracks().forEach(track => track.stop());
295:       streamRef.current = null;
296:     }
297:     if (videoRef.current) {
298:       videoRef.current.srcObject = null;
299:     }
300:     setCameraActive(false);
301:   };
```

### 1.4 JSX Rendering of Camera Preview
In `src/components/PiketView.tsx` (lines 1807–1855):
```tsx
1807:                         {!cameraActive ? (
1808:                           <button
1809:                             type="button"
1810:                             onClick={startCamera}
1811:                             className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-teal-200 dark:border-teal-800 cursor-pointer"
1812:                           >
1813:                             <i className="fa-solid fa-camera"></i> Buka Kamera
1814:                           </button>
1815:                         ) : (
1816:                           <button
1817:                             type="button"
1818:                             onClick={stopCamera}
1819:                             className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-red-200 dark:border-red-800 cursor-pointer"
1820:                           >
1821:                             <i className="fa-solid fa-video-slash"></i> Tutup Kamera
1822:                           </button>
1823:                         )}
...
1833:                       {cameraActive && (
1834:                         <div className="relative rounded-xl overflow-hidden bg-black aspect-video border-2 border-teal-500 shadow-inner">
1835:                           <video
1836:                             ref={videoRef}
1837:                             playsInline
1838:                             autoPlay
1839:                             muted
1840:                             className="w-full h-full object-cover"
1841:                           />
...
1854:                       )}
```

### 1.5 Frame Detection Loop
In `src/components/PiketView.tsx` (lines 316–357):
```tsx
316:   // Frame detection loop with native BarcodeDetector
317:   useEffect(() => {
318:     let intervalId: any = null;
319:     if (cameraActive) {
320:       const BarcodeDetectorClass = typeof window !== 'undefined' ? (window as any).BarcodeDetector : undefined;
...
329:       intervalId = setInterval(async () => {
330:         if (!videoRef.current || videoRef.current.readyState < 2 || isDetectingRef.current) return;
331:         isDetectingRef.current = true;
332:         try {
333:           if (detector) {
334:             const barcodes = await detector.detect(videoRef.current);
...
```

### 1.6 Existing Test Assertions
In `tests/m3_piket_scanner_kiosk.test.ts` (lines 64–71):
```ts
assert(
  piketContent.includes('videoRef') &&
  piketContent.includes('startCamera') &&
  piketContent.includes('stopCamera') &&
  piketContent.includes('BarcodeDetector'),
  'PiketView implements HTML5 video stream camera scanner with native BarcodeDetector API'
);
```

---

## 2. Logic Chain

### 2.1 Primary Root Cause: React Conditional Rendering Ref Lifecycle Bug
1. **Initial Condition** (`Observation 1.2`): `cameraActive` starts as `false`.
2. **DOM Hierarchy** (`Observation 1.4`): The `<video ref={videoRef} ...>` element is wrapped inside `{cameraActive && (...)}` at line 1833. Because `cameraActive` is `false`, the `<video>` element is **not rendered** in the DOM. Therefore, `videoRef.current` is strictly `null`.
3. **Execution of `startCamera`** (`Observation 1.3`):
   - When the user clicks "Buka Kamera", `startCamera()` is invoked.
   - `navigator.mediaDevices.getUserMedia` acquires the stream and stores it in `streamRef.current = stream` (line 280).
   - At line 281: `if (videoRef.current)` is evaluated. Since `videoRef.current` is `null`, this condition is **false**!
   - Lines 282–283 (`videoRef.current.srcObject = stream; await videoRef.current.play();`) are **skipped completely**.
   - At line 285, `setCameraActive(true)` is called, which schedules a React state update.
4. **Post-Render State**:
   - React re-renders `PiketView`. Since `cameraActive` is now `true`, the `<video>` element is mounted and `videoRef.current` points to the newly created HTMLVideoElement.
   - **Crucially**, there is **no `useEffect` or callback ref** that connects `streamRef.current` to `videoRef.current` after the video element mounts.
   - As a result, the `<video>` element in the DOM has `srcObject = null`.
   - The user sees a black box (`bg-black aspect-video`) with the scanning reticle overlay, but **zero camera preview feed**.
5. **Impact on QR Detection** (`Observation 1.5`):
   - The BarcodeDetector loop checks `videoRef.current.readyState < 2` at line 330.
   - Because `videoRef.current.srcObject` is `null`, `videoRef.current.readyState` remains `0` (`HAVE_NOTHING`).
   - Consequently, the detection loop exits early on every tick, making it impossible to detect any QR code.

### 2.2 Secondary Root Cause: Overconstrained Camera Constraints on Non-Mobile Devices
1. **Constraint Definition** (`Observation 1.3`):
   Line 278 uses `{ facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }`.
2. In browsers running on laptops, desktop PCs, or webcams without an environment (rear) camera, un-idealized constraints or devices without environment cameras can throw `OverconstrainedError` or `ConstraintNotSatisfiedError`.
3. In `startCamera`, this error immediately drops into the `catch` block (lines 286–289), setting `cameraError` and aborting camera activation.
4. By contrast, `src/components/CameraSelfieCapture.tsx` (lines 152, 166–177) uses `{ facingMode: { ideal: mode } }` and implements an automatic fallback catch to `{ video: true, audio: false }`.

### 2.3 Additional Edge Cases
1. **Tab Switching**: Switching tabs triggers `useEffect` (line 303–307) which calls `stopCamera()` and sets `cameraActive = false`. When returning to the 'scan' tab, clicking "Buka Kamera" encounters the exact same unmounted `videoRef.current` timing bug.
2. **Missing Insecure Context Guard**: If loaded via HTTP on a mobile LAN IP, `navigator.mediaDevices` is `undefined`, causing an uncaught property access error unless guarded.
3. **Double-Click Race Condition**: Rapidly clicking "Buka Kamera" dispatches multiple concurrent `getUserMedia` requests without an acquisition mutex.

---

## 3. Caveats

1. **Browser Support for BarcodeDetector**: Native `window.BarcodeDetector` is supported out-of-the-box on Chrome for Android, macOS, and ChromeOS, but may be disabled by default on certain Windows Chrome releases without experimental flags, and on Firefox. While this investigation focuses on fixing the camera preview bug (R2), fallback messaging should be presented if `BarcodeDetector` is not present on the user's browser.
2. **Hardware Scanners Remain Fully Functional**: USB HID barcode scanners do not use the camera and are unaffected by this bug.
3. **No External Libraries Allowed**: The project strictly enforces zero new dependencies (`package.json` constraint). The fix must remain 100% native Web API compliant.

---

## 4. Conclusion

The bug causing the QR camera preview not to appear in `src/components/PiketView.tsx` is caused by **conditional DOM rendering timing in React**:
- The `<video>` element is rendered conditionally (`{cameraActive && ...}`).
- `startCamera()` tries to assign `videoRef.current.srcObject = stream` before calling `setCameraActive(true)`, at which point `videoRef.current` is `null`.
- After `<video>` mounts, no hook attaches the acquired media stream to the video element.
- The stream runs in hardware, but the `<video>` element remains blank/black with `srcObject = null`.

### Concrete Step-by-Step Fix Recipe (for Implementer)

#### Step 1: Add Camera Initiation Mutex in `src/components/PiketView.tsx`
Near line 90, add:
```tsx
const isStartingCameraRef = useRef(false);
```

#### Step 2: Update `startCamera` with Resilient Constraints and Fallback
Replace lines 274–290 with:
```tsx
  const startCamera = async () => {
    if (isStartingCameraRef.current) return;
    isStartingCameraRef.current = true;
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser ini tidak mendukung akses kamera langsung atau koneksi tidak aman (HTTPS diperlukan).');
      setCameraActive(false);
      isStartingCameraRef.current = false;
      return;
    }

    try {
      // Stop any existing tracks before acquiring new stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      let stream: MediaStream;
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        },
        audio: false
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (constraintErr: any) {
        console.warn('[PiketView] Overconstrained camera request, falling back to basic video:', constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;

      // Attach immediately if videoRef is already in DOM
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('[PiketView] Direct play error:', playErr);
        }
      }

      // Activate camera state to mount video element if not mounted
      setCameraActive(true);
    } catch (err: any) {
      console.error('[PiketView] startCamera error:', err);
      let errMsg = 'Gagal mengakses kamera browser. Pastikan izin kamera telah diberikan.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Izin kamera ditolak. Harap izinkan akses kamera pada pengaturan browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'Kamera tidak ditemukan pada perangkat Anda.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = 'Kamera sedang digunakan oleh aplikasi lain.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setCameraError(errMsg);
      setCameraActive(false);
    } finally {
      isStartingCameraRef.current = false;
    }
  };
```

#### Step 3: Add Lifecycle Synchronization Hook for `cameraActive`
Insert right after `stopCamera` (around line 302):
```tsx
  // Ensure video element receives the stream when cameraActive mounts the element
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
      }
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true;
      video.play().catch(err => {
        console.warn('[PiketView] Video play error in effect:', err);
      });
    }
  }, [cameraActive]);
```

#### Step 4: Add Callback Ref to `<video>` in JSX
In `src/components/PiketView.tsx` (around lines 1835–1841), update the `<video>` tag:
```tsx
  <video
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
    playsInline
    autoPlay
    muted
    className="w-full h-full object-cover"
  />
```

#### Step 5: Update the BarcodeDetector Indicator Badge
In lines 1850–1852, replace static text with capability indicator:
```tsx
  <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-xs p-1.5 rounded-lg text-center text-[10px] text-white">
    {typeof window !== 'undefined' && 'BarcodeDetector' in window ? (
      <span><i className="fa-solid fa-bolt mr-1 text-teal-400"></i> BarcodeDetector aktif • Deteksi QR otomatis</span>
    ) : (
      <span><i className="fa-solid fa-circle-info mr-1 text-amber-400"></i> Browser ini tidak mendukung BarcodeDetector bawaan. Gunakan scanner USB HID atau ketik NISN.</span>
    )}
  </div>
```

---

## 5. Verification Method

### 5.1 Static Code Contract Verification
Ensure all required identifiers for existing test suites are preserved:
```powershell
npx tsx -e "
const fs = require('fs');
const code = fs.readFileSync('src/components/PiketView.tsx', 'utf8');
const reqs = ['videoRef', 'startCamera', 'stopCamera', 'BarcodeDetector'];
reqs.forEach(r => {
  if (!code.includes(r)) throw new Error('Missing contract: ' + r);
  console.log('PASS: ' + r);
});
"
```

### 5.2 Test Suite Execution
Execute existing test suites to prevent regression:
```powershell
npm test
```
Specifically verifies:
- `tests/m3_piket_scanner_kiosk.test.ts`
- `tests/m3_adversarial_scanner_kiosk_stress.test.ts`
- `tests/presensi_siswa_sync_and_superadmin.test.ts`
- `tests/adversarial_presensi_sync_reviewer.test.ts`
- `tests/adversarial_presensi_sync_reviewer_r2.test.ts`
- `tests/adversarial_presensi_sync_reviewer_r3.test.ts`

### 5.3 Type Check & Build Verification
```powershell
npx tsc --noEmit
npm run build
```

### 5.4 Behavioral Verification Conditions (Invalidation Criteria)
The fix is considered invalid if:
1. `videoRef.current.srcObject` is null after `cameraActive` becomes true.
2. Clicking "Buka Kamera" on a laptop with a front-facing webcam throws `OverconstrainedError`.
3. Switching from 'scan' to 'beranda' and back to 'scan' leaves camera tracks running or fails to open upon subsequent click.
4. Any existing test in `npm test` fails.
