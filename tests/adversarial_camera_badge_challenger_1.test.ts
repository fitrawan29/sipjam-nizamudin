import fs from 'fs';
import path from 'path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

// Global mocks for Node.js / tsx environment
let lastCreatedCanvas: any = null;
let drawImageCalls: any[] = [];
let ctxTransforms: any[] = [];

class MockCanvasContext2D {
  canvas: any;
  fillStyle: any = '';
  strokeStyle: any = '';
  lineWidth: number = 1;
  textAlign: string = 'left';
  textBaseline: string = 'alphabetic';
  font: string = '';

  constructor(canvas: any) {
    this.canvas = canvas;
  }

  save() {
    ctxTransforms.push({ type: 'save' });
  }

  restore() {
    ctxTransforms.push({ type: 'restore' });
  }

  translate(x: number, y: number) {
    ctxTransforms.push({ type: 'translate', x, y });
  }

  scale(sx: number, sy: number) {
    ctxTransforms.push({ type: 'scale', sx, sy });
  }

  drawImage(
    image: any,
    sx: number,
    sy: number,
    sWidth: number,
    sHeight: number,
    dx?: number,
    dy?: number,
    dWidth?: number,
    dHeight?: number
  ) {
    drawImageCalls.push({
      image,
      sx,
      sy,
      sWidth,
      sHeight,
      dx,
      dy,
      dWidth,
      dHeight,
    });
  }

  beginPath() {}
  closePath() {}
  moveTo(x: number, y: number) {}
  lineTo(x: number, y: number) {}
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number) {}
  arc(x: number, y: number, r: number, sAngle: number, eAngle: number) {}
  roundRect(x: number, y: number, w: number, h: number, r: number) {}
  fill() {}
  stroke() {}
  fillText(text: string, x: number, y: number) {}
  measureText(text: string) {
    return { width: text.length * 10 };
  }
}

class MockHTMLCanvasElement {
  width: number = 0;
  height: number = 0;
  private _ctx: MockCanvasContext2D;

  constructor() {
    this._ctx = new MockCanvasContext2D(this);
    lastCreatedCanvas = this;
  }

  getContext(contextId: string) {
    if (contextId === '2d') return this._ctx;
    return null;
  }

  toDataURL(type?: string, quality?: any) {
    return `data:image/jpeg;base64,mock_${this.width}x${this.height}_${quality || 0.85}`;
  }
}

class MockHTMLVideoElement {
  videoWidth: number = 640;
  videoHeight: number = 480;
  clientWidth: number = 640;
  clientHeight: number = 480;
}

class MockHTMLImageElement {
  naturalWidth: number = 640;
  naturalHeight: number = 480;
  width: number = 640;
  height: number = 480;
}

// Setup global document & DOM elements
(global as any).HTMLCanvasElement = MockHTMLCanvasElement;
(global as any).HTMLVideoElement = MockHTMLVideoElement;
(global as any).HTMLImageElement = MockHTMLImageElement;

if (typeof (global as any).document === 'undefined') {
  (global as any).document = {
    createElement(tag: string) {
      if (tag === 'canvas') {
        return new MockHTMLCanvasElement();
      }
      return {};
    },
  };
} else {
  const origCreateElement = (global as any).document.createElement;
  (global as any).document.createElement = function (tag: string) {
    if (tag === 'canvas') {
      return new MockHTMLCanvasElement();
    }
    return origCreateElement ? origCreateElement.call(this, tag) : {};
  };
}

// Import modules under test
import {
  drawWatermarkedCanvas,
  getDefaultWatermarkOptions,
  WatermarkOptions,
} from '../src/lib/watermarkCanvas';
import { AIAssistant, getAIAssistantGreeting } from '../src/components/AIAssistant/AIAssistant';
import { findBestAnswers, getFallbackResponse, getContextSuggestions } from '../src/components/AIAssistant/faqMatcher';
import { FAQ_ITEMS, MENU_CATEGORIES } from '../src/components/AIAssistant/knowledgeBase';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    failures.push(`${testName}${detail ? ` -> ${detail}` : ''}`);
    failedTests++;
  } else {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  }
}

function resetMockState() {
  lastCreatedCanvas = null;
  drawImageCalls = [];
  ctxTransforms = [];
}

const mockOptions: WatermarkOptions = {
  timestampText: '03-10-2026 13:45:00 WITA',
  coordinatesText: '-8.6705, 115.2126',
  dateText: 'Sabtu, 03 Oktober 2026',
  locationName: 'SMK Negeri 1 Denpasar, Bali',
};

async function runAdversarialTestHarness() {
  console.log('========================================================================');
  console.log('CHALLENGER 1 EMPIRICAL ADVERSARIAL TEST SUITE: R1 & R2 VERIFICATION');
  console.log('========================================================================\n');

  // ===========================================================================
  // SECTION 1: R1 STRESS & GEOMETRY TESTING (CAMERA 1X SCALE & ORIENTATIONS)
  // ===========================================================================
  console.log('--- SECTION 1: R1 - Camera Uncropped 1x Scale & Orientation Geometry ---\n');

  // 1.1: 9:16 Standard Mobile Portrait (720x1280) with orientation='portrait'
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 720;
    video.videoHeight = 1280;

    const dataUrl = drawWatermarkedCanvas(video as any, mockOptions, false, 'portrait');
    assert(Boolean(dataUrl), '1.1: 720x1280 portrait stream returns valid data URL');
    assert(lastCreatedCanvas?.width === 720, '1.1: Canvas width exactly 720');
    assert(lastCreatedCanvas?.height === 1280, '1.1: Canvas height exactly 1280');
    assert(lastCreatedCanvas?.height > lastCreatedCanvas?.width, '1.1: Orientation is vertical (height > width)');

    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.1: Uncropped source offsets sx=0, sy=0');
    assert(drawCall?.sWidth === 720 && drawCall?.sHeight === 1280, '1.1: Full sensor dimensions drawn (720x1280)');

    // Scale calculation: Area rendered / Sensor area
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (720 * 1280);
    assert(scaleFactor === 1.0, '1.1: Strictly 1x uncropped scale factor (scale=1.0, 0% crop)');
  }

  // 1.2: 9:16 High-Res Mobile Portrait (1080x1920) with orientation='portrait'
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 1080;
    video.videoHeight = 1920;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'portrait');
    assert(lastCreatedCanvas?.width === 1080, '1.2: 1080x1920 portrait canvas width exactly 1080');
    assert(lastCreatedCanvas?.height === 1920, '1.2: 1080x1920 portrait canvas height exactly 1920');

    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.2: Offsets strictly 0,0');
    assert(drawCall?.sWidth === 1080 && drawCall?.sHeight === 1920, '1.2: 1080x1920 full sensor drawn');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (1080 * 1920);
    assert(scaleFactor === 1.0, '1.2: Scale factor is strictly 1.0 (uncropped)');
  }

  // 1.3: 3:4 Portrait Sensor (1080x1440) with orientation='portrait'
  {
    resetMockState();
    const img = new MockHTMLImageElement();
    img.naturalWidth = 1080;
    img.naturalHeight = 1440;

    drawWatermarkedCanvas(img as any, mockOptions, false, 'portrait');
    assert(lastCreatedCanvas?.width === 1080, '1.3: 1080x1440 3:4 portrait canvas width 1080');
    assert(lastCreatedCanvas?.height === 1440, '1.3: 1080x1440 3:4 portrait canvas height 1440');
    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.3: Uncropped sx=0, sy=0');
    assert(drawCall?.sWidth === 1080 && drawCall?.sHeight === 1440, '1.3: 1080x1440 full image drawn');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (1080 * 1440);
    assert(scaleFactor === 1.0, '1.3: Scale factor strictly 1.0');
  }

  // 1.4: 16:9 Full HD Landscape (1920x1080) with orientation='landscape'
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 1920;
    video.videoHeight = 1080;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'landscape');
    assert(lastCreatedCanvas?.width === 1920, '1.4: 1920x1080 landscape canvas width 1920');
    assert(lastCreatedCanvas?.height === 1080, '1.4: 1920x1080 landscape canvas height 1080');
    assert(lastCreatedCanvas?.width >= lastCreatedCanvas?.height, '1.4: Orientation is horizontal (width >= height)');
    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.4: Offsets sx=0, sy=0');
    assert(drawCall?.sWidth === 1920 && drawCall?.sHeight === 1080, '1.4: Full 1920x1080 sensor drawn');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (1920 * 1080);
    assert(scaleFactor === 1.0, '1.4: Strictly 1x scale (no zoom)');
  }

  // 1.5: 16:9 Standard HD Landscape (1280x720) with orientation='landscape'
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 1280;
    video.videoHeight = 720;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'landscape');
    assert(lastCreatedCanvas?.width === 1280 && lastCreatedCanvas?.height === 720, '1.5: 1280x720 landscape canvas 1280x720');
    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.5: Offsets 0, 0');
    assert(drawCall?.sWidth === 1280 && drawCall?.sHeight === 720, '1.5: 1280x720 full sensor drawn');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (1280 * 720);
    assert(scaleFactor === 1.0, '1.5: Strictly 1x scale');
  }

  // 1.6: Desktop Webcam Mismatch: 16:9 Horizontal Feed (1280x720) in Portrait Mode
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 1280;
    video.videoHeight = 720;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'portrait');
    assert(lastCreatedCanvas?.height > lastCreatedCanvas?.width, '1.6: Produces vertical portrait output (height > width)');
    // Target ratio 3:4: drawWidth = 720 * (3/4) = 540, drawHeight = 720
    assert(lastCreatedCanvas?.width === 540, '1.6: Canvas width cropped to 540 (3:4 ratio)');
    assert(lastCreatedCanvas?.height === 720, '1.6: Canvas height preserved at 720');
    const drawCall = drawImageCalls[0];
    const expectedOffsetX = (1280 - 540) / 2; // 370
    assert(drawCall?.sx === expectedOffsetX, `1.6: Horizontal centered crop offsetX === ${expectedOffsetX} (370)`);
    assert(drawCall?.sy === 0, '1.6: Vertical offset offsetY === 0');
    assert(drawCall?.sWidth === 540 && drawCall?.sHeight === 720, '1.6: Rendered width 540, height 720');
  }

  // 1.7: Mobile Portrait Feed (720x1280) in Landscape Mode
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 720;
    video.videoHeight = 1280;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'landscape');
    assert(lastCreatedCanvas?.width > lastCreatedCanvas?.height, '1.7: Produces horizontal landscape output (width > height)');
    // Target ratio 16:9: drawWidth = 720, drawHeight = 720 / (16/9) = 405
    assert(lastCreatedCanvas?.width === 720, '1.7: Canvas width preserved at 720');
    assert(lastCreatedCanvas?.height === 405, '1.7: Canvas height cropped to 405 (16:9 ratio)');
    const drawCall = drawImageCalls[0];
    const expectedOffsetY = (1280 - 405) / 2; // 437.5
    assert(drawCall?.sx === 0, '1.7: Horizontal offset offsetX === 0');
    assert(drawCall?.sy === expectedOffsetY, `1.7: Vertical centered crop offsetY === ${expectedOffsetY} (437.5)`);
    assert(drawCall?.sWidth === 720 && drawCall?.sHeight === 405, '1.7: Rendered width 720, height 405');
  }

  // 1.8: Non-Standard: 1:1 Square Sensor (1000x1000) in Portrait Mode
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 1000;
    video.videoHeight = 1000;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'portrait');
    assert(lastCreatedCanvas?.height > lastCreatedCanvas?.width, '1.8: Square sensor in portrait creates vertical canvas');
    // width >= height triggers 3:4 crop: drawWidth = 1000 * 3/4 = 750, drawHeight = 1000
    assert(lastCreatedCanvas?.width === 750, '1.8: Canvas width 750 (3:4)');
    assert(lastCreatedCanvas?.height === 1000, '1.8: Canvas height 1000');
    const drawCall = drawImageCalls[0];
    const expectedOffsetX = (1000 - 750) / 2; // 125
    assert(drawCall?.sx === expectedOffsetX, `1.8: Square portrait centered offsetX === ${expectedOffsetX} (125)`);
    assert(drawCall?.sy === 0, '1.8: Square portrait offsetY === 0');
  }

  // 1.9: Non-Standard: 1:1 Square Sensor (1000x1000) in Landscape Mode
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 1000;
    video.videoHeight = 1000;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'landscape');
    assert(lastCreatedCanvas?.width >= lastCreatedCanvas?.height, '1.9: Square sensor in landscape preserves width >= height');
    assert(lastCreatedCanvas?.width === 1000 && lastCreatedCanvas?.height === 1000, '1.9: Canvas width 1000, height 1000');
    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.9: Offsets 0, 0');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (1000 * 1000);
    assert(scaleFactor === 1.0, '1.9: Strictly 1x scale');
  }

  // 1.10: 4:3 Sensor (640x480) in Landscape Mode
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 640;
    video.videoHeight = 480;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'landscape');
    assert(lastCreatedCanvas?.width === 640 && lastCreatedCanvas?.height === 480, '1.10: 4:3 640x480 in landscape uncropped 1x');
    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.10: Offsets 0, 0');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (640 * 480);
    assert(scaleFactor === 1.0, '1.10: Strictly 1x scale');
  }

  // 1.11: 4:3 Sensor (640x480) in Portrait Mode (Orientation Mismatch)
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 640;
    video.videoHeight = 480;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'portrait');
    assert(lastCreatedCanvas?.height > lastCreatedCanvas?.width, '1.11: 4:3 in portrait converted to vertical');
    // drawWidth = 480 * 3/4 = 360, drawHeight = 480
    assert(lastCreatedCanvas?.width === 360 && lastCreatedCanvas?.height === 480, '1.11: Canvas 360x480 (3:4)');
    const drawCall = drawImageCalls[0];
    const expectedOffsetX = (640 - 360) / 2; // 140
    assert(drawCall?.sx === expectedOffsetX, `1.11: Centered offsetX === ${expectedOffsetX} (140)`);
    assert(drawCall?.sy === 0, '1.11: offsetY === 0');
  }

  // 1.12: Ultra-Wide 21:9 Sensor (2560x1080) in Landscape Mode
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 2560;
    video.videoHeight = 1080;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'landscape');
    assert(lastCreatedCanvas?.width === 2560 && lastCreatedCanvas?.height === 1080, '1.12: 21:9 2560x1080 uncropped in landscape');
    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.12: sx=0, sy=0');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (2560 * 1080);
    assert(scaleFactor === 1.0, '1.12: Strictly 1x scale (scale=1.0)');
  }

  // 1.13: Ultra-Tall Mobile Aspect Ratio 20:9 (1080x2400) in Portrait Mode
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 1080;
    video.videoHeight = 2400;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'portrait');
    assert(lastCreatedCanvas?.width === 1080 && lastCreatedCanvas?.height === 2400, '1.13: 20:9 1080x2400 uncropped in portrait');
    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.13: sx=0, sy=0');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (1080 * 2400);
    assert(scaleFactor === 1.0, '1.13: Strictly 1x scale (scale=1.0)');
  }

  // 1.14: 19.5:9 Mobile Ratio (1080x2340) in Portrait Mode
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 1080;
    video.videoHeight = 2340;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'portrait');
    assert(lastCreatedCanvas?.width === 1080 && lastCreatedCanvas?.height === 2340, '1.14: 19.5:9 1080x2340 uncropped in portrait');
    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.14: sx=0, sy=0');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (1080 * 2340);
    assert(scaleFactor === 1.0, '1.14: Strictly 1x scale (scale=1.0)');
  }

  // 1.15: Extreme Low-Res (320x240) in Landscape Mode
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 320;
    video.videoHeight = 240;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'landscape');
    assert(lastCreatedCanvas?.width === 320 && lastCreatedCanvas?.height === 240, '1.15: 320x240 low-res preserved uncropped in landscape');
    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.15: sx=0, sy=0');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (320 * 240);
    assert(scaleFactor === 1.0, '1.15: Strictly 1x scale (scale=1.0)');
  }

  // 1.16: Extreme Low-Res Portrait (240x320) in Portrait Mode
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 240;
    video.videoHeight = 320;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'portrait');
    assert(lastCreatedCanvas?.width === 240 && lastCreatedCanvas?.height === 320, '1.16: 240x320 low-res portrait preserved uncropped');
    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.16: sx=0, sy=0');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (240 * 320);
    assert(scaleFactor === 1.0, '1.16: Strictly 1x scale (scale=1.0)');
  }

  // 1.17: Extreme High-Res 4K UHD (3840x2160) in Landscape Mode
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 3840;
    video.videoHeight = 2160;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'landscape');
    assert(lastCreatedCanvas?.width === 3840 && lastCreatedCanvas?.height === 2160, '1.17: 4K 3840x2160 preserved uncropped in landscape');
    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.17: sx=0, sy=0');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (3840 * 2160);
    assert(scaleFactor === 1.0, '1.17: Strictly 1x scale (scale=1.0)');
  }

  // 1.18: Extreme High-Res 8K UHD (7680x4320) in Landscape Mode
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 7680;
    video.videoHeight = 4320;

    drawWatermarkedCanvas(video as any, mockOptions, false, 'landscape');
    assert(lastCreatedCanvas?.width === 7680 && lastCreatedCanvas?.height === 4320, '1.18: 8K 7680x4320 preserved uncropped in landscape');
    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.18: sx=0, sy=0');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (7680 * 4320);
    assert(scaleFactor === 1.0, '1.18: Strictly 1x scale (scale=1.0)');
  }

  // 1.19: Extreme High-Res 48MP Sensor (6000x8000) in Portrait Mode
  {
    resetMockState();
    const img = new MockHTMLImageElement();
    img.naturalWidth = 6000;
    img.naturalHeight = 8000;

    drawWatermarkedCanvas(img as any, mockOptions, false, 'portrait');
    assert(lastCreatedCanvas?.width === 6000 && lastCreatedCanvas?.height === 8000, '1.19: 48MP 6000x8000 preserved uncropped in portrait');
    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.19: sx=0, sy=0');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (6000 * 8000);
    assert(scaleFactor === 1.0, '1.19: Strictly 1x scale (scale=1.0)');
  }

  // 1.20: Auto-Detect (orientation === undefined) with Vertical Feed (720x1280)
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 720;
    video.videoHeight = 1280;

    drawWatermarkedCanvas(video as any, mockOptions, false, undefined);
    assert(lastCreatedCanvas?.width === 720 && lastCreatedCanvas?.height === 1280, '1.20: Auto-detect portrait preserves 720x1280 uncropped');
    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.20: sx=0, sy=0');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (720 * 1280);
    assert(scaleFactor === 1.0, '1.20: Strictly 1x scale (scale=1.0)');
  }

  // 1.21: Auto-Detect (orientation === undefined) with Horizontal Feed (1280x720)
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 1280;
    video.videoHeight = 720;

    drawWatermarkedCanvas(video as any, mockOptions, false, undefined);
    assert(lastCreatedCanvas?.width === 1280 && lastCreatedCanvas?.height === 720, '1.21: Auto-detect landscape preserves 1280x720 uncropped');
    const drawCall = drawImageCalls[0];
    assert(drawCall?.sx === 0 && drawCall?.sy === 0, '1.21: sx=0, sy=0');
    const scaleFactor = (drawCall?.sWidth * drawCall?.sHeight) / (1280 * 720);
    assert(scaleFactor === 1.0, '1.21: Strictly 1x scale (scale=1.0)');
  }

  // 1.22: Mirror Front-Facing Transformation (mirror = true)
  {
    resetMockState();
    const video = new MockHTMLVideoElement();
    video.videoWidth = 720;
    video.videoHeight = 1280;

    drawWatermarkedCanvas(video as any, mockOptions, true, 'portrait');
    const translateCall = ctxTransforms.find(t => t.type === 'translate');
    const scaleCall = ctxTransforms.find(t => t.type === 'scale');
    const restoreCall = ctxTransforms.find(t => t.type === 'restore');

    assert(Boolean(translateCall && translateCall.x === 720 && translateCall.y === 0), '1.22: Mirror translates canvas by (drawWidth, 0)');
    assert(Boolean(scaleCall && scaleCall.sx === -1 && scaleCall.sy === 1), '1.22: Mirror applies scale(-1, 1)');
    assert(Boolean(restoreCall), '1.22: Context state restored after mirrored drawImage');
  }

  // 1.23: Watermark Badge Scale Clamping & Boundary Test across Resolution Spectrum
  {
    const testResolutions = [
      { w: 320, h: 240 },
      { w: 640, h: 480 },
      { w: 720, h: 1280 },
      { w: 1080, h: 1920 },
      { w: 1920, h: 1080 },
      { w: 2560, h: 1440 },
      { w: 3840, h: 2160 },
      { w: 7680, h: 4320 },
    ];

    for (const res of testResolutions) {
      const scale = Math.max(0.65, Math.min(res.w / 720, 2.0));
      assert(scale >= 0.65 && scale <= 2.0, `1.23: Watermark scale for ${res.w}x${res.h} clamped to [0.65, 2.0] (scale=${scale.toFixed(3)})`);

      const hasLocation = true;
      const badgeWidth = Math.min(res.w * 0.90, Math.max(340 * scale, res.w * 0.72));
      const badgeHeight = Math.round((hasLocation ? 116 : 96) * scale);
      const badgeX = (res.w - badgeWidth) / 2;
      const bottomOffset = Math.round(20 * scale);
      const badgeY = res.h - badgeHeight - bottomOffset;

      assert(badgeWidth <= res.w, `1.23: Badge width ${badgeWidth} <= canvas width ${res.w}`);
      assert(badgeHeight <= res.h, `1.23: Badge height ${badgeHeight} <= canvas height ${res.h}`);
      assert(badgeX >= 0, `1.23: Badge X ${badgeX} is non-negative`);
      assert(badgeY >= 0, `1.23: Badge Y ${badgeY} is non-negative`);
      assert(badgeY + badgeHeight <= res.h, `1.23: Badge bottom ${badgeY + badgeHeight} <= canvas height ${res.h}`);
    }
  }

  // ===========================================================================
  // SECTION 2: R2 ORANGE BADGE COMPLETE ABSENCE VERIFICATION
  // ===========================================================================
  console.log('\n--- SECTION 2: R2 - Complete Absence of Orange Badges on AI Components ---\n');

  const aiAssistantPath = path.resolve(__dirname, '../src/components/AIAssistant/AIAssistant.tsx');
  const faqMatcherPath = path.resolve(__dirname, '../src/components/AIAssistant/faqMatcher.ts');
  const knowledgeBasePath = path.resolve(__dirname, '../src/components/AIAssistant/knowledgeBase.ts');
  const indexPath = path.resolve(__dirname, '../src/components/AIAssistant/index.ts');

  assert(fs.existsSync(aiAssistantPath), '2.1: AIAssistant.tsx exists');
  const aiCode = fs.readFileSync(aiAssistantPath, 'utf8');

  // 2.2: Strict pattern verification on AIAssistant.tsx
  assert(!aiCode.includes('animate-ping'), '2.2: animate-ping is COMPLETELY ABSENT from AIAssistant.tsx');
  assert(!aiCode.includes('bg-amber-400'), '2.2: bg-amber-400 is COMPLETELY ABSENT from AIAssistant.tsx');
  assert(!aiCode.includes('bg-amber-500'), '2.2: bg-amber-500 is COMPLETELY ABSENT from AIAssistant.tsx');
  assert(!aiCode.includes('bg-amber-600'), '2.2: bg-amber-600 is COMPLETELY ABSENT from AIAssistant.tsx');
  assert(!aiCode.includes('bg-orange-400'), '2.2: bg-orange-400 is COMPLETELY ABSENT from AIAssistant.tsx');
  assert(!aiCode.includes('bg-orange-500'), '2.2: bg-orange-500 is COMPLETELY ABSENT from AIAssistant.tsx');
  assert(!aiCode.includes('bg-orange-600'), '2.2: bg-orange-600 is COMPLETELY ABSENT from AIAssistant.tsx');
  assert(!/\bbg-amber-\d+\b/.test(aiCode), '2.2: Zero bg-amber-* classes in AIAssistant.tsx');
  assert(!/\bbg-orange-\d+\b/.test(aiCode), '2.2: Zero bg-orange-* classes in AIAssistant.tsx');

  // 2.3: Verification across all files in src/components/AIAssistant/
  const aiFiles = [aiAssistantPath, faqMatcherPath, knowledgeBasePath, indexPath];
  for (const filePath of aiFiles) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const baseName = path.basename(filePath);
    assert(!fileContent.includes('animate-ping'), `2.3: ${baseName} contains no animate-ping`);
    assert(!fileContent.includes('bg-amber-400'), `2.3: ${baseName} contains no bg-amber-400`);
    assert(!fileContent.includes('bg-amber-500'), `2.3: ${baseName} contains no bg-amber-500`);
    assert(!fileContent.includes('bg-orange-'), `2.3: ${baseName} contains no bg-orange-*`);
  }

  // 2.4: Trigger button DOM structure verification
  const buttonRegex = /<button[\s\S]*?data-tour="ai-assistant-btn"[\s\S]*?<\/button>/;
  const buttonMatch = aiCode.match(buttonRegex);
  assert(Boolean(buttonMatch), '2.4: Floating trigger button exists in AIAssistant.tsx');
  if (buttonMatch) {
    const buttonHtml = buttonMatch[0];
    assert(!buttonHtml.includes('-top-1'), '2.4: Trigger button has no absolute badge position -top-1');
    assert(!buttonHtml.includes('-right-1'), '2.4: Trigger button has no absolute badge position -right-1');
    assert(!buttonHtml.includes('rounded-full bg-amber'), '2.4: Trigger button has no amber dot/badge');
    assert(!buttonHtml.includes('rounded-full bg-orange'), '2.4: Trigger button has no orange dot/badge');
    assert(buttonHtml.includes('fa-robot'), '2.4: Trigger button contains fa-robot icon');
    assert(buttonHtml.includes('text-amber-300'), '2.4: Robot icon is styled with text-amber-300 glyph color');
    assert(buttonHtml.includes('🤖 Bantuan AI SIPJAM'), '2.4: Trigger button contains desktop tooltip');
  }

  // 2.5: SSR Multi-role and Multi-view Rendering Validation
  const roles: Array<'guru' | 'admin' | 'superadmin' | undefined> = ['guru', 'admin', 'superadmin', undefined];
  const views = ['view-guru-presensi', 'view-guru-jurnal', 'view-admin-verif', 'view-piket', undefined];

  for (const role of roles) {
    for (const view of views) {
      const renderedHtml = ReactDOMServer.renderToString(
        React.createElement(AIAssistant, {
          currentView: view,
          userRole: role,
          userName: 'Pengguna Uji',
        })
      );

      assert(renderedHtml.includes('fa-robot'), `2.5: SSR HTML for role=${role}, view=${view} contains fa-robot`);
      assert(!renderedHtml.includes('animate-ping'), `2.5: SSR HTML for role=${role}, view=${view} has NO animate-ping`);
      assert(!renderedHtml.includes('bg-amber-400'), `2.5: SSR HTML for role=${role}, view=${view} has NO bg-amber-400`);
      assert(!renderedHtml.includes('bg-amber-500'), `2.5: SSR HTML for role=${role}, view=${view} has NO bg-amber-500`);
      assert(!renderedHtml.includes('bg-orange-'), `2.5: SSR HTML for role=${role}, view=${view} has NO bg-orange-*`);
      assert(!renderedHtml.includes('fa-wand-magic-sparkles'), `2.5: SSR HTML has NO obsolete wand sparkles`);
    }
  }

  // 2.6: SSR InitialOpen Modal Dialog Panel Rendering
  const openModalHtml = ReactDOMServer.renderToString(
    React.createElement(AIAssistant, {
      userRole: 'guru',
      userName: 'Fitra',
      initialOpen: true,
    })
  );
  assert(openModalHtml.includes('Panel Asisten AI SIPJAM'), '2.6: initialOpen modal renders dialog panel');
  assert(openModalHtml.includes('fa-robot text-sm'), '2.6: Modal header renders robot icon');
  assert(openModalHtml.includes('100% Offline FAQ'), '2.6: Modal header displays 100% Offline FAQ indicator');
  assert(!openModalHtml.includes('animate-ping'), '2.6: Open modal panel contains no animate-ping');
  assert(!openModalHtml.includes('bg-amber-400'), '2.6: Open modal panel contains no bg-amber-400');

  // 2.7: Greeting and Knowledge Base Operational Integrity
  assert(getAIAssistantGreeting('guru', undefined).includes('Halo, Bapak/Ibu Guru!'), '2.7: Guru default greeting matches');
  assert(getAIAssistantGreeting('guru', 'Ahmad').includes('Halo, Bapak/Ibu Ahmad!'), '2.7: Guru named greeting matches');
  assert(getAIAssistantGreeting('admin', undefined).includes('Halo, Admin!'), '2.7: Admin default greeting matches');
  assert(getAIAssistantGreeting('superadmin', undefined).includes('Halo, Admin!'), '2.7: Superadmin default greeting matches');

  // 2.8: FAQ Matcher Operational Smoke Test
  const answers = findBestAnswers('Bagaimana cara presensi datang?', 'view-guru-presensi', 3);
  assert(answers.length > 0, '2.8: findBestAnswers returns matches for presensi datang');
  assert(answers[0].id === 'faq-presensi-1' && answers[0].answer.includes('Presensi'), '2.8: Top FAQ answer matches faq-presensi-1');
  assert(answers[0].score >= 18, `2.8: Answer score (${answers[0].score}) exceeds threshold`);

  const fallback = getFallbackResponse('xyz_pertanyaan_ngawur_tidak_ada_di_faq_123', 'view-guru-presensi');
  assert(Boolean(fallback && fallback.message), '2.8: Unmatched query returns graceful fallback');
  assert(fallback.categories.length > 0, '2.8: Fallback provides available topic categories');
  assert(fallback.suggestions.length > 0, '2.8: Fallback provides contextual suggestions');

  const contextSuggestions = getContextSuggestions('view-guru-presensi', 3);
  assert(contextSuggestions.length === 3, '2.8: getContextSuggestions returns requested number of suggestions');
  assert(contextSuggestions[0].relatedViews.includes('view-guru-presensi'), '2.8: Suggestion is contextually relevant');

  // ===========================================================================
  // SECTION 3: INTEGRATION AUDIT - CALL SITES & PROPS (CAMERASELFIECAPTURE)
  // ===========================================================================
  console.log('\n--- SECTION 3: Integration Audit of CameraSelfieCapture Call Sites ---\n');

  const rootDir = path.resolve(__dirname, '..');
  const cameraCompPath = path.join(rootDir, 'src', 'components', 'CameraSelfieCapture.tsx');
  const guruPresensiPath = path.join(rootDir, 'src', 'components', 'GuruPresensi.tsx');
  const guruJurnalPath = path.join(rootDir, 'src', 'components', 'GuruJurnal.tsx');
  const piketViewPath = path.join(rootDir, 'src', 'components', 'PiketView.tsx');

  assert(fs.existsSync(cameraCompPath), '3.1: CameraSelfieCapture.tsx exists');
  const cameraCode = fs.readFileSync(cameraCompPath, 'utf8');

  // 3.2: Anti-zoom CSS in CameraSelfieCapture.tsx
  assert(cameraCode.includes('object-contain'), '3.2: Uses CSS object-contain');
  assert(!cameraCode.includes('object-cover'), '3.2: Does NOT use CSS object-cover');
  assert(cameraCode.includes("orientation === 'portrait' ? 'aspect-[3/4] max-w-sm mx-auto' : 'aspect-video'"), '3.2: Container matches orientation aspect ratio (3/4 portrait vs 16/9 landscape)');

  // 3.3: Call sites pass explicit orientation props
  const presensiCode = fs.readFileSync(guruPresensiPath, 'utf8');
  const jurnalCode = fs.readFileSync(guruJurnalPath, 'utf8');
  const piketCode = fs.readFileSync(piketViewPath, 'utf8');

  assert(presensiCode.includes('orientation="portrait"'), '3.3: GuruPresensi passes orientation="portrait"');
  assert(jurnalCode.includes('orientation="landscape"'), '3.3: GuruJurnal passes orientation="landscape"');
  assert(piketCode.includes('orientation="landscape"'), '3.3: PiketView passes orientation="landscape"');

  // ===========================================================================
  // SUMMARY & VERDICT
  // ===========================================================================
  console.log('\n========================================================================');
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    console.error('FAILURES:');
    failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL EMPIRICAL ADVERSARIAL TESTS PASSED (0 FAILURES)!');
    console.log('VERDICT: APPROVE');
    process.exit(0);
  }
}

runAdversarialTestHarness().catch((err) => {
  console.error('Unhandled test harness error:', err);
  process.exit(1);
});
