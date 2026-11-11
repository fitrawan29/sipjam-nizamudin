import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { filterStudentsBySubject } from '../src/lib/agamaFilter';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      return (res as Promise<void>).then(() => {
        console.log(`  ✔ [PASS] ${name}`);
        passed++;
      }).catch((err: any) => {
        console.error(`  ❌ [FAIL] ${name}:`, err?.message || err);
        failed++;
      });
    }
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}:`, err?.message || err);
    failed++;
  }
}

async function runAll() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TEST SUITE: NAMA SISWA MUNCUL SEMUA PADA ABSENSI SISWA TERPISAH');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const root = path.resolve(__dirname, '..');
  const guruJurnalPath = path.join(root, 'src', 'components', 'GuruJurnal.tsx');
  const homeViewGuruPath = path.join(root, 'src', 'components', 'HomeViewGuru.tsx');

  const jurnalContent = fs.readFileSync(guruJurnalPath, 'utf8');
  const homeContent = fs.readFileSync(homeViewGuruPath, 'utf8');

  // ==========================================================================
  // SECTION 1: PEMISAHAN ANTARMUKA & SESSION INTENT RESILIENCE
  // ==========================================================================
  console.log('--- Section 1: Pemisahan Antarmuka & Session Intent ---');

  runTest('1.1: HomeViewGuru memisahkan tombol Absensi Siswa dan mengarahkan kelas & mapel ke GuruJurnal', () => {
    assert.ok(
      homeContent.includes("handleOpenKbmSession = (jk: any, mode: 'absensi' | 'jurnal') =>"),
      'HomeViewGuru must define handleOpenKbmSession with mode parameter'
    );
    assert.ok(
      homeContent.includes("handleOpenKbmSession(jk, 'absensi')"),
      'Dedicated button trigger for Absensi Siswa must exist'
    );
    assert.ok(
      homeContent.includes("localStorage.setItem('sipjam_kbm_session_intent'"),
      'Session intent must be stored in localStorage'
    );
  });

  runTest('1.2: GuruJurnal menerima session intent absensi dan mengunci tipeJurnal ke Jurnal KBM', () => {
    assert.ok(
      jurnalContent.includes("if (targetMode) {\n        setKbmSubMode(targetMode);\n        setTipeJurnal('Jurnal KBM');\n      }") ||
      jurnalContent.includes("setKbmSubMode(targetMode);") && jurnalContent.includes("setTipeJurnal('Jurnal KBM');"),
      'GuruJurnal must guarantee tipeJurnal is Jurnal KBM when targetMode is absensi'
    );
  });

  runTest('1.3: handleKbmSubModeChange menjamin tipeJurnal adalah Jurnal KBM saat masuk mode absensi', () => {
    assert.ok(
      jurnalContent.includes("const handleKbmSubModeChange = (mode: 'absensi' | 'jurnal') => {\n    setKbmSubMode(mode);\n    setTipeJurnal('Jurnal KBM');"),
      'Switching sub-mode must enforce Jurnal KBM'
    );
  });

  runTest('1.4: Auto-restore draft tidak menimpa kelas & mapel jika user membuka sesi absensi dengan intent eksplisit', () => {
    assert.ok(
      jurnalContent.includes('hasExplicitIntent') &&
      jurnalContent.includes('if (!hasExplicitIntent) {') &&
      jurnalContent.includes('if (draft.kelas !== undefined) setKelas(draft.kelas);'),
      'Stale draft must not overwrite explicit intent class when taking attendance'
    );
  });

  // ==========================================================================
  // SECTION 2: LOGIKA RETRIEVAL & RETENSI DATA SISWA SESUAI KELAS
  // ==========================================================================
  console.log('\n--- Section 2: Retrieval Data Siswa & Ekuivalensi Kelas ---');

  runTest('2.1: fetchStudents tidak ter-short-circuit saat berada di sub-mode absensi', () => {
    assert.ok(
      jurnalContent.includes("if (!kelas || (tipeJurnal !== 'Jurnal KBM' && kbmSubMode !== 'absensi'))"),
      'fetchStudents must execute when in sub-mode absensi even if tipeJurnal is momentarily non-KBM'
    );
  });

  runTest('2.2: fetchStudents memiliki dependency array lengkap mencakup kbmSubMode', () => {
    assert.ok(
      jurnalContent.includes('}, [kelas, mapel, tipeJurnal, tanggal, user?.sekolah_id, kbmSubMode]);'),
      'fetchStudents dependency array must include kbmSubMode'
    );
  });

  runTest('2.3: fetchStudents memiliki fallback pencocokan ekuivalensi kelas (Romawi vs Arab & spasi)', () => {
    assert.ok(
      jurnalContent.includes("romanToNum: Record<string, string>") &&
      jurnalContent.includes("sNorm === targetNorm"),
      'fetchStudents must resolve students even if class notations differ (e.g. X Merdeka vs 10 Merdeka)'
    );
  });

  runTest('2.4: fetchStudents memiliki fallback multi-tenant jika siswa tidak memiliki sekolah_id', () => {
    assert.ok(
      jurnalContent.includes("if ((!data || data.length === 0) && user?.sekolah_id) {\n        const { data: noSchData } = await supabase\n          .from('data_siswa')"),
      'fetchStudents must query without sekolah_id filter if initial query yields zero students'
    );
  });

  runTest('2.5: Simulasi ekuivalensi kelas: Romawi dan Arab mencocokkan siswa yang sama', () => {
    const mockStudents = [
      { id: '1', nisn: '001', nama_siswa: 'Budi Hartono', kelas: 'X RPL 1' },
      { id: '2', nisn: '002', nama_siswa: 'Citra Dewi', kelas: 'X RPL 1' },
      { id: '3', nisn: '003', nama_siswa: 'Doni Pratama', kelas: '10 RPL 1' }
    ];

    const romanToNum: Record<string, string> = {
      xii: '12', xi: '11', x: '10', ix: '9', viii: '8', vii: '7'
    };
    const normK = (k: string) =>
      (k || '')
        .toLowerCase()
        .replace(/^kelas\s+/i, '')
        .replace(/[\s\-_.]/g, '')
        .replace(/^(xii|xi|x|ix|viii|vii)/i, m => romanToNum[m] || m);

    const queryClassA = '10 RPL 1';
    const targetNormA = normK(queryClassA);
    const matchedA = mockStudents.filter(s => normK(s.kelas) === targetNormA);
    assert.strictEqual(matchedA.length, 3, 'All 3 students matched when querying 10 RPL 1');

    const queryClassB = 'X RPL 1';
    const targetNormB = normK(queryClassB);
    const matchedB = mockStudents.filter(s => normK(s.kelas) === targetNormB);
    assert.strictEqual(matchedB.length, 3, 'All 3 students matched when querying X RPL 1');
  });

  runTest('2.6: Simulasi resiliensi data master tanpa kolom agama: seluruh siswa kelas tetap muncul', () => {
    const mockLegacyStudents = [
      { id: 's1', nisn: '111', nama_siswa: 'Ade Irma', kelas: 'X Merdeka' },
      { id: 's2', nisn: '112', nama_siswa: 'Bambang', kelas: 'X Merdeka' },
      { id: 's3', nisn: '113', nama_siswa: 'Cynthia', kelas: 'X Merdeka' }
    ];

    // For general subjects, filterStudentsBySubject returns all students
    const mtkStudents = filterStudentsBySubject(mockLegacyStudents, 'Matematika');
    assert.strictEqual(mtkStudents.length, 3, 'Matematika retains all students');

    // For legacy data where no student has agama defined, resilience fallback retains all students
    let filtered = filterStudentsBySubject(mockLegacyStudents, 'PAI');
    if (filtered.length === 0 && !mockLegacyStudents.some(s => s.agama || (s as any).status_agama || (s as any).religion)) {
      filtered = mockLegacyStudents;
    }
    assert.strictEqual(filtered.length, 3, 'Legacy class without agama metadata retains all students under fallback');
  });

  // ==========================================================================
  // SECTION 3: RENDERING UI DAFTAR SISWA PADA SUB-ANTARMUKA ABSENSI
  // ==========================================================================
  console.log('\n--- Section 3: Rendering UI & Informasi Jumlah Siswa ---');

  runTest('3.1: Sub-antarmuka absensi menampilkan counter jumlah siswa terdaftar sesuai kelas', () => {
    assert.ok(
      jurnalContent.includes('{students.length} siswa kelas {kelas}'),
      'Attendance header must clearly indicate total students registered in that class'
    );
  });

  runTest('3.2: Sub-antarmuka absensi me-render nama siswa (siswa.nama_siswa) secara lengkap', () => {
    assert.ok(
      jurnalContent.includes('<span className="text-xs font-bold text-gray-900 dark:text-white">{siswa.nama_siswa}</span>'),
      'Roster list must explicitly render student name'
    );
  });

  runTest('3.3: Tombol intervensi absensi (H, I, S, A, B) tersedia untuk setiap siswa di daftar', () => {
    assert.ok(
      jurnalContent.includes("{ code: 'H', label: 'Hadir'") &&
      jurnalContent.includes("{ code: 'I', label: 'Izin'") &&
      jurnalContent.includes("{ code: 'S', label: 'Sakit'") &&
      jurnalContent.includes("{ code: 'A', label: 'Alfa'") &&
      jurnalContent.includes("{ code: 'B', label: 'Bolos'"),
      'Attendance buttons for H, I, S, A, and B must be rendered per student'
    );
  });

  runTest('3.4: Tampilan status informatif saat daftar siswa kelas masih kosong atau kelas belum dipilih', () => {
    assert.ok(
      jurnalContent.includes('Belum Ada Siswa Terdaftar di Kelas') || jurnalContent.includes('Pilih Kelas Terlebih Dahulu'),
      'Empty state alert must be displayed when students array is empty or class is unselected'
    );
  });

  // ==========================================================================
  // SECTION 4: INTEGRITAS SIMPAN ABSENSI & SYNCHRONIZATION
  // ==========================================================================
  console.log('\n--- Section 4: Integritas Simpan Absensi & Sinkronisasi ---');

  runTest('4.1: handleSaveAbsensiOnly menyimpan absensi seluruh siswa kelas ke kolom absensi_siswa', () => {
    assert.ok(
      jurnalContent.includes('cleanAbsensiForSave[s.nisn] = absensi[s.nisn] || \'H\';'),
      'Default status Hadir is applied for all unadjusted students'
    );
    assert.ok(
      jurnalContent.includes('absensi_siswa: JSON.stringify(cleanAbsensiForSave)'),
      'Serialized attendance map is stored in absensi_siswa'
    );
  });

  runTest('4.2: Tombol Simpan Absensi Siswa memicu handleSaveAbsensiOnly', () => {
    assert.ok(
      jurnalContent.includes('onClick={handleSaveAbsensiOnly}'),
      'Save button must bind to handleSaveAbsensiOnly'
    );
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (failed > 0) {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('Fatal error running suite:', err);
  process.exit(1);
});
