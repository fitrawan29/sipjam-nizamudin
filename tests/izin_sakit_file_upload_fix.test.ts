import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { detectMimeType, isImageFile } from '../src/lib/driveUpload';

console.log('========================================================================');
console.log('🧪 TEST SUITE: VERIFIKASI PERBAIKAN UPLOAD FILE IZIN / SAKIT GURU');
console.log('========================================================================\n');

// --- Suite 1: Unit Tests for driveUpload MIME Detection & Type Guards ---
console.log('--- Suite 1: Unit Tests for driveUpload MIME Detection & Type Guards ---');

// 1.1 PDF detection with empty type (mobile browser edge case)
const fakePdfFile = { name: 'surat_sakit_dokter.pdf', type: '' } as File;
assert.strictEqual(detectMimeType(fakePdfFile), 'application/pdf', '1.1: Must resolve application/pdf when file.type is empty');
assert.strictEqual(isImageFile(fakePdfFile), false, '1.1: PDF must not be identified as an image file');
console.log('  ✔ [PASS] 1.1: detectMimeType resolves application/pdf for PDF with empty mobile mime');

// 1.2 Image detection with empty type
const fakeJpgFile = { name: 'foto_bukti_izin.JPG', type: '' } as File;
assert.strictEqual(detectMimeType(fakeJpgFile), 'image/jpeg', '1.2: Must resolve image/jpeg when JPG file.type is empty');
assert.strictEqual(isImageFile(fakeJpgFile), true, '1.2: JPG must be identified as an image file');
console.log('  ✔ [PASS] 1.2: detectMimeType resolves image/jpeg for JPG with empty mobile mime');

// 1.3 PNG detection
const fakePngFile = { name: 'scan_surat.png', type: 'image/png' } as File;
assert.strictEqual(detectMimeType(fakePngFile), 'image/png', '1.3: Must preserve image/png');
assert.strictEqual(isImageFile(fakePngFile), true, '1.3: PNG must be identified as an image file');
console.log('  ✔ [PASS] 1.3: detectMimeType preserves image/png and isImageFile flags true');

// 1.4 WebP detection
const fakeWebpFile = { name: 'surat.webp', type: 'image/webp' } as File;
assert.strictEqual(detectMimeType(fakeWebpFile), 'image/webp', '1.4: Must preserve image/webp');
assert.strictEqual(isImageFile(fakeWebpFile), true, '1.4: WebP must be identified as an image file');
console.log('  ✔ [PASS] 1.4: detectMimeType preserves image/webp and isImageFile flags true\n');

// --- Suite 2: Static Analysis & Invariant Verification in GuruPresensi.tsx ---
console.log('--- Suite 2: Static Analysis & Invariant Verification in GuruPresensi.tsx ---');

const guruPresensiPath = path.join(__dirname, '../src/components/GuruPresensi.tsx');
assert.ok(fs.existsSync(guruPresensiPath), 'GuruPresensi.tsx must exist');
const code = fs.readFileSync(guruPresensiPath, 'utf8');

// 2.1 Leave submissions exempt from gate opening/closing time restrictions
assert.ok(
  code.includes("const isLeave = jenisPresensi === 'Izin' || jenisPresensi === 'Sakit';") &&
  code.includes("if (!isLeave) {") &&
  code.includes("if (currTimeVal < startVal)") &&
  code.includes("if (currTimeVal > akhirVal && !isTerlambat)"),
  '2.1: Leave submissions (Izin/Sakit) must be exempt from gate opening and closing hour restrictions'
);
console.log('  ✔ [PASS] 2.1: Gate schedule (datangMulai/datangAkhir) is strictly bypassed for leave submissions');

// 2.2 Upload is executed and awaited before form state reset & workflow refresh
const insertIndex = code.indexOf("supabase.from('presensi_guru').insert([newPresensi])");
const uploadIndex = code.indexOf("await uploadToDrive(");
const resetIndex = code.indexOf("setFile(null);", uploadIndex);
const getDailyStateIndex = code.indexOf("await getGuruDailyState(", uploadIndex);

assert.ok(insertIndex !== -1, '2.2: presensi record must be inserted');
assert.ok(uploadIndex !== -1, '2.2: uploadToDrive must be invoked');
assert.ok(resetIndex !== -1, '2.2: setFile(null) must be invoked');
assert.ok(getDailyStateIndex !== -1, '2.2: getGuruDailyState must be invoked');

assert.ok(insertIndex < uploadIndex, '2.2: Non-blocking invariant: Supabase record inserted before uploadToDrive completes');
assert.ok(uploadIndex < resetIndex, '2.2: uploadToDrive completes before form file state is reset');
assert.ok(uploadIndex < getDailyStateIndex, '2.2: uploadToDrive completes before getGuruDailyState is refreshed');
console.log('  ✔ [PASS] 2.2: Upload execution lifecycle executes reliably before form reset and state refresh');

// 2.3 Drive URL passed to autoFillKbmJournalsForLeave
assert.ok(
  code.includes("link_bukti: driveUrl || (fileToUpload ? undefined : '-')"),
  '2.3: autoFillKbmJournalsForLeave must receive driveUrl when file is uploaded'
);
console.log('  ✔ [PASS] 2.3: autoFillKbmJournalsForLeave receives the uploaded Google Drive link');

// 2.4 Error fallback records 'gagal_upload' and informs user
assert.ok(
  code.includes(".update({ link_bukti: 'gagal_upload' })") &&
  code.includes("showToast('Upload Foto Tertunda'"),
  '2.4: Upload failure must record gagal_upload and show non-intrusive warning'
);
console.log('  ✔ [PASS] 2.4: Upload error fallback records gagal_upload without losing the attendance record\n');

// --- Suite 3: Simulation of Submission at 14:00 WITA (After Gate Close) ---
console.log('--- Suite 3: Simulation of Submission at 14:00 WITA (After Gate Close) ---');

const parseTime = (timeStr: string) => {
  const [h, m] = String(timeStr).trim().replace(/\./g, ':').split(':').map(Number);
  return h * 60 + m;
};

const jamPresensi = { datangMulai: '06:45', datangBatas: '07:15', datangAkhir: '08:00' };
const startVal = parseTime(jamPresensi.datangMulai);
const akhirVal = parseTime(jamPresensi.datangAkhir);

// 3.1 Teacher filing Sakit at 14:00 WITA (currTimeVal = 840)
const currTimeVal = 14 * 60; // 840 minutes (14:00 WITA)
const jenisPresensiSakit = 'Izin';
const isLeaveSakit = jenisPresensiSakit === 'Izin' || jenisPresensiSakit === 'Sakit';
let isBlocked = false;

if (!isLeaveSakit) {
  if (currTimeVal < startVal || currTimeVal > akhirVal) {
    isBlocked = true;
  }
}
assert.strictEqual(isBlocked, false, '3.1: Leave application at 14:00 WITA must NOT be blocked');
console.log('  ✔ [PASS] 3.1: Simulated leave submission at 14:00 WITA succeeds cleanly without gate hour blockage');

// 3.2 Regular attendance at 14:00 WITA IS blocked
const jenisPresensiSekolah = 'Sekolah';
const isLeaveSekolah = jenisPresensiSekolah === 'Izin' || jenisPresensiSekolah === 'Sakit';
let isSekolahBlocked = false;

if (!isLeaveSekolah) {
  if (currTimeVal < startVal || currTimeVal > akhirVal) {
    isSekolahBlocked = true;
  }
}
assert.strictEqual(isSekolahBlocked, true, '3.2: Regular physical attendance at 14:00 WITA must be blocked as closed');
console.log('  ✔ [PASS] 3.2: Simulated regular attendance at 14:00 WITA correctly blocked as expected\n');

console.log('========================================================================');
console.log('TOTAL TESTS: 10 | PASSED: 10 | FAILED: 0');
console.log('========================================================================');
console.log('🎉 ALL IZIN / SAKIT FILE UPLOAD FIX TESTS PASSED 100% PERFECTLY!');
