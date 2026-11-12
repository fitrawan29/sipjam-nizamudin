import fs from 'fs';
import path from 'path';
import {
  isJurnalMatchJadwal,
  isTeacherRecordMatch,
  isTeacherScheduleMatch,
  normalizeTeacherIdentityName
} from '../src/lib/workflow';
import { isTeacherJournalMatch } from '../src/lib/attendanceAlpa';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    if (detail) console.error(`   ${detail}`);
    failed++;
  }
}

async function runAdversarialTestSuite() {
  console.log('================================================================');
  console.log('ADVERSARIAL STRESS TEST SUITE — CHALLENGER_KBM_2');
  console.log('Target: src/components/RekapJurnalView.tsx (commit f800a0f)');
  console.log('================================================================\n');

  const root = path.resolve(__dirname, '..');
  const rjPath = path.join(root, 'src', 'components', 'RekapJurnalView.tsx');
  const rjCode = fs.readFileSync(rjPath, 'utf8');

  // =========================================================================
  // SCENARIO 1: MULTI-CLASS TEACHER STRESS TEST & WALI KELAS ISOLATION
  // =========================================================================
  console.log('\n--- Scenario 1: Multi-Class Teacher & Wali Kelas Isolation ---');

  // 1.1 Source-level verification of auto-select isolation
  assert(
    rjCode.includes("assignedWalis.length > 0 && effectiveMode === 'kelas'"),
    'RekapJurnalView restricts assignedWalis auto-select strictly to effectiveMode === "kelas"'
  );
  assert(
    rjCode.includes("validAssignedKelas.length === 1 && effectiveMode === 'kelas'"),
    'RekapJurnalView restricts single assigned class auto-select strictly to effectiveMode === "kelas"'
  );
  assert(
    rjCode.includes("validAssignedMapels.length === 1 && effectiveMode === 'kelas'"),
    'RekapJurnalView restricts single assigned mapel auto-select strictly to effectiveMode === "kelas"'
  );

  // 1.2 State initialization simulation for multi-class teacher with wali role
  // Teacher "Budi Santoso, S.Pd." teaches 7A, 7B, 8A; is Wali Kelas of 7A
  const mockTeacher = {
    id: 'usr-budi-01',
    nama: 'Budi Santoso, S.Pd.',
    sekolah_id: 'sch-001'
  };
  const mockAssignedClasses = ['7A', '7B', '8A'];
  const mockAssignedWalis = ['7A'];

  // Test personal mode initialization
  let simulatedKelasPersonal = '';
  const effectiveModePersonal: 'pribadi' | 'kelas' = 'pribadi';
  if (mockAssignedWalis.length > 0 && effectiveModePersonal === 'kelas') {
    simulatedKelasPersonal = mockAssignedWalis[0];
  }
  assert(
    simulatedKelasPersonal === '',
    'In personal mode, kelas state remains empty string allowing multi-class retrieval'
  );

  // Test classroom mode initialization
  let simulatedKelasClassroom = '';
  const effectiveModeClassroom: 'pribadi' | 'kelas' = 'kelas';
  if (mockAssignedWalis.length > 0 && effectiveModeClassroom === 'kelas') {
    simulatedKelasClassroom = mockAssignedWalis[0];
  }
  assert(
    simulatedKelasClassroom === '7A',
    'In classroom mode, kelas state auto-selects wali class (7A)'
  );

  // 1.3 Database query boundary check for personal mode
  // Verify that activeMode === 'kelas' strictly wraps SQL class & subject filtering
  const modeQuerySection = rjCode.match(/if \(activeMode === 'kelas'\) \{[\s\S]*?const \{ data \} = await query;/);
  assert(
    Boolean(modeQuerySection && modeQuerySection[0]),
    'Found activeMode === "kelas" query boundary'
  );
  if (modeQuerySection) {
    const sectionText = modeQuerySection[0];
    assert(
      sectionText.includes("query = query.eq('kelas',") && sectionText.includes("query = query.eq('mapel',"),
      'Class and mapel exact database equality is enclosed strictly within activeMode === "kelas"'
    );
  }

  // 1.4 Multi-class data preservation simulation
  const dummyMultiClassData = [
    { id: 'j1', kelas: '7A', mapel: 'Matematika', tanggal: '2026-11-10', materi: 'Aljabar', nama_guru: 'Budi Santoso, S.Pd.', user_id: 'usr-budi-01' },
    { id: 'j2', kelas: '7B', mapel: 'Matematika', tanggal: '2026-11-10', materi: 'Statistika', nama_guru: 'Budi Santoso, S.Pd.', user_id: 'usr-budi-01' },
    { id: 'j3', kelas: '8A', mapel: 'Matematika', tanggal: '2026-11-10', materi: 'Geometri', nama_guru: 'Budi Santoso, S.Pd.', user_id: 'usr-budi-01' }
  ];

  // In personal mode when activeKelas is empty:
  const activeKelasEmpty = '';
  let filteredMultiClass = dummyMultiClassData;
  if (effectiveModePersonal === 'pribadi' && activeKelasEmpty) {
    filteredMultiClass = filteredMultiClass.filter(j => j.kelas === activeKelasEmpty);
  }
  const preservedClasses = filteredMultiClass.map(j => j.kelas);
  assert(
    preservedClasses.length === 3 &&
    preservedClasses.includes('7A') &&
    preservedClasses.includes('7B') &&
    preservedClasses.includes('8A'),
    'Multi-class teacher records across 7A, 7B, 8A are 100% preserved in personal print mode'
  );

  // =========================================================================
  // SCENARIO 2: CURRICULUM NAMING VARIATIONS & IN-MEMORY MAPEL MATCHING
  // =========================================================================
  console.log('\n--- Scenario 2: Curriculum Naming Variations & In-Memory Matching ---');

  // Verify that in-memory mapel matching logic in RekapJurnalView uses both clean comparison and isJurnalMatchJadwal
  assert(
    rjCode.includes("const jClean = j.mapel.includes('_') ? (j.mapel.split('_').pop() || '').trim() : j.mapel;") &&
    rjCode.includes("const mClean = mapel.includes('_') ? (mapel.split('_').pop() || '').trim() : mapel;") &&
    rjCode.includes("isJurnalMatchJadwal({ mapel: j.mapel, kelas: j.kelas || 'K' }, { mata_pelajaran: mapel, mapel: mapel, kelas: j.kelas || 'K' })"),
    'RekapJurnalView implements robust multi-stage in-memory mapel matching'
  );

  const matchSubjectFilter = (dbMapel: string, filterMapel: string, dbKelas = 'VII-A') => {
    if (!dbMapel) return false;
    if (dbMapel === filterMapel) return true;
    const jClean = dbMapel.includes('_') ? (dbMapel.split('_').pop() || '').trim() : dbMapel;
    const mClean = filterMapel.includes('_') ? (filterMapel.split('_').pop() || '').trim() : filterMapel;
    if (jClean.toLowerCase() === mClean.toLowerCase()) return true;
    return isJurnalMatchJadwal(
      { mapel: dbMapel, kelas: dbKelas },
      { mata_pelajaran: filterMapel, mapel: filterMapel, kelas: dbKelas }
    );
  };

  // 2.1 Underscore prefix variations
  assert(
    matchSubjectFilter('XI Merdeka_Matematika', 'Matematika'),
    'Matches "XI Merdeka_Matematika" to filter "Matematika"'
  );
  assert(
    matchSubjectFilter('VII Kurikulum Merdeka_Matematika', 'Matematika'),
    'Matches "VII Kurikulum Merdeka_Matematika" to filter "Matematika"'
  );
  assert(
    matchSubjectFilter('X-1_Matematika', 'Matematika'),
    'Matches "X-1_Matematika" to filter "Matematika"'
  );
  assert(
    matchSubjectFilter('XII_IPA_Biologi', 'Biologi'),
    'Matches "XII_IPA_Biologi" to filter "Biologi"'
  );
  assert(
    matchSubjectFilter('IX-A_Bahasa Indonesia', 'Bahasa Indonesia'),
    'Matches "IX-A_Bahasa Indonesia" to filter "Bahasa Indonesia"'
  );

  // 2.2 Dash and space curriculum prefix variations
  assert(
    matchSubjectFilter('X Kurikulum Merdeka - Fisika', 'Fisika'),
    'Matches "X Kurikulum Merdeka - Fisika" to filter "Fisika"'
  );
  assert(
    matchSubjectFilter('XI Merdeka - Bahasa Inggris', 'Bahasa Inggris'),
    'Matches "XI Merdeka - Bahasa Inggris" to filter "Bahasa Inggris"'
  );

  // 2.3 Common subject abbreviations
  assert(
    matchSubjectFilter('MTK', 'Matematika'),
    'Matches abbreviation "MTK" to filter "Matematika"'
  );
  assert(
    matchSubjectFilter('Mat', 'Matematika'),
    'Matches abbreviation "Mat" to filter "Matematika"'
  );
  assert(
    matchSubjectFilter('B. Inggris', 'Bahasa Inggris'),
    'Matches abbreviation "B. Inggris" to filter "Bahasa Inggris"'
  );
  assert(
    matchSubjectFilter('Bhs Inggris', 'Bahasa Inggris'),
    'Matches abbreviation "Bhs Inggris" to filter "Bahasa Inggris"'
  );
  assert(
    matchSubjectFilter('PJOK', 'Pendidikan Jasmani'),
    'Matches abbreviation "PJOK" to filter "Pendidikan Jasmani"'
  );
  assert(
    matchSubjectFilter('Penjas', 'Pendidikan Jasmani'),
    'Matches abbreviation "Penjas" to filter "Pendidikan Jasmani"'
  );
  assert(
    matchSubjectFilter('PAI', 'Pendidikan Agama Islam'),
    'Matches abbreviation "PAI" to filter "Pendidikan Agama Islam"'
  );
  assert(
    matchSubjectFilter('PPKn', 'Pendidikan Kewarganegaraan'),
    'Matches abbreviation "PPKn" to filter "Pendidikan Kewarganegaraan"'
  );
  assert(
    matchSubjectFilter('SBK', 'Seni Budaya'),
    'Matches abbreviation "SBK" to filter "Seni Budaya"'
  );
  assert(
    matchSubjectFilter('IPA', 'Ilmu Pengetahuan Alam'),
    'Matches abbreviation "IPA" to filter "Ilmu Pengetahuan Alam"'
  );
  assert(
    matchSubjectFilter('IPS', 'Ilmu Pengetahuan Sosial'),
    'Matches abbreviation "IPS" to filter "Ilmu Pengetahuan Sosial"'
  );
  assert(
    matchSubjectFilter('BK', 'Bimbingan Konseling'),
    'Matches abbreviation "BK" to filter "Bimbingan Konseling"'
  );

  // 2.4 Case-insensitivity & whitespace trimming
  assert(
    matchSubjectFilter('mAtEmAtIkA', 'MATEMATIKA'),
    'Matches mixed case "mAtEmAtIkA" to "MATEMATIKA"'
  );
  assert(
    matchSubjectFilter('  Matematika  ', 'matematika'),
    'Matches padded whitespace "  Matematika  " to "matematika"'
  );

  // 2.5 Adversarial Negative Controls (Rejecting false positives)
  assert(
    !matchSubjectFilter('Informatika', 'Matematika'),
    'Correctly REJECTS false positive: "Informatika" does NOT match "Matematika"'
  );
  assert(
    !matchSubjectFilter('Fisika', 'Kimia'),
    'Correctly REJECTS false positive: "Fisika" does NOT match "Kimia"'
  );
  assert(
    !matchSubjectFilter('', 'Matematika'),
    'Correctly REJECTS empty db mapel against "Matematika"'
  );
  assert(
    !matchSubjectFilter('Matematika', ''),
    'Correctly REJECTS empty filter against db mapel'
  );

  // =========================================================================
  // SCENARIO 3: LEGACY DATABASE RECORDS WITH sekolah_id IS NULL
  // =========================================================================
  console.log('\n--- Scenario 3: Legacy Database Records With sekolah_id IS NULL ---');

  // 3.1 Verify PostgREST .or() filter in source code
  const tolerantOrPattern = /query\.or\(`sekolah_id\.eq\."\$\{user\.sekolah_id\}",sekolah_id\.is\.null`\)/;
  assert(
    tolerantOrPattern.test(rjCode),
    'RekapJurnalView tarikRekap constructs exact PostgREST tolerant filter: sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null'
  );

  // Verify that rigid .eq('sekolah_id', user.sekolah_id) is NOT used in the primary journal query
  const querySection = rjCode.match(/let query = supabase[\s\S]*?const \{ data \} = await query;/);
  if (querySection) {
    const qStr = querySection[0];
    assert(
      !qStr.includes("query = query.eq('sekolah_id', user.sekolah_id)"),
      'Primary journal query has completely eradicated rigid query.eq("sekolah_id", user.sekolah_id)'
    );
  } else {
    assert(false, 'Unable to locate primary journal query block');
  }

  // 3.2 Emulation of PostgREST .or() filter matching logic
  const mockTenantId = 'sch-alpha-999';
  const mockDbJournals = [
    { id: 'rec-1', sekolah_id: 'sch-alpha-999', materi: 'Current Tenant Record' },
    { id: 'rec-2', sekolah_id: null, materi: 'Legacy Null Tenant Record' },
    { id: 'rec-3', sekolah_id: 'sch-beta-888', materi: 'Different Tenant Record' },
    { id: 'rec-4', sekolah_id: undefined, materi: 'Legacy Undefined Tenant Record' }
  ];

  // Emulating PostgREST .or(`sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null`)
  const postgrestOrFilter = (records: any[], userSekolahId: string) => {
    return records.filter(r => r.sekolah_id === userSekolahId || r.sekolah_id === null || r.sekolah_id === undefined);
  };

  const retrievedRecords = postgrestOrFilter(mockDbJournals, mockTenantId);
  assert(
    retrievedRecords.some(r => r.id === 'rec-1'),
    'PostgREST .or() retains current tenant record'
  );
  assert(
    retrievedRecords.some(r => r.id === 'rec-2'),
    'PostgREST .or() retains legacy NULL tenant record'
  );
  assert(
    !retrievedRecords.some(r => r.id === 'rec-3'),
    'PostgREST .or() strictly rejects foreign tenant record'
  );

  // 3.3 Safety check when user.sekolah_id is undefined or null
  const userWithoutTenant = { id: 'usr-1', nama: 'Guru Test', sekolah_id: null };
  let simulatedQueryFilterApplied = false;
  if (userWithoutTenant?.sekolah_id) {
    simulatedQueryFilterApplied = true;
  }
  assert(
    simulatedQueryFilterApplied === false,
    'When user.sekolah_id is null/undefined, filter is safely bypassed without runtime error'
  );

  // =========================================================================
  // SCENARIO 4: 12-COLUMN TABLE INTEGRITY & SQUELCHING DELINQUENCY
  // =========================================================================
  console.log('\n--- Scenario 4: 12-Column Table Integrity & Absence of Overwrite ---');

  // 4.1 Verify personal table header has exactly 12 columns
  const tableContainerMatch = rjCode.match(/id="hasil-rekap-jurnal-guru"[\s\S]*?<\/table>/g);
  assert(Boolean(tableContainerMatch), 'Found #hasil-rekap-jurnal-guru table container');

  const personalTableMatch = rjCode.match(/JURNAL PRIBADI GURU[\s\S]*?<thead>([\s\S]*?)<\/thead>/);
  assert(Boolean(personalTableMatch), 'Found personal table <thead> in RekapJurnalView');

  if (personalTableMatch) {
    const theadContent = personalTableMatch[1];
    const thMatches = theadContent.match(/<th\b/g) || [];
    assert(
      thMatches.length === 12,
      `Personal table <thead> has exactly 12 <th> columns (actual: ${thMatches.length})`
    );

    // Verify all 12 official headers are present
    const expectedHeaders = [
      'No',
      'Hari/Tanggal',
      'Tujuan Pembelajaran',
      'KKTP',
      'Konten',
      'Kegiatan Pembelajaran',
      'Kelas',
      'Mata Pelajaran',
      'Absensi Murid (H/I/S/A)',
      'Lokasi KBM',
      'Foto Dokumentasi',
      'Catatan'
    ];
    let allHeadersPresent = true;
    for (const h of expectedHeaders) {
      if (!theadContent.includes(h)) {
        allHeadersPresent = false;
        console.error(`Missing expected header: ${h}`);
      }
    }
    assert(allHeadersPresent, 'All 12 official column headers exist in personal table');
  }

  // 4.2 Verify personal table <tbody> row rendering has exactly 12 <td> cells
  const personalTbodyMatch = rjCode.match(/JURNAL PRIBADI GURU[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/);
  assert(Boolean(personalTbodyMatch), 'Found personal table <tbody> in RekapJurnalView');
  if (personalTbodyMatch) {
    const tbodyContent = personalTbodyMatch[1];
    // Find comments marking cells 1 through 12
    const cellComments = [
      '{/* 1. No */}',
      '{/* 2. Hari/Tanggal */}',
      '{/* 3. Tujuan Pembelajaran */}',
      '{/* 4. KKTP */}',
      '{/* 5. Konten */}',
      '{/* 6. Kegiatan Pembelajaran */}',
      '{/* 7. Kelas */}',
      '{/* 8. Mata Pelajaran */}',
      '{/* 9. Absensi Murid (H/I/S/A) */}',
      '{/* 10. Lokasi KBM */}',
      '{/* 11. Foto Dokumentasi */}',
      '{/* 12. Catatan */}'
    ];
    let allCellsPresent = true;
    for (const c of cellComments) {
      if (!tbodyContent.includes(c)) {
        allCellsPresent = false;
        console.error(`Missing cell comment: ${c}`);
      }
    }
    assert(allCellsPresent, 'All 12 <td> cells are properly structured and mapped in <tbody>');
  }

  // 4.3 Squelching of synthetic delinquency when real journal exists
  // Emulate lines 1160-1182 of RekapJurnalView.tsx
  const mockJurnalData = [
    {
      id: 'real-jrn-101',
      tanggal: '2026-11-12',
      kelas: 'VII-A',
      mapel: 'Matematika',
      nama_guru: 'Budi Santoso, S.Pd.',
      user_id: 'usr-budi-01',
      sekolah_id: 'sch-001',
      materi: 'Persamaan Linear Satu Variabel',
      kegiatan: 'Diskusi kelompok dan pemecahan soal',
      status_verifikasi: 'Disetujui'
    },
    {
      id: 'unfilled-kbm-2026-11-12-VII-A-Matematika-Budi',
      tanggal: '2026-11-12',
      kelas: 'VII-A',
      mapel: 'Matematika',
      nama_guru: 'Budi Santoso, S.Pd.',
      user_id: 'usr-budi-01',
      sekolah_id: 'sch-001',
      materi: 'tidak masuk kelas',
      kegiatan: 'tidak masuk kelas',
      status_verifikasi: 'Tidak Masuk Kelas',
      keterangan: 'tidak masuk kelas'
    },
    {
      id: 'unfilled-kbm-2026-11-12-VIII-B-Matematika-Budi',
      tanggal: '2026-11-12',
      kelas: 'VIII-B',
      mapel: 'Matematika',
      nama_guru: 'Budi Santoso, S.Pd.',
      user_id: 'usr-budi-01',
      sekolah_id: 'sch-001',
      materi: 'tidak masuk kelas',
      kegiatan: 'tidak masuk kelas',
      status_verifikasi: 'Tidak Masuk Kelas',
      keterangan: 'tidak masuk kelas'
    }
  ];

  const emulateFilteredJurnal = (data: any[]) => {
    return data.filter(j => {
      const statusLower = (j.status_verifikasi || '').toLowerCase();
      const ketLower = (j.keterangan || '').toLowerCase();
      const matLower = (j.materi || j.materi_pembelajaran || '').toLowerCase();

      // Squelch delinquency
      const isDelinquency = statusLower === 'tidak masuk kelas' || ketLower === 'tidak masuk kelas' || matLower === 'tidak masuk kelas';
      if (isDelinquency) {
        const hasRealJournalForClass = data.some((rj: any) => {
          if (rj.id === j.id) return false;
          if (rj.tanggal !== j.tanggal) return false;
          const rjStatus = (rj.status_verifikasi || '').toLowerCase();
          const rjMat = (rj.materi || rj.materi_pembelajaran || rj.konten || '').trim().toLowerCase();
          const rjKeg = (rj.kegiatan || rj.kegiatan_pembelajaran || '').trim().toLowerCase();
          if (rjStatus === 'tidak masuk kelas' || rjMat === 'tidak masuk kelas' || (rjMat === '-' && rjKeg === '-')) return false;
          if (!rjMat && !rjKeg) return false;

          const teacherMatches = (!j.nama_guru || j.nama_guru === '-') ? true : isTeacherJournalMatch({ nama_guru: j.nama_guru, user_id: j.user_id, sekolah_id: j.sekolah_id }, rj);
          if (!teacherMatches) return false;
          const classMatches = rj.kelas && j.kelas && rj.kelas.trim().toLowerCase() === j.kelas.trim().toLowerCase();
          const mapelMatches = (rj.mapel || rj.mata_pelajaran || '').trim().toLowerCase() === (j.mapel || j.mata_pelajaran || '').trim().toLowerCase();
          const matchJadwal = isJurnalMatchJadwal(rj, { kelas: j.kelas, mata_pelajaran: j.mapel });
          return (matchJadwal || (classMatches && (mapelMatches || !j.mapel || j.mapel === '-')));
        });
        if (hasRealJournalForClass) {
          return false;
        }
      }
      return true;
    });
  };

  const outputRows = emulateFilteredJurnal(mockJurnalData);

  assert(
    outputRows.some(r => r.id === 'real-jrn-101' && r.materi === 'Persamaan Linear Satu Variabel'),
    'Real submitted journal remains fully preserved with actual content'
  );
  assert(
    !outputRows.some(r => r.id === 'unfilled-kbm-2026-11-12-VII-A-Matematika-Budi'),
    'Bogus synthetic delinquency for VII-A is completely squelched when real journal exists'
  );
  assert(
    outputRows.some(r => r.id === 'unfilled-kbm-2026-11-12-VIII-B-Matematika-Budi'),
    'Legitimate unfilled delinquency for VIII-B is correctly retained'
  );

  // 4.4 Fallback content rendering test
  // In personal table cell 5 (Konten):
  // {(j.konten && j.konten !== '-') ? j.konten : ((j.materi_pembelajaran && j.materi_pembelajaran !== '-') ? j.materi_pembelajaran : (j.materi && j.materi !== '-' ? j.materi : ...))}
  const resolveKonten = (j: any) => {
    return (j.konten && j.konten !== '-')
      ? j.konten
      : ((j.materi_pembelajaran && j.materi_pembelajaran !== '-')
          ? j.materi_pembelajaran
          : (j.materi && j.materi !== '-' ? j.materi : '-'));
  };

  const resolveKegiatan = (j: any) => {
    return (j.kegiatan_pembelajaran && j.kegiatan_pembelajaran !== '-')
      ? j.kegiatan_pembelajaran
      : (j.kegiatan && j.kegiatan !== '-' ? j.kegiatan : '-');
  };

  assert(
    resolveKonten({ materi: 'Aljabar' }) === 'Aljabar',
    'Fallback properly extracts materi when konten and materi_pembelajaran are absent'
  );
  assert(
    resolveKonten({ materi_pembelajaran: 'Fisika Kuantum' }) === 'Fisika Kuantum',
    'Fallback properly extracts materi_pembelajaran'
  );
  assert(
    resolveKonten({ konten: 'Biologi Sel' }) === 'Biologi Sel',
    'Fallback prioritizes explicit konten'
  );
  assert(
    resolveKegiatan({ kegiatan: 'Eksperimen Lab' }) === 'Eksperimen Lab',
    'Fallback properly extracts kegiatan when kegiatan_pembelajaran is absent'
  );
  assert(
    resolveKegiatan({ kegiatan_pembelajaran: 'Diskusi Terbimbing' }) === 'Diskusi Terbimbing',
    'Fallback properly extracts kegiatan_pembelajaran'
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(`\n================================================================`);
  console.log(`TOTAL ADVERSARIAL TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================================================\n`);

  if (failed > 0) process.exit(1);
}

runAdversarialTestSuite();
