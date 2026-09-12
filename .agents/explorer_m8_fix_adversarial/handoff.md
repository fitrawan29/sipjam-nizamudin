# Adversarial Test Suite Design Report: Hostile RLS Verification Specification

**Subagent**: `explorer_m8_fix_adversarial`  
**Archetype**: `teamwork_preview_explorer`  
**Working Directory**: `c:\Users\Fitra\OneDrive\Documents\sipjam-app\.agents\explorer_m8_fix_adversarial`  
**Parent Orchestrator ID**: `f0a4047d-f184-479b-9852-09ec5b34921f`  
**Date**: 2026-09-13T05:35:00+08:00  
**Target Test File**: `tests/m7_rls_integrity.test.ts`  
**Companion Target**: `tests/m7_challenger_rls.test.ts`  

---

## Executive Summary

Pursuant to the forensic integrity audit report (`.agents/auditor_m8_forensic/handoff.md`) and empirical challenger findings (`.agents/challenger_m8_multitenant/handoff.md`), this exploration designed comprehensive, hostile adversarial test specifications to integrate into `tests/m7_rls_integrity.test.ts`.

The test suite is hardened to actively assault PostgreSQL Row Level Security (RLS) policies and PostgREST request header evaluation under three critical hostile attack vectors:
1. **Unauthenticated Role Spoofing**: Sending ONLY `headers: { 'x-user-role': 'Superadmin' }` while strictly omitting `x-user-id` and `x-sekolah-id`.
2. **Forged Random Identity**: Supplying fabricated non-existent UUIDs in `x-user-id` alongside `x-user-role: Superadmin`.
3. **School Admin Privilege Escalation**: Supplying a legitimate School Admin's valid `x-user-id` alongside `x-user-role: Superadmin` with `x-sekolah-id` intentionally omitted to attempt platform tenant breakout.

All test code specifications, unified `.patch` files, and full drop-in replacement files have been generated within this agent's folder.

---

## 1. Observation

### 1.1 Root Cause in Database Functions
In `supabase/migrations/20260912_fix_rls_integrity.sql`, lines 205–226:
```sql
  -- If x-user-id header is provided, strictly verify against public.users
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-user-id';
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      v_user_id := v_raw::uuid;
      SELECT u.role INTO v_db_role
      FROM public.users u
      WHERE u.id = v_user_id
      LIMIT 1;

      IF v_db_role IS NOT NULL THEN
        RETURN (v_db_role = 'Superadmin');
      ELSE
        RETURN FALSE;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  v_role := public.get_auth_user_role();
  RETURN (v_role = 'Superadmin');
```
And lines 178–188:
```sql
  -- 5. Fallback from PostgREST request header 'x-user-role'
  BEGIN
    v_raw := current_setting('request.headers', true)::json->>'x-user-role';
    IF v_raw IS NOT NULL AND v_raw <> '' THEN
      RETURN v_raw;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
```
When `x-user-id` is omitted, `is_superadmin()` defaults to `get_auth_user_role()`, which trusts `x-user-role: Superadmin`.

### 1.2 Prior Test Blind Spot in `tests/m7_rls_integrity.test.ts`
In `tests/m7_rls_integrity.test.ts` lines 129–137:
```typescript
  // 5. Spoofed School Admin client (School A Admin attempting to claim Superadmin)
  const spoofedSchoolAdminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': defaultSchoolAId,
        'x-user-role': 'Superadmin'
      }
    }
  });
```
Because this test supplied `'x-sekolah-id': defaultSchoolAId`, `public.get_auth_user_sekolah_id()` evaluated to non-NULL, immediately triggering line 201 of `is_superadmin()`:
```sql
  IF public.get_auth_user_sekolah_id() IS NOT NULL THEN
    RETURN FALSE;
  END IF;
```
This inadvertently masked the defect where omitting `x-sekolah-id` and `x-user-id` gave full Superadmin access.

### 1.3 Test Defect in `tests/m7_challenger_rls.test.ts`
In `tests/m7_challenger_rls.test.ts`, lines 60–63:
```typescript
  // Create scoped clients
  const superadminClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { 'x-user-role': 'Superadmin' } }
  });
```
The test suite itself relied directly on unauthenticated header spoofing without an authenticated user ID.

---

## 2. Logic Chain

1. **Premise**: In modern web architectures using PostgREST and public anonymous keys, any HTTP header can be crafted or omitted by an adversary via curl, fetch, or browser developer tools.
2. **Defensive Requirement**:
   - Omitting `x-user-id` while passing `x-user-role: Superadmin` MUST evaluate to FALSE.
   - Forged non-existent `x-user-id` MUST evaluate to FALSE because it cannot be found in `public.users`.
   - A School Admin's valid `x-user-id` passed with `x-user-role: Superadmin` (even with `x-sekolah-id` stripped) MUST evaluate to FALSE because the user's database record has `u.sekolah_id IS NOT NULL`.
3. **Test Harness Construction**:
   - `tests/m7_rls_integrity.test.ts` must directly simulate each of these three attack profiles against both platform metadata (`public.sekolah`, `public.users`) and tenant tables (`data_guru`, `data_siswa`, `pengaturan`).
   - Every single check must assert 0 rows returned on SELECT and complete rejection / 0 rows affected on INSERT, UPDATE, and DELETE.
   - If any unauthenticated or spoofed client reads even a single row or mutates any table, `fail()` must immediately terminate the run with a descriptive CRITICAL RLS VIOLATION error.

---

## 3. Hostile Adversarial Test Specification

### 3.1 Client Profile Configurations
Added to `tests/m7_rls_integrity.test.ts` lines 99–185:

```typescript
  // Authenticate school admin via verify_login RPC to obtain legitimate school admin user ID
  const { data: schoolAAdminAuth } = await anonClient.rpc('verify_login', {
    p_username: 'admin',
    p_password: 'QWerty1334#'
  });
  const schoolAAdminUserId = schoolAAdminAuth?.[0]?.id || 'd23141e4-2116-4946-8094-895ef21a50e5';

  // 7. Hostile Adversary 1: Unauthenticated role spoofer (omitting x-user-id and x-sekolah-id)
  const unauthenticatedSuperadminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-role': 'Superadmin'
      }
    }
  });

  // 8. Hostile Adversary 2: Forged random non-existent x-user-id with Superadmin role
  const forgedRandomUserId = randomUUID();
  const forgedUserSuperadminClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-id': forgedRandomUserId,
        'x-user-role': 'Superadmin'
      }
    }
  });

  // 9. Hostile Adversary 3: School Admin privilege escalation (real School Admin UUID + Superadmin role, omitting x-sekolah-id)
  const schoolAdminEscalationClient = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-user-id': schoolAAdminUserId,
        'x-user-role': 'Superadmin'
      }
    }
  });
```

### 3.2 SECTION 4 Test Cases Specification

```typescript
    // =========================================================================
    // SECTION 4: HOSTILE ADVERSARIAL ATTACKS & PRIVILEGE ESCALATION DEFENSE
    // =========================================================================
    console.log(`\n${CYAN}--- SECTION 4: Hostile Adversarial Attacks & Privilege Escalation Defense ---${RESET}`);

    // -------------------------------------------------------------------------
    // 4.1 Unauthenticated Role Spoofing (Omitting x-user-id and x-sekolah-id)
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}4.1 Adversarial: Unauthenticated Role Spoofing (headers: {'x-user-role': 'Superadmin'})${RESET}`);

    // 4.1.1 Credential Dump Exfiltration Denial on public.users
    const { data: unauthUsersDump, error: unauthUsersErr } = await unauthenticatedSuperadminClient
      .from('users')
      .select('id, username, password, role');

    if (!unauthUsersErr && unauthUsersDump && unauthUsersDump.length > 0) {
      fail(
        `CRITICAL RLS BYPASS: Unauthenticated client sending only 'x-user-role': 'Superadmin' dumped ${unauthUsersDump.length} user accounts with passwords!`,
        { exposedCount: unauthUsersDump.length, sample: unauthUsersDump[0] }
      );
    }
    pass('Unauthenticated x-user-role: Superadmin client received 0 rows from public.users (credential dump blocked)');

    // 4.1.2 School Provisioning Denial (public.sekolah INSERT)
    const rogueUnauthSchoolId = randomUUID();
    const { data: rogueUnauthSchoolData, error: rogueUnauthSchoolErr } = await unauthenticatedSuperadminClient
      .from('sekolah')
      .insert([{
        id: rogueUnauthSchoolId,
        nama: 'Hostile Unauthenticated School Exploit',
        npsn: `97${timestamp.toString().slice(-6)}`,
        status: 'aktif'
      }])
      .select();

    if (!rogueUnauthSchoolErr && rogueUnauthSchoolData && rogueUnauthSchoolData.length > 0) {
      await superadminClient.from('sekolah').delete().eq('id', rogueUnauthSchoolId);
      fail('CRITICAL RLS BYPASS: Unauthenticated client with x-user-role: Superadmin created a school in public.sekolah!', rogueUnauthSchoolData);
    }
    const { data: checkRogueUnauthSchool } = await superadminClient.from('sekolah').select('id').eq('id', rogueUnauthSchoolId);
    if (checkRogueUnauthSchool && checkRogueUnauthSchool.length > 0) {
      await superadminClient.from('sekolah').delete().eq('id', rogueUnauthSchoolId);
      fail('Rogue school was found in public.sekolah after unauthenticated insert!');
    }
    pass('Unauthenticated x-user-role: Superadmin cannot create schools in public.sekolah');

    // 4.1.3 Cross-Tenant Exfiltration Denial: data_guru
    const { data: unauthGuruData } = await unauthenticatedSuperadminClient
      .from('data_guru')
      .select('id, nama_guru, sekolah_id');

    if (unauthGuruData && unauthGuruData.length > 0) {
      fail(`CRITICAL RLS BYPASS: Unauthenticated client with x-user-role: Superadmin read ${unauthGuruData.length} rows from data_guru!`, unauthGuruData[0]);
    }
    pass('Unauthenticated x-user-role: Superadmin returned 0 rows from data_guru');

    // 4.1.4 Cross-Tenant Exfiltration Denial: pengaturan
    const { data: unauthPengaturanData } = await unauthenticatedSuperadminClient
      .from('pengaturan')
      .select('id, key, value');

    if (unauthPengaturanData && unauthPengaturanData.length > 0) {
      fail(`CRITICAL RLS BYPASS: Unauthenticated client with x-user-role: Superadmin read ${unauthPengaturanData.length} rows from pengaturan!`, unauthPengaturanData[0]);
    }
    pass('Unauthenticated x-user-role: Superadmin returned 0 rows from pengaturan');

    // 4.1.5 Tenant Mutation Denial: pengaturan INSERT
    const hostileUnauthSettingId = randomUUID();
    const { data: hostileSettingData, error: hostileSettingErr } = await unauthenticatedSuperadminClient
      .from('pengaturan')
      .insert([{
        id: hostileUnauthSettingId,
        sekolah_id: defaultSchoolAId,
        key: 'hostile_unauth_key',
        value: 'ATTACK_SUCCESS'
      }])
      .select();

    if (!hostileSettingErr && hostileSettingData && hostileSettingData.length > 0) {
      await superadminClient.from('pengaturan').delete().eq('id', hostileUnauthSettingId);
      fail('CRITICAL RLS BYPASS: Unauthenticated client with x-user-role: Superadmin inserted row into pengaturan!', hostileSettingData);
    }
    pass('Unauthenticated x-user-role: Superadmin rejected on tenant table mutation (pengaturan INSERT)');

    // -------------------------------------------------------------------------
    // 4.2 Forged Non-Existent x-user-id with 'x-user-role: Superadmin'
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}4.2 Adversarial: Forged Non-Existent x-user-id with Superadmin Role${RESET}`);

    // 4.2.1 Bulk Credential Rejection on public.users
    const { data: forgedIdUsersData, error: forgedIdUsersErr } = await forgedUserSuperadminClient
      .from('users')
      .select('id, username, password, role');

    if (!forgedIdUsersErr && forgedIdUsersData && forgedIdUsersData.length > 0) {
      fail(`CRITICAL RLS BYPASS: Forged random x-user-id with x-user-role: Superadmin read ${forgedIdUsersData.length} user accounts!`, forgedIdUsersData[0]);
    }
    pass('Forged random x-user-id with x-user-role: Superadmin received 0 rows from public.users');

    // 4.2.2 Mutation Rejection on public.sekolah
    const rogueForgedSchoolId = randomUUID();
    const { data: rogueForgedSchoolData, error: rogueForgedSchoolErr } = await forgedUserSuperadminClient
      .from('sekolah')
      .insert([{
        id: rogueForgedSchoolId,
        nama: 'Forged Identity School Exploit',
        npsn: `96${timestamp.toString().slice(-6)}`,
        status: 'aktif'
      }])
      .select();

    if (!rogueForgedSchoolErr && rogueForgedSchoolData && rogueForgedSchoolData.length > 0) {
      await superadminClient.from('sekolah').delete().eq('id', rogueForgedSchoolId);
      fail('CRITICAL RLS BYPASS: Forged random x-user-id created a school in public.sekolah!', rogueForgedSchoolData);
    }
    const { data: checkRogueForgedSchool } = await superadminClient.from('sekolah').select('id').eq('id', rogueForgedSchoolId);
    if (checkRogueForgedSchool && checkRogueForgedSchool.length > 0) {
      await superadminClient.from('sekolah').delete().eq('id', rogueForgedSchoolId);
      fail('Forged school was found in public.sekolah after rejected insert!');
    }
    pass('Forged random x-user-id with x-user-role: Superadmin cannot create schools in public.sekolah');

    // 4.2.3 Tenant Table Exfiltration Denial: public.data_siswa
    const { data: forgedSiswaData } = await forgedUserSuperadminClient
      .from('data_siswa')
      .select('id, nama_siswa, sekolah_id');

    if (forgedSiswaData && forgedSiswaData.length > 0) {
      fail(`CRITICAL RLS BYPASS: Forged random x-user-id read ${forgedSiswaData.length} rows from data_siswa!`, forgedSiswaData[0]);
    }
    pass('Forged random x-user-id with x-user-role: Superadmin received 0 rows from data_siswa');

    // -------------------------------------------------------------------------
    // 4.3 School Admin x-user-id Privilege Escalation (u.sekolah_id IS NOT NULL)
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}4.3 Adversarial: School Admin x-user-id Privilege Escalation (u.sekolah_id IS NOT NULL)${RESET}`);

    // 4.3.1 School Creation Denial
    const rogueEscSchoolId = randomUUID();
    const { data: rogueEscSchoolData, error: rogueEscSchoolErr } = await schoolAdminEscalationClient
      .from('sekolah')
      .insert([{
        id: rogueEscSchoolId,
        nama: 'Escalated School Admin Exploit',
        npsn: `95${timestamp.toString().slice(-6)}`,
        status: 'aktif'
      }])
      .select();

    if (!rogueEscSchoolErr && rogueEscSchoolData && rogueEscSchoolData.length > 0) {
      await superadminClient.from('sekolah').delete().eq('id', rogueEscSchoolId);
      fail('CRITICAL PRIVILEGE ESCALATION: School Admin user ID with x-user-role: Superadmin created a school in public.sekolah!', rogueEscSchoolData);
    }
    pass('School Admin user ID with x-user-role: Superadmin cannot create schools in public.sekolah');

    // 4.3.2 School Deletion Denial (Targeting School B)
    const { data: escDelSchoolData, error: escDelSchoolErr } = await schoolAdminEscalationClient
      .from('sekolah')
      .delete()
      .eq('id', schoolBId)
      .select();

    if (!escDelSchoolErr && escDelSchoolData && escDelSchoolData.length > 0) {
      fail('CRITICAL PRIVILEGE ESCALATION: School Admin user ID with x-user-role: Superadmin deleted School B!', escDelSchoolData);
    }
    const { data: verifySchoolBStillAlive } = await superadminClient.from('sekolah').select('id').eq('id', schoolBId).single();
    if (!verifySchoolBStillAlive) {
      fail('School B was deleted by School Admin escalation client!');
    }
    pass('School Admin user ID with x-user-role: Superadmin cannot delete other schools (School B unharmed)');

    // 4.3.3 Cross-Tenant Data Harvest Denial (Reading School B teacher without x-sekolah-id)
    const { data: escReadGuruBData } = await schoolAdminEscalationClient
      .from('data_guru')
      .select('*')
      .eq('id', guruBId);

    if (escReadGuruBData && escReadGuruBData.length > 0) {
      fail('CRITICAL PRIVILEGE ESCALATION: School Admin user ID with x-user-role: Superadmin read School B teacher!', escReadGuruBData);
    }
    pass('School Admin user ID with x-user-role: Superadmin cannot read School B teacher (returned 0 rows)');

    // 4.3.4 Platform Superadmin Account Harvest Denial (public.users where role = 'Superadmin')
    const { data: escSuperUsersData } = await schoolAdminEscalationClient
      .from('users')
      .select('id, username, password, role, sekolah_id')
      .eq('role', 'Superadmin');

    if (escSuperUsersData && escSuperUsersData.length > 0) {
      fail('CRITICAL PRIVILEGE ESCALATION: School Admin user ID with x-user-role: Superadmin read platform Superadmin accounts!', escSuperUsersData);
    }
    pass('School Admin user ID with x-user-role: Superadmin cannot read platform Superadmin rows (u.sekolah_id IS NOT NULL constraint enforced)');

    // 4.3.5 Platform Superadmin Account Creation Denial
    const rogueEscSuperUsername = `rogue_esc_super_${timestamp}`;
    const { data: rogueEscUserData, error: rogueEscUserErr } = await schoolAdminEscalationClient
      .from('users')
      .insert([{
        username: rogueEscSuperUsername,
        password: 'HostilePassword99!',
        nama: 'Rogue Escalated Superadmin',
        role: 'Superadmin',
        sekolah_id: null
      }])
      .select();

    if (!rogueEscUserErr && rogueEscUserData && rogueEscUserData.length > 0) {
      await superadminClient.from('users').delete().eq('username', rogueEscSuperUsername);
      fail('CRITICAL PRIVILEGE ESCALATION: School Admin user ID with x-user-role: Superadmin created a Superadmin in public.users!', rogueEscUserData);
    }
    pass('School Admin user ID with x-user-role: Superadmin blocked from provisioning platform Superadmins');

    // -------------------------------------------------------------------------
    // 4.4 School Admin Claiming Superadmin While Bound to School A (x-sekolah-id present)
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}4.4 School Admin with x-sekolah-id Claiming Superadmin${RESET}`);

    // 4.4.1 Creation of school blocked
    const illegalSchoolId = randomUUID();
    const { data: spoofInsData, error: spoofInsErr } = await spoofedSchoolAdminClient
      .from('sekolah')
      .insert([{
        id: illegalSchoolId,
        nama: 'Illegal Spoofed School',
        npsn: `00${timestamp.toString().slice(-6)}`,
        status: 'aktif'
      }])
      .select();

    if (!spoofInsErr && spoofInsData && spoofInsData.length > 0) {
      await superadminClient.from('sekolah').delete().eq('id', illegalSchoolId);
      fail('CRITICAL PRIVILEGE ESCALATION: School Admin spoofed Superadmin role and created a new school!', spoofInsData);
    }
    pass('Header spoofing attack with x-sekolah-id on public.sekolah rejected (School Admin cannot create schools)');

    // 4.4.2 Deletion of School B blocked
    const { data: spoofDelData, error: spoofDelErr } = await spoofedSchoolAdminClient
      .from('sekolah')
      .delete()
      .eq('id', schoolBId)
      .select();

    if (!spoofDelErr && spoofDelData && spoofDelData.length > 0) {
      fail('CRITICAL PRIVILEGE ESCALATION: Spoofed School Admin deleted School B!', spoofDelData);
    }
    const { data: verifySchoolBStillExists } = await superadminClient.from('sekolah').select('id').eq('id', schoolBId).single();
    if (!verifySchoolBStillExists) {
      fail('School B was deleted by spoofed School Admin client!');
    }
    pass('Header spoofing attack with x-sekolah-id on school deletion blocked (School B unharmed)');

    // -------------------------------------------------------------------------
    // 4.5 Cross-Tenant User Provisioning Defense
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}4.5 Cross-Tenant User Provisioning Defense${RESET}`);

    // 4.5.1 School Admin attempting to provision a rogue Superadmin user
    const rogueSuperadminUsername = `rogue_super_${timestamp}`;
    const { data: rogueData, error: rogueErr } = await schoolAAdminClient
      .from('users')
      .insert([{
        username: rogueSuperadminUsername,
        password: 'Password123!',
        nama: 'Rogue Superadmin',
        role: 'Superadmin',
        sekolah_id: null
      }])
      .select();

    if (!rogueErr && rogueData && rogueData.length > 0) {
      await superadminClient.from('users').delete().eq('username', rogueSuperadminUsername);
      fail('CRITICAL PRIVILEGE ESCALATION: School Admin created a rogue Superadmin user in public.users!', rogueData);
    }
    pass('Privilege escalation in public.users blocked (School Admin cannot provision Superadmins)');

    // 4.5.2 School Admin attempting to create an Admin for another school
    const rogueAdminBUsername = `rogue_admin_b_${timestamp}`;
    const { data: rogueAdminBData, error: rogueAdminBErr } = await schoolAAdminClient
      .from('users')
      .insert([{
        username: rogueAdminBUsername,
        password: 'Password123!',
        nama: 'Rogue Admin B',
        role: 'Admin',
        sekolah_id: schoolBId
      }])
      .select();

    if (!rogueAdminBErr && rogueAdminBData && rogueAdminBData.length > 0) {
      await superadminClient.from('users').delete().eq('username', rogueAdminBUsername);
      fail('CRITICAL SECURITY VIOLATION: School A Admin created an Admin user for School B!', rogueAdminBData);
    }
    pass('Cross-tenant user provisioning blocked (School A cannot create users for School B)');
```

---

## 4. Caveats

- **Prerequisite SQL Hardening**: Before these new adversarial test cases will pass on the live database, `public.is_superadmin()` in SQL must be updated to remove the fallback to `get_auth_user_role()`. Currently, on the live un-remediated database, tests under 4.1 will deliberately trigger FAIL (as proven by `auditor_m8_forensic` and `challenger_m8_multitenant`).
- **Companion Test Fix**: `tests/m7_challenger_rls.test.ts` line 61 must be patched using `tests_m7_challenger_rls_fix.patch` so it authenticates with `superadminUserId` via `verify_login`, preventing test failure when the SQL patch is applied.

---

## 5. Conclusion

The hostile adversarial test specifications have been fully designed and written to three ready-to-use artifacts in `.agents/explorer_m8_fix_adversarial/`:
1. `proposed_m7_rls_integrity.test.ts`: Complete drop-in replacement file containing all 43 comprehensive checks.
2. `adversarial_test_cases.patch`: Unified diff patch applicable cleanly to `tests/m7_rls_integrity.test.ts`.
3. `tests_m7_challenger_rls_fix.patch`: Unified diff patch to eliminate self-certifying header spoofing in `tests/m7_challenger_rls.test.ts`.

---

## 6. Verification Method

To independently verify this test specification:
1. Review generated patch:
   ```powershell
   git diff --no-index tests/m7_rls_integrity.test.ts .agents/explorer_m8_fix_adversarial/proposed_m7_rls_integrity.test.ts
   ```
2. Apply patch to `tests/m7_rls_integrity.test.ts`:
   ```powershell
   git apply .agents/explorer_m8_fix_adversarial/adversarial_test_cases.patch
   ```
3. Run against remediated database:
   ```powershell
   npx tsx tests/m7_rls_integrity.test.ts
   ```
   Expected: All 43 checks pass with zero leaks and exit code 0.
