/**
 * tests/challenger_m3_piket_concurrency_lock.test.ts
 *
 * Empirical Adversarial Challenger Test Suite for Milestone 3 (R3 Student Attendance & Piket Flow)
 * Focus: Piket Concurrency Lock (src/lib/piketLock.ts and src/components/PiketView.tsx)
 *
 * Stress-Test Scenarios:
 * 1. Multi-User Simultaneous Collision (True Race Condition with DB Constraint)
 * 2. Sequential Access Lockout (User 2 blocked with User 1 identity)
 * 3. High Concurrency Swarm (10 concurrent users, exactly 1 winner, 9 locked out)
 * 4. Boundary & Partition Isolation (Multi-tenant, date, form type)
 * 5. 5-Minute Lease Expiration & Clean Takeover (T=4m59s vs T=5m01s)
 * 6. Heartbeat Renewal Lease Extension (T=4m renewal prevents T=6m takeover)
 * 7. Lock Release on Submit & Unmount
 * 8. Adversarial Unauthorized Release & Heartbeat Tampering
 * 9. UI Component Control Freeze & Warning Banner Verification in PiketView.tsx
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {
  acquirePiketLock,
  refreshPiketLock,
  releasePiketLock,
  releasePiketLockByParams,
  PIKET_LOCK_DEFAULT_LEASE_MINUTES,
  PIKET_LOCK_DEFAULT_HEARTBEAT_SECONDS,
  PiketLockResult
} from '../src/lib/piketLock';

console.log('================================================================');
console.log('  CHALLENGER 1: EMPIRICAL PIKET CONCURRENCY LOCK STRESS HARNESS ');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      await res;
    }
    passedTests++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err: any) {
    failedTests++;
    console.error(`  ✖ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

/**
 * High-Fidelity Mock Supabase with:
 * - PostgreSQL UNIQUE constraint enforcement: (sekolah_id, tanggal, form_type)
 * - Arbitrary chaining of .eq() on delete, update, and select
 * - Thenable delete builder matching Supabase PostgREST client
 */
function createAdvancedMockSupabase(initialRows: any[] = []) {
  const store = initialRows.map(r => ({ ...r }));

  return {
    _getStore: () => store,
    from: (table: string) => {
      let filters: Record<string, any> = {};

      const queryBuilder = {
        select: (_cols = '*') => queryBuilder,
        eq: (col: string, val: any) => {
          filters[col] = val;
          return queryBuilder;
        },
        maybeSingle: async () => {
          const matches = store.filter(row => {
            return Object.entries(filters).every(([k, v]) => row[k] === v);
          });
          return { data: matches[0] ? { ...matches[0] } : null, error: null };
        },
        single: async () => {
          const matches = store.filter(row => {
            return Object.entries(filters).every(([k, v]) => row[k] === v);
          });
          if (matches.length === 0) return { data: null, error: { message: 'Not found', code: 'PGRST116' } };
          return { data: { ...matches[0] }, error: null };
        },
        insert: (rows: any[]) => {
          // Check Postgres UNIQUE constraint on (sekolah_id, tanggal, form_type)
          for (const r of rows) {
            const conflict = store.find(
              existing =>
                existing.sekolah_id === r.sekolah_id &&
                existing.tanggal === r.tanggal &&
                existing.form_type === r.form_type
            );
            if (conflict) {
              return {
                select: () => ({
                  maybeSingle: async () => ({
                    data: null,
                    error: {
                      message: 'duplicate key value violates unique constraint "uq_piket_form_lock"',
                      code: '23505'
                    }
                  }),
                  single: async () => ({
                    data: null,
                    error: {
                      message: 'duplicate key value violates unique constraint "uq_piket_form_lock"',
                      code: '23505'
                    }
                  })
                })
              };
            }
          }

          const newRows = rows.map(r => ({
            id: r.id || `lock-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            ...r
          }));
          store.push(...newRows);

          return {
            select: () => ({
              maybeSingle: async () => ({ data: { ...newRows[0] }, error: null }),
              single: async () => ({ data: { ...newRows[0] }, error: null })
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
                if (matches.length === 0) {
                  return { data: null, error: null };
                }
                matches.forEach(row => Object.assign(row, updates));
                return { data: { ...matches[0] }, error: null };
              },
              single: async () => {
                const matches = store.filter(row => {
                  return Object.entries(filters).every(([k, v]) => row[k] === v);
                });
                if (matches.length === 0) {
                  return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
                }
                matches.forEach(row => Object.assign(row, updates));
                return { data: { ...matches[0] }, error: null };
              }
            })
          };
          return updateBuilder;
        },
        delete: () => {
          const deleteBuilder: any = {
            eq: (col: string, val: any) => {
              filters[col] = val;
              return deleteBuilder;
            },
            then: (resolve: any, reject: any) => {
              const before = store.length;
              for (let i = store.length - 1; i >= 0; i--) {
                const matches = Object.entries(filters).every(([k, v]) => store[i][k] === v);
                if (matches) {
                  store.splice(i, 1);
                }
              }
              const result = { error: null, count: before - store.length };
              return Promise.resolve(result).then(resolve, reject);
            }
          };
          return deleteBuilder;
        }
      };

      return queryBuilder;
    }
  };
}

/**
 * Virtual Time Environment Helper for accurate temporal lease simulations
 */
function withSimulatedClock<T>(baseMs: number, fn: (clock: { advance: (ms: number) => void; set: (ms: number) => void }) => Promise<T>): Promise<T> {
  const RealDate = global.Date;
  let currentSimMs = baseMs;

  class SimulatedDate extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(currentSimMs);
      } else {
        super(...(args as [any]));
      }
    }
    static now() {
      return currentSimMs;
    }
  }

  global.Date = SimulatedDate as any;

  const clockController = {
    advance: (ms: number) => {
      currentSimMs += ms;
    },
    set: (ms: number) => {
      currentSimMs = ms;
    }
  };

  return Promise.resolve()
    .then(() => fn(clockController))
    .finally(() => {
      global.Date = RealDate;
    });
}

async function runChallengerSuite() {
  // ==========================================================================
  // SUITE 1: SIMULTANEOUS CONCURRENCY & RACE CONDITIONS
  // ==========================================================================
  console.log('━━━ SUITE 1: SIMULTANEOUS CONCURRENCY & RACE CONDITIONS ━━━');

  await runTest('C1-01: User 1 and User 2 access form simultaneously (True Race Condition)', async () => {
    const mockDb = createAdvancedMockSupabase();

    // Both invoke acquirePiketLock concurrently in parallel promises
    const [res1, res2] = await Promise.all([
      acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi', 'student_attendance', 5),
      acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-2', 'Nur Hidayah', 'student_attendance', 5)
    ]);

    // Exactly one must succeed, and the other must be locked out
    const successCount = (res1.success ? 1 : 0) + (res2.success ? 1 : 0);
    assert.strictEqual(successCount, 1, 'Exactly one concurrent acquisition must succeed');

    const winner = res1.success ? res1 : res2;
    const loser = res1.success ? res2 : res1;
    const winnerUser = res1.success ? 'user-1' : 'user-2';
    const winnerName = res1.success ? 'Ahmad Fauzi' : 'Nur Hidayah';

    assert.strictEqual(winner.lockInfo.isLocked, true, 'Winner must hold lock');
    assert.strictEqual(winner.lockInfo.lockedByOther, false, 'Winner is not locked by other');
    assert.strictEqual(winner.lockInfo.lockedBy?.userId, winnerUser, 'Winner userId must match');

    assert.strictEqual(loser.success, false, 'Loser acquisition must fail');
    assert.strictEqual(loser.lockInfo.isLocked, true, 'Loser must observe active lock');
    assert.strictEqual(loser.lockInfo.lockedByOther, true, 'Loser must have lockedByOther === true');
    assert.strictEqual(loser.lockInfo.lockedBy?.userId, winnerUser, 'Loser must be locked out with winner identity');
    assert.strictEqual(loser.lockInfo.lockedBy?.userName, winnerName, 'Loser must see winner name');
  });

  await runTest('C1-02: User 2 access rejected when User 1 actively holds lock (Sequential)', async () => {
    const mockDb = createAdvancedMockSupabase();

    // User 1 acquires
    const res1 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi');
    assert.strictEqual(res1.success, true, 'User 1 initial acquire must succeed');

    // User 2 arrives immediately
    const res2 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-2', 'Nur Hidayah');
    assert.strictEqual(res2.success, false, 'User 2 must be rejected');
    assert.strictEqual(res2.lockInfo.lockedByOther, true, 'User 2 must see lockedByOther === true');
    assert.strictEqual(res2.lockInfo.lockedBy?.userId, 'user-1', 'Must identify User 1');
    assert.strictEqual(res2.lockInfo.lockedBy?.userName, 'Ahmad Fauzi', 'Must identify Ahmad Fauzi');
  });

  await runTest('C1-03: High concurrency swarm (10 concurrent Piket users)', async () => {
    const mockDb = createAdvancedMockSupabase();

    const users = Array.from({ length: 10 }, (_, i) => ({
      id: `guru-${i + 1}`,
      name: `Guru Piket ${i + 1}`
    }));

    const results = await Promise.all(
      users.map(u => acquirePiketLock(mockDb, 'sch-01', '2026-10-08', u.id, u.name))
    );

    const winners = results.filter(r => r.success);
    const losers = results.filter(r => !r.success);

    assert.strictEqual(winners.length, 1, 'Only 1 user out of 10 must succeed');
    assert.strictEqual(losers.length, 9, '9 users out of 10 must be locked out');

    const winningUserId = winners[0].lockInfo.lockedBy?.userId;
    const winningUserName = winners[0].lockInfo.lockedBy?.userName;

    for (const loser of losers) {
      assert.strictEqual(loser.lockInfo.lockedByOther, true, 'Loser must have lockedByOther === true');
      assert.strictEqual(loser.lockInfo.lockedBy?.userId, winningUserId, 'Loser must point to winner ID');
      assert.strictEqual(loser.lockInfo.lockedBy?.userName, winningUserName, 'Loser must point to winner name');
    }
  });

  await runTest('C1-04: Idempotent re-acquisition by same user refreshes lease without lockout', async () => {
    const mockDb = createAdvancedMockSupabase();

    const res1 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi');
    assert.strictEqual(res1.success, true);

    // User 1 navigates back or refreshes
    const resReentry = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi');
    assert.strictEqual(resReentry.success, true, 'Same user must not lock themselves out');
    assert.strictEqual(resReentry.lockInfo.lockedByOther, false, 'lockedByOther must be false');
    assert.strictEqual(resReentry.lockInfo.lockedBy?.userId, 'user-1');
  });

  // ==========================================================================
  // SUITE 2: BOUNDARY & PARTITION ISOLATION
  // ==========================================================================
  console.log('\n━━━ SUITE 2: BOUNDARY & PARTITION ISOLATION ━━━');

  await runTest('C2-01: Multi-tenant isolation (School A and School B do not collide)', async () => {
    const mockDb = createAdvancedMockSupabase();

    const [resA, resB] = await Promise.all([
      acquirePiketLock(mockDb, 'school-A', '2026-10-08', 'user-A', 'Guru Sekolah A'),
      acquirePiketLock(mockDb, 'school-B', '2026-10-08', 'user-B', 'Guru Sekolah B')
    ]);

    assert.strictEqual(resA.success, true, 'School A acquire must succeed');
    assert.strictEqual(resB.success, true, 'School B acquire must succeed');
    assert.strictEqual(resA.lockInfo.lockedBy?.userId, 'user-A');
    assert.strictEqual(resB.lockInfo.lockedBy?.userId, 'user-B');
  });

  await runTest('C2-02: Date partition isolation (Today vs Tomorrow do not collide)', async () => {
    const mockDb = createAdvancedMockSupabase();

    const resToday = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi');
    const resTomorrow = await acquirePiketLock(mockDb, 'sch-01', '2026-10-09', 'user-2', 'Nur Hidayah');

    assert.strictEqual(resToday.success, true);
    assert.strictEqual(resTomorrow.success, true);
  });

  await runTest('C2-03: Form type isolation (Attendance vs Duty do not collide)', async () => {
    const mockDb = createAdvancedMockSupabase();

    const resAttendance = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad', 'student_attendance');
    const resDuty = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-2', 'Nur', 'teacher_duty');

    assert.strictEqual(resAttendance.success, true);
    assert.strictEqual(resDuty.success, true);
  });

  // ==========================================================================
  // SUITE 3: 5-MINUTE LEASE EXPIRATION & CLEAN TAKEOVER
  // ==========================================================================
  console.log('\n━━━ SUITE 3: 5-MINUTE LEASE EXPIRATION & CLEAN TAKEOVER ━━━');

  await runTest('C3-01: Lockout enforced before 5 minutes (T = 4m 59s)', async () => {
    await withSimulatedClock(1700000000000, async (clock) => {
      const mockDb = createAdvancedMockSupabase();

      // User 1 acquires lock at T=0 with default 5-minute lease
      const res1 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi', 'student_attendance', 5);
      assert.strictEqual(res1.success, true);

      // Advance time to 4 minutes 59 seconds (299,000 ms)
      clock.advance((4 * 60 + 59) * 1000);

      // User 2 attempts acquire
      const res2 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-2', 'Nur Hidayah', 'student_attendance', 5);
      assert.strictEqual(res2.success, false, 'User 2 must be locked out at T=4m59s');
      assert.strictEqual(res2.lockInfo.lockedByOther, true);
      assert.strictEqual(res2.lockInfo.lockedBy?.userId, 'user-1');
    });
  });

  await runTest('C3-02: Clean takeover at lease expiration after 5 minutes (T = 5m 01s)', async () => {
    await withSimulatedClock(1700000000000, async (clock) => {
      const mockDb = createAdvancedMockSupabase();

      // User 1 acquires lock at T=0
      const res1 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi', 'student_attendance', 5);
      assert.strictEqual(res1.success, true);

      // Advance time past 5 minutes (5 minutes + 1 second = 301,000 ms)
      clock.advance((5 * 60 + 1) * 1000);

      // User 2 attempts acquire after expiration
      const res2 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-2', 'Nur Hidayah', 'student_attendance', 5);
      assert.strictEqual(res2.success, true, 'User 2 must successfully overtake expired lock');
      assert.strictEqual(res2.lockInfo.lockedByOther, false, 'lockedByOther must be false for new holder');
      assert.strictEqual(res2.lockInfo.lockedBy?.userId, 'user-2', 'Holder userId must be user-2');
      assert.strictEqual(res2.lockInfo.lockedBy?.userName, 'Nur Hidayah', 'Holder name must be Nur Hidayah');

      // Verify DB row was cleanly updated
      const store = mockDb._getStore();
      assert.strictEqual(store.length, 1, 'Lock table must still contain exactly 1 row');
      assert.strictEqual(store[0].locked_by_user_id, 'user-2', 'DB row owner must be user-2');
    });
  });

  await runTest('C3-03: Post-takeover: Stale User 1 is now locked out by User 2', async () => {
    await withSimulatedClock(1700000000000, async (clock) => {
      const mockDb = createAdvancedMockSupabase();

      // User 1 acquires at T=0
      await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi', 'student_attendance', 5);

      // Advance past 5m, User 2 takes over
      clock.advance((5 * 60 + 10) * 1000);
      await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-2', 'Nur Hidayah', 'student_attendance', 5);

      // User 1 now tries to acquire
      const resStale1 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi', 'student_attendance', 5);
      assert.strictEqual(resStale1.success, false, 'Stale User 1 must now be locked out');
      assert.strictEqual(resStale1.lockInfo.lockedByOther, true);
      assert.strictEqual(resStale1.lockInfo.lockedBy?.userId, 'user-2', 'Must indicate lock held by User 2');
    });
  });

  // ==========================================================================
  // SUITE 4: HEARTBEAT RENEWAL & LEASE EXTENSION
  // ==========================================================================
  console.log('\n━━━ SUITE 4: HEARTBEAT RENEWAL & LEASE EXTENSION ━━━');

  await runTest('C4-01: Heartbeat renewal extends active lease by 5 minutes', async () => {
    await withSimulatedClock(1700000000000, async (clock) => {
      const mockDb = createAdvancedMockSupabase();

      const res1 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi', 'student_attendance', 5);
      assert.strictEqual(res1.success, true);
      const lockId = res1.lockInfo.lockId!;

      // Advance time to 4 minutes (T = 4m)
      clock.advance(4 * 60 * 1000);

      // User 1 sends heartbeat refresh
      const refreshRes = await refreshPiketLock(mockDb, lockId, 'user-1', 5);
      assert.strictEqual(refreshRes.success, true, 'Heartbeat renewal must succeed');
      assert.strictEqual(refreshRes.lockInfo.lockedByOther, false);

      // Verify expiration extended to current simulated time + 5 minutes
      const expectedExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      assert.strictEqual(refreshRes.lockInfo.expiresAt, expectedExpiry);
    });
  });

  await runTest('C4-02: Heartbeat renewal prevents takeover at T = 6m (original expiry surpassed)', async () => {
    await withSimulatedClock(1700000000000, async (clock) => {
      const mockDb = createAdvancedMockSupabase();

      // T = 0: User 1 acquires lock (initial expiry T = 5m)
      const res1 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi', 'student_attendance', 5);
      const lockId = res1.lockInfo.lockId!;

      // T = 4m: User 1 sends heartbeat (renews expiry to T = 9m)
      clock.advance(4 * 60 * 1000);
      await refreshPiketLock(mockDb, lockId, 'user-1', 5);

      // T = 6m: Time is now past original 5-minute expiry!
      clock.advance(2 * 60 * 1000); // Total 6 minutes elapsed

      // User 2 attempts to acquire lock
      const res2 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-2', 'Nur Hidayah', 'student_attendance', 5);

      // User 2 MUST BE REJECTED because lease was renewed to T = 9m
      assert.strictEqual(res2.success, false, 'User 2 must be locked out at T=6m due to heartbeat extension');
      assert.strictEqual(res2.lockInfo.lockedByOther, true);
      assert.strictEqual(res2.lockInfo.lockedBy?.userId, 'user-1', 'Must be locked by User 1');
      assert.strictEqual(res2.lockInfo.lockedBy?.userName, 'Ahmad Fauzi');
    });
  });

  await runTest('C4-03: Lock eventually expires and is taken over after heartbeat stops (T = 9m 01s)', async () => {
    await withSimulatedClock(1700000000000, async (clock) => {
      const mockDb = createAdvancedMockSupabase();

      // T = 0: User 1 acquires (expiry T = 5m)
      const res1 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi', 'student_attendance', 5);
      const lockId = res1.lockInfo.lockId!;

      // T = 4m: Heartbeat renews expiry to T = 9m
      clock.advance(4 * 60 * 1000);
      await refreshPiketLock(mockDb, lockId, 'user-1', 5);

      // Advance time past renewed expiry (T = 9m 01s)
      clock.advance((5 * 60 + 1) * 1000);

      // User 2 now attempts acquire
      const res2 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-2', 'Nur Hidayah', 'student_attendance', 5);
      assert.strictEqual(res2.success, true, 'User 2 can now overtake lock after renewed lease lapsed');
      assert.strictEqual(res2.lockInfo.lockedBy?.userId, 'user-2');
    });
  });

  await runTest('C4-04: Unauthorized user cannot refresh another user\'s lease', async () => {
    const mockDb = createAdvancedMockSupabase();

    const res1 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi', 'student_attendance', 5);
    const lockId = res1.lockInfo.lockId!;

    // User 2 maliciously calls refreshPiketLock with lockId but user-2
    const tamperRes = await refreshPiketLock(mockDb, lockId, 'user-2', 5);
    assert.strictEqual(tamperRes.success, false, 'Tampered refresh must be rejected');
    assert.strictEqual(tamperRes.lockInfo.lockedByOther, false);
  });

  // ==========================================================================
  // SUITE 5: LOCK RELEASE ON SUBMIT & UNMOUNT
  // ==========================================================================
  console.log('\n━━━ SUITE 5: LOCK RELEASE ON SUBMIT & UNMOUNT ━━━');

  await runTest('C5-01: Lock released on form submit allows immediate takeover by User 2', async () => {
    const mockDb = createAdvancedMockSupabase();

    // User 1 acquires lock
    const res1 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi');
    assert.strictEqual(res1.success, true);
    const lockId = res1.lockInfo.lockId!;

    // User 2 blocked
    const preSubmitRes2 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-2', 'Nur Hidayah');
    assert.strictEqual(preSubmitRes2.success, false);

    // User 1 submits report -> triggers releasePiketLock
    const released = await releasePiketLock(mockDb, lockId, 'user-1');
    assert.strictEqual(released, true, 'Submit release must return true');

    // User 2 immediately attempts acquire
    const postSubmitRes2 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-2', 'Nur Hidayah');
    assert.strictEqual(postSubmitRes2.success, true, 'User 2 must acquire immediately after submit release');
    assert.strictEqual(postSubmitRes2.lockInfo.lockedBy?.userId, 'user-2');
  });

  await runTest('C5-02: Lock released on unmount / tab switch allows immediate takeover by User 2', async () => {
    const mockDb = createAdvancedMockSupabase();

    // User 1 acquires lock on Lapor tab
    const res1 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi');
    assert.strictEqual(res1.success, true);
    const lockId = res1.lockInfo.lockId!;

    // User 1 unmounts / switches to Beranda tab -> cleanup hook calls releasePiketLock
    const cleanupReleased = await releasePiketLock(mockDb, lockId, 'user-1');
    assert.strictEqual(cleanupReleased, true, 'Unmount cleanup release must succeed');

    // User 2 immediately acquires
    const res2 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-2', 'Nur Hidayah');
    assert.strictEqual(res2.success, true, 'User 2 acquires immediately after unmount release');
    assert.strictEqual(res2.lockInfo.lockedBy?.userId, 'user-2');
  });

  await runTest('C5-03: Parameter-based release (releasePiketLockByParams) for fallback cleanup', async () => {
    const mockDb = createAdvancedMockSupabase();

    await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi');

    const released = await releasePiketLockByParams(mockDb, 'sch-01', '2026-10-08', 'user-1');
    assert.strictEqual(released, true, 'releasePiketLockByParams must succeed');

    const res2 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-2', 'Nur Hidayah');
    assert.strictEqual(res2.success, true);
  });

  await runTest('C5-04: Unauthorized user cannot delete another user\'s lock', async () => {
    const mockDb = createAdvancedMockSupabase();

    const res1 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-1', 'Ahmad Fauzi');
    const lockId = res1.lockInfo.lockId!;

    // User 2 attempts unauthorized release by ID
    await releasePiketLock(mockDb, lockId, 'user-2');
    const storeAfterId = mockDb._getStore();
    assert.strictEqual(storeAfterId.length, 1, 'Lock must not be deleted by unauthorized user-2');
    assert.strictEqual(storeAfterId[0].locked_by_user_id, 'user-1');

    // User 2 attempts unauthorized release by params
    await releasePiketLockByParams(mockDb, 'sch-01', '2026-10-08', 'user-2');
    const storeAfterParams = mockDb._getStore();
    assert.strictEqual(storeAfterParams.length, 1, 'Lock must still be preserved');

    // User 3 is STILL locked out
    const res3 = await acquirePiketLock(mockDb, 'sch-01', '2026-10-08', 'user-3', 'Citra Dewi');
    assert.strictEqual(res3.success, false, 'User 3 is still locked out by User 1');
  });

  await runTest('C5-05: Missing argument defensive handling in release functions', async () => {
    const mockDb = createAdvancedMockSupabase();

    const r1 = await releasePiketLock(mockDb, '', 'user-1');
    const r2 = await releasePiketLock(mockDb, 'lock-1', '');
    const r3 = await releasePiketLockByParams(mockDb, '', '2026-10-08', 'user-1');

    assert.strictEqual(r1, false, 'Empty lockId must return false');
    assert.strictEqual(r2, false, 'Empty userId must return false');
    assert.strictEqual(r3, false, 'Empty sekolahId must return false');
  });

  // ==========================================================================
  // SUITE 6: UI COMPONENT VERIFICATION IN PiketView.tsx
  // ==========================================================================
  console.log('\n━━━ SUITE 6: UI COMPONENT VERIFICATION IN PiketView.tsx ━━━');

  runTest('C6-01: PiketView.tsx defines isFormLocked and renders prominent warning banner', () => {
    const piketViewPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
    const content = fs.readFileSync(piketViewPath, 'utf8');

    // Must calculate isFormLocked
    assert.ok(content.includes('const isFormLocked = Boolean(piketLockInfo?.lockedByOther);'), 'Must define isFormLocked');

    // Must render alert banner with ID piket-form-lock-alert
    assert.ok(content.includes('id="piket-form-lock-alert"'), 'Must have id="piket-form-lock-alert"');
    assert.ok(content.includes('⚠️ Formulir Presensi Terkunci: Sedang diedit oleh'), 'Must include warning text');
    assert.ok(content.includes('Untuk mencegah duplikasi/konflik data, formulir ini tidak dapat diubah sampai sesi selesai.'), 'Must explain rationale');
  });

  runTest('C6-02: PiketView.tsx disables all student attendance buttons when locked', () => {
    const piketViewPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
    const content = fs.readFileSync(piketViewPath, 'utf8');

    // Buttons H, S, I, A must have disabled={isFormLocked}
    assert.ok(content.includes('disabled={isFormLocked}'), 'Attendance status buttons must be disabled');
    assert.ok(content.includes('isFormLocked ? \'opacity-50 cursor-not-allowed \' : \'\''), 'Must visually indicate disabled styling');
  });

  runTest('C6-03: PiketView.tsx disables catatan textarea when locked', () => {
    const piketViewPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
    const content = fs.readFileSync(piketViewPath, 'utf8');

    assert.ok(
      content.includes('disabled={isFormLocked}') && content.includes('Formulir presensi terkunci...'),
      'Catatan textarea must be disabled with locked placeholder'
    );
  });

  runTest('C6-04: PiketView.tsx blocks camera capture & photo removal when locked', () => {
    const piketViewPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
    const content = fs.readFileSync(piketViewPath, 'utf8');

    // Camera callbacks guard
    assert.ok(content.includes('onPhotoConfirmed') && content.includes('if (isFormLocked) return;'), 'Must guard onPhotoConfirmed');
    assert.ok(content.includes('onRetake') && content.includes('if (isFormLocked) return;'), 'Must guard onRetake');
    assert.ok(content.includes('disabled={isFormLocked}') && content.includes('Hapus'), 'Photo remove button must be disabled when locked');
  });

  runTest('C6-05: PiketView.tsx disables submit button and renders locked badge', () => {
    const piketViewPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
    const content = fs.readFileSync(piketViewPath, 'utf8');

    assert.ok(content.includes('disabled={loading || isFormLocked}'), 'Submit button must have disabled={loading || isFormLocked}');
    assert.ok(content.includes('Formulir Terkunci (Sedang Diedit)'), 'Submit button text must indicate lock');
  });

  runTest('C6-06: PiketView.tsx lifecycle acquires lock on lapor tab and cleans up on unmount', () => {
    const piketViewPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
    const content = fs.readFileSync(piketViewPath, 'utf8');

    assert.ok(content.includes('if (activeTab === \'lapor\' && user)'), 'Must acquire lock when activeTab === lapor');
    assert.ok(content.includes('acquirePiketLock(supabase, sekolahId, todayStr, userId, userName, \'student_attendance\')'), 'Must invoke acquirePiketLock with todayStr and userId');
    assert.ok(content.includes('heartbeatTimer = setInterval(async () => {'), 'Must start heartbeat interval');
    assert.ok(content.includes('if (heartbeatTimer) clearInterval(heartbeatTimer);'), 'Cleanup must clear heartbeat timer');
    assert.ok(content.includes('releasePiketLock(supabase, activeLockIdRef.current, userId)'), 'Cleanup must release lock on unmount');
  });

  runTest('C6-07: PiketView.tsx releases lock in handlePiketSubmit on successful save', () => {
    const piketViewPath = path.resolve(process.cwd(), 'src/components/PiketView.tsx');
    const content = fs.readFileSync(piketViewPath, 'utf8');

    assert.ok(content.includes('// Release concurrency lock upon successful submission'), 'Must document submit lock release');
    assert.ok(content.includes('await releasePiketLock(supabase, activeLockIdRef.current, userId).catch(() => {});'), 'Must await releasePiketLock on submit');
    assert.ok(content.includes('setPiketLockInfo(null);'), 'Must reset piketLockInfo on submit');
  });

  console.log('\n================================================================');
  console.log(`  CHALLENGER RESULTS: ${passedTests} / ${totalTests} PASSED (Failed: ${failedTests})`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exitCode = 1;
  }
}

runChallengerSuite();
