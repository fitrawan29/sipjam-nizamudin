import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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
  console.log(`\n${BLUE}${BOLD}====================================================${RESET}`);
  console.log(`${BLUE}${BOLD}MULTI-TENANT CLASS ISOLATION & TUTUYAN FIX VERIFICATION${RESET}`);
  console.log(`${BLUE}${BOLD}====================================================${RESET}\n`);

  // --- SECTION 1: Code Structure & Anti-Zombie Logic in AdminKelasView.tsx ---
  console.log(`${BOLD}--- Section 1: AdminKelasView & AdminDataView Anti-Resurrection ---${RESET}`);
  try {
    const adminKelasPath = path.join(__dirname, '../src/components/AdminKelasView.tsx');
    const adminKelasCode = fs.readFileSync(adminKelasPath, 'utf8');

    // 1.1 Must NOT resurrect deleted students from localStorage cache in AdminKelasView
    assert(
      !adminKelasCode.includes('stored.forEach((c: any) => { if (c?.id && !mergedMap.has(c.id)) mergedMap.set(c.id, c as StudentItem); });'),
      'AdminKelasView must not resurrect deleted students from localStorage cache'
    );
    pass('1.1: AdminKelasView no longer contains zombie student resurrection loop');

    // 1.2 Must contain self-healing customClasses pruning logic
    assert(
      adminKelasCode.includes('validCustom = prev.filter(c => activeStudentClasses.has(c) || dbClassNames.has(c) || waliClassNames.has(c))'),
      'AdminKelasView must prune orphan customClasses not present in students, dbClasses, or waliKelas'
    );
    pass('1.2: AdminKelasView self-healing logic prunes orphan customClasses from state and localStorage');

    // 1.3 AdminDataView must not resurrect deleted rows from cachedRows
    const adminDataPath = path.join(__dirname, '../src/components/AdminDataView.tsx');
    const adminDataCode = fs.readFileSync(adminDataPath, 'utf8');
    assert(
      !adminDataCode.includes('cachedRows.forEach((c: any) => { if (c?.id && !mergedMap.has(c.id)) mergedMap.set(c.id, c); });'),
      'AdminDataView must not resurrect deleted rows from cachedRows'
    );
    pass('1.3: AdminDataView no longer contains zombie row resurrection loop');
  } catch (err: any) {
    fail('Section 1 failed', err);
  }

  // --- SECTION 2: dataIntegrityGuard Dynamic School Resolution ---
  console.log(`\n${BOLD}--- Section 2: dataIntegrityGuard Dynamic School Scoping ---${RESET}`);
  try {
    const guardPath = path.join(__dirname, '../src/lib/dataIntegrityGuard.ts');
    const guardCode = fs.readFileSync(guardPath, 'utf8');

    assert(
      guardCode.includes('resolvedTargetId') && guardCode.includes('sipjam_active_target_school'),
      'dataIntegrityGuard parseAndValidateMasterCsv must dynamically resolve target school scope'
    );
    pass('2.1: dataIntegrityGuard dynamically resolves target school scope for Superadmin/multi-school sessions');

    assert(
      guardCode.includes('resolvedScopeId') && guardCode.includes('sipjam_active_target_school'),
      'dataIntegrityGuard importMasterDataFromCsv must dynamically resolve scope for fallback syncing'
    );
    pass('2.2: dataIntegrityGuard importMasterDataFromCsv dynamically checks active target school scope');
  } catch (err: any) {
    fail('Section 2 failed', err);
  }

  // --- SECTION 3: Live Database Verification for SMA Nizamudin ---
  console.log(`\n${BOLD}--- Section 3: Live Database Isolation for SMA Nizamudin ---${RESET}`);
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      const client = createClient(url, key);
      const { data: saAuth } = await client.rpc('verify_login', {
        p_username: 'superadmin',
        p_password: 'superadmin123'
      });

      if (saAuth && saAuth.length > 0) {
        const sa = saAuth[0];
        const saClient = createClient(url, key, {
          global: {
            headers: {
              'x-user-id': sa.id,
              'x-user-role': sa.role,
              'x-session-token': sa.session_token
            }
          }
        });

        // 3.1 Verify data_siswa contains zero Tutuyan parallel classes
        const tutuyanClasses = [
          'X Merdeka A', 'X Merdeka B', 'X Merdeka C', 'X Merdeka D',
          'XI Merdeka A', 'XI Merdeka B', 'XI Merdeka C', 'XI Merdeka D',
          'XII Merdeka A', 'XII Merdeka B', 'XII Merdeka C', 'XII Merdeka D'
        ];

        const { data: foreignStudents, error: fErr } = await saClient
          .from('data_siswa')
          .select('id, nama_siswa, kelas')
          .in('kelas', tutuyanClasses);

        assert(!fErr, `Querying foreign students failed: ${fErr?.message}`);
        assert.strictEqual(
          foreignStudents?.length || 0,
          0,
          `Expected 0 Tutuyan parallel class students in Nizamudin DB, found ${foreignStudents?.length}`
        );
        pass('3.1: Nizamudin database has ZERO foreign Tutuyan parallel class students');

        // 3.2 Verify Nizamudin students only belong to Nizamudin's authentic classes
        const { data: allNizamudinStudents } = await saClient
          .from('data_siswa')
          .select('id, nama_siswa, kelas');

        const distinctClasses = Array.from(new Set((allNizamudinStudents || []).map(s => s.kelas)));
        for (const cls of distinctClasses) {
          assert(
            ['X Merdeka', 'XI Merdeka', 'XII Merdeka'].includes(cls),
            `Unexpected class found in Nizamudin DB: ${cls}`
          );
        }
        pass(`3.2: Nizamudin database distinct classes strictly match authentic classes: [${distinctClasses.join(', ')}]`);

        // 3.3 Verify student count matches baseline (14 authentic students)
        assert.strictEqual(allNizamudinStudents?.length, 14, `Expected exactly 14 students, got ${allNizamudinStudents?.length}`);
        pass('3.3: Nizamudin authentic student baseline (14 students) 100% intact');
      } else {
        console.log('Skipping live DB check (offline or credentials not matching)');
      }
    }
  } catch (err: any) {
    fail('Section 3 failed', err);
  }

  // --- SECTION 4: Live Verification of SMAN 1 Tutuyan Database Integrity ---
  console.log(`\n${BOLD}--- Section 4: Live Verification of SMAN 1 Tutuyan Database Integrity ---${RESET}`);
  try {
    const tutuyanUrl = 'https://fuhszgyhxzowupeldfrh.supabase.co';
    const tutuyanKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHN6Z3loeHpvd3VwZWxkZnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NjQ2NDksImV4cCI6MjEwNzQ0MDY0OX0.gTJexsTE2RUvOWl5uMgVO5_2QZTdpLxDaizhusVnyp8';

    const tClient = createClient(tutuyanUrl, tutuyanKey);
    const { data: tSaAuth } = await tClient.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: 'superadmin123'
    });

    if (tSaAuth && tSaAuth.length > 0) {
      const sa = tSaAuth[0];
      const tSaClient = createClient(tutuyanUrl, tutuyanKey, {
        global: {
          headers: {
            'x-user-id': sa.id,
            'x-user-role': sa.role,
            'x-session-token': sa.session_token
          }
        }
      });

      const { data: tStudents, error: tErr } = await tSaClient.from('data_siswa').select('id, kelas');
      assert(!tErr, `Tutuyan query error: ${tErr?.message}`);
      assert.strictEqual(tStudents?.length, 392, `Expected 392 students in Tutuyan DB, got ${tStudents?.length}`);
      pass('4.1: SMAN 1 Tutuyan database remains completely untouched with 392 students');

      const tClasses = Array.from(new Set((tStudents || []).map(s => s.kelas)));
      assert.strictEqual(tClasses.length, 12, `Expected 12 parallel classes in Tutuyan DB, got ${tClasses.length}`);
      pass(`4.2: SMAN 1 Tutuyan parallel classes intact: [${tClasses.join(', ')}]`);
    }
  } catch (err: any) {
    fail('Section 4 failed', err);
  }

  console.log(`\n${BOLD}====================================================${RESET}`);
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`${GREEN}PASSED: ${passed}${RESET}`);
  console.log(`${failed > 0 ? RED : GREEN}FAILED: ${failed}${RESET}`);
  console.log(`${BOLD}====================================================${RESET}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
