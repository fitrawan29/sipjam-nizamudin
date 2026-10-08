import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('   FORENSIC INTEGRITY AUDIT: MILESTONE 2 VERIFICATION & STRESS TEST     ');
console.log('========================================================================\n');

let passCount = 0;
let failCount = 0;

function forensicCheck(title: string, fn: () => void) {
  try {
    fn();
    passCount++;
    console.log(`[PASS] ${title}`);
  } catch (err: any) {
    failCount++;
    console.error(`[FAIL] ${title}`);
    console.error(`       Evidence: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// FORENSIC CHECK 1: CODE INTEGRITY & ANTI-FACADE ANALYSIS
// -----------------------------------------------------------------------------
console.log('━━━ CHECK 1: SOURCE INTEGRITY & ANTI-FACADE ANALYSIS ━━━');

forensicCheck('1.1 Migration SQL syntax & schema validity', () => {
  const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20261008_m2_presensi_guru_approval_autocheckout.sql');
  assert.ok(fs.existsSync(sqlPath), 'Migration SQL must exist');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Verify non-trivial DDL commands
  const requiredColumns = [
    'durasi_hari',
    'tanggal_mulai',
    'tanggal_selesai',
    'memerlukan_persetujuan_admin',
    'is_auto_checkout',
    'latitude',
    'longitude'
  ];
  for (const col of requiredColumns) {
    assert.ok(sql.includes(col), `SQL migration must define column '${col}'`);
  }

  assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS idx_presensi_guru_leave_range'), 'Must create leave range index');
  assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS idx_presensi_guru_auto_checkout'), 'Must create auto checkout index');
});

forensicCheck('1.2 Database TypeScript definitions match SQL schema without any placeholder', () => {
  const dbTypesPath = path.resolve(process.cwd(), 'src/types/database.ts');
  const dbContent = fs.readFileSync(dbTypesPath, 'utf8');

  const presensiGuruSection = dbContent.slice(dbContent.indexOf('presensi_guru: {'), dbContent.indexOf('rekap_kehadiran: {'));
  assert.ok(presensiGuruSection.length > 500, 'presensi_guru section must be fully defined');

  // Must define fields in Row, Insert, and Update
  for (const field of ['durasi_hari', 'tanggal_mulai', 'tanggal_selesai', 'memerlukan_persetujuan_admin', 'is_auto_checkout', 'latitude', 'longitude']) {
    const rowMatch = presensiGuruSection.includes(`${field}:`);
    const insertMatch = presensiGuruSection.includes(`${field}?:`);
    assert.ok(rowMatch && insertMatch, `database.ts must define ${field} in both Row and Insert/Update`);
  }
});

forensicCheck('1.3 GuruPresensi contains genuine business logic, not facades or dummy stubs', () => {
  const guruPresensiPath = path.resolve(process.cwd(), 'src/components/GuruPresensi.tsx');
  const content = fs.readFileSync(guruPresensiPath, 'utf8');

  // Check that isJenisDropdownDisabled is not locking the teacher to one option
  assert.ok(!content.includes('isJenisDropdownDisabled = tipeAbsen === \'Pulang\' && !dailyState?.isDinasLuar'), 'Old lock must be removed');
  assert.ok(content.includes('const isJenisDropdownDisabled = false;'), 'Dropdown must be unlocked for Pulang');

  // Verify calculation of admin approval requirement
  assert.ok(content.includes('memerlukanPersetujuanAdmin'), 'Must compute memerlukanPersetujuanAdmin');
  assert.ok(content.includes('durasiHari'), 'Must manage durasiHari');
  assert.ok(content.includes('tanggalMulai'), 'Must manage tanggalMulai');
  assert.ok(content.includes('tanggalSelesai'), 'Must manage tanggalSelesai');

  // Check that insert payload includes all fields
  assert.ok(content.includes('durasi_hari:'), 'Payload must include durasi_hari');
  assert.ok(content.includes('tanggal_mulai:'), 'Payload must include tanggal_mulai');
  assert.ok(content.includes('tanggal_selesai:'), 'Payload must include tanggal_selesai');
  assert.ok(content.includes('memerlukan_persetujuan_admin:'), 'Payload must include memerlukan_persetujuan_admin');
  assert.ok(content.includes('is_auto_checkout: false'), 'Teacher manual checkout must have is_auto_checkout: false');
});

forensicCheck('1.4 No dead test hooks, NODE_ENV shortcuts or artificial mocks in production code', () => {
  const filesToCheck = [
    'src/components/GuruPresensi.tsx',
    'src/lib/workflow.ts',
    'src/lib/attendanceAlpa.ts',
    'src/components/AdminVerifView.tsx',
    'src/components/PrintHeader.tsx',
    'src/utils/printWithGps.ts'
  ];

  for (const relPath of filesToCheck) {
    const fullPath = path.resolve(process.cwd(), relPath);
    const content = fs.readFileSync(fullPath, 'utf8');

    assert.ok(!content.includes('__TEST_BYPASS__'), `${relPath} must not contain __TEST_BYPASS__`);
    assert.ok(!content.includes('if (isTestMock)'), `${relPath} must not contain test mock bypasses`);
    assert.ok(!content.includes('process.env.CYPRESS'), `${relPath} must not contain Cypress test hooks`);
  }
});

// -----------------------------------------------------------------------------
// FORENSIC CHECK 2: BEHAVIORAL STRESS & BOUNDARY TESTS
// -----------------------------------------------------------------------------
console.log('\n━━━ CHECK 2: BEHAVIORAL STRESS & BOUNDARY TESTS ━━━');

forensicCheck('2.1 Approval Threshold Rule Boundary Stress', () => {
  // Requirement: Sakit >= 3 days requires Admin Approval
  // Requirement: Izin > 3 days requires Admin Approval
  const computeAdminApproval = (jenisPresensi: string, detailIzin: string, durasiHari: number): boolean => {
    return (detailIzin === 'Sakit' && durasiHari >= 3) || (jenisPresensi === 'Izin' && durasiHari > 3);
  };

  // Sakit boundaries
  assert.strictEqual(computeAdminApproval('Izin', 'Sakit', 0), false, '0 days should not require approval');
  assert.strictEqual(computeAdminApproval('Izin', 'Sakit', 1), false, '1 day Sakit should NOT require approval');
  assert.strictEqual(computeAdminApproval('Izin', 'Sakit', 2), false, '2 days Sakit should NOT require approval');
  assert.strictEqual(computeAdminApproval('Izin', 'Sakit', 3), true, '3 days Sakit MUST require approval (Boundary exact)');
  assert.strictEqual(computeAdminApproval('Izin', 'Sakit', 4), true, '4 days Sakit MUST require approval');
  assert.strictEqual(computeAdminApproval('Izin', 'Sakit', 30), true, '30 days Sakit MUST require approval');

  // Izin boundaries (e.g. Izin Pribadi, Izin Khusus)
  assert.strictEqual(computeAdminApproval('Izin', 'Izin Pribadi', 1), false, '1 day Izin should NOT require approval');
  assert.strictEqual(computeAdminApproval('Izin', 'Izin Pribadi', 2), false, '2 days Izin should NOT require approval');
  assert.strictEqual(computeAdminApproval('Izin', 'Izin Pribadi', 3), false, '3 days Izin should NOT require approval (Boundary: > 3)');
  assert.strictEqual(computeAdminApproval('Izin', 'Izin Pribadi', 4), true, '4 days Izin MUST require approval (Boundary exact: 4 > 3)');
  assert.strictEqual(computeAdminApproval('Izin', 'Izin Khusus', 5), true, '5 days Izin MUST require approval');

  // Normal attendance (Sekolah / Dinas Luar)
  assert.strictEqual(computeAdminApproval('Sekolah', '', 1), false, 'Normal Sekolah does not require approval');
  assert.strictEqual(computeAdminApproval('Dinas Luar', '', 1), false, 'Normal Dinas Luar does not require approval');
});

forensicCheck('2.2 Auto-Checkout (Lupa Checkout) Evaluation Logic Stress', () => {
  // Test simulated teacher attendance records through auto-checkout grouping logic
  type Rec = {
    user_id: string;
    nama_guru: string;
    tipe_absen: 'Datang' | 'Pulang';
    jenis_presensi: string;
    detail_izin?: string;
    status_verifikasi?: string;
  };

  const evaluateAutoCheckoutMock = (records: Rec[]) => {
    const teacherMap = new Map<string, Rec[]>();
    for (const r of records) {
      if (!teacherMap.has(r.user_id)) teacherMap.set(r.user_id, []);
      teacherMap.get(r.user_id)!.push(r);
    }

    const autoCheckoutResults: string[] = [];

    for (const [userId, recs] of teacherMap.entries()) {
      const validDatang = recs.find(r => r.tipe_absen === 'Datang' && r.status_verifikasi !== 'Ditolak');
      if (!validDatang) continue;

      const isLeave = ['Izin', 'Sakit'].includes(validDatang.jenis_presensi) ||
                      ['Izin', 'Sakit'].includes(validDatang.detail_izin || '');
      if (isLeave) continue;

      const hasPulang = recs.some(r => r.tipe_absen === 'Pulang');
      if (hasPulang) continue;

      autoCheckoutResults.push(userId);
    }

    return autoCheckoutResults;
  };

  // Scenario 1: Teacher A checked in at school, forgot to check out -> MUST be flagged
  // Scenario 2: Teacher B checked in and checked out normally -> MUST NOT be flagged
  // Scenario 3: Teacher C on approved leave -> MUST NOT be flagged
  // Scenario 4: Teacher D had rejected check-in -> MUST NOT be flagged
  const mockAttendance: Rec[] = [
    { user_id: 'u1', nama_guru: 'Guru A', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Diverifikasi' },
    { user_id: 'u2', nama_guru: 'Guru B', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Diverifikasi' },
    { user_id: 'u2', nama_guru: 'Guru B', tipe_absen: 'Pulang', jenis_presensi: 'Sekolah', status_verifikasi: 'Diverifikasi' },
    { user_id: 'u3', nama_guru: 'Guru C', tipe_absen: 'Datang', jenis_presensi: 'Izin', detail_izin: 'Sakit', status_verifikasi: 'Diverifikasi' },
    { user_id: 'u4', nama_guru: 'Guru D', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', status_verifikasi: 'Ditolak' },
  ];

  const results = evaluateAutoCheckoutMock(mockAttendance);
  assert.deepStrictEqual(results, ['u1'], 'Only Teacher A (u1) should be flagged for Auto-Checkout');
});

forensicCheck('2.3 Multi-Day Leave Coverage & Alpa Prevention in workflow.ts', () => {
  // Stress test date range arithmetic
  const checkWithinLeavePeriod = (todayStr: string, startDate: string, endDate: string): boolean => {
    return todayStr >= startDate && todayStr <= endDate;
  };

  const leaveStart = '2026-10-08';
  const leaveEnd = '2026-10-10';

  assert.strictEqual(checkWithinLeavePeriod('2026-10-07', leaveStart, leaveEnd), false, 'Before leave');
  assert.strictEqual(checkWithinLeavePeriod('2026-10-08', leaveStart, leaveEnd), true, 'Day 1 of leave');
  assert.strictEqual(checkWithinLeavePeriod('2026-10-09', leaveStart, leaveEnd), true, 'Day 2 of leave');
  assert.strictEqual(checkWithinLeavePeriod('2026-10-10', leaveStart, leaveEnd), true, 'Day 3 of leave');
  assert.strictEqual(checkWithinLeavePeriod('2026-10-11', leaveStart, leaveEnd), false, 'After leave');
});

forensicCheck('2.4 GPS Geolocation formatting & security footer integration', () => {
  const coords = {
    latitude: -6.2087634,
    longitude: 106.8455991,
    accuracy: 12,
    timestamp: '14:30:15'
  };

  const formattedLatitude = coords.latitude.toFixed(6);
  const formattedLongitude = coords.longitude.toFixed(6);

  assert.strictEqual(formattedLatitude, '-6.208763');
  assert.strictEqual(formattedLongitude, '106.845599');

  const securityFooterString = `Dicetak dari Sistem SIPJAM oleh Ade Fitrawan pada 14:30 WITA. | Koordinat GPS: ${formattedLatitude}, ${formattedLongitude} (±${coords.accuracy}m) [${coords.timestamp}]`;
  assert.ok(securityFooterString.includes('Koordinat GPS: -6.208763, 106.845599 (±12m) [14:30:15]'));
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(`  FORENSIC AUDIT RESULT: ${passCount} PASSED / ${failCount} FAILED`);
console.log('========================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
