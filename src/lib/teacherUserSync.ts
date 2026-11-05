/**
 * src/lib/teacherUserSync.ts
 * 
 * Helper module for managing and synchronizing Teacher User Accounts.
 * Automatically synchronizes teachers from data_guru into users accounts with:
 * - Username: NIP
 * - Default Password: NIP27 (${nip}27)
 * - Role: Guru
 */

import { normalizeName } from './dataIntegrityGuard';

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
 * Derives default password for a teacher: username/NIP + '27'
 */
export function getDefaultTeacherPassword(usernameOrNip: string): string {
  const clean = (usernameOrNip || '').trim();
  if (!clean || clean === '-') {
    return 'guru27';
  }
  return `${clean}27`;
}

/**
 * Resolves the canonical username from a teacher record (prefers NIP, fallback to clean name)
 */
export function resolveTeacherUsername(guru: { nip?: string | null; nama_guru?: string | null }): string {
  const cleanNip = (guru?.nip || '').trim();
  if (cleanNip && cleanNip !== '-' && cleanNip !== 'null') {
    return cleanNip;
  }
  const cleanNama = (guru?.nama_guru || '').trim();
  const fallback = cleanNama.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return fallback || 'guru';
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

    // 2. Fetch users accounts with role Guru
    let userQuery = supabaseClient.from('users').select('*').eq('role', 'Guru');
    if (sekolahId) {
      userQuery = userQuery.eq('sekolah_id', sekolahId);
    }
    const { data: users, error: userErr } = await userQuery;
    if (userErr) {
      console.warn('[teacherUserSync] Query users with role=Guru error:', userErr.message);
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
      const nama = guru.nama_guru || '';
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

        const newUserData = {
          id: newId,
          username: targetUsername,
          password: defaultPassword,
          nama: nama,
          role: 'Guru',
          sekolah_id: targetSekolahId
        };

        const { data: inserted, error: insErr } = await supabaseClient
          .from('users')
          .insert([newUserData])
          .select();

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
        } else {
          createdCount++;
          const finalUser = (inserted && inserted[0]) ? inserted[0] : newUserData;
          userByUsername.set(targetUsername.toLowerCase(), finalUser);
          matchedUser = finalUser;
        }
      }

      accounts.push({
        guruId: guru.id,
        userId: matchedUser?.id,
        nama: nama,
        nip: nip || '-',
        username: matchedUser?.username || targetUsername,
        defaultPassword: defaultPassword,
        role: 'Guru',
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
 * Also synchronizes NIP in data_guru if username was updated to match NIP.
 */
export async function updateTeacherCredentials(
  supabaseClient: any,
  params: {
    userId: string;
    guruId?: string;
    oldUsername?: string;
    newUsername: string;
    newPassword?: string;
    newNama?: string;
    sekolahId?: string;
  }
): Promise<{ success: boolean; message: string }> {
  const { userId, guruId, oldUsername, newUsername, newPassword, newNama } = params;

  const cleanUsername = (newUsername || '').trim();
  if (!cleanUsername) {
    return { success: false, message: 'Username tidak boleh kosong!' };
  }

  try {
    // 1. Verify username uniqueness if changed
    if (oldUsername && cleanUsername.toLowerCase() !== oldUsername.toLowerCase()) {
      const { data: existing } = await supabaseClient
        .from('users')
        .select('id, username')
        .eq('username', cleanUsername)
        .neq('id', userId)
        .maybeSingle();

      if (existing) {
        return { success: false, message: `Username "${cleanUsername}" sudah digunakan oleh akun lain!` };
      }
    }

    // 2. Build user update payload
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

    // Direct update on users table
    const { error: userUpdateErr } = await supabaseClient
      .from('users')
      .update(userPayload)
      .eq('id', userId);

    if (userUpdateErr) {
      throw new Error(`Gagal memperbarui tabel users: ${userUpdateErr.message}`);
    }

    // 3. Keep data_guru synchronized (NIP and nama)
    try {
      const guruPayload: Record<string, any> = {};
      if (cleanUsername && cleanUsername !== '-') {
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

    return { success: true, message: 'Kredensial akun guru berhasil diperbarui!' };
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
    userId: string;
    username: string;
    nip?: string;
  }
): Promise<{ success: boolean; message: string; defaultPassword: string }> {
  const targetIdentifier = (params.nip && params.nip !== '-') ? params.nip.trim() : params.username.trim();
  const defaultPassword = getDefaultTeacherPassword(targetIdentifier);

  try {
    const { error } = await supabaseClient
      .from('users')
      .update({
        password: defaultPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.userId);

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
