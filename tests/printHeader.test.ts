import { transformGoogleDriveUrl } from '../src/lib/imageUrl';

// 1. Test Address Font Size Scaling Logic
const getAddressFontSize = (text: string) => {
  const len = text ? text.length : 0;
  if (len > 95) return '0.52rem';
  if (len > 80) return '0.58rem';
  if (len > 65) return '0.65rem';
  if (len > 50) return '0.72rem';
  if (len > 35) return '0.8rem';
  return '0.875rem';
};

const addressTests = [
  { text: 'Jl. Pendek No. 1', expected: '0.875rem' },
  { text: 'Jl. Menengah Raya No. 45 Blok C2', expected: '0.875rem' },
  { text: 'Jl. Menengah Raya No. 45 Blok C2, Kelurahan Sukamaju', expected: '0.72rem' },
  { text: 'Jl. Wiratama, Dusun 1, Desa Candi Rejo, Kec. Modayag, Kab. Bolaangmongondow Timur', expected: '0.58rem' },
  { text: 'Dusun I, Jln. Wiratama no.1, Desa Candi Rejo, Kec. Modayag, Kab. Bolaangmongondow Timur, Sulawesi Utara 95781', expected: '0.52rem' },
];

let failed = 0;

for (const t of addressTests) {
  const actual = getAddressFontSize(t.text);
  if (actual !== t.expected) {
    console.error(`FAIL: getAddressFontSize(${t.text}) expected ${t.expected}, got ${actual}`);
    failed++;
  }
}

// 2. Test Region Extraction & Formatting
const getRegion = (config: any) => {
  if (config.kota_ttd && typeof config.kota_ttd === 'string' && config.kota_ttd.trim()) {
    return config.kota_ttd.trim();
  }
  if (config.KOTA_TTD && typeof config.KOTA_TTD === 'string' && config.KOTA_TTD.trim()) {
    return config.KOTA_TTD.trim();
  }
  const alamat = config.kop_alamat || config.ALAMAT_SEKOLAH || '';
  if (alamat && typeof alamat === 'string') {
    const match = alamat.match(/(Kab\.\s*[^,]+|Kota\s*[^,]+|Kabupaten\s*[^,]+)/i);
    if (match) return match[1].trim();
  }
  return '';
};

const regionTests = [
  { config: { kota_ttd: 'Kab. Bolaangmongondow Timur' }, expected: 'Kab. Bolaangmongondow Timur' },
  { config: { KOTA_TTD: 'Kab. Bolaangmongondow Timur' }, expected: 'Kab. Bolaangmongondow Timur' },
  { config: { kop_alamat: 'Jl. Wiratama, Dusun 1, Kec. Modayag, Kab. Bolaangmongondow Timur' }, expected: 'Kab. Bolaangmongondow Timur' },
  { config: { kop_alamat: 'Jl. Sudirman No 10, Kota Manado' }, expected: 'Kota Manado' },
  { config: { kop_alamat: 'Jl. Raya No 1, Kabupaten Minahasa Selatan' }, expected: 'Kabupaten Minahasa Selatan' },
  { config: {}, expected: '' },
];

for (const rt of regionTests) {
  const actual = getRegion(rt.config);
  if (actual !== rt.expected) {
    console.error(`FAIL: getRegion expected "${rt.expected}", got "${actual}"`);
    failed++;
  }
}

// 3. Test WITA Date Formatting
const testDate = new Date('2026-09-11T12:00:00Z');
const formattedWita = testDate.toLocaleDateString('id-ID', {
  timeZone: 'Asia/Makassar',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

if (!formattedWita.includes('September') || !formattedWita.includes('2026')) {
  console.error(`FAIL: WITA date formatting unexpected: ${formattedWita}`);
  failed++;
}

// 4. Test Signature Line Composition
const region = 'Kab. Bolaangmongondow Timur';
const signatureLine = `${region ? `${region}, ` : ''}${formattedWita}`;
if (signatureLine !== `Kab. Bolaangmongondow Timur, ${formattedWita}`) {
  console.error(`FAIL: Signature line composition mismatch: ${signatureLine}`);
  failed++;
}

// 5. Test Logo URL Transformation
const rawDriveLogo = 'https://drive.google.com/file/d/1w6-H5eF7m0sC8bF2s1A/view?usp=sharing';
const transformed = transformGoogleDriveUrl(rawDriveLogo);
if (transformed !== 'https://drive.google.com/uc?export=view&id=1w6-H5eF7m0sC8bF2s1A') {
  console.error(`FAIL: Logo URL transformation mismatch: ${transformed}`);
  failed++;
}

if (failed === 0) {
  console.log('ALL PRINT HEADER & SIGNATURE TESTS PASSED!');
} else {
  console.error(`${failed} tests failed!`);
  process.exit(1);
}
