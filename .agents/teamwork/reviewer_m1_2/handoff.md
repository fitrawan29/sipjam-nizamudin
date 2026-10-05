# Handoff Report — reviewer_m1_2: Independent Review of Requirement R2 (Perbaikan Kamera QR Code)

**Reviewer Agent**: `reviewer_m1_2`  
**Roles**: Reviewer, Adversarial Critic  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\teamwork\reviewer_m1_2`  
**Target Code**: `src/components/PiketView.tsx`  
**Worker Under Review**: `worker_m1`  
**Verdict**: **APPROVE**  
**Timestamp**: 2026-10-05T10:30:00Z  

---

## 1. Observation

### 1.1 Root Cause of Original Blank/Black Screen Bug
In `src/components/PiketView.tsx`, the `<video>` element was rendered conditionally inside `{cameraActive && (...) }`. Previously:
1. `startCamera()` requested the media stream via `getUserMedia`.
2. While `cameraActive` was still `false`, `<video>` was unmounted from the DOM, so `videoRef.current` was `null`.
3. When `startCamera()` reached `if (videoRef.current) { videoRef.current.srcObject = stream; }`, the assignment was skipped.
4. Calling `setCameraActive(true)` caused React to mount `<video>`, but no callback ref or effect attached the previously acquired stream to `videoRef.current.srcObject`.
5. The video element stayed black/blank, `video.readyState` remained 0, and `BarcodeDetector` was starved of video frames.

### 1.2 Implemented Fix in `src/components/PiketView.tsx`
Direct inspection of `src/components/PiketView.tsx` verified the following code:

1. **State & Mutex Declarations** (lines 88–96):
   ```tsx
   const [cameraActive, setCameraActive] = useState(false);
   const [cameraError, setCameraError] = useState<string | null>(null);
   const videoRef = useRef<HTMLVideoElement | null>(null);
   const streamRef = useRef<MediaStream | null>(null);
   const isStartingCameraRef = useRef(false);
   const isDetectingRef = useRef(false);
   const lastCameraScannedRef = useRef<{ code: string; time: number } | null>(null);
   ```

2. **Concurrency Mutex & Constraints Negotiation** (lines 279–316):
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
     streamRef.current = stream;
     ...
     setCameraActive(true);
   } finally {
     isStartingCameraRef.current = false;
   }
   ```

3. **Callback Ref on `<video>` for Synchronous Mount Attachment** (lines 1904–1919 and lines 2541–2556):
   Both Guru and Admin layouts implement:
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

4. **Secondary Synchronization via `useEffect([cameraActive])`** (lines 362–375):
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

5. **Hardware Release & Lifecycle Cleanups** (lines 350–387):
   ```tsx
   const stopCamera = () => {
     if (streamRef.current) {
       streamRef.current.getTracks().forEach(track => track.stop());
       streamRef.current = null;
     }
     if (videoRef.current) {
       videoRef.current.srcObject = null;
     }
     setCameraActive(false);
   };

   useEffect(() => {
     if (activeTab !== 'scan' && cameraActive) {
       stopCamera();
     }
   }, [activeTab, cameraActive]);

   useEffect(() => {
     return () => {
       stopCamera();
     };
   }, []);
   ```

6. **Frame Detection Guard** (lines 403–425):
   ```tsx
   if (!videoRef.current || videoRef.current.readyState < 2 || isDetectingRef.current) return;
   ```

### 1.3 Independent Verification Tool Executions
- `npx tsc --noEmit` exited with code 0 (0 type errors).
- `npm test` exited with code 0 (all 27 test suites passed).
- `npx tsx tests/r2_camera_piket_reviewer.test.ts` exited with code 0 (15/15 PASS).
- `npx tsx tests/challenger_m1_camera_qr_lifecycle.test.ts` exited with code 0 (18/18 PASS).
- `npx tsx tests/m3_piket_scanner_kiosk.test.ts` exited with code 0 (37/37 PASS).
- `npm run build` completed successfully in 1.4s (all 12 routes generated cleanly).

---

## 2. Logic Chain

1. **Step 1 (Root Cause Resolution)**:
   - When the user clicks "Buka Kamera", `startCamera()` retrieves the media stream and stores it in `streamRef.current`.
   - When React renders and mounts the `<video>` element, the callback ref executes immediately upon DOM node insertion.
   - Because `streamRef.current` is already non-null, `el.srcObject = streamRef.current` is executed synchronously.
   - If React re-renders or switches layout modes, `useEffect([cameraActive])` provides a secondary guarantee of binding and playback.
   - Therefore, the black/blank screen race condition is completely eradicated.

2. **Step 2 (Device Compatibility & Fallback)**:
   - Requesting `facingMode: { ideal: 'environment' }` prevents devices lacking an environment camera from failing immediately.
   - The fallback catch to `{ video: true, audio: false }` ensures that desktop webcams, external USB cameras, or laptops seamlessly acquire a video stream even if environment constraints fail.

3. **Step 3 (Autoplay & Mobile Safari Resilience)**:
   - iOS Safari requires `playsinline`, `webkit-playsinline`, and `muted = true` before allowing automatic media playback.
   - Both JSX attributes and explicit DOM `setAttribute` / `muted = true` invocations are executed before calling `play()`.
   - Autoplay rejection errors are safely caught with `.catch()`, preventing unhandled promise rejections.

4. **Step 4 (Hardware Resource Leaks & Concurrency)**:
   - Rapid double-clicks on "Buka Kamera" are blocked by the synchronous `isStartingCameraRef` mutex.
   - Any previous tracks are stopped before acquiring new ones.
   - When the user stops the camera, switches tabs, or unmounts the component, all MediaStream tracks are terminated (`track.stop()`), turning off the camera indicator LED and freeing operating system camera devices.

5. **Step 5 (Integrity & Adversarial Audit)**:
   - Inspected for dummy facades, test shortcuts, or hardcoded mock streams: none were found. Real Web APIs (`MediaStream`, `BarcodeDetector`, `getUserMedia`) are utilized throughout.
   - No mock bypasses exist.

---

## 3. Caveats

1. **Browser Permission & Secure Context**:
   - Access to `navigator.mediaDevices.getUserMedia` requires a secure context (HTTPS or localhost). In non-secure contexts or when permissions are explicitly denied, `PiketView` cleanly catches the error and displays an informative banner in Indonesian explaining how to enable permissions.
2. **BarcodeDetector Support**:
   - Native `window.BarcodeDetector` is currently supported in Chromium-based browsers (Chrome, Edge, Opera, Android Chrome). For unsupported environments (e.g. desktop Firefox), the video stream displays smoothly with a clear badge indicating that BarcodeDetector is unavailable and guiding users to use USB HID scanners or manual NISN input.

---

## 4. Conclusion

**Verdict: APPROVE**

The implementation of Requirement R2 (Perbaikan Kamera QR Code) in `src/components/PiketView.tsx` by Worker M1 is high quality, robust, and completely resolves the blank screen bug. It correctly handles stream binding, playback policies, hardware release, device fallbacks, and concurrency guards.

---

## 5. Verification Method

To independently verify this evaluation, execute the following commands from the project root:

```powershell
# 1. Type safety check
npx tsc --noEmit

# 2. Reviewer dedicated R2 test suite
npx tsx tests/r2_camera_piket_reviewer.test.ts

# 3. Challenger empirical lifecycle test suite
npx tsx tests/challenger_m1_camera_qr_lifecycle.test.ts

# 4. Kiosk regression test suite
npx tsx tests/m3_piket_scanner_kiosk.test.ts

# 5. Full test suite
npm test

# 6. Production build check
npm run build
```

**Invalidation Conditions**:
- Any error when calling `npx tsc --noEmit` or `npm test`.
- Missing callback ref on `<video>` or absence of `isStartingCameraRef` mutex.
- Hardware media tracks left running after unmounting or switching tabs.
