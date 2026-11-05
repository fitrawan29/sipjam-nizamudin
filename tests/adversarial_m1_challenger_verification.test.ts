import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${label}`);
    if (detail) console.error(`     ${detail}`);
    failed++;
  }
}

const root = path.resolve(__dirname, '..');
const homeAdminPath = path.join(root, 'src', 'components', 'HomeViewAdmin.tsx');
const adminRekapPath = path.join(root, 'src', 'components', 'AdminRekapView.tsx');

const homeAdminCode = fs.readFileSync(homeAdminPath, 'utf8');
const adminRekapCode = fs.readFileSync(adminRekapPath, 'utf8');

console.log('========================================================================');
console.log('🧪 ADVERSARIAL CHALLENGER VERIFICATION: MILESTONE M1');
console.log('========================================================================');

// ============================================================================
// SECTION 1: HomeViewAdmin.tsx - Pusat Informasi Removal & School Name Deduplication
// ============================================================================
console.log('\n--- SECTION 1: HomeViewAdmin.tsx Remnants & School Name Deduplication ---');

// 1.1 Leftover remnants check for "Pusat Informasi"
const hasPusatInformasiText = /Pusat\s+Informasi/i.test(homeAdminCode);
const hasInformasiPengumuman = /Informasi\s*&\s*Pengumuman/i.test(homeAdminCode);
const hasViewInformasiQuickAction = /setView\(['"]view-informasi['"]\)/.test(homeAdminCode);

assert(!hasPusatInformasiText, 'HomeViewAdmin.tsx contains zero references to "Pusat Informasi"');
assert(!hasInformasiPengumuman, 'HomeViewAdmin.tsx contains zero references to "Informasi & Pengumuman"');
assert(!hasViewInformasiQuickAction, 'HomeViewAdmin.tsx contains zero quick-action card navigations to "view-informasi"');

// 1.2 School name deduplication logic extraction & adversarial testing
const conditionMatch = homeAdminCode.match(
  /!\s*user\?\.nama\?\.toLowerCase\(\)\.includes\(\s*\(\(user as any\)\?\.sekolah_nama\s*\|\|\s*'SMA NIZAMUDIN'\)\.toLowerCase\(\)\s*\)\s*&&\s*!\s*user\?\.nama\?\.toLowerCase\(\)\.includes\('sma nizamudin'\)/
);
assert(!!conditionMatch, 'Found school name deduplication condition in HomeViewAdmin.tsx');

function evaluateShouldRenderSchoolName(user: any): boolean {
  return (
    !user?.nama?.toLowerCase().includes(((user as any)?.sekolah_nama || 'SMA NIZAMUDIN').toLowerCase()) &&
    !user?.nama?.toLowerCase().includes('sma nizamudin')
  );
}

// Test case 1: "Admin SMA NIZAMUDIN"
assert(
  evaluateShouldRenderSchoolName({ nama: 'Admin SMA NIZAMUDIN', username: 'admin' }) === false,
  'User "Admin SMA NIZAMUDIN" suppresses duplicate school name span'
);

// Test case 2: "Fitrawan"
assert(
  evaluateShouldRenderSchoolName({ nama: 'Fitrawan', username: 'fitra' }) === true,
  'User "Fitrawan" displays school name span without duplication'
);

// Test case 3: "Kepala Sekolah SMA NIZAMUDIN"
assert(
  evaluateShouldRenderSchoolName({ nama: 'Kepala Sekolah SMA NIZAMUDIN', username: 'kepsek' }) === false,
  'User "Kepala Sekolah SMA NIZAMUDIN" suppresses duplicate school name span'
);

// Adversarial Case 4: Lowercase "admin sma nizamudin"
assert(
  evaluateShouldRenderSchoolName({ nama: 'admin sma nizamudin', username: 'admin' }) === false,
  'User lowercase "admin sma nizamudin" is handled cleanly by case insensitivity'
);

// Adversarial Case 5: Surrounding whitespace "  Admin SMA NIZAMUDIN  "
assert(
  evaluateShouldRenderSchoolName({ nama: '  Admin SMA NIZAMUDIN  ', username: 'admin' }) === false,
  'User with padding spaces "  Admin SMA NIZAMUDIN  " suppresses duplicate school name'
);

// Adversarial Case 6: Dynamic school name: user.nama contains sekolah_nama
assert(
  evaluateShouldRenderSchoolName({
    nama: 'Admin SMAN 1 Jakarta',
    username: 'admin',
    sekolah_nama: 'SMAN 1 Jakarta'
  }) === false,
  'Dynamic sekolah_nama "SMAN 1 Jakarta" is deduplicated when present in user.nama'
);

// Adversarial Case 7: Teacher with personal academic degrees but no school name
assert(
  evaluateShouldRenderSchoolName({
    nama: 'Drs. Fitrawan, M.Pd.',
    username: 'fitrawan',
    sekolah_nama: 'SMA NIZAMUDIN'
  }) === true,
  'Teacher with degrees "Drs. Fitrawan, M.Pd." correctly displays school name badge'
);

// Adversarial Case 8: user.nama is null or undefined (graceful fallback)
assert(
  evaluateShouldRenderSchoolName({ nama: null, username: 'admin' }) === true,
  'Null user.nama falls back safely to rendering default school name without throwing'
);


// ============================================================================
// SECTION 2: AdminRekapView.tsx - Canonicalization & Adversarial Inputs
// ============================================================================
console.log('\n--- SECTION 2: AdminRekapView.tsx Canonicalization Logic ---');

// 2.1 Extract canonicalizeTeacherRekapName from AdminRekapView.tsx
const funcMatch = adminRekapCode.match(/function canonicalizeTeacherRekapName\([\s\S]*?\n\}/);
assert(!!funcMatch, 'Found canonicalizeTeacherRekapName function in AdminRekapView.tsx');

const cleanedFunc = funcMatch![0]
  .replace(/nama\?: string \| null/, 'nama')
  .replace(/\): string \{/, ') {');

const canonicalizeTeacherRekapName: (nama?: string | null) => string = new Function(
  'nama',
  cleanedFunc.slice(cleanedFunc.indexOf('{') + 1, -1)
) as any;

// 2.2 Test adversarial inputs against canonicalizeTeacherRekapName
assert(
  canonicalizeTeacherRekapName('Ade Fitrawan Ibrahim') === 'Ade Fitrawan Ibrahim',
  'Base name "Ade Fitrawan Ibrahim" -> "Ade Fitrawan Ibrahim"'
);

assert(
  canonicalizeTeacherRekapName('Ade Fitrawan Ibrahim, M.Pd., Gr.') === 'Ade Fitrawan Ibrahim',
  'Suffix degrees "Ade Fitrawan Ibrahim, M.Pd., Gr." -> "Ade Fitrawan Ibrahim"'
);

assert(
  canonicalizeTeacherRekapName('  ade fitrawan ibrahim  ') === 'Ade Fitrawan Ibrahim',
  'Padded lowercase "  ade fitrawan ibrahim  " -> "Ade Fitrawan Ibrahim"'
);

assert(
  canonicalizeTeacherRekapName('Drs. Ade Fitrawan Ibrahim, M.Pd.') === 'Ade Fitrawan Ibrahim',
  'Prefix and suffix degrees "Drs. Ade Fitrawan Ibrahim, M.Pd." -> "Ade Fitrawan Ibrahim"'
);

assert(
  canonicalizeTeacherRekapName('ADE FITRAWAN IBRAHIM') === 'Ade Fitrawan Ibrahim',
  'All-caps "ADE FITRAWAN IBRAHIM" -> "Ade Fitrawan Ibrahim"'
);

assert(
  canonicalizeTeacherRekapName('Prof. Dr. Ade Fitrawan Ibrahim, S.Pd., M.Ed.') === 'Ade Fitrawan Ibrahim',
  'Multi-tier degrees "Prof. Dr. Ade Fitrawan Ibrahim, S.Pd., M.Ed." -> "Ade Fitrawan Ibrahim"'
);

// Negative test cases: other teachers should NOT be affected
assert(
  canonicalizeTeacherRekapName('Ade Irma Suryani') === 'Ade Irma Suryani',
  'Teacher "Ade Irma Suryani" is preserved without false positive match'
);

assert(
  canonicalizeTeacherRekapName('Ibrahim Ahmad') === 'Ibrahim Ahmad',
  'Teacher "Ibrahim Ahmad" is preserved without false positive match'
);

assert(
  canonicalizeTeacherRekapName('Budi Santoso, M.Pd.') === 'Budi Santoso, M.Pd.',
  'Teacher "Budi Santoso, M.Pd." is preserved'
);

assert(
  canonicalizeTeacherRekapName('') === '',
  'Empty string returns empty string'
);

assert(
  canonicalizeTeacherRekapName(null) === '',
  'Null returns empty string'
);


// ============================================================================
// SECTION 3: End-to-End Rekap Aggregation Pipeline Stress Test
// ============================================================================
console.log('\n--- SECTION 3: End-to-End Rekap Pipeline Deduplication ---');

// Simulate the exact aggregation pipeline in AdminRekapView.tsx lines 220-318
function runRekapPipeline(
  guruList: any[],
  presensi: any[],
  jurnal: any[],
  piket: any[],
  totalHariKerja: number = 20
) {
  function isTestGuruName(name: string) {
    return false; // Not a test account
  }

  const pMap: Record<string, any> = {};

  // 1. Seed from guruList
  guruList?.forEach(g => {
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

  // 2. Aggregate presensi
  presensi?.forEach(p => {
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

  // 3. Aggregate jurnal
  const jMap: Record<string, number> = {};
  jurnal?.forEach(j => {
    const nama = j.nama_guru?.trim();
    if (!nama || isTestGuruName(nama)) return;
    const canonicalNama = canonicalizeTeacherRekapName(nama);
    if (pMap[canonicalNama]) pMap[canonicalNama].jurnal++;
    jMap[canonicalNama] = (jMap[canonicalNama] || 0) + 1;
  });

  // 4. Aggregate piket
  const pkMap: Record<string, number> = {};
  piket?.forEach(pk => {
    const nama = pk.guru_pelapor?.trim();
    if (!nama || isTestGuruName(nama)) return;
    const canonicalNama = canonicalizeTeacherRekapName(nama);
    if (pMap[canonicalNama]) pMap[canonicalNama].piket++;
    pkMap[canonicalNama] = (pkMap[canonicalNama] || 0) + 1;
  });

  // 5. Final arrays
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
    }).sort((a, b) => a.nama.localeCompare(b.nama));

  const jArr = Object.keys(jMap)
    .filter(k => !isTestGuruName(k))
    .map(k => ({ nama: k, total: jMap[k] }))
    .sort((a, b) => b.total - a.total);

  const piketArr = Object.keys(pkMap)
    .filter(k => !isTestGuruName(k))
    .map(k => ({ nama: k, total: pkMap[k] }))
    .sort((a, b) => b.total - a.total);

  return { presensi: pArr, jurnal: jArr, piket: piketArr };
}

// Feed adversarial mixed data with duplicate variants of Ade Fitrawan Ibrahim
const adversarialGuruList = [
  { nama_guru: 'Ade Fitrawan Ibrahim' },
  { nama_guru: 'Ade Fitrawan Ibrahim, M.Pd., Gr.' },
  { nama_guru: 'Siti Aminah, S.Pd.' }
];

const adversarialPresensi = [
  // 3 hadir from base name
  { nama_guru: 'Ade Fitrawan Ibrahim', tipe_absen: 'Datang', jenis_presensi: 'Sekolah' },
  { nama_guru: 'Ade Fitrawan Ibrahim', tipe_absen: 'Datang', jenis_presensi: 'Sekolah' },
  { nama_guru: 'Ade Fitrawan Ibrahim', tipe_absen: 'Datang', jenis_presensi: 'Sekolah' },
  // 2 hadir from prefixed/suffixed name
  { nama_guru: 'Drs. Ade Fitrawan Ibrahim, M.Pd.', tipe_absen: 'Datang', jenis_presensi: 'Sekolah' },
  { nama_guru: 'Drs. Ade Fitrawan Ibrahim, M.Pd.', tipe_absen: 'Datang', jenis_presensi: 'Sekolah' },
  // 1 izin from padded lowercase name
  { nama_guru: '  ade fitrawan ibrahim  ', tipe_absen: 'Datang', jenis_presensi: 'Izin', detail_izin: 'Izin Keperluan Keluarga' },
  // 2 hadir for Siti Aminah
  { nama_guru: 'Siti Aminah, S.Pd.', tipe_absen: 'Datang', jenis_presensi: 'Sekolah' },
  { nama_guru: 'Siti Aminah, S.Pd.', tipe_absen: 'Datang', jenis_presensi: 'Sekolah' },
];

const adversarialJurnal = [
  { nama_guru: 'Ade Fitrawan Ibrahim, M.Pd., Gr.' },
  { nama_guru: 'Ade Fitrawan Ibrahim, M.Pd., Gr.' },
  { nama_guru: 'Ade Fitrawan Ibrahim' },
  { nama_guru: '  ade fitrawan ibrahim  ' },
  { nama_guru: 'Siti Aminah, S.Pd.' }
];

const adversarialPiket = [
  { guru_pelapor: 'Drs. Ade Fitrawan Ibrahim, M.Pd.' },
  { guru_pelapor: 'Siti Aminah, S.Pd.' }
];

const rekapResult = runRekapPipeline(
  adversarialGuruList,
  adversarialPresensi,
  adversarialJurnal,
  adversarialPiket,
  20
);

// Assertions on rekapResult.presensi
assert(
  rekapResult.presensi.length === 2,
  `rekapResult.presensi has exactly 2 rows (expected 2, got ${rekapResult.presensi.length})`
);

const adeRow = rekapResult.presensi.find(p => p.nama.includes('Ade Fitrawan'));
assert(!!adeRow, 'Ade Fitrawan row exists in rekapResult.presensi');
assert(
  adeRow?.nama === 'Ade Fitrawan Ibrahim',
  `Ade Fitrawan row name is strictly without degree: "${adeRow?.nama}"`
);
assert(
  adeRow?.hadir === 5,
  `Ade Fitrawan consolidated hadir is 5 (3 + 2) (got ${adeRow?.hadir})`
);
assert(
  adeRow?.izin === 1,
  `Ade Fitrawan consolidated izin is 1 (got ${adeRow?.izin})`
);
assert(
  adeRow?.jurnal === 4,
  `Ade Fitrawan consolidated jurnal count is 4 (2 + 1 + 1) (got ${adeRow?.jurnal})`
);
assert(
  adeRow?.piket === 1,
  `Ade Fitrawan consolidated piket count is 1 (got ${adeRow?.piket})`
);

// Check that no other rows contain Ade or Ibrahim
const extraAdeRows = rekapResult.presensi.filter(p => p.nama.toLowerCase().includes('ade fitrawan') && p.nama !== 'Ade Fitrawan Ibrahim');
assert(
  extraAdeRows.length === 0,
  `Zero extra/duplicate rows found for Ade Fitrawan (found ${extraAdeRows.length})`
);

// Assertions on rekapResult.jurnal
const adeJurnal = rekapResult.jurnal.filter(j => j.nama.toLowerCase().includes('ade fitrawan'));
assert(
  adeJurnal.length === 1,
  `rekapResult.jurnal has exactly 1 entry for Ade Fitrawan (found ${adeJurnal.length})`
);
assert(
  adeJurnal[0]?.nama === 'Ade Fitrawan Ibrahim' && adeJurnal[0]?.total === 4,
  `rekapResult.jurnal aggregates to "Ade Fitrawan Ibrahim" with total=4 (got nama="${adeJurnal[0]?.nama}", total=${adeJurnal[0]?.total})`
);

// Assertions on rekapResult.piket
const adePiket = rekapResult.piket.filter(pk => pk.nama.toLowerCase().includes('ade fitrawan'));
assert(
  adePiket.length === 1,
  `rekapResult.piket has exactly 1 entry for Ade Fitrawan (found ${adePiket.length})`
);
assert(
  adePiket[0]?.nama === 'Ade Fitrawan Ibrahim' && adePiket[0]?.total === 1,
  `rekapResult.piket aggregates to "Ade Fitrawan Ibrahim" with total=1 (got nama="${adePiket[0]?.nama}", total=${adePiket[0]?.total})`
);

console.log('========================================================================');
console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log('========================================================================');

if (failed > 0) {
  process.exit(1);
}
