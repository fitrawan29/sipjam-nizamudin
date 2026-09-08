'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import LoginScreen from '@/components/LoginScreen';
import AppScreen from '@/components/AppScreen';

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
      <div className="flex flex-col h-screen w-full items-center justify-center bg-gray-100 dark:bg-black">
        <div className="w-48 bg-gray-200 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
          <div className="bg-nizamudin-green dark:bg-nizamudin-gold h-2 rounded-full w-full animate-pulse"></div>
        </div>
        <p className="mt-3 text-xs font-bold text-nizamudin-green dark:text-nizamudin-gold tracking-wide">
          Memuat...
        </p>
      </div>
    );
  }

  // We are currently simulating login using the users table, not Supabase Auth directly yet
  // If we want to use the users table for custom login:
  return (
    <div className="mobile-container flex flex-col h-screen">
      <MainApp />
    </div>
  );
}

function MainApp() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('sipjam_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLoginSuccess = (userData: any) => {
    localStorage.setItem('sipjam_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('sipjam_user');
    setUser(null);
  };

  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return <AppScreen user={user} onLogout={handleLogout} />;
}
