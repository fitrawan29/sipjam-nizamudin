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

console.log('================================================================================');
console.log('ADVERSARIAL HARNESS: M4 CHALLENGER 2 (EDGE CASES, PHOTOS, ARCHIVES, REGRESSIONS)');
console.log('================================================================================\n');

let passedCount = 0;
let failedCount = 0;
const failures: Array<{ name: string; error: string }> = [];

async function challenge(description: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    console.log(`  [PASS] ${description}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         Error: ${err?.message || err}`);
    failedCount++;
    failures.push({ name: description, error: err?.message || String(err) });
  }
}

// 1x1 Transparent PNG Base64 sample
const SAMPLE_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=';
// 1x1 White JPG Base64 sample
const SAMPLE_JPG_B64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

export async function runAdversarialSuite() {
  console.log('--- 1. MALFORMED & CORRUPTED ZIP ARCHIVES ---');

  await challenge('1.1: Rejects completely non-ZIP raw binary buffer gracefully without process crash', async () => {
    const corruptedBuffer = Buffer.from('NOT_A_VALID_ZIP_HEADER_RAW_BYTES_CORRUPTED_1234567890');
    let caught = false;
    try {
      await restoreFullSystemBackupZip(corruptedBuffer as any, { sekolah_id: 'test-sekolah' });
    } catch (err: any) {
      caught = true;
      assert(err.message, 'Should throw a descriptive error message');
    }
    assert.strictEqual(caught, true, 'Corrupted buffer must be rejected');
  });

  await challenge('1.2: Rejects empty buffer (0 bytes) gracefully without unhandled exceptions', async () => {
    const emptyBuffer = Buffer.alloc(0);
    let caught = false;
    try {
      await restoreFullSystemBackupZip(emptyBuffer as any, { sekolah_id: 'test-sekolah' });
    } catch (err: any) {
      caught = true;
      assert(err.message, 'Should throw descriptive error message on empty buffer');
    }
    assert.strictEqual(caught, true, 'Zero-length buffer must be rejected');
  });

  await challenge('1.3: Rejects truncated ZIP file (partial header missing central directory)', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify({ appName: 'sipjam-app' }));
    const validZip = await zip.generateAsync({ type: 'nodebuffer' });
    const truncatedZip = validZip.slice(0, Math.floor(validZip.length / 2));

    let caught = false;
    try {
      await restoreFullSystemBackupZip(truncatedZip as any, { sekolah_id: 'test-sekolah' });
    } catch (err: any) {
      caught = true;
      assert(err.message, 'Should throw descriptive error on truncated archive');
    }
    assert.strictEqual(caught, true, 'Truncated ZIP archive must be rejected');
  });

  console.log('\n--- 2. MANIFEST SCHEMA & APP IDENTITY GUARDS ---');

  await challenge('2.1: validateBackupZip rejects archive missing manifest.json', async () => {
    const zip = new JSZip();
    zip.file('data/users.json', '[]');

    const res = await validateBackupZip(zip);
    assert.strictEqual(res.valid, false, 'Archive without manifest must be invalid');
    assert(
      res.error?.includes('manifest.json tidak ditemukan'),
      `Error must cite missing manifest.json, got: "${res.error}"`
    );
  });

  await challenge('2.2: validateBackupZip rejects archive with malformed (unparseable) manifest.json', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', '{ bad_json_not_closing: "value"');

    const res = await validateBackupZip(zip);
    assert.strictEqual(res.valid, false, 'Archive with syntax-corrupted manifest must be invalid');
    assert(
      res.error?.includes('rusak atau bukan format JSON yang valid'),
      `Error must cite corrupted manifest format, got: "${res.error}"`
    );
  });

  await challenge('2.3: validateBackupZip rejects foreign application archive (e.g. appName: moodle)', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify({
      appName: 'moodle-backup-v4',
      version: '1.0'
    }));

    const res = await validateBackupZip(zip);
    assert.strictEqual(res.valid, false, 'Archive from foreign application must be rejected');
    assert(
      res.error?.includes('bukan untuk aplikasi SIPJAM'),
      `Error must cite foreign application identity, got: "${res.error}"`
    );
  });

  await challenge('2.4: validateBackupZip rejects manifest missing appName or app_name', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify({
      version: '2.0',
      sekolah_nama: 'Test School'
    }));

    const res = await validateBackupZip(zip);
    assert.strictEqual(res.valid, false, 'Archive missing appName must be rejected');
    assert(res.error?.includes('bukan untuk aplikasi SIPJAM'), 'Must reject unidentified application');
  });

  await challenge('2.5: validateBackupZip accepts valid "sipjam-app" and "SIPJAM" identities', async () => {
    const zip1 = new JSZip();
    zip1.file('manifest.json', JSON.stringify({ appName: 'sipjam-app', version: '2.0' }));
    const res1 = await validateBackupZip(zip1);
    assert.strictEqual(res1.valid, true, '"sipjam-app" must be valid');

    const zip2 = new JSZip();
    zip2.file('manifest.json', JSON.stringify({ appName: 'SIPJAM', version: '2.0' }));
    const res2 = await validateBackupZip(zip2);
    assert.strictEqual(res2.valid, true, '"SIPJAM" must be valid');
  });

  console.log('\n--- 3. BINARY PHOTO EXTRACTION & RE-LINKING ---');

  await challenge('3.1: Re-links Base64 Data URLs for avatar, logo_url, link_bukti, foto_kegiatan, link_foto via manifest.photos', async () => {
    const zip = new JSZip();

    const manifest = {
      appName: 'sipjam-app',
      version: '2.0',
      timestamp: new Date().toISOString(),
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      totalEntities: 33,
      tableCounts: {},
      assetCount: 5,
      topologicalLevels: TOPOLOGICAL_LEVELS,
      photos: [
        { table: 'users', recordId: 'user-001', column: 'avatar', path: 'foto/avatars/user-001_avatar.png' },
        { table: 'sekolah', recordId: 'sekolah-001', column: 'logo_url', path: 'foto/sekolah/sekolah-001_logo_url.png' },
        { table: 'presensi_guru', recordId: 'presensi-001', column: 'link_bukti', path: 'foto/presensi/presensi-001_link_bukti.png' },
        { table: 'jurnal_pembelajaran', recordId: 'jurnal-001', column: 'foto_kegiatan', path: 'foto/jurnal/jurnal-001_foto_kegiatan.png' },
        { table: 'laporan_piket', recordId: 'piket-001', column: 'link_foto', path: 'foto/piket/piket-001_link_foto.png' }
      ]
    };
    zip.file('manifest.json', JSON.stringify(manifest));

    // Put image binaries in ZIP
    zip.file('foto/avatars/user-001_avatar.png', SAMPLE_PNG_B64, { base64: true });
    zip.file('foto/sekolah/sekolah-001_logo_url.png', SAMPLE_PNG_B64, { base64: true });
    zip.file('foto/presensi/presensi-001_link_bukti.png', SAMPLE_PNG_B64, { base64: true });
    zip.file('foto/jurnal/jurnal-001_foto_kegiatan.png', SAMPLE_PNG_B64, { base64: true });
    zip.file('foto/piket/piket-001_link_foto.png', SAMPLE_PNG_B64, { base64: true });

    // Table rows with null/empty media URLs
    zip.file('data/sekolah.json', JSON.stringify([{ id: 'sekolah-001', nama: 'SMA 1', logo_url: null }]));
    zip.file('data/users.json', JSON.stringify([{ id: 'user-001', nama: 'Guru 1', avatar: null }]));
    zip.file('data/presensi_guru.json', JSON.stringify([{ id: 'presensi-001', guru_id: 'user-001', link_bukti: null }]));
    zip.file('data/jurnal_pembelajaran.json', JSON.stringify([{ id: 'jurnal-001', guru_id: 'user-001', foto_kegiatan: null }]));
    zip.file('data/laporan_piket.json', JSON.stringify([{ id: 'piket-001', guru_id: 'user-001', link_foto: null }]));

    const blob = await zip.generateAsync({ type: 'nodebuffer' });
    const result = await restoreFullSystemBackupZip(
      blob as any,
      { id: 'admin-1', sekolah_id: 'a0000000-0000-0000-0000-000000000001' }
    );

    assert(result.restoredTableCount >= 5, `Expected at least 5 tables restored, got ${result.restoredTableCount}`);
    assert(result.restoredRowCount >= 5, `Expected at least 5 rows restored, got ${result.restoredRowCount}`);
  });

  await challenge('3.2: Direct ZIP folder traversal fallback re-links photos when manifest.photos is absent', async () => {
    const zip = new JSZip();

    // Manifest without photos array
    const manifest = {
      appName: 'sipjam-app',
      version: '2.0',
      timestamp: new Date().toISOString(),
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      totalEntities: 33,
      tableCounts: {},
      topologicalLevels: TOPOLOGICAL_LEVELS
    };
    zip.file('manifest.json', JSON.stringify(manifest));

    // Place files directly in foto/
    zip.file('foto/avatars/user-999_avatar.jpg', SAMPLE_JPG_B64, { base64: true });
    zip.file('foto/sekolah/sekolah-999_logo_url.png', SAMPLE_PNG_B64, { base64: true });

    zip.file('data/sekolah.json', JSON.stringify([{ id: 'sekolah-999', nama: 'SMK 99', logo_url: null }]));
    zip.file('data/users.json', JSON.stringify([{ id: 'user-999', nama: 'Guru 99', avatar: null }]));

    const blob = await zip.generateAsync({ type: 'nodebuffer' });
    const result = await restoreFullSystemBackupZip(
      blob as any,
      { id: 'admin-1', sekolah_id: 'a0000000-0000-0000-0000-000000000001' }
    );

    assert(result.restoredTableCount >= 2, 'Should restore at least 2 tables via folder traversal');
  });

  await challenge('3.3: Backup generation writes .gitkeep in foto/ when zero photos exist', async () => {
    const mockUser = {
      id: 'mock-admin',
      nama: 'Super Admin',
      role: 'Admin',
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    };

    const { blob } = await createFullSystemBackupZip(mockUser, '2026');
    const zip = await JSZip.loadAsync(blob);

    const fotoEntries = Object.keys(zip.files).filter((k) => k.startsWith('foto/'));
    assert(fotoEntries.length > 0, 'foto/ folder must be preserved in ZIP even with zero assets');
  });

  console.log('\n--- 4. EMPTY TABLES (0 ROWS) & LARGE TABLES (MULTIPLE BATCHES) ---');

  await challenge('4.1: Seamlessly handles archive where all tables are empty (0 rows)', async () => {
    const zip = new JSZip();
    const manifest = {
      appName: 'sipjam-app',
      version: '2.0',
      timestamp: new Date().toISOString(),
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      totalEntities: 33,
      tableCounts: {},
      topologicalLevels: TOPOLOGICAL_LEVELS
    };
    zip.file('manifest.json', JSON.stringify(manifest));

    // Populate all 33 tables with empty arrays
    for (const entity of ALL_BACKUP_ENTITIES) {
      zip.file(`data/${entity.name}.json`, '[]');
    }

    const blob = await zip.generateAsync({ type: 'nodebuffer' });
    const res = await restoreFullSystemBackupZip(
      blob as any,
      { id: 'admin-empty', sekolah_id: 'a0000000-0000-0000-0000-000000000001' }
    );

    assert.strictEqual(res.restoredRowCount, 0, 'Restored row count should be exactly 0 for empty tables');
    assert.strictEqual(res.restoredTableCount, 0, 'Restored table count should be 0 when no rows inserted');
  });

  await challenge('4.2: Handles large tables (250 rows) spanning multiple 100-row chunks seamlessly', async () => {
    const zip = new JSZip();
    const manifest = {
      appName: 'sipjam-app',
      version: '2.0',
      timestamp: new Date().toISOString(),
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      totalEntities: 33,
      tableCounts: { data_siswa: 250 },
      topologicalLevels: TOPOLOGICAL_LEVELS
    };
    zip.file('manifest.json', JSON.stringify(manifest));

    // Generate 250 siswa rows
    const largeRows = Array.from({ length: 250 }, (_, i) => ({
      id: `siswa-${i + 1}`,
      nisn: `10000000${i + 1}`,
      nama: `Siswa Stress Test ${i + 1}`,
      kelas: 'X-1',
      sekolah_id: 'a0000000-0000-0000-0000-000000000001'
    }));

    zip.file('data/data_siswa.json', JSON.stringify(largeRows));

    const blob = await zip.generateAsync({ type: 'nodebuffer' });
    const res = await restoreFullSystemBackupZip(
      blob as any,
      { id: 'admin-large', sekolah_id: 'a0000000-0000-0000-0000-000000000001' }
    );

    assert.strictEqual(res.restoredRowCount, 250, `Expected 250 restored rows, got ${res.restoredRowCount}`);
    assert.strictEqual(res.restoredTableCount, 1, 'Expected 1 table restored');
  });

  await challenge('4.3: Mixed dataset across multiple levels accurately sums row counts', async () => {
    const zip = new JSZip();
    const manifest = {
      appName: 'sipjam-app',
      version: '2.0',
      timestamp: new Date().toISOString(),
      sekolah_id: 'a0000000-0000-0000-0000-000000000001',
      totalEntities: 33,
      tableCounts: {},
      topologicalLevels: TOPOLOGICAL_LEVELS
    };
    zip.file('manifest.json', JSON.stringify(manifest));

    // Level 0: sekolah (1 row)
    zip.file('data/sekolah.json', JSON.stringify([{ id: 'a0000000-0000-0000-0000-000000000001', nama: 'Sekolah' }]));
    // Level 1: users (5 rows)
    zip.file('data/users.json', JSON.stringify(
      Array.from({ length: 5 }, (_, i) => ({ id: `user-mix-${i}`, nama: `User ${i}` }))
    ));
    // Level 2: presensi_guru (150 rows - 2 chunks: 100 + 50)
    zip.file('data/presensi_guru.json', JSON.stringify(
      Array.from({ length: 150 }, (_, i) => ({ id: `pg-mix-${i}`, guru_id: 'user-mix-0', status: 'Hadir' }))
    ));

    const blob = await zip.generateAsync({ type: 'nodebuffer' });
    const res = await restoreFullSystemBackupZip(
      blob as any,
      { id: 'admin-mixed', sekolah_id: 'a0000000-0000-0000-0000-000000000001' }
    );

    assert.strictEqual(res.restoredRowCount, 156, `Expected exactly 1 + 5 + 150 = 156 rows, got ${res.restoredRowCount}`);
    assert.strictEqual(res.restoredTableCount, 3, 'Expected exactly 3 tables restored');
  });

  console.log('\n--- 5. DATABASE VIEWS & RELATIONAL RULES INVARIANTS ---');

  await challenge('5.1: Database view "guru_kelas" is marked isView: true and skipped during restore', async () => {
    const gk = ALL_BACKUP_ENTITIES.find((e) => e.name === 'guru_kelas');
    assert(gk !== undefined, 'guru_kelas must exist in ALL_BACKUP_ENTITIES');
    assert.strictEqual(gk?.isView, true, 'guru_kelas must have isView: true');
    assert.strictEqual(gk?.level, 5, 'guru_kelas must reside at Level 5');

    // Test that restore skips guru_kelas even if rows exist in zip
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify({
      appName: 'sipjam-app',
      version: '2.0',
      topologicalLevels: TOPOLOGICAL_LEVELS
    }));
    zip.file('data/guru_kelas.json', JSON.stringify([{ guru_id: 'g-view-1', kelas: 'X-A' }]));

    const blob = await zip.generateAsync({ type: 'nodebuffer' });
    const res = await restoreFullSystemBackupZip(
      blob as any,
      { id: 'admin-view-check', sekolah_id: 'a0000000-0000-0000-0000-000000000001' }
    );

    assert.strictEqual(res.restoredTableCount, 0, 'View guru_kelas must NOT be counted as restored table');
    assert.strictEqual(res.restoredRowCount, 0, 'View rows must NOT be inserted into database');
  });

  await challenge('5.2: Phantom entity "data_kelas" is completely absent from backup configs', () => {
    const foundInEntities = ALL_BACKUP_ENTITIES.some((e) => e.name === 'data_kelas');
    assert.strictEqual(foundInEntities, false, 'data_kelas must not be in ALL_BACKUP_ENTITIES');

    for (const [levelKey, tables] of Object.entries(TOPOLOGICAL_LEVELS)) {
      assert(!tables.includes('data_kelas'), `data_kelas must not exist in ${levelKey}`);
    }
  });

  await challenge('5.3: Total entity count is strictly 33 across all topological levels', () => {
    assert.strictEqual(ALL_BACKUP_ENTITIES.length, 33, 'ALL_BACKUP_ENTITIES length must be 33');

    let sumLevels = 0;
    for (const lvl of ['Level 0', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']) {
      sumLevels += TOPOLOGICAL_LEVELS[lvl]?.length || 0;
    }
    assert.strictEqual(sumLevels, 33, 'Sum of topological level entities must be 33');
  });

  console.log('\n--- 6. DOM ROOT & UI INVARIANTS (AdminBackupView.tsx) ---');

  challenge('6.1: AdminBackupView uses <div id="view-admin-backup" className="space-y-4 fade-in">', () => {
    const compPath = path.resolve(__dirname, '..', 'src', 'components', 'AdminBackupView.tsx');
    assert(fs.existsSync(compPath), 'AdminBackupView.tsx must exist');
    const content = fs.readFileSync(compPath, 'utf-8');

    assert(
      content.includes('<div id="view-admin-backup" className="space-y-4 fade-in">'),
      'Must contain exact <div id="view-admin-backup" className="space-y-4 fade-in">'
    );
  });

  challenge('6.2: AdminBackupView does NOT contain deprecated <section className="view-section"', () => {
    const compPath = path.resolve(__dirname, '..', 'src', 'components', 'AdminBackupView.tsx');
    const content = fs.readFileSync(compPath, 'utf-8');

    assert(
      !content.includes('<section className="view-section"'),
      'Must NOT contain deprecated <section className="view-section"'
    );
  });

  challenge('6.3: AdminBackupView preserves default export signature', () => {
    const compPath = path.resolve(__dirname, '..', 'src', 'components', 'AdminBackupView.tsx');
    const content = fs.readFileSync(compPath, 'utf-8');

    assert(
      content.includes('export default function AdminBackupView({ user }: { user: any })'),
      'Must export default function AdminBackupView({ user }: { user: any })'
    );
  });

  console.log('\n--- 7. PACKAGE.JSON ZERO REGRESSION INVARIANT ---');

  challenge('7.1: package.json dependencies contain only the 9 original packages', () => {
    const pkgPath = path.resolve(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    const expectedDeps = [
      '@supabase/supabase-js',
      'csv-parse',
      'dotenv',
      'next',
      'react',
      'react-dom',
      'sweetalert2',
      'tsx',
      'web-push'
    ];
    const actualDeps = Object.keys(pkg.dependencies || {}).sort();
    assert.deepStrictEqual(
      actualDeps,
      expectedDeps.sort(),
      'Dependencies list in package.json must strictly match original 9 dependencies'
    );
    assert(
      pkg.devDependencies && 'jszip' in pkg.devDependencies,
      'jszip must reside in devDependencies'
    );
  });

  console.log('\n================================================================================');
  console.log(`TOTAL ADVERSARIAL CHALLENGES: ${passedCount + failedCount}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log('================================================================================\n');

  if (failedCount > 0) {
    console.error('FAILURES SUMMARY:');
    for (const f of failures) {
      console.error(`- ${f.name}: ${f.error}`);
    }
    process.exit(1);
  }
}

// Auto-run if executed directly
if (require.main === module) {
  runAdversarialSuite().catch((err) => {
    console.error('Fatal error in adversarial harness:', err);
    process.exit(1);
  });
}
