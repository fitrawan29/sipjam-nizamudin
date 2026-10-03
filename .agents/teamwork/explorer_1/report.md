# Investigation Report: Camera Anti-Zoom & Accurate Orientation (Task R1)

**Investigator**: Explorer 1 (`teamwork_preview_explorer`)  
**Target Milestone**: R1 (Camera Anti-Zoom and Accurate Orientation in `CameraSelfieCapture.tsx` & `src/lib/watermarkCanvas.ts`)  
**Date**: 2026-10-03  
**Status**: Completed  

---

## 1. Executive Summary

### 1.1 Context & Core Requirement
The user prompt requests:
> *"Proyek perbaikan komprehensif: Memperbaiki rasio kamera agar 1:1 tanpa zoom...*  
> *R1. Kamera Anti-Zoom dan Orientasi Akurat: Pastikan pengambilan gambar melalui CameraSelfieCapture.tsx tidak men-zoom (skala 1x). Jika kamera dalam mode potret, maka foto yang dihasilkan (baik di `<canvas>` maupun di data akhir) berorientasi potret. Jika lanskap, hasilkan gambar lanskap.*  
> *Acceptance Criteria: Pengambilan foto di mode potret menghasilkan gambar berdimensi vertikal (tinggi > lebar), tanpa cropping buatan/zoom."*

### 1.2 Linguistic & Technical Disambiguation of "Rasio Kamera 1:1 Tanpa Zoom"
- The phrasing *"rasio kamera agar 1:1 tanpa zoom"* was directly clarified by the prompt itself as **`tidak men-zoom (skala 1x)`** (1x optical zoom scale, 1:1 pixel scale, zero digital crop factor).
- It does **not** mean a square (1:1 aspect ratio, width == height). This is mathematically proven by the explicit Acceptance Criteria:  
  `Pengambilan foto di mode potret menghasilkan gambar berdimensi vertikal (tinggi > lebar), tanpa cropping buatan/zoom.`  
  A 1:1 square image has `tinggi === lebar`, which would directly violate `tinggi > lebar`. Furthermore, forcing a 9:16 mobile camera sensor to a 1:1 square would require cropping off 43.8% of the height, directly violating `tanpa cropping buatan/zoom`.
- Therefore, the requirement demands:
  1. **1x Scale**: The full native optical frame delivered by the camera stream must be captured onto the canvas without artificial digital cropping or zoom.
  2. **Accurate Orientation**: In portrait mode, the captured image must be vertical (`height > width`). In landscape mode, it must be horizontal (`width > height`).

### 1.3 Key Finding: The "Smoking Gun" Root Cause
In commit `2cf4a66`, an earlier developer updated the `<video>` element styling to `object-contain` in `CameraSelfieCapture.tsx`. While this prevented visual cropping in the live viewfinder, **the canvas frame capture in `src/lib/watermarkCanvas.ts` was left untouched**.  
Lines 144–164 in `src/lib/watermarkCanvas.ts` enforce an artificial crop:
```ts
const isPortrait = orientation === 'portrait' || (!orientation && width < height);
const targetRatio = isPortrait ? (3 / 4) : (16 / 9);
const srcRatio = width / height;
// Artificially crops the stream to 3:4 (portrait) or 16:9 (landscape) using offsetX and offsetY!
```
- On standard smartphones held vertically, the camera delivers a **9:16** stream (e.g. 720x1280, aspect ratio `0.5625`).
- `drawWatermarkedCanvas` crops this to **3:4** (720x960, aspect ratio `0.75`), cutting off **160 pixels from the top** and **160 pixels from the bottom** (**320 pixels / 25.0% vertical loss**)!
- The teacher's forehead and chin are cut off, producing an abrupt **1.33x digital zoom** jump between the live viewfinder and the captured photo.
- On desktop/laptop webcams (1280x720) in portrait mode, forcing 3:4 crops out **740 pixels out of 1280 pixels (57.8% horizontal loss)**, creating an extreme **2.37x digital zoom**!

---

## 2. End-to-End Camera Pipeline Architecture

```
[GuruPresensi.tsx]      -> orientation="portrait"   (Selfie Presensi Datang/Pulang)
[GuruJurnal.tsx]        -> orientation="landscape"  (Dokumentasi Mengajar)
[PiketView.tsx]         -> orientation="landscape"  (Laporan Kegiatan Piket)
        │
        ▼
[CameraSelfieCapture.tsx]
  1. navigator.mediaDevices.getUserMedia(constraints)
     - Portrait:  width: { ideal: 720, max: 1080 }, height: { ideal: 1280, max: 1920 }
     - Landscape: width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }
  2. <video> viewfinder rendering:
     - Container: orientation === 'portrait' ? 'aspect-[3/4] max-w-sm mx-auto' : 'aspect-video'
     - CSS: className="w-full h-full object-contain -scale-x-100" (front camera mirror)
     - Letterbox / Pillarbox with bg-black ensures 0% distortion and 0% crop on screen.
  3. Action: User clicks "Ambil Foto"
        │
        ▼
[src/lib/watermarkCanvas.ts: drawWatermarkedCanvas]
  4. Frame extraction:
     - width = videoElement.videoWidth (e.g. 720)
     - height = videoElement.videoHeight (e.g. 1280)
  5. [BUG LOCATION] Forced aspect ratio crop:
     - targetRatio = 3/4 (portrait) or 16/9 (landscape)
     - Slices off offsetX / offsetY from the camera frame!
  6. Canvas drawing & Mirroring:
     - ctx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight, 0, 0, drawWidth, drawHeight)
  7. Watermark Badge:
     - Upright, unmirrored, scaled pill badge with WITA date, time, GPS coords, and location name.
  8. Output:
     - canvas.toDataURL('image/jpeg', 0.88)
        │
        ▼
[dataUrlToFile]
  9. Converts dataUrl -> File('foto_kamera_...jpg')
        │
        ▼
[Parent Form Submission]
  10. GuruPresensi / GuruJurnal / PiketView uploads File to Supabase Storage / Google Drive.
```

---

## 3. Detailed Component Analysis & Exact Line Observations

### 3.1 Call Sites Analysis
1. **`src/components/GuruPresensi.tsx` (Lines 695–704)**:
   ```tsx
   <CameraSelfieCapture
     key="camera-selfie"
     orientation="portrait"
     initialCoordinates={userCoords}
     existingPhotoUrl={photoPreviewUrl}
     onPhotoConfirmed={(capturedFile: File, previewUrl: string) => {
       setFile(capturedFile);
       setPhotoPreviewUrl(previewUrl);
     }}
   />
   ```
   - Correctly passes `orientation="portrait"`.
   - Used for teacher presence selfie check-in/check-out.

2. **`src/components/GuruJurnal.tsx` (Lines 1084–1100)**:
   ```tsx
   <CameraSelfieCapture
     key={`cam-jurnal-${tipeJurnal}`}
     orientation="landscape"
     initialFacingMode="environment"
     initialCoordinates={jurnalCoords}
     existingPhotoUrl={photoPreviewUrl}
     onPhotoConfirmed={(capturedFile: File, previewUrl: string) => {
       setFile(capturedFile);
       setPhotoPreviewUrl(previewUrl);
       // ...
     }}
   />
   ```
   - Correctly passes `orientation="landscape"`.
   - Used for teaching documentation.

3. **`src/components/PiketView.tsx` (Lines 1238–1247)**:
   ```tsx
   <CameraSelfieCapture
     key="cam-piket"
     orientation="landscape"
     initialFacingMode="environment"
     existingPhotoUrl={photoPreviewUrl}
     onPhotoConfirmed={(capturedFile: File, previewUrl: string) => {
       setFile(capturedFile);
       setPhotoPreviewUrl(previewUrl);
     }}
   />
   ```
   - Correctly passes `orientation="landscape"`.
   - Used for teacher picket duty documentation.

---

### 3.2 `src/components/CameraSelfieCapture.tsx` Detailed Review

#### Stream Constraints (Lines 139–149)
```ts
const isPortrait = orientation === 'portrait';
const constraints: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: mode },
    width: isPortrait ? { ideal: 720, max: 1080 } : { ideal: 1280, max: 1920 },
    height: isPortrait ? { ideal: 1280, max: 1920 } : { ideal: 720, max: 1080 },
  },
  audio: false,
};
```
- **Strengths**:
  - `facingMode: { ideal: mode }` provides graceful camera switching without throwing `OverconstrainedError` on single-camera hardware.
  - In portrait mode, requests vertical ideal resolution (`height 1280 > width 720`).
  - In landscape mode, requests horizontal ideal resolution (`width 1280 > height 720`).
  - Fallback logic (Lines 156–158) falls back to `{ video: true, audio: false }` if overconstrained.

#### Viewfinder Container & Video Element (Lines 319–348)
```tsx
<div className={`relative w-full ${
  orientation === 'portrait' ? 'aspect-[3/4] max-w-sm mx-auto' : 'aspect-video'
} rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-300 dark:border-slate-700`}>
  {/* Captured Image Preview */}
  {capturedImage ? (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <img
        src={capturedImage}
        alt="Preview Kamera"
        className="w-full h-full object-contain"
      />
      ...
    </div>
  ) : (
    <video
      ref={videoRef}
      playsInline
      autoPlay
      muted
      className={`w-full h-full object-contain transform ${
        facingMode === 'user' ? '-scale-x-100' : ''
      } ${isStreaming ? 'block' : 'hidden'}`}
    />
  )}
</div>
```
- **Strengths**:
  - `object-contain` ensures the video feed is never cropped or distorted on screen.
  - `-scale-x-100` correctly mirrors the live preview for front-facing selfie mode.
  - `bg-black flex items-center justify-center` provides letterboxing/pillarboxing for sensors of any aspect ratio.
  - `img` preview also has `object-contain`.

---

### 3.3 `src/lib/watermarkCanvas.ts` Root Cause Dissection

#### Existing Code (Lines 143–188):
```ts
// Calculate crop dimensions based on requested orientation or source aspect ratio
const isPortrait = orientation === 'portrait' || (!orientation && width < height);
const targetRatio = isPortrait ? (3 / 4) : (16 / 9);
const srcRatio = width / height;

let drawWidth = width;
let drawHeight = height;
let offsetX = 0;
let offsetY = 0;

if (srcRatio > targetRatio) {
  // Source is wider than target ratio
  drawWidth = height * targetRatio;
  drawHeight = height;
  offsetX = (width - drawWidth) / 2;
} else if (srcRatio < targetRatio) {
  // Source is taller than target ratio
  drawWidth = width;
  drawHeight = width / targetRatio;
  offsetY = (height - drawHeight) / 2;
}

const canvas = document.createElement('canvas');
canvas.width = Math.round(drawWidth);
canvas.height = Math.round(drawHeight);
drawWidth = canvas.width;
drawHeight = canvas.height;

const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Canvas 2D context is not available');
}

// Draw media frame with crop (simulating CSS object-cover)
if (mirror) {
  ctx.save();
  ctx.translate(drawWidth, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight, 0, 0, drawWidth, drawHeight);
  ctx.restore();
} else {
  ctx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight, 0, 0, drawWidth, drawHeight);
}
```

#### Why This Breaks 1x Scale (Empirical Proof):
| Camera Stream Source | Stream Dimensions | Requested Orientation | Existing Canvas Dimensions | Pixels Discarded | Crop % | Scale Factor | User Symptom |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Mobile Front Camera (9:16)** | 720 × 1280 | `portrait` | 720 × 960 (3:4) | 320 px vertical (`offsetY = 160`) | **25.0%** | **1.33x** | Forehead and chin sliced off upon capture |
| **Mobile High-Res (9:16)** | 1080 × 1920 | `portrait` | 1080 × 1440 (3:4) | 480 px vertical (`offsetY = 240`) | **25.0%** | **1.33x** | Extreme vertical crop |
| **Desktop Webcam (16:9)** | 1280 × 720 | `portrait` | 540 × 720 (3:4) | 740 px horizontal (`offsetX = 370`) | **57.8%** | **2.37x** | Extreme digital zoom / close-up |
| **Mobile Rear Camera (4:3)** | 1280 × 960 | `landscape` | 1280 × 720 (16:9) | 240 px vertical (`offsetY = 120`) | **25.0%** | **1.33x** | Top and bottom sliced off |
| **Mobile Ultra-Tall (19.5:9)** | 1080 × 2340 | `portrait` | 1080 × 1440 (3:4) | 900 px vertical (`offsetY = 450`) | **38.5%** | **1.63x** | Severe zooming on modern Android/iPhones |

**Conclusion**: The calculation forces `targetRatio = 3/4` (portrait) or `16/9` (landscape), which discards significant portions of the optical sensor frame.

---

## 4. The Exact Solution for 1x Anti-Zoom & Accurate Orientation

### 4.1 Core Mathematical Principle
1. **Natural Stream Orientation Matches Request**:
   - When `orientation === 'portrait'` and the incoming stream is **already portrait** (`height > width`, e.g. 720x1280, 1080x1920):
     - **DO NOT CROP!**
     - `drawWidth = width; drawHeight = height; offsetX = 0; offsetY = 0;`
     - `canvas.width = width; canvas.height = height;`
     - **Scale**: Exactly **1x** (0% crop, 0% zoom).
     - **Orientation**: Guaranteed **vertical** (`height > width`).
   - When `orientation === 'landscape'` and the incoming stream is **already landscape** (`width >= height`, e.g. 1280x720, 1920x1080, 1280x960):
     - **DO NOT CROP!**
     - `drawWidth = width; drawHeight = height; offsetX = 0; offsetY = 0;`
     - `canvas.width = width; canvas.height = height;`
     - **Scale**: Exactly **1x** (0% crop, 0% zoom).
     - **Orientation**: Guaranteed **horizontal** (`width >= height`).

2. **Orientation Mismatch Fallback (Hardware Constraint Handling)**:
   - When `orientation === 'portrait'` but the incoming stream is **landscape** (`width > height`, e.g. laptop webcam 1280x720):
     - Webcams cannot be physically rotated in hardware. To satisfy `height > width`, the horizontal width is center-cropped to vertical 3:4:
       `targetRatio = 3 / 4;`
       `drawWidth = height * targetRatio;` (e.g. 540)
       `drawHeight = height;` (720)
       `offsetX = (width - drawWidth) / 2;`
       `canvas.width = Math.round(drawWidth); canvas.height = Math.round(drawHeight);`
       Produces `canvas.height (720) > canvas.width (540)` (vertical portrait).
   - When `orientation === 'landscape'` but the incoming stream is **portrait** (`height > width`, e.g. phone held vertically in `GuruJurnal`):
     - To satisfy `width > height`, center-crop height to landscape:
       `targetRatio = 16 / 9;`
       `drawWidth = width;`
       `drawHeight = width / targetRatio;`
       `offsetY = (height - drawHeight) / 2;`
       `canvas.width = Math.round(drawWidth); canvas.height = Math.round(drawHeight);`
       Produces `canvas.width > canvas.height` (horizontal landscape).

3. **No Orientation Specified**:
   - Preserves 100% natural resolution:
     `canvas.width = width; canvas.height = height;`

---

### 4.2 Proposed Code Modification in `src/lib/watermarkCanvas.ts`

```ts
export function drawWatermarkedCanvas(
  videoElement: HTMLVideoElement | HTMLImageElement,
  options: WatermarkOptions,
  mirror: boolean = false,
  orientation?: 'portrait' | 'landscape'
): string {
  // Determine width and height based on element type
  let width = 640;
  let height = 480;

  if (typeof HTMLVideoElement !== 'undefined' && videoElement instanceof HTMLVideoElement) {
    width = videoElement.videoWidth || videoElement.clientWidth || 640;
    height = videoElement.videoHeight || videoElement.clientHeight || 480;
  } else if (typeof HTMLImageElement !== 'undefined' && videoElement instanceof HTMLImageElement) {
    width = videoElement.naturalWidth || videoElement.width || 640;
    height = videoElement.naturalHeight || videoElement.height || 480;
  }

  // Anti-zoom 1x scale: Preserve natural full-frame if orientation already matches
  const isStreamPortrait = height > width;
  const isPortraitRequested = orientation === 'portrait';
  const isLandscapeRequested = orientation === 'landscape';

  let drawWidth = width;
  let drawHeight = height;
  let offsetX = 0;
  let offsetY = 0;

  if (isPortraitRequested && !isStreamPortrait) {
    // Mismatch: Landscape feed (e.g. laptop webcam 1280x720) requested in portrait mode.
    // Center-crop width to achieve vertical portrait (height > width).
    const targetRatio = 3 / 4;
    drawWidth = height * targetRatio;
    drawHeight = height;
    offsetX = (width - drawWidth) / 2;
  } else if (isLandscapeRequested && isStreamPortrait) {
    // Mismatch: Portrait feed (e.g. mobile held vertically) requested in landscape mode.
    // Center-crop height to achieve horizontal landscape (width > height).
    const targetRatio = 16 / 9;
    drawWidth = width;
    drawHeight = width / targetRatio;
    offsetY = (height - drawHeight) / 2;
  } else {
    // 1x scale without artificial cropping/zoom:
    // Natural orientation already matches requested orientation (or no orientation requested).
    drawWidth = width;
    drawHeight = height;
    offsetX = 0;
    offsetY = 0;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(drawWidth);
  canvas.height = Math.round(drawHeight);
  drawWidth = canvas.width;
  drawHeight = canvas.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }

  // Draw media frame at 1x uncropped scale (with optional horizontal mirror for selfie)
  if (mirror) {
    ctx.save();
    ctx.translate(drawWidth, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight, 0, 0, drawWidth, drawHeight);
    ctx.restore();
  } else {
    ctx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight, 0, 0, drawWidth, drawHeight);
  }

  // Watermark positioning dynamically scales to canvas dimensions (remains 100% upright and centered)
  // ...
```

---

## 5. Interaction with Existing Test Suites

### 5.1 Test Audit Analysis
Running `npm test` executes 15 test suites:
- `tests/camera_zoom_fix.test.ts`:
  - Verifies `<video>` and `<img>` use `object-contain`.
  - Verifies `bg-black`, `overflow-hidden`, `rounded-xl`.
  - Verifies constraints `{ ideal: 720, max: 1080 }` for portrait and `{ ideal: 1280, max: 1920 }` for landscape.
  - **Verdict**: Completely passes and remains valid.

- `tests/camera_orientation.test.ts`:
  - Written in milestone `2026-10-03T00:45:54Z`.
  - Lines 154–157 assert:
    ```ts
    assert(
      watermarkContent.includes("const isPortrait = orientation === 'portrait' || (!orientation && width < height);") &&
      watermarkContent.includes("const targetRatio = isPortrait ? (3 / 4) : (16 / 9);"),
      'watermarkCanvas computes targetRatio 3/4 for portrait and 16/9 for landscape'
    );
    ```
  - Line 219 asserts:
    ```ts
    assert(
      Math.abs((lastCreatedCanvas.width / lastCreatedCanvas.height) - (3 / 4)) < 0.01,
      `Portrait canvas matches 3:4 target aspect ratio (${lastCreatedCanvas?.width}x${lastCreatedCanvas?.height})`
    );
    ```
  - **Crucial Action for Implementer**:
    The author of the implementation must update `tests/camera_orientation.test.ts` to assert:
    1. In portrait mode, `lastCreatedCanvas.height > lastCreatedCanvas.width` (vertical).
    2. With a portrait feed (720x1280), canvas retains 1x uncropped scale (`width === 720, height === 1280`).
    3. With a landscape webcam feed (1280x720) in portrait mode, canvas is vertical (`height > width`).
    4. With a landscape feed (1280x720) in landscape mode, canvas retains 1x uncropped scale (`width === 1280, height === 720`).

- `tests/m10_r2_r3.test.ts`:
  - Verifies mirroring coordinate transform (`ctx.translate(drawWidth, 0)`, `ctx.scale(-1, 1)`, `ctx.restore()`).
  - **Verdict**: Completely passes.

- `tests/m7_comprehensive_e2e.test.ts`:
  - Invokes `drawWatermarkedCanvas(mockImgElement, watermarkOpts)` with 640x480 without `orientation`.
  - **Verdict**: Completely passes.

---

## 6. Verification Plan for Downstream Implementer / Verifier

### 6.1 Automated Verification Commands
```bash
# 1. Run camera-specific test suites
npx tsx tests/camera_orientation.test.ts
npx tsx tests/camera_zoom_fix.test.ts

# 2. Run full test suite (all 15 suites)
npm test

# 3. TypeScript validation
npx tsc --noEmit

# 4. Production build check
npm run build
```

### 6.2 Manual / Functional Verification Checklist
1. **Guru Presensi (Portrait)**:
   - Open `/` or Presensi Datang/Pulang.
   - Verify camera preview is vertical with `object-contain`.
   - Take selfie photo: verify the preview matches the live video 1:1 without jumping, zooming, or cropping forehead/chin.
   - Confirm photo: check resulting JPEG data URL and File dimensions have `height > width`.
2. **Guru Jurnal & Piket (Landscape)**:
   - Open Jurnal or Piket camera view.
   - Verify camera preview is horizontal with `object-contain`.
   - Take documentation photo: verify full optical sensor view is preserved (1x scale).
   - Check resulting JPEG data URL and File dimensions have `width >= height`.
3. **Front Camera Mirroring**:
   - Verify live video is flipped (`-scale-x-100`) like a mirror.
   - Verify captured photo matches live view.
   - Verify watermark text (date, WITA time, location) is upright and readable (not backwards).

---

## 7. Conclusion & Recommendation for Implementation Team

1. Keep `<video className="w-full h-full object-contain ...">` in `src/components/CameraSelfieCapture.tsx` — it provides optimal letterbox presentation for all sensor shapes without stretching or hardware cropping.
2. Update `drawWatermarkedCanvas` in `src/lib/watermarkCanvas.ts` to implement 1x scale without artificial cropping when stream orientation matches requested orientation.
3. Update `tests/camera_orientation.test.ts` to test for 1x uncropped scale in portrait mode rather than obsolete hardcoded 3:4 cropping.
4. Run `npm test && npx tsc --noEmit && npm run build` to confirm zero regressions across the codebase.
