'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import LoginScreen from '@/components/LoginScreen';
import AppScreen from '@/components/AppScreen';
import PreLoginSplash from '@/components/PreLoginSplash';
import NotificationPermissionModal from '@/components/NotificationPermissionModal';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen min-h-dvh w-full items-center justify-center bg-gray-100 dark:bg-black">
        <div className="w-48 bg-gray-200 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
          <div className="bg-nizamudin-green dark:bg-nizamudin-gold h-2 rounded-full w-full animate-pulse"></div>
        </div>
        <p className="mt-3 text-xs font-bold text-nizamudin-green dark:text-nizamudin-gold tracking-wide">
          Memuat...
        </p>
      </div>
    );
  }

  return (
    <div className="mobile-container flex flex-col min-h-screen min-h-dvh relative">
      <MainApp />
    </div>
  );
}

function MainApp() {
  const [user, setUser] = useState<any>(null);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // ponytail: minimal session validator against live database to prevent stale state
  const validateSessionWithDb = async (storedUserObj: any) => {
    try {
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('id, username, nama, role, sekolah_id, session_token')
        .eq('id', storedUserObj.id)
        .single();

      const isNetworkError =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        (error && (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || (error as any).name === 'AbortError'));

      if (isNetworkError) {
        console.warn('[MainApp] Network offline, retaining cached session.');
        setUser(storedUserObj);
        setShowSplash(false);
        return;
      }

      if (error || !dbUser || dbUser.session_token !== storedUserObj.session_token) {
        console.warn('[MainApp] Stale or expired session token detected. Purging cache.');
        localStorage.removeItem('sipjam_user');
        setUser(null);
        setShowSplash(false);
        return;
      }

      // Sync fresh user data from database into state & storage only when modified
      setUser((prevUser: any) => {
        const isChanged = !prevUser ||
          prevUser.nama !== dbUser.nama ||
          prevUser.role !== dbUser.role ||
          prevUser.sekolah_id !== dbUser.sekolah_id ||
          prevUser.username !== dbUser.username ||
          prevUser.session_token !== dbUser.session_token;

        if (isChanged) {
          const synced = { ...storedUserObj, ...dbUser };
          localStorage.setItem('sipjam_user', JSON.stringify(synced));
          return synced;
        }
        return prevUser;
      });
      setShowSplash(false);
    } catch (err) {
      console.warn('[MainApp] Error verifying session with database, falling back to cached session:', err);
      setUser(storedUserObj);
      setShowSplash(false);
    } finally {
      setIsUserLoaded(true);
    }
  };

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('sipjam_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (!parsed || !parsed.session_token || typeof parsed.session_token !== 'string' || !parsed.session_token.trim()) {
          console.warn('[MainApp] Stored user session lacks session_token. Clearing legacy session.');
          localStorage.removeItem('sipjam_user');
          setUser(null);
          setIsUserLoaded(true);
        } else {
          // Re-validate session with database to ensure freshness
          validateSessionWithDb(parsed);
          return;
        }
      } else {
        setIsUserLoaded(true);
      }
    } catch (e) {
      console.error('Failed to parse stored user session:', e);
      localStorage.removeItem('sipjam_user');
      setUser(null);
      setIsUserLoaded(true);
    }
  }, []);

  // Native window focus & visibilitychange listener to auto-refresh session after idle (>15s debounce)
  useEffect(() => {
    let lastValidated = Date.now();

    const handleRevalidateOnFocus = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible' && (now - lastValidated >= 15000)) {
        lastValidated = now;
        const stored = localStorage.getItem('sipjam_user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed?.id && parsed?.session_token) {
              validateSessionWithDb(parsed);
            }
          } catch (_) {}
        }
      }
    };

    window.addEventListener('focus', handleRevalidateOnFocus);
    document.addEventListener('visibilitychange', handleRevalidateOnFocus);
    return () => {
      window.removeEventListener('focus', handleRevalidateOnFocus);
      document.removeEventListener('visibilitychange', handleRevalidateOnFocus);
    };
  }, []);

  // Native multi-tab session synchronization & 401 unauthorized listener
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sipjam_user') {
        if (!e.newValue) {
          setUser(null);
          setShowSplash(false);
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed?.id && parsed?.session_token) {
              setUser(parsed);
            }
          } catch (_) {}
        }
      }
    };

    const handleUnauthorized = () => {
      localStorage.removeItem('sipjam_user');
      setUser(null);
      setShowSplash(false);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sipjam_unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sipjam_unauthorized', handleUnauthorized);
    };
  }, []);

  const handleLoginSuccess = (userData: any) => {
    localStorage.setItem('sipjam_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('sipjam_user');
    setUser(null);
    setShowSplash(false);
  };

  if (!isUserLoaded) {
    return null;
  }

  return (
    <>
      {/* Full blocking notification permission modal overlay on initial app open */}
      <NotificationPermissionModal user={user} />

      {/* Main flow: If authenticated -> AppScreen. If unauthenticated -> Splash then LoginScreen */}
      {user ? (
        <AppScreen user={user} onLogout={handleLogout} />
      ) : showSplash ? (
        <PreLoginSplash onFinish={() => setShowSplash(false)} />
      ) : (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}
