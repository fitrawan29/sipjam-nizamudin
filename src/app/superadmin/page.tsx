'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { masterSupabase, clearAllClientSessionState, clearActiveTargetSchool } from '@/lib/supabaseClient';
import AppScreen from '@/components/AppScreen';

export default function SuperadminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const stored = localStorage.getItem('sipjam_user');
        if (!stored) {
          router.replace('/');
          return;
        }

        const parsed = JSON.parse(stored);
        const isSa = (parsed?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
        if (!isSa) {
          // Legitimate non-superadmin session (e.g. Guru/Admin) - redirect home without wiping session
          router.replace('/');
          return;
        }

        if (!parsed.session_token || !parsed.id) {
          clearAllClientSessionState();
          router.replace('/');
          return;
        }

        // Validate session token with live database
        const { data: dbUser, error } = await masterSupabase
          .from('users')
          .select('id, username, nama, role, session_token, avatar')
          .eq('id', parsed.id)
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
          console.warn('[SuperadminPage] Network offline, retaining cached session.');
          setUser(parsed);
          return;
        }

        // If a transient database/network error occurred, preserve cached session
        if (error && error.code !== 'PGRST116') {
          console.warn('[SuperadminPage] Transient database error during validation. Retaining cached session:', error.message);
          setUser(parsed);
          return;
        }

        if ((dbUser && dbUser.session_token !== parsed.session_token) || (!dbUser && error?.code === 'PGRST116')) {
          console.warn('[SuperadminPage] Stale or invalid session. Purging cache.');
          clearAllClientSessionState();
          router.replace('/');
          return;
        }

        if (!dbUser) {
          setUser(parsed);
          return;
        }

        const isSaDb = (dbUser?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
        if (!isSaDb) {
          console.warn('[SuperadminPage] User role in DB is not superadmin. Redirecting.');
          const synced = { ...parsed, ...dbUser };
          localStorage.setItem('sipjam_user', JSON.stringify(synced));
          clearActiveTargetSchool();
          router.replace('/');
          return;
        }

        const synced = { ...parsed, ...dbUser };
        localStorage.setItem('sipjam_user', JSON.stringify(synced));
        setUser(synced);
      } catch (err) {
        console.warn('Error checking superadmin session, retaining cached session:', err);
        try {
          const stored = localStorage.getItem('sipjam_user');
          if (stored) setUser(JSON.parse(stored));
        } catch (_) {}
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [router]);

  // Native multi-tab session synchronization & 401 unauthorized listener
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sipjam_user') {
        if (!e.newValue) {
          clearAllClientSessionState();
          setUser(null);
          router.replace('/');
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            const isSa = (parsed?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
            if (!parsed?.id || !parsed?.session_token) {
              clearAllClientSessionState();
              setUser(null);
              router.replace('/');
            } else if (!isSa) {
              // Legitimate non-superadmin session updated in another tab (e.g. Guru/Admin)
              // Clear satellite scope so it doesn't linger, but DO NOT wipe the valid user session!
              clearActiveTargetSchool();
              setUser(null);
              router.replace('/');
            } else {
              setUser(parsed);
            }
          } catch (_) {}
        }
      }
    };

    const handleUnauthorized = () => {
      clearAllClientSessionState();
      setUser(null);
      router.replace('/');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sipjam_unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sipjam_unauthorized', handleUnauthorized);
    };
  }, [router]);

  const handleLogout = () => {
    clearAllClientSessionState();
    setUser(null);
    router.replace('/');
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen min-h-dvh w-full items-center justify-center bg-[#E6ECF2] dark:bg-[#1F242D]">
        <div className="w-48 neu-inset rounded-full h-2.5 p-0.5 overflow-hidden">
          <div className="bg-[#0F766E] dark:bg-teal-400 h-full rounded-full w-full animate-pulse"></div>
        </div>
        <p className="mt-3 text-xs font-bold text-[#0F766E] dark:text-teal-300 tracking-wide">
          Memeriksa Otorisasi Superadmin...
        </p>
      </div>
    );
  }

  const isSaUser = (user?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
  if (!user || !isSaUser) {
    return null;
  }

  return (
    <div className="mobile-container flex flex-col min-h-screen min-h-dvh">
      <AppScreen user={user} onLogout={handleLogout} onUserUpdate={setUser} />
    </div>
  );
}
