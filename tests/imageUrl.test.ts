import {
  getGoogleDriveFileId,
  transformGoogleDriveUrl,
  getGoogleDriveThumbnailUrl,
  isGoogleDriveUrl,
} from '../src/lib/imageUrl';

const testCases: { input: string | null | undefined; expectedId: string | null; expectedDirect: string }[] = [
  {
    input: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144/view?usp=sharing',
    expectedId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
    expectedDirect: 'https://drive.google.com/uc?export=view&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
  },
  {
    input: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144/view',
    expectedId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
    expectedDirect: 'https://drive.google.com/uc?export=view&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
  },
  {
    input: 'https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
    expectedId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
    expectedDirect: 'https://drive.google.com/uc?export=view&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
  },
  {
    input: 'https://drive.google.com/uc?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
    expectedId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
    expectedDirect: 'https://drive.google.com/uc?export=view&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
  },
  {
    input: 'https://drive.google.com/uc?export=download&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
    expectedId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
    expectedDirect: 'https://drive.google.com/uc?export=view&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
  },
  {
    input: 'https://lh3.googleusercontent.com/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
    expectedId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
    expectedDirect: 'https://drive.google.com/uc?export=view&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144',
  },
  {
    input: 'https://example.com/logo.png',
    expectedId: null,
    expectedDirect: 'https://example.com/logo.png',
  },
  {
    input: '',
    expectedId: null,
    expectedDirect: '',
  },
  {
    input: '-',
    expectedId: null,
    expectedDirect: '',
  },
  {
    input: null,
    expectedId: null,
    expectedDirect: '',
  },
  {
    input: undefined,
    expectedId: null,
    expectedDirect: '',
  },
];

let failed = 0;
for (const tc of testCases) {
  const actualId = getGoogleDriveFileId(tc.input);
  const actualDirect = transformGoogleDriveUrl(tc.input);
  const isDrive = isGoogleDriveUrl(tc.input);
  const thumb = getGoogleDriveThumbnailUrl(tc.input, 400);

  if (actualId !== tc.expectedId) {
    console.error(`FAIL: getGoogleDriveFileId(${tc.input}) expected ${tc.expectedId}, got ${actualId}`);
    failed++;
  }
  if (actualDirect !== tc.expectedDirect) {
    console.error(`FAIL: transformGoogleDriveUrl(${tc.input}) expected ${tc.expectedDirect}, got ${actualDirect}`);
    failed++;
  }
  if (isDrive !== (tc.expectedId !== null)) {
    console.error(`FAIL: isGoogleDriveUrl(${tc.input}) expected ${tc.expectedId !== null}, got ${isDrive}`);
    failed++;
  }
  if (tc.expectedId && !thumb.includes(tc.expectedId)) {
    console.error(`FAIL: getGoogleDriveThumbnailUrl(${tc.input}) did not include file id`);
    failed++;
  }
}

if (failed === 0) {
  console.log(`ALL ${testCases.length} TESTS PASSED!`);
} else {
  console.error(`${failed} tests failed!`);
  process.exit(1);
}
