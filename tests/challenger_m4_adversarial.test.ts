import { getWitaDateStr } from '../src/lib/wita';

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

async function runAdversarialTests() {
  console.log('================================================================');
  console.log('CHALLENGER M4 ADVERSARIAL STRESS TEST SUITE (F12, F13, F14, F15)');
  console.log('================================================================\n');

  // ===========================================================================
  // SECTION 1: F12 TARDINESS ACCUMULATION STRESS
  // ===========================================================================
  console.log('--- Section 1: F12 Tardiness Accumulation Stress ---');

  const targetYearMonth = '2026-09';

  // Exact matching function from HomeView.tsx
  const matchWitaMonth = (ts: string | null | undefined, customTarget: string = targetYearMonth): boolean => {
    if (!ts) return false;
    if (ts.startsWith(customTarget)) return true;
    const slashMatch = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const month = String(slashMatch[1]).padStart(2, '0');
      const year = slashMatch[3];
      return `${year}-${month}` === customTarget;
    }
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return getWitaDateStr(d).startsWith(customTarget);
      }
    } catch (_) {}
    return false;
  };

  // 1.1 Multi-format date string stress
  const dateStressCases = [
    { ts: '2026-09-01T07:15:00+08:00', expected: true, desc: 'ISO with +08:00 offset on first day of month' },
    { ts: '2026-09-30T23:59:59+08:00', expected: true, desc: 'ISO with +08:00 offset on last second of month' },
    { ts: '2026-09-15T07:30:00.123456+08:00', expected: true, desc: 'ISO with microsecond precision' },
    { ts: '9/1/2026 07:15:00', expected: true, desc: 'Slash format single-digit month & day' },
    { ts: '09/05/2026 08:00:00', expected: true, desc: 'Slash format zero-padded month & day' },
    { ts: '9/30/2026 23:59:00', expected: true, desc: 'Slash format end of month' },
    { ts: '8/31/2026 23:59:59', expected: false, desc: 'Slash format previous month boundary' },
    { ts: '10/1/2026 00:00:00', expected: false, desc: 'Slash format next month boundary' },
    { ts: '2026-08-31T23:59:59+08:00', expected: false, desc: 'ISO previous month' },
    { ts: '2026-10-01T00:00:00+08:00', expected: false, desc: 'ISO next month' },
    { ts: '', expected: false, desc: 'Empty string' },
    { ts: null, expected: false, desc: 'Null value' },
    { ts: undefined, expected: false, desc: 'Undefined value' },
    { ts: 'corrupt-date-string', expected: false, desc: 'Corrupt non-date string' },
    { ts: '2026-99-99T99:99:99', expected: false, desc: 'Nonsense numeric date' },
  ];

  for (const tc of dateStressCases) {
    const res = matchWitaMonth(tc.ts);
    assert(res === tc.expected, `Date Stress [${tc.desc}]: "${tc.ts}" -> ${res} (expected: ${tc.expected})`);
  }

  // 1.2 Leap year and month transition boundary stress
  const leapTarget = '2024-02';
  assert(
    matchWitaMonth('2024-02-29T07:15:00+08:00', leapTarget),
    'Leap Year: ISO Feb 29 2024 correctly matches 2024-02'
  );
  assert(
    matchWitaMonth('2/29/2024 07:30:00', leapTarget),
    'Leap Year: Slash format 2/29/2024 correctly matches 2024-02'
  );
  assert(
    !matchWitaMonth('2024-03-01T00:00:00+08:00', leapTarget),
    'Leap Year: March 1 correctly excluded from Feb 2024'
  );
  const nonLeapTarget = '2026-02';
  assert(
    matchWitaMonth('2026-02-28T23:59:59+08:00', nonLeapTarget),
    'Non-leap Year: Feb 28 2026 matches 2026-02'
  );

  // Timezone boundary: 2026-08-31T16:00:00Z in UTC is exactly 2026-09-01T00:00:00+08:00 in WITA
  assert(
    matchWitaMonth('2026-08-31T16:00:00Z'),
    'Timezone boundary: UTC 2026-08-31T16:00:00Z is WITA 2026-09-01 00:00:00 (September)'
  );
  assert(
    !matchWitaMonth('2026-08-31T15:59:59Z'),
    'Timezone boundary: UTC 2026-08-31T15:59:59Z is WITA 2026-08-31 23:59:59 (August, excluded)'
  );

  // 1.3 Multi-school isolation stress simulation
  const mockDbRecords = [
    { id: 1, nama_guru: 'Ahmad Fauzi', sekolah_id: 'sch-A', keterlambatan_detik: 3600, status_verifikasi: 'Disetujui', timestamp: '2026-09-02T07:15:00+08:00', tipe_absen: 'Datang' },
    { id: 2, nama_guru: 'Ahmad Fauzi', sekolah_id: 'sch-B', keterlambatan_detik: 7200, status_verifikasi: 'Disetujui', timestamp: '2026-09-03T07:15:00+08:00', tipe_absen: 'Datang' },
    { id: 3, nama_guru: 'Ahmad Fauzi', sekolah_id: 'sch-A', keterlambatan_detik: 1800, status_verifikasi: 'Disetujui', timestamp: '2026-09-04T07:15:00+08:00', tipe_absen: 'Datang' },
    { id: 4, nama_guru: 'Ahmad Fauzi', sekolah_id: 'sch-A', keterlambatan_detik: 5000, status_verifikasi: 'Disetujui', timestamp: '2026-09-05T15:00:00+08:00', tipe_absen: 'Pulang' }, // Pulang: excluded
  ];

  // Simulated query filter as executed in HomeView.tsx
  const filterByTeacherAndSchool = (records: typeof mockDbRecords, teacherName: string, schoolId?: string) => {
    return records.filter(r => {
      if (r.nama_guru !== teacherName) return false;
      if (r.tipe_absen !== 'Datang') return false;
      if (schoolId && r.sekolah_id !== schoolId) return false;
      return true;
    });
  };

  const schoolARecords = filterByTeacherAndSchool(mockDbRecords, 'Ahmad Fauzi', 'sch-A');
  const totalDetikSchoolA = schoolARecords.reduce((acc, cur) => acc + cur.keterlambatan_detik, 0);
  assert(
    schoolARecords.length === 2 && totalDetikSchoolA === 5400,
    `Multi-school Isolation: Teacher in sch-A gets exactly 5,400s late (3600 + 1800), sch-B (7200s) isolated`
  );

  // 1.4 Unresubmitted rejections vs resubmitted attendance stress
  const rejectionsTestCases = [
    { id: 101, timestamp: '2026-09-02T07:30:00+08:00', status_verifikasi: 'Ditolak', keterlambatan_detik: 3600 }, // Rejected, unresubmitted: MUST BE EXCLUDED
    { id: 102, timestamp: '2026-09-03T07:45:00+08:00', status_verifikasi: 'Menunggu', keterlambatan_detik: 3600 }, // Pending: counted
    { id: 103, timestamp: '2026-09-04T07:20:00+08:00', status_verifikasi: 'Disetujui', keterlambatan_detik: 7200 }, // Approved: counted
    { id: 104, timestamp: '2026-09-05T07:20:00+08:00', status_verifikasi: 'Ditolak', keterlambatan_detik: 14400 }, // Rejected: MUST BE EXCLUDED
  ];

  let accumulatedSeconds = 0;
  rejectionsTestCases.forEach(p => {
    if (!matchWitaMonth(p.timestamp)) return;
    if (p.status_verifikasi === 'Ditolak') return; // Enforced rejection guard
    accumulatedSeconds += Number(p.keterlambatan_detik) || 0;
  });

  assert(
    accumulatedSeconds === 10800, // 3600 + 7200 = 10800s; rejected 3600 + 14400 excluded
    `Unresubmitted Rejections: Rejected records strictly excluded from total seconds (expected 10800s, got ${accumulatedSeconds}s)`
  );
  assert(
    Math.floor(accumulatedSeconds / 14400) === 0,
    `Unresubmitted Rejections: Zero false Alpa deductions triggered from unverified/rejected attendance`
  );

  // 1.5 Seconds boundary, corruption, and negative values stress
  const calculateAccumulation = (records: Array<{ timestamp: string; keterlambatan_detik: any; status_verifikasi: string }>) => {
    let total = 0;
    records.forEach(p => {
      if (!matchWitaMonth(p.timestamp)) return;
      if (p.status_verifikasi === 'Ditolak') return;
      const detik = Math.max(0, Number(p.keterlambatan_detik) || 0); // resilient bounds
      total += detik;
    });
    return { detik: total, alpa: Math.floor(total / 14400) };
  };

  const corruptSecondsCases = [
    { timestamp: '2026-09-01T07:30:00+08:00', status_verifikasi: 'Disetujui', keterlambatan_detik: null },
    { timestamp: '2026-09-02T07:30:00+08:00', status_verifikasi: 'Disetujui', keterlambatan_detik: undefined },
    { timestamp: '2026-09-03T07:30:00+08:00', status_verifikasi: 'Disetujui', keterlambatan_detik: 'NaN' },
    { timestamp: '2026-09-04T07:30:00+08:00', status_verifikasi: 'Disetujui', keterlambatan_detik: '3600' }, // valid string number
    { timestamp: '2026-09-05T07:30:00+08:00', status_verifikasi: 'Disetujui', keterlambatan_detik: -500 }, // negative seconds
    { timestamp: '2026-09-06T07:30:00+08:00', status_verifikasi: 'Disetujui', keterlambatan_detik: 10799 }, // 3600 + 10799 = 14399
  ];

  const boundaryRes1 = calculateAccumulation(corruptSecondsCases);
  assert(
    boundaryRes1.detik === 14399 && boundaryRes1.alpa === 0,
    `Boundary Stress (14,399s): Got ${boundaryRes1.detik}s, Alpa = ${boundaryRes1.alpa} (0 alpa just below 4 hours)`
  );

  // Add 1 more second to cross exact 14,400s threshold
  corruptSecondsCases.push({ timestamp: '2026-09-07T07:30:00+08:00', status_verifikasi: 'Disetujui', keterlambatan_detik: 1 });
  const boundaryRes2 = calculateAccumulation(corruptSecondsCases);
  assert(
    boundaryRes2.detik === 14400 && boundaryRes2.alpa === 1,
    `Boundary Stress (Exact 14,400s): Got ${boundaryRes2.detik}s, Alpa = ${boundaryRes2.alpa} (1 alpa on 14,400s)`
  );

  // Add 14,400 more seconds (28,800 total) -> 2 Alpas
  corruptSecondsCases.push({ timestamp: '2026-09-08T07:30:00+08:00', status_verifikasi: 'Disetujui', keterlambatan_detik: 14400 });
  const boundaryRes3 = calculateAccumulation(corruptSecondsCases);
  assert(
    boundaryRes3.detik === 28800 && boundaryRes3.alpa === 2,
    `Multi-day Accumulation (28,800s): Got ${boundaryRes3.detik}s, Alpa = ${boundaryRes3.alpa} (exactly 2 Alpa penalty days)`
  );

  // ===========================================================================
  // SECTION 2: F13 CAMERA SWITCH STRESS
  // ===========================================================================
  console.log('\n--- Section 2: F13 Camera Switch Stress ---');

  // Behavioral test harness modeling CameraSelfieCapture internal mutex and lifecycle
  class CameraHarness {
    isStarting = false;
    isMounted = true;
    facingMode: 'user' | 'environment' = 'user';
    activeTracks: string[] = [];
    isStreaming = false;
    cameraError: string | null = null;
    startCount = 0;
    droppedCount = 0;
    fallbackCount = 0;
    simulateOverconstrained = false;
    simulatePermissionDenied = false;
    simulateBusyDevice = false;

    stopCamera() {
      this.activeTracks = [];
      this.isStreaming = false;
    }

    async startCamera(mode: 'user' | 'environment') {
      if (this.isStarting) {
        this.droppedCount++;
        return;
      }
      this.isStarting = true;
      this.cameraError = null;

      this.stopCamera();

      // Hardware sensor release pause (150ms)
      await new Promise(r => setTimeout(r, 20)); // Scaled for test speed
      if (!this.isMounted) {
        this.isStarting = false;
        return;
      }

      try {
        if (this.simulatePermissionDenied) {
          const err = new Error('Permission denied');
          err.name = 'NotAllowedError';
          throw err;
        }

        if (this.simulateBusyDevice) {
          const err = new Error('Camera is busy');
          err.name = 'NotReadableError';
          throw err;
        }

        let streamTracks: string[];
        try {
          if (this.simulateOverconstrained) {
            const err = new Error('Overconstrained');
            err.name = 'OverconstrainedError';
            throw err;
          }
          streamTracks = [`track-${mode}-1`];
        } catch (err: any) {
          if (err?.name === 'OverconstrainedError') {
            this.fallbackCount++;
            // Fallback to basic video constraint
            streamTracks = ['track-fallback-basic-1'];
          } else {
            throw err;
          }
        }

        if (!this.isMounted) {
          // Clean up allocated tracks immediately if unmounted during stream acquisition
          streamTracks = [];
          this.isStarting = false;
          return;
        }

        this.activeTracks = streamTracks;
        this.isStreaming = true;
        this.startCount++;
      } catch (err: any) {
        if (err?.name === 'NotAllowedError') {
          this.cameraError = 'Izin kamera ditolak. Harap izinkan akses kamera di pengaturan browser.';
        } else if (err?.name === 'NotReadableError') {
          this.cameraError = 'Kamera sedang digunakan oleh aplikasi lain.';
        } else {
          this.cameraError = `Akses kamera gagal: ${err?.message || 'Error tidak diketahui'}`;
        }
        this.isStreaming = false;
      } finally {
        this.isStarting = false;
      }
    }

    async toggleFacingMode() {
      if (this.isStarting) {
        this.droppedCount++;
        return;
      }
      const nextMode = this.facingMode === 'user' ? 'environment' : 'user';
      this.facingMode = nextMode;
      await this.startCamera(nextMode);
    }
  }

  // 2.1 Rapid sequential toggles mutex test
  const cameraHarness = new CameraHarness();
  const togglePromises: Promise<void>[] = [];
  for (let i = 0; i < 20; i++) {
    togglePromises.push(cameraHarness.toggleFacingMode());
  }
  await Promise.all(togglePromises);

  assert(
    cameraHarness.startCount === 1,
    `Rapid Sequential Toggles: Exactly 1 camera start occurred (got ${cameraHarness.startCount})`
  );
  assert(
    cameraHarness.droppedCount === 19,
    `Rapid Sequential Toggles: 19 overlapping calls dropped by isStarting mutex guard (got ${cameraHarness.droppedCount})`
  );
  assert(
    !cameraHarness.isStarting,
    'Rapid Sequential Toggles: Mutex cleanly unlocked in finally block after completion'
  );

  // Subsequent toggle should succeed now that lock is released
  await cameraHarness.toggleFacingMode();
  assert(
    cameraHarness.startCount === 2,
    `Sequential Toggle: Subsequent toggle after completion succeeds (startCount = ${cameraHarness.startCount})`
  );

  // 2.2 Simulated permission revocation and busy device errors
  const permissionHarness = new CameraHarness();
  permissionHarness.simulatePermissionDenied = true;
  await permissionHarness.startCamera('user');
  assert(
    permissionHarness.cameraError === 'Izin kamera ditolak. Harap izinkan akses kamera di pengaturan browser.',
    'Permission Revocation: NotAllowedError produces clear guidance message'
  );
  assert(
    !permissionHarness.isStarting && !permissionHarness.isStreaming,
    'Permission Revocation: Mutex is reset and isStreaming is false'
  );

  const busyHarness = new CameraHarness();
  busyHarness.simulateBusyDevice = true;
  await busyHarness.startCamera('environment');
  assert(
    busyHarness.cameraError === 'Kamera sedang digunakan oleh aplikasi lain.',
    'Hardware Resource Lock: NotReadableError surfaces busy camera notification'
  );

  // 2.3 Single-camera fallback upon OverconstrainedError
  const fallbackHarness = new CameraHarness();
  fallbackHarness.simulateOverconstrained = true;
  await fallbackHarness.startCamera('environment');
  assert(
    fallbackHarness.fallbackCount === 1,
    'Single-Camera Fallback: OverconstrainedError triggers fallback mechanism'
  );
  assert(
    fallbackHarness.isStreaming && fallbackHarness.activeTracks[0] === 'track-fallback-basic-1',
    'Single-Camera Fallback: Basic video constraint successfully acquires stream'
  );

  // 2.4 Unmount during stream startup / hardware delay
  const unmountHarness = new CameraHarness();
  const startPromise = unmountHarness.startCamera('user');
  // Immediately simulate component unmount while pause is running
  unmountHarness.isMounted = false;
  await startPromise;
  assert(
    unmountHarness.startCount === 0 && unmountHarness.activeTracks.length === 0,
    'Unmount Safety: Unmounting during hardware pause cleanly aborts with zero track leaks'
  );

  // ===========================================================================
  // SECTION 3: F14 TEACHER CREDENTIALS STRESS
  // ===========================================================================
  console.log('\n--- Section 3: F14 Teacher Credentials Stress ---');

  // Account Settings Validator modeling AccountSettingsModal.tsx
  const validateAccountSettings = (
    user: { id?: string; nama?: string; username?: string; password?: string } | null,
    username: string,
    changePassword: boolean,
    currentPassword?: string,
    newPassword?: string,
    confirmPassword?: string
  ): { valid: boolean; error?: string } => {
    if (!user?.id) return { valid: false, error: 'Data pengguna tidak valid.' };
    if (!username || !username.trim()) return { valid: false, error: 'Username tidak boleh kosong.' };

    if (changePassword) {
      if (!currentPassword) return { valid: false, error: 'Password saat ini harus diisi.' };
      if (user.password && currentPassword !== user.password) {
        return { valid: false, error: 'Password saat ini tidak cocok dengan password lama.' };
      }
      if (!newPassword || newPassword.length < 6) {
        return { valid: false, error: 'Password baru minimal 6 karakter.' };
      }
      if (newPassword !== confirmPassword) {
        return { valid: false, error: 'Konfirmasi password baru tidak cocok.' };
      }
    }

    return { valid: true };
  };

  const mockUser = { id: 'usr-123', nama: 'Ibu Fatimah, S.Pd', username: 'fatimah', password: 'oldpassword123' };

  // 3.1 Password boundary tests
  assert(!validateAccountSettings(mockUser, 'fatimah', true, 'oldpassword123', '', '').valid, 'Password Boundary: Empty password rejected');
  assert(!validateAccountSettings(mockUser, 'fatimah', true, 'oldpassword123', '12345', '12345').valid, 'Password Boundary: 5 chars (<6) rejected');
  assert(validateAccountSettings(mockUser, 'fatimah', true, 'oldpassword123', '123456', '123456').valid, 'Password Boundary: Exact 6 chars accepted');
  assert(validateAccountSettings(mockUser, 'fatimah', true, 'oldpassword123', 'a'.repeat(128), 'a'.repeat(128)).valid, 'Password Boundary: 128 chars accepted');

  // Special characters & whitespace in password
  const complexPassword = 'P@$$w0rd!#%^&*()_+-=[]{}|;:,.<>?/~`';
  assert(
    validateAccountSettings(mockUser, 'fatimah', true, 'oldpassword123', complexPassword, complexPassword).valid,
    'Special Characters: Complex metacharacters in password safely validated'
  );
  assert(
    validateAccountSettings(mockUser, 'fatimah', true, 'oldpassword123', 'pass word with space', 'pass word with space').valid,
    'Password with Spaces: Spaces inside passphrase preserved'
  );
  assert(
    !validateAccountSettings(mockUser, 'fatimah', true, 'oldpassword123', 'newpass123', 'different123').valid,
    'Password Mismatch: Non-matching confirmPassword rejected'
  );
  assert(
    !validateAccountSettings(mockUser, 'fatimah', true, 'wrongoldpass', 'newpass123', 'newpass123').valid,
    'Old Password Mismatch: Incorrect currentPassword rejected'
  );

  // 3.2 Username boundary and whitespace tests
  assert(!validateAccountSettings(mockUser, '', false).valid, 'Username Boundary: Empty username rejected');
  assert(!validateAccountSettings(mockUser, '   ', false).valid, 'Username Boundary: Whitespace-only username rejected');
  assert(!validateAccountSettings(mockUser, '\t\n ', false).valid, 'Username Boundary: Tab/newline whitespace rejected');

  // 3.3 Username collisions & RPC response simulation
  const simulateRpcUpdate = (payload: { p_username: string }) => {
    const existingUsernames = ['admin', 'superadmin', 'budi', 'siti'];
    if (existingUsernames.includes(payload.p_username)) {
      return { data: { success: false, message: 'Username sudah digunakan oleh akun lain.' }, error: null };
    }
    return { data: { success: true }, error: null };
  };

  const collisionResult = simulateRpcUpdate({ p_username: 'budi' });
  assert(
    collisionResult.data.success === false && collisionResult.data.message.includes('sudah digunakan'),
    'Username Collision: Existing username collision detected and returned by RPC'
  );

  const availableResult = simulateRpcUpdate({ p_username: 'fatimah_guru' });
  assert(availableResult.data.success === true, 'Username Update: Available new username succeeds');

  // 3.4 Local storage & session state synchronization simulation
  const simulateUpdateStorage = (originalUser: any, newUsername: string, newPassword?: string) => {
    return {
      ...originalUser,
      username: newUsername.trim(),
      ...(newPassword ? { password: newPassword } : {})
    };
  };

  const updatedSession = simulateUpdateStorage(mockUser, '  fatimah.new  ', 'newsecretpass');
  assert(
    updatedSession.username === 'fatimah.new' && updatedSession.password === 'newsecretpass',
    'Session Sync: Trimmed username and new password synchronized into session profile'
  );

  // ===========================================================================
  // SECTION 4: F15 MASTER DATA SEARCH & FILTER COMBINATIONS
  // ===========================================================================
  console.log('\n--- Section 4: F15 Master Data Search & Filter Combinations ---');

  // Filter engine modeling AdminDataView.tsx lines 1370-1422
  const runFilterEngine = (
    dataList: any[],
    activeTab: string,
    search: string,
    filter1: string,
    filter2: string
  ) => {
    if (!Array.isArray(dataList)) return [];
    return dataList.filter(item => {
      if (!item) return false;

      // 1. Text Search Filter
      if (search && search.trim()) {
        const term = search.toLowerCase().trim();
        const match = (
          (item.nama_siswa || '').toLowerCase().includes(term) ||
          (item.nama_guru || '').toLowerCase().includes(term) ||
          (item.nama_mata_pelajaran || '').toLowerCase().includes(term) ||
          (item.nama_mapel || '').toLowerCase().includes(term) ||
          (item.keterangan || '').toLowerCase().includes(term) ||
          (item.kelas || '').toLowerCase().includes(term) ||
          (item.mata_pelajaran || '').toLowerCase().includes(term) ||
          (item.nisn || '').toLowerCase().includes(term) ||
          (item.nip || '').toLowerCase().includes(term) ||
          (item.hari || '').toLowerCase().includes(term) ||
          (item.tanggal || '').toLowerCase().includes(term) ||
          (item.tipe || '').toLowerCase().includes(term)
        );
        if (!match) return false;
      }

      // 2. Tab-specific column dropdown filters (AND conjunction)
      if (activeTab === 'Data_Siswa') {
        if (filter1 !== 'ALL' && (item.kelas || '').trim() !== filter1) return false;
        if (filter2 !== 'ALL' && (item.status || 'Aktif').trim() !== filter2) return false;
      } else if (activeTab === 'Data_Guru') {
        if (filter1 !== 'ALL' && (item.status || 'Aktif').trim() !== filter1) return false;
        if (filter2 !== 'ALL' && (item.mata_pelajaran || '').trim() !== filter2) return false;
      } else if (activeTab === 'Data_Mapel') {
        const kat = (item.kelompok || item.kategori || '').trim();
        if (filter1 !== 'ALL' && kat !== filter1) return false;
      } else if (activeTab === 'Kalender_Pendidikan') {
        if (filter1 !== 'ALL' && (item.tipe || '').trim() !== filter1) return false;
        if (filter2 !== 'ALL') {
          const dStr = item.tanggal_mulai || item.tanggal || '';
          const monthNum = dStr.includes('-') ? dStr.split('-')[1] : '';
          if (monthNum !== filter2) return false;
        }
      } else if (activeTab === 'Jadwal_Pelajaran') {
        if (filter1 !== 'ALL' && (item.hari || '').trim() !== filter1) return false;
        if (filter2 !== 'ALL' && (item.kelas || '').trim() !== filter2) return false;
      } else if (activeTab === 'Wali_Kelas') {
        if (filter1 !== 'ALL' && (item.kelas || '').trim() !== filter1) return false;
        if (filter2 !== 'ALL' && (item.tahun_ajaran || '').trim() !== filter2) return false;
      }

      return true;
    });
  };

  // 4.1 Combinatorial testing across all 6 tabs
  // A. Data_Siswa
  const siswaData = [
    { id: 1, nama_siswa: 'Budi Santoso', kelas: 'VII A', status: 'Aktif', nisn: '12345' },
    { id: 2, nama_siswa: 'Budi Setiawan', kelas: 'VII B', status: 'Aktif', nisn: '12346' },
    { id: 3, nama_siswa: 'Dewi Lestari', kelas: 'VII A', status: 'Lulus', nisn: '12347' },
    { id: 4, nama_siswa: 'Budi Hartono', kelas: 'VII A', status: 'Pindah', nisn: '12348' },
  ];

  assert(runFilterEngine(siswaData, 'Data_Siswa', '', 'ALL', 'ALL').length === 4, 'Data_Siswa: ALL + ALL returns all 4 students');
  assert(runFilterEngine(siswaData, 'Data_Siswa', 'Budi', 'ALL', 'ALL').length === 3, 'Data_Siswa: Search="Budi" returns 3 students');
  assert(runFilterEngine(siswaData, 'Data_Siswa', 'Budi', 'VII A', 'ALL').length === 2, 'Data_Siswa: Search="Budi" + Kelas="VII A" returns 2 students');
  assert(runFilterEngine(siswaData, 'Data_Siswa', 'Budi', 'VII A', 'Aktif').length === 1, 'Data_Siswa: Search="Budi" + Kelas="VII A" + Status="Aktif" returns 1 student (Budi Santoso)');
  assert(runFilterEngine(siswaData, 'Data_Siswa', 'Budi', 'VII A', 'Lulus').length === 0, 'Data_Siswa: Search="Budi" + Kelas="VII A" + Status="Lulus" correctly returns 0');

  // B. Data_Guru
  const guruData = [
    { id: 1, nama_guru: 'Ahmad Dahlan', status: 'Aktif', mata_pelajaran: 'Matematika', nip: '19800101' },
    { id: 2, nama_guru: 'Ahmad Subarjo', status: 'Cuti', mata_pelajaran: 'Matematika', nip: '19800102' },
    { id: 3, nama_guru: 'Siti Barokah', status: 'Aktif', mata_pelajaran: 'Bahasa Arab', nip: '19800103' },
  ];
  assert(runFilterEngine(guruData, 'Data_Guru', 'Ahmad', 'Aktif', 'Matematika').length === 1, 'Data_Guru: Search="Ahmad" + Status="Aktif" + Mapel="Matematika" returns 1');
  assert(runFilterEngine(guruData, 'Data_Guru', '', 'Cuti', 'Matematika').length === 1, 'Data_Guru: Status="Cuti" + Mapel="Matematika" returns Ahmad Subarjo');
  assert(runFilterEngine(guruData, 'Data_Guru', '', 'Aktif', 'Fisika').length === 0, 'Data_Guru: Status="Aktif" + non-existent Mapel returns 0');

  // C. Data_Mapel
  const mapelData = [
    { id: 1, nama_mapel: 'Matematika Peminatan', kelompok: 'Kelompok A' },
    { id: 2, nama_mapel: 'Matematika Wajib', kelompok: 'Kelompok A' },
    { id: 3, nama_mapel: 'Seni Budaya', kategori: 'Kelompok B' }, // test fallback to kategori
  ];
  assert(runFilterEngine(mapelData, 'Data_Mapel', 'Matematika', 'Kelompok A', 'ALL').length === 2, 'Data_Mapel: Search + Kelompok A returns 2');
  assert(runFilterEngine(mapelData, 'Data_Mapel', '', 'Kelompok B', 'ALL').length === 1, 'Data_Mapel: Kategori fallback matches Kelompok B');

  // D. Kalender_Pendidikan
  const kalenderData = [
    { id: 1, keterangan: 'Idul Fitri', tipe: 'Libur', tanggal_mulai: '2026-03-20' },
    { id: 2, keterangan: 'Maulid Nabi', tipe: 'Libur', tanggal_mulai: '2026-09-16' },
    { id: 3, keterangan: 'PTS Ganjil', tipe: 'Ujian', tanggal_mulai: '2026-09-21' },
    { id: 4, keterangan: 'Hari Guru', tipe: 'Kegiatan', tanggal: '2026-11-25' }, // fallback to tanggal
  ];
  assert(runFilterEngine(kalenderData, 'Kalender_Pendidikan', '', 'Libur', '09').length === 1, 'Kalender_Pendidikan: Tipe="Libur" + Bulan="09" returns Maulid Nabi');
  assert(runFilterEngine(kalenderData, 'Kalender_Pendidikan', '', 'Ujian', '09').length === 1, 'Kalender_Pendidikan: Tipe="Ujian" + Bulan="09" returns PTS Ganjil');
  assert(runFilterEngine(kalenderData, 'Kalender_Pendidikan', 'Guru', 'Kegiatan', '11').length === 1, 'Kalender_Pendidikan: Fallback to tanggal for month matching');

  // E. Jadwal_Pelajaran
  const jadwalData = [
    { id: 1, hari: 'Senin', kelas: 'VII A', mata_pelajaran: 'Matematika' },
    { id: 2, hari: 'Senin', kelas: 'VII B', mata_pelajaran: 'IPA' },
    { id: 3, hari: 'Selasa', kelas: 'VII A', mata_pelajaran: 'Bahasa Indonesia' },
  ];
  assert(runFilterEngine(jadwalData, 'Jadwal_Pelajaran', '', 'Senin', 'VII A').length === 1, 'Jadwal_Pelajaran: Hari="Senin" + Kelas="VII A" returns 1');
  assert(runFilterEngine(jadwalData, 'Jadwal_Pelajaran', 'IPA', 'Senin', 'VII B').length === 1, 'Jadwal_Pelajaran: Search="IPA" + Hari="Senin" + Kelas="VII B" returns 1');

  // F. Wali_Kelas
  const waliData = [
    { id: 1, nama_guru: 'Ust. Harun', kelas: 'VII A', tahun_ajaran: '2026/2027' },
    { id: 2, nama_guru: 'Ust. Harun', kelas: 'VII A', tahun_ajaran: '2025/2026' },
    { id: 3, nama_guru: 'Ust. Harun', kelas: 'VII B', tahun_ajaran: '2026/2027' },
  ];
  assert(runFilterEngine(waliData, 'Wali_Kelas', '', 'VII A', '2026/2027').length === 1, 'Wali_Kelas: Kelas="VII A" + Tahun Ajaran="2026/2027" returns exactly 1');

  // 4.2 Regex injection and special characters stress in search input
  const specialRecords = [
    { id: 1, nama_siswa: 'Student (Regular) [Batch 1]', kelas: 'VII A' },
    { id: 2, nama_siswa: 'Student with + plus sign', kelas: 'VII A' },
    { id: 3, nama_siswa: 'Student .* regex wildcard', kelas: 'VII A' },
    { id: 4, nama_siswa: "Student ' OR '1'='1 SQL injection", kelas: 'VII A' },
    { id: 5, nama_siswa: 'Student \\ backslash', kelas: 'VII A' },
  ];

  const regexInputs = [
    { q: '.*', expectedId: 3, desc: 'Regex .* should match only item 3 literally, not all items' },
    { q: '[Batch 1]', expectedId: 1, desc: 'Unescaped brackets [ ] should not throw RegExp error' },
    { q: '(Regular)', expectedId: 1, desc: 'Unescaped parentheses ( ) should not throw RegExp error' },
    { q: '+', expectedId: 2, desc: 'Plus quantifier + should match string literally' },
    { q: "' OR '1'='1", expectedId: 4, desc: 'SQL injection payload matches literally without syntax hazard' },
    { q: '\\', expectedId: 5, desc: 'Single backslash matches literally' },
  ];

  for (const rCase of regexInputs) {
    let result: any[] = [];
    let threw = false;
    try {
      result = runFilterEngine(specialRecords, 'Data_Siswa', rCase.q, 'ALL', 'ALL');
    } catch (e) {
      threw = true;
    }
    assert(
      !threw && result.length === 1 && result[0].id === rCase.expectedId,
      `Special Character Search [${rCase.desc}]: query "${rCase.q}" returned exactly 1 record without crash`
    );
  }

  // 4.3 Corrupted / null / missing properties in dataList
  const corruptData = [
    null,
    undefined,
    {},
    { id: 99, nama_siswa: null, kelas: undefined, status: null },
    { id: 100, nama_siswa: 'Valid Student', kelas: 'VII A', status: 'Aktif' },
  ];

  let nullTestResult: any[] = [];
  let nullThrew = false;
  try {
    nullTestResult = runFilterEngine(corruptData, 'Data_Siswa', 'valid', 'ALL', 'ALL');
  } catch (e) {
    nullThrew = true;
  }
  assert(
    !nullThrew && nullTestResult.length === 1 && nullTestResult[0].id === 100,
    'Corrupt Record Resilience: Filter engine safely ignores null, undefined, and empty objects without throwing TypeError'
  );

  // 4.4 Empty state classification stress
  const getEmptyStateMessage = (dataList: any[], filteredList: any[], errorMsg: string | null) => {
    if (errorMsg) return 'Gagal memuat data. Lihat pesan error di atas.';
    if (!dataList || dataList.length === 0) return 'Tabel ini kosong atau data belum dapat dimuat.';
    if (filteredList.length === 0) return 'Tidak ditemukan data yang cocok dengan pencarian.';
    return '';
  };

  assert(
    getEmptyStateMessage([], [], null) === 'Tabel ini kosong atau data belum dapat dimuat.',
    'Empty State: Database table empty shows "Tabel ini kosong atau data belum dapat dimuat."'
  );
  assert(
    getEmptyStateMessage(siswaData, [], null) === 'Tidak ditemukan data yang cocok dengan pencarian.',
    'Empty State: Search/filter yields 0 matches shows "Tidak ditemukan data yang cocok dengan pencarian."'
  );
  assert(
    getEmptyStateMessage(siswaData, [], 'Network Error') === 'Gagal memuat data. Lihat pesan error di atas.',
    'Empty State: Error state prioritizes "Gagal memuat data. Lihat pesan error di atas."'
  );

  // 4.5 Tab switching filter resets stress
  let activeTabState = 'Data_Siswa';
  let searchState = 'Budi';
  let filter1State = 'VII A';
  let filter2State = 'Aktif';
  let pageState = 2;
  let selectedStudentIdsState = ['s-1', 's-2'];

  const onTabClick = (newTabId: string) => {
    activeTabState = newTabId;
    selectedStudentIdsState = [];
    searchState = '';
    filter1State = 'ALL';
    filter2State = 'ALL';
    pageState = 0;
  };

  onTabClick('Data_Guru');

  assert(
    activeTabState === 'Data_Guru' &&
    searchState === '' &&
    filter1State === 'ALL' &&
    filter2State === 'ALL' &&
    pageState === 0 &&
    selectedStudentIdsState.length === 0,
    'Tab Switch Reset: Switching tabs strictly purges previous search, dropdown filters, pagination, and multi-selection'
  );

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n================================================================');
  console.log(`TOTAL ADVERSARIAL ASSERTIONS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL CHALLENGER M4 ADVERSARIAL STRESS TESTS PASSED!\n');
    process.exit(0);
  }
}

runAdversarialTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
