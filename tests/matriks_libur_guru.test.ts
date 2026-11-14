import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = fs.readFileSync(path.join(root, 'src', 'components', 'HomeViewAdmin.tsx'), 'utf8');

assert(src.includes('isLibur?: boolean;'), 'TeacherStatusRow must include isLibur');
assert(src.includes('keteranganLibur?: string;'), 'TeacherStatusRow must include keteranganLibur');
assert(src.includes('data-testid="matrix-holiday-badge"'), 'Matrix header must render holiday badge');
assert(src.includes('row.isLibur ? ('), 'Status Akhir column must distinguish school holiday from Lengkap');
assert(src.includes('{row.keteranganLibur}'), 'Status Akhir column must render row.keteranganLibur');
assert(src.includes('!pDatangToday && !isSchoolDayOff'), 'multiDayLeave must not override Libur on school holidays');

console.log('✅ PASS: Matriks Status Harian Guru menampilkan keterangan libur guru');
