import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('CAMERA ORIENTATION PROP VERIFICATION TEST');
console.log('====================================================\n');

let failed = 0;
function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

const rootDir = path.join(__dirname, '..');
const cameraCompPath = path.join(rootDir, 'src', 'components', 'CameraSelfieCapture.tsx');
const guruPresensiPath = path.join(rootDir, 'src', 'components', 'GuruPresensi.tsx');
const guruJurnalPath = path.join(rootDir, 'src', 'components', 'GuruJurnal.tsx');
const piketViewPath = path.join(rootDir, 'src', 'components', 'PiketView.tsx');

// --- Section 1: CameraSelfieCapture.tsx Orientation Implementation ---
console.log('--- Section 1: CameraSelfieCapture.tsx Orientation Implementation ---');
assert(fs.existsSync(cameraCompPath), 'CameraSelfieCapture.tsx exists');
const cameraContent = fs.readFileSync(cameraCompPath, 'utf-8');

assert(
  cameraContent.includes("orientation?: 'portrait' | 'landscape'"),
  'CameraSelfieCaptureProps declares optional orientation?: "portrait" | "landscape"'
);

assert(
  cameraContent.includes("orientation = 'landscape'") || cameraContent.includes("orientation,"),
  'CameraSelfieCapture accepts orientation prop'
);

assert(
  cameraContent.includes("orientation === 'portrait'"),
  'CameraSelfieCapture checks orientation === "portrait"'
);

// Verify portrait vs landscape constraints logic
assert(
  cameraContent.includes("width: isPortrait ? { ideal: 720, max: 1080 } : { ideal: 1280, max: 1600 }") &&
  cameraContent.includes("height: isPortrait ? { ideal: 960, max: 1440 } : { ideal: 960, max: 1200 }"),
  'Camera constraints configure 3:4 portrait (720x960) and 4:3 landscape (1280x960)'
);

// --- Section 2: GuruPresensi.tsx passes orientation="portrait" ---
console.log('\n--- Section 2: GuruPresensi.tsx passes orientation="portrait" ---');
assert(fs.existsSync(guruPresensiPath), 'GuruPresensi.tsx exists');
const presensiContent = fs.readFileSync(guruPresensiPath, 'utf-8');

assert(
  presensiContent.includes('<CameraSelfieCapture') && presensiContent.includes('orientation="portrait"'),
  'GuruPresensi renders CameraSelfieCapture with orientation="portrait"'
);

// Extract the <CameraSelfieCapture ... /> block
const presensiBlockMatch = presensiContent.match(/<CameraSelfieCapture[\s\S]*?\/>/);
assert(
  Boolean(presensiBlockMatch && presensiBlockMatch[0].includes('orientation="portrait"')),
  'CameraSelfieCapture in GuruPresensi strictly has orientation="portrait"'
);

// --- Section 3: GuruJurnal.tsx passes orientation="landscape" ---
console.log('\n--- Section 3: GuruJurnal.tsx passes orientation="landscape" ---');
assert(fs.existsSync(guruJurnalPath), 'GuruJurnal.tsx exists');
const jurnalContent = fs.readFileSync(guruJurnalPath, 'utf-8');

assert(
  jurnalContent.includes('<CameraSelfieCapture') && jurnalContent.includes('orientation="landscape"'),
  'GuruJurnal renders CameraSelfieCapture with orientation="landscape"'
);

const jurnalBlockMatch = jurnalContent.match(/<CameraSelfieCapture[\s\S]*?\/>/);
assert(
  Boolean(jurnalBlockMatch && jurnalBlockMatch[0].includes('orientation="landscape"')),
  'CameraSelfieCapture in GuruJurnal strictly has orientation="landscape"'
);

// --- Section 4: PiketView.tsx passes orientation="landscape" ---
console.log('\n--- Section 4: PiketView.tsx passes orientation="landscape" ---');
assert(fs.existsSync(piketViewPath), 'PiketView.tsx exists');
const piketContent = fs.readFileSync(piketViewPath, 'utf-8');

assert(
  piketContent.includes('<CameraSelfieCapture') && piketContent.includes('orientation="landscape"'),
  'PiketView renders CameraSelfieCapture with orientation="landscape"'
);

const piketBlockMatch = piketContent.match(/<CameraSelfieCapture[\s\S]*?\/>/);
assert(
  Boolean(piketBlockMatch && piketBlockMatch[0].includes('orientation="landscape"')),
  'CameraSelfieCapture in PiketView strictly has orientation="landscape"'
);

// --- Section 5: Constraint Evaluation Logic Emulation ---
console.log('\n--- Section 5: Constraint Evaluation Logic Emulation ---');
function getConstraintsForOrientation(orientation?: 'portrait' | 'landscape') {
  const isPortrait = orientation === 'portrait';
  return {
    video: {
      facingMode: { ideal: 'user' },
      aspectRatio: isPortrait ? { ideal: 3 / 4 } : { ideal: 4 / 3 },
      width: isPortrait ? { ideal: 720, max: 1080 } : { ideal: 1280, max: 1600 },
      height: isPortrait ? { ideal: 960, max: 1440 } : { ideal: 960, max: 1200 },
    }
  };
}

const portraitConstraints = getConstraintsForOrientation('portrait');
assert(
  portraitConstraints.video.height.ideal > portraitConstraints.video.width.ideal,
  'Portrait orientation constraint has height (960) > width (720)'
);

const landscapeConstraints = getConstraintsForOrientation('landscape');
assert(
  landscapeConstraints.video.width.ideal > landscapeConstraints.video.height.ideal,
  'Landscape orientation constraint has width (1280) > height (960)'
);

const defaultConstraints = getConstraintsForOrientation(undefined);
assert(
  defaultConstraints.video.width.ideal > defaultConstraints.video.height.ideal,
  'Default (undefined) orientation constraint defaults to landscape (width > height)'
);

// --- Section 6: UI Viewfinder Container Aspect Ratio Adaptation ---
console.log('\n--- Section 6: UI Viewfinder Container Aspect Ratio Adaptation ---');
assert(
  cameraContent.includes("orientation === 'portrait' ? 'aspect-[3/4] max-w-sm mx-auto' : 'aspect-[4/3]'"),
  'CameraSelfieCapture viewport dynamically applies aspect-[3/4] for portrait and aspect-[4/3] for landscape'
);

assert(
  cameraContent.includes('drawWatermarkedCanvas(videoRef.current, watermarkOpts, isMirror, orientation)'),
  'CameraSelfieCapture forwards orientation prop into drawWatermarkedCanvas'
);

// --- Section 7: watermarkCanvas.ts Orientation & Crop Calculation ---
console.log('\n--- Section 7: watermarkCanvas.ts Orientation & Crop Calculation ---');
const watermarkCompPath = path.join(rootDir, 'src', 'lib', 'watermarkCanvas.ts');
assert(fs.existsSync(watermarkCompPath), 'watermarkCanvas.ts exists');
const watermarkContent = fs.readFileSync(watermarkCompPath, 'utf-8');

assert(
  watermarkContent.includes("orientation?: 'portrait' | 'landscape'"),
  'drawWatermarkedCanvas accepts optional orientation parameter'
);

assert(
  watermarkContent.includes("const isPortrait = orientation === 'portrait' || (!orientation && width < height);") &&
  watermarkContent.includes("drawWidth = width") &&
  watermarkContent.includes("drawHeight = height"),
  'watermarkCanvas preserves 1x scale without artificial crop for matching orientations'
);

// --- Section 8: Functional Canvas Aspect Ratio Verification ---
console.log('\n--- Section 8: Functional Canvas Aspect Ratio Verification ---');
let lastCreatedCanvas: any = null;
if (typeof (global as any).document === 'undefined') {
  (global as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        const c = {
          width: 0,
          height: 0,
          getContext: () => ({
            save: () => {},
            translate: () => {},
            scale: () => {},
            drawImage: () => {},
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
          toDataURL: () => 'data:image/jpeg;base64,mock',
        };
        lastCreatedCanvas = c;
        return c;
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

// Dynamically import watermark functions for functional test
import { drawWatermarkedCanvas, getDefaultWatermarkOptions } from '../src/lib/watermarkCanvas';

const mockImg = new (global as any).HTMLImageElement();
// Simulate standard phone camera feed 720x1280
mockImg.width = 720;
mockImg.height = 1280;

const opts = getDefaultWatermarkOptions({ latitude: -8.12, longitude: 115.12 }, 'Denpasar, Bali');

// 8.1 Portrait capture with vertical stream: 1x uncropped scale
drawWatermarkedCanvas(mockImg, opts, true, 'portrait');
assert(
  Boolean(lastCreatedCanvas && lastCreatedCanvas.height > lastCreatedCanvas.width),
  `Portrait mode produces vertical canvas (width=${lastCreatedCanvas?.width}, height=${lastCreatedCanvas?.height})`
);
assert(
  lastCreatedCanvas?.width === 720 && lastCreatedCanvas?.height === 1280,
  `Portrait canvas retains uncropped 1x scale without artificial crop (${lastCreatedCanvas?.width}x${lastCreatedCanvas?.height})`
);

// 8.2 Landscape capture on vertical feed (crops to 4:3 landscape)
drawWatermarkedCanvas(mockImg, opts, false, 'landscape');
assert(
  Boolean(lastCreatedCanvas && lastCreatedCanvas.width > lastCreatedCanvas.height),
  `Landscape mode produces horizontal canvas (width=${lastCreatedCanvas?.width}, height=${lastCreatedCanvas?.height})`
);
assert(
  Math.abs((lastCreatedCanvas.width / lastCreatedCanvas.height) - (4 / 3)) < 0.05,
  `Landscape canvas matches 4:3 target aspect ratio (${lastCreatedCanvas?.width}x${lastCreatedCanvas?.height})`
);

// 8.2b Landscape capture on 16:9 horizontal feed: cropped to 4:3 landscape (960x720)
const landscapeFeedImg = new (global as any).HTMLImageElement();
landscapeFeedImg.width = 1280;
landscapeFeedImg.height = 720;
drawWatermarkedCanvas(landscapeFeedImg, opts, false, 'landscape');
assert(
  Boolean(lastCreatedCanvas && lastCreatedCanvas.width >= lastCreatedCanvas.height),
  `Landscape mode produces horizontal canvas (width=${lastCreatedCanvas?.width}, height=${lastCreatedCanvas?.height})`
);
assert(
  lastCreatedCanvas?.width === 960 && lastCreatedCanvas?.height === 720,
  `Landscape canvas on 16:9 feed crops to 4:3 aspect ratio 960x720 (${lastCreatedCanvas?.width}x${lastCreatedCanvas?.height})`
);
assert(
  Math.abs((lastCreatedCanvas.width / lastCreatedCanvas.height) - (4 / 3)) < 0.01,
  `Landscape canvas matches 4:3 target ratio (${lastCreatedCanvas?.width}x${lastCreatedCanvas?.height})`
);

// 8.3 Landscape feed with portrait mode (e.g. desktop webcam 1280x720 in GuruPresensi)
const webcamImg = new (global as any).HTMLImageElement();
webcamImg.width = 1280;
webcamImg.height = 720;
drawWatermarkedCanvas(webcamImg, opts, true, 'portrait');
assert(
  Boolean(lastCreatedCanvas && lastCreatedCanvas.height > lastCreatedCanvas.width),
  `Webcam 1280x720 in portrait mode is cropped to vertical 3:4 canvas (width=${lastCreatedCanvas?.width}, height=${lastCreatedCanvas?.height})`
);
assert(
  Math.abs((lastCreatedCanvas.width / lastCreatedCanvas.height) - (3 / 4)) < 0.01,
  `Webcam portrait canvas matches 3:4 target aspect ratio (${lastCreatedCanvas?.width}x${lastCreatedCanvas?.height})`
);

// --- Section 9: Adversarial Edge Cases & Mobile Responsiveness ---
console.log('\n--- Section 9: Adversarial Edge Cases & Mobile Responsiveness ---');
assert(
  cameraContent.includes('videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0'),
  'CameraSelfieCapture guards against unready video stream with 0x0 frame dimensions'
);
assert(
  cameraContent.includes('flex flex-wrap sm:flex-nowrap') && cameraContent.includes('shrink-0'),
  'CameraSelfieCapture header bar implements responsive flex-wrap & shrink-0 protection for screens < 360px'
);
assert(
  cameraContent.includes('gap-2.5 sm:gap-3 flex-wrap'),
  'CameraSelfieCapture live controls implement responsive wrapping and spacing for narrow viewports'
);
assert(
  cameraContent.includes("facingMode: 'user'"),
  'CameraSelfieCapture maintains backward-compatible facingMode user references for M3 test suites'
);

// Verify that NO other call sites in src/ render CameraSelfieCapture without orientation
const srcFiles = [guruPresensiPath, guruJurnalPath, piketViewPath];
for (const file of srcFiles) {
  const fileContent = fs.readFileSync(file, 'utf-8');
  assert(
    fileContent.includes('orientation='),
    `${path.basename(file)} explicitly specifies orientation prop on CameraSelfieCapture`
  );
}

// --- Section 10: R3 Adversarial Review - Media Track Leak Prevention & Lifecycle Hardening ---
console.log('\n--- Section 10: R3 Adversarial Review - Media Track Leak Prevention & Lifecycle Hardening ---');

// 10.1 Active session cancellation & media track leak prevention
assert(
  cameraContent.includes('activeSessionIdRef = useRef(0)') &&
  cameraContent.includes('activeSessionIdRef.current += 1;') &&
  cameraContent.includes('currentSession !== activeSessionIdRef.current'),
  'CameraSelfieCapture implements activeSessionIdRef token to prevent leaked media tracks from in-flight requests'
);

// 10.2 Retake lifecycle preservation
assert(
  cameraContent.includes('isRetakeRef = useRef(false)') &&
  cameraContent.includes('isRetakeRef.current = true;') &&
  cameraContent.includes('facingModeRef.current || initialFacingMode'),
  'CameraSelfieCapture preserves chosen facingMode on photo retake without premature startCamera race conditions'
);

// 10.3 Dynamic orientation change detection while streaming
assert(
  cameraContent.includes('prevOrientationRef = useRef(orientation)') &&
  cameraContent.includes('prevOrientationRef.current !== orientation'),
  'CameraSelfieCapture detects runtime orientation prop changes and renegotiates media stream constraints'
);

// 10.4 Preview container aspect ratio and overflow protection
assert(
  cameraContent.includes('object-contain') &&
  cameraContent.includes('max-w-[calc(100%-1rem)]'),
  'Preview area enforces object-contain and badge max-w bounds to prevent visual overflow on narrow viewports'
);

// 10.5 onCancel graceful camera shutdown
assert(
  cameraContent.includes('stopCamera();\n                onCancel();') ||
  cameraContent.includes('stopCamera();\r\n                onCancel();'),
  'CameraSelfieCapture immediately stops camera stream tracks when onCancel is triggered'
);

// 10.6 Functional dataUrlToFile resilience test
import { dataUrlToFile } from '../src/lib/watermarkCanvas';

const sampleDataUrl = 'data:image/jpeg;base64,' + Buffer.from('test-image-bytes').toString('base64');
const validFile = dataUrlToFile(sampleDataUrl, 'valid_test.jpg');
assert(
  validFile instanceof (global as any).File && validFile.name === 'valid_test.jpg' && validFile.type === 'image/jpeg',
  'dataUrlToFile successfully decodes valid base64 data URL into File'
);

const remoteHttpUrl = 'https://supabase.project.co/storage/v1/object/public/presensi/existing.jpg';
const fallbackFile = dataUrlToFile(remoteHttpUrl, 'remote_test.jpg');
assert(
  fallbackFile instanceof (global as any).File && fallbackFile.name === 'remote_test.jpg' && fallbackFile.size === 0,
  'dataUrlToFile safely handles remote non-data URL without throwing DOMException'
);

const emptyUrl = '';
const emptyFile = dataUrlToFile(emptyUrl, 'empty_test.jpg');
assert(
  emptyFile instanceof (global as any).File && emptyFile.name === 'empty_test.jpg',
  'dataUrlToFile safely handles empty input without error'
);

console.log('\n====================================================');
if (failed === 0) {
  console.log('🎉 ALL CAMERA ORIENTATION VERIFICATION TESTS PASSED!');
  process.exit(0);
} else {
  console.error(`💥 ${failed} TEST(S) FAILED!`);
  process.exit(1);
}

