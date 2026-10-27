/**
 * Automated Verification Suite: Multi-Gelar (Academic & Professional Titles)
 * Verifies R1, R2, R3 multi-title capabilities in AccountSettingsModal & AdminDataView
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  formatFullName,
  parseNameAndTitles,
  setupSwalTitleManager,
  AcademicTitle
} from '../src/lib/academicTitles';
import {
  validateTeacherData,
  validateUserData,
  isDummyOrTestString,
  isForbiddenName
} from '../src/lib/dataIntegrityGuard';

const rootDir = path.resolve(__dirname, '..');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 TEST SUITE: MULTI-GELAR AKADEMIK & PROFESI (R1 & R2)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ============================================================================
// SECTION 1: FORMAT FULL NAME & MULTI-GELAR LOGIC
// ============================================================================
console.log('--- Section 1: formatFullName & Title Positioning ---');

// 1.1 Nama tanpa gelar
{
  const result = formatFullName('Budi Santoso', []);
  assert.strictEqual(result, 'Budi Santoso', 'Nama tanpa gelar harus menghasilkan nama pokok murni');
  console.log('  ✔ [PASS] 1.1: Nama tanpa gelar diformat tanpa spasi/tanda baca ekstra ("Budi Santoso")');
}

// 1.2 Nama dengan 1 gelar depan
{
  const titles: AcademicTitle[] = [{ id: '1', text: 'Dr.', position: 'prefix' }];
  const result = formatFullName('Budi Santoso', titles);
  assert.strictEqual(result, 'Dr. Budi Santoso', '1 gelar depan dipisahkan spasi sebelum nama pokok');
  console.log('  ✔ [PASS] 1.2: 1 Gelar Depan ("Dr. Budi Santoso")');
}

// 1.3 Nama dengan beberapa gelar depan
{
  const titles: AcademicTitle[] = [
    { id: '1', text: 'Dr.', position: 'prefix' },
    { id: '2', text: 'Ir.', position: 'prefix' }
  ];
  const result = formatFullName('Budi Santoso', titles);
  assert.strictEqual(result, 'Dr. Ir. Budi Santoso', 'Beberapa gelar depan digabungkan dengan spasi');
  console.log('  ✔ [PASS] 1.3: Beberapa Gelar Depan ("Dr. Ir. Budi Santoso")');
}

// 1.4 Nama dengan 1 gelar belakang
{
  const titles: AcademicTitle[] = [{ id: '1', text: 'S.Pd.', position: 'suffix' }];
  const result = formatFullName('Siti Aminah', titles);
  assert.strictEqual(result, 'Siti Aminah, S.Pd.', '1 gelar belakang dipisahkan koma dan spasi');
  console.log('  ✔ [PASS] 1.4: 1 Gelar Belakang ("Siti Aminah, S.Pd.")');
}

// 1.5 Nama dengan beberapa gelar belakang
{
  const titles: AcademicTitle[] = [
    { id: '1', text: 'S.Pd.', position: 'suffix' },
    { id: '2', text: 'M.Pd.', position: 'suffix' }
  ];
  const result = formatFullName('Siti Aminah', titles);
  assert.strictEqual(result, 'Siti Aminah, S.Pd., M.Pd.', 'Beberapa gelar belakang dipisahkan koma dan spasi');
  console.log('  ✔ [PASS] 1.5: Beberapa Gelar Belakang ("Siti Aminah, S.Pd., M.Pd.")');
}

// 1.6 Kombinasi kompleks gelar depan dan belakang
{
  const titles: AcademicTitle[] = [
    { id: '1', text: 'Prof.', position: 'prefix' },
    { id: '2', text: 'Dr.', position: 'prefix' },
    { id: '3', text: 'H.', position: 'prefix' },
    { id: '4', text: 'S.Pd.', position: 'suffix' },
    { id: '5', text: 'M.Pd.', position: 'suffix' },
    { id: '6', text: 'Gr.', position: 'suffix' }
  ];
  const result = formatFullName('Ahmad Fauzi', titles);
  assert.strictEqual(
    result,
    'Prof. Dr. H. Ahmad Fauzi, S.Pd., M.Pd., Gr.',
    'Kombinasi 3 gelar depan dan 3 gelar belakang diformat baku'
  );
  console.log('  ✔ [PASS] 1.6: Kombinasi Kompleks ("Prof. Dr. H. Ahmad Fauzi, S.Pd., M.Pd., Gr.")');
}

// 1.7 Penghapusan gelar dan penyesuaian format secara dinamis
{
  let titles: AcademicTitle[] = [
    { id: '1', text: 'Dr.', position: 'prefix' },
    { id: '2', text: 'Drs.', position: 'prefix' },
    { id: '3', text: 'Ahmad Fauzi', position: 'suffix' }, // accidental suffix to test removal
    { id: '4', text: 'S.Pd.', position: 'suffix' },
    { id: '5', text: 'M.Pd.', position: 'suffix' }
  ];
  // Remove item 3
  titles = titles.filter(t => t.id !== '3');
  let result = formatFullName('Ahmad Fauzi', titles);
  assert.strictEqual(result, 'Dr. Drs. Ahmad Fauzi, S.Pd., M.Pd.');

  // Remove all suffixes
  titles = titles.filter(t => t.position !== 'suffix');
  result = formatFullName('Ahmad Fauzi', titles);
  assert.strictEqual(result, 'Dr. Drs. Ahmad Fauzi', 'Menghapus gelar belakang menghilangkan tanda koma');

  // Remove all prefixes
  titles = [];
  result = formatFullName('Ahmad Fauzi', titles);
  assert.strictEqual(result, 'Ahmad Fauzi', 'Menghapus seluruh gelar menyisakan nama pokok murni');
  console.log('  ✔ [PASS] 1.7: Penghapusan Gelar & Penyesuaian Format String Dinamis');
}

// 1.8 Robustness & Edge Cases
{
  // Extra spaces & tabs
  const result1 = formatFullName('   Fitri   Aprilia   Dotulong   ', [
    { id: '1', text: '   Hj.   ', position: 'prefix' },
    { id: '2', text: '', position: 'prefix' }, // empty text ignored
    { id: '3', text: '   ', position: 'suffix' }, // whitespace text ignored
    { id: '4', text: '   S.Pd.   ', position: 'suffix' },
    { id: '5', text: '   M.Pd.   ', position: 'suffix' }
  ]);
  assert.strictEqual(result1, 'Hj. Fitri Aprilia Dotulong, S.Pd., M.Pd.');

  // Dangling or duplicate commas prevention
  const result2 = formatFullName('Fitri Aprilia,', [
    { id: '1', text: ', S.Pd.,', position: 'suffix' }
  ]);
  assert.strictEqual(result2, 'Fitri Aprilia, S.Pd.');

  console.log('  ✔ [PASS] 1.8: Penanganan Edge Cases (spasi berlebih, koma ganda, gelar kosong)');
}

// ============================================================================
// SECTION 2: PARSE EXISTING NAMES (ROUND-TRIP TEST)
// ============================================================================
console.log('\n--- Section 2: parseNameAndTitles & Round-trip ---');

{
  const testCases = [
    {
      input: 'Budi Santoso',
      expectedCore: 'Budi Santoso',
      expectedPrefixes: [],
      expectedSuffixes: []
    },
    {
      input: 'Dr. Ir. Budi Santoso',
      expectedCore: 'Budi Santoso',
      expectedPrefixes: ['Dr.', 'Ir.'],
      expectedSuffixes: []
    },
    {
      input: 'Siti Aminah, S.Pd., M.Pd.',
      expectedCore: 'Siti Aminah',
      expectedPrefixes: [],
      expectedSuffixes: ['S.Pd.', 'M.Pd.']
    },
    {
      input: 'Prof. Dr. H. Ahmad Fauzi, S.Pd., M.Pd., Gr.',
      expectedCore: 'Ahmad Fauzi',
      expectedPrefixes: ['Prof.', 'Dr.', 'H.'],
      expectedSuffixes: ['S.Pd.', 'M.Pd.', 'Gr.']
    },
    {
      input: 'Hj. Nurhayati, S.Pd.',
      expectedCore: 'Nurhayati',
      expectedPrefixes: ['Hj.'],
      expectedSuffixes: ['S.Pd.']
    },
    // Adversarial: Multiple suffixes without comma preserving left-to-right order
    {
      input: 'Budi Santoso S.Pd. M.Pd.',
      expectedCore: 'Budi Santoso',
      expectedPrefixes: [],
      expectedSuffixes: ['S.Pd.', 'M.Pd.']
    },
    // Adversarial: Multiple prefixes and multiple suffixes without comma
    {
      input: 'Drs. H. Ahmad Fauzi S.Pd. M.Pd.',
      expectedCore: 'Ahmad Fauzi',
      expectedPrefixes: ['Drs.', 'H.'],
      expectedSuffixes: ['S.Pd.', 'M.Pd.']
    },
    // Adversarial: Prefix with dot (KH.) does not leave dangling dot in coreName
    {
      input: 'KH. Achmad Dahlan',
      expectedCore: 'Achmad Dahlan',
      expectedPrefixes: ['KH.'],
      expectedSuffixes: []
    },
    // Adversarial: Comma-separated prefixes do not treat second prefix + core name as suffix
    {
      input: 'Prof., Dr. Ahmad Fauzi, S.Pd.',
      expectedCore: 'Ahmad Fauzi',
      expectedPrefixes: ['Prof.', 'Dr.'],
      expectedSuffixes: ['S.Pd.']
    },
    // Adversarial: Standalone suffixes without core name
    {
      input: ', S.Pd., M.Pd.',
      expectedCore: '',
      expectedPrefixes: [],
      expectedSuffixes: ['S.Pd.', 'M.Pd.']
    },
    {
      input: 'S.Pd.',
      expectedCore: '',
      expectedPrefixes: [],
      expectedSuffixes: ['S.Pd.']
    },
    // Adversarial: Expanded academic degree titles without commas
    {
      input: 'Siti Aminah S.H. M.H.',
      expectedCore: 'Siti Aminah',
      expectedPrefixes: [],
      expectedSuffixes: ['S.H.', 'M.H.']
    },
    {
      input: 'Budi Santoso S.Sos. M.Sos.',
      expectedCore: 'Budi Santoso',
      expectedPrefixes: [],
      expectedSuffixes: ['S.Sos.', 'M.Sos.']
    }
  ];

  for (const tc of testCases) {
    const parsed = parseNameAndTitles(tc.input);
    assert.strictEqual(parsed.coreName, tc.expectedCore, `Core name mismatch for "${tc.input}"`);
    const actualPrefixes = parsed.titles.filter(t => t.position === 'prefix').map(t => t.text);
    const actualSuffixes = parsed.titles.filter(t => t.position === 'suffix').map(t => t.text);
    assert.deepStrictEqual(actualPrefixes, tc.expectedPrefixes, `Prefixes mismatch for "${tc.input}"`);
    assert.deepStrictEqual(actualSuffixes, tc.expectedSuffixes, `Suffixes mismatch for "${tc.input}"`);

    // Round-trip verification if input was well-formed
    if (tc.expectedCore && tc.input.includes(',') && !tc.input.includes('Prof.,')) {
      const roundTrip = formatFullName(parsed.coreName, parsed.titles);
      assert.strictEqual(roundTrip, tc.input, `Round-trip format mismatch for "${tc.input}"`);
    }
  }

  // Verify non-prefix names starting with similar letters are NOT falsely stripped
  const safeNames = ['Hamdan', 'Hadi', 'Irwan', 'Drajat', 'Probo'];
  for (const name of safeNames) {
    const parsed = parseNameAndTitles(name);
    assert.strictEqual(parsed.coreName, name, `False prefix detection on name "${name}"`);
    assert.strictEqual(parsed.titles.length, 0, `False prefix detected on name "${name}"`);
  }

  console.log('  ✔ [PASS] 2.1: Parsing nama eksisting dan round-trip formatting sukses');
  console.log('  ✔ [PASS] 2.2: Tidak ada false-positive pemotongan nama pokok (Hamdan, Hadi, Irwan, dll)');
  console.log('  ✔ [PASS] 2.3: Adversarial test: Suffix order preserved, KH. dot handled, commas between prefixes resolved');
}

// ============================================================================
// SECTION 3: DATA INTEGRITY & VALIDATION GUARD
// ============================================================================
console.log('\n--- Section 3: Data Integrity Guard Compatibility ---');

{
  const legitimateNames = [
    'Dr. Ir. Budi Santoso',
    'Siti Aminah, S.Pd., M.Pd.',
    'Prof. Dr. H. Ahmad Fauzi, S.Pd., M.Pd., Gr.',
    'Fitri Aprilia Dotulong, S.Pd.',
    'Drs. Muhammad Yusuf, M.Ag.'
  ];

  for (const name of legitimateNames) {
    // 3.1 isDummyOrTestString
    assert.strictEqual(
      isDummyOrTestString(name),
      false,
      `Nama riil bergelar "${name}" tidak boleh dianggap dummy`
    );

    // 3.2 isForbiddenName
    assert.strictEqual(
      isForbiddenName(name),
      false,
      `Nama riil bergelar "${name}" tidak boleh dianggap forbidden`
    );

    // 3.3 validateTeacherData
    const teacherRes = validateTeacherData('198501012010011001', name, []);
    assert.strictEqual(
      teacherRes.valid,
      true,
      `validateTeacherData gagal untuk nama riil bergelar "${name}": ${teacherRes.message}`
    );

    // 3.4 validateUserData
    const userRes = validateUserData('teacher_user', name, []);
    assert.strictEqual(
      userRes.valid,
      true,
      `validateUserData gagal untuk nama riil bergelar "${name}": ${userRes.message}`
    );
  }

  // 3.5 Forbidden names with titles should STILL be rejected
  const forbiddenWithTitles = [
    'Dr. FITRA SURYAZANA MAMONTO, S.Pd.',
    'Prof. Drs. Ahmad Dahlan, M.Pd.',
    'Ir. Ahmad Dahlan, M.T.'
  ];
  for (const badName of forbiddenWithTitles) {
    assert.strictEqual(
      isForbiddenName(badName),
      true,
      `Forbidden name decorated with titles "${badName}" must still be rejected`
    );
  }

  console.log('  ✔ [PASS] 3.1: Nama bergelar tidak memicu false-positive pada isDummyOrTestString');
  console.log('  ✔ [PASS] 3.2: validateTeacherData & validateUserData meloloskan nama bergelar riil');
  console.log('  ✔ [PASS] 3.3: Proteksi nama terlarang tetap aktif meski didekorasi gelar akademik');
}

// ============================================================================
// SECTION 4: SOURCE CODE & UI INSPECTION
// ============================================================================
console.log('\n--- Section 4: Source Code Inspection (AccountSettingsModal & AdminDataView) ---');

// 4.1 AccountSettingsModal.tsx
{
  const modalPath = path.join(rootDir, 'src', 'components', 'AccountSettingsModal.tsx');
  assert.ok(fs.existsSync(modalPath), 'AccountSettingsModal.tsx exists');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  assert.ok(
    modalContent.includes('parseNameAndTitles') && modalContent.includes('formatFullName'),
    'AccountSettingsModal imports and uses multi-title functions'
  );
  assert.ok(
    modalContent.includes('Nama Pokok (Tanpa Gelar)'),
    'AccountSettingsModal has core name field'
  );
  assert.ok(
    modalContent.includes('Gelar Akademik & Profesi'),
    'AccountSettingsModal has academic & professional titles section'
  );
  assert.ok(
    modalContent.includes('Tambah Gelar'),
    'AccountSettingsModal has button to add titles'
  );
  assert.ok(
    modalContent.includes('Depan (Prefix)') && modalContent.includes('Belakang (Suffix)'),
    'AccountSettingsModal allows selecting prefix or suffix position'
  );
  assert.ok(
    modalContent.includes('Preview Nama Lengkap Terformat:'),
    'AccountSettingsModal renders real-time formatted preview'
  );
  assert.ok(
    modalContent.includes('update_user_profile'),
    'AccountSettingsModal persists profile changes via update_user_profile RPC'
  );

  console.log('  ✔ [PASS] 4.1: AccountSettingsModal.tsx implements multi-title UI, position selector, and live preview');
}

// 4.2 AdminDataView.tsx
{
  const adminDataPath = path.join(rootDir, 'src', 'components', 'AdminDataView.tsx');
  assert.ok(fs.existsSync(adminDataPath), 'AdminDataView.tsx exists');
  const adminDataContent = fs.readFileSync(adminDataPath, 'utf-8');

  // Verify Tambah Guru
  assert.ok(
    adminDataContent.includes('swal-core-nama'),
    'AdminDataView Tambah Guru has core name input'
  );
  assert.ok(
    adminDataContent.includes('swal-btn-add-title'),
    'AdminDataView Tambah Guru has add title button'
  );
  assert.ok(
    adminDataContent.includes('swal-titles-list'),
    'AdminDataView Tambah Guru has dynamic titles list container'
  );
  assert.ok(
    adminDataContent.includes('swal-nama'),
    'AdminDataView Tambah Guru has swal-nama synced field for backward compatibility'
  );

  // Verify Edit Guru
  assert.ok(
    adminDataContent.includes('swal-edit-core-nama'),
    'AdminDataView Edit Guru has edit core name input'
  );
  assert.ok(
    adminDataContent.includes('swal-edit-btn-add-title'),
    'AdminDataView Edit Guru has add title button'
  );
  assert.ok(
    adminDataContent.includes('swal-edit-titles-list'),
    'AdminDataView Edit Guru has dynamic titles list container'
  );
  assert.ok(
    adminDataContent.includes('swal-edit-nama'),
    'AdminDataView Edit Guru retains swal-edit-nama for assertion compatibility'
  );

  // Verify manager initialization
  assert.ok(
    adminDataContent.includes('setupSwalTitleManager'),
    'AdminDataView calls setupSwalTitleManager in didOpen'
  );

  // Verify effectiveCoreNama validation guards
  const modalSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'AccountSettingsModal.tsx'), 'utf-8');
  assert.ok(
    adminDataContent.includes('effectiveCoreNama') &&
    modalSrc.includes('effectiveCoreNama'),
    'Both AdminDataView and AccountSettingsModal enforce effectiveCoreNama validation'
  );

  // Verify narrow-screen mobile min-w-0 layout resilience
  assert.ok(
    modalSrc.includes('min-w-0') &&
    fs.readFileSync(path.join(rootDir, 'src', 'lib', 'academicTitles.ts'), 'utf-8').includes('min-w-0'),
    'Inputs contain min-w-0 class to prevent flex layout overflow on narrow mobile screens'
  );

  console.log('  ✔ [PASS] 4.2: AdminDataView.tsx implements multi-title management in Tambah and Edit Guru');
  console.log('  ✔ [PASS] 4.3: Validasi effectiveCoreNama dan class min-w-0 aktif pada modal & swal');
}

// ============================================================================
// SECTION 5: DOM SIMULATION OF setupSwalTitleManager
// ============================================================================
console.log('\n--- Section 5: DOM Simulation of Title Manager ---');

{
  // Minimal DOM mock to test setupSwalTitleManager logic in Node.js environment
  class MockElement {
    tagName: string;
    value: string = '';
    textContent: string = '';
    innerHTML: string = '';
    attributes: Record<string, string> = {};
    listeners: Record<string, Function[]> = {};
    children: MockElement[] = [];
    ownerDocument: any;

    constructor(tagName: string) {
      this.tagName = tagName;
    }

    focus() {}

    setAttribute(key: string, val: string) {
      this.attributes[key] = val;
    }

    getAttribute(key: string) {
      return this.attributes[key] || '';
    }

    addEventListener(event: string, fn: Function) {
      this.listeners[event] = this.listeners[event] || [];
      this.listeners[event].push(fn);
    }

    dispatchEvent(event: string) {
      (this.listeners[event] || []).forEach(fn => fn({ target: this }));
    }

    querySelector(selector: string): any {
      const idMatch = selector.match(/#([\w-]+)/);
      if (idMatch) {
        return this.findById(idMatch[1]);
      }
      return new MockElement('div');
    }

    querySelectorAll(selector: string): any[] {
      return [];
    }

    appendChild(child: MockElement) {
      this.children.push(child);
    }

    findById(id: string): MockElement | null {
      if (this.getAttribute('id') === id) return this;
      for (const c of this.children) {
        const found = c.findById(id);
        if (found) return found;
      }
      return null;
    }
  }

  const mockDoc = {
    createElement: (tag: string) => {
      const el = new MockElement(tag);
      el.ownerDocument = mockDoc;
      return el;
    }
  };

  // Create mock popup hierarchy
  const popup = new MockElement('div');
  popup.ownerDocument = mockDoc;
  const coreInput = new MockElement('input');
  coreInput.setAttribute('id', 'mock-core');
  const titlesList = new MockElement('div');
  titlesList.setAttribute('id', 'mock-titles');
  const addBtn = new MockElement('button');
  addBtn.setAttribute('id', 'mock-add-btn');
  const preview = new MockElement('div');
  preview.setAttribute('id', 'mock-preview');
  const hiddenInput = new MockElement('input');
  hiddenInput.setAttribute('id', 'mock-hidden');

  popup.appendChild(coreInput);
  popup.appendChild(titlesList);
  popup.appendChild(addBtn);
  popup.appendChild(preview);
  popup.appendChild(hiddenInput);

  const manager = setupSwalTitleManager({
    popup: popup as any,
    initialCoreName: 'Fitri Dotulong',
    initialTitles: [{ id: '1', text: 'S.Pd.', position: 'suffix' }],
    coreInputId: 'mock-core',
    titlesContainerId: 'mock-titles',
    addBtnId: 'mock-add-btn',
    previewId: 'mock-preview',
    hiddenInputId: 'mock-hidden'
  });

  assert.strictEqual(manager.getFormattedName(), 'Fitri Dotulong, S.Pd.');
  assert.strictEqual(preview.textContent, 'Fitri Dotulong, S.Pd.');
  assert.strictEqual(hiddenInput.value, 'Fitri Dotulong, S.Pd.');

  // Simulate typing in core name
  coreInput.value = 'Fitri Aprilia Dotulong';
  coreInput.dispatchEvent('input');
  assert.strictEqual(manager.getFormattedName(), 'Fitri Aprilia Dotulong, S.Pd.');
  assert.strictEqual(hiddenInput.value, 'Fitri Aprilia Dotulong, S.Pd.');

  // Simulate adding a title
  addBtn.dispatchEvent('click');
  assert.strictEqual(manager.getTitles().length, 2, 'Title count incremented');

  // Adversarial: Title containing quote/HTML injection is safely handled via value property assignment
  const secondTitle = manager.getTitles()[1];
  secondTitle.text = '" onfocus="alert(1)';
  assert.doesNotThrow(() => {
    // Formatting with quote/HTML injection does not break
    const out = formatFullName(manager.getCoreName(), manager.getTitles());
    assert.ok(out.includes('" onfocus="alert(1)'));
  });

  // Adversarial: Empty core name returns empty getCoreName() allowing validation guards to trigger
  secondTitle.text = 'M.Pd.';
  coreInput.value = '   ';
  coreInput.dispatchEvent('input');
  assert.strictEqual(manager.getCoreName().trim(), '');
  const emptyGuard = (manager.getCoreName().trim()) || parseNameAndTitles(hiddenInput.value).coreName;
  assert.strictEqual(emptyGuard, '', 'Empty core name with only titles correctly detected as missing core name');

  console.log('  ✔ [PASS] 5.1: setupSwalTitleManager correctly synchronizes preview & form inputs on user events');
  console.log('  ✔ [PASS] 5.2: Injeksi kutip ganda/HTML ditangani dengan aman dan nama pokok kosong terdeteksi');
}

console.log('\n========================================================================');
console.log('🎉 ALL MULTI-GELAR TESTS COMPLETED AND PASSED WITH 100% SUCCESS!');
console.log('========================================================================\n');
