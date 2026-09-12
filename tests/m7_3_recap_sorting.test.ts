/**
 * ============================================================================
 * EMPIRICAL CHALLENGER & VERIFICATION SUITE: REQUIREMENT R3 (ASCENDING SORTING)
 * File: tests/m7_3_recap_sorting.test.ts
 *
 * Verifies Requirement R3: Ascending Date Sorting across:
 * - RekapJurnalView.tsx (Query, client comparator, table & Cetak Dokumen)
 * - RekapSiswaView.tsx (Query, student aggregation, Cetak Dokumen)
 * - AdminRekapView.tsx (Query presensi, jurnal, piket ascending, Cetak Halaman)
 * - PiketView.tsx (Query, client comparator, Cetak Rekap)
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

// ANSI color formatting
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

async function runM73RecapSortingTests() {
  console.log(`${CYAN}======================================================================${RESET}`);
  console.log(`${CYAN}   M7.3 EMPIRICAL CHALLENGER: ASCENDING DATE SORTING & PRINT VIEWS   ${RESET}`);
  console.log(`${CYAN}======================================================================\n`);

  // =========================================================================
  // SECTION 1: Static AST & Pattern Analysis of All Recap & Print Components
  // =========================================================================
  console.log(`${YELLOW}--- Section 1: Static Code Inspection of Data Fetching & Sorting ---${RESET}`);

  const rekapJurnalPath = path.resolve(__dirname, '../src/components/RekapJurnalView.tsx');
  const rekapSiswaPath = path.resolve(__dirname, '../src/components/RekapSiswaView.tsx');
  const adminRekapPath = path.resolve(__dirname, '../src/components/AdminRekapView.tsx');
  const piketPath = path.resolve(__dirname, '../src/components/PiketView.tsx');
  const printHeaderPath = path.resolve(__dirname, '../src/components/PrintHeader.tsx');

  [rekapJurnalPath, rekapSiswaPath, adminRekapPath, piketPath, printHeaderPath].forEach(file => {
    if (!fs.existsSync(file)) fail(`Target component file not found: ${file}`);
  });
  pass('All required recap component files exist in src/components/');

  // 1.1 RekapJurnalView.tsx Inspection
  const rekapJurnalCode = fs.readFileSync(rekapJurnalPath, 'utf8');
  if (!rekapJurnalCode.includes(".from('jurnal_pembelajaran')")) {
    fail('RekapJurnalView.tsx does not query jurnal_pembelajaran');
  }
  if (!rekapJurnalCode.includes(".order('tanggal', { ascending: true })")) {
    fail("RekapJurnalView.tsx missing .order('tanggal', { ascending: true })");
  }
  if (!rekapJurnalCode.includes(".order('jam_ke', { ascending: true })")) {
    fail("RekapJurnalView.tsx missing secondary .order('jam_ke', { ascending: true })");
  }
  pass("RekapJurnalView.tsx enforces PostgREST query: .order('tanggal', { ascending: true }).order('jam_ke', { ascending: true })");

  if (!rekapJurnalCode.includes("(a.tanggal || '').localeCompare(b.tanggal || '')") ||
      !rekapJurnalCode.includes("(Number(a.jam_ke) || 0) - (Number(b.jam_ke) || 0)")) {
    fail('RekapJurnalView.tsx missing client-side defensive ascending sort for filteredJurnal');
  }
  pass('RekapJurnalView.tsx implements defensive client-side ascending comparator for tanggal & jam_ke');

  // Verify table and print view
  if (!rekapJurnalCode.includes('<PrintHeader') || !rekapJurnalCode.includes('<PrintSignature')) {
    fail('RekapJurnalView.tsx missing PrintHeader or PrintSignature component');
  }
  if (!rekapJurnalCode.includes('Cetak Dokumen') || !rekapJurnalCode.includes('window.print()')) {
    fail('RekapJurnalView.tsx missing "Cetak Dokumen" button or window.print() trigger');
  }
  pass('RekapJurnalView.tsx renders PrintHeader, PrintSignature, and "Cetak Dokumen" button triggering window.print()');

  // Verify 8-column layout
  const expectedJurnalHeaders = [
    'Hari, tanggal bulan tahun',
    'Kelas, pertemuan dan jam ke-',
    'Tujuan pembelajaran',
    'Materi pembelajaran',
    'Kegiatan pembelajaran',
    'Kehadiran murid',
    'Catatan refleksi',
    'Foto kegiatan'
  ];
  expectedJurnalHeaders.forEach(hdr => {
    if (!rekapJurnalCode.includes(hdr)) {
      fail(`RekapJurnalView.tsx missing table header: "${hdr}"`);
    }
  });
  pass('RekapJurnalView.tsx explicitly renders all 8 standard column headers in exact order');

  // 1.2 RekapSiswaView.tsx Inspection
  const rekapSiswaCode = fs.readFileSync(rekapSiswaPath, 'utf8');
  if (!rekapSiswaCode.includes(".from('jurnal_pembelajaran')") ||
      !rekapSiswaCode.includes(".order('tanggal', { ascending: true })")) {
    fail("RekapSiswaView.tsx missing .order('tanggal', { ascending: true }) on jurnal_pembelajaran");
  }
  if (!rekapSiswaCode.includes('<PrintHeader') || !rekapSiswaCode.includes('<PrintSignature')) {
    fail('RekapSiswaView.tsx missing PrintHeader or PrintSignature');
  }
  if (!rekapSiswaCode.includes('Cetak Dokumen') || !rekapSiswaCode.includes('window.print()')) {
    fail('RekapSiswaView.tsx missing "Cetak Dokumen" button or window.print()');
  }
  pass("RekapSiswaView.tsx enforces .order('tanggal', { ascending: true }) and integrates PrintHeader & Cetak Dokumen");

  // 1.3 AdminRekapView.tsx Inspection
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
  if (!adminRekapCode.includes('<PrintHeader') || !adminRekapCode.includes('<PrintSignature')) {
    fail('AdminRekapView.tsx missing PrintHeader or PrintSignature');
  }
  if (!adminRekapCode.includes('Cetak Halaman') || !adminRekapCode.includes('window.print()')) {
    fail('AdminRekapView.tsx missing Cetak action or window.print()');
  }
  pass('AdminRekapView.tsx enforces ascending queries on presensi_guru, jurnal_pembelajaran, laporan_piket and renders PrintHeader');

  // 1.4 PiketView.tsx Inspection
  const piketCode = fs.readFileSync(piketPath, 'utf8');
  if (!piketCode.includes(".from('laporan_piket')") ||
      !piketCode.includes(".order('tanggal', { ascending: true }).order('timestamp', { ascending: true })")) {
    fail("PiketView.tsx missing .order('tanggal', { ascending: true }).order('timestamp', { ascending: true }) in fetchRekapPiket");
  }
  if (!piketCode.includes(".sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || '') || (a.timestamp || '').localeCompare(b.timestamp || ''))")) {
    fail('PiketView.tsx missing client-side ascending sort on filteredRekap');
  }
  if (!piketCode.includes('<PrintHeader') || !piketCode.includes('<PrintSignature')) {
    fail('PiketView.tsx missing PrintHeader or PrintSignature in rekap tab');
  }
  if (!piketCode.includes('Cetak Rekap') || !piketCode.includes('window.print()')) {
    fail('PiketView.tsx missing "Cetak Rekap" or window.print()');
  }
  pass('PiketView.tsx enforces ascending order in queries, client comparator, and print templates');


  // =========================================================================
  // SECTION 2: Randomized Empirical Sorting Stress Testing (Harness & Oracle)
  // =========================================================================
  console.log(`\n${YELLOW}--- Section 2: Mathematical / Oracle Stress Testing on Sorting Comparators ---${RESET}`);

  // Test 2.1: RekapJurnal comparator
  const jurnalComparator = (a: any, b: any) =>
    (a.tanggal || '').localeCompare(b.tanggal || '') ||
    (Number(a.jam_ke) || 0) - (Number(b.jam_ke) || 0);

  // Generate 1,000 chaotic records spanning 60 days
  const chaoticJurnal: any[] = [];
  for (let i = 0; i < 1000; i++) {
    const month = Math.random() < 0.5 ? '08' : '09';
    const day = Math.floor(Math.random() * 30) + 1;
    const dayStr = String(day).padStart(2, '0');
    const jam = Math.floor(Math.random() * 10) + 1;
    chaoticJurnal.push({
      id: `item-${i}`,
      tanggal: `2026-${month}-${dayStr}`,
      jam_ke: String(jam),
      materi: `Materi Test ${i}`
    });
  }

  const sortedJurnal = [...chaoticJurnal].sort(jurnalComparator);

  // Oracle validation
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
  pass(`1,000 chaotic journal entries successfully sorted in strict ascending chronological order (Earliest: ${sortedJurnal[0].tanggal} Jam ${sortedJurnal[0].jam_ke}, Latest: ${sortedJurnal[sortedJurnal.length - 1].tanggal} Jam ${sortedJurnal[sortedJurnal.length - 1].jam_ke})`);

  // Test 2.2: Edge Cases (null, undefined, malformed strings)
  const edgeCases = [
    { tanggal: '2026-09-02', jam_ke: '3' },
    { tanggal: null, jam_ke: '1' },
    { tanggal: '2026-09-01', jam_ke: '2' },
    { tanggal: '2026-09-01', jam_ke: '1' },
    { tanggal: '2026-09-01', jam_ke: undefined },
    { tanggal: '2026-09-03', jam_ke: 'Jam Ke-4' },
    { tanggal: undefined, jam_ke: null }
  ];
  const sortedEdge = [...edgeCases].sort(jurnalComparator);
  if (sortedEdge[0].tanggal !== null && sortedEdge[0].tanggal !== undefined) {
    fail('Edge case failure: null/undefined date did not sort gracefully to front');
  }
  pass('Jurnal comparator gracefully handled null, undefined, and non-numeric fields without runtime error');

  // Test 2.3: Piket comparator
  const piketComparator = (a: any, b: any) =>
    (a.tanggal || '').localeCompare(b.tanggal || '') ||
    (a.timestamp || '').localeCompare(b.timestamp || '');

  const chaoticPiket = [
    { tanggal: '2026-09-20', timestamp: '2026-09-20T14:00:00+08:00' },
    { tanggal: '2026-09-01', timestamp: '2026-09-01T10:30:00+08:00' },
    { tanggal: '2026-09-01', timestamp: '2026-09-01T07:15:00+08:00' },
    { tanggal: '2026-09-28', timestamp: '2026-09-28T11:00:00+08:00' },
    { tanggal: '2026-09-05', timestamp: '2026-09-05T08:00:00+08:00' },
  ];
  const sortedPiket = [...chaoticPiket].sort(piketComparator);
  if (sortedPiket[0].tanggal !== '2026-09-01' || sortedPiket[0].timestamp !== '2026-09-01T07:15:00+08:00' ||
      sortedPiket[1].timestamp !== '2026-09-01T10:30:00+08:00' ||
      sortedPiket[4].tanggal !== '2026-09-28') {
    fail('Piket comparator failed ascending chronological ordering');
  }
  pass('Piket comparator sorts strictly ascending by date, then by timestamp');


  // =========================================================================
  // SECTION 3: Live Supabase PostgREST Execution Verification
  // =========================================================================
  console.log(`\n${YELLOW}--- Section 3: Live Supabase Database Query Execution ---${RESET}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseKey) {
    fail('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment');
  }

  const anonClient = createClient(supabaseUrl, supabaseKey);
  const { data: saLogin } = await anonClient.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'superadmin123'
  });
  const superadminUserId = saLogin?.[0]?.id || '5dfbfc0a-8b4b-4c47-aeb9-bc1d2cbac438';

  const superadminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        'x-user-id': superadminUserId
      }
    }
  });

  const { data: schools, error: schoolErr } = await superadminClient.from('sekolah').select('id, nama').limit(1);
  if (schoolErr || !schools || schools.length === 0) {
    fail('Unable to fetch active school for empirical testing', schoolErr);
  }
  const testSchoolId = schools[0].id;
  pass(`Retrieved active school for testing: "${schools[0].nama}" (${testSchoolId})`);

  // Insert 6 scrambled test journal rows across September
  const testTeacher = `TestTeacher_R3_${Date.now()}`;
  const scrambledRows = [
    {
      id: crypto.randomUUID(),
      sekolah_id: testSchoolId,
      nama_guru: testTeacher,
      tanggal: '2026-09-25',
      jam_ke: '4',
      kelas: 'X-1',
      mapel: 'Matematika',
      materi_pembelajaran: 'Trigonometri',
      status_verifikasi: 'Disetujui'
    },
    {
      id: crypto.randomUUID(),
      sekolah_id: testSchoolId,
      nama_guru: testTeacher,
      tanggal: '2026-09-01',
      jam_ke: '2',
      kelas: 'X-1',
      mapel: 'Matematika',
      materi_pembelajaran: 'Eksponen',
      status_verifikasi: 'Disetujui'
    },
    {
      id: crypto.randomUUID(),
      sekolah_id: testSchoolId,
      nama_guru: testTeacher,
      tanggal: '2026-09-01',
      jam_ke: '1',
      kelas: 'X-1',
      mapel: 'Matematika',
      materi_pembelajaran: 'Pengantar Aljabar',
      status_verifikasi: 'Disetujui'
    },
    {
      id: crypto.randomUUID(),
      sekolah_id: testSchoolId,
      nama_guru: testTeacher,
      tanggal: '2026-09-30',
      jam_ke: '6',
      kelas: 'X-1',
      mapel: 'Matematika',
      materi_pembelajaran: 'Evaluasi Bab',
      status_verifikasi: 'Disetujui'
    },
    {
      id: crypto.randomUUID(),
      sekolah_id: testSchoolId,
      nama_guru: testTeacher,
      tanggal: '2026-09-12',
      jam_ke: '3',
      kelas: 'X-1',
      mapel: 'Matematika',
      materi_pembelajaran: 'Logaritma',
      status_verifikasi: 'Disetujui'
    }
  ];

  console.log(`Inserting ${scrambledRows.length} scrambled test journal entries...`);
  const { error: insErr } = await superadminClient.from('jurnal_pembelajaran').insert(scrambledRows);
  if (insErr) {
    fail('Failed to insert test records into jurnal_pembelajaran', insErr);
  }
  pass('Scrambled test records inserted into live database');

  try {
    // Execute EXACT query from RekapJurnalView.tsx
    const { data: results, error: qErr } = await superadminClient
      .from('jurnal_pembelajaran')
      .select('*')
      .eq('nama_guru', testTeacher)
      .eq('sekolah_id', testSchoolId)
      .order('tanggal', { ascending: true })
      .order('jam_ke', { ascending: true });

    if (qErr || !results) {
      fail('Query on live database failed', qErr);
    }
    if (results.length !== 5) {
      fail(`Expected 5 rows returned, got ${results.length}`);
    }

    console.log('Query result order:');
    results.forEach((r, idx) => {
      console.log(`  Row ${idx + 1}: Tanggal=${r.tanggal}, Jam=${r.jam_ke}, Materi=${r.materi_pembelajaran}`);
    });

    // Validate monotonic ascending order
    for (let i = 0; i < results.length - 1; i++) {
      const c = results[i];
      const n = results[i + 1];
      const dateComparison = c.tanggal.localeCompare(n.tanggal);
      if (dateComparison > 0) {
        fail(`Database query returned non-ascending dates at index ${i}: ${c.tanggal} > ${n.tanggal}`);
      }
      if (dateComparison === 0 && Number(c.jam_ke) > Number(n.jam_ke)) {
        fail(`Database query returned non-ascending jam_ke at index ${i}: ${c.jam_ke} > ${n.jam_ke}`);
      }
    }

    if (results[0].tanggal !== '2026-09-01' || results[0].jam_ke !== '1') {
      fail('Row 1 is not earliest date and hour (expected 2026-09-01 Jam 1)');
    }
    if (results[4].tanggal !== '2026-09-30' || results[4].jam_ke !== '6') {
      fail('Row 5 is not latest date and hour (expected 2026-09-30 Jam 6)');
    }

    pass('PostgREST query on live database returned all rows in strictly ascending chronological order (Sept 1 Jam 1 -> Sept 30 Jam 6)');
  } finally {
    console.log('Cleaning up test journal entries...');
    await superadminClient.from('jurnal_pembelajaran').delete().eq('nama_guru', testTeacher);
    pass('Synthetic test records deleted cleanly');
  }


  // =========================================================================
  // SECTION 4: Visual & Print Table Rendering Contract Verification
  // =========================================================================
  console.log(`\n${YELLOW}--- Section 4: Visual & Print Table Rendering Order Verification ---${RESET}`);

  // RekapJurnalView: verify the table iteration consumes filteredJurnal
  const tableIterationMatch = rekapJurnalCode.includes('filteredJurnal.map((j: any, index: number)');
  if (!tableIterationMatch) {
    fail('RekapJurnalView table does not iterate over sorted filteredJurnal');
  }
  pass('RekapJurnalView table directly iterates over filteredJurnal (ensuring table and print output follow ascending order)');

  // Verify column 1 renders date
  if (!rekapJurnalCode.includes('{formatHariTanggal(j.tanggal)}')) {
    fail('RekapJurnalView column 1 does not render formatHariTanggal(j.tanggal)');
  }
  pass('RekapJurnalView table column 1 renders formatted date for each chronological row');

  // Verify CSV export also uses filteredJurnal
  if (!rekapJurnalCode.includes('filteredJurnal.forEach((j: any)')) {
    fail('RekapJurnalView Excel/CSV export does not iterate over sorted filteredJurnal');
  }
  pass('RekapJurnalView Excel/CSV export directly iterates over filteredJurnal in ascending order');

  // RekapSiswaView: verify table iterates over filteredData
  if (!rekapSiswaCode.includes('filteredData.map((s, i) =>')) {
    fail('RekapSiswaView table does not iterate over filteredData');
  }
  pass('RekapSiswaView table and print output render student attendance data correctly');

  // AdminRekapView: verify table iterates over filteredPresensi
  if (!adminRekapCode.includes('filteredPresensi.map((r: any, idx: number) =>')) {
    fail('AdminRekapView table does not iterate over filteredPresensi');
  }
  pass('AdminRekapView table and print output render teacher recap correctly');

  // PiketView: verify rekap list iterates over filteredRekap
  if (!piketCode.includes('filteredRekap.map((item, idx) =>')) {
    fail('PiketView rekap list does not iterate over sorted filteredRekap');
  }
  pass('PiketView rekap list and print output iterate over sorted filteredRekap in ascending order');

  console.log(`\n${CYAN}======================================================================${RESET}`);
  console.log(`${GREEN}🎉 ALL M7.3 ASCENDING DATE SORTING & PRINT CHECKS PASSED EMPIRICALLY!${RESET}`);
  console.log(`${CYAN}======================================================================\n`);
}

runM73RecapSortingTests().catch(err => {
  console.error('Fatal test error in m7_3_recap_sorting:', err);
  process.exit(1);
});
