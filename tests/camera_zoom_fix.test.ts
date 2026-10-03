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

console.log('\n====================================================');
if (failed === 0) {
  console.log('🎉 ALL CAMERA ZOOM / CROP FIX CHECKS PASSED!');
  process.exit(0);
} else {
  console.error(`💥 ${failed} TEST(S) FAILED!`);
  process.exit(1);
}
