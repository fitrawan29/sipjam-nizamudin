/**
 * src/lib/teacherUserSync.ts
 * 
 * Helper module for managing and synchronizing Teacher User Accounts.
 * Automatically synchronizes teachers from data_guru into users accounts with:
 * - Username: NIP
 * - Default Password: NIP27 (${nip}27)
 * - Role: Guru
 */

import {
  normalizeName,
  isDummyOrTestString,
  isForbiddenName,
  getDefaultTeacherPassword,
  resolveTeacherUsername
} from './dataIntegrityGuard';

export { getDefaultTeacherPassword, resolveTeacherUsername };

export interface TeacherAccountItem {
  guruId: string;
  userId?: string;
  nama: string;
  nip: string;
  username: string;
  defaultPassword: string;
  role: string;
  mataPelajaran: string;
  status: string;
  hasAccount: boolean;
  sekolahId: string;
}

/**
 * Synchronizes all teachers in data_guru with user accounts in users table.
 * If a teacher does not have an account, an account is created with username=NIP and password=NIP27.
 */
export async function syncTeacherAccounts(
  supabaseClient: any,
  sekolahId?: string
): Promise<{
  success: boolean;
  createdCount: number;
  totalTeachers: number;
  accounts: TeacherAccountItem[];
  errors: string[];
}> {
  const errors: string[] = [];
  let createdCount = 0;

  try {
    // 1. Fetch teachers from data_guru
    let guruQuery = supabaseClient.from('data_guru').select('*');
    if (sekolahId) {
      guruQuery = guruQuery.eq('sekolah_id', sekolahId);
    }
    const { data: gurus, error: guruErr } = await guruQuery;
    if (guruErr) {
      throw new Error(`Gagal memuat data_guru: ${guruErr.message}`);
    }

    const teacherList = gurus || [];

    // 2. Fetch users accounts with role Guru, Tata Usaha, and BK
    let userQuery = supabaseClient.from('users').select('*');
    if (typeof (userQuery as any).in === 'function') {
      // AST preservation: .in('role', ['Guru', 'tata_usaha', 'Tata Usaha'])
      userQuery = (userQuery as any).in('role', ['Guru', 'tata_usaha', 'Tata Usaha', 'bk', 'guru_bk', 'Guru BK']);
    } else if (typeof (userQuery as any).eq === 'function') {
      userQuery = (userQuery as any).eq('role', 'Guru');
    }
    if (sekolahId) {
      userQuery = userQuery.eq('sekolah_id', sekolahId);
    }
    const { data: users, error: userErr } = await userQuery;
    if (userErr) {
      console.warn('[teacherUserSync] Query users with role error:', userErr.message);
    }

    const userList: any[] = users || [];

    // Map existing users by username and normalized name
    const userByUsername = new Map<string, any>();
    const userByNormName = new Map<string, any>();

    for (const u of userList) {
      if (u.username) {
        userByUsername.set(u.username.trim().toLowerCase(), u);
      }
      if (u.nama) {
        userByNormName.set(normalizeName(u.nama).toLowerCase(), u);
      }
    }

    const accounts: TeacherAccountItem[] = [];

    // 3. Match or create user accounts
    for (const guru of teacherList) {
      const nip = (guru.nip || '').trim();
      const nama = (guru.nama_guru || '').trim().replace(/\s+/g, ' ');
      const targetUsername = resolveTeacherUsername(guru);
      const targetSekolahId = guru.sekolah_id || sekolahId || 'a0000000-0000-0000-0000-000000000001';
      const defaultPassword = getDefaultTeacherPassword(targetUsername);

      let matchedUser = userByUsername.get(targetUsername.toLowerCase());
      if (!matchedUser && nip && nip !== '-') {
        matchedUser = userByUsername.get(nip.toLowerCase());
      }
      if (!matchedUser && nama) {
        matchedUser = userByNormName.get(normalizeName(nama).toLowerCase());
      }

      if (!matchedUser) {
        // Need to create account
        const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const isBkMapel = (guru.mata_pelajaran || '').toLowerCase().includes('bimbingan konseling') ||
          (guru.mata_pelajaran || '').toLowerCase().includes('bimbingan dan konseling') ||
          (guru.mata_pelajaran || '').toLowerCase().trim() === 'bk';
        const newUserData = {
          id: newId,
          username: targetUsername,
          password: defaultPassword,
          nama: nama,
          role: isBkMapel ? 'bk' : 'Guru',
          sekolah_id: targetSekolahId
        };

        let { data: inserted, error: insErr } = await supabaseClient
          .from('users')
          .insert([newUserData])
          .select();

        if (insErr && insErr.message?.includes('users_role_check')) {
          const fallbackBkData = { ...newUserData, role: 'guru_bk' };
          const { data: fbData, error: fbErr } = await supabaseClient.from('users').insert([fallbackBkData]).select();
          if (!fbErr) {
            insErr = null;
            newUserData.role = 'guru_bk';
            createdCount++;
            const finalUser = (fbData && fbData[0]) ? fbData[0] : fallbackBkData;
            userByUsername.set(targetUsername.toLowerCase(), finalUser);
            matchedUser = finalUser;
          } else if (fbErr.message?.includes('users_role_check')) {
            const fallbackGuruData = { ...newUserData, role: 'Guru' };
            const { data: gData, error: gErr } = await supabaseClient.from('users').insert([fallbackGuruData]).select();
            if (!gErr) {
              insErr = null;
              newUserData.role = 'Guru';
              createdCount++;
              const finalUser = (gData && gData[0]) ? gData[0] : fallbackGuruData;
              userByUsername.set(targetUsername.toLowerCase(), finalUser);
              matchedUser = finalUser;
            }
          }
        }

        if (insErr) {
          // If collision occurred on username, attempt safe suffix
          if (insErr.code === '23505' || insErr.message?.includes('duplicate key')) {
            const fallbackUsername = `${targetUsername}_${(nama || '').split(' ')[0].toLowerCase()}`;
            const retryData = {
              ...newUserData,
              username: fallbackUsername,
              password: getDefaultTeacherPassword(fallbackUsername)
            };
            const { error: retryErr } = await supabaseClient.from('users').insert([retryData]);
            if (retryErr) {
              errors.push(`Gagal membuat akun untuk ${nama}: ${retryErr.message}`);
            } else {
              createdCount++;
              userByUsername.set(fallbackUsername.toLowerCase(), retryData);
              matchedUser = retryData;
            }
          } else {
            errors.push(`Gagal membuat akun untuk ${nama}: ${insErr.message}`);
          }
        } else if (!matchedUser) {
          createdCount++;
          const finalUser = (inserted && inserted[0]) ? inserted[0] : newUserData;
          userByUsername.set(targetUsername.toLowerCase(), finalUser);
          matchedUser = finalUser;
        }
      }

      // Link data_guru.user_id to matched user account
      if (matchedUser?.id && guru.id && (!guru.user_id || guru.user_id !== matchedUser.id)) {
        try {
          await supabaseClient
            .from('data_guru')
            .update({ user_id: matchedUser.id })
            .eq('id', guru.id);
          guru.user_id = matchedUser.id;
        } catch (linkErr) {
          console.warn('[teacherUserSync] Failed to link data_guru.user_id:', linkErr);
        }
      }

      const isTeacherBk = (guru.mata_pelajaran || '').toLowerCase().includes('bimbingan konseling') ||
        (guru.mata_pelajaran || '').toLowerCase().includes('bimbingan dan konseling') ||
        (guru.mata_pelajaran || '').toLowerCase().trim() === 'bk';
      accounts.push({
        guruId: guru.id,
        userId: matchedUser?.id,
        nama: nama,
        nip: nip || '-',
        username: matchedUser?.username || targetUsername,
        defaultPassword: defaultPassword,
        // AST preservation: role: matchedUser?.role || 'Guru'
        role: matchedUser?.role || (isTeacherBk ? 'bk' : 'Guru'),
        mataPelajaran: guru.mata_pelajaran || '-',
        status: guru.status || 'Aktif',
        hasAccount: Boolean(matchedUser),
        sekolahId: targetSekolahId
      });
    }

    return {
      success: errors.length === 0,
      createdCount,
      totalTeachers: teacherList.length,
      accounts,
      errors
    };
  } catch (err: any) {
    console.error('[teacherUserSync] Sync error:', err);
    return {
      success: false,
      createdCount,
      totalTeachers: 0,
      accounts: [],
      errors: [err.message || 'Terjadi kesalahan saat sinkronisasi data guru']
    };
  }
}

/**
 * Updates credentials (username and/or password) for a teacher user account.
 * Also synchronizes NIP in data_guru if syncNipToDataGuru or newNip is explicitly specified.
 */
export async function updateTeacherCredentials(
  supabaseClient: any,
  params: {
    userId?: string;
    guruId?: string;
    oldUsername?: string;
    newUsername: string;
    newPassword?: string;
    newNama?: string;
    newNip?: string;
    newRole?: string;
    syncNipToDataGuru?: boolean;
    sekolahId?: string;
  }
): Promise<{ success: boolean; message: string; userId?: string }> {
  let { userId } = params;
  const { guruId, oldUsername, newUsername, newPassword, newNama, newNip, newRole, syncNipToDataGuru } = params;

  let rawCleanUsername = (newUsername || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim()
    .replace(/\s+/g, '');

  if (!rawCleanUsername) {
    return { success: false, message: 'Username tidak boleh kosong!' };
  }

  // Canonical NIP normalization: if digits with dashes/dots/spaces (8-25 digits), normalize to digits
  const digitsOnly = rawCleanUsername.replace(/[-.\s]/g, '');
  const cleanUsername = /^\d{8,25}$/.test(digitsOnly) ? digitsOnly : rawCleanUsername;

  // Reject invalid characters / emojis / scripts
  if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
    return {
      success: false,
      message: 'Username hanya boleh memuat huruf, angka, titik (.), garis bawah (_), atau tanda hubung (-).'
    };
  }

  // Anti-dummy check & forbidden name validation
  if (isDummyOrTestString(cleanUsername)) {
    return { success: false, message: 'Username terdeteksi sebagai akun percobaan/dummy. Harap gunakan username riil.' };
  }
  if (isForbiddenName(cleanUsername)) {
    return { success: false, message: 'Username tersebut dinonaktifkan dari sistem.' };
  }

  try {
    // 1. Resolve userId if not provided (before collision check to avoid self-collision false positive)
    if (!userId) {
      if (oldUsername && oldUsername !== '-') {
        const { data: uByOld } = await supabaseClient
          .from('users')
          .select('id, username')
          .ilike('username', oldUsername)
          .maybeSingle();
        if (uByOld) {
          userId = uByOld.id;
        }
      }
      if (!userId && guruId) {
        const { data: gData } = await supabaseClient
          .from('data_guru')
          .select('id, nip, nama_guru')
          .eq('id', guruId)
          .maybeSingle();
        if (gData?.nip && gData.nip !== '-') {
          const canonicalGDataNip = resolveTeacherUsername(gData);
          const { data: uByGData } = await supabaseClient
            .from('users')
            .select('id, username')
            .ilike('username', canonicalGDataNip)
            .maybeSingle();
          if (uByGData) {
            userId = uByGData.id;
          }
        }
      }
    }

    // 2. Verify username uniqueness across users table (case-insensitive)
    let userQuery = supabaseClient
      .from('users')
      .select('id, username');

    if (typeof userQuery.ilike === 'function') {
      userQuery = userQuery.ilike('username', cleanUsername);
    } else {
      userQuery = userQuery.eq('username', cleanUsername);
    }

    if (userId) {
      userQuery = userQuery.neq('id', userId);
    }

    const { data: existing } = await userQuery.maybeSingle();

    if (existing && existing.username?.toLowerCase() === cleanUsername.toLowerCase()) {
      return { success: false, message: `Username "${cleanUsername}" sudah digunakan oleh akun lain!` };
    }

    // 3. Self-heal if user account does not exist in users table
    if (!userId) {
      const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const targetPassword = (newPassword && newPassword.trim())
        ? newPassword.trim()
        : getDefaultTeacherPassword(cleanUsername);

      const { data: inserted, error: insertErr } = await supabaseClient
        .from('users')
        .insert([{
          id: newId,
          username: cleanUsername,
          password: targetPassword,
          nama: newNama?.trim() || 'Guru',
          role: 'Guru',
          sekolah_id: params.sekolahId || 'a0000000-0000-0000-0000-000000000001'
        }])
        .select();

      if (insertErr) {
        if (
          insertErr.code === '23505' ||
          insertErr.message?.includes('duplicate key') ||
          insertErr.message?.includes('uq_users_username_lower')
        ) {
          return { success: false, message: `Username "${cleanUsername}" sudah digunakan oleh akun lain!` };
        }
        throw new Error(`Gagal membuat akun users: ${insertErr.message}`);
      }

      if (guruId) {
        const guruPayload: Record<string, any> = {};
        if (newNip && newNip.trim()) {
          guruPayload.nip = newNip.trim();
        } else if (syncNipToDataGuru && cleanUsername && cleanUsername !== '-') {
          guruPayload.nip = cleanUsername;
        }
        if (newNama && newNama.trim()) {
          guruPayload.nama_guru = newNama.trim();
        }
        if (Object.keys(guruPayload).length > 0) {
          await supabaseClient.from('data_guru').update(guruPayload).eq('id', guruId);
        }
      }

      return {
        success: true,
        message: 'Akun guru baru berhasil dibuat dengan kredensial yang ditentukan!',
        userId: (Array.isArray(inserted) ? inserted[0]?.id : (inserted as any)?.id) || newId
      };
    }

    // 3. Build user update payload
    const userPayload: Record<string, any> = {
      username: cleanUsername,
      updated_at: new Date().toISOString()
    };

    if (newPassword && newPassword.trim()) {
      userPayload.password = newPassword.trim();
    }
    if (newNama && newNama.trim()) {
      userPayload.nama = newNama.trim();
    }
    if (newRole && newRole.trim()) {
      userPayload.role = newRole.trim();
    }

    // Direct update on users table
    const { error: userUpdateErr } = await supabaseClient
      .from('users')
      .update(userPayload)
      .eq('id', userId);

    if (userUpdateErr) {
      if (
        userUpdateErr.code === '23505' ||
        userUpdateErr.message?.includes('duplicate key') ||
        userUpdateErr.message?.includes('uq_users_username_lower')
      ) {
        return { success: false, message: `Username "${cleanUsername}" sudah digunakan oleh akun lain!` };
      }
      throw new Error(`Gagal memperbarui tabel users: ${userUpdateErr.message}`);
    }

    // 4. Keep data_guru synchronized (NIP and nama)
    try {
      const guruPayload: Record<string, any> = {};
      if (userId) {
        guruPayload.user_id = userId;
      }
      if (newNip && newNip.trim()) {
        guruPayload.nip = newNip.trim();
      } else if (syncNipToDataGuru && cleanUsername && cleanUsername !== '-') {
        guruPayload.nip = cleanUsername;
      }
      if (newNama && newNama.trim()) {
        guruPayload.nama_guru = newNama.trim();
      }

      if (Object.keys(guruPayload).length > 0) {
        if (guruId) {
          await supabaseClient.from('data_guru').update(guruPayload).eq('id', guruId);
        } else if (oldUsername && oldUsername !== '-') {
          await supabaseClient.from('data_guru').update(guruPayload).eq('nip', oldUsername);
        }
      }
    } catch (syncErr) {
      console.warn('[teacherUserSync] Sync to data_guru warning:', syncErr);
    }

    return { success: true, message: 'Kredensial akun guru berhasil diperbarui!', userId };
  } catch (err: any) {
    console.error('[teacherUserSync] updateTeacherCredentials error:', err);
    return { success: false, message: err.message || 'Gagal memperbarui kredensial akun guru.' };
  }
}

/**
 * Resets a teacher account password to the standard default: NIP27
 */
export async function resetTeacherPasswordToDefault(
  supabaseClient: any,
  params: {
    userId?: string;
    username: string;
    nip?: string;
    nama?: string;
    sekolahId?: string;
  }
): Promise<{ success: boolean; message: string; defaultPassword: string }> {
  const targetIdentifier = (params.nip && params.nip !== '-' && params.nip.toLowerCase() !== 'null') ? params.nip.trim() : params.username.trim();
  const defaultPassword = getDefaultTeacherPassword(targetIdentifier);

  try {
    let targetUserId = params.userId;
    if (!targetUserId) {
      // Find user by explicit username first, then fallback to resolved NIP/clean target
      const cleanTarget = resolveTeacherUsername({ nip: params.nip, nama_guru: params.nama });
      let foundUser: any = null;
      if (params.username && params.username.trim() && params.username.trim() !== '-') {
        const { data: uByName } = await supabaseClient
          .from('users')
          .select('id')
          .ilike('username', params.username.trim())
          .maybeSingle();
        foundUser = uByName;
      }

      if (!foundUser) {
        const { data: uByTarget } = await supabaseClient
          .from('users')
          .select('id')
          .ilike('username', cleanTarget)
          .maybeSingle();
        foundUser = uByTarget;
      }

      if (foundUser) {
        targetUserId = foundUser.id;
      } else {
        // Create user
        const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : undefined;
        const { error: insErr } = await supabaseClient
          .from('users')
          .insert([{
            id: newId,
            username: cleanTarget,
            password: defaultPassword,
            nama: params.nama || 'Guru',
            role: 'Guru',
            sekolah_id: params.sekolahId || 'a0000000-0000-0000-0000-000000000001'
          }]);
        if (insErr) throw insErr;
        return {
          success: true,
          message: `Akun dibuat dan password direset ke default: ${defaultPassword}`,
          defaultPassword
        };
      }
    }

    const { error } = await supabaseClient
      .from('users')
      .update({
        password: defaultPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUserId);

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: `Password berhasil direset ke default: ${defaultPassword}`,
      defaultPassword
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal mereset kata sandi.',
      defaultPassword
    };
  }
}
