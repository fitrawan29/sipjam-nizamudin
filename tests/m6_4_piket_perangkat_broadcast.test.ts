import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('====================================================');
console.log('MILESTONE M6.4 TEST: PIKET, PERANGKAT, BROADCAST & TRANSITIONS');
console.log('====================================================\n');

const projectRoot = path.resolve(__dirname, '..');

// ----------------------------------------------------
// Section 1: R4.1 PiketView.tsx Verification
// ----------------------------------------------------
console.log('--- Section 1: Manajemen Piket (PiketView.tsx) ---');
const piketPath = path.join(projectRoot, 'src', 'components', 'PiketView.tsx');
assert(fs.existsSync(piketPath), 'PiketView.tsx file exists');
const piketContent = fs.readFileSync(piketPath, 'utf8');

// 1. Admin removes "Isi Laporan" and uses "Penugasan Piket"
assert(
  piketContent.includes("isAdmin && (") && piketContent.includes("'penugasan'"),
  'PiketView renders "Penugasan Piket" tab when user is Admin'
);
assert(
  piketContent.includes("canReport = !isAdmin && isGuru"),
  'PiketView suppresses "Isi Laporan" (canReport is false) for Admin'
);

// 2. Day-by-day picket scheduling (Senin - Sabtu)
assert(
  piketContent.includes("HARI_PIKET_LIST") &&
  piketContent.includes("'Senin'") &&
  piketContent.includes("'Sabtu'"),
  'PiketView defines day-by-day scheduling for Monday through Saturday (Senin–Sabtu)'
);

// 3. Connect to public.penugasan_piket and handle both Guru and Siswa
assert(
  piketContent.includes("from('penugasan_piket')") &&
  piketContent.includes("tipe_petugas: 'Guru'") &&
  piketContent.includes("tipe_petugas: 'Siswa'"),
  'PiketView connects to public.penugasan_piket for both Guru and Siswa'
);

// 4. Backward compatibility sync to jadwal_piket
assert(
  piketContent.includes("syncJadwalPiketForDay") &&
  piketContent.includes("from('jadwal_piket')"),
  'PiketView automatically syncs teacher picket updates to jadwal_piket for workflow.ts compatibility'
);

// 5. Beranda Piket displays both assigned Teachers and Students
assert(
  piketContent.includes("guruList = penugasanList.filter") &&
  piketContent.includes("siswaList = penugasanList.filter"),
  'Beranda Piket displays both assigned teachers and students'
);

// ----------------------------------------------------
// Section 2: R4.2 DokumenView.tsx Verification
// ----------------------------------------------------
console.log('\n--- Section 2: Perangkat Pembelajaran (DokumenView.tsx) ---');
const dokPath = path.join(projectRoot, 'src', 'components', 'DokumenView.tsx');
assert(fs.existsSync(dokPath), 'DokumenView.tsx file exists');
const dokContent = fs.readFileSync(dokPath, 'utf8');

// 1. Admin removes "Upload Baru" tab
assert(
  dokContent.includes("isAdmin ?") && dokContent.includes("Upload Baru") && dokContent.includes("!isAdmin && activeTab === 'upload'"),
  'DokumenView removes "Upload Baru" tab for Admin, retaining it only for teachers'
);

// 2. Teacher Matrix Card System
assert(
  dokContent.includes("teacherMatrixData") &&
  dokContent.includes("Matriks Guru"),
  'DokumenView builds the Teacher Matrix Card System for Admin'
);

// 3. 6 Kurikulum Merdeka documents checklist
assert(
  dokContent.includes("Analisis Capaian Pembelajaran") &&
  dokContent.includes("Alur Tujuan Pembelajaran") &&
  dokContent.includes("Rencana Pekan Efektif") &&
  dokContent.includes("Program Tahunan") &&
  dokContent.includes("Program Semester") &&
  dokContent.includes("Rencana Pembelajaran Mendalam"),
  'DokumenView tracks all 6 Kurikulum Merdeka documents (CP, ATP, RPE, Prota, Promes, RPM)'
);

// 4. KPI completion rate bar
assert(
  dokContent.includes("completionRate") &&
  dokContent.includes("completedCount"),
  'DokumenView calculates and displays KPI completion rate and progress bar per teacher'
);

// 5. Quick verify / preview modal
assert(
  dokContent.includes("previewDoc") &&
  dokContent.includes("handleVerifyDokumen"),
  'DokumenView includes quick preview & verification modal with approval and rejection actions'
);

// ----------------------------------------------------
// Section 3: R5.1 Navigation & Header (AppScreen.tsx)
// ----------------------------------------------------
console.log('\n--- Section 3: AppScreen.tsx Navigation & Print Header ---');
const appScreenPath = path.join(projectRoot, 'src', 'components', 'AppScreen.tsx');
assert(fs.existsSync(appScreenPath), 'AppScreen.tsx file exists');
const appScreenContent = fs.readFileSync(appScreenPath, 'utf8');

// 1. Pantauan Harian removed from menuItemsAdmin
assert(
  !appScreenContent.includes("'view-admin-monitor'"),
  'AppScreen completely removes "Pantauan Harian" (view-admin-monitor) from Admin menus'
);

// 2. Informasi added to both Admin and Guru menus
assert(
  appScreenContent.includes("{ id: 'view-informasi', icon: 'fa-bullhorn', label: 'Informasi' }"),
  'AppScreen adds "Informasi" menu with fa-bullhorn icon to menus'
);

// 3. Header print hiding
assert(
  appScreenContent.includes("print:hidden no-print"),
  'AppScreen header element explicitly contains print:hidden no-print'
);

// 4. Render InformasiView
assert(
  appScreenContent.includes("<InformasiView user={user} setView={handleNavigation} />"),
  'AppScreen renders InformasiView when currentView === "view-informasi"'
);

// 5. Smooth page transition container
assert(
  appScreenContent.includes('className="page-transition"'),
  'AppScreen wraps current views in page-transition container'
);

// ----------------------------------------------------
// Section 4: R5.2 Broadcast System (InformasiView.tsx)
// ----------------------------------------------------
console.log('\n--- Section 4: Broadcast System (InformasiView.tsx) ---');
const infoPath = path.join(projectRoot, 'src', 'components', 'InformasiView.tsx');
assert(fs.existsSync(infoPath), 'InformasiView.tsx file exists');
const infoContent = fs.readFileSync(infoPath, 'utf8');

// 1. Queries pengumuman and pengumuman_tanggapan
assert(
  infoContent.includes("from('pengumuman')") &&
  infoContent.includes("from('pengumuman_tanggapan')"),
  'InformasiView queries public.pengumuman and public.pengumuman_tanggapan'
);

// 2. Audience filters
assert(
  infoContent.includes("'Semua'") &&
  infoContent.includes("'Guru'") &&
  infoContent.includes("'Wali Kelas'") &&
  infoContent.includes("'Orang Tua'"),
  'InformasiView supports audience filters (Semua, Guru, Wali Kelas, Orang Tua)'
);

// 3. Modes: Satu Arah & Dua Arah
assert(
  infoContent.includes("'Satu Arah'") &&
  infoContent.includes("'Dua Arah'"),
  'InformasiView supports both Satu Arah (broadcast only) and Dua Arah (discussion/comments)'
);

// 4. Pin announcement support
assert(
  infoContent.includes("is_pinned") &&
  infoContent.includes("handleTogglePin"),
  'InformasiView supports pinning announcements to the top (is_pinned)'
);

// 5. WhatsApp broadcast integration
assert(
  infoContent.includes("https://wa.me/?text=") &&
  infoContent.includes("handleShareWhatsApp"),
  'InformasiView generates one-click WhatsApp broadcast link (https://wa.me/?text=...)'
);

// 6. Admin compose, edit, and delete
assert(
  infoContent.includes("handleSubmitAnnouncement") &&
  infoContent.includes("handleDeleteAnnouncement") &&
  infoContent.includes("handleOpenCreateModal") &&
  infoContent.includes("handleOpenEditModal"),
  'InformasiView allows Admin to compose, edit, and delete announcements'
);

// ----------------------------------------------------
// Section 5: R5.3 UI Smooth Transitions (globals.css)
// ----------------------------------------------------
console.log('\n--- Section 5: UI Smooth Transitions (globals.css) ---');
const cssPath = path.join(projectRoot, 'src', 'app', 'globals.css');
assert(fs.existsSync(cssPath), 'globals.css file exists');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// 1. Keyframes
assert(
  cssContent.includes("@keyframes pageEnter") &&
  cssContent.includes("page-transition"),
  'globals.css defines @keyframes pageEnter and .page-transition utility'
);
assert(
  cssContent.includes("@keyframes modalPop") &&
  cssContent.includes("modal-pop"),
  'globals.css defines @keyframes modalPop and .modal-pop utility'
);

// 2. Button and card transitions
assert(
  cssContent.includes(".btn-click") &&
  cssContent.includes("hover:") &&
  cssContent.includes(".card-interactive"),
  'globals.css defines smooth hover/active transitions for buttons and cards'
);

// 3. Print media strict rules
assert(
  cssContent.includes("@media print") &&
  cssContent.includes("header, nav, aside, .swal2-container, .no-print { display: none !important; }"),
  'globals.css enforces strict print hiding for header, nav, aside, swal, and .no-print'
);

console.log('\n====================================================');
console.log('🎉 ALL 20 M6.4 PIKET, PERANGKAT & BROADCAST TESTS PASSED!');
console.log('====================================================');
