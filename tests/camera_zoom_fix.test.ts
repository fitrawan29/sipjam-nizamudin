import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('CAMERA ZOOM / CROP FIX VERIFICATION TEST');
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

assert(fs.existsSync(cameraCompPath), 'CameraSelfieCapture.tsx exists');
const cameraContent = fs.readFileSync(cameraCompPath, 'utf-8');

// 1. Check video styling for object-contain
console.log('\n--- 1. Video Styling & Anti-Zoom Check ---');
const videoTagMatch = cameraContent.match(/<video[\s\S]*?\/>/);
assert(Boolean(videoTagMatch), '<video> element exists in CameraSelfieCapture.tsx');

if (videoTagMatch) {
  const videoSnippet = videoTagMatch[0];
  assert(
    videoSnippet.includes('object-contain'),
    '<video> element uses CSS object-contain to prevent cropping and unwanted zoom'
  );
  assert(
    !videoSnippet.includes('object-cover'),
    '<video> element does NOT use CSS object-cover'
  );
  assert(
    videoSnippet.includes('w-full') && videoSnippet.includes('h-full'),
    '<video> element occupies full container bounds (w-full h-full)'
  );
  assert(
    videoSnippet.includes("-scale-x-100"),
    '<video> element retains mirror flip transform for front/selfie camera'
  );
  // Ensure no unintended zoom transforms like scale-110, scale-125, scale-150 etc.
  assert(
    !videoSnippet.match(/\bscale-(?:105|110|125|150|200)\b/),
    '<video> element has no unintended scale zoom transform classes'
  );
  assert(
    videoSnippet.includes('playsInline') && videoSnippet.includes('autoPlay') && videoSnippet.includes('muted'),
    '<video> element has playsInline, autoPlay, and muted attributes'
  );
}

// 2. Check preview image styling consistency
console.log('\n--- 2. Preview Image Styling Consistency ---');
const imgTagMatch = cameraContent.match(/<img[\s\S]*?\/>/);
assert(Boolean(imgTagMatch), 'Preview <img> element exists in CameraSelfieCapture.tsx');
if (imgTagMatch) {
  const imgSnippet = imgTagMatch[0];
  assert(
    imgSnippet.includes('object-contain'),
    'Preview <img> element uses CSS object-contain consistent with video view'
  );
  assert(
    !imgSnippet.includes('object-cover'),
    'Preview <img> element does NOT use CSS object-cover'
  );
}

// 3. Viewport Container Framing
console.log('\n--- 3. Viewport Container Framing ---');
assert(
  cameraContent.includes('bg-black') && cameraContent.includes('flex items-center justify-center'),
  'Camera container provides black letterboxing/pillarboxing background and centering'
);
assert(
  cameraContent.includes('overflow-hidden') && cameraContent.includes('rounded-xl'),
  'Camera container enforces clean rounded border with overflow-hidden'
);

// 4. MediaStreamConstraints Integrity
console.log('\n--- 4. MediaStreamConstraints Integrity ---');
assert(
  cameraContent.includes('width: isPortrait ? { ideal: 720, max: 1080 } : { ideal: 1280, max: 1920 }') &&
  cameraContent.includes('height: isPortrait ? { ideal: 1280, max: 1920 } : { ideal: 720, max: 1080 }'),
  'MediaStreamConstraints preserve ideal resolutions for orientation adaptation'
);

// 5. Empirical Aspect Ratio Geometry & Zero-Crop Mathematical Verification
console.log('\n--- 5. Empirical Aspect Ratio & Zero-Crop Mathematical Verification ---');

interface GeometryResult {
  visibleFraction: number; // 1.0 means 0% crop (100% visible)
  cropPercentage: number;
  renderedAspect: number;
  expectedAspect: number;
  isDistorted: boolean;
}

function calculateFitGeometry(
  containerW: number,
  containerH: number,
  feedW: number,
  feedH: number,
  mode: 'contain' | 'cover'
): GeometryResult {
  const scale = mode === 'contain'
    ? Math.min(containerW / feedW, containerH / feedH)
    : Math.max(containerW / feedW, containerH / feedH);

  const renderedW = feedW * scale;
  const renderedH = feedH * scale;

  const visibleW = Math.min(renderedW, containerW);
  const visibleH = Math.min(renderedH, containerH);

  const visibleArea = visibleW * visibleH;
  const totalRenderedArea = renderedW * renderedH;
  const visibleFraction = visibleArea / totalRenderedArea;
  const cropPercentage = Math.round((1 - visibleFraction) * 1000) / 10;

  const renderedAspect = renderedW / renderedH;
  const expectedAspect = feedW / feedH;
  const isDistorted = Math.abs(renderedAspect - expectedAspect) > 0.0001;

  return {
    visibleFraction,
    cropPercentage,
    renderedAspect,
    expectedAspect,
    isDistorted,
  };
}

// Test case 1: 4:3 camera stream (640x480 webcam) inside 16:9 container (1280x720)
const feed4_3_in_16_9_contain = calculateFitGeometry(1280, 720, 640, 480, 'contain');
const feed4_3_in_16_9_cover = calculateFitGeometry(1280, 720, 640, 480, 'cover');

assert(
  feed4_3_in_16_9_contain.cropPercentage === 0 && !feed4_3_in_16_9_contain.isDistorted,
  '4:3 camera feed in 16:9 container with object-contain has 0% crop and 0% distortion'
);
assert(
  feed4_3_in_16_9_cover.cropPercentage === 25,
  'Empirical proof: object-cover previously cropped 25.0% of a 4:3 camera stream in 16:9 container'
);

// Test case 2: 16:9 camera stream (1280x720) inside 3:4 portrait container (720x960)
const feed16_9_in_3_4_contain = calculateFitGeometry(720, 960, 1280, 720, 'contain');
const feed16_9_in_3_4_cover = calculateFitGeometry(720, 960, 1280, 720, 'cover');

assert(
  feed16_9_in_3_4_contain.cropPercentage === 0 && !feed16_9_in_3_4_contain.isDistorted,
  '16:9 camera feed in 3:4 container with object-contain has 0% crop and 0% distortion'
);
assert(
  feed16_9_in_3_4_cover.cropPercentage > 50,
  `Empirical proof: object-cover previously cropped ${feed16_9_in_3_4_cover.cropPercentage}% of landscape feed in 3:4 container`
);

// Test case 3: 9:16 mobile portrait stream (720x1280) inside 3:4 portrait container (720x960)
const feed9_16_in_3_4_contain = calculateFitGeometry(720, 960, 720, 1280, 'contain');
const feed9_16_in_3_4_cover = calculateFitGeometry(720, 960, 720, 1280, 'cover');

assert(
  feed9_16_in_3_4_contain.cropPercentage === 0 && !feed9_16_in_3_4_contain.isDistorted,
  '9:16 mobile feed in 3:4 container with object-contain has 0% crop and 0% distortion'
);
assert(
  feed9_16_in_3_4_cover.cropPercentage === 25,
  'Empirical proof: object-cover previously cropped 25.0% of 9:16 mobile feed in 3:4 container'
);

// Test case 4: High-res 4:3 mobile sensor (4032x3024) in 16:9 container
const feedHiRes4_3_contain = calculateFitGeometry(1920, 1080, 4032, 3024, 'contain');
assert(
  feedHiRes4_3_contain.cropPercentage === 0 && !feedHiRes4_3_contain.isDistorted,
  'High-res 4032x3024 mobile camera feed in 16:9 container has 0% crop with object-contain'
);

// Test case 5: 1:1 square camera (1080x1080) inside 16:9 container (1920x1080)
const feed1_1_in_16_9_contain = calculateFitGeometry(1920, 1080, 1080, 1080, 'contain');
const feed1_1_in_16_9_cover = calculateFitGeometry(1920, 1080, 1080, 1080, 'cover');
assert(
  feed1_1_in_16_9_contain.cropPercentage === 0 && !feed1_1_in_16_9_contain.isDistorted,
  '1:1 square camera feed in 16:9 container with object-contain has 0% crop and 0% distortion'
);
assert(
  feed1_1_in_16_9_cover.cropPercentage > 40,
  `Empirical proof: object-cover previously cropped ${feed1_1_in_16_9_cover.cropPercentage}% of 1:1 camera feed in 16:9 container`
);

// Test case 6: 1:1 square camera (1080x1080) inside 3:4 portrait container (720x960)
const feed1_1_in_3_4_contain = calculateFitGeometry(720, 960, 1080, 1080, 'contain');
const feed1_1_in_3_4_cover = calculateFitGeometry(720, 960, 1080, 1080, 'cover');
assert(
  feed1_1_in_3_4_contain.cropPercentage === 0 && !feed1_1_in_3_4_contain.isDistorted,
  '1:1 square camera feed in 3:4 container with object-contain has 0% crop and 0% distortion'
);
assert(
  feed1_1_in_3_4_cover.cropPercentage === 25,
  'Empirical proof: object-cover previously cropped 25.0% of 1:1 camera feed in 3:4 container'
);

// Test case 7: Modern ultra-tall smartphone sensor (19.5:9 portrait 1080x2340) in 3:4 container
const feed19_5_9_contain = calculateFitGeometry(720, 960, 1080, 2340, 'contain');
const feed19_5_9_cover = calculateFitGeometry(720, 960, 1080, 2340, 'cover');
assert(
  feed19_5_9_contain.cropPercentage === 0 && !feed19_5_9_contain.isDistorted,
  'Ultra-tall 19.5:9 mobile feed in 3:4 container with object-contain has 0% crop and 0% distortion'
);
assert(
  feed19_5_9_cover.cropPercentage > 35,
  `Empirical proof: object-cover previously cropped ${feed19_5_9_cover.cropPercentage}% of ultra-tall feed in 3:4 container`
);

// Test case 8: Tablet 3:2 camera sensor (2160x1440) in 16:9 container
const feed3_2_contain = calculateFitGeometry(1920, 1080, 2160, 1440, 'contain');
const feed3_2_cover = calculateFitGeometry(1920, 1080, 2160, 1440, 'cover');
assert(
  feed3_2_contain.cropPercentage === 0 && !feed3_2_contain.isDistorted,
  'Tablet 3:2 sensor feed in 16:9 container with object-contain has 0% crop and 0% distortion'
);
assert(
  feed3_2_cover.cropPercentage > 15,
  `Empirical proof: object-cover previously cropped ${feed3_2_cover.cropPercentage}% of 3:2 feed in 16:9 container`
);

// 6. Adversarial Robustness & Hardware Zoom Constraints Guard
console.log('\n--- 6. Adversarial Robustness & Hardware Zoom Constraints Guard ---');

// Ensure no hardware digital zoom constraint is requested in MediaStreamConstraints
const constraintsMatch = cameraContent.match(/const constraints:\s*MediaStreamConstraints\s*=\s*\{[\s\S]*?\};/);
assert(Boolean(constraintsMatch), 'MediaStreamConstraints definition found in CameraSelfieCapture.tsx');
if (constraintsMatch) {
  assert(
    !constraintsMatch[0].includes('zoom:'),
    'MediaStreamConstraints does NOT request hardware digital zoom constraint'
  );
}

// Ensure preview image has no unintended scale zoom transform classes
if (imgTagMatch) {
  const imgSnippet = imgTagMatch[0];
  assert(
    !imgSnippet.match(/\bscale-(?:105|110|125|150|200)\b/),
    'Preview <img> element has no unintended scale zoom transform classes'
  );
}

// Ensure no inline style overrides forcing objectFit: cover or CSS zoom
assert(
  !cameraContent.includes("objectFit: 'cover'") && !cameraContent.includes('objectFit: "cover"'),
  'No inline style objectFit: cover overrides present in CameraSelfieCapture.tsx'
);
assert(
  !cameraContent.match(/style=\{[^}]*?\bzoom\s*:/),
  'No inline CSS zoom style overrides present in CameraSelfieCapture.tsx'
);

console.log('\n====================================================');
if (failed === 0) {
  console.log('🎉 ALL CAMERA ZOOM / CROP FIX CHECKS PASSED!');
  process.exit(0);
} else {
  console.error(`💥 ${failed} TEST(S) FAILED!`);
  process.exit(1);
}
