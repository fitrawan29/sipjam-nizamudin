import assert from 'assert';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const rootDir = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });

import {
  isInvalidMapel,
  normalizeScheduleMapel,
  validateScheduleData,
  validateMapelData,
  validateTeacherData,
} from '../../../src/lib/dataIntegrityGuard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function getSuperadminClient() {
  const baseClient = createClient(supabaseUrl, supabaseKey);
  const { data: loginData } = await baseClient.rpc('verify_login', {
    p_username: 'superadmin',
    p_password: 'SipjamSuperAdmin2026!'
  });
  const sessionToken = loginData?.[0]?.session_token;

  const { setServerTenantContext } = await import('../../../src/lib/supabaseClient');
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

async function runIndependentAudit() {
  console.log('========================================================================');
  console.log('🔍 INDEPENDENT VICTORY AUDITOR VERIFICATION RUN');
  console.log('========================================================================\n');

  const supabase = await getSuperadminClient();

  // SECTION 1: MASTER DATA INTEGRITY DEEP CHECK
  console.log('--- 1. MASTER DATA INTEGRITY AUDIT ---');

  // 1.1 Jadwal Pelajaran
  const { data: dbJadwal, error: jErr } = await supabase.from('jadwal_pelajaran').select('*').order('id');
  assert(!jErr, `Failed to query jadwal_pelajaran: ${jErr?.message}`);
  assert(Array.isArray(dbJadwal), 'jadwal_pelajaran must be array');
  console.log(`Live DB Jadwal rows: ${dbJadwal.length}`);
  assert.strictEqual(dbJadwal.length, 51, 'Live DB Jadwal must contain exactly 51 rows (100% master data preserved)');

  // Ensure rogue row c0000000-0000-0000-0000-000000000001 is completely gone
  const rogueRow = dbJadwal.find(j => j.id === 'c0000000-0000-0000-0000-000000000001');
  assert(!rogueRow, 'Rogue test row c0000000-0000-0000-0000-000000000001 must not exist');

  // Verify zero invalid subjects exist anywhere in jadwal_pelajaran
  const invalidJadwal = dbJadwal.filter(j => isInvalidMapel(j.mata_pelajaran || j.mapel));
  assert.strictEqual(invalidJadwal.length, 0, `jadwal_pelajaran must have 0 invalid subjects, found: ${invalidJadwal.length}`);
  console.log(`✔ jadwal_pelajaran: Exactly 51 rows intact, 0 invalid subjects (zero "teknik informasi" / "teknologi informasi").`);

  // Verify valid subject "Informatika" exists for Ade on Sabtu in X Merdeka
  const adeInformatika = dbJadwal.find(j => 
    (j.mata_pelajaran || '').toLowerCase() === 'informatika' &&
    j.hari === 'Sabtu' &&
    (j.nama_guru || '').toLowerCase().includes('ade')
  );
  assert(Boolean(adeInformatika), 'Ade must be scheduled for Informatika on Sabtu in X Merdeka');
  assert.strictEqual(adeInformatika?.kelas, 'X Merdeka', 'Ade Informatika class must be X Merdeka');
  assert.strictEqual(String(adeInformatika?.id), '1788831035357', 'Ade Informatika ID must match master ID 1788831035357');
  console.log(`✔ Valid subject "Informatika" verified: ID 1788831035357, Sabtu, Ade, X Merdeka.`);

  // 1.2 Data Guru
  const { data: dbGuru, error: gErr } = await supabase.from('data_guru').select('*').order('id');
  assert(!gErr, `Query data_guru error: ${gErr?.message}`);
  console.log(`Live DB Guru rows: ${dbGuru?.length}`);
  assert.strictEqual(dbGuru?.length, 12, 'Live DB Guru must have 12 records');
  for (const g of dbGuru || []) {
    assert(!isInvalidMapel(g.mata_pelajaran), `Teacher ${g.nama_guru} has invalid mapel: ${g.mata_pelajaran}`);
  }
  const adeGuru = dbGuru?.find(g => (g.nip || '').toLowerCase() === 'fitrawan' || (g.nama_guru || '').toLowerCase().includes('ade'));
  assert(Boolean(adeGuru), 'Ade Fitrawan Ibrahim exists in data_guru');
  assert(adeGuru?.mata_pelajaran?.includes('Informatika'), 'Ade is assigned Informatika in data_guru');
  console.log(`✔ Data Guru: 12/12 records verified intact, 0 invalid subject references.`);

  // 1.3 Data Siswa
  const { data: dbSiswa, error: sErr } = await supabase.from('data_siswa').select('*').order('id');
  assert(!sErr, `Query data_siswa error: ${sErr?.message}`);
  console.log(`Live DB Siswa rows: ${dbSiswa?.length}`);
  assert.strictEqual(dbSiswa?.length, 14, 'Live DB Siswa must have 14 records');
  console.log(`✔ Data Siswa: 14/14 records verified intact.`);

  // 1.4 Data Mapel
  const { data: dbMapel, error: mErr } = await supabase.from('data_mapel').select('*').order('id');
  assert(!mErr, `Query data_mapel error: ${mErr?.message}`);
  console.log(`Live DB Mapel rows: ${dbMapel?.length}`);
  assert.strictEqual(dbMapel?.length, 39, 'Live DB Mapel must have 39 records');
  const invalidInMapel = (dbMapel || []).filter(m => isInvalidMapel(m.nama_mata_pelajaran));
  assert.strictEqual(invalidInMapel.length, 0, 'data_mapel must have 0 invalid subjects');
  const inforMapel = dbMapel?.find(m => (m.nama_mata_pelajaran || '').toLowerCase().includes('informatika'));
  assert(Boolean(inforMapel), 'Official mapel "X Merdeka_Informatika" exists in data_mapel');
  console.log(`✔ Data Mapel: 39/39 records verified intact, 0 invalid subjects.`);

  // 1.5 Master Classes
  const { data: siswaKelasData, error: kErr } = await supabase.from('data_siswa').select('kelas');
  assert(!kErr, `Query data_siswa classes error: ${kErr?.message}`);
  const classes = Array.from(new Set((siswaKelasData || []).map(s => s.kelas).filter(Boolean))).sort();
  assert.deepStrictEqual(classes, ['X Merdeka', 'XI Merdeka', 'XII Merdeka'], 'Master classes match official Kurikulum Merdeka classes');
  console.log(`✔ Data Kelas: Classes ['X Merdeka', 'XI Merdeka', 'XII Merdeka'] 100% intact.`);

  // SECTION 2: SUBJECT VALIDATION & NORMALIZATION ADVERSARIAL STRESS TEST
  console.log('\n--- 2. ADVERSARIAL STRESS TEST: SUBJECT GUARDS ---');

  const adversarialInvalidInputs = [
    'teknik informasi',
    'TEKNIK INFORMASI',
    '  Teknik   Informasi  ',
    'teknologi informasi',
    'TEKNOLOGI INFORMASI',
    'teknik-informasi',
    'teknik_informasi',
    'teknik.informasi',
    'teknik/informasi',
    'teknik informatika',
    'Teknik Informatika',
    'tekinfo',
    'tek info',
    'tek  info',
    'teknik dan informasi',
    'teknologi informasi dan komunikasi',
    'tik',
    'TIK',
    't.i.k.',
    'T.I.K.',
    'TIK.',
    'X Merdeka_Teknik Informasi',
    'XI Merdeka_Teknologi Informasi',
    'XII Merdeka_TIK',
    'X-1_Teknik Informasi',
    'X.1_teknik informasi'
  ];

  for (const input of adversarialInvalidInputs) {
    assert.strictEqual(isInvalidMapel(input), true, `Must flag as invalid: "${input}"`);
    const norm = normalizeScheduleMapel(input);
    assert(norm.endsWith('Informatika'), `Normalized output must be Informatika: "${input}" -> "${norm}"`);
    const valRes = validateScheduleData(input, 'Ade', 'X Merdeka');
    assert.strictEqual(valRes.valid, false, `validateScheduleData must reject: "${input}"`);
    const mapelRes = validateMapelData(input);
    assert.strictEqual(mapelRes.valid, false, `validateMapelData must reject: "${input}"`);
  }
  console.log(`✔ All ${adversarialInvalidInputs.length} adversarial invalid inputs rejected and normalized.`);

  const validInputs = [
    'Informatika',
    'informatika',
    'INFORMATIKA',
    'X Merdeka_Informatika',
    'XI Merdeka_Informatika',
    'MTK',
    'B. Ing',
    'B. Indo',
    'PAI BP',
    'PJOK',
    'Geografi',
    'Biologi',
    'PP',
    'Sejarah',
    'Fisika',
    'Sosiologi',
    'Kimia',
    'Ekonomi',
    'MTL',
    'SB'
  ];

  for (const valid of validInputs) {
    assert.strictEqual(isInvalidMapel(valid), false, `Must NOT flag valid subject: "${valid}"`);
    const norm = normalizeScheduleMapel(valid);
    assert.strictEqual(norm, valid, `Normalizer must preserve valid subject: "${valid}" -> "${norm}"`);
    const valRes = validateScheduleData(valid, 'Guru', 'X Merdeka');
    assert.strictEqual(valRes.valid, true, `validateScheduleData must accept: "${valid}"`);
  }
  console.log(`✔ All ${validInputs.length} valid Kurikulum Merdeka subjects preserved and accepted.`);

  // SECTION 3: WORKFLOW INTEGRATION CHECK
  console.log('\n--- 3. WORKFLOW INTEGRATION CHECK ---');
  const { findJadwalForGuru } = await import('../../../src/lib/workflow');
  const adeJadwalSabtu = await findJadwalForGuru('Sabtu', 'Ade Fitrawan Ibrahim', 'Fitrawan');
  const adeInformatikaWF = adeJadwalSabtu.find(j => (j.mata_pelajaran || '').toLowerCase() === 'informatika');
  assert(Boolean(adeInformatikaWF), 'Ade must have valid Informatika on Sabtu in workflow');
  assert.strictEqual(adeInformatikaWF?.kelas, 'X Merdeka', 'Ade teaches Informatika in X Merdeka');
  console.log(`✔ Workflow verified: Ade is scheduled for Informatika on Sabtu in X Merdeka (ID: ${adeInformatikaWF?.id}).`);

  console.log('\n========================================================================');
  console.log('🎯 INDEPENDENT AUDIT VERDICT: ALL ASSERTIONS PASSED WITH ZERO ERRORS.');
  console.log('========================================================================');
}

runIndependentAudit().catch(err => {
  console.error('❌ Audit failure:', err);
  process.exit(1);
});
