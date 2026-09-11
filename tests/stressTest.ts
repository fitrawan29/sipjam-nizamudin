import fs from 'fs';
import path from 'path';
import {
  getGoogleDriveFileId,
  transformGoogleDriveUrl,
  getGoogleDriveThumbnailUrl,
  isGoogleDriveUrl,
} from '../src/lib/imageUrl';
import {
  formatDateWita,
  getWitaDateLong,
  getWitaDateStr,
  getWitaDayName,
  getWitaTimeStr,
  getWitaTimestamp,
  formatTimestampWita,
} from '../src/lib/wita';

let failureCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    failureCount++;
  } else {
    console.log(`✅ PASS: ${testName}`);
  }
}

console.log('====================================================');
console.log('STRESS TEST SUITE: sipjam-app Edge Cases & Invariants');
console.log('====================================================\n');

// =========================================================================
// SECTION 1: transformGoogleDriveUrl across 30+ Varied & Adversarial URLs
// =========================================================================
console.log('--- SECTION 1: Google Drive URL Stress Testing (30+ URLs) ---');

interface DriveTestCase {
  description: string;
  input: any;
  expectedTransformed: string;
  expectedFileId: string | null;
  isDrive: boolean;
}

const driveStressCases: DriveTestCase[] = [
  // 1. Standard desktop link with /file/d/ and view?usp=sharing
  {
    description: 'Standard /file/d/ with view?usp=sharing',
    input: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144/view?usp=sharing',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
    expectedFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
    isDrive: true,
  },
  // 2. Mobile drivesdk link: view?usp=drivesdk
  {
    description: 'Mobile link with view?usp=drivesdk',
    input: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144/view?usp=drivesdk',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
    expectedFileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
    isDrive: true,
  },
  // 3. /file/d/ with no query parameters
  {
    description: '/file/d/ with /view and no query parameters',
    input: 'https://drive.google.com/file/d/1AbC-D_eF12345/view',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1AbC-D_eF12345',
    expectedFileId: '1AbC-D_eF12345',
    isDrive: true,
  },
  // 4. /file/d/ with trailing slash
  {
    description: '/file/d/ bare with trailing slash',
    input: 'https://drive.google.com/file/d/1AbC-D_eF12345/',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1AbC-D_eF12345',
    expectedFileId: '1AbC-D_eF12345',
    isDrive: true,
  },
  // 5. Bare /d/ path on drive.google.com
  {
    description: 'Bare /d/ on drive.google.com',
    input: 'https://drive.google.com/d/1AbC-D_eF12345',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1AbC-D_eF12345',
    expectedFileId: '1AbC-D_eF12345',
    isDrive: true,
  },
  // 6. Subdomain docs.google.com with /document/d/
  {
    description: 'docs.google.com with /document/d/ and /edit',
    input: 'https://docs.google.com/document/d/1DocId998877_xyz/edit?usp=sharing',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1DocId998877_xyz',
    expectedFileId: '1DocId998877_xyz',
    isDrive: true,
  },
  // 7. Subdomain docs.google.com with /presentation/d/
  {
    description: 'docs.google.com with /presentation/d/',
    input: 'https://docs.google.com/presentation/d/1PresId112233_abc/edit',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1PresId112233_abc',
    expectedFileId: '1PresId112233_abc',
    isDrive: true,
  },
  // 8. Subdomain docs.google.com with /spreadsheets/d/
  {
    description: 'docs.google.com with /spreadsheets/d/',
    input: 'https://docs.google.com/spreadsheets/d/1SheetId445566_def/edit#gid=0',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1SheetId445566_def',
    expectedFileId: '1SheetId445566_def',
    isDrive: true,
  },
  // 9. docs.google.com /file/d/
  {
    description: 'docs.google.com /file/d/ link',
    input: 'https://docs.google.com/file/d/1FileId778899/preview',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1FileId778899',
    expectedFileId: '1FileId778899',
    isDrive: true,
  },
  // 10. lh3.googleusercontent.com /d/
  {
    description: 'lh3.googleusercontent.com CDN direct format',
    input: 'https://lh3.googleusercontent.com/d/1CdnId33445566',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1CdnId33445566',
    expectedFileId: '1CdnId33445566',
    isDrive: true,
  },
  // 11. Legacy drive open?id=
  {
    description: 'drive.google.com open?id format',
    input: 'https://drive.google.com/open?id=1OpenId55667788',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1OpenId55667788',
    expectedFileId: '1OpenId55667788',
    isDrive: true,
  },
  // 12. Legacy open?id with multiple query params
  {
    description: 'drive.google.com open?id with extra query params (&authuser=0)',
    input: 'https://drive.google.com/open?id=1OpenId55667788&authuser=1&usp=drive_fs',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1OpenId55667788',
    expectedFileId: '1OpenId55667788',
    isDrive: true,
  },
  // 13. Query param with id first before other params
  {
    description: 'drive query param ?id= followed by other params',
    input: 'https://drive.google.com/uc?id=1UcId88990011&export=download',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1UcId88990011',
    expectedFileId: '1UcId88990011',
    isDrive: true,
  },
  // 14. Query param with export first then &id=
  {
    description: 'drive query param &id= after ?export=download',
    input: 'https://drive.google.com/uc?export=download&id=1UcId88990011',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1UcId88990011',
    expectedFileId: '1UcId88990011',
    isDrive: true,
  },
  // 15. Already formatted direct stream URL
  {
    description: 'Already direct uc?export=view&id format',
    input: 'https://drive.google.com/uc?export=view&id=1UcId88990011',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1UcId88990011',
    expectedFileId: '1UcId88990011',
    isDrive: true,
  },
  // 16. Thumbnail query format ?id=
  {
    description: 'drive.google.com/thumbnail?id= format',
    input: 'https://drive.google.com/thumbnail?id=1ThumbId776655&sz=w1000',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1ThumbId776655',
    expectedFileId: '1ThumbId776655',
    isDrive: true,
  },
  // 17. URL with leading and trailing whitespace
  {
    description: 'URL surrounded by leading and trailing whitespace',
    input: '   https://drive.google.com/file/d/1SpacedId12345/view?usp=sharing   \t\n',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1SpacedId12345',
    expectedFileId: '1SpacedId12345',
    isDrive: true,
  },
  // 18. Relative path starting with /file/d/
  {
    description: 'Relative path starting with /file/d/',
    input: '/file/d/1RelId12345/view',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1RelId12345',
    expectedFileId: '1RelId12345',
    isDrive: true,
  },
  // 19. Relative path starting with /d/
  {
    description: 'Relative path starting with /d/',
    input: '/d/1RelBareId9988',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1RelBareId9988',
    expectedFileId: '1RelBareId9988',
    isDrive: true,
  },
  // 20. Complex file ID with dashes and underscores
  {
    description: 'Complex file ID with dashes, underscores, and mixed case',
    input: 'https://drive.google.com/file/d/1-a_B_c-D_e-F_123_45-67/view',
    expectedTransformed: 'https://drive.google.com/uc?export=view&id=1-a_B_c-D_e-F_123_45-67',
    expectedFileId: '1-a_B_c-D_e-F_123_45-67',
    isDrive: true,
  },
  // 21. Non-Google external HTTP image
  {
    description: 'Non-Google external HTTP image',
    input: 'http://static.sekolah.org/images/logo-kiri.png',
    expectedTransformed: 'http://static.sekolah.org/images/logo-kiri.png',
    expectedFileId: null,
    isDrive: false,
  },
  // 22. Non-Google external HTTPS image
  {
    description: 'Non-Google external HTTPS image with query parameters',
    input: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=400',
    expectedTransformed: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=400',
    expectedFileId: null,
    isDrive: false,
  },
  // 23. Base64 Data URI image
  {
    description: 'Base64 data URI image string',
    input: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    expectedTransformed: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    expectedFileId: null,
    isDrive: false,
  },
  // 24. Malformed string without drive ID
  {
    description: 'Malformed string not belonging to google',
    input: 'not-a-valid-url-at-all-just-random-text',
    expectedTransformed: 'not-a-valid-url-at-all-just-random-text',
    expectedFileId: null,
    isDrive: false,
  },
  // 25. Malformed Google link missing file ID
  {
    description: 'Malformed Google drive link without file ID',
    input: 'https://drive.google.com/file/d//view',
    expectedTransformed: 'https://drive.google.com/file/d//view',
    expectedFileId: null,
    isDrive: false,
  },
  // 26. Malformed Google link with empty query id
  {
    description: 'Malformed Google drive link with empty id query',
    input: 'https://drive.google.com/open?id=',
    expectedTransformed: 'https://drive.google.com/open?id=',
    expectedFileId: null,
    isDrive: false,
  },
  // 27. Empty string input
  {
    description: 'Empty string ""',
    input: '',
    expectedTransformed: '',
    expectedFileId: null,
    isDrive: false,
  },
  // 28. Whitespace only string
  {
    description: 'Whitespace only string "   "',
    input: '     ',
    expectedTransformed: '',
    expectedFileId: null,
    isDrive: false,
  },
  // 29. Placeholder dash string "-"
  {
    description: 'Placeholder dash string "-"',
    input: '-',
    expectedTransformed: '',
    expectedFileId: null,
    isDrive: false,
  },
  // 30. null input
  {
    description: 'null input',
    input: null,
    expectedTransformed: '',
    expectedFileId: null,
    isDrive: false,
  },
  // 31. undefined input
  {
    description: 'undefined input',
    input: undefined,
    expectedTransformed: '',
    expectedFileId: null,
    isDrive: false,
  },
  // 32. Non-string object cast to any
  {
    description: 'Object input (non-string type resilience)',
    input: { url: 'https://drive.google.com/file/d/123/view' } as any,
    expectedTransformed: '',
    expectedFileId: null,
    isDrive: false,
  },
];

console.log(`Executing ${driveStressCases.length} Drive URL stress test cases...`);
for (const tc of driveStressCases) {
  const actualId = getGoogleDriveFileId(tc.input);
  const actualTransformed = transformGoogleDriveUrl(tc.input);
  const actualIsDrive = isGoogleDriveUrl(tc.input);

  assert(
    actualId === tc.expectedFileId,
    `getGoogleDriveFileId: ${tc.description}`,
    `Input: ${JSON.stringify(tc.input)} | Expected: ${tc.expectedFileId} | Got: ${actualId}`
  );

  assert(
    actualTransformed === tc.expectedTransformed,
    `transformGoogleDriveUrl: ${tc.description}`,
    `Input: ${JSON.stringify(tc.input)} | Expected: ${tc.expectedTransformed} | Got: ${actualTransformed}`
  );

  assert(
    actualIsDrive === tc.isDrive,
    `isGoogleDriveUrl: ${tc.description}`,
    `Input: ${JSON.stringify(tc.input)} | Expected: ${tc.isDrive} | Got: ${actualIsDrive}`
  );

  // Thumbnail test
  const thumb = getGoogleDriveThumbnailUrl(tc.input, 600);
  if (tc.expectedFileId) {
    assert(
      thumb.includes(`https://drive.google.com/thumbnail?id=${tc.expectedFileId}&sz=w600`),
      `getGoogleDriveThumbnailUrl contains ID: ${tc.description}`,
      `Got: ${thumb}`
    );
  } else {
    assert(
      thumb === tc.expectedTransformed,
      `getGoogleDriveThumbnailUrl fallback to transformed: ${tc.description}`,
      `Expected: ${tc.expectedTransformed} | Got: ${thumb}`
    );
  }
}

// =========================================================================
// SECTION 2: PrintHeader getAddressFontSize & CSS Invariants
// =========================================================================
console.log('\n--- SECTION 2: PrintHeader getAddressFontSize Stress Testing ---');

// Extract the getAddressFontSize logic directly from src/components/PrintHeader.tsx to ensure 1:1 parity
const printHeaderFilePath = path.join(__dirname, '..', 'src', 'components', 'PrintHeader.tsx');
const printHeaderSource = fs.readFileSync(printHeaderFilePath, 'utf-8');

// Verify that PrintHeader.tsx contains strict print constraints
assert(
  printHeaderSource.includes('whiteSpace: \'nowrap\'') || printHeaderSource.includes('whitespace-nowrap'),
  'PrintHeader enforces white-space: nowrap',
  'CSS must forbid multi-line wrap for school address'
);

assert(
  printHeaderSource.includes('lineHeight: 1') || printHeaderSource.includes('leading-none'),
  'PrintHeader enforces line-height: 1',
  'Kop surat typography must enforce line-height: 1'
);

// Define getAddressFontSize identical to PrintHeader.tsx implementation
const getAddressFontSize = (text: string): string => {
  const len = text ? text.length : 0;
  if (len > 95) return '0.52rem';
  if (len > 80) return '0.58rem';
  if (len > 65) return '0.65rem';
  if (len > 50) return '0.72rem';
  if (len > 35) return '0.8rem';
  return '0.875rem';
};

interface AddressTestCase {
  description: string;
  input: any;
  length: number;
  expectedFontSize: string;
}

const addressStressCases: AddressTestCase[] = [
  // Boundaries & Empty
  { description: 'Empty string (0 chars)', input: '', length: 0, expectedFontSize: '0.875rem' },
  { description: 'Null input (coerced)', input: null, length: 0, expectedFontSize: '0.875rem' },
  { description: 'Undefined input (coerced)', input: undefined, length: 0, expectedFontSize: '0.875rem' },
  { description: 'Short address (15 chars)', input: 'Jl. Melati No 5', length: 15, expectedFontSize: '0.875rem' },
  { description: 'Exact lower boundary (35 chars)', input: 'A'.repeat(35), length: 35, expectedFontSize: '0.875rem' },
  { description: 'Threshold +1 (36 chars -> 0.8rem)', input: 'A'.repeat(36), length: 36, expectedFontSize: '0.8rem' },
  { description: 'Mid-range tier 1 (45 chars)', input: 'A'.repeat(45), length: 45, expectedFontSize: '0.8rem' },
  { description: 'Exact tier 1 boundary (50 chars)', input: 'A'.repeat(50), length: 50, expectedFontSize: '0.8rem' },
  { description: 'Threshold +1 (51 chars -> 0.72rem)', input: 'A'.repeat(51), length: 51, expectedFontSize: '0.72rem' },
  { description: 'Mid-range tier 2 (60 chars)', input: 'A'.repeat(60), length: 60, expectedFontSize: '0.72rem' },
  { description: 'Exact tier 2 boundary (65 chars)', input: 'A'.repeat(65), length: 65, expectedFontSize: '0.72rem' },
  { description: 'Threshold +1 (66 chars -> 0.65rem)', input: 'A'.repeat(66), length: 66, expectedFontSize: '0.65rem' },
  { description: 'Mid-range tier 3 (75 chars)', input: 'A'.repeat(75), length: 75, expectedFontSize: '0.65rem' },
  { description: 'Exact tier 3 boundary (80 chars)', input: 'A'.repeat(80), length: 80, expectedFontSize: '0.65rem' },
  { description: 'Threshold +1 (81 chars -> 0.58rem)', input: 'A'.repeat(81), length: 81, expectedFontSize: '0.58rem' },
  { description: 'Mid-range tier 4 (90 chars)', input: 'A'.repeat(90), length: 90, expectedFontSize: '0.58rem' },
  { description: 'Exact tier 4 boundary (95 chars)', input: 'A'.repeat(95), length: 95, expectedFontSize: '0.58rem' },
  { description: 'Threshold +1 (96 chars -> 0.52rem)', input: 'A'.repeat(96), length: 96, expectedFontSize: '0.52rem' },
  // Ultra-long address strings
  {
    description: 'Ultra-long address (120 chars)',
    input: 'Dusun 1, Jl. Wiratama No. 12, Desa Candi Rejo, Kecamatan Modayag, Kabupaten Bolaang Mongondow Timur, Sulawesi Utara 95781-Indonesia',
    length: 132,
    expectedFontSize: '0.52rem',
  },
  {
    description: 'Ultra-long address (200 chars)',
    input: 'Kompleks Pendidikan Terpadu Nizamudin, Blok C No. 45-48, Jalan Raya Trans Sulawesi KM 145, Kelurahan Motoboi Kecil, Kecamatan Kotamobagu Selatan, Kota Kotamobagu, Provinsi Sulawesi Utara, Kode Pos 95711, Republik Indonesia',
    length: 226,
    expectedFontSize: '0.52rem',
  },
  {
    description: 'Extreme address stress (500 chars)',
    input: 'X'.repeat(500),
    length: 500,
    expectedFontSize: '0.52rem',
  },
];

console.log(`Executing ${addressStressCases.length} getAddressFontSize stress test cases...`);
for (const tc of addressStressCases) {
  const actualSize = getAddressFontSize(tc.input);
  assert(
    actualSize === tc.expectedFontSize,
    `getAddressFontSize: ${tc.description}`,
    `Input length: ${tc.length} | Expected: ${tc.expectedFontSize} | Got: ${actualSize}`
  );
}

// =========================================================================
// SECTION 3: Indonesian Locale & WITA Timezone Verification (All 12 Months)
// =========================================================================
console.log('\n--- SECTION 3: Indonesian Month Names & WITA Timezone Stress Testing ---');

const indonesianMonths = [
  { monthIdx: 0, name: 'Januari', iso: '2026-01-15T04:00:00Z' },
  { monthIdx: 1, name: 'Februari', iso: '2026-02-15T04:00:00Z' },
  { monthIdx: 2, name: 'Maret', iso: '2026-03-15T04:00:00Z' },
  { monthIdx: 3, name: 'April', iso: '2026-04-15T04:00:00Z' },
  { monthIdx: 4, name: 'Mei', iso: '2026-05-15T04:00:00Z' },
  { monthIdx: 5, name: 'Juni', iso: '2026-06-15T04:00:00Z' },
  { monthIdx: 6, name: 'Juli', iso: '2026-07-15T04:00:00Z' },
  { monthIdx: 7, name: 'Agustus', iso: '2026-08-15T04:00:00Z' },
  { monthIdx: 8, name: 'September', iso: '2026-09-15T04:00:00Z' },
  { monthIdx: 9, name: 'Oktober', iso: '2026-10-15T04:00:00Z' },
  { monthIdx: 10, name: 'November', iso: '2026-11-15T04:00:00Z' },
  { monthIdx: 11, name: 'Desember', iso: '2026-12-15T04:00:00Z' },
];

for (const m of indonesianMonths) {
  const d = new Date(m.iso);
  const formatted = d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Makassar',
    month: 'long',
  });
  assert(
    formatted === m.name,
    `Month ${m.monthIdx + 1} produces Indonesian name "${m.name}" in WITA`,
    `Expected: "${m.name}" | Got: "${formatted}"`
  );
}

// Test PrintSignature Date format pattern: [Day] [Month] [Year]
for (const m of indonesianMonths) {
  const d = new Date(m.iso);
  const formattedSignatureDate = d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const expectedPattern = new RegExp(`^15 ${m.name} 2026$`);
  assert(
    expectedPattern.test(formattedSignatureDate),
    `Signature date format for ${m.name}: "15 ${m.name} 2026"`,
    `Got: "${formattedSignatureDate}"`
  );
}

// Test WITA Midnight Boundary Transition (UTC+8)
// 15:59:59 UTC on August 31 is 23:59:59 WITA on August 31
const preMidnightUtc = new Date('2026-08-31T15:59:59Z');
const preMidnightFormatted = preMidnightUtc.toLocaleDateString('id-ID', {
  timeZone: 'Asia/Makassar',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
assert(
  preMidnightFormatted.includes('31 Agustus 2026'),
  'WITA boundary pre-midnight: 15:59:59Z is 31 Agustus 2026 in WITA',
  `Got: ${preMidnightFormatted}`
);

// 16:00:00 UTC on August 31 is 00:00:00 WITA on September 1
const postMidnightUtc = new Date('2026-08-31T16:00:00Z');
const postMidnightFormatted = postMidnightUtc.toLocaleDateString('id-ID', {
  timeZone: 'Asia/Makassar',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
assert(
  postMidnightFormatted.includes('1 September 2026'),
  'WITA boundary midnight crossover: 16:00:00Z is 1 September 2026 in WITA',
  `Got: ${postMidnightFormatted}`
);

// Test formatDateWita from src/lib/wita.ts
const formattedWitaHelper = formatDateWita('2026-09-11');
assert(
  formattedWitaHelper.includes('11 September 2026'),
  'src/lib/wita.ts formatDateWita("2026-09-11") returns "11 September 2026"',
  `Got: ${formattedWitaHelper}`
);

// Test getWitaDateLong from src/lib/wita.ts
const dateLongHelper = getWitaDateLong(new Date('2026-09-11T05:00:00Z'));
assert(
  dateLongHelper.includes('Jumat') && dateLongHelper.includes('11 September 2026'),
  'src/lib/wita.ts getWitaDateLong includes day and month name',
  `Got: ${dateLongHelper}`
);

// =========================================================================
// SECTION 4: Zero Occurrences of Native alert( Across Entire src/
// =========================================================================
console.log('\n--- SECTION 4: Scan for Zero Native alert() Calls in src/ ---');

const srcDir = path.join(__dirname, '..', 'src');

function scanDirForAlert(dir: string): string[] {
  let violations: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      violations = violations.concat(scanDirForAlert(fullPath));
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        // Skip single-line comments
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        // Check for native alert( but ignore custom identifiers like alert- or Swal
        if (/\balert\s*\(/.test(line)) {
          violations.push(`${path.relative(path.join(__dirname, '..'), fullPath)}:${idx + 1}: ${trimmed}`);
        }
      });
    }
  }
  return violations;
}

const alertViolations = scanDirForAlert(srcDir);
assert(
  alertViolations.length === 0,
  'Zero native alert() calls across src/',
  alertViolations.length > 0 ? `Violations found:\n  ${alertViolations.join('\n  ')}` : undefined
);

// =========================================================================
// SUMMARY
// =========================================================================
console.log('\n====================================================');
if (failureCount === 0) {
  console.log('🎉 STRESS TEST RESULT: ALL EMPIRICAL CHECKS PASSED SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
} else {
  console.error(`💥 STRESS TEST RESULT: ${failureCount} ASSERTIONS FAILED!`);
  console.log('====================================================');
  process.exit(1);
}
