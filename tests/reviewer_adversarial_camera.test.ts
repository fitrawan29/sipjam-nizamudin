import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('REVIEWER ADVERSARIAL VERIFICATION: CAMERA PORTRAIT & ANTI AUTO-ZOOM');
console.log('========================================================================\n');

let failed = 0;
let passed = 0;
function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

const rootDir = path.join(__dirname, '..');
const cameraCompPath = path.join(rootDir, 'src', 'components', 'CameraSelfieCapture.tsx');
const guruPresensiPath = path.join(rootDir, 'src', 'components', 'GuruPresensi.tsx');
const watermarkPath = path.join(rootDir, 'src', 'lib', 'watermarkCanvas.ts');

assert(fs.existsSync(cameraCompPath), 'CameraSelfieCapture.tsx exists');
assert(fs.existsSync(guruPresensiPath), 'GuruPresensi.tsx exists');
assert(fs.existsSync(watermarkPath), 'watermarkCanvas.ts exists');

const cameraContent = fs.readFileSync(cameraCompPath, 'utf-8');
const presensiContent = fs.readFileSync(guruPresensiPath, 'utf-8');
const watermarkContent = fs.readFileSync(watermarkPath, 'utf-8');

// --- Section 1: GuruPresensi.tsx Strict Requirements ---
console.log('\n--- Section 1: GuruPresensi.tsx Portrait Invariants ---');

// Extract all occurrences of CameraSelfieCapture in GuruPresensi
const cameraCalls = presensiContent.match(/<CameraSelfieCapture[\s\S]*?\/>/g) || [];
assert(cameraCalls.length === 1, `GuruPresensi renders exactly 1 CameraSelfieCapture instance (found ${cameraCalls.length})`);

if (cameraCalls.length > 0) {
  const call = cameraCalls[0];
  assert(call.includes('orientation="portrait"'), 'GuruPresensi camera call strictly sets orientation="portrait"');
  assert(!call.includes('orientation="landscape"'), 'GuruPresensi camera call does NOT set orientation="landscape"');
  assert(call.includes('initialFacingMode="user"'), 'GuruPresensi sets initialFacingMode="user" for front selfie camera');
  assert(call.includes('existingPhotoUrl={photoPreviewUrl}'), 'GuruPresensi binds photoPreviewUrl for synchronized state');
  assert(call.includes('onRetake='), 'GuruPresensi binds onRetake callback to eliminate stale file state on retake');
}

// Verify attendance types requiring selfie in GuruPresensi
assert(
  presensiContent.includes("const isSelfieRequired = tipeAbsen === 'Pulang' || (tipeAbsen === 'Datang' && jenisPresensi !== 'Izin') || jenisPresensi === 'Dinas Luar';"),
  'isSelfieRequired logic correctly requires selfie for Pulang, Datang (non-Izin), and Dinas Luar'
);

// --- Section 2: CameraSelfieCapture Viewport & Anti-Zoom Invariants ---
console.log('\n--- Section 2: CameraSelfieCapture Viewport & Anti-Zoom Invariants ---');

// Viewport aspect ratio
assert(
  cameraContent.includes("orientation === 'portrait' ? 'aspect-[3/4] max-w-sm mx-auto' : 'aspect-video'"),
  'Camera viewport container enforces aspect-[3/4] max-w-sm mx-auto for portrait'
);

// <video> styling
const videoTag = (cameraContent.match(/<video[\s\S]*?\/>/) || [])[0] || '';
assert(videoTag.includes('object-contain'), '<video> uses CSS object-contain to eliminate cropping');
assert(!videoTag.includes('object-cover'), '<video> strictly avoids CSS object-cover');
assert(!videoTag.match(/\bscale-(?:105|110|125|150|200)\b/), '<video> has no CSS scale zoom classes');

// <img> preview styling
const imgTag = (cameraContent.match(/<img[\s\S]*?\/>/) || [])[0] || '';
assert(imgTag.includes('object-contain'), 'Preview <img> uses CSS object-contain matching video preview');
assert(!imgTag.includes('object-cover'), 'Preview <img> strictly avoids CSS object-cover');
assert(!imgTag.match(/\bscale-(?:105|110|125|150|200)\b/), 'Preview <img> has no CSS scale zoom classes');

// Constraints check
assert(
  cameraContent.includes('width: isPortrait ? { ideal: 720, max: 1080 } : { ideal: 1280, max: 1920 }') &&
  cameraContent.includes('height: isPortrait ? { ideal: 1280, max: 1920 } : { ideal: 720, max: 1080 }'),
  'MediaStreamConstraints request portrait dimensions (height > width) when orientation is portrait'
);

// --- Section 3: watermarkCanvas.ts 1x Scale Mathematical Proof ---
console.log('\n--- Section 3: watermarkCanvas.ts 1x Scale Mathematical Proof ---');

// Mock HTML canvas environment for functional watermark testing
let canvasWidth = 0;
let canvasHeight = 0;
let drawImageArgs: any[] = [];

if (typeof (global as any).document === 'undefined') {
  (global as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return {
          set width(w: number) { canvasWidth = w; },
          get width() { return canvasWidth; },
          set height(h: number) { canvasHeight = h; },
          get height() { return canvasHeight; },
          getContext: () => ({
            save: () => {},
            translate: () => {},
            scale: () => {},
            drawImage: (...args: any[]) => { drawImageArgs = args; },
            beginPath: () => {},
            roundRect: () => {},
            moveTo: () => {},
            arcTo: () => {},
            closePath: () => {},
            fill: () => {},
            stroke: () => {},
            fillText: () => {},
            measureText: (txt: string) => ({ width: txt.length * 8 }),
            restore: () => {},
          }),
          toDataURL: () => 'data:image/jpeg;base64,/9j/mockData',
        };
      }
      return {};
    },
  };
}

if (typeof (global as any).HTMLVideoElement === 'undefined') {
  (global as any).HTMLVideoElement = class {};
}
if (typeof (global as any).HTMLImageElement === 'undefined') {
  (global as any).HTMLImageElement = class {};
}

import { drawWatermarkedCanvas, dataUrlToFile, getDefaultWatermarkOptions, reverseGeocodeNominatim } from '../src/lib/watermarkCanvas';

const sampleOpts = getDefaultWatermarkOptions({ latitude: -8.5, longitude: 115.2 }, 'Ubud, Bali');

function testFeed(name: string, feedW: number, feedH: number, requestedOrientation: 'portrait' | 'landscape', expectedW: number, expectedH: number) {
  const mock = new (global as any).HTMLImageElement();
  mock.width = feedW;
  mock.height = feedH;
  drawImageArgs = [];
  drawWatermarkedCanvas(mock, sampleOpts, true, requestedOrientation);

  const exactWidthMatch = canvasWidth === expectedW;
  const exactHeightMatch = canvasHeight === expectedH;
  const zeroCrop = drawImageArgs.length >= 9 && drawImageArgs[1] === 0 && drawImageArgs[2] === 0 && drawImageArgs[3] === feedW && drawImageArgs[4] === feedH;

  assert(
    exactWidthMatch && exactHeightMatch,
    `Feed ${name} (${feedW}x${feedH}) in ${requestedOrientation} produced expected canvas dimensions (${canvasWidth}x${canvasHeight} vs ${expectedW}x${expectedH})`
  );
  if (expectedW === feedW && expectedH === feedH) {
    assert(zeroCrop, `Feed ${name} (${feedW}x${feedH}) has ZERO crop offset (offsetX=0, offsetY=0, 1x uncropped scale)`);
  }
}

// Test common portrait smartphone sensors
testFeed('Phone 9:16 (720x1280)', 720, 1280, 'portrait', 720, 1280);
testFeed('Phone 9:16 Full HD (1080x1920)', 1080, 1920, 'portrait', 1080, 1920);
testFeed('Phone 3:4 (960x1280)', 960, 1280, 'portrait', 960, 1280);
testFeed('Phone 3:4 High-res (2448x3264)', 2448, 3264, 'portrait', 2448, 3264);
testFeed('Phone 9:19.5 Tall (1080x2340)', 1080, 2340, 'portrait', 1080, 2340);
testFeed('Phone 9:20 Ultra-tall (1080x2400)', 1080, 2400, 'portrait', 1080, 2400);

// Test desktop webcam in portrait mode (fallback center-crop to 3:4 vertical)
testFeed('Webcam 16:9 (1280x720) in portrait', 1280, 720, 'portrait', 540, 720);
assert(
  drawImageArgs[1] === (1280 - 540) / 2 && drawImageArgs[2] === 0,
  'Webcam 16:9 in portrait mode applies symmetrical horizontal center crop to 3:4 ratio'
);

// --- Section 4: dataUrlToFile Robustness Under Adversarial Inputs ---
console.log('\n--- Section 4: dataUrlToFile Adversarial Inputs ---');

const validDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const file1 = dataUrlToFile(validDataUrl, 'valid.jpg');
assert(file1 instanceof File && file1.name === 'valid.jpg' && file1.type === 'image/jpeg', 'Valid base64 dataUrl decodes to File');

const emptyFile = dataUrlToFile('', 'empty.jpg');
assert(emptyFile instanceof File && emptyFile.size === 0, 'Empty string returns empty placeholder File safely');

const nonDataUrlFile = dataUrlToFile('https://example.com/photo.jpg', 'remote.jpg');
assert(nonDataUrlFile instanceof File && nonDataUrlFile.size === 0, 'HTTP URL returns placeholder File safely without exception');

const corruptedBase64File = dataUrlToFile('data:image/jpeg;base64,!!!NOT_BASE_64@@@', 'corrupt.jpg');
assert(corruptedBase64File instanceof File, 'Malformed base64 returns placeholder File gracefully');

// --- Section 5: Watermark Coordinates & Location Resilience ---
console.log('\n--- Section 5: Watermark Coordinates & Location Resilience ---');

const noCoordsOpts = getDefaultWatermarkOptions(null, null);
assert(noCoordsOpts.coordinates === null, 'Watermark options safely handles null coordinates');
assert(noCoordsOpts.locationName === null, 'Watermark options safely handles null locationName');

const validCoordsOpts = getDefaultWatermarkOptions({ latitude: -8.123456, longitude: 115.654321 }, 'Kantor Sekolah');
assert(
  validCoordsOpts.coordinates?.latitude === -8.123456 && validCoordsOpts.coordinates?.longitude === 115.654321,
  'Watermark options preserves full coordinate precision'
);

// --- Section 6: Camera Lifecycle, Retake Synchronization & WebKit Autoplay ---
console.log('\n--- Section 6: Camera Lifecycle, Retake Sync & WebKit Autoplay Resilience ---');

// Re-read latest file contents with normalized newlines
const currentCameraCode = fs.readFileSync(cameraCompPath, 'utf-8').replace(/\r\n/g, '\n');
const currentPresensiCode = fs.readFileSync(guruPresensiPath, 'utf-8').replace(/\r\n/g, '\n');
const currentWatermarkCode = fs.readFileSync(watermarkPath, 'utf-8').replace(/\r\n/g, '\n');

assert(
  currentCameraCode.includes('onRetake?: () => void;'),
  'CameraSelfieCaptureProps declares optional onRetake?: () => void;'
);
assert(
  currentCameraCode.includes('onRetake?.();'),
  'CameraSelfieCapture triggers onRetake?.() inside handleRetake to alert parent form'
);
assert(
  currentPresensiCode.includes('onRetake={() => {') &&
  currentPresensiCode.includes('setFile(null);') &&
  currentPresensiCode.includes('setPhotoPreviewUrl(null);'),
  'GuruPresensi cleanly flushes confirmed file & preview URL when retake is triggered'
);
assert(
  currentCameraCode.includes('videoRef.current.muted = true;'),
  'CameraSelfieCapture explicitly sets muted=true on DOM node to prevent WebKit autoplay lockup'
);
assert(
  currentCameraCode.includes("e?.name === 'OverconstrainedError' || e?.name === 'ConstraintNotSatisfiedError'"),
  'CameraSelfieCapture handles ConstraintNotSatisfiedError in addition to OverconstrainedError'
);
assert(
  currentCameraCode.includes('setCameraError(') &&
  currentCameraCode.includes('Gagal memutar video kamera'),
  'CameraSelfieCapture surfaces video play errors to user instead of hanging on infinite spinner'
);
assert(
  currentWatermarkCode.includes('isFinite(options.coordinates.latitude)') &&
  currentWatermarkCode.includes('!isNaN(options.coordinates.latitude)'),
  'watermarkCanvas guards against NaN/Infinite coordinates to prevent badge distortion'
);

// --- Section 7: Unmount Leak Protection & Hardware Track Release ---
console.log('\n--- Section 7: Unmount Leak Protection & Hardware Track Release ---');

assert(
  currentCameraCode.includes('if (!isMountedRef.current || currentSession !== activeSessionIdRef.current) {\n            stream.getTracks().forEach(t => t.stop());\n            return;\n          }'),
  'CameraSelfieCapture stops tracks and aborts if unmounted during video.play() resolution'
);
assert(
  currentCameraCode.includes('stream.getTracks().forEach(t => t.stop());\n          streamRef.current = null;\n          if (videoRef.current) {\n            videoRef.current.srcObject = null;\n          }'),
  'CameraSelfieCapture releases hardware tracks and clears srcObject on video.play() rejection'
);
assert(
  currentCameraCode.includes('if (!isMountedRef.current || currentSession !== activeSessionIdRef.current) {\n        return;\n      }'),
  'Outer camera error handler aborts without updating state if component unmounted'
);

// --- Section 8: Concurrent Capture & Confirm Idempotency Guards ---
console.log('\n--- Section 8: Concurrent Capture & Confirm Idempotency Guards ---');

assert(
  currentCameraCode.includes('if (isStartingRef.current || !isStreaming || capturedImage) return;'),
  'handleCapturePhoto rejects rapid multi-clicks while starting, before streaming, or when image already captured'
);
assert(
  currentCameraCode.includes('if (isConfirmingRef.current) return;'),
  'handleConfirmPhoto prevents double-confirmation submission race conditions'
);
assert(
  currentCameraCode.includes('isConfirmingRef.current = false;'),
  'handleRetake resets isConfirmingRef allowing future photo confirmation'
);

async function runAsyncSections() {
  // --- Section 9: Reverse Geocoding Non-Finite Coordinate Handling ---
  console.log('\n--- Section 9: Reverse Geocoding Non-Finite Coordinate Handling ---');

  const infRes1 = await reverseGeocodeNominatim(Infinity, 115.2);
  assert(infRes1 === '[Lokasi Tidak Terdeteksi]', 'reverseGeocodeNominatim rejects Infinity latitude safely');

  const infRes2 = await reverseGeocodeNominatim(-8.5, -Infinity);
  assert(infRes2 === '[Lokasi Tidak Terdeteksi]', 'reverseGeocodeNominatim rejects -Infinity longitude safely');

  const nanRes = await reverseGeocodeNominatim(NaN, 115.2);
  assert(nanRes === '[Lokasi Tidak Terdeteksi]', 'reverseGeocodeNominatim rejects NaN coordinates safely');

  // --- Section 10: GPS Request Lifecycle Isolation ---
  console.log('\n--- Section 10: GPS Request Lifecycle Isolation ---');

  assert(
    currentCameraCode.includes('if (!capturedImage) {\n      requestLocation();'),
    'requestLocation is strictly isolated to when no photo is captured (prevents GPS scanning flash on preview)'
  );

  console.log('\n========================================================================');
  console.log(`TOTAL CHECKS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================================================');

  if (failed === 0) {
    console.log('🎉 ALL REVIEWER ADVERSARIAL CHECKS PASSED!');
    process.exit(0);
  } else {
    console.error(`💥 ${failed} CHECK(S) FAILED!`);
    process.exit(1);
  }
}

runAsyncSections().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
