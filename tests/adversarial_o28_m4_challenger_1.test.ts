import fs from 'fs';
import path from 'path';
import assert from 'assert';
import JSZip from 'jszip';
import {
  ALL_BACKUP_ENTITIES,
  TOPOLOGICAL_LEVELS,
  validateBackupZip,
  createFullSystemBackupZip,
  restoreFullSystemBackupZip,
  BackupManifest
} from '../src/lib/backupEngine';

console.log('========================================================================');
console.log('CHALLENGER 1: ADVERSARIAL STRESS TEST HARNESS (MILESTONE 4)');
console.log('========================================================================\n');

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         -> ${err.message}`);
    failures.push(`${name}: ${err.message}`);
    failed++;
  }
}

export async function runAdversarialSuite() {
  console.log('--- 1. ENTITY INVENTORY & TOPOLOGICAL INTEGRITY ---');

  await test('1.1: ALL_BACKUP_ENTITIES contains exactly 33 entities', () => {
    assert.strictEqual(ALL_BACKUP_ENTITIES.length, 33, `Expected 33, got ${ALL_BACKUP_ENTITIES.length}`);
  });

  await test('1.2: All 6 topological levels (Level 0 through Level 5) exist and sum to 33', () => {
    const levels = ['Level 0', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
    assert.deepStrictEqual(Object.keys(TOPOLOGICAL_LEVELS), levels);

    let sum = 0;
    for (const lvl of levels) {
      sum += TOPOLOGICAL_LEVELS[lvl].length;
    }
    assert.strictEqual(sum, 33, `Sum across levels must be 33, got ${sum}`);
  });

  await test('1.3: Each entity in ALL_BACKUP_ENTITIES exactly matches TOPOLOGICAL_LEVELS', () => {
    const fromEntities = new Map(ALL_BACKUP_ENTITIES.map((e) => [e.name, e.level]));
    assert.strictEqual(fromEntities.size, 33, 'Entities must be unique');

    for (let lvl = 0; lvl <= 5; lvl++) {
      const key = `Level ${lvl}`;
      for (const name of TOPOLOGICAL_LEVELS[key]) {
        assert(fromEntities.has(name), `Entity ${name} in ${key} missing from ALL_BACKUP_ENTITIES`);
        assert.strictEqual(
          fromEntities.get(name),
          lvl,
          `Entity ${name} level mismatch: configured ${fromEntities.get(name)}, expected ${lvl}`
        );
      }
    }
  });

  await test('1.4: Database view "guru_kelas" has isView: true and is in Level 5', () => {
    const gk = ALL_BACKUP_ENTITIES.find((e) => e.name === 'guru_kelas');
    assert(gk, 'guru_kelas must be in ALL_BACKUP_ENTITIES');
    assert.strictEqual(gk?.isView, true, 'guru_kelas must have isView: true');
    assert.strictEqual(gk?.level, 5, 'guru_kelas must be in Level 5');
    assert(TOPOLOGICAL_LEVELS['Level 5'].includes('guru_kelas'), 'guru_kelas must be in TOPOLOGICAL_LEVELS["Level 5"]');
  });

  await test('1.5: Non-existent "data_kelas" is completely eliminated', () => {
    assert(!ALL_BACKUP_ENTITIES.some((e) => e.name === 'data_kelas'), 'data_kelas must not exist in ALL_BACKUP_ENTITIES');
    for (const lvl of Object.keys(TOPOLOGICAL_LEVELS)) {
      assert(!TOPOLOGICAL_LEVELS[lvl].includes('data_kelas'), `data_kelas must not exist in ${lvl}`);
    }
  });

  await test('1.6: Level 0 root tenant entities have isRootId: true', () => {
    const s = ALL_BACKUP_ENTITIES.find((e) => e.name === 'sekolah');
    const sr = ALL_BACKUP_ENTITIES.find((e) => e.name === 'sekolah_registry');
    const p = ALL_BACKUP_ENTITIES.find((e) => e.name === 'pengaturan');
    assert(s && s.isRootId === true, 'sekolah must have isRootId: true');
    assert(sr && sr.isRootId === true, 'sekolah_registry must have isRootId: true');
    assert(p && p.level === 0, 'pengaturan must be Level 0');
  });

  console.log('\n--- 2. STRICT FOREIGN KEY TOPOLOGICAL ORDERING AUDIT ---');

  await test('2.1: Parse src/types/database.ts and verify zero upward FK references', () => {
    const dbTypesPath = path.resolve(__dirname, '..', 'src', 'types', 'database.ts');
    assert(fs.existsSync(dbTypesPath), 'database.ts must exist');
    const content = fs.readFileSync(dbTypesPath, 'utf-8');

    // Extract table blocks and their referencedRelation
    const entityLevelMap = new Map<string, number>();
    for (const e of ALL_BACKUP_ENTITIES) {
      entityLevelMap.set(e.name, e.level);
    }

    // Regex to scan Tables section
    const tablesMatch = content.match(/Tables:\s*\{([\s\S]*?)\n\s*Views:\s*\{/);
    assert(tablesMatch, 'Must find Tables section in database.ts');
    const tablesBlock = tablesMatch[1];

    // Find all table definitions: "<table_name>: {"
    const tableRegex = /\s*([a-z0-9_]+):\s*\{\s*Row:\s*\{[\s\S]*?Relationships:\s*\[([\s\S]*?)\]\s*\}/g;
    let match: RegExpExecArray | null;

    let checkedRelations = 0;
    while ((match = tableRegex.exec(tablesBlock)) !== null) {
      const tableName = match[1];
      const relsBlock = match[2];
      const tableLevel = entityLevelMap.get(tableName);

      assert(
        tableLevel !== undefined,
        `Table "${tableName}" in database.ts is not cataloged in ALL_BACKUP_ENTITIES!`
      );

      // Extract referencedRelation: "target_table"
      const refRegex = /referencedRelation:\s*"([^"]+)"/g;
      let refMatch: RegExpExecArray | null;
      while ((refMatch = refRegex.exec(relsBlock)) !== null) {
        const refTable = refMatch[1];
        const refLevel = entityLevelMap.get(refTable);

        // If target table is cataloged, its level must be <= tableLevel
        if (refLevel !== undefined) {
          checkedRelations++;
          assert(
            tableLevel >= refLevel,
            `Topological violation! Table "${tableName}" (Level ${tableLevel}) references "${refTable}" (Level ${refLevel}) which is in a higher level!`
          );
        }
      }
    }

    assert(checkedRelations > 15, `Expected to verify at least 15 foreign key relations, checked ${checkedRelations}`);
    console.log(`       (Verified ${checkedRelations} database foreign key relations against topological hierarchy)`);
  });

  await test('2.2: Intra-level dependency: asesmen_kolom must precede nilai_siswa in Level 5', () => {
    const level5 = TOPOLOGICAL_LEVELS['Level 5'];
    const idxAsesmen = level5.indexOf('asesmen_kolom');
    const idxNilai = level5.indexOf('nilai_siswa');
    assert(idxAsesmen !== -1, 'asesmen_kolom must be in Level 5');
    assert(idxNilai !== -1, 'nilai_siswa must be in Level 5');
    assert(
      idxAsesmen < idxNilai,
      `asesmen_kolom (index ${idxAsesmen}) must precede nilai_siswa (index ${idxNilai}) because nilai_siswa references asesmen_kolom`
    );

    const entIdxAsesmen = ALL_BACKUP_ENTITIES.findIndex((e) => e.name === 'asesmen_kolom');
    const entIdxNilai = ALL_BACKUP_ENTITIES.findIndex((e) => e.name === 'nilai_siswa');
    assert(
      entIdxAsesmen < entIdxNilai,
      `In ALL_BACKUP_ENTITIES, asesmen_kolom (idx ${entIdxAsesmen}) must precede nilai_siswa (idx ${entIdxNilai})`
    );
  });

  console.log('\n--- 3. ZIP CREATION SIMULATION & MANIFEST SCHEMA ---');

  await test('3.1: createFullSystemBackupZip outputs valid archive with 33 JSON files, foto/ directory, and manifest', async () => {
    const mockUser = {
      id: 'mock-admin-uuid-1',
      nama: 'Testing Administrator',
      role: 'Admin',
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    };

    const progressLog: string[] = [];
    const { blob, fileName, manifest } = await createFullSystemBackupZip(
      mockUser,
      '2026',
      (step, cur, tot) => progressLog.push(`${step} (${cur}/${tot})`)
    );

    assert(fileName.startsWith('backup_sipjam_'), `File name must start with backup_sipjam_, got ${fileName}`);
    assert(fileName.endsWith('.zip'), `File name must end with .zip, got ${fileName}`);
    assert(blob.size > 0, 'Blob size must be positive');
    assert(progressLog.length >= 33, 'Progress callback should be called for all entities');

    // Load with JSZip
    const arrayBuf = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuf);

    // 1. Verify manifest.json
    const manifestFile = zip.file('manifest.json');
    assert(manifestFile !== null, 'manifest.json must exist at root of ZIP');
    const parsedManifest: BackupManifest = JSON.parse(await manifestFile.async('text'));

    assert.strictEqual(parsedManifest.appName, 'sipjam-app');
    assert.strictEqual(parsedManifest.version, '2.0');
    assert.strictEqual(parsedManifest.totalEntities, 33);
    assert.strictEqual(parsedManifest.sekolah_id, mockUser.sekolah_id);
    assert.strictEqual(parsedManifest.tahun_backup, '2026');
    assert.strictEqual(Object.keys(parsedManifest.tableCounts).length, 33);
    assert.strictEqual(typeof parsedManifest.assetCount, 'number');
    assert(Array.isArray(parsedManifest.photos), 'manifest.photos must be an array');
    assert.deepStrictEqual(parsedManifest.topologicalLevels, TOPOLOGICAL_LEVELS);

    // 2. Verify data/ folder contains all 33 entity JSON files
    for (const entity of ALL_BACKUP_ENTITIES) {
      const dataFile = zip.file(`data/${entity.name}.json`);
      assert(dataFile !== null, `ZIP data/ directory must contain ${entity.name}.json`);
      const rawText = await dataFile.async('text');
      const parsedData = JSON.parse(rawText);
      assert(Array.isArray(parsedData), `data/${entity.name}.json content must be an array`);
    }

    // 3. Verify foto/ directory exists (even with .gitkeep if 0 assets)
    const fotoFiles = Object.keys(zip.files).filter((k) => k.startsWith('foto/'));
    assert(fotoFiles.length > 0, 'foto/ directory entries must exist in ZIP');
    if (parsedManifest.assetCount === 0) {
      assert(zip.file('foto/.gitkeep') !== null, 'foto/.gitkeep must be present for empty photo assets');
    }
  });

  console.log('\n--- 4. ADVERSARIAL VALIDATION OF BACKUP ARCHIVE ---');

  await test('4.1: validateBackupZip rejects archive without manifest.json', async () => {
    const zip = new JSZip();
    zip.file('data/users.json', '[]');
    const result = await validateBackupZip(zip);
    assert.strictEqual(result.valid, false);
    assert(result.error?.includes('manifest.json tidak ditemukan'));
  });

  await test('4.2: validateBackupZip rejects corrupt manifest.json', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', '{ this is broken JSON !!!');
    const result = await validateBackupZip(zip);
    assert.strictEqual(result.valid, false);
    assert(result.error?.includes('rusak atau bukan format JSON'));
  });

  await test('4.3: validateBackupZip rejects wrong app identity', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify({
      appName: 'other-incompatible-system',
      version: '1.0'
    }));
    const result = await validateBackupZip(zip);
    assert.strictEqual(result.valid, false);
    assert(result.error?.includes('bukan untuk aplikasi SIPJAM'));
  });

  await test('4.4: validateBackupZip accepts valid sipjam-app and legacy SIPJAM', async () => {
    const zip1 = new JSZip();
    zip1.file('manifest.json', JSON.stringify({ appName: 'sipjam-app', version: '2.0', totalEntities: 33 }));
    const res1 = await validateBackupZip(zip1);
    assert.strictEqual(res1.valid, true);

    const zip2 = new JSZip();
    zip2.file('manifest.json', JSON.stringify({ appName: 'SIPJAM', version: '1.0', totalEntities: 33 }));
    const res2 = await validateBackupZip(zip2);
    assert.strictEqual(res2.valid, true);
  });

  console.log('\n--- 5. RESTORATION ENGINE & TOPOLOGICAL ORDER SIMULATION ---');

  await test('5.1: restoreFullSystemBackupZip executes in strict Level 0..5 order and skips guru_kelas view', async () => {
    const zip = new JSZip();

    const manifest: BackupManifest = {
      appName: 'sipjam-app',
      version: '2.0',
      timestamp: new Date().toISOString(),
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      sekolah_nama: 'SMK Negeri 1 Test',
      exportedBy: 'Admin',
      tahun_backup: '2026',
      totalEntities: 33,
      tableCounts: {},
      assetCount: 1,
      topologicalLevels: TOPOLOGICAL_LEVELS,
      photos: [
        {
          table: 'users',
          recordId: 'user-adversarial-1',
          column: 'avatar',
          path: 'foto/avatars/user-adversarial-1_avatar.png'
        }
      ]
    };

    zip.file('manifest.json', JSON.stringify(manifest));

    // Base64 1x1 image
    const sampleB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=';
    zip.file('foto/avatars/user-adversarial-1_avatar.png', sampleB64, { base64: true });

    // Populate data for Level 0, Level 1, Level 2, Level 3, Level 4, Level 5
    zip.file('data/sekolah.json', JSON.stringify([{ id: 'a0000000-0000-0000-0000-000000000001', nama: 'SMK Negeri 1 Test' }])); // Level 0
    zip.file('data/users.json', JSON.stringify([{ id: 'user-adversarial-1', nama: 'Guru 1', avatar: null }])); // Level 1
    zip.file('data/data_guru.json', JSON.stringify([{ id: 'guru-1', nama_guru: 'Guru 1', nip: '123' }])); // Level 2
    zip.file('data/guru_mapel.json', JSON.stringify([{ id: 'gm-1', nama_guru: 'Guru 1', kelas: 'X' }])); // Level 3
    zip.file('data/capaian_pembelajaran.json', JSON.stringify([{ id: 'cp-1', kode_cp: 'CP1', deskripsi: 'Desc' }])); // Level 4
    zip.file('data/asesmen_kolom.json', JSON.stringify([{ id: 'ak-1', nama: 'Ulangan 1' }])); // Level 5
    zip.file('data/guru_kelas.json', JSON.stringify([{ guru_id: 'guru-1', kelas: 'X' }])); // Level 5 VIEW

    const blob = await zip.generateAsync({ type: 'blob' });
    const executedLevels: number[] = [];

    const res = await restoreFullSystemBackupZip(
      blob,
      { id: 'admin-uuid', sekolah_id: 'a0000000-0000-0000-0000-000000000001' },
      (step) => {
        const lvlMatch = step.match(/Level (\d)/);
        if (lvlMatch) {
          executedLevels.push(parseInt(lvlMatch[1], 10));
        }
      }
    );

    // Verify topological order in execution log
    assert(executedLevels.length >= 6, `Expected at least 6 level execution events, got ${executedLevels.length}`);
    for (let i = 1; i < executedLevels.length; i++) {
      assert(
        executedLevels[i] >= executedLevels[i - 1],
        `Level execution was not monotonically non-decreasing: ${executedLevels[i - 1]} followed by ${executedLevels[i]}`
      );
    }

    // Verify restored counts
    assert(res.restoredTableCount >= 6, `Should restore at least 6 tables, got ${res.restoredTableCount}`);
    assert(res.restoredRowCount >= 6, `Should restore at least 6 rows, got ${res.restoredRowCount}`);
  });

  console.log('\n--- 6. STRESS TESTS & RESILIENCE ---');

  await test('6.1: Empty table arrays are handled safely without crashing', async () => {
    const zip = new JSZip();
    const manifest: BackupManifest = {
      appName: 'sipjam-app',
      version: '2.0',
      timestamp: new Date().toISOString(),
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      sekolah_nama: 'SMK Empty Test',
      exportedBy: 'Admin',
      tahun_backup: '2026',
      totalEntities: 33,
      tableCounts: {},
      assetCount: 0,
      topologicalLevels: TOPOLOGICAL_LEVELS,
      photos: []
    };
    zip.file('manifest.json', JSON.stringify(manifest));
    for (const entity of ALL_BACKUP_ENTITIES) {
      zip.file(`data/${entity.name}.json`, '[]');
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const res = await restoreFullSystemBackupZip(
      blob,
      { id: 'admin-empty', sekolah_id: 'a0000000-0000-0000-0000-000000000001' }
    );

    assert.strictEqual(res.restoredRowCount, 0, 'Restored row count should be 0 for empty tables');
    assert.strictEqual(res.restoredTableCount, 0, 'Restored table count should be 0 for empty tables');
  });

  await test('6.2: Malformed JSON in a single table file does not abort other tables', async () => {
    const zip = new JSZip();
    const manifest: BackupManifest = {
      appName: 'sipjam-app',
      version: '2.0',
      timestamp: new Date().toISOString(),
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      sekolah_nama: 'SMK Malformed Test',
      exportedBy: 'Admin',
      tahun_backup: '2026',
      totalEntities: 33,
      tableCounts: {},
      assetCount: 0,
      topologicalLevels: TOPOLOGICAL_LEVELS
    };
    zip.file('manifest.json', JSON.stringify(manifest));
    zip.file('data/sekolah.json', JSON.stringify([{ id: 'a0000000-0000-0000-0000-000000000001', nama: 'SMK Malformed Test' }]));
    zip.file('data/users.json', '{ this is broken json'); // broken
    zip.file('data/data_mapel.json', JSON.stringify([{ id: 'm1', nama_mata_pelajaran: 'Matematika' }]));

    const blob = await zip.generateAsync({ type: 'blob' });
    const res = await restoreFullSystemBackupZip(
      blob,
      { id: 'admin-malformed', sekolah_id: 'a0000000-0000-0000-0000-000000000001' }
    );

    assert(res.restoredTableCount >= 2, 'Valid tables (sekolah, data_mapel) must still be restored');
    assert(res.restoredRowCount >= 2, 'Rows from valid tables must still be restored');
  });

  // Final summary
  console.log('\n========================================================================');
  console.log(`RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} adversarial test assertions failed.`);
  }
}

// Execute if run directly
if (require.main === module || !process.env.VITEST) {
  runAdversarialSuite().catch((e) => {
    console.error('Test execution terminated with error:', e);
    process.exit(1);
  });
}
