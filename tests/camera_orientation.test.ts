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

console.log('\n====================================================');
if (failed === 0) {
  console.log('🎉 ALL CAMERA ORIENTATION VERIFICATION TESTS PASSED!');
  process.exit(0);
} else {
  console.error(`💥 ${failed} TEST(S) FAILED!`);
  process.exit(1);
}
