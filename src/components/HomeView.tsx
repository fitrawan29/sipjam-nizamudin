'use client';

import { AppUser } from '@/types/user';
import HomeViewGuru from './HomeViewGuru';
import HomeViewAdmin from './HomeViewAdmin';

export interface HomeViewProps {
  user: AppUser;
  setView: (view: string) => void;
  menuItems?: any[];
  onOpenAccountSettings?: () => void;
}

export default function HomeView({
  user,
  setView,
  menuItems = [],
  onOpenAccountSettings,
}: HomeViewProps) {
  const role = (user?.role || '').toLowerCase().replace(/\s+/g, '');
  const isSuperadmin = role === 'superadmin';
  const isAdmin = isSuperadmin || role === 'admin';
  const isGuru = !isAdmin;

  if (isGuru) {
    return (
      <HomeViewGuru
        user={user}
        setView={setView}
        menuItems={menuItems}
        onOpenAccountSettings={onOpenAccountSettings}
      />
    );
  }

  return (
    <HomeViewAdmin
      user={user}
      setView={setView}
      menuItems={menuItems}
      onOpenAccountSettings={onOpenAccountSettings}
    />
  );
}
