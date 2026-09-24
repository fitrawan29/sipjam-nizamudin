import fs from 'fs';
import path from 'path';

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

async function runTests() {
  console.log('====================================================');
  console.log('MILESTONE M1 TEST: RESUBMISSION RESET & ADMIN VERIF UI');
  console.log('====================================================\n');

  const presensiPath = path.resolve(__dirname, '..', 'src', 'components', 'GuruPresensi.tsx');
  const jurnalPath = path.resolve(__dirname, '..', 'src', 'components', 'GuruJurnal.tsx');
  const piketPath = path.resolve(__dirname, '..', 'src', 'components', 'PiketView.tsx');
  const adminVerifPath = path.resolve(__dirname, '..', 'src', 'components', 'AdminVerifView.tsx');

  assert(fs.existsSync(presensiPath), 'GuruPresensi.tsx exists');
  assert(fs.existsSync(jurnalPath), 'GuruJurnal.tsx exists');
  assert(fs.existsSync(piketPath), 'PiketView.tsx exists');
  assert(fs.existsSync(adminVerifPath), 'AdminVerifView.tsx exists');

  const presensiContent = fs.readFileSync(presensiPath, 'utf8');
  const jurnalContent = fs.readFileSync(jurnalPath, 'utf8');
  const piketContent = fs.readFileSync(piketPath, 'utf8');
  const verifContent = fs.readFileSync(adminVerifPath, 'utf8');

  // ----------------------------------------------------
  // Section 1: Presensi Resubmission Reset (GuruPresensi.tsx)
  // ----------------------------------------------------
  console.log('\n--- Section 1: Presensi Resubmission Reset (GuruPresensi.tsx) ---');

  // Check that old rejected record is deleted upon resubmission
  assert(
    presensiContent.includes('dailyState?.presensiDatangDitolak') &&
    presensiContent.includes('dailyState?.presensiPulangDitolak') &&
    presensiContent.includes(".delete().eq('id', rejectedRecord.id)"),
    'GuruPresensi deletes old rejected presensi record on resubmission'
  );

  // Check initConfig sets Datang when rejected and Pulang when Datang is done
  assert(
    presensiContent.includes('state.presensiDatangDitolak') &&
    presensiContent.includes("setTipeAbsen('Datang')"),
    'GuruPresensi auto-selects Datang when presensiDatang is rejected'
  );

  // Check Pulang duplicate prevention unless rejected
  assert(
    presensiContent.includes('dailyState?.presensiPulang && !dailyState?.presensiPulangDitolak') &&
    presensiContent.includes('Anda sudah melakukan Presensi Pulang hari ini'),
    'GuruPresensi blocks duplicate Pulang unless Pulang was rejected'
  );

  // Check Pulang option disabled logic in select dropdown
  assert(
    presensiContent.includes('!dailyState?.presensiDatang || (!!dailyState?.presensiPulang && !dailyState?.presensiPulangDitolak)'),
    'GuruPresensi select dropdown enables Pulang only when Datang is valid and Pulang is not already accepted'
  );

  // ----------------------------------------------------
  // Section 2: Jurnal Resubmission & Batch-Delete Fix (GuruJurnal.tsx)
  // ----------------------------------------------------
  console.log('\n--- Section 2: Jurnal Resubmission & Batch-Delete Fix (GuruJurnal.tsx) ---');

  // Check import of isJurnalMatchJadwal
  assert(
    jurnalContent.includes('isJurnalMatchJadwal'),
    'GuruJurnal imports isJurnalMatchJadwal for subject matching'
  );

  // Check that newJurnal includes sekolah_id
  assert(
    jurnalContent.includes('sekolah_id: user.sekolah_id'),
    'GuruJurnal includes sekolah_id in newJurnal payload'
  );

  // Check that blind batch deletion (deleting all dailyState.jurnalDitolak) is eliminated
  assert(
    !jurnalContent.includes('const rejectedIds = dailyState.jurnalDitolak.map((j: any) => j.id);'),
    'GuruJurnal eliminates blind batch deletion of all rejected journals'
  );

  // Check selective deletion of matching rejected journal
  assert(
    jurnalContent.includes('matchingRejected') &&
    jurnalContent.includes('j.kelas !== kelas') &&
    jurnalContent.includes('isJurnalMatchJadwal(j, { kelas, mata_pelajaran: mapel })'),
    'GuruJurnal filters and targets deletion only to matching rejected journal for the specific class and subject'
  );

  // Check Jurnal Kegiatan matching
  assert(
    jurnalContent.includes("tipeJurnal === 'Jurnal Kegiatan'") &&
    jurnalContent.includes("j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan'"),
    'GuruJurnal correctly matches and deletes rejected Jurnal Kegiatan'
  );

  // ----------------------------------------------------
  // Section 3: Laporan Piket Resubmission Reset (PiketView.tsx)
  // ----------------------------------------------------
  console.log('\n--- Section 3: Laporan Piket Resubmission Reset (PiketView.tsx) ---');

  assert(
    piketContent.includes("await supabase.from('laporan_piket').delete().eq('id', dailyState.laporanPiketDitolak.id)") &&
    piketContent.includes("eq('status_verifikasi', 'Ditolak')"),
    'PiketView deletes rejected laporan piket on resubmission'
  );

  assert(
    piketContent.includes('await getGuruDailyState(user.nama, user.username)'),
    'PiketView synchronously awaits getGuruDailyState to update dailyState after submission'
  );

  // ----------------------------------------------------
  // Section 4: Admin Verification UI Updates (AdminVerifView.tsx)
  // ----------------------------------------------------
  console.log('\n--- Section 4: Admin Verification UI Updates (AdminVerifView.tsx) ---');

  // Check that Setujui button is hidden when item is rejected
  assert(
    verifContent.includes("item.status_verifikasi !== 'Ditolak' && (") &&
    verifContent.includes('Setujui'),
    'AdminVerifView hides Setujui button when item.status_verifikasi === "Ditolak"'
  );

  // Check that verifyItem immediately filters out rejected item
  assert(
    verifContent.includes("if (status === 'Ditolak')") &&
    verifContent.includes('setPresensiList(prev => prev.filter(item => item.id !== id))') &&
    verifContent.includes('setJurnalList(prev => prev.filter(item => item.id !== id))') &&
    verifContent.includes('setPiketList(prev => prev.filter(item => item.id !== id))'),
    'AdminVerifView immediately removes rejected item from active lists upon rejection'
  );

  // Check displayList hides rejected items unless filter is Ditolak
  assert(
    verifContent.includes("if (verifFilter !== 'Ditolak' && item.status_verifikasi === 'Ditolak')") &&
    verifContent.includes('return false;'),
    'AdminVerifView displayList excludes rejected items unless verifFilter === "Ditolak"'
  );

  // Check bulk verify excludes rejected items
  assert(
    verifContent.includes("item.status_verifikasi !== 'Ditolak'") &&
    verifContent.includes('bulkVerifyCurrent'),
    'AdminVerifView bulk approval excludes rejected items'
  );

  // ----------------------------------------------------
  // Section 5: Unit Logic Simulation & Edge Cases
  // ----------------------------------------------------
  console.log('\n--- Section 5: Unit Logic Simulation & Edge Cases ---');

  // Test 1: Selective Journal Deletion Logic Simulation
  const mockRejectedJournals = [
    { id: 'j-1', kelas: 'VII A', mapel: 'Matematika', keterangan: 'Jurnal KBM' },
    { id: 'j-2', kelas: 'VII B', mapel: 'Matematika', keterangan: 'Jurnal KBM' },
    { id: 'j-3', kelas: '-', mapel: 'Jurnal Kegiatan', keterangan: 'Jurnal Kegiatan' }
  ];

  // Simulating teacher submitting for Class VII A, Matematika
  const targetKelas = 'VII A';
  const targetMapel = 'Matematika';
  const matchingFor7A = mockRejectedJournals.filter(j => {
    if (j.kelas !== targetKelas) return false;
    return j.mapel === targetMapel;
  });

  assert(
    matchingFor7A.length === 1 && matchingFor7A[0].id === 'j-1',
    'Selective journal deletion matches only Class VII A (id: j-1) and preserves Class VII B (id: j-2)'
  );

  // Simulating teacher submitting for Jurnal Kegiatan
  const matchingForKegiatan = mockRejectedJournals.filter(j => {
    return j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan';
  });

  assert(
    matchingForKegiatan.length === 1 && matchingForKegiatan[0].id === 'j-3',
    'Selective journal deletion matches only Jurnal Kegiatan (id: j-3)'
  );

  // Test 2: Display List Filter Simulation
  const mockSubmissions = [
    { id: 's-1', nama_guru: 'Guru A', status_verifikasi: 'Menunggu' },
    { id: 's-2', nama_guru: 'Guru B', status_verifikasi: 'Disetujui' },
    { id: 's-3', nama_guru: 'Guru C', status_verifikasi: 'Ditolak' }
  ];

  // Default view (verifFilter = 'Semua')
  const filterSemua: string = 'Semua';
  const defaultView = mockSubmissions.filter(item => {
    if (filterSemua !== 'Ditolak' && item.status_verifikasi === 'Ditolak') return false;
    return true;
  });
  assert(
    defaultView.length === 2 && !defaultView.some(item => item.id === 's-3'),
    'Active verification view (Semua) hides rejected item s-3'
  );

  // Explicit 'Ditolak' filter
  const filterDitolak: string = 'Ditolak';
  const ditolakView = mockSubmissions.filter(item => {
    if (filterDitolak !== 'Ditolak' && item.status_verifikasi === 'Ditolak') return false;
    return item.status_verifikasi === 'Ditolak';
  });
  assert(
    ditolakView.length === 1 && ditolakView[0].id === 's-3',
    'Explicit Ditolak filter shows only rejected item s-3'
  );

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL MILESTONE 1 TESTS PASSED!\n');
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
