/**
 * EMPIRICAL CHALLENGER TEST SUITE: MILESTONE M1 ITERATION 2
 * 
 * Adversarially challenges:
 * 1. Diverse coordinate inputs:
 *    - Bali (-8.12, 115.12)
 *    - Jakarta (-6.2, 106.8)
 *    - London (51.5074, -0.1278)
 *    - New York (40.7128, -74.0060)
 *    - Null coordinates ({ latitude: null, longitude: null }, null)
 *    - Missing coordinates (undefined, empty object)
 *    - Malformed coordinates (NaN, Infinity)
 *    - Extreme coordinates (North Pole 90, 0; South Pole -90, 0; Equator 0, 0)
 *    -> Verifies 100% IDENTICAL 4:3 canvas geometry across ALL inputs (zero coordinate branching).
 * 
 * 2. Center-cropping with zero distortion:
 *    - Horizontal 16:9 webcam feeds (1280x720, 1920x1080)
 *    - Vertical 9:16 phone feeds (720x1280, 1080x1920)
 *    - Native 4:3 feeds (1280x960, 640x480)
 *    -> Empirically proves:
 *       - Exact 4:3 canvas ratio (1.333333...)
 *       - Zero stretch / squish (source width === dest width, source height === dest height)
 *       - Exact symmetrical center-crop offsets (left === right, top === bottom)
 *       - Zero letterboxing or pillarboxing
 * 
 * 3. Static code invariants & integrity audit:
 *    - No coordinate conditional branching in src/
 *    - No obsolete comment anchors in CameraSelfieCapture.tsx
 *    - Clean MediaStreamConstraints locked to 3:4 and 4:3
 */

import fs from 'fs';
import path from 'path';

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, description: string, detail?: string) {
  totalChecks++;
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passedChecks++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    if (detail) console.error(`    Detail: ${detail}`);
    failedChecks++;
    failureDetails.push(`${description}${detail ? ` -> ${detail}` : ''}`);
  }
}

function header(title: string) {
  console.log(`\n========================================================================`);
  console.log(title);
  console.log(`========================================================================`);
}

// -----------------------------------------------------------------------------
// ENVIRONMENT SETUP & CANVAS MOCK
// -----------------------------------------------------------------------------
let drawImageCalls: Array<{
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  canvasW: number;
  canvasH: number;
}> = [];

const mockCanvas = {
  width: 0,
  height: 0,
  getContext: () => ({
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    beginPath: () => {},
    closePath: () => {},
    roundRect: () => {},
    moveTo: () => {},
    arcTo: () => {},
    fill: () => {},
    stroke: () => {},
    fillText: () => {},
    measureText: (txt: string) => ({ width: txt.length * 8 }),
    drawImage: (
      _img: any,
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      dx: number,
      dy: number,
      dw: number,
      dh: number
    ) => {
      drawImageCalls.push({
        sx,
        sy,
        sw,
        sh,
        dx,
        dy,
        dw,
        dh,
        canvasW: mockCanvas.width,
        canvasH: mockCanvas.height,
      });
    },
  }),
  toDataURL: () => 'data:image/jpeg;base64,mockValidPhoto',
};

(global as any).document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      mockCanvas.width = 0;
      mockCanvas.height = 0;
      return mockCanvas;
    }
    return {};
  },
};

if (typeof (global as any).HTMLVideoElement === 'undefined') {
  (global as any).HTMLVideoElement = class {};
}
if (typeof (global as any).HTMLImageElement === 'undefined') {
  (global as any).HTMLImageElement = class {};
}

async function runEmpiricalChallenge() {
  const { drawWatermarkedCanvas, getDefaultWatermarkOptions } = await import('../src/lib/watermarkCanvas');

  // Helper to run capture simulation
  function capture(srcW: number, srcH: number, orientation: 'portrait' | 'landscape', opts: any) {
    drawImageCalls = [];
    const element = new (global as any).HTMLImageElement();
    element.width = srcW;
    element.height = srcH;
    drawWatermarkedCanvas(element, opts, false, orientation);
    return {
      canvasW: mockCanvas.width,
      canvasH: mockCanvas.height,
      ratio: mockCanvas.width / mockCanvas.height,
      call: drawImageCalls[0],
    };
  }

  // =========================================================================
  header('CHALLENGE 1: DIVERSE COORDINATES vs IDENTICAL 4:3 CANVAS GEOMETRY');
  // =========================================================================

  const testCoordinates = [
    { name: 'Bali (Legacy Hack Coordinates)', coords: { latitude: -8.12, longitude: 115.12 } },
    { name: 'Jakarta (Capital)', coords: { latitude: -6.2, longitude: 106.8 } },
    { name: 'London (Greenwich Prime Meridian)', coords: { latitude: 51.5074, longitude: -0.1278 } },
    { name: 'New York (Western Hemisphere)', coords: { latitude: 40.7128, longitude: -74.0060 } },
    { name: 'Tokyo (Eastern Hemisphere)', coords: { latitude: 35.6762, longitude: 139.6503 } },
    { name: 'Sydney (Southern/Eastern)', coords: { latitude: -33.8688, longitude: 151.2093 } },
    { name: 'North Pole (Extreme Boundary +90)', coords: { latitude: 90.0, longitude: 0.0 } },
    { name: 'South Pole (Extreme Boundary -90)', coords: { latitude: -90.0, longitude: 0.0 } },
    { name: 'Null Coordinates Object', coords: null },
    { name: 'Null Latitude and Longitude', coords: { latitude: null as any, longitude: null as any } },
    { name: 'Missing Coordinates (Empty Object)', coords: {} as any },
    { name: 'NaN Latitude', coords: { latitude: NaN, longitude: 106.8 } },
    { name: 'Infinity Longitude', coords: { latitude: -6.2, longitude: Infinity } },
  ];

  // Test across resolutions for each coordinate set
  const resolutionScenarios = [
    { desc: '16:9 Laptop Webcam (1280x720)', w: 1280, h: 720, expectedW: 960, expectedH: 720 },
    { desc: '16:9 Full HD Stream (1920x1080)', w: 1920, h: 1080, expectedW: 1440, expectedH: 1080 },
    { desc: '9:16 Vertical Phone (720x1280)', w: 720, h: 1280, expectedW: 720, expectedH: 540 },
    { desc: '9:16 Full HD Phone (1080x1920)', w: 1080, h: 1920, expectedW: 1080, expectedH: 810 },
    { desc: 'Native 4:3 Sensor (1280x960)', w: 1280, h: 960, expectedW: 1280, expectedH: 960 },
  ];

  for (const res of resolutionScenarios) {
    console.log(`\nTesting Source: ${res.desc} across ${testCoordinates.length} coordinate variations...`);
    const resultsForRes: Array<{ name: string; canvasW: number; canvasH: number; ratio: number }> = [];

    for (const testCase of testCoordinates) {
      const opts = getDefaultWatermarkOptions(testCase.coords as any, `Location: ${testCase.name}`);
      const cap = capture(res.w, res.h, 'landscape', opts);
      resultsForRes.push({
        name: testCase.name,
        canvasW: cap.canvasW,
        canvasH: cap.canvasH,
        ratio: cap.ratio,
      });

      // Strict ratio check: 4 / 3 = 1.3333333333333333
      const ratioDiff = Math.abs(cap.ratio - (4 / 3));
      assert(
        ratioDiff < 1e-4,
        `[${testCase.name}] Aspect ratio is 4:3 (actual: ${cap.ratio.toFixed(4)}, expected: ${(4/3).toFixed(4)})`,
        `Dimensions: ${cap.canvasW}x${cap.canvasH}`
      );

      // Exact pixel dimension match
      assert(
        cap.canvasW === res.expectedW && cap.canvasH === res.expectedH,
        `[${testCase.name}] Dimensions strictly match target ${res.expectedW}x${res.expectedH} (got: ${cap.canvasW}x${cap.canvasH})`
      );
    }

    // Verify 100% IDENTICAL dimensions across ALL coordinate cases
    const baseline = resultsForRes[0];
    const allIdentical = resultsForRes.every(
      r => r.canvasW === baseline.canvasW && r.canvasH === baseline.canvasH && Math.abs(r.ratio - baseline.ratio) < 1e-6
    );
    assert(
      allIdentical,
      `All ${testCoordinates.length} coordinate variations produce 100% BIT-EXACT IDENTICAL canvas geometry for ${res.desc}`
    );
  }

  // =========================================================================
  header('CHALLENGE 2: ZERO-DISTORTION CENTER-CROPPING EMPIRICAL PROOF');
  // =========================================================================

  const feedScenarios = [
    {
      type: '16:9 Horizontal Webcam',
      srcW: 1280,
      srcH: 720,
      expectedCropW: 960,
      expectedCropH: 720,
      expectedOffsetX: 160,
      expectedOffsetY: 0,
    },
    {
      type: '16:9 Full HD Webcam',
      srcW: 1920,
      srcH: 1080,
      expectedCropW: 1440,
      expectedCropH: 1080,
      expectedOffsetX: 240,
      expectedOffsetY: 0,
    },
    {
      type: '9:16 Vertical Phone (Landscape Mode)',
      srcW: 720,
      srcH: 1280,
      expectedCropW: 720,
      expectedCropH: 540,
      expectedOffsetX: 0,
      expectedOffsetY: 370,
    },
    {
      type: '9:16 Full HD Phone (Landscape Mode)',
      srcW: 1080,
      srcH: 1920,
      expectedCropW: 1080,
      expectedCropH: 810,
      expectedOffsetX: 0,
      expectedOffsetY: 555,
    },
    {
      type: 'Native 4:3 Feed (Preserved 1x Scale)',
      srcW: 1280,
      srcH: 960,
      expectedCropW: 1280,
      expectedCropH: 960,
      expectedOffsetX: 0,
      expectedOffsetY: 0,
    },
    {
      type: 'Native 4:3 VGA Feed (Preserved 1x Scale)',
      srcW: 640,
      srcH: 480,
      expectedCropW: 640,
      expectedCropH: 480,
      expectedOffsetX: 0,
      expectedOffsetY: 0,
    },
  ];

  for (const feed of feedScenarios) {
    console.log(`\nEvaluating Zero-Distortion Center-Crop on: ${feed.type} (${feed.srcW}x${feed.srcH})`);
    const opts = getDefaultWatermarkOptions({ latitude: -8.12, longitude: 115.12 }, 'Test Feed');
    const cap = capture(feed.srcW, feed.srcH, 'landscape', opts);
    const call = cap.call;

    // 1. Source-to-Destination 1:1 scale (Zero stretch / squish)
    assert(
      call.sw === call.dw && call.sh === call.dh,
      `[${feed.type}] 1:1 Pixel Mapping: Source dimensions (${call.sw}x${call.sh}) equal Dest dimensions (${call.dw}x${call.dh}) -> ZERO distortion`
    );

    // 2. Aspect ratio of the cropped slice is exactly 4:3
    const sliceRatio = call.sw / call.sh;
    assert(
      Math.abs(sliceRatio - (4 / 3)) < 1e-4,
      `[${feed.type}] Cropped slice aspect ratio is strictly 4:3 (${sliceRatio.toFixed(4)})`
    );

    // 3. Canvas dimensions match destination dimensions exactly (Zero letterboxing)
    assert(
      cap.canvasW === call.dw && cap.canvasH === call.dh,
      `[${feed.type}] Canvas size (${cap.canvasW}x${cap.canvasH}) matches draw size (${call.dw}x${call.dh}) -> ZERO letterboxing/pillarboxing`
    );

    // 4. Exact center offset
    assert(
      call.sx === feed.expectedOffsetX && call.sy === feed.expectedOffsetY,
      `[${feed.type}] Offsets match expected: offsetX=${call.sx} (exp ${feed.expectedOffsetX}), offsetY=${call.sy} (exp ${feed.expectedOffsetY})`
    );

    // 5. Symmetric margins verification
    const remainingRight = feed.srcW - (call.sx + call.sw);
    const remainingBottom = feed.srcH - (call.sy + call.sh);
    assert(
      call.sx === remainingRight,
      `[${feed.type}] Horizontal center-crop symmetry: left margin (${call.sx}px) === right margin (${remainingRight}px)`
    );
    assert(
      call.sy === remainingBottom,
      `[${feed.type}] Vertical center-crop symmetry: top margin (${call.sy}px) === bottom margin (${remainingBottom}px)`
    );
  }

  // =========================================================================
  header('CHALLENGE 3: STATIC CODE INTEGRITY & ANTI-BYPASS AUDIT');
  // =========================================================================

  const srcDir = path.join(__dirname, '..', 'src');
  
  // Recursively inspect all ts/tsx files in src/ for any coordinate-based conditional logic
  function scanDir(dir: string): string[] {
    let files: string[] = [];
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        files = files.concat(scanDir(full));
      } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
        files.push(full);
      }
    }
    return files;
  }

  const allSrcFiles = scanDir(srcDir);
  let coordinateHardcodeFound = false;
  let hardcodedFile = '';

  for (const file of allSrcFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    // Check if any file in src/ has coordinate-based conditional logic for ratios
    const hasCoordinateBranch =
      /latitude\s*===?\s*-8\.12/.test(content) ||
      /longitude\s*===?\s*115\.12/.test(content) ||
      /targetRatio\s*=[^;]*(?:latitude|longitude)/.test(content) ||
      /\?\s*\(?16\s*\/\s*9\)?\s*:\s*\(?4\s*\/\s*3\)?/.test(content);
    if (hasCoordinateBranch) {
      coordinateHardcodeFound = true;
      hardcodedFile = file;
      break;
    }
  }

  assert(
    !coordinateHardcodeFound,
    'Zero coordinate-based ratio branching across all src/ files',
    coordinateHardcodeFound ? `Found violation in: ${hardcodedFile}` : undefined
  );

  // Check CameraSelfieCapture.tsx for dead comment anchors
  const cameraPath = path.join(__dirname, '..', 'src', 'components', 'CameraSelfieCapture.tsx');
  const cameraContent = fs.readFileSync(cameraPath, 'utf-8');

  assert(
    !cameraContent.includes('// aspectRatio: isPortrait ? { ideal: 3 / 4 } : { ideal: 16 / 9 }'),
    'CameraSelfieCapture.tsx contains NO commented-out 16:9 aspect ratio anchor'
  );
  assert(
    !cameraContent.includes('// orientation === \'portrait\' ? \'aspect-[3/4] max-w-sm mx-auto\' : \'aspect-video\''),
    'CameraSelfieCapture.tsx contains NO commented-out aspect-video CSS anchor'
  );

  // Check that real CameraSelfieCapture.tsx constraints are genuinely 4:3
  assert(
    cameraContent.includes('aspectRatio: isPortrait ? { ideal: 3 / 4 } : { ideal: 4 / 3 }'),
    'CameraSelfieCapture.tsx genuine constraint sets 3/4 portrait and 4/3 landscape'
  );

  // =========================================================================
  header('FINAL VERDICT & SUMMARY');
  // =========================================================================
  console.log(`TOTAL EMPIRICAL ASSERTIONS: ${totalChecks}`);
  console.log(`PASSED: ${passedChecks}`);
  console.log(`FAILED: ${failedChecks}`);

  if (failedChecks > 0) {
    console.error('\n❌ EMPIRICAL CHALLENGE FAILED:');
    failureDetails.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
    process.exit(1);
  } else {
    console.log('\n✅ ALL EMPIRICAL CHALLENGES PASSED WITH 100% SUCCESS!');
    process.exit(0);
  }
}

runEmpiricalChallenge().catch(err => {
  console.error('Fatal test runner exception:', err);
  process.exit(1);
});
