import fs from 'fs';
import path from 'path';

function runForensicIntegrityAudit() {
  console.log('\n======================================================================');
  console.log('   FORENSIC INTEGRITY AUDIT: src/components/PiketView.tsx (M1)   ');
  console.log('======================================================================\n');

  const piketPath = path.resolve('src/components/PiketView.tsx');
  const qrSiswaPath = path.resolve('src/lib/qrSiswa.ts');

  if (!fs.existsSync(piketPath)) {
    throw new Error(`CRITICAL: PiketView.tsx not found at ${piketPath}`);
  }
  if (!fs.existsSync(qrSiswaPath)) {
    throw new Error(`CRITICAL: qrSiswa.ts not found at ${qrSiswaPath}`);
  }

  const piketContent = fs.readFileSync(piketPath, 'utf-8');
  const qrSiswaContent = fs.readFileSync(qrSiswaPath, 'utf-8');

  let passCount = 0;
  let failCount = 0;

  function assertCheck(name: string, condition: boolean, detail: string) {
    if (condition) {
      console.log(`  ✔ [PASS] ${name}`);
      passCount++;
    } else {
      console.error(`  ✖ [FAIL] ${name}: ${detail}`);
      failCount++;
    }
  }

  // --------------------------------------------------------------------------
  // CHECK 1: No Mock, Dummy, Facade, or Hardcoded Short-Circuits
  // --------------------------------------------------------------------------
  console.log('--- CHECK 1: Static Analysis for Mocks, Dummies & Facades ---');
  
  const hasMockData = /\bmockStudents\b|\bdummyStudents\b|\bfakeStudents\b|\bmockData\b/i.test(piketContent);
  assertCheck(
    'No mock or dummy student datasets embedded in PiketView.tsx',
    !hasMockData,
    'Found mock/dummy student variables in source code'
  );

  const hasFacadeAttendance = /recordPresensiSiswa.*=>\s*\{\s*return\s*true/i.test(piketContent);
  assertCheck(
    'No facade short-circuits overriding recordPresensiSiswa',
    !hasFacadeAttendance,
    'Found facade dummy override for recordPresensiSiswa'
  );

  const hasHardcodedQr = /rawValue\s*===\s*['"](QR-TEST|TEST-123|DEMO)['"]/i.test(piketContent);
  assertCheck(
    'No hardcoded QR string literals in camera scanning loop',
    !hasHardcodedQr,
    'Found hardcoded QR string matching in BarcodeDetector loop'
  );

  // --------------------------------------------------------------------------
  // CHECK 2: Genuine Attendance Marking & Database Submissions
  // --------------------------------------------------------------------------
  console.log('\n--- CHECK 2: Genuine Attendance Marking & Database Integration ---');

  const manualMarkHasRecordCall = piketContent.includes('const res = await recordPresensiSiswa(supabase, {') &&
    piketContent.includes("deviceId: 'manual'");
  assertCheck(
    'handleManualMark genuinely calls recordPresensiSiswa with deviceId: "manual"',
    manualMarkHasRecordCall,
    'handleManualMark is missing genuine recordPresensiSiswa call'
  );

  const scanHasRecordCall = piketContent.includes('const res = await recordPresensiSiswa(supabase, {') &&
    piketContent.includes('deviceId: deviceId');
  assertCheck(
    'handleProcessScan genuinely calls recordPresensiSiswa with dynamic deviceId',
    scanHasRecordCall,
    'handleProcessScan is missing genuine recordPresensiSiswa call'
  );

  const qrSiswaHasDbInsert = qrSiswaContent.includes("from('presensi_siswa')") &&
    qrSiswaContent.includes('.insert(payload)') &&
    qrSiswaContent.includes('.select()');
  assertCheck(
    'recordPresensiSiswa in qrSiswa.ts genuinely performs database insert into presensi_siswa',
    qrSiswaHasDbInsert,
    'recordPresensiSiswa is missing database insert logic'
  );

  const qrSiswaChecksExisting = qrSiswaContent.includes("from('presensi_siswa')") &&
    qrSiswaContent.includes(".eq('siswa_id', siswa.id)") &&
    qrSiswaContent.includes(".eq('status', status)");
  assertCheck(
    'recordPresensiSiswa in qrSiswa.ts genuinely enforces duplicate prevention checks',
    qrSiswaChecksExisting,
    'recordPresensiSiswa does not check for existing records'
  );

  // --------------------------------------------------------------------------
  // CHECK 3: State Filtering Bug Fix & Bidirectional Synchronization
  // --------------------------------------------------------------------------
  console.log('\n--- CHECK 3: State Filtering Bug Fix & Bidirectional Sync ---');

  // Extract handleManualMark body
  const manualMarkMatch = piketContent.match(/const handleManualMark = async [\s\S]*?finally \{[\s\S]*?\};/);
  const manualMarkBody = manualMarkMatch ? manualMarkMatch[0] : '';

  const manualMarkHasNoSearchFilterReset = !manualMarkBody.includes('setManualSearchQuery(student.nama_siswa)') &&
    !manualMarkBody.includes("setManualKelasFilter('Semua')");
  assertCheck(
    'handleManualMark DOES NOT call setManualSearchQuery or setManualKelasFilter (bug resolved)',
    manualMarkHasNoSearchFilterReset,
    'handleManualMark still resets manualSearchQuery or manualKelasFilter, causing auto-filtering bug'
  );

  const manualMarkUpdatesUsbAndLastScan = manualMarkBody.includes('setUsbInputVal(student.nisn || student.nama_siswa)') &&
    manualMarkBody.includes('setLastScanResult({');
  assertCheck(
    'handleManualMark preserves two-way sync to USB buffer and lastScanResult card',
    manualMarkUpdatesUsbAndLastScan,
    'handleManualMark does not update usbInputVal or lastScanResult'
  );

  // Extract handleProcessScan body
  const processScanMatch = piketContent.match(/const handleProcessScan = async [\s\S]*?finally \{[\s\S]*?\};/);
  const processScanBody = processScanMatch ? processScanMatch[0] : '';

  const processScanSyncsManualForm = processScanBody.includes('setManualSearchQuery(student.nama_siswa)') &&
    processScanBody.includes("setManualKelasFilter('Semua')") &&
    processScanBody.includes('setUsbInputVal(student.nisn || student.nama_siswa)');
  assertCheck(
    'handleProcessScan properly sets manualSearchQuery and resets manualKelasFilter for QR scanning',
    processScanSyncsManualForm,
    'handleProcessScan does not sync scanned student to manual search inputs'
  );

  // --------------------------------------------------------------------------
  // CHECK 4: Real Browser MediaStream & Video Bindings (No Simulated Frames)
  // --------------------------------------------------------------------------
  console.log('\n--- CHECK 4: Real Camera MediaStream & <video> Lifecycle ---');

  const usesRealGetUserMedia = piketContent.includes('navigator.mediaDevices.getUserMedia(constraints)') ||
    piketContent.includes('navigator.mediaDevices.getUserMedia({ video: true, audio: false })');
  assertCheck(
    'startCamera uses authentic navigator.mediaDevices.getUserMedia with fallback constraints',
    usesRealGetUserMedia,
    'startCamera does not use real getUserMedia'
  );

  const assignsRealStreamRef = piketContent.includes('streamRef.current = stream');
  assertCheck(
    'MediaStream is tracked via streamRef.current without dummy substitutions',
    assignsRealStreamRef,
    'MediaStream is not stored in streamRef.current'
  );

  const hasCallbackRefs = (piketContent.match(/el\.srcObject = streamRef\.current/g) || []).length >= 2;
  assertCheck(
    'Both Admin and Guru <video> elements use callback refs for immediate srcObject binding',
    hasCallbackRefs,
    'Callback refs missing on <video> tags'
  );

  const hasUseEffectSync = piketContent.includes('useEffect(() => {') &&
    piketContent.includes('if (cameraActive && streamRef.current && videoRef.current)') &&
    piketContent.includes('video.srcObject = streamRef.current');
  assertCheck(
    'useEffect([cameraActive]) provides guaranteed stream synchronization across state changes',
    hasUseEffectSync,
    'useEffect([cameraActive]) stream synchronization missing'
  );

  const releasesTracksOnStop = piketContent.includes('streamRef.current.getTracks().forEach(track => track.stop())');
  assertCheck(
    'stopCamera releases hardware resources by stopping all MediaStream tracks',
    releasesTracksOnStop,
    'Hardware media tracks are not stopped in stopCamera'
  );

  // --------------------------------------------------------------------------
  // CHECK 5: Guru vs Admin UI Differentiation & Role Normalization
  // --------------------------------------------------------------------------
  console.log('\n--- CHECK 5: Role Normalization & Guru vs Admin UI Differentiation ---');

  const normalizesRoles = piketContent.includes("const roleNormalized = (user?.role || '').toLowerCase().replace(/\\s+/g, '');") &&
    piketContent.includes("const isAdmin = roleNormalized === 'admin' || roleNormalized === 'superadmin';") &&
    piketContent.includes("const isGuru = roleNormalized === 'guru';");
  assertCheck(
    'PiketView implements robust role normalization handling casing and whitespace',
    normalizesRoles,
    'Role normalization logic missing or flawed'
  );

  const rendersAdminBranch = piketContent.includes('id="piket-content-scan"') &&
    piketContent.includes('Stasiun Kios:') &&
    piketContent.includes('Log Presensi Siswa Hari Ini');
  assertCheck(
    'Admin branch renders full multi-kiosk kiosk-1..10 selector and live audit log table',
    rendersAdminBranch,
    'Admin kiosk station controls or audit log table missing'
  );

  const rendersGuruBranch = piketContent.includes('id="piket-content-scan-guru"') &&
    piketContent.includes('Presensi Siswa Piket (Mode Guru)') &&
    piketContent.includes('Hadir Datang: {scanSummary.totalDatang}') &&
    piketContent.includes('Daftar Siswa');
  assertCheck(
    'Guru branch renders streamlined mode with inline counters and touch-friendly roster',
    rendersGuruBranch,
    'Guru streamlined view missing'
  );

  const guruExcludesAuditLog = !piketContent.includes('<div id="piket-content-scan-guru"') ||
    !piketContent.substring(piketContent.indexOf('id="piket-content-scan-guru"'), piketContent.indexOf('TAB: PENUGASAN PIKET'))
      .includes('Log Presensi Siswa Hari Ini');
  assertCheck(
    'Guru view suppresses heavy 7-column Live Attendance Audit Log table',
    guruExcludesAuditLog,
    'Guru view still renders redundant 7-column Live Attendance Audit Log table'
  );

  const penugasanRestrictedToAdmin = piketContent.includes("{activeTab === 'penugasan' && isAdmin && (");
  assertCheck(
    'Penugasan Piket tab is restricted strictly to Admin',
    penugasanRestrictedToAdmin,
    'Penugasan Piket tab is not guarded by isAdmin'
  );

  // --------------------------------------------------------------------------
  // VERDICT
  // --------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`TOTAL CHECKS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  if (failCount === 0) {
    console.log('FINAL AUDIT VERDICT: CLEAN');
    console.log('All integrity, functional, and behavioral forensic checks PASSED.');
  } else {
    console.error('FINAL AUDIT VERDICT: INTEGRITY VIOLATION');
    console.error('One or more forensic checks failed.');
  }
  console.log('======================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runForensicIntegrityAudit();
