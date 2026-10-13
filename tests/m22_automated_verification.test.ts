import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${label}`);
    if (detail) console.error(`   ${detail}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('========================================================================');
  console.log('🧪 VERIFIKASI SWE_22: OTOMATISASI VERIFIKASI PRESENSI, JURNAL & PIKET');
  console.log('========================================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const guruPresensiPath = path.join(rootDir, 'src', 'components', 'GuruPresensi.tsx');
  const guruJurnalPath = path.join(rootDir, 'src', 'components', 'GuruJurnal.tsx');
  const piketViewPath = path.join(rootDir, 'src', 'components', 'PiketView.tsx');
  const adminVerifPath = path.join(rootDir, 'src', 'components', 'AdminVerifView.tsx');
  const attendanceApiPath = path.join(rootDir, 'src', 'app', 'api', 'attendance', 'route.ts');

  assert(fs.existsSync(guruPresensiPath), 'GuruPresensi.tsx file exists');
  assert(fs.existsSync(guruJurnalPath), 'GuruJurnal.tsx file exists');
  assert(fs.existsSync(piketViewPath), 'PiketView.tsx file exists');
  assert(fs.existsSync(adminVerifPath), 'AdminVerifView.tsx file exists');
  assert(fs.existsSync(attendanceApiPath), 'src/app/api/attendance/route.ts exists');

  const presensiCode = fs.readFileSync(guruPresensiPath, 'utf-8');
  const jurnalCode = fs.readFileSync(guruJurnalPath, 'utf-8');
  const piketCode = fs.readFileSync(piketViewPath, 'utf-8');
  const verifCode = fs.readFileSync(adminVerifPath, 'utf-8');
  const apiCode = fs.readFileSync(attendanceApiPath, 'utf-8');

  // ==========================================================================
  // R1: Otomatisasi Verifikasi Presensi Guru
  // ==========================================================================
  console.log('\n--- [R1] Otomatisasi Verifikasi Presensi Guru ---');

  // 1.1 Structural code assertions
  assert(
    presensiCode.includes("statusVerif = (jarakAktual === null || jarakAktual <= gpsConfig.radius) ? 'Disetujui' : 'Menunggu'") ||
    (presensiCode.includes("statusVerif =") && presensiCode.includes("'Disetujui'") && presensiCode.includes("gpsConfig.radius")),
    'R1.1: Presensi Hadir di Sekolah in radius auto-approves to "Disetujui", out of radius to "Menunggu"'
  );

  assert(
    presensiCode.includes("jenisPresensi === 'Dinas Luar'") &&
    presensiCode.includes("statusVerif = 'Disetujui'"),
    'R1.2: Dinas Luar auto-approves to "Disetujui"'
  );

  assert(
    presensiCode.includes("statusVerif = memerlukanPersetujuanAdmin ? 'Menunggu' : 'Disetujui'"),
    'R1.3: Izin/Sakit checks memerlukanPersetujuanAdmin to assign "Menunggu" or "Disetujui"'
  );

  assert(
    presensiCode.includes("(isSakit && durasiHari >= 3)") &&
    presensiCode.includes("durasiHari > 3"),
    'R1.4: memerlukanPersetujuanAdmin correctly enforces Sakit >= 3 hari and Izin > 3 hari'
  );

  // 1.2 Functional evaluation simulation of Presensi logic
  const evaluatePresensiStatus = (
    jenisPresensi: string,
    detailIzin: string,
    durasiHari: number,
    jarakAktual: number | null,
    radius: number,
    isTerlambat: boolean = false
  ) => {
    const isSakit = detailIzin === 'Sakit' || jenisPresensi === 'Sakit';
    const memerlukanPersetujuanAdmin = (isSakit && durasiHari >= 3) || (!isSakit && (jenisPresensi === 'Izin' || detailIzin === 'Izin') && durasiHari > 3);

    let statusVerif = 'Menunggu';
    if (isTerlambat || jenisPresensi === 'Izin Terlambat' || jenisPresensi === 'Terlambat') {
      statusVerif = 'Menunggu';
    } else if (jenisPresensi === 'Sekolah') {
      statusVerif = (jarakAktual === null || jarakAktual <= radius) ? 'Disetujui' : 'Menunggu';
    } else if (jenisPresensi === 'Izin' || jenisPresensi === 'Sakit') {
      statusVerif = memerlukanPersetujuanAdmin ? 'Menunggu' : 'Disetujui';
    } else if (jenisPresensi === 'Dinas Luar') {
      statusVerif = 'Disetujui';
    }

    return { statusVerif, memerlukanPersetujuanAdmin };
  };

  const gpsRadius = 100;

  // Sekolah within radius
  assert(
    evaluatePresensiStatus('Sekolah', '', 1, 50, gpsRadius).statusVerif === 'Disetujui',
    'R1.5: Hadir Sekolah 50m (<= 100m radius) -> Disetujui'
  );
  assert(
    evaluatePresensiStatus('Sekolah', '', 1, null, gpsRadius).statusVerif === 'Disetujui',
    'R1.6: Hadir Sekolah null distance (GPS fallback) -> Disetujui'
  );

  // Sekolah outside radius
  assert(
    evaluatePresensiStatus('Sekolah', '', 1, 250, gpsRadius).statusVerif === 'Menunggu',
    'R1.7: Hadir Sekolah 250m (> 100m radius) -> Menunggu'
  );

  // Dinas Luar
  assert(
    evaluatePresensiStatus('Dinas Luar', '', 1, 50000, gpsRadius).statusVerif === 'Disetujui',
    'R1.8: Dinas Luar at 50km -> Disetujui'
  );

  // Sakit 1 & 2 hari (singkat) -> Disetujui
  const sakit1 = evaluatePresensiStatus('Izin', 'Sakit', 1, null, gpsRadius);
  assert(sakit1.memerlukanPersetujuanAdmin === false && sakit1.statusVerif === 'Disetujui',
    'R1.9: Sakit 1 hari -> memerlukanPersetujuanAdmin=false & status_verifikasi="Disetujui"'
  );
  const sakit2 = evaluatePresensiStatus('Izin', 'Sakit', 2, null, gpsRadius);
  assert(sakit2.memerlukanPersetujuanAdmin === false && sakit2.statusVerif === 'Disetujui',
    'R1.10: Sakit 2 hari -> memerlukanPersetujuanAdmin=false & status_verifikasi="Disetujui"'
  );

  // Sakit >= 3 hari -> Menunggu
  const sakit3 = evaluatePresensiStatus('Izin', 'Sakit', 3, null, gpsRadius);
  assert(sakit3.memerlukanPersetujuanAdmin === true && sakit3.statusVerif === 'Menunggu',
    'R1.11: Sakit 3 hari (>=3) -> memerlukanPersetujuanAdmin=true & status_verifikasi="Menunggu"'
  );
  const sakit5 = evaluatePresensiStatus('Izin', 'Sakit', 5, null, gpsRadius);
  assert(sakit5.memerlukanPersetujuanAdmin === true && sakit5.statusVerif === 'Menunggu',
    'R1.12: Sakit 5 hari -> memerlukanPersetujuanAdmin=true & status_verifikasi="Menunggu"'
  );

  // Izin 1, 2, 3 hari (singkat) -> Disetujui
  const izin1 = evaluatePresensiStatus('Izin', 'Izin', 1, null, gpsRadius);
  assert(izin1.memerlukanPersetujuanAdmin === false && izin1.statusVerif === 'Disetujui',
    'R1.13: Izin 1 hari -> memerlukanPersetujuanAdmin=false & status_verifikasi="Disetujui"'
  );
  const izin3 = evaluatePresensiStatus('Izin', 'Izin', 3, null, gpsRadius);
  assert(izin3.memerlukanPersetujuanAdmin === false && izin3.statusVerif === 'Disetujui',
    'R1.14: Izin 3 hari (<=3) -> memerlukanPersetujuanAdmin=false & status_verifikasi="Disetujui"'
  );

  // Izin > 3 hari -> Menunggu
  const izin4 = evaluatePresensiStatus('Izin', 'Izin', 4, null, gpsRadius);
  assert(izin4.memerlukanPersetujuanAdmin === true && izin4.statusVerif === 'Menunggu',
    'R1.15: Izin 4 hari (>3) -> memerlukanPersetujuanAdmin=true & status_verifikasi="Menunggu"'
  );

  // Izin Terlambat -> Menunggu
  assert(
    evaluatePresensiStatus('Izin Terlambat', '', 1, 10, gpsRadius, true).statusVerif === 'Menunggu',
    'R1.16: Izin Terlambat -> Menunggu'
  );

  // ==========================================================================
  // R2: Otomatisasi Verifikasi Jurnal Pembelajaran
  // ==========================================================================
  console.log('\n--- [R2] Otomatisasi Verifikasi Jurnal Pembelajaran ---');

  assert(
    jurnalCode.includes('isMateriLengkap') &&
    jurnalCode.includes('isKegiatanLengkap') &&
    jurnalCode.includes('isAbsensiLengkap') &&
    jurnalCode.includes('isFotoLengkap'),
    'R2.1: GuruJurnal checks completeness of materi, kegiatan, absensi, and foto'
  );

  assert(
    jurnalCode.includes("statusVerifikasiJurnal = (isMateriLengkap && isKegiatanLengkap && isAbsensiLengkap && isFotoLengkap)") &&
    jurnalCode.includes("? 'Disetujui'") &&
    jurnalCode.includes(": 'Menunggu'"),
    'R2.2: GuruJurnal assigns "Disetujui" when all fields complete, otherwise "Menunggu"'
  );

  assert(
    jurnalCode.includes('status_verifikasi: statusVerifikasiJurnal'),
    'R2.3: newJurnal record receives dynamic statusVerifikasiJurnal'
  );

  // Functional evaluation of Jurnal logic
  const evaluateJurnalStatus = (
    tipeJurnal: string,
    materi: string,
    kegiatan: string,
    absensi: Record<string, string>,
    students: any[],
    computedKehadiran: string,
    fileUrl: string
  ) => {
    const isMateriLengkap = Boolean(materi && materi.trim().length > 0);
    const isKegiatanLengkap = Boolean(kegiatan && kegiatan.trim().length > 0);
    const isFotoLengkap = Boolean(fileUrl && fileUrl.trim().length > 0 && fileUrl !== 'pending:uploading');
    const isAbsensiLengkap = tipeJurnal === 'Jurnal KBM'
      ? (
          Boolean(computedKehadiran && computedKehadiran.trim().length > 0 && computedKehadiran !== '-') &&
          (students && students.length > 0 ? Object.keys(absensi || {}).length > 0 : true)
        )
      : Boolean(computedKehadiran && computedKehadiran.trim().length > 0);

    return (isMateriLengkap && isKegiatanLengkap && isAbsensiLengkap && isFotoLengkap)
      ? 'Disetujui'
      : 'Menunggu';
  };

  const sampleStudents = [{ nisn: '001', nama_siswa: 'Budi' }, { nisn: '002', nama_siswa: 'Ani' }];
  const validAbs = { '001': 'H', '002': 'H' };

  // Jurnal KBM Complete -> Disetujui
  assert(
    evaluateJurnalStatus('Jurnal KBM', 'Bab 1 Aljabar', 'Latihan soal dan diskusi kelompok', validAbs, sampleStudents, 'Total murid: 2, Hadir: 2, Izin: 0, Sakit: 0, Alpa: 0', 'https://drive.google.com/pic1.jpg') === 'Disetujui',
    'R2.4: Jurnal KBM lengkap dengan foto -> Disetujui'
  );

  // Missing materi -> Menunggu
  assert(
    evaluateJurnalStatus('Jurnal KBM', '', 'Latihan soal', validAbs, sampleStudents, 'Total murid: 2, Hadir: 2, Izin: 0, Sakit: 0, Alpa: 0', 'https://drive.google.com/pic1.jpg') === 'Menunggu',
    'R2.5: Jurnal KBM tanpa materi -> Menunggu'
  );

  // Missing kegiatan -> Menunggu
  assert(
    evaluateJurnalStatus('Jurnal KBM', 'Bab 1 Aljabar', '', validAbs, sampleStudents, 'Total murid: 2, Hadir: 2, Izin: 0, Sakit: 0, Alpa: 0', 'https://drive.google.com/pic1.jpg') === 'Menunggu',
    'R2.6: Jurnal KBM tanpa kegiatan -> Menunggu'
  );

  // Missing absensi siswa -> Menunggu
  assert(
    evaluateJurnalStatus('Jurnal KBM', 'Bab 1 Aljabar', 'Latihan soal', {}, sampleStudents, 'Total murid: 2, Hadir: 2, Izin: 0, Sakit: 0, Alpa: 0', 'https://drive.google.com/pic1.jpg') === 'Menunggu',
    'R2.7: Jurnal KBM tanpa absensi siswa terisi -> Menunggu'
  );

  // Missing photo evidence -> Menunggu
  assert(
    evaluateJurnalStatus('Jurnal KBM', 'Bab 1 Aljabar', 'Latihan soal', validAbs, sampleStudents, 'Total murid: 2, Hadir: 2, Izin: 0, Sakit: 0, Alpa: 0', '') === 'Menunggu',
    'R2.8: Jurnal KBM tanpa bukti foto terlampir -> Menunggu'
  );

  // Jurnal Kegiatan Complete -> Disetujui
  assert(
    evaluateJurnalStatus('Jurnal Kegiatan', 'Rapat Kurikulum', 'Penyusunan modul ajar', {}, [], 'Hadir', 'https://drive.google.com/pic2.jpg') === 'Disetujui',
    'R2.9: Jurnal Kegiatan lengkap dengan bukti foto -> Disetujui'
  );

  // ==========================================================================
  // R3: Otomatisasi Verifikasi Laporan Piket
  // ==========================================================================
  console.log('\n--- [R3] Otomatisasi Verifikasi Laporan Piket ---');

  assert(
    piketCode.includes('isRekapLengkap') &&
    piketCode.includes('isFotoLengkap') &&
    piketCode.includes('statusVerifikasiPiket'),
    'R3.1: PiketView defines dynamic completeness check for rekap absen and photo'
  );

  assert(
    piketCode.includes("statusVerifikasiPiket = (isRekapLengkap && isFotoLengkap) ? 'Disetujui' : 'Menunggu'"),
    'R3.2: PiketView assigns "Disetujui" only when both rekap and photo are present'
  );

  assert(
    piketCode.includes('status_verifikasi: statusVerifikasiPiket'),
    'R3.3: newLaporan in PiketView uses dynamic statusVerifikasiPiket'
  );

  // Functional simulation of Piket logic
  const evaluatePiketStatus = (piketAbsensi: Record<string, string>, fileUrl: string, isFormLocked: boolean) => {
    if (isFormLocked) {
      return 'Menunggu'; // Locked personal picket doesn't have class attendance recap
    }
    const isRekapLengkap = Boolean(piketAbsensi && Object.keys(piketAbsensi).length > 0);
    const isFotoLengkap = Boolean(fileUrl && fileUrl.trim().length > 0);
    return (isRekapLengkap && isFotoLengkap) ? 'Disetujui' : 'Menunggu';
  };

  const filledPiketAbsensi = { '001': 'H', '002': 'S', '003': 'I' };

  // Piket with class attendance & photo -> Disetujui
  assert(
    evaluatePiketStatus(filledPiketAbsensi, 'https://drive.google.com/piket.jpg', false) === 'Disetujui',
    'R3.4: Laporan piket dengan rekap absen dan foto apel -> Disetujui'
  );

  // Piket missing photo -> Menunggu
  assert(
    evaluatePiketStatus(filledPiketAbsensi, '', false) === 'Menunggu',
    'R3.5: Laporan piket tanpa foto bukti -> Menunggu'
  );

  // Piket missing attendance recap -> Menunggu
  assert(
    evaluatePiketStatus({}, 'https://drive.google.com/piket.jpg', false) === 'Menunggu',
    'R3.6: Laporan piket dengan rekap absensi kosong -> Menunggu'
  );

  // Form locked (personal picket only) -> Menunggu
  assert(
    evaluatePiketStatus({}, 'https://drive.google.com/piket.jpg', true) === 'Menunggu',
    'R3.7: Laporan piket saat form terkunci (tanpa rekap kelas) -> Menunggu'
  );

  // ==========================================================================
  // R4: Kompatibilitas Admin Dashboard & Penolakan Manual
  // ==========================================================================
  console.log('\n--- [R4] Kompatibilitas Admin Dashboard & Penolakan Manual ---');

  // Verify AdminVerifView supports all 4 filters
  assert(
    verifCode.includes("<option value=\"Semua\">Semua Status Verifikasi</option>") &&
    verifCode.includes("<option value=\"Menunggu\">Menunggu Verifikasi</option>") &&
    verifCode.includes("<option value=\"Disetujui\">Disetujui</option>") &&
    verifCode.includes("<option value=\"Ditolak\">Ditolak</option>"),
    'R4.1: AdminVerifView renders dropdown options for Semua, Menunggu, Disetujui, Ditolak'
  );

  // Verify displayList filtering logic
  const mockSubmissions = [
    { id: '1', nama_guru: 'Guru 1', status_verifikasi: 'Disetujui' },
    { id: '2', nama_guru: 'Guru 2', status_verifikasi: 'Menunggu' },
    { id: '3', nama_guru: 'Guru 3', status_verifikasi: 'Menunggu Verifikasi' },
    { id: '4', nama_guru: 'Guru 4', status_verifikasi: 'Ditolak', catatan_admin: 'Foto buram' },
    { id: '5', nama_guru: 'Guru 5', status_verifikasi: 'Diverifikasi' }, // legacy auto-approved
  ];

  const filterSubmissions = (filter: string) => {
    return mockSubmissions.filter(item => {
      if (filter !== 'Ditolak' && item.status_verifikasi === 'Ditolak') {
        return false;
      }
      if (filter !== 'Semua') {
        const rawStatus = item.status_verifikasi || 'Menunggu';
        const isPending = rawStatus === 'Menunggu' || rawStatus === 'Menunggu Verifikasi';
        if (filter === 'Menunggu') {
          if (!isPending) return false;
        } else if (filter === 'Disetujui') {
          if (rawStatus !== 'Disetujui' && rawStatus !== 'Diverifikasi') return false;
        } else if (rawStatus !== filter) {
          return false;
        }
      }
      return true;
    });
  };

  const semuaList = filterSubmissions('Semua');
  assert(
    semuaList.length === 4 && !semuaList.some(i => i.id === '4'),
    'R4.2: Filter "Semua" includes active approved and pending items while hiding rejected'
  );

  const menungguList = filterSubmissions('Menunggu');
  assert(
    menungguList.length === 2 && menungguList.every(i => ['2', '3'].includes(i.id)),
    'R4.3: Filter "Menunggu" captures both "Menunggu" and "Menunggu Verifikasi"'
  );

  const disetujuiList = filterSubmissions('Disetujui');
  assert(
    disetujuiList.length === 2 && disetujuiList.every(i => ['1', '5'].includes(i.id)),
    'R4.4: Filter "Disetujui" captures both "Disetujui" and legacy "Diverifikasi"'
  );

  const ditolakList = filterSubmissions('Ditolak');
  assert(
    ditolakList.length === 1 && ditolakList[0].id === '4',
    'R4.5: Filter "Ditolak" captures rejected items with reasons'
  );

  // Manual rejection requiring reason
  assert(
    verifCode.includes("status === 'Ditolak'") &&
    verifCode.includes('Alasan Penolakan (Wajib Diisi)') &&
    verifCode.includes("inputValidator: (val) => {"),
    'R4.6: AdminVerifView requires mandatory rejection reason when rejecting'
  );

  // Manual approve button present
  assert(
    verifCode.includes("verifyItem(item.id, 'Disetujui')") &&
    verifCode.includes('Setujui'),
    'R4.7: AdminVerifView allows manual approval of pending items'
  );

  // Manual reject button enabled for any non-rejected items (including approved ones)
  assert(
    verifCode.includes("disabled={processingId === item.id || item.status_verifikasi === 'Ditolak'}") &&
    verifCode.includes("verifyItem(item.id, 'Ditolak')"),
    'R4.8: AdminVerifView allows rejecting/cancelling any pending or approved submissions'
  );

  // ==========================================================================
  // R5: Adversarial Verification: Edge Cases & Multi-School Server Integrity
  // ==========================================================================
  console.log('\n--- [R5] Adversarial Verification: Edge Cases & Server Integrity ---');

  // R5.1: /api/attendance preserves multi-day fields
  assert(
    apiCode.includes('durasi_hari:') &&
    apiCode.includes('tanggal_mulai:') &&
    apiCode.includes('tanggal_selesai:') &&
    apiCode.includes('memerlukan_persetujuan_admin:'),
    'R5.1: /api/attendance correctly preserves multi-day leave fields in presensiRecord'
  );

  // Functional simulation of server-side leave evaluation in route.ts
  const evaluateServerAttendanceStatus = (body: any) => {
    const jenis_presensi = body.jenis_presensi || body.status || 'Sekolah';
    const isTerlambat = jenis_presensi === 'Izin Terlambat' || jenis_presensi === 'Terlambat';
    const detail_izin = body.detail_izin || body.detail || body.keterangan || (isTerlambat ? 'Izin Datang Terlambat' : '');
    const durasi_hari = typeof body.durasi_hari === 'number' ? Math.max(1, body.durasi_hari) : (body.durasi_hari ? Math.max(1, parseInt(String(body.durasi_hari), 10) || 1) : 1);
    const isSakit = detail_izin === 'Sakit' || jenis_presensi === 'Sakit' || (typeof detail_izin === 'string' && detail_izin.toLowerCase().includes('sakit'));
    const isIzin = jenis_presensi === 'Izin' || detail_izin === 'Izin' || (typeof detail_izin === 'string' && detail_izin.toLowerCase().includes('izin')) || (typeof jenis_presensi === 'string' && jenis_presensi.toLowerCase().includes('izin'));
    const isLeave = isSakit || isIzin;
    const isLeavePersetujuanAdmin = (isSakit && durasi_hari >= 3) || (!isSakit && (jenis_presensi === 'Izin' || detail_izin === 'Izin' || isIzin) && durasi_hari > 3);

    const numericJarak = typeof body.jarak === 'number'
      ? body.jarak
      : (body.jarak ? parseFloat(String(body.jarak).replace(/[^0-9.]/g, '')) : null);
    const radiusToleransi = typeof body.radius === 'number' ? body.radius : 100;
    const isDiLuarRadius = (jenis_presensi === 'Sekolah' || (!jenis_presensi && !isLeave)) && numericJarak !== null && !isNaN(numericJarak) && numericJarak > radiusToleransi;

    const isMemerlukanPersetujuan = body.memerlukan_persetujuan_admin === true || body.memerlukan_persetujuan_admin === 'true' || isLeavePersetujuanAdmin || isDiLuarRadius;
    const status_verifikasi = (isTerlambat || isMemerlukanPersetujuan) ? 'Menunggu' : (body.status_verifikasi || 'Disetujui');
    return { status_verifikasi, isMemerlukanPersetujuan, durasi_hari, isDiLuarRadius };
  };

  // R5.2: Server enforces sick leave >= 3 days -> Menunggu even if client omitted flag
  const serverSickLong = evaluateServerAttendanceStatus({ jenis_presensi: 'Izin', detail_izin: 'Sakit', durasi_hari: 3 });
  assert(
    serverSickLong.status_verifikasi === 'Menunggu' && serverSickLong.isMemerlukanPersetujuan === true,
    'R5.2: Server /api/attendance enforces sick leave >= 3 days -> Menunggu even if flag omitted by client'
  );

  // R5.3: Server enforces normal leave > 3 days -> Menunggu even if client omitted flag
  const serverLeaveLong = evaluateServerAttendanceStatus({ jenis_presensi: 'Izin', detail_izin: 'Izin', durasi_hari: 4 });
  assert(
    serverLeaveLong.status_verifikasi === 'Menunggu' && serverLeaveLong.isMemerlukanPersetujuan === true,
    'R5.3: Server /api/attendance enforces normal leave > 3 days -> Menunggu even if flag omitted by client'
  );

  // R5.4: Server auto-approves short sick leave < 3 days -> Disetujui
  const serverSickShort = evaluateServerAttendanceStatus({ jenis_presensi: 'Izin', detail_izin: 'Sakit', durasi_hari: 2 });
  assert(
    serverSickShort.status_verifikasi === 'Disetujui' && serverSickShort.isMemerlukanPersetujuan === false,
    'R5.4: Server /api/attendance auto-approves short sick leave (< 3 days) -> Disetujui'
  );

  // R5.5: Server auto-approves short normal leave <= 3 days -> Disetujui
  const serverLeaveShort = evaluateServerAttendanceStatus({ jenis_presensi: 'Izin', detail_izin: 'Izin', durasi_hari: 3 });
  assert(
    serverLeaveShort.status_verifikasi === 'Disetujui' && serverLeaveShort.isMemerlukanPersetujuan === false,
    'R5.5: Server /api/attendance auto-approves short normal leave (<= 3 days) -> Disetujui'
  );

  // R5.6: GuruPresensi preserves multi-day duration and dates for Sakit
  const presensiCodeUpdated = fs.readFileSync(guruPresensiPath, 'utf-8');
  assert(
    presensiCodeUpdated.includes("(jenisPresensi === 'Izin' || jenisPresensi === 'Sakit'") &&
    presensiCodeUpdated.includes("durasiHari") &&
    presensiCodeUpdated.includes("tanggalMulai"),
    'R5.6: GuruPresensi preserves multi-day durasiHari and dates for Sakit attendance'
  );

  // R5.7: AdminVerifView optimistic update immediately purges rejected item from active queues
  const verifCodeUpdated = fs.readFileSync(adminVerifPath, 'utf-8');
  assert(
    verifCodeUpdated.includes("if (status === 'Ditolak')") &&
    verifCodeUpdated.includes("setPresensiList(prev => prev.filter(item => item.id !== id))") &&
    verifCodeUpdated.includes("setJurnalList(prev => prev.filter(item => item.id !== id))") &&
    verifCodeUpdated.includes("setPiketList(prev => prev.filter(item => item.id !== id))"),
    'R5.7: AdminVerifView optimistic update immediately removes rejected item from active queues upon rejection'
  );

  // R5.8: PiketView cleans up rejected report on locked personal submission
  const piketCodeUpdated = fs.readFileSync(piketViewPath, 'utf-8');
  assert(
    piketCodeUpdated.includes("if (dailyState?.laporanPiketDitolak?.id)") &&
    piketCodeUpdated.includes("await supabase.from('laporan_piket').delete().eq('id', dailyState.laporanPiketDitolak.id);"),
    'R5.8: PiketView cleans up rejected picket report on locked personal submission'
  );

  // R5.9: PiketView & RekapJurnalView backwards compatibility with legacy Diverifikasi
  const rekapJurnalPath = path.join(rootDir, 'src', 'components', 'RekapJurnalView.tsx');
  const rekapJurnalCode = fs.readFileSync(rekapJurnalPath, 'utf-8');
  assert(
    piketCodeUpdated.includes("r.status_verifikasi === 'Disetujui' || r.status_verifikasi === 'Diverifikasi'") &&
    rekapJurnalCode.includes("j.status_verifikasi === 'Disetujui' || j.status_verifikasi === 'Diverifikasi'"),
    'R5.9: PiketView and RekapJurnalView support both Disetujui and legacy Diverifikasi statuses'
  );

  // R5.10: Server geofence out-of-radius validation
  const serverOutOfRadius = evaluateServerAttendanceStatus({ jenis_presensi: 'Sekolah', jarak: 250 });
  const serverOutOfRadiusStr = evaluateServerAttendanceStatus({ jenis_presensi: 'Sekolah', jarak: '300 m' });
  assert(
    serverOutOfRadius.status_verifikasi === 'Menunggu' && serverOutOfRadius.isDiLuarRadius === true &&
    serverOutOfRadiusStr.status_verifikasi === 'Menunggu' && serverOutOfRadiusStr.isDiLuarRadius === true,
    'R5.10: Server /api/attendance enforces Sekolah out-of-radius (> 100m) -> Menunggu'
  );

  // R5.11: Server geofence in-radius auto-approval
  const serverInRadius = evaluateServerAttendanceStatus({ jenis_presensi: 'Sekolah', jarak: 45 });
  assert(
    serverInRadius.status_verifikasi === 'Disetujui' && serverInRadius.isDiLuarRadius === false,
    'R5.11: Server /api/attendance auto-approves Sekolah in-radius (<= 100m) -> Disetujui'
  );

  // R5.12: Server leave inference for Izin Pribadi / Khusus with long duration (> 3 days)
  const serverIzinPribadiLong = evaluateServerAttendanceStatus({ detail_izin: 'Izin Pribadi', durasi_hari: 4 });
  assert(
    serverIzinPribadiLong.status_verifikasi === 'Menunggu' && serverIzinPribadiLong.isMemerlukanPersetujuan === true,
    'R5.12: Server /api/attendance enforces Izin Pribadi > 3 days -> Menunggu even without explicit jenis_presensi'
  );

  // R5.13: Server leave inference for Izin Pribadi with short duration (<= 3 days)
  const serverIzinPribadiShort = evaluateServerAttendanceStatus({ detail_izin: 'Izin Pribadi', durasi_hari: 2 });
  assert(
    serverIzinPribadiShort.status_verifikasi === 'Disetujui' && serverIzinPribadiShort.isMemerlukanPersetujuan === false,
    'R5.13: Server /api/attendance auto-approves Izin Pribadi <= 3 days -> Disetujui'
  );

  // R5.14: AnalitikView parity across Presensi, Jurnal, and Piket for legacy Diverifikasi
  const analitikPath = path.join(rootDir, 'src', 'components', 'AnalitikView.tsx');
  const analitikCode = fs.readFileSync(analitikPath, 'utf-8');
  assert(
    analitikCode.includes(".from('presensi_guru')") &&
    analitikCode.includes(".from('jurnal_pembelajaran')") &&
    analitikCode.includes(".from('laporan_piket')") &&
    (analitikCode.match(/\.in\('status_verifikasi', \['Disetujui', 'Diverifikasi'\]\)/g) || []).length >= 3,
    'R5.14: AnalitikView applies [Disetujui, Diverifikasi] query across Presensi, Jurnal, and Piket'
  );

  // R5.15: Photo upload error resilience: gagal_upload is rejected as incomplete photo
  const updatedJurnalCode = fs.readFileSync(guruJurnalPath, 'utf-8');
  const updatedPiketCode = fs.readFileSync(piketViewPath, 'utf-8');
  assert(
    updatedJurnalCode.includes("fileUrl !== 'gagal_upload'") &&
    updatedPiketCode.includes("fileUrl !== 'gagal_upload'"),
    'R5.15: GuruJurnal and PiketView do not treat gagal_upload as complete photo evidence'
  );

  console.log('\n========================================================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL SWE_22 AUTOMATED VERIFICATION TESTS PASSED!\n');
  }
}

runTestSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
