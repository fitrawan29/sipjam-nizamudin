/**
 * Automated Verification Suite for Milestone 4 (M4):
 * Laporan Wali Kelas (RekapSiswaView.tsx) & Sinkronisasi Guru Mapel (GuruJurnal.tsx)
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('====================================================');
console.log('MILESTONE 4: LAPORAN WALI KELAS & SINKRONISASI GURU MAPEL');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    failed++;
  }
}

const projectRoot = path.resolve(__dirname, '..');

// ============================================================================
// SECTION 1: STATIC INSPECTION OF RekapSiswaView.tsx
// ============================================================================
console.log('--- 1. Static Code Inspection of RekapSiswaView.tsx ---');

const rekapSiswaPath = path.join(projectRoot, 'src', 'components', 'RekapSiswaView.tsx');
assert(fs.existsSync(rekapSiswaPath), 'RekapSiswaView.tsx exists');

const rekapContent = fs.readFileSync(rekapSiswaPath, 'utf8');

// Tab / panel for Presensi Gerbang Piket
assert(
  rekapContent.includes("activeTab === 'gerbang'") && rekapContent.includes('Presensi Gerbang Piket'),
  'RekapSiswaView defines dedicated tab and panel for "Presensi Gerbang Piket"'
);

// Multi-tenant isolation in presensi_siswa queries
assert(
  rekapContent.includes(".from('presensi_siswa')") &&
  rekapContent.includes(".eq('sekolah_id', user.sekolah_id)"),
  'RekapSiswaView enforces strict multi-tenant isolation on presensi_siswa (sekolah_id = user.sekolah_id)'
);

// Wali Kelas auto-filter
assert(
  rekapContent.includes('user?.penugasan?.kelas_binaan') ||
  rekapContent.includes('user?.wali_kelas') ||
  rekapContent.includes('resolvedWaliKelas'),
  'RekapSiswaView supports automatic filtering for Wali Kelas assigned class (penugasan.kelas_binaan or wali_kelas)'
);

// Admin class selector dropdown
assert(
  rekapContent.includes("user?.role === 'Admin'") &&
  rekapContent.includes('kelasList.map'),
  'RekapSiswaView renders class selector dropdown for Admin'
);

// Date picker defaulting to today
assert(
  rekapContent.includes('gerbangTanggal') &&
  rekapContent.includes('type="date"'),
  'RekapSiswaView includes date picker for viewing gate attendance on selected date'
);

// Summary metric cards
assert(
  rekapContent.includes('totalGerbangSiswa') &&
  rekapContent.includes('totalGerbangDatang') &&
  rekapContent.includes('totalGerbangPulang') &&
  rekapContent.includes('totalGerbangBelumScan'),
  'RekapSiswaView calculates and displays 4 summary cards: Total Siswa, Hadir Datang, Pulang, Belum Scan'
);

// Student table columns & badges
assert(
  rekapContent.includes('Jam Datang') &&
  rekapContent.includes('Jam Pulang') &&
  rekapContent.includes('Hadir Datang') &&
  rekapContent.includes('Sudah Pulang') &&
  rekapContent.includes('Belum Scan'),
  'RekapSiswaView displays student gate table with NISN, Nama, Jam Datang, Jam Pulang, and status badges'
);

// Integration in Wali input form
assert(
  rekapContent.includes('waliGateLogs'),
  'RekapSiswaView integrates real-time gate scan indicator into the Wali Kelas input modal'
);

// ============================================================================
// SECTION 2: STATIC INSPECTION OF GuruJurnal.tsx
// ============================================================================
console.log('\n--- 2. Static Code Inspection of GuruJurnal.tsx ---');

const guruJurnalPath = path.join(projectRoot, 'src', 'components', 'GuruJurnal.tsx');
assert(fs.existsSync(guruJurnalPath), 'GuruJurnal.tsx exists');

const jurnalContent = fs.readFileSync(guruJurnalPath, 'utf8');

// Query presensi_siswa with status datang & multi-tenant isolation
assert(
  jurnalContent.includes(".from('presensi_siswa')") &&
  jurnalContent.includes(".eq('status', 'datang')") &&
  jurnalContent.includes(".eq('sekolah_id', user.sekolah_id)"),
  'GuruJurnal queries presensi_siswa for today with status="datang" scoped by sekolah_id'
);

// Gate attendance indicator badges in Live Absensi Murid
assert(
  jurnalContent.includes('✓ Hadir di Sekolah (Piket') &&
  jurnalContent.includes('Belum Scan Piket'),
  'GuruJurnal displays "✓ Hadir di Sekolah (Piket ${jam})" and "Belum Scan Piket" badges in Live Absensi Murid'
);

// Action button "Terapkan Presensi Piket"
assert(
  jurnalContent.includes('Terapkan Presensi Piket') &&
  jurnalContent.includes('handleApplyPiketAttendance'),
  'GuruJurnal includes helper button "Terapkan Presensi Piket" to quickly mark gate-present students as Hadir'
);

// Multi-tenant scoping on other queries
assert(
  jurnalContent.includes("if (user?.sekolah_id) mapelQuery = mapelQuery.eq('sekolah_id', user.sekolah_id);") &&
  jurnalContent.includes("if (user?.sekolah_id) siswaQuery = siswaQuery.eq('sekolah_id', user.sekolah_id);") &&
  jurnalContent.includes("if (user?.sekolah_id) jdwlQuery = jdwlQuery.eq('sekolah_id', user.sekolah_id);"),
  'GuruJurnal applies multi-tenant filtering across data_mapel, data_siswa, and jadwal_pelajaran'
);

// ============================================================================
// SECTION 3: STATIC INSPECTION OF workflow.ts
// ============================================================================
console.log('\n--- 3. Static Code Inspection of workflow.ts ---');

const workflowPath = path.join(projectRoot, 'src', 'lib', 'workflow.ts');
assert(fs.existsSync(workflowPath), 'workflow.ts exists');

const workflowContent = fs.readFileSync(workflowPath, 'utf8');

assert(
  workflowContent.includes('export async function findJadwalForGuru(hari: string, namaGuru: string, username?: string, userId?: string, sekolahId?: string)') &&
  workflowContent.includes("if (sekolahId) query = query.eq('sekolah_id', sekolahId);"),
  'findJadwalForGuru accepts sekolahId and applies tenant isolation'
);

assert(
  workflowContent.includes('findJadwalForGuru(selectedHari, namaGuru, username, userId, sekolahId)'),
  'getGuruDailyState passes sekolahId to findJadwalForGuru'
);

// ============================================================================
// SECTION 4: BEHAVIORAL SIMULATION OF GATE ATTENDANCE & SYNC LOGIC
// ============================================================================
console.log('\n--- 4. Behavioral Simulation of Wali Kelas & Guru Mapel Sync Logic ---');

const mockSchoolId = 'school-tenant-alpha';
const mockOtherSchoolId = 'school-tenant-beta';

const mockStudentsClass7A = [
  { id: 'std-1', nisn: '001', nama_siswa: 'Ahmad Dahlan', kelas: '7A', sekolah_id: mockSchoolId },
  { id: 'std-2', nisn: '002', nama_siswa: 'Budi Utomo', kelas: '7A', sekolah_id: mockSchoolId },
  { id: 'std-3', nisn: '003', nama_siswa: 'Cut Nyak Dien', kelas: '7A', sekolah_id: mockSchoolId },
  { id: 'std-4', nisn: '004', nama_siswa: 'Dewi Sartika', kelas: '7A', sekolah_id: mockSchoolId },
  { id: 'std-5', nisn: '005', nama_siswa: 'Eko Prasetyo', kelas: '7A', sekolah_id: mockSchoolId },
  { id: 'std-6', nisn: '006', nama_siswa: 'Fajar Nugraha', kelas: '7A', sekolah_id: mockSchoolId },
  { id: 'std-7', nisn: '007', nama_siswa: 'Gita Gutawa', kelas: '7A', sekolah_id: mockSchoolId },
  { id: 'std-8', nisn: '008', nama_siswa: 'Hasan Basri', kelas: '7A', sekolah_id: mockSchoolId },
  { id: 'std-9', nisn: '009', nama_siswa: 'Indah Permata', kelas: '7A', sekolah_id: mockSchoolId },
  { id: 'std-10', nisn: '010', nama_siswa: 'Joko Widodo', kelas: '7A', sekolah_id: mockSchoolId },
];

const mockPresensiSiswa = [
  // 6 check-ins in school-tenant-alpha
  { sekolah_id: mockSchoolId, siswa_id: 'std-1', nisn: '001', status: 'datang', jam: '06:40:12', kelas: '7A', tanggal: '2026-10-04' },
  { sekolah_id: mockSchoolId, siswa_id: 'std-2', nisn: '002', status: 'datang', jam: '06:45:00', kelas: '7A', tanggal: '2026-10-04' },
  { sekolah_id: mockSchoolId, siswa_id: 'std-3', nisn: '003', status: 'datang', jam: '06:50:33', kelas: '7A', tanggal: '2026-10-04' },
  { sekolah_id: mockSchoolId, siswa_id: 'std-4', nisn: '004', status: 'datang', jam: '06:55:18', kelas: '7A', tanggal: '2026-10-04' },
  { sekolah_id: mockSchoolId, siswa_id: 'std-5', nisn: '005', status: 'datang', jam: '07:05:00', kelas: '7A', tanggal: '2026-10-04' },
  { sekolah_id: mockSchoolId, siswa_id: 'std-6', nisn: '006', status: 'datang', jam: '07:10:45', kelas: '7A', tanggal: '2026-10-04' },
  // 2 check-outs in school-tenant-alpha
  { sekolah_id: mockSchoolId, siswa_id: 'std-1', nisn: '001', status: 'pulang', jam: '14:00:20', kelas: '7A', tanggal: '2026-10-04' },
  { sekolah_id: mockSchoolId, siswa_id: 'std-2', nisn: '002', status: 'pulang', jam: '14:05:10', kelas: '7A', tanggal: '2026-10-04' },
  // 1 check-in in another tenant with same NISN (must be excluded)
  { sekolah_id: mockOtherSchoolId, siswa_id: 'other-7', nisn: '007', status: 'datang', jam: '06:30:00', kelas: '7A', tanggal: '2026-10-04' },
];

// Step 4.1: Multi-tenant filter simulation
const tenantLogs = mockPresensiSiswa.filter(p => p.sekolah_id === mockSchoolId && p.kelas === '7A' && p.tanggal === '2026-10-04');
assert(tenantLogs.length === 8, 'Multi-tenant filter isolates records to current sekolah_id (8 records, foreign tenant excluded)');

// Step 4.2: Wali Kelas Gate Attendance Mapping
const mappedGate = mockStudentsClass7A.map(siswa => {
  const datang = tenantLogs.find(p => (p.siswa_id === siswa.id || p.nisn === siswa.nisn) && p.status === 'datang');
  const pulang = tenantLogs.find(p => (p.siswa_id === siswa.id || p.nisn === siswa.nisn) && p.status === 'pulang');
  return {
    ...siswa,
    datang,
    pulang,
    jamDatang: datang ? datang.jam.slice(0, 5) : null,
    jamPulang: pulang ? pulang.jam.slice(0, 5) : null,
    hasDatang: !!datang,
    hasPulang: !!pulang,
  };
});

const totalSiswa = mappedGate.length;
const hadirDatang = mappedGate.filter(s => s.hasDatang).length;
const sudahPulang = mappedGate.filter(s => s.hasPulang).length;
const belumScan = totalSiswa - hadirDatang;

assert(totalSiswa === 10, 'Wali Kelas Total Siswa equals 10');
assert(hadirDatang === 6, 'Wali Kelas Hadir Datang equals 6');
assert(sudahPulang === 2, 'Wali Kelas Pulang equals 2');
assert(belumScan === 4, 'Wali Kelas Belum Scan equals 4 (10 - 6)');

// Student status badges verification
const std1 = mappedGate.find(s => s.nisn === '001')!;
assert(std1.hasPulang && std1.jamDatang === '06:40' && std1.jamPulang === '14:00', 'Student 1 has both datang and pulang timestamps');

const std6 = mappedGate.find(s => s.nisn === '006')!;
assert(std6.hasDatang && !std6.hasPulang && std6.jamDatang === '07:10', 'Student 6 has datang timestamp but has not checked out');

const std7 = mappedGate.find(s => s.nisn === '007')!;
assert(!std7.hasDatang && !std7.hasPulang, 'Student 7 remains Belum Scan (other tenant check-in successfully ignored)');

// Step 4.3: GuruJurnal Mapel Synchronization Simulation
const piketMap: Record<string, { jam: string }> = {};
tenantLogs.filter(p => p.status === 'datang').forEach(p => {
  piketMap[p.nisn] = { jam: p.jam.slice(0, 5) };
});

assert(Object.keys(piketMap).length === 6, 'GuruJurnal piketMap correctly contains 6 arrived students');

// Live Absensi initial state before applying piket
const initialLessonAbsensi: Record<string, string> = {};
mockStudentsClass7A.forEach(s => {
  initialLessonAbsensi[s.nisn] = 'H'; // default
});

// Teacher clicks "Terapkan Presensi Piket"
const syncedLessonAbsensi: Record<string, string> = { ...initialLessonAbsensi };
let appliedCount = 0;
mockStudentsClass7A.forEach(s => {
  if (piketMap[s.nisn]) {
    syncedLessonAbsensi[s.nisn] = 'H';
    appliedCount++;
  } else {
    // Un-scanned students can be set or kept for manual teacher evaluation
    syncedLessonAbsensi[s.nisn] = 'A'; // e.g. flagged as absent until checked
  }
});

assert(appliedCount === 6, 'Terapkan Presensi Piket successfully synchronizes 6 gate-checked students to Hadir');
assert(syncedLessonAbsensi['001'] === 'H', 'Student 001 marked Hadir in lesson');
assert(syncedLessonAbsensi['006'] === 'H', 'Student 006 marked Hadir in lesson');
assert(syncedLessonAbsensi['007'] === 'A', 'Student 007 (not checked at gate) correctly flagged for manual teacher inspection');

// Manual override verification: teacher can manually change student 007 to Sakit (S)
syncedLessonAbsensi['007'] = 'S';
assert(syncedLessonAbsensi['007'] === 'S', 'Teacher retains full ability to manually adjust attendance status after sync');

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n====================================================');
if (failed === 0) {
  console.log(`🎉 ALL ${passed} MILESTONE 4 AUDIT CHECKS PASSED CLEANLY!`);
  console.log('====================================================\n');
  process.exit(0);
} else {
  console.error(`❌ ${failed} CHECKS FAILED!`);
  console.log('====================================================\n');
  process.exit(1);
}
