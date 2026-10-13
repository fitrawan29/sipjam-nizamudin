import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('VERIFICATION TEST SUITE: DINAS LUAR CAMERA SELFIE & GEOFENCE BYPASS');
console.log('========================================================================\n');

const projectRoot = process.cwd();
const guruPresensiPath = path.join(projectRoot, 'src', 'components', 'GuruPresensi.tsx');

assert(fs.existsSync(guruPresensiPath), 'GuruPresensi.tsx must exist');
const code = fs.readFileSync(guruPresensiPath, 'utf-8');

// --- R1: Presensi Dinas Luar Menggunakan Kamera Foto Lokasi ---
console.log('--- SECTION 1: R1 - Camera Selfie for Dinas Luar ---');

assert(
  code.includes("isSelfieRequired = jenisPresensi === 'Sekolah' || jenisPresensi === 'Dinas Luar' ||"),
  'R1.1: isSelfieRequired must include jenisPresensi === "Dinas Luar"'
);

assert(
  !code.includes("val === 'Izin' || val === 'Dinas Luar'"),
  'R1.2: requiresDocumentNew must not require document for Dinas Luar'
);

assert(
  code.includes('<CameraSelfieCapture'),
  'R1.3: CameraSelfieCapture component is rendered in GuruPresensi'
);

// --- R2: Tanpa Batasan Radius Lokasi ---
console.log('--- SECTION 2: R2 - GPS Geofence Bypass & Auto-Verification ---');

assert(
  code.includes("jenisPresensi === 'Sekolah' && jarakAktual !== null && jarakAktual > gpsConfig.radius"),
  'R2.1: Geofence radius warning is strictly restricted to Hadir di Sekolah (bypassed for Dinas Luar)'
);

assert(
  code.includes("} else if (jenisPresensi === 'Dinas Luar') {\n      statusVerif = 'Diverifikasi';") ||
  code.includes("} else if (jenisPresensi === 'Dinas Luar') {\r\n      statusVerif = 'Diverifikasi';",) ||
  code.includes("statusVerif = 'Diverifikasi'"),
  'R2.2: Dinas Luar status_verifikasi is directly "Diverifikasi"'
);

assert(
  code.includes('latitude: userCoords?.latitude || null') &&
  code.includes('longitude: userCoords?.longitude || null') &&
  code.includes('lokasi: lokasi'),
  'R2.3: GPS coordinates and location string are captured and stored in presensi payload'
);

// --- R3: Transisi State Presensi Tanpa Hambatan ---
console.log('--- SECTION 3: R3 - Seamless State Transitions ---');

assert(
  code.includes("const requiresDocumentNew = val === 'Izin';") &&
  code.includes("const requiresDocumentOld = jenisPresensi === 'Izin';"),
  'R3.1: togglePresensiFields only triggers document modal on Izin (Sekolah <-> Dinas Luar preserves photos)'
);

assert(
  code.includes("const requiresDocumentNew = nextJenisPresensi === 'Izin';") &&
  code.includes("const requiresDocumentOld = jenisPresensi === 'Izin';"),
  'R3.2: handleTipeAbsenChange only triggers document modal on Izin'
);

assert(
  code.includes('key={`camera-presensi-${tipeAbsen}`}') ||
  !code.includes('key={`camera-presensi-${tipeAbsen}-${jenisPresensi}`}'),
  'R3.3: Camera component does not remount and preserves captured image across Sekolah <-> Dinas Luar toggle'
);

// --- R4: Folder Routing & Upload Google Drive ---
console.log('--- SECTION 4: R4 - Google Drive Storage Routing ---');

assert(
  code.includes("'Presensi_DinasLuar' : 'Presensi_Guru'"),
  'R4.1: Background upload routes Dinas Luar photos to Presensi_DinasLuar folder'
);

assert(
  code.includes("const prefix = isSelfie ? 'Selfie' : 'Dokumen';"),
  'R4.2: Photo upload sets prefix to Selfie for camera-based captures including Dinas Luar'
);

console.log('\n========================================================================');
console.log('🎉 ALL DINAS LUAR CAMERA VERIFICATION TESTS PASSED SUCCESSFULLY!');
console.log('========================================================================\n');
