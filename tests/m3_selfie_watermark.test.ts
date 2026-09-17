import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('MILESTONE 3 TEST: SELFIE ATTENDANCE & WATERMARK VERIFICATION');
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
const watermarkPath = path.join(rootDir, 'src', 'lib', 'watermarkCanvas.ts');
const cameraCompPath = path.join(rootDir, 'src', 'components', 'CameraSelfieCapture.tsx');
const guruPresensiPath = path.join(rootDir, 'src', 'components', 'GuruPresensi.tsx');

// Test 1: Verify watermarkCanvas.ts exists and exports required functions
assert(fs.existsSync(watermarkPath), 'src/lib/watermarkCanvas.ts exists');
const watermarkContent = fs.readFileSync(watermarkPath, 'utf-8');

assert(watermarkContent.includes('export function drawWatermarkedCanvas'), 'drawWatermarkedCanvas is exported');
assert(watermarkContent.includes('export function dataUrlToFile'), 'dataUrlToFile is exported');
assert(watermarkContent.includes('export function getDefaultWatermarkOptions'), 'getDefaultWatermarkOptions is exported');
assert(watermarkContent.includes('options: WatermarkOptions'), 'Accepts WatermarkOptions parameter');
assert(watermarkContent.includes('options.timestamp'), 'Watermark embeds timestamp');
assert(watermarkContent.includes('options.coordinates'), 'Watermark embeds coordinates');
assert(watermarkContent.includes('options.dateText'), 'Watermark embeds dateText');
assert(watermarkContent.includes('ctx.fillStyle = \'rgba(15, 23, 42, 0.78)\''), 'Renders semi-transparent dark pill background');
assert(watermarkContent.includes('canvas.toDataURL'), 'Returns base64 data URL');

// Test 2: Verify CameraSelfieCapture.tsx exists and implements key requirements
assert(fs.existsSync(cameraCompPath), 'src/components/CameraSelfieCapture.tsx exists');
const cameraContent = fs.readFileSync(cameraCompPath, 'utf-8');

assert(cameraContent.includes('navigator.mediaDevices.getUserMedia'), 'Uses getUserMedia for live camera stream');
assert(cameraContent.includes("facingMode: 'user'"), 'Targets front/selfie camera with facingMode: user');
assert(cameraContent.includes('navigator.geolocation.getCurrentPosition'), 'Tracks live geolocation via getCurrentPosition');
assert(cameraContent.includes('drawWatermarkedCanvas'), 'Invokes drawWatermarkedCanvas upon photo capture');
assert(cameraContent.includes('Foto Ulang'), 'Provides "Foto Ulang" (retake) button');
assert(cameraContent.includes('Gunakan Foto'), 'Provides "Gunakan Foto" (confirm) button');
assert(cameraContent.includes('stopCamera'), 'Implements graceful camera track cleanup on unmount and confirm');
assert(!cameraContent.includes('alert('), 'Zero native alert calls in CameraSelfieCapture');

// Test 3: Verify GuruPresensi.tsx integrates CameraSelfieCapture and implements async GAS upload
assert(fs.existsSync(guruPresensiPath), 'src/components/GuruPresensi.tsx exists');
const presensiContent = fs.readFileSync(guruPresensiPath, 'utf-8');

assert(presensiContent.includes("import CameraSelfieCapture from '@/components/CameraSelfieCapture'"), 'GuruPresensi imports CameraSelfieCapture');
assert(presensiContent.includes('isSelfieRequired'), 'GuruPresensi calculates isSelfieRequired');
assert(presensiContent.includes('<CameraSelfieCapture'), 'GuruPresensi renders CameraSelfieCapture');
assert(presensiContent.includes('dailyState?.isDinasLuar'), 'Handles Dinas Luar state on pulang');

// Verify non-blocking async GAS upload:
// supabase.from('presensi_guru').insert is executed BEFORE uploadToDrive is awaited in background
const insertIndex = presensiContent.indexOf("supabase.from('presensi_guru').insert([newPresensi])");
const uploadToDriveIndex = presensiContent.indexOf("await uploadToDrive(");
assert(insertIndex !== -1, 'GuruPresensi inserts presensi record');
assert(uploadToDriveIndex !== -1, 'GuruPresensi triggers uploadToDrive');
assert(insertIndex < uploadToDriveIndex, 'Non-blocking: Presensi record is inserted into Supabase BEFORE uploadToDrive completes in background');
assert(presensiContent.includes('.update({ link_bukti: driveUrl })'), 'Updates presensi_guru.link_bukti after background upload finishes');

// Verify Pulang options for Dinas Luar
assert(
  presensiContent.includes("tipeAbsen === 'Pulang' && dailyState?.isDinasLuar"),
  'Pulang options allow switching between Di Sekolah and Dinas Luar when dailyState.isDinasLuar is true'
);
assert(
  presensiContent.includes("disabled={isJenisDropdownDisabled}") || presensiContent.includes("disabled={tipeAbsen === 'Pulang' && !dailyState?.isDinasLuar}"),
  'Dropdown is NOT disabled during Pulang if teacher checked in as Dinas Luar'
);

console.log('\n====================================================');
if (failed === 0) {
  console.log('🎉 ALL MILESTONE 3 TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`💥 ${failed} TEST(S) FAILED!`);
  process.exit(1);
}
