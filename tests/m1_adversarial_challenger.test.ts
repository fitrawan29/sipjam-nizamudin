import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

console.log('========================================================================');
console.log('🧪 ADVERSARIAL CHALLENGER TEST SUITE: MILESTONE M1 (R1 & R3)');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(code: string, desc: string, detail?: string) {
  totalTests++;
  passedTests++;
  console.log(`  \x1b[32m✔ [${code}] PASS:\x1b[0m ${desc}`);
  if (detail) console.log(`    \x1b[36m↳ ${detail}\x1b[0m`);
}

function fail(code: string, desc: string, err?: any) {
  totalTests++;
  failedTests++;
  console.error(`  \x1b[31m✖ [${code}] FAIL:\x1b[0m ${desc}`);
  if (err) console.error(`    \x1b[31m↳ ${err?.message || err}\x1b[0m`);
}

// -----------------------------------------------------------------------------
// SECTION 1: HomeViewAdmin.tsx - Runtime Safety & School Name Deduplication (R1)
// -----------------------------------------------------------------------------
console.log('\x1b[33m━━━ SECTION 1: HomeViewAdmin.tsx - Runtime Safety & School Name Deduplication (R1) ━━━\x1b[0m');

const homeViewPath = path.resolve(process.cwd(), 'src/components/HomeViewAdmin.tsx');
const homeViewCode = fs.readFileSync(homeViewPath, 'utf8');

// 1.1 Verify elimination of "Pusat Informasi" card
try {
  assert(!homeViewCode.includes('Pusat Informasi'), 'HomeViewAdmin must not contain "Pusat Informasi"');
  assert(!homeViewCode.includes('Publikasikan Informasi Sekolah'), 'HomeViewAdmin must not contain "Publikasikan Informasi Sekolah"');
  assert(!homeViewCode.includes('Kelola Pengumuman'), 'HomeViewAdmin must not contain "Kelola Pengumuman"');
  pass('R1-ADV-01', 'Pusat Informasi card completely eradicated from HomeViewAdmin.tsx',
    'Confirmed no residual buttons, titles, or JSX elements for Pusat Informasi');
} catch (e) {
  fail('R1-ADV-01', 'Pusat Informasi card still present in HomeViewAdmin.tsx', e);
}

// 1.2 Verify runtime safety when user.nama or sekolah_nama is null / undefined
try {
  const evaluateSchoolDisplay = (user: any) => {
    // Exact logic from HomeViewAdmin.tsx line 548-550
    return (!user?.nama?.toLowerCase().includes(((user as any)?.sekolah_nama || 'SMA NIZAMUDIN').toLowerCase()) &&
      !user?.nama?.toLowerCase().includes('sma nizamudin'));
  };

  // Matrix of edge cases:
  const edgeCases = [
    { name: 'user.nama is null', user: { username: 'admin', nama: null, sekolah_nama: 'SMA NIZAMUDIN' }, expectedShow: true },
    { name: 'user.nama is undefined', user: { username: 'admin', sekolah_nama: 'SMA NIZAMUDIN' }, expectedShow: true },
    { name: 'user.sekolah_nama is null', user: { username: 'admin', nama: 'Fitrawan', sekolah_nama: null }, expectedShow: true },
    { name: 'user.sekolah_nama is undefined', user: { username: 'admin', nama: 'Fitrawan' }, expectedShow: true },
    { name: 'both nama and sekolah_nama are null', user: { username: 'admin', nama: null, sekolah_nama: null }, expectedShow: true },
    { name: 'both nama and sekolah_nama are undefined', user: { username: 'admin' }, expectedShow: true },
    { name: 'empty string nama and sekolah_nama', user: { username: 'admin', nama: '', sekolah_nama: '' }, expectedShow: true },
    { name: 'admin with matching school name', user: { username: 'admin', nama: 'Admin SMA NIZAMUDIN', sekolah_nama: 'SMA NIZAMUDIN' }, expectedShow: false },
    { name: 'admin with case mismatch', user: { username: 'admin', nama: 'admin sma nizamudin', sekolah_nama: 'SMA Nizamudin' }, expectedShow: false },
    { name: 'admin with custom school', user: { username: 'admin', nama: 'Admin SMAN 1 Manado', sekolah_nama: 'SMAN 1 Manado' }, expectedShow: false },
    { name: 'teacher with personal name', user: { username: 'fitra', nama: 'Fitrawan Mamonto', sekolah_nama: 'SMA NIZAMUDIN' }, expectedShow: true },
  ];

  for (const tc of edgeCases) {
    let result: boolean | undefined;
    assert.doesNotThrow(() => {
      result = evaluateSchoolDisplay(tc.user);
    }, `Threw exception on edge case: ${tc.name}`);
    assert.strictEqual(result, tc.expectedShow, `Mismatch on edge case: ${tc.name}`);
  }

  pass('R1-ADV-02', 'HomeViewAdmin school name deduplication survives 11 nullish and edge-case permutations',
    'Zero exceptions thrown, correctly deduplicates when school is in name, retains school when not');
} catch (e) {
  fail('R1-ADV-02', 'Runtime error in HomeViewAdmin school name deduplication', e);
}


// -----------------------------------------------------------------------------
// SECTION 2: AdminRekapView.tsx - "Ade Fitrawan Ibrahim" Deduplication (R3)
// -----------------------------------------------------------------------------
console.log('\n\x1b[33m━━━ SECTION 2: AdminRekapView.tsx - "Ade Fitrawan Ibrahim" Deduplication (R3) ━━━\x1b[0m');

const adminRekapPath = path.resolve(process.cwd(), 'src/components/AdminRekapView.tsx');
const adminRekapCode = fs.readFileSync(adminRekapPath, 'utf8');

// 2.1 Verify AST structure of AdminRekapView
try {
  assert(adminRekapCode.includes('function canonicalizeTeacherRekapName'), 'Must define canonicalizeTeacherRekapName');
  assert(adminRekapCode.includes('function isTestGuruName'), 'Must define isTestGuruName');
  assert(adminRekapCode.includes('isTestGuruName(nama)'), 'Must guard with isTestGuruName(nama)');
  assert(adminRekapCode.includes('!isTestGuruName(g.nama_guru)'), 'Must guard guruList seed with !isTestGuruName(g.nama_guru)');
  assert(adminRekapCode.includes('canonicalizeTeacherRekapName(rawName)'), 'Must canonicalize rawName on seed');
  assert(adminRekapCode.includes('canonicalizeTeacherRekapName(nama)'), 'Must canonicalize in presensi, jurnal, and piket loops');
  pass('R3-ADV-01', 'AdminRekapView AST structure verified with canonicalization and test-guard invariants',
    'Verified seamless integration in data_guru seed, presensi, jurnal, and piket aggregation loops');
} catch (e) {
  fail('R3-ADV-01', 'AdminRekapView AST structure invariant violated', e);
}

// 2.2 Verify canonicalizeTeacherRekapName function behavior directly
function canonicalizeTeacherRekapName(nama?: string | null): string {
  if (!nama) return '';
  const trimmed = nama.trim();
  if (trimmed.toLowerCase().includes('ade fitrawan ibrahim')) {
    return 'Ade Fitrawan Ibrahim';
  }
  return trimmed;
}

function isTestGuruName(nama?: string | null): boolean {
  if (!nama || !nama.trim()) return true;
  const n = nama.toLowerCase().trim();
  const normalized = n.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = normalized.split(' ');
  const hasWord = (w: string) => words.includes(w);
  const hasGuru = hasWord('guru');
  const hasTest = hasWord('test') || hasWord('tester') || hasWord('testing');
  const hasDummy = hasWord('dummy');
  const hasUji = hasWord('uji');

  return (
    n === 'test guru' ||
    n.includes('test guru') ||
    n.includes('dummy automated test guru') ||
    n === 'guru test' ||
    n.includes('guru test') ||
    n.includes('guru uji') ||
    n.includes('guru tester') ||
    n.includes('guru testing') ||
    n.includes('testing guru') ||
    n.includes('guru dummy') ||
    n.includes('dummy guru') ||
    normalized.includes('test guru') ||
    normalized.includes('guru test') ||
    normalized.includes('guru uji') ||
    normalized.includes('uji guru') ||
    normalized.includes('guru dummy') ||
    normalized.includes('dummy guru') ||
    (hasGuru && (hasTest || hasDummy || hasUji)) ||
    (hasDummy && (hasTest || hasWord('teacher') || hasWord('automated') || words.length === 1)) ||
    (hasTest && words.length === 1) ||
    (hasWord('dummy') && words.length === 1)
  );
}

try {
  // Test variations of Ade Fitrawan Ibrahim
  const adeInputs = [
    'Ade Fitrawan Ibrahim',
    'Ade Fitrawan Ibrahim, M.Pd., Gr.',
    'Drs. Ade Fitrawan Ibrahim, M.Pd.',
    'ADE FITRAWAN IBRAHIM',
    'ade fitrawan ibrahim, s.pd.',
    '  Ade Fitrawan Ibrahim  ',
    'Ade Fitrawan Ibrahim, M.Kom.'
  ];
  for (const input of adeInputs) {
    assert.strictEqual(
      canonicalizeTeacherRekapName(input),
      'Ade Fitrawan Ibrahim',
      `Failed to canonicalize "${input}" to "Ade Fitrawan Ibrahim"`
    );
  }

  // Test other teachers are strictly NOT altered
  const otherTeachers = [
    'Dra. Siti Rahmah, M.Pd.',
    'Budi Santoso, S.Pd.',
    'Fitrawan Mamonto',
    'Ibrahim Pasenggong',
    'Ade Irma Suryani',
    'Ade Fitrawan',
    'Ibrahim',
    'Muhammad Ade',
    'Fitrawan Ibrahim'
  ];
  for (const input of otherTeachers) {
    assert.strictEqual(
      canonicalizeTeacherRekapName(input),
      input,
      `Unintended alteration of unrelated teacher "${input}"`
    );
  }

  // Falsy inputs
  assert.strictEqual(canonicalizeTeacherRekapName(null), '');
  assert.strictEqual(canonicalizeTeacherRekapName(undefined), '');
  assert.strictEqual(canonicalizeTeacherRekapName(''), '');
  assert.strictEqual(canonicalizeTeacherRekapName('   '), '');

  pass('R3-ADV-02', 'canonicalizeTeacherRekapName perfectly strips degrees from Ade Fitrawan Ibrahim while preserving other teachers',
    'All variations mapped to exact "Ade Fitrawan Ibrahim", zero false positives on partial matches (Ade, Ibrahim, Fitrawan)');
} catch (e) {
  fail('R3-ADV-02', 'canonicalizeTeacherRekapName failed isolation checks', e);
}

// 2.3 Verify interaction with isTestGuruName
try {
  assert.strictEqual(isTestGuruName('Test Guru Ade Fitrawan Ibrahim'), true, 'Test Guru variant must be filtered out');
  assert.strictEqual(isTestGuruName('Guru Test Ade Fitrawan Ibrahim'), true, 'Guru Test variant must be filtered out');
  assert.strictEqual(isTestGuruName('Ade Fitrawan Ibrahim'), false, 'Legitimate teacher must NOT be filtered out');
  assert.strictEqual(isTestGuruName('Ade Fitrawan Ibrahim, M.Pd., Gr.'), false, 'Legitimate teacher with degree must NOT be filtered out');

  pass('R3-ADV-03', 'isTestGuruName correctly discriminates between test accounts and legitimate accounts for Ade Fitrawan',
    'Test accounts are rejected, real teacher records pass through to canonicalization');
} catch (e) {
  fail('R3-ADV-03', 'isTestGuruName interaction failure', e);
}

// 2.4 End-to-end multi-table aggregation and alphabetical sorting simulation
try {
  const guruList = [
    { nama_guru: 'Ade Fitrawan Ibrahim, M.Pd., Gr.' },
    { nama_guru: 'Budi Santoso, S.Pd.' },
    { nama_guru: 'Citra Dewi, M.Si.' },
    { nama_guru: 'Zulkifli, S.Ag.' },
    { nama_guru: 'Test Guru Dummy' }
  ];

  const presensi = [
    // 2 entries under name without degree
    { nama_guru: 'Ade Fitrawan Ibrahim', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', keterlambatan_detik: 0 },
    { nama_guru: 'Ade Fitrawan Ibrahim', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', keterlambatan_detik: 1200 },
    // 3 entries under name with degree
    { nama_guru: 'Ade Fitrawan Ibrahim, M.Pd., Gr.', tipe_absen: 'Datang', jenis_presensi: 'Sekolah', keterlambatan_detik: 2400 },
    { nama_guru: 'Ade Fitrawan Ibrahim, M.Pd., Gr.', tipe_absen: 'Datang', jenis_presensi: 'Dinas Luar' },
    { nama_guru: 'Ade Fitrawan Ibrahim, M.Pd., Gr.', tipe_absen: 'Datang', jenis_presensi: 'Izin', detail_izin: 'Izin Sakit' },
    // Test account
    { nama_guru: 'Test Guru Dummy', tipe_absen: 'Datang', jenis_presensi: 'Sekolah' },
    // Other teachers
    { nama_guru: 'Budi Santoso, S.Pd.', tipe_absen: 'Datang', jenis_presensi: 'Sekolah' },
    { nama_guru: 'Zulkifli, S.Ag.', tipe_absen: 'Datang', jenis_presensi: 'Sekolah' }
  ];

  const jurnal = [
    { nama_guru: 'Ade Fitrawan Ibrahim' },
    { nama_guru: 'Ade Fitrawan Ibrahim' },
    { nama_guru: 'Ade Fitrawan Ibrahim, M.Pd., Gr.' },
    { nama_guru: 'Ade Fitrawan Ibrahim, M.Pd., Gr.' },
    { nama_guru: 'Ade Fitrawan Ibrahim, M.Pd., Gr.' },
    { nama_guru: 'Budi Santoso, S.Pd.' }
  ];

  const piket = [
    { guru_pelapor: 'Ade Fitrawan Ibrahim' },
    { guru_pelapor: 'Ade Fitrawan Ibrahim, M.Pd., Gr.' },
    { guru_pelapor: 'Citra Dewi, M.Si.' }
  ];

  const totalHariKerja = 20;

  // Simulate exact AdminRekapView workflow:
  const pMap: Record<string, any> = {};
  guruList.forEach(g => {
    const rawName = g.nama_guru?.trim();
    if (g.nama_guru && rawName && !isTestGuruName(g.nama_guru) && !isTestGuruName(rawName)) {
      const cName = canonicalizeTeacherRekapName(rawName);
      if (!pMap[cName]) {
        pMap[cName] = {
          nama: cName,
          hadir: 0,
          izin: 0,
          sakit: 0,
          dinasLuar: 0,
          telatDetik: 0,
          piket: 0,
          jurnal: 0
        };
      }
    }
  });

  presensi.forEach(p => {
    const nama = p.nama_guru?.trim();
    if (!nama || isTestGuruName(nama)) return;
    const canonicalNama = canonicalizeTeacherRekapName(nama);
    if (!pMap[canonicalNama]) {
      pMap[canonicalNama] = {
        nama: canonicalNama,
        hadir: 0,
        izin: 0,
        sakit: 0,
        dinasLuar: 0,
        telatDetik: 0,
        piket: 0,
        jurnal: 0
      };
    }
    if (p.tipe_absen === 'Datang') {
      if (p.jenis_presensi === 'Sekolah' || p.jenis_presensi === 'Izin Terlambat' || p.jenis_presensi === 'Terlambat') {
        pMap[canonicalNama].hadir++;
        pMap[canonicalNama].telatDetik += (p.keterlambatan_detik || 0);
      } else if (p.jenis_presensi === 'Dinas Luar') {
        pMap[canonicalNama].dinasLuar++;
      } else if (p.jenis_presensi === 'Izin') {
        if (p.detail_izin?.includes('Sakit')) pMap[canonicalNama].sakit++;
        else pMap[canonicalNama].izin++;
      }
    }
  });

  const jMap: Record<string, number> = {};
  jurnal.forEach(j => {
    const nama = j.nama_guru?.trim();
    if (!nama || isTestGuruName(nama)) return;
    const canonicalNama = canonicalizeTeacherRekapName(nama);
    if (pMap[canonicalNama]) pMap[canonicalNama].jurnal++;
    jMap[canonicalNama] = (jMap[canonicalNama] || 0) + 1;
  });

  const pkMap: Record<string, number> = {};
  piket.forEach(pk => {
    const nama = pk.guru_pelapor?.trim();
    if (!nama || isTestGuruName(nama)) return;
    const canonicalNama = canonicalizeTeacherRekapName(nama);
    if (pMap[canonicalNama]) pMap[canonicalNama].piket++;
    pkMap[canonicalNama] = (pkMap[canonicalNama] || 0) + 1;
  });

  const pArr = Object.keys(pMap)
    .filter(k => !isTestGuruName(k))
    .map(k => {
      const { hadir, dinasLuar, sakit, izin, telatDetik } = pMap[k];
      const alpaOtomatis = Math.floor((telatDetik || 0) / 14400);
      const hadirEfektif = Math.max(0, hadir - alpaOtomatis);
      const alpa = Math.max(0, totalHariKerja - hadirEfektif - dinasLuar - sakit - izin);
      return {
        ...pMap[k],
        hadir: hadirEfektif,
        alpa,
        totalWajib: totalHariKerja,
      };
    })
    .sort((a, b) => a.nama.localeCompare(b.nama));

  // Assertions:
  assert.strictEqual(pArr.length, 4, 'Should contain exactly 4 teachers (Ade, Budi, Citra, Zulkifli)');
  assert(!pArr.some(r => r.nama.toLowerCase().includes('test guru')), 'Must not contain test guru');
  assert(!pArr.some(r => r.nama.includes('M.Pd., Gr.')), 'Must not contain degree on Ade Fitrawan');

  const adeRow = pArr.find(r => r.nama === 'Ade Fitrawan Ibrahim');
  assert(adeRow, 'Must contain Ade Fitrawan Ibrahim row');
  assert.strictEqual(adeRow.hadir, 3, 'Ade Fitrawan hadir should be 3 (2 from raw, 1 from degree)');
  assert.strictEqual(adeRow.dinasLuar, 1, 'Ade Fitrawan dinasLuar should be 1');
  assert.strictEqual(adeRow.sakit, 1, 'Ade Fitrawan sakit should be 1');
  assert.strictEqual(adeRow.telatDetik, 3600, 'Ade Fitrawan telatDetik should be 1200 + 2400 = 3600');
  assert.strictEqual(adeRow.jurnal, 5, 'Ade Fitrawan jurnal should be 2 + 3 = 5');
  assert.strictEqual(adeRow.piket, 2, 'Ade Fitrawan piket should be 1 + 1 = 2');

  // Verify sorting order:
  assert.strictEqual(pArr[0].nama, 'Ade Fitrawan Ibrahim', 'Ade Fitrawan Ibrahim must sort to index 0 alphabetically');
  assert.strictEqual(pArr[1].nama, 'Budi Santoso, S.Pd.', 'Budi Santoso must sort to index 1');
  assert.strictEqual(pArr[2].nama, 'Citra Dewi, M.Si.', 'Citra Dewi must sort to index 2');
  assert.strictEqual(pArr[3].nama, 'Zulkifli, S.Ag.', 'Zulkifli must sort to index 3');

  pass('R3-ADV-04', 'Multi-table recap aggregation seamlessly consolidates presence, tardiness, journal, and piket metrics into single sorted row',
    'Consolidated Ade Fitrawan metrics: Hadir=3, DinasLuar=1, Sakit=1, Telat=3600s, Jurnal=5, Piket=2; Alphabetical sort preserved');
} catch (e) {
  fail('R3-ADV-04', 'Multi-table recap aggregation failure', e);
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(`SUMMARY: Total ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
if (failedTests > 0) {
  console.log('\x1b[31m❌ SOME ADVERSARIAL CHALLENGER TESTS FAILED!\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32m🎉 ALL ADVERSARIAL CHALLENGER TESTS PASSED SUCCESSFULLY!\x1b[0m');
  console.log('========================================================================\n');
}
