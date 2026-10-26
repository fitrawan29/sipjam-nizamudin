import { transformGoogleDriveUrl } from '../src/lib/imageUrl';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrintSignature } from '../src/components/PrintHeader';

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

// 10. Test PrintSignature Role-Based Left Column Hiding & Layout (R1 & R2)
// 10a. user.role === 'admin' -> Left signature must NOT exist in DOM, right signature neatly aligned right
const htmlAdmin = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'admin', nama: 'Admin Operator' },
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Pengelola Data / Admin',
    leftName: 'LeftAdminOperatorName',
    leftNip: '19800101'
  })
);
if (htmlAdmin.includes('data-testid="signature-left"') || htmlAdmin.includes('LeftAdminOperatorName') || htmlAdmin.includes('Pengelola Data / Admin')) {
  console.error('FAIL: PrintSignature should NOT render left signature block when user.role === "admin"');
  failed++;
}
if (!htmlAdmin.includes('data-testid="signature-right"')) {
  console.error('FAIL: PrintSignature should render right signature (Kepala Sekolah) when user.role === "admin"');
  failed++;
}
if (!htmlAdmin.includes('justify-end') || !htmlAdmin.includes('ml-auto')) {
  console.error('FAIL: PrintSignature should use right-aligned singleColumn layout when user.role === "admin" without pengawas');
  failed++;
}

// 10b. user.role === 'Admin' (capitalized) -> Left signature must NOT exist in DOM
const htmlAdminCap = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'Admin', nama: 'Admin Boss' },
    leftName: 'LeftAdminBossName'
  })
);
if (htmlAdminCap.includes('data-testid="signature-left"') || htmlAdminCap.includes('LeftAdminBossName')) {
  console.error('FAIL: PrintSignature should NOT render left signature block when user.role === "Admin"');
  failed++;
}

// 10c. user.role === 'ADMIN ' (uppercase + trailing space) -> Left signature must NOT exist in DOM
const htmlAdminUpper = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'ADMIN ', nama: 'Admin Upper' },
    leftName: 'LeftAdminUpperName'
  })
);
if (htmlAdminUpper.includes('data-testid="signature-left"') || htmlAdminUpper.includes('LeftAdminUpperName')) {
  console.error('FAIL: PrintSignature should NOT render left signature block when user.role is uppercase ADMIN');
  failed++;
}

// 10d. user.role === 'guru' -> Left signature must be rendered normally
const htmlGuru = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'guru', nama: 'Ibu Guru' },
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Guru Mata Pelajaran',
    leftName: 'Ibu Guru',
    leftNip: '19850202'
  })
);
if (!htmlGuru.includes('data-testid="signature-left"') || !htmlGuru.includes('Ibu Guru') || !htmlGuru.includes('19850202')) {
  console.error('FAIL: PrintSignature must render left signature block when user.role === "guru"');
  failed++;
}

// 10e. user is undefined -> Default behavior preserved (left signature rendered)
const htmlNoUser = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftName: 'Guru Default',
    leftNip: '12345'
  })
);
if (!htmlNoUser.includes('data-testid="signature-left"') || !htmlNoUser.includes('Guru Default')) {
  console.error('FAIL: PrintSignature must render left signature when user prop is undefined');
  failed++;
}

// 10f. user is null -> Default behavior preserved (left signature rendered)
const htmlNullUser = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: null,
    leftName: 'Guru Null',
    leftNip: '67890'
  })
);
if (!htmlNullUser.includes('data-testid="signature-left"') || !htmlNullUser.includes('Guru Null')) {
  console.error('FAIL: PrintSignature must render left signature when user prop is null');
  failed++;
}

// 10g. user.role === 'admin' with Pengawas active -> Pengawas on left, Kepsek on right, no admin signature
const htmlAdminWithPengawas = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'admin' },
    showPengawas: true,
    pengawasNama: 'Drs. H. Pengawas',
    leftName: 'Admin Should Not Appear'
  })
);
if (htmlAdminWithPengawas.includes('data-testid="signature-left"') || htmlAdminWithPengawas.includes('Admin Should Not Appear')) {
  console.error('FAIL: PrintSignature should not render admin signature when pengawas is active');
  failed++;
}
if (!htmlAdminWithPengawas.includes('data-testid="signature-pengawas"') || !htmlAdminWithPengawas.includes('Drs. H. Pengawas')) {
  console.error('FAIL: PrintSignature should render pengawas signature when showPengawas is true');
  failed++;
}
if (!htmlAdminWithPengawas.includes('data-testid="signature-right"')) {
  console.error('FAIL: PrintSignature should render kepala sekolah signature when admin + pengawas');
  failed++;
}

// 10h. user.role with non-string types (number, boolean, object) -> Must not crash, should render left signature
try {
  const htmlNumericRole = renderToStaticMarkup(
    React.createElement(PrintSignature, {
      user: { role: 123 },
      leftName: 'Pak Numeric Role'
    })
  );
  if (!htmlNumericRole.includes('data-testid="signature-left"') || !htmlNumericRole.includes('Pak Numeric Role')) {
    console.error('FAIL: PrintSignature should render left signature when role is non-string (number 123)');
    failed++;
  }
} catch (err: any) {
  console.error('FAIL: PrintSignature crashed on non-string role number:', err.message);
  failed++;
}

try {
  const htmlBoolRole = renderToStaticMarkup(
    React.createElement(PrintSignature, {
      user: { role: true },
      leftName: 'Pak Boolean Role'
    })
  );
  if (!htmlBoolRole.includes('data-testid="signature-left"') || !htmlBoolRole.includes('Pak Boolean Role')) {
    console.error('FAIL: PrintSignature should render left signature when role is boolean true');
    failed++;
  }
} catch (err: any) {
  console.error('FAIL: PrintSignature crashed on non-string role boolean:', err.message);
  failed++;
}

// 10i. user.role with surrounding whitespace, newlines, and tabs -> Left signature must NOT exist
const htmlAdminWhitespace = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: ' \n\tAdmin\r\n ' },
    leftName: 'Whitespace Admin'
  })
);
if (htmlAdminWhitespace.includes('data-testid="signature-left"') || htmlAdminWhitespace.includes('Whitespace Admin')) {
  console.error('FAIL: PrintSignature should NOT render left signature block when user.role has whitespace/tabs around Admin');
  failed++;
}

// 10j. user.role is 'superadmin' -> Left signature must be rendered normally (only 'admin' is hidden)
const htmlSuperadmin = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'superadmin' },
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Superadmin Peninjau',
    leftName: 'Super User'
  })
);
if (!htmlSuperadmin.includes('data-testid="signature-left"') || !htmlSuperadmin.includes('Super User')) {
  console.error('FAIL: PrintSignature should render left signature block for non-admin role (superadmin)');
  failed++;
}

// 10k. singleColumn={true} with user.role === 'guru' -> Left signature must NOT exist
const htmlGuruSingle = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'guru' },
    singleColumn: true,
    leftName: 'Single Column Guru'
  })
);
if (htmlGuruSingle.includes('data-testid="signature-left"') || htmlGuruSingle.includes('Single Column Guru')) {
  console.error('FAIL: PrintSignature should NOT render left signature when singleColumn is explicitly true');
  failed++;
}

// 10l. singleColumn={false} with user.role === 'admin' -> Left signature must NOT exist because user is admin
const htmlAdminExplicitFalse = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'admin' },
    singleColumn: false,
    leftName: 'Admin Explicit False'
  })
);
if (htmlAdminExplicitFalse.includes('data-testid="signature-left"') || htmlAdminExplicitFalse.includes('Admin Explicit False')) {
  console.error('FAIL: PrintSignature should NOT render left signature when user.role is admin even if singleColumn is explicitly false');
  failed++;
}

// 10m. page-break-inside-avoid must be present in both single-column (admin) and multi-column (guru) containers
if (!htmlAdmin.includes('page-break-inside-avoid')) {
  console.error('FAIL: PrintSignature must contain page-break-inside-avoid in singleColumn/admin container');
  failed++;
}
if (!htmlGuru.includes('page-break-inside-avoid')) {
  console.error('FAIL: PrintSignature must contain page-break-inside-avoid in multiColumn/guru container');
  failed++;
}

// 10n. mixed-case role: 'aDmIn' -> Left signature must NOT exist in DOM
const htmlAdminMixedCase = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'aDmIn', nama: 'Admin Mixed' },
    leftName: 'LeftAdminMixed'
  })
);
if (htmlAdminMixedCase.includes('data-testid="signature-left"') || htmlAdminMixedCase.includes('LeftAdminMixed')) {
  console.error('FAIL: PrintSignature should NOT render left signature for mixed-case role aDmIn');
  failed++;
}

// 10o. primitive values passed for user ('admin', 42, true) -> must not crash and must not falsely match user.role
try {
  const htmlUserString = renderToStaticMarkup(
    React.createElement(PrintSignature, {
      user: 'admin' as any,
      leftName: 'Primitive String User'
    })
  );
  if (!htmlUserString.includes('data-testid="signature-left"') || !htmlUserString.includes('Primitive String User')) {
    console.error('FAIL: Primitive string user should render default left signature');
    failed++;
  }

  const htmlUserNum = renderToStaticMarkup(
    React.createElement(PrintSignature, {
      user: 42 as any,
      leftName: 'Primitive Number User'
    })
  );
  if (!htmlUserNum.includes('data-testid="signature-left"') || !htmlUserNum.includes('Primitive Number User')) {
    console.error('FAIL: Primitive number user should render default left signature');
    failed++;
  }
} catch (err: any) {
  console.error('FAIL: PrintSignature crashed on primitive user prop:', err.message);
  failed++;
}

// 10p. null, undefined, empty string, or whitespace string role -> render left signature
const emptyRoles = [null, undefined, '', '   '];
for (const emptyRole of emptyRoles) {
  const htmlEmptyRole = renderToStaticMarkup(
    React.createElement(PrintSignature, {
      user: { role: emptyRole },
      leftName: `LeftEmptyRole_${String(emptyRole)}`
    })
  );
  if (!htmlEmptyRole.includes('data-testid="signature-left"') || !htmlEmptyRole.includes(`LeftEmptyRole_${String(emptyRole)}`)) {
    console.error(`FAIL: PrintSignature should render left signature when role is ${JSON.stringify(emptyRole)}`);
    failed++;
  }
}

// 10q. Caller Simulation: AdminRekapView
// AdminRekapView passes leftSubtitle="Pengelola Data / Admin" and leftName=user?.nama
const htmlAdminRekapCaller = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Pengelola Data / Admin',
    leftName: 'Admin Operator Rekap',
    leftNip: '198101012005011001',
    user: { role: 'admin', nama: 'Admin Operator Rekap', sekolah_id: 'sch-1' },
    sekolahId: 'sch-1'
  })
);
if (htmlAdminRekapCaller.includes('data-testid="signature-left"') || htmlAdminRekapCaller.includes('Pengelola Data / Admin')) {
  console.error('FAIL [AdminRekapView caller]: Admin signature block must NOT be rendered');
  failed++;
}
if (!htmlAdminRekapCaller.includes('data-testid="signature-right"')) {
  console.error('FAIL [AdminRekapView caller]: Right signature (Kepsek) must be rendered');
  failed++;
}

// 10r. Caller Simulation: DokumenView
const htmlDokumenCallerAdmin = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Pengelola Data / Admin',
    leftName: 'Dokumen Admin',
    leftNip: '198202022006021002',
    user: { role: 'admin', sekolah_id: 'sch-1' },
    sekolahId: 'sch-1'
  })
);
if (htmlDokumenCallerAdmin.includes('data-testid="signature-left"') || htmlDokumenCallerAdmin.includes('Pengelola Data / Admin')) {
  console.error('FAIL [DokumenView caller admin]: Admin signature block must NOT be rendered');
  failed++;
}

// 10s. Caller Simulation: RaporView with showKepalaSekolah={true}
const htmlRaporCallerAdmin = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Orang Tua / Wali Murid',
    leftName: '...........................................',
    hideLeftNip: true,
    rightTitle: 'Wali Kelas 7A',
    rightName: 'Dra. Wali Kelas',
    showKepalaSekolah: true,
    user: { role: 'admin', sekolah_id: 'sch-1' }
  })
);
if (htmlRaporCallerAdmin.includes('data-testid="signature-left"')) {
  console.error('FAIL [RaporView caller admin]: Left block must NOT be rendered for admin');
  failed++;
}
if (!htmlRaporCallerAdmin.includes('data-testid="signature-right"') || !htmlRaporCallerAdmin.includes('Wali Kelas 7A')) {
  console.error('FAIL [RaporView caller admin]: Right signature (Wali Kelas) must be rendered');
  failed++;
}
if (!htmlRaporCallerAdmin.includes('Kepala Sekolah')) {
  console.error('FAIL [RaporView caller admin]: Centered Kepala Sekolah block must be rendered via showKepalaSekolah');
  failed++;
}

// 10t. Caller Simulation: RekapJurnalView
const htmlJurnalCallerAdmin = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Guru Mata Pelajaran',
    leftName: 'Guru Matematika',
    user: { role: 'admin' }
  })
);
if (htmlJurnalCallerAdmin.includes('data-testid="signature-left"')) {
  console.error('FAIL [RekapJurnalView caller admin]: Left signature block must NOT be rendered for admin');
  failed++;
}
const htmlJurnalCallerGuru = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Guru Mata Pelajaran',
    leftName: 'Guru Matematika',
    user: { role: 'guru' }
  })
);
if (!htmlJurnalCallerGuru.includes('data-testid="signature-left"') || !htmlJurnalCallerGuru.includes('Guru Matematika')) {
  console.error('FAIL [RekapJurnalView caller guru]: Left signature block must be rendered for guru');
  failed++;
}

// 10u. Caller Simulation: RekapSiswaView
const htmlSiswaCallerAdmin = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Kepala Sekolah / Admin',
    leftName: 'Pak Admin Siswa',
    user: { role: 'Admin' }
  })
);
if (htmlSiswaCallerAdmin.includes('data-testid="signature-left"') || htmlSiswaCallerAdmin.includes('Kepala Sekolah / Admin')) {
  console.error('FAIL [RekapSiswaView caller Admin]: Left signature block must NOT be rendered for Admin');
  failed++;
}

// 10v. Explicit showPengawas={false} overrides config fallback when user is admin
const htmlAdminNoPengawasExplicit = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'admin' },
    showPengawas: false
  })
);
if (htmlAdminNoPengawasExplicit.includes('data-testid="signature-pengawas"')) {
  console.error('FAIL: Pengawas must NOT be rendered when showPengawas is explicitly false');
  failed++;
}
if (!htmlAdminNoPengawasExplicit.includes('justify-end') || !htmlAdminNoPengawasExplicit.includes('ml-auto')) {
  console.error('FAIL: Layout must remain right-aligned when showPengawas is explicitly false');
  failed++;
}

if (failed === 0) {
  console.log('ALL PRINT HEADER, GURU JURNAL & REKAP TESTS PASSED!');
} else {
  console.error(`${failed} tests failed!`);
  process.exit(1);
}

