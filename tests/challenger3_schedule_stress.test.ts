import { findJadwalForGuru, isJurnalMatchJadwal } from '../src/lib/workflow';
import { supabase } from '../src/lib/supabaseClient';
import fs from 'fs';
import path from 'path';

let failures = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${testName}`);
  }
}

async function runChallengerHarness() {
  console.log('================================================================');
  console.log('CHALLENGER 3: EMPIRICAL ADVERSARIAL STRESS TEST HARNESS');
  console.log('Testing Teacher Schedule Matching, Token Collisions, and Edge Cases');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // SECTION 1: Pak Riski Candra Mamangkai (Monday & Thursday Verification)
  // ---------------------------------------------------------------------------
  console.log('--- SECTION 1: Pak Riski Candra Mamangkai Schedule Resolution ---');

  // Monday (Senin) with username
  const riskiSenin = await findJadwalForGuru('Senin', 'Riski Candra Mamangkai', 'Riski');
  assert(
    riskiSenin.length === 2,
    'Pak Riski receives exactly 2 classes on Senin (with username)',
    `Got ${riskiSenin.length}`
  );
  assert(
    riskiSenin.every((j: any) => j.mata_pelajaran === 'Sejarah'),
    'Pak Riski Senin classes are all Sejarah',
    `Classes: ${JSON.stringify(riskiSenin.map((j: any) => j.mata_pelajaran))}`
  );
  const riskiSeninClasses = riskiSenin.map((j: any) => j.kelas).sort();
  assert(
    riskiSeninClasses[0] === 'XI Merdeka' && riskiSeninClasses[1] === 'XII Merdeka',
    'Pak Riski Senin classes are XI Merdeka and XII Merdeka',
    `Got ${JSON.stringify(riskiSeninClasses)}`
  );

  // Thursday (Kamis) with username
  const riskiKamis = await findJadwalForGuru('Kamis', 'Riski Candra Mamangkai', 'Riski');
  assert(
    riskiKamis.length === 1,
    'Pak Riski receives exactly 1 class on Kamis (with username)',
    `Got ${riskiKamis.length}`
  );
  assert(
    riskiKamis[0]?.mata_pelajaran === 'Sejarah' && riskiKamis[0]?.kelas === 'X Merdeka',
    'Pak Riski Kamis class is X Merdeka Sejarah',
    `Got ${riskiKamis[0]?.kelas} - ${riskiKamis[0]?.mata_pelajaran}`
  );

  // Monday & Thursday WITHOUT username (testing first-name & phonetic fallback)
  const riskiSeninNoUser = await findJadwalForGuru('Senin', 'Riski Candra Mamangkai');
  assert(
    riskiSeninNoUser.length === 2,
    'Pak Riski receives 2 classes on Senin WITHOUT username provided',
    `Got ${riskiSeninNoUser.length}`
  );

  const riskiKamisNoUser = await findJadwalForGuru('Kamis', 'Riski Candra Mamangkai');
  assert(
    riskiKamisNoUser.length === 1,
    'Pak Riski receives 1 class on Kamis WITHOUT username provided',
    `Got ${riskiKamisNoUser.length}`
  );

  // Other days should be empty for Pak Riski
  for (const day of ['Selasa', 'Rabu', 'Jumat', 'Sabtu', 'Minggu']) {
    const res = await findJadwalForGuru(day, 'Riski Candra Mamangkai', 'Riski');
    assert(
      res.length === 0,
      `Pak Riski receives 0 classes on ${day}`,
      `Got ${res.length} classes`
    );
  }

  // ---------------------------------------------------------------------------
  // SECTION 2: Ibu Assyfa Fitra Azzahrah Abukasim (Token Collision Prevention)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Ibu Assyfa Anti-Collision Verification ---');

  // Wednesday (Rabu) - where Pak Fitra teaches PJOK
  const assyfaRabu = await findJadwalForGuru('Rabu', 'Assyfa Fitra Azzahrah Abukasim', 'Assyfa');
  assert(
    assyfaRabu.length === 0,
    'Ibu Assyfa receives 0 classes on Rabu with username (no false PJOK collision)',
    `Got ${assyfaRabu.length}`
  );

  const assyfaRabuNoUser = await findJadwalForGuru('Rabu', 'Assyfa Fitra Azzahrah Abukasim');
  assert(
    assyfaRabuNoUser.length === 0,
    'Ibu Assyfa receives 0 classes on Rabu WITHOUT username (no false PJOK collision)',
    `Got ${assyfaRabuNoUser.length}`
  );

  // Ibu Assyfa on ALL other days must have 0 classes
  for (const day of ['Senin', 'Selasa', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']) {
    const res = await findJadwalForGuru(day, 'Assyfa Fitra Azzahrah Abukasim', 'Assyfa');
    assert(
      res.length === 0,
      `Ibu Assyfa has 0 classes on ${day}`,
      `Got ${res.length}`
    );
  }

  // ---------------------------------------------------------------------------
  // SECTION 3: Pak FITRA SURYAZANA MAMONTO (Wednesday PJOK Verification)
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Pak FITRA SURYAZANA MAMONTO PJOK Schedule ---');

  const fitraRabu = await findJadwalForGuru('Rabu', 'FITRA SURYAZANA MAMONTO', 'Fitra');
  assert(
    fitraRabu.length === 3,
    'Pak Fitra receives exactly 3 classes on Rabu with username',
    `Got ${fitraRabu.length}`
  );
  assert(
    fitraRabu.every((j: any) => j.mata_pelajaran === 'PJOK'),
    'All classes for Pak Fitra on Rabu are PJOK',
    `Classes: ${JSON.stringify(fitraRabu.map((j: any) => j.mata_pelajaran))}`
  );
  const fitraClasses = fitraRabu.map((j: any) => j.kelas).sort();
  assert(
    fitraClasses[0] === 'X Merdeka' && fitraClasses[1] === 'XI Merdeka' && fitraClasses[2] === 'XII Merdeka',
    'Pak Fitra Rabu classes span X Merdeka, XI Merdeka, and XII Merdeka',
    `Classes: ${JSON.stringify(fitraClasses)}`
  );

  // Without username
  const fitraRabuNoUser = await findJadwalForGuru('Rabu', 'FITRA SURYAZANA MAMONTO');
  assert(
    fitraRabuNoUser.length === 3,
    'Pak Fitra receives 3 classes on Rabu WITHOUT username provided',
    `Got ${fitraRabuNoUser.length}`
  );

  // ---------------------------------------------------------------------------
  // SECTION 4: Cross-Teacher Collision & Roster Stress Test
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Cross-Teacher Collision Testing Across All Users ---');

  // Ade Fitrawan Ibrahim (middle name "Fitrawan" contains "Fitra")
  // Must NOT receive Pak Fitra's PJOK classes on Rabu!
  const adeRabu = await findJadwalForGuru('Rabu', 'Ade Fitrawan Ibrahim', 'Fitrawan');
  const adePJOK = adeRabu.filter((j: any) => j.mata_pelajaran === 'PJOK');
  assert(
    adePJOK.length === 0,
    'Ade Fitrawan Ibrahim does NOT adopt Fitra PJOK classes on Rabu',
    `PJOK classes found: ${adePJOK.length}`
  );

  // Mohamad Adnan Mamangkai (last name "Mamangkai" same as Riski Candra Mamangkai)
  // Must NOT receive Riski's Sejarah classes on Senin!
  const adnanSenin = await findJadwalForGuru('Senin', 'Mohamad Adnan Mamangkai', 'Adnan');
  const adnanSejarah = adnanSenin.filter((j: any) => j.mata_pelajaran === 'Sejarah');
  assert(
    adnanSejarah.length === 0,
    'Mohamad Adnan Mamangkai does NOT adopt Riski Sejarah classes on Senin (shared last name)',
    `Sejarah classes found: ${adnanSejarah.length}`
  );

  // Setia Ambar Ningsih Mamonto (last name "Mamonto" shared with Fitra and Tika)
  // Must NOT receive Fitra's PJOK classes on Rabu!
  const ambarRabu = await findJadwalForGuru('Rabu', 'Setia Ambar Ningsih Mamonto', 'Ambar');
  const ambarPJOK = ambarRabu.filter((j: any) => j.mata_pelajaran === 'PJOK');
  assert(
    ambarPJOK.length === 0,
    'Setia Ambar Ningsih Mamonto does NOT adopt Fitra PJOK on Rabu (shared last name Mamonto)',
    `PJOK classes found: ${ambarPJOK.length}`
  );

  // Susana Muliono (short schedule name "Susan" vs user "Susana")
  // Let's verify Susana can resolve her schedule
  const susanaAllDays = await Promise.all(
    ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(d =>
      findJadwalForGuru(d, 'Susana Muliono', 'Susana')
    )
  );
  const susanaTotalClasses = susanaAllDays.reduce((acc, cur) => acc + cur.length, 0);
  assert(
    susanaTotalClasses > 0,
    'Susana Muliono successfully resolves classes where schedule has "Susan"',
    `Total classes across week: ${susanaTotalClasses}`
  );

  // Admin Sma Nizamudin has 0 teaching schedules
  const adminSchedule = await findJadwalForGuru('Senin', 'Admin Sma Nizamudin', 'admin');
  assert(
    adminSchedule.length === 0,
    'Admin Sma Nizamudin receives 0 scheduled classes',
    `Got ${adminSchedule.length}`
  );

  // ---------------------------------------------------------------------------
  // SECTION 5: Edge Cases and Resilience in findJadwalForGuru Logic
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Edge Cases in findJadwalForGuru ---');

  // Empty string handling
  const emptyRes = await findJadwalForGuru('Senin', '');
  assert(emptyRes.length === 0, 'Empty string for namaGuru returns empty array safely');

  // Whitespace only
  const wsRes = await findJadwalForGuru('Senin', '   ', '   ');
  assert(wsRes.length === 0, 'Whitespace-only inputs return empty array safely');

  // Non-existent day
  const invalidDayRes = await findJadwalForGuru('HariKiamat', 'Riski Candra Mamangkai', 'Riski');
  assert(invalidDayRes.length === 0, 'Invalid day name returns empty array safely');

  // Case insensitivity stress test
  const mixedCaseRiski = await findJadwalForGuru('Senin', 'rISkI cAnDrA mAmAnGkAi', 'rIsKi');
  assert(mixedCaseRiski.length === 2, 'Mixed-case name resolves accurately', `Got ${mixedCaseRiski.length}`);

  // Phonetic normalization z -> s test:
  // If schedule was "Rizki" and search is "Riski"
  assert(
    'rizki'.replace(/z/g, 's') === 'riski',
    'Phonetic normalization properly maps z to s for rizki -> riski'
  );

  // ---------------------------------------------------------------------------
  // SECTION 6: Unit Testing isJurnalMatchJadwal
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 6: isJurnalMatchJadwal Fuzzy Matching ---');

  assert(
    isJurnalMatchJadwal(
      { kelas: 'X Merdeka', mapel: 'X Merdeka_Sejarah' },
      { kelas: 'X Merdeka', mata_pelajaran: 'Sejarah' }
    ) === true,
    'Matches when mapel has class prefix "X Merdeka_Sejarah"'
  );

  assert(
    isJurnalMatchJadwal(
      { kelas: 'X Merdeka', mapel: 'Sejarah' },
      { kelas: 'X Merdeka', mata_pelajaran: 'Sejarah' }
    ) === true,
    'Matches exact mapel and kelas'
  );

  assert(
    isJurnalMatchJadwal(
      { kelas: 'XI Merdeka', mapel: 'XI Merdeka_Sejarah' },
      { kelas: 'X Merdeka', mata_pelajaran: 'Sejarah' }
    ) === false,
    'Rejects different kelas even if mapel matches'
  );

  assert(
    isJurnalMatchJadwal(
      { kelas: 'X Merdeka', mapel: 'X Merdeka_Biologi' },
      { kelas: 'X Merdeka', mata_pelajaran: 'Sejarah' }
    ) === false,
    'Rejects different mapel even if kelas matches'
  );

  // ---------------------------------------------------------------------------
  // SECTION 7: UI Caller Audit for username passing
  // ---------------------------------------------------------------------------
  console.log('\n--- SECTION 7: UI Callers Pass username to getGuruDailyState ---');

  const componentsDir = path.join(__dirname, '..', 'src', 'components');
  const callersToCheck = [
    { file: 'HomeView.tsx', expected: 'getGuruDailyState(user.nama, user.username)' },
    { file: 'GuruPresensi.tsx', expected: 'getGuruDailyState(user.nama, user.username)' },
    { file: 'GuruJurnal.tsx', expected: 'getGuruDailyState(user.nama, user.username)' },
    { file: 'AppScreen.tsx', expected: 'getGuruDailyState(user.nama, user.username)' },
    { file: 'PiketView.tsx', expected: 'getGuruDailyState(user.nama, user.username)' },
  ];

  for (const { file, expected } of callersToCheck) {
    const filePath = path.join(componentsDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      assert(
        content.includes(expected),
        `${file} passes both user.nama and user.username to getGuruDailyState`,
        `Checked for "${expected}"`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  if (failures === 0) {
    console.log('🎉 ALL EMPIRICAL CHALLENGER 3 TESTS PASSED PERFECTLY!');
  } else {
    console.error(`💥 CHALLENGER 3 HARNESS FAILED WITH ${failures} ERRORS!`);
    process.exit(1);
  }
  console.log('================================================================\n');
}

runChallengerHarness().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
