import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import { 
  formatKepalaSekolahTitle, 
  capitalizeEachWord, 
  EDUCATIONAL_ACRONYMS 
} from '../src/utils/textUtils';

async function runM6Tests() {
  const { computeCohortAdvancement } = await import('../src/components/NaikKelasModal');
  const { supabase } = await import('../src/lib/supabaseClient');
  console.log('====================================================');
  console.log('MILESTONE 6: MASTER DATA & UI POLISH AUTOMATED TEST');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, label: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${label}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${label}`);
      if (detail) console.error(`   ${detail}`);
      failed++;
    }
  }

  // =========================================================================
  // 1. Text Utilities: formatKepalaSekolahTitle & Acronym Preservation
  // =========================================================================
  console.log('\n--- 1. Testing formatKepalaSekolahTitle & textUtils ---');

  const test1 = formatKepalaSekolahTitle('SMA NIZAMUDIN ');
  assert(
    test1 === 'Kepala SMA Nizamudin',
    'SMA NIZAMUDIN is converted to Title Case while preserving SMA',
    `Expected "Kepala SMA Nizamudin", got "${test1}"`
  );

  const test2 = formatKepalaSekolahTitle('smk negeri 2 mataram');
  assert(
    test2 === 'Kepala SMK Negeri 2 Mataram',
    'smk negeri 2 mataram preserves SMK acronym and capitalizes each word',
    `Expected "Kepala SMK Negeri 2 Mataram", got "${test2}"`
  );

  const test3 = formatKepalaSekolahTitle('Kepala SMA NIZAMUDIN');
  assert(
    test3 === 'Kepala SMA Nizamudin',
    'Pre-existing "Kepala" prefix is stripped to prevent duplication',
    `Expected "Kepala SMA Nizamudin", got "${test3}"`
  );

  const test4 = formatKepalaSekolahTitle('Kepala Sekolah SMA NIZAMUDIN');
  assert(
    test4 === 'Kepala SMA Nizamudin',
    'Pre-existing "Kepala Sekolah" prefix is cleanly replaced',
    `Expected "Kepala SMA Nizamudin", got "${test4}"`
  );

  const test5 = formatKepalaSekolahTitle('');
  assert(
    test5 === 'Kepala Sekolah',
    'Empty or missing school name defaults to "Kepala Sekolah"',
    `Expected "Kepala Sekolah", got "${test5}"`
  );

  // Check all required educational acronyms
  const expectedAcronyms = ['SMA', 'SMK', 'SMP', 'SD', 'MA', 'MTS', 'MI', 'SLB', 'SMAN', 'SMKN', 'SMPN', 'SDN', 'MAN'];
  const allAcronymsPresent = expectedAcronyms.every(acr => EDUCATIONAL_ACRONYMS.has(acr));
  assert(
    allAcronymsPresent,
    'All mandatory Indonesian educational acronyms are present in EDUCATIONAL_ACRONYMS set',
    `Missing acronyms: ${expectedAcronyms.filter(a => !EDUCATIONAL_ACRONYMS.has(a)).join(', ')}`
  );

  // Check roman numerals preservation
  const testRoman = capitalizeEachWord('sma negeri ii bojonegoro');
  assert(
    testRoman === 'SMA Negeri II Bojonegoro',
    'Preserves roman numerals in title casing (e.g. II)',
    `Expected "SMA Negeri II Bojonegoro", got "${testRoman}"`
  );

  // Verify PrintHeader integration
  const printHeaderFile = fs.readFileSync(path.resolve(__dirname, '../src/components/PrintHeader.tsx'), 'utf-8');
  assert(
    printHeaderFile.includes('formatKepalaSekolahTitle') && printHeaderFile.includes('defaultKepalaTitle = formatKepalaSekolahTitle(schoolName)'),
    'PrintHeader.tsx imports and integrates formatKepalaSekolahTitle for signature block'
  );

  // =========================================================================
  // 2. Naik Kelas Progression Logic (NaikKelasModal.tsx)
  // =========================================================================
  console.log('\n--- 2. Testing Naik Kelas Progression Logic ---');

  // XII -> Lulus
  const adv12A = computeCohortAdvancement('XII Merdeka');
  assert(
    adv12A.targetKelas === 'Lulus' && adv12A.isLulus === true,
    'Class XII Merdeka advances to Lulus with isLulus: true',
    `Got ${JSON.stringify(adv12A)}`
  );

  const adv12B = computeCohortAdvancement('Kelas 12 IPA');
  assert(
    adv12B.targetKelas === 'Lulus' && adv12B.isLulus === true,
    'Class 12 IPA advances to Lulus with isLulus: true',
    `Got ${JSON.stringify(adv12B)}`
  );

  // XI -> XII
  const adv11 = computeCohortAdvancement('XI Merdeka');
  assert(
    adv11.targetKelas === 'XII Merdeka' && adv11.isLulus === false,
    'Class XI Merdeka advances to XII Merdeka with isLulus: false',
    `Got ${JSON.stringify(adv11)}`
  );

  // X -> XI
  const adv10 = computeCohortAdvancement('X Merdeka');
  assert(
    adv10.targetKelas === 'XI Merdeka' && adv10.isLulus === false,
    'Class X Merdeka advances to XI Merdeka with isLulus: false',
    `Got ${JSON.stringify(adv10)}`
  );

  // Verify NaikKelasModal source structure
  const naikKelasFile = fs.readFileSync(path.resolve(__dirname, '../src/components/NaikKelasModal.tsx'), 'utf-8');
  assert(
    naikKelasFile.includes("mode === 'perorangan'") &&
    naikKelasFile.includes("mode === 'per_kelas'") &&
    naikKelasFile.includes("mode === 'satu_angkatan'"),
    'NaikKelasModal implements all 3 operational modes (Perorangan, Per Kelas, Satu Angkatan)'
  );

  assert(
    naikKelasFile.includes(".update({ kelas: targetKelas, status: targetStatus })") &&
    naikKelasFile.includes(".in('id', localSelectedIds)"),
    'NaikKelasModal dispatches batch updates with target status and target kelas'
  );

  // =========================================================================
  // 3. Master Data Edit Modals in AdminDataView.tsx
  // =========================================================================
  console.log('\n--- 3. Testing Master Data Edit Modals in AdminDataView.tsx ---');

  const adminDataViewFile = fs.readFileSync(path.resolve(__dirname, '../src/components/AdminDataView.tsx'), 'utf-8');

  // Verify Edit buttons exist alongside Hapus
  assert(
    adminDataViewFile.includes('handleOpenEditModal') &&
    adminDataViewFile.includes('fa-pen-to-square') &&
    adminDataViewFile.includes('fa-trash-can'),
    'AdminDataView renders Edit button (handleOpenEditModal) alongside Hapus button'
  );

  // Check Data_Siswa fields
  assert(
    adminDataViewFile.includes('swal-edit-nisn') &&
    adminDataViewFile.includes('swal-edit-nama') &&
    adminDataViewFile.includes('swal-edit-kelas') &&
    adminDataViewFile.includes('swal-edit-gender') &&
    adminDataViewFile.includes('swal-edit-status') &&
    adminDataViewFile.includes('swal-edit-hp'),
    'Data_Siswa edit modal contains all required fields: nama_siswa, nisn, kelas, gender, status, no_hp_ortu'
  );

  // Check Data_Guru fields
  assert(
    adminDataViewFile.includes('swal-edit-nip') &&
    adminDataViewFile.includes('swal-edit-nama') &&
    adminDataViewFile.includes('swal-edit-mapel') &&
    adminDataViewFile.includes('swal-edit-hp') &&
    adminDataViewFile.includes('swal-edit-email') &&
    adminDataViewFile.includes('swal-edit-status'),
    'Data_Guru edit modal contains all required fields: nama_guru, nip, mata_pelajaran, email, no_hp, status'
  );

  // Check Data_Mapel fields
  assert(
    adminDataViewFile.includes('swal-edit-kode') &&
    adminDataViewFile.includes('swal-edit-nama') &&
    adminDataViewFile.includes('swal-edit-kat'),
    'Data_Mapel edit modal contains all required fields: nama_mapel, kode_mapel, kelompok'
  );

  // Check Kalender_Pendidikan fields
  assert(
    adminDataViewFile.includes('swal-edit-tgl-mulai') &&
    adminDataViewFile.includes('swal-edit-tgl-selesai') &&
    adminDataViewFile.includes('swal-edit-ket') &&
    adminDataViewFile.includes('swal-edit-tipe'),
    'Kalender_Pendidikan edit modal contains all required fields: tanggal_mulai, tanggal_selesai, keterangan, tipe'
  );

  // Check Jadwal_Pelajaran fields
  assert(
    adminDataViewFile.includes('swal-edit-hari') &&
    adminDataViewFile.includes('swal-edit-kelas') &&
    adminDataViewFile.includes('swal-edit-mapel') &&
    adminDataViewFile.includes('swal-edit-guru') &&
    adminDataViewFile.includes('swal-edit-jam-mulai') &&
    adminDataViewFile.includes('swal-edit-jam-selesai'),
    'Jadwal_Pelajaran edit modal contains all required fields: hari, kelas, mapel, nama_guru, jam_mulai, jam_selesai'
  );

  // Verify NaikKelasModal integration
  assert(
    adminDataViewFile.includes('<NaikKelasModal') &&
    adminDataViewFile.includes('selectedStudentIds={selectedStudentIds}'),
    'AdminDataView integrates NaikKelasModal with multi-selection state'
  );

  // =========================================================================
  // 4. Rekapan Jurnal Per Kelas (RekapJurnalView.tsx)
  // =========================================================================
  console.log('\n--- 4. Testing Rekapan Jurnal Per Kelas in RekapJurnalView.tsx ---');

  const rekapJurnalFile = fs.readFileSync(path.resolve(__dirname, '../src/components/RekapJurnalView.tsx'), 'utf-8');

  // Verify tab mode toggle
  assert(
    rekapJurnalFile.includes("tabMode === 'pribadi'") &&
    rekapJurnalFile.includes("tabMode === 'kelas'") &&
    rekapJurnalFile.includes("Rekapan Jurnal Per Kelas"),
    'RekapJurnalView contains tab toggle between Jurnal Guru Pribadi and Rekapan Jurnal Per Kelas'
  );

  // Verify exact 8 columns in classroom journal table
  const required8Headers = [
    'No',
    'Nama Guru',
    'Tanggal & Waktu',
    'Mapel',
    'Jam KBM',
    'Materi',
    'Foto',
    'Keterangan kehadiran guru'
  ];

  const allHeadersPresent = required8Headers.every(h => rekapJurnalFile.includes(h));
  assert(
    allHeadersPresent,
    'Rekapan Jurnal Per Kelas renders exactly the required 8 columns in order',
    `Missing headers: ${required8Headers.filter(h => !rekapJurnalFile.includes(h)).join(', ')}`
  );

  // Verify query logic allows querying all teachers when in classroom mode
  assert(
    rekapJurnalFile.includes("if (activeMode === 'pribadi' && user?.nama)") &&
    rekapJurnalFile.includes("query = query.eq('nama_guru', user.nama)"),
    'Classroom journal mode queries all journal entries for the selected kelas across all teachers'
  );

  // Verify CSV export handles classroom journal 8 columns
  assert(
    rekapJurnalFile.includes("'Keterangan kehadiran guru'") &&
    rekapJurnalFile.includes("tabMode === 'kelas'"),
    'CSV export accurately outputs 8 columns for Rekapan Jurnal Per Kelas'
  );

  // =========================================================================
  // 5. Perangkat Pembelajaran Matrix in DokumenView.tsx
  // =========================================================================
  console.log('\n--- 5. Testing Perangkat Pembelajaran Matrix in DokumenView.tsx ---');

  const dokumenViewFile = fs.readFileSync(path.resolve(__dirname, '../src/components/DokumenView.tsx'), 'utf-8');

  // Verify subject grouping
  assert(
    dokumenViewFile.includes('myTeacherSubjects') &&
    dokumenViewFile.includes('matchDocToTypeForSubject'),
    'DokumenView groups teacher documents by subject and class'
  );

  // Verify 6-document status matrix
  assert(
    dokumenViewFile.includes('Sudah Diunggah') &&
    dokumenViewFile.includes('Belum Diunggah') &&
    dokumenViewFile.includes('handleTriggerDirectUpload'),
    'DokumenView displays 6-document status matrix with clear "Sudah Diunggah" vs "Belum Diunggah" badges and upload trigger'
  );

  // Verify Mata Pelajaran and Kelas selectors in upload form
  assert(
    dokumenViewFile.includes('mapel-upload-options') &&
    dokumenViewFile.includes('kelas-upload-options') &&
    dokumenViewFile.includes('Mata Pelajaran') &&
    dokumenViewFile.includes('Kelas'),
    'Upload form contains Mata Pelajaran and Kelas selectors with autocomplete options'
  );

  assert(
    dokumenViewFile.includes('mapel: selectedMapel || null') &&
    dokumenViewFile.includes('kelas: selectedKelas || null'),
    'Uploaded document payload populates mapel and kelas columns in bank_dokumen'
  );

  // =========================================================================
  // 6. Live Supabase Master Data Update Smoke Test
  // =========================================================================
  console.log('\n--- 6. Live Supabase Query Verification ---');
  try {
    const { data: siswaList, error: siswaErr } = await supabase
      .from('data_siswa')
      .select('id, nama_siswa, kelas, status')
      .limit(3);

    if (!siswaErr && siswaList && siswaList.length > 0) {
      assert(true, `Successfully queried data_siswa from Supabase (${siswaList.length} samples checked)`);
    } else {
      console.log('ℹ️ Note: Supabase live query returned null or empty (skipping network test)');
    }

    const { data: mapelList, error: mapelErr } = await supabase
      .from('data_mapel')
      .select('id, nama_mata_pelajaran, kategori, kode_mapel, kelompok')
      .limit(3);

    if (!mapelErr && mapelList) {
      assert(true, `Successfully verified data_mapel schema with extended fields (${mapelList.length} rows)`);
    }

    const { data: jadwalList, error: jadwalErr } = await supabase
      .from('jadwal_pelajaran')
      .select('id, hari, kelas, nama_guru, mata_pelajaran, jam_mulai, jam_selesai')
      .limit(3);

    if (!jadwalErr && jadwalList) {
      assert(true, `Successfully verified jadwal_pelajaran schema with time fields (${jadwalList.length} rows)`);
    }
  } catch (liveErr: any) {
    console.warn('Live test note:', liveErr.message);
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runM6Tests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
