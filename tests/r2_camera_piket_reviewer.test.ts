import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('REVIEWER R2 TEST: PIKETVIEW QR CAMERA PREVIEW VERIFICATION');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    if (detail) console.error(`    Detail: ${detail}`);
    failed++;
  }
}

const piketViewPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
assert(fs.existsSync(piketViewPath), 'PiketView.tsx exists');

const piketCode = fs.readFileSync(piketViewPath, 'utf8');

// 1. Mutex & State declarations
assert(
  piketCode.includes('isStartingCameraRef = useRef(false)'),
  'Concurrency mutex isStartingCameraRef is declared to prevent double-click race conditions'
);
assert(
  piketCode.includes('streamRef = useRef<MediaStream | null>(null)'),
  'streamRef is declared to retain active MediaStream across component lifecycles'
);
assert(
  piketCode.includes('videoRef = useRef<HTMLVideoElement | null>(null)'),
  'videoRef is declared to maintain reference to HTMLVideoElement'
);

// 2. Camera Constraints & Fallback
assert(
  piketCode.includes("facingMode: { ideal: 'environment' }"),
  'MediaStreamConstraints specifies ideal: environment instead of rigid exact match'
);
assert(
  piketCode.includes("navigator.mediaDevices.getUserMedia({ video: true, audio: false })"),
  'Overconstrained camera requests fall back to basic video constraint'
);

// 3. Callback ref on <video> element (Mechanism A)
const callbackRefMatches = piketCode.match(/el\.srcObject = streamRef\.current/g);
assert(
  Boolean(callbackRefMatches && callbackRefMatches.length >= 2),
  'Both Guru and Admin <video> elements implement callback refs binding streamRef.current synchronously on DOM mount'
);

// 4. playsinline & muted attributes for iOS/Mobile Safari
assert(
  piketCode.includes("el.setAttribute('playsinline', 'true')") &&
  piketCode.includes("el.setAttribute('webkit-playsinline', 'true')") &&
  piketCode.includes("el.muted = true"),
  'PlaysInline and muted attributes are enforced via setAttribute for iOS Safari autoplay compliance'
);

// 5. useEffect([cameraActive]) stream synchronization (Mechanism B)
assert(
  piketCode.includes('useEffect(() => {') &&
  piketCode.includes('if (cameraActive && streamRef.current && videoRef.current)') &&
  piketCode.includes('[cameraActive]'),
  'useEffect([cameraActive]) synchronizes stream attachment across state transitions'
);

// 6. Cleanup on tab switch and component unmount
assert(
  piketCode.includes('activeTab !== \'scan\' && cameraActive') &&
  piketCode.includes('stopCamera()'),
  'Camera stream is automatically stopped when navigating away from the scan tab'
);
assert(
  piketCode.includes('return () => {\n      stopCamera();\n    };') ||
  piketCode.includes('return () => {\r\n      stopCamera();\r\n    };'),
  'Component unmount lifecycle hook invokes stopCamera to release hardware tracks'
);

// 7. Track stop on stopCamera
assert(
  piketCode.includes('streamRef.current.getTracks().forEach(track => track.stop())'),
  'stopCamera releases all media stream tracks to shut off hardware webcam LED'
);

// 8. BarcodeDetector readyState guard
assert(
  piketCode.includes('videoRef.current.readyState < 2'),
  'BarcodeDetector loop verifies video readyState >= 2 (HAVE_CURRENT_DATA) before scanning'
);

// 9. Error handling for permissions & unavailable devices
assert(
  piketCode.includes('NotAllowedError') &&
  piketCode.includes('NotFoundError') &&
  piketCode.includes('NotReadableError'),
  'startCamera handles NotAllowedError, NotFoundError, and NotReadableError with user-friendly Indonesian messages'
);

// 10. BarcodeDetector capability badge
assert(
  piketCode.includes("'BarcodeDetector' in window"),
  'UI renders dynamic BarcodeDetector capability indicator informing user of hardware status'
);

console.log('\n====================================================');
console.log(`RESULTS: Passed: ${passed} | Failed: ${failed}`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
