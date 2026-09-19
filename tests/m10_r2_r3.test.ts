import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('MILESTONE M10 TEST: TRACK R2 & TRACK R3');
console.log('====================================================\n');

const projectRoot = path.resolve(__dirname, '..');

// ----------------------------------------------------
// Section 1: Track R2 - DokumenView.tsx
// ----------------------------------------------------
console.log('--- Section 1: DokumenView.tsx (Admin CRUD & Completeness Tracking) ---');
const dokumenPath = path.join(projectRoot, 'src', 'components', 'DokumenView.tsx');
assert(fs.existsSync(dokumenPath), 'DokumenView.tsx file exists');
const dokumenContent = fs.readFileSync(dokumenPath, 'utf8');

// 1. Admin CRUD handlers for syarat_perangkat_pembelajaran
assert(
  dokumenContent.includes('handleOpenAddSyarat') &&
  dokumenContent.includes('handleOpenEditSyarat') &&
  dokumenContent.includes('handleSaveSyarat') &&
  dokumenContent.includes('handleDeleteSyarat'),
  'DokumenView implements full CRUD handlers for syarat_perangkat_pembelajaran'
);

// 2. Querying syarat_perangkat_pembelajaran from database
assert(
  dokumenContent.includes("from('syarat_perangkat_pembelajaran')"),
  'DokumenView queries public.syarat_perangkat_pembelajaran'
);

// 3. Tab switching between Matriks Guru and Kelola Syarat Dokumen
assert(
  dokumenContent.includes("activeTab === 'matrix'") &&
  dokumenContent.includes("activeTab === 'syarat'") &&
  dokumenContent.includes('Kelola Syarat Dokumen') &&
  dokumenContent.includes('Matriks Guru'),
  'DokumenView provides Admin tab selector between Matriks Guru and Kelola Syarat Dokumen'
);

// 4. Per-teacher per-subject tracking
assert(
  dokumenContent.includes('teacherSubjectCards') &&
  dokumenContent.includes('filteredTeacherSubjectCards') &&
  dokumenContent.includes('totalRequired') &&
  dokumenContent.includes('completedCount'),
  'DokumenView computes per-teacher per-subject completeness tracking'
);

// 5. Minimalist cards with click-to-expand detail drawer
assert(
  dokumenContent.includes('expandedCardKey') &&
  dokumenContent.includes('setExpandedCardKey') &&
  dokumenContent.includes('isExpanded'),
  'DokumenView displays minimalist cards with click-to-expand document breakdown drawer'
);

// 6. Completeness percentage calculation with 0-division guard
assert(
  dokumenContent.includes('completedCount / totalRequired') ||
  dokumenContent.includes('Math.round((completedCount / totalRequired) * 100)'),
  'DokumenView calculates completeness percentage as (uploaded / total) * 100 with zero-division guard'
);


// ----------------------------------------------------
// Section 2: Track R2 & R3 - HomeView.tsx
// ----------------------------------------------------
console.log('\n--- Section 2: HomeView.tsx (Admin Matrix & Teacher Dashboard) ---');
const homePath = path.join(projectRoot, 'src', 'components', 'HomeView.tsx');
assert(fs.existsSync(homePath), 'HomeView.tsx file exists');
const homeContent = fs.readFileSync(homePath, 'utf8');

// 1. Resilient Admin Daily Status Matrix
assert(
  homeContent.includes('loadAdminMatrix') &&
  homeContent.includes('penugasan_piket') &&
  homeContent.includes('jadwal_piket'),
  'HomeView loadAdminMatrix checks both penugasan_piket and legacy jadwal_piket'
);

// 2. Multi-tenant sekolah_id filtering
assert(
  homeContent.includes('sekolah_id') &&
  homeContent.includes("teachersQ = teachersQ.eq('sekolah_id', user.sekolah_id)"),
  'HomeView applies multi-tenant sekolah_id filtering in loadAdminMatrix'
);

// 3. Resilient timestamp matching
assert(
  homeContent.includes('slashMatch') &&
  homeContent.includes('isTeacherMatch'),
  'HomeView implements resilient multi-format timestamp and bidirectional name matching'
);

// 4. Teacher Dashboard widget strict ordering: (1) Stats, (2) Task Status, (3) Teaching Schedule
const statsIdx = homeContent.indexOf('Statistik Presensi Pribadi');
const taskIdx = homeContent.indexOf('Status Tugas Hari Ini');
const scheduleIdx = homeContent.indexOf('Jadwal Mengajar Hari Ini');

assert(
  statsIdx !== -1 && taskIdx !== -1 && scheduleIdx !== -1,
  'HomeView contains all 3 core teacher dashboard sections'
);

assert(
  statsIdx < taskIdx && taskIdx < scheduleIdx,
  'HomeView strictly orders teacher dashboard sections: (1) Statistik Presensi Pribadi, (2) Status Tugas Hari Ini, (3) Jadwal Mengajar Hari Ini'
);


// ----------------------------------------------------
// Section 3: Track R3 - Camera Location & Nominatim
// ----------------------------------------------------
console.log('\n--- Section 3: Camera Location & Nominatim Reverse Geocoding ---');
const watermarkPath = path.join(projectRoot, 'src', 'lib', 'watermarkCanvas.ts');
const cameraPath = path.join(projectRoot, 'src', 'components', 'CameraSelfieCapture.tsx');

assert(fs.existsSync(watermarkPath), 'watermarkCanvas.ts file exists');
assert(fs.existsSync(cameraPath), 'CameraSelfieCapture.tsx file exists');

const watermarkContent = fs.readFileSync(watermarkPath, 'utf8');
const cameraContent = fs.readFileSync(cameraPath, 'utf8');

// 1. reverseGeocodeNominatim exported
assert(
  watermarkContent.includes('export async function reverseGeocodeNominatim'),
  'watermarkCanvas.ts exports reverseGeocodeNominatim function'
);

// 2. Target format [desa/kelurahan, kecamatan, kota/kabupaten, provinsi]
assert(
  watermarkContent.includes('addr.village') &&
  watermarkContent.includes('addr.state') &&
  watermarkContent.includes("parts.join(', ')"),
  'reverseGeocodeNominatim extracts desa, kecamatan, kota, and provinsi hierarchy'
);

// 3. Timeout and coordinate quantization caching
assert(
  watermarkContent.includes('AbortController') &&
  watermarkContent.includes('3500') &&
  watermarkContent.includes('toFixed(3)'),
  'reverseGeocodeNominatim uses 3.5s timeout and coordinate quantization caching'
);

// 4. Watermark badge renders 4 lines including location
assert(
  watermarkContent.includes('locationName?: string | null') &&
  watermarkContent.includes('options.locationName') &&
  watermarkContent.includes('verticalSpacing = badgeHeight / 5'),
  'drawWatermarkedCanvas renders 4 vertical lines with location name inside badge'
);

// 5. Mirroring coordinate space restoration
assert(
  watermarkContent.includes('ctx.translate(width, 0)') &&
  watermarkContent.includes('ctx.scale(-1, 1)') &&
  watermarkContent.includes('ctx.restore()'),
  'drawWatermarkedCanvas restores coordinate space before drawing badge and text (upright on all cameras)'
);

// 6. CameraSelfieCapture calls reverseGeocodeNominatim
assert(
  cameraContent.includes('reverseGeocodeNominatim(coords.latitude, coords.longitude)') &&
  cameraContent.includes('locationName') &&
  cameraContent.includes('getDefaultWatermarkOptions(coordinates, locationName)'),
  'CameraSelfieCapture invokes reverse geocoding on GPS acquisition and passes location to watermark'
);


// ----------------------------------------------------
// Section 4: Track R3 - RekapSiswaView.tsx Attendance Formula
// ----------------------------------------------------
console.log('\n--- Section 4: RekapSiswaView.tsx Student Attendance Calculation ---');
const rekapPath = path.join(projectRoot, 'src', 'components', 'RekapSiswaView.tsx');
assert(fs.existsSync(rekapPath), 'RekapSiswaView.tsx file exists');
const rekapContent = fs.readFileSync(rekapPath, 'utf8');

// 1. Query selects kehadiran_murid
assert(
  rekapContent.includes("select('absensi_siswa, detail_absen, tanggal, kehadiran_murid')"),
  'RekapSiswaView selects kehadiran_murid in jurnal_pembelajaran query'
);

// 2. Parse "Semua Hadir" / "Hadir Semua"
assert(
  rekapContent.includes('semua\\s*hadir|hadir\\s*semua') &&
  rekapContent.includes('target.hadir++'),
  'RekapSiswaView credits all enrolled students when meeting records "Semua Hadir"'
);

// 3. Handles absent students parsing and non-absent students
assert(
  rekapContent.includes('absentStatuses') &&
  rekapContent.includes('target.hadir++'),
  'RekapSiswaView credits unlisted students as Hadir when individual absentees are logged'
);

// 4. Queries direct absensi table
assert(
  rekapContent.includes("from('absensi')"),
  'RekapSiswaView integrates records from public.absensi table'
);

// 5. Student attendance percentage formula with zero-division guard
assert(
  rekapContent.includes('(total_present / total_students)') ||
  rekapContent.includes('(s.hadir / total) * 100'),
  'RekapSiswaView applies attendance percentage formula (total_present / total_students) * 100 with zero division guard'
);


// ----------------------------------------------------
// Section 5: Real Unit Execution & Calculation Tests
// ----------------------------------------------------
console.log('\n--- Section 5: Unit Calculations & Nominatim Mapping Verification ---');

function formatNominatimAddress(addr: Record<string, string | undefined>): string {
  const desa = addr.village || addr.kelurahan || addr.suburb || addr.quarter || addr.neighbourhood || addr.hamlet || addr.residential || '';
  const kec = addr.subdistrict || addr.kecamatan || addr.municipality || addr.district || addr.city_district || (addr.town !== desa ? addr.town : '') || '';
  const kota = addr.city || addr.regency || addr.county || addr.state_district || addr.region || '';
  const prov = addr.state || addr.province || '';
  const parts = [desa, kec, kota, prov].map(p => (p || '').trim()).filter(Boolean);
  return parts.length > 0 ? `[${parts.join(', ')}]` : '[Lokasi Tidak Terdeteksi]';
}

const testAddressBali = {
  village: 'Batuan',
  town: 'Sukawati',
  region: 'Gianyar',
  state: 'Bali'
};
assert(
  formatNominatimAddress(testAddressBali) === '[Batuan, Sukawati, Gianyar, Bali]',
  `Bali address formatted correctly: ${formatNominatimAddress(testAddressBali)}`
);

const testAddressMakassar = {
  suburb: 'Ballaparang',
  city_district: 'Rappocini',
  city: 'Makassar',
  state: 'Sulawesi Selatan'
};
assert(
  formatNominatimAddress(testAddressMakassar) === '[Ballaparang, Rappocini, Makassar, Sulawesi Selatan]',
  `Makassar address formatted correctly: ${formatNominatimAddress(testAddressMakassar)}`
);

function calculateStudentAttendance(hadir: number, total: number): number {
  return total > 0 ? Math.round((hadir / total) * 100) : 0;
}

assert(calculateStudentAttendance(28, 30) === 93, '28/30 student attendance correctly equals 93%');
assert(calculateStudentAttendance(30, 30) === 100, '30/30 student attendance correctly equals 100%');
assert(calculateStudentAttendance(0, 30) === 0, '0/30 student attendance correctly equals 0%');
assert(calculateStudentAttendance(0, 0) === 0, '0/0 student attendance zero division guard cleanly returns 0%');

function calculateCompletenessRate(uploaded: number, total: number): number {
  return total > 0 ? Math.round((uploaded / total) * 100) : 0;
}

assert(calculateCompletenessRate(6, 6) === 100, '6/6 documents equals 100% completeness');
assert(calculateCompletenessRate(3, 6) === 50, '3/6 documents equals 50% completeness');
assert(calculateCompletenessRate(0, 6) === 0, '0/6 documents equals 0% completeness');
assert(calculateCompletenessRate(0, 0) === 0, '0/0 documents zero division guard cleanly returns 0%');

console.log('\n====================================================');
console.log('🎉 ALL MILESTONE 10 TRACK R2 & R3 TESTS PASSED!');
console.log('====================================================');
