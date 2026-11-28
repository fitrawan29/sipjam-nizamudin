import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { formatRaporSubjectName } from '../src/utils/textUtils';

// 1. Subject name stripping & acronym expansion
assert.equal(formatRaporSubjectName('X_Merdeka_MTK'), 'Matematika');
assert.equal(formatRaporSubjectName('X Merdeka_MTK'), 'Matematika');
assert.equal(formatRaporSubjectName('XI Merdeka A_Bahasa Indonesia'), 'Bahasa Indonesia');
assert.equal(formatRaporSubjectName('Matematika - X A'), 'Matematika');
assert.equal(formatRaporSubjectName('B. Indonesia - XII C'), 'B. Indonesia');
assert.equal(formatRaporSubjectName('B. Indo - XII C'), 'Bahasa Indonesia');
assert.equal(formatRaporSubjectName('Matematika Kelas 10'), 'Matematika');
assert.equal(formatRaporSubjectName('Matematika (X Merdeka)'), 'Matematika');
assert.equal(formatRaporSubjectName('X_Merdeka_B. Ing'), 'Bahasa Inggris');

// 2. Toast CSS has no glass transparency
const css = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');
assert.match(css, /\.swal2-toast\s*\{[\s\S]*?backdrop-filter:\s*none\s*!important;/);
assert.match(css, /html\[data-ui-preset="glass-teal"\]\s+\.swal2-toast\s*\{\s*background:\s*#FFFFFF\s*!important;/);
assert.match(css, /html\.dark\[data-ui-preset="glass-teal"\]\s+\.swal2-toast\s*\{\s*background:\s*#1E293B\s*!important;/);

// 3. RaporView uses formatRaporSubjectName
const raporView = fs.readFileSync(path.join(process.cwd(), 'src/components/RaporView.tsx'), 'utf8');
assert.match(raporView, /namaMapel:\s*formatRaporSubjectName\(mapel\)/);

console.log('PASS: rapor_subject_and_toast verification');
