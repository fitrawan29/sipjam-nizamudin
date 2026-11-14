import assert from 'assert';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config();

import { isSchemaCacheOrMissingTableError } from '../src/lib/supabaseClient';

let passCount = 0;
let failCount = 0;

function pass(name: string) {
  console.log(`  ✔ PASS: ${name}`);
  passCount++;
}

function fail(name: string, error?: any) {
  console.error(`  ✘ FAIL: ${name}`, error || '');
  failCount++;
}

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 TEST SUITE: JURNAL PEMBELAJARAN LOKASI SCHEMA CACHE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SUITE 1: SQL MIGRATION & TEMPLATE INTEGRITY
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: SQL MIGRATION & TEMPLATE INTEGRITY ---');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261114_fix_jurnal_pembelajaran_lokasi_schema_cache.sql');
  try {
    assert(fs.existsSync(migrationPath), 'Migration file 20261114_fix_jurnal_pembelajaran_lokasi_schema_cache.sql must exist');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    assert(migrationSql.includes('ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS lokasi TEXT;'), 'Migration adds lokasi column idempotently');
    assert(migrationSql.includes('ALTER TABLE public.jurnal_pembelajaran ADD COLUMN IF NOT EXISTS lokasi_kbm TEXT;'), 'Migration adds lokasi_kbm column idempotently');
    assert(migrationSql.includes('UPDATE public.jurnal_pembelajaran'), 'Migration backfills lokasi and lokasi_kbm');
    assert(migrationSql.includes('sync_jurnal_pembelajaran_lokasi'), 'Migration defines bidirectional lokasi sync function');
    assert(migrationSql.includes('trg_sync_jurnal_pembelajaran_lokasi'), 'Migration attaches bidirectional lokasi sync trigger');
    assert(migrationSql.includes("NOTIFY pgrst, 'reload schema'"), 'Migration notifies PostgREST to reload schema cache');
    pass('1.1: Migration 20261114_fix_jurnal_pembelajaran_lokasi_schema_cache.sql contains complete DDL, backfill, trigger, and schema reload');
  } catch (e) {
    fail('1.1 failed', e);
  }

  const templatePath = path.join(__dirname, '..', 'supabase', 'SETUP_NEW_SCHOOL_TEMPLATE.sql');
  const templateSql = fs.readFileSync(templatePath, 'utf8');

  try {
    assert(templateSql.includes('lokasi TEXT'), 'SETUP_NEW_SCHOOL_TEMPLATE.sql includes lokasi in table definition');
    assert(templateSql.includes('lokasi_kbm TEXT'), 'SETUP_NEW_SCHOOL_TEMPLATE.sql includes lokasi_kbm in table definition');
    assert(templateSql.includes('sync_jurnal_pembelajaran_lokasi'), 'SETUP_NEW_SCHOOL_TEMPLATE.sql includes bidirectional lokasi sync trigger');
    pass('1.2: SETUP_NEW_SCHOOL_TEMPLATE.sql defines lokasi, lokasi_kbm, and sync trigger for new schools');
  } catch (e) {
    fail('1.2 failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 2: CLIENT SCHEMA CACHE ERROR DETECTION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: SCHEMA CACHE ERROR DETECTION HELPER ---');

  try {
    const errorPgrst204 = {
      code: 'PGRST204',
      message: "Could not find the 'lokasi' column of 'jurnal_pembelajaran' in the schema cache",
      details: null,
      hint: null
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(errorPgrst204), true, 'Detects exact PostgREST PGRST204 error for lokasi');

    const errorMessageOnly = {
      message: "Could not find the 'lokasi' column of 'jurnal_pembelajaran' in the schema cache"
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(errorMessageOnly), true, 'Detects error by message string for lokasi');

    const errorPostgres42703 = {
      code: '42703',
      message: 'column jurnal_pembelajaran.lokasi does not exist'
    };
    assert.strictEqual(isSchemaCacheOrMissingTableError(errorPostgres42703), true, 'Detects PostgreSQL undefined column 42703 for lokasi');

    const supabaseClientPath = path.join(__dirname, '..', 'src', 'lib', 'supabaseClient.ts');
    const supabaseClientCode = fs.readFileSync(supabaseClientPath, 'utf8');
    assert(supabaseClientCode.includes("includes('lokasi') &&") && supabaseClientCode.includes("includes('schema cache')"), 'supabaseClient.ts explicitly checks for lokasi schema cache errors');

    pass('2.1: isSchemaCacheOrMissingTableError accurately identifies PGRST204 and missing lokasi errors');
  } catch (e) {
    fail('2.1 failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 3: FRONTEND CODE DEFENSIVE AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: FRONTEND CODE DEFENSIVE AUDIT ---');

  const rekapJurnalPath = path.join(__dirname, '..', 'src', 'components', 'RekapJurnalView.tsx');
  const rekapJurnalCode = fs.readFileSync(rekapJurnalPath, 'utf8');

  try {
    assert(rekapJurnalCode.includes('lokasi: _lok'), 'RekapJurnalView strips lokasi on update schema cache error');
    assert(rekapJurnalCode.includes('lokasi_kbm: _lk'), 'RekapJurnalView strips lokasi_kbm on update schema cache error');
    assert(rekapJurnalCode.includes('kegiatan_pembelajaran: _kp'), 'RekapJurnalView preserves stripping kegiatan_pembelajaran on update schema cache error');
    pass('3.1: RekapJurnalView.tsx handleSaveEdit strips lokasi and optional migration columns on schema cache error');
  } catch (e) {
    fail('3.1 failed', e);
  }

  const guruJurnalPath = path.join(__dirname, '..', 'src', 'components', 'GuruJurnal.tsx');
  const guruJurnalCode = fs.readFileSync(guruJurnalPath, 'utf8');

  try {
    assert(guruJurnalCode.includes('lokasi: _lok'), 'GuruJurnal strips lokasi on schema cache error');
    assert(guruJurnalCode.includes('lokasi_kbm: _lk'), 'GuruJurnal strips lokasi_kbm on schema cache error');
    pass('3.2: GuruJurnal.tsx strips lokasi and lokasi_kbm on schema cache mismatch');
  } catch (e) {
    fail('3.2 failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 4: SIMULATED END-TO-END FALLBACK EXECUTION (REKAP JURNAL EDIT)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: SIMULATED END-TO-END FALLBACK EXECUTION ---');

  try {
    let attempts = 0;
    let lastUpdatedPayload: any = null;
    const mockSupabase = {
      from: (_tbl: string) => ({
        update: (row: any) => ({
          eq: (_col: string, _val: any) => {
            const chain: any = {
              eq: () => chain,
              then: (resolve: any) => {
                attempts++;
                if ('lokasi' in row) {
                  return resolve({
                    data: null,
                    error: {
                      code: 'PGRST204',
                      message: "Could not find the 'lokasi' column of 'jurnal_pembelajaran' in the schema cache"
                    }
                  });
                }
                lastUpdatedPayload = row;
                return resolve({ data: [row], error: null });
              }
            };
            return chain;
          }
        })
      })
    };

    const editPayload: any = {
      tanggal: '2026-11-14',
      jam_ke: '1-2',
      pertemuan_ke: '3',
      mapel: 'Matematika',
      kelas: 'VII-A',
      lokasi_kbm: 'Ruang Kelas VII-A',
      lokasi: 'Ruang Kelas VII-A',
      tujuan_pembelajaran: 'Memahami persamaan linear',
      kktp: 'Mampu menyelesaikan soal persamaan linear',
      konten: 'Persamaan Linear Satu Variabel',
      materi: 'Persamaan Linear Satu Variabel',
      materi_pembelajaran: 'Persamaan Linear Satu Variabel',
      kegiatan: 'Diskusi dan latihan soal',
      kegiatan_pembelajaran: 'Diskusi dan latihan soal',
      catatan_refleksi: 'Kondusif',
      refleksi: 'Kondusif',
      catatan_khusus_siswa: null,
      kehadiran_murid: 'Total murid: 20, Hadir: 20, Izin: 0, Sakit: 0, Alpa: 0',
      link_bukti_foto: 'https://example.com/foto.jpg',
      foto_kegiatan: 'https://example.com/foto.jpg',
      status_verifikasi: 'Disetujui',
      catatan_admin: null,
      alasan_penolakan: null,
      catatan_penolakan: null,
      keterangan_penolakan: null
    };

    let { error } = await mockSupabase.from('jurnal_pembelajaran').update(editPayload).eq('id', 'jurnal-001');
    if (error && (isSchemaCacheOrMissingTableError(error) || error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('schema cache') || error.message?.includes('column'))) {
      const errMsg = String(error?.message || '').toLowerCase();
      const { catatan_penolakan: _cp, keterangan_penolakan: _ketp, ...baseTargeted } = editPayload;
      const targetedPayload: any = { ...baseTargeted };
      if (errMsg.includes("'lokasi'") || (errMsg.includes('lokasi') && !errMsg.includes('lokasi_kbm'))) delete targetedPayload.lokasi;
      if (errMsg.includes('lokasi_kbm')) delete targetedPayload.lokasi_kbm;
      if (errMsg.includes('kegiatan_pembelajaran')) delete targetedPayload.kegiatan_pembelajaran;
      let retryRes = await mockSupabase.from('jurnal_pembelajaran').update(targetedPayload).eq('id', 'jurnal-001');
      if (retryRes.error && (isSchemaCacheOrMissingTableError(retryRes.error) || retryRes.error.code === 'PGRST204' || retryRes.error.code === '42703' || retryRes.error.message?.includes('schema cache') || retryRes.error.message?.includes('column'))) {
        const {
          kegiatan_pembelajaran: _kp,
          lokasi: _lok,
          lokasi_kbm: _lk,
          kktp: _k,
          konten: _ko,
          catatan_khusus_siswa: _ck,
          catatan_penolakan: _cp2,
          keterangan_penolakan: _ketp2,
          ...compatiblePayload
        } = editPayload;
        retryRes = await mockSupabase.from('jurnal_pembelajaran').update(compatiblePayload).eq('id', 'jurnal-001');
      }
      error = retryRes.error;
    }

    assert.strictEqual(error, null, 'Update resolved cleanly after stripping missing lokasi column');
    assert.strictEqual(attempts, 2, 'Succeeded on first targeted fallback retry');
    assert(!('lokasi' in lastUpdatedPayload), 'lokasi stripped when missing in schema cache');
    assert.strictEqual(lastUpdatedPayload.lokasi_kbm, 'Ruang Kelas VII-A', 'lokasi_kbm preserved when only lokasi is missing');
    pass('4.1: Simulated RekapJurnalView edit fallback succeeds cleanly when lokasi column is missing in schema cache');
  } catch (e) {
    fail('4.1 failed', e);
  }

  // --------------------------------------------------------------------------
  // SUITE 5: LIVE DATABASE OPERATIONS
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: LIVE DATABASE OPERATIONS ---');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (url && key) {
    try {
      const baseClient = createClient(url, key);
      const { data: loginData } = await baseClient.rpc('verify_login', {
        p_username: 'superadmin',
        p_password: 'SipjamSuperAdmin2026!'
      });
      const token = loginData?.[0]?.session_token;

      const client = createClient(url, key, {
        global: {
          headers: {
            'x-user-role': 'Superadmin',
            ...(token ? { 'x-session-token': token } : {})
          }
        }
      });

      const testJournalId = '00000000-0000-0000-0000-000000000778';
      const payloadWithLokasi = {
        id: testJournalId,
        sekolah_id: 'a0000000-0000-0000-0000-000000000001',
        nama_guru: 'Guru Test Lokasi',
        mapel: 'Matematika',
        kelas: 'VII-A',
        tanggal: '2026-11-14',
        materi: 'Materi Uji Lokasi',
        kegiatan: 'Kegiatan Uji Lokasi',
        lokasi: 'Ruang Kelas VII-A',
        lokasi_kbm: 'Ruang Kelas VII-A',
        absensi_siswa: '{}'
      };

      const { error: insErr } = await client.from('jurnal_pembelajaran').insert([payloadWithLokasi]);
      assert.strictEqual(insErr, null, `Insert with lokasi and lokasi_kbm succeeds (got: ${insErr?.message})`);

      const { error: updErr } = await client
        .from('jurnal_pembelajaran')
        .update({ lokasi: 'Lab IPA', lokasi_kbm: 'Lab IPA' })
        .eq('id', testJournalId);
      assert.strictEqual(updErr, null, `Update lokasi and lokasi_kbm succeeds (got: ${updErr?.message})`);

      const { error: delErr } = await client.from('jurnal_pembelajaran').delete().eq('id', testJournalId);
      assert.strictEqual(delErr, null, 'Delete test journal record succeeds');
      pass('5.1: Live database insert, update, and delete with lokasi & lokasi_kbm on jurnal_pembelajaran succeed without schema cache error');
    } catch (e) {
      fail('Live database suite failed', e);
    }
  } else {
    console.log('  ⚠ SKIP: Live database credentials not found in env');
  }

  console.log('\n========================================================================');
  console.log(`TOTAL CHECKS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log('========================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
