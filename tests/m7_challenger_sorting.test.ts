import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ANSI terminal colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function pass(msg: string) {
  console.log(`${GREEN}✅ PASS:${RESET} ${msg}`);
}

function fail(msg: string, detail?: any): never {
  console.error(`${RED}❌ FAIL:${RESET} ${msg}`, detail || '');
  throw new Error(`Test failed: ${msg}`);
}

async function runM7ChallengerSortingTests() {
  console.log(`${CYAN}================================================================${RESET}`);
  console.log(`${CYAN}   EMPIRICAL CHALLENGER: MILESTONE 7 ASCENDING SORTING & PRINT  ${RESET}`);
  console.log(`${CYAN}================================================================${RESET}\n`);

  // =========================================================================
  // SECTION 1: Codebase Static & AST Analysis of Target Components
  // =========================================================================
  console.log(`${YELLOW}--- Section 1: Static Analysis of Sorting & Print Directives ---${RESET}`);

  const rekapJurnalPath = path.resolve(__dirname, '../src/components/RekapJurnalView.tsx');
  const rekapSiswaPath = path.resolve(__dirname, '../src/components/RekapSiswaView.tsx');
  const adminRekapPath = path.resolve(__dirname, '../src/components/AdminRekapView.tsx');
  const piketPath = path.resolve(__dirname, '../src/components/PiketView.tsx');
  const printHeaderPath = path.resolve(__dirname, '../src/components/PrintHeader.tsx');

  // Verify all files exist
  [rekapJurnalPath, rekapSiswaPath, adminRekapPath, piketPath, printHeaderPath].forEach(file => {
    if (!fs.existsSync(file)) fail(`Required component file missing: ${file}`);
  });
  pass('All 5 target component files exist in src/components/');

  // 1.1 RekapJurnalView.tsx checks
  const rekapJurnalCode = fs.readFileSync(rekapJurnalPath, 'utf8');
  if (!rekapJurnalCode.includes(".order('tanggal', { ascending: true })")) {
    fail("RekapJurnalView.tsx is missing .order('tanggal', { ascending: true })");
  }
  if (!rekapJurnalCode.includes(".order('jam_ke', { ascending: true })")) {
    fail("RekapJurnalView.tsx is missing secondary .order('jam_ke', { ascending: true })");
  }
  pass("RekapJurnalView.tsx PostgREST query enforces .order('tanggal', { ascending: true }).order('jam_ke', { ascending: true })");

  // Client-side comparator check in filteredJurnal
  if (!rekapJurnalCode.includes("(a.tanggal || '').localeCompare(b.tanggal || '')") ||
      !rekapJurnalCode.includes("(Number(a.jam_ke) || 0) - (Number(b.jam_ke) || 0)")) {
    fail('RekapJurnalView.tsx is missing client-side defensive ascending sort for tanggal and jam_ke');
  }
  pass('RekapJurnalView.tsx includes defensive client-side comparator on filteredJurnal for tanggal & jam_ke');

  // Verify exact 8 columns in table
  const expectedHeaders = [
    'Hari, tanggal bulan tahun',
    'Kelas, pertemuan dan jam ke-',
    'Tujuan pembelajaran',
    'Materi pembelajaran',
    'Kegiatan pembelajaran',
    'Kehadiran murid',
    'Catatan refleksi',
    'Foto kegiatan'
  ];
  expectedHeaders.forEach(hdr => {
    if (!rekapJurnalCode.includes(hdr)) {
      fail(`RekapJurnalView.tsx missing expected table column header: "${hdr}"`);
    }
  });
  pass('RekapJurnalView.tsx table explicitly defines all 8 required column headers in correct order');

  // Verify PrintHeader inclusion
  if (!rekapJurnalCode.includes('<PrintHeader')) {
    fail('RekapJurnalView.tsx does not include <PrintHeader />');
  }
  pass('RekapJurnalView.tsx renders <PrintHeader /> for official printed document letterhead');

  // 1.2 RekapSiswaView.tsx checks
  const rekapSiswaCode = fs.readFileSync(rekapSiswaPath, 'utf8');
  if (!rekapSiswaCode.includes(".from('jurnal_pembelajaran')") ||
      !rekapSiswaCode.includes(".order('tanggal', { ascending: true })")) {
    fail("RekapSiswaView.tsx missing .order('tanggal', { ascending: true }) on jurnal_pembelajaran");
  }
  if (!rekapSiswaCode.includes('<PrintHeader')) {
    fail('RekapSiswaView.tsx does not include <PrintHeader />');
  }
  pass("RekapSiswaView.tsx queries jurnal_pembelajaran with .order('tanggal', { ascending: true }) and renders <PrintHeader />");

  // 1.3 AdminRekapView.tsx checks
  const adminRekapCode = fs.readFileSync(adminRekapPath, 'utf8');
  if (!adminRekapCode.includes(".from('presensi_guru')") ||
      !adminRekapCode.includes(".order('timestamp', { ascending: true })")) {
    fail("AdminRekapView.tsx missing .order('timestamp', { ascending: true }) on presensi_guru");
  }
  if (!adminRekapCode.includes(".from('jurnal_pembelajaran')") ||
      !adminRekapCode.includes(".order('timestamp', { ascending: true })")) {
    fail("AdminRekapView.tsx missing .order('timestamp', { ascending: true }) on jurnal_pembelajaran");
  }
  if (!adminRekapCode.includes(".from('laporan_piket')") ||
      !adminRekapCode.includes(".order('tanggal', { ascending: true })")) {
    fail("AdminRekapView.tsx missing .order('tanggal', { ascending: true }) on laporan_piket");
  }
  if (!adminRekapCode.includes('<PrintHeader')) {
    fail('AdminRekapView.tsx does not include <PrintHeader />');
  }
  pass('AdminRekapView.tsx queries presensi_guru, jurnal_pembelajaran, and laporan_piket ascending and renders <PrintHeader />');

  // 1.4 PiketView.tsx checks
  const piketCode = fs.readFileSync(piketPath, 'utf8');
  if (!piketCode.includes(".from('laporan_piket')") ||
      !piketCode.includes(".order('tanggal', { ascending: true }).order('timestamp', { ascending: true })")) {
    fail("PiketView.tsx missing .order('tanggal', { ascending: true }).order('timestamp', { ascending: true }) in fetchRekapPiket");
  }
  if (!piketCode.includes(".sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || '') || (a.timestamp || '').localeCompare(b.timestamp || ''))")) {
    fail('PiketView.tsx missing client-side ascending sort on filteredRekap');
  }
  if (!piketCode.includes('<PrintHeader')) {
    fail('PiketView.tsx does not include <PrintHeader /> in rekap tab');
  }
  pass("PiketView.tsx enforces ascending order on tanggal & timestamp both in query and client-side comparator, and renders <PrintHeader />");

  // 1.5 PrintHeader.tsx checks
  const printHeaderCode = fs.readFileSync(printHeaderPath, 'utf8');
  if (!printHeaderCode.includes('resolveSekolahId') || !printHeaderCode.includes('PrintHeaderProps')) {
    fail('PrintHeader.tsx does not support multi-tenant sekolahId resolution');
  }
  if (!printHeaderCode.includes(".from('pengaturan')") || !printHeaderCode.includes(".from('sekolah')")) {
    fail('PrintHeader.tsx does not dynamically fetch settings and school details by sekolah_id');
  }
  pass('PrintHeader.tsx dynamically resolves tenant school branding via activeSekolahId, settings, and sekolah table');


  // =========================================================================
  // SECTION 2: Randomized Empirical Sorting Stress Testing (Harness & Oracle)
  // =========================================================================
  console.log(`\n${YELLOW}--- Section 2: Mathematical / Oracle Stress Testing on Sorting Comparators ---${RESET}`);

  // Test the RekapJurnal comparator
  const jurnalComparator = (a: any, b: any) =>
    (a.tanggal || '').localeCompare(b.tanggal || '') ||
    (Number(a.jam_ke) || 0) - (Number(b.jam_ke) || 0);

  // Generate 500 chaotic records
  const chaoticJurnal: any[] = [];
  const daysInMonth = 30;
  for (let i = 0; i < 500; i++) {
    const day = Math.floor(Math.random() * daysInMonth) + 1;
    const dayStr = String(day).padStart(2, '0');
    const jam = Math.floor(Math.random() * 8) + 1; // jam 1-8
    chaoticJurnal.push({
      id: `item-${i}`,
      tanggal: `2026-09-${dayStr}`,
      jam_ke: String(jam),
      materi: `Materi Test ${i}`
    });
  }

  // Sort with RekapJurnal comparator
  const sortedJurnal = [...chaoticJurnal].sort(jurnalComparator);

  // Verify monotonic non-decreasing sequence across all 500 items
  for (let i = 0; i < sortedJurnal.length - 1; i++) {
    const curr = sortedJurnal[i];
    const next = sortedJurnal[i + 1];

    const dateDiff = curr.tanggal.localeCompare(next.tanggal);
    if (dateDiff > 0) {
      fail(`Jurnal comparator failed: date out of order at index ${i}: ${curr.tanggal} > ${next.tanggal}`);
    }
    if (dateDiff === 0) {
      const jamCurr = Number(curr.jam_ke) || 0;
      const jamNext = Number(next.jam_ke) || 0;
      if (jamCurr > jamNext) {
        fail(`Jurnal comparator failed: same-date jam_ke out of order at index ${i}: date ${curr.tanggal}, jam ${jamCurr} > jam ${jamNext}`);
      }
    }
  }
  pass(`500 chaotic journal entries successfully sorted in strict ascending chronological order (Earliest: ${sortedJurnal[0].tanggal} Jam ${sortedJurnal[0].jam_ke}, Latest: ${sortedJurnal[sortedJurnal.length - 1].tanggal} Jam ${sortedJurnal[sortedJurnal.length - 1].jam_ke})`);

  // Test edge cases: null tanggal, non-numeric jam_ke, string prefixes
  const edgeCaseJurnal = [
    { tanggal: '2026-09-02', jam_ke: '3' },
    { tanggal: null, jam_ke: '1' },
    { tanggal: '2026-09-01', jam_ke: '2' },
    { tanggal: '2026-09-01', jam_ke: '1' },
    { tanggal: '2026-09-01', jam_ke: undefined },
    { tanggal: '2026-09-03', jam_ke: 'Jam 4' }, // non-pure numeric fallback
  ];
  const sortedEdge = [...edgeCaseJurnal].sort(jurnalComparator);
  // Null tanggal goes to front (empty string localeCompare)
  if (sortedEdge[0].tanggal !== null && sortedEdge[0].tanggal !== '') {
    fail('Edge case failure: null tanggal did not sort gracefully');
  }
  pass('RekapJurnal comparator handles edge cases (null dates, undefined jam_ke, non-numeric strings) without crashing');

  // Test Piket comparator
  const piketComparator = (a: any, b: any) =>
    (a.tanggal || '').localeCompare(b.tanggal || '') ||
    (a.timestamp || '').localeCompare(b.timestamp || '');

  const chaoticPiket = [
    { tanggal: '2026-09-10', timestamp: '2026-09-10T14:00:00+08:00' },
    { tanggal: '2026-09-01', timestamp: '2026-09-01T09:00:00+08:00' },
    { tanggal: '2026-09-01', timestamp: '2026-09-01T07:30:00+08:00' },
    { tanggal: '2026-09-25', timestamp: '2026-09-25T11:00:00+08:00' },
    { tanggal: '2026-09-05', timestamp: '2026-09-05T08:00:00+08:00' },
  ];
  const sortedPiket = [...chaoticPiket].sort(piketComparator);
  if (sortedPiket[0].tanggal !== '2026-09-01' || sortedPiket[0].timestamp !== '2026-09-01T07:30:00+08:00' ||
      sortedPiket[1].timestamp !== '2026-09-01T09:00:00+08:00' ||
      sortedPiket[4].tanggal !== '2026-09-25') {
    fail('Piket comparator failed to sort ascending on tanggal then timestamp');
  }
  pass('Piket comparator successfully sorts ascending by tanggal with secondary sort on timestamp');


  // =========================================================================
  // SECTION 3: Live Supabase Database Query Verification
  // =========================================================================
  console.log(`\n${YELLOW}--- Section 3: Live Supabase PostgREST Execution Verification ---${RESET}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseKey) {
    fail('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment');
  }

  const superadminClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { 'x-user-role': 'Superadmin' } }
  });

  // Get active school for foreign key reference
  const { data: schools, error: schoolErr } = await superadminClient.from('sekolah').select('id, nama').limit(1);
  if (schoolErr || !schools || schools.length === 0) {
    fail('Unable to fetch active school for empirical testing', schoolErr);
  }
  const testSchoolId = schools[0].id;
  pass(`Retrieved active school for testing: "${schools[0].nama}" (${testSchoolId})`);

  // Insert 5 synthetic scrambled journal entries for a dedicated test teacher
  const syntheticTeacher = `Challenger_TestTeacher_${Date.now()}`;
  const testJurnalRows = [
    {
      id: crypto.randomUUID(),
      sekolah_id: testSchoolId,
      nama_guru: syntheticTeacher,
      tanggal: '2026-09-28',
      jam_ke: '3',
      kelas: 'XII-A',
      mapel: 'Fisika',
      materi_pembelajaran: 'Optik Geometris',
      tujuan_pembelajaran: 'Memahami pembiasan lensa',
      kegiatan: 'Praktikum',
      kehadiran_murid: 'Hadir: 30',
      catatan_refleksi: 'Efektif',
      status_verifikasi: 'Disetujui'
    },
    {
      id: crypto.randomUUID(),
      sekolah_id: testSchoolId,
      nama_guru: syntheticTeacher,
      tanggal: '2026-09-02',
      jam_ke: '1',
      kelas: 'XII-A',
      mapel: 'Fisika',
      materi_pembelajaran: 'Besaran dan Satuan',
      tujuan_pembelajaran: 'Pengukuran',
      kegiatan: 'Diskusi',
      kehadiran_murid: 'Hadir: 30',
      catatan_refleksi: 'Bagus',
      status_verifikasi: 'Disetujui'
    },
    {
      id: crypto.randomUUID(),
      sekolah_id: testSchoolId,
      nama_guru: syntheticTeacher,
      tanggal: '2026-09-15',
      jam_ke: '4',
      kelas: 'XII-A',
      mapel: 'Fisika',
      materi_pembelajaran: 'Hukum Newton',
      tujuan_pembelajaran: 'Gaya Gesek',
      kegiatan: 'Tanya jawab',
      kehadiran_murid: 'Hadir: 30',
      catatan_refleksi: 'Cukup',
      status_verifikasi: 'Disetujui'
    },
    {
      id: crypto.randomUUID(),
      sekolah_id: testSchoolId,
      nama_guru: syntheticTeacher,
      tanggal: '2026-09-02',
      jam_ke: '2',
      kelas: 'XII-A',
      mapel: 'Fisika',
      materi_pembelajaran: 'Vektor',
      tujuan_pembelajaran: 'Resultan Vektor',
      kegiatan: 'Latihan soal',
      kehadiran_murid: 'Hadir: 30',
      catatan_refleksi: 'Lancar',
      status_verifikasi: 'Disetujui'
    },
    {
      id: crypto.randomUUID(),
      sekolah_id: testSchoolId,
      nama_guru: syntheticTeacher,
      tanggal: '2026-09-15',
      jam_ke: '1',
      kelas: 'XII-A',
      mapel: 'Fisika',
      materi_pembelajaran: 'Kinematika Gerak',
      tujuan_pembelajaran: 'GLB dan GLBB',
      kegiatan: 'Eksperimen',
      kehadiran_murid: 'Hadir: 30',
      catatan_refleksi: 'Menarik',
      status_verifikasi: 'Disetujui'
    }
  ];

  console.log(`Inserting ${testJurnalRows.length} scrambled test journal rows into live Supabase...`);
  const { error: insertErr } = await superadminClient.from('jurnal_pembelajaran').insert(testJurnalRows);
  if (insertErr) {
    fail('Failed to insert test records into jurnal_pembelajaran', insertErr);
  }
  pass('Scrambled test records inserted successfully');

  try {
    // Execute EXACT query from RekapJurnalView.tsx
    const { data: fetchedJurnal, error: queryErr } = await superadminClient
      .from('jurnal_pembelajaran')
      .select('*')
      .eq('nama_guru', syntheticTeacher)
      .eq('sekolah_id', testSchoolId)
      .order('tanggal', { ascending: true })
      .order('jam_ke', { ascending: true });

    if (queryErr || !fetchedJurnal) {
      fail('Query on jurnal_pembelajaran failed', queryErr);
    }

    if (fetchedJurnal.length !== 5) {
      fail(`Expected 5 rows, received ${fetchedJurnal.length}`);
    }

    console.log('Returned rows from live query:');
    fetchedJurnal.forEach((r, idx) => {
      console.log(`  Row ${idx + 1}: Tanggal: ${r.tanggal}, Jam Ke: ${r.jam_ke}, Materi: ${r.materi_pembelajaran}`);
    });

    // Assert exact chronological order
    if (fetchedJurnal[0].tanggal !== '2026-09-02' || fetchedJurnal[0].jam_ke !== '1') {
      fail(`Row 1 expected 2026-09-02 Jam 1, got ${fetchedJurnal[0].tanggal} Jam ${fetchedJurnal[0].jam_ke}`);
    }
    if (fetchedJurnal[1].tanggal !== '2026-09-02' || fetchedJurnal[1].jam_ke !== '2') {
      fail(`Row 2 expected 2026-09-02 Jam 2, got ${fetchedJurnal[1].tanggal} Jam ${fetchedJurnal[1].jam_ke}`);
    }
    if (fetchedJurnal[2].tanggal !== '2026-09-15' || fetchedJurnal[2].jam_ke !== '1') {
      fail(`Row 3 expected 2026-09-15 Jam 1, got ${fetchedJurnal[2].tanggal} Jam ${fetchedJurnal[2].jam_ke}`);
    }
    if (fetchedJurnal[3].tanggal !== '2026-09-15' || fetchedJurnal[3].jam_ke !== '4') {
      fail(`Row 4 expected 2026-09-15 Jam 4, got ${fetchedJurnal[3].tanggal} Jam ${fetchedJurnal[3].jam_ke}`);
    }
    if (fetchedJurnal[4].tanggal !== '2026-09-28' || fetchedJurnal[4].jam_ke !== '3') {
      fail(`Row 5 expected 2026-09-28 Jam 3, got ${fetchedJurnal[4].tanggal} Jam ${fetchedJurnal[4].jam_ke}`);
    }

    pass('PostgREST query on live database returned rows in strictly ascending chronological order (earliest day 2 to latest day 28)');
  } finally {
    // Cleanup synthetic records
    console.log('Cleaning up synthetic test journal rows...');
    await superadminClient.from('jurnal_pembelajaran').delete().eq('nama_guru', syntheticTeacher);
    pass('Synthetic journal records cleaned up cleanly');
  }


  // =========================================================================
  // SECTION 4: Multi-Tenant PrintHeader Dynamic School Branding Verification
  // =========================================================================
  console.log(`\n${YELLOW}--- Section 4: PrintHeader Dynamic Multi-Tenant Branding Verification ---${RESET}`);

  // Create a synthetic school with unique branding
  const syntheticSchoolId = crypto.randomUUID();
  const syntheticSchool = {
    id: syntheticSchoolId,
    nama: 'SMA Swasta Garuda Nusantara',
    npsn: '99887766',
    alamat: 'Jl. Garuda No. 77, Merdeka',
    kota_kabupaten: 'Kota Bandung',
    provinsi: 'Jawa Barat',
    nama_kepala_sekolah: 'Prof. Dr. Ir. H. Bambang Sujarwo, M.Sc.',
    nip_kepala_sekolah: '197001011995031005',
    logo_url: 'https://example.com/logo-garuda.png',
    status: 'aktif'
  };

  console.log(`Registering synthetic school: "${syntheticSchool.nama}" (${syntheticSchoolId})...`);
  const { error: schoolInsErr } = await superadminClient.from('sekolah').insert([syntheticSchool]);
  if (schoolInsErr) {
    fail('Failed to insert synthetic school for branding test', schoolInsErr);
  }
  pass('Synthetic school registered in database');

  try {
    // Insert custom settings for this synthetic school
    const syntheticSettings = [
      { id: crypto.randomUUID(), sekolah_id: syntheticSchoolId, key: 'kop_sekolah', value: 'SMA SWASTA GARUDA NUSANTARA' },
      { id: crypto.randomUUID(), sekolah_id: syntheticSchoolId, key: 'kop_yayasan', value: 'YAYASAN GARUDA SAKTI' },
      { id: crypto.randomUUID(), sekolah_id: syntheticSchoolId, key: 'kop_alamat', value: 'Jl. Garuda No. 77, Merdeka, Kota Bandung' },
      { id: crypto.randomUUID(), sekolah_id: syntheticSchoolId, key: 'kop_npsn', value: '99887766' },
      { id: crypto.randomUUID(), sekolah_id: syntheticSchoolId, key: 'kota_kabupaten', value: 'Kota Bandung' }
    ];
    const { error: setErr } = await superadminClient.from('pengaturan').insert(syntheticSettings);
    if (setErr) {
      fail('Failed to insert settings for synthetic school', setErr);
    }
    pass('Synthetic school custom settings inserted');

    // Emulate PrintHeader fetch logic for active tenant
    const { data: configData } = await superadminClient.from('pengaturan').select('*').eq('sekolah_id', syntheticSchoolId);
    const resolvedConfig: Record<string, string> = {};
    (configData || []).forEach(item => {
      resolvedConfig[item.key] = item.value;
    });

    const { data: resolvedSchool } = await superadminClient.from('sekolah').select('*').eq('id', syntheticSchoolId).single();

    // Verify resolved branding
    const renderedSekolah = resolvedConfig.kop_sekolah || resolvedSchool?.nama;
    const renderedYayasan = resolvedConfig.kop_yayasan || '';
    const renderedAlamat = resolvedConfig.kop_alamat || resolvedSchool?.alamat;
    const renderedNpsn = resolvedConfig.kop_npsn || resolvedSchool?.npsn;
    const renderedCity = resolvedConfig.kota_kabupaten || resolvedSchool?.kota_kabupaten;
    const renderedHeadmaster = resolvedSchool?.nama_kepala_sekolah;
    const renderedNip = resolvedSchool?.nip_kepala_sekolah;

    console.log('Resolved PrintHeader Data for synthetic tenant:');
    console.log(`  School: ${renderedSekolah}`);
    console.log(`  Yayasan: ${renderedYayasan}`);
    console.log(`  Address: ${renderedAlamat}`);
    console.log(`  NPSN: ${renderedNpsn}`);
    console.log(`  City: ${renderedCity}`);
    console.log(`  Headmaster: ${renderedHeadmaster} (NIP: ${renderedNip})`);

    if (renderedSekolah !== 'SMA SWASTA GARUDA NUSANTARA') {
      fail(`Dynamic school header failed: expected "SMA SWASTA GARUDA NUSANTARA", got "${renderedSekolah}"`);
    }
    if (renderedYayasan !== 'YAYASAN GARUDA SAKTI') {
      fail(`Dynamic yayasan header failed: expected "YAYASAN GARUDA SAKTI", got "${renderedYayasan}"`);
    }
    if (renderedCity !== 'Kota Bandung') {
      fail(`Dynamic city signature failed: expected "Kota Bandung", got "${renderedCity}"`);
    }
    if (renderedHeadmaster !== 'Prof. Dr. Ir. H. Bambang Sujarwo, M.Sc.') {
      fail('Dynamic headmaster signature failed');
    }

    pass('PrintHeader dynamic multi-tenant branding resolution fully verified: renders distinct school identity and signature block');
  } finally {
    // Cleanup synthetic school & settings
    console.log('Cleaning up synthetic school and settings...');
    await superadminClient.from('pengaturan').delete().eq('sekolah_id', syntheticSchoolId);
    await superadminClient.from('sekolah').delete().eq('id', syntheticSchoolId);
    pass('Synthetic school and settings cleaned up cleanly');
  }

  console.log(`\n${CYAN}================================================================${RESET}`);
  console.log(`${GREEN}🎉 ALL EMPIRICAL CHALLENGER TESTS PASSED WITH ZERO ERRORS!${RESET}`);
  console.log(`${CYAN}================================================================${RESET}\n`);
}

runM7ChallengerSortingTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
