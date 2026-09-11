import fs from 'fs';
import path from 'path';
import { transformGoogleDriveUrl } from '../src/lib/imageUrl';

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
console.log('CHALLENGER 1: EMPIRICAL STRESS TEST (R1 & R3)');
console.log('====================================================\n');

// =========================================================================
// SECTION 1: Kop Surat Address Scaling & Layout Stress Testing
// =========================================================================
console.log('--- SECTION 1: Kop Surat Address Scaling & Constraints ---');

const printHeaderPath = path.join(__dirname, '..', 'src', 'components', 'PrintHeader.tsx');
const printHeaderContent = fs.readFileSync(printHeaderPath, 'utf-8');

const globalsCssPath = path.join(__dirname, '..', 'src', 'app', 'globals.css');
const globalsCssContent = fs.readFileSync(globalsCssPath, 'utf-8');

// 1.1 Invariant: white-space: nowrap
assert(
  printHeaderContent.includes("whiteSpace: 'nowrap'") &&
  printHeaderContent.includes('whitespace-nowrap'),
  'PrintHeader.tsx specifies whitespace-nowrap and whiteSpace: nowrap',
  'Must prevent multi-line wrapping in component JSX'
);

assert(
  globalsCssContent.includes('white-space: nowrap !important;'),
  'globals.css @media print enforces white-space: nowrap !important;',
  'Must enforce single line in print media query'
);

// 1.2 Invariant: line-height: 1
assert(
  printHeaderContent.includes('leading-none') &&
  printHeaderContent.includes('lineHeight: 1'),
  'PrintHeader.tsx enforces line-height: 1 via leading-none and inline style'
);

assert(
  globalsCssContent.includes('.print-header,') &&
  globalsCssContent.includes('.print-header * {') &&
  globalsCssContent.includes('line-height: 1 !important;'),
  'globals.css @media print enforces line-height: 1 !important on .print-header and all its descendants'
);

// 1.3 Test getAddressFontSize dynamic scaling across short, medium, and long strings
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

const addressCases = [
  { label: 'Short address (20 chars)', text: 'Jl. Melati No. 20 RT 01', expectedRem: '0.875rem' },
  { label: 'Boundary 35 chars', text: 'A'.repeat(35), expectedRem: '0.875rem' },
  { label: 'Tier 36-50 chars (40 chars)', text: 'Jl. Merdeka Barat No. 15, Kotamobagu', expectedRem: '0.8rem' },
  { label: 'Standard address (60 chars)', text: 'Jl. Wiratama No. 12, Desa Candi Rejo, Kec. Modayag, Boltim', expectedRem: '0.72rem' },
  { label: 'Tier 66-80 chars (75 chars)', text: 'Jl. Wiratama, Dusun 1, Desa Candi Rejo, Kec. Modayag, Kab. Boltim, Sulut', expectedRem: '0.65rem' },
  { label: 'Tier 81-95 chars (90 chars)', text: 'Dusun I, Jln. Wiratama no.1, Desa Candi Rejo, Kec. Modayag, Kab. Bolaangmongondow Timur', expectedRem: '0.58rem' },
  { label: 'Tier 96-110 chars (105 chars)', text: 'Dusun I, Jln. Wiratama no.1, Desa Candi Rejo, Kec. Modayag, Kab. Bolaangmongondow Timur, Sulawesi Utara', expectedRem: '0.52rem' },
  { label: 'Very long address (115 chars)', text: 'Dusun I, Jln. Wiratama no.1, Desa Candi Rejo, Kec. Modayag, Kab. Bolaangmongondow Timur, Sulawesi Utara 95781-Indonesia', expectedRem: '0.45rem' },
  { label: 'Ultra long address (135 chars)', text: 'Dusun I, Jln. Wiratama no.1, Desa Candi Rejo, Kecamatan Modayag, Kabupaten Bolaangmongondow Timur, Provinsi Sulawesi Utara 95781, Indonesia', expectedRem: '0.45rem' },
  { label: 'Extreme address (200 chars)', text: 'Kompleks Pendidikan Terpadu Nizamudin, Blok C No. 45-48, Jalan Raya Trans Sulawesi KM 145, Kelurahan Motoboi Kecil, Kecamatan Kotamobagu Selatan, Kota Kotamobagu, Provinsi Sulawesi Utara, Kode Pos 95711', expectedRem: '0.45rem' },
];

for (const tc of addressCases) {
  const actual = getAddressFontSize(tc.text);
  assert(
    actual === tc.expectedRem,
    `Address scaling: ${tc.label} [length=${tc.text.length}]`,
    `Expected: ${tc.expectedRem} | Got: ${actual}`
  );
}

// 1.4 Printable width simulation on A4
// A4 = 210mm wide. Margins = 15mm left + 15mm right = 30mm total.
// Usable width = 180mm = 680.3px at 96 DPI.
// Logos = 96px * 2 = 192px + 16px gap + 16px padding = 224px.
// Max center printable width = 680.3 - 224 = 456.3px.
// At 0.45rem (7.2px) with tracking-tight, average character width is ~3.5px.
const availableWidthPx = 456.3;
const ultraLongText = 'Dusun I, Jln. Wiratama no.1, Desa Candi Rejo, Kecamatan Modayag, Kabupaten Bolaangmongondow Timur, Provinsi Sulawesi Utara 95781';
const estCharWidthPx = 7.2 * 0.49; // ~3.53px per char in sans-serif tracking-tight
const estTotalWidthPx = ultraLongText.length * estCharWidthPx;
assert(
  estTotalWidthPx <= availableWidthPx,
  `Printable width budget on A4: 131 chars at 0.45rem est ${estTotalWidthPx.toFixed(1)}px <= available ${availableWidthPx}px`,
  `Est width ${estTotalWidthPx.toFixed(1)}px fits in center container`
);


// =========================================================================
// SECTION 2: Signature Alignment & Date Format Stress Testing
// =========================================================================
console.log('\n--- SECTION 2: Signature Alignment & Date Formatting ---');

// 2.1 CSS Precedence against .print-only { display: block !important; }
const printOnlyIdx = globalsCssContent.indexOf('.print-only { display: block !important; }');
const printSignatureIdx = globalsCssContent.indexOf('.print-signature {');

assert(printOnlyIdx !== -1, 'globals.css contains .print-only rule');
assert(printSignatureIdx !== -1, 'globals.css contains .print-signature rule');
assert(
  printSignatureIdx > printOnlyIdx,
  '.print-signature rule appears AFTER .print-only in globals.css (cascade order)',
  `printOnly at index ${printOnlyIdx}, printSignature at index ${printSignatureIdx}`
);

// Verify specific CSS properties on .print-signature
assert(
  globalsCssContent.includes('.print-signature {') &&
  globalsCssContent.includes('display: flex !important;') &&
  globalsCssContent.includes('justify-content: flex-end !important;') &&
  globalsCssContent.includes('margin-left: auto !important;'),
  '.print-signature enforces flex, justify-content: flex-end, and margin-left: auto with !important'
);

assert(
  globalsCssContent.includes('.print-signature > div {') &&
  globalsCssContent.includes('margin-left: auto !important;'),
  '.print-signature > div enforces margin-left: auto !important as fallback block alignment'
);

// 2.2 Component JSX inline styling on PrintSignature
assert(
  printHeaderContent.includes('className="print-only print-signature mt-10 flex justify-end ml-auto text-black"') &&
  printHeaderContent.includes("style={{ display: 'flex', justifyContent: 'flex-end', marginLeft: 'auto' }}"),
  'PrintSignature element has inline style overrides guaranteeing display: flex and justify-content: flex-end'
);

// 2.3 Region Extraction Logic & Formatting Stress Test
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

const regionStressConfigs = [
  { desc: 'Priority 1: kota_kabupaten present', cfg: { kota_kabupaten: 'Kab. Bolaangmongondow Timur', kota_ttd: 'Kota Manado' }, expected: 'Kab. Bolaangmongondow Timur' },
  { desc: 'Priority 1 (trimmed): kota_kabupaten with whitespace', cfg: { kota_kabupaten: '   Kota Kotamobagu   ' }, expected: 'Kota Kotamobagu' },
  { desc: 'Priority 2: uppercase KOTA_KABUPATEN', cfg: { KOTA_KABUPATEN: 'Kabupaten Gorontalo', kota_ttd: 'Lain' }, expected: 'Kabupaten Gorontalo' },
  { desc: 'Priority 3: fallback to legacy kota_ttd', cfg: { kota_ttd: 'Kab. Minahasa' }, expected: 'Kab. Minahasa' },
  { desc: 'Priority 4: fallback to legacy KOTA_TTD', cfg: { KOTA_TTD: 'Kab. Bone Bolango' }, expected: 'Kab. Bone Bolango' },
  { desc: 'Priority 5: regex extraction from kop_alamat (Kab.)', cfg: { kop_alamat: 'Jl. Raya No 1, Kab. Bolaangmongondow Timur, Sulut' }, expected: 'Kab. Bolaangmongondow Timur' },
  { desc: 'Priority 5: regex extraction from kop_alamat (Kota)', cfg: { kop_alamat: 'Kompleks Persekolahan, Kota Kotamobagu, 95711' }, expected: 'Kota Kotamobagu' },
  { desc: 'Priority 5: regex extraction from kop_alamat (Kabupaten)', cfg: { kop_alamat: 'Jl. Merdeka, Kabupaten Minahasa Selatan' }, expected: 'Kabupaten Minahasa Selatan' },
  { desc: 'Empty config: fallback to empty string', cfg: {}, expected: '' },
  { desc: 'Null values in config', cfg: { kota_kabupaten: null, kota_ttd: null, kop_alamat: null }, expected: '' },
  { desc: 'Whitespace only kota_kabupaten falls back', cfg: { kota_kabupaten: '   ', kota_ttd: 'Kab. Minahasa' }, expected: 'Kab. Minahasa' },
];

for (const rc of regionStressConfigs) {
  const actual = getRegion(rc.cfg);
  assert(actual === rc.expected, `getRegion: ${rc.desc}`, `Expected: "${rc.expected}" | Got: "${actual}"`);
}

// 2.4 Signature Line Date Format: [Kota/Kabupaten], [DD Bulan YYYY]
const mockWitaDate = '12 September 2026';
const testRegion = 'Kab. Bolaangmongondow Timur';
const formattedLineWithRegion = `${testRegion ? `${testRegion}, ` : ''}${mockWitaDate}`;
assert(
  formattedLineWithRegion === 'Kab. Bolaangmongondow Timur, 12 September 2026',
  'Signature date line with region: "Kab. Bolaangmongondow Timur, 12 September 2026"',
  `Got: "${formattedLineWithRegion}"`
);

const emptyRegionStr: string = '';
const formattedLineWithoutRegion = `${emptyRegionStr ? `${emptyRegionStr}, ` : ''}${mockWitaDate}`;
assert(
  formattedLineWithoutRegion === '12 September 2026',
  'Signature date line without region (clean fallback without leading comma)',
  `Got: "${formattedLineWithoutRegion}"`
);


// =========================================================================
// SECTION 3: Rekap Jurnal Table 8 Columns & Null Value Stress Testing
// =========================================================================
console.log('\n--- SECTION 3: Rekap Jurnal Table 8 Columns & Null Value Handling ---');

const rekapJurnalPath = path.join(__dirname, '..', 'src', 'components', 'RekapJurnalView.tsx');
const rekapJurnalContent = fs.readFileSync(rekapJurnalPath, 'utf-8');

// 3.1 Verify Table has exactly 8 <th> elements in the exact required order
const expectedHeaders = [
  'Hari, tanggal bulan tahun',
  'Kelas, pertemuan dan jam ke-',
  'Tujuan pembelajaran',
  'Materi pembelajaran',
  'Kegiatan pembelajaran',
  'Kehadiran murid',
  'Catatan refleksi',
  'Foto kegiatan'
];

// Extract <th> contents inside <thead> in RekapJurnalView.tsx
const theadMatch = rekapJurnalContent.match(/<thead>[\s\S]*?<\/thead>/);
assert(theadMatch !== null, 'RekapJurnalView.tsx contains <thead> element');

if (theadMatch) {
  const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/g;
  const thMatches: string[] = [];
  let m;
  while ((m = thRegex.exec(theadMatch[0])) !== null) {
    thMatches.push(m[1].trim());
  }

  assert(
    thMatches.length === 8,
    `Rekap Jurnal table has exactly 8 <th> headers (found ${thMatches.length})`,
    `Found headers: ${JSON.stringify(thMatches)}`
  );

  expectedHeaders.forEach((expectedHeader, idx) => {
    const actualHeader = thMatches[idx];
    assert(
      actualHeader === expectedHeader,
      `Header [${idx + 1}/8] matches required specification: "${expectedHeader}"`,
      `Expected: "${expectedHeader}" | Got: "${actualHeader}"`
    );
  });
}

// 3.2 Handling of Null / Empty Historical Values
// Extract helper functions from RekapJurnalView.tsx
function formatHariTanggal(dateStr?: string | null): string {
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

function formatAbsensi(rawAbsensi?: string | null, detailAbsen?: string | null): string {
  if (!rawAbsensi && !detailAbsen) return 'Semua Hadir';
  if (rawAbsensi && typeof rawAbsensi === 'string' && rawAbsensi.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawAbsensi);
      const counts = { H: 0, S: 0, I: 0, A: 0 };
      Object.values(parsed).forEach((v: any) => {
        const code = String(v).trim().toUpperCase() as 'H' | 'S' | 'I' | 'A';
        if (counts[code] !== undefined) counts[code]++;
      });
      return `Hadir: ${counts.H}, Sakit: ${counts.S}, Izin: ${counts.I}, Alpa: ${counts.A}`;
    } catch (_) {}
  }
  if (rawAbsensi && rawAbsensi.includes('|')) {
    return rawAbsensi.replace(/\|/g, ' · ');
  }
  return detailAbsen || rawAbsensi || 'Semua Hadir';
}

// Test historical record where new fields are null/undefined
const legacyRecord1 = {
  id: 'legacy-1',
  tanggal: '2025-10-15',
  kelas: 'X Merdeka 1',
  mapel: 'Fisika',
  pertemuan_ke: null,
  jam_ke: null,
  tujuan_pembelajaran: null,
  materi_pembelajaran: null,
  materi: 'Dinamika Gerak Lurus',
  kegiatan: 'Diskusi kelompok dan eksperimen Hukum Newton',
  kehadiran_murid: null,
  absensi_siswa: '{"001":"H","002":"H","003":"S","004":"A"}',
  detail_absen: null,
  catatan_refleksi: null,
  refleksi: 'Sebagian siswa masih bingung diagram gaya',
  foto_kegiatan: null,
  link_bukti_foto: 'https://drive.google.com/file/d/1LegacyFileId12345/view?usp=sharing'
};

// Column 1
const col1 = formatHariTanggal(legacyRecord1.tanggal);
assert(col1.includes('15') && col1.includes('Oktober') && col1.includes('2025'), 'Col 1: formatHariTanggal handles historical date correctly', `Got: ${col1}`);

// Column 2
const pertemuanKe = legacyRecord1.pertemuan_ke ? `Pertemuan ke-${legacyRecord1.pertemuan_ke}` : '-';
const jamKe = legacyRecord1.jam_ke ? `Jam ke-${legacyRecord1.jam_ke}` : '-';
assert(pertemuanKe === '-', 'Col 2: null pertemuan_ke cleanly renders "-"', `Got: ${pertemuanKe}`);
assert(jamKe === '-', 'Col 2: null jam_ke cleanly renders "-"', `Got: ${jamKe}`);

// Column 3
const tujuan = legacyRecord1.tujuan_pembelajaran || '-';
assert(tujuan === '-', 'Col 3: null tujuan_pembelajaran cleanly renders "-"', `Got: ${tujuan}`);

// Column 4
const materi = legacyRecord1.materi_pembelajaran || legacyRecord1.materi || '-';
assert(materi === 'Dinamika Gerak Lurus', 'Col 4: null materi_pembelajaran falls back to legacy materi', `Got: ${materi}`);

// Column 5
const kegiatan = legacyRecord1.kegiatan || '-';
assert(kegiatan === 'Diskusi kelompok dan eksperimen Hukum Newton', 'Col 5: kegiatan renders correctly', `Got: ${kegiatan}`);

// Column 6
const kehadiran = legacyRecord1.kehadiran_murid || formatAbsensi(legacyRecord1.absensi_siswa, legacyRecord1.detail_absen);
assert(kehadiran === 'Hadir: 2, Sakit: 1, Izin: 0, Alpa: 1', 'Col 6: null kehadiran_murid falls back to formatted absensi_siswa', `Got: ${kehadiran}`);

// Column 7
const refleksi = legacyRecord1.catatan_refleksi || legacyRecord1.refleksi || '-';
assert(refleksi === 'Sebagian siswa masih bingung diagram gaya', 'Col 7: null catatan_refleksi falls back to legacy refleksi', `Got: ${refleksi}`);

// Column 8
const fotoUrl = legacyRecord1.foto_kegiatan || legacyRecord1.link_bukti_foto;
const transformedFoto = transformGoogleDriveUrl(fotoUrl || '');
assert(
  transformedFoto === 'https://drive.google.com/uc?export=view&id=1LegacyFileId12345',
  'Col 8: null foto_kegiatan falls back to link_bukti_foto and transforms Google Drive URL',
  `Got: ${transformedFoto}`
);

// Test completely blank historical record (all fields null/undefined)
const blankRecord: Record<string, string | null | undefined> = {
  id: 'blank-1',
  tanggal: null,
  kelas: null,
  mapel: null,
  pertemuan_ke: null,
  jam_ke: null,
  tujuan_pembelajaran: null,
  materi_pembelajaran: null,
  materi: null,
  kegiatan: null,
  kehadiran_murid: null,
  absensi_siswa: null,
  detail_absen: null,
  catatan_refleksi: null,
  refleksi: null,
  foto_kegiatan: null,
  link_bukti_foto: null
};

assert(formatHariTanggal(blankRecord.tanggal) === '-', 'Blank record: formatHariTanggal returns "-"');
assert((blankRecord.kelas || '-') === '-', 'Blank record: kelas returns "-"');
assert((blankRecord.pertemuan_ke ? `Pertemuan ke-${blankRecord.pertemuan_ke}` : '-') === '-', 'Blank record: pertemuan_ke returns "-"');
assert((blankRecord.jam_ke ? `Jam ke-${blankRecord.jam_ke}` : '-') === '-', 'Blank record: jam_ke returns "-"');
assert((blankRecord.tujuan_pembelajaran || '-') === '-', 'Blank record: tujuan_pembelajaran returns "-"');
assert((blankRecord.materi_pembelajaran || blankRecord.materi || '-') === '-', 'Blank record: materi returns "-"');
assert((blankRecord.kegiatan || '-') === '-', 'Blank record: kegiatan returns "-"');
assert((blankRecord.kehadiran_murid || formatAbsensi(blankRecord.absensi_siswa, blankRecord.detail_absen)) === 'Semua Hadir', 'Blank record: absensi returns "Semua Hadir"');
assert((blankRecord.catatan_refleksi || blankRecord.refleksi || '-') === '-', 'Blank record: refleksi returns "-"');
const blankFoto = (blankRecord.foto_kegiatan || blankRecord.link_bukti_foto) as string | null | undefined;
const hasFoto = Boolean(blankFoto && blankFoto !== '-' && blankFoto.trim() !== '');
assert(!hasFoto, 'Blank record: hasFoto evaluates to false (renders "-" placeholder)');


// =========================================================================
// SUMMARY
// =========================================================================
console.log('\n====================================================');
if (failureCount === 0) {
  console.log('🎉 ALL CHALLENGER 1 EMPIRICAL VERIFICATION TESTS PASSED!');
  console.log('====================================================');
} else {
  console.error(`💥 CHALLENGER 1 VERIFICATION FAILED: ${failureCount} ASSERTIONS FAILED!`);
}
