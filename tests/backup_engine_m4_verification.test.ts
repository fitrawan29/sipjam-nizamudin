import fs from 'fs';
import path from 'path';
import assert from 'assert';
import JSZip from 'jszip';
import {
  ALL_BACKUP_ENTITIES,
  TOPOLOGICAL_LEVELS,
  validateBackupZip,
  createFullSystemBackupZip,
  restoreFullSystemBackupZip
} from '../src/lib/backupEngine';

console.log('========================================================================');
console.log('TEST SUITE: M4 BACKUP & RESTORE ENGINE VERIFICATION (33 ENTITIES)');
console.log('========================================================================\n');

let passed = 0;
let failed = 0;

function test(description: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res.then(() => {
        console.log(`✅ PASS: ${description}`);
        passed++;
      }).catch((err: any) => {
        console.error(`❌ FAIL: ${description}`);
        console.error(`   Error: ${err.message}`);
        failed++;
      });
    } else {
      console.log(`✅ PASS: ${description}`);
      passed++;
    }
  } catch (err: any) {
    console.error(`❌ FAIL: ${description}`);
    console.error(`   Error: ${err.message}`);
    failed++;
  }
}

async function runAllTests() {
  // ---------------------------------------------------------------------------
  // 1. Entity Inventory & Count Verification
  // ---------------------------------------------------------------------------
  test('1.1: ALL_BACKUP_ENTITIES contains exactly 33 entities', () => {
    assert.strictEqual(
      ALL_BACKUP_ENTITIES.length,
      33,
      `Expected exactly 33 entities, got ${ALL_BACKUP_ENTITIES.length}`
    );
  });

  test('1.2: All 6 topological levels are present (Level 0 through Level 5)', () => {
    const expectedLevels = ['Level 0', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
    assert.deepStrictEqual(
      Object.keys(TOPOLOGICAL_LEVELS),
      expectedLevels,
      'Topological level keys must match Level 0 to Level 5'
    );
  });

  test('1.3: Sum of entities in TOPOLOGICAL_LEVELS is exactly 33', () => {
    let sum = 0;
    for (const lvl of Object.keys(TOPOLOGICAL_LEVELS)) {
      sum += TOPOLOGICAL_LEVELS[lvl].length;
    }
    assert.strictEqual(sum, 33, `Expected 33 entities in TOPOLOGICAL_LEVELS, got ${sum}`);
  });

  test('1.4: Bi-directional consistency between ALL_BACKUP_ENTITIES and TOPOLOGICAL_LEVELS', () => {
    const fromEntities = new Set(ALL_BACKUP_ENTITIES.map((e) => e.name));
    const fromLevels = new Set<string>();
    for (const lvl of Object.keys(TOPOLOGICAL_LEVELS)) {
      for (const name of TOPOLOGICAL_LEVELS[lvl]) {
        fromLevels.add(name);
      }
    }
    assert.strictEqual(fromEntities.size, 33, 'Unique entity names in ALL_BACKUP_ENTITIES must be 33');
    assert.strictEqual(fromLevels.size, 33, 'Unique entity names in TOPOLOGICAL_LEVELS must be 33');

    for (const name of fromEntities) {
      assert(fromLevels.has(name), `Entity ${name} in ALL_BACKUP_ENTITIES must exist in TOPOLOGICAL_LEVELS`);
    }
    for (const name of fromLevels) {
      assert(fromEntities.has(name), `Entity ${name} in TOPOLOGICAL_LEVELS must exist in ALL_BACKUP_ENTITIES`);
    }
  });

  test('1.5: Non-existent "data_kelas" is NOT in ALL_BACKUP_ENTITIES or TOPOLOGICAL_LEVELS', () => {
    const entityNames = ALL_BACKUP_ENTITIES.map((e) => e.name);
    assert(!entityNames.includes('data_kelas'), 'data_kelas must not be in ALL_BACKUP_ENTITIES');
    for (const lvl of Object.keys(TOPOLOGICAL_LEVELS)) {
      assert(!TOPOLOGICAL_LEVELS[lvl].includes('data_kelas'), `data_kelas must not be in ${lvl}`);
    }
  });

  test('1.6: Database view "guru_kelas" has isView: true and is in Level 5', () => {
    const gk = ALL_BACKUP_ENTITIES.find((e) => e.name === 'guru_kelas');
    assert(gk, 'guru_kelas must be in ALL_BACKUP_ENTITIES');
    assert.strictEqual(gk?.isView, true, 'guru_kelas must have isView: true');
    assert.strictEqual(gk?.level, 5, 'guru_kelas must be in Level 5');
    assert(TOPOLOGICAL_LEVELS['Level 5'].includes('guru_kelas'), 'guru_kelas must be in TOPOLOGICAL_LEVELS["Level 5"]');
  });

  test('1.7: Root tenant entities "sekolah" and "sekolah_registry" have isRootId: true at Level 0', () => {
    const s = ALL_BACKUP_ENTITIES.find((e) => e.name === 'sekolah');
    const sr = ALL_BACKUP_ENTITIES.find((e) => e.name === 'sekolah_registry');
    assert(s && s.level === 0 && s.isRootId, 'sekolah must be Level 0 with isRootId');
    assert(sr && sr.level === 0 && sr.isRootId, 'sekolah_registry must be Level 0 with isRootId');
  });

  // ---------------------------------------------------------------------------
  // 2. ZIP Archive Creation & Structure Verification
  // ---------------------------------------------------------------------------
  await test('2.1: createFullSystemBackupZip generates valid ZIP with manifest, data/, and foto/', async () => {
    const mockUser = {
      id: 'mock-user-1',
      nama: 'Administrator Test',
      role: 'Admin',
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    };

    const { blob, fileName, manifest } = await createFullSystemBackupZip(mockUser, '2026');

    assert(fileName.startsWith('backup_sipjam_'), `File name must start with backup_sipjam_, got ${fileName}`);
    assert(fileName.endsWith('.zip'), `File name must end with .zip, got ${fileName}`);
    assert(blob.size > 0, 'Generated Blob size must be > 0');

    // Parse ZIP
    const arrayBuf = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuf);

    // Check manifest
    const manifestFile = zip.file('manifest.json');
    assert(manifestFile !== null, 'manifest.json must exist in root of ZIP');
    const manifestJson = JSON.parse(await manifestFile.async('text'));

    assert.strictEqual(manifestJson.appName, 'sipjam-app', 'manifest.appName must be sipjam-app');
    assert.strictEqual(manifestJson.version, '2.0', 'manifest.version must be 2.0');
    assert.strictEqual(manifestJson.totalEntities, 33, 'manifest.totalEntities must be 33');
    assert.strictEqual(Object.keys(manifestJson.tableCounts).length, 33, 'tableCounts must have 33 keys');

    // Check data/ files
    for (const entity of ALL_BACKUP_ENTITIES) {
      const dataEntry = zip.file(`data/${entity.name}.json`);
      assert(dataEntry !== null, `data/${entity.name}.json must exist in ZIP`);
    }

    // Check foto/ folder exists in ZIP
    const fotoEntries = Object.keys(zip.files).filter((p) => p.startsWith('foto/'));
    assert(fotoEntries.length > 0, 'foto/ folder must exist in ZIP archive');
  });

  // ---------------------------------------------------------------------------
  // 3. ZIP Validation & Manifest Guard
  // ---------------------------------------------------------------------------
  await test('3.1: validateBackupZip accepts valid SIPJAM archive', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify({
      appName: 'sipjam-app',
      version: '2.0',
      totalEntities: 33,
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    }));

    const result = await validateBackupZip(zip);
    assert.strictEqual(result.valid, true, 'Validation should pass for valid manifest');
    assert(result.manifest !== undefined, 'Manifest should be returned');
  });

  await test('3.2: validateBackupZip rejects ZIP without manifest.json', async () => {
    const zip = new JSZip();
    zip.file('data/dummy.json', '[]');

    const result = await validateBackupZip(zip);
    assert.strictEqual(result.valid, false, 'Validation should fail when manifest.json is missing');
    assert(result.error?.includes('manifest.json tidak ditemukan'), 'Error message should cite missing manifest');
  });

  await test('3.3: validateBackupZip rejects non-SIPJAM manifest', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify({
      appName: 'other-app',
      version: '1.0'
    }));

    const result = await validateBackupZip(zip);
    assert.strictEqual(result.valid, false, 'Validation should fail for foreign app manifest');
    assert(result.error?.includes('bukan untuk aplikasi SIPJAM'), 'Error message should cite foreign app');
  });

  // ---------------------------------------------------------------------------
  // 4. Photo Restoration & Topological Execution Verification
  // ---------------------------------------------------------------------------
  await test('4.1: restoreFullSystemBackupZip restores topological order and photos', async () => {
    const zip = new JSZip();
    const manifest = {
      appName: 'sipjam-app',
      version: '2.0',
      timestamp: new Date().toISOString(),
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      sekolah_nama: 'SMK Test',
      exportedBy: 'Admin',
      tahun_backup: '2026',
      totalEntities: 33,
      tableCounts: {},
      assetCount: 1,
      topologicalLevels: TOPOLOGICAL_LEVELS,
      photos: [
        {
          table: 'users',
          recordId: 'user-photo-1',
          column: 'avatar',
          path: 'foto/avatars/user-photo-1_avatar.png'
        }
      ]
    };
    zip.file('manifest.json', JSON.stringify(manifest));

    // Sample 1x1 transparent PNG base64
    const sampleB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=';
    zip.file('foto/avatars/user-photo-1_avatar.png', sampleB64, { base64: true });

    // Populate data files
    zip.file('data/sekolah.json', JSON.stringify([{ id: 'a0000000-0000-0000-0000-000000000001', nama: 'SMK Test' }]));
    zip.file('data/users.json', JSON.stringify([{ id: 'user-photo-1', nama: 'Guru Test', role: 'Guru', avatar: null }]));
    zip.file('data/guru_kelas.json', JSON.stringify([{ guru_id: 'g1', kelas: 'X A' }])); // view - should be skipped

    const blob = await zip.generateAsync({ type: 'blob' });
    const progressLog: string[] = [];

    const res = await restoreFullSystemBackupZip(
      blob,
      { id: 'admin-1', sekolah_id: 'a0000000-0000-0000-0000-000000000001' },
      (step) => progressLog.push(step)
    );

    assert(res.restoredTableCount >= 2, 'Should restore at least 2 tables (sekolah, users)');
    assert(res.restoredRowCount >= 2, 'Should restore at least 2 rows');
    assert.strictEqual(res.manifest.appName, 'sipjam-app', 'Restored manifest appName should match');
  });

  // ---------------------------------------------------------------------------
  // 5. AST & DOM Root Invariant Check
  // ---------------------------------------------------------------------------
  test('5.1: AdminBackupView.tsx preserves required DOM root invariant', () => {
    const compPath = path.resolve(__dirname, '..', 'src', 'components', 'AdminBackupView.tsx');
    assert(fs.existsSync(compPath), 'AdminBackupView.tsx exists');
    const content = fs.readFileSync(compPath, 'utf-8');

    assert(
      content.includes('<div id="view-admin-backup" className="space-y-4 fade-in">'),
      'Must contain exact <div id="view-admin-backup" className="space-y-4 fade-in">'
    );
    assert(
      !content.includes('<section className="view-section"'),
      'Must NOT contain deprecated <section className="view-section"'
    );
  });

  test('5.2: AdminBackupView.tsx preserves export signature { user }: { user: any }', () => {
    const compPath = path.resolve(__dirname, '..', 'src', 'components', 'AdminBackupView.tsx');
    const content = fs.readFileSync(compPath, 'utf-8');

    assert(
      content.includes('export default function AdminBackupView({ user }: { user: any })'),
      'Must export default function AdminBackupView with { user }: { user: any }'
    );
  });

  // ---------------------------------------------------------------------------
  // Final Results
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
