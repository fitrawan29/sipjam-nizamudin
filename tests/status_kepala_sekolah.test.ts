import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  formatKepalaSekolahLabel,
  formatKepalaSekolahTitle,
  normalizeStatusPrefix
} from '../src/utils/textUtils';
import { PrintSignature } from '../src/components/PrintHeader';
import { checkIsKepalaSekolah } from '../src/hooks/useKepalaSekolah';

console.log('========================================================================');
console.log('STATUS KEPALA SEKOLAH (DEFINITIF, PLT, PLH) AUTOMATED TEST SUITE');
console.log('========================================================================\n');

let passCount = 0;
let failCount = 0;

function check(desc: string, condition: boolean, details?: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${desc}`);
    passCount++;
  } else {
    console.error(`  ✖ [FAIL] ${desc}${details ? ` -> ${details}` : ''}`);
    failCount++;
  }
}

// =========================================================================
// SUITE 1: Text Utilities & Formatting Logic (textUtils.ts)
// =========================================================================
console.log('--- Suite 1: Text Utilities & Formatting Logic ---');

// 1.1 normalizeStatusPrefix
check(
  '1.1.1 normalizeStatusPrefix returns "Plt. " for Plt variants',
  normalizeStatusPrefix('Plt') === 'Plt. ' &&
  normalizeStatusPrefix('plt') === 'Plt. ' &&
  normalizeStatusPrefix('PLT') === 'Plt. ' &&
  normalizeStatusPrefix('Plt (Pelaksana Tugas)') === 'Plt. '
);

check(
  '1.1.2 normalizeStatusPrefix returns "Plh. " for Plh variants',
  normalizeStatusPrefix('Plh') === 'Plh. ' &&
  normalizeStatusPrefix('plh') === 'Plh. ' &&
  normalizeStatusPrefix('PLH') === 'Plh. ' &&
  normalizeStatusPrefix('Plh (Pelaksana Harian)') === 'Plh. '
);

check(
  '1.1.3 normalizeStatusPrefix returns "" for Definitif, empty, or undefined',
  normalizeStatusPrefix('Definitif') === '' &&
  normalizeStatusPrefix('definitif') === '' &&
  normalizeStatusPrefix('') === '' &&
  normalizeStatusPrefix(null) === '' &&
  normalizeStatusPrefix(undefined) === ''
);

// 1.2 formatKepalaSekolahLabel
check(
  '1.2.1 formatKepalaSekolahLabel returns "Plt. Kepala Sekolah" for Plt',
  formatKepalaSekolahLabel('Plt') === 'Plt. Kepala Sekolah' &&
  formatKepalaSekolahLabel('plt') === 'Plt. Kepala Sekolah' &&
  formatKepalaSekolahLabel('Plt (Pelaksana Tugas)') === 'Plt. Kepala Sekolah'
);

check(
  '1.2.2 formatKepalaSekolahLabel returns "Plh. Kepala Sekolah" for Plh',
  formatKepalaSekolahLabel('Plh') === 'Plh. Kepala Sekolah' &&
  formatKepalaSekolahLabel('plh') === 'Plh. Kepala Sekolah' &&
  formatKepalaSekolahLabel('Plh (Pelaksana Harian)') === 'Plh. Kepala Sekolah'
);

check(
  '1.2.3 formatKepalaSekolahLabel returns "Kepala Sekolah" for Definitif, null, undefined, and empty string',
  formatKepalaSekolahLabel('Definitif') === 'Kepala Sekolah' &&
  formatKepalaSekolahLabel('definitif') === 'Kepala Sekolah' &&
  formatKepalaSekolahLabel(null) === 'Kepala Sekolah' &&
  formatKepalaSekolahLabel(undefined) === 'Kepala Sekolah' &&
  formatKepalaSekolahLabel('') === 'Kepala Sekolah'
);

// 1.3 formatKepalaSekolahTitle backward compatibility & enhancements
check(
  '1.3.1 formatKepalaSekolahTitle preserves backward compatibility with standard school names',
  formatKepalaSekolahTitle('SMA NIZAMUDIN ') === 'Kepala SMA Nizamudin' &&
  formatKepalaSekolahTitle('smk negeri 2 mataram') === 'Kepala SMK Negeri 2 Mataram' &&
  formatKepalaSekolahTitle('Kepala SMA NIZAMUDIN') === 'Kepala SMA Nizamudin' &&
  formatKepalaSekolahTitle('Kepala Sekolah SMA NIZAMUDIN') === 'Kepala SMA Nizamudin' &&
  formatKepalaSekolahTitle('') === 'Kepala Sekolah' &&
  formatKepalaSekolahTitle(null) === 'Kepala Sekolah'
);

check(
  '1.3.2 formatKepalaSekolahTitle formats title with Plt status prefix',
  formatKepalaSekolahTitle('', 'Plt') === 'Plt. Kepala Sekolah' &&
  formatKepalaSekolahTitle('Kepala Sekolah', 'Plt') === 'Plt. Kepala Sekolah' &&
  formatKepalaSekolahTitle('SMA NIZAMUDIN', 'Plt') === 'Plt. Kepala SMA Nizamudin' &&
  formatKepalaSekolahTitle('Plt. Kepala SMA NIZAMUDIN', 'Plt') === 'Plt. Kepala SMA Nizamudin' &&
  formatKepalaSekolahTitle('Plt. Kepala Sekolah', 'Plt') === 'Plt. Kepala Sekolah'
);

check(
  '1.3.3 formatKepalaSekolahTitle formats title with Plh status prefix',
  formatKepalaSekolahTitle('', 'Plh') === 'Plh. Kepala Sekolah' &&
  formatKepalaSekolahTitle('Kepala Sekolah', 'Plh') === 'Plh. Kepala Sekolah' &&
  formatKepalaSekolahTitle('SMA NIZAMUDIN', 'Plh') === 'Plh. Kepala SMA Nizamudin' &&
  formatKepalaSekolahTitle('Plh. Kepala Sekolah', 'Plh') === 'Plh. Kepala Sekolah'
);

check(
  '1.3.4 formatKepalaSekolahTitle formats title with Definitif status (no extra prefix)',
  formatKepalaSekolahTitle('', 'Definitif') === 'Kepala Sekolah' &&
  formatKepalaSekolahTitle('Kepala Sekolah', 'Definitif') === 'Kepala Sekolah' &&
  formatKepalaSekolahTitle('SMA NIZAMUDIN', 'Definitif') === 'Kepala SMA Nizamudin'
);

// =========================================================================
// SUITE 2: Component Rendering & Print Layout Verification (PrintSignature)
// =========================================================================
console.log('\n--- Suite 2: Component Rendering & Print Layout Verification ---');

// 2.1 Plt Status in PrintSignature (Right Signature)
const htmlPlt = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'admin', nama: 'Admin User' },
    statusKepalaSekolah: 'Plt',
    rightName: 'Drs. H. Ahmad Fauzi, M.Pd',
    rightNip: '197505052000031001'
  })
);

check(
  '2.1.1 PrintSignature renders "Plt. Kepala Sekolah" when statusKepalaSekolah is "Plt"',
  htmlPlt.includes('Plt. Kepala Sekolah')
);

check(
  '2.1.2 PrintSignature includes headmaster name and NIP correctly',
  htmlPlt.includes('Drs. H. Ahmad Fauzi, M.Pd') &&
  htmlPlt.includes('197505052000031001')
);

// 2.2 Plh Status in PrintSignature (Right Signature)
const htmlPlh = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'admin', nama: 'Admin User' },
    statusKepalaSekolah: 'Plh',
    rightName: 'Dra. Hj. Nur Hasanah, M.Pd',
    rightNip: '197801012005012002'
  })
);

check(
  '2.2.1 PrintSignature renders "Plh. Kepala Sekolah" when statusKepalaSekolah is "Plh"',
  htmlPlh.includes('Plh. Kepala Sekolah')
);

check(
  '2.2.2 PrintSignature includes Plh headmaster name and NIP correctly',
  htmlPlh.includes('Dra. Hj. Nur Hasanah, M.Pd') &&
  htmlPlh.includes('197801012005012002')
);

// 2.3 Definitif Status in PrintSignature (Right Signature)
const htmlDefinitif = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'admin', nama: 'Admin User' },
    statusKepalaSekolah: 'Definitif',
    rightName: 'Dr. Muhammad Ridwan, M.Pd',
    rightNip: '196803031995121001'
  })
);

check(
  '2.3.1 PrintSignature renders "Kepala Sekolah" without status prefix when status is "Definitif"',
  htmlDefinitif.includes('Kepala Sekolah') &&
  !htmlDefinitif.includes('Plt.') &&
  !htmlDefinitif.includes('Plh.')
);

// 2.4 Default/Unspecified Status in PrintSignature
const htmlDefault = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    user: { role: 'admin', nama: 'Admin User' },
    rightName: 'Dr. Muhammad Ridwan, M.Pd'
  })
);

check(
  '2.4.1 PrintSignature defaults to "Kepala Sekolah" when status is not specified',
  htmlDefault.includes('Kepala Sekolah') &&
  !htmlDefault.includes('Plt.') &&
  !htmlDefault.includes('Plh.')
);

// 2.5 showKepalaSekolah in PrintSignature (as used in RaporView)
const htmlRaporPlt = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Orang Tua / Wali Murid',
    rightTitle: 'Wali Kelas VII-A',
    rightName: 'Siti Aminah, S.Pd',
    showKepalaSekolah: true,
    statusKepalaSekolah: 'Plt',
    user: { role: 'guru', nama: 'Siti Aminah, S.Pd' }
  })
);

check(
  '2.5.1 showKepalaSekolah block renders "Plt. Kepala Sekolah" when status is Plt',
  htmlRaporPlt.includes('Plt. Kepala Sekolah')
);

const htmlRaporPlh = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Orang Tua / Wali Murid',
    rightTitle: 'Wali Kelas VII-A',
    rightName: 'Siti Aminah, S.Pd',
    showKepalaSekolah: true,
    statusKepalaSekolah: 'Plh',
    user: { role: 'guru', nama: 'Siti Aminah, S.Pd' }
  })
);

check(
  '2.5.2 showKepalaSekolah block renders "Plh. Kepala Sekolah" when status is Plh',
  htmlRaporPlh.includes('Plh. Kepala Sekolah')
);

const htmlRaporDefinitif = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    leftTitle: 'Mengetahui,',
    leftSubtitle: 'Orang Tua / Wali Murid',
    rightTitle: 'Wali Kelas VII-A',
    rightName: 'Siti Aminah, S.Pd',
    showKepalaSekolah: true,
    statusKepalaSekolah: 'Definitif',
    user: { role: 'guru', nama: 'Siti Aminah, S.Pd' }
  })
);

check(
  '2.5.3 showKepalaSekolah block renders "Kepala Sekolah" without prefix when status is Definitif',
  htmlRaporDefinitif.includes('Kepala Sekolah') &&
  !htmlRaporDefinitif.includes('Plt. Kepala Sekolah') &&
  !htmlRaporDefinitif.includes('Plh. Kepala Sekolah')
);

// 2.6 Right title passed with explicit "Kepala Sekolah"
const htmlExplicitTitlePlt = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    rightTitle: 'Kepala Sekolah',
    statusKepalaSekolah: 'Plt',
    user: { role: 'guru' }
  })
);

check(
  '2.6.1 PrintSignature replaces explicit rightTitle="Kepala Sekolah" with "Plt. Kepala Sekolah" when status is Plt',
  htmlExplicitTitlePlt.includes('Plt. Kepala Sekolah')
);

const htmlExplicitTitlePlh = renderToStaticMarkup(
  React.createElement(PrintSignature, {
    rightTitle: 'Kepala Sekolah',
    statusKepalaSekolah: 'Plh',
    user: { role: 'guru' }
  })
);

check(
  '2.6.2 PrintSignature replaces explicit rightTitle="Kepala Sekolah" with "Plh. Kepala Sekolah" when status is Plh',
  htmlExplicitTitlePlh.includes('Plh. Kepala Sekolah')
);

// =========================================================================
// SUITE 3: Admin Configuration View AST & UI Controls (AdminConfigView.tsx)
// =========================================================================
console.log('\n--- Suite 3: Admin Configuration View AST & UI Controls ---');

const adminConfigPath = path.resolve(__dirname, '../src/components/AdminConfigView.tsx');
const adminConfigSrc = fs.readFileSync(adminConfigPath, 'utf8');

check(
  '3.1 AdminConfigView contains select control for status_kepala_sekolah with data-testid',
  adminConfigSrc.includes('name="status_kepala_sekolah"') &&
  adminConfigSrc.includes('data-testid="select-status-kepala-sekolah"')
);

check(
  '3.2 AdminConfigView contains all 3 required status options: Definitif, Plt, Plh',
  adminConfigSrc.includes('<option value="Definitif">Definitif</option>') &&
  adminConfigSrc.includes('<option value="Plt">Plt (Pelaksana Tugas)</option>') &&
  adminConfigSrc.includes('<option value="Plh">Plh (Pelaksana Harian)</option>')
);

check(
  '3.3 AdminConfigView parses status_kepala_sekolah in fetchConfig',
  adminConfigSrc.includes("item.key === 'status_kepala_sekolah'") &&
  adminConfigSrc.includes('newConfig.status_kepala_sekolah = item.value')
);

check(
  '3.4 AdminConfigView includes status_kepala_sekolah in saveConfig for pengaturan table',
  adminConfigSrc.includes('status_kepala_sekolah: config.status_kepala_sekolah || \'Definitif\'')
);

check(
  '3.5 AdminConfigView includes status_kepala_sekolah in updatePayload for sekolah table',
  adminConfigSrc.includes('status_kepala_sekolah: saveConfig.status_kepala_sekolah || \'Definitif\'')
);

check(
  '3.6 AdminConfigView implements graceful fallback if status_kepala_sekolah column is missing from DB cache',
  adminConfigSrc.includes('delete updatePayload.status_kepala_sekolah')
);

check(
  '3.7 AdminConfigView dynamically formats input labels using formatKepalaSekolahLabel',
  adminConfigSrc.includes('formatKepalaSekolahLabel(config.status_kepala_sekolah)')
);

// =========================================================================
// SUITE 4: Role RBAC & Hook Verification (useKepalaSekolah.ts)
// =========================================================================
console.log('\n--- Suite 4: Role RBAC & Hook Verification ---');

// 4.1 checkIsKepalaSekolah role evaluation
check(
  '4.1.1 checkIsKepalaSekolah recognizes "Kepala Sekolah" role',
  checkIsKepalaSekolah({ role: 'Kepala Sekolah' })
);

check(
  '4.1.2 checkIsKepalaSekolah recognizes "Plt. Kepala Sekolah" role',
  checkIsKepalaSekolah({ role: 'Plt. Kepala Sekolah' })
);

check(
  '4.1.3 checkIsKepalaSekolah recognizes "Plh. Kepala Sekolah" role',
  checkIsKepalaSekolah({ role: 'Plh. Kepala Sekolah' })
);

check(
  '4.1.4 checkIsKepalaSekolah recognizes "kepsek" role',
  checkIsKepalaSekolah({ role: 'kepsek' })
);

check(
  '4.1.5 checkIsKepalaSekolah rejects standard "Guru" role without assignment',
  !checkIsKepalaSekolah({ role: 'Guru', id: 'guru-999' })
);

// 4.2 AST check for useKepalaSekolah returning statusKepalaSekolah
const useKepsekPath = path.resolve(__dirname, '../src/hooks/useKepalaSekolah.ts');
const useKepsekSrc = fs.readFileSync(useKepsekPath, 'utf8');

check(
  '4.2.1 useKepalaSekolah hook tracks and returns statusKepalaSekolah state',
  useKepsekSrc.includes('const [statusKepalaSekolah, setStatusKepalaSekolah] = useState') &&
  useKepsekSrc.includes('return { isKepalaSekolah, statusKepalaSekolah }')
);

check(
  '4.2.2 useKepalaSekolah hook listens to sipjam:config_updated for reactive status sync',
  useKepsekSrc.includes('window.addEventListener(\'sipjam:config_updated\', handleConfigUpdate)') &&
  useKepsekSrc.includes('e?.detail?.config?.status_kepala_sekolah')
);

// =========================================================================
// SUITE 5: Sidebar and AppScreen Identity Badge Invariants
// =========================================================================
console.log('\n--- Suite 5: Sidebar and AppScreen Identity Badge Invariants ---');

const appScreenPath = path.resolve(__dirname, '../src/components/AppScreen.tsx');
const appScreenSrc = fs.readFileSync(appScreenPath, 'utf8');

check(
  '5.1 AppScreen extracts statusKepalaSekolah from useKepalaSekolah',
  appScreenSrc.includes('const { isKepalaSekolah, statusKepalaSekolah } = useKepalaSekolah(user, schoolData, syncKey)')
);

check(
  '5.2 AppScreen uses formatKepalaSekolahLabel for dynamic role badge',
  appScreenSrc.includes('isKepalaSekolah ? formatKepalaSekolahLabel(statusKepalaSekolah)')
);

const claySidebarPath = path.resolve(__dirname, '../src/components/ClaySidebar.tsx');
const claySidebarSrc = fs.readFileSync(claySidebarPath, 'utf8');

check(
  '5.3 ClaySidebar accepts statusKepalaSekolah prop',
  claySidebarSrc.includes('statusKepalaSekolah?: string')
);

check(
  '5.4 ClaySidebar formats roleLabel using formatKepalaSekolahLabel',
  claySidebarSrc.includes('isKepalaSekolah\n    ? formatKepalaSekolahLabel(statusKepalaSekolah)') ||
  claySidebarSrc.includes('isKepalaSekolah ? formatKepalaSekolahLabel(statusKepalaSekolah)')
);

// =========================================================================
// SUITE 6: Non-Regression on Existing Print Header Invariants
// =========================================================================
console.log('\n--- Suite 6: Non-Regression on Existing Print Header Invariants ---');

const printHeaderPath = path.resolve(__dirname, '../src/components/PrintHeader.tsx');
const printHeaderSrc = fs.readFileSync(printHeaderPath, 'utf8');

check(
  '6.1 PrintHeader.tsx preserves verbatim defaultKepalaTitle = formatKepalaSekolahTitle(schoolName)',
  printHeaderSrc.includes('defaultKepalaTitle = formatKepalaSekolahTitle(schoolName)')
);

check(
  '6.2 PrintHeader.tsx re-exports formatKepalaSekolahTitle and formatKepalaSekolahLabel',
  printHeaderSrc.includes('export { formatKepalaSekolahTitle, formatKepalaSekolahLabel')
);

check(
  '6.3 PrintSignatureProps includes optional statusKepalaSekolah',
  printHeaderSrc.includes('statusKepalaSekolah?: string')
);

// =========================================================================
// SUMMARY
// =========================================================================
console.log('\n========================================================================');
console.log(`TOTAL CHECKS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
console.log('========================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL STATUS KEPALA SEKOLAH TESTS PASSED 100% PERFECTLY!\n');
}
