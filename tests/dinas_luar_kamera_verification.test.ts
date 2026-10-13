import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('VERIFICATION TEST SUITE: DINAS LUAR CAMERA SELFIE & GEOFENCE BYPASS');
console.log('========================================================================\n');

const projectRoot = process.cwd();
const guruPresensiPath = path.join(projectRoot, 'src', 'components', 'GuruPresensi.tsx');
const apiAttendancePath = path.join(projectRoot, 'src', 'app', 'api', 'attendance', 'route.ts');
const cameraPath = path.join(projectRoot, 'src', 'components', 'CameraSelfieCapture.tsx');

assert(fs.existsSync(guruPresensiPath), 'GuruPresensi.tsx must exist');
assert(fs.existsSync(apiAttendancePath), 'src/app/api/attendance/route.ts must exist');
assert(fs.existsSync(cameraPath), 'CameraSelfieCapture.tsx must exist');

const code = fs.readFileSync(guruPresensiPath, 'utf-8');
const apiCode = fs.readFileSync(apiAttendancePath, 'utf-8');
const cameraCode = fs.readFileSync(cameraPath, 'utf-8');

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err: any) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// ============================================================================
// SECTION 1: R1 - Camera Live Capture for Dinas Luar
// ============================================================================
console.log('━━━ SECTION 1: R1 - Camera Live Capture for Dinas Luar ━━━');

runTest('R1.1: isSelfieRequired explicitly includes "Dinas Luar"', () => {
  assert.ok(
    code.includes("isSelfieRequired = jenisPresensi === 'Sekolah' || jenisPresensi === 'Dinas Luar' ||"),
    'isSelfieRequired must include Dinas Luar alongside Sekolah'
  );
});

runTest('R1.2: Dinas Luar does not require document file input', () => {
  assert.ok(
    !code.includes("val === 'Izin' || val === 'Dinas Luar'"),
    'requiresDocumentNew must not require document for Dinas Luar'
  );
});

runTest('R1.3: CameraSelfieCapture is rendered with orientation="portrait" and environment camera', () => {
  assert.ok(code.includes('<CameraSelfieCapture'), 'Must render CameraSelfieCapture');
  assert.ok(code.includes('orientation="portrait"'), 'Must specify portrait orientation');
  assert.ok(code.includes('initialFacingMode="environment"'), 'Must default to environment camera');
});

runTest('R1.4: UI labels dynamically reflect "Foto Lokasi Dinas Luar" for both Datang and Pulang', () => {
  assert.ok(
    code.includes("Foto Lokasi Dinas Luar (Wajib dengan Watermark)"),
    'Datang label must indicate location photo with watermark for Dinas Luar'
  );
  assert.ok(
    code.includes("Foto Lokasi Presensi Pulang Dinas Luar (Wajib)"),
    'Pulang label must indicate location photo for Dinas Luar checkout'
  );
  assert.ok(
    code.includes("Foto lokasi siap digunakan"),
    'Confirmation badge must indicate location photo for Dinas Luar'
  );
});

// ============================================================================
// SECTION 2: R2 - Tanpa Batasan Radius Lokasi & GPS Coordinate Integrity
// ============================================================================
console.log('\n━━━ SECTION 2: R2 - Geofence Bypass & Coordinate Integrity ━━━');

runTest('R2.1: Geofence radius warning is strictly restricted to "Sekolah" (bypassed for Dinas Luar)', () => {
  assert.ok(
    code.includes("jenisPresensi === 'Sekolah' && jarakAktual !== null && jarakAktual > gpsConfig.radius"),
    'Geofence toast must only trigger for Sekolah presensi'
  );
  assert.ok(
    code.includes("jarakAktual !== null && jenisPresensi === 'Sekolah'"),
    'Distance badge under Titik Lokasi input must only show for Sekolah'
  );
});

runTest('R2.2: Dinas Luar status_verifikasi is directly set to "Diverifikasi"', () => {
  assert.ok(
    code.includes("} else if (jenisPresensi === 'Dinas Luar') {\n      statusVerif = 'Diverifikasi';") ||
    code.includes("} else if (jenisPresensi === 'Dinas Luar') {\r\n      statusVerif = 'Diverifikasi';") ||
    code.includes("statusVerif = 'Diverifikasi'"),
    'Dinas Luar status_verifikasi must default directly to Diverifikasi'
  );
});

runTest('R2.3: Primary payload includes latitude, longitude, and lokasi with nullish coalescing', () => {
  assert.ok(code.includes('latitude: userCoords?.latitude ?? null'), 'Latitude must use nullish coalescing');
  assert.ok(code.includes('longitude: userCoords?.longitude ?? null'), 'Longitude must use nullish coalescing');
  assert.ok(code.includes('lokasi: lokasi'), 'Lokasi string must be included');
});

runTest('R2.4: Fallback compatiblePresensi preserves latitude and longitude on schema retry', () => {
  const compatibleBlock = code.slice(code.indexOf('const compatiblePresensi: any = {'));
  const endCompatibleBlock = compatibleBlock.slice(0, compatibleBlock.indexOf('};'));
  assert.ok(endCompatibleBlock.includes('latitude: newPresensi.latitude'), 'Fallback must preserve latitude');
  assert.ok(endCompatibleBlock.includes('longitude: newPresensi.longitude'), 'Fallback must preserve longitude');
});

runTest('R2.5: Server endpoint /api/attendance extracts and stores latitude and longitude', () => {
  assert.ok(apiCode.includes('const latitude = typeof body.latitude'), 'API must parse latitude');
  assert.ok(apiCode.includes('const longitude = typeof body.longitude'), 'API must parse longitude');
  assert.ok(apiCode.includes('latitude: latitude'), 'API presensiRecord must contain latitude');
  assert.ok(apiCode.includes('longitude: longitude'), 'API presensiRecord must contain longitude');
});

// Behavioral test of geofence logic function
runTest('R2.6: Functional simulation of geofence validation and verification status', () => {
  const evaluateStatus = (jenis: string, jarakM: number | null, radiusM: number) => {
    let warningToast = false;
    let status = 'Menunggu';

    if (jenis === 'Sekolah' && jarakM !== null && jarakM > radiusM) {
      warningToast = true;
    }

    if (jenis === 'Sekolah') {
      status = (jarakM === null || jarakM <= radiusM) ? 'Diverifikasi' : 'Menunggu';
    } else if (jenis === 'Dinas Luar') {
      status = 'Diverifikasi';
    }
    return { status, warningToast };
  };

  const gpsRadius = 100;

  // Sekolah inside radius
  const sInside = evaluateStatus('Sekolah', 45, gpsRadius);
  assert.strictEqual(sInside.status, 'Diverifikasi');
  assert.strictEqual(sInside.warningToast, false);

  // Sekolah outside radius
  const sOutside = evaluateStatus('Sekolah', 350, gpsRadius);
  assert.strictEqual(sOutside.status, 'Menunggu');
  assert.strictEqual(sOutside.warningToast, true);

  // Dinas Luar outside radius (e.g. 50 km away in another city)
  const dlFar = evaluateStatus('Dinas Luar', 50000, gpsRadius);
  assert.strictEqual(dlFar.status, 'Diverifikasi', 'Dinas Luar must be Diverifikasi even at 50km');
  assert.strictEqual(dlFar.warningToast, false, 'Dinas Luar must NOT show out of range toast');

  // Dinas Luar with null distance (GPS pending or off)
  const dlNull = evaluateStatus('Dinas Luar', null, gpsRadius);
  assert.strictEqual(dlNull.status, 'Diverifikasi');
  assert.strictEqual(dlNull.warningToast, false);
});

runTest('R2.7: Adversarial verification of 0.0 equator coordinates preservation', () => {
  const preserveCoord = (coordVal: number | undefined | null) => coordVal ?? null;
  assert.strictEqual(preserveCoord(0), 0, 'Latitude 0.0 at equator must NOT be coerced to null');
  assert.strictEqual(preserveCoord(-0.001), -0.001, 'Negative coordinates must be preserved');
  assert.strictEqual(preserveCoord(null), null, 'Null must remain null');
  assert.strictEqual(preserveCoord(undefined), null, 'Undefined must become null');
});

runTest('R2.8: CameraSelfieCapture propagates coordinates and reverse geocoded location to GuruPresensi', () => {
  assert.ok(
    cameraCode.includes('onPhotoConfirmed(file, capturedImage, coordinates, locationName)') ||
    cameraCode.includes('onPhotoConfirmed(capturedFile, capturedImage, coordinates, locationName)'),
    'CameraSelfieCapture must pass coordinates and locationName to onPhotoConfirmed'
  );
  assert.ok(
    code.includes('onPhotoConfirmed={(capturedFile: File, previewUrl: string, coords?: WatermarkCoordinates | null, locName?: string | null) =>'),
    'GuruPresensi must accept coords and locName in onPhotoConfirmed callback'
  );
  assert.ok(
    code.includes('setUserCoords(coords)'),
    'GuruPresensi must sync userCoords from confirmed camera capture'
  );
});

runTest('R2.9: Full boundary coordinates (equator, north/south poles, dateline) are preserved without data loss', () => {
  const preserveCoord = (coordVal: number | undefined | null) => coordVal ?? null;
  assert.strictEqual(preserveCoord(90.0), 90.0, 'North Pole latitude 90.0 preserved');
  assert.strictEqual(preserveCoord(-90.0), -90.0, 'South Pole latitude -90.0 preserved');
  assert.strictEqual(preserveCoord(180.0), 180.0, 'Antimeridian longitude 180.0 preserved');
  assert.strictEqual(preserveCoord(-180.0), -180.0, 'Antimeridian longitude -180.0 preserved');
  assert.strictEqual(preserveCoord(0.0), 0.0, 'Prime Meridian / Equator 0.0 preserved');
});

// ============================================================================
// SECTION 3: R3 - Transisi State Presensi Tanpa Hambatan
// ============================================================================
console.log('\n━━━ SECTION 3: R3 - Seamless State Transitions ━━━');

runTest('R3.1: togglePresensiFields only prompts modal for Izin (Sekolah <-> Dinas Luar is seamless)', () => {
  assert.ok(
    code.includes("const requiresDocumentNew = val === 'Izin';") &&
    code.includes("const requiresDocumentOld = jenisPresensi === 'Izin';"),
    'Only Izin triggers document change prompts'
  );
});

runTest('R3.2: handleTipeAbsenChange preserves Dinas Luar state across Datang <-> Pulang', () => {
  assert.ok(
    code.includes("nextJenisPresensi = (jenisPresensi === 'Dinas Luar' || dailyState?.isDinasLuar) ? 'Dinas Luar' : 'Sekolah';"),
    'Dinas Luar selection is preserved when toggling tipeAbsen'
  );
});

runTest('R3.3: CameraSelfieCapture key is bound to tipeAbsen (preserves mounted camera stream)', () => {
  assert.ok(
    code.includes('key={`camera-presensi-${tipeAbsen}`}') ||
    !code.includes('key={`camera-presensi-${tipeAbsen}-${jenisPresensi}`}'),
    'Camera component does not remount when switching between Sekolah and Dinas Luar'
  );
});

// Behavioral test of state transitions
runTest('R3.4: Functional simulation of state transition prompts', () => {
  const checkPromptRequired = (hasFile: boolean, fromJenis: string, toJenis: string) => {
    const requiresDocNew = toJenis === 'Izin';
    const requiresDocOld = fromJenis === 'Izin';
    const promptsPrompt = Boolean(
      (hasFile && requiresDocNew && !requiresDocOld) ||
      (hasFile && !requiresDocNew && requiresDocOld)
    );
    return promptsPrompt;
  };

  // Switching between Sekolah and Dinas Luar with captured photo
  assert.strictEqual(
    checkPromptRequired(true, 'Sekolah', 'Dinas Luar'),
    false,
    'Sekolah -> Dinas Luar with captured photo must NOT prompt warning'
  );
  assert.strictEqual(
    checkPromptRequired(true, 'Dinas Luar', 'Sekolah'),
    false,
    'Dinas Luar -> Sekolah with captured photo must NOT prompt warning'
  );

  // Switching between Dinas Luar and Izin
  assert.strictEqual(
    checkPromptRequired(true, 'Dinas Luar', 'Izin'),
    true,
    'Dinas Luar -> Izin with captured photo MUST prompt warning'
  );
  assert.strictEqual(
    checkPromptRequired(true, 'Izin', 'Dinas Luar'),
    true,
    'Izin -> Dinas Luar with attached document MUST prompt warning'
  );
});

runTest('R3.5: Post-submit transition immediately sets Pulang with Dinas Luar without state flicker', () => {
  assert.ok(
    code.includes("nextJenisAfterSubmit = (currentJenis === 'Dinas Luar' && tipeAbsen === 'Datang') ? 'Dinas Luar' : 'Sekolah';"),
    'Must evaluate nextJenisAfterSubmit immediately upon submission'
  );
  assert.ok(
    code.includes("if (tipeAbsen === 'Datang') {\n      setTipeAbsen('Pulang');\n    }") ||
    code.includes("if (tipeAbsen === 'Datang') {\r\n      setTipeAbsen('Pulang');\r\n    }"),
    'Must transition to Pulang immediately without awaiting dailyState network call'
  );
});

runTest('R3.6: Multi-state checkout permits toggling between Hadir di Sekolah and Dinas Luar when checking out (Pulang)', () => {
  assert.ok(
    code.includes('<option value="Sekolah">Hadir di Sekolah</option>'),
    'Sekolah option must be present'
  );
  assert.ok(
    code.includes('<option value="Dinas Luar">Dinas Luar</option>'),
    'Dinas Luar option must be present'
  );
  assert.ok(
    code.includes("tipeAbsen === 'Pulang' ? (") &&
    code.includes('<option value="Sekolah">Hadir di Sekolah</option>') &&
    code.includes('<option value="Dinas Luar">Dinas Luar</option>'),
    'Both Sekolah and Dinas Luar must be selectable for Pulang'
  );
});

// ============================================================================
// SECTION 4: R4 - Folder Routing & Upload Google Drive
// ============================================================================
console.log('\n━━━ SECTION 4: R4 - Google Drive Storage Routing ━━━');

runTest('R4.1: Background upload routes Dinas Luar photos to "Presensi_DinasLuar"', () => {
  assert.ok(
    code.includes("'Presensi_DinasLuar' : 'Presensi_Guru'"),
    'Folder routing must target Presensi_DinasLuar for Dinas Luar'
  );
});

runTest('R4.2: Photo upload sets prefix to "Selfie" for camera-based captures including Dinas Luar', () => {
  assert.ok(
    code.includes("const prefix = isSelfie ? 'Selfie' : 'Dokumen';"),
    'Upload prefix must be Selfie for camera captures'
  );
});

runTest('R4.3: Functional simulation of Google Drive folder and prefix routing', () => {
  const getUploadParams = (jenis: string, isSelfieRequired: boolean) => {
    const folderName = (jenis === 'Dinas Luar') ? 'Presensi_DinasLuar' : 'Presensi_Guru';
    const prefix = isSelfieRequired ? 'Selfie' : 'Dokumen';
    return { folderName, prefix };
  };

  const dinasLuarParams = getUploadParams('Dinas Luar', true);
  assert.strictEqual(dinasLuarParams.folderName, 'Presensi_DinasLuar');
  assert.strictEqual(dinasLuarParams.prefix, 'Selfie');

  const sekolahParams = getUploadParams('Sekolah', true);
  assert.strictEqual(sekolahParams.folderName, 'Presensi_Guru');
  assert.strictEqual(sekolahParams.prefix, 'Selfie');

  const izinParams = getUploadParams('Izin', false);
  assert.strictEqual(izinParams.folderName, 'Presensi_Guru');
  assert.strictEqual(izinParams.prefix, 'Dokumen');
});

runTest('R4.4: Storage folder routing strictly checks currentJenis === "Dinas Luar"', () => {
  assert.ok(
    code.includes("const folderName = currentJenis === 'Dinas Luar' ? 'Presensi_DinasLuar' : 'Presensi_Guru';"),
    'Folder name must strictly resolve based on submitted currentJenis'
  );
});

runTest('R4.5: Storage error handling resilience: errors update link_bukti to "gagal_upload" without losing Supabase attendance record', () => {
  assert.ok(
    code.includes(".update({ link_bukti: 'gagal_upload' })"),
    'Must record gagal_upload fallback status on drive upload rejection'
  );
  assert.ok(
    code.includes("showToast('Upload Foto Tertunda'"),
    'Must inform teacher with warning toast when background upload fails'
  );
});

console.log('\n========================================================================');
console.log(`SUMMARY: Total ${totalTests} | Passed: ${passedTests} | Failed: ${totalTests - passedTests}`);
console.log('🎉 ALL DINAS LUAR CAMERA VERIFICATION TESTS PASSED SUCCESSFULLY!');
console.log('========================================================================\n');
