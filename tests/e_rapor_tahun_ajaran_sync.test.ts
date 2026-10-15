import fs from 'fs';
import path from 'path';
import assert from 'assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RaporView from '../src/components/RaporView';

console.log('================================================================');
console.log('  TEST SUITE: E-RAPOR TAHUN AJARAN & SEMESTER SYNC VERIFICATION ');
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
  const adminConfigPath = path.join(__dirname, '../src/components/AdminConfigView.tsx');
  
  assert.ok(fs.existsSync(raporViewPath), 'RaporView.tsx must exist');
  assert.ok(fs.existsSync(adminConfigPath), 'AdminConfigView.tsx must exist');

  const raporContent = fs.readFileSync(raporViewPath, 'utf8');
  const adminConfigContent = fs.readFileSync(adminConfigPath, 'utf8');

  console.log('━━━ R1. AUTOMATIC SYNC FROM PENGATURAN & REALTIME LISTENER ━━━');

  runTest('R1-01: RaporView queries active school config from pengaturan table', () => {
    assert.ok(
      raporContent.includes(".from('pengaturan').select('*')"),
      'Must query pengaturan table for active school settings'
    );
    assert.ok(
      raporContent.includes('item.key?.toLowerCase()') || raporContent.includes("k === 'tahun_ajaran'"),
      'Must check key tahun_ajaran and semester'
    );
    assert.ok(
      raporContent.includes('fetchSchoolConfig'),
      'Must define fetchSchoolConfig helper'
    );
  });

  runTest('R1-02: RaporView listens to sipjam:config_updated custom event', () => {
    assert.ok(
      raporContent.includes("window.addEventListener('sipjam:config_updated', handleConfigSync)"),
      'Must attach event listener for sipjam:config_updated'
    );
    assert.ok(
      raporContent.includes("window.removeEventListener('sipjam:config_updated', handleConfigSync)"),
      'Must clean up event listener on unmount'
    );
  });

  runTest('R1-03: AdminConfigView includes tahun_ajaran and semester in syncPayload', () => {
    assert.ok(
      adminConfigContent.includes('tahun_ajaran: saveConfig.tahun_ajaran') &&
      adminConfigContent.includes('semester: saveConfig.semester'),
      'AdminConfigView syncPayload must contain tahun_ajaran and semester'
    );
  });

  console.log('\n━━━ R2. DYNAMIC ACADEMIC YEAR DROPDOWN & VISUAL INDICATOR ━━━');

  runTest('R2-01: Academic year options are dynamically constructed from DB & surrounding years', () => {
    assert.ok(
      raporContent.includes('fetchTahunAjaranOptions'),
      'Must implement dynamic fetchTahunAjaranOptions'
    );
    assert.ok(
      raporContent.includes(".from('capaian_pembelajaran').select('tahun_ajaran')") &&
      raporContent.includes(".from('tujuan_pembelajaran').select('tahun_ajaran')") &&
      raporContent.includes(".from('wali_kelas').select('tahun_ajaran')") &&
      raporContent.includes(".from('jadwal_pelajaran').select('tahun_ajaran')"),
      'Must query capaian_pembelajaran, tujuan_pembelajaran, wali_kelas, and jadwal_pelajaran for recorded academic years'
    );
  });

  runTest('R2-02: Dropdown options are not locked to hardcoded 2024/2025 and 2025/2026', () => {
    assert.ok(
      raporContent.includes('tahunAjaranList.map'),
      'Tahun Ajaran dropdown must map dynamically over tahunAjaranList'
    );
    assert.ok(
      raporContent.includes("ta === activeSchoolTahunAjaran ? ' (Aktif)' : ''"),
      'Active school year must be tagged with (Aktif)'
    );
  });

  console.log('\n━━━ R3. QUERY CONSISTENCY & PRINT DOCUMENT ACCURACY ━━━');

  runTest('R3-01: Data queries reactively depend on selectedTahunAjaran and selectedSemester', () => {
    assert.ok(
      raporContent.includes(".eq('semester', selectedSemester)") &&
      raporContent.includes(".eq('tahun_ajaran', selectedTahunAjaran)"),
      'Capaian & tujuan pembelajaran queries must filter by selectedSemester & selectedTahunAjaran'
    );
    assert.ok(
      raporContent.includes('[selectedKelas, sekolahId, selectedSemester, selectedTahunAjaran]'),
      'fetchClassData dependency array must contain selectedSemester & selectedTahunAjaran'
    );
  });

  runTest('R3-02: Printed sheet explicitly displays accurate Semester and Tahun Ajaran', () => {
    assert.ok(
      raporContent.includes('KURIKULUM DEEP LEARNING — SEMESTER {selectedSemester.toUpperCase()} TAHUN AJARAN {selectedTahunAjaran}'),
      'Print header must include selectedSemester and selectedTahunAjaran'
    );
    assert.ok(
      raporContent.includes('Tahun Ajaran</span>') &&
      raporContent.includes('{selectedTahunAjaran}</span>'),
      'Student identity grid must include Tahun Ajaran field'
    );
  });

  runTest('R3-03: Print document title is formatted with student, class, semester, and tahun ajaran', () => {
    assert.ok(
      raporContent.includes('document.title = printDocTitle') ||
      raporContent.includes('document.title = `E-Rapor_'),
      'Must set document.title with student and academic year metadata during print'
    );
    assert.ok(
      raporContent.includes("window.addEventListener('beforeprint'") &&
      raporContent.includes("window.addEventListener('afterprint'"),
      'Must handle beforeprint and afterprint to synchronize document.title cleanly'
    );
  });

  console.log('\n━━━ SSR COMPATIBILITY & REGRESSION CHECK ━━━');

  runTest('R4-01: SSR render succeeds with active badge and dynamic selects', () => {
    const adminUser = { id: 'admin-1', nama: 'Admin Sekolah', role: 'Admin', sekolah_id: 'sch-1' };
    const html = renderToStaticMarkup(
      React.createElement(RaporView, { user: adminUser, assignedKelas: null })
    );
    assert.ok(html.includes('Administrator'), 'Header renders Administrator');
    assert.ok(html.includes('(Aktif)'), 'Dropdown renders (Aktif) option indicator');
    assert.ok(html.includes('Kurikulum Deep Learning'), 'Renders Kurikulum Deep Learning');
  });

  console.log('\n================================================================');
  console.log(`  E-RAPOR SYNC TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exitCode = 1;
});
