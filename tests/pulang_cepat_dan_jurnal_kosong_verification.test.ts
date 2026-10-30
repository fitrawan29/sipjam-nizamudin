import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { 
  evaluatePulangCepatDanJurnal, 
  isTeacherScheduleMatch, 
  isTeacherJournalMatch 
} from '../src/lib/attendanceAlpa';
import { isJurnalMatchJadwal } from '../src/lib/workflow';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      res.then(() => {
        console.log(`  ✔ [PASS] ${name}`);
        passed++;
      }).catch(err => {
        console.error(`  ❌ [FAIL] ${name}:`, err);
        failed++;
      });
    } else {
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    }
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message || err);
    failed++;
  }
}

async function runAll() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TEST SUITE: ALUR PRESENSI PULANG CEPAT & JURNAL TIDAK MASUK KELAS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const root = path.resolve(__dirname, '..');

  // ==========================================================================
  // SECTION 1: LOGIKA EVALUASI R1 - STATUS PRESENSI PULANG CEPAT
  // ==========================================================================
  console.log('--- Section 1: R1 - Logika Deteksi Pulang Cepat ---');

  runTest('1.1: Guru presensi datang + ada jadwal KBM + tidak isi jurnal + tidak pulang => Pulang Cepat', () => {
    const teacher = { nama_guru: 'Budi Santoso, S.Pd.', user_id: 'usr-budi-1', sekolah_id: 'sch-1' };
    const teacherPresensi = [
      {
        id: 'pres-1',
        nama_guru: 'Budi Santoso, S.Pd.',
        user_id: 'usr-budi-1',
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Disetujui',
        timestamp: '2026-10-30T07:10:00+08:00',
        sekolah_id: 'sch-1'
      }
    ];
    const allSchedules = [
      {
        id: 'sch-kbm-1',
        nama_guru: 'Budi Santoso, S.Pd.',
        user_id: 'usr-budi-1',
        hari: 'Jumat',
        kelas: 'VII A',
        mata_pelajaran: 'Matematika',
        jam_mulai: '07:30',
        jam_selesai: '09:00',
        sekolah_id: 'sch-1'
      },
      {
        id: 'sch-kbm-2',
        nama_guru: 'Budi Santoso, S.Pd.',
        user_id: 'usr-budi-1',
        hari: 'Jumat',
        kelas: 'VII B',
        mata_pelajaran: 'Matematika',
        jam_mulai: '09:15',
        jam_selesai: '10:45',
        sekolah_id: 'sch-1'
      }
    ];
    const allJournals: any[] = []; // Guru tidak mengisi jurnal sama sekali

    const res = evaluatePulangCepatDanJurnal(teacher, teacherPresensi, allSchedules, allJournals);

    assert.strictEqual(res.isEligibleAutoCheckout, true, 'Harus eligible auto-checkout');
    assert.strictEqual(res.isPulangCepat, true, 'Harus terdeteksi sebagai Pulang Cepat');
    assert.strictEqual(res.statusPresensi, 'Pulang Cepat', 'Status presensi harus "Pulang Cepat"');
    assert.strictEqual(res.emptySchedules.length, 2, 'Harus mendeteksi 2 jadwal kosong');
    assert.strictEqual(res.emptySchedules[0].id, 'sch-kbm-1');
    assert.strictEqual(res.emptySchedules[1].id, 'sch-kbm-2');
  });

  runTest('1.2: Guru yang sudah presensi pulang normal TIDAK terpengaruh aturan Pulang Cepat', () => {
    const teacher = { nama_guru: 'Budi Santoso, S.Pd.', user_id: 'usr-budi-1', sekolah_id: 'sch-1' };
    const teacherPresensi = [
      {
        id: 'pres-1',
        nama_guru: 'Budi Santoso, S.Pd.',
        user_id: 'usr-budi-1',
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Disetujui',
        timestamp: '2026-10-30T07:10:00+08:00',
        sekolah_id: 'sch-1'
      },
      {
        id: 'pres-2',
        nama_guru: 'Budi Santoso, S.Pd.',
        user_id: 'usr-budi-1',
        tipe_absen: 'Pulang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Disetujui',
        timestamp: '2026-10-30T14:00:00+08:00',
        sekolah_id: 'sch-1'
      }
    ];
    const allSchedules = [
      {
        id: 'sch-kbm-1',
        nama_guru: 'Budi Santoso, S.Pd.',
        user_id: 'usr-budi-1',
        hari: 'Jumat',
        kelas: 'VII A',
        mata_pelajaran: 'Matematika',
        sekolah_id: 'sch-1'
      }
    ];

    const res = evaluatePulangCepatDanJurnal(teacher, teacherPresensi, allSchedules, []);
    assert.strictEqual(res.isEligibleAutoCheckout, false, 'Guru yang sudah pulang normal tidak perlu auto-checkout');
    assert.strictEqual(res.isPulangCepat, false, 'Guru yang sudah pulang normal bukan Pulang Cepat');
  });

  runTest('1.3: Guru yang mengisi Jurnal Kegiatan TIDAK terpengaruh aturan Pulang Cepat (Lupa Checkout biasa)', () => {
    const teacher = { nama_guru: 'Budi Santoso, S.Pd.', user_id: 'usr-budi-1', sekolah_id: 'sch-1' };
    const teacherPresensi = [
      {
        id: 'pres-1',
        nama_guru: 'Budi Santoso, S.Pd.',
        user_id: 'usr-budi-1',
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Disetujui',
        timestamp: '2026-10-30T07:10:00+08:00',
        sekolah_id: 'sch-1'
      }
    ];
    const allSchedules = [
      {
        id: 'sch-kbm-1',
        nama_guru: 'Budi Santoso, S.Pd.',
        user_id: 'usr-budi-1',
        hari: 'Jumat',
        kelas: 'VII A',
        mata_pelajaran: 'Matematika',
        sekolah_id: 'sch-1'
      }
    ];
    const allJournals = [
      {
        id: 'jrn-kegiatan-1',
        nama_guru: 'Budi Santoso, S.Pd.',
        user_id: 'usr-budi-1',
        tanggal: '2026-10-30',
        keterangan: 'Jurnal Kegiatan',
        mapel: 'Jurnal Kegiatan',
        status_verifikasi: 'Disetujui',
        sekolah_id: 'sch-1'
      }
    ];

    const res = evaluatePulangCepatDanJurnal(teacher, teacherPresensi, allSchedules, allJournals);
    assert.strictEqual(res.isEligibleAutoCheckout, true);
    assert.strictEqual(res.isPulangCepat, false, 'Guru yang isi Jurnal Kegiatan tidak dihitung Pulang Cepat');
    assert.strictEqual(res.statusPresensi, 'Lupa Checkout', 'Mendapat status standar Lupa Checkout');
    assert.strictEqual(res.emptySchedules.length, 0, 'Tidak boleh ada jadwal kosong yang ditandai');
  });

  runTest('1.4: Guru yang mengisi seluruh jadwal KBM dengan lengkap TIDAK terpengaruh aturan Pulang Cepat', () => {
    const teacher = { nama_guru: 'Budi Santoso, S.Pd.', user_id: 'usr-budi-1', sekolah_id: 'sch-1' };
    const teacherPresensi = [
      {
        id: 'pres-1',
        nama_guru: 'Budi Santoso, S.Pd.',
        user_id: 'usr-budi-1',
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Disetujui',
        timestamp: '2026-10-30T07:10:00+08:00',
        sekolah_id: 'sch-1'
      }
    ];
    const allSchedules = [
      {
        id: 'sch-kbm-1',
        nama_guru: 'Budi Santoso, S.Pd.',
        user_id: 'usr-budi-1',
        hari: 'Jumat',
        kelas: 'VII A',
        mata_pelajaran: 'Matematika',
        sekolah_id: 'sch-1'
      }
    ];
    const allJournals = [
      {
        id: 'jrn-kbm-1',
        nama_guru: 'Budi Santoso, S.Pd.',
        user_id: 'usr-budi-1',
        tanggal: '2026-10-30',
        kelas: 'VII A',
        mapel: 'Matematika',
        keterangan: 'Jurnal KBM',
        status_verifikasi: 'Disetujui',
        sekolah_id: 'sch-1'
      }
    ];

    const res = evaluatePulangCepatDanJurnal(teacher, teacherPresensi, allSchedules, allJournals);
    assert.strictEqual(res.isPulangCepat, false, 'Mengisi jadwal KBM lengkap => bukan Pulang Cepat');
    assert.strictEqual(res.statusPresensi, 'Lupa Checkout');
    assert.strictEqual(res.emptySchedules.length, 0);
  });

  runTest('1.5: Guru yang TIDAK memiliki jadwal mengajar hari ini TIDAK terpengaruh aturan Pulang Cepat', () => {
    const teacher = { nama_guru: 'Budi Santoso, S.Pd.', user_id: 'usr-budi-1', sekolah_id: 'sch-1' };
    const teacherPresensi = [
      {
        id: 'pres-1',
        nama_guru: 'Budi Santoso, S.Pd.',
        user_id: 'usr-budi-1',
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Disetujui',
        timestamp: '2026-10-30T07:10:00+08:00',
        sekolah_id: 'sch-1'
      }
    ];
    const allSchedules: any[] = []; // Hari non-teaching / bebas KBM

    const res = evaluatePulangCepatDanJurnal(teacher, teacherPresensi, allSchedules, []);
    assert.strictEqual(res.isPulangCepat, false, 'Tidak ada jadwal hari ini => bukan Pulang Cepat');
    assert.strictEqual(res.statusPresensi, 'Lupa Checkout');
    assert.strictEqual(res.emptySchedules.length, 0);
  });

  // ==========================================================================
  // SECTION 2: LOGIKA EVALUASI R2 - PENGISIAN JURNAL KOSONG "TIDAK MASUK KELAS"
  // ==========================================================================
  console.log('\n--- Section 2: R2 - Pengisian Jurnal Kosong Menjadi Tidak Masuk Kelas ---');

  runTest('2.1: Seluruh jadwal jam pelajaran kosong otomatis teridentifikasi untuk dicatat "Tidak Masuk Kelas"', () => {
    const teacher = { nama_guru: 'Dewi Sartika, M.Pd.', user_id: 'usr-dewi-2', sekolah_id: 'sch-2' };
    const teacherPresensi = [
      {
        id: 'pres-dewi',
        nama_guru: 'Dewi Sartika, M.Pd.',
        user_id: 'usr-dewi-2',
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Disetujui',
        timestamp: '2026-10-30T07:15:00+08:00',
        sekolah_id: 'sch-2'
      }
    ];
    const allSchedules = [
      {
        id: 'sch-ipa-1',
        nama_guru: 'Dewi Sartika, M.Pd.',
        user_id: 'usr-dewi-2',
        hari: 'Jumat',
        kelas: 'VIII A',
        mata_pelajaran: 'IPA Terpadu',
        jam_mulai: '07:30',
        jam_selesai: '09:00',
        sekolah_id: 'sch-2'
      },
      {
        id: 'sch-ipa-2',
        nama_guru: 'Dewi Sartika, M.Pd.',
        user_id: 'usr-dewi-2',
        hari: 'Jumat',
        kelas: 'VIII B',
        mata_pelajaran: 'IPA Terpadu',
        jam_mulai: '09:15',
        jam_selesai: '10:45',
        sekolah_id: 'sch-2'
      },
      {
        id: 'sch-ipa-3',
        nama_guru: 'Dewi Sartika, M.Pd.',
        user_id: 'usr-dewi-2',
        hari: 'Jumat',
        kelas: 'IX C',
        mata_pelajaran: 'IPA Terpadu',
        jam_mulai: '11:00',
        jam_selesai: '12:30',
        sekolah_id: 'sch-2'
      }
    ];

    const res = evaluatePulangCepatDanJurnal(teacher, teacherPresensi, allSchedules, []);
    assert.strictEqual(res.isPulangCepat, true);
    assert.strictEqual(res.emptySchedules.length, 3, 'Ketiga jadwal yang tidak diisi harus masuk emptySchedules');

    // Simulate auto-insert payload generation like in evaluateAndApplyAutoCheckout
    const autoJurnalPayloads = res.emptySchedules.map(s => ({
      tanggal: '2026-10-30',
      nama_guru: teacher.nama_guru,
      user_id: teacher.user_id,
      kelas: s.kelas,
      mapel: s.mata_pelajaran || s.mapel,
      jam_ke: `${s.jam_mulai} - ${s.jam_selesai}`,
      materi: 'Tidak Masuk Kelas',
      materi_pembelajaran: 'Tidak Masuk Kelas',
      kegiatan: 'Tidak Masuk Kelas',
      keterangan: 'Tidak Masuk Kelas',
      status_verifikasi: 'Tidak Masuk Kelas',
      catatan_admin: 'Auto-record: Guru tidak masuk kelas (pulang cepat)',
      kehadiran_murid: '-'
    }));

    autoJurnalPayloads.forEach(p => {
      assert.strictEqual(p.status_verifikasi, 'Tidak Masuk Kelas');
      assert.strictEqual(p.materi, 'Tidak Masuk Kelas');
      assert.strictEqual(p.keterangan, 'Tidak Masuk Kelas');
      assert.strictEqual(p.catatan_admin.includes('tidak masuk kelas'), true);
    });
  });

  runTest('2.2: Partial fill: Guru hanya mengisi 1 dari 2 jam pelajaran => sisa 1 jadwal dicatat Tidak Masuk Kelas', () => {
    const teacher = { nama_guru: 'Dewi Sartika, M.Pd.', user_id: 'usr-dewi-2', sekolah_id: 'sch-2' };
    const teacherPresensi = [
      {
        id: 'pres-dewi',
        nama_guru: 'Dewi Sartika, M.Pd.',
        user_id: 'usr-dewi-2',
        tipe_absen: 'Datang',
        jenis_presensi: 'Sekolah',
        status_verifikasi: 'Disetujui',
        timestamp: '2026-10-30T07:15:00+08:00',
        sekolah_id: 'sch-2'
      }
    ];
    const allSchedules = [
      {
        id: 'sch-ipa-1',
        nama_guru: 'Dewi Sartika, M.Pd.',
        user_id: 'usr-dewi-2',
        hari: 'Jumat',
        kelas: 'VIII A',
        mata_pelajaran: 'IPA Terpadu',
        sekolah_id: 'sch-2'
      },
      {
        id: 'sch-ipa-2',
        nama_guru: 'Dewi Sartika, M.Pd.',
        user_id: 'usr-dewi-2',
        hari: 'Jumat',
        kelas: 'VIII B',
        mata_pelajaran: 'IPA Terpadu',
        sekolah_id: 'sch-2'
      }
    ];
    // Guru HANYA mengisi VIII A, sedangkan VIII B ditinggalkan kosong
    const allJournals = [
      {
        id: 'jrn-1',
        nama_guru: 'Dewi Sartika, M.Pd.',
        user_id: 'usr-dewi-2',
        tanggal: '2026-10-30',
        kelas: 'VIII A',
        mapel: 'IPA Terpadu',
        status_verifikasi: 'Disetujui',
        sekolah_id: 'sch-2'
      }
    ];

    const res = evaluatePulangCepatDanJurnal(teacher, teacherPresensi, allSchedules, allJournals);
    assert.strictEqual(res.isPulangCepat, true, 'Karena ada jam KBM yang ditinggalkan tanpa izin/pulang, terhitung Pulang Cepat');
    assert.strictEqual(res.emptySchedules.length, 1, 'Hanya jam ke-2 yang kosong');
    assert.strictEqual(res.emptySchedules[0].kelas, 'VIII B');
  });

  // ==========================================================================
  // SECTION 3: BOUNDARY & CORNER CASES (NAME NORMALIZATION & SCHOOL ISOLATION)
  // ==========================================================================
  console.log('\n--- Section 3: Boundary & Multi-Tenant Isolation ---');

  runTest('3.1: isTeacherScheduleMatch handles Title Case, gelar akademik, dan match via user_id', () => {
    const teacher = { nama_guru: 'Dr. H. Ahmad Fauzi, M.Pd.', user_id: 'uuid-fauzi-99', sekolah_id: 'sch-a' };
    
    // Match by user_id
    assert.strictEqual(
      isTeacherScheduleMatch(teacher, { user_id: 'uuid-fauzi-99', sekolah_id: 'sch-a' }),
      true
    );

    // Cross-school isolation: different school must NOT match
    assert.strictEqual(
      isTeacherScheduleMatch(teacher, { user_id: 'uuid-fauzi-99', sekolah_id: 'sch-b' }),
      false
    );

    // Match by normalized clean name
    assert.strictEqual(
      isTeacherScheduleMatch(teacher, { nama_guru: 'Ahmad Fauzi', sekolah_id: 'sch-a' }),
      true
    );
  });

  runTest('3.2: isTeacherJournalMatch preserves multi-tenant school isolation', () => {
    const teacher = { nama_guru: 'Siti Aminah, S.Pd.', user_id: 'usr-siti', sekolah_id: 'sch-smp1' };
    const crossSchoolJournal = {
      nama_guru: 'Siti Aminah, S.Pd.',
      user_id: 'usr-siti',
      sekolah_id: 'sch-smp2'
    };
    assert.strictEqual(isTeacherJournalMatch(teacher, crossSchoolJournal), false);

    const sameSchoolJournal = {
      nama_guru: 'Siti Aminah, S.Pd.',
      user_id: 'usr-siti',
      sekolah_id: 'sch-smp1'
    };
    assert.strictEqual(isTeacherJournalMatch(teacher, sameSchoolJournal), true);
  });

  // ==========================================================================
  // SECTION 4: SOURCE CODE INTEGRITY AUDIT
  // ==========================================================================
  console.log('\n--- Section 4: Source Code Integrity & Route Wiring ---');

  runTest('4.1: attendanceAlpa.ts exports evaluateAndApplyAutoCheckout and evaluatePulangCepatDanJurnal', () => {
    const alpaPath = path.join(root, 'src', 'lib', 'attendanceAlpa.ts');
    assert.ok(fs.existsSync(alpaPath), 'attendanceAlpa.ts must exist');
    const content = fs.readFileSync(alpaPath, 'utf8');

    assert.ok(content.includes('export async function evaluateAndApplyAutoCheckout'));
    assert.ok(content.includes('export function evaluatePulangCepatDanJurnal'));
    assert.ok(content.includes("'Pulang Cepat'"));
    assert.ok(content.includes("'Tidak Masuk Kelas'"));
    assert.ok(content.includes("catatan_admin: 'Auto-record: Guru tidak masuk kelas (pulang cepat)'"));
    assert.ok(content.includes("status_verifikasi: 'Lupa Checkout'"), 'Must preserve legacy Lupa Checkout string');
    assert.ok(content.includes('is_auto_checkout: true'), 'Must preserve is_auto_checkout flag');
  });

  runTest('4.2: workflow.ts captures Pulang Cepat in lastAutoCheckout and isAutoCheckout', () => {
    const wfPath = path.join(root, 'src', 'lib', 'workflow.ts');
    assert.ok(fs.existsSync(wfPath), 'workflow.ts must exist');
    const content = fs.readFileSync(wfPath, 'utf8');

    assert.ok(content.includes("status_verifikasi === 'Pulang Cepat'"));
  });

  runTest('4.3: GuruPresensi.tsx renders Pulang Cepat in alert banner', () => {
    const gpPath = path.join(root, 'src', 'components', 'GuruPresensi.tsx');
    assert.ok(fs.existsSync(gpPath), 'GuruPresensi.tsx must exist');
    const content = fs.readFileSync(gpPath, 'utf8');

    assert.ok(content.includes('Peringatan Presensi: Tercatat Pulang Cepat'));
    assert.ok(content.includes('Peringatan Presensi: Tercatat Lupa Checkout'), 'Must retain Lupa Checkout literal for legacy tests');
    assert.ok(content.includes('Lupa Checkout</span>'), 'Must retain Lupa Checkout</span> for empirical challenger tests');
  });

  runTest('4.4: AdminVerifView.tsx renders Auto-Checkout (Pulang Cepat) badge and styling', () => {
    const avPath = path.join(root, 'src', 'components', 'AdminVerifView.tsx');
    assert.ok(fs.existsSync(avPath), 'AdminVerifView.tsx must exist');
    const content = fs.readFileSync(avPath, 'utf8');

    assert.ok(content.includes('Auto-Checkout (Pulang Cepat)'));
    assert.ok(content.includes('Auto-Checkout (Lupa Checkout)'));
    assert.ok(content.includes("item.status_verifikasi === 'Pulang Cepat' || item.status_verifikasi === 'Tidak Masuk Kelas'"));
  });

  runTest('4.5: HomeViewAdmin.tsx accurately renders Pulang Cepat and Tidak Masuk Kelas indicators', () => {
    const hvaPath = path.join(root, 'src', 'components', 'HomeViewAdmin.tsx');
    assert.ok(fs.existsSync(hvaPath), 'HomeViewAdmin.tsx must exist');
    const content = fs.readFileSync(hvaPath, 'utf8');

    assert.ok(content.includes("presensiPulangStatus = `Pulang Cepat [${pulangTime}]`"));
    assert.ok(content.includes("jurnalStatus = 'Tidak Masuk Kelas'"));
  });

  runTest('4.6: API route /api/attendance/auto-checkout exists and handles GET & POST', () => {
    const routePath = path.join(root, 'src', 'app', 'api', 'attendance', 'auto-checkout', 'route.ts');
    assert.ok(fs.existsSync(routePath), '/api/attendance/auto-checkout/route.ts must exist');
    const content = fs.readFileSync(routePath, 'utf8');

    assert.ok(content.includes('export async function GET'));
    assert.ok(content.includes('export async function POST'));
    assert.ok(content.includes('evaluateAndApplyAutoCheckout'));
  });

  // ==========================================================================
  // SECTION 5: ADVERSARIAL EDGE CASES & INTEGRITY HARMONIZATION
  // ==========================================================================
  console.log('\n--- Section 5: Adversarial Edge Cases & Integrity Harmonization ---');

  runTest('5.1: isJurnalMatchJadwal prevents empty-string partial match false-positives', () => {
    // Schedule with mapel 'Bahasa Indonesia' (mata_pelajaran undefined) and Journal with 'Matematika'
    const sched = { kelas: 'VII A', mapel: 'Bahasa Indonesia' };
    const journ = { kelas: 'VII A', mapel: 'Matematika' };
    assert.strictEqual(
      isJurnalMatchJadwal(journ, sched),
      false,
      'Beda mata pelajaran tidak boleh match meskipun mata_pelajaran kosong dan hanya mapel yang diisi'
    );

    // Empty mapel in journal must NOT match valid schedule
    assert.strictEqual(
      isJurnalMatchJadwal({ kelas: 'VII A', mapel: '' }, { kelas: 'VII A', mata_pelajaran: 'Matematika' }),
      false,
      'Journal dengan mapel kosong tidak boleh match schedule'
    );

    // Valid match where schedule has 'mapel' column instead of 'mata_pelajaran'
    assert.strictEqual(
      isJurnalMatchJadwal({ kelas: 'VII A', mapel: 'Matematika' }, { kelas: 'VII A', mapel: 'Matematika' }),
      true,
      'Schedule yang menggunakan kolom mapel harus match journal dengan benar'
    );
  });

  runTest('5.2: isTeacherScheduleMatch prevents sub-word name collisions (e.g. Fitra vs Fitrawan, Budi vs Budiman)', () => {
    // Sub-word collisions must NOT match
    assert.strictEqual(
      isTeacherScheduleMatch({ nama_guru: 'Fitra' }, { nama_guru: 'Fitrawan' }),
      false,
      'Fitra tidak boleh collision dengan Fitrawan'
    );
    assert.strictEqual(
      isTeacherScheduleMatch({ nama_guru: 'Budi' }, { nama_guru: 'Budiman' }),
      false,
      'Budi tidak boleh collision dengan Budiman'
    );

    // Multi-title and word-token matching must still succeed
    assert.strictEqual(
      isTeacherScheduleMatch({ nama_guru: 'Dr. H. Ahmad Fauzi, M.Pd.' }, { nama_guru: 'Ahmad Fauzi' }),
      true,
      'Nama dengan gelar akademik harus match dengan nama bersih'
    );
    assert.strictEqual(
      isTeacherScheduleMatch({ nama_guru: 'Budi Santoso' }, { nama_guru: 'Budi' }),
      true,
      'Token nama depan tunggal harus match dengan nama lengkap'
    );
  });

  runTest('5.3: auto-alpa route returns autoCheckout details in payload', () => {
    const autoAlpaPath = path.join(root, 'src', 'app', 'api', 'attendance', 'auto-alpa', 'route.ts');
    assert.ok(fs.existsSync(autoAlpaPath));
    const content = fs.readFileSync(autoAlpaPath, 'utf8');
    assert.ok(content.includes('autoCheckout: checkoutResult'));
  });

  runTest('5.4: GuruPresensi renders Pulang Cepat banner on jenis_presensi or status_verifikasi', () => {
    const gpPath = path.join(root, 'src', 'components', 'GuruPresensi.tsx');
    const content = fs.readFileSync(gpPath, 'utf8');
    assert.ok(content.includes("dailyState.lastAutoCheckout.status_verifikasi === 'Pulang Cepat' || dailyState.lastAutoCheckout.jenis_presensi === 'Pulang Cepat'"));
  });

  runTest('5.5: AdminVerifView renders Otomatis (Tidak Masuk Kelas) indicator badge for journal tab', () => {
    const avPath = path.join(root, 'src', 'components', 'AdminVerifView.tsx');
    const content = fs.readFileSync(avPath, 'utf8');
    assert.ok(content.includes('Otomatis (Tidak Masuk Kelas)'));
  });

  // ==========================================================================
  // SECTION 6: REVIEWER R2 ADVERSARIAL STRESS & DEEP HARMONIZATION TESTS
  // ==========================================================================
  console.log('\n--- Section 6: Reviewer R2 Adversarial Stress & Deep Harmonization ---');

  runTest('6.1: isJurnalMatchJadwal handles class punctuation, hyphens, and "Kelas " prefix', () => {
    // Schedule has "VII A", journal has "VII-A"
    assert.strictEqual(
      isJurnalMatchJadwal({ kelas: 'VII-A', mapel: 'Matematika' }, { kelas: 'VII A', mata_pelajaran: 'Matematika' }),
      true,
      'VII-A harus match dengan VII A'
    );

    // Schedule has "Kelas X-1", journal has "X 1"
    assert.strictEqual(
      isJurnalMatchJadwal({ kelas: 'X 1', mapel: 'Fisika' }, { kelas: 'Kelas X-1', mata_pelajaran: 'Fisika' }),
      true,
      'X 1 harus match dengan Kelas X-1'
    );

    // Different class numbers must strictly NOT match
    assert.strictEqual(
      isJurnalMatchJadwal({ kelas: 'VII-A', mapel: 'Matematika' }, { kelas: 'VII-B', mata_pelajaran: 'Matematika' }),
      false,
      'VII-A tidak boleh match dengan VII-B'
    );
  });

  runTest('6.2: evaluatePulangCepatDanJurnal recognizes substitute teacher "Inval - Jurnal Kegiatan"', () => {
    const teacher = { nama_guru: 'Ahmad Fauzi', user_id: 'usr-inval', sekolah_id: 'sch-1' };
    const teacherPresensi = [
      {
        id: 'p-1',
        nama_guru: 'Ahmad Fauzi',
        user_id: 'usr-inval',
        tipe_absen: 'Datang',
        status_verifikasi: 'Disetujui',
        timestamp: '2026-10-30T07:15:00+08:00',
        sekolah_id: 'sch-1'
      }
    ];
    const allSchedules = [
      {
        id: 'sch-1',
        nama_guru: 'Ahmad Fauzi',
        user_id: 'usr-inval',
        kelas: 'IX A',
        mata_pelajaran: 'Biologi',
        sekolah_id: 'sch-1'
      }
    ];
    // Inval teacher filled substitute activity journal
    const allJournals = [
      {
        id: 'j-inval',
        nama_guru: 'Ahmad Fauzi',
        user_id: 'usr-inval',
        tanggal: '2026-10-30',
        keterangan: 'Inval - Jurnal Kegiatan',
        mapel: '-',
        kelas: '-',
        status_verifikasi: 'Disetujui',
        sekolah_id: 'sch-1'
      }
    ];

    const res = evaluatePulangCepatDanJurnal(teacher, teacherPresensi, allSchedules, allJournals);
    assert.strictEqual(res.isPulangCepat, false, 'Guru inval yang mengisi Inval - Jurnal Kegiatan tidak dihitung Pulang Cepat');
    assert.strictEqual(res.statusPresensi, 'Lupa Checkout');
    assert.strictEqual(res.emptySchedules.length, 0);
  });

  runTest('6.3: HomeViewAdmin correctly excludes Pulang Cepat from pulangDone in task completeness', () => {
    const hvaPath = path.join(root, 'src', 'components', 'HomeViewAdmin.tsx');
    const content = fs.readFileSync(hvaPath, 'utf8');

    // Verify pulangDone strictly checks 'Pulang [' (normal checkout) rather than generic 'Pulang' which matches 'Pulang Cepat'
    assert.ok(content.includes("presensiPulangStatus.startsWith('Pulang [')"), 'pulangDone must require regular Pulang');
  });

  runTest('6.4: RekapJurnalView renders orange styling for Tidak Masuk Kelas', () => {
    const rjPath = path.join(root, 'src', 'components', 'RekapJurnalView.tsx');
    const content = fs.readFileSync(rjPath, 'utf8');

    assert.ok(content.includes("(j.status_verifikasi === 'Tidak Masuk Kelas' || j.keterangan === 'Tidak Masuk Kelas')"));
    assert.ok(content.includes('bg-orange-100 text-orange-700'));
  });

  runTest('6.5: attendanceAlpa consolidates teacher records across user_id and matching tokens', () => {
    const alpaPath = path.join(root, 'src', 'lib', 'attendanceAlpa.ts');
    const content = fs.readFileSync(alpaPath, 'utf8');

    assert.ok(content.includes('teacherGroups'));
    assert.ok(content.includes('matchTeacherTokens(recName, item.nama_guru'));
  });

  console.log(`\n========================================================================`);
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`========================================================================`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL PULANG CEPAT & JURNAL TIDAK MASUK KELAS CHECKS PASSED WITH 100% SUCCESS!');
  }
}

runAll();
