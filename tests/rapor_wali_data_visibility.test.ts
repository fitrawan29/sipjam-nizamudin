import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { findLastKbmJournal, resolveDailyStudentAttendance } from '../src/lib/presensiIntervensi';
import { formatRaporSubjectName } from '../src/utils/textUtils';
import { generateKurikulumMerdekaDeskripsi } from '../src/components/GradebookView';

const raporPath = path.join(process.cwd(), 'src', 'components', 'RaporView.tsx');
const raporSource = fs.readFileSync(raporPath, 'utf-8');
const gradebookPath = path.join(process.cwd(), 'src', 'components', 'GradebookView.tsx');
const gradebookSource = fs.readFileSync(gradebookPath, 'utf-8');

// 1. Verify RaporView includes class/semester/TA normalization & student identity fallback
assert.ok(raporSource.includes('resolveStudentNisn'), 'RaporView must resolve student NISN via nisn/siswa_id/nama_siswa');
assert.ok(raporSource.includes('normTa') && raporSource.includes('normSem'), 'RaporView must normalize tahun_ajaran and semester');
assert.ok(raporSource.includes('findLastKbmJournal') && raporSource.includes('resolveDailyStudentAttendance'), 'RaporView must use unified daily attendance resolution for Ketidakhadiran');
assert.ok(raporSource.includes('missingTpIds'), 'RaporView must recover tujuan_pembelajaran referenced by nilai_siswa');
assert.ok(raporSource.includes('formatRaporSubjectName(tp.nama_mapel'), 'RaporView must match normalized subject names in getStudentSubjectScores');

// 2. Verify GradebookView passes isActive prop to RaporView for keep-alive refresh
assert.ok(gradebookSource.includes('isActive={activeTab === \'rapor\'}'), 'GradebookView must pass isActive to RaporView');

// 3. Verify daily attendance resolution with jurnal_pembelajaran fallback (Sakit, Izin, Alpa)
const student = { id: 's-1', nisn: '0012345678', nama_siswa: 'Budi Santoso', kelas: 'X-A' };
const dayJournals = [
  { jam_ke: '1', mapel: 'Matematika', absensi_siswa: { '0012345678': 'S' } },
  { jam_ke: '3', mapel: 'Bahasa Indonesia', absensi_siswa: { '0012345678': 'S' } }
];
const lastJurnal = findLastKbmJournal(dayJournals, student);
const resolvedSakit = resolveDailyStudentAttendance(student, undefined, false, lastJurnal);
assert.strictEqual(resolvedSakit.status, 'Sakit', 'Missing absensi row must fall back to last KBM journal Sakit status');

// 4. Verify subject score & chart data generation when subject has class suffix
const subjectFromMapel = formatRaporSubjectName('Matematika - X A').trim().toLowerCase();
const subjectFromTp = formatRaporSubjectName('Matematika').trim().toLowerCase();
assert.strictEqual(subjectFromMapel, subjectFromTp, 'Subject names with class suffix must match TP nama_mapel');

const scoreRes = generateKurikulumMerdekaDeskripsi(student.nama_siswa, [
  { kode: 'TP-1', deskripsi: 'Aljabar linear', score: 88 }
]);
assert.strictEqual(scoreRes.nilaiRapor, 88, 'Subject score must be computed for chart and table');

console.log('PASS: rapor_wali_data_visibility');
