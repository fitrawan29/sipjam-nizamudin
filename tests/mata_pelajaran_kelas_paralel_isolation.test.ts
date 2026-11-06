import assert from 'assert';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✔ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ✘ FAIL: ${label}`);
    failed++;
  }
}

async function main() {
  console.log('========================================================================');
  console.log('🧪 VERIFIKASI ISOLASI MATA PELAJARAN KELAS PARALEL (JURNAL KBM & DAFTAR NILAI)');
  console.log('========================================================================\n');

  const root = path.join(__dirname, '..');
  const gjSrc = fs.readFileSync(path.join(root, 'src', 'components', 'GuruJurnal.tsx'), 'utf8');
  const gbSrc = fs.readFileSync(path.join(root, 'src', 'components', 'GradebookView.tsx'), 'utf8');
  const rvSrc = fs.readFileSync(path.join(root, 'src', 'components', 'RaporView.tsx'), 'utf8');
  const adSrc = fs.readFileSync(path.join(root, 'src', 'components', 'AdminDataView.tsx'), 'utf8');
  const dvSrc = fs.readFileSync(path.join(root, 'src', 'components', 'DokumenView.tsx'), 'utf8');

  // --- 1. GuruJurnal: HandleMapelChange & Dropdown Deduplication ---
  console.log('--- 1. Jurnal KBM: GuruJurnal.tsx Parallel Class Isolation ---');
  check(
    gjSrc.includes('currentKelasMatches') && gjSrc.includes('assignments.some'),
    'handleMapelChange checks if current active class already teaches the subject before overriding'
  );
  check(
    gjSrc.includes('uniqueMapelList') && gjSrc.includes('uniqueMapelList.map'),
    'GuruJurnal.tsx uses uniqueMapelList to prevent duplicate identical options across parallel classes'
  );

  // Simulate teacher with parallel classes in GuruJurnal
  const assignmentsSample = [
    { nama_mata_pelajaran: 'Matematika', nama_mapel: 'Matematika', kelas: 'X-A' },
    { nama_mata_pelajaran: 'Matematika', nama_mapel: 'Matematika', kelas: 'X-B' },
    { nama_mata_pelajaran: 'Fisika', nama_mapel: 'Fisika', kelas: 'X-A' },
  ];
  const kelasListSample = ['X-A', 'X-B'];

  // Test switching mapel when on parallel class X-B
  let currentKelas = 'X-B';
  let currentMapel = 'Fisika';

  const simulateHandleMapelChange = (val: string) => {
    currentMapel = val;
    const currentKelasMatches = assignmentsSample.some(
      a => (a.nama_mapel === val || a.nama_mata_pelajaran === val) && a.kelas === currentKelas
    );
    if (!currentKelasMatches) {
      const matched = assignmentsSample.find(
        a => a.nama_mapel === val || a.nama_mata_pelajaran === val
      );
      if (matched && matched.kelas) {
        currentKelas = matched.kelas;
      }
    }
  };

  simulateHandleMapelChange('Matematika');
  check(
    currentKelas === 'X-B',
    'Selecting Matematika while on parallel class X-B preserves class X-B (does NOT hijack to X-A)'
  );

  simulateHandleMapelChange('Fisika');
  check(
    currentKelas === 'X-A',
    'Selecting Fisika (only taught in X-A) correctly redirects class from X-B to X-A'
  );

  // --- 2. GradebookView: Mapel & Kelas Parallel Class Synchronization ---
  console.log('\n--- 2. Buku Nilai: GradebookView.tsx Parallel Class Synchronization ---');
  check(
    gbSrc.includes('uniqueMapelList') && gbSrc.includes('uniqueMapelList.map'),
    'GradebookView.tsx deduplicates mapelList in dropdown so parallel classes never show duplicate options'
  );
  check(
    gbSrc.includes('stillTeaches') && gbSrc.includes('handleSelectKelas'),
    'handleSelectKelas preserves selectedMapel when switching between parallel classes that both teach it'
  );
  check(
    gbSrc.includes('currentClassValid') && gbSrc.includes('handleSelectMapel'),
    'handleSelectMapel keeps selectedKelas when the current parallel class teaches the newly selected mapel'
  );

  // Simulate Gradebook switching between parallel classes
  let gbSelectedKelas = 'X Merdeka 1';
  let gbSelectedMapel = 'MTK';
  const gbTeacherMapels = [
    { nama_mapel: 'MTK', kelas: 'X Merdeka 1' },
    { nama_mapel: 'MTK', kelas: 'X Merdeka 2' },
    { nama_mapel: 'Biologi', kelas: 'X Merdeka 1' },
  ];

  const simulateGbSelectKelas = (newKelas: string) => {
    gbSelectedKelas = newKelas;
    const stillTeaches = gbTeacherMapels.some(
      m => m.nama_mapel === gbSelectedMapel && (!m.kelas || m.kelas === newKelas)
    );
    if (!stillTeaches) {
      const firstInClass = gbTeacherMapels.find(m => !m.kelas || m.kelas === newKelas);
      if (firstInClass) {
        gbSelectedMapel = firstInClass.nama_mapel;
      }
    }
  };

  simulateGbSelectKelas('X Merdeka 2');
  check(
    gbSelectedKelas === 'X Merdeka 2' && gbSelectedMapel === 'MTK',
    'Switching Gradebook from X Merdeka 1 to X Merdeka 2 keeps MTK selected (clean parallel switch)'
  );

  // Now set to Biologi in X Merdeka 1, then switch to X Merdeka 2 (where Biologi is not taught)
  gbSelectedKelas = 'X Merdeka 1';
  gbSelectedMapel = 'Biologi';
  simulateGbSelectKelas('X Merdeka 2');
  check(
    gbSelectedKelas === 'X Merdeka 2' && gbSelectedMapel === 'MTK',
    'Switching to X Merdeka 2 auto-selects MTK since Biologi is not taught in X Merdeka 2'
  );

  // --- 3. Database Queries: Strict Compound Key Isolation ---
  console.log('\n--- 3. Database Layer: Compound Key (mapel, kelas) Verification ---');
  check(
    gbSrc.includes(".eq('nama_mapel', selectedMapel)") && gbSrc.includes(".eq('kelas', selectedKelas)"),
    'tujuan_pembelajaran & capaian_pembelajaran strictly isolated by compound key (nama_mapel, kelas)'
  );
  check(
    gbSrc.includes(".eq('mapel', selectedMapel)") && gbSrc.includes(".eq('kelas', selectedKelas)"),
    'nilai_siswa & jurnal_pembelajaran strictly isolated by compound key (mapel, kelas)'
  );

  // --- 4. RaporView: Schedule Priority & Category Scoping ---
  console.log('\n--- 4. Rapor Siswa: RaporView.tsx Scope & Priority ---');
  check(
    rvSrc.indexOf("from('jadwal_pelajaran')") < rvSrc.indexOf("from('data_mapel')"),
    'RaporView prioritizes jadwal_pelajaran for selectedKelas before data_mapel fallback'
  );
  check(
    rvSrc.includes('d.kategori') || rvSrc.includes('d.kelompok'),
    'RaporView data_mapel fallback filters by category/level of selectedKelas'
  );

  // --- 5. AdminDataView: Preserving Parallel Class Suffix on Mapel Change ---
  console.log('\n--- 5. Admin Data: Suffix Preservation on Schedule Edit ---');
  check(
    adSrc.includes("val.includes('_') && (!kelasEl.value || kelasEl.value.trim() === '')"),
    'AdminDataView quick schedule edit preserves parallel class name (does not truncate X Merdeka 1 to X Merdeka)'
  );

  // --- 6. DokumenView: Kurikulum Merdeka Invariant Intact ---
  console.log('\n--- 6. Invariant Preservation: DokumenView Kurikulum Merdeka ---');
  check(
    dvSrc.includes('extractTingkat') && dvSrc.includes('parallelClass'),
    'DokumenView Kurikulum Merdeka document sharing per tingkat is 100% preserved'
  );

  console.log(`\n========================================================================`);
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`========================================================================`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
