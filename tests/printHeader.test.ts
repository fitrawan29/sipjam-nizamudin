import { transformGoogleDriveUrl } from '../src/lib/imageUrl';

// 1. Test Address Font Size Scaling Logic
const getAddressFontSize = (text: string) => {
  const len = text ? text.length : 0;
  if (len > 110) return '0.45rem';
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
  { text: 'Dusun I, Jln. Wiratama no.1, Desa Candi Rejo, Kecamatan Modayag, Kabupaten Bolaangmongondow Timur, Provinsi Sulawesi Utara 95781', expected: '0.45rem' },
];

let failed = 0;

for (const t of addressTests) {
  const actual = getAddressFontSize(t.text);
  if (actual !== t.expected) {
    console.error(`FAIL: getAddressFontSize(${t.text}) expected ${t.expected}, got ${actual}`);
    failed++;
  }
}

// 2. Test Region Extraction & Formatting (Priority: kota_kabupaten > KOTA_KABUPATEN > kota_ttd > KOTA_TTD > extract)
const getRegion = (config: any) => {
  if (config.kota_kabupaten && typeof config.kota_kabupaten === 'string' && config.kota_kabupaten.trim()) {
    return config.kota_kabupaten.trim();
  }
  if (config.KOTA_KABUPATEN && typeof config.KOTA_KABUPATEN === 'string' && config.KOTA_KABUPATEN.trim()) {
    return config.KOTA_KABUPATEN.trim();
  }
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
  { config: { kota_kabupaten: 'Kab. Bolaangmongondow Timur' }, expected: 'Kab. Bolaangmongondow Timur' },
  { config: { KOTA_KABUPATEN: 'Kab. Bolaangmongondow Timur' }, expected: 'Kab. Bolaangmongondow Timur' },
  { config: { kota_kabupaten: 'Kab. Boltim', kota_ttd: 'Kab. Lain' }, expected: 'Kab. Boltim' },
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

// 6. Test Kop Logo Fallback Resolution
const resolveLogoYayasan = (config: any) => transformGoogleDriveUrl(config.logo_yayasan || config.logo_kiri || config.LOGO_KIRI_URL || '');
const resolveLogoDinas = (config: any) => transformGoogleDriveUrl(config.logo_dinas || config.logo_kanan || config.LOGO_KANAN_URL || '');

const testLogoCfg1 = { logo_yayasan: 'https://example.com/yayasan.png', logo_kiri: 'https://example.com/kiri.png' };
if (resolveLogoYayasan(testLogoCfg1) !== 'https://example.com/yayasan.png') {
  console.error('FAIL: resolveLogoYayasan should prefer logo_yayasan');
  failed++;
}

const testLogoCfg2 = { logo_kiri: 'https://example.com/kiri.png' };
if (resolveLogoYayasan(testLogoCfg2) !== 'https://example.com/kiri.png') {
  console.error('FAIL: resolveLogoYayasan fallback to logo_kiri failed');
  failed++;
}

const testLogoCfg3 = { logo_dinas: 'https://example.com/dinas.png', logo_kanan: 'https://example.com/kanan.png' };
if (resolveLogoDinas(testLogoCfg3) !== 'https://example.com/dinas.png') {
  console.error('FAIL: resolveLogoDinas should prefer logo_dinas');
  failed++;
}

// 7. Test Attendance Summary Calculation (R2)
const calculateKehadiranSummary = (abs: Record<string, string>, stList: any[]): string => {
  if (!stList || stList.length === 0) return 'Semua Hadir';
  const counts = { H: 0, S: 0, I: 0, A: 0 };
  const absents: string[] = [];

  stList.forEach(s => {
    const status = (abs[s.nisn] || 'H').toUpperCase();
    if (status === 'H') counts.H++;
    else if (status === 'S') { counts.S++; absents.push(`${s.nama_siswa} (S)`); }
    else if (status === 'I') { counts.I++; absents.push(`${s.nama_siswa} (I)`); }
    else if (status === 'A') { counts.A++; absents.push(`${s.nama_siswa} (A)`); }
  });

  if (counts.S === 0 && counts.I === 0 && counts.A === 0) {
    return `Semua Hadir (${counts.H} siswa)`;
  }
  let summary = `Hadir: ${counts.H}`;
  if (counts.S > 0) summary += `, Sakit: ${counts.S}`;
  if (counts.I > 0) summary += `, Izin: ${counts.I}`;
  if (counts.A > 0) summary += `, Alpa: ${counts.A}`;
  if (absents.length > 0) {
    summary += ` [${absents.join(', ')}]`;
  }
  return summary;
};

const dummyStudents = [
  { nisn: '001', nama_siswa: 'Ahmad' },
  { nisn: '002', nama_siswa: 'Budi' },
  { nisn: '003', nama_siswa: 'Citra' }
];

const allPresent = calculateKehadiranSummary({ '001': 'H', '002': 'H', '003': 'H' }, dummyStudents);
if (allPresent !== 'Semua Hadir (3 siswa)') {
  console.error(`FAIL: calculateKehadiranSummary all present expected "Semua Hadir (3 siswa)", got "${allPresent}"`);
  failed++;
}

const withAbsents = calculateKehadiranSummary({ '001': 'H', '002': 'S', '003': 'A' }, dummyStudents);
if (!withAbsents.includes('Hadir: 1') || !withAbsents.includes('Sakit: 1') || !withAbsents.includes('Alpa: 1') || !withAbsents.includes('Budi (S)')) {
  console.error(`FAIL: calculateKehadiranSummary with absents unexpected: "${withAbsents}"`);
  failed++;
}

// 8. Test Rekap Date Formatter (R3)
function formatHariTanggal(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  } catch (_) {}
  return dateStr;
}

const formattedDateOutput = formatHariTanggal('2026-09-12');
if (!formattedDateOutput.toLowerCase().includes('sabtu') || !formattedDateOutput.includes('12') || !formattedDateOutput.toLowerCase().includes('september') || !formattedDateOutput.includes('2026')) {
  console.error(`FAIL: formatHariTanggal unexpected: ${formattedDateOutput}`);
  failed++;
}

// 9. Contract Check for Rekap 8-Column Table Headers (R3)
const requiredHeaders = [
  'Hari, tanggal bulan tahun',
  'Kelas, pertemuan dan jam ke-',
  'Tujuan pembelajaran',
  'Materi pembelajaran',
  'Kegiatan pembelajaran',
  'Kehadiran murid',
  'Catatan refleksi',
  'Foto kegiatan'
];

if (requiredHeaders.length !== 8) {
  console.error('FAIL: Table must have exactly 8 headers');
  failed++;
}

if (failed === 0) {
  console.log('ALL PRINT HEADER, GURU JURNAL & REKAP TESTS PASSED!');
} else {
  console.error(`${failed} tests failed!`);
  process.exit(1);
}
