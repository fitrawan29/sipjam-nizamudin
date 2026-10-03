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
  cameraContent.includes("isPortrait ? { ideal: 720, max: 1080 } : { ideal: 1280, max: 1920 }") &&
  cameraContent.includes("isPortrait ? { ideal: 1280, max: 1920 } : { ideal: 720, max: 1080 }"),
  'Camera constraints configure height > width for portrait and width > height for landscape'
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
      width: isPortrait ? { ideal: 720, max: 1080 } : { ideal: 1280, max: 1920 },
      height: isPortrait ? { ideal: 1280, max: 1920 } : { ideal: 720, max: 1080 },
    }
  };
}

const portraitConstraints = getConstraintsForOrientation('portrait');
assert(
  portraitConstraints.video.height.ideal > portraitConstraints.video.width.ideal,
  'Portrait orientation constraint has height (1280) > width (720)'
);

const landscapeConstraints = getConstraintsForOrientation('landscape');
assert(
  landscapeConstraints.video.width.ideal > landscapeConstraints.video.height.ideal,
  'Landscape orientation constraint has width (1280) > height (720)'
);

const defaultConstraints = getConstraintsForOrientation(undefined);
assert(
  defaultConstraints.video.width.ideal > defaultConstraints.video.height.ideal,
  'Default (undefined) orientation constraint defaults to landscape (width > height)'
);

// --- Section 6: UI Viewfinder Container Aspect Ratio Adaptation ---
console.log('\n--- Section 6: UI Viewfinder Container Aspect Ratio Adaptation ---');
assert(
  cameraContent.includes("orientation === 'portrait' ? 'aspect-[3/4] max-w-sm mx-auto' : 'aspect-video'"),
  'CameraSelfieCapture viewport dynamically applies aspect-[3/4] for portrait and aspect-video for landscape'
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
  watermarkContent.includes("const targetRatio = isPortrait ? (3 / 4) : (16 / 9);"),
  'watermarkCanvas computes targetRatio 3/4 for portrait and 16/9 for landscape'
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

// 8.1 Portrait capture
drawWatermarkedCanvas(mockImg, opts, true, 'portrait');
assert(
  Boolean(lastCreatedCanvas && lastCreatedCanvas.height > lastCreatedCanvas.width),
  `Portrait mode produces vertical canvas (width=${lastCreatedCanvas?.width}, height=${lastCreatedCanvas?.height})`
);
assert(
  Math.abs((lastCreatedCanvas.width / lastCreatedCanvas.height) - (3 / 4)) < 0.01,
  `Portrait canvas matches 3:4 target aspect ratio (${lastCreatedCanvas?.width}x${lastCreatedCanvas?.height})`
);

// 8.2 Landscape capture
drawWatermarkedCanvas(mockImg, opts, false, 'landscape');
assert(
  Boolean(lastCreatedCanvas && lastCreatedCanvas.width > lastCreatedCanvas.height),
  `Landscape mode produces horizontal canvas (width=${lastCreatedCanvas?.width}, height=${lastCreatedCanvas?.height})`
);
assert(
  Math.abs((lastCreatedCanvas.width / lastCreatedCanvas.height) - (16 / 9)) < 0.05,
  `Landscape canvas matches 16:9 target aspect ratio (${lastCreatedCanvas?.width}x${lastCreatedCanvas?.height})`
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

console.log('\n====================================================');
if (failed === 0) {
  console.log('🎉 ALL CAMERA ORIENTATION VERIFICATION TESTS PASSED!');
  process.exit(0);
} else {
  console.error(`💥 ${failed} TEST(S) FAILED!`);
  process.exit(1);
}
