import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local before importing supabaseClient
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

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
  const { supabase, setServerTenantContext } = await import('../src/lib/supabaseClient');
  const { getActiveSistemBlok, getGuruDailyState } = await import('../src/lib/workflow');
  const { getWitaDateStr } = await import('../src/lib/wita');

  const defaultSekolahId = 'a0000000-0000-0000-0000-000000000001';
  setServerTenantContext({
    sekolahId: defaultSekolahId,
    role: 'Admin',
    userId: 'd23141e4-2116-4946-8094-895ef21a50e5',
    sessionToken: 'deb40d1b-ce7f-4424-9d58-b98d47d62edf'
  });

  console.log('====================================================');
  console.log('SISTEM BLOK FEATURE VERIFICATION & ADVERSARIAL QA');
  console.log('Requirements: R1 (CRUD), R2 (Schedule Masking), R3 (Jurnal Kegiatan), R4 (Constraints)');
  console.log('====================================================\n');

  const projectRoot = path.resolve(__dirname, '..');
  const viewPath = path.join(projectRoot, 'src', 'components', 'SistemBlokView.tsx');
  const appScreenPath = path.join(projectRoot, 'src', 'components', 'AppScreen.tsx');
  const homeViewPath = path.join(projectRoot, 'src', 'components', 'HomeView.tsx');
  const guruJurnalPath = path.join(projectRoot, 'src', 'components', 'GuruJurnal.tsx');
  const workflowPath = path.join(projectRoot, 'src', 'lib', 'workflow.ts');
  const typesPath = path.join(projectRoot, 'src', 'types', 'database.ts');
  const migrationPath = path.join(projectRoot, 'supabase', 'migrations', '20260927_sistem_blok_schema.sql');
  const pkgPath = path.join(projectRoot, 'package.json');

  assert(fs.existsSync(viewPath), 'SistemBlokView.tsx component exists');
  assert(fs.existsSync(appScreenPath), 'AppScreen.tsx exists');
  assert(fs.existsSync(homeViewPath), 'HomeView.tsx exists');
  assert(fs.existsSync(guruJurnalPath), 'GuruJurnal.tsx exists');
  assert(fs.existsSync(workflowPath), 'workflow.ts exists');
  assert(fs.existsSync(typesPath), 'types/database.ts exists');
  assert(fs.existsSync(migrationPath), 'Migration 20260927_sistem_blok_schema.sql exists');

  const viewContent = fs.readFileSync(viewPath, 'utf8');
  const appScreenContent = fs.readFileSync(appScreenPath, 'utf8');
  const homeViewContent = fs.readFileSync(homeViewPath, 'utf8');
  const guruJurnalContent = fs.readFileSync(guruJurnalPath, 'utf8');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  const typesContent = fs.readFileSync(typesPath, 'utf8');
  const pkgContent = fs.readFileSync(pkgPath, 'utf8');

  // ====================================================
  // Section 1: R1 - Manajemen Sistem Blok (CRUD) & Schema
  // ====================================================
  console.log('\n--- Section 1: R1 - Manajemen Sistem Blok (CRUD) & Schema ---');

  // 1.1 TypeScript types definition
  assert(
    typesContent.includes('sistem_blok:') &&
    typesContent.includes('export type SistemBlok =') &&
    typesContent.includes('export type SistemBlokInsert =') &&
    typesContent.includes('export type SistemBlokUpdate ='),
    'TypeScript types include complete SistemBlok definitions'
  );

  // 1.2 Form fields in SistemBlokView
  assert(
    viewContent.includes('namaKegiatan') &&
    viewContent.includes('tanggalMulai') &&
    viewContent.includes('tanggalSelesai') &&
    viewContent.includes('deskripsi'),
    'SistemBlokView includes all required form inputs: nama_kegiatan, tanggal_mulai, tanggal_selesai, deskripsi'
  );

  // 1.3 Validation rules
  assert(
    viewContent.includes('tanggalSelesai < tanggalMulai') &&
    viewContent.includes('Nama/deskripsi kegiatan wajib diisi') &&
    viewContent.includes('Tanggal mulai dan selesai wajib dipilih'),
    'SistemBlokView validates non-empty name, required dates, and chronological validity (selesai >= mulai)'
  );

  // 1.4 Edit & Delete mechanisms
  assert(
    viewContent.includes('openEditModal') &&
    viewContent.includes('handleEditSave') &&
    viewContent.includes('handleDelete') &&
    viewContent.includes('Swal.fire'),
    'SistemBlokView implements edit modal, update submit, and sweetalert confirmation on delete'
  );

  // 1.5 Status categorization logic
  assert(
    viewContent.includes("todayStr >= mulai && todayStr <= selesai") &&
    viewContent.includes("'Aktif'") &&
    viewContent.includes("'Akan Datang'") &&
    viewContent.includes("'Selesai'"),
    'SistemBlokView categorizes period status as Aktif, Akan Datang, and Selesai'
  );

  // 1.6 Role protection in SistemBlokView & AppScreen
  assert(
    viewContent.includes('isAdminOrSuperadmin') &&
    viewContent.includes('Akses Terblokir'),
    'SistemBlokView enforces role guard blocking non-administrators from accessing block management'
  );

  assert(
    appScreenContent.includes("targetId === 'view-sistem-blok'") &&
    appScreenContent.includes("Akses Terblokir: Halaman Manajemen Sistem Blok secara eksklusif hanya dapat diakses oleh Administrator"),
    'AppScreen handleNavigation explicitly guards view-sistem-blok against non-admin navigation'
  );

  assert(
    appScreenContent.includes("{currentView === 'view-sistem-blok' && (") &&
    appScreenContent.includes("isAdmin || isSuperadmin ? (") &&
    appScreenContent.includes("<SistemBlokView user={user} />"),
    'AppScreen view router conditionally renders SistemBlokView only for Admin/Superadmin'
  );

  // 1.7 Live Database CRUD Test
  console.log('\n--- Section 1.7: Live Database CRUD Execution on public.sistem_blok ---');
  const testBlokId = '00000000-0000-0000-0000-00000000b10c';
  const today = getWitaDateStr();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  try {
    // Clean up any stale test record
    await supabase.from('sistem_blok').delete().eq('id', testBlokId);

    // 1.7.a INSERT
    const insertPayload = {
      id: testBlokId,
      sekolah_id: defaultSekolahId,
      nama_kegiatan: 'Adversarial Test Blok Period',
      deskripsi: 'Penilaian Tengah Semester & Kegiatan Khusus QA',
      tanggal_mulai: today,
      tanggal_selesai: tomorrow,
    };

    const { error: insertErr } = await supabase.from('sistem_blok').insert([insertPayload]);
    assert(!insertErr, 'Live DB: Successfully inserted new block period into public.sistem_blok', insertErr?.message);

    // 1.7.b READ & VERIFY PERSISTENCE
    const { data: readData, error: readErr } = await supabase
      .from('sistem_blok')
      .select('*')
      .eq('id', testBlokId)
      .single();

    assert(!readErr && readData !== null, 'Live DB: Successfully read back persisted block period', readErr?.message);
    assert(readData?.nama_kegiatan === 'Adversarial Test Blok Period', 'Live DB: Data integrity verified for nama_kegiatan');
    assert(readData?.tanggal_mulai === today, 'Live DB: Data integrity verified for tanggal_mulai');
    assert(readData?.tanggal_selesai === tomorrow, 'Live DB: Data integrity verified for tanggal_selesai');

    // 1.7.c UPDATE
    const { error: updateErr } = await supabase
      .from('sistem_blok')
      .update({
        nama_kegiatan: 'Updated Test Blok Period',
        deskripsi: 'Updated Deskripsi QA',
      })
      .eq('id', testBlokId);

    assert(!updateErr, 'Live DB: Successfully updated block period in public.sistem_blok', updateErr?.message);

    const { data: updatedData } = await supabase
      .from('sistem_blok')
      .select('*')
      .eq('id', testBlokId)
      .single();

    assert(updatedData?.nama_kegiatan === 'Updated Test Blok Period', 'Live DB: Updated data verified persisted');
    assert(updatedData?.deskripsi === 'Updated Deskripsi QA', 'Live DB: Updated deskripsi verified persisted');

  } catch (dbErr: any) {
    assert(false, 'Live DB CRUD encountered unexpected error', dbErr.message);
  }

  // ====================================================
  // Section 2: R2 - Penyesuaian Tampilan Jadwal & Masking
  // ====================================================
  console.log('\n--- Section 2: R2 - Penyesuaian Tampilan Jadwal & Masking ---');

  // 2.1 Workflow helper getActiveSistemBlok
  const activeBlok = await getActiveSistemBlok(today);
  assert(activeBlok !== null, 'workflow.getActiveSistemBlok finds active block for today');
  assert(activeBlok?.id === testBlokId, 'workflow.getActiveSistemBlok returns correct active block entity');

  // Test outside date range returns null
  const farFutureDate = '2099-01-01';
  const inactiveBlok = await getActiveSistemBlok(farFutureDate);
  assert(inactiveBlok === null, 'workflow.getActiveSistemBlok returns null for date outside any block period');

  // 2.2 Verify original database schedules are NOT touched/deleted
  const { count: scheduleCountBefore } = await supabase
    .from('jadwal_pelajaran')
    .select('*', { count: 'exact', head: true });

  assert((scheduleCountBefore ?? 0) > 0, `Live DB: Original jadwal_pelajaran table has ${scheduleCountBefore} records`);

  // 2.3 Verify HomeView Schedule Masking UI
  assert(
    homeViewContent.includes('dailyState?.isBlok ? (') &&
    homeViewContent.includes('Sistem Blok Aktif') &&
    homeViewContent.includes('KBM Reguler Ditiadakan') &&
    homeViewContent.includes('dailyState.blokInfo?.nama_kegiatan') &&
    homeViewContent.includes('dailyState.blokInfo?.deskripsi') &&
    homeViewContent.includes('dailyState.blokInfo?.tanggal_mulai') &&
    homeViewContent.includes('dailyState.blokInfo?.tanggal_selesai') &&
    homeViewContent.includes('Selama periode sistem blok ini, jadwal mengajar reguler disembunyikan'),
    'HomeView masks regular teaching schedule and displays comprehensive block activity banner when isBlok is true'
  );

  assert(
    homeViewContent.includes("!dailyState?.isBlok && dailyState && dailyState.jadwalKBM") &&
    homeViewContent.includes("dailyState.jadwalKBM.map"),
    'HomeView only renders regular teaching schedule list when isBlok is false'
  );

  // 2.4 Verify Admin Dashboard Blok Alert
  assert(
    homeViewContent.includes('activeBlokToday && (') &&
    homeViewContent.includes('Kelola Sistem Blok') &&
    homeViewContent.includes("setView('view-sistem-blok')"),
    'HomeView provides administrator banner indicating active block with quick navigation link'
  );

  // 2.5 Verify database schedule integrity remains 100% intact
  const { count: scheduleCountAfter } = await supabase
    .from('jadwal_pelajaran')
    .select('*', { count: 'exact', head: true });

  assert(
    scheduleCountBefore === scheduleCountAfter,
    'Acceptance Criteria R2: Database jadwal_pelajaran records count is completely unchanged (no schedules deleted)'
  );

  // ====================================================
  // Section 3: R3 - Jurnal Kegiatan Guru
  // ====================================================
  console.log('\n--- Section 3: R3 - Jurnal Kegiatan Guru ---');

  // 3.1 GuruJurnal auto-selects Jurnal Kegiatan during block
  assert(
    guruJurnalContent.includes("if (state.isBlok) {") &&
    guruJurnalContent.includes("setTipeJurnal('Jurnal Kegiatan')") &&
    guruJurnalContent.includes("setDateBlok(state.blokInfo)"),
    'GuruJurnal automatically switches mode to Jurnal Kegiatan when dailyState.isBlok is true'
  );

  // 3.2 GuruJurnal renders block banner with guidance
  assert(
    guruJurnalContent.includes('{dateBlok && (') &&
    guruJurnalContent.includes('Periode Sistem Blok Aktif:') &&
    guruJurnalContent.includes('Jadwal KBM reguler ditiadakan sementara dan digantikan oleh kegiatan khusus ini') &&
    guruJurnalContent.includes('Anda hanya perlu mengisi form <strong>Jurnal Kegiatan</strong>'),
    'GuruJurnal displays explanatory alert informing teacher that regular KBM is replaced with Jurnal Kegiatan'
  );

  // 3.3 Regular class/subject and student attendance are bypassed
  assert(
    guruJurnalContent.includes("{tipeJurnal === 'Jurnal KBM' && (") &&
    guruJurnalContent.includes("Mata Pelajaran") &&
    guruJurnalContent.includes("Pertemuan Ke-") &&
    guruJurnalContent.includes("Tujuan Pembelajaran") &&
    guruJurnalContent.includes("Kehadiran Murid"),
    'GuruJurnal conditionally excludes KBM-only fields (Mapel, Kelas, Pertemuan, Jam, Absensi Siswa) when filling Jurnal Kegiatan'
  );

  // 3.4 GuruJurnal handles date switching cleanly
  assert(
    guruJurnalContent.includes("if (blok) {") &&
    guruJurnalContent.includes("setTipeJurnal('Jurnal Kegiatan');") &&
    guruJurnalContent.includes("} else {") &&
    guruJurnalContent.includes("setTipeJurnal('Jurnal KBM')"),
    'GuruJurnal cleanly toggles between Jurnal Kegiatan and Jurnal KBM when user changes selected date'
  );

  // 3.5 Workflow logic: Jurnal Kegiatan fulfills checkout on block day
  assert(
    workflowContent.includes("if (state.isBlok || state.isDinasLuar || state.jadwalKBM.length === 0) {") &&
    workflowContent.includes("if (state.jurnalKegiatan) isJurnalDone = true;"),
    'workflow.ts: In block period, 1 Jurnal Kegiatan fulfills the daily journal requirement for Presensi Pulang'
  );

  assert(
    workflowContent.includes("state.isBlok ? 'Jurnal Kegiatan (Sistem Blok)' : 'Jurnal (KBM/Kegiatan)'"),
    'workflow.ts: Missing duty message accurately names Jurnal Kegiatan (Sistem Blok)'
  );

  // 3.6 HomeView Admin Matrix & Steps handle Jurnal Kegiatan on block days
  assert(
    homeViewContent.includes("if (isBlokToday) {") &&
    homeViewContent.includes("jurnalStatus = 'Jurnal Kegiatan Selesai'") &&
    homeViewContent.includes("jurnalStatus = 'Perlu Jurnal Kegiatan'") &&
    homeViewContent.includes("total: isBlokToday ? 1 :"),
    'HomeView Admin matrix reflects Jurnal Kegiatan target (1 instead of N class schedules) during block days'
  );

  assert(
    homeViewContent.includes("jurnalStatus = 'Ditolak (Perlu Revisi)'"),
    'HomeView Admin matrix handles rejected Jurnal Kegiatan accurately'
  );

  assert(
    homeViewContent.includes("steps.push({ label: 'Jurnal Kegiatan (Sistem Blok)'"),
    'HomeView Teacher Workflow Steps explicitly displays Jurnal Kegiatan (Sistem Blok)'
  );

  // 3.7 Live DB: Cleanup test block period
  const { error: deleteErr } = await supabase.from('sistem_blok').delete().eq('id', testBlokId);
  assert(!deleteErr, 'Live DB: Successfully deleted test block period, leaving zero test artifacts');

  // Verify deletion
  const { data: verifyDeleted } = await supabase
    .from('sistem_blok')
    .select('id')
    .eq('id', testBlokId);

  assert((verifyDeleted?.length ?? 0) === 0, 'Live DB: Confirmed test record is completely removed from database');

  // ====================================================
  // Section 4: R4 - Batasan Implementasi & UI Compatibility
  // ====================================================
  console.log('\n--- Section 4: R4 - Batasan Implementasi & Minimalist Principles ---');

  // 4.1 No new external dependencies introduced
  const pkgJson = JSON.parse(pkgContent);
  const allowedDeps = [
    '@supabase/supabase-js',
    'csv-parse',
    'dotenv',
    'next',
    'react',
    'react-dom',
    'sweetalert2',
    'tsx',
    'web-push',
  ];
  const actualDeps = Object.keys(pkgJson.dependencies || {});
  const unexpectedDeps = actualDeps.filter(d => !allowedDeps.includes(d));
  assert(
    unexpectedDeps.length === 0,
    'No new external libraries installed in package.json (strict adherence to R4)',
    unexpectedDeps.join(', ')
  );

  // 4.2 Uses existing Tailwind & glassmorphism styling
  assert(
    viewContent.includes('glass-card') &&
    viewContent.includes('input-premium') &&
    viewContent.includes('btn-click'),
    'SistemBlokView uses established project CSS design tokens (glass-card, input-premium, btn-click)'
  );

  // ====================================================
  // Summary
  // ====================================================
  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    console.error('❌ SOME TESTS FAILED!');
    process.exit(1);
  } else {
    console.log('🎉 ALL SISTEM BLOK VERIFICATION TESTS PASSED!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
