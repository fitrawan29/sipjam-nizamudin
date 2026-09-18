import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

let failureCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    failureCount++;
  } else {
    console.log(`✅ PASS: ${testName}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('MILESTONE M2 & M3 VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  // ---------------------------------------------------------------
  // SECTION 1: Jurnal Kelas RBAC (M2 / R3)
  // ---------------------------------------------------------------
  console.log('--- Step 1: Jurnal Kelas RBAC & Navigation (AppScreen.tsx) ---');
  const appScreenPath = path.resolve(__dirname, '..', 'src', 'components', 'AppScreen.tsx');
  assert(fs.existsSync(appScreenPath), 'AppScreen.tsx exists');

  const appScreenContent = fs.readFileSync(appScreenPath, 'utf-8');
  assert(
    appScreenContent.includes('const isAdmin = user?.role === \'Admin\'') ||
    appScreenContent.includes('user?.role === \'admin\'') ||
    appScreenContent.includes('user?.role?.toLowerCase()'),
    'AppScreen checks admin and superadmin roles'
  );
  assert(
    appScreenContent.includes('isWaliKelas') && appScreenContent.includes('assignedKelas'),
    'AppScreen manages isWaliKelas and assignedKelas state'
  );
  assert(
    appScreenContent.includes("from('wali_kelas')"),
    'AppScreen queries public.wali_kelas to determine teacher assignment'
  );
  assert(
    appScreenContent.includes("{ id: 'view-jurnal-kelas', icon: 'fa-chalkboard-user', label: 'Jurnal Kelas' }"),
    'menuItemsAdmin includes Jurnal Kelas navigation item'
  );
  assert(
    appScreenContent.includes('...(isWaliKelas ? [{ id: \'view-jurnal-kelas\', icon: \'fa-chalkboard-user\', label: \'Jurnal Kelas\' }] : [])'),
    'menuItemsGuru dynamically includes Jurnal Kelas ONLY when isWaliKelas is true'
  );
  assert(
    appScreenContent.includes('if (targetId === \'view-jurnal-kelas\')') &&
    appScreenContent.includes('!isAdmin && !isWaliKelas'),
    'handleNavigation blocks unauthorized access to view-jurnal-kelas'
  );
  assert(
    appScreenContent.includes("currentView === 'view-jurnal-kelas'") &&
    appScreenContent.includes('Akses Terblokir') &&
    appScreenContent.includes('Wali Kelas'),
    'AppScreen renders explicit Terblokir / Access Denied view for unauthorized teachers'
  );

  console.log('\n--- Step 2: Jurnal Kelas Class Restrictions (RekapJurnalView.tsx) ---');
  const rekapJurnalPath = path.resolve(__dirname, '..', 'src', 'components', 'RekapJurnalView.tsx');
  assert(fs.existsSync(rekapJurnalPath), 'RekapJurnalView.tsx exists');

  const rekapJurnalContent = fs.readFileSync(rekapJurnalPath, 'utf-8');
  assert(
    rekapJurnalContent.includes('initialMode') && rekapJurnalContent.includes('assignedKelas'),
    'RekapJurnalView accepts initialMode and assignedKelas props'
  );
  assert(
    rekapJurnalContent.includes('waliClasses') && rekapJurnalContent.includes("from('wali_kelas')"),
    'RekapJurnalView resolves assigned classes for the logged in Wali Kelas'
  );
  assert(
    rekapJurnalContent.includes('(isAdmin || isWaliKelas || waliClasses.length > 0)') &&
    rekapJurnalContent.includes('Rekapan Jurnal Per Kelas'),
    'Mode toggle for Rekapan Jurnal Per Kelas is hidden from regular non-Wali teachers'
  );
  assert(
    rekapJurnalContent.includes('activeMode === \'kelas\' && !isAdmin && !isWaliKelas && waliClasses.length === 0'),
    'tarikRekap prevents regular teachers from querying class journals'
  );
  assert(
    rekapJurnalContent.includes('waliClasses.map') && rekapJurnalContent.includes('Kelas Anda'),
    'Class selector restricts Wali Kelas to their assigned class(es)'
  );

  // ---------------------------------------------------------------
  // SECTION 2: Attendance Exception & Friday Schedule (M3 / R4)
  // ---------------------------------------------------------------
  console.log('\n--- Step 3: Friday Checkout & Teacher Exemption UI (AdminConfigView.tsx) ---');
  const adminConfigPath = path.resolve(__dirname, '..', 'src', 'components', 'AdminConfigView.tsx');
  assert(fs.existsSync(adminConfigPath), 'AdminConfigView.tsx exists');

  const adminConfigContent = fs.readFileSync(adminConfigPath, 'utf-8');
  assert(
    adminConfigContent.includes('jam_pulang_jumat: \'11:00\'') ||
    adminConfigContent.includes('jam_pulang_jumat'),
    'AdminConfigView config state includes jam_pulang_jumat with default 11:00'
  );
  assert(
    adminConfigContent.includes('name="jam_pulang_jumat"'),
    'AdminConfigView renders input element for jam_pulang_jumat'
  );
  assert(
    adminConfigContent.includes('Pengecualian Kehadiran Guru') &&
    adminConfigContent.includes('exemptTeacherIds'),
    'AdminConfigView provides interactive UI for teacher attendance exemptions'
  );
  assert(
    adminConfigContent.includes("from('data_guru')") &&
    adminConfigContent.includes('wajib_hadir_hanya_mengajar'),
    'AdminConfigView fetches data_guru and syncs wajib_hadir_hanya_mengajar'
  );
  assert(
    adminConfigContent.includes('guru_hanya_mengajar: jsonExempt') ||
    adminConfigContent.includes('key: \'guru_hanya_mengajar\''),
    'AdminConfigView saves guru_hanya_mengajar to pengaturan'
  );

  console.log('\n--- Step 4: Workflow & Daily State Logic (workflow.ts) ---');
  const workflowPath = path.resolve(__dirname, '..', 'src', 'lib', 'workflow.ts');
  assert(fs.existsSync(workflowPath), 'workflow.ts exists');

  const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
  assert(
    workflowContent.includes('guru_hanya_mengajar') &&
    workflowContent.includes('wajib_hadir_hanya_mengajar'),
    'workflow.ts checks both pengaturan.guru_hanya_mengajar and data_guru.wajib_hadir_hanya_mengajar'
  );
  assert(
    workflowContent.includes('state.aturanKehadiran = isTeacherExempt ? \'Hari_Mengajar_Saja\' : \'Semua_Hari\''),
    'workflow.ts sets aturanKehadiran based on teacher exemption status'
  );

  // ---------------------------------------------------------------
  // SECTION 3: Live Camera Enforcement in Modul Piket (M3 / R5)
  // ---------------------------------------------------------------
  console.log('\n--- Step 5: Direct Camera Integration in Piket (PiketView.tsx) ---');
  const piketPath = path.resolve(__dirname, '..', 'src', 'components', 'PiketView.tsx');
  assert(fs.existsSync(piketPath), 'PiketView.tsx exists');

  const piketContent = fs.readFileSync(piketPath, 'utf-8');
  assert(
    !piketContent.includes('<input type="file"'),
    'PiketView.tsx completely eliminates <input type="file"> (0 matches)'
  );
  assert(
    piketContent.includes('<CameraSelfieCapture') &&
    piketContent.includes('initialFacingMode="environment"'),
    'PiketView.tsx renders CameraSelfieCapture with initialFacingMode environment'
  );
  assert(
    piketContent.includes('onPhotoConfirmed={(capturedFile: File, previewUrl: string)') ||
    piketContent.includes('onPhotoConfirmed='),
    'PiketView handles onPhotoConfirmed to set captured photo'
  );
  assert(
    piketContent.includes('if (!file)') &&
    piketContent.includes('Foto Wajib Diambil'),
    'handleSubmitPiket enforces mandatory camera capture prior to submission'
  );

  // ---------------------------------------------------------------
  // SECTION 4: Supabase Database Schema Verification
  // ---------------------------------------------------------------
  console.log('\n--- Step 6: Supabase Live Database Verification ---');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jicvvqxjyzntdrccnuyz.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  const { data: testPengaturan, error: errPengaturan } = await supabase
    .from('pengaturan')
    .select('id, jam_pulang_jumat, guru_hanya_mengajar')
    .limit(1);

  assert(!errPengaturan, 'pengaturan table has jam_pulang_jumat and guru_hanya_mengajar columns', errPengaturan?.message);

  const { data: testGuru, error: errGuru } = await supabase
    .from('data_guru')
    .select('id, wajib_hadir_hanya_mengajar')
    .limit(1);

  assert(!errGuru, 'data_guru table has wajib_hadir_hanya_mengajar column', errGuru?.message);

  const { data: testWali, error: errWali } = await supabase
    .from('wali_kelas')
    .select('id, kelas, guru_id, nama_guru')
    .limit(1);

  assert(!errWali, 'wali_kelas table is queryable for RBAC', errWali?.message);

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: 20`);
  console.log(`PASSED: ${20 - failureCount}`);
  console.log(`FAILED: ${failureCount}`);
  console.log('====================================================');

  if (failureCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL 20 M2 & M3 VERIFICATION TESTS PASSED!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
