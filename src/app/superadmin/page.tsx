'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppScreen from '@/components/AppScreen';

export default function SuperadminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sipjam_user');
      if (!stored) {
        router.replace('/');
        return;
      }

      const parsed = JSON.parse(stored);
      if (parsed?.role !== 'Superadmin') {
        // Not a superadmin, kick back to root
        router.replace('/');
        return;
      }

      setUser(parsed);
    } catch (err) {
      console.error('Error checking superadmin session:', err);
      router.replace('/');
    } finally {
      setLoading(false);
    }
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

  if (!user || user.role !== 'Superadmin') {
    return null;
  }

  return (
    <div className="mobile-container flex flex-col min-h-screen min-h-dvh">
      <AppScreen user={user} onLogout={handleLogout} />
    </div>
  );
}
