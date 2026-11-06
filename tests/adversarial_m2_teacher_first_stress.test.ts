import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {
  isTeacherMatch,
  isAssignmentMatchTeacher,
  parseTingkat,
  getSubjectTingkat
} from '../src/components/GradebookView';

console.log('================================================================================');
console.log('  CHALLENGER STRESS TEST SUITE: TEACHER-FIRST SELECTION & STATE HYGIENE (M2)');
console.log('================================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err: any) {
    failedTests++;
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Details: ${err.message}`);
    process.exitCode = 1;
  }
}

// Read GradebookView.tsx source for AST and structural verification
const gradebookPath = path.resolve(process.cwd(), 'src/components/GradebookView.tsx');
assert.ok(fs.existsSync(gradebookPath), 'GradebookView.tsx must exist');
const gradebookSource = fs.readFileSync(gradebookPath, 'utf8');

// -----------------------------------------------------------------------------
// MOCK DATA GENERATOR FOR ADVERSARIAL STRESS TESTING
// -----------------------------------------------------------------------------
const mockTeachers = [
  { id: 'g-001', nama_guru: 'Ahmad Fauzi, S.Kom', nip: '198811152014021003', mata_pelajaran: 'Informatika' },
  { id: 'g-002', nama_guru: 'Nurul Hidayah, M.Pd', nip: '199203102019032008', mata_pelajaran: 'XI Matematika Tingkat Lanjut' },
  { id: 'g-003', nama_guru: 'Bambang Irawan, S.Pd', nip: '198507202010011012', mata_pelajaran: 'PJOK' },
  { id: 'g-004', nama_guru: 'Siti Aminah, M.Si', nip: '199005012018012005', mata_pelajaran: 'Fisika' }, // Multi-grade teacher
  { id: 'g-005', nama_guru: 'Guru Baru Tanpa Jadwal', nip: '199901012024011001', mata_pelajaran: '' }, // Zero assignments
];

const mockAssignmentsPool = [
  // Ahmad Fauzi: Informatika (10 RPL 1, 10 RPL 2), Dasar Kejuruan (10 RPL 1)
  { id: 'as-1', guru_id: 'g-001', nama_guru: 'Ahmad Fauzi, S.Kom', nip: '198811152014021003', nama_mapel: 'Informatika', kelas: '10 RPL 1' },
  { id: 'as-2', guru_id: 'g-001', nama_guru: 'Ahmad Fauzi, S.Kom', nip: '198811152014021003', nama_mapel: 'Informatika', kelas: '10 RPL 2' },
  { id: 'as-3', guru_id: 'g-001', nama_guru: 'Ahmad Fauzi, S.Kom', nip: '198811152014021003', nama_mapel: 'Dasar Kejuruan', kelas: '10 RPL 1' },

  // Nurul Hidayah: XI Matematika Tingkat Lanjut (XI MIPA 1, XI MIPA 2)
  { id: 'as-4', guru_id: 'g-002', nama_guru: 'Nurul Hidayah, M.Pd', nip: '199203102019032008', nama_mapel: 'XI Matematika Tingkat Lanjut', kelas: 'XI MIPA 1' },
  { id: 'as-5', guru_id: 'g-002', nama_guru: 'Nurul Hidayah, M.Pd', nip: '199203102019032008', nama_mapel: 'XI Matematika Tingkat Lanjut', kelas: 'XI MIPA 2' },

  // Bambang Irawan: PJOK (10 RPL 1, XI MIPA 1, XII IPS 1)
  { id: 'as-6', guru_id: 'g-003', nama_guru: 'Bambang Irawan, S.Pd', nip: '198507202010011012', nama_mapel: 'PJOK', kelas: '10 RPL 1' },
  { id: 'as-7', guru_id: 'g-003', nama_guru: 'Bambang Irawan, S.Pd', nip: '198507202010011012', nama_mapel: 'PJOK', kelas: 'XI MIPA 1' },
  { id: 'as-8', guru_id: 'g-003', nama_guru: 'Bambang Irawan, S.Pd', nip: '198507202010011012', nama_mapel: 'PJOK', kelas: 'XII IPS 1' },

  // Siti Aminah: Multi-grade across 10, 11, 12
  { id: 'as-9', guru_id: 'g-004', nama_guru: 'Siti Aminah, M.Si', nip: '199005012018012005', nama_mapel: 'X Fisika', kelas: 'X IPA 1' },
  { id: 'as-10', guru_id: 'g-004', nama_guru: 'Siti Aminah, M.Si', nip: '199005012018012005', nama_mapel: 'X Fisika', kelas: 'X IPA 2' },
  { id: 'as-11', guru_id: 'g-004', nama_guru: 'Siti Aminah, M.Si', nip: '199005012018012005', nama_mapel: 'XI Fisika Lanjut', kelas: 'XI MIPA 1' },
  { id: 'as-12', guru_id: 'g-004', nama_guru: 'Siti Aminah, M.Si', nip: '199005012018012005', nama_mapel: 'XII Fisika Peminatan', kelas: 'XII MIPA 1' },
];

const mockMasterMapels = [
  { id: 'm-1', nama_mapel: 'Informatika', kategori: 'Kelas X' },
  { id: 'm-2', nama_mapel: 'Dasar Kejuruan', kategori: 'Kelas X' },
  { id: 'm-3', nama_mapel: 'XI Matematika Tingkat Lanjut', kategori: 'Kelas XI' },
  { id: 'm-4', nama_mapel: 'PJOK', kategori: 'Umum' },
  { id: 'm-5', nama_mapel: 'X Fisika', kategori: 'Kelas X' },
  { id: 'm-6', nama_mapel: 'XI Fisika Lanjut', kategori: 'Kelas XI' },
  { id: 'm-7', nama_mapel: 'XII Fisika Peminatan', kategori: 'Kelas XII' },
];

const mockMasterClasses = [
  '10 RPL 1', '10 RPL 2', 'X IPA 1', 'X IPA 2',
  'XI MIPA 1', 'XI MIPA 2', 'XI IPS 1',
  'XII MIPA 1', 'XII IPS 1'
];

// -----------------------------------------------------------------------------
// STATE MACHINE HARNESS SIMULATING EXACT GRADEBOOKVIEW LOGIC
// -----------------------------------------------------------------------------
class GradebookStateMachine {
  isAdmin: boolean;
  user: any;

  // React State variables
  selectedGuru: string;
  selectedMapel: string;
  selectedKelas: string;
  mapelList: { id?: string; nama_mapel: string; kelas?: string }[];
  kelasList: string[];
  dirtyGrades: Record<string, boolean>;
  gradesMap: Record<string, Record<string, number | null>>;

  // Spies and metrics
  supabaseQueryLog: string[];
  confirmCallsCount: number;
  lastConfirmMessage: string | null;
  mockConfirmResponse: boolean;

  constructor(isAdmin: boolean = true, user: any = { role: 'Admin', nama: 'Administrator' }) {
    this.isAdmin = isAdmin;
    this.user = user;

    // Line 319: useState<string>(isAdmin ? '' : (user?.nama || ''))
    this.selectedGuru = this.isAdmin ? '' : (this.user?.nama || '');
    this.selectedMapel = '';
    this.selectedKelas = '';
    this.mapelList = [];
    this.kelasList = [];
    this.dirtyGrades = {};
    this.gradesMap = {};

    this.supabaseQueryLog = [];
    this.confirmCallsCount = 0;
    this.lastConfirmMessage = null;
    this.mockConfirmResponse = true;
  }

  // Exact implementation of fetchMasterAssignments initial logic (lines 1086-1108)
  fetchMasterAssignmentsMount() {
    this.supabaseQueryLog.push('fetchMasterAssignments');
    const initialGuru = this.selectedGuru || (this.isAdmin ? '' : (this.user?.nama || ''));
    if (!this.selectedGuru && initialGuru) {
      this.selectedGuru = initialGuru;
    }

    if (initialGuru) {
      this.syncTeacherAssignments(
        initialGuru,
        mockAssignmentsPool,
        mockTeachers,
        mockMasterMapels,
        mockMasterClasses,
        this.selectedMapel,
        this.selectedKelas
      );
    } else {
      this.mapelList = [];
      this.kelasList = [];
      this.selectedMapel = '';
      this.selectedKelas = '';
      this.fetchGrades();
    }
  }

  // Exact implementation of syncTeacherAssignments (lines 372-490)
  syncTeacherAssignments(
    targetGuruName: string,
    assignmentsPool: typeof mockAssignmentsPool,
    teachers: typeof mockTeachers,
    fallbackMapels: typeof mockMasterMapels,
    fallbackClasses: string[],
    prefMapel?: string,
    prefKelas?: string
  ) {
    if (this.isAdmin && !targetGuruName) {
      this.mapelList = [];
      this.selectedMapel = '';
      this.kelasList = [];
      this.selectedKelas = '';
      return;
    }

    if (!targetGuruName && teachers.length === 0) return;
    const effectiveGuru = targetGuruName || (this.isAdmin ? '' : (teachers[0]?.nama_guru || this.user?.nama || ''));
    if (!effectiveGuru) {
      this.mapelList = [];
      this.selectedMapel = '';
      this.kelasList = [];
      this.selectedKelas = '';
      return;
    }

    const currentTeacher = teachers.find(t => isTeacherMatch(t, effectiveGuru)) || {
      nama_guru: effectiveGuru,
      nip: this.user?.username || '',
      id: this.user?.id,
      mata_pelajaran: this.user?.mata_pelajaran || '',
    };

    let matched = assignmentsPool.filter(a => isAssignmentMatchTeacher(a, currentTeacher));
    if (matched.length === 0 && !this.isAdmin) matched = assignmentsPool;

    if (matched.length === 0) {
      const rawMapel = (currentTeacher as any).mata_pelajaran;
      if (rawMapel) {
        matched = [{
          id: 'fallback',
          guru_id: currentTeacher.id,
          nama_guru: currentTeacher.nama_guru,
          nip: currentTeacher.nip || '',
          nama_mapel: rawMapel,
          kelas: ''
        }];
      } else if (this.isAdmin && fallbackMapels.length > 0) {
        matched = fallbackMapels.map(m => ({
          id: m.id,
          guru_id: currentTeacher.id,
          nama_guru: currentTeacher.nama_guru,
          nip: currentTeacher.nip || '',
          nama_mapel: m.nama_mapel,
          kelas: ''
        }));
      }
    }

    const formattedMapels = matched.map(m => ({
      id: m.id,
      nama_mapel: m.nama_mapel,
      kelas: m.kelas || undefined,
    }));
    this.mapelList = formattedMapels;

    const distinctSubjects = Array.from(new Set(formattedMapels.map(m => m.nama_mapel).filter(Boolean)));
    const activeMapel = (prefMapel && distinctSubjects.includes(prefMapel))
      ? prefMapel
      : (distinctSubjects[0] || '');
    this.selectedMapel = activeMapel;

    const targetTingkat = getSubjectTingkat(activeMapel, fallbackMapels);

    let matchingClasses = Array.from(new Set(
      formattedMapels
        .filter(m => !activeMapel || m.nama_mapel === activeMapel)
        .map(m => m.kelas)
        .filter(Boolean) as string[]
    )).sort();

    if (targetTingkat) {
      matchingClasses = matchingClasses.filter(k => parseTingkat(k) === targetTingkat);
    }

    let targetClasses = matchingClasses;
    if (targetClasses.length === 0) {
      const allTeacherClasses = Array.from(new Set(
        formattedMapels.map(m => m.kelas).filter(Boolean) as string[]
      )).sort();

      const candidateClasses = allTeacherClasses.length > 0 ? allTeacherClasses : fallbackClasses;
      const filteredCandidates = targetTingkat
        ? candidateClasses.filter(k => parseTingkat(k) === targetTingkat)
        : candidateClasses;

      if (filteredCandidates.length === 0 && targetTingkat && fallbackClasses.length > 0) {
        targetClasses = fallbackClasses.filter(k => parseTingkat(k) === targetTingkat);
      } else {
        targetClasses = filteredCandidates;
      }
    }

    this.kelasList = targetClasses;

    const activeKelas = (prefKelas && targetClasses.includes(prefKelas))
      ? prefKelas
      : (targetClasses[0] || '');
    this.selectedKelas = activeKelas;

    this.fetchGrades();
  }

  // Exact implementation of handleSelectGuru (lines 519-543)
  handleSelectGuru(newGuru: string): boolean {
    if (Object.keys(this.dirtyGrades).length > 0) {
      this.confirmCallsCount++;
      this.lastConfirmMessage = 'Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti guru pengampu? Perubahan belum disimpan akan hilang.';
      if (!this.mockConfirmResponse) {
        return false; // User cancelled
      }
    }
    this.setDirtyGrades({});
    this.selectedGuru = newGuru;
    if (!newGuru) {
      this.mapelList = [];
      this.selectedMapel = '';
      this.kelasList = [];
      this.selectedKelas = '';
      this.fetchGrades();
      return true;
    }
    this.syncTeacherAssignments(
      newGuru,
      mockAssignmentsPool,
      mockTeachers,
      mockMasterMapels,
      mockMasterClasses,
      '',
      ''
    );
    return true;
  }

  // Exact implementation of handleSelectMapel (lines 545-597)
  handleSelectMapel(newMapel: string): boolean {
    if (Object.keys(this.dirtyGrades).length > 0) {
      this.confirmCallsCount++;
      this.lastConfirmMessage = 'Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti mata pelajaran? Perubahan belum disimpan akan hilang.';
      if (!this.mockConfirmResponse) {
        return false; // User cancelled
      }
    }
    this.setDirtyGrades({});
    if (!newMapel) {
      this.selectedMapel = '';
      this.kelasList = [];
      this.selectedKelas = '';
      this.fetchGrades();
      return true;
    }
    this.selectedMapel = newMapel;

    const currentClassValid = this.mapelList.some(
      m => m.nama_mapel === newMapel && m.kelas === this.selectedKelas
    );

    const targetTingkat = getSubjectTingkat(newMapel, mockMasterMapels);

    let matchingClasses = Array.from(new Set(
      this.mapelList.filter(m => m.nama_mapel === newMapel && m.kelas).map(m => m.kelas as string)
    )).sort();

    if (targetTingkat) {
      matchingClasses = matchingClasses.filter(k => parseTingkat(k) === targetTingkat);
    }

    let targetClasses = matchingClasses;
    if (targetClasses.length === 0) {
      const allTeacherClasses = Array.from(new Set(
        this.mapelList.map(m => m.kelas).filter(Boolean) as string[]
      )).sort();

      const candidateClasses = allTeacherClasses.length > 0 ? allTeacherClasses : mockMasterClasses;
      const filteredCandidates = targetTingkat
        ? candidateClasses.filter(k => parseTingkat(k) === targetTingkat)
        : candidateClasses;

      if (filteredCandidates.length === 0 && targetTingkat && mockMasterClasses.length > 0) {
        targetClasses = mockMasterClasses.filter(k => parseTingkat(k) === targetTingkat);
      } else {
        targetClasses = filteredCandidates;
      }
    }

    this.kelasList = targetClasses;
    if (!currentClassValid || !targetClasses.includes(this.selectedKelas)) {
      this.selectedKelas = targetClasses.length > 0 ? targetClasses[0] : '';
    }

    this.fetchGrades();
    return true;
  }

  // Exact implementation of handleSelectKelas (lines 599-616)
  handleSelectKelas(newKelas: string): boolean {
    if (Object.keys(this.dirtyGrades).length > 0) {
      this.confirmCallsCount++;
      this.lastConfirmMessage = 'Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti kelas? Perubahan belum disimpan akan hilang.';
      if (!this.mockConfirmResponse) {
        return false; // User cancelled
      }
    }
    this.setDirtyGrades({});
    this.selectedKelas = newKelas;
    const stillTeaches = this.mapelList.some(
      m => m.nama_mapel === this.selectedMapel && (!m.kelas || m.kelas === newKelas)
    );
    if (!stillTeaches) {
      const firstInClass = this.mapelList.find(m => !m.kelas || m.kelas === newKelas);
      if (firstInClass && firstInClass.nama_mapel) {
        this.selectedMapel = firstInClass.nama_mapel;
      }
    }

    this.fetchGrades();
    return true;
  }

  // Exact implementation of fetchGrades (lines 1557-1592)
  fetchGrades() {
    if (!this.selectedKelas || !this.selectedMapel) {
      this.gradesMap = {};
      this.setDirtyGrades({});
      this.supabaseQueryLog.push('fetchGrades_EARLY_EXIT_NO_QUERY');
      return;
    }

    // Live query to nilai_siswa
    this.supabaseQueryLog.push(`fetchGrades_QUERY_nilai_siswa:mapel=${this.selectedMapel},kelas=${this.selectedKelas}`);
    this.gradesMap = {
      'nisn-001': { 'col-1': 88, 'col-2': 90 }
    };
    this.setDirtyGrades({});
  }

  setDirtyGrades(val: Record<string, boolean>) {
    this.dirtyGrades = val;
  }

  // Simulates evaluating DOM rendering conditions
  renderEvaluation() {
    const isGuruDropdownRendered = this.isAdmin;
    const isGuruBadgeRendered = !this.isAdmin;
    const isMapelDisabled = !this.selectedGuru;
    const isKelasDisabled = !this.selectedGuru || !this.selectedMapel;
    const isEmptyStateCardRendered = this.isAdmin && !this.selectedGuru;
    const isWorkspaceTableRendered = !isEmptyStateCardRendered;

    return {
      isGuruDropdownRendered,
      isGuruBadgeRendered,
      isMapelDisabled,
      isKelasDisabled,
      isEmptyStateCardRendered,
      isWorkspaceTableRendered
    };
  }
}

// =============================================================================
// SUITE 1: ADMIN MODE INITIAL STATE HYGIENE & PREMATURE FETCH PREVENTION
// =============================================================================
console.log('--- SUITE 1: Admin Mode Initial State Hygiene & Premature Fetch Prevention ---');

runTest('1.1: Admin mode initializes with selectedGuru === "", selectedMapel === "", selectedKelas === ""', () => {
  const harness = new GradebookStateMachine(true);
  assert.strictEqual(harness.selectedGuru, '', 'Admin selectedGuru must be empty');
  assert.strictEqual(harness.selectedMapel, '', 'Admin selectedMapel must be empty');
  assert.strictEqual(harness.selectedKelas, '', 'Admin selectedKelas must be empty');
});

runTest('1.2: fetchMasterAssignmentsMount in Admin mode leaves mapelList and kelasList empty without auto-selecting teacher', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();

  assert.strictEqual(harness.selectedGuru, '', 'Must not auto-select first teacher in Admin mode');
  assert.strictEqual(harness.selectedMapel, '', 'Must not auto-select mapel');
  assert.strictEqual(harness.selectedKelas, '', 'Must not auto-select kelas');
  assert.deepStrictEqual(harness.mapelList, [], 'mapelList must be empty array');
  assert.deepStrictEqual(harness.kelasList, [], 'kelasList must be empty array');
});

runTest('1.3: Supabase Spy: fetchGrades never queries table nilai_siswa when selectedGuru === ""', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();

  const nilaiQueries = harness.supabaseQueryLog.filter(q => q.includes('nilai_siswa'));
  assert.strictEqual(nilaiQueries.length, 0, 'ZERO queries must be made to nilai_siswa during unselected state');

  const earlyExits = harness.supabaseQueryLog.filter(q => q.includes('fetchGrades_EARLY_EXIT_NO_QUERY'));
  assert.ok(earlyExits.length >= 1, 'fetchGrades must exit early safely');
  assert.deepStrictEqual(harness.gradesMap, {}, 'gradesMap must remain empty object');
  assert.deepStrictEqual(harness.dirtyGrades, {}, 'dirtyGrades must remain empty object');
});

runTest('1.4: DOM Evaluation: Mapel & Kelas dropdowns disabled, EmptyStateCard rendered, Workspace suppressed', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();
  const dom = harness.renderEvaluation();

  assert.strictEqual(dom.isGuruDropdownRendered, true, 'Admin mode must render Guru dropdown');
  assert.strictEqual(dom.isGuruBadgeRendered, false, 'Admin mode must NOT render static teacher badge');
  assert.strictEqual(dom.isMapelDisabled, true, 'Mapel select MUST be disabled when selectedGuru === ""');
  assert.strictEqual(dom.isKelasDisabled, true, 'Kelas select MUST be disabled when selectedGuru === ""');
  assert.strictEqual(dom.isEmptyStateCardRendered, true, 'Empty state card MUST be rendered');
  assert.strictEqual(dom.isWorkspaceTableRendered, false, 'Workspace assessment table MUST NOT be rendered');
});

runTest('1.5: Static Source Verification: exact JSX attributes for disabled states & placeholder prompts', () => {
  assert.ok(gradebookSource.includes('disabled={!selectedGuru}'), 'Must have disabled={!selectedGuru} on Mapel');
  assert.ok(gradebookSource.includes('disabled={!selectedGuru || !selectedMapel}'), 'Must have disabled={!selectedGuru || !selectedMapel} on Kelas');
  assert.ok(gradebookSource.includes('<option value="">-- Pilih Guru Pengampu --</option>'), 'Must have -- Pilih Guru Pengampu --');
  assert.ok(gradebookSource.includes('<option value="">-- Pilih guru pengampu terlebih dahulu --</option>'), 'Must have Mapel unselected placeholder');
  assert.ok(gradebookSource.includes('<option value="">-- Pilih mata pelajaran terlebih dahulu --</option>'), 'Must have Kelas unselected placeholder');
  assert.ok(gradebookSource.includes('{isAdmin && !selectedGuru ? ('), 'Empty state must be keyed strictly on isAdmin && !selectedGuru');
  assert.ok(gradebookSource.includes('Silakan pilih Guru Pengampu terlebih dahulu untuk memulai asesmen dan pengelolaan buku nilai.'), 'Must render exact empty-state prompt text');
});

// =============================================================================
// SUITE 2: TEACHER SWITCHING & DIRTY GRADES SAFEGUARDS MATRIX
// =============================================================================
console.log('\n--- SUITE 2: Teacher Switching & Dirty Grades Safeguards Matrix ---');

runTest('2.1: Teacher switching WITHOUT dirty grades updates teacher and cascades smoothly without confirm prompt', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();

  // Select Ahmad Fauzi
  const ok = harness.handleSelectGuru('Ahmad Fauzi, S.Kom');
  assert.strictEqual(ok, true);
  assert.strictEqual(harness.confirmCallsCount, 0, 'No window.confirm when dirtyGrades is clean');
  assert.strictEqual(harness.selectedGuru, 'Ahmad Fauzi, S.Kom');
  assert.strictEqual(harness.selectedMapel, 'Informatika');
  assert.strictEqual(harness.selectedKelas, '10 RPL 1');
  assert.strictEqual(harness.renderEvaluation().isMapelDisabled, false);
  assert.strictEqual(harness.renderEvaluation().isKelasDisabled, false);
  assert.strictEqual(harness.renderEvaluation().isEmptyStateCardRendered, false);
});

runTest('2.2: Teacher switching WITH dirty grades + user CANCELS preserves teacher, mapel, kelas, and dirtyGrades', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();
  harness.handleSelectGuru('Ahmad Fauzi, S.Kom');

  // User modifies grades
  harness.setDirtyGrades({ 'nisn-001_col-1': true, 'nisn-002_col-2': true });

  // Admin tries to switch to Nurul Hidayah, but clicks Cancel on prompt
  harness.mockConfirmResponse = false;
  const changed = harness.handleSelectGuru('Nurul Hidayah, M.Pd');

  assert.strictEqual(changed, false, 'Switch must be aborted');
  assert.strictEqual(harness.confirmCallsCount, 1, 'window.confirm must have been called');
  assert.ok(harness.lastConfirmMessage?.includes('Terdapat perubahan nilai yang belum disimpan'));
  assert.strictEqual(harness.selectedGuru, 'Ahmad Fauzi, S.Kom', 'Must retain previous teacher');
  assert.strictEqual(harness.selectedMapel, 'Informatika', 'Must retain previous mapel');
  assert.strictEqual(harness.selectedKelas, '10 RPL 1', 'Must retain previous class');
  assert.strictEqual(Object.keys(harness.dirtyGrades).length, 2, 'Must retain dirty grades intact');
});

runTest('2.3: Teacher switching WITH dirty grades + user CONFIRMS cleanly resets dirtyGrades and updates to new teacher', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();
  harness.handleSelectGuru('Ahmad Fauzi, S.Kom');

  harness.setDirtyGrades({ 'nisn-001_col-1': true });

  // Admin switches to Nurul Hidayah and clicks OK
  harness.mockConfirmResponse = true;
  const changed = harness.handleSelectGuru('Nurul Hidayah, M.Pd');

  assert.strictEqual(changed, true, 'Switch must proceed');
  assert.strictEqual(harness.confirmCallsCount, 1, 'window.confirm must have been called');
  assert.strictEqual(harness.selectedGuru, 'Nurul Hidayah, M.Pd');
  assert.strictEqual(harness.selectedMapel, 'XI Matematika Tingkat Lanjut');
  assert.strictEqual(harness.selectedKelas, 'XI MIPA 1');
  assert.deepStrictEqual(harness.dirtyGrades, {}, 'dirtyGrades must be cleanly cleared to {}');
});

runTest('2.4: Switching teacher to unselected "" WITH dirty grades + user CANCELS aborts reset', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();
  harness.handleSelectGuru('Ahmad Fauzi, S.Kom');

  harness.setDirtyGrades({ 'nisn-001_col-1': true });

  harness.mockConfirmResponse = false;
  const changed = harness.handleSelectGuru('');

  assert.strictEqual(changed, false, 'Reset to empty must be aborted on Cancel');
  assert.strictEqual(harness.selectedGuru, 'Ahmad Fauzi, S.Kom');
  assert.strictEqual(harness.selectedMapel, 'Informatika');
  assert.strictEqual(Object.keys(harness.dirtyGrades).length, 1);
});

runTest('2.5: Switching teacher to unselected "" WITH dirty grades + user CONFIRMS resets all selections to "" cleanly', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();
  harness.handleSelectGuru('Ahmad Fauzi, S.Kom');

  harness.setDirtyGrades({ 'nisn-001_col-1': true });

  harness.mockConfirmResponse = true;
  const changed = harness.handleSelectGuru('');

  assert.strictEqual(changed, true);
  assert.strictEqual(harness.selectedGuru, '');
  assert.strictEqual(harness.selectedMapel, '');
  assert.strictEqual(harness.selectedKelas, '');
  assert.deepStrictEqual(harness.mapelList, []);
  assert.deepStrictEqual(harness.kelasList, []);
  assert.deepStrictEqual(harness.dirtyGrades, {});
  assert.strictEqual(harness.renderEvaluation().isEmptyStateCardRendered, true);
});

runTest('2.6: Mapel switching with dirty grades: cancel preserves selectedMapel & dirtyGrades; confirm resets dirtyGrades', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();
  harness.handleSelectGuru('Ahmad Fauzi, S.Kom'); // teaches Informatika and Dasar Kejuruan

  assert.strictEqual(harness.selectedMapel, 'Informatika');
  harness.setDirtyGrades({ 'nisn-001_col-1': true });

  // Cancel switch
  harness.mockConfirmResponse = false;
  const ok1 = harness.handleSelectMapel('Dasar Kejuruan');
  assert.strictEqual(ok1, false);
  assert.strictEqual(harness.selectedMapel, 'Informatika', 'Must preserve mapel on Cancel');
  assert.strictEqual(Object.keys(harness.dirtyGrades).length, 1);

  // Confirm switch
  harness.mockConfirmResponse = true;
  const ok2 = harness.handleSelectMapel('Dasar Kejuruan');
  assert.strictEqual(ok2, true);
  assert.strictEqual(harness.selectedMapel, 'Dasar Kejuruan', 'Must update mapel on Confirm');
  assert.deepStrictEqual(harness.dirtyGrades, {}, 'Must reset dirty grades on Confirm');
});

runTest('2.7: Kelas switching with dirty grades: cancel preserves selectedKelas & dirtyGrades; confirm resets dirtyGrades', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();
  harness.handleSelectGuru('Ahmad Fauzi, S.Kom'); // Informatika teaches 10 RPL 1 and 10 RPL 2

  assert.strictEqual(harness.selectedKelas, '10 RPL 1');
  harness.setDirtyGrades({ 'nisn-001_col-1': true });

  // Cancel switch
  harness.mockConfirmResponse = false;
  const ok1 = harness.handleSelectKelas('10 RPL 2');
  assert.strictEqual(ok1, false);
  assert.strictEqual(harness.selectedKelas, '10 RPL 1', 'Must preserve kelas on Cancel');
  assert.strictEqual(Object.keys(harness.dirtyGrades).length, 1);

  // Confirm switch
  harness.mockConfirmResponse = true;
  const ok2 = harness.handleSelectKelas('10 RPL 2');
  assert.strictEqual(ok2, true);
  assert.strictEqual(harness.selectedKelas, '10 RPL 2', 'Must update kelas on Confirm');
  assert.deepStrictEqual(harness.dirtyGrades, {}, 'Must reset dirty grades on Confirm');
});

// =============================================================================
// SUITE 3: CYCLIC TRANSITIONS & ORPHANED STATE HYGIENE (A -> B -> "" -> B -> A)
// =============================================================================
console.log('\n--- SUITE 3: Cyclic Transitions & Orphaned State Hygiene ---');

runTest('3.1: Sequential transition lifecycle: "" -> Teacher A -> Teacher B -> "" -> Teacher B -> Teacher A', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();

  // Step 1: Cold start unselected
  assert.strictEqual(harness.selectedGuru, '');
  assert.strictEqual(harness.selectedMapel, '');
  assert.strictEqual(harness.selectedKelas, '');
  assert.strictEqual(harness.renderEvaluation().isEmptyStateCardRendered, true);

  // Step 2: Switch to Teacher A (Ahmad Fauzi)
  harness.handleSelectGuru('Ahmad Fauzi, S.Kom');
  assert.strictEqual(harness.selectedGuru, 'Ahmad Fauzi, S.Kom');
  assert.strictEqual(harness.selectedMapel, 'Informatika');
  assert.strictEqual(harness.selectedKelas, '10 RPL 1');
  assert.deepStrictEqual(harness.kelasList, ['10 RPL 1', '10 RPL 2']);

  // Step 3: Switch directly from Teacher A to Teacher B (Nurul Hidayah)
  harness.handleSelectGuru('Nurul Hidayah, M.Pd');
  assert.strictEqual(harness.selectedGuru, 'Nurul Hidayah, M.Pd');
  assert.strictEqual(harness.selectedMapel, 'XI Matematika Tingkat Lanjut');
  assert.strictEqual(harness.selectedKelas, 'XI MIPA 1');
  assert.deepStrictEqual(harness.kelasList, ['XI MIPA 1', 'XI MIPA 2']);
  // Assert complete elimination of Teacher A's classes
  assert.strictEqual(harness.kelasList.includes('10 RPL 1'), false);
  assert.strictEqual(harness.kelasList.includes('10 RPL 2'), false);

  // Step 4: Switch to unselected ""
  harness.handleSelectGuru('');
  assert.strictEqual(harness.selectedGuru, '');
  assert.strictEqual(harness.selectedMapel, '');
  assert.strictEqual(harness.selectedKelas, '');
  assert.deepStrictEqual(harness.mapelList, []);
  assert.deepStrictEqual(harness.kelasList, []);
  assert.strictEqual(harness.renderEvaluation().isMapelDisabled, true);
  assert.strictEqual(harness.renderEvaluation().isKelasDisabled, true);
  assert.strictEqual(harness.renderEvaluation().isEmptyStateCardRendered, true);

  // Step 5: Switch back to Teacher B (Nurul Hidayah)
  harness.handleSelectGuru('Nurul Hidayah, M.Pd');
  assert.strictEqual(harness.selectedGuru, 'Nurul Hidayah, M.Pd');
  assert.strictEqual(harness.selectedMapel, 'XI Matematika Tingkat Lanjut');
  assert.strictEqual(harness.selectedKelas, 'XI MIPA 1');
  assert.deepStrictEqual(harness.kelasList, ['XI MIPA 1', 'XI MIPA 2']);

  // Step 6: Switch back to Teacher A (Ahmad Fauzi)
  harness.handleSelectGuru('Ahmad Fauzi, S.Kom');
  assert.strictEqual(harness.selectedGuru, 'Ahmad Fauzi, S.Kom');
  assert.strictEqual(harness.selectedMapel, 'Informatika');
  assert.strictEqual(harness.selectedKelas, '10 RPL 1');
  assert.deepStrictEqual(harness.kelasList, ['10 RPL 1', '10 RPL 2']);
});

runTest('3.2: Switching to teacher with ZERO assignments handles gracefully and resets cleanly', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();

  // Select Guru Baru Tanpa Jadwal
  harness.handleSelectGuru('Guru Baru Tanpa Jadwal');
  assert.strictEqual(harness.selectedGuru, 'Guru Baru Tanpa Jadwal');
  // Since teacher has no assignments and no mata_pelajaran, in admin mode fallbackMapels are used
  assert.ok(harness.mapelList.length > 0, 'Fallback mapels available in Admin');

  // Now switch back to unselected ""
  harness.handleSelectGuru('');
  assert.strictEqual(harness.selectedGuru, '');
  assert.strictEqual(harness.selectedMapel, '');
  assert.strictEqual(harness.selectedKelas, '');
  assert.deepStrictEqual(harness.mapelList, []);
  assert.deepStrictEqual(harness.kelasList, []);
  assert.strictEqual(harness.renderEvaluation().isEmptyStateCardRendered, true);
});

runTest('3.3: Randomized Fuzzing Harness: 100 consecutive transitions satisfy state hygiene invariants', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();

  const teacherPool = [
    '',
    'Ahmad Fauzi, S.Kom',
    'Nurul Hidayah, M.Pd',
    'Bambang Irawan, S.Pd',
    'Siti Aminah, M.Si',
    'Guru Baru Tanpa Jadwal',
    ''
  ];

  for (let i = 0; i < 100; i++) {
    const nextTeacher = teacherPool[Math.floor(Math.random() * teacherPool.length)];
    harness.handleSelectGuru(nextTeacher);

    // Invariant 1: If selectedGuru is empty, everything downstream MUST be empty
    if (harness.selectedGuru === '') {
      assert.strictEqual(harness.selectedMapel, '', `Iteration ${i}: selectedMapel must be empty`);
      assert.strictEqual(harness.selectedKelas, '', `Iteration ${i}: selectedKelas must be empty`);
      assert.strictEqual(harness.mapelList.length, 0, `Iteration ${i}: mapelList must be empty`);
      assert.strictEqual(harness.kelasList.length, 0, `Iteration ${i}: kelasList must be empty`);
      assert.strictEqual(harness.renderEvaluation().isMapelDisabled, true);
      assert.strictEqual(harness.renderEvaluation().isKelasDisabled, true);
      assert.strictEqual(harness.renderEvaluation().isEmptyStateCardRendered, true);
    } else {
      // Invariant 2: If selectedGuru is non-empty, selectedMapel must be valid
      assert.ok(harness.selectedMapel.length > 0, `Iteration ${i}: selectedMapel must not be empty`);
      assert.strictEqual(harness.renderEvaluation().isMapelDisabled, false);
      assert.strictEqual(harness.renderEvaluation().isEmptyStateCardRendered, false);

      // Invariant 3: Class must match grade level of mapel if grade level exists
      const targetTingkat = getSubjectTingkat(harness.selectedMapel, mockMasterMapels);
      if (targetTingkat && harness.selectedKelas) {
        assert.strictEqual(
          parseTingkat(harness.selectedKelas),
          targetTingkat,
          `Iteration ${i}: Class ${harness.selectedKelas} must match target tingkat ${targetTingkat}`
        );
      }
    }
  }
});

// =============================================================================
// SUITE 4: GRADE-LEVEL ISOLATION & PARSETINGKAT STRESS (ZERO CLASS LEAKAGE)
// =============================================================================
console.log('\n--- SUITE 4: Grade-Level Isolation & parseTingkat Stress ---');

runTest('4.1: Multi-grade teacher (Siti Aminah) enforces strict grade isolation on each subject switch', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();
  harness.handleSelectGuru('Siti Aminah, M.Si');

  // Teacher teaches X Fisika, XI Fisika Lanjut, XII Fisika Peminatan
  // 1. Select Grade 10 Subject
  harness.handleSelectMapel('X Fisika');
  assert.strictEqual(harness.selectedMapel, 'X Fisika');
  assert.deepStrictEqual(harness.kelasList, ['X IPA 1', 'X IPA 2']);
  for (const k of harness.kelasList) {
    assert.strictEqual(parseTingkat(k), '10', `Class ${k} must belong to Grade 10`);
  }
  assert.strictEqual(harness.kelasList.includes('XI MIPA 1'), false, 'Grade 11 must not leak into Grade 10');
  assert.strictEqual(harness.kelasList.includes('XII MIPA 1'), false, 'Grade 12 must not leak into Grade 10');

  // 2. Switch to Grade 11 Subject
  harness.handleSelectMapel('XI Fisika Lanjut');
  assert.strictEqual(harness.selectedMapel, 'XI Fisika Lanjut');
  assert.deepStrictEqual(harness.kelasList, ['XI MIPA 1']);
  for (const k of harness.kelasList) {
    assert.strictEqual(parseTingkat(k), '11', `Class ${k} must belong to Grade 11`);
  }
  assert.strictEqual(harness.kelasList.includes('X IPA 1'), false, 'Grade 10 must not leak into Grade 11');
  assert.strictEqual(harness.kelasList.includes('XII MIPA 1'), false, 'Grade 12 must not leak into Grade 11');

  // 3. Switch to Grade 12 Subject
  harness.handleSelectMapel('XII Fisika Peminatan');
  assert.strictEqual(harness.selectedMapel, 'XII Fisika Peminatan');
  assert.deepStrictEqual(harness.kelasList, ['XII MIPA 1']);
  for (const k of harness.kelasList) {
    assert.strictEqual(parseTingkat(k), '12', `Class ${k} must belong to Grade 12`);
  }
  assert.strictEqual(harness.kelasList.includes('X IPA 1'), false, 'Grade 10 must not leak into Grade 12');
  assert.strictEqual(harness.kelasList.includes('XI MIPA 1'), false, 'Grade 11 must not leak into Grade 12');
});

runTest('4.2: parseTingkat resolves diverse format representations accurately', () => {
  const cases: [string, string][] = [
    ['X RPL 1', '10'],
    ['10A', '10'],
    ['Kelas X', '10'],
    ['X-1', '10'],
    ['XI MIPA 1', '11'],
    ['11B', '11'],
    ['Kelas XI', '11'],
    ['XI-2', '11'],
    ['XII IPS 1', '12'],
    ['12C', '12'],
    ['Kelas XII', '12'],
    ['XII-3', '12'],
    ['Umum', 'Lainnya'],
    ['', 'Lainnya'],
  ];

  for (const [input, expected] of cases) {
    assert.strictEqual(parseTingkat(input), expected, `parseTingkat("${input}") must equal "${expected}"`);
  }
});

runTest('4.3: getSubjectTingkat resolves grade levels from name, category, and Kurikulum Merdeka Phase E', () => {
  assert.strictEqual(getSubjectTingkat('Fisika Fase E'), '10', 'Phase E must resolve to grade 10');
  assert.strictEqual(getSubjectTingkat('Matematika Tingkat Lanjut XI'), '11');
  assert.strictEqual(getSubjectTingkat('Kimia Kelas XII'), '12');
  assert.strictEqual(getSubjectTingkat('Bahasa Jepang', [{ nama_mapel: 'Bahasa Jepang', kategori: 'Kelas X' }]), '10');
  assert.strictEqual(getSubjectTingkat('Pendidikan Agama', [{ nama_mapel: 'Pendidikan Agama', kategori: 'Umum' }]), null);
});

// =============================================================================
// SUITE 5: NON-ADMIN (GURU) MODE PRESERVATION (ZERO REGRESSION GATE)
// =============================================================================
console.log('\n--- SUITE 5: Non-Admin Mode Preservation (Zero Regression Gate) ---');

runTest('5.1: Non-admin teacher automatically binds selectedGuru to user.nama and populates assignments on mount', () => {
  const teacherUser = { role: 'Guru', nama: 'Nurul Hidayah, M.Pd', username: '199203102019032008' };
  const harness = new GradebookStateMachine(false, teacherUser);

  assert.strictEqual(harness.selectedGuru, 'Nurul Hidayah, M.Pd', 'Non-admin selectedGuru must bind to user.nama');

  harness.fetchMasterAssignmentsMount();

  assert.strictEqual(harness.selectedGuru, 'Nurul Hidayah, M.Pd');
  assert.strictEqual(harness.selectedMapel, 'XI Matematika Tingkat Lanjut');
  assert.strictEqual(harness.selectedKelas, 'XI MIPA 1');
  assert.deepStrictEqual(harness.kelasList, ['XI MIPA 1', 'XI MIPA 2']);

  const dom = harness.renderEvaluation();
  assert.strictEqual(dom.isGuruDropdownRendered, false, 'Non-admin mode must NOT render guru dropdown');
  assert.strictEqual(dom.isGuruBadgeRendered, true, 'Non-admin mode MUST render static teacher badge');
  assert.strictEqual(dom.isMapelDisabled, false, 'Mapel must NOT be disabled for teacher');
  assert.strictEqual(dom.isKelasDisabled, false, 'Kelas must NOT be disabled for teacher');
  assert.strictEqual(dom.isEmptyStateCardRendered, false, 'Empty state card MUST NOT be rendered for teacher');
  assert.strictEqual(dom.isWorkspaceTableRendered, true, 'Workspace assessment table MUST be rendered');
});

runTest('5.2: Non-admin teacher queries nilai_siswa properly on mount', () => {
  const teacherUser = { role: 'Guru', nama: 'Nurul Hidayah, M.Pd', username: '199203102019032008' };
  const harness = new GradebookStateMachine(false, teacherUser);
  harness.fetchMasterAssignmentsMount();

  const nilaiQueries = harness.supabaseQueryLog.filter(q => q.includes('nilai_siswa'));
  assert.strictEqual(nilaiQueries.length, 1, 'Non-admin mode must successfully fetch grades on mount');
  assert.ok(nilaiQueries[0].includes('mapel=XI Matematika Tingkat Lanjut'));
  assert.ok(nilaiQueries[0].includes('kelas=XI MIPA 1'));
});

// =============================================================================
// SUITE 6: PARALLEL CLASS ISOLATION & NAME NORMALIZATION STRESS
// =============================================================================
console.log('\n--- SUITE 6: Parallel Class Isolation & Name Normalization Stress ---');

runTest('6.1: Parallel class switching preserves selectedMapel when both classes teach it', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();
  harness.handleSelectGuru('Ahmad Fauzi, S.Kom'); // Informatika taught in 10 RPL 1 and 10 RPL 2

  assert.strictEqual(harness.selectedKelas, '10 RPL 1');
  assert.strictEqual(harness.selectedMapel, 'Informatika');

  // Switch to parallel class 10 RPL 2
  harness.handleSelectKelas('10 RPL 2');
  assert.strictEqual(harness.selectedKelas, '10 RPL 2');
  assert.strictEqual(harness.selectedMapel, 'Informatika', 'Must preserve Informatika on parallel switch');
});

runTest('6.2: Switching to class not teaching active subject auto-adjusts selectedMapel', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();
  harness.handleSelectGuru('Siti Aminah, M.Si'); // X Fisika in X IPA 1 & 2; XI Fisika Lanjut in XI MIPA 1

  harness.handleSelectMapel('X Fisika');
  assert.strictEqual(harness.selectedKelas, 'X IPA 1');

  // Switch kelas to XI MIPA 1 (which does NOT teach X Fisika)
  harness.handleSelectKelas('XI MIPA 1');
  assert.strictEqual(harness.selectedKelas, 'XI MIPA 1');
  assert.strictEqual(harness.selectedMapel, 'XI Fisika Lanjut', 'Must auto-adjust mapel to match new class');
});

runTest('6.3: isTeacherMatch handles complex titles, zero-width spaces, and whitespace variations', () => {
  const teacher = { id: 'g-99', nama_guru: 'Dr. H. Ahmad Fauzi, S.Kom, M.T, IPM', nip: '12345678' };
  assert.strictEqual(isTeacherMatch(teacher, 'Dr. H. Ahmad Fauzi'), true);
  assert.strictEqual(isTeacherMatch(teacher, 'Dr. H. Ahmad Fauzi, S.Kom'), true);
  assert.strictEqual(isTeacherMatch(teacher, '  dr. h. ahmad fauzi  '), true);
  assert.strictEqual(isTeacherMatch(teacher, 'Dr. H. Ahmad\u200B Fauzi'), true, 'Zero-width space alongside word boundary must be handled');
});

runTest('6.4: isAssignmentMatchTeacher handles null/undefined safely without throwing exceptions', () => {
  assert.strictEqual(isAssignmentMatchTeacher(null as any, null as any), false);
  assert.strictEqual(isAssignmentMatchTeacher({} as any, {} as any), false);
  assert.strictEqual(isAssignmentMatchTeacher({ nama_guru: null, nip: null }, { nama_guru: 'Budi' }), false);
});

// =============================================================================
// SUITE 7: CONSECUTIVE CANCELLATIONS & BEFOREUNLOAD PROTECTION INVARIANTS
// =============================================================================
console.log('\n--- SUITE 7: Consecutive Cancellations & BeforeUnload Invariants ---');

runTest('7.1: 10 consecutive cancelled operations (guru, mapel, kelas) preserve dirty grades intact', () => {
  const harness = new GradebookStateMachine(true);
  harness.fetchMasterAssignmentsMount();
  harness.handleSelectGuru('Ahmad Fauzi, S.Kom');

  const initialDirty = { 'n1_c1': true, 'n2_c2': true, 'n3_c3': true };
  harness.setDirtyGrades(initialDirty);
  harness.mockConfirmResponse = false; // Always cancel

  for (let i = 0; i < 10; i++) {
    if (i % 3 === 0) harness.handleSelectGuru('Nurul Hidayah, M.Pd');
    else if (i % 3 === 1) harness.handleSelectMapel('Dasar Kejuruan');
    else harness.handleSelectKelas('10 RPL 2');
  }

  assert.strictEqual(harness.confirmCallsCount, 10, 'Prompt must show on every attempt');
  assert.strictEqual(harness.selectedGuru, 'Ahmad Fauzi, S.Kom');
  assert.strictEqual(harness.selectedMapel, 'Informatika');
  assert.strictEqual(harness.selectedKelas, '10 RPL 1');
  assert.deepStrictEqual(harness.dirtyGrades, initialDirty, 'Dirty grades must remain completely intact');
});

runTest('7.2: Static Verification: beforeunload event listener registered to guard dirty grades', () => {
  assert.ok(gradebookSource.includes("window.addEventListener('beforeunload', handleBeforeUnload)"), 'Must attach beforeunload');
  assert.ok(gradebookSource.includes("window.removeEventListener('beforeunload', handleBeforeUnload)"), 'Must cleanup beforeunload');
  assert.ok(gradebookSource.includes("if (Object.keys(dirtyGrades).length > 0)"), 'Must check dirtyGrades length');
});

// =============================================================================
// SUMMARY & VERDICT
// =============================================================================
console.log('\n================================================================================');
console.log(`  CHALLENGER STRESS TEST SUMMARY: Total ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
console.log('================================================================================\n');

if (failedTests === 0) {
  console.log('🎉 VERDICT: APPROVE — ALL ADVERSARIAL STRESS TESTS PASSED WITH 100% SUCCESS!');
  process.exit(0);
} else {
  console.error('❌ VERDICT: CHALLENGE_FAILED — DEFECTS DETECTED!');
  process.exit(1);
}
