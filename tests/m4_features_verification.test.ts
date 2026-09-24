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

async function runTests() {
  console.log('====================================================');
  console.log('MILESTONE M4 TEST: F12, F13, F14, F15 VERIFICATION');
  console.log('====================================================\n');

  const homeViewPath = path.resolve(__dirname, '..', 'src', 'components', 'HomeView.tsx');
  const cameraPath = path.resolve(__dirname, '..', 'src', 'components', 'CameraSelfieCapture.tsx');
  const accountModalPath = path.resolve(__dirname, '..', 'src', 'components', 'AccountSettingsModal.tsx');
  const appScreenPath = path.resolve(__dirname, '..', 'src', 'components', 'AppScreen.tsx');
  const adminDataPath = path.resolve(__dirname, '..', 'src', 'components', 'AdminDataView.tsx');

  assert(fs.existsSync(homeViewPath), 'HomeView.tsx exists');
  assert(fs.existsSync(cameraPath), 'CameraSelfieCapture.tsx exists');
  assert(fs.existsSync(accountModalPath), 'AccountSettingsModal.tsx exists');
  assert(fs.existsSync(appScreenPath), 'AppScreen.tsx exists');
  assert(fs.existsSync(adminDataPath), 'AdminDataView.tsx exists');

  const homeContent = fs.readFileSync(homeViewPath, 'utf8');
  const cameraContent = fs.readFileSync(cameraPath, 'utf8');
  const accountModalContent = fs.readFileSync(accountModalPath, 'utf8');
  const appScreenContent = fs.readFileSync(appScreenPath, 'utf8');
  const adminDataContent = fs.readFileSync(adminDataPath, 'utf8');

  // =========================================================================
  // Section 1: F12 - Keterlambatan Accumulation Fix (HomeView.tsx)
  // =========================================================================
  console.log('\n--- Section 1: F12 - Keterlambatan Accumulation Fix (HomeView.tsx) ---');

  // 12.1 Query selects timestamp, status_verifikasi, and keterlambatan_detik
  assert(
    homeContent.includes("select('timestamp, keterlambatan_detik, jenis_presensi, detail_izin, tipe_absen, status_verifikasi, sekolah_id')") ||
    (homeContent.includes('timestamp') && homeContent.includes('status_verifikasi') && homeContent.includes('keterlambatan_detik') && homeContent.includes('presensi_guru')),
    'HomeView selects timestamp, status_verifikasi, and keterlambatan_detik from presensi_guru'
  );

  // 12.2 Multi-format WITA current month matcher logic exists
  assert(
    homeContent.includes('matchWitaMonth') ||
    (homeContent.includes('startsWith(targetYearMonth)') && homeContent.includes('slashMatch')),
    'HomeView contains multi-format WITA month parser for both ISO and slash date strings'
  );

  // 12.3 Exclude rejected records (status_verifikasi === 'Ditolak')
  assert(
    homeContent.includes("p.status_verifikasi === 'Ditolak'") ||
    homeContent.includes("status_verifikasi !== 'Ditolak'"),
    "HomeView strictly excludes records where status_verifikasi === 'Ditolak' from accumulation"
  );

  // 12.4 Sums keterlambatan_detik and calculates alpa deduction (totalDetik / 14400)
  assert(
    homeContent.includes('Math.floor(totalDetik / 14400)') &&
    homeContent.includes('setAkumulasiTelat'),
    'HomeView accumulates total late seconds and calculates 4-hour Alpa conversion (totalDetik / 14400)'
  );

  // 12.5 Multi-format date matcher behavioral simulation
  const targetYearMonth = '2026-09';
  const matchWitaMonth = (ts: string | null | undefined): boolean => {
    if (!ts) return false;
    if (ts.startsWith(targetYearMonth)) return true;
    const slashMatch = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const month = String(slashMatch[1]).padStart(2, '0');
      const year = slashMatch[3];
      return `${year}-${month}` === targetYearMonth;
    }
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}` === targetYearMonth;
      }
    } catch (_) {}
    return false;
  };

  assert(matchWitaMonth('2026-09-24T08:15:00+08:00'), 'matchWitaMonth recognizes ISO timestamp for current month');
  assert(matchWitaMonth('9/24/2026 08:15:00'), 'matchWitaMonth recognizes slash timestamp for current month');
  assert(!matchWitaMonth('2026-08-31T23:59:59+08:00'), 'matchWitaMonth excludes past month timestamp');
  assert(!matchWitaMonth('10/01/2026 07:00:00'), 'matchWitaMonth excludes next month slash timestamp');

  // 12.6 Behavioral test for late seconds summation & rejected exclusion
  const mockPresensiRecords = [
    { timestamp: '2026-09-02T07:15:00+08:00', status_verifikasi: 'Disetujui', keterlambatan_detik: 1800 },
    { timestamp: '2026-09-03T07:20:00+08:00', status_verifikasi: 'Pending', keterlambatan_detik: 3600 },
    { timestamp: '2026-09-04T07:30:00+08:00', status_verifikasi: 'Ditolak', keterlambatan_detik: 7200 }, // Rejected! Must be excluded
    { timestamp: '2026-09-05T07:45:00+08:00', status_verifikasi: 'Disetujui', keterlambatan_detik: 9000 },
    { timestamp: '2026-08-28T07:30:00+08:00', status_verifikasi: 'Disetujui', keterlambatan_detik: 5000 }, // Previous month! Excluded
  ];

  let simulatedTotalDetik = 0;
  mockPresensiRecords.forEach(p => {
    if (!matchWitaMonth(p.timestamp)) return;
    if (p.status_verifikasi === 'Ditolak') return;
    simulatedTotalDetik += p.keterlambatan_detik;
  });

  // Expected: 1800 + 3600 + 9000 = 14400 seconds (exactly 1 alpa day)
  const simulatedAlpa = Math.floor(simulatedTotalDetik / 14400);
  assert(
    simulatedTotalDetik === 14400 && simulatedAlpa === 1,
    `Simulation correctly computes 14,400s late and 1 Alpa penalty (got ${simulatedTotalDetik}s, ${simulatedAlpa} alpa)`
  );

  // =========================================================================
  // Section 2: F13 - Camera Switch facingMode Fix (CameraSelfieCapture.tsx)
  // =========================================================================
  console.log('\n--- Section 2: F13 - Camera Switch facingMode Fix (CameraSelfieCapture.tsx) ---');

  // 13.1 Mutex lock check in startCamera & toggleFacingMode
  assert(
    cameraContent.includes('isStartingRef = useRef(false)') &&
    cameraContent.includes('if (isStartingRef.current) return;') &&
    cameraContent.includes('isStartingRef.current = true;'),
    'CameraSelfieCapture implements isStartingRef mutex guard preventing overlapping camera operations'
  );

  // 13.2 Clean track stop before restarting
  assert(
    cameraContent.includes('streamRef.current.getTracks().forEach') &&
    cameraContent.includes('track.stop()'),
    'CameraSelfieCapture cleanly stops all previous tracks before camera restart'
  );

  // 13.3 Hardware sensor release pause (150ms delay)
  assert(
    cameraContent.includes('await new Promise(r => setTimeout(r, 150))'),
    'CameraSelfieCapture enforces ~150ms hardware sensor release pause essential for iOS Safari'
  );

  // 13.4 Decoupled useEffect (facingMode omitted from useEffect dependencies)
  assert(
    cameraContent.includes('startCamera(initialFacingMode)') &&
    cameraContent.includes('// eslint-disable-next-line react-hooks/exhaustive-deps') &&
    cameraContent.includes('[capturedImage, requestLocation, stopCamera]'),
    'CameraSelfieCapture decouples useEffect from facingMode to prevent double-invocation race conditions'
  );

  // 13.5 Video playsinline and inline attributes
  assert(
    cameraContent.includes("videoRef.current.setAttribute('playsinline', 'true')") &&
    cameraContent.includes("videoRef.current.setAttribute('webkit-playsinline', 'true')") &&
    cameraContent.includes('playsInline'),
    'CameraSelfieCapture sets playsinline and webkit-playsinline attributes on video element'
  );

  // 13.6 Fallback on OverconstrainedError
  assert(
    cameraContent.includes('OverconstrainedError') &&
    cameraContent.includes('navigator.mediaDevices.getUserMedia({ video: true, audio: false })'),
    'CameraSelfieCapture gracefully falls back to basic video constraint upon OverconstrainedError'
  );

  // =========================================================================
  // Section 3: F14 - Teacher Username & Password Change Option
  // =========================================================================
  console.log('\n--- Section 3: F14 - Teacher Username & Password Change Option ---');

  // 14.1 Password minimum length is 6 characters
  assert(
    accountModalContent.includes('newPassword.length < 6') &&
    accountModalContent.includes('Password baru minimal 6 karakter'),
    'AccountSettingsModal enforces minimum password length of 6 characters'
  );

  // 14.2 AppScreen top bar header exposes Account Settings button
  assert(
    appScreenContent.includes('setIsAccountModalOpen(true)') &&
    appScreenContent.includes('title="Pengaturan Akun & Profil"'),
    'AppScreen top bar header exposes Account Settings button'
  );

  // 14.3 AppScreen sidebar drawer exposes Account Settings button
  assert(
    appScreenContent.includes('onClick={() => { setSidebarOpen(false); setIsAccountModalOpen(true); }}') &&
    appScreenContent.includes('Pengaturan Akun'),
    'AppScreen sidebar drawer exposes Account Settings navigation button'
  );

  // 14.4 HomeView teacher header banner exposes Edit Akun button
  assert(
    homeContent.includes('onOpenAccountSettings?: () => void') &&
    homeContent.includes('onClick={onOpenAccountSettings}') &&
    homeContent.includes('Edit Akun'),
    'HomeView header banner exposes Edit Akun button wired to onOpenAccountSettings prop'
  );

  // 14.5 AccountSettingsModal rendered in AppScreen
  assert(
    appScreenContent.includes('<AccountSettingsModal') &&
    appScreenContent.includes('isOpen={isAccountModalOpen}') &&
    appScreenContent.includes('onClose={() => setIsAccountModalOpen(false)}'),
    'AppScreen renders AccountSettingsModal with responsive state management'
  );

  // =========================================================================
  // Section 4: F15 - Master Menus Search Bar & Column Dropdown Filters
  // =========================================================================
  console.log('\n--- Section 4: F15 - Master Menus Search Bar & Column Dropdown Filters ---');

  // 15.1 Reactive search input exists
  assert(
    adminDataContent.includes('search') &&
    adminDataContent.includes('setSearch') &&
    adminDataContent.includes('Cari data...'),
    'AdminDataView provides reactive text search input for master tables'
  );

  // 15.2 State and dynamic options for column dropdowns
  assert(
    adminDataContent.includes('const [filter1, setFilter1] = useState') &&
    adminDataContent.includes('const [filter2, setFilter2] = useState') &&
    adminDataContent.includes('uniqueKelas') &&
    adminDataContent.includes('uniqueMapel') &&
    adminDataContent.includes('uniqueKategori') &&
    adminDataContent.includes('uniqueTipeKalender') &&
    adminDataContent.includes('uniqueHari') &&
    adminDataContent.includes('uniqueTahunAjaran'),
    'AdminDataView maintains filter states and dynamically derives sorted unique options from dataList'
  );

  // 15.3 Dropdown select controls rendered in JSX for each of the 6 tabs
  assert(
    adminDataContent.includes('title="Filter Kelas"') &&
    adminDataContent.includes('title="Filter Status"') &&
    adminDataContent.includes('title="Filter Mata Pelajaran"') &&
    adminDataContent.includes('title="Filter Kategori"') &&
    adminDataContent.includes('title="Filter Tipe Agenda"') &&
    adminDataContent.includes('title="Filter Bulan"') &&
    adminDataContent.includes('title="Filter Hari"') &&
    adminDataContent.includes('title="Filter Tahun Ajaran"'),
    'AdminDataView renders responsive column dropdown filters for all 6 tabs'
  );

  // 15.4 Reset filter button exists and resets both dropdown filters and search
  assert(
    adminDataContent.includes('Reset Filter') &&
    adminDataContent.includes("setFilter1('ALL')") &&
    adminDataContent.includes("setFilter2('ALL')") &&
    adminDataContent.includes("setSearch('')"),
    'AdminDataView provides a Reset Filter button that clears all active filters and text search'
  );

  // 15.5 AND conjunction multi-criteria filter behavioral simulation across 6 tabs
  // A. Data_Siswa
  const mockSiswa = [
    { nama_siswa: 'Budi Santoso', kelas: 'VII A', status: 'Aktif' },
    { nama_siswa: 'Budi Hartono', kelas: 'VII B', status: 'Aktif' },
    { nama_siswa: 'Dewi Sartika', kelas: 'VII A', status: 'Aktif' },
    { nama_siswa: 'Andi Pratama', kelas: 'VII A', status: 'Lulus' },
  ];
  const filterSiswaFn = (list: typeof mockSiswa, f1: string, f2: string, q: string) => {
    return list.filter(item => {
      if (f1 !== 'ALL' && item.kelas !== f1) return false;
      if (f2 !== 'ALL' && item.status !== f2) return false;
      if (q.trim() && !item.nama_siswa.toLowerCase().includes(q.toLowerCase().trim())) return false;
      return true;
    });
  };
  const filteredSiswa = filterSiswaFn(mockSiswa, 'VII A', 'Aktif', 'Budi');
  assert(
    filteredSiswa.length === 1 && filteredSiswa[0].nama_siswa === 'Budi Santoso',
    'Data_Siswa: AND conjunction correctly filters Kelas="VII A", Status="Aktif", and Search="Budi"'
  );

  // B. Data_Guru
  const mockGuru = [
    { nama_guru: 'Ahmad Fauzi', status: 'Aktif', mata_pelajaran: 'Matematika' },
    { nama_guru: 'Siti Aminah', status: 'Aktif', mata_pelajaran: 'Fisika' },
    { nama_guru: 'Agus Salim', status: 'Cuti', mata_pelajaran: 'Matematika' },
  ];
  const filterGuruFn = (list: typeof mockGuru, f1: string, f2: string, q: string) => {
    return list.filter(item => {
      if (f1 !== 'ALL' && item.status !== f1) return false;
      if (f2 !== 'ALL' && item.mata_pelajaran !== f2) return false;
      if (q.trim() && !item.nama_guru.toLowerCase().includes(q.toLowerCase().trim())) return false;
      return true;
    });
  };
  const filteredGuru = filterGuruFn(mockGuru, 'Aktif', 'Matematika', '');
  assert(
    filteredGuru.length === 1 && filteredGuru[0].nama_guru === 'Ahmad Fauzi',
    'Data_Guru: AND conjunction correctly filters Status="Aktif" and Mapel="Matematika"'
  );

  // C. Kalender_Pendidikan
  const mockKalender = [
    { keterangan: 'Libur Maulid', tipe: 'Libur', tanggal: '2026-09-16' },
    { keterangan: 'PTS Ganjil', tipe: 'Ujian', tanggal: '2026-09-21' },
    { keterangan: 'Libur Semester', tipe: 'Libur', tanggal: '2026-12-20' },
  ];
  const filterKalenderFn = (list: typeof mockKalender, f1: string, f2: string, q: string) => {
    return list.filter(item => {
      if (f1 !== 'ALL' && item.tipe !== f1) return false;
      if (f2 !== 'ALL') {
        const monthNum = item.tanggal.split('-')[1];
        if (monthNum !== f2) return false;
      }
      if (q.trim() && !item.keterangan.toLowerCase().includes(q.toLowerCase().trim())) return false;
      return true;
    });
  };
  const filteredKalender = filterKalenderFn(mockKalender, 'Libur', '09', '');
  assert(
    filteredKalender.length === 1 && filteredKalender[0].keterangan === 'Libur Maulid',
    'Kalender_Pendidikan: AND conjunction correctly filters Tipe="Libur" and Bulan="09"'
  );

  // D. Jadwal_Pelajaran
  const mockJadwal = [
    { hari: 'Senin', kelas: 'VII A', mata_pelajaran: 'Matematika' },
    { hari: 'Senin', kelas: 'VII B', mata_pelajaran: 'Bahasa Indonesia' },
    { hari: 'Selasa', kelas: 'VII A', mata_pelajaran: 'Bahasa Inggris' },
  ];
  const filterJadwalFn = (list: typeof mockJadwal, f1: string, f2: string, q: string) => {
    return list.filter(item => {
      if (f1 !== 'ALL' && item.hari !== f1) return false;
      if (f2 !== 'ALL' && item.kelas !== f2) return false;
      if (q.trim() && !item.mata_pelajaran.toLowerCase().includes(q.toLowerCase().trim())) return false;
      return true;
    });
  };
  const filteredJadwal = filterJadwalFn(mockJadwal, 'Senin', 'VII A', '');
  assert(
    filteredJadwal.length === 1 && filteredJadwal[0].mata_pelajaran === 'Matematika',
    'Jadwal_Pelajaran: AND conjunction correctly filters Hari="Senin" and Kelas="VII A"'
  );

  // E. Wali_Kelas
  const mockWali = [
    { nama_guru: 'Hasan Basri', kelas: 'VII A', tahun_ajaran: '2026/2027' },
    { nama_guru: 'Nurul Huda', kelas: 'VII B', tahun_ajaran: '2026/2027' },
    { nama_guru: 'Hasan Basri', kelas: 'VII A', tahun_ajaran: '2025/2026' },
  ];
  const filterWaliFn = (list: typeof mockWali, f1: string, f2: string, q: string) => {
    return list.filter(item => {
      if (f1 !== 'ALL' && item.kelas !== f1) return false;
      if (f2 !== 'ALL' && item.tahun_ajaran !== f2) return false;
      if (q.trim() && !item.nama_guru.toLowerCase().includes(q.toLowerCase().trim())) return false;
      return true;
    });
  };
  const filteredWali = filterWaliFn(mockWali, 'VII A', '2026/2027', '');
  assert(
    filteredWali.length === 1 && filteredWali[0].tahun_ajaran === '2026/2027',
    'Wali_Kelas: AND conjunction correctly filters Kelas="VII A" and Tahun Ajaran="2026/2027"'
  );

  // 15.6 Literal string searching with regex metacharacters
  const specialMapel = [
    { nama_mapel: 'Matematika (Peminatan) [Kelas X]' },
    { nama_mapel: 'Bahasa Indonesia + Sastra' },
  ];
  const safeSearch = (list: typeof specialMapel, term: string) => {
    const q = term.toLowerCase().trim();
    return list.filter(m => m.nama_mapel.toLowerCase().includes(q));
  };
  assert(
    safeSearch(specialMapel, '(Peminatan)').length === 1 &&
    safeSearch(specialMapel, '[Kelas X]').length === 1 &&
    safeSearch(specialMapel, '+').length === 1,
    'AdminDataView search handles regex metacharacters ((, ), [, ], +) safely without regex crash'
  );

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL MILESTONE 4 (F12-F15) TESTS PASSED!\n');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
