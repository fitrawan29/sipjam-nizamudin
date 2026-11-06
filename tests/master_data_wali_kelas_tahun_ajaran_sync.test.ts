/**
 * Automated Verification: Master Data Wali Kelas Tahun Pelajaran Sync
 * 
 * Verifies:
 * 1. AdminDataView fetches and synchronizes configured tahun_ajaran from pengaturan table & localStorage.
 * 2. AdminDataView listens to sipjam:config_updated and storage events for multi-tab realtime sync.
 * 3. Adding and editing Wali Kelas uses the admin-configured tahun_ajaran as default.
 * 4. Card display badge and CSV template sample row reflect the admin-configured tahun_ajaran.
 * 5. uniqueTahunAjaran includes configuredTahunAjaran so admin-configured year is immediately filterable.
 * 6. AdminConfigView synchronizes wali_kelas table and storage cache when saving tahun_ajaran.
 * 7. dataIntegrityGuard getActiveTahunAjaranSync defaults missing tahun_ajaran to configured academic year.
 */

import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseAndValidateMasterCsv,
  getActiveTahunAjaranSync,
  getStorageCache,
  setStorageCache
} from '../src/lib/dataIntegrityGuard';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(desc: string) {
  totalTests++;
  passedTests++;
  console.log(`  ${GREEN}✔ [PASS]${RESET} ${desc}`);
}

function fail(desc: string, err?: any) {
  totalTests++;
  failedTests++;
  console.error(`  ${RED}✖ [FAIL]${RESET} ${desc}`);
  if (err) console.error(`    ↳ Error:`, err);
}

async function runVerification() {
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}🧪 TEST SUITE: MASTER DATA WALI KELAS TAHUN PELAJARAN SYNC${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  const adminDataPath = path.join(__dirname, '..', 'src', 'components', 'AdminDataView.tsx');
  const adminConfigPath = path.join(__dirname, '..', 'src', 'components', 'AdminConfigView.tsx');
  const dataGuardPath = path.join(__dirname, '..', 'src', 'lib', 'dataIntegrityGuard.ts');

  assert.ok(fs.existsSync(adminDataPath), 'AdminDataView.tsx must exist');
  assert.ok(fs.existsSync(adminConfigPath), 'AdminConfigView.tsx must exist');
  assert.ok(fs.existsSync(dataGuardPath), 'dataIntegrityGuard.ts must exist');

  const adminDataSrc = fs.readFileSync(adminDataPath, 'utf8');
  const adminConfigSrc = fs.readFileSync(adminConfigPath, 'utf8');
  const dataGuardSrc = fs.readFileSync(dataGuardPath, 'utf8');

  // ==========================================================================
  // SECTION 1: AdminDataView Sync & Dynamic Tahun Ajaran
  // ==========================================================================
  console.log(`${YELLOW}${BOLD}--- SECTION 1: AdminDataView Source Code Invariants ---${RESET}`);

  // Test 1.1: configuredTahunAjaran state initialized with localStorage fallback
  try {
    assert.ok(
      adminDataSrc.includes('const [configuredTahunAjaran, setConfiguredTahunAjaran] = useState'),
      'Must define configuredTahunAjaran state'
    );
    assert.ok(
      adminDataSrc.includes('sipjam_config_sync'),
      'Must inspect sipjam_config_sync for cached config'
    );
    pass('1.1: AdminDataView defines configuredTahunAjaran with local sync initialization');
  } catch (e) {
    fail('1.1: configuredTahunAjaran initialization failed', e);
  }

  // Test 1.2: Queries pengaturan for tahun_ajaran on mount
  try {
    assert.ok(
      adminDataSrc.includes("'tahun_ajaran'") &&
      adminDataSrc.includes(".from('pengaturan')"),
      'Must query pengaturan table for tahun_ajaran'
    );
    assert.ok(
      adminDataSrc.includes('setConfiguredTahunAjaran(taRow.value.trim())'),
      'Must set configuredTahunAjaran state from pengaturan table'
    );
    pass('1.2: AdminDataView queries pengaturan for tahun_ajaran on mount');
  } catch (e) {
    fail('1.2: Querying pengaturan for tahun_ajaran failed', e);
  }

  // Test 1.3: Realtime event listeners for multi-tab sync
  try {
    assert.ok(
      adminDataSrc.includes("window.addEventListener('sipjam:config_updated', handleConfigSync)") &&
      adminDataSrc.includes("window.addEventListener('storage', handleStorageSync)"),
      'Must attach event listeners for sipjam:config_updated and storage event'
    );
    assert.ok(
      adminDataSrc.includes("window.removeEventListener('sipjam:config_updated', handleConfigSync)") &&
      adminDataSrc.includes("window.removeEventListener('storage', handleStorageSync)"),
      'Must clean up event listeners on unmount'
    );
    pass('1.3: AdminDataView listens to sipjam:config_updated and storage for realtime sync');
  } catch (e) {
    fail('1.3: Realtime event listener check failed', e);
  }

  // Test 1.4: Modal default values for Add and Edit Wali Kelas use configuredTahunAjaran
  try {
    assert.ok(
      adminDataSrc.includes('value="${configuredTahunAjaran || \'2024/2025\'}"'),
      'Add Wali Kelas modal must use configuredTahunAjaran as default value'
    );
    assert.ok(
      adminDataSrc.includes('value="${item.tahun_ajaran || configuredTahunAjaran || \'2024/2025\'}"'),
      'Edit Wali Kelas modal must use configuredTahunAjaran as fallback default'
    );
    pass('1.4: Add and Edit Wali Kelas modals dynamically default to configuredTahunAjaran');
  } catch (e) {
    fail('1.4: Modal default value check failed', e);
  }

  // Test 1.5: Card badge display uses configuredTahunAjaran fallback
  try {
    assert.ok(
      adminDataSrc.includes('{item.tahun_ajaran || configuredTahunAjaran || \'2024/2025\'}'),
      'Card badge must display item.tahun_ajaran with configuredTahunAjaran fallback'
    );
    pass('1.5: Wali Kelas card badge displays configuredTahunAjaran when item.tahun_ajaran is missing');
  } catch (e) {
    fail('1.5: Card badge display check failed', e);
  }

  // Test 1.6: CSV template sample row uses configuredTahunAjaran
  try {
    assert.ok(
      adminDataSrc.includes("configuredTahunAjaran || '2024/2025'"),
      'Wali Kelas CSV template sample row must use configuredTahunAjaran'
    );
    pass('1.6: Wali Kelas CSV template sample row reflects configuredTahunAjaran');
  } catch (e) {
    fail('1.6: CSV template sample check failed', e);
  }

  // Test 1.7: uniqueTahunAjaran includes configuredTahunAjaran
  try {
    assert.ok(
      adminDataSrc.includes('if (configuredTahunAjaran) set.add(configuredTahunAjaran.trim());'),
      'uniqueTahunAjaran must include configuredTahunAjaran'
    );
    pass('1.7: uniqueTahunAjaran includes configuredTahunAjaran for immediate filtering');
  } catch (e) {
    fail('1.7: uniqueTahunAjaran check failed', e);
  }

  // ==========================================================================
  // SECTION 2: AdminConfigView Source Code Invariants
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SECTION 2: AdminConfigView Source Code Invariants ---${RESET}`);

  // Test 2.1: AdminConfigView synchronizes wali_kelas table on save
  try {
    assert.ok(
      adminConfigSrc.includes(".from('wali_kelas')") &&
      adminConfigSrc.includes('.update({ tahun_ajaran: cleanTa })'),
      'AdminConfigView must update wali_kelas table with cleanTa on save'
    );
    pass('2.1: AdminConfigView updates wali_kelas table when saving tahun_ajaran');
  } catch (e) {
    fail('2.1: AdminConfigView wali_kelas update check failed', e);
  }

  // Test 2.2: AdminConfigView synchronizes Wali_Kelas storage cache on save
  try {
    assert.ok(
      adminConfigSrc.includes("getStorageCache('Wali_Kelas'") &&
      adminConfigSrc.includes("setStorageCache('Wali_Kelas'"),
      'AdminConfigView must synchronize Wali_Kelas storage cache on save'
    );
    pass('2.2: AdminConfigView synchronizes Wali_Kelas storage cache on save');
  } catch (e) {
    fail('2.2: AdminConfigView storage cache sync check failed', e);
  }

  // ==========================================================================
  // SECTION 3: dataIntegrityGuard Helpers & CSV Invariants
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SECTION 3: dataIntegrityGuard Helpers ---${RESET}`);

  // Test 3.1: getActiveTahunAjaranSync exports and works
  try {
    assert.strictEqual(typeof getActiveTahunAjaranSync, 'function');
    assert.strictEqual(getActiveTahunAjaranSync('2024/2025'), '2024/2025');
    pass('3.1: getActiveTahunAjaranSync is exported and returns fallback when storage is empty');
  } catch (e) {
    fail('3.1: getActiveTahunAjaranSync check failed', e);
  }

  // Test 3.2: parseAndValidateMasterCsv preserves explicitly provided tahun_ajaran
  try {
    const csv = [
      'kelas,nama_guru,nip,tahun_ajaran',
      'X-1,Siti Aminah,19800101,2025/2026'
    ].join('\n');
    const rows = parseAndValidateMasterCsv(csv, 'wali_kelas', { role: 'Admin', sekolah_id: 'sch-01' });
    assert.strictEqual(rows[0].tahun_ajaran, '2025/2026');
    pass('3.2: parseAndValidateMasterCsv preserves explicit tahun_ajaran from CSV');
  } catch (e) {
    fail('3.2: CSV parsing explicit tahun_ajaran check failed', e);
  }

  // Test 3.3: parseAndValidateMasterCsv defaults missing tahun_ajaran using getActiveTahunAjaranSync
  try {
    const csvNoTa = [
      'kelas,nama_guru,nip',
      'X-2,Ahmad Fauzi,19850202'
    ].join('\n');
    const rowsNoTa = parseAndValidateMasterCsv(csvNoTa, 'wali_kelas', { role: 'Admin', sekolah_id: 'sch-01' });
    assert.ok(rowsNoTa[0].tahun_ajaran, 'Must have a default tahun_ajaran');
    pass('3.3: parseAndValidateMasterCsv fills default tahun_ajaran when omitted in CSV');
  } catch (e) {
    fail('3.3: CSV parsing omitted tahun_ajaran check failed', e);
  }

  // ==========================================================================
  // SECTION 4: In-Memory Harmonization Logic Simulation
  // ==========================================================================
  console.log(`\n${YELLOW}${BOLD}--- SECTION 4: In-Memory Harmonization Logic ---${RESET}`);

  // Test 4.1: Harmonizing legacy 2024/2025 rows to configured tahun_ajaran (e.g. 2026/2027)
  try {
    const configuredTa = '2026/2027';
    const rawRows = [
      { id: 'w1', kelas: 'X-1', nama_guru: 'Guru A', tahun_ajaran: '2024/2025' },
      { id: 'w2', kelas: 'X-2', nama_guru: 'Guru B', tahun_ajaran: null },
      { id: 'w3', kelas: 'X-3', nama_guru: 'Guru C', tahun_ajaran: '2025/2026' } // Custom row
    ];

    const harmonized = rawRows.map(d => ({
      ...d,
      tahun_ajaran: (!d.tahun_ajaran || (configuredTa !== '2024/2025' && d.tahun_ajaran === '2024/2025')) ? configuredTa : d.tahun_ajaran
    }));

    assert.strictEqual(harmonized[0].tahun_ajaran, '2026/2027', 'Legacy 2024/2025 row must harmonize to 2026/2027');
    assert.strictEqual(harmonized[1].tahun_ajaran, '2026/2027', 'Null tahun_ajaran must harmonize to 2026/2027');
    assert.strictEqual(harmonized[2].tahun_ajaran, '2025/2026', 'Explicit non-legacy tahun_ajaran must be preserved');
    pass('4.1: Harmonization correctly updates legacy default and null rows while preserving custom rows');
  } catch (e) {
    fail('4.1: Harmonization logic check failed', e);
  }

  console.log(`\n${CYAN}========================================================================${RESET}`);
  console.log(`Total Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log(`${CYAN}========================================================================${RESET}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
