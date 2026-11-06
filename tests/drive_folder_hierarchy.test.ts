import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  SIPJAM_ROOT_FOLDER,
  SIPJAM_FEATURE_FOLDERS,
  normalizeDriveFeatureFolder,
  normalizeDriveTeacherFolder,
  buildDriveFolderPath,
} from '../src/lib/driveUpload';

const root = process.cwd();

// 1. Verify root folder and feature folder normalization
assert.strictEqual(SIPJAM_ROOT_FOLDER, 'SIPJAM');
assert.deepStrictEqual(SIPJAM_FEATURE_FOLDERS, [
  'Presensi_Guru',
  'Presensi_DinasLuar',
  'Jurnal_KBM',
  'Jurnal_Kegiatan',
  'Laporan_Piket',
  'Perangkat_Pembelajaran',
]);

assert.strictEqual(normalizeDriveFeatureFolder('Presensi_Guru'), 'Presensi_Guru');
assert.strictEqual(normalizeDriveFeatureFolder('Presensi_DinasLuar'), 'Presensi_DinasLuar');
assert.strictEqual(normalizeDriveFeatureFolder('Jurnal KBM'), 'Jurnal_KBM');
assert.strictEqual(normalizeDriveFeatureFolder('Jurnal Kegiatan'), 'Jurnal_Kegiatan');
assert.strictEqual(normalizeDriveFeatureFolder('Laporan_Piket'), 'Laporan_Piket');
assert.strictEqual(normalizeDriveFeatureFolder('Perangkat_Pembelajaran'), 'Perangkat_Pembelajaran');

// 2. Verify hierarchy: SIPJAM -> <Fitur> -> <Nama Guru>
const presensiPath = buildDriveFolderPath('Presensi_Guru', 'Fitri Aprilia Dotulong, S.Pd.');
assert.strictEqual(presensiPath.rootFolder, 'SIPJAM');
assert.strictEqual(presensiPath.folderFitur, 'Presensi_Guru');
assert.strictEqual(presensiPath.guruFolder, 'Fitri Aprilia Dotulong, S.Pd.');
assert.strictEqual(presensiPath.folderPath, 'SIPJAM/Presensi_Guru/Fitri Aprilia Dotulong, S.Pd.');

const jurnalPath = buildDriveFolderPath('Jurnal KBM', 'Ade Fitrawan Ibrahim, M.Pd., Gr.');
assert.strictEqual(jurnalPath.folderPath, 'SIPJAM/Jurnal_KBM/Ade Fitrawan Ibrahim, M.Pd., Gr.');

const piketPath = buildDriveFolderPath('Laporan_Piket', 'Rohani Marham');
assert.strictEqual(piketPath.folderPath, 'SIPJAM/Laporan_Piket/Rohani Marham');

const dokumenPath = buildDriveFolderPath('Perangkat_Pembelajaran', 'Setia Ambar Ningsih Mamonto');
assert.strictEqual(dokumenPath.folderPath, 'SIPJAM/Perangkat_Pembelajaran/Setia Ambar Ningsih Mamonto');

assert.strictEqual(normalizeDriveTeacherFolder('  Guru/Test:1  '), 'Guru Test 1');

// 3. Verify Google Apps Script webhook implements SIPJAM -> folderFitur -> namaGuru
const gsSrc = fs.readFileSync(path.join(root, 'scripts', 'google-drive-webhook.gs'), 'utf8');
assert.ok(gsSrc.includes('const ROOT_FOLDER_NAME = "SIPJAM";'), 'Root folder in GAS must be SIPJAM');
for (const feature of SIPJAM_FEATURE_FOLDERS) {
  assert.ok(gsSrc.includes(`"${feature}"`), `GAS script must include feature folder ${feature}`);
}
assert.ok(
  gsSrc.includes('const featureFolder = getOrCreateFolder(rootFolder, folderFitur);') &&
    gsSrc.includes('const guruFolder = getOrCreateFolder(featureFolder, namaGuru);') &&
    gsSrc.includes('const file = guruFolder.createFile(blob);'),
  'GAS webhook must create featureFolder inside rootFolder (SIPJAM) and guruFolder inside featureFolder'
);

console.log('✅ All SIPJAM -> Fitur -> Nama Guru Drive hierarchy checks passed!');
