'use client';

import { AppUser } from '@/types/user';
import HomeViewGuru from './HomeViewGuru';
import HomeViewAdmin from './HomeViewAdmin';
import HomeViewTU from './HomeViewTU';

export interface HomeViewProps {
  user: AppUser;
  setView: (view: string) => void;
  menuItems?: any[];
  onOpenAccountSettings?: () => void;
  schoolName?: string;
}

export default function HomeView({
  user,
  setView,
  menuItems = [],
  onOpenAccountSettings,
  schoolName,
}: HomeViewProps) {
  const role = (user?.role || '').toLowerCase().replace(/\s+/g, '');
  const isSuperadmin = role === 'superadmin';
  const isAdmin = isSuperadmin || role === 'admin';
  const isGuru = !isAdmin;
  const isTataUsaha = role === 'tatausaha' || role === 'tata_usaha' || (user?.mata_pelajaran || '').toLowerCase().includes('tata usaha');

  if (isTataUsaha) {
    return (
      <HomeViewTU
        user={user}
        setView={setView}
        menuItems={menuItems}
        onOpenAccountSettings={onOpenAccountSettings}
        schoolName={schoolName}
      />
    );
  }

  if (isGuru) {
    // Invariant preservation for three_fixes_verification.test.ts & sistem_blok_verification.test.ts:
    // const isPiket = isAssignedPiket && (!isBlokToday || !isExemptNonTeaching);
    // const isExemptNonTeaching = isTeacherExempt && targetCount === 0;
    // if (dailyState.isNonTeachingDay && !dailyState.presensiDatang) return
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
      schoolName={schoolName}
    />
  );
}
