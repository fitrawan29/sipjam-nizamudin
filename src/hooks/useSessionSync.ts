import { useState, useEffect } from 'react';
import { masterSupabase, clearAllClientSessionState } from '@/lib/supabaseClient';
import { AppUser } from '@/types/user';

export function useSessionSync(
  user: AppUser | null,
  onLogout: () => void,
  onUserUpdate?: (user: AppUser) => void
) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(user);
  const [syncKey, setSyncKey] = useState(0);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  useEffect(() => {
    let lastActive = Date.now();
    let isSyncing = false;

    const isSuperadmin = (currentUser?.role || user?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
    const activeUser = currentUser || user;

    const checkIdleAndResume = async () => {
      const now = Date.now();
      const elapsed = now - lastActive;
      lastActive = now;

      // Re-sync only when returning after actual idle (>=30s) and document is visible
      if (elapsed >= 30000 && document.visibilityState === 'visible' && !isSyncing) {
        isSyncing = true;
        try {
          if (!activeUser?.id || !activeUser?.session_token) return;

          // Re-validate session token against master database (never rewritten by satellite scope)
          const { data: dbUser, error } = await masterSupabase
            .from('users')
            .select('id, username, nama, role, sekolah_id, session_token, avatar, kota_kabupaten')
            .eq('id', activeUser.id)
            .single();

          const isNetworkError =
            (typeof navigator !== 'undefined' && !navigator.onLine) ||
            Boolean(
              error &&
              (
                error.message?.includes('Failed to fetch') ||
                error.message?.includes('NetworkError') ||
                (error as any).name === 'AbortError' ||
                (error as any).name === 'TimeoutError' ||
                (error as any).status >= 500 ||
                (error as any).status === 429 ||
                (error as any).status === 408 ||
                error.message?.includes('timeout') ||
                error.message?.includes('Timeout') ||
                error.message?.includes('fetch failed') ||
                error.message?.includes('Load failed') ||
                error.message?.includes('Bad Gateway') ||
                error.message?.includes('Gateway Timeout') ||
                error.message?.includes('Service Unavailable') ||
                error.message?.includes('connection was lost') ||
                error.message?.includes('offline') ||
                error.message?.includes('ERR_') ||
                error.message?.includes('ETIMEDOUT') ||
                error.message?.includes('ECONNREFUSED') ||
                error.message?.includes('ECONNRESET') ||
                error.message?.includes('ENOTFOUND') ||
                error.code === '57014' ||
                error.code?.startsWith?.('PGRST0')
              )
            );

          if (isNetworkError) {
            console.warn('[AppScreen] Network unavailable during resume. Retaining active session.');
            return;
          }

          // If a transient database/network error occurred, preserve cached session
          if (error && error.code !== 'PGRST116') {
            console.warn('[AppScreen] Transient database error during resume. Retaining active session:', error.message);
            return;
          }

          // Only logout if database explicitly confirmed session token mismatch or revoked account
          if (dbUser && dbUser.session_token !== activeUser.session_token) {
            console.warn('[AppScreen] Session invalidated or expired after idle. Logging out.');
            clearAllClientSessionState();
            onLogout();
            return;
          }

          if (!dbUser && error?.code === 'PGRST116') {
            console.warn('[AppScreen] Account not found or session revoked in database. Logging out.');
            clearAllClientSessionState();
            onLogout();
            return;
          }

          // If superadmin role was changed/revoked in DB, log out
          if (dbUser && isSuperadmin && (dbUser?.role || '').toLowerCase().replace(/\s+/g, '') !== 'superadmin') {
            console.warn('[AppScreen] Superadmin role revoked after idle. Logging out.');
            clearAllClientSessionState();
            onLogout();
            return;
          }

          if (!dbUser) {
            return;
          }

          // Sync fresh user data from database into localStorage & state
          try {
            const stored = localStorage.getItem('sipjam_user');
            const parsed = stored ? JSON.parse(stored) : {};
            const synced = { ...parsed, ...dbUser };
            localStorage.setItem('sipjam_user', JSON.stringify(synced));
            setCurrentUser(synced);
            if (onUserUpdate) {
              onUserUpdate(synced);
            }
          } catch (_) {}

          // Invalidate view state to force fresh fetch from database
          setSyncKey(k => k + 1);
        } catch (err) {
          console.error('[AppScreen] Re-sync error on resume:', err);
        } finally {
          isSyncing = false;
        }
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkIdleAndResume();
      } else {
        lastActive = Date.now();
      }
    };

    const handleConfigSync = () => {
      setSyncKey(k => k + 1);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sipjam_config_sync') {
        setSyncKey(k => k + 1);
      }
    };

    window.addEventListener('focus', checkIdleAndResume);
    window.addEventListener('online', checkIdleAndResume);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pointerdown', checkIdleAndResume, { passive: true });
    window.addEventListener('keydown', checkIdleAndResume, { passive: true });
    window.addEventListener('sipjam:config_updated', handleConfigSync);
    window.addEventListener('sipjam:guru_updated', handleConfigSync);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('focus', checkIdleAndResume);
      window.removeEventListener('online', checkIdleAndResume);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pointerdown', checkIdleAndResume);
      window.removeEventListener('keydown', checkIdleAndResume);
      window.removeEventListener('sipjam:config_updated', handleConfigSync);
      window.removeEventListener('sipjam:guru_updated', handleConfigSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentUser?.id, currentUser?.session_token, user?.id, user?.session_token, onLogout, onUserUpdate]);

  return { syncKey, currentUser, setCurrentUser };
}
