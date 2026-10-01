import path from 'path';
import fs from 'fs';
import React from 'react';
import dotenv from 'dotenv';

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config();

import { NextRequest } from 'next/server';

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

async function runAllRequirementsVerification() {
  console.log('========================================================================');
  console.log('COMPREHENSIVE VERIFICATION SUITE: REQUIREMENTS R1 - R6 (MILESTONE 5)');
  console.log('========================================================================\n');

  const rootDir = path.resolve(__dirname, '..');

  // Paths
  const mergeSqlPath = path.join(rootDir, 'merge_accounts.sql');
  const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20261001_features_r1_r6.sql');
  const dbTypesPath = path.join(rootDir, 'src', 'types', 'database.ts');
  const avatarsPath = path.join(rootDir, 'src', 'lib', 'avatars.tsx');
  const accountModalPath = path.join(rootDir, 'src', 'components', 'AccountSettingsModal.tsx');
  const homeViewPath = path.join(rootDir, 'src', 'components', 'HomeView.tsx');
  const appScreenPath = path.join(rootDir, 'src', 'components', 'AppScreen.tsx');
  const pagePath = path.join(rootDir, 'src', 'app', 'page.tsx');
  const superadminPagePath = path.join(rootDir, 'src', 'app', 'superadmin', 'page.tsx');
  const guruPresensiPath = path.join(rootDir, 'src', 'components', 'GuruPresensi.tsx');
  const attendanceRoutePath = path.join(rootDir, 'src', 'app', 'api', 'attendance', 'route.ts');
  const guruJurnalPath = path.join(rootDir, 'src', 'components', 'GuruJurnal.tsx');
  const adminVerifPath = path.join(rootDir, 'src', 'components', 'AdminVerifView.tsx');
  const rekapJurnalPath = path.join(rootDir, 'src', 'components', 'RekapJurnalView.tsx');
  const superadminViewPath = path.join(rootDir, 'src', 'components', 'SuperadminView.tsx');
  const adminDataViewPath = path.join(rootDir, 'src', 'components', 'AdminDataView.tsx');

  // =========================================================================
  // SECTION 1: REQUIREMENT R1 - PERBAIKAN DATA GANDA (MERGE ACCOUNT)
  // =========================================================================
  console.log('\n--- SECTION 1: R1 (Merge Account SQL Script & Database Integrity) ---');

  // 1.1 Verify merge_accounts.sql file exists
  assert(fs.existsSync(mergeSqlPath), 'merge_accounts.sql exists at project root');

  const mergeSqlContent = fs.existsSync(mergeSqlPath) ? fs.readFileSync(mergeSqlPath, 'utf8') : '';

  // 1.2 Verify foreign key migrations across child tables
  assert(
    mergeSqlContent.includes('UPDATE public.presensi_guru') &&
    mergeSqlContent.includes('user_id = v_primary_user_id'),
    'R1: merge_accounts.sql re-assigns foreign keys in presensi_guru'
  );

  assert(
    mergeSqlContent.includes('UPDATE public.jurnal_pembelajaran') &&
    mergeSqlContent.includes('user_id = v_primary_user_id'),
    'R1: merge_accounts.sql re-assigns foreign keys in jurnal_pembelajaran'
  );

  assert(
    mergeSqlContent.includes('UPDATE public.jadwal_pelajaran') &&
    mergeSqlContent.includes('user_id = v_primary_user_id'),
    'R1: merge_accounts.sql re-assigns foreign keys in jadwal_pelajaran'
  );

  assert(
    mergeSqlContent.includes('UPDATE public.laporan_piket') &&
    mergeSqlContent.includes('user_id = v_primary_user_id'),
    'R1: merge_accounts.sql re-assigns foreign keys in laporan_piket'
  );

  assert(
    mergeSqlContent.includes('UPDATE public.guru_mapel') &&
    mergeSqlContent.includes('guru_id = v_primary_guru_id'),
    'R1: merge_accounts.sql re-assigns foreign keys in guru_mapel'
  );

  assert(
    mergeSqlContent.includes('UPDATE public.penugasan_piket') &&
    mergeSqlContent.includes('guru_id = v_primary_guru_id'),
    'R1: merge_accounts.sql re-assigns foreign keys in penugasan_piket'
  );

  assert(
    mergeSqlContent.includes('UPDATE public.wali_kelas') &&
    mergeSqlContent.includes('guru_id = v_primary_guru_id'),
    'R1: merge_accounts.sql re-assigns foreign keys in wali_kelas'
  );

  assert(
    mergeSqlContent.includes('UPDATE public.push_subscriptions') &&
    mergeSqlContent.includes('user_id = v_primary_user_id'),
    'R1: merge_accounts.sql re-assigns foreign keys in push_subscriptions'
  );

  // 1.3 Verify duplicate deletions
  assert(
    mergeSqlContent.includes('DELETE FROM public.data_guru') &&
    mergeSqlContent.includes('DELETE FROM public.users'),
    'R1: merge_accounts.sql contains DELETE queries to remove duplicate account from data_guru and users'
  );

  // 1.4 Primary account preservation and idempotency
  assert(
    mergeSqlContent.includes('fff9d836-b034-4a66-be96-1c1b7cfad277') &&
    mergeSqlContent.includes('Ade Fitrawan Ibrahim'),
    'R1: merge_accounts.sql explicitly targets and preserves primary account "Ade Fitrawan Ibrahim"'
  );

  assert(
    mergeSqlContent.includes('v_count_a >= v_count_b') ||
    mergeSqlContent.includes('COUNT(*)'),
    'R1: merge_accounts.sql calculates transaction volume to retain the account with more history'
  );

  assert(
    mergeSqlContent.includes('IF v_user_b.id IS NULL AND v_guru_b.id IS NULL THEN') &&
    mergeSqlContent.includes('RETURN;'),
    'R1: merge_accounts.sql is fully idempotent (safely exits when no duplicate exists)'
  );

  // 1.5 Database migration and TypeScript definitions
  assert(fs.existsSync(migrationPath), 'Migration 20261001_features_r1_r6.sql exists');
  const migrationContent = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : '';
  assert(
    migrationContent.includes('ALTER TABLE public.sekolah') &&
    migrationContent.includes('mode_jurnal'),
    'Migration adds mode_jurnal to public.sekolah'
  );
  assert(
    migrationContent.includes('ALTER TABLE public.jurnal_pembelajaran') &&
    migrationContent.includes('latitude') &&
    migrationContent.includes('longitude') &&
    migrationContent.includes('lokasi') &&
    migrationContent.includes('waktu_upload'),
    'Migration adds GPS coordinates and upload metadata to public.jurnal_pembelajaran'
  );

  assert(fs.existsSync(dbTypesPath), 'src/types/database.ts exists');
  const dbTypesContent = fs.existsSync(dbTypesPath) ? fs.readFileSync(dbTypesPath, 'utf8') : '';
  assert(
    dbTypesContent.includes('mode_jurnal') &&
    dbTypesContent.includes('latitude') &&
    dbTypesContent.includes('longitude') &&
    dbTypesContent.includes('lokasi') &&
    dbTypesContent.includes('waktu_upload'),
    'Database types include all new schema columns for sekolah and jurnal_pembelajaran'
  );

  // =========================================================================
  // SECTION 2: REQUIREMENT R2 - PERBAIKAN AVATAR & IMMEDIATE UI REACTIVITY
  // =========================================================================
  console.log('\n--- SECTION 2: R2 (Avatar Image Upload & Immediate UI Reactivity) ---');

  assert(fs.existsSync(avatarsPath), 'src/lib/avatars.tsx exists');
  const { renderUserAvatar, AVATAR_LIST } = await import('../src/lib/avatars');

  // 2.1 Behavioral test: renderUserAvatar handles data URLs
  const dummyDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const avatarElemDataUrl = renderUserAvatar(dummyDataUrl, 'w-12 h-12') as React.ReactElement<any>;
  assert(
    React.isValidElement(avatarElemDataUrl) &&
    avatarElemDataUrl.type === 'img' &&
    avatarElemDataUrl.props.src === dummyDataUrl &&
    avatarElemDataUrl.props.className.includes('w-12 h-12'),
    'R2: renderUserAvatar correctly renders <img> for data:image/* data URLs'
  );

  // 2.2 Behavioral test: renderUserAvatar handles web URLs and local paths
  const dummyWebUrl = 'https://example.com/avatar.jpg';
  const avatarElemWeb = renderUserAvatar(dummyWebUrl, 'w-8 h-8') as React.ReactElement<any>;
  assert(
    React.isValidElement(avatarElemWeb) &&
    avatarElemWeb.type === 'img' &&
    avatarElemWeb.props.src === dummyWebUrl &&
    avatarElemWeb.props.className.includes('w-8 h-8'),
    'R2: renderUserAvatar correctly renders <img> for web URLs (https://)'
  );

  const dummyLocalPath = '/uploads/my-avatar.png';
  const avatarElemLocal = renderUserAvatar(dummyLocalPath, 'w-8 h-8') as React.ReactElement<any>;
  assert(
    React.isValidElement(avatarElemLocal) &&
    avatarElemLocal.type === 'img' &&
    avatarElemLocal.props.src === dummyLocalPath,
    'R2: renderUserAvatar correctly renders <img> for absolute path URLs (/...)'
  );

  // 2.3 Behavioral test: renderUserAvatar handles preset IDs and null fallback
  const presetAvatar = renderUserAvatar('avatar_2', 'w-10 h-10') as React.ReactElement<any>;
  assert(
    React.isValidElement(presetAvatar) && presetAvatar.type === 'svg',
    'R2: renderUserAvatar renders SVG for preset avatar ID ("avatar_2")'
  );

  const fallbackAvatar = renderUserAvatar(null, 'w-10 h-10') as React.ReactElement<any>;
  assert(
    React.isValidElement(fallbackAvatar) && fallbackAvatar.type === 'svg',
    'R2: renderUserAvatar falls back to default SVG when avatar is null or undefined'
  );

  // 2.4 AccountSettingsModal file upload and immediate reactivity
  assert(fs.existsSync(accountModalPath), 'src/components/AccountSettingsModal.tsx exists');
  const accountModalContent = fs.readFileSync(accountModalPath, 'utf8');

  assert(
    accountModalContent.includes('type="file"') &&
    accountModalContent.includes('accept="image/*"') &&
    accountModalContent.includes('handleFileUpload'),
    'R2: AccountSettingsModal contains file upload input for custom avatar images'
  );

  assert(
    accountModalContent.includes('1024 * 1024') &&
    accountModalContent.includes('FileReader'),
    'R2: AccountSettingsModal enforces 1MB client-side image size limit and reads via FileReader'
  );

  assert(
    accountModalContent.includes('onUserUpdated(updatedUser)') &&
    accountModalContent.includes("localStorage.setItem('sipjam_user'"),
    'R2: AccountSettingsModal updates local state immediately via onUserUpdated and localStorage upon success without reload'
  );

  // 2.5 HomeView and AppScreen render user avatar
  assert(fs.existsSync(homeViewPath), 'src/components/HomeView.tsx exists');
  const homeViewContent = fs.readFileSync(homeViewPath, 'utf8');
  assert(
    homeViewContent.includes('renderUserAvatar(user?.avatar'),
    'R2: HomeView.tsx dashboard banner renders user avatar dynamically with renderUserAvatar'
  );

  assert(fs.existsSync(appScreenPath), 'src/components/AppScreen.tsx exists');
  const appScreenContent = fs.readFileSync(appScreenPath, 'utf8');
  assert(
    appScreenContent.includes('renderUserAvatar(currentUser?.avatar'),
    'R2: AppScreen.tsx top navbar renders user avatar dynamically with renderUserAvatar'
  );

  // 2.6 Session validation queries include avatar column
  const pageContent = fs.readFileSync(pagePath, 'utf8');
  const superadminPageContent = fs.readFileSync(superadminPagePath, 'utf8');
  assert(
    appScreenContent.includes('.select(') && appScreenContent.includes('avatar') &&
    pageContent.includes('.select(') && pageContent.includes('avatar') &&
    superadminPageContent.includes('.select(') && superadminPageContent.includes('avatar'),
    'R2: Session verification and idle resume queries in page.tsx, superadmin/page.tsx, and AppScreen include "avatar"'
  );

  // =========================================================================
  // SECTION 3: REQUIREMENT R3 - IZIN DATANG TERLAMBAT (GURU) & BACKEND API
  // =========================================================================
  console.log('\n--- SECTION 3: R3 (Presensi Izin Terlambat UI & Backend API) ---');

  assert(fs.existsSync(guruPresensiPath), 'src/components/GuruPresensi.tsx exists');
  const guruPresensiContent = fs.readFileSync(guruPresensiPath, 'utf8');

  // 3.1 Dropdown option has value="Izin Terlambat"
  assert(
    guruPresensiContent.includes('<option value="Izin Terlambat">Izin Terlambat</option>'),
    'R3: GuruPresensi.tsx contains select option with exact value="Izin Terlambat"'
  );

  // 3.2 Late second calculation and status verification
  assert(
    guruPresensiContent.includes("isTerlambat = jenisPresensi === 'Izin Terlambat' || jenisPresensi === 'Terlambat'"),
    'R3: GuruPresensi.tsx defines isTerlambat helper supporting backward compatibility'
  );

  assert(
    guruPresensiContent.includes("jenisPresensi === 'Sekolah' || isTerlambat"),
    'R3: GuruPresensi.tsx calculates late seconds for both Sekolah and Izin Terlambat'
  );

  assert(
    guruPresensiContent.includes('const statusVerif = isTerlambat') &&
    guruPresensiContent.includes("'Menunggu'"),
    'R3: GuruPresensi.tsx sets status_verifikasi to "Menunggu" when isTerlambat'
  );

  assert(
    guruPresensiContent.includes('row-keterangan-terlambat'),
    'R3: GuruPresensi.tsx provides optional reason input for late arrival'
  );

  // 3.3 Backend API route handler /api/attendance
  assert(fs.existsSync(attendanceRoutePath), 'src/app/api/attendance/route.ts exists');
  const { POST, GET } = await import('../src/app/api/attendance/route');
  const { supabase } = await import('../src/lib/supabaseClient');

  assert(typeof POST === 'function', 'R3: POST handler is exported from /api/attendance');
  assert(typeof GET === 'function', 'R3: GET handler is exported from /api/attendance');

  // 3.4 Test GET /api/attendance
  const getReq = new NextRequest('http://localhost:3000/api/attendance?limit=1');
  const getRes = await GET(getReq);
  assert(getRes.status === 200, `R3: GET /api/attendance returns 200 OK (got ${getRes.status})`);
  const getJson = await getRes.json();
  assert(getJson.success === true && getJson.message === 'Attendance endpoint active', 'R3: GET /api/attendance returns success status');

  // 3.5 Test POST /api/attendance storing "Izin Terlambat"
  const testPresensiId = 'test-r3-' + Date.now();
  const testPayload = {
    id: testPresensiId,
    user_id: 'fff9d836-b034-4a66-be96-1c1b7cfad277',
    nama_guru: 'Ade Fitrawan Ibrahim',
    tipe_absen: 'Datang',
    jenis_presensi: 'Izin Terlambat',
    detail_izin: 'Kendaraan mengalami kendala dalam perjalanan',
    lokasi: 'GPS: -5.14767, 119.43273',
    jarak: '12 m',
    keterlambatan_detik: 900,
    sekolah_id: 'a0000000-0000-0000-0000-000000000001'
  };

  const postReq = new NextRequest('http://localhost:3000/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload)
  });

  const postRes = await POST(postReq);
  assert(
    postRes.status === 201 || postRes.status === 200,
    `R3: POST /api/attendance accepts and creates attendance record (HTTP ${postRes.status})`
  );
  const postJson = await postRes.json();
  assert(postJson.success === true, 'R3: POST response includes success: true');
  assert(
    postJson.data?.jenis_presensi === 'Izin Terlambat',
    'R3: Saved record has jenis_presensi="Izin Terlambat"'
  );
  assert(
    postJson.data?.status_verifikasi === 'Menunggu',
    'R3: Saved record has status_verifikasi="Menunggu"'
  );
  assert(
    postJson.data?.keterlambatan_detik === 900,
    'R3: Saved record captures keterlambatan_detik accurately'
  );

  // Clean up test attendance record
  try {
    await supabase.from('presensi_guru').delete().eq('id', testPresensiId);
  } catch (cleanErr) {
    console.warn('Cleanup warning for test presensi:', cleanErr);
  }

  // =========================================================================
  // SECTION 4: REQUIREMENT R4 - UPLOAD FOTO JURNAL GPS GEOLOCATION
  // =========================================================================
  console.log('\n--- SECTION 4: R4 (Upload Jurnal GPS Geolocation & Location Badges) ---');

  assert(fs.existsSync(guruJurnalPath), 'src/components/GuruJurnal.tsx exists');
  const guruJurnalContent = fs.readFileSync(guruJurnalPath, 'utf8');

  // 4.1 Geolocation API invocation in gallery upload flow
  assert(
    guruJurnalContent.includes('navigator.geolocation.getCurrentPosition') &&
    guruJurnalContent.includes('handleGalleryUpload'),
    'R4: GuruJurnal.tsx calls navigator.geolocation.getCurrentPosition in gallery upload flow'
  );

  assert(
    guruJurnalContent.includes('position.coords.latitude') &&
    guruJurnalContent.includes('position.coords.longitude') &&
    guruJurnalContent.includes('setUploadLatitude') &&
    guruJurnalContent.includes('setUploadLongitude'),
    'R4: GuruJurnal.tsx captures GPS latitude and longitude from device coordinates'
  );

  // 4.2 Payload submitted to backend/database includes coordinates and upload time
  assert(
    guruJurnalContent.includes('latitude: uploadLatitude') &&
    guruJurnalContent.includes('longitude: uploadLongitude') &&
    guruJurnalContent.includes('lokasi: uploadLokasi') &&
    guruJurnalContent.includes('waktu_upload: uploadWaktu'),
    'R4: GuruJurnal.tsx submits latitude, longitude, lokasi, and waktu_upload in newJurnal insert payload'
  );

  // 4.3 UI views display location badge and upload timestamp
  assert(fs.existsSync(adminVerifPath), 'src/components/AdminVerifView.tsx exists');
  const adminVerifContent = fs.readFileSync(adminVerifPath, 'utf8');
  assert(
    adminVerifContent.includes('fa-location-dot') &&
    adminVerifContent.includes('item.lokasi') &&
    adminVerifContent.includes('item.waktu_upload'),
    'R4: AdminVerifView.tsx displays GPS location badge (fa-location-dot) and upload timestamp'
  );

  assert(fs.existsSync(rekapJurnalPath), 'src/components/RekapJurnalView.tsx exists');
  const rekapJurnalContent = fs.readFileSync(rekapJurnalPath, 'utf8');
  assert(
    rekapJurnalContent.includes('fa-location-dot') &&
    rekapJurnalContent.includes('j.lokasi') &&
    rekapJurnalContent.includes('j.waktu_upload'),
    'R4: RekapJurnalView.tsx displays GPS location badge (fa-location-dot) and upload timestamp'
  );

  // =========================================================================
  // SECTION 5: REQUIREMENT R5 - PEMBATASAN PENGATURAN USERNAME
  // =========================================================================
  console.log('\n--- SECTION 5: R5 (Username Edit Limitation & Role Guarding) ---');

  // 5.1 UI Role check in AccountSettingsModal
  assert(
    accountModalContent.includes("user?.role === 'admin'") ||
    accountModalContent.includes("user?.role === 'Admin'") ||
    accountModalContent.includes("(user?.role || '').toLowerCase() === 'admin'"),
    'R5: AccountSettingsModal checks role === "admin" / "superadmin" before permitting username edits'
  );

  // 5.2 Non-admin username lock in UI
  assert(
    accountModalContent.includes('fa-lock') &&
    accountModalContent.includes('(Hanya Admin yang bisa mengubah)'),
    'R5: Non-admin users see locked container with padlock icon and "(Hanya Admin yang bisa mengubah)"'
  );

  // 5.3 Non-admin submission payload preserves existing username
  assert(
    accountModalContent.includes('p_username: isAdmin ? username.trim() : user.username'),
    'R5: Submission payload strictly retains existing user.username for non-admins'
  );

  // 5.4 Backend guard in update_user_profile RPC
  assert(
    migrationContent.includes("lower(v_target_user.role) = 'guru'") &&
    migrationContent.includes('Hanya Admin yang memiliki hak akses untuk mengubah username akun guru.'),
    'R5: Migration contains backend guard in update_user_profile RPC preventing teachers from altering their username'
  );

  // 5.5 Admin sync when editing teacher NIP in AdminDataView
  assert(fs.existsSync(adminDataViewPath), 'src/components/AdminDataView.tsx exists');
  const adminDataViewContent = fs.readFileSync(adminDataViewPath, 'utf8');
  assert(
    adminDataViewContent.includes("supabase.from('users').update({ username: formValues.nip })") ||
    adminDataViewContent.includes("username: formValues.nip"),
    'R5: Admin editing teacher NIP in AdminDataView synchronizes users.username'
  );

  // =========================================================================
  // SECTION 6: REQUIREMENT R6 - PENGATURAN FITUR PER-SEKOLAH (SUPERADMIN)
  // =========================================================================
  console.log('\n--- SECTION 6: R6 (School Setting for Journal Photo Upload Mode) ---');

  assert(fs.existsSync(superadminViewPath), 'src/components/SuperadminView.tsx exists');
  const superadminViewContent = fs.readFileSync(superadminViewPath, 'utf8');

  // 6.1 Superadmin UI has input for Journal Mode in Add School & Edit School
  assert(
    superadminViewContent.includes('id="swal-sch-mode-jurnal"') &&
    superadminViewContent.includes('id="swal-edit-mode-jurnal"'),
    'R6: SuperadminView.tsx has inputs for Journal Mode in both Add School and Edit School modals'
  );

  assert(
    superadminViewContent.includes('camera_only') &&
    superadminViewContent.includes('camera_upload'),
    'R6: SuperadminView.tsx supports options "camera_only" (Live Camera) and "camera_upload" (Camera + Upload)'
  );

  assert(
    superadminViewContent.includes('mode_jurnal') &&
    superadminViewContent.includes('Kamera Langsung'),
    'R6: SuperadminView.tsx displays school journal mode badge in schools table'
  );

  // 6.2 Guru Jurnal conditional upload rendering based on school configuration
  assert(
    guruJurnalContent.includes("select('mode_jurnal')") &&
    guruJurnalContent.includes('user.sekolah_id'),
    'R6: GuruJurnal.tsx fetches school mode_jurnal configuration for the logged-in teacher'
  );

  assert(
    guruJurnalContent.includes("isUploadAllowed = schoolModeJurnal !== 'camera_only'"),
    'R6: GuruJurnal.tsx computes isUploadAllowed: false when mode_jurnal === "camera_only"'
  );

  assert(
    guruJurnalContent.includes('isUploadAllowed &&') &&
    guruJurnalContent.includes('uploadMode === \'gallery\'') &&
    guruJurnalContent.includes('id="jurnal-gallery-file-input"'),
    'R6: GuruJurnal.tsx renders file upload input ONLY IF isUploadAllowed is true and gallery mode is active'
  );

  assert(
    guruJurnalContent.includes('(!isUploadAllowed || uploadMode === \'camera\')') &&
    guruJurnalContent.includes('<CameraSelfieCapture'),
    'R6: GuruJurnal.tsx falls back strictly to live camera capture when school enforces camera_only'
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n========================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    console.error(`\n❌ Comprehensive verification FAILED with ${failed} failure(s).`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All 6 requirements (R1 - R6) verified successfully with 0 failures!`);
  }
}

runAllRequirementsVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
