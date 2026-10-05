# Handoff Report — challenger_m1_2: Empirical Camera & QR Lifecycle Verification (M1 R2)

**Agent**: `challenger_m1_2`  
**Role**: `critic`, `specialist`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\challenger_m1_2`  
**Timestamp**: 2026-10-05T10:30:00Z  
**Verdict**: **APPROVE**

---

## 1. Observation

### 1.1 Source Code Verification (`src/components/PiketView.tsx`)
1. **Camera State and Ref Declarations** (Lines 88–97):
   ```tsx
   const [cameraActive, setCameraActive] = useState(false);
   const [cameraError, setCameraError] = useState<string | null>(null);
   const videoRef = useRef<HTMLVideoElement | null>(null);
   const streamRef = useRef<MediaStream | null>(null);
   const isStartingCameraRef = useRef(false);
   ```
2. **Startup Mutex & Fallback Constraints in `startCamera`** (Lines 279–347):
   ```tsx
   const startCamera = async () => {
     if (isStartingCameraRef.current) return;
     isStartingCameraRef.current = true;
     setCameraError(null);
     ...
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
     ...
     finally {
       isStartingCameraRef.current = false;
     }
   };
   ```
3. **Stream Cleanup in `stopCamera`** (Lines 350–359):
   - All tracks in `streamRef.current` are stopped via `track.stop()`.
   - `streamRef.current` and `videoRef.current.srcObject` are explicitly nulled.
   - `setCameraActive(false)` resets the UI state.
4. **`useEffect([cameraActive])` Synchronization Hook** (Lines 362–375):
   ```tsx
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
5. **Video Element Callback Ref in Dual Views**:
   - Admin View (Lines 1904–1914):
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
       playsInline autoPlay muted className="w-full h-full object-cover"
     />
     ```
   - Guru View (Lines 2541–2551): Identical robust callback ref implemented.
6. **Dynamic BarcodeDetector Capability Badge** (Lines 1929–1933 & 2565–2569):
   ```tsx
   {typeof window !== 'undefined' && 'BarcodeDetector' in window ? (
     <span><i className="fa-solid fa-bolt mr-1 text-teal-400"></i> BarcodeDetector aktif • Deteksi QR otomatis</span>
   ) : (
     <span><i className="fa-solid fa-circle-info mr-1 text-amber-400"></i> Browser ini tidak mendukung BarcodeDetector bawaan. Gunakan scanner USB HID atau ketik NISN.</span>
   )}
   ```
7. **R1.1 Auto-Filter Preservation** (Lines 664–666):
   - `handleManualMark` preserves `manualSearchQuery` and `manualKelasFilter`. Only `usbInputVal` is updated, keeping the entire class roster visible.

### 1.2 Test Execution Results
- `npx tsx tests/challenger_m1_camera_qr_lifecycle.test.ts`:
  ```
  SUMMARY: Total 18 | Passed: 18 | Failed: 0
  VERDICT: APPROVE — ALL CAMERA & QR LIFECYCLE CONTRACTS FULLY VERIFIED!
  ```
- `npm test`:
  ```
  Ran all test suites. All 27 suites passed with exit code 0.
  ```
- `npx tsc --noEmit`:
  ```
  Exit code 0 (0 errors).
  ```
- `npm run build`:
  ```
  Compiled successfully in 2.9s. All routes generated.
  ```

---

## 2. Logic Chain

1. **Premise**: Prior to the fix, clicking "Buka Kamera" could result in a blank video screen because `startCamera()` assigned `videoRef.current.srcObject` when `<video>` was not yet mounted (`videoRef.current === null`), and no mechanism bound the stream once the element rendered.
2. **Step 1 (Callback Ref Proof)**: Observation 1.1.5 proves that `ref={(el) => ...}` immediately binds `el.srcObject = streamRef.current` and triggers `el.play()` the exact instant `<video>` enters the DOM. Test `ORACLE-01` verified that when a media stream pre-exists DOM mounting, the callback ref binds and plays immediately.
3. **Step 2 (Redundant Synchronization Proof)**: Observation 1.1.4 proves that `useEffect([cameraActive])` provides a secondary guarantee if state transitions or React batching delays element mounting. Test `R2-06` confirmed this hook contract.
4. **Step 3 (Reentrancy & Concurrency Proof)**: Observation 1.1.2 proves that `isStartingCameraRef` acts as a synchronous lock. Test `STRESS-01` subjected `startCamera` to 10 simultaneous promises and proved that only 1 `getUserMedia` invocation occurred, while 9 concurrent callers were safely ignored without throwing unhandled rejections.
5. **Step 4 (Constraint Negotiation Proof)**: Observation 1.1.2 and Test `ORACLE-03` proved that devices lacking `facingMode: environment` catch `OverconstrainedError` and seamlessly fall back to `{ video: true, audio: false }`.
6. **Step 5 (Dual Role Consistency Proof)**: Observation 1.1.5 confirmed that both Admin (kiosk) and Guru (compact) layouts include the callback ref, ensuring camera functionality regardless of the authenticated user's role.
7. **Step 6 (Contract Preservation)**: Test `REG-01` verified that contracts expected by existing suites (`m3_piket_scanner_kiosk.test.ts`, `presensi_siswa_sync_and_superadmin.test.ts`, etc.) remain intact and passing.

---

## 3. Caveats

1. **Hardware WebRTC Emulation**: Tests ran within Node.js/TypeScript using mock `MediaStream` and DOM element interfaces because physical camera hardware and mobile browser environments cannot be directly attached in terminal CI.
2. **BarcodeDetector Browser Support**: Native `window.BarcodeDetector` is supported in Chromium-based mobile browsers; in Firefox or legacy desktop browsers, the app cleanly falls back to USB HID and manual input, with the dynamic badge displaying instructions to the user.

---

## 4. Conclusion

**Verdict**: **APPROVE**

Worker M1's implementation of Requirement R2 (Camera & QR Lifecycle) and R1.1 (Auto-Filter preservation) in `src/components/PiketView.tsx` is completely sound, resilient against concurrency races, compliant with all existing test contracts, and empirically verified without regressions.

---

## 5. Verification Method

To independently reproduce and verify this verdict, execute the following commands from the project root:

```powershell
# 1. Run the dedicated empirical challenger test suite
npx tsx tests/challenger_m1_camera_qr_lifecycle.test.ts

# 2. Run the complete project regression suite
npm test

# 3. Verify TypeScript type integrity
npx tsc --noEmit

# 4. Verify Next.js production build
npm run build
```

**Invalidation Conditions**:
- Any failure in `tests/challenger_m1_camera_qr_lifecycle.test.ts`.
- Any regression in `npm test` (must pass 27/27 suites).
- Any type error in `npx tsc --noEmit`.
