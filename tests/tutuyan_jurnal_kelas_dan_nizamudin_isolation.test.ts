import assert from 'assert';
import path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  connectGuruMapelWithJadwal,
  filterGuruMapelByHari,
  isJurnalMatchJadwal,
  resolveCanonicalClass,
} from '../src/lib/workflow';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passed = 0;
let failed = 0;

function pass(msg: string) {
  console.log(`${GREEN}✅ PASS:${RESET} ${msg}`);
  passed++;
}

function fail(msg: string, error?: any) {
  console.error(`${RED}❌ FAIL:${RESET} ${msg}`);
  if (error) console.error(error);
  failed++;
}

async function runTests() {
  console.log(`\n${BLUE}${BOLD}========================================================================${RESET}`);
  console.log(`${BLUE}${BOLD}VERIFIKASI JURNAL KBM SMAN 1 TUTUYAN & ISOLASI SMA NIZAMUDIN${RESET}`);
  console.log(`${BLUE}${BOLD}========================================================================${RESET}\n`);

  // --- SECTION 1: Unit Logic for resolveCanonicalClass ---
  console.log(`${BOLD}--- Section 1: Pure Logic of resolveCanonicalClass ---${RESET}`);
  try {
    const tutuyanClasses = [
      'X Merdeka A', 'X Merdeka B', 'X Merdeka C', 'X Merdeka D',
      'XI Merdeka A', 'XI Merdeka B', 'XI Merdeka C', 'XI Merdeka D',
      'XII Merdeka A', 'XII Merdeka B', 'XII Merdeka C', 'XII Merdeka D'
    ];

    // Tutuyan subjects ending with parallel class
    assert.strictEqual(
      resolveCanonicalClass('XII Merdeka', 'B. Indonesia - XII C', tutuyanClasses),
      'XII Merdeka C',
      'Should resolve B. Indonesia - XII C to XII Merdeka C'
    );
    pass('1.1: B. Indonesia - XII C maps to XII Merdeka C');

    assert.strictEqual(
      resolveCanonicalClass('X Merdeka', 'IPS Sosiologi - X A', tutuyanClasses),
      'X Merdeka A',
      'Should resolve IPS Sosiologi - X A to X Merdeka A'
    );
    pass('1.2: IPS Sosiologi - X A maps to X Merdeka A');

    assert.strictEqual(
      resolveCanonicalClass('XI Merdeka', 'Fisika - XI D', tutuyanClasses),
      'XI Merdeka D',
      'Should resolve Fisika - XI D to XI Merdeka D'
    );
    pass('1.3: Fisika - XI D maps to XI Merdeka D');

    assert.strictEqual(
      resolveCanonicalClass('Geografi - XI B', 'Geografi - XI B', tutuyanClasses),
      'XI Merdeka B',
      'Should resolve guru_mapel malformed class Geografi - XI B to XI Merdeka B'
    );
    pass('1.4: Malformed guru_mapel class name Geografi - XI B resolves to XI Merdeka B');

    // Nizamudin subjects with bare Merdeka
    const nizamudinClasses = ['X Merdeka', 'XI Merdeka', 'XII Merdeka'];
    assert.strictEqual(
      resolveCanonicalClass('X Merdeka', 'X Merdeka_MTK', nizamudinClasses),
      'X Merdeka',
      'Nizamudin X Merdeka_MTK must remain X Merdeka'
    );
    pass('1.5: Nizamudin X Merdeka_MTK strictly remains X Merdeka');

    assert.strictEqual(
      resolveCanonicalClass('XI Merdeka', 'Informatika', nizamudinClasses),
      'XI Merdeka',
      'Nizamudin Informatika must remain XI Merdeka'
    );
    pass('1.6: Nizamudin bare mapel strictly preserves bare class');
  } catch (err: any) {
    fail('Section 1 failed', err);
  }

  // --- SECTION 2: isJurnalMatchJadwal Parallel Alignment ---
  console.log(`\n${BOLD}--- Section 2: isJurnalMatchJadwal Cross-Format Alignment ---${RESET}`);
  try {
    // 2.1 Match when both use parallel class
    assert(
      isJurnalMatchJadwal(
        { kelas: 'XII Merdeka C', mapel: 'B. Indonesia - XII C' },
        { kelas: 'XII Merdeka C', mata_pelajaran: 'B. Indonesia - XII C' }
      ),
      'Exact parallel class match must succeed'
    );
    pass('2.1: Exact parallel class match (XII Merdeka C === XII Merdeka C) succeeds');

    // 2.2 Match when jadwal has broad grade but mapel has parallel suffix
    assert(
      isJurnalMatchJadwal(
        { kelas: 'XII Merdeka C', mapel: 'B. Indonesia - XII C' },
        { kelas: 'XII Merdeka', mata_pelajaran: 'B. Indonesia - XII C' }
      ),
      'Parallel journal matches generic schedule when subject has parallel suffix'
    );
    pass('2.2: Parallel journal (XII Merdeka C) matches generic schedule (XII Merdeka) via subject suffix (- XII C)');

    // 2.3 Must NOT match wrong parallel class
    assert(
      !isJurnalMatchJadwal(
        { kelas: 'XII Merdeka B', mapel: 'B. Indonesia - XII B' },
        { kelas: 'XII Merdeka', mata_pelajaran: 'B. Indonesia - XII C' }
      ),
      'Journal for XII Merdeka B must NOT match schedule for XII Merdeka C'
    );
    pass('2.3: Parallel class mismatch (XII Merdeka B vs - XII C) strictly rejected');

    // 2.4 Nizamudin matching remains 100% intact
    assert(
      isJurnalMatchJadwal(
        { kelas: 'X Merdeka', mapel: 'X Merdeka_MTK' },
        { kelas: 'X Merdeka', mata_pelajaran: 'MTK' }
      ),
      'Nizamudin X Merdeka journal must match MTK schedule'
    );
    pass('2.4: Nizamudin schedule matching (X Merdeka_MTK vs MTK) intact');
  } catch (err: any) {
    fail('Section 2 failed', err);
  }

  // --- SECTION 3: Live Verification of SMAN 1 Tutuyan Database & Teacher Workflow ---
  console.log(`\n${BOLD}--- Section 3: Live SMAN 1 Tutuyan Database & Teacher Workflow ---${RESET}`);
  try {
    const tutuyanUrl = 'https://fuhszgyhxzowupeldfrh.supabase.co';
    const tutuyanAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHN6Z3loeHpvd3VwZWxkZnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NjQ2NDksImV4cCI6MjEwNzQ0MDY0OX0.gTJexsTE2RUvOWl5uMgVO5_2QZTdpLxDaizhusVnyp8';

    const tClient = createClient(tutuyanUrl, tutuyanAnonKey);
    const { data: authData } = await tClient.rpc('verify_login', {
      p_username: 'admin',
      p_password: 'admin123'
    });

    if (authData && authData.length > 0) {
      const auth = authData[0];
      const tutuyanSchoolId = auth.sekolah_id;

      const saClient = createClient(tutuyanUrl, tutuyanAnonKey, {
        global: {
          headers: {
            'x-user-id': auth.id,
            'x-user-role': auth.role,
            'x-session-token': auth.session_token,
            'x-sekolah-id': tutuyanSchoolId
          }
        }
      });

      // 3.1 Verify jadwal_pelajaran distinct classes in Tutuyan
      const { data: tJadwals } = await saClient
        .from('jadwal_pelajaran')
        .select('id, nama_guru, mata_pelajaran, kelas, hari')
        .eq('sekolah_id', tutuyanSchoolId);

      const distinctJClasses = Array.from(new Set((tJadwals || []).map(j => j.kelas))).sort();
      assert(distinctJClasses.length >= 3, `Expected at least 3 distinct classes in jadwal, got ${distinctJClasses.length}`);
      for (const c of distinctJClasses) {
        assert(
          /^(X|XI|XII)\s+Merdeka(\s+[A-D])?$/.test(c),
          `Unexpected class in Tutuyan jadwal: ${c}`
        );
      }
      pass(`3.1: Schedule slots carry valid curriculum classes: [${distinctJClasses.join(', ')}]`);

    // 3.2 Verify student count for each parallel class
    const { data: tStudents } = await saClient
      .from('data_siswa')
      .select('id, nama_siswa, kelas')
      .eq('sekolah_id', tutuyanSchoolId);

    assert.strictEqual(tStudents?.length, 392, `Expected 392 students in Tutuyan DB, got ${tStudents?.length}`);
    for (const cls of distinctJClasses) {
      const count = (tStudents || []).filter(s => s.kelas === cls || s.kelas.startsWith(cls)).length;
      assert(count > 0, `Class ${cls} should have students, got 0`);
    }
    pass('3.2: Every parallel class in Tutuyan contains real students (total 392 students)');

    // 3.3 Test Karmila Potabuga connected mapel and classes
    const karmilaJadwals = (tJadwals || []).filter(j => (j.nama_guru || '').toLowerCase().includes('karmila'));
    assert(karmilaJadwals.length > 0, 'Karmila Potabuga should have schedule entries');

    const { data: tMapels } = await saClient.from('data_mapel').select('*').eq('sekolah_id', tutuyanSchoolId);
    const { data: tGm } = await saClient.from('guru_mapel').select('*').eq('sekolah_id', tutuyanSchoolId);

    const distinctParallelClasses = Array.from(new Set((tStudents || []).map(s => s.kelas))).sort();

    const connectedKarmila = connectGuruMapelWithJadwal(
      { nama_guru: 'Karmila Potabuga' },
      tJadwals || [],
      tMapels || [],
      tGm || [],
      undefined,
      distinctParallelClasses
    );

    const karmilaClasses = Array.from(new Set(connectedKarmila.map(c => c.kelas))).sort();
    assert(
      karmilaClasses.every(c => /^(X|XI|XII)\s+Merdeka\s+[A-D]$/.test(c)),
      `Karmila classes must all be parallel classes, got: ${karmilaClasses.join(', ')}`
    );
    assert(karmilaClasses.includes('XII Merdeka C'), 'Karmila must teach XII Merdeka C');
    pass(`3.3: Karmila Potabuga correctly resolves parallel classes: [${karmilaClasses.join(', ')}]`);

    // 3.4 Karmila Monday schedule filtering
    const mondayAssignments = filterGuruMapelByHari(connectedKarmila, 'Senin');
    const mondayClasses = Array.from(new Set(mondayAssignments.map(a => a.kelas))).sort();
    assert(mondayClasses.includes('XII Merdeka C'), 'Monday assignments must include XII Merdeka C');
    pass(`3.4: Karmila Monday assignments strictly resolve to parallel classes: [${mondayClasses.join(', ')}]`);
    }
  } catch (err: any) {
    fail('Section 3 failed', err);
  }

  // --- SECTION 4: Live Verification of SMA Nizamudin Database Integrity ---
  console.log(`\n${BOLD}--- Section 4: Live SMA Nizamudin Integrity Check ---${RESET}`);
  try {
    const nizUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const nizKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (nizUrl && nizKey) {
      const client = createClient(nizUrl, nizKey);
      const { data: login } = await client.rpc('verify_login', {
        p_username: 'superadmin',
        p_password: 'superadmin123'
      });

      if (login && login.length > 0) {
        const u = login[0];
        const nClient = createClient(nizUrl, nizKey, {
          global: {
            headers: {
              'x-user-id': u.id,
              'x-user-role': u.role,
              'x-session-token': u.session_token
            }
          }
        });

        // Verify Nizamudin data_siswa has ZERO parallel classes
        const { data: nStudents } = await nClient.from('data_siswa').select('id, kelas');
        const nClasses = Array.from(new Set((nStudents || []).map(s => s.kelas))).sort();
        assert.deepStrictEqual(
          nClasses,
          ['X Merdeka', 'XI Merdeka', 'XII Merdeka'],
          `Nizamudin classes must strictly be ['X Merdeka', 'XI Merdeka', 'XII Merdeka'], got: ${JSON.stringify(nClasses)}`
        );
        pass('4.1: SMA Nizamudin classes strictly remain [X Merdeka, XI Merdeka, XII Merdeka]');

        // Verify Nizamudin jadwal_pelajaran has ZERO parallel classes
        const { data: nJadwal } = await nClient.from('jadwal_pelajaran').select('id, kelas');
        const nJadwalClasses = Array.from(new Set((nJadwal || []).map(j => j.kelas))).sort();
        assert.deepStrictEqual(
          nJadwalClasses,
          ['X Merdeka', 'XI Merdeka', 'XII Merdeka'],
          `Nizamudin schedule classes must strictly be [X Merdeka, XI Merdeka, XII Merdeka], got: ${JSON.stringify(nJadwalClasses)}`
        );
        pass('4.2: SMA Nizamudin schedule classes strictly remain [X Merdeka, XI Merdeka, XII Merdeka] with zero pollution');
      }
    }
  } catch (err: any) {
    fail('Section 4 failed', err);
  }

  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`${GREEN}PASSED: ${passed}${RESET}`);
  console.log(`${failed > 0 ? RED : GREEN}FAILED: ${failed}${RESET}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
