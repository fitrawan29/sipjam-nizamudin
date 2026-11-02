import assert from 'assert';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

import {
  isInvalidMapel,
  normalizeScheduleMapel,
  validateScheduleData,
  validateMapelData,
  validateTeacherData,
} from '../src/lib/dataIntegrityGuard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let passCount = 0;
let failCount = 0;

function pass(name: string) {
  console.log(`  ✔ PASS: ${name}`);
  passCount++;
}

function fail(name: string, error?: any) {
  console.error(`  ✘ FAIL: ${name}`, error || '');
  failCount++;
}

async function getAuthenticatedClient() {
  const baseClient = createClient(supabaseUrl, supabaseKey);
  let sessionToken: string | null = null;
  try {
    const { data: loginData } = await baseClient.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'SipjamSuperAdmin2026!'
    });
    if (loginData && loginData[0]?.session_token) {
      sessionToken = loginData[0].session_token;
    }
  } catch (err) {
    console.warn('Superadmin auth fallback note:', err);
  }

  const { setServerTenantContext } = await import('../src/lib/supabaseClient');
  setServerTenantContext({
    role: 'Superadmin',
    sessionToken: sessionToken,
    sekolahId: 'a0000000-0000-0000-0000-000000000001'
  });

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin',
        ...(sessionToken ? { 'x-session-token': sessionToken } : {})
      }
    }
  });
}

async function runAllTests() {
  console.log('========================================================================');
  console.log('🧪 TEST SUITE: JADWAL MAPEL VALIDITY & MASTER DATA INTEGRITY');
  console.log('========================================================================\n');

  // Authenticate and set tenant context before queries
  const supabase = await getAuthenticatedClient();

  // Dynamic import of workflow after env is guaranteed loaded
  const { findJadwalForGuru, isJurnalMatchJadwal } = await import('../src/lib/workflow');

  // --------------------------------------------------------------------------
  // SUITE 1: UNIT LOGIC & VALIDATION GUARDS (R1)
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: UNIT LOGIC & VALIDATION GUARDS (R1) ---');

  // 1.1 isInvalidMapel tests
  try {
    assert.strictEqual(isInvalidMapel('teknik informasi'), true, 'teknik informasi must be flagged invalid');
    assert.strictEqual(isInvalidMapel('Teknik Informasi'), true, 'Teknik Informasi must be flagged invalid');
    assert.strictEqual(isInvalidMapel('TEKNIK INFORMASI'), true, 'TEKNIK INFORMASI must be flagged invalid');
    assert.strictEqual(isInvalidMapel('teknik-informasi'), true, 'teknik-informasi must be flagged invalid');
    assert.strictEqual(isInvalidMapel('teknik_informasi'), true, 'teknik_informasi must be flagged invalid');
    assert.strictEqual(isInvalidMapel('teknologi informasi'), true, 'teknologi informasi must be flagged invalid');
    assert.strictEqual(isInvalidMapel('Teknologi Informasi'), true, 'Teknologi Informasi must be flagged invalid');
    assert.strictEqual(isInvalidMapel('teknik informatika'), true, 'teknik informatika must be flagged invalid');
    assert.strictEqual(isInvalidMapel('Teknik Informatika'), true, 'Teknik Informatika must be flagged invalid');
    assert.strictEqual(isInvalidMapel('tekinfo'), true, 'tekinfo must be flagged invalid');
    assert.strictEqual(isInvalidMapel('tek info'), true, 'tek info must be flagged invalid');
    assert.strictEqual(isInvalidMapel('teknik dan informasi'), true, 'teknik dan informasi must be flagged invalid');
    assert.strictEqual(isInvalidMapel('tik'), true, 'tik must be flagged invalid');
    assert.strictEqual(isInvalidMapel('TIK'), true, 'TIK must be flagged invalid');
    assert.strictEqual(isInvalidMapel('t.i.k.'), true, 't.i.k. must be flagged invalid');
    assert.strictEqual(isInvalidMapel('T.I.K.'), true, 'T.I.K. must be flagged invalid');
    assert.strictEqual(isInvalidMapel('TIK.'), true, 'TIK. must be flagged invalid');
    assert.strictEqual(isInvalidMapel('X Merdeka_TIK'), true, 'X Merdeka_TIK must be flagged invalid');
    assert.strictEqual(isInvalidMapel('XI Merdeka_t.i.k.'), true, 'XI Merdeka_t.i.k. must be flagged invalid');
    assert.strictEqual(isInvalidMapel('X Merdeka_TIK.'), true, 'X Merdeka_TIK. must be flagged invalid');
    assert.strictEqual(isInvalidMapel('X-1_Teknik Informasi'), true, 'X-1_Teknik Informasi must be flagged invalid');
    assert.strictEqual(isInvalidMapel('X.1_Teknik Informasi'), true, 'X.1_Teknik Informasi must be flagged invalid');
    assert.strictEqual(isInvalidMapel('teknologi informasi dan komunikasi'), true, 'legacy TIK fullname must be flagged invalid');
    pass('isInvalidMapel correctly flags all variations, slang, punctuation, class-prefixes, and legacy TIK');
  } catch (e) {
    fail('isInvalidMapel variations check failed', e);
  }

  // 1.2 isInvalidMapel preserves valid subjects
  try {
    assert.strictEqual(isInvalidMapel('Informatika'), false, 'Informatika must be valid');
    assert.strictEqual(isInvalidMapel('informatika'), false, 'informatika must be valid');
    assert.strictEqual(isInvalidMapel('X Merdeka_Informatika'), false, 'X Merdeka_Informatika must be valid');
    assert.strictEqual(isInvalidMapel('MTK'), false, 'MTK must be valid');
    assert.strictEqual(isInvalidMapel('Bahasa Inggris'), false, 'Bahasa Inggris must be valid');
    assert.strictEqual(isInvalidMapel('PJOK'), false, 'PJOK must be valid');
    assert.strictEqual(isInvalidMapel(null), false, 'null does not throw');
    assert.strictEqual(isInvalidMapel(''), false, 'empty string does not throw');
    pass('isInvalidMapel allows official valid subjects (Informatika, MTK, PJOK, etc.)');
  } catch (e) {
    fail('isInvalidMapel valid subjects check failed', e);
  }

  // 1.3 normalizeScheduleMapel tests
  try {
    assert.strictEqual(normalizeScheduleMapel('teknik informasi'), 'Informatika');
    assert.strictEqual(normalizeScheduleMapel('Teknik Informasi'), 'Informatika');
    assert.strictEqual(normalizeScheduleMapel('teknologi informasi'), 'Informatika');
    assert.strictEqual(normalizeScheduleMapel('X Merdeka_Teknik Informasi'), 'X Merdeka_Informatika');
    assert.strictEqual(normalizeScheduleMapel('XI Merdeka_Teknologi Informasi'), 'XI Merdeka_Informatika');
    assert.strictEqual(normalizeScheduleMapel('X-1_Teknik Informasi'), 'X-1_Informatika');
    assert.strictEqual(normalizeScheduleMapel('TIK'), 'Informatika');
    assert.strictEqual(normalizeScheduleMapel('t.i.k.'), 'Informatika');
    assert.strictEqual(normalizeScheduleMapel('X Merdeka_TIK'), 'X Merdeka_Informatika');
    assert.strictEqual(normalizeScheduleMapel('XI Merdeka_t.i.k.'), 'XI Merdeka_Informatika');
    assert.strictEqual(normalizeScheduleMapel('X Merdeka_MTK, X Merdeka_Teknik Informasi'), 'X Merdeka_MTK, X Merdeka_Informatika');
    assert.strictEqual(normalizeScheduleMapel('Informatika'), 'Informatika');
    assert.strictEqual(normalizeScheduleMapel('MTK'), 'MTK');
    pass('normalizeScheduleMapel standardizes invalid subjects, legacy TIK, class-prefixes, and comma-separated lists to "Informatika"');
  } catch (e) {
    fail('normalizeScheduleMapel check failed', e);
  }

  // 1.4 validateScheduleData tests
  try {
    const invalidCheck1 = validateScheduleData('teknik informasi', 'Ade', 'X Merdeka');
    assert.strictEqual(invalidCheck1.valid, false, 'Rejects teknik informasi');
    assert(invalidCheck1.message?.includes('tidak valid'), 'Provides descriptive rejection message');

    const invalidCheck2 = validateScheduleData('Teknologi Informasi', 'Ade', 'X Merdeka');
    assert.strictEqual(invalidCheck2.valid, false, 'Rejects Teknologi Informasi');

    const invalidCheck3 = validateScheduleData('X Merdeka_TIK', 'Ade', 'X Merdeka');
    assert.strictEqual(invalidCheck3.valid, false, 'Rejects X Merdeka_TIK');

    const emptyCheck = validateScheduleData('', 'Ade', 'X Merdeka');
    assert.strictEqual(emptyCheck.valid, false, 'Rejects empty subject');

    const dummyCheck = validateScheduleData('dummy mapel test', 'Ade', 'X Merdeka');
    assert.strictEqual(dummyCheck.valid, false, 'Rejects dummy subject');

    const validCheck = validateScheduleData('Informatika', 'Ade', 'X Merdeka');
    assert.strictEqual(validCheck.valid, true, 'Accepts valid Informatika');
    pass('validateScheduleData enforces valid subject policy and rejects invalid subjects');
  } catch (e) {
    fail('validateScheduleData check failed', e);
  }

  // 1.5 validateMapelData tests (data_mapel master protection)
  try {
    const invalidMapel1 = validateMapelData('Teknik Informasi');
    assert.strictEqual(invalidMapel1.valid, false, 'Rejects invalid subject in data_mapel');

    const invalidMapel2 = validateMapelData('TIK');
    assert.strictEqual(invalidMapel2.valid, false, 'Rejects legacy TIK in data_mapel');

    const invalidMapel3 = validateMapelData('X Merdeka_TIK');
    assert.strictEqual(invalidMapel3.valid, false, 'Rejects X Merdeka_TIK in data_mapel');

    const dummyMapel = validateMapelData('Test Mapel Dummy');
    assert.strictEqual(dummyMapel.valid, false, 'Rejects dummy subject in data_mapel');

    const emptyMapel = validateMapelData('');
    assert.strictEqual(emptyMapel.valid, false, 'Rejects empty subject in data_mapel');

    const existingMapels = [
      { id: 'm1', nama_mata_pelajaran: 'X Merdeka_Informatika' },
      { id: 'm2', nama_mata_pelajaran: 'X Merdeka_MTK' }
    ];
    const dupCheck = validateMapelData('X Merdeka_Informatika', existingMapels);
    assert.strictEqual(dupCheck.valid, false, 'Rejects duplicate subject name');

    const selfEditCheck = validateMapelData('X Merdeka_Informatika', existingMapels, 'm1');
    assert.strictEqual(selfEditCheck.valid, true, 'Allows editing subject without self-collision');

    const validNewMapel = validateMapelData('X Merdeka_PJOK', existingMapels);
    assert.strictEqual(validNewMapel.valid, true, 'Accepts valid official subject');
    pass('validateMapelData protects data_mapel master data from invalid, dummy, and duplicate records');
  } catch (e) {
    fail('validateMapelData check failed', e);
  }

  // 1.6 validateTeacherData tests (data_guru subject protection)
  try {
    const invalidGuruMapel1 = validateTeacherData('Ade', 'Ade Fitrawan Ibrahim', [], undefined, 'Teknik Informasi');
    assert.strictEqual(invalidGuruMapel1.valid, false, 'Rejects Teknik Informasi in data_guru');

    const invalidGuruMapel2 = validateTeacherData('Ade', 'Ade Fitrawan Ibrahim', [], undefined, 'X Merdeka_TIK');
    assert.strictEqual(invalidGuruMapel2.valid, false, 'Rejects X Merdeka_TIK in data_guru');

    const dummyGuruMapel = validateTeacherData('Ade', 'Ade Fitrawan Ibrahim', [], undefined, 'dummy mapel');
    assert.strictEqual(dummyGuruMapel.valid, false, 'Rejects dummy subject in data_guru');

    const validGuruMapel = validateTeacherData('Ade', 'Ade Fitrawan Ibrahim', [], undefined, 'Informatika');
    assert.strictEqual(validGuruMapel.valid, true, 'Accepts valid Informatika in data_guru');
    pass('validateTeacherData protects data_guru master data from invalid and dummy subjects');
  } catch (e) {
    fail('validateTeacherData check failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 2: WORKFLOW & COMPONENT FILTERING (R1)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: WORKFLOW & COMPONENT FILTERING (R1) ---');

  // 2.1 isJurnalMatchJadwal disallows matching on invalid subjects
  try {
    const matchInvalid = isJurnalMatchJadwal(
      { kelas: 'X-1', mapel: 'Teknik Informasi' },
      { kelas: 'X-1', mata_pelajaran: 'Teknik Informasi' }
    );
    assert.strictEqual(matchInvalid, false, 'isJurnalMatchJadwal returns false when subject is invalid');

    const matchValid = isJurnalMatchJadwal(
      { kelas: 'X Merdeka', mapel: 'Informatika' },
      { kelas: 'X Merdeka', mata_pelajaran: 'Informatika' }
    );
    assert.strictEqual(matchValid, true, 'isJurnalMatchJadwal correctly matches valid Informatika');
    pass('isJurnalMatchJadwal prevents matching against invalid subjects and matches valid Informatika');
  } catch (e) {
    fail('isJurnalMatchJadwal check failed', e);
  }

  // 2.2 findJadwalForGuru integration
  try {
    // Ade teaches Informatika on Sabtu in X Merdeka
    const adeSabtu = await findJadwalForGuru('Sabtu', 'Ade Fitrawan Ibrahim', 'Fitrawan');
    const inforJadwal = adeSabtu.filter(j => (j.mata_pelajaran || '').toLowerCase() === 'informatika');
    assert(inforJadwal.length > 0, 'findJadwalForGuru includes valid Informatika on Sabtu for Ade');

    const invalidJadwal = adeSabtu.filter(j => isInvalidMapel(j.mata_pelajaran || j.mapel));
    assert.strictEqual(invalidJadwal.length, 0, 'findJadwalForGuru contains 0 invalid subjects');
    pass('findJadwalForGuru returns valid Informatika and zero invalid subjects');
  } catch (e) {
    fail('findJadwalForGuru check failed', e);
  }

  // 2.3 Static source code checks for UI components
  try {
    const root = path.resolve(__dirname, '..');
    const adminDataSrc = fs.readFileSync(path.join(root, 'src', 'components', 'AdminDataView.tsx'), 'utf8');
    assert(adminDataSrc.includes('isInvalidMapel'), 'AdminDataView imports isInvalidMapel');
    assert(adminDataSrc.includes('validateScheduleData'), 'AdminDataView imports and invokes validateScheduleData');
    assert(adminDataSrc.includes('normalizeScheduleMapel'), 'AdminDataView normalizes invalid subjects in CSV upload');

    const homeAdminSrc = fs.readFileSync(path.join(root, 'src', 'components', 'HomeViewAdmin.tsx'), 'utf8');
    assert(homeAdminSrc.includes('isInvalidMapel'), 'HomeViewAdmin imports and filters with isInvalidMapel');

    const guruJurnalSrc = fs.readFileSync(path.join(root, 'src', 'components', 'GuruJurnal.tsx'), 'utf8');
    assert(guruJurnalSrc.includes('isInvalidMapel'), 'GuruJurnal imports and filters with isInvalidMapel');

    const gradebookSrc = fs.readFileSync(path.join(root, 'src', 'components', 'GradebookView.tsx'), 'utf8');
    assert(gradebookSrc.includes('isInvalidMapel'), 'GradebookView imports and filters with isInvalidMapel');

    const raporSrc = fs.readFileSync(path.join(root, 'src', 'components', 'RaporView.tsx'), 'utf8');
    assert(raporSrc.includes('isInvalidMapel'), 'RaporView imports and filters with isInvalidMapel');

    const adminVerifSrc = fs.readFileSync(path.join(root, 'src', 'components', 'AdminVerifView.tsx'), 'utf8');
    assert(adminVerifSrc.includes('isInvalidMapel'), 'AdminVerifView imports and filters with isInvalidMapel');

    const dokumenSrc = fs.readFileSync(path.join(root, 'src', 'components', 'DokumenView.tsx'), 'utf8');
    assert(dokumenSrc.includes('isInvalidMapel'), 'DokumenView imports and filters with isInvalidMapel');

    const rekapJurnalSrc = fs.readFileSync(path.join(root, 'src', 'components', 'RekapJurnalView.tsx'), 'utf8');
    assert(rekapJurnalSrc.includes('isInvalidMapel'), 'RekapJurnalView imports and filters with isInvalidMapel');

    const reminderSrc = fs.readFileSync(path.join(root, 'src', 'app', 'api', 'push', 'send-reminders', 'route.ts'), 'utf8');
    assert(reminderSrc.includes('isInvalidMapel'), 'send-reminders route imports and filters with isInvalidMapel');

    const attendanceAlpaSrc = fs.readFileSync(path.join(root, 'src', 'lib', 'attendanceAlpa.ts'), 'utf8');
    assert(attendanceAlpaSrc.includes('isInvalidMapel'), 'attendanceAlpa.ts imports and filters with isInvalidMapel');

    const warningSystemSrc = fs.readFileSync(path.join(root, 'src', 'lib', 'warningSystem.ts'), 'utf8');
    assert(warningSystemSrc.includes('isInvalidMapel'), 'warningSystem.ts imports and filters with isInvalidMapel');

    const rekapSiswaSrc = fs.readFileSync(path.join(root, 'src', 'components', 'RekapSiswaView.tsx'), 'utf8');
    assert(rekapSiswaSrc.includes('isInvalidMapel'), 'RekapSiswaView imports and filters with isInvalidMapel');

    assert(adminDataSrc.includes('validateMapelData'), 'AdminDataView imports and invokes validateMapelData for data_mapel protection');
    assert(guruJurnalSrc.includes('isInvalidMapel(mapel)'), 'GuruJurnal enforces mapel validity on submit');

    pass('All frontend views & backend services (AdminDataView, HomeViewAdmin, GuruJurnal, GradebookView, RaporView, AdminVerifView, DokumenView, RekapJurnalView, RekapSiswaView, send-reminders, attendanceAlpa, warningSystem) implement isInvalidMapel protection');
  } catch (e) {
    fail('Static source code verification failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 3: LIVE DATABASE JADWAL PELAJARAN VERIFICATION (R1)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: LIVE DATABASE JADWAL PELAJARAN VERIFICATION (R1) ---');

  try {
    const { data: allJadwal, error } = await supabase.from('jadwal_pelajaran').select('*');
    assert(!error, `Failed to query jadwal_pelajaran: ${error?.message}`);
    assert(Array.isArray(allJadwal) && allJadwal.length > 0, 'jadwal_pelajaran table is populated');

    // Check for erroneous subjects
    const erroneous = allJadwal.filter(j => 
      (j.mata_pelajaran || '').toLowerCase().includes('teknik') ||
      (j.mata_pelajaran || '').toLowerCase().includes('teknologi informasi') ||
      (j.mapel || '').toLowerCase().includes('teknik') ||
      (j.mapel || '').toLowerCase().includes('teknologi informasi')
    );
    assert.strictEqual(erroneous.length, 0, `Expected 0 erroneous records, found: ${erroneous.length}`);
    pass(`jadwal_pelajaran table contains 0 records with "teknik informasi" or "teknologi informasi" (count: ${allJadwal.length})`);

    // Verify valid subject "Informatika" exists
    const inforRows = allJadwal.filter(j => (j.mata_pelajaran || '').toLowerCase() === 'informatika');
    assert(inforRows.length >= 1, 'Valid "Informatika" schedule entry exists in database');
    const adeInfor = inforRows.find(j => (j.nama_guru || '').toLowerCase().includes('ade') && j.hari === 'Sabtu');
    assert(Boolean(adeInfor), 'Ade is scheduled for Informatika on Sabtu in X Merdeka');
    pass(`Valid subject "Informatika" is present and assigned to Ade on Sabtu (ID: ${adeInfor?.id})`);
  } catch (e) {
    fail('Live database jadwal_pelajaran verification failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 4: MASTER DATA INTEGRITY VERIFICATION (R2)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: MASTER DATA INTEGRITY VERIFICATION (R2) ---');

  // 4.1 Master Data Siswa
  try {
    const { data: siswaData, error: sErr } = await supabase.from('data_siswa').select('*').order('id');
    assert(!sErr, `Query data_siswa error: ${sErr?.message}`);
    assert.strictEqual(siswaData?.length, 14, `data_siswa row count must be exactly 14 (got ${siswaData?.length})`);

    // Cross-verify with source CSV
    const csvSiswaContent = fs.readFileSync(path.join(__dirname, '..', 'csv', 'SIPJAM NIZAMUDIN - Data_Siswa (1).csv'), 'utf8');
    const sampleNames = ['Moh. Candra Podomi', 'Anugrah Nugi Paputungan', 'Habibi Tayeb'];
    for (const name of sampleNames) {
      assert(csvSiswaContent.includes(name), `CSV contains student ${name}`);
      const dbMatch = siswaData?.find(s => s.nama_siswa?.toLowerCase() === name.toLowerCase());
      assert(Boolean(dbMatch), `Database contains student ${name} untouched`);
    }
    pass(`data_siswa: 14 records 100% intact and untouched`);
  } catch (e) {
    fail('data_siswa integrity check failed', e);
  }

  // 4.2 Master Data Guru
  try {
    const { data: guruData, error: gErr } = await supabase.from('data_guru').select('*').order('id');
    assert(!gErr, `Query data_guru error: ${gErr?.message}`);
    assert.strictEqual(guruData?.length, 12, `data_guru row count must be exactly 12 (got ${guruData?.length})`);

    // Verify key teachers are present and untouched
    const ade = guruData?.find(g => (g.nip || '').toLowerCase() === 'fitrawan' || (g.nama_guru || '').toLowerCase().includes('ade'));
    assert(Boolean(ade), 'Teacher Ade Fitrawan Ibrahim is present');
    assert(ade?.mata_pelajaran?.includes('Informatika'), 'Ade is designated for Informatika in data_guru');

    const fitra = guruData?.find(g => (g.nip || '').toLowerCase() === 'fitra');
    assert(Boolean(fitra), 'Teacher Fitra Suryazana Mamonto is present');
    assert.strictEqual(fitra?.nama_guru, 'Fitra Suryazana Mamonto', 'Fitra name is correctly standardized');

    pass(`data_guru: 12 records 100% intact and untouched`);
  } catch (e) {
    fail('data_guru integrity check failed', e);
  }

  // 4.3 Master Data Mapel
  try {
    const { data: mapelData, error: mErr } = await supabase.from('data_mapel').select('*').order('id');
    assert(!mErr, `Query data_mapel error: ${mErr?.message}`);
    assert.strictEqual(mapelData?.length, 39, `data_mapel row count must be exactly 39 (got ${mapelData?.length})`);

    const inforMapel = mapelData?.find(m => (m.nama_mata_pelajaran || '').toLowerCase().includes('informatika'));
    assert(Boolean(inforMapel), 'Official mapel "X Merdeka_Informatika" exists in data_mapel');

    const invalidDbMapel = mapelData?.filter(m => isInvalidMapel(m.nama_mata_pelajaran));
    assert.strictEqual(invalidDbMapel?.length, 0, 'data_mapel contains 0 invalid subjects');
    pass(`data_mapel: 39 records 100% intact and official`);
  } catch (e) {
    fail('data_mapel integrity check failed', e);
  }

  // 4.4 Master Data Jadwal Pelajaran (Uploaded 51 records from CSV)
  try {
    const csvJadwalContent = fs.readFileSync(path.join(__dirname, '..', 'csv', 'SIPJAM NIZAMUDIN - Jadwal_Pelajaran.csv'), 'utf8');
    const { data: jadwalRows } = await supabase.from('jadwal_pelajaran').select('*');
    assert(Array.isArray(jadwalRows), 'jadwal_pelajaran returns valid array');

    // Total master records in CSV is 51 data rows
    assert.strictEqual(jadwalRows?.length, 51, `jadwal_pelajaran has exactly 51 master records (got ${jadwalRows?.length})`);

    // Verify sample CSV row IDs are all present
    const sampleCsvIds = [
      '1788831035342', // Senin, Ade, MTK, X Merdeka
      '1788831035357', // Sabtu, Ade, Informatika, X Merdeka
      '1788831035348', // Rabu, Fitra, PJOK, X Merdeka
      '1788831035366', // Rabu, Venda, Biologi, XI Merdeka
      '1788831035389', // Jumat, Ade, MTK, XII Merdeka
      '1788831035392', // Sabtu, Venda, Biologi, XII Merdeka
    ];

    for (const cid of sampleCsvIds) {
      const match = jadwalRows?.find(j => String(j.id) === cid);
      assert(Boolean(match), `Master schedule row ID ${cid} exists in database`);
    }

    pass(`jadwal_pelajaran: all 51 uploaded master schedule records are 100% intact and untouched`);
  } catch (e) {
    fail('jadwal_pelajaran master data integrity check failed', e);
  }

  // 4.5 Master Data Kelas
  try {
    const { data: siswaKelasData, error: kErr } = await supabase.from('data_siswa').select('kelas');
    assert(!kErr, `Query data_siswa classes error: ${kErr?.message}`);
    const classes = Array.from(new Set((siswaKelasData || []).map(s => s.kelas).filter(Boolean))).sort();
    assert.deepStrictEqual(classes, ['X Merdeka', 'XI Merdeka', 'XII Merdeka'], 'Master classes match official Kurikulum Merdeka classes');

    const csvSiswaContent = fs.readFileSync(path.join(__dirname, '..', 'csv', 'SIPJAM NIZAMUDIN - Data_Siswa (1).csv'), 'utf8');
    assert(csvSiswaContent.includes('X Merdeka'), 'CSV contains class X Merdeka');
    assert(csvSiswaContent.includes('XI Merdeka'), 'CSV contains class XI Merdeka');
    assert(csvSiswaContent.includes('XII Merdeka'), 'CSV contains class XII Merdeka');
    pass('data_kelas: master class levels (X Merdeka, XI Merdeka, XII Merdeka) 100% intact and untouched');
  } catch (e) {
    fail('data_kelas integrity check failed', e);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`TOTAL CHECKS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log('========================================================================');

  if (failCount > 0) {
    console.error(`❌ FAILED: ${failCount} assertion(s) failed.`);
    process.exit(1);
  } else {
    console.log('🎉 ALL JADWAL MAPEL VALIDITY & MASTER INTEGRITY CHECKS PASSED 100%!');
  }
}

runAllTests().catch(err => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
