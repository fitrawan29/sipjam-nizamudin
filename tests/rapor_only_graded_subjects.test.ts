import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { generateKurikulumMerdekaDeskripsi } from '../src/components/GradebookView';

const raporPath = path.join(process.cwd(), 'src', 'components', 'RaporView.tsx');
const raporSource = fs.readFileSync(raporPath, 'utf-8');

// 1. Verify RaporView filters getStudentSubjectScores to numeric nilaiAkhir >= 1
assert.ok(
  raporSource.includes(".filter(item => typeof item.nilaiAkhir === 'number' && !isNaN(item.nilaiAkhir) && item.nilaiAkhir >= 1)"),
  'RaporView.tsx must filter getStudentSubjectScores to nilaiAkhir >= 1'
);

// 2. Verify empty-state text reflects graded subjects
assert.ok(
  raporSource.includes('Belum ada mata pelajaran yang memiliki nilai untuk siswa ini.'),
  'RaporView.tsx must show accurate empty-state text when no subjects have grades'
);

// 3. Verify Kurikulum Merdeka description generator + >= 1 filter behavior
const ungraded = generateKurikulumMerdekaDeskripsi('Siswa Uji', [
  { kode: 'TP-1', deskripsi: 'Memahami konsep dasar', score: null }
]);
assert.strictEqual(ungraded.nilaiRapor, null);

const zeroGraded = generateKurikulumMerdekaDeskripsi('Siswa Uji', [
  { kode: 'TP-1', deskripsi: 'Memahami konsep dasar', score: 0 }
]);
assert.strictEqual(zeroGraded.nilaiRapor, 0);

const validGraded = generateKurikulumMerdekaDeskripsi('Siswa Uji', [
  { kode: 'TP-1', deskripsi: 'Memahami konsep dasar', score: 85 },
  { kode: 'TP-2', deskripsi: 'Menerapkan konsep lanjutan', score: null }
]);
assert.strictEqual(validGraded.nilaiRapor, 85);

const items = [
  { namaMapel: 'Matematika', nilaiAkhir: validGraded.nilaiRapor },
  { namaMapel: 'Bahasa Indonesia', nilaiAkhir: zeroGraded.nilaiRapor },
  { namaMapel: 'IPA', nilaiAkhir: ungraded.nilaiRapor }
].filter(item => typeof item.nilaiAkhir === 'number' && !isNaN(item.nilaiAkhir) && item.nilaiAkhir >= 1);

assert.deepStrictEqual(
  items.map(i => i.namaMapel),
  ['Matematika'],
  'Only subjects with nilaiAkhir >= 1 should remain'
);

console.log('PASS: rapor_only_graded_subjects');
