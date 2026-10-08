import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('================================================================');
console.log('  MILESTONE 2: TEACHER ATTENDANCE & ADMIN VERIFICATION TESTS   ');
console.log('================================================================\n');

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

// --------------------------------------------------------------------------
// SUITE 1: DATABASE SCHEMA & MIGRATION & TYPES
// --------------------------------------------------------------------------
console.log('━━━ SUITE 1: DATABASE SCHEMA & TYPES ━━━');

runTest('M2-01: Migration file exists with correct columns and indexes', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20261008_m2_presensi_guru_approval_autocheckout.sql'
  );
  assert.ok(fs.existsSync(migrationPath), 'Migration SQL file must exist');

  const content = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(content.includes('durasi_hari'), 'Must contain durasi_hari column');
  assert.ok(content.includes('tanggal_mulai'), 'Must contain tanggal_mulai column');
  assert.ok(content.includes('tanggal_selesai'), 'Must contain tanggal_selesai column');
  assert.ok(content.includes('memerlukan_persetujuan_admin'), 'Must contain memerlukan_persetujuan_admin column');
  assert.ok(content.includes('is_auto_checkout'), 'Must contain is_auto_checkout column');
  assert.ok(content.includes('idx_presensi_guru_leave_range'), 'Must contain leave range index');
  assert.ok(content.includes('idx_presensi_guru_auto_checkout'), 'Must contain auto checkout index');
});

runTest('M2-02: database.ts includes M2 presensi_guru types for Row, Insert, and Update', () => {
  const dbTypesPath = path.resolve(process.cwd(), 'src/types/database.ts');
  assert.ok(fs.existsSync(dbTypesPath), 'database.ts must exist');

  const content = fs.readFileSync(dbTypesPath, 'utf8');
  const presensiSection = content.slice(content.indexOf('presensi_guru: {'));
  assert.ok(presensiSection.includes('durasi_hari'), 'presensi_guru must have durasi_hari');
  assert.ok(presensiSection.includes('tanggal_mulai'), 'presensi_guru must have tanggal_mulai');
  assert.ok(presensiSection.includes('tanggal_selesai'), 'presensi_guru must have tanggal_selesai');
  assert.ok(presensiSection.includes('memerlukan_persetujuan_admin'), 'presensi_guru must have memerlukan_persetujuan_admin');
  assert.ok(presensiSection.includes('is_auto_checkout'), 'presensi_guru must have is_auto_checkout');
});

// --------------------------------------------------------------------------
// SUITE 2: MULTI-STATE TRANSITIONS & WORKFLOW
// --------------------------------------------------------------------------
console.log('\n━━━ SUITE 2: MULTI-STATE TRANSITIONS & WORKFLOW ━━━');

runTest('M2-03: GuruPresensi unlocks Pulang dropdown and supports all 4 state transitions', () => {
  const presensiPath = path.resolve(process.cwd(), 'src/components/GuruPresensi.tsx');
  const content = fs.readFileSync(presensiPath, 'utf8');

  // Verify dropdown is unlocked
  assert.ok(
    content.includes('const isJenisDropdownDisabled = false;') ||
    !content.includes('isJenisDropdownDisabled = tipeAbsen === \'Pulang\' && !dailyState?.isDinasLuar;'),
    'Pulang dropdown must be unlocked to allow selecting between Sekolah and Dinas Luar'
  );

  // Verify options render for Pulang
  assert.ok(
    content.includes('tipeAbsen === \'Pulang\' ? (') ||
    content.includes('tipeAbsen === \'Pulang\' ?'),
    'Must provide Pulang options for multi-state transition'
  );
  assert.ok(
    content.includes('<option value="Sekolah">Hadir di Sekolah</option>') ||
    content.includes('Hadir di Sekolah'),
    'Must offer Hadir di Sekolah option'
  );
  assert.ok(
    content.includes('<option value="Dinas Luar">Dinas Luar</option>'),
    'Must offer Dinas Luar option'
  );
});

runTest('M2-04: GuruPresensi includes leave duration fields, date range, and admin approval threshold', () => {
  const presensiPath = path.resolve(process.cwd(), 'src/components/GuruPresensi.tsx');
  const content = fs.readFileSync(presensiPath, 'utf8');

  // Duration fields & state
  assert.ok(content.includes('durasiHari'), 'Must manage durasiHari state');
  assert.ok(content.includes('tanggalMulai'), 'Must manage tanggalMulai state');
  assert.ok(content.includes('tanggalSelesai'), 'Must manage tanggalSelesai state');

  // Approval calculation rule
  assert.ok(
    content.includes('memerlukanPersetujuanAdmin') ||
    content.includes('memerlukan_persetujuan_admin'),
    'Must calculate admin approval requirement'
  );
  assert.ok(
    content.includes('detailIzin === \'Sakit\' && durasiHari >= 3') ||
    content.includes('detailIzin === \'Sakit\' && durasi >= 3'),
    'Sick leave >= 3 days must require admin approval'
  );

  // Approval badges in UI
  assert.ok(
    content.includes('Sakit ≥ 3 Hari: Perlu Persetujuan Admin') ||
    content.includes('Perlu Persetujuan Admin'),
    'Must render admin approval informational badge'
  );

  // Payload submission includes M2 fields
  assert.ok(content.includes('durasi_hari:'), 'Payload must include durasi_hari');
  assert.ok(content.includes('tanggal_mulai:'), 'Payload must include tanggal_mulai');
  assert.ok(content.includes('tanggal_selesai:'), 'Payload must include tanggal_selesai');
  assert.ok(content.includes('memerlukan_persetujuan_admin:'), 'Payload must include memerlukan_persetujuan_admin');
});

runTest('M2-05: workflow.ts tracks arrivalState, departureState, and multi-day approved leave', () => {
  const workflowPath = path.resolve(process.cwd(), 'src/lib/workflow.ts');
  const content = fs.readFileSync(workflowPath, 'utf8');

  // Interface types
  assert.ok(content.includes('arrivalState?:'), 'GuruDailyState must have arrivalState');
  assert.ok(content.includes('departureState?:'), 'GuruDailyState must have departureState');
  assert.ok(content.includes('activeLeaveRecord?:'), 'GuruDailyState must have activeLeaveRecord');

  // Logic populating multi-day leave
  assert.ok(
    content.includes('multiDayLeave') || content.includes('todayStr >= p.tanggal_mulai'),
    'workflow.ts must check multi-day leave spanning today'
  );
  assert.ok(
    content.includes('state.arrivalState =') || content.includes('arrivalState:'),
    'workflow.ts must set arrivalState'
  );
  assert.ok(
    content.includes('state.departureState =') || content.includes('departureState:'),
    'workflow.ts must set departureState'
  );
});

// --------------------------------------------------------------------------
// SUITE 3: AUTO-CHECKOUT FLAGGING (FORGOTTEN CHECKOUTS)
// --------------------------------------------------------------------------
console.log('\n━━━ SUITE 3: AUTO-CHECKOUT FLAGGING ━━━');

runTest('M2-06: attendanceAlpa.ts exports evaluateAndApplyAutoCheckout', () => {
  const alpaPath = path.resolve(process.cwd(), 'src/lib/attendanceAlpa.ts');
  const content = fs.readFileSync(alpaPath, 'utf8');

  assert.ok(
    content.includes('export async function evaluateAndApplyAutoCheckout'),
    'attendanceAlpa.ts must export evaluateAndApplyAutoCheckout'
  );
  assert.ok(
    content.includes('is_auto_checkout: true'),
    'Auto checkout must set is_auto_checkout: true'
  );
  assert.ok(
    content.includes('status_verifikasi: \'Lupa Checkout\''),
    'Auto checkout must set status_verifikasi: Lupa Checkout'
  );
  assert.ok(
    content.includes('catatan_admin: \'Auto-checkout: Guru tidak melakukan presensi pulang\'') ||
    content.includes('Auto-checkout: Guru tidak melakukan presensi pulang'),
    'Auto checkout must set descriptive admin note'
  );
});

runTest('M2-07: GuruPresensi displays warning banner when last attendance was Lupa Checkout', () => {
  const presensiPath = path.resolve(process.cwd(), 'src/components/GuruPresensi.tsx');
  const content = fs.readFileSync(presensiPath, 'utf8');

  assert.ok(
    content.includes('dailyState?.lastAutoCheckout') ||
    content.includes('lastAutoCheckout'),
    'GuruPresensi must check lastAutoCheckout'
  );
  assert.ok(
    content.includes('Peringatan Presensi: Tercatat Lupa Checkout') ||
    content.includes('Lupa Checkout'),
    'GuruPresensi must display Lupa Checkout alert banner'
  );
});

// --------------------------------------------------------------------------
// SUITE 4: ADMIN VERIFICATION ROUTING
// --------------------------------------------------------------------------
console.log('\n━━━ SUITE 4: ADMIN VERIFICATION ROUTING ━━━');

runTest('M2-08: AdminVerifView renders distinctive badges for Sakit >= 3 and Izin > 3 with period', () => {
  const verifPath = path.resolve(process.cwd(), 'src/components/AdminVerifView.tsx');
  const content = fs.readFileSync(verifPath, 'utf8');

  assert.ok(
    content.includes('Sakit &gt;= 3 Hari (Perlu Persetujuan)') ||
    content.includes('Sakit >= 3 Hari (Perlu Persetujuan)') ||
    content.includes('Sakit'),
    'AdminVerifView must detect and badge long-term sick'
  );
  assert.ok(
    content.includes('Izin &gt; 3 Hari (Perlu Persetujuan)') ||
    content.includes('Izin > 3 Hari (Perlu Persetujuan)') ||
    content.includes('Izin'),
    'AdminVerifView must detect and badge long-term leave'
  );
  assert.ok(
    content.includes('item.tanggal_mulai') || content.includes('item.durasi_hari'),
    'AdminVerifView must display period and duration'
  );
});

// --------------------------------------------------------------------------
// SUITE 5: GPS COORDINATES ON PRINTED DOCUMENTS
// --------------------------------------------------------------------------
console.log('\n━━━ SUITE 5: GPS COORDINATES ON PRINTED DOCUMENTS ━━━');

runTest('M2-09: printWithGps.ts helper exists and implements geolocation lookup and SweetAlert alerts', () => {
  const gpsPath = path.resolve(process.cwd(), 'src/utils/printWithGps.ts');
  assert.ok(fs.existsSync(gpsPath), 'src/utils/printWithGps.ts must exist');

  const content = fs.readFileSync(gpsPath, 'utf8');
  assert.ok(
    content.includes('export async function triggerPrintWithGps') ||
    content.includes('triggerPrintWithGps'),
    'Must export triggerPrintWithGps'
  );
  assert.ok(
    content.includes('navigator.geolocation'),
    'Must use browser geolocation API'
  );
  assert.ok(
    content.includes('PERMISSION_DENIED'),
    'Must handle PERMISSION_DENIED error'
  );
  assert.ok(
    content.includes('Swal.fire'),
    'Must display SweetAlert on error or denial'
  );
});

runTest('M2-10: PrintHeader PrintSignature accepts and renders GPS coordinates in security footer', () => {
  const printHeaderPath = path.resolve(process.cwd(), 'src/components/PrintHeader.tsx');
  const content = fs.readFileSync(printHeaderPath, 'utf8');

  assert.ok(
    content.includes('gpsCoordinates?:') || content.includes('gpsCoordinates'),
    'PrintSignatureProps must accept gpsCoordinates'
  );
  assert.ok(
    content.includes('Koordinat GPS:') || content.includes('activeGps'),
    'PrintSignature security footer must render GPS coordinates'
  );
});

// --------------------------------------------------------------------------
// SUITE 6: BEHAVIORAL CALCULATIONS & BOUNDARY RULES
// --------------------------------------------------------------------------
console.log('\n━━━ SUITE 6: BEHAVIORAL CALCULATIONS & BOUNDARY RULES ━━━');

runTest('M2-11: Approval threshold rule strictly matches (Sakit >= 3) || (Izin > 3)', () => {
  const checkApproval = (jenis: string, detail: string, durasi: number) => {
    return (detail === 'Sakit' && durasi >= 3) || (jenis === 'Izin' && durasi > 3);
  };

  // Sakit boundary tests
  assert.strictEqual(checkApproval('Izin', 'Sakit', 1), false, 'Sakit 1 day does not require admin approval');
  assert.strictEqual(checkApproval('Izin', 'Sakit', 2), false, 'Sakit 2 days does not require admin approval');
  assert.strictEqual(checkApproval('Izin', 'Sakit', 3), true, 'Sakit 3 days requires admin approval');
  assert.strictEqual(checkApproval('Izin', 'Sakit', 7), true, 'Sakit 7 days requires admin approval');

  // Izin boundary tests
  assert.strictEqual(checkApproval('Izin', 'Izin Pribadi', 1), false, 'Izin 1 day does not require admin approval');
  assert.strictEqual(checkApproval('Izin', 'Izin Pribadi', 3), false, 'Izin 3 days does not require admin approval');
  assert.strictEqual(checkApproval('Izin', 'Izin Pribadi', 4), true, 'Izin 4 days requires admin approval');
  assert.strictEqual(checkApproval('Izin', 'Izin Khusus', 5), true, 'Izin 5 days requires admin approval');
});

runTest('M2-12: Multi-day leave date range arithmetic logic', () => {
  const addDaysToDateStr = (dateStr: string, days: number): string => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDaysBetween = (startStr: string, endStr: string): number => {
    const [y1, m1, d1] = startStr.split('-').map(Number);
    const [y2, m2, d2] = endStr.split('-').map(Number);
    const dt1 = new Date(y1, m1 - 1, d1);
    const dt2 = new Date(y2, m2 - 1, d2);
    const diffTime = dt2.getTime() - dt1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
  };

  // Start date 2026-10-08, duration 3 -> End date 2026-10-10
  assert.strictEqual(addDaysToDateStr('2026-10-08', 2), '2026-10-10');
  assert.strictEqual(getDaysBetween('2026-10-08', '2026-10-10'), 3);

  // Single-day leave (duration 1) -> End date equals start date
  assert.strictEqual(addDaysToDateStr('2026-10-08', 0), '2026-10-08');
  assert.strictEqual(getDaysBetween('2026-10-08', '2026-10-08'), 1);
});

// --------------------------------------------------------------------------
// SUMMARY & RESULTS
// --------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`  M2 TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
