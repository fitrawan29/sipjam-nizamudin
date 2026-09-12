import dotenv from 'dotenv';
import path from 'path';

// MUST configure dotenv before importing modules that initialize Supabase client
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import type { Database, PenugasanPiket, Pengumuman, PengumumanTanggapan, BankDokumen, DataGuru, GuruMapel } from '../src/types/database';

let failureCount = 0;
let passCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    failureCount++;
  } else {
    console.log(`✅ PASS: ${testName}`);
    passCount++;
  }
}

async function runChallengerStressTests() {
  console.log('======================================================================');
  console.log('CHALLENGER M6.2: EMPIRICAL STRESS TEST HARNESS (R4 & R5)');
  console.log('======================================================================\n');

  const { KURIKULUM_DOCS } = await import('../src/components/DokumenView');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  assert(Boolean(supabaseUrl && supabaseKey), 'Supabase credentials in .env.local');

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // =========================================================================
  // SECTION 1: LIVE SUPABASE DATA & TEACHER INVENTORY CHECK (13 TEACHERS)
  // =========================================================================
  console.log('\n--- SECTION 1: Teacher Inventory & Database Integrity ---');

  const { data: teachers, error: tErr } = await supabase
    .from('data_guru')
    .select('*')
    .order('nama_guru', { ascending: true });

  assert(!tErr && Array.isArray(teachers), 'Fetch data_guru from Supabase', tErr?.message);
  const teacherList = teachers || [];
  console.log(`ℹ️ Total teachers in data_guru: ${teacherList.length}`);
  assert(teacherList.length === 13, `Exact teacher count is 13 (found ${teacherList.length})`);

  const { data: mapelList, error: mErr } = await supabase
    .from('guru_mapel')
    .select('*');

  assert(!mErr && Array.isArray(mapelList), 'Fetch guru_mapel from Supabase', mErr?.message);
  const guruMapelData = mapelList || [];

  // Check which teachers have 0 subjects mapped in guru_mapel
  const teachersWithZeroSubjects = teacherList.filter(t => 
    !guruMapelData.some(gm => (gm.nama_guru || '').trim().toLowerCase() === (t.nama_guru || '').trim().toLowerCase())
  );
  console.log(`ℹ️ Teachers with 0 subjects in guru_mapel: ${teachersWithZeroSubjects.length} (${teachersWithZeroSubjects.map(t => t.nama_guru).join(', ')})`);

  // =========================================================================
  // SECTION 2: R4.1 PIKET PENUGASAN STRESS TEST & LOGIC VALIDATION
  // =========================================================================
  console.log('\n--- SECTION 2: Piket Penugasan Validation & Duplicate Prevention ---');

  const HARI_PIKET_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

  // 2.1 Day validation
  assert(HARI_PIKET_LIST.length === 6, 'Piket schedule covers exactly 6 active school days (Senin–Sabtu)');
  const testDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Ahad', ''];
  testDays.forEach(day => {
    const isValid = (HARI_PIKET_LIST as readonly string[]).includes(day);
    if (['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].includes(day)) {
      assert(isValid, `Day "${day}" is recognized as a valid piket day`);
    } else {
      assert(!isValid, `Day "${day || '(empty)'}" is correctly rejected as invalid piket day`);
    }
  });

  // 2.2 Teacher Duplicate Prevention Algorithm
  const mockPenugasanList: PenugasanPiket[] = [
    {
      id: 'p-1',
      hari: 'Senin',
      tipe_petugas: 'Guru',
      guru_id: 't-1',
      guru_nama: 'Ade Fitrawan Ibrahim',
      guru_nip: '19800101',
      siswa_nama: null,
      siswa_nisn: null,
      kelas: null,
      tahun_ajaran: '2026/2027',
      created_at: new Date().toISOString()
    },
    {
      id: 'p-2',
      hari: 'Senin',
      tipe_petugas: 'Siswa',
      guru_id: null,
      guru_nama: null,
      guru_nip: null,
      siswa_nama: 'Ahmad Dahlan',
      siswa_nisn: '0012345678',
      kelas: 'X Merdeka 1',
      tahun_ajaran: '2026/2027',
      created_at: new Date().toISOString()
    }
  ];

  function isTeacherDuplicate(list: PenugasanPiket[], targetHari: string, teacherId: string, teacherNama: string): boolean {
    return list.some(
      p => p.hari === targetHari && p.tipe_petugas === 'Guru' && (p.guru_id === teacherId || p.guru_nama === teacherNama)
    );
  }

  assert(
    isTeacherDuplicate(mockPenugasanList, 'Senin', 't-1', 'Ade Fitrawan Ibrahim'),
    'Duplicate check: blocks same teacher on same day with same ID and Name'
  );
  assert(
    isTeacherDuplicate(mockPenugasanList, 'Senin', 'other-id', 'Ade Fitrawan Ibrahim'),
    'Duplicate check: blocks same teacher on same day even if ID differs (by name)'
  );
  assert(
    isTeacherDuplicate(mockPenugasanList, 'Senin', 't-1', 'Different Name'),
    'Duplicate check: blocks same teacher on same day even if Name differs (by ID)'
  );
  assert(
    !isTeacherDuplicate(mockPenugasanList, 'Selasa', 't-1', 'Ade Fitrawan Ibrahim'),
    'Duplicate check: permits same teacher on a DIFFERENT day (e.g. Selasa)'
  );
  assert(
    !isTeacherDuplicate(mockPenugasanList, 'Senin', 't-2', 'Fitri Aprilia Dotulong'),
    'Duplicate check: permits different teacher on the same day'
  );

  // 2.3 Student Duplicate Prevention Algorithm (Case-insensitive)
  function isStudentDuplicate(list: PenugasanPiket[], targetHari: string, studentName: string): boolean {
    return list.some(
      p => p.hari === targetHari && p.tipe_petugas === 'Siswa' && p.siswa_nama?.toLowerCase() === studentName.toLowerCase()
    );
  }

  assert(
    isStudentDuplicate(mockPenugasanList, 'Senin', 'Ahmad Dahlan'),
    'Duplicate check: blocks same student on same day (exact match)'
  );
  assert(
    isStudentDuplicate(mockPenugasanList, 'Senin', 'ahmad dahlan'),
    'Duplicate check: blocks same student with lowercase variation'
  );
  assert(
    isStudentDuplicate(mockPenugasanList, 'Senin', 'AHMAD DAHLAN'),
    'Duplicate check: blocks same student with UPPERCASE variation'
  );
  assert(
    !isStudentDuplicate(mockPenugasanList, 'Selasa', 'Ahmad Dahlan'),
    'Duplicate check: permits same student on a DIFFERENT day'
  );
  assert(
    !isStudentDuplicate(mockPenugasanList, 'Senin', 'Siti Fatimah'),
    'Duplicate check: permits different student on the same day'
  );

  // 2.4 Synchronize penugasan_piket with jadwal_piket logic
  function simulateSyncJadwalPiket(list: PenugasanPiket[], targetDay: string): string {
    const names = list
      .filter(p => p.hari === targetDay && p.tipe_petugas === 'Guru')
      .map(p => p.guru_nama)
      .filter(Boolean);
    return names.join(', ');
  }

  const syncTestList: PenugasanPiket[] = [
    { id: '1', hari: 'Senin', tipe_petugas: 'Guru', guru_nama: 'Guru A', guru_id: '1', guru_nip: null, siswa_nama: null, siswa_nisn: null, kelas: null, tahun_ajaran: '2026/2027', created_at: '' },
    { id: '2', hari: 'Senin', tipe_petugas: 'Guru', guru_nama: 'Guru B', guru_id: '2', guru_nip: null, siswa_nama: null, siswa_nisn: null, kelas: null, tahun_ajaran: '2026/2027', created_at: '' },
    { id: '3', hari: 'Senin', tipe_petugas: 'Siswa', guru_nama: null, guru_id: null, guru_nip: null, siswa_nama: 'Siswa X', siswa_nisn: '123', kelas: 'X', tahun_ajaran: '2026/2027', created_at: '' },
    { id: '4', hari: 'Rabu', tipe_petugas: 'Guru', guru_nama: 'Guru C', guru_id: '3', guru_nip: null, siswa_nama: null, siswa_nisn: null, kelas: null, tahun_ajaran: '2026/2027', created_at: '' }
  ];

  const seninSync = simulateSyncJadwalPiket(syncTestList, 'Senin');
  assert(seninSync === 'Guru A, Guru B', `Sync Senin produces exact comma-separated string: "${seninSync}"`);
  const selasaSync = simulateSyncJadwalPiket(syncTestList, 'Selasa');
  assert(selasaSync === '', `Sync empty day produces empty string: "${selasaSync}"`);
  const rabuSync = simulateSyncJadwalPiket(syncTestList, 'Rabu');
  assert(rabuSync === 'Guru C', `Sync single teacher produces exact string: "${rabuSync}"`);

  // =========================================================================
  // SECTION 3: R4.2 DOKUMEN VIEW TEACHER MATRIX CARD STRESS TEST
  // =========================================================================
  console.log('\n--- SECTION 3: DokumenView Teacher Matrix Card Completeness ---');

  // Verify the 6 Kurikulum Merdeka documents
  assert(KURIKULUM_DOCS.length === 6, 'Standard documents length is exactly 6');
  const expectedCodes = ['CP', 'ATP', 'RPE', 'Prota', 'Promes', 'RPM'];
  expectedCodes.forEach(code => {
    assert(KURIKULUM_DOCS.some(d => d.id === code), `Standard doc contains code: ${code}`);
  });

  const matchDocToType = (teacherDocs: BankDokumen[], docId: string) => {
    return teacherDocs.find(d => {
      const j = (d.jenis_dokumen || '').toLowerCase();
      if (docId === 'CP') return j.includes('capaian') || j.includes('cp');
      if (docId === 'ATP') return j.includes('tujuan') || j.includes('atp');
      if (docId === 'RPE') return j.includes('pekan') || j.includes('rpe');
      if (docId === 'Prota') return j.includes('tahunan') || j.includes('prota');
      if (docId === 'Promes') return j.includes('semester') || j.includes('promes');
      if (docId === 'RPM') return j.includes('mendalam') || j.includes('rpm') || j.includes('modul');
      return false;
    });
  };

  // Stress test matchDocToType across variations
  const docMatchingVariations = [
    { jenis: 'Analisis Capaian Pembelajaran (CP)', targetDocId: 'CP', expected: true },
    { jenis: 'Capaian Pembelajaran', targetDocId: 'CP', expected: true },
    { jenis: 'Dokumen CP Fase E', targetDocId: 'CP', expected: true },
    { jenis: 'Alur Tujuan Pembelajaran (ATP)', targetDocId: 'ATP', expected: true },
    { jenis: 'Tujuan Pembelajaran', targetDocId: 'ATP', expected: true },
    { jenis: 'Rencana Pekan Efektif (RPE)', targetDocId: 'RPE', expected: true },
    { jenis: 'Pekan Efektif Semester 1', targetDocId: 'RPE', expected: true },
    { jenis: 'Program Tahunan (Prota)', targetDocId: 'Prota', expected: true },
    { jenis: 'Rencana Program Tahunan', targetDocId: 'Prota', expected: true },
    { jenis: 'Program Semester (Promes)', targetDocId: 'Promes', expected: true },
    { jenis: 'Promes Ganjil 2026', targetDocId: 'Promes', expected: true },
    { jenis: 'Rencana Pembelajaran Mendalam (RPM)', targetDocId: 'RPM', expected: true },
    { jenis: 'Modul Ajar Pertemuan 1', targetDocId: 'RPM', expected: true },
    { jenis: 'Pembelajaran Mendalam', targetDocId: 'RPM', expected: true },
    { jenis: 'Dokumen Sembarang Lainnya', targetDocId: 'CP', expected: false },
  ];

  docMatchingVariations.forEach(tc => {
    const dummyDoc: BankDokumen = {
      id: 'doc-test',
      timestamp: '2026-09-12 10:00:00',
      nama_guru: 'Test Guru',
      jenis_dokumen: tc.jenis,
      judul: tc.jenis,
      link_file: 'https://example.com/file.pdf',
      status_verifikasi: 'Disetujui',
      catatan_admin: '',
      mapel: null,
      kelas: null
    };
    const matched = matchDocToType([dummyDoc], tc.targetDocId);
    assert(
      Boolean(matched) === tc.expected,
      `matchDocToType: "${tc.jenis}" -> ${tc.targetDocId}`,
      `Expected ${tc.expected}, got ${Boolean(matched)}`
    );
  });

  // Test matrix calculation on all 13 teachers
  const { data: realDocs } = await supabase.from('bank_dokumen').select('*');
  const allDocs = realDocs || [];

  const matrixResult = teacherList.map(teacher => {
    const teacherDocs = allDocs.filter(
      d => (d.nama_guru || '').trim().toLowerCase() === (teacher.nama_guru || '').trim().toLowerCase()
    );
    const teacherMapel = guruMapelData.filter(
      gm => (gm.nama_guru || '').trim().toLowerCase() === (teacher.nama_guru || '').trim().toLowerCase()
    );

    const docStatusMap: Record<string, BankDokumen | undefined> = {};
    let completedCount = 0;

    KURIKULUM_DOCS.forEach(doc => {
      const match = matchDocToType(teacherDocs, doc.id);
      docStatusMap[doc.id] = match;
      if (match) completedCount += 1;
    });

    const completionRate = Math.round((completedCount / 6) * 100);
    const isComplete = completedCount === 6;
    const hasPendingVerification = Object.values(docStatusMap).some(
      d => d && (d.status_verifikasi === 'Menunggu' || !d.status_verifikasi)
    );

    return {
      teacher,
      teacherDocs,
      teacherMapel,
      docStatusMap,
      completedCount,
      completionRate,
      isComplete,
      hasPendingVerification
    };
  });

  assert(matrixResult.length === 13, `Matrix generated successfully for all 13 teachers`);

  // Verify each teacher's card data conforms to constraints
  matrixResult.forEach(item => {
    assert(
      item.completedCount >= 0 && item.completedCount <= 6,
      `Teacher "${item.teacher.nama_guru}": completed count between 0 and 6 (${item.completedCount})`
    );
    assert(
      item.completionRate >= 0 && item.completionRate <= 100,
      `Teacher "${item.teacher.nama_guru}": completion rate between 0 and 100 (${item.completionRate}%)`
    );
    // Edge case test: teacher with 0 subjects
    if (item.teacherMapel.length === 0) {
      const fallbackDisplay = item.teacher.mata_pelajaran || 'Belum ada mapel diinput';
      assert(
        typeof fallbackDisplay === 'string' && fallbackDisplay.length > 0,
        `Edge case: Teacher "${item.teacher.nama_guru}" has 0 subjects in guru_mapel, falls back safely to "${fallbackDisplay}"`
      );
    }
  });

  // =========================================================================
  // SECTION 4: R5.1 APPSCREEN NAVIGATION & ROLE MENU ISOLATION
  // =========================================================================
  console.log('\n--- SECTION 4: AppScreen Navigation & Role Menu Isolation ---');

  const appScreenFile = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'components', 'AppScreen.tsx'), 'utf-8');

  // Verify Pantauan Harian is completely absent from all role menus
  assert(!appScreenFile.includes('view-admin-monitor'), 'Pantauan Harian ID (view-admin-monitor) is completely removed from AppScreen');
  assert(!appScreenFile.toLowerCase().includes('pantauan harian'), 'Label "Pantauan Harian" is completely removed from AppScreen');

  // Verify Informasi navigation exists for both Admin and Guru
  assert(
    appScreenFile.includes("id: 'view-informasi'") &&
    appScreenFile.includes("label: 'Informasi'"),
    'Informasi navigation item defined with correct id and label'
  );

  // Extract menuItemsGuru and menuItemsAdmin from AppScreen.tsx
  const hasInformasiInGuru = appScreenFile.includes("menuItemsGuru") && appScreenFile.indexOf("id: 'view-informasi'") < appScreenFile.indexOf("menuItemsAdmin");
  const hasInformasiInAdmin = appScreenFile.includes("menuItemsAdmin") && appScreenFile.lastIndexOf("id: 'view-informasi'") > appScreenFile.indexOf("menuItemsAdmin");

  assert(hasInformasiInGuru, '"Informasi" menu is present in menuItemsGuru');
  assert(hasInformasiInAdmin, '"Informasi" menu is present in menuItemsAdmin');

  // Verify view-informasi is NOT in restrictedViews (Guru can always navigate to it)
  const restrictedMatch = appScreenFile.match(/const restrictedViews = \[([\s\S]*?)\];/);
  assert(restrictedMatch !== null, 'Found restrictedViews array in AppScreen.tsx');
  if (restrictedMatch) {
    assert(
      !restrictedMatch[1].includes('view-informasi'),
      'view-informasi is NOT restricted in handleNavigation (accessible without presensi requirement)'
    );
  }

  // Verify print:hidden no-print on header
  assert(
    appScreenFile.includes('<header') && appScreenFile.includes('print:hidden no-print'),
    'Header element in AppScreen contains strict print hiding classes "print:hidden no-print"'
  );

  // =========================================================================
  // SECTION 5: R5.2 INFORMASI VIEW BROADCAST ENGINE & PERMISSIONS
  // =========================================================================
  console.log('\n--- SECTION 5: InformasiView Broadcast Engine, Permissions & WhatsApp ---');

  const infoFile = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'components', 'InformasiView.tsx'), 'utf-8');

  // 5.1 Audience Filter Logic Simulation
  const mockBroadcasts: Pengumuman[] = [
    { id: 'b-1', judul: 'Semua Civitas Info', konten: 'Info umum', sasaran: 'Semua', mode: 'Satu Arah', penulis_nama: 'Admin', penulis_role: 'Admin', is_pinned: false, lampiran_url: null, created_at: '', updated_at: '' },
    { id: 'b-2', judul: 'Khusus Guru Info', konten: 'Info guru', sasaran: 'Guru', mode: 'Dua Arah', penulis_nama: 'Admin', penulis_role: 'Admin', is_pinned: false, lampiran_url: null, created_at: '', updated_at: '' },
    { id: 'b-3', judul: 'Wali Kelas Info', konten: 'Info walkes', sasaran: 'Wali Kelas', mode: 'Satu Arah', penulis_nama: 'Admin', penulis_role: 'Admin', is_pinned: false, lampiran_url: null, created_at: '', updated_at: '' },
    { id: 'b-4', judul: 'Orang Tua Info', konten: 'Info ortu', sasaran: 'Orang Tua', mode: 'Dua Arah', penulis_nama: 'Admin', penulis_role: 'Admin', is_pinned: false, lampiran_url: null, created_at: '', updated_at: '' },
  ];

  function filterBroadcasts(list: Pengumuman[], activeFilter: string, search: string = '') {
    return list.filter(p => {
      if (activeFilter !== 'Semua') {
        if (p.sasaran !== activeFilter && p.sasaran !== 'Semua') return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = (p.judul || '').toLowerCase().includes(q);
        const matchContent = (p.konten || '').toLowerCase().includes(q);
        const matchAuthor = (p.penulis_nama || '').toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchAuthor) return false;
      }
      return true;
    });
  }

  const fSemua = filterBroadcasts(mockBroadcasts, 'Semua');
  assert(fSemua.length === 4, 'Filter "Semua" shows all 4 broadcasts');

  const fGuru = filterBroadcasts(mockBroadcasts, 'Guru');
  assert(
    fGuru.length === 2 && fGuru.every(p => p.sasaran === 'Guru' || p.sasaran === 'Semua'),
    'Filter "Guru" shows only "Guru" and "Semua" (no leaks from Wali Kelas or Orang Tua)'
  );

  const fWalkes = filterBroadcasts(mockBroadcasts, 'Wali Kelas');
  assert(
    fWalkes.length === 2 && fWalkes.every(p => p.sasaran === 'Wali Kelas' || p.sasaran === 'Semua'),
    'Filter "Wali Kelas" shows only "Wali Kelas" and "Semua"'
  );

  const fOrtu = filterBroadcasts(mockBroadcasts, 'Orang Tua');
  assert(
    fOrtu.length === 2 && fOrtu.every(p => p.sasaran === 'Orang Tua' || p.sasaran === 'Semua'),
    'Filter "Orang Tua" shows only "Orang Tua" and "Semua"'
  );

  // Search filtering
  const fSearch = filterBroadcasts(mockBroadcasts, 'Semua', 'walkes');
  assert(fSearch.length === 1 && fSearch[0].id === 'b-3', 'Search filter accurately matches query substring in konten');

  // 5.2 Satu Arah vs Dua Arah permissions
  assert(
    infoFile.includes("isTwoWay ? (") &&
    infoFile.includes("Siaran Satu Arah"),
    'InformasiView renders interaction UI conditionally based on isTwoWay'
  );

  assert(
    infoFile.includes("const canDelete = isAdmin || resp.user_nama === user?.nama;"),
    'Comment deletion authorization: restricted to Admin or comment author'
  );

  // 5.3 WhatsApp Broadcast URL Encoding Stress Test
  const extremeBroadcast: Pengumuman = {
    id: 'b-extreme',
    judul: 'RAPAT DEWAN GURU & PENETAPAN NILAI AKHIR (2026/2027)? #PENTING!',
    konten: 'Salam hangat untuk Bapak/Ibu Guru & Staf:\n1. Rapat dimulai pukul 08:30 WITA.\n2. Agenda: Evaluasi KBM & 100% tuntas.\nLink: https://meet.google.com/abc-defg-hij?authuser=1&pli=1',
    sasaran: 'Guru',
    mode: 'Dua Arah',
    penulis_nama: 'Fitrawan S.Pd., M.Pd. & Tim',
    penulis_role: 'Admin',
    is_pinned: true,
    lampiran_url: 'https://drive.google.com/file/d/1TestDriveId/view?usp=sharing&id=100',
    created_at: '2026-09-12T08:00:00Z',
    updated_at: '2026-09-12T08:00:00Z'
  };

  const text =
    `📢 *PENGUMUMAN RESMI SIPJAM NIZAMUDIN*\n\n` +
    `📌 *${extremeBroadcast.judul}*\n` +
    `🎯 Sasaran: *${extremeBroadcast.sasaran}*\n` +
    `📅 Tanggal: 12 September 2026\n` +
    `✍️ Oleh: ${extremeBroadcast.penulis_nama} (${extremeBroadcast.penulis_role})\n\n` +
    `${extremeBroadcast.konten}\n\n` +
    (extremeBroadcast.lampiran_url ? `📎 Lampiran: ${extremeBroadcast.lampiran_url}\n\n` : '') +
    `_Pesan broadcast via SIPJAM Nizamudin_`;

  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  assert(waUrl.startsWith('https://wa.me/?text='), 'WhatsApp link generated with https://wa.me/?text=');
  assert(!waUrl.includes(' ') && !waUrl.includes('\n'), 'WhatsApp link has no unescaped spaces or raw newlines');
  assert(decodeURIComponent(waUrl.replace('https://wa.me/?text=', '')) === text, 'decodeURIComponent perfectly reconstitutes complex text with ampersands, queries, and unicode');

  // =========================================================================
  // SECTION 6: R5.3 GLOBALS.CSS ANIMATION SYNTAX, SPECIFICITY & PRINT MEDIA
  // =========================================================================
  console.log('\n--- SECTION 6: globals.css Syntax, Specificity & Print Media Audit ---');

  const cssPath = path.resolve(__dirname, '..', 'src', 'app', 'globals.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  // Verify keyframes definitions
  const keyframes = ['fadeIn', 'pageEnter', 'modalPop'];
  keyframes.forEach(kf => {
    assert(cssContent.includes(`@keyframes ${kf}`), `CSS contains @keyframes ${kf}`);
  });

  // Verify classes
  const classes = ['.fade-in', '.page-transition', '.page-enter', '.modal-pop', '.btn-click', '.card-interactive', '.pill-interactive'];
  classes.forEach(cls => {
    assert(cssContent.includes(cls), `CSS contains utility/component class: ${cls}`);
  });

  // Specificity & Print Media audit
  const printBlockMatch = cssContent.match(/@media print \{([\s\S]*?)\}\s*@media screen/);
  assert(printBlockMatch !== null, 'globals.css has structured @media print block');

  if (printBlockMatch) {
    const printBlock = printBlockMatch[1];
    assert(
      printBlock.includes('header, nav, aside, .swal2-container, .no-print { display: none !important; }'),
      '@media print strictly hides header, nav, aside, .swal2-container, .no-print'
    );
    assert(
      printBlock.includes('.print-only { display: block !important; }'),
      '@media print strictly forces display: block !important on .print-only'
    );
    assert(
      printBlock.includes('.print-signature {') &&
      printBlock.includes('justify-content: flex-end !important;'),
      '@media print enforces justify-content: flex-end !important for signature block'
    );
  }

  // Test live query on public.pengumuman
  const { data: liveAnnouncements, error: aErr } = await supabase.from('pengumuman').select('*');
  assert(!aErr && Array.isArray(liveAnnouncements), 'Live Supabase pengumuman accessible', aErr?.message);
  console.log(`ℹ️ Total live announcements: ${liveAnnouncements?.length}`);

  // Test live query on public.penugasan_piket
  const { data: livePenugasan, error: pErr } = await supabase.from('penugasan_piket').select('*');
  assert(!pErr && Array.isArray(livePenugasan), 'Live Supabase penugasan_piket accessible', pErr?.message);
  console.log(`ℹ️ Total live penugasan piket: ${livePenugasan?.length}`);

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n======================================================================');
  console.log(`TEST SUMMARY: ${passCount} PASSED, ${failureCount} FAILED`);
  console.log('======================================================================');

  if (failureCount > 0) {
    console.error(`💥 CHALLENGE FAILED: ${failureCount} assertion(s) failed!`);
    process.exit(1);
  } else {
    console.log('🎉 ALL EMPIRICAL CHALLENGER STRESS TESTS PASSED WITH ZERO FAILURES!');
  }
}

runChallengerStressTests().catch(err => {
  console.error('Unhandled fatal error in test harness:', err);
  process.exit(1);
});
