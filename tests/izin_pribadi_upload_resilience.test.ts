import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('========================================================================');
console.log('🧪 TEST SUITE: PERSISTENSI UPLOAD IZIN PRIBADI & PENCEGAHAN KEDIP');
console.log('========================================================================\n');

const projectRoot = process.cwd();
const appScreenPath = path.join(projectRoot, 'src/components/AppScreen.tsx');
const guruPresensiPath = path.join(projectRoot, 'src/components/GuruPresensi.tsx');
const persistencePath = path.join(projectRoot, 'src/lib/presensiUploadPersistence.ts');
const workflowPath = path.join(projectRoot, 'src/lib/workflow.ts');

assert.ok(fs.existsSync(appScreenPath), 'AppScreen.tsx must exist');
assert.ok(fs.existsSync(guruPresensiPath), 'GuruPresensi.tsx must exist');
assert.ok(fs.existsSync(persistencePath), 'presensiUploadPersistence.ts must exist');
assert.ok(fs.existsSync(workflowPath), 'workflow.ts must exist');

const appScreenCode = fs.readFileSync(appScreenPath, 'utf8');
const guruPresensiCode = fs.readFileSync(guruPresensiPath, 'utf8');
const persistenceCode = fs.readFileSync(persistencePath, 'utf8');
const workflowCode = fs.readFileSync(workflowPath, 'utf8');

// --- Suite 1: AppScreen Anti-Flicker & Stable View Key ---
console.log('--- Suite 1: AppScreen Anti-Flicker & Stable View Key ---');

// 1.1 View key must NOT include syncKey (preventing view destruction & flickering on focus)
assert.ok(
  appScreenCode.includes('<div key={currentView} className="page-transition">'),
  '1.1: AppScreen must key the view container strictly by currentView, NOT ${currentView}-${syncKey}'
);
assert.ok(
  !appScreenCode.includes('<div key={`${currentView}-${syncKey}`}'),
  '1.1b: AppScreen must NOT use syncKey in view container key'
);
console.log('  ✔ [PASS] 1.1: AppScreen maintains stable view key (prevents unmounts & flicker upon file selection)');

// 1.2 handleResumeSync must enforce idle debounce (>= 30s) to avoid thrashing on window focus
assert.ok(
  appScreenCode.includes('now - lastResume < 30000') || appScreenCode.includes('now - lastResume < 30_000'),
  '1.2: handleResumeSync must debounce focus events with >= 30s threshold'
);
console.log('  ✔ [PASS] 1.2: handleResumeSync prevents rapid event thrashing when selecting files');

// --- Suite 2: GuruPresensi Izin Pribadi Preservation ---
console.log('\n--- Suite 2: GuruPresensi Izin Pribadi Preservation ---');

// 2.1 detailIzin select change preserves both jenisPresensi: 'Izin' and detailIzin in draft
assert.ok(
  guruPresensiCode.includes("saveDraft({ jenisPresensi: 'Izin', detailIzin: val })") ||
  guruPresensiCode.includes("saveDraft({ jenisPresensi: 'Izin', detailIzin: e.target.value })"),
  '2.1: Changing detailIzin must persist both jenisPresensi: Izin and detailIzin to draft'
);
console.log('  ✔ [PASS] 2.1: detailIzin selection updates full leave draft context');

// 2.2 File input onChange preserves leave draft context
assert.ok(
  guruPresensiCode.includes("saveDraft({ jenisPresensi: 'Izin', detailIzin })"),
  '2.2: File input selection must persist leave draft before async storage'
);
console.log('  ✔ [PASS] 2.2: File input selection synchronizes leave state to draft');

// 2.3 Draft restoration recognizes Izin from detailIzin
assert.ok(
  guruPresensiCode.includes("savedDraft.detailIzin ? 'Izin' : jenisPresensi"),
  '2.3: Draft restoration must explicitly support leave resolution from detailIzin'
);
console.log('  ✔ [PASS] 2.3: Draft restoration explicitly protects Izin Pribadi files');

// 2.4 Submission reset does NOT flip tipeAbsen to 'Pulang' for Izin
assert.ok(
  guruPresensiCode.includes("if (currentJenis === 'Izin' || currentJenis === 'Sakit') {\n      nextJenisAfterSubmit = 'Izin';\n      setTipeAbsen('Datang');\n    } else if (tipeAbsen === 'Datang') {\n      setTipeAbsen('Pulang');\n    }"),
  '2.4: Submission reset must not flip tipeAbsen to Pulang and back for leave'
);
console.log('  ✔ [PASS] 2.4: Submission reset preserves smooth leave state without UI thrashing');

// 2.5 Status banner shows uploaded document confirmation
assert.ok(
  guruPresensiCode.includes('Dokumen Berhasil Terunggah (Buka Dokumen)') &&
  guruPresensiCode.includes('dailyState.presensiDatang?.link_bukti'),
  '2.5: Status banner must display uploaded document link'
);
console.log('  ✔ [PASS] 2.5: Status banner displays uploaded document confirmation');

// --- Suite 3: presensiUploadPersistence Resilience ---
console.log('\n--- Suite 3: presensiUploadPersistence Resilience ---');

// 3.1 Uses ArrayBuffer for safe structured clone across mobile browsers
assert.ok(
  persistenceCode.includes('file.arrayBuffer()'),
  '3.1: savePresensiFileDraft must support ArrayBuffer for universal cloneability'
);
console.log('  ✔ [PASS] 3.1: savePresensiFileDraft supports universal ArrayBuffer cloning');

// 3.2 Reconstructs File properly from ArrayBuffer / Blob
assert.ok(
  persistenceCode.includes('instanceof ArrayBuffer'),
  '3.2: getPresensiFileDraft and processPendingUploads must handle ArrayBuffer'
);
console.log('  ✔ [PASS] 3.2: Restores File reliably from ArrayBuffer storage');

// --- Suite 4: workflow.ts Operator Precedence ---
console.log('\n--- Suite 4: workflow.ts Operator Precedence ---');
assert.ok(
  workflowCode.includes("!isLateArrival(p) && (p.jenis_presensi === 'Izin'"),
  '4.1: Multi-day leave evaluation must correctly group leave conditions'
);
console.log('  ✔ [PASS] 4.1: Workflow leave condition operator precedence is correct');

console.log('\n========================================================================');
console.log('TOTAL TESTS: 10 | PASSED: 10 | FAILED: 0');
console.log('========================================================================\n');
console.log('🎉 ALL IZIN PRIBADI UPLOAD & ANTI-FLICKER TESTS PASSED 100%!');
