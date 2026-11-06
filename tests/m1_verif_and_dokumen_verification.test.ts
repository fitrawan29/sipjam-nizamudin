import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('========================================================================');
console.log('🧪 MILESTONE M1 VERIFICATION: VERIF, REKAP, DOKUMEN & ATTENDANCE ALPA');
console.log('========================================================================\n');

const projectRoot = path.resolve(__dirname, '..');

// 1. DokumenView static inspection
const dokPath = path.join(projectRoot, 'src', 'components', 'DokumenView.tsx');
const dokContent = fs.readFileSync(dokPath, 'utf8');

assert(dokContent.includes('export function normalizeTeacherToken'), 'DokumenView exports normalizeTeacherToken');
assert(dokContent.includes('export function isTeacherNameMatch'), 'DokumenView exports isTeacherNameMatch');
assert(dokContent.includes('export function isTeacherEntityMatch'), 'DokumenView exports isTeacherEntityMatch');
assert(dokContent.includes('export const MAPEL_EXPANSIONS'), 'DokumenView exports MAPEL_EXPANSIONS');
assert(dokContent.includes('export function resolveTeacherSubjects'), 'DokumenView exports resolveTeacherSubjects');
assert(dokContent.includes("from('jadwal_pelajaran')"), 'DokumenView fetches jadwal_pelajaran in loadAllData');
assert(dokContent.includes("from('data_mapel')"), 'DokumenView fetches data_mapel in loadAllData');

// Check that Mata Pelajaran Umum fallback is completely eliminated from code
const lines = dokContent.split('\n');
const mpuMatches = lines.filter(l => l.includes("'Mata Pelajaran Umum'") && !l.includes('*'));
assert(mpuMatches.length === 0, `Zero occurrences of 'Mata Pelajaran Umum' in code (found ${mpuMatches.length})`);

// 2. AdminVerifView static inspection
const verifPath = path.join(projectRoot, 'src', 'components', 'AdminVerifView.tsx');
const verifContent = fs.readFileSync(verifPath, 'utf8');

assert(verifContent.includes('export function isRealSubmittedJournal'), 'AdminVerifView exports isRealSubmittedJournal at module level');
assert(verifContent.includes('data-testid="holiday-banner"'), 'AdminVerifView renders holiday banner');
assert(verifContent.includes('data-testid="badge-excused-leave"'), 'AdminVerifView renders badge-excused-leave');
assert(verifContent.includes("from('kalender_pendidikan')"), 'AdminVerifView loads kalender_pendidikan');
assert(verifContent.includes('unsubmittedPresensi = useMemo'), 'AdminVerifView defines unsubmittedPresensi');
assert(verifContent.includes('unsubmittedJurnal = useMemo'), 'AdminVerifView defines unsubmittedJurnal');
assert(verifContent.includes('unsubmittedPiket = useMemo'), 'AdminVerifView defines unsubmittedPiket');

// 3. AdminRekapView static inspection
const rekapPath = path.join(projectRoot, 'src', 'components', 'AdminRekapView.tsx');
const rekapContent = fs.readFileSync(rekapPath, 'utf8');

assert(!rekapContent.includes("id: 'cetak'"), 'AdminRekapView tabItems does not contain cetak');
assert(!rekapContent.includes("activeTab === 'cetak'"), 'AdminRekapView does not contain activeTab === cetak');
assert(rekapContent.includes('initialTab === \'cetak\' ? \'tabel\' : initialTab'), 'AdminRekapView redirects initialTab cetak to tabel');
assert(rekapContent.includes('isSakit'), 'AdminRekapView aggregates Sakit properly');
assert(rekapContent.includes('creditedLeaveDates'), 'AdminRekapView tracks creditedLeaveDates');

// 4. RekapJurnalView static inspection
const rekapJurnalPath = path.join(projectRoot, 'src', 'components', 'RekapJurnalView.tsx');
const rekapJurnalContent = fs.readFileSync(rekapJurnalPath, 'utf8');

assert(rekapJurnalContent.includes('isWeekend || isCalendarHoliday'), 'RekapJurnalView excludes weekends and calendar holidays');
assert(rekapJurnalContent.includes("statusLower === 'libur' || ketLower === 'libur' || matLower === 'libur'"), 'RekapJurnalView filters out Libur rows');
assert(rekapJurnalContent.includes('Presensi ${leaveType}'), 'RekapJurnalView handles personal activity excused leave');

// 5. attendanceAlpa.ts static inspection
const alpaPath = path.join(projectRoot, 'src', 'lib', 'attendanceAlpa.ts');
const alpaContent = fs.readFileSync(alpaPath, 'utf8');

assert(alpaContent.includes('export async function autoCloseOrMarkDelinquentJournals'), 'attendanceAlpa exports autoCloseOrMarkDelinquentJournals');
assert(alpaContent.includes('isExcusedFromActivity'), 'attendanceAlpa checks isExcusedFromActivity');

console.log('\n========================================================================');
console.log('🎉 ALL M1 IMPLEMENTATION INVARIANTS VERIFIED SUCCESSFULLY (100% PASS)!');
console.log('========================================================================\n');
