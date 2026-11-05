import fs from 'fs';
import path from 'path';
import { extractTingkat } from '../src/components/DokumenView';
import { autoFillKbmJournalsForLeave, evaluateAndApplyAutoAlpa, recordUnfilledJournalsAndPiket } from '../src/lib/attendanceAlpa';

let passed = 0;
let failed = 0;
const findings: string[] = [];

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${label}`);
    if (detail) console.error(`     ${detail}`);
    failed++;
    findings.push(`${label}: ${detail || 'Condition false'}`);
  }
}

const root = path.resolve(__dirname, '..');
const dokumenViewPath = path.join(root, 'src', 'components', 'DokumenView.tsx');
const adminVerifPath = path.join(root, 'src', 'components', 'AdminVerifView.tsx');
const guruPresensiPath = path.join(root, 'src', 'components', 'GuruPresensi.tsx');
const rekapJurnalPath = path.join(root, 'src', 'components', 'RekapJurnalView.tsx');
const attendanceAlpaPath = path.join(root, 'src', 'lib', 'attendanceAlpa.ts');

const dokumenCode = fs.readFileSync(dokumenViewPath, 'utf8');
const adminVerifCode = fs.readFileSync(adminVerifPath, 'utf8');
const guruPresensiCode = fs.readFileSync(guruPresensiPath, 'utf8');
const rekapJurnalCode = fs.readFileSync(rekapJurnalPath, 'utf8');
const attendanceAlpaCode = fs.readFileSync(attendanceAlpaPath, 'utf8');

console.log('========================================================================');
console.log('🧪 EMPIRICAL ADVERSARIAL CHALLENGER VERIFICATION: MILESTONE M2');
console.log('========================================================================');

// ============================================================================
// TASK 1: Verify DokumenView.tsx isReadOnly and RBAC Preservation
// ============================================================================
console.log('\n--- TASK 1: DokumenView.tsx isReadOnly & RBAC Preservation ---');

// 1.1 Props interface & default prop
assert(
  /isReadOnly\?:\s*boolean;/.test(dokumenCode),
  'DokumenViewProps defines optional isReadOnly boolean property'
);
assert(
  /export\s+default\s+function\s+DokumenView\(\s*\{\s*user,\s*isReadOnly\s*=\s*false\s*\}\s*:\s*DokumenViewProps\)/.test(dokumenCode),
  'DokumenView default parameter defaults isReadOnly to false'
);

// 1.2 Handlers guard against isReadOnly
const readOnlyGuardedHandlers = [
  { name: 'handleOpenAddSyarat', regex: /const\s+handleOpenAddSyarat\s*=\s*\(\)\s*=>\s*\{\s*if\s*\(\s*isReadOnly\s*\)\s*return;/ },
  { name: 'handleOpenEditSyarat', regex: /const\s+handleOpenEditSyarat\s*=\s*\([^)]*\)\s*=>\s*\{\s*if\s*\(\s*isReadOnly\s*\)\s*return;/ },
  { name: 'handleSaveSyarat', regex: /const\s+handleSaveSyarat\s*=\s*async\s*\([^)]*\)\s*=>\s*\{\s*[^}]*if\s*\(\s*isReadOnly\s*\)\s*return;/ },
  { name: 'handleDeleteSyarat', regex: /const\s+handleDeleteSyarat\s*=\s*async\s*\([^)]*\)\s*=>\s*\{\s*if\s*\(\s*isReadOnly\s*\)\s*return;/ },
  { name: 'handleVerifyDokumen', regex: /const\s+handleVerifyDokumen\s*=\s*async\s*\([^)]*\)\s*=>\s*\{\s*if\s*\(\s*isReadOnly\s*\)\s*\{\s*Swal\.fire/ }
];

for (const handler of readOnlyGuardedHandlers) {
  assert(
    handler.regex.test(dokumenCode),
    `Mutative action ${handler.name} strictly blocks execution when isReadOnly is true`
  );
}

// 1.3 UI elements rendered conditionally on isReadOnly
assert(
  dokumenCode.includes('{isAdmin && !isReadOnly && ('),
  'DokumenView renders admin action buttons only when !isReadOnly'
);
assert(
  dokumenCode.includes('{isAdmin && isReadOnly && ('),
  'DokumenView renders read-only badge notice when isReadOnly is true'
);

// 1.4 RBAC: Admin vs Non-admin Role Separation
assert(
  /const\s+normRole\s*=\s*\(user\?\.role\s*\|\|\s*''\)\.toLowerCase\(\)\.replace\(\/\[\\s_-\]\+\/g,\s*''\);/.test(dokumenCode),
  'DokumenView normalizes user role cleanly'
);
assert(
  /const\s+isAdmin\s*=\s*normRole\s*===\s*'admin'\s*\|\|\s*normRole\s*===\s*'superadmin';/.test(dokumenCode),
  'DokumenView strictly limits isAdmin to admin and superadmin roles'
);
assert(
  dokumenCode.includes("const [activeTab, setActiveTab] = useState<'matrix' | 'syarat' | 'list' | 'upload'>(isAdmin ? 'matrix' : 'list');"),
  'Initial tab assignment is RBAC partitioned (Admin -> matrix, Non-admin -> list)'
);
assert(
  /if\s*\(!isAdmin\s*&&\s*user\?\.nama\)\s*\{\s*docQuery\s*=\s*docQuery\.eq\('nama_guru',\s*user\.nama\);/.test(dokumenCode),
  'Teacher data fetching query strictly restricts to teacher own nama_guru when !isAdmin'
);

// 1.5 extractTingkat Normalization & Stress Tests
console.log('\n--- 1.5 extractTingkat Normalization Tests ---');
const standardTingkatCases: [string, string][] = [
  ['X Merdeka 1', 'X'],
  ['X-1', 'X'],
  ['Kelas 10 Merdeka', 'X'],
  ['XI Merdeka 2', 'XI'],
  ['11 IPA 1', 'XI'],
  ['XI-B', 'XI'],
  ['XII IPA 1', 'XII'],
  ['12 IPS 2', 'XII'],
  ['XII-TKJ', 'XII'],
  ['VII-A', 'VII'],
  ['VIII-1', 'VIII'],
  ['8.2', 'VIII'],
  ['IX-C', 'IX']
];

for (const [input, expected] of standardTingkatCases) {
  const result = extractTingkat(input);
  assert(
    result === expected,
    `Standard format: extractTingkat("${input}") === "${expected}"`
  );
}

// 1.6 Adversarial Edge Case: Unspaced digit+letter class names (e.g. "10A", "7B")
console.log('\n--- 1.6 extractTingkat Adversarial Boundary Cases ---');
const unspacedCases: [string, string][] = [
  ['10A', 'X'],
  ['10B', 'X'],
  ['11A', 'XI'],
  ['12A', 'XII'],
  ['7A', 'VII'],
  ['7B', 'VII'],
  ['8A', 'VIII'],
  ['9A', 'IX'],
  ['1A', '1']
];

let unspacedFailureCount = 0;
for (const [input, expected] of unspacedCases) {
  const result = extractTingkat(input);
  const match = result === expected;
  if (!match) {
    unspacedFailureCount++;
    console.warn(`  ⚠️ [EDGE CASE FLAW] extractTingkat("${input}") returned "${result}" instead of expected "${expected}"`);
  }
}

assert(
  unspacedFailureCount === 0,
  'extractTingkat handles unspaced alphanumeric class names (e.g. "10A", "7B") as documented in JSDoc',
  `Failed ${unspacedFailureCount} of ${unspacedCases.length} edge cases due to \\b word boundary not matching between digits and letters`
);

// ============================================================================
// TASK 2: Verify Presensi, Piket, and Journal Tests Pass Without Regression
// ============================================================================
console.log('\n--- TASK 2: Regression Verification ---');
assert(
  attendanceAlpaCode.includes('export async function autoFillKbmJournalsForLeave'),
  'attendanceAlpa exports autoFillKbmJournalsForLeave'
);
assert(
  attendanceAlpaCode.includes('export async function recordUnfilledJournalsAndPiket'),
  'attendanceAlpa exports recordUnfilledJournalsAndPiket'
);
assert(
  attendanceAlpaCode.includes('export async function evaluateAndApplyAutoAlpa'),
  'attendanceAlpa exports evaluateAndApplyAutoAlpa'
);
assert(
  adminVerifCode.includes("status_verifikasi: 'tidak membuat laporan piket'"),
  'AdminVerifView assigns "tidak membuat laporan piket" directly to unsubmitted piket'
);
assert(
  adminVerifCode.includes('isFreeFromPresence'),
  'AdminVerifView implements isFreeFromPresence for KBM teachers without duty today'
);

// ============================================================================
// TASK 3: Test Edge Case: Teacher Multi-day Leave vs Single-day Leave
// ============================================================================
console.log('\n--- TASK 3: Multi-day Leave vs Single-day Leave Edge Case ---');

// 3.1 GuruPresensi loop behavior verification
assert(
  guruPresensiCode.includes('const daysCount = durasiHari || 1;'),
  'GuruPresensi safely falls back to daysCount = 1 when durasiHari is falsy'
);
assert(
  guruPresensiCode.includes('for (let dayOffset = 0; dayOffset < daysCount; dayOffset++) {'),
  'GuruPresensi iterates through each day of multi-day leave span'
);
assert(
  guruPresensiCode.includes('const targetD = addDaysToDateStr(startD, dayOffset);'),
  'GuruPresensi computes discrete target date for each day in span'
);

// 3.2 Empirical Mock Testing of autoFillKbmJournalsForLeave
async function runLeaveHarness() {
  const mockInsertedJournals: any[] = [];

  const mockClient = {
    from: (table: string) => {
      if (table === 'jadwal_pelajaran') {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              eq: (col2: string, val2: string) => {
                let schedules: any[] = [];
                if (val === 'Kamis') {
                  schedules = [
                    { id: 'sch-1', hari: 'Kamis', mata_pelajaran: 'Matematika', kelas: 'X Merdeka 1', jam_ke: '1-2', jam_mulai: '07:30', jam_selesai: '09:00', nama_guru: 'Budi Santoso', sekolah_id: 'sch-001' },
                    { id: 'sch-2', hari: 'Kamis', mata_pelajaran: 'Matematika', kelas: 'X Merdeka 2', jam_ke: '3-4', jam_mulai: '09:15', jam_selesai: '10:45', nama_guru: 'Budi Santoso', sekolah_id: 'sch-001' }
                  ];
                } else if (val === 'Jumat') {
                  schedules = [
                    { id: 'sch-3', hari: 'Jumat', mata_pelajaran: 'Matematika', kelas: 'XI Merdeka 1', jam_ke: '1-2', jam_mulai: '07:30', jam_selesai: '08:50', nama_guru: 'Budi Santoso', sekolah_id: 'sch-001' }
                  ];
                }
                return Promise.resolve({ data: schedules, error: null });
              }
            })
          })
        };
      }
      if (table === 'jurnal_pembelajaran') {
        return {
          select: () => ({
            eq: (col: string, val: string) => ({
              eq: (col2: string, val2: string) => {
                const matched = mockInsertedJournals.filter(j => j.tanggal === val);
                return Promise.resolve({ data: matched, error: null });
              }
            })
          }),
          insert: (records: any) => {
            const arr = Array.isArray(records) ? records : [records];
            mockInsertedJournals.push(...arr);
            return Promise.resolve({ error: null });
          }
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    }
  };

  const testTeacher = { nama_guru: 'Budi Santoso', user_id: 'usr-budi', sekolah_id: 'sch-001' };

  // SCENARIO A: Single-Day Leave (Kamis: 2026-11-05)
  console.log('\n--- Scenario A: Single-Day Leave (1 Day: 2026-11-05, Kamis) ---');
  mockInsertedJournals.length = 0; // reset
  const countSingle = await autoFillKbmJournalsForLeave(
    testTeacher,
    '2026-11-05',
    'Sakit',
    { detail_izin: 'Demam tinggi', keterangan: 'Istirahat dokter', link_bukti: 'http://drive/surat.pdf' },
    mockClient
  );

  assert(countSingle === 2, `Single-day leave auto-filled exactly 2 scheduled KBM journals on Kamis (got ${countSingle})`);
  assert(mockInsertedJournals.length === 2, 'Exactly 2 records recorded in mock database');
  assert(
    mockInsertedJournals.every(j => j.status_verifikasi === 'Sakit' && j.materi === 'Sakit' && j.tanggal === '2026-11-05'),
    'All auto-filled single-day journals have status_verifikasi="Sakit", materi="Sakit", tanggal="2026-11-05"'
  );
  assert(
    mockInsertedJournals[0].foto_kegiatan === 'http://drive/surat.pdf',
    'Presensi medical certificate link is passed to auto-filled journal foto_kegiatan'
  );

  // Idempotency: Calling single-day auto-fill again on the same day must insert 0 duplicates
  const countRepeat = await autoFillKbmJournalsForLeave(
    testTeacher,
    '2026-11-05',
    'Sakit',
    { detail_izin: 'Demam tinggi' },
    mockClient
  );
  assert(countRepeat === 0, `Re-running autoFill on already filled day inserts 0 duplicates (got ${countRepeat})`);
  assert(mockInsertedJournals.length === 2, 'Total inserted journals remains 2');

  // SCENARIO B: Multi-Day Leave (3 Days: Kamis 2026-11-05 to Sabtu 2026-11-07)
  console.log('\n--- Scenario B: Multi-Day Leave (3 Days: 2026-11-05 to 2026-11-07) ---');
  mockInsertedJournals.length = 0; // reset
  const multiDates = ['2026-11-05', '2026-11-06', '2026-11-07']; // Kamis, Jumat, Sabtu
  const countsPerDay: number[] = [];

  for (const d of multiDates) {
    const c = await autoFillKbmJournalsForLeave(
      testTeacher,
      d,
      'Izin',
      { detail_izin: 'Izin Keluarga', keterangan: 'Acara keluarga di luar kota' },
      mockClient
    );
    countsPerDay.push(c);
  }

  assert(countsPerDay[0] === 2, `Day 1 (Kamis): 2 KBM classes auto-filled (got ${countsPerDay[0]})`);
  assert(countsPerDay[1] === 1, `Day 2 (Jumat): 1 KBM class auto-filled (got ${countsPerDay[1]})`);
  assert(countsPerDay[2] === 0, `Day 3 (Sabtu): 0 classes scheduled -> 0 KBM journals created (got ${countsPerDay[2]})`);
  assert(mockInsertedJournals.length === 3, 'Total 3 journals inserted across the 3-day span');

  const kamisJournals = mockInsertedJournals.filter(j => j.tanggal === '2026-11-05');
  const jumatJournals = mockInsertedJournals.filter(j => j.tanggal === '2026-11-06');
  assert(kamisJournals.length === 2, 'Kamis has 2 journals');
  assert(jumatJournals.length === 1, 'Jumat has 1 journal');
  assert(
    mockInsertedJournals.every(j => j.status_verifikasi === 'Izin' && j.catatan_admin.includes('Izin')),
    'All multi-day auto-filled journals have status_verifikasi="Izin" and informative admin note'
  );

  // SCENARIO C: Multi-Day Leave Spanning Sunday (Minggu)
  console.log('\n--- Scenario C: Multi-Day Leave Spanning Sunday (2026-11-08, Minggu) ---');
  const countSunday = await autoFillKbmJournalsForLeave(
    testTeacher,
    '2026-11-08',
    'Sakit',
    { detail_izin: 'Sakit' },
    mockClient
  );
  assert(countSunday === 0, `Sunday auto-fill cleanly aborts and generates 0 journals (got ${countSunday})`);

  // SCENARIO D: Teacher Protection from Alpa on Multi-Day Leave in attendanceAlpa
  console.log('\n--- Scenario D: Multi-Day Protection from Alpa Evaluation ---');
  assert(
    attendanceAlpaCode.includes('rec.tanggal_mulai && rec.tanggal_selesai'),
    'evaluateAndApplyAutoAlpa checks rec.tanggal_mulai and rec.tanggal_selesai'
  );
  assert(
    attendanceAlpaCode.includes('evaluatedDate >= rec.tanggal_mulai && evaluatedDate <= rec.tanggal_selesai'),
    'evaluateAndApplyAutoAlpa validates active multi-day span (evaluatedDate >= tanggal_mulai && evaluatedDate <= tanggal_selesai)'
  );
  assert(
    attendanceAlpaCode.includes('const hasActiveMultiDay = activeMultiDayLeaves.some'),
    'evaluateAndApplyAutoAlpa identifies active multi-day leaves per teacher'
  );
  assert(
    attendanceAlpaCode.includes('if (hasApprovedLeave || hasActiveMultiDay) {\n      continue; // Protected from Alpa\n    }'),
    'Teachers with active multi-day leaves are strictly protected from Alpa conversion'
  );

  // SCENARIO E: AdminVerifView Multi-Day Presensi Filtering
  console.log('\n--- Scenario E: AdminVerifView Multi-Day Presensi Query & Filtering ---');
  // Check how AdminVerifView filters submitted presensi in displayList / submittedList
  const checksMultiDaySpanInAdminVerif = adminVerifCode.includes('tanggal_mulai') &&
    adminVerifCode.includes('tanggal_selesai') &&
    /targetDate\s*>=\s*p\.tanggal_mulai\s*&&\s*targetDate\s*<=\s*p\.tanggal_selesai/.test(adminVerifCode);

  assert(
    checksMultiDaySpanInAdminVerif,
    'AdminVerifView submittedList checks multi-day date span (targetDate >= p.tanggal_mulai && targetDate <= p.tanggal_selesai)',
    'AdminVerifView line 477 filters strictly by p.timestamp.includes(targetDate), which fails to recognize active multi-day leave on subsequent days (Day 2, Day 3)'
  );
}

// ============================================================================
// TASK 4: Verify Absence of SOP Button in AdminVerifView.tsx DOM
// ============================================================================
console.log('\n--- TASK 4: Absence of SOP Button in AdminVerifView.tsx DOM ---');

// 4.1 Check that "SOP Disiplin" button was eliminated from JSX DOM
const hasSopButtonRegex = /<button[^>]*>[^<]*SOP\s*Disiplin[^<]*<\/button>/i;
assert(!hasSopButtonRegex.test(adminVerifCode), 'AdminVerifView.tsx contains NO rendered <button> with text "SOP Disiplin"');

// 4.2 Check that "Pedoman Kebijakan" button was eliminated
const hasPedomanButtonRegex = /<button[^>]*>[^<]*Pedoman\s*Kebijakan[^<]*<\/button>/i;
assert(!hasPedomanButtonRegex.test(adminVerifCode), 'AdminVerifView.tsx contains NO rendered <button> with text "Pedoman Kebijakan"');

// 4.3 Check title attribute referencing SOP in buttons
const hasSopTitleButton = /<button[^>]*title\s*=\s*["'][^"']*(?:SOP|Regulasi|Konsekuensi)[^"']*["']/i;
assert(!hasSopTitleButton.test(adminVerifCode), 'AdminVerifView.tsx contains NO <button> referencing SOP in title attribute');

// 4.4 Check that header action area contains only the reload button
const headerAreaMatch = adminVerifCode.match(/<div className="flex justify-between items-center mb-4">([\s\S]*?)<\/div>\s*<\/div>/);
assert(!!headerAreaMatch, 'Found AdminVerifView header JSX block');
if (headerAreaMatch) {
  const headerContent = headerAreaMatch[1];
  const buttonsInHeader = headerContent.match(/<button[\s\S]*?<\/button>/g) || [];
  assert(buttonsInHeader.length === 1, `Header block contains exactly 1 button (got ${buttonsInHeader.length})`);
  assert(buttonsInHeader[0]?.includes('onClick={loadData}'), 'The single header button is the loadData reload button');
  assert(!buttonsInHeader[0]?.includes('SOP'), 'The single header button does not mention SOP');
}

// 4.5 Check that comment acknowledging R2 SOP button removal exists
assert(
  adminVerifCode.includes('Eliminasi tampilan tombol Pedoman Kebijakan & SOP SIPJAM'),
  'AdminVerifView.tsx retains JSX explanation comment documenting removal per R2 specification'
);

// Execute async harness
runLeaveHarness().then(() => {
  console.log('\n========================================================================');
  console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================');
  if (findings.length > 0) {
    console.log('\nEmpirical Findings:');
    findings.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));
  }
  if (failed > 0) {
    process.exit(1);
  }
}).catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
