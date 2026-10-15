import fs from 'fs';
import path from 'path';
import assert from 'assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RaporView from '../src/components/RaporView';

console.log('================================================================');
console.log('  TEST SUITE: E-RAPOR REAL SUPABASE DATA PIPELINE & ADMIN UI     ');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      return (res as Promise<void>)
        .then(() => {
          passedTests++;
          console.log(`  ✔ [PASS] ${name}`);
        })
        .catch((err: any) => {
          console.error(`  ✖ [FAIL] ${name}`);
          console.error(`     Error: ${err.message}`);
          process.exitCode = 1;
        });
    } else {
      passedTests++;
      console.log(`  ✔ [PASS] ${name}`);
    }
  } catch (err: any) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

async function main() {
  const raporViewPath = path.join(__dirname, '../src/components/RaporView.tsx');
  assert.ok(fs.existsSync(raporViewPath), 'RaporView.tsx must exist');
  const content = fs.readFileSync(raporViewPath, 'utf8');

  console.log('━━━ 1. ELIMINATION OF MOCK / PSEUDO-RANDOM CODE ━━━');

  runTest('AC1-01: Static DEFAULT_MAPEL_LIST is completely deleted from RaporView.tsx', () => {
    assert.strictEqual(
      content.includes('DEFAULT_MAPEL_LIST'),
      false,
      'DEFAULT_MAPEL_LIST must be removed from RaporView.tsx'
    );
  });

  runTest('AC1-02: Pseudo-random charCodeAt seed scoring is completely removed', () => {
    assert.strictEqual(
      content.includes('charCodeAt'),
      false,
      'charCodeAt seeded calculation must not exist in RaporView.tsx'
    );
  });

  console.log('\n━━━ 2. REAL SUPABASE DATA PIPELINE & INTEGRATION ━━━');

  runTest('AC2-01: Queries guru_mapel and data_mapel for active subjects', () => {
    assert.ok(
      content.includes(".from('guru_mapel')"),
      'Must query guru_mapel for class subjects'
    );
    assert.ok(
      content.includes(".from('data_mapel')"),
      'Must query data_mapel as fallback/supplement'
    );
  });

  runTest('AC2-02: Queries tujuan_pembelajaran, asesmen_kolom, and nilai_siswa', () => {
    assert.ok(
      content.includes(".from('tujuan_pembelajaran')"),
      'Must query tujuan_pembelajaran'
    );
    assert.ok(
      content.includes(".from('asesmen_kolom')"),
      'Must query asesmen_kolom'
    );
    assert.ok(
      content.includes(".from('nilai_siswa')"),
      'Must query nilai_siswa'
    );
  });

  runTest('AC2-03: Graceful fallback for subjects without assessment data (renders - and clean status)', () => {
    assert.ok(
      content.includes("item.nilaiAkhir !== null && item.nilaiAkhir !== undefined ? item.nilaiAkhir : '-'"),
      'Must render - when subject has no scores'
    );
    assert.ok(
      content.includes("avgData.avg") && content.includes("studentAverageMap"),
      'Student average map must handle missing scores gracefully'
    );
  });

  console.log('\n━━━ 3. ADMIN CONTEXT & SIGNATURES ━━━');

  runTest('AC3-01: Header displays "Administrator" badge for Admin role in SSR render', () => {
    const adminUser = { id: 'admin-1', nama: 'Bapak Admin', role: 'Admin', sekolah_id: 'sch-1' };
    const html = renderToStaticMarkup(
      React.createElement(RaporView, { user: adminUser, assignedKelas: null })
    );
    assert.ok(html.includes('Administrator'), 'Header must contain Administrator badge');
    assert.strictEqual(
      html.includes('>Wali Kelas<'),
      false,
      'Admin header must NOT show Wali Kelas badge'
    );
  });

  runTest('AC3-02: Header displays "Administrator" badge for Superadmin role in SSR render', () => {
    const superUser = { id: 'super-1', nama: 'Superadmin', role: 'Superadmin', sekolah_id: 'sch-1' };
    const html = renderToStaticMarkup(
      React.createElement(RaporView, { user: superUser, assignedKelas: null })
    );
    assert.ok(html.includes('Administrator'), 'Header must contain Administrator badge for superadmin');
  });

  runTest('AC3-03: Header displays "Wali Kelas" badge for homeroom teacher', () => {
    const waliUser = { id: 'guru-1', nama: 'Ibu Wali', role: 'guru', sekolah_id: 'sch-1' };
    const html = renderToStaticMarkup(
      React.createElement(RaporView, { user: waliUser, assignedKelas: 'X-A' })
    );
    assert.ok(html.includes('Wali Kelas'), 'Header must contain Wali Kelas badge for teacher');
  });

  runTest('AC3-04: Queries assigned wali_kelas and data_guru for dynamic print signature', () => {
    assert.ok(
      content.includes(".from('wali_kelas')") && content.includes("setAssignedWaliInfo"),
      'Must fetch assigned wali kelas info for print signature'
    );
    assert.ok(
      content.includes("rightName={assignedWaliInfo?.nama_guru"),
      'PrintSignature must prioritize assigned wali kelas name'
    );
  });

  console.log('\n━━━ 4. DATABASE PERSISTENCE FOR NOTES & DEEP LEARNING ━━━');

  runTest('AC4-01: Persists Catatan Wali Kelas to Supabase pengaturan', () => {
    assert.ok(
      content.includes("saveCatatanToSupabase"),
      'Must implement saveCatatanToSupabase'
    );
    assert.ok(
      content.includes(".from('pengaturan').upsert"),
      'Must upsert notes to Supabase pengaturan'
    );
  });

  runTest('AC4-02: Persists Deep Learning observations to Supabase pengaturan', () => {
    assert.ok(
      content.includes("saveDlToSupabase"),
      'Must implement saveDlToSupabase'
    );
  });

  runTest('AC4-03: Sediakan mekanisme simpan/autosave yang dapat diakses Admin dan Wali Kelas', () => {
    assert.ok(
      content.includes("handleManualSave"),
      'Must provide manual save handler'
    );
    assert.ok(
      content.includes("Simpan Rapor"),
      'Must render button Simpan Rapor'
    );
    assert.ok(
      content.includes("catatanDebounceRef"),
      'Must implement debounced auto-saving'
    );
  });

  console.log('\n================================================================');
  console.log(`  E-RAPOR TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exitCode = 1;
});
