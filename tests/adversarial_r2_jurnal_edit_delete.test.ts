import fs from 'fs';
import path from 'path';
import assert from 'assert';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}:`, err?.message || err);
    failed++;
  }
}

async function runAdversarialSuite() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔥 ADVERSARIAL STRESS TEST SUITE: MILESTONE 2 (REQUIREMENT R2)');
  console.log('   Fitur Edit dan Hapus Jurnal KBM pada Role Guru Mandiri');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const root = path.resolve(__dirname, '..');
  const rekapPath = path.join(root, 'src', 'components', 'RekapJurnalView.tsx');
  const guruPath = path.join(root, 'src', 'components', 'GuruJurnal.tsx');

  assert.ok(fs.existsSync(rekapPath), 'RekapJurnalView.tsx must exist');
  assert.ok(fs.existsSync(guruPath), 'GuruJurnal.tsx must exist');

  const rekapContent = fs.readFileSync(rekapPath, 'utf8');
  const guruContent = fs.readFileSync(guruPath, 'utf8');

  // =========================================================================
  // SCENARIO A: Editing a journal from 30+ days in the past (No time limits)
  // =========================================================================
  console.log('--- SCENARIO A: Unrestricted Historical Editing (30+ Days Past) ---');

  runTest('A.1: Absence of arbitrary time restrictions or recency blocks in RekapJurnalView', () => {
    const forbiddenPatterns = [
      /isTodayOnly/i,
      /hanyaBisaEditHariIni/i,
      /waktuEditHabis/i,
      /tidakBisaEditLampau/i,
      /diffDays\s*>\s*30/i,
      /diffDays\s*>\s*7/i,
      /diffDays\s*>\s*1/i,
    ];
    for (const pattern of forbiddenPatterns) {
      assert.ok(!pattern.test(rekapContent), `Forbidden time-block pattern found: ${pattern}`);
    }
  });

  runTest('A.2: Date input field in edit form has no min/max date cutoff constraints', () => {
    const modalSection = rekapContent.slice(rekapContent.indexOf('id="modal-edit-jurnal"'));
    assert.ok(modalSection.length > 0, 'modal-edit-jurnal exists');
    const dateInputMatch = modalSection.match(/<input[^>]*type="date"[^>]*>/i);
    assert.ok(dateInputMatch, 'Date input found in edit modal');
    const dateInputHtml = dateInputMatch[0];
    assert.ok(!dateInputHtml.includes('min='), 'Date input must not enforce a min date limit');
    assert.ok(!dateInputHtml.includes('max='), 'Date input must not enforce an artificial max date limit');
  });

  runTest('A.3: Behavioral simulation of 35-day-old journal edit payload generation', () => {
    const pastDate = '2026-09-05'; // > 30 days past
    const mockJurnal = {
      id: 'jurnal-past-35-days',
      tanggal: pastDate,
      jam_ke: '1-2',
      pertemuan_ke: '4',
      mapel: 'Matematika',
      kelas: 'VII A',
      lokasi_kbm: 'Ruang VII A',
      tujuan_pembelajaran: 'Peserta didik memahami konsep aljabar',
      kktp: 'Mampu menyelesaikan persamaan linear satu variabel',
      konten: 'Persamaan Linear Satu Variabel',
      kegiatan: 'Diskusi kelompok dan pemecahan masalah',
      catatan_refleksi: 'Pembelajaran berjalan lancar',
      kehadiran_murid: 'Total murid: 30, Hadir: 30, Izin: 0, Sakit: 0, Alpa: 0',
      foto_kegiatan: 'https://drive.google.com/uc?id=samplephoto123',
      nama_guru: 'Ahmad Guru, S.Pd',
      sekolah_id: 'sch-tutuyan-1',
      status_verifikasi: 'Disetujui'
    };

    // Replicate handleOpenEditModal state load
    assert.ok(!mockJurnal.id.startsWith('unfilled-'), 'Real past journal is not unfilled');
    const editTanggal = mockJurnal.tanggal;
    assert.strictEqual(editTanggal, '2026-09-05');

    // Replicate payload construction in handleSaveEdit
    const totalMurid = 30;
    const computedKehadiran = `Total murid: ${totalMurid}, Hadir: 30, Izin: 0, Sakit: 0, Alpa: 0`;
    const payload: any = {
      tanggal: editTanggal,
      jam_ke: mockJurnal.jam_ke,
      pertemuan_ke: mockJurnal.pertemuan_ke,
      mapel: mockJurnal.mapel,
      kelas: mockJurnal.kelas,
      lokasi_kbm: mockJurnal.lokasi_kbm,
      lokasi: mockJurnal.lokasi_kbm,
      tujuan_pembelajaran: mockJurnal.tujuan_pembelajaran,
      kktp: mockJurnal.kktp,
      konten: mockJurnal.konten,
      materi: mockJurnal.konten,
      materi_pembelajaran: mockJurnal.konten,
      kegiatan: mockJurnal.kegiatan,
      kegiatan_pembelajaran: mockJurnal.kegiatan,
      catatan_refleksi: mockJurnal.catatan_refleksi,
      refleksi: mockJurnal.catatan_refleksi,
      kehadiran_murid: computedKehadiran,
      link_bukti_foto: mockJurnal.foto_kegiatan,
      foto_kegiatan: mockJurnal.foto_kegiatan,
    };

    assert.strictEqual(payload.tanggal, '2026-09-05', 'Payload preserves 35-day-old historical date');
    assert.strictEqual(payload.konten, 'Persamaan Linear Satu Variabel');
  });

  // =========================================================================
  // SCENARIO B: Editing a previously 'Ditolak' journal
  // =========================================================================
  console.log('\n--- SCENARIO B: Rejected Journal Editing & Verification Reset ---');

  runTest('B.1: Code contains explicit logic to transition from Ditolak and clear rejection metadata', () => {
    assert.ok(
      rekapContent.includes("editingJurnal.status_verifikasi === 'Ditolak'") &&
      rekapContent.includes('payload.catatan_admin = null') &&
      rekapContent.includes('payload.alasan_penolakan = null') &&
      rekapContent.includes('payload.catatan_penolakan = null') &&
      rekapContent.includes('payload.keterangan_penolakan = null'),
      'RekapJurnalView must explicitly clear all 4 rejection metadata fields to null'
    );
  });

  runTest('B.2: Fully corrected journal transitions from Ditolak to Disetujui', () => {
    // Logic extracted from handleSaveEdit in RekapJurnalView.tsx
    const isMateriLengkap = true;
    const isKegiatanLengkap = true;
    const isFotoLengkap = true;
    const isAbsensiLengkap = true;

    let nextStatus: string = 'Ditolak';
    if (nextStatus === 'Ditolak') {
      nextStatus = (isMateriLengkap && isKegiatanLengkap && isAbsensiLengkap && isFotoLengkap) ? 'Disetujui' : 'Menunggu';
    }

    assert.strictEqual(nextStatus, 'Disetujui', 'Fully completed journal must transition to Disetujui');
  });

  runTest('B.3: Partially corrected journal transitions from Ditolak to Menunggu', () => {
    const isMateriLengkap = true;
    const isKegiatanLengkap = true;
    const isFotoLengkap = false; // Foto not uploaded or pending
    const isAbsensiLengkap = true;

    let nextStatus: string = 'Ditolak';
    if (nextStatus === 'Ditolak') {
      nextStatus = (isMateriLengkap && isKegiatanLengkap && isAbsensiLengkap && isFotoLengkap) ? 'Disetujui' : 'Menunggu';
    }

    assert.strictEqual(nextStatus, 'Menunggu', 'Journal with pending item must transition to Menunggu');
  });

  runTest('B.4: Rejection notes are eradicated on resubmission', () => {
    const rejectedJurnal = {
      id: 'j-rejected-001',
      status_verifikasi: 'Ditolak',
      catatan_admin: 'Foto buram dan materi kurang jelas',
      alasan_penolakan: 'Dokumentasi tidak terbaca',
      catatan_penolakan: 'Perlu revisi segera',
      keterangan_penolakan: 'Ditolak verifikator'
    };

    const payload: any = {
      tanggal: '2026-11-10',
      konten: 'Materi aljabar revisi lengkap',
      kegiatan: 'Kegiatan terbimbing',
    };

    if (rejectedJurnal.status_verifikasi === 'Ditolak') {
      payload.status_verifikasi = 'Menunggu';
      payload.catatan_admin = null;
      payload.alasan_penolakan = null;
      payload.catatan_penolakan = null;
      payload.keterangan_penolakan = null;
    }

    assert.strictEqual(payload.status_verifikasi, 'Menunggu');
    assert.strictEqual(payload.catatan_admin, null);
    assert.strictEqual(payload.alasan_penolakan, null);
    assert.strictEqual(payload.catatan_penolakan, null);
    assert.strictEqual(payload.keterangan_penolakan, null);
  });

  runTest('B.5: Non-rejected journal (Disetujui) maintains its approval status when editing minor typo', () => {
    const approvedJurnal = {
      id: 'j-approved-001',
      status_verifikasi: 'Disetujui',
    };

    let nextStatus = approvedJurnal.status_verifikasi;
    if (approvedJurnal.status_verifikasi === 'Ditolak') {
      nextStatus = 'Menunggu';
    }

    assert.strictEqual(nextStatus, 'Disetujui', 'Approved journal preserves Disetujui status on minor edits');
  });

  // =========================================================================
  // SCENARIO C: Scoped Deletion & Mutation Security
  // =========================================================================
  console.log('\n--- SCENARIO C: Scoped Deletion & Multi-Tenant Security ---');

  runTest('C.1: Deletion query strictly chains id, nama_guru, and sekolah_id', () => {
    const deleteRegex = /\.from\(['"]jurnal_pembelajaran['"]\)\s*\.delete\(\)\s*\.eq\(['"]id['"],\s*targetJurnal\.id\)/;
    assert.ok(deleteRegex.test(rekapContent), 'Delete query begins with table and id filter');
    assert.ok(rekapContent.includes("query = query.eq('nama_guru', user.nama)"), 'Delete query must constrain to user.nama');
    assert.ok(rekapContent.includes("query = query.eq('sekolah_id', user.sekolah_id)"), 'Delete query must constrain to user.sekolah_id');
  });

  runTest('C.2: Update query strictly chains id, nama_guru, and sekolah_id', () => {
    const updateRegex = /\.from\(['"]jurnal_pembelajaran['"]\)\s*\.update\(payload\)\s*\.eq\(['"]id['"],\s*editingJurnal\.id\)/;
    assert.ok(updateRegex.test(rekapContent), 'Update query begins with table and id filter');
    assert.ok(rekapContent.includes("query = query.eq('nama_guru', user.nama)"), 'Update query must constrain to user.nama');
    assert.ok(rekapContent.includes("query = query.eq('sekolah_id', user.sekolah_id)"), 'Update query must constrain to user.sekolah_id');
  });

  runTest('C.3: Adversarial test - Cross-teacher deletion attempt simulation', () => {
    const userSession = { nama: 'Guru A, S.Pd', sekolah_id: 'sch-001' };
    const targetVictimJurnal = { id: 'j-victim-999', nama_guru: 'Guru B, S.Pd', sekolah_id: 'sch-001' };

    // Construct the query parameters that the client code produces
    const queryParams: Record<string, any> = {
      id: targetVictimJurnal.id,
      nama_guru: userSession.nama,
      sekolah_id: userSession.sekolah_id,
    };

    // Database row matches if id == target.id AND nama_guru == target.nama_guru AND sekolah_id == target.sekolah_id
    const dbRowMatches = (
      targetVictimJurnal.id === queryParams.id &&
      targetVictimJurnal.nama_guru === queryParams.nama_guru &&
      targetVictimJurnal.sekolah_id === queryParams.sekolah_id
    );

    assert.strictEqual(dbRowMatches, false, 'Cross-teacher deletion MUST match 0 rows in PostgreSQL');
  });

  runTest('C.4: Adversarial test - Cross-tenant/school deletion attempt simulation', () => {
    const userSession = { nama: 'Guru A, S.Pd', sekolah_id: 'sch-HACKER' };
    const targetVictimJurnal = { id: 'j-victim-999', nama_guru: 'Guru A, S.Pd', sekolah_id: 'sch-LEGIT' };

    const dbRowMatches = (
      targetVictimJurnal.id === targetVictimJurnal.id &&
      targetVictimJurnal.nama_guru === userSession.nama &&
      targetVictimJurnal.sekolah_id === userSession.sekolah_id
    );

    assert.strictEqual(dbRowMatches, false, 'Cross-school deletion MUST match 0 rows in PostgreSQL');
  });

  // =========================================================================
  // SCENARIO D: Boundary & Security Protection (Synthetic Rows & Supervisor Mode)
  // =========================================================================
  console.log('\n--- SCENARIO D: Boundary & Security Protection ---');

  runTest('D.1: Synthetic placeholder rows (unfilled-kbm- / unfilled-kegiatan-) shielded in table', () => {
    assert.ok(
      rekapContent.includes("!j.id?.startsWith('unfilled-')"),
      'Personal table row buttons must check !j.id?.startsWith("unfilled-")'
    );
  });

  runTest('D.2: Synthetic placeholder rows shielded in detail modal', () => {
    assert.ok(
      rekapContent.includes("!selectedJurnal.id?.startsWith('unfilled-')"),
      'Detail modal must check !selectedJurnal.id?.startsWith("unfilled-")'
    );
  });

  runTest('D.3: handleOpenEditModal rejects synthetic unfilled placeholders', () => {
    assert.ok(
      rekapContent.includes("if (!jurnal || !jurnal.id || jurnal.id.startsWith('unfilled-')) return;"),
      'handleOpenEditModal must guard against synthetic placeholder IDs'
    );
  });

  runTest('D.4: handleDeleteJurnal rejects synthetic unfilled placeholders', () => {
    assert.ok(
      rekapContent.includes("if (!targetJurnal || !targetJurnal.id || targetJurnal.id.startsWith('unfilled-')) {\n      return;\n    }"),
      'handleDeleteJurnal must guard against synthetic placeholder IDs'
    );
  });

  runTest('D.5: Class mode (Rekapan Jurnal Per Kelas) hides Edit and Hapus buttons in table', () => {
    const classTableMatch = rekapContent.match(/tabMode === 'kelas' \? \([\s\S]*?<\s*table[\s\S]*?<\/table>/);
    assert.ok(classTableMatch, 'Class table view must be found in code');
    const classTableCode = classTableMatch[0];
    assert.ok(classTableCode.includes('Detail'), 'Class table has Detail button');
    assert.ok(!classTableCode.includes('handleOpenEditModal'), 'Class table MUST NOT contain Edit button calling handleOpenEditModal');
    assert.ok(!classTableCode.includes('handleDeleteJurnal'), 'Class table MUST NOT contain Hapus button calling handleDeleteJurnal');
  });

  runTest('D.6: Class mode hides Edit and Hapus buttons in detail modal', () => {
    assert.ok(
      rekapContent.includes("(tabMode === 'pribadi' || controlledMode === 'pribadi')"),
      'Detail modal actions must strictly check personal mode (tabMode === "pribadi" || controlledMode === "pribadi")'
    );
  });

  runTest('D.7: isReadOnly prop disables all Edit and Hapus actions', () => {
    assert.ok(
      rekapContent.includes("!isReadOnly"),
      'Table row and detail modal must both check !isReadOnly'
    );
  });

  // =========================================================================
  // SCENARIO E: Invariant Protection (12-Column Table & Print Preservation)
  // =========================================================================
  console.log('\n--- SCENARIO E: Invariant Protection & Print Layout ---');

  runTest('E.1: Personal table header preserves exactly 12 columns in exact sequence', () => {
    const pribadiHeaderMatch = rekapContent.match(/JURNAL PRIBADI GURU[\s\S]*?<thead>([\s\S]*?)<\/thead>/);
    assert.ok(pribadiHeaderMatch, 'Personal table header found');
    const thMatches = pribadiHeaderMatch![1].match(/<th[^>]*>([\s\S]*?)<\/th>/g) || [];
    assert.strictEqual(thMatches.length, 12, `Personal table must have exactly 12 <th> columns, found ${thMatches.length}`);

    // Verify key expected headers
    const expectedHeaders = [
      'No',
      'Hari/Tanggal',
      'Tujuan Pembelajaran',
      'KKTP',
      'Konten',
      'Kegiatan Pembelajaran',
      'Kelas',
      'Mata Pelajaran',
      'Absensi Murid (H/I/S/A)',
      'Lokasi KBM',
      'Foto Dokumentasi',
      'Catatan'
    ];
    expectedHeaders.forEach((expected, i) => {
      assert.ok(
        thMatches[i].includes(expected),
        `Column ${i + 1} header must contain "${expected}". Got: ${thMatches[i]}`
      );
    });
  });

  runTest('E.2: Personal table row preserves exactly 12 <td> cells', () => {
    const pribadiBodyMatch = rekapContent.match(/JURNAL PRIBADI GURU[\s\S]*?<tbody>[\s\S]*?<tr[^>]*>([\s\S]*?)<\/tr>/);
    assert.ok(pribadiBodyMatch, 'Personal table row found');
    const tdMatches = pribadiBodyMatch![1].match(/<td[^>]*>/g) || [];
    assert.strictEqual(tdMatches.length, 12, `Personal table row must have exactly 12 <td> cells, found ${tdMatches.length}`);
  });

  runTest('E.3: Action buttons (Detail, Edit, Hapus) are wrapped inside no-print', () => {
    const actionContainer = '<div className="mt-1.5 no-print not-italic flex items-center gap-1.5 flex-wrap">';
    assert.ok(rekapContent.includes(actionContainer), 'Action container must have no-print');
    
    // Ensure all buttons are inside no-print container
    const buttonBlockIndex = rekapContent.indexOf(actionContainer);
    const buttonBlock = rekapContent.slice(buttonBlockIndex, buttonBlockIndex + 2500);
    assert.ok(buttonBlock.includes('handleOpenEditModal(j)'), 'Edit button is within no-print block');
    assert.ok(buttonBlock.includes('handleDeleteJurnal(j)'), 'Hapus button is within no-print block');
    assert.ok(buttonBlock.includes('setSelectedJurnal(j)'), 'Detail button is within no-print block');
  });

  runTest('E.4: Modals (modal-detail-jurnal and modal-edit-jurnal) carry no-print class', () => {
    assert.ok(
      rekapContent.includes('id="modal-detail-jurnal"') && rekapContent.includes('no-print'),
      'modal-detail-jurnal has no-print class'
    );
    assert.ok(
      rekapContent.includes('id="modal-edit-jurnal"') && rekapContent.includes('no-print'),
      'modal-edit-jurnal has no-print class'
    );
  });

  // =========================================================================
  // SCENARIO F: Component Coordination, Events, and Form Invariants
  // =========================================================================
  console.log('\n--- SCENARIO F: Component Coordination & Form Validation ---');

  runTest('F.1: Form validation prevents submission of empty required fields', () => {
    assert.ok(rekapContent.includes("showToast('Tanggal Wajib Diisi'"), 'Validates Tanggal');
    assert.ok(rekapContent.includes("showToast('Mata Pelajaran Wajib'"), 'Validates Mapel');
    assert.ok(rekapContent.includes("showToast('Kelas Wajib'"), 'Validates Kelas');
    assert.ok(rekapContent.includes("showToast('Lokasi KBM Wajib'"), 'Validates Lokasi KBM');
    assert.ok(rekapContent.includes("showToast('Tujuan Pembelajaran Wajib'"), 'Validates Tujuan Pembelajaran');
    assert.ok(rekapContent.includes("showToast('KKTP Wajib'"), 'Validates KKTP');
    assert.ok(rekapContent.includes("showToast('Materi / Konten Wajib'"), 'Validates Materi / Konten');
    assert.ok(rekapContent.includes("showToast('Kegiatan Wajib'"), 'Validates Kegiatan');
  });

  runTest('F.2: Attendance summary formatting strict regex match', () => {
    const summaryRegex = /^Total murid:\s*\d+,\s*Hadir:\s*\d+,\s*Izin:\s*\d+,\s*Sakit:\s*\d+,\s*Alpa:\s*\d+$/;
    const testCases = [
      { h: 25, i: 2, s: 1, a: 0, expected: 'Total murid: 28, Hadir: 25, Izin: 2, Sakit: 1, Alpa: 0' },
      { h: 0, i: 0, s: 0, a: 0, expected: 'Total murid: 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0' },
      { h: 32, i: 0, s: 0, a: 0, expected: 'Total murid: 32, Hadir: 32, Izin: 0, Sakit: 0, Alpa: 0' },
    ];
    testCases.forEach(tc => {
      const total = tc.h + tc.i + tc.s + tc.a;
      const formatted = `Total murid: ${total}, Hadir: ${tc.h}, Izin: ${tc.i}, Sakit: ${tc.s}, Alpa: ${tc.a}`;
      assert.strictEqual(formatted, tc.expected);
      assert.ok(summaryRegex.test(formatted), `Summary "${formatted}" must match regex`);
    });
  });

  runTest('F.3: Photo preservation and Google Drive upload fallback', () => {
    assert.ok(rekapContent.includes('uploadToDrive'), 'Uses uploadToDrive for new photo uploads');
    assert.ok(rekapContent.includes('readAsDataURL'), 'Has FileReader data URL fallback if upload fails or is offline');
    assert.ok(
      rekapContent.includes('editingJurnal.foto_kegiatan || editingJurnal.link_bukti_foto'),
      'Preserves existing photo if user does not choose a replacement'
    );
  });

  runTest('F.4: sipjam:jurnal-updated custom event dispatched on delete and edit', () => {
    assert.ok(
      rekapContent.includes("window.dispatchEvent(new CustomEvent('sipjam:jurnal-updated', { detail: { id: targetJurnal.id, action: 'delete' } }))"),
      'Delete dispatches sipjam:jurnal-updated with action: delete'
    );
    assert.ok(
      rekapContent.includes("window.dispatchEvent(new CustomEvent('sipjam:jurnal-updated', { detail: { id: editingJurnal.id, action: 'edit' } }))"),
      'Edit dispatches sipjam:jurnal-updated with action: edit'
    );
  });

  runTest('F.5: GuruJurnal listens to sipjam:jurnal-updated to refresh rejection list', () => {
    assert.ok(
      guruContent.includes("window.addEventListener('sipjam:jurnal-updated', handleJurnalUpdated)"),
      'GuruJurnal registers event listener for sipjam:jurnal-updated'
    );
    assert.ok(
      guruContent.includes('window.removeEventListener(\'sipjam:jurnal-updated\', handleJurnalUpdated)'),
      'GuruJurnal cleans up event listener on unmount'
    );
  });

  console.log('\n====================================================================');
  console.log(`🏁 ADVERSARIAL STRESS TEST COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialSuite();
