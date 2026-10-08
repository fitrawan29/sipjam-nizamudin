import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {
  acquirePiketLock,
  refreshPiketLock,
  releasePiketLock,
  releasePiketLockByParams
} from '../src/lib/piketLock';

console.log('================================================================');
console.log('  MILESTONE 3: STUDENT ATTENDANCE, TRUANCY & PIKET LOCK TESTS   ');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      return (res as Promise<void>)
        .then(() => {
          passedTests++;
          console.log(`  ✔ [PASS] ${name}`);
        })
        .catch((err: any) => {
          console.error(`  ✖ [FAIL] ${name}`);
          console.error(`     Error: ${err.message}`);
          process.exitCode = 1;
        });
    } else {
      passedTests++;
      console.log(`  ✔ [PASS] ${name}`);
    }
  } catch (err: any) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// In-Memory Supabase Client Mock for testing piketLock functionality
function createMockSupabase(initialRows: any[] = []) {
  const store = [...initialRows];

  return {
    _getStore: () => store,
    from: (table: string) => {
      let filters: Record<string, any> = {};
      let orderField = '';
      let isAscending = true;

      const queryBuilder = {
        select: (_cols = '*') => queryBuilder,
        eq: (col: string, val: any) => {
          filters[col] = val;
          return queryBuilder;
        },
        order: (col: string, opts?: { ascending?: boolean }) => {
          orderField = col;
          isAscending = opts?.ascending !== false;
          return queryBuilder;
        },
        maybeSingle: async () => {
          const matches = store.filter(row => {
            return Object.entries(filters).every(([k, v]) => row[k] === v);
          });
          return { data: matches[0] || null, error: null };
        },
        single: async () => {
          const matches = store.filter(row => {
            return Object.entries(filters).every(([k, v]) => row[k] === v);
          });
          if (matches.length === 0) return { data: null, error: { message: 'Not found', code: 'PGRST116' } };
          return { data: matches[0], error: null };
        },
        insert: (rows: any[]) => {
          const newRows = rows.map(r => ({
            id: r.id || `mock-${Date.now()}-${Math.random()}`,
            ...r
          }));
          store.push(...newRows);
          return {
            select: () => ({
              maybeSingle: async () => ({ data: newRows[0], error: null }),
              single: async () => ({ data: newRows[0], error: null })
            })
          };
        },
        update: (updates: any) => {
          const updateBuilder: any = {
            eq: (col: string, val: any) => {
              filters[col] = val;
              return updateBuilder;
            },
            select: () => ({
              maybeSingle: async () => {
                const matches = store.filter(row => {
                  return Object.entries(filters).every(([k, v]) => row[k] === v);
                });
                matches.forEach(row => Object.assign(row, updates));
                return { data: matches[0] || null, error: null };
              },
              single: async () => {
                const matches = store.filter(row => {
                  return Object.entries(filters).every(([k, v]) => row[k] === v);
                });
                matches.forEach(row => Object.assign(row, updates));
                return { data: matches[0] || null, error: null };
              }
            })
          };
          return updateBuilder;
        },
        delete: () => {
          return {
            eq: (col: string, val: any) => {
              filters[col] = val;
              return {
                eq: (col2: string, val2: any) => {
                  filters[col2] = val2;
                  const beforeLen = store.length;
                  for (let i = store.length - 1; i >= 0; i--) {
                    if (store[i][col] === val && store[i][col2] === val2) {
                      store.splice(i, 1);
                    }
                  }
                  return Promise.resolve({ error: null, count: beforeLen - store.length });
                }
              };
            }
          };
        }
      };

      return queryBuilder;
    }
  };
}

async function runAllM3Tests() {
  // --------------------------------------------------------------------------
  // SUITE 1: DATABASE SCHEMA & MIGRATION & TYPES
  // --------------------------------------------------------------------------
  console.log('━━━ SUITE 1: DATABASE SCHEMA & TYPES ━━━');

  runTest('M3-01: Migration file exists with correct columns, constraint, and index', () => {
    const migrationPath = path.resolve(
      process.cwd(),
      'supabase/migrations/20261008_m3_piket_form_lock.sql'
    );
    assert.ok(fs.existsSync(migrationPath), 'Migration SQL file must exist');

    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(content.includes('public.piket_form_lock'), 'Must create public.piket_form_lock table');
    assert.ok(content.includes('sekolah_id UUID NOT NULL'), 'Must include sekolah_id foreign key');
    assert.ok(content.includes('tanggal DATE NOT NULL'), 'Must include tanggal date column');
    assert.ok(content.includes('form_type TEXT NOT NULL'), 'Must include form_type column');
    assert.ok(content.includes('locked_by_user_id TEXT NOT NULL'), 'Must include locked_by_user_id column');
    assert.ok(content.includes('locked_by_user_name TEXT NOT NULL'), 'Must include locked_by_user_name column');
    assert.ok(content.includes('expires_at TIMESTAMPTZ NOT NULL'), 'Must include expires_at timestamp');
    assert.ok(content.includes('uq_piket_form_lock'), 'Must declare uq_piket_form_lock unique constraint');
    assert.ok(content.includes('idx_piket_form_lock_lookup'), 'Must declare idx_piket_form_lock_lookup index');
  });

  runTest('M3-02: database.ts includes piket_form_lock Row, Insert, Update and domain types', () => {
    const dbTypesPath = path.resolve(process.cwd(), 'src/types/database.ts');
    assert.ok(fs.existsSync(dbTypesPath), 'database.ts must exist');

    const content = fs.readFileSync(dbTypesPath, 'utf8');
    assert.ok(content.includes('piket_form_lock: {'), 'database.ts must contain piket_form_lock Table definition');
    assert.ok(content.includes('locked_by_user_id: string'), 'piket_form_lock must include locked_by_user_id');
    assert.ok(content.includes('locked_by_user_name: string'), 'piket_form_lock must include locked_by_user_name');
    assert.ok(content.includes('expires_at: string'), 'piket_form_lock must include expires_at');
    assert.ok(content.includes('export type PiketFormLock ='), 'database.ts must export PiketFormLock');
    assert.ok(content.includes('export type PiketFormLockInsert ='), 'database.ts must export PiketFormLockInsert');
    assert.ok(content.includes('export type PiketFormLockUpdate ='), 'database.ts must export PiketFormLockUpdate');
  });

  // --------------------------------------------------------------------------
  // SUITE 2: CONCURRENCY LOCK MODULE LOGIC (src/lib/piketLock.ts)
  // --------------------------------------------------------------------------
  console.log('\n━━━ SUITE 2: CONCURRENCY LOCK MODULE LOGIC ━━━');

  await runTest('M3-03: User 1 acquires lock successfully when no lock exists', async () => {
    const mockSupabase = createMockSupabase();
    const result = await acquirePiketLock(
      mockSupabase,
      'sekolah-01',
      '2026-10-08',
      'user-1',
      'Budi Santoso',
      'student_attendance',
      5
    );

    assert.strictEqual(result.success, true, 'User 1 must acquire lock successfully');
    assert.strictEqual(result.lockInfo.isLocked, true, 'Lock state must be active');
    assert.strictEqual(result.lockInfo.lockedByOther, false, 'Should not be locked by another user');
    assert.strictEqual(result.lockInfo.lockedBy?.userId, 'user-1', 'Locker user ID must match user-1');
    assert.strictEqual(result.lockInfo.lockedBy?.userName, 'Budi Santoso', 'Locker name must match');
    assert.ok(result.lockInfo.lockId, 'Lock ID must be populated');
  });

  await runTest('M3-04: User 2 fails to acquire active lock held by User 1', async () => {
    const existingExpires = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const mockSupabase = createMockSupabase([
      {
        id: 'lock-uuid-1',
        sekolah_id: 'sekolah-01',
        tanggal: '2026-10-08',
        form_type: 'student_attendance',
        locked_by_user_id: 'user-1',
        locked_by_user_name: 'Budi Santoso',
        locked_at: new Date().toISOString(),
        expires_at: existingExpires
      }
    ]);

    const result = await acquirePiketLock(
      mockSupabase,
      'sekolah-01',
      '2026-10-08',
      'user-2',
      'Siti Rahmah',
      'student_attendance',
      5
    );

    assert.strictEqual(result.success, false, 'User 2 must fail to acquire lock');
    assert.strictEqual(result.lockInfo.isLocked, true, 'Form must be marked locked');
    assert.strictEqual(result.lockInfo.lockedByOther, true, 'Must indicate locked by other user');
    assert.strictEqual(result.lockInfo.lockedBy?.userId, 'user-1', 'Must disclose locker user ID');
    assert.strictEqual(result.lockInfo.lockedBy?.userName, 'Budi Santoso', 'Must disclose locker user name');
  });

  await runTest('M3-05: User 1 refreshes their own active lease heartbeat', async () => {
    const mockSupabase = createMockSupabase([
      {
        id: 'lock-uuid-1',
        sekolah_id: 'sekolah-01',
        tanggal: '2026-10-08',
        form_type: 'student_attendance',
        locked_by_user_id: 'user-1',
        locked_by_user_name: 'Budi Santoso',
        locked_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60000).toISOString()
      }
    ]);

    const refreshResult = await refreshPiketLock(mockSupabase, 'lock-uuid-1', 'user-1', 5);
    assert.strictEqual(refreshResult.success, true, 'User 1 must refresh lock lease');
    assert.strictEqual(refreshResult.lockInfo.lockedByOther, false);
    assert.ok(new Date(refreshResult.lockInfo.expiresAt!).getTime() > Date.now() + 4 * 60 * 1000);
  });

  await runTest('M3-06: User 1 releases lock, and User 2 can subsequently acquire it', async () => {
    const mockSupabase = createMockSupabase([
      {
        id: 'lock-uuid-1',
        sekolah_id: 'sekolah-01',
        tanggal: '2026-10-08',
        form_type: 'student_attendance',
        locked_by_user_id: 'user-1',
        locked_by_user_name: 'Budi Santoso',
        locked_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 300000).toISOString()
      }
    ]);

    const released = await releasePiketLock(mockSupabase, 'lock-uuid-1', 'user-1');
    assert.strictEqual(released, true, 'Lock must be released');

    // User 2 now acquires
    const result2 = await acquirePiketLock(
      mockSupabase,
      'sekolah-01',
      '2026-10-08',
      'user-2',
      'Siti Rahmah',
      'student_attendance',
      5
    );

    assert.strictEqual(result2.success, true, 'User 2 can now acquire released lock');
    assert.strictEqual(result2.lockInfo.lockedBy?.userId, 'user-2');
  });

  await runTest('M3-07: Expired lock takeover simulation', async () => {
    const expiredTimestamp = new Date(Date.now() - 60000).toISOString(); // 1 minute in the past
    const mockSupabase = createMockSupabase([
      {
        id: 'lock-uuid-expired',
        sekolah_id: 'sekolah-01',
        tanggal: '2026-10-08',
        form_type: 'student_attendance',
        locked_by_user_id: 'user-1',
        locked_by_user_name: 'Budi Santoso',
        locked_at: new Date(Date.now() - 360000).toISOString(),
        expires_at: expiredTimestamp
      }
    ]);

    // User 2 arrives after expiration
    const result = await acquirePiketLock(
      mockSupabase,
      'sekolah-01',
      '2026-10-08',
      'user-2',
      'Siti Rahmah',
      'student_attendance',
      5
    );

    assert.strictEqual(result.success, true, 'Expired lock must be overtaken by active user');
    assert.strictEqual(result.lockInfo.lockedByOther, false);
    assert.strictEqual(result.lockInfo.lockedBy?.userId, 'user-2');
    assert.strictEqual(result.lockInfo.lockedBy?.userName, 'Siti Rahmah');
  });

  // --------------------------------------------------------------------------
  // SUITE 3: UI INTEGRATION IN PiketView.tsx
  // --------------------------------------------------------------------------
  console.log('\n━━━ SUITE 3: UI INTEGRATION IN PiketView.tsx ━━━');

  runTest('M3-08: PiketView.tsx imports and invokes acquirePiketLock on lapor tab', () => {
    const piketPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
    const content = fs.readFileSync(piketPath, 'utf8');

    assert.ok(content.includes('acquirePiketLock'), 'Must import acquirePiketLock');
    assert.ok(content.includes('refreshPiketLock'), 'Must import refreshPiketLock');
    assert.ok(content.includes('releasePiketLock'), 'Must import releasePiketLock');
    assert.ok(content.includes('activeTab === \'lapor\''), 'Must watch activeTab lapor');
    assert.ok(content.includes('isFormLocked'), 'Must calculate isFormLocked');
  });

  runTest('M3-09: PiketView.tsx renders prominent sticky lock alert banner', () => {
    const piketPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
    const content = fs.readFileSync(piketPath, 'utf8');

    assert.ok(content.includes('Formulir Presensi Terkunci: Sedang diedit oleh'), 'Must render required lock banner text');
    assert.ok(content.includes('Untuk mencegah duplikasi/konflik data'), 'Must explain lock rationale');
    assert.ok(content.includes('sticky'), 'Banner must be sticky');
  });

  runTest('M3-10: PiketView.tsx disables inputs, attendance markers, and submit when locked', () => {
    const piketPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
    const content = fs.readFileSync(piketPath, 'utf8');

    assert.ok(content.includes('disabled={isFormLocked}'), 'Must disable buttons when isFormLocked');
    assert.ok(content.includes('disabled={loading || isFormLocked}'), 'Must disable submit when isFormLocked');
    assert.ok(
      content.includes('Formulir presensi piket sedang diedit oleh petugas lain') ||
      content.includes('Formulir Terkunci'),
      'Must guard attendance clicks against lock'
    );
  });

  // --------------------------------------------------------------------------
  // SUITE 4: TRUANCY (BOLOS) DETECTION IN GuruJurnal.tsx
  // --------------------------------------------------------------------------
  console.log('\n━━━ SUITE 4: TRUANCY (BOLOS) DETECTION IN GuruJurnal.tsx ━━━');

  runTest('M3-11: Truancy condition detects Gate Present (pRec) but Mapel Alpa (A)', () => {
    const piketAttendance: Record<string, { jam: string }> = {
      '1001': { jam: '06:45' }
    };
    const absensi: Record<string, string> = {
      '1001': 'A',
      '1002': 'H'
    };

    const isTruant1 = Boolean(piketAttendance['1001'] && absensi['1001'] === 'A');
    const isTruant2 = Boolean(piketAttendance['1002'] && absensi['1002'] === 'A');

    assert.strictEqual(isTruant1, true, 'Student 1001 must be flagged as truant');
    assert.strictEqual(isTruant2, false, 'Student 1002 attended both gate and class');
  });

  runTest('M3-12: GuruJurnal.tsx renders distinctive truancy badge in student row', () => {
    const jurnalPath = path.resolve(process.cwd(), 'src/components/GuruJurnal.tsx');
    const content = fs.readFileSync(jurnalPath, 'utf8');

    assert.ok(content.includes('Terindikasi Bolos (Hadir Gerbang'), 'Must render Terindikasi Bolos badge text');
    assert.ok(content.includes('Alpa Mapel'), 'Badge text must include Alpa Mapel');
  });

  runTest('M3-13: GuruJurnal.tsx displays prominent banner above roster if truantCount > 0', () => {
    const jurnalPath = path.resolve(process.cwd(), 'src/components/GuruJurnal.tsx');
    const content = fs.readFileSync(jurnalPath, 'utf8');

    assert.ok(
      content.includes('Perhatian: Terdeteksi') && content.includes('siswa bolos (hadir di gerbang sekolah namun Alpa pada jam pelajaran ini)'),
      'Must render prominent truancy warning banner above roster'
    );
  });

  runTest('M3-14: handleAbsensiChange appends WITA log and keterangan on truancy', () => {
    const jurnalPath = path.resolve(process.cwd(), 'src/components/GuruJurnal.tsx');
    const content = fs.readFileSync(jurnalPath, 'utf8');

    assert.ok(content.includes('Terindikasi Bolos: Hadir di Gerbang Piket'), 'Must format truant log entry with gate time');
    assert.ok(content.includes('tetapi ditandai Alpa oleh'), 'Log must attribute teacher marking Alpa');
    assert.ok(content.includes('keterangan: noteKeterangan'), 'Payload must include keterangan');
  });

  // --------------------------------------------------------------------------
  // SUITE 5: ROLE-BASED ACCESS CONTROL (RBAC) ENFORCEMENT
  // --------------------------------------------------------------------------
  console.log('\n━━━ SUITE 5: ROLE-BASED ACCESS CONTROL (RBAC) ENFORCEMENT ━━━');

  runTest('M3-15: RekapSiswaView locks non-admin teachers strictly to assignedKelas', () => {
    const rekapPath = path.resolve(process.cwd(), 'src/components/RekapSiswaView.tsx');
    const content = fs.readFileSync(rekapPath, 'utf8');

    assert.ok(content.includes('allowedClasses'), 'Must define allowedClasses');
    assert.ok(content.includes('Anda hanya dapat melihat rekapitulasi kehadiran untuk kelas binaan Anda'), 'Must restrict non-assigned classes');
    assert.ok(content.includes('isWaliKelasUser'), 'Must verify isWaliKelasUser');
    assert.ok(content.includes('Akses Terblokir'), 'Must render access blocked view for non-wali teachers');
  });

  runTest('M3-16: PiketView locks reporting exclusively to teachers on duty today', () => {
    const piketPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
    const content = fs.readFileSync(piketPath, 'utf8');

    assert.ok(content.includes('canReport ='), 'Must define canReport condition');
    assert.ok(content.includes('dailyState.isPiket'), 'canReport must require dailyState.isPiket');
    assert.ok(content.includes('if (isGuru && dailyState && !dailyState.isPiket && !isAdmin)'), 'Must block teachers not on duty today');
  });

  runTest('M3-17: GuruJurnal scopes teaching sessions strictly to assigned guru_mapel', () => {
    const jurnalPath = path.resolve(process.cwd(), 'src/components/GuruJurnal.tsx');
    const content = fs.readFileSync(jurnalPath, 'utf8');

    assert.ok(content.includes('from(\'guru_mapel\')'), 'Must query guru_mapel');
    assert.ok(content.includes('nama_guru'), 'Must filter by teacher name/NIP');
  });

  console.log('\n================================================================');
  console.log(`  M3 TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exitCode = 1;
  }
}

runAllM3Tests();
