/**
 * piketLock.ts
 * Concurrency Lock Manager for Piket Attendance & Reporting Forms
 * Prevents double data entry and conflicting submissions across concurrent Piket teachers.
 */

export interface PiketLockUser {
  userId: string;
  userName: string;
  lockedAt: string;
}

export interface PiketLockInfo {
  isLocked: boolean;
  lockedByOther: boolean;
  lockedBy?: PiketLockUser;
  lockId?: string;
  expiresAt?: string;
}

export interface PiketLockResult {
  success: boolean;
  lockInfo: PiketLockInfo;
  error?: string;
}

export const PIKET_LOCK_DEFAULT_LEASE_MINUTES = 5;
export const PIKET_LOCK_DEFAULT_HEARTBEAT_SECONDS = 60;

/**
 * Attempts to acquire an exclusive lock on the student attendance form for a specific school and date.
 * If another user holds an unexpired lock, returns success: false with locker details.
 * If no lock exists, or existing lock is expired, or lock belongs to the caller, acquires/renews lease.
 */
export async function acquirePiketLock(
  supabase: any,
  sekolahId: string,
  tanggal: string,
  userId: string,
  userName: string,
  formType: string = 'student_attendance',
  leaseMinutes: number = PIKET_LOCK_DEFAULT_LEASE_MINUTES
): Promise<PiketLockResult> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + leaseMinutes * 60 * 1000).toISOString();

    // 1. Query current lock state
    const { data: existing, error: fetchErr } = await supabase
      .from('piket_form_lock')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .eq('tanggal', tanggal)
      .eq('form_type', formType)
      .maybeSingle();

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      // Non-fatal query error, return failure
      return {
        success: false,
        lockInfo: { isLocked: false, lockedByOther: false },
        error: fetchErr.message
      };
    }

    if (existing) {
      const isExpired = new Date(existing.expires_at).getTime() <= now.getTime();
      const isSameUser = existing.locked_by_user_id === userId;

      // Active lock held by another teacher
      if (!isExpired && !isSameUser) {
        return {
          success: false,
          lockInfo: {
            isLocked: true,
            lockedByOther: true,
            lockedBy: {
              userId: existing.locked_by_user_id,
              userName: existing.locked_by_user_name,
              lockedAt: existing.locked_at
            },
            lockId: existing.id,
            expiresAt: existing.expires_at
          }
        };
      }

      // Take over expired lock or extend own active lock
      const { data: updated, error: updateErr } = await supabase
        .from('piket_form_lock')
        .update({
          locked_by_user_id: userId,
          locked_by_user_name: userName,
          locked_at: now.toISOString(),
          expires_at: expiresAt
        })
        .eq('id', existing.id)
        .select()
        .maybeSingle();

      if (updateErr) {
        return {
          success: false,
          lockInfo: { isLocked: true, lockedByOther: false, lockId: existing.id },
          error: updateErr.message
        };
      }

      return {
        success: true,
        lockInfo: {
          isLocked: true,
          lockedByOther: false,
          lockedBy: {
            userId,
            userName,
            lockedAt: now.toISOString()
          },
          lockId: updated?.id || existing.id,
          expiresAt
        }
      };
    }

    // 2. No lock exists, create a fresh lock
    const { data: created, error: insertErr } = await supabase
      .from('piket_form_lock')
      .insert([{
        sekolah_id: sekolahId,
        tanggal: tanggal,
        form_type: formType,
        locked_by_user_id: userId,
        locked_by_user_name: userName,
        locked_at: now.toISOString(),
        expires_at: expiresAt
      }])
      .select()
      .maybeSingle();

    if (insertErr) {
      // In case of race condition collision, re-fetch existing
      const { data: racedExisting } = await supabase
        .from('piket_form_lock')
        .select('*')
        .eq('sekolah_id', sekolahId)
        .eq('tanggal', tanggal)
        .eq('form_type', formType)
        .maybeSingle();

      if (
        racedExisting &&
        racedExisting.locked_by_user_id !== userId &&
        new Date(racedExisting.expires_at).getTime() > now.getTime()
      ) {
        return {
          success: false,
          lockInfo: {
            isLocked: true,
            lockedByOther: true,
            lockedBy: {
              userId: racedExisting.locked_by_user_id,
              userName: racedExisting.locked_by_user_name,
              lockedAt: racedExisting.locked_at
            },
            lockId: racedExisting.id,
            expiresAt: racedExisting.expires_at
          }
        };
      }

      return {
        success: false,
        lockInfo: { isLocked: false, lockedByOther: false },
        error: insertErr.message
      };
    }

    return {
      success: true,
      lockInfo: {
        isLocked: true,
        lockedByOther: false,
        lockedBy: {
          userId,
          userName,
          lockedAt: now.toISOString()
        },
        lockId: created?.id,
        expiresAt
      }
    };
  } catch (err: any) {
    return {
      success: false,
      lockInfo: { isLocked: false, lockedByOther: false },
      error: err?.message || 'Unknown lock error'
    };
  }
}

/**
 * Refreshes an active lease heartbeat. Must be owned by the calling userId.
 */
export async function refreshPiketLock(
  supabase: any,
  lockId: string,
  userId: string,
  leaseMinutes: number = PIKET_LOCK_DEFAULT_LEASE_MINUTES
): Promise<PiketLockResult> {
  try {
    if (!lockId || !userId) {
      return {
        success: false,
        lockInfo: { isLocked: false, lockedByOther: false },
        error: 'Missing lockId or userId'
      };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + leaseMinutes * 60 * 1000).toISOString();

    const { data: updated, error } = await supabase
      .from('piket_form_lock')
      .update({
        expires_at: expiresAt
      })
      .eq('id', lockId)
      .eq('locked_by_user_id', userId)
      .select()
      .maybeSingle();

    if (error || !updated) {
      return {
        success: false,
        lockInfo: { isLocked: false, lockedByOther: false },
        error: error?.message || 'Lock not found or not owned by user'
      };
    }

    return {
      success: true,
      lockInfo: {
        isLocked: true,
        lockedByOther: false,
        lockedBy: {
          userId: updated.locked_by_user_id,
          userName: updated.locked_by_user_name,
          lockedAt: updated.locked_at
        },
        lockId: updated.id,
        expiresAt
      }
    };
  } catch (err: any) {
    return {
      success: false,
      lockInfo: { isLocked: false, lockedByOther: false },
      error: err?.message || 'Unknown refresh error'
    };
  }
}

/**
 * Releases a held lock by ID, verifying user ownership.
 */
export async function releasePiketLock(
  supabase: any,
  lockId: string,
  userId: string
): Promise<boolean> {
  try {
    if (!lockId || !userId) return false;

    const { error } = await supabase
      .from('piket_form_lock')
      .delete()
      .eq('id', lockId)
      .eq('locked_by_user_id', userId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Releases lock matching sekolah, tanggal, and formType for the given user.
 */
export async function releasePiketLockByParams(
  supabase: any,
  sekolahId: string,
  tanggal: string,
  userId: string,
  formType: string = 'student_attendance'
): Promise<boolean> {
  try {
    if (!sekolahId || !tanggal || !userId) return false;

    const { error } = await supabase
      .from('piket_form_lock')
      .delete()
      .eq('sekolah_id', sekolahId)
      .eq('tanggal', tanggal)
      .eq('form_type', formType)
      .eq('locked_by_user_id', userId);

    return !error;
  } catch {
    return false;
  }
}
