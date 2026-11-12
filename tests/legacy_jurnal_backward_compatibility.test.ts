import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasJournalContent,
  hasAttendanceData,
  parseLegacyOrModernAttendance,
  formatAttendanceSummary,
  canTeacherPresensiPulang,
  GuruDailyState
} from '../src/lib/workflow';
import { isRealSubmittedJournal } from '../src/components/AdminVerifView';

test('Legacy Jurnal Backward Compatibility Test Suite', async (t) => {
  await t.test('1. hasJournalContent recognizes all legacy and modern field combinations', () => {
    // Modern journal
    assert.equal(
      hasJournalContent({ materi: 'Bab 1 Struktur Sel', kegiatan: 'Pengamatan Mikroskop' }),
      true,
      'Modern journal should have content'
    );

    // Legacy journal where materi and kegiatan are '-' but konten and kegiatan_pembelajaran have data
    assert.equal(
      hasJournalContent({
        materi: '-',
        kegiatan: '-',
        konten: 'Pembahasan Hukum Newton',
        kegiatan_pembelajaran: 'Praktikum Dinamika'
      }),
      true,
      'Legacy dual-write journal with konten should have content'
    );

    // Legacy journal with materi_pembelajaran
    assert.equal(
      hasJournalContent({
        materi: null,
        kegiatan: 'Diskusi',
        materi_pembelajaran: 'Trigonometri Dasar'
      }),
      true,
      'Legacy journal with materi_pembelajaran should have content'
    );

    // Draft / Absensi-only session where everything is '-' or empty
    assert.equal(
      hasJournalContent({
        materi: '-',
        kegiatan: '-',
        konten: '-',
        materi_pembelajaran: '-',
        kegiatan_pembelajaran: '-'
      }),
      false,
      'Draft session with only dashes should NOT have content'
    );

    // Completely null/undefined
    assert.equal(hasJournalContent(null), false, 'null journal should return false');
    assert.equal(hasJournalContent({}), false, 'empty journal object should return false');
  });

  await t.test('2. hasAttendanceData correctly identifies modern and legacy attendance formats', () => {
    // Modern JSON map
    assert.equal(
      hasAttendanceData({ absensi_siswa: JSON.stringify({ 'NISN001': 'H', 'NISN002': 'S' }) }),
      true,
      'Modern JSON map string should be detected as attendance data'
    );

    // Modern plain object
    assert.equal(
      hasAttendanceData({ absensi_siswa: { 'NISN001': 'H' } }),
      true,
      'Plain object absensi_siswa should be detected'
    );

    // Legacy JSON array format: [{ id: '001', status: 'H' }]
    assert.equal(
      hasAttendanceData({ absensi_siswa: JSON.stringify([{ id: '001', status: 'H' }]) }),
      true,
      'Legacy JSON array should be detected'
    );

    // Legacy array object
    assert.equal(
      hasAttendanceData({ absensi_siswa: [{ id: '001', status: 'H' }] }),
      true,
      'Raw array absensi_siswa should be detected'
    );

    // Legacy summary in kehadiran_murid
    assert.equal(
      hasAttendanceData({
        absensi_siswa: null,
        kehadiran_murid: 'Total murid: 32, Hadir: 30, Izin: 1, Sakit: 1, Alpa: 0'
      }),
      true,
      'kehadiran_murid summary should be detected'
    );

    // Legacy detail_absen string
    assert.equal(
      hasAttendanceData({
        absensi_siswa: '',
        detail_absen: 'Ahmad Fauzi (H), Budi Santoso (S)'
      }),
      true,
      'detail_absen text should be detected'
    );

    // Legacy pipe format in absensi_siswa
    assert.equal(
      hasAttendanceData({ absensi_siswa: 'H: 28 | I: 2 | S: 0 | A: 0' }),
      true,
      'Legacy pipe format should be detected'
    );

    // Empty/placeholder cases
    assert.equal(hasAttendanceData({ absensi_siswa: '{}' }), false, 'Empty object JSON should return false');
    assert.equal(hasAttendanceData({ absensi_siswa: '[]' }), false, 'Empty array JSON should return false');
    assert.equal(hasAttendanceData({ absensi_siswa: '-' }), false, 'Dash should return false');
    assert.equal(hasAttendanceData(null), false, 'null should return false');
  });

  await t.test('3. parseLegacyOrModernAttendance normalizes disparate formats into student map', () => {
    // 3a. Modern JSON string
    const modernMap = parseLegacyOrModernAttendance(JSON.stringify({ 'NIS01': 'H', 'NIS02': 'I' }));
    assert.equal(modernMap['NIS01'], 'H');
    assert.equal(modernMap['NIS02'], 'I');
    assert.equal(modernMap['nis01'], 'H'); // lowercase key also accessible

    // 3b. Legacy array of objects
    const legacyArray = parseLegacyOrModernAttendance([
      { id: '101', status: 'S' },
      { id: '102', status: 'H' }
    ]);
    assert.equal(legacyArray['101'], 'S');
    assert.equal(legacyArray['102'], 'H');

    // 3c. Legacy dictionary with status objects
    const legacyObjMap = parseLegacyOrModernAttendance({
      'STUDENT_A': { status: 'A' },
      'STUDENT_B': 'I'
    });
    assert.equal(legacyObjMap['STUDENT_A'], 'A');
    assert.equal(legacyObjMap['STUDENT_B'], 'I');

    // 3d. Legacy detail_absen parsing
    const fromDetail = parseLegacyOrModernAttendance(null, 'Ali (Hadir), Siti (Sakit), Doni (Izin), Eko (Alfa)');
    assert.equal(fromDetail['ali'], 'H');
    assert.equal(fromDetail['siti'], 'S');
    assert.equal(fromDetail['doni'], 'I');
    assert.equal(fromDetail['eko'], 'A');
  });

  await t.test('4. formatAttendanceSummary produces uniform readable statistics', () => {
    // Array format
    const summary1 = formatAttendanceSummary([
      { id: '1', status: 'H' },
      { id: '2', status: 'H' },
      { id: '3', status: 'S' },
      { id: '4', status: 'I' }
    ]);
    assert.equal(summary1, 'Total murid: 4, Hadir: 2, Izin: 1, Sakit: 1, Alpa: 0');

    // kehadiran_murid string format
    const summary2 = formatAttendanceSummary(null, null, 'Hadir: 20, Izin: 2, Sakit: 1, Alpa: 1');
    assert.equal(summary2, 'Total murid: 24, Hadir: 20, Izin: 2, Sakit: 1, Alpa: 1');

    // pipe string format
    const summary3 = formatAttendanceSummary('H: 15 | I: 1 | S: 0 | A: 0');
    assert.equal(summary3, 'Total murid: 16, Hadir: 15, Izin: 1, Sakit: 0, Alpa: 0');

    // detail_absen string format
    const summary4 = formatAttendanceSummary(null, 'Budi (H), Joko (S), Maya (I), Rian (A)');
    assert.equal(summary4, 'Total murid: 4, Hadir: 1, Izin: 1, Sakit: 1, Alpa: 1');
  });

  await t.test('5. AdminVerifView.isRealSubmittedJournal accepts legacy journals and rejects drafts', () => {
    // Normal modern journal
    assert.equal(
      isRealSubmittedJournal({
        materi: 'Bab 1 Biologi',
        kegiatan: 'Diskusi Sel',
        status_verifikasi: 'Menunggu'
      }),
      true,
      'Normal modern journal is valid'
    );

    // Legacy journal where materi is '-' but konten has text
    assert.equal(
      isRealSubmittedJournal({
        materi: '-',
        kegiatan: '-',
        konten: 'Ekosistem Laut',
        kegiatan_pembelajaran: 'Tanya Jawab',
        status_verifikasi: 'Menunggu'
      }),
      true,
      'Legacy journal with konten must NOT be discarded'
    );

    // Legacy journal where materi is '-' but materi_pembelajaran has text
    assert.equal(
      isRealSubmittedJournal({
        materi: '-',
        kegiatan: 'Diskusi',
        materi_pembelajaran: 'Aljabar Linear',
        status_verifikasi: 'Menunggu'
      }),
      true,
      'Legacy journal with materi_pembelajaran must NOT be discarded'
    );

    // Pure attendance draft where both materi and kegiatan are '-' and no fallbacks exist
    assert.equal(
      isRealSubmittedJournal({
        materi: '-',
        kegiatan: '-',
        konten: '-',
        materi_pembelajaran: '-',
        status_verifikasi: 'Menunggu'
      }),
      false,
      'Draft with only attendance and no journal content must be excluded'
    );
  });

  await t.test('6. canTeacherPresensiPulang accepts completed legacy journals', () => {
    const mockSchedule = [
      {
        id: 1,
        kelas: 'X-A',
        mata_pelajaran: 'Matematika',
        isBlocked: false,
        hari: 'Senin'
      }
    ];

    // Case A: Legacy journal completed with 'konten' and 'kegiatan_pembelajaran'
    const legacyJournal = {
      kelas: 'X-A',
      mapel: 'Matematika',
      materi: '-',
      kegiatan: '-',
      konten: 'Barisan dan Deret',
      kegiatan_pembelajaran: 'Latihan soal deret aritmatika',
      status_verifikasi: 'Menunggu'
    };

    const stateLegacy: Partial<GuruDailyState> = {
      presensiDatang: { id: 1 } as any,
      jadwalKBM: mockSchedule as any,
      jurnalKBM: [legacyJournal as any]
    };

    assert.equal(
      canTeacherPresensiPulang(stateLegacy),
      true,
      'Teacher should be allowed to presensi pulang with completed legacy journal'
    );

    // Case B: Incomplete journal (only absensi recorded, materi and kegiatan still '-')
    const incompleteDraft = {
      kelas: 'X-A',
      mapel: 'Matematika',
      materi: '-',
      kegiatan: '-',
      konten: '-',
      kegiatan_pembelajaran: '-',
      absensi_siswa: JSON.stringify({ 'NIS001': 'H' }),
      status_verifikasi: 'Menunggu'
    };

    const stateIncomplete: Partial<GuruDailyState> = {
      presensiDatang: { id: 1 } as any,
      jadwalKBM: mockSchedule as any,
      jurnalKBM: [incompleteDraft as any]
    };

    assert.equal(
      canTeacherPresensiPulang(stateIncomplete),
      false,
      'Teacher should NOT be allowed to presensi pulang if journal KBM is still draft'
    );
  });
});
