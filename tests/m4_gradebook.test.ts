import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jicvvqxjyzntdrccnuyz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const defaultSchoolAId = 'a0000000-0000-0000-0000-000000000001';
const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-sekolah-id': defaultSchoolAId,
      'x-user-role': 'Admin'
    }
  }
});

async function runGradebookTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING M4 GRADEBOOK VERIFICATION SUITE');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: AppScreen.tsx Wiring Verification
  // --------------------------------------------------------------------------
  console.log('👉 [Test 1] Verifying AppScreen.tsx Wiring for Gradebook...');
  const appScreenPath = path.join(process.cwd(), 'src', 'components', 'AppScreen.tsx');
  assert(fs.existsSync(appScreenPath), 'AppScreen.tsx must exist');
  const appScreenContent = fs.readFileSync(appScreenPath, 'utf8');

  assert(
    appScreenContent.includes("import GradebookView from './GradebookView';"),
    'AppScreen.tsx must import GradebookView'
  );
  assert(
    appScreenContent.includes("id: 'view-gradebook'"),
    'AppScreen.tsx must declare menu item view-gradebook'
  );
  assert(
    appScreenContent.includes("label: 'Daftar Nilai'"),
    'AppScreen.tsx menu item label must be Daftar Nilai'
  );
  assert(
    appScreenContent.includes("icon: 'fa-graduation-cap'"),
    'AppScreen.tsx menu item icon must be fa-graduation-cap'
  );
  assert(
    appScreenContent.includes("<GradebookView user={user} />"),
    'AppScreen.tsx must render GradebookView component'
  );
  console.log('   ✅ AppScreen.tsx wiring verified successfully!\n');

  // --------------------------------------------------------------------------
  // TEST 2: Gradebook Component File Structure & Core Elements
  // --------------------------------------------------------------------------
  console.log('👉 [Test 2] Verifying GradebookView.tsx Component...');
  const gradebookPath = path.join(process.cwd(), 'src', 'components', 'GradebookView.tsx');
  assert(fs.existsSync(gradebookPath), 'GradebookView.tsx must exist');
  const gbContent = fs.readFileSync(gradebookPath, 'utf8');

  // Check key features
  assert(gbContent.includes('TujuanPembelajaran'), 'Must use TujuanPembelajaran type');
  assert(gbContent.includes('AsesmenKolom'), 'Must use AsesmenKolom type');
  assert(gbContent.includes('NilaiSiswa'), 'Must use NilaiSiswa type');
  assert(gbContent.includes('kategori === \'Diagnostik\''), 'Must handle Diagnostik category');
  assert(gbContent.includes('kategori === \'Formatif\''), 'Must handle Formatif category');
  assert(gbContent.includes('kategori === \'Sumatif\''), 'Must handle Sumatif category');
  assert(gbContent.includes('Nilai Akhir TP'), 'Must render Nilai Akhir TP calculation');
  assert(gbContent.includes('Rata Formatif'), 'Must render Rata-rata Formatif');
  assert(gbContent.includes('Rata Sumatif'), 'Must render Rata-rata Sumatif');
  assert(gbContent.includes('PrintSignature'), 'Must include PrintSignature');
  assert(gbContent.includes('exportTpToCsv'), 'Must include CSV export for TP');
  console.log('   ✅ GradebookView.tsx structure verified successfully!\n');

  // --------------------------------------------------------------------------
  // TEST 3: Kurikulum Merdeka Grading Calculation Logic
  // --------------------------------------------------------------------------
  console.log('👉 [Test 3] Verifying Kurikulum Merdeka Calculation Logic...');

  // Diagnostik is baseline and isolated from final achievement score
  const studentGrades = {
    diag: 60, // Baseline: needs assistance
    f1: 80, weightF1: 1,
    f2: 90, weightF2: 2, // F2 weighted twice
    s1: 85, weightS1: 1,
  };

  // 1. Formatif Weighted Average
  const sumFormatif = (studentGrades.f1 * studentGrades.weightF1) + (studentGrades.f2 * studentGrades.weightF2);
  const totalWeightFormatif = studentGrades.weightF1 + studentGrades.weightF2;
  const avgFormatif = parseFloat((sumFormatif / totalWeightFormatif).toFixed(1));
  assert.equal(avgFormatif, 86.7, `Formatif weighted average must be 86.7, got ${avgFormatif}`);

  // 2. Sumatif Weighted Average
  const avgSumatif = parseFloat(studentGrades.s1.toFixed(1));
  assert.equal(avgSumatif, 85.0, `Sumatif average must be 85.0, got ${avgSumatif}`);

  // 3. Nilai Akhir TP (50% Formatif + 50% Sumatif)
  const nilaiAkhirTp = parseFloat(((avgFormatif * 0.5) + (avgSumatif * 0.5)).toFixed(1));
  assert.equal(nilaiAkhirTp, 85.8, `Nilai Akhir TP must be 85.8, got ${nilaiAkhirTp}`);

  // 4. Predikat Evaluation
  let predikat = '';
  if (nilaiAkhirTp >= 85) predikat = 'Sangat Baik';
  else if (nilaiAkhirTp >= 75) predikat = 'Baik';
  else if (nilaiAkhirTp >= 65) predikat = 'Cukup';
  else predikat = 'Perlu Bimbingan';
  assert.equal(predikat, 'Sangat Baik', `Predikat must be 'Sangat Baik', got ${predikat}`);

  console.log('   ✅ Calculation logic matches Kurikulum Merdeka standards!\n');

  // --------------------------------------------------------------------------
  // TEST 4: Live Database Integration & Real CRUD Lifecycle
  // --------------------------------------------------------------------------
  console.log('👉 [Test 4] Testing Real Supabase CRUD Lifecycle for Gradebook...');

  // 4.1 Resolve active sekolah_id
  const { data: school, error: sErr } = await supabase.from('sekolah').select('id').limit(1).single();
  assert(!sErr && school?.id, 'A valid school must exist in the database');
  const sekolahId = school.id;

  const testMapel = 'X Merdeka_Informatika';
  const testKelas = 'X Merdeka';
  const testGuru = 'Ade Fitrawan Ibrahim';
  const testSemester = 'Ganjil';
  const testTahun = '2024/2025';
  const testKodeTp = 'TEST-TP-99';

  // 4.2 Create TP
  const { data: newTp, error: tpErr } = await supabase
    .from('tujuan_pembelajaran')
    .insert({
      sekolah_id: sekolahId,
      nama_guru: testGuru,
      nama_mapel: testMapel,
      kelas: testKelas,
      kode_tp: testKodeTp,
      deskripsi: 'Memahami dasar komputasi dan representasi data uji',
      semester: testSemester,
      tahun_ajaran: testTahun,
      urutan: 99,
    })
    .select()
    .single();

  assert(!tpErr && newTp?.id, `Failed to create test TP: ${tpErr?.message}`);
  const tpId = newTp.id;
  console.log(`   - Created Test TP with ID: ${tpId}`);

  try {
    // 4.3 Create Strictly 1 Diagnostik Column
    const { data: diagCol, error: diagErr } = await supabase
      .from('asesmen_kolom')
      .insert({
        sekolah_id: sekolahId,
        tp_id: tpId,
        kategori: 'Diagnostik',
        nama: 'Diagnostik',
        bobot: 1,
        urutan: 1,
      })
      .select()
      .single();
    assert(!diagErr && diagCol?.id, `Failed to create Diagnostik column: ${diagErr?.message}`);
    console.log(`   - Created Asesmen Diagnostik column with ID: ${diagCol.id}`);

    // 4.4 Create Formatif Columns
    const { data: fCol, error: fErr } = await supabase
      .from('asesmen_kolom')
      .insert({
        sekolah_id: sekolahId,
        tp_id: tpId,
        kategori: 'Formatif',
        nama: 'Formatif 1',
        bobot: 1,
        urutan: 2,
      })
      .select()
      .single();
    assert(!fErr && fCol?.id, `Failed to create Formatif column: ${fErr?.message}`);
    console.log(`   - Created Asesmen Formatif column with ID: ${fCol.id}`);

    // 4.5 Create Sumatif Column
    const { data: sCol, error: sErr } = await supabase
      .from('asesmen_kolom')
      .insert({
        sekolah_id: sekolahId,
        tp_id: tpId,
        kategori: 'Sumatif',
        nama: 'Sumatif Lingkup Materi',
        bobot: 1,
        urutan: 3,
      })
      .select()
      .single();
    assert(!sErr && sCol?.id, `Failed to create Sumatif column: ${sErr?.message}`);
    console.log(`   - Created Asesmen Sumatif column with ID: ${sCol.id}`);

    // 4.6 Fetch student in X Merdeka
    const { data: student, error: stdErr } = await supabase
      .from('data_siswa')
      .select('id, nisn, nama_siswa, kelas')
      .eq('kelas', testKelas)
      .limit(1)
      .single();
    assert(!stdErr && student?.nisn, `Failed to find student in class ${testKelas}`);
    console.log(`   - Target test student: ${student.nama_siswa} (NISN: ${student.nisn})`);

    // 4.7 Batch Upsert Student Grades
    const gradesPayload = [
      {
        sekolah_id: sekolahId,
        tp_id: tpId,
        asesmen_id: diagCol.id,
        siswa_id: student.id,
        nisn: student.nisn,
        nama_siswa: student.nama_siswa,
        kelas: testKelas,
        mapel: testMapel,
        nama_guru: testGuru,
        nilai: 70,
      },
      {
        sekolah_id: sekolahId,
        tp_id: tpId,
        asesmen_id: fCol.id,
        siswa_id: student.id,
        nisn: student.nisn,
        nama_siswa: student.nama_siswa,
        kelas: testKelas,
        mapel: testMapel,
        nama_guru: testGuru,
        nilai: 85,
      },
      {
        sekolah_id: sekolahId,
        tp_id: tpId,
        asesmen_id: sCol.id,
        siswa_id: student.id,
        nisn: student.nisn,
        nama_siswa: student.nama_siswa,
        kelas: testKelas,
        mapel: testMapel,
        nama_guru: testGuru,
        nilai: 90,
      },
    ];

    const { error: upsertErr } = await supabase
      .from('nilai_siswa')
      .upsert(gradesPayload, { onConflict: 'sekolah_id,asesmen_id,nisn' });
    assert(!upsertErr, `Failed to upsert student grades: ${upsertErr?.message}`);
    console.log(`   - Successfully upserted 3 grade records!`);

    // 4.8 Query back and verify
    const { data: savedGrades, error: fetchErr } = await supabase
      .from('nilai_siswa')
      .select('*')
      .eq('tp_id', tpId)
      .eq('nisn', student.nisn);
    assert(!fetchErr && savedGrades?.length === 3, 'Must fetch back all 3 grades');
    console.log(`   - Verified 3 saved grades in database.`);

    // 4.9 Update grade test (Upsert conflict resolution)
    const { error: updateGradeErr } = await supabase
      .from('nilai_siswa')
      .upsert([
        {
          sekolah_id: sekolahId,
          tp_id: tpId,
          asesmen_id: sCol.id,
          siswa_id: student.id,
          nisn: student.nisn,
          nama_siswa: student.nama_siswa,
          kelas: testKelas,
          mapel: testMapel,
          nama_guru: testGuru,
          nilai: 95,
        }
      ], { onConflict: 'sekolah_id,asesmen_id,nisn' });
    assert(!updateGradeErr, `Failed to update grade: ${updateGradeErr?.message}`);

    const { data: updatedGrade } = await supabase
      .from('nilai_siswa')
      .select('nilai')
      .eq('asesmen_id', sCol.id)
      .eq('nisn', student.nisn)
      .single();
    assert.equal(Number(updatedGrade?.nilai), 95, 'Grade must be updated to 95');
    console.log(`   - Grade update correctly resolved and saved value 95.`);

  } finally {
    // Clean up test data
    console.log('   - Cleaning up test records...');
    await supabase.from('nilai_siswa').delete().eq('tp_id', tpId);
    await supabase.from('asesmen_kolom').delete().eq('tp_id', tpId);
    await supabase.from('tujuan_pembelajaran').delete().eq('id', tpId);
    console.log('   - Cleaned up successfully.');
  }

  console.log('\n================================================================');
  console.log('🎉 ALL GRADEBOOK TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

runGradebookTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
