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

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('sipjam_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        // Authenticated sessions bypass pre-login splash cleanly
        setShowSplash(false);
      }
    } catch (e) {
      console.error('Failed to parse stored user session:', e);
      localStorage.removeItem('sipjam_user');
      setUser(null);
    } finally {
      setIsUserLoaded(true);
    }
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
