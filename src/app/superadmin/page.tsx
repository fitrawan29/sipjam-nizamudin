'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
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
        if (!isSa || !parsed.session_token || !parsed.id) {
          localStorage.removeItem('sipjam_user');
          router.replace('/');
          return;
        }

        // Validate session token with live database
        const { data: dbUser, error } = await supabase
          .from('users')
          .select('id, username, nama, role, session_token')
          .eq('id', parsed.id)
          .single();

        const isNetworkError =
          (typeof navigator !== 'undefined' && !navigator.onLine) ||
          (error && (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || (error as any).name === 'AbortError'));

        if (isNetworkError) {
          console.warn('[SuperadminPage] Network offline, retaining cached session.');
          setUser(parsed);
          return;
        }

        const isSaDb = (dbUser?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
        if (error || !dbUser || !isSaDb || dbUser.session_token !== parsed.session_token) {
          console.warn('[SuperadminPage] Stale or invalid session. Purging cache.');
          localStorage.removeItem('sipjam_user');
          router.replace('/');
          return;
        }

        const synced = { ...parsed, ...dbUser };
        localStorage.setItem('sipjam_user', JSON.stringify(synced));
        setUser(synced);
      } catch (err) {
        console.error('Error checking superadmin session:', err);
        localStorage.removeItem('sipjam_user');
        router.replace('/');
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
          setUser(null);
          router.replace('/');
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            const isSa = (parsed?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
            if (!isSa || !parsed.session_token) {
              router.replace('/');
            } else {
              setUser(parsed);
            }
          } catch (_) {}
        }
      }
    };

    const handleUnauthorized = () => {
      localStorage.removeItem('sipjam_user');
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
    localStorage.removeItem('sipjam_user');
    setUser(null);
    router.replace('/');
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen min-h-dvh w-full items-center justify-center bg-gray-100 dark:bg-black">
        <div className="w-48 bg-gray-200 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
          <div className="bg-emerald-600 dark:bg-emerald-400 h-2 rounded-full w-full animate-pulse"></div>
        </div>
        <p className="mt-3 text-xs font-bold text-emerald-800 dark:text-emerald-400 tracking-wide">
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
      <AppScreen user={user} onLogout={handleLogout} />
    </div>
  );
}
