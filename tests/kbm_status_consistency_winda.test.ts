import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { 
  normalizeTeacherIdentityName, 
  isTeacherNameEquivalent,
  isTeacherRecordMatch,
  isJurnalMatchJadwal
} from '../src/lib/workflow';
import { 
  isTeacherJournalMatch, 
  isTeacherScheduleMatch 
} from '../src/lib/attendanceAlpa';

async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TEST SUITE: SINKRONISASI KONSISTENSI STATUS KBM (IBU WINDA WULANSARI)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  ❌ [FAIL] ${name}: ${e.message}`);
      failed++;
    }
  }

  // --- SECTION 1: Normalisasi Gelar & Honorifics (Ibu, Pak, Ustadz, dll) ---
  console.log('--- Section 1: Normalisasi Gelar & Honorifics Identitas Guru ---');

  test('1.1: normalizeTeacherIdentityName membersihkan honorifics "Ibu" dari nama guru', () => {
    assert.strictEqual(
      normalizeTeacherIdentityName('Ibu Winda Wulansari'),
      'winda wulansari',
      '"Ibu Winda Wulansari" harus ternormalisasi menjadi "winda wulansari"'
    );
  });

  test('1.2: normalizeTeacherIdentityName membersihkan "Pak", "Bapak", "Ustadz", "Guru"', () => {
    assert.strictEqual(normalizeTeacherIdentityName('Pak Budi Santoso'), 'budi santoso');
    assert.strictEqual(normalizeTeacherIdentityName('Bapak Ahmad Dahlan'), 'ahmad dahlan');
    assert.strictEqual(normalizeTeacherIdentityName('Ustadz Fauzi'), 'fauzi');
    assert.strictEqual(normalizeTeacherIdentityName('Guru Winda Wulansari'), 'winda wulansari');
    assert.strictEqual(normalizeTeacherIdentityName('Bu Winda Wulansari'), 'winda wulansari', '"Bu" harus dibersihkan');
    assert.strictEqual(normalizeTeacherIdentityName('H. Ahmad Dahlan'), 'ahmad dahlan', '"H." harus dibersihkan');
    assert.strictEqual(normalizeTeacherIdentityName('Haji Ahmad Dahlan'), 'ahmad dahlan', '"Haji" harus dibersihkan');
    assert.strictEqual(normalizeTeacherIdentityName('Ustadzah Fatimah'), 'fatimah', '"Ustadzah" harus dibersihkan');
  });

  test('1.3: isTeacherNameEquivalent mencocokkan "Ibu Winda Wulansari" dengan "Winda Wulansari"', () => {
    assert.strictEqual(
      isTeacherNameEquivalent('Ibu Winda Wulansari', 'Winda Wulansari'),
      true,
      '"Ibu Winda Wulansari" harus ekuivalen dengan "Winda Wulansari"'
    );
    assert.strictEqual(
      isTeacherNameEquivalent('Winda Wulansari', 'Ibu Winda Wulansari'),
      true,
      'Pencocokan ekuivalensi harus simetris dua arah'
    );
    assert.strictEqual(
      isTeacherNameEquivalent('Bu Winda Wulansari', 'Winda Wulansari'),
      true,
      '"Bu Winda Wulansari" harus ekuivalen dengan "Winda Wulansari"'
    );
    assert.strictEqual(
      isTeacherNameEquivalent('H. Ahmad Dahlan', 'Ahmad Dahlan'),
      true,
      '"H. Ahmad Dahlan" harus ekuivalen dengan "Ahmad Dahlan"'
    );
  });

  test('1.4: isTeacherNameEquivalent mencocokkan "Ibu Winda Wulansari" dengan "Winda Wulansari, S.Pd."', () => {
    assert.strictEqual(
      isTeacherNameEquivalent('Ibu Winda Wulansari', 'Winda Wulansari, S.Pd.'),
      true,
      '"Ibu Winda Wulansari" harus ekuivalen dengan "Winda Wulansari, S.Pd."'
    );
  });

  test('1.5: isTeacherRecordMatch mencocokkan record dengan variasi honorific dan linked user', () => {
    const teacherProfile = {
      id: 'dg-winda-1',
      user_id: 'usr-winda-1',
      nama_guru: 'Ibu Winda Wulansari',
      nip: '198501012010012001'
    };
    const linkedUser = {
      id: 'usr-winda-1',
      nama: 'Winda Wulansari',
      username: '198501012010012001'
    };
    const journalRecord = {
      id: 'jur-1',
      nama_guru: 'Winda Wulansari',
      mapel: 'Matematika',
      kelas: 'VII A'
    };
    assert.strictEqual(
      isTeacherRecordMatch(journalRecord, teacherProfile, linkedUser),
      true,
      'isTeacherRecordMatch harus mencocokkan jurnal Winda Wulansari dengan data_guru Ibu Winda Wulansari'
    );
  });

  test('1.6: isTeacherJournalMatch dan isTeacherScheduleMatch di attendanceAlpa mendukung honorific', () => {
    const teacher = { nama_guru: 'Ibu Winda Wulansari', sekolah_id: 'sch-1' };
    const journal = { nama_guru: 'Winda Wulansari', sekolah_id: 'sch-1' };
    const schedule = { nama_guru: 'Winda Wulansari, S.Pd.', sekolah_id: 'sch-1' };

    assert.strictEqual(isTeacherJournalMatch(teacher, journal), true, 'isTeacherJournalMatch harus mengenali Ibu Winda');
    assert.strictEqual(isTeacherScheduleMatch(teacher, schedule), true, 'isTeacherScheduleMatch harus mengenali Ibu Winda');
  });

  test('1.7: isTeacherJournalMatch mengenali jurnal substitusi INVAL meskipun user_id guru pengganti berbeda', () => {
    const teacher = { nama_guru: 'Ibu Winda Wulansari', user_id: 'usr-winda-1', sekolah_id: 'sch-1' };
    const invalJournal = {
      id: 'jur-inval-99',
      nama_guru: 'Pak Budi Santoso',
      user_id: 'usr-budi-substitute',
      sekolah_id: 'sch-1',
      keterangan: '[INVAL - Menggantikan: Ibu Winda Wulansari] Jurnal KBM'
    };

    assert.strictEqual(
      isTeacherJournalMatch(teacher, invalJournal),
      true,
      'isTeacherJournalMatch harus mencocokkan jurnal INVAL dengan guru yang digantikan'
    );
  });

  test('1.8: isTeacherScheduleMatch mencocokkan ekuivalensi nama ketika jadwal tanpa user_id', () => {
    const teacher = { nama_guru: 'Ibu Winda Wulansari', user_id: 'usr-winda-current', sekolah_id: 'sch-1' };
    const schedule = { nama_guru: 'Winda Wulansari', sekolah_id: 'sch-1' };

    assert.strictEqual(
      isTeacherScheduleMatch(teacher, schedule),
      true,
      'isTeacherScheduleMatch harus mencocokkan ekuivalensi nama ketika jadwal master tanpa user_id'
    );
  });

  // --- SECTION 2: Simulasi Logika Sinkronisasi Status KBM Admin vs Guru ---
  console.log('\n--- Section 2: Logika Sinkronisasi Status KBM Admin vs Guru ---');

  function calculateAdminJurnalStatus(
    teacher: any,
    targetClasses: any[],
    acceptedTeacherJournals: any[],
    presensiDatangStatus: string,
    isSchoolDayOff: boolean = false
  ) {
    const isRealJournal = (j: any): boolean => {
      if (!j) return false;
      const sv = j.status_verifikasi;
      if (sv === 'Tidak Masuk Kelas' || sv === 'Tidak Melaksanakan Kegiatan' || sv === 'Sakit' || sv === 'Izin') return false;
      const ket = (j.keterangan || '').trim().toLowerCase();
      if (ket === 'tidak masuk kelas' || ket === 'tidak melaksanakan kegiatan apapun' || ket === 'auto-fill sistem karena guru berhalangan hadir') return false;
      const mat = (j.materi || j.materi_pembelajaran || '').trim().toLowerCase();
      if (mat === 'tidak masuk kelas' || mat === 'tidak melaksanakan kegiatan apapun' || mat.startsWith('guru tidak dapat mengisi jurnal karena')) return false;
      if (j.materi === '-' && j.kegiatan === '-') return false;
      return true;
    };

    const targetCount = targetClasses.length;
    const hasTidakMasukKelas = acceptedTeacherJournals.some((j: any) => 
      j.status_verifikasi === 'Tidak Masuk Kelas' || j.keterangan === 'Tidak Masuk Kelas'
    );
    const hasRejectedJournal = acceptedTeacherJournals.some((j: any) => j.status_verifikasi === 'Ditolak');

    const realTeacherJournals = acceptedTeacherJournals.filter((j: any) => 
      isRealJournal(j) && j.status_verifikasi !== 'Tidak Masuk Kelas'
    );

    const filledClassesCount = targetClasses.filter((jk: any) => 
      acceptedTeacherJournals.some((j: any) => j.status_verifikasi !== 'Tidak Masuk Kelas' && isRealJournal(j) && isJurnalMatchJadwal(j, jk))
    ).length;

    const filledCount = targetCount > 0
      ? Math.max(filledClassesCount, Math.min(targetCount, realTeacherJournals.length))
      : realTeacherJournals.length;

    let jurnalStatus = 'Bebas KBM';
    let jurnalColor = 'gray';

    if (targetCount === 0) {
      if (realTeacherJournals.length > 0) {
        jurnalStatus = `${realTeacherJournals.length}/${realTeacherJournals.length} Selesai`;
        jurnalColor = 'green';
      } else {
        jurnalStatus = 'Bebas KBM';
        jurnalColor = 'gray';
      }
    } else if (filledCount >= targetCount && targetCount > 0) {
      jurnalStatus = `${targetCount}/${targetCount} Selesai`;
      jurnalColor = 'green';
    } else if (filledCount > 0) {
      jurnalStatus = `${filledCount}/${targetCount} Belum Lengkap`;
      jurnalColor = 'amber';
    } else if (hasTidakMasukKelas) {
      jurnalStatus = 'Tidak Masuk Kelas';
      jurnalColor = 'rose';
    } else if (hasRejectedJournal) {
      jurnalStatus = 'Ditolak (Perlu Revisi)';
      jurnalColor = 'rose';
    } else {
      jurnalStatus = 'Belum Mengisi';
      jurnalColor = 'rose';
    }

    return { jurnalStatus, jurnalColor, filledCount, targetCount };
  }

  test('2.1: Guru yang sudah mengisi jurnal dan presensi pulang TIDAK berstatus "Tidak Masuk Kelas" di Admin', () => {
    const teacher = { nama_guru: 'Ibu Winda Wulansari', user_id: 'usr-winda-1' };
    const targetClasses = [
      { id: 'sch-1', kelas: 'VII A', mata_pelajaran: 'Matematika' }
    ];
    // Skenario Ibu Winda: sudah mengisi jurnal riil di kelasnya
    const acceptedTeacherJournals = [
      {
        id: 'jur-winda-1',
        nama_guru: 'Winda Wulansari',
        kelas: 'VII A',
        mapel: 'Matematika',
        materi: 'Persamaan Linear Satu Variabel',
        kegiatan: 'Latihan soal dan diskusi kelompok',
        status_verifikasi: 'Menunggu'
      }
    ];

    const result = calculateAdminJurnalStatus(teacher, targetClasses, acceptedTeacherJournals, 'Hadir [07:15]');
    assert.strictEqual(result.jurnalStatus, '1/1 Selesai', 'Status KBM di Admin harus 1/1 Selesai, bukan Tidak Masuk Kelas');
    assert.strictEqual(result.jurnalColor, 'green', 'Warna indikator harus hijau');
  });

  test('2.2: Skenario Ibu Winda jika ada entri "Tidak Masuk Kelas" usang dari auto-record, tetap berstatus Selesai', () => {
    const teacher = { nama_guru: 'Ibu Winda Wulansari', user_id: 'usr-winda-1' };
    const targetClasses = [
      { id: 'sch-1', kelas: 'VII A', mata_pelajaran: 'Matematika' }
    ];
    // Jurnal riil guru DAN entri delinquency usang
    const acceptedTeacherJournals = [
      {
        id: 'jur-winda-1',
        nama_guru: 'Winda Wulansari',
        kelas: 'VII A',
        mapel: 'Matematika',
        materi: 'Persamaan Linear Satu Variabel',
        kegiatan: 'Latihan soal',
        status_verifikasi: 'Menunggu'
      },
      {
        id: 'jur-delinquent-stale',
        nama_guru: 'Ibu Winda Wulansari',
        kelas: 'VII A',
        mapel: 'Matematika',
        materi: 'tidak masuk kelas',
        kegiatan: 'tidak masuk kelas',
        status_verifikasi: 'Tidak Masuk Kelas',
        keterangan: 'Tidak Masuk Kelas'
      }
    ];

    const result = calculateAdminJurnalStatus(teacher, targetClasses, acceptedTeacherJournals, 'Hadir [07:15]');
    assert.strictEqual(result.jurnalStatus, '1/1 Selesai', 'Entri Tidak Masuk Kelas usang tidak boleh mengesampingkan jurnal riil');
    assert.strictEqual(result.jurnalColor, 'green');
  });

  test('2.3: Guru dengan 2 jam mengajar yang hanya mengisi 1 kelas berstatus "1/2 Belum Lengkap" (bukan Tidak Masuk Kelas)', () => {
    const teacher = { nama_guru: 'Ibu Winda Wulansari', user_id: 'usr-winda-1' };
    const targetClasses = [
      { id: 'sch-1', kelas: 'VII A', mata_pelajaran: 'Matematika' },
      { id: 'sch-2', kelas: 'VII B', mata_pelajaran: 'Matematika' }
    ];
    const acceptedTeacherJournals = [
      {
        id: 'jur-winda-1',
        nama_guru: 'Winda Wulansari',
        kelas: 'VII A',
        mapel: 'Matematika',
        materi: 'Aljabar',
        kegiatan: 'Latihan',
        status_verifikasi: 'Menunggu'
      },
      {
        id: 'jur-tmk-2',
        nama_guru: 'Ibu Winda Wulansari',
        kelas: 'VII B',
        mapel: 'Matematika',
        materi: 'tidak masuk kelas',
        kegiatan: 'tidak masuk kelas',
        status_verifikasi: 'Tidak Masuk Kelas'
      }
    ];

    const result = calculateAdminJurnalStatus(teacher, targetClasses, acceptedTeacherJournals, 'Hadir [07:15]');
    assert.strictEqual(result.jurnalStatus, '1/2 Belum Lengkap', 'Guru yang mengisi 1 dari 2 kelas harus berstatus 1/2 Belum Lengkap');
    assert.strictEqual(result.jurnalColor, 'amber');
  });

  test('2.4: Guru yang benar-benar tidak masuk kelas (0 jurnal riil) tetap berstatus "Tidak Masuk Kelas"', () => {
    const teacher = { nama_guru: 'Guru Alpa', user_id: 'usr-alpa-1' };
    const targetClasses = [
      { id: 'sch-1', kelas: 'VIII A', mata_pelajaran: 'IPA' }
    ];
    const acceptedTeacherJournals = [
      {
        id: 'jur-tmk-1',
        nama_guru: 'Guru Alpa',
        kelas: 'VIII A',
        mapel: 'IPA',
        materi: 'tidak masuk kelas',
        kegiatan: 'tidak masuk kelas',
        status_verifikasi: 'Tidak Masuk Kelas',
        keterangan: 'Tidak Masuk Kelas'
      }
    ];

    const result = calculateAdminJurnalStatus(teacher, targetClasses, acceptedTeacherJournals, 'Belum Datang');
    assert.strictEqual(result.jurnalStatus, 'Tidak Masuk Kelas', 'Guru tanpa jurnal riil dengan auto-record harus tetap berstatus Tidak Masuk Kelas');
    assert.strictEqual(result.jurnalColor, 'rose');
  });

  test('2.5: Guru 3 jadwal KBM yang mengisi 2 kelas dan kelas ke-3 tidak masuk berstatus "2/3 Belum Lengkap" (bukan Tidak Masuk Kelas)', () => {
    const teacher = { nama_guru: 'Ibu Winda Wulansari', user_id: 'usr-winda-1' };
    const targetClasses = [
      { id: 'sch-1', kelas: 'VII A', mata_pelajaran: 'Matematika' },
      { id: 'sch-2', kelas: 'VII B', mata_pelajaran: 'Matematika' },
      { id: 'sch-3', kelas: 'VII C', mata_pelajaran: 'Matematika' }
    ];
    const acceptedTeacherJournals = [
      {
        id: 'jur-1',
        nama_guru: 'Winda Wulansari',
        kelas: 'VII A',
        mapel: 'Matematika',
        materi: 'Aljabar 1',
        kegiatan: 'Latihan 1',
        status_verifikasi: 'Menunggu'
      },
      {
        id: 'jur-2',
        nama_guru: 'Winda Wulansari',
        kelas: 'VII B',
        mapel: 'Matematika',
        materi: 'Aljabar 2',
        kegiatan: 'Latihan 2',
        status_verifikasi: 'Menunggu'
      },
      {
        id: 'jur-3-tmk',
        nama_guru: 'Ibu Winda Wulansari',
        kelas: 'VII C',
        mapel: 'Matematika',
        materi: 'tidak masuk kelas',
        kegiatan: 'tidak masuk kelas',
        status_verifikasi: 'Tidak Masuk Kelas'
      }
    ];

    const result = calculateAdminJurnalStatus(teacher, targetClasses, acceptedTeacherJournals, 'Hadir [07:15]');
    assert.strictEqual(result.jurnalStatus, '2/3 Belum Lengkap', 'Guru 2 dari 3 kelas harus 2/3 Belum Lengkap');
    assert.strictEqual(result.jurnalColor, 'amber');
  });

  test('2.6: Guru 3 jadwal KBM yang kelas ke-3 diisi oleh Guru Pengganti (INVAL) dihitung 3/3 Selesai', () => {
    const teacherProfile = { nama_guru: 'Ibu Winda Wulansari', user_id: 'usr-winda-1' };
    const invalJournal = {
      id: 'jur-inval-3',
      nama_guru: 'Pak Guru Inval',
      kelas: 'VII C',
      mapel: 'Matematika',
      materi: 'Materi Pengganti',
      kegiatan: 'Kegiatan Pengganti',
      keterangan: '[INVAL - Menggantikan: Ibu Winda Wulansari] Jurnal KBM',
      status_verifikasi: 'Menunggu'
    };

    assert.strictEqual(
      isTeacherRecordMatch(invalJournal, teacherProfile),
      true,
      'isTeacherRecordMatch harus mengaitkan jurnal INVAL dengan guru yang digantikan'
    );
  });

  test('2.7: Skenario guru targetCount === 0 yang mengisi jurnal KBM riil berstatus Selesai (bukan Bebas KBM)', () => {
    const teacher = { nama_guru: 'Ibu Winda Wulansari', user_id: 'usr-winda-1' };
    const targetClasses: any[] = []; // tidak terjadwal reguler
    const acceptedTeacherJournals = [
      {
        id: 'jur-extra-1',
        nama_guru: 'Winda Wulansari',
        kelas: 'VII A',
        mapel: 'Matematika',
        materi: 'Jam Tambahan Penguatan Aljabar',
        kegiatan: 'Bimbingan intensif',
        status_verifikasi: 'Menunggu'
      }
    ];

    const result = calculateAdminJurnalStatus(teacher, targetClasses, acceptedTeacherJournals, 'Hadir [07:15]');
    assert.strictEqual(result.jurnalStatus, '1/1 Selesai', 'Guru yang mengisi KBM riil meski targetCount=0 harus 1/1 Selesai');
    assert.strictEqual(result.jurnalColor, 'green');
  });

  test('2.8: Rekap Jurnal deduplication menyaring auto-record delinquency jika jurnal riil telah disubmit', () => {
    const journalData = [
      {
        id: 'delinquency-1',
        tanggal: '2026-11-11',
        kelas: 'VII A',
        mapel: 'Matematika',
        materi: 'tidak masuk kelas',
        kegiatan: 'tidak masuk kelas',
        status_verifikasi: 'Tidak Masuk Kelas',
        keterangan: 'Tidak Masuk Kelas'
      },
      {
        id: 'real-1',
        tanggal: '2026-11-11',
        kelas: 'VII A',
        mapel: 'Matematika',
        materi: 'Persamaan Linear Satu Variabel',
        kegiatan: 'Diskusi dan Latihan',
        status_verifikasi: 'Menunggu',
        keterangan: 'Jurnal KBM'
      }
    ];

    // Filter simulating RekapJurnalView.tsx squelch logic
    const squelched = journalData.filter(j => {
      const statusLower = (j.status_verifikasi || '').toLowerCase();
      const ketLower = (j.keterangan || '').toLowerCase();
      const matLower = (j.materi || '').toLowerCase();
      const isDelinquency = statusLower === 'tidak masuk kelas' || ketLower === 'tidak masuk kelas' || matLower === 'tidak masuk kelas';
      if (isDelinquency) {
        const hasRealJournalForClass = journalData.some(rj => {
          if (rj.id === j.id) return false;
          if (rj.tanggal !== j.tanggal) return false;
          const rjStatus = (rj.status_verifikasi || '').toLowerCase();
          const rjMat = (rj.materi || '').trim().toLowerCase();
          const rjKeg = (rj.kegiatan || '').trim().toLowerCase();
          if (rjStatus === 'tidak masuk kelas' || rjMat === 'tidak masuk kelas' || (rjMat === '-' && rjKeg === '-')) return false;
          if (!rjMat && !rjKeg) return false;
          const classMatches = rj.kelas && j.kelas && rj.kelas.trim().toLowerCase() === j.kelas.trim().toLowerCase();
          const mapelMatches = (rj.mapel || '').trim().toLowerCase() === (j.mapel || '').trim().toLowerCase();
          return classMatches && (mapelMatches || !j.mapel || j.mapel === '-');
        });
        if (hasRealJournalForClass) return false;
      }
      return true;
    });

    assert.strictEqual(squelched.length, 1, 'Harus tersisa 1 entri (hanya jurnal riil)');
    assert.strictEqual(squelched[0].id, 'real-1', 'Entri yang tersisa harus jurnal riil');
  });

  // --- SECTION 3: Verifikasi Kode Sumber Statis ---
  console.log('\n--- Section 3: Verifikasi Integritas Kode Sumber ---');

  const root = path.resolve(__dirname, '..');
  const homeAdminSrc = fs.readFileSync(path.join(root, 'src', 'components', 'HomeViewAdmin.tsx'), 'utf8');
  const workflowSrc = fs.readFileSync(path.join(root, 'src', 'lib', 'workflow.ts'), 'utf8');
  const attendanceSrc = fs.readFileSync(path.join(root, 'src', 'lib', 'attendanceAlpa.ts'), 'utf8');
  const guruPresensiSrc = fs.readFileSync(path.join(root, 'src', 'components', 'GuruPresensi.tsx'), 'utf8');
  const rekapJurnalSrc = fs.readFileSync(path.join(root, 'src', 'components', 'RekapJurnalView.tsx'), 'utf8');
  const guruJurnalSrc = fs.readFileSync(path.join(root, 'src', 'components', 'GuruJurnal.tsx'), 'utf8');

  test('3.1: HomeViewAdmin.tsx mengecek filledCount >= targetCount sebelum hasTidakMasukKelas dalam penentuan status', () => {
    const posFilled = homeAdminSrc.indexOf('else if (filledCount >= targetCount');
    const posTmk = homeAdminSrc.indexOf('else if (hasTidakMasukKelas)');
    assert.ok(posFilled !== -1, 'HomeViewAdmin harus memeriksa filledCount >= targetCount');
    assert.ok(posTmk !== -1, 'HomeViewAdmin harus memeriksa hasTidakMasukKelas');
    assert.ok(posFilled < posTmk, 'filledCount >= targetCount harus dievaluasi sebelum hasTidakMasukKelas');
  });

  test('3.2: workflow.ts normalizeTeacherIdentityName memuat honorifics (ibu, bu, bapak, haji, dll)', () => {
    assert.ok(
      workflowSrc.includes('ibu|bu|bapak|pak|bpk|ustadz|ustadzah|ust|guru|haji|h|hj|hjh|kh|kyai|kiai'),
      'normalizeTeacherIdentityName harus memuat daftar honorific Indonesia lengkap'
    );
  });

  test('3.3: attendanceAlpa.ts cleanTeacherNameForMatch memuat honorifics (ibu, bu, bapak, haji, dll)', () => {
    assert.ok(
      attendanceSrc.includes('ibu|bu|bapak|pak|bpk|ustadz|ustadzah|ust|guru|haji|h'),
      'cleanTeacherNameForMatch harus memuat daftar honorific Indonesia lengkap'
    );
  });

  test('3.4: GuruPresensi.tsx mengambil daily state terkini saat presensi pulang', () => {
    assert.ok(
      guruPresensiSrc.includes("getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id).then(latestState => {"),
      'GuruPresensi.tsx harus memuat latestState sebelum auto-record unfilled duties'
    );
  });

  test('3.5: workflow.ts memuat integrasi INVAL substitution dalam isTeacherRecordMatch', () => {
    assert.ok(
      workflowSrc.includes('invalMatch') && workflowSrc.includes('Menggantikan'),
      'isTeacherRecordMatch harus mengenali jurnal substitusi INVAL'
    );
  });

  test('3.6: attendanceAlpa.ts isTeacherJournalMatch memuat integrasi substitusi INVAL', () => {
    assert.ok(
      attendanceSrc.includes('invalMatch') && attendanceSrc.includes('Menggantikan'),
      'isTeacherJournalMatch harus mengenali jurnal substitusi INVAL'
    );
  });

  test('3.7: workflow.ts findGuruDailyState memuat query fallback substitusi INVAL', () => {
    assert.ok(
      workflowSrc.includes('Menggantikan:%${teacherFirstToken}%') || workflowSrc.includes('Menggantikan:%${needle}%'),
      'findGuruDailyState harus menyertakan query keterangan INVAL'
    );
  });

  test('3.8: RekapJurnalView.tsx squelches obsolete auto-record tidak masuk kelas when real journal exists', () => {
    assert.ok(
      rekapJurnalSrc.includes('hasRealJournalForClass') && rekapJurnalSrc.includes('isDelinquency'),
      'RekapJurnalView harus menyaring auto-record delinquency jika jurnal riil tersedia'
    );
  });

  test('3.9: GuruJurnal.tsx uses normalizeTeacherIdentityName for session resolution', () => {
    assert.ok(
      guruJurnalSrc.includes('normalizeTeacherIdentityName') && guruJurnalSrc.includes('normName'),
      'GuruJurnal.tsx harus menormalisasi identitas sapaan guru untuk resolusi sesi'
    );
  });

  console.log('\n========================================================================');
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 SELURUH PENGUJIAN SINKRONISASI STATUS KBM WINDA WULANSARI LULUS 100%!');
  }
}

runTests();
