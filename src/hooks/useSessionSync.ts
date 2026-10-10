import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
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

          // Re-validate session token against database
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('id, username, nama, role, sekolah_id, session_token, avatar')
            .eq('id', activeUser.id)
            .single();

          const isNetworkError =
            (typeof navigator !== 'undefined' && !navigator.onLine) ||
            (error && (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || (error as any).name === 'AbortError'));

          if (isNetworkError) {
            console.warn('[AppScreen] Network unavailable during resume. Retaining active session.');
            return;
          }

          if (error || !dbUser || dbUser.session_token !== activeUser.session_token) {
            console.warn('[AppScreen] Session invalidated or expired after idle. Logging out.');
            onLogout();
            return;
          }

          // If superadmin role was changed/revoked in DB, log out
          if (isSuperadmin && (dbUser?.role || '').toLowerCase().replace(/\s+/g, '') !== 'superadmin') {
            console.warn('[AppScreen] Superadmin role revoked after idle. Logging out.');
            onLogout();
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

    window.addEventListener('focus', checkIdleAndResume);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pointerdown', checkIdleAndResume, { passive: true });
    window.addEventListener('keydown', checkIdleAndResume, { passive: true });

    return () => {
      window.removeEventListener('focus', checkIdleAndResume);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pointerdown', checkIdleAndResume);
      window.removeEventListener('keydown', checkIdleAndResume);
    };
  }, [currentUser?.id, currentUser?.session_token, user?.id, user?.session_token, onLogout, onUserUpdate]);

  return { syncKey, currentUser, setCurrentUser };
}
